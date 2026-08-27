/* ============================================================================
   corrego-margem-check.mjs — A MARGEM DO CÓRREGO É MARGEM, NÃO CALÇADA NUA.
   ----------------------------------------------------------------------------
   Relato do dono: "o corrego nao tem gramas nas laterais, e onde tem que tem a
   capivara e na outra ponta nao está realista suficiente".

   POR QUE ESTA RÉGUA EXISTE, tendo `eval:corrego-contract`: a cláusula de grama
   de lá nasce DORMENTE. Ela é guardada por `hasProp('grama_corrego…')`, e em node
   o GLTFLoader não carrega GLB — então `hasProp` é falso, a cláusula se
   auto-desliga, IMPRIME UM AVISO e o contrato fecha VERDE. Uma cláusula que mede
   "100 % de zero" é o pior tipo de régua: ela dá a sensação de cobertura sem
   cobrir. Aqui o template é PLANTADO à mão com `registerPropTemplate`, usando os
   bounds do binário — o código de colocação do JOGO roda de verdade.

   O que se mede: a vegetação ao longo dos 80 m de cada margem, e a SIMETRIA entre
   as duas pontas do canal (a ponta da capivara contra a outra).

   MUTAÇÃO (`--mutante=<id>`): devolve o defeito e a régua tem que acender.
   ============================================================================ */
import { readFileSync } from 'node:fs';
import { THREE, initTextures, bootGame } from './harness.mjs';
import { registerPropTemplate } from '../../public/js/mapprops.js';

const FLORA = ['grama_corrego_01', 'grama_corrego_02', 'planta_corrego_taboa', 'planta_corrego_taioba'];
const HALF_Z = 40;
const TALUDE_A = 3, TALUDE_B = 5;      // a faixa que o olho chama de "lateral do córrego"
const PONTES = [-22, 0, 22];
const RAMPAS = [
  { lado: -1, zAlto: -33, zBaixo: -27 }, { lado: 1, zAlto: -13, zBaixo: -7 },
  { lado: -1, zAlto: 9, zBaixo: 15 }, { lado: 1, zAlto: 29, zBaixo: 35 },
];
const VAO_MAX = 6.5;                   // maior trecho de margem sem nada, fora ponte e rampa
const POR_MARGEM_MIN = 20;             // tufos no talude, por margem
const PONTA_MIN = 3;                   // tufos em |z| >= 30, por ponta

const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const MUTANTES = new Set(['so-fileira-da-rua', 'so-uma-ponta']);
if (mutante && !MUTANTES.has(mutante)) {
  console.error(`mutante desconhecido: ${mutante} (conhecidos: ${[...MUTANTES].join(', ')})`);
  process.exit(2);
}

/* bounds do binário, sem GLTFLoader: os accessors de POSITION já trazem min/max */
function glbBounds(arq) {
  const buf = readFileSync(arq);
  const len = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const m of json.meshes || []) for (const p of m.primitives || []) {
    const a = json.accessors[p.attributes.POSITION];
    if (!a || !a.min) continue;
    for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], a.min[k]); mx[k] = Math.max(mx[k], a.max[k]); }
  }
  return { mn, mx };
}
for (const id of FLORA) {
  const b = glbBounds(`public/models/props/${id}.glb`);
  const size = [0, 1, 2].map((k) => b.mx[k] - b.mn[k]);
  const scene = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), new THREE.MeshStandardMaterial());
  mesh.position.set((b.mn[0] + b.mx[0]) / 2, (b.mn[1] + b.mx[1]) / 2, (b.mn[2] + b.mx[2]) / 2);
  scene.add(mesh);
  registerPropTemplate(id, scene);
}

const game = bootGame('corrego', { textures: initTextures(), ctf: true, seed: 13007 });
const root = game.world.root;

let tufos = [];
root.traverse((o) => { if (o.userData && o.userData.corregoFlora) tufos.push({ id: o.userData.corregoFlora, x: o.position.x, z: o.position.z }); });

if (mutante === 'so-fileira-da-rua') tufos = tufos.filter((t) => Math.abs(t.x) >= TALUDE_B);
if (mutante === 'so-uma-ponta') tufos = tufos.filter((t) => t.z < 30);

const noTalude = (t) => Math.abs(t.x) >= TALUDE_A && Math.abs(t.x) <= TALUDE_B;
const talude = tufos.filter(noTalude);
const oeste = talude.filter((t) => t.x < 0), leste = talude.filter((t) => t.x > 0);

