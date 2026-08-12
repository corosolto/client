// RÉPLICA DO VIEWMODEL DO JOGO (port do dev.html). Usa as MESMAS libs do game:
// weaponModel/preloadWeapons (weapons.js), buildCharacterModel (glbchars.js) e
// Sfx (audio.js). Diferença de arquitetura: NÃO guarda a pose — lê `project.poses`
// no frame(), então o que o painel edita é o que esta cena desenha, sem sincronizar.
// As linhas ~200 a 340 do dev.html viraram classe; o comportamento de tiro/recoil/
// ADS é byte-a-byte o mesmo.
import * as THREE from 'three';
import { preloadCharacterAssets, buildCharacterModel } from '../../glbchars.js';
import { preloadWeapons, weaponModel, weaponCFG, WEAPON_IDS } from '../../weapons.js';
import { CHARACTERS } from '../../characters.js';
import { Sfx } from '../../audio.js';
import { SCOPED, NO_ALIGN, RATE, magOf, MODES } from '../schema.js';
import { ENEMY_IDS } from '../presets.js';

const SPOTS = [[5, 12], [-4, 14], [8, 9], [-9, 11], [0, 18]];

export class VmStage {
  constructor(host, ov, project) {
    this.project = project;
    this.wsel = { value: 'ak' };
    this.mode = 'hip';      // o segmentado do painel: força o modo pré-visualizado
    this._sfx = new Sfx();
    this._ov = ov;
    this.elAmmo = ov.querySelector('#ammo');

    this._renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this._renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    host.appendChild(this._renderer.domElement);
    this._scene = this._buildWorld();
    this._vmScene = new THREE.Scene();
    const vmDL = new THREE.DirectionalLight(0xffffff, 1.5);
    vmDL.position.set(0.4, 0.6, 1);
    this._vmScene.add(new THREE.HemisphereLight(0xdfe8ff, 0x30281c, 1.2), vmDL);
    this._vmScene.add(...this._buildVmLights());

    this._cam = new THREE.PerspectiveCamera(80, 1, 0.05, 400);
    this._cam.rotation.order = 'YXZ';
    this._scene.add(this._cam);
    this._vmCam = new THREE.PerspectiveCamera(80, 1, 0.001, 10);
    this._vmCam.rotation.order = 'YXZ';
    this._vm = new THREE.Group();
    this._vmScene.add(this._vm);
    this._gun = null;

    this._buildReticle();
    this._bindInput();
    this._mag = 0;
    this.reloading = false;
    this.reloadEnd = 0;
    this._mzT = 0;
    this._vmFlashT = 0;
    this._buildVM();
    this._mag = magOf(this.wsel.value);
    this._updateAmmo();

    this.running = false;
    this.raf = 0;
    this.last = performance.now();
    this.pos = new THREE.Vector3(0, 0, 0);
    this.vy = 0;
    this.grounded = true;
    this.bob = 0;
    this.adsT = 0;
    this.look = { yaw: Math.PI, pitch: 0 };
    this.recoil = { pitch: 0, kick: 0, side: 0 };
    this.recHold = 0;
    this.locked = false;
    this.aiming = false;
    this.shootHeld = false;
    this.lastShot = 0;
    this.jumpQueued = false;
    this.keys = {};
    this.hitT = 0;
    this.bots = [];
    this.botsReady = false;
  }

