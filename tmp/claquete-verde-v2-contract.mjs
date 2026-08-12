import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const defaultFile='references/tv/claquete-verde/3d/blender-v2/claquete-verde-final-opt.glb';
const file=process.argv[2]||defaultFile; const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(file); const root=doc.getRoot();
const rows=[]; const all=[];
for(const mesh of root.listMeshes()) for(const prim of mesh.listPrimitives()){
 const pos=prim.getAttribute('POSITION'), points=[]; for(let i=0,e=[];i<pos.getCount();i++){pos.getElement(i,e);points.push(e.slice());all.push(e.slice())}
 const parent=points.map((_,i)=>i), find=x=>parent[x]===x?x:(parent[x]=find(parent[x])); const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a};
 const idx=prim.getIndices(), n=idx?idx.getCount():pos.getCount(), at=i=>idx?idx.getScalar(i):i;
 for(let i=0;i+2<n;i+=3){const a=at(i),b=at(i+1),c=at(i+2);join(a,b);join(b,c);join(c,a)}
 const same=new Map(); points.forEach((p,i)=>{const k=p.map(v=>v.toFixed(5)).join(',');if(same.has(k))join(i,same.get(k));else same.set(k,i)});
 const groups=new Map(); points.forEach((p,i)=>{const k=find(i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p)});
 const components=[...groups.values()].map(v=>{const min=[0,1,2].map(k=>Math.min(...v.map(p=>p[k]))),max=[0,1,2].map(k=>Math.max(...v.map(p=>p[k]))),span=max.map((q,i)=>q-min[i]),center=max.map((q,i)=>(q+min[i])/2); const mx=v.reduce((s,p)=>s+p[0],0)/v.length,my=v.reduce((s,p)=>s+p[1],0)/v.length; let c=0,vx=0,vy=0;for(const p of v){const x=p[0]-mx,y=p[1]-my;c+=x*y;vx+=x*x;vy+=y*y}return{min,max,span,center,vertices:v.length,diagonalCorrelation:Math.abs(c/Math.sqrt(Math.max(1e-12,vx*vy)))}});
 rows.push({material:prim.getMaterial()?.getName(),triangles:Math.round(n/3),components});
}
const bodyMin=[0,1,2].map(k=>Math.min(...all.map(p=>p[k]))),bodyMax=[0,1,2].map(k=>Math.max(...all.map(p=>p[k]))),bodySpan=bodyMax.map((q,i)=>q-bodyMin[i]);
const byMat=(...names)=>rows.find(r=>names.includes(r.material));
const faceRow=byMat('CV2_FACE','CV_SKIN'), eyeRow=byMat('CV2_EYE_WHITE','CV_WHITE'), shoulderRow=byMat('CV2_SHOULDER','CV_ARMOR'), bootRow=byMat('CV2_BOOT','CV_RUBBER'), plateRow=byMat('CV2_CLAPPER','CV_CLAPPER_GREEN'), stripeRow=byMat('CV2_CLAPPER_STRIPE','CV_CLAPPER_BLACK');
if(!faceRow||!eyeRow||!shoulderRow||!bootRow||!plateRow||!stripeRow) throw new Error('materiais necessários ausentes');
const head=[...faceRow.components].sort((a,b)=>b.center[1]-a.center[1])[0];
const eye=[...eyeRow.components].sort((a,b)=>b.center[1]-a.center[1])[0];
const shoulders=shoulderRow.components.filter(c=>c.center[1]>1.15&&c.center[1]<1.42&&Math.abs(c.center[0])>.18).sort((a,b)=>b.vertices-a.vertices).slice(0,2);
const boots=bootRow.components.filter(c=>c.center[1]<.30); const plate=[...plateRow.components].sort((a,b)=>b.vertices-a.vertices)[0]; const stripe=[...stripeRow.components].sort((a,b)=>b.vertices-a.vertices)[0];
const avg=a=>a.reduce((s,v)=>s+v,0)/Math.max(1,a.length);
const metrics={
 headHeightRatio:head.span[1]/bodySpan[1], eyeHeightRatio:eye.span[1]/bodySpan[1],
 shoulderDepthRoundness:avg(shoulders.map(c=>c.span[2]/Math.max(c.span[0],c.span[1]))),
 bootHeightRatio:Math.max(...boots.map(c=>c.span[1]))/bodySpan[1],
 plateHeightRatio:plate.span[1]/bodySpan[1], plateTopVsHeadBottom:plate.max[1]-head.min[1],
 plateSurfaceTriangles:plateRow.triangles, stripeComponentCount:stripeRow.components.length,
 stripeDepthRatio:stripe.span[2]/bodySpan[2], stripeDiagonalCorrelation:stripe.diagonalCorrelation,
 stripeSurfaceOffsetRatio:Math.abs(stripe.center[2]-plate.center[2])/plate.span[2],
};
const checks={
 adultHeadProportion:metrics.headHeightRatio<=.19,
 restrainedEyes:metrics.eyeHeightRatio<=.020,
 equippedFlatShoulders:shoulders.length===2&&metrics.shoulderDepthRoundness<=.72,
 practicalBootScale:boots.length===2&&metrics.bootHeightRatio<=.135,
 smallPlateBelowHead:metrics.plateHeightRatio<=.115&&metrics.plateTopVsHeadBottom<=0,
 roundedPlateSurface:metrics.plateSurfaceTriangles>=160,
 oneFlatDiagonalSurfaceStripe:metrics.stripeComponentCount===1&&metrics.stripeDepthRatio<=.025&&metrics.stripeDiagonalCorrelation>=.55&&metrics.stripeSurfaceOffsetRatio<=.70,
};
console.log(JSON.stringify({file,defaultTarget:defaultFile,bodySpan,metrics,checks},null,2)); if(!Object.values(checks).every(Boolean))process.exit(1);
