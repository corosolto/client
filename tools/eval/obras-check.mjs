#!/usr/bin/env node
/* ============================================================================
   obras-check.mjs — A OBRA DA PREFEITURA TEM TORRE, BUNKER E TÉRREO COM COVER
   ----------------------------------------------------------------------------
   O DEFEITO QUE ELA FECHA

   Mesmo pedido do dono que comprou a `posto-check.mjs` (26/08/2026):

     "os mapas do emerson acho que da pra fazer models no mintgg e deixar mais
      realista, especialmente... posto da treta, e obras da prefeitura, e nao
      deixar tanto aberto, e sim colocar mais elementos pro mapa aumentar um
      pouco de complexidade"

   Aqui o item caro é a TORRE DE ANDAIME COM ANDAR ANDÁVEL. Andaime é o prop mais
   fácil do mundo de degradar para cenário: basta o `groundHeightAt` parar de
   devolver a altura do deck e a torre continua na tela, bonita, sólida, e
   completamente inútil — ninguém sobe, nenhum portão reclama. Foi literalmente o
   estado intermediário deste branch: a prancha entre as duas torres caía 2,8 m em
   3,2 m, o grafo de waypoints recusava a aresta pelo teto de desnível, e a torre
   SUL inteira ficou fora do grafo (3 componentes conexos) com o mapa passando em
   `eval:mapcontrato` — porque MC3 tolera ilhados até um teto.

   As outras três armadilhas da mesma frente:
     · o container de spawn virar decoração longe do spawn que ele deveria cobrir;
     · o térreo perder o cover de meia altura e voltar a ser barro liso;
     · o miolo reabrir — era uma bacia limpa com 131 linhas de visão livres de mais
       de 20 m passando pela célula (0,0).

   ── O QUE ELA MEDE (mundo construído pelo harness, node puro) ──────────────
     OBRAS1 · TORRE ESCALÁVEL — as 2 torres declaram o molde `andaime`, o GLB
              existe, o fonte chama `placeProp`, o `groundHeightAt` devolve o piso
              alto (≥ 5 m) em cima delas, há nós de waypoint nos dois pisos e
              existe ROTA do spawn E até o piso alto. Andar sem rota é meio andar.
     OBRAS2 · BUNKER DE SPAWN — 4 containers com o molde `container_escritorio`,
              simétricos em z, com colisor de verdade, e cada spawn dos dois times
              com bunker a ≤ 12 m.
     OBRAS3 · TÉRREO COM COVER — ≥ 24 colisores de meia altura (topo entre 0,8 e
              1,4 m: saco de cimento e tubo) espalhados pelo térreo. Aqui as duas
              bandas se sobrepõem em parte (terreno acidentado põe alguns desses
              topos acima de 1,2 m) — diferente do posto, onde são disjuntas.
     OBRAS4 · GRUAS NO SKYLINE — ≥ 3 gruas com mais de 15 m, todas FORA dos bounds
              jogáveis e SEM colisor (silhueta, não obstáculo).
     OBRAS5 · MIOLO MENOS ABERTO — linha de visão livre ≤ 30% dos pares de nós de
              chão a mais de 20 m, com ≥ 62 sólidos na banda do olho. A/B medido
              no branch: 58,9% -> 23,6% e 39 -> 69 sólidos. Quem carrega o número
              é o tapume interno (18,5 pontos); o núcleo vale 4,5.
     OBRAS6 · PASSA POR BAIXO — com o corpo no barro, o `groundHeightAt` sob o deck
              devolve o BARRO, não o deck. Sem isso o andaime vira bloco maciço e
              o jogador "sobe" sozinho ao encostar na torre.

   ── O QUE ELA NÃO MEDE, DE PROPÓSITO ───────────────────────────────────────
   Em node o GLB não carrega (`placeProp` devolve null e o mapa cai no fallback —
   contrato de prop opcional do `mapprops.js`), então a régua cobra o CONTRATO do
   molde, não o pixel. Bytes e validade do GLB são do `eval:asset-integrity` e do
   `eval:gltf-validator`; não se repetem aqui.

   ── AS MUTAÇÕES QUE PROVAM ─────────────────────────────────────────────────
     --mutar=plano ............. o andaime vira caixa (sem deck)   -> OBRAS1
     --mutar=sem-bunker ........ o container perde o molde         -> OBRAS2
     --mutar=terreo-liso ....... o cover de meia altura some       -> OBRAS3
     --mutar=sem-grua .......... as gruas somem do skyline         -> OBRAS4
     --mutar=miolo-aberto ...... o núcleo de escada some           -> OBRAS5
     --mutar=deck-macico ....... o deck deixa de ter vão por baixo -> OBRAS6
   `--mutante=` é aceito como apelido de `--mutar=`.

   Uso: node tools/eval/obras-check.mjs [--mutar=<nome>]
   ============================================================================ */
