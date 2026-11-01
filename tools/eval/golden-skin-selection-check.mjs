import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const MUTANTS = ['body-noop', 'mag-unpainted', 'hand-painted', 'ak-base-changed', 'first-mesh'];
if (args.length > 1 || args.some(a => !MUTANTS.includes(a.replace(/^--mutante=/, '')) || !a.startsWith('--mutante='))) throw Error('CLI inválida: --mutante=' + MUTANTS.join('|'));
const mutant = args[0]?.slice('--mutante='.length) || '';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const assetSpec = {
  pistol: { path: 'public/models/viewmodels/coro/pistol-hires.glb', hash: '45b65dc9fee92ba1b3708007ee238c470b4b6d53c2d4fd2f50cd30667768c219', body: 'coro_solto_project_pistol', siblings: ['coro_solto_project_pistol_fresh_magazine', 'coro_solto_project_pistol_magazine'] },
  ak: { path: 'public/models/viewmodels/coro/ak-hires.glb', hash: '4094c0534f081ac96f1d6401d651c942b2b8d39dc777be30b15875706be0c48d', body: 'coro_solto_project_ak_body', siblings: ['coro_solto_project_ak_charging_handle', 'coro_solto_project_ak_magazine', 'coro_solto_project_ak_replacement_magazine'] },
};
const pinPaths = ['public/js/authoredvm.js', 'public/js/game.js', 'public/js/meleevm.js', 'public/js/weapon-skins.js', 'public/js/vmhands.js', 'public/js/data/vmconfig.js', 'public/js/data/goldenver.js', ...Object.values(assetSpec).map(s => s.path)];
const pins = () => Object.fromEntries(pinPaths.map(p => [p, sha(fs.readFileSync(path.join(ROOT, p)))]));
const sourceBefore = pins();
const events = [], originalConsole = {};
for (const k of ['log', 'info', 'warn', 'error']) { originalConsole[k] = console[k]; console[k] = (...a) => events.push({ level: k, text: a.map(String).join(' ') }); }
process.env.SIM_QS = '';
const H = await import('./harness.mjs');
const { THREE, Game, CHARACTERS, PCHAR, renderer, sfx, initTextures, seedRandom } = H;
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
const { MeshoptDecoder } = await import('../../public/vendor/meshopt_decoder.module.js');
const { WEAPON_SKINS } = await import('../../public/js/data/weapon-skin-definitions.js');
const originalRuntime = await import('../../public/js/authoredvm.js');
await MeshoptDecoder.ready;

