// CPU contract: accepted TP shot, event phase, stationary return and expiry.
// Uses real Game/controller/assets on a flat fixture; does not approve animation art.
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
const localFetch = async url => {
  const file = assetPath(url);
  return fs.existsSync(file) ? new Response(read(file)) : new Response('', {status: 404});
};
Object.defineProperty(globalThis, 'fetch', {configurable: true, get: () => localFetch, set() {}});
const {THREE, Game: ActualGame, CHARACTERS} = await import(pathToFileURL(path.join(root, 'tools/eval/harness.mjs')));
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
// Overrides are reproduction aids; the default always checks the actual checkout.
const gameFile = path.resolve(option('--game-module') || path.join(root, 'public/js/game.js'));
const glbFile = path.resolve(option('--glb-module') || path.join(root, 'public/js/glbchars.js'));
const {Game} = await import(pathToFileURL(gameFile));
const G = await import(pathToFileURL(glbFile));
const sourceHashes = Object.fromEntries([gameFile, glbFile].map(f => [f, hash(read(f))]));
const rows = [], observations = [];
const check = (name, pass, observed = {}) => rows.push({name, pass: !!pass, observed});
const noop = () => {};
const dt = 1 / 60;
function fixture({weapon = 'pistol', view = 'third', online = true, built, absent = false} = {}) {
  const calls = {tp: 0, vm: 0, hitscan: 0, reload: 0, knife: 0, network: 0};
  const ctrl = built?.ctrl || {shoot() {}};
  if (ctrl.shoot) {
    const shoot = ctrl.shoot;
    ctrl.shoot = function(...args) { calls.tp++; return shoot.apply(this, args); };
  }
  const player = {pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0,
    crouchF: 0, scoped: false, grounded: true, weapon, alive: true,
    ammo: {[weapon]: {mag: 5, res: 20}}, nextShotAt: 0, reloadUntil: 0, drawUntil: 0};
  const game = {player, playerTP: absent ? undefined : built || {ctrl}, state: 'live', time: 10,
    camView: view, online, _mp: {_evOn: online, pedirReload() { calls.network++; }},
    camera: new THREE.PerspectiveCamera(70, 1.5, .08, 400), espectando: () => false,
    _reloading: ActualGame.prototype._reloading, _startReload() { calls.reload++; },
    _tryKnifeAttack() { calls.knife++; }, _botOuve: noop, _aimOrigin: v => v.set(0, 1.62, 0),
    _fireHitscan() { calls.hitscan++; }, _shotRecoil: noop, _muzzleWorld: () => new THREE.Vector3(),
    _flash: noop, _ejectCasing: noop, _scope: noop,
    vm: {authored: {shoot() { calls.vm++; }}, recoil: {kick: noop}},
    sfx: {shotWeapon: noop, dryFire: noop, jump: noop, land: noop},
    _ensurePlayerTP: noop, _tpEul: new THREE.Euler(), _tpFwd: new THREE.Vector3(),
    _tpRight: new THREE.Vector3(), _tpOrbitPitch: 0, _tpOrbitYaw: 0, _eyeWorld: new THREE.Vector3(),
    world: {groundHeightAt: () => 0}, _collide: noop, _acceptInput: () => true};
  return {game, player, calls, built, ctrl};
}
const fire = t => Game.prototype._tryShoot.call(t.game);
for (const weapon of ['pistol', 'ak']) for (const view of ['third', 'shoulder', 'first']) {
  const t = fixture({weapon, view});
  fire(t);
  check(`accepted ${weapon}/${view}`, t.calls.tp === (view === 'first' ? 0 : 1)
    && t.calls.vm === 1 && t.player.ammo[weapon].mag === 4 && t.calls.network === 0);
  const before = JSON.stringify(t.calls);
  fire(t);
  check(`cooldown ${weapon}/${view}`, JSON.stringify(t.calls) === before);
  t.game.time = 11; fire(t);
  check(`repeat ${weapon}/${view}`, t.calls.tp === (view === 'first' ? 0 : 2)
    && t.calls.vm === 2 && t.player.ammo[weapon].mag === 3);
}
for (const weapon of ['pistol', 'ak']) {
  const t = fixture({weapon, online: false}); fire(t);
  check(`offline ${weapon}`, t.calls.tp === 1 && t.calls.vm === 1 && t.calls.hitscan === 1);
}
for (const kind of ['dead', 'state', 'spectator', 'cooldown', 'reload', 'draw', 'dryfire', 'knife']) {
  const t = fixture();
  if (kind === 'dead') t.player.alive = false;
  if (kind === 'state') t.game.state = 'countdown';
  if (kind === 'spectator') t.game.espectando = () => true;
  if (kind === 'cooldown') t.player.nextShotAt = 11;
  if (kind === 'reload') t.player.reloadUntil = 11;
  if (kind === 'draw') t.player.drawUntil = 11;
  if (kind === 'dryfire') t.player.ammo.pistol.mag = 0;
  if (kind === 'knife') t.player.weapon = 'knife';
  fire(t);
  check(`rejected ${kind}`, t.calls.tp === 0 && t.calls.vm === 0
    && (kind !== 'dryfire' || t.calls.reload === 1) && (kind !== 'knife' || t.calls.knife === 1));
}
for (const kind of ['absent', 'procedural', 'missing-method']) {
  const t = fixture({absent: kind === 'absent'});
  if (kind === 'procedural') t.game.playerTP = {group: new THREE.Group()};
  if (kind === 'missing-method') t.game.playerTP = {ctrl: {}};
  fire(t);
  check(`optional ${kind}`, t.calls.tp === 0 && t.calls.vm === 1 && t.player.ammo.pistol.mag === 4);
}
{
  const t = fixture({view: 'first'}); fire(t); t.game.camView = 'third';
  check('first-person event not queued', t.calls.tp === 0);
  t.game.time = 11; fire(t); check('new visible event', t.calls.tp === 1);
}
function signal(t) {
  const g = t.game;
  return {player: JSON.parse(JSON.stringify(t.player)),
    camera: [g.camera.position.toArray(), g.camera.quaternion.toArray()], aim: g._tpAimPoint.toArray()};
}
const scenarios = [
  {name: 'walk-stop', stop: 66}, {name: 'short-stop', stop: 46},
  {name: 'latest-repeat', stop: 66, shots: [30, 31, 50]},
  {name: 'stationary', stop: 42}, {name: 'walk-through', stop: 180},
  {name: 'crouch-after', stop: 66}, {name: 'dead-after', stop: 66},
  {name: 'dead-revive', stop: 66}, {name: 'missing-shoot', stop: 66},
  {name: 'missing-walkfire', stop: 66}
];
for (const id of ['sertanejo', 'gotinha']) {
  const weapon = id === 'sertanejo' ? 'ak' : 'pistol';
  await G.preloadCharacterAssets([id], {weapons: [weapon]});
  for (const spec of scenarios) {
    const build = () => G.buildCharacterModel(CHARACTERS.find(d => d.id === id), {weaponId: weapon});
    const t = fixture({weapon, built: build()}), control = fixture({weapon, built: build()});
    assert(t.ctrl.tpMount?.mount && t.ctrl.actions.shoot, 'real rig/weapon/shoot missing');
    const c = t.ctrl, a = c.actions.shoot, originalReset = a.reset;
    let resets = 0;
    a.reset = function(...args) { resets++; return originalReset.apply(this, args); };
    if (spec.name === 'missing-shoot') delete c.actions.shoot;
    if (spec.name === 'missing-walkfire') delete c.actions.walkfire;
    const frames = [], finishes = [];
    c.mixer.addEventListener('finished', e => {
      if (e.action === a) finishes.push({frame: frames.length, mixer: c.mixer.time, deadline: c._shootUntil});
    });
    let firstStop = null;
    for (let frame = 0; frame < 180; frame++) {
      const input = {ax: 0, az: frame >= 42 && frame < spec.stop ? -1 : 0,
        crouch: spec.name === 'crouch-after' && frame >= 50 && frame < 110,
        shift: false, jump: false};
      for (const entry of [t, control]) {
        entry.game.time += dt;
        if (frame === 40 && ['dead-after', 'dead-revive'].includes(spec.name)) {
          entry.player.alive = false; entry.ctrl.die();
        }
        if (frame === 50 && spec.name === 'dead-revive') {
          entry.player.alive = true; entry.ctrl.revive();
        }
        if ((spec.shots || [30]).includes(frame)) {
          if (entry === t) Game.prototype._tryShoot.call(entry.game);
          else {
            // Counterfactual: same accepted shot and view, but no local TP event.
            const owner = entry.game.playerTP;
            entry.game.playerTP = undefined;
            try { ActualGame.prototype._tryShoot.call(entry.game); }
            finally { entry.game.playerTP = owner; }
          }
        }
      }
      const entry = {mixer: c.mixer.time, deadline: c._shootUntil, resets,
        duration: a.getClip().duration, loop: a.loop, clamp: a.clampWhenFinished};
      let speed;
      for (const state of [t, control]) {
        const sp = ActualGame.prototype._moveEntity.call(state.game, state.player, input, dt).sp;
        state.game._eyeWorld.copy(state.player.pos).add(new THREE.Vector3(0, 1.62, 0));
        const before = JSON.stringify(state.player);
        ActualGame.prototype._updatePlayerTP.call(state.game, dt, sp, 1.62);
        assert.equal(JSON.stringify(state.player), before, 'TP changed physics');
        if (state === t) speed = sp;
      }
      assert.deepEqual(signal(t), signal(control), 'authority/camera/aim pair drift');
      const clip = Object.keys(c.actions).find(k => c.actions[k] === c.cur);
      const row = {frame, entry, sp: speed, mixer: c.mixer.time, deadline: c._shootUntil,
        shooting: c.shooting, clip, curName: c.curName, shootTime: a.time, paused: a.paused,
        resets, loop: a.loop, clamp: a.clampWhenFinished,
        walkfireWeight: c.actions.walkfire?.getEffectiveWeight(), calls: {...t.calls}};
      frames.push(row);
      if (['walk-stop', 'short-stop', 'latest-repeat'].includes(spec.name)
        && frame >= spec.stop && speed <= .6 && row.shooting && firstStop === null) firstStop = frame;
    }
    const label = `${id}/${spec.name}`, last = frames.at(-1);
    observations.push({id, weapon, scenario: spec.name, frames, finishes});
    check(label + ' dispatch', last.calls.tp === (spec.shots ? 2 : 1));
    check(label + ' control has no TP event', control.calls.tp === 0);
    check(label + ' VM/network', last.calls.vm === (spec.shots ? 2 : 1)
      && frames.every(f => f.calls.network === 0 && f.calls.hitscan === 0));
    check(label + ' terminates', !last.shooting);
    if (['walk-stop', 'short-stop', 'latest-repeat'].includes(spec.name)) {
      check(label + ' initial name', frames[30].curName === 'shoot');
      check(label + ' reachable return', firstStop !== null);
      if (firstStop !== null) {
        const f = frames[firstStop], afterFade = frames[firstStop + Math.ceil(.16 / dt) + 1];
        check(label + ' shoot return', f.clip === 'shoot' && f.curName === 'shoot' && f.entry.mixer < f.deadline);
        check(label + ' no reset', f.resets === f.entry.resets);
        check(label + ' event phase', Object.is(f.shootTime, f.entry.duration - (f.entry.deadline - f.entry.mixer) + dt));
        check(label + ' clock/loop', Object.is(f.mixer, f.entry.mixer + dt)
          && Object.is(f.deadline, f.entry.deadline) && f.loop === f.entry.loop
          && f.clamp === f.entry.clamp && !f.paused);
        check(label + ' completed fade', afterFade.clip === 'shoot' && afterFade.walkfireWeight === 0);
      }
      check(label + ' idle return', /^(idle|idle1h)$/.test(last.clip));
    }
    if (spec.name === 'walk-stop') {
      const pending = frames.filter(f => f.frame >= 42 && f.mixer < f.deadline);
      check(label + ' no premature expiry EXIT', pending.length > 0 && pending.every(f => f.shooting));
    }
    if (spec.shots) {
      check(label + ' cooldown unchanged', frames[31].deadline === frames[30].deadline && frames[31].calls.tp === 1);
      check(label + ' latest deadline', frames[50].deadline > frames[49].deadline && frames[50].calls.tp === 2);
      const pending = frames.filter(f => f.frame > 50 && f.entry.mixer >= frames[49].deadline && f.mixer < frames[50].deadline);
      check(label + ' latest pending EXIT', pending.length > 0 && pending.every(f => f.shooting));
    }
    if (spec.name === 'stationary') check(label + ' original finished listener', finishes.length > 0
      && finishes.every(f => f.mixer >= f.deadline && !frames[f.frame].shooting));
    if (spec.name === 'dead-after') check(label + ' death retained', frames.slice(40).every(f => !f.shooting && f.clip === 'death'));
    if (spec.name === 'dead-revive') check(label + ' revive idle', /^(idle|idle1h)$/.test(last.clip));
    if (spec.name === 'missing-shoot') check(label + ' no animation', frames.every(f => !f.shooting));
    if (spec.name === 'crouch-after') check(label + ' crouch retained', frames.slice(60, 100).every(f => /^(crouch|crouchwalk)$/.test(f.clip)));
  }
}
for (const [file, expected] of Object.entries(sourceHashes)) assert.equal(hash(fs.readFileSync(file)), expected, 'source drift');
const result = {passed: rows.filter(r => r.pass).length, total: rows.length,
  failed: rows.filter(r => !r.pass).map(r => r.name), rows, observations, loadedInputs,
  sourceHashes, texturePolicy: 'white CPU stub', scope: 'no browser/art/fit/full-game/MP approval'};
// Persist observations and failures before returning nonzero; OUT is optional and exclusive.
if (output) fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({passed: result.passed, total: result.total, failed: result.failed}));
if (result.failed.length) process.exitCode = 1;
