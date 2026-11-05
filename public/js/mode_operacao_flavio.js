import { WEAPONS } from './data/weapons.js';

const ESCORT_RADIUS = 6;
const CONTEST_RADIUS = 4;
const THREAT_RADIUS = 14;
const ESCORT_SPEED = 1.8;
const COVER_SPEED = 2.5;
const RETURN_SPEED = 2.2;
const RETURN_DELAY = 4;
const BOARDING_TIME = 3;
const THREAT_MEMORY = 1.25;
const VIP_RADIUS = 0.46;
const VIP_REPLAN_DELAY = 0.75;
const GUARD_LEASH = 5.5;
const GUARD_ENGAGE_RADIUS = 7.5;
const GUARD_SLOT_RADIUS = 1.6;
const GUARD_PROTECT_RADIUS = 4.5;
const GUARD_ASSIGN_RADIUS = 12;
// Histerese da orientação da formação: engata em GUARD_ENGAGE_RADIUS, solta além de 1,25x —
// ameaças quase equidistantes não podem alternar o docking por quadro (flicker da escolta).
const ENGAGE_SAIDA = 1.25;
const FOCO_TROCA = 0.75;         // troca a ameaça engajada só com 25% de vantagem
const ORIENTACAO_TROCA = 0.85;
// Respawn do ATAQUE: vanguarda/base, nunca a retaguarda do comboio nem a sala de embarque.
const ATAQUE_DIST_VIP = 7;
// Sala de embarque: faixa sul do terminal + bolso externo das portas sul (espelhada no map-eval e em docs/maps/operacao-decola.md).
const SALA_EMBARQUE = { minX: -29, maxX: 29, minZ: -57, maxZ: -44 };
// Papéis da escolta: 4 guardas diretos (LMG, escopeta, rifle, sniper) + flanqueadores de
// vanguarda (7x7+); piso de skill e colete+capacete, IA genérica com LOS — sem wallhack.
const GUARDAS_DIRETOS = 4;
const ARMAS_GUARDA = ['lmg', 'shotgun', 'ak', 'awp'];
const ARMAS_FLANQUEADOR = ['mp5', 'carbine'];
const GUARDA_SKILL_PISO = 1.25;
const GUARDA_SKILL_VANTAGEM = 1.1;   // piso também fica acima da média inimiga
const FLANQUEADOR_VANGUARDA = 2;     // checkpoints à frente do comboio
const FLANQUEADOR_LATERAL = 3.4;
const FLANQUEADOR_LEASH = 30;
// Abrigo real (world.escortCoverPoints: {x,z,role,zone}): VIP busca cobertura de objeto
// sólido; guardas fazem snap por zona. Sem wallhack; detalhes: docs/reports/OPERACAO-FLAVIO-20261104.md.
const ABRIGO_RAIO = 8;
const ABRIGO_PESO_ANCORA = 1.4;
const ABRIGO_TROCA = 1.5;
const ABRIGO_COLADA = 4;
const ABRIGO_TROCA_FORTE = 4;
const ABRIGO_MIN_PERMANENCIA = 1.5;
const ROTEAMENTO_MEMORIA = 4;
const GUARDA_COBERTURA_RAIO = 4;
const GUARD_SLOTS = [
  { right: 0, forward: 2.4 },
  { right: -2.2, forward: 1.2 }, { right: 2.2, forward: 1.2 },
  { right: -3.1, forward: -0.7 }, { right: 3.1, forward: -0.7 },
  { right: -1.6, forward: -2.5 }, { right: 1.6, forward: -2.5 },
];
const ATTACK_SLOTS = [
  { right: 0, forward: 0.6 },
  { right: -2.2, forward: 1.4 }, { right: 2.2, forward: 1.4 },
  { right: -2.6, forward: -1.2 }, { right: 2.6, forward: -1.2 },
  { right: -1.2, forward: 2.8 }, { right: 1.2, forward: 2.8 },
];
const ATTACK_SLOT_RADIUS = 0.65;
const VIP_WEAPON = 'pistol';
const VIP_MAG = 12;

const d2 = (a, b) => {
  const dx = (a.x ?? a.pos?.x ?? 0) - b.x;
  const dz = (a.z ?? a.pos?.z ?? 0) - b.z;
  return dx * dx + dz * dz;
};
const vivosNoRaio = (lista, pos, raio) => lista.filter((ent) => ent.alive !== false && d2(ent.pos || ent, pos) <= raio * raio);
const formacoesEscolta = new WeakMap();
const formacoesAtaque = new WeakMap();
const orientacoesEscolta = new WeakMap();
const reservasCobertura = new WeakMap();

function slotEscolta(bot, vip, defensores) {
  let formacao = formacoesEscolta.get(vip);
  if (!formacao) { formacao = new Map(); formacoesEscolta.set(vip, formacao); }
  if (formacao.has(bot)) return formacao.get(bot);
  const usados = new Set(formacao.values());
  const livres = [];
  for (let i = 0; i < GUARD_SLOTS.length; i++) if (!usados.has(i)) livres.push(i);
  if (!livres.length) {
    const ordem = defensores.filter((ent) => ent !== vip && ent.team === bot.team).indexOf(bot);
    return Math.max(0, ordem) % GUARD_SLOTS.length;
  }
  // Reserva nasce perto do VIP: um bot distante recebe posição temporária, não rouba a vaga.
  if (d2(bot.pos, vip.pos) <= GUARD_ASSIGN_RADIUS * GUARD_ASSIGN_RADIUS) {
    formacao.set(bot, livres[0]);
    return livres[0];
  }
  const temporarios = defensores.filter((ent) => ent !== vip && ent.team === bot.team && ent?.pos
    && !formacao.has(ent) && d2(ent.pos, vip.pos) > GUARD_ASSIGN_RADIUS * GUARD_ASSIGN_RADIUS);
  const ordem = temporarios.indexOf(bot);
  return livres[Math.max(0, ordem) % livres.length];
}

// Ameaça viva mais próxima do VIP (distância ao quadrado, convenção do d2).
function ameacaMaisProxima(vip, ameacas) {
  let maisPerto = null, menorDistancia = Infinity;
  for (const ent of ameacas) {
    if (ent?.alive === false || !ent?.pos) continue;
    const distancia = d2(ent.pos, vip.pos);
    if (distancia < menorDistancia) { maisPerto = ent; menorDistancia = distancia; }
  }
  return { maisPerto, menorDistancia };
}

