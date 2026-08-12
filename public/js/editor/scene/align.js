// Cena de alinhamento: personagem + arma com órbita de mouse.
// Porta o initCena do dev.html para a arquitetura de classe do editor.
// Verifica que o cano (+Z, seta verde) aponta para fora — o mesmo critério do dev.html.
import * as THREE from 'three';
import { preloadCharacterAssets, buildCharacterModel } from '../../glbchars.js';
import { weaponModel, weaponCFG } from '../../weapons.js';
import { CHARACTERS } from '../../characters.js';

export class AlignStage {
  constructor(host) {
    this._renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this._renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    host.appendChild(this._renderer.domElement);

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x12151b);
    this._scene.add(new THREE.HemisphereLight(0xbcd3ff, 0x30281c, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(3, 6, 4);
    this._scene.add(key);
    const fill = new THREE.DirectionalLight(0xafd0ff, 0.5);
    fill.position.set(-4, 2, -3);
    this._scene.add(fill);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0x232833, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    this._scene.add(floor);
    this._scene.add(new THREE.GridHelper(20, 40, 0x39485c, 0x232b36));

    this._cam = new THREE.PerspectiveCamera(42, 1, 0.02, 200);
    this._orbit = { target: new THREE.Vector3(0, 1.05, 0), theta: 0.6, phi: 1.25, r: 3.4 };

    this.mode = 'char';
    this.weaponId = 'ak';
    this.charId = (CHARACTERS.find((c) => c.team === 'E') || CHARACTERS[0])?.id || 'mst';
    this.delta = [0, 0, 0];
    this._current = null;
    this._charArrow = null;
    this.onCfgChange = null;

    this.running = false;
    this.raf = 0;

    this._bindInput();
  }

  _applyCam() {
    const { target: t, theta, phi, r } = this._orbit;
    this._cam.position.set(
      t.x + r * Math.sin(phi) * Math.sin(theta),
      t.y + r * Math.cos(phi),
      t.z + r * Math.sin(phi) * Math.cos(theta));
    this._cam.lookAt(t);
  }

  _bindInput() {
    const el = this._renderer.domElement;
    let drag = null;
    el.addEventListener('pointerdown', (e) => { if (this.running) drag = { x: e.clientX, y: e.clientY }; });
    addEventListener('pointerup', () => { drag = null; });
    addEventListener('pointermove', (e) => {
      if (!this.running || !drag) return;
      this._orbit.theta -= (e.clientX - drag.x) * 0.008;
      this._orbit.phi = Math.max(0.15, Math.min(Math.PI - 0.15, this._orbit.phi - (e.clientY - drag.y) * 0.008));
      drag = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener('wheel', (e) => {
      if (!this.running) return;
      e.preventDefault();
      this._orbit.r = Math.max(0.4, Math.min(12, this._orbit.r + e.deltaY * 0.002));
    }, { passive: false });
  }

  _arrow(dir, len, color) {
    return new THREE.ArrowHelper(
      new THREE.Vector3(...dir),
      new THREE.Vector3(0, 1.05, 0),
      len, color, len * 0.14, len * 0.08);
  }

  _clearCurrent() {
    if (this._current) { this._scene.remove(this._current); this._current = null; }
    if (this._charArrow) { this._scene.remove(this._charArrow); this._charArrow = null; }
  }

  async buildGun() {
    this._clearCurrent();
    const g = new THREE.Group();
    g.add(this._arrow([0, 0, 1], 0.9, 0x00ff44));
    g.add(this._arrow([0, 0, -1], 0.55, 0xff3344));
    const wm = weaponModel(this.weaponId);
    if (wm) {
      wm.position.set(0, 1.05, 0);
      wm.rotation.set(
        this.delta[0] * Math.PI / 180,
        this.delta[1] * Math.PI / 180,
        this.delta[2] * Math.PI / 180);
      g.add(wm);
    }
    this._scene.add(g);
    this._current = g;
    this._orbit.target.set(0, 1.05, 0);
    this.onCfgChange && this.onCfgChange();
  }

  async buildChar() {
    this._clearCurrent();
    await preloadCharacterAssets([this.charId]);
    const def = CHARACTERS.find((c) => c.id === this.charId) || { id: this.charId, team: 'E' };
    const built = buildCharacterModel(def, { weapon: true, weaponId: this.weaponId });
    if (built && built.group) {
      if (built.ctrl && built.ctrl._to) built.ctrl._to('idle');
      for (let i = 0; i < 12; i++) if (built.ctrl) built.ctrl.update(1 / 30, 0, false, 0);
      built.group.updateMatrixWorld(true);
      this._scene.add(built.group);
      this._current = built.group;
    }
    this._charArrow = this._arrow([0, 0, 1], 1.3, 0x00ff44);
    this._scene.add(this._charArrow);
    this._orbit.target.set(0, 1.05, 0);
    this.onCfgChange && this.onCfgChange();
  }

  async rebuild() {
    if (this.mode === 'gun') await this.buildGun();
    else await this.buildChar();
  }

  rotateAxis(axis) {
    this.delta[axis] = (this.delta[axis] + 90) % 360;
    if (this.mode === 'gun') this.buildGun();
  }

  resetDelta() {
    this.delta[0] = this.delta[1] = this.delta[2] = 0;
    if (this.mode === 'gun') this.buildGun();
  }

  getCfgText() {
    const c = weaponCFG(this.weaponId) || {};
    return `arma: ${this.weaponId}\n` +
      `rot CFG: [${(c.rot || []).join(', ')}]\n` +
      `len: ${c.len}  gripZ: ${c.gripZ}\n` +
      `vm: ${c.vm ?? 1}\n` +
      (this.mode === 'gun' ? `giro extra: [${this.delta.join(', ')}]` : `(modo personagem)`);
  }

  screenshot() {
    this._renderer.render(this._scene, this._cam);
    const a = document.createElement('a');
    a.download = `bancada-${this.mode}-${this.weaponId}${this.mode === 'char' ? '-' + this.charId : ''}.png`;
    a.href = this._renderer.domElement.toDataURL('image/png');
    a.click();
  }

  _fit() {
    const h = this._renderer.domElement.parentElement;
    const w = h.clientWidth || 1, hh = h.clientHeight || 1;
    this._renderer.setSize(w, hh, false);
    this._cam.aspect = w / hh;
    this._cam.updateProjectionMatrix();
  }

  _loop() {
    if (!this.running) return;
    this._applyCam();
    this._renderer.render(this._scene, this._cam);
    this.raf = requestAnimationFrame(() => this._loop());
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._fit();
    this.raf = requestAnimationFrame(() => this._loop());
  }

  stop() {
    this.running = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
  }
}
