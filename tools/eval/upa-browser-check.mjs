// Chrome/WebGL real para UPA; cada execução cobre uma combinação isolada de modo/equipe/aspecto.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const opt=(n,d)=>process.argv.find(a=>a.startsWith(`--${n}=`))?.slice(n.length+3)??d;
const knownLocal404=/\/(?:api\/geo-lang|img\/decals\/(?:tag-selvagem|tag-fina|tag-flop)\.png|audio\/(?:manifest(?:\.default)?\.json|menu-music\/m\d+\.mp3|ambiente\/(?:funk-bar|cidade|passaros|latido-[12]|galo|panela|passaro-[12])\.mp3))(?:\?|$)/;
const knownTemplate404=/%7B%60\/(?:map-preview\.css|js\/ops\.js)/;
function classify({pageErrors,consoleErrors,httpErrors,requestFailures}){
  const known=[],unexpected=[];
  for(const e of pageErrors)(e==='SUPPORT_URL_BR is not defined'?known:unexpected).push(['pageerror',e]);
  const knownHttp=httpErrors.filter(([status,url])=>(status===404&&(knownLocal404.test(url)||knownTemplate404.test(url)))||(status===503&&/\/api\/pick(?:\?|$)/.test(url)));
  for(const item of httpErrors)(knownHttp.includes(item)?known:unexpected).push(['http',...item]);
  const knownFailed=requestFailures.filter(([url,reason])=>/^https:\/\/csbrasil-backend[^/]*\.run\.app\//.test(url)&&/ERR_FAILED|Failed to fetch/i.test(reason));
  for(const f of requestFailures)(knownFailed.includes(f)?known:unexpected).push(['requestfailed',...f]);
  let genericBudget=knownFailed.length, genericHttpBudget=knownHttp.length;
  for(const e of consoleErrors){
    const cors=/^Access to fetch at 'https:\/\/csbrasil-backend[^']+\.run\.app\//.test(e)&&/blocked by CORS policy/.test(e);
    const generic=/^Failed to load resource: net::ERR_FAILED/.test(e)&&genericBudget-->0;
    const genericHttp=/^Failed to load resource: the server responded with a status of (?:404 \(Not Found\)|503 \(Service Unavailable\))$/.test(e)&&genericHttpBudget-->0;
    (cors||generic||genericHttp?known:unexpected).push(['console',e]);
  }
  return {known,unexpected};
}
if(process.argv.includes('--self-test')){
  const known=classify({pageErrors:['SUPPORT_URL_BR is not defined'],consoleErrors:[],httpErrors:[[404,'http://127.0.0.1:8202/api/geo-lang']],requestFailures:[]});
  const debtMutants={
    pageerror:classify({pageErrors:['TypeError: novo'],consoleErrors:[],httpErrors:[],requestFailures:[]}),
    console:classify({pageErrors:[],consoleErrors:['novo console'],httpErrors:[],requestFailures:[]}),
    http500:classify({pageErrors:[],consoleErrors:[],httpErrors:[[500,'http://127.0.0.1:8202/js/game.js']],requestFailures:[]}),
    requestfailed:classify({pageErrors:[],consoleErrors:[],httpErrors:[],requestFailures:[['http://127.0.0.1:8202/x','net::ERR_FAILED']]}),
  };
  const perfOk=({frameMs:{p95:18},over100:0,draw:{maxCalls:700,maxTriangles:1e6}});
  const meets=r=>r.frameMs.p95<=20&&r.over100===0&&r.draw.maxCalls<=800&&r.draw.maxTriangles<=1100000;
  const perfMutants={
    p95:{...perfOk,frameMs:{p95:20.1}},
    over100:{...perfOk,over100:1},
    calls:{...perfOk,draw:{...perfOk.draw,maxCalls:801}},
    triangles:{...perfOk,draw:{...perfOk.draw,maxTriangles:1100001}},
  };
  const results={allowlist:known.unexpected.length===0,normalPerformance:meets(perfOk)};
  for(const [id,result] of Object.entries(debtMutants))results[`reject-${id}`]=result.unexpected.length===1;
  for(const [id,result] of Object.entries(perfMutants))results[`reject-${id}`]=!meets(result);
  const ok=Object.values(results).every(Boolean);
  for(const [id,pass] of Object.entries(results))console.log(`${pass?'✓':'✗'} ${id}`);
  process.exit(ok?0:1);
}
const base=opt('base','http://127.0.0.1:8202'),out=opt('out','artifacts/upa-r1/browser');
const teams=Number(opt('teams','5')),mode=opt('mode','ctf'),width=Number(opt('width','1536')),height=Number(opt('height','1024')),seconds=Number(opt('seconds','10'));
const sourceSha=opt('source-sha',execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
const sourceLabel=opt('source-label','candidate-working-tree');
const baseline=opt('baseline','0')==='1';
const mapFile='public/js/map_upa.js';
const mapFileBytes=baseline?execFileSync('git',['show',`${sourceSha}:${mapFile}`]):readFileSync(mapFile);
const mapFileHash=createHash('sha256').update(mapFileBytes).digest('hex');
const runtimeDiffHash=createHash('sha256').update(execFileSync('git',['diff','--no-ext-diff','--',mapFile],{encoding:'utf8'})).digest('hex');
if(![5,8].includes(teams)||!['ctf','rounds'].includes(mode)||seconds<5)throw Error('argumentos inválidos');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
try{
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const page=await ctx.newPage();
 const pageErrors=[],consoleErrors=[],httpErrors=[],requestFailures=[];
 page.on('pageerror',e=>pageErrors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)httpErrors.push([r.status(),r.url()]);});
 page.on('requestfailed',r=>requestFailures.push([r.url(),r.failure()?.errorText||'unknown']));
 await page.addInitScript(({teams})=>{localStorage.setItem('awpbr_settings',JSON.stringify({quality:'med',bots:teams,vol:0,speech:false}));localStorage.setItem('awpbr_nick','UPA QA');},{teams});
 const url=baseline?`${base}/?debug=1&auto=E,mst&map=upa_24h&perfilauto=0&armaslazy=0`:`${base}/?debug=1&map=upa_24h&perfilauto=0&armaslazy=0`;
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 if(!baseline){
  const splash=page.locator('#boot-splash');
  if(await splash.isVisible().catch(()=>false)){await page.locator('#splash-enter:not(.hidden)').waitFor({state:'visible',timeout:30000});await splash.click({force:true});await splash.waitFor({state:'detached',timeout:10000});}
  await page.locator('#main-menu:not(.hidden)').waitFor({state:'visible',timeout:30000});await page.waitForTimeout(1100);
  await page.locator('[data-act="single-player"]').click();
  await page.locator(`[data-act="${mode==='ctf'?'ctf':'sp'}"]`).click();
  await page.locator('#map-screen:not(.hidden)').waitFor({state:'visible'});await page.locator('#ms-continue').click();
  await page.locator('#team-select:not(.hidden)').waitFor({state:'visible'});await page.locator('#btn-team-e').click();
  await page.locator('#char-select:not(.hidden)').waitFor({state:'visible',timeout:60000});await page.locator('.char-row').first().click();await page.locator('#char-confirm').click();
  await page.locator('#team-select:not(.hidden)').waitFor({state:'visible'});await page.locator('#btn-team-b').click();
 }
 await page.waitForFunction(()=>window.__game?.state==='live',null,{timeout:120000});await page.waitForTimeout(4000);
 await page.evaluate(()=>{const g=window.__game;g.player.hp=1e9;g.timeLeft=1e6;g.ctfMatchLeft=1e6;g.renderer.info.autoReset=false;window.__upaPerf={active:true,frames:[],draw:{frames:0,maxCalls:0,maxTriangles:0}};let last=performance.now();const update=g.update;g.update=function(dt,render=true){if(render)g.renderer.info.reset();try{return update.call(this,dt,render);}finally{if(render){const d=window.__upaPerf.draw;d.frames++;d.maxCalls=Math.max(d.maxCalls,g.renderer.info.render.calls);d.maxTriangles=Math.max(d.maxTriangles,g.renderer.info.render.triangles);}}};requestAnimationFrame(function tick(t){const s=window.__upaPerf;if(!s.active)return;s.frames.push(t-last);last=t;requestAnimationFrame(tick);});});
 await page.waitForTimeout(seconds*1000);
 const rec=await page.evaluate(({teams,mode})=>{const g=window.__game,s=window.__upaPerf;s.active=false;const q=(a,p)=>a[Math.min(a.length-1,Math.floor(a.length*p))]??null,a=s.frames.slice(1).sort((x,y)=>x-y);return{map:g._mapId,state:g.state,mode:g.ctf?'ctf':'rounds',requestedMode:mode,requestedTeams:teams,actualBots:g.bots.length,api:g.renderer.__csWebgl?.api,pixelRatio:g.renderer.getPixelRatio(),viewport:[innerWidth,innerHeight],sectors:g.world.upaClinicalSectors,accesses:g.world.upaAccesses?.length,covers:g.world.upaClinicalCover?.length,frameMs:{p50:q(a,.5),p95:q(a,.95),p99:q(a,.99),max:a.at(-1)},over100:a.filter(v=>v>100).length,draw:s.draw};},{teams,mode});
 rec.source={label:sourceLabel,sha:sourceSha,mapFile,mapFileSha256:mapFileHash,runtimeDiffSha256:baseline?'clean':runtimeDiffHash,baseUrl:base,url,flow:baseline?'auto-baseline':'menu',generatedAt:new Date().toISOString()};
 rec.browserDebt={pageErrors,consoleErrors,httpErrors,requestFailures,...classify({pageErrors,consoleErrors,httpErrors,requestFailures})};
 const label=`upa-${mode}-${teams}-${width}x${height}`;writeFileSync(`${out}/${label}.json`,JSON.stringify(rec,null,2)+'\n');
 const views=[['recepcao',[-20,0,-29],[-18,1.2,-17]],['farmacia',[18,0,-31],[17,1.2,-20]],['consultorios',[-18,0,-11],[-18,1.2,5]],['triagem',[18,0,-11],[17,1.2,7]],['observacao',[-18,0,17],[-18,1.2,29]],['emergencia',[18,0,17],[18,1.2,29]]];
 for(const [id,pos,look] of views){await page.evaluate(({pos,look})=>{const g=window.__game;g.paused=true;g.player.hp=100;g._updateHud();for(const b of g.bots)b.mesh.group.visible=false;g.player.pos.set(...pos);g.camera.position.set(pos[0],1.62,pos[2]);g.camera.fov=70;g.camera.updateProjectionMatrix();g.camera.lookAt(...look);g.scene.updateMatrixWorld(true);g.renderer.render(g.scene,g.camera);},{pos,look});await page.screenshot({path:`${out}/${label}-${id}.png`});}
 console.log(JSON.stringify({label,map:rec.map,mode:rec.mode,actualBots:rec.actualBots,api:rec.api,frameMs:rec.frameMs,over100:rec.over100,draw:rec.draw,unexpected:rec.browserDebt.unexpected.length,source:rec.source}));
 const structureOk=baseline||((rec.accesses??0)>=12&&(rec.covers??0)>=12&&Object.keys(rec.sectors??{}).length>=6);
 const perfOk=rec.frameMs.p95<=20&&rec.over100===0&&rec.draw.maxCalls<=800&&rec.draw.maxTriangles<=1100000;
 if(rec.browserDebt.unexpected.length||rec.map!=='upa_24h'||rec.state!=='live'||rec.mode!==mode||rec.actualBots!==teams*2-1||rec.api!=='webgl2'||!structureOk||!perfOk)process.exitCode=1;
 await ctx.close();
}finally{await browser.close();}
