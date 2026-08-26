/* ============================================================================
   parque-vida-check.mjs — O PARQUE DA TRETA NÃO PODE PARECER LOW POLY (frente USANTOS).
   ----------------------------------------------------------------------------
   POR QUE EXISTE — frase do dono, 25/08/2026, com estas palavras:
     "Os mapas do usantos são os mais low poly do jogo. A ideia é os mapas não
      parecerem low poly."
   "Não parecer low poly" é mensurável sem abrir o jogo: o parque ATUAL é uma
   cerca viva, 4 quiosques-caixa e um gramado chapado — tudo primitiva com 8
   texturas de canvas e ZERO mobiliário de parque (não tem banco, lixeira,
   coreto nem árvore). Esta régua congela o que a reconstrução entrega.

   O QUE ELA MEDE (no MESMO mundo do jogo: build real via harness, node puro)
     PV1  mobiliário de parque NOMEADO presente (lição 14: referência a conteúdo
          é por NOME): parque-coreto (≥1), parque-lixeira-* (≥6), parque-banco-*
          (≥6), parque-trilho-* (≥1 linha de trilho) e dormentes instanciados
          parque-dormente* (≥100 — o circuito do trenzinho mede ~210 m ÷
          espaçamento 0,9 m ≈ 230 dormentes; 100 é metade do medido, folga para
          ajuste de traçado sem esvaziar a cláusula).
     PV2  vegetação densa instanciada: grupos parque-arvores-* ≥ 40 instâncias
          (troncos = 1 por árvore; copas moram em parque-copas-* e NÃO contam
          para não dobrar a medição) e parque-arbustos-* ≥ 60. Procedência:
          bounds jogáveis 62,4×82,4 m = 5.142 m²; 40 árvores ≈ 1 por 128 m² —
          o desenho do rebuild (cortina no perímetro interno + maciços de canto
          + alamedas) mede 44. Limiar proposto na missão e conferido no layout.
     PV3  variedade de superfície: nº de material.map.name distintos na cena
          ≥ 16. Medido no estado atual (25/08/2026): 8 (parque-concrete, -grass,
          -hedge, -metal, -paint, -tiles, -water, -wood). O rebuild adiciona
          folha, casca, terra, lona, telhado, lata, pedra e asfalto = 16.
     PV4  nenhum quadrante deserto: grade 4×4 sobre os bounds; quadrante com nó
          de waypoint precisa de peça de cobertura (colisor 0,4 ≤ h ≤ 2,5 m) —
          nenhum zerado nem abaixo de 0,35× a mediana. É o espírito da MAP5
          (invariants.mjs ~1961) aplicado ao mapa que está NASCENDO cheio, não
          ao loja_h. Medido no estado atual: mín 1, mediana 2 — passa; a
          cláusula existe para o rebuild não criar deserto novo.
     PV5  horizonte próprio: scene.userData.skyUrl gravado pelo setMapSky (a
          régua lê o USO, não a declaração — BUG-02) E entrada LOOK.parque_treta
          em public/js/look.js.
     PV6  moldes 3D no lugar das primitivas (feedback do dono, 26/08/2026:
          "parque da treta ainda esta low poly, predios low poly, brinquedos
          low poly"). Como no arnês node o GLB não baixa, o mapa cria GRUPOS
          WRAPPER NOMEADOS nos dois mundos (o GLB entra dentro no browser; em
          node ficam vazios). Mede: ≥ 14 wrappers parque-molde-* no mundo
          buildado — contagem real do build: 8 prédios + 4 barracas + roda +
          roda-base + carrossel = 15 (public/js/map_parque.js, blocos
          PREDIOS/kiosk/roda-gigante/carrossel); PARQUE_PROPS contém os 5 ids
          novos; e cada models/props/<id>.glb existe em disco. O mutante
          --mutante=sem-moldes filtra os wrappers do traverse e esvazia os ids
          em memória → PV6 tem que ficar vermelha.

   FALHA = NÃO SABER MEDIR (lição 5): build que lança, waypoints ausentes ou
   quadrante impossível de classificar reprovam com mensagem de conserto.

   USO
     node tools/eval/parque-vida-check.mjs
     node tools/eval/parque-vida-check.mjs --mutante=sem-coreto     # PV1
     node tools/eval/parque-vida-check.mjs --mutante=sem-vegetacao  # PV2
     node tools/eval/parque-vida-check.mjs --mutante=sem-variedade  # PV3
     node tools/eval/parque-vida-check.mjs --mutante=sem-moldes     # PV6
   ============================================================================ */
