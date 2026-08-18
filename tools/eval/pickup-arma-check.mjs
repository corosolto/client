/* ============================================================================
   pickup-arma-check.mjs — TODA ARMA NO CHÃO É UMA ARMA QUE EXISTE?
   ----------------------------------------------------------------------------
   POR QUE EXISTE (issue #366, crash em produção, alpha.157, fingerprint ea71c000)
     "Uncaught TypeError: Cannot read properties of undefined (reading 'short')"
     at Game._updatePickups (game.js:4849:66) -> Game.update -> loop

   CAUSA RAIZ (KNOWN-BUGS.md BUG-70)
     `map_penitenciaria.js:223` declarava um pickup com `kind:'smg'`. `smg` NÃO é
     arma: é CLASSE de arma (recoil.js:38, game.js:316, audio.js:271, vmattach.js:622
     mapeiam mp5/uzi/p90 -> 'smg'). Não existe `WEAPONS.smg`. O prompt do [E]
     desreferencia `WEAPONS[w].short` SEM guarda (game.js:4849) e o laço roda TODO
     QUADRO dentro do `update()` — olhar pra aquela arma congelava a partida inteira,
     não só o HUD. `_grabPickup` já tinha a guarda (`if (!WEAPONS[w]) return false`),
     então a arma também era impegável: caixa dourada morta no chão.

   O QUE ELA MEDE, E POR QUE ASSIM
     Duas cláusulas, medidas em DOIS pontos diferentes de propósito:

     PA1 · INVENTÁRIO, NO MAPA CRU. Chama `MAPS[id].build()` direto — a lista que o
           MAPA devolve, ANTES da porta de entrada do `Game`. Tem que ser antes: o
           conserto de BUG-70 pôs uma guarda em game.js:573 que joga id desconhecido
           fora, e uma régua que lesse `game.world.pickups` depois disso ficaria verde
           com o defeito presente — é o modo de cegueira 3 (medir a lista declarada
           depois do filtro) do references/reguas.md. Junta os drops do ARMÁRIO do
           spawn (`game.drops`, que só existem depois do `_resetPositions`), porque as
           4 fileiras do rack são pickup igual e nascem de outra lista (game.js:1913).
           Cada id tem que resolver em `WEAPONS` E ter os campos que o caminho quente
           desreferencia sem guarda — ver CAMPOS abaixo, cada um com arquivo:linha.

     PA2 · O CAMINHO DO CRASH. Planta o jogador em cima de cada pickup distinto, com
           `state='live'`, e chama o `_updatePickups()` DE PRODUÇÃO — a linha exata do
           stack de #366. Qualquer exceção é vermelha. Sem isto a régua seria uma
           tabela de ids: passaria verde no dia em que o campo desreferenciado sem
           guarda deixar de ser `short`.

     ANTI-VACUIDADE — mapa que devolve menos de MIN_PICKUPS é vermelho. Sem inventário
       mínimo, apagar as armas deixa as duas cláusulas verdes sem medir nada: a
       armadilha de `obb-check.mjs:28-31`.

   MEDIDO ANTES DO CONSERTO (18/08, `node tools/eval/pickup-arma-check.mjs`)
     PA1  1 id fora de WEAPONS: penitenciaria/mapa 'smg'  (de 772 pickups em 12 mapas)
     PA2  1 mapa lançando no `_updatePickups`: penitenciaria ('smg'), com a mensagem
          literal de #366 — "Cannot read properties of undefined (reading 'short')"

   MUTAÇÕES QUE FAZEM ELA FICAR VERMELHA (rodadas e medidas)
     --mutante=smg          devolve o id 'smg' ao 8º pickup da fileira central da
                            penitenciária, nos DOIS pontos de medição
                            -> PA1 acende com 1 id fora de WEAPONS e PA2 acende com
                               1 mapa lançando: reproduz #366 exatamente.
     --mutante=sem-short    apaga `WEAPONS.mp5.short` (arma que está no armário dos 12
                            mapas) -> PA1 acende nos 12, nomeando o campo e o
                               arquivo:linha que o lê.
     --mutante=sem-pickups  esvazia a lista dos dois pontos -> acende a ANTI-VACUIDADE
                               nos 12 mapas (0 < 20).

   O QUE NÃO MORDE, E POR QUÊ
     `--mutante=sem-short` NÃO acende a PA2, e é de propósito: medido, ela fica VERDE
     nos 12 mapas. Campo ausente numa arma que EXISTE vira `undefined` dentro do
     template do HUD ("[E] PEGAR undefined") — mentira, não exceção. Quem lança é
     `WEAPONS[w]` ausente, que é o defeito de #366. Ou seja, as duas cláusulas medem
     coisas diferentes e nenhuma é redundante: PA2 pega o CRASH, PA1 pega a MENTIRA
     que sobra quando alguém "conserta" o crash com `?.` — foi exatamente o palpite
     óbvio refutado na rodada do BUG-70.
     Não mede se a arma é ALCANÇÁVEL nem se está assentada no chão: isso é o
     `pickup-check.mjs`, com flood-fill e três critérios. Dois limiares pro mesmo
     conceito é a LIÇÃO 2 do docs/LICOES.md — aqui é IDENTIDADE de arma, lá é geometria.
     Roda só em `wpnMode:'all'` (o que o `bootGame` monta). Os modos restritos PODAM
     pickups (`_pickupAllowed`, game.js:585) e nenhum ACRESCENTA id: 'all' é o
     superconjunto, o que passa aqui passa lá.

   Uso: node tools/eval/pickup-arma-check.mjs [--mutante=...] [--json]
   ============================================================================ */
