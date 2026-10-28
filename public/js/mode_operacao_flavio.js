const ESCORT_RADIUS = 6;
const CONTEST_RADIUS = 4;
const ESCORT_SPEED = 1.8;
const RETURN_SPEED = 0.65;
const RETURN_DELAY = 4;
const BOARDING_TIME = 3;

const d2 = (a, b) => {
  const dx = (a.x ?? a.pos?.x ?? 0) - b.x;
  const dz = (a.z ?? a.pos?.z ?? 0) - b.z;
  return dx * dx + dz * dz;
};
const vivosNoRaio = (lista, pos, raio) => lista.filter((ent) => ent.alive !== false && d2(ent.pos || ent, pos) <= raio * raio);

export function criarEstadoEscolta(caminho) {
  if (!Array.isArray(caminho) || caminho.length < 2) throw new Error('Operação Flávio exige ao menos dois checkpoints');
  return {
    caminho: caminho.map(({ x, z }) => ({ x, z })),
    position: { ...caminho[0] },
    checkpoint: 0,
    escortCount: 0,
    contested: false,
    unattendedFor: 0,
    boardedFor: 0,
    winner: null,
  };
}

function moverAte(state, alvo, distancia) {
  const dx = alvo.x - state.position.x;
  const dz = alvo.z - state.position.z;
  const falta = Math.hypot(dx, dz);
  if (falta <= distancia || falta < 1e-6) {
    state.position.x = alvo.x;
    state.position.z = alvo.z;
    return true;
  }
  const k = distancia / falta;
  state.position.x += dx * k;
  state.position.z += dz * k;
  return false;
}

export function passoEscolta(state, contexto, dt, { mutante = '' } = {}) {
  if (state.winner || dt <= 0) return state;
  if (!contexto.vipAlive) {
    state.winner = 'E';
    return state;
  }
  const defensores = vivosNoRaio(contexto.defensores || [], state.position, ESCORT_RADIUS);
  const atacantes = vivosNoRaio(contexto.atacantes || [], state.position, CONTEST_RADIUS);
  state.escortCount = defensores.length;
  state.contested = mutante === 'sem-contestacao' ? false : atacantes.length > 0;
  const acompanhado = defensores.length > 0 && !state.contested;
  const ultimo = state.caminho.length - 1;

  if (state.checkpoint >= ultimo) {
    state.boardedFor = acompanhado ? state.boardedFor + dt : 0;
    if (state.boardedFor >= BOARDING_TIME) state.winner = 'B';
    return state;
  }

  if (acompanhado) {
    state.unattendedFor = 0;
    const chegou = moverAte(state, state.caminho[state.checkpoint + 1], ESCORT_SPEED * dt);
    if (chegou) state.checkpoint++;
  } else if (!state.contested) {
    state.unattendedFor += dt;
    if (state.unattendedFor > RETURN_DELAY && state.checkpoint > 0) {
      const chegou = moverAte(state, state.caminho[state.checkpoint - 1], RETURN_SPEED * dt);
      if (chegou) state.checkpoint--;
    }
  }
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
    this.hud = null;
    if (!this.vip) return;
    game._trocarPersonagem(this.vip, vipDef, true);
    this.vip.name = game.online || game.dedicated ? 'Flávio Bolsonaro' : '[VIP] Flávio Bolsonaro';
    this.vip._objectiveNpc = 'flavio';
    this.vip.weapon = 'knife';
    this.vip.primary = 'knife';
    game._syncRemoteWeapon(this.vip, 'knife');
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

  prepareRound() {
    if (!this.vip) return;
    this.state = criarEstadoEscolta(this.game.world.escortPath);
    this.game.timeLeft = 360;
    this.vip.alive = true;
    this.vip.hp = 100;
    this.vip.respawnAt = Infinity;
    this.vip.pos.set(this.state.position.x, this.game.world.groundHeightAt(this.state.position.x, this.state.position.z), this.state.position.z);
    this.cinematic = null;
    if (this.game.vmScene) this.game.vmScene.visible = true;
    if (this.hud) this.hud.hidden = false;
  }

  update(dt) {
    if (!this.vip || this.game.state !== 'live') return;
    if (!this.game.online || this.game.dedicated) {
      passoEscolta(this.state, {
        defensores: this.game.combatants.filter((ent) => ent !== this.vip && ent.team === 'B'),
        atacantes: this.game.combatants.filter((ent) => ent.team === 'E'),
        vipAlive: this.vip.alive,
      }, dt);
      this.vip.pos.x = this.state.position.x;
      this.vip.pos.z = this.state.position.z;
      this.vip.pos.y = this.game.world.groundHeightAt(this.vip.pos.x, this.vip.pos.z);
      const proximo = this.state.caminho[Math.min(this.state.checkpoint + 1, this.state.caminho.length - 1)];
      this.vip.yaw = Math.atan2(proximo.x - this.vip.pos.x, proximo.z - this.vip.pos.z);
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
    }
    this.atualizaHud();
  }

  updateBot(bot, dt) {
    if (bot !== this.vip || (this.game.online && !this.game.dedicated)) return false;
    const group = bot.mesh?.group;
    if (!group) return true;
    if (!bot.alive) {
      bot.deadT = (bot.deadT || 0) + dt;
      bot.mesh.ctrl?.die?.();
      bot.mesh.ctrl?.update?.(dt, 0, false);
      if (bot.deadT > 1) group.visible = false;
      return true;
    }
    group.visible = true;
    group.position.set(bot.pos.x, bot.pos.y, bot.pos.z);
    group.rotation.y = bot.yaw;
    bot.mesh.ctrl?.update?.(dt, this.state.contested ? 0 : ESCORT_SPEED, false);
    return true;
  }

  atualizaHud() {
    if (!this.hud) return;
    const total = this.state.caminho.length - 1;
    const status = this.state.contested ? 'CONTESTADO' : this.state.escortCount ? `${this.state.escortCount} ESCOLTANDO` : 'SEM ESCOLTA';
    this.hud.textContent = `OPERAÇÃO FLÁVIO · ${this.state.checkpoint}/${total} · ${status} · ${Math.max(0, Math.ceil(this.game.timeLeft))}s`;
  }

  roundIntro() {
    return 'ESCOLTE FLÁVIO ATÉ O AVIÃO · 6 MINUTOS';
  }

  roundResult(winner) {
    return {
      duration: 9,
      title: winner === 'B' ? 'FLÁVIO EMBARCOU' : 'A FUGA FOI INTERROMPIDA',
      detail: winner === 'B' ? 'o avião está pronto para decolar' : 'o aeroporto foi bloqueado',
    };
  }

  startCinematic(winner) {
    this.cinematic = { winner, startedAt: this.game.time };
    if (this.game.vmScene) this.game.vmScene.visible = false;
    this.fontes = marchaMilitar(this.game.sfx);
    if (this.hud) this.hud.textContent = winner === 'B' ? 'EMBARQUE CONCLUÍDO' : 'OPERAÇÃO INTERROMPIDA';
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

  dispose() {
    if (this._key) window.removeEventListener('keydown', this._key);
    this.hud?.remove();
    for (const fonte of this.fontes) { try { fonte.stop(); } catch {} }
    this.fontes = [];
  }
}

export const criarOperacaoFlavio = (game, vipDef) => game._mapId === 'operacao_flavio' ? new OperacaoFlavio(game, vipDef) : null;
