#!/usr/bin/env node
/* Régua do rollback F/U. Prova, antes de qualquer aplicação:
 *   --fontes            integridade das fontes (zip v8, pack v7, vozes Míticas intactas nos dois)
 *   --staging <dir>     comparativo A/B completo: todo arquivo confere hash e não há extras
 *   --alvo <json>       manifest-alvo pós-escolha: pools intactos, vozes Míticas preservadas,
 *                       ausência de fallback indevido (pagodeiro/funkraiz sem bordão quando
 *                       a variante exige, nenhuma voz sintética de personagem em U no v7)
 *   --mutante <nome>    aplica o mutante em cópia temporária e EXIGE que a régua reprova:
 *                       hash-trocado | extra-solta | voz-mitica-sumida | pagodeiro-sem-bordao
 * Exit 0 = verde; 1 = régua mordeu (esperado só sob --mutante); 2 = uso incorreto. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const value = (name) => (process.argv.find((arg) => arg.startsWith(`--${name}=`)) || '')
  .split('=').slice(1).join('=');
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const v7Root = resolve(value('v7') || join(repoRoot, '../../worktrees/escadao-visual/public/audio'));
const v8Zip = resolve(value('v8') || '/tmp/csbrasil-audio-restore.QZXwty/v8.zip');
const V8_ZIP_SHA256 = '009e0125820764a231ddf921b4ad865170aec39262ebf18d6cdcaf38394aebf8';
/* Vozes fora do escopo F/U que nenhum rollback pode apagar (presentes no v8; M = Míticos). */
const PROTEGIDAS = Object.freeze({
  bandeirante: 'a0f0312c72f92f3e', boto: 'ec3c3a91ba1d16cb', cuca: 'c26bd73502a54282',
  curupira: '57b20ab4d5f68d63', dollynho: 'dc26854fa366d0ec', farialimer: 'fc5bf11f5b8287f5',
  gotinha: 'cc77ec4f134a71ba', lampiao: 'defdd794046b0e2e', mariabonita: '9bd160c434e14771',
  saci: '17bd0fd44df5dc58', zumbi: '0d0ee4e4d52db61b',
});
const v8ManifestBytes = () => execFileSync('unzip', ['-p', v8Zip, 'manifest.json'], { maxBuffer: 64 * 1024 * 1024 });
const falhas = [];
const check = (cond, msg) => { if (!cond) falhas.push(msg); return cond; };

function checarFontes() {
  check(existsSync(v8Zip), `zip v8 ausente: ${v8Zip}`);
  if (falhas.length) return;
  const got = sha256(readFileSync(v8Zip));
  check(got === V8_ZIP_SHA256, `sha256 do zip v8 diverge (${got})`);
  const v7 = JSON.parse(readFileSync(join(v7Root, 'manifest.json'), 'utf8'));
  check(v7.voice?.F?.length === 45, `v7 voice.F esperado 45, obtido ${v7.voice?.F?.length}`);
  check(v7.voice?.U?.length === 11, `v7 voice.U esperado 11, obtido ${v7.voice?.U?.length}`);
  const v8 = JSON.parse(v8ManifestBytes());
  check(v8.voice?.F?.length === 69, `v8 voice.F esperado 69, obtido ${v8.voice?.F?.length}`);
  check(v8.voice?.U?.length === 15, `v8 voice.U esperado 15, obtido ${v8.voice?.U?.length}`);
  for (const [personagem, hash] of Object.entries(PROTEGIDAS)) {
    check(v8.characterVoice?.[personagem]?.includes(hash),
      `voz protegida ${personagem} sumiu do characterVoice do v8`);
  }
  /* os 45/11 refs do v7 precisam continuar presentes no v8 (pools não regrediram) */
  const v8pool = new Set([...(v8.voice?.F || []), ...(v8.voice?.U || [])]);
  const sumiu = [...(v7.voice?.F || []), ...(v7.voice?.U || [])].filter((r) => !v8pool.has(r));
  check(sumiu.length === 0, `refs do pool v7 ausentes no v8: ${sumiu.join(', ')}`);
}

function checarStaging(dir) {
  const mpath = join(dir, 'fu-ab.manifest.json');
  if (!check(existsSync(mpath), `manifest do staging ausente: ${mpath}`)) return;
  const manifest = JSON.parse(readFileSync(mpath, 'utf8'));
  const declarados = new Set(manifest.itens.map((i) => i.arquivo));
  const emDisco = new Set(readdirSyncDeep(dir));
  for (const arq of declarados) {
    if (!check(emDisco.has(arq), `declarado sem arquivo: ${arq}`)) continue;
    const got = sha256(readFileSync(join(dir, arq)));
    const item = manifest.itens.find((i) => i.arquivo === arq);
    check(got === item.sha256, `${arq}: sha256 diverge (${got} ≠ ${item.sha256})`);
  }
  for (const arq of emDisco) {
    check(declarados.has(arq) || arq === 'PLAY-ORDER.md' || arq === 'fu-ab.manifest.json',
      `arquivo extra não declarado: ${arq}`);
  }
  const pares = manifest.itens.filter((i) => i.camada === 'par');
  for (const par of pares) {
    const tem = manifest.itens.filter((i) => i.personagem === par.personagem).map((i) => i.variante).sort();
    check(tem.join(',') === 'v7,v8', `${par.personagem}: par A/B incompleto (${tem})`);
  }
}

