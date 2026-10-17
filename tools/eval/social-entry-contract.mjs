/* User requirement 2026-10-10: social UI inside game menu, real enabled Auth,
 * independent email consent, preserved guest. Evidence: docs/social/ENTRY-ACCEPTANCE.md. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { rotaDoCaminho } from '../../public/js/rotas.js';
import {execFileSync} from 'node:child_process';
const vmTimeout=Number(process.env.SOCIAL_VM_TIMEOUT || 1000);

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const backend=process.env.SOCIAL_ENTRY_BACKEND || path.resolve(root,'../../../csbrasil-backend/worktrees/social-community');
const read=p=>readFileSync(p,'utf8');
const index=read(path.join(root,'src/pages/index.astro'));
let community=process.argv.includes('--baseline-handle')?execFileSync('git',['show','e024d7a06:public/js/community.js'],{cwd:root,encoding:'utf8'}):read(path.join(root,'public/js/community.js'));
const entryPath=path.join(root,'public/js/account-entry.js');
let entrySource=existsSync(entryPath)?read(entryPath):'';
let authSource=read(path.join(backend,'api/social-auth.ts'));
const helperPath=path.join(backend,'api/_lib/social-entry.ts');
let helperSource=existsSync(helperPath)?read(helperPath):'';
const mutant=process.argv.find(s=>s.startsWith('--mutant='))?.split('=')[1];
const only=process.argv.find(s=>s.startsWith('--only='))?.split('=')[1];
if(mutant) {
  assert(['advertise-disabled','stale-auth-dialog','quit-social-resume','portrait-no-guard','portrait-broad-guard','handle-action','share-opt-in','copy-origin','guest-recovery'].includes(mutant),'unknown mutation');
  if(['handle-action','share-opt-in','copy-origin'].includes(mutant)){const pairs={'handle-action':["action('handle',null","action('settings',null"],'share-opt-in':['share.checked=p.settings.share_character===true','share.checked=true'],'copy-origin':['${root.dataset.site}${p.url}','${location.origin}${p.url}']};const [before,after]=pairs[mutant];const changed=community.replace(before,after);assert.notEqual(changed,community,'mutation did not apply');community=changed;}else if(mutant==='guest-recovery'){
    const changed=entrySource.replace("if(e.message==='guest_invalid'){","if(false){");assert.notEqual(changed,entrySource,'mutation did not apply');entrySource=changed;
  }else if(mutant==='stale-auth-dialog') {
    const changed=entrySource.replace('loading=false;if(dialog.open)draw();maybePrompt();','loading=false;maybePrompt();');
    assert.notEqual(changed,entrySource,'mutation did not apply');entrySource=changed;
  }else if(mutant==='advertise-disabled'){
    const target=helperSource || authSource;
    const changed=target.replace(/\.filter\(p=>settings\.external\?\.\[p\]===true\)/,".filter(p=>true)");
    assert.notEqual(changed,target,'mutation did not apply');
    if(helperSource)helperSource=changed;else authSource=changed;
  }
}
const required=['google','twitter','facebook','linkedin_oidc'];
let passed=0,failed=0,unknown=0;
const check=async(id,name,fn)=> {
  if(only && only!==id)return;
  try {await fn();passed++;console.log(`PASS ${id} ${name}`);}
  catch(e){if(e.name==='Unknown'){unknown++;console.log(`UNKNOWN ${id} ${name}: ${e.message}`);}else{failed++;console.log(`RED ${id} ${name}: ${e.message.split('\n')[0]}`);}}
};
function menuMarkup(file,seen=new Set()) {
  if(seen.has(file))return '';seen.add(file);
  const source=read(file),parts=source.split('---'),front=parts.length>2?parts[1]:'',body=parts.length>2?parts.slice(2).join('---'):source;
  let markup=body.replace(/<style[\s\S]*?<\/style>/g,'');
  for(const m of front.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+\.astro)['"]/g)) {
    if(new RegExp(`<${m[1]}(?:\\s|/|>)`).test(body))markup+='\n'+menuMarkup(path.resolve(path.dirname(file),m[2]),seen);
  }
  return markup;
}
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
async function handlers(external={},production=true,overrides={}) {
  const settings={external,disable_signup:false};
  const effects={writes:[],authCalls:[],sessions:0};
  const db={rpc:async(name,values)=>{effects.writes.push({table:'rpc:'+name,values});return {data:null,error:null}},from(table){const q={insert:async values=>{effects.writes.push({table,values});return {error:null}},upsert:async values=>{effects.writes.push({table,values});return {error:null}},delete(){return q},eq(){return q},gt(){return q},select(){return q},maybeSingle:async()=>({data:{verifier:'fixture',guest_id:null,...overrides.intent},error:null})};return q},auth:{getUser:async()=>({data:{user:{id:'fixture-account'}},error:null})}};
  const env={NODE_ENV:production?'production':'development',SOCIAL_EMAIL_LOGIN:'true',SOCIAL_PASSWORD_LOGIN:'true',SOCIAL_SESSION_KEY:'fixture-only-session-key-over-32-chars',SUPABASE_ANON_KEY:'fixture',SUPABASE_URL:'http://127.0.0.1:54321',SOCIAL_SITE_URL:'http://localhost:4323',...overrides.env};
  const authFetch=async p=>{effects.authCalls.push(p.split('?')[0]);return new Response(JSON.stringify(p==='/settings'?settings:{access_token:'fixture',refresh_token:'fixture',expires_in:3600}),{status:200});};
  const json=(v,s=200,h={})=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json',...h}});
  const dependencies={createHash,db,resolvePlayerIdentity:async()=>({player:{id:'fixture-guest'},error:null}),validUid:()=>true,rateLimitStrict:async()=>true,authFetch,cookieValue:()=> 'fixture-state',digest:v=>v,json,newSession:async()=>{effects.sessions++;return {sid:'fixture',authUser:'fixture-account',confirmedEmail:'fixture@example.test',profile:{id:'fixture-account',nick:'Fixture'}}},randomSecret:()=> 'fixture-state',readSession:async()=>null,sameOrigin:()=>true,seal:v=>v,sessionCookie:()=> 'fixture-cookie',siteOrigin:()=>env.SOCIAL_SITE_URL,unseal:v=>v,process:{env}};
  if(helperSource) {
    const names=[...helperSource.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(\w+)/g)].map(m=>m[1]);
    const helper=stripTypeScriptTypes(helperSource.replace(/^import .*;\n/gm,'').replace(/export\s+/g,''));
    Object.assign(dependencies,await new AsyncFunction(...Object.keys(dependencies),helper+`;return {${names.join(',')}}`)(...Object.values(dependencies)));
  }
  const code=stripTypeScriptTypes(authSource.replace(/^import .*;\n/gm,'').replace(/export const (GET|POST)/g,'const $1'));
  const api=await new AsyncFunction(...Object.keys(dependencies),code+';return {GET,POST}')( ...Object.values(dependencies));return {...api,effects};
}
const request=(url,body)=>new Request('http://localhost:4323'+url,{method:body?'POST':'GET',...(body?{body:JSON.stringify(body),headers:{'content-type':'application/json',origin:'http://localhost:4323'}}:{})});

class Element {
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.textContent='';this.checked=false;this.required=false;this.hidden=false;this.open=false;this.value='';}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;this.textContent='';}
  setAttribute(k,v){this.attrs[k]=String(v);}
  getAttribute(k){return this.attrs[k] ?? null;}
  reportValidity(){return true;}
  closest(){return null;}
  focus(){}
  addEventListener(){}
  showModal(){this.open=true;}
  close(){this.open=false;}
  querySelector(selector){return all(this).find(node=>node.tagName.toLowerCase()===selector.toLowerCase())||null;}
  get childElementCount(){return this.children.filter(c=>typeof c==='object').length;}
}
const all=n=>[n,...n.children.filter(c=>typeof c==='object').flatMap(all)];
const words=n=>[n.textContent,...n.children.map(c=>typeof c==='string'?c:words(c))].join(' ');
async function ui(authenticated=false,{nick='Guest',bootSplash=false,runCommunity=true,authGate=null,tab='profile',profileValues={},providers=required,guestInvalid=false}={}) {
  const ids=Object.fromEntries(['community','social-status','social-account','social-content','social-unread','hub-social-unread','account-entry-dialog','account-entry-body','account-entry-close','hub-account-login','account-completion','account-completion-copy','main-menu','social-hello','social-logout'].map(id=>[id,new Element(id==='account-completion'?'details':'div')]));
  ids['main-menu'].classList={contains:()=>false};
  if(bootSplash)ids['boot-splash']=new Element('div');
  ids.community.dataset.tab=tab;ids.community.dataset.site='https://www.corosolto.com.br';
  const storage=new Map([['cs_anon','11111111-1111-4111-8111-111111111111'],['awpbr_token','22222222-2222-4222-8222-222222222222'],['awpbr_nick','Guest'],['awpbr_stats','{"kills":3}']]);
  const before=Object.fromEntries(storage),navigation=[],calls=[],copied=[];
  if(!nick)storage.delete('awpbr_nick');else storage.set('awpbr_nick',nick);
  let loggedIn=authenticated;
  const profile={id:'fixture-account',nick:'Fixture',avatar_url:null,bio:'',level:1,next_level_points:10,kills:0,deaths:0,matches:0,points:0,wins:0,losses:0,kd:0,play_seconds:0,socials:[],history:[],favorites:[],achievements:[],settings:{profile:'public',presence:'friends',activity:'friends'}};
  Object.assign(profile,profileValues);const fetch=async(p,opts={})=> {
    const body=opts.body?JSON.parse(opts.body):null;calls.push({path:p,action:body?.action,body});if(body?.action==='handle'){profile.handle=body.handle;profile.url='/u/'+body.handle;}
    if(authGate && p.startsWith('/api/social-auth'))await authGate;
    if(guestInvalid && body?.guest && ['start','email'].includes(body.action))return new Response(JSON.stringify({error:'guest_invalid'}),{status:403});
    if(body?.action==='logout')loggedIn=false;
    const out=p.includes('action=providers')?{providers,email:true,password:true}:p==='/api/social-auth'?{authenticated:loggedIn,profile:loggedIn?profile:null}:p.includes('action=profile')?{profile}:{profile,friends:[],notifications:[],invites:[],feed:[],blocks:[]};
    return new Response(JSON.stringify(out),{status:200});
  };
  const observers=[];
  const context=vm.createContext({document:{body:new Element('body'),getElementById:id=>ids[id] || null,createElement:tag=>new Element(tag),createTextNode:text=>text,querySelectorAll:()=>[],addEventListener:()=>{},dispatchEvent:()=>{},hidden:false,activeElement:null},CustomEvent:class {constructor(type,{detail}){this.type=type;this.detail=detail}},MutationObserver:class {constructor(fn){observers.push(fn)}observe(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},location:{origin:'http://localhost:4323',search:'',assign:p=>navigation.push(p)},navigator:{clipboard:{writeText:async text=>copied.push(text)}},URL,URLSearchParams,fetch,AbortSignal,setInterval:()=>1,setTimeout,clearTimeout,console});
  let entry=null;
  context.window=context;context.dispatchEvent=()=>{};context.addEventListener=()=>{};context.sessionStorage={removeItem:()=>{}};
  vm.runInContext(read(path.join(root,'public/js/profile-character-catalog.js')).replace(/export\s+/g,''),context,{timeout:vmTimeout});
  vm.runInContext(read(path.join(root,'public/js/profile-character.js')).replace(/^import .*\n/gm,'').replace(/export\s+/g,''),context,{timeout:vmTimeout});
  vm.runInContext(read(path.join(root,'public/js/community-inbox.js')).replace(/export\s+/g,''),context,{timeout:vmTimeout});
  vm.runInContext(read(path.join(root,'public/js/account-verified.js')).replace(/export\s+/g,''),context,{timeout:vmTimeout});
  vm.runInContext(read(path.join(root,'public/js/privacy-runtime.js')),context,{timeout:vmTimeout});
  const privacySource=read(path.join(root,'public/js/privacy-preferences.js')).replace(/^import .*;\n/gm,'').replace(/export\s+/g,'');
  vm.runInContext(privacySource,context,{timeout:vmTimeout});
  if(entrySource){const names=[...entrySource.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(\w+)/g)].map(m=>m[1]);entry=vm.runInContext('(function(){'+entrySource.replace(/^import .*;\n/gm,'').replace(/export\s+/g,'')+`;return {${names.join(',')}}})()`,context,{timeout:vmTimeout});context.__entry=entry;}
  const rankingSource=read(path.join(root,'public/js/ranking-player.js')).replace(/^import .*;\n/gm,'').replace(/export\s+/g,'');
  context.__ranking=vm.runInContext('(function(){'+rankingSource+';return {rankingTable,profileSocialLinks,profileSocialLink};})()',context,{timeout:vmTimeout});
  if(runCommunity)vm.runInContext(community.replace(/^import .*(?:account-verified|community-inbox|profile-character)\.js.*\n/gm,'').replace(/import\s+\{([^}]+)\}\s+from\s+['"]\.\/ranking-player\.js['"];?/g,'const {$1}=__ranking;').replace(/import\s+\{([^}]+)\}\s+from\s+['"]\.\/account-entry\.js['"];?/g,'const {$1}=__entry;'),context,{timeout:vmTimeout});
  for(let n=0;n<8;n++)await new Promise(resolve=>setImmediate(resolve));
  return {ids,storage,before,navigation,calls,copied,profile,entry,observers};
}

await check('E01','community rendered in game root',()=> {
  const markup=menuMarkup(path.join(root,'src/pages/index.astro'));
  assert.match(markup,/id=["']community["']/,'game root never renders social UI');
  // /comunidade e /comunidade/<aba> são rotas do próprio hub (ADR 0008); fora delas, o menu não sai do jogo.
  const fora=[...index.matchAll(/<a\b[^>]*href=["'](\/comunidade[^"']*)["']/g)].map(m=>m[1]).filter(href=>!rotaDoCaminho(href.split('?')[0]));
  assert.deepEqual(fora,[],'game menu still navigates outside game');
});
await check('E02','no-nick visitor reaches the menu without the account prompt (owner, 14/10/2026); manual entry keeps the guest choice',async()=> {
  assert(entrySource,'shared account entry is absent');const main=read(path.join(root,'public/js/main.js'));assert.match(main,/initAccountEntry\(/,'game boot never calls account entry');
  const u=await ui(false,{nick:'',bootSplash:true,runCommunity:false});await u.entry.initAccountEntry();assert.equal(u.ids['account-entry-dialog'].open,false,'account prompt covers boot splash');delete u.ids['boot-splash'];for(const fn of u.observers)fn();assert.equal(u.ids['account-entry-dialog'].open,false,'account prompt opens before the first match');
  u.ids['hub-account-login'].onclick();assert.equal(u.ids['account-entry-dialog'].open,true,'manual entry does not open');
  const b=all(u.ids['account-entry-body']).find(n=>n.tagName==='BUTTON' && /CONVIDADO/.test(n.textContent));assert(b,'opening prompt has no guest choice');await b.onclick();assert.equal(u.ids['account-entry-dialog'].open,false);assert.equal(u.navigation.length,0,'guest choice navigated');for(const key of ['cs_anon','awpbr_token','awpbr_stats'])assert.equal(u.storage.get(key),u.before[key]);
});
await check('E03','existing nick skips automatic prompt but login stays accessible',async()=> {
  assert(entrySource,'shared account entry is absent');const u=await ui(false,{runCommunity:false});await u.entry.initAccountEntry();assert.equal(u.ids['account-entry-dialog'].open,false);assert(u.ids['hub-account-login'].onclick,'login trigger absent');u.ids['hub-account-login'].onclick();assert.equal(u.ids['account-entry-dialog'].open,true);
});
await check('E04','early account opening hydrates available Auth methods',async()=> {
  let release;const authGate=new Promise(resolve=>{release=resolve;});
  const u=await ui(false,{runCommunity:false,authGate});assert(u.entry,'shared account entry absent');
  const initialization=u.entry.initAccountEntry();u.ids['hub-account-login'].onclick();
  assert.equal(u.ids['account-entry-dialog'].open,true);assert.match(words(u.ids['account-entry-body']),/carregando/i,'early opening presents unavailable Auth as final');
  assert(all(u.ids['account-entry-body']).some(n=>n.tagName==='BUTTON' && /CONVIDADO/.test(n.textContent)),'guest unavailable while Auth loads');
  assert.equal(all(u.ids['account-entry-body']).some(n=>n.tagName==='INPUT' && n.type==='email'),false,'email form enabled before config');
  release();await initialization;
  assert.equal(u.ids['account-entry-dialog'].open,true,'Auth arrival unexpectedly dismisses manual entry');
  assert.doesNotMatch(words(u.ids['account-entry-body']),/carregando/i,'manual opening remains stuck loading');
  assert(all(u.ids['account-entry-body']).some(n=>n.tagName==='INPUT' && n.type==='email'),'email method never hydrates into already-open dialog');
  for(const provider of ['google','twitter','facebook','linkedin_oidc'])assert(all(u.ids['account-entry-body']).some(n=>n.tagName==='BUTTON' && n.dataset.provider===provider),`${provider} never hydrates`);
  for(const key of ['cs_anon','awpbr_token','awpbr_stats'])assert.equal(u.storage.get(key),u.before[key],'loading race destroys guest');
});
await check('E05','stale guest proof offers one explicit recovery and retries the chosen provider',async()=> {
  const u=await ui(false,{runCommunity:false,guestInvalid:true});await u.entry.initAccountEntry();u.ids['hub-account-login'].onclick();
  const nodes=()=>all(u.ids['account-entry-body']);
  const google=nodes().find(n=>n.tagName==='BUTTON' && n.dataset.provider==='google');assert(google);
  await google.onclick();await google.onclick();
  const recover=nodes().filter(n=>n.tagName==='BUTTON' && /ENTRAR SEM VINCULAR/.test(n.textContent));
  assert.equal(recover.length,1,'each 403 adds another recovery button');
  await recover[0].onclick();
  const starts=u.calls.filter(c=>c.action==='start');
  assert.equal(starts.length,3);
  assert(starts[0].body.guest && starts[1].body.guest,'initial attempts must retain guest proof');
  assert.equal(starts[2].body.guest,undefined,'explicit recovery still sends invalid guest proof');
  assert.equal(u.navigation.length,1,'recovery does not continue the selected login');
  for(const key of ['cs_anon','awpbr_token','awpbr_stats'])assert.equal(u.storage.get(key),u.before[key],`recovery discarded ${key}`);
});
await check('P01','pause community and resume preserve the same game',()=> {
  const markup=menuMarkup(path.join(root,'src/pages/index.astro'));
  assert.match(markup,/<button\b[^>]*id=["']btn-pause-community["']/,'pause has no community action');
  assert.match(markup,/<button\b[^>]*id=["']hub-social-resume["']/,'community has no return-to-match action');
  const main=read(path.join(root,'public/js/main.js'));
  const body=(pattern,label)=>{
    const start=pattern.exec(main);assert(start,`${label} has no executable handler`);
    const offset=start.index+start[0].length;let depth=1,quote=null,escaped=false,end=offset;
    for(;end<main.length;end++){const c=main[end];if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote=null;continue;}if(['"',"'",'`'].includes(c)){quote=c;continue;}if(c==='{')depth++;if(c==='}' && --depth===0)break;}
    assert.equal(depth,0,'unclosed action handler');return main.slice(offset,end);
  };
  const nodes=new Map(),screens=[],events=[],navigation=[],gameCalls=[];
  const get=id=>{if(!nodes.has(id))nodes.set(id,new Element('button'));return nodes.get(id);};
  const tab=get('community-tab');tab.click=()=>events.push('community-tab');
  const game={matchId:'same-match',round:3,paused:true,setPaused(value){gameCalls.push(['pause',value]);this.paused=value;},resume(){gameCalls.push(['resume']);this.paused=false;this.onPauseChange?.();},quit(){throw new Error('community quits active game');},destroy(){throw new Error('community destroys active game');}};
  const document={querySelector:selector=>selector.includes('comunidade')?tab:null,getElementById:get,dispatchEvent:e=>events.push(e.type)};
  const location={assign:url=>navigation.push(url),reload:()=>navigation.push('reload')};
  const show=id=>screens.push(id),CustomEvent=class {constructor(type){this.type=type}};
  const panes=Object.fromEntries(['jogar','ranking','comunidade','sobre','feedback','apoie'].map(name=>[name,get('pane-'+name)]));
  const tabs=Object.keys(panes).map(name=>{const node=get('tab-'+name);node.dataset.hubTab=name;return node;});
  get('main-menu').dataset.hubNet='mp';get('hub-social-resume').hidden=true;
  const setTabBody=body(/const\s+setHubTab\s*=\s*\(tab,\s*updateRoute\s*=\s*true\)\s*=>\s*\{/,'setHubTab');
  const setHubTab=(section,updateRoute)=>new Function('tab','updateRoute','$','document','updateHubTip','menuSetup','setSetupStep','tabs','panes','mpPanel','renderHubRanking','syncHomeCharacter','abrirMultiplayer','hubNavigate','CustomEvent','estadoDaUrl','location',setTabBody)(section,updateRoute,get,document,()=>{}, {dataset:{step:'match'}},()=>{},tabs,panes,{classList:{toggle(){}}},()=>{},()=>{},()=>{},()=>navigation.push('hub-route'),CustomEvent,()=>null,{href:'http://localhost/'});
  game.onPauseChange=()=>new Function('game','show','$','resetConfirms',body(/game\.onPauseChange\s*=\s*\(\)\s*=>\s*\{/,'onPauseChange'))(game,show,get,()=>{});
  const execute=id=>{
    let action=body(new RegExp(`\\$\\(['"]${id}['"]\\)\\.onclick\\s*=\\s*\\(\\)\\s*=>\\s*\\{`),id);
    if(mutant==='quit-social-resume' && id==='hub-social-resume'){const changed=action.replace('game?.resume()','game?.quit()');assert.notEqual(changed,action,'mutation did not apply');action=changed;}
    new Function('game','show','$','document','sfx','location','setHubTab','CustomEvent',action)(game,show,get,document,{uiClick(){}},location,setHubTab,CustomEvent);
  };
  execute('btn-pause-community');assert.equal(screens.at(-1),'main-menu','pause community never opens game menu');assert.equal(get('main-menu').dataset.hubTab,'comunidade','pause community never selects social tab');assert.equal(panes.comunidade.hidden,false);assert.equal(panes.jogar.hidden,true,'match creation pane stays open');assert.equal(get('hub-social-resume').hidden,false,'resume action remains hidden');assert.equal(game.paused,true,'community resumes active simulation behind social UI');assert.equal(game.matchId,'same-match');assert.equal(game.round,3);assert.equal(navigation.length,0,'community leaves current document or changes route');
  execute('hub-social-resume');assert.equal(game.paused,false,'return action never resumes game');assert.equal(screens.at(-1),null,'return action leaves menu covering arena');assert.equal(get('main-menu').dataset.socialPaused,undefined,'pause-social state leaks after resume');assert.equal(get('hub-social-resume').hidden,true);assert.equal(gameCalls.filter(c=>c[0]==='resume').length,1);assert.equal(game.matchId,'same-match');assert.equal(game.round,3);assert.equal(navigation.length,0);
});
await check('A01','all required enabled providers accepted by Auth',async()=> {
  const h=await handlers(Object.fromEntries([...required,'email'].map(p=>[p,true])));
  const config=await h.GET({request:request('/api/social-auth?action=providers')});const data=await config.json();
  assert(required.every(p=>data.providers.includes(p)),'active Google/Twitter/Facebook/LinkedIn absent from provider response');
  for(const provider of required){const r=await h.POST({request:request('/api/social-auth',{action:'start',provider}),clientAddress:'fixture'});assert.equal(r.status,200,`enabled provider rejected: ${provider}`);const data=await r.json();assert.equal(new URL(data.url).searchParams.get('provider'),provider);}
});
await check('A02','disabled providers never advertised or accepted',async()=> {
  const h=await handlers({});const r=await h.GET({request:request('/api/social-auth?action=providers')});assert.equal((await r.json()).providers.length,0,'disabled OAuth advertised');
  for(const provider of required){const r=await h.POST({request:request('/api/social-auth',{action:'start',provider}),clientAddress:'fixture'});assert.notEqual(r.status,200,`disabled ${provider} accepted`);}
});
await check('A03','email confirmation starts in production when configured',async()=> {
  const h=await handlers({email:true});const config=await h.GET({request:request('/api/social-auth?action=providers')});assert.equal((await config.json()).email,true,'email signup/login disabled despite configured Auth');
  const r=await h.POST({request:request('/api/social-auth',{action:'email',email:'fixture@example.test',newsletter:false,returnTo:'game'}),clientAddress:'fixture'});assert([200,202].includes(r.status),'configured production email cannot start confirmation');assert(r.headers.get('set-cookie'),'email PKCE has no browser-bound state');
});
await check('A04','OAuth callback returns to game menu',async()=> {
  const h=await handlers({google:true});const r=await h.GET({request:request('/api/social-auth?action=callback&state=fixture-state&code=fixture-code')});assert.equal(r.status,302);assert.equal(new URL(r.headers.get('location'),'http://localhost:4323').pathname,'/','callback returns to external community page');
});
await check('A05','unconfigured production email fails closed',async()=> {
  const h=await handlers({email:true},true,{env:{SOCIAL_EMAIL_LOGIN:'false'}});const config=await h.GET({request:request('/api/social-auth?action=providers')});assert.equal((await config.json()).email,false,'unconfigured production email advertised');
  const r=await h.POST({request:request('/api/social-auth',{action:'email',email:'fixture@example.test'}),clientAddress:'fixture'});assert.equal(r.status,503);assert.equal(h.effects.authCalls.includes('/otp'),false,'SMTP invoked while disabled');assert.equal(h.effects.writes.length,0,'disabled email created login intent');
});
await check('N02','email consent request is explicit and pending confirmation',async()=> {
  for(const newsletter of [false,true,'true']){const h=await handlers({email:true});const r=await h.POST({request:request('/api/social-auth',{action:'email',email:'fixture@example.test',newsletter}),clientAddress:'fixture'});assert([200,202].includes(r.status));const intent=h.effects.writes.find(w=>w.table==='social_login');assert(intent,'email intent absent');assert.equal(intent.values.newsletter_requested,newsletter===true,'consent coerced or ignored');assert.equal(h.effects.writes.some(w=>w.table.includes('account_newsletter')),false,'subscription written before email confirmation');assert.equal(h.effects.sessions,0,'session granted before email confirmation');}
});
await check('N03','OAuth consent alone never auto subscribes',async()=> {
  const h=await handlers({google:true},true,{intent:{method:'oauth',newsletter_requested:true}});const r=await h.GET({request:request('/api/social-auth?action=callback&state=fixture-state&code=fixture-code')});assert.equal(r.status,302);const subscription=h.effects.writes.find(w=>w.table.includes('account_newsletter'));assert(subscription,'explicit pending request was lost');if(subscription.table.startsWith('rpc:'))assert.equal(subscription.values.p_confirmed,false,'OAuth callback confirmed newsletter');else assert.equal(subscription.values.status,'pending','OAuth callback directly subscribed');
});
await check('N04','newsletter confirmation rejects unexpected account',async()=> {
  const h=await handlers({},true,{intent:{method:'email',newsletter_requested:true,expected_auth:'another-account'}});const r=await h.GET({request:request('/api/social-auth?action=callback&state=fixture-state&code=fixture-code')});assert.equal(r.status,403,'another email account accepted');assert.equal(h.effects.sessions,0);assert.equal(h.effects.writes.length,0,'unexpected account received newsletter');
});
await check('N05','newsletter optout remains unchecked on rerender',async()=> {
  const u=await ui(true,{runCommunity:false});assert(u.entry,'account entry absent');const auth={authenticated:true,profile:u.profile,newsletter:{status:'subscribed'},emailVerified:true};const container=new Element('div');u.entry.mountNewsletter(container,auth);const check=all(container).find(n=>n.tagName==='INPUT' && n.type==='checkbox');assert.equal(check.checked,true);check.checked=false;await check.onchange();assert(u.calls.some(c=>c.action==='newsletter'),'optout not persisted');u.entry.mountNewsletter(container,auth);assert.equal(all(container).find(n=>n.tagName==='INPUT' && n.type==='checkbox').checked,false,'successful optout reappears subscribed after rerender');
});
await check('G01','guest action stays inside game',async()=> {
  const u=await ui();const action=all(u.ids['social-account']).find(n=>/JOGAR COMO CONVIDADO|CONTINUAR COMO CONVIDADO/.test(n.textContent));assert(action,'guest alternative absent');assert.equal(action.tagName,'BUTTON','guest action is a page navigation');assert.equal(u.calls.filter(c=>c.action==='newsletter').length,0);
});
await check('G02','logout preserves anonymous progress and ownership',async()=> {
  const u=await ui(true);const b=u.ids['social-logout'];assert(b && !b.hidden && b.onclick,'logout action absent');await b.onclick();
  for(const key of ['cs_anon','awpbr_token','awpbr_stats'])assert.equal(u.storage.get(key),u.before[key],`logout destroys guest ${key}`);
});
await check('N01','account newsletter consent is separate and initially unchecked',async()=> {
  const u=await ui();const account=all(u.ids['social-account']);const label=account.find(n=>n.tagName==='LABEL' && /novidades|newsletter/i.test(words(n)));assert(label,'no independent account newsletter consent');const checkbox=all(label).find(n=>n.tagName==='INPUT' && n.type==='checkbox');assert(checkbox,'newsletter consent has no checkbox');assert.equal(checkbox.checked,false,'newsletter preselected');assert.equal(checkbox.required,false,'newsletter required to create/login account');
});
await check('A06','existing accounts link identities without signing in again',async()=> {
  const u=await ui(true,{runCommunity:false});const c=new Element('div');
  u.entry.mountAccountIntegrations(c,{authenticated:true,identities:['google']},{providers:['google','discord','x','linkedin_oidc'],linking:true});
  const google=all(c).find(n=>n.dataset?.provider==='google');assert.equal(google?.dataset.linked,'true','linked login is not shown as state');assert(!all(google).some(n=>n.tagName==='BUTTON'),'linked login still rendered as a button');
  const b=all(c).find(n=>n.tagName==='BUTTON' && n.getAttribute('aria-label')==='Vincular Discord');assert(b && !b.disabled);await b.onclick();
  const call=u.calls.find(c=>c.action==='link');assert.equal(call.body.provider,'discord');assert(!('authUser' in call.body));assert(!u.calls.some(c=>c.action==='start'));
});
await check('C03','new users have independent optional cookies and newsletter choices',async()=> {
  const u=await ui(false,{runCommunity:false});const c=new Element('div');u.entry.mountAccountEntry(c,{config:{providers:['google'],email:true},onGuest:()=>{}});
  const inputs=all(c).filter(n=>n.tagName==='INPUT' && n.type==='checkbox');assert.equal(inputs.length,2);assert(inputs.every(i=>!i.checked && !i.required));
  const cookie=inputs.find(i=>i.name==='analytics');cookie.checked=true;const guest=all(c).find(n=>n.tagName==='BUTTON' && /CONVIDADO/.test(n.textContent));await guest.onclick();
  assert.equal(JSON.parse(u.storage.get('cs_privacy')).analytics,true);assert(!u.calls.some(c=>c.action==='newsletter_start'));
});
await check('C04','disabled providers remain visible without a login action',async()=> {
  const u=await ui(false,{providers:[]});await u.entry.initAccountEntry();u.ids['hub-account-login'].onclick();const buttons=all(u.ids['account-entry-body']).filter(n=>n.tagName==='BUTTON' && /em configuração/i.test(words(n)));
  assert.equal(buttons.length,4);for(const provider of ['Google','Discord','X','LinkedIn'])assert(buttons.some(b=>words(b).includes(provider) && b.disabled));
  assert(!u.calls.some(c=>c.action==='start'),'Unavailable providers started OAuth');
});
await check('R01','lobby identity replaces the completion reminder (owner 2026-10-14)',async()=> {
  assert(entrySource,'shared account entry is absent');const markup=menuMarkup(path.join(root,'src/pages/index.astro'));assert.doesNotMatch(markup,/id=["']account-completion["']|COMPLETE SEU PERFIL/,'completion reminder still competes with the header identity');assert.match(markup,/id=["']hub-view-profile["']/,'header has no Ver perfil link');
});
await check('C02','portrait rotate guard exempts only visible community menu',()=> {
  assert.match(index,/\/social\.css/,'social stylesheet not linked from game');
  let css=['style.css','social.css'].map(file=>read(path.join(root,'public',file))).join('\n').replace(/\/\*[\s\S]*?\*\//g,'');
  assert.match(css,/@media\s*\(orientation\s*:\s*portrait\)\s*and\s*\(pointer\s*:\s*coarse\)\s*\{\s*#rotate-prompt\s*\{[^}]*display\s*:\s*flex/,'portrait gameplay overlay baseline missing');
  const guard=/body:has\(#main-menu:not\(\.hidden\)\[data-hub-tab=(?:['"])?comunidade(?:['"])?\]\)\s+#rotate-prompt\s*\{[^}]*display\s*:\s*none[^}]*\}/g;
  if(mutant==='portrait-no-guard'){const changed=css.replace(guard,'');assert.notEqual(changed,css,'mutation did not apply');css=changed;}
  if(mutant==='portrait-broad-guard'){assert(guard.test(css),'mutation did not apply');css=css.replaceAll('#main-menu:not(.hidden)[data-hub-tab=','#main-menu[data-hub-tab=');}
  const rules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(m=>m[1].split(',').map(selector=>({selector:selector.trim(),declarations:m[2]}))).filter(rule=>rule.selector.includes('#rotate-prompt') && rule.selector!=='#rotate-prompt' && /(?:^|;)\s*display\s*:\s*none(?:\s*!important)?\s*(?:;|$)/.test(rule.declarations));
  const matches=(selector,state)=>{
    const m=/^body:has\(#main-menu(:not\(\.hidden\))?\[data-hub-tab=['"]?(\w+)['"]?\]\)\s+#rotate-prompt$/.exec(selector);
    assert(m,`unmodeled rotate exemption selector: ${selector}`);
    return state.exists && (!m[1] || !state.hidden) && state.tab===m[2];
  };
  const exempt=state=>rules.some(rule=>matches(rule.selector,state));
  assert.equal(exempt({exists:true,hidden:false,tab:'comunidade'}),true,'visible community remains blocked by portrait rotate overlay');
  assert.equal(exempt({exists:true,hidden:true,tab:'comunidade'}),false,'hidden community menu suppresses active-game orientation overlay');
  assert.equal(exempt({exists:true,hidden:false,tab:'jogar'}),false,'play tab suppresses gameplay orientation overlay');
  assert.equal(exempt({exists:false,hidden:false,tab:'comunidade'}),false,'missing menu suppresses orientation overlay');
});
await check('H01','unique public ID is selectable in game settings and fixed after claim',async()=>{
 const u=await ui(true,{tab:'settings'});let nodes=all(u.ids['social-content']);const label=nodes.find(n=>n.tagName==='LABEL'&&/ID público/.test(n.textContent));assert(label,'unique ID input absent');const field=all(label).find(n=>n.tagName==='INPUT');assert.equal(field.disabled,false);field.value='treta_unica';const b=nodes.find(n=>n.tagName==='BUTTON'&&n.textContent==='ESCOLHER ID');assert(b,'claim button absent');await b.onclick();assert(u.calls.some(c=>c.action==='handle'&&c.body.handle==='treta_unica'&&!c.body.target),'claim does not use authenticated handle action');nodes=all(u.ids['social-content']);assert(nodes.some(n=>n.tagName==='INPUT'&&n.value==='treta_unica'&&n.disabled),'claimed handle not fixed in UI');
});
await check('H02','public character sharing defaults off and is persisted explicitly',async()=>{
 const u=await ui(true,{tab:'settings'});const nodes=all(u.ids['social-content']),label=nodes.find(n=>n.tagName==='LABEL'&&/último personagem/.test(n.textContent));assert(label,'sharing preference absent');const box=all(label).find(n=>n.tagName==='INPUT');assert.equal(box.checked,false);box.checked=true;await nodes.find(n=>n.tagName==='BUTTON'&&n.textContent==='SALVAR PERFIL').onclick();assert(u.calls.some(c=>c.action==='settings'&&c.body.shareCharacter===true),'sharing choice not persisted');
});
await check('H03','share link uses canonical domain and selected public ID',async()=>{
 const u=await ui(true,{profileValues:{handle:'treta_unica',url:'/u/treta_unica'}});const b=all(u.ids['social-content']).find(n=>n.tagName==='BUTTON'&&n.textContent==='COPIAR LINK');assert(b);await b.onclick();assert.equal(u.copied[0],'https://www.corosolto.com.br/u/treta_unica');
});
if(process.env.SOCIAL_ENTRY_API && !only) {
  await check('L01','real local Auth advertises required enabled providers',async()=> {
    const url=new URL(process.env.SOCIAL_ENTRY_API);assert(['localhost','127.0.0.1','[::1]'].includes(url.hostname),'live probe must be local');
    const r=await fetch(new URL('/api/social-auth?action=providers',url),{signal:AbortSignal.timeout(5000)});assert.equal(r.status,200);const config=await r.json();const missing=required.filter(p=>!config.providers?.includes(p));if(missing.length){const e=new Error(`OAuth apps not active: ${missing.join(', ')}; external login remains unverified`);e.name='Unknown';throw e;}assert.equal(config.email,true);
  });
} else if(!only){unknown++;console.log('UNKNOWN L01 real Auth provider activation: set SOCIAL_ENTRY_API to local API');}
console.log(`SOCIAL ENTRY ${passed} PASS / ${failed} RED / ${unknown} UNKNOWN`);
if(mutant && !failed)throw new Error('mutation survived');
process.exitCode=failed || unknown ? 1 : 0;
