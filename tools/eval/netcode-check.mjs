/* RÉGUA DO NETCODE DO CLIENTE.
   O netcode é a parte do multiplayer que ninguém consegue olhar e dizer "está certo": ele só
   se manifesta como boneco liso ou boneco picotado, tiro que acerta ou tiro que passa ao lado.
   Então ele é medido aqui, headless, alimentado com snapshots FABRICADOS — o que permite
   cobrar coisas que num teste manual seriam sorte: que amigo não vire inimigo no casamento de
   ids, que a interpolação renderize no passado (e não extrapole), que o relógio e o placar
   venham do servidor, que a reconciliação não faça rubber-band no adiantamento normal da
   predição, e que a morte do jogador local — que no online NÃO passa pelo `_kill` — ainda
   acenda a tela de morte.

   Roda o Game de verdade (harness) com `mpFactory`, como o main.js faz. */
import { Game, MAPS, initTextures, renderer, sfx, PCHAR, seedRandom, mkEl } from './harness.mjs';
import { makeNetcode } from '../../public/js/netgame.js';

let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };

/* NetClient de mentira: mesma superfície que o netgame consome (snap/prev/yourEnt/meta/
   sendInput/startPing/stopPing/computeStats), sem socket. */
function fakeNet(yourEnt, teamSize = 5) {
  return {
    yourEnt, yourTeam: 'E', espectador: yourEnt == null,
    meta: { room: 'r1', map: 'praca_poderes', ctf: false, teamSize, maxPlayers: teamSize * 2 },
    snap: null, prev: null, enviados: [],
    startPing() {}, stopPing() {},
    computeStats() { return { hz: 20, kbps: 1, gapMax: 50, sinceLast: 10, ents: 10, tick: 1, ping: 30 }; },
    sendInput(i) { this.enviados.push(i); },
    pedirTime() {}, espectar() {},
  };
}

