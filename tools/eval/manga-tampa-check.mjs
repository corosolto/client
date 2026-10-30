#!/usr/bin/env node
/* manga-tampa-check.mjs — A MANGA DO PACOTE GOLDEN NÃO PODE TERMINAR EM BURACO.
   POR QUE EXISTE: medido em 22/10/2026, no jogo real, enquanto se calibrava a inspeção.
   A malha `coro_solto_hires_project_sleeves` da AK golden tem DUAS bocas abertas (laços de
   borda de 32 e 24 vértices): girar o pacote mostra o interior do tubo — o "leque vermelho"
   no punho direito. A extensão do produto K (`extendSleeveOpenings`) não serve aqui: no
   golden ela projeta a manga pelo lado errado e vira um mastro atravessando a tela.
   `capSleeveOpenings` só FECHA a boca, no espaço de bind: um vértice no centro do laço e
   um leque até ele. Custo medido na AK: 9.930 -> 9.986 triângulos (+56).
   Evidência: tools/eval/asset-evidence/manga-tampa-20261022/

   O QUE MEDE (geometria de verdade, sem browser):
   MT1  um tubo aberto tem as bocas detectadas e, depois da tampa, ZERO laços de borda.
   MT2  a tampa acrescenta exatamente um triângulo por aresta de boca e um vértice por boca.
   MT3  os vértices novos carregam pele (skinIndex/skinWeight) — tampa sem peso ficaria
        parada no espaço enquanto o braço anda.
   MT4  rodar a tampa duas vezes não duplica geometria (idempotente).
   MT5  o runtime chama a tampa só no caminho golden e com kill-switch `?mangatampa=0`.
   MT6  MALHA QUANTIZADA (é a do jogo): o GLB golden vem com KHR_mesh_quantization —
        POSITION/NORMAL em Int16 NORMALIZADO e skinWeight em Uint8 normalizado. A tampa não
        pode encolher a malha: a caixa envolvente depois tem de ser a mesma de antes.
        Esta cláusula nasceu do relato do dono em 26/10/2026 ("quando equipa a AK-47 o braço
        do personagem some, apenas nesta arma"): a cópia dos atributos era feita no ARRAY
        CRU com valores já desnormalizados (`getX` devolve -0,88; o Int16Array trunca pra 0),
        e a manga da AK — única arma golden — colapsava num ponto. Medido no jogo: a manga
        saiu de 0,00% para 3,93% da tela. O tubo Float32 do MT1-MT4 passava verde com o jogo
        quebrado, porque Float32 não é normalizado: a régua media a malha errada.
   MT7  o peso de pele do vértice novo sobrevive à quantização (tampa sem peso fica parada
        no espaço enquanto o braço anda).

   REPRODUZ: node tools/eval/manga-tampa-check.mjs [--mutante=sem-tampa|tampa-crua]
   MUTANTES: --mutante=sem-tampa  não tampa                       -> MT1/MT2 vermelhas
             --mutante=tampa-crua copia atributo pelo array cru   -> MT6/MT7 vermelhas
                                  (é exatamente o estado do relato) */
import { readFileSync } from 'node:fs';
import './harness.mjs';   // DOM stub + ponte do three vendorizado

const THREE = await import('three');
const { sleeveOpenings, capSleeveOpenings } = await import('../../public/js/vmsleeve.js');

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUTANTE && !['sem-tampa', 'tampa-crua'].includes(MUTANTE)) { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(2); }

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
// Int16 normalizado em position/normal e Uint8 normalizado em skinWeight: a mesma forma que
// o GLTFLoader entrega para ak-hires.glb (o GLB golden da AK).
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
  // escala 1: as posições do tubo (≤0,15) cabem em [-1,1], que é o domínio do Int16 normalizado
  quantiza('position', Int16Array, 1);
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
  // Estado do relato: copia os atributos escrevendo o valor DESNORMALIZADO no array cru.
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

let erroQ = 0;
const resultadoQ = malhaQ.geometry.attributes.position;
for (let i = 0; i < verticesQ.count; i++) for (const c of ['getX', 'getY', 'getZ']) erroQ = Math.max(erroQ, Math.abs(verticesQ[c](i) - resultadoQ[c](i)));
chk('MT8', erroQ <= 1e-6, `posição decodificada preservada: erro máximo ${erroQ}`);

process.exit(falhas ? 1 : 0);
