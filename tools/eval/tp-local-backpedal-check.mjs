// Backpedal local: Game deve encaminhar o sentido ao controlador real (bots/netremote: −0.25).
// CPU com GLBs reais e textura branca; não mede contato, arte, mapas ou oito direções.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const root = process.cwd();
const option = name => process.argv.find(a => a.startsWith(name + '='))?.slice(name.length + 1);
const preview = process.argv.includes('--candidate-preview');
const mutant = option('--mutante') || '';
assert.ok(['', 'no-back', 'wrong-sign', 'player'].includes(mutant), 'mutante desconhecido');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const loadedInputs = {};
function read(file) {
  const bytes = fs.readFileSync(file);
  loadedInputs[path.relative(root, file)] = digest(bytes);
  return bytes;
}
function assetPath(url) {
  const file = path.resolve(root, 'public', String(url).split('?')[0].replace(/^\//, ''));
  assert.ok(file.startsWith(path.join(root, 'public') + path.sep), 'asset fora de public');
  return file;
}
const localFetch = async url => {
  const file = assetPath(url);
  return fs.existsSync(file) ? new Response(read(file)) : new Response('', {status: 404});
};
Object.defineProperty(globalThis, 'fetch', {configurable: true, get: () => localFetch, set() {}});
const {THREE, Game, CHARACTERS} = await import(pathToFileURL(path.join(root, 'tools/eval/harness.mjs')));
const {GLTFLoader} = await import(pathToFileURL(path.join(root, 'public/vendor/addons/loaders/GLTFLoader.js')));
Object.defineProperty(globalThis, 'fetch', {configurable: true, writable: true, value: localFetch});
GLTFLoader.prototype.load = function(url, done, progress, fail) {
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
const G = await import(pathToFileURL(path.join(root, 'public/js/glbchars.js')));
const oldCall = 'tp.ctrl.update(dt, sp > 0.6 ? 1 : 0, false, sp, false);';
const newCall = 'const back = -(p.vel.x * Math.sin(p.yaw) + p.vel.z * Math.cos(p.yaw)) < -0.25;\n      tp.ctrl.update(dt, sp > 0.6 ? 1 : 0, false, sp, back);';
const actual = Game.prototype._updatePlayerTP;
function replaceOnce(source, from, to) {
  assert.equal(source.split(from).length, 2, 'patch/mutante não aplicou exatamente uma vez');
  const changed = source.replace(from, to);
  assert.notEqual(changed, source, 'patch/mutante não aplicou');
  return changed;
}
const compile = source => Function('THREE', `return ({${source}})._updatePlayerTP`)(THREE);
const originalText = actual.toString();
const legacy = originalText.includes(newCall) ? compile(replaceOnce(originalText, newCall, oldCall)) : actual;
let selected = actual;
if (preview) selected = compile(replaceOnce(originalText, oldCall, newCall));
if (mutant === 'no-back' || mutant === 'wrong-sign') {
  selected = compile(replaceOnce(selected.toString(), 'sp, back)', mutant === 'no-back' ? 'sp, false)' : 'sp, !back)'));
}
if (mutant === 'player') selected = compile(replaceOnce(selected.toString(), 'const tp = this.playerTP, p = this.player;', 'const tp = this.playerTP, p = this.player; p.pos.x += 0.001;'));
const dt = 1 / 60;
const cases = [
  {name: 'forward', yaw: 0, ax: 0, az: -1, back: false},
  {name: 'backward', yaw: 0, ax: 0, az: 1, back: true},
  {name: 'left-rotated', yaw: .73, ax: -1, az: 0, back: false},
  {name: 'right-rotated', yaw: -1.2, ax: 1, az: 0, back: false},
  {name: 'stopped', yaw: .3, ax: 0, az: 0, back: false, idle: true},
  {name: 'backward-rotated', yaw: Math.PI / 2, ax: 0, az: 1, back: true},
  {name: 'forward-rotated', yaw: Math.PI / 2, ax: 0, az: -1, back: false},
  {name: 'at-minus-quarter', yaw: 0, vel: [2, 0, .25], back: false},
  {name: 'below-minus-quarter', yaw: 0, vel: [2, 0, .250001], back: true},
  {name: 'above-minus-quarter', yaw: 0, vel: [2, 0, .249999], back: false},
  {name: 'movement-boundary-idle', yaw: 0, vel: [0, 0, .6], back: true, idle: true},
  {name: 'movement-boundary-walk', yaw: 0, vel: [0, 0, .600001], back: true},
];
function fixture(id, weapon, c) {
  const built = G.buildCharacterModel(CHARACTERS.find(d => d.id === id), {weaponId: weapon});
  assert.ok(built?.ctrl?.actions.walk && built.ctrl.actions.run, 'GLB/clipes não carregaram');
  const player = {pos: new THREE.Vector3(), vel: new THREE.Vector3(...(c.vel || [0, 0, 0])), yaw: c.yaw, pitch: .1, crouchF: 0, scoped: false, grounded: true, weapon};
  const game = {_ensurePlayerTP() {}, playerTP: built, player, _tpEul: new THREE.Euler(), _tpFwd: new THREE.Vector3(), _tpRight: new THREE.Vector3(), _tpOrbitPitch: .2, _tpOrbitYaw: .4, _eyeWorld: new THREE.Vector3(), camView: 'third', camera: new THREE.PerspectiveCamera(70, 1.5, .08, 400), world: {groundHeightAt: () => 0}, sfx: {jump() {}, land() {}}, _collide() {}, _acceptInput: () => true, time: 0};
  const update = built.ctrl.update.bind(built.ctrl);
  const state = {built, game, args: null};
  built.ctrl.update = (...args) => {state.args = args; return update(...args);};
  return state;
}
function step(state, c, method) {
  const {game: g, built} = state, p = g.player;
  g.time += dt;
  const sp = c.vel ? Math.hypot(p.vel.x, p.vel.z) : Game.prototype._moveEntity.call(g, p, {ax: c.ax, az: c.az, crouch: false, shift: false, jump: false}, dt).sp;
  if (c.vel) p.pos.addScaledVector(p.vel, dt);
  g._eyeWorld.copy(p.pos).add(new THREE.Vector3(0, 1.62, 0));
  const before = JSON.stringify(p);
  method.call(g, dt, sp, 1.62);
  assert.equal(JSON.stringify(p), before, 'TP alterou player/physics');
  built.group.updateMatrixWorld(true);
  const ctrl = built.ctrl, action = ctrl.cur;
  const clip = Object.keys(ctrl.actions).find(k => ctrl.actions[k] === action);
  const actions = Object.fromEntries(Object.entries(ctrl.actions).map(([name, a]) => [name, {time: a.time, rate: a.getEffectiveTimeScale(), weight: a.getEffectiveWeight(), enabled: a.enabled, running: a.isRunning()}]));
  const bones = [];
  ctrl.model.traverse(o => {if (o.isBone && /(Leg|Foot)/.test(o.name)) bones.push([o.name, ...o.quaternion.toArray()]);});
  assert.ok(bones.length, 'nenhum osso Leg/Foot medido');
  return {sp, clip, time: action.time, rate: action.getEffectiveTimeScale(), duration: action.getClip().duration, actions, bones,
    authority: {player: JSON.parse(before), camera: {position: g.camera.position.toArray(), quaternion: g.camera.quaternion.toArray()}, eye: g._eyeWorld.toArray(), aim: g._tpAimPoint.toArray(), bodyRoot: built.group.matrixWorld.toArray()}};
}
const rows = [], clips = {}, clipDetails = {};
for (const [id, weapon] of [['mst', 'ak'], ['sertanejo', 'revolver38'], ['gotinha', 'pistol']]) {
  await G.preloadCharacterAssets([id], {weapons: [weapon]});
  for (const c of cases) {
    const tested = fixture(id, weapon, c), reference = fixture(id, weapon, c);
    if (!clips[id]) {
      clipDetails[id] = Object.fromEntries(Object.entries(tested.built.ctrl.actions).map(([name, action]) => {
        const clip = action.getClip();
        return [name, {name: clip.name, duration: clip.duration, tracks: clip.tracks.map(t => ({name: t.name, type: t.ValueTypeName, times: Array.from(t.times), values: Array.from(t.values)}))}];
      }));
      clips[id] = Object.fromEntries(Object.entries(clipDetails[id]).map(([name, clip]) => [name, {name: clip.name, duration: clip.duration, trackNames: clip.tracks.map(t => t.name), payloadSHA256: digest(JSON.stringify(clip))}]));
    }
    const errors = [], samples = [];
    let authorityFrames = 0, negativeFrames = 0;
    const check = fn => {try {fn();} catch (e) {if (!errors.includes(e.message)) errors.push(e.message);}};
    try {
      for (let frame = 0; frame < 60; frame++) {
        const a = step(tested, c, selected), b = step(reference, c, legacy);
        check(() => assert.deepEqual(a.authority, b.authority, 'autoridade/câmera/aim/root divergiram'));
        authorityFrames++;
        if (!c.back) {
          check(() => assert.deepEqual({clip: a.clip, actions: a.actions, bones: a.bones}, {clip: b.clip, actions: b.actions, bones: b.bones}, 'ação/pose negativa alterada'));
          negativeFrames++;
        }
        if (frame >= 30) {
          const ctrl = tested.built.ctrl;
          const expected = c.idle ? (ctrl.oneHanded && ctrl.actions.idle1h ? 'idle1h' : 'idle') : c.back ? (ctrl.oneHanded && ctrl.actions.walk1h ? 'walk1h' : 'walk') : 'run';
          check(() => assert.equal(a.clip, expected, 'clip ativo incorreto'));
          if (!c.idle) check(() => assert.equal(Math.sign(a.rate), c.back ? -1 : 1, 'sentido real do mixer incorreto'));
          check(() => assert.equal(tested.args[4], c.back, 'back incorreto'));
          check(() => assert.equal(tested.args[2], false, 'hasTarget alterado'));
          check(() => assert.equal(tested.args[3], a.sp, 'speed alterado'));
        }
        if ([30, 45, 59].includes(frame)) samples.push({frame, ...a});
      }
      if (!c.idle) {
        assert.notDeepEqual(samples[0].bones, samples[1].bones, 'pose real não avançou');
        const a = samples[1], b = samples[2], time = ((a.time + (b.frame - a.frame) * dt * a.rate) % a.duration + a.duration) % a.duration;
        assert.ok(Math.abs(time - b.time) < 1e-9, 'trajetória temporal difere do rate assinado');
      }
    } catch (e) {errors.push(e.message);}
    rows.push({id, weapon, case: c.name, pass: !errors.length, errors, authorityFrames, negativeFrames, samples});
  }
}
for (const [file, sha] of Object.entries(loadedInputs)) assert.equal(digest(fs.readFileSync(path.join(root, file))), sha, 'asset mudou durante gate');
const report = {preview, mutant, scope: 'CPU real GLB/CharController; physics plana sintética; sem render', passed: rows.filter(r => r.pass).length, total: rows.length, rows, clips, loadedInputs};
if (option('--out')) fs.writeFileSync(path.resolve(option('--out')), JSON.stringify(report, null, 2) + '\n');
if (option('--clip-out')) fs.writeFileSync(path.resolve(option('--clip-out')), JSON.stringify(clipDetails) + '\n');
console.log(JSON.stringify({preview, mutant, passed: report.passed, total: report.total, failed: rows.filter(r => !r.pass).map(r => [r.id, r.case, r.errors[0]]), authorityFrames: rows.reduce((n, r) => n + r.authorityFrames, 0), negativeFrames: rows.reduce((n, r) => n + r.negativeFrames, 0), loadedFiles: Object.keys(loadedInputs).length}));
process.exitCode = report.passed === report.total ? 0 : 1;
