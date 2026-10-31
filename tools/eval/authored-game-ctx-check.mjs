#!/usr/bin/env node
/* Probe do caminho real Game → AuthoredViewModels.update, em processo isolado.
   Aceitação por propriedade física (deslocamento, fase, lifecycle) — sem regex.
   `--mutante=<nome>` / `--mutantes`: mesma aceitação sobre game.js mutado em
   memória (data: URL); mutação que não aplica lança, nunca passa batida. */
process.env.SIM_QS = '?vmauthored=1&vmready=deagle,revolver&vmweapon=deagle,revolver38';
const { bootGame, initTextures, seedRandom, renderer, sfx, CHARACTERS, PCHAR, THREE } = await import('./harness.mjs');
const { makeNetcode } = await import('../../public/js/netgame.js');

const SEED = 44031;
const DT = 1 / 60;

function construirGame(criar) {
  const { log, info } = console;
  console.log = console.info = (...args) => console.error(...args);
  try { return criar(); }
  finally { console.log = log; console.info = info; }
}

// Entrada sintética (mesma forma do fixture do locomotion-check): em node o GLB da
// família não carrega; callers, runtime e update exercitados são os reais do produto.
function entradaSintetica(vm, key, comUtility = false) {
  const mount = new THREE.Group(), bone = new THREE.Bone();
  bone.name = 'hand';
  mount.add(bone);
  mount.visible = false;
  const clip = (name, end) => new THREE.AnimationClip(name, 0.2, [
    new THREE.VectorKeyframeTrack('hand.position', [0, 0.2], [end, 0, 0, end, 0, 0]),
  ]);
  const entry = { key, family: comUtility ? 'grenade' : 'deagle', weapon: key, mount, scene: mount, bone,
    mixer: new THREE.AnimationMixer(mount),
    clips: new Map([['idle', clip('Idle', comUtility ? -1 : 2)],
      ...(comUtility ? ['throw_start', 'throw_loop', 'throw_end'].map((n) => [n, clip(n, 8)]) : [])]),
    queue: [], serial: 0, frame: { x: 0.05, y: -0.02, z: -0.28, rotDeg: [0, 0, 0] },
    drawTime: 1, drawDuration: 0.32, state: 'idle', stateUntil: 0, shootCycle: 0,
    utilityModels: comUtility ? new Map([['he', new THREE.Group()]]) : new Map() };
  entry.mixer.addEventListener('finished', (event) => {
    if (event.action === entry.action) vm._continue(entry);
  });
  return entry;
}


