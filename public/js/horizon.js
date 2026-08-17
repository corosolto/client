import * as THREE from 'three';

export const HORIZON_INNER_RADIUS = 32;
const TAU = Math.PI * 2;
const HORIZONTE_URBANO_ANCOREADO = true;

/* Horizonte com cenário — o que faltava no frame (dono, 14/08): o mapa terminava
   no muro e no céu limpo. A saia e faixas inclinadas formam terreno contínuo
   até a silhueta; anel vertical vira fita flutuante quando a câmera sobe. */

function perfil(base, picos) {
  return (t) => {
    let y = base;
    for (const [c, amp, larg] of picos) {
      let d = Math.abs(t - c); d = Math.min(d, 2 * Math.PI - d);
      y += amp * Math.exp(-(d * d) / (2 * larg * larg));
    }
    return y;
  };
}

const PERFIL_BAIXO = perfil(-0.3, [
  [0.3, 2.8, 0.28], [1.5, 3.6, 0.25], [2.8, 2.4, 0.30], [4.2, 3.2, 0.27], [5.5, 2.7, 0.29],
]);
const PERFIL_MEIO = perfil(-0.2, [
  [0.2, 11, 0.22], [1.2, 15, 0.19], [2.6, 10, 0.24], [3.9, 14, 0.21], [5.1, 12, 0.22],
]);
const PERFIL_LONGE = perfil(2, [
  [0.4, 23, 0.15], [0.67, 18, 0.13], [1.9, 31, 0.18], [3.6, 20, 0.20], [4.4, 27, 0.17], [5.6, 19, 0.19],
]);
const lerp = (a, b, t) => a + (b - a) * t;
const suave = (t) => t * t * (3 - 2 * t);

export function horizonTerrainHeight(x, z) {
  const raio = Math.hypot(x, z);
  const theta = (Math.atan2(z, x) + TAU) % TAU;
  if (raio <= HORIZON_INNER_RADIUS) return -0.5;
  if (raio <= 72) return lerp(-0.5, PERFIL_BAIXO(theta) * 0.82,
    suave((raio - HORIZON_INNER_RADIUS) / (72 - HORIZON_INNER_RADIUS)));
  if (raio <= 140) return lerp(PERFIL_BAIXO(theta) * 0.82, PERFIL_BAIXO(theta), (raio - 72) / 68);
  if (raio <= 225) return lerp(PERFIL_BAIXO(theta), PERFIL_MEIO(theta), (raio - 140) / 85);
  return lerp(PERFIL_MEIO(theta), PERFIL_LONGE(theta), Math.min(1, (raio - 225) / 135));
}

function hash(n) {
  const s = Math.sin(n * 91.733 + 17.13) * 43758.5453;
  return s - Math.floor(s);
}

export function horizonHouseSupport(casa) {
  const cos = Math.cos(casa.ry), sin = Math.sin(casa.ry);
  let apoio = Infinity;
  for (const sx of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) {
    const x = casa.x + sx * casa.w * cos + sz * casa.d * sin;
    const z = casa.z - sx * casa.w * sin + sz * casa.d * cos;
    apoio = Math.min(apoio, horizonTerrainHeight(x, z));
  }
  return apoio;
}

function criarCasario() {
  const casas = [];
  for (let tentativa = 0; tentativa < 3000 && casas.length < 420; tentativa++) {
    const agrupada = tentativa % 6 !== 0;
    const quadrante = Math.floor(hash(tentativa * 13 + 1) * 4);
    const theta = agrupada
      ? (quadrante + 0.5) * Math.PI / 2 + (hash(tentativa * 13 + 2) - 0.5) * 0.64
      : hash(tentativa * 13 + 2) * TAU;
    const radius = agrupada
      ? 54 + Math.pow(hash(tentativa * 13 + 3), 1.6) * 30
      : 68 + hash(tentativa * 13 + 3) * 72;
    const x = Math.cos(theta) * radius, z = Math.sin(theta) * radius;
    if (agrupada && (Math.abs(x) < 23 || Math.abs(z) < 39)) continue;
    if (casas.some((c) => Math.hypot(c.x - x, c.z - z) < 3.0)) continue;
    const w = 3.4 + hash(tentativa * 13 + 4) * 2.4;
    const d = 3.8 + hash(tentativa * 13 + 5) * 2.8;
    const h = 2.7 + hash(tentativa * 13 + 6) * 2.2;
    const sobrado = hash(tentativa * 13 + 7) > 0.67;
    const casa = {
      theta, radius, x, z, w, d, h,
      ry: -theta + (hash(tentativa * 13 + 8) - 0.5) * 0.42,
      material: Math.floor(hash(tentativa * 13 + 9) * 6), sobrado,
      desloca: (hash(tentativa * 13 + 10) - 0.5) * w * 0.22,
    };
    casa.base = horizonHouseSupport(casa);
    casas.push(Object.freeze(casa));
  }
  return Object.freeze(casas);
}

export const HORIZON_CASARIO = criarCasario();

function faixaMorros(scene, { raio0, raio1, h0, h1, cor, seg = 160 }) {
  const pos = [], idx = [], n = seg;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 2 * Math.PI;
    const c = Math.cos(t), s = Math.sin(t);
    pos.push(c * raio0, h0(t), s * raio0, c * raio1, h1(t), s * raio1);
    if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: cor, fog: false, side: THREE.DoubleSide }));
  m.renderOrder = -1; m.frustumCulled = false;
  scene.add(m);
  return m;
}

