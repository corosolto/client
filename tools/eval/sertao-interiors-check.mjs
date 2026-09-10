/* Contrato independente das casas do PR #526 + BUG-91: corpo .38 m, olhos 1.62 m,
   entradas e posições de tiro medidas na geometria e no grafo reais, sem WebGL.
   Desde a BUG-91 cobre também os interiores diante dos spawns (platibanda-1 no E,
   pedra-7 no B), com porta na fachada do respawn e janela oposta à rota de conflito:
   entrada E saída pela porta, ocupação (circulação pelos cantos), tiro da janela e
   revide (linha recíproca de fora pra dentro em altura de olho). */
import { THREE, MAPS, initTextures, Game } from './harness.mjs';

const mutant = process.argv.find(a => a.startsWith('--mutante='))?.slice(10);
const targets = { 'fechar-porta': 'IN1', 'fechar-janela': 'IN2', 'fardo-interior': 'IN3', 'fresta-lateral': 'IN4', 'cortar-nav': 'IN5', 'barril-na-parede': 'IN6', 'fardo-na-parede': 'IN6', 'bolsao': 'IN7', 'fechar-porta-casa': 'IN1', 'fechar-janela-casa': 'IN2', 'fechar-saida-lateral': 'IN8', 'cegar-praca': 'IN9', 'sem-cobertura-praca': 'IN10', 'gargalo-bot': 'IN11', 'fechar-casa-respawn': 'IN12', 'fechar-janela-respawn': 'IN13' };
if (mutant && !targets[mutant]) throw Error(`Mutante desconhecido: ${mutant}`);
const world = MAPS.velho_oeste.build(new THREE.Scene(), await initTextures());
const houses = world.interiorHouses || [];
/* Expectativas independentes dos metadados da casa: coordenadas congeladas do
   fonte. doorSide +1 = porta na face local +z (casas dos spawns), -1 = face -z
   (casas da praça). Tudo mais é medido no mundo real. */