function montaJogo(net, { dedicated = false, teamSize = 5 } = {}) {
  seedRandom(4242);
  const g = new Game({
    renderer, textures: TEX, sfx,
    settings: { bots: teamSize, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'F', enemyFaction: 'C',
    nickname: 'EU', mapId: 'praca_poderes', ctf: false, testMode: true, dedicated,
    onQuit() {}, onMatchEnd() {}, mpFactory: makeNetcode, net,
  });
  g._ensureDolly = () => {};
  g.start ? g.start() : g._startRound();
  g.scene.updateMatrixWorld(true); g.world.root.updateMatrixWorld(true);
  return g;
}

// snapshot com `yourEnt` no time E e o resto dividido 5/5, como o servidor manda
function snapshot(t, tick, { yourEnt = 1, mover = 0, matarVoce = false, hpVoce = 100 } = {}) {
  const ents = [];
  for (let i = 0; i < 10; i++) {
    const id = i + 1;
    const team = i < 5 ? 'E' : 'B';
    const meu = id === yourEnt;
    ents.push({
      id, name: meu ? 'EU' : `BOT${id}`, team, bot: meu ? 0 : 1,
      x: i * 2 + mover, y: 0, z: 10 + i, yaw: 0.5, pitch: 0,
      hp: meu ? hpVoce : 100, alive: meu ? !matarVoce : true,
      weapon: 'ak', fire: 0, voice: 0, k: i, d: 0,
      respawnIn: meu && matarVoce ? 4.5 : 0,
      killedBy: meu && matarVoce ? 'BOT7' : undefined,
    });
  }
  return {
    type: 'snapshot', room: 'r1', tick, t, state: 'live', owner: null, players: 1, spectators: 0,
    livre: { E: 4, B: 5 }, timeLeft: 77, roundNum: 3, scoreE: 2, scoreB: 1, ents,
  };
}

const TEX = initTextures();

console.log('\n· casamento de ids (quem é amigo, quem é inimigo)');
{
  const net = fakeNet(1);
  const g = montaJogo(net);
  net.snap = snapshot(100, 1);
  g._mp.applySnapshot();
  const mapa = g._mp._netMap;
  cobra(mapa.get(1) === g.player, 'o SEU id vira o jogador local');
  cobra(mapa.size === 10, `os 10 combatentes do servidor acharam corpo local (casaram ${mapa.size})`);
  let erradas = 0;
  for (const e of net.snap.ents) { const c = mapa.get(e.id); if (c && c.team !== e.team) erradas++; }
  cobra(erradas === 0, `nenhum corpo ficou no time errado (${erradas} trocados) — amigo virar inimigo torna o jogo ininteligível`);
  cobra(g.bots.filter((b) => b._remote === 'ghost').length === 0, 'nenhum corpo local sobrou de fantasma quando o elenco tem o tamanho do servidor');

  /* CASAMENTO EXATO POR PERSONAGEM. O elenco local é montado a partir do roster do servidor,
     então cada entidade tem que cair no corpo do personagem CERTO — não num "inimigo qualquer"
     do mesmo time. Sem isto o nome no killfeed não bate com o rosto que apareceu na tela, e
     dois jogadores da mesma sala veem elencos diferentes.

     O roster de teste ROTACIONA os personagens DENTRO de cada time. Rotacionar dentro do time
     é o que separa as duas hipóteses: casar por time devolve a ordem local (errada), casar por
     personagem devolve a rotacionada (certa). A primeira versão desta régua invertia a lista
     inteira — e inverter e depois indexar por id crescente RESTAURA a ordem, então as duas
     hipóteses davam o mesmo resultado e a régua passava com o casamento desligado. */
  {
    const net2 = fakeNet(1);
    const g2 = montaJogo(net2);
    const roster = [{ id: 1, char: g2.player.def.id, team: 'E', weapon: 'ak' }];
    for (const time of ['E', 'B']) {
      const doTime = g2.bots.filter((b) => b.team === time);
      const chars = doTime.map((b) => b.def.id);
      const rot = chars.slice(1).concat(chars[0]);   // rotaciona DENTRO do time
      doTime.forEach((b, i) => roster.push({ id: roster.length + 1, char: rot[i], team: time, weapon: b.weapon }));
    }
    net2.meta.roster = roster;
    const snap2 = snapshot(300, 1);
    snap2.ents = roster.map((r) => ({ ...snap2.ents[0], id: r.id, team: r.team, name: r.char }));
    net2.snap = snap2;
    g2._mp.applySnapshot();
    let exatos = 0, total = 0, ordemLocal = 0;
    for (const r of roster) {
      const corpo = g2._mp._netMap.get(r.id);
      if (!corpo || corpo === g2.player) continue;
      total++;
      if (corpo.def && corpo.def.id === r.char) exatos++;
    }
    cobra(total > 0 && exatos === total, `cada entidade caiu no corpo do PERSONAGEM certo (${exatos}/${total}), com o elenco rotacionado dentro do time`);
    g2.dispose();
  }

  console.log('\n· a autoridade é do servidor');
  cobra(g.state === 'live', 'o ESTADO da rodada vem do snapshot (o cliente estava em countdown)');
  cobra(g.timeLeft === 77, 'o relógio vem do snapshot');
  cobra(g.roundNum === 3, 'o número da rodada vem do snapshot');
  cobra(g.roundsWon.E === 2 && g.roundsWon.B === 1, 'o placar vem do snapshot');
  const umBot = mapa.get(6);
  cobra(umBot.kills === 5, 'abates de cada um vêm do snapshot (scoreboard do servidor)');

  console.log('\n· dano é do servidor, nunca do cliente');
  const alvo = mapa.get(6);
  const hp0 = alvo.hp;
  g._fireHitscan(g.player, g.camera.getWorldPosition(new (alvo.pos.constructor)()), alvo.pos.clone().sub(g.camera.position).normalize(), 100, true, 'AK', 'ak', false);
  cobra(alvo.hp === hp0, 'atirar no cliente NÃO tira vida de ninguém (quem decide é o servidor)');

  console.log('\n· predição e reconciliação');
  net.enviados.length = 0;
  g._mp.stepPlayer(g.player, { ax: 0, az: -1, crouch: false, shift: false, jump: false });
  const env = net.enviados[0];
  cobra(!!env && env.az === -1, 'o input do jogador é enviado ao servidor');
  cobra(Number.isFinite(env.px) && Number.isFinite(env.rt), 'vai junto a posição PREDITA e o tempo renderizado (origem do tiro + lag comp)');
  // adiantamento NORMAL da predição (< 2,5 m) não pode teleportar: seria rubber-band
  g.player.pos.set(0, 0, 0);
  g._mp._srvHas = 1; g._mp._srvX = 1.5; g._mp._srvY = 0; g._mp._srvZ = 0;
  g._mp.stepPlayer(g.player, { ax: 0, az: 0, crouch: false, shift: false, jump: false });
  cobra(g.player.pos.x === 0, 'divergência pequena (1,5 m) NÃO corrige — corrigir o adiantamento normal é exatamente o rubber-banding');
  g._mp._srvX = 40;
  g._mp.stepPlayer(g.player, { ax: 0, az: 0, crouch: false, shift: false, jump: false });
  cobra(g.player.pos.x === 40, 'desync REAL (40 m) corrige na hora');

  console.log('\n· interpolação renderiza no PASSADO (nunca extrapola)');
  // passo REALISTA entre dois snapshots (20 Hz, ~5 m/s => ~0,25 m)
  net.snap = snapshot(100.05, 2, { mover: 0.25 });
  g._mp.applySnapshot();
  const b = g._mp._netMap.get(6);
  const alvoX = b._ipx1;
  g._mp.updateRemoteBot(b, 1 / 60);
  cobra(b.pos.x <= alvoX + 1e-6, `o boneco remoto nunca passa do último ponto conhecido (x=${b.pos.x.toFixed(2)} <= ${alvoX.toFixed(2)}) — extrapolar é o boneco "andando na parede"`);
  cobra(b._netSpd > 0, `a velocidade de rede alimenta a animação de andar (${b._netSpd.toFixed(2)} m/s) — sem ela o boneco DESLIZA parado`);
  /* Salto grande = respawn ou teleporte, e aí interpolar seria o boneco ATRAVESSANDO o mapa
     em linha reta na frente de todo mundo. Tem que colapsar, e a animação de andar tem que
     ficar zerada (ele não "correu" 12 m em 50 ms). */
  net.snap = snapshot(100.10, 3, { mover: 12 });
  g._mp.applySnapshot();
  cobra(b._ipx0 === b._ipx1, 'salto grande (respawn/teleporte) COLAPSA a interpolação em vez de varrer o mapa');
  cobra(b._netSpd === 0, 'e não vira uma corrida de 240 m/s na animação');

  console.log('\n· morte do jogador local vem do servidor');
  g.el.respawn.classList.add('hidden');
  net.snap = snapshot(100.15, 4, { matarVoce: true });
  g._mp.applySnapshot();
  cobra(!g.player.alive, 'o snapshot mata o jogador local');
  cobra(!g.el.respawn.classList.contains('hidden'), 'a tela de morte acende (no online o _kill local não roda — sem este caminho o jogador morria sem tela)');
  cobra(g._lastHit && g._lastHit.name === 'BOT7', 'o "MORTO POR" traz quem matou');
  cobra(Math.abs(g.player.respawnAt - (g.time + 4.5)) < 0.01, 'o countdown de respawn vem do servidor');
  net.snap = snapshot(100.20, 5);
  g._mp.applySnapshot();
  cobra(g.player.alive && g.el.respawn.classList.contains('hidden'), 'o respawn do servidor apaga a tela de morte');

  console.log('\n· dano recebido tem retorno na tela');
  let bateu = 0; const orig = g._playerHurtFx.bind(g); g._playerHurtFx = () => { bateu++; orig(); };
  net.snap = snapshot(100.25, 6, { hpVoce: 40 });
  g._mp.applySnapshot();
  cobra(bateu === 1, 'queda de vida no snapshot dispara o feedback de "levei tiro"');
  g.dispose();
}

console.log('\n· espectador');
{
  const net = fakeNet(null);
  const g = montaJogo(net, { dedicated: true });
  cobra(g.combatants.length === 10, `espectador vê os DEZ corpos (viu ${g.combatants.length}) — com jogador local sobrariam 9 e um jogador ficaria invisível`);
  net.snap = snapshot(200, 1, { yourEnt: -1 });
  g._mp.applySnapshot();
  cobra(g._mp._netMap.size === 10, 'os 10 do servidor casaram sem consumir o jogador local');
  cobra(g._mp.espectador === true, 'o netcode se reconhece como espectador');
  cobra(!!g._mp._alvoSpec, 'a câmera de espectador escolheu alguém para seguir');
  const antes = g._mp._alvoSpec;
  g._mp.trocarAlvo(1);
  cobra(g._mp._alvoSpec !== antes, 'dá para passar para o próximo jogador');
  // alvo morre: a câmera não pode ficar presa no defunto
  g._mp._alvoSpec.alive = false;
  g._mp.cameraEspectador();
  cobra(g._mp._alvoSpec.alive, 'quando o alvo morre a câmera vai sozinha para outro vivo');
  net.enviados.length = 0;
  g._mp.stepPlayer(g.player, { ax: 1, az: 1, crouch: false, shift: false, jump: false });
  cobra(net.enviados.length === 0, 'espectador NÃO manda input (ele não tem corpo; mandar seria mover o de outro)');

  /* O QUE O DONO RELATOU JOGANDO: "a função de assistir não funciona muito bem, ele atira e
     não deixa escolher o time". Eram os dois lados do mesmo esquecimento — o espectador
     continuava passando pelo caminho de jogador: o pointer lock prendia o cursor (e sem
     cursor não dá para clicar em ENTRAR NO TIME) e o gatilho ainda disparava som e tracer
     saindo de um corpo que não existe. */
  cobra(g.espectando() === true, 'o Game se reconhece como espectador');
  let pediuLock = 0;
  g.renderer.domElement.requestPointerLock = () => { pediuLock++; };
  g._requestLock();
  cobra(pediuLock === 0, 'espectador NÃO captura o mouse — sem cursor não dá para clicar em ENTRAR NO TIME');
  g.state = 'live';
  const municao = g.player.ammo[g.player.weapon].mag;
  g.player.nextShotAt = 0; g.player.drawUntil = 0;
  g._tryShoot();
  cobra(g.player.ammo[g.player.weapon].mag === municao, 'espectador NÃO atira (o tiro sairia de um corpo que não existe)');
  g.dispose();
}

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
