// Mede ambiência no Game servido; o GLB tem de carregar, mover e continuar fora da rota.
import {writeFileSync} from 'node:fs';
export async function captureAmazoniaLife(page,out) {
  await page.evaluate(()=>window.__game.world.skyLife.ready);
  const result=await page.evaluate(()=>{
    const g=window.__game,w=g.world,sky=w.skyLife;
    const snapshots=[];
    for(const t of [0,6]){w.update(.016,t);w.root.updateMatrixWorld(true);snapshots.push({t,boat:w.barco.position.toArray(),birds:sky.items.map(i=>({pos:i.root.position.toArray(),wing:[i.asaE?.rotation.x,i.asaD?.rotation.x]}))});}
    const motion=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
    return{stats:sky.stats(),boatMeshes:w.barco.children.length,snapshots,
      ok:sky.stats().araras>0&&sky.stats().glb===sky.stats().araras&&w.barco.children.length>=1&&motion(snapshots[0].boat,snapshots[1].boat)>1&&snapshots[0].birds.every((b,i)=>motion(b.pos,snapshots[1].birds[i].pos)>1)};
  });
  result.bounds=await page.evaluate(async()=>{
    const T=await import('three'),w=window.__game.world,box=new T.Box3();let minZ=Infinity,maxZ=-Infinity;
    for(let t=0;t<=70;t+=.5){w.update(.5,t);w.root.updateMatrixWorld(true);box.setFromObject(w.barco);minZ=Math.min(minZ,box.min.z);maxZ=Math.max(maxZ,box.max.z);}
    return{minZ,maxZ,ok:minZ>44&&maxZ<60};
  });
  result.ok &&= result.bounds.ok;
  for(const t of [0,6]){
    await page.evaluate(t=>{const g=window.__game;g.world.update(.016,t);g.camera.position.set(6,2.6,43);g.camera.lookAt(0,.3,50);g.vm.root.visible=false;g.renderer.render(g.scene,g.camera)},t);
    await page.screenshot({path:`${out}/barco-${t}.png`});
    await page.evaluate(t=>{const g=window.__game;g.world.update(.016,t);g.camera.position.set(-12,14,6);g.camera.lookAt(-12,18,-12);g.renderer.render(g.scene,g.camera)},t);
    await page.screenshot({path:`${out}/aves-${t}.png`});
  }
  await page.evaluate(()=>{window.__game.vm.root.visible=true});
  writeFileSync(`${out}/life.json`,JSON.stringify(result,null,2));console.log(`${result.ok?'PASS':'FAIL'} AMA2 aves GLB ${result.stats.glb}/${result.stats.araras}, barco móvel z≥${result.bounds.minZ.toFixed(2)}`);
  return result.ok;
}
export async function captureAmazoniaThumbnail(page,out,sourceSHA256) {
  // Canvas real: somente HUD DOM e arma são omitidos. Sem ilustração/substituição do cenário.
  const camera={pos:[-8,8,31],target:[3,2,-5],fov:65};
  const data = await page.evaluate(camera=>{const g=window.__game;g.vm.root.visible=false;g.camera.position.set(...camera.pos);g.camera.lookAt(...camera.target);g.camera.fov=camera.fov;g.camera.updateProjectionMatrix();g.world.update(.016,6);g.renderer.render(g.scene,g.camera);return g.renderer.domElement.toDataURL('image/png')},camera);
  writeFileSync(`${out}/thumbnail.png`,Buffer.from(data.split(',')[1],'base64'));
  writeFileSync(`${out}/thumbnail.json`,JSON.stringify({sourceSHA256,camera,quality:process.env.QUALITY||'med',url:page.url(),source:'Game.renderer canvas; HUD DOM e viewmodel omitidos'},null,2));
}
