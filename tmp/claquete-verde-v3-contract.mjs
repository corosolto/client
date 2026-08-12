import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const defaultFile='references/tv/claquete-verde/3d/blender-v4-native/claquete-verde-final-opt.glb'; const file=process.argv[2]||defaultFile;
const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(file),root=doc.getRoot(); const positions=[],edges=[],byMaterial=new Map();
for(const mesh of root.listMeshes())for(const prim of mesh.listPrimitives()){
 const a=prim.getAttribute('POSITION'),base=positions.length,local=[];for(let i=0,e=[];i<a.getCount();i++){a.getElement(i,e);positions.push(e.slice());local.push(e.slice())}
 const idx=prim.getIndices(),n=idx?idx.getCount():a.getCount(),at=i=>base+(idx?idx.getScalar(i):i);for(let i=0;i+2<n;i+=3){const x=at(i),y=at(i+1),z=at(i+2);edges.push([x,y],[y,z],[z,x])}
 const material=prim.getMaterial(),name=material?.getName()||'(none)';if(!byMaterial.has(name))byMaterial.set(name,{points:[],material});byMaterial.get(name).points.push(...local);
}
const parent=positions.map((_,i)=>i),find=x=>parent[x]===x?x:(parent[x]=find(parent[x])),join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a};for(const [a,b]of edges)join(a,b);
const same=new Map();positions.forEach((p,i)=>{const k=p.map(v=>v.toFixed(5)).join(',');if(same.has(k))join(i,same.get(k));else same.set(k,i)});
const comps=new Map();positions.forEach((p,i)=>{const k=find(i);if(!comps.has(k))comps.set(k,[]);comps.get(k).push(p)});const sizes=[...comps.values()].map(v=>v.length).sort((a,b)=>b-a);
const bounds=pts=>{const min=[0,1,2].map(k=>Math.min(...pts.map(p=>p[k]))),max=[0,1,2].map(k=>Math.max(...pts.map(p=>p[k])));return{min,max,span:max.map((v,i)=>v-min[i]),center:max.map((v,i)=>(v+min[i])/2)}};
const body=bounds(positions),pick=(...names)=>names.map(n=>byMaterial.get(n)).find(Boolean);const plateRow=pick('CV3_CLAPPER','CV2_CLAPPER'),stripeRow=pick('CV3_STRIPE','CV2_CLAPPER_STRIPE');if(!plateRow||!stripeRow)throw new Error('materiais semânticos de claquete ausentes');const plate=bounds(plateRow.points),stripe=bounds(stripeRow.points);
const cov2=pts=>{const mx=pts.reduce((s,p)=>s+p[0],0)/pts.length,my=pts.reduce((s,p)=>s+p[1],0)/pts.length;let xx=0,yy=0,xy=0;for(const p of pts){const x=p[0]-mx,y=p[1]-my;xx+=x*x;yy+=y*y;xy+=x*y}xx/=pts.length;yy/=pts.length;xy/=pts.length;const tr=xx+yy,d=Math.sqrt((xx-yy)**2+4*xy**2),small=(tr-d)/2;return{thickness:Math.sqrt(Math.max(0,small)*12),correlation:Math.abs(xy/Math.sqrt(Math.max(1e-12,xx*yy)))}};const stripeShape=cov2(stripeRow.points);
const lum=m=>{const c=m?.getBaseColorFactor?.()||[0,0,0,1];return .2126*c[0]+.7152*c[1]+.0722*c[2]};const predictedBodyPx=124,predictedStripePx=stripeShape.thickness/body.span[1]*predictedBodyPx;
const propPoints=[...plateRow.points,...stripeRow.points,...(pick('CV3_HINGE')?.points||[])];
const inRightShoulder=propPoints.filter(p=>p[0]<-.05&&p[1]>=body.min[1]+body.span[1]*.66&&p[1]<=body.min[1]+body.span[1]*.88).length;
const inChestAds=propPoints.filter(p=>Math.abs(p[0])<.22&&p[1]>=body.min[1]+body.span[1]*.52&&p[1]<=body.min[1]+body.span[1]*.90).length;
const inHandCorridors=propPoints.filter(p=>Math.abs(p[0])>.46&&p[1]>=body.min[1]+body.span[1]*.42&&p[1]<=body.min[1]+body.span[1]*.78).length;
const metrics={globalConnectedComponents:sizes.length,largestSurfaceCoverage:sizes[0]/positions.length,plateWidthRatio:plate.span[0]/body.span[0],plateHeightRatio:plate.span[1]/body.span[1],plateTopRatio:plate.max[1]/body.max[1],plateCenterXRatio:plate.center[0]/body.span[0],stripePredictedThicknessPx150:predictedStripePx,stripeDiagonalCorrelation:stripeShape.correlation,stripeLuminanceContrast:Math.abs(lum(stripeRow.material)-lum(plateRow.material)),rightShoulderIntrudingVertices:inRightShoulder,chestAdsIntrudingVertices:inChestAds,handCorridorIntrudingVertices:inHandCorridors};
const checks={adultContinuousSurface:metrics.globalConnectedComponents<=8&&metrics.largestSurfaceCoverage>=.80,noLargeDorsalSlab:metrics.plateHeightRatio<=.13&&metrics.plateTopRatio<=.86,leftShoulderMounted:metrics.plateCenterXRatio>=.20,contrastReadableSurfaceStripe:metrics.stripePredictedThicknessPx150>=1.5&&metrics.stripeDiagonalCorrelation>=.50&&metrics.stripeLuminanceContrast>=.45,rightShoulderFree:inRightShoulder===0,chestAdsFree:inChestAds===0,handsFree:inHandCorridors===0};
console.log(JSON.stringify({file,defaultTarget:defaultFile,bodySpan:body.span,metrics,checks},null,2));if(!Object.values(checks).every(Boolean))process.exit(1);
