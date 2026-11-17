/* MP-COR-LADO-CHECK — no multiplayer a cor do time é a do LADO, não a da categoria do corpo.
   ═══════════════════════════════════════════════════════════════════════════════════
   O DEFEITO

   Online, `playerFaction` é a categoria do personagem (C/F/U/M/P): ela escolhe as mãos da
   viewmodel, que seguem o personagem. `_teamColor`/`_teamInk` liam essa letra via
   `_factionOf`, e a PALETA pintava o próprio time de rosa (C), azul quase igual ao da
   DIREITA (U), roxo (M), ouro (F) ou cinza neutro (P). Dois colegas de time com corpos
   diferentes viam o próprio time de cores diferentes, e um funkeiro via o aliado no radar
   em ouro #ffc233 ao lado do inimigo revelado em âmbar #ffb44d.

   A REGRA: a cor do time sai do LADO (ESQUERDA vermelho, DIREITA azul, as do placar). Voz e
   som de captura continuam pelo corpo (decisão tomada; não são medidos aqui).

   COMO ELA MEDE (Node puro): o pedaço real do `_startGame` (main.js) decide lado e facção, o
   Game real sobe com esses valores, e os pontos que pintam com a cor do time são lidos onde
   o jogo os escreve:
     kill feed      `_feed` -> fundo do chip e tinta do nome (aliado e inimigo)
     placar do HUD  `_updateHud` -> cor dos números E/B
     radar          `_updateRadar` -> cor do blip aliado (contexto 2D gravador)
     contorno       `_makeTeamMark` -> cor do halo do bot aliado
     anel do CTF    `Netcode.applyCtfState` -> cor do anel da bandeira do jogador

   CLÁUSULAS (MP: corpo C, F, U, M e P em cada lado)
     MC1  todos os pontos pintam o time do jogador com a cor do LADO (e o inimigo com a do outro)
     MC2  dois colegas no mesmo lado com corpos diferentes veem as MESMAS cores em todos os pontos
     MC3  contraste: aliado × inimigo distantes (RGB >= 200), blip aliado × âmbar do inimigo
          revelado em matiz (>= 25°; o ouro dos funkeiros fica a 5°), e a tinta do kill feed
          é a `palida` do lado, a que a UI1 (ui-check.mjs) mede a 5,9-9,1:1; com espelho
          forçado o inimigo vira ESPELHO
     SP1  no SP as cores de todos os pontos são as de antes (facção = lado)

   MUTANTES (cópia irmã temporária do game.js; o arquivo não é tocado)
     --mutante=cor-categoria   `_teamColor`/`_teamInk` voltam a `_factionOf(side)` -> MC1, MC2, MC3 vermelhas
     --mutante=sem-contraste   os dois lados pintam com a cor da ESQUERDA           -> MC1, MC3, SP1 vermelhas
   SP1 só cai no sem-contraste, que muda o SP de propósito.

   uso: node tools/eval/mp-cor-lado-check.mjs [--mutante=<nome>]
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as H from './harness.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && !['cor-categoria', 'sem-contraste'].includes(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const imp = (f) => import(pathToFileURL(path.join(RAIZ, 'public/js', f)).href);
const { CHARACTERS } = H;
const { ladosDe, podeNoLado } = await imp('characters.js');
const { resolvePlayerSide } = await imp('net.js');
const { makeNetcode } = await imp('netgame.js');
const { PALETA, ESPELHO } = await imp('paleta.js');
const { ehMapaJavaporcos } = await imp('maps.js');
const outro = (s) => (s === 'E' ? 'B' : 'E');
const AMBAR = '#ffb44d';   // inimigo revelado no radar (game.js _updateRadar)

/* ── game.js com o mutante, numa cópia irmã ───────────────────────────────────── */
const gameOrig = fs.readFileSync(path.join(RAIZ, 'public/js/game.js'), 'utf8');
let gameSrc = gameOrig;
const troca = (de, para) => {
  if (!gameSrc.includes(de)) { console.error(`mutante ${MUT}: trecho não encontrado no game.js:\n  ${de}`); process.exit(2); }
  gameSrc = gameSrc.split(de).join(para);
};
if (MUT === 'cor-categoria') {
  troca('return factionColor(side, dark);', 'return factionColor(this._factionOf(side), dark);');
  troca('return factionInk(side);', 'return factionInk(this._factionOf(side));');
}
if (MUT === 'sem-contraste') {
  troca('return factionColor(side, dark);', "return factionColor('E', dark);");
  troca('return factionInk(side);', "return factionInk('E');");
}
let Game = H.Game;
if (gameSrc !== gameOrig) {
  const c = path.join(RAIZ, 'public/js', `.mut-cor-${process.pid}.js`);
  fs.writeFileSync(c, gameSrc);
  try { ({ Game } = await import(pathToFileURL(c).href)); } finally { fs.rmSync(c, { force: true }); }
}

