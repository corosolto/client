import * as THREE from 'three';
import { regrasDaInvasao, avaliarFimDaInvasao, repartirTerritorio } from './javaporcos_partida.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from './data/asseturl.js';
import { MODELOS_JAVAPORCOS, varianteJavaporco } from './data/javaporcos_modelos.js';
import { prepararPassada, atualizarPassada, liberarPassada, registrarGeometriaDistante, selecionarDetalhePassada } from './javaporcos_passada.js';
import { DIRECAO_FLUIDA, direcaoDaHorda, curvarRumo } from './javaporcos_direcao.js';

/* Teto de vivos MEDIDO em tools/eval/javaporcos-perf.mjs (64 vivos = 0,22 ms/quadro).
   Subir daqui sem medir de novo é chutar o orçamento de quadro. */
export const MAX_ALIVE = 64;
export const WAVE_COUNTS = Object.freeze([24, 36, 48, 64, 80, 96, 120, 150]);
export const BOAR_POINTS = Object.freeze({ jovem: 100, adulto: 180, matriarca: 300, ariete: 500 });
/* Vida baixa é o que faz horda GIGANTE ler como horda e não como esponja de bala:
   618 bichos na partida inteira só funcionam se cada um cai em poucos tiros. */
export const BOAR_HP = Object.freeze({ jovem: 70, adulto: 130, matriarca: 320, ariete: 760 });
export const SPAWN_BASE = 0.18;
/* FÚRIA — cresce com abate, com onda e com o RELÓGIO da partida e mexe em cadência de
   spawn, velocidade e dano. `teto` existe pra não virar injogável. */
export const FURIA = Object.freeze({
  porAbate: 0.004, porOnda: 0.08, porMinuto: 0.1, teto: 1.6,
  cadencia: 1, velocidade: 0.22, dano: 0.45, raio: 0.25,
});
/* Sem provocação o bando saqueia; proximidade de 6 m ou alerta de tiro inicia combate.
   Ouvido e contágio mantêm a resposta da manada aos tiros. */
export const AGGRO = Object.freeze({
  visao: 20, ouvido: 34, manada: 9, contagio: 3.5,
  ataque: 1.9, comida: 1.6, objetivo: 2.4, rosnado: 26,
});
export const DASH = Object.freeze({ perto: 4, longe: 12, duracao: 0.55, impulso: 2.7, espera: 4.5 });
/* DOMÍNIO (dono, 30/10): setor tomado = controle 1; a disputa continua até wipe ou limite.
   O porquê de cada número: docs/maps/invasao-javaporcos.md, seção "Domínio". */
export const DOMINIO = Object.freeze({ max: 1, minBichos: 3, sobe: 1 / 40, desce: 1 / 10, passo: 0.25, lotado: 6 });
export const FRENTES = 3;
export const BECO = Object.freeze({ abreNaOnda: 3, fracao: 0.4, explorar: 9, raio: 7 });
const ROTA_RAIO = 3;
const VAGAR_RITMO = 0.55;
const VAGAR_TROCA = 5;

const DEFAULT_MAX_ALIVE = MAX_ALIVE;
const PREP_SECONDS = 12;
const COMBAT_SECONDS = 75;
const DEATH_SECONDS = 120;
const MAX_CORPSES = 8;
const MODEL_SPEEDS = Object.freeze({ jovem: 1.08, adulto: 1, matriarca: 0.88, ariete: 0.8 });
const MODEL_HEIGHTS = Object.freeze({ jovem: 1.05, adulto: 1.3, matriarca: 1.58, ariete: 1.82 });
/* Dano base por alvo. O multiplicador de fúria entra em danoDoJavaporco. */
const BASE_DANO = Object.freeze({
  jogador: { jovem: 18, adulto: 18, matriarca: 30, ariete: 42 },
  comida: { jovem: 40, adulto: 55, matriarca: 70, ariete: 95 },
});
const COMIDA_HP = Object.freeze({ lixo: 90, feira: 150, cacamba: 220, racao: 120 });
/* Folga de encosto: o corpo (raio 0,38) e a quina do colisor param o bicho antes do raio. */
const ENCOSTO = 1;
/* Segundos sem encurtar distância pra nenhum alvo que aposentam o retardatário. */
const PERDIDO = 14;
/* Contorno de obstáculo: duração do deslize e o quanto ele abre do rumo do alvo. */
const DESLIZE = 2.4;
const DESLIZE_ANGULO = 1.45;

export function poseMorteJavaporco(age, side = 1, mutant = '') {
  const elapsed = Math.max(0, Number(age) || 0);
  const progress = mutant === 'sem-morte' ? 0 : Math.min(1, elapsed / .55);
  const eased = 1 - (1 - progress) ** 3;
  return {
    tilt: (side < 0 ? -1 : 1) * eased * Math.PI / 2,
    sink: eased * .04,
    done: elapsed >= DEATH_SECONDS,
  };
}

function tipoDaOnda(wave, ordinal, total) {
  if (wave === WAVE_COUNTS.length && ordinal === total - 1) return 'ariete';
  if (wave >= 4 && ordinal % 24 === 23) return 'ariete';
  if (wave >= 3 && ordinal % 9 === 8) return 'matriarca';
  if (wave >= 2 && ordinal % 3 === 2) return 'adulto';
  return 'jovem';
}

function scoreDe(state, playerId) {
  return state.scores[playerId] ||= { points: 0, kills: 0, assists: 0, combo: 0, bestCombo: 0, damagePrevented: 0, lastKillAt: -Infinity };
}

export function criarHorda({ seed = 1, maxAlive = DEFAULT_MAX_ALIVE, entradas = FRENTES, becos = 0, setores = 16, maxWaves = 8, mutante = '' } = {}) {
  const magra = mutante === 'horda-magra';
  return {
    seed: seed >>> 0,
    maxAlive: Math.max(1, Math.min(magra ? 24 : DEFAULT_MAX_ALIVE, maxAlive | 0)),
    entrances: Math.max(1, entradas | 0),
    becos: Math.max(0, becos | 0),
    mutante,
    wave: 0,
    maxWaves,
    teamKills: { E: 0, B: 0, J: 0 },
    territorio: { E: 0, B: 0, J: 0 },
    eliminados: [],
    phase: 'prep',
    prepLeft: PREP_SECONDS,
    combatLeft: COMBAT_SECONDS,
    remaining: 0,
    spawnOrdinal: 0,
    spawnClock: 0,
    clock: 0,
    fury: 0,
    kills: 0,
    alive: [],
    controle: new Array(Math.max(1, setores | 0)).fill(0),
    defesaE: new Array(Math.max(1, setores | 0)).fill(0),
    defesaB: new Array(Math.max(1, setores | 0)).fill(0),
    dominio: 0,
    foodHp: {},
    foodRevirada: 0,
    scores: {},
    teamBonus: 0,
    winner: null,
  };
}

/* Tamanho da onda: o mutante `horda-magra` devolve a horda rala que o dono reprovou. */
export function tamanhoDaOnda(state, wave = state.wave) {
  const total = WAVE_COUNTS[Math.min(WAVE_COUNTS.length, wave) - 1] || 0;
  return state.mutante === 'horda-magra' ? Math.min(8, total) : total;
}

export function recalcularFuria(state) {
  if (state.mutante === 'sem-furia') return (state.fury = 0);
  const relogio = state.mutante === 'relogio-parado' ? 0 : (state.clock || 0) / 60 * FURIA.porMinuto;
  const crua = state.kills * FURIA.porAbate + Math.max(0, state.wave - 1) * FURIA.porOnda + relogio;
  state.fury = state.mutante === 'furia-infinita' ? crua : Math.min(FURIA.teto, crua);
  return state.fury;
}

export function cadenciaDeSpawn(state) {
  return SPAWN_BASE / (1 + (state.fury || 0) * FURIA.cadencia);
}

export function velocidadeDoJavaporco(state, type) {
  return (MODEL_SPEEDS[type] || 1) * (1 + (state.fury || 0) * FURIA.velocidade);
}

export function danoDoJavaporco(state, type, contra = 'jogador') {
  const tabela = BASE_DANO[contra] || BASE_DANO.jogador;
  return (tabela[type] ?? tabela.jovem) * (1 + (state.fury || 0) * FURIA.dano);
}

export function raioDeAgressao(state) {
  if (state.mutante === 'focinho-curto') return 7;
  return AGGRO.visao * (1 + (state.fury || 0) * FURIA.raio);
}

export function iniciarOnda(state) {
  if (state.winner || (state.maxWaves && state.wave >= state.maxWaves)) return false;
  state.wave++;
  state.phase = 'combat';
  state.combatLeft = COMBAT_SECONDS;
  state.prepLeft = 0;
  state.remaining = tamanhoDaOnda(state);
  state.spawnOrdinal = 0;
  state.spawnClock = 0;
  recalcularFuria(state);
  return true;
}

export function grupoJavaporco(ordinal) {
  return Math.floor(ordinal / 7) * 2 + (ordinal % 7 >= 3 ? 1 : 0);
}

function spawnAnimal(state) {
  const ordinal = state.spawnOrdinal++;
  const total = tamanhoDaOnda(state);
  const type = tipoDaOnda(state.wave, ordinal, total);
  const animal = { id: `${state.wave}.${ordinal}`, type, entrance: (state.seed + state.wave + grupoJavaporco(ordinal)) % state.entrances, hp: BOAR_HP[type], damage: {} };
  if (vaiPeloBeco(state, ordinal)) animal.beco = 1;
  state.alive.push(animal);
  state.remaining--;
}

/* Sorteio determinístico (semente + ordinal): host e cliente concordam sem trocar nada. */
export function vaiPeloBeco(state, ordinal) {
  if (!state.becos || state.wave < BECO.abreNaOnda || state.mutante === 'beco-fechado') return false;
  return (grupoJavaporco(ordinal) * 37 + state.seed * 11) % 100 < BECO.fracao * 100;
}

function ondaLimpa(state) {
  if (state.phase !== 'combat' || state.remaining || state.alive.length) return;
  const livre = 1 - (state.dominio || 0);
  state.teamBonus += Math.round(1500 * livre);
  if (state.maxWaves && state.wave === state.maxWaves) {
    state.teamBonus += Math.round(3000 * livre) + Math.ceil(state.combatLeft) * 10;
    state.phase = 'finished';
    state.winner = 'E';
  } else {
    state.phase = 'prep';
    state.prepLeft = PREP_SECONDS;
  }
}

/* Onda inteira na rua e o relógio dela zerou: a próxima vem com as sobras ainda vivas; na última, sobreviveu. */
function venceuOTempo(state) {
  if (!state.alive.length) return;
  if (state.maxWaves && state.wave === state.maxWaves) {
    state.teamBonus += Math.round(3000 * (1 - (state.dominio || 0)));
    state.phase = 'finished';
    state.winner = 'E';
    return;
  }
  state.phase = 'prep';
  state.prepLeft = PREP_SECONDS;
}

export function passoHorda(state, dt) {
  if (state.winner) return state;
  state.clock += dt;
  recalcularFuria(state);
  if (state.phase === 'prep') {
    state.prepLeft = Math.max(0, state.prepLeft - dt);
    if (!state.prepLeft) iniciarOnda(state);
    return state;
  }
  if (state.phase !== 'combat') return state;
  state.combatLeft = Math.max(0, state.combatLeft - dt);
  state.spawnClock += dt;
  const cadencia = cadenciaDeSpawn(state);
  while (state.remaining > 0 && state.alive.length < state.maxAlive && state.spawnClock >= cadencia) {
    state.spawnClock -= cadencia;
    spawnAnimal(state);
  }
  if (!state.combatLeft && !state.remaining && state.mutante !== 'onda-eterna') venceuOTempo(state);
  ondaLimpa(state);
  return state;
}

export function registrarDano(state, animalId, playerId, damage) {
  const animal = state.alive.find((item) => item.id === animalId);
  if (!animal || !playerId || damage <= 0) return false;
  animal.damage[playerId] = (animal.damage[playerId] || 0) + damage;
  scoreDe(state, playerId).damagePrevented += Math.min(damage, animal.hp);
  return true;
}

