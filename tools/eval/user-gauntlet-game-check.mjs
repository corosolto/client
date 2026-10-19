#!/usr/bin/env node
/* Behavioral ruler for the 2026-10-19 user gauntlet gameplay reports.

   Usage:
     node tools/eval/user-gauntlet-game-check.mjs
     node tools/eval/user-gauntlet-game-check.mjs --mutante=<name>

   Mutants:
     character-id-avatar  UGG01: human portraits fall back to character ids
     stale-token          UGG02: an old image completion overwrites a reused cell
     omitted-round-totals UGG03: team round kills disappear before the codec
     swapped-round-totals UGG03: team round kills cross sides in transit
     nonrecursive-raycast UGG04: the camera boom tests only imported Group roots
     authored-fallback    UGG05: authored mode revives/resides legacy meshes
     hidden-weapon-art    UGG06: equipped and slot weapon art has zero bounds

   Normal mode is deliberately red until the production defects are repaired. The ruler
   executes real renderers/modules where practical; its in-memory source instrumentation
   only exposes the private portrait renderer and redirects Room's checked-out client imports.
*/
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';

const argv = process.argv.slice(2);
const MUT = (argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTS = new Set([
  'character-id-avatar', 'stale-token', 'omitted-round-totals', 'swapped-round-totals',
  'nonrecursive-raycast', 'authored-fallback', 'hidden-weapon-art',
]);
if (argv.includes('--help')) {
  console.log('Uso: node tools/eval/user-gauntlet-game-check.mjs [--mutante=<nome>]');
  console.log(`Mutantes: ${[...MUTANTS].join(', ')}`);
  process.exit(0);
}
if (MUT && !MUTANTS.has(MUT)) {
  console.error(`mutante desconhecido: ${MUT}`);
  process.exit(2);
}

const ROOT = new URL('../../', import.meta.url);
const results = [];
const record = (id, ok, evidence) => {
  const result = { id, ok: Boolean(ok), evidence };
  results.push(result);
  console.log(`${id} ${result.ok ? 'PASSA' : 'FALHA'} — ${evidence}${MUT ? ` [mutante ${MUT}]` : ''}`);
  return result;
};
const absoluteImports = (source, base, redirects = new Map()) => source.replace(
  /from\s+(['"])([^'"]+)\1/g,
  (whole, quote, specifier) => {
    if (!specifier.startsWith('.')) return whole;
    const redirected = redirects.get(specifier);
    const url = redirected || new URL(specifier, base).href;
    return `from ${quote}${url}${quote}`;
  },
);
const dataModule = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;

/* UGG01/02 — execute the real Treta Pop portrait renderer with a small DOM. */
const portraitDom = parseHTML('<html><body><div id="hud-top"><div class="tp-hud-retratos" data-lado="E"></div><div class="tp-hud-retratos" data-lado="B"></div></div></body></html>');
globalThis.window = portraitDom.window;
globalThis.document = portraitDom.document;
globalThis.HTMLElement = portraitDom.window.HTMLElement;
globalThis.MutationObserver = portraitDom.window.MutationObserver;
globalThis.location = { search: '' };
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};

const HUD_URL = new URL('public/js/tp/hud.js', ROOT);
let hudSource = readFileSync(HUD_URL, 'utf8');
hudSource = absoluteImports(hudSource, HUD_URL);
hudSource += '\nexport { atualizarRetratos as __gauntletAtualizarRetratos };\n';
const { __gauntletAtualizarRetratos: updatePortraits } = await import(dataModule(hudSource));
const queueE = document.querySelector('.tp-hud-retratos[data-lado="E"]');
const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const character = { id: 'lula' };
const human = (name, pid, def = character) => ({ name, team: 'E', alive: true, isPlayer: false, def, _playerId: pid, _netBot: false });
const bot = { name: '[BOT] Zé', team: 'E', alive: true, isPlayer: false, def: character, _playerId: '', _netBot: true };
updatePortraits({ combatants: [human('ANA', UUID_A), human('BIA', UUID_B), bot] });
let portraitSources = [...queueE.children].map((image) => image.src);
if (MUT === 'character-id-avatar') {
  portraitSources[0] = '/img/chars-hero/lula.webp';
  portraitSources[1] = '/img/chars-hero/lula.webp';
}
const avatarA = `/api/social-avatar?id=${UUID_A}`;
const avatarB = `/api/social-avatar?id=${UUID_B}`;
const avatarsByPid = portraitSources[0] === avatarA && portraitSources[1] === avatarB && portraitSources[0] !== portraitSources[1];
const botByCharacter = portraitSources[2] === '/img/chars-hero/lula.webp';
record('UGG01', avatarsByPid && botByCharacter,
  `humanos ${portraitSources.slice(0, 2).join(' | ') || 'sem retrato'} · bot ${portraitSources[2] || 'sem retrato'}`);

queueE.replaceChildren();
updatePortraits({ combatants: [human('ANA', UUID_A, { id: 'lula' })] });
const reused = queueE.firstElementChild;
const staleCompletion = reused?.onerror;
updatePortraits({ combatants: [human('BIA', UUID_B, { id: 'bolsonaro' })] });
const assignedB = reused?.src || '';
if (typeof staleCompletion === 'function') staleCompletion.call(reused, { target: reused });
if (MUT === 'stale-token' && reused) reused.src = '/img/chars/lula.webp';
const afterStale = reused?.src || '';
record('UGG02', Boolean(assignedB) && afterStale === assignedB,
  `célula B ${assignedB || 'vazia'} · após conclusão velha A ${afterStale || 'vazia'}`);

/* The remaining modules must boot in authored review mode. */
process.env.SIM_QS = '?vmauthored=1&vmready=ak,m4,pistol&vmweapon=ak,m4,pistol';
const harness = await import(new URL('tools/eval/harness.mjs', ROOT));
const { THREE, Game, initTextures, renderer, sfx, bootGame } = harness;
const codec = await import(new URL('public/js/netcodec.js', ROOT));
const { makeNetcode } = await import(new URL('public/js/netgame.js', ROOT));
const { registerPropTemplate } = await import(new URL('public/js/mapprops.js', ROOT));
const { acceptsAuthoredLoad, AUTHORED_VM_ENABLED } = await import(new URL('public/js/authoredvm.js', ROOT));
const { viewmodelVisibility } = await import(new URL('public/js/vmvisibility.js', ROOT));

/* UGG03 — real Room kill -> real binary codec -> real Netcode -> real plaque renderer. */
const ROOM_URL = new URL('../user-gauntlet-backend-20261019/game/room.js', ROOT);
const geometryStub = dataModule('export async function prepareMapPropGeometry(){ return { count: 0, bytes: 0, milliseconds: 0 }; }');
let roomSource = readFileSync(ROOM_URL, 'utf8');
const roomRedirects = new Map([['./map-prop-geometry.mjs', geometryStub]]);
roomSource = roomSource.replace(/from\s+(['"])([^'"]+)\1/g, (whole, quote, specifier) => {
  if (!specifier.startsWith('.')) return whole;
  let url;
  if (roomRedirects.has(specifier)) url = roomRedirects.get(specifier);
  else if (specifier.startsWith('../public/') || specifier.startsWith('../tools/')) url = new URL(specifier.slice(3), ROOT).href;
  else url = new URL(specifier, ROOM_URL).href;
  return `from ${quote}${url}${quote}`;
});
const { Room } = await import(dataModule(roomSource));
const room = new Room({ id: 'gauntlet-round-kills', codigo: 'UGG3', mapId: 'praca_poderes', mapas: ['praca_poderes'], teamSize: 2, maxPlayers: 4 });
room.game.state = 'live';
room.game.roundKills = { E: 0, B: 0 };
const attacker = room.game.bots.find((entity) => entity.team === 'E');
const victim = room.game.bots.find((entity) => entity.team === 'B');
if (attacker && victim) {
  attacker.alive = true;
  victim.alive = true;
  victim.hp = 100;
  room.game._kill(victim, attacker, 'ak', false);
}
const authoritative = room.snapshot();
if (MUT === 'omitted-round-totals') {
  delete authoritative.roundKillsE;
  delete authoritative.roundKillsB;
}
if (MUT === 'swapped-round-totals') {
  [authoritative.roundKillsE, authoritative.roundKillsB] = [authoritative.roundKillsB, authoritative.roundKillsE];
}
let decoded = null;
let codecError = '';
try {
  decoded = codec.decodeSnapshot(codec.encodeSnapshot(authoritative));
} catch (error) {
  codecError = error?.message || String(error);
}
const clientGame = Object.assign(Object.create(Game.prototype), {
  state: decoded?.state || 'live',
  roundsWon: { E: 0, B: 0 },
  roundKills: { E: -7, B: -9 },
  roundNum: 1,
  timeLeft: 90,
  ctf: false,
  player: { team: 'E', alive: true },
  playerTeam: 'E',
  enemyTeam: 'B',
  el: {
    scorePNum: { textContent: '' }, scoreBNum: { textContent: '' },
    crestP: { dataset: {} }, crestB: { dataset: {} },
    siglaP: { textContent: '' }, siglaB: { textContent: '' },
  },
});
if (decoded) {
  const net = {
    meta: { snapshotHz: 20, events: 1, roster: [] }, snap: decoded, prev: null, events: [],
    yourEnt: 999999, yourTeam: 'E', espectador: false, stats: { ping: 0 },
    startPing() {}, stopPing() {}, computeStats() { return {}; }, sendInput() { return 0; },
  };
  const netcode = makeNetcode(clientGame, net);
  netcode._netMap.set(-1, {});
  netcode.applySnapshot();
  netcode.dispose();
}
clientGame._plaqueta('P', 'E');
clientGame._plaqueta('B', 'B');
const roomTotals = [room.game.roundKills.E, room.game.roundKills.B];
const wireTotals = [decoded?.roundKillsE, decoded?.roundKillsB];
const clientTotals = [clientGame.roundKills.E, clientGame.roundKills.B];
const plaqueTotals = [clientGame.el.scorePNum.textContent, clientGame.el.scoreBNum.textContent];
record('UGG03', roomTotals[0] === 1 && roomTotals[1] === 0
  && wireTotals[0] === 1 && wireTotals[1] === 0
  && clientTotals[0] === 1 && clientTotals[1] === 0
  && plaqueTotals[0] === '1' && plaqueTotals[1] === '0',
`Room ${roomTotals.join(':')} · codec ${wireTotals.join(':')} · cliente ${clientTotals.join(':')} · placa ${plaqueTotals.join(':')}${codecError ? ` · codec ${codecError}` : ''}`);

/* UGG04 — register a nested imported prop and drive the real third-person boom repeatedly. */
const propTemplate = new THREE.Group();
const importedChildren = new THREE.Group();
importedChildren.name = 'gauntlet-imported-children';
importedChildren.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
propTemplate.add(importedChildren);
registerPropTemplate('bombas_combustivel', propTemplate);
const game = bootGame('posto_treta', { textures: initTextures(), bots: 0, seed: 19102026 });
game.state = 'live';
game.camView = 'third';
game.player.alive = true;
game.player.pos.set(4, 0, -2);
game.player.vel.set(0, 0, 0);
game.player.yaw = 0;
game.player.pitch = 0;
game.player.scoped = false;
game.player.crouchF = 0;
const central = game.world.root.getObjectByName('posto-ilha-bomba-central');
const importedGroup = central?.children.find((child) => !child.isMesh && child.getObjectByName('gauntlet-imported-children')) || null;
game.scene.updateMatrixWorld(true);
const eye = new THREE.Vector3(4, 1.6, -2);
const desired = new THREE.Vector3(4.28, 1.78, -0.3);
const fixtureRay = new THREE.Raycaster(eye, desired.clone().sub(eye).normalize(), 0, eye.distanceTo(desired));
const childHit = importedGroup ? fixtureRay.intersectObject(importedGroup, true)[0] : null;
if (MUT === 'nonrecursive-raycast' && importedGroup) {
  game.world.occluders = [importedGroup];
  const intersect = game.ray.intersectObjects.bind(game.ray);
  game.ray.intersectObjects = (objects) => intersect(objects, false);
}
game._ensurePlayerTP = () => {};
game.playerTP = { group: new THREE.Group(), selfMeshes: [], selfOccluded: false };
game._eyeWorld = eye.clone();
game._tpBoomClear = undefined;
const boomDistances = [], boomStates = [];
for (let frame = 0; frame < 10; frame++) {
  game._eyeWorld.copy(eye);
  Game.prototype._updatePlayerTP.call(game, 1 / 60, 0, 1.6);
  boomDistances.push(game.camera.position.distanceTo(eye));
  boomStates.push([game._tpBoomClear, game._tpBoomBlockedGrace, game._tpBoomLastBlocked]);
}
const settledBoom = boomDistances.slice(2);
const boomMax = settledBoom.length ? Math.max(...settledBoom) : Infinity;
const boomRange = settledBoom.length ? boomMax - Math.min(...settledBoom) : Infinity;
record('UGG04', Boolean(childHit) && boomMax < 1.5 && boomRange < 0.03,
  `filho importado ${childHit ? `atingido a ${childHit.distance.toFixed(3)} m` : 'sem interseção'} · boom ${boomDistances.map((n) => n.toFixed(3)).join('/')} · estados ${boomStates.map((s) => s.map((n) => Number(n).toFixed(3)).join(',')).join('/')} · oscilação ${Number.isFinite(boomRange) ? boomRange.toFixed(3) : '∞'} m`);

/* UGG07 — autorepeat de Tab não recria retratos nem dispara novas requisições de avatar. */
let scoreboardCalls = 0;
const showScoreboard = game._showScoreboard;
game._showScoreboard = () => { scoreboardCalls += 1; };
const tabEvent = (repeat) => ({ code: 'Tab', repeat, target: document.body, preventDefault() {} });
game._kd(tabEvent(false));
game._kd(tabEvent(true));
game._showScoreboard = showScoreboard;
record('UGG07', scoreboardCalls === 1, `aberturas durante keydown+autorepeat ${scoreboardCalls}`);

/* UGG08 — um bloqueio ainda detectado que recua libera o boom sem ficar preso. */
let fixtureDistance = 0.9;
game.world.occluders = [{}];
game.world.camBlockers = [];
game.ray.intersectObjects = () => [{ distance: fixtureDistance }];
game._tpBoomClear = undefined;
game._tpBoomBlockedGrace = 0;
game._eyeWorld.copy(eye);
Game.prototype._updatePlayerTP.call(game, 1 / 60, 0, 1.6);
const nearWallBoom = game._tpBoomClear;
fixtureDistance = 1.3;
for (let frame = 0; frame < 6; frame++) {
  game._eyeWorld.copy(eye);
  Game.prototype._updatePlayerTP.call(game, 1 / 60, 0, 1.6);
}
record('UGG08', game._tpBoomClear > nearWallBoom + 0.3 && game._tpBoomClear <= fixtureDistance - 0.18 + 1e-6,
  `bloqueio recuou 0,400 m · boom ${nearWallBoom.toFixed(3)}→${game._tpBoomClear.toFixed(3)} m`);

/* UGG05 — authored A->B->A never presents or keeps the legacy tree; old loads stay rejected. */
const rapidStates = [];
for (const weapon of ['ak', 'm4', 'ak']) {
  game.player.weapon = weapon;
  game._applyVmVisibility();
  rapidStates.push({
    weapon,
    fallback: Boolean(game._vmVisibility?.fallback),
    visible: Object.values(game.vm.models || {}).filter((model) => model.visible).length,
    resident: Object.values(game.vm.models || {}).filter((model) => model.parent).length,
  });
}
const staleLoadsRejected = !acceptsAuthoredLoad({ request: 1, activeRequest: 3, key: 'ak', activeKey: 'ak' })
  && !acceptsAuthoredLoad({ request: 2, activeRequest: 3, key: 'm4', activeKey: 'ak' })
  && acceptsAuthoredLoad({ request: 3, activeRequest: 3, key: 'ak', activeKey: 'ak' });
let pendingPolicy = viewmodelVisibility({ alive: true, firstPerson: true, authoredMode: true, authoredReady: false });
if (MUT === 'authored-fallback') {
  pendingPolicy = { ...pendingPolicy, fallback: true };
  if (rapidStates[0]) { rapidStates[0].fallback = true; rapidStates[0].visible = 1; rapidStates[0].resident = 1; }
}
const legacyGone = rapidStates.every((state) => !state.fallback && state.visible === 0 && state.resident === 0);
record('UGG05', AUTHORED_VM_ENABLED && !pendingPolicy.fallback && legacyGone && staleLoadsRejected,
  `modo autorado ${AUTHORED_VM_ENABLED ? 'ativo' : 'inativo'} · pending fallback=${pendingPolicy.fallback} · ${rapidStates.map((s) => `${s.weapon}[f=${+s.fallback},v=${s.visible},r=${s.resident}]`).join(' -> ')} · cargas velhas ${staleLoadsRejected ? 'rejeitadas' : 'reativadas'}`);

/* UGG06 — real HUD markup + real stylesheet, measured by Chromium before and after switch. */
function weaponHudState(weapon) {
  game.player.primary = 'ak';
  game.player.secondary = 'pistol';
  game.player.weapon = weapon;
  game._weaponHudSig = '';
  game._applyVmVisibility();
  game._updateHud();
  return {
    weapon,
    slots: game.el.weaponHud.innerHTML,
    artSrc: game.el.ammoWeaponArt.src,
    artWeapon: game.el.ammoWeaponArt.dataset.weapon,
  };
}
const weaponStates = [weaponHudState('ak'), weaponHudState('pistol')];
let artMeasurements = [];
let browserError = '';
let browser = null;
try {
  const { chromium } = await import('playwright');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1008, height: 655 } });
  const css = `${readFileSync(new URL('public/style.css', ROOT), 'utf8')}\n${readFileSync(new URL('public/css/tp/hud.css', ROOT), 'utf8')}`;
  const hide = MUT === 'hidden-weapon-art'
    ? '#ammo-weapon-art,.weapon-slot .weapon-mask{display:none!important;width:0!important;height:0!important}'
    : '';
  const first = weaponStates[0];
  await page.setContent(`<html data-ui="v3"><head><style>${css}\n${hide}\nhtml,body{width:1008px;height:655px;margin:0}#hud{display:block!important;position:relative;width:1008px;height:655px}</style></head><body><div id="hud"><div id="weapon-hud">${first.slots}</div><div id="hud-bottom-right"><img id="ammo-weapon-art" data-weapon="${first.artWeapon}" src="${first.artSrc}" alt=""></div></div></body></html>`);
  const measure = async () => page.evaluate(() => {
    const metric = (element) => {
      if (!element) return { width: 0, height: 0, display: 'missing', visibility: 'missing', opacity: 0 };
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { width: box.width, height: box.height, display: style.display, visibility: style.visibility, opacity: Number(style.opacity) };
    };
    const art = document.getElementById('ammo-weapon-art');
    return { equipped: metric(art), slot: metric(document.querySelector('.weapon-slot.on .weapon-mask')), weapon: art?.dataset.weapon || '', src: art?.getAttribute('src') || '' };
  });
  artMeasurements.push(await measure());
  const second = weaponStates[1];
  await page.evaluate((state) => {
    document.getElementById('weapon-hud').innerHTML = state.slots;
    const art = document.getElementById('ammo-weapon-art');
    art.dataset.weapon = state.artWeapon;
    art.src = state.artSrc;
  }, second);
  artMeasurements.push(await measure());
} catch (error) {
  browserError = error?.message || String(error);
} finally {
  await browser?.close();
}
const visibleBounds = (metric) => metric && metric.width > 0 && metric.height > 0
  && metric.display !== 'none' && metric.visibility !== 'hidden' && metric.opacity > 0;
