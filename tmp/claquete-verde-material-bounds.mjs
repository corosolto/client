import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(process.argv[2]); const rows=[];
for(const mesh of doc.getRoot().listMeshes()) for(const p of mesh.listPrimitives()){
  const a=p.getAttribute('POSITION'), v=[]; for(let i=0,e=[];i<a.getCount();i++){a.getElement(i,e);v.push(e.slice())}
  const min=[0,1,2].map(k=>Math.min(...v.map(q=>q[k]))), max=[0,1,2].map(k=>Math.max(...v.map(q=>q[k])));
  rows.push({material:p.getMaterial()?.getName(),min,max,span:max.map((q,i)=>q-min[i]),center:max.map((q,i)=>(q+min[i])/2)});
}
console.log(JSON.stringify(rows,null,2));
