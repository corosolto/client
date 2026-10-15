// Node-only example authoring. Existing triangle fixture, not a garment or human fit.
import {syntheticGLB} from '../example.mjs';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
export async function dependencies() {
  const vendor = new URL('../../../public/vendor/', import.meta.url);
  const hook = registerHooks({resolve(specifier, context, next) {
    if (specifier === 'three' && context.parentURL?.startsWith(vendor.href))
      return {url: new URL('three.module.js', vendor).href, shortCircuit: true};
    return next(specifier, context);
  }});
  try {
    const THREE = await import(new URL('three.module.js', vendor));
    const {GLTFLoader} = await import(new URL('addons/loaders/GLTFLoader.js', vendor));
    const {clone} = await import(new URL('addons/utils/SkeletonUtils.js', vendor));
    return {THREE, clone, parseGLB: bytes => new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')};
  } finally { hook.deregister(); }
}
export function exampleBytes(garment = false) {
  const bytes = syntheticGLB(), size = bytes.readUInt32LE(12), doc = JSON.parse(bytes.subarray(20, 20 + size));
  doc.nodes[7].name = garment ? 'SyntheticGarment' : 'SyntheticBody';
  doc.materials = [{name: 'SyntheticUntextured', pbrMetallicRoughness: {baseColorFactor: garment ? [0.2, 0.6, 0.8, 1] : [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1}}];
  doc.meshes[0].primitives[0].material = 0;
  const json = Buffer.from(JSON.stringify(doc)), padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
  const bin = bytes.subarray(20 + size), header = Buffer.from(bytes.subarray(0, 20));
  header.writeUInt32LE(20 + padded.length + bin.length, 8); header.writeUInt32LE(padded.length, 12);
  return Buffer.concat([header, padded, bin]);
}
export function recipeFiles() {
  return ['public/vendor/three.module.js', 'public/vendor/addons/loaders/GLTFLoader.js',
    'public/vendor/addons/utils/SkeletonUtils.js', 'public/vendor/addons/utils/BufferGeometryUtils.js',
    'tools/character-kit/bind-inspector.mjs', 'tools/character-kit/example.mjs', 'tools/character-kit/kit.mjs', ...['core.mjs', 'portable-assert.mjs', 'browser-example.mjs', 'node.mjs', 'synthetic-profile.mjs', 'build-example-record.mjs'].map(n => 'tools/character-kit/garment/' + n)]
    .map(name => [name, readFileSync(new URL('../../../' + name, import.meta.url))]);
}
