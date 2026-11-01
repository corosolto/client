import assert from 'node:assert/strict';
import test from 'node:test';
import { THREE } from '../tools/eval/harness.mjs';
import { createFavelaAmbience } from '../public/js/ambientlife.js';

const heightAt = (x,z) => .4 + .06*x + .03*z + .02*Math.sin(x*2);
function build(extra={}) {
 return createFavelaAmbience(new THREE.Group(),{map:'support-test',cats:[{pos:[0,heightAt(0,0),0],to:[1,heightAt(1,1),1],turnRate:6,speed:{walk:.55,flee:1.5},fleeArea:{minX:-1,maxX:2,minZ:-1,maxZ:2},heightAt,...extra}]});
}
function assertSupported(animal) {
 const p=animal.root.position;
 assert.ok(Math.abs(p.y-heightAt(p.x,p.z))<1e-9,`support missed at ${p.toArray()}`);
}
test('authored height follows the real controller through walk, scare and return',()=>{
 const controller=build(),animal=controller.animals[0],states=new Set();
 try {
  controller.reset(); assertSupported(animal);
  for(let i=0;i<1800;i++) {
   if(i===180||i===900){const p=animal.root.position;controller.onShot(new THREE.Vector3(p.x-1,p.y,p.z-.7),p.clone());}
   controller.update(1/60,null);states.add(animal.state);assertSupported(animal);
  }
  for(const state of ['walk','flee','recover','idle'])assert.ok(states.has(state),state+' not exercised');
 } finally {controller.dispose();}
});
test('removing height projection makes the spatial support oracle fail',()=>{
 const controller=build({heightAt:null}),animal=controller.animals[0];
 try {for(let i=0;i<240;i++)controller.update(1/60,null);assert.throws(()=>assertSupported(animal),/support missed/);}
 finally{controller.dispose();}
});
test('legacy flat routes keep their authored Y when there is no height function',()=>{
 const controller=build({heightAt:null,pos:[0,3.1,0],to:[1,3.1,1]}),animal=controller.animals[0];
 try {for(let i=0;i<900;i++){controller.update(1/60,null);assert.equal(animal.root.position.y,3.1);}}
 finally {controller.dispose();}
});
test('reset clears previous escape recovery state for legacy and supported routes',()=>{
 for(const extra of [{},{heightAt:null}]) {
  const controller=build(extra),a=controller.animals[0];
  try {
   a.recoverUntil=100;a.recoverFrom.set(99,99,99);a.alertUntil=100;
   controller.reset();assert.equal(a.alertUntil,0);assert.equal(a.recoverUntil,.8);assert.deepEqual(a.recoverFrom,a.origin);
  }finally{controller.dispose();}
 }
});
test('invalid authored height functions fail before placement and during movement',()=>{
 for(const heightAt of [1,()=>NaN,()=>Infinity])assert.throws(()=>build({heightAt}),/ambient_height_at/);
 const controller=build(),a=controller.animals[0];
 try{a.heightAt=()=>NaN;assert.throws(()=>controller.update(1/60,null),/ambient_height_at/);}
 finally{controller.dispose();}
});
