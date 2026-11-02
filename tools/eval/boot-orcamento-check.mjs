// Transporte HTTP real e contrato: docs/visual-consistency/BOOT-COHERENT-OVERLAY.md.
import { execSync } from 'node:child_process';
import { startBootOrigin,snapshotPublicJs,assertSnapshotLive } from './boot-network-origin.mjs';
import {freezeWindow,awaitWindow,validateReadyExact} from './boot-network-window.mjs';
import {verifyDecoded,verifyResponseRecord,awaitBodies} from './boot-network-body.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { chaveDeCarga, InfraError, JS_EXCLUSOS, somaCargas, aceitaMutante, cancelaUi, prefixoRecebido, validaEnc } from './boot-overlay.mjs';
import {createGuestProfileObserver,readGuestPageIdentity} from './boot-guest-profile.mjs';
import {instrumentPosterIntent,collectPosterProof,lazyPosterSubset} from './boot-poster-intent.mjs';
import {awaitLocalModuleProof} from './boot-local-proof.mjs';

const args = process.argv.slice(2), vistos = new Set(), opcoes = {};
for (const a of args) {
  const m=a.match(/^--(base|mutante)=(.+)$/);
  const k=a==='--self-test'?'self-test':m?.[1];
  if (!k || vistos.has(k)) { console.error('uso: --base=URL --mutante=cartaz-ansioso|fauna-cedo --self-test (sem duplicatas)'); process.exit(2); }
  vistos.add(k); opcoes[k]=m?.[2] ?? true;
}
const MUTANTE=opcoes.mutante || '', BASE=opcoes.base || process.env.BASE || 'https://www.csbrasil.online';
if (!['','cartaz-ansioso','fauna-cedo'].includes(MUTANTE)) { console.error('mutante desconhecido');process.exit(2); }
try { if (!['http:','https:'].includes(new URL(BASE).protocol)) throw Error(); }
catch { console.error('BASE inválida');process.exit(2); }
if (opcoes['self-test']) {
  if (args.length !== 1) { console.error('--self-test exige uso isolado');process.exit(2); }
  const {selfTest}=await import('./boot-overlay.mjs');process.exit(selfTest().length?1:0);
}

// Tetos e procedência: docs/visual-consistency/BOOT-COHERENT-OVERLAY.md.
const TETO_BYTES = 8_200_000;
const TETO_REQS = 340;

// Referência e mutante compartilham a transformação e recusam âncora ausente.
const ANSIOSO = /( {2})T\.posterImgs = \[\];\n {2}POSTER_FILES\.forEach\(\(\[f\], i\) => \{[\s\S]*?\n {2}\}\);\n/;
function poolAnsioso(corpo) {
  if (!ANSIOSO.test(corpo)) throw new Error('não achei o bloco de getters de T.posterImgs em textures.js');
  return corpo.replace(ANSIOSO, '  T.posterImgs = POSTER_FILES.map(([f]) => _cartaz(f));\n');
}
// A chamada real é a âncora da mutação.
const FAUNA_ADIADA = '      preloadMapAmbientLife(mapa).then(rebuildCurrent).catch(() => {});\n';
function faunaCedo(corpo) {
  if (!corpo.includes(FAUNA_ADIADA)) throw new Error('não achei a chamada adiada de preloadMapAmbientLife em main.js');
  return corpo
    .replace(FAUNA_ADIADA, '')
    .replace('    return propsReady.then(() => {', `    preloadMapAmbientLife(mapa).then(rebuildCurrent).catch(() => {});\n    return propsReady.then(() => {`);
}
const SPLASH_READY = 'function _splashSetReady() {';
function instrumentaCausaSplash(corpo) {
  if (!corpo.includes(SPLASH_READY)) throw new Error('não achei _splashSetReady em main.js');
  const token="  if (se) se.classList.remove('hidden');";
  if(corpo.split(token).length!==2)throw new Error('âncora READY DOM ausente/duplicada');
  const marked=corpo.replace(token,"  if (se) {se.classList.remove('hidden');if(window.__csReadyExact!==undefined)throw Error('READY exact duplicado');window.__csReadyExact={time:performance.now(),timeOrigin:performance.timeOrigin,cause:_splashPorFailsafe?'failsafe':'assets',hidden:se.classList.contains('hidden')};}");
  return marked.replace(SPLASH_READY, `${SPLASH_READY}\n  window.__csSplashCause ||= _splashPorFailsafe ? 'failsafe' : 'assets';`);
}

