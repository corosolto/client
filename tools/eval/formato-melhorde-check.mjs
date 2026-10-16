// CONTRATO: o FORMATO da partida (melhor de N, primeiro a X) aparece na cara de quem
// vai jogar (relato de out/2026: jogador pediu "melhor de 3/5/7" sem saber que o jogo
// JÁ tem — o formato só vivia no menu e no HUD secundário). A régua mede o banner do
// ROUND 1 nos dois modos (SP e a transição replicada do MP), e que rounds seguintes
// não repetem a ladainha.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const option = (n) => process.argv.find((a) => a.startsWith(n + '='))?.slice(n.length + 1);
const gameFile = path.resolve(option('--game-module') || path.join(ROOT, 'public/js/game.js'));
const netFile = path.resolve(option('--netgame-module') || path.join(ROOT, 'public/js/netgame.js'));

const { THREE, initTextures, renderer, sfx, seedRandom, CHARACTERS } =
  await import(pathToFileURL(path.join(ROOT, 'tools/eval/harness.mjs')));
const { Game } = await import(pathToFileURL(gameFile));
const { makeNetcode } = await import(pathToFileURL(netFile));

function boot({ ctf = false, roundsMax } = {}) {
  seedRandom(12345);
  const playerDef = CHARACTERS.find((c) => c.team === 'E') || CHARACTERS[0];
  const g = new Game({
    renderer, textures: initTextures(), sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: playerDef.id, playerTeam: 'E', playerFaction: playerDef.team, enemyFaction: 'B',
    nickname: 'SIM', mapId: 'ferro_velho', ctf, roundsMax, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  g.killsToWin = Infinity;
  g.start ? g.start() : g._startRound();
  g.scene.updateMatrixWorld(true);
  g.world.root.updateMatrixWorld(true);
  return g;
}

const rows = [];
const check = (name, pass, observed = {}) => rows.push({ name, pass: !!pass, observed });
const sub = (g) => String(g.el.bannerSub?.textContent || '');

/* (1) padrão MATA-MATA (melhor de 5, primeiro a 3) declara o formato no round 1 */
{
  const g = boot({});
  check('round 1 padrão declara MELHOR DE 5', /melhor de 5/i.test(sub(g)), { sub: sub(g) });
  check('round 1 padrão diz PRIMEIRO A 3', /primeiro time a 3/i.test(sub(g)), { sub: sub(g) });
  check('round 1 mantém o subtítulo de modo (abates/treta)', /abates|treta/i.test(sub(g)), { sub: sub(g) });
}

/* (2) teto custom (melhor de 3): o banner diz o que o jogador ESCOLHEU */
{
  const g = boot({ roundsMax: 3 });
  check('teto 3 declara MELHOR DE 3 e PRIMEIRO A 2', /melhor de 3/i.test(sub(g)) && /primeiro time a 2/i.test(sub(g)),
    { sub: sub(g) });
}

/* (3) round 2 em diante não repete: é a vez da treta, não da cartilha */
{
  const g = boot({});
  g._startRound();   // round 2
  check('round 2 não repete o formato', !/melhor de/i.test(sub(g)), { sub: sub(g) });
}

/* (4) CAPTURA também declara (alvo de bandeiras + formato na mesma linha) */
{
  const g = boot({ ctf: true });
  check('ctf round 1 declara bandeiras E formato', /bandeiras/i.test(sub(g)) && /melhor de/i.test(sub(g)),
    { sub: sub(g) });
}

/* (5) transição replicada do MP: o countdown do netgame compõe o MESMO banner */
{
  const banners = [];
  const fakeGame = {
    roundNum: 1, ctf: false, capsToWin: 2, killsToWin: 30, roundsMax: 5, roundsToWin: 3,
    player: { scoped: false }, el: { scope: { classList: { remove() {} } } },
    radioOpen: null, _radioUi() {}, _resultado: null, _showScoreboard() {}, _resetKillSequence() {},
    _banner(t, s) { banners.push(String(s)); }, drops: [],
    sfx: { roundNumber: () => true, csSound: () => true, roundLose() {}, roundWin() {} },
  };
  const nc = makeNetcode(fakeGame, { meta: { events: true, snapshotHz: 20 }, startPing() {}, on() {}, yourEnt: 7 });
  nc._netTick = 1;
  nc.transicaoDeEstado('roundEnd', 'countdown', { E: 0, B: 0 });
  check('mp countdown declara o formato no round 1', banners.length === 1 && /melhor de 5/i.test(banners[0]),
    { banners });
}

const result = {
  passed: rows.filter((r) => r.pass).length, total: rows.length,
  failed: rows.filter((r) => !r.pass).map((r) => r.name),
  rows: rows.map((r) => ({ name: r.name, pass: r.pass, observed: r.observed })),
  scope: 'contrato de texto do banner de round; sem aceite visual',
};
console.log(JSON.stringify({ passed: result.passed, total: result.total, failed: result.failed }, null, 1));
if (result.failed.length) process.exitCode = 1;
process.exit(result.failed.length ? 1 : 0);