export function registrarAbate(state, animalId, killerId, mutant = '') {
  const index = state.alive.findIndex((item) => item.id === animalId);
  if (index < 0) return false;
  const [animal] = state.alive.splice(index, 1);
  const points = BOAR_POINTS[animal.type];
  if (killerId) {
    const killer = scoreDe(state, killerId);
    killer.combo = state.clock - killer.lastKillAt <= 4 ? Math.min(4, killer.combo + 1) : 1;
    killer.bestCombo = Math.max(killer.bestCombo, killer.combo);
    killer.lastKillAt = state.clock;
    const multiplier = [1, 1, 1.25, 1.5, 2][killer.combo];
    killer.points += Math.round(points * multiplier);
    killer.kills++;
    state.kills++;
    recalcularFuria(state);
  }
  const assistentes = Object.entries(animal.damage).filter(([id, damage]) => id !== killerId && damage > 0);
  const danoAssistente = assistentes.reduce((total, [, damage]) => total + damage, 0);
  const pool = Math.round(points * 0.4) * (mutant === 'duplica-assistencia' ? 2 : 1);
  for (const [id, damage] of assistentes) {
    const score = scoreDe(state, id);
    score.points += Math.round(pool * damage / danoAssistente);
    score.assists++;
  }
  ondaLimpa(state);
  return true;
}

/* Um passo do domínio. `bichos[i]`/`defensores[i]` são as contagens do setor i agora;
   setor disputado (os dois lados dentro) fica parado. */
export function passoDominio(state, setores, bichos, defensores, dt) {
  if (state.winner) return state.dominio;
  const controle = state.controle;
  let soma = 0, pesos = 0;
  for (let i = 0; i < controle.length; i++) {
    const b = bichos[i] || 0, d = defensores[i] || 0;
    if (b >= DOMINIO.minBichos && !d && state.mutante !== 'dominio-surdo') controle[i] = Math.min(1, controle[i] + DOMINIO.sobe * dt);
    else if (!b && state.mutante !== 'sem-retomada') controle[i] = Math.max(0, controle[i] - DOMINIO.desce * dt);
    const peso = setores?.[i]?.peso || 1;
    soma += controle[i] * peso; pesos += peso;
  }
  state.dominio = pesos ? soma / pesos : 0;
  return state.dominio;
}

export const setorTomado = (state, i) => (state.controle[i] || 0) >= 1;

export function setorEm(setores, x, z) {
  for (let i = 0; i < setores.length; i++) {
    const s = setores[i];
    if (x >= s.x0 && x < s.x1 && z >= s.z0 && z < s.z1) return i;
  }
  return -1;
}

/* Lixo/feira/caçamba: o ponto tem vida própria e some do cardápio quando é revirado. */
export function comidaRestante(state, spot) {
  if (!spot) return 0;
  const atual = state.foodHp[spot.id];
  if (atual !== undefined) return atual;
  return Number(spot.hp) || COMIDA_HP[spot.kind] || 120;
}

export function atacarComida(state, spot, damage) {
  if (!spot || !(damage > 0)) return 0;
  const antes = comidaRestante(state, spot);
  if (antes <= 0) return 0;
  const hp = Math.max(0, antes - damage);
  state.foodHp[spot.id] = hp;
  if (!hp) state.foodRevirada = (state.foodRevirada || 0) + 1;
  return hp;
}

function dentroDaCidade(world, x, z) {
  const c = world?.cityBounds;
  if (!c) return true;
  return x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ;
}

/* Grade 4×4 sobre a cidade: é o fallback enquanto o mapa não exporta `world.horda.setores`. */
export function gradeDeSetores(c = { minX: -36, maxX: 36, minZ: -36, maxZ: 36 }) {
  const lista = [], w = (c.maxX - c.minX) / 4, d = (c.maxZ - c.minZ) / 4;
  for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++)
    lista.push({ id: `q${i}${k}`, nome: `Quadra ${i + 1}-${k + 1}`, x0: c.minX + i * w, z0: c.minZ + k * d, x1: c.minX + (i + 1) * w, z1: c.minZ + (k + 1) * d, peso: 1 });
  return lista;
}

/* Sem `world.horda.frentes`: as 3 bocas mais afastadas entre si, cada uma com rota até a borda da cidade. */
function frentesDasBocas(world) {
  const bocas = world?.boarEntrances?.length ? world.boarEntrances : [{ x: 0, z: -50 }, { x: 43, z: 25 }, { x: -43, z: 25 }];
  const escolhidas = [bocas[0]];
  while (escolhidas.length < Math.min(FRENTES, bocas.length)) {
    let melhor = null, folga = -1;
    for (const b of bocas) {
      if (escolhidas.includes(b)) continue;
      const d = Math.min(...escolhidas.map((e) => Math.hypot(e.x - b.x, e.z - b.z)));
      if (d > folga) { folga = d; melhor = b; }
    }
    escolhidas.push(melhor);
  }
  const c = world?.cityBounds || { minX: -36, maxX: 36, minZ: -36, maxZ: 36 };
  const meia = Math.min(c.maxX - c.minX, c.maxZ - c.minZ) / 2;
  return escolhidas.map((b, i) => {
    const k = Math.min(1, meia / Math.max(1e-6, Math.abs(b.x), Math.abs(b.z)));
    const borda = { x: b.x * k, z: b.z * k };
    return { id: b.id || `frente${i}`, nome: b.id || `Frente ${i + 1}`, boca: borda, rota: [{ x: b.x, z: b.z }, borda] };
  });
}

const ponto = (p, chave) => ({ x: Number(p?.x) || 0, z: Number(p?.z) || 0, chave });

/* Lê o contrato `world.horda` do mapa, com fallback por peça; `plano` é a rota com chave de campo pronta. */
export function lerHorda(world) {
  const h = world?.horda || {};
  const setores = h.setores?.length ? h.setores : gradeDeSetores(world?.cityBounds);
  const frentes = (h.frentes?.length ? h.frentes : frentesDasBocas(world)).map((f, i) => {
    const id = f.id || `frente${i}`;
    const rota = f.rota?.length ? f.rota : [f.boca];
    return { id, nome: f.nome || id, boca: ponto(f.boca || rota[rota.length - 1]), plano: rota.map((p, k) => ponto(p, `r:${id}:${k}`)), viaBeco: new Map(), variantes: new Map() };
  });
  const becos = (h.becos || []).filter((b) => b?.de && b?.ate).map((b, i) => {
    const id = b.id || `beco${i}`;
    return { id, nome: b.nome || id, de: ponto(b.de, `b:${id}:de`), ate: ponto(b.ate, `b:${id}:ate`), abreNaOnda: b.abreNaOnda ?? BECO.abreNaOnda };
  });
  return { frentes, becos, setores, doMapa: !!world?.horda };
}

const CHAVES_SETOR = [];
const chaveDoSetor = (i) => (CHAVES_SETOR[i] ||= `s:${i}`);
const CHAVES_COMIDA = new Map();
const chaveDaComida = (id) => {
  let chave = CHAVES_COMIDA.get(id);
  if (!chave) CHAVES_COMIDA.set(id, chave = `c:${id}`);
  return chave;
};

/* `saida` é preenchida no lugar: com 64 bichos, um objeto de alvo por bicho por quadro
   era ~3.800 objetos por segundo, e foi isso que o perf acusou como pausa de GC. */
function alvoEm(saida, kind, x, z, distance, chave, ent, spot, objectiveIndex, raio) {
  saida.kind = kind; saida.x = x; saida.z = z; saida.distance = distance; saida.chave = chave;
  saida.ent = ent; saida.spot = spot; saida.objectiveIndex = objectiveIndex; saida.raio = raio;
  return saida;
}

/* Alvo que o bicho já tentou e não alcançou fica de quarentena SÓ pra ele: sem isso um
   saco de lixo atrás de um muro prende meia horda até o fim da onda (medido no mapa). */
const evitando = (bot, chave, tempo) => (bot._boarEvitar?.get(chave) || 0) > tempo;

function comidaMaisProxima(bot, world, state, tempo, saida, perto = null, raioMax = Infinity) {
  const spots = world?.foodSpots || [];
  let alvo = null, melhor = Infinity;
  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];
    if (comidaRestante(state, spot) <= 0 || !dentroDaCidade(world, spot.x, spot.z)) continue;
    if (perto && Math.hypot(spot.x - perto.x, spot.z - perto.z) > raioMax) continue;
    if (evitando(bot, chaveDaComida(spot.id), tempo)) continue;
    const d = Math.hypot(spot.x - bot.pos.x, spot.z - bot.pos.z);
    if (spot.id === bot._boarComidaId) { melhor = d; alvo = spot; break; }
    if (d < melhor) { melhor = d; alvo = spot; }
  }
  if (!alvo) return null;
  bot._boarComidaId = alvo.id;
  /* `r` do mapa já é "distância do centro em que o focinho alcança" (meia-extensão do
     colisor + 0,40), então entra cru; sem `r`, 1,6 m serve de palpite. */
  const raio = Number(alvo.r) > 0 ? Number(alvo.r) : AGGRO.comida;
  return alvoEm(saida, 'comida', alvo.x, alvo.z, melhor, chaveDaComida(alvo.id), null, alvo, -1, raio);
}

/* Ponto de vagar a 3–6 m do bicho, preso na caixa: perto o bastante pra andar reto sem campo de fluxo. */
function vagarEm(bot, x0, z0, x1, z1, tempo, saida) {
  let v = bot._boarVagar;
  const longe = v ? Math.hypot(v.x - bot.pos.x, v.z - bot.pos.z) : 0;
  if (!v || tempo > v.ate || longe < 1.2 || v.x < x0 || v.x > x1 || v.z < z0 || v.z > z1) {
    v = bot._boarVagar ||= { x: 0, z: 0, ate: 0 };
    const n = (bot._boarVagarN = (bot._boarVagarN || 0) + 1);
    const u = Math.abs(Math.sin(n * 12.9898 + (bot._boarJitter || 0) * 78.233) * 43758.5453) % 1;
    const ang = u * Math.PI * 2, r = 3 + (u * 7.31 % 1) * 3;
    v.x = Math.max(x0 + 1.5, Math.min(x1 - 1.5, bot.pos.x + Math.sin(ang) * r));
    v.z = Math.max(z0 + 1.5, Math.min(z1 - 1.5, bot.pos.z + Math.cos(ang) * r));
    v.ate = tempo + VAGAR_TROCA;
  }
  return alvoEm(saida, 'vagar', v.x, v.z, Math.hypot(v.x - bot.pos.x, v.z - bot.pos.z), 'v', null, null, -1, 0);
}

