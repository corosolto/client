#!/usr/bin/env node
/* manga-tampa-check.mjs — A MANGA DO PACOTE GOLDEN NÃO PODE TERMINAR EM BURACO NEM PRETA.
   Nasceu do leque vermelho no punho (22/10/2026) e do colapso da malha quantizada
   (26/10/2026); MT8 nasceu do bloco preto fullscreen do AK hip (31/10/2026).
   Histórico completo, causa raiz e evidência: docs/visual-consistency/MANGA-NORMAIS.md

   O QUE MEDE (geometria de verdade, sem browser):
   MT1  um tubo aberto tem as bocas detectadas e, depois da tampa, ZERO laços de borda.
   MT2  a tampa acrescenta exatamente um triângulo por aresta de boca e um vértice por boca.
   MT3  os vértices novos carregam pele (skinIndex/skinWeight) — tampa sem peso ficaria
        parada no espaço enquanto o braço anda.
   MT4  rodar a tampa duas vezes não duplica geometria (idempotente).
   MT5  o runtime chama a tampa só no caminho golden e com kill-switch `?mangatampa=0`.
   MT6  MALHA QUANTIZADA (é a do jogo): POSITION/NORMAL em Int16 NORMALIZADO e skinWeight
        em Uint8 normalizado, como o GLTFLoader entrega o golden — a tampa não pode
        encolher a caixa envolvente.
   MT7  o peso de pele do vértice novo sobrevive à quantização.
   MT8  NORMAL Int16 normalizado em geometria de área pequena (a manga fina do golden):
        nenhuma normal zero, e toda face válida produz normal unitária e finita. É o
        bloco preto do AK hip: Math.round(x*32767) no acumulador zera a contribuição
        de cada face pequena e o PBR recebe normal (0,0,0).

   REPRODUZ: node tools/eval/manga-tampa-check.mjs
   MUTANTES: --mutante=sem-tampa    não tampa                          -> MT1/MT2 vermelhas
             --mutante=tampa-crua   copia atributo pelo array cru      -> MT6/MT7 vermelhas
             --mutante=normal-int16 restaura NORMAL Int16 antes do     -> MT8 vermelha
                                   compute (o estado do bloco preto de 31/10) */
import { readFileSync } from 'node:fs';
import './harness.mjs';   // DOM stub + ponte do three vendorizado

const THREE = await import('three');
const { sleeveOpenings, capSleeveOpenings } = await import('../../public/js/vmsleeve.js');

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUTANTE && !['sem-tampa', 'tampa-crua', 'normal-int16'].includes(MUTANTE)) { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(2); }

let falhas = 0;
const chk = (id, ok, ev) => { console.log(`${ok ? 'PASSA' : 'FALHA'} ${id} — ${ev}`); if (!ok) falhas++; };

// Tubo aberto nas duas pontas, com pele: é a forma da manga.
function tuboAberto(segmentos = 16) {
  const geo = new THREE.CylinderGeometry(0.05, 0.05, 0.3, segmentos, 1, true).toNonIndexed();
  const n = geo.attributes.position.count;
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(n * 4), 4));
  const pesos = new Float32Array(n * 4);
  for (let i = 0; i < n; i += 1) pesos[i * 4] = 1;
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(pesos, 4));
  return new THREE.Mesh(geo);
}

const malha = tuboAberto();
const antes = sleeveOpenings(malha.geometry);
const trisAntes = malha.geometry.attributes.position.count / 3;
const vertsAntes = malha.geometry.attributes.position.count;
const arestas = antes.loops.reduce((s, l) => s + l.length, 0);
const tampadas = MUTANTE === 'sem-tampa' ? 0 : capSleeveOpenings(malha);
const depois = sleeveOpenings(malha.geometry);
const trisDepois = (malha.geometry.index ? malha.geometry.index.count : malha.geometry.attributes.position.count) / 3;

chk('MT1', antes.loops.length === 2 && depois.loops.length === 0,
  `bocas ${antes.loops.map((l) => l.length).join('+') || '—'} -> ${depois.loops.length} abertas (tampadas: ${tampadas})`);
chk('MT2', trisDepois === trisAntes + arestas
  && malha.geometry.attributes.position.count === vertsAntes + antes.loops.length,
  `triângulos ${trisAntes} -> ${trisDepois} (esperado +${arestas}); vértices +${malha.geometry.attributes.position.count - vertsAntes}`);
