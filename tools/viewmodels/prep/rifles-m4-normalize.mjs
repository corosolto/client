#!/usr/bin/env node
// O exporter Blender usa o primeiro key do NLA como transform-base do Empty.
// O idle não possui track nesse Empty, portanto normalizamos somente o default
// do root comum. Os tracks absolutos continuam contendo draw -> identity.
import path from 'node:path';
import { NodeIO } from '../../../node_modules/@gltf-transform/core/dist/index.js';
import { ALL_EXTENSIONS } from '../../../node_modules/@gltf-transform/extensions/dist/index.js';

const input = path.resolve(process.argv[2] || '');
const output = path.resolve(process.argv[3] || '');
const repo = new URL('../../..', import.meta.url).pathname;
for (const candidate of [input, output]) {
  if (!candidate || !path.relative(repo, candidate).startsWith('..')) throw new Error('input/output devem ficar fora do Git');
}
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(input);
const rootName = process.argv[4] || 'VM_PACKAGE_M4';
const root = document.getRoot().listNodes().find((node) => node.getName() === rootName);
if (!root) throw new Error(`${rootName} ausente`);
root.setTranslation([0, 0, 0]);
root.setRotation([0, 0, 0, 1]);
root.setScale([1, 1, 1]);
await io.write(output, document);
console.log(`M4_NORMALIZED ${output}`);
