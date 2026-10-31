const ESCORT_RADIUS = 6;
const CONTEST_RADIUS = 4;
const THREAT_RADIUS = 14;
const ESCORT_SPEED = 1.8;
const COVER_SPEED = 2.5;
const RETURN_SPEED = 0.65;
const RETURN_DELAY = 4;
const BOARDING_TIME = 3;
const GUARD_LEASH = 5.5;
const GUARD_ENGAGE_RADIUS = 7.5;
const GUARD_SLOT_RADIUS = 1.6;
const GUARD_PROTECT_RADIUS = 4.5;
const GUARD_SLOTS = [
  { right: 0, forward: 2.4 },
  { right: -2.2, forward: 1.2 }, { right: 2.2, forward: 1.2 },
  { right: -3.1, forward: -0.7 }, { right: 3.1, forward: -0.7 },
  { right: -1.6, forward: -2.5 }, { right: 1.6, forward: -2.5 },
];

const d2 = (a, b) => {
  const dx = (a.x ?? a.pos?.x ?? 0) - b.x;
  const dz = (a.z ?? a.pos?.z ?? 0) - b.z;
  return dx * dx + dz * dz;
};
const vivosNoRaio = (lista, pos, raio) => lista.filter((ent) => ent.alive !== false && d2(ent.pos || ent, pos) <= raio * raio);
export function destinoProtecaoEscolta(bot, vip, defensores = [], ameacas = [], out = null) {
  if (!bot?.pos || !vip?.pos || bot.alive === false || bot === vip) return null;
  let indice = -1, vivos = 0;
  for (const ent of defensores) {
    if (ent === vip || ent.alive === false || ent.team !== bot.team) continue;
    if (ent === bot) indice = vivos;
    vivos++;
  }
  if (indice < 0) return null;
  const slot = GUARD_SLOTS[indice % GUARD_SLOTS.length];
  let maisPerto = null, menorDistancia = Infinity;
  for (const ent of ameacas) {
    if (ent?.alive === false || !ent?.pos) continue;
    const distancia = d2(ent.pos, vip.pos);
    if (distancia < menorDistancia) { maisPerto = ent; menorDistancia = distancia; }
  }
  const yaw = maisPerto
    ? Math.atan2(maisPerto.pos.x - vip.pos.x, maisPerto.pos.z - vip.pos.z)
    : Number.isFinite(vip.yaw) ? vip.yaw : 0;
  const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
  const forwardX = Math.sin(yaw), forwardZ = Math.cos(yaw);
  const destino = out || {};
  destino.x = vip.pos.x + rightX * slot.right + forwardX * slot.forward;
  destino.z = vip.pos.z + rightZ * slot.right + forwardZ * slot.forward;
  destino.centerX = vip.pos.x;
  destino.centerZ = vip.pos.z;
  destino.leash = GUARD_LEASH;
  destino.engageRadius = GUARD_ENGAGE_RADIUS;
  destino.slotRadius = GUARD_SLOT_RADIUS;
  destino.protectRadius = GUARD_PROTECT_RADIUS;
  destino.repath = 0.28;
  return destino;
}

export function criarEstadoEscolta(caminho) {
  if (!Array.isArray(caminho) || caminho.length < 2) throw new Error('Operação Flávio exige ao menos dois checkpoints');
  return {
    caminho: caminho.map(({ x, z }) => ({ x, z })),
    position: { ...caminho[0] },
    checkpoint: 0,
    escortCount: 0,
    contested: false,
    threatened: false,
    inCover: true,
    unattendedFor: 0,
    boardedFor: 0,
    winner: null,
  };
}

function moverAte(state, alvo, distancia, mover = null) {
  const dx = alvo.x - state.position.x;
  const dz = alvo.z - state.position.z;
  const falta = Math.hypot(dx, dz);
  const origem = { x: state.position.x, z: state.position.z };
  const proposta = falta <= distancia || falta < 1e-6
    ? { x: alvo.x, z: alvo.z }
    : { x: origem.x + dx * distancia / falta, z: origem.z + dz * distancia / falta };
  const resultado = mover?.(origem, proposta) || proposta;
  state.position.x = resultado.x;
  state.position.z = resultado.z;
  return Math.hypot(alvo.x - resultado.x, alvo.z - resultado.z) < 0.12;
}

