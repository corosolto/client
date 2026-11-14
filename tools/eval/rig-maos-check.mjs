/* rig-maos-check.mjs — MÃO VIRA ESTILHAÇO QUANDO O CLIPE TOCA? (régua de rig, node puro)
   ----------------------------------------------------------------------------
   O DEFEITO (08/11, piloto capitao-caveira@0.1.0): nos 11 estados as duas mãos viravam
   lâminas planas esticadas. O peso estava "certo" (mão → LeftHand/RightHand, Curl sem
   vértice, IBM batendo com a junta a 1e-7), mas o tools/rig-from-donor.mjs transplantava
   o esqueleto do mst SEM encaixar as juntas na malha: o braço da malha do Mint passava
   ~10 cm acima e a mão ~20 cm à frente da junta LeftHand/RightHand. Girar a mão em torno
   de um pivô a 20 cm da carne, com os vizinhos divididos entre ForeArm e Hand, rasga a
   malha da mão em lâminas.

   O QUE MEDE: skinning em CPU (a mesma conta do SkinnedMesh do three) de cada GLB com os
   11 clipes do pack compartilhado (public/models/anims/mixamo, mesmos nomes de osso do
   meshy-28), 8 instantes por clipe. Para cada lado, a razão comprimento-esticado /
   comprimento-de-bind de toda aresta que toca a mão (peso na mão ≥ 0,25). Lâmina = aresta
   que cresce várias vezes. Também mostra o DESALINHO: distância do centróide da carne da
   mão (peso ≥ 0,5) até a junta da mão, em bind.

   Cláusulas:
     RM1  maior esticamento de aresta da mão ≤ LIMITE (padrão 2,5×) em todos os clipes
     RM2  modo --sintetico: malha sintética com braço alto e mão à frente (as medidas do
          piloto) rigada pelo rig-from-donor DE VERDADE com o mst como doador passa RM1;
          com AJUSTE_JUNTAS=0 (transplante cru, o comportamento antigo) tem que reprovar.
     RM3  em bind o skin devolve a malha crua (≤ 2 mm): junta que anda leva a IBM junto.
     RM4  modo --elenco: todo GLB REAL de public/models/characters medido; acima de 2,5×
          só as exceções legadas de ELENCO_EXCECOES, cada uma presa ao teto medido.

   Uso:
     node tools/eval/rig-maos-check.mjs <modelo.glb> [...]   [--clipes=<dir>] [--limite=2.5] [--json]
     node tools/eval/rig-maos-check.mjs --sintetico            (RM1 + RM2 + RM3)
     node tools/eval/rig-maos-check.mjs --elenco               (RM4)
   Mutantes (--mutante=<nome>, têm que reprovar na cláusula certa):
     transplante-cru  AJUSTE_JUNTAS=0 no rig do sintético              → RM1
     ibm-velha        o rig-from-donor move a junta e esquece a IBM    → RM3
    mao-deslocada      mst real com a junta LeftHand 22 cm fora da mão  → RM4
    uma-mao-cega       igual ao anterior, sem arestas mensuráveis à direita → RM4
    sem-mao-mensuravel remove as arestas das duas mãos → status explícito de não medido
    teto-congelado     melhora quita a dívida e regressão posterior reprova → RM4 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from '../../public/vendor/three.module.js';

const ROOT = join(import.meta.dirname, '../..');
const ESTADOS = ['idle', 'walk', 'run', 'shoot', 'death', 'crouch', 'crouchwalk', 'jump', 'idle1h', 'walk1h', 'walkfire'];
const AMOSTRAS = 8;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

function grafo(doc) {
  const pai = new Map();
  for (const n of doc.getRoot().listNodes()) for (const c of n.listChildren()) pai.set(c, n);
  return pai;
}
const local = (trs) => new THREE.Matrix4().compose(new THREE.Vector3().fromArray(trs.t), new THREE.Quaternion().fromArray(trs.r), new THREE.Vector3().fromArray(trs.s));

function amostrador(doc) {
  const anim = doc.getRoot().listAnimations()[0];
  if (!anim) return null;
  const canais = [];
  for (const ch of anim.listChannels()) {
    const s = ch.getSampler(), alvo = ch.getTargetNode();
    if (!s || !alvo) continue;
    const tempos = s.getInput().getArray(), valores = s.getOutput().getArray();
    const n = ch.getTargetPath() === 'rotation' ? 4 : 3;
    canais.push({ nome: alvo.getName(), caminho: ch.getTargetPath(), tempos, valores, n, cubica: s.getInterpolation() === 'CUBICSPLINE' });
  }
  const duracao = Math.max(0, ...canais.map((c) => c.tempos[c.tempos.length - 1]));
  const valor = (c, t) => {
    const T = c.tempos; let i = 0;
    while (i < T.length - 2 && T[i + 1] <= t) i++;
    const f = T.length > 1 ? Math.min(1, Math.max(0, (t - T[i]) / ((T[i + 1] - T[i]) || 1))) : 0;
    const pega = (k) => { const base = c.cubica ? (k * 3 + 1) * c.n : k * c.n; return Array.from(c.valores.slice(base, base + c.n)); };
    const a = pega(i), b = pega(Math.min(i + 1, T.length - 1));
    if (c.n === 4) return new THREE.Quaternion().fromArray(a).slerp(new THREE.Quaternion().fromArray(b), f).toArray();
    return a.map((x, k) => x + (b[k] - x) * f);
  };
  return { duracao, pose: (t) => canais.map((c) => ({ nome: c.nome, caminho: c.caminho, v: valor(c, t) })) };
}

async function carregaModelo(caminho) {
  const doc = await io.read(caminho);
  const pai = grafo(doc);
  const nos = doc.getRoot().listNodes();
  const skinNo = nos.find((n) => n.getSkin() && n.getMesh());
  if (!skinNo) throw new Error(`${caminho}: sem malha com skin`);
  const skin = skinNo.getSkin(), juntas = skin.listJoints();
  const ibm = juntas.map((_, i) => new THREE.Matrix4().fromArray(skin.getInverseBindMatrices().getElement(i, [])));
  const nomes = juntas.map((j) => j.getName());
  const trs = new Map(nos.map((n) => [n, { t: n.getTranslation(), r: n.getRotation(), s: n.getScale() }]));
  const mundo = (sobrepor) => {
    const cache = new Map();
    const w = (n) => {
      if (cache.has(n)) return cache.get(n);
      const m = local(sobrepor.get(n) || trs.get(n));
      const p = pai.get(n);
      const r = p ? new THREE.Matrix4().multiplyMatrices(w(p), m) : m;
      cache.set(n, r); return r;
    };
    return w;
  };
  const prims = skinNo.getMesh().listPrimitives().map((p) => ({
    pos: p.getAttribute('POSITION').getArray(), J: p.getAttribute('JOINTS_0').getArray(),
    W: p.getAttribute('WEIGHTS_0').getArray(), idx: p.getIndices()?.getArray() || null,
  }));
  return { doc, nos, juntas, nomes, ibm, trs, mundo, prims };
}

/* Skinning igual ao do jogo: o GLTFLoader faz `mesh.bind(skeleton, identidade)`, então o
   vértice vai para Σ peso · (mundoDaJunta · IBM) · v, sem a matriz do nó da malha. */
