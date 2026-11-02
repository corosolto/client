// Pedido31/10: torre escalável, casas com tiro pelas janelas e armas fora do centro.
import assert from 'node:assert/strict';
import {bootGame,initTextures,THREE} from './harness.mjs';
const g=bootGame('invasao_javaporcos',{textures:initTextures(),seed:77}),w=g.world;
g.state='live';g.paused=false;g.scene.updateMatrixWorld(true);
const mutant=process.argv.find(a=>a.startsWith('--mutante='))?.slice(10)||'';
assert.ok(['','torre-sem-piso','janela-fechada','armas-centrais','rampa-lisa','casa-porta-bloqueada','torre-sem-guarda'].includes(mutant));
const failures=[];
function test(name,fn){const gh=w.groundHeightAt,colliders=w.colliders;try{fn();console.log('✓ CIDADE '+name);}catch(e){failures.push(name);console.log('✗ CIDADE '+name+': '+e.message);}finally{w.groundHeightAt=gh;w.colliders=colliders;}}
const mover=(p,x,z,max=1800)=>{for(let i=0;i<max;i++){const dx=x-p.pos.x,dz=z-p.pos.z;if(Math.hypot(dx,dz)<.09)return;g.time+=1/120;g._moveEntity(p,{ax:dx,az:dz,jump:false,crouch:false,sprint:false},1/120);}assert.fail(`rota bloqueada em ${p.pos.x.toFixed(2)},${p.pos.y.toFixed(2)},${p.pos.z.toFixed(2)}`);};
test('torre sobe sem salto e permite tiro para três lados',()=>{
 const t=w.root.userData.torre;assert.ok(t,'torre ainda é decoração sem escada');
 if(mutant==='torre-sem-piso'){const old=w.groundHeightAt;w.groundHeightAt=(x,z,y)=>t.x0<=x&&x<=t.x1&&t.z0<=z&&z<=t.z1?old(x,z,0):old(x,z,y);}
 const p=g.player;p.pos.set(t.rota[0].x,t.base,t.rota[0].z);p.vel.set(0,0,0);p.yaw=0;p.grounded=true;p.crouchF=0;p._spaceHeld=false;p.jumpBufferedUntil=0;
 for(const alvo of t.rota.slice(1))mover(p,alvo.x,alvo.z);
 assert.ok(Math.abs(p.pos.y-t.y)<.04,`torre não sustenta pés: ${p.pos.y} vs ${t.y}`);
 const origem=new THREE.Vector3(p.pos.x,p.pos.y+1.62,p.pos.z);
 for(const destino of [[-35,t.z],[35,t.z],[t.x,35]]){const fim=new THREE.Vector3(destino[0],origem.y,destino[1]),d=fim.clone().sub(origem);const ray=new THREE.Raycaster(origem,d.clone().normalize(),0,d.length());assert.equal(ray.intersectObjects(w.occluders,false).length,0,'linha de tiro da torre bloqueada');}
 for(const d of t.degraus){const ray=new THREE.Raycaster(new THREE.Vector3(d.x,d.y+.1,d.z),new THREE.Vector3(0,-1,0),0,.2),hit=ray.intersectObject(w.root,true)[0];assert.ok(hit&&Math.abs(hit.point.y-d.y)<.01,'degrau da torre não coincide com piso visível');}
 for(const alvo of [...t.rota].reverse().slice(1))mover(p,alvo.x,alvo.z);
 assert.ok(Math.abs(p.pos.y-t.base)<.08,'torre não permite descer pela escada');
 console.log(`  torre ${(t.y-t.base).toFixed(2)}m, ${t.degraus.length}degraus,3linhas de tiro`);
});
test('torre tem patamar contínuo e guarda nas bordas alcançáveis',()=>{
 const t=w.root.userData.torre;assert.ok(t,'sem torre para medir bordas');
 if(mutant==='torre-sem-guarda'){
  const antes=w.colliders.length;w.colliders=w.colliders.filter(c=>!c.guardaTorre);assert.ok(w.colliders.length<antes,'mutante não removeu guarda');
 }
 for(const x of [-17.5,-17.25]){
  const z=-9.25,h=w.groundHeightAt(x,z),vizinho=w.groundHeightAt(x,z+.25),p={x,y:Math.max(h,vizinho),z:z+.25},antes={...p};g._collide(p,.38);
  assert.ok(Math.abs(h-vizinho)<2||Math.hypot(p.x-antes.x,p.z-antes.z)>.02,`patamar deixa queda de ${Math.abs(h-vizinho).toFixed(2)}m na saída ${x},${z}`);
 }
 for(const [dx,dz]of [[-.8,.75],[-3.25,1.8],[3.25,1.8],[0,3.45]]){
  const p={x:t.x+dx,y:t.y,z:t.z+dz},antes={...p};g._collide(p,.38);
  assert.ok(Math.hypot(p.x-antes.x,p.z-antes.z)>.02,'guarda não impede corpo na borda de queda');
 }
 let transicoes=0;
 for(let x=Math.floor((t.x0-.5)*4)/4;x<=t.x1+.5;x+=.25)for(let z=Math.floor((t.z0-.5)*4)/4;z<=t.z1+.5;z+=.25)for(const [dx,dz]of [[.25,0],[0,.25]]){
  const a={x,y:w.groundHeightAt(x,z),z},b={x:x+dx,y:w.groundHeightAt(x+dx,z+dz),z:z+dz};
  if(Math.abs(a.y-b.y)<2)continue;const alto=a.y>b.y?a:b,baixo=a.y>b.y?b:a,corpo={...alto};g._collide(corpo,.38);
  if(Math.abs(corpo.x-alto.x)>=1e-6||Math.abs(corpo.z-alto.z)>=1e-6)continue;
  const borda={x:baixo.x,y:alto.y,z:baixo.z};g._collide(borda,.38);transicoes++;
  assert.ok(Math.hypot(borda.x-baixo.x,borda.z-baixo.z)>.02,`borda local sem guarda em ${alto.x},${alto.z}`);
 }
 assert.ok(transicoes>0,'não mediu bordas altas da torre');
 const inferior=w.groundHeightAt(t.x-.8,t.z+1.5,t.base);assert.ok(Math.abs(inferior-t.base)<.03,'patamar elevado teleporta corpo por baixo');
 console.log('  duas transições sem queda falsa,quatro bordas protegidas,solo inferior preservado');
});
test('quatro casas acessíveis têm janelas abertas em três fachadas',()=>{
 const casas=w.root.userData.interiores||[];assert.ok(casas.length>=4,`somente ${casas.length} casas abertas`);
 for(const c of casas){const cs=Math.cos(c.ry),sn=Math.sin(c.ry),pt=(x,y,z)=>new THREE.Vector3(c.x+x*cs+z*sn,c.y+y,c.z-x*sn+z*cs);
  if(mutant==='janela-fechada'){const m=new THREE.Mesh(new THREE.BoxGeometry(c.w,.3,.3),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));m.position.copy(pt(0,4.6,c.d/2));m.rotation.y=c.ry;m.updateMatrixWorld(true);w.occluders.push(m);}
  for(const [a,b]of [[[0,4.6,c.d/2-1],[0,4.6,c.d/2+1]],[[0,4.6,-c.d/2+1],[0,4.6,-c.d/2-1]],[[c.w/2-1,4.6,0],[c.w/2+1,4.6,0]]]){const start=pt(...a),end=pt(...b),d=end.clone().sub(start),ray=new THREE.Raycaster(start,d.normalize(),0,1.95);assert.equal(ray.intersectObjects(w.occluders,false).length,0,'janela fecha linha de tiro');}
 }
});
test('casas permitem entrar da rua, subir, permanecer e descer pela porta',()=>{
 const casas=w.root.userData.interiores||[];assert.ok(casas.length>=4,'faltam casas para medir o percurso');
 for(const [indice,c]of casas.entries()){
  const cs=Math.cos(c.ry),sn=Math.sin(c.ry),world=(x,z)=>({x:c.x+x*cs+z*sn,z:c.z-x*sn+z*cs});
  if(mutant==='casa-porta-bloqueada'&&indice===0){const p=world(0,c.d/2),hx=.8,hz=.15;w.colliders.push({minX:p.x-Math.abs(hx*cs)-Math.abs(hz*sn),maxX:p.x+Math.abs(hx*cs)+Math.abs(hz*sn),minZ:p.z-Math.abs(hx*sn)-Math.abs(hz*cs),maxZ:p.z+Math.abs(hx*sn)+Math.abs(hz*cs),minY:c.y,maxY:c.y+2.4,ry:c.ry,cx:p.x,cz:p.z,hx,hz,cos:cs,sin:sn});}
  const p=g.player,inicio=world(0,c.d/2+1.5),entrada=[0,c.d/2-.65],sx=c.escada[0].x,patamar=-c.d/2+.75;
  p.pos.set(inicio.x,w.groundHeightAt(inicio.x,inicio.z,0),inicio.z);p.vel.set(0,0,0);p.yaw=0;p.grounded=true;p.crouchF=0;p._spaceHeld=false;p.jumpBufferedUntil=0;
  const ir=(x,z)=>{const a=world(x,z);mover(p,a.x,a.z);};
  ir(...entrada);assert.ok(Math.abs(p.pos.y-c.y-.06)<.04,`casa${indice}: porta não chega ao piso térreo`);
  for(const a of [[sx,entrada[1]],[sx,patamar],[0,patamar],[0,c.d/2-.65]])ir(...a);
  assert.ok(Math.abs(p.pos.y-c.y-3)<.04,`casa${indice}: escada não chega ao segundo piso`);
  p.vel.set(0,0,0);
  for(let i=0;i<120;i++){g.time+=1/120;g._moveEntity(p,{ax:0,az:0,jump:false,crouch:false,sprint:false},1/120);assert.ok(Math.abs(p.pos.y-c.y-3)<.04,`casa${indice}: segundo piso não sustenta os pés`);}
  for(const a of [[0,patamar],[sx,patamar],[sx,entrada[1]],entrada])ir(...a);
  assert.ok(Math.abs(p.pos.y-c.y-.06)<.04,`casa${indice}: descida não retorna ao térreo`);
  mover(p,inicio.x,inicio.z);assert.ok(Math.abs(p.pos.y-w.groundHeightAt(inicio.x,inicio.z,0))<.04,`casa${indice}: saída não retorna à rua`);
 }
 const alimento=w.foodSpots.find(s=>s.id==='cacamba-perim'),n=w.waypoints.nodes[w.nearestWaypoint(alimento.x,alimento.z)],p=g.player;
 p.pos.set(n.x,w.groundHeightAt(n.x,n.z,0),n.z);p.vel.set(0,0,0);p.grounded=true;
 for(let i=0;i<120&&Math.hypot(p.pos.x-alimento.x,p.pos.z-alimento.z)>=alimento.r;i++){g.time+=1/120;g._moveEntity(p,{ax:alimento.x-p.pos.x,az:alimento.z-p.pos.z,jump:false,crouch:false,sprint:false},1/120);}
 assert.ok(Math.hypot(p.pos.x-alimento.x,p.pos.z-alimento.z)<alimento.r,'caçamba deslocada não pode ser alcançada para saque');
 console.log(`  ${casas.length}casas: rua→escada→janela→escada→rua, sustentação1s`);
});
test('armas cobrem cidade e refúgios sem volta obrigatória ao meio',()=>{
 let armas=w.pickups;if(mutant==='armas-centrais')armas=armas.map(p=>({...p,x:p.x*.1,z:p.z*.1}));
 assert.ok(armas.length>=24,`${armas.length} armas; só o anel externo não atende às ruas`);
 for(const [x,z]of [[-28,-22],[28,-22],[-28,22],[28,22],[-6,-28],[6,28],...w.hordeRefuges.map(r=>[r.x,r.z])])assert.ok(armas.some(a=>Math.hypot(a.x-x,a.z-z)<14),`sem reabastecimento perto ${x},${z}`);
 console.log(`  ${armas.length}armas,10zonas abastecidas`);
});
test('pisos laterais têm textura de superfície com escala por metro',()=>{
 const pisos=[];w.root.traverse(m=>{if(m.name.startsWith('laje-refugio-')||m.name==='escada-refugio')pisos.push(m);});assert.ok(pisos.length>4);
 for(const m of pisos){if(mutant==='rampa-lisa')m.material.map=null;assert.ok(m.material.map?.name?.includes('madeira'),'refúgio ainda usa concreto genérico');const uv=m.geometry.attributes.uv;assert.ok(Array.from(uv.array).some(v=>v>1),'textura esticada sobre toda a peça');}
});
const esperado={'torre-sem-piso':'torre sobe','janela-fechada':'quatro casas','armas-centrais':'armas cobrem','rampa-lisa':'pisos laterais','casa-porta-bloqueada':'casas permitem','torre-sem-guarda':'torre tem patamar'}[mutant];
process.exitCode=mutant?(failures.length===1&&failures[0].startsWith(esperado)?0:1):(failures.length?1:0);
