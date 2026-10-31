// Emissão do consumidor real após Game.update; fixture animada não certifica assets.
// Caso visual e limites: docs/visual-consistency/SHOT-FINAL-POSE.md.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const { THREE, Game, bootGame, initTextures } = await import('./harness.mjs');
let { AuthoredViewModels } = await import('../../public/js/authoredvm.js');
const option = n => process.argv.find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const mutant = option('mutante');
const mutants = ['imediato', 'sem-follow', 'alvo', 'sem-flush', 'bind-antigo', 'sem-cancelar'];
if (process.argv.slice(2).some(a => !/^--(?:game-module|mutante)=.+$/.test(a)) || (mutant && !mutants.includes(mutant))) {
  console.error('CLI inválida'); process.exit(2);
}
if (mutant === 'bind-antigo') {
  const url = new URL('../../public/js/authoredvm.js', import.meta.url);
  let source = readFileSync(url, 'utf8');
  const before = 'entry.scene.updateWorldMatrix(true, false);\n    entry.scene.updateMatrixWorld(true);';
  assert.equal(source.split(before).length, 2, 'mutação bind não aplicada');
  source = source.replace(before, 'entry.scene.updateWorldMatrix(true, true);');
  source = source.replace(/from\s+(['"])([^'"]+)\1/g, (_, q, spec) => 'from ' + JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
  ({ AuthoredViewModels } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64')));
}
const module = option('game-module');
let Runtime = module ? (await import(pathToFileURL(resolve(module)))).Game : Game;
if (mutant && mutant !== 'bind-antigo') {
  const url = new URL('../../public/js/game.js', import.meta.url);
  let source = readFileSync(url, 'utf8');
  const replace = (from, to) => { assert.equal(source.split(from).length, 2, 'mutação não aplicada'); source = source.replace(from, to); };
  if (mutant === 'imediato') {
    replace('if (jogadorFp && this.vm.authored?', 'if (false && jogadorFp && this.vm.authored?');
    replace('if (fpCls && !poseFinal &&', 'if (false && fpCls && !poseFinal &&');
  }
  if (mutant === 'sem-follow') replace('if (m.armaFp) {', 'if (false && m.armaFp) {');
  if (mutant === 'alvo') replace(', fx.alvo);', ', fx.alvo.clone().add(new THREE.Vector3(1, 0, 0)));');
  if (mutant === 'sem-flush') replace('const pendentes = this._fxTiroPendente;', 'const pendentes = null;');
  if (mutant === 'sem-cancelar') replace('  _releaseInput() {\n    this._fxTiroPendente = null;', '  _releaseInput() {');
  source = source.replace(/from\s+(['"])([^'"]+)\1/g, (_, q, spec) => 'from ' + JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
  Runtime = (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))).Game;
}

const g = bootGame('piscina_treta', { textures: initTextures(), bots: 0 });
for (const name of Object.getOwnPropertyNames(Runtime.prototype)) {
  if (name !== 'constructor' && typeof Runtime.prototype[name] === 'function') g[name] = Runtime.prototype[name];
}
g.bots = [];
g.state = 'live'; g.paused = false; g.camView = 'first';
g._consultarTiro = () => null;
g._cancelInspect = () => {};
g._recordEnabled = false;
g.player.weapon = 'ak'; g.player.ammo.ak = { mag: 30, res: 0 };
g.player.drawUntil = 0; g.player.reloadUntil = 0;
g.player.pos.set(0, 0, 0); g.player.yaw = 0; g.player.pitch = 0;
g.vm.adsF = 0;
const vm = new AuthoredViewModels(g.vm.root);
g.vm.authored = vm; vm.weapon = 'ak';
const mount = new THREE.Group(), scene = new THREE.Group(), bone = new THREE.Bone();
bone.name = 'Barrel'; scene.add(bone); mount.add(scene); g.vm.root.add(mount);
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute([-.01, 0, 0, .01, 0, 0, 0, 0, -1], 3));
geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(12), 4));
geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
const gun = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial()); scene.add(gun);
g.vm.root.updateMatrixWorld(true); gun.bind(new THREE.Skeleton([bone]));
const sockets = {};
for (const [name, pos] of Object.entries({ muzzle: [0, 0, -1], sight: [0, 0, -.1], up: [0, .1, -.1] })) {
  const node = new THREE.Object3D(); node.position.fromArray(pos); bone.add(node); sockets[name] = node;
}
const clip = new THREE.AnimationClip('shoot', .2, [
  new THREE.VectorKeyframeTrack('Barrel.position', [0, .2], [0, 0, 0, .18, .04, .02]),
]);
const entry = { key: vm._keyFor('ak'), family: 'ak', golden: true, mount, scene, sockets: {},
  adsSockets: sockets, weaponMeshes: [gun], mixer: new THREE.AnimationMixer(scene), clips: new Map([['shoot', clip]]),
  queue: [], serial: 0, frame: { x: .27, y: -.18, z: -.7, rotDeg: [5, 12, 0] },
  drawTime: 1, drawDuration: .32, state: 'idle', stateUntil: 0, cameraFov: 48, cameraAspect: 1.5 };
vm.entries.set(entry.key, entry);
const px = (v, camera) => { const q = v.clone().project(camera); return new THREE.Vector2((q.x + 1) * 660, (1 - q.y) * 440); };
const landmark = () => { g.vmScene.updateMatrixWorld(true); return gun.getVertexPosition(2, new THREE.Vector3()).applyMatrix4(gun.matrixWorld); };
const rows = [], endpoints = [], rays = [];
const hitscan = g._fireHitscan.bind(g);
g._fireHitscan = function (actor, from, dir, ...rest) {
  const expected = from.clone().addScaledVector(dir, 120);
  rays.push({ from: from.clone(), dir: dir.clone(), expected });
  return hitscan(actor, from, dir, ...rest);
};
const tracer = g._tracer.bind(g);
g._tracer = function (...args) {
  const before = this.tracers.length; tracer(...args);
  if (this.tracers.length > before) endpoints.push(args[1].clone());
};
function checkFrame(tag) {
  const point = landmark(), expected = px(point, g.vmCamera);
  const flash = g._vmMzActive.at(-1), trace = g.tracers.at(-1);
  assert(flash && trace, `${tag}: FX reais ausentes`);
  const flashDelta = px(flash.grp.getWorldPosition(new THREE.Vector3()), g.vmCamera).distanceTo(expected);
  const tracerDelta = px(trace.a, g.camera).distanceTo(expected);
  const end = trace.a.clone().addScaledVector(trace.dir, trace.dist);
  const endpointDelta = end.distanceTo(rays.at(-1).expected);
  rows.push({ tag, flashDelta, tracerDelta, endpointDelta });
}
function tick() { g.update(1 / 60, false); }
for (const [tag, ads, ramp] of [['hip', false, 0], ['transition', true, 2], ['ads', true, 10], ['burst', true, 10]]) {
  g._scope(ads, true); g.mouseDown0 = false;
  for (let i = 0; i < 20 + ramp; i++) tick();
  if (tag === 'transition') { g._scope(false, true); for (let i = 0; i < 15; i++) tick(); g._scope(true, true); }
  g.player.nextShotAt = 0; g.mouseDown0 = true;
  tick(); g.mouseDown0 = false;
  checkFrame(tag);
  // O flash ainda vivo acompanha o cano, mas a bala já emitida preserva trajetória.
  const oldOrigin = g.tracers.at(-1).a.clone();
  tick(); checkFrame(`${tag}-follow`);
  assert(g.tracers.at(-1).a.distanceTo(oldOrigin) < 1e-12, `${tag}: traçante segue arma após emissão`);
}
console.log(JSON.stringify({ rows, shots: rays.length, emissions: endpoints.length, actualGameUpdate: true, actualAuthoredUpdate: true, syntheticAsset: true }));
for (const r of rows) {
  assert(r.flashDelta < 1e-7, `${r.tag}: clarão deslocado ${r.flashDelta}px da malha final`);
  if (!r.tag.endsWith('-follow')) assert(r.tracerDelta < 1e-7, `${r.tag}: origem deslocada ${r.tracerDelta}px da malha final`);
  assert(r.endpointDelta < 1e-10, `${r.tag}: alvo balístico mudou ${r.endpointDelta}`);
}
assert.equal(rays.length, 4); assert.equal(endpoints.length, 4);
// Clique fora do update aguarda a pose; trocar arma/morrer descarta a fila sem alocar pool.
for (let i = 0; i < 15; i++) tick();
g.player.nextShotAt = 0;
const traceBefore = g.tracers.length, poolBefore = g._vmMzPool.length;
g._tryShoot(false);
assert.equal(g.tracers.length, traceBefore, 'DOM: tracer emitido antes do frame');
assert.equal(g._vmMzPool.length, poolBefore, 'DOM: flash alocado antes do frame');
assert.equal(g._fxTiroPendente.length, 2, 'DOM: um tracer e um flash');
tick(); checkFrame('DOM');
assert.equal(g._fxTiroPendente, null);
const pending = () => { g.player.nextShotAt = 0; g._tryShoot(false); assert.equal(g._fxTiroPendente.length, 2); };
for (let i = 0; i < 15; i++) tick();
pending(); const poolSwitch = g._vmMzPool.length;
g.player.weapon = 'pistol'; g._updateFx(1 / 60);
assert.equal(g._fxTiroPendente, null); assert.equal(g._vmMzPool.length, poolSwitch);
g.player.weapon = 'ak'; pending(); g.player.alive = false; g._updateFx(1 / 60);
assert.equal(g._fxTiroPendente, null); assert.equal(g._vmMzPool.length, poolSwitch);
g.player.alive = true;
// Um disparo aceito antes do cancelamento não pode reaparecer ao retomar a partida.
for (const [tag, cancel, resume] of [
  ['reset', () => g._releaseInput(), () => {}],
  ['pause', () => g.setPaused(true), () => g.setPaused(false)],
  ['chat', () => g.travarEntrada(true), () => g.travarEntrada(false)],
]) {
  pending();
  const emitted = endpoints.length, pool = g._vmMzPool.length;
  cancel();
  assert.equal(g._fxTiroPendente, null, `cancelamento ${tag} deixou FX pendente`);
  resume(); tick();
  assert.equal(endpoints.length, emitted, `cancelamento ${tag} emitiu traçante ao retomar`);
  assert.equal(g._vmMzPool.length, pool, `cancelamento ${tag} alocou clarão ao retomar`);
}
// 3P e legacy continuam imediatos; alvo da rede fica congelado até o flush.
const { makeNetcode } = await import('../../public/js/netgame.js');
const nc = makeNetcode(g, { meta: { snapshotHz: 20 }, startPing() {}, stopPing() {} });
clearInterval(nc._nsTimer);
try {
  g.camView = 'first';
  const target = new THREE.Vector3(3, 2, -90), arr = target.toArray();
  nc.tiroDeRede(g.player, { o: [0, 1.62, 0], p: [arr], s: '-' });
  assert.equal(g._fxTiroPendente.length, 1, 'eco online cria somente tracer');
  arr[0] = 1000;
  g._updateFx(1 / 60);
  assert(endpoints.at(-1).distanceTo(target) < 1e-12, 'endpoint rede mudou depois da fila');
  assert.equal(g._fxTiroPendente, null);
  g._bocaCorpo = false;
  const oldSwitchCount = endpoints.length;
  nc.tiroDeRede(g.player, { o: [0, 1.62, 0], p: [[3, 2, -90]], s: '-' });
  assert.equal(endpoints.length, oldSwitchCount + 1, 'kill-switch: emissão deve continuar imediata');
  assert.equal(g._fxTiroPendente, null, 'kill-switch: fila ignorou origem legacy');
  assert(g.tracers.at(-1).a.distanceTo(new THREE.Vector3(0, 1.62, 0).lerp(target, .06)) < 1e-12, 'kill-switch: origem legacy alterada');
  g._bocaCorpo = true;
  const before = endpoints.length;
  g.camView = 'third';
  g._tracer(new THREE.Vector3(0, 1, 0), target);
  assert.equal(endpoints.length, before + 1); assert.equal(g._fxTiroPendente, null);
  g.camView = 'first'; g.vm.authored = null;
  g._tracer(new THREE.Vector3(0, 1, 0), target, true);
  assert.equal(endpoints.length, before + 2); assert.equal(g._fxTiroPendente, null);
} finally { nc.dispose(); }
for (const r of rows.filter(r => r.tag === 'DOM')) {
  assert(r.flashDelta < 1e-7 && r.tracerDelta < 1e-7 && r.endpointDelta < 1e-10, 'DOM: emissão fora da pose final');
}

console.log('SHOT-FINAL-POSE GREEN');
process.exit(0);
