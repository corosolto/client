/* Contrato independente das casas do PR #526: corpo .38 m, olhos 1.62 m,
   entradas e posições de tiro medidas na geometria e no grafo reais, sem WebGL. */
import { THREE, MAPS, initTextures, Game } from './harness.mjs';

const mutant = process.argv.find(a => a.startsWith('--mutante='))?.slice(10);
const targets = { 'fechar-porta': 'IN1', 'fechar-janela': 'IN2', 'fardo-interior': 'IN3', 'fresta-lateral': 'IN4', 'cortar-nav': 'IN5', 'barril-na-parede': 'IN6' };
if (mutant && !targets[mutant]) throw Error(`Mutante desconhecido: ${mutant}`);
const world = MAPS.velho_oeste.build(new THREE.Scene(), await initTextures());
const houses = world.interiorHouses || [];
const expected = [-11.5, 11.5].map((x, id) => ({ name: `sertao-praca-casa-interior-${id}`, x, z: 15 }));
const probe = Object.create(Game.prototype); probe.world = world;
const EPS = 1e-6, radius = .38;
if (mutant) {
  const house = houses.find(h => h.name === expected[0].name);
  if (!house) throw Error('Mutante não aplicou: casa ausente');
  const {x, z} = expected[0];
  if (mutant === 'fechar-porta' || mutant === 'fardo-interior') {
    const dz = mutant === 'fechar-porta' ? -3.2 : 1.8;
    world.colliders.push({minX:x-.6,maxX:x+.6,minY:0,maxY:2.6,minZ:z+dz-.2,maxZ:z+dz+.2});
  } else if (mutant === 'fechar-janela') {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, .28), new THREE.MeshBasicMaterial());
    mesh.position.set(0,1.7,3.2); house.add(mesh); world.occluders.push(mesh);
  } else if (mutant === 'fresta-lateral') {
    const wall = house.getObjectByName(`${house.name}-lateral-1-sul`);
    if (!wall) throw Error('Mutante não aplicou: parede ausente');
    wall.scale.z = .6;
  } else if (mutant === 'barril-na-parede') {
    const c=world.colliders.find(c=>Math.abs(c.minX+17.62)<EPS&&Math.abs(c.maxY-1)<EPS);
    if(!c) throw Error('Mutante não aplicou: barril ausente');
    c.minZ=9.88;c.maxZ=11.12;
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
function rayBlocked(a,b) {
  const from=new THREE.Vector3(...a), delta=new THREE.Vector3(...b).sub(from);
  const ray=new THREE.Raycaster(from,delta.clone().normalize(),0,delta.length());
  return ray.intersectObjects(world.occluders,false).length>0;
}
const results=expected.map(({name,x,z})=>{
  const exists=houses.some(h=>h.name===name);
  const lanes=[-.4,0,.4].map(dx=>capsulePath([x+dx,z-4.8],[x+dx,z]));
  const entry={clear:lanes.every(p=>p.clear),maxDisplacement:Math.max(...lanes.map(p=>p.maxDisplacement))};
  const shots=[[x,1.62,z+2.5,x,1.62,z+3.7]];
  for(const side of [-1,1]) shots.push([x+side*2.9,1.62,z+.1,x+side*4.1,1.62,z+.1]);
  const windows=shots.map(s=>!rayBlocked(s.slice(0,3),s.slice(3)));
  const firingRoutes=[[x,z+2.5],[x-2.9,z+.1],[x+2.9,z+.1]].map(p=>capsulePath([x,z],p));
  const corners=[[-2.9,-2.5],[-2.9,2.5],[2.9,2.5],[2.9,-2.5]].map(([dx,dz])=>[x+dx,z+dz]);
  const circulation=corners.map((a,i)=>capsulePath(a,corners[(i+1)%corners.length]));
  const leaks=[];
  for(const side of [-1,1]) for(const y of [.4,1.62,3]) for(let dz=-3;dz<=3;dz+=.1){
    if(y===1.62 && dz>-.6-EPS && dz<.8+EPS) continue;
    if(!rayBlocked([x+side*3.2,y,z+dz],[x+side*4,y,z+dz])) leaks.push({side,y,dz:Number(dz.toFixed(2))});
  }
  const {nodes,adj}=world.waypoints;
  const internal=nodes.flatMap((p,i)=>Math.abs(p.x-x)<3.4&&Math.abs(p.z-z)<3 ? [i]:[]);
  const outside=nodes.reduce((best,p,i)=>Math.hypot(p.x,p.z+41)<Math.hypot(nodes[best].x,nodes[best].z+41)?i:best,0);
  const reached=new Set([outside]), queue=[outside];
  for(let i=0;i<queue.length;i++) for(const j of adj[queue[i]]) if(!reached.has(j)){reached.add(j);queue.push(j);}
  const badEdges=[];
  for(let i=0;i<nodes.length;i++) for(const j of adj[i]) {
    if(j<=i) continue;
    const a=nodes[i],b=nodes[j];
    if(Math.min(a.x,b.x)>x+4.5 || Math.max(a.x,b.x)<x-4.5 || Math.min(a.z,b.z)>z+4 || Math.max(a.z,b.z)<z-5) continue;
    const route=capsulePath([a.x,a.z],[b.x,b.z]);
    if(!route.clear) badEdges.push({i,j,maxDisplacement:route.maxDisplacement});
  }
  return {name,exists,entry,windows,firingRoutes,circulation,leaks,internalNodes:internal.length,reachable:internal.length>0&&internal.every(i=>reached.has(i)),badEdges};
});
const barrels=world.colliders.filter(c=>Math.abs(c.maxX-c.minX-1.24)<EPS && c.maxY===1 && c.minX>-20 && c.maxX<-10 && c.minZ>8 && c.maxZ<15);
const barrelClearance=barrels.map(c=>{
  const p=new THREE.Vector3((c.minX+c.maxX)/2,0,(c.minZ+c.maxZ)/2),original=p.clone();
  const others=Object.create(Game.prototype);others.world={...world,colliders:world.colliders.filter(other=>other!==c)};
  others._collide(p,.67);return {x:original.x,z:original.z,displacement:p.distanceTo(original)};
});
const checks={
  IN1:houses.length===2&&results.every(r=>r.exists&&r.entry.clear),
  IN2:results.every(r=>r.exists&&r.windows.every(Boolean)),
  IN3:results.every(r=>r.exists&&[...r.firingRoutes,...r.circulation].every(p=>p.clear)),
  IN4:results.every(r=>r.exists&&!r.leaks.length),
  IN5:results.every(r=>r.exists&&r.reachable&&!r.badEdges.length),
  IN6:barrels.length===1&&barrelClearance.every(p=>p.displacement<=EPS),
};
console.log(JSON.stringify({checks,houses:results,barrelClearance,mutation:mutant||null},null,2));
const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([id])=>id);
process.exitCode=mutant ? (failed.includes(targets[mutant])?0:1) : (failed.length?1:0);
