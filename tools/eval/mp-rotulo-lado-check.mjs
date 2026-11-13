/* MP-ROTULO-LADO-CHECK — no multiplayer o time do jogador se chama pelo LADO, não pela categoria do corpo.
   ═══════════════════════════════════════════════════════════════════════════════════
   O DEFEITO

   Online, `_startGame` (main.js) faz `faction = charDef.team` e só no SP troca a facção pelo
   lado (`if (!online) faction = side`, commit 71f14c79). O servidor manda os lados E/B
   (`GET /rooms`: faccaoE "E", faccaoB "B"), mas o `playerFaction` do Game fica com a
   categoria visual do personagem (C/F/U/M/P). Tudo que nomeia o time deve ignorar essa
   categoria: placar ("TIME E"), HUD ("E 0 × 0 B"), banners, vitória, brasão (e.png/b.png),
   chip versus da tela de carregamento e o cartão "SEU PERSONAGEM NO MULTIPLAYER".

   A REGRA QUE ESTA RÉGUA SEGURA

     · rótulo, sigla e brasão do time saem do LADO (E/B);
     · a viewmodel (luva/braços, game.js `GLOVE[this.playerFaction]` e `buildFPArms`) continua
       com a categoria do PERSONAGEM online — a mão segue o personagem (regra do dono);
     · no SP, a mesma regra de dois times vale; grupos editoriais não viram times.

   COMO ELA MEDE (Node puro, sem Chrome)

   O pedaço de `_startGame` que decide lado/facção, o chip versus e o subtítulo do cartão são
   LIDOS do main.js e executados como estão (o main.js inteiro não carrega em Node). O Game é
   o de verdade (harness.mjs), montado com os valores que esse pedaço devolve — o mesmo que o
   `new Game({... playerTeam: side, playerFaction: faction, enemyFaction: enemyFac })` do main.

   CLÁUSULAS (cada uma roda em MP com corpo C, F, U, M e P em cada lado, E e B)
     ML1  nome do time (`_teamName`, placar e banners) = TIME E/TIME B do lado
     ML2  sigla (`_teamTag`) e linha do HUD "RODADA n/N · E x × y B"
     ML3  brasão do HUD (plaqueta) e do placar = e.png/b.png do lado
     ML4  chip versus da tela de carregamento = TIME E/TIME B, os dois lados; o do
          adversário deriva do lado oposto mesmo se o servidor mandar uma categoria
     ML5  subtítulo do cartão "SEU PERSONAGEM NO MULTIPLAYER" = TIME E/TIME B
     ML6  viewmodel: `playerFaction` (luva e braços) continua a categoria do personagem
     ML7  CTF online: o pano da bandeira do dono (netgame.js applyCtfState -> _flagTexFor) é
          o do LADO, não o brasão do corpo do jogador
     SP1  SP com cada categoria em cada lado: rótulo/sigla/brasão/chip seguem E/B;
          a viewmodel continua usando o lado como antes.

   MUTANTES (em memória; o disco não é tocado, salvo a cópia temporária do game.js)
     --mutante=rotulo-categoria   devolve rótulo/sigla/brasão/chip/cartão à categoria -> ML1-ML5 vermelhas
     --mutante=maos-lado          aplica `faction = side` também online (mão vira o lado) -> ML6 vermelha
     --mutante=bandeira-categoria devolve o pano do CTF online a `_factionOf(dono)`  -> ML7 vermelha
     --mutante=chip-inimigo-faccao chip do adversário volta a ler currentEnemyFaction -> ML4 vermelha
   Em todos, SP1 continua verde.

   uso: node tools/eval/mp-rotulo-lado-check.mjs [--mutante=<nome>]
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as H from './harness.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && !['rotulo-categoria', 'maos-lado', 'bandeira-categoria', 'chip-inimigo-faccao'].includes(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const NOME = { E: 'TIME E', B: 'TIME B' };
const SIGLA = { E: 'E', B: 'B' };
const outro = (s) => (s === 'E' ? 'B' : 'E');
const { CHARACTERS } = H;
const { ladosDe, podeNoLado } = await import(pathToFileURL(path.join(RAIZ, 'public/js/characters.js')).href);
const { resolvePlayerSide } = await import(pathToFileURL(path.join(RAIZ, 'public/js/net.js')).href);

/* ── fontes, com o mutante aplicado em memória ─────────────────────────────────── */
let mainSrc = fs.readFileSync(path.join(RAIZ, 'public/js/main.js'), 'utf8');
let gameSrc = fs.readFileSync(path.join(RAIZ, 'public/js/game.js'), 'utf8');
const troca = (src, de, para, onde) => {
  if (!src.includes(de)) { console.error(`mutante ${MUT}: trecho não encontrado em ${onde}:\n  ${de}`); process.exit(2); }
  return src.split(de).join(para);
};
if (MUT === 'rotulo-categoria') {
  gameSrc = troca(gameSrc, "_teamName(side) { return TEAM_LABEL[side] || side; }",
    "_teamName(side) { const f = this._factionOf(side); return f === 'U' ? 'TRIBOS URBANAS' : f === 'C' ? 'PALHAÇOS' : f === 'F' ? 'FUNKEIROS' : f === 'M' ? 'MÍTICO' : (TEAM_LABEL[f] || f); }", 'game.js');
  gameSrc = troca(gameSrc, "_teamTag(side) { return side === 'B' ? 'B' : 'E'; }",
    "_teamTag(side) { const f = this._factionOf(side); return f === 'U' ? 'TRB' : f === 'C' ? 'PLH' : f === 'F' ? 'FNK' : f === 'M' ? 'MIT' : f === 'E' ? 'E' : 'B'; }", 'game.js');
  gameSrc = troca(gameSrc, "const f = String(side || '').toLowerCase();", "const f = String(this._factionOf(side) || '').toLowerCase();", 'game.js');
  gameSrc = troca(gameSrc, "const crest = (side) => String(side || 'E').toLowerCase();", "const crest = (side) => String(this._factionOf(side) || 'E').toLowerCase();", 'game.js');
  mainSrc = troca(mainSrc, "a.textContent = tr(FACTION_NAME[currentTeam] || '');", "a.textContent = tr(FACTION_NAME[currentFaction] || '');", 'main.js');
  mainSrc = troca(mainSrc, ": def ? tr(FACTION_NAME[corpo.team] || corpo.team) :", ": def ? tr(FACTION_NAME[def.team] || def.team) :", 'main.js');
}
if (MUT === 'maos-lado') mainSrc = troca(mainSrc, 'if (!online) faction = side;', 'faction = side;', 'main.js');
let netSrc = fs.readFileSync(path.join(RAIZ, 'public/js/netgame.js'), 'utf8');
if (MUT === 'bandeira-categoria') netSrc = troca(netSrc, 'const fac = pt.owner || null;', 'const fac = pt.owner ? game._factionOf(pt.owner) : null;', 'netgame.js');
if (MUT === 'chip-inimigo-faccao') mainSrc = troca(mainSrc, "b.textContent = tr(FACTION_NAME[ladoDele] || '');", "b.textContent = tr(FACTION_NAME[currentEnemyFaction] || '');", 'main.js');

