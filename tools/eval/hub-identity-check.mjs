// Pedido do dono em 14/10/2026: no topo do lobby, um elemento só de identidade.
// Logado: @handle e "Ver perfil". Deslogado: convite "Reivindique seu perfil" com ENTRAR.
// Sem "MINHA CONTA" duplicado, sem chip "EDITAR", sem "COMPLETE SEU PERFIL".
// Executa o account-entry.js real num DOM falso; aparência fica com a captura no PR.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const mutant=process.argv.find(arg=>arg.startsWith('--mutante='))?.slice(10);
let entry=read('public/js/account-entry.js');
let index=read('src/pages/index.astro');
let social=read('public/social.css');const treta=read('public/treta.css');
const mutation=(source,before,after)=>{assert(source.includes(before),'MUTANTE NÃO APLICOU: trecho ausente');return source.replace(before,after);};
const mutants={
  'sem-handle':()=>{entry=mutation(entry,"mine?.handle?'@'+mine.handle:profile.nick","profile.nick");},
  'sem-convite':()=>{entry=mutation(entry,":'Reivindique seu perfil';",":'ENTRAR';");},
  'ver-perfil-sempre':()=>{entry=mutation(entry,'if(view){view.hidden=!profile;view.href=ownProfilePath(profile,mine);}','if(view){view.hidden=false;view.href=ownProfilePath(profile,mine);view.onclick=()=>document.dispatchEvent(new CustomEvent("cs-community-open",{detail:{tab:"profile"}}));}');},
  'minha-conta':()=>{index=mutation(index,'<b id="hub-identity-name">Reivindique seu perfil</b>','<b id="hub-identity-name">Reivindique seu perfil</b></button><button class="hub-header-action" type="button">MINHA CONTA');},
  'chip-62px':()=>{social=mutation(social,'html[data-home-ui=hub] .hub-identity-wrap #hub-account-login{max-width:136px','.hub-identity{max-width:136px');},
  'convite-uma-linha':()=>{social=mutation(social,'[data-state=guest] b{max-width:64px;white-space:normal','[data-state=guest] b{max-width:64px');},
  'lembrete-volta':()=>{index=mutation(index,'<a id="hub-view-profile"','<details id="account-completion"><summary>COMPLETE SEU PERFIL</summary></details><a id="hub-view-profile"');},
};
if(mutant){assert(mutants[mutant],'mutante desconhecido: '+mutant);mutants[mutant]();}

