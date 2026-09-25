#!/usr/bin/env node
// Mesmo FOV horizontal das armas autoradas ao mudar de aspecto; chama Game.onResize.
import { THREE, Game } from './harness.mjs';
import { KnifeMeleeViewModel } from '../../public/js/meleevm.js';
const scene=new THREE.Group();scene.add(new THREE.PerspectiveCamera(45,1.5,.01,100));
const animations=['Idle','Draw','Slash','Stab','QuickThrust','HeavyStab'].map(n=>new THREE.AnimationClip(n,1,[]));
const vm=new KnifeMeleeViewModel({parent:new THREE.Group()});vm._accept({scene,animations});vm.setWeapon('knife');
const game={camera:new THREE.PerspectiveCamera(),vmCamera:new THREE.PerspectiveCamera(),vm:{melee:vm},player:{weapon:'knife'}};
const samples=[];
for(const height of [960,810,648]){
  globalThis.innerWidth=1440;globalThis.innerHeight=height;
  Game.prototype.onResize.call(game);
  if(process.argv.includes('--mutante=fov-fixo')){game.vmCamera.fov=45;game.vmCamera.updateProjectionMatrix();}
  const p=new THREE.Vector3(.2,-.1,-.8).project(game.vmCamera);
  samples.push({height,fov:game.vmCamera.fov,x:(p.x+1)*720});
}
const checks=[
  {name:'câmera exportada dita lente de referência',ok:Math.abs(samples[0].fov-45)<1e-8},
  {name:'resize mantém tamanho horizontal em 3:2,16:9,20:9',ok:samples.every(s=>Math.abs(s.x-samples[0].x)<1e-8),samples},
];
vm.dispose();const ok=checks.every(c=>c.ok);console.log(JSON.stringify({ok,checks},null,2));process.exitCode=ok?0:1;
