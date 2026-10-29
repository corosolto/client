import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from './data/asseturl.js';

export const WAVE_COUNTS = Object.freeze([8, 12, 16, 20, 24, 28, 31, 34]);
export const BOAR_POINTS = Object.freeze({ jovem: 100, adulto: 180, matriarca: 300, ariete: 500 });
const DEFAULT_MAX_ALIVE = 24;
const PREP_SECONDS = 12;
const COMBAT_SECONDS = 35;

function tipoDaOnda(wave, ordinal, total) {
  if (wave === 8 && ordinal === total - 1) return 'ariete';
  if (wave >= 5 && ordinal % 9 === 8) return 'matriarca';
  if (wave >= 2 && ordinal % 3 === 2) return 'adulto';
  return 'jovem';
}

function scoreDe(state, playerId) {
  return state.scores[playerId] ||= { points: 0, kills: 0, assists: 0, combo: 0, bestCombo: 0, damagePrevented: 0, lastKillAt: -Infinity };
}

export function criarHorda({ seed = 1, maxAlive = DEFAULT_MAX_ALIVE } = {}) {
  return {
    seed: seed >>> 0,
    maxAlive: Math.max(1, Math.min(DEFAULT_MAX_ALIVE, maxAlive | 0)),
    wave: 0,
    phase: 'prep',
    prepLeft: PREP_SECONDS,
    combatLeft: COMBAT_SECONDS,
    remaining: 0,
    spawnOrdinal: 0,
    spawnClock: 0,
    clock: 0,
    alive: [],
    objectives: [1000, 1000, 1000],
    scores: {},
    teamBonus: 0,
    winner: null,
  };
}

export function iniciarOnda(state) {
  if (state.winner || state.wave >= WAVE_COUNTS.length) return false;
  state.wave++;
  state.phase = 'combat';
  state.combatLeft = COMBAT_SECONDS;
  state.prepLeft = 0;
  state.remaining = WAVE_COUNTS[state.wave - 1];
  state.spawnOrdinal = 0;
  state.spawnClock = 0;
  state.alive.length = 0;
  return true;
}

function spawnAnimal(state) {
  const ordinal = state.spawnOrdinal++;
  const total = WAVE_COUNTS[state.wave - 1];
  const type = tipoDaOnda(state.wave, ordinal, total);
  state.alive.push({
    id: `${state.seed.toString(36)}-${state.wave}-${ordinal}`,
    type,
    entrance: (state.seed + state.wave + ordinal) % 4,
    hp: type === 'ariete' ? 900 : type === 'matriarca' ? 430 : type === 'adulto' ? 250 : 140,
    damage: {},
  });
  state.remaining--;
}

function ondaLimpa(state) {
  if (state.remaining || state.alive.length) return;
  state.teamBonus += 500 * state.objectives.filter((hp) => hp > 0).length;
  if (state.wave === WAVE_COUNTS.length) {
    state.teamBonus += state.objectives.reduce((total, hp) => total + hp, 0) + Math.ceil(state.combatLeft) * 10;
    state.phase = 'finished';
    state.winner = 'E';
  } else {
    state.phase = 'prep';
    state.prepLeft = PREP_SECONDS;
  }
}

export function passoHorda(state, dt) {
  if (state.winner) return state;
  state.clock += dt;
  if (state.phase === 'prep') {
    state.prepLeft = Math.max(0, state.prepLeft - dt);
    if (!state.prepLeft) iniciarOnda(state);
    return state;
  }
  if (state.phase !== 'combat') return state;
  state.combatLeft = Math.max(0, state.combatLeft - dt);
  state.spawnClock += dt;
  while (state.remaining > 0 && state.alive.length < state.maxAlive && state.spawnClock >= 0.18) {
    state.spawnClock -= 0.18;
    spawnAnimal(state);
  }
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

export function atingirObjetivo(state, objectiveIndex, damage) {
  if (state.winner || objectiveIndex < 0 || objectiveIndex >= state.objectives.length || damage <= 0) return false;
  state.objectives[objectiveIndex] = Math.max(0, state.objectives[objectiveIndex] - damage);
  if (state.objectives.every((hp) => hp === 0)) {
    state.phase = 'finished';
    state.winner = 'B';
    state.alive.length = 0;
    state.remaining = 0;
  }
  return true;
}

export function snapshotHorda(state) {
  return {
    wave: state.wave,
    seed: state.seed,
    phase: state.phase,
    prepLeft: Number(state.prepLeft.toFixed(3)),
    combatLeft: Number(state.combatLeft.toFixed(3)),
    remaining: state.remaining,
    aliveIds: state.alive.map((animal) => animal.id),
    alive: state.alive.map(({ id, type, entrance, hp }) => ({ id, type, entrance, hp })),
    objectiveHealth: [...state.objectives],
    scoreByPlayer: structuredClone(state.scores),
    teamBonus: state.teamBonus,
    winner: state.winner,
  };
}

const MODEL_PATHS = Object.freeze({
  jovem: '/models/enemies/javaporcos/javali_jovem.glb',
  adulto: '/models/enemies/javaporcos/javaporco_adulto.glb',
  matriarca: '/models/enemies/javaporcos/matriarca_javali.glb',
  ariete: '/models/enemies/javaporcos/ariete_javali.glb',
});
const MODEL_HEIGHTS = Object.freeze({ jovem: 1.05, adulto: 1.3, matriarca: 1.58, ariete: 1.82 });
const MODEL_SPEEDS = Object.freeze({ jovem: 1.08, adulto: 1, matriarca: .88, ariete: .8 });
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
      modelTemplates.set(type, gltf.scene);
      resolve();
    }, undefined, () => resolve());
  })));
  return preloadPromise;
}

