/* O CARREGADOR É UMA ILHA DA MALHA? — medição antes de mexer no construtor.
 *
 * O construtor separa o pente por CAIXA: uma janela em x/z, autorada por arma.
 * O dono testou as armas novas e o veredito bate sempre no mesmo ponto: "fica a
 * parte de cima do pente" (m4), "sai parte do cano e fica parte do pente"
 * (scar), "tira só a parte debaixo do pente" (uzi). Caixa corta o ESPAÇO; o
 * carregador é uma PEÇA. Onde a peça não couber num paralelepípedo, a caixa
 * sempre vai deixar sobra ou levar vizinho junto.
 *
 * Esta régua não conserta nada: mede se existe alternativa. Para cada GLB golden
 * ela acha os componentes conexos da malha da arma (união por posição de vértice
 * coincidente) e mostra, de cada um: triângulos, caixa, e quanto dele o corte de
 * hoje já pinta de pente. Se o carregador for uma ilha própria, o corte vira
 * exato e seis armas fecham de uma vez.
 *
 *   node tools/eval/vm-ilhas-pente.mjs
 *   node tools/eval/vm-ilhas-pente.mjs --armas=m4,scar,uzi
 */
import fs from 'node:fs';
import path from 'node:path';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`)
  .split('=').slice(1).join('=');
const DIR = 'public/models/viewmodels/coro';
const SO = arg('armas', '').split(',').filter(Boolean);
const MAO = /CoroSolto_(?:FP_(?:Hand|Gloves?|Cloth)|Mandrake_Sleeves)/i;

function lerGlb(arquivo) {
  const b = fs.readFileSync(arquivo);
  const jsonLen = b.readUInt32LE(12);
  const json = JSON.parse(b.slice(20, 20 + jsonLen).toString('utf8'));
  let off = 20 + jsonLen;
  let bin = null;
  while (off < b.length) {
    const len = b.readUInt32LE(off);
    const tipo = b.readUInt32LE(off + 4);
    if (tipo === 0x004e4942) { bin = b.slice(off + 8, off + 8 + len); break; }
    off += 8 + len;
  }
  return { json, bin };
}

const TIPO = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2],
               5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function acessor(json, bin, idx) {
  const a = json.accessors[idx];
  const bv = json.bufferViews[a.bufferView];
  const [Arr, tam] = TIPO[a.componentType];
  const n = COMP[a.type];
  const inicio = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const passo = bv.byteStride && bv.byteStride !== n * tam ? bv.byteStride / tam : n;
  const bruto = new Arr(bin.buffer, bin.byteOffset + inicio, passo * (a.count - 1) + n);
  if (passo === n) return bruto;
  const saida = new Arr(a.count * n);
  for (let i = 0; i < a.count; i += 1) for (let c = 0; c < n; c += 1) saida[i * n + c] = bruto[i * passo + c];
  return saida;
}

/* Une vértices por posição (quantizada a 0,1 mm) e depois triângulos que
   compartilham vértice: é o que separa o carregador do corpo da arma. */
function componentes(pos, idx) {
  const chave = new Map();
  const canon = new Int32Array(pos.length / 3);
  for (let v = 0; v < pos.length / 3; v += 1) {
    const k = `${Math.round(pos[v * 3] * 1e4)},${Math.round(pos[v * 3 + 1] * 1e4)},${Math.round(pos[v * 3 + 2] * 1e4)}`;
    if (!chave.has(k)) chave.set(k, v);
    canon[v] = chave.get(k);
  }
  const pai = new Int32Array(pos.length / 3).map((_, i) => i);
  const acha = (x) => { while (pai[x] !== x) { pai[x] = pai[pai[x]]; x = pai[x]; } return x; };
  const une = (a, b) => { const ra = acha(a); const rb = acha(b); if (ra !== rb) pai[rb] = ra; };
  for (let t = 0; t < idx.length; t += 3) {
    une(canon[idx[t]], canon[idx[t + 1]]);
    une(canon[idx[t + 1]], canon[idx[t + 2]]);
  }
  const grupos = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const r = acha(canon[idx[t]]);
    if (!grupos.has(r)) grupos.set(r, []);
    grupos.get(r).push(t / 3);
  }
  return grupos;
}

const armas = fs.readdirSync(DIR).filter((f) => f.endsWith('-hires.glb'))
  .map((f) => f.replace('-hires.glb', ''))
  .filter((a) => !SO.length || SO.includes(a)).sort();

console.log('\n  arma     ilhas  a maior   as candidatas a pente (tri · % · altura da caixa)');
console.log('  ' + '-'.repeat(86));
const resumo = [];
for (const arma of armas) {
  const { json, bin } = lerGlb(path.join(DIR, `${arma}-hires.glb`));
  const maoMats = new Set((json.materials || [])
    .map((m, i) => [i, m.name]).filter(([, n]) => MAO.test(n || '')).map(([i]) => i));
  let total = 0; const ilhas = [];
  for (const malha of json.meshes || []) {
    for (const prim of malha.primitives || []) {
      if (maoMats.has(prim.material)) continue;
      const pos = acessor(json, bin, prim.attributes.POSITION);
      const idx = prim.indices != null ? acessor(json, bin, prim.indices)
        : Uint32Array.from({ length: pos.length / 3 }, (_, i) => i);
      const grupos = componentes(pos, idx);
      total += idx.length / 3;
      for (const tris of grupos.values()) {
        const caixa = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
        for (const t of tris) for (let c = 0; c < 3; c += 1) {
          const v = idx[t * 3 + c];
          for (let e = 0; e < 3; e += 1) {
            caixa[e] = Math.min(caixa[e], pos[v * 3 + e]);
            caixa[3 + e] = Math.max(caixa[3 + e], pos[v * 3 + e]);
          }
        }
        ilhas.push({ tris: tris.length, caixa });
      }
    }
  }
  ilhas.sort((a, b) => b.tris - a.tris);
  const maior = ilhas[0]?.tris || 0;
  // Candidata a pente: ilha entre 1% e 20% da malha — faixa do pente da AK.
  const cand = ilhas.filter((i) => i.tris / total >= 0.01 && i.tris / total <= 0.20);
  const txt = cand.slice(0, 3).map((i) =>
    `${i.tris}·${(i.tris / total * 100).toFixed(1)}%·${((i.caixa[4] - i.caixa[1]) * 100).toFixed(1)}cm`).join('  ');
  console.log(`  ${arma.padEnd(8)} ${String(ilhas.length).padStart(4)}  ${String(maior).padStart(6)}   ${txt || '(nenhuma na faixa)'}`);
  resumo.push({ arma, ilhas: ilhas.length, total, candidatas: cand.length });
}
const soUma = resumo.filter((r) => r.candidatas === 1).map((r) => r.arma);
const nenhuma = resumo.filter((r) => r.candidatas === 0).map((r) => r.arma);
console.log(`\n  ${soUma.length}/${resumo.length} com UMA candidata só (corte por ilha seria exato): ${soUma.join(' ') || '-'}`);
if (nenhuma.length) console.log(`  sem candidata na faixa: ${nenhuma.join(' ')}`);
console.log();
