#!/usr/bin/env node
// Movimento D aprovado em 05/09: quick/heavy distintos, sem duplicar avanço.
import * as THREE from 'three';
import { KnifeMeleeViewModel } from '../../public/js/meleevm.js';
const mutant = process.argv.includes('--mutante=mesmo-golpe');
const scene = new THREE.Group();
scene.add(new THREE.PerspectiveCamera(32, 1.5, 0.01, 100));
const hand = new THREE.Object3D(); hand.name = 'Hand'; scene.add(hand);
const names = ['Idle', 'Draw', 'Slash', 'Stab', 'QuickThrust', 'HeavyStab'];
const animations = names.map((name, i) => new THREE.AnimationClip(name, 1,
  [new THREE.NumberKeyframeTrack('Hand.position[x]', [0, 1], [i, i])]));
const vm = new KnifeMeleeViewModel({ parent: new THREE.Group() });
vm._accept({ scene, animations }); vm.setWeapon('knife'); vm.update(0.1);
if (mutant) vm.attack = function () { return this._play('Stab', 0.36); };
const checks = [];
for (const [kind, expected, duration] of [['quick', 'QuickThrust', 0.36], ['heavy', 'HeavyStab', 0.62]]) {
  vm.attack(kind); vm.update(0.1);
  checks.push({ name: `${kind}: clipe próprio aprovado`, ok: vm.state === expected, actual: vm.state });
  checks.push({ name: `${kind}: duração aprovada`, ok: Math.abs(vm.current.getClip().duration / vm.current.getEffectiveTimeScale() - duration) < 1e-9 });
  checks.push({ name: `${kind}: não soma deslocamento procedural ao clipe`, ok: vm.packageRoot.position.distanceTo(vm.basePosition) < 1e-9 });
}
const ok = checks.every((c) => c.ok);
console.log(JSON.stringify({ ok, mutant, checks }, null, 2));
process.exitCode = ok ? 0 : 1;
