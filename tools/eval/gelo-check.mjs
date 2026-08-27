/* ============================================================================
   gelo-check.mjs — A TRETA NO GELO NASCE SEM CARA DE LOW POLY (frente USANTOS).
   ----------------------------------------------------------------------------
   POR QUE EXISTE — frase do dono, 25/08/2026, com estas palavras:
     "Os mapas do usantos são os mais low poly do jogo. A ideia é os mapas não
      parecerem low poly."
   E o histórico que esta régua trava: o PR #372 (branch map/treta-no-gelo) foi
   REJEITADO pelo dono — era uma fortaleza de gelo genérica estilo CS, primitiva
   estrutural sem identidade. O gelo é NOSSO: festa junina de inverno em cidade
   serrana do sul — galpão de festival, fogueiras com luz de verdade, barracas
   juninas, fardos de palha, neve pisada, araucárias e a serra no horizonte.
   Irmã da parque-vida-check (mesma frente, mesmo padrão de mutantes).

   O QUE ELA MEDE (no MESMO mundo do jogo: build real via harness, node puro)
     GL1  mapa REGISTRADO e buildando (não saber medir = vermelho — lição 5).
     GL2  tema presente em objetos NOMEADOS (lição 14: referência a conteúdo é
          por NOME): gelo-galpao (1), gelo-fogueira-* (≥3), gelo-barraca-* (≥4),
          gelo-quentao (1 — o caminhão de quentão, GLB ou procedural),
          gelo-palha-* (≥6 fardos) e gelo-arvores-* instanciados (≥12 — tronco
          conta 1 por árvore; copas moram em gelo-copas-* e NÃO contam, mesmo
          critério da PV2 do parque).
     GL3  fogueira é LUZ, não maquete: cada gelo-fogueira-* carrega uma
          PointLight cuja intensidade OSCILA entre dois update(dt,t) — fogo
          parado é enfeite, não fogueira (mesma cláusula da NV2 dos holofotes).
     GL4  cobertura de textura ≥ 85% das malhas com material.map, excluída a
          fauna (userData.ambientLife — o mesmo recorte da SUPERFICIE1 do
          parque-wheel-check; limiar 0,85 > 0,82 do parque porque o gelo nasce
          com a lição aprendida).
     GL5  gameplay: waypoints ≥ 100, grafo conexo (BFS do nó 0, mesmo critério
          da validatePlan/MC3), rota spawnE↔spawnB pelo findPath DO MAPA,
          3 ctfPoints, 4+4 spawns, ≥16 pickups de arma com ≥6 tipos distintos.
     GL6  densidade por quadrante: grade 4×4 sobre os bounds (espírito da MAP5,
          mesmo algoritmo da PV4) + ≥ 12 texturas distintas em uso.
     GL7  horizonte próprio: scene.userData.skyUrl gravado pelo applyLook/
          setMapSky (a régua lê o USO — BUG-02) E LOOK.gelo em public/js/look.js.
     GL8  moldes de verdade, não caixa (dono, 26/08: "parque da treta ainda esta
          low poly, predios low poly, brinquedos low poly tem que corrigir isso,
          todos os mapas do usantos continuam low poly sem moldes 3d bons"; reforço
          r3, 27/08: "o da neve e o mais lowpoly ainda"):
          ≥2 heróis do mapa são GLB Mint REGISTRADOS — grupo nomeado com
          userData.molde = id do prop + id presente em GELO_PROPS + GLB em disco
          (gelo-galpao/galpao_festival e gelo-quentao/gelo_quentao) — E o mapa
          soma ≥6 instâncias Mint no total (os heróis + o kit festa_r3: fogueira,
          poste_junino, barraca_quentao). Um mapa que esquece o userData, o slot
          de preload ou para de instanciar o kit reprova.

   FALHA = NÃO SABER MEDIR (lição 5): build que lança, waypoints ausentes,
   update ausente ou quadrante impossível de classificar reprovam com mensagem
   de conserto.

   USO
     node tools/eval/gelo-check.mjs
     node tools/eval/gelo-check.mjs --mutante=sem-fogueira  # GL2+GL3
     node tools/eval/gelo-check.mjs --mutante=fogo-parado   # GL3
     node tools/eval/gelo-check.mjs --mutante=sem-galpao    # GL2
     node tools/eval/gelo-check.mjs --mutante=sem-moldes    # GL8
     node tools/eval/gelo-check.mjs --mutante=lista-zerada  # GL8 (zera GELO_PROPS)
   ============================================================================ */
