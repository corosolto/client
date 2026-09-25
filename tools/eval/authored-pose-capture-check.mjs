// 2026-09-05: a série fire amostrava só o mixer e congelava o recuo procedural.
// Mede o capturador, não anatomia/GLB; a aprovação visual continua no browser 3:2.
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as THREE from '../../public/vendor/three.module.js';
import { VmRecoil } from '../../public/js/vmrecoil.js';

const MODULE = new URL('./lib/authored-pose-capture.mjs', import.meta.url);
const FRACTIONS = [0, 0.25, 0.5, 0.999];
const WEAPON = 'pistol';
const FIRE_DURATION = 0.8;
const DRAW_DURATION = 0.72;
const RELOAD_DURATION = 1.2;
// Precisão numérica: AnimationMixer usa Float32 nas keyframes, sem teto estético.
const EPSILON = 1e-7;

function near(actual, expected, contract) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= EPSILON,
    `${contract}: esperado ${expected}, medido ${actual}; preserve o tempo completo da série`);
}

function makeRecoil() {
  const track = () => ({ duration: 0.8, values: [0, 1, 0] });
  const curve = () => ({ x: track(), y: track(), z: track() });
  const recoil = new VmRecoil();
  recoil.setFamily({ pistol: {
    playRate: 2, pitch: [-2, -2], yaw: [1, 1, 1, 1], roll: [1, 1, 1, 1],
    kickRight: [0.01, 0.01], kickUp: [0.02, 0.02], kickback: [-0.03, -0.03],
    smoothRot: [0, 0, 0], smoothLoc: [0, 0, 0], aimRot: [1, 1, 1], aimLoc: [1, 1, 1],
    hipPivotOffset: [0, 0, 0], aimPivotOffset: [0, 0, 0],
    curves: { semiRot: curve(), autoRot: curve(), semiLoc: curve(), autoLoc: curve() },
  } }, 'pistol');
  return recoil;
}

function fixture({ clipFire = false, stateDuration = FIRE_DURATION } = {}) {
  const marker = new THREE.Object3D();
  const mixer = new THREE.AnimationMixer(marker);
  const clip = (name, duration, end) => new THREE.AnimationClip(name, duration, [
    new THREE.NumberKeyframeTrack('.position[x]', [0, duration], [0, end]),
  ]);
  const clips = new Map([
    ['idle', clip('idle', 8, 0.5)], ['shoot', clip('shoot', 1.6, 1)],
    ['reload_tactical', clip('reload_tactical', 2.4, 1)],
  ]);
  const entry = {
    family: 'pistol', golden: false, mixer, clips, mount: new THREE.Group(),
    frame: { x: 0.1, y: -0.1, z: -0.22, drawDrop: 0.34 },
    action: null, state: 'idle', stateUntil: 0, queue: [],
    drawTime: DRAW_DURATION, drawDuration: DRAW_DURATION,
  };
  const updates = [];
  const vm = {
    _time: 10, weapon: WEAPON, recoil: makeRecoil(), adsAmount: 0,
    entry: (weapon = WEAPON) => weapon === WEAPON ? entry : null,
    update(dt) {
      updates.push(dt);
      const step = Math.min(0.05, Math.max(0, Number(dt) || 0));
      this._time += step;
      entry.drawTime = Math.min(entry.drawDuration, entry.drawTime + step);
      entry.mixer.update(step);
      const out = this.recoil.update(step, 0);
      entry.mount.position.set(entry.frame.x + out.px,
        entry.frame.y - entry.frame.drawDrop * (1 - entry.drawTime / entry.drawDuration) + out.py,
        entry.frame.z + out.pz);
      entry.mount.rotation.set(out.rx, out.ry, out.rz);
    },
  };
  function play(name, rate = 1) {
    mixer.stopAllAction();
    const action = mixer.clipAction(clips.get(name));
    action.reset().setEffectiveWeight(1).setEffectiveTimeScale(rate).setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    action.paused = name === 'idle';
    entry.action = action;
    mixer.update(0);
  }
  function requireRestoredUpdate() {
    const before = updates.length;
    vm.update(0);
    assert.equal(updates.length, before + 1,
      'APC2: iniciar ação deixou vm.update congelado; restaure o controlador antes do gatilho');
  }
  const game = {
    time: 100, mouseDown0: false,
    player: { weapon: WEAPON, ammo: { [WEAPON]: { mag: 7, reserve: 48 } },
      reloadUntil: 0, nextShotAt: 0, drawUntil: 0 },
    _tryShoot() {
      requireRestoredUpdate();
      assert.equal(this.mouseDown0, true, 'fire precisa atravessar o gatilho do jogo');
      this.player.ammo[WEAPON].mag -= 1;
      vm.recoil.shoot(vm._time);
      entry.state = clipFire ? 'fire' : 'shoot1';
      entry.stateUntil = stateDuration ? vm._time + stateDuration : 0;
      play(clipFire ? 'shoot' : 'idle', clipFire ? 2 : 1);
    },
    _switchWeapon(weapon) {
      requireRestoredUpdate();
      this.player.weapon = weapon;
      entry.state = 'draw';
      entry.stateUntil = vm._time + entry.drawDuration;
      entry.drawTime = 0;
      this.player.drawUntil = this.time + entry.drawDuration;
      play('idle');
    },
    _startReload() {
      requireRestoredUpdate();
      this.player.reloadUntil = this.time + RELOAD_DURATION;
      entry.state = 'reload';
      play('reload_tactical', 2);
    },
  };
  play('idle');
  vm.update(0);
  return { vm, entry, game, marker, updates, window: { __game: game, __authoredVm: vm } };
}

