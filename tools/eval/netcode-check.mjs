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
import { WEAPONS } from '../../public/js/game.js';
import { unloadWeaponModel, setWeaponModel, hasWeapon } from '../../public/js/weapons.js';
import * as THREE from 'three';

let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };

/* NetClient de mentira: mesma superfície que o netgame consome (snap/prev/yourEnt/meta/
   sendInput/startPing/stopPing/computeStats), sem socket. */
function fakeNet(yourEnt, teamSize = 5, ctf = false, snapshotHz = 20, events = 0) {
  return {
    yourEnt, yourTeam: 'E', espectador: yourEnt == null,
    meta: { room: 'r1', map: 'praca_poderes', ctf, teamSize, maxPlayers: teamSize * 2, snapshotHz, ...(events ? { events: 1 } : {}) },
    snap: null, prev: null, enviados: [], events: [],
    startPing() {}, stopPing() {},
    computeStats() { return { hz: 20, kbps: 1, gapMax: 50, sinceLast: 10, ents: 10, tick: 1, ping: 30 }; },
    sendInput(i) { this.enviados.push(i); },
    pedirTime() {}, espectar() {},
  };
}

function montaJogo(net, { dedicated = false, teamSize = 5, ctf = false } = {}) {
  seedRandom(4242);
  const g = new Game({
    renderer, textures: TEX, sfx,
    settings: { bots: teamSize, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'F', enemyFaction: 'C',
    nickname: 'EU', mapId: 'praca_poderes', ctf, testMode: true, dedicated,
    onQuit() {}, onMatchEnd() {}, mpFactory: makeNetcode, net,
  });
  g._ensureDolly = () => {};
  g.start ? g.start() : g._startRound();
  g.scene.updateMatrixWorld(true); g.world.root.updateMatrixWorld(true);
  return g;
}

// snapshot com `yourEnt` no time E e o resto dividido 5/5, como o servidor manda
function snapshot(t, tick, {
  yourEnt = 1, mover = 0, matarVoce = false, hpVoce = 100,
  jogadorX = null, jogadorY = null, jogadorZ = null, ctfState = null,
} = {}) {
  const ents = [];
  for (let i = 0; i < 10; i++) {
    const id = i + 1;
    const team = i < 5 ? 'E' : 'B';
    const meu = id === yourEnt;
    ents.push({
      id, name: meu ? 'EU' : `BOT${id}`, team, bot: meu ? 0 : 1,
      x: meu && jogadorX != null ? jogadorX : i * 2 + mover,
      y: meu && jogadorY != null ? jogadorY : 0,
      z: meu && jogadorZ != null ? jogadorZ : 10 + i,
      yaw: 0.5, pitch: 0,
      hp: meu ? hpVoce : 100, alive: meu ? !matarVoce : true,
      weapon: 'ak', fire: 0, voice: 0, k: i, d: 0,
      respawnIn: meu && matarVoce ? 4.5 : 0,
      killedBy: meu && matarVoce ? 'BOT7' : undefined,
    });
  }
  return {
    type: 'snapshot', room: 'r1', tick, t, state: 'live', owner: null, players: 1, spectators: 0,
    livre: { E: 4, B: 5 }, timeLeft: 77, roundNum: 3, scoreE: 2, scoreB: 1,
    ...(ctfState ? { ctf: ctfState } : {}), ents,
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
  const eu0 = net.snap.ents.find((e) => e.id === net.yourEnt);
  cobra(g.player.pos.distanceTo(new g.player.pos.constructor(eu0.x, eu0.y, eu0.z)) < 1e-6,
    'o PRIMEIRO snapshot põe o jogador exatamente no spawn autoritativo — não conserva um spawn local diferente');

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
  net.snap = snapshot(100.20, 5, { jogadorX: 37, jogadorY: 2.5, jogadorZ: -19 });
  g._mp.applySnapshot();
  cobra(g.player.alive && g.el.respawn.classList.contains('hidden'), 'o respawn do servidor apaga a tela de morte');
  cobra(g.player.pos.distanceTo(new g.player.pos.constructor(37, 2.5, -19)) < 1e-6,
    'o respawn põe o jogador IMEDIATAMENTE na posição autoritativa, inclusive altura — não no meio/fora do mapa');

  console.log('\n· dano recebido tem retorno na tela');
  let bateu = 0; const orig = g._playerHurtFx.bind(g); g._playerHurtFx = () => { bateu++; orig(); };
  net.snap = snapshot(100.25, 6, { hpVoce: 40, jogadorX: 37, jogadorY: 2.5, jogadorZ: -19 });
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

/* BUG-105 — velocidade da animação tem que vir da distância por TEMPO DO SERVIDOR. Medir
   pelo intervalo de chegada transforma jitter de rede em câmera lenta/gravidade lunar mesmo
   quando as posições autoritativas e o ping estão corretos. */
console.log('\n· jitter de chegada não altera a velocidade visual dos bots (BUG-105)');
{
  const net = fakeNet(1);
  const g = montaJogo(net);
  let agora = 1000;
  g._mp._now = () => agora;
  net.snap = snapshot(600.00, 1); g._mp.applySnapshot();
  const b = g._mp._netMap.get(6);
  agora = 1200; // pacote chegou 200 ms depois, mas o servidor avançou só 50 ms
  net.snap = snapshot(600.05, 2, { mover: 0.25 }); g._mp.applySnapshot();
  cobra(Math.abs(b._netSpd - 5) < 0.01,
    `0,25 m em 50 ms do SERVIDOR anima a 5 m/s mesmo com chegada atrasada (deu ${b._netSpd.toFixed(2)} m/s)`);
  g.dispose();
}

/* BUG-108 — no online a máquina local de CTF não roda. Logo dono/progresso das bandeiras e
   placares de captura precisam vir do snapshot autoritativo, não apenas existir no servidor. */
console.log('\n· captura de bandeira online aplica o estado autoritativo (BUG-108)');
{
  const net = fakeNet(1, 5, true);
  const g = montaJogo(net, { ctf: true });
  let redesenhou = 0;
  const hud0 = g._updateCtfHud.bind(g);
  g._updateCtfHud = () => { redesenhou++; hud0(); };
  const points = g.ctfPts.map((_, i) => ({
    owner: i === 0 ? 'E' : i === 1 ? 'B' : null,
    prog: i === 2 ? 0.625 : 0,
    capTeam: i === 2 ? 'E' : null,
    contested: i === 2,
  }));
  net.snap = snapshot(700, 1, { ctfState: {
    capsE: 4, capsB: 2, roundCapsE: 2, roundCapsB: 1,
    capsToWin: points.length, matchLeft: 318.5, points,
  } });
  g._mp.applySnapshot();
  cobra(g.ctfCaps.E === 4 && g.ctfCaps.B === 2 && g.roundCaps.E === 2 && g.roundCaps.B === 1,
    'placar acumulado e capturas da rodada vêm do servidor');
  cobra(Math.abs(g.ctfMatchLeft - 318.5) < 1e-6 && g.capsToWin === points.length,
    'relógio/objetivo da partida de captura vêm do servidor');
  cobra(g.ctfPts.every((p, i) => p.owner === points[i].owner && Math.abs(p.prog - points[i].prog) < 1e-6
      && p.capTeam === points[i].capTeam && !!p.contested === points[i].contested),
    'cada bandeira recebe dono, progresso, lado capturando e contestação autoritativos');
  cobra(redesenhou === 1, 'HUD/bandeiras são redesenhados depois de aplicar o snapshot CTF');
  g.dispose();
}

/* BUG-86 — "o personagem estava bugado, depois de morrer ficava deitado". No online morte e
   respawn chegam por SNAPSHOT e não passam por _kill/_respawnPlayer — o corpo TP do jogador
   ficava com a pose de morte armada (`_tpDead`) e o clipe de queda segurado pra sempre,
   sendo arrastado pelo mundo (frames f01–f05 do relato de 30/08). */
console.log('\n· morte→respawn por snapshot RESETA o corpo TP do jogador (BUG-86)');
{
  const net = fakeNet(1);
  const g = montaJogo(net);
  net.snap = snapshot(400, 1);
  g._mp.applySnapshot();
  g.camView = 'third';            // o cenário dos frames: jogando com o corpo TP na tela
  g._ensurePlayerTP();
  net.snap = snapshot(400.05, 2, { matarVoce: true });
  g._mp.applySnapshot();
  g._tpDeath(1 / 60);             // é o que o _updatePlayer roda todo frame enquanto !alive
  cobra(g._tpDead === true, 'a morte pelo snapshot ARMA a pose de morte do corpo TP');
  net.snap = snapshot(400.10, 3);
  g._mp.applySnapshot();          // respawn do servidor (alive volta a true)
  cobra(g._tpDead === false, 'o respawn pelo snapshot DESARMA a pose de morte — sem isto o corpo fica deitado sendo arrastado');
  const ctrl = g.playerTP && g.playerTP.ctrl;
  if (ctrl) cobra(ctrl.dead === false, 'o mixer do corpo TP foi revivido (revive), não segue preso no clipe de queda');
  cobra(!!(g.playerTP && g.playerTP.group && g.playerTP.group.visible) === (g.camView !== 'first'),
    'a visibilidade do corpo TP volta a obedecer o modo de câmera');
  g.dispose();

  // MUTANTE: reintroduz o defeito (o reset não roda). A régua TEM que ficar vermelha —
  // padrão do ctfhud-check: se a mutação passar, este script sai 1.
  const net2 = fakeNet(1);
  const g2 = montaJogo(net2);
  net2.snap = snapshot(400, 1); g2._mp.applySnapshot();
  g2.camView = 'third'; g2._ensurePlayerTP();
  net2.snap = snapshot(400.05, 2, { matarVoce: true }); g2._mp.applySnapshot();
  g2._tpDeath(1 / 60);
  g2._tpRevive = () => {};        // o mutante: respawn sem o reset do corpo
  net2.snap = snapshot(400.10, 3); g2._mp.applySnapshot();
  cobra(g2._tpDead === true, 'MUTANTE sem o reset deixa a régua vermelha (a cláusula acima morde)');
  g2.dispose();
}

/* BUG-87 — "Lags". A interpolação antiga viajava prev→cur no gap de CHEGADA (~50 ms):
   qualquer snapshot atrasado clampava no último ponto e o boneco CONGELAVA até o próximo
   pacote — a 20 Hz com jitter real isso lê como lag mesmo com rede boa. O buffer de
   ~120 ms renderiza o remoto no passado, então um pacote atrasado ainda tem estrada
   pela frente. Só visual de REMOTOS: a física local não muda. */
console.log('\n· remotos interpolam com BUFFER (~120 ms): pacote atrasado não congela o boneco (BUG-87)');
{
  const net = fakeNet(1);
  const g = montaJogo(net);
  let agora = 1000;
  g._mp._now = () => agora;       // relógio da régua: jitter fabricado, determinístico
  net.snap = snapshot(500.00, 1);
  g._mp.applySnapshot();
  const b = g._mp._netMap.get(6);
  const x0 = b._ipx1;
  agora = 1050;
  net.snap = snapshot(500.05, 2, { mover: 1 });
  g._mp.applySnapshot();
  const x1 = b._ipx1;
  agora = 1145;                   // render em 1145-120=1025: MEIO do segmento [1000,1050]
  g._mp.updateRemoteBot(b, 1 / 60);
  cobra(b.pos.x > x0 + 0.01 && b.pos.x < x1 - 0.01,
    `existe posição INTERMEDIÁRIA entre dois snapshots (x=${b.pos.x.toFixed(2)} entre ${x0.toFixed(2)} e ${x1.toFixed(2)})`);
  /* pacote ATRASADO: o 3º snapshot só chega em 1150 (gap de 100 ms). Entre 1130 e 1160 o
     esquema sem buffer já estava clampado no 2º ponto — boneco congelado. Com o buffer o
     boneco segue andando. */
  const posEm = (t) => { agora = t; g._mp.updateRemoteBot(b, 1 / 60); return b.pos.x; };
  const xa = posEm(1130);
  agora = 1150;
  net.snap = snapshot(500.10, 3, { mover: 2 });
  g._mp.applySnapshot();
  const xb = posEm(1160);
  cobra(xb > xa + 0.01, `com pacote 50 ms ATRASADO o boneco segue andando dentro do buffer (${xa.toFixed(2)} → ${xb.toFixed(2)}) em vez de congelar`);
  // lag comp: o `rt` enviado ao servidor tem que ser o instante do SERVIDOR que está na tela
  agora = 1145;
  const rt = g._mp.renderTime();
  cobra(rt > 500.00 - 1e-6 && rt < 500.05 + 1e-6, `renderTime() devolve o instante do servidor DENTRO do segmento renderizado (${rt.toFixed(3)})`);
  cobra(g._mp.renderTime() <= 500.10 + 1e-6, 'renderTime() nunca está à frente do último snapshot (extrapolar o rewind é tiro em fantasma)');
  g.dispose();

  // MUTANTE: desliga o buffer (atraso 0 → renderiza colado no agora, que clampa no último
  // ponto conhecido). A cláusula da posição intermediária TEM que ficar vermelha.
  const net2 = fakeNet(1);
  const g2 = montaJogo(net2);
  let agora2 = 1000;
  g2._mp._now = () => agora2;
  g2._mp.interpAtrasoMs = 0;      // o mutante
  net2.snap = snapshot(500.00, 1); g2._mp.applySnapshot();
  const c = g2._mp._netMap.get(6);
  const c0 = c._ipx1;
  agora2 = 1050;
  net2.snap = snapshot(500.05, 2, { mover: 1 }); g2._mp.applySnapshot();
  const c1 = c._ipx1;
  agora2 = 1145;
  g2._mp.updateRemoteBot(c, 1 / 60);
  cobra(!(c.pos.x > c0 + 0.01 && c.pos.x < c1 - 0.01),
    'MUTANTE sem buffer NÃO produz posição intermediária (a cláusula acima morde)');
  g2.dispose();
}

console.log('\n· cadência de 30 Hz reduz a latência visual sem perder o buffer');
{
  const net = fakeNet(1, 5, false, 30);
  const g = montaJogo(net);
  cobra(g._mp.snapshotHz === 30 && g._mp.interpAtrasoMs === 80,
    `welcome de 30 Hz escolhe buffer de 80 ms (${g._mp.interpAtrasoMs} ms), não herda 120 ms de 20 Hz`);
  g.dispose();
}

console.log('\n· troca de vaga preserva UI e remonta o casamento de corpos');
{
  const net = fakeNet(1);
  let uiSlots = 0;
  const uiHandler = () => { uiSlots++; };
  net.onSlot = uiHandler;
  const g = montaJogo(net);
  g._mp._netMap.set(99, g.player);
  g._mp._srvHas = 1;
  net.onSlot({ yourEnt: 6, yourTeam: 'B', espectador: false });
  cobra(uiSlots === 1, 'o handler da UI continua recebendo slot depois de o netcode instalar o seu');
  cobra(g._mp._netMap.size === 0 && g._mp._srvHas === 0,
    'trocar de time limpa casamento e reconciliação antigos antes do próximo snapshot');
  cobra(g.playerTeam === 'B' && g.enemyTeam === 'E' && g.player.team === 'B',
    'a vaga confirmada muda imediatamente o lado físico do Game e do jogador local');
  g.dispose();
  cobra(net.onSlot === uiHandler, 'dispose restaura o handler e não acumula wrappers a cada restart');
}

/* BUG-88 — "Problemas na hora de jogar". Um nó que aceita o TCP e nunca manda o `welcome`
   deixava o connect() PENDENTE pra sempre: sem erro, sem mensagem, o jogador clicava em
   ENTRAR e nada acontecia. O welcome tem prazo. */
console.log('\n· connect() tem PRAZO: nó que aceita e não responde vira erro, não espera eterna (BUG-88)');
{
  const { NetClient } = await import('../../public/js/net.js');
  // WebSocket de mentira: abre e fica MUDO (o modo de falha do relato)
  globalThis.WebSocket = class {
    constructor() { setTimeout(() => this.onopen && this.onopen(), 1); }
    send() {} close() { setTimeout(() => this.onclose && this.onclose(), 1); }
  };
  const net = new NetClient('ws://x/ws', { nome: 'EU' });
  const t0 = Date.now();
  // corrida com prazo PRÓPRIO: antes do conserto o connect ficava pendente pra sempre, e a
  // régua tem que medir isso como VERMELHO, não travar o processo junto.
  const res = await Promise.race([
    net.connect(250).then(() => null, (e) => e),
    new Promise((r) => setTimeout(() => r(new Error('pendente_para_sempre')), 1500)),
  ]);
  const erro = res;
  cobra(!!erro && String(erro.message).includes('timeout'), `welcome que não chega dentro do prazo REJEITA com timeout (deu: ${erro && erro.message})`);
  cobra(Date.now() - t0 < 2000, 'e rejeita no prazo pedido, não no infinito');

  // MUTANTE: sem prazo (Infinity) o connect fica pendente — prova que é o prazo que morde.
  const net2 = new NetClient('ws://x/ws', { nome: 'EU' });
  let assentou = false;
  net2.connect(Infinity).then(() => { assentou = true; }, () => { assentou = true; });
  await new Promise((r) => setTimeout(r, 600));
  cobra(!assentou, 'MUTANTE sem prazo fica pendente pra sempre (a cláusula acima morde)');
  net2.close();
}

console.log('\n· server browser mede RTT aquecido, não o custo único de TLS');
{
  const { NetClient, createRoom, sondarNos } = await import('../../public/js/net.js');
  const fetchReal = globalThis.fetch;
  let chamadas = 0;
  const fetchSonda = async () => {
    chamadas++;
    await new Promise((r) => setTimeout(r, chamadas === 1 ? 180 : 20));
    return new Response(JSON.stringify({ ok: true, players: 2, rooms: 4, regiao: 'eu' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
  globalThis.fetch = fetchSonda;
  const [no] = await sondarNos([{ id: 'xx', nome: 'Teste', url: 'wss://teste.invalid/ws' }], 1000);
  cobra(chamadas >= 2, `a sonda aquece a conexão antes de dar nota (${chamadas} chamada(s))`);
  cobra(no.ping < 80, `o ping publicado exclui o handshake único (${no.ping} ms, RTT fabricado 20 ms)`);
  cobra(no.ticketNode === 'eu', 'a autorização usa a região declarada pelo nó, não um apelido inventado pelo cliente');

  let autorizacao = '';
  globalThis.fetch = async (_url, init = {}) => {
    autorizacao = new Headers(init.headers).get('authorization') || '';
    return new Response('{"room":"r1"}', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  await createRoom('https://eu.example', { name: 'teste' }, 'ticket-criar');
  cobra(autorizacao === 'Bearer ticket-criar', 'criar sala envia o ticket no Authorization');
  const socket = new NetClient('wss://eu.example/ws', { room: 'r1', ticket: 'ticket-conectar' });
  cobra(new URL(socket.url).searchParams.get('ticket') === 'ticket-conectar', 'WebSocket leva o ticket curto na abertura');
  const mutanteTicket = new NetClient('wss://eu.example/ws', { room: 'r1' });
  cobra(!new URL(mutanteTicket.url).searchParams.has('ticket'), 'MUTANTE sem ticket fica distinguível e seria recusado pelo nó');

  chamadas = 0;
  globalThis.fetch = fetchSonda;
  const [mutante] = await sondarNos([{ id: 'xx', nome: 'Teste', url: 'wss://teste.invalid/ws' }], 1000, 1);
  cobra(mutante.ping >= 150, `MUTANTE com uma amostra volta a misturar TLS no ping (${mutante.ping} ms)`);

  let abortsDaSonda = 0;
  globalThis.fetch = async (_url, { signal } = {}) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(new Response(JSON.stringify({ players: 0, rooms: 0 }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })), 80);
    signal?.addEventListener('abort', () => {
      abortsDaSonda++;
      clearTimeout(timer);
      reject(new DOMException('aborted', 'AbortError'));
    }, { once: true });
  });
  const totalT0 = performance.now();
  const [expirou] = await sondarNos([{ id: 'xx', nome: 'Teste', url: 'wss://teste.invalid/ws' }], 100, 2);
  const totalDt = performance.now() - totalT0;
  cobra(!expirou.online && abortsDaSonda >= 1 && totalDt < 300,
    `o prazo cobre a sonda inteira e ABORTA as pendências, não reinicia por amostra (${totalDt.toFixed(0)} ms; ${abortsDaSonda} abort)`);
  globalThis.fetch = fetchReal;
}

console.log('\n· sair do multiplayer devolve o slot antes do close handshake');
{
  const { NetClient } = await import('../../public/js/net.js');
  const enviados = [], fechamentos = [];
  const net = new NetClient('wss://eu.example/ws', { room: 'funk-x-palhaco' });
  net.ws = {
    readyState: 1,
    send: (payload) => enviados.push(JSON.parse(payload)),
    close: (...args) => fechamentos.push(args),
  };
  net.close();
  cobra(enviados.length === 1 && enviados[0].type === 'leave',
    'NetClient envia leave explícito enquanto o socket ainda está aberto');
  cobra(fechamentos.length === 1 && fechamentos[0][0] === 1000 && fechamentos[0][1] === 'client_quit',
    'e depois inicia um close limpo e identificável');
}

console.log('\n· lado físico do multiplayer vem do servidor, não da facção visual');
{
  const fs = await import('node:fs');
  const { resolvePlayerSide, transitionSlot } = await import('../../public/js/net.js');
  const main = fs.readFileSync('public/js/main.js', 'utf8');
  let remontou = 0, terminou = false;
  const next = await transitionSlot(
    { yourEnt: 6, yourTeam: 'B', espectador: false },
    { faccaoE: 'F', faccaoB: 'C', roster: [{ id: 6, char: 'palhaco-mau' }] },
    { team: 'E', faction: 'F', enemyFaction: 'C', char: 'mandrake' },
    (id) => id === 'palhaco-mau',
    async (identidade) => {
      remontou++;
      await new Promise((r) => setTimeout(r, 5));
      terminou = identidade.team === 'B' && identidade.faction === 'C'
        && identidade.enemyFaction === 'F' && identidade.char === 'palhaco-mau';
    },
  );
  cobra(remontou === 1 && terminou && next.team === 'B' && next.char === 'palhaco-mau',
    'transição espectador→vaga executa e aguarda remount com lado, facção e corpo do servidor');
  cobra(/const side = resolvePlayerSide\(team, faction, online\);/.test(main),
    'o start real resolve lado E/B com a sessão do servidor');
  cobra(/startGame\(lado, personagem, faccaoDele, true\)/.test(main),
    'a entrada multiplayer marca explicitamente o start como online');
  cobra(/net\.onSlot = async \(m\) =>[\s\S]*await transitionSlot\([\s\S]*await startGame\(currentTeam, currentChar, currentEnemyFaction, true\)/.test(main),
    'o handler real liga a transição executável ao remount do Game');
  cobra(resolvePlayerSide('B', 'C', true) === 'B', 'lado B continua B mesmo quando a facção é Palhaços');
  cobra(resolvePlayerSide('E', 'F', true) === 'E', 'lado E continua E mesmo quando a facção é Funkeiros');
  cobra(resolvePlayerSide('B', 'C', false) === 'E', 'single-player preserva a regra visual anterior da facção');
  const mutante = main.replace(
    'const side = resolvePlayerSide(team, faction, online);',
    "const side = faction === 'B' ? 'B' : 'E';",
  );
  cobra(!/const side = resolvePlayerSide\(team, faction, online\);/.test(mutante),
    'MUTANTE que volta a inferir lado pela facção acende a cláusula de integração');
  const mutSlot = main.replace('await startGame(currentTeam, currentChar, currentEnemyFaction, true);', '');
  cobra(!/net\.onSlot = async \(m\) =>[\s\S]*await transitionSlot\([\s\S]*await startGame\(currentTeam, currentChar, currentEnemyFaction, true\)/.test(mutSlot),
    'MUTANTE sem remount deixa a cláusula espectador→vaga vermelha');
}

/* BUG-101 — "eu escolho single player e ele vai pra um servidor online". O caminho de
   SINGLE PLAYER passa `online=false`; esse valor tem que ser a fronteira que impede uma
   sessão MP velha de instalar netcode, mesmo se outra limpeza falhar. Ao sair da partida,
   a sessão também precisa ser zerada ANTES de fechar o socket, para o onClose síncrono não
   remontar a tela online. */
console.log('\n· multiplayer→sair→single player não reaproveita a sessão online (BUG-101)');
{
  const fs = await import('node:fs');
  const main = fs.readFileSync('public/js/main.js', 'utf8');
  const guard = /const sessao = online \? mpSessao : null;/;
  const usosGuardados = [
    /const tamanhoTime = sessao \?/,
    /const matchRoster = sessao \?/,
    /const matchWeapons = sessao\s*\?/,
    /settings: sessao \?/,
    /mpFactory: sessao \?/,
    /net: sessao \?/,
    /dedicated: !!\(sessao && sessao\.net\.espectador\)/,
  ];
  cobra(guard.test(main) && usosGuardados.every((re) => re.test(main)),
    'online=false isola o start single-player de roster, socket e netcode de qualquer sessão MP velha');

  const encerraAntes = /function mpEncerrarSessao\(\)\s*{[\s\S]{0,160}const s = mpSessao; mpSessao = null;[\s\S]{0,220}s\?\.net\.close\(\)/;
  const quitLimpa = /function quitToMenu\(\)\s*{[\s\S]{0,3200}mpEncerrarSessao\(\);/;
  cobra(encerraAntes.test(main) && quitLimpa.test(main),
    'SAIR PRO MENU zera a sessão e fecha o WebSocket antes de permitir uma partida offline');
  cobra(/localMp === '1'[\s\S]{0,120}return ''/.test(main),
    '?mp=1 não tenta emitir ticket público para o nó local de desenvolvimento');

  const mutSemFronteira = main.replace('const sessao = online ? mpSessao : null;', 'const sessao = mpSessao;');
  cobra(!guard.test(mutSemFronteira),
    'MUTANTE que ignora online=false acende a fronteira single-player');
  const mutSemLimpeza = main.replace('  mpEncerrarSessao();', '');
  cobra(!quitLimpa.test(mutSemLimpeza),
    'MUTANTE que mantém o socket ao sair acende a limpeza multiplayer→menu');
}

console.log('\n· remoto animado na velocidade REAL, nome vindo do servidor, tag [BOT] (02/09)');
{
  /* "Filme lento com glitch" (dono, 02/09): o animador GLB recebia `speed=0` — assinatura
     update(dt, moving, hasTarget, speed) chamada como (dt, spd, false). O clipe de andar rodava
     a 0,45× e nunca virava corrida enquanto o corpo deslizava a 2-6 m/s. Aqui o boneco remoto
     ganha um ctrl FALSO que registra a chamada: a velocidade tem que chegar no 4º argumento. */
  const net = fakeNet(1, 5);
  const g = montaJogo(net);
  net.snap = snapshot(1.00, 1); g.update(1 / 60);
  net.snap = snapshot(1.05, 2, { mover: 0.2 }); g.update(1 / 60);   // 0,2 m em 50 ms = 4 m/s
  const remoto = g.bots.find((b) => b._remote && b._remote !== 'ghost');
  const chamadas = [];
  remoto.mesh.isGLB = true;
  remoto.mesh.ctrl = { update: (...a) => chamadas.push(a), shoot() { chamadas.push(['shoot']); }, die() {}, revive() {} };
  g._mp.updateRemoteBot(remoto, 1 / 60);
  const u = chamadas.find((c) => c.length >= 4);
  cobra(!!u && u[3] > 3 && u[3] < 5, `a velocidade REAL (${u ? u[3].toFixed(2) : '?'} m/s) chega no argumento speed do animador`);
  cobra(!!u && u[1] === 1, 'e `moving` é a flag 0/1 (não a velocidade crua)');
  cobra(typeof remoto.mesh.ctrl.aimPitch === 'number', 'a cabeça do remoto recebe o pitch do servidor');
  // tiro do snapshot toca o clipe de tiro
  const s3 = snapshot(1.10, 3, { mover: 0.4 }); s3.ents.find((e) => e.id === remoto._netId).fire = 1;
  net.snap = s3; g.update(1 / 60);
  cobra(chamadas.some((c) => c[0] === 'shoot'), 'fire=1 no snapshot dispara o clipe de tiro do boneco remoto');
  // nome: vem do servidor a cada snapshot; bot leva a tag
  cobra(remoto.name === `[BOT] BOT${remoto._netId}` && remoto._nomeServidor === `BOT${remoto._netId}`,
    `bot é rotulado [BOT] na tela (${remoto.name}) e guarda o nome cru do servidor`);
  const s4 = snapshot(1.15, 4, { mover: 0.5 }); const e4 = s4.ents.find((e) => e.id === remoto._netId); e4.name = 'RUBAO'; e4.bot = 0;
  net.snap = s4; g.update(1 / 60);
  cobra(remoto.name === 'RUBAO', 'humano que toma o slot do bot aparece com o nome dele para quem já estava na sala');
  cobra(g._mp._corpoPorNome('RUBAO') === remoto, 'e o killfeed acha o corpo pelo nome do servidor');
  /* Fim de round: a máquina local está desligada no online; o feedback (placar, banner, tela
     de fim) vem da TRANSIÇÃO de estado do snapshot. "Congelou e recomeçou do nada" (02/09). */
  // morte de remoto: o feedback (sting, kill confirm quando VOCÊ mata) volta ao online
  const sons = []; const sfx0 = g.sfx;   // o sfx do arnês é um Proxy mudo: troca o objeto inteiro por um que registra
  g.sfx = new Proxy({}, { get: (_, k) => (...a) => { sons.push([k, ...a]); } });
  const s45 = snapshot(1.17, 45, { mover: 0.5 }); const v = s45.ents.find((e) => e.id === remoto._netId); v.alive = false; v.hp = 0; v.killedBy = 'EU';
  net.snap = s45; g.update(1 / 60);
  cobra(sons.some((x) => x[0] === 'death') && sons.some((x) => x[0] === 'killConfirm'), `morte de remoto pelo JOGADOR toca sting + kill confirm (${sons.map((x) => x[0]).join(',')})`);
  cobra(g.mk.count === 1 && g.mk.life === 1, 'e conta na sequência de abates (multikill)');
  g.sfx = sfx0;
  // pausa: um input parado a cada 2 s segura o slot (o servidor solta após 45 s sem input)
  net.enviados.length = 0; g.paused = true;
  g._mp._inputAt = 0; g._mp._pulsoDePausa();
  cobra(net.enviados.length === 1 && net.enviados[0].ax === 0 && net.enviados[0].shoot === false, 'pausado, o cliente manda um input PARADO (sem tiro) para não perder o corpo');
  g._mp._pulsoDePausa();
  cobra(net.enviados.length === 1, 'e não repete antes de 2 s');
  g.paused = false;
  const s5 = snapshot(1.20, 5); s5.state = 'roundEnd'; s5.scoreE = 3;   // E levou o round (2 -> 3)
  net.snap = s5; g.update(1 / 60);
  cobra(g.state === 'roundEnd' && !!g._resultado && /LEVARAM O ROUND/.test(g._resultado.titulo),
    `roundEnd do servidor abre o placar com o vencedor (${g._resultado && g._resultado.titulo})`);
  cobra(!g.el.scoreboard.classList.contains('hidden'), 'e o scoreboard fica visível');
  const s6 = snapshot(1.25, 6); s6.state = 'countdown'; s6.scoreE = 3; s6.roundNum = 4;
  net.snap = s6; g.update(1 / 60);
  cobra(g.state === 'countdown' && g._resultado === null && g.el.scoreboard.classList.contains('hidden'),
    'countdown do servidor fecha o placar e abre a rodada seguinte');
  const s7 = snapshot(1.30, 7); s7.state = 'matchEnd'; s7.scoreE = 3;
  net.snap = s7; g.update(1 / 60);
  cobra(g.state === 'matchEnd' && !g.el.matchEnd.classList.contains('hidden'), 'matchEnd do servidor mostra a tela de VITÓRIA/DERROTA');
  g.dispose();
}

console.log('\n· nova partida do servidor (`partida`) e viewmodel montado depois do preload (02/09)');
{
  const fs = await import('node:fs');
  const net = fs.readFileSync('public/js/net.js', 'utf8');
  const main = fs.readFileSync('public/js/main.js', 'utf8');
  const game = fs.readFileSync('public/js/game.js', 'utf8');
  cobra(/m\.type === 'partida'[\s\S]{0,400}this\.meta = m;[\s\S]{0,400}this\.onPartida\?\.\(m\)/.test(net),   // janela: entre a meta e o aviso entrou o zerar dos eventos
    'net.js troca a meta (roster/ids/mapa) e avisa em `partida` — sem isto o cliente fica no mapa velho com ids mortos');
  cobra(/net\.onPartida = async \(m\) => \{[\s\S]{0,400}mpMontarPartida\(net, m\)/.test(main),
    'main.js remonta a partida por cima quando o servidor gira o mapa');
  cobra(/mpMontarPartida\(net, welcome\)/.test(main), 'e o welcome usa o MESMO caminho (uma montagem só)');
  cobra(/this\._vmMontarTardio = \(id\) => \{[\s\S]{0,300}mountRw\(g, id\)[\s\S]{0,600}this\._vmFrame\(true\)/.test(game),   // janela: entre o mount e o enquadramento entrou o esconder da caixa (BUG-121)
    'game.js monta o GLB do viewmodel que chegou depois do construtor e re-enquadra');
  cobra(/_applyVmVisibility\(\) \{[\s\S]{0,120}this\._vmMontarTardio\?\.\(w\)/.test(game),
    'a troca de arma tenta a montagem tardia (idempotente)');
  cobra(/meuJogo\._applyVmVisibility\?\.\(\)/.test(main), 'o preload ocioso das 26 armas também tenta montar a arma na mão');
  cobra(/else if \(this\.vm && this\.vm\.root\) this\.vm\.root\.visible = false;/.test(game),
    'espectador (dedicated) não vê viewmodel parado na pose de construção');
  cobra(/nomeE = meta\.nomeE \|\| 'TIME E'/.test(main), 'botão do espectador diz o nome da FACÇÃO, não a letra do lado');
  const mutSemPartida = net.replace("m.type === 'partida'", "m.type === '__nunca__'");
  cobra(!/m\.type === 'partida'[\s\S]{0,400}this\.meta = m;/.test(mutSemPartida), 'MUTANTE sem o ramo `partida` acende a régua');
}


/* BUG-119 — "single player 200% melhor": paridade ponto a ponto. Online o _damage não roda no
   cliente, e com ele iam o hitmarker, o número de dano e a munição do respawn. */
console.log('\n· tiro que acerta online dá hitmarker e número de dano PREVISTOS, sem mexer no hp (BUG-119)');
{
  const net = fakeNet(1, 5, false, 30);
  const g = montaJogo(net);
  net.snap = snapshot(800.00, 1); g._mp.applySnapshot();
  g.state = 'live';
  const p = g.player, alvo = g.bots.find((b) => b.team !== p.team && b.alive);
  alvo.pos.set(p.pos.x, p.pos.y, p.pos.z - 3); alvo.mesh.group.position.copy(alvo.pos); alvo.mesh.group.updateMatrixWorld(true);
  let marcas = 0, numeros = 0;
  g._hitmarker = () => { marcas++; }; g._dmgNumber = () => { numeros++; };
  const from = new (alvo.pos.constructor)(p.pos.x, p.pos.y + 1.5, p.pos.z), dir = new (alvo.pos.constructor)(0, -0.1, -1).normalize();
  const hp0 = alvo.hp;
  g._fireHitscan(p, from, dir, 30, true, 'AK', 'ak');
  cobra(marcas === 1 && numeros === 1, `o raio local acertou o inimigo: hitmarker ${marcas}, número de dano ${numeros}`);
  cobra(alvo.hp === hp0, 'e o hp do remoto NÃO muda no cliente (autoridade é o snapshot)');
  // MUTANTE: sem o feedback previsto o tiro volta a ser mudo — a cláusula morde
  marcas = 0; numeros = 0; g._acertoPrevisto = () => {};
  g._fireHitscan(p, from, dir, 30, true, 'AK', 'ak');
  cobra(marcas === 0 && numeros === 0, 'MUTANTE sem _acertoPrevisto deixa o tiro mudo (a cláusula morde)');
  g.dispose();
}

console.log('\n· respawn por snapshot repõe munição e som como o _respawnPlayer do SP (BUG-119)');
{
  const net = fakeNet(1, 5, false, 30);
  const g = montaJogo(net);
  net.snap = snapshot(810.00, 1); g._mp.applySnapshot();
  const p = g.player, w = p.weapon;
  p.ammo[w].mag = 1; p.ammo[w].res = 0;
  const sons = []; const sfx0 = g.sfx; g.sfx = new Proxy({}, { get: (_, k) => (...a) => { sons.push(k); } });
  net.snap = snapshot(810.05, 2, { matarVoce: true }); g._mp.applySnapshot();
  net.snap = snapshot(810.10, 3); g._mp.applySnapshot();
  cobra(p.ammo[w].mag === WEAPONS[w].mag && p.ammo[w].res === WEAPONS[w].reserve, `renasceu com o pente cheio (${p.ammo[w].mag}/${p.ammo[w].res})`);
  cobra(sons.includes('respawn'), 'e com o som de respawn');
  g.sfx = sfx0; g.dispose();
}

/* BUG-122 — "o kill mostrando como se o bot tivesse me matando e não o contrário". A própria
   morte não entrava no killfeed, e o abate seu podia sair sem atacante quando o servidor
   trunca o apelido a 16 caracteres (room.js). */
console.log('\n· killfeed online: própria morte entra, e o abate SEU sai como VOCÊ mesmo com apelido truncado (BUG-122)');
{
  const net = fakeNet(1, 5, false, 30);
  const g = montaJogo(net);
  g.player.name = 'RUBENMARCUSDOSSANTOS';               // 20 caracteres: o servidor manda 16
  const feeds = []; g._feed = (a, v) => { feeds.push([a, v]); };
  const s1 = snapshot(820.00, 1); s1.ents[0].name = 'RUBENMARCUSDOSSA'; net.snap = s1; g._mp.applySnapshot();
  g.state = 'live';
  const bot = g._mp._netMap.get(6);
  const s2 = snapshot(820.05, 2); s2.ents[0].name = 'RUBENMARCUSDOSSA';
  const v2 = s2.ents.find((e) => e.id === 6); v2.alive = false; v2.hp = 0; v2.killedBy = 'RUBENMARCUSDOSSA';
  net.snap = s2; g._mp.applySnapshot();
  cobra(feeds.length === 1 && feeds[0][0] === g.player && feeds[0][1] === bot, 'você mata o bot: a linha é VOCÊ → bot (atacante primeiro), achado pelo nome do servidor');
  const s3 = snapshot(820.10, 3, { matarVoce: true }); s3.ents[0].name = 'RUBENMARCUSDOSSA'; s3.ents[0].killedBy = 'BOT7';
  net.snap = s3; g._mp.applySnapshot();
  cobra(feeds.length === 2 && feeds[1][0] === g._mp._netMap.get(7) && feeds[1][1] === g.player, 'o bot mata você: a linha é bot → VOCÊ (a própria morte entra no killfeed)');
  // MUTANTE: sem o nome do servidor o abate seu sai sem atacante
  g._mp._meuNomeServidor = null; feeds.length = 0;
  const s4 = snapshot(820.15, 4); s4.ents[0].name = ''; const v4 = s4.ents.find((e) => e.id === 8); v4.alive = false; v4.hp = 0; v4.killedBy = 'RUBENMARCUSDOSSA';
  net.snap = s4; g._mp.applySnapshot();
  cobra(feeds.length === 1 && feeds[0][0] === null, 'MUTANTE sem o nome do servidor perde o atacante (a cláusula morde)');
  g.dispose();
}

/* BUG-121 — "as armas sem model direito": o GLB que chega depois do construtor montava por
   DENTRO da caixa procedural, que continuava visível (só o construtor escondia a caixa). */
console.log('\n· GLB de arma que chega tarde esconde a caixa procedural (BUG-121)');
{
  unloadWeaponModel('awp');
  cobra(!hasWeapon('awp'), 'costura: a AWP ainda não chegou quando o jogo nasce');
  const net = fakeNet(1, 5, false, 30);
  const g = montaJogo(net);
  const caixa = g.vm.models.awp;
  const malhas = () => caixa.children.filter((c) => c.isMesh);
  cobra(!caixa.getObjectByName('rw') && malhas().length > 0 && malhas().every((m) => m.visible), `sem GLB o viewmodel da AWP é a caixa (${malhas().length} malhas visíveis)`);
  // "chegou": um GLB sintético no cache (o arnês não tem rede nem GLTFLoader de disco)
  const glb = new THREE.Group(); glb.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.1), new THREE.MeshStandardMaterial()));
  setWeaponModel('awp', glb);
  cobra(g._vmMontarTardio('awp') === true, 'a AWP chega e monta tarde');
  cobra(!!caixa.getObjectByName('rw') && malhas().every((m) => !m.visible), 'com o GLB montado TODAS as malhas da caixa somem');
  unloadWeaponModel('awp');
  g.dispose();
}

/* BUG-123 — fim de partida online: o servidor gira o mapa (`partida`), então a tela não pode
   oferecer JOGAR NOVAMENTE; ela avisa que o próximo mapa está carregando. */
console.log('\n· fim de partida online esconde JOGAR NOVAMENTE e avisa o próximo mapa (BUG-123)');
{
  const net = fakeNet(1, 5, false, 30);
  const g = montaJogo(net);
  net.snap = snapshot(830.00, 1); g._mp.applySnapshot();
  g._endMatch();
  cobra(g.el.btnAgain.classList.contains('hidden') && !g.el.matchNext.classList.contains('hidden'), 'online: sem JOGAR NOVAMENTE, com PRÓXIMO MAPA CARREGANDO');
  g.dispose();
  const g2 = montaJogo(null);
  g2._endMatch();
  cobra(!g2.el.btnAgain.classList.contains('hidden') && g2.el.matchNext.classList.contains('hidden'), 'single player: JOGAR NOVAMENTE continua');
  g2.dispose();
}

/* BUG-124 — "no singleplayer temos que indicar que são [BOT] também". */
console.log('\n· bots rotulados [BOT] no single player, uma vez só no online (BUG-124)');
{
  const g = montaJogo(null);
  cobra(g.bots.length > 0 && g.bots.every((b) => b.name.startsWith('[BOT] ')), `single player: ${g.bots[0].name}`);
  g.dispose();
  const net = fakeNet(1, 5, false, 30);
  const g2 = montaJogo(net);
  cobra(g2.bots.every((b) => !b.name.startsWith('[BOT] ')), 'online: o corpo local nasce sem rótulo (o snapshot rotula)');
  net.snap = snapshot(840.00, 1); g2._mp.applySnapshot();
  const r = g2._mp._netMap.get(6);
  cobra(r.name === 'BOT6' || r.name === '[BOT] BOT6', `online: rótulo vem do snapshot uma vez só (${r.name})`);
  cobra(!/\[BOT\] \[BOT\]/.test(r.name), 'sem rótulo dobrado');
  g2.dispose();
}

/* EVENTOS DO SERVIDOR (`ev`) — fecha a pendência de protocolo da BUG-90: o servidor conta
   acerto e abate com autor, arma e headshot; o cliente para de deduzir de deltas. Sem a flag
   `events` no welcome o caminho velho (killedBy + atirador mais próximo) continua. */
console.log('\n· eventos do servidor: arco de dano para o atacante REAL, não para o mais perto (BUG-90)');
function cenarioEv(events = 1) {
  const net = fakeNet(1, 5, false, 30, events);
  const g = montaJogo(net);
  let agora = 1000; g._mp._now = () => agora;
  net.snap = snapshot(900.00, 1); g._mp.applySnapshot();
  g.state = 'live';
  const p = g.player, perto = g._mp._netMap.get(6), longe = g._mp._netMap.get(7);
  perto.pos.set(p.pos.x + 2, p.pos.y, p.pos.z); longe.pos.set(p.pos.x + 20, p.pos.y, p.pos.z);
  perto._fireAtMs = agora - 100;                       // o mais perto atirou há 100 ms: a heurística escolheria ele
  const arcos = []; g._dmgArc = (att) => { arcos.push(att); };
  const feeds = []; g._feed = (a, v, w, h) => { feeds.push({ a, v, w, h }); };
  return { net, g, p, perto, longe, arcos, feeds, tick: (n) => { agora += 33; return n; } };
}
{
  const c = cenarioEv(1);
  const { net, g, perto, longe, arcos } = c;
  net.events.push({ type: 'ev', tick: 2, t: 900.033, list: [{ k: 'hit', a: longe._netId, v: 1, d: 20, h: 0, w: 'AK' }] });
  net.snap = snapshot(900.033, 2, { hpVoce: 80 }); g._mp.applySnapshot();
  cobra(arcos.length === 1 && arcos[0] === longe, `o arco aponta para quem o SERVIDOR disse (${arcos[0] && arcos[0].name}), não para o mais perto`);
  cobra(!!g._lastHit && g._lastHit.name === longe.name && g._lastHit.dmg === 20, 'o painel de morte guarda o atacante, a arma e o dano do evento');
  g.dispose();
  // MUTANTE: sem a flag o cliente volta à heurística e aponta para o mais perto — a cláusula morde
  const m = cenarioEv(0);
  m.net.events.push({ type: 'ev', tick: 2, t: 900.033, list: [{ k: 'hit', a: m.longe._netId, v: 1, d: 20, h: 0, w: 'AK' }] });
  m.net.snap = snapshot(900.033, 2, { hpVoce: 80 }); m.g._mp.applySnapshot();
  cobra(m.arcos.length === 1 && m.arcos[0] === m.perto, 'MUTANTE sem `events` no welcome cai na heurística (compat com nó velho) — a cláusula morde');
  m.g.dispose();
}

console.log('\n· `kill` do servidor: uma linha de feed, com caveira, e a própria morte com painel rico');
{
  const c = cenarioEv(1);
  const { net, g, perto, feeds } = c;
  const vitima = g._mp._netMap.get(8);
  // abate remoto: o evento e a transição alive chegam no MESMO tick — só UMA linha
  net.events.push({ type: 'ev', tick: 2, t: 900.033, list: [{ k: 'kill', a: perto._netId, v: 8, d: 35, h: 1, w: 'AWP' }] });
  const s2 = snapshot(900.033, 2); const e8 = s2.ents.find((e) => e.id === 8); e8.alive = false; e8.hp = 0; e8.killedBy = 'BOT6';
  net.snap = s2; g._mp.applySnapshot();
  cobra(feeds.length === 1 && feeds[0].a === perto && feeds[0].v === vitima && feeds[0].h === true && feeds[0].w === 'AWP', `abate remoto: UMA linha (${feeds.length}), atacante do evento, caveira e arma do evento`);
  // a própria morte: painel rico vem do `kill` (autor, arma, headshot), sem depender do nome
  net.events.push({ type: 'ev', tick: 3, t: 900.066, list: [{ k: 'kill', a: perto._netId, v: 1, d: 100, h: 1, w: 'AWP' }] });
  net.snap = snapshot(900.066, 3, { matarVoce: true }); g._mp.applySnapshot();
  cobra(feeds.length === 2 && feeds[1].a === perto && feeds[1].v === g.player, 'a própria morte entra no feed pelo evento, com o atacante certo');
  cobra(!!g._lastHit && g._lastHit.name === perto.name && g._lastHit.head === true && g._lastHit.weap === 'AWP', 'MORTO POR com arma e headshot do servidor');
  g.dispose();
}

console.log('\n· eventos antes do primeiro snapshot, fora de ordem e para espectador');
{
  const net = fakeNet(1, 5, false, 30, 1);
  const g = montaJogo(net);
  const feeds = []; g._feed = (a, v) => { feeds.push([a, v]); };
  const sons = []; g.sfx = new Proxy({}, { get: (_, k) => (...a) => { sons.push(k); } });
  net.events.push({ type: 'ev', tick: 1, t: 910.00, list: [{ k: 'kill', a: 6, v: 8, d: 1, h: 0, w: 'AK' }] });
  const s1 = snapshot(910.00, 1); const e8 = s1.ents.find((e) => e.id === 8); e8.alive = false; e8.hp = 0;
  net.snap = s1; g._mp.applySnapshot();
  cobra(feeds.length === 0 && !sons.includes('death'), 'lote do tick de entrada é estado herdado: sem feed, sem som');
  cobra(net.events.length === 0, 'e foi consumido (não fica pendurado)');
  net.events.push({ type: 'ev', tick: 9, t: 910.30, list: [{ k: 'kill', a: 6, v: 9, d: 1, h: 0, w: 'AK' }] });
  net.snap = snapshot(910.033, 2); g._mp.applySnapshot();
  cobra(feeds.length === 0 && net.events.length === 1, 'lote de tick FUTURO espera o snapshot dele');
  net.snap = snapshot(910.30, 9); g._mp.applySnapshot();
  cobra(feeds.length === 1 && net.events.length === 0, 'e é aplicado quando o snapshot do tick chega');
  g.dispose();
  const netS = fakeNet(null, 5, false, 30, 1);
  const gs = montaJogo(netS, { dedicated: true });
  const arcos = []; gs._dmgArc = (a) => { arcos.push(a); };
  netS.snap = snapshot(920.00, 1, { yourEnt: -1 }); gs._mp.applySnapshot();
  netS.events.push({ type: 'ev', tick: 2, t: 920.033, list: [{ k: 'hit', a: 6, v: 1, d: 20, h: 0, w: 'AK' }, { k: 'kill', a: 6, v: 1, d: 80, h: 0, w: 'AK' }] });
  netS.snap = snapshot(920.033, 2, { yourEnt: -1 }); gs._mp.applySnapshot();
  cobra(arcos.length === 0, 'espectador nunca recebe arco de dano nem "você" por evento');
  gs.dispose();
}

console.log('\n· NetClient: `ev` entra no buffer, `partida` zera, lote grande é cortado');
{
  const { NetClient } = await import('../../public/js/net.js');
  class WsFalso { constructor() { WsFalso.ultimo = this; this.readyState = 1; this.OPEN = 1; } send() {} close() {} }
  const ws0 = globalThis.WebSocket; globalThis.WebSocket = WsFalso;
  const cli = new NetClient('ws://x/ws');
  const conectando = cli.connect();
  const ws = WsFalso.ultimo;
  ws.onopen && ws.onopen();
  ws.onmessage({ data: JSON.stringify({ type: 'welcome', yourEnt: 1, yourTeam: 'E', espectador: false, events: 1, snapshotHz: 30 }) });
  await conectando;
  ws.onmessage({ data: JSON.stringify({ type: 'ev', tick: 5, t: 1, list: Array.from({ length: 40 }, () => ({ k: 'hit', a: 1, v: 2, d: 1, h: 0, w: 'AK' })) }) });
  cobra(cli.events.length === 1 && cli.events[0].list.length === 32, `lote de 40 vira 32 no cliente (${cli.events[0] && cli.events[0].list.length})`);
  ws.onmessage({ data: JSON.stringify({ type: 'ev', tick: 'x', list: [] }) });
  cobra(cli.events.length === 1, 'lote sem tick inteiro é ignorado');
  ws.onmessage({ data: JSON.stringify({ type: 'partida', yourEnt: 2, yourTeam: 'E', espectador: false, events: 1 }) });
  cobra(cli.events.length === 0, '`partida` zera o buffer de eventos (junto com snap/prev)');
  globalThis.WebSocket = ws0;
}

/* FASE 2 DO CANAL `ev` — drops. O servidor manda `drop {i,x,z,w,ttl}` e `gone {i}`; o cliente
   cria e remove por id, o rack do spawn fica intocado, o E manda `pick` e não dropa a arma
   antiga localmente (o servidor manda o `drop` dela), e quem entra no meio recebe `meta.drops`. */
console.log('\n· drops do servidor: cria e some por id, rack intocado, countdown limpa (fase 2)');
{
  const net = fakeNet(1, 5, false, 30, 1);
  const g = montaJogo(net);
  net.snap = snapshot(930.00, 1); g._mp.applySnapshot();
  g.state = 'live';
  const rackAntes = g.drops.filter((d) => d.rack).length;
  const p = g.player;
  net.events.push({ type: 'ev', tick: 2, t: 930.033, list: [
    { k: 'drop', i: 9001, x: p.pos.x + 1, z: p.pos.z + 1, w: 'ak', ttl: 18 },
    { k: 'drop', i: 9002, x: p.pos.x + 3, z: p.pos.z + 1, w: 'awp', ttl: 18 },
  ] });
  net.snap = snapshot(930.033, 2); g._mp.applySnapshot();
  const rede = () => g.drops.filter((d) => d._nid);
  cobra(rede().length === 2 && rede().every((d) => !d.rack && d.mesh) && g.drops.filter((d) => d.rack).length === rackAntes, `dois drops de rede com id, com malha, e o rack do spawn intocado (${rackAntes})`);
  net.events.push({ type: 'ev', tick: 3, t: 930.066, list: [{ k: 'drop', i: 9001, x: 0, z: 0, w: 'ak', ttl: 18 }] });
  net.snap = snapshot(930.066, 3); g._mp.applySnapshot();
  cobra(rede().length === 2, '`drop` repetido com o mesmo id não duplica');
  net.events.push({ type: 'ev', tick: 4, t: 930.10, list: [{ k: 'gone', i: 9001 }, { k: 'gone', i: 7777 }] });
  net.snap = snapshot(930.10, 4); g._mp.applySnapshot();
  cobra(rede().length === 1 && rede()[0]._nid === 9002, '`gone` some com o drop certo e ignora id desconhecido');
  // E num drop de rede: manda `pick` UMA vez, troca a arma na hora (predição) e NÃO dropa a antiga localmente
  const alvo = rede()[0]; const armaAntes = p.weapon;
  g.nearPickup = { pk: alvo, dropIdx: g.drops.indexOf(alvo) };
  const dropsAntes = g.drops.length;
  g._kd({ code: 'KeyE', preventDefault() {} });
  net.enviados.length = 0;
  g._mp.stepPlayer(p, { ax: 0, az: 0, crouch: false, shift: false, jump: false });
  g._mp.stepPlayer(p, { ax: 0, az: 0, crouch: false, shift: false, jump: false });
  cobra(net.enviados.length === 2 && net.enviados[0].pick === 9002 && net.enviados[1].pick === undefined, 'o E manda `pick` com o id do drop UMA vez');
  cobra(p.weapon === 'awp' && armaAntes !== 'awp', `a arma troca na hora (predição): ${armaAntes} → ${p.weapon}`);
  cobra(g.drops.length === dropsAntes && !g.drops.some((d) => !d.rack && !d._nid), 'a arma antiga NÃO vira drop local (o servidor manda o `drop` dela)');
  // countdown (rodada nova): o servidor limpa `drops` sem `gone`; o cliente espelha
  const s5 = snapshot(930.50, 5); s5.state = 'countdown'; net.snap = s5; g._mp.applySnapshot();
  cobra(rede().length === 0 && g.drops.filter((d) => d.rack).length === rackAntes, 'countdown remove os drops de rede e deixa o rack');
  g.dispose();
}

console.log('\n· quem entra no meio recebe os drops vivos por `meta.drops`');
{
  const net = fakeNet(1, 5, false, 30, 1);
  net.meta.drops = [{ i: 9101, x: 4, z: 14, w: 'mp5', ttl: 9 }, { i: 9102, x: 6, z: 14, w: 'ak', ttl: 3 }];
  const g = montaJogo(net);
  net.snap = snapshot(940.00, 1); g._mp.applySnapshot();
  const rede = g.drops.filter((d) => d._nid);
  cobra(rede.length === 2 && rede.some((d) => d._nid === 9101 && d.weapon === 'mp5'), 'os drops da meta nascem no primeiro snapshot, por id');
  g.dispose();
}

console.log('\n· online, ninguém pega drop andando por cima no cliente (o servidor é quem decide)');
{
  const net = fakeNet(1, 5, false, 30, 1);
  const g = montaJogo(net);
  net.snap = snapshot(950.00, 1); g._mp.applySnapshot();
  g.state = 'live';
  const b = g._mp._netMap.get(6);
  net.events.push({ type: 'ev', tick: 2, t: 950.033, list: [{ k: 'drop', i: 9201, x: b.pos.x, z: b.pos.z, w: 'ak', ttl: 18 }] });
  net.snap = snapshot(950.033, 2); g._mp.applySnapshot();
  g._updatePickups();
  cobra(g.drops.some((d) => d._nid === 9201), 'o corpo remoto em cima do drop não o consome localmente (sem `gone`, o drop fica)');
  g.dispose();
}

/* BUG-117 — "o assistir ta meio esquisito". A câmera do espectador ficava nos OLHOS do alvo,
   dentro do corpo remoto (captura: o interior do chapéu), só andava a cada snapshot, e o HUD
   oferecia "[E] PEGAR SKS" a quem não tem corpo. */
console.log('\n· espectador assiste em 3ª pessoa, por quadro, e sem hint de pickup (BUG-117)');
{
  const net = fakeNet(null, 5, false, 30);
  const g = montaJogo(net, { dedicated: true });
  let agora = 1000;
  g._mp._now = () => agora;
  net.snap = snapshot(200.00, 1, { yourEnt: -1 }); g._mp.applySnapshot();
  const a = g._mp._alvoSpec;
  const olhos = () => ({ x: a.pos.x, y: a.pos.y + 1.62, z: a.pos.z });
  const cam = g.camera.position;
  const dist = () => { const o = olhos(); return Math.hypot(cam.x - o.x, cam.y - o.y, cam.z - o.z); };
  cobra(dist() >= 1.2, `câmera a ≥ 1,2 m dos olhos do alvo, não dentro da cabeça (${dist().toFixed(2)} m)`);
  // bot da IA anda e olha para (sin yaw, cos yaw) — "mesh forward is +Z" (game.js); a câmera fica ATRÁS disso
  const fx = Math.sin(a.yaw || 0), fz = Math.cos(a.yaw || 0);
  const o = olhos();
  cobra((cam.x - o.x) * fx + (cam.z - o.z) * fz < -0.5, 'câmera ATRÁS do bot (vê as costas dele), olhando na direção em que ele anda');
  cobra(Math.abs(Math.abs(g.camera.rotation.y - (a.yaw || 0)) - Math.PI) < 1e-6, 'a câmera olha para onde o bot anda (yaw + π na convenção da câmera)');
  // humano remoto: yaw vem da câmera dele (frente = -sin/-cos); o corpo tem que girar +π para não andar de costas
  const h = g._mp._netMap.get(7); h._netBot = false; h.alive = true;
  g._mp.updateRemoteBot(h, 1 / 60);
  const rotH = h.mesh.group.rotation.y, rotB = (() => { const bb = g._mp._netMap.get(8); g._mp.updateRemoteBot(bb, 1 / 60); return bb.mesh.group.rotation.y; })();
  cobra(Math.abs(Math.abs(rotH - h.yaw) - Math.PI) < 1e-6 && Math.abs(rotB - g._mp._netMap.get(8).yaw) < 1e-6,
    `corpo do humano remoto gira yaw+π e o do bot gira yaw (humano ${rotH.toFixed(2)}, bot ${rotB.toFixed(2)})`);
  g._mp._alvoSpec = h; g._mp.cameraEspectador();
  const oh = { x: h.pos.x, z: h.pos.z }, hx = -Math.sin(h.yaw), hz = -Math.cos(h.yaw);
  cobra((cam.x - oh.x) * hx + (cam.z - oh.z) * hz < -0.5, 'assistindo um HUMANO a câmera também fica atrás dele (convenção da câmera)');
  g._mp._alvoSpec = a; g._mp.cameraEspectador();
  // segue por quadro: entre dois snapshots o corpo interpola e a câmera vai junto
  agora = 1033; net.snap = snapshot(200.0333, 2, { yourEnt: -1, mover: 0.1 }); g._mp.applySnapshot();
  agora = 1066; net.snap = snapshot(200.0667, 3, { yourEnt: -1, mover: 0.2 }); g._mp.applySnapshot();
  agora = 1100; net.snap = snapshot(200.1000, 4, { yourEnt: -1, mover: 0.3 }); g._mp.applySnapshot();
  g.state = 'live';
  agora = 1120; g.update(1 / 60); const cx1 = cam.x;
  agora = 1136; g.update(1 / 60); const cx2 = cam.x;
  cobra(cx2 > cx1 + 0.001, `a câmera anda ENTRE snapshots, com o corpo interpolado (${cx1.toFixed(3)} → ${cx2.toFixed(3)})`);
  // hint de pickup: arma aos pés do "jogador" do espectador, e o HUD não pode oferecer
  const p = g.player;
  g._dropWeapon(p.pos.x, p.pos.z, 'ak', true, 0.01);
  g._updatePickups();
  cobra(g.el.pickupHint.classList.contains('hidden'), 'espectador NÃO vê "[E] PEGAR" (não tem corpo pra pegar nada)');
  // MUTANTE 1: hint sem saber que é espectador — a cláusula acima morde
  g.espectando = () => false;
  g._pkHintW = null; g._pkHintLivre = 0; g._updatePickups();
  cobra(!g.el.pickupHint.classList.contains('hidden'), 'MUTANTE sem a guarda de espectador mostra o hint (a cláusula morde)');
  g.espectando = () => true;
  // MUTANTE 2: câmera colada nos olhos (specDist 0) — volta para dentro da cabeça
  g._mp.specDist = 0; g._mp.cameraEspectador();
  cobra(dist() < 1.2, `MUTANTE com a câmera nos olhos fica dentro da cabeça (${dist().toFixed(2)} m) — a cláusula morde`);
  g.dispose();
}

/* BUG-118 — "ainda parece travado e robótico". O buffer do BUG-87 era indexado pelo instante
   de CHEGADA: em produção a HUD mostrava `gap 35 ms · últ 0` (dois snapshots no mesmo ms). No
   relógio de chegada isso é um tick inteiro em 0 ms seguido de meio tick por ms — o boneco
   anda 0,5× · salta · 1×. Indexado pelo tempo do SERVIDOR, a rajada some: quem chega
   atrasado só encurta a folga do buffer, nunca deforma a estrada. */
console.log('\n· chegada em RAJADA não altera a velocidade visual dos remotos (BUG-118)');
function medeRajada(g, net) {
  const HZ = 30, TICK = 1000 / HZ, V = 3;          // bot a 3 m/s, servidor a 30 Hz
  const eventos = [];
  for (let k = 0; k < 14; k++) {
    // a cada 3 ticks um pacote chega 1 tick atrasado — junto com o seguinte (rajada de 2)
    const chegada = 1000 + k * TICK + (k % 3 === 1 ? TICK : 0);
    eventos.push({ chegada, snap: snapshot(k * TICK / 1000, k + 1, { mover: V * k * TICK / 1000 }) });
  }
  eventos.sort((a, b) => a.chegada - b.chegada || a.snap.tick - b.snap.tick);
  let agora = 1000, i = 0;
  g._mp._now = () => agora;
  const b = () => g._mp._netMap.get(6);
  const xs = [];
  for (agora = 1000; agora <= 1400; agora += 4) {
    while (i < eventos.length && eventos[i].chegada <= agora) { net.snap = eventos[i].snap; g._mp.applySnapshot(); i++; }
    if (!b()) continue;
    g._mp.updateRemoteBot(b(), 0.004);
    if (agora >= 1200) xs.push(b().pos.x);        // buffer aquecido: mede 200 ms de estrada
  }
  const dx = xs.slice(1).map((x, j) => x - xs[j]);
  const esperado = V * 0.004;
  return { max: Math.max(...dx), min: Math.min(...dx), esperado, quadros: dx.length };
}
{
  const net = fakeNet(1, 5, false, 30);
  const g = montaJogo(net);
  const m = medeRajada(g, net);
  cobra(m.quadros >= 40, `mediu ${m.quadros} quadros de 4 ms com o buffer aquecido`);
  cobra(m.min > m.esperado * 0.7 && m.max < m.esperado * 1.3,
    `deslocamento por quadro fica entre 0,7× e 1,3× do esperado (${(m.min * 1000).toFixed(1)}–${(m.max * 1000).toFixed(1)} mm, esperado ${(m.esperado * 1000).toFixed(1)} mm)`);
  cobra(m.min > 0, `nenhum quadro parado durante a rajada (mínimo ${(m.min * 1000).toFixed(2)} mm)`);
  g.dispose();

  // MUTANTE: volta ao relógio de CHEGADA (buffer e instante renderizado no wall-clock). A
  // cláusula da faixa 0,7×–1,3× TEM que ficar vermelha.
  const net2 = fakeNet(1, 5, false, 30);
  const g2 = montaJogo(net2);
  g2._mp._relogioSnap = (snap, nowMs) => nowMs;
  g2._mp._relogioAgora = () => g2._mp._now();
  const m2 = medeRajada(g2, net2);
  cobra(!(m2.min > m2.esperado * 0.7 && m2.max < m2.esperado * 1.3),
    `MUTANTE no relógio de chegada sai da faixa (${(m2.min * 1000).toFixed(1)}–${(m2.max * 1000).toFixed(1)} mm) — a cláusula morde`);
  g2.dispose();
}

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
