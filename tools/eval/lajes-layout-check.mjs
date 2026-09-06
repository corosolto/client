/* V4: direção autoral em docs/maps/LAJES-V4-CONTRATOS-PLANO.md.
   Mede o Game ativo; não depende das listas antigas de escadas/tábuas. */
import fs from 'node:fs';
import { THREE, MAPS, bootGame, initTextures } from './harness.mjs';
import { buildLajes } from '../../public/js/map_lajes_authored.js';
if (MAPS.lajes.build !== buildLajes) throw Error('Builder ativo divergente: não sei medir V4');
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.slice(10) || '';
if (!['', 'spawn-alto', 'casa-estreita', 'terreo-bloqueado'].includes(mutant)) throw Error(`Mutante desconhecido: ${mutant}`);
const g = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 12345 });
const w = g.world, R = .38, EPS = 1e-3, STEP = R / 2;
w.root.updateMatrixWorld(true);
const platforms = [];
w.root.traverse(mesh => {
  if (!mesh.isMesh || !mesh.visible || mesh.userData.proxyGLB) return;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  if (!materials.some(m => m?.visible !== false && m?.opacity !== 0)) return;
  let roof = mesh.userData.lajesPlatform;
  for (let p = mesh.parent; p && !roof; p = p.parent) roof = p.userData?.lajesRoof;
  if (!roof) return;
  const b = new THREE.Box3().setFromObject(mesh), d = b.getSize(new THREE.Vector3()), p = b.getCenter(new THREE.Vector3());
  // Superfície horizontal com espessura menor que os lados e topo realmente andável.
  if (d.y >= Math.min(d.x,d.z) || b.max.y <= EPS || Math.abs(w.groundHeightAt(p.x,p.z)-b.max.y)>EPS) return;
  platforms.push({name:String(roof),bounds:[b.min.x,b.max.x,b.min.y,b.max.y,b.min.z,b.max.z]});
});
const houses = w.colliders.filter(c => Number.isFinite(c.casaFrente) && c.minY <= EPS
  && (c.minX+c.maxX)/2 >= w.bounds.minX && (c.minX+c.maxX)/2 <= w.bounds.maxX
  && (c.minZ+c.maxZ)/2 >= w.bounds.minZ && (c.minZ+c.maxZ)/2 <= w.bounds.maxZ);
