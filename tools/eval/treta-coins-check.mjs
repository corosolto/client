import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {THREE} from './harness.mjs';
import {GLTFLoader} from '../../public/vendor/addons/loaders/GLTFLoader.js';
if(process.argv.includes('--mutations')){
  for(const id of ['tiny-root','frozen-spin','missing-reveal']){const r=spawnSync(process.execPath,[new URL(import.meta.url).pathname,'--mutant='+id],{encoding:'utf8'});assert.notEqual(r.status,0,`surviving mutation: ${id}`);}
  console.log('PASS: 3/3 coin animation mutations detected');process.exit(0);
}
const mutation=process.argv.find(x=>x.startsWith('--mutant='))?.split('=')[1];
const loader=new GLTFLoader();let triangles=0;
for(const value of [1,5,10,50,100,200,1000]){
  const raw=fs.readFileSync(new URL(`../../public/models/treta/coin-${value}.glb`,import.meta.url));
  const g=await loader.parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
  const root=g.scene.getObjectByName(`TRETA_Coin_${value}`);assert(root,'Coin root exists');
  if(mutation==='tiny-root')root.scale.setScalar(.05);
  const size=new THREE.Box3().setFromObject(g.scene).getSize(new THREE.Vector3());
  assert.equal(Math.round(size.y),2,'Coin exports at its authored diameter, before animation');
  let meshes=0;g.scene.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count || o.geometry.attributes.position.count)/3;assert(o.material.metalness>0,'Coin uses metallic gold');});
  assert.equal(meshes,3,'Static geometry is joined into the three authored gold materials');
  const spin=g.animations.find(c=>c.name==='CoinSpin'),reveal=g.animations.find(c=>c.name==='PurchaseReveal');
  assert(spin && reveal && mutation!=='missing-reveal','Both user-facing animations exist');
  if(mutation==='frozen-spin')for(const t of spin.tracks){const n=t.getValueSize();for(let i=n;i<t.values.length;i++)t.values[i]=t.values[i%n];}
  const mixer=new THREE.AnimationMixer(g.scene);mixer.clipAction(spin).play();mixer.update(0);
  const before=root.quaternion.clone();mixer.update(.75);assert(before.angleTo(root.quaternion)>0,'The exported spin actually rotates in the engine');
  mixer.stopAllAction();const action=mixer.clipAction(reveal);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.update(0);
  const small=root.scale.length();mixer.update(.7);assert(root.scale.length()>small,'Purchase reveal actually expands in the engine');
  console.log(`PASS: T$ ${value}, 3 gold meshes, CoinSpin ${spin.duration.toFixed(2)}s / PurchaseReveal ${reveal.duration.toFixed(2)}s`);
}
console.log(`PASS: seven GLBs parsed by the vendored Three.js loader; ${Math.round(triangles)} total triangles`);