function checarAlvo(jsonPath) {
  const alvo = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const cv = alvo.characterVoice || {};
  const variante = alvo.__variante;
  for (const [personagem, hash] of Object.entries(PROTEGIDAS)) {
    check(cv[personagem]?.includes(hash), `alvo: voz protegida ${personagem} apagada`);
  }
  check((alvo.voice?.F?.length || 69) >= 45 && (alvo.voice?.U?.length || 15) >= 11, 'alvo: pools F/U regrediram');
  const sinteticoU = Object.entries(cv).filter(([p]) => ['pagodeiro'].includes(p));
  if (variante === 'v7') {
    check(cv.funkraiz?.includes('d5b87c3d2638e166'), 'v7: funkraiz sem o bordão antigo (fallback indevido)');
    check(sinteticoU.length === 0, 'v7: bordão sintético em U não deveria existir');
    for (const p of ['mandrake', 'oakley', 'trapfunk']) check(!cv[p], `v7: ${p} deveria cair no pool`);
  } else if (variante === 'v8') {
    check(cv.pagodeiro?.includes('b902671ec7cb5cbf'), 'v8: pagodeiro sem bordão (fallback indevido)');
    check(cv.funkraiz?.includes('d92c5f1644b8a249'), 'v8: funkraiz sem bordão Fish');
    for (const p of ['mandrake', 'oakley', 'trapfunk']) check(!!cv[p], `v8: ${p} sem bordão`);
  } else {
    check(false, 'alvo precisa de __variante v7|v8');
  }
}

function readdirSyncDeep(dir, prefixo = '') {
  const out = [];
  for (const nome of readdirSync(join(dir, prefixo) || dir)) {
    const rel = prefixo ? `${prefixo}/${nome}` : nome;
    if (statSync(join(dir, rel)).isDirectory()) out.push(...readdirSyncDeep(dir, rel));
    else out.push(rel);
  }
  return out;
}

const modo = process.argv.find((a) => a.startsWith('--')) || '';
const mutante = value('mutante');
try {
  if (mutante) {
    const tmp = mkdtempSync(join(tmpdir(), 'fu-rollback-mutante-'));
    try {
      if (mutante === 'hash-trocado' || mutante === 'extra-solta') {
        const staging = resolve(value('staging') || '');
        cpSync(staging, tmp, { recursive: true });
        if (mutante === 'hash-trocado') {
          const m = JSON.parse(readFileSync(join(staging, 'fu-ab.manifest.json'), 'utf8'));
          const buf = readFileSync(join(staging, m.itens[0].arquivo));
          buf[0] ^= 0xff;
          writeFileSync(join(tmp, m.itens[0].arquivo), buf);
        } else {
          writeFileSync(join(tmp, 'solto.mp3'), 'x');
        }
        checarStaging(tmp);
      } else if (mutante === 'voz-mitica-sumida' || mutante === 'pagodeiro-sem-bordao') {
        const v8 = JSON.parse(v8ManifestBytes());
        delete v8.characterVoice[mutante === 'voz-mitica-sumida' ? 'saci' : 'pagodeiro'];
        writeFileSync(join(tmp, 'alvo.json'), JSON.stringify({ ...v8, __variante: 'v8' }));
        checarAlvo(join(tmp, 'alvo.json'));
      } else {
        console.error(`mutante desconhecido: ${mutante}`); process.exit(2);
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
    if (falhas.length > 0) {
      console.log(`ok: mutante '${mutante}' morto pela régua — ${falhas[0]}`); process.exit(0);
    }
    console.error(`falhou: mutante '${mutante}' NÃO foi detectado (régua fraca)`); process.exit(1);
  }
  if (modo.startsWith('--fontes')) checarFontes();
  else if (modo.startsWith('--staging')) checarStaging(resolve(value('staging')));
  else if (modo.startsWith('--alvo')) checarAlvo(resolve(value('alvo')));
  else { console.error('uso: --fontes | --staging=<dir> | --alvo=<json> | --mutante=<nome> [--staging=<dir>]'); process.exit(2); }
} catch (e) { console.error(`falhou: ${e.message}`); process.exit(1); }

if (falhas.length) { console.error(`✗ ${falhas.length} problema(s):\n  - ${falhas.join('\n  - ')}`); process.exit(1); }
console.log('ok: régua verde');
