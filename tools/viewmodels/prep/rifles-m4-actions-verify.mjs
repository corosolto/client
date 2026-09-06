import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
if (path.basename(root) !== 'vm-prep-rifles' || execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() !== 'codex/vm-prep-rifles') throw Error('Wrong lane');
const candidate = process.argv.includes('--fingers-c1') ? 'm4-actions-fingers-c1' : 'm4-actions-c1';
const out = path.join(root, 'artifacts/viewmodels/prep/rifles', candidate);
const vendor = pathToFileURL(path.join(root, 'public/vendor/')).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s,c,n){if(s==='three')return{url:${JSON.stringify(vendor)}+'three.module.js',shortCircuit:true};if(s.startsWith('three/addons/'))return{url:${JSON.stringify(vendor)}+'addons/'+s.slice(13),shortCircuit:true};return n(s,c)}`));
const THREE = await import('three');
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
globalThis.self = globalThis;
const bytes = await readFile(path.join(out, 'm4-actions-runtime.glb'));
const loader = new GLTFLoader().register(parser => ({ name: 'ACTION_GEOMETRY_REIMPORT', loadMaterial: i => Promise.resolve(new THREE.MeshStandardMaterial({ name: parser.json.materials[i].name })) }));
const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const clips = Object.fromEntries(gltf.animations.map(clip => [clip.name, clip]));
if (!clips.idle || !clips.reload_tactical || Math.abs(clips.reload_tactical.duration - 2.4) > 1e-6) throw Error('Expected idle and 2.4 s reload_tactical');
const nodes = ['MINT_WEAPON_M4', 'MINT_WEAPON_M4_MAG', 'RIG_FP_ARMS', 'hand_l', 'hand_r', 'lowerarm_l', 'upperarm_l'];
const object = name => { const found = gltf.scene.getObjectByName(name); if (!found) throw Error(`Missing ${name}`); return found; };
const mixer = new THREE.AnimationMixer(gltf.scene);
const maxDiff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
function sample(clip, time) {
  mixer.stopAllAction();
  const action = mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  mixer.setTime(time);
  gltf.scene.updateMatrixWorld(true);
  const values = Object.fromEntries(nodes.map(name => [name, object(name).matrixWorld.elements.slice()]));
  const cloth = object('GEO_FP_SK_Cloth_01');
  return { values, weights: [...(cloth.morphTargetInfluences || [])] };
}
function meshPositions() {
  const result = {};
  const v = new THREE.Vector3();
  gltf.scene.traverse(obj => {
    if (!obj.isMesh) return;
    obj.skeleton?.update();
    const coords = [];
    for (let i = 0; i < obj.geometry.attributes.position.count; i++) {
      obj.getVertexPosition(i, v).applyMatrix4(obj.matrixWorld);
      coords.push(v.x, v.y, v.z);
    }
    result[obj.name] = coords;
  });
  return result;
}
const meshDiff = (a, b) => Object.fromEntries(Object.keys(a).map(name => {
  if (a[name].length !== b[name]?.length) throw Error(`Mesh differs: ${name}`);
  let delta = 0;
  for (let i = 0; i < a[name].length; i++) delta = Math.max(delta, Math.abs(a[name][i] - b[name][i]));
  return [name, delta];
}));
const idle = sample(clips.idle, 0);
const idleMeshes = meshPositions();
const reloadStart = sample(clips.reload_tactical, 0);
const reloadMid = sample(clips.reload_tactical, 20 / 30);
const reloadEnd = sample(clips.reload_tactical, clips.reload_tactical.duration);
const endMeshDelta = meshDiff(idleMeshes, meshPositions());
const terminalTrack = clips.reload_tactical.tracks.find(track => track.name === 'index_01_l.quaternion');
if (!terminalTrack) throw Error('No terminal finger track to mutation-test');
const terminalOffset = terminalTrack.values.length - 4;
const terminalSaved = terminalTrack.values.slice(terminalOffset);
terminalTrack.values.set(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), .5).toArray(), terminalOffset);
sample(clips.reload_tactical, clips.reload_tactical.duration);
const mutationDelta = meshDiff(idleMeshes, meshPositions());
terminalTrack.values.set(terminalSaved, terminalOffset);
const mutationRejected = Math.max(...Object.values(mutationDelta)) > 1e-5;
sample(clips.reload_tactical, 0);
const report = {
  instrument: 'vendored GLTFLoader reimport and AnimationMixer; CPU animation state only, no WebGL/Game certification',
  clips: Object.fromEntries(Object.entries(clips).map(([name, clip]) => [name, { duration: clip.duration, tracks: clip.tracks.length, morphWeightTracks: clip.tracks.filter(track => track.name.includes('morphTargetInfluences')).length }])),
  returnToIdleMaxMatrixDelta: Object.fromEntries(nodes.map(name => [name, { start: maxDiff(idle.values[name], reloadStart.values[name]), end: maxDiff(idle.values[name], reloadEnd.values[name]) }])),
  cuffMorphWeights: { idle: idle.weights, reloadFrame20: reloadMid.weights, reloadEnd: reloadEnd.weights },
  endpointMode: 'LoopOnce + clamp; samples the actual final key, not a wrapped frame zero',
  returnToIdleMaxMeshCoordinateDelta: endMeshDelta,
  terminalFingerMutation: { rejected: mutationRejected, maxCoordinateDelta: Math.max(...Object.values(mutationDelta)) }
};
report.glbSha256 = createHash('sha256').update(bytes).digest('hex');
if (candidate === 'm4-actions-fingers-c1') {
  const source = await readFile(path.join(root, 'artifacts/viewmodels/prep/rifles/m4-actions-c1/m4-actions-runtime.glb'));
  const original = await loader.parseAsync(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), '');
  let delta = 0, checked = 0;
  for (const sourceClip of original.animations) {
    const current = clips[sourceClip.name];
    if (!current || current.duration !== sourceClip.duration) throw Error('Clip timing changed');
    for (const originalTrack of sourceClip.tracks) {
      const target = current.tracks.find(track => track.name === originalTrack.name);
      if (!target || target.times.length !== originalTrack.times.length || target.values.length !== originalTrack.values.length) throw Error(`Track structure changed: ${originalTrack.name}`);
      delta = Math.max(delta, maxDiff([...originalTrack.times], [...target.times]));
      if (sourceClip.name === 'reload_tactical' && /^(index|middle|ring|pinky)_0[123]_l\.quaternion$/.test(originalTrack.name)) continue;
      delta = Math.max(delta, maxDiff([...originalTrack.values], [...target.values]));
      checked++;
    }
  }
  report.protectedTracks = { checked, maxValueDelta: delta, pass: delta < 1e-5,
    sourceSha256: createHash('sha256').update(source).digest('hex') };
}
report.pass = Object.values(report.returnToIdleMaxMatrixDelta).every(v => v.start < 1e-5 && v.end < 1e-5) && report.clips.reload_tactical.morphWeightTracks === 1 && Math.max(...reloadMid.weights) > .5 && Math.max(...reloadEnd.weights) < 1e-5 && Math.max(...Object.values(endMeshDelta)) < 1e-5 && mutationRejected;
report.pass &&= report.protectedTracks?.pass ?? true;
await writeFile(path.join(out, 'reimport-check.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
