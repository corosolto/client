#!/usr/bin/env node
/* match-skin-snapshot-check.mjs · O FIM DA PARTIDA ENVIA O PERSONAGEM E A SKIN QUE FORAM JOGADOS?
   O perfil mostra o retrato da skin (last_skin, backend 097) a partir do submit-match do fim da partida.
   Revisão do PR #1393: recordMatchStats relia game.playerDef.skinId na hora do envio; se o estado mudou
   entre o fim da partida e o envio (lobby, próxima partida, MP), gravava a skin errada.

     MS1 · game.js: o retrato do onMatchEnd leva character E skin do playerDef
     MS2 · main.js: recordMatchStats manda character e skin do retrato `s`, mesmo com game.playerDef trocado depois
     MS3 · partialPayload (abandono): character e skin vêm do jogo no momento da captura

   Uso: node tools/eval/match-skin-snapshot-check.mjs [--mutante=skin-do-jogo|personagem-do-jogo|sem-skin-no-fim|partial-sem-skin]
   Saída com mutante: 1 = morto (alguma cláusula reprovou), 2 = não aplicou/desconhecido, 3 = SOBREVIVEU.
   O CI aceita só 1; um sobrevivente nunca sai com o mesmo status de um morto. */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const MUT = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1] || '';
let main = readFileSync('public/js/main.js', 'utf8'), game = readFileSync('public/js/game.js', 'utf8');
const muta = (texto, de, para) => { if (!texto.includes(de)) { console.error(`✗ MUTANTE NÃO APLICOU: ${MUT}`); process.exit(2); } return texto.replace(de, para); };
if (MUT === 'skin-do-jogo') main = muta(main, 'character: s.character, skin: s.skin || null,', 'character: s.character, skin: game?.playerDef?.skinId || null,');
else if (MUT === 'personagem-do-jogo') main = muta(main, 'character: s.character, skin: s.skin || null,', 'character: game?.playerDef?.id, skin: s.skin || null,');
else if (MUT === 'sem-skin-no-fim') game = muta(game, 'character: this.playerDef.id, skin: this.playerDef.skinId || null,', 'character: this.playerDef.id,');
else if (MUT === 'partial-sem-skin') main = muta(main, 'seconds: Math.round(g.time), character: g.playerDef?.id || g.playerCharId || currentChar, skin: g.playerDef?.skinId || null,', 'seconds: Math.round(g.time), character: g.playerDef?.id || g.playerCharId || currentChar, skin: null,');
else if (MUT) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const corpo = (fonte, inicio) => {
  const i = fonte.indexOf(inicio);
  if (i < 0) throw new Error(`não achei ${inicio}`);
  return fonte.slice(i, fonte.indexOf('\n}\n', i) + 2);
};
const falhas = [];
const cobra = (id, ok, msg) => { if (!ok) falhas.push(`${id} ${msg}`); };

/* MS1: o retrato do fim da partida, avaliado com um playerDef de skin */
const fim = game.slice(game.indexOf('this.onMatchEnd?.({'), game.indexOf('});', game.indexOf('this.onMatchEnd?.({')) + 3);
let retrato = null;
vm.runInNewContext(`(function(){ ${fim.replace('this.onMatchEnd?.(', 'capturar(')} }).call(eu)`, {
  capturar: (s) => { retrato = s; }, mine: true, playerSide: 'E',
  eu: { _modeId: () => 'rounds', playerDef: { id: 'senador', skinId: 'zero-um-mandrake' }, player: { kills: 9, deaths: 2, headshots: 1 }, mk: { best: 3 }, roundsWon: { E: 3, B: 1 }, time: 300 },
});
cobra('MS1', retrato?.character === 'senador' && retrato?.skin === 'zero-um-mandrake', `retrato do fim da partida: character ${retrato?.character}, skin ${retrato?.skin} (quer senador / zero-um-mandrake)`);

/* MS2: recordMatchStats com o jogo já em outro personagem/skin no momento do envio */
const enviados = [];
const jogo = { playerDef: { id: 'senador', skinId: 'zero-um-mandrake' }, _mapId: 'escadao' };
const ctx = vm.createContext({
  document: { dispatchEvent() {} }, CustomEvent: class { constructor(t, d) { this.type = t; this.detail = d?.detail; } },
  mpSessao: null, submitted: false, sendTelemetry() {}, sendMatchEvent() {}, _funnel() {}, _tipoDaPartida: () => 'singleplayer',
  contagem: { partidaTerminada() {} }, game: jogo, currentMap: 'escadao', activeModeId: () => 'rounds', telemetryGameContext: { gameType: 'single_player' },
  loadStats: () => ({ matches: 0, wins: 0, kills: 0, deaths: 0, headshots: 0, bestStreak: 0 }), playerXp: () => 0, showLevelUp() {},
  localStorage: { setItem() {} }, STATS_KEY: 'k', registeredNick: 'ZeDoAWP', nickEl: { value: '' }, testMode: false,
  getAnonId: () => 'anon', getToken: () => 'tok', currentFaction: 'E', modoEfetivoAtual: () => 'rounds',
  submitGlobal: async (pl) => { enviados.push(pl); return { ok: true }; }, submitNote() {}, traduErroSubmit: (e) => e, renderPlayerPlate() {},
});
vm.runInContext(`${corpo(main, 'async function recordMatchStats(s) {')}\nthis.recordMatchStats = recordMatchStats;`, ctx);
const s = retrato || { won: true, team: 'E', mode: 'rounds', character: 'senador', skin: 'zero-um-mandrake', kills: 9, deaths: 2, headshots: 1, bestStreak: 3, roundsP: 3, roundsB: 1, seconds: 300 };
jogo.playerDef = { id: 'mandrake', skinId: 'mandrake-cyborg' };   // o lobby/MP trocou entre o fim da partida e o envio
await ctx.recordMatchStats(s);
const pl = enviados[0];
cobra('MS2', pl?.character === 'senador' && pl?.skin === 'zero-um-mandrake',
  `submit-match com o jogo já trocado: character ${pl?.character}, skin ${pl?.skin} (quer o retrato: senador / zero-um-mandrake)`);
const semSkin = { ...s, skin: undefined };
await ctx.recordMatchStats(semSkin);
cobra('MS2', enviados[1]?.skin === null, `partida sem skin manda skin ${enviados[1]?.skin} (quer null, nunca a skin do jogo atual)`);

/* MS3: partialPayload captura do jogo no momento do abandono */
const parcial = corpo(main, 'function partialPayload() {');
cobra('MS3', /character: g\.playerDef\?\.id \|\| g\.playerCharId \|\| currentChar, skin: g\.playerDef\?\.skinId \|\| null/.test(parcial),
  'partialPayload não captura character/skin do jogo em andamento');

if (falhas.length) { console.error(`✗ envio do personagem/skin:\n  ${falhas.join('\n  ')}`); process.exit(1); }
console.log(`✓ fim da partida manda o personagem e a skin capturados (MS1–MS3)${MUT ? ` — mutante ${MUT} NÃO morreu` : ''}`);
process.exit(MUT ? 3 : 0);