let mutation = null;
if (mutant === 'spawn-alto') {
  const b = platforms[0]?.bounds, s = w.spawns.E?.[0];
  if (!b || !s) throw Error('MUTANTE NÃO APLICOU: plataforma/spawn ausente');
  const before = {...s};s.x=(b[0]+b[1])/2;s.z=(b[4]+b[5])/2;
  if (!(g._spawnY(s.x,s.z)>EPS) || (s.x===before.x&&s.z===before.z)) throw Error('MUTANTE NÃO APLICOU: spawn não mudou para superfície alta');
  mutation={kind:mutant,before,after:{...s},height:g._spawnY(s.x,s.z)};
}
if (mutant === 'casa-estreita') {
  const c=houses[0];if(!c)throw Error('MUTANTE NÃO APLICOU: casa ausente');
  const before={...c}, x=(c.minX+c.maxX)/2,z=(c.minZ+c.maxZ)/2;
  c.casaFrente=Math.min(2.5,c.casaFrente/2);
  const ry=c.casaRy||0,front=c.casaFrente/2,depth=c.casaFundo/2;
  const hx=Math.abs(front*Math.cos(ry))+Math.abs(depth*Math.sin(ry)),hz=Math.abs(front*Math.sin(ry))+Math.abs(depth*Math.cos(ry));
  c.minX=x-hx;c.maxX=x+hx;c.minZ=z-hz;c.maxZ=z+hz;
  if(c.minX===before.minX&&c.maxX===before.maxX&&c.minZ===before.minZ&&c.maxZ===before.maxZ)throw Error('MUTANTE NÃO APLICOU: collider não mudou');
  mutation={kind:mutant,before,after:{...c}};
}
if (mutant === 'terreo-bloqueado') {
  const p=new THREE.Vector3();let witness=null;
  for(let x=w.bounds.minX+R;x<w.bounds.maxX-R;x+=STEP){p.set(x,0,0);g._collide(p,R);if(Math.hypot(p.x-x,p.z)<EPS&&Math.abs(w.groundHeightAt(x,0,0))<EPS){witness=[x,0,0];break;}}
  if(!witness)throw Error('MUTANTE NÃO APLICOU: seção térrea sem ponto livre');
  w.colliders.push({minX:w.bounds.minX,maxX:w.bounds.maxX,minZ:-R,maxZ:R,minY:0,maxY:2});
  p.fromArray(witness);g._collide(p,R);if(p.distanceTo(new THREE.Vector3(...witness))<=EPS)throw Error('MUTANTE NÃO APLICOU: barreira não bloqueou corpo');
  mutation={kind:mutant,witness,resolved:p.toArray()};
}
const spawns=Object.entries(w.spawns).flatMap(([team,ss])=>ss.map((s,i)=>({team,index:i,x:s.x,z:s.z,y:g._spawnY(s.x,s.z)})));
// Bucket é só pré-filtro conservador; resolução continua Game._collide.
const all=w.colliders,buckets=new Map(),key=(x,z)=>`${x},${z}`,bucketSize=2;
for(const c of all)for(let x=Math.floor((c.minX-R)/bucketSize);x<=Math.floor((c.maxX+R)/bucketSize);x++)for(let z=Math.floor((c.minZ-R)/bucketSize);z<=Math.floor((c.maxZ+R)/bucketSize);z++){
 const k=key(x,z);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(c);
}
const point=new THREE.Vector3();
const free=(x,z)=>{if(Math.abs(w.groundHeightAt(x,z,0))>EPS)return false;w.colliders=buckets.get(key(Math.floor(x/bucketSize),Math.floor(z/bucketSize)))||[];point.set(x,0,z);try{g._collide(point,R);return Math.hypot(point.x-x,point.z-z)<=EPS;}finally{w.colliders=all;}};
const segment=(a,b)=>{const steps=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/(R/4)));for(let i=0;i<=steps;i++){const t=i/steps;if(!free(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))return false;}return true;};
const B=w.bounds,nx=Math.floor((B.maxX-B.minX-2*R)/STEP)+1,nz=Math.floor((B.maxZ-B.minZ-2*R)/STEP)+1;
const xy=i=>[B.minX+R+(i%nx)*STEP,B.minZ+R+Math.floor(i/nx)*STEP];
const walk=new Uint8Array(nx*nz),seen=new Uint8Array(nx*nz);
for(let i=0;i<walk.length;i++)walk[i]=free(...xy(i));
const anchor=(x,z)=>{const ix=Math.round((x-B.minX-R)/STEP),iz=Math.round((z-B.minZ-R)/STEP);let best=-1,d=Infinity;for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const a=ix+dx,b=iz+dz;if(a<0||a>=nx||b<0||b>=nz)continue;const i=b*nx+a,p=xy(i),dist=Math.hypot(p[0]-x,p[1]-z);if(walk[i]&&dist<d&&segment([x,z],p)){best=i;d=dist;}}return best;};
const plaza=anchor(0,0),queue=plaza>=0?[plaza]:[];if(plaza>=0)seen[plaza]=1;
for(let head=0;head<queue.length;head++){const i=queue[head],ix=i%nx,iz=Math.floor(i/nx);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const x=ix+dx,z=iz+dz;if((!dx&&!dz)||x<0||x>=nx||z<0||z>=nz)continue;const j=z*nx+x;if(seen[j]||!walk[j]||!segment(xy(i),xy(j)))continue;seen[j]=1;queue.push(j);}}
const connections=spawns.map(s=>{const i=anchor(s.x,s.z);return{...s,anchor:i,connected:i>=0&&!!seen[i]};});
const tooNarrow=houses.filter(c=>c.casaFrente<3-EPS).map(c=>({id:c.casa,front:c.casaFrente,height:c.casaH,x:(c.minX+c.maxX)/2,z:(c.minZ+c.maxZ)/2}));
const clauses=[
 ['LV4A1','respawns reais no chão',spawns.length===8&&spawns.every(s=>Math.abs(s.y)<=EPS),{spawns}],
 ['LV4A2','até quatro plataformas superiores reais',platforms.length>0&&platforms.length<=4,{count:platforms.length,platforms}],
 ['LV4A3','frentes térreas de casas com pelo menos3m',houses.length>0&&tooNarrow.length===0,{count:houses.length,minimum:houses.length?Math.min(...houses.map(c=>c.casaFrente)):null,tooNarrow}],
 ['LV4A4','todos spawns ligados à praça pelo chão',plaza>=0&&connections.length===8&&connections.every(s=>s.connected),{plaza,reachableCells:queue.length,step:STEP,connections}],
];
for(const [id,label,ok,evidence]of clauses)console.log(`${ok?'✓':'✗'} ${id} ${label}: ${JSON.stringify(id==='LV4A2'?{count:evidence.count}:id==='LV4A3'?{count:evidence.count,minimum:evidence.minimum,narrow:tooNarrow.length}:evidence)}`);
const result={mutant,mutation,clauses:clauses.map(([id,label,valid,evidence])=>({id,label,valid,...evidence})),valid:clauses.every(c=>c[2])};
const out=process.argv.find(a=>a.startsWith('--json='))?.slice(7);if(out)fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
if(mutant&&!mutation)throw Error('MUTANTE NÃO APLICOU');
if(result.valid&&mutant)console.error('MUTANTE SOBREVIVEU: todas cláusulas verdes');
process.exitCode=result.valid&&!mutant?0:1;
