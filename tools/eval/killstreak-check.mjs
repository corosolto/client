#!/usr/bin/env node
/* Contador de sequência de abates: DOM legível + estado causal em SP e MP.
   A sequência é da vida atual, nasce somente de abate confirmado, zera em morte/round e
   não é reconstruída a partir do total de kills ao reconectar. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['total', 'previsto', 'sem-round', 'sem-morte', 'sem-mp', 'reconnect'];
if (MUT && !MUTANTES.includes(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const falhas = [];
const cobra = (cond, msg) => { if (!cond) falhas.push(msg); };
const astro = readFileSync(path.join(ROOT, 'src/pages/index.astro'), 'utf8');
const css = readFileSync(path.join(ROOT, 'public/style.css'), 'utf8');
const hud = astro.slice(astro.indexOf('<div id="hud"'), astro.indexOf('<!-- Pause'));

/* KS1/KS2: existe no HUD servido, anuncia mudança e continua legível sem copiar asset. */
cobra(/id="kill-streak"/.test(hud), 'KS1 #kill-streak não existe dentro do HUD');
cobra(/id="kill-streak-count"/.test(hud), 'KS1 falta o algarismo #kill-streak-count');
cobra(/SEQUÊNCIA/.test(hud), 'KS1 falta o rótulo SEQUÊNCIA');
cobra(/id="kill-streak"[^>]*(?:role="status"[^>]*aria-live="polite"|aria-live="polite"[^>]*role="status")/.test(hud),
  'KS1 contador não anuncia a mudança de forma acessível');
