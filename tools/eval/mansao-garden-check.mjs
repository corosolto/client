/* JARDIM DA MANSÃO — variedade, composição e escala (plans/13-VISUAL-V2.1).
   Frase do dono (18/08): "o jardim esta bizarro". Diagnóstico medido na árvore:
   72 clones idênticos num único InstancedMesh (12 anéis de 6, sem cor por instância)
   e maciços espalhados sem composição. Decisão: refazer com régua.
   Os props Mint do BUG-56 (banco, poste, escultura, vaso, lounge, lampião) e a
   frota GLB NÃO são medidos aqui — têm contrato próprio em mansao-water-check e
   mansao-glb-fit.

   G1 VARIEDADE: (i) teto de 30 instâncias por malha de folhagem instanciada — 72
   era catálogo; (ii) tint E escala POR INSTÂNCIA (instanceColor ≥ 4 cores distintas,
   spread de escala p90/p10 ≥ 1,5) — clone idêntico é o defeito que o dono nomeou;
   (iii) ≤ 8 instâncias DA MESMA malha num raio de 6 m — colônia mecânica.
   G2 COMPOSIÇÃO: (a) o caminho de pedras liga portão→porta (cadeia de pedras com
   passos ≤ 3,0 m cobrindo z de ~31 a ~19); (b) de porta a piscina se CHEGA andando
   (sonda de desvio com _collide real); (c) nenhum plantio em cima do caminho
   (distância mínima 0,8 m das pedras).
   G3 ESCALA: planta contra o jogador de 1,70 m — dossel (bromélia/maciço/massa)
   0,50–2,60 m; forração instanciada 0,20–2,60 m; árvore 3,0–6,8 m.

   Mutantes (todos PROVAM que aplicaram — skill regua): clona-tudo (instâncias
   idênticas em grade, sem cor) | planta-no-caminho (bromélia em cima da pedrada) |
   planta-gigante (bromélia 3× = 2,7 m) | sem-pedras.
   Uso: node tools/eval/mansao-garden-check.mjs [--mutante=...]
*/
import { THREE, initTextures, bootGame } from './harness.mjs';

const MUT_CLONA = process.argv.includes('--mutante=clona-tudo');
const MUT_CAMINHO = process.argv.includes('--mutante=planta-no-caminho');
const MUT_GIGANTE = process.argv.includes('--mutante=planta-gigante');
const MUT_SEM_PEDRAS = process.argv.includes('--mutante=sem-pedras');
const algumMutante = () => process.argv.some((a) => a.startsWith('--mutante='));

const game = bootGame('fy_mansao', { textures: initTextures(), ctf: true, seed: 14000 });
const marcados = [];
game.world.root.traverse((o) => { if (o.userData?.mansaoFeature) marcados.push(o); });
game.world.root.updateMatrixWorld(true);

/* ── coleta ── */
const folhagens = marcados.filter((o) => o.isInstancedMesh && ['folhagem-instanciada', 'tropical-3d'].includes(o.userData.mansaoFeature));
const pedras = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'pedra-caminho');
const arvores = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'arvore');

if (MUT_CLONA) {
  if (!folhagens.length) { console.error('MUTANTE clona-tudo NÃO APLICOU (nenhuma folhagem instanciada)'); process.exit(1); }
  for (const mesh of folhagens) {
    const n = mesh.count;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Matrix4();
      mesh.getMatrixAt(0, m);   // vendor getMatrixAt não retorna: passa a matriz
      const p = new THREE.Vector3((i % 8 - 3.5) * 0.9, 0, Math.floor(i / 8) * 0.9);
      m.setPosition(p.x + mesh.position.x, p.y, p.z + mesh.position.z);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor = null;
  }
}
if (MUT_SEM_PEDRAS) {
  if (!pedras.length) { console.error('MUTANTE sem-pedras NÃO APLICOU (nenhuma pedra marcada)'); process.exit(1); }
  for (const p of pedras) p.visible = false;
}
const pedrasVivas = () => marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'pedra-caminho');

/* plantios: centros por tipo (grupo inteiro ou instância) */
const plantios = () => {
  const lista = [];
  for (const o of marcados) {
    if (o.visible === false) continue;
    const f = o.userData.mansaoFeature;
    if (['bromelia', 'garden-cluster', 'garden-mass'].includes(f)) {
      const b = new THREE.Box3().setFromObject(o);
      lista.push({ tipo: f, p: b.getCenter(new THREE.Vector3()), h: b.max.y - b.min.y });
    }
  }
  for (const mesh of folhagens) {
    if (mesh.visible === false) continue;
    const geo = mesh.geometry.boundingBox ?? (mesh.geometry.computeBoundingBox(), mesh.geometry.boundingBox);
    for (let i = 0; i < mesh.count; i++) {
      const m = new THREE.Matrix4();
      mesh.getMatrixAt(i, m);
      const sy = new THREE.Vector3().setFromMatrixColumn(m, 1).length();
      lista.push({ tipo: 'instancia', p: new THREE.Vector3().setFromMatrixPosition(m), h: sy * (geo.max.y - geo.min.y) });
    }
  }
  return lista;
};

