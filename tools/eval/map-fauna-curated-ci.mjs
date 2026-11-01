// O CI captura todos os mapas curados; não reutiliza a evidência de outro documento.
// Os mapas vêm das referências: o CI captura explicitamente TODOS os mapas curados
// (hoje 5), sem atalho de lista fixa no wrapper.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { captureCuratedFauna } from './map-fauna-curated-collector.mjs';
import { auditCuratedFaunaCensus } from './map-fauna-curated.mjs';
import { createPlaywrightFaunaObserver, faunaDeadline } from './map-fauna-response-proof.mjs';
if(!process.env.BASE)throw Error('BASE ausente: informe a origem do servidor desta execução.');
const base=new URL(process.env.BASE);
if(!['http:','https:'].includes(base.protocol))throw Error('Base HTTP(S) obrigatória.');
const out=path.resolve(process.env.FAUNA_OUT||'artifacts/map-fauna-curated');
await fs.mkdir(out,{recursive:true});const dir=await fs.mkdtemp(path.join(out,'run-'));
const references=JSON.parse(await fs.readFile(new URL('./map-fauna-curated.json',import.meta.url),'utf8'));
let browser,context,cdp,network,data,primary,hasPrimary=false;
const cleanupErrors=[];
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 context=await browser.newContext({viewport:{width:960,height:640}});const page=await context.newPage();page.setDefaultTimeout(90000);
 cdp=await context.newCDPSession(page);
 network=createPlaywrightFaunaObserver(cdp,references.map(ref=>ref.path),{base:base.href.replace(/\/$/,'')});await network.start();
 data=await captureCuratedFauna(page,{base:base.href.replace(/\/$/,''),dir,fotos:new Set(references.map(r=>r.map)).size,references,network});
}catch(error){primary=error;hasPrimary=true;}
finally{
 for(const [name,close] of [['observer',()=>network?.close()],['CDP',()=>cdp?.detach()],['context',()=>context?.close()],['browser',()=>browser?.close()]]){
  try{await faunaDeadline(Promise.resolve().then(close),name+' cleanup',10000);}catch(error){cleanupErrors.push(name+': '+String(error?.message||error).slice(0,400));}
 }
}
try{
 if(hasPrimary||cleanupErrors.length)throw Error(JSON.stringify({primary:hasPrimary?String(primary?.stack||primary).slice(0,2000):null,cleanupErrors}));
 await fs.writeFile(path.join(dir,'map-fauna-curated-runtime.json'),JSON.stringify(data,null,2)+'\n');
 const actual=JSON.parse(await fs.readFile(path.join(dir,'map-fauna-curated-runtime.json'),'utf8'));
 const audit=auditCuratedFaunaCensus(actual,references,{base:base.href.replace(/\/$/,'')});
 await fs.writeFile(path.join(dir,'map-fauna-audit.json'),JSON.stringify(audit,null,2)+'\n');
 console.log(JSON.stringify({dir,...audit}));if(!audit.pass)process.exitCode=1;
}catch(error){
 await fs.writeFile(path.join(dir,'failure.json'),JSON.stringify({pass:false,error:String(error?.stack||error)},null,2)+'\n');
 console.error('Captura/auditoria runtime falhou; veja '+dir);process.exitCode=1;
}