const SPECS = [
  { name: 'sertao-praca-casa-interior-0', x: -11.5, z: 15, ry: 0, w: 7.2, d: 6.4, doorSide: -1 },
  { name: 'sertao-praca-casa-interior-1', x: 11.5, z: 15, ry: 0, w: 7.2, d: 6.4, doorSide: -1 },
  { name: 'sertao-casa-platibanda-1', x: 9.6, z: -26, ry: Math.PI - .17, w: 7.2, d: 6.4, doorSide: 1, exitSide: 1,
    sightTargets: [[0, 0], [6, -2], [12, 8]] },
  { name: 'sertao-casa-pedra-7', x: -8.4, z: 24.2, ry: .14, w: 6.1, d: 6.2, doorSide: 1, exitSide: -1,
    sightTargets: [[0, 0], [-4, 8], [12, -8]] },
];
const SPAWN_ROW_SPECS = [
  { name: 'sertao-casa-platibanda-0', x: -9.2, z: -25.5, ry: Math.PI + .12, w: 7.2, d: 6.4, doorSide: 1, exitSide: -1 },
  SPECS[2], SPECS[3],
  { name: 'sertao-casa-pedra-8', x: 9.1, z: 24.7, ry: -.1, w: 6.1, d: 6.2, doorSide: 1, exitSide: -1 },
  { name: 'sertao-casa-geminada-9', x: -.4, z: 26.2, ry: -.06, w: 7.2, d: 6.4, doorSide: 1, exitSide: 1 },
];
const probe = Object.create(Game.prototype); probe.world = world;
const EPS = 1e-6, radius = .38;
const l2w = (s, px, pz) => [s.x + Math.cos(s.ry) * px + Math.sin(s.ry) * pz, s.z - Math.sin(s.ry) * px + Math.cos(s.ry) * pz];
const l3w = (s, px, pz, y) => [s.x + Math.cos(s.ry) * px + Math.sin(s.ry) * pz, y, s.z - Math.sin(s.ry) * px + Math.cos(s.ry) * pz];
if (mutant) {
  const house = houses.find(h => h.name === SPECS[0].name);
  if (!house) throw Error('Mutante não aplicou: casa ausente');
  const {x, z} = SPECS[0];
  if (mutant === 'fechar-porta' || mutant === 'fardo-interior') {
    const dz = mutant === 'fechar-porta' ? -3.2 : 1.8;
    world.colliders.push({minX:x-.6,maxX:x+.6,minY:0,maxY:2.6,minZ:z+dz-.2,maxZ:z+dz+.2});
  } else if (mutant === 'fechar-porta-casa') {
    const s = SPECS[2], [wx, wz] = l2w(s, 0, s.doorSide * 3.2);
    const cos = Math.cos(s.ry), sin = Math.sin(s.ry);
    const hx = Math.abs(cos) * .65 + Math.abs(sin) * .2, hz = Math.abs(sin) * .65 + Math.abs(cos) * .2;
    world.colliders.push({minX:wx-hx,maxX:wx+hx,minY:0,maxY:2.6,minZ:wz-hz,maxZ:wz+hz,tag:'mutante-porta-casa'});
  } else if (mutant === 'fechar-janela') {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, .28), new THREE.MeshBasicMaterial());
    mesh.position.set(0,1.7,3.2); house.add(mesh); world.occluders.push(mesh);
  } else if (mutant === 'fechar-janela-casa') {
    const s = SPECS[3], casa = houses.find(h => h.name === s.name);
    if (!casa) throw Error('Mutante não aplicou: casa dos spawns ausente');
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.8, .3), new THREE.MeshBasicMaterial());
    const [wx, wz] = l2w(s, 0, -s.doorSide * 3.2);
    mesh.position.set(wx, 1.7, wz); mesh.rotation.y = s.ry; world.root.add(mesh);
    world.root.updateMatrixWorld(true);
    world.occluders.push(mesh);
    if (!world.occluders.includes(mesh)) throw Error('Mutante não aplicou: occluder ausente');
  } else if (mutant === 'fechar-saida-lateral') {
    const s = SPECS[2], [wx, wz] = l2w(s, s.exitSide * 3.6, .1);
    const cos = Math.cos(s.ry), sin = Math.sin(s.ry);
    const hx = Math.abs(cos) * .2 + Math.abs(sin) * .95, hz = Math.abs(sin) * .2 + Math.abs(cos) * .95;
    world.colliders.push({ minX: wx - hx, maxX: wx + hx, minY: 0, maxY: 2.6,
      minZ: wz - hz, maxZ: wz + hz, tag: 'mutante-saida-lateral' });
  } else if (mutant === 'cegar-praca') {
    const s = SPECS[3], [wx, wz] = l2w(s, 0, -s.doorSide * 5.2);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(5, 3, .3), new THREE.MeshBasicMaterial());
    mesh.position.set(wx, 1.5, wz); mesh.rotation.y = s.ry; world.root.add(mesh);
    world.root.updateMatrixWorld(true); world.occluders.push(mesh);
  } else if (mutant === 'sem-cobertura-praca') {
    const cover = world.root.getObjectByName('obstaculo-fardos-cobertura');
    if (!cover) throw Error('Mutante não aplicou: cobertura da praça ausente');
    const meshes = new Set(); cover.traverse(o => { if (o.isMesh) meshes.add(o); });
    world.occluders = world.occluders.filter(o => !meshes.has(o)); cover.removeFromParent();
  } else if (mutant === 'gargalo-bot') {
    const walls = world.colliders.filter(c => c.tag === 'sertao-casa-paupique-3');
    if (!walls.length) throw Error('Mutante não aplicou: colisor da casa vizinha ausente');
    for (const c of walls) { c.minZ += .8; c.maxZ += .8; if (Number.isFinite(c.cz)) c.cz += .8; }
  } else if (mutant === 'fechar-casa-respawn') {
    const s = SPAWN_ROW_SPECS[0], [wx, wz] = l2w(s, 0, s.doorSide * 3.2);
    world.colliders.push({ minX: wx - .8, maxX: wx + .8, minY: 0, maxY: 2.7,
      minZ: wz - .35, maxZ: wz + .35, tag: 'mutante-fechar-casa-respawn' });
  } else if (mutant === 'fechar-janela-respawn') {
    const s = SPAWN_ROW_SPECS[3], [wx, wz] = l2w(s, 0, -s.doorSide * 3.2);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.9, .35), new THREE.MeshBasicMaterial());
    mesh.position.set(wx, 1.7, wz); mesh.rotation.y = s.ry; world.root.add(mesh);
    world.root.updateMatrixWorld(true); world.occluders.push(mesh);
  } else if (mutant === 'fresta-lateral') {
    const ref = house.userData.boxParts?.[`${house.name}-lateral-1-sul`];
    if (!ref || ref.index == null) throw Error('Mutante não aplicou: parede instanciada ausente');
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
    ref.mesh.getMatrixAt(ref.index, matrix); matrix.decompose(position, rotation, scale); scale.z *= .6;
    matrix.compose(position, rotation, scale); ref.mesh.setMatrixAt(ref.index, matrix);
    ref.mesh.instanceMatrix.needsUpdate = true; ref.mesh.computeBoundingBox?.(); ref.mesh.computeBoundingSphere?.();
  } else if (mutant === 'fardo-na-parede') {
    const hay=world.colliders.filter(c=>c.maxY===1.15&&c.minX>11&&c.maxX<18&&c.minZ>19&&c.maxZ<23);
    if(hay.length!==3) throw Error('Mutante não aplicou: fardos ausentes');
    for(const c of hay){c.minZ=20.85;c.maxZ=22.15;}
  } else if (mutant === 'bolsao') {
    for(const w of [{minX:-23.2,maxX:-16.8,minZ:-31.2,maxZ:-30.2},{minX:-23.2,maxX:-16.8,minZ:-25.8,maxZ:-24.8},{minX:-23.2,maxX:-22.2,minZ:-31.2,maxZ:-24.8},{minX:-17.8,maxX:-16.8,minZ:-31.2,maxZ:-24.8}])
      world.colliders.push({...w,minY:0,maxY:2.6});
  } else if (mutant === 'barril-na-parede') {
    const c=world.colliders.find(c=>Math.abs(c.minX+17.62)<EPS&&Math.abs(c.maxY-1)<EPS);
    if(!c) throw Error('Mutante não aplicou: barril ausente');
    // A casa pau-a-pique vizinha mudou de z=7,5 para 6,7 ao abrir o gargalo
    // dos bots. Invade a geometria atual sem remover o barril da amostra IN6.
    c.minZ=8.68;c.maxZ=9.92;
  } else {
    const inside = new Set(world.waypoints.nodes.flatMap((n,i) => Math.abs(n.x-x)<3.5 && Math.abs(n.z-z)<3.1 ? [i]:[]));
    if (!inside.size) throw Error('Mutante não aplicou: nós internos ausentes');
    world.waypoints.adj = world.waypoints.adj.map((edges,i) => edges.filter(j=>inside.has(i)===inside.has(j)));
  }
}
world.root.updateMatrixWorld(true);
function capsulePath(a, b) {
  let maxDisplacement = 0;
  const steps = Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.05);
  for (let i=0;i<=steps;i++) {
    const t=steps ? i/steps : 0, p=new THREE.Vector3(a[0]+(b[0]-a[0])*t,0,a[1]+(b[1]-a[1])*t), original=p.clone();
    probe._collide(p,radius); maxDisplacement=Math.max(maxDisplacement,p.distanceTo(original));
  }
  return {clear:maxDisplacement<=EPS,maxDisplacement};
}
function rayHit(a,b) {
  const from=new THREE.Vector3(...a), delta=new THREE.Vector3(...b).sub(from);
  const ray=new THREE.Raycaster(from,delta.clone().normalize(),0,delta.length());
  return ray.intersectObjects(world.occluders,false)[0] || null;
}
const rayBlocked = (a, b) => !!rayHit(a, b);
const results=SPECS.map(s=>{
  const halfW = s.w / 2, halfD = s.d / 2;
  const exists=houses.some(h=>h.name===s.name);
  const doorOut=s.doorSide*(halfD+1.6);
  const lanes=[-.4,0,.4].map(dx=>capsulePath(l2w(s,dx,doorOut),l2w(s,dx,0)));
  const exits=[-.4,0,.4].map(dx=>capsulePath(l2w(s,dx,0),l2w(s,dx,doorOut)));
  const entry={clear:lanes.every(p=>p.clear),maxDisplacement:Math.max(...lanes.map(p=>p.maxDisplacement))};
  const exit={clear:exits.every(p=>p.clear),maxDisplacement:Math.max(...exits.map(p=>p.maxDisplacement))};
  // Tiro: ocupante nos olhos (1,62) da janela do fundo e das laterais; o vão tem
  // que estar limpo nos DOIS sentidos — revide é a linha recíproca.
  const eye=(px,pz)=>l3w(s,px,pz,1.62);
  const shots=[[[0,-s.doorSide*(halfD-.7)],[0,-s.doorSide*(halfD+.5)]]];
  for(const side of [-1,1]) shots.push([[side*(halfW-.7),.1],[side*(halfW+.5),.1]]);
  const windows=shots.map(([a,b])=>!rayBlocked(eye(...a),eye(...b)));
  const returnShots=shots.map(([a,b])=>!rayBlocked(eye(...b),eye(...a)));
  const firingRoutes=[[0,-s.doorSide*(halfD-.7)],[-(halfW-.7),.1],[halfW-.7,.1]].map(([px,pz])=>capsulePath(l2w(s,0,0),l2w(s,px,pz)));
  const sideExitRoutes = s.exitSide ? [-.35, 0, .35].map(pz =>
    capsulePath(l2w(s, s.exitSide * (halfW-.9), pz), l2w(s, s.exitSide * (halfW+.75), pz))) : [];
  const tacticalSight = (s.sightTargets || []).map(([x, z]) => {
    const hit = rayHit(l3w(s, 0, -s.doorSide * (halfD-.7), 1.62), [x, 1.62, z]);
    return { target: [x, z], clear: !hit, blocker: hit?.object.parent?.name || hit?.object.name || null };
  });
  const corners=[[-(halfW-.7),-(halfD-.7)],[-(halfW-.7),halfD-.7],[halfW-.7,halfD-.7],[halfW-.7,-(halfD-.7)]].map(([px,pz])=>l2w(s,px,pz));
  const circulation=corners.map((a,i)=>capsulePath(a,corners[(i+1)%corners.length]));
  const leaks=[];
  for(const side of [-1,1]) for(const y of [.4,1.62,3]) for(let dz=-3;dz<=3;dz+=.1){
    if(side===s.exitSide && y<2.55 && dz>-.95-EPS && dz<.95+EPS) continue;
    if(y===1.62 && dz>-.6-EPS && dz<.8+EPS) continue;
    if(!rayBlocked(l3w(s,side*(halfW-.4),dz,y),l3w(s,side*(halfW+.4),dz,y))) leaks.push({side,y,dz:Number(dz.toFixed(2))});
  }
  const {nodes,adj}=world.waypoints;
  const toLocal=(n)=>{const dx=n.x-s.x,dz=n.z-s.z;return [Math.cos(s.ry)*dx-Math.sin(s.ry)*dz,Math.sin(s.ry)*dx+Math.cos(s.ry)*dz];};
  const internal=nodes.flatMap((p,i)=>{const [px,pz]=toLocal(p);return Math.abs(px)<halfW-.2&&Math.abs(pz)<halfD-.2 ? [i]:[];});
  const outside=nodes.reduce((best,p,i)=>Math.hypot(p.x,p.z+41)<Math.hypot(nodes[best].x,nodes[best].z+41)?i:best,0);
  const reached=new Set([outside]), queue=[outside];
  for(let i=0;i<queue.length;i++) for(const j of adj[queue[i]]) if(!reached.has(j)){reached.add(j);queue.push(j);}
  const badEdges=[];
  for(let i=0;i<nodes.length;i++) for(const j of adj[i]) {
    if(j<=i) continue;
    const a=nodes[i],b=nodes[j];
    if(Math.hypot(a.x-s.x,a.z-s.z)>7.5 || Math.hypot(b.x-s.x,b.z-s.z)>7.5) continue;
    const route=capsulePath([a.x,a.z],[b.x,b.z]);
    if(!route.clear) badEdges.push({i,j,maxDisplacement:route.maxDisplacement});
  }
  return {name:s.name,exists,entry,exit,windows,revide:returnShots,firingRoutes,sideExitRoutes,tacticalSight,circulation,leaks,internalNodes:internal.length,reachable:internal.length>0&&internal.every(i=>reached.has(i)),badEdges};
});
const barrels=world.colliders.filter(c=>Math.abs(c.maxX-c.minX-1.24)<EPS && c.maxY===1 && c.minX>-20 && c.maxX<-10 && c.minZ>8 && c.maxZ<15);
const barrelClearance=barrels.map(c=>{
  const p=new THREE.Vector3((c.minX+c.maxX)/2,0,(c.minZ+c.maxZ)/2),original=p.clone();
  const others=Object.create(Game.prototype);others.world={...world,colliders:world.colliders.filter(other=>other!==c)};
  others._collide(p,.67);return {x:original.x,z:original.z,displacement:p.distanceTo(original)};
});
const hay=world.colliders.filter(c=>Math.abs(c.maxX-c.minX-1.3)<EPS&&c.maxY===1.15&&c.minX>11&&c.maxX<18&&c.minZ>19&&c.maxZ<23);
const hayClearance=hay.map(c=>{
  const p=new THREE.Vector3((c.minX+c.maxX)/2,0,(c.minZ+c.maxZ)/2),original=p.clone();
  const others=Object.create(Game.prototype);others.world={...world,colliders:world.colliders.filter(other=>!hay.includes(other))};
  others._collide(p,.65);return {x:original.x,z:original.z,displacement:p.distanceTo(original)};
});
/* IN10 congela seis coberturas visíveis da praça. Cada testemunha cruza a malha
   renderizada em altura de agachamento; contar só collider deixaria passar cover
   invisível. Os pontos vêm dos centros autorais já existentes no mapa. */