const url = pathToFileURL(path.join(ROOT, 'public/js/authoredvm.js'));
let source = fs.readFileSync(url, 'utf8');
function replaceOnce(before, after) {
  if (source.split(before).length !== 2 || before === after) throw Error('INFRA: âncora ambígua/ausente: ' + before);
  source = source.replace(before, after);
}
replaceOnce('    if (NODE_RUNTIME || AUTHORED_KILLED) return null;', '    if (AUTHORED_KILLED) return null;');
if (mutant === 'body-noop') replaceOnce('if (!corpo && entry?.golden && GOLDEN_PAINT_BODY[entry.key]) {', 'if (false) {');
if (mutant === 'first-mesh') replaceOnce('const bodies = (entry.weaponMeshes || []).filter(mesh => mesh?.name === GOLDEN_PAINT_BODY[entry.key]);', 'const bodies = (entry.weaponMeshes || []).slice(0, 1);');
if (mutant === 'mag-unpainted') replaceOnce('const irmas = [...(entry.weaponMeshes || []), ...(corpo.userData?.mintParts || [])];', 'const irmas = [...(entry.weaponMeshes || []), ...(corpo.userData?.mintParts || [])].filter(p => !/magazine|charging_handle/.test(p.name));');
if (mutant === 'hand-painted') replaceOnce('const irmas = [...(entry.weaponMeshes || []), ...(corpo.userData?.mintParts || [])];', 'const irmas = [...(entry.weaponMeshes || []), ...(corpo.userData?.mintParts || []), ...(entry.handMeshes || [])];');
if (mutant === 'ak-base-changed') replaceOnce('const skinId = this.profile.weaponSkins?.[weaponId];', "const skinId = this.profile.weaponSkins?.[weaponId] || (weaponId === 'ak' ? 'ouro-ak' : null);");
source = source.replace(/from (['"])([^'"]+)\1/g, (_, q, p) => `from ${q}${p.startsWith('.') ? new URL(p, url).href : import.meta.resolve(p)}${q}`)
  .replace(/import\((['"])(\.\.?\/[^'"]+)\1\)/g, (_, q, p) => `import(${q}${new URL(p, url).href}${q})`);
const runtime = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

const materialsOf = mesh => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(Boolean);
const materialState = mesh => ({ marker: mesh.userData.weaponSkin || null, materials: materialsOf(mesh).map(m => ({ name: m.name, uuid: m.uuid, color: m.color?.getHexString(), roughness: m.roughness, metalness: m.metalness, weaponSkin: m.userData?.weaponSkin || null })) });
const typedHash = a => sha(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
function structure(entry, profile, camera) {
  entry.scene.updateWorldMatrix(true, true);
  camera.updateWorldMatrix(true, false);
  const nodes = [];
  entry.scene.traverse(o => nodes.push({ name: o.name, type: o.type, parent: o.parent?.name, position: o.position.toArray(), quaternion: o.quaternion.toArray(), scale: o.scale.toArray(), matrix: o.matrix.toArray(), matrixWorld: o.matrixWorld.toArray(), geometry: o.geometry && { index: o.geometry.index && typedHash(o.geometry.index.array), attributes: Object.fromEntries(Object.entries(o.geometry.attributes).map(([k, a]) => [k, typedHash(a.array)])), morph: Object.fromEntries(Object.entries(o.geometry.morphAttributes).map(([k, aa]) => [k, aa.map(a => typedHash(a.array))])) }, skeleton: o.skeleton && { bones: o.skeleton.bones.map(b => b.name), inverses: o.skeleton.boneInverses.map(m => m.toArray()) }, bind: o.bindMatrix?.toArray(), bindInverse: o.bindMatrixInverse?.toArray() }));
  return sha(JSON.stringify({ nodes, profile, playerCamera: { fov: camera.fov, aspect: camera.aspect, near: camera.near, far: camera.far, matrixWorld: camera.matrixWorld.toArray(), projection: camera.projectionMatrix.toArray() }, frame: entry.frame, cameraFov: entry.cameraFov, cameraAspect: entry.cameraAspect, mount: { position: entry.mount.position.toArray(), quaternion: entry.mount.quaternion.toArray(), scale: entry.mount.scale.toArray(), matrix: entry.mount.matrix.toArray(), matrixWorld: entry.mount.matrixWorld.toArray() }, clips: [...entry.clips].map(([key, c]) => [key, c.toJSON()]), action: entry.action && { name: entry.action.getClip().name, time: entry.action.time, rate: entry.action.getEffectiveTimeScale() } }));
}
const loadCalls = [], parseCalls = [], applyCalls = [], readyCalls = [], loadOperations = [];
const originalLoadAsync = GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync = async function (target) {
  const u = new URL(target, 'http://fixture.local');
  const pair = Object.entries(assetSpec).find(([, s]) => '/'+s.path.slice('public/'.length) === u.pathname);
  if (!pair) throw Error('INFRA: GLB fora da fixture: ' + target);
  const [weapon, spec] = pair, bytes = fs.readFileSync(path.join(ROOT, spec.path));
  if (sha(bytes) !== spec.hash || u.searchParams.get('v') !== spec.hash.slice(0, 10)) throw Error('INFRA: asset/revisão divergente: ' + weapon);
  this.setMeshoptDecoder(MeshoptDecoder);
  this.register(parser => { parser.loadTexture = async () => new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); return { name: 'EXT_texture_webp', loadTexture: parser.loadTexture }; });
  const gltf = await this.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  parseCalls.push({ weapon, sha256: sha(bytes), clips: gltf.animations.map(c => c.name) });
  return gltf;
};

seedRandom(970);
const def = CHARACTERS.find(c => c.id === PCHAR), games = [];
async function boot(weaponSkins) {
  const g = new Game({ renderer, textures: initTextures(), sfx, settings: { bots: 0, quality: 'low', difficulty: 'normal', sens: 1 }, playerCharId: def.id, playerTeam: 'E', playerFaction: def.team, enemyFaction: 'B', nickname: 'GOLD-SKIN', mapId: 'praca_poderes', ctf: false, testMode: true, playerWeaponSkins: weaponSkins, onQuit() {}, onMatchEnd() {} });
  games.push(g); g._ensureDolly = () => {}; g.killsToWin = Infinity; g.start ? g.start() : g._startRound();
  let tick = 0; while (g.state !== 'live' && tick++ < 250) g.update(1 / 60, false);
  if (g.state !== 'live') throw Error('INFRA: countdown não alcançou live');
  await Promise.resolve();
  const vm = g.vm.authored;
  if (!(vm instanceof originalRuntime.AuthoredViewModels)) throw Error('INFRA: controller Game não é o real');
  vm._loadFamily = function (key, request) { loadCalls.push({ key, request }); const operation = runtime.AuthoredViewModels.prototype._loadFamily.call(this, key, request); loadOperations.push(operation); return operation; };
  const ready = vm.onReady;
  vm.onReady = c => { readyCalls.push({ key: c._keyFor(c.weapon), entries: c.entries.size }); return ready?.(c); };
  vm._applyWeaponSkin = function (entry, weapon) {
    const before = { structure: structure(entry, this.profile, g.vmCamera), hands: entry.handMeshes.map(materialState), weapons: entry.weaponMeshes.map(materialState) };
    const result = runtime.AuthoredViewModels.prototype._applyWeaponSkin.call(this, entry, weapon);
    applyCalls.push({ key: entry.key, weapon, skinId: this.profile.weaponSkins?.[weapon] || null, clip: entry.action?.getClip().name, before, after: { structure: structure(entry, this.profile, g.vmCamera), hands: entry.handMeshes.map(materialState), weapons: entry.weaponMeshes.map(materialState) } });
    return result;
  };
  return { g, vm };
}
async function switchAndLoad({ g, vm }, weapon) {
  if (g.player.weapon === weapon) g._switchWeapon('knife');
  g._switchWeapon(weapon);
  const key = vm._keyFor(weapon), pending = vm.pending.get(key);
  if (!pending) throw Error('INFRA: switch não iniciou load real: ' + key);
  const entry = await pending;
  if (!entry || vm.entry(weapon) !== entry) throw Error('INFRA: load não instalou a entrada: ' + key);
  return entry;
}
const equipped = { pistol: 'ouro-pistola', ak: 'ouro-ak' };
for (const [weapon, id] of Object.entries(equipped)) if (!WEAPON_SKINS[id]?.runtimeEnabled || !WEAPON_SKINS[id]?.storeEnabled || !WEAPON_SKINS[id].targetWeapons.includes(weapon)) throw Error('INFRA: pintura inválida');
const painted = await boot(equipped), entries = {};
for (const weapon of ['pistol', 'ak']) entries[weapon] = await switchAndLoad(painted, weapon);
const selected = Object.fromEntries(Object.entries(entries).map(([weapon, entry]) => [weapon, runtime.pecasDaPintura(entry).map(o => o.name)]));
const checks = [], check = (id, ok, observed) => checks.push({ id, ok: Boolean(ok), observed });
for (const [weapon, entry] of Object.entries(entries)) {
  const spec = assetSpec[weapon], skin = equipped[weapon], body = entry.weaponMeshes.find(m => m.name === spec.body);
  const paintedMesh = mesh => mesh?.userData.weaponSkin === skin && materialsOf(mesh).every(m => m.userData.weaponSkin === skin);
  check(weapon + '-body', paintedMesh(body), body && materialState(body));
  check(weapon + '-siblings', spec.siblings.every(name => paintedMesh(entry.weaponMeshes.find(m => m.name === name))), entry.weaponMeshes.filter(m => spec.siblings.includes(m.name)).map(materialState));
  check(weapon + '-body-first', selected[weapon][0] === spec.body, selected[weapon]);
  const before = entry.weaponMeshes.map(materialState); painted.vm._applyWeaponSkin(entry, weapon);
  check(weapon + '-idempotent', JSON.stringify(before) === JSON.stringify(entry.weaponMeshes.map(materialState)), true);
}
const akRate = entries.ak.action.getEffectiveTimeScale();
painted.vm.setWeapon('ak'); painted.vm.draw('ak', .42);
check('ak-draw-preserved', entries.ak.action.getEffectiveTimeScale() === 1, { before: akRate, after: entries.ak.action.getEffectiveTimeScale() });
for (const weapon of ['pistol', 'ak']) {
  const entry = entries[weapon];
  painted.vm.setWeapon(weapon);
  for (const event of ['Equip', 'Reload']) {
    if (event === 'Equip') painted.vm.draw(weapon, weapon === 'ak' ? .42 : .34);
    else painted.vm.reload(weapon, 1.6);
    painted.vm.setProfile({ ...painted.vm.profile, weaponSkins: { ...painted.vm.profile.weaponSkins, [weapon]: event === 'Equip' ? 'prata-' + (weapon === 'pistol' ? 'pistola' : 'ak') : equipped[weapon] } });
    painted.vm._applyWeaponSkin(entry, weapon);
  }
}
const plain = await boot({}), plainAk = await switchAndLoad(plain, 'ak');
plain.vm._applyWeaponSkin(plainAk, 'ak');
check('ak-unpainted', plainAk.weaponMeshes.every(m => !m.userData.weaponSkin && materialsOf(m).every(mat => !mat.userData.weaponSkin && !mat.name.includes('__skin_'))) && applyCalls.filter(c => c.weapon === 'ak' && !c.skinId).every(c => JSON.stringify(c.before) === JSON.stringify(c.after)), plainAk.weaponMeshes.map(materialState));
check('hands-excluded', applyCalls.every(c => JSON.stringify(c.before.hands) === JSON.stringify(c.after.hands)), applyCalls.length);
check('structure-preserved', applyCalls.every(c => c.before.structure === c.after.structure), applyCalls.map(c => ({ key: c.key, clip: c.clip, before: c.before.structure, after: c.after.structure })));
const body = new THREE.Group(), sibling = new THREE.Group(), hand = new THREE.Group(); body.name = 'mint'; sibling.name = 'mag'; hand.name = 'hand';
const mintEntry = { key: 'fab#pistol', mint: { active: body }, weaponMeshes: [body, sibling], handMeshes: [hand] };
check('mint-factory-preserved', JSON.stringify(runtime.pecasDaPintura(mintEntry).map(o => o.name)) === JSON.stringify(['mint', 'mag']), runtime.pecasDaPintura(mintEntry).map(o => o.name));
check('unknown-golden-preserved', runtime.pecasDaPintura({ key: 'gold#unknown', golden: true, weaponMeshes: [body, sibling] }).length === 0, true);
check('named-body-order', Object.entries(entries).every(([weapon, e]) => runtime.pecasDaPintura({ ...e, weaponMeshes: [...e.weaponMeshes].reverse() })[0]?.name === assetSpec[weapon].body), true);
check('duplicate-body-rejected', Object.entries(entries).every(([weapon, e]) => runtime.pecasDaPintura({ ...e, weaponMeshes: [...e.weaponMeshes, e.weaponMeshes.find(m => m.name === assetSpec[weapon].body)] }).length === 0), true);
check('no-mint-created', Object.values(entries).every(e => !e.mint) && !plainAk.mint, true);
check('profile-load-real', painted.vm.profile.weaponSkins.pistol === 'ouro-pistola' && painted.vm.profile.weaponSkins.ak === 'ouro-ak' && parseCalls.length === 2 && readyCalls.length === 3 && Object.values(entries).every(e => e.mixer instanceof THREE.AnimationMixer), { parseCalls, readyCalls });
check('source-stable', JSON.stringify(sourceBefore) === JSON.stringify(pins()), true);
for (const g of games) g.dispose();
await Promise.all(loadOperations);
GLTFLoader.prototype.loadAsync = originalLoadAsync;
for (const k of Object.keys(originalConsole)) console[k] = originalConsole[k];
if (events.some(e => e.level === 'warn' || e.level === 'error')) throw Error('INFRA: ' + JSON.stringify(events.filter(e => e.level === 'warn' || e.level === 'error')));
const failed = checks.filter(c => !c.ok).map(c => c.id).sort();
const expected = { 'body-noop': ['pistol-body', 'pistol-siblings', 'pistol-body-first', 'ak-body', 'ak-siblings', 'ak-body-first', 'named-body-order'], 'mag-unpainted': ['pistol-siblings', 'ak-siblings'], 'hand-painted': ['hands-excluded', 'mint-factory-preserved'], 'ak-base-changed': ['ak-unpainted'], 'first-mesh': ['named-body-order', 'duplicate-body-rejected'] };
const ok = mutant ? JSON.stringify(failed) === JSON.stringify(expected[mutant].sort()) : failed.length === 0;
console.log('GOLDEN-SKIN/1 ' + JSON.stringify({ ok, mutant, failed, expected: mutant ? expected[mutant] : [], checks, sourcePins: sourceBefore, selected, loadCalls, applyCallCount: applyCalls.length, fixture: { realGameController: true, actualGameSwitch: true, fullLoadFamily: true, copyChange: 'Only NODE_RUNTIME load guard removed; imports relocated', textureBoundary: 'Exact shipping GLB parsed; neutral 1x1 texture decode; no pixel claim', poses: ['Idle from load', 'Equip start', 'Reload start'], limits: ['Node harness DOM/renderer/sfx; no browser download/appearance/decal/contact/anatomy/mobile/MP approval', 'Mint/factory and unknown selector cases are small API fixtures, not loaded private assets', 'No persistent model export or source writes by this checker'] } }));
if (!ok) process.exitCode = 1;
