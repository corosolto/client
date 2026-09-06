import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
if (path.basename(root) !== 'vm-prep-rifles' || execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() !== 'codex/vm-prep-rifles') throw Error('Wrong lane');
const out = path.join(root, 'artifacts/viewmodels/prep/rifles/m4-actions-c1');
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
  mixer.clipAction(clip).reset().play();
  mixer.setTime(time);
  gltf.scene.updateMatrixWorld(true);
  const values = Object.fromEntries(nodes.map(name => [name, object(name).matrixWorld.elements.slice()]));
  const cloth = object('GEO_FP_SK_Cloth_01');
  return { values, weights: [...(cloth.morphTargetInfluences || [])] };
}
const idle = sample(clips.idle, 0);
const reloadStart = sample(clips.reload_tactical, 0);
const reloadMid = sample(clips.reload_tactical, 20 / 30);
const reloadEnd = sample(clips.reload_tactical, clips.reload_tactical.duration);
const report = {
  instrument: 'vendored GLTFLoader reimport and AnimationMixer; CPU animation state only, no WebGL/Game certification',
  clips: Object.fromEntries(Object.entries(clips).map(([name, clip]) => [name, { duration: clip.duration, tracks: clip.tracks.length, morphWeightTracks: clip.tracks.filter(track => track.name.includes('morphTargetInfluences')).length }])),
  returnToIdleMaxMatrixDelta: Object.fromEntries(nodes.map(name => [name, { start: maxDiff(idle.values[name], reloadStart.values[name]), end: maxDiff(idle.values[name], reloadEnd.values[name]) }])),
  cuffMorphWeights: { idle: idle.weights, reloadFrame20: reloadMid.weights, reloadEnd: reloadEnd.weights }
};
report.pass = Object.values(report.returnToIdleMaxMatrixDelta).every(v => v.start < 1e-5 && v.end < 1e-5) && report.clips.reload_tactical.morphWeightTracks === 1 && Math.max(...reloadMid.weights) > .5 && Math.max(...reloadEnd.weights) < 1e-5;
await writeFile(path.join(out, 'reimport-check.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