import { THREE, MAPS, initTextures } from './harness.mjs';
import { LOOK } from '../../public/js/look.js';
import { PARQUE_PROPS } from '../../public/js/map_parque.js';
import { existsSync } from 'node:fs';

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const conhecidos = new Set(['sem-coreto', 'sem-vegetacao', 'sem-variedade', 'sem-moldes']);
if (MUTANTE && !conhecidos.has(MUTANTE)) throw new Error(`mutante desconhecido: ${MUTANTE}`);

const MIN_LIXEIRAS = 6, MIN_BANCOS = 6, MIN_DORMENTES = 100;
const MIN_ARVORES = 40, MIN_ARBUSTOS = 60, MIN_TEXTURAS = 16;
const MIN_MOLDES = 14;
const MOLDE_IDS = ['roda_gigante_roda', 'roda_gigante_base', 'carrossel', 'barraca_quermesse', 'predio_artdeco'];

/* instâncias sob um prefixo de nome: InstancedMesh conta `count`, o resto conta 1
   (um Grupo nomeado parque-banco-3 é UM banco, suas tábuas não têm nome) */
function contaPorPrefixo(root, prefixo) {
  let n = 0;
  root.traverse((o) => { if (o.name && o.name.startsWith(prefixo)) n += o.isInstancedMesh ? o.count : 1; });
  return n;
}

const T = await initTextures();
const scene = new THREE.Scene();
let W = null, erroBuild = null;
try { W = MAPS.parque_treta.build(scene, T); } catch (e) { erroBuild = String(e?.message || e); }

const clausulas = [];
const put = (id, ok, msg) => { clausulas.push({ id, ok, msg }); console.log(`  ${id} ${ok ? 'PASSA' : 'FALHA'} — ${msg}`); };

if (erroBuild || !W?.root || !W?.waypoints?.nodes || !W?.bounds) {
  put('PV0', false, `não sei medir: build do parque ${erroBuild ? `lançou "${erroBuild}"` : 'devolveu mundo sem root/waypoints/bounds'} — conserte o build antes da régua`);
  console.log('\nPARQUE-VIDA VERMELHA · mundo não medível');
  process.exit(1);
}

/* ---- mutantes (aplicam DE VERDADE ou morrem — lição 8) ---- */
let mutanteAplicou = null;
if (MUTANTE === 'sem-coreto') {
  const coreto = W.root.getObjectByName('parque-coreto');
  mutanteAplicou = !!coreto;
  if (coreto) coreto.parent.remove(coreto);
} else if (MUTANTE === 'sem-vegetacao') {
  const alvos = [];
  W.root.traverse((o) => { if (/^parque-(arvores|arbustos|copas)-/.test(o.name || '')) alvos.push(o); });
  mutanteAplicou = alvos.length > 0;
  for (const o of alvos) o.parent.remove(o);
} else if (MUTANTE === 'sem-moldes') {
  const alvos = [];
  W.root.traverse((o) => { if ((o.name || '').startsWith('parque-molde-')) alvos.push(o); });
  PARQUE_PROPS.length = 0;
  mutanteAplicou = alvos.length > 0;
  for (const o of alvos) o.parent.remove(o);
} else if (MUTANTE === 'sem-variedade') {
  let primeira = null;
  W.root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m?.map) continue;
      if (!primeira) primeira = m.map;
    }
  });
  mutanteAplicou = !!primeira;
  if (primeira) W.root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m?.map) m.map = primeira;
  });
}
if (MUTANTE && !mutanteAplicou) {
  console.error(`MUTANTE NÃO APLICOU: ${MUTANTE} — a régua não mede o que o mutante quebra`);
  process.exit(1);
}

