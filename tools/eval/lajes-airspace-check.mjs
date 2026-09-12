import { THREE, initTextures } from './harness.mjs';
import { buildLajes } from '../../public/js/map_lajes_authored.js';
const w=buildLajes(new THREE.Scene(),initTextures()),a=w.ambience;
const cameras=[[-3,1.62,-27],[3,1.62,27],[-13.8,1.62,0],[13.8,1.62,0],[-9,4.72,-12],[9,4.72,12],[0,1.62,0]];
let overlap=0,minGap=Infinity;
for(let frame=0;frame<6300;frame++){
 a.update(1/60,new THREE.Vector3(0,0,0));if(frame%60)continue;
 const heli=new THREE.Vector3(...a.lajesSky.snapshot().position),santos=new THREE.Vector3(...a.lajesSantosDumont.snapshot().position);
 if(process.argv.includes('--mutante=rotas-sobrepostas'))santos.copy(heli);
 for(const c of cameras){const v=new THREE.Vector3(...c),u=heli.clone().sub(v),q=santos.clone().sub(v);
  const gap=u.angleTo(q)-Math.asin(Math.min(1,7/u.length()))-Math.asin(Math.min(1,8.2/q.length()));minGap=Math.min(minGap,gap);if(gap<=0)overlap++;
 }
}
console.log(JSON.stringify({overlap,minGapDegrees:minGap*180/Math.PI,samples:735,contract:'silhuetas em esferas conservadoras raios7m/8.2m (AABB dos modelos), 7 câmeras por órbita105s'}));
a.dispose();if(overlap)process.exitCode=1;
