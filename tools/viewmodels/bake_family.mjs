#!/usr/bin/env node
/* Orquestra o "assar offline" do BUG-75: Blender monta a arma Mint DENTRO do
   GLB da família (com pente separado e sockets), o assembler assa os reloads e
   um passe final remove a malha genérica do pack e enxuga texturas. O runtime
   só toca clipes — zero matemática de encaixe ao vivo.
   Uso: node tools/viewmodels/bake_family.mjs --arma=ak [--render-only] */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { weaponCFG } from '../../public/js/weapons.js';
import { VM_WEAPON } from '../../public/js/data/vmconfig.js';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const PRIVATE_ROOT = '/Users/ruben/csbrasil-private-assets/generated/viewmodels';
const BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender';

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || '').split('=')[1] || '';
const flag = (name) => process.argv.includes(`--${name}`);
const arma = arg('arma') || 'ak';
const config = VM_WEAPON[arma];
if (!config) throw new Error(`arma sem família paga: ${arma}`);
const familia = config.family;
const cfg = weaponCFG(arma);

const argumentos = [
  `--familia=${familia}`,
  `--arma=${arma}`,
  `--mint=${path.join(REPO_ROOT, `public/models/weapons/${arma}.glb`)}`,
  `--len=${cfg.len}`,
  `--gripz=${cfg.gripZ ?? 0.6}`,
  `--residuo=${(config.trim?.pos || [0, 0, 0]).join(',')}`,
];
if (config.parts?.mag?.box) {
  // forma --chave=valor: números negativos no início confundem o argparse
  argumentos.push(`--magbox=${[...config.parts.mag.box.min, ...config.parts.mag.box.max].join(',')}`);
}
if (flag('render-only')) argumentos.push('--render-only');
// Gabarito CS 1.6 (--template=<dir com .smd + QC>): referência de posicionamento
// apagada antes do export; --bst aponta o checkout do Blender Source Tools.
const templateDir = arg('template');
if (templateDir) {
  const bst = arg('bst');
  if (!bst) throw new Error('--template exige --bst=<BlenderSourceTools>');
  const { readdirSync } = await import('node:fs');
  const arquivos = readdirSync(templateDir);
  // malha SÓ da arma: f_*_template.smd (padrão dos fontes) ou ref_*.smd (deagle)
  const templateSmd = arquivos.find((f) => /^f_.*_template\.smd$/i.test(f))
    || arquivos.find((f) => /^ref_.*\.smd$/i.test(f) && !/hand/i.test(f));
  if (!templateSmd) throw new Error(`nenhum f_*_template.smd/ref_*.smd em ${templateDir}`);
  const poseSmd = arquivos.find((f) => /^idle1?\.smd$/i.test(f));
  if (!poseSmd) throw new Error(`nenhum idle*.smd em ${templateDir}`);
  argumentos.push(
    `--template=${path.join(templateDir, templateSmd)}`,
    `--template-pose=${path.join(templateDir, poseSmd)}`,
    `--template-origin=${arg('template-origin') || '0,0,0'}`,
    `--template-scale=${arg('template-scale') || '1'}`,
    `--bst=${bst}`,
  );
}

const blender = spawnSync(BLENDER, [
  '-b', '--python-exit-code', '1',
  '--python', path.join(REPO_ROOT, 'tools/blender/viewmodels/build_baked_family.py'),
  '--', ...argumentos,
], { encoding: 'utf8' });
process.stdout.write(`${blender.stdout.split('\n').filter((line) => /CORO_|Error|Traceback|  File|render/.test(line)).join('\n')}\n`);
if (blender.status !== 0) {
  console.error(blender.stdout.slice(-1500));
  console.error(blender.stderr.slice(-800));
  process.exit(1);
}
if (flag('render-only')) process.exit(0);

// Assa os clipes (o assembler exige o skin de arma do pack — ainda presente aqui).
const baked = path.join(PRIVATE_ROOT, familia, `${arma}-baked.glb`);
const runtime = path.join(PRIVATE_ROOT, familia, `${arma}-baked-runtime.glb`);
const assemble = spawnSync('node', [
  path.join(REPO_ROOT, 'tools/viewmodels/assemble_paid_family.mjs'),
  '--family', familia, '--input', baked, '--output', runtime,
], { encoding: 'utf8' });
process.stdout.write(assemble.stdout.split('\n').filter((line) => line.includes('CORO_')).join('\n'));
if (assemble.status !== 0) { console.error(assemble.stderr.slice(-2000)); process.exit(1); }

// Passe final: some a malha genérica do pack, texturas de braço viram placeholder
// (o shared/ religa no load) e o arquivo assume o posto de runtime da família.
const strip = spawnSync('node', [path.join(SCRIPT_DIR, 'strip_baked_family.mjs'), runtime], { encoding: 'utf8' });
process.stdout.write(strip.stdout);
if (strip.status !== 0) { console.error(strip.stderr.slice(-2000)); process.exit(1); }

// O arquivo é POR ARMA (a malha Mint está dentro) — não sobrescreve o runtime
// da família: o jogo serve `<arma>-baked-runtime.glb` quando a arma for baked.
const bytes = (await fs.stat(runtime)).size;
console.log(`CORO_BAKED_FAMILY=${JSON.stringify({ arma, familia, runtime, bytes })}`);