function pele(m, sobrepor) {
  const w = m.mundo(sobrepor);
  const mats = m.juntas.map((j, i) => new THREE.Matrix4().multiplyMatrices(w(j), m.ibm[i]));
  const acc = new THREE.Matrix4(), v = new THREE.Vector3();
  return m.prims.map((p) => {
    const n = p.pos.length / 3, out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      acc.elements.fill(0);
      for (let q = 0; q < 4; q++) {
        const peso = p.W[i * 4 + q]; if (!peso) continue;
        const e = mats[p.J[i * 4 + q]].elements;
        for (let k = 0; k < 16; k++) acc.elements[k] += e[k] * peso;
      }
      v.set(p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2]).applyMatrix4(acc);
      out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
    }
    return out;
  });
}

function pesoNaMao(m, lado) {
  const alvo = new Set(m.nomes.map((n, i) => (n === `${lado}Hand` || n === `Curl_${lado[0]}` ? i : -1)).filter((i) => i >= 0));
  return (p, v) => { let s = 0; for (let k = 0; k < 4; k++) if (alvo.has(p.J[v * 4 + k])) s += p.W[v * 4 + k]; return s; };
}

function arestasDaMao(m, lado, bind) {
  const peso = pesoNaMao(m, lado);
  return m.prims.map((p, pi) => {
    const n = p.pos.length / 3, idx = p.idx || Uint32Array.from({ length: n }, (_, i) => i), s = bind[pi];
    const vistas = new Set(), arestas = [];
    for (let t = 0; t + 2 < idx.length; t += 3) for (const [a, b] of [[idx[t], idx[t + 1]], [idx[t + 1], idx[t + 2]], [idx[t + 2], idx[t]]]) {
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      if (vistas.has(k)) continue; vistas.add(k);
      if (peso(p, a) < 0.25 && peso(p, b) < 0.25) continue;
      const L = Math.hypot(s[a * 3] - s[b * 3], s[a * 3 + 1] - s[b * 3 + 1], s[a * 3 + 2] - s[b * 3 + 2]);
      if (L > 1e-6) arestas.push([a, b, L]);
    }
    return arestas;
  });
}

