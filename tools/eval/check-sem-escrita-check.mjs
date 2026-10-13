/* check-sem-escrita-check.mjs — rodar o portão não reescreve a árvore nem mede o servidor alheio?
 *
 * `check:fast` rodava `grafite` (tools/gen-graffiti-layout.mjs), que reassa
 * public/js/graffiti_layout.js e não é determinístico (duas rodadas idênticas deram 2769 e
 * 2767 peças, BUG-158); o frescor desse arquivo já é cobrado pelo eval:grafitelayout.
 * `eval:grafite:ar` regravava tools/eval/graffiti_audit.json a cada rodada. E os arnêses de
 * navegador caíam em localhost:8123 sem BASE, que costuma ser o servidor de outra sessão.
 *
 *   CS1  nenhum passo de check:fast/check:deploy roda gerador tools|scripts/gen-*.mjs sem --check;
 *   CS2  nenhum passo deles cai num BASE padrão em :8123, e o total de arnêses com esse
 *        padrão em tools/ e scripts/ não cresce (TETO);
 *   CS3  sem BASE, gerador, censo, auditoria e gl-metrics saem != 0 dizendo "BASE ausente"
 *        e não mudam nada na árvore (git status antes e depois);
 *   CS4  nenhum script de passo do portão grava arquivo versionado por caminho literal
 *        (tools|public|src|docs) fora de `process.env.JSON === '1'`.
 *
 * Mutações (sai 1 se a mutação PASSAR):
 *   --mutante=gerador      devolve `grafite` ao check:fast
 *   --mutante=base-padrao  devolve o padrão localhost:8123 ao graffiti-census
 *   --mutante=audit-grava  devolve a gravação incondicional do graffiti_audit.json
 *
 *   node tools/eval/check-sem-escrita-check.mjs
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (!['', 'gerador', 'base-padrao', 'audit-grava'].includes(MUTANTE)) { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(1); }
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const TETO = 73;
const PADRAO = /(\|\||\?\?)\s*['"`]https?:\/\/(localhost|127\.0\.0\.1):8123/;
const SEM_BASE = ['tools/gen-graffiti-layout.mjs', 'tools/eval/graffiti-census.mjs', 'tools/eval/graffiti-audit.mjs', 'tools/eval/gl-metrics.mjs'];

const scripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts;
if (MUTANTE === 'gerador') {
  const s = scripts['check:fast'];
  scripts['check:fast'] = s.replace(' docs:check ', ' docs:check grafite ');
  if (scripts['check:fast'] === s) { console.error('MUTANTE NAO APLICOU: gerador'); process.exit(1); }
}
const lerFonte = (rel) => {
  const s = readFileSync(join(ROOT, rel), 'utf8');
  if (MUTANTE === 'audit-grava' && rel === 'tools/eval/graffiti-audit.mjs') {
    const m = s.replace("if (process.env.JSON === '1') writeFileSync('tools/eval/graffiti_audit.json'", "writeFileSync('tools/eval/graffiti_audit.json'");
    if (m === s) { console.error('MUTANTE NAO APLICOU: audit-grava'); process.exit(1); }
    return m;
  }
  if (MUTANTE !== 'base-padrao' || rel !== 'tools/eval/graffiti-census.mjs') return s;
  const m = s.replace('const BASE = process.env.BASE;', `const BASE = process.env.BASE || 'http://localhost:${8123}';`);
  if (m === s) { console.error('MUTANTE NAO APLICOU: base-padrao'); process.exit(1); }
  return m;
};

const passos = new Set();
for (const portao of ['check:fast', 'check:deploy']) {
  const cmd = scripts[portao];
  if (!cmd || !cmd.includes('runner.mjs')) { console.error(`${portao} não usa tools/eval/runner.mjs; não sei ler os passos`); process.exit(1); }
  for (const p of cmd.split(/\s+/).slice(cmd.split(/\s+/).indexOf('tools/eval/runner.mjs') + 1)) passos.add(p);
}
const geradores = [], comPadrao = [], gravadores = [];
const JSON_1 = /process\.env\.JSON === '1'/;
for (const p of passos) {
  const cmd = scripts[p];
  if (cmd === undefined) { geradores.push(`${p} (script inexistente)`); continue; }
  if (/(^|\s)node\s+(tools|scripts)\/(\S*\/)?gen-[\w-]+\.mjs/.test(cmd) && !/--check\b/.test(cmd)) geradores.push(`${p}: ${cmd}`);
  for (const [, arq] of cmd.matchAll(/node\s+(\S+\.mjs)/g)) {
    let fonte;
    try { fonte = lerFonte(arq); } catch { continue; }
    if (PADRAO.test(fonte)) comPadrao.push(`${p} (${arq})`);
    const linhas = fonte.split('\n');
    linhas.forEach((l, i) => {
      if (!/writeFileSync\(\s*['"`](tools|public|src|docs)\//.test(l)) return;
      const anterior = linhas.slice(0, i).reverse().find((x) => x.trim()) || '';
      if (!JSON_1.test(l) && !(JSON_1.test(anterior) && /\{\s*$/.test(anterior))) gravadores.push(`${arq}:${i + 1}`);
    });
  }
}

const varrer = (dir, out = []) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== 'node_modules') varrer(p, out); } else if (/\.(mjs|js)$/.test(n)) out.push(relative(ROOT, p));
  }
  return out;
};
const comPadraoTotal = [...varrer(join(ROOT, 'tools')), ...varrer(join(ROOT, 'scripts'))].filter((f) => PADRAO.test(lerFonte(f)));

const estado = () => execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
const antes = estado();
const rodadas = SEM_BASE.map((f) => {
  const env = { ...process.env }; delete env.BASE;
  const r = spawnSync(process.execPath, [f], { cwd: ROOT, env, encoding: 'utf8', timeout: 60000 });
  return { f, ok: r.status !== 0 && /BASE ausente/.test(r.stderr || ''), status: r.status };
});
const mudou = estado() !== antes;

const res = [
  ['CS1', 'nenhum passo do portão roda gerador sem --check', geradores.length === 0,
    geradores.length ? `${geradores.join('; ')} — gerador reescreve a árvore a cada check; use o modo --check ou tire do portão` : `${passos.size} passos lidos`],
  ['CS2', 'nenhum passo do portão cai em localhost:8123, e o padrão não cresce', comPadrao.length === 0 && comPadraoTotal.length <= TETO,
    `${comPadrao.length ? `no portão: ${comPadrao.join(', ')} — exija BASE explícito; ` : ''}${comPadraoTotal.length} arnêses com padrão :8123 (teto ${TETO})`
      + (comPadraoTotal.length < TETO ? ` — baixe TETO para ${comPadraoTotal.length}` : '')],
  ['CS3', 'sem BASE os arnêses de grafite e gl-metrics param com "BASE ausente" sem escrever', rodadas.every((r) => r.ok) && !mudou,
    rodadas.map((r) => `${r.f.split('/').pop()}=${r.status}${r.ok ? '' : ' (sem a mensagem)'}`).join(', ') + (mudou ? ' — a árvore mudou' : '')],
  ['CS4', 'nenhum passo do portão grava arquivo versionado sem JSON=1', gravadores.length === 0,
    gravadores.length ? `${gravadores.join(', ')} — guarde a gravação com process.env.JSON === '1', como o graffiti-census` : 'só com JSON=1'],
];
const falhou = res.some(([, , ok]) => !ok);
for (const [id, desc, ok, evid] of res) console.log(`${ok ? '✓' : '✗'} ${id}  ${desc} — ${evid}`);
if (MUTANTE) {
  console.log(falhou ? `✓ mutante ${MUTANTE} ficou vermelho` : `✗ mutante ${MUTANTE} PASSOU — régua cega`);
  process.exit(falhou ? 0 : 1);
}
process.exit(falhou ? 1 : 0);
