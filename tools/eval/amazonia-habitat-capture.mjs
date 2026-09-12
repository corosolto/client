import {writeFileSync} from 'node:fs';
import {playAmazoniaRooms} from './amazonia-room-play.mjs';
export async function captureAmazoniaHabitat(page,out){
 const measured=await page.evaluate(async({mutate})=>{
  const T=await import('three'),g=window.__game,w=g.world;
  w.ambience.reset();w.ambience.update(.05,null);w.update(.05,0);w.root.updateMatrixWorld(true);
  const targets=w.ambience.animals.filter(a=>['tucano','onca','parrot','arara'].includes(a.type));
  const solids=[];w.root.traverse(o=>{if(!o.isMesh||o.userData.nonSolidSurface)return;let p=o;while(p){if(p.userData.ambientLife||p.userData.fauna)return;p=p.parent;}solids.push(o);});
  const ray=new T.Raycaster(),measureSupport=a=>{
   const b=new T.Box3().setFromObject(a.root),c=b.getCenter(new T.Vector3());
   ray.set(new T.Vector3(c.x,b.min.y+.005,c.z),new T.Vector3(0,-1,0));
   const hit=ray.intersectObjects(solids,false)[0];
   return {id:a.id,type:a.type,origin:a.origin.toArray(),bottom:b.min.y,gap:hit?b.min.y-hit.point.y:null,support:hit?.object.name};
  };
  const support=[...targets,...(w.jacare?[{id:'jacare-margem',type:'jacare',root:w.jacare,origin:w.jacare.position}]:[]),...(w.quintal?.children||[]).map((root,i)=>({id:`quintal-${i}`,type:i?'chick':'hen',root,origin:root.position}))].map(measureSupport);
  const motion=[];for(const t of [0,1,2,3,4]){
   w.ambience.time=t;w.ambience.update(.01,null);w.update(.01,t);w.root.updateMatrixWorld(true);
   motion.push({t,animals:targets.map(a=>({id:a.id,position:a.root.position.toArray(),rotation:a.root.rotation.toArray().slice(0,3)})),detail:w.faunaMotion?.snapshot?.()});
  }
  const cabins=w.cabins||[];
  const updateMs=[];if(w.faunaMotion)for(let i=0;i<40;i++){const t=performance.now();w.faunaMotion.update(20+i/20);updateMs.push(performance.now()-t);}
  const details=motion.map(m=>m.detail?.animals||[]);
  const moving=details[0].length>=9&&details[0].every((_,i)=>{
   const samples=details.map(a=>a[i]),d=samples.map(a=>a.maxHeadDelta);
   return Math.max(...d)-Math.min(...d)>.003&&samples.every(a=>a.pinnedFootDelta<1e-5&&a.rootDrift<1e-5);
  });
  const mutants=[];
  if(mutate){
   const bird=targets.find(a=>a.type==='parrot'),y=bird.root.position.y;
   bird.root.position.y+=1;w.root.updateMatrixWorld(true);
   mutants.push({id:'apoio-ausente',killed:measureSupport(bird).gap>.9});
   bird.root.position.y=y;w.root.updateMatrixWorld(true);
   const update=w.faunaMotion.update;w.faunaMotion.update=()=>{};
   const frozen=[];for(const t of [10,11,12]){w.update(.05,t);frozen.push(w.faunaMotion.snapshot().animals.map(a=>a.maxHeadDelta));}
   mutants.push({id:'movimento-congelado',killed:frozen[0].every((v,i)=>frozen.every(a=>a[i]===v))});
   w.faunaMotion.update=update;w.update(.05,0);
  }
  return {support,motion,updateMs,cabins:cabins.map(c=>({id:c.id,door:c.door,floorY:c.floorY,windows:c.windows})),
   supported:support.length>=5&&support.every(s=>s.gap!==null&&Math.abs(s.gap)<.08),rooms: cabins.length===11,moving,mutants};
 },{mutate:process.env.HABITAT_MUTANTS==='1'});
 writeFileSync(`${out}/habitat.json`,JSON.stringify(measured,null,2));
 for(const shot of [
  {name:'tucano-apoio',pos:[-5.1,1.4,7],look:[-7.1,.9,4.65]},
  {name:'onca-apoio',pos:[14.6,1.8,-28.5],look:[11.5,1,-31.5]},
  ...[0,1,2,3].map(t=>({name:`onca-movimento-${t}`,pos:[12.9,1.6,-30],look:[11.5,1.15,-31.5],t})),
  ...[0,1,2,3].map(t=>({name:`tucano-movimento-${t}`,pos:[-6.3,1.1,5.8],look:[-7.1,.9,4.65],t})),
 ]){
  const png=await page.evaluate(s=>{const g=window.__game;g.vm.root.visible=false;g.world.update(.05,s.t||0);g.camera.position.set(...s.pos);g.camera.lookAt(...s.look);g.renderer.render(g.scene,g.camera);return g.renderer.domElement.toDataURL('image/png');},shot);
  writeFileSync(`${out}/${shot.name}.png`,Buffer.from(png.split(',')[1],'base64'));
 }
 await page.evaluate(()=>window.__game.vm.root.visible=true);
 console.log(`${measured.supported?'PASS':'FAIL'} AMH1 fauna com apoio físico`);
 console.log(`${measured.rooms?'PASS':'FAIL'} AMH2 onze cabanas abertas`);
 console.log(`${measured.moving?'PASS':'FAIL'} AMH4 movimento temporal com pés/galhos fixos`);
 for(const m of measured.mutants)console.log(`${m.killed?'PASS':'FAIL'} mutante ${m.id}`);
 const rooms=await playAmazoniaRooms(page,out);
 return measured.supported&&measured.rooms&&rooms&&measured.moving&&measured.mutants.every(m=>m.killed);
}
