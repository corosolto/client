// Relato 31/10: bando perdido, lixo depois da rota e mesma saída por lado.
import assert from 'node:assert/strict';
import {bootGame, initTextures, THREE} from './harness.mjs';
import {escolherAlvo} from '../../public/js/mode_javaporcos.js';
const g=bootGame('invasao_javaporcos',{textures:initTextures(),seed:77}), m=g.objective;
const mutant=process.argv.find(a=>a.startsWith('--mutante='))?.slice(10)||'';
assert.ok(['','lixo-depois','entrada-fixa','sem-ataque'].includes(mutant));
m.state.mutante=mutant;
const falhas=[];
function test(name,fn){try{fn();console.log('✓ INTENCAO '+name);}catch(e){falhas.push(name);console.log('✗ INTENCAO '+name+': '+e.message);}}
test('lixo próximo interrompe rota e mantém foco diante de humano não provocador',()=>{
 const spot={id:'qa',x:0,z:3,hp:100},world={cityBounds:{minX:-30,maxX:30,minZ:-30,maxZ:30},foodSpots:[spot]};
 const bot={pos:{x:0,y:0,z:0},_boarPlano:[{x:20,z:20,chave:'r:qa'}],_boarPasso:0};
 const ctx={world,state:m.state,tempo:1,jogadores:[{alive:true,pos:{x:5,y:0,z:0}}]};
 assert.equal(escolherAlvo(bot,ctx).kind,'comida');
 bot._boarAlertaAte=5;assert.equal(escolherAlvo(bot,ctx).kind,'jogador');
 bot._boarAlertaAte=0;ctx.jogadores[0].pos.x=1;assert.equal(escolherAlvo(bot,ctx).kind,'jogador');
 ctx.jogadores=[];escolherAlvo(bot,ctx);m.state.foodHp.qa=0;
 assert.notEqual(escolherAlvo(bot,ctx).kind,'rota','volta ao waypoint antigo depois da refeição');
});
test('cada frente usa saídas diferentes e navegáveis entre ondas',()=>{
 for(let f=0;f<m.horda.frentes.length;f++){
  const pts=new Set();
  for(let wave=1;wave<=8;wave++){
   m.state.wave=wave;const a={id:`${wave}.0`,entrance:f,type:'adulto',hp:100};
   m.assignar(a);const b=m.slots.get(a.id);assert.ok(b);
   pts.add(`${b.pos.x},${b.pos.z}`);
   const n=g.world.waypoints.nodes[g.world.nearestWaypoint(b.pos.x,b.pos.z)];
   assert.ok(Math.hypot(n.x-b.pos.x,n.z-b.pos.z)<.1,'saída fora do grafo');m.desativar(b);
  }
  assert.ok(pts.size>=4,`frente ${f}: ${pts.size} saídas em oito ondas`);
 }
});
test('mordida produz golpe visual e zera movimento',()=>{
 const b={pos:new THREE.Vector3(0,0,0),vel:new THREE.Vector3(1,0,1),yaw:0,alive:true,_boarAttackAt:0,_boarId:'qa',_objectiveNpc:'javaporco',_boarType:'adulto',_boarVisual:new THREE.Group()};
 const player={alive:true,pos:new THREE.Vector3(0,0,1)};
 m.contexto=()=>({world:g.world,state:m.state,jogadores:[player],tempo:2});g.time=2;g._damage=()=>{};
 m.updateBot(b,.016);g.time=2.12;m.atualizaVisual(b);
 assert.ok(Math.abs(b._boarVisual.rotation.x)>.05,'ataque sem pose');
 assert.equal(b.vel.length(),0,'continua patinando durante golpe');
});
test('arsenal extra cobre o entorno sem retirar os armários',()=>{
 assert.ok(g.world.pickups.length>=12);
 const quadrantes=new Set();
 for(const pk of g.world.pickups){const n=g.world.waypoints.nodes[g.world.nearestWaypoint(pk.x,pk.z)];assert.ok(Math.hypot(n.x-pk.x,n.z-pk.z)<.1);quadrantes.add(`${Math.sign(pk.x)},${Math.sign(pk.z)}`);}
 assert.ok(quadrantes.size>=4);assert.ok(g.drops.length>=38,'armários originais desapareceram');
});
test('salto real passa de dois metros e aterrissa no chão',()=>{
 const p=g.player;g.state='live';g.paused=false;p.pos.set(0,g.world.groundHeightAt(0,0,0),0);p.vel.set(0,0,0);p.grounded=true;p._spaceHeld=false;
 const base=p.pos.y;let max=base;
 for(let i=0;i<240;i++){g.time+=1/120;g._moveEntity(p,{ax:0,az:0,jump:i===0,crouch:false,sprint:false},1/120);max=Math.max(max,p.pos.y);}
 assert.ok(max-base>2,`salto ${max-base}m`);assert.ok(Math.abs(p.pos.y-base)<.02);
});
test('telhado visível e superfície física coincidem e sustentam o player',()=>{
 g.scene.updateMatrixWorld(true);
 const roofs=g.world.root.userData.coberturas;assert.ok(roofs?.length);
 for(const r of roofs.slice(0,4)){
  const x=r.x+.6,z=r.z+.4;
  const ray=new THREE.Raycaster(new THREE.Vector3(x,20,z),new THREE.Vector3(0,-1,0),0,30);
  const hits=ray.intersectObjects(g.world.occluders,false).filter(h=>h.object.name==='telhado-lote');assert.ok(hits.length);
  const y=hits[0].point.y;assert.ok(Math.abs(g.world.groundHeightAt(x,z,y)-y)<.03,`telha y=${y} física=${g.world.groundHeightAt(x,z,y)}`);
  for(const hz of [20,30,60,120]){
   const p=g.player;p.pos.set(x,y+4,z);p.vel.set(0,-6,0);p.grounded=false;
   for(let i=0;i<hz*2;i++){g.time+=1/hz;g._moveEntity(p,{ax:0,az:0,jump:false,crouch:false,sprint:false},1/hz);}
   assert.ok(Math.abs(p.pos.y-y)<.03,`caiu através da telha a ${hz}Hz`);
  }
 }
});
const esperada={'lixo-depois':'lixo próximo','entrada-fixa':'cada frente','sem-ataque':'mordida'}[mutant];
process.exitCode=mutant?(falhas.length===1&&falhas[0].startsWith(esperada)?0:1):(falhas.length?1:0);
