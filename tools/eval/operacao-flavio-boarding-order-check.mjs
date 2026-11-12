import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OperacaoFlavio} from '../../public/js/mode_operacao_flavio.js';
import './harness.mjs';

const plane = new THREE.Group(), root = new THREE.Group();
plane.position.set(0,.08,55); root.add(plane);
const vip = {team:'B',pos:new THREE.Vector3(),_meshWeapon:'knife',alive:true};
const game = {bots:[vip],world:{root,objectivePlane:plane,escortPath:[{x:0,z:0},{x:0,z:8}],groundHeightAt:()=>.08},
  online:true,dedicated:false,time:10,state:'roundEnd',stateUntil:500,camera:new THREE.PerspectiveCamera(75,1.5,.1,300),
  el:{},vmScene:{visible:true},_trocarPersonagem(){},_syncRemoteWeapon(){}};
let now = 100000;
const descriptor = Object.getOwnPropertyDescriptor(globalThis,'performance');
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
const mode = new OperacaoFlavio(game,{}), failed = [], rows = [];
const check = (clause,fn) => {try{fn();rows.push({clause,pass:true});}catch(error){rows.push({clause,pass:false});failed.push({clause,type:error.name,message:error.message});}};
try {
 mode.prepareRound();mode.startCinematic('B');
 now+=3600;mode.updatePresentation();
 check('taxi waits for boarding and door phase',()=>assert.equal(plane.position.z,55,'plane must remain still during boarding'));
 now+=1700;mode.updatePresentation();
 check('plane remains still until actor is inside',()=>assert.equal(plane.position.z,55,'plane must remain still before door closes'));
 now+=2700;mode.updatePresentation();
 check('fallback taxi occurs within nine real seconds',()=>assert(plane.position.z>55));
 check('presentation preserves authoritative deadline',()=>assert.equal(game.stateUntil,500));
 mode.prepareRound();mode.startCinematic('E');now+=8000;mode.updatePresentation();
 check('E victory never taxis',()=>assert.equal(plane.position.z,55));
} finally {
 mode.dispose();Object.defineProperty(globalThis,'performance',descriptor);
}
console.log(JSON.stringify({cases:rows.length,rows,failed}));
if(failed.length)process.exitCode=1;
