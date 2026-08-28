/* Dá nó próprio ao que outra frente anima nos GLBs do lote 3 (rotor principal
   e cauda, rabiola, faixa). O Meshy entrega malha única em ilhas de 1-150 tris
   (1155 componentes no heli) — componente conexo não separa peça semântica.
   A regra é por centróide de triângulo, calibrada no render do modelo bruto
   (evidência em tools/eval/asset-evidence/props-v21/):
     heli: rotor_main = y > 0,14 (disco+cubo; corpo do heli para em 0,13, cauda em 0,13)
           rotor_tail = x < -0,38 && z < -0,04 (X da cauda no lado -z; aleta fica em z≈0)
     pipa: rabiola = y < -0,12 (corrente de lacinhos abaixo da ponta da vela)
     avião: faixa = x > -0,02 (pano 0,0..0,49; cauda do avião para em -0,08)
   Uso: node tools/split-props-v21.mjs <helicoptero_pm|pipa_papel|aviao_faixa> */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const CONFIG = {
  helicoptero_pm: {
    src: 'references/glb/helicoptero_pm_mint.glb',
    out: 'references/glb/helicoptero_pm_split.glb',
    regras: [
      { nome: 'rotor_main', teste: (c) => c[1] > 0.14, pivo: [0.08, 0.17, 0.0] },
      { nome: 'rotor_tail', teste: (c) => c[0] < -0.38 && c[2] < -0.04, pivo: [-0.44, 0.02, -0.05] },
    ],
  },
  pipa_papel: {
    src: 'references/glb/pipa_papel_mint.glb',
    out: 'references/glb/pipa_papel_split.glb',
    regras: [{ nome: 'rabiola', teste: (c) => c[1] < -0.12, pivo: [0.14, -0.12, 0.02] }],
  },
  aviao_faixa: {
    src: 'references/glb/aviao_faixa_mint.glb',
    out: 'references/glb/aviao_faixa_split.glb',
    regras: [{ nome: 'faixa', teste: (c) => c[0] > -0.02, pivo: [0.0, 0.0, -0.095] }],
  },
  /* ARARA EM VOO (plans/22 § "Pombas voando"). O `pigeon_flight.glb` foi removido na
     v2.1 porque era ave de asas abertas PARADA — arte estática pendurada no céu. O
     plano registra a condição para a presença aérea voltar: "só com pássaro riggado
     de verdade (não existe CC0; rig Mint é humanoid-only)". O rig continua não
     existindo, então a asa vira NÓ e o bater é procedural, exatamente como o tatu
     anda e a pipa balança — mesma solução da fauna 2.

     Regra medida no GLB bruto (tools/_tmp-probe2 → evidência em asset-evidence):
     corpo+cabeça+cauda ocupam |z| <= 0,10 e x ∈ [−0,36; 0,36]; TODO triângulo com
     |z| > 0,10 está na faixa x ∈ [−0,23; −0,03], y ∈ [0,02; 0,15] — ou seja, é asa,
     e nada de corpo invade. 512/515 tris por asa, simétrico. Pivô na RAIZ da asa
     (encosto no corpo), senão a asa bate girando em torno da ponta da pena. */
  arara_voo: {
    src: 'references/glb/arara_voo_mint.glb',
    out: 'references/glb/arara_voo_split.glb',
    regras: [
      { nome: 'asa-direita', teste: (c) => c[2] > 0.10, pivo: [-0.13, 0.06, 0.10] },
      { nome: 'asa-esquerda', teste: (c) => c[2] < -0.10, pivo: [-0.13, 0.06, -0.10] },
    ],
  },
};

const alvo = process.argv[2];
if (!alvo || !CONFIG[alvo]) {
  console.error(`uso: split-props-v21.mjs <${Object.keys(CONFIG).join('|')}>`);
  process.exit(1);
}
const { src, out, regras } = CONFIG[alvo];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(src);
const root = doc.getRoot();
const scene = root.getDefaultScene() || root.listScenes()[0];

// buckets: nome -> { P, U, N, idx, material, primCount }
const nomes = ['corpo', ...regras.map((r) => r.nome)];
const buckets = new Map(nomes.map((n) => [n, []]));

for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    const uv = prim.getAttribute('TEXCOORD_0');
    const nrm = prim.getAttribute('NORMAL');
    const idx = prim.getIndices();
    const triCount = idx ? idx.getCount() / 3 : pos.getCount() / 3;
    const vi = (t, k) => (idx ? idx.getScalar(t * 3 + k) : t * 3 + k);
    const porRegra = new Map(nomes.map((n) => [n, []]));
    const a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
    for (let t = 0; t < triCount; t++) {
      pos.getElement(vi(t, 0), a); pos.getElement(vi(t, 1), b); pos.getElement(vi(t, 2), c);
      const centro = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      const regra = regras.find((r) => r.teste(centro));
      porRegra.get(regra ? regra.nome : 'corpo').push(t);
    }
    for (const [nome, tris] of porRegra) {
      if (!tris.length) continue;
      buckets.get(nome).push({ prim, tris, pos, uv, nrm, idx });
    }
  }
  node.dispose();
}

for (const [nome, partes] of buckets) {
  if (!partes.length) continue;
  let P = [], U = [], N = [], IDX = [];
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let material = null;
  for (const { prim, tris, pos, uv, nrm, idx } of partes) {
    material = material || prim.getMaterial();
    const mapa = new Map();
    const vi = (t, k) => (idx ? idx.getScalar(t * 3 + k) : t * 3 + k);
    for (const t of tris) for (let k = 0; k < 3; k++) {
      const v = vi(t, k);
      if (!mapa.has(v)) {
        mapa.set(v, P.length / 3);
        const p = pos.getElement(v, [0, 0, 0]);
        P.push(p[0], p[1], p[2]);
        for (let e = 0; e < 3; e++) { min[e] = Math.min(min[e], p[e]); max[e] = Math.max(max[e], p[e]); }
        if (uv) { const t2 = uv.getElement(v, [0, 0]); U.push(t2[0], t2[1]); }
        if (nrm) { const n3 = nrm.getElement(v, [0, 0, 0]); N.push(n3[0], n3[1], n3[2]); }
      }
      IDX.push(mapa.get(v));
    }
  }
  const pivo = regras.find((r) => r.nome === nome)?.pivo;
  if (pivo) for (let i = 0; i < P.length; i += 3) { P[i] -= pivo[0]; P[i + 1] -= pivo[1]; P[i + 2] -= pivo[2]; }
  const mesh = doc.createMesh(nome);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(P)))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(IDX)))
    .setMaterial(material);
  if (U.length) prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(U)));
  if (N.length) prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(N)));
  mesh.addPrimitive(prim);
  scene.addChild(doc.createNode(nome).setMesh(mesh).setTranslation(pivo || [0, 0, 0]));
  console.log(`${nome}: ${IDX.length / 3} tris, min=(${min.map((v) => v.toFixed(2))}) max=(${max.map((v) => v.toFixed(2))})${pivo ? ` pivo=(${pivo})` : ''}`);
}

await io.write(out, doc);
console.log(`-> ${out}`);