// Distância da carne da mão (peso ≥ 0,5, em bind) até a junta da mão, em metros do jogo.
function desalinho(m, lado, bind) {
  const peso = pesoNaMao(m, lado), c = new THREE.Vector3(); let n = 0;
  m.prims.forEach((p, pi) => { for (let v = 0; v < p.pos.length / 3; v++) if (peso(p, v) >= 0.5) { c.add(new THREE.Vector3().fromArray(bind[pi], v * 3)); n++; } });
  const junta = m.juntas[m.nomes.indexOf(`${lado}Hand`)];
  return n ? c.divideScalar(n).distanceTo(new THREE.Vector3().setFromMatrixPosition(m.mundo(new Map())(junta))) : null;
}

export async function medirMaos(caminho, { clipes = join(ROOT, 'public/models/anims/mixamo') } = {}) {
  const m = await carregaModelo(caminho);
  const porNome = new Map();
  for (const n of m.nos) { const l = porNome.get(n.getName()) || []; l.push(n); porNome.set(n.getName(), l); }
  const bind = pele(m, new Map());
  // RM3: em bind o skin tem que devolver a malha crua (IBM coerente com a junta que andou).
  let bindMax = 0;
  m.prims.forEach((p, pi) => { for (let k = 0; k < p.pos.length; k++) bindMax = Math.max(bindMax, Math.abs(bind[pi][k] - p.pos[k])); });
  const lados = ['Left', 'Right'].map((lado) => ({ lado, arestas: arestasDaMao(m, lado, bind), pior: 1, estado: null, desalinho: desalinho(m, lado, bind), bindMax }));
  for (const estado of ESTADOS) {
    const amostra = amostrador(await io.read(join(clipes, `${estado}.glb`)));
    if (!amostra) throw new Error(`${estado}: clipe sem animação`);
    for (let k = 0; k < AMOSTRAS; k++) {
      const sobrepor = new Map();
      for (const { nome, caminho: c, v: val } of amostra.pose((amostra.duracao * k) / (AMOSTRAS - 1 || 1))) {
        for (const n of porNome.get(nome) || []) {
          const base = sobrepor.get(n) || { ...m.trs.get(n) };
          sobrepor.set(n, { ...base, [c === 'translation' ? 't' : c === 'rotation' ? 'r' : 's']: val });
        }
      }
      const skinned = pele(m, sobrepor);
      for (const l of lados) l.arestas.forEach((lista, pi) => {
        const s = skinned[pi];
        for (const [a, b, L] of lista) {
          const r = Math.hypot(s[a * 3] - s[b * 3], s[a * 3 + 1] - s[b * 3 + 1], s[a * 3 + 2] - s[b * 3 + 2]) / L;
          if (r > l.pior) { l.pior = r; l.estado = estado; }
        }
      });
    }
  }
  return lados.map(({ lado, pior, estado, desalinho: d, arestas, bindMax: b }) => ({ lado, arestas: arestas.reduce((a, l) => a + l.length, 0), pior, estado, desalinho: d, bindMax: b }));
}

