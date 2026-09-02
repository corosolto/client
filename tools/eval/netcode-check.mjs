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
function fakeNet(yourEnt, teamSize = 5, ctf = false, snapshotHz = 20) {
  return {
    yourEnt, yourTeam: 'E', espectador: yourEnt == null,
    meta: { room: 'r1', map: 'praca_poderes', ctf, teamSize, maxPlayers: teamSize * 2, snapshotHz },
    snap: null, prev: null, enviados: [],
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
  cobra(/m\.type === 'partida'[\s\S]{0,400}this\.meta = m;[\s\S]{0,200}this\.onPartida\?\.\(m\)/.test(net),
    'net.js troca a meta (roster/ids/mapa) e avisa em `partida` — sem isto o cliente fica no mapa velho com ids mortos');
  cobra(/net\.onPartida = async \(m\) => \{[\s\S]{0,400}mpMontarPartida\(net, m\)/.test(main),
    'main.js remonta a partida por cima quando o servidor gira o mapa');
  cobra(/mpMontarPartida\(net, welcome\)/.test(main), 'e o welcome usa o MESMO caminho (uma montagem só)');
  cobra(/this\._vmMontarTardio = \(id\) => \{[\s\S]{0,300}mountRw\(g, id\)[\s\S]{0,300}this\._vmFrame\(true\)/.test(game),
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

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
