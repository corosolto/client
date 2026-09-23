// Gate WebGL dos apoios das palafitas. Usa o mapa servido; o mutante troca a
// mesma expressão por route interception, sem escrever no checkout em execução.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const option=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const base=option('base','http://127.0.0.1:8196'),out=option('out','artifacts/amazonia-perf-r3/supports');
const mutant=option('mutante','');
if(mutant && mutant!=='apoios-flutuantes') throw Error('Mutante desconhecido');
mkdirSync(out,{recursive:true});
const source=readFileSync('public/js/map_amazonia.js','utf8');
const before='bottom = chaoBase(x, z), top = cabin.floorY';
if(source.split(before).length!==2) throw Error('Alvo de apoio não único');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
try{
 const context=await browser.newContext({viewport:{width:1536,height:1024},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(mutant) await page.route('**/*',r=>{
   const path=new URL(r.request().url()).pathname;
   return path==='/js/map_amazonia.js'
     ? r.fulfill({status:200,contentType:'text/javascript',body:source.replace(before,'bottom = chaoBase(x, z) + .8, top = cabin.floorY')})
     : r.continue();
 });
 await page.addInitScript(()=>localStorage.setItem('awpbr_settings',JSON.stringify({quality:'med',bots:8,vol:0,speech:false})));
 await page.goto(`${base}/?debug=1&auto=P,mst&map=amazonia&perfilauto=0&ctf=1`,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__game?.state==='live',null,{timeout:120000});await page.waitForTimeout(3500);
 const result=await page.evaluate(()=>{
   const g=window.__game,s=g.world.amazonia.palafitaSupports||[],groups=new Map();
   for(const p of s){const k=p.station.join(',');groups.set(k,(groups.get(k)||0)+1);}
   const contacts=s.map(p=>({...p,ground:g.world.groundHeightAt(p.x,p.z,p.bottom),gap:Math.abs(p.bottom-g.world.groundHeightAt(p.x,p.z,p.bottom))}));
   return {webgl:g.renderer.__csWebgl,pixelRatio:g.renderer.getPixelRatio(),supports:s.length,stations:groups.size,perStation:[...groups.values()],maxGap:contacts.length?Math.max(...contacts.map(p=>p.gap)):Infinity,minHeight:contacts.length?Math.min(...contacts.map(p=>p.top-p.bottom)):-Infinity,contacts,errors:[]};
 });
 result.errors=errors;
 result.valid=result.webgl?.api==='webgl2'&&result.pixelRatio===1&&result.supports===36&&result.stations===9&&result.perStation.every(n=>n===4)&&result.maxGap<=.02&&result.minHeight>=3&&errors.length===0;
 await page.evaluate(()=>{const g=window.__game;g.paused=true;g.camera.position.set(7.5,1.7,-31.5);g.camera.lookAt(14,2,-27);g.renderer.render(g.scene,g.camera);});
 await page.screenshot({path:`${out}/${mutant||'candidate'}-1536x1024.png`});
 writeFileSync(`${out}/${mutant||'candidate'}.json`,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({valid:result.valid,mutant,webgl:result.webgl,pixelRatio:result.pixelRatio,supports:result.supports,stations:result.stations,maxGap:result.maxGap,minHeight:result.minHeight,errors}));
 process.exitCode=result.valid?0:1;await context.close();
}finally{await browser.close();}
