#!/usr/bin/env node
/** Fecha o contato da mão de apoio da G3SG1 KINEMATION no produto glTF. */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SOURCE_SHA = '5c9d17696318fbf890ea475fdaef191939b28e721f4ba168817e728e97a60b5a';
// Vetor residual do gate de triângulos, convertido pela matriz do pai de
// hand_l. Unidades são as do rig KINEMATION (centímetros sob root 0,01).
const HAND_L_DELTA = [3.1519, -3.5452, 5.1018];
const option = (name) => (process.argv.find((arg) => arg.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const source = path.resolve(option('source') || '.');
const outputDir = path.resolve(option('output-dir') || '.');
if (!option('source') || !option('output-dir')) {
  throw new Error('uso: --source=<g3sg1 KINEMATION glb> --output-dir=<fora-do-git>');
}
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await fs.readFile(source);
if (digest(sourceBytes) !== SOURCE_SHA) throw new Error('fonte G3SG1 KINEMATION ausente ou divergente');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(source);
const root = document.getRoot();
const hand = root.listNodes().find((node) => node.getName() === 'hand_l');
if (!hand) throw new Error('osso hand_l ausente');
let tracks = 0;
const clips = [];
for (const clip of root.listAnimations()) {
  let touched = false;
  for (const channel of clip.listChannels()) {
    if (channel.getTargetNode() !== hand || channel.getTargetPath() !== 'translation') continue;
    const accessor = channel.getSampler().getOutput();
    const array = accessor.getArray().slice();
    for (let offset = 0; offset < array.length; offset += 3) {
      array[offset] += HAND_L_DELTA[0];
      array[offset + 1] += HAND_L_DELTA[1];
      array[offset + 2] += HAND_L_DELTA[2];
    }
    accessor.setArray(array);
    tracks += 1;
    touched = true;
  }
  if (touched) clips.push(clip.getName());
}
if (tracks !== 3 || clips.join(',') !== 'idle,reload_tactical,reload_empty') {
  throw new Error(`contrato hand_l divergente: ${tracks} tracks em ${clips.join(',')}`);
}

await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, 'g3sg1-baked-runtime.glb');
await io.write(output, document);
const bytes = await fs.readFile(output);
const report = {
  schemaVersion: 1, weapon: 'g3sg1', ready: false,
  source: { bytes: sourceBytes.length, sha256: SOURCE_SHA },
  handL: { delta: HAND_L_DELTA, clips, tracks },
  product: { file: output, bytes: bytes.length, sha256: digest(bytes) },
};
await fs.writeFile(path.join(outputDir, 'contact-build.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`G3SG1_CONTACT_OK ${JSON.stringify(report)}`);
