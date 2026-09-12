import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, weld } from '@gltf-transform/functions';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const source = 'public/models/props/palafita_pro_amazonia.glb';
const target = 'public/models/props/palafita_aberta_amazonia.glb';
const evidence = 'artifacts/amazonia-visual/cabin-round';
mkdirSync(evidence, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS), doc = await io.read(source);
const primitives = doc.getRoot().listMeshes().flatMap(m => m.listPrimitives());
if (primitives.length !== 1 || doc.getRoot().listNodes().some(n => n.getTranslation().some(v => v) || n.getScale().some(v => v !== 1))) throw Error('Cabin source layout changed');
const primitive = primitives[0], positions = primitive.getAttribute('POSITION');
const min = positions.getMin([]), max = positions.getMax([]), scale = 6 / (max[1] - min[1]);
const indices = primitive.getIndices().getArray(), semantics = primitive.listSemantics();
const attrs = Object.fromEntries(semantics.map(k => [k, primitive.getAttribute(k)]));
const metric = p => [p[0] * scale, 1.1 + (p[1] - min[1]) * scale, p[2] * scale];
const limits = [[0,-2.65,1],[0,2.65,-1],[1,3.78,1],[1,5.25,-1],[2,-3.9,1],[2,.08,-1]];
const lerp = (a,b,t) => Object.fromEntries(semantics.map(k => [k, a[k].map((n,i) => n + (b[k][i]-n)*t)]));
const clip = (poly, axis, limit, side) => {
  const inside=[], outside=[];
  for(let i=0;i<poly.length;i++) {
    const a=poly[i],b=poly[(i+1)%poly.length],da=(metric(a.POSITION)[axis]-limit)*side,db=(metric(b.POSITION)[axis]-limit)*side;
    (da>=0?inside:outside).push(a);
    if((da>=0)!==(db>=0)){const p=lerp(a,b,da/(da-db));inside.push(p);outside.push(p);}
  }
  return {inside,outside};
};
const output=Object.fromEntries(semantics.map(k=>[k,[]]));
let removed=0, roofVertices=0;
const emit = poly => {
  for(let i=1;i+1<poly.length;i++) for(const vertex of [poly[0],poly[i],poly[i+1]]) {
    for(const key of semantics){let values=[...vertex[key]];
      if(key==='POSITION') { const y=metric(values)[1];if(y>=5.25-1e-6){values[1]+=(.72*(7.1-y)/(7.1-5.25))/scale;roofVertices++;} }
      if(key==='NORMAL'){if(metric(vertex.POSITION)[1]>=5.25-1e-6)values[1]/=1-.72/(7.1-5.25);const len=Math.hypot(...values);values=values.map(v=>v/len);}
      output[key].push(...values);
    }
  }
};
for(let i=0;i<indices.length;i+=3){
  let poly=Array.from(indices.slice(i,i+3),index=>Object.fromEntries(semantics.map(k=>[k,attrs[k].getElement(index,[])])));
  for(const plane of limits){if(poly.length<3)break;const {inside,outside}=clip(poly,...plane);emit(outside);poly=inside;}
  if(poly.length>=3)removed++;
}
primitive.setIndices(null);
for(const key of semantics) primitive.setAttribute(key,doc.createAccessor().setType(attrs[key].getType()).setArray(new Float32Array(output[key])).setBuffer(doc.getRoot().listBuffers()[0]));
await doc.transform(weld(),prune());
await io.write(target,doc);
const bounds=[primitive.getAttribute('POSITION').getMin([]),primitive.getAttribute('POSITION').getMax([])];
if(bounds.some((v,i)=>v.some((n,j)=>Math.abs(n-[min,max][i][j])>1e-5))) throw Error('Cabin normalization bounds changed');
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const report={source,target,sourceSHA256:hash(source),sha256:hash(target),sourceTriangles:indices.length/3,triangles:primitive.getIndices().getCount()/3,removedIntersectingTriangles:removed,roofVertices,bytes:readFileSync(target).length,bounds,scale,cutWorldAtTargetH6:{x:[-2.65,2.65],y:[3.78,5.25],z:[-3.9,.08]},roofRemap:'y >= 5.25: y += .72 * (7.1-y) / (7.1-5.25)',normalization:'Original bounds and height6 retained; original roof ridge7.1 retained. Existing wall/slab volume excised; replacement floor/walls are runtime segments.'};
writeFileSync(`${evidence}/asset.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
