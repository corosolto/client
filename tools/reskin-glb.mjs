/* reskin-glb.mjs — REPINTA os pesos de skin de um GLB JÁ RIGADO, sem tocar em malha,
   textura, esqueleto, IBM ou clipes. Cirúrgico de propósito: os GLB de personagem já
   passaram por transplante de esqueleto, finger-curl, otimização de textura e tabela de
   pé-no-chão. Regerar do zero jogaria tudo isso fora; aqui só JOINTS_0/WEIGHTS_0 mudam.

   ═══════════════════════════════════════════════════════════════════════════════════
   A CAUSA RAIZ QUE ESTE ARQUIVO CONSERTA — "postura de balão" (04/08)

   O auto-skin do `tools/rig-from-donor.mjs` montava o segmento de cada osso como
   [junta → PAI]:

       segs[i] = { a: junta_i, b: pai_i }                    // rig-from-donor.mjs:103-107

   Num esqueleto Meshy o osso aponta pro filho: `LeftArm` é o OMBRO, `LeftForeArm` é o
   COTOVELO, `LeftHand` é o PUNHO. Então [junta→pai] faz:

       segmento de LeftForeArm = [cotovelo, ombro]  = o BRAÇO       -> carne do braço obedece ao COTOVELO
       segmento de LeftHand    = [punho, cotovelo]  = o ANTEBRAÇO   -> carne do antebraço obedece ao PUNHO
       segmento de LeftLeg     = [joelho, quadril]  = a COXA        -> carne da coxa obedece ao JOELHO

   Ou seja: TODO membro era pintado com a junta DISTAL, um osso adiante do certo. Dobrar
   o cotovelo girava o braço inteiro; dobrar o joelho girava a coxa inteira. É isso que o
   olho lê como boneco inflando/derretendo ao andar.

   MEDIDO (tools/eval/skin-offbyone.mjs — centroide da carne dominada por cada junta
   comparado ao meio do segmento junta→pai e ao meio do segmento junta→filho):

       raul     (transplantado)   junta→PAI 15  ×  junta→FILHO  0
       mandrake (rigado no Mint)  junta→PAI  0  ×  junta→FILHO 17

   15 × 0 contra 0 × 17. Não é ajuste fino, é convenção invertida.

   NÃO era o MAX_R (sweep 0,22→0,09 já refutado, KNOWN-BUGS) e NÃO era o `raioSkin` do
   C7: 60% dos vértices dos funkeiros caem no `head_end`, uma FOLHA rígida 29,5 cm acima
   do `Head`, e o C7 mede folha como PONTO. Deformação de folha rígida é idêntica à do
   pai (M_f·IBM_f = M_p·L·L⁻¹·IBM_p), e as tracks de `head_end` nos clipes são constantes
   — conferido. Remapear folha→pai leva raul de 0,171 pra 0,074 sem mover um vértice.
   Régua que enxerga o defeito de verdade: `tools/eval/pose-inflate.mjs` (esticamento de
   aresta com o clipe rodando).

   O QUE É PRESERVADO DE PROPÓSITO
   • Peso nos ossos `Curl_*` (dedo). Eles são o recurso de fechar a mão
     (tools/finger-curl.mjs) e carregam ~116 unidades de peso por mão no raul. O reskin
     recalcula só a fração NÃO-curl e a escala por (1 − peso_curl), então a mão continua
     fechando exatamente como antes.
   • Folhas (`head_end`, `headfront`, `Curl_*`) não são candidatas a dominar carne — a
     carne delas pertence ao pai. Deformação idêntica, rótulo correto, e de quebra o C7
     para de acusar raio inflado.

   uso: node tools/reskin-glb.mjs <in.glb> <out.glb>
   env: MAX_R (m, padrão 0.22) · SUAVIZA (iterações de suavização, padrão 2)
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) { console.error('uso: reskin-glb <in.glb> <out.glb>'); process.exit(1); }
const MAX_R = +(process.env.MAX_R || 0.22);
const SUAVIZA = +(process.env.SUAVIZA ?? 2);
const POT = +(process.env.POT || 1.5);
const LOCAL = +(process.env.LOCAL ?? 0);
const MIN_SEG = 0.02;   // segmento menor que 2 cm é degenerado (ex.: Hand→Curl, 1 mm)

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inPath);
const skin = doc.getRoot().listSkins()[0];
if (!skin) { console.error('GLB sem skin'); process.exit(1); }
const joints = skin.listJoints();
const jIdx = new Map(joints.map((j, i) => [j, i]));

const parent = new Map();
for (const n of doc.getRoot().listNodes()) for (const c of n.listChildren()) parent.set(c, n);
const local = new Map();
for (const n of doc.getRoot().listNodes()) local.set(n, new THREE.Matrix4().compose(
  new THREE.Vector3().fromArray(n.getTranslation()),
  new THREE.Quaternion().fromArray(n.getRotation()),
  new THREE.Vector3().fromArray(n.getScale())));
const wm = new Map();
const world = (n) => {
  if (wm.has(n)) return wm.get(n);
  const p = parent.get(n);
  const m = p ? new THREE.Matrix4().multiplyMatrices(world(p), local.get(n)) : local.get(n).clone();
  wm.set(n, m); return m;
};
for (const n of doc.getRoot().listNodes()) world(n);

const jp = joints.map((j) => new THREE.Vector3().setFromMatrixPosition(wm.get(j)));
const nomes = joints.map((j) => j.getName());
const ehCurl = nomes.map((n) => /^curl_/i.test(n));
const kids = joints.map(() => []);
joints.forEach((j, i) => j.listChildren().forEach((c) => { if (jIdx.has(c)) kids[i].push(jIdx.get(c)); }));
const pai = joints.map((j) => (jIdx.has(parent.get(j)) ? jIdx.get(parent.get(j)) : -1));

/* SEGMENTOS — a correção. O osso de índice i cobre a carne entre a junta i e CADA filho
   dela (convenção proximal, a mesma que o char-probe usa pra medir raioSkin). Se todos
   os filhos forem degenerados (Hand→Curl tem 1 mm) ou não houver filho, cria-se um TOCO
   na direção do próprio osso — é o que segura a mão e o pé, que são pontas de cadeia. */
