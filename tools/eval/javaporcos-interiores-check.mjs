// Pedido31/10: abrigo em sobrados com escada/janela e mercearia aberta antes do saque.
import assert from 'node:assert/strict';
import {bootGame,initTextures,THREE} from './harness.mjs';
import {alturaOlhos} from '../../public/js/player_height.js';
const g=bootGame(process.env.MAP_ID||'invasao_javaporcos',{textures:initTextures(),seed:77}),w=g.world;
const mutant=process.argv.find(a=>a.startsWith('--mutante='))?.slice(10)||'';
assert.ok(['','porta-tampada','piso-falso','sem-teto','altura-falsa','escada-vazada','escada-sem-lateral','vizinha-invasora'].includes(mutant));
const failures=[];
function test(name,fn){try{fn();console.log('✓ INTERIOR '+name);}catch(e){failures.push(name);console.log('✗ INTERIOR '+name+': '+e.message);}}
const casas=w.root.userData.interiores||[];
if(mutant==='escada-sem-lateral')for(let i=w.colliders.length-1;i>=0;i--)if(w.colliders[i].escadaLateral)w.colliders.splice(i,1);
if(mutant==='vizinha-invasora')for(const c of casas)w.colliders.push({minX:c.x+1,maxX:c.x+1.4,minZ:c.z-.4,maxZ:c.z+.4,minY:c.y,maxY:c.y+2.5});
if(mutant==='escada-vazada'){const original=w.groundHeightAt;w.groundHeightAt=(x,z,y)=>y===undefined?w.campo?.amostra?.(x,z)??0:original(x,z,y);}
test('dois sobrados têm entrada, escada e janela realmente vazados',()=>{
 assert.ok(casas.length>=2,`${casas.length} casas acessíveis; esperado pelo menos dois abrigos`);
 g.scene.updateMatrixWorld(true);
 for(const c of casas){
  const world=(x,y,z)=>new THREE.Vector3(c.x+x*Math.cos(c.ry)+z*Math.sin(c.ry),c.y+y,c.z-x*Math.sin(c.ry)+z*Math.cos(c.ry));
  if(mutant==='porta-tampada'){
   const wall=new THREE.Mesh(new THREE.BoxGeometry(2,2.5,.3),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
   wall.position.copy(world(0,1.25,c.d/2));wall.rotation.y=c.ry;g.scene.add(wall);w.occluders.push(wall);wall.updateMatrixWorld(true);
  }
  for(const [x,y] of [[0,1.3],[0,4.6]]){
   const a=world(x,y,c.d/2+1),b=world(x,y,c.d/2-1);
   const ray=new THREE.Raycaster(a,b.clone().sub(a).normalize(),0,1.95);
   assert.equal(ray.intersectObjects(w.occluders,false).length,0,`vão tampado a ${y}m`);
  }
  for(const step of c.escada){
   const p=world(step.x,step.y,step.z);
   assert.ok(Math.abs(w.groundHeightAt(p.x,p.z,p.y+.01)-p.y)<.03,'degrau visual sem piso físico');
  }
 }
});
test('sala térrea não invade casa vizinha nem muro',()=>{
 assert.ok(casas.length>=2);
 for(const c of casas){const cs=Math.cos(c.ry),sn=Math.sin(c.ry);
  for(const lx of [.8,1.2,1.7])for(const lz of [-.5,0,.5]){const x=c.x+lx*cs+lz*sn,z=c.z-lx*sn+lz*cs,p=new THREE.Vector3(x,c.y+.06,z);g._collide(p,.38);assert.ok(Math.hypot(p.x-x,p.z-z)<.01,'vizinha ou muro invade a sala');}
 }
});
test('degraus definem chão padrão e bloqueiam entrada lateral alta',()=>{
 g.state='live';g.paused=false;g.scene.updateMatrixWorld(true);
 assert.ok(casas.length>=2,'sem interiores');
 for(const c of casas){
  const cs=Math.cos(c.ry),sn=Math.sin(c.ry);
  for(const d of c.escada){const x=c.x+d.x*cs+d.z*sn,z=c.z-d.x*sn+d.z*cs;const h=w.groundHeightAt(x,z);assert.ok(Math.abs(h-c.y-d.y)<.03,'consulta padrão permite corpo dentro da escada');const ray=new THREE.Raycaster(new THREE.Vector3(x,h+1.4,z),new THREE.Vector3(0,-1,0),0,1.39),hit=ray.intersectObject(w.root,true)[0];assert.ok(!hit||hit.point.y-h<=.3,`corpo dentro da geometria da escada: degrau${d.y}, ${hit?.object.name}, excesso${hit?.point.y-h}`);}
  const d=c.escada[14],p=g.player;
  p.pos.set(c.x+(d.x+1.2)*cs+d.z*sn,c.y+.06,c.z-(d.x+1.2)*sn+d.z*cs);p.vel.set(0,0,0);p.grounded=true;p.yaw=0;p.crouchF=0;p._spaceHeld=false;p.jumpBufferedUntil=0;
  for(let i=0;i<60;i++){g.time+=1/120;g._moveEntity(p,{ax:-cs,az:sn,jump:false,crouch:false,sprint:false},1/120);}
  const lx=(p.pos.x-c.x)*cs-(p.pos.z-c.z)*sn;
  assert.ok(lx>=d.x+d.hx+.38-.01,'corpo atravessa lateral dos degraus altos');assert.ok(lx<d.x+1.15,'não houve aproximação da lateral');assert.ok(p.pos.y<c.y+.2,'entrada lateral teleporta para cima');
 }
});
test('piso superior sustenta queda do player real',()=>{
 assert.ok(casas.length>=2,'sem interiores para medir');
 const original=w.groundHeightAt;
 if(mutant==='piso-falso')w.groundHeightAt=(x,z)=>original(x,z,0);
 try { for(const c of casas){
  const x=c.x+.5*Math.cos(c.ry),z=c.z-.5*Math.sin(c.ry),y=c.y+3;
  for(const hz of [30,60,120]){
   const p=g.player;p.pos.set(x,y+.5,z);p.vel.set(0,-1,0);p.grounded=false;
   for(let i=0;i<hz;i++)g._moveEntity(p,{ax:0,az:0,jump:false,crouch:false,sprint:false},1/hz);
   assert.ok(Math.abs(p.pos.y-y)<.03,`piso não sustenta a ${hz}Hz: ${p.pos.y} vs ${y}`);
  }
 } } finally {w.groundHeightAt=original;}
});
test('jogador sobe a escada e alcança a janela sem teleporte',()=>{
 assert.ok(casas.length>=2,'sem interiores');g.state='live';g.paused=false;
 for(const c of casas){
  const p=g.player,world=(x,z)=>({x:c.x+x*Math.cos(c.ry)+z*Math.sin(c.ry),z:c.z-x*Math.sin(c.ry)+z*Math.cos(c.ry)});
  const a=world(c.escada[0].x,c.d/2-.25);p.pos.set(a.x,c.y+.06,a.z);p.vel.set(0,0,0);p.grounded=true;p.yaw=0;
  for(const local of [[c.escada[0].x,-c.d/2+.75],[0,-c.d/2+.75],[0,c.d/2-.65]]){
   const t=world(...local);
   for(let i=0;i<480;i++){const dx=t.x-p.pos.x,dz=t.z-p.pos.z;if(Math.hypot(dx,dz)<.09)break;g.time+=1/120;g._moveEntity(p,{ax:dx,az:dz,jump:false,crouch:false,sprint:false},1/120);}
   assert.ok(Math.hypot(t.x-p.pos.x,t.z-p.pos.z)<.12,'escada ou patamar bloqueia o corpo');
   assert.ok(Math.abs(p.pos.y-c.y-3)<.03,`chegou pelo térreo: y=${p.pos.y}`);
  }
 }
});
test('salto sob loft respeita teto sem expulsar lateralmente',()=>{
 assert.ok(casas.length>=2,'sem interiores');g.state='live';g.paused=false;
 const original=w.ceilingHeightAt;if(mutant==='sem-teto')w.ceilingHeightAt=()=>Infinity;
 try {for(const c of casas){
  const p=g.player,x=c.x+.5*Math.cos(c.ry),z=c.z-.5*Math.sin(c.ry);
  p.pos.set(x,c.y+.06,z);p.vel.set(0,0,0);p.grounded=true;p._spaceHeld=false;p.jumpBufferedUntil=0;
  let max=p.pos.y,desvio=0;
 for(let i=0;i<240;i++){g.time+=1/120;g._moveEntity(p,{ax:0,az:0,jump:i===0,crouch:false,sprint:false},1/120);max=Math.max(max,p.pos.y);desvio=Math.max(desvio,Math.hypot(p.pos.x-x,p.pos.z-z));assert.ok(p.pos.y+alturaOlhos(p.crouchF)<c.y+2.84,'olho atravessou teto');}
  assert.ok(desvio<.01,`teto expulsou ${desvio.toFixed(3)}m`);
  assert.ok(max+alturaOlhos(0)<c.y+2.84,`cabeça atravessou teto: pés a ${max}`);
  p.pos.set(x,c.y+.06,z);p.vel.set(0,0,0);p.grounded=true;p.crouchF=1;p._spaceHeld=false;
  for(let i=0;i<240;i++){g.time+=1/120;g._moveEntity(p,{ax:0,az:0,jump:i===0,crouch:i<45,sprint:false},1/120);assert.ok(p.pos.y+alturaOlhos(p.crouchF)<c.y+2.84,'soltar agachamento atravessa teto');}
 }} finally {w.ceilingHeightAt=original;}
});
test('mercearia aberta e polos de alimento alcançáveis',()=>{
 const loja=w.lojas.find(l=>l.papel==='mercearia');assert.equal(loja.aberta,true);
 const spot=w.foodSpots.find(s=>s.loja==='mercearia');assert.ok(spot&&!spot.porta,'mercearia ainda exige arrombamento');
 assert.equal(w.foodMesh(spot.id).getObjectByName('porta-fechada'),undefined);
 const extras=w.foodSpots.filter(s=>s.id.startsWith('alimento-'));assert.ok(extras.length>=4);
 if(mutant==='altura-falsa')for(const s of extras)w.foodMesh(s.id).scale.y*=1.6;
 for(const s of [spot,...extras]){const n=w.waypoints.nodes[w.nearestWaypoint(s.x,s.z)];assert.ok(Math.hypot(n.x-s.x,n.z-s.z)<=s.r,`${s.id}: inacessível`);}
 for(const s of extras){const box=new THREE.Box3().setFromObject(w.foodMesh(s.id)),col=w.foodCollider(s.id);assert.ok(Math.abs(box.max.y-col.maxY)<.02,`${s.id}: alimento visual não coincide com piso físico`);}
});
const expected={'porta-tampada':'dois sobrados','piso-falso':'piso superior','sem-teto':'salto sob loft','altura-falsa':'mercearia aberta','escada-vazada':'degraus definem','escada-sem-lateral':'degraus definem','vizinha-invasora':'sala térrea'}[mutant];
process.exitCode=mutant?(failures.length===1&&failures[0].startsWith(expected)?0:1):(failures.length?1:0);
