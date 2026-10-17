import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
let source;try{source=read('public/js/privacy-runtime.js');}catch{assert.fail('No runtime enforces optional analytics choice');}
const mutant=process.argv.find(s=>s.startsWith('--mutant='))?.slice(9);
if(mutant==='implicit-consent')source=source.replace('return choice()?.analytics===true;','return true;');
if(mutant==='vercel-continue-after-withdraw')source=source.replace('if(!allowed())return null;','');
const store=new Map([['cs_anon','essential-guest-proof'],['awpbr_token','essential-token'],['cs_acq','old-attribution'],['cs_ops_last','old-diagnostics']]);const session=new Map([['cs_session','old-tracking']]);const events=[];
const scripts=[];const listeners={};
const context={localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},sessionStorage:{removeItem:k=>session.delete(k)},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail;}},Date,JSON,URL,location:{hostname:'www.corosolto.com.br'}};
context.document={createElement:tag=>({tag}),head:{appendChild:script=>scripts.push(script)}};
context.window={dispatchEvent:e=>{events.push(e);listeners[e.type]?.(e);},addEventListener:(type,fn)=>listeners[type]=fn};
vm.runInNewContext(source,context);const p=context.window.__csPrivacy;
assert.equal(p.allowed(),false,'No choice means no tracking');assert.equal(scripts.length,0,'No Vercel script before opt-in');assert(!store.has('cs_ops_last'),'Legacy diagnostics cannot survive default deny');assert(!store.has('cs_acq'));assert(!session.has('cs_session'));p.set(true);assert.equal(p.allowed(),true);assert.equal(scripts.length,1,'Opt-in loads Vercel analytics once');assert.equal(scripts[0].src,'/_vercel/insights/script.js');const beforeSend=context.window.vaq.find(([name])=>name==='beforeSend')?.[1];assert.equal(typeof beforeSend,'function');assert.equal(beforeSend({url:'https://www.corosolto.com.br/u/name?token=secret'}).url,'https://www.corosolto.com.br/u/:perfil','Private profile and query must be redacted');assert.equal(JSON.parse(store.get('cs_privacy')).version,'corosolto-analytics-v1');p.set(false);assert.equal(p.allowed(),false);assert.equal(beforeSend({url:'https://www.corosolto.com.br/u/name?token=secret'}),null,'Withdrawal suppresses future events');assert(!store.has('cs_acq'));assert(!store.has('cs_ops_last'));assert(!session.has('cs_session'));assert.equal(store.get('cs_anon'),'essential-guest-proof');assert.equal(store.get('awpbr_token'),'essential-token');assert.equal(events.at(-1).detail.analytics,false);
store.set('cs_privacy','broken');assert.equal(p.allowed(),false);store.set('cs_privacy',JSON.stringify({version:'old',analytics:true}));assert.equal(p.allowed(),false);
p.set(true);store.set('cs_ops_last','cross-tab-history');store.set('cs_privacy',JSON.stringify({version:'corosolto-analytics-v1',analytics:false}));listeners.storage({key:'cs_privacy'});assert.equal(events.at(-1).detail.analytics,false);assert(!store.has('cs_ops_last'));
const main=read('public/js/main.js');
for(const name of ['sendTelemetry','sendGameStarted','_pick','_picks','_pingPresenca','_funnel','_sendAcquisition','_sendPerf','_perfFinish','sendMatchEvent','sendTrainingFrames']){const start=main.indexOf(`function ${name}(`);assert(start>=0,name);const body=main.slice(start,main.indexOf('\n}',start));assert(body.includes('analyticsAllowed()'),`${name} must gate before collecting`);}
const index=read('src/pages/index.astro');assert(index.indexOf('/js/privacy-runtime.js')<index.indexOf('function reporta('));assert(/function reporta[\s\S]*?if \(!window\.__csPrivacy\?\.allowed\(\)\) return null/.test(index));assert(!index.includes("_s1.src = '/_vercel/insights/script.js'"),'No unconditional third-party tracker');
console.log('PASS default deny, allow/withdraw, persistence, essential identity preservation and all optional collection entrypoints');