// Orientação da formação com HISTERESE (Schmitt): contato ancora o yaw e só solta fora de
// ENGAGE_SAIDA/morte; desengajada, troca só com vantagem clara (o flicker girava o docking).
function orientacaoFormacao(vip, ameacas) {
  const { maisPerto, menorDistancia } = ameacaMaisProxima(vip, ameacas);
  let orient = orientacoesEscolta.get(vip);
  if (orient && (orient.ameaca?.alive === false || !orient.ameaca?.pos)) orient = null;
  if (orient?.engajado) {
    const distancia = d2(orient.ameaca.pos, vip.pos);
    if (distancia > (GUARD_ENGAGE_RADIUS * ENGAGE_SAIDA) ** 2) orient.engajado = false;
    else if (maisPerto && maisPerto !== orient.ameaca && menorDistancia < distancia * FOCO_TROCA ** 2) {
      orient = { ameaca: maisPerto, yaw: Math.atan2(maisPerto.pos.x - vip.pos.x, maisPerto.pos.z - vip.pos.z), distancia: menorDistancia, engajado: true };
    }
  }
  if (orient && !orient.engajado) {
    if (maisPerto && menorDistancia <= GUARD_ENGAGE_RADIUS ** 2) {
      orient = { ameaca: maisPerto, yaw: Math.atan2(maisPerto.pos.x - vip.pos.x, maisPerto.pos.z - vip.pos.z), distancia: menorDistancia, engajado: true };
    } else if (maisPerto) {
      const distanciaReferencia = orient.ameaca?.pos ? d2(orient.ameaca.pos, vip.pos) : Infinity;
      const valida = distanciaReferencia <= (THREAT_RADIUS * ENGAGE_SAIDA) ** 2
        && (orient.ameaca === maisPerto || menorDistancia < distanciaReferencia * ORIENTACAO_TROCA ** 2);
      if (!valida) orient.ameaca = maisPerto;
    }
  }
  if (!orient && maisPerto) {
    orient = menorDistancia <= GUARD_ENGAGE_RADIUS ** 2
      ? { ameaca: maisPerto, yaw: Math.atan2(maisPerto.pos.x - vip.pos.x, maisPerto.pos.z - vip.pos.z), distancia: menorDistancia, engajado: true }
      : { ameaca: maisPerto, engajado: false };
  }
  if (orient) orientacoesEscolta.set(vip, orient); else orientacoesEscolta.delete(vip);
  return orient;
}

// Snap de cobertura do guarda engajado: prefere ponto real do mapa (role primeiro), sem
// duplicar entre defensores e sem puxar pra ameaça; sem coberturas, slot legado.
function coberturaGuarda(bot, vip, defensores, coberturas, destino, ameaca) {
  if (!Array.isArray(coberturas) || !coberturas.length) return null;
  let reservas = reservasCobertura.get(vip);
  if (!reservas) { reservas = new Map(); reservasCobertura.set(vip, reservas); }
  const vivos = new Set(defensores.filter((ent) => ent !== vip && ent.alive !== false && ent !== bot));
  for (const [dono, ponto] of reservas) if (!vivos.has(dono)) reservas.delete(dono);
  const meu = reservas.get(bot);
  if (meu && Math.hypot(meu.x - destino.x, meu.z - destino.z) <= GUARDA_COBERTURA_RAIO) return meu;
  const papel = bot._flavioPapel === 'flanqueador' ? 'roamer' : 'guard';
  let melhor = null, melhorNota = -Infinity;
  for (const ponto of coberturas) {
    if (!Number.isFinite(ponto?.x) || !Number.isFinite(ponto?.z)) continue;
    const distancia = Math.hypot(ponto.x - destino.x, ponto.z - destino.z);
    if (distancia > GUARDA_COBERTURA_RAIO) continue;
    let tomado = false;
    for (const [dono, reserva] of reservas) {
      if (dono !== bot && vivos.has(dono) && reserva === ponto) { tomado = true; break; }
    }
    if (tomado) continue;
    const daAmeaca = ameaca?.pos ? Math.hypot(ponto.x - ameaca.pos.x, ponto.z - ameaca.pos.z) : 0;
    const nota = (ponto.role === papel ? 2 : 0) + Math.min(daAmeaca, 20) * 0.05 - distancia * 0.5;
    if (nota > melhorNota) { melhorNota = nota; melhor = ponto; }
  }
  if (!melhor) { reservas.delete(bot); return null; }
  reservas.set(bot, melhor);
  return melhor;
}

export function destinoProtecaoEscolta(bot, vip, defensores = [], ameacas = [], out = null, coberturas = null) {
  if (!bot?.pos || !vip?.pos || bot.alive === false || bot === vip) return null;
  if (!defensores.includes(bot)) return null;
  const slot = GUARD_SLOTS[slotEscolta(bot, vip, defensores)];
  const orient = orientacaoFormacao(vip, ameacas);
  const contato = orient?.engajado ? orient : null;
  const referencia = contato || (orient?.ameaca?.pos ? { ameaca: orient.ameaca } : null);
  const yaw = contato ? contato.yaw
    : referencia ? Math.atan2(referencia.ameaca.pos.x - vip.pos.x, referencia.ameaca.pos.z - vip.pos.z)
    : Number.isFinite(vip.yaw) ? vip.yaw : 0;
  const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
  const forwardX = Math.sin(yaw), forwardZ = Math.cos(yaw);
  const destino = out || {};
  destino.x = vip.pos.x + rightX * slot.right + forwardX * slot.forward;
  destino.z = vip.pos.z + rightZ * slot.right + forwardZ * slot.forward;
  if (contato) {
    const radial = Math.hypot(slot.right, slot.forward);
    const limite = Math.max(radial, Math.sqrt(contato.distancia) - 0.6);
    const avanco = Math.min(1.2, Math.max(0, GUARD_PROTECT_RADIUS - radial), Math.max(0, limite - radial));
    destino.x += forwardX * avanco;
    destino.z += forwardZ * avanco;
    const cobertura = coberturaGuarda(bot, vip, defensores, coberturas, destino, contato.ameaca);
    if (cobertura) { destino.x = cobertura.x; destino.z = cobertura.z; }
  }
  destino.centerX = vip.pos.x;
  destino.centerZ = vip.pos.z;
  destino.leash = GUARD_LEASH;
  destino.engageRadius = GUARD_ENGAGE_RADIUS;
  destino.slotRadius = GUARD_SLOT_RADIUS;
  destino.protectRadius = GUARD_PROTECT_RADIUS;
  destino.repath = 0.28;
  return destino;
}

function slotAtaque(bot, vip, atacantes) {
  let formacao = formacoesAtaque.get(vip);
  if (!formacao) { formacao = new Map(); formacoesAtaque.set(vip, formacao); }
  if (formacao.has(bot)) return formacao.get(bot);
  const usados = new Set(formacao.values());
  let slot = ATTACK_SLOTS.findIndex((_, indice) => !usados.has(indice));
  if (slot < 0) {
    const ordem = atacantes.filter((ent) => ent !== vip && ent.team === 'E').indexOf(bot);
    slot = Math.max(0, ordem) % ATTACK_SLOTS.length;
  }
  formacao.set(bot, slot);
  return slot;
}