const PUBLIC_ROOT=new URL('../../public/',import.meta.url);
let SNAPSHOT;
try {SNAPSHOT=snapshotPublicJs(PUBLIC_ROOT);}catch(e){console.error('INFRA3 snapshot: '+e.message);process.exit(3);}
const RUN_ID=randomUUID();
let browser;
try {
  const gRoot=execSync('npm root -g').toString().trim();
  const pw=await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
  const chromium=pw.chromium||pw.default?.chromium;
  const softwareGLArgs=process.platform==='darwin'?[]:['--use-angle=swiftshader','--enable-unsafe-swiftshader'];
  browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:[...softwareGLArgs,'--headless=new','--mute-audio','--disable-dev-shm-usage']});
} catch(e) {console.error(`INFRA3 browser indisponível: ${e.message}`);process.exit(3);}

async function mede({ refPoolAnsioso = false, mutante = '' } = {}) {
  assertSnapshotLive(SNAPSHOT);
  const label=refPoolAnsioso?'reference':mutante||'nominal',passId=label+'-'+randomUUID(),proofDir=process.env.BOOT_PROOF_DIR?process.env.BOOT_PROOF_DIR+'/'+RUN_ID+'/'+passId:null;
  if(proofDir)mkdirSync(proofDir,{recursive:true});
  console.log('BOOT_PASS '+JSON.stringify({runId:RUN_ID,passId,label,proofDir,snapshot:SNAPSHOT.fingerprint}));
  let context,origin,page,guest,terminalCapture=null,localProof=null,diagnostic=()=>({});
  try {
  context = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    try { localStorage.setItem('cs_privacy', JSON.stringify({ version: 'corosolto-analytics-v1', analytics: false, updatedAt: new Date(0).toISOString() })); } catch {}
    // MapPinned preserva a mesma cena em todas as passadas.
    try { localStorage.setItem('awpbr_settings', JSON.stringify({ map: 'praca_poderes', mapPinned: true })); } catch {}
  });
  await context.addInitScript(()=>{
    const trace=window.__bootTrace=[];window.__bootFetchBodies=[];window.__bootFetchPromises=[];window.__bootFetchProofById=new Map();const now=()=>performance.now();const note=(event,data)=>{if(trace.length<200)trace.push({event,time:now(),...data});};
    const originalAbort=AbortController.prototype.abort;
    AbortController.prototype.abort=function(...args){note('controller.abort',{stack:new Error().stack,reason:String(args[0]||'')});return originalAbort.apply(this,args);};
    const originalFetch=window.fetch;
    window.fetch=function(input,init){const url=typeof input==='string'?input:input?.url;const relevant=/models\/props\//.test(url||'');
      if(relevant){note('prop-fetch',{url,stack:new Error().stack});const signal=init?.signal||input?.signal;signal?.addEventListener('abort',()=>note('prop-signal-abort',{url,stack:new Error().stack,reason:String(signal.reason)}),{once:true});}
      const result=originalFetch.apply(this,arguments);
      result.then(response=>{const resolved=new URL(response.url,location.href);if(resolved.origin!==location.origin||!/^https?:$/.test(resolved.protocol))return;
       const row={url:response.url,id:response.headers.get('x-boot-response-id'),state:'pending'};window.__bootFetchBodies.push(row);
       const proof=response.clone().arrayBuffer().then(async body=>{const hash=await crypto.subtle.digest('SHA-256',body);row.bytes=body.byteLength;row.sha256=[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');row.state='checked';},e=>{row.state='error';row.error=e.message;});window.__bootFetchPromises.push(proof);window.__bootFetchProofById.set(row.id,proof);
      },()=>{});
      if(relevant)result.then(r=>note('prop-response',{url,status:r.status,type:r.type}),e=>note('prop-fetch-reject',{url,name:e.name,message:e.message,stack:e.stack}));return result;};
    for(const event of ['beforeunload','pagehide','unload'])window.addEventListener(event,()=>note(event,{url:location.href}));
  });
  const isentas=new Set(),sobrepostos=new Map(),corposEsperados=new Map(),verificados=new Set(),verificacoes=new Map();
  const bodyChecks=new Map(),bodyRecords=new Map(),servedPayloads=new Map(),serverIds=new Set();
  let reportProxyError=null;const pendingProxyErrors=[];
  origin=await startBootOrigin({BASE,snapshot:SNAPSHOT,transformJs:(rel,original)=>{
    let corpo=original;
    if(rel==='js/textures.js'&&(refPoolAnsioso||mutante==='cartaz-ansioso'))corpo=poolAnsioso(corpo);
    if(rel==='js/textures.js')corpo=instrumentPosterIntent(corpo);
    if(rel==='js/main.js'){if(mutante==='fauna-cedo')corpo=faunaCedo(corpo);corpo=instrumentaCausaSplash(corpo);}
    return corpo;
  },onError:e=>{const m='HTTP proxy: '+e.message;pendingProxyErrors.push(m);reportProxyError?.(m);},authorizeProfile:meta=>guest?guest.authorizeProfile(meta):null});
  const navigation=new URL(origin.url+new URL(BASE).pathname+new URL(BASE).search);navigation.searchParams.set('api',origin.url);const PAGE_BASE=navigation.href;
  page = await context.newPage();
  page.on('request',request=>{
    const local=origin.lookup(request.url());if(!local)return;
    corposEsperados.set(request,local.body);
    const key=chaveDeCarga(request.url());if(JS_EXCLUSOS.includes(local.rel))isentas.add(key);else sobrepostos.set(key,local.payloadBytes);
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');

  const reqs = new Map(),navs=[],consoleErrors=[];let frozenCutoff=null;
  page.on("framenavigated",f=>{if(f===page.mainFrame())navs.push({url:f.url(),time:Date.now()});});
  page.on("console",m=>{if(["warning","error"].includes(m.type())&&consoleErrors.length<30)consoleErrors.push({type:m.type(),text:m.text()});});
  cdp.on('Network.requestWillBeSent', (e) => {
    if (e.redirectResponse || reqs.has(e.requestId)) {
      marcaInfra(`redirect/reuso de requestId sem contabilidade de hops: ${e.requestId}`); return;
    }
    if(!Number.isFinite(e.wallTime)||e.wallTime<=0||!Number.isFinite(e.timestamp)||e.timestamp<=0){marcaInfra('clock CDP request inválido');return;}
    const startEpoch=e.wallTime*1000;
    if(frozenCutoff!==null&&startEpoch<=frozenCutoff&&new URL(e.request.url).origin===origin.url&&new URL(e.request.url).pathname.startsWith('/posters/'))marcaInfra('início de cartaz tardio dentro da janela após freeze: '+e.request.url);
    reqs.set(e.requestId, { startMonotonic:e.timestamp,requestId:e.requestId,loaderId:e.loaderId,type:e.type,documentURL:e.documentURL,method:e.request.method,initiator:e.initiator, url: e.request.url, inicio: startEpoch, fim: null, bytes: 0, erro: null, recebidoResposta: 0, recebidoChunks: 0, canceladaUi: false });
  });
  const fecha = (e) => {
    const r = reqs.get(e.requestId); if (!r) {marcaInfra('finish sem request: '+e.requestId);return;}
    r.bytes = e.encodedDataLength;
    if (!Number.isFinite(r.bytes) || r.bytes < 0) marcaInfra(`encodedDataLength inválido: ${r.bytes}`);
    if(!Number.isFinite(e.timestamp)||e.timestamp<r.startMonotonic){marcaInfra('clock CDP finish inválido');return;}
    r.fim = r.inicio+(e.timestamp-r.startMonotonic)*1000;
    if(frozenCutoff!==null&&r.fim<=frozenCutoff)marcaInfra('conclusão tardia dentro da janela após freeze: '+r.url);
    r.erro = e.errorText || null;
  };
  cdp.on('Network.responseReceived',e=>{
    const r=reqs.get(e.requestId);if(!r)return;
    // Response é provisório; Finished fornece o total autoritativo, cancelamento exige prefixo válido.
    r.recebidoResposta=e.response.encodedDataLength;r.serverID=Object.entries(e.response.headers).find(([k])=>k.toLowerCase()==='x-boot-response-id')?.[1];r.response={url:e.response.url,status:e.response.status,mimeType:e.response.mimeType,protocol:e.response.protocol,fromDiskCache:e.response.fromDiskCache,headers:Object.fromEntries(Object.entries(e.response.headers).filter(([k])=>['content-type','content-length','content-encoding','cache-control','connection','transfer-encoding','x-boot-origin','content-disposition'].includes(k.toLowerCase())))};
  });
  cdp.on('Network.dataReceived',e=>{
    const r=reqs.get(e.requestId);if(!r)return;
    try{r.recebidoChunks+=validaEnc(e.encodedDataLength);}catch(err){marcaInfra(err.message);}
  });
  cdp.on('Network.loadingFinished', fecha);


  const erros = [];
  const infra = [];
  let infraRej = null;
  const infraP = new Promise((_, rej) => { infraRej = rej; });
  infraP.catch(() => {});
  const marcaInfra = (msg) => { infra.push(msg); infraRej?.(new InfraError(msg)); infraRej = null; };
  diagnostic=()=>({infra,navs,consoleErrors,bodyRecords:[...bodyRecords.values()],requests:[...reqs.values()],served:origin.requests,guestProfile:guest?.summary()});
  reportProxyError=marcaInfra;for(const msg of pendingProxyErrors)marcaInfra(msg);
  page.on('pageerror', (e) => {
    erros.push(e.message);
    marcaInfra(`pageerror ${e.name || 'Error'}: ${e.message}`);
  });
  guest=createGuestProfileObserver({origin:()=>origin.url,identity:()=>readGuestPageIdentity(page),onInfra:marcaInfra});
  page.on('request',request=>guest.observeRequest({key:request,url:request.url(),method:request.method(),resourceType:request.resourceType()}));
  page.on('requestfailed',request=>guest.observeFailure({key:request,error:request.failure()?.errorText||'requestfailed'}));
  page.on('response', (res) => {
    const deferred404=guest.observeResponse({key:res.request(),url:res.url(),method:res.request().method(),status:res.status(),id:res.headers()['x-boot-response-id'],record:origin.byId.get(res.headers()['x-boot-response-id']),contentType:res.headers()['content-type'],getBody:()=>res.body()});
    if (!deferred404&&res.status() >= 400) marcaInfra(`HTTP ${res.status()} ${res.url()}`);
    const request = res.request();
    if(/^https?:$/.test(new URL(res.url()).protocol)&&new URL(res.url()).origin===origin.url){
      const id=res.headers()['x-boot-response-id'];let record;
      try{record=verifyResponseRecord({url:res.url(),id,status:res.status(),record:origin.byId.get(id),seen:serverIds});}catch(e){marcaInfra(e.message);return;}
      const row={id,url:res.url(),record,state:'pending'};bodyRecords.set(request,row);
      const check=res.body().then(body=>{try{row.proof=verifyDecoded(body,record);row.state='checked';}catch(e){row.state='mismatch';row.error=e.message;}},e=>{row.state='read-error';row.error=e.message;});bodyChecks.set(id,check);
    }
    if (corposEsperados.has(request)) {
      const check = res.text().then(body => {
        if (body !== corposEsperados.get(request)) throw new InfraError(`módulo entregue divergiu do local: ${res.url()}`);
        verificados.add(request);
      }).catch(e => { marcaInfra(`resposta entregue: ${e.message}`); });
      verificacoes.set(request,check);
    }
  });
  cdp.on('Network.loadingFailed',e=>{
    const r=reqs.get(e.requestId);if(r)r.failure=e;
    if(r&&(!Number.isFinite(e.timestamp)||e.timestamp<r.startMonotonic)){marcaInfra('clock CDP failed inválido');return;}
    if(r&&cancelaUi(r,e,PAGE_BASE)){
      try{r.bytes=prefixoRecebido(r);r.fim=r.inicio+(e.timestamp-r.startMonotonic)*1000;r.canceladaUi=true;if(frozenCutoff!==null&&r.fim<=frozenCutoff)marcaInfra('cancelamento UI tardio dentro da janela após freeze: '+r.url);return;}
      catch(err){marcaInfra(err.message);return;}
    }
    if(r){r.erro=e.errorText||'loadingFailed';r.fim=r.inicio+(e.timestamp-r.startMonotonic)*1000;}
    marcaInfra(`loadingFailed ${e.type||'?'} ${r?.url||e.requestId}: ${e.errorText||'sem causa'}`);
  });
  await page.goto(PAGE_BASE, { waitUntil: 'commit', timeout: 180000 });
  const readyExact = await Promise.race([
    page.waitForFunction(() => window.__csReadyExact, null, { timeout: 180000, polling: 100 }).then((h) => h.jsonValue()),
    infraP,
  ]).catch((e) => { if (e instanceof InfraError) throw e; return null; });
  if (readyExact === null) {
    const estado = await page.evaluate(() => {
      const splash = document.getElementById('splash-enter');
      return {
        readyState: document.readyState,
        splash: splash?.className || null,
        href: location.href,
      };
    }).catch(() => null);
    const pendentes = [...reqs.values()]
      .filter((r) => r.fim === null)
      .slice(-8)
      .map((r) => r.url);
    throw new Error(`a splash não liberou a entrada em 180 s; estado=${JSON.stringify(estado)}; pendentes=${pendentes.join(', ') || 'nenhum'}; erros=${erros.join(' | ') || 'nenhum'}`);
  }
  const currentReady=await page.evaluate(()=>({cause:window.__csSplashCause,timeOrigin:performance.timeOrigin,now:performance.now(),hidden:document.getElementById('splash-enter')?.classList.contains('hidden')}));
  const {portao,causa,timeOrigin}=validateReadyExact(readyExact,currentReady);
  const gateEpoch=timeOrigin+portao,cutoff=gateEpoch+50;
  await page.waitForFunction(epoch=>performance.timeOrigin+performance.now()>=epoch,cutoff,{timeout:30000,polling:10});
  await cdp.send('Runtime.evaluate',{expression:'0',returnByValue:true});
  const gateRequests=freezeWindow([...reqs.values()],gateEpoch),gateObjects=new Set(gateRequests);frozenCutoff=cutoff;
  const posterObservation=await page.evaluate(()=>({trace:window.__bootPosterIntent,current:{timeOrigin:performance.timeOrigin,now:performance.now()}}));
  const posterProof=collectPosterProof({...posterObservation,requests:[...reqs.values()],origin:origin.url,timeOrigin,cutoffEpoch:cutoff});
  await Promise.race([awaitWindow(gateRequests),infraP]);
  const requiredIds=new Set(gateRequests.filter(r=>!r.canceladaUi&&new URL(r.url).origin===origin.url&&/^https?:$/.test(new URL(r.url).protocol)).map(r=>String(r.serverID)));
  const absentBodies=[];
  for(const network of gateRequests){
    if(!/^https?:$/.test(new URL(network.url).protocol)||new URL(network.url).origin!==origin.url||network.fim===null||network.canceladaUi)continue;
    if([...bodyRecords.values()].some(row=>row.id===String(network.serverID)))continue;
    const id=String(network.serverID),record=verifyResponseRecord({url:network.url,id,status:network.response?.status,record:origin.byId.get(id),seen:serverIds});
    const row={id,url:network.url,record,state:'pending',transport:'CDP-requestId'};bodyRecords.set(network,row);
    absentBodies.push(cdp.send('Network.getResponseBody',{requestId:network.requestId}).then(value=>{try{row.proof=verifyDecoded(Buffer.from(value.body,value.base64Encoded?'base64':'utf8'),record);row.state='checked';}catch(e){row.state='mismatch';row.error=e.message;}},e=>{row.state='read-error';row.error=e.message;}));
  }
  await awaitBodies([...requiredIds].filter(id=>bodyChecks.has(id)).map(id=>bodyChecks.get(id)).concat(absentBodies));
  const selectedBodies=[...bodyRecords.values()].filter(row=>requiredIds.has(row.id));
  const selectedLocals=[...bodyRecords].filter(([,row])=>requiredIds.has(row.id)&&row.record.kind==='local-js');
  await awaitBodies(selectedLocals.filter(([request])=>verificacoes.has(request)).map(([request])=>verificacoes.get(request)));
  for(const row of selectedBodies){
    const network=[...reqs.values()].find(r=>String(r.serverID)===row.id);
    if(row.state!=='checked'){
      if(network?.canceladaUi&&row.state==='read-error')continue;
      throw new InfraError('payload não validado: '+row.url+' '+(row.error||row.state));
    }
    servedPayloads.set(chaveDeCarga(row.url),row.record.payloadBytes);
  }
  for(const r of gateRequests){
    if(!/^https?:$/.test(new URL(r.url).protocol)||new URL(r.url).origin!==origin.url||r.fim===null||r.canceladaUi)continue;
    if(![...bodyRecords.values()].some(row=>row.id===String(r.serverID)&&row.state==='checked'))throw new InfraError('request completo sem prova de corpo: '+r.url);
  }
  const expectedFetchIds=gateRequests.filter(r=>r.type==='Fetch'&&requiredIds.has(String(r.serverID))).map(r=>String(r.serverID));
  const [fetchProof]=await awaitBodies([page.evaluate(async ({ids,expected})=>{
    const selected=new Set(ids),required=new Set(expected),deadline=performance.now()+29000;
    while(true) {
      const rows=window.__bootFetchBodies.filter(row=>selected.has(row.id));
      if(new Set(rows.map(row=>row.id)).size!==rows.length)throw Error('clone fetch ID duplicado');
      await Promise.all(rows.map(row=>{const p=window.__bootFetchProofById.get(row.id);if(!p)throw Error('clone fetch sem promessa');return p;}));
      await new Promise(resolve=>setTimeout(resolve,0));
      const current=window.__bootFetchBodies.filter(row=>selected.has(row.id));
      const observed=new Set(current.map(row=>row.id));
      if(current.length===rows.length&&current.every(row=>row.state!=='pending')&&[...required].every(id=>observed.has(id)))return current;
      if(performance.now()>=deadline)throw Error('clone fetch da janela ausente/pendente');
      await new Promise(resolve=>setTimeout(resolve,5));
    }
  },{ids:[...requiredIds],expected:expectedFetchIds})]);
  for(const f of fetchProof){const record=origin.byId.get(f.id);if(f.state!=='checked'||!record||record.sha256!==f.sha256||record.decodedBytes!==f.bytes)throw new InfraError('clone fetch divergiu/pendente: '+f.url+' '+JSON.stringify({state:f.state,id:f.id,bytes:f.bytes,sha256:f.sha256,expectedBytes:record?.decodedBytes,expectedSHA:record?.sha256}));}
  for(const [request,row]of selectedLocals)if(corposEsperados.has(request)&&!verificados.has(request))throw new InfraError('request local da janela sem verificação integral: '+row.url);
  // READY aceita a causa assets, nunca o failsafe; ver contrato do portão.
  for (const r of gateRequests) if (r.erro) marcaInfra(`loadingFailed ${r.url}: ${r.erro}`);
  const guestResult=await guest.seal({
    readFetchClones:(ids,timeoutMs)=>page.evaluate(async({ids,timeoutMs})=>{
      const selected=new Set(ids),deadline=performance.now()+timeoutMs;
      while(true){
        const rows=window.__bootFetchBodies.filter(row=>selected.has(row.id));
        if(new Set(rows.map(row=>row.id)).size!==rows.length)throw Error('clone fetch semântico duplicado');
        await Promise.all(rows.map(row=>{const promise=window.__bootFetchProofById.get(row.id);if(!promise)throw Error('clone semântico sem promessa');return promise;}));
        await new Promise(resolve=>setTimeout(resolve,0));
        const current=window.__bootFetchBodies.filter(row=>selected.has(row.id));
        if(current.length===rows.length&&current.every(row=>row.state!=='pending')&&ids.every(id=>current.some(row=>row.id===id)))return current;
        if(performance.now()>=deadline)throw Error('clone fetch semântico ausente/pendente');
        await new Promise(resolve=>setTimeout(resolve,5));
      }
    },{ids,timeoutMs}),
    closeObservation:async()=>{
      localProof=await awaitLocalModuleProof({requests:()=>corposEsperados.keys(),verification:request=>{
        const row=bodyRecords.get(request),text=verificacoes.get(request),body=row&&bodyChecks.get(row.id);
        return text&&body?Promise.all([text,body]):null;
      },verified:request=>verificados.has(request)&&bodyRecords.get(request)?.state==='checked',failure:request=>bodyRecords.get(request)?.error||'módulo sem corpo integral: '+request.url(),barrier:()=>cdp.send('Runtime.evaluate',{expression:'0',returnByValue:true})});
      terminalCapture={abortTrace:await page.evaluate(()=>window.__bootTrace||[]),fetchBodies:await page.evaluate(()=>window.__bootFetchBodies||[]),readyExact:await page.evaluate(()=>window.__csReadyExact||null)};
      await cdp.send('Network.disable');
      await context.close();context=null;
    },
  });
  if(!guestResult.ok)throw new InfraError('contrato de perfil convidado: '+guestResult.reason);
  if (infra.length) throw new InfraError(`INFRA: ${infra.slice(0, 3).join(' | ')}${infra.length > 3 ? ` (+${infra.length - 3})` : ''}`);
  const ate=gateRequests,depois=[...reqs.values()].filter(r=>!gateObjects.has(r));
  let total=0;const cargas=new Map();const checkedIds=new Set(selectedBodies.filter(row=>row.state==='checked').map(row=>row.id));
  for(const request of ate){const key=chaveDeCarga(request.url),record=origin.byId.get(String(request.serverID));const payloads=record&&checkedIds.has(record.id)?new Map([[key,record.payloadBytes]]):new Map();const part=somaCargas({ate:[request],isentas,sobrepostos:payloads});total+=part.total+(record?.requestBodyBytes||0);cargas.set(key,(cargas.get(key)||0)+part.total);}
  const resultado = {
    portao,
    causa,
    bytes: total,
    reqs: ate.length,
    sobrepostos: [...sobrepostos.keys()].filter((k) => cargas.has(k)).length,
    isentas: [...ate].filter((r) => isentas.has(chaveDeCarga(r.url))).length,
    depoisPortao: depois.length,
    cartazes: new Set(ate.filter((r) => /\/posters\//.test(r.url)).map((r) => r.url.split('?')[0])).size,
    posterProof,
    localBootstrapProof:localProof,
    ultimoProp: Math.max(-1, ...ate.filter((r) => /\/models\/props\//.test(r.url)).map((r) => r.fim-timeOrigin)),
    primeiraFauna: Math.min(Infinity, ...[...reqs.values()].filter((r) => /\/models\/ambient\//.test(r.url)).map((r) => r.inicio-timeOrigin)),
    erros,
    guestProfile:{...guestResult,profileDenials:origin.profileDenials.length},
    networkProof:{timeOrigin,gateEpoch,cutoffEpoch:cutoff,clock:"CDP-wallTime/monotonic+document-timeOrigin",snapshotFingerprint:SNAPSHOT.fingerprint,snapshotModules:SNAPSHOT.entries.length,requestBodyBytes:ate.reduce((n,r)=>n+(origin.byId.get(String(r.serverID))?.requestBodyBytes||0),0),localRequests:origin.requests.filter(r=>r.kind==='local-js').length,verifiedBodies:selectedLocals.filter(([request])=>verificados.has(request)).length,expectedBodies:selectedLocals.length,allRegisteredBeforeWrite:origin.requests.every(r=>r.registeredBeforeWrite),windowFinishedBeforeGate:true,windowRequests:gateRequests.length,allBodyRecords:selectedBodies.length,allBodiesChecked:selectedBodies.filter(r=>r.state==="checked").length,fetchClones:fetchProof.length,localPayloadBytes:origin.requests.filter(r=>r.kind==='local-js').reduce((n,r)=>n+r.payloadBytes,0)},
    canceladasUi: ate.filter(r=>r.canceladaUi).map(r=>({path:new URL(r.url).pathname,inicio:r.inicio-timeOrigin,fim:r.fim-timeOrigin,bytes:r.bytes})),
  };
  if(proofDir)writeFileSync(proofDir+'/measure.json',JSON.stringify({runId:RUN_ID,passId,label,origin:origin.url,resultado,requests:[...reqs.values()],served:origin.requests},null,2));
  assertSnapshotLive(SNAPSHOT);
  return resultado;
  } finally {
    try {
      if(proofDir) {
        const abortTrace=terminalCapture?terminalCapture.abortTrace:page?await page.evaluate(()=>window.__bootTrace||[]).catch(e=>({error:e.message})):null;
        const fetchBodies=terminalCapture?terminalCapture.fetchBodies:page?await page.evaluate(()=>window.__bootFetchBodies||[]).catch(e=>({error:e.message})):null;
        writeFileSync(proofDir+'/diagnostic.json',JSON.stringify({runId:RUN_ID,passId,label,origin:origin?.url,...diagnostic(),abortTrace,fetchBodies,readyExact:terminalCapture?.readyExact??null},null,2));
      }
    } finally {await context?.close().catch(()=>{});await origin?.close();}
  }
}

let saida=1;
const veredito=(cand,ref)=>({READY:cand.causa==='assets',ORC1:cand.bytes<=TETO_BYTES&&cand.reqs<=TETO_REQS,
  ORC2:lazyPosterSubset(cand.posterProof,ref.posterProof),ORC3:cand.ultimoProp>0&&Number.isFinite(cand.primeiraFauna)&&cand.primeiraFauna>=cand.ultimoProp});
const relatar=(cand,ref,ok,rotulo)=>{
 console.log(`base ${BASE} · ${rotulo}`);
 console.log(`portão ${Math.round(cand.portao)}ms por ${cand.causa}; overlay ${cand.sobrepostos} js; isentas ${cand.isentas}; depois ${cand.depoisPortao}`);
 console.log(`canceladasUI contabilizadas ${JSON.stringify(cand.canceladasUi)}`);
 console.log('HTTPgzipProof '+JSON.stringify(cand.networkProof));
 console.log(`READY ${ok.READY?'ok':'FALHA'}`);
 console.log(`ORC1 ${(cand.bytes/1048576).toFixed(2)} MiB / ${cand.reqs} req (teto ${TETO_BYTES} / ${TETO_REQS}) ${ok.ORC1?'ok':'FALHA'}`);
 console.log(`ORC2 ${cand.posterProof.started.length} vs ${ref.posterProof.started.length} inícios por identidade (concluídos ${cand.cartazes} vs ${ref.cartazes}) ${ok.ORC2?'ok':'FALHA'}`);
 console.log(`ORC3 último prop ${cand.ultimoProp}ms, primeira fauna ${cand.primeiraFauna}ms ${ok.ORC3?'ok':'FALHA'}`);
};
try {
 const nominal=await mede(),ref=await mede({refPoolAnsioso:true}),nomOk=veredito(nominal,ref);
 relatar(nominal,ref,nomOk,'nominal');
 if (!Object.values(nomOk).every(Boolean)) console.error('RED nominal; mutante não aplicado');
 else if (!MUTANTE) {console.log('✓ orçamento de boot dentro do teto');saida=0;}
 else {
  const cand=await mede({mutante:MUTANTE}),ok=veredito(cand,ref);relatar(cand,ref,ok,MUTANTE);
  const falhas=Object.entries(ok).filter(([,v])=>!v).map(([k])=>k).sort();
  if (aceitaMutante(MUTANTE,falhas)) {console.log(`mutante ${MUTANTE} capturado exatamente: ${falhas.join(',')}`);saida=0;}
  else console.error(`RED controle causal ${MUTANTE}: conjunto inesperado ${JSON.stringify(falhas)}`);
 }
} catch(e) {console.error(`INFRA3 sem veredito: ${e.message}`);saida=3;}
finally {await browser.close().catch(()=>{});}
try{assertSnapshotLive(SNAPSHOT);}catch(e){console.error('INFRA3 snapshot final: '+e.message);saida=3;}
process.exit(saida);
