/* O PENTE ESTICA EM AGULHAS NA TROCA? — mede peso de osso partido.
 *
 * O crítico cego viu em 13/09, em cinco armas de uma vez: "a malha do
 * carregador se abre em triângulos chapados e afilados no instante da troca",
 * m4, scar, uzi, m92 e a própria AK (nela a mão cobre, por isso passava).
 *
 * A assinatura é de vértice com peso DIVIDIDO: parte do vértice segue o osso
 * `Mag`, parte fica no corpo. Quando o osso se afasta na recarga, o triângulo
 * que tem vértices dos dois lados vira uma lasca esticada entre os dois.
 *
 * Mede, por GLB: quantos vértices têm peso em `Mag*` estritamente entre 0 e 1.
 * Zero é o alvo — o carregador é peça rígida, ou vai inteiro com o osso ou fica.
 *
 *   node tools/eval/vm-peso-pente.mjs
 *   node tools/eval/vm-peso-pente.mjs --dir=public/models/viewmodels/prova
 */
import fs from 'node:fs';
import path from 'node:path';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`)
  .split('=').slice(1).join('=');
const DIR = arg('dir', 'public/models/viewmodels/coro');
const SO = arg('armas', '').split(',').filter(Boolean);
const TIPO = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array,
               5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const TAM = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function lerGlb(arquivo) {
  const b = fs.readFileSync(arquivo);
  const jsonLen = b.readUInt32LE(12);
  const json = JSON.parse(b.slice(20, 20 + jsonLen).toString('utf8'));
  let off = 20 + jsonLen; let bin = null;
  while (off < b.length) {
    const len = b.readUInt32LE(off);
    if (b.readUInt32LE(off + 4) === 0x004e4942) { bin = b.slice(off + 8, off + 8 + len); break; }
    off += 8 + len;
  }
  return { json, bin };
}
function acessor(json, bin, idx) {
  const a = json.accessors[idx];
  const bv = json.bufferViews[a.bufferView];
  const Arr = TIPO[a.componentType]; const tam = TAM[a.componentType];
  const n = COMP[a.type];
  const inicio = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const passo = bv.byteStride && bv.byteStride !== n * tam ? bv.byteStride / tam : n;
  const bruto = new Arr(bin.buffer, bin.byteOffset + inicio, passo * (a.count - 1) + n);
  if (passo === n) return { d: bruto, n, norm: a.normalized, tipo: a.componentType };
  const saida = new Arr(a.count * n);
  for (let i = 0; i < a.count; i += 1) for (let c = 0; c < n; c += 1) saida[i * n + c] = bruto[i * passo + c];
  return { d: saida, n, norm: a.normalized, tipo: a.componentType };
}
const desnorm = (v, tipo) => (tipo === 5121 ? v / 255 : tipo === 5123 ? v / 65535 : v);

const arquivos = fs.readdirSync(DIR).filter((f) => f.endsWith('.glb'))
  .filter((f) => !SO.length || SO.some((a) => f.startsWith(a))).sort();

console.log('\n  arma       vértices no pente   PARTIDOS (0<peso<1)   triângulos mistos');
console.log('  ' + '-'.repeat(72));
let ruins = 0;
for (const f of arquivos) {
  const { json, bin } = lerGlb(path.join(DIR, f));
  const nome = f.replace(/-hires\.glb$|\.glb$/, '');
  const ossos = new Set();
  (json.nodes || []).forEach((nd, i) => { if (/^mag/i.test(nd.name || '')) ossos.add(i); });
  const peleMag = new Set();
  for (const pele of json.skins || []) {
    (pele.joints || []).forEach((no, j) => { if (ossos.has(no)) peleMag.add(j); });
  }
  let noPente = 0; let partidos = 0; let mistos = 0;
  for (const malha of json.meshes || []) {
    for (const prim of malha.primitives || []) {
      const aJ = prim.attributes.JOINTS_0; const aW = prim.attributes.WEIGHTS_0;
      if (aJ == null || aW == null) continue;
      const J = acessor(json, bin, aJ); const W = acessor(json, bin, aW);
      const total = J.d.length / J.n;
      const pesoMag = new Float32Array(total);
      for (let v = 0; v < total; v += 1) {
        let soma = 0;
        for (let c = 0; c < J.n; c += 1) {
          if (peleMag.has(J.d[v * J.n + c])) soma += desnorm(W.d[v * W.n + c], W.tipo);
        }
        pesoMag[v] = soma;
        if (soma > 0.001) noPente += 1;
        if (soma > 0.02 && soma < 0.98) partidos += 1;
      }
      const idx = prim.indices != null ? acessor(json, bin, prim.indices).d : null;
      if (idx) {
        for (let t = 0; t < idx.length; t += 3) {
          const a = pesoMag[idx[t]] > 0.5; const b = pesoMag[idx[t + 1]] > 0.5; const c = pesoMag[idx[t + 2]] > 0.5;
          if (!(a === b && b === c)) mistos += 1;
        }
      }
    }
  }
  const mau = partidos > 0 || mistos > 0;
  if (mau) ruins += 1;
  console.log(`  ${nome.padEnd(10)} ${String(noPente).padStart(10)}   ${String(partidos).padStart(14)}   ${String(mistos).padStart(14)}  ${mau ? '  ← estica' : ''}`);
}
console.log(`\n  ${arquivos.length - ruins}/${arquivos.length} sem vértice partido nem triângulo entre os dois lados\n`);
process.exit(ruins ? 1 : 0);
