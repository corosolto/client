// Gate de TRANSIÇÃO do caminho autorado. Exercita `AuthoredViewModels` de
// verdade — fila de clipes, troca de arma, granada — e cobra que o estado idle
// termine com POSE de idle, não com a pose final da ação anterior.
//
// Defeito que ele existe para pegar: o listener `finished` do mixer dispara de
// DENTRO de `AnimationMixer.update`, e trocar de ação ali corrompe os bindings.
// O sintoma é o estado dizer idle enquanto o esqueleto retém a pose final da
// recarga. Por isso `_continue` adia a troca para fora do update e `_stepEntry`
// é o único dono da chamada ao mixer. Adaptado do AUD1B de `claude/vm-unificado`:
// os blocos de `_goldenParts`/split de trilhas ficaram de fora porque esta lane
// não tem esse caminho — aqui o crossfade é de clipe inteiro.
// O rollout desta lane é fail-CLOSED: sem `?vmauthored=1` o módulo nasce morto e
// `familyFor` devolve vazio. A janela falsa abre o portão e as famílias do
// fixture, antes de importar o módulo — é o único jeito de exercitar o
// controlador real fora do navegador.
globalThis.window = {
  location: { search: '?vmauthored=1&vmready=deagle,revolver,grenade&vmweapon=deagle,revolver38' },
};
const THREE = await import('three');
const { AuthoredViewModels } = await import('../../public/js/authoredvm.js');
const { readFile } = await import('node:fs/promises');

function fixture(Runtime) {
  const vm = Object.create(Runtime.prototype);
  vm.entries = new Map();
  vm.weapon = 'deagle';
  vm._time = 0;
  vm.adsAmount = 0;
  vm.recoil = { update: () => ({ px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, pivot: [0, 0, 0] }) };
  // Chaves como esta lane monta: arma assada vira `familia#arma`; a granada é
  // procurada por família crua em `throwUtility`.
  for (const [key, weapon, idlePosition] of [['deagle#deagle', 'deagle', 2], ['revolver#revolver38', 'revolver38', -4], ['grenade', 'grenade', -1]]) {
    const mount = new THREE.Group(), bone = new THREE.Bone();
    bone.name = 'hand';
    mount.add(bone);
    mount.visible = weapon === 'deagle';
    const clip = (name, end) => new THREE.AnimationClip(name, 0.2, [
      new THREE.VectorKeyframeTrack('hand.position', [0, 0.2], [idlePosition, 0, 0, end, 0, 0]),
    ]);
    const entry = {
      key, family: key.split('#')[0], weapon, golden: false, mount, scene: mount, bone, idlePosition,
      mixer: new THREE.AnimationMixer(mount),
      clips: new Map([['idle', clip('Idle', idlePosition)], ['reload', clip('Reload', 8)],
        ['end', clip('End', 5)], ...['throw_start', 'throw_loop', 'throw_end'].map((name) => [name, clip(name, 8)])]),
      queue: [], serial: 0, frame: { x: 0, y: 0, z: 0 }, drawTime: 1, drawDuration: 0.32,
      utilityModels: new Map([['he', new THREE.Group()]]),
    };
    entry.mixer.addEventListener('finished', (event) => {
      if (event.action === entry.action) vm._continue(entry);
    });
    vm.entries.set(key, entry);
    vm._idle(entry);
  }
  return vm;
}

function advance(vm, frames, observe = () => {}) {
  for (let index = 0; index < frames; index += 1) {
    observe();
    vm.update(0.01);
  }
}

const snapshot = (entry) => ({
  action: entry.action.getClip().name, position: entry.bone.position.x,
  queue: entry.queue.length, visible: entry.mount.visible,
});
const idlePose = (entry, pose = snapshot(entry)) => pose.action === 'Idle'
  && Math.abs(pose.position - entry.idlePosition) < 1e-6 && pose.queue === 0;

