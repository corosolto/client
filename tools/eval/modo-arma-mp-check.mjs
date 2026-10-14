/* modo-arma-mp-check.mjs — O MODO DE ARMAS DO MENU NÃO TRAVA A TROCA NO MULTIPLAYER
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE EXISTE
     Relato do dono (13/10, produção, Brasília): "no multiplayer ele não trocava pra
     pistola e faca". O `main.js` passa os `settings` salvos do single player para o Game
     do MP, inclusive `wpnMode`. Com "SÓ AWP" escolhido no menu, `_pickupAllowed` recusava
     pistola e faca: as teclas 2/3, o Q e o scroll não faziam nada, embora o nó (que não
     tem modo de armas) aceitasse a troca. Com "SÓ PISTOLAS", a faca e a primária sumiam.

   O QUE ELA MEDE (Game real com `makeNetcode`, rede falsa, settings com wpnMode salvo)
     MA1 · MP com "SÓ AWP" salvo: tecla 2 troca para a pistola e o input leva a pistola
     MA2 · MP com "SÓ AWP" salvo: tecla 3 troca para a faca e o input leva a faca
     MA3 · MP com "SÓ PISTOLAS" salvo: tecla 1 volta para a primária do servidor
     MA4 · MP: o scroll percorre os três slots
     MA5 · single player com "SÓ AWP" continua recusando a pistola (o modo do menu vale lá)

   MUTANTE (executado em 13/10)
     --mutante=modo-local  devolve ao `_wpnMode` a leitura crua do settings -> MA1 a MA4 caem

   uso: node tools/eval/modo-arma-mp-check.mjs [--mutante=modo-local]
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { Game, initTextures, renderer, sfx, PCHAR, seedRandom, bootGame } from './harness.mjs';
import { makeNetcode } from '../../public/js/netgame.js';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && MUT !== 'modo-local') { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }
const modoLocal = function () { return this.settings?.wpnMode || 'all'; };

let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };

function fakeNet() {
  return {
    yourEnt: 1, yourTeam: 'E', espectador: false,
    meta: { room: 'r1', map: 'praca_poderes', ctf: false, teamSize: 5, maxPlayers: 10, snapshotHz: 30, protocolVersion: 5 },
    snap: null, prev: null, enviados: [], events: [], seq: 0,
    startPing() {}, stopPing() {},
    computeStats() { return { hz: 30, kbps: 1, gapMax: 33, sinceLast: 10, ents: 10, tick: 1, ping: 30 }; },
    sendInput(i) { this.enviados.push(i); return ++this.seq; },
    pedirTime() {}, espectar() {},
  };
}

function snapshot(tick, { ackSeq, weapon, primary = 'm4', secondary = 'pistol' }) {
  const ents = [];
  for (let i = 0; i < 10; i++) {
    const id = i + 1, meu = id === 1;
    ents.push({
      id, name: meu ? 'EU' : `BOT${id}`, team: i < 5 ? 'E' : 'B', bot: meu ? 0 : 1,
      x: i * 2, y: 0, z: 10 + i, yaw: 0.5, pitch: 0, hp: 100, alive: true,
      weapon: meu ? weapon : 'ak', fire: 0, voice: 0, k: 0, d: 0, respawnIn: 0,
      ...(meu ? { ackSeq, mag: 20, res: 60, reloadIn: 0, primary, secondary } : {}),
    });
  }
  return { type: 'snapshot', room: 'r1', tick, t: 100 + tick / 30, state: 'live', owner: null, players: 1, spectators: 0,
    livre: { E: 4, B: 5 }, timeLeft: 77, roundNum: 1, scoreE: 0, scoreB: 0, ents };
}

const TEX = initTextures();
const parado = { ax: 0, az: 0, crouch: false, shift: false, jump: false };
const tecla = (g, code) => g._kd({ code, preventDefault() {} });

/* Jogador do MP com o modo salvo no menu e a arma inicial que o NÓ deu. */
function jogoMP(wpnMode, armaDoNo) {
  seedRandom(4242);
  const net = fakeNet();
  const g = new Game({
    renderer, textures: TEX, sfx,
    settings: { bots: 5, quality: 'low', difficulty: 'normal', sens: 1, wpnMode },
    playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'F', enemyFaction: 'C',
    nickname: 'EU', mapId: 'praca_poderes', testMode: true,
    onQuit() {}, onMatchEnd() {}, mpFactory: makeNetcode, net,
  });
  g._ensureDolly = () => {};
  if (MUT === 'modo-local') g._wpnMode = modoLocal;
  g.start ? g.start() : g._startRound();
  net.snap = snapshot(1, { ackSeq: 0, weapon: armaDoNo }); g._mp.applySnapshot();
  g.state = 'live'; g.player.alive = true;
  const quadro = () => g._mp.stepPlayer(g.player, parado, 1 / 60);
  return { g, net, quadro };
}

console.log('\n· multiplayer com modo de armas salvo no menu');
for (const [c, modo, armaDoNo, code, alvo] of [
  ['MA1', 'awp', 'm4', 'Digit2', 'pistol'],
  ['MA2', 'awp', 'm4', 'Digit3', 'knife'],
  ['MA3', 'pistols', 'pistol', 'Digit1', 'm4'],
]) {
  const { g, net, quadro } = jogoMP(modo, armaDoNo);
  const antes = g.player.weapon;
  tecla(g, code); quadro();
  const enviado = net.enviados.at(-1)?.weapon;
  cobra(antes === armaDoNo && g.player.weapon === alvo && enviado === alvo,
    `${c} · modo salvo '${modo}', ${code}: ${antes} -> ${g.player.weapon}, input com ${enviado} (esperado ${alvo})`);
  g.dispose();
}
{
  const { g } = jogoMP('awp', 'm4');
  let relogio = 1000;
  const roda = () => { relogio += 250; g._wh({ deltaY: 100, deltaMode: 0, timeStamp: relogio, preventDefault() {} }); return g.player.weapon; };
  const seq = [g.player.weapon, roda(), roda(), roda()].join(',');
  cobra(seq === 'm4,pistol,knife,m4', `MA4 · modo salvo 'awp', scroll percorre os slots: ${seq}`);
  g.dispose();
}

console.log('\n· single player mantém o modo do menu');
{
  const g = bootGame('praca_poderes', { textures: TEX, bots: 2, settings: { wpnMode: 'awp' } });
  g.state = 'live'; g.paused = false; g.player.alive = true;
  const antes = g.player.weapon;
  tecla(g, 'Digit2');
  cobra(antes === 'awp' && g.player.weapon === 'awp', `MA5 · SP 'SÓ AWP': tecla 2 não equipa pistola (${antes} -> ${g.player.weapon})`);
  g.dispose();
}

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
