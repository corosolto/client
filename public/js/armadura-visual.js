// Colete e capacete no corpo 3P: modelo do Mint (public/models/armadura) e, enquanto ele
// não carrega ou se falhar, a peça `*-provisorio`. Presos ao osso como o eyewear.js: rig intocado.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from './data/asseturl.js';

const CANAIS = ['getX', 'getY', 'getZ', 'getW'];
const COR_COLETE = 0x2f3a2c, COR_PLACA = 0x3b4636, COR_CAPACETE = 0x39432f;
// URL revisada por conteúdo (assetver.js, gerado por `npm run gen:assetrev`).
const GLB = { colete: assetUrl('models/armadura/colete.glb'), capacete: assetUrl('models/armadura/capacete.glb') };
const USA_GLB = typeof location === 'undefined' || new URLSearchParams(location.search).get('coleteglb') !== '0';
let _mats = null;
const mats = () => _mats || (_mats = {
  colete: new THREE.MeshStandardMaterial({ color: COR_COLETE, roughness: 0.86, metalness: 0.05 }),
  placa: new THREE.MeshStandardMaterial({ color: COR_PLACA, roughness: 0.78, metalness: 0.08 }),
  capacete: new THREE.MeshStandardMaterial({ color: COR_CAPACETE, roughness: 0.72, metalness: 0.12 }),
});
// Medidas por corpo (clones compartilham o uuid da geometria): trocar a malha do bot não refaz conta nem vaza geometria.
const _medidas = new Map(), _geo = new Map();
// Estado por modelo fora do userData: Object3D.clone() copia userData por JSON.
const _vestido = new WeakMap();
// Modelo do Mint: baixa na 1ª vez que alguém veste; `null` = falhou (fica o provisório).
const _modelo = { colete: undefined, capacete: undefined };
let _loader = null;
function carregarModelo(peca) {
  if (_modelo[peca] !== undefined || !USA_GLB) return;
  _modelo[peca] = false;   // carregando
  _loader ||= import('../vendor/meshopt_decoder.module.js').then((m) => m.MeshoptDecoder).catch(() => null)
    .then((dec) => { const l = new GLTFLoader(); if (dec) l.setMeshoptDecoder(dec); return l; });
  _loader.then((l) => l.loadAsync(GLB[peca])).then((gltf) => {
    const cena = gltf.scene, box = new THREE.Box3().setFromObject(cena);
    _modelo[peca] = { cena, box };
  }).catch((e) => { _modelo[peca] = null; console.warn(`[armadura] ${peca}.glb não carregou, fica o provisório: ${e?.message || e}`); });
}
const modeloPronto = (peca) => !!_modelo[peca];

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
/* Altura do osso no espaço da malha = média dos vértices presos a ele. Não dá para inverter o
   boneInverse: nestes GLB ele está em cm e com o deslocamento do mundo (medido: Hips em y 85, z −6171). */
function alturaDoOsso(body, idx) {
  const g = body.geometry, pos = g.getAttribute('position'), si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight');
  let soma = 0, n = 0;
  for (let i = 0; i < pos.count; i++) {
    let w = 0;
    for (let c = 0; c < 4; c++) if (si[CANAIS[c]](i) === idx) w += sw[CANAIS[c]](i);
    if (w > 0.5) { soma += pos.getY(i); n++; }
  }
  return n ? soma / n : null;
}
/* Tronco = vértices entre o quadril e o pescoço que NÃO são do braço. Medido na prancha: só pelo peso
   dos ossos Spine a caixa ficava com 0,2-0,4 m de altura (só o peito) e, num corpo, 0,17 m de largura. */
function caixaTronco(body, y0, y1, braco) {
  const g = body.geometry, pos = g.getAttribute('position'), si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight');
  const box = new THREE.Box3(), p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    if (p.y < y0 || p.y > y1) continue;
    let w = 0;
    for (let c = 0; c < 4; c++) if (braco.has(si[CANAIS[c]](i))) w += sw[CANAIS[c]](i);
    if (w < 0.3) box.expandByPoint(p);
  }
  return box.isEmpty() ? null : box;
}
const lim = (v, a, b) => Math.min(b, Math.max(a, v));
/* Medida do corpo no espaço da malha. O teto de largura é deliberadamente menor que a
   antiga fração 0,32 H: poses com braço junto ao peito faziam o colete virar um cubo. */
