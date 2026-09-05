/* NETCODE DO CLIENTE. O game.js só chama ganchos `this._mp?.xxx()` e nunca importa este
   arquivo; quem injeta é o main.js. Desenho e decisões: docs/MULTIPLAYER.md. */
import * as THREE from 'three';
import { poseCharacter } from './characters.js';
import { WEAPONS } from './game.js';
import { frase } from './i18n.js';

export function makeNetcode(game, net) { return new Netcode(game, net); }

class Netcode {
  constructor(game, net) {
    this.game = game;
    this.net = net;
    this._netMap = new Map();   // id do servidor -> entidade local
    this._netTick = -1;
    this._alvoSpec = null;      // quem o espectador está seguindo
    this.specDist = 1.7;        // câmera do espectador: metros atrás do ombro do alvo (BUG-117)
    this._evOn = !!(net.meta && net.meta.events);   // servidor manda `ev`; sem a flag, heurística velha (BUG-90)
    /* BUFFER DE INTERPOLAÇÃO (~2,4 snapshots). Renderizar o remoto algumas amostras no
       passado é o que absorve o jitter: um pacote atrasado ainda tem estrada bufferizada
       pela frente, em vez de clampar no último ponto e CONGELAR o boneco (BUG-87). */
    this.snapshotHz = Math.max(1, Number(net.meta?.snapshotHz) || 20);
    this.interpAtrasoMs = Math.max(75, Math.min(140, 2400 / this.snapshotHz));
    this._tAt = []; this._tT = [];   // chegada ↔ tempo-de-servidor dos últimos snapshots
    this._offMs = null;               // chegada − t·1000 (mínimo da janela, deslizado) — BUG-118
    // Predições indexadas pelo seq que o snapshot v4 reconhece. Arrays planos evitam objeto
    // por quadro no hot path; 180 entradas cobrem 3 s a 60 fps antes do fallback de desync.
    this._predSeq = []; this._predX = []; this._predY = []; this._predZ = [];
    this._corrX = 0; this._corrY = 0; this._corrZ = 0;
    this._ackSeq = 0; this._ackOn = false; this._authWeapon = null;
    this._loadoutSeq = 0;
    this._reconcileSamples = []; this._reconcileWindow = []; this._reconcileCount = 0; this._reconcileMax = 0;
    net.startPing();
    // Interval PRÓPRIO: o overlay segue vivo na pausa (o WS continua recebendo snapshots).
    this._nsTimer = setInterval(() => { this.updateStats(); this._pulsoDePausa(); }, 250);
    this._nextClientStats = this._now() + 2000;
    // trocar de time / virar espectador remonta o casamento de ids na próxima nevada
    this._prevOnSlot = net.onSlot;
    this._onSlot = (m) => {
      this._netMap.clear(); this._srvHas = 0; this._clearPrediction();
      if (m.yourTeam === 'E' || m.yourTeam === 'B') {
        this.game.playerTeam = m.yourTeam;
        this.game.enemyTeam = m.yourTeam === 'B' ? 'E' : 'B';
        if (this.game.player) this.game.player.team = m.yourTeam;
      }
      this._prevOnSlot?.(m);
    };
    net.onSlot = this._onSlot;
  }

  dispose() {
    if (this._nsTimer) { clearInterval(this._nsTimer); this._nsTimer = null; }
    try { this.net.stopPing(); } catch { /* já fechada */ }
    if (this._nsEl) { this._nsEl.remove(); this._nsEl = null; try { document.body.classList.remove('net-overlay'); } catch { /* sem DOM */ } }
    if (this.net.onSlot === this._onSlot) this.net.onSlot = this._prevOnSlot;
  }

  get espectador() { return this.net.espectador || this.net.yourEnt == null; }

  // Relógio de parede do netcode — indireção para a régua fabricar jitter determinístico.
  _now() { return performance.now(); }

  /* Tempo-de-SERVIDOR que o cliente está renderizando os remotos AGORA (entre os dois últimos
     snapshots). Vai no input para o servidor rebobinar as hitboxes exatamente para cá (lag
     compensation) — é o que faz o tiro cair onde você VIU o alvo, e não onde ele já está. */
  renderTime() {
    // Mesmo relógio da interpolação (BUG-118): o rewind cai exatamente no que a tela mostrou.
    const t = this._tT;
    if (t.length) {
      const rt = (this._relogioAgora() - this.interpAtrasoMs) / 1000;
      return Math.min(t[t.length - 1], Math.max(t[0], rt));   // nunca à frente do último snapshot
    }
    return this._snapCurT || 0;
  }

  // Relógio do buffer dos remotos = tempo do SERVIDOR, não a chegada (BUG-118, KNOWN-BUGS.md).
  // Costura da régua: o mutante troca os dois pelo relógio de chegada.
  _relogioSnap(snap, nowMs) { return Number.isFinite(snap.t) ? snap.t * 1000 : nowMs; }
  _relogioAgora() { return this._offMs == null ? this._now() : this._now() - this._offMs; }

