import * as THREE from 'three';
import { CHARACTERS, charWeapon } from './characters.js';
import { buildCharacterModel, hasModel, preloadCharacterAssets } from './glbchars.js';
import { criaRenderer } from './glcontext.js';

/* Um por facção, e a facção manda: sem a entrada, o `|| .E` abaixo mostrava GOTINHA
   para quem escolheu MÍTICO. Régua no `eval:miticos-lobisomem` (mutante `loading`). */
export const LOADING_CHARACTER_IDS = Object.freeze({
  E: 'gotinha',
  B: 'canarinho',
  U: 'blackmetal',
  C: 'bonzo',
  F: 'mandrake',
  M: 'lobisomem',
});

export const LOADING_ACTIONS = Object.freeze([
  { name: 'run', seconds: 1.6, moving: 1, speed: 2.08 },
  { name: 'ready', seconds: 0.8, moving: 0, speed: 0 },
  { name: 'shoot', seconds: 1.2, moving: 0, speed: 0 },
  { name: 'crouch', seconds: 1.1, moving: 0, speed: 0, crouch: true },
  { name: 'crouchwalk', seconds: 1.5, moving: 1, speed: 0.75, crouch: true },
  { name: 'jump', seconds: 1.2, moving: 0, speed: 0 },
  { name: 'walkfire', seconds: 1.6, moving: 1, speed: 0.84 },
]);

const ACTION_LABEL = Object.freeze({
  run: 'CORRIDA', ready: 'PRONTO', shoot: 'TIRO', crouch: 'AGACHADO',
  crouchwalk: 'AVANÇO BAIXO', jump: 'SALTO', walkfire: 'FOGO EM MOVIMENTO',
});
const CYCLE_SECONDS = LOADING_ACTIONS.reduce((sum, action) => sum + action.seconds, 0);

function actionAt(seconds) {
  let cursor = ((seconds % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS;
  for (const action of LOADING_ACTIONS) {
    if (cursor < action.seconds) return action;
    cursor -= action.seconds;
  }
  return LOADING_ACTIONS[0];
}

export class LoadingCharacterStage {
  constructor(canvas, { compatibility = false } = {}) {
    this.canvas = canvas;
    this.active = false;
    this.elapsed = 0;
    this.token = 0;
    this.cache = new Map();
    this.current = null;
    this.ctrl = null;
    this.currentAction = null;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer = canvas ? criaRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: true },
      { compatibility, optional: true },
    ) : null;
    if (!this.renderer) return;

    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compatibility ? 1 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 0.75, 0.1, 20);
    this.camera.position.set(0.12, 1.08, 3.9);
    this.camera.lookAt(0, 0.92, 0);
    this.scene.add(new THREE.HemisphereLight(0xfff4df, 0x172318, 2.2));
    const key = new THREE.DirectionalLight(0xffe0b0, 3.1);
    key.position.set(-2.8, 4.5, 4.2);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xb4ff48, 2.4);
    rim.position.set(3.2, 2.8, -2.5);
    this.scene.add(rim);
  }

  async show(faction) {
    this.active = true;
    this.elapsed = 0;
    this.currentAction = null;
    const token = ++this.token;
    const id = LOADING_CHARACTER_IDS[faction] || LOADING_CHARACTER_IDS.E;
    this.canvas.dataset.character = id;
    this.canvas.dataset.ready = '0';
    if (!this.renderer) return;
    if (!this.cache.has(id)) {
      /* Só a arma DESTE preview: sem a lista, o bootstrap puxava as 26 antes de a partida
         existir — 7,5 MB e ~164 MB de VRAM na tela de carregamento. Régua: ARM1. */
      await preloadCharacterAssets([id], { weapons: [charWeapon(id)] });
      if (token !== this.token || !this.active) return;
      const def = CHARACTERS.find((character) => character.id === id);
      const built = def && hasModel(id)
        ? buildCharacterModel(def, { weaponId: charWeapon(id), preview: true }) : null;
      if (!built) {
        this.canvas.dataset.error = 'modelo-ausente';
        return;
      }
      built.group.rotation.y = 0.42;
      this.cache.set(id, built);
    }
    if (token !== this.token || !this.active) return;
    if (this.current) this.scene.remove(this.current.group);
    this.current = this.cache.get(id);
    this.ctrl = this.current.ctrl;
    this.scene.add(this.current.group);
    this.canvas.dataset.ready = '1';
  }

  hide() {
    this.active = false;
    this.token++;
    if (this.canvas) { this.canvas.dataset.action = ''; this.canvas.dataset.clip = ''; }
  }

  _enter(action) {
    if (!this.ctrl) return;
    this.ctrl.setCrouch(!!action.crouch);
    if (action.name === 'shoot' || action.name === 'walkfire') this.ctrl.shoot();
    if (action.name === 'jump') this.ctrl.jump();
    this.currentAction = action.name;
    this.canvas.dataset.action = action.name;
    const label = document.getElementById('load-character-action');
    if (label) label.textContent = ACTION_LABEL[action.name] || action.name.toUpperCase();
  }

  _resize() {
    const width = Math.max(1, Math.round(this.canvas.clientWidth));
    const height = Math.max(1, Math.round(this.canvas.clientHeight));
    const dpr = this.renderer.getPixelRatio();
    if (this.canvas.width === Math.round(width * dpr) && this.canvas.height === Math.round(height * dpr)) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(dt) {
    if (!this.active || !this.renderer || !this.ctrl) return;
    this._resize();
    this.elapsed += Math.min(dt, 0.05);
    const action = this.reducedMotion
      ? LOADING_ACTIONS.find((item) => item.name === 'ready')
      : actionAt(this.elapsed);
    if (action.name !== this.currentAction) this._enter(action);
    const moving = action.moving || 0;
    const speed = action.speed || 0;
    const hasTarget = ['ready', 'shoot', 'walkfire', 'crouch', 'crouchwalk'].includes(action.name);
    this.ctrl.update(dt, moving, hasTarget, speed);
    this.canvas.dataset.clip = Object.entries(this.ctrl.actions).find(([, clip]) => clip === this.ctrl.cur)?.[0] || '';
    this.renderer.render(this.scene, this.camera);
  }
}