function medir(body) {
  const chave = body.geometry.uuid;
  if (_medidas.has(chave)) return _medidas.get(chave);
  if (!body.geometry.boundingBox) body.geometry.computeBoundingBox();
  const gb = body.geometry.boundingBox, H = gb.max.y - gb.min.y, base = gb.min.y;
  const bones = body.skeleton.bones, achar = (re) => bones.findIndex((b) => re.test(b.name));
  const troncoIdx = bones.map((b, i) => (/^Spine\d*$/i.test(b.name) ? i : -1)).filter((i) => i >= 0);
  const pescoco = achar(/^neck$/i), cabecaIdx = achar(/^Head$/);
  const braco = new Set(bones.map((b, i) => (/shoulder|arm|hand/i.test(b.name) ? i : -1)).filter((i) => i >= 0));
  const m = { chave, tronco: null, cabeca: null };
  const bc = cabecaIdx >= 0 ? caixaPorOssos(body, new Set([cabecaIdx]), 0.65) : null;
  if (troncoIdx.length && H > 0) {
    const yp = (pescoco >= 0 ? alturaDoOsso(body, pescoco) : null) ?? bc?.min.y ?? base + H * 0.82;
    const y1 = lim(yp - H * 0.02, base + H * 0.68, base + H * 0.84), y0 = y1 - H * 0.25;
    const bt = caixaTronco(body, y0, y1, braco);
    const s = bt ? bt.getSize(new THREE.Vector3()) : new THREE.Vector3(H * 0.24, 0, H * 0.14);
    const c = bt ? bt.getCenter(new THREE.Vector3()) : new THREE.Vector3((gb.min.x + gb.max.x) / 2, 0, (gb.min.z + gb.max.z) / 2);
    s.set(lim(s.x, H * 0.18, H * 0.22), y1 - y0, lim(s.z, H * 0.11, H * 0.22));
    m.tronco = { idx: Math.max(...troncoIdx), s, c, y0, y1 };
  }
  if (bc) {
    const s = bc.getSize(new THREE.Vector3()), largura = lim(s.x, H * 0.09, H * 0.15);
    const topo = Math.min(bc.max.y, bc.min.y + largura * 1.3);
    m.cabeca = { idx: cabecaIdx, largura, topo, base: topo - largura * 0.55, c: bc.getCenter(new THREE.Vector3()), prof: lim(s.z, largura * 0.9, largura * 1.2) };
  }
  _medidas.set(chave, m);
  return m;
}
function prender(body, idx, peca, nome) {
  const ancora = new THREE.Group();
  ancora.name = nome;
  ancora.matrix.copy(body.skeleton.boneInverses[idx]).multiply(body.bindMatrix);
  ancora.matrixAutoUpdate = false;
  ancora.add(peca);
  peca.traverse((o) => {
    o.userData.noHit = true; o.userData.selfBody = true;
    if (o.isMesh) { o.raycast = () => {}; o.castShadow = false; o.receiveShadow = true; o.frustumCulled = false; }
  });
  body.skeleton.bones[idx].add(ancora);
  return ancora;
}

function coleteProvisorio(body, m) {
  const t = m.tronco, h = t.y1 - t.y0, chave = `colete:${m.chave}`;
  const geo = _geo.get(chave) || _geo.set(chave, {
    corpo: new THREE.BoxGeometry(t.s.x * 1.06, h, t.s.z * 1.14),
    placa: new THREE.BoxGeometry(t.s.x * 0.62, h * 0.62, t.s.z * 0.10),
  }).get(chave);
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(geo.corpo, mats().colete);
  corpo.position.set(t.c.x, (t.y0 + t.y1) / 2, t.c.z);
  const placa = new THREE.Mesh(geo.placa, mats().placa);
  placa.position.set(t.c.x, (t.y0 + t.y1) / 2 + h * 0.08, t.c.z + t.s.z * 0.61);   // +Z = frente no bind (ver eyewear.js)
  g.add(corpo, placa);
  return prender(body, t.idx, g, 'colete-provisorio');
}
function capaceteProvisorio(body, m) {
  const k = m.cabeca, chave = 'capacete:esfera';
  const geo = _geo.get(chave) || _geo.set(chave, new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2)).get(chave);
  const cupula = new THREE.Mesh(geo, mats().capacete);
  cupula.scale.set(k.largura * 0.58, (k.topo - k.base) * 1.08, k.prof * 0.60);
  cupula.position.set(k.c.x, k.base, k.c.z - k.prof * 0.03);
  return prender(body, k.idx, cupula, 'capacete-provisorio');
}
/* Modelo do Mint vem normalizado num cubo de ~1 m com a frente em +Z (medido: o suporte de NVG
   do capacete e o painel baixo da frente do colete ficam em +Z), então o encaixe é por medida do corpo. */
