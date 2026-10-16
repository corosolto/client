// CONTRATO: a granada VOLTA por sequência de abates (pedido de jogador, out/2026: "quando
// bater X kills a granada volta"). Regra medida aqui: a cada 3 abates NA RODADA, +1 frag
// SÓ pra quem está sem (teto 1, sem banco de segunda granada), contador zerado a cada
// round, mesma regra pra slot remoto (o nó autoritativo roda o MESMO _kill) e o cliente
// MP prediz o passo em morteRemota (netgame.js).
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

function boot() {
  seedRandom(12345);
  const playerDef = CHARACTERS.find((c) => c.team === 'E') || CHARACTERS[0];
  const g = new Game({
    renderer, textures: initTextures(), sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: playerDef.id, playerTeam: 'E', playerFaction: playerDef.team, enemyFaction: 'B',
    nickname: 'SIM', mapId: 'ferro_velho', ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
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
// o relógio ANDA por abate: a trava de idempotência do _kill (ent._killT === this.time)
// deduplicaria a MESMA vítima morta duas vezes no mesmo tick — morte é uma morte só.
const kill = (g, vit, att) => { g.time += 0.05; Game.prototype._kill.call(g, vit, att, 'ak', false); vit.alive = true; vit.hp = 100; };
const alvos = (g) => g.bots.filter((b) => b.team !== g.playerTeam);

/* (1) o pedido do relato: 3 abates na rodada devolvem a frag gastada */
{
  const g = boot();
  g.player.frags = 0;
  const b = alvos(g);
  kill(g, b[0], g.player); kill(g, b[1], g.player);
  check('2 abates não repõem (são 3)', g.player.frags === 0, { frags: g.player.frags });
  kill(g, b[2], g.player);
  check('3º abate repõe a frag', g.player.frags === 1, { frags: g.player.frags });
  kill(g, b[3 % b.length], g.player); kill(g, b[1], g.player); kill(g, b[2], g.player);
  check('teto 1: 6º abate não empilha segunda', g.player.frags === 1, { frags: g.player.frags });
}

/* (2) quem ESTÁ com granada não ganha banco: 3 abates com frag na mão mantém 1 */
{
  const g = boot();
  g.player.frags = 1;
  const b = alvos(g);
  kill(g, b[0], g.player); kill(g, b[1], g.player); kill(g, b[2], g.player);
  check('com frag na mão, sequência não empilha', g.player.frags === 1, { frags: g.player.frags });
  g.player.frags = 0;   // gastou DEPOIS da sequência: nova sequência de 3 devolve
  kill(g, b[0], g.player); kill(g, b[1], g.player); kill(g, b[2], g.player);
  check('gastou depois: nova sequência devolve', g.player.frags === 1, { frags: g.player.frags });
}

/* (3) o contador é da RODADA: 2 abates no round 1 não adiantam o 1º do round 2 */
{
  const g = boot();
  g.player.frags = 0;
  const b = alvos(g);
  kill(g, b[0], g.player); kill(g, b[1], g.player);
  g._resetPositions();
  g.player.frags = 0;
  kill(g, b[0], g.player);
  check('sequência zera no round novo', g.player.frags === 0, { frags: g.player.frags });
  kill(g, b[1], g.player); kill(g, b[2], g.player);
  check('round novo: 3 abates frescos repõem', g.player.frags === 1, { frags: g.player.frags });
}

/* (4) slot remoto (autoridade): o MESMO _kill roda no nó; o dono do slot ganha a frag
       no SERVIDOR, que é quem libera o arremesso (_serviceGrenades lê entity.frags) */
{
  const g = boot();
  const dono = alvos(g)[0];
  dono._remote = true; dono.frags = 0;
  const vitimas = g.bots.filter((b) => b !== dono);
  kill(g, vitimas[0], dono); kill(g, vitimas[1], dono); kill(g, vitimas[2], dono);
  check('slot remoto reposto no servidor', dono.frags === 1, { frags: dono.frags });
}

/* (5) predição do cliente MP: morteRemota chama o passo quando VOCÊ é o atirador */
{
  const chamadas = [];
  const fakeGame = {
    player: { pos: new THREE.Vector3(), team: 'E' },
    camera: { position: new THREE.Vector3() },
    sfx: { death() {} },
    _playerKillFeedback() {},
    _fragRestockStep(att) { chamadas.push(att); },
    _bloodPoolAt() {},
  };
  // `espectador` é getter sobre net.espectador/yourEnt: jogando = yourEnt definido e sem flag
  const nc = makeNetcode(fakeGame, { meta: { events: true, snapshotHz: 20 }, startPing() {}, on() {}, yourEnt: 7 });
  const vitima = { pos: new THREE.Vector3(), team: 'B', def: { id: 'x' } };
  nc.morteRemota(vitima, fakeGame.player, false);
  check('netgame prediz o passo no abate do jogador', chamadas.length === 1 && chamadas[0] === fakeGame.player,
    { chamadas: chamadas.length });
}

const result = {
  passed: rows.filter((r) => r.pass).length, total: rows.length,
  failed: rows.filter((r) => !r.pass).map((r) => r.name), rows,
  scope: 'contrato de economia de frag por sequência; sem aceite de feel/MP real',
};
console.log(JSON.stringify({ passed: result.passed, total: result.total, failed: result.failed,
  rows: rows.map((r) => ({ name: r.name, pass: r.pass, observed: r.observed })) }, null, 1));
if (result.failed.length) process.exitCode = 1;
process.exit(result.failed.length ? 1 : 0);   // boot real + netcode deixam handle pendurado
