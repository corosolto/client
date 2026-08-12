// Estado do projeto de mapa do editor: lista de itens (props/geometria/armas/spawns)
// + método que gera um `map_<nome>.js` pronto, compatível com o contrato do jogo:
//   build(scene, T) -> { root, colliders, occluders, groundHeightAt, slowAt,
//                        spawns, sun, hemi, pickups, bounds }
// Cada item tem `kind`: prop (GLB), box/cyl/plane (geometria), pickup (arma no chão),
// spawn (ponto de nascer por time), ctf (bandeira). É o dado que o painel edita, a
// cena desenha e o export serializa — fonte única, sem espelho.
import { PROP_DEFAULT_H } from './presets.js';

export const DEFAULT_BOUNDS = 25;   // meia extensão padrão do mapa (m)

let nextId = 1;
export function newItem(kind, partial = {}) {
  return { id: nextId++, kind, x: 0, z: 0, y: 0, ry: 0, ...partial };
}

const SPAWN_DEF = { team: 'E', label: 'E', cap: 'YAW' };

export class MapProject {
  constructor(name) {
    this.name = name || 'meu_mapa';
    this.items = [];              // geometria/props/pickups
    this.spawns = { E: [], B: [] };   // {x,z,yaw}
    this.ctf = [];                // {label,x,z}
  }

  add(item) {
    if (item.kind === 'spawn') this.spawns[item.team].push({ x: item.x, z: item.z, yaw: item.ry ?? 0, mesh: item.mesh });
    else if (item.kind === 'ctf') this.ctf.push({ label: item.label || 'BANDEIRA', x: item.x, z: item.z, mesh: item.mesh });
    else this.items.push(item);
    return item;
  }

  remove(item) {
    if (item.kind === 'spawn') {
      const arr = this.spawns[item.team];
      const i = arr.findIndex((s) => s.x === item.x && s.z === item.z);
      if (i >= 0) arr.splice(i, 1);
    } else if (item.kind === 'ctf') {
      this.ctf = this.ctf.filter((c) => c.x !== item.x || c.z !== item.z);
    } else {
      this.items = this.items.filter((i) => i !== item);
    }
  }

  // Extensão do mapa: o mais longe que os itens alcançam + meia-diagonal + margem.
  bounds() {
    let max = DEFAULT_BOUNDS;
    for (const it of this.items) {
      const r = (it.w || it.d || it.r || 1) / 2 + 1.5;
      max = Math.max(max, Math.abs(it.x) + r, Math.abs(it.z) + r);
    }
    for (const t of ['E', 'B']) for (const s of this.spawns[t]) max = Math.max(max, Math.abs(s.x) + 2, Math.abs(s.z) + 2);
    return { minX: -max, maxX: max, minZ: -max, maxZ: max };
  }

  propIds() { return [...new Set(this.items.filter((i) => i.kind === 'prop').map((i) => i.ref))]; }

  // ── serialização ──────────────────────────────────────────────────────────
  exportCode() {
    const m = `map_${slug(this.name)}`;
    const props = this.propIds();
    const ids = label(this.name);
    return `// ${m}.js — GERADO NO EDITOR DE MAPA (não edite à mão).
// Registrar em public/js/maps.js:
//   import { build${cap(this.name)} } from './${m}.js';
//   ${m}: { name: '${ids}', build: build${cap(this.name)}, props: ${cap(this.name)}_PROPS },
import * as THREE from 'three';
import { placeProp } from './mapprops.js';

export const ${cap(this.name)}_PROPS = ${JSON.stringify(props)};

export function build${cap(this.name)}(scene, T) {
  const root = new THREE.Group();
  scene.add(root);
  const colliders = [];
  const occluders = [];
  const pickups = [];

  // ── helpers (mesma geometria procedural do jogo) ──
  const lam = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const mesh = (geo, mat, x, z, ry = 0, opts = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, opts.y ?? 0, z);
    m.rotation.y = ry;
    m.castShadow = true; m.receiveShadow = true;
    root.add(m); occluders.push(m);
    return m;
  };
  const addBox = (w, h, d, color, x, z, ry = 0, opts = {}) => {
    const m = mesh(new THREE.BoxGeometry(w, h, d), lam(color), x, z, ry, opts);
    if (opts.collide !== false) {
      const R = new THREE.Matrix4().makeRotationY(ry);
      const c = new THREE.Box3();
      c.setFromObject(m); // bbox girada: collider já nasce real
      colliders.push({ minX: c.min.x, maxX: c.max.x, minY: 0, maxY: c.max.y, minZ: c.min.z, maxZ: c.max.z });
    }
    return m;
  };
  const addCyl = (r, h, color, x, z, ry = 0, opts = {}) => {
    const geo = new THREE.CylinderGeometry(r, r, h, 12);
    geo.translate(0, h / 2, 0);
    const m = mesh(geo, lam(color), x, z, ry, opts);
    if (opts.collide !== false) colliders.push({ minX: x - r, maxX: x + r, minY: 0, maxY: h, minZ: z - r, maxZ: z + r });
    return m;
  };
  const addPlane = (w, h, color, x, z, ry = 0, opts = {}) => {
    const m = mesh(new THREE.PlaneGeometry(w, h), lam(color), x, z, ry, opts);
    m.rotation.x = -Math.PI / 2;
    if (opts.collide !== false) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: 0.04, minZ: z - h / 2, maxZ: z + h / 2 });
    return m;
  };
  const gunMesh = (kind) => {
    const g = new THREE.Group();
    const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })); m.position.set(x, y, z); g.add(m); };
    box(0.1, 0.1, 1.0, 0x1b1d21, 0, 0.09, 0);
    box(0.11, 0.13, 0.34, 0x7a5326, 0, 0.1, 0.46);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  };
${this.codeItems()}
  // ── spawns / CTF ──
  const spawns = {
    E: [${this.codeSpawns('E')}],
    B: [${this.codeSpawns('B')}],
  };
${this.codeCtf()}
  // ── luz (mesmo padrão dos mapas) ──
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(10, 45, -6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  sun.shadow.camera.far = 110; sun.shadow.bias = -0.0004;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xbcd3ff, 0x30281c, 0.9);
  scene.add(hemi);

  return {
    root, colliders, occluders, pickups,
    groundHeightAt: () => 0,
    slowAt: () => false,
    spawns, sun, hemi,
    bounds: ${JSON.stringify(this.bounds())},
  };
}
`;
  }