export function passoEscolta(state, contexto, dt, { mutante = '', mover = null } = {}) {
  if (state.winner || dt <= 0) return state;
  if (!contexto.vipAlive) {
    state.winner = 'E';
    return state;
  }
  const defensores = vivosNoRaio(contexto.defensores || [], state.position, ESCORT_RADIUS);
  const atacantes = vivosNoRaio(contexto.atacantes || [], state.position, CONTEST_RADIUS);
  const ameacas = vivosNoRaio(contexto.atacantes || [], state.position, THREAT_RADIUS);
  state.escortCount = defensores.length;
  state.contested = mutante === 'sem-contestacao' ? false : atacantes.length > 0;
  state.threatened = mutante === 'sem-contestacao' ? false : ameacas.length > 0;
  const acompanhado = defensores.length > 0 && !state.contested;
  const ultimo = state.caminho.length - 1;

  if (state.threatened) {
    state.boardedFor = 0;
    state.unattendedFor = 0;
    const abrigo = state.caminho[state.checkpoint];
    const chegou = moverAte(state, abrigo, COVER_SPEED * dt, mover);
    state.inCover = chegou || Math.hypot(state.position.x - abrigo.x, state.position.z - abrigo.z) < 0.75;
    return state;
  }

  if (state.checkpoint >= ultimo) {
    state.inCover = true;
    state.boardedFor = acompanhado ? state.boardedFor + dt : 0;
    if (state.boardedFor >= BOARDING_TIME) state.winner = 'B';
    return state;
  }

  if (acompanhado) {
    state.unattendedFor = 0;
    state.inCover = false;
    const chegou = moverAte(state, state.caminho[state.checkpoint + 1], ESCORT_SPEED * dt, mover);
    if (chegou) { state.checkpoint++; state.inCover = true; }
  } else if (!state.contested) {
    state.unattendedFor += dt;
    if (state.unattendedFor > RETURN_DELAY && state.checkpoint > 0) {
      state.inCover = false;
      const chegou = moverAte(state, state.caminho[state.checkpoint - 1], RETURN_SPEED * dt, mover);
      if (chegou) { state.checkpoint--; state.inCover = true; }
    }
  }
  return state;
}
export function snapshotEscolta(state) {
  return {
    position: { x: state.position.x, z: state.position.z },
    checkpoint: state.checkpoint,
    escortCount: state.escortCount,
    contested: state.contested,
    threatened: state.threatened,
    inCover: state.inCover,
    unattendedFor: state.unattendedFor,
    boardedFor: state.boardedFor,
    winner: state.winner,
  };
}

export function aplicarSnapshotEscolta(state, net) {
  if (!net || typeof net !== 'object') return state;
  if (Number.isFinite(net.position?.x)) state.position.x = net.position.x;
  if (Number.isFinite(net.position?.z)) state.position.z = net.position.z;
  if (Number.isInteger(net.checkpoint)) state.checkpoint = Math.max(0, Math.min(state.caminho.length - 1, net.checkpoint));
  if (Number.isInteger(net.escortCount) && net.escortCount >= 0) state.escortCount = net.escortCount;
  state.contested = net.contested === true;
  state.threatened = net.threatened === true;
  state.inCover = net.inCover === true;
  if (Number.isFinite(net.unattendedFor) && net.unattendedFor >= 0) state.unattendedFor = net.unattendedFor;
  if (Number.isFinite(net.boardedFor) && net.boardedFor >= 0) state.boardedFor = net.boardedFor;
  state.winner = net.winner === 'E' || net.winner === 'B' ? net.winner : null;
  return state;
}

