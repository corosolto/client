// Colete e capacete PROVISÓRIOS no corpo 3P até o modelo do Mint (procure os nomes `*-provisorio`).
// Presos ao osso como o eyewear.js (boneInverse × bindMatrix, medidos pelos pesos da malha): rig intocado.
import * as THREE from 'three';

const CANAIS = ['getX', 'getY', 'getZ', 'getW'];
const COR_COLETE = 0x2f3a2c, COR_PLACA = 0x3b4636, COR_CAPACETE = 0x39432f;
let _mats = null;
const mats = () => _mats || (_mats = {
  colete: new THREE.MeshStandardMaterial({ color: COR_COLETE, roughness: 0.86, metalness: 0.05 }),
  placa: new THREE.MeshStandardMaterial({ color: COR_PLACA, roughness: 0.78, metalness: 0.08 }),
  capacete: new THREE.MeshStandardMaterial({ color: COR_CAPACETE, roughness: 0.72, metalness: 0.12 }),
});
// Geometria por corpo (clones compartilham o uuid): trocar a malha do bot não vaza geometria.
const _geo = new Map();
// Estado por modelo fora do userData: Object3D.clone() copia userData por JSON.
const _vestido = new WeakMap();

function corpoComEsqueleto(model) {
  let body = null;
  model.traverse((o) => { if (!body && o.isSkinnedMesh && o.skeleton?.bones.some((b) => b.name === 'Head')) body = o; });
  return body;
}
// Caixa dos vértices cujo peso somado nos ossos `idx` passa de `limiar` (espaço da malha).
function caixaPorOssos(body, idx, limiar) {
  const g = body.geometry, pos = g.getAttribute('position'), si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight');
  if (!pos || !si || !sw) return null;
  const box = new THREE.Box3(), p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    let w = 0;
    for (let c = 0; c < 4; c++) if (idx.has(si[CANAIS[c]](i))) w += sw[CANAIS[c]](i);
    if (w > limiar) box.expandByPoint(p.fromBufferAttribute(pos, i));
  }
  return box.isEmpty() ? null : box;
}
function prender(body, osso, idx, peca) {
  const ancora = new THREE.Group();
  ancora.name = peca.name;
  ancora.matrix.copy(body.skeleton.boneInverses[idx]).multiply(body.bindMatrix);
  ancora.matrixAutoUpdate = false;
  ancora.add(peca);
  peca.name = peca.name + '-malha';
  osso.add(ancora);
  return ancora;
}
function semAcerto(obj) {
  obj.traverse((o) => {
    o.userData.noHit = true; o.userData.selfBody = true;
    if (o.isMesh) { o.raycast = () => {}; o.castShadow = false; o.receiveShadow = true; o.frustumCulled = false; }
  });
}

function montarColete(body) {
  const bones = body.skeleton.bones;
  const tronco = new Set(bones.map((b, i) => (/^Spine\d*$/i.test(b.name) ? i : -1)).filter((i) => i >= 0));
  if (!tronco.size) return null;
  // osso mais alto do tronco (Spine02) = peito
  const peitoIdx = [...tronco].sort((a, b) => a - b).pop();
  const chave = `colete:${body.geometry.uuid}`;
  let geo = _geo.get(chave);
  if (!geo) {
    const box = caixaPorOssos(body, tronco, 0.5);
    if (!box) return null;
    const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    // cobre do diafragma à base do pescoço (20%..92% do tronco) e fica um pouco FORA da pele
    const y0 = box.min.y + s.y * 0.20, y1 = box.min.y + s.y * 0.92, h = y1 - y0;
    geo = {
      corpo: new THREE.BoxGeometry(s.x * 1.06, h, s.z * 1.14),
      placa: new THREE.BoxGeometry(s.x * 0.62, h * 0.62, s.z * 0.10),
      cy: (y0 + y1) / 2, cx: c.x, cz: c.z, frente: c.z + s.z * 0.57 + s.z * 0.04,
    };
    _geo.set(chave, geo);
  }
  const g = new THREE.Group();
  g.name = 'colete-provisorio';
  const m = mats();
  const corpo = new THREE.Mesh(geo.corpo, m.colete);
  corpo.position.set(geo.cx, geo.cy, geo.cz);
  const placa = new THREE.Mesh(geo.placa, m.placa);
  placa.position.set(geo.cx, geo.cy + (geo.corpo.parameters.height * 0.08), geo.frente);   // +Z = frente no bind (ver eyewear.js)
  g.add(corpo, placa);
  semAcerto(g);
  return prender(body, bones[peitoIdx], peitoIdx, g);
}

function montarCapacete(body) {
  const bones = body.skeleton.bones;
  const idx = bones.findIndex((b) => b.name === 'Head');
  if (idx < 0) return null;
  const chave = `capacete:${body.geometry.uuid}`;
  let geo = _geo.get(chave);
  if (!geo) {
    const box = caixaPorOssos(body, new Set([idx]), 0.65);
    if (!box) return null;
    const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    // a borda do capacete fica na testa (~58% da altura da cabeça); a cúpula passa o topo
    const base = box.min.y + s.y * 0.58;
    geo = {
      cupula: new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      rx: s.x * 0.58, ry: (box.max.y - base) * 1.12, rz: s.z * 0.60, x: c.x, y: base, z: c.z - s.z * 0.03,
    };
    _geo.set(chave, geo);
  }
  const g = new THREE.Group();
  g.name = 'capacete-provisorio';
  const cupula = new THREE.Mesh(geo.cupula, mats().capacete);
  cupula.scale.set(geo.rx, geo.ry, geo.rz);
  cupula.position.set(geo.x, geo.y, geo.z);
  g.add(cupula);
  semAcerto(g);
  return prender(body, bones[idx], idx, g);
}

// Idempotente: a chave é por modelo, então o corpo reconstruído (troca de arma) se veste sozinho.
export function vestirArmadura(model, { colete = false, capacete = false } = {}) {
  if (!model) return false;
  const chave = `${colete ? 1 : 0}${capacete ? 1 : 0}`;
  let v = _vestido.get(model);
  if (v?.chave === chave) return !!v.body;
  if (!v) _vestido.set(model, v = { chave, body: corpoComEsqueleto(model), colete: undefined, capacete: undefined });
  v.chave = chave;
  const body = v.body;
  if (!body) return false;
  if (colete && v.colete === undefined) v.colete = montarColete(body);
  if (capacete && v.capacete === undefined) v.capacete = montarCapacete(body);
  if (v.colete) v.colete.visible = !!colete;
  if (v.capacete) v.capacete.visible = !!capacete;
  return true;
}
