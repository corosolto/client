import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {exampleBytes, dependencies, recipeFiles} from './synthetic-profile.mjs';
import {inspectBindBytes} from '../bind-inspector.mjs';
import {prepareLoadedGarment} from './core.mjs';
const sha = b => createHash('sha256').update(b).digest('hex');
export async function buildRecord() {
  const baseBytes = exampleBytes(), garmentBytes = exampleBytes(true), {THREE, parseGLB} = await dependencies();
  const inspect = b => inspectBindBytes(b, sha(b));
  const base = inspect(baseBytes), garment = inspect(garmentBytes);
  const family = {version: 'known-family/1', family: 'synthetic-triangle', fit: 'synthetic-identical-triangle-draft', bodyMeshName: 'SyntheticBody',
    sourceAssetSha256: base.sourceAssetSha256, bindFingerprintSha256: base.bindFingerprintSha256, geometryFingerprintSha256: base.geometryFingerprintSha256, weightsFingerprintSha256: base.weightsFingerprintSha256};
  const loaded = await parseGLB(baseBytes), source = await parseGLB(garmentBytes);
  const body = loaded.scene.getObjectByName('SyntheticBody'), mesh = source.scene.getObjectByName('SyntheticGarment');
  loaded.scene.updateMatrixWorld(true); source.scene.updateMatrixWorld(true);
  const contract = {version: 'garment-rebind-draft/1', family: family.family, fit: family.fit,
    sourceAssetSha256: family.sourceAssetSha256, sourceBindFingerprintSha256: family.bindFingerprintSha256,
    assetSha256: garment.sourceAssetSha256, standaloneBindFingerprintSha256: garment.bindFingerprintSha256,
    meshName: 'SyntheticGarment', meshLocalMatrix: mesh.matrix.toArray(),
    joints: body.skeleton.bones.map((b, index) => ({index, name: b.name, sourceNode: loaded.parser.associations.get(b).nodes, standaloneNode: source.parser.associations.get(mesh.skeleton.bones[index]).nodes})),
    fitApproved: false, artApproved: false, maskApproved: false, runtimeEnabled: false, hideTriangleIDs: []};
  prepareLoadedGarment({THREE, base: loaded, source, family, contract});
  return {version: 'trusted-garment-inspection/1', family, contract,
    base: {sha256: sha(baseBytes), bytes: baseBytes.length, inspection: base}, garment: {sha256: sha(garmentBytes), bytes: garmentBytes.length, inspection: garment},
    recipe: Object.fromEntries(recipeFiles().map(([name, bytes]) => [name, sha(bytes)])), provenance: 'Synthetic test triangles from example.mjs; not a human, wearable fit or licensed donor asset'};
}
export async function main(args) {
  assert.ok(args.length === 1 && (args[0] === '--check' || args[0] === '--write' || args[0] === '--assets'), 'usage: build-example-record.mjs --check|--write|--assets');
  const record = await buildRecord(), output = `export const TRUSTED_RECORD_JSON = ${JSON.stringify(JSON.stringify(record))};\n`, target = new URL('example-record.mjs', import.meta.url);
  if (args[0] === '--check') assert.equal(fs.readFileSync(target, 'utf8'), output, 'stale example record');
  else if (args[0] === '--write') fs.writeFileSync(target, output, {flag: 'wx'});
  else {
    assert.equal(fs.readFileSync(target, 'utf8'), output, 'stale example record');
    const directory = new URL('example-assets/', import.meta.url); fs.mkdirSync(directory); // exclusive, no overwrite/retry
    fs.writeFileSync(new URL('body.glb', directory), exampleBytes(), {flag: 'wx'});
    fs.writeFileSync(new URL('garment.glb', directory), exampleBytes(true), {flag: 'wx'});
  }
}
const isMain = () => {
  if (!process.argv[1]) return false;
  try {return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));}
  catch {return false;}
};
if (isMain()) main(process.argv.slice(2)).catch(e => {console.error(e.message); process.exitCode = 1;});