/* ---- PV1 mobiliário nomeado ---- */
{
  const coreto = contaPorPrefixo(W.root, 'parque-coreto');
  const lixeiras = contaPorPrefixo(W.root, 'parque-lixeira-');
  const bancos = contaPorPrefixo(W.root, 'parque-banco-');
  const trilhos = contaPorPrefixo(W.root, 'parque-trilho-');
  const dormentes = contaPorPrefixo(W.root, 'parque-dormente');
  const falta = [];
  if (coreto < 1) falta.push('coreto 0/1');
  if (lixeiras < MIN_LIXEIRAS) falta.push(`lixeiras ${lixeiras}/${MIN_LIXEIRAS}`);
  if (bancos < MIN_BANCOS) falta.push(`bancos ${bancos}/${MIN_BANCOS}`);
  if (trilhos < 1) falta.push('trilho 0/1');
  if (dormentes < MIN_DORMENTES) falta.push(`dormentes ${dormentes}/${MIN_DORMENTES}`);
  put('PV1', !falta.length,
    falta.length
      ? `faltam: ${falta.join(' · ')} — nomeie o mobiliário no build (parque-coreto, parque-lixeira-*, parque-banco-*, parque-trilho-*, parque-dormente*)`
      : `coreto ${coreto} · lixeiras ${lixeiras} · bancos ${bancos} · trilhos ${trilhos} · dormentes ${dormentes}`);
}

/* ---- PV2 vegetação densa ---- */
{
  const arvores = contaPorPrefixo(W.root, 'parque-arvores-');
  const arbustos = contaPorPrefixo(W.root, 'parque-arbustos-');
  const falta = [];
  if (arvores < MIN_ARVORES) falta.push(`árvores ${arvores}/${MIN_ARVORES}`);
  if (arbustos < MIN_ARBUSTOS) falta.push(`arbustos ${arbustos}/${MIN_ARBUSTOS}`);
  put('PV2', !falta.length,
    falta.length
      ? `${falta.join(' · ')} — instancie a vegetação (InstBatch parque-arvores-*/parque-arbustos-*): 5.142 m² de parque sem árvore é o "low poly" que o dono nomeou`
      : `árvores ${arvores} · arbustos ${arbustos} instanciados`);
}

/* ---- PV3 variedade de superfície ---- */
{
  const nomes = new Set();
  W.root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m?.map?.name) nomes.add(m.map.name);
  });
  put('PV3', nomes.size >= MIN_TEXTURAS,
    nomes.size >= MIN_TEXTURAS
      ? `${nomes.size} texturas distintas em uso`
      : `${nomes.size}/${MIN_TEXTURAS} texturas distintas (${[...nomes].sort().join(', ') || 'nenhuma'}) — primitiva com 8 canvas é a cara low poly; crie superfícies novas (folha, casca, terra, lona…)`);
}