function coleteMint(body, m) {
  const t = m.tronco, { cena, box } = _modelo.colete, s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const h = t.y1 - t.y0, peca = cena.clone(true);
  peca.scale.set(t.s.x * 1.12 / s.x, h / s.y, t.s.z * 1.22 / s.z);
  peca.position.set(t.c.x - c.x * peca.scale.x, (t.y0 + t.y1) / 2 - c.y * peca.scale.y, t.c.z + t.s.z * 0.04 - c.z * peca.scale.z);
  const g = new THREE.Group(); g.add(peca);
  return prender(body, t.idx, g, 'colete-mint');
}
function capaceteMint(body, m) {
  const k = m.cabeca, { cena, box } = _modelo.capacete, s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const esc = k.largura * 1.18 / s.x, peca = cena.clone(true);
  peca.scale.setScalar(esc);
  // o topo da cúpula passa um pouco do topo da cabeça; a jugular pendura abaixo, como no modelo
  peca.position.set(k.c.x - c.x * esc, k.topo + k.largura * 0.06 - box.max.y * esc, k.c.z - k.prof * 0.02 - c.z * esc);
  const g = new THREE.Group(); g.add(peca);
  return prender(body, k.idx, g, 'capacete-mint');
}

function trocarPeca(v, body, m, peca, quer) {
  const slot = v[peca] || (v[peca] = { prov: null, mint: null, mintOn: false, provOn: false });
  if (quer) carregarModelo(peca);
  const medida = peca === 'colete' ? m.tronco : m.cabeca;
  const usaMint = !!(quer && medida && modeloPronto(peca));
  if (usaMint && !slot.mint) slot.mint = (peca === 'colete' ? coleteMint : capaceteMint)(body, m);
  if (quer && !usaMint && medida && !slot.prov) slot.prov = (peca === 'colete' ? coleteProvisorio : capaceteProvisorio)(body, m);
  slot.mintOn = usaMint; slot.provOn = !!quer && !usaMint;
  aplicarVisibilidade(v, peca);
}
function aplicarVisibilidade(v, peca) {
  const slot = v[peca];
  if (!slot) return;
  if (slot.mint) slot.mint.visible = slot.mintOn && !v.oculto;
  if (slot.prov) slot.prov.visible = slot.provOn && !v.oculto;
}
// Idempotente: a chave é por modelo (inclui "modelo do Mint pronto"), então o corpo reconstruído
// (troca de arma) se veste sozinho e o provisório vira Mint quando o GLB chega.
export function vestirArmadura(model, { colete = false, capacete = false } = {}) {
  if (!model) return false;
  let v = _vestido.get(model);
  if (!v && !colete && !capacete) return false;   // ninguém vestido: não mede o corpo (partida sem colete não paga nada)
  const chave = `${colete ? 1 : 0}${capacete ? 1 : 0}${modeloPronto('colete') ? 1 : 0}${modeloPronto('capacete') ? 1 : 0}`;
  if (v?.chave === chave) return !!v.body;
  if (!v) _vestido.set(model, v = { chave, body: corpoComEsqueleto(model), oculto: false });
  v.chave = chave;
  if (!v.body) return false;
  const m = medir(v.body);
  trocarPeca(v, v.body, m, 'colete', !!colete);
  trocarPeca(v, v.body, m, 'capacete', !!capacete);
  return true;
}
// Câmera 3P dentro do corpo: o game.js esconde as malhas próprias e as peças têm que sumir junto.
export function ocultarArmadura(model, oculto) {
  const v = model && _vestido.get(model);
  if (!v || v.oculto === !!oculto) return;
  v.oculto = !!oculto;
  aplicarVisibilidade(v, 'colete'); aplicarVisibilidade(v, 'capacete');
}
