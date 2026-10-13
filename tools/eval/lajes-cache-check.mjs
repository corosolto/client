import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { bootGame, initTextures } from './harness.mjs';
import { StaticBatch } from '../../public/js/mapprops.js';

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const originalAdd = StaticBatch.prototype.add;
const textures = initTextures();
let recorder;

StaticBatch.prototype.add = function (geometry, matrix, material, options) {
  const background = this.name.startsWith('lajes-entorno-');
  if (background && !recorder.sources.has(geometry)) {
    const current = recorder;
    current.sources.add(geometry);
    geometry.addEventListener('dispose', () => current.disposed.set(geometry, (current.disposed.get(geometry) || 0) + 1));
  }
  const added = originalAdd.call(this, geometry, matrix, material, options);
  if (!background || !added) return added;

  recorder.boxes++;
  const key = `${material.uuid}|${options?.cast === false ? 0 : 1}|${options?.receive === false ? 0 : 1}|${options?.order || 0}`;
  const normalized = this.groups.get(key).list.at(-1);
  for (const name of ['position', 'normal', 'uv', 'uv1', 'color']) {
    const array = normalized.attributes[name].array;
    recorder.geometry.update(name);
    recorder.geometry.update(Buffer.from(array.buffer, array.byteOffset, array.byteLength));
  }
  const index = normalized.index.array;
  recorder.geometry.update(Buffer.from(index.buffer, index.byteOffset, index.byteLength));
  return added;
};

function build() {
  recorder = { boxes: 0, sources: new Set(), disposed: new Map(), geometry: createHash('sha256') };
  const game = bootGame('lajes', { textures, ctf: true, bots: 4, seed: 12345 });
  const world = game.world;
  const result = {
    boxes: recorder.boxes,
    uniqueGeometry: recorder.sources.size,
    disposedExactlyOnce: [...recorder.sources].every(geometry => recorder.disposed.get(geometry) === 1),
    geometryDigest: recorder.geometry.digest('hex'),
    nextRandom: Array.from({ length: 4 }, () => Math.random()),
    colliders: [world.colliders.length, sha(world.colliders)],
    navigation: [world.waypoints.nodes.length, sha(world.waypoints)],
    occluders: [world.occluders.length, sha(world.occluders.map(mesh => [
      mesh.name, mesh.geometry?.attributes.position?.count, mesh.geometry?.index?.count,
      mesh.matrixWorld.elements,
    ]))],
    sourceRefs: recorder.sources,
  };
  return result;
}

const first = build();
const second = build();
const overlap = [...first.sourceRefs].filter(geometry => second.sourceRefs.has(geometry)).length;
for (const value of [first, second]) delete value.sourceRefs;
console.log(JSON.stringify({ first, second, overlap }));

// Os valores de paridade vêm da base 261cf59a, fixada antes da otimização.
const expectedNextRandom = [
  [0.9769068229943514, 0.16404898068867624, 0.5039992486126721, 0.014668577583506703],
  [0.33314384054392576, 0.287667001131922, 0.7576107266359031, 0.7355576294939965],
];
for (const [index, value] of [first, second].entries()) {
  assert.equal(value.boxes, 9162);
  assert.equal(value.uniqueGeometry, 49, 'reuso deve conservar as 49 geometrias distintas da base');
  assert.ok(value.disposedExactlyOnce, 'templates não descartados exatamente uma vez');
  assert.equal(value.geometryDigest, '45f8ee3f8b5bd113672d444d5a002598b1a2487c51fb6a7ec8cf58c9ef368e93');
  assert.deepEqual(value.nextRandom, expectedNextRandom[index]);
  assert.deepEqual(value.colliders, [513, '78c463af54a7d007dc142d5dbcb7ed24bde4e827a37ee8dac4a58d7ccc76bf99']);
  assert.deepEqual(value.navigation, [612, 'e5583b928cacfa70f36d680ac83d2cd574f1e6ea9bd5cbf2a214e6c77a5877f8']);
  assert.deepEqual(value.occluders, [339, 'ffc69a72e0a8da8f92fa5e598d17d56b05af4ab5a39331df500cb044d08dc4c8']);
}
assert.equal(overlap, 0, 'template vazou entre construções');
