#!/usr/bin/env node
// Atlas de mãos por time (vmhands.js) de cada rig, pintados a partir do próprio GLB (UV, pesos e
// ossos). Não sobrescreve atlas existente sem --forcar: os de K e L foram aprovados pelo dono.
//   node tools/viewmodels/build-team-hand-textures.mjs [--layouts=ak,knife] [--times=M,neutral] [--forcar] [--conferir]
// --conferir repinta em memória e compara com o WebP servido (média |Δ| por canal, só na área da malha).
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { TEAM_HANDS, teamHandStyle } from '../../public/js/vmhands.js';
import { HAND_RIGS, lerRig, campos, pintar, root } from './lib/hand-rigs.mjs';

const args = new Map(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
for (const k of args.keys()) if (!['layouts', 'times', 'forcar', 'conferir'].includes(k)) throw Error(`flag desconhecida: ${k}`);
const layouts = (args.get('layouts') || Object.keys(HAND_RIGS).join(',')).split(',');
const styles = [...Object.values(TEAM_HANDS), teamHandStyle('neutral')]
  .filter((s) => !args.has('times') || args.get('times').split(',').includes(s.id));
const output = path.join(root, 'public/models/viewmodels/coro/hands');
const existe = (f) => fs.access(f).then(() => true, () => false);
const report = [];
for (const layout of layouts) {
  if (!HAND_RIGS[layout]) throw Error(`layout desconhecido: ${layout}`);
  const rig = await lerRig(layout);
  const papeis = new Map();
  for (const prim of rig.primitivas) {
    const atual = papeis.get(prim.papel);
    if (!atual) { papeis.set(prim.papel, { ...prim, vertices: [...prim.vertices], faces: [...prim.faces] }); continue; }
    const off = atual.vertices.length;
    atual.vertices.push(...prim.vertices);
    atual.faces.push(...prim.faces.map((f) => f.map((i) => i + off)));
  }
  await fs.mkdir(path.join(output, layout), { recursive: true });
  for (const [papel, prim] of papeis) {
    const campo = campos(layout, prim);
    for (const style of styles) {
      const file = path.join(output, layout, `${papel}-${style.id}.webp`);
      const heightFile = file.replace('.webp', '-height.webp');
      const { pixels, heights } = pintar(campo, prim.pintura, style);
      const rel = path.relative(root, file);
      if (args.has('conferir')) {
        if (!(await existe(file))) { report.push({ layout, papel, time: style.id, file: rel, ausente: true }); continue; }
        const ref = await sharp(file).removeAlpha().raw().toBuffer();
        let soma = 0, n = 0;
        for (let i = 0; i < campo.covered.length; i++) if (campo.covered[i]) {
          for (let c = 0; c < 3; c++) soma += Math.abs(pixels[i * 3 + c] - ref[i * 3 + c]);
          n += 3;
        }
        report.push({ layout, papel, time: style.id, file: rel, deltaMedio: +(soma / n).toFixed(2) });
        continue;
      }
      if (!args.has('forcar') && await existe(file)) { report.push({ layout, papel, time: style.id, file: rel, mantido: true }); continue; }
      await sharp(pixels, { raw: { width: campo.size, height: campo.size, channels: 3 } }).webp({ quality: 92 }).toFile(file);
      await sharp(heights, { raw: { width: campo.size, height: campo.size, channels: 1 } }).webp({ quality: 95 }).toFile(heightFile);
      report.push({ layout, papel, time: style.id, file: rel, bytes: (await fs.stat(file)).size, fonte: path.relative(root, rig.fonte) });
    }
  }
}
console.log(JSON.stringify(report, null, 1));