function fallbackAnimal(type) {
  const group = new THREE.Group();
  const color = type === 'ariete' ? 0x33251e : type === 'matriarca' ? 0x5a3828 : type === 'adulto' ? 0x704833 : 0x895b3f;
  const material = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.72, 10, 7), material);
  body.scale.set(1.35, .72, .78); body.position.y = .68; body.castShadow = true; group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.4, 9, 6), material);
  head.position.set(0, .65, .82); head.scale.set(.82, .76, 1.05); head.castShadow = true; group.add(head);
  for (const x of [-.42, .42]) for (const z of [-.38, .38]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.09, .12, .55, 6), material);
    leg.position.set(x, .28, z); leg.castShadow = true; group.add(leg);
  }
  return group;
}

function visualAnimal(type) {
  const template = modelTemplates.get(type);
  if (!template) return fallbackAnimal(type);
  const visual = template.clone(true);
  const box = new THREE.Box3().setFromObject(visual);
  const height = Math.max(.01, box.max.y - box.min.y);
  const scale = MODEL_HEIGHTS[type] / height;
  visual.scale.setScalar(scale);
  visual.position.y = -box.min.y * scale;
  return visual;
}

function marchaRural(sfx) {
  const ctx = sfx?.ctx;
  if (!ctx) return [];
  const start = ctx.currentTime + .03;
  const nodes = [];
  for (let beat = 0; beat < 48; beat++) {
    const at = start + beat * .42;
    const drum = ctx.createOscillator(), gain = ctx.createGain();
    drum.type = 'triangle'; drum.frequency.setValueAtTime(beat % 4 === 0 ? 105 : 150, at);
    gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(.055, at + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, at + .13); drum.connect(gain).connect(ctx.destination);
    drum.start(at); drum.stop(at + .15); nodes.push(drum);
    if (beat % 2 === 0) {
      const viola = ctx.createOscillator(), vg = ctx.createGain();
      viola.type = 'sawtooth'; viola.frequency.setValueAtTime([196, 220, 247, 220][(beat / 2) % 4], at);
      vg.gain.setValueAtTime(.0001, at); vg.gain.exponentialRampToValueAtTime(.018, at + .08);
      vg.gain.exponentialRampToValueAtTime(.0001, at + .34); viola.connect(vg).connect(ctx.destination);
      viola.start(at); viola.stop(at + .38); nodes.push(viola);
    }
  }
  return nodes;
}
function preencherSlotsDaHorda(game, boars) {
  const template = boars[0];
  if (!template) return;
  while (boars.length < DEFAULT_MAX_ALIVE) {
    const group = new THREE.Group();
    group.visible = false;
    game.scene.add(group);
    const bot = {
      isPlayer: false,
      name: `[HORDA] Reserva ${boars.length + 1}`,
      def: template.def,
      team: 'B',
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


class InvasaoJavaporcos {
  constructor(game) {
    this.game = game;
    this.boars = game.combatants.filter((ent) => !ent.isPlayer && ent.team === 'B');
    preencherSlotsDaHorda(game, this.boars);
    this.slots = new Map();
    this.state = criarHorda({ seed: game.matchSeed || game.seed || 1, maxAlive: Math.max(1, this.boars.length) });
    this.cinematic = null;
    this.audioNodes = [];
    this.scoreShown = false;
    for (const bot of this.boars) {
      bot.vel ||= new THREE.Vector3();
      bot._objectiveNpc = 'javaporco';
      bot.respawnAt = Infinity;
      bot.alive = false;
      bot.hp = 0;
      if (bot.mesh?.group) bot.mesh.group.visible = false;
    }
    if (!game.dedicated && typeof document !== 'undefined') {
      this.hud = document.createElement('div');
      this.hud.id = 'horde-objective';
      this.hud.style.cssText = 'position:fixed;left:50%;top:5.7rem;transform:translateX(-50%);z-index:12;min-width:360px;padding:.58rem .9rem;background:#1a120bdd;border:1px solid #d6a03a;color:#fff;font:700 13px/1.35 system-ui;text-align:center;letter-spacing:.035em;pointer-events:none';
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
  emitir(k, data = {}) {
    this.game._objectiveEvent?.({ k, ...data });
  }


  prepareRound() {
    this.state = criarHorda({ seed: this.game.matchSeed || this.game.seed || 1, maxAlive: Math.max(1, this.boars.length) });
    this.game.timeLeft = WAVE_COUNTS.length * (PREP_SECONDS + COMBAT_SECONDS);
    this.cinematic = null;
    this.scoreShown = false;
    if (this.game.vmScene) this.game.vmScene.visible = true;
    if (this.cinemaTitle) this.cinemaTitle.style.opacity = '0';
    for (const bot of this.boars) this.desativar(bot);
    this.atualizaHud();
  }

  idDo(ent) {
    return ent?._playerId || ent?.id || ent?.name || null;
  }

  assignar(animal) {
    const bot = this.boars.find((item) => !item._boarId);
    if (!bot) return;
    const entrance = this.game.world.boarEntrances[animal.entrance];
    bot._boarId = animal.id;
    bot._boarType = animal.type;
    bot._objectiveNpc = 'javaporco';
    bot.name = `[ONDA ${this.state.wave}] ${animal.type.toUpperCase()}`;
    bot.weapon = 'knife'; bot.primary = 'knife';
    bot.hp = animal.hp; bot.alive = true; bot.respawnAt = Infinity; bot.deadT = 0;
    bot.pos.set(entrance.x, this.game.world.groundHeightAt(entrance.x, entrance.z), entrance.z);
    bot.vel.set(0, 0, 0); bot.yaw = Math.PI; bot._boarNextPath = 0; bot._boarAttackAt = 0;
    bot._boarVisual = visualAnimal(animal.type);
    this.game.scene.add(bot._boarVisual);
    this.slots.set(animal.id, bot);
    this.emitir('BOAR_SPAWN', { i: animal.id, type: animal.type, entrance: animal.entrance, wave: this.state.wave });
  }

  desativar(bot) {
    if (bot._boarVisual) {
      this.game.scene.remove(bot._boarVisual);
    }
    if (bot.mesh?.group) bot.mesh.group.visible = false;
    if (bot._boarId) this.slots.delete(bot._boarId);
    bot._boarVisual = null; bot._boarId = null; bot._boarType = null;
    bot.alive = false; bot.hp = 0; bot.respawnAt = Infinity; bot.vel.set(0, 0, 0);
  }

  sincronizarSlots() {
    const aliveIds = new Set(this.state.alive.map((animal) => animal.id));
    for (const bot of this.boars) if (bot._boarId && !aliveIds.has(bot._boarId)) this.desativar(bot);
    for (const animal of this.state.alive) if (!this.slots.has(animal.id)) this.assignar(animal);
  }

  update(dt) {
    if (this.game.state !== 'live') return;
    if (!this.game.online || this.game.dedicated) {
      const phase = this.state.phase, winner = this.state.winner, wave = this.state.wave;
      passoHorda(this.state, dt);
      this.sincronizarSlots();
      if (phase === 'combat' && this.state.phase !== 'combat') this.emitir('WAVE_CLEARED', { wave });
      if (!winner && this.state.winner) this.emitir('HORDE_FINISHED', { winner: this.state.winner, wave: this.state.wave });
      if (this.state.winner) this.game._endRound(this.state.winner);
    }
    this.game.timeLeft = this.state.phase === 'prep' ? this.state.prepLeft : this.state.combatLeft;
    this.atualizaHud();
  }

  alvoDo(bot) {
    const jogadores = this.game.combatants.filter((ent) => ent.team === 'E' && ent.alive);
    let nearest = null, distance = Infinity;
    for (const ent of jogadores) {
      const d = Math.hypot(ent.pos.x - bot.pos.x, ent.pos.z - bot.pos.z);
      if (d < distance) { nearest = ent; distance = d; }
    }
    if (nearest && distance < 7) return { x: nearest.pos.x, z: nearest.pos.z, ent: nearest, distance };
    const objectives = this.game.world.hordeObjectives.filter((_, index) => this.state.objectives[index] > 0);
    let objectiveIndex = 0;
    for (let i = 1; i < objectives.length; i++) {
      if (Math.hypot(objectives[i].x - bot.pos.x, objectives[i].z - bot.pos.z) < Math.hypot(objectives[objectiveIndex].x - bot.pos.x, objectives[objectiveIndex].z - bot.pos.z)) objectiveIndex = i;
    }
    const target = objectives[objectiveIndex] || this.game.world.hordeObjectives[2];
    const originalIndex = this.game.world.hordeObjectives.indexOf(target);
    return { x: target.x, z: target.z, objectiveIndex: originalIndex, distance: Math.hypot(target.x - bot.pos.x, target.z - bot.pos.z) };
  }

  updateBot(bot, dt) {
    if (bot._objectiveNpc !== 'javaporco') return false;
    if (bot.mesh?.group) bot.mesh.group.visible = false;
    if (!bot._boarId || !bot.alive) return true;
    if (this.game.online && !this.game.dedicated) {
      this.atualizaVisual(bot);
      return true;
    }
    const target = this.alvoDo(bot);
    if (target.ent && target.distance < 1.7 && this.game.time >= bot._boarAttackAt) {
      bot._boarAttackAt = this.game.time + (bot._boarType === 'ariete' ? 1.5 : 1.05);
      this.game._damage(target.ent, bot._boarType === 'ariete' ? 42 : bot._boarType === 'matriarca' ? 30 : 18, bot, 'PRESA');
    } else if (target.objectiveIndex >= 0 && target.distance < 2.4) {
      const damage = bot._boarType === 'ariete' ? 260 : bot._boarType === 'matriarca' ? 170 : 105;
      atingirObjetivo(this.state, target.objectiveIndex, damage);
      this.emitir('OBJECTIVE_HIT', { i: bot._boarId, objective: target.objectiveIndex, damage, hp: this.state.objectives[target.objectiveIndex] });
      registrarAbate(this.state, bot._boarId, null);
      this.desativar(bot);
      return true;
    } else {
      if (this.game.time >= (bot._boarNextPath || 0)) {
        const from = this.game.world.nearestWaypoint(bot.pos.x, bot.pos.z);
        const to = this.game.world.nearestWaypoint(target.x, target.z);
        bot._boarPath = this.game.world.findPath(from, to);
        bot._boarPathIndex = 1;
        bot._boarNextPath = this.game.time + .7;
      }
      const nodeIndex = bot._boarPath?.[bot._boarPathIndex] ?? this.game.world.nearestWaypoint(target.x, target.z);
      const node = this.game.world.waypoints.nodes[nodeIndex] || target;
      if (Math.hypot(node.x - bot.pos.x, node.z - bot.pos.z) < 1.1) bot._boarPathIndex++;
      const dx = node.x - bot.pos.x, dz = node.z - bot.pos.z;
      bot.yaw = Math.atan2(-dx, dz);
      this.game._moveEntity(bot, { ax: 0, az: -1, shift: false, crouch: false, jump: false }, dt * MODEL_SPEEDS[bot._boarType]);
    }
    this.atualizaVisual(bot);
    return true;
  }

  atualizaVisual(bot) {
    if (!bot._boarVisual) return;
    bot._boarVisual.visible = bot.alive;
    bot._boarVisual.position.x = bot.pos.x;
    bot._boarVisual.position.y = bot.pos.y + Math.sin(this.state.clock * 9 + bot.pos.x) * .025;
    bot._boarVisual.position.z = bot.pos.z;
    bot._boarVisual.rotation.y = bot.yaw;
  }

  onDamage(ent, damage, attacker) {
    if (!ent?._boarId || (this.game.online && !this.game.dedicated)) return;
    const attackerId = this.idDo(attacker);
    registrarDano(this.state, ent._boarId, attackerId, damage);
    const animal = this.state.alive.find((item) => item.id === ent._boarId);
    if (animal) animal.hp = Math.max(0, ent.hp - damage);
    this.emitir('BOAR_HIT', { i: ent._boarId, a: attackerId, damage: Math.round(damage), hp: Math.round(animal?.hp || 0) });
  }

  onKill(ent, attacker) {
    if (!ent?._boarId || (this.game.online && !this.game.dedicated)) return;
    const attackerId = this.idDo(attacker);
    registrarAbate(this.state, ent._boarId, attackerId);
    this.emitir('BOAR_KILLED', { i: ent._boarId, a: attackerId, type: ent._boarType, wave: this.state.wave });
    ent.respawnAt = Infinity;
  }

  atualizaHud() {
    if (!this.hud) return;
    const phase = this.state.phase === 'prep' ? `PREPARAÇÃO ${Math.ceil(this.state.prepLeft)}s` : `${this.state.remaining + this.state.alive.length} RESTANTES`;
    const hp = this.state.objectives.map((value) => Math.ceil(value / 10)).join('% · ');
    const score = this.state.scores[this.idDo(this.game.player)]?.points || 0;
    this.hud.textContent = `INVASÃO DOS JAVAPORCOS · ONDA ${Math.max(1, this.state.wave)}/8 · ${phase} · OBJETIVOS ${hp}% · ${score} PTS`;
  }

  roundIntro() {
    return 'DEFENDA O BAIRRO · OITO ONDAS';
  }

  roundResult(winner) {
    return {
      duration: winner === 'E' ? 10 : 6,
      title: winner === 'E' ? 'LORDE DO TERROR ABATIDO' : 'O BAIRRO CAIU',
      detail: winner === 'E' ? `${this.state.teamBonus} pontos de objetivos intactos` : 'os três objetivos foram destruídos',
    };
  }
  renderScoreboard() {
    if (!this.game.el?.sbCols) return;
    const row = (name, points, kills, assists, combo, prevented, className = '') =>
      `<span class="horde-name ${className}">${String(name).replace(/[<>&]/g, '')}</span><span class="horde-points ${className}">${points}</span><span class="${className}">${kills}</span><span class="${className}">${assists}</span><span class="${className}">${combo}</span><span class="${className}">${prevented}</span>`;
    const rows = Object.entries(this.state.scores)
      .sort(([, a], [, b]) => b.points - a.points)
      .map(([id, score]) => row(id, score.points, score.kills, score.assists, `${score.bestCombo}×`, Math.round(score.damagePrevented || 0)))
      .join('');
    const header = row('DEFESA DA CIDADE', 'PTS', 'ABT.', 'ASSIST.', 'COMBO', 'EVITADO', 'horde-head');
    const empty = row('Equipe', 0, 0, 0, '0×', 0);
    this.game.el.sbCols.innerHTML = `<div class="horde-score">${header}${rows || empty}${row('Bônus coletivo', this.state.teamBonus, '—', '—', '—', '—', 'horde-bonus')}</div>`;
  }


  startCinematic(winner) {
    this.cinematic = { winner, startedAt: this.game.time, duration: winner === 'E' ? 10 : 6 };
    this.scoreShown = false;
    if (this.game.vmScene) this.game.vmScene.visible = false;
    if (this.cinemaTitle) {
      this.cinemaTitle.textContent = winner === 'E' ? 'LORDE DO TERROR\nABATIDO' : 'O BAIRRO CAIU';
      this.cinemaTitle.style.whiteSpace = 'pre-line';
      this.cinemaTitle.style.opacity = '1';
    }
    this.audioNodes = marchaRural(this.game.sfx);
  }

  updatePresentation() {
    if (!this.cinematic || this.game.dedicated) return;
    const t = Math.min(1, (this.game.time - this.cinematic.startedAt) / this.cinematic.duration);
    const win = this.cinematic.winner === 'E';
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
    return snapshotHorda(this.state);
  }

  applyNetState(net) {
    if (!net || (!this.game.online || this.game.dedicated)) return;
    this.state.wave = net.wave;
    this.state.seed = net.seed;
    this.state.phase = net.phase;
    this.state.prepLeft = net.prepLeft;
    this.state.combatLeft = net.combatLeft;
    this.state.remaining = net.remaining;
    this.state.objectives = [...net.objectiveHealth];
    this.state.scores = structuredClone(net.scoreByPlayer || {});
    this.state.teamBonus = net.teamBonus || 0;
    this.state.winner = net.winner || null;
    this.state.alive = (net.alive || []).map((animal) => ({ ...animal, damage: {} }));
    this.sincronizarSlots();
  }

  dispose() {
    if (this._key) window.removeEventListener('keydown', this._key);
    this.hud?.remove();
    this.cinemaTitle?.remove();
    for (const bot of this.boars) this.desativar(bot);
    for (const node of this.audioNodes) { try { node.stop(); } catch {} }
  }
}

export function criarInvasaoJavaporcos(game) {
  return new InvasaoJavaporcos(game);
}
