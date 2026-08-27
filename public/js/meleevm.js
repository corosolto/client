import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const KNIFE_URL = '/models/viewmodels/coro/melee/knife-hires.glb?v=knife-pilot-12';
const REQUIRED_CLIPS = Object.freeze(['Idle', 'Draw', 'Slash', 'Stab']);
const QA_SLOW_MOTION = typeof location !== 'undefined'
  && new URLSearchParams(location.search).get('meleeqa') === '1';
const ACTION_SECONDS = Object.freeze(QA_SLOW_MOTION
  ? { Draw: 2.0, Slash: 4.0, Stab: 4.0 }
  : { Draw: 0.28, Slash: 0.52, Stab: 0.52 });
// The approved pistol hand rig is authored in Blender centimetres. Its own
// runtime contract normalizes the complete package after camera-space
// registration. The longer knife uses a smaller package scale so its tip and
// both hands stay inside the HUD-safe 1.6 composition at every action peak.
const PACKAGE_SCALE = 0.0265;
const PACKAGE_OFFSET = new THREE.Vector3(0.18, -0.12, 0);
const APPROVED_GLOVE_MATERIAL = /CoroSolto_FP_Gloves/i;
const CHARACTER_TEXTURES = new Map();

const colorCss = (value, fallback) => `#${new THREE.Color(value ?? fallback).getHexString()}`;

// Same procedural treatment as pistol-pilot-14. The melee package reuses the
// same mesh, UVs, roughness response and player palette; only the exposure
// compensation, weapon and four melee actions differ.
function characterGloveTexture(profile, donorMap = null) {
  if (typeof document === 'undefined') return null;
  const key = `${profile.id || 'player'}:glove:${profile.skin}:${profile.sleeve}:${profile.accent}`;
  if (CHARACTER_TEXTURES.has(key)) return CHARACTER_TEXTURES.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const sleeve = colorCss(profile.sleeve, 0x27364a);
  const accent = colorCss(profile.accent, 0xb02b36);
  const gradient = context.createLinearGradient(0, 0, 128, 128);
  gradient.addColorStop(0, sleeve);
  gradient.addColorStop(0.52, sleeve);
  gradient.addColorStop(1, accent);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const donorImage = donorMap?.image;
  if (donorImage) {
    try {
      const relief = document.createElement('canvas');
      relief.width = relief.height = 128;
      const reliefContext = relief.getContext('2d');
      reliefContext.drawImage(donorImage, 0, 0, 128, 128);
      const pixels = reliefContext.getImageData(0, 0, 128, 128);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const luminance = (pixels.data[i] * 0.2126 + pixels.data[i + 1] * 0.7152
          + pixels.data[i + 2] * 0.0722) / 255;
        const reliefValue = Math.round(150 + luminance * 105);
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = reliefValue;
      }
      reliefContext.putImageData(pixels, 0, 0);
      context.save();
      context.globalCompositeOperation = 'multiply';
      context.globalAlpha = 0.72;
      context.drawImage(relief, 0, 0);
      context.restore();
    } catch { /* Same independent fallback used by pistol-pilot-14. */ }
  }
  context.globalAlpha = 0.38;
  context.fillStyle = accent;
  for (let x = -96; x < 192; x += 38) {
    context.beginPath(); context.moveTo(x, 128); context.lineTo(x + 24, 128);
    context.lineTo(x + 104, 0); context.lineTo(x + 80, 0); context.closePath(); context.fill();
  }
  context.globalAlpha = 0.28;
  context.strokeStyle = '#10151b'; context.lineWidth = 3;
  for (let y = 12; y < 128; y += 24) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(128, y + 5); context.stroke();
  }
  context.globalAlpha = 0.13;
  context.fillStyle = '#ffffff';
  for (let y = 0; y < 128; y += 4) {
    for (let x = (y / 4) % 2; x < 128; x += 8) context.fillRect(x, y, 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `coro_character_hand_${profile.id || 'player'}_glove`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.userData.coroCharacterTexture = true;
  CHARACTER_TEXTURES.set(key, texture);
  return texture;
}

function approvedGloveMaterial(material, profile) {
  if (!APPROVED_GLOVE_MATERIAL.test(material?.name || '')) return material;
  const copy = material.clone();
  const sleeve = new THREE.Color(profile.sleeve ?? 0x27364a).multiplyScalar(0.72);
  const donorMap = material.map;
  copy.map = null;
  copy.map = characterGloveTexture(profile, donorMap);
  // This older runtime branch uses a substantially brighter viewmodel rig than
  // pistol-pilot-14. Compensate in linear space so the browser result retains
  // the approved dark-leather value and finger/cuff separation instead of red
  // clipping, while the texture and hue still come from the same contract.
  copy.color.copy(sleeve).multiplyScalar(0.38);
  copy.roughness = Math.max(0.74, copy.roughness ?? 1);
  copy.metalness = 0;
  copy.needsUpdate = true;
  return copy;
}

export class KnifeMeleeViewModel {
  constructor({ parent, profile = {}, onReady = () => {} }) {
    this.parent = parent;
    this.profile = profile;
    this.onReady = onReady;
    this.weapon = '';
    this.scene = null;
    this.mixer = null;
    this.actions = new Map();
    this.current = null;
    this.cameraFov = 32;
    this.attackIndex = 0;
    this.suspended = false;
    this.error = null;
    new GLTFLoader().load(KNIFE_URL, (gltf) => this._accept(gltf), undefined, (error) => {
      this.error = error;
      console.error('[melee-vm] faca não carregou; fallback procedural mantido', error);
      this.onReady(this);
    });
  }

  get loaded() { return !!this.scene; }
  get active() { return this.loaded && this.weapon === 'knife'; }
  get state() { return this.current?.getClip()?.name || ''; }

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
    scene.applyMatrix4(camera.matrixWorld.clone().invert());
    scene.applyMatrix4(new THREE.Matrix4().makeScale(PACKAGE_SCALE, PACKAGE_SCALE, PACKAGE_SCALE));
    scene.position.add(PACKAGE_OFFSET);
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
    scene.visible = false;
    this.parent.add(scene);
    this.scene = scene;
    this.mixer = new THREE.AnimationMixer(scene);
    for (const name of REQUIRED_CLIPS) this.actions.set(name, this.mixer.clipAction(clips.get(name)));
    this.mixer.addEventListener('finished', () => { if (this.active) this._play('Idle'); });
    this._play('Idle');
    this._syncVisibility();
    this.onReady(this);
  }

  _syncVisibility() {
    if (this.scene) this.scene.visible = this.active && !this.suspended;
  }

  _play(name) {
    const action = this.actions.get(name);
    if (!action) return false;
    if (this.current && this.current !== action) this.current.fadeOut(0.025);
    action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
    const seconds = ACTION_SECONDS[name];
    if (seconds) action.setDuration(seconds);
    if (name === 'Idle') action.setLoop(THREE.LoopRepeat, Infinity);
    else { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = false; }
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

  attack() {
    if (!this.active) return false;
    const name = this.attackIndex++ % 2 === 0 ? 'Slash' : 'Stab';
    return this._play(name);
  }

  playState(name) { return this.active && REQUIRED_CLIPS.includes(name) && this._play(name); }

  update(dt) {
    if (this.active && !this.suspended) this.mixer.update(dt);
  }

  dispose() {
    this.mixer?.stopAllAction();
    this.scene?.removeFromParent();
    this.scene = null;
    this.actions.clear();
  }
}