/* Malha sintética nas medidas do piloto (em metros, pés em 0, H 1,7): tronco, cabeça,
   pernas e braços em tubos; o braço passa 10 cm ACIMA da linha de juntas do mst e o
   antebraço dobra pra frente até a mão ficar ~18 cm à frente — o desalinho medido. */
export function malhaSintetica() {
  const doc = new Document(), buf = doc.createBuffer();
  const pos = [], idx = [];
  const tubo = (pontos, raio, lados = 8) => {
    const base = pos.length / 3;
    for (const [x, y, z] of pontos) for (let k = 0; k < lados; k++) {
      const a = (k / lados) * Math.PI * 2;
      // seção perpendicular aproximada: braço é horizontal (anel em y/z), resto vertical (anel em x/z)
      const horizontal = pontos.length > 1 && Math.abs(pontos[1][1] - pontos[0][1]) < Math.abs(pontos[1][0] - pontos[0][0]);
      pos.push(horizontal ? x : x + raio * Math.cos(a), horizontal ? y + raio * Math.cos(a) : y, z + raio * Math.sin(a));
    }
    for (let r = 0; r + 1 < pontos.length; r++) for (let k = 0; k < lados; k++) {
      const a = base + r * lados + k, b = base + r * lados + ((k + 1) % lados), c = a + lados, d = b + lados;
      idx.push(a, c, b, b, c, d);
    }
  };
  const linha = (a, b, passo = 0.02) => { const n = Math.max(1, Math.round(Math.hypot(...b.map((x, i) => x - a[i])) / passo)); return Array.from({ length: n + 1 }, (_, i) => a.map((x, k) => x + ((b[k] - x) * i) / n)); };
  tubo(linha([0, 0.95, 0], [0, 1.45, 0]), 0.16);                       // tronco
  tubo(linha([0, 1.47, 0], [0, 1.70, 0]), 0.10);                       // cabeça
  for (const sx of [1, -1]) {
    tubo(linha([0.09 * sx, 0.0, 0], [0.09 * sx, 0.95, 0]), 0.07);        // perna
    const ombro = [0.15 * sx, 1.335, 0], cotovelo = [0.40 * sx, 1.33, 0.0], punho = [0.62 * sx, 1.32, 0.17], ponta = [0.74 * sx, 1.32, 0.19];
    tubo([...linha(ombro, cotovelo), ...linha(cotovelo, punho).slice(1)], 0.05);
    tubo(linha(punho, ponta, 0.01), 0.035, 6);                           // mão achatada, 12 cm
  }
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(Float32Array.from(pos)).setBuffer(buf))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(Uint32Array.from(idx)).setBuffer(buf));
  const mesh = doc.createMesh('sintetico').addPrimitive(prim);
  doc.createScene().addChild(doc.createNode('sintetico').setMesh(mesh));
  return doc;
}

const BIND_MAX = 0.002;
// RM3 só vale para saída do rig-from-donor: rig do Mint/Meshy já chega com 8-15 mm em bind e renderiza certo.
const veredito = (r, limite, comBind = true) => r.every((l) => l.pior <= limite && (!comBind || l.bindMax <= BIND_MAX));
const linha = (nome, r) => `${nome}: ${r.map((l) => `${l.lado} ${l.pior.toFixed(2)}× (${l.estado}, ${l.arestas} arestas, desalinho ${l.desalinho == null ? '?' : (l.desalinho * 100).toFixed(1) + ' cm'})`).join(' | ')} | bind ${(r[0].bindMax * 1000).toFixed(2)} mm`;

/* [env AJUSTE_JUNTAS, trecho do rig-from-donor, troca, cláusula que tem que morder] */
const MUTANTES = {
  'transplante-cru': ['0', null, null, 'RM1:'],
  'ibm-velha': ['1', 'for (const i of movidas) ibmAjustada.set(', 'for (const i of []) ibmAjustada.set(', 'RM3:'],
};

/* RM4 — ELENCO REAL: todo GLB de public/models/characters medido com o pack compartilhado.
   As falhas legadas e seus tetos ficam no KNOWN-RED, com issue/plano. Assim o ratchet
   comum é a fonte única da dívida e a quitação remove a entrada global. */