import { THREE, MAPS, initTextures, bootGame } from './harness.mjs';
import { WEAPONS } from '../../public/js/data/weapons.js';

const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const MUTANTE = arg('mutante', '');
const JSONOUT = process.argv.includes('--json');

/* Campos que o caminho quente lê SEM guarda. Não é juízo de valor: cada um vem com o
   arquivo:linha que o desreferencia. Campo GUARDADO não entra — cobrar campo guardado
   reprova arma que funciona (mesmo critério do `map-contrato-check.mjs`). */
const CAMPOS = [
  { campo: 'short', onde: 'game.js:4849 prompt do [E] — a linha do crash #366' },
  { campo: 'name', onde: 'game.js:2510 _switchWeapon / game.js:2056 HUD' },
  { campo: 'mag', onde: 'game.js:2489 primeiro saque / game.js:5045 _resetPositions' },
  { campo: 'reserve', onde: 'game.js:2489 primeiro saque / game.js:5045 _resetPositions' },
];

/* Piso de inventário: o armário do spawn nasce com as 4 fileiras dos DOIS times e
   nenhum mapa vivo tem menos que isto. Baixo de propósito — existe pra pegar "a lista
   veio vazia", não pra congelar o layout do rack. */
const MIN_PICKUPS = 20;

/* O mutante `sem-short` mexe na TABELA, então tem que valer antes de qualquer medição. */
if (MUTANTE === 'sem-short') {
  if (WEAPONS.mp5?.short === undefined) { console.error('x mutante=sem-short impossível: WEAPONS.mp5.short já não existe'); process.exit(1); }
  delete WEAPONS.mp5.short;
}

const textures = initTextures();
const linhas = [];

