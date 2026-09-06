import {writeFileSync} from 'node:fs';
export async function captureAmazoniaYard(page,out){
 const result=await page.evaluate(async()=>{
  const T=await import('three'),g=window.__game,w=g.world;
  const bounds=o=>{const b=new T.Box3().setFromObject(o);return {min:b.min.toArray(),max:b.max.toArray()};};
  w.root.updateMatrixWorld(true);
  const fish=[];for(const t of [7.7,7.9,8.225,8.6,8.8]){w.update(1/24,t);fish.push({t,samples:w.peixesSaltando.map(f=>({pos:f.root.position.toArray(),visible:f.root.visible}))});}
  return {yard:w.quintal.children.map(bounds),boats:w.canoasAmarradas.map(bounds),caiman:w.jacare?bounds(w.jacare):null,fish,
   ok:w.quintal.children.length===4&&w.canoasAmarradas.length===5&&!!w.jacare&&w.peixesSaltando.length>0&&fish.some(f=>f.samples.some(a=>a.visible&&a.pos[1]>.5))};
 });
 for(const shot of [
  {name:'galinha-pintinhos',pos:[21.4,1.1,14.5],look:[19.4,.25,12.5],t:0},
  {name:'jacare',pos:[6.7,1.3,22.2],look:[11.1,.2,18.8],t:0},
  {name:'canoa-amarrada',pos:[-.8,1.4,21.2],look:[2.6,.1,18.5],t:0},
  ...[7.7,7.9,8.225,8.6,8.8].map((t,i)=>({name:`peixe-${i}`,pos:[-5.4,1.1,21.6],look:[-3.4,.25,19],t}))]){
   const png=await page.evaluate(shot=>{const g=window.__game;g.vm.root.visible=false;g.camera.fov=65;g.camera.updateProjectionMatrix();g.world.update(1/24,shot.t);g.camera.position.set(...shot.pos);g.camera.lookAt(...shot.look);g.renderer.render(g.scene,g.camera);return g.renderer.domElement.toDataURL('image/png');},shot);
   writeFileSync(`${out}/${shot.name}.png`,Buffer.from(png.split(',')[1],'base64'));
 }
 await page.evaluate(()=>window.__game.vm.root.visible=true);
 writeFileSync(`${out}/yard.json`,JSON.stringify(result,null,2));console.log(`${result.ok?'PASS':'FAIL'} AMY galinha+3pintinhos,5canoas,jacaré e salto real`);return result.ok;
}
