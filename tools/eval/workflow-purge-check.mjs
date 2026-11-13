#!/usr/bin/env node
/* ============================================================================
   workflow-purge-check.mjs — PURGE DA CLOUDFLARE NÃO PODE DERRUBAR O PROD-WATCH
   ----------------------------------------------------------------------------
   O CASO (07/11/2026): a zona migrou para corosolto.com.br e o CF_API_TOKEN não a
   cobria. O lookup `zones?name=` voltou `result: []`, o `JSON.parse(s).result[0].id`
   estourou TypeError, o passo de purge falhou e TODA rodada agendada do prod-watch
   pulou o probe de coerência e disparou `prod-crash` — incidente falso a cada 15 min
   por um escopo de token que só o dono conserta.

   O QUE ELA MEDE (node + bash, sem rede: `curl` falso no PATH):
   WP1 · todo passo do prod-watch que fala com api.cloudflare.com declara
         `continue-on-error: true` (cinto: nenhum erro do purge chega ao failure()).
   WP2 · o script do passo, rodado de verdade, sai 0 e emite `::warning` quando o
         lookup volta sem zona, sem JSON ou com curl caído — e nem tenta purgar.
   WP3 · purge com `success:false` sai 0 com `::warning` citando o erro da API;
         purge com sucesso sai 0, sem aviso, na zona achada.

   Mutantes: parse-cru (volta o `result[0].id` sem guarda), sem-continue (apaga o
   continue-on-error) e purge-mudo (apaga a checagem do success do purge).

   Uso: node tools/eval/workflow-purge-check.mjs [--mutante=parse-cru|sem-continue|purge-mudo]
   ============================================================================ */
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = { 'parse-cru': 'WP2', 'sem-continue': 'WP1', 'purge-mudo': 'WP3' };
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ARQUIVO = '.github/workflows/prod-watch.yml';
let fonte = readFileSync(join(ROOT, ARQUIVO), 'utf8');
const original = fonte;
/* parse-cru devolve a forma de 07/11: atribuição solta com `result[0].id`, sem `if`. */
if (MUT === 'parse-cru') {
  fonte = fonte.replace(/ {10}if ! ZONE_ID=[^\n]*\n(?: {12}[^\n]*\n)* {10}fi\n/,
    `          ZONE_ID=$(printf '%s' "$ZONE_JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).result[0].id))")\n`);
}
if (MUT === 'sem-continue') fonte = fonte.replace(/(- name: purge do edge Cloudflare[^\n]*\n(?: {8}[^\n]*\n)*?) {8}continue-on-error: true\n/, '$1');
if (MUT === 'purge-mudo') fonte = fonte.replace(/ {10}if ! MOTIVO=[^\n]*\n[^\n]*\n {10}fi\n/, '');
if (MUT && fonte === original) { console.error(`MUTAÇÃO NÃO APLICADA: ${MUT}`); process.exit(4); }

/* Passos por indentação (`      - ` com 6 espaços, chaves com 8, bloco run com 10),
   o formato de todos os workflows daqui — mesma leitura da wftimeout. */
function passos(texto) {
  const lista = [];
  let atual = null, emRun = false;
  for (const linha of texto.split('\n')) {
    const novo = /^ {6}- (?:name:\s*(.*))?/.exec(linha);
    if (novo) { atual = { nome: novo[1] || '', chaves: [], run: [] }; lista.push(atual); emRun = false; continue; }
    if (!atual) continue;
    if (/^ {8}run: \|\s*$/.test(linha)) { emRun = true; continue; }
    if (emRun && (linha.startsWith('          ') || linha.trim() === '')) { atual.run.push(linha.slice(10)); continue; }
    emRun = false;
    const chave = /^ {8}([a-z-]+):\s*(.*)$/.exec(linha);
    if (chave) atual.chaves.push([chave[1], chave[2]]);
    if (/^\S/.test(linha) || /^ {2}\S/.test(linha)) atual = null;
  }
  return lista;
}

const falhas = [];
const cloudflare = passos(fonte).filter((p) => p.run.join('\n').includes('api.cloudflare.com'));
if (!cloudflare.length) falhas.push(`WP0 ${ARQUIVO}: nenhum passo fala com api.cloudflare.com — o parser perdeu o purge`);
for (const p of cloudflare) {
  const coe = p.chaves.find(([k]) => k === 'continue-on-error');
  if (!coe || coe[1].trim() !== 'true') falhas.push(`WP1 passo \`${p.nome}\` fala com a Cloudflare sem continue-on-error: true — erro do purge vira failure() e dispara prod-crash`);
}

