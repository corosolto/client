import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyTeamHandMaterial, refreshTeamHands } from './vmhands.js';

const KNIFE_URL = '/models/viewmodels/coro/melee/knife-hires.glb?v=knife-motion-d-1';
const REQUIRED_CLIPS = Object.freeze(['Idle', 'Draw', 'Slash', 'Stab', 'QuickThrust', 'HeavyStab']);
const QA_SLOW_MOTION = typeof location !== 'undefined'
  && new URLSearchParams(location.search).get('meleeqa') === '1';
const ACTION_SECONDS = Object.freeze(QA_SLOW_MOTION
  ? { Draw: 2.0, Slash: 4.0, Stab: 4.0 }
  : { Draw: 0.28, Slash: 0.52, Stab: 0.52 });
// O enquadramento v12 acertou os contatos, mas ocupava tela demais. Escalar o pacote
// completo preserva rigorosamente arma, mãos, rig e câmera relativa.
const PACKAGE_SCALE = 0.0135;
const PACKAGE_OFFSET = new THREE.Vector3(0.18, -0.12, -0.25);
const STAB_PROFILES = Object.freeze({
  quick: Object.freeze({ clip: 'QuickThrust', seconds: QA_SLOW_MOTION ? 4.0 : 0.36, depth: 0 }),
  heavy: Object.freeze({ clip: 'HeavyStab', seconds: QA_SLOW_MOTION ? 5.0 : 0.62, depth: 0 }),
});
const APPROVED_GLOVE_MATERIAL = /CoroSolto_FP_Gloves/i;

function approvedGloveMaterial(material, profile) {
  if (!APPROVED_GLOVE_MATERIAL.test(material?.name || '')) return material;
  return applyTeamHandMaterial(material, profile, 'knife');
}

export class KnifeMeleeViewModel {
  constructor({ parent, profile = {}, onReady = () => {} }) {
    this.parent = parent;
    this.profile = profile;
    this.onReady = onReady;
    this.weapon = '';
    this.scene = null;
    this.packageRoot = null;
    this.mixer = null;
    this.actions = new Map();
    this.current = null;
    this.cameraFov = 32;
    this.cameraAspect = 1.5;
    this.attackMotion = null;
    this.basePosition = PACKAGE_OFFSET.clone();
    this.suspended = false;
    this.error = null;
    // Harness em Node boota o Game sem rede: sem load, a faca fica no fallback.
    if (typeof process !== 'undefined' && process.versions?.node) return;
    new GLTFLoader().load(KNIFE_URL, (gltf) => this._accept(gltf), undefined, (error) => {
      this.error = error;
      console.error('[melee-vm] faca não carregou; fallback procedural mantido', error);
      this.onReady(this);
    });
  }

  get loaded() { return !!this.scene; }
  get active() { return this.loaded && this.weapon === 'knife'; }
  get state() { return this.current?.getClip()?.name || ''; }

  fov(aspect = this.cameraAspect) {
    const actual = Number.isFinite(aspect) && aspect > 0 ? aspect : this.cameraAspect;
    return 2 * Math.atan(Math.tan(this.cameraFov * Math.PI / 360) * this.cameraAspect / actual) * 180 / Math.PI;
  }

  setProfile(profile) {
    this.profile = profile;
    const meshes = [];
    this.scene?.traverse((object) => { if (object.isMesh) meshes.push(object); });
    refreshTeamHands(meshes, profile, 'knife');
  }

