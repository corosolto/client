#!/usr/bin/env node
// A folha da faca mostrou bind pose em Draw/quick 100%: terminou o clipe,
// sua contribuição foi desabilitada e o Idle começou com peso zero.
// Executa KnifeMeleeViewModel + AnimationMixer REAIS; fixture mínima isola
// a transição. Geometria/contato do GLB continuam cobrados nas fotos do jogo.
import * as THREE from 'three';
import { KnifeMeleeViewModel } from '../../public/js/meleevm.js';

const mutant = process.argv[2] || '';
if (process.argv.length > 3) throw new Error('use no máximo um mutante por execução');
if (mutant && !['--mutante=sem-clamp', '--mutante=evento-antigo'].includes(mutant)) throw new Error(`flag desconhecida: ${mutant}`);
const checks = [];
function create() {
  const scene = new THREE.Group();
  const hand = new THREE.Object3D(); hand.name = 'Hand'; scene.add(hand);
  scene.add(new THREE.PerspectiveCamera(32, 1.5, 0.01, 100));
  const animations = ['Idle', 'Draw', 'Slash', 'Stab'].map((name, i) => new THREE.AnimationClip(name,
    [2, 2 / 3, 11 / 15, 0.8][i], [new THREE.NumberKeyframeTrack('Hand.position[x]', [0, 0.1], [i + 1, i + 1])]));
  const vm = new KnifeMeleeViewModel({ parent: new THREE.Group() });
  vm._accept({ scene, animations }); vm.setWeapon('knife'); vm.update(0.1);
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
const ok = checks.every((c) => c.ok);
console.log(JSON.stringify({ ok, mutant: mutant || null, checks }, null, 2));
process.exitCode = ok ? 0 : 1;
