import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
let source;try{source=read('public/js/privacy-runtime.js');}catch{assert.fail('No runtime enforces optional analytics choice');}
const mutant=process.argv.find(s=>s.startsWith('--mutant='))?.slice(9);
if(mutant==='ignore-refusal')source=source.replace('return choice()?.analytics!==false;','return true;');
if(mutant==='keep-optional-storage-on-refusal')source=source.replace('if(!analytics)clearOptionalStorage();','');
if(mutant==='injects-third-party')source=source.replace("function allowed() {","document.head.appendChild(Object.assign(document.createElement('script'),{src:'/_vercel/insights/script.js'}));function allowed() {");
if(mutant==='sem-opt-in')source=source.replace("window.addEventListener('cs-privacy-change',enableCloudflareAnalytics);",'');
if(mutant==='sem-reload-retirada')source=source.replace('if(cloudflareLoaded)location.reload();','');
if(mutant==='analytics-em-staging')source=source.replace("return CLOUDFLARE_TOKENS[location.hostname.toLowerCase()] || '';","return Object.entries(CLOUDFLARE_TOKENS).find(([domain])=>location.hostname.endsWith(domain))?.[1] || '';");
function boot(hostname='www.corosolto.com.br',privacy=null){
  const store=new Map([['cs_anon','essential-guest-proof'],['awpbr_token','essential-token'],['cs_acq','old-attribution'],['cs_ops_last','old-diagnostics']]);
  if(privacy)store.set('cs_privacy',JSON.stringify(privacy));
  const session=new Map([['cs_session','old-tracking'],['cs_invite_landing','old-invite-tracking']]);const events=[];
  const scripts=[];const listeners={};let reloads=0;
  const context={localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},sessionStorage:{removeItem:k=>session.delete(k)},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail;}},Date,JSON,URL,Object,location:{hostname,reload:()=>{reloads++;}}};
  context.document={createElement:tag=>({tag,dataset:{}}),head:{appendChild:script=>scripts.push(script)}};
  context.window={dispatchEvent:e=>{events.push(e);listeners[e.type]?.(e);},addEventListener:(type,fn)=>listeners[type]=fn};
  vm.runInNewContext(source,context);
  return {store,session,events,scripts,listeners,p:context.window.__csPrivacy,reloadCount:()=>reloads};
}
const {store,session,events,scripts,listeners,p,reloadCount}=boot();
assert.equal(p.allowed(),true,'No choice means default allow (legitimate interest)');
assert.equal(scripts.length,1,'Default allow injects Cloudflare once');
assert.equal(scripts[0].src,'https://static.cloudflareinsights.com/beacon.min.js');
assert.equal(scripts[0].type,'module');
assert.deepEqual(JSON.parse(scripts[0].dataset.cfBeacon),{token:'5f7f6c1ab01c4e2fb6b326dbab3e7197'});
assert(store.has('cs_ops_last'),'Default allow keeps diagnostics');assert(store.has('cs_acq'),'Default allow keeps attribution');assert(session.has('cs_session'));assert(session.has('cs_invite_landing'));assert.equal(p.choice(),null,'Default allow is not written as a choice');p.set(true);assert.equal(p.allowed(),true);assert.equal(scripts.length,1,'Explicit allow does not duplicate Cloudflare');p.set(false);assert.equal(p.allowed(),false,'Explicit refusal wins');assert.equal(reloadCount(),1,'Withdrawal reloads to tear down the active beacon');assert(!store.has('cs_ops_last'),'Refusal removes diagnostics');assert(!store.has('cs_acq'),'Refusal removes attribution');assert(!session.has('cs_session'));assert(!session.has('cs_invite_landing'));assert.equal(store.get('cs_anon'),'essential-guest-proof');assert.equal(store.get('awpbr_token'),'essential-token');
store.set('cs_privacy','broken');assert.equal(p.allowed(),true,'Corrupt storage falls back to default allow');store.set('cs_privacy',JSON.stringify({version:'old',analytics:false}));assert.equal(p.choice(),null,'Old version is not a current choice');assert.equal(p.allowed(),true);store.delete('cs_privacy');listeners.storage({key:'cs_privacy'});assert.equal(events.at(-1).detail.analytics,true,'Cleared choice announces default allow');
p.set(true);store.set('cs_ops_last','cross-tab-history');store.set('cs_privacy',JSON.stringify({version:'corosolto-analytics-v1',analytics:false}));listeners.storage({key:'cs_privacy'});assert.equal(events.at(-1).detail.analytics,false);assert(!store.has('cs_ops_last'));assert.equal(reloadCount(),2,'Cross-tab withdrawal tears down the active beacon');
const recusado=boot('www.corosolto.com.br',{version:'corosolto-analytics-v1',analytics:false});
assert.equal(recusado.p.allowed(),false,'Stored refusal remains authoritative at boot');
assert.equal(recusado.scripts.length,0,'Stored refusal prevents Cloudflare injection');
assert(!recusado.store.has('cs_ops_last'));assert(!recusado.session.has('cs_session'));
recusado.p.set(true);
assert.equal(recusado.scripts.length,1,'Explicit opt-in loads Cloudflare after refused boot');
assert.equal(recusado.reloadCount(),0,'Opt-in does not reload');
const csbrasil=boot('csbrasil.online');
assert.deepEqual(JSON.parse(csbrasil.scripts[0].dataset.cfBeacon),{token:'b777fa448ebe48d8a635e74e9902be19'});
assert.equal(boot('staging.corosolto.com.br').scripts.length,0,'Staging must not pollute production RUM');
assert.equal(boot('arbitrary.csbrasil.online').scripts.length,0,'Unknown subdomains must not pollute production RUM');
assert.equal(boot('localhost').scripts.length,0,'Localhost has no analytics site token');
const main=read('public/js/main.js');
for(const name of ['sendTelemetry','sendGameStarted','_pick','_picks','_pingPresenca','_funnel','_sendAcquisition','_sendPerf','_perfFinish','sendMatchEvent','sendTrainingFrames']){const start=main.indexOf(`function ${name}(`);assert(start>=0,name);const body=main.slice(start,main.indexOf('\n}',start));assert(body.includes('analyticsAllowed()'),`${name} must gate before collecting`);}
const index=read('src/pages/index.astro');assert(index.indexOf('/js/privacy-runtime.js')<index.indexOf('function reporta('));assert(/function reporta[\s\S]*?if \(!window\.__csPrivacy\?\.allowed\(\)\) return null/.test(index));assert(!index.includes("_s1.src = '/_vercel/insights/script.js'"),'No unconditional third-party tracker');
console.log('PASS Cloudflare beacon follows cs_privacy per hostname, stored refusal blocks boot, withdrawal purges optional storage and essential identity is preserved');
