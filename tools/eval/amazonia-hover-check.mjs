// Exercita mídia real no card servido e suas condições de início/parada.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const pw=await import(pathToFileURL(`${execFileSync('npm',['root','-g']).toString().trim()}/playwright/index.js`));
const chromium=pw.chromium||pw.default.chromium;
const base=process.env.BASE||'http://127.0.0.1:8157',out=process.env.OUT||'artifacts/amazonia-visual/hover-check';
const mutant=process.argv.includes('--mutante=sem-saida'), missing=process.argv.includes('--missing');
mkdirSync(out,{recursive:true});
const checks=[],check=(id,ok,detail)=>checks.push({id,ok:!!ok,detail});
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(readFileSync('public/img/map-previews/amazonia.capture.json'));
check('HOV1',receipt.kind==='webgl-game-capture'&&receipt.sources['public/js/map_amazonia.js']===sha(readFileSync('public/js/map_amazonia.js'))&&Object.values(receipt.media).every(m=>sha(readFileSync(m.path))===m.sha256),'bytes e fonte da captura real');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
try{
 const page=await browser.newPage({viewport:{width:1536,height:1024}}),requests=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(r.url().includes('/map-previews/amazonia.mp4'))requests.push(r.url());});
 await page.route('**/*',async r=>{
   const u=new URL(r.request().url());
   if(u.origin!==new URL(base).origin||u.pathname.startsWith('/api/'))return r.abort();
   if(missing&&u.pathname.endsWith('/amazonia.mp4'))return r.fulfill({status:404,body:''});
   if(mutant&&u.pathname==='/js/amazonia_map_preview.js'){
     const res=await r.fetch(),source=await res.text(),body=source.replace("host.addEventListener('pointerleave', stop);",'');
     if(body===source)throw Error('mutante não aplicou');
     return r.fulfill({response:res,body});
   }
   return r.continue();
 });
 await page.goto(`${base}/?tela=maps&map=amazonia&lang=pt-BR&perfilauto=0`,{waitUntil:'domcontentloaded',timeout:120000});
 const card=page.locator('.ms-thumb[data-id="amazonia"]');
 await card.waitFor({state:'visible',timeout:90000});await card.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
 await card.locator('img').evaluate(img=>img.decode());
 await page.screenshot({path:`${out}/static.png`});
 check('HOV2',requests.length===0,'nenhuma requisição de vídeo antes do hover');
 await card.hover();
 let started=false;
 try{await page.waitForFunction(()=>{const v=document.querySelector('.ms-thumb[data-id="amazonia"] video');return v&&!v.paused&&v.currentTime>.1&&v.classList.contains('playing');},null,{timeout:8000});started=true;}catch{}
 const video=card.locator('video');
 if(missing){check('HOV8',!started&&await card.locator('img').evaluate(img=>img.complete&&img.naturalWidth===960),'404 conserva poster');}
 else{
  let moving=false;
  if(started){const first=await video.evaluate(v=>v.currentTime);await page.waitForTimeout(400);moving=await video.evaluate((v,t)=>v.currentTime!==t&&v.muted&&v.videoWidth===960,first);}
  check('HOV3',started&&moving,'hover decodifica e avança vídeo silencioso');
  await page.screenshot({path:`${out}/hover.png`});
  if(started){
   await page.setViewportSize({width:1200,height:800});await card.hover();await page.waitForTimeout(250);
   const fit=await card.evaluate(h=>{const a=h.querySelector('img').getBoundingClientRect(),b=h.querySelector('video').getBoundingClientRect();return {dx:Math.abs(a.x-b.x),dy:Math.abs(a.y-b.y),dw:Math.abs(a.width-b.width),dh:Math.abs(a.height-b.height)};});
   check('HOV6',Object.values(fit).every(n=>n<=1),fit);
   await page.mouse.move(0,0);await page.waitForTimeout(200);
   check('HOV4',await video.evaluate(v=>v.paused&&!v.classList.contains('playing')),'sair devolve poster e pausa');
   await page.emulateMedia({reducedMotion:'reduce'});await card.hover();await page.waitForTimeout(250);
   check('HOV5',await video.evaluate(v=>v.paused&&!v.classList.contains('playing')),'movimento reduzido conserva poster');
   await page.emulateMedia({reducedMotion:'no-preference'});await page.mouse.move(0,0);
   await page.keyboard.press('Tab');await card.focus();await page.waitForTimeout(250);
   check('HOV10',await video.evaluate(v=>!v.paused),'foco por teclado inicia a prévia');
   await card.evaluate(h=>h.blur());await card.hover();
   await page.waitForFunction(()=>!document.querySelector('.ms-thumb[data-id="amazonia"] video').paused);
   await video.evaluate(v=>{window.__oldMapVideo=v;});
   await page.locator('#ms-continue').click();
   check('HOV7',await page.evaluate(()=>window.__oldMapVideo.paused),'troca de tela pausa vídeo removido');
  }
 }
 check('HOV9',errors.length===0,errors);
}finally{await browser.close();}
const failed=checks.filter(c=>!c.ok).map(c=>c.id);
writeFileSync(`${out}/report.json`,JSON.stringify({base,mutant,missing,checks,failed},null,2));console.log(JSON.stringify({checks,failed}));
process.exitCode=mutant?+(JSON.stringify(failed)!==JSON.stringify(['HOV4'])):+!!failed.length;
