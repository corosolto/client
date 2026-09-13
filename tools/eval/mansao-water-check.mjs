/* Mansão: PISCINA ENTRÁVEL (contrato invertido) + espelho d'água não entrável +
   composição (frota GLB, jardim, interior).

   A piscina era "não entrável" por contrato (colisor-tampa maxY 0,65; o mutante se
   chamava agua-entravel). A decisão do dono de 18/08 (plans/13-VISUAL-V2.1:
   "a piscina nao afunda") INVERTEU: a piscina é área jogável — borda pulável, raso
   andável (~0,8-1,0 m), fundo real (~1,8-2,0 m) e SAÍDA GARANTIDA (anti-trap: quem
   cai na piscina SAI). As bandas do fundo: 1,85 m fica 0,15 m abaixo do teto de
   guarda-corpo MAP6 QUEDA_ANDAR=2,0 (map-check.mjs:151) — o mesmo argumento do
   CANAL_FUNDO=-1,75 do córrego (map_corrego.js:62), que é o padrão copiado.
   O espelho d'água decorativo CONTINUA não entrável.

   Mede o caminho real: mundo real + Game._collide + raio real do jogador.
   O mundo GLB em si é medido no browser: eval:occluders e captura 3:2 — este
   script de node mede o contrato de fonte, o disco e o mundo de fallback.
   Mutantes: agua-bloqueada (tampa volta; o nome antigo agua-entravel segue valendo
   como alias) | borda-alta (saída selada, anti-trap) | sem-parede (cuba não segura) |
   jardim-pobre | interior-vazio | carros-ausentes | carros-glb-ausentes |
   carro-glb-clonado | carro-glb-gigante | vaga-sem-colisor | piscina-sem-cuba |
   piscina-cuba-curta | luxo-vazio.
*/
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { THREE, initTextures, bootGame } from './harness.mjs';

const MUT_AGUA_BLOQUEADA = process.argv.includes('--mutante=agua-bloqueada') || process.argv.includes('--mutante=agua-entravel');
const MUT_BORDA_ALTA = process.argv.includes('--mutante=borda-alta');
const MUT_SEM_PAREDE = process.argv.includes('--mutante=sem-parede');
const MUT_JARDIM = process.argv.includes('--mutante=jardim-pobre');
const MUT_INTERIOR = process.argv.includes('--mutante=interior-vazio');
const MUT_CARROS = process.argv.includes('--mutante=carros-ausentes');
const MUT_CARROS_GLB = process.argv.includes('--mutante=carros-glb-ausentes');
const MUT_CARRO_CLONADO = process.argv.includes('--mutante=carro-glb-clonado');
const MUT_CARRO_GIGANTE = process.argv.includes('--mutante=carro-glb-gigante');
const MUT_VAGA_SOL = process.argv.includes('--mutante=vaga-sem-colisor');
const MUT_CATALOGO = process.argv.includes('--mutante=jardim-catalogo');
const MUT_BLOCKOUT = process.argv.includes('--mutante=interior-blockout');
const MUT_JARDIM_ESPELHO = process.argv.includes('--mutante=jardim-espelho');
const MUT_JARDIM_MONOCULTURA = process.argv.includes('--mutante=jardim-monocultura');
const MUT_PERGOLA_FLUTUA = process.argv.includes('--mutante=pergola-flutua');
const MUT_ILHA_AMBIGUA = process.argv.includes('--mutante=ilha-ambigua');
const MUT_TEATRO_VAZIO = process.argv.includes('--mutante=teatro-vazio');
const MUT_JARDIM_RARO = process.argv.includes('--mutante=jardim-raro');
const MUT_PISCINA_SEM_CUBA = process.argv.includes('--mutante=piscina-sem-cuba');
const MUT_PISCINA_CUBA_CURTA = process.argv.includes('--mutante=piscina-cuba-curta');
const MUT_ESPELHO_MORTO = process.argv.includes('--mutante=espelho-morto');
const MUT_LUXO_VAZIO = process.argv.includes('--mutante=luxo-vazio');
const RAIO = 0.38; // mesmo raio passado por Game.update a _collide
/* CUBA da piscina: interior jogável (dentro dos muros). As bandas são o contrato da
   decisão do dono 18/08 (plans/13): raso ~0,8-1,0 m andável; fundo ~1,8-2,0 m.
   1,85 < QUEDA_ANDAR 2,0 (map-check.mjs:151) mantém a borda isenta de guarda-corpo. */
