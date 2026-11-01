const fs=await import('node:fs/promises'),{dir,space,base,pageId,fotos,references}=FAUNA_CAPTURE_CONFIG;
const task=await taskSpace(space),page=task.page(pageId);
await page.cdp('Emulation.setDeviceMetricsOverride',{width:960,height:640,deviceScaleFactor:1,mobile:false});
await page.cdp('Emulation.setTouchEmulationEnabled',{enabled:false});
const data=await captureCuratedFauna(page,{base,dir,fotos,references});
await fs.writeFile(dir+'/map-fauna-curated-runtime.json',JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(data.results.map(r=>({map:r.map,animals:r.animals.map(a=>({id:a.id,path:a.assetPath,motion:a.motion}))}))));
