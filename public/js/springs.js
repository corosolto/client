// Springs (port do Claude-of-Duty src/player/springs.js): oscilador amortecido sub-stepado
// (framerate-independent) + RecoilAxis (spring rápido + residual exponencial — sobe na hora,
// volta quase tudo, settle lento). Base do feel do viewmodel/recoil.
//
// Desde a rodada de CONSISTÊNCIA este arquivo também exporta o `ViewModelRig` (fim do
// arquivo): a máquina de estados PROCEDURAL do viewmodel (idle/sway, walk bob, fire kick,
// reload, draw/holster, ADS). Ver o cabeçalho da classe para o porquê de ser procedural.
const TAU = Math.PI * 2;
const MAX_SUB_DT = 1 / 360;

export function approach(current, target, tau, dt) {
  if (tau <= 1e-6) return target;
  return target + (current - target) * Math.exp(-dt / tau);
}

export class Spring {
  constructor(freq = 8, damping = 0.7, value = 0) {
    this.freq = freq; this.damping = damping; this.value = value; this.velocity = 0; this.target = 0;
  }
  reset(value = 0) { this.value = value; this.velocity = 0; return this; }
  impulse(v) { this.velocity += v; return this; }
  step(dt) {
    if (dt <= 0) return this.value;
    const w = TAU * this.freq, k = w * w, c = 2 * this.damping * w;
    let remaining = dt, guard = 0;
    while (remaining > 1e-7 && guard++ < 24) {
      const h = remaining > MAX_SUB_DT ? MAX_SUB_DT : remaining;
      remaining -= h;
      const a = -k * (this.value - this.target) - c * this.velocity;
      this.velocity += a * h;
      this.value += this.velocity * h;
    }
    if (Math.abs(this.value - this.target) < 1e-7 && Math.abs(this.velocity) < 1e-6) { this.value = this.target; this.velocity = 0; }
    return this.value;
  }
}