const COVER_WITNESSES = [
  ['obstaculo-caixas-feira', -3, 9, 'x'], ['obstaculo-caixotes-carga', -9, -8, 'x'],
  ['obstaculo-barris-empilhados', 8, 3, 'z'], ['obstaculo-fardos-cobertura', -1, -3, 'x'],
  ['obstaculo-cerca-quebrada', 8, 9, 'x'], ['obstaculo-amarra-cavalos', 4, -8, 'z'],
];
const plazaCover = COVER_WITNESSES.map(([name, x, z, axis]) => {
  const a = axis === 'x' ? [x - 3, 1.2, z] : [x, 1.2, z - 3];
  const b = axis === 'x' ? [x + 3, 1.2, z] : [x, 1.2, z + 3];
  const from = new THREE.Vector3(...a), delta = new THREE.Vector3(...b).sub(from);
  const ray = new THREE.Raycaster(from, delta.clone().normalize(), 0, delta.length());
  const hits = ray.intersectObjects(world.occluders, false);
  return { name, blocked: hits.some(h => h.object.parent?.name === name), first: hits[0]?.object.parent?.name || hits[0]?.object.name || null };
});
/* IN11 nasceu de uma vermelha do botsim-golden: em z=15,0 sobravam apenas
   0,82 m entre a casa antiga e o canto da casa da praça. A cápsula entrava no
   gargalo e parava em (-15,4; 11,1). Esta testemunha congela a passagem lateral
   com o mesmo raio de 0,38 m; o mutante devolve a casa aos 15,0 m. */