/* O Game mutado mora numa cópia IRMÃ do game.js (mesma pasta, então os imports relativos
   resolvem) que some no fim. Sem mutante de game.js, o Game é o do harness. */
let Game = H.Game, copia = null;
if (gameSrc !== fs.readFileSync(path.join(RAIZ, 'public/js/game.js'), 'utf8')) {
  copia = path.join(RAIZ, 'public/js', `.mut-rotulo-${process.pid}.js`);
  fs.writeFileSync(copia, gameSrc);
  try { ({ Game } = await import(pathToFileURL(copia).href)); } finally { fs.rmSync(copia, { force: true }); }
}
let makeNetcode;
if (netSrc !== fs.readFileSync(path.join(RAIZ, 'public/js/netgame.js'), 'utf8')) {
  const c = path.join(RAIZ, 'public/js', `.mut-rotulo-net-${process.pid}.js`);
  fs.writeFileSync(c, netSrc);
  try { ({ makeNetcode } = await import(pathToFileURL(c).href)); } finally { fs.rmSync(c, { force: true }); }
} else ({ makeNetcode } = await import(pathToFileURL(path.join(RAIZ, 'public/js/netgame.js')).href));

/* ── pedaços do main.js, executados como estão ─────────────────────────────────── */
const pega = (re, nome) => {
  const m = re.exec(mainSrc);
  if (!m) { console.error(`REPROVA (mp-rotulo-lado-check) — não achei ${nome} no main.js; a régua precisa ser reapontada`); process.exit(1); }
  return m[1];
};
// FACTION_NAME sai do registro de facções (public/js/factions.js), como no main.js.
const { FACTIONS } = await import('../../public/js/factions.js');
const FACTION_NAME = new Function('FACTIONS', `${pega(/^(const FACTION_NAME = \{[^\n]*\};)$/m, 'FACTION_NAME')}\nreturn FACTION_NAME;`)(FACTIONS);
const identidade = new Function('CHARACTERS', 'charId', 'team', 'online', 'enemyFaction', 'currentEnemyFaction', 'podeNoLado', 'ladosDe', 'resolvePlayerSide',
  `${pega(/\n(  const charDef = CHARACTERS\.find\(c => c\.id === charId\) \|\| \{\};\n[\s\S]*?\n  const enemyFac = [^\n]*\n)/, 'a decisão de lado/facção do _startGame')}
  return { faction, side, enemyFac };`);