const KNOWN_RED_DOC = JSON.parse(readFileSync(join(ROOT, 'tools/eval/KNOWN-RED.json'), 'utf8'));
const KNOWN_RED = KNOWN_RED_DOC.dividas;
const RM4_LEGACY_ADVISORY = 'RIG_RM4_LEGACY_20261108';
const ELENCO_RATCHET = Object.freeze(KNOWN_RED_DOC.tetos?.[RM4_LEGACY_ADVISORY] || {});

const RATCHET_EPS = 0.0001;
function falhaRatchet(id, pior, teto, limite) {
  if (!Number.isFinite(teto)) return pior > limite ? `RM4: ${id} estica a mão ${pior.toFixed(4)}× > ${limite}×` : null;
  if (pior <= limite) return `RM4: ${id} quitou a dívida (${pior.toFixed(4)}× ≤ ${limite}×); remova o teto de ${RM4_LEGACY_ADVISORY}`;
  if (pior > teto + RATCHET_EPS) return `RM4: ${id} piorou: ${pior.toFixed(4)}× > teto ${teto}× do ${RM4_LEGACY_ADVISORY}`;
  if (pior < teto - RATCHET_EPS) return `RM4: ${id} melhorou para ${pior.toFixed(4)}×; atualize o teto ${teto}× do ${RM4_LEGACY_ADVISORY}`;
  return null;
}


/* Mutantes de elenco: deslocam LeftHand no mst real como no defeito do piloto.
   `uma-mao-cega` também remove as arestas mensuráveis da direita para provar que
   uma mão sem geometria não pode esconder a reprovação da outra. `sem-mao-mensuravel`
   remove ambas para provar que o resultado é reportado separadamente, nunca como verde. */