class Node {
  constructor(tag,id=''){this.tagName=tag.toUpperCase();this.id=id;this.children=[];this.dataset={};this.attrs={};this.style={};this.textContent='';this.hidden=false;this.open=false;}
  append(...n){this.children.push(...n);} replaceChildren(...n){this.children=n;}
  setAttribute(k,v){this.attrs[k]=String(v);} getAttribute(k){return this.attrs[k]??null;}
  addEventListener(){} focus(){} showModal(){this.open=true;} close(){this.open=false;} click(){this.onclick?.({preventDefault(){}});}
}
async function lobby({session,card}) {
  const ids={};const get=id=>ids[id]??=new Node(id==='account-entry-dialog'?'dialog':'div',id);
  for(const [id,tag] of [['hub-account-login','button'],['hub-identity-name','b'],['hub-identity-cta','span'],['hub-view-profile','a'],['hub-avatar','span']])ids[id]=new Node(tag,id);
  ids['hub-view-profile'].hidden=true;get('account-entry-dialog');get('account-entry-body');get('account-entry-close');
  const events={},dispatched=[],community=new Node('button');community.click=()=>dispatched.push('tab:comunidade');
  const fetch=async path=>{
    const body=path.includes('action=providers')?{providers:['google'],email:true}:path==='/api/social-auth'?session:path.includes('action=profile')?(card?{profile:card}:null):{};
    return new Response(JSON.stringify(body??{error:'social_unavailable'}),{status:body?200:503});
  };
  const store=new Map([['awpbr_nick','TesteDominio']]);
  const context=vm.createContext({
    document:{body:new Node('body'),getElementById:id=>ids[id]??null,createElement:t=>new Node(t),createTextNode:t=>t,querySelector:s=>s.includes('comunidade')?community:null,addEventListener:(t,fn)=>{(events[t]??=[]).push(fn);},dispatchEvent:e=>{dispatched.push(e.type+':'+(e.detail?.tab||''));for(const fn of events[e.type]||[])fn(e);},activeElement:null},
    CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail;}},MutationObserver:class{observe(){}},
    localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
    location:{search:'',assign(){}},URLSearchParams,fetch,AbortSignal,Response,encodeURI,setTimeout,console,
    analyticsAllowed:()=>false,mountPrivacyChoice:()=>({checked:false}),setPrivacyChoice(){},accountVerifiedBadge:()=>null,
  });
  const names=[...entry.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(\w+)/g)].map(m=>m[1]);
  const api=vm.runInContext('(function(){'+entry.replace(/^import .*;\n/gm,'').replace(/export\s+/g,'')+`;return {${names.join(',')}}})()`,context,{timeout:1000});
  await api.initAccountEntry({skipPrompt:true});
  for(let i=0;i<4;i++)await new Promise(r=>setImmediate(r));
  const view=()=>({state:ids['hub-account-login'].dataset.state,name:ids['hub-identity-name'].textContent,cta:ids['hub-identity-cta'].hidden?null:ids['hub-identity-cta'].textContent,profileLink:!ids['hub-view-profile'].hidden,profileHref:ids['hub-view-profile'].href,profileIntercepted:typeof ids['hub-view-profile'].onclick==='function',label:ids['hub-account-login'].getAttribute('aria-label')});
  return {ids,view,events,dispatched,context};
}
const signedIn={authenticated:true,profile:{id:'p1',nick:'TesteDominio'},identities:['google']};
const tests=[
  ['logado com ID público mostra @handle e Ver perfil, sem ENTRAR',async()=>{
    const ui=await lobby({session:signedIn,card:{id:'p1',nick:'TesteDominio',handle:'rubenmarcus',url:'/u/rubenmarcus'}});const v=ui.view();
    assert.equal(v.name,'@rubenmarcus','@handle ausente no topo');assert.equal(v.state,'account');assert.equal(v.cta,null,'ENTRAR aparece para quem já entrou');assert.equal(v.profileLink,true,'Ver perfil ausente para quem entrou');assert.equal(v.profileHref,'/u/rubenmarcus','Ver perfil sem rota canônica');assert.equal(v.profileIntercepted,false,'Ver perfil reinicia a comunidade por evento paralelo');assert.match(v.label,/@rubenmarcus/);
    ui.ids['hub-view-profile'].click();assert.deepEqual(ui.dispatched.filter(d=>/comunidade|community/.test(d)),[],'Ver perfil disparou a comunidade em paralelo');
  }],
  ['logado sem ID público cai no nick, nunca em @undefined',async()=>{
    const v=(await lobby({session:signedIn,card:{id:'p1',nick:'TesteDominio',handle:null}})).view();assert.equal(v.name,'TesteDominio');assert.equal(v.profileLink,true);
    const offline=(await lobby({session:signedIn,card:null})).view();assert.equal(offline.name,'TesteDominio','cartão fora do ar apagou a identidade');
  }],
  ['deslogado mostra o convite e o botão de entrar, sem Ver perfil',async()=>{
    const v=(await lobby({session:{authenticated:false}})).view();
    assert.equal(v.name,'Reivindique seu perfil','convite ausente');assert.equal(v.cta,'ENTRAR','botão de entrar ausente');assert.equal(v.state,'guest');assert.equal(v.profileLink,false,'Ver perfil aparece sem conta');
  }],
  ['sair da conta volta ao convite no mesmo elemento',async()=>{
    const ui=await lobby({session:signedIn,card:{id:'p1',nick:'TesteDominio',handle:'rubenmarcus'}});
    for(const fn of ui.events['cs-account-change']||[])fn({detail:{authenticated:false}});await new Promise(r=>setImmediate(r));
    const v=ui.view();assert.equal(v.name,'Reivindique seu perfil','logout deixou o @handle no topo');assert.equal(v.profileLink,false);
  }],
  ['o topo tem um elemento de conta só',()=>{
    const header=index.slice(index.indexOf('<header class="hub-header">'),index.indexOf('</header>',index.indexOf('<header class="hub-header">')));
    assert(header.length>0,'header do lobby ausente');
    assert.doesNotMatch(index,/MINHA CONTA/,'MINHA CONTA duplicando o chip');
    assert.doesNotMatch(entry,/MINHA CONTA/,'JS ainda escreve MINHA CONTA');
    assert.doesNotMatch(index,/COMPLETE SEU PERFIL|id="account-completion"/,'lembrete COMPLETE SEU PERFIL voltou');
    assert.doesNotMatch(header,/EDITAR ▸/,'chip EDITAR voltou');
    assert.equal((header.match(/id="hub-account-login"/g)||[]).length,1);
    const visible=[...header.matchAll(/<button\b([^>]*)>/g)].map(m=>m[1]).filter(a=>!/\shidden(\s|$)/.test(a)&&!/hub-music|hub-settings|hub-social-resume|hub-treta-wallet|role="tab"/.test(a));
    assert.equal(visible.length,1,'mais de um botão de conta visível no topo: '+visible.join(' | '));
  }],
  ['a 390 px o chip cabe o @handle e o convite (cascata social.css + treta.css)',()=>{
    const won=(target,prop)=>winner([['social.css',social],['treta.css',treta]],target,prop,390);
    const max=won('chip','max-width');assert(max,'nenhuma regra de max-width para o chip');
    assert(max.value==='none' || parseFloat(max.value)>=120,`a 390 px vence ${max.file} "${max.selector}" com max-width:${max.value}: corta o @handle e o convite`);
    const ws=won('guestName','white-space');assert.equal(ws?.value,'normal',`a 390 px o convite fica numa linha só (vence ${ws?.file} "${ws?.selector}")`);
  }],
];
// Cascata estática: regras que valem a 390 px, ordem dos <link> (social.css antes de treta.css), especificidade.
const targets={chip:/#hub-account-login$|\.hub-identity$/,guestName:/(#hub-account-login|\.hub-identity)(\[data-state=guest\])?\s+b$/};
function specificity(sel){const s=sel.replace(/::?[\w-]+(\([^)]*\))?/g,m=>m.startsWith('::')?' x':' .p');return [(s.match(/#[\w-]+/g)||[]).length,(s.match(/\.[\w-]+|\[[^\]]+\]/g)||[]).length,(s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]/g,'').match(/(^|[\s>+~])[a-z][\w-]*/gi)||[]).length];}
function rules(file,css,width){const out=[];const strip=css.replace(/\/\*[\s\S]*?\*\//g,'');let i=0;
  const walk=(text,applies)=>{const re=/([^{}]+)\{/g;let m;let pos=0;while((m=re.exec(text))){const head=m[1].trim();let depth=1,j=re.lastIndex;while(depth&&j<text.length){if(text[j]==='{')depth++;else if(text[j]==='}')depth--;j++;}const body=text.slice(re.lastIndex,j-1);re.lastIndex=j;
    if(head.startsWith('@media')){const mx=head.match(/max-width:\s*(\d+)px/),mn=head.match(/min-width:\s*(\d+)px/);const ok=!/prefers-reduced-motion|print/.test(head)&&(!mx||width<=+mx[1])&&(!mn||width>=+mn[1]);walk(body,applies&&ok);continue;}
    if(head.startsWith('@'))continue;
    for(const sel of head.split(',').map(x=>x.trim()))for(const d of body.split(';')){const k=d.indexOf(':');if(k<0)continue;out.push({file,selector:sel,prop:d.slice(0,k).trim(),value:d.slice(k+1).trim().replace(/!important/,''),important:/!important/.test(d),applies,order:i++});}}};
  walk(strip,true);return out;}
function winner(files,target,prop,width){
  const hits=files.flatMap(([f,css])=>rules(f,css,width)).map((r,order)=>({...r,order})).filter(r=>r.applies&&r.prop===prop&&targets[target].test(r.selector.replace(/:(hover|focus-visible|active)\b.*$/,'##'))&&!/\[data-state=(?!guest)/.test(r.selector)&&(target!=='chip'||!/\[data-state=guest\]$/.test(r.selector)||true));
  const cmp=(a,b)=>(a.important-b.important)||specificity(a.selector).reduce((acc,v,i)=>acc||v-specificity(b.selector)[i],0)||(a.order-b.order);
  return hits.sort(cmp).at(-1)||null;}
let passed=0;
for(const [name,run] of tests){try{await run();passed++;console.log('PASS '+name);}catch(e){console.log('RED '+name+': '+e.message.split('\n')[0]);}}
console.log(`hub identity: ${passed}/${tests.length}; mutante=${mutant||'nenhum'}`);
if(passed!==tests.length)process.exitCode=1;
