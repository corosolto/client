import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {THREE,bootGame,initTextures} from './harness.mjs';
const g=bootGame('escadao',{textures:initTextures(),ctf:true,seed:8012}),w=g.world,p=g.player;
const out=process.env.OUT||'artifacts/escadao-visual/r5/passages';mkdirSync(out,{recursive:true});
if(process.argv.includes('--mutante=sem-terreo')){const original=w.groundHeightAt;w.groundHeightAt=(x,z)=>original(x,z);}
const route=[[-6,19],[-6,11],[-6,8.5],[8,8.5],[8,6.22],[15.75,6.22],[15.75,20]];
const trace=[];p.pos.set(route[0][0],0,route[0][1]);p.vel.set(0,0,0);p.grounded=true;p.mantle=null;p.crouchF=0;p.jumpBufferedUntil=0;p.coyoteUntil=0;
try {
 for(const [x,z] of [...route.slice(1),...route.slice(0,-1).reverse()]) {
  let frames=0;
  while(Math.hypot(p.pos.x-x,p.pos.z-z)>.15&&frames++<400){p.yaw=Math.atan2(p.pos.x-x,p.pos.z-z);g.time+=1/60;g._moveEntity(p,{ax:0,az:-1,jump:false,crouch:false,shift:false},1/60);trace.push(p.pos.toArray());}
  assert.ok(frames<400,`Passagem bloqueada: ${p.pos.toArray()} rumo ${x},${z}`);
  assert.ok(Math.abs(p.pos.y)<.02,'Travessia inferior não sobe à laje');
 }
 for(const [x,z] of [[-6,8.5],[0,8.5],[8,8.5],[12,6.22]]) {
  assert.equal(w.groundHeightAt(x,z,0),0,'Térreo disponível');assert.equal(w.groundHeightAt(x,z,2.52),2.52,'Laje superior preservada');
  const below=w.nearestWaypoint(x,z,0),above=w.nearestWaypoint(x,z,2.52);
  assert.notEqual(below,above,'Grafo distingue as duas camadas');assert.ok(Math.abs(w.waypoints.nodes[below].y)<.02);
 }
 g.scene.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();
 for(let i=1;i<route.length;i++)for(const h of [.4,1,1.5]) {
  const a=new THREE.Vector3(route[i-1][0],h,route[i-1][1]),b=new THREE.Vector3(route[i][0],h,route[i][1]);
  ray.set(a,b.clone().sub(a).normalize());ray.far=a.distanceTo(b)-.01;
  const hits=ray.intersectObjects([w.root],true).filter(hit=>hit.object.visible&&hit.object.material?.visible!==false&&!hit.object.userData.nonCollider&&!hit.object.userData.nonSolidSurface);
  assert.equal(hits.length,0,'Percurso inferior não atravessa a geometria visível');
 }
 console.log(`PASSAGES PASS: ${trace.length} posições, ida/volta inferior, laje e grafo separados`);
} finally {writeFileSync(`${out}/trace.json`,JSON.stringify({trace,final:p.pos.toArray()},null,2));}