const sw = malha.geometry.attributes.skinWeight;
const ultimo = sw.count - 1;
chk('MT3', MUTANTE === 'sem-tampa' || (sw.getX(ultimo) + sw.getY(ultimo) + sw.getZ(ultimo) + sw.getW(ultimo)) > 0.99,
  `peso do vértice da tampa = ${(sw.getX(ultimo) + sw.getY(ultimo) + sw.getZ(ultimo) + sw.getW(ultimo)).toFixed(2)}`);
const trisAntesDeRepetir = trisDepois;
capSleeveOpenings(malha);
const trisRepetido = (malha.geometry.index ? malha.geometry.index.count : malha.geometry.attributes.position.count) / 3;
chk('MT4', trisRepetido === trisAntesDeRepetir, `segunda chamada manteve ${trisRepetido} triângulos`);

const runtime = readFileSync(new URL('../../public/js/authoredvm.js', import.meta.url), 'utf8');
chk('MT5', /golden && _QS\?\.get\('mangatampa'\) !== '0'[^\n]*capSleeveOpenings/.test(runtime),
  'authoredvm tampa só o golden e respeita ?mangatampa=0');

/* ---- MT6/MT7: a malha do jogo é QUANTIZADA (KHR_mesh_quantization) ---- */
// POSITION e NORMAL em Int16 normalizado, skinWeight em Uint8 normalizado: a mesma forma
// que o GLTFLoader entrega para ak-hires.glb (o GLB golden da AK).
function tuboQuantizado(segmentos = 16) {
  const base = tuboAberto(segmentos);
  const geo = base.geometry;
  const quantiza = (nome, Tipo, escala) => {
    const attr = geo.attributes[nome];
    const arr = new Tipo(attr.count * attr.itemSize);
    const novo = new THREE.BufferAttribute(arr, attr.itemSize, true);
    for (let i = 0; i < attr.count; i += 1) {
      novo.setXYZ?.(i, attr.getX(i) * escala, attr.getY(i) * escala, attr.getZ(i) * escala);
    }
    geo.setAttribute(nome, novo);
  };
  // escala 1: as posições do tubo (≤0,15) e as normais (unitárias) cabem em [-1,1],
  // que é o domínio do Int16 normalizado.
  quantiza('position', Int16Array, 1);
  quantiza('normal', Int16Array, 1);
  const sw = geo.attributes.skinWeight;
  const pesos = new THREE.BufferAttribute(new Uint8Array(sw.count * 4), 4, true);
  for (let i = 0; i < sw.count; i += 1) pesos.setXYZW(i, 1, 0, 0, 0);
  geo.setAttribute('skinWeight', pesos);
  return base;
}

const malhaQ = tuboQuantizado();
malhaQ.geometry.computeBoundingBox();
const caixaAntes = malhaQ.geometry.boundingBox.clone();
const verticesQ = malhaQ.geometry.attributes.position.clone();
if (MUTANTE === 'tampa-crua') {
  // Estado do relato de 26/10: copia os atributos escrevendo o valor DESNORMALIZADO no array cru.
  const geo = malhaQ.geometry, pos = geo.attributes.position;
  for (const nome of Object.keys(geo.attributes)) {
    const attr = geo.attributes[nome], item = attr.itemSize;
    const arr = new attr.array.constructor((pos.count + 2) * item);
    const g = ['getX', 'getY', 'getZ', 'getW'];
    for (let i = 0; i < attr.count; i += 1) for (let c = 0; c < item; c += 1) arr[i * item + c] = attr[g[c]](i);
    geo.setAttribute(nome, new THREE.BufferAttribute(arr, item, attr.normalized));
  }
} else capSleeveOpenings(malhaQ);
malhaQ.geometry.computeBoundingBox();
const caixaDepois = malhaQ.geometry.boundingBox.clone();
const tam = (c) => c.getSize(new THREE.Vector3());
const antesT = tam(caixaAntes), depoisT = tam(caixaDepois);
chk('MT6', depoisT.x > antesT.x * 0.98 && depoisT.y > antesT.y * 0.98 && depoisT.z > antesT.z * 0.98,
  `malha quantizada mantém o tamanho: ${antesT.toArray().map((v) => v.toFixed(4)).join(' × ')} -> ${depoisT.toArray().map((v) => v.toFixed(4)).join(' × ')}`);
const swQ = malhaQ.geometry.attributes.skinWeight;
let somaMin = 2;
for (let i = 0; i < swQ.count; i += 1) somaMin = Math.min(somaMin, swQ.getX(i) + swQ.getY(i) + swQ.getZ(i) + swQ.getW(i));
chk('MT7', somaMin > 0.99, `pior peso de pele na malha quantizada = ${somaMin.toFixed(3)} (tem de ser 1)`);