  _buildWorld() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12151b);
    scene.add(new THREE.HemisphereLight(0xbcd3ff, 0x30281c, 1.15));
    const dl = new THREE.DirectionalLight(0xffffff, 1.7);
    dl.position.set(3, 6, 4);
    scene.add(dl);
    const fl = new THREE.DirectionalLight(0xafd0ff, 0.5);
    fl.position.set(-4, 2, -3);
    scene.add(fl);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x232833, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    scene.add(new THREE.GridHelper(120, 240, 0x39485c, 0x232b36));
    for (let i = 0; i < 12; i++) {
      const s = 0.6 + (i % 4) * 0.5;
      const box = new THREE.Mesh(new THREE.BoxGeometry(s, s * 2, s), new THREE.MeshStandardMaterial({ color: 0x3a4658 }));
      box.position.set(Math.cos(i) * (7 + i), s, Math.sin(i * 1.7) * (7 + i));
      scene.add(box);
    }
    this._flash = new THREE.PointLight(0xffe08a, 0, 10, 2);
    scene.add(this._flash);
    this._tracers = [];
    this._tracerGeo = new THREE.CylinderGeometry(0.01, 0.01, 1, 5, 1, true);
    return scene;
  }

  _buildVmLights() {
    this._mzFlash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this._makeGlow(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
    }));
    this._mzFlash.visible = false;
    this._vmFlashL = new THREE.PointLight(0xffd9a0, 0, 3, 2);
    this._sparkPool = [];
    this._sparksA = [];
    for (let i = 0; i < 28; i++) {
      const s = this._mzFlash.clone();
      s.visible = false;
      this._vmScene.add(s);
      this._sparkPool.push(s);
    }
    return [this._mzFlash, this._vmFlashL];
  }

  _makeGlow() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.35, 'rgba(255,220,150,.85)');
    rg.addColorStop(1, 'rgba(255,180,80,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  _buildReticle() {
    const elRet = this._ov.querySelector('#reticle');
    const V = 400, C = 200, L = [];
    const ln = (x1, y1, x2, y2, w) => L.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${w}"/>`);
    ln(C, 34, C, 366, 1.4);
    ln(34, C, 366, C, 1.4);
    for (let i = 1; i * 13 <= 150; i++) {
      const d = i * 13, mj = i % 4 === 0, t = mj ? 8 : 4.5, w = mj ? 1.4 : 1;
      ln(C - t, C - d, C + t, C - d, w);
      ln(C - t, C + d, C + t, C + d, w);
      ln(C - d, C - t, C - d, C + t, w);
      ln(C + d, C - t, C + d, C + t, w);
    }
    const cap = 12;
    ln(C - cap, 50, C + cap, 50, 2.2);
    ln(C - cap, 350, C + cap, 350, 2.2);
    ln(50, C - cap, 50, C + cap, 2.2);
    ln(350, C - cap, 350, C + cap, 2.2);
    elRet.innerHTML = `<svg viewBox="0 0 ${V} ${V}"><g stroke="#0a0a0a" fill="none">${L.join('')}</g></svg>`;
  }

  setWeapon(id) {
    if (!WEAPON_IDS.includes(id) || id === this.wsel.value) return;
    this.wsel.value = id;
    this._mag = magOf(id);
    this.reloading = false;
    this._buildVM();
    this._updateAmmo();
  }
  setMode(mode) { this.mode = MODES.includes(mode) ? mode : 'hip'; }

  _updateAmmo() {
    if (!this.elAmmo) return;
    const cap = magOf(this.wsel.value);
    this.elAmmo.textContent = cap <= 0 ? '∞' : (this.reloading ? 'RECARREGANDO…' : this._mag + ' / ' + cap);
  }

  _buildVM() {
    if (this._gun) { this._vm.remove(this._gun); this._gun = null; }
    const wm = weaponModel(this.wsel.value);
    if (wm) { wm.rotation.y = Math.PI; this._gun = wm; this._vm.add(wm); }
  }

  _adsAligned() {
    const met = this._gun && this._gun.userData && this._gun.userData.metrics;
    if (!met || !met.sight) return null;
    const A = this.project.pose(this.wsel.value).ads;
    const R = Math.PI / 180, S = A.sz * 0.01;
    const p = met.sight.clone().divideScalar(met.norm || 1)
      .applyEuler(new THREE.Euler(0, Math.PI, 0)).multiplyScalar(S)
      .applyEuler(new THREE.Euler(A.rx * R, A.ry * R, A.wt * R));
    const Z = A.wz * 0.01;
    return new THREE.Vector3(-p.x + A.wx * 0.01, -p.y + A.wy * 0.01, Z - p.z);
  }

  _muzzleVM() {
    const met = this._gun && this._gun.userData && this._gun.userData.metrics;
    this._vm.updateMatrixWorld(true);
    if (met && met.muzzle) return this._gun.localToWorld(met.muzzle.clone().divideScalar(met.norm || 1));
    return this._vm.localToWorld(new THREE.Vector3(0, 0, -0.3));
  }

  spawnBots() {
    for (const b of this.bots) this._scene.remove(b.group);
    this.bots.length = 0;
    const pool = ENEMY_IDS.length ? ENEMY_IDS : CHARACTERS.map((c) => c.id);
    SPOTS.forEach(async (sp, i) => {
      const id = pool[i % pool.length];
      await preloadCharacterAssets([id]);
      const def = CHARACTERS.find((c) => c.id === id) || { id, team: 'B' };
      const bm = buildCharacterModel(def, { weapon: true, weaponId: 'ak' });
      if (!bm || !bm.group) return;
      if (bm.ctrl && bm.ctrl._to) bm.ctrl._to('idle');
      for (let k = 0; k < 6; k++) bm.ctrl && bm.ctrl.update(1 / 30, 0, false, 0);
      bm.group.position.set(sp[0], 0, sp[1]);
      bm.group.rotation.y = Math.PI;
      this._scene.add(bm.group);
      this.bots.push({ group: bm.group, ctrl: bm.ctrl, hp: 3, dead: false, tRespawn: 0 });
    });
  }

  _bindInput() {
    const el = this._renderer.domElement;
    addEventListener('keydown', (e) => {
      if (!this.running) return;
      this.keys[e.code] = true;
      if (e.code === 'Space') { this.jumpQueued = true; e.preventDefault(); }
      if (e.code === 'KeyR') { this._mag = magOf(this.wsel.value); this.reloading = false; this._updateAmmo(); this.spawnBots(); }
    });
    addEventListener('keyup', (e) => { if (!this.running) return; this.keys[e.code] = false; });
    el.addEventListener('click', () => {
      if (!this.running) return;
      if (!this.locked) { el.requestPointerLock(); this._sfx.ensure && this._sfx.ensure(); }
    });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === el; });
    addEventListener('mousemove', (e) => {
      if (!this.running || !this.locked) return;
      this.look.yaw -= e.movementX * 0.0022;
      this.look.pitch = Math.max(-1.4, Math.min(1.4, this.look.pitch - e.movementY * 0.0022));
    });
    addEventListener('mousedown', (e) => {
      if (!this.running || !this.locked) return;
      if (e.button === 0) this.shootHeld = true;
      if (e.button === 2) this.aiming = true;
    });
    addEventListener('mouseup', (e) => {
      if (!this.running) return;
      if (e.button === 0) this.shootHeld = false;
      if (e.button === 2) this.aiming = false;
    });
    addEventListener('contextmenu', (e) => { if (this.running) e.preventDefault(); });
  }

  _hitmark() {
    const el = this._ov.querySelector('#hitmark');
    el.style.opacity = '1';
    this.hitT = 0.12;
  }

  _fireShot() {
    const w = this.wsel.value;
    const fx = this.project.fx;
    this._sfx.shotWeapon && this._sfx.shotWeapon(w, 0, 0.9);
    const bp = SCOPED.has(w) ? 0.06 : (w === 'deagle' ? 0.05 : 0.022);
    const bk = SCOPED.has(w) ? 0.05 : 0.02;
    this.recoil.pitch = Math.min(0.2, this.recoil.pitch + bp * (this.aiming ? 0.5 : 1) * (fx.rise / 100));
    this.recoil.kick = Math.min(0.09, this.recoil.kick + bk * (fx.kick / 100));
    this.recoil.side += (Math.random() * 2 - 1) * 0.045 * (fx.side / 100);
    this.recHold = 0.11;
    const dir = new THREE.Vector3();
    this._cam.getWorldDirection(dir);
    const wMuzzle = this._cam.position.clone().addScaledVector(dir, 0.6).add(new THREE.Vector3(0, -0.05, 0));
    const col = this._warm();
    this._flash.position.copy(wMuzzle);
    this._flash.color.copy(col);
    this._flash.intensity = fx.lightInt;
    const mz = this._muzzleVM();
    this._vmFlashL.position.copy(mz);
    this._vmFlashL.color.copy(col);
    this._vmFlashL.intensity = fx.lightInt;
    this._vmFlashT = fx.lightLife / 1000;
    this._mzFlash.position.copy(mz);
    this._mzFlash.material.color.copy(col);
    this._mzFlash.material.rotation = Math.random() * Math.PI * 2;
    this._mzFlash.material.opacity = 1;
    this._mzFlash.scale.setScalar(fx.flashSize / 100);
    this._mzFlash.visible = true;
    this._mzT = fx.flashLife / 1000;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this._vm.quaternion);
    for (let i = 0; i < fx.sparks; i++) {
      const s = this._sparkPool.pop();
      if (!s) break;
      s.position.copy(mz);
      s.material.color.copy(col);
      s.material.opacity = 1;
      s.scale.setScalar(0.015 + Math.random() * 0.02);
      s.visible = true;
      const v = fwd.clone().multiplyScalar(1.4 + Math.random() * 2.2)
        .add(new THREE.Vector3((Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.4));
      this._sparksA.push({ s, v, t: 0.1 + Math.random() * 0.06 });
    }
    const ray = new THREE.Raycaster();
    ray.set(this._cam.position, dir);
    const alive = this.bots.filter((b) => !b.dead);
    const hits = ray.intersectObjects(alive.map((b) => b.group), true);
    let end = this._cam.position.clone().addScaledVector(dir, 60);
    if (hits.length) {
      end = hits[0].point;
      const b = alive.find((x) => this._isDesc(hits[0].object, x.group));
      if (b) {
        b.hp--;
        this._hitmark();
        if (b.hp <= 0) { b.dead = true; b.tRespawn = 2.2; if (b.ctrl && b.ctrl._to) b.ctrl._to('death'); }
      }
    }
    const m = new THREE.Mesh(this._tracerGeo, new THREE.MeshBasicMaterial({
      color: 0xfff3d6, transparent: true, opacity: fx.trOpacity / 100, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    const d = new THREE.Vector3().subVectors(end, wMuzzle);
    const len = d.length();
    m.position.copy(wMuzzle).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    m.scale.set(fx.trThick, len, fx.trThick);
    m.userData.t = 0.09;
    this._scene.add(m);
    this._tracers.push(m);
  }

  _warm() {
    const fx = this.project.fx;
    return new THREE.Color(0xfff2e0).lerp(new THREE.Color(0xffab55), fx.warmth / 100);
  }

  _isDesc(o, r) { let p = o; while (p) { if (p === r) return true; p = p.parent; } return false; }

  _fit() {
    const h = this._renderer.domElement.parentElement;
    const w = h.clientWidth || 1, hh = h.clientHeight || 1;
    this._renderer.setSize(w, hh, false);
    this._cam.aspect = w / hh;
    this._cam.updateProjectionMatrix();
  }

  frame() {
    if (!this.running) return;
    const dt = Math.min(0.05, (performance.now() - this.last) / 1000);
    this.last = performance.now();
    const P = this.project.poses[this.wsel.value];
    const fx = this.project.fx;
    const fwd = new THREE.Vector3(-Math.sin(this.look.yaw), 0, -Math.cos(this.look.yaw));
    const right = new THREE.Vector3(Math.cos(this.look.yaw), 0, -Math.sin(this.look.yaw));
    const mv = new THREE.Vector3();
    if (this.keys['KeyW']) mv.add(fwd);
    if (this.keys['KeyS']) mv.sub(fwd);
    if (this.keys['KeyD']) mv.add(right);
    if (this.keys['KeyA']) mv.sub(right);
    const moving = mv.lengthSq() > 0;
    const crouch = !!this.keys['ControlLeft'] || !!this.keys['ControlRight'];
    const run = (!!this.keys['ShiftLeft'] || !!this.keys['ShiftRight']) && !crouch;
    const speed = crouch ? 2.2 : (run ? 6.0 : 3.9);
    if (moving) { mv.normalize().multiplyScalar(speed * dt); this.pos.add(mv); }
    if (this.jumpQueued && this.grounded && !crouch) { this.vy = 4.2; this.grounded = false; }
    this.jumpQueued = false;
    if (!this.grounded) {
      this.vy -= 12 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= 0) { this.pos.y = 0; this.vy = 0; this.grounded = true; }
    }
    this.bob += moving ? dt * (run ? 12 : 8) : 0;
    const eyeH = (crouch ? 1.1 : 1.6);
    this._cam.position.set(this.pos.x, this.pos.y + eyeH, this.pos.z);
    for (const b of this.bots) {
      if (b.dead) {
        b.tRespawn -= dt;
        if (b.tRespawn <= 0) { b.dead = false; b.hp = 3; if (b.ctrl && b.ctrl._to) b.ctrl._to('idle'); }
      }
      b.ctrl && b.ctrl.update(dt, 0, false, 0);
    }
    const rate = RATE[this.wsel.value] || 105, cap = magOf(this.wsel.value);
    const now = performance.now();
    if (this.reloading && now >= this.reloadEnd) { this._mag = cap; this.reloading = false; this._updateAmmo(); }
    if (this.shootHeld && !this.reloading && now - this.lastShot > rate) {
      if (cap > 0 && this._mag <= 0) { this.reloading = true; this.reloadEnd = now + 1100; this._updateAmmo(); }
      else {
        this._fireShot();
        if (cap > 0) { this._mag--; this._updateAmmo(); }
        this.lastShot = now;
        if (SCOPED.has(this.wsel.value) || this.wsel.value === 'deagle') this.shootHeld = false;
      }
    }
    if (this.recHold > 0) this.recHold -= dt;
    else {
      const kf = Math.pow(0.03, dt * (fx.recover / 100));
      this.recoil.pitch *= kf;
      this.recoil.kick *= kf;
      this.recoil.side *= kf;
    }
    this._flash.intensity *= Math.pow(0.00001, dt);
    if (this._flash.intensity < 0.05) this._flash.intensity = 0;
    if (this._mzT > 0) {
      this._mzT -= dt;
      this._mzFlash.material.opacity = Math.max(0, this._mzT / (fx.flashLife / 1000));
      if (this._mzT <= 0) this._mzFlash.visible = false;
    }
    if (this._vmFlashT > 0) {
      this._vmFlashT -= dt;
      this._vmFlashL.intensity = fx.lightInt * Math.max(0, this._vmFlashT / (fx.lightLife / 1000));
      if (this._vmFlashT <= 0) this._vmFlashL.intensity = 0;
    }
    for (let i = this._sparksA.length - 1; i >= 0; i--) {
      const sp = this._sparksA[i];
      sp.t -= dt;
      sp.s.position.addScaledVector(sp.v, dt);
      sp.s.material.opacity = Math.max(0, sp.t / 0.14);
      if (sp.t <= 0) { sp.s.visible = false; this._sparkPool.push(sp.s); this._sparksA.splice(i, 1); }
    }
    for (let i = this._tracers.length - 1; i >= 0; i--) {
      const t = this._tracers[i];
      t.userData.t -= dt;
      t.material.opacity = Math.max(0, t.userData.t / 0.09) * (fx.trOpacity / 100);
      if (t.userData.t <= 0) { this._scene.remove(t); this._tracers.splice(i, 1); }
    }
    if (this.hitT > 0) {
      this.hitT -= dt;
      if (this.hitT <= 0) this._ov.querySelector('#hitmark').style.opacity = '0';
    }
    this._cam.rotation.set(this.look.pitch + this.recoil.pitch, this.look.yaw, this.recoil.side * 0.4);
    const scoped = SCOPED.has(this.wsel.value);
    const showAds = (this.aiming || this.mode === 'ads');
    const scopeAds = showAds && scoped;
    const target = (showAds && !scoped) ? 1 : 0;
    this.adsT += (target - this.adsT) * Math.min(1, dt * 14);
    const CP = P;
    const hp = [CP.hip.wx * 0.01, CP.hip.wy * 0.01, CP.hip.wz * 0.01];
    const al = NO_ALIGN.has(this.wsel.value) ? null : this._adsAligned();
    const ap = al ? [al.x, al.y, al.z] : [CP.ads.wx * 0.01, CP.ads.wy * 0.01, CP.ads.wz * 0.01];
    const L = (a, b) => a + (b - a) * this.adsT;
    this._vm.position.set(L(hp[0], ap[0]), L(hp[1], ap[1]), L(hp[2], ap[2]));
    this._vm.position.z += this.recoil.kick;
    this._vm.position.y += this.recoil.kick * 0.4;
    this._vm.scale.setScalar(L(CP.hip.sz, CP.ads.sz) * 0.01);
    const R = Math.PI / 180;
    this._vm.rotation.set(
      L(CP.hip.rx, CP.ads.rx) * R + this.recoil.pitch * 0.55,
      L(CP.hip.ry, CP.ads.ry) * R,
      L(CP.hip.wt, CP.ads.wt) * R + this.recoil.side * 0.6);
    this._vm.position.x += Math.sin(this.bob) * 0.006 * (1 - this.adsT);
    this._vm.position.y += Math.abs(Math.cos(this.bob)) * 0.004 * (1 - this.adsT);
    this._vm.visible = !scopeAds;
    const wantFov = scopeAds ? CP.hip.fov * 0.35 : L(CP.hip.fov, CP.ads.fov);
    this._cam.fov += (wantFov - this._cam.fov) * Math.min(1, dt * 12);
    this._cam.updateProjectionMatrix();
    this._vmCam.fov = this._cam.fov;
    this._vmCam.aspect = this._cam.aspect;
    this._vmCam.rotation.set(0, 0, 0);
    this._vmCam.updateProjectionMatrix();
    const elScope = this._ov.querySelector('#scope'), elRet = this._ov.querySelector('#reticle'), elCross = this._ov.querySelector('#cross');
    elScope.style.display = scopeAds ? 'block' : 'none';
    elRet.style.display = scopeAds ? 'block' : 'none';
    elCross.style.display = scopeAds ? 'none' : 'block';
    this._renderer.render(this._scene, this._cam);
    this._renderer.autoClear = false;
    this._renderer.clearDepth();
    this._renderer.render(this._vmScene, this._vmCam);
    this._renderer.autoClear = true;
    this.raf = requestAnimationFrame(() => this.frame());
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._fit();
    if (!this.botsReady) { this.botsReady = true; this.spawnBots(); }
    this.last = performance.now();
    this.raf = requestAnimationFrame(() => this.frame());
  }

  stop() {
    this.running = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    if (document.pointerLockElement === this._renderer.domElement) document.exitPointerLock();
  }
}