function audit(Runtime) {
  const checks = [];
  // Continuidade no instante da virada: o salto de pose no frame em que a ação
  // termina não pode passar do que o próprio clipe percorreria naquele passo.
  {
    const vm = fixture(Runtime), entry = vm.entry();
    vm._play(entry, 'reload');
    advance(vm, 19);
    vm.update(0.00999);
    const before = entry.bone.position.x;
    vm.update(0.00002);
    const jump = Math.abs(entry.bone.position.x - before);
    const bound = (8 - entry.idlePosition) / 0.2 * 0.00002 * 2;
    checks.push({ name: 'idle-continuidade', ok: jump <= bound, jump, bound });
  }
  // A fila termina e fecha em idle nos três modos, inclusive com o mount oculto
  // (fila encalhada escondida era pose congelada ao reequipar).
  for (const mode of ['visivel', 'oculto', 'utilitario']) {
    const vm = fixture(Runtime), entry = vm.entry();
    entry.mount.visible = mode !== 'oculto';
    vm._sequence(entry, ['reload', 'end'], 0.4);
    if (mode === 'utilitario') vm.utility = { entry, elapsed: 0, releaseAt: 10, duration: 20 };
    const visited = new Set();
    advance(vm, 100, () => visited.add(entry.action.getClip().name));
    checks.push({ name: `fila-${mode}`, ok: visited.has('End') && idlePose(entry), ...snapshot(entry), visited: [...visited] });
  }
  // Trocar de arma no meio da fila, em vários instantes, e voltar.
  for (const frames of [10, 20, 30, 40, 43, 48]) {
    const vm = fixture(Runtime), original = vm.entry(), other = vm.entries.get('revolver#revolver38');
    vm._sequence(original, ['reload', 'end'], 0.4);
    advance(vm, frames);
    const switched = vm.setWeapon('revolver38'), hidden = snapshot(original);
    advance(vm, 30);
    const selected = snapshot(other), returned = vm.setWeapon('deagle');
    advance(vm, 30);
    checks.push({
      name: `troca-e-volta-${frames * 10}ms`,
      ok: switched && returned && idlePose(original, hidden) && !hidden.visible
        && idlePose(other, selected) && selected.visible && idlePose(original) && original.mount.visible,
      hidden, selected, returned: snapshot(original),
    });
  }
  // Granada: solta uma vez, deixa trocar de arma no release e ainda fecha o ciclo.
  {
    const vm = fixture(Runtime), original = vm.entry(), grenade = vm.entries.get('grenade');
    vm._sequence(original, ['reload', 'end'], 0.4);
    advance(vm, 43);
    let releases = 0, completions = 0, switched = false, visibleAtRelease = false;
    vm.onReady = () => { completions += 1; };
    const started = vm.throwUtility('frag', 0.7, () => {
      releases += 1;
      switched = vm.setWeapon('revolver38');
      visibleAtRelease = grenade.mount.visible && !vm.entry().mount.visible;
    });
    const visited = new Set();
    advance(vm, 100, () => visited.add(grenade.action.getClip().name));
    const selected = vm.entry();
    checks.push({
      name: 'granada-release-troca-fecha',
      ok: started && switched && releases === 1 && completions === 1 && visibleAtRelease
        && ['throw_start', 'throw_loop', 'throw_end'].every((name) => visited.has(name))
        && vm.utility === null && vm.weapon === 'revolver38' && selected.mount.visible
        && idlePose(selected) && idlePose(grenade) && !grenade.mount.visible,
      releases, completions, visibleAtRelease, visited: [...visited],
    });
  }
  return { ok: checks.every((check) => check.ok), checks };
}

const result = audit(AuthoredViewModels);
if (process.argv.includes('--mutantes')) {
  const url = new URL('../../public/js/authoredvm.js', import.meta.url);
  const source = await readFile(url, 'utf8');
  const mutations = [
    // O mutante do conserto desta rodada: volta a trocar ação dentro do update.
    ['transicao-dentro-do-mixer', 'if (entry.updatingMixer) {', 'if (false) {'],
    ['fila-perdida-na-troca', 'if (!visible && entry.mount.visible) this._idle(entry);', ''],
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
    result.mutations.push({ name, detected: !check.ok, failed: check.checks.filter((item) => !item.ok).map((item) => item.name) });
    result.ok &&= !check.ok;
  }
}
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
