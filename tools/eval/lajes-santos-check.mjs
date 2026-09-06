import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const path = new URL('../../public/js/lajes_santos_dumont.js', import.meta.url);
if (!fs.existsSync(path)) { console.log(JSON.stringify({ pass: false, reason: '14-bis ausente no céu' })); process.exit(1); }
const { attachLajesSantosDumont, createLajes14Bis } = await import(path);
const root = new THREE.Group(), ambience = { paused: false, update() {}, dispose() {} };
const sky = attachLajesSantosDumont(ambience, root, { low: process.argv.includes('--low') });
assert.equal(attachLajesSantosDumont(ambience, root), sky);
const model = sky.group.getObjectByName('LAJES_14BIS_MODEL');
const mutant = process.argv.find(s => s.startsWith('--mutante='))?.split('=')[1];
assert([undefined,'escala','sem-canard','sem-piloto','parado','sem-pausa','sem-dispose'].includes(mutant), 'mutante desconhecido');
if (mutant === 'escala') model.scale.multiplyScalar(2);
if (mutant === 'sem-canard') { const part=model.getObjectByName('14bis-canard'); assert(part); part.removeFromParent(); }
if (mutant === 'sem-piloto') { const part=model.getObjectByName('14bis-pilot'); assert(part); part.removeFromParent(); }
if (mutant === 'parado') ambience.update=()=>{};
if (mutant === 'sem-pausa') { const update=ambience.update; ambience.update=dt=>{ambience.paused=false;update(dt);}; }
if (mutant === 'sem-dispose') ambience.dispose=()=>{};
const checks=[];
const check=(id,ok,detail)=>checks.push({id,pass:!!ok,detail});
const extent=new THREE.Box3().setFromObject(model.clone()).getSize(new THREE.Vector3()).toArray();
check('SD1', Math.abs(extent[0]-12)<.12 && Math.abs(extent[2]-10)<.35, extent);
check('SD2', !!model.getObjectByName('14bis-canard')?.children.length && !!model.getObjectByName('14bis-pilot')?.children.length, 'canard frontal e piloto presentes');
const before=sky.snapshot(); for(let i=0;i<60;i++) ambience.update(1/60);
const moving=sky.snapshot();
check('SD3',new THREE.Vector3(...moving.position).distanceTo(new THREE.Vector3(...before.position))>1 && moving.propeller!==before.propeller, 'trajetória e hélice mudam');
ambience.paused=true; for(let i=0;i<60;i++) ambience.update(1/60);
check('SD4',JSON.stringify(sky.snapshot())===JSON.stringify(moving),'pausa mantém toda a pose');
const geometries=new Set(),materials=new Set(),released=new Set();
model.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});
for(const resource of [...geometries,...materials]) resource.addEventListener('dispose',()=>released.add(resource));
ambience.dispose(); const after=sky.snapshot();
check('SD5',after.disposed && sky.group.parent===null && released.size===geometries.size+materials.size,'dispose remove o grupo e libera geometrias/materiais');
const metrics={ meshes:0, triangles:0 }; model.traverse(o=>{if(o.isMesh){metrics.meshes++;metrics.triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
console.log(JSON.stringify({pass:checks.every(c=>c.pass),mutant:mutant??null,extent,metrics,checks},null,2));
if(process.argv.includes('--export')){
 const output=[];const object=createLajes14Bis();object.updateMatrixWorld(true);object.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld);output.push({name:o.parent.name+'/'+o.name,position:Array.from(g.attributes.position.array),index:g.index?Array.from(g.index.array):null,color:o.material.color.toArray(),roughness:o.material.roughness,metalness:o.material.metalness});g.dispose();});
 fs.writeFileSync(new URL('../../artifacts/lajes-visual/v7/santos/geometry.json',import.meta.url),JSON.stringify(output));
}
process.exitCode=checks.every(c=>c.pass)?0:1;
