#!/usr/bin/env node
/** Parent the registered grenade meshes to the authored throw hand without moving them. */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { Matrix4, Quaternion, Vector3 } from 'three';

const privateRoot = '/Users/ruben/csbrasil-private-assets/generated/viewmodels/grenade';
const input = path.resolve(process.argv[2] || path.join(privateRoot, 'grenade.glb'));
const output = path.resolve(process.argv[3] || path.join(privateRoot, 'grenade-runtime.glb'));
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (!path.relative(repoRoot, output).startsWith('..')) {
  throw new Error(`refusing to write licensed grenade GLB inside public repository: ${output}`);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(input);
const root = document.getRoot();
const hand = root.listNodes().find((node) => node.getName() === 'hand_r');
if (!hand) throw new Error('grenade package has no hand_r joint');
// The document graph exposes the rest skeleton, while the grenade registration was
// authored against frame zero of the idle pose. Sample that pose before deriving the
// local socket or the rest-to-pose delta would be applied twice at runtime.
const idle = root.listAnimations().find((clip) => clip.getName() === 'idle');
if (!idle) throw new Error('grenade package has no idle pose');
const overrides = new Map();
for (const channel of idle.listChannels()) {
  const node = channel.getTargetNode();
  const pathName = channel.getTargetPath();
  const values = channel.getSampler()?.getOutput()?.getArray();
  if (!node || !values || !['translation', 'rotation', 'scale'].includes(pathName)) continue;
  const size = pathName === 'rotation' ? 4 : 3;
  const value = Array.from(values.slice(0, size));
  const state = overrides.get(node) || {};
  state[pathName] = value;
  overrides.set(node, state);
}
const chain = [];
for (let node = hand; node; node = node.getParentNode()) chain.unshift(node);
const posedHand = new Matrix4();
for (const node of chain) {
  const state = overrides.get(node) || {};
  posedHand.multiply(new Matrix4().compose(
    new Vector3().fromArray(state.translation || node.getTranslation()),
    new Quaternion().fromArray(state.rotation || node.getRotation()),
    new Vector3().fromArray(state.scale || node.getScale()),
  ));
}
const handInverse = posedHand.clone().invert();
const models = root.listNodes().filter((node) => /^UTILITY_(HE|FLASH|SMOKE)$/.test(node.getName()));
if (models.length !== 3) throw new Error(`expected three utility roots, found ${models.map((node) => node.getName())}`);
for (const model of models) {
  const world = new Matrix4().fromArray(model.getWorldMatrix());
  hand.addChild(model);
  model.setMatrix(handInverse.clone().multiply(world).toArray());
}
await io.write(output, document);
const report = {
  schemaVersion: 1,
  input,
  output,
  bytes: (await fs.stat(output)).size,
  parent: hand.getName(),
  models: models.map((node) => node.getName()).sort(),
  clips: root.listAnimations().map((animation) => animation.getName()).sort(),
};
await fs.writeFile(path.join(path.dirname(output), 'assembly-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`CORO_PAID_GRENADE_BIND=${JSON.stringify(report)}`);
