import { createHash } from 'node:crypto';
import { THREE, MAPS, initTextures, seedRandom } from './harness.mjs';

// Baseline 09614892, gerado por mapas-polish-inventory.mjs antes do lote A.
const hashes = { parque_treta:'2b15b3590dd763cde017a58289a42d34fecb57387e877ec37380c98297d1b2c5',
  penitenciaria:'73a69e7d0e51bebebf14eb14856c3597dd7cf9fc347b5933954fb318fab742c5' };
const mutant = process.argv.find(a=>a.startsWith('--mutante='))?.split('=')[1];
const T = await initTextures(); let failures=0;
const check = (id, name, ok, detail) => { console.log(`${ok?'PASS':'FAIL'} ${id} ${name}: ${detail}`); if(!ok) failures++; };
for(const id of Object.keys(hashes)) {
  seedRandom(12345); const scene=new THREE.Scene(), w=MAPS[id].build(scene,T);
  if(mutant==='spawn') w.spawns.E[0].x+=1;
  scene.updateMatrixWorld(true);
  const collisionMeshes=w.occluders.map(o=>{const meshes=[];o.traverse(m=>{if(m.isMesh)meshes.push({matrix:m.matrixWorld.elements,
    positions:Array.from(m.geometry.attributes.position.array),index:m.geometry.index&&Array.from(m.geometry.index.array)});});return meshes;});
  const gameplay={colliders:w.colliders,spawns:w.spawns,ctfPoints:w.ctfPoints,waypoints:w.waypoints,bounds:w.bounds,
    pickups:w.pickups.map(({mesh,...p})=>p),collisionMeshes};
  const hash=createHash('sha256').update(JSON.stringify(gameplay)).digest('hex');
  check(id,'static-gameplay',hash===hashes[id],hash);
  const planes=[];
  w.root.traverse(m=>{if(m.isMesh&&m.geometry.type==='PlaneGeometry'&&m.material.map&&m.geometry.parameters.width*m.geometry.parameters.height>100&&Math.abs(m.rotation.x+Math.PI/2)<.01)planes.push(m);});
  if(mutant==='uv'&&planes[0]) {
    const uv=planes[0].geometry.attributes.uv;
    for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*.05,uv.getY(i)*.05);
  }
  const density=planes.map(m=>{
    const uv=m.geometry.attributes.uv, u=[],v=[];for(let i=0;i<uv.count;i++){u.push(uv.getX(i));v.push(uv.getY(i));}
    const tex=m.material.map, size=tex.image;
    return {name:m.name||'floor',x:size.width*(Math.max(...u)-Math.min(...u))*tex.repeat.x/m.geometry.parameters.width,
      y:size.height*(Math.max(...v)-Math.min(...v))*tex.repeat.y/m.geometry.parameters.height};
  });
  // Banda herdada de texel-check.mjs / BAR-CONSISTENCIA; tolerância só de Float32.
  check(id,'floor-texels',density.length>0&&density.every(d=>d.x>=63.99&&d.y>=63.99&&d.x<=512.01&&d.y<=512.01),JSON.stringify(density));
  const surround=w.root.getObjectByName(`${id==='parque_treta'?'parque':'penitenciaria'}-visual-surround`);
  if(mutant==='entorno'&&surround) surround.position.x=40;
  scene.updateMatrixWorld(true);let inside=0,triangles=0,calls=0;
  surround?.traverse(m=>{if(!m.isMesh)return;calls++;const p=m.geometry.attributes.position,ix=m.geometry.index;
    const v=new THREE.Vector3();for(let i=0;i<ix.count;i+=3){const points=[];for(let k=0;k<3;k++){v.fromBufferAttribute(p,ix.getX(i+k)).applyMatrix4(m.matrixWorld);points.push(v.clone());}
      triangles++;const b=w.bounds;const outside=points.every(v=>v.y<0)||points.every(v=>v.x<b.minX)||points.every(v=>v.x>b.maxX)||points.every(v=>v.z<b.minZ)||points.every(v=>v.z>b.maxZ);
      if(!outside)inside++;
    }});
  check(id,'surround-outside',!!surround&&triangles>0&&inside===0,`${triangles} tris; ${inside} invading; ${calls} material batches`);
}
if(mutant&&!['uv','spawn','entorno'].includes(mutant)) throw new Error('unknown mutant');
process.exitCode=failures?1:0;