function marchaMilitar(sfx) {
  try {
    sfx.ensure();
    const ctx = sfx.ctx;
    if (!ctx || !sfx.master) return [];
    const fontes = [];
    const agora = ctx.currentTime;
    const notas = [196, 247, 294, 392, 294, 330, 392, 494];
    for (let i = 0; i < 24; i++) {
      const t = agora + i * 0.34;
      const caixa = ctx.createOscillator();
      const cg = ctx.createGain();
      caixa.type = 'square'; caixa.frequency.value = i % 4 === 0 ? 92 : 138;
      cg.gain.setValueAtTime(0.0001, t);
      cg.gain.exponentialRampToValueAtTime(i % 4 === 0 ? 0.055 : 0.025, t + 0.008);
      cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      caixa.connect(cg); cg.connect(sfx.master); caixa.start(t); caixa.stop(t + 0.1); fontes.push(caixa);
      if (i % 2 === 0) {
        const metal = ctx.createOscillator();
        const mg = ctx.createGain();
        metal.type = 'sawtooth'; metal.frequency.value = notas[(i / 2) % notas.length];
        mg.gain.setValueAtTime(0.0001, t);
        mg.gain.exponentialRampToValueAtTime(0.032, t + 0.04);
        mg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        metal.connect(mg); mg.connect(sfx.master); metal.start(t); metal.stop(t + 0.32); fontes.push(metal);
      }
    }
    return fontes;
  } catch { return []; }
}

export class OperacaoFlavio {
  constructor(game, vipDef) {
    this.game = game;
    this.vip = game.bots.find((bot) => bot.team === 'B') || null;
    this.state = criarEstadoEscolta(game.world.escortPath);
    this.fontes = [];
    this.cinematic = null;
    this.deathAnnounced = false;
    this._vipMoveSpeed = 0;
    this.hud = null;
    if (!this.vip) return;
    this.vip.weapon = 'knife';
    this.vip.primary = 'knife';
    this.vip.secondary = 'knife';
    this.vip._objectiveNpc = 'flavio';
    game._trocarPersonagem(this.vip, vipDef, true);
    this.vip.name = game.online || game.dedicated ? 'Flávio Bolsonaro' : '[VIP] Flávio Bolsonaro';
    this.travarArmaVip();
    if (!game.dedicated && typeof document !== 'undefined') {
      this.hud = document.createElement('div');
      this.hud.id = 'escort-objective';
      this.hud.style.cssText = 'position:fixed;left:50%;top:5.7rem;transform:translateX(-50%);z-index:12;padding:.55rem .9rem;background:#09101cdd;border:1px solid #d8b765;color:#fff;font:700 13px/1.2 system-ui;letter-spacing:.04em;pointer-events:none';
      game.el.hud?.append?.(this.hud);
      this._key = (event) => {
        if (this.cinematic && this.game.time - this.cinematic.startedAt >= 2 && (event.code === 'Space' || event.code === 'Escape')) this.game.stateUntil = this.game.time;
      };
      window.addEventListener('keydown', this._key);
    }
  }
  travarArmaVip() {
    if (!this.vip) return;
    this.vip.weapon = 'knife';
    this.vip.primary = 'knife';
    this.vip.secondary = 'knife';
    this.vip.target = null;
    if (this.vip._meshWeapon !== 'knife') this.game._syncRemoteWeapon(this.vip, 'knife');
  }

  botDestination(bot) {
    if (!this.vip?.alive || !bot?.alive || bot === this.vip || bot.team !== 'B') return null;
    const ameacas = this.game.combatants.filter((ent) => ent.team === 'E' && ent.alive !== false);
    return destinoProtecaoEscolta(bot, this.vip, this.game.bots, ameacas, bot._escortDestination || (bot._escortDestination = {}));
  }

  // Fontes agendadas também precisam parar ao pular ou substituir a cena.
  _encerrarFontes() {
    for (const fonte of this.fontes) { try { fonte.stop(); } catch { /* já parada */ } }
    this.fontes = [];
  }

  prepareRound() {
    if (!this.vip) return;
    this._encerrarFontes();
    this.state = criarEstadoEscolta(this.game.world.escortPath);
    const plano = this.game.world.objectivePlane;
    if (plano?.position) {
      this._planeOrigin ??= { x: plano.position.x, y: plano.position.y, z: plano.position.z };
      plano.position.x = this._planeOrigin.x;
      plano.position.y = this._planeOrigin.y;
      plano.position.z = this._planeOrigin.z;
    }
    this.game.timeLeft = 360;
    this.vip.alive = true;
    this.vip.hp = 100;
    this.vip.respawnAt = Infinity;
    this.vip.pos.set(this.state.position.x, this.game.world.groundHeightAt(this.state.position.x, this.state.position.z), this.state.position.z);
    this.travarArmaVip();
    this.cinematic = null;
    this.deathAnnounced = false;
    this._vipMoveSpeed = 0;
    if (this.game.vmScene) this.game.vmScene.visible = true;
    if (this.hud) this.hud.hidden = false;
  }