if (MUT_CAMINHO) {
  const ps = plantios().filter((pl) => pl.tipo === 'bromelia');
  if (!ps.length || !pedrasVivas().length) { console.error('MUTANTE planta-no-caminho NÃO APLICOU (sem bromélia ou sem pedra)'); process.exit(1); }
  const alvo = game.world.root.children.find((c) => c.userData?.mansaoFeature === 'bromelia');
  const pedra = pedrasVivas()[0];
  alvo.position.set(pedra.position.x + 0.25, 0, pedra.position.z);
  alvo.updateMatrixWorld(true);
}
if (MUT_GIGANTE) {
  const alvo = game.world.root.children.find((c) => c.userData?.mansaoFeature === 'bromelia');
  if (!alvo) { console.error('MUTANTE planta-gigante NÃO APLICOU (sem bromélia)'); process.exit(1); }
  alvo.scale.setScalar(3);
  alvo.updateMatrixWorld(true);
}

/* ── G1 variedade ── */
const instData = (mesh) => {
  const cores = new Set(), sxs = [], pos = [];
  const cArr = mesh.instanceColor?.array;
  const c = new THREE.Color();
  for (let i = 0; i < mesh.count; i++) {
    const m = new THREE.Matrix4();
    mesh.getMatrixAt(i, m);
    sxs.push(new THREE.Vector3().setFromMatrixColumn(m, 0).length());
    pos.push(new THREE.Vector3().setFromMatrixPosition(m));
    if (cArr) {
      c.setRGB(cArr[i * 3], cArr[i * 3 + 1], cArr[i * 3 + 2]);
      const hsl = {};
      c.getHSL(hsl);
      cores.add(`${Math.round(hsl.h * 12)}:${Math.round(hsl.l * 5)}`);
    }
  }
  sxs.sort((a, b) => a - b);
  let piorCluster = 0;
  for (let i = 0; i < pos.length; i++) {
    let n = 0;
    for (let j = 0; j < pos.length; j++) if (i !== j && pos[i].distanceTo(pos[j]) <= 6) n++;
    piorCluster = Math.max(piorCluster, n + 1);
  }
  const p10 = sxs[Math.floor(sxs.length * 0.1)], p90 = sxs[Math.floor(sxs.length * 0.9)];
  return { n: mesh.count, cores: cores.size, spread: p90 / Math.max(p10, 1e-6), piorCluster };
};
const dados = folhagens.filter((m) => m.visible !== false).map(instData);
const g1count = dados.length ? Math.max(...dados.map((d) => d.n)) : 0;
const g1cor = dados.length && dados.every((d) => d.cores >= 4 && d.spread >= 1.5);
const g1cluster = dados.length ? Math.max(...dados.map((d) => d.piorCluster)) : 0;
const g1total = dados.reduce((s, d) => s + d.n, 0);

/* ── G2 composição ── */
const ps = pedrasVivas().map((p) => p.position.clone());
// cadeia: união-busca por passos ≤ 3,0 m
const cadeia = (() => {
  if (ps.length < 2) return { ok: false, motivo: `${ps.length} pedra(s) marcada(s)`, amostra: 0 };
  const pai = ps.map((_, i) => i);
  const find = (i) => (pai[i] === i ? i : (pai[i] = find(pai[i])));
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++)
    if (ps[i].distanceTo(ps[j]) <= 3.0) pai[find(i)] = find(j);
  const grupos = new Map();
  ps.forEach((_, i) => { const r = find(i); grupos.set(r, (grupos.get(r) || 0) + 1); });
  const maior = [...grupos.entries()].sort((a, b) => b[1] - a[1])[0];
  const raiz = maior[0];
  const comp = ps.filter((_, i) => find(i) === raiz);
  const zMax = Math.max(...comp.map((p) => p.z)), zMin = Math.min(...comp.map((p) => p.z));
  return { ok: maior[1] >= 7 && zMax >= 30.5 && zMin <= 19.5, motivo: `cadeia de ${maior[1]} pedras cobrindo z ${zMin.toFixed(1)}–${zMax.toFixed(1)}`, amostra: maior[1] };
})();
// porta → piscina: no GRAFO DE NAVEGAÇÃO DO MAPA (mesmo A* dos bots) — sonda de
// degrau próprio já travou em mínimo local da divisória; o grafo é o instrumento
// compartilhado com o jogo (skill regua: limiar compartilhado com quem mede o mesmo).
const rotaPiscina = (() => {
  const N = game.world.waypoints.nodes;
  const a = game.world.nearestWaypoint(0, 7.5), b = game.world.nearestWaypoint(0, -23.3);
  const path = game.world.findPath(a, b);
  const fim = N[b];
  return { ok: path.length > 1 && Math.hypot(fim.x, fim.z + 23.3) < 6, nos: path.length, fim: `${fim.x.toFixed(1)},${fim.z.toFixed(1)}` };
})();
// plantio em cima do caminho: distância de cada plantio às pedras vivas
const pls = plantios();
let plantioMaisPerto = Infinity;
if (ps.length) for (const pl of pls) for (const ped of ps)
  plantioMaisPerto = Math.min(plantioMaisPerto, Math.hypot(pl.p.x - ped.x, pl.p.z - ped.z));

