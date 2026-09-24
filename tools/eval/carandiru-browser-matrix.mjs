import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { launchCarandiruMatch } from './carandiru-browser-launch.mjs';
import { TETOS } from './cena-tetos.mjs';

const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length+3) ?? fallback;
const base = option('base', 'http://127.0.0.1:8210');
const out = option('out', 'artifacts/carandiru-main-r3/webgl-matrix');
const seconds = Number(option('seconds', '8'));
const selectedTeams=option('teams','5,8').split(',').map(Number);
const selectedModes=option('modes','dm,ctf').split(',');
const selectedAspects=option('aspects','3x2,16x9').split(',');
const allowInherited = process.argv.includes('--allow-inherited');
if (!(seconds >= 5 && seconds <= 120)) throw new Error('seconds inválido');
mkdirSync(out, { recursive:true });
const sourceSha256 = option('source-sha256',createHash('sha256').update(readFileSync('public/js/map_penitenciaria.js')).digest('hex'));
const sourceLabel=option('source-label','candidate-working-tree');
const baseline=process.argv.includes('--baseline');
const canonicalBudget=TETOS.penitenciaria;
/* A matriz observa o maior quadro em oito segundos; cena-check acumula e divide
   dez quadros depois de 30 s. São grandezas diferentes. O teto de pico deriva do
   canônico com folga explícita, enquanto a promoção também exige cena-check. */
const MAX_FRAME_FACTOR=1.5;
const maxFrameBudget={calls:Math.ceil(canonicalBudget.calls*MAX_FRAME_FACTOR),
  triangles:Math.ceil(canonicalBudget.tris*MAX_FRAME_FACTOR)};
const knownPageErrors = new Set(['SUPPORT_URL_BR is not defined']);
const knownHttp = ([status,url]) => status === 404 && (
  url.includes('/%7B%60/map-preview.css') || url.includes('/%7B%60/js/ops.js')
  || url.endsWith('/api/geo-lang')
  || /\/audio\/(manifest(?:\.default)?\.json|menu-music\/m\d+\.mp3|ambiente\/(?:vento|hum-indoor|cidade|buzina|latido-[12]|passaro-[12])\.mp3)(?:\?|$)/.test(url)
);
const classify = (errors, failed, consoleErrors=[], requestFailures=[]) => {
  const known=[], unexpected=[];
  for (const message of errors) (knownPageErrors.has(message)?known:unexpected).push(['pageerror',message]);
  for (const row of failed) (knownHttp(row)?known:unexpected).push(['http',...row]);
  const knownFailures=requestFailures.filter(([url,reason])=>/^https:\/\/csbrasil-backend[^/]*\.run\.app\//.test(url)&&/ERR_FAILED|Failed to fetch/i.test(reason));
  for(const row of requestFailures)(knownFailures.includes(row)?known:unexpected).push(['requestfailed',...row]);
  let genericFailureBudget=knownFailures.length,genericHttpBudget=failed.filter(knownHttp).length;
  for(const message of consoleErrors){
    const cors=/^Access to fetch at 'https:\/\/csbrasil-backend[^']+\.run\.app\//.test(message)&&/blocked by CORS policy/.test(message);
    const generic=/^Failed to load resource: net::ERR_FAILED/.test(message)&&genericFailureBudget-->0;
    const genericHttp=/^Failed to load resource: the server responded with a status of (?:404 \((?:Not Found|File not found)\)|503 \(Service Unavailable\))$/.test(message)&&genericHttpBudget-->0;
    (cors||generic||genericHttp?known:unexpected).push(['console',message]);
  }
  return {known,unexpected};
};
const meetsPerformance=(result)=>result.p95<=20&&result.over100ms===0
  && result.draw.maxCalls<=maxFrameBudget.calls&&result.draw.maxTriangles<=maxFrameBudget.triangles;