import { existsSync } from 'node:fs';
import { THREE, MAPS, initTextures } from './harness.mjs';
import { LOOK } from '../../public/js/look.js';
import { GELO_PROPS } from '../../public/js/map_gelo.js';

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const conhecidos = new Set(['sem-fogueira', 'fogo-parado', 'sem-galpao', 'sem-moldes', 'lista-zerada']);
if (MUTANTE && !conhecidos.has(MUTANTE)) throw new Error(`mutante desconhecido: ${MUTANTE}`);

const MIN_FOGUEIRAS = 3, MIN_BARRACAS = 4, MIN_PALHAS = 6, MIN_ARVORES = 12;
const MIN_TEXTURAS = 12, MIN_WAYPOINTS = 100, MIN_PICKUPS = 16, MIN_TIPOS_ARMA = 6;
const MIN_INSTANCIAS_MINT = 6;

/* instâncias sob um prefixo de nome: InstancedMesh conta `count`, o resto conta 1
   (um Grupo nomeado gelo-barraca-3 é UMA barraca, suas tábuas não têm nome) */
function contaPorPrefixo(root, prefixo) {
  let n = 0;
  root.traverse((o) => { if (o.name && o.name.startsWith(prefixo)) n += o.isInstancedMesh ? o.count : 1; });
  return n;
}

const clausulas = [];
const put = (id, ok, msg) => { clausulas.push({ id, ok, msg }); console.log(`  ${id} ${ok ? 'PASSA' : 'FALHA'} — ${msg}`); };

if (!MAPS.gelo || typeof MAPS.gelo.build !== 'function') {
  put('GL1', false, 'mapa gelo ausente do registro (maps.js) — a régua nasce vermelha até o buildGelo existir e ser registrado');
  console.log('\nGELO VERMELHA · mapa ausente');
  process.exit(1);
}

const T = await initTextures();
const scene = new THREE.Scene();
let W = null, erroBuild = null;
try { W = MAPS.gelo.build(scene, T); } catch (e) { erroBuild = String(e?.message || e); }

if (erroBuild || !W?.root || !W?.waypoints?.nodes || !W?.bounds) {
  put('GL1', false, `não sei medir: build do gelo ${erroBuild ? `lançou "${erroBuild}"` : 'devolveu mundo sem root/waypoints/bounds'} — conserte o build antes da régua`);
  console.log('\nGELO VERMELHA · mundo não medível');
  process.exit(1);
}
put('GL1', true, 'gelo registrado e buildando no harness');

/* ---- mutantes (aplicam DE VERDADE ou morrem — lição 8) ---- */
let mutanteAplicou = null;
if (MUTANTE === 'sem-fogueira') {
  const alvos = [];
  W.root.traverse((o) => { if (o.name?.startsWith('gelo-fogueira-')) alvos.push(o); });
  mutanteAplicou = alvos.length > 0;
  for (const o of alvos) o.parent.remove(o);
} else if (MUTANTE === 'fogo-parado') {
  mutanteAplicou = typeof W.update === 'function';
  if (mutanteAplicou) W.update = () => {};
} else if (MUTANTE === 'sem-galpao') {
  const galpao = W.root.getObjectByName('gelo-galpao');
  mutanteAplicou = !!galpao;
  if (galpao) galpao.parent.remove(galpao);
} else if (MUTANTE === 'sem-moldes') {
  let n = 0;
  W.root.traverse((o) => { if (o.userData?.molde) { delete o.userData.molde; n++; } });
  mutanteAplicou = n > 0;
} else if (MUTANTE === 'lista-zerada') {
  /* zera a lista de slots de preload: sem GELO_PROPS nenhum molde é registrado */
  mutanteAplicou = GELO_PROPS.length > 0;
  GELO_PROPS.length = 0;
}
if (MUTANTE && !mutanteAplicou) {
  console.error(`MUTANTE NÃO APLICOU: ${MUTANTE} — a régua não mede o que o mutante quebra`);
  process.exit(1);
}