/* ---- MT8: o bloco preto do AK hip (31/10/2026) ---- */
// Área pequena reproduz a perda no acumulador Int16 do GLB real (293 normais zero).
// Causa e evidência em MANGA-NORMAIS.md; o material original é preservado.
function tuboFinoQuantizado() {
  const geo = new THREE.CylinderGeometry(0.004, 0.004, 0.004, 16, 1, true);
  const n = geo.attributes.position.count;
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(n * 4), 4));
  const pesos = new THREE.BufferAttribute(new Uint8Array(n * 4), 4, true);
  for (let i = 0; i < n; i += 1) pesos.setXYZW(i, 1, 0, 0, 0);
  geo.setAttribute('skinWeight', pesos);
  const quantiza = (nome) => {
    const attr = geo.attributes[nome];
    const novo = new THREE.BufferAttribute(new Int16Array(attr.count * 3), 3, true);
    for (let i = 0; i < attr.count; i += 1) novo.setXYZ(i, attr.getX(i), attr.getY(i), attr.getZ(i));
    geo.setAttribute(nome, novo);
  };
  quantiza('position');
  quantiza('normal');
  return new THREE.Mesh(geo);
}

// Estado pré-fix: o cap mantinha o NORMAL em Int16 normalizado e chamava computeVertexNormals
// direto — é o caminho que o mutante --mutante=normal-int16 restaura.
function recomputaComoAntes(mesh) {
  const n = mesh.geometry.attributes.normal;
  const q = new THREE.BufferAttribute(new Int16Array(n.count * 3), 3, true);
  for (let i = 0; i < n.count; i += 1) q.setXYZ(i, n.getX(i), n.getY(i), n.getZ(i));
  mesh.geometry.setAttribute('normal', q);
  mesh.geometry.computeVertexNormals();
}

function estadoDasNormais(geo) {
  const norm = geo.attributes.normal;
  let zero = 0;
  for (let i = 0; i < norm.count; i += 1) {
    const l = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
    if (!Number.isFinite(l) || l < 1e-6) zero += 1;
  }
  const pos = geo.attributes.position;
  const idx = geo.index;
  const count = idx ? idx.count : pos.count;
  const at = (i) => (idx ? idx.getX(i) : i);
  const validos = new Uint8Array(pos.count);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const cb = new THREE.Vector3(), ab = new THREE.Vector3();
  for (let t = 0; t < count; t += 3) {
    a.fromBufferAttribute(pos, at(t)); b.fromBufferAttribute(pos, at(t + 1)); c.fromBufferAttribute(pos, at(t + 2));
    cb.subVectors(c, b); ab.subVectors(a, b); cb.cross(ab);
    if (cb.lengthSq() > 1e-24) { validos[at(t)] = 1; validos[at(t + 1)] = 1; validos[at(t + 2)] = 1; }
  }
  let fora = 0, cobertos = 0;
  for (let i = 0; i < norm.count; i += 1) {
    if (!validos[i]) continue;
    cobertos += 1;
    const l = Math.hypot(norm.getX(i), norm.getY(i), norm.getZ(i));
    if (!Number.isFinite(l) || Math.abs(l - 1) > 0.01) fora += 1;
  }
  return { zero, fora, cobertos };
}

const malhaF = tuboFinoQuantizado();
const bocasF = sleeveOpenings(malhaF.geometry).loops.length;
capSleeveOpenings(malhaF);
if (MUTANTE === 'normal-int16') recomputaComoAntes(malhaF);
const posFix = estadoDasNormais(malhaF.geometry);

const malhaBug = tuboFinoQuantizado();
capSleeveOpenings(malhaBug);
recomputaComoAntes(malhaBug);
const preFix = estadoDasNormais(malhaBug.geometry);

chk('MT8', preFix.zero > 0 && posFix.zero === 0 && posFix.fora === 0,
  `${posFix.cobertos} vértices de faces válidas: zero=${posFix.zero}, fora da unidade=${posFix.fora} `
  + `(bocas tampadas: ${bocasF}; estado pré-fix reproduz ${preFix.zero}/${preFix.cobertos} normais zero — era o bloco preto)`);

let erroQ = 0;
const resultadoQ = malhaQ.geometry.attributes.position;
for (let i = 0; i < verticesQ.count; i++) for (const c of ['getX', 'getY', 'getZ']) erroQ = Math.max(erroQ, Math.abs(verticesQ[c](i) - resultadoQ[c](i)));
chk('MT9', erroQ <= 1e-6, `posição decodificada preservada: erro máximo ${erroQ}`);

process.exit(falhas ? 1 : 0);
