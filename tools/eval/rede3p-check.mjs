/* Snapshot binário -> Netcode -> CharController e rig/clipes reais, sem browser.
   Só a decodificação de pixels é substituída; nenhuma saída de animação usa spy. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { THREE, bootGame, initTextures, CHARACTERS } from './harness.mjs';
import { encodeSnapshot, decodeSnapshot } from '../../public/js/netcodec.js';
// O harness instala o resolvedor vendorizado antes deste import; import estático pegaria outro THREE.
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');

const root = fileURLToPath(new URL('../../', import.meta.url));
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1] || '';
const mutations = {
  'sem-crouch': ['ctrl.setCrouch?.(b.alive && !!b._netCrouch);', 'ctrl.setCrouch?.(false);'],
  'reload-reinicia': ['restante > 0 && !b._netReloadActive', 'restante > 0'],
  'reload-nao-cancela': ['restante === 0 && b._netReloadActive', 'false'],
  'reload-perde-ciclo': ['if (novoCicloReload) ent._netReloadActive = false;', 'if (false) ent._netReloadActive = false;'],
  'fase-zero': ['info.laco ? elapsed % info.dur : elapsed', '0'],
  'rampa-reinicia': ['else ctrl.emote?.(info.id, info.laco ? elapsed % info.dur : elapsed);', 'else { ctrl._emoteK = 0; ctrl.emote?.(info.id, info.laco ? elapsed % info.dur : elapsed); }'],
  'stop-ignorado': ['ctrl.pararEmote?.(); b._netEmoteAppliedTick = null;', 'b._netEmoteAppliedTick = null;'],
  'import-ressuscita': ['b._netEmoteLoading = false;', "b._netEmoteLoading = false; ctrl.emote?.('frevo', 0);"],
  'troca-sem-estado': ['const novo = b._netVisualCtrl !== ctrl;', 'const novo = false;'],
  'intencao-ausente': ['emote: V9_EMOTES.has(this.game._emoteAtual) ? this.game._emoteAtual : null,', 'emote: null,'],
  'emote-local-vaza': ['emote: V9_EMOTES.has(this.game._emoteAtual) ? this.game._emoteAtual : null,', 'emote: this.game._emoteAtual || null,'],
  'estado-antigo': ['if (estadoNovo) {', 'if (true) {'],
  'pausa-para-emote': ['emote: V9_EMOTES.has(game._emoteAtual) ? game._emoteAtual : null,', 'emote: null,'],
  'pausa-local-vaza': ['emote: V9_EMOTES.has(game._emoteAtual) ? game._emoteAtual : null,', 'emote: game._emoteAtual || null,'],
};
assert(!mutant || mutations[mutant], 'mutante conhecido');
let netUrl = new URL('../../public/js/netgame.js', import.meta.url).href;
if (mutant) {
  let source = readFileSync(new URL(netUrl), 'utf8');
  const [before, after] = mutations[mutant];
  assert.equal(source.split(before).length, 2, 'INFRA: alvo de mutação único');
  source = source.replace(before, after).replace(/from\s+(['"])([^'"]+)\1/g, (_, q, spec) =>
    'from ' + JSON.stringify(spec.startsWith('.') ? new URL(spec, netUrl).href : import.meta.resolve(spec)));
  netUrl = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
}
const { makeNetcode } = await import(netUrl);
const G = await import('../../public/js/glbchars.js');
const asset = url => path.join(root, 'public', String(url).split('?')[0].replace(/^\//, ''));
globalThis.fetch = async url => {
  try { return new Response(readFileSync(asset(url))); } catch { return new Response('', { status: 404 }); }
};
const originalLoad = GLTFLoader.prototype.load;
GLTFLoader.prototype.load = function(url, done, progress, fail) {
  const loader = new GLTFLoader();
  loader.register(() => ({ name: 'EXT_texture_webp', async loadTexture() {
    return new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  } }));
  Promise.resolve().then(async () => {
    const bytes = readFileSync(asset(url));
    done(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''));
  }).catch(error => fail?.(error));
};
await G.preloadCharacterAssets(['senador'], { weapons: [] });
GLTFLoader.prototype.load = originalLoad;
assert(G.hasModel('senador'), 'INFRA: rig real não carregou');
const def = CHARACTERS.find(c => c.id === 'senador');
const model = () => {
  const mesh = G.buildCharacterModel(def, { weaponId: 'ak' });
  assert(mesh?.ctrl && mesh.isGLB, 'INFRA: sem CharController real');
  return mesh;
};
const game = bootGame('corrego', { textures: initTextures(), bots: 1, seed: 933 });
game.state = 'live'; game.online = true;
const b = game.bots[0]; b.mesh = model(); b.weapon = b._meshWeapon = 'ak';
const inputs = [];
const net = { meta: { snapshotHz: 20, events: true }, events: [], yourEnt: 1,
  startPing() {}, stopPing() {}, sendInput(input) { inputs.push(input); return 0; } };
const mp = makeNetcode(game, net);
// O relógio desta prova avança por frame; o pulso de telemetria de parede não participa.
clearInterval(mp._nsTimer); mp._nsTimer = null;
mp._netMap.set(2, b);
let now = 1000, tick = 0;
mp._now = () => now;
const rows = [];
const check = (id, pass, observed = null) => rows.push({ id, pass: !!pass, observed });
const frame = (dt = 1 / 60) => { now += dt * 1000; mp.updateRemoteBot(b, dt); };
const frames = n => { for (let i = 0; i < n; i++) frame(); };
const send = (fields = {}, version = 9, serverTime = now / 1000) => {
  const snap = { type: 'snapshot', room: 'rede3p', tick: ++tick, t: serverTime,
    state: 'live', owner: '', players: 2, spectators: 0, livre: { E: 0, B: 0 },
    timeLeft: 300, roundNum: game.roundNum, scoreE: 0, scoreB: 0, roundKillsE: 0, roundKillsB: 0,
    ents: [{ id: 2, name: 'REMOTO', team: 'B', bot: false, alive: true,
      x: 0, y: 0, z: 0, yaw: 0, pitch: 0, hp: 100, weapon: 'ak', k: 0, d: 0,
      respawnIn: 0, killedBy: '', reloadIn: 0, emote: null, emoteElapsed: 0, ...fields }] };
  net.snap = decodeSnapshot(encodeSnapshot(snap, version));
  mp.applySnapshot();
};
const headY = () => { b.mesh.group.updateMatrixWorld(true); return b.mesh.ctrl.headBone.getWorldPosition(new THREE.Vector3()).y; };
const bonePose = () => b.mesh.ctrl.corpo.get('RightUpLeg').quaternion.clone();
try {
  check('R3P0', !G.temEmoteDriver(), 'coreografia não entrou no boot do arnês');
  send(); frames(30); const standingY = headY();
  send({ crouch: true }); frames(30);
  check('R3P1', b.mesh.ctrl.curName === 'crouch' && headY() < standingY - .02,
    { clip: b.mesh.ctrl.curName, queda: standingY - headY() });
  send({ crouch: false }); frames(15);
  check('R3P1b', b.mesh.ctrl.curName === 'idle' && !b.mesh.ctrl.crouch);

  send({ reloadIn: 2 }); frames(12);
  const reloadTime = b.mesh.ctrl._reloadT, reloadWeight = b.mesh.ctrl.reloadK;
  send({ reloadIn: 1.8 });
  check('R3P2', reloadTime > .15 && b.mesh.ctrl._reloadT === reloadTime && reloadWeight > .1,
    { antes: reloadTime, depois: b.mesh.ctrl._reloadT, peso: reloadWeight });
  send();
  check('R3P3', b.mesh.ctrl._reloadDur === 0 && b.mesh.ctrl.reloadK === 0);

  // Os snapshots de troca para faca/volta à AK (reloadIn=0) se perderam.
  // A mesma arma e o mesmo controller recebem positivo -> positivo de OUTRO ciclo.
  send({ reloadIn: 1 }); frames(24);
  const cycleCtrl = b.mesh.ctrl, oldCycleTime = cycleCtrl._reloadT;
  send({ reloadIn: 2 });
  const restartedCycle = cycleCtrl._reloadT === 0 && cycleCtrl._reloadDur > 1.9;
  frames(45);
  check('R3P17', b.mesh.ctrl === cycleCtrl && b.weapon === 'ak' && oldCycleTime > .3
    && restartedCycle && cycleCtrl._reloadDur > 0 && cycleCtrl.reloadK > .1,
    { reiniciou: restartedCycle, dur: cycleCtrl._reloadDur, peso: cycleCtrl.reloadK });
  send();

  // O fim autoritativo oscila até um décimo pela quantização; chegada atrasada
  // não altera o ciclo. O tick continua fresco mesmo quando o Game.t reinicia.
  send({ reloadIn: 2 }, 9, 50); frames(3);
  let preservedCycle = true;
  for (const [serverTime, remaining, delay] of [[50.04, 1.96, 180], [50.09, 1.91, 5], [50.14, 1.86, 120], [0, 1.8, 10], [.04, 1.76, 90]]) {
    const before = b.mesh.ctrl._reloadT;
    now += delay;
    send({ reloadIn: remaining }, 9, serverTime);
    preservedCycle &&= b.mesh.ctrl._reloadT === before;
    frames(2);
  }
  check('R3P18', preservedCycle && b.mesh.ctrl._reloadT > .2 && b.mesh.ctrl.reloadK > .1,
    { preservou: preservedCycle, fase: b.mesh.ctrl._reloadT, peso: b.mesh.ctrl.reloadK });
  send();

  // Import pendente, depois stop: resolver o módulo não pode recolocar a dança.
  const load = game._emoteMods.bind(game);
  let release;
  game._emoteMods = () => new Promise(resolve => { release = async () => resolve(await load()); });
  send({ emote: 'frevo', emoteElapsed: .7 });
  check('R3P4lazy', !G.temEmoteDriver() && b._netEmoteLoading);
  send();
  await release(); await Promise.resolve(); await Promise.resolve();
  check('R3P4race', b.mesh.ctrl.emoteAtual() === null);
  game._emoteMods = load;
  frame();
  send({ emote: 'frevo', emoteElapsed: .7 });
  check('R3P4', Math.abs(b.mesh.ctrl._emoteT - .7) < .001, b.mesh.ctrl._emoteT);
  frames(30); const pose = bonePose(), weight = b.mesh.ctrl._emoteK;
  send({ emote: 'frevo', emoteElapsed: .1 });
  check('R3P5', weight > .9 && b.mesh.ctrl._emoteK === weight, { antes: weight, depois: b.mesh.ctrl._emoteK });
  frames(12);
  check('R3P6', b.mesh.ctrl.emoteAtual() === 'frevo' && pose.angleTo(bonePose()) > .01,
    { angulo: pose.angleTo(bonePose()), fase: b.mesh.ctrl._emoteT });
  send(); frames(90);
  check('R3P7', b.mesh.ctrl.emoteAtual() === null && !b.mesh.ctrl.emotando && b.mesh.ctrl._emoteK === 0);

  send({ emote: 'salve', emoteElapsed: 1.1 }); frames(20);
  check('R3P8', b.mesh.ctrl.emoteAtual() === null, b.mesh.ctrl._emoteT);
  send({ crouch: true, reloadIn: 2, emote: 'frevo', emoteElapsed: .5 }); frames(10);
  b.mesh = model(); frame();
  check('R3P9', b.mesh.ctrl.crouch && b.mesh.ctrl._reloadDur > 1 && b.mesh.ctrl.emoteAtual() === 'frevo'
    && b.mesh.ctrl._emoteT > .5, { dur: b.mesh.ctrl._reloadDur, fase: b.mesh.ctrl._emoteT });
  send({ alive: false, hp: 0, crouch: true, reloadIn: 2, emote: 'frevo' }); frame();
  check('R3P10', b.mesh.ctrl.dead && b.mesh.ctrl._reloadDur === 0 && !b.mesh.ctrl.crouch && b.mesh.ctrl.emoteAtual() === null);
  send({ reloadIn: 1, emote: 'samba', emoteElapsed: .4 }); frame();
  check('R3P11', !b.mesh.ctrl.dead && b.mesh.ctrl._reloadDur > .9 && b.mesh.ctrl.emoteAtual() === 'samba');
  send({ crouch: true, reloadIn: 2, emote: 'frevo' }, 8); frames(90);
  check('R3P12', !b.mesh.ctrl.crouch && b.mesh.ctrl._reloadDur === 0 && b.mesh.ctrl.emoteAtual() === null);

  // Datagrama antigo chega depois do stop: a posição pode entrar no buffer, a ação não volta.
  send({ crouch: true, reloadIn: 2, emote: 'frevo', emoteElapsed: .5 });
  const atrasado = net.snap;
  frames(4); send(); const tickAtual = net.snap.tick; frames(90);
  net.snap = atrasado; mp.applySnapshot(); frame();
  check('R3P14', !b.mesh.ctrl.crouch && b.mesh.ctrl._reloadDur === 0
    && b.mesh.ctrl.emoteAtual() === null && b._netStateTick === tickAtual,
    { tick: b._netStateTick, atual: tickAtual, crouch: b.mesh.ctrl.crouch, emote: b.mesh.ctrl.emoteAtual() });
  send({ crouch: true, reloadIn: 2, emote: 'frevo' });
  net.snap = decodeSnapshot(encodeSnapshot({ ...net.snap, tick: ++tick, t: 0, ents: [{ ...net.snap.ents[0], emote: 'samba' }] }, 9));
  mp.applySnapshot(); frame();
  check('R3P15', b._netStateTick === tick && b.mesh.ctrl.crouch
    && b.mesh.ctrl.emoteAtual() === 'samba', 'tempo do Game reinicia, tick da Room continua');

  const input = { ax: 0, az: 0, crouch: false, shift: false, jump: false };
  game._emoteAtual = 'samba'; mp.stepPlayer(game.player, input, 1 / 60);
  game._emoteAtual = 'capoeira'; mp.stepPlayer(game.player, input, 1 / 60);
  game._emoteAtual = null; mp.stepPlayer(game.player, input, 1 / 60);
  check('R3P13', inputs.at(-3)?.emote === 'samba' && inputs.at(-2)?.emote === null && inputs.at(-1)?.emote === null,
    inputs.slice(-3).map(i => i.emote));
  game.paused = true; game._emoteAtual = 'samba'; mp._inputAt = 0;
  mp._pulsoDePausa();
  const sambaPausado = inputs.at(-1)?.emote;
  game._emoteAtual = 'capoeira'; mp._inputAt = 0;
  mp._pulsoDePausa();
  check('R3P16', sambaPausado === 'samba' && inputs.at(-1)?.emote === null,
    { v9: sambaPausado, captura: inputs.at(-1)?.emote });
  game.paused = false; game._emoteAtual = null;
} finally { mp.dispose(); }
for (const row of rows) console.log(`${row.id} ${row.pass ? 'PASSA' : 'FALHA'} ${JSON.stringify(row.observed)}`);
const failed = rows.filter(row => !row.pass).map(row => row.id);
console.log('REDE3P_RESULT ' + JSON.stringify({ mutant, failed, clauses: rows.length }));
if (failed.length) process.exitCode = 1;