const segs = [];
for (let i = 0; i < joints.length; i++) {
  if (ehCurl[i]) continue;                       // folha de dedo não domina carne
  let usou = 0;
  for (const c of kids[i]) {
    if (jp[i].distanceTo(jp[c]) < MIN_SEG) continue;
    segs.push({ a: jp[i], b: jp[c], idx: i }); usou++;
  }
  if (!usou) {
    const p = pai[i];
    const dir = p >= 0 ? new THREE.Vector3().subVectors(jp[i], jp[p]) : new THREE.Vector3(0, -1, 0);
    const L = Math.min(0.12, Math.max(0.04, dir.length() * 0.5));
    segs.push({ a: jp[i], b: jp[i].clone().addScaledVector(dir.normalize(), L), idx: i });
  }
}

// vizinhança no grafo do esqueleto (pai + filhos), até `saltos` de distância
const _vizCache = new Map();
function vizinhanca(i, saltos) {
  const k = `${i}:${saltos}`;
  if (_vizCache.has(k)) return _vizCache.get(k);
  const vis = new Set([i]);
  let frente = [i];
  for (let s = 0; s < saltos; s++) {
    const prox = [];
    for (const j of frente) {
      const cands = [pai[j], ...kids[j]].filter((x) => x >= 0);
      for (const c of cands) if (!vis.has(c)) { vis.add(c); prox.push(c); }
    }
    frente = prox;
  }
  _vizCache.set(k, vis);
  return vis;
}

function segDist2(p, s) {
  const abx = s.b.x - s.a.x, aby = s.b.y - s.a.y, abz = s.b.z - s.a.z;
  const L = abx * abx + aby * aby + abz * abz;
  let t = L > 1e-12 ? ((p.x - s.a.x) * abx + (p.y - s.a.y) * aby + (p.z - s.a.z) * abz) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = p.x - (s.a.x + abx * t), dy = p.y - (s.a.y + aby * t), dz = p.z - (s.a.z + abz * t);
  return dx * dx + dy * dy + dz * dz;
}

