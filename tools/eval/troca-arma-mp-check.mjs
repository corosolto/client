/* troca-arma-mp-check.mjs — A TECLA DE TROCA CHEGA AO SERVIDOR NO MULTIPLAYER?
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE EXISTE
     Relato do dono (13/10, produção, Brasília): "no multiplayer ele não trocava pra
     pistola e faca". A troca é autoritativa: o cliente troca na hora (predição) e manda a
     arma no próximo input; o snapshot só corrige a arma quando o ack já cobre o pedido.
     O `update` aplica o snapshot ANTES de mover (e de enviar o input). Quando um snapshot
     novo chegava entre a tecla e o quadro seguinte, ele via `p.weapon` diferente da arma
     do servidor, com o ack em dia com o pedido ANTERIOR, e devolvia a arma velha. O input
     do quadro saía com a arma velha: a troca morria sem nunca ter sido pedida.
     A chance por tecla é ~ (snapshots por segundo) / (quadros por segundo). Com 30 Hz de
     snapshot e um mapa pesado a 30 fps, quase toda tecla se perdia.

   O QUE ELA MEDE (no `Game` real com `makeNetcode`, rede falsa, snapshots fabricados)
     TM1 · tecla 2, snapshot novo antes do quadro: a pistola fica e o input leva a pistola
     TM2 · tecla 3, mesmo caso: a faca fica e o input leva a faca
     TM3 · o servidor continua mandando: ack que cobre o pedido com a arma antiga desfaz
           a troca (pedido recusado volta para a arma do servidor)
     TM4 · troca forçada pelo servidor (respawn, pickup) ainda chega ao jogador

   MUTANTE (executado em 13/10)
     --mutante=sem-guarda  desliga a guarda do pedido ainda não enviado -> TM1 TM2 caem

   uso: node tools/eval/troca-arma-mp-check.mjs [--mutante=sem-guarda]
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { Game, initTextures, renderer, sfx, PCHAR, seedRandom } from './harness.mjs';
import { makeNetcode } from '../../public/js/netgame.js';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && MUT !== 'sem-guarda') { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

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

const TEX = initTextures();
function montaJogo(net) {
  seedRandom(4242);
  const g = new Game({
    renderer, textures: TEX, sfx,
    settings: { bots: 5, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'F', enemyFaction: 'C',
    nickname: 'EU', mapId: 'praca_poderes', testMode: true,
    onQuit() {}, onMatchEnd() {}, mpFactory: makeNetcode, net,
  });
  g._ensureDolly = () => {};
  g.start ? g.start() : g._startRound();
  if (MUT === 'sem-guarda') g._mp.__mutSemGuardaTroca = true;
  return g;
}

let t = 100;
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
  t += 1 / 30;
  return { type: 'snapshot', room: 'r1', tick, t, state: 'live', owner: null, players: 1, spectators: 0,
    livre: { E: 4, B: 5 }, timeLeft: 77, roundNum: 1, scoreE: 0, scoreB: 0, ents };
}

const parado = { ax: 0, az: 0, crouch: false, shift: false, jump: false };
const tecla = (g, code) => g._kd({ code, preventDefault() {} });

/* Prepara o jogador com a M4 confirmada: um input enviado e reconhecido pelo servidor. */
function prepara() {
  const net = fakeNet(), g = montaJogo(net);
  let tick = 1;
  net.snap = snapshot(tick++, { ackSeq: 0, weapon: 'm4' }); g._mp.applySnapshot();
  g.state = 'live'; g.player.alive = true;
  g._mp.stepPlayer(g.player, parado, 1 / 60);
  net.snap = snapshot(tick++, { ackSeq: net.seq, weapon: 'm4' }); g._mp.applySnapshot();
  /* O quadro do jogo como o `update` faz: snapshot primeiro, depois o input. */
  const quadro = () => { g._mp.applySnapshot(); g._mp.stepPlayer(g.player, parado, 1 / 60); };
  const chegaSnapshot = (weapon, ackSeq = net.seq) => { net.snap = snapshot(tick++, { ackSeq, weapon }); };
  return { net, g, quadro, chegaSnapshot };
}

console.log('\n· tecla de troca com snapshot chegando antes do quadro');
for (const [c, code, alvo] of [['TM1', 'Digit2', 'pistol'], ['TM2', 'Digit3', 'knife']]) {
  const { net, g, quadro, chegaSnapshot } = prepara();
  cobra(g.player.weapon === 'm4', `${c} · começa com a M4 confirmada pelo servidor (${g.player.weapon})`);
  tecla(g, code);
  const prevista = g.player.weapon;
  chegaSnapshot('m4');   // o servidor ainda não viu a tecla: ack em dia com o pedido anterior
  quadro();
  const enviado = net.enviados.at(-1)?.weapon;
  cobra(prevista === alvo && g.player.weapon === alvo && enviado === alvo,
    `${c} · ${code}: predição ${prevista}, depois do snapshot ${g.player.weapon}, input enviado com ${enviado} (esperado ${alvo})`);
  g.dispose();
}

console.log('\n· a autoridade continua valendo');
{
  const { net, g, quadro, chegaSnapshot } = prepara();
  tecla(g, 'Digit2');
  quadro();   // o pedido sai
  const pedido = net.seq;
  chegaSnapshot('m4', pedido);   // servidor processou o pedido e recusou (arma fora do inventário)
  quadro();
  cobra(g.player.weapon === 'm4', `TM3 · ack que cobre o pedido com a arma antiga desfaz a troca (${g.player.weapon})`);
  g.dispose();
}
{
  const { g, quadro, chegaSnapshot } = prepara();
  chegaSnapshot('awp');   // o servidor trocou sozinho (pickup, respawn)
  quadro();
  cobra(g.player.weapon === 'awp', `TM4 · troca feita pelo servidor chega ao jogador (${g.player.weapon})`);
  g.dispose();
}

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