const chip = new Function('a', 'b', 'tr', 'FACTION_NAME', 'PALETA', 'currentFaction', 'currentEnemyFaction', 'currentTeam',
  pega(/if \(mapName && currentEnemyFaction\) \{\n([\s\S]*?)\n\s*vs\.classList\.remove/, 'o chip versus da tela de carregamento'));
const cartao = new Function('espectador', 'def', 'corpo', 'tr', 'FACTION_NAME',
  `${pega(/\n(\s*const detalhe = [\s\S]*?;)\n/, 'o subtítulo do cartão de identidade MP')}\nreturn detalhe;`);
const tr = (s) => s;
const PALETA = new Proxy({}, { get: () => ({ base: '#000' }) });

/* ── uma partida, do jeito que o main.js monta ─────────────────────────────────── */
const textures = H.initTextures();
function partida({ def, team, online, inimigoDoServidor = null, ctf = false }) {
  // online: o servidor mandou o lado `team` e o inimigo é a faccao do outro lado ("E"/"B"),
  // ou a letra que um servidor futuro mandar (`inimigoDoServidor`)
  const enemyFaction = online ? (inimigoDoServidor || outro(team)) : undefined;
  const id = identidade(CHARACTERS, def.id, team, online, enemyFaction, null, podeNoLado, ladosDe, resolvePlayerSide);
  H.seedRandom(12345);
  globalThis.__els = {};
  const g = new Game({
    renderer: H.renderer, textures, sfx: H.sfx, settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: def.id, playerTeam: id.side, playerFaction: id.faction, enemyFaction: id.enemyFac,
    nickname: 'SIM', mapId: 'praca_poderes', ctf, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  g.start ? g.start() : g._startRound();
  g._updateHud();
  g._showScoreboard(true);
  const placar = (globalThis.__els['sel:#scoreboard h3'] || {}).innerHTML || '';
  const brasoesPlacar = [...placar.matchAll(/img\/brasoes\/([a-z])\.png/g)].map((m) => m[1]);
  const nomesPlacar = [...placar.matchAll(/<span class="sb-team-name">([^<]*)<\/span>/g)].map((m) => m[1]);
  const a = { textContent: '', style: {} }, b = { textContent: '', style: {} };
  chip(a, b, tr, FACTION_NAME, PALETA, id.faction, id.enemyFac, id.side);
  const corpo = { id: 1, char: def.id, team: id.side };
  const sub = cartao(false, def, corpo, tr, FACTION_NAME);
  const lado = id.side, slot = (s) => (s === 'E' ? 'P' : 'B');
  // CTF online: o estado autoritativo dá a 1ª bandeira ao lado do jogador e a 2ª ao outro
  let panos = null;
  if (ctf) {
    const pedidos = [];
    const orig = g._flagTexFor.bind(g);
    g._flagTexFor = (fac) => { pedidos.push(fac); return orig(fac); };
    const nc = makeNetcode(g, { meta: {}, startPing() {}, stopPing() {}, onSlot: null, onPersonagem: null });
    clearInterval(nc._nsTimer);
    const pts = g.ctfPts.map((_, i) => ({ owner: i === 0 ? lado : i === 1 ? outro(lado) : null, capTeam: null, contested: false, prog: 1 }));
    nc.applyCtfState({ points: pts, capsE: 0, capsB: 0, roundCapsE: 0, roundCapsB: 0 });
    panos = { n: g.ctfPts.length, meu: g.ctfPts[0]?._flagFac, dele: g.ctfPts[1]?._flagFac, pedidos };
  }
  return {
    id, lado,
    nome: [g._teamName(lado), g._teamName(outro(lado))],
    sigla: [g._teamTag(lado), g._teamTag(outro(lado))],
    hud: g.el.roundsRow?.textContent || '',
    crestHud: [g.el['crest' + slot(lado)]?.dataset?.f, g.el['crest' + slot(outro(lado))]?.dataset?.f],
    brasoesPlacar, nomesPlacar,
    chip: [a.textContent, b.textContent], cartao: sub,
    maos: g.playerFaction, panos,
  };
}

/* ── casos ─────────────────────────────────────────────────────────────────────── */
const CATS = ['C', 'F', 'U', 'M', 'P'];
const corpoDe = (cat) => CHARACTERS.find((c) => c.team === cat);
const falhas = {}; const linhas = [];
const marca = (c, ok, d) => { if (!ok) (falhas[c] ||= []).push(d); };

for (const cat of CATS) for (const team of ['E', 'B']) {
  const def = corpoDe(cat);
  const r = partida({ def, team, online: true });
  const L = r.lado, O = outro(L);
  const caso = `MP ${cat}(${def.id}) lado ${team}`;
  marca('ML0', L === team, `${caso}: lado ${L}`);
  marca('ML1', r.nome[0] === NOME[L] && r.nome[1] === NOME[O] && r.nomesPlacar.join('|') === `${NOME.E}|${NOME.B}`,
    `${caso}: nome ${r.nome.join(' × ')} · placar ${r.nomesPlacar.join(' × ')}`);
  marca('ML2', r.sigla[0] === SIGLA[L] && r.sigla[1] === SIGLA[O] && / · E \d+ × \d+ B$/.test(r.hud),
    `${caso}: sigla ${r.sigla.join('/')} · HUD "${r.hud}"`);
  marca('ML3', r.crestHud[0] === L.toLowerCase() && r.crestHud[1] === O.toLowerCase() && r.brasoesPlacar.join('') === 'eb',
    `${caso}: brasão HUD ${r.crestHud.join('/')} · placar ${r.brasoesPlacar.join('/')}`);
  marca('ML4', r.chip[0] === NOME[L] && r.chip[1] === NOME[O], `${caso}: chip ${r.chip.join(' × ')}`);
  marca('ML5', r.cartao === NOME[L], `${caso}: cartão "${r.cartao}"`);
  marca('ML6', r.maos === def.team, `${caso}: viewmodel com ${r.maos} (personagem é ${def.team})`);
  // o servidor mandou uma categoria como facção do adversário: o chip continua dizendo o lado
  const s = partida({ def, team, online: true, inimigoDoServidor: 'F' });
  marca('ML4', s.chip[0] === NOME[L] && s.chip[1] === NOME[O], `${caso}, inimigo 'F' no servidor: chip ${s.chip.join(' × ')}`);
  const c = partida({ def, team, online: true, ctf: true });
  marca('ML7', c.panos && c.panos.n >= 2 && c.panos.meu === L && c.panos.dele === O,
    `${caso} CTF: ${c.panos ? `${c.panos.n} bandeiras, pano meu ${c.panos.meu} dele ${c.panos.dele}` : 'sem bandeiras'}`);
  linhas.push(`${caso.padEnd(34)} nome ${r.nome[0]} · sigla ${r.sigla[0]} · brasão ${r.crestHud[0]} · chip ${r.chip[0]} · cartão ${r.cartao} · mãos ${r.maos}`);
}
for (const cat of [...CATS, 'E', 'B']) for (const team of ['E', 'B']) {
  const def = CHARACTERS.find((c) => c.team === cat && podeNoLado(c, team)) || corpoDe(cat);
  const r = partida({ def, team, online: false });
  const L = podeNoLado(def, team) ? team : ladosDe(def)[0], O = outro(L);
  const caso = `SP ${cat}(${def.id}) aba ${team}`;
  // o SP de antes: facção = lado, inimigo = o outro lado, e tudo que nomeia vem daí
  const ok = r.lado === L && r.id.faction === L && r.id.enemyFac === O && r.maos === L
    && r.nome[0] === NOME[L] && r.nome[1] === NOME[O] && r.sigla[0] === SIGLA[L] && r.sigla[1] === SIGLA[O]
    && r.crestHud[0] === L.toLowerCase() && r.brasoesPlacar.join('') === 'eb'
    && r.chip[0] === NOME[L] && r.chip[1] === NOME[O];
  marca('SP1', ok, `${caso}: lado ${r.lado} facção ${r.id.faction} inimigo ${r.id.enemyFac} mãos ${r.maos} nome ${r.nome.join('/')} sigla ${r.sigla.join('/')} brasão ${r.crestHud[0]} chip ${r.chip.join('/')}`);
}

const TIT = {
  ML0: 'o time do jogador online é o do servidor',
  ML1: 'MP: nome do time (placar/banners) é TIME E/TIME B',
  ML2: 'MP: sigla e linha do HUD são E/B',
  ML3: 'MP: brasão do HUD e do placar é o do time (e/b)',
  ML4: 'MP: chip versus da carga diz TIME E/TIME B',
  ML5: 'MP: cartão SEU PERSONAGEM diz o time',
  ML6: 'MP: viewmodel (luva/braços) segue a categoria visual do personagem',
  ML7: 'MP CTF: pano da bandeira é o do time dono',
  SP1: 'SP: time, rótulo, sigla, brasão e chip seguem E/B',
};
console.log(`\n${linhas.join('\n')}\n`);
for (const [c, t] of Object.entries(TIT)) {
  const f = falhas[c];
  console.log(`${c} · ${t}\n   ${f ? `FALHA (${f.length})\n   ${f.slice(0, 4).join('\n   ')}` : 'PASSA'}`);
}
if (MUT) console.log(`\nmutante aplicado: --mutante=${MUT}`);
const n = Object.keys(TIT).length, ruins = Object.keys(falhas);
console.log(ruins.length === 0 ? `\nPASSA (mp-rotulo-lado-check) — ${n}/${n} cláusulas` : `\nREPROVA (mp-rotulo-lado-check) — ${ruins.join(', ')}`);
process.exit(ruins.length === 0 ? 0 : 1);
