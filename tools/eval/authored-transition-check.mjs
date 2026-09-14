import * as THREE from 'three';
import { AuthoredViewModels } from '../../public/js/authoredvm.js';
import { readFile } from 'node:fs/promises';

function fixture(Runtime, golden) {
  const vm = Object.create(Runtime.prototype);
  vm.entries = new Map();
  vm.weapon = 'deagle';
  vm._time = 0;
  vm.adsAmount = 0;
  vm.recoil = { update: () => ({ px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, pivot: [0, 0, 0] }) };
  for (const [key, idlePosition] of [['deagle', 2], ['revolver', -4], ['grenade', -1]]) {
    const mount = new THREE.Group(), bone = new THREE.Bone();
    bone.name = 'hand';
    mount.add(bone);
    mount.visible = key === 'deagle';
    const clip = (name, end) => new THREE.AnimationClip(name, 0.2, [
      new THREE.VectorKeyframeTrack('hand.position', [0, 0.2], [idlePosition, 0, 0, end, 0, 0]),
    ]);
    const entry = { key, family: key, golden, mount, scene: mount, bone, idlePosition,
      mixer: new THREE.AnimationMixer(mount),
      clips: new Map([['idle', clip('Idle', idlePosition)], ['reload', clip('Reload', 8)],
        ['end', clip('End', 5)], ...['throw_start', 'throw_loop', 'throw_end'].map(name => [name, clip(name, 8)])]),
      queue: [], serial: 0, frame: { x: 0, y: 0, z: 0 }, drawTime: 1, drawDuration: 0.32,
      utilityModels: new Map([['he', new THREE.Group()]]) };
    entry.mixer.addEventListener('finished', event => {
      if (event.action === entry.action) vm._continue(entry);
    });
    vm.entries.set(key, entry);
    vm._idle(entry);
  }
  return vm;
}

function advance(vm, frames, observe = () => {}) {
  for (let i = 0; i < frames; i++) {
    observe();
    vm.update(0.01);
  }
}

function snapshot(entry) {
  return { action: entry.action.getClip().name, position: entry.bone.position.x,
    queue: entry.queue.length, visible: entry.mount.visible };
}

function idlePose(entry, pose = snapshot(entry)) {
  return pose.action === 'Idle' && Math.abs(pose.position - entry.idlePosition) < 1e-6 && pose.queue === 0;
}

