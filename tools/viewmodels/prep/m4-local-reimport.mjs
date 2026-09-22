import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
assert.equal(path.basename(root), 'vm-m4-reload-evidence');
assert.equal(execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(), 'codex/vm-m4-reload-evidence');
const vendor = pathToFileURL(path.join(root, 'public/vendor/')).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){if(s==='three')return{url:${JSON.stringify(vendor)}+'three.module.js',shortCircuit:true};if(s.startsWith('three/addons/'))return{url:${JSON.stringify(vendor)}+'addons/'+s.slice(13),shortCircuit:true};return n(s,c)}`));
const THREE = await import('three');
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
globalThis.self = globalThis;
const out = path.join(root, 'artifacts/viewmodels/m4-elbow-mag-weights');
const source = path.join(root, '../vm-prep-rifles/artifacts/viewmodels/prep/rifles/m4-actions-fingers-c1/m4-actions-runtime.glb');
const loader = new GLTFLoader().register(parser => ({ name: 'LOCAL_GEOMETRY_ONLY', loadMaterial: i => Promise.resolve(new THREE.MeshStandardMaterial({ name: parser.json.materials[i].name })) }));
async function load(file) {
  const bytes = await readFile(file);
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  return { gltf, mixer: new THREE.AnimationMixer(gltf.scene), clips: Object.fromEntries(gltf.animations.map(c => [c.name, c])), hash: createHash('sha256').update(bytes).digest('hex') };
}
const a = await load(source), b = await load(path.join(out, 'm4-actions-runtime.glb'));
const diff = (x, y) => { assert.equal(x.length, y.length); let d = 0; for (let i = 0; i < x.length; i++) d = Math.max(d, Math.abs(x[i] - y[i])); return d; };
function sample(asset, clip, time) {
  asset.mixer.stopAllAction();
  const action = asset.mixer.clipAction(asset.clips[clip]).reset().setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  asset.mixer.setTime(time);
  asset.gltf.scene.updateMatrixWorld(true);
}
function positions(asset) {
  const result = {}, v = new THREE.Vector3();
  asset.gltf.scene.traverse(obj => {
    if (!obj.isMesh) return;
    obj.skeleton?.update();
    const values = [];
    for (let i = 0; i < obj.geometry.attributes.position.count; i++) {
      obj.getVertexPosition(i, v).applyMatrix4(obj.matrixWorld);
      values.push(...v.toArray());
    }
    result[obj.name] = values;
  });
  return result;
}
const report = { instrument: 'Vendored GLTFLoader/AnimationMixer CPU, LoopOnce final key. No Game/WebGL certification.',
  sourceSha256: a.hash, candidateSha256: b.hash, frames: [], protectedTracks: 0, protectedTrackDelta: 0, geometry: {} };
for (const [name, clip] of Object.entries(a.clips)) {
  assert.equal(b.clips[name].duration, clip.duration);
  for (const track of clip.tracks) {
    const other = b.clips[name].tracks.find(t => t.name === track.name);
    assert.ok(other, track.name);
    assert.equal(diff(track.times, other.times), 0, track.name);
    const allowed = name === 'reload_tactical' && /^(upperarm_l|lowerarm_l|hand_l|lowerarm_twist_01_l|MINT_WEAPON_M4_MAG)\.(position|quaternion)$/.test(track.name);
    if (!allowed) {
      const delta = diff(track.values, other.values);
      assert.ok(delta < 1e-5, `${track.name}: ${delta}`);
      report.protectedTrackDelta = Math.max(report.protectedTrackDelta, delta);
      report.protectedTracks++;
    }
  }
}
a.gltf.scene.traverse(obj => {
  if (!obj.isMesh) return;
  const other = b.gltf.scene.getObjectByName(obj.name);
  assert.ok(other?.isMesh, obj.name);
  const attrs = {};
  for (const [name, attribute] of Object.entries(obj.geometry.attributes)) {
    const delta = diff(attribute.array, other.geometry.attributes[name].array);
    attrs[name] = delta;
    if (!(obj.name === 'GEO_FP_SK_Hand' && ['skinWeight', 'skinIndex'].includes(name))) assert.ok(delta < 1e-5, `${obj.name}/${name}: ${delta}`);
  }
  assert.equal(diff(obj.geometry.index.array, other.geometry.index.array), 0);
  report.geometry[obj.name] = attrs;
});
sample(b, 'idle', 0);
const idle = positions(b);
sample(b, 'reload_tactical', b.clips.reload_tactical.duration);
const end = positions(b);
report.endpointDelta = Object.fromEntries(Object.keys(idle).map(k => [k, diff(idle[k], end[k])]));
assert.ok(Math.max(...Object.values(report.endpointDelta)) < 1e-5);
const magMatrix = asset => asset.gltf.scene.getObjectByName('MINT_WEAPON_M4_MAG').matrixWorld.elements;
for (let frame = 0; frame <= 72; frame++) {
  sample(a, 'reload_tactical', Math.min(frame / 30, a.clips.reload_tactical.duration));
  sample(b, 'reload_tactical', Math.min(frame / 30, b.clips.reload_tactical.duration));
  const row = { frame, magazineMatrixDelta: diff(magMatrix(a), magMatrix(b)) };
  if (frame <= 18 || frame >= 42) assert.ok(row.magazineMatrixDelta < 1e-5, `magazine timing changed: ${frame}`);
  const ma = a.gltf.scene.getObjectByName('hand_r').matrixWorld.elements;
  const mb = b.gltf.scene.getObjectByName('hand_r').matrixWorld.elements;
  row.strongHandMatrixDelta = diff(ma, mb);
  assert.ok(row.strongHandMatrixDelta < 1e-5);
  report.frames.push(row);
}
const track = b.clips.reload_tactical.tracks.find(t => t.name === 'hand_l.quaternion');
const offset = track.values.length - 4, saved = track.values.slice(offset);
track.values.set(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), .5).toArray(), offset);
sample(b, 'reload_tactical', b.clips.reload_tactical.duration);
report.endpointMutationDelta = Math.max(...Object.entries(positions(b)).map(([k, v]) => diff(idle[k], v)));
track.values.set(saved, offset);
assert.ok(report.endpointMutationDelta > 1e-5);
await writeFile(path.join(out, 'reimport.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ protectedTracks: report.protectedTracks, protectedTrackDelta: report.protectedTrackDelta,
  endpointMax: Math.max(...Object.values(report.endpointDelta)), mutation: report.endpointMutationDelta, frames: report.frames.length, hash: b.hash }));
