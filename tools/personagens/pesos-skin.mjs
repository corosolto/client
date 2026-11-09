/* ============================================================================
   pesos-skin.mjs — leitura, medição e reparo de pesos de skin (JOINTS_0 /
   WEIGHTS_0) de GLBs meshy-28, sem tocar em mais nada.
   ----------------------------------------------------------------------------
   O CASO (P4, 09/11/2026): o censo de rig (pose test do Studio sobre os 100
   GLBs de personagem/skin) achou vértices de BRAÇO com peso de PERNA: a parte
   de baixo da manga, no sovaco, segue a coxa (LeftUpLeg 0,35 num vértice a
   1,0 m de altura). Quando a arma levanta o braço, esses vértices ficam
   presos na perna e a manga "incha". Pior caso: lula-drip 6,8 % dos vértices
   de braço, lula-cyborg 5,3 %, lula-mandrake 4,5 %.

   O QUE ESTE MÓDULO FAZ:
   - `lerGlb`/`skinsDoGlb`: lê o GLB cru (JSON + BIN) e devolve, por
     primitiva com pele, posições, juntas e pesos, além do offset de cada
     atributo dentro do arquivo (para remendar no lugar).
   - `medirVazamento`: a MESMA conta do censo (/tmp/rig-census/leak.mjs):
     vértice de braço = soma de pesos em *Arm|*ForeArm|*Hand > 0,3; vazado se
     a soma em *UpLeg|*Leg > 0,1.
   - `repesar`: reescreve SÓ os bytes de JOINTS_0/WEIGHTS_0 dos vértices que
     as regras mudam (descritas em `REGRAS`); posição, normal, UV, tangente,
     materiais, esqueleto, IBMs e animações saem byte a byte iguais.
     Determinístico: mesma entrada, mesmos bytes.

   EXTENSÃO DO ROSTER (P4, 09/11/2026): o censo achou também costuras DURAS
   (vértice 100 % Spine02 colado em vértice 100 % LeftArm no sovaco, coxa E
   colada na coxa D na virilha, cauda da cuca 1,3 m atrás pesada na canela).
   R7–R9 tratam isso; ficam desligadas por padrão, então as receitas antigas
   (Lula) reproduzem os mesmos bytes.
   ============================================================================ */
import { readFileSync } from 'node:fs';

const COMP = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

export function lerGlb(origem) {
  const buf = Buffer.isBuffer(origem) ? Buffer.from(origem) : readFileSync(origem);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('não é GLB');
  let off = 12, json = null, binOffset = -1, binLength = 0;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    if (type === 0x4e4f534a) json = JSON.parse(buf.subarray(off + 8, off + 8 + len).toString('utf8'));
    else if (type === 0x004e4942 && binOffset < 0) { binOffset = off + 8; binLength = len; }
    off += 8 + len;
  }
  if (!json || binOffset < 0) throw new Error('GLB sem JSON ou BIN');
  return { buf, json, binOffset, binLength };
}

// Offset absoluto (no arquivo) do elemento `e`, componente `c`, de um acessor.
function localizador(g, ai) {
  const a = g.json.accessors[ai];
  if (a.sparse) throw new Error(`acessor ${ai} esparso não suportado`);
  const bv = g.json.bufferViews[a.bufferView];
  if ((bv.buffer ?? 0) !== 0) throw new Error('buffer externo não suportado');
  const sz = COMP[a.componentType], n = NUM[a.type];
  if (!sz || !n) throw new Error(`acessor ${ai}: tipo não suportado`);
  const base = g.binOffset + (bv.byteOffset || 0) + (a.byteOffset || 0), passo = bv.byteStride || sz * n;
  return { a, sz, n, at: (e, c) => base + e * passo + c * sz };
}

function lerAcessor(g, ai) {
  const { a, n, at } = localizador(g, ai);
  const dv = new DataView(g.buf.buffer, g.buf.byteOffset, g.buf.byteLength);
  const ler = { 5126: (p) => dv.getFloat32(p, true), 5125: (p) => dv.getUint32(p, true), 5123: (p) => dv.getUint16(p, true), 5121: (p) => dv.getUint8(p) }[a.componentType];
  const escala = a.normalized ? (a.componentType === 5121 ? 1 / 255 : a.componentType === 5123 ? 1 / 65535 : 1) : 1;
  const out = new Float64Array(a.count * n);
  for (let e = 0; e < a.count; e++) for (let c = 0; c < n; c++) out[e * n + c] = ler(at(e, c)) * escala;
  return out;
}

