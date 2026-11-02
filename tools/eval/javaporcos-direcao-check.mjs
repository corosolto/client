// Relato 31/10: trajetos ortogonais e viradas instantâneas deixam a horda previsível.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bootGame,initTextures,THREE} from './harness.mjs';
import {prepararPassada,liberarPassada} from '../../public/js/javaporcos_passada.js';
import {reservarPlano} from '../../public/js/javaporcos_direcao.js';
const mutant=process.argv.find(a=>a.startsWith('--mutante='))?.slice(10)||'';
assert.ok(['','grade-rigida','sem-flanco','corpo-rigido','sem-separacao','ordem-fixa'].includes(mutant));
let agendar=reservarPlano;
if(mutant==='ordem-fixa'){
 const source=readFileSync(new URL('../../public/js/javaporcos_direcao.js',import.meta.url),'utf8');
 const quebrado=source.replace('||primeiro!==pedido','');assert.notEqual(quebrado,source,'MUTANTE NÃO APLICOU: guarda FIFO ausente');
 agendar=(await import('data:text/javascript;base64,'+Buffer.from(quebrado).toString('base64'))).reservarPlano;
}
const g=bootGame('invasao_javaporcos',{textures:initTextures(),seed:77}),m=g.objective;
m.state.mutante=mutant;
const failures=[];const test=(name,fn)=>{try{fn();console.log('✓ DIRECAO '+name);}catch(e){failures.push(name);console.log('✗ DIRECAO '+name+': '+e.message);}};
const originalWorld=g.world;
function mundo(muro=false){
 const colliders=muro?[{minX:-.5,maxX:.5,minZ:-5,maxZ:5,minY:0,maxY:4}]:[],nodes=[],adj=[],ids=new Map();
 for(let x=-15;x<=15;x++)for(let z=-15;z<=15;z++){if(muro&&Math.abs(x)<1&&Math.abs(z)<6)continue;ids.set(`${x},${z}`,nodes.length);nodes.push({x,z});adj.push([]);}
 for(let i=0;i<nodes.length;i++)for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const j=ids.get(`${nodes[i].x+dx},${nodes[i].z+dz}`);if(j!=null)adj[i].push(j);}
 return {colliders,bounds:{minX:-20,maxX:20,minZ:-20,maxZ:20},groundHeightAt:()=>0,waypoints:{nodes,adj},nearestWaypoint(x,z){let id=-1,dist=Infinity;for(let i=0;i<nodes.length;i++){const n=nodes[i],d=(x-n.x)**2+(z-n.z)**2;if(d<dist){id=i;dist=d;}}return id;}};
}
function bicho(id,x,z,yaw){return {pos:new THREE.Vector3(x,0,z),vel:new THREE.Vector3(),yaw,alive:true,grounded:true,crouchF:0,weapon:'knife',_objectiveNpc:'javaporco',_boarId:`qa.${id}`,_boarType:'adulto',_boarJitter:(id*.37)%1};}
function visualRigado(){const visual=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,2,4,8,8),new THREE.MeshBasicMaterial());mesh.position.y=.5;visual.add(mesh);prepararPassada(visual);return visual;}
function trajeto({wall=false,id=1,player=false,velocity=.8}={}){
 g.world=mundo(wall);m.campos.clear();g.time=1;const b=bicho(id,-10,-10,Math.PI/4);m.boars=[b];const target={x:10,z:10,chave:'qa',kind:player?'jogador':'setor',distance:30,ent:{pos:new THREE.Vector3(10,0,10),vel:new THREE.Vector3(velocity,0,0)}};
 let turn=0,path=0,minWall=Infinity;const pts=[];
 for(let i=0;i<1440;i++){g.time+=1/120;m.orcamentoCampo=1;const x=b.pos.x,z=b.pos.z,yaw=b.yaw;target.distance=Math.hypot(10-x,10-z);if(target.distance<1.5)break;m.moverPara(b,target,1/120);path+=Math.hypot(b.pos.x-x,b.pos.z-z);turn=Math.max(turn,Math.abs(Math.atan2(Math.sin(b.yaw-yaw),Math.cos(b.yaw-yaw)))*120);if(wall&&Math.abs(b.pos.z)<5)minWall=Math.min(minWall,Math.abs(b.pos.x));pts.push([b.pos.x,b.pos.z]);}
 return {b,turn,path,minWall,pts,distance:Math.hypot(10-b.pos.x,10-b.pos.z)};
}
test('campo ortogonal vira percurso contínuo e chega ao destino',()=>{const r=trajeto();console.log(JSON.stringify({turnRadSec:r.turn,path:r.path,distance:r.distance}));assert.ok(r.distance<1.6,'não chegou');assert.ok(r.turn<=5.01,`curva instantânea ${r.turn.toFixed(2)}rad/s`);assert.ok(r.path<34,`desvio desperdiça ${r.path.toFixed(2)}m`);});
test('atalho respeita muro e alcança o outro lado',()=>{const r=trajeto({wall:true});console.log(JSON.stringify({wallMin:r.minWall,distance:r.distance}));assert.ok(r.minWall>=.86,'cápsula atravessa muro');assert.ok(r.distance<1.6,'não contornou');});
test('ataque aproxima por flancos distintos e antecipa o jogador em movimento',()=>{const a=trajeto({id:1,player:true}),b=trajeto({id:2,player:true}),still=trajeto({id:1,player:true,velocity:0});let separation=0,lead=0;for(let i=0;i<Math.min(a.pts.length,b.pts.length);i++)separation=Math.max(separation,Math.hypot(a.pts[i][0]-b.pts[i][0],a.pts[i][1]-b.pts[i][1]));for(let i=0;i<Math.min(a.pts.length,still.pts.length);i++)lead=Math.max(lead,Math.hypot(a.pts[i][0]-still.pts[i][0],a.pts[i][1]-still.pts[i][1]));console.log(JSON.stringify({flankSeparation:separation,lead}));assert.ok(separation>1,'todos atacam na mesma linha');assert.ok(lead>.15,'velocidade do jogador não altera aproximação');assert.ok(a.distance<1.6&&b.distance<1.6,'flanco impede aproximação');});
test('grupo mantém avanço com espaço entre os corpos',()=>{
 g.world=mundo();m.campos.clear();g.time=1;const bs=[-.4,0,.4].map((x,i)=>bicho(i,x,0,0));for(const b of bs)b._boarJitter=0;m.boars=bs;
 for(let i=0;i<180;i++){g.time+=1/120;m.orcamentoCampo=1;for(const b of bs)m.moverPara(b,{x:0,z:15,chave:'grupo',kind:'setor',distance:15-b.pos.z},1/120);}
 const spacing=Math.min(bs[0].pos.distanceTo(bs[1].pos),bs[1].pos.distanceTo(bs[2].pos)),spread=bs[0].pos.distanceTo(bs[2].pos);
 console.log(JSON.stringify({spacing,spread,progress:bs.map(b=>b.pos.z)}));assert.ok(spacing>.55,'corpos sobrepostos');assert.ok(spread<4,'separação dissolveu o grupo');assert.ok(bs.every(b=>b.pos.z>6),'bando parou');
});
test('corpo acompanha passada real e para sem deriva',()=>{g.world=mundo();const b=bicho(1,0,0,0);b._boarVisual=visualRigado();let min=Infinity,max=-Infinity;
 // Rig sintético: patas dos GLBs reais continuam na régua própria de navegador.
 g.time=1;m.atualizaVisual(b);
 for(let i=0;i<240;i++){g.time+=1/60;b.pos.z+=.06;m.atualizaVisual(b);min=Math.min(min,b._boarVisual.rotation.z);max=Math.max(max,b._boarVisual.rotation.z);}
 assert.ok(max-min>.015,`corpo rígido: amplitude ${max-min}`);for(let i=0;i<180;i++){g.time+=1/60;m.atualizaVisual(b);}assert.ok(Math.abs(b._boarVisual.position.y-b.pos.y)<.001,'pose continua saltando parado');liberarPassada(b._boarVisual);});