let totVerts = 0, mudou = 0;
for (const nd of doc.getRoot().listNodes()) {
  const mesh = nd.getMesh();
  if (!mesh || !nd.getSkin()) continue;
  for (const prim of mesh.listPrimitives()) {
    const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
    if (!P || !J || !W) continue;
    const n = P.getCount();
    totVerts += n;
    const el = [], je = [], we = [];

    /* VÉRTICE DE MÃO: peso de curl intacto, RESTO NA MÃO. Quem tem peso em `Curl_*` foi
       pintado pelo tools/finger-curl.mjs, cujo desenho é exatamente {curl na ponta,
       osso da mão no punho}. Deixar a parte não-curl cair na proximidade genérica
       jogava o resto do dedo no ANTEBRAÇO (o toco da mão é curto) e o osso de curl
       passava a girar contra o antebraço — medido no jozo pelo `pose-inflate --top`:
       apareceram os pares `Curl_R × RightHand` (541) e `Curl_R × RightForeArm` (361),
       que não existiam antes. Copiar o vértice inteiro verbatim resolvia o rasgo mas
       devolvia o punho ao esquema distal, e a mão do raul voltava a ser uma pá colada
       no antebraço (ver /tmp/reskin/raul_3way.png). Fixar o resto no PAI do osso de
       curl (= a mão) é o desenho original do finger-curl e resolve os dois. */
    const curlJ = new Array(n), curlW = new Array(n);
    const intacto = new Uint8Array(n);
    const pesos = [];                       // Map(joint -> peso) por vértice, só a parte não-curl
    const pts = [];
    for (let i = 0; i < n; i++) {
      P.getElement(i, el); J.getElement(i, je); W.getElement(i, we);
      const cj = [], cw = [];
      let soma = 0;
      for (let k = 0; k < 4; k++) if (ehCurl[je[k]] && we[k] > 0) { cj.push(je[k]); cw.push(we[k]); soma += we[k]; }
      if (soma > 1) { for (let k = 0; k < cw.length; k++) cw[k] /= soma; soma = 1; }
      curlJ[i] = cj; curlW[i] = cw;
      intacto[i] = cj.length ? 1 : 0;
      const p = new THREE.Vector3(el[0], el[1], el[2]);
      pts.push(p);
      if (intacto[i]) { pesos.push(new Map([[pai[cj[0]] >= 0 ? pai[cj[0]] : cj[0], 1]])); continue; }

      const melhor = new Map();             // melhor distância² POR JUNTA (Head tem 2 segmentos)
      for (const s of segs) {
        const d = segDist2(p, s);
        const cur = melhor.get(s.idx);
        if (cur === undefined || d < cur) melhor.set(s.idx, d);
      }
      /* LOCALIDADE — só entram na mistura ossos a até LOCAL saltos do osso mais próximo
         no grafo do esqueleto. Sem isso, num corpo largo o osso do braço passa DENTRO da
         barriga e a carne da barriga entra na mistura do braço: o abdômen balança junto
         com o braço. LOCAL=0 desliga. */
      let cand = [...melhor.entries()].sort((a, b) => a[1] - b[1]);
      if (LOCAL > 0 && cand.length) {
        const perto = vizinhanca(cand[0][0], LOCAL);
        cand = cand.filter(([ji]) => perto.has(ji));
      }
      const ord = cand.slice(0, 4);
      const d0 = Math.sqrt(ord[0][1]);
      const m = new Map();
      if (d0 > MAX_R) {
        m.set(ord[0][0], 1);                // fora do alcance: rígido no mais próximo
      } else {
        let ws = 0;
        const w = ord.map(([, d2]) => { const x = 1 / Math.pow(d2 + 1e-5, POT); ws += x; return x; });
        ord.forEach(([ji], k) => m.set(ji, w[k] / ws));
      }
      pesos.push(m);
    }

    /* SUAVIZAÇÃO — média com a vizinhança do triângulo. Proximidade pura dá pesos
       ruidosos: dois vértices colados podem cair em misturas bem diferentes e a aresta
       entre eles rasga quando o clipe roda. A adjacência é montada por POSIÇÃO
       quantizada, não por índice, porque costura de UV duplica o vértice e a vizinhança
       por índice não atravessa a costura. */
    if (SUAVIZA > 0) {
      const chave = (p) => `${Math.round(p.x * 2000)},${Math.round(p.y * 2000)},${Math.round(p.z * 2000)}`;
      const porPos = new Map();
      pts.forEach((p, i) => { const k = chave(p); if (!porPos.has(k)) porPos.set(k, []); porPos.get(k).push(i); });
      const canon = new Array(n);
      for (const [, arr] of porPos) for (const i of arr) canon[i] = arr[0];
      const viz = new Map();                // canônico -> Set(canônico)
      const liga = (a, b) => { const x = canon[a], y = canon[b]; if (x === y) return; if (!viz.has(x)) viz.set(x, new Set()); viz.get(x).add(y); };
      const idx = prim.getIndices();
      const N = idx ? idx.getCount() : n;
      const gi = (k) => (idx ? idx.getScalar(k) : k);
      for (let k = 0; k + 2 < N; k += 3) {
        const a = gi(k), b = gi(k + 1), c = gi(k + 2);
        liga(a, b); liga(b, a); liga(b, c); liga(c, b); liga(c, a); liga(a, c);
      }
      for (let it = 0; it < SUAVIZA; it++) {
        const novo = new Map();
        for (const [c, vz] of viz) {
          if (intacto[c]) continue;           // mão preservada não entra na média
          const m = new Map();
          for (const [ji, w] of pesos[c]) m.set(ji, w * 0.5);
          const viz2 = [...vz].filter((v) => !intacto[v]);
          if (!viz2.length) { novo.set(c, pesos[c]); continue; }
          const f = 0.5 / viz2.length;
          for (const v of viz2) for (const [ji, w] of pesos[v]) m.set(ji, (m.get(ji) || 0) + w * f);
          novo.set(c, m);
        }
        for (const [c, m] of novo) pesos[c] = m;
        for (let i = 0; i < n; i++) if (canon[i] !== i) pesos[i] = pesos[canon[i]];
      }
    }

    const JI = new Uint16Array(n * 4), JW = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const somaCurl = curlW[i].reduce((a, b) => a + b, 0);
      const restante = 1 - somaCurl;
      const livres = 4 - curlJ[i].length;
      const ord = [...pesos[i].entries()].sort((a, b) => b[1] - a[1]).slice(0, Math.max(1, livres));
      const tot = ord.reduce((a, b) => a + b[1], 0) || 1;
      let s = 0;
      for (let k = 0; k < curlJ[i].length && k < 4; k++) { JI[i * 4 + k] = curlJ[i][k]; JW[i * 4 + k] = curlW[i][k]; s++; }
      for (let k = 0; k < ord.length && s < 4; k++, s++) { JI[i * 4 + s] = ord[k][0]; JW[i * 4 + s] = (ord[k][1] / tot) * restante; }
      for (; s < 4; s++) { JI[i * 4 + s] = JI[i * 4]; JW[i * 4 + s] = 0; }
      // renormaliza (defesa contra restante≈0 por arredondamento)
      let tt = 0; for (let k = 0; k < 4; k++) tt += JW[i * 4 + k];
      if (tt > 1e-6) for (let k = 0; k < 4; k++) JW[i * 4 + k] /= tt;
      else { JW[i * 4] = 1; for (let k = 1; k < 4; k++) JW[i * 4 + k] = 0; }
      J.getElement(i, je);
      if (je[0] !== JI[i * 4]) mudou++;
    }
    const buffer = doc.getRoot().listBuffers()[0] || doc.createBuffer();
    prim.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(JI).setBuffer(buffer));
    prim.setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(JW).setBuffer(buffer));
    // sem isto os accessors antigos ficam órfãos DENTRO do buffer e o arquivo engorda
    // ~150 KB por personagem (medido no raul: 578 -> 725 KB). Não uso prune() aqui
    // porque o padrão dele varre nó-folha vazio, e as folhas deste rig (head_end,
    // headfront, Curl_*) são alvo de track de clipe e do fechamento da mão.
    J.dispose(); W.dispose();
  }
}
await io.write(outPath, doc);
console.log(`${inPath.split('/').pop()} -> ${outPath}  | ${totVerts} vértices, dominante trocado em ${mudou} (${((100 * mudou) / totVerts).toFixed(0)}%) | MAX_R=${MAX_R} SUAVIZA=${SUAVIZA} LOCAL=${LOCAL}`);