async function maoDeslocada(origem, destino, ocultar = '') {
  const doc = await io.read(origem);
  const pai = grafo(doc), skin = doc.getRoot().listSkins()[0], juntas = skin.listJoints();
  const mundo = (n) => { const m = local({ t: n.getTranslation(), r: n.getRotation(), s: n.getScale() }); const p = pai.get(n); return p ? mundo(p).multiply(m) : m; };
  const mao = juntas.find((j) => j.getName() === 'LeftHand');
  const alvo = new THREE.Vector3().setFromMatrixPosition(mundo(mao)).add(new THREE.Vector3(0, 0.10, 0.20));
  mao.setTranslation(alvo.applyMatrix4(mundo(pai.get(mao)).invert()).toArray());
  const ibm = skin.getInverseBindMatrices(), arr = ibm.getArray().slice();
  juntas.forEach((j, i) => { for (let n = j; n; n = pai.get(n)) if (n === mao) { arr.set(mundo(j).invert().elements, i * 16); break; } });
  ibm.setArray(arr);
  for (const lado of ocultar === 'ambas' ? ['Left', 'Right'] : ocultar ? [ocultar] : []) {
    const alvos = new Set(juntas.map((j, i) => (j.getName() === `${lado}Hand` || j.getName() === `Curl_${lado[0]}` ? i : -1)).filter((i) => i >= 0));
    const antebraco = juntas.findIndex((j) => j.getName() === `${lado}ForeArm`);
    for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
      const accessor = prim.getAttribute('JOINTS_0');
      if (!accessor) continue;
      const indices = accessor.getArray().slice();
      for (let i = 0; i < indices.length; i++) if (alvos.has(indices[i])) indices[i] = antebraco;
      accessor.setArray(indices);
    }
  }
  await io.write(destino, doc);
  return destino;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (n, d) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
  const LIMITE = +opt('limite', 2.5);
  const clipes = opt('clipes', join(ROOT, 'public/models/anims/mixamo'));
  const mutante = opt('mutante', '');
  if (mutante && !MUTANTES[mutante] && !['mao-deslocada', 'uma-mao-cega', 'sem-mao-mensuravel', 'teto-congelado'].includes(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);
  if (args.includes('--elenco') || ['mao-deslocada', 'uma-mao-cega', 'sem-mao-mensuravel', 'teto-congelado'].includes(mutante)) {
    const dir = join(ROOT, 'public/models/characters');
    const ids = readdirSync(dir).filter((f) => f.endsWith('.glb')).map((f) => f.replace(/\.glb$/, '')).sort();
    const caminhos = Object.fromEntries(ids.map((id) => [id, join(dir, `${id}.glb`)]));
    const mutantesModelo = ['mao-deslocada', 'uma-mao-cega', 'sem-mao-mensuravel'];
    const tmp = mutantesModelo.includes(mutante) ? mkdtempSync(join(tmpdir(), 'rig-maos-elenco-')) : null;
    const falhas = [], naoMensuraveis = [], hoje = new Date().toISOString().slice(0, 10);
    if (mutante === 'teto-congelado') {
      const quitacao = falhaRatchet('legado', 2.4, 3.27, LIMITE);
      const regressao = falhaRatchet('legado', 3.2, undefined, LIMITE);
      const morde = quitacao?.includes('quitou a dívida') && regressao?.includes('estica a mão');
      console.log(morde
        ? 'mutante teto-congelado reprovado: melhora quita a exceção e regressão posterior fica sem teto'
        : `MUTAÇÃO PASSOU — teto-congelado (${quitacao || 'quitação aceita'} | ${regressao || 'regressão aceita'})`);
      process.exit(morde ? 0 : 1);
    }
    if (!KNOWN_RED[RM4_LEGACY_ADVISORY]) throw new Error(`RM4: ${RM4_LEGACY_ADVISORY} precisa estar declarado em tools/eval/KNOWN-RED.json`);
    try {
      if (mutantesModelo.includes(mutante)) caminhos.mst = await maoDeslocada(caminhos.mst, join(tmp, 'mst.glb'), mutante === 'uma-mao-cega' ? 'Right' : mutante === 'sem-mao-mensuravel' ? 'ambas' : '');
      for (const id of ids) {
        const r = await medirMaos(caminhos[id], { clipes });
        const medidos = r.filter((l) => l.arestas > 0);
        const semMedir = r.filter((l) => !l.arestas);
        if (semMedir.length) console.log(`  não medido: ${id} sem aresta pesada na mão ${semMedir.map((l) => l.lado).join('/')}`);
        if (!medidos.length) { naoMensuraveis.push(id); continue; }
        const pior = Math.max(...medidos.map((l) => l.pior)), teto = ELENCO_RATCHET[id];
        const falha = falhaRatchet(id, pior, teto, LIMITE);
        if (falha) {
          falhas.push(falha);
        } else if (Number.isFinite(teto) && pior > LIMITE) {
          console.log(`  dívida: ${id} ${pior.toFixed(4)}× ≈ teto ${teto}× (${RM4_LEGACY_ADVISORY}, medida ${hoje})`);
        }
      }
    } finally { if (tmp) rmSync(tmp, { recursive: true, force: true }); }
    if (mutante) {
      const semMao = mutante === 'sem-mao-mensuravel';
      const morde = semMao
        ? falhas.length === 0 && naoMensuraveis.includes('mst')
        : falhas.length > 0 && falhas.every((f) => f.startsWith('RM4: mst'));
      console.log(morde
        ? semMao ? 'mutante sem-mao-mensuravel reportado como não mensurável, sem contá-lo como aprovado' : `mutante ${mutante} reprovado como devia: ${falhas[0]}`
        : `MUTAÇÃO PASSOU — ${mutante} (${falhas.join(' | ') || 'nenhuma falha'})`);
      process.exit(morde ? 0 : 1);
    }
    if (falhas.length) { for (const f of falhas) console.error(`  ✗ ${f}`); process.exit(1); }
    const dividas = ids.filter((id) => Number.isFinite(ELENCO_RATCHET[id]) && !naoMensuraveis.includes(id));
    console.log(`rig-maos elenco: ${ids.length} GLB reais; ${ids.length - dividas.length - naoMensuraveis.length} ≤ ${LIMITE}×, ${dividas.length} dívidas no KNOWN-RED dentro do teto, ${naoMensuraveis.length} não mensuráveis (não contados como aprovados).`);
    process.exit(0);
  }
  if (args.includes('--sintetico') || mutante) {
    const tmp = mkdtempSync(join(tmpdir(), 'rig-maos-'));
    const falhas = [];
    const [envAjuste, de, para, clausula] = MUTANTES[mutante] || ['1', null, null, null];
    // Mutante de código: cópia mutada AO LADO do original (os imports relativos precisam do mesmo dir).
    const ferramenta = de ? join(ROOT, 'tools', `.rig-from-donor.mutante-${process.pid}.mjs`) : join(ROOT, 'tools/rig-from-donor.mjs');
    try {
      if (de) {
        const fonte = readFileSync(join(ROOT, 'tools/rig-from-donor.mjs'), 'utf8');
        if (fonte.split(de).length !== 2) throw new Error(`mutante exige âncora única: ${mutante}`);
        writeFileSync(ferramenta, fonte.replace(de, para));
      }
      const cru = join(tmp, 'cru.glb');
      await io.write(cru, malhaSintetica());
      const rigar = (script, saida, ajuste) => {
        const r = spawnSync(process.execPath, [script, 'public/models/characters/mst.glb', cru, saida],
          { cwd: ROOT, encoding: 'utf8', env: { ...process.env, AJUSTE_JUNTAS: ajuste } });
        if (r.status !== 0) throw new Error(`rig-from-donor falhou: ${r.stderr || r.stdout}`);
      };
      const ajustado = join(tmp, 'ajustado.glb'), semAjuste = join(tmp, 'sem-ajuste.glb');
      rigar(ferramenta, ajustado, envAjuste);
      rigar(join(ROOT, 'tools/rig-from-donor.mjs'), semAjuste, '0');
      const a = await medirMaos(ajustado, { clipes }), b = await medirMaos(semAjuste, { clipes });
      console.log(linha('sintético rigado (ajuste ligado)', a));
      console.log(linha('sintético rigado (AJUSTE_JUNTAS=0)', b));
      if (a.some((l) => !l.arestas)) falhas.push('RM1: sintético rigado sem aresta pesada na mão — nada foi medido');
      else if (a.some((l) => l.pior > LIMITE)) falhas.push(`RM1: mão do sintético rigado estica ${Math.max(...a.map((l) => l.pior)).toFixed(2)}× > ${LIMITE}×`);
      if (a[0].bindMax > BIND_MAX) falhas.push(`RM3: em bind o skin desloca a malha ${(a[0].bindMax * 1000).toFixed(1)} mm > ${BIND_MAX * 1000} mm (IBM incoerente com a junta)`);
      if (!mutante && veredito(b, LIMITE)) falhas.push('RM2: transplante cru passou — a régua não enxerga o defeito do piloto');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
      if (de) rmSync(ferramenta, { force: true });
    }
    if (mutante) {
      const morde = falhas.length > 0 && falhas.every((f) => f.startsWith(clausula));
      console.log(morde ? `mutante ${mutante} reprovado como devia: ${falhas[0]}` : `MUTAÇÃO PASSOU — ${mutante} (${falhas.join(' | ') || 'nenhuma falha'})`);
      process.exit(morde ? 0 : 1);
    }
    if (falhas.length) { for (const f of falhas) console.error(`  ✗ ${f}`); process.exit(1); }
    console.log(`rig-maos confere: o rig-from-donor encaixa as juntas e a mão não vira lâmina (≤ ${LIMITE}×); o transplante cru reprova.`);
    process.exit(0);
  }
  const modelos = args.filter((a) => !a.startsWith('--'));
  if (!modelos.length) { console.error('uso: rig-maos-check.mjs <modelo.glb> [...] | --sintetico'); process.exit(2); }
  const json = args.includes('--json'), todos = [];
  let ruins = 0, semMao = 0;
  for (const caminho of modelos) {
    const r = await medirMaos(caminho, { clipes });
    // Sem aresta pesada na mão (mascote de braço-toco) não há o que medir: não é verde.
    const medido = r.every((l) => l.arestas > 0);
    const ok = medido && veredito(r, LIMITE, false);
    if (!medido) semMao++; else if (!ok) ruins++;
    todos.push({ modelo: caminho, ok, medido, maos: r });
    if (!json) console.log(`${!medido ? '  ?' : ok ? '  ✓' : '  ✗'} ${linha(caminho.split('/').pop(), r)}`);
  }
  if (json) console.log(JSON.stringify(todos, null, 1));
  else console.log(`${modelos.length - ruins - semMao}/${modelos.length} dentro de ${LIMITE}×${semMao ? `; ${semMao} sem mão medível (não medido)` : ''}`);
  process.exit(ruins ? 1 : 0);
}