if(process.argv.includes('--self-test')){
  const known=classify(['SUPPORT_URL_BR is not defined'],[[404,'http://127.0.0.1:8210/api/geo-lang']]);
  const mutants={
    pageerror:classify(['TypeError: novo'],[]),
    console:classify([],[],['console novo']),
    http:classify([],[[500,'http://127.0.0.1:8210/js/game.js']]),
    request:classify([],[],[],[['http://127.0.0.1:8210/novo','net::ERR_FAILED']]),
  };
  const normal={p95:19.9,over100ms:0,draw:{maxCalls:maxFrameBudget.calls,maxTriangles:maxFrameBudget.triangles}};
  const perf={p95:{...normal,p95:20.1},pause:{...normal,over100ms:1},calls:{...normal,draw:{...normal.draw,maxCalls:maxFrameBudget.calls+1}},triangles:{...normal,draw:{...normal.draw,maxTriangles:maxFrameBudget.triangles+1}}};
  const checks={allowlist:known.unexpected.length===0,performance:meetsPerformance(normal)};
  for(const [id,row] of Object.entries(mutants))checks[`reject-${id}`]=row.unexpected.length===1;
  for(const [id,row] of Object.entries(perf))checks[`reject-${id}`]=!meetsPerformance(row);
  for(const [id,ok] of Object.entries(checks))console.log(`${ok?'PASSA':'FALHA'} ${id}`);
  process.exit(Object.values(checks).every(Boolean)?0:1);
}
const cases=[];
for (const viewport of [{id:'3x2',width:1536,height:1024},{id:'16x9',width:1600,height:900}].filter((row)=>selectedAspects.includes(row.id)))
  for (const team of selectedTeams) for (const mode of selectedModes) cases.push({viewport,team,mode});