const CUBA = {
  x0: -5.5, x1: 5.5, z0: -32.5, z1: -26.5,
  rasoMax: -0.75, rasoMin: -1.05, fundoMax: -1.6, fundoMin: -2.1,
  rasoZ: -28.2, fundoZ: -31.4,
};
const overlap2d = (c, r) => c.minX < r.x1 && c.maxX > r.x0 && c.minZ < r.z1 && c.maxZ > r.z0;
const algumMutante = () => process.argv.some((a) => a.startsWith('--mutante='));

const game = bootGame('mansao', { textures: initTextures(), ctf: true, seed: 14000 });

/* ── FROTA DA GARAGEM (BUG-56): contrato de fonte + disco ───────────────────
   A frota vive no fonte do mapa como tabela GARAGEM [['id', comprimento, altura]].
   Mutantes de fonte precisam PROVAR que aplicaram (skill regua: mutação que não
   casou é confiança falsa). */
const ROOT = path.resolve(import.meta.dirname, '../..');
const MAP_PATH = path.join(ROOT, 'public/js/map_mansao.js');
const HAVAN_PATH = path.join(ROOT, 'public/js/map_havan.js');
let mapSrc = fs.readFileSync(MAP_PATH, 'utf8');
if (MUT_CARROS_GLB) {
  const antes = mapSrc;
  mapSrc = mapSrc.replace(/export const MANSAO_PROPS = \[[\s\S]*?\];/, "export const MANSAO_PROPS = ['mesa_guardasol', 'guarda_sol'];");
  if (mapSrc === antes) { console.error('MUTANTE carros-glb-ausentes NÃO APLICOU (MANSAO_PROPS não casou)'); process.exit(1); }
}
if (MUT_CARRO_CLONADO) {
  const m = mapSrc.match(/const GARAGEM = \[\s*\['([^']+)',\s*[\d.]+,\s*[\d.]+\]/);
  if (!m) { console.error('MUTANTE carro-glb-clonado NÃO APLICOU (GARAGEM não casou)'); process.exit(1); }
  const antes = mapSrc;
  mapSrc = mapSrc.replace(/'[^']+',(\s*[\d.]+,\s*[\d.]+)/g, `'${m[1]}',$1`);
  if (mapSrc === antes) { console.error('MUTANTE carro-glb-clonado NÃO APLICOU (ids não casaram)'); process.exit(1); }
}
if (MUT_CARRO_GIGANTE) {
  const antes = mapSrc;
  mapSrc = mapSrc.replace(/(const GARAGEM = \[\s*\['[^']+',\s*)([\d.]+)/, '$15.20');
  if (mapSrc === antes) { console.error('MUTANTE carro-glb-gigante NÃO APLICOU (comprimento não casou)'); process.exit(1); }
}
const frotaRaw = mapSrc.match(/const GARAGEM = \[([\s\S]*?)\];/);
const frota = [...(frotaRaw?.[1] || '').matchAll(/\['([^']+)',\s*([\d.]+),\s*([\d.]+)\]/g)]
  .map((m) => ({ id: m[1], len: parseFloat(m[2]), h: parseFloat(m[3]) }));
const propsSrc = mapSrc.match(/export const MANSAO_PROPS = \[([\s\S]*?)\];/)?.[1] || '';
const propsIds = [...propsSrc.matchAll(/'([^']+)'/g)].map((m) => m[1]);
/* spread `...GARAGEM` coloca a frota toda no preload por construção; id solto também
   vale. E o USO: cada linha da GARAGEM precisa de um carroAcervo( — declaração sem
   uso é a invariante cega que o mutante do BUG-54 pegou (AGENTS.md, lei 3). */
const preloadOk = propsSrc.includes('...GARAGEM') || frota.every((f) => propsIds.includes(f.id));
const usosCarro = (mapSrc.match(/carroAcervo\(/g) || []).length;
/* dims de fábrica: mesma ficha do map_havan (CAR_DIM é A referência, conferida por
   tools/eval/escala-veiculo-check.mjs) — copiar número à mão que diverge é o quinto
   lugar com o mesmo número desatualizado (AGENTS.md). */
const havanSrc = fs.readFileSync(HAVAN_PATH, 'utf8');
const dimHavan = (id) => {
  const m = havanSrc.match(new RegExp(`'?${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'?\\s*:\\s*\\[\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*\\]`));
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
};
/* GLB no disco: tem que ser glTF válido com geometria de carro de verdade — blob
  de 200 tris não é carro, e 45k+ estoura o orçamento de triângulos do mapa. */
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const glbInfo = {};
for (const f of frota) {
  const file = path.join(ROOT, 'public/models/props', `${f.id}.glb`);
  if (!fs.existsSync(file)) { glbInfo[f.id] = { existe: false }; continue; }
  try {
    const doc = await io.read(file);
    const prim = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives());
    const tris = prim.reduce((n, p) => n + (p.getIndices()?.getCount() || p.getAttribute('POSITION')?.getCount() || 0) / 3, 0);
    glbInfo[f.id] = { existe: true, tris: Math.round(tris), primitivas: prim.length };
  } catch (e) { glbInfo[f.id] = { existe: true, erro: e.message }; }
}
/* VAGA: colisor original da garagem — x∈[cx-1,cx+1], y∈[0,1.3], z∈[8.95,13.05].
   A jogabilidade é boa por decisão do dono: a pegada não muda. */
const VAGAS = [-6, 0, 6];
const vagaPreservada = (cx) => game.world.colliders.some((c) =>
  c.minX <= cx - 0.99 && c.maxX >= cx + 0.99 && c.minY <= 0 && c.maxY >= 1.3 && c.minZ >= 8.9 && c.minZ <= 9.0 && c.maxZ >= 13.0 && c.maxZ <= 13.1);
if (MUT_VAGA_SOL) game.world.colliders = game.world.colliders.filter((c) => !(c.maxY === 1.3 && c.minZ > 8 && c.maxZ < 14));
const marcados = [];
game.world.root.traverse((object) => { if (object.userData?.mansaoFeature) marcados.push(object); });
if (MUT_JARDIM) for (const o of marcados) if (['bromelia','palmeira','encosta'].includes(o.userData.mansaoFeature)) o.visible = false;
if (MUT_INTERIOR) for (const o of marcados) if (['ilha-gourmet','estar','divisoria-baixa'].includes(o.userData.mansaoFeature)) o.visible = false;
if (MUT_CARROS) for (const o of marcados) if (o.userData.mansaoFeature === 'carro-generico') o.visible = false;
if (MUT_CATALOGO) for (const o of marcados) if (o.userData.mansaoFeature === 'tropical-3d') o.visible = false;
if (MUT_BLOCKOUT) for (const o of marcados) if (o.userData.mansaoFeature === 'lived-prop') o.visible = false;
if (MUT_LUXO_VAZIO) for (const o of marcados) if (o.userData.mansaoFeature === 'luxo-prop') o.visible = false;
if (MUT_JARDIM_ESPELHO) for (const o of marcados) if (o.userData.mansaoFeature === 'garden-cluster') {
  const par = Math.floor(o.userData.clusterIndex / 2);
  o.position.set((o.userData.clusterIndex % 2 ? -1 : 1) * (5 + par * 2), o.position.y, 20 + par * 5);
}
if (MUT_JARDIM_MONOCULTURA) for (const o of marcados) if (o.userData.mansaoFeature === 'garden-cluster' && o.userData.gardenFamily !== 'heliconia') o.visible = false;
if (MUT_PERGOLA_FLUTUA) for (const o of marcados) if (o.userData.pergolaPart === 'pillar') o.visible = false;
if (MUT_ILHA_AMBIGUA) for (const o of marcados) if (o.userData.mansaoFeature === 'gourmet-part' && o.userData.gourmetPart !== 'countertop') o.visible = false;
if (MUT_TEATRO_VAZIO) for (const o of marcados) if (o.userData.mansaoFeature === 'theater-part') o.visible = false;
if (MUT_JARDIM_RARO) for (const o of marcados) if (o.userData.mansaoFeature === 'garden-mass') o.visible = false;
if (MUT_PISCINA_SEM_CUBA) for (const o of marcados) if (o.userData.mansaoFeature === 'pool-basin-floor') o.visible = false;
if (MUT_PISCINA_CUBA_CURTA) for (const o of marcados) if (o.userData.mansaoFeature === 'pool-basin-floor') o.scale.set(1, .45, 1);   // plano girado -π/2: y local = z mundo -π/2: y local = z mundo
/* Mutantes de MUNDO da piscina — cada um PROVA que aplicou (skill regua: mutação
   que não casou é confiança falsa). */
const paredesCuba = () => game.world.colliders.filter((c) => c.minY <= -1.5 && c.maxY >= -0.1 && c.maxY <= 0.1
  && overlap2d({ minX: c.minX - 1, maxX: c.maxX + 1, minZ: c.minZ - 1, maxZ: c.maxZ + 1 }, CUBA) && overlap2d(c, { x0: CUBA.x0 - 1, x1: CUBA.x1 + 1, z0: CUBA.z0 - 1, z1: CUBA.z1 + 1 }));
if (MUT_AGUA_BLOQUEADA) game.world.colliders.push({ minX: -6, maxX: 6, minY: -0.5, maxY: 0.65, minZ: -33, maxZ: -26 });
if (MUT_BORDA_ALTA) {
  const parede = paredesCuba();
  if (!parede.length) { console.error('MUTANTE borda-alta NÃO APLICOU (nenhuma parede de cuba encontrada)'); process.exit(1); }
  for (const c of parede) c.maxY = 2.2;
  const gOrig = game.world.groundHeightAt;
  game.world.groundHeightAt = (x, z, yRef) => (x > CUBA.x0 && x < CUBA.x1 && z > CUBA.z0 && z < CUBA.z1 ? CUBA.fundoMin : gOrig(x, z, yRef));
}
if (MUT_SEM_PAREDE) {
  const parede = paredesCuba();
  if (!parede.length) { console.error('MUTANTE sem-parede NÃO APLICOU (nenhuma parede de cuba encontrada)'); process.exit(1); }
  game.world.colliders = game.world.colliders.filter((c) => !parede.includes(c));
}
game.world.root.updateMatrixWorld(true);

/* ── PISCINA: sondas comportamentais (uso, não declaração — Lição 3) ────────── */
const tampadores = game.world.colliders.filter((c) => overlap2d(c, CUBA) && c.maxY > 0.15);
const gRaso = game.world.groundHeightAt(0, CUBA.rasoZ);
const gFundo = game.world.groundHeightAt(0, CUBA.fundoZ);
// entrada andando: do deck sul, passo 0,15 m na direção do fundo, y segue o chão
let profAlcancada = 0, semProgresso = 0;
const anda = new THREE.Vector3(0, game.world.groundHeightAt(0, -24.5), -24.5);
for (let i = 0; i < 70 && semProgresso < 3; i++) {
  const pz = anda.z; anda.z -= 0.15;
  anda.y = game.world.groundHeightAt(anda.x, anda.z);
  game._collide(anda, RAIO);
  if (Math.abs(anda.z - (pz - 0.15)) > 0.05) semProgresso++; else semProgresso = 0;
  profAlcancada = Math.min(profAlcancada, anda.y);
}
// saída anti-trap: escalada gulosa de degrau em degrau (subida ≤ 0,56 m = STEP_H+folga)
const saiDaAgua = () => {
  const pos = new THREE.Vector3(0, game.world.groundHeightAt(0, CUBA.fundoZ), CUBA.fundoZ);
  if (pos.y > -1.5) return { ok: false, porque: `sem fundo pra provar (y=${pos.y.toFixed(2)})`, passos: 0, pos };
  const vistos = new Set();
  const chave = (p) => `${p.x.toFixed(1)}:${p.z.toFixed(1)}`;
  let passos = 0, planos = 0;
  for (; passos + planos < 200 && pos.y < -0.06;) {
    let melhor = null;
    for (let d = 0; d < 16; d++) for (const dist of [0.3, 0.45, 0.6, 0.8, 1.05, 1.3, 1.6, 1.9, 2.2]) {
      const a = d * Math.PI / 8, tx = pos.x + Math.sin(a) * dist, tz = pos.z + Math.cos(a) * dist;
      const g = game.world.groundHeightAt(tx, tz), sobe = g - pos.y;
      if (sobe <= 0.001 || sobe > 0.56) continue;
      if (dist > 0.9) {   // passo longo só por chão plano (não teleporte por parede)
        const gx = pos.x + Math.sin(a) * dist / 2, gz = pos.z + Math.cos(a) * dist / 2;
        if (Math.abs(game.world.groundHeightAt(gx, gz) - pos.y) > 0.35) continue;
      }
      const c = new THREE.Vector3(tx, g, tz); game._collide(c, RAIO);
      if (Math.hypot(c.x - tx, c.z - tz) > 0.25) continue;   // empurrado = não vira
      if (!melhor || sobe > melhor.sobe) melhor = { sobe, pos: c };
    }
    if (melhor) { pos.copy(melhor.pos); vistos.add(chave(pos)); passos++; continue; }
    // sem degrau à vista: anda no PLANO pra onde não pisou ainda (raio do fundo é pequeno)
    let plano = null;
    for (let d = 0; d < 16 && !plano; d++) for (const dist of [0.45, 0.7, 0.9]) {
      const a = d * Math.PI / 8 + planos * .3, tx = pos.x + Math.sin(a) * dist, tz = pos.z + Math.cos(a) * dist;
      if (Math.abs(game.world.groundHeightAt(tx, tz) - pos.y) > 0.001) continue;
      if (tx < CUBA.x0 - 2 || tx > CUBA.x1 + 2 || tz < CUBA.z0 - 2 || tz > CUBA.z1 + 2) continue;
      const c = new THREE.Vector3(tx, pos.y, tz); game._collide(c, RAIO);
      if (Math.hypot(c.x - tx, c.z - tz) > 0.2) continue;
      const k = `${c.x.toFixed(1)}:${c.z.toFixed(1)}`;
      if (vistos.has(k)) continue;
      plano = c;
    }
    if (!plano || ++planos > 120) return { ok: false, porque: `preso em y=${pos.y.toFixed(2)} (sem degrau ≤0,56 m ao alcance)`, passos, pos };
    pos.copy(plano); vistos.add(chave(pos));
  }
  return pos.y >= -0.06 ? { ok: true, porque: 'saiu', passos, pos } : { ok: false, porque: `não chegou ao deck (y=${pos.y.toFixed(2)})`, passos, pos };
};
const saida = saiDaAgua();
// paredes seguram: caminha E/W no raso e N no fundo; a cuba tem que parar o corpo
const paredeSegura = (dir) => {
  const z = dir === 'n' ? CUBA.fundoZ : CUBA.rasoZ;
  const p = new THREE.Vector3(0, game.world.groundHeightAt(0, z), z);
  for (let i = 0; i < 90; i++) { p[dir === 'e' ? 'x' : dir === 'w' ? 'x' : 'z'] += dir === 'w' ? -0.15 : dir === 'n' ? -0.15 : 0.15; game._collide(p, RAIO); }
  return dir === 'e' ? p.x : dir === 'w' ? p.x : p.z;
};
const segE = paredeSegura('e'), segW = paredeSegura('w'), segN = paredeSegura('n');
// espelho d'água decorativo: CONTINUA expulsando o corpo
const espelhoAntes = new THREE.Vector3(-8, game.world.groundHeightAt(-8, 25), 25);
const espelhoDepois = espelhoAntes.clone(); game._collide(espelhoDepois, RAIO);
const espelhoAfasta = espelhoDepois.distanceTo(espelhoAntes) >= RAIO * 0.9;
/* Espelho e canal do eixo como ÁGUA VIVA (crítico v2.1: "plano azul sólido"): mesh
   aguaViva da water.js com lâmina rasa (uProfEscala ≤ 0,6 — padrão córrego) no lugar
   do addFloor de cor chapada. O mutante espelho-morto arranca os meshes vivos. */
const aguasJardim = [];
game.world.root.traverse((o) => { if (o.isMesh && o.userData?.aguaViva) aguasJardim.push(o); });
if (MUT_ESPELHO_MORTO) {
  if (!aguasJardim.length) { console.error('MUTANTE espelho-morto NÃO APLICOU (nenhuma água viva no jardim)'); process.exit(1); }
  for (const o of aguasJardim) o.removeFromParent();
}
const laminaViva = (cx, cz, rx, rz, profMax = 0.6) => aguasJardim.filter((o) => {
  if (o.visible === false || !o.parent) return false;
  const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
  const u = o.material?.uniforms || {};
  return Math.abs(c.x - cx) <= rx && Math.abs(c.z - cz) <= rz && o.material?.isShaderMaterial && u.uTime && u.uProfEscala?.value <= profMax;
});

const conta = (tipo) => marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === tipo).length;
let falhas = 0;
const carros = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'carro-generico');
const propsVividos = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'lived-prop');
const superficies = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'interior-surface');
const luxo = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'luxo-prop');
const luxoTipos = new Set(luxo.map((o) => o.userData.luxoType));
const luzes = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'interior-fill');
const clusters = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'garden-cluster');
const clusterFamilies = new Set(clusters.map((o) => o.userData.gardenFamily).filter(Boolean));
const clusterShapes = new Set(clusters.map((cluster) => {
  const tipos=[]; cluster.traverse((o) => { if(o.isMesh) tipos.push(o.geometry?.type || 'sem-geo'); });
  return [...new Set(tipos)].sort().join('+');
}));
const espelhados = clusters.filter((a, i) => clusters.some((b, j) => i !== j
  && Math.abs(a.position.x + b.position.x) < .55 && Math.abs(a.position.z - b.position.z) < .55));
