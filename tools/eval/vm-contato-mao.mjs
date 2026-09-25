/* A MÃO ENCOSTA NA ARMA? — distância mínima entre malha de mão e malha de arma.
 *
 * O crítico cego reprovou cinco armas com a mesma frase: "a mão de apoio não
 * encosta, fica no ar", e viu o chão entre a palma e o guarda-mão em sks, svd,
 * shotgun, carbine e awp. Na AK, aprovada, ele descreve "a luva envolve o
 * guarda-mão com oclusão correta e sem fundo aparecendo no vão".
 *
 * Contagem de pixel em quadro não decide isso — a régua antiga dava `contato
 * 0px` e `1px` para tudo, aprovada e reprovada igual. Distância em centímetros
 * decide: mão que segura tem vértice a milímetros da arma.
 *
 * ESTADO: NÃO VALIDADA. Ela lê POSITION no espaço local da malha, sem aplicar a
 * pele do esqueleto, e mão e arma vivem em espaços diferentes. A AK aprovada,
 * cuja luva visivelmente envolve o guarda-mão, sai a 83,43 cm com ZERO vértices
 * colados — resultado absurdo que prova que a régua mede a coisa errada. Só a
 * akm dá 0,15 cm, e por acidente de estrutura.
 *
 * Ela fica no repositório PORQUE reprova a si mesma: o guard de calibração
 * abaixo sai vermelho enquanto a AK não medir perto. Para valer, precisa medir
 * com o esqueleto aplicado (Three no navegador, como vm-retrato-golden faz), não
 * lendo o buffer cru.
 *
 *   node tools/eval/vm-contato-mao.mjs
 *   node tools/eval/vm-contato-mao.mjs --dir=public/models/viewmodels/varre
 */
import fs from 'node:fs';
import path from 'node:path';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`)
  .split('=').slice(1).join('=');
const DIR = arg('dir', 'public/models/viewmodels/coro');
const SO = arg('armas', '').split(',').filter(Boolean);
const MAO = /CoroSolto_(?:FP_(?:Hand|Gloves?|Cloth)|Mandrake_Sleeves)/i;
const TIPO = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array,
               5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const TAM = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function lerGlb(f) {
  const b = fs.readFileSync(f);
  const l = b.readUInt32LE(12);
  const json = JSON.parse(b.slice(20, 20 + l).toString('utf8'));
  let o = 20 + l; let bin = null;
  while (o < b.length) {
    const n = b.readUInt32LE(o);
    if (b.readUInt32LE(o + 4) === 0x004e4942) { bin = b.slice(o + 8, o + 8 + n); break; }
    o += 8 + n;
  }
  return { json, bin };
}
function acessor(json, bin, i) {
  const a = json.accessors[i];
  const bv = json.bufferViews[a.bufferView];
  const A = TIPO[a.componentType]; const t = TAM[a.componentType]; const n = COMP[a.type];
  const s = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const p = bv.byteStride && bv.byteStride !== n * t ? bv.byteStride / t : n;
  const r = new A(bin.buffer, bin.byteOffset + s, p * (a.count - 1) + n);
  if (p === n) return r;
  const out = new A(a.count * n);
  for (let k = 0; k < a.count; k += 1) for (let c = 0; c < n; c += 1) out[k * n + c] = r[k * p + c];
  return out;
}

const arquivos = fs.readdirSync(DIR).filter((f) => f.endsWith('.glb'))
  .filter((f) => !SO.length || SO.some((a) => f.startsWith(a))).sort();

console.log('\n  arma        dist. mín. mão↔arma    vértices de mão a menos de 1 cm');
console.log('  ' + '-'.repeat(66));
const linhas = [];
for (const f of arquivos) {
  const { json, bin } = lerGlb(path.join(DIR, f));
  const nome = f.replace(/-hires\.glb$|\.glb$/, '');
  const maoMat = new Set((json.materials || []).map((m, i) => [i, m.name])
    .filter(([, n]) => MAO.test(n || '')).map(([i]) => i));
  const pontos = { mao: [], arma: [] };
  for (const m of json.meshes || []) {
    for (const p of m.primitives || []) {
      const P = acessor(json, bin, p.attributes.POSITION);
      const alvo = maoMat.has(p.material) ? pontos.mao : pontos.arma;
      const passo = Math.max(1, Math.floor((P.length / 3) / 2500));   // amostra: 2500 pontos bastam
      for (let v = 0; v < P.length / 3; v += passo) alvo.push([P[v * 3], P[v * 3 + 1], P[v * 3 + 2]]);
    }
  }
  if (!pontos.mao.length || !pontos.arma.length) {
    console.log(`  ${nome.padEnd(11)} sem malha de ${!pontos.mao.length ? 'mão' : 'arma'}`);
    continue;
  }
  let min = Infinity; let perto = 0;
  for (const h of pontos.mao) {
    let d2 = Infinity;
    for (const a of pontos.arma) {
      const dx = h[0] - a[0]; const dy = h[1] - a[1]; const dz = h[2] - a[2];
      const s = dx * dx + dy * dy + dz * dz;
      if (s < d2) d2 = s;
    }
    const d = Math.sqrt(d2);
    if (d < min) min = d;
    if (d < 0.01) perto += 1;
  }
  linhas.push({ nome, min, perto, amostra: pontos.mao.length });
  console.log(`  ${nome.padEnd(11)} ${(min * 100).toFixed(2).padStart(8)} cm      ${String(perto).padStart(5)} de ${pontos.mao.length}`);
}
const ref = linhas.find((l) => l.nome === 'ak');
if (ref) {
  console.log(`\n  A AK aprovada encosta a ${(ref.min * 100).toFixed(2)} cm com ${ref.perto} vértices colados.`);
  const longe = linhas.filter((l) => l.nome !== 'ak' && l.min > ref.min * 3 + 0.005);
  console.log(longe.length ? `  Longe da arma: ${longe.map((l) => `${l.nome} ${(l.min * 100).toFixed(1)}cm`).join(' · ')}`
                           : '  Nenhuma arma com a mão solta em relação à AK.');
  // CALIBRAÇÃO: a AK é aprovada e a mão dela SEGURA a arma. Se ela não mede
  // perto, quem está errada é a régua — e ela precisa dizer isso, não publicar
  // um número. Ver o cabeçalho: falta aplicar a pele do esqueleto.
  if (ref.min > 0.03) {
    console.log(`\n  VERMELHO — régua não calibrada: a AK aprovada mede ${(ref.min * 100).toFixed(2)} cm.`);
    console.log('  Nenhum número acima vale. Falta aplicar a pele do esqueleto.\n');
    process.exit(1);
  }
}
console.log();