export class RecoilAxis {
  constructor(freq = 9.5, damping = 0.52, residualTau = 0.3, residualShare = 0.34) {
    this.spring = new Spring(freq, damping, 0);
    this.residual = 0; this.residualTau = residualTau; this.residualShare = residualShare; this.value = 0;
  }
  reset() { this.spring.reset(0); this.residual = 0; this.value = 0; }
  kick(amount) {   // displacement kick: mais snappy que velocity kick
    this.spring.value += amount * (1 - this.residualShare);
    this.residual += amount * this.residualShare;
  }
  step(dt) {
    this.spring.step(dt);
    this.residual = approach(this.residual, 0, this.residualTau, dt);
    this.value = this.spring.value + this.residual;
    return this.value;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ViewModelRig — animação PROCEDURAL do viewmodel (o "parecer jogo").
//
// PORQUÊ PROCEDURAL, e não clipe importado: são 26 IDs de arma servidos por poucas
// malhas-base; assar 6 clipes × 26 armas é caro, pesa no download e ainda assim
// dessincroniza do número de munição. Molas + curvas custam ~0 e casam com qualquer
// malha, inclusive as novas da Mint. É o que CS 1.6, ev.io e VALORANT entregam de
// fato: o conjunto MÍNIMO completo (idle/sway, bob, kick, reload, draw/holster, ADS)
// sempre presente, nunca um estado faltando. Régua: BAR-CONSISTENCIA C12/C13/C14/C15/C16.
//
// PORQUÊ AQUI (springs.js): este arquivo já tem `Spring` sub-stepada a 1/360 e
// `RecoilAxis` validados; a animação é feita EM CIMA deles, sem reescrever nada, e o
// módulo continua sem depender do three (números puros) — dá pra testar no node.
//
// CONTRATO COM O game.js (as saídas são OFFSETS, nunca posições absolutas):
//   pos {x,y,z}  metros a somar na posição base do viewmodel (x direita, y cima,
//                z = pra TRÁS/em direção ao jogador — é onde o coice empurra)
//   rot {x,y,z}  radianos a somar na rotação base. DEVE ser aplicado num pivô no
//                PONTO DE GRIP da arma. Girar na origem do grupo é exatamente o que
//                faz "a mão soltar da arma": a mão está presa ao grip, então o grip
//                é o único centro de rotação que mantém o contato (C7).
//   adsK         0..1 já suavizado — o game.js interpola pose/FOV/sensibilidade com ele
//   magDrop      0..1 deslocamento do carregador (se a malha expuser um)
// Nada aqui lê ou escreve estado do jogo: o rig é surdo-mudo, só recebe eventos.
// ─────────────────────────────────────────────────────────────────────────────

// Curvas: suave nas pontas (sem pop, C15) e sem overshoot que descole a mão.
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const VM_TIMES = {
  adsIn: 0.10,      // s — C10 exige a transição completa em <= 120 ms
  adsOut: 0.09,
  draw: 0.28,       // a arma sobe pela borda de baixo (Halo/CS), não materializa
  holster: 0.16,    // curto: o jogador não pode sentir que "perdeu" a arma
  bobStopTau: 0.085, // parar => bob some em ~0,30 s (3,5 taus) — C16
};

export class ViewModelRig {
  constructor(opts = {}) {
    const o = opts;
    this.scale = o.scale ?? 1;            // multiplicador global (knob de tuning)
    /* GANHO DO BOB, separado do `scale`. Existe porque quem plugou o rig no game.js já
       tinha um bob TRAVADO NA CADÊNCIA DOS PASSOS (`p.stepPhase`, o mesmo contador que
       dispara o som de passo): somar o bob daqui, que roda em fase própria, dobraria a
       amplitude E dessincronizaria a arma do som. `bobGain: 0` deixa isso EXPLÍCITO no
       construtor — a alternativa era o caller mentir `speed: 0` no update, o que também
       mataria a atenuação da respiração em corrida e não diria a ninguém o porquê.
       `bobAmp` continua sendo calculado (é ele que atenua a respiração andando). */
    this.bobGain = o.bobGain ?? 1;
    this.runSpeed = o.runSpeed ?? 6.6;    // m/s do sprint: normaliza a amplitude do bob
    // Molas: o viewmodel ATRASA em relação à câmera. Sem esse atraso a arma fica
    // colada na mira e o jogo lê como "cenário grudado na tela", nunca como arma.
    this.swayX = new Spring(o.swayFreq ?? 6.5, o.swayDamp ?? 0.72);
    this.swayY = new Spring(o.swayFreq ?? 6.5, o.swayDamp ?? 0.72);
    this.swayR = new Spring(5.5, 0.70);   // roll de inércia lateral
    // Coice do VM SEPARADO do coice da câmera (o da câmera é o de mira; este é o
    // da arma). Misturar os dois foi o que fazia a arma "pular fora" ao atirar.
    this.kickZ = new RecoilAxis(13, 0.50, 0.16, 0.25);
    this.kickP = new RecoilAxis(12, 0.48, 0.20, 0.30);
    this.kickR = new RecoilAxis(10, 0.55, 0.18, 0.28);
    this.bobAmp = 0; this.bobPhase = 0;
    this.ads = 0; this.adsK = 0; this.adsTarget = 0;
    this.state = 'idle';                  // idle | reload | holster | draw
    this.t = 0; this.dur = 0;             // relógio do estado atual
    this.reloadK = 0; this.magDrop = 0;
    this._reloadDone = false; this._swapPoint = false; this._drawDur = VM_TIMES.draw;
    this.breath = 0;
    this.pos = { x: 0, y: 0, z: 0 };
    this.rot = { x: 0, y: 0, z: 0 };
  }

  // ---- eventos ----------------------------------------------------------
  // Coice: `s` escala pelo recuo da arma (WEAPONS[w].recoil normalizado pelo caller).
  fire(s = 1) {
    this.kickZ.kick(0.042 * s);
    this.kickP.kick(0.055 * s);
    this.kickR.kick((Math.random() * 2 - 1) * 0.030 * s);
    if (this.state === 'reload') this.cancelReload();   // atirar cancela recarga (CS)
  }
  // dur = EXATAMENTE o `reload` da tabela de armas. O clipe termina junto com a
  // munição mudando porque quem troca o número é o consumeReloadDone() deste rig,
  // no mesmo quadro em que a animação chega ao fim (C13, tolerância 0 ms).
  startReload(dur) {
    if (this.state === 'holster' || this.state === 'draw') return false;
    this.state = 'reload'; this.t = 0; this.dur = Math.max(0.3, dur || 2.0);
    this._reloadDone = false;
    return true;
  }
  cancelReload() { if (this.state === 'reload') { this.state = 'idle'; this.reloadK = 0; this.magDrop = 0; } }
  // Troca de arma: guarda a atual (desce) e saca a nova (sobe). A troca da MALHA
  // acontece no ponto mais baixo do arco, quando consumeSwapPoint() vira true —
  // é isso que garante "nenhum quadro com duas armas nem com nenhuma" (C14).
  startSwap(holsterDur, drawDur) {
    this.state = 'holster'; this.t = 0; this.dur = holsterDur ?? VM_TIMES.holster;
    this._drawDur = drawDur ?? VM_TIMES.draw;
    this._swapPoint = false; this._reloadDone = false;
    this.magDrop = 0; this.reloadK = 0;
  }
  // Saque puro (spawn/respawn/pegar arma no chão): sem holster antes.
  startDraw(dur) { this.state = 'draw'; this.t = 0; this.dur = dur ?? VM_TIMES.draw; }
  setAds(on) { this.adsTarget = on ? 1 : 0; }
  // Estes dois são consumidos UMA vez: o caller usa como gatilho de gameplay.
  consumeReloadDone() { const v = this._reloadDone; this._reloadDone = false; return v; }
  consumeSwapPoint() { const v = this._swapPoint; this._swapPoint = false; return v; }
  get busy() { return this.state !== 'idle'; }
  // Volta ao estado neutro sem animação (morte/respawn/pausa): evita overlay órfão.
  reset() {
    this.state = 'idle'; this.t = 0; this.reloadK = 0; this.magDrop = 0; this.bobAmp = 0;
    this.ads = 0; this.adsK = 0; this.adsTarget = 0;
    this.kickZ.reset(); this.kickP.reset(); this.kickR.reset();
    this.swayX.reset(); this.swayY.reset(); this.swayR.reset();
    this._reloadDone = false; this._swapPoint = false;
    this.pos.x = this.pos.y = this.pos.z = 0; this.rot.x = this.rot.y = this.rot.z = 0;
  }

  // ---- quadro -----------------------------------------------------------
  // s = { dt, speed (m/s no plano), grounded, lookDX, lookDY (rad do quadro), crouch }
  update(dt, s = {}) {
    if (!(dt > 0)) dt = 1 / 60;
    dt = Math.min(dt, 0.1);                        // trava de aba em background
    const speed = Math.max(0, s.speed || 0);
    const look = s.lookDX || 0, lookY = s.lookDY || 0;

    // 1) ADS — entra/sai em <=120 ms, com curva suave nas duas pontas. Sem salto:
    // o game.js interpola a POSE com adsK, então nenhum quadro anda mais que ~15%
    // do trajeto (C10) porque a derivada da smoothstep é limitada.
    const adsSpd = 1 / (this.adsTarget > this.ads ? VM_TIMES.adsIn : VM_TIMES.adsOut);
    this.ads = clamp(this.ads + Math.sign(this.adsTarget - this.ads) * adsSpd * dt, 0, 1);
    if (Math.abs(this.adsTarget - this.ads) < 1e-3) this.ads = this.adsTarget;
    this.adsK = smooth(this.ads);
    const hip = 1 - this.adsK;                     // quase tudo some ao mirar

    // 2) Máquina de estados (reload/holster/draw). Só UM estado por vez, e todos
    // terminam sozinhos — nenhum caminho deixa o VM preso fora do lugar.
    let stPos = { x: 0, y: 0, z: 0 }, stRot = { x: 0, y: 0, z: 0 };
    if (this.state !== 'idle') {
      this.t += dt;
      const k = this.dur > 0 ? clamp(this.t / this.dur, 0, 1) : 1;
      if (this.state === 'reload') {
        this.reloadK = k;
        // Fases (frações da duração declarada): inclina só o suficiente para abrir
        // a área do carregador. A arma permanece inteira no quadro: a leitura vem
        // das mãos, do pente e do ferrolho, não de escondê-la fora da câmera.
        const dip = smooth(clamp(k / 0.18, 0, 1)) * (1 - smooth(clamp((k - 0.82) / 0.18, 0, 1)));
        stPos.y = -0.020 * dip; stPos.z = 0.012 * dip; stPos.x = -0.008 * dip;
        stRot.x = -0.13 * dip; stRot.y = 0.055 * dip; stRot.z = 0.085 * dip;
        // carregador: cai entre 20% e 45%, novo entra entre 45% e 70%
        this.magDrop = k < 0.20 ? 0 : k < 0.45 ? smooth((k - 0.20) / 0.25)
          : k < 0.70 ? 1 - smooth((k - 0.45) / 0.25) : 0;
        // tapa no carregador + ferrolho: dois solavancos curtos, o que dá peso
        if (k > 0.66 && k < 0.74) stPos.y += -0.006 * Math.sin((k - 0.66) / 0.08 * Math.PI);
        if (k > 0.80 && k < 0.88) stRot.x += 0.028 * Math.sin((k - 0.80) / 0.08 * Math.PI);
        if (k >= 1) { this.state = 'idle'; this.reloadK = 0; this.magDrop = 0; this._reloadDone = true; }
      } else if (this.state === 'holster') {
        const g = smooth(k);
        stPos.y = -0.34 * g; stPos.z = 0.10 * g; stRot.x = -1.05 * g; stRot.z = 0.22 * g;
        if (k >= 1) { this._swapPoint = true; this.state = 'draw'; this.t = 0; this.dur = this._drawDur; }
      } else if (this.state === 'draw') {
        const g = 1 - smooth(k);                   // entra pela borda de baixo
        stPos.y = -0.34 * g; stPos.z = 0.10 * g; stRot.x = -1.05 * g; stRot.z = 0.22 * g;
        if (k >= 1) this.state = 'idle';
      }
    }

    // 3) Bob de caminhada — amplitude PROPORCIONAL à velocidade e zerada em ~0,30 s
    // ao parar (C16). O bob some no ar: pé no chão é que produz passo.
    const want = (s.grounded === false ? 0 : 1) * clamp(speed / this.runSpeed, 0, 1);
    this.bobAmp = want > this.bobAmp
      ? approach(this.bobAmp, want, 0.10, dt)      // sobe rápido
      : approach(this.bobAmp, want, VM_TIMES.bobStopTau, dt);   // e cai em 300 ms
    // cadência do passo acompanha a velocidade (não é frequência fixa)
    this.bobPhase += dt * (4.2 + 3.2 * clamp(speed / this.runSpeed, 0, 1)) * (this.bobAmp > 1e-3 ? 1 : 0);
    const bA = this.bobAmp * this.scale * this.bobGain * (0.35 + 0.65 * hip) * (s.crouch ? 0.6 : 1);
    const bobX = Math.sin(this.bobPhase) * 0.016 * bA;
    const bobY = -Math.abs(Math.cos(this.bobPhase)) * 0.011 * bA;   // 2 passos por ciclo
    const bobR = Math.sin(this.bobPhase) * 0.030 * bA;

    // 4) Sway — a arma atrasa em relação à mira. Alvo proporcional ao giro do quadro
    // (normalizado por dt pra não depender de FPS), com teto pra não sair do quadro.
    const rate = 1 / Math.max(dt, 1e-3);
    this.swayX.target = clamp(-look * rate * 0.010, -0.045, 0.045) * hip * this.scale;
    this.swayY.target = clamp(lookY * rate * 0.008, -0.035, 0.035) * hip * this.scale;
    this.swayR.target = clamp(-look * rate * 0.020, -0.075, 0.075) * hip * this.scale;
    this.swayX.step(dt); this.swayY.step(dt); this.swayR.step(dt);

    // 5) Respiração — a arma NUNCA fica perfeitamente parada (é o que separa "arma"
    // de "sprite colado"). Mínima em ADS: mirar tem que ser estável.
    this.breath += dt;
    const brA = (0.25 + 0.75 * hip) * (1 - this.bobAmp) * this.scale;
    const brY = Math.sin(this.breath * 2.0) * 0.0030 * brA;
    const brP = Math.sin(this.breath * 2.0 + 0.8) * 0.0045 * brA;

    // 6) Coice do VM (independente do da câmera)
    const kz = this.kickZ.step(dt), kp = this.kickP.step(dt), kr = this.kickR.step(dt);

    this.pos.x = stPos.x + bobX + this.swayX.value;
    this.pos.y = stPos.y + bobY + this.swayY.value + brY;
    this.pos.z = stPos.z + kz * (0.55 + 0.45 * hip);
    this.rot.x = stRot.x + kp * (0.6 + 0.4 * hip) + brP + this.swayY.value * 0.9;
    this.rot.y = stRot.y + this.swayX.value * 1.1;
    this.rot.z = stRot.z + bobR + this.swayR.value + kr;
    return this;
  }
}