/* ── G3 escala (jogador 1,70 m) ── */
const dossel = pls.filter((pl) => ['bromelia', 'garden-cluster', 'garden-mass'].includes(pl.tipo));
const forra = pls.filter((pl) => pl.tipo === 'instancia');
const foraDossel = dossel.filter((pl) => pl.h < 0.5 || pl.h > 2.6);
const foraForra = forra.filter((pl) => pl.h < 0.2 || pl.h > 2.6);
const alturasArvores = arvores.map((a) => { const b = new THREE.Box3().setFromObject(a); return b.max.y - b.min.y; });
const foraArvore = alturasArvores.filter((h) => h < 3 || h > 6.8);

let falhas = 0;
for (const [nome, ok, medido] of [
  ['G1.i teto de instâncias por malha de folhagem (≤30)', dados.length > 0 && g1count <= 30, dados.length ? `${dados.map((d) => d.n).join('+')} = ${g1total} instâncias (pior malha ${g1count}) — 72 num só mesh era o "jardim bizarro"` : 'nenhuma folhagem instanciada marcada (folhagem-instanciada/tropical-3d)'],
  ['G1.ii tint E escala por instância (≥4 cores, spread ≥1,5×)', g1cor, dados.length ? dados.map((d) => `${d.cores} cores/${d.spread.toFixed(2)}×`).join(' · ') : '—'],
  ['G1.iii ≤8 instâncias da mesma malha num raio de 6 m', dados.length > 0 && g1cluster <= 8, `pior colônia same-mesh: ${g1cluster}`],
  ['G2.a caminho de pedras liga portão→porta (cadeia ≤3 m, z 30,5→19,5)', cadeia.ok, ps.length ? cadeia.motivo : '0 pedras marcadas pedra-caminho — caminho sem sonda é caminho que a régua não vê'],
  ['G2.b de porta a piscina se chega andando (A* do mapa)', rotaPiscina.ok, rotaPiscina.ok ? `rota de ${rotaPiscina.nos} nós até (${rotaPiscina.fim})` : `grafo não liga porta→piscina (${rotaPiscina.nos} nós, fim em (${rotaPiscina.fim}))`],
  ['G2.c nenhum plantio em cima do caminho (≥0,8 m das pedras)', ps.length > 0 && plantioMaisPerto >= 0.8, ps.length ? `plantio mais próximo da pedrada: ${plantioMaisPerto.toFixed(2)} m` : '—'],
  ['G3 dossel em escala humana (0,50–2,60 m vs jogador 1,70)', dossel.length > 0 && foraDossel.length === 0, dossel.length ? `${foraDossel.length}/${dossel.length} fora da banda` : 'sem plantio de dossel marcado'],
  ['G3 forração instanciada 0,20–2,60 m', forra.length > 0 && foraForra.length === 0, forra.length ? `${foraForra.length}/${forra.length} fora da banda` : 'sem forração'],
  ['G3 árvores 3,0–6,8 m', arvores.length >= 4 && foraArvore.length === 0, arvores.length ? `${foraArvore.length}/${arvores.length} fora da banda (${alturasArvores.map((h) => h.toFixed(1)).join(', ')} m)` : '0 árvores marcadas'],
]) {
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${nome}: ${medido}`);
}

if (falhas) {
  console.error(`MANSÃO-JARDIM FALHA: ${falhas} cláusula(s)${algumMutante() ? ' (mutante mordido)' : ''}.`);
  process.exitCode = 1;
} else if (algumMutante()) {
  console.error('MUTANTE sobreviveu: a sonda não dependeu do jardim quebrado.');
  process.exitCode = 1;
} else {
  console.log('MANSÃO-JARDIM OK: variedade, composição e escala presentes.');
}
