// Independent acceptance contract: confirmed email + social identity on this account.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
assert.equal(typeof AbortSignal.timeout,'function','Node 20+ required; cannot measure UI on unsupported Node');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const baseline=process.argv.includes('--baseline');
const source=name=>baseline?execFileSync('git',['show','9f9628220:public/js/'+name],{cwd:root,encoding:'utf8'}):readFileSync(path.join(root,'public/js',name),'utf8');
const mutant=process.argv.find(x=>x.startsWith('--mutant='))?.split('=')[1];
class Element {
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.dataset={};this.textContent='';this.className='';this.hidden=false;this.value='';this.checked=false;this.classList={contains:()=>false};}
 append(...nodes){this.children.push(...nodes);} replaceChildren(...nodes){this.children=nodes;this.textContent='';}
 setAttribute(k,v){this.attrs[k]=String(v);} getAttribute(k){return this.attrs[k]??null;}
 addEventListener(){} focus(){} reportValidity(){return true;}
 querySelector(selector){return all(this).find(n=>n.tagName===selector.toUpperCase())||null;}
 get childElementCount(){return this.children.filter(x=>typeof x==='object').length;}
}
const all=n=>[n,...n.children.filter(x=>typeof x==='object').flatMap(all)];
const words=n=>[n.textContent,...n.children.map(x=>typeof x==='object'?words(x):x)].join(' ');
const badges=n=>all(n).filter(x=>x.className.split(/\s+/).includes('account-verified')&&!x.hidden);
function inspect(n,expected,label){const found=badges(n);assert.equal(found.length,expected?1:0,label+' badge count');if(expected){const b=found[0],description=b.textContent+' '+(b.attrs['aria-label'] || b.title || '');assert.match(description,/e-?mail/i,label+' accessible confirmed-email meaning absent');assert.match(description,/rede|social|vinculad/i,label+' accessible linked-social meaning absent');assert.doesNotMatch(description.replace(/Não[^.]*\.?/gi,''),/identidade civil|anti.?cheat|partidas sem cheat|apoio oficial|suporte oficial/i,label+' overclaims badge meaning');}}
async function ui(value,{authValue=value,profile=true}={}){
 const ids=Object.fromEntries(['community','social-status','social-account','social-content','social-unread','hub-social-unread'].map(id=>[id,new Element('div')]));ids.community.dataset={tab:'profile',profile:'11111111-1111-4111-8111-111111111111'};
 const player={id:ids.community.dataset.profile,nick:'Fixture',account_verified:value,verified:true,emailVerified:true,identities:['google'],socials:[{net:'github',url:'https://github.com/fixture'}],level:1,next_level_points:10,kills:0,deaths:0,matches:0,points:0,wins:0,losses:0,kd:0,play_seconds:0,history:[],favorites:[],achievements:[],settings:{profile:'public',presence:'friends',activity:'private'}};
 const auth={authenticated:true,profile:{id:player.id,nick:player.nick},account_verified:authValue,emailVerified:true,identities:['google'],newsletter:{status:'unsubscribed'}};
 const listeners={};const context=vm.createContext({document:{body:new Element('body'),getElementById:id=>ids[id]||null,createElement:tag=>new Element(tag),createTextNode:t=>t,querySelectorAll:()=>[],addEventListener:(type,fn)=>{listeners[type]=fn;},dispatchEvent(){}},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},window:{dispatchEvent(){}},location:{origin:'http://localhost:4391',search:'',href:'http://localhost:4391/'},navigator:{clipboard:{writeText:async()=>{}}},URL,URLSearchParams,AbortSignal,CustomEvent:class{},setInterval:()=>1,setTimeout,clearTimeout,console,fetch:async()=>new Response(JSON.stringify({profile:player}),{status:200}),mountPrivacyChoice:()=>({}),setPrivacyChoice(){},privacyChoice:()=>false});
 let ranking=source('ranking-player.js'),account=source('account-entry.js'),community=source('community.js');
 const helper=path.join(root,'public/js/account-verified.js');let helperSource=!baseline&&existsSync(helper)?readFileSync(helper,'utf8'):'';
 if(mutant==='onboard-stale'){const changed=account.replace('auth.account_verified=out.account_verified===true;','');assert.notEqual(changed,account,'MUTANT DID NOT APPLY');account=changed;}else if(mutant){assert(['trust-truthy','suppress-badge'].includes(mutant),'unknown mutant');const changed=mutant==='trust-truthy'?helperSource.replace('verified!==true','!verified').replace('verified !== true','!verified').replace('verified===true','!!verified').replace('verified === true','!!verified'):helperSource.replace('verified!==true','true').replace('verified !== true','true').replace('verified===true','false').replace('verified === true','false');assert.notEqual(changed,helperSource,'MUTANT DID NOT APPLY');helperSource=changed;}
 if(!baseline){vm.runInContext(source('profile-character-catalog.js').replace(/export\s+/g,''),context,{timeout:1000});vm.runInContext(source('profile-character.js').replace(/^import .*\n/gm,'').replace(/export\s+/g,''),context,{timeout:1000});}
 if(helperSource)vm.runInContext(helperSource.replace(/^import .*\n/gm,'').replace(/export\s+/g,''),context);
 const clean=s=>s.replace(/^import .*\n/gm,'').replace(/export\s+/g,'');
 if(!baseline)vm.runInContext('(function(){'+clean(source('career-rank.js'))+';Object.assign(globalThis,{careerRankBadge,careerRankTitle});})()',context,{timeout:1000});
 vm.runInContext('(function(){'+clean(ranking)+';Object.assign(globalThis,{rankingPlayerCell,rankingTable,...(typeof profileSocialLinks==="function"?{profileSocialLinks,profileSocialLink}:{})});})()',context,{timeout:1000});vm.runInContext('(function(){'+clean(account)+';Object.assign(globalThis,{mountAccountIntegrations,mountAccountEntry,mountProfilePreferences,loadAccount,loadAuthOptions,acceptAccount,logoutAccount});})()',context,{timeout:1000});
 vm.runInContext('loadAccount=async()=>fixtureAuth;loadAuthOptions=async()=>({providers:[],linking:false});acceptAccount=()=>{};questList=()=>document.createElement("div");',Object.assign(context,{fixtureAuth:auth}),{timeout:1000});
 const rankingCell=vm.runInContext('rankingPlayerCell(fixturePlayer)',Object.assign(context,{fixturePlayer:player}),{timeout:1000});
 const integrations=new Element('div');context.fixtureContainer=integrations;vm.runInContext('mountAccountIntegrations(fixtureContainer,fixtureAuth,{providers:[],linking:false})',context,{timeout:1000});
 if(profile){context.fetch=async url=>new Response(JSON.stringify(url.includes('action=profile')?{profile:player}:{profile:player,friends:[],notifications:[],invites:[],feed:[],blocks:[]}),{status:200});vm.runInContext(clean(community),context,{timeout:1000});for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));}
 if(profile)assert(words(ids['social-content']).includes('Fixture'),'UI cannot measure public profile: '+words(ids['social-status'])+' '+words(ids['social-content']));
 return {rankingCell,integrations,profile:ids['social-content'],status:ids['social-status'],listeners,context,player,auth};
}
let passed=0,failed=0;
async function check(name,fn){try{await fn();passed++;console.log('PASS',name);}catch(e){failed++;console.log('RED',name+':',e.message.split('\n')[0]);}}
await check('positive: public profile, ranking and own indicator show linked-account badge',async()=>{const u=await ui(true);assert(words(u.profile).includes('Fixture'),words(u.status)+' '+words(u.profile));for(const [name,n] of [['ranking',u.rankingCell],['profile',u.profile],['own',u.integrations]])inspect(n,true,name);});
for(const value of [false,undefined,null,0,1,'true'])await check('strict boolean: '+String(value)+' cannot promote forged links/email/providers',async()=>{const u=await ui(value);for(const [name,n] of [['ranking',u.rankingCell],['profile',u.profile],['own',u.integrations]])inspect(n,false,name);});
await check('own indicator explains email and social requirements while unverified',async()=>{const u=await ui(false,{profile:false});assert.match(words(u.integrations),/e-?mail/i);assert.match(words(u.integrations),/rede|social/i);assert.match(words(u.integrations),/verificad|selo/i);});
await check('first onboard applies trusted server flag before first account callback',async()=>{const u=await ui(false,{profile:false}),container=new Element('div');let first=null;u.context.fixtureOnboardAuth={authenticated:true,profile:null,account_verified:false,newsletter:{status:'unsubscribed'}};u.context.fixtureContainer=container;u.context.fixtureAuthenticated=auth=>{first=auth;};u.context.fetch=async()=>new Response(JSON.stringify({profile:u.player,account_verified:true}),{status:200});vm.runInContext('mountAccountEntry(fixtureContainer,{auth:fixtureOnboardAuth,onAuthenticated:fixtureAuthenticated})',u.context,{timeout:1000});const input=all(container).find(n=>n.tagName==='INPUT'&&n.maxLength===32);assert(input,'first onboard nick input absent');input.value='Fixture';const submit=all(container).find(n=>n.tagName==='BUTTON'&&/VESTIR A CAMISA/.test(n.textContent));assert(submit);await submit.onclick();assert(first,'first account callback never happened');assert.equal(first.account_verified,true,'first account callback has stale badge');});
await check('account change removes live public badge after revocation',async()=>{const u=await ui(true);inspect(u.profile,true,'before');u.player.account_verified=false;u.auth.account_verified=false;assert(u.listeners['cs-account-change']);u.listeners['cs-account-change']({detail:u.auth});for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));inspect(u.profile,false,'after');});
console.log(`Account badge acceptance: ${passed} passed, ${failed} failed`);process.exitCode=failed?1:0;