/* ---- GL2 tema em objetos nomeados ---- */
{
  const galpao = contaPorPrefixo(W.root, 'gelo-galpao');
  const fogueiras = contaPorPrefixo(W.root, 'gelo-fogueira-');
  const barracas = contaPorPrefixo(W.root, 'gelo-barraca-');
  const quentao = contaPorPrefixo(W.root, 'gelo-quentao');
  const palhas = contaPorPrefixo(W.root, 'gelo-palha-');
  const arvores = contaPorPrefixo(W.root, 'gelo-arvores-');
  const falta = [];
  if (galpao < 1) falta.push('galpão 0/1');
  if (fogueiras < MIN_FOGUEIRAS) falta.push(`fogueiras ${fogueiras}/${MIN_FOGUEIRAS}`);
  if (barracas < MIN_BARRACAS) falta.push(`barracas ${barracas}/${MIN_BARRACAS}`);
  if (quentao < 1) falta.push('quentão 0/1');
  if (palhas < MIN_PALHAS) falta.push(`fardos ${palhas}/${MIN_PALHAS}`);
  if (arvores < MIN_ARVORES) falta.push(`araucárias/pinheiros ${arvores}/${MIN_ARVORES}`);
  put('GL2', !falta.length,
    falta.length
      ? `faltam: ${falta.join(' · ')} — fortaleza de gelo genérica foi o PR rejeitado; nomeie a festa junina no build (gelo-galpao, gelo-fogueira-*, gelo-barraca-*, gelo-quentao, gelo-palha-*, gelo-arvores-*)`
      : `galpão ${galpao} · fogueiras ${fogueiras} · barracas ${barracas} · quentão ${quentao} · fardos ${palhas} · árvores ${arvores}`);
}

/* ---- GL3 fogueiras com luz que oscila ---- */
{
  const fogueiras = [];
  W.root.traverse((o) => { if (o.name?.startsWith('gelo-fogueira-')) fogueiras.push(o); });
  const luzes = fogueiras.map((f) => {
    let luz = null;
    f.traverse((o) => { if (o.isPointLight && !luz) luz = o; });
    return luz;
  });
  if (fogueiras.length < MIN_FOGUEIRAS) {
    put('GL3', false, `não sei medir: ${fogueiras.length}/${MIN_FOGUEIRAS} gelo-fogueira-* — sem a fogueira nomeada não há onde procurar a luz`);
  } else if (luzes.some((l) => !l)) {
    put('GL3', false, `${luzes.filter((l) => !l).length}/${fogueiras.length} fogueiras SEM PointLight — brasa sem luz é maquete; cada fogueira carrega uma PointLight quente (0xff8c3a, sem sombra — SB2 no piso)`);
  } else if (typeof W.update !== 'function') {
    put('GL3', false, 'não sei medir: o mapa não exporta update(dt, time) — o game.js chama world.update se existir; exporte-o com o flicker das fogueiras');
  } else {
    const antes = luzes.map((l) => l.intensity);
    W.update(0.1, 3.0); W.update(0.1, 3.5); W.update(0.1, 11.0);
    const depois = luzes.map((l) => l.intensity);
    const paradas = luzes.filter((_, i) => antes[i] === depois[i]).length;
    put('GL3', paradas === 0, paradas
      ? `${paradas}/${fogueiras.length} fogueiras com luz PARADA entre update(t=3) e update(t=11) — fogueira fixa é luminária; oscile a intensidade no update`
      : `${fogueiras.length} fogueiras com PointLight oscilando entre update(t=3) e update(t=11)`);
  }
}

