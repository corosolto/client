// PALCO DE EDIÇÃO DE MAPA: grid + órbita de mouse + colocação/clique/seleção de
// itens. Usa a MESMA fonte do jogo — placeProp (mapprops.js) pros GLB, e as
// geometrias procedurais que os mapas constroem. Estado sempre no MapProject:
// a cena só espelha; o export é o que registra em maps.js.
import * as THREE from 'three';
import { placeProp, preloadMapProps, hasProp } from '../../mapprops.js';
import { weaponModel, preloadWeapons } from '../../weapons.js';
import { MAP_PROPS } from '../presets.js';

const ORBIT = { theta: 0.6, phi: 1.1, r: 38, target: new THREE.Vector3(0, 0, 0) };

export class MapStage {
  constructor(host, project) {
    this.project = project;
    this.tool = 'select';        // tool ativa: select | place
    this.pending = null;         // item a ser colocado quando tool=place
    this.selected = null;        // item selecionado (ou null)
    this._meshes = new Map();    // item -> Object3D na cena

    this._renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this._renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    host.appendChild(this._renderer.domElement);

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x12151b);
    this._scene.add(new THREE.HemisphereLight(0xbcd3ff, 0x30281c, 1.15));
    const dl = new THREE.DirectionalLight(0xffffff, 1.6);
    dl.position.set(30, 60, 40);
    this._scene.add(dl);
    this._sun = dl;

