#!/usr/bin/env node
/* ============================================================================
   bot-sentidos-check.mjs — O BOT ENXERGA PRA FRENTE E OUVE O JOGADOR
   ----------------------------------------------------------------------------
   O DEFEITO (medido no código, 13/10/2026): a aquisição de alvo do bot era só
   alcance + linha de visão — visão de 360°. Chegar por trás de um bot não valia
   nada. E o bot não OUVIA o jogador: `alertUntil` só nascia de levar tiro, de colega
   atirando a <30 m ou de callout. Atirar a 10 m das costas de um bot não mudava nada.

   O QUE ESTA RÉGUA MEDE (Game de verdade, sem navegador, semente fixa, praca_poderes):
   SB1 COSTAS: bot de costas para o jogador a ~15 m, com linha de visão livre e sem
       alerta, NÃO adquire o jogador no think.
   SB2 FRENTE: o mesmo bot, virado para o jogador, adquire no mesmo think. (Prova que
       SB1 não passa por cegueira geral — é o cone.)
   SB3 TIRO OUVIDO: o jogador atira pelo caminho real (`_tryShoot`) e o bot de costas
       fica alerta, volta a olhar em volta e adquire o jogador no think seguinte.
   SB4 RAIO: um bot a mais de BOT_OUVE_TIRO (40 m) não é alertado pelo mesmo tiro.
   SB5 PERIFERIA: encostado (<4 m) o bot percebe o jogador mesmo de costas.

   Mutantes:
     360    — devolve a visão de 360° (prova SB1)
     surdo  — o tiro do jogador não faz barulho para a IA (prova SB3)
   Uso: node tools/eval/bot-sentidos-check.mjs [--mutante=<nome>]
   ============================================================================ */
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['360', 'surdo'];
if (MUT && !MUTANTES.includes(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const h = await import('./harness.mjs');
const { THREE } = h;
const DT = 1 / 60;
const falhas = [];
const textures = h.initTextures(h.renderer);

h.seedRandom(1310);
const g = new h.Game({
  renderer: h.renderer, textures, sfx: h.sfx,
  settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1, wpnMode: 'all' },
  playerCharId: h.PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
  nickname: 'SIM', mapId: 'praca_poderes', testMode: true, onQuit() {}, onMatchEnd() {},
});
g._ensureDolly = () => {};
g.killsToWin = Infinity;
g._startRound();
g.scene.updateMatrixWorld(true);
g.world.root.updateMatrixWorld(true);
g.state = 'live';
if (MUT === '360') g.__mutBot360 = true;
if (MUT === 'surdo') g._botOuve = () => {};

const p = g.player;
const inimigos = g.bots.filter((b) => b.team !== p.team);
const [b, longe] = inimigos;
// Só os dois bots medidos ficam vivos: qualquer outro combatente vira alvo e polui o think.
for (const o of g.bots) if (o !== b && o !== longe) o.alive = false;
for (const o of g.bots) if (o.team === p.team) o.alive = false;
g.camera.position.set(p.pos.x, p.pos.y + 1.62, p.pos.z);

/* Acha uma posição a `dist` m do jogador com linha de visão livre (testa 24 direções). */
function posLivre(dist) {
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const pos = new THREE.Vector3(p.pos.x + Math.sin(a) * dist, p.pos.y, p.pos.z + Math.cos(a) * dist);
    const salvo = b.pos.clone(); b.pos.copy(pos);
    const ok = g._losClear(g._botEye(b), g.camera.position.clone());
    b.pos.copy(salvo);
    if (ok) return pos;
  }
  return null;
}
const yawPara = (de, para) => Math.atan2(para.x - de.x, para.z - de.z);
function prepara(bot, pos, deCostas) {
  bot.pos.copy(pos);
  bot.yaw = yawPara(pos, p.pos) + (deCostas ? Math.PI : 0);
  bot.target = null; bot.alertUntil = 0; bot._heardAt = 0; bot.think = 0;
  bot.reactAt = 1e9; bot.focusUntil = 1e9;   // não atira durante a medida
}
const pensa = (bot) => { bot.think = 0; g._updateBot(bot, DT); return bot.target === p; };

const P15 = posLivre(15), P3 = posLivre(3), P55 = posLivre(55) || posLivre(48);
if (!P15 || !P3) {
  console.log('  \x1b[31m✗\x1b[0m SB0 não achei posição com linha de visão livre na praca_poderes — a régua perdeu o alvo');
  process.exit(1);
}

prepara(b, P15, true);
const sb1 = !pensa(b);
prepara(b, P15, false);
const sb2 = pensa(b);

prepara(b, P15, true);
if (P55) { prepara(longe, P55, true); longe.alive = true; } else longe.alive = false;
p.weapon = p.weapon === 'knife' ? Object.keys(p.ammo).find((w) => w !== 'knife') : p.weapon;
p.ammo[p.weapon].mag = Math.max(5, p.ammo[p.weapon].mag);
p.nextShotAt = 0; p.reloading = false; p.reloadUntil = 0;
let tiroOk = true;
try { g._tryShoot(); } catch (e) { tiroOk = false; console.log(`  _tryShoot lançou: ${e.message}`); }
const alertou = (b.alertUntil || 0) > g.time;
const longeQuieto = !P55 || !((longe.alertUntil || 0) > g.time);
const sb3 = tiroOk && alertou && pensa(b);
const sb4 = longeQuieto;

prepara(b, P3, true);
const sb5 = pensa(b);

const linha = (ok, id, txt) => { console.log(`  ${ok ? '\x1b[32m✓' : '\x1b[31m✗'}\x1b[0m ${id} ${txt}`); if (!ok) falhas.push(id); };
linha(sb1, 'SB1', 'bot de costas a 15 m, sem alerta, não adquire o jogador (cone de 120°)');
linha(sb2, 'SB2', 'o mesmo bot de frente adquire no mesmo think');
linha(sb3, 'SB3', `tiro real do jogador alerta o bot de costas e ele adquire (alertou=${alertou})`);
linha(sb4, 'SB4', P55 ? 'bot além de 40 m não ouve o tiro' : 'sem posição a 48–55 m neste mapa — cláusula não medida');
linha(sb5, 'SB5', 'encostado (3 m) o bot percebe mesmo de costas');

if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego`);
  falhas.push('mutacao-cega');
}
process.exit(falhas.length ? 1 : 0);
