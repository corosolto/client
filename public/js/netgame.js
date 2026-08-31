/* NETCODE DO CLIENTE. O game.js só chama ganchos `this._mp?.xxx()` e nunca importa este
   arquivo; quem injeta é o main.js. Desenho e decisões: docs/MULTIPLAYER.md. */
import * as THREE from 'three';
import { poseCharacter } from './characters.js';
import { WEAPONS } from './game.js';

export function makeNetcode(game, net) { return new Netcode(game, net); }

class Netcode {
  constructor(game, net) {
    this.game = game;
    this.net = net;
    this._netMap = new Map();   // id do servidor -> entidade local
    this._netTick = -1;
    this._alvoSpec = null;      // quem o espectador está seguindo
    /* BUFFER DE INTERPOLAÇÃO (~2,4 snapshots a 20 Hz). Renderizar o remoto ~120 ms no
       passado é o que absorve o jitter: um pacote atrasado ainda tem estrada bufferizada
       pela frente, em vez de clampar no último ponto e CONGELAR o boneco (BUG-87). */
    this.interpAtrasoMs = 120;
    this._tAt = []; this._tT = [];   // chegada ↔ tempo-de-servidor dos últimos snapshots
    net.startPing();
    // Interval PRÓPRIO: o overlay segue vivo na pausa (o WS continua recebendo snapshots).
    this._nsTimer = setInterval(() => this.updateStats(), 250);
    // trocar de time / virar espectador remonta o casamento de ids na próxima nevada
    net.onSlot = () => { this._netMap.clear(); this._srvHas = 0; };
  }

  dispose() {
    if (this._nsTimer) { clearInterval(this._nsTimer); this._nsTimer = null; }
    try { this.net.stopPing(); } catch { /* já fechada */ }
    if (this._nsEl) { this._nsEl.remove(); this._nsEl = null; }
  }

  get espectador() { return this.net.espectador || this.net.yourEnt == null; }

  // Relógio de parede do netcode — indireção para a régua fabricar jitter determinístico.
  _now() { return performance.now(); }

  /* Tempo-de-SERVIDOR que o cliente está renderizando os remotos AGORA (entre os dois últimos
     snapshots). Vai no input para o servidor rebobinar as hitboxes exatamente para cá (lag
     compensation) — é o que faz o tiro cair onde você VIU o alvo, e não onde ele já está. */
  renderTime() {
    /* Mapeia o instante RENDERIZADO (agora − buffer) para o relógio do servidor pela mesma
       tabela chegada↔t que a interpolação usa — o rewind cai exatamente no que a tela mostrou. */
    const at = this._tAt, t = this._tT;
    if (at.length) {
      const rAt = this._now() - this.interpAtrasoMs;
      if (rAt <= at[0]) return t[0];
      if (rAt >= at[at.length - 1]) return t[t.length - 1];   // clampa: nunca à frente do último snapshot
      let j = at.length - 2;
      while (j > 0 && at[j] > rAt) j--;
      const a = (rAt - at[j]) / Math.max(1, at[j + 1] - at[j]);
      return t[j] + (t[j + 1] - t[j]) * a;
    }
    return this._snapCurT || 0;
  }