  codeSpawns(team) {
    return this.spawns[team].map((s) => `{ x: ${fmt(s.x)}, z: ${fmt(s.z)}, yaw: ${fmt(s.yaw)} }`).join(',\n    ');
  }

  codeCtf() {
    if (!this.ctf.length) return '';
    return `  const ctfPoints = [\n${this.ctf.map((c) => `    { id: 'MID', label: ${JSON.stringify(c.label)}, x: ${fmt(c.x)}, z: ${fmt(c.z)} },`).join('\n')}\n  ];\n`;
  }

  // os itens viraram chamadas aos helpers por linha
  codeItems() {
    return this.items.map((it) => `  ${itemCode(it)}`).join('\n');
  }
}

// ── serialização de um item ────────────────────────────────────────────────────
export function itemCode(it) {
  switch (it.kind) {
    case 'prop':
      return `{ const p = placeProp(${JSON.stringify(it.ref)}, { x: ${fmt(it.x)}, y: ${fmt(it.y ?? 0)}, z: ${fmt(it.z)}, targetH: ${fmt(it.h ?? PROP_DEFAULT_H)}, ry: ${fmt(it.ry)} }); if (p) { root.add(p); occluders.push(p); } }`;
    case 'box': {
      const off = it.collide === false ? `, { collide: false }` : ``;
      return `addBox(${fmt(it.w ?? 2)}, ${fmt(it.h ?? 2)}, ${fmt(it.d ?? 2)}, 0x${hex(it.color)}, ${fmt(it.x)}, ${fmt(it.z)}, ${fmt(it.ry)}${off});`;
    }
    case 'cyl': {
      const off = it.collide === false ? `, { collide: false }` : ``;
      return `addCyl(${fmt(it.r ?? 1)}, ${fmt(it.h ?? 2)}, 0x${hex(it.color)}, ${fmt(it.x)}, ${fmt(it.z)}, ${fmt(it.ry)}${off});`;
    }
    case 'plane': {
      const off = it.collide === false ? `, { collide: false }` : ``;
      return `addPlane(${fmt(it.w ?? 4)}, ${fmt(it.h ?? 2)}, 0x${hex(it.color)}, ${fmt(it.x)}, ${fmt(it.z)}, ${fmt(it.ry)}${off});`;
    }
    case 'pickup':
      return `{ const g = gunMesh(${JSON.stringify(it.weapon)}); g.position.set(${fmt(it.x)}, 0.02, ${fmt(it.z)}); g.rotation.y = ${fmt(it.ry)}; root.add(g); pickups.push({ x: ${fmt(it.x)}, z: ${fmt(it.z)}, kind: ${JSON.stringify(it.weapon)}, weapon: ${JSON.stringify(it.weapon)}, readyAt: 0, mesh: g }); }`;
    default:
      return `// item não serializável: ${it.kind}`;
  }
}

function fmt(n) { return Math.round(n * 1000) / 1000; }
function hex(c) { return (c === undefined ? 0x8a8f98 : Number(c)).toString(16).padStart(6, '0'); }
function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
function cap(s) { return slug(s).replace(/(^|_)([a-z])/g, (_, a, c) => c.toUpperCase()); }
function label(s) { return s.replace(/[_-]+/g, ' '); }

export const SPAWN_DEFS = {
  E: { color: 0x7ec8ff, label: 'spawn E' },
  B: { color: 0xff8a7a, label: 'spawn B' },
};