// Contrato e antes/depois: docs/visual-consistency/CLIENT-SNAPSHOT-NEGOTIATION.md.
// Módulos reais; só transporte, relógio e location são fronteiras simuladas.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const V8 = 'coro-snapshot-v8';
const IDS = ['N1','N2','N3','N4','N5','N6','N7','N8','N9','N10','N11','N12','N13','N14','N15','N16','N17','N18','N19','N20','N21'];
const sha = b => createHash('sha256').update(b).digest('hex');
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const flush = () => new Promise(resolve => setImmediate(resolve));
const specs = {
  'legacy-offer': { failed:['N1','N11'], file:'transporte.js', edits:[
    ['MAX_SNAPSHOT_BYTES, CLIENT_SNAPSHOT_PROTOCOL','MAX_SNAPSHOT_BYTES, CLIENT_SNAPSHOT_PROTOCOL, SNAPSHOT_PROTOCOLS'],
    ['new WebSocket(this.url, [CLIENT_SNAPSHOT_PROTOCOL])','new WebSocket(this.url, SNAPSHOT_PROTOCOLS)']] },
  'ws-selection': { failed:['N3','N4'], file:'transporte.js', edits:[
    ['if (this.ws.protocol !== CLIENT_SNAPSHOT_PROTOCOL)', 'if (false && this.ws.protocol !== CLIENT_SNAPSHOT_PROTOCOL)']] },
  'welcome-version': { failed:['N6','N7','N12','N15','N16'], file:'net.js', edits:[
    ["if (m.type === 'welcome') {\n          if (m.protocolVersion !== 8)", "if (m.type === 'welcome') {\n          if (false && m.protocolVersion !== 8)"]] },
  'partida-version': { failed:['N9','N10','N17','N18','N21'], file:'net.js', edits:[
    ["} else if (m.type === 'partida') {\n          if (m.protocolVersion !== 8)", "} else if (m.type === 'partida') {\n          if (false && m.protocolVersion !== 8)"]] },
  'legacy-wt-request': { failed:['N5','N11'], file:'net.js', edits:[
    ['encodeURIComponent(CLIENT_SNAPSHOT_PROTOCOL)', "encodeURIComponent('coro-snapshot-v7')"]] },
  'attempt-guard': { failed:['N9','N10','N12','N17','N18','N21'], file:'net.js', edits:[
    ['const ativo = () => !ended && this.tp === tp;', 'const ativo = () => true;']] },
  'early-close-notify': { failed:['N20'], file:'net.js', edits:[
    ["assenta(reject, new Error('closed'));\n            if (accepted) this.onClose?.();", "assenta(reject, new Error('closed'));\n            this.onClose?.();"]] },
  'callback-before-close': { failed:['N21'], file:'net.js', edits:[
    ['tp.fechar(codigo, motivo);\n        if (accepted) this.onClose?.();', 'if (accepted) this.onClose?.();\n        tp.fechar(codigo, motivo);']] },
};
class Infra extends Error {}
function replaceOne(s,a,b) { if (a === b || s.split(a).length !== 2) throw new Infra('anchor_count:' + a.slice(0,90)); return s.replace(a,b); }
let root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), selected = '', jsonFile = '';
for (const a of process.argv.slice(2)) {
  if (a.startsWith('--root=') && path.isAbsolute(a.slice(7))) root = a.slice(7);
  else if (a.startsWith('--mutante=') && !selected && Object.hasOwn(specs,a.slice(10))) selected = a.slice(10);
  else if (a.startsWith('--json=') && !jsonFile && path.isAbsolute(a.slice(7))) jsonFile = a.slice(7);
  else { console.error('CLI inválida'); process.exit(2); }
}
if (Object.keys(process.env).some(k => k.startsWith('COROSOLTO_NEGOTIATION_'))) { console.error('Ambiente interno não aceito'); process.exit(2); }
const sourceNames = ['net.js','transporte.js','netcodec.js'];
let sourceBytes, sourcePins;
const processDeadline = setTimeout(() => { console.error('INFRA: harness deadline60000ms; no semantic detection credit'); process.exit(3); }, 60000);
const report = { schema:'client-snapshot-negotiation/1', scope:'real modules, browser boundaries faked; no backend/QUIC/browser/codec approval', runs:[] };
function metadata(type, version, id=1) { return { type, ...(version === undefined ? {} : {protocolVersion:version}), yourEnt:id, yourTeam:'E', espectador:false, roster:[], partida:id }; }
function frame(m) {
  const b = new TextEncoder().encode(JSON.stringify(m)), out = new Uint8Array(b.length+5);
  new DataView(out.buffer).setUint32(0,b.length+1); out[4]=0; out.set(b,5); return out;
}
async function measure(NetClient, TransporteWT, id, conf, test) {
  const names = ['WebSocket','WebTransport','setTimeout','clearTimeout','location'];
  const saved = Object.fromEntries(names.map(k => [k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  const savedInfo=console.info, savedWarn=console.warn;
  const timers=new Map(), sockets=[], quics=[], clients=[]; let timerId=0, closes=0;
  const wsVersion = conf.wsVersion === 'missing' ? undefined : conf.wsVersion ?? 8;
  const wtVersion = conf.wtVersion === 'missing' ? undefined : conf.wtVersion ?? 8;
  class FakeWS {
    constructor(url,protocols) {
      this.url=url; this.protocols=protocols; this.protocol=conf.wsProtocol ?? V8; this.readyState=0; this.closeCalls=[]; sockets.push(this);
      queueMicrotask(() => { this.readyState=1; this.onopen?.(); if (this.readyState===1 && !conf.noWelcome) this.emit(metadata('welcome',wsVersion)); });
    }
    emit(m) { this.onmessage?.({data:JSON.stringify(m)}); }
    send() {}
    close(code,reason) { this.closeCalls.push([code,reason]); if(this.readyState===3)return; this.readyState=3; queueMicrotask(()=>this.onclose?.()); }
  }
  class FakeWT {
    constructor(url) {
      this.url=url; this.closeCalls=[]; quics.push(this);
      this.closed=new Promise(r=>{this.resolveClosed=r;});
      let reliable, datagram;
      this.readable=new ReadableStream({start:c=>{reliable=c;}}); this.reliable=reliable;
      this.datagrams={readable:new ReadableStream({start:c=>{datagram=c;}}),writable:new WritableStream({write(){}})};
      this.datagram=datagram;
      const stream={readable:this.readable,writable:new WritableStream({write(){}})};
      this.incomingBidirectionalStreams=new ReadableStream({start(c){c.enqueue(stream);c.close();}});
      this.ready=conf.wtFailure ? Promise.reject(new Error('wt_boundary_failure')) : Promise.resolve();
      if (!conf.wtFailure && !conf.noWelcome) queueMicrotask(()=>this.emit(metadata('welcome',wtVersion)));
    }
    emit(m) { this.reliable.enqueue(frame(m)); }
    // Deliberately delayed closed/readers model queued callbacks after close request.
    close(code) { this.closeCalls.push(code); }
    finish() { this.resolveClosed(); try{this.reliable.close();}catch{} try{this.datagram.close();}catch{} }
  }
  try {
    Object.defineProperty(globalThis,'WebSocket',{configurable:true,writable:true,value:FakeWS});
    Object.defineProperty(globalThis,'WebTransport',{configurable:true,writable:true,value:FakeWT});
    Object.defineProperty(globalThis,'setTimeout',{configurable:true,writable:true,value:(fn)=>{const n=++timerId;timers.set(n,fn);return n;}});
    Object.defineProperty(globalThis,'clearTimeout',{configurable:true,writable:true,value:n=>timers.delete(n)});
    Object.defineProperty(globalThis,'location',{configurable:true,writable:true,value:{search:''}});
    console.info=()=>{}; console.warn=()=>{};
    const make = (wt=false) => {const n=new NetClient('ws://boundary/ws',wt ? {wt:'https://boundary/wt'} : {}); n.onClose=()=>closes++; clients.push(n);return n;};
    const outcome = p => p.then(value=>({ok:true,value}),error=>({ok:false,error:String(error?.message||error)}));
    const directWT = n => outcome(n._conectar(8000,()=>new TransporteWT('https://boundary/wt?sp='+V8)));
    const evidence={};
    const ok=await test({make,outcome,directWT,sockets,quics,timers,evidence,getCloses:()=>closes,resetCloses:()=>{closes=0;}});
    if(typeof ok!=='boolean')throw new Infra(id+': nonboolean oracle');
    return {id,ok,evidence,remainingTimers:timers.size};
  } finally {
    for(const n of clients) {try{n.close();}catch{}}
    for(const w of quics)w.finish();
    await flush();
    for(const k of names) {if(saved[k])Object.defineProperty(globalThis,k,saved[k]);else delete globalThis[k];}
    console.info=savedInfo;console.warn=savedWarn;
  }
}
async function run(mutant) {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'client-negotiation-'));
  try {
    const sources={...sourceBytes};
    if(mutant)for(const [a,b] of specs[mutant].edits)sources[specs[mutant].file]=replaceOne(sources[specs[mutant].file],a,b);
    const absolute = (s,isNet) => s.replace(/from '\.\/([^']+)'/g,(_m,f)=>`from '${isNet && f==='transporte.js' ? pathToFileURL(path.join(temp,'transporte.mjs')).href : pathToFileURL(path.join(root,'public/js',f)).href}'`);
    fs.writeFileSync(path.join(temp,'transporte.mjs'),absolute(sources['transporte.js'],false));
    fs.writeFileSync(path.join(temp,'net.mjs'),absolute(sources['net.js'],true));
    let NetClient,TransporteWT;
    try {({NetClient}=await import(pathToFileURL(path.join(temp,'net.mjs')).href));({TransporteWT}=await import(pathToFileURL(path.join(temp,'transporte.mjs')).href));}
    catch(e){throw new Infra('module_import:'+String(e));}
    const rows=[];
    const add=(id,c,t)=>measure(NetClient,TransporteWT,id,c,t).then(r=>rows.push(r));
    const connect=async x=>{const n=x.make();const r=await x.outcome(n.connect());return {n,r};};
    const rejected=async x=>{const {n,r}=await connect(x);await flush();x.evidence.result=r;return !r.ok && n.meta===null && x.sockets[0].closeCalls.length>0 && x.timers.size===0;};
    await add('N1',{},async x=>{const {r}=await connect(x);return r.ok&&equal(x.sockets[0].protocols,[V8]);});
    await add('N2',{},async x=>{const {n,r}=await connect(x);return r.ok&&n.meta.protocolVersion===8&&n.connected&&x.timers.size===0;});
    await add('N3',{wsProtocol:'coro-snapshot-v7'},rejected);
    await add('N4',{wsProtocol:''},rejected);
    await add('N5',{},async x=>new URL(x.make(true).wtUrl).searchParams.get('sp')===V8);
    for(const [id,wtVersion] of [['N6',7],['N7','missing']])await add(id,{wtVersion},async x=>{const n=x.make();const r=await x.directWT(n);x.evidence.result=r;return !r.ok&&n.meta===null&&x.quics[0].closeCalls.length>0&&x.timers.size===0;});
    await add('N8',{},async x=>{const n=x.make();const r=await x.directWT(n);if(!r.ok)return false;let delivered=0;n.onPartida=()=>delivered++;x.quics[0].emit(metadata('partida',8,2));await flush();return n.meta.partida===2&&delivered===1&&x.timers.size===0;});
    async function regression(x,wt,version){
      const n=x.make();const r=wt?await x.directWT(n):await x.outcome(n.connect());if(!r.ok)return false;
      const old=n.meta;let delivered=0;n.onPartida=()=>delivered++;x.resetCloses();
      const emit=m=>wt?x.quics[0].emit(m):x.sockets[0].emit(m);
      emit(metadata('partida',version,2));emit(metadata('partida',8,3));await flush();
      return n.meta===old&&delivered===0&&!n.connected&&x.getCloses()===1&&x.timers.size===0;
    }
    await add('N9',{},x=>regression(x,false,7));
    await add('N10',{},x=>regression(x,false,undefined));
    await add('N11',{wtFailure:true},async x=>{const n=x.make(true);const r=await x.outcome(n.connect());return r.ok&&n.tp.ws===x.sockets[0]&&equal(x.sockets[0].protocols,[V8])&&x.sockets[0].protocol===V8&&new URL(x.quics[0].url).searchParams.get('sp')===V8&&x.quics[0].closeCalls.length>0&&x.timers.size===0;});
    await add('N12',{wtVersion:7},async x=>{const n=x.make(true);const r=await x.outcome(n.connect());if(!r.ok||x.sockets.length!==1)return false;const old=n.meta;x.resetCloses();x.quics[0].emit(metadata('welcome',8,99));x.quics[0].emit(metadata('partida',8,99));x.quics[0].resolveClosed();await flush();return n.meta===old&&n.connected&&n.tp.ws===x.sockets[0]&&x.sockets[0].closeCalls.length===0&&x.getCloses()===0;});
    await add('N13',{},async x=>{const n=x.make();let closes=0;const tp={abrir(h){h.aberto();h.mensagem(JSON.stringify(metadata('welcome',8)),false,0);},fechar(){closes++;}};const r=await x.outcome(n._conectar(8000,()=>tp));x.evidence.result=r;return r.ok&&n.meta.protocolVersion===8&&closes===0&&x.timers.size===0;});
    await add('N14',{},async x=>{const n=x.make();const r=await x.outcome(n._conectar(8000,()=>{throw new Error('factory_boundary');}));return !r.ok&&r.error==='factory_boundary'&&x.timers.size===0;});
    await add('N15',{wsVersion:7},rejected);
    await add('N16',{wsVersion:'missing'},rejected);
    await add('N17',{},x=>regression(x,true,7));
    await add('N18',{},x=>regression(x,true,undefined));
    await add('N19',{noWelcome:true},async x=>{const n=x.make();let settled=false;const p=x.outcome(n._conectar(8000,()=>new TransporteWT('https://boundary/wt?sp='+V8))).then(r=>{settled=true;return r;});await flush();const pending=!settled&&x.timers.size===1;for(const [timer,fn] of [...x.timers]){x.timers.delete(timer);fn();}const r=await p;return pending&&!r.ok&&r.error==='timeout'&&x.timers.size===0&&x.quics[0].closeCalls.length===1;});
    await add('N20',{},async x=>{const n=x.make();const tp={abrir(h){h.aberto();h.fechado();},fechar(){}};const r=await x.outcome(n._conectar(8000,()=>tp));return !r.ok&&r.error==='closed'&&x.getCloses()===0&&x.timers.size===0;});
    await add('N21',{},async x=>{
      const {n,r}=await connect(x);if(!r.ok)return false;
      const old=n.meta, previous=n.onClose;let caught='',calls=0;
      n.onClose=()=>{if(++calls===1)throw new Error('controlled_onclose');};
      try {
        try{x.sockets[0].emit(metadata('partida',7,2));}catch(e){caught=e.message;}
        await flush();x.evidence.caught=caught;x.evidence.calls=calls;
        return caught==='controlled_onclose'&&calls===1&&x.sockets[0].closeCalls.length===1&&!n.connected&&n.meta===old&&x.timers.size===0;
      } finally {n.onClose=previous;}
    });
    if(!equal(rows.map(r=>r.id),IDS)||rows.some(r=>typeof r.ok!=='boolean'))throw new Infra('row_protocol');
    const current=sourceNames.map(f=>sha(fs.readFileSync(path.join(root,'public/js',f))));
    if(!equal(current,sourcePins.map(p=>p.sha256)))throw new Infra('source_drift');
    return {mutant,rows,failed:rows.filter(r=>!r.ok).map(r=>r.id),sourcePins};
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
}
try {
  sourceBytes=Object.fromEntries(sourceNames.map(f=>[f,fs.readFileSync(path.join(root,'public/js',f),'utf8')]));
  sourcePins=sourceNames.map(f=>({file:f,sha256:sha(sourceBytes[f]),bytes:Buffer.byteLength(sourceBytes[f])}));
  const nominal=await run('');report.runs.push(nominal);
  if(nominal.failed.length){report.status=selected?'INFRA':'RED';report.failed=nominal.failed;if(selected)report.error='nominal_red_no_mutation_credit';}
  else if(selected){const mutated=await run(selected);report.runs.push(mutated);report.failed=mutated.failed;report.expected=specs[selected].failed;report.status=equal([...mutated.failed].sort(),[...report.expected].sort())?'DETECTED':'RED';}
  else report.status='GREEN';
} catch(e) {report.status='INFRA';report.error=String(e?.stack||e);}
try {if(jsonFile)fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+'\n');} catch(e){report.status='INFRA';report.error='receipt_write:'+String(e);}
console.log(JSON.stringify({status:report.status,failed:report.failed||[],expected:report.expected,error:report.error}));
clearTimeout(processDeadline);
process.exitCode=report.status==='INFRA'?3:['GREEN','DETECTED'].includes(report.status)?0:1;