for (const mapId of Object.keys(MAPS)) {
  const r = { map: mapId, erro: null, total: 0, foraDeWeapons: [], semCampo: [], lancou: null };
  linhas.push(r);

  // ---- PA1: a lista CRUA do mapa (antes da guarda de game.js:573) + o armário ----
  let cru = [];
  try {
    const w = MAPS[mapId].build(new THREE.Scene(), textures);
    cru = (w.pickups || []).map((pk) => ({ weapon: pk.weapon, fonte: 'mapa' }));
  } catch (e) { r.erro = `build: ${e.message}`; continue; }

  let g = null;
  try { g = bootGame(mapId, { textures, ctf: false, seed: 12345 }); }
  catch (e) { r.erro = `boot: ${e.message}`; continue; }

  const rack = (g.drops || []).map((pk) => ({ weapon: pk.weapon, fonte: pk.rack ? 'rack' : 'drop' }));
  let inventario = [...cru, ...rack];

  if (MUTANTE === 'smg' && mapId === 'penitenciaria') {
    const alvo = inventario.find((x) => x.weapon === 'uzi' && x.fonte === 'mapa');
    if (!alvo) { console.error("x mutante=smg impossível: penitenciaria sem pickup 'uzi' no mapa"); process.exit(1); }
    alvo.weapon = 'smg';
    const noJogo = (g.world.pickups || []).find((pk) => pk.weapon === 'uzi');
    if (!noJogo) { console.error("x mutante=smg impossível: 'uzi' não sobreviveu à porta de entrada"); process.exit(1); }
    noJogo.weapon = 'smg';                                  // PA2 mede o mesmo defeito
  }
  if (MUTANTE === 'sem-pickups') { inventario = []; g.world.pickups = []; g.drops = []; }

  r.total = inventario.length;
  for (const { weapon: w, fonte } of inventario) {
    const W = WEAPONS[w];
    if (!W) { r.foraDeWeapons.push({ fonte, id: String(w) }); continue; }
    for (const c of CAMPOS) if (W[c.campo] === undefined) r.semCampo.push({ fonte, id: w, ...c });
  }

  // ---- PA2: o caminho do crash, no motor de produção ----
  const lista = [...(g.world.pickups || []), ...(g.drops || [])];
  const vistos = new Set();
  const p = g.player;
  g.state = 'live';
  p.alive = true;
  for (const pk of lista) {
    if (vistos.has(pk.weapon)) continue;
    vistos.add(pk.weapon);
    p.pos.set(pk.x, p.pos.y, pk.z);
    /* relógios do prompt zerados: sem isto o período refratário (HINT_OFF, game.js:4832)
       esconde o ramo que crasha e a régua fica verde por TEMPO, não por correção. */
    g._pkHintW = null; g._pkHintAte = 0; g._pkHintLivre = 0;
    try {
      g._updatePickups();     // 1º quadro arma o _pkHintW
      g._updatePickups();     // 2º quadro é quem escreve o texto — a linha do crash
    } catch (e) {
      r.lancou = { id: String(pk.weapon), msg: e.message };
      break;
    }
  }
}

const pa1 = linhas.filter((r) => r.erro || r.foraDeWeapons.length || r.semCampo.length || r.total < MIN_PICKUPS);
const pa2 = linhas.filter((r) => r.lancou);

if (JSONOUT) {
  console.log(JSON.stringify({ mapas: linhas, mutante: MUTANTE || null, minPickups: MIN_PICKUPS }, null, 1));
} else {
  const totalPk = linhas.reduce((s, r) => s + r.total, 0);
  console.log(`ARMA DE PICKUP — ${linhas.length} mapas · ${totalPk} pickups${MUTANTE ? `  [mutante: ${MUTANTE}]` : ''}\n`);
  for (const r of linhas) {
    if (r.erro) { console.log(`  x ${r.map.padEnd(18)} ${r.erro}`); continue; }
    const ok = !r.foraDeWeapons.length && !r.semCampo.length && !r.lancou && r.total >= MIN_PICKUPS;
    console.log(`  ${ok ? 'ok' : ' x'} ${r.map.padEnd(18)} ${String(r.total).padStart(3)} pickups${r.total < MIN_PICKUPS ? '  <- ABAIXO DO PISO (vacuidade)' : ''}`);
    for (const f of r.foraDeWeapons) console.log(`       fora de WEAPONS: '${f.id}' (fonte ${f.fonte})`);
    // uma linha por (arma, campo): sem dedupe o rack repete o mesmo par 4× por mapa
    const pares = new Map(r.semCampo.map((f) => [`${f.id}.${f.campo}`, f]));
    for (const f of pares.values()) console.log(`       '${f.id}' sem .${f.campo} (${r.semCampo.filter((x) => x.id === f.id && x.campo === f.campo).length}×)  <- ${f.onde}`);
    if (r.lancou) console.log(`       _updatePickups LANÇOU em '${r.lancou.id}': ${r.lancou.msg}`);
  }
  console.log('');
  console.log(`  PA1 id de arma existe e tem os campos do caminho quente  ${pa1.length ? `FALHA — ${pa1.map((r) => r.map).join(', ')}` : `PASSA (${totalPk} pickups, ${CAMPOS.length} campos)`}`);
  console.log(`  PA2 _updatePickups de produção não lança                 ${pa2.length ? `FALHA — ${pa2.map((r) => `${r.map} ('${r.lancou.id}')`).join(', ')}` : 'PASSA'}`);
}

process.exit(pa1.length + pa2.length ? 1 : 0);