/* ---- GL4 cobertura de textura (recorte da SUPERFICIE1 do parque-wheel) ---- */
{
  let meshes = 0, texturizadas = 0;
  W.root.traverse((o) => {
    if (!o.isMesh) return;
    /* a fauna não é superfície de mapa: no arnês node os GLBs não baixam e os
       fallbacks procedurais sem textura entravam na razão (parque-wheel-check) */
    for (let p = o; p; p = p.parent) if (p.userData?.ambientLife) return;
    meshes++;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => m?.map)) texturizadas++;
  });
  const cobertura = texturizadas / Math.max(meshes, 1);
  put('GL4', meshes > 0 && cobertura >= 0.85,
    meshes
      ? `${texturizadas}/${meshes} malhas com textura (${(cobertura * 100).toFixed(1)}%)${cobertura >= 0.85 ? '' : ' — primitiva pelada é a cara low poly que o dono nomeou; pinte com SURFACE.*'}`
      : 'não sei medir: nenhuma malha no root');
}

/* ---- GL5 gameplay ---- */
{
  const falta = [];
  const nodes = W.waypoints.nodes, adj = W.waypoints.adj;
  if (nodes.length < MIN_WAYPOINTS) falta.push(`waypoints ${nodes.length}/${MIN_WAYPOINTS}`);
  const visto = new Uint8Array(nodes.length);
  const fila = [0]; visto[0] = 1;
  let alcancados = nodes.length ? 1 : 0;
  while (fila.length) {
    const i = fila.pop();
    for (const j of adj[i] || []) if (Number.isInteger(j) && j >= 0 && j < nodes.length && !visto[j]) { visto[j] = 1; alcancados++; fila.push(j); }
  }
  if (nodes.length && alcancados < nodes.length) falta.push(`grafo partido: ${nodes.length - alcancados} nós ilhados`);
  const spawnE = W.spawns?.E || [], spawnB = W.spawns?.B || [];
  if (spawnE.length !== 4 || spawnB.length !== 4) falta.push(`spawns E${spawnE.length}/4 + B${spawnB.length}/4`);
  if (spawnE.length && spawnB.length && nodes.length) {
    const i0 = W.nearestWaypoint(spawnE[0].x, spawnE[0].z);
    const i1 = W.nearestWaypoint(spawnB[0].x, spawnB[0].z);
    const rota = W.findPath(i0, i1);
    if (!Array.isArray(rota) || rota[rota.length - 1] !== i1) falta.push('sem rota spawnE↔spawnB pelo findPath do mapa');
  }
  const ctf = W.ctfPoints || [];
  if (ctf.length !== 3) falta.push(`ctfPoints ${ctf.length}/3`);
  const pickups = W.pickups || [];
  const tipos = new Set(pickups.map((p) => p.kind));
  if (pickups.length < MIN_PICKUPS) falta.push(`pickups ${pickups.length}/${MIN_PICKUPS} — o chão é o menu de compra (veto do dono: não reduzir armas)`);
  if (tipos.size < MIN_TIPOS_ARMA) falta.push(`tipos de arma ${tipos.size}/${MIN_TIPOS_ARMA}`);
  put('GL5', !falta.length,
    falta.length
      ? falta.join(' · ')
      : `${nodes.length} waypoints conexos · rota E↔B ok · 3 ctfPoints · 4+4 spawns · ${pickups.length} pickups de ${tipos.size} tipos`);
}

/* ---- GL6 quadrantes sem deserto + variedade de superfície ---- */
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
  const nomes = new Set();
  W.root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m?.map?.name) nomes.add(m.map.name);
  });
  if (!andaveis.length) {
    put('GL6', false, 'não sei medir: nenhum quadrante andável — grafo de waypoints vazio?');
  } else {
    const mediana = andaveis.map((g) => g.cover).sort((a, b) => a - b)[Math.floor(andaveis.length / 2)];
    const ruins = andaveis.filter((g) => g.cover < 1 || g.cover < 0.35 * mediana);
    const falta = [];
    if (ruins.length) falta.push(`quadrantes desertos: ${ruins.map((g) => `q${g.i} cover=${g.cover}`).join(' · ')} (mediana ${mediana}) — espalhe cobertura: fardo, barraca, mesa de festa`);
    if (nomes.size < MIN_TEXTURAS) falta.push(`${nomes.size}/${MIN_TEXTURAS} texturas distintas (${[...nomes].sort().join(', ') || 'nenhuma'}) — canvas repetido é a cara low poly; crie superfícies novas (neve, palha, lona junina, casca…)`);
    put('GL6', !falta.length, falta.length
      ? falta.join(' · ')
      : `${andaveis.length} quadrantes andáveis, cobertura mín ${Math.min(...andaveis.map((g) => g.cover))} · mediana ${mediana} · ${nomes.size} texturas distintas`);
  }
}

