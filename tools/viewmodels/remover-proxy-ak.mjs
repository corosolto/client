#!/usr/bin/env node
/* ============================================================================
   remover-proxy-ak.mjs — TIRA DO PILOTO A ALAVANCA DA AK QUE VEIO NO RIG DOADOR.
   ----------------------------------------------------------------------------
   Todo piloto hires nasce do rig da AK e herda a malha
   `coro_solto_project_ak_charging_handle`. Na AK ela é a alavanca real; nas
   outras armas é um cilindro preto solto ao lado do receptor — o "objeto no meio
   do ar" que o dono e o crítico cego apontaram (md97, sks; svd já corrigida).

   Só a malha sai. O nó, os canais de animação e todos os accessors ficam
   intactos; o relatório prova por hash de cada array antes/depois.

   USO
     node tools/viewmodels/remover-proxy-ak.mjs --de=<piloto.glb> --para=<dir>
   Saída: <dir>/ak-hires-pilot.glb + <dir>/report.json (formato de publicar-hires).
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const PROXY = 'coro_solto_project_ak_charging_handle';
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? '';
const input = arg('de'), dir = arg('para');
if (!input || !dir) throw new Error('uso: --de=<piloto.glb> --para=<dir de saída>');
if (path.resolve(input).startsWith(path.resolve('public/'))) throw new Error('não escreva a partir do destino servido; copie o piloto para artifacts/ antes');
const output = path.join(dir, 'ak-hires-pilot.glb');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const hash = (a) => crypto.createHash('sha256').update(new Uint8Array(a.buffer, a.byteOffset, a.byteLength)).digest('hex');
const arrays = (d) => d.getRoot().listAccessors().map((a) => hash(a.getArray()));
const before = arrays(doc);
const node = doc.getRoot().listNodes().find((n) => n.getName() === PROXY);
if (!node?.getMesh()) throw new Error(`${input}: ${PROXY} já não tem malha (ou não é piloto do rig AK)`);
const triangles = node.getMesh().listPrimitives().reduce((s, p) => s + (p.getIndices()?.getCount() || p.getAttribute('POSITION').getCount()) / 3, 0);
node.setMesh(null); node.setSkin(null);
fs.mkdirSync(dir, { recursive: true });
await io.write(output, doc);
const check = await io.read(output);
const report = {
  input, output, removedDrawable: PROXY, triangles,
  allAccessorArraysPreserved: JSON.stringify(before) === JSON.stringify(arrays(check)),
  removedNodeNoMesh: !check.getRoot().listNodes().find((n) => n.getName() === PROXY)?.getMesh(),
  sha256: crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),
};
fs.writeFileSync(path.join(dir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
if (!report.allAccessorArraysPreserved || !report.removedNodeNoMesh) { process.exitCode = 1; throw new Error('preservação falhou'); }
