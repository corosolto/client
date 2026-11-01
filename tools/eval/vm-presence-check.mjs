#!/usr/bin/env node
// Relato de 31/10: AWP equipada sem malha no mobile. Executa o Game de produção,
// inclusive construção e apresentação, com todos os assets de rede indisponíveis.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Game, THREE, renderer, initTextures, sfx, CHARACTERS, PCHAR } from './harness.mjs';
import { WEAPON_IDS } from '../../public/js/weapons.js';
import { probeSelectedWeapon } from './selected-weapon-probe.mjs';

const mutation = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1];
const mutations = ['raiz-vazia', 'fallback-oculto', 'fallback-duplo', 'fora-do-quadro', 'malha-alheia', 'mobile-legado', 'cano-lateral'];
if (mutation && !mutations.includes(mutation)) throw new Error(`mutante desconhecido: ${mutation}`);
const errors = [];
let samples = 0;
const check = (ok, id, detail) => { samples++; if (!ok) errors.push(`${id}: ${detail}`); };
const meshes = (root) => {
  let count = 0;
  root.traverseVisible((node) => { if (node.isMesh && node.geometry?.attributes.position?.count) count++; });
  return count;
};
const inFrame = (game) => {
  const selected = game.vm.models[game.player.weapon];
  if (!selected?.visible || !game.vm.root.visible) return false;
  game.vmCamera.updateProjectionMatrix();
  game.vmCamera.updateMatrixWorld(true);
  game.vm.root.updateWorldMatrix(true, true);
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4()
    .multiplyMatrices(game.vmCamera.projectionMatrix, game.vmCamera.matrixWorldInverse));
  let visible = false;
  selected.traverseVisible((node) => {
    if (node.isMesh && node.geometry?.attributes.position?.count && frustum.intersectsObject(node)) visible = true;
  });
  return visible;
};
const def = CHARACTERS.find((character) => character.id === PCHAR);
const textures = initTextures();
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
GLTFLoader.prototype.load = () => {};
// O harness não tem elementos de toque; só a ligação dos eventos fica stubada.
Game.prototype._touchControls = () => {};
for (const mobile of [true, false]) {
  const game = new Game({ renderer, textures, sfx, mobile,
    settings: { bots: 0, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: def.id, playerTeam: 'E', playerFaction: def.team, enemyFaction: 'B',
    nickname: 'SIM', mapId: 'piscina_treta', testMode: false, onQuit() {}, onMatchEnd() {} });
  game.player.alive = true;
  game.camView = 'first';
  if (mutation === 'mobile-legado' && mobile) { game.vm.authored?.dispose(); game.vm.authored = null; }
  check(!!game.vm.authored, 'VMP10', `${mobile ? 'mobile' : 'desktop'}: controlador com mãos habilitado`);
  game.vm.melee?.dispose();
  game.vm.melee = null;
  game.vm.authored?.dispose();
  game.vm.authored = null;
  if (mutation === 'fora-do-quadro') game.vm.root.position.x = 10000;
  if (mutation === 'malha-alheia') {
    game.vm.root.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial()));
    const sync = game._syncVmPresentation;
    game._syncVmPresentation = function (...args) {
      const state = sync.apply(this, args);
      if (this.vm.models[this.player.weapon]) this.vm.models[this.player.weapon].visible = false;
      return state;
    };
  }
  if (mutation === 'raiz-vazia') {
    const build = game._buildViewModels;
    game._buildViewModels = function (...args) {
      const vm = build.apply(this, args);
      vm.root.clear(); vm.models = Object.create(null);
      return vm;
    };
    game.vm.root.clear(); game.vm.models = Object.create(null);
  }
  if (mutation === 'fallback-oculto' || mutation === 'fallback-duplo') {
    const sync = game._syncVmPresentation;
    game._syncVmPresentation = function (...args) {
      const state = sync.apply(this, args);
      for (const [id, model] of Object.entries(this.vm.models)) {
        if (mutation === 'fallback-oculto') model.visible = false;
        else if (state.authored && id === this.player.weapon) model.visible = true;
      }
      return state;
    };
  }
  for (const [width, height] of [[844, 390], [1440, 960], [1920, 1080]]) {
    game.camera.aspect = game.vmCamera.aspect = width / height;
    for (const weapon of WEAPON_IDS) {
      game.player.weapon = weapon;
      game._applyVmVisibility();
      const label = `${mobile ? 'mobile' : 'desktop'} ${width}x${height} ${weapon}`;
      check(game._vmVisibility.fallback && probeSelectedWeapon({ game }).meshes > 0, 'VMP1', label);
      check(inFrame(game), 'VMP9', `${label}: malha dentro do quadro`);
      check(Object.values(game.vm.models).filter((model) => model.visible).length === 1,
        'VMP2', `${label}: exatamente uma arma alternativa`);
      game._syncVmPresentation(true, 1);
      check(meshes(game.vm.root) === 0, 'VMP3', `${label}: luneta cobre a arma`);
      game._syncVmPresentation(true, 0);
      check(probeSelectedWeapon({ game }).meshes > 0, 'VMP4', `${label}: sai da luneta com arma`);
    }
  }
  game.player.weapon = 'awp';
  const authoredRoot = new THREE.Group();
  authoredRoot.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), new THREE.MeshBasicMaterial()));
  game.vm.root.add(authoredRoot);
  game.vm.authored = { setWeapon(weapon) { this.weapon = weapon; authoredRoot.visible = true; return true; },
    entry: () => ({ mount: authoredRoot, weaponMeshes: authoredRoot.children }),
    muzzleVm: () => new THREE.Vector3(0.8, -0.3, -8),
    fov: () => 62, utilityReady: () => false, dispose() {} };
  game._applyVmVisibility();
  check(game._vmVisibility.authored && authoredRoot.visible && probeSelectedWeapon({ game }).meshes > 0
    && !Object.values(game.vm.models).some((model) => model.visible),
  'VMP5', `${mobile}: autorado pronto substitui alternativa sem duplicação`);
  game.camera.updateMatrixWorld(true);
  game.vmCamera.updateMatrixWorld(true);
  if (mutation === 'cano-lateral') {
    const muzzle = game._muzzleWorld;
    game._muzzleWorld = function (...args) {
      const cam = this.camera.getWorldPosition(new THREE.Vector3());
      return muzzle.apply(this, args).sub(cam).multiplyScalar(8).add(cam);
    };
  }
  const expectedMuzzle = game.vm.authored.muzzleVm().project(game.vmCamera);
  const consultar = game._consultarTiro, tracer = game._tracer;
  let traceStart;
  game._consultarTiro = () => null;
  game._tracer = (from) => { traceStart = from.clone().project(game.camera); };
  game._fireHitscan(game.player, game._aimOrigin(new THREE.Vector3()),
    game.camera.getWorldDirection(new THREE.Vector3()), 1, true, 'AWP', 'awp', true);
  const muzzlePixelError = traceStart ? Math.hypot((traceStart.x - expectedMuzzle.x) * 960,
    (traceStart.y - expectedMuzzle.y) * 540) : Infinity;
  check(muzzlePixelError <= 1, 'VMP11', `${mobile}: traçante desviado ${muzzlePixelError.toFixed(2)} px do cano`);
  game._consultarTiro = consultar; game._tracer = tracer;
  authoredRoot.visible = false;
  game.vm.authored.setWeapon = () => false;
  game._applyVmVisibility();
  check(game._vmVisibility.fallback && probeSelectedWeapon({ game }).meshes > 0,
    'VMP6', `${mobile}: falha do autorado mantém arma`);
  for (const mode of ['dead', 'third']) {
    game.player.alive = mode !== 'dead'; game.camView = mode === 'third' ? 'third' : 'first';
    game._syncVmPresentation();
    check(meshes(game.vm.root) === 0, 'VMP7', `${mobile}: ${mode} oculta primeira pessoa`);
  }
  game._disposed = true;
  game.dispose();
}
if (process.argv.includes('--mutantes') && !errors.length) {
  for (const name of mutations) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--mutante=${name}`],
      { encoding: 'utf8', timeout: 60000 });
    check(result.status === 1 && /VMP(?:1[01]|[1259]):/.test(result.stdout), 'VMP8', `mutante ${name} detectado`);
  }
}
console.log(JSON.stringify({ ok: errors.length === 0, samples, mutation: mutation || null, errors: errors.slice(0, 12), failures: errors.length }));
if (errors.length) process.exitCode = 1;