// Boot do game.js MUTADO: mesmos stubs do harness, módulo vindo de data: URL.
async function bootMutado(fonte) {
  const { Game } = await import(`data:text/javascript;base64,${Buffer.from(fonte).toString('base64')}`);
  seedRandom(SEED);
  const def = CHARACTERS.find((c) => c.id === PCHAR) || CHARACTERS[0];
  const g = construirGame(() => new Game({
    renderer, textures: initTextures(), sfx, settings: { bots: 0, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: def.id, playerTeam: 'E', playerFaction: def.team, enemyFaction: 'B',
    nickname: 'SIM', mapId: 'ferro_velho', ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
  }));
  g._ensureDolly = () => {};
  g.killsToWin = Infinity;
  g.start ? g.start() : g._startRound();
  g.scene.updateMatrixWorld(true);
  g.world.root.updateMatrixWorld(true);
  return g;
}

function aceitacao(g) {
  const checks = [];
  const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail: String(detail) });
  const p = g.player;
  g.state = 'live';
  const authored = g.vm.authored;
  if (!authored) throw new Error('AuthoredViewModels não foi criado');
  const calls = [];
  const original = authored.update.bind(authored);
  authored.update = (dt, ctx) => { calls.push({ dt, ...ctx }); return original(dt, ctx); };
  // Teclas SEMPRE substituídas: cenário não herda teclas do anterior.
  const step = (keys) => { g.keys = { ...keys }; g._updatePlayer(DT); };
  const run = (keys, frames = 12) => { for (let i = 0; i < frames; i += 1) step(keys); };
  const reposiciona = (x, z, yaw = 0) => {
    const s = g._freeSpot(x, z, 0.5);
    p.pos.set(s.x, g.world.groundHeightAt(s.x, s.z, p.pos.y + 2), s.z);
    p.vel.set(0, 0, 0); p.yaw = yaw; p.pitch = 0;
  };

  const spawn = g.world.spawns.E[0];
  // 1 · livre W rumo ao centro do mapa: velocidade efetiva positiva, no chão, marcha ativa.
  reposiciona(spawn.x, spawn.z, 0);
  run({ KeyW: true }, 90);
  const livre = calls.at(-1);
  check('livre-w-efetivo', livre.speed > 3 && livre.moving === true && livre.grounded === true,
    `speed=${livre.speed && livre.speed.toFixed(3)} moving=${livre.moving} grounded=${livre.grounded}`);
  const maxSp = g._maxSp || 6.6;
  const speedW = livre.speed;

  // 2 · fase FINITA, IGUAL ao contador do player e AVANÇADA com o movimento.
  check('fase-finita-e-igual', Number.isFinite(livre.stepPhase) && livre.stepPhase === p.stepPhase && p.stepPhase > 1,
    `ctx.stepPhase=${livre.stepPhase} p.stepPhase=${p.stepPhase} — fase desconectada do contador do Game`);
  const antes = p.stepPhase;
  run({ KeyW: true }, 5);
  const avan = calls.at(-1).stepPhase - antes;
  run({ KeyW: false }, 45);
  const parado = calls.at(-1);
  const paradoFase = parado.stepPhase;
  run({}, 5);
  check('fase-avanca-com-movimento', avan > 0 && calls.at(-1).stepPhase === paradoFase,
    `Δfase andando=${avan.toFixed(4)} Δfase parado=${(calls.at(-1).stepPhase - paradoFase).toFixed(4)} — fase não avança com o passo/avança parado`);
  check('parado-moving-false', parado.moving === false && parado.speed < 0.6,
    `speed=${parado.speed && parado.speed.toFixed(3)} moving=${parado.moving}`);

  // 3 · W+D simultâneo com yaw 45°: wish resultante = -Z puro na pista livre do
  reposiciona(spawn.x, spawn.z, Math.PI / 4);
  run({ KeyW: true, KeyD: true }, 60);
  const diag = calls.at(-1);
  check('diagonal-normalizada', Math.abs(diag.speed - speedW) <= 0.15 * speedW && diag.moving === true,
    `diag=${diag.speed.toFixed(3)} livre=${speedW.toFixed(3)} (tol 15%) — W+D soma eixos em vez de normalizar`);

  // 3b · NORMALIZAÇÃO CAUSAL no 1º frame, partindo de v=0 (antes do clamp de
  // maxSp saturar): W puro e W+D ganham a MESMA aceleração — sem normalizar, √2.
  {
    const arranque = (keys) => {
      reposiciona(spawn.x, spawn.z, 0);
      p.vel.set(0, 0, 0);
      step(keys);
      return Math.hypot(p.vel.x, p.vel.z);
    };
    const vW = arranque({ KeyW: true });
    const vWD = arranque({ KeyW: true, KeyD: true });
    check('diagonal-normalizada-inicial', vW > 0.1 && Math.abs(vWD - vW) <= 0.05 * vW,
      `1º frame W=${vW.toFixed(4)} W+D=${vWD.toFixed(4)} razão=${(vWD / vW).toFixed(3)} — diagonal acelera além do unitário antes da saturação (sem normalização)`);
  }

  reposiciona(spawn.x, spawn.z, 0);
  run({ KeyW: true, ShiftLeft: true }, 60);
  const reduz = calls.at(-1);
  check('velocidade-reduzida', reduz.moving === true && reduz.speed < 0.8 * speedW,
    `shift=${reduz.speed.toFixed(3)} livre=${speedW.toFixed(3)} — andar não reduz a velocidade`);

  // 5 · BOUNDS BLOQUEADO: encostado no limite, segurar D → deslocamento 0 ⇒ speed 0/moving false.
  const B = g.world.bounds, R = 0.38;
  const bordaX = B.maxX - R;
  reposiciona(bordaX, p.pos.z, 0);
  p.pos.x = bordaX;
  const xParede = p.pos.x;
  run({ KeyD: true }, 45);
  const bloqueado = calls.at(-1);
  const dxParede = Math.abs(p.pos.x - xParede);
  check('bounds-bloqueado-speed0', dxParede < 1e-6 && bloqueado.speed < 0.6 && bloqueado.moving === false,
    `deslocX=${dxParede.toExponential(2)} speed=${bloqueado.speed.toFixed(3)} moving=${bloqueado.moving} — corpo preso no limite alimentando o gait`);

  // 6 · SLIDE PARCIAL: yaw 45° contra o mesmo limite → desliza em Z, speed entre 0 e o topo.
  reposiciona(bordaX, p.pos.z, Math.PI / 4);
  p.pos.x = bordaX;
  const z0 = p.pos.z;
  run({ KeyD: true }, 45);
  const slide = calls.at(-1);
  check('slide-parcial', Math.abs(p.pos.z - z0) > 1 && slide.speed > 0.6 && slide.moving === true && slide.speed < 0.95 * maxSp,
    `|dz|=${Math.abs(p.pos.z - z0).toFixed(3)} speed=${slide.speed.toFixed(3)} maxSp=${maxSp.toFixed(3)} — encostado não desliza/no deslize speed ignora colisão`);

  // 7 · AR: pulo mantém speed finito e desliga marcha (grounded false).
  reposiciona(p.pos.x, p.pos.z, 0);
  step({ KeyW: true, Space: true });
  run({ KeyW: true }, 20);
  const ar = calls.at(-1);
  check('ar-sem-marcha', ar.grounded === false && ar.moving === false && Number.isFinite(ar.speed),
    `grounded=${ar.grounded} moving=${ar.moving} speed=${ar.speed && ar.speed.toFixed(3)}`);
  run({}, 90);

  // 8 · MANTLE: entrada real (_beginMantle) ⇒ speed 0, sem marcha.
  g._beginMantle(p, { x: p.pos.x + 0.6, y: p.pos.y + 0.6, z: p.pos.z });
  step({});
  const mantle = calls.at(-1);
  check('mantle-speed0', mantle.speed === 0 && mantle.moving === false,
    `speed=${mantle.speed} moving=${mantle.moving} — mantle deslocando XZ virou gait`);

  // 9 · TELEPORTE do chamador (reconciliação) não vira marcha: medição é interna
  // à física; o salto em si acontece fora de _moveEntity, para ponto andável real.
  run({}, 90);
  const antesTel = calls.length;
  const destino = g._freeSpot(p.pos.x - 6, p.pos.z, 0.5);
  p.pos.set(destino.x, g.world.groundHeightAt(destino.x, destino.z, p.pos.y + 2), destino.z);
  run({}, 1);
  const tel = calls.at(-1);
  check('teleporte-nao-contamina', calls.length === antesTel + 1 && tel.speed < 0.6 && tel.moving === false,
    `speed=${tel.speed.toFixed(3)} moving=${tel.moving} — teleporte do chamador entrou como velocidade`);

  // 10 · MORTE pelo caller real: nenhum update autorado morto; envelope zerado.
  reposiciona(spawn.x, spawn.z, 0);
  run({ KeyW: true }, 90);
  const envVivo = authored._gaitEnv;
  const antesMorte = calls.length;
  g._kill(p, null, 'AWP', false);
  run({}, 30);
  check('morte-sem-update', calls.length === antesMorte, `+${calls.length - antesMorte} updates autorados com o jogador morto`);
  check('morte-reset-envelope', authored._gaitEnv === 0 && envVivo > 0.5,
    `envVivo=${envVivo} envMorto=${authored._gaitEnv} — morte não zerou o envelope da locomotion`);

  // 11 · RESPAWN pelo caller real (_respawnPlayer→_voltarPraBase): fase e envelope zerados.
  g._respawnPlayer();
  check('respawn-fase-zero', p.stepPhase === 0 && authored._gaitEnv === 0,
    `p.stepPhase=${p.stepPhase} env=${authored._gaitEnv}`);
  run({}, 1);
  const nasce = calls.at(-1);
  check('respawn-primeiro-frame-parado', nasce.moving === false && nasce.speed < 0.6 && nasce.stepPhase === p.stepPhase,
    `speed=${nasce.speed.toFixed(3)} moving=${nasce.moving} stepPhase=${nasce.stepPhase}`);

  // 11b · REVIVE sem _kill (caller real netgame.playerRespawned → _voltarPraBase):
  // porte + arremesso pendente da vida anterior morrem na volta à base — callback
  // antigo descartado, estado limpo, arma reapresentada (P2-1 da crítica R6).
  {
    authored.setWeapon(p.weapon);   // arma atual do player no controller (node não carrega GLB)
    const chaveArma = authored._keyFor(p.weapon);
    const armaSint = entradaSintetica(authored, chaveArma);
    const gren = entradaSintetica(authored, 'grenade', true);
    authored.entries.set(chaveArma, armaSint);
    authored.entries.set('grenade', gren);
    authored._idle(armaSint); authored._idle(gren);
    reposiciona(spawn.x, spawn.z, 0);
    p.alive = true; p.hp = 100; p.frags = 2; p.nade = 'frag';
    p.nadeBusyUntil = 0; p._nextNade = 0;
    if (!authored.holdUtility('frag')) throw new Error('holdUtility falhou com entrada sintética');
    let lancouAntigo = 0;
    const spawnReal = g._spawnGrenade;
    g._spawnGrenade = () => { lancouAntigo += 1; };   // o callback REAL chama aqui; só contamos
    try {
      g._throwNade('frag', 'frags', 1);
      if (!authored.utility) throw new Error('arremesso não ficou pendente');
      p.alive = false;   // morte por snapshot do servidor: SEM _kill/_abortarArmaNaMorte
      const nc = makeNetcode(g, { meta: {}, startPing() {}, onSlot: null, onPersonagem: null, yourEnt: null });
      try { nc.playerRespawned(); } finally { nc.dispose(); }
      p.alive = true;
      run({}, 120);   // 2 s: o arremesso antigo teria passado do releaseAt (0,61 s)
      check('revive-descarta-utility', authored.utility === null && authored.held === null && p.nade === null,
        `utility=${authored.utility ? 'ativo' : 'null'} held=${authored.held ? authored.held.kind : 'null'} p.nade=${p.nade} — revive do netgame herdou granada/arremesso da vida anterior`);
      check('revive-callback-antigo-nao-chamado', lancouAntigo === 0,
        `callback da vida anterior disparou ${lancouAntigo}× após o revive`);
      const armaPos = authored.entry(p.weapon);
      check('revive-arma-reapresentada', Boolean(armaPos?.mount?.visible),
        `mount da arma (${p.weapon}) invisível após o revive — visibilidade não recomposta antes do draw`);
    } finally {
      g._spawnGrenade = spawnReal;
    }
  }

  // 12 · ROUND pelo caller real (_resetPositions): sobrevivente recolocado não herda gait.
  reposiciona(spawn.x, spawn.z, 0);
  run({ KeyW: true }, 90);
  const envRound = authored._gaitEnv;
  g._resetPositions();
  check('round-reset-locomotion', envRound > 0.5 && authored._gaitEnv === 0 && p.stepPhase === 0,
    `envAntes=${envRound} envDepois=${authored._gaitEnv} stepPhase=${p.stepPhase}`);
  run({}, 1);
  const round1 = calls.at(-1);
  check('round-primeiro-frame-parado', round1.moving === false && round1.speed < 0.6,
    `speed=${round1.speed.toFixed(3)} moving=${round1.moving}`);

  return { ok: checks.every((c) => c.ok), checks, calls: calls.length };
}