function audit(Runtime) {
  const checks = [];
  {
    const vm = fixture(Runtime, true), entry = vm.entry(), magazine = new THREE.Bone();
    magazine.name = 'replacement'; entry.scene.add(magazine);
    const geometry = new THREE.BoxGeometry(1, 1, 1), count = geometry.attributes.position.count;
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4));
    const weights = new Float32Array(count * 4); for (let i = 0; i < count; i++) weights[i * 4] = 1;
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
    entry.scene.add(mesh); mesh.bind(new THREE.Skeleton([magazine])); entry.weaponMeshes = [mesh];
    entry.clips.get('idle').tracks.push(new THREE.VectorKeyframeTrack('replacement.scale', [0, 0.2], [0,0,0,0,0,0]));
    entry.clips.get('reload').tracks.push(new THREE.VectorKeyframeTrack('replacement.scale', [0, 0.2], [1,1,1,1,1,1]));
    entry.mixer.stopAllAction(); entry.mixer.uncacheAction(entry.clips.get('idle'));
    const cycles = [];
    const bound = (8 - entry.idlePosition) / 0.2 * 0.00002 * 2;
    for (let cycle = 0; cycle < 10; cycle++) {
      vm._play(entry, 'reload'); advance(vm, 19); vm.update(0.00999);
      const before = entry.bone.position.x;
      vm.update(0.00002);
      const jump = Math.abs(entry.bone.position.x - before);
      let weightError = 0, magazineError = 0;
      const observeBlend = () => {
        const armsWeight = entry.mixer._actions.filter(action => action.isScheduled()
          && action.getClip().tracks.some(track => track.name === 'hand.position'))
          .reduce((sum, action) => sum + action.getEffectiveWeight(), 0);
        weightError = Math.max(weightError, Math.abs(armsWeight - 1));
        magazineError = Math.max(magazineError, ...magazine.scale.toArray().map(Math.abs));
      };
      observeBlend(); advance(vm, 17, observeBlend); observeBlend();
      cycles.push({ cycle, jump, weightError, magazineError, pose: snapshot(entry),
        cachedActions: entry.mixer._actions.length, splitClips: entry.splitClips?.size ?? 0 });
    }
    checks.push({ name: 'golden-idle-magazine-does-not-reappear',
      ok: cycles.every(cycle => cycle.magazineError === 0),
      maxScale: Math.max(...cycles.map(cycle => cycle.magazineError)) });
    checks.push({ name: 'golden-split-arms-continuity',
      ok: cycles.every(cycle => cycle.jump <= bound),
      jump: Math.max(...cycles.map(cycle => cycle.jump)), bound });
    checks.push({ name: 'golden-split-arms-return-to-idle',
      ok: cycles.every(cycle => idlePose(entry, cycle.pose)), poses: cycles.map(cycle => cycle.pose) });
    checks.push({ name: 'golden-split-arms-unit-weight',
      ok: cycles.every(cycle => cycle.weightError < 1e-6),
      error: Math.max(...cycles.map(cycle => cycle.weightError)) });
    checks.push({ name: 'golden-split-repeated-cycle-cache',
      ok: cycles.every(cycle => cycle.cachedActions === cycles[0].cachedActions
        && cycle.splitClips === cycles[0].splitClips),
      cycles: cycles.map(({ cycle, cachedActions, splitClips }) => ({ cycle, cachedActions, splitClips })) });
    geometry.dispose(); mesh.material.dispose();
  }
  for (const golden of [true, false]) {
    const vm = fixture(Runtime, golden), entry = vm.entry();
    vm._play(entry, 'reload');
    advance(vm, 19);
    vm.update(0.00999);
    const before = entry.bone.position.x;
    vm.update(0.00002);
    const jump = Math.abs(entry.bone.position.x - before);
    const bound = (8 - entry.idlePosition) / 0.2 * 0.00002 * 2;
    checks.push({ name: `${golden ? 'golden' : 'private'}-idle-continuity`, ok: jump <= bound, jump, bound });
  }
  for (const golden of [true, false]) for (const mode of ['visible', 'hidden', 'utility']) {
    const vm = fixture(Runtime, golden), entry = vm.entry();
    entry.mount.visible = mode !== 'hidden';
    vm._sequence(entry, ['reload', 'end'], 0.4);
    if (mode === 'utility') vm.utility = { entry, elapsed: 0, releaseAt: 10, duration: 20 };
    const visited = new Set();
    advance(vm, 100, () => visited.add(entry.action.getClip().name));
    checks.push({ name: `${golden ? 'golden' : 'private'}-${mode}`, ok:
      visited.has('End') && idlePose(entry), ...snapshot(entry), visited: [...visited] });
  }
  for (const golden of [true, false]) {
    for (const frames of [10, 20, 30, 40, 43, 48]) {
      const vm = fixture(Runtime, golden), original = vm.entry(), other = vm.entries.get('revolver');
      vm._sequence(original, ['reload', 'end'], 0.4);
      advance(vm, frames);
      const before = snapshot(original), switched = vm.setWeapon('revolver38'), hidden = snapshot(original);
      advance(vm, 30);
      const selected = snapshot(other), returned = vm.setWeapon('deagle');
      advance(vm, 30);
      checks.push({ name: `${golden ? 'golden' : 'private'}-switch-return-${frames * 10}ms`,
        ok: switched && returned && idlePose(original, hidden) && !hidden.visible
          && idlePose(other, selected) && selected.visible && idlePose(original) && original.mount.visible,
        before, hidden, selected, returned: snapshot(original) });
    }
    const vm = fixture(Runtime, golden), original = vm.entry(), grenade = vm.entries.get('grenade');
    vm._sequence(original, ['reload', 'end'], 0.4);
    advance(vm, 43);
    let releases = 0, completions = 0, switched = false, visibleAtRelease = false;
    vm.onReady = () => { completions++; };
    const started = vm.throwUtility('frag', 0.7, () => {
      releases++;
      switched = vm.setWeapon('revolver38');
      visibleAtRelease = grenade.mount.visible && !vm.entry().mount.visible;
    });
    const visited = new Set();
    advance(vm, 100, () => visited.add(grenade.action.getClip().name));
    const selected = vm.entry();
    checks.push({ name: `${golden ? 'golden' : 'private'}-throw-release-switch-finish`,
      ok: started && switched && releases === 1 && completions === 1 && visibleAtRelease
        && ['throw_start', 'throw_loop', 'throw_end'].every(name => visited.has(name))
        && vm.utility === null && vm.weapon === 'revolver38' && selected.mount.visible
        && idlePose(selected) && idlePose(grenade) && !grenade.mount.visible,
      releases, completions, visibleAtRelease, visited: [...visited],
      selected: snapshot(selected), grenade: snapshot(grenade) });
  }
  return { ok: checks.every(c => c.ok), checks };
}

const result = audit(AuthoredViewModels);
if (process.argv.includes('--mutantes')) {
  const url = new URL('../../public/js/authoredvm.js', import.meta.url);
  const source = await readFile(url, 'utf8');
  const mutations = [
    ['pecas-rigidas-com-fade', 'if (blend && entry.weaponMeshes?.length) {', 'if (false) {'],
    ['split-arms-sem-fade-in', 'arms.play().fadeIn(fade);', 'arms.play();'],
    ['split-outgoing-sem-fade-out', 'held.play().fadeOut(fade);', 'held.play();'],
    ['idle-sem-blend', 'const blend = fade > 0 && previous && previous !== action;', 'const blend = false;'],
    ['transicao-dentro-do-mixer', 'if (entry.updatingMixer) {', 'if (false) {'],
    ['fila-preservada-na-troca', 'if (!visible && entry.mount.visible) this._idle(entry);', ''],
    ['release-repetido', 'utility.released = true;', 'utility.released = false;'],
    ['arma-oculta-apos-granada', 'if (weaponEntry) weaponEntry.mount.visible = true;', ''],
  ];
  result.mutations = [];
  for (const [name, before, after] of mutations) {
    if (source.split(before).length !== 2) throw new Error(`Mutação ambígua: ${name}`);
    const code = source.replace(before, after).replace(/from '([^']+)'/g, (_, specifier) =>
      `from '${specifier.startsWith('.') ? new URL(specifier, url).href : import.meta.resolve(specifier)}'`);
    const mutated = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    const check = audit(mutated.AuthoredViewModels);
    result.mutations.push({ name, detected: !check.ok, failed: check.checks.filter(c => !c.ok).map(c => c.name) });
    result.ok &&= !check.ok;
  }
}
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