function casario(scene, low = false) {
  if (!HORIZONTE_URBANO_ANCOREADO) return;
  const ativos = HORIZON_CASARIO.filter((_, i) => !low || i % 3 === 0);
  const cores = [0x887c72, 0x767672, 0x927969, 0x727b76, 0x956f60, 0x806e65];
  const mats = cores.map((color) => new THREE.MeshLambertMaterial({ color, fog: false }));
  const telhado = new THREE.MeshLambertMaterial({ color: 0x77716a, fog: false });
  const caixaMat = new THREE.MeshLambertMaterial({ color: 0x40565a, fog: false });
  const corpoGeo = new THREE.BoxGeometry(1, 1, 1);
  const tetoGeo = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();
  for (let mi = 0; mi < mats.length; mi++) {
    const partes = [];
    for (const c of ativos.filter((e) => e.material === mi)) {
      partes.push({ ...c, y: c.base - 0.10, w: c.w, d: c.d, h: c.h });
      if (c.sobrado) partes.push({ ...c, y: c.base + c.h - 0.10,
        x: c.x + Math.cos(c.ry) * c.desloca, z: c.z - Math.sin(c.ry) * c.desloca,
        w: c.w * 0.62, d: c.d * 0.68, h: 1.65, upper: true });
    }
    const mesh = new THREE.InstancedMesh(corpoGeo, mats[mi], partes.length);
    for (let i = 0; i < partes.length; i++) {
      const p = partes[i];
      dummy.position.set(p.x, p.y + p.h / 2, p.z); dummy.rotation.set(0, p.ry, 0);
      dummy.scale.set(p.w, p.h, p.d); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.name = `horizonte_casario_${mi}`; mesh.frustumCulled = false; scene.add(mesh);
  }
  const tetos = [];
  for (const c of ativos) {
    const upperH = c.sobrado ? 1.65 : 0;
    const tx = c.x + (c.sobrado ? Math.cos(c.ry) * c.desloca : 0);
    const tz = c.z - (c.sobrado ? Math.sin(c.ry) * c.desloca : 0);
    tetos.push({ x: tx, z: tz, y: c.base + c.h + upperH - 0.10,
      w: (c.sobrado ? c.w * 0.62 : c.w) + 0.28,
      d: (c.sobrado ? c.d * 0.68 : c.d) + 0.28, ry: c.ry });
  }
  const roofs = new THREE.InstancedMesh(tetoGeo, telhado, tetos.length);
  for (let i = 0; i < tetos.length; i++) {
    const p = tetos[i]; dummy.position.set(p.x, p.y + 0.06, p.z); dummy.rotation.set(0, p.ry, 0);
    dummy.scale.set(p.w, 0.12, p.d); dummy.updateMatrix(); roofs.setMatrixAt(i, dummy.matrix);
  }
  roofs.name = 'horizonte_lajes'; roofs.frustumCulled = false; scene.add(roofs);
  const comCaixa = ativos.filter((_, i) => i % 9 === 0);
  const tanks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34, 0.40, 0.66, 8), caixaMat, comCaixa.length);
  for (let i = 0; i < comCaixa.length; i++) {
    const c = comCaixa[i], upperH = c.sobrado ? 1.65 : 0;
    const tx = c.x + (c.sobrado ? Math.cos(c.ry) * c.desloca : 0);
    const tz = c.z - (c.sobrado ? Math.sin(c.ry) * c.desloca : 0);
    dummy.position.set(tx, c.base + c.h + upperH + 0.35, tz);
    dummy.rotation.set(0, c.ry, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); tanks.setMatrixAt(i, dummy.matrix);
  }
  tanks.name = 'horizonte_caixas_agua'; tanks.frustumCulled = false; scene.add(tanks);
}

export function makeHorizon(scene, opts = {}) {
  if (typeof document === 'undefined') return;   // arnês node: sem canvas, sem horizonte
  const saia = new THREE.Mesh(new THREE.CircleGeometry(430, 48),
    new THREE.MeshBasicMaterial({ color: opts.chao ?? 0x9aa38f, fog: false }));
  saia.rotation.x = -Math.PI / 2; saia.position.y = -0.55; saia.renderOrder = -2; saia.frustumCulled = false;
  scene.add(saia);
  faixaMorros(scene, { raio0: HORIZON_INNER_RADIUS, raio1: 72, h0: () => -0.5,
    h1: (t) => PERFIL_BAIXO(t) * 0.82, cor: 0x829589 });
  faixaMorros(scene, { raio0: 72, raio1: 140, h0: (t) => PERFIL_BAIXO(t) * 0.82,
    h1: PERFIL_BAIXO, cor: 0x829589 });
  faixaMorros(scene, { raio0: 140, raio1: 225, h0: PERFIL_BAIXO, h1: PERFIL_MEIO, cor: 0x87988d });
  faixaMorros(scene, { raio0: 225, raio1: 360, h0: PERFIL_MEIO, h1: PERFIL_LONGE, cor: 0xb5c2c9 });
  casario(scene, !!opts.low);
}