/* Setor: vaga no setor em que está até ele ser tomado; depois vai ao não tomado mais perto que não esteja lotado. */
function setorAlvo(bot, setores, state, tempo, lotacao, saida) {
  if (state.mutante === 'setor-cego') return alvoEm(saida, 'vazio', bot.pos.x, bot.pos.z, 0, 'v', null, null, -1, 0);
  const aqui = setorEm(setores, bot.pos.x, bot.pos.z);
  if (aqui >= 0 && !setorTomado(state, aqui)) {
    const s = setores[aqui];
    return vagarEm(bot, s.x0, s.z0, s.x1, s.z1, tempo, saida);
  }
  let livre = -1, dLivre = Infinity, qualquer = -1, dQualquer = Infinity;
  for (let i = 0; i < setores.length; i++) {
    if (setorTomado(state, i) || evitando(bot, chaveDoSetor(i), tempo)) continue;
    const s = setores[i];
    const d = Math.hypot((s.x0 + s.x1) / 2 - bot.pos.x, (s.z0 + s.z1) / 2 - bot.pos.z);
    if (d < dQualquer) { dQualquer = d; qualquer = i; }
    if ((lotacao?.[i] || 0) < DOMINIO.lotado && d < dLivre) { dLivre = d; livre = i; }
  }
  const i = livre >= 0 ? livre : qualquer;
  if (i < 0) {
    const s = aqui >= 0 ? setores[aqui] : null;
    return s ? vagarEm(bot, s.x0, s.z0, s.x1, s.z1, tempo, saida) : alvoEm(saida, 'vazio', bot.pos.x, bot.pos.z, 0, 'v', null, null, -1, 0);
  }
  const s = setores[i];
  return alvoEm(saida, 'setor', (s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2, livre >= 0 ? dLivre : dQualquer, chaveDoSetor(i), null, null, i, AGGRO.objetivo);
}

const SETORES_PADRAO = new WeakMap();
function setoresDe(ctx) {
  if (ctx.setores) return ctx.setores;
  const w = ctx.world || {};
  let lista = SETORES_PADRAO.get(w);
  if (!lista) SETORES_PADRAO.set(w, lista = lerHorda(w).setores);
  return lista;
}

// Comida próxima interrompe o trajeto; contato ou provocação ainda permitem defesa.
export function escolherAlvo(bot, ctx, saida = {}) {
  const { world, state, jogadores = [], tempo = 0 } = ctx;
  const raio = raioDeAgressao(state);
  let ent = null, perto = Infinity;
  for (let i = 0; i < jogadores.length; i++) {
    const alvo = jogadores[i];
    if (!alvo?.alive || !alvo.pos || Math.abs((alvo.pos.y || 0) - (bot.pos.y || 0)) > 1.5) continue;
    const d = Math.hypot(alvo.pos.x - bot.pos.x, alvo.pos.z - bot.pos.z);
    if (d < perto) { perto = d; ent = alvo; }
  }
  const puxado = state.mutante !== 'focinho-curto' && (bot._boarAlertaAte || 0) > tempo;
  const comidaPerto = state.mutante === 'ignora-comida' || state.mutante === 'lixo-depois' ? null : comidaMaisProxima(bot, world, state, tempo, saida, bot.pos, 14);
  if (ent && (perto <= (state.mutante === 'persegue-tudo' ? raio : comidaPerto ? AGGRO.ataque : Math.min(6, raio)) || (puxado && perto <= AGGRO.ouvido)))
    return alvoEm(saida, 'jogador', ent.pos.x, ent.pos.z, perto, ent._chaveDeFluxo ||= `j:${ent._playerId || ent.name || 'p'}`, ent, null, -1, 0);
  if (comidaPerto) {
    if (bot._boarPlano && dentroDaCidade(world,bot.pos.x,bot.pos.z)) bot._boarPasso=bot._boarPlano.length;
    return comidaPerto;
  }
  const plano = state.mutante === 'sem-rota' ? null : bot._boarPlano;
  if (plano && (bot._boarPasso || 0) < plano.length) {
    const p = plano[bot._boarPasso || 0];
    return alvoEm(saida, 'rota', p.x, p.z, Math.hypot(p.x - bot.pos.x, p.z - bot.pos.z), p.chave, null, null, -1, ROTA_RAIO);
  }
  const explorar = (bot._boarExplorarAte || 0) > tempo ? bot._boarExplorar : null;
  if (explorar) {
    const comida = state.mutante === 'ignora-comida' ? null : comidaMaisProxima(bot, world, state, tempo, saida, explorar, BECO.raio);
    if (comida) return comida;
    return vagarEm(bot, explorar.x - BECO.raio, explorar.z - BECO.raio, explorar.x + BECO.raio, explorar.z + BECO.raio, tempo, saida);
  }
  const proxima = state.mutante === 'ignora-comida' ? null : comidaMaisProxima(bot, world, state, tempo, saida, bot.pos, 10);
  if (proxima) return proxima;
  const setores = setoresDe(ctx);
  if (bot._boarId && setores.length) {
    const ordinal = Number(bot._boarId.split('.')[1]) || 0;
    const grupo = grupoJavaporco(ordinal);
    const base = (state.seed + state.wave * 7 + grupo * 5 + Math.floor(tempo / 45)) % setores.length;
    let i = base;
    for (let k = 0; k < setores.length; k++) {
      const candidato = (base + k) % setores.length;
      if (!setorTomado(state, candidato) && !evitando(bot, chaveDoSetor(candidato), tempo)) { i = candidato; break; }
    }
    const s = setores[i], x = (s.x0 + s.x1) / 2, z = (s.z0 + s.z1) / 2;
    const comida = state.mutante === 'ignora-comida' ? null : comidaMaisProxima(bot, world, state, tempo, saida, { x, z }, Math.min(s.x1 - s.x0, s.z1 - s.z0) * .48);
    if (comida) return comida;
    if (setorEm(setores, bot.pos.x, bot.pos.z) === i) return vagarEm(bot, s.x0, s.z0, s.x1, s.z1, tempo, saida);
    return alvoEm(saida, 'setor', x, z, Math.hypot(x - bot.pos.x, z - bot.pos.z), chaveDoSetor(i), null, null, i, AGGRO.objetivo);
  }
  const comida = state.mutante === 'ignora-comida' ? null : comidaMaisProxima(bot, world, state, tempo, saida);
  if (comida) return comida;
  return setorAlvo(bot, setoresDe(ctx), state, tempo, ctx.lotacao, saida);
}

/* Chão REAL: o bicho andava enterrado porque o modo assumia y=0 (relato do dono). */
export function alturaDoChao(world, x, z, yRef) {
  const altura = world?.groundHeightAt?.(x, z, yRef);
  return Number.isFinite(altura) ? altura : 0;
}

/* Mesma conta de volume/pan/atraso que o game.js usa pra tiro e morte de bot. */
export function espacializarJavaporco(ouvinte, pos, alcance = 46) {
  const ox = ouvinte?.pos?.x ?? 0, oz = ouvinte?.pos?.z ?? 0;
  const dx = (pos?.x ?? 0) - ox, dz = (pos?.z ?? 0) - oz;
  const d = Math.hypot(dx, dz);
  const rel = Math.atan2(dx, dz) - (ouvinte?.yaw || 0);
  return {
    vol: Math.max(0, 1 - d / alcance),
    pan: Math.max(-.9, Math.min(.9, Math.sin(rel) * .82)),
    delay: Math.min(.25, d / 343),
  };
}

export function desvioDeCaminhada(tempo, identidade, mutante = '') {
  if (mutante === 'fila-indiana') return 0;
  const fase = identidade * 19.7;
  return Math.sin(tempo * .83 + fase) * .24 + Math.sin(tempo * .31 + fase * 1.7) * .13;
}

export function snapshotHorda(state) {
  return {
    wave: state.wave,
    clock: state.clock,
    defesaE: state.defesaE,
    defesaB: state.defesaB,
    teamKills: state.teamKills,
    territorio: state.territorio,
    eliminados: state.eliminados,
    seed: state.seed,
    phase: state.phase,
    prepLeft: Number(state.prepLeft.toFixed(3)),
    combatLeft: Number(state.combatLeft.toFixed(3)),
    remaining: state.remaining,
    fury: Number((state.fury || 0).toFixed(3)),
    kills: state.kills || 0,
    alive: state.alive.map(({ id, type, entrance, hp, beco }) => (beco ? { id, type, entrance, hp, beco } : { id, type, entrance, hp })),
    controle: state.mutante === 'rede-sem-dominio' ? [] : state.controle.map((v) => Math.round(v * 100) / 100),
    dominio: state.mutante === 'rede-sem-dominio' ? 0 : Math.round((state.dominio || 0) * 1000) / 1000,
    foodHealth: { ...state.foodHp },
    scoreByPlayer: structuredClone(state.scores),
    teamBonus: state.teamBonus,
    winner: state.winner,
  };
}

const MODEL_PATHS = Object.fromEntries(Object.entries(MODELOS_JAVAPORCOS).map(([tipo, nome]) => [tipo, `/models/enemies/javaporcos/${nome}.glb`]));
const modelTemplates = new Map();
let preloadPromise = null;

export function preloadJavaporcos() {
  if (preloadPromise) return preloadPromise;
  if (typeof document === 'undefined') return Promise.resolve();
  const loader = new GLTFLoader();
  preloadPromise = Promise.all(Object.entries(MODEL_PATHS).map(([type, url]) => new Promise((resolve) => {
    loader.load(assetUrl(url), (gltf) => {
      gltf.scene.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
      });
      registrarModeloJavaporco(type, gltf.scene);
      loader.load(assetUrl(url.replace('.glb','_lod.glb')), lod => {
        const originais = [], distantes = [];
        gltf.scene.traverse(n=>{if(n.isMesh)originais.push(n);});
        lod.scene.traverse(n=>{if(n.isMesh)distantes.push(n);});
        if (originais.length === distantes.length) originais.forEach((n,i)=>registrarGeometriaDistante(n.geometry,distantes[i].geometry));
        lod.scene.traverse(n=>{if(n.isMesh){for(const mat of (Array.isArray(n.material)?n.material:[n.material])){for(const v of Object.values(mat))if(v?.isTexture)v.dispose();mat.dispose();}}});
        resolve();
      },undefined,resolve);
    }, undefined, () => resolve());
  })));
  return preloadPromise;
}

/* Entrada única do molde por tipo: o carregador escreve aqui e a régua planta um
   molde de pivô torto pra provar que a pata encosta no chão mesmo assim. */
export function registrarModeloJavaporco(type, objeto) {
  if (objeto) modelTemplates.set(type, objeto);
  else modelTemplates.delete(type);
}

/* Geometria e material do proxy ficam no módulo: com 64 vivos, criar seis geometrias
   por spawn era pico de quadro na hora em que a onda enche. */
const PROXY_GEO = {
  corpo: new THREE.SphereGeometry(.72, 10, 7),
  cabeca: new THREE.SphereGeometry(.4, 9, 6),
  pata: new THREE.CylinderGeometry(.09, .12, .55, 6),
};
const PROXY_MAT = new Map();
function materialProxy(type) {
  let material = PROXY_MAT.get(type);
  if (material) return material;
  const color = type === 'ariete' ? 0x33251e : type === 'matriarca' ? 0x5a3828 : type === 'adulto' ? 0x704833 : 0x895b3f;
  material = new THREE.MeshLambertMaterial({ color });
  PROXY_MAT.set(type, material);
  return material;
}

function fallbackAnimal(type) {
  const group = new THREE.Group();
  const material = materialProxy(type);
  const body = new THREE.Mesh(PROXY_GEO.corpo, material);
  body.scale.set(1.35, .72, .78); body.position.y = .68; body.castShadow = true; group.add(body);
  const head = new THREE.Mesh(PROXY_GEO.cabeca, material);
  head.position.set(0, .65, .82); head.scale.set(.82, .76, 1.05); head.castShadow = true; group.add(head);
  for (const x of [-.42, .42]) for (const z of [-.38, .38]) {
    const leg = new THREE.Mesh(PROXY_GEO.pata, material);
    leg.position.set(x, .28, z); leg.castShadow = true; group.add(leg);
  }
  return group;
}

/* O modelo vai DENTRO de um grupo e o grupo é que vai pro chão: era a conta de
   `position.y = -box.min.y` que o passo do bicho sobrescrevia e enterrava a pata. */
function visualAnimal(type, mutante = '', ordinal = 0) {
  const variante = varianteJavaporco(type, ordinal);
  const template = modelTemplates.get(variante) || modelTemplates.get(type);
  const corpo = template ? template.clone(true) : fallbackAnimal(type);
  const box = new THREE.Box3().setFromObject(corpo);
  const altura = Math.max(.01, box.max.y - box.min.y);
  const escala = MODEL_HEIGHTS[type] / altura;
  corpo.scale.multiplyScalar(escala);
  corpo.scale.x *= [.86, 1, 1.14, .94, 1.08][ordinal % 5];
  corpo.scale.z *= [1.1, .92, 1.04, 1.16, .96][ordinal % 5];
  corpo.position.y = mutante === 'pivo-solto' ? 0 : -box.min.y * escala;
  const pivo = new THREE.Group();
  pivo.add(corpo);
  pivo.userData.corpo = corpo;
  pivo.userData.variante = variante;
  if (template) prepararPassada(pivo);
  return pivo;
}

export function criarPreviewJavaporco() {
  return visualAnimal('adulto', '', 1);
}

function marchaRural(sfx, mutante = '') {
  const ctx = sfx?.ctx;
  const output = mutante === 'marcha-sem-master' ? ctx?.destination : sfx?.master;
  if (!ctx?.createOscillator || !output) return [];
  const start = ctx.currentTime + .03;
  const nodes = [];
  for (let beat = 0; beat < 48; beat++) {
    const at = start + beat * .42;
    const drum = ctx.createOscillator(), gain = ctx.createGain();
    drum.type = 'triangle'; drum.frequency.setValueAtTime(beat % 4 === 0 ? 105 : 150, at);
    gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(.055, at + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, at + .13); drum.connect(gain).connect(output);
    drum.start(at); drum.stop(at + .15); nodes.push(drum);
    if (beat % 2 === 0) {
      const viola = ctx.createOscillator(), vg = ctx.createGain();
      viola.type = 'sawtooth'; viola.frequency.setValueAtTime([196, 220, 247, 220][(beat / 2) % 4], at);
      vg.gain.setValueAtTime(.0001, at); vg.gain.exponentialRampToValueAtTime(.018, at + .08);
      vg.gain.exponentialRampToValueAtTime(.0001, at + .34); viola.connect(vg).connect(output);
      viola.start(at); viola.stop(at + .38); nodes.push(viola);
    }
  }
  return nodes;
}

