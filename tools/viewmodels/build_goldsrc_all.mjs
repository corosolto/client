#!/usr/bin/env node
/* Constrói os viewmodels da trilha B (molde GoldSrc CC0 + arma Mint) para o
   arsenal inteiro, passando ao Blender a NORMALIZAÇÃO MEDIDA de cada arma
   (weaponCFG.rot → cano canônico +Z; gripZ) — o palpite "cano em +X" invertia
   o M4 e rolava a Deagle (crítico 30/08).
   Uso: node tools/viewmodels/build_goldsrc_all.mjs [arma1,arma2,...] */
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { weaponCFG } from '../../public/js/weapons.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender';
const SAIDA = '/Users/ruben/csbrasil-private-assets/generated/viewmodels/goldsrc-vm';

// arma do jogo -> molde CS (doador mecânico)
export const DOADORES = {
  ak: 'ak47', m4: 'm4a1', carbine: 'm4a1', mp5: 'mp5',
  uzi: 'mac10', p90: 'p90', famas: 'famas', md97: 'famas',
  scar: 'sg552', svd: 'g3sg1',
  sks: 'g3sg1', awp: 'awp', mosin: 'scout',
  deagle: 'deagle', revolver38: 'deagle', pistol: 'usp', m92: 'ak47',
  shotgun: 'm3', lmg: 'm249', knife: 'knife',
};

// overrides visuais por arma (calibrados contra a referência — folhas par5)
const AJUSTES = {
  pistol: { escala: 0.55 },   // molde USP traz silenciador no comprimento
  mosin: { escala: 0.72 },
  scar: { escala: 0.72 },
};

const pedidos = (process.argv[2] || '').split(',').filter(Boolean);
const armas = pedidos.length ? pedidos : Object.keys(DOADORES);
let falhas = 0;
for (const arma of armas) {
  const cs = DOADORES[arma];
  if (!cs) { console.error(`${arma}: sem doador`); falhas += 1; continue; }
  const cfg = weaponCFG(arma);
  const rot = (cfg.rot || [0, 0, 0]).join(',');
  const r = spawnSync(BLENDER, [
    '-b', '--python-exit-code', '1',
    '--python', path.join(ROOT, 'tools/blender/viewmodels/build_goldsrc_vm.py'), '--',
    `--cs=${cs}`, `--arma=${arma}`,
    `--mint=${path.join(ROOT, `public/models/weapons/${arma}.glb`)}`,
    `--len=${cfg.len || 1}`, `--gripz=${cfg.gripZ ?? 0.6}`, `--rot=${rot}`,
    `--escala-extra=${AJUSTES[arma]?.escala ?? 1}`,
    `--saida=${SAIDA}`,
  ], { encoding: 'utf8' });
  const ok = r.status === 0 && r.stdout.includes('CORO_GS_BUILD=');
  console.log(`${arma} (${cs}, rot ${rot}): ${ok ? 'ok' : 'FALHOU'}`);
  if (!ok) {
    falhas += 1;
    console.error(r.stdout.split('\n').filter((l) => /Error|Traceback/.test(l)).slice(0, 3).join('\n'));
  }
}
if (falhas) process.exit(1);