const browser = await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
const receipts=[];
try {
  for (const test of cases) {
    const context=await browser.newContext({viewport:{width:test.viewport.width,height:test.viewport.height},deviceScaleFactor:1});
    const page=await context.newPage(), errors=[], failed=[], consoleErrors=[], requestFailures=[];
    page.on('pageerror',(error)=>errors.push(error.message));
    page.on('response',(response)=>{if(response.status()>=400)failed.push([response.status(),response.url()]);});
    page.on('console',(message)=>{if(message.type()==='error')consoleErrors.push(message.text());});
    page.on('requestfailed',(request)=>requestFailures.push([request.url(),request.failure()?.errorText||'unknown']));
    await page.addInitScript(({team})=>{
      localStorage.setItem('awpbr_settings',JSON.stringify({quality:'med',bots:team,vol:0,speech:false}));
      let seed=1977; Math.random=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
    },{team:test.team});
    await launchCarandiruMatch(page,{base,mode:test.mode});
    await page.waitForTimeout(1500);
    await page.evaluate(()=>{
      const g=window.__game; g.player.hp=1e9;g.timeLeft=1e6;g.ctfMatchLeft=1e6;
      g.renderer.info.autoReset=false;
      const frames=[],draw={frames:0,maxCalls:0,maxTriangles:0,totalCalls:0,totalTriangles:0};let last=performance.now();
      const update=g.update;
      g.update=function(dt,render=true){if(render)g.renderer.info.reset();try{return update.call(this,dt,render);}
        finally{if(render){draw.frames++;draw.maxCalls=Math.max(draw.maxCalls,g.renderer.info.render.calls);draw.maxTriangles=Math.max(draw.maxTriangles,g.renderer.info.render.triangles);draw.totalCalls+=g.renderer.info.render.calls;draw.totalTriangles+=g.renderer.info.render.triangles;}}};
      const loop=(time)=>{frames.push(time-last);last=time;if(window.__carandiruPerf)requestAnimationFrame(loop);};
      window.__carandiruPerf={frames,draw,start:performance.now(),renderedStart:g._rafFrames||0};requestAnimationFrame(loop);
    });
    await page.waitForTimeout(seconds*1000);
    const result=await page.evaluate(()=>{
      const g=window.__game,m=window.__carandiruPerf;window.__carandiruPerf=null;
      const frames=m.frames.slice(1).sort((a,b)=>a-b),c=g.world.carandiru;
      const canvas=document.querySelector('canvas');
      return {state:g.state,map:g._mapId,ctf:!!g.ctf,actualBots:g.bots.length,quality:g.settings.quality,
        viewport:[innerWidth,innerHeight],canvas:[canvas?.width||0,canvas?.height||0],gpu:g.renderer.__csWebgl,
        elapsed:performance.now()-m.start,frames:frames.length,renderedFrames:(g._rafFrames||0)-m.renderedStart,
        p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1),
        over100ms:frames.filter((value)=>value>100).length,draw:{...m.draw,
          averageCalls:Math.round(m.draw.totalCalls/Math.max(1,m.draw.frames)),
          averageTriangles:Math.round(m.draw.totalTriangles/Math.max(1,m.draw.frames))},
        scene:{wallAccesses:c?.wallAccesses?.length||0,wallWalkways:c?.wallWalkways?.length||0,guardEntries:c?.guardEntries?.length||0,
          guardRoutes:c?.guardRoutes?.length||0,pavilionPassages:c?.pavilionPassages?.length||0,pavilionStairs:c?.pavilionStairs?.length||0,
          pavilionWindows:c?.pavilionWindows?.length||0,routes:c?.routes?.map((route)=>route.id)||[],ctfPoints:g.world.ctfPoints.length,
          ambienceAnimals:g.world.ambience?.animals?.length||0,soundLoops:g.world.sound?.loops?.length||0}};
    });
    result.id=`${test.viewport.id}-${test.team}x${test.team}-${test.mode}`;
    result.errors=errors;result.failed=failed;result.consoleErrors=consoleErrors;result.requestFailures=requestFailures;
    result.debt=classify(errors,failed,consoleErrors,requestFailures);
    result.sourceSha256=sourceSha256;result.sourceLabel=sourceLabel;result.base=base;result.humanVisualApproval='pending';
    const capturePath=`${out}/${result.id}.png`;
    await page.screenshot({path:capturePath});
    const captureBytes=readFileSync(capturePath);
    result.capture={path:capturePath,bytes:statSync(capturePath).size,sha256:createHash('sha256').update(captureBytes).digest('hex'),width:test.viewport.width,height:test.viewport.height};
    writeFileSync(`${out}/${result.id}.json`,JSON.stringify(result,null,2));
    receipts.push(result);
    const ok=result.state==='live'&&result.map==='penitenciaria'&&result.ctf===(test.mode==='ctf')
      &&result.actualBots===test.team*2-1&&result.quality==='med'&&result.gpu?.api==='webgl2'&&result.gpu?.software!==true
      &&result.frames>=120&&meetsPerformance(result)
      &&(baseline||result.scene.wallAccesses===4&&result.scene.guardEntries===6&&result.scene.pavilionWindows===12
      &&result.scene.routes.length===3&&result.scene.ctfPoints===3&&result.scene.ambienceAnimals>=3&&result.scene.soundLoops===3)
      &&result.debt.unexpected.length===0&&(!result.debt.known.length||allowInherited);
    console.log(`${result.id} ${ok?'PASSA':'FALHA'} p95=${result.p95?.toFixed(1)}ms bots=${result.actualBots} calls(avg/max)=${result.draw.averageCalls}/${result.draw.maxCalls} tris(avg/max)=${result.draw.averageTriangles}/${result.draw.maxTriangles} debt=${result.debt.known.length}/${result.debt.unexpected.length}`);
    if(!ok)process.exitCode=1;
    await context.close();
  }
} finally {await browser.close();}
writeFileSync(`${out}/matrix.json`,JSON.stringify({sourceSha256,sourceLabel,base,seconds,baseline,
  costBudget:{canonicalAverage:canonicalBudget,diagnosticMaxFrame:maxFrameBudget,maxFrameFactor:MAX_FRAME_FACTOR},
  cases:receipts,humanVisualApproval:'pending'},null,2));
