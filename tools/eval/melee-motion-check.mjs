#!/usr/bin/env node
// A folha da faca mostrou bind pose em Draw/quick 100%: terminou o clipe,
// sua contribuição foi desabilitada e o Idle começou com peso zero.
// Executa KnifeMeleeViewModel + AnimationMixer REAIS; fixture mínima isola
// a transição. Geometria/contato do GLB continuam cobrados nas fotos do jogo.
import * as THREE from 'three';
import { KnifeMeleeViewModel } from '../../public/js/meleevm.js';

const mutant = process.argv[2] || '';
if (process.argv.length > 3) throw new Error('use no máximo um mutante por execução');
if (mutant && !['--mutante=sem-clamp', '--mutante=evento-antigo', '--mutante=quadro-antigo', '--mutante=flash-externo'].includes(mutant)) throw new Error(`flag desconhecida: ${mutant}`);
const checks = [];
function create() {
  const scene = new THREE.Group();
  const hand = new THREE.Object3D(); hand.name = 'Hand'; scene.add(hand);
  scene.add(new THREE.PerspectiveCamera(32, 1.5, 0.01, 100));
  const animations = ['Idle', 'Draw', 'Slash', 'Stab'].map((name, i) => new THREE.AnimationClip(name,
    [2, 2 / 3, 11 / 15, 0.8][i], [new THREE.NumberKeyframeTrack('Hand.position[x]', [0, 0.1], [i + 1, i + 1])]));
  const vm = new KnifeMeleeViewModel({ parent: new THREE.Group() });
  vm._accept({ scene, animations }); vm.setWeapon('knife'); vm.update(0.1);
  if (mutant === '--mutante=quadro-antigo') {
    if (vm.basePosition.z === 0) throw new Error('quadro antigo já está ativo; mutação não aplicou');
    vm.basePosition.z = 0; vm.packageRoot.position.z = 0;
  }
  if (mutant === '--mutante=sem-clamp') {
    const play = vm._play;
    vm._play = function (...args) {
      const result = play.apply(this, args);
      this.current.clampWhenFinished = false;
      return result;
    };
  }
  if (mutant === '--mutante=evento-antigo') {
    // Recompõe somente o handler anterior, em memória, sem editar produção.
    vm.mixer._listeners.finished = [() => {
      vm.attackMotion = null; vm.packageRoot.position.copy(vm.basePosition);
      if (vm.active) vm._play('Idle');
    }];
  }
  return { vm, hand };
}
for (const kind of ['draw', 'quick', 'heavy']) {
  const { vm, hand } = create();
  if (kind === 'draw') vm.draw(); else vm.attack(kind);
  vm.update(0); // setDuration -> effectiveTimeScale só no tick, inclusive tick zero.
  const duration = vm.current.getClip().duration / vm.current.getEffectiveTimeScale();
  const samples = [];
  for (let elapsed = 0; elapsed < duration + 0.06;) {
    // Inclui o instante exato do término e o render dt=0 que o Game faz.
    const dt = elapsed < duration ? Math.min(1 / 120, duration - elapsed + 1e-12) : 1 / 120;
    vm.update(dt); vm.update(0); elapsed += dt;
    samples.push({ elapsed, hand: hand.position.x, state: vm.state });
  }
  const gaps = samples.filter((s) => s.hand < 1 - 1e-6);
  checks.push({ name: `${kind}: pose válida em toda transição`, ok: !gaps.length, gaps });
  checks.push({ name: `${kind}: retorno e avanço encerrados`, ok: vm.state === 'Idle' && vm.attackMotion === null });
  // Enquadramento aprovado em 05/09; mede o wrapper real após cada ação, não a declaração.
  const expected = [0.18, -0.12, -0.25];
  checks.push({ name: `${kind}: preserva enquadramento aprovado`,
    ok: expected.every((v, i) => Math.abs(vm.packageRoot.position.toArray()[i] - v) < 1e-9)
      && vm.packageRoot.scale.toArray().every((v) => v === 0.0135),
    position: vm.packageRoot.position.toArray(), scale: vm.packageRoot.scale.toArray() });
  vm.dispose();
}
{
  const { vm } = create(); vm.draw(); const oldAction = vm.current;
  vm.attack('quick'); const current = vm.current;
  // Um evento atrasado de uma ação substituída não pode encerrar a atual.
  vm.mixer.dispatchEvent({ type: 'finished', action: oldAction, direction: 1 });
  checks.push({ name: 'finished de ação substituída não interrompe ataque',
    ok: vm.current === current && vm.state === 'Stab' && vm.attackMotion !== null });
  vm.dispose();
}
{
  const { Game } = await import('./harness.mjs');
  const makeFlash = () => ({
    _vmFlash: { t: 0.032, life: 0.045, peak: 1.6 }, _vmFlashLight: { intensity: 0.7 },
    _vmMzPool: [], _mzPool: [], _mzLights: [new THREE.PointLight()], _mzLightActive: [],
    _fxTune: { spark: 0, smoke: 0 }, flashFx: { spawn() {} }, puffFx: { spawn() {} },
  });
  for (const own of [false, true]) {
    const game = makeFlash();
    Game.prototype._flash.call(game, new THREE.Vector3(50, 2, 50), new THREE.Vector3(0, 0, -1), own ? 'pistol' : undefined);
    if (!own && mutant === '--mutante=flash-externo') {
      if (game._vmFlash.t === 0) throw new Error('flash externo já está ativo; mutação não aplicou');
      game._vmFlash.t = 0; game._vmFlashLight.intensity = game._vmFlash.peak;
    }
    checks.push({ name: own ? 'tiro próprio ilumina viewmodel' : 'tiro externo não reacende nem apaga pulso local',
      ok: own ? game._vmFlash.t === 0 && game._vmFlashLight.intensity === 1.6
        : game._vmFlash.t === 0.032 && game._vmFlashLight.intensity === 0.7,
      time: game._vmFlash.t, intensity: game._vmFlashLight.intensity });
    checks.push({ name: `${own ? 'próprio' : 'externo'}: flash do mundo preservado`,
      ok: game._mzLightActive.length === 1 && game._mzLightActive[0].l.intensity > 0 });
  }
}
const ok = checks.every((c) => c.ok);
console.log(JSON.stringify({ ok, mutant: mutant || null, checks }, null, 2));
process.exitCode = ok ? 0 : 1;