/* ---- PV4 quadrantes sem deserto ---- */
{
  const B = W.bounds, QX = 4, QZ = 4;
  const cw = (B.maxX - B.minX) / QX, ch = (B.maxZ - B.minZ) / QZ;
  const clamp = (v, n) => Math.max(0, Math.min(n - 1, v));
  const qi = (x, z) => clamp(Math.floor((x - B.minX) / cw), QX) + QX * clamp(Math.floor((z - B.minZ) / ch), QZ);
  const grid = Array.from({ length: QX * QZ }, () => ({ cover: 0, nodes: 0 }));
  for (const c of W.colliders || []) {
    const h = c.maxY - c.minY;
    if (h < 0.4 || h > 2.5) continue;
    const cx = (c.minX + c.maxX) / 2, cz = (c.minZ + c.maxZ) / 2;
    if (cx < B.minX || cx > B.maxX || cz < B.minZ || cz > B.maxZ) continue;
    grid[qi(cx, cz)].cover++;
  }
  for (const n of W.waypoints.nodes) grid[qi(n.x, n.z)].nodes++;
  const andaveis = grid.map((g, i) => ({ ...g, i })).filter((g) => g.nodes > 0);
  if (!andaveis.length) {
    put('PV4', false, 'não sei medir: nenhum quadrante andável — grafo de waypoints vazio?');
  } else {
    const mediana = andaveis.map((g) => g.cover).sort((a, b) => a - b)[Math.floor(andaveis.length / 2)];
    const ruins = andaveis.filter((g) => g.cover < 1 || g.cover < 0.35 * mediana);
    put('PV4', !ruins.length,
      ruins.length
        ? `quadrantes desertos: ${ruins.map((g) => `q${g.i} cover=${g.cover}`).join(' · ')} (mediana ${mediana}) — espalhe cobertura: banco, lixeira, tronco, floreira`
        : `${andaveis.length} quadrantes andáveis, cobertura mín ${Math.min(...andaveis.map((g) => g.cover))} · mediana ${mediana}`);
  }
}

/* ---- PV5 horizonte próprio ---- */
{
  const sky = scene.userData.skyUrl;
  const look = LOOK.parque_treta;
  const falta = [];
  if (!sky) falta.push('scene.userData.skyUrl ausente (o mapa não passou pelo applyLook/setMapSky)');
  if (!look) falta.push('LOOK.parque_treta ausente em public/js/look.js (APPEND na tabela)');
  put('PV5', !falta.length, falta.length ? falta.join(' · ') : `sky ${sky} · fog do look ${look.neblina ? 'ok' : '?'}`);
}

/* ---- PV6 moldes 3D nomeados ---- */
{
  const moldes = contaPorPrefixo(W.root, 'parque-molde-');
  const idsFaltando = MOLDE_IDS.filter((id) => !PARQUE_PROPS.includes(id));
  const glbFaltando = MOLDE_IDS.filter((id) => !existsSync(`public/models/props/${id}.glb`));
  const falta = [];
  if (moldes < MIN_MOLDES) falta.push(`wrappers parque-molde-* ${moldes}/${MIN_MOLDES}`);
  if (idsFaltando.length) falta.push(`fora de PARQUE_PROPS: ${idsFaltando.join(', ')}`);
  if (glbFaltando.length) falta.push(`GLB ausente em disco: ${glbFaltando.join(', ')}`);
  put('PV6', !falta.length,
    falta.length
      ? `${falta.join(' · ')} — primitiva no lugar do molde é o "low poly" que o dono nomeou de novo: crie os wrappers parque-molde-* e registre os ids em PARQUE_PROPS`
      : `${moldes} wrappers parque-molde-* · ${MOLDE_IDS.length} ids em PARQUE_PROPS · GLBs em disco`);
}

/* ---- placar e veredito dos mutantes ---- */
const vermelhas = clausulas.filter((c) => !c.ok);
const ALVO = { 'sem-coreto': 'PV1', 'sem-vegetacao': 'PV2', 'sem-variedade': 'PV3', 'sem-moldes': 'PV6' };
if (MUTANTE) {
  const esperado = ALVO[MUTANTE];
  const acertou = vermelhas.some((c) => c.id === esperado);
  const colaterais = vermelhas.filter((c) => c.id !== esperado).map((c) => c.id);
  if (!acertou) { console.error(`\nMUTANTE SOBREVIVEU: ${MUTANTE} não acendeu ${esperado}`); process.exit(1); }
  if (colaterais.length) { console.error(`\nMUTANTE ${MUTANTE} acendeu cláusulas colaterais: ${colaterais.join(', ')}`); process.exit(1); }
  console.log(`\nMUTANTE MORDIDO: ${MUTANTE} -> ${esperado}`);
  process.exit(0);
}
console.log(`\nPARQUE-VIDA ${vermelhas.length ? `VERMELHA · ${vermelhas.map((c) => c.id).join(', ')}` : 'ok · PV1-PV6'}`);
process.exit(vermelhas.length ? 1 : 0);