const pergola = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'pergola-part');
const gourmet = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'gourmet-part');
const gourmetTipos = (tipo) => gourmet.filter((o) => o.userData.gourmetPart === tipo).length;
const teatro = marcados.filter((o) => o.visible !== false && o.userData.mansaoFeature === 'theater-part');
const teatroTipos = (tipo) => teatro.filter((o) => o.userData.theaterPart === tipo).length;
const massas = marcados.filter((o)=>o.visible!==false&&o.userData.mansaoFeature==='garden-mass');
const massasDensas = massas.filter((massa)=>{let n=0;massa.traverse((o)=>{if(o.isMesh&&o.visible!==false)n++;});return n>=20;});
const massasEspelhadas=massas.filter((a,i)=>massas.some((b,j)=>i!==j&&Math.abs(a.position.x+b.position.x)<.6&&Math.abs(a.position.z-b.position.z)<.6));
const cubas = marcados.filter((o)=>o.visible!==false&&o.userData.mansaoFeature==='pool-basin-floor');
const cubaPisoOpaco = (() => {
  const opacos = cubas.filter((c) => c.position.y <= -0.5 && !(c.material?.transparent && (c.material.opacity ?? 1) < 0.9));
  if (!opacos.length) return false;
  const b = new THREE.Box3();
  for (const c of opacos) b.union(new THREE.Box3().setFromObject(c));   // mundo pós-scale (mutante curta)
  const s = b.getSize(new THREE.Vector3());
  return s.x >= 10.5 && s.z >= 5.3;   // raso+fundo planos cobrem ≥5,3 dos 6,0 m da cuba (o resto é escada)
})();
const tetoSobreLamina = marcados.filter((o) => {
  if (o.visible === false) return false;
  const b = new THREE.Box3().setFromObject(o);
  return b.max.x > CUBA.x0 && b.min.x < CUBA.x1 && b.max.z > CUBA.z0 && b.min.z < CUBA.z1
    && b.min.y > 0.02 && b.max.y < 0.5 && !(o.material?.transparent && (o.material.opacity ?? 1) < 0.9);
});
for (const [nome, ok, medido] of [
  ['piscina entrável — nenhum colisor cobre a lâmina acima dos pés', tampadores.length === 0, `${tampadores.length} tampa(s)${tampadores.length ? ` (pior maxY ${Math.max(...tampadores.map((c) => c.maxY)).toFixed(2)} m)` : ''} — decisão do dono 18/08 (plans/13) inverteu o contrato; mutante agua-bloqueada é este estado`],
  ['piscina andável — o corpo ENTRA andando do deck', profAlcancada <= -0.6, `profundidade alcançada andando: ${profAlcancada.toFixed(2)} m (mín. -0,60) — tampa devolve o "a piscina nao afunda"`],
  ['raso com profundidade de verdade (0,75–1,05 m)', gRaso <= CUBA.rasoMax && gRaso >= CUBA.rasoMin, `groundHeightAt(0,-28,2) = ${gRaso.toFixed(2)} m — alvo do dono ~0,8–1,0 m andável`],
  ['fundo com profundidade de verdade (1,60–2,10 m)', gFundo <= CUBA.fundoMax && gFundo >= CUBA.fundoMin, `groundHeightAt(0,-31,4) = ${gFundo.toFixed(2)} m — alvo ~1,8–2,0 m; 1,85 fica 0,15 m abaixo do guarda-corpo MAP6 (QUEDA_ANDAR 2,0, map-check.mjs:151)`],
  ['anti-trap: do fundo se SAI de degrau em degrau (≤0,56 m por passo)', saida.ok, saida.ok ? `saiu em ${saida.passos} passos até y=${saida.pos.y.toFixed(2)} m` : saida.porque],
  ['cuba segura o corpo — paredes leste/oeste/norte param o andarilho', segE <= CUBA.x1 + 0.15 && segW >= CUBA.x0 - 0.15 && segN >= CUBA.z0 - 0.15, `leste parou x=${segE.toFixed(2)} · oeste x=${segW.toFixed(2)} · norte z=${segN.toFixed(2)} — sem parede o corpo atravessa a cuba (mutante sem-parede)`],
  ['cuba opaca no fundo da piscina (piso abaixo da lâmina)', cubaPisoOpaco, `${cubas.length} piso(s) de cuba${cubas.length ? '' : ' — sem piso visível o fundo é o gramado do mapa'}`],
  ['sem teto opaco sobre a lâmina (máscara antiga = teto do nadador)', tetoSobreLamina.length === 0, `${tetoSobreLamina.length} plano(s) opaco(s) em y∈(0,02;0,5) dentro da cuba`],
  ['espelho d\'água decorativo segue NÃO entrável', espelhoAfasta, `deslocamento ${espelhoDepois.distanceTo(espelhoAntes).toFixed(3)} m (mín. ${(RAIO * 0.9).toFixed(3)})`],
  ['espelho e canal do eixo são água VIVA (shader uTime, lâmina rasa)', laminaViva(-8, 25, 3.5, 2.5).length >= 1 && laminaViva(-4.2, 24.8, 2.2, 7).length >= 1, `${aguasJardim.filter((o) => o.parent).length} lâmina(s) viva(s) no jardim — plano azul chapado foi o reprovo do crítico v2.1`],
  ['piscina é água VIVA (entrável, profundidade real ≤2,0 m de fade)', laminaViva(0, -29.5, 6, 3.5, 2.0).length >= 1, `${laminaViva(0, -29.5, 6, 3.5, 2.0).length} lâmina na cuba — "retângulo turquesa fosco" (crítico v2.1 r3); contrato entrável medido acima`],
  ['frota da garagem em GLB do acervo — 3 modelos distintos pré-carregados e usados', frota.length === 3 && new Set(frota.map((f) => f.id)).size === 3 && preloadOk && usosCarro >= 3, `${frota.length} na GARAGEM · preload ${preloadOk ? 'ok' : 'FALTA'} · ${usosCarro} carroAcervo( — id fora do preload volta procedural e id declarado sem uso é invariante cega`],
  ['GLBs de carro válidos no disco (geometria real, dentro do orçamento)', frota.length === 3 && frota.every((f) => glbInfo[f.id]?.existe && !glbInfo[f.id].erro && glbInfo[f.id].tris >= 2000 && glbInfo[f.id].tris <= 45000), frota.map((f) => `${f.id}:${glbInfo[f.id]?.existe && !glbInfo[f.id].erro ? `${glbInfo[f.id].tris}t` : 'inválido/ausente'}`).join(' · ')],
  ['escala de fábrica confere com a ficha do acervo (CAR_DIM da Havan)', frota.every((f) => { const d = dimHavan(f.id); return d && Math.abs(d[0] - f.len) < 0.011 && Math.abs(d[1] - f.h) < 0.011; }), `${frota.filter((f) => { const d = dimHavan(f.id); return d && Math.abs(d[0] - f.len) < 0.011 && Math.abs(d[1] - f.h) < 0.011; }).length}/3 sem divergência de ficha`],
  ['carro GLB cabe na vaga (comprimento ≤ 4,35 m; procedural era 4,25)', frota.length === 3 && frota.every((f) => f.len <= 4.35), `maior: ${Math.max(0, ...frota.map((f) => f.len)).toFixed(2)} m — carro além da vaga deixa o corpo dentro do vidro saliente (MAP1 cego em node, Lição 3)`],
  ['pegada de colisão das 3 vagas preservada (x±1, h1,3, z 8,95–13,05)', VAGAS.every(vagaPreservada), `${VAGAS.filter(vagaPreservada).length}/3 vagas — sem isto a troca de prop mudou o cover da garagem`],
  ['fallback procedural vivo (node/?glb=0 mostram 3 carros)', carros.length === 3, `${carros.length}/3 — o fallback é o kill-switch da garagem`],
  ['bromélias', conta('bromelia') >= 8 && conta('bromelia') <= 12, `${conta('bromelia')}/8–12`],
  ['palmeiras', conta('palmeira') >= 2, `${conta('palmeira')}/2`],
  ['encosta verde lateral', conta('encosta') >= 1, `${conta('encosta')}/1`],
  ['ilha gourmet', conta('ilha-gourmet') >= 1, `${conta('ilha-gourmet')}/1`],
  ['grupos de estar', conta('estar') >= 2, `${conta('estar')}/2`],
  ['divisória baixa', conta('divisoria-baixa') >= 1, `${conta('divisoria-baixa')}/1`],
  ['folhagem tropical tridimensional', conta('tropical-3d') >= 4, `${conta('tropical-3d')}/4`],
  ['jardim assimétrico autorado', conta('garden-asymmetry') >= 1, `${conta('garden-asymmetry')}/1`],
  ['maciços assimétricos com três famílias tropicais', clusters.length >= 5 && clusterFamilies.size >= 3 && clusterShapes.size >= 3 && espelhados.length <= 1, `${clusters.length} maciços · ${clusterFamilies.size} famílias/${clusterShapes.size} formas · ${espelhados.length} espelhados`],
  ['dois–três maciços tropicais densos e não espelhados', massasDensas.length>=2&&massasDensas.length<=3&&massasEspelhadas.length===0, `${massasDensas.length} densos · ${massasEspelhadas.length} espelhados`],
  ['pergolado ancorado', pergola.filter((o) => o.userData.pergolaPart === 'pillar').length >= 4 && pergola.filter((o) => o.userData.pergolaPart === 'beam').length >= 5, `${pergola.filter((o) => o.userData.pergolaPart === 'pillar').length} pilares · ${pergola.filter((o) => o.userData.pergolaPart === 'beam').length} vigas`],
  ['ilha gourmet funcional e inequívoca', gourmetTipos('countertop') >= 1 && gourmetTipos('stool') >= 3 && gourmetTipos('cooktop') >= 1 && gourmetTipos('sink') >= 1 && gourmetTipos('faucet') >= 1 && gourmetTipos('pendant') >= 3, `${gourmet.length} peças`],
  ['home theater funcional e inequívoco', teatroTipos('screen') >= 1 && teatroTipos('media-console') >= 1 && teatroTipos('recliner') >= 4 && teatroTipos('acoustic-panel') >= 3, `${teatro.length} peças`],
  ['props vividos distintos', new Set(propsVividos.map((o) => o.userData.propType)).size >= 6 && new Set(propsVividos.map((o) => o.userData.propType)).size <= 8, `${new Set(propsVividos.map((o) => o.userData.propType)).size}/6–8`],
  ['piso e forro com texturas próprias', new Set(superficies.map((o) => o.userData.surfaceType)).size >= 2 && new Set(superficies.map((o) => o.material?.map?.uuid).filter(Boolean)).size >= 2, `${new Set(superficies.map((o) => o.userData.surfaceType)).size}/2`],
  ['fill interior', luzes.filter((l) => l.intensity >= 1).length >= 3, `${luzes.filter((l) => l.intensity >= 1).length}/3`],
  /* Luxo brasileiro excessivo (25/08): 3 famílias declaradas como TETO no map_mansao.js
     ("3-5 props NO MÁXIMO, otimizados"). A faixa é fechada dos dois lados de propósito:
     abaixo some a decisão, acima vira o showroom que a régua do jardim já reprovou. */
  ['mobília de luxo distinta (lustre/poltrona/tríptico)', luxoTipos.size >= 3 && luxoTipos.size <= 5, `${luxoTipos.size}/3–5 famílias: ${[...luxoTipos].join(', ') || 'nenhuma'}`],
]) {
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${nome}: ${medido}`);
}

if (falhas) {
  console.error(`MANSÃO-CONTRATO FALHA: ${falhas} cláusula(s) de água/composição${algumMutante() ? ' (mutante mordido)' : ''}.`);
  process.exitCode = 1;
} else if (algumMutante()) {
  console.error('MUTANTE sobreviveu: a sonda não dependeu da composição quebrada.');
  process.exitCode = 1;
} else {
  console.log('MANSÃO-CONTRATO OK: piscina entrável com saída, espelho seguro e composição autorada presente.');
}