/* ---- GL7 horizonte próprio ---- */
{
  const sky = scene.userData.skyUrl;
  const look = LOOK.gelo;
  const falta = [];
  if (!sky) falta.push('scene.userData.skyUrl ausente (o mapa não passou pelo applyLook/setMapSky)');
  if (!look) falta.push('LOOK.gelo ausente em public/js/look.js (APPEND na tabela)');
  put('GL7', !falta.length, falta.length ? falta.join(' · ') : `sky ${sky} · LOOK.gelo ok`);
}

/* ---- GL8 moldes Mint: heróis registrados + ≥6 instâncias do kit no mapa ---- */
{
  /* Grupo ausente é falha da GL2 (sem colateral); aqui só conta o registro do molde.
     O mutante sem-moldes apaga TODO userData.molde (heróis E kit); o lista-zerada
     esvazia GELO_PROPS — os dois quebram esta cláusula, e só ela. */
  const ESPERADOS = [['gelo-galpao', 'galpao_festival'], ['gelo-quentao', 'gelo_quentao']];
  const falta = [];
  let instancias = 0;
  W.root.traverse((o) => {
    const molde = o.userData?.molde;
    if (!molde) return;
    if (!GELO_PROPS.includes(molde)) { falta.push(`${o.name || molde}: molde "${molde}" fora de GELO_PROPS — sem o slot o preload não baixa o GLB e o procedural low poly volta`); return; }
    if (!existsSync(`public/models/props/${molde}.glb`)) { falta.push(`public/models/props/${molde}.glb ausente no disco`); return; }
    instancias++;
  });
  for (const [grupo, molde] of ESPERADOS) {
    const o = W.root.getObjectByName(grupo);
    if (!o) continue; // grupo ausente é falha da GL2, não daqui (sem colateral)
    if (o.userData?.molde !== molde) falta.push(`${grupo} sem userData.molde="${molde}" — marque o grupo no build (a régua lê o USO, não a intenção)`);
  }
  if (instancias < MIN_INSTANCIAS_MINT) falta.push(`${instancias}/${MIN_INSTANCIAS_MINT} instâncias Mint registradas — o gelo sem o kit festa_r3 (fogueira/poste_junino/barraca_quentao) é o "mais lowpoly ainda" do dono (r3, 27/08)`);
  put('GL8', !falta.length,
    falta.length
      ? falta.join(' · ')
      : `${instancias} instâncias Mint registradas (heróis galpao_festival+gelo_quentao e kit festa_r3: grupo + userData.molde + GELO_PROPS + GLB em disco)`);
}

/* ---- placar e veredito dos mutantes ---- */
const vermelhas = clausulas.filter((c) => !c.ok);
const ALVO = { 'sem-fogueira': ['GL2', 'GL3'], 'fogo-parado': ['GL3'], 'sem-galpao': ['GL2'], 'sem-moldes': ['GL8'], 'lista-zerada': ['GL8'] };
if (MUTANTE) {
  const esperado = ALVO[MUTANTE];
  const acertou = esperado.every((id) => vermelhas.some((c) => c.id === id));
  const colaterais = vermelhas.filter((c) => !esperado.includes(c.id)).map((c) => c.id);
  if (!acertou) { console.error(`\nMUTANTE SOBREVIVEU: ${MUTANTE} não acendeu ${esperado.join('+')}`); process.exit(1); }
  if (colaterais.length) { console.error(`\nMUTANTE ${MUTANTE} acendeu cláusulas colaterais: ${colaterais.join(', ')}`); process.exit(1); }
  console.log(`\nMUTANTE MORDIDO: ${MUTANTE} -> ${esperado.join('+')}`);
  process.exit(0);
}
console.log(`\nGELO ${vermelhas.length ? `VERMELHA · ${vermelhas.map((c) => c.id).join(', ')}` : 'ok · GL1-GL8'}`);
process.exit(vermelhas.length ? 1 : 0);