// Inversa de matriz afim 4×4 column-major (IBM) → posição da junta no bind.
function posicaoDaJunta(m) {
  const a = [[m[0], m[4], m[8]], [m[1], m[5], m[9]], [m[2], m[6], m[10]]], t = [m[12], m[13], m[14]];
  const det = a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const cof = (r, c) => {
    const rr = [0, 1, 2].filter((x) => x !== r), cc = [0, 1, 2].filter((x) => x !== c);
    return ((r + c) % 2 ? -1 : 1) * (a[rr[0]][cc[0]] * a[rr[1]][cc[1]] - a[rr[0]][cc[1]] * a[rr[1]][cc[0]]);
  };
  const inv = [0, 1, 2].map((r) => [0, 1, 2].map((c) => cof(c, r) / det));
  return [0, 1, 2].map((r) => -(inv[r][0] * t[0] + inv[r][1] * t[1] + inv[r][2] * t[2]));
}

// Uma entrada por primitiva com JOINTS_0/WEIGHTS_0 de um nó com skin.
// `geometria: false` pula posições/índices (medição de vazamento só lê pesos).
export function skinsDoGlb(g, { geometria = true } = {}) {
  const out = [];
  const vistos = new Set();
  for (const node of g.json.nodes || []) {
    if (node.skin == null || node.mesh == null) continue;
    const skin = g.json.skins[node.skin];
    const nomes = skin.joints.map((i) => g.json.nodes[i].name || `junta${i}`);
    const ibm = geometria && skin.inverseBindMatrices != null ? lerAcessor(g, skin.inverseBindMatrices) : null;
    const juntas = nomes.map((_, i) => (ibm ? posicaoDaJunta(ibm.subarray(i * 16, i * 16 + 16)) : [0, 0, 0]));
    g.json.meshes[node.mesh].primitives.forEach((p, pi) => {
      if (p.attributes.JOINTS_0 == null || p.attributes.WEIGHTS_0 == null) return;
      const chave = `${node.mesh}/${pi}`;
      if (vistos.has(chave)) return;
      vistos.add(chave);
      const extra = p.attributes.JOINTS_1 != null && p.attributes.WEIGHTS_1 != null;
      out.push({
        malha: node.mesh, primitiva: pi, nomes, juntas,
        P: geometria ? lerAcessor(g, p.attributes.POSITION) : null,
        I: geometria && p.indices != null ? lerAcessor(g, p.indices) : null,
        J: lerAcessor(g, p.attributes.JOINTS_0), W: lerAcessor(g, p.attributes.WEIGHTS_0),
        J1: extra ? lerAcessor(g, p.attributes.JOINTS_1) : null, W1: extra ? lerAcessor(g, p.attributes.WEIGHTS_1) : null,
        acJ: p.attributes.JOINTS_0, acW: p.attributes.WEIGHTS_0,
      });
    });
  }
  return out;
}

// Grava uma influência (slot k de JOINTS_0/WEIGHTS_0) do vértice v no buffer de `g`.
// Usada pelos mutantes da régua para plantar vazamento em memória.
export function gravarInfluencia(g, prim, v, k, junta, peso) {
  const locJ = localizador(g, prim.acJ), locW = localizador(g, prim.acW);
  if (locJ.a.componentType === 5121) g.buf.writeUInt8(junta, locJ.at(v, k)); else g.buf.writeUInt16LE(junta, locJ.at(v, k));
  g.buf.writeFloatLE(peso, locW.at(v, k));
}

// Faixas [início, fim) de bytes do arquivo ocupadas por JOINTS_0/WEIGHTS_0
// (só os bytes de cada elemento, não o resto do stride intercalado).
export function localizadoresDePele(g) {
  const faixas = [];
  for (const s of skinsDoGlb(g)) for (const ai of [s.acJ, s.acW]) {
    const { a, sz, n, at } = localizador(g, ai);
    for (let e = 0; e < a.count; e++) faixas.push([at(e, 0), at(e, 0) + sz * n]);
  }
  return faixas;
}

