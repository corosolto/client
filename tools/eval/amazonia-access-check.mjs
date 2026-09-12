// Relato 06/09 e GLB medido em artifacts/amazonia-visual/stairs-audit/audit.json.
// O piso real da varanda fica a ~3.85m; o corpo .38m precisa chegar sem colisão.
import { THREE, MAPS, bootGame, initTextures } from './harness.mjs';
if(process.env.AMAZONIA_SOURCE) MAPS.amazonia.build=(await import(process.env.AMAZONIA_SOURCE)).buildAmazonia;
const g=bootGame('amazonia',{textures:initTextures(),ctf:true,seed:13007}),w=g.world;
let failed=0;
for(const s of w.amazonia.estacoes.filter(s=>!(s.x===14&&s.z===-9)&&!(s.x===-14&&s.z===6))){
 const sign=s.x>0?1:-1;let y=w.amazonia.deckY,maxShift=0,maxRise=0;
 for(let i=0;i<=96;i++){
  const x=s.x+sign*(-3.3+i*3.85/96),z=s.z+sign*.7;
  const ny=w.groundHeightAt(x,z,y);maxRise=Math.max(maxRise,Math.abs(ny-y));y=ny;
  const p=new THREE.Vector3(x,y,z);g._collide(p,.38);maxShift=Math.max(maxShift,Math.hypot(p.x-x,p.z-z));
 }
 const ok=Math.abs(y-3.85)<.1&&maxRise<=.3&&maxShift<.05;
 if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} AMA1 varanda ${s.x},${s.z}: y=${y.toFixed(3)} step=${maxRise.toFixed(3)} shift=${maxShift.toFixed(3)}`);
}
if(failed)process.exitCode=1;
// A parede física e a malha de tiro devem concordar também nas duas casas de chapa.
w.root.updateMatrixWorld(true);
for(const [x,z] of [[14,-3],[-14,12]]) {
 const ray=new THREE.Raycaster(new THREE.Vector3(x,3.5,z),new THREE.Vector3(0,0,-1),0,4);
 const hit=ray.intersectObjects(w.occluders,true)[0];
 const ok=!!hit&&Math.abs(hit.distance-3.3)<.02;
 console.log(`${ok?'PASS':'FAIL'} AMA3 parede opaca ${x},${z}: ${hit?.distance ?? 'sem hit'}`);
 if(!ok)process.exitCode=1;
}