import { existsSync, readFileSync } from 'node:fs';
import { THREE, MAPS, initTextures } from './harness.mjs';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const MUT = arg('mutar') || arg('mutante');
const MUTANTES = new Set(['plano', 'sem-bunker', 'terreo-liso', 'sem-grua', 'miolo-aberto', 'deck-macico']);
if (MUT && !MUTANTES.has(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

let fonte = readFileSync(new URL('../../public/js/map_obras.js', import.meta.url), 'utf8');
if (MUT === 'plano') fonte = fonte.replace(/placeProp\('andaime'/g, "placeProp('caixa_qualquer'");

const world = MAPS.obras_prefeitura.build(new THREE.Scene(), await initTextures());

const porNome = (p) => { const o = []; world.root.traverse((n) => { if (n.name?.startsWith(p)) o.push(n); }); return o; };
const torres = porNome('obras-torre-andaime-');
const bunkers = porNome('obras-bunker-');
const gruas = porNome('obras-grua-skyline');
const nucleo = porNome('obras-nucleo-escada')[0];
const tapumes = porNome('obras-tapume-interno');

let nodes = world.waypoints.nodes;
let alturaEm = (x, z, yRef) => world.groundHeightAt(x, z, yRef);

/* ---------------- mutações ---------------- */
if (MUT === 'plano') {   // andaime vira caixa: sem piso alto e sem nó lá em cima
  nodes = nodes.filter((n) => (n.y || 0) <= 2);
  alturaEm = (x, z, yRef) => world.groundHeightAt(x, z, -50);
  for (const t of torres) delete t.userData.molde;
}
if (MUT === 'sem-bunker') for (const b of bunkers) delete b.userData.molde;
if (MUT === 'sem-grua') gruas.length = 0;
if (MUT === 'deck-macico') alturaEm = (x, z) => world.groundHeightAt(x, z);
let colliders = world.colliders;
if (MUT === 'terreo-liso') colliders = colliders.filter((c) => !(c.maxY - c.minY >= 0.6 && c.maxY - c.minY <= 1.4));
/* Reabrir o miolo é tirar o TAPUME INTERNO junto com o núcleo. Medido: o núcleo
   sozinho vale 4,5 pontos (23,6% -> 28,1%) e não cruzava o teto de 30% — a primeira
   versão desta mutação saía verde e o guarda de mutação cega a pegou. Os painéis
   valem 18,5 (23,6% -> 42,1%); os dois juntos devolvem o mapa aos 50,8%. */
if (MUT === 'miolo-aberto') {
  const ehPainel = (c) => { const h = c.maxY - c.minY; return h > 2.4 && h < 2.9 && Math.abs((c.minX + c.maxX) / 2) < 26 && Math.abs((c.minZ + c.maxZ) / 2) < 26; };
  const ehNucleo = (c) => Math.abs((c.minX + c.maxX) / 2) < 2.6 && Math.abs((c.minZ + c.maxZ) / 2) < 2.6 && c.maxY > 3;
  colliders = colliders.filter((c) => !ehPainel(c) && !ehNucleo(c));
  tapumes.length = 0;
}

/* ================= OBRAS1 · TORRE ESCALÁVEL ================= */
const props = MAPS.obras_prefeitura.props || [];
const glbAndaime = new URL('../../public/models/props/andaime.glb', import.meta.url);
const TORRES_XZ = [[-18, -11], [-18, 11]];
const pisoAlto = TORRES_XZ.every(([tx, tz]) => alturaEm(tx, tz, 6) >= 5);
const pisoBaixo = TORRES_XZ.every(([tx, tz]) => alturaEm(tx + 10, tz, 3.2) >= 2.4);
const nosAlto = nodes.filter((n) => (n.y || 0) > 5);
const nosDeck = nodes.filter((n) => (n.y || 0) > 2);
const deE = world.nearestWaypoint(world.spawns.E[0].x, world.spawns.E[0].z);
const alcanca = nosAlto.filter((n) => {
  const i = world.nearestWaypoint(n.x, n.z);
  const p = world.findPath(deE, i);
  return p.length > 1 && (world.waypoints.nodes[p[p.length - 1]].y || 0) > 5;
}).length;
const obras1 = torres.length >= 2
  && torres.every((t) => t.userData.molde === 'andaime')
  && props.includes('andaime') && existsSync(glbAndaime) && fonte.includes("placeProp('andaime'")
  && pisoAlto && pisoBaixo
  && nosAlto.length >= 8 && nosDeck.length >= 20
  && alcanca >= 8;

/* ================= OBRAS2 · BUNKER DE SPAWN ================= */
/* Âncora vem do `userData.pos`, NÃO de `group.position`: estes Groups ficam na
   origem de propósito (os filhos entram em coordenada de mundo), e ler `.position`
   deles devolvia (0,0,0) — a primeira versão desta régua reprovou por isso. */
const pos = (o) => o.userData.pos || [o.position.x, o.position.z];
const bunkerCol = (b) => colliders.some((c) => Math.abs((c.minX + c.maxX) / 2 - pos(b)[0]) < 3
  && Math.abs((c.minZ + c.maxZ) / 2 - pos(b)[1]) < 3 && c.maxY - c.minY > 2);
const spawnsCobertos = ['E', 'B'].every((t) => world.spawns[t].every((s) =>
  bunkers.some((b) => Math.hypot(pos(b)[0] - s.x, pos(b)[1] - s.z) <= 12)));
const simetrico = bunkers.filter((b) => pos(b)[1] < 0).length === bunkers.filter((b) => pos(b)[1] > 0).length;
const obras2 = bunkers.length >= 4
  && bunkers.every((b) => b.userData.molde === 'container_escritorio')
  && props.includes('container_escritorio')
  && existsSync(new URL('../../public/models/props/container_escritorio.glb', import.meta.url))
  && fonte.includes("placeProp('container_escritorio'")
  && bunkers.every(bunkerCol) && spawnsCobertos && simetrico;

/* ================= OBRAS3 · TÉRREO COM COVER DE MEIA ALTURA ================= */
const meiaAltura = colliders.filter((c) => { const h = c.maxY - c.minY; return h >= 0.8 && h <= 1.4; });
const obras3 = meiaAltura.length >= 24;

/* ================= OBRAS4 · GRUAS NO SKYLINE ================= */
const B = world.bounds;
const dentroDoJogo = (g) => pos(g)[0] > B.minX && pos(g)[0] < B.maxX && pos(g)[1] > B.minZ && pos(g)[1] < B.maxZ;
const gruaComColisor = (g) => colliders.some((c) => Math.abs((c.minX + c.maxX) / 2 - pos(g)[0]) < 4 && Math.abs((c.minZ + c.maxZ) / 2 - pos(g)[1]) < 4);
const obras4 = gruas.length >= 3
  && gruas.every((g) => (g.userData.altura || 0) > 15)
  && !gruas.some(dentroDoJogo) && !gruas.some(gruaComColisor);

/* ================= OBRAS5 · MIOLO MENOS ABERTO ================= */
const TETO_LIVRE = 0.30, MIN_OLHO = 62;
const olho = colliders.filter((c) => c.maxY >= 1.2 && c.minY <= 1.6);
const chao = nodes.filter((n) => (n.y || 0) < 1 && Math.abs(n.x) < 26 && Math.abs(n.z) < 26);
const linhaLivre = (a, b) => {
  const d = Math.hypot(b.x - a.x, b.z - a.z), N = Math.ceil(d / 0.5);
  for (let i = 1; i < N; i++) {
    const t = i / N, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
    for (const c of olho) if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return false;
  }
  return true;
};
let pares = 0, livres = 0;
for (let i = 0; i < chao.length; i++) for (let j = i + 1; j < chao.length; j++) {
  if (Math.hypot(chao[i].x - chao[j].x, chao[i].z - chao[j].z) < 20) continue;
  pares++; if (linhaLivre(chao[i], chao[j])) livres++;
}
const fracao = pares ? livres / pares : 1;
const obras5 = fracao <= TETO_LIVRE && olho.length >= MIN_OLHO && !!nucleo && tapumes.length >= 8;

/* ================= OBRAS6 · PASSA POR BAIXO DO DECK ================= */
/* Com o corpo no barro (yRef baixo) o chão sob a torre tem de ser o BARRO. */
const vaos = TORRES_XZ.map(([tx, tz]) => ({ cima: alturaEm(tx, tz, 6), baixo: alturaEm(tx, tz, 0.4) }));
const obras6 = vaos.every((v) => v.cima >= 5 && v.baixo < 1.5);

/* ---------------- veredito ---------------- */
const marca = MUT ? ` [mutante ${MUT}]` : '';
const linha = (id, ok, evid) => { console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${evid}${marca}`); return ok; };
const r = [
  linha('OBRAS1', obras1, `${torres.length} torres molde "${torres[0]?.userData.molde || 'nenhum'}" · piso alto ${pisoAlto ? 'ok' : 'NÃO'} · ${nosAlto.length} nós no alto (${alcanca} com rota do spawn) · ${nosDeck.length} nós de deck`),
  linha('OBRAS2', obras2, `${bunkers.length} bunkers molde "${bunkers[0]?.userData.molde || 'nenhum'}" · simétrico ${simetrico ? 'sim' : 'NÃO'} · spawns cobertos ${spawnsCobertos ? 'sim' : 'NÃO'}`),
  linha('OBRAS3', obras3, `${meiaAltura.length} colisores de meia altura (0,8-1,4 m; mín. 24)`),
  linha('OBRAS4', obras4, `${gruas.length} gruas · alturas ${gruas.map((g) => g.userData.altura).join('/') || '—'} m · todas fora dos bounds e sem colisor`),
  linha('OBRAS5', obras5, `${(fracao * 100).toFixed(1)}% dos ${pares} pares >20 m com linha livre (teto ${(TETO_LIVRE * 100).toFixed(0)}%) · ${olho.length} sólidos de olho (mín. ${MIN_OLHO}) · núcleo ${nucleo ? 'sim' : 'NÃO'} · ${tapumes.length} tapumes`),
  linha('OBRAS6', obras6, `sob a torre: em cima ${vaos.map((v) => v.cima.toFixed(2)).join('/')} m · por baixo ${vaos.map((v) => v.baixo.toFixed(2)).join('/')} m`),
];

const falhas = r.filter((ok) => !ok).length;
let cega = false;
if (MUT && !falhas) { console.log(`MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`); cega = true; }
if (!falhas && !cega) console.log('OBRAS ✓ 6 cláusulas das Obras da Prefeitura (torre, bunker, térreo, gruas, miolo, vão)');
process.exit(falhas || cega ? 1 : 0);