const weaponArtOk = artMeasurements.length === 2 && artMeasurements.every((measurement, index) =>
  measurement.weapon === weaponStates[index].weapon
  && measurement.src.includes(`/img/weapons/${weaponStates[index].weapon}.webp`)
  && visibleBounds(measurement.equipped) && visibleBounds(measurement.slot));
record('UGG06', weaponArtOk,
  browserError || artMeasurements.map((m) => `${m.weapon}: equipado ${m.equipped.width.toFixed(0)}×${m.equipped.height.toFixed(0)} ${m.equipped.display}; slot ${m.slot.width.toFixed(0)}×${m.slot.height.toFixed(0)} ${m.slot.display}`).join(' · ') || 'Chromium não mediu a HUD');

registerPropTemplate('bombas_combustivel', null);
game.dispose?.();

const targetByMutant = {
  'character-id-avatar': 'UGG01',
  'stale-token': 'UGG02',
  'omitted-round-totals': 'UGG03',
  'swapped-round-totals': 'UGG03',
  'nonrecursive-raycast': 'UGG04',
  'authored-fallback': 'UGG05',
  'hidden-weapon-art': 'UGG06',
};
if (MUT) {
  const target = results.find((result) => result.id === targetByMutant[MUT]);
  const detected = target && !target.ok;
  console.log(detected
    ? `MUTANTE ${MUT} DETECTADO — ${target.id} ficou vermelho`
    : `MUTANTE ${MUT} NÃO DETECTADO — ${target?.id || 'cláusula ausente'} não mordeu`);
  process.exitCode = detected ? 0 : 1;
} else {
  const failures = results.filter((result) => !result.ok);
  console.log(`USER-GAUNTLET-GAME ${failures.length ? 'REPROVADO' : 'APROVADO'} — ${results.length - failures.length}/${results.length} cláusulas`);
  process.exitCode = failures.length ? 1 : 0;
}