function preencherSlotsDaHorda(game, boars) {
  const template = boars[0] || game.bots[0] || game.player;
  if (!template) return;
  while (boars.length < DEFAULT_MAX_ALIVE) {
    const group = new THREE.Group();
    group.visible = false;
    game.scene.add(group);
    const bot = {
      isPlayer: false,
      name: `[HORDA] Reserva ${boars.length + 1}`,
      def: template.def,
      team: 'J',
      mesh: { group, isGLB: false, parts: {} },
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      yaw: 0,
      hp: 0,
      alive: false,
      respawnAt: Infinity,
      protUntil: 0,
      kills: 0,
      deaths: 0,
      crouchF: 0,
      target: null,
      reactAt: 0,
      nextShotAt: 0,
      skill: 1,
      weapon: 'knife',
      primary: 'knife',
      mag: 0,
      aimErr: 0,
      burst: 0,
      path: null,
      pathIdx: 0,
      repathAt: 0,
      roamIdx: 0,
      phase: 0,
      think: 0,
      deadT: 0,
      _objectiveNpc: 'javaporco',
    };
    game.bots.push(bot);
    game.combatants.push(bot);
    boars.push(bot);
  }
}

/* Campo de fluxo: UM percurso em largura por destino serve a horda inteira, em vez de
   um caminho por bicho. Grafo não dirigido (`adj` simétrico); buffers reaproveitados. */
let filaFluxo = new Int32Array(0);
function fluxoAte(adj, destino, reuso) {
  const total = adj.length;
  const prox = reuso?.length === total ? reuso.fill(-1) : new Int32Array(total).fill(-1);
  if (filaFluxo.length < total) filaFluxo = new Int32Array(total);
  const fila = filaFluxo;
  let fim = 0;
  prox[destino] = destino;
  fila[fim++] = destino;
  for (let i = 0; i < fim; i++) {
    const atual = fila[i], vizinhos = adj[atual];
    for (let k = 0; k < vizinhos.length; k++) {
      const viz = vizinhos[k];
      if (prox[viz] !== -1) continue;
      prox[viz] = atual;
      fila[fim++] = viz;
    }
  }
  return prox;
}

/* `az:+1` anda na direção de `yaw` (sin,cos) — o mesmo rumo que os bots do jogo usam.
   ENTRADA_RE é só do mutante `rumo-invertido`, que devolve o bicho andando de costas. */
const ENTRADA_FRENTE = Object.freeze({ ax: 0, az: 1, shift: false, crouch: false, jump: false });
const ENTRADA_RE = Object.freeze({ ax: 0, az: -1, shift: false, crouch: false, jump: false });

class InvasaoJavaporcos {
  constructor(game) {
    this.game = game;
    this.regras = regrasDaInvasao(game.settings?.javaporcos, game.online || game.dedicated);
    this.boars = this.regras.times === 3 ? [] : game.combatants.filter((ent) => !ent.isPlayer && ent.team !== game.player?.team);
    for (const ent of this.boars) ent.team = 'J';
    preencherSlotsDaHorda(game, this.boars);
    this.slots = new Map();
    this.horda = lerHorda(game.world);
    this.bichosNoSetor = new Int32Array(this.horda.setores.length);
    this.defensoresNoSetor = new Int32Array(this.horda.setores.length);
    this.timeENoSetor = new Int32Array(this.horda.setores.length);
    this.timeBNoSetor = new Int32Array(this.horda.setores.length);
    this.dominioAte = 0;
    this.dominioEm = -1;
    this.state = this.novaHorda();
    this.cinematic = null;
    this.audioNodes = [];
    this.scoreShown = false;
    this.corpses = [];
    this.deathBox = new THREE.Box3();
    this.deathCenter = new THREE.Vector3();
    this.mordidaRay = new THREE.Raycaster();
    this.mordidaDe = new THREE.Vector3();
    this.mordidaAte = new THREE.Vector3();
    this.jogadores = [];
    this.vivos = [];
    this.hudAte = 0;
    this.ctx = { world: game.world, state: null, jogadores: this.jogadores, tempo: 0, setores: this.horda.setores, lotacao: this.bichosNoSetor };
    this.campos = new Map();
    this.orcamentoCampo = 1;
    this.manadaAte = 0;
    this.rosnadoAte = 0;
    this.ondaAnunciada = 0;
    this.jitter = 0;
    for (const bot of this.boars) {
      bot.vel ||= new THREE.Vector3();
      bot._objectiveNpc = 'javaporco';
      bot.team = 'J';
      bot.respawnAt = Infinity;
      bot.alive = false;
      bot.hp = 0;
      if (bot.mesh?.group) bot.mesh.group.visible = false;
    }
    if (!game.dedicated && typeof document !== 'undefined') {
      this.hud = document.createElement('div');
      this.hud.id = 'horde-objective';
      this.hud.style.cssText = 'position:fixed;left:50%;top:5.7rem;transform:translateX(-50%);z-index:12;display:flex;gap:.75rem;align-items:center;min-width:360px;padding:.5rem .7rem;background:#1a120bdd;border:1px solid #d6a03a;color:#fff;font:700 13px/1.35 system-ui;text-align:center;letter-spacing:.035em;pointer-events:none';
      this.montarHudDominio();
      game.el.hud?.append?.(this.hud);
      this.cinemaTitle = document.createElement('div');
      this.cinemaTitle.style.cssText = 'position:fixed;inset:32% 0 auto;z-index:14;text-align:center;color:#e0b347;font:900 clamp(30px,6vw,82px)/.9 Impact,sans-serif;letter-spacing:.06em;text-shadow:0 4px 0 #2a1008,0 0 28px #c42b18;opacity:0;pointer-events:none';
      game.el.hud?.append?.(this.cinemaTitle);
      this._key = (event) => {
        if (this.cinematic && game.time - this.cinematic.startedAt >= 2 && (event.code === 'Space' || event.code === 'Escape')) game.stateUntil = game.time;
      };
      window.addEventListener('keydown', this._key);
    }
  }
  novaHorda() {
    return criarHorda({
      seed: this.game.matchSeed || this.game.seed || 1,
      maxAlive: Math.max(1, this.boars.length),
      entradas: this.horda.frentes.length,
      becos: this.horda.becos.length,
      setores: this.horda.setores.length,
      maxWaves: 0,
    });
  }
  get frentes() { return this.horda.frentes; }
  get becos() { return this.horda.becos; }
  get setores() { return this.horda.setores; }

  /* Painel de território e mini-mapa por setor; 100% de ocupação não encerra a partida. */
  montarHudDominio() {
    if (document.getElementById?.('hud-top')) {
      if (this.regras.times !== 3) {
        this.placarHumanoB = document.getElementById('score-b');
        if (this.placarHumanoB) { this.placarBDisplay = this.placarHumanoB.style.display; this.placarHumanoB.style.display = 'none'; }
      }
      this.placarJ = document.createElement('div');
      this.placarJ.id = 'score-j'; this.placarJ.className = 'team-score';
      const img = document.createElement('img'); img.src='/img/javaporco-card.webp'; img.alt='Javaporcos';
      this.placarJNum = document.createElement('b'); this.placarJNum.textContent='0';
      const nome = document.createElement('span'); nome.textContent='JAVAPORCOS';
      for (const node of [img,this.placarJNum,nome]) this.placarJ.appendChild(node);
      document.getElementById('hud-top').appendChild(this.placarJ);
    }
    const el = (css, pai) => { const d = document.createElement('div'); d.style.cssText = css; pai?.append?.(d); return d; };
    const coluna = el('display:flex;flex-direction:column;gap:.3rem;min-width:300px', this.hud);
    const linha = el('display:flex;align-items:baseline;justify-content:space-between;gap:.8rem', coluna);
    this.hudDominio = el('font:900 19px/1 system-ui;color:#ffd27a;letter-spacing:.06em;white-space:nowrap', linha);
    this.hudSetores = el('font:700 11px/1 system-ui;color:#e8d7b0;white-space:nowrap', linha);
    const barra = el('position:relative;height:9px;background:#3a2a1c;border:1px solid #6b4b2a', coluna);
    this.hudBarra = el('position:absolute;left:0;top:0;bottom:0;width:0%;background:linear-gradient(90deg,#d6a03a,#c42b18)', barra);

    this.hudTexto = el('font:700 11px/1.3 system-ui;white-space:nowrap;color:#f3eadb', coluna);
    const c = this.game.world?.cityBounds || { minX: -36, maxX: 36, minZ: -36, maxZ: 36 };
    this.hudExtensao = { x0: c.minX - 8, z0: c.minZ - 8, w: c.maxX - c.minX + 16, d: c.maxZ - c.minZ + 16 };
    this.hudMapa = el('position:relative;width:96px;height:96px;flex:none;background:#24301c;border:1px solid #d6a03a', this.hud);
    const pct = (v) => `${Math.max(0, Math.min(100, v * 100)).toFixed(1)}%`;
    const px = (x) => pct((x - this.hudExtensao.x0) / this.hudExtensao.w), pz = (z) => pct((z - this.hudExtensao.z0) / this.hudExtensao.d);
    this.hudCelulas = this.horda.setores.map((s) => el(`position:absolute;left:${px(s.x0)};top:${pz(s.z0)};width:${pct((s.x1 - s.x0) / this.hudExtensao.w)};height:${pct((s.z1 - s.z0) / this.hudExtensao.d)};box-sizing:border-box;border:1px solid #0006;background:#5d6b4a`, this.hudMapa));
    for (const f of this.horda.frentes) el(`position:absolute;left:${px(f.boca.x)};top:${pz(f.boca.z)};width:8px;height:8px;margin:-4px;border-radius:50%;background:#c42b18;border:1px solid #fff`, this.hudMapa);
    this.hudBecos = this.horda.becos.map((b) => el(`position:absolute;left:${px(b.ate.x)};top:${pz(b.ate.z)};width:5px;height:5px;margin:-2.5px;background:#ffd27a;opacity:0`, this.hudMapa));
    this.hudJogador = el('position:absolute;width:6px;height:6px;margin:-3px;border-radius:50%;background:#fff', this.hudMapa);
    this.hudPx = px; this.hudPz = pz;
  }
  emitir(k, data = {}) {
    this.game._objectiveEvent?.({ k, ...data });
  }


  prepareRound() {
    this.state = this.novaHorda();
    for (const campo of ['roundKills', 'roundsWon', 'matchKills', 'roundCaps']) if (this.game[campo]) this.game[campo].J = 0;
    for (const spot of this.game.world.foodSpots || []) this.marcarComida(spot, spot.hp);
    this.game.timeLeft = WAVE_COUNTS.length * (PREP_SECONDS + COMBAT_SECONDS);
    this.cinematic = null;
    this.scoreShown = false;
    this.campos.clear();
    this.ondaAnunciada = 0;
    this.dominioAte = 0;
    this.dominioEm = -1;
    if (this.game.vmScene) this.game.vmScene.visible = true;
    if (this.cinemaTitle) this.cinemaTitle.style.opacity = '0';
    this.limparCadaveres();
    for (const bot of this.boars) this.desativar(bot);
    this.atualizaHud();
  }

  idDo(ent) {
    return ent?._playerId || ent?.id || ent?.name || null;
  }