// A IA genérica faz o A*, testa cada hop e só atira com LOS. Aqui o modo fornece
// somente o objetivo tático: fechar o VIP por posições distribuídas dentro da contestação.
export function destinoAtaqueEscolta(bot, vip, atacantes = [], caminho = [], checkpoint = 0, out = null) {
  if (!bot?.pos || !vip?.pos || bot.alive === false || bot === vip || bot.team !== 'E') return null;
  if (!atacantes.includes(bot)) return null;
  const slot = ATTACK_SLOTS[slotAtaque(bot, vip, atacantes)];
  const indice = Math.max(0, Math.min(checkpoint, Math.max(0, caminho.length - 1)));
  const atual = caminho[indice] || vip.pos;
  const proximo = caminho[Math.min(indice + 1, caminho.length - 1)] || vip.pos;
  const anterior = caminho[Math.max(0, indice - 1)] || atual;
  let dx = proximo.x - atual.x, dz = proximo.z - atual.z;
  if (Math.hypot(dx, dz) < 1e-6) { dx = atual.x - anterior.x; dz = atual.z - anterior.z; }
  const yaw = Math.hypot(dx, dz) >= 1e-6 ? Math.atan2(dx, dz) : Number.isFinite(vip.yaw) ? vip.yaw : 0;
  const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
  const forwardX = Math.sin(yaw), forwardZ = Math.cos(yaw);
  const destino = out || {};
  destino.x = vip.pos.x + rightX * slot.right + forwardX * slot.forward;
  destino.z = vip.pos.z + rightZ * slot.right + forwardZ * slot.forward;
  destino.centerX = vip.pos.x;
  destino.centerZ = vip.pos.z;
  destino.leash = CONTEST_RADIUS + 1;
  destino.slotRadius = ATTACK_SLOT_RADIUS;
  destino.repath = 0.22;
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
    threatLostFor: 0,
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
  const resultado = mover?.(origem, proposta, alvo) || proposta;
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
  const visiveis = typeof contexto.temLinhaDeVisao === 'function'
    ? ameacas.filter((ent) => contexto.temLinhaDeVisao(ent))
    : ameacas;
  state.threatLostFor = visiveis.length ? 0 : (state.threatLostFor || 0) + dt;
  state.escortCount = defensores.length;
  state.contested = mutante === 'sem-contestacao' ? false : atacantes.length > 0;
  state.threatened = mutante === 'sem-contestacao' ? false
    : visiveis.length > 0 || (state.threatened && state.threatLostFor < THREAT_MEMORY);
  const acompanhado = defensores.length > 0 && !state.contested;
  const ultimo = state.caminho.length - 1;

  if (state.threatened) {
    state.boardedFor = 0;
    state.unattendedFor = 0;
    // Abrigo REAL quando o mapa exporta cobertura: o ponto vem pronto do modo (com
    // histerese); sem cobertura vale o checkpoint legado.
    const abrigo = contexto.abrigo || state.caminho[state.checkpoint];
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
    } else if (contexto.abrigo) {
      // Sem escolta e esperando o retorno: agacha atrás de cobertura real em vez de
      // ficar exposto no ponto aberto do checkpoint.
      const falta = Math.hypot(contexto.abrigo.x - state.position.x, contexto.abrigo.z - state.position.z);
      if (falta > 0.75) { state.inCover = false; moverAte(state, contexto.abrigo, COVER_SPEED * dt, mover); }
      else state.inCover = true;
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
    for (let i = 0; i < 64; i++) {
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

// Sirene da vitória E: varredura procedural de frequência no master, cancelável como a marcha.
function sireneEmergencia(sfx) {
  try {
    sfx.ensure();
    const ctx = sfx.ctx;
    if (!ctx || !sfx.master) return [];
    const agora = ctx.currentTime;
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 620;
    for (let i = 0; i < 6; i++) {
      const t = agora + i * 1.5;
      osc.frequency.setValueAtTime(620, t);
      osc.frequency.linearRampToValueAtTime(1240, t + 0.75);
      osc.frequency.linearRampToValueAtTime(620, t + 1.5);
    }
    vol.gain.setValueAtTime(0.0001, agora);
    vol.gain.exponentialRampToValueAtTime(0.06, agora + 0.06);
    vol.gain.setValueAtTime(0.06, agora + 8.5);
    vol.gain.exponentialRampToValueAtTime(0.0001, agora + 9);
    osc.connect(vol); vol.connect(sfx.master); osc.start(agora); osc.stop(agora + 9);
    return [osc];
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
    this.hud = null;
    if (this.vip) {
      this.vip.weapon = VIP_WEAPON;
      this.vip.primary = null;
      this.vip.secondary = VIP_WEAPON;
      this.vip._objectiveNpc = 'flavio';
      game._trocarPersonagem(this.vip, vipDef, true);
      this.vip.name = game.online || game.dedicated ? vipDef.name : '[VIP] ' + vipDef.name;
      this.restaurarEquipamentoVip();
      // Papéis da escolta (guardas diretos + flanqueadores) são determinísticos pela
      // ordem do roster: todos os nós computam o mesmo time sem tráfego extra.
      this.atribuirPapeis();
      this._equiparPapeis();
    }
    if ((!game.dedicated || game.online) && typeof document !== 'undefined') {
      this.hud = document.createElement('div');
      this.hud.id = 'escort-objective';
      this.hud.style.cssText = 'position:fixed;left:50%;top:5.7rem;transform:translateX(-50%);z-index:12;padding:.55rem .9rem;background:#09101cdd;border:1px solid #d8b765;color:#fff;font:700 13px/1.2 system-ui;letter-spacing:.04em;pointer-events:none';
      game.el.hud?.append?.(this.hud);
      this._key = (event) => {
        if (!this.cinematic || this._elapsedCinematic() < 2) return;
        if (event.code !== 'Space' && event.code !== 'Escape') return;
        this._finalizarCinematic();
      };
      window.addEventListener('keydown', this._key);
    }
  }
  restaurarEquipamentoVip() {
    if (!this.vip) return;
    this.vip.armor = 100;
    this.vip.helmet = true;
    this.vip.mag = VIP_MAG;
    this.vip.reloadUntil = 0;
    this.vip.nextShotAt = 0;
    this.vip.reactAt = 0;
    this.vip.focusUntil = 0;
    this.vip.target = null;
    this.vip.path = null;
    this.vip.deadT = 0;
    this.vip.aimErr = 0.2;
    this.vip.burst = 0;
    this.vip._losLost = false;
    this.vip._lostAt = 0;
    this.vip.crouchBias = false;
    this.travarArmaVip();
  }

  travarArmaVip() {
    if (!this.vip) return;
    this.vip.weapon = VIP_WEAPON;
    this.vip.primary = null;
    this.vip.secondary = VIP_WEAPON;
    if (this.vip._meshWeapon !== VIP_WEAPON) this.game._syncRemoteWeapon(this.vip, VIP_WEAPON);
  }

  _espectadorEscolta() { return this.game.online && this.game.dedicated && this.game._mp?.net?.espectador === true; }
  _autoridadeEscolta() { return !this.game.online || (this.game.dedicated && !this._espectadorEscolta()); }
  _clienteEscolta() { return this.game.online && (!this.game.dedicated || this._espectadorEscolta()); }

  botDestination(bot) {
    if (!this.vip?.alive || !bot?.alive) return null;
    const destino = bot._escortDestination || (bot._escortDestination = {});
    if (bot === this.vip) {
      // O objetivo continua dono do deslocamento; a IA genérica só mira, atira e recarrega.
      destino.x = this.state.position.x;
      destino.z = this.state.position.z;
      destino.centerX = destino.x;
      destino.centerZ = destino.z;
      destino.leash = VIP_RADIUS;
      destino.slotRadius = 0.05;
      destino.repath = 0.28;
      return destino;
    }
    if (bot.team === 'E') {
      return destinoAtaqueEscolta(bot, this.vip, this.game.bots,
        this.state.caminho, this.state.checkpoint, destino);
    }
    if (bot.team !== 'B') return null;
    const ameacas = this._ameacasRoteamento();
    // Flanqueador segura a vanguarda enquanto a formação não está engajada; o engaje tem
    // histerese (orientacaoFormacao), então o destino não alterna a cada quadro.
    if (bot._flavioPapel === 'flanqueador' && !orientacaoFormacao(this.vip, ameacas)?.engajado) {
      return this.destinoFlanqueador(bot, destino);
    }
    return destinoProtecaoEscolta(bot, this.vip, this.game.bots, ameacas, destino, this.game.world.escortCoverPoints);
  }

  // Ameaças que roteiam a formação/flanqueador: só o que o VIP VÊ (LOS), sem leak
  // autoritativo; memória de ROTEAMENTO_MEMORIA evita desengajar numa brecha de 1 s.
  _ameacasRoteamento() {
    if (!this.vip) return [];
    const agora = this.game.time;
    const visiveis = [], memoria = [];
    for (const ent of this.game.combatants || []) {
      if (ent.team !== 'E' || ent.alive === false || !ent?.pos) continue;
      if (this._vipTemLos(ent)) { ent._flavioVistoEm = agora; visiveis.push(ent); continue; }
      if (Number.isFinite(ent._flavioVistoEm) && agora - ent._flavioVistoEm <= ROTEAMENTO_MEMORIA) memoria.push(ent);
    }
    return visiveis.concat(memoria);
  }

  destinoFlanqueador(bot, destino) {
    const caminho = this.state.caminho, ultimo = caminho.length - 1;
    // Vanguarda só anda quando o COMBOIO avança de checkpoint: destino estável por
    // construção (histerese estrutural — nunca realvo por quadro, nunca recua sozinho).
    const alvo = Math.min(this.state.checkpoint + FLANQUEADOR_VANGUARDA, ultimo);
    if (!Number.isInteger(bot._flavioVanguarda) || alvo > bot._flavioVanguarda) bot._flavioVanguarda = alvo;
    const ponto = caminho[bot._flavioVanguarda];
    const proximo = caminho[Math.min(bot._flavioVanguarda + 1, ultimo)];
    const dx = proximo.x - ponto.x, dz = proximo.z - ponto.z;
    const yaw = Math.hypot(dx, dz) >= 1e-6 ? Math.atan2(dx, dz)
      : Math.atan2(this.state.position.x - ponto.x, this.state.position.z - ponto.z);
    const lado = bot._flavioLado || 1;
    destino.x = ponto.x + Math.cos(yaw) * FLANQUEADOR_LATERAL * lado;
    destino.z = ponto.z - Math.sin(yaw) * FLANQUEADOR_LATERAL * lado;
    destino.centerX = this.state.position.x;
    destino.centerZ = this.state.position.z;
    destino.leash = FLANQUEADOR_LEASH;
    destino.slotRadius = 1.2;
    destino.repath = 0.3;
    return destino;
  }

  // Apresentação de fato no comando da câmera: updatePresentation e câmera de espectador.
  get cinematicActive() { return !!this.cinematic && !this.cinematic.skipped; }

  // docs/maps/operacao-decola.md exige tempo real, independente da simulação.
  _elapsedCinematic() {
    if (!this.cinematic) return 0;
    return Math.max(0, (performance.now() - this.cinematic.anchorAt) / 1000);
  }

  _finalizarCinematic() {
    if (!this.cinematic || this.cinematic.skipped) return;
    if (!this.game.online && this.game.state === 'roundEnd') this.game.stateUntil = this.game.time;
    this._pararBoarding();
    this.cinematic.skipped = true;
    this._encerrarFontes();
    this._restaurarAmbiente();
  }

  // O ator visual não substitui a entidade autoritativa do VIP.
  _pararBoarding() {
    this._boardingSession = null;
    this._boarding?.stop();
  }

  _iniciarBoarding() {
    if (!this.vip) return;
    const def = this.game._defNoLado?.(this.vip.def, this.vip.team) || this.vip.def;
    if (!def?.id) return;
    const sessao = this.cinematic;
    this._boardingSession = sessao;
    const atual = () => !this._boardingDisposed && this._boardingSession === sessao
      && this.cinematic === sessao && this.cinematicActive && this.game.state === 'roundEnd'
      && this._elapsedCinematic() < 9;
    import('./flavio-boarding.js')
      .then(({ FlavioBoarding }) => {
        if (!atual()) return;
        const boarding = (this._boarding ??= new FlavioBoarding(this.game));
        return boarding.start(this.vip, def, atual).then((ok) => {
          if (ok && atual()) boarding.update(this._elapsedCinematic());
        });
      })
      .catch(() => {});
  }

  // Fontes agendadas também precisam parar ao pular ou substituir a cena.
  _encerrarFontes() {
    for (const fonte of this.fontes) { try { fonte.stop(); } catch { /* já parada */ } }
    this.fontes = [];
  }

  // Vitória E: escurece só as luzes reais do hangar e pendura a sirene vermelha na cena.
  _aplicarAmbienteE() {
    const root = this.game.world?.root;
    if (!root || this._amb) return;
    const luzes = [], lampadas = [];
    root.traverse((o) => {
      if (o.isPointLight && /^luz-hangar-\d+$/.test(o.name)) luzes.push(o);
      else if (o.isMesh && o.name === 'luz-hangar') lampadas.push(o);
    });
    if (!luzes.length) return;
    const estado = { luzes: luzes.map((luz) => ({ luz, intensidade: luz.intensity })), clones: [], vermelha: null };
    for (const { luz } of estado.luzes) luz.intensity *= 0.08;
    for (const mesh of lampadas) {
      const original = mesh.material;
      const escuro = original.clone();
      escuro.emissiveIntensity *= 0.05;
      mesh.material = escuro;
      estado.clones.push({ mesh, original, escuro });
    }
    const vermelha = luzes[0].clone();
    vermelha.name = 'sirene-vermelha-flavio';
    vermelha.color.setRGB(1, 0.05, 0.05);
    vermelha.intensity = 2.4;
    vermelha.distance = 26;
    vermelha.position.set(0, 6.4, 55);
    root.add(vermelha);
    estado.vermelha = vermelha;
    this._amb = estado;
  }

  // Restaura intensidades e o material compartilhado, e retira a luz temporária (idempotente).
  _restaurarAmbiente() {
    const estado = this._amb;
    if (!estado) return;
    for (const { luz, intensidade } of estado.luzes) luz.intensity = intensidade;
    for (const { mesh, original, escuro } of estado.clones) {
      mesh.material = original;
      escuro.dispose?.();
    }
    estado.vermelha?.removeFromParent?.();
    this._amb = null;
  }

  prepareRound() {
    this._pararBoarding();
    this._encerrarFontes();
    this._restaurarAmbiente();
    this.state = criarEstadoEscolta(this.game.world.escortPath);
    const plano = this.game.world.objectivePlane;
    if (plano?.position) {
      this._planeOrigin ??= { x: plano.position.x, y: plano.position.y, z: plano.position.z };
      plano.position.x = this._planeOrigin.x;
      plano.position.y = this._planeOrigin.y;
      plano.position.z = this._planeOrigin.z;
    }
    this.game.timeLeft = 360;
    this._waveEpoch = this.game.time;
    this._vipRoute = null;
    this._vipStuckFor = 0;
    this._vipReplans = 0;
    this._vipForcePath = false;
    this._vipBanned = new Set();
    if (this.vip) {
      orientacoesEscolta.delete(this.vip);
      this._focoAmeaca = null;
      this._focoPosAmeaca = null;
      this._focoAmeacaEm = -Infinity;
      this._vipAbrigo = null;
      this._vipAbrigoIdade = 0;
      this.vip.alive = true;
      this.vip.hp = 100;
      this.vip.respawnAt = Infinity;
      this.vip.pos.set(this.state.position.x, this.game.world.groundHeightAt(this.state.position.x, this.state.position.z), this.state.position.z);
      this.vip._lp = { x: this.vip.pos.x, z: this.vip.pos.z };
      this.restaurarEquipamentoVip();
      this.vip.mesh?.ctrl?.revive?.();
      this.atribuirPapeis();
      this._equiparPapeis();
      if (this.vip.mesh?.group) {
        this.vip.mesh.group.visible = true;
        this.vip.mesh.group.rotation.x = 0;
      }
    }
    this.cinematic = null;
    this.deathAnnounced = false;
    if (this.hud) { this.hud.style.background = '#09101cdd'; this.hud.style.borderColor = '#d8b765'; }
    if (this.game.vmScene) this.game.vmScene.visible = true;
    if (this.hud) this.hud.hidden = false;
    this.atualizaHud();
  }

  /* Onda de 8 s desde o epoch da rodada (docs/maps/operacao-decola.md §Respawn): morte na
     borda perde a onda atual; devolve tempo ABSOLUTO (ent.respawnAt); VIP não renasce. */
  respawnAt(ent, now) {
    if (this._clienteEscolta()) return undefined;
    if (ent === this.vip) return Infinity;
    const epoch = this._waveEpoch ?? (this._waveEpoch = now);
    return epoch + (Math.floor((now - epoch) / 8) + 1) * 8;
  }

  _alcancaveis(indice) {
    this._alcance ??= new Map();
    let reach = this._alcance.get(indice);
    if (reach) return reach;
    const { adj } = this.game.world.waypoints;
    reach = new Uint8Array(adj.length); reach[indice] = 1;
    const fila = [indice];
    for (let i = 0; i < fila.length; i++) for (const viz of adj[fila[i]]) if (!reach[viz]) { reach[viz] = 1; fila.push(viz); }
    this._alcance.set(indice, reach);
    return reach;
  }

  spawnCandidates(team) {
    const game = this.game, path = game.world.escortPath;
    if (!this.vip || game.state !== 'live' || !Array.isArray(path) || !path.length) return null;
    const k = Math.max(0, Math.min(this.state.checkpoint, path.length - 1));
    const vipZ = this.vip.pos.z;
    const nodes = game.world.waypoints?.nodes || [];
    if (!nodes.length) return null;
    const semColisao = (p) => Number.isFinite(p.x) && Number.isFinite(p.z)
      && !(game.world.colliders || []).some((c) => c.minY < 1.8 && c.maxY > 0.1
        && p.x > c.minX - 0.4 && p.x < c.maxX + 0.4 && p.z > c.minZ - 0.4 && p.z < c.maxZ + 0.4);
    const alcanceDe = (ancora) => {
      const reach = this._alcancaveis(game.world.nearestWaypoint(ancora.x, ancora.z));
      return (p) => {
        const de = game.world.nearestWaypoint(p.x, p.z);
        return Number.isInteger(de) && de >= 0 && de < nodes.length && reach[de] === 1;
      };
    };
    const medir = (ancora) => (p) => ({ x: p.x, z: p.z, yaw: p.yaw,
      dist: Math.hypot(p.x - ancora.x, p.z - ancora.z), lateral: Math.abs(p.x - ancora.x) });
    if (team === 'E') {
      /* ATAQUE — vanguarda/base (regra do dono): nunca à retaguarda do comboio nem na
         sala de embarque (o E renascia lá e prendia o VIP no spawn); vanguarda = nós à frente. */
      const vanguarda = path[Math.min(k + 1, path.length - 1)];
      const rota = alcanceDe(vanguarda);
      const sala = (p) => p.x > SALA_EMBARQUE.minX && p.x < SALA_EMBARQUE.maxX
        && p.z > SALA_EMBARQUE.minZ && p.z < SALA_EMBARQUE.maxZ;
      const aFrente = (p) => p.z > vipZ && !sala(p) && semColisao(p)
        && Math.hypot(p.x - this.vip.pos.x, p.z - this.vip.pos.z) >= ATAQUE_DIST_VIP;
      const frente = nodes.filter((p) => aFrente(p) && rota(p)).map(medir(vanguarda))
        .filter((p) => p.dist <= 18);
      if (frente.length) {
        frente.sort((a, b) => a.dist - b.dist || a.lateral - b.lateral);
        return frente.slice(0, 8);
      }
      const base = (game.world.spawns?.E || []).filter((p) => !sala(p) && semColisao(p) && rota(p));
      return base.length ? base.map(medir(vanguarda)) : null;
    }
    /* DEFESA — retaguarda/near: ondas de reforço acompanham o comboio por trás (podem
       usar a sala de embarque, é o quintal do time B). */
    const anchor = path[Math.max(0, k - 1)];
    const rota = alcanceDe(anchor);
    const livre = (p) => p.z < vipZ && semColisao(p);
    const atras = nodes.filter((p) => livre(p) && rota(p)).map(medir(anchor)).filter((p) => p.dist <= 18);
    const base = (game.world.spawns?.[team] || []).filter((p) => livre(p) && rota(p)).map(medir(anchor)).filter((p) => p.dist <= 18);
    const escolha = atras.length ? atras : base;
    if (!escolha.length) return semColisao(anchor) && rota(anchor) ? [{ x: anchor.x, z: anchor.z, dist: 0, lateral: 0 }] : null;
    escolha.sort(team === 'B' ? (a, b) => a.dist - b.dist || a.lateral - b.lateral : (a, b) => b.lateral - a.lateral || a.dist - b.dist);
    return escolha.slice(0, 8);
  }

  // Foco de ameaça do VIP — só o que ele REALMENTE VÊ (LOS); oculta não move abrigo/rumo
  // (sem leak autoritativo). Entre visíveis, histerese; perdida a visão, memória THREAT_MEMORY.
  ameacaMaisPerto() {
    if (!this.vip) return null;
    let maisPerto = null, menorDistancia = Infinity;
    for (const ent of this.game.combatants) {
      if (ent.team !== 'E' || ent.alive === false || !ent?.pos) continue;
      const distancia = d2(ent.pos, this.vip.pos);
      if (distancia < menorDistancia && this._vipTemLos(ent)) { maisPerto = ent; menorDistancia = distancia; }
    }
    const agora = this.game.time;
    const foco = this._focoAmeaca;
    if (foco?.pos && foco.alive !== false && this._vipTemLos(foco)) {
      const distancia = d2(foco.pos, this.vip.pos);
      if (maisPerto === foco || distancia <= (THREAT_RADIUS * ENGAGE_SAIDA) ** 2
        && distancia <= menorDistancia / ORIENTACAO_TROCA ** 2) {
        this._focoPosAmeaca = { x: foco.pos.x, z: foco.pos.z };
        this._focoAmeacaEm = agora;
        return foco;
      }
    }
    if (maisPerto) {
      this._focoAmeaca = maisPerto;
      this._focoPosAmeaca = { x: maisPerto.pos.x, z: maisPerto.pos.z };
      this._focoAmeacaEm = agora;
      return maisPerto;
    }
    if (foco?.pos && foco.alive !== false && this._focoPosAmeaca
      && agora - (this._focoAmeacaEm ?? -Infinity) <= THREAT_MEMORY) {
      return { pos: this._focoPosAmeaca };   // snapshot da última posição vista
    }
    this._focoAmeaca = null;
    return null;
  }

  // Papéis da escolta: 4 guardas diretos (LMG, escopeta, rifle e sniper — um de cada) e
  // flanqueadores de vanguarda. Determinístico pela ordem do roster.
  atribuirPapeis() {
    if (!this.vip) return;
    const bots = this.game.bots || [];
    const defensores = bots.filter((bot) => bot !== this.vip && bot.team === 'B');
    let flanqueadores = 0;
    defensores.forEach((bot, ordem) => {
      if (ordem < GUARDAS_DIRETOS) {
        bot._flavioPapel = 'guarda';
        bot._flavioArma = ARMAS_GUARDA[ordem];
        bot._flavioLado = 0;
      } else {
        bot._flavioPapel = 'flanqueador';
        bot._flavioArma = ARMAS_FLANQUEADOR[flanqueadores % ARMAS_FLANQUEADOR.length];
        bot._flavioLado = flanqueadores % 2 === 0 ? 1 : -1;
        flanqueadores++;
      }
    });
    for (const bot of bots) {
      if (bot === this.vip || bot.team === 'B') continue;
      bot._flavioPapel = null;   // troca de lado não herda papel
      bot._flavioArma = null;
    }
    // Eficácia: guardas com piso de skill acima da média inimiga. A aquisição de alvo,
    // reação e mira continuam na IA genérica — LOS obrigatória, sem wallhack.
    const inimigos = bots.filter((bot) => bot.team === 'E');
    const mediaInimiga = inimigos.length
      ? inimigos.reduce((soma, bot) => soma + (bot.skill || 0.8), 0) / inimigos.length : 0.8;
    const piso = Math.max(GUARDA_SKILL_PISO, mediaInimiga * GUARDA_SKILL_VANTAGEM);
    for (const bot of defensores) {
      bot.skill = Math.max(bot.skill || 0, piso);
      // tier visível espelha o skill real (mesmos cortes do botTier do game.js)
      bot.tier = bot.skill < 0.75 ? 'ruim' : bot.skill < 1.05 ? 'medio' : bot.skill < 1.4 ? 'bom' : 'muitobom';
    }
  }

  // Kit do papel: arma fixa com pente da arma certa + colete/capacete (mais duro de
  // matar que os atacantes, que continuam sem colete grátis).
  equiparPapel(bot, imediato = true) {
    if (!bot?._flavioArma || !WEAPONS[bot._flavioArma]) return;
    if (bot.weapon !== bot._flavioArma) {
      bot.weapon = bot._flavioArma;
      bot.mag = WEAPONS[bot._flavioArma].mag || bot.mag || 30;
      // A remontagem da malha consome RNG; adiar ela para o 1º update mantém o sorteio
      // de spawn do jogador determinístico (a régua do yaw autorado depende disso).
      if (imediato) this.game._syncRemoteWeapon?.(bot, bot._flavioArma);
      else bot._flavioSyncPendente = true;
    }
    bot.armor = 100;
    bot.helmet = true;
  }

  _equiparPapeis() {
    (this.game.bots || []).forEach((bot) => {
      if (bot === this.vip || bot.team !== 'B' || !bot._flavioArma) return;
      bot._flavioKitVida = bot.protUntil;
      bot._flavioVanguarda = undefined;
      this.equiparPapel(bot, false);
    });
  }

  // Renascimento marca protUntil: reforça o kit do papel uma vez por vida (o respawn
  // genérico zera colete e pode rearmar pela loja — o papel é dono do loadout).
  _manterPapeis() {
    (this.game.bots || []).forEach((bot) => {
      if (bot === this.vip || bot.team !== 'B' || !bot._flavioPapel || !bot.alive) return;
      if (bot.protUntil > this.game.time && bot._flavioKitVida !== bot.protUntil) {
        bot._flavioKitVida = bot.protUntil;
        this.equiparPapel(bot);
      } else if (bot._flavioSyncPendente) {
        bot._flavioSyncPendente = false;
        if (bot._meshWeapon !== bot._flavioArma) this.game._syncRemoteWeapon?.(bot, bot._flavioArma);
      }
    });
  }

  _vipAlcance(origem, alvo, tolerancia = 0.08) {
    const dx = alvo.x - origem.x, dz = alvo.z - origem.z;
    const distancia = Math.hypot(dx, dz);
    if (distancia < 1e-6) return true;
    const sim = { x: origem.x, y: origem.y ?? this.vip.pos.y, z: origem.z };
    const passos = Math.max(1, Math.ceil(distancia / 0.16));
    for (let i = 0; i < passos; i++) {
      sim.x += dx / passos;
      sim.z += dz / passos;
      this.game._collide?.(sim, VIP_RADIUS);
    }
    return Math.hypot(alvo.x - sim.x, alvo.z - sim.z) <= tolerancia;
  }

  _vipMoverDireto(origem, proposta) {
    const dx = proposta.x - origem.x, dz = proposta.z - origem.z;
    const passos = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.16));
    this.vip.pos.x = origem.x;
    this.vip.pos.z = origem.z;
    for (let i = 0; i < passos; i++) {
      this.vip.pos.x += dx / passos;
      this.vip.pos.z += dz / passos;
      this.game._collide(this.vip.pos, VIP_RADIUS);
    }
    return { x: this.vip.pos.x, z: this.vip.pos.z };
  }

  _vipPlanejar(origem, destino) {
    this._vipReplans = (this._vipReplans || 0) + 1;
    const rota = { goal: { x: destino.x, z: destino.z }, points: [], index: 0 };
    if (!this._vipForcePath && this._vipAlcance(origem, destino)) {
      rota.points.push({ x: destino.x, z: destino.z, node: -1 });
      return rota;
    }
    const world = this.game.world, nodes = world.waypoints?.nodes || [];
    if (!nodes.length || typeof world.nearestWaypoint !== 'function' || typeof world.findPath !== 'function') return rota;
    const proximos = (p) => nodes.map((node, i) => ({ i, d: d2(node, p) })).sort((a, b) => a.d - b.d).slice(0, 8);
    const saidas = proximos(origem).filter(({ i }) => this._vipAlcance(origem, nodes[i]));
    const chegadas = proximos(destino).filter(({ i }) => this._vipAlcance(nodes[i], destino));
    for (const { i: de } of saidas) for (const { i: para } of chegadas) {
      const path = world.findPath(de, para);
      if (!Array.isArray(path) || path.at(-1) !== para || path.some((i, n) => n > 0 && this._vipBanned?.has(i))) continue;
      rota.points = path.slice(1).map((i) => ({ x: nodes[i].x, z: nodes[i].z, node: i }));
      rota.points.push({ x: destino.x, z: destino.z, node: -1 });
      return rota;
    }
    return rota;
  }

  moverVip(origem, proposta, destino) {
    const orcamento = Math.hypot(proposta.x - origem.x, proposta.z - origem.z);
    if (orcamento < 1e-9) return { x: origem.x, z: origem.z };
    const dt = Math.max(1e-3, this._vipFrameDt || 1 / 60);
    const mudou = !this._vipRoute || Math.hypot(this._vipRoute.goal.x - destino.x, this._vipRoute.goal.z - destino.z) > 0.01;
    if (mudou) {
      this._vipRoute = null;
      this._vipStuckFor = 0;
      this._vipForcePath = false;
      this._vipBanned?.clear();
    }
    if ((this._vipStuckFor || 0) >= VIP_REPLAN_DELAY) {
      const atual = this._vipRoute?.points[this._vipRoute.index];
      if (atual?.node >= 0) (this._vipBanned || (this._vipBanned = new Set())).add(atual.node);
      this._vipRoute = null;
      this._vipStuckFor = 0;
      this._vipForcePath = true;
    }
    if (!this._vipRoute) this._vipRoute = this._vipPlanejar(origem, destino);
    let rota = this._vipRoute;
    if (!rota.points.length) {
      this._vipBanned?.clear();
      this._vipStuckFor = (this._vipStuckFor || 0) + dt;
      return { x: origem.x, z: origem.z };
    }
    while (rota.index < rota.points.length - 1
      && Math.hypot(rota.points[rota.index].x - origem.x, rota.points[rota.index].z - origem.z) < 0.35) rota.index++;
    let ponto = rota.points[rota.index];
    if (!this._vipAlcance(origem, ponto)) {
      if (ponto.node >= 0) (this._vipBanned || (this._vipBanned = new Set())).add(ponto.node);
      this._vipStuckFor = (this._vipStuckFor || 0) + dt;
      rota = this._vipRoute = this._vipPlanejar(origem, destino);
      ponto = rota.points[rota.index];
      if (!ponto || !this._vipAlcance(origem, ponto)) return { x: origem.x, z: origem.z };
    }
    if (this._vipAlcance(origem, destino)) ponto = { x: destino.x, z: destino.z, node: -1 };
    const dx = ponto.x - origem.x, dz = ponto.z - origem.z;
    const falta = Math.hypot(dx, dz);
    if (falta < 1e-6) return { x: origem.x, z: origem.z };
    const passo = Math.min(orcamento, falta);
    const antes = Math.hypot(ponto.x - origem.x, ponto.z - origem.z);
    const resultado = this._vipMoverDireto(origem, { x: origem.x + dx * passo / falta, z: origem.z + dz * passo / falta });
    const depois = Math.hypot(ponto.x - resultado.x, ponto.z - resultado.z);
    this._vipStuckFor = depois < antes - 0.001 ? 0 : (this._vipStuckFor || 0) + dt;
    return resultado;
  }

  _vipTemLos(ent) {
    if (typeof this.game._losClear !== 'function') return true;
    if (typeof this.game._botEye !== 'function') return this.game._losClear(this.vip.pos, ent.pos);
    const olho = ent.isPlayer ? this.game.camera.position : this.game._botEye(ent);
    return this.game._losClear(this.game._botEye(this.vip), olho);
  }

  anunciarMorte() {
    if (!this.vip || this.vip.alive !== false || this.deathAnnounced) return;
    this.deathAnnounced = true;
    this.game._banner?.('FLÁVIO FOI MORTO', 'A escolta fracassou');
    if (this.hud) {
      this.hud.style.background = '#3b0808ee';
      this.hud.style.borderColor = '#ff514f';
      this.hud.textContent = 'FLÁVIO FOI MORTO · ESCOLTA FRACASSOU';
    }
  }
  // Abrigo do VIP nos pontos REAIS do mapa (escortCoverPoints): slot em ABRIGO_RAIO que
  // maximiza longe-da-ameaça vs perto-do-âncora, com histerese; sem pontos: null (legado).
  _atualizarAbrigo(ameaca, dt = 0) {
    const coberturas = this.game.world.escortCoverPoints;
    if (!Array.isArray(coberturas) || !coberturas.length) { this._vipAbrigo = null; return null; }
    const ancora = this.state.caminho[this.state.checkpoint];
    if (!ancora) { this._vipAbrigo = null; return null; }
    const ameacaPos = ameaca?.pos;
    const qualidade = (ponto) => {
      const dAncora = Math.hypot(ponto.x - ancora.x, ponto.z - ancora.z);
      if (dAncora > ABRIGO_RAIO) return -Infinity;
      const dAmeaca = ameacaPos ? Math.hypot(ponto.x - ameacaPos.x, ponto.z - ameacaPos.z) : ABRIGO_RAIO;
      return dAmeaca - ABRIGO_PESO_ANCORA * dAncora;
    };
    // Histerese em DOIS níveis: margem (vantagens pequenas não trocam) e moradia mínima
    // (ABRIGO_MIN_PERMANENCIA, saída só por emergência) — a ameaça oscilando não move o VIP.
    this._vipAbrigoIdade = (this._vipAbrigoIdade || 0) + dt;
    const atual = this._vipAbrigo;
    if (atual) {
      const qAtual = qualidade(atual);
      const colada = ameacaPos && Math.hypot(atual.x - ameacaPos.x, atual.z - ameacaPos.z) < ABRIGO_COLADA;
      if (Number.isFinite(qAtual) && !colada) {
        let melhor = qAtual;
        for (const ponto of coberturas) melhor = Math.max(melhor, qualidade(ponto));
        const emergencia = melhor > qAtual + ABRIGO_TROCA_FORTE;   // abrigo muito mais seguro
        const morou = this._vipAbrigoIdade >= ABRIGO_MIN_PERMANENCIA;
        if (melhor <= qAtual + ABRIGO_TROCA || (!morou && !emergencia)) return atual;
      }
    }
    // Re-escolha: pontos grudados na ameaça não são destino (não adianta pular de um
    // ponto colado para outro); sem alternativa, vale o melhor geral.
    let melhor = null, melhorQ = -Infinity;
    for (const ponto of coberturas) {
      if (!Number.isFinite(ponto?.x) || !Number.isFinite(ponto?.z)) continue;
      if (ameacaPos && Math.hypot(ponto.x - ameacaPos.x, ponto.z - ameacaPos.z) < ABRIGO_COLADA) continue;
      const q = qualidade(ponto);
      if (q > melhorQ) { melhorQ = q; melhor = ponto; }
    }
    if (!melhor) {
      for (const ponto of coberturas) {
        const q = qualidade(ponto);
        if (Number.isFinite(q) && q > melhorQ) { melhorQ = q; melhor = ponto; }
      }
    }
    this._vipAbrigo = melhor && Number.isFinite(melhorQ) ? { x: melhor.x, z: melhor.z } : null;
    this._vipAbrigoIdade = 0;
    return this._vipAbrigo;
  }

  update(dt) {
    if (this.game.state !== 'live') return;
    if (!this.vip) { this.atualizaHud(); return; }
    this.travarArmaVip();
    if (this._autoridadeEscolta()) {
      this._manterPapeis();
      this._vipFrameDt = dt;
      const ameaca = this.ameacaMaisPerto();
      passoEscolta(this.state, {
        defensores: this.game.combatants.filter((ent) => ent !== this.vip && ent.team === 'B'),
        atacantes: this.game.combatants.filter((ent) => ent.team === 'E'),
        vipAlive: this.vip.alive,
        temLinhaDeVisao: (ent) => this._vipTemLos(ent),
        abrigo: this._atualizarAbrigo(ameaca, dt),
      }, dt, { mover: (origem, proposta, destino) => this.moverVip(origem, proposta, destino) });
      this.vip.pos.x = this.state.position.x;
      this.vip.pos.z = this.state.position.z;
      this.vip.pos.y = this.game.world.groundHeightAt(this.vip.pos.x, this.vip.pos.z);
      const proximo = this.state.threatened && ameaca
        ? ameaca.pos
        : this.state.caminho[Math.min(this.state.checkpoint + 1, this.state.caminho.length - 1)];
      this.vip.yaw = Math.atan2(proximo.x - this.vip.pos.x, proximo.z - this.vip.pos.z);
      if (this.vip.alive === false) this.anunciarMorte();
      if (this.state.winner) this.game._endRound(this.state.winner);
    } else if (this.vip.alive === false) this.anunciarMorte();
    this.atualizaHud();
  }

  updateBot(bot, dt) {
    if (bot !== this.vip || this._clienteEscolta()) return false;
    if (bot.alive) {
      bot.crouchBias = Boolean(this.state.threatened || (this.state.unattendedFor || 0) > 0.5);
      return false;
    }
    const group = bot.mesh?.group;
    if (!group) return true;
    bot.deadT = (bot.deadT || 0) + dt;
    bot.mesh.ctrl?.setCrouch?.(false);
    bot.mesh.ctrl?.die?.();
    bot.mesh.ctrl?.update?.(dt, 0, false);
    // Corpo morto: fade estável e de mão única — esconde após 1 s e NUNCA reexibe fora
    // do prepareRound; bots vivos nunca têm a visibilidade do grupo tocada pelo modo.
    if (bot.deadT > 1) group.visible = false;
    return true;
  }

  atualizaHud() {
    if (!this.hud || this.cinematic) return;
    if (!this.vip) {
      this.hud.textContent = 'OPERAÇÃO FLÁVIO · AGUARDANDO VIP';
      return;
    }
    if (this.deathAnnounced) return;
    const total = this.state.caminho.length - 1;
    const status = [];
    if (this.state.contested) status.push('CONTESTADO');
    if (this.state.threatened) status.push(this.state.inCover ? 'EM COBERTURA' : 'BUSCANDO COBERTURA');
    if (!status.length) status.push(this.state.escortCount ? `${this.state.escortCount} ESCOLTANDO` : 'SEM ESCOLTA');
    this.hud.textContent = `OPERAÇÃO FLÁVIO · ${this.state.checkpoint}/${total} · ${status.join(' · ')} · ${Math.max(0, Math.ceil(this.game.timeLeft))}s`;
  }

  roundIntro() {
    return 'ESCOLTE FLÁVIO ATÉ O AVIÃO · 6 MINUTOS';
  }

  roundResult(winner) {
    // Timeout também publica o vencedor autoritativo no estado replicado do objetivo.
    if (winner === 'E' || winner === 'B') this.state.winner = winner;
    const morto = winner === 'E' && (this.vip?.alive === false || this.deathAnnounced);
    return {
      duration: 9,
      title: winner === 'B' ? 'FLÁVIO EMBARCOU' : morto ? 'FLÁVIO FOI MORTO' : 'A FUGA FOI INTERROMPIDA',
      detail: winner === 'B'
        ? 'o avião está pronto para decolar'
        : morto ? 'a escolta fracassou antes do embarque' : 'o aeroporto foi bloqueado',
    };
  }

  startCinematic(winner) {
    this._pararBoarding();
    this._encerrarFontes();   // cena nova substitui a marcha anterior, não dobra com ela
    this._restaurarAmbiente();   // ambiente da cena anterior não vaza para a nova
    this.cinematic = { winner, startedAt: this.game.time, anchorAt: performance.now(), skipped: false };
    if (winner === 'B' && (!this.game.dedicated || this.game.online)) this._iniciarBoarding();
    if (this.game.vmScene) this.game.vmScene.visible = false;
    if (!this.game.dedicated || this.game.online) this.fontes = marchaMilitar(this.game.sfx);
    if (winner === 'E' && (!this.game.dedicated || this.game.online)) {
      this._aplicarAmbienteE();
      this.fontes.push(...sireneEmergencia(this.game.sfx));
    }
    if (this.hud) this.hud.textContent = winner === 'B'
      ? 'EMBARQUE CONCLUÍDO'
      : this.vip?.alive === false || this.deathAnnounced ? 'FLÁVIO FOI MORTO · ESCOLTA FRACASSOU' : 'OPERAÇÃO INTERROMPIDA';
  }

  updatePresentation() {
    if (!this.cinematicActive || (this.game.dedicated && !this.game.online)) return;
    if (this.game.state !== 'roundEnd') { this._finalizarCinematic(); return; }
    const elapsed = this._elapsedCinematic();
    if (elapsed >= 9) { this._finalizarCinematic(); return; }
    const t = Math.min(1, elapsed / 9);
    const cam = this.game.camera;
    const ganhou = this.cinematic.winner === 'B';
    // O pátio mantém o trajeto da câmera fora das vigas do hangar.
    const atorPronto = ganhou && this._boardingSession === this.cinematic ? !!this._boarding?.update(elapsed) : false;
    if (ganhou && !atorPronto && this.game.world.objectivePlane) {
      this.game.world.objectivePlane.position.z = 55 + Math.max(0, elapsed - 6.8) * 5;
    }
    const alvo = atorPronto ? this._boarding.target : this.game.world.objectivePlane ? this.game.world.objectivePlane.position : { x: 0, z: 55 };
    const a = ganhou ? { x: 16, y: 7, z: 50 } : { x: -15, y: 6, z: 50 };
    const b = ganhou ? { x: 10, y: 5, z: 62 } : { x: -7, y: 4, z: 56 };
    const smooth = t * t * (3 - 2 * t);
    cam.position.set(a.x + (b.x - a.x) * smooth, a.y + (b.y - a.y) * smooth, a.z + (b.z - a.z) * smooth);
    cam.lookAt(alvo.x, 2.1, alvo.z);
    const sirene = this._amb?.vermelha;
    if (sirene) sirene.intensity = 2.4 + 2.2 * Math.sin(elapsed * 8.2 - Math.PI / 2);
  }

  netState() {
    const snap = snapshotEscolta(this.state);
    const nid = this.vip?._nid;
    if (Number.isInteger(nid) && nid >= 0 && nid <= 0xffffffff) snap.vipId = nid;   // id autoritativo do NPC: cliente reserva o corpo dele antes do casamento
    return snap;
  }

  applyNetState(net) {
    if (!this._clienteEscolta()) return;
    aplicarSnapshotEscolta(this.state, net);
  }

  dispose() {
    this._pararBoarding();
    this._boardingDisposed = true;
    this._boarding?.dispose();
    this._boarding = null;
    if (this._key) window.removeEventListener('keydown', this._key);
    this.hud?.remove();
    this._encerrarFontes();
    this._restaurarAmbiente();
  }
}

export const criarOperacaoFlavio = (game, vipDef) => game._mapId === 'operacao_flavio' ? new OperacaoFlavio(game, vipDef) : null;
