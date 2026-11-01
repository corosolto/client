import assert from 'node:assert/strict';
import test from 'node:test';
import { THREE,MAPS,initTextures,carregaMapa } from '../tools/eval/harness.mjs';
await Promise.all(['campomorro','corrego','quebrada'].map(carregaMapa));
for(const [map,counts] of [['campomorro',{cat:2,chicken:2}],['corrego',{cat:1,chicken:1}],['quebrada',{cat:1}]])test(`${map}: all authored cats and hens use curated preloaded assets and bounded routes`,()=>{
 const world=MAPS[map].build(new THREE.Scene(),initTextures());
 try {
  for(const [type,count] of Object.entries(counts)){
   const animals=world.ambience.animals.filter(a=>a.type===type),id=type==='cat'?'escadaoCat':'sertaoHen';
   assert.equal(animals.length,count);assert.ok(MAPS[map].ambience.includes(id));
   for(const a of animals){assert.equal(a.root.userData.assetId,id);assert.ok(a.fleeArea);assert.equal(a.turnRate,6);}
  }
  if(map==='campomorro')for(const a of world.ambience.animals.filter(a=>a.type==='chicken'||a.id==='cat-1')){
   assert.equal(typeof a.heightAt,'function');
   for(let i=0;i<600;i++){world.ambience.update(1/60,null);const p=a.root.position;assert.ok(Math.abs(p.y-world.groundHeightAt(p.x,p.z))<1e-9);}
  }
 }finally{world.ambience.dispose();}
});