/* ── o pedaço real do _startGame que decide lado e facção ─────────────────────── */
const mainSrc = fs.readFileSync(path.join(RAIZ, 'public/js/main.js'), 'utf8');
const m = /\n(  const charDef = CHARACTERS\.find\(c => c\.id === charId\) \|\| \{\};\n[\s\S]*?\n  const enemyFac = [^\n]*\n)/.exec(mainSrc);
if (!m) { console.error('REPROVA (mp-cor-lado-check) — não achei a decisão de lado/facção do _startGame no main.js'); process.exit(1); }
const identidade = new Function('CHARACTERS', 'charId', 'team', 'online', 'enemyFaction', 'currentEnemyFaction', 'podeNoLado', 'ladosDe', 'resolvePlayerSide', 'ehMapaJavaporcos', 'currentMap',
  `${m[1]}\n  return { faction, side, enemyFac };`);

/* ── cores RGB ────────────────────────────────────────────────────────────────── */
const rgb = (h) => { const s = String(h).replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const dist = (a, b) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
const hex = (c) => `#${c.getHexString()}`;
const matiz = (h) => {
  const [r, g, b] = rgb(h).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  const x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (x * 60 + 360) % 360;
};
const difMatiz = (a, b) => { const d = Math.abs(matiz(a) - matiz(b)); return Math.min(d, 360 - d); };

/* ── uma partida, medindo cada ponto que pinta com a cor do time ─────────────── */
const textures = H.initTextures();
function partida({ def, team, online, espelho = false }) {
  const id = identidade(CHARACTERS, def.id, team, online, online ? outro(team) : undefined, null, podeNoLado, ladosDe, resolvePlayerSide, ehMapaJavaporcos, 'praca_poderes');
  H.seedRandom(12345);
  globalThis.__els = {};
  const g = new Game({
    renderer: H.renderer, textures, sfx: H.sfx, settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: def.id, playerTeam: id.side, playerFaction: id.faction,
    enemyFaction: espelho ? id.faction : id.enemyFac,
    nickname: 'SIM', mapId: 'praca_poderes', ctf: true, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  g.start ? g.start() : g._startRound();
  const L = id.side, O = outro(L);
  // kill feed: o jogador abate um inimigo
  const linhas = [];
  g.el.killfeed = { prepend: (r) => linhas.push(r), children: { length: 0 }, lastChild: null };
  const inimigo = g.combatants.find((c) => c.team === O);
  g._feed(g.player, inimigo, 'ak', false);
  const spans = [...(linhas[0]?.innerHTML || '').matchAll(/background:(#[0-9a-f]{6})2e;color:(#[0-9a-f]{6})/gi)].map((x) => ({ chip: x[1].toLowerCase(), tinta: x[2].toLowerCase() }));
  // placar do HUD
  g._updateHud();
  const placar = { E: String(g.el.scoreP?.style?.color || ''), B: String(g.el.scoreB?.style?.color || '') };
  // radar: um contexto 2D que grava a cor de cada blip (fillRect 4×4)
  const blips = [];
  let fill = null;
  g.radarCtx = new Proxy({}, {
    get: (t, k) => {
      if (k === 'fillStyle') return fill;
      if (k === 'fillRect') return (x, y, w, h) => { if (w === 4 && h === 4) blips.push(String(fill).toLowerCase()); };
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (k === 'measureText') return () => ({ width: 10 });
      return () => {};
    },
    set: (t, k, v) => { if (k === 'fillStyle') fill = v; return true; },
  });
  for (const c of g.combatants) c.alive = true;
  g._updateRadar();
  const aliados = g.combatants.filter((c) => !c.isPlayer && c.team === L).length;
  const blipAliado = blips[0] || null;
  // contorno do bot aliado
  const malhas = [];
  const add = g.scene.add.bind(g.scene);
  g.scene.add = (...o) => { malhas.push(...o); return add(...o); };
  const botAliado = g.bots.find((b) => b.team === L);
  if (botAliado) g._makeTeamMark(botAliado);
  g.scene.add = add;
  const halo = malhas[0]?.material?.color ? hex(malhas[0].material.color) : null;
  // anel do CTF pelo estado do servidor: 1ª bandeira do jogador, 2ª do outro lado
  const nc = makeNetcode(g, { meta: {}, startPing() {}, stopPing() {}, onSlot: null, onPersonagem: null });
  clearInterval(nc._nsTimer);
  nc.applyCtfState({ points: g.ctfPts.map((_, i) => ({ owner: i === 0 ? L : i === 1 ? O : null, capTeam: null, contested: false, prog: 1 })), capsE: 0, capsB: 0, roundCapsE: 0, roundCapsB: 0 });
  const anel = [g.ctfPts[0]?.ring?.material?.color, g.ctfPts[1]?.ring?.material?.color].map((c) => (c ? hex(c) : null));
  return {
    id, L, O,
    cor: { meu: g._teamColor(L).toLowerCase(), dele: g._teamColor(O).toLowerCase() },
    tinta: { meu: g._teamInk(L).toLowerCase(), dele: g._teamInk(O).toLowerCase() },
    feed: spans, placar, blipAliado, aliados, halo, anel,
  };
}
const assinatura = (r) => JSON.stringify([r.cor, r.tinta, r.feed, r.placar, r.blipAliado, r.halo, r.anel]);

/* ── casos ─────────────────────────────────────────────────────────────────────── */
const falhas = {}; const linhas = [];
const marca = (c, ok, d) => { if (!ok) (falhas[c] ||= []).push(d); };
const COR = (s) => PALETA[s].base.toLowerCase(), PAL = (s) => PALETA[s].palida.toLowerCase();
// o anel é a cor do lado misturada ao cinza do CTF: a referência é o anel do SP no mesmo lado
const anelRef = {};
for (const s of ['E', 'B']) {
  const d = CHARACTERS.find((c) => c.team === s);
  anelRef[s] = partida({ def: d, team: s, online: false }).anel[0];
}

const CATS = ['C', 'F', 'U', 'M', 'P'];
for (const team of ['E', 'B']) {
  const porLado = [];
  for (const cat of CATS) {
    const def = CHARACTERS.find((c) => c.team === cat);
    const r = partida({ def, team, online: true });
    porLado.push({ cat, def, r });
    const { L, O } = r;
    const caso = `MP ${cat}(${def.id}) lado ${team}`;
    const ok1 = L === team && r.cor.meu === COR(L) && r.cor.dele === COR(O)
      && r.tinta.meu === PAL(L) && r.tinta.dele === PAL(O)
      && r.feed.length === 2 && r.feed[0].chip === COR(L) && r.feed[0].tinta === PAL(L) && r.feed[1].chip === COR(O)
      && r.placar[L].toLowerCase() === COR(L) && r.placar[O].toLowerCase() === COR(O)
      && (r.aliados === 0 || r.blipAliado === COR(L))
      && r.halo === COR(L) && r.anel[0] === anelRef[L] && r.anel[1] === anelRef[O];
    marca('MC1', ok1, `${caso}: time ${r.cor.meu} tinta ${r.tinta.meu} · feed ${r.feed.map((f) => `${f.chip}/${f.tinta}`).join(' ')} · placar E ${r.placar.E} B ${r.placar.B} · radar ${r.blipAliado} · halo ${r.halo} · anel ${r.anel.join('/')}`);
    const ok3 = dist(r.cor.meu, r.cor.dele) >= 200 && (!r.blipAliado || difMatiz(r.blipAliado, AMBAR) >= 25) && r.tinta.meu === PAL(L);
    marca('MC3', ok3, `${caso}: aliado ${r.cor.meu} × inimigo ${r.cor.dele} = ${dist(r.cor.meu, r.cor.dele).toFixed(0)} · blip ${r.blipAliado} × âmbar = ${r.blipAliado ? difMatiz(r.blipAliado, AMBAR).toFixed(0) + '°' : '-'} · tinta ${r.tinta.meu}`);
    linhas.push(`${caso.padEnd(28)} time ${r.cor.meu} · tinta ${r.tinta.meu} · radar ${r.blipAliado} · halo ${r.halo} · placar E ${r.placar.E} B ${r.placar.B} · anel ${r.anel[0]}`);
  }
  // MC2: colegas no mesmo lado, corpos diferentes, veem o mesmo
  const base = porLado[0];
  for (const o of porLado.slice(1)) {
    marca('MC2', assinatura(o.r) === assinatura(base.r),
      `lado ${team}: ${base.cat}(${base.def.id}) vê ${base.r.cor.meu}/${base.r.blipAliado}/${base.r.halo}, ${o.cat}(${o.def.id}) vê ${o.r.cor.meu}/${o.r.blipAliado}/${o.r.halo}`);
  }
}
// espelho forçado (facção do inimigo = a do jogador): o inimigo fica ESPELHO e o contraste fica
{
  const def = CHARACTERS.find((c) => c.team === 'C');
  const r = partida({ def, team: 'E', online: true, espelho: true });
  marca('MC3', r.cor.dele === ESPELHO.base.toLowerCase() && dist(r.cor.meu, r.cor.dele) >= 120,
    `espelho C×C: aliado ${r.cor.meu} × inimigo ${r.cor.dele} = ${dist(r.cor.meu, r.cor.dele).toFixed(0)}`);
}
// SP: facção = lado; as cores são as do lado, como sempre foram
for (const cat of [...CATS, 'E', 'B']) for (const team of ['E', 'B']) {
  const def = CHARACTERS.find((c) => c.team === cat && podeNoLado(c, team)) || CHARACTERS.find((c) => c.team === cat);
  const r = partida({ def, team, online: false });
  const { L, O } = r;
  const ok = r.id.faction === L && r.cor.meu === COR(L) && r.cor.dele === COR(O) && r.tinta.meu === PAL(L)
    && r.feed[0]?.chip === COR(L) && r.placar[L].toLowerCase() === COR(L) && r.halo === COR(L);
  marca('SP1', ok, `SP ${cat}(${def.id}) aba ${team}: time ${r.cor.meu} inimigo ${r.cor.dele} tinta ${r.tinta.meu} halo ${r.halo}`);
}

const TIT = {
  MC1: 'MP: kill feed, placar, radar, contorno e anel do CTF pintam o time com a cor do lado',
  MC2: 'MP: colegas com corpos diferentes veem as mesmas cores do time',
  MC3: 'MP: contraste aliado × inimigo, blip aliado × âmbar, tinta do kill feed é a pálida medida na UI1',
  SP1: 'SP: cores iguais às de antes',
};
console.log(`\n${linhas.join('\n')}\n`);
for (const [c, t] of Object.entries(TIT)) {
  const f = falhas[c];
  console.log(`${c} · ${t}\n   ${f ? `FALHA (${f.length})\n   ${f.slice(0, 4).join('\n   ')}` : 'PASSA'}`);
}
if (MUT) console.log(`\nmutante aplicado: --mutante=${MUT}`);
const n = Object.keys(TIT).length, ruins = Object.keys(falhas);
console.log(ruins.length === 0 ? `\nPASSA (mp-cor-lado-check) — ${n}/${n} cláusulas` : `\nREPROVA (mp-cor-lado-check) — ${ruins.join(', ')}`);
process.exit(ruins.length === 0 ? 0 : 1);