  /* Chamado pelo game._updatePlayer logo DEPOIS do _moveEntity (a predição já aconteceu na
     tela). Reconcilia com a pose autoritativa e manda o input pro servidor. */
  stepPlayer(p, input) {
    if (this.espectador) return;
    if (this._srvHas) {
      const err = Math.hypot(this._srvX - p.pos.x, this._srvZ - p.pos.z);
      /* Só corrige desync REAL: o adiantamento normal da predição é esperado, e "corrigi-lo"
         é justamente o rubber-banding que as pessoas chamam de lag. */
      if (err > 2.5) { p.pos.set(this._srvX, this._srvY, this._srvZ); p.vel.set(0, 0, 0); }
    }
    // px/py/pz = a posição PREDITA de onde você mira. O servidor atira DESTA origem (validada
    // dentro de 3 m); sem isso o raio sai da posição dele — atrasada pelo RTT — e passa ao lado.
    this.net.sendInput({
      ax: input.ax, az: input.az, crouch: input.crouch, shift: input.shift, jump: input.jump,
      yaw: p.yaw, pitch: p.pitch, shoot: !!this.game.mouseDown0, weapon: p.weapon,
      px: p.pos.x, py: p.pos.y, pz: p.pos.z, rt: this.renderTime(),
    });
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
      bot.name = e.name;
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
    if (this._netMap.size === 0) this._casar(snap);

    /* Relógio, placar e ESTADO da rodada vêm do servidor — a máquina local está desligada no
       online (game.update). Sem copiar o estado, o cliente ficaria eternamente em 'countdown'
       e nada se moveria. */
    game.state = snap.state || game.state;
    if (Number.isFinite(snap.timeLeft)) game.timeLeft = snap.timeLeft;
    if (Number.isFinite(snap.roundNum)) game.roundNum = snap.roundNum;
    if (game.roundsWon && Number.isFinite(snap.scoreE)) { game.roundsWon.E = snap.scoreE; game.roundsWon.B = snap.scoreB; }
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

    const primeiroSnap = this._tAt.length <= 1;   // no casamento inicial, alive true->false é estado herdado, não morte
    let dorDoJogador = 0;
    for (const e of snap.ents) {
      const ent = this._netMap.get(e.id);
      if (!ent) continue;
      const wasHp = ent.hp, wasAlive = ent.alive;
      ent.hp = e.hp; ent.alive = e.alive;
      ent.kills = e.k | 0; ent.deaths = e.d | 0;     // scoreboard vem do servidor
      if (ent !== game.player && e.weapon) ent.weapon = e.weapon;   // a arma do jogador local é escolha LOCAL (pega com mira+E); o snapshot não reverte
      if (ent === game.player) {
        if (game.state === 'live' && e.alive && e.hp < wasHp - 0.5) { game._playerHurtFx(); dorDoJogador = wasHp - e.hp; }
        if (wasAlive && !e.alive) this.playerDied(e, snap);
        else if (!wasAlive && e.alive) this.playerRespawned();
        if (e.respawnIn != null) game.player.respawnAt = game.time + e.respawnIn;
        this._srvX = e.x; this._srvY = e.y; this._srvZ = e.z; this._srvHas = 1;   // campos planos: zero alocação no hot path
        continue;
      }
      /* Interpolação contínua entre pacotes (reiniciar picota o boneco). Campos PLANOS de
         propósito: um {x,y,z} por ent × 20 Hz gera GC que trava o vsync. */
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
      ent._netSpd = salto > 3 ? 0 : salto / Math.max(0.001, (ent._ipT1 - ent._ipT0) / 1000);   // alimenta a animação de andar
      if (!ent._bufAt) { ent._bufAt = []; ent._bufX = []; ent._bufY = []; ent._bufZ = []; ent._bufYaw = []; }
      /* BUFFER de amostras (BUG-87, KNOWN-BUGS.md): arrays planos, cap 10 (zero objeto no
         hot path). Teleporte esvazia — interpolar através de respawn varreria o mapa. */
      if (salto > 3) { ent._bufAt.length = 0; ent._bufX.length = 0; ent._bufY.length = 0; ent._bufZ.length = 0; ent._bufYaw.length = 0; }
      ent._bufAt.push(nowMs); ent._bufX.push(e.x); ent._bufY.push(e.y); ent._bufZ.push(e.z); ent._bufYaw.push(e.yaw);
      if (ent._bufAt.length > 10) { ent._bufAt.shift(); ent._bufX.shift(); ent._bufY.shift(); ent._bufZ.shift(); ent._bufYaw.shift(); }
      if (e.fire && ent.alive) { ent._fireAtMs = nowMs; this.gunshot(ent); }
      if (e.voice) this.voice(ent, e.voice);
      /* KILLFEED do multiplayer: quem mata é o servidor, então o `_kill` local (que alimenta
         o `_feed` no SP) nunca roda. A transição vivo->morto do snapshot é o evento de morte;
         `killedBy` diz o assassino. Sem isto, "matei várias vezes sem ver" — o jogador não
         tinha NENHUM registro de abate na tela (relato do dono, 31/08). */
      if (!primeiroSnap && wasAlive && !e.alive) {
        const att = this._corpoPorNome(e.killedBy);
        try { game._feed(att, ent, att ? this._armaCurta(att.weapon) : '', false); } catch { /* HUD ainda não montado */ }
      }
    }
    /* ARCO DE DANO (o SP dispara no `_damage`, que não roda online): atribui o tiro ao inimigo
       mais próximo que atirou nos últimos 600 ms e aponta o arco do HUD pra ele. Heurística —
       o snapshot não diz QUEM acertou (pendência registrada no KNOWN-BUGS) — mas devolve a
       direção na maioria dos tiros, que é o que faltava pro "morri sem ver". */
    if (dorDoJogador > 0 && !this.espectador) {
      const att = this._atacanteProvavel(nowMs);
      if (att) {
        try { game._dmgArc(att, game.player, dorDoJogador); } catch { /* HUD ainda não montado */ }
        game._noteHit(att, this._armaCurta(att.weapon), dorDoJogador, false,
          Math.hypot(att.pos.x - game.player.pos.x, att.pos.z - game.player.pos.z));
      }
    }
    if (this.espectador) this.cameraEspectador();
  }