  assignar(animal) {
    const remoto = this.game.online && !this.game.dedicated && animal.entityId != null;
    const bot = this.boars.find((item) => !item._boarId && (!remoto || item._netId === animal.entityId));
    if (!bot) return;
    const frente = this.horda.frentes[animal.entrance % this.horda.frentes.length];
    const plano = this.planoDe(frente, animal);
    const bocas = this.game.world.boarEntrances || [];
    const entrance = this.state.mutante === 'todo-lado' && bocas.length
      ? bocas[Number(animal.id.split('.')[1]) % bocas.length] : plano[0];
    bot._boarPlano = plano; bot._boarPasso = 0; bot._boarRumo = null; bot._boarCorpo = null;
    bot._boarExplorar = plano.beco || null; bot._boarExplorarAte = 0; bot._boarVagar = null;
    bot._boarId = animal.id;
    bot._boarType = animal.type;
    bot._objectiveNpc = 'javaporco';
    bot.name = `[ONDA ${this.state.wave}] ${animal.type.toUpperCase()}`;
    bot.weapon = 'knife'; bot.primary = 'knife';
    bot.hp = animal.hp; bot.alive = true; bot.respawnAt = Infinity; bot.deadT = 0;
    bot.pos.set(entrance.x, alturaDoChao(this.game.world, entrance.x, entrance.z), entrance.z);
    bot.vel.set(0, 0, 0); bot.yaw = Math.atan2(-entrance.x, -entrance.z);
    this.jitter = (this.jitter + .37) % 1;
    bot._boarJitter = this.jitter;
    bot._boarNoAte = 0; bot._boarNo = -1; bot._boarAttackAt = 0;
    bot._boarAlertaAte = 0; bot._boarDashAte = 0; bot._boarDashLivre = this.game.time + DASH.espera * this.jitter;
    bot._boarRosnarAte = this.game.time + 1 + this.jitter * 3;
    bot._boarFocinhoAte = 0; bot._boarGolpeAte = 0; bot._boarComidaId = null; bot._boarEvitar = null; bot._boarCansaco = 0; bot._boarMelhorEm = this.game.time;
    bot._boarAlvoChave = null; bot._boarAvancoEm = 0; bot._boarDeslizeAte = 0;
    bot._boarVisual = visualAnimal(animal.type, this.state.mutante, Number(animal.id.split('.')[1]) || 0);
    this.game.scene.add(bot._boarVisual);
    this.emitir('BOAR_SPAWN', { i: animal.id, type: animal.type, entrance: animal.entrance, wave: this.state.wave });
    this.slots.set(animal.id, bot);
  }

  /* Rota da frente; com `beco`, emenda o beco aberto mais perto da boca (o jitter alterna entre os dois mais perto). */
  planoDe(frente, animal) {
    let base = frente.plano;
    const nodes = this.game.world.waypoints?.nodes;
    if (nodes?.length && this.state.mutante !== 'entrada-fixa') {
      const ordinal = Number(animal.id.split('.')[1]) || 0;
      const variante = (this.state.seed + this.state.wave * 5 + grupoJavaporco(ordinal) * 7) % 12;
      if (!frente.variantes.has(variante)) {
        const inicio = base[0], fim = base[base.length - 1];
        const eixo = Math.abs(inicio.x) > Math.abs(inicio.z) ? 'x' : 'z';
        const lateral = eixo === 'x' ? 'z' : 'x', sinal = Math.sign(inicio[eixo]);
        const saidas = nodes.filter(n => n[eixo] * sinal >= 48 && Math.hypot(n.x - inicio.x, n.z - inicio.z) <= 14);
        const chegadas = nodes.filter(n => n[eixo] * sinal >= 30 && n[eixo] * sinal <= 39 && Math.abs(n[lateral] - fim[lateral]) <= 9);
        if (saidas.length && chegadas.length) {
          const de = saidas[Math.floor(variante * saidas.length / 12)];
          const ate = chegadas.reduce((best, n) => Math.abs(n[lateral] - de[lateral]) < Math.abs(best[lateral] - de[lateral]) ? n : best);
          frente.variantes.set(variante, [ponto(de, `v:${frente.id}:${variante}:0`), ponto(ate, `v:${frente.id}:${variante}:1`)]);
        } else frente.variantes.set(variante, base);
      }
      base = frente.variantes.get(variante);
    }
    const abertos = animal.beco ? this.horda.becos.filter((b) => b.abreNaOnda <= this.state.wave) : [];
    if (!abertos.length) return base;
    abertos.sort((a, b) => Math.hypot(a.de.x - frente.boca.x, a.de.z - frente.boca.z) - Math.hypot(b.de.x - frente.boca.x, b.de.z - frente.boca.z));
    const beco = abertos[abertos.length > 1 && grupoJavaporco(Number(animal.id.split('.')[1]) || 0) % 2 ? 1 : 0];
    const chave = `${base[0].chave}:${beco.id}`;
    let plano = frente.viaBeco.get(chave);
    if (!plano) {
      plano = [...base, beco.de, beco.ate];
      plano.beco = beco.ate;
      frente.viaBeco.set(chave, plano);
    }
    return plano;
  }

  desativar(bot) {
    liberarPassada(bot._boarVisual);
    if (bot._boarVisual) this.game.scene.remove(bot._boarVisual);
    if (bot.mesh?.group) bot.mesh.group.visible = false;
    if (bot._boarId) this.slots.delete(bot._boarId);
    bot._boarVisual = null; bot._boarId = null; bot._boarType = null;
    bot.alive = false; bot.hp = 0; bot.respawnAt = Infinity; bot.vel.set(0, 0, 0);
  }

  tombar(bot, attacker = null) {
    if (!bot?._boarId) return;
    if (this.game.dedicated || !bot._boarVisual) {
      this.desativar(bot);
      return;
    }
    const id = bot._boarId;
    const visual = bot._boarVisual;
    const dx = (attacker?.pos?.x ?? bot.pos.x + 1) - bot.pos.x;
    const dz = (attacker?.pos?.z ?? bot.pos.z) - bot.pos.z;
    const lateral = dx * Math.cos(bot.yaw) + dz * Math.sin(bot.yaw);
    const side = lateral < 0 ? -1 : 1;
    visual.position.set(bot.pos.x, bot.pos.y, bot.pos.z);
    visual.rotation.set(0, bot.yaw, 0);
    visual.updateMatrixWorld(true);
    this.deathBox.setFromObject(visual).getCenter(this.deathCenter);
    const pivot = new THREE.Group();
    pivot.position.set(this.deathCenter.x, bot.pos.y + .22, this.deathCenter.z);
    pivot.rotation.y = bot.yaw;
    this.game.scene.add(pivot);
    pivot.attach(visual); // preserva a pose e tomba pelo centro no chão, sem arremessar o corpo de lado
    this.corpses.push({ visual: pivot, startedAt: this.game.time, baseY: pivot.position.y, side });
    while (this.corpses.length > MAX_CORPSES) {
      const antigo = this.corpses.shift();
      liberarPassada(antigo.visual); this.game.scene.remove(antigo.visual);
    }
    this.slots.delete(id);
    bot._boarVisual = null; bot._boarId = null; bot._boarType = null;
    bot.alive = false; bot.hp = 0; bot.respawnAt = Infinity; bot.vel.set(0, 0, 0);
  }