// ---------------------------------------------------------------------------
// Medição (idêntica ao censo).
// ---------------------------------------------------------------------------
export const RE_BRACO_CENSO = /(Arm|ForeArm|Hand)$/;
export const RE_PERNA_CENSO = /(UpLeg|Leg)$/;
export const LIMIAR_BRACO = 0.3, LIMIAR_PERNA = 0.1;

export function medirVazamento(g) {
  let bracos = 0, vazados = 0;
  for (const s of skinsDoGlb(g, { geometria: false })) {
    const braco = s.nomes.map((n) => RE_BRACO_CENSO.test(n)), perna = s.nomes.map((n) => RE_PERNA_CENSO.test(n));
    const conjuntos = s.J1 ? [[s.J, s.W], [s.J1, s.W1]] : [[s.J, s.W]];
    for (let v = 0; v < s.W.length / 4; v++) {
      let a = 0, l = 0;
      for (const [J, W] of conjuntos) for (let k = 0; k < 4; k++) { const j = J[v * 4 + k], w = W[v * 4 + k]; if (braco[j]) a += w; if (perna[j]) l += w; }
      if (a > LIMIAR_BRACO) { bracos++; if (l > LIMIAR_PERNA) vazados++; }
    }
  }
  return { bracos, vazados, pct: bracos ? (100 * vazados) / bracos : 0 };
}

// ---------------------------------------------------------------------------
// Reparo.
// ---------------------------------------------------------------------------
/* Partes do corpo: cada osso do meshy-28 pertence a uma (Curl_L/Curl_R são a
   flexão dos dedos e contam como braço do seu lado). */
function parteDoOsso(nome) {
  const lado = /^Left|_L$/.test(nome) ? 'L' : /^Right|_R$/.test(nome) ? 'R' : '';
  if (lado && /(Arm|ForeArm|Hand)$|^Curl_/.test(nome)) return `braco${lado}`;
  if (lado && /(UpLeg|Leg|Foot|ToeBase)$/.test(nome)) return `perna${lado}`;
  return 'tronco'; // Hips, Spine*, neck, Head*, Shoulders
}

/* Classes das costuras (R7/R8): a parte do corpo, com o tronco separado em
   ombro de cada lado e cabeça/pescoço. */
function classeDoOsso(nome) {
  const p = parteDoOsso(nome);
  if (p !== 'tronco') return p;
  if (/Shoulder$/.test(nome)) return /^Left/.test(nome) ? 'ombroL' : 'ombroR';
  if (/^(neck|Head|head)/.test(nome)) return 'cabeca';
  return 'tronco';
}

// Zona da costura entre duas classes dominantes (null = não é costura tratada).
function zonaDoPar(x, y) {
  const perna = (c) => c.startsWith('perna'), braco = (c) => c.startsWith('braco');
  if (x === 'cabeca' || y === 'cabeca') return perna(x) || perna(y) ? null : 'pescoco';
  if (perna(x) || perna(y)) return 'virilha';
  return braco(x) && braco(y) ? null : 'sovaco';
}

/* Valores padrão. Cada skin reparada grava os seus em
   tools/personagens/pesos-receitas.json (escolhidos pela régua do pose test;
   a receita é o que torna o resultado reproduzível byte a byte). */
export const PARAMETROS = Object.freeze({
  semente: 0.95, // vértice "limpo": ≥ 95 % do peso num braço, ou ≤ 5 % em braço
  braciceMin: 0.35, // a(v) ≤ 0,35: corpo; ≥ 0,65: manga; entre os dois, smoothstep
  braciceMax: 0.65,
  ombroR0: 1.5, // mistura do ombro: rampa de R0 a R1 × comprimento do braço, a partir da junta Arm
  ombroR1: 2.5,
  anel: 2, // anéis de vizinhos somados à região alterada antes do preenchimento
  preencher: 300, // passadas do preenchimento harmônico
  // R7–R9 (P4, roster): desligadas por padrão, para as receitas antigas
  // reproduzirem os mesmos bytes. Cada uma vale o número de anéis da faixa
  // de transição montada em volta da costura dura da sua zona.
  costura: 0.5, // aresta é costura dura se a soma |Δpeso| entre as pontas passar disto
  virilha: 0, // R7: costura perna E × perna D e tronco × perna (virilha, quadril, saia)
  sovaco: 0, // R8: costura tronco × ombro × braço (sovaco, ombro) e ombro E × ombro D
  pescoco: 0, // R8b: costura cabeça/pescoço × tronco/ombro
  cauda: 0, // R9: metros atrás da junta Hips a partir dos quais o peso de perna sai (0 = desligada)
  caudaRampa: 0.2, // R9: largura (m) da rampa em que o peso de perna da cauda vai a zero
});

