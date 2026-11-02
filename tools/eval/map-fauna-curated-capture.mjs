const fs=await import('node:fs/promises'),{dir,space,base,pageId,fotos,references}=FAUNA_CAPTURE_CONFIG;
const task=await taskSpace(space),page=task.page(pageId);
const network=createEgoFaunaObserver(page,references.map(ref=>ref.path),{base});
let data,primary,cleanup,hasPrimary=false,hasCleanup=false;
try{
 await network.start();
 await page.cdp('Emulation.setDeviceMetricsOverride',{width:960,height:640,deviceScaleFactor:1,mobile:false});
 await page.cdp('Emulation.setTouchEmulationEnabled',{enabled:false});
 data=await captureCuratedFauna(page,{base,dir,fotos,references,network});
}catch(error){primary=error;hasPrimary=true;}
finally{try{await faunaDeadline(network.close(),'Ego observer cleanup',10000);}catch(error){cleanup=error;hasCleanup=true;}}
if(hasPrimary||hasCleanup)throw Error(JSON.stringify({primary:hasPrimary?String(primary?.stack||primary).slice(0,2000):null,cleanup:hasCleanup?String(cleanup?.message||cleanup).slice(0,400):null}));
await fs.writeFile(dir+'/map-fauna-curated-runtime.json',JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(data.results.map(r=>({map:r.map,animals:r.animals.map(a=>({id:a.id,path:a.assetPath,response:a.response,motion:a.motion}))}))));