  /* Chamado pelo game._updatePlayer logo DEPOIS do _moveEntity (a predição já aconteceu na
     tela). Reconcilia com a pose autoritativa e manda o input pro servidor. */
  stepPlayer(p, input, dt = 1 / 60) {
    if (this.espectador) return;
    if (this._ackOn) {
      const a = 1 - Math.exp(-14 * Math.max(0, Math.min(0.05, Number(dt) || 0)));
      const dx = this._corrX * a, dy = this._corrY * a, dz = this._corrZ * a;
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 1e-7) {
        p.pos.x += dx; p.pos.y += dy; p.pos.z += dz;
        // A base local mudou; poses antigas precisam mudar junto para o próximo ack não
        // cobrar de novo a parcela que já foi aplicada.
        for (let i = 0; i < this._predSeq.length; i++) {
          this._predX[i] += dx; this._predY[i] += dy; this._predZ[i] += dz;
        }
        this._corrX -= dx; this._corrY -= dy; this._corrZ -= dz;
      }
    } else if (this._srvHas) {
      const err = Math.hypot(this._srvX - p.pos.x, this._srvZ - p.pos.z);
      /* Só corrige desync REAL: o adiantamento normal da predição é esperado, e "corrigi-lo"
         é justamente o rubber-banding que as pessoas chamam de lag. */
      if (err > 2.5) { p.pos.set(this._srvX, this._srvY, this._srvZ); p.vel.set(0, 0, 0); }
    }
    // px/py/pz = a posição PREDITA de onde você mira. O servidor atira DESTA origem (validada
    // dentro de 3 m); sem isso o raio sai da posição dele — atrasada pelo RTT — e passa ao lado.
    const tinhaIntent = p.weapon !== this._authWeapon || this._pickPendente
      || this._pickupWeaponPendente || this._reloadPendente;
    const seq = this.net.sendInput({
      ax: input.ax, az: input.az, crouch: input.crouch, shift: input.shift, jump: input.jump,
      yaw: p.yaw, pitch: p.pitch, shoot: !!this.game.mouseDown0, weapon: p.weapon,
      px: p.pos.x, py: p.pos.y, pz: p.pos.z, rt: this.renderTime(),
      ...(this._pickPendente ? { pick: this._pickPendente } : {}),
      ...(this._pickupWeaponPendente ? { pickupWeapon: this._pickupWeaponPendente } : {}),
      ...(this._reloadPendente ? { reload: this._reloadPendente } : {}),
      ...(this._nadePendente ? { nade: this._nadePendente } : {}),
    });
    if (seq > 0) {
      this._predSeq.push(seq); this._predX.push(p.pos.x); this._predY.push(p.pos.y); this._predZ.push(p.pos.z);
      if (this._predSeq.length > 180) { this._predSeq.shift(); this._predX.shift(); this._predY.shift(); this._predZ.shift(); }
      if (tinhaIntent) this._loadoutSeq = seq;
      this._pickPendente = 0;   // um pedido por E; o servidor responde com `gone` + `drop` da antiga
      this._pickupWeaponPendente = '';
      this._reloadPendente = '';
      this._nadePendente = '';  // um pedido por tecla; o servidor responde com `nade` (fase 3)
    }
    this._inputAt = this._now();
  }
  // E num drop/rack: pede ao servidor; a troca local é só predição até o ack do v4.
  pedirPick(pk) {
    if (!pk) return;
    if (pk._nid) this._pickPendente = pk._nid;
    else if (WEAPONS[pk.weapon]) this._pickupWeaponPendente = pk.weapon;
  }
  pedirReload(w) { if (!this.espectador && WEAPONS[w]) this._reloadPendente = w; }
  // 4/5 online: pede a granada ao servidor; devolve false sem a flag (aí o local lança, como antes).
  pedirNade(kind) { if (!this._evOn || this.espectador) return false; this._nadePendente = kind; return true; }
  // Drops de rede (com `_nid`) somem; o rack do spawn fica. Chamado no countdown e no `partida`.
  limparDropsDeRede() {
    const game = this.game;
    for (let i = game.drops.length - 1; i >= 0; i--) if (game.drops[i]._nid) game._sumirDrop(i);
  }
  _dropDeRede(e) {
    const game = this.game;
    if (!e || !Number.isInteger(e.i) || game.drops.some((d) => d._nid === e.i)) return;
    if (!WEAPONS[e.w]) return;
    game._dropWeapon(+e.x || 0, +e.z || 0, e.w, false, 0.01, 0);   // sem prazo local: quem some é o `gone`
    const d = game.drops[game.drops.length - 1];
    if (d) d._nid = e.i;
  }

  _clearPrediction() {
    this._predSeq.length = 0; this._predX.length = 0; this._predY.length = 0; this._predZ.length = 0;
    this._corrX = 0; this._corrY = 0; this._corrZ = 0; this._ackOn = false; this._ackSeq = 0;
    this._loadoutSeq = 0;
  }

  _ackPlayer(e, p, imediato = false) {
    if (!Number.isInteger(e.ackSeq) || e.ackSeq < 0) return;
    this._ackOn = true;
    const i = this._predSeq.indexOf(e.ackSeq);
    if (!imediato && i >= 0 && e.ackSeq >= this._ackSeq) {
      const dx = e.x - this._predX[i], dy = e.y - this._predY[i], dz = e.z - this._predZ[i];
      const err = Math.hypot(dx, dy, dz);
      if (err > 6) {
        p.pos.set(e.x, e.y, e.z); p.vel.set(0, 0, 0); this._clearPrediction(); this._ackOn = true;
      } else {
        this._corrX = dx; this._corrY = dy; this._corrZ = dz;
        if (err >= 0.005) {
          this._reconcileCount++; this._reconcileMax = Math.max(this._reconcileMax, err);
          this._reconcileSamples.push(err);
          if (this._reconcileSamples.length > 240) this._reconcileSamples.shift();
          this._reconcileWindow.push(err);
        }
      }
    }
    this._ackSeq = Math.max(this._ackSeq, e.ackSeq);
    let n = 0;
    while (n < this._predSeq.length && this._predSeq[n] <= e.ackSeq) n++;
    if (n) { this._predSeq.splice(0, n); this._predX.splice(0, n); this._predY.splice(0, n); this._predZ.splice(0, n); }
  }

  _syncPlayerLoadout(e, p) {
    if (!Number.isInteger(e.ackSeq) || e.ackSeq < this._loadoutSeq) return;
    if (e.weapon && WEAPONS[e.weapon] && p.weapon !== e.weapon) {
      this.game._switchWeapon(e.weapon);
      // Morto/estado transitório pode bloquear o helper visual; a autoridade ainda precisa
      // assentar o dado para o próximo respawn/snapshot.
      if (p.weapon !== e.weapon) { p.weapon = e.weapon; this.game._applyVmVisibility?.(); }
    }
    this._authWeapon = e.weapon || this._authWeapon;
    if (e.primary && WEAPONS[e.primary]) p.primary = e.primary;
    if (e.secondary && WEAPONS[e.secondary]) p.secondary = e.secondary;
    if (e.weapon && WEAPONS[e.weapon] && Number.isInteger(e.mag) && Number.isInteger(e.res)) {
      p.ammo[e.weapon] ||= { mag: 0, res: 0 };
      p.ammo[e.weapon].mag = e.mag; p.ammo[e.weapon].res = e.res;
    }
    const reloadIn = Math.max(0, Number(e.reloadIn) || 0);
    const estava = !!this._authReloading;
    this._authReloading = reloadIn > 0;
    if (reloadIn > 0) {
      if (!estava) {
        try { this.game.vm?.rig?.startReload(reloadIn); } catch { /* viewmodel ainda não montado */ }
        this.game.el?.reloadNote?.classList.remove('hidden');
      }
      p.reloadUntil = this.game.time + reloadIn;
    } else if (estava) {
      p.reloadUntil = 0;
      this.game.el?.reloadNote?.classList.add('hidden');
    }
  }

  // Pausado o stepPlayer não manda nada e o servidor soltava o slot após 45 s (BUG-115):
  // um input PARADO a cada 2 s segura o corpo. Movimento zero, sem tiro.
  _pulsoDePausa() {
    const game = this.game, p = game.player;
    if (!game.paused || this.espectador || !p) return;
    const now = this._now();
    if (this._inputAt && now - this._inputAt < 2000) return;
    this.net.sendInput({
      ax: 0, az: 0, crouch: false, shift: false, jump: false,
      yaw: p.yaw, pitch: p.pitch, shoot: false, weapon: p.weapon,
      px: p.pos.x, py: p.pos.y, pz: p.pos.z, rt: this.renderTime(),
    });
    this._inputAt = now;
  }

  /* Casa os ids do servidor com os corpos locais. POR TIME, nunca por ordem de chegada: um
     inimigo do servidor tem que virar um boneco INIMIGO na tela (cor e brasão certos), senão
     amigo vira inimigo e o jogo fica ininteligível. */
  _casar(snap) {
    const game = this.game, net = this.net;
    const livres = [...game.bots];
    /* Casa por PERSONAGEM (exato), time como rede de segurança, qualquer corpo por último —
       entidade sem corpo é boneco invisível. Ver docs/MULTIPLAYER.md. */
    const roster = (net.meta && net.meta.roster) || [];
    const charDe = (id) => { const r = roster.find((x) => x.id === id); return r && r.char; };
    const pega = (team, id) => {
      const alvo = charDe(id);
      let i = alvo ? livres.findIndex((b) => b.def && b.def.id === alvo && b.team === team) : -1;
      if (i < 0) i = livres.findIndex((b) => b.team === team);
      if (i < 0) i = 0;
      return livres.splice(i, 1)[0] || null;
    };
    for (const e of snap.ents) {
      if (!this.espectador && e.id === net.yourEnt) { this._netMap.set(e.id, game.player); continue; }
      const bot = pega(e.team, e.id);
      if (!bot) continue;
      bot._remote = e.id; bot._netId = e.id;
      bot.team = e.team;                      // o lado do corpo passa a ser o do servidor
      bot.name = e.bot ? `[BOT] ${e.name}` : e.name; bot._nomeServidor = e.name;
      bot.pos.set(e.x, e.y, e.z); bot.yaw = e.yaw;
      this._netMap.set(e.id, bot);
    }
    // corpos locais que sobraram (mais bots do que ents): viram fantasmas invisíveis
    for (const gb of livres) {
      gb._remote = 'ghost'; gb.alive = false;
      if (gb.mesh && gb.mesh.group) gb.mesh.group.visible = false;
    }
  }

  /* Aplica o snapshot do servidor. É aqui que o mundo do multiplayer acontece. */
  applySnapshot() {
    const game = this.game, net = this.net;
    if (!net || !net.snap || !Array.isArray(net.snap.ents)) return;
    const snap = net.snap;
    if (this._netMap.size === 0) {
      this._casar(snap);
      if (this._evOn && Array.isArray(net.meta?.drops)) for (const d of net.meta.drops) this._dropDeRede(d);   // quem entra no meio vê os drops vivos
    }

    /* Relógio, placar e ESTADO da rodada vêm do servidor — a máquina local está desligada no
       online (game.update). Sem copiar o estado, o cliente ficaria eternamente em 'countdown'
       e nada se moveria. */
    const estadoAntes = game.state, placarAntes = game.roundsWon ? { E: game.roundsWon.E, B: game.roundsWon.B } : null;
    game.state = snap.state || game.state;
    if (Number.isFinite(snap.timeLeft)) game.timeLeft = snap.timeLeft;
    if (Number.isFinite(snap.roundNum)) game.roundNum = snap.roundNum;
    if (game.roundsWon && Number.isFinite(snap.scoreE)) { game.roundsWon.E = snap.scoreE; game.roundsWon.B = snap.scoreB; }
    if (game.state !== estadoAntes) this.transicaoDeEstado(estadoAntes, game.state, placarAntes);
    this.vagas = snap.livre || null;

    if (snap.tick === this._netTick) return;
    this._netTick = snap.tick;
    const nowMs = this._now();
    /* Tempos do LAG COMP: chegada ↔ tempo-de-servidor dos últimos snapshots. É desta tabela
       que o renderTime() deriva o instante do servidor que a tela está mostrando. */
    this._snapPrevT = this._snapCurT; this._snapArrPrev = this._snapArrCur;
    this._snapCurT = snap.t; this._snapArrCur = nowMs;
    this._tAt.push(nowMs); this._tT.push(snap.t);
    if (this._tAt.length > 10) { this._tAt.shift(); this._tT.shift(); }
    // Offset local↔servidor = MÍNIMO da janela (atraso só aumenta chegada−t); desliza ≤ 4 ms
    // por snapshot, e salto > 1 s é relógio novo (partida nova) — BUG-118.
    let off = Infinity;
    for (let i = 0; i < this._tAt.length; i++) { const o = this._tAt[i] - this._tT[i] * 1000; if (o < off) off = o; }
    if (this._offMs == null || Math.abs(off - this._offMs) > 1000) this._offMs = off;
    else this._offMs += Math.max(-4, Math.min(4, off - this._offMs));

    const primeiroSnap = this._tAt.length <= 1;   // no casamento inicial, alive true->false é estado herdado, não morte
    if (game.ctf && snap.ctf) this.applyCtfState(snap.ctf);
    let dorDoJogador = 0;
    for (const e of snap.ents) {
      const ent = this._netMap.get(e.id);
      if (!ent) continue;
      const wasHp = ent.hp, wasAlive = ent.alive;
      ent.hp = e.hp; ent.alive = e.alive;
      ent.kills = e.k | 0; ent.deaths = e.d | 0;     // scoreboard vem do servidor
      // nome vem do servidor a cada snapshot (humano que toma o slot do bot) — BUG-112
      if (ent !== game.player && e.name) {
        ent._nomeServidor = e.name;
        const rotulo = e.bot ? `[BOT] ${e.name}` : e.name;   // pedido do dono (02/09): bot é bot, gente é gente
        if (ent.name !== rotulo) ent.name = rotulo;
      }
      if (ent !== game.player) ent._netBot = !!e.bot;   // IA: frente +Z (yaw); humano: convenção da câmera (yaw+π) — BUG-117
      if (ent !== game.player && e.weapon) {
        // O id lógico sozinho não troca a arma que foi montada dentro do GLB do personagem.
        // O helper remonta a 3ª pessoa quando pickup/respawn muda a arma autoritativa.
        if (ent.weapon !== e.weapon || ent._meshWeapon !== e.weapon) game._syncRemoteWeapon?.(ent, e.weapon);
        else ent.weapon = e.weapon;
      }
      if (ent === game.player) {
        this._meuNomeServidor = e.name || this._meuNomeServidor;   // o servidor trunca o apelido; é este nome que vem em `killedBy`
        const renasceu = !wasAlive && e.alive;
        if (game.state === 'live' && e.alive && e.hp < wasHp - 0.5) { game._playerHurtFx(); dorDoJogador = wasHp - e.hp; }
        if (wasAlive && !e.alive) {
          if (!this._evOn) {   // com `ev` o `kill` do servidor faz o feed (autor, arma, headshot)
            const att = this._corpoPorNome(e.killedBy);   // a própria morte também entra no killfeed (BUG-122)
            try { game._feed(att, ent, att ? this._armaCurta(att.weapon) : '', false); } catch { /* HUD ainda não montado */ }
          }
          this.playerDied(e, snap);
        }
        else if (renasceu) this.playerRespawned();
        /* O cliente também cria um spawn local. No primeiro snapshot e no respawn ele não é
           uma predição adiantada: é uma posição concorrente, às vezes de outro slot/mapa.
           Nestes dois marcos a autoridade precisa vencer imediatamente, inclusive no Y. */
        const imediato = primeiroSnap || renasceu;
        if (imediato) { ent.pos.set(e.x, e.y, e.z); ent.vel.set(0, 0, 0); }
        if (e.respawnIn != null) game.player.respawnAt = game.time + e.respawnIn;
        this._srvX = e.x; this._srvY = e.y; this._srvZ = e.z; this._srvHas = 1;   // campos planos: zero alocação no hot path
        this._ackPlayer(e, ent, imediato);
        this._syncPlayerLoadout(e, ent);
        continue;
      }
      /* Interpolação contínua entre pacotes (reiniciar picota o boneco). Campos PLANOS de
         propósito: um {x,y,z} por ent × frequência de rede gera GC que trava o vsync. */
      if (ent._ipT1 == null) {
        ent._ipx0 = ent._ipx1 = e.x; ent._ipy0 = ent._ipy1 = e.y; ent._ipz0 = ent._ipz1 = e.z;
        ent._ipyaw0 = ent._ipyaw1 = e.yaw; ent._ipT0 = nowMs - 50; ent._ipT1 = nowMs;
      } else {
        ent._ipx0 = ent._ipx1; ent._ipy0 = ent._ipy1; ent._ipz0 = ent._ipz1;
        ent._ipyaw0 = ent._ipyaw1; ent._ipT0 = ent._ipT1;
        ent._ipx1 = e.x; ent._ipy1 = e.y; ent._ipz1 = e.z; ent._ipyaw1 = e.yaw; ent._ipT1 = nowMs;
      }
      const salto = Math.hypot(ent._ipx1 - ent._ipx0, ent._ipz1 - ent._ipz0);
      if (salto > 3) { ent._ipx0 = ent._ipx1; ent._ipy0 = ent._ipy1; ent._ipz0 = ent._ipz1; ent._ipyaw0 = ent._ipyaw1; }  // respawn/teleporte: colapsa
      /* A animação mede o deslocamento no relógio AUTORITATIVO. Intervalo de chegada contém
         jitter: usá-lo fazia o mesmo bot alternar câmera lenta/velocidade alta ("na lua"). */
      const srvDt = ent._ipSrvT == null ? 0.05 : snap.t - ent._ipSrvT;
      ent._ipSrvT = snap.t;
      const moveDt = Number.isFinite(srvDt) && srvDt > 0 ? srvDt : Math.max(0.001, (ent._ipT1 - ent._ipT0) / 1000);
      ent._netSpd = salto > 3 ? 0 : salto / Math.max(0.001, moveDt);   // alimenta a animação de andar
      if (!ent._bufAt) { ent._bufAt = []; ent._bufX = []; ent._bufY = []; ent._bufZ = []; ent._bufYaw = []; ent._bufPitch = []; }
      /* BUFFER de amostras (BUG-87, KNOWN-BUGS.md): arrays planos, cap 10 (zero objeto no
         hot path). Teleporte esvazia — interpolar através de respawn varreria o mapa. */
      const tBuf = this._relogioSnap(snap, nowMs), nb = ent._bufAt.length;
      if (salto > 3 || (nb && tBuf < ent._bufAt[nb - 1])) {   // teleporte, ou relógio do servidor voltou (partida nova)
        ent._bufAt.length = 0; ent._bufX.length = 0; ent._bufY.length = 0; ent._bufZ.length = 0; ent._bufYaw.length = 0; ent._bufPitch.length = 0;
      }
      ent._bufAt.push(tBuf); ent._bufX.push(e.x); ent._bufY.push(e.y); ent._bufZ.push(e.z); ent._bufYaw.push(e.yaw); ent._bufPitch.push(e.pitch || 0);
      if (ent._bufAt.length > 10) { ent._bufAt.shift(); ent._bufX.shift(); ent._bufY.shift(); ent._bufZ.shift(); ent._bufYaw.shift(); ent._bufPitch.shift(); }
      ent._netPitch = e.pitch || 0;
      if (e.fire && ent.alive) { ent._fireAtMs = nowMs; this.gunshot(ent); if (ent.mesh && ent.mesh.isGLB) { try { ent.mesh.ctrl.shoot(); } catch { /* sem clipe */ } } }
      if (e.voice) this.voice(ent, e.voice);
      /* Killfeed do MP: o `_kill` local não roda online — a transição vivo->morto do
         snapshot + `killedBy` é o evento de morte (BUG-90, KNOWN-BUGS.md). */
      if (!this._evOn && !primeiroSnap && wasAlive && !e.alive) {
        const att = this._corpoPorNome(e.killedBy);
        try { game._feed(att, ent, att ? this._armaCurta(att.weapon) : '', false); } catch { /* HUD ainda não montado */ }
        this.morteRemota(ent, att);
      }
    }
    if (this._evOn) this._drenar(snap, primeiroSnap);
    /* Arco de dano no MP: heurística do atirador mais próximo <600 ms — o snapshot não diz
       QUEM acertou; causa, medição e pendência de protocolo no BUG-90 (KNOWN-BUGS.md). */
    if (!this._evOn && dorDoJogador > 0 && !this.espectador) {
      const att = this._atacanteProvavel(nowMs);
      if (att) {
        try { game._dmgArc(att, game.player, dorDoJogador); } catch { /* HUD ainda não montado */ }
        game._noteHit(att, this._armaCurta(att.weapon), dorDoJogador, false,
          Math.hypot(att.pos.x - game.player.pos.x, att.pos.z - game.player.pos.z));
      }
    }
    if (this.espectador) this.cameraEspectador();
  }

  /* EVENTOS DO SERVIDOR: lotes `ev` (tick ≤ snapshot) viram feedback com o autor REAL. O lote do
     tick de entrada é estado herdado (como `primeiroSnap`), e lote com 3 s de atraso (pausa) some. */
  _drenar(snap, primeiroSnap) {
    const fila = this.net.events;
    if (!fila || !fila.length) return;
    while (fila.length && fila[0].tick <= snap.tick) {
      const lote = fila.shift();
      if (primeiroSnap || snap.tick - lote.tick > 90) continue;
      for (const e of lote.list) { try { this._evento(e); } catch { /* HUD ainda não montado */ } }
    }
  }
  _evento(e) {
    const game = this.game, p = game.player, meu = this.net.yourEnt;
    if (!e || typeof e !== 'object') return;
    const att = this._netMap.get(e.a | 0) || null, vic = this._netMap.get(e.v | 0) || null;
    const d = Math.max(0, Math.min(999, e.d | 0)), h = e.h === 1 || e.h === true, w = String(e.w || '').slice(0, 8);
    const dist = (a) => (a && a.pos && p && p.pos) ? Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) : 0;
    if (e.k === 'hit') {
      if (!att || this.espectador || (e.v | 0) !== meu) return;
      try { game._dmgArc(att, p, d); } catch { /* HUD */ }
      game._noteHit(att, w, d, h, dist(att));
    } else if (e.k === 'kill') {
      if (!vic) return;
      try { game._feed(att, vic, w, h); } catch { /* HUD */ }
      if (vic === p) { if (att && !this.espectador) game._noteHit(att, w, d, h, dist(att)); }
      else this.morteRemota(vic, att);
    } else if (e.k === 'drop') {
      this._dropDeRede(e);
    } else if (e.k === 'gone') {
      const i = game.drops.findIndex((x) => x._nid === e.i);
      if (i >= 0) game._sumirDrop(i);
    } else if (e.k === 'nade') {
      if (!Number.isInteger(e.i) || game._grenades.some((x) => x._nid === e.i)) return;
      const kind = e.kind === 'smoke' ? 'smoke' : 'frag';
      const dono = this._netMap.get(e.o | 0) || ((e.o | 0) === meu ? p : null);
      const origem = new THREE.Vector3(+e.x || 0, +e.y || 0, +e.z || 0), dir = new THREE.Vector3(+e.vx || 0, +e.vy || 0, +e.vz || 0);
      game._spawnGrenade(origem, dir.lengthSq() ? dir.clone().normalize() : new THREE.Vector3(0, 0, -1), kind, dono);
      const gr = game._grenades[game._grenades.length - 1];
      if (gr) { gr._nid = e.i; gr.v.copy(dir); gr.mesh.position.copy(origem); gr.fuse = 1e9; }   // quem estoura é o `boom`
    } else if (e.k === 'boom') {
      const i = game._grenades.findIndex((x) => x._nid === e.i);
      if (i >= 0) { game.scene.remove(game._grenades[i].mesh); game._grenades.splice(i, 1); }
      const pos = new THREE.Vector3(+e.x || 0, +e.y || 0, +e.z || 0);
      if (e.kind === 'smoke') game._popSmoke(pos); else game._explodeFrag(pos, this._netMap.get(e.o | 0) || null);
    }
  }

  /* Transições de rodada no online: a máquina local está desligada, só o feedback é replicado
     (vencedor = diferença do placar do servidor). Sem isto: BUG-114 (KNOWN-BUGS.md). */
  transicaoDeEstado(antes, depois, placarAntes) {
    const game = this.game;
    if (this._netTick < 0) return;   // 1º snapshot: entrou no meio de algo — sem cerimônia (e sem "empate" inventado)
    try {
      if (depois === 'roundEnd') {
        let winner = null;
        if (placarAntes && game.roundsWon) {
          if (game.roundsWon.E > placarAntes.E) winner = 'E';
          else if (game.roundsWon.B > placarAntes.B) winner = 'B';
        }
        game.player.scoped = false; game.el.scope?.classList.remove('on');
        game.radioOpen = null; game._radioUi?.();
        if (!winner) { game._resultadoDaRodada('EMPATE NA TRETA', 'ninguém convenceu ninguém'); game.sfx.roundLose(); }
        else {
          const mine = winner === game.playerTeam;
          game._resultadoDaRodada(`${game._teamName(winner)} LEVARAM O ROUND`, mine ? '— o povo (você) agradece' : '— a oposição (você) pede revanche');
          if (!game.sfx.roundSound(game._voiceKey(winner))) mine ? game.sfx.roundWin() : game.sfx.roundLose();
        }
        try { game._ensureDolly(); } catch { /* sem canvas do dollynho */ }
      } else if (depois === 'countdown') {
        if (this._evOn) this.limparDropsDeRede();   // o servidor zera `drops` no _startRound sem mandar `gone`
        game._resultado = null;
        game._showScoreboard(false);
        game.mk.life = 0; game.mk.count = 0;
        game._banner(frase('round', game.roundNum), game.ctf
          ? frase('alvoBandeiras', game.capsToWin)
          : (game.roundNum === 1 ? frase('comeceTreta') : frase('voltaTreta')));
        if (!game.sfx.csSound('roundstart')) game.sfx.vuvuzela(1.4);
      } else if (depois === 'live' && antes === 'countdown') {
        game._banner(frase('valendo'), 'A treta está liberada');
      } else if (depois === 'matchEnd') {
        game._showScoreboard(false);
        game._endMatch();   // tela de VITÓRIA/DERROTA + envio do resultado; o servidor gira o mapa em ~8 s (`partida`)
      }
    } catch (e) { console.warn('[mp] transição de estado falhou (segue o jogo):', e && e.message); }
  }

  /* Morte de remoto no online: o `_kill` local não roda — replica só o feedback dele (sting,
     kill confirm/multikill quando VOCÊ mata, poça). A morte em si é do servidor. BUG-116. */
  morteRemota(ent, att) {
    const game = this.game, p = game.player;
    try {
      const d = ent.pos ? ent.pos.distanceTo(game.camera.position) : 0;
      const rel = ent.pos ? Math.atan2(ent.pos.x - p.pos.x, ent.pos.z - p.pos.z) - p.yaw : 0;
      const pan = Math.max(-0.85, Math.min(0.85, Math.sin(rel) * 0.8));
      game.sfx.death(ent.def?.id, Math.max(0, 1 - d / 55), pan, Math.min(0.25, d / 343));
    } catch { /* ctx mudo */ }
    if (att === p && !this.espectador) {
      try { game.sfx.killConfirm(); } catch { /* ctx mudo */ }
      const mk = game.mk;
      if (game.time < mk.until) mk.count++; else mk.count = 1;
      mk.until = game.time + 4.5; mk.life++;
      mk.best = Math.max(mk.best || 0, mk.count);
      const tiers = { 2: 'doublekill', 3: 'triplekill', 4: 'multikill', 5: 'megakill' };
      const labels = { doublekill: 'DOUBLE KILL', triplekill: 'TRIPLE KILL', multikill: 'MULTI KILL', megakill: 'MEGA KILL', killingspree: 'KILLING SPREE', godlike: 'GODLIKE' };
      const kind = mk.count >= 6 ? 'godlike' : (tiers[mk.count] || (mk.life === 5 ? 'killingspree' : null));
      if (kind) { try { game._mkBanner(labels[kind]); game.sfx.general(kind); } catch { /* HUD */ } }
    } else if (att && att.team === p.team) {
      try { game.sfx.voice(game._voiceKey(att.team)); } catch { /* ctx mudo */ }   // o lado comemora (como no _kill)
    }
    try { if (ent.pos && game._bloodPoolAt) game._bloodPoolAt(ent.pos); } catch { /* sem fx */ }
  }

  /* Estado CTF do servidor. O cliente online não executa `_updateCTF`, então copiar só
     round/score deixaria bandeiras permanentemente neutras. Mantém os objetos/meshes locais
     e aplica somente os campos da simulação autoritativa. */
  applyCtfState(state) {
    const game = this.game;
    if (!state || !Array.isArray(state.points) || !Array.isArray(game.ctfPts)) return;
    game.ctfCaps.E = state.capsE | 0; game.ctfCaps.B = state.capsB | 0;
    game.roundCaps.E = state.roundCapsE | 0; game.roundCaps.B = state.roundCapsB | 0;
    if (Number.isFinite(state.capsToWin)) game.capsToWin = state.capsToWin;
    if (Number.isFinite(state.matchLeft)) game.ctfMatchLeft = state.matchLeft;
    const n = Math.min(game.ctfPts.length, state.points.length);
    for (let i = 0; i < n; i++) {
      const pt = game.ctfPts[i], src = state.points[i];
      pt.owner = src.owner === 'E' || src.owner === 'B' ? src.owner : null;
      pt.capTeam = src.capTeam === 'E' || src.capTeam === 'B' ? src.capTeam : null;
      pt.contested = !!src.contested;
      pt.prog = Math.max(0, Math.min(1, Number(src.prog) || 0));
      if (pt.ring && pt.ring.material) {
        if (pt.owner) pt.ring.material.color.set(game._teamColor(pt.owner)).lerp(game._ctfGray, 0.45);
        else pt.ring.material.color.set(0xb8b4a8);
        pt.ring.material.opacity = pt.contested ? 0.95 : 0.5 + 0.45 * (pt.prog || (pt.owner ? 1 : 0));
      }
      if (pt.flag && pt.flag.material) {
        const fac = pt.owner ? game._factionOf(pt.owner) : null;
        if (pt._flagFac !== fac) { pt._flagFac = fac; pt.flag.material.map = game._flagTexFor(fac); pt.flag.material.needsUpdate = true; }
        pt.flag.material.color.set(pt.owner ? 0xe6e6e6 : 0xaaaaaa);
      }
    }
    game._updateCtfHud();
  }

  // corpo local (ou o próprio jogador) pelo NOME que o servidor mandou no killedBy
  _corpoPorNome(nome) {
    if (!nome) return null;
    const game = this.game;
    if (game.player && (game.player.name === nome || nome === this._meuNomeServidor)) return game.player;
    for (const b of this._netMap.values()) if (b !== game.player && (b._nomeServidor === nome || b.name === nome)) return b;
    return null;
  }
  // rótulo curto da arma pro killfeed/painel (mesmo formato que o _damage usa no SP)
  _armaCurta(wid) { const W = wid && WEAPONS[wid]; return (W && (W.short || W.name)) || wid || ''; }
  // inimigo vivo mais próximo que atirou há <600 ms — a melhor aproximação de "quem me acertou"
  _atacanteProvavel(nowMs) {
    const game = this.game, p = game.player;
    let melhor = null, md = 1e9;
    for (const b of this._netMap.values()) {
      if (b === p || !b.alive || b.team === p.team) continue;
      if (!b._fireAtMs || nowMs - b._fireAtMs > 600) continue;
      const d = Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
      if (d < md) { melhor = b; md = d; }
    }
    return melhor;
  }

  /* CÂMERA DE ESPECTADOR. Segue um jogador em 1ª pessoa (o mais "quente" por padrão: quem
     está vivo e com mais abates), e ANDA sozinha para o próximo quando o alvo morre — ficar
     preso num defunto é o defeito clássico do modo espectador. */
  cameraEspectador() {
    const game = this.game;
    const vivos = game.bots.filter((b) => b.alive && b._remote && b._remote !== 'ghost');
    if (!vivos.length) return;
    if (!this._alvoSpec || !this._alvoSpec.alive || !vivos.includes(this._alvoSpec)) {
      this._alvoSpec = vivos.slice().sort((a, b) => (b.kills | 0) - (a.kills | 0))[0];
    }
    const a = this._alvoSpec;
    // 3ª pessoa atrás do ombro (números do camView 'third'), por QUADRO — BUG-117, KNOWN-BUGS.md.
    const yaw = (a.yaw || 0) + (a._netBot === false ? 0 : Math.PI);   // para onde o corpo OLHA, na convenção da câmera
    const pitch = Math.max(-1.2, Math.min(1.2, a._netPitch || 0));
    const eye = a.pos.y + 1.62 - 0.52 * (a.crouchF || 0);
    game._tpEul.set(pitch, yaw, 0, 'YXZ');
    const fwd = game._tpFwd.set(0, 0, -1).applyEuler(game._tpEul);
    const right = game._tpRight.set(1, 0, 0).applyEuler(game._tpEul);
    const cam = game.camera;
    cam.position.set(a.pos.x, eye, a.pos.z).addScaledVector(fwd, -this.specDist).addScaledVector(right, 0.28);
    cam.position.y += 0.18;
    if (game.world && game.world.groundHeightAt) {
      const gy = game.world.groundHeightAt(cam.position.x, cam.position.z, cam.position.y) + 0.2;
      if (cam.position.y < gy) cam.position.y = gy;   // não atravessa o chão
    }
    cam.rotation.set(pitch, yaw, 0);
    this.nomeAlvo = a.name;
  }
  /* Passa para o próximo jogador (a UI liga isto no clique/seta). */
  trocarAlvo(dir = 1) {
    const vivos = this.game.bots.filter((b) => b.alive && b._remote && b._remote !== 'ghost');
    if (!vivos.length) return;
    const i = vivos.indexOf(this._alvoSpec);
    this._alvoSpec = vivos[((i < 0 ? 0 : i) + dir + vivos.length) % vivos.length];
  }

  // Voz de um combatente remoto (rádio ao avistar / comemoração de abate) — é o que devolve o
  // "papo" dos personagens ao multiplayer.
  voice(ent, kind) {
    const fac = this.game._voiceKey(ent.team);
    try { if (kind === 'radio') this.game.sfx.radioVoice(fac); else this.game.sfx.voice(fac); } catch { /* ctx mudo */ }
  }

  // Tiro posicional de um remoto: som atenuado por distância, com pan pelo lado da câmera, e
  // clarão no cano. Sem isto o mundo do multiplayer é um tiroteio MUDO.
  gunshot(ent) {
    const game = this.game;
    const cam = game.camera.position;
    const dx = ent.pos.x - cam.x, dz = ent.pos.z - cam.z;
    const sd = Math.hypot(dx, dz);
    const yaw = game.camera.rotation.y;
    const pan = Math.max(-1, Math.min(1, (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / (sd || 1)));
    try { game.sfx.shotWeapon(ent.weapon || 'ak', sd, 0.5, pan, Math.min(0.25, sd / 343)); } catch { /* ctx mudo */ }
    try { game._flash(ent.pos.clone().setY(ent.pos.y + 1.4), new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))); } catch { /* sem fx */ }
  }

  /* MORTE do jogador local no MULTIPLAYER: quem mata é o servidor (alive true->false no
     snapshot), então `_kill`/`_respawnPlayer` locais não rodam. Aqui replicamos só o
     FEEDBACK; posição, vida e instante do respawn continuam vindo do servidor. */
  playerDied(e, snap) {
    const game = this.game;
    game.mk.life = 0;   // a sequência de abates morre com você (como no _kill)
    try { game._scope(false, true); } catch { /* sem luneta */ }
    if (game.el.respawn) game.el.respawn.classList.remove('hidden');
    try { game.sfx.death(game.player.def?.id); } catch { /* ctx mudo */ }
    // o assassino vem como NOME; procuramos o corpo dele no snapshot para a killcam apontar.
    const nome = e && e.killedBy;
    /* Se o _noteHit do arco de dano já registrou este assassino há <3 s, o painel de morte
       fica com o registro RICO (arma, dano, quadrante) em vez do esqueleto abaixo. */
    const h = game._lastHit;
    if (h && nome && h.name === nome && game.time - h.at < 3) return;
    const alvo = nome && snap ? snap.ents.find((x) => x.name === nome && x.alive) : null;
    game._lastHit = {
      at: game.time, name: nome || 'INIMIGO', tier: '', weap: '', dmg: 0, head: false,
      dist: alvo ? Math.hypot(alvo.x - e.x, alvo.z - e.z) : 0, total: 0, quad: '',
      pos: alvo ? new THREE.Vector3(alvo.x, alvo.y, alvo.z) : null,
    };
  }
  playerRespawned() {
    const game = this.game;
    // o corpo TP do jogador: no online o respawn NÃO passa pelo _respawnPlayer, e sem este
    // reset o corpo ficava deitado pra sempre, arrastado pelo mundo (BUG-86).
    try { game._tpRevive(); } catch { /* corpo ainda não construído */ }
    if (game.el.respawn) game.el.respawn.classList.add('hidden');
    if (game._deathPanel) { try { game._deathPanel.remove(); } catch { /* já foi */ } game._deathPanel = null; }
    game._lastHit = null;
    // O que o _respawnPlayer faz no SP e o servidor não faz por nós: munição, rolagem da câmera, som (BUG-119).
    const p = game.player;
    for (const w of [p.primary, p.secondary]) if (w && WEAPONS[w] && p.ammo[w]) p.ammo[w] = { mag: WEAPONS[w].mag, res: WEAPONS[w].reserve };
    p._lifeDmg = 0; p.crouchF = 0;
    p.smokes = 5; p.frags = 1; game._updateSmokeHud?.();   // como o _startRound (fase 3 do `ev`)
    if (game.camera) game.camera.rotation.z = 0;
    try { game.sfx.respawn(); } catch { /* ctx mudo */ }
  }

  /* Render de um boneco REMOTO. Chamado pelo game._updateBot para corpos com `_remote`.
     Espelha a lógica de morte do _updateBot local. */
  updateRemoteBot(b, dt) {
    const game = this.game;
    const g = b.mesh && b.mesh.group;
    if (!g) return;
    if (b._remote === 'ghost') { g.visible = false; return; }
    if (b._bufAt && b._bufAt.length) {
      /* Renderiza o remoto `interpAtrasoMs` no PASSADO, interpolando no buffer: absorve o
         jitter que congelava o boneco a cada pacote atrasado (BUG-87). NUNCA extrapola. */
      const at = b._bufAt, n = at.length;
      const rAt = this._relogioAgora() - this.interpAtrasoMs;
      let j, a = 0;
      if (rAt <= at[0]) j = 0;
      else if (rAt >= at[n - 1]) j = n - 1;
      else {
        j = n - 2;
        while (j > 0 && at[j] > rAt) j--;
        a = (rAt - at[j]) / Math.max(1, at[j + 1] - at[j]);
      }
      const k = a > 0 ? j + 1 : j;
      b.pos.x = b._bufX[j] + (b._bufX[k] - b._bufX[j]) * a;
      b.pos.y = b._bufY[j] + (b._bufY[k] - b._bufY[j]) * a;
      b.pos.z = b._bufZ[j] + (b._bufZ[k] - b._bufZ[j]) * a;
      let dy = b._bufYaw[k] - b._bufYaw[j]; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      b.yaw = b._bufYaw[j] + dy * a;
      if (b._bufPitch) b._netPitch = b._bufPitch[j] + (b._bufPitch[k] - b._bufPitch[j]) * a;   // cabeça também sem degrau de 30 Hz
    }
    if (b.alive) {
      if (b._deadShown) { if (b.mesh.isGLB) b.mesh.ctrl.revive && b.mesh.ctrl.revive(); b._deadShown = false; b.deadT = 0; }
      g.position.copy(b.pos); g.rotation.set(0, b._netBot === false ? b.yaw + Math.PI : b.yaw, 0); g.visible = true;   // humano remoto olhava pra trás
      const spd = Math.min(6, b._netSpd || 0);
      if (b.mesh.isGLB) {
        // update(dt, moving, hasTarget, speed, back): a velocidade REAL vai no 4º argumento —
        // com speed=0 o clipe rodava a 0,45× e o boneco deslizava (BUG-113).
        b.mesh.ctrl.aimPitch = Math.max(-0.6, Math.min(0.6, b._netPitch || 0));
        b.mesh.ctrl.update(dt, spd < 0.35 ? 0 : 1, !!b._fireAtMs && this._now() - b._fireAtMs < 1500, spd, false);
      } else poseCharacter(b.mesh.parts, spd, 0, game.time);
    } else {
      b.deadT = (b.deadT || 0) + dt; b._deadShown = true;
      if (b.mesh.isGLB) {
        b.mesh.ctrl.die(); b.mesh.ctrl.update(dt, 0, false);
        g.position.copy(b.pos);
        g.visible = b.deadT <= 1.2;
      } else {
        g.position.set(b.pos.x, b.pos.y + Math.max(-0.6, -b.deadT * 0.3), b.pos.z);
        g.rotation.x = Math.max(-Math.PI / 2, (g.rotation.x || 0) - dt * 5);
      }
    }
    try { game._updateTeamMark(b); } catch { /* marca opcional */ }
  }

  // ── OVERLAY DE REDE: fps · snap Hz · gap/jitter · banda · ents · ping ──
  updateStats() {
    const game = this.game;
    if (game._disposed || !game.online || !this.net) return;
    let el = this._nsEl;
    if (!el) {
      el = this._nsEl = document.createElement('div');
      try { document.body.classList.add('net-overlay'); } catch { /* sem DOM */ }   // o killfeed se afasta (style.css)
      el.id = 'netstats';
      el.style.cssText = 'position:fixed;top:10px;right:10px;z-index:100000;font:12px/1.55 ui-monospace,Menlo,Consolas,monospace;'
        + 'color:#cfe;background:rgba(8,10,14,.86);border:1px solid #2a3340;border-radius:7px;padding:7px 11px;'
        + 'pointer-events:none;white-space:pre;min-width:172px;letter-spacing:.2px;text-shadow:0 1px 2px #000';
      document.body.appendChild(el);
    }
    // fps = frames REAIS de render na janela, e não as chamadas deste interval
    const now = performance.now();
    if (this._nsT0 == null) { this._nsT0 = now; this._nsF0 = game._rafFrames || 0; }
    const dframes = (game._rafFrames || 0) - this._nsF0, dtime = now - this._nsT0;
    if (dtime >= 400) {
      if (dframes > 0) this._nsFps = Math.round((dframes * 1000) / dtime);   // pausado (0 frames) mantém o último fps de jogo
      this._nsT0 = now; this._nsF0 = game._rafFrames || 0;
    }
    const s = this.net.computeStats();
    if (now >= this._nextClientStats && this._nsFps > 0) {
      this._nextClientStats = now + 10000;
      const correcoes = this._reconcileWindow;
      this.net.sendClientStats?.({
        fps: this._nsFps, rtt: s.ping, snap: s.hz, gap: s.gapMax,
        reconcileP95: this._percentil(correcoes, 0.95),
        reconcileMax: correcoes.length ? +Math.max(...correcoes).toFixed(3) : null,
        reconcileCount: correcoes.length,
        quality: game.settings?.quality || null,
      });
      // A próxima janela não repete os mesmos eventos. Os totais acima continuam vivos
      // para o overlay da sessão; o servidor soma somente os eventos novos de cada 10 s.
      correcoes.length = 0;
    }
    const c = (v, aviso, bom) => (v >= bom ? '#7fe17f' : v >= aviso ? '#f2d06b' : '#f27b7b');
    const hzc = s.hz >= this.snapshotHz - 1 ? '#7fe17f' : s.hz >= this.snapshotHz * 0.75 ? '#f2d06b' : '#f27b7b';
    const gapc = s.gapMax <= 70 ? '#7fe17f' : s.gapMax <= 130 ? '#f2d06b' : '#f27b7b';
    const pingc = s.ping <= 0 ? '#f27b7b' : s.ping <= 40 ? '#7fe17f' : s.ping <= 120 ? '#f2d06b' : '#f27b7b';
    const row = (rot, val, cor) => `<span style="color:#7a8794">${rot}</span> <b style="color:${cor || '#e6eef6'}">${val}</b>`;
    el.innerHTML = [
      `<span style="color:#61afef;font-weight:700">NET · ${this.net.meta?.room || '?'}${this.espectador ? ' · ASSISTINDO' : ''}</span>`,
      row('fps ', `${this._nsFps ?? '--'}`, c(this._nsFps || 0, 45, 55)),
      row('snap', `${s.hz} Hz`, hzc) + ` <span style="color:#5f6f7e">/${this.snapshotHz}</span>`,
      row('gap ', `${Math.round(s.gapMax)} ms`, gapc) + ` <span style="color:#5f6f7e">últ ${Math.round(s.sinceLast)}</span>`,
      row('band', `${s.kbps.toFixed(1)} KB/s`) + (this._evOn ? ` <span style="color:#5f6f7e">ev ${this.net.stats.evs | 0}</span>` : ''),
      row('ents', `${s.ents}`) + `  ` + row('tick', `${s.tick}`),
      row('ping', s.ping <= 0 ? '—' : `${Math.round(s.ping)} ms`, pingc),
      row('corr', this._reconcileCount ? `${this._reconcileMax.toFixed(2)} m máx` : '—'),
    ].join('\n');
    el.style.borderColor = (s.hz < 15 || s.gapMax > 130) ? '#7a2b2b' : '#2a3340';
  }

  _percentil(values, q) {
    if (!values || !values.length) return null;
    const a = [...values].sort((x, y) => x - y);
    return +a[Math.min(a.length - 1, Math.floor((a.length - 1) * q))].toFixed(3);
  }
}
