// Actual factory resource ownership; CPU texture decoding is stubbed, not art approval.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const root = process.cwd();
const option = name => process.argv.find(x => x.startsWith(name + '='))?.slice(name.length + 1);
const output = option('--out');
if (output) assert(!fs.existsSync(output), 'preserve existing output');
const loadedInputs = {};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function read(file) {
  const bytes = fs.readFileSync(file);
  loadedInputs[path.relative(root, file)] = hash(bytes);
  return bytes;
}
function assetPath(url) {
  const file = path.resolve(root, 'public', String(url).split('?')[0].replace(/^\//, ''));
  assert(file.startsWith(path.join(root, 'public') + path.sep), 'asset outside public');
  return file;
}
let fitFixture = null;
const localFetch = async url => {
  if (fitFixture && String(url).endsWith('/models/items/eyewear-manifest.json')) return Response.json(fitFixture.manifest);
  if (fitFixture && String(url).endsWith('/models/items/face-landmarks.json')) return Response.json(fitFixture.landmarks);
  const file = assetPath(url);
  return fs.existsSync(file) ? new Response(read(file)) : new Response('', {status: 404});
};
Object.defineProperty(globalThis, 'fetch', {configurable: true, get: () => localFetch, set() {}});
const {THREE, Game: ActualGame, CHARACTERS} = await import(pathToFileURL(path.join(root, 'tools/eval/harness.mjs')));
const {GLTFLoader} = await import(pathToFileURL(path.join(root, 'public/vendor/addons/loaders/GLTFLoader.js')));
Object.defineProperty(globalThis, 'fetch', {configurable: true, writable: true, value: localFetch});
GLTFLoader.prototype.load = function(url, done, progress, fail) {
  if (fitFixture && url === '/models/items/ownership-fixture.glb') { queueMicrotask(() => done({scene:fitFixture.accessory})); return; }
  const loader = new GLTFLoader();
  loader.register(() => ({name: 'EXT_texture_webp', async loadTexture() {
    const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    texture.needsUpdate = true;
    return texture;
  }}));
  Promise.resolve().then(async () => {
    const bytes = read(assetPath(url));
    done(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''));
  }).catch(error => fail?.(error));
};
const mutant = option('--mutante') || null;
const mutations = {
  'sem-skeleton': ['glbchars.js', 'if (owned) model.traverse(o => { if (o.isSkinnedMesh && o.skeleton) owned.add(o.skeleton); });', ''],
  'geometria-compartilhada': ['glbchars.js', 'if (o.isSkinnedMesh && o.skeleton) owned.add(o.skeleton);', 'if (o.isSkinnedMesh && o.skeleton) { owned.add(o.skeleton); owned.add(o.geometry); }'],
  'sem-material': ['glbchars.js', 'if (owned) owned.add(next);', ''],
  'sem-head': ['glbchars.js', 'if (owned) { owned.add(head.geometry); owned.add(head.material); }', ''],
  'sombra-compartilhada': ['glbchars.js', 'if (owned) owned.add(shadow.material);', 'if (owned) { owned.add(shadow.material); owned.add(shadow.geometry); }'],
  'sem-oculos': ['eyewear.js', 'mesh.geometry=mesh.geometry.clone();if(owned)owned.add(mesh.geometry);', 'mesh.geometry=mesh.geometry.clone();'],
  'sem-repasse-factory': ['glbchars.js', 'mountEyewear(model,def,owned);', 'mountEyewear(model,def);'],
  'sem-repasse-mount': ['eyewear.js', 'def.eyewearId,owned)?.anchor', 'def.eyewearId)?.anchor'],
};
const sourceUrl = (name, replacements = {}) => {
  const url = pathToFileURL(path.join(root, 'public/js', name));
  let source = fs.readFileSync(url, 'utf8');
  if (mutant && mutations[mutant][0] === name) {
    const [, before, after] = mutations[mutant];
    assert.equal(source.split(before).length - 1, 1, 'mutação tem alvo único');
    source = source.replace(before, after);
  }
  source = source.replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, spec) => 'from ' + JSON.stringify(
    replacements[spec] || (spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec))));
  return 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
};
if (mutant) assert(Object.hasOwn(mutations, mutant), 'mutante conhecido');
const eyewearUrl = mutant ? sourceUrl('eyewear.js') : pathToFileURL(path.join(root, 'public/js/eyewear.js')).href;
const G = await import(mutant ? sourceUrl('glbchars.js', {'./eyewear.js': eyewearUrl}) : pathToFileURL(path.join(root, 'public/js/glbchars.js')).href);
const {CHAR_FX} = await import(pathToFileURL(path.join(root, 'public/js/characters.js')));
const {mountEyewearCandidate} = await import(eyewearUrl);
if (mutant) console.log('Mutação aplicada: ' + mutant);
await G.preloadCharacterAssets(['senador'], {weapons: []});
const def = CHARACTERS.find(item => item.id === 'senador');
const failed = [], rows = [];
const watch = resource => { let count = 0; resource.addEventListener('dispose', () => count++); return () => count; };
const check = (clause, pass, observed) => {
  rows.push({clause, pass: !!pass, observed});
  try { assert(pass, clause); } catch (error) { failed.push({clause, type:error.name}); }
};
const previous = CHAR_FX.mats;
try {
 for (const options of [{}, {weapon:true}, {weapon:false,gloveSkinId:'invalid-owned-option'}]) {
  const owned = new Set(), result = G.buildCharacterModel(def, {...options,ownedResources:owned});
  check('unsupported owned options rejected: ' + JSON.stringify(options), result === null && owned.size === 0, {empty:owned.size === 0,rejected:result === null});
 }
 const unavailable = new Set();
 check('unavailable model retains null contract', G.buildCharacterModel({id:'missing'}, {weapon:false,ownedResources:unavailable}) === null && unavailable.size === 0);
 for (const materials of [false, true]) {
  CHAR_FX.mats = materials;
  const owned = new Set(), actor = G.buildCharacterModel(def, {weapon:false, ownedResources:owned});
  const other = G.buildCharacterModel(def, {weapon:false});
  assert(actor?.isGLB && other?.isGLB, 'real factory character and shared-cache control');
  let body, otherBody;
  actor.ctrl.model.traverse(object => { if (!body && object.isSkinnedMesh) body = object; });
  other.ctrl.model.traverse(object => { if (!otherBody && object.isSkinnedMesh) otherBody = object; });
  assert(body && otherBody && body.geometry === otherBody.geometry, 'actual shared geometry fixture');
  const firstMaterial = value => Array.isArray(value) ? value[0] : value;
  const bodyMaterial = firstMaterial(body.material), otherMaterial = firstMaterial(otherBody.material);
  assert.equal(bodyMaterial === otherMaterial, !materials, 'actual material cache branch');
  const own = [actor.parts.head.geometry, actor.parts.head.material];
  if (actor.ctrl.shadow) own.push(actor.ctrl.shadow.material);
  if (materials) actor.ctrl.model.traverse(object => { if (object.isMesh) own.push(...(Array.isArray(object.material) ? object.material : [object.material])); });
  const counts = new Map([...new Set(own)].map(resource => [resource, watch(resource)]));
  const shared = [body.geometry, otherMaterial];
  if (actor.ctrl.shadow) { assert.equal(actor.ctrl.shadow.geometry, other.ctrl.shadow.geometry, 'actual shared shadow geometry'); shared.push(actor.ctrl.shadow.geometry); }
  for (const resource of [bodyMaterial.map, otherMaterial.map]) if (resource) shared.push(resource);
  const sharedCounts = new Map([...new Set(shared)].map(resource => [resource, watch(resource)]));
  const skeletons = new Set(); actor.ctrl.model.traverse(object => { if (object.skeleton) skeletons.add(object.skeleton); });
  const boneTextures = [];
  for (const skeleton of skeletons) { skeleton.computeBoneTexture(); boneTextures.push([skeleton.boneTexture, watch(skeleton.boneTexture)]); }
  for (const resource of owned) resource.dispose();
  check('actor-owned allocations released, mats=' + materials, [...counts.values()].every(count => count() === 1), [...counts.values()].map(count => count()));
  check('shared cache preserved, mats=' + materials, [...sharedCounts.values()].every(count => count() === 0), [...sharedCounts.values()].map(count => count()));
  check('private bone textures released, mats=' + materials, boneTextures.every(([, count]) => count() === 1), boneTextures.map(([, count]) => count()));
  for (const [resource, count] of counts) if (count() === 0) resource.dispose();
  for (const [texture, count] of boneTextures) if (count() === 0) texture.dispose();
  actor.mixer.stopAllAction(); actor.mixer.uncacheRoot(actor.ctrl.model);
  other.mixer.stopAllAction(); other.mixer.uncacheRoot(other.ctrl.model);
 }
 const actor = G.buildCharacterModel(def, {weapon:false}), source = new THREE.BoxGeometry(.2,.1,.06), secondary = new THREE.BoxGeometry(.05,.02,.1);
 const material = new THREE.MeshStandardMaterial(), accessory = new THREE.Group();
 accessory.add(new THREE.Mesh(source, material), new THREE.Mesh(secondary, material));
 const sourceCount = watch(source), secondaryCount = watch(secondary), materialCount = watch(material), owned = new Set();
 const result = mountEyewearCandidate(actor.ctrl.model, accessory, {width:1.2,lensY:.5,height:.6,depth:.1}, null, 'ownership-fixture', owned);
 assert(result?.deformation?.mesh, 'real eyewear fit on real Head skin vertices');
 const clone = result.deformation.mesh.geometry, cloneCount = watch(clone);
 assert.notEqual(clone, source, 'real geometry clone');
 for (const resource of owned) resource.dispose();
 check('eyewear deformation geometry released', cloneCount() === 1, cloneCount());
 check('eyewear cached geometry and material preserved', sourceCount() === 0 && secondaryCount() === 0 && materialCount() === 0, [sourceCount(),secondaryCount(),materialCount()]);
 if (!cloneCount()) clone.dispose(); source.dispose(); secondary.dispose(); material.dispose();
 actor.mixer.stopAllAction();actor.mixer.uncacheRoot(actor.ctrl.model);
 // Enable only the fixture module, never the product flag or commercial item manifest.
 const flagUrl = 'data:text/javascript,export const TRETA_ITEMS_ENABLED=true;';
 const enabledEyewearUrl = sourceUrl('eyewear.js', {'./treta-features.js':flagUrl});
 const enabledG = await import(sourceUrl('glbchars.js', {'./eyewear.js':enabledEyewearUrl}));
 const enabledEyewear = await import(enabledEyewearUrl);
 const fixtureGeometry = new THREE.BoxGeometry(.2,.1,.06), fixtureMaterial = new THREE.MeshStandardMaterial();
 const fixtureAccessory = new THREE.Group(); fixtureAccessory.add(new THREE.Mesh(fixtureGeometry,fixtureMaterial));
 const bodySha = 'a'.repeat(64), profileId = 'ownership-fixture';
 const profile = {bodyId:'character:senador',profileId,bodySha256:bodySha,status:'certified',certified:true,source:'gpt-pilot+human-candidate',width:1.2,height:.6,depth:.1,lensY:.5};
 fitFixture = {accessory:fixtureAccessory,
  manifest:{eyewear:{'ownership-fixture':{approved:true,model:'/models/items/ownership-fixture.glb',profiles:{senador:profile}}}},
  landmarks:{bodies:{senador:{bodyId:profile.bodyId,profileId,bodySha256:bodySha,origin:'gpt-pilot+human-candidate',eyewear:{status:'measured'}}}}};
 await enabledG.preloadCharacterAssets(['senador'],{weapons:[]});
 await enabledEyewear.preloadEyewearAssets(['ownership-fixture']);
 const factoryOwned = new Set(), factoryActor = enabledG.buildCharacterModel({...def,eyewearId:'ownership-fixture'},{weapon:false,ownedResources:factoryOwned});
 const anchor = factoryActor.group.getObjectByName('TRETA-eyewear');
 assert(anchor, 'actual enabled fixture reaches factory→mount→candidate');
 let fitted; anchor.traverse(object => { if (!fitted && object.isMesh) fitted = object.geometry; });
 assert(fitted && fitted !== fixtureGeometry,'factory fitted clone exists');
 const fittedCount = watch(fitted), cachedCount = watch(fixtureGeometry);
 for (const resource of factoryOwned) resource.dispose();
 check('factory eyewear ownership forwarded end to end', fittedCount() === 1 && cachedCount() === 0,[fittedCount(),cachedCount()]);
 if (!fittedCount()) fitted.dispose();
 factoryActor.mixer.stopAllAction();factoryActor.mixer.uncacheRoot(factoryActor.ctrl.model);
 fixtureGeometry.dispose();fixtureMaterial.dispose();fitFixture=null;
} finally { CHAR_FX.mats = previous; }
console.log(JSON.stringify({mutant,purpose:'Actual factory GPU resource ownership, decoded textures replaced only for CPU loading. No visual or gait approval.',cases:rows.length,rows,failed}));
if (failed.length) process.exitCode=1;
