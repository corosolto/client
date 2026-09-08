/* costura-peso.mjs — TIRA o peso que um vértice tem em osso DISTANTE do seu dono.
   ═══════════════════════════════════════════════════════════════════════════════════
   O DEFEITO, MEDIDO (07-08/09)

   Um vértice pode ter até 4 pesos. Quando dois desses ossos estão longe um do outro na
   HIERARQUIA do esqueleto — carne dividida entre a cabeça e o quadril, por exemplo — cada
   quadro puxa esse vértice para dois lugares diferentes do mundo. A aresta que sai dele
   estica sem limite. É isso que o `select-inflate` lê como "balão".

   Varrido no elenco, fração de vértices com peso > 0,12 em ossos a mais de 3 arestas de
   distância no grafo do esqueleto, contra a inflação medida (`ruins/1e4`, teto 23,6):

       saci        8,90%  ->  607,1        lobisomem   1,52%  ->   14,5
       cuca       10,78%  ->  316,8        mandrake    0,78%  ->   18,9
       lampiao     1,40%  ->  121,5        pagodeiro   0,56%  ->   10,4
       zumbi       0,44%  ->   36,3        et          0,14%  ->    9,7

   A correlação NÃO é geral — `lampiao` tem 1,40% e o `lobisomem`, que passa, tem 1,52%.
   Ela é decisiva só na ponta: os dois únicos personagens acima de 8% são exatamente os
   dois únicos acima de 300 de inflação. Esta ferramenta trata ESSA ponta, e é honesto
   dizer que ela não explica o meio da tabela.

   O QUE ELA FAZ
   Para cada vértice: acha o osso dominante, zera qualquer peso em osso a mais de
   `--span` arestas dele, e renormaliza os que sobraram. Se sobrar só o dominante, ele
   fica com 1,0 — rígido, que é o certo para uma peça solta (cordão, borla, correia)
   que nunca deveria ter sido dividida entre duas partes do corpo.

   O QUE ELA PRESERVA
   Peso em `Curl_*` fica intocado: são o atuador do fechamento da mão (BUG-149), não
   deformação de corpo. Malha, textura, esqueleto, IBM e clipes não são tocados — só
   JOINTS_0/WEIGHTS_0, igual ao `reskin-glb.mjs`.

   USO
     node tools/costura-peso.mjs <in.glb> <out.glb> [--span=3] [--piso=0.12]
     node tools/costura-peso.mjs <in.glb> --relatorio     # só mede, não escreve
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const args = process.argv.slice(2);
const arquivos = args.filter((a) => !a.startsWith('-'));
const [inPath, outPath] = arquivos;
const RELATORIO = args.includes('--relatorio');
const SPAN = +(args.find((a) => a.startsWith('--span=')) || '--span=3').split('=')[1];
const PISO = +(args.find((a) => a.startsWith('--piso=')) || '--piso=0.12').split('=')[1];
if (!inPath || (!outPath && !RELATORIO)) {
  console.error('uso: node tools/costura-peso.mjs <in.glb> <out.glb> [--span=3] [--piso=0.12]');
  process.exit(1);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inPath);
const skin = doc.getRoot().listSkins()[0];
if (!skin) { console.error(`${inPath}: sem skin`); process.exit(1); }
const joints = skin.listJoints();
const nomes = joints.map((j) => j.getName());

/* Distância de GRAFO, não euclidiana: o que estraga não é o osso estar longe no espaço
   (o pé está longe da cabeça e isso é normal), é a carne obedecer a duas partes do corpo
   que se movem independentemente. */
const pai = new Map();
for (const j of joints) for (const c of j.listChildren()) pai.set(c.getName(), j.getName());
const cadeia = (n) => { const p = []; let x = n; while (x) { p.push(x); x = pai.get(x); } return p; };
const cache = new Map();
const dist = (a, b) => {
  if (a === b) return 0;
  const k = a < b ? `${a}|${b}` : `${b}|${a}`;
  if (cache.has(k)) return cache.get(k);
  const ca = cadeia(a), cb = cadeia(b);
  let d = 99;
  for (let i = 0; i < ca.length; i++) { const j = cb.indexOf(ca[i]); if (j >= 0) { d = i + j; break; } }
  cache.set(k, d); return d;
};

let total = 0, tocados = 0, pesoTirado = 0;
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const aJ = prim.getAttribute('JOINTS_0'), aW = prim.getAttribute('WEIGHTS_0');
    if (!aJ || !aW) continue;
    const ji = aJ.getArray(), jw = Float32Array.from(aW.getArray());
    for (let i = 0; i < jw.length / 4; i++) {
      total++;
      let dom = 0;
      for (let k = 1; k < 4; k++) if (jw[i * 4 + k] > jw[i * 4 + dom]) dom = k;
      const nomeDom = nomes[ji[i * 4 + dom]];
      if (!nomeDom) continue;
      let mexeu = false, soma = 0;
      for (let k = 0; k < 4; k++) {
        const w = jw[i * 4 + k];
        if (w <= 0) continue;
        const nm = nomes[ji[i * 4 + k]];
        // Curl_* é atuador de runtime (BUG-149): nunca entra nesta conta.
        if (k !== dom && w >= PISO && nm && !/^Curl_/.test(nm) && !/^Curl_/.test(nomeDom) && dist(nomeDom, nm) > SPAN) {
          pesoTirado += w; jw[i * 4 + k] = 0; mexeu = true; continue;
        }
        soma += jw[i * 4 + k];
      }
      if (!mexeu) continue;
      tocados++;
      if (soma > 0) for (let k = 0; k < 4; k++) jw[i * 4 + k] /= soma;
      else { for (let k = 0; k < 4; k++) jw[i * 4 + k] = 0; jw[i * 4 + dom] = 1; }
    }
    if (!RELATORIO) aW.setArray(jw);
  }
}

const pct = (100 * tocados / total).toFixed(2);
console.log(`${inPath.split('/').pop().padEnd(20)} ${String(tocados).padStart(6)} de ${total} vértices costurados (${pct}%), peso removido ${pesoTirado.toFixed(1)}  [span>${SPAN}, piso ${PISO}]`);
if (RELATORIO) process.exit(0);
await io.write(outPath, doc);
console.log(`-> ${outPath}`);
