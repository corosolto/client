/* V6: becos de 1,8–2,2 m; alcance global em lajes-ruas-check.mjs.
   Migração: docs/maps/LAJES-V6-REGUA.md. Node não certifica céu visível. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { THREE, MAPS, bootGame, initTextures } from './harness.mjs';
import { buildLajes } from '../../public/js/map_lajes_authored.js';
if(MAPS.lajes.build!==buildLajes)throw Error('Não sei medir: builder ativo divergente');
const game=bootGame('lajes',{textures:initTextures(),bots:0,seed:12345}),w=game.world;
const R=.38,EPS=.001,EYE=1.62,MIN=1.8,MAX=2.2;
const mutant=process.argv.find(a=>a.startsWith('--mutante='))?.slice(10)||'';
if(!['','beco-largo','beco-obstruido','sem-helicoptero','sem-pipas'].includes(mutant))throw Error(`Mutante desconhecido: ${mutant}`);
const visible=o=>{for(let p=o;p;p=p.parent)if(p.visible===false)return false;return true;};
const skyRoots=kind=>{
  const found=[];w.root.traverse(o=>{if(o.userData.skyLife===kind&&visible(o))found.push(o);});
  return found.filter(o=>!found.some(other=>other!==o&&other.parent===o));
};
let mutation=null;
if(mutant==='sem-helicoptero'||mutant==='sem-pipas'){
  const kind=mutant==='sem-pipas'?'pipa':'helicopter',targets=skyRoots(kind);
  if(!targets.length)throw Error('MUTANTE NÃO APLICOU: elemento do céu já ausente');
  for(const o of targets){let top=o;while(top.parent?.userData.skyLife===kind)top=top.parent;top.removeFromParent();}
  mutation={kind,removed:targets.length};
}
const xAt=(route,z)=>{
  const crossings=[];
  for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i];if(Math.abs(b[1]-a[1])<EPS)continue;
    const t=(z-a[1])/(b[1]-a[1]);if(t>=0&&t<=1)crossings.push(a[0]+t*(b[0]-a[0]));
  }
  if(crossings.length!==1)throw Error(`Não sei medir ${route.name} em z${z}: ${crossings.length} cruzamentos`);
  return crossings[0];
};
const routes=['oeste','leste'].map(side=>{
  const route=w.design.routes.find(r=>r.name.includes(side));
  if(!route)throw Error(`Não sei medir: rota lateral ${side} ausente`);return route;
});
if(mutant==='beco-obstruido'){
  const z=-10,x=xAt(routes[0],z),p=new THREE.Vector3(x,0,z),before=p.clone();game._collide(p,R);
  if(p.distanceTo(before)>EPS)throw Error('MUTANTE NÃO APLICOU: rota já obstruída');
  w.colliders.push({minX:x-.4,maxX:x+.4,minY:0,maxY:2,minZ:z-.4,maxZ:z+.4});
  p.copy(before);game._collide(p,R);if(p.distanceTo(before)<=EPS)throw Error('MUTANTE NÃO APLICOU: barreira não empurra');
  mutation={position:before.toArray(),push:p.distanceTo(before)};
}
w.root.updateMatrixWorld(true);
const meshes=[];w.root.traverse(o=>{
  if(!o.isMesh||o.userData.proxyGLB||!visible(o))return;
  const mats=Array.isArray(o.material)?o.material:[o.material];
  if(mats.some(m=>m&&m.visible!==false&&m.opacity!==0))meshes.push(o);
});
const ray=new THREE.Raycaster(),direction=new THREE.Vector3(),origin=new THREE.Vector3();
const meshDistance=(x,z,sign)=>{
  origin.set(x,EYE,z);direction.set(sign,0,0);ray.set(origin,direction);ray.near=EPS;ray.far=50;
  const hit=ray.intersectObjects(meshes,false).find(h=>{const m=Array.isArray(h.object.material)?h.object.material[h.face?.materialIndex??0]:h.object.material;return m?.visible!==false&&m?.opacity!==0;});
  return hit?.distance??null;
};
const colliderDistance=(x,z,sign)=>{
  let best=Infinity;const candidates=[];
  for(let i=0;i<w.colliders.length;i++){
    const c=w.colliders[i];if(c.minY>EYE||c.maxY<EYE)continue;
    let minX=c.minX,maxX=c.maxX;
    if(c.ry){
      const polygon=[[-c.hx,-c.hz],[-c.hx,c.hz],[c.hx,c.hz],[c.hx,-c.hz]].map(([lx,lz])=>[c.cx+lx*c.cos+lz*c.sin,c.cz-lx*c.sin+lz*c.cos]);
      const hits=[];for(let j=0;j<4;j++){const a=polygon[j],b=polygon[(j+1)%4];if(Math.abs(b[1]-a[1])<EPS)continue;const t=(z-a[1])/(b[1]-a[1]);if(t>=0&&t<=1)hits.push(a[0]+t*(b[0]-a[0]));}
      if(hits.length<2)continue;minX=Math.min(...hits);maxX=Math.max(...hits);
    }else if(z<c.minZ||z>c.maxZ)continue;
    const near=sign>0?minX-x:x-maxX,far=sign>0?maxX-x:x-minX;
    if(far<0)continue;const distance=Math.max(0,near);
    if(distance<best){best=distance;candidates.length=0;candidates.push(i);}
  }
  return{distance:Number.isFinite(best)?best:null,collider:candidates[0]??null};
};
if(mutant==='beco-largo'){
  const z=-10,x=xAt(routes[0],z),contact=colliderDistance(x,z,-1),c=w.colliders[contact.collider];
  if(!c)throw Error('MUTANTE NÃO APLICOU: face lateral não encontrada');
  const before={...c};c.minX-=3;c.maxX-=3;if(c.ry)c.cx-=3;
  if(c.minX===before.minX)throw Error('MUTANTE NÃO APLICOU: face não deslocou');
  mutation={collider:contact.collider,before,after:{...c}};
}
const samples=[];
for(const route of routes)for(let z=-18;z<=18+EPS;z+=.5){
  if(Math.abs(z)<=3)continue;const x=xAt(route,z),left=colliderDistance(x,z,-1),right=colliderDistance(x,z,1);
  const ml=meshDistance(x,z,-1),mr=meshDistance(x,z,1),p=new THREE.Vector3(x,0,z);game._collide(p,R);
  const width=left.distance!=null&&right.distance!=null?left.distance+right.distance:null;
  const visualWidth=ml!=null&&mr!=null?ml+mr:null;
  samples.push({route:route.name,x,z,width,visualWidth,left,right,bodyPush:Math.hypot(p.x-x,p.z-z),floor:w.groundHeightAt(x,z,0)});
}
const stats=key=>{const values=samples.map(s=>s[key]).filter(Number.isFinite);return{count:values.length,min:values.length?Math.min(...values):null,max:values.length?Math.max(...values):null,mean:values.length?values.reduce((a,b)=>a+b,0)/values.length:null};};
const wide=samples.filter(s=>s.width==null||s.visualWidth==null||s.width<MIN-EPS||s.width>MAX+EPS||s.visualWidth<MIN-EPS||s.visualWidth>MAX+EPS);
const bodySamples=[];
for(const route of w.design.routes)for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1],b=route.points[i],count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(R/2)));
  for(let k=0;k<=count;k++){
    const t=k/count,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,p=new THREE.Vector3(x,0,z);game._collide(p,R);
    bodySamples.push({route:route.name,x,z,push:Math.hypot(p.x-x,p.z-z),floor:w.groundHeightAt(x,z,0)});
  }
}
const blocked=bodySamples.filter(s=>s.push>EPS||Math.abs(s.floor)>EPS);
const platforms=[];w.root.traverse(o=>{if(o.isMesh&&visible(o)&&o.userData.lajesPlatform)platforms.push(o);});
const spawns=Object.values(w.spawns).flat().map(s=>({x:s.x,z:s.z,y:game._spawnY(s.x,s.z)}));
const helicopter=skyRoots('helicopter'),pipas=skyRoots('pipa');
const sky=roots=>roots.map(o=>{let meshCount=0;o.traverse(m=>{if(m.isMesh&&visible(m))meshCount++;});return{name:o.name,meshCount,position:o.getWorldPosition(new THREE.Vector3()).toArray(),source:o.userData.source??null};});
const checks=[
 ['LID1','becos laterais 1,8–2,2m nas faces físicas e visuais',samples.length>0&&!wide.length,{colliders:stats('width'),meshes:stats('visualWidth'),invalid:wide.length}],
 ['LID2','três rotas apoiadas e livres para corpo0,38m',bodySamples.length>0&&!blocked.length,{samples:bodySamples.length,maxSpacing:R/2,blocked:blocked.length}],
 ['LID3','preserva3rotas/4escadas/4plataformas/8spawns térreos',w.design.routes.length===3&&w.staircases.length===4&&platforms.length===4&&spawns.length===8&&spawns.every(s=>Math.abs(s.y)<=EPS),{routes:w.design.routes.length,stairs:w.staircases.length,platforms:platforms.length,spawns}],
 ['LID4','helicóptero e pipas ligados à cena real',helicopter.length>0&&pipas.length>0,{helicopter:sky(helicopter),pipas:sky(pipas),scope:'registration-only',snapshot:w.ambience?.lajesSky?.snapshot?.()??null,browserRequired:true}],
];
const result={builderSha256:crypto.createHash('sha256').update(fs.readFileSync(new URL('../../public/js/map_lajes_authored.js',import.meta.url))).digest('hex'),mutant,mutation,radius:R,eyeHeight:EYE,tolerance:EPS,samples,blocked,checks:checks.map(([id,label,valid,evidence])=>({id,label,valid,evidence})),valid:checks.every(c=>c[2])};
for(const [id,label,ok,evidence]of checks)console.log(`${ok?'✓':'✗'} ${id} ${label}: ${JSON.stringify(evidence)}`);
const output=process.argv.find(a=>a.startsWith('--json='))?.slice(7);if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
if(mutant&&!mutation)throw Error('MUTANTE NÃO APLICOU');
if(mutant&&result.valid)console.error('MUTANTE SOBREVIVEU');
process.exitCode=result.valid&&!mutant?0:1;