  _accept(gltf) {
    const scene = gltf.scene;
    let camera = null;
    scene.traverse((object) => { if (!camera && object.isCamera) camera = object; });
    if (!camera) throw new Error('knife-hires.glb sem câmera exportada');
    const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));
    const missing = REQUIRED_CLIPS.filter((name) => !clips.has(name));
    if (missing.length) throw new Error(`knife-hires.glb sem clips: ${missing.join(', ')}`);

    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    this.cameraFov = camera.fov;
    this.cameraAspect = camera.aspect;
    scene.applyMatrix4(camera.matrixWorld.clone().invert());
    camera.removeFromParent();
    scene.traverse((object) => {
      object.frustumCulled = false;
      if (!object.isMesh) return;
      object.castShadow = false;
      object.receiveShadow = false;
      object.material = Array.isArray(object.material)
        ? object.material.map((material) => approvedGloveMaterial(material, this.profile))
        : approvedGloveMaterial(object.material, this.profile);
    });
    // A raiz recebe tracks do mixer (que restauraria a escala a cada frame):
    // o enquadramento vive no wrapper não animado, mãos e faca como unidade.
    const packageRoot = new THREE.Group();
    packageRoot.name = 'knife_melee_package';
    packageRoot.scale.setScalar(PACKAGE_SCALE);
    packageRoot.position.copy(PACKAGE_OFFSET);
    packageRoot.visible = false;
    packageRoot.add(scene);
    scene.visible = true;
    this.basePosition.copy(packageRoot.position);
    this.parent.add(packageRoot);
    this.scene = scene;
    this.packageRoot = packageRoot;
    this.mixer = new THREE.AnimationMixer(scene);
    for (const name of REQUIRED_CLIPS) this.actions.set(name, this.mixer.clipAction(clips.get(name)));
    this.mixer.addEventListener('finished', ({ action }) => {
      if (action !== this.current) return; // término de ação substituída não encerra a atual
      this.attackMotion = null;
      if (this.packageRoot) this.packageRoot.position.copy(this.basePosition);
      if (this.active) this._play('Idle');
    });
    this._play('Idle');
    this._syncVisibility();
    this.onReady(this);
  }

  _syncVisibility() {
    if (this.packageRoot) this.packageRoot.visible = this.active && !this.suspended;
  }

  _play(name, secondsOverride = null) {
    const action = this.actions.get(name);
    if (!action) return false;
    if (this.current && this.current !== action) this.current.fadeOut(0.025);
    action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
    const seconds = secondsOverride ?? ACTION_SECONDS[name];
    if (seconds) action.setDuration(seconds);
    if (name === 'Idle') action.setLoop(THREE.LoopRepeat, Infinity);
    // Sustenta a pose final durante o fade para Idle: sem clamp havia um quadro de bind pose.
    else { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
    action.fadeIn(0.025).play();
    this.current = action;
    return true;
  }

  setWeapon(id) {
    this.weapon = id;
    this._syncVisibility();
    if (this.active && !this.current) this._play('Idle');
    return this.active;
  }

  setSuspended(value) {
    this.suspended = !!value;
    this._syncVisibility();
  }

  draw() { return this.active && this._play('Draw'); }

  attack(kind = 'quick') {
    if (!this.active) return false;
    const profile = STAB_PROFILES[kind] || STAB_PROFILES.quick;
    this.attackMotion = { elapsed: 0, duration: profile.seconds, depth: profile.depth };
    return this._play(profile.clip, profile.seconds);
  }

  playState(name) { return this.active && REQUIRED_CLIPS.includes(name) && this._play(name); }

  update(dt) {
    if (this.active && !this.suspended) {
      this.mixer.update(dt);
      if (this.attackMotion) {
        const motion = this.attackMotion;
        motion.elapsed = Math.min(motion.duration, motion.elapsed + dt);
        const phase = motion.elapsed / Math.max(0.001, motion.duration);
        // Pico cedo e retorno suave: a mão leva a faca à frente, em vez de a lâmina
        // apenas rodar de lado. Movimento em -Z é avanço no espaço da câmera glTF.
        const envelope = Math.sin(Math.PI * phase) ** 1.35;
        this.packageRoot.position.copy(this.basePosition);
        this.packageRoot.position.z -= motion.depth * envelope;
        this.packageRoot.position.y += motion.depth * 0.08 * envelope;
      }
    }
  }

  dispose() {
    this.mixer?.stopAllAction();
    this.packageRoot?.removeFromParent();
    this.scene = null;
    this.packageRoot = null;
    this.actions.clear();
  }
}
