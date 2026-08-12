import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const defaultFile='references/tv/claquete-verde/3d/blender-v1/claquete-verde-final-opt.glb';
const file=process.argv[2]||defaultFile;
const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(file); const root=doc.getRoot();
const rows=[]; const all=[];
for(const mesh of root.listMeshes()) for(const p of mesh.listPrimitives()){
  const a=p.getAttribute('POSITION'), points=[]; for(let i=0,e=[];i<a.getCount();i++){a.getElement(i,e);points.push(e.slice());all.push(e.slice())}
  const min=[0,1,2].map(k=>Math.min(...points.map(q=>q[k]))), max=[0,1,2].map(k=>Math.max(...points.map(q=>q[k])));
  rows.push({material:p.getMaterial()?.getName(),min,max,span:max.map((q,i)=>q-min[i]),center:max.map((q,i)=>(q+min[i])/2)});
}
const find=(name)=>rows.find(r=>r.material===name); const plate=find('CV_CLAPPER_GREEN'), edge=find('CV_CLAPPER_BLACK'), hinge=find('CV_HINGE');
if(!plate||!edge||!hinge) throw new Error('materiais causais da ombreira ausentes');
const bodyMin=[0,1,2].map(k=>Math.min(...all.map(q=>q[k]))), bodyMax=[0,1,2].map(k=>Math.max(...all.map(q=>q[k]))), bodySpan=bodyMax.map((q,i)=>q-bodyMin[i]);
const metrics={
  plateCenterX:plate.center[0], plateRearDepth:plate.center[2],
  plateWidthRatio:plate.span[0]/bodySpan[0], plateHeightRatio:plate.span[1]/bodySpan[1],
  integratedEdgeVerticalGap:edge.min[1]-plate.max[1], hingeDistanceX:Math.abs(hinge.center[0]-plate.center[0]),
};
const checks={
  anatomicalLeftOnly:metrics.plateCenterX>0.20,
  rearShoulderNotChest:metrics.plateRearDepth<-0.05,
  readableAtServedSize:metrics.plateWidthRatio>=0.15&&metrics.plateHeightRatio>=0.13,
  edgeIntegratedNotLoose:metrics.integratedEdgeVerticalGap<=0.01,
  shortHingeAttached:metrics.hingeDistanceX<=plate.span[0]*0.45,
};
console.log(JSON.stringify({file,defaultTarget:defaultFile,bodySpan,metrics,checks},null,2));
if(!Object.values(checks).every(Boolean)) process.exit(1);