/* maior vão sem vegetação, ignorando ponte e rampa (que são calçada de propósito) */
function maiorVao(lista, lado) {
  const legit = (z) => PONTES.some((b) => Math.abs(z - b) < 2.6)
    || RAMPAS.some((r) => r.lado === lado && z >= Math.min(r.zAlto, r.zBaixo) - 0.8 && z <= Math.max(r.zAlto, r.zBaixo) + 0.8);
  const zs = lista.map((t) => t.z).sort((a, b) => a - b);
  let pior = 0, onde = null;
  let ant = -HALF_Z;
  for (const z of [...zs, HALF_Z]) {
    // desconta do vão o que é ponte/rampa: amostra de 0,25 m
    let livre = 0, corrido = 0;
    for (let q = ant; q < z; q += 0.25) {
      if (legit(q)) { corrido = 0; continue; }
      corrido += 0.25;
      if (corrido > livre) livre = corrido;
    }
    if (livre > pior) { pior = livre; onde = [ant, z]; }
    ant = z;
  }
  return { pior, onde };
}
const vaoO = maiorVao(oeste, -1), vaoL = maiorVao(leste, 1);

const pontaNeg = tufos.filter((t) => t.z <= -30).length;
const pontaPos = tufos.filter((t) => t.z >= 30).length;

console.log(`\n[corrego-margem] ${tufos.length} tufos plantados · ${talude.length} no talude (|x| ∈ [${TALUDE_A}, ${TALUDE_B}])`);
console.log(`  por margem no talude: oeste ${oeste.length} · leste ${leste.length}`);
console.log(`  maior vão sem vegetação (fora ponte/rampa): oeste ${vaoO.pior.toFixed(2)} m · leste ${vaoL.pior.toFixed(2)} m`);
console.log(`  pontas do canal: z<=-30 ${pontaNeg} tufos · z>=+30 ${pontaPos} tufos`);
const porId = new Map();
for (const t of tufos) porId.set(t.id, (porId.get(t.id) || 0) + 1);
console.log(`  variedade: ${[...porId].map(([k, v]) => `${k}=${v}`).join(' · ')}`);

const checks = [
  ['MARG0 os 4 GLB de flora existem e foram plantados como template', tufos.length > 0, `${tufos.length} tufos`],
  [`MARG1 cada margem com >= ${POR_MARGEM_MIN} tufos NO TALUDE (a lateral do córrego)`,
    oeste.length >= POR_MARGEM_MIN && leste.length >= POR_MARGEM_MIN, `oeste ${oeste.length} · leste ${leste.length}`],
  [`MARG2 nenhum trecho de margem acima de ${VAO_MAX} m sem vegetação (fora ponte e rampa)`,
    vaoO.pior <= VAO_MAX && vaoL.pior <= VAO_MAX, `oeste ${vaoO.pior.toFixed(2)} m · leste ${vaoL.pior.toFixed(2)} m`],
  [`MARG3 as DUAS pontas do canal vegetadas (>= ${PONTA_MIN} tufos em |z| >= 30)`,
    pontaNeg >= PONTA_MIN && pontaPos >= PONTA_MIN, `z<=-30: ${pontaNeg} · z>=+30: ${pontaPos}`],
  ['MARG4 as 4 espécies do acervo em uso (nenhuma sobrando no disco)', porId.size === FLORA.length,
    `${porId.size} de ${FLORA.length}`],
];

let vermelho = 0;
console.log('');
for (const [nome, ok, det] of checks) {
  console.log(`  ${ok ? '✓' : '✗'} ${nome}${ok ? '' : ` — ${det}`}`);
  if (!ok) vermelho++;
}
if (mutante) {
  if (vermelho === 0) { console.error(`\nMUTANTE ${mutante} NÃO FOI PEGO — a régua não morde.`); process.exit(1); }
  console.log(`\nmutante ${mutante}: ${vermelho} cláusula(s) vermelha(s) — a régua mordeu.`);
  process.exit(0);
}
if (vermelho) { console.error(`\nCÓRREGO-MARGEM VERMELHO · ${vermelho} cláusula(s)`); process.exit(1); }
console.log('\nCÓRREGO-MARGEM OK — as duas laterais plantadas nos 80 m');
