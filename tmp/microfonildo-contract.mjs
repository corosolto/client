import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const file=process.argv[2]; if(!file) throw new Error('uso: node contract GLB');
const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(file); const positions=[]; const edges=[];
for(const mesh of doc.getRoot().listMeshes()) for(const prim of mesh.listPrimitives()){
  const p=prim.getAttribute('POSITION'), base=positions.length, el=[];
  for(let i=0;i<p.getCount();i++){p.getElement(i,el); positions.push(el.slice(0,3));}
  const idx=prim.getIndices(), n=idx?idx.getCount():p.getCount(), at=(i)=>base+(idx?idx.getScalar(i):i);
  for(let i=0;i+2<n;i+=3){const a=at(i),b=at(i+1),c=at(i+2); edges.push([a,b],[b,c],[c,a]);}
}
const parent=positions.map((_,i)=>i), find=(x)=>parent[x]===x?x:(parent[x]=find(parent[x]));
const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;}; for(const [a,b] of edges)join(a,b);
const same=new Map(); positions.forEach((p,i)=>{const k=p.map(v=>v.toFixed(5)).join(','); if(same.has(k))join(i,same.get(k)); else same.set(k,i);});
const comps=new Map(); positions.forEach((p,i)=>{const k=find(i);if(!comps.has(k))comps.set(k,[]);comps.get(k).push(p);});
const rows=[...comps.values()].map(points=>{const lo=[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))), hi=[0,1,2].map(k=>Math.max(...points.map(p=>p[k])));return{vertices:points.length,center:lo.map((v,k)=>(v+hi[k])/2),span:lo.map((v,k)=>hi[k]-v)};});
// O exporter guarda a translação no nó; no espaço local, a assinatura causal é uma
// peça única longa em X e fina nos outros dois eixos. O clean não possui tal componente.
const loose=rows.filter(r=>r.span[0]>.75&&r.span[1]<.16&&r.span[2]<.16);
const result={file,components:rows.length,wideComponents:rows.filter(r=>r.span[0]>.5),looseHorizontalBoom:loose}; console.log(JSON.stringify(result,null,2));
if(loose.length){console.error('REPROVADO: boom horizontal solto no corredor de braços/peito');process.exit(1);} console.log('APROVADO: nenhum boom horizontal solto');