test('balanço corporal preserva duas patas presas ao chão',()=>{
 g.world=mundo();const b=bicho(1,0,0,0),visual=b._boarVisual=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,2,4,8,8),new THREE.MeshBasicMaterial());mesh.position.y=.5;visual.add(mesh);prepararPassada(visual);g.time=1;m.atualizaVisual(b);
 const rig=visual.userData.passada.rigs[0];assert.ok(rig,'fixture sem rig');let maxSlip=0,supported=0;const before=rig.feet.map(()=>new THREE.Vector3());let pinned=[];
 for(let frame=0;frame<240;frame++){
  g.time+=1/60;b.pos.z+=.02;m.atualizaVisual(b);visual.updateMatrixWorld(true);let stable=0;
  for(let i=0;i<4;i++){const p=rig.mesh.localToWorld(rig.feet[i].clone().add(rig.bones[i].position));if(rig.pinned[i]&&pinned[i]){const slip=p.distanceTo(before[i]);maxSlip=Math.max(maxSlip,slip);assert.ok(Math.abs(p.y)<1e-6,'pata de apoio flutuando');if(slip<1e-6)stable++;}before[i].copy(p);}
  if(frame>1&&stable>=2)supported++;pinned=[...rig.pinned];
 }
 assert.equal(supported,238,'balanço soltou as patas');assert.ok(maxSlip<1e-6,`deslize ${maxSlip}`);liberarPassada(visual);console.log(JSON.stringify({supported,maxSlip}));
});
test('fila atende 64 bichos mesmo com os primeiros pedindo sempre',()=>{
 const modo={},bots=Array.from({length:64},(_,i)=>({alive:true,_boarId:`fila.${i}`})),atendidos=new Map();
 for(let frame=0;frame<32;frame++){
  let planos=0;
  for(let i=0;i<bots.length;i++)if(agendar(modo,bots[i],frame/60)){planos++;if(!atendidos.has(i))atendidos.set(i,frame);}
  assert.ok(planos<=4,`orçamento estourou: ${planos} planos`);
 }
 const ultimo=Math.max(...atendidos.values());console.log(JSON.stringify({atendidos:atendidos.size,ultimoPrimeiroFrame:ultimo}));
 assert.equal(atendidos.size,64,'ordem fixa deixou bichos sem plano');assert.equal(ultimo,15,'fila excedeu 16 quadros para atender todos');
});
g.world=originalWorld;
const expected={'grade-rigida':['campo ortogonal','ataque aproxima','grupo mantém'],'sem-flanco':['ataque aproxima'],'corpo-rigido':['corpo acompanha'],'sem-separacao':['grupo mantém'],'ordem-fixa':['fila atende']}[mutant];
process.exitCode=mutant?(failures.length===expected.length&&expected.every(prefix=>failures.some(name=>name.startsWith(prefix)))?0:1):(failures.length?1:0);