/* Roda o script do passo com um curl falso: respostas por URL vêm do ambiente. */
const purge = cloudflare.find((p) => p.nome.startsWith('purge do edge Cloudflare'));
const tmp = mkdtempSync(join(tmpdir(), 'wfpurge-'));
try {
  if (purge) {
    const script = join(tmp, 'passo.sh');
    writeFileSync(script, purge.run.join('\n'));
    const bin = join(tmp, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'curl'), `#!/usr/bin/env bash
for a in "$@"; do last="$a"; done
echo "$last" >> "$CHAMADAS"
case "$last" in
  *purge_cache) [ -n "$FAKE_PURGE_EXIT" ] && exit "$FAKE_PURGE_EXIT"; printf '%s' "$FAKE_PURGE";;
  *zones\\?name=*) [ -n "$FAKE_ZONE_EXIT" ] && exit "$FAKE_ZONE_EXIT"; printf '%s' "$FAKE_ZONE";;
  *) exit 22;;
esac
`);
    chmodSync(join(bin, 'curl'), 0o755);
    const ZONA_OK = JSON.stringify({ success: true, errors: [], result: [{ id: 'zona-fake-123' }] });
    const roda = (rotulo, env) => {
      const chamadas = join(tmp, `chamadas-${rotulo}`);
      writeFileSync(chamadas, '');
      /* GitHub roda `run:` com `bash -e -o pipefail`; o mesmo aqui. */
      const r = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', script], {
        encoding: 'utf8',
        env: { PATH: `${bin}:${dirname(process.execPath)}:/usr/bin:/bin`, CF_API_TOKEN: 'token-fake', CF_ZONE_NAME: '', CHAMADAS: chamadas, ...env },
      });
      return { ...r, chamadas: readFileSync(chamadas, 'utf8').trim().split('\n').filter(Boolean) };
    };
    for (const [rotulo, env] of [
      ['zona-vazia', { FAKE_ZONE: JSON.stringify({ success: true, errors: [], result: [] }) }],
      ['zona-sem-json', { FAKE_ZONE: '<html>bad gateway</html>' }],
      ['curl-caido', { FAKE_ZONE_EXIT: '6' }],
      ['token-invalido', { FAKE_ZONE: JSON.stringify({ success: false, errors: [{ code: 9109, message: 'Invalid access token' }], result: null }) }],
    ]) {
      const r = roda(rotulo, env);
      if (r.status !== 0) falhas.push(`WP2 ${rotulo}: o passo saiu ${r.status} — ${(r.stderr || '').split('\n').find((l) => /Error/.test(l)) || 'sem stderr'}`);
      else if (!/::warning[^\n]*CF_ZONE_NAME/.test(r.stdout)) falhas.push(`WP2 ${rotulo}: saiu 0 sem ::warning apontando CF_ZONE_NAME/escopo do token`);
      if (r.chamadas.some((u) => u.endsWith('/purge_cache'))) falhas.push(`WP2 ${rotulo}: tentou purgar sem zona (${r.chamadas.join(', ')})`);
    }
    const ruim = roda('purge-negado', { FAKE_ZONE: ZONA_OK, FAKE_PURGE: JSON.stringify({ success: false, errors: [{ code: 10000, message: 'Authentication error' }] }) });
    if (ruim.status !== 0) falhas.push(`WP3 purge-negado: o passo saiu ${ruim.status}`);
    else if (!/::warning[^\n]*10000 Authentication error/.test(ruim.stdout)) falhas.push('WP3 purge-negado: success:false passou calado, sem ::warning com o erro da API');
    const caido = roda('purge-caido', { FAKE_ZONE: ZONA_OK, FAKE_PURGE_EXIT: '7' });
    if (caido.status !== 0) falhas.push(`WP3 purge-caido: o passo saiu ${caido.status}`);
    else if (!/::warning/.test(caido.stdout)) falhas.push('WP3 purge-caido: curl caído no purge passou calado');
    const bom = roda('purge-ok', { FAKE_ZONE: ZONA_OK, FAKE_PURGE: JSON.stringify({ success: true, errors: [], result: { id: 'x' } }) });
    if (bom.status !== 0 || /::warning/.test(bom.stdout)) falhas.push(`WP3 purge-ok: status ${bom.status}, aviso ${/::warning/.test(bom.stdout)} — caminho feliz tem de ser mudo`);
    if (!bom.chamadas.some((u) => u.endsWith('/zones/zona-fake-123/purge_cache'))) falhas.push(`WP3 purge-ok: não purgou a zona achada (${bom.chamadas.join(', ')})`);
  } else {
    falhas.push(`WP0 ${ARQUIVO}: passo "purge do edge Cloudflare" não encontrado`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (MUT) {
  const alvo = MUTANTES[MUT];
  if (falhas.some((f) => f.startsWith(alvo))) {
    console.log(`mutante ${MUT} reprovado como devia: ${falhas.find((f) => f.startsWith(alvo))}`);
    process.exit(0);
  }
  console.error(`MUTAÇÃO PASSOU — ${MUT} não acendeu ${alvo} (${falhas.map((f) => f.slice(0, 3)).join(',') || 'nenhuma falha'})`);
  process.exit(1);
}
for (const f of falhas) console.error(`  \x1b[31m✗\x1b[0m ${f}`);
if (falhas.length) {
  console.error(`\x1b[31mWORKFLOW-PURGE ${falhas.length} VERMELHA(S)\x1b[0m`);
  process.exit(1);
}
console.log(`\x1b[32mWORKFLOW-PURGE verde: ${cloudflare.length} passo(s) Cloudflare best-effort; 7 cenários de curl falso saem 0 com aviso certo\x1b[0m`);