export const REGRAS = Object.freeze([
  'R0 bracice geométrica: sementes = vértices limpos (≥ 95 % do peso num braço, ou ≤ 5 % em braço); a(v) = dN/(dB+dN) com distância GEODÉSICA pela malha até a semente mais próxima de cada tipo (peça solta sem semente: distância euclidiana do centróide, valor único para a peça). Os pesos quebrados não decidem a parte.',
  'R1 manga não segue perna: peso de UpLeg/Leg/Foot/ToeBase multiplicado por 1 − s(a), s = smoothstep(0,35..0,65).',
  'R2 mistura do ombro: osso de braço só fica em vértice de corpo perto da junta Arm do lado (rampa ombroR0→ombroR1 × comprimento do braço); osso de tronco só fica na manga dentro da mesma rampa.',
  'R3 cintura: acima de Spine02 nada segue a perna; entre Hips e Spine02 o peso de perna cai em rampa linear.',
  'R4 destino do peso retirado: o de perna que sai do corpo vai para Hips (o pai das coxas) na fração 1 − s(a); o resto volta aos ossos que ficaram, na mesma proporção; vértice que perdeu tudo vai para a junta permitida mais próxima.',
  'R5 preenchimento harmônico: região = vértices alterados + `anel` anéis de vizinhos; o contorno fica fixo e a região é refeita pela média dos vizinhos ponderada por 1/comprimento da aresta, com R1–R4 reaplicadas a cada passada (Jacobi projetado, `preencher` passadas). Sem degrau entre vizinhos — é o que tira o "inchaço".',
  'R6 saída: no máximo 4 influências, ordem decrescente, soma 1 em float32; vértices soldados (mesma posição) recebem os mesmos pesos; vértice sem mudança mantém os bytes originais.',
  'R7 virilha (`virilha` anéis): aresta cujas pontas são dominadas por classes diferentes (perna E × perna D, tronco × perna, braço × perna) e diferem mais que `costura` em Σ|Δpeso| é costura dura; as pontas + `virilha` anéis entram na região do R5. A virilha passa a pesar nas DUAS coxas em degradê, sem degrau de 1 aresta entre as pernas.',
  'R8 sovaco (`sovaco` anéis) e pescoço (`pescoco` anéis): o mesmo para tronco × ombro × braço, ombro E × ombro D (sovaco/ombro: o sovaco passa a pesar em Spine02 em degradê até o braço) e cabeça/pescoço × tronco/ombro/braço.',
  'R9 cauda (`cauda` m): vértice mais de `cauda` metros ATRÁS da junta Hips (−Z, a frente do meshy-28 é +Z) perde o peso de perna em rampa até `cauda + caudaRampa`; o peso sai para Hips (R4). Cauda/capa não segue a canela.',
  'Mão: regra "mão 100 % em Hand" foi medida e REJEITADA (piorou o esticamento da mão de 1,55× para 2,3–3,4× no pose test, acima do limite 2,5×); a mão já não tem peso de tronco/perna depois de R1/R2.',
]);

function normalizar(m) {
  let s = 0;
  for (const w of m.values()) s += w;
  if (s <= 0) return m;
  for (const [j, w] of m) m.set(j, w / s);
  return m;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const rampa = (x, a, b) => Math.max(0, Math.min(1, (b - x) / (b - a))); // 1 até a, 0 depois de b

// Dijkstra multi-fonte pelas arestas (heap binário; empate desfeito pelo índice: determinístico).
function geodesica(ng, vizinhos, pos, fontes) {
  const d = new Float64Array(ng).fill(Infinity), heap = [];
  const menor = (x, y) => x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]);
  const push = (item) => {
    heap.push(item);
    for (let i = heap.length - 1; i > 0;) { const p = (i - 1) >> 1; if (!menor(heap[i], heap[p])) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ;) {
        let m = i;
        for (const c of [2 * i + 1, 2 * i + 2]) if (c < heap.length && menor(heap[c], heap[m])) m = c;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
      }
    }
    return top;
  };
  for (const f of fontes) { d[f] = 0; push([0, f]); }
  while (heap.length) {
    const [dv, u] = pop();
    if (dv > d[u]) continue;
    for (const w of vizinhos[u]) { const nd = dv + dist(pos[u], pos[w]); if (nd < d[w]) { d[w] = nd; push([nd, w]); } }
  }
  return d;
}

