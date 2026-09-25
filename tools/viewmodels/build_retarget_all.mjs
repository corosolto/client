#!/usr/bin/env node
/* Constrói a TRILHA C (movimento CS 1.6 nos braços do pack pago) para o
   arsenal inteiro. O builder por arma é `build_retarget_vm.py`; aqui mora só a
   escolha das duas fontes, que é o que muda de arma para arma:

     - mecânica  → `goldsrc-vm/<arma>-runtime.glb` (câmera, arma Mint no osso,
       pente que sai de verdade, as 6 sequências do QC);
     - braços    → `<família>/<família>-runtime.glb` do pack pago (RIG_FP_ARMS
       de 67 juntas + as três malhas GEO_FP_SK_*, com o clipe `idle` servindo
       de pose de referência da empunhadura).

   A faca fica fora: ela tem controlador melee próprio e não passa pelo
   caminho autorado.

   Uso: node tools/viewmodels/build_retarget_all.mjs [arma1,arma2,...]
        [--saida=<dir>] [--bracos-de=<família>] */
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { WEAPON_IDS } from '../../public/js/weapons.js';
import { VM_WEAPON } from '../../public/js/data/vmconfig.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender';
const PRIVADO = '/Users/ruben/csbrasil-private-assets/generated/viewmodels';
const GOLDSRC = path.join(PRIVADO, 'goldsrc-vm');
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const SAIDA = arg('saida') || path.join(PRIVADO, 'retarget-vm');

const pedidos = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '')
  .split(',').filter(Boolean);
const armas = pedidos.length ? pedidos : WEAPON_IDS.filter((w) => w !== 'knife');

mkdirSync(SAIDA, { recursive: true });
let falhas = 0;
const relatorio = {};
for (const arma of armas) {
  const familia = arg('bracos-de') || VM_WEAPON[arma]?.family;
  const bracos = path.join(PRIVADO, familia || '', `${familia}-runtime.glb`);
  const mecanica = path.join(GOLDSRC, `${arma}-runtime.glb`);
  if (!familia || !existsSync(bracos)) {
    console.error(`${arma}: sem doador de braços (${bracos})`);
    relatorio[arma] = { ok: false, motivo: 'sem-bracos', bracos };
    falhas += 1; continue;
  }
  if (!existsSync(mecanica)) {
    console.error(`${arma}: sem runtime goldsrc (${mecanica})`);
    relatorio[arma] = { ok: false, motivo: 'sem-goldsrc', mecanica };
    falhas += 1; continue;
  }
  const r = spawnSync(BLENDER, [
    '-b', '--python-exit-code', '1',
    '--python', path.join(ROOT, 'tools/blender/viewmodels/build_retarget_vm.py'), '--',
    `--arma=${arma}`, `--goldsrc=${GOLDSRC}`, `--bracos=${bracos}`, `--saida=${SAIDA}`,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const ok = r.status === 0 && r.stdout.includes('CORO_RT_BUILD=');
  /* As marcas do build (hipótese escolhida, escala, erro de mão por frame) são
     a folha de prova da arma: sem elas, uma mão no ar só aparece no gauntlet e
     não há como saber qual etapa errou sem reassar. */
  const marcas = Object.fromEntries(r.stdout.split('\n')
    .map((l) => /^(CORO_RT_[A-Z_]+)=(.*)$/.exec(l.trim()))
    .filter(Boolean)
    .map((m) => { try { return [m[1], JSON.parse(m[2])]; } catch { return [m[1], m[2]]; } }));
  relatorio[arma] = { familia, ok, ...marcas };
  const erroMao = marcas.CORO_RT_ERRO_MAO || {};
  const pior = Math.max(0, ...Object.values(erroMao).filter((v) => typeof v === 'number'));
  console.log(`${arma} (braços ${familia}): ${ok ? 'ok' : 'FALHOU'}${ok ? ` · pior erro de mão ${pior.toFixed(3)}` : ''}`);
  if (!ok) {
    falhas += 1;
    console.error(r.stdout.split('\n').filter((l) => /Error|Traceback|SystemExit/.test(l)).slice(0, 3).join('\n'));
  }
}
writeFileSync(path.join(SAIDA, 'build-report.json'), JSON.stringify(relatorio, null, 2));
console.log(`\nRETARGET: ${armas.length - falhas}/${armas.length} construídas em ${SAIDA}`);
if (falhas) process.exitCode = 1;