  atualizarCadaveres() {
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const corpse = this.corpses[i];
      selecionarDetalhePassada(corpse.visual.children[0], corpse.visual.position.distanceTo(this.game.player.pos), this.state.mutante);
      const pose = poseMorteJavaporco(this.game.time - corpse.startedAt, corpse.side);
      corpse.visual.rotation.z = pose.tilt;
      corpse.visual.position.y = corpse.baseY - pose.sink;
      if (!corpse.assentado && this.game.time - corpse.startedAt >= .55) {
        this.deathBox.setFromObject(corpse.visual);
        const chao = alturaDoChao(this.game.world, corpse.visual.position.x, corpse.visual.position.z);
        corpse.baseY += chao - this.deathBox.min.y + .015;
        corpse.visual.position.y = corpse.baseY - pose.sink;
        corpse.assentado = true;
      }
      if (!pose.done) continue;
      liberarPassada(corpse.visual);
      this.game.scene.remove(corpse.visual);
      this.corpses.splice(i, 1);
    }
  }

  limparCadaveres() {
    for (const corpse of this.corpses) {
      liberarPassada(corpse.visual);
      this.game.scene.remove(corpse.visual);
    }
    this.corpses.length = 0;
  }

  /* Marca-e-varre contra `state.alive`: com 64 slots, montar um Set por quadro
     era lixo de GC à toa. A marca é um contador, não um objeto. */
  sincronizarSlots() {
    const vivos = this.state.alive;
    const marca = (this.marca = (this.marca || 0) + 1);
    for (let i = 0; i < vivos.length; i++) {
      const bot = this.slots.get(vivos[i].id);
      if (bot && (vivos[i].entityId == null || bot._netId === vivos[i].entityId)) bot._boarMarca = marca;
    }
    for (const bot of this.boars) {
      if (!bot._boarId || bot._boarMarca === marca) continue;
      if (this.game.state === 'live' && this.state.phase === 'combat') this.tombar(bot);
      else this.desativar(bot);
    }
    for (let i = 0; i < vivos.length; i++) if (!this.slots.has(vivos[i].id)) this.assignar(vivos[i]);
  }

  /* Listas reaproveitadas (sem `filter`): são dois arrays por quadro que, com a horda
     cheia, viram pausa de GC — medido no javaporcos-perf. */
  listarJogadores() {
    const lista = this.jogadores;
    lista.length = 0;
    for (const ent of this.game.combatants) if (!ent._objectiveNpc && ent.alive && !this.state.eliminados.includes(ent.team)) lista.push(ent);
    return lista;
  }

  contexto(tempo) {
    const ctx = this.ctx;
    ctx.world = this.game.world; ctx.state = this.state; ctx.jogadores = this.jogadores; ctx.tempo = tempo;
    return ctx;
  }

  update(dt) {
    if (this.game.state !== 'live') return;
    this.orcamentoCampo = 1;
    this.listarJogadores();
    if (!this.game.online || this.game.dedicated) {
      const phase = this.state.phase, winner = this.state.winner, wave = this.state.wave;
      passoHorda(this.state, dt);
      this.tickDominio(this.game.time);
      if (this.state.mutante !== 'sem-derrota') this.state.winner ||= avaliarFimDaInvasao(this.state, this.regras, this.game.combatants, this.game.playerTeam);
      if (this.state.winner) this.state.phase = 'finished';
      this.sincronizarSlots();
      if (phase === 'combat' && this.state.phase !== 'combat') this.emitir('WAVE_CLEARED', { wave });
      if (!winner && this.state.winner) this.emitir('HORDE_FINISHED', { winner: this.state.winner, wave: this.state.wave });
      if (this.state.winner) this.game._endRound(this.state.winner);
    }
    this.propagarManada(this.game.time);
    if (this.state.phase === 'combat' && this.state.wave !== this.ondaAnunciada) {
      this.ondaAnunciada = this.state.wave;
      this.javaporcoSfx('horda', this.game.player?.pos, 1, 110);
    }
    this.game.timeLeft = this.state.phase === 'prep' ? this.state.prepLeft : this.state.combatLeft;
    this.atualizaHud();
  }

  /* Conta bicho e defensor por setor a 4 Hz e avança o domínio; a contagem também é a lotação que espalha a horda. */
  tickDominio(tempo) {
    if (tempo < this.dominioAte || this.state.winner) return;
    const dt = this.dominioEm < 0 ? 0 : tempo - this.dominioEm;
    this.dominioEm = tempo;
    this.dominioAte = tempo + DOMINIO.passo;
    const setores = this.horda.setores, bichos = this.bichosNoSetor, defensores = this.defensoresNoSetor;
    bichos.fill(0); defensores.fill(0);
    this.timeENoSetor.fill(0); this.timeBNoSetor.fill(0);
    for (const bot of this.boars) {
      if (!bot._boarId || !bot.alive) continue;
      const i = setorEm(setores, bot.pos.x, bot.pos.z);
      if (i >= 0) bichos[i]++;
    }
    for (const ent of this.jogadores) {
      const i = setorEm(setores, ent.pos.x, ent.pos.z);
      if (i >= 0) { defensores[i]++; (ent.team === 'B' ? this.timeBNoSetor : this.timeENoSetor)[i]++; }
    }
    passoDominio(this.state, setores, bichos, defensores, dt);
    repartirTerritorio(this.state, setores, this.timeENoSetor, this.timeBNoSetor, bichos, dt, DOMINIO);
  }

  /* Manada: quem está alertado (viu jogador, ouviu tiro ou levou tiro) puxa o vizinho.
     Roda a cada 0,25 s — propagação não precisa de 60 Hz e é O(vivos²). */
  propagarManada(tempo) {
    if (tempo < this.manadaAte) return;
    this.manadaAte = tempo + .25;
    const vivos = this.vivos;
    vivos.length = 0;
    for (const bot of this.boars) if (bot._boarId && bot.alive) vivos.push(bot);
    const raio2 = AGGRO.manada * AGGRO.manada;
    for (let i = 0; i < vivos.length; i++) {
      const lider = vivos[i];
      if ((lider._boarAlertaAte || 0) <= tempo) continue;
      for (let k = 0; k < vivos.length; k++) {
        const vizinho = vivos[k];
        if (vizinho === lider || (vizinho._boarAlertaAte || 0) > tempo) continue;
        const dx = lider.pos.x - vizinho.pos.x, dz = lider.pos.z - vizinho.pos.z;
        if (dx * dx + dz * dz <= raio2) vizinho._boarAlertaAte = tempo + AGGRO.contagio;
      }
    }
  }

  /* Nó do grafo onde o bicho está. Recalcular todo quadro é varredura linear por bicho. */
  noDoBicho(bot, tempo) {
    const world = this.game.world;
    if (!world.nearestWaypoint) return -1;
    if (bot._boarNo >= 0 && tempo < bot._boarNoAte) return bot._boarNo;
    bot._boarNo = world.nearestWaypoint(bot.pos.x, bot.pos.z, bot.pos.y);
    bot._boarNoAte = tempo + .28 + (bot._boarJitter || 0) * .14;
    return bot._boarNo;
  }

  campoDe(alvo) {
    const world = this.game.world;
    const adj = world.waypoints?.adj;
    if (!adj?.length || !world.nearestWaypoint) return null;
    const tempo = this.game.time;
    let campo = this.campos.get(alvo.chave);
    if (!campo) {
      if (this.campos.size >= 32) this.campos.delete(this.campos.keys().next().value);
      campo = { prox: null, destino: -1, validoAte: -1 };
      this.campos.set(alvo.chave, campo);
    }
    /* UM campo refeito por quadro. Com 16 pontos de comida vencendo no mesmo quadro,
       16 buscas em largura de 5 mil nós caíam todas juntas — era o pico do perf. */
    if (tempo >= campo.validoAte && (this.orcamentoCampo > 0 || !campo.prox)) {
      this.orcamentoCampo--;
      const destino = world.nearestWaypoint(alvo.x, alvo.z);
      if (destino !== campo.destino) {
        campo.prox = fluxoAte(adj, destino, campo.prox);
        campo.destino = destino;
      }
      campo.validoAte = tempo + (alvo.kind === 'jogador' ? .45 : 6);
    }
    return campo.prox;
  }

  /* Y do corpo e do visual colados no chão REAL do mapa, todo passo. */
  aterrar(bot) {
    if (this.state.mutante === 'bicho-enterrado') return bot.pos.y;
    const chao = alturaDoChao(this.game.world, bot.pos.x, bot.pos.z, bot.pos.y);
    bot.pos.y = chao;
    if (bot.vel.y < 0) bot.vel.y = 0;
    bot.grounded = true;
    return chao;
  }

  moverPara(bot, alvo, dt) {
    const world = this.game.world;
    const tempo = this.game.time;
    let dx = alvo.x - bot.pos.x, dz = alvo.z - bot.pos.z;
    const reta = Math.hypot(dx, dz);
    const emDash = tempo < (bot._boarDashAte || 0);
    let no = -1, campo = null;
    const fluido = DIRECAO_FLUIDA && this.state.mutante !== 'grade-rigida';
    if (!emDash && reta > 6 && !fluido) {
      no = this.noDoBicho(bot, tempo);
      campo = no >= 0 ? this.campoDe(alvo) : null;
      const proximo = campo && no < campo.length ? campo[no] : -1;
      const node = proximo >= 0 ? world.waypoints.nodes[proximo] : null;
      if (node) {
        const ndx = node.x - bot.pos.x, ndz = node.z - bot.pos.z;
        if (Math.hypot(ndx, ndz) > .35) { dx = ndx; dz = ndz; }
        else bot._boarNoAte = 0;
      }
    }
    /* RUMO: `yaw = atan2(dx,dz)` é a convenção dos bots do jogo (game.js:5890) e é o que
       o focinho +Z do modelo segue; com `az:+1` o _moveEntity anda nessa mesma direção. */
    if (!emDash) this.conferirAvanco(bot, tempo);
    const desvio = !emDash && alvo.kind !== 'jogador' && reta > 2 ? desvioDeCaminhada(tempo, bot._boarJitter || 0, this.state.mutante) : 0;
    if (dx || dz) {
      const rumo = fluido && !emDash ? direcaoDaHorda(this,bot,alvo,tempo,this.state.mutante) : Math.atan2(dx,dz);
      const desejado = rumo + desvio + (tempo < (bot._boarDeslizeAte || 0) ? bot._boarDeslizeLado * DESLIZE_ANGULO : 0);
      bot.yaw = fluido && !emDash ? curvarRumo(bot.yaw,desejado,dt) : desejado;
    }
    const escala = velocidadeDoJavaporco(this.state, bot._boarType) * (emDash ? DASH.impulso : alvo.kind === 'vagar' ? VAGAR_RITMO : 1);
    this.game._moveEntity(bot, this.state.mutante === 'rumo-invertido' ? ENTRADA_RE : ENTRADA_FRENTE, dt * escala);
    this.aterrar(bot);
  }

  /* Quina e muro param o corpo com o rumo certo apontando pra dentro do colisor: andou
     menos de meio metro em 0,45 s = contorna de lado. O lado ESCOLHIDO dura 2,4 s (dá pra
     chegar na ponta de um muro de 12 m); alternar a cada tranco só gingava no lugar. */
  conferirAvanco(bot, tempo) {
    if (tempo < (bot._boarAvancoEm || 0)) return;
    if (bot._boarAvancoEm && this.state.mutante !== 'sem-contorno'
      && Math.hypot(bot.pos.x - bot._boarAvancoX, bot.pos.z - bot._boarAvancoZ) < .55) {
      bot._boarDeslizeLado = tempo < (bot._boarDeslizeAte || 0)
        ? -bot._boarDeslizeLado                                  // o lado escolhido também fechou
        : ((bot._boarJitter || 0) < .5 ? 1 : -1);
      bot._boarDeslizeAte = tempo + DESLIZE;
    }
    bot._boarAvancoEm = tempo + .45;
    bot._boarAvancoX = bot.pos.x;
    bot._boarAvancoZ = bot.pos.z;
  }

  /* Investida do ariete: fecha a distância média num arranco curto e anuncia a carga. */
  investir(bot, alvo, tempo) {
    if (bot._boarType !== 'ariete' || alvo.kind !== 'jogador' || this.state.mutante === 'sem-investida') return false;
    if (tempo < (bot._boarDashLivre || 0)) return false;
    if (alvo.distance < DASH.perto || alvo.distance > DASH.longe) return false;
    bot._boarDashAte = tempo + DASH.duracao;
    bot._boarDashLivre = tempo + DASH.espera;
    this.javaporcoSfx('carga', bot.pos, 1);
    this.emitir('BOAR_DASH', { i: bot._boarId, d: Math.round(alvo.distance * 10) / 10 });
    return true;
  }

  javaporcoSfx(kind, pos, forca = 1, alcance = 46) {
    if (this.game.dedicated || !pos) return false;
    const sfx = this.game.sfx;
    if (!sfx?.javaporco) return false;
    const esp = espacializarJavaporco(this.game.player, pos, alcance);
    if (esp.vol <= 0) return false;
    sfx.javaporco(kind, esp.vol * forca, esp.pan, esp.delay);
    return true;
  }

  /* Rosnado por bicho perto do jogador, com orçamento global: 64 bichos rosnando
     ao mesmo tempo viram ruído branco. Fúria alta rosna mais seguido. */
  rosnar(bot, distancia, tempo) {
    if (distancia > AGGRO.rosnado || tempo < (bot._boarRosnarAte || 0) || tempo < this.rosnadoAte) return;
    const fury = this.state.fury || 0;
    bot._boarRosnarAte = tempo + 2.6 + (bot._boarJitter || 0) * 3.4;
    this.rosnadoAte = tempo + .5 / (1 + fury);
    this.javaporcoSfx(tempo < (bot._boarFocinhoAte || 0) ? 'fucar' : 'rosnado', bot.pos, bot._boarType === 'ariete' ? 1 : .82);
  }

  mordidaLivre(bot, alvo) {
    if (this.state.mutante === 'morde-parede') return true;
    this.mordidaDe.copy(bot.pos); this.mordidaDe.y += .5;
    this.mordidaAte.copy(alvo.pos); this.mordidaAte.y += .9;
    this.mordidaAte.sub(this.mordidaDe);
    const distancia = this.mordidaAte.length();
    if (distancia < 1e-7) return true;
    this.mordidaRay.set(this.mordidaDe, this.mordidaAte.multiplyScalar(1 / distancia));
    this.mordidaRay.far = distancia;
    const world = this.game.world;
    return !(world.rayOccluded ? world.rayOccluded(this.mordidaRay)
      : this.mordidaRay.intersectObjects(world.occluders || [], false).length);
  }

  updateBot(bot, dt) {
    if (bot._objectiveNpc !== 'javaporco') return false;
    if (bot.mesh?.group) bot.mesh.group.visible = false;
    if (!bot._boarId || !bot.alive) return true;
    if (this.game.online && !this.game.dedicated) {
      this.game._mp?.updateRemoteBot(bot, dt, true);
      if (this.game.player?.pos) this.rosnar(bot, bot.pos.distanceTo(this.game.player.pos), this.game.time);
      this.aterrar(bot);
      this.atualizaVisual(bot);
      return true;
    }
    const tempo = this.game.time;
    if ((bot.alertUntil || 0) > tempo) bot._boarAlertaAte = Math.max(bot._boarAlertaAte || 0, tempo + AGGRO.contagio);
    const alvo = escolherAlvo(bot, this.contexto(tempo), bot._boarAlvo ||= {});
    if (alvo.kind !== 'jogador' && this.game.player?.pos) {
      this.rosnar(bot, bot.pos.distanceTo(this.game.player.pos), tempo);
    }
    if (this.arrombar(bot, alvo, tempo)) { this.atualizaVisual(bot); return true; }
    const encostou = this.teimosia(bot, alvo, tempo);
    if (alvo.kind !== 'jogador' && this.state.mutante !== 'sem-desistencia' && this.cansaco(bot, tempo) > PERDIDO) {
      this.sumirNaMata(bot);
      return true;
    }
    if (alvo.kind === 'jogador') {
      if (!bot._boarExplorar && bot._boarPlano && dentroDaCidade(this.game.world, bot.pos.x, bot.pos.z)) bot._boarPasso = bot._boarPlano.length;
      bot._boarAlertaAte = Math.max(bot._boarAlertaAte || 0, tempo + AGGRO.contagio);
      this.rosnar(bot, alvo.distance, tempo);
      if (alvo.distance < AGGRO.ataque && tempo >= bot._boarAttackAt && this.mordidaLivre(bot, alvo.ent)) {
        bot._boarAttackAt = tempo + (bot._boarType === 'ariete' ? 1.5 : 1.05);
        bot._boarGolpeAte = tempo + .42;
        bot.vel.set(0, 0, 0);
        bot.yaw = Math.atan2(alvo.x - bot.pos.x, alvo.z - bot.pos.z);
        bot._boarDashAte = 0;
        this.game._damage(alvo.ent, Math.round(danoDoJavaporco(this.state, bot._boarType, 'jogador')), bot, 'PRESA');
        this.atualizaVisual(bot);
        return true;
      }
      if (tempo < (bot._boarGolpeAte || 0)) bot.vel.set(0,0,0);
      else { this.investir(bot, alvo, tempo); this.moverPara(bot, alvo, dt); }
    } else if (alvo.kind === 'comida' && (alvo.distance < alvo.raio || encostou)) {
      this.revirar(bot, alvo, tempo);
    } else if (alvo.kind === 'rota' && (alvo.distance < alvo.raio || encostou)) {
      if (++bot._boarPasso >= bot._boarPlano.length && bot._boarExplorar) bot._boarExplorarAte = tempo + BECO.explorar;
      this.moverPara(bot, alvo, dt);
    } else {
      this.moverPara(bot, alvo, dt);
    }
    this.atualizaVisual(bot);
    return true;
  }

  /* RETARDATÁRIO PRESO. Geometria de cidade tem quina em que o corpo encaixa e o grafo
     não desencaixa; sem saída, a onda nunca fecha e o jogador caça fantasma. 14 s sem
     encurtar distância pra alvo nenhum e o bicho volta pra mata — sem pontos, sem dano. */
  sumirNaMata(bot) {
    const id = bot._boarId;
    this.emitir('BOAR_LOST', { i: id, x: Math.round(bot.pos.x), z: Math.round(bot.pos.z) });
    registrarAbate(this.state, id, null);
    this.desativar(bot);
  }

  /* TEIMOSIA. O colisor do ponto (e a quina dele) para o corpo ANTES do raio de
     focinhada: sem isto o bando empurrava a pilha pra sempre e a onda não fechava.
     Devolve true quando "encostou o quanto dava"; 3,5 s sem encurtar nada = desiste. */
  teimosia(bot, alvo, tempo) {
    if (alvo.kind === 'jogador' || alvo.kind === 'vazio' || alvo.kind === 'vagar') {
      if (alvo.kind === 'vagar') { bot._boarMelhorEm = tempo; bot._boarCansaco = 0; }
      bot._boarAlvoChave = null;
      return false;
    }
    if (bot._boarAlvoChave !== alvo.chave) {
      /* O cansaço ATRAVESSA a troca de alvo: sem isso o bicho que fica pulando entre dois
         pontos inalcançáveis zerava o relógio toda vez e nunca era dado como perdido. */
      bot._boarCansaco = (bot._boarCansaco || 0) + Math.max(0, tempo - (bot._boarMelhorEm ?? tempo));
      bot._boarAlvoChave = alvo.chave;
      bot._boarMelhor = alvo.distance;
      bot._boarMelhorEm = tempo;
      return false;
    }
    if (alvo.distance < bot._boarMelhor - .35) {
      bot._boarMelhor = alvo.distance;
      bot._boarMelhorEm = tempo;
      bot._boarCansaco = 0;
      bot._boarDeslizeAte = 0;                                   // voltou a encurtar: chega de contornar
      return false;
    }
    const parado = tempo - bot._boarMelhorEm;
    const limite = (alvo.raio || AGGRO.objetivo) + ENCOSTO;
    if (parado > 1.2 && alvo.distance <= limite) return true;
    if (parado <= 3.5 || this.state.mutante === 'sem-desistencia') return false;
    (bot._boarEvitar ||= new Map()).set(alvo.chave, tempo + 20);
    if (alvo.kind === 'rota') bot._boarPasso++;
    bot._boarAlvoChave = null;
    bot._boarNoAte = 0;
    return false;
  }

  /* Quanto tempo o bicho está sem encurtar distância pra NADA. */
  cansaco(bot, tempo) {
    return (bot._boarCansaco || 0) + Math.max(0, tempo - (bot._boarMelhorEm ?? tempo));
  }

  /* Revirar o lixo: o bicho para, focinha e come o ponto até zerar — é o que faz a
     cidade ser invadida de verdade, em vez de todo mundo correr pro objetivo. */
  arrombar(bot, alvo, tempo) {
    const spot = alvo.kind === 'comida' && alvo.spot;
    if (!spot?.porta || comidaRestante(this.state, spot) < spot.hp) return false;
    if (Math.hypot(bot.pos.x - spot.porta.x, bot.pos.z - spot.porta.z) > AGGRO.ataque) return false;
    this.revirar(bot, alvo, tempo);
    return true;
  }

  revirar(bot, alvo, tempo) {
    bot.vel.set(0, 0, 0);
    bot.yaw = Math.atan2(alvo.x - bot.pos.x, alvo.z - bot.pos.z);
    this.aterrar(bot);
    bot._boarFocinhoAte = tempo + .5;
    if (tempo < (bot._boarAttackAt || 0)) return;
    bot._boarAttackAt = tempo + .55;
    const damage = danoDoJavaporco(this.state, bot._boarType, 'comida');
    const antes = comidaRestante(this.state, alvo.spot);
    const restante = atacarComida(this.state, alvo.spot, damage);
    this.saquearLoja(alvo.spot, antes - restante);
    this.marcarComida(alvo.spot, restante);
    this.rosnar(bot, Math.hypot((this.game.player?.pos?.x ?? 0) - bot.pos.x, (this.game.player?.pos?.z ?? 0) - bot.pos.z), tempo);
    this.emitir('FOOD_HIT', { i: bot._boarId, food: alvo.spot.id, hp: Math.round(restante) });
  }

  // Saquear todas as lojas de um setor equivale a conquistá-lo; o defensor pode retomá-lo.
  saquearLoja(spot, gasto) {
    if (!spot.loja || !(gasto > 0)) return;
    const setores = this.horda.setores, i = setorEm(setores, spot.x, spot.z);
    if (i < 0) return;
    const lojas = this.game.world.foodSpots.filter(s => s.loja && setorEm(setores, s.x, s.z) === i).length;
    this.state.controle[i] = Math.min(1, this.state.controle[i] + gasto / spot.hp / lojas);
  }

  marcarComida(spot, restante) {
    const cheio = Number(spot.hp) || COMIDA_HP[spot.kind] || 120;
    const gasto = Math.max(0, Math.min(1, 1 - restante / cheio));
    const mesh = this.game.world.foodMesh?.(spot.id);
    if (mesh?.getObjectByName('inteiro') && mesh.getObjectByName('revirado')) {
      mesh.getObjectByName('inteiro').visible = gasto === 0;
      mesh.getObjectByName('revirado').visible = gasto > 0;
      const oclusores = this.game.world.occluders;
      for (const [estado, malhas] of Object.entries(mesh.userData.foodOccluders || {})) {
        const ativo = estado === (gasto > 0 ? 'revirado' : 'inteiro');
        for (const malha of malhas) {
          const i = oclusores.indexOf(malha);
          if (ativo && i < 0) oclusores.push(malha);
          else if (!ativo && i >= 0) oclusores.splice(i, 1);
        }
      }
    }
    if (mesh && !mesh.getObjectByName('inteiro')) {
      mesh.rotation.z = gasto * .9;
      mesh.position.y = (mesh.userData.foodY ??= mesh.position.y) - gasto * .18;
    }
    const colisor = this.game.world.foodCollider?.(spot.id);
    if (!colisor) return;
    const topo = (colisor.foodMaxY ??= colisor.maxY);
    colisor.maxY = Math.max(colisor.minY + .15, topo - gasto * (topo - colisor.minY - .15));
  }

  atualizaVisual(bot) {
    const visual = bot._boarVisual;
    if (!visual) return;
    const tempo = this.game.time;
    visual.visible = bot.alive;
    visual.position.copy(bot.pos);
    selecionarDetalhePassada(visual, bot.pos.distanceTo(this.game.player.pos), this.state.mutante);
    const sombra = bot.pos.distanceToSquared(this.game.player.pos) < 24 * 24;
    if (visual.userData.sombra !== sombra) {
      visual.userData.sombra = sombra;
      visual.traverse(node=>{if(node.isMesh)node.castShadow=sombra;});
    }
    visual.rotation.y = bot.yaw;
    const golpe = this.state.mutante !== 'sem-ataque' ? Math.max(0, (bot._boarGolpeAte || 0) - tempo) / .42 : 0;
    const fucar = tempo < (bot._boarFocinhoAte || 0);
    visual.rotation.x = golpe ? -Math.sin(golpe * Math.PI) * .28 : 0;
    visual.rotation.z = fucar ? Math.sin(tempo * 7 + (bot._boarJitter || 0)) * .025 : 0;
    for (const rig of visual.userData.passada?.rigs || []) {
      rig.head.rotation.x = golpe ? Math.sin(golpe * Math.PI) * -.4 : fucar ? .3 + Math.sin(tempo * 12) * .18 : 0;
      rig.head.rotation.y = fucar ? Math.sin(tempo * 6) * .16 : 0;
    }
    const corpo = bot._boarCorpo ||= {x:bot.pos.x,z:bot.pos.z,tempo,ritmo:0,fase:0};
    const delta = Math.max(0,tempo-corpo.tempo), distancia = Math.hypot(bot.pos.x-corpo.x,bot.pos.z-corpo.z);
    const andando = delta>0 && distancia/delta>.08 && distancia<2;
    corpo.ritmo += ((andando?1:0)-corpo.ritmo)*Math.min(1,delta*12);
    corpo.fase += distancia*8;corpo.x=bot.pos.x;corpo.z=bot.pos.z;corpo.tempo=tempo;
    if(this.state.mutante!=='corpo-rigido'&&visual.userData.passada?.rigs.length&&!fucar&&!golpe){
      visual.position.y += Math.sin(corpo.fase*2)*.018*corpo.ritmo;
      visual.rotation.x += Math.sin(corpo.fase*2)*.025*corpo.ritmo;
      visual.rotation.z += Math.sin(corpo.fase)*.035*corpo.ritmo;
      for(const rig of visual.userData.passada?.rigs||[])rig.head.rotation.y=Math.sin(corpo.fase*.5)*.06*corpo.ritmo;
    }
    atualizarPassada(visual, bot.pos, this.game.world, tempo, this.state.mutante);
  }

  onDamage(ent, damage, attacker) {
    if (!ent?._boarId || (this.game.online && !this.game.dedicated)) return;
    const attackerId = this.idDo(attacker);
    registrarDano(this.state, ent._boarId, attackerId, damage);
    const animal = this.state.alive.find((item) => item.id === ent._boarId);
    if (animal) animal.hp = Math.max(0, ent.hp - damage);
    ent._boarAlertaAte = Math.max(ent._boarAlertaAte || 0, this.game.time + AGGRO.contagio);
    this.emitir('BOAR_HIT', { i: ent._boarId, a: attackerId, damage: Math.round(damage), hp: Math.round(animal?.hp || 0) });
  }

  onKill(ent, attacker) {
    if (!ent?._boarId) {
      if (ent && !ent._objectiveNpc && attacker && attacker.team !== ent.team) this.state.teamKills[attacker.team] = (this.state.teamKills[attacker.team] || 0) + 1;
      return;
    }
    const animalId = ent._boarId;
    const animalType = ent._boarType;
    if (this.state.mutante !== 'morte-muda') this.javaporcoSfx('morte', ent.pos, animalType === 'ariete' ? 1 : .9);
    this.tombar(ent, attacker);
    if (this.game.online && !this.game.dedicated) return;
    const attackerId = this.idDo(attacker);
    registrarAbate(this.state, animalId, attackerId);
    if (attacker && !attacker._objectiveNpc) this.state.teamKills[attacker.team] = (this.state.teamKills[attacker.team] || 0) + 1;
    this.emitir('BOAR_KILLED', { i: animalId, a: attackerId, type: animalType, wave: this.state.wave });
    ent.respawnAt = Infinity;
  }

  /* 8 Hz: o texto do HUD é concatenação e `map/join`, e a 60 Hz isso é lixo de GC
     por um número que o olho não lê mais rápido que isso. */
  atualizaHud(forcar = false) {
    if (!this.hud) return;
    if (this.game.el.hud?.dataset) {
      this.game.el.hud.dataset.objective = 'horde';
      this.game.el.hud.dataset.humanTeams = this.regras.times === 3 ? '2' : '1';
    }
    if (!forcar && this.game.time < this.hudAte) return;
    this.hudAte = this.game.time + .12;
    const phase = this.state.phase === 'prep' ? `PRÓXIMA ONDA EM ${Math.ceil(this.state.prepLeft)}s` : `PRÓXIMA ONDA EM ${Math.ceil(this.state.combatLeft)}s · ${this.state.remaining + this.state.alive.length} RESTANTES`;
    const score = this.state.scores[this.idDo(this.game.player)]?.points || 0;
    const comida = (this.game.world.foodSpots || []).length;
    const lixo = comida ? ` · LIXO ${this.state.foodRevirada}/${comida}` : '';
    this.hudTexto.textContent = `ONDA ${Math.max(1, this.state.wave)} · ${phase} · ${this.state.alive.length} NA RUA · FÚRIA ${Math.round((this.state.fury || 0) * 100)}%${lixo} · ${score} PTS`;
    if (this.state.waitingForPlayers) this.hudTexto.textContent = `AGUARDANDO DEFENSORES · ${this.state.players || 0}/${this.state.minPlayers || 4} PARA COMEÇAR · MÁXIMO 8`;
    if (this.state.mutante === 'mapa-mudo') return;
    const dominio = Math.round((this.state.dominio || 0) * 100);
    const tomados = this.state.controle.filter((v) => v >= 1).length;
    const territorio = this.state.territorio;
    if (this.placarJ) {
      this.placarJNum.textContent = this.state.teamKills.J || 0;
      this.placarJ.setAttribute('aria-label',`Javaporcos: ${this.state.teamKills.J || 0} abates, ${dominio}% do mapa`);
    }
    this.hudDominio.textContent = this.regras.times === 3 ? `E ${Math.round(territorio.E * 100)}% / ${this.state.teamKills.E} ABATES · B ${Math.round(territorio.B * 100)}% / ${this.state.teamKills.B} ABATES · JAVAPORCOS ${dominio}% / ${this.state.teamKills.J} ABATES` : `DOMÍNIO DA HORDA ${dominio}% · ${this.state.teamKills.J} ABATES`;
    this.hudSetores.textContent = `${tomados}/${this.state.controle.length} SETORES TOMADOS · LIMPE PARA RETOMAR`;
    this.hudBarra.style.width = `${Math.min(100, dominio)}%`;
    this.hudCelulas.forEach((cel, i) => {
      const v = this.state.controle[i] || 0;
      if (this.regras.times === 3) {
        const e = Math.round((this.state.defesaE[i] || 0) * 100), b = e + Math.round((this.state.defesaB[i] || 0) * 100), j = b + Math.round(v * 100);
        const assinatura = `${e}/${b}/${j}`;
        if (cel._disputa !== assinatura) cel.style.background = `linear-gradient(90deg,#e0762a 0% ${e}%,#8258d8 ${e}% ${b}%,#c42b18 ${b}% ${j}%,#5d6b4a ${j}% 100%)`;
        cel._disputa = assinatura;
        return;
      }
      const nivel = v >= 1 ? 10 : Math.floor(v * 9);
      if (cel._nivel === nivel) return;
      cel._nivel = nivel;
      cel.style.background = v >= 1 ? '#c42b18' : nivel ? `rgba(214,120,40,${(.3 + v * .6).toFixed(2)})` : '#5d6b4a';
    });
    this.hudBecos.forEach((el, i) => { el.style.opacity = this.horda.becos[i].abreNaOnda <= this.state.wave ? '1' : '0'; });
    const p = this.game.player?.pos;
    if (p) { this.hudJogador.style.left = this.hudPx(p.x); this.hudJogador.style.top = this.hudPz(p.z); }
  }

  roundIntro() {
    return 'MANTENHA SEU TIME VIVO · DISPUTE O BAIRRO E CACE OS JAVAPORCOS';
  }

  safeSpawn(team, entity = null) {
    if (entity && !entity.isPlayer && !entity._remote) return null;
    const refugios = this.game.world.hordeRefuges?.filter(r=>r.team === team);
    if (!refugios?.length) return null;
    const contagem = this.spawnSeguro ||= {};
    const refugio = refugios[(contagem[team] || 0) % refugios.length];
    contagem[team] = (contagem[team] || 0) + 1;
    const deslocamento = ((contagem[team]-1) % 3 - 1) * 1.2;
    return {x:refugio.x+deslocamento,z:refugio.z,yaw:team === 'E' ? -Math.PI / 2 : Math.PI / 2};
  }

  roundResult(winner) {
    return {
      duration: winner === 'J' ? 6 : 10,
      title: winner === 'draw' ? 'DISPUTA EMPATADA' : winner === 'J' ? 'JAVAPORCOS VENCERAM' : `${this.game._teamName(winner)} VENCEU`,
      detail: `${this.state.kills} javaporcos abatidos · ${Math.round((this.state.dominio || 0) * 100)}% ocupado pela horda`,
    };
  }
  renderScoreboard() {
    if (!this.game.el?.sbCols) return;
    const heading = document.querySelector('#scoreboard h3');
    if (heading) heading.textContent = `DEFESA DA CIDADE · ${this.state.kills} ABATES · ${Math.round(this.state.dominio * 100)}% OCUPADO POR JAVAPORCOS`;
    if (this.regras.times === 3) {
      const escape = name => String(name).replace(/[<>&"']/g, '');
      this.game.el.sbCols.innerHTML = ['E', 'B', 'J'].map(team => {
        const nome = this.game._teamName(team), dominio = Math.round((this.state.territorio[team] || 0) * 100);
        const pessoas = this.game.combatants.filter(ent => ent.team === team && !ent._objectiveNpc);
        const linhas = pessoas.map(ent => `<tr><td>${escape(ent.name)}</td><td>${ent.kills || 0}</td><td>${ent.deaths || 0}</td></tr>`).join('');
        const imagem = team === 'J' ? '<img class="horde-avatar" src="/img/javaporco-card.webp" alt="Javaporco">' : '';
        const status = this.state.eliminados.includes(team) ? 'ELIMINADO' : `${dominio}% DO MAPA`;
        return `<section class="sb-col horde-team"><h4>${imagem}${nome}</h4><p>${status} · ${this.state.teamKills[team] || 0} ABATES</p><table><thead><tr><th>PARTICIPANTE</th><th>ABATES</th><th>MORTES</th></tr></thead><tbody>${linhas || `<tr><td>Horda · ${this.state.alive.length} vivos</td><td>${this.state.teamKills.J || 0}</td><td>${this.state.kills}</td></tr>`}</tbody></table></section>`;
      }).join('');
      return;
    }
    const row = (name, points, kills, assists, combo, prevented, className = '') =>
      `<span class="horde-name ${className}">${String(name).replace(/[<>&]/g, '')}</span><span class="horde-points ${className}">${points}</span><span class="${className}">${kills}</span><span class="${className}">${assists}</span><span class="${className}">${combo}</span><span class="${className}">${prevented}</span>`;
    const names = new Map(this.game.combatants.filter(ent => ent.team === 'E' && !ent._objectiveNpc).map(ent => [this.idDo(ent), ent.name]));
    const scores = { ...Object.fromEntries([...names.keys()].map(id => [id, { points: 0, kills: 0, assists: 0, bestCombo: 0, damagePrevented: 0 }])), ...this.state.scores };
    const rows = Object.entries(scores)
      .sort(([, a], [, b]) => b.points - a.points)
      .map(([id, score]) => row(names.get(id) || id, score.points, score.kills, score.assists, `${score.bestCombo}×`, Math.round(score.damagePrevented || 0)))
      .join('');
    const header = row('DEFESA DA CIDADE', 'PTS', 'ABT.', 'ASSIST.', 'COMBO', 'EVITADO', 'horde-head');
    const empty = row('Equipe', 0, 0, 0, '0×', 0);
    this.game.el.sbCols.innerHTML = `<div class="horde-score">${header}${rows || empty}${row('Bônus coletivo', this.state.teamBonus, '—', '—', '—', '—', 'horde-bonus')}</div><section class="sb-col horde-team horde-enemy"><h4><img class="horde-avatar" src="/img/javaporco-card.webp" alt="Javaporco">Javaporcos</h4><p>${this.state.teamKills.J || 0} ABATES DE DEFENSORES · ${this.state.kills} JAVAPORCOS ABATIDOS</p></section>`;
  }


  startCinematic(winner) {
    this.cinematic = { winner, startedAt: this.game.time, duration: winner === 'J' ? 6 : 10 };
    this.scoreShown = false;
    if (this.game.vmScene) this.game.vmScene.visible = false;
    if (this.cinemaTitle) {
      this.cinemaTitle.textContent = this.roundResult(winner).title;
      this.cinemaTitle.style.whiteSpace = 'pre-line';
      this.cinemaTitle.style.opacity = '1';
    }
    this.audioNodes = marchaRural(this.game.sfx, this.state.mutante);
  }

  updatePresentation() {
    if (this.game.online && !this.game.dedicated && this.state.mutante !== 'hud-rede-congelado') this.atualizaHud();
    this.atualizarCadaveres();
    if (!this.cinematic || this.game.dedicated) return;
    const t = Math.min(1, (this.game.time - this.cinematic.startedAt) / this.cinematic.duration);
    const win = this.cinematic.winner === this.game.player.team;
    const a = win ? { x: 0, y: 5, z: -51 } : { x: 0, y: 4, z: -44 };
    const b = win ? { x: 24, y: 25, z: 48 } : { x: 0, y: 8, z: -60 };
    const smooth = t * t * (3 - 2 * t);
    this.game.camera.position.set(a.x + (b.x - a.x) * smooth, a.y + (b.y - a.y) * smooth, a.z + (b.z - a.z) * smooth);
    this.game.camera.lookAt(win ? 0 : 0, win ? 1 : 0, win ? 30 : -54);
    if (this.cinemaTitle) this.cinemaTitle.style.opacity = String(Math.max(0, 1 - Math.max(0, t - .55) / .25));
    if (t >= .82 && !this.scoreShown) {
      this.scoreShown = true;
      this.game._showScoreboard(true);
      this.renderScoreboard();
    }
  }

  netState() {
    const snap = snapshotHorda(this.state);
    for (const animal of snap.alive) {
      const bot = this.slots.get(animal.id), id = bot?._nid ?? bot?._netId;
      if (id != null) animal.entityId = id;
      const golpe=Math.max(0,Math.round(((bot?._boarGolpeAte || 0)-this.game.time)*1000));
      const focinho=Math.max(0,Math.round(((bot?._boarFocinhoAte || 0)-this.game.time)*1000));
      if(golpe || focinho) animal.acao=[Math.min(420,golpe),Math.min(500,focinho)];
    }
    return snap;
  }

  applyNetState(net) {
    if (!net || (!this.game.online || this.game.dedicated)) return;
    this.state.wave = net.wave;
    this.state.clock = net.clock || 0;
    this.state.waitingForPlayers = net.waitingForPlayers === true;
    this.state.players = net.players || 0;
    this.state.minPlayers = net.minPlayers || 4;
    this.state.defesaE = [...(net.defesaE || (net.controle || this.state.controle).map(()=>0))];
    this.state.defesaB = [...(net.defesaB || (net.controle || this.state.controle).map(()=>0))];
    this.state.teamKills = { ...net.teamKills };
    this.state.territorio = { ...net.territorio };
    this.state.eliminados = [...(net.eliminados || [])];
    this.state.seed = net.seed;
    this.state.phase = net.phase;
    this.state.prepLeft = net.prepLeft;
    this.state.combatLeft = net.combatLeft;
    this.state.remaining = net.remaining;
    this.state.fury = net.fury || 0;
    this.state.kills = net.kills || 0;
    if (Array.isArray(net.controle)) this.state.controle = [...net.controle];
    this.state.dominio = net.dominio || 0;
    this.state.foodHp = { ...(net.foodHealth || {}) };
    this.state.foodRevirada = Object.values(this.state.foodHp).filter(hp => hp <= 0).length;
    for (const spot of this.game.world.foodSpots || []) this.marcarComida(spot, comidaRestante(this.state, spot));
    this.state.scores = structuredClone(net.scoreByPlayer || {});
    this.state.teamBonus = net.teamBonus || 0;
    this.state.winner = net.winner || null;
    this.state.alive = (net.alive || []).map((animal) => ({ ...animal, damage: {} }));
    this.sincronizarSlots();
    for(const animal of this.state.alive) {
      const bot=this.slots.get(animal.id);if(!bot) continue;
      bot._boarGolpeAte=this.game.time+Math.min(.42,Math.max(0,Number(animal.acao?.[0])||0)/1000);
      bot._boarFocinhoAte=this.game.time+Math.min(.5,Math.max(0,Number(animal.acao?.[1])||0)/1000);
    }
  }

  dispose() {
    if (this.game.el?.hud) { delete this.game.el.hud.dataset.objective; delete this.game.el.hud.dataset.humanTeams; }
    this.placarJ?.remove();
    if (this.placarHumanoB) this.placarHumanoB.style.display = this.placarBDisplay;
    if (this._key) window.removeEventListener('keydown', this._key);
    this.hud?.remove();
    this.cinemaTitle?.remove();
    for (const bot of this.boars) this.desativar(bot);
    this.limparCadaveres();
    for (const node of this.audioNodes) { try { node.stop(); } catch {} }
  }
}

export function criarInvasaoJavaporcos(game) {
  return new InvasaoJavaporcos(game);
}