export function repesar(origem, opcoes = {}) {
  const o = { ...PARAMETROS, ...opcoes };
  const g = lerGlb(origem);
  const saida = Buffer.from(g.buf);
  const relatorio = [];
  for (const s of skinsDoGlb(g)) {
    if (s.J1) throw new Error(`malha ${s.malha}: JOINTS_1 (mais de 4 influências) não suportado no reparo`);
    const idx = (n) => s.nomes.indexOf(n);
    for (const n of ['Hips', 'Spine02', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm']) {
      if (idx(n) < 0) throw new Error(`esqueleto sem ${n}: não é meshy-28`);
    }
    const parteOsso = s.nomes.map(parteDoOsso);
    const classeOsso = s.nomes.map(classeDoOsso);
    const J = (n) => s.juntas[idx(n)];
    const yHips = J('Hips')[1], ySpine02 = J('Spine02')[1], zHips = J('Hips')[2], hips = idx('Hips');
    const lados = {};
    for (const L of ['L', 'R']) {
      const p = L === 'L' ? 'Left' : 'Right';
      lados[L] = { arm: J(`${p}Arm`), comp: dist(J(`${p}Arm`), J(`${p}ForeArm`)) };
    }
    const nv = s.P.length / 3;
    const pesosDe = (v) => {
      const m = new Map();
      for (let k = 0; k < 4; k++) { const w = s.W[v * 4 + k]; if (w > 0) m.set(s.J[v * 4 + k], (m.get(s.J[v * 4 + k]) || 0) + w); }
      return m;
    };

    // Grupos soldados (mesma posição a 1e-5 m) e vizinhança por aresta de triângulo.
    const chave = (v) => `${Math.round(s.P[v * 3] * 1e5)},${Math.round(s.P[v * 3 + 1] * 1e5)},${Math.round(s.P[v * 3 + 2] * 1e5)}`;
    const solda = new Map(), grupoDe = new Int32Array(nv), membros = [];
    for (let v = 0; v < nv; v++) {
      const k = chave(v);
      if (!solda.has(k)) { solda.set(k, membros.length); membros.push([]); }
      grupoDe[v] = solda.get(k); membros[grupoDe[v]].push(v);
    }
    const ng = membros.length;
    const orig = membros.map((ms) => pesosDe(ms[0]));
    const pos = membros.map(([v]) => [s.P[v * 3], s.P[v * 3 + 1], s.P[v * 3 + 2]]);
    const conjuntos = membros.map(() => new Set());
    if (s.I) for (let t = 0; t < s.I.length; t += 3) {
      const a = grupoDe[s.I[t]], b = grupoDe[s.I[t + 1]], c = grupoDe[s.I[t + 2]];
      for (const [u, w] of [[a, b], [b, c], [c, a]]) if (u !== w) { conjuntos[u].add(w); conjuntos[w].add(u); }
    }
    const vizinhos = conjuntos.map((set) => [...set].sort((a, b) => a - b));
    const componentes = [];
    {
      const comp = new Int32Array(ng).fill(-1);
      for (let g0 = 0; g0 < ng; g0++) {
        if (comp[g0] >= 0) continue;
        const grupos = [g0]; comp[g0] = componentes.length;
        for (let i = 0; i < grupos.length; i++) for (const w of vizinhos[grupos[i]]) if (comp[w] < 0) { comp[w] = comp[g0]; grupos.push(w); }
        componentes.push({ grupos, centro: [0, 1, 2].map((k) => grupos.reduce((t, gi) => t + pos[gi][k], 0) / grupos.length) });
      }
    }

    // R0: bracice geométrica.
    const sementes = { L: [], R: [], resto: [] };
    orig.forEach((m, gi) => {
      let l = 0, r = 0;
      for (const [j, w] of m) { if (parteOsso[j] === 'bracoL') l += w; else if (parteOsso[j] === 'bracoR') r += w; }
      if (l >= o.semente) sementes.L.push(gi);
      else if (r >= o.semente) sementes.R.push(gi);
      else if (l + r <= 1 - o.semente) sementes.resto.push(gi);
    });
    const distancia = (fontes) => {
      const d = geodesica(ng, vizinhos, pos, fontes);
      for (const c of componentes) { // peça solta sem semente deste tipo: valor único
        if (d[c.grupos[0]] !== Infinity) continue;
        let dm = Infinity;
        for (const f of fontes) dm = Math.min(dm, dist(c.centro, pos[f]));
        for (const gi of c.grupos) d[gi] = dm;
      }
      return d;
    };
    const dResto = distancia(sementes.resto);
    const a = {};
    for (const L of ['L', 'R']) {
      const dB = distancia(sementes[L]);
      a[L] = Float64Array.from({ length: ng }, (_, gi) => (dB[gi] === Infinity ? 0 : dResto[gi] === Infinity ? 1 : dResto[gi] / (dB[gi] + dResto[gi])));
    }
    const s01 = (x) => { const t = Math.max(0, Math.min(1, (x - o.braciceMin) / (o.braciceMax - o.braciceMin))); return t * t * (3 - 2 * t); };
    const ombro = (gi, L) => rampa(dist(pos[gi], lados[L].arm), o.ombroR0 * lados[L].comp, o.ombroR1 * lados[L].comp);
    const cauda = (gi) => (o.cauda > 0 ? rampa(zHips - pos[gi][2], o.cauda, o.cauda + o.caudaRampa) : 1); // R9

    const regras = (gi, m0) => {
      const lado = a.L[gi] >= a.R[gi] ? 'L' : 'R';
      const manga = s01(a[lado][gi]);
      const fator = (j) => {
        const q = parteOsso[j];
        if (q.startsWith('braco')) { const L = q.slice(-1); return Math.max(s01(a[L][gi]), ombro(gi, L)); } // R2
        if (q.startsWith('perna')) return rampa(pos[gi][1], yHips, ySpine02) * (1 - manga) * cauda(gi); // R1 + R3 + R9
        return Math.max(1 - manga, ombro(gi, lado)); // R2
      };
      const m = new Map();
      let pernaRetirada = 0;
      for (const [j, w] of m0) {
        const f = fator(j);
        if (parteOsso[j].startsWith('perna')) pernaRetirada += w * (1 - f);
        if (w * f > 1e-6) m.set(j, w * f);
      }
      const paraHips = pernaRetirada * (1 - manga); // R4
      if (paraHips > 1e-6) m.set(hips, (m.get(hips) || 0) + paraHips);
      if (m.size === 0) {
        let melhor = -1, dm = Infinity;
        s.nomes.forEach((n, j) => {
          if (/^Curl_|_end$|front$/.test(n) || fator(j) < 0.5) return;
          const d = dist(pos[gi], s.juntas[j]);
          if (d < dm) { dm = d; melhor = j; }
        });
        m.set(melhor, 1);
      }
      return normalizar(m);
    };

    const igual = (x, y) => x.size === y.size && [...x].every(([j, w]) => Math.abs((y.get(j) || 0) - w) < 1e-6);
    let atual = orig.map((m, gi) => regras(gi, m));
    const regiao = Uint8Array.from(atual, (m, gi) => (!igual(m, orig[gi]) || membros[gi].some((v) => !igual(pesosDe(v), orig[gi])) ? 1 : 0));
    const direto = regiao.reduce((t, x) => t + x, 0);
    // R5: preenchimento harmônico da região alterada + anéis.
    for (let k = 0; k < o.anel; k++) {
      const novos = [];
      for (let gi = 0; gi < ng; gi++) if (regiao[gi]) for (const nb of vizinhos[gi]) if (!regiao[nb]) novos.push(nb);
      for (const gi of novos) regiao[gi] = 1;
    }
    // R7/R8: costura dura (pontas dominadas por classes diferentes da mesma zona e
    // Σ|Δpeso| > costura) + N anéis entram na região; o R5 monta o degradê.
    const costuras = {};
    const zonas = [['virilha', o.virilha], ['sovaco', o.sovaco], ['pescoco', o.pescoco]].filter(([, k]) => k > 0);
    if (zonas.length) {
      const dominante = atual.map((m) => {
        const t = new Map();
        for (const [j, w] of m) t.set(classeOsso[j], (t.get(classeOsso[j]) || 0) + w);
        let c = null, cw = -1;
        for (const [k, w] of [...t].sort((x, y) => (x[0] < y[0] ? -1 : 1))) if (w > cw) { c = k; cw = w; }
        return c;
      });
      const marcas = Object.fromEntries(zonas.map(([z]) => [z, new Uint8Array(ng)]));
      for (let u = 0; u < ng; u++) for (const w of vizinhos[u]) {
        if (w < u || dominante[u] === dominante[w]) continue;
        const z = zonaDoPar(dominante[u], dominante[w]);
        if (!z || !marcas[z]) continue;
        let d = 0;
        for (const j of new Set([...atual[u].keys(), ...atual[w].keys()])) d += Math.abs((atual[u].get(j) || 0) - (atual[w].get(j) || 0));
        if (d > o.costura) { marcas[z][u] = 1; marcas[z][w] = 1; }
      }
      for (const [z, k] of zonas) {
        const marca = marcas[z];
        costuras[z] = marca.reduce((t, x) => t + x, 0);
        for (let r = 0; r < k; r++) {
          const novos = [];
          for (let gi = 0; gi < ng; gi++) if (marca[gi]) for (const nb of vizinhos[gi]) if (!marca[nb]) novos.push(nb);
          for (const gi of novos) marca[gi] = 1;
        }
        for (let gi = 0; gi < ng; gi++) if (marca[gi]) regiao[gi] = 1;
      }
    }
    for (let it = 0; it < o.preencher; it++) {
      atual = atual.map((m, gi) => {
        if (!regiao[gi] || !vizinhos[gi].length) return m;
        const acc = new Map();
        for (const nb of vizinhos[gi]) {
          const c = 1 / Math.max(dist(pos[gi], pos[nb]), 1e-4);
          for (const [j, w] of atual[nb]) acc.set(j, (acc.get(j) || 0) + c * w);
        }
        return regras(gi, normalizar(acc));
      });
    }

    // R6: escrita no lugar, só dos grupos que mudaram.
    const locJ = localizador(g, s.acJ), locW = localizador(g, s.acW);
    if (locW.a.componentType !== 5126) throw new Error('WEIGHTS_0 não-float não suportado');
    if (![5121, 5123].includes(locJ.a.componentType)) throw new Error('JOINTS_0 com tipo inesperado');
    let vertices = 0;
    atual.forEach((m, gi) => {
      if (!regiao[gi]) return;
      const top = [...m].filter(([, w]) => w > 0).sort((x, y) => y[1] - x[1] || x[0] - y[0]).slice(0, 4);
      const soma = top.reduce((t, [, w]) => t + w, 0);
      const pesos = top.map(([j, w]) => [j, Math.fround(w / soma)]);
      pesos[0][1] = Math.fround(pesos[0][1] + (1 - pesos.reduce((t, [, w]) => t + w, 0))); // arredondamento do float32
      while (pesos.length < 4) pesos.push([0, 0]);
      const novo = new Map(pesos.filter(([, w]) => w > 0));
      if (membros[gi].every((v) => igual(pesosDe(v), novo))) return;
      for (const v of membros[gi]) {
        vertices++;
        pesos.forEach(([j, w], k) => {
          if (locJ.a.componentType === 5121) saida.writeUInt8(j, locJ.at(v, k)); else saida.writeUInt16LE(j, locJ.at(v, k));
          saida.writeFloatLE(w, locW.at(v, k));
        });
      }
    });
    relatorio.push({ malha: s.malha, primitiva: s.primitiva, vertices: nv, gruposPelasRegras: direto, gruposNaRegiao: regiao.reduce((t, x) => t + x, 0), verticesReescritos: vertices, ...(zonas.length ? { costuras } : {}) });
  }
  return { bytes: saida, relatorio };
}
