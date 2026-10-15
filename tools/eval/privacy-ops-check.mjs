import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const mutant=process.argv.find(s=>s.startsWith('--mutant='))?.slice(9);
assert(!mutant || ['ops-default-allow','ops-continue-after-withdraw','perf-continue-after-withdraw'].includes(mutant),'Unknown mutation');
const store=new Map(),winEvents=new Map(),docEvents=new Map();
const intervals=[],timers=[],rafs=[],observers=[];
let now=0;
const listen=(events,type,fn)=>events.set(type,[...(events.get(type)||[]),fn]);
const dispatch=(events,event)=>(events.get(event.type)||[]).forEach(fn=>fn(event));
const context={
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  sessionStorage:{removeItem(){}},
  CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail;}},
  URL,URLSearchParams,Date,JSON,
  setTimeout:fn=>timers.push(fn),setInterval:fn=>intervals.push(fn),
  requestAnimationFrame:fn=>rafs.push(fn),performance:{now:()=>now},
  location:{href:'http://127.0.0.1:8137/',search:''},
  PerformanceObserver:class{
    constructor(fn){this.fn=fn;observers.push(this);}
    observe(options){assert.equal(options.buffered,false,'Historical resources must not enter a new opt-in');}
  },
  window:{dispatchEvent:e=>dispatch(winEvents,e),addEventListener:(type,fn)=>listen(winEvents,type,fn)},
  document:{hidden:false,addEventListener:(type,fn)=>listen(docEvents,type,fn),createElement:()=>({}),head:{appendChild:()=>{}}},
};
context.analyticsAllowed=()=>context.window.__csPrivacy.allowed();
vm.createContext(context);
vm.runInContext(read('public/js/privacy-runtime.js'),context,{timeout:1000});
let ops=read('public/js/ops.js').replace(/^import .*;$/gm,'').replace(/^export .*;$/gm,'');
if(mutant==='ops-default-allow'){
  const changed=ops.replace('if(!analyticsAllowed())return;','');
  assert.notEqual(changed,ops,'ops-default-allow mutation did not apply');ops=changed;
}
if(mutant==='ops-continue-after-withdraw'){
  const changed=ops.replaceAll('if (!analyticsAllowed()) return;','').replace('if (!analyticsAllowed() || !rafAtivo) return;','if (!rafAtivo) return;');
  assert.notEqual(changed,ops,'ops-continue-after-withdraw mutation did not apply');ops=changed;
}
vm.runInContext(ops,context,{timeout:1000});
const privacy=context.window.__csPrivacy;
const state=context.window.__csbOps._estado;
assert.equal(intervals.length,0,'Default deny must not install game collection');
assert.equal(observers.length,0,'Default deny must not observe resources');
assert.equal(context.window.__csbOps.resumoBeacon(),null,'Default deny must not expose a beacon');
assert(!store.has('cs_ops_last'),'Default deny must not persist diagnostics');
console.log('PASS initial deny starts no collection or persistence');

privacy.set(true);
assert.equal(intervals.length,1,'Explicit opt-in must start monitoring');
assert.equal(observers.length,1,'Explicit opt-in must start resource monitoring');
context.window.__game={state:'live',_mapId:'consented-fixture-map',ctf:false};
intervals[0]();now=1100;rafs.shift()(now);now=2200;rafs.shift()(now);
dispatch(winEvents,{type:'pagehide'});
assert(store.has('cs_ops_last'),'Explicit opt-in must allow persistence');
assert.equal(state.partida.mapa,'consented-fixture-map');assert(state.fps.amostras.length>0);
const pendingFrame=rafs.shift();assert.equal(typeof pendingFrame,'function');
console.log('PASS explicit opt-in records fixture gameplay and FPS');

privacy.set(false);
assert(!store.has('cs_ops_last'),'Withdrawal must remove diagnostics storage');
assert.equal(context.window.__csbOps.resumoBeacon(),null,'Withdrawal must suppress beacon');
pendingFrame(3300);intervals[0]();
observers[0].fn({getEntries:()=>[{responseStatus:500,name:'http://127.0.0.1/denied-resource',initiatorType:'fetch'}]});
dispatch(winEvents,{type:'error',message:'denied-fixture-error'});
dispatch(winEvents,{type:'unhandledrejection'});
dispatch(winEvents,{type:'webglcontextlost'});
dispatch(winEvents,{type:'pagehide'});
context.document.hidden=true;dispatch(docEvents,{type:'visibilitychange'});
assert.equal(state.fps.amostras.length,0,'Withdrawal must purge FPS memory');
assert.equal(state.partida.mapa,null,'Denied interval must not capture map');
assert.equal(state.recursos.total,0,'Denied observer callback must not collect resources');
assert.equal(state.erros.total,0,'Denied error callback must not collect errors');
assert.equal(state.erros.promessas,0,'Denied promise callback must not collect errors');
assert.equal(state.webgl.perdidos,0,'Denied WebGL callback must not collect errors');
assert(!store.has('cs_ops_last'),'Denied exit callbacks must not repersist diagnostics');
console.log('PASS withdrawal purges memory/storage and pending callbacks collect nothing');

privacy.set(true);
const after=context.window.__csbOps.resumoBeacon();
assert.equal(after.ultimaFase,null,'New opt-in must not replay withdrawn session');
assert.equal(after.mapa,null,'New opt-in must not replay denied map');
assert.equal(after.fpsAmostras,0,'New opt-in must not replay withdrawn FPS');
assert.equal(intervals.length,1,'New opt-in must not duplicate game monitoring');
assert.equal(observers.length,1,'New opt-in must not duplicate resource observers');
console.log('PASS later opt-in does not replay denied or withdrawn diagnostics');

const main=read('public/js/main.js');
const start=main.indexOf('function _perfMedeFps('),end=main.indexOf('function _perfFinish(',start);
assert(start>=0 && end>start,'Real FPS collector not found');
let perf=main.slice(start,end);
if(mutant==='perf-continue-after-withdraw'){
  const changed=perf.replaceAll('if (!analyticsAllowed()) return;','');
  assert.notEqual(changed,perf,'perf-continue-after-withdraw mutation did not apply');perf=changed;
}
let allowed=true,time=0,completed=0;const queued=[];
const perfContext={performance:{now:()=>time},analyticsAllowed:()=>allowed,requestAnimationFrame:fn=>queued.push(fn),_perfFinish:()=>completed++};
vm.createContext(perfContext);vm.runInContext(perf+'\n_perfMedeFps(1);',perfContext,{timeout:1000});
assert.equal(queued.length,1,'Permitted FPS sample must schedule');
allowed=false;time=1100;queued.shift()();
assert.equal(completed,0,'Pending FPS must stop when permission is withdrawn');
assert.equal(queued.length,0,'Withdrawn FPS must not schedule more samples');
vm.runInContext('_perfMedeFps(1);',perfContext,{timeout:1000});
assert.equal(queued.length,0,'Denied FPS collector must not start');
console.log('PASS withdrawal halts pending FPS and denies new samples');
console.log('PRIVACY OPS 5 PASS (real collectors; isolated scheduler/storage; no browser or external services)');
