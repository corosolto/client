import {writeFileSync} from 'node:fs';
export async function playAmazoniaRooms(page,out){
 const result=await page.evaluate(async({mutate})=>{
  const T=await import('three'),g=window.__game,w=g.world,p=g.player,results=[];
  const saved={bots:g.bots,puff:g._puff,impact:g._impactSfx};g.bots=[];g._puff=()=>{};g._impactSfx=()=>{};
  const walk=(from,to)=>{
   p.pos.set(...from);p.vel.set(0,0,0);p.grounded=true;p.alive=true;p.hp=100;p.mantle=null;p.crouchF=0;p.scoped=false;
   g.touchMove={x:0,z:0};g.keys={KeyW:true};let ticks=0;
   for(;ticks<1200;ticks++){const dx=to[0]-p.pos.x,dz=to[2]-p.pos.z;if(Math.hypot(dx,dz)<.12)break;p.yaw=Math.atan2(-dx,-dz);g.time+=1/120;g._updatePlayer(1/120);}
   g.keys={};return {end:p.pos.toArray(),ticks,ok:Math.hypot(p.pos.x-to[0],p.pos.z-to[2])<.2&&Math.abs(p.pos.y-to[1])<.12};
  };
  const mutants=[];
  try{for(const c of w.cabins||[]){
   const enter=walk(c.door.outside,c.door.inside),leave=walk(c.door.inside,c.door.outside);
   const windows=c.windows.map(win=>{
    const dir=new T.Vector3(win.normal[0],0,win.normal[1]);
    const from=new T.Vector3(...win.center).addScaledVector(dir,-.7);
    const open=g._fireHitscan(p,from,dir,25,false,'teste',null,false).distanceTo(from);
    const obstruction=g.ray.intersectObjects(w.occluders,false)[0];
    from.y=c.floorY+.5;
    const wall=g._fireHitscan(p,from,dir,25,false,'teste',null,false).distanceTo(from);
    const destination=[win.center[0]-dir.x*.55,c.floorY,win.center[2]-dir.z*.55];
    return {wall:win.wall,openDistance:open,obstruction:obstruction?{name:obstruction.object.name,material:obstruction.object.material?.name,point:obstruction.point.toArray(),instanceId:obstruction.instanceId}:null,coverDistance:wall,approach:walk(c.door.inside,destination),ok:open>1.0&&wall<.8};
   });
   results.push({id:c.id,enter,leave,windows});
  }
  if(mutate&&w.cabins?.length){
   const c=w.cabins[0],d=c.door.threshold;
   w.colliders.push({minX:d[0]-.7,maxX:d[0]+.7,minY:c.floorY,maxY:c.floorY+2,minZ:d[2]-.2,maxZ:d[2]+.2});
   mutants.push({id:'porta-fechada',killed:!walk(c.door.outside,c.door.inside).ok});w.colliders.pop();
   const win=c.windows[0],dir=new T.Vector3(win.normal[0],0,win.normal[1]);
   const mesh=new T.Mesh(new T.BoxGeometry(1.6,1.1,.16),new T.MeshBasicMaterial());mesh.position.set(...win.center);mesh.updateMatrixWorld();w.occluders.push(mesh);
   const from=new T.Vector3(...win.center).addScaledVector(dir,-.7);
   mutants.push({id:'janela-fechada',killed:g._fireHitscan(p,from,dir,25,false,'teste',null,false).distanceTo(from)<.8});w.occluders.pop();mesh.geometry.dispose();mesh.material.dispose();
  }
  }finally{g.bots=saved.bots;g._puff=saved.puff;g._impactSfx=saved.impact;g.keys={};}
  return {results,mutants,ok:results.length===11&&results.every(c=>c.enter.ok&&c.leave.ok&&c.windows.length===4&&c.windows.every(w=>w.ok&&w.approach.ok))&&mutants.every(m=>m.killed)};
 },{mutate:process.env.HABITAT_MUTANTS==='1'});
 writeFileSync(`${out}/rooms.json`,JSON.stringify(result,null,2));
 for(const [index,name] of Array.from({length:result.results.length},(_,i)=>[i,i===0?'cabana-madeira':i===2?'cabana-chapa':`cabana-${i}`])){
  for(const inside of (index===0||index===2?[false,true]:[true])){
   const png=await page.evaluate(({index,inside})=>{const g=window.__game,c=g.world.cabins[index];if(!c)return null;g.vm.root.visible=false;const d=c.door;
    const eye=inside?d.inside:d.outside;g.camera.position.set(eye[0],c.floorY+1.62,eye[2]);
    const goal=inside?c.windows[1].center:d.inside;g.camera.lookAt(goal[0],c.floorY+1.5,goal[2]);g.renderer.render(g.scene,g.camera);return g.renderer.domElement.toDataURL('image/png');},{index,inside});
   if(png)writeFileSync(`${out}/${name}-${inside?'dentro':'porta'}.png`,Buffer.from(png.split(',')[1],'base64'));
  }
 }
 await page.evaluate(()=>window.__game.vm.root.visible=true);
 console.log(`${result.ok?'PASS':'FAIL'} AMH3 entrar/sair, aproximar janelas, tiro livre e cobertura`);
 for(const m of result.mutants)console.log(`${m.killed?'PASS':'FAIL'} mutante ${m.id}`);return result.ok;
}
