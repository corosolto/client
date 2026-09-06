/* Raycasts dos pixels brancos da V2 identificaram o torus CTF (raio4,5m,
   espessura0,405m), cruzando vãos das lajes. Mede Game._initCTF real; não builder isolado. */
import fs from 'node:fs';
import {THREE,bootGame,initTextures} from './harness.mjs';
const game=bootGame('lajes',{ctf:true,bots:0,textures:initTextures()});
const mutant=process.argv.includes('--mutante=anel-global');
if(mutant){if(!game.world.configureCTFPoint)throw Error('MUTANTE NÃO APLICOU');game.world.configureCTFPoint=undefined;game._initCTF();}
game.scene.updateMatrixWorld(true);
const roofHeight=game.world.design.roofHeight;
const samples=game.ctfPts.map(p=>{let floating=0,total=0;for(const mesh of [p.ring,p.zone]){const geo=mesh.geometry,index=geo.index,attr=geo.attributes.position;for(let i=0;i<(index?.count??attr.count);i+=3){const q=new THREE.Vector3();for(let j=0;j<3;j++)q.add(new THREE.Vector3().fromBufferAttribute(attr,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));q.multiplyScalar(1/3);total++;if(Math.abs(game.world.groundHeightAt(q.x,q.z,roofHeight)-roofHeight)>.01)floating++;}}
const box=new THREE.Box3().setFromObject(p.ring);return {id:p.id,r:p.r,total,floating,ringHeight:box.max.y-box.min.y};});
const ok=samples.length===4&&samples.every(p=>p.r===4.5&&p.total>0&&p.floating===0&&p.ringHeight<.001);
console.log(`${ok?'✓':'✗'} LCTF1 contorno plano sobre laje, raio de captura preservado: ${JSON.stringify(samples)}`);
const out=process.argv.find(a=>a.startsWith('--json='))?.slice(7);if(out)fs.writeFileSync(out,JSON.stringify({ok,mutant,samples},null,2));
process.exit(ok&&!mutant?0:1);
