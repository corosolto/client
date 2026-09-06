import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {THREE,bootGame,initTextures} from './harness.mjs';
const g=bootGame('escadao',{textures:initTextures(),ctf:true,seed:8012}),w=g.world,p=g.player;
const out=process.env.OUT||'artifacts/escadao-visual/r5/contour';mkdirSync(out,{recursive:true});g.scene.updateMatrixWorld(true);
const ray=new THREE.Raycaster(),trace=[];
const body=()=>{ray.set(p.pos.clone().add(new THREE.Vector3(0,.32,0)),new THREE.Vector3(0,1,0));ray.far=1.3;const hits=ray.intersectObjects([w.root],true).filter(h=>h.object.visible&&h.object.material?.visible!==false&&!h.object.userData.nonCollider&&!h.object.userData.nonSolidSurface);assert.equal(hits.length,0,'Corpo/cabeça não pode entrar no beiral');};
try {
 for(const x of [-16.4,16.4]) {
  p.pos.set(x,0,8);p.vel.set(0,0,0);p.grounded=true;p.mantle=null;p.crouchF=0;p.jumpBufferedUntil=0;p.coyoteUntil=0;
  for(const z of [-8,8]) {
   let frames=0;while(Math.abs(p.pos.z-z)>.15&&frames++<450){p.yaw=p.pos.z>z?0:Math.PI;g.time+=1/60;g._moveEntity(p,{ax:0,az:-1,jump:false,crouch:false,shift:false},1/60);body();trace.push(p.pos.toArray());}
   assert.ok(frames<450,`Lateral sem destino: ${p.pos.toArray()} rumo ${x},${z}`);
   assert.ok(Math.abs(p.pos.y-(z<0?7.56:0))<.02,'Chega ao mirante e retorna à rua');
  }
  p.pos.set(x,w.groundHeightAt(x,1),1);p.vel.set(0,0,0);p.grounded=true;let apex=0;const y=p.pos.y;
  for(let i=0;i<70;i++){g.time+=1/60;g._moveEntity(p,{ax:0,az:0,jump:i===0,crouch:false,shift:false},1/60);body();apex=Math.max(apex,p.pos.y-y);}
  assert.ok(apex>.5&&p.grounded,'Pulo sob o sobrado conserva folga e pouso');
 }
 console.log(`CONTOUR PASS: ${trace.length} posições; ambos os lados ligam rua/mirante, retorno e pulo livres`);
} finally {writeFileSync(`${out}/trace.json`,JSON.stringify({trace,final:p.pos.toArray()},null,2));}