const MUTACOES = [
  ['fase-desconectada', 'stepPhase: p.stepPhase,', 'stepPhase: 0,'],
  ['vel-pre-colisao', 'const effectiveSp = Math.min(maxSp, dt > 0 ? Math.hypot(p.pos.x - px0, p.pos.z - pz0) / dt : 0);', 'const effectiveSp = Math.hypot(p.vel.x, p.vel.z);'],
  ['reset-morte-fora', 'this.vm.rig?.reset?.();\n    this.vm.authored?.resetLocomotion?.();\n    this._applyVmVisibility();', 'this.vm.rig?.reset?.();\n    this._applyVmVisibility();'],
  ['reset-round-fora', 'this.vm.rig.reset();\n    this.vm.authored?.resetLocomotion?.();', 'this.vm.rig.reset();'],
  ['diagonal-sem-normalizar', 'const il = Math.hypot(ix, iz) || 1; ix /= il; iz /= il;', 'const il = Math.hypot(ix, iz) || 1;'],
  ['revive-limpeza-fora', 'p.nade = null; p.nadeBusyUntil = 0; p._nextNade = 0;\n    this.vm.authored?.abortUtility?.();', 'p.nade = null;'],
];

const alvo = process.argv.find((a) => a.startsWith('--mutante='));
if (alvo || process.argv.includes('--mutantes')) {
  const { readFile } = await import('node:fs/promises');
  const url = new URL('../../public/js/game.js', import.meta.url);
  const source = await readFile(url, 'utf8');
  const mutar = async (nome, antes, depois) => {
    if (source.split(antes).length !== 2) throw new Error(`MUTAÇÃO NÃO APLICOU: ${nome}`);
    const fonte = source.replace(antes, depois)
      .replace(/from '([^']+)'/g, (_, spec) => `from '${spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)}'`);
    const g = await bootMutado(fonte);
    const r = aceitacao(g);
    return { name: nome, detected: !r.ok, failed: r.checks.filter((c) => !c.ok).map((c) => c.name) };
  };
  let resultado;
  if (alvo) {
    const nome = alvo.slice('--mutante='.length);
    const m = MUTACOES.find(([n]) => n === nome);
    if (!m) throw new Error(`mutante desconhecido: ${nome}`);
    resultado = await mutar(...m);
    if (!resultado.detected) process.exitCode = 1;   // mutante sobreviveu: RED do gate
  } else {
    const mutations = [];
    for (const m of MUTACOES) mutations.push(await mutar(...m));
    resultado = { mutations };
    if (mutations.some((m) => !m.detected)) process.exitCode = 1;
  }
  console.log(JSON.stringify(resultado, null, 2));
} else {
  const g = construirGame(() => bootGame('ferro_velho', { textures: initTextures(), bots: 0, seed: SEED }));
  const result = aceitacao(g);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