const regra = css.match(/#kill-streak-count\s*\{([^}]*)\}/)?.[1] || '';
const px = Number((regra.match(/font-size:\s*([\d.]+)px/) || [])[1] || 0);
cobra(px >= 24, `KS2 algarismo tem ${px}px; piso de leitura é 24px`);
cobra(/#kill-streak\s*\{[^}]*position:\s*absolute/.test(css), 'KS2 contador não tem âncora própria no HUD');

const h = await import('./harness.mjs');
const { makeNetcode } = await import('../../public/js/netgame.js');
const textures = h.initTextures(h.renderer);
const visivel = (g) => !!g.el.killStreak && !g.el.killStreak.classList.contains('hidden');
const lido = (g) => String(g.el.killStreakCount?.textContent ?? '<ausente>');

function planta(g) {
  if (MUT === 'total') {
    const orig = g._updateKillSequenceHud?.bind(g);
    g._updateKillSequenceHud = (...args) => {
      orig?.(...args);
      if (g.el.killStreakCount) g.el.killStreakCount.textContent = String(g.player.kills | 0);
      g.el.killStreak?.classList.remove('hidden');
    };
  }
  if (MUT === 'previsto') {
    const orig = g._acertoPrevisto.bind(g);
    g._acertoPrevisto = (...args) => { const r = orig(...args); g._playerKillFeedback?.(g.player, !!args[2]); return r; };
  }
  return g;
}

/* KS3/KS4: single-player conta só abates do jogador e reseta nos dois limites reais. */
const sp = planta(h.bootGame('praca_poderes', { textures, seed: 909, bots: 4 }));
sp.state = 'live'; sp._updateHud();
cobra(!visivel(sp) && lido(sp) === '0', `KS3 sequência deveria iniciar oculta em 0; leu ${lido(sp)}`);
const inimigos = sp.bots.filter((b) => b.team !== sp.playerTeam);
const aliado = sp.bots.find((b) => b.team === sp.playerTeam);
for (const alvo of inimigos.slice(0, 2)) { alvo.hp = 1; sp._kill(alvo, sp.player, 'AK', false); sp._updateHud(); }
cobra(sp.mk.life === 2 && lido(sp) === '2' && visivel(sp),
  `KS3 dois abates confirmados em SP deveriam formar sequência 2; estado=${sp.mk.life}, HUD=${lido(sp)}`);
if (aliado && inimigos[2]) { inimigos[2].hp = 1; sp._kill(inimigos[2], aliado, 'AK', false); sp._updateHud(); }
cobra(sp.mk.life === 2 && lido(sp) === '2', 'KS3 abate de aliado alterou a sequência do jogador');

if (MUT === 'sem-morte') sp._resetKillSequence = () => {};
const assassino = sp.bots.find((b) => b.team !== sp.playerTeam && b.alive) || inimigos[0];
sp.player.hp = 1; sp._kill(sp.player, assassino, 'AK', false); sp._updateHud();
cobra(sp.mk.life === 0 && !visivel(sp), `KS4 morte não zerou/escondeu a sequência (estado=${sp.mk.life})`);
sp.dispose();

const rodada = planta(h.bootGame('praca_poderes', { textures, seed: 910, bots: 4 }));
rodada.state = 'live'; const alvoRound = rodada.bots.find((b) => b.team !== rodada.playerTeam);
alvoRound.hp = 1; rodada._kill(alvoRound, rodada.player, 'AK', false); rodada._updateHud();
if (MUT === 'sem-round') rodada._resetKillSequence = () => {};
rodada._startRound(); rodada._updateHud();
cobra(rodada.mk.life === 0 && !visivel(rodada), `KS4 round novo não zerou/escondeu a sequência (estado=${rodada.mk.life})`);
rodada.dispose();

/* KS5/KS6: no MP o evento do servidor é a origem; snapshot inicial é só estado herdado. */
function fakeNet() {
  return {
    yourEnt: 1, yourTeam: 'E', espectador: false,
    meta: { room: 'ks', map: 'praca_poderes', teamSize: 4, maxPlayers: 8, snapshotHz: 20, protocolVersion: 4, events: 1 },
    snap: null, prev: null, events: [], seq: 0,
    startPing() {}, stopPing() {}, computeStats() { return { hz: 20, kbps: 1, gapMax: 50, sinceLast: 5, ents: 8, tick: 1, ping: 20 }; },
    sendInput() { return ++this.seq; }, pedirTime() {}, espectar() {},
  };
}
function snap(tick, { kills = 7, vitimaViva = true, jogadorVivo = true, state = 'live' } = {}) {
  return {
    type: 'snapshot', room: 'ks', tick, t: 100 + tick / 20, state, owner: null,
    players: 1, spectators: 0, livre: { E: 3, B: 4 }, timeLeft: 70, roundNum: state === 'countdown' ? 2 : 1, scoreE: 0, scoreB: 0,
    ents: Array.from({ length: 8 }, (_, i) => {
      const id = i + 1, meu = id === 1, vitima = id === 5;
      return { id, name: meu ? 'EU' : `BOT${id}`, team: id <= 4 ? 'E' : 'B', bot: meu ? 0 : 1,
        x: i * 2, y: 0, z: 10 + i, yaw: 0, pitch: 0, hp: meu ? (jogadorVivo ? 100 : 0) : (vitima && !vitimaViva ? 0 : 100),
        alive: meu ? jogadorVivo : !(vitima && !vitimaViva), weapon: 'ak', fire: 0, voice: 0,
        k: meu ? kills : 0, d: meu && !jogadorVivo ? 1 : 0, respawnIn: jogadorVivo ? 0 : 2.2,
        ...(meu && !jogadorVivo ? { killedBy: 'BOT6' } : {}), ...(vitima && !vitimaViva ? { killedBy: 'EU' } : {}) };
    }),
  };
}
function jogoOnline() {
  const net = fakeNet();
  h.seedRandom(911);
  const g = new h.Game({ renderer: h.renderer, textures, sfx: h.sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: h.PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'EU',
    mapId: 'praca_poderes', testMode: true, onQuit() {}, onMatchEnd() {}, mpFactory: makeNetcode, net });
  g._ensureDolly = () => {}; g.start(); g.scene.updateMatrixWorld(true); g.world.root.updateMatrixWorld(true);
  return { g: planta(g), net };
}

const { g: mp, net } = jogoOnline();
net.snap = snap(1, { kills: 7 }); mp._mp.applySnapshot(); mp._updateHud();
if (MUT === 'reconnect') mp._playerKillFeedback?.(mp.player, false);
cobra(mp.player.kills === 7 && mp.mk.life === 0 && !visivel(mp),
  `KS5 reconexão inventou sequência a partir do total autoritativo (kills=${mp.player.kills}, sequência=${mp.mk.life})`);

mp._acertoPrevisto(mp.bots[0], 100, true, mp.bots[0].pos); mp._updateHud();
cobra(mp.mk.life === 0, `KS5 acerto previsto contou antes da confirmação do servidor (sequência=${mp.mk.life})`);
if (MUT === 'sem-mp') mp._mp.morteRemota = () => {};
net.events.push({ tick: 2, t: 100.1, list: [{ k: 'kill', a: 1, v: 5, w: 'ak', h: 1, d: 100 }] });
net.snap = snap(2, { kills: 8, vitimaViva: false }); mp._mp.applySnapshot(); mp._updateHud();
cobra(mp.player.kills === 8 && mp.mk.life === 1 && lido(mp) === '1' && visivel(mp),
  `KS6 abate autoritativo MP deveria formar sequência 1 sem duplicar (kills=${mp.player.kills}, estado=${mp.mk.life}, HUD=${lido(mp)})`);

net.snap = snap(3, { kills: 8, vitimaViva: false, jogadorVivo: false }); mp._mp.applySnapshot(); mp._updateHud();
cobra(mp.mk.life === 0 && !visivel(mp), `KS6 morte autoritativa não zerou a sequência (estado=${mp.mk.life})`);
net.snap = snap(4, { kills: 8, vitimaViva: false, jogadorVivo: true, state: 'countdown' }); mp._mp.applySnapshot(); mp._updateHud();
cobra(mp.mk.life === 0 && !visivel(mp), 'KS6 round autoritativo novo reabriu uma sequência antiga');
mp.dispose();

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log('  \x1b[32m✓\x1b[0m KS sequência legível e causal em SP/MP; morte, round e reconexão zeram sem inventar abates');
if (MUT && !falhas.length) { console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' ficou verde — régua cega`); falhas.push('mutacao-cega'); }
process.exit(falhas.length ? 1 : 0);