// O browser serializa a função: executar essa mesma forma detecta closures acidentais.
function pageFunction(fn) {
  assert.equal(typeof fn, 'function', 'helper ausente: não é possível medir o capturador');
  return new Function('window', 'argument', `return (${fn.toString()})(argument);`);
}

function snapshot(f) {
  return { time: f.vm._time, recoilTime: f.vm.recoil.t, mixerTime: f.entry.mixer.time,
    actionTime: f.entry.action.time, drawTime: f.entry.drawTime,
    position: f.entry.mount.position.toArray(), rotation: f.entry.mount.rotation.toArray() };
}

function frozen(f, label) {
  const before = snapshot(f);
  f.vm.update(0.025);
  f.vm.update(0.025);
  assert.deepEqual(snapshot(f), before, `${label}: a pose deriva enquanto screenshot espera RAF`);
}

function runSuite(module) {
  const start = pageFunction(module.startAuthoredAction);
  const sample = pageFunction(module.sampleAuthoredPose);
  const finish = pageFunction(module.finishAuthoredAction);
  const cases = [];
  function check(id, run) {
    try { cases.push({ id, ok: true, ...run() }); }
    catch (error) { cases.push({ id, ok: false, error: error.message }); }
  }
  function begin(f, kind) {
    const result = start(f.window, { kind, weapon: WEAPON });
    frozen(f, `${kind}/start`);
    return result;
  }
  function at(f, kind, fraction) {
    const result = sample(f.window, { kind, fraction, weapon: WEAPON });
    frozen(f, `${kind}/${fraction}`);
    return result;
  }

  check('APC1 fire procedural conserva dt e aplica VmRecoil real', () => {
    const f = fixture();
    begin(f, 'fire');
    const baseTime = f.vm._time;
    const oracle = makeRecoil();
    oracle.shoot(baseTime);
    let previous = 0;
    let peak = 0;
    for (const fraction of FRACTIONS) {
      const elapsed = FIRE_DURATION * fraction;
      const result = at(f, 'fire', fraction);
      near(result.sampleDuration, FIRE_DURATION, 'APC1 duração não é a duração do idle');
      near(result.sampleElapsed, elapsed, 'APC1 metadado de tempo');
      near(f.vm._time - baseTime, elapsed, 'APC1 controlador perde dt no clamp de 0.05');
      near(f.vm.recoil.t, elapsed * f.vm.recoil.params.playRate, 'APC1 relógio do recoil');
      const expected = oracle.update(elapsed - previous);
      for (const [axis, key] of [['x', 'rx'], ['y', 'ry'], ['z', 'rz']]) {
        near(f.entry.mount.rotation[axis], expected[key], `APC1 mount.rotation.${axis}`);
      }
      for (const [axis, key] of [['x', 'px'], ['y', 'py'], ['z', 'pz']]) {
        near(f.entry.mount.position[axis], f.entry.frame[axis] + expected[key], `APC1 mount.position.${axis}`);
      }
      peak = Math.max(peak, Math.abs(f.entry.mount.rotation.x));
      previous = elapsed;
    }
    assert.ok(peak > 0, 'APC1: curva de fixture não chegou ao mount; fotos continuam iguais');
    assert.ok(f.updates.every((dt) => dt <= 0.05), 'APC1: subdivida dt antes do clamp do controlador');
    return { samples: FRACTIONS.length, elapsed: f.vm._time - baseTime, peakPitch: peak };
  });

  check('APC2 nova série restaura update e reinicia sua origem temporal', () => {
    const f = fixture();
    begin(f, 'fire');
    at(f, 'fire', 0.5);
    begin(f, 'fire');
    const baseTime = f.vm._time;
    const zero = at(f, 'fire', 0);
    near(zero.sampleElapsed, 0, 'APC2 origem da segunda série');
    near(f.vm.recoil.t, 0, 'APC2 tiro novo reinicia recoil');
    const quarter = at(f, 'fire', 0.25);
    near(quarter.sampleElapsed, FIRE_DURATION * 0.25, 'APC2 tempo não acumula da série anterior');
    near(f.vm._time - baseTime, FIRE_DURATION * 0.25, 'APC2 update original voltou a avançar');
    assert.equal(f.game.player.ammo[WEAPON].mag, 5, 'APC2: cada série deve passar pelo tiro real');
    return { series: 2, secondElapsed: f.vm._time - baseTime };
  });

  check('APC3 draw procedural evolui mount com idle subjacente', () => {
    const f = fixture();
    begin(f, 'draw');
    const positions = [];
    for (const fraction of [0, 0.5, 0.999]) {
      const result = at(f, 'draw', fraction);
      assert.equal(f.entry.action.getClip().name, 'idle');
      near(result.sampleDuration, DRAW_DURATION, 'APC3 duração do draw, não do idle');
      near(f.entry.drawTime, DRAW_DURATION * fraction, 'APC3 drawTime');
      near(f.entry.mount.position.y, f.entry.frame.y - f.entry.frame.drawDrop * (1 - fraction),
        'APC3 mount deve receber drawTime');
      positions.push(f.entry.mount.position.y);
    }
    assert.ok(positions[0] < positions[1] && positions[1] < positions[2],
      'APC3: três frações diferentes produziram draw estacionado');
    return { samples: positions.length, mountY: positions };
  });

  check('APC4 clipe de tiro conserva timeScale e pose assada', () => {
    const f = fixture({ clipFire: true });
    begin(f, 'fire');
    for (const fraction of FRACTIONS) {
      const result = at(f, 'fire', fraction);
      near(result.sampleDuration, 1.6 / 2, 'APC4 duração efetiva do clipe');
      near(f.entry.action.timeScale, 2, 'APC4 timeScale');
      near(f.entry.action.time, 1.6 * fraction, 'APC4 tempo do clipe');
      near(f.marker.position.x, fraction, 'APC4 keyframe real no AnimationMixer');
    }
    return { samples: FRACTIONS.length, timeScale: f.entry.action.timeScale };
  });

  check('APC5 reload preserva cadência, munição e pose congelada', () => {
    const f = fixture();
    begin(f, 'reload');
    const ammo = { ...f.game.player.ammo[WEAPON] };
    for (const fraction of FRACTIONS) {
      const result = at(f, 'reload', fraction);
      near(result.sampleDuration, RELOAD_DURATION, 'APC5 duração da recarga');
      near(result.effectiveDuration, RELOAD_DURATION, 'APC5 duração efetiva');
      near(result.reloadSyncError, 0, 'APC5 sincronismo jogo/clipe');
      near(result.gameReloadRemaining, RELOAD_DURATION * (1 - fraction), 'APC5 restante no jogo');
      near(f.entry.action.timeScale, 2, 'APC5 timeScale');
      near(f.entry.action.time, 2.4 * fraction, 'APC5 tempo do clipe');
      near(f.marker.position.x, fraction, 'APC5 pose real no mixer');
      assert.deepEqual(f.game.player.ammo[WEAPON], ammo, 'APC5 amostragem consumiu/repôs munição');
    }
    return { samples: FRACTIONS.length, duration: RELOAD_DURATION, timeScale: f.entry.action.timeScale };
  });

  check('APC6 fire sem prazo usa curva/playRate, nunca idle', () => {
    const f = fixture({ stateDuration: 0 });
    begin(f, 'fire');
    const baseTime = f.vm._time;
    const result = at(f, 'fire', 0.5);
    const duration = f.vm.recoil.params.curves.semiRot.x.duration / f.vm.recoil.params.playRate;
    near(result.sampleDuration, duration, 'APC6 duração de fallback');
    near(f.vm._time - baseTime, duration * 0.5, 'APC6 avanço de fallback');
    return { duration, elapsed: f.vm._time - baseTime };
  });

  check('APC7 fire procedural preserva idle pausado, sem inventar pose', () => {
    const f = fixture();
    begin(f, 'fire');
    const idleTime = f.entry.action.time;
    const initialPosition = f.marker.position.x;
    for (const fraction of FRACTIONS) {
      at(f, 'fire', fraction);
      near(f.entry.action.time, idleTime, 'APC7 idle pausado não pode ser amostrado como clipe de tiro');
      near(f.marker.position.x, initialPosition, 'APC7 captura inventou movimento fora do recoil');
    }
    return { samples: FRACTIONS.length, idleTime, markerX: f.marker.position.x };
  });

  check('APC8 fim da captura retoma update, prazo e pausa originais', () => {
    const scenarios = [
      { kind: 'fire', options: {}, duration: FIRE_DURATION },
      { kind: 'fire', options: { clipFire: true }, duration: FIRE_DURATION },
      { kind: 'draw', options: {}, duration: DRAW_DURATION },
      { kind: 'reload', options: {}, duration: 0 },
    ];
    for (const { kind, options, duration } of scenarios) {
      const f = fixture(options);
      begin(f, kind);
      const originalPaused = f.entry.action.paused;
      at(f, kind, 0.5);
      finish(f.window);
      assert.ok(Number.isFinite(f.entry.stateUntil), 'APC8 prazo finito não foi restaurado; estado preso em Infinity');
      if (duration) near(f.entry.stateUntil - f.vm._time, duration * 0.5, 'APC8 restante do prazo');
      assert.equal(f.entry.action.paused, originalPaused,
        'APC8 pausa original não foi restaurada; idle precisa continuar pausado e clipe ativo precisa retomar');
      const before = snapshot(f);
      f.vm.update(0.025);
      near(f.vm._time - before.time, 0.025, 'APC8 controlador não retomou depois da captura');
      near(f.entry.action.time - before.actionTime, originalPaused ? 0 : 0.025 * 2,
        'APC8 avanço do clipe depois da captura');
      assert.throws(() => sample(f.window, { kind, fraction: 0.75, weapon: WEAPON }),
        /série não iniciada/, 'APC8 captura encerrada continuou aceitando amostras da série antiga');
      finish(f.window);
      near(f.vm._time - before.time, 0.025, 'APC8 encerramento repetido alterou o relógio');
    }
    return { resumedScenarios: scenarios.length };
  });

  check('APC9 draw e reload avançam relógio e dissipam recoil anterior', () => {
    for (const [kind, duration] of [['draw', DRAW_DURATION], ['reload', RELOAD_DURATION]]) {
      const f = fixture();
      f.vm.recoil.shoot(f.vm._time);
      begin(f, kind);
      const baseTime = f.vm._time;
      const oracle = makeRecoil();
      oracle.shoot(baseTime);
      let previous = 0;
      for (const fraction of FRACTIONS) {
        at(f, kind, fraction);
        const elapsed = duration * fraction;
        near(f.vm._time - baseTime, elapsed, `APC9 ${kind} precisa avançar o controlador`);
        near(f.vm.recoil.t, elapsed * f.vm.recoil.params.playRate, `APC9 ${kind} relógio do recoil`);
        const expected = oracle.update(elapsed - previous);
        for (const [axis, key] of [['x', 'rx'], ['y', 'ry'], ['z', 'rz']]) {
          near(f.entry.mount.rotation[axis], expected[key], `APC9 ${kind} conserva recoil antigo no mount.${axis}`);
        }
        const drawY = kind === 'draw' ? -f.entry.frame.drawDrop * (1 - fraction) : 0;
        near(f.entry.mount.position.y, f.entry.frame.y + drawY + expected.py,
          `APC9 ${kind} overlay e recoil precisam compartilhar o tempo`);
        previous = elapsed;
      }
      assert.ok(f.updates.every((dt) => dt <= 0.05), `APC9 ${kind}: subpassos ausentes`);
    }
    return { actions: 2, samplesPerAction: FRACTIONS.length };
  });

  check('APC10 snapshot congela simulação e registra HUD já atualizado', () => {
    const beginSnapshot = pageFunction(module.beginAuthoredSnapshot);
    const finishSnapshot = pageFunction(module.finishAuthoredSnapshot);
    const f = fixture();
    const gameUpdates = [];
    f.game.paused = false;
    f.game.renderer = { info: { render: { frame: 40 } } };
    f.game.player.ammo[WEAPON] = { mag: 11, res: 48 };
    f.game.player.reloadUntil = f.game.time;
    f.entry.state = 'reload';
    f.game.update = function update(dt, forceRender) {
      gameUpdates.push({ dt, forceRender });
      this.time += dt;
      f.vm.update(dt);
      if (this.player.reloadUntil > 0 && this.player.reloadUntil <= this.time) {
        this.player.ammo[WEAPON] = { mag: 12, res: 47 };
        this.player.reloadUntil = 0;
        f.entry.state = 'idle';
      }
      if (forceRender) {
        f.entry.mount.updateMatrixWorld(true);
        this.renderer.info.render.frame += 1;
      }
    };
    const liveState = () => ({ gameTime: f.game.time, ammo: { ...f.game.player.ammo[WEAPON] },
      reloadUntil: f.game.player.reloadUntil, state: f.entry.state,
      frame: f.game.renderer.info.render.frame, calls: gameUpdates.length, pose: snapshot(f) });
    const rendered = beginSnapshot(f.window, WEAPON);
    try {
      assert.deepEqual(gameUpdates, [{ dt: 0, forceRender: true }],
        'APC10 snapshot precisa atualizar e renderizar antes de ler o HUD');
      assert.deepEqual(rendered.ammo, { mag: 12, res: 47 }, 'APC10 HUD anterior à atualização');
      assert.equal(rendered.frame, 41, 'APC10 número de frame anterior à renderização');
      assert.equal(rendered.weapon, WEAPON, 'APC10 arma incorreta');
      assert.equal(rendered.state, 'idle', 'APC10 estado anterior à conclusão da recarga');
      assert.equal(rendered.clip, 'idle', 'APC10 clipe incorreto');
      near(rendered.clipTime, f.entry.action.time, 'APC10 tempo do clipe');
      near(rendered.gameTime, f.game.time, 'APC10 relógio do jogo');
      near(rendered.gameReloadRemaining, 0, 'APC10 restante anterior à conclusão da recarga');
      assert.deepEqual(rendered.mountPosition, f.entry.mount.position.toArray(), 'APC10 posição do mount');
      assert.deepEqual(rendered.mountMatrixPosition, f.entry.mount.matrix.elements.slice(12, 15),
        'APC10 matriz de renderização divergente');
      const frozenState = liveState();
      f.game.update(0.025, true);
      f.game.update(0.025, true);
      assert.deepEqual(liveState(), frozenState,
        'APC10 simulação/HUD deriva entre leitura e screenshot; congele game.update');
    } finally {
      finishSnapshot(f.window);
    }
    assert.equal(Object.hasOwn(f.game, '__qaSnapshotUpdate'), false, 'APC10 marcador de snapshot não foi removido');
    finishSnapshot(f.window);
    const beforeResume = liveState();
    f.game.update(0.025, true);
    near(f.game.time - beforeResume.gameTime, 0.025, 'APC10 finish repetido não retomou jogo');
    near(f.vm._time - beforeResume.pose.time, 0.025, 'APC10 finish não retomou controlador');
    assert.equal(gameUpdates.length, beforeResume.calls + 1, 'APC10 retomada perdeu update');
    assert.equal(f.game.renderer.info.render.frame, beforeResume.frame + 1, 'APC10 retomada perdeu render');
    f.game.player.ammo[WEAPON].mag = 10;
    assert.equal(rendered.ammo.mag, 12, 'APC10 relatório contém referência mutável ao HUD');
    beginSnapshot(f.window, WEAPON);
    finishSnapshot(f.window);
    const beforeSecondResume = f.game.time;
    f.game.update(0.025, true);
    near(f.game.time - beforeSecondResume, 0.025, 'APC10 segundo snapshot empilhou congelamento');
    return { captures: 2, repeatedFinish: true, ammoRendered: rendered.ammo };
  });
  return cases;
}