const botCornerRoute = capsulePath([-15.7, 10.8], [-15.7, 12.2]);
const spawnRow = SPAWN_ROW_SPECS.map(s => {
  const halfW = s.w / 2, halfD = s.d / 2;
  const exists = houses.some(h => h.name === s.name);
  const entry = capsulePath(l2w(s, 0, s.doorSide * (halfD + 1.4)), l2w(s, 0, 0));
  const sideExit = capsulePath(l2w(s, s.exitSide * (halfW-.9), 0), l2w(s, s.exitSide * (halfW+.75), 0));
  const eye = (pz) => l3w(s, 0, pz, 1.62);
  const throughWindow = !rayBlocked(eye(-s.doorSide * (halfD-.7)), eye(-s.doorSide * (halfD+1)));
  const returnWindow = !rayBlocked(eye(-s.doorSide * (halfD+1)), eye(-s.doorSide * (halfD-.7)));
  return { name: s.name, exists, entry, sideExit, throughWindow, returnWindow };
});
/* IN7 responde ao relato de área inacessível sem depender da coordenada original:
   varre todo o mapa com o corpo real e exige que nenhum vão livre fique enclausurado. */
const SWEEP=.25;
const sweep=(()=>{
  const b=world.bounds, nx=Math.round((b.maxX-b.minX)/SWEEP)+1, nz=Math.round((b.maxZ-b.minZ)/SWEEP)+1;
  const free=new Uint8Array(nx*nz), v=new THREE.Vector3(), at=(i,j)=>i*nz+j;
  for(let i=0;i<nx;i++) for(let j=0;j<nz;j++){
    const X=b.minX+i*SWEEP, Z=b.minZ+j*SWEEP;
    v.set(X,0,Z); probe._collide(v,radius);
    if(Math.hypot(v.x-X,v.z-Z)<=EPS) free[at(i,j)]=1;
  }
  const spawn=world.spawns.E[0];
  const start=at(Math.round((spawn.x-b.minX)/SWEEP),Math.round((spawn.z-b.minZ)/SWEEP));
  let freeCells=0; for(const f of free) freeCells+=f;
  if(!free[start]) return {spawnFree:false,freeCells,reachable:0,pockets:[]};
  const seen=new Uint8Array(nx*nz), queue=[start]; seen[start]=1;
  const walk=(from,mark)=>{
    const stack=[from], cells=[];
    while(stack.length){
      const c=stack.pop(); cells.push(c);
      const i=Math.floor(c/nz), j=c%nz;
      for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const a=i+di, e=j+dj; if(a<0||e<0||a>=nx||e>=nz) continue;
        const k=at(a,e); if(free[k]&&!mark[k]){mark[k]=1;stack.push(k);}
      }
    }
    return cells;
  };
  for(let h=0;h<queue.length;h++){
    const i=Math.floor(queue[h]/nz), j=queue[h]%nz;
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const a=i+di, e=j+dj; if(a<0||e<0||a>=nx||e>=nz) continue;
      const k=at(a,e); if(free[k]&&!seen[k]){seen[k]=1;queue.push(k);}
    }
  }
  const claimed=new Uint8Array(seen), pockets=[];
  for(let i=0;i<nx;i++) for(let j=0;j<nz;j++){
    const k=at(i,j); if(!free[k]||claimed[k]) continue;
    claimed[k]=1;
    const cells=walk(k,claimed);
    const span=cells.reduce((acc,c)=>{
      const X=b.minX+Math.floor(c/nz)*SWEEP, Z=b.minZ+(c%nz)*SWEEP;
      return [Math.min(acc[0],X),Math.max(acc[1],X),Math.min(acc[2],Z),Math.max(acc[3],Z)];
    },[Infinity,-Infinity,Infinity,-Infinity]);
    pockets.push({area:Number((cells.length*SWEEP*SWEEP).toFixed(2)),x:span.slice(0,2),z:span.slice(2)});
  }
  return {spawnFree:true,freeCells,reachable:queue.length,pockets};
})();
const checks={
  IN1:results.every(r=>r.exists&&r.entry.clear&&r.exit.clear),
  IN2:results.every(r=>r.exists&&r.windows.every(Boolean)&&r.revide.every(Boolean)),
  IN3:results.every(r=>r.exists&&[...r.firingRoutes,...r.circulation].every(p=>p.clear)),
  IN4:results.every(r=>r.exists&&!r.leaks.length),
  IN5:results.every(r=>r.exists&&r.reachable&&!r.badEdges.length),
  IN6:barrels.length===1&&hay.length===3&&[...barrelClearance,...hayClearance].every(p=>p.displacement<=EPS),
  IN7:sweep.spawnFree&&!sweep.pockets.length&&sweep.reachable===sweep.freeCells,
  IN8:results.filter(r=>r.sideExitRoutes.length).length===2&&results.filter(r=>r.sideExitRoutes.length).every(r=>r.sideExitRoutes.every(p=>p.clear)),
  IN9:results.filter(r=>r.tacticalSight.length).length===2&&results.filter(r=>r.tacticalSight.length).every(r=>r.tacticalSight.every(p=>p.clear)),
  IN10:plazaCover.length===COVER_WITNESSES.length&&plazaCover.every(c=>c.blocked),
  IN11:botCornerRoute.clear,
  IN12:spawnRow.length===5&&spawnRow.every(r=>r.exists&&r.entry.clear&&r.sideExit.clear),
  IN13:spawnRow.length===5&&spawnRow.every(r=>r.exists&&r.throughWindow&&r.returnWindow),
};
console.log(JSON.stringify({checks,houses:results,spawnRow,barrelClearance,hayClearance,plazaCover,botCornerRoute,sweep:{...sweep,pockets:sweep.pockets.slice(0,8),pocketCount:sweep.pockets.length},mutation:mutant||null},null,2));
const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([id])=>id);
process.exitCode=mutant ? (failed.includes(targets[mutant])?0:1) : (failed.length?1:0);
