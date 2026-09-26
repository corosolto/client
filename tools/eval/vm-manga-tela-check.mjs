#!/usr/bin/env node
/**
 * Régua da MANGA NA TELA (fila P9 da integração K: "braço direito da rem700 cobre 40–60% da
 * tela na recarga/saque"; o crítico L3L5 viu, nenhuma régua mediu).
 *
 * Passa cada produto K pelo `cameraSpacePackage` REAL do runtime (com a manga estendida do
 * `vmsleeve.js`, que é o que cobre a tela), pousa todos os clipes que o jogo toca (e o
 * `equip_rifle` emprestado do General quando o produto não tem o seu), rasteriza com recorte no
 * plano próximo (tools/viewmodels/prep/vm-palco-offline.mjs) e mede a fração do quadro coberta
 * pela manga em cada amostra. Reprova a arma cujo pior quadro passa de MANGA_TELA_MAX.
 *
 * Procedência do teto (3:2, 13 amostras por clipe): fuzis aprovados/ressalva ficam em 1–8%
 * (ak 4%, m4 4%, awp 10% na inspeção); a mosin, pior entre as que o crítico não reprovou pelo
 * braço, 21% na inspeção; a rem700 do catálogo integrado mede 64% (reload_start) e 47% no saque.
 * Teto 30%: folga sobre a mosin, metade da rem700 reprovada.
 * TODO(vm/w3-config): o teto mora aqui até entrar em tools/eval/lib/vm-limiares.mjs (dono da lib).
 *
 * Uso: node tools/eval/vm-manga-tela-check.mjs [--armas=rem700,mosin] [--aspecto=16x9] [--tabela]
 *      node tools/eval/vm-manga-tela-check.mjs --mutante=rem700-integracao   (tem de REPROVAR)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MANGA_TELA_MAX = 0.30;
// Vermelhos conhecidos com dono (não desculpam arma nova). tavor: a recarga gira a arma 70–90° e o
// braço de apoio atravessa a câmera; braco-estavel (IK) derruba o pior quadro de 100% para 12%, mas
// a manga reaparece em outros quadros: re-animação da recarga (fila B1, vm/w3-blender).
const DIVIDA = { tavor: 'fila B1 (re-animação da recarga), vm/w3-blender',
  awp: 'fábrica: extensão do vmsleeve no saque (manga:true); plano B da L96X em vm/fabrica-variantes (#653)' };
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (n, d = '') => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') || d;
const MUTANTES = {
  // O tubo que o crítico viu (lote 2, 24/09): p90 da fábrica com a extensão do vmsleeve ligada e o
  // pacote longe (z −0,383). A fração de manga fica em 9% (verde); a extensão na tela reprova.
  'p90-tubo': { arma: 'p90', fabrica: true, extensao: true, frame: { z: -0.383 } },
  // Produto da integração K (antes do braco-estavel/saque-do-idle): tem de reprovar.
  'rem700-integracao': { arma: 'rem700', glb: path.join(process.env.HOME || '', 'csbrasil-private-assets/generated/viewmodels-integracao-k/overlay/viewmodels/bolt/rem700-baked-runtime.glb') },
};
const mut = arg('mutante');
if (mut && !MUTANTES[mut]) throw new Error(`mutante desconhecido ${mut} (há: ${Object.keys(MUTANTES).join(', ')})`);
if (mut && MUTANTES[mut].extensao) process.argv.push('--com-extensao');
const { VM_FABRICA, VM_WEAPON, arquivoDa, arquivoFabrica, montar, pousar, rasterizar } = await import('../viewmodels/prep/vm-palco-offline.mjs');
const aspecto = arg('aspecto', '3x2');
const PASSOS = 12;
// --fabrica: produtos da fábrica (chave fab#<arma>); --com-extensao liga o vmsleeve neles (A/B).
const FABRICA = process.argv.includes('--fabrica') || Boolean(mut && MUTANTES[mut].fabrica);
// Produto da fábrica traz o braço inteiro: a extensão do vmsleeve não pode aparecer (≤ 0,5% da tela).
export const EXTENSAO_TELA_MAX = 0.005;
const armas = mut ? [MUTANTES[mut].arma] : (arg('armas') ? arg('armas').split(',')
  : FABRICA ? Object.keys(VM_FABRICA)
  : Object.entries(VM_WEAPON).filter(([, c]) => c.baked && !c.golden).map(([id]) => id));

const linhas = [];
for (const arma of armas) {
  const glb = mut && MUTANTES[mut].glb ? MUTANTES[mut].glb : FABRICA ? arquivoFabrica(arma) : arquivoDa(arma);
  if (!fs.existsSync(glb)) { linhas.push({ arma, ok: false, erro: `ausente ${path.relative(ROOT, glb)}` }); continue; }
  const palco = await montar(arma, glb, { fabrica: FABRICA && !(mut && MUTANTES[mut].glb) });
  if (mut && MUTANTES[mut].frame) Object.assign(palco.entry.frame, MUTANTES[mut].frame);
  let pior = { manga: -1 };
  for (const clipe of palco.clipes.keys()) {
    if (clipe === 'ads') continue;
    for (let s = 0; s <= PASSOS; s += 1) {
      pousar(palco, clipe, s / PASSOS, { saque: clipe === 'equip_rifle' });
      const r = await rasterizar(palco, { aspecto });
      if (r.manga > pior.manga) pior = { ...pior, manga: r.manga, clipe, f: s / PASSOS };
      if (r.extensao > (pior.ext?.v ?? -1)) pior.ext = { v: r.extensao, clipe, f: s / PASSOS };
    }
  }
  const extOk = !FABRICA || pior.ext.v <= EXTENSAO_TELA_MAX;
  linhas.push({ arma, ok: pior.manga <= MANGA_TELA_MAX && extOk, pior: { manga: +pior.manga.toFixed(3), clipe: pior.clipe, f: +pior.f.toFixed(2) },
    ext: { v: +pior.ext.v.toFixed(4), clipe: pior.ext.clipe, f: +pior.ext.f.toFixed(2) } });
}
const falhas = linhas.filter((l) => !l.ok && (mut || !DIVIDA[l.arma]));
if (process.argv.includes('--tabela') || mut) {
  for (const l of linhas) console.log(`${l.ok ? 'OK   ' : !mut && DIVIDA[l.arma] ? 'DIVIDA' : 'FALHA'} ${l.arma.padEnd(11)} ${l.erro || `manga ${(100 * l.pior.manga).toFixed(0)}% da tela no pior quadro (${l.pior.clipe} ${Math.round(100 * l.pior.f)}%); teto ${MANGA_TELA_MAX * 100}% · extensão do vmsleeve ${(100 * l.ext.v).toFixed(2)}% (${l.ext.clipe} ${Math.round(100 * l.ext.f)}%)${FABRICA ? `; teto ${EXTENSAO_TELA_MAX * 100}% na fábrica` : ''}`}`);
}
if (mut) {
  const mordeu = falhas.length > 0;
  console.log(JSON.stringify({ regua: 'vm-manga-tela', mutante: mut, mordeu }));
  process.exitCode = mordeu ? 0 : 1;
} else {
  console.log(JSON.stringify({ regua: 'vm-manga-tela', aspecto, ok: !falhas.length, falhas: falhas.map((l) => l.arma),
    divida: linhas.filter((l) => !l.ok && DIVIDA[l.arma]).map((l) => `${l.arma}: ${DIVIDA[l.arma]}`) }));
  process.exitCode = falhas.length ? 1 : 0;
}