const module = await import(MODULE.href);
const cases = runSuite(module);
for (const result of cases) console.log(`${result.ok ? 'PASSA' : 'FALHA'} ${result.id} — ${JSON.stringify(result)}`);
const failures = cases.filter((result) => !result.ok).length;

if (process.argv.includes('--mutate')) {
  assert.equal(failures, 0, 'mutação exige a versão normal verde para distinguir o defeito plantado');
  const source = await readFile(MODULE, 'utf8');
  const mutations = [
    { name: 'sem-avanco', pattern: /game\.__qaAuthoredUpdate\((step|dt)\)/g,
      replacement: 'game.__qaAuthoredUpdate(0)', contract: 'APC1', error: /APC1 controlador perde dt/ },
    { name: 'dt-sem-subpassos', pattern: /const step = Math\.min\(1 \/ 60, remaining\);/g,
      replacement: 'const step = remaining;', contract: 'APC1', error: /APC1 controlador perde dt/ },
    { name: 'avanco-so-fire', pattern: /while \(remaining > 1e-9\)/g,
      replacement: "while (kind === 'fire' && remaining > 1e-9)",
      contract: 'APC9', error: /APC9 draw precisa avançar o controlador/ },
    { name: 'idle-como-tiro', pattern: /!pose\.proceduralFire && /g,
      replacement: '', contract: 'APC7', error: /APC7 idle pausado/ },
    { name: 'sem-retomada', pattern: /if \(game\.__qaAuthoredUpdate\) vm\.update = game\.__qaAuthoredUpdate;/g,
      replacement: 'if (game.__qaAuthoredUpdate) vm.update = () => {};',
      contract: 'APC8', error: /APC8 controlador não retomou/ },
    { name: 'prazo-infinito', pattern: /entry\.stateUntil = Number\.isFinite\(pose\.stateUntil\)[\s\S]*?: pose\.stateUntil;/g,
      replacement: 'entry.stateUntil = Infinity;', contract: 'APC8', error: /APC8 prazo finito/ },
    { name: 'idle-despausado', pattern: /if \(pose\.action\) pose\.action\.paused = pose\.actionPaused;/g,
      replacement: 'if (pose.action) pose.action.paused = false;', contract: 'APC8', error: /APC8 pausa original/ },
    { name: 'snapshot-sem-congelar', pattern: /game\.update = \(\) => \{\};/g,
      replacement: 'game.update = game.__qaSnapshotUpdate;',
      contract: 'APC10', error: /APC10 simulação\/HUD deriva/ },
  ];
  const directory = await mkdtemp(path.join(tmpdir(), 'authored-pose-capture-mutant-'));
  try {
    for (const mutation of mutations) {
      assert.equal([...source.matchAll(mutation.pattern)].length, 1,
        `MUTAÇÃO NÃO APLICOU: ${mutation.name}; localize a operação do helper`);
      const mutated = source.replace(mutation.pattern, mutation.replacement);
      assert.notEqual(mutated, source, `MUTAÇÃO NÃO APLICOU: ${mutation.name}; fonte idêntica`);
      const target = path.join(directory, `${mutation.name}.mjs`);
      await writeFile(target, mutated);
      const mutantCases = runSuite(await import(pathToFileURL(target).href));
      const killed = mutantCases.filter((result) => !result.ok);
      const expected = killed.find((result) => result.id.startsWith(mutation.contract)
        && mutation.error.test(result.error));
      assert.ok(expected,
        `RÉGUA CEGA: ${mutation.name} precisa reprovar ${mutation.contract}; medido ${JSON.stringify(killed)}`);
      console.log(`PASSA MUTANTE ${mutation.name} — ${killed.length}/${mutantCases.length} contratos vermelhos; ${expected.error}`);
      const restored = runSuite(await import(MODULE.href));
      assert.ok(restored.every((result) => result.ok), 'restauração não voltou ao verde');
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

console.log(`APC ${cases.length - failures}/${cases.length} contratos; captura visual/GLB fora desta régua Node.`);
process.exitCode = failures ? 1 : 0;