  ameacaMaisPerto() {
    if (!this.vip) return null;
    let melhor = null, distancia = Infinity;
    for (const ent of this.game.combatants) {
      if (ent.team !== 'E' || ent.alive === false) continue;
      const atual = d2(ent.pos, this.vip.pos);
      if (atual < distancia) { melhor = ent; distancia = atual; }
    }
    return melhor;
  }

  moverVip(origem, proposta) {
    const dx = proposta.x - origem.x, dz = proposta.z - origem.z;
    const passos = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.16));
    this.vip.pos.x = origem.x;
    this.vip.pos.z = origem.z;
    for (let i = 0; i < passos; i++) {
      this.vip.pos.x += dx / passos;
      this.vip.pos.z += dz / passos;
      this.game._collide(this.vip.pos, 0.46);
    }
    return { x: this.vip.pos.x, z: this.vip.pos.z };
  }

  anunciarMorte() {
    if (this.deathAnnounced) return;
    this.deathAnnounced = true;
    this.game._banner?.('FLÁVIO FOI MORTO', 'A escolta fracassou');
    if (this.hud) {
      this.hud.style.background = '#3b0808ee';
      this.hud.style.borderColor = '#ff514f';
      this.hud.textContent = 'FLÁVIO FOI MORTO · ESCOLTA FRACASSOU';
    }
  }

  update(dt) {
    if (!this.vip || this.game.state !== 'live') return;
    this.travarArmaVip();
    if (!this.game.online || this.game.dedicated) {
      const antes = { x: this.vip.pos.x, z: this.vip.pos.z };
      passoEscolta(this.state, {
        defensores: this.game.combatants.filter((ent) => ent !== this.vip && ent.team === 'B'),
        atacantes: this.game.combatants.filter((ent) => ent.team === 'E'),
        vipAlive: this.vip.alive,
      }, dt, { mover: (origem, proposta) => this.moverVip(origem, proposta) });
      this.vip.pos.x = this.state.position.x;
      this.vip.pos.z = this.state.position.z;
      this.vip.pos.y = this.game.world.groundHeightAt(this.vip.pos.x, this.vip.pos.z);
      this._vipMoveSpeed = Math.hypot(this.vip.pos.x - antes.x, this.vip.pos.z - antes.z) / Math.max(dt, 1e-3);
      const ameaca = this.ameacaMaisPerto();
      const proximo = this.state.threatened && ameaca
        ? ameaca.pos
        : this.state.caminho[Math.min(this.state.checkpoint + 1, this.state.caminho.length - 1)];
      this.vip.yaw = Math.atan2(proximo.x - this.vip.pos.x, proximo.z - this.vip.pos.z);
      if (!this.vip.alive) this.anunciarMorte();
      if (this.state.winner) this.game._endRound(this.state.winner);
    } else {
      let checkpoint = 0, distance = Infinity;
      for (let i = 0; i < this.state.caminho.length; i++) {
        const current = d2(this.vip.pos, this.state.caminho[i]);
        if (current < distance) { checkpoint = i; distance = current; }
      }
      this.state.position.x = this.vip.pos.x;
      this.state.position.z = this.vip.pos.z;
      this.state.checkpoint = checkpoint;
      this.state.escortCount = vivosNoRaio(this.game.combatants.filter((ent) => ent !== this.vip && ent.team === 'B'), this.state.position, ESCORT_RADIUS).length;
      this.state.contested = vivosNoRaio(this.game.combatants.filter((ent) => ent.team === 'E'), this.state.position, CONTEST_RADIUS).length > 0;
      this.state.threatened = vivosNoRaio(this.game.combatants.filter((ent) => ent.team === 'E'), this.state.position, THREAT_RADIUS).length > 0;
      if (!this.vip.alive) this.anunciarMorte();
    }
    this.atualizaHud();
  }

  updateBot(bot, dt) {
    if (bot !== this.vip || (this.game.online && !this.game.dedicated)) return false;
    const group = bot.mesh?.group;
    if (!group) return true;
    bot.mesh.ctrl?.setCrouch?.(Boolean(this.state.threatened));
    if (!bot.alive) {
      bot.deadT = (bot.deadT || 0) + dt;
      bot.mesh.ctrl?.setCrouch?.(false);
      bot.mesh.ctrl?.die?.();
      bot.mesh.ctrl?.update?.(dt, 0, false);
      if (bot.deadT > 1) group.visible = false;
      return true;
    }
    group.visible = true;
    group.position.set(bot.pos.x, bot.pos.y, bot.pos.z);
    group.rotation.y = bot.yaw;
    bot.mesh.ctrl?.update?.(dt, this._vipMoveSpeed > 0.2 ? 1 : 0, false, this._vipMoveSpeed);
    return true;
  }

  atualizaHud() {
    if (!this.hud || this.deathAnnounced || this.cinematic) return;
    const total = this.state.caminho.length - 1;
    const status = this.state.threatened
      ? this.state.inCover ? 'EM COBERTURA' : 'BUSCANDO COBERTURA'
      : this.state.contested ? 'CONTESTADO'
      : this.state.escortCount ? `${this.state.escortCount} ESCOLTANDO` : 'SEM ESCOLTA';
    this.hud.textContent = `OPERAÇÃO FLÁVIO · ${this.state.checkpoint}/${total} · ${status} · ${Math.max(0, Math.ceil(this.game.timeLeft))}s`;
  }

  roundIntro() {
    return 'ESCOLTE FLÁVIO ATÉ O AVIÃO · 6 MINUTOS';
  }

  roundResult(winner) {
    const morto = winner === 'E' && (!this.vip?.alive || this.deathAnnounced);
    return {
      duration: 9,
      title: winner === 'B' ? 'FLÁVIO EMBARCOU' : morto ? 'FLÁVIO FOI MORTO' : 'A FUGA FOI INTERROMPIDA',
      detail: winner === 'B'
        ? 'o avião está pronto para decolar'
        : morto ? 'a escolta fracassou antes do embarque' : 'o aeroporto foi bloqueado',
    };
  }

  startCinematic(winner) {
    this._encerrarFontes();   // cena nova substitui a marcha anterior, não dobra com ela
    this.cinematic = { winner, startedAt: this.game.time };
    if (this.game.vmScene) this.game.vmScene.visible = false;
    this.fontes = marchaMilitar(this.game.sfx);
    if (this.hud) this.hud.textContent = winner === 'B'
      ? 'EMBARQUE CONCLUÍDO'
      : !this.vip?.alive || this.deathAnnounced ? 'FLÁVIO FOI MORTO · ESCOLTA FRACASSOU' : 'OPERAÇÃO INTERROMPIDA';
  }

  updatePresentation() {
    if (!this.cinematic || this.game.dedicated) return;
    const t = Math.min(1, (this.game.time - this.cinematic.startedAt) / 9);
    const cam = this.game.camera;
    const ganhou = this.cinematic.winner === 'B';
    const a = ganhou ? { x: 17, y: 8, z: 35 } : { x: -15, y: 6, z: 29 };
    const b = ganhou ? { x: 4, y: 5, z: 59 } : { x: 0, y: 4, z: 43 };
    const smooth = t * t * (3 - 2 * t);
    cam.position.set(a.x + (b.x - a.x) * smooth, a.y + (b.y - a.y) * smooth, a.z + (b.z - a.z) * smooth);
    cam.lookAt(0, 2.1, ganhou ? 54 : 38);
    if (ganhou && this.game.world.objectivePlane) {
      this.game.world.objectivePlane.position.z = 55 + Math.max(0, t - 0.35) * 20;
    }
  }

  netState() {
    const snap = snapshotEscolta(this.state);
    const nid = this.vip?._nid;
    if (Number.isInteger(nid) && nid >= 0 && nid <= 65535) snap.vipId = nid;   // id autoritativo do NPC: cliente reserva o corpo dele antes do casamento
    return snap;
  }

  applyNetState(net) {
    if (!this.game.online || this.game.dedicated) return;
    aplicarSnapshotEscolta(this.state, net);
  }

  dispose() {
    if (this._key) window.removeEventListener('keydown', this._key);
    this.hud?.remove();
    this._encerrarFontes();
  }
}

export const criarOperacaoFlavio = (game, vipDef) => game._mapId === 'operacao_flavio' ? new OperacaoFlavio(game, vipDef) : null;