  // corpo local (ou o próprio jogador) pelo NOME que o servidor mandou no killedBy
  _corpoPorNome(nome) {
    if (!nome) return null;
    const game = this.game;
    if (game.player && game.player.name === nome) return game.player;
    for (const b of this._netMap.values()) if (b !== game.player && b.name === nome) return b;
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
    game.camera.position.set(a.pos.x, a.pos.y + 1.62 - 0.52 * (a.crouchF || 0), a.pos.z);
    game.camera.rotation.set(a.pitch || 0, a.yaw || 0, 0);
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
    try { game._scope(false, true); } catch { /* sem luneta */ }
    if (game.el.respawn) game.el.respawn.classList.remove('hidden');
    try { game.sfx.death(); } catch { /* ctx mudo */ }
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
      const rAt = this._now() - this.interpAtrasoMs;
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
    }
    if (b.alive) {
      if (b._deadShown) { if (b.mesh.isGLB) b.mesh.ctrl.revive && b.mesh.ctrl.revive(); b._deadShown = false; b.deadT = 0; }
      g.position.copy(b.pos); g.rotation.set(0, b.yaw, 0); g.visible = true;
      const spd = Math.min(6, b._netSpd || 0);
      if (b.mesh.isGLB) b.mesh.ctrl.update(dt, spd, false); else poseCharacter(b.mesh.parts, spd, 0, game.time);
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
    const c = (v, aviso, bom) => (v >= bom ? '#7fe17f' : v >= aviso ? '#f2d06b' : '#f27b7b');
    const hzc = s.hz >= 19 ? '#7fe17f' : s.hz >= 15 ? '#f2d06b' : '#f27b7b';
    const gapc = s.gapMax <= 70 ? '#7fe17f' : s.gapMax <= 130 ? '#f2d06b' : '#f27b7b';
    const pingc = s.ping <= 0 ? '#f27b7b' : s.ping <= 40 ? '#7fe17f' : s.ping <= 120 ? '#f2d06b' : '#f27b7b';
    const row = (rot, val, cor) => `<span style="color:#7a8794">${rot}</span> <b style="color:${cor || '#e6eef6'}">${val}</b>`;
    el.innerHTML = [
      `<span style="color:#61afef;font-weight:700">NET · ${this.net.meta?.room || '?'}${this.espectador ? ' · ASSISTINDO' : ''}</span>`,
      row('fps ', `${this._nsFps ?? '--'}`, c(this._nsFps || 0, 45, 55)),
      row('snap', `${s.hz} Hz`, hzc) + ` <span style="color:#5f6f7e">/20</span>`,
      row('gap ', `${Math.round(s.gapMax)} ms`, gapc) + ` <span style="color:#5f6f7e">últ ${Math.round(s.sinceLast)}</span>`,
      row('band', `${s.kbps.toFixed(1)} KB/s`),
      row('ents', `${s.ents}`) + `  ` + row('tick', `${s.tick}`),
      row('ping', s.ping <= 0 ? '—' : `${Math.round(s.ping)} ms`, pingc),
    ].join('\n');
    el.style.borderColor = (s.hz < 15 || s.gapMax > 130) ? '#7a2b2b' : '#2a3340';
  }
}
