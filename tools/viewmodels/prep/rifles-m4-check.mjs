import { readFile, writeFile, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
if (path.basename(root) !== 'vm-prep-rifles' || execFileSync('git', ['branch','--show-current'], {cwd:root,encoding:'utf8'}).trim() !== 'codex/vm-prep-rifles') throw Error('Wrong lane');
const out = path.join(root, 'artifacts/viewmodels/prep/rifles/m4-candidate');
const stage = path.join(root, 'artifacts/viewmodels/prep/rifles/local-server-8160');
if (!(await realpath(out)).startsWith(root + '/')) throw Error('Output escapes lane');
const vendor = pathToFileURL(path.join(root, 'public/vendor/')).href;
register('data:text/javascript,' + encodeURIComponent(`
  export async function resolve(specifier, context, next) {
    if (specifier === 'three') return {url:${JSON.stringify(vendor)}+'three.module.js',shortCircuit:true};
    if (specifier.startsWith('three/addons/')) return {url:${JSON.stringify(vendor)}+'addons/'+specifier.slice(13),shortCircuit:true};
    return next(specifier, context);
  }
`));
const THREE = await import('three');
const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js');
globalThis.self = globalThis;
const bytes = await readFile(path.join(out, 'm4-baked-runtime.glb'));
const expected = JSON.parse(await readFile(path.join(out, 'blender-projection.json'), 'utf8'));
const loader = new GLTFLoader().register(parser => ({name:'RIFLES_GEOMETRY_ONLY',
  loadMaterial:index => Promise.resolve(new THREE.MeshStandardMaterial({name:parser.json.materials[index].name}))}));
const load = () => loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const measure = async (flag, key) => {
  globalThis.window = {location:{search:flag ? '?vmrifles=m4-c1' : ''}};
  const mod = await import(pathToFileURL(path.join(stage, 'public/js/rifles-cpu.mjs')).href + `?mode=${flag}-${key}`);
  const gltf = await load();
  const parent = new THREE.Scene();
  const visual = mod.cameraSpacePackage(gltf,{faction:'E'},parent,'ar',key);
  const mixer = new THREE.AnimationMixer(visual.scene);
  if (gltf.animations.length !== 1 || gltf.animations[0].name !== 'idle') throw Error('Unexpected clip inventory');
  mixer.clipAction(gltf.animations[0]).play();
  mixer.update(0);
  visual.mount.rotation.set(...(visual.frame.rotDeg || [0,0,0]).map(v=>v*Math.PI/180));
  parent.updateMatrixWorld(true);
  const meshes = {};
  const quantum = 1e-5;
  for (const [name, reference] of Object.entries(expected.meshes)) {
    const mesh = visual.scene.getObjectByName(name);
    if (!mesh?.isMesh) throw Error(`Missing ${name}`);
    const cells = new Map();
    for (const p of reference.camera_points) {
      const k = p.map(v=>Math.floor(v/quantum)).join(',');
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push(p);
    }
    let unmatched = 0, maxDistance = 0, maxUnmatchedDistance = 0;
    const p = new THREE.Vector3();
    for (let i=0; i<mesh.geometry.attributes.position.count; i++) {
      mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld);
      const cell = p.toArray().map(v=>Math.floor(v/quantum));
      let min = Infinity;
      for (const x of [-1,0,1]) for (const y of [-1,0,1]) for (const z of [-1,0,1]) {
        for (const q of cells.get([cell[0]+x,cell[1]+y,cell[2]+z].join(',')) || []) min = Math.min(min, Math.hypot(p.x-q[0],p.y-q[1],p.z-q[2]));
      }
      if (min > quantum) {
        unmatched++;
        if (flag) {
          min = Infinity;
          for (const q of reference.camera_points) min = Math.min(min, Math.hypot(p.x-q[0],p.y-q[1],p.z-q[2]));
          maxUnmatchedDistance = Math.max(maxUnmatchedDistance,min);
        }
      }
      else maxDistance = Math.max(maxDistance,min);
    }
    meshes[name] = {vertices:mesh.geometry.attributes.position.count,unmatched,maxMatchedDistance:maxDistance,maxUnmatchedDistance};
  }
  const camera = new THREE.PerspectiveCamera(visual.cameraFov,4/3,.01,50);
  const sockets = {};
  for (const name of Object.keys(expected.sockets)) {
    const p = visual.scene.getObjectByName(name).getWorldPosition(new THREE.Vector3()).project(camera);
    sockets[name] = [(p.x+1)/2,(1-p.y)/2];
  }
  return {fov:visual.cameraFov,frame:visual.frame,meshes,sockets};
};
const candidate = await measure(true,'ar#m4');
const mutation = await measure(false,'ar#m4');
const golden = await measure(true,'gold#ak');
const matched = Object.values(candidate.meshes).every(m=>m.unmatched===0);
const mutationRejected = Object.values(mutation.meshes).some(m=>m.unmatched>0);
const goldenFramePreserved = golden.frame.x===0 && golden.frame.y===0 && golden.frame.z===0 && golden.fov===candidate.fov;
const http = {};
for (const [url, file] of [
  ['/js/authoredvm.js',path.join(stage,'public/js/authoredvm.js')],
  ['/js/data/vmconfig.js',path.join(stage,'public/js/data/vmconfig.js')],
  ['/js/vmhands.js',path.join(root,'public/js/vmhands.js')],
  ['/private-assets/viewmodels/ar/m4-baked-runtime.glb',path.join(out,'m4-baked-runtime.glb')],
  ['/models/viewmodels/coro/ak-hires.glb',path.join(root,'public/models/viewmodels/coro/ak-hires.glb')],
]) {
  const response = await fetch('http://127.0.0.1:8160'+url);
  const hash = b=>createHash('sha256').update(b).digest('hex');
  http[url] = {status:response.status,hashMatches:hash(Buffer.from(await response.arrayBuffer()))===hash(await readFile(file))};
}
const report = {instrument:'Three.js vendored GLTFLoader and staged cameraSpacePackage, CPU geometry only; textures stubbed; no WebGL or Game action certification',
  candidate,mutation,goldenFramePreserved,matched,mutationRejected,http};
await writeFile(path.join(out,'check.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({matched,mutationRejected,goldenFramePreserved,meshes:candidate.meshes,sockets:candidate.sockets,http},null,2));
if (!matched || !mutationRejected || !goldenFramePreserved || Object.values(http).some(v=>v.status!==200 || !v.hashMatches)) process.exitCode=1;