    // chão sólido (raycast de colocação) + grade ao longe
    this._ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600, 1, 1), new THREE.MeshStandardMaterial({ color: 0x1a1f26, roughness: 1 }));
    this._ground.rotation.x = -Math.PI / 2;
    this._ground.position.y = -0.01;
    this._scene.add(this._ground);
    this._scene.add(new THREE.GridHelper(200, 40, 0x2c3846, 0x20262f));

    this._cam = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
    this._scene.add(this._cam);
    this._ray = new THREE.Raycaster();
    this._po = new THREE.Vector2();

    this._bindInput();
    this.running = false;
    this.raf = 0;
    this.last = performance.now();
  }

  // ── espelho: reconstrói TUDO a partir do MapProject ─────────────────────────
  renderAll() {
    for (const [it, o] of this._meshes) {
      this._scene.remove(o);
      this._dispose(o);
    }
    this._meshes.clear();
    for (const it of this.project.items) this._addMesh(it);
    for (const t of ['E', 'B']) {
      for (const s of this.project.spawns[t]) this._addSpawnMesh(s, t);
    }
    for (const c of this.project.ctf) this._addCtfMesh(c);
  }

  select(item, sel = true) {
    this.selected = sel ? item : null;
    for (const [it, o] of this._meshes) {
      o.traverse((n) => { if (n.isMesh && n.material) n.material.emissive = it._hl ? new THREE.Color(0x0) : it === this.selected ? new THREE.Color(0x1d2b22) : new THREE.Color(0x0); });
    }
  }

  // ── construção de cada item (reusa fonte do jogo) ───────────────────────────
  async _addMesh(it) {
    let o = null;
    if (it.kind === 'prop') {
      if (!hasProp(it.ref)) await preloadMapProps([it.ref]);
      o = placeProp(it.ref, { x: it.x, y: it.y ?? 0, z: it.z, targetH: it.h ?? 2.4, ry: it.ry });
    } else if (it.kind === 'box') {
      o = new THREE.Mesh(new THREE.BoxGeometry(it.w ?? 2, it.h ?? 2, it.d ?? 2), new THREE.MeshStandardMaterial({ color: it.color ?? 0x8a8f98, roughness: 0.9 }));
      o.position.set(it.x, (it.h ?? 2) / 2 + (it.y ?? 0), it.z);
      o.rotation.y = it.ry ?? 0;
    } else if (it.kind === 'cyl') {
      const r = it.r ?? 1, h = it.h ?? 2;
      o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), new THREE.MeshStandardMaterial({ color: it.color ?? 0x8a8f98, roughness: 0.9 }));
      o.position.set(it.x, h / 2 + (it.y ?? 0), it.z);
      o.rotation.y = it.ry ?? 0;
    } else if (it.kind === 'plane') {
      o = new THREE.Mesh(new THREE.PlaneGeometry(it.w ?? 4, it.h ?? 2), new THREE.MeshStandardMaterial({ color: it.color ?? 0x8a8f98, roughness: 0.9 }));
      o.rotation.x = -Math.PI / 2;
      o.rotation.y = it.ry ?? 0;
      o.position.set(it.x, it.y ?? 0, it.z);
    } else if (it.kind === 'pickup') {
      await preloadWeapons();
      const wm = weaponModel(it.weapon);
      if (!wm) return;
      o = wm.clone();
      o.position.set(it.x, 0.08, it.z);
      o.rotation.y = it.ry ?? 0;
      o.scale.setScalar(3);
    }
    if (!o) return;
    o.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    this._scene.add(o);
    this._meshes.set(it, o);
  }

  _addSpawnMesh(s, team) {
    const color = team === 'E' ? 0x7ec8ff : 0xff8a7a;
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.0, 24), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    g.add(ring);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 12), new THREE.MeshBasicMaterial({ color }));
    cone.position.y = 1.1;
    cone.rotation.z = Math.PI;
    g.add(cone);
    g.position.set(s.x, 0, s.z);
    this._scene.add(g);
    this._meshes.set(s, g);
    this._decorate(s, team);
  }

  _addCtfMesh(c) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 8), new THREE.MeshBasicMaterial({ color: 0xcccccc }));
    pole.position.y = 1.5;
    g.add(pole);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.7, 1.1), new THREE.MeshBasicMaterial({ color: 0xffcc33 }));
    flag.position.set(0, 3, 0.2);
    g.add(flag);
    g.position.set(c.x, 0, c.z);
    this._scene.add(g);
    this._meshes.set(c, g);
  }

  _decorate(s, team) { s.team = team; s.__marker = team; }

  // ── entrada ────────────────────────────────────────────────────────────────
  _bindInput() {
    const el = this._renderer.domElement;
    let drag = null;
    let moved = 0;
    el.addEventListener('pointerdown', (e) => { if (!this.running) return; drag = { x: e.clientX, y: e.clientY }; moved = 0; });
    addEventListener('pointerup', () => { drag = null; });
    el.addEventListener('click', (e) => {
      if (!this.running) return;
      if (moved > 8) { moved = 0; return; }
      this.clickAt(e.clientX, e.clientY);
    });
    addEventListener('pointermove', (e) => {
      if (!this.running || !drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      moved = Math.sqrt(dx * dx + dy * dy);
      ORBIT.theta -= dx * 0.006;
      ORBIT.phi = Math.max(0.15, Math.min(Math.PI * 0.45, ORBIT.phi - dy * 0.006));
      drag = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener('wheel', (e) => { if (!this.running) return; e.preventDefault(); ORBIT.r = Math.max(6, Math.min(120, ORBIT.r + e.deltaY * 0.03)); }, { passive: false });
  }

  setTool(tool) { this.tool = tool; }

  setPending(item) {
    this.pending = item;
    if (item) this.tool = 'place';
  }

  removeItem(it) {
    this.project.remove(it);
    const m = this._meshes.get(it);
    if (m) { this._scene.remove(m); this._dispose(m); this._meshes.delete(it); }
    if (this.selected === it) this.selected = null;
  }

  // ── colocar / selecionar no clique ─────────────────────────────────────────
  clickAt(clientX, clientY) {
    if (!this.running) return;
    const rect = this._renderer.domElement.getBoundingClientRect();
    this._po.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this._ray.setFromCamera(this._po, this._cam);
    // clique em item existente → seleciona (qualquer tool)
    const hits = this._ray.intersectObjects([...this._meshes.values()], true);
    if (hits.length) {
      const o = hits[0].object;
      const owner = [...this._meshes.keys()].find((it) => this._isDesc(o, this._meshes.get(it)));
      if (owner) { this.select(owner); this.onSelect && this.onSelect(owner); return; }
    }
    // clique no chão → coloca ou desseleciona
    const g = this._ray.intersectObject(this._ground, false);
    if (this.pending && g.length) {
      const p = g[0].point;
      const item = this.pending;
      this.pending = null;
      if (item.kind === 'spawn') {
        this.project.add({ kind: 'spawn', team: item.team, x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10, ry: item.ry ?? 0 });
      } else if (item.kind === 'ctf') {
        this.project.add({ kind: 'ctf', label: item.label || 'BANDEIRA', x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10 });
      } else {
        const copy = { ...item, id: Date.now(), x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10 };
        delete copy.mesh;
        this.project.add(copy);
      }
      this.renderAll();
      this.onChange && this.onChange();
      this.onPlaced && this.onPlaced();
      return;
    }
    this.select(null);
    this.onSelect && this.onSelect(null);
  }

  _isDesc(o, r) { let p = o; while (p) { if (p === r) return true; p = p.parent; } return false; }

  _dispose(o) {
    o.traverse((n) => {
      if (n.isMesh) {
        n.geometry && n.geometry.dispose();
        Array.isArray(n.material) ? n.material.forEach((m) => m.dispose()) : n.material && n.material.dispose();
      }
    });
  }

  // ── ciclo de vida ──────────────────────────────────────────────────────────
  _fit() {
    const h = this._renderer.domElement.parentElement;
    const w = h.clientWidth || 1, hh = h.clientHeight || 1;
    this._renderer.setSize(w, hh, false);
    this._cam.aspect = w / hh;
    this._cam.updateProjectionMatrix();
  }

  frame() {
    if (!this.running) return;
    ORBIT.target.set(0, 0, 0);
    this._cam.position.set(
      ORBIT.target.x + ORBIT.r * Math.sin(ORBIT.phi) * Math.sin(ORBIT.theta),
      ORBIT.target.y + ORBIT.r * Math.cos(ORBIT.phi),
      ORBIT.target.z + ORBIT.r * Math.sin(ORBIT.phi) * Math.cos(ORBIT.theta));
    this._cam.lookAt(ORBIT.target);
    // pontinho de destino do pending (mira show onde vai cair)
    this._renderer.render(this._scene, this._cam);
    this.raf = requestAnimationFrame(() => this.frame());
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._fit();
    this.last = performance.now();
    this.raf = requestAnimationFrame(() => this.frame());
  }

  stop() {
    this.running = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
  }
}