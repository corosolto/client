// Funções autocontidas: Playwright as executa no mesmo contexto do jogo.
// Evidência e mutantes: docs/reports/VIEWMODEL-ASTRA-PISTOL-HANDOFF.md.
export function startAuthoredAction({ kind, weapon }) {
  const game = window.__game;
  const vm = window.__authoredVm;
  if (!game.__qaAuthoredUpdate) game.__qaAuthoredUpdate = vm.update.bind(vm);
  vm.update = game.__qaAuthoredUpdate;
  if (kind === 'draw') {
    game.player.weapon = 'knife';
    game._switchWeapon(weapon);
  } else if (kind === 'fire') {
    game.player.reloadUntil = 0;
    game.player.nextShotAt = 0;
    game.player.drawUntil = 0;
    game.mouseDown0 = true;
    game._tryShoot();
    game.mouseDown0 = false;
  } else if (kind === 'reload') {
    const ammo = game.player.ammo[weapon];
    ammo.mag = Math.min(ammo.mag, 23);
    game.player.reloadUntil = 0;
    const ammoBefore = { ...ammo };
    game._startReload();
    game.__viewmodelQaReload = {
      duration: Math.max(0, game.player.reloadUntil - game.time), ammoBefore,
    };
  } else throw new Error(`ação de captura desconhecida: ${kind}`);

  const entry = vm.entry(weapon);
  const action = entry.action;
  const clip = action?.getClip?.();
  const timeScale = Math.abs(action?.timeScale || 1);
  const proceduralDraw = kind === 'draw' && !/equip/i.test(clip?.name || '');
  const proceduralFire = kind === 'fire' && !/shoot|fire/i.test(clip?.name || '');
  const recoilCurves = vm.recoil?.params?.curves || {};
  const recoilDuration = Math.max(0, ...Object.values(recoilCurves)
    .flatMap((axes) => Object.values(axes).map((curve) => curve?.duration || 0)))
    / (vm.recoil?.params?.playRate || 1);
  const stateDuration = Number.isFinite(entry.stateUntil)
    ? Math.max(0, entry.stateUntil - vm._time) : 0;
  const sampleDuration = proceduralDraw ? entry.drawDuration
    : proceduralFire ? stateDuration || recoilDuration
    : (clip?.duration || 0) / timeScale;
  if (!(sampleDuration > 0)) throw new Error(`${kind}: duração da ação não disponível`);
  game.__qaAuthoredPose = {
    kind, weapon, action, state: entry.state, timeScale: action?.timeScale || 1,
    actionPaused: action?.paused, stateUntil: entry.stateUntil,
    stateRemaining: stateDuration,
    sampleDuration, sampleElapsed: 0, proceduralDraw, proceduralFire,
  };
  vm.update = () => {};
  return { state: entry.state, clip: clip?.name || null, sampleDuration, sampleElapsed: 0 };
}

export function sampleAuthoredPose({ kind, fraction, weapon }) {
  const game = window.__game;
  const vm = window.__authoredVm;
  const pose = game.__qaAuthoredPose;
  if (!pose || pose.kind !== kind || pose.weapon !== weapon) {
    throw new Error(`${kind}/${weapon}: série não iniciada`);
  }
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
    throw new Error(`fração inválida: ${fraction}`);
  }
  const entry = vm.entry(weapon);
  const action = pose.action;
  const duration = action?.getClip?.().duration || 0;
  const sampleElapsed = fraction * pose.sampleDuration;
  if (sampleElapsed < pose.sampleElapsed) throw new Error('reinicie a série antes de retroceder');
  entry.state = pose.state;
  entry.stateUntil = Infinity;
  if (pose.proceduralDraw) {
    entry.drawTime = entry.drawDuration * fraction;
    game.__qaAuthoredUpdate(0);
  } else if (kind === 'fire') {
    let remaining = sampleElapsed - pose.sampleElapsed;
    // AuthoredViewModels.update limita dt: um salto de fase exige subpassos.
    while (remaining > 1e-9) {
      const step = Math.min(1 / 60, remaining);
      game.__qaAuthoredUpdate(step);
      remaining -= step;
    }
    if (sampleElapsed === 0) game.__qaAuthoredUpdate(0);
  }
  pose.sampleElapsed = sampleElapsed;
  if (!pose.proceduralDraw && !pose.proceduralFire && action && duration) {
    entry.mixer.stopAllAction();
    action.reset();
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.setEffectiveTimeScale(pose.timeScale);
    action.time = Math.min(duration - 1e-4, Math.max(0, duration * fraction));
    action.play();
    entry.mixer.update(0);
    action.paused = true;
  }
  const reloadQa = game.__viewmodelQaReload;
  if (kind === 'reload' && reloadQa) {
    Object.assign(game.player.ammo[weapon], reloadQa.ammoBefore);
    game.player.reloadUntil = game.time + reloadQa.duration * (1 - fraction);
  }
  entry.mount.updateMatrixWorld(true);
  vm.update = () => {};
  const effectiveDuration = duration ? duration / Math.abs(pose.timeScale) : null;
  return {
    state: entry.state, clip: action?.getClip?.().name || null,
    clipDuration: duration, timeScale: pose.timeScale, effectiveDuration,
    clipTime: action?.time || 0, fraction,
    sampleDuration: pose.sampleDuration, sampleElapsed,
    procedural: pose.proceduralDraw || pose.proceduralFire,
    drawTime: entry.drawTime, drawDuration: entry.drawDuration,
    mountPosition: entry.mount.position.toArray(),
    mountRotation: entry.mount.rotation.toArray().slice(0, 3),
    gameReloadDuration: kind === 'reload' ? reloadQa?.duration ?? null : null,
    gameReloadRemaining: Math.max(0, game.player.reloadUntil - game.time),
    reloadSyncError: kind === 'reload' && effectiveDuration != null && reloadQa
      ? Math.abs(effectiveDuration - reloadQa.duration) : null,
    ammo: { ...game.player.ammo[weapon] },
  };
}

export function finishAuthoredAction() {
  const game = window.__game;
  const vm = window.__authoredVm;
  const pose = game.__qaAuthoredPose;
  if (pose) {
    const entry = vm.entry(pose.weapon);
    entry.stateUntil = Number.isFinite(pose.stateUntil)
      ? vm._time + Math.max(0, pose.stateRemaining - pose.sampleElapsed)
      : pose.stateUntil;
    if (pose.action) pose.action.paused = pose.actionPaused;
    delete game.__qaAuthoredPose;
  }
  if (game.__qaAuthoredUpdate) vm.update = game.__qaAuthoredUpdate;
}
