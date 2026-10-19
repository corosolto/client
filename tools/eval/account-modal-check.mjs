// Pedido do dono em 14/10/2026: modal de conta simples. Saudação "Olá, @handle", uma ação
// primária só, login vinculado como estado (não botão cinza), preferências recolhidas e
// botões de entrada com a marca de cada provedor. Roda o account-entry.js real num DOM falso;
// a aparência fica com as capturas do PR.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const mutant=process.argv.find(arg=>arg.startsWith('--mutante='))?.slice(10);
let entry=read('public/js/account-entry.js');
const css=read('public/social.css');
const mutation=(before,after)=>{assert(entry.includes(before),'MUTANTE NÃO APLICOU: trecho ausente');entry=entry.replace(before,after);};
const mutants={
  'vinculado-botao':()=>mutation("row.append(node('span','✓ Vinculado','account-login-state'));","{const x=node('button','✓ Vinculado','account-button');x.disabled=true;row.append(x);}"),
  'dois-primarios':()=>mutation("quiet('Sair da conta',","button('SAIR DA CONTA',"),
  'preferencias-abertas':()=>mutation("{auth,message:say,fold:true}","{auth,message:say}"),
  'sem-handle':()=>mutation("title.textContent=`Olá, @${profile.handle}`","title.textContent=`Olá, ${auth.profile.nick}`"),
  'sem-icone':()=>mutation("if(PROVIDER_ICONS[provider]){","if(false){"),
  'titulo-preso':()=>mutation("  dialogHead(container,'A PORTA DA RESENHA','CHEGA JUNTO.');\n  container.append(","  container.append("),
  'perfil-pelo-hub':()=>mutation("button('VER MEU PERFIL',async()=>leaveTo(ownProfilePath(auth.profile,await loadProfileCard())))","button('VER MEU PERFIL',()=>document.dispatchEvent(new CustomEvent('cs-community-open',{detail:{tab:'profile'}})))"),
  'cabecalho-pelo-evento':()=>mutation("if(view){view.hidden=!profile;view.href=ownProfilePath(profile,mine);}","if(view){view.hidden=!profile;view.href=ownProfilePath(profile,mine);view.onclick=()=>document.dispatchEvent(new CustomEvent('cs-community-open',{detail:{tab:'profile'}}));}"),
};
if(mutant){assert(mutants[mutant],'mutante desconhecido: '+mutant);mutants[mutant]();}

class Node {
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.parent=null;this.dataset={};this.attrs={};this.style={};this._text='';this.className='';this.hidden=false;this.open=false;this.disabled=false;this.checked=false;this.innerHTML='';}
  get textContent(){return this._text+this.children.map(c=>typeof c==='string'?c:c.textContent).join('');}
  set textContent(v){this._text=String(v);this.children=[];}
  append(...n){for(const c of n){if(typeof c==='object')c.parent=this;this.children.push(c);}}
  replaceChildren(...n){this.children=[];this._text='';this.append(...n);}
  setAttribute(k,v){this.attrs[k]=String(v);} getAttribute(k){return this.attrs[k]??null;}
  closest(tag){let n=this;while(n){if(n.tagName===tag.toUpperCase())return n;n=n.parent;}return null;}
  contains(x){let n=x;while(n){if(n===this)return true;n=n.parent;}return false;}
  querySelector(sel){const parts=sel.trim().split(/\s+/).map(t=>t.toUpperCase());const walk=(n,i)=>{for(const c of n.children){if(typeof c!=='object')continue;const j=c.tagName===parts[i]?i+1:i;if(j===parts.length)return c;const f=walk(c,j);if(f)return f;}return null;};return walk(this,0);}
  reportValidity(){return true;} focus(){} addEventListener(){} showModal(){this.open=true;} close(){this.open=false;}
}
const all=n=>[n,...n.children.filter(c=>typeof c==='object').flatMap(all)];
async function modal({auth,card,providers=['google','discord','x','linkedin_oidc'],linking=true}) {
  const dialog=new Node('dialog'),header=new Node('header'),hgroup=new Node('div'),small=new Node('small'),h2=new Node('h2'),body=new Node('div');
  small.textContent='A PORTA DA RESENHA';h2.textContent='CHEGA JUNTO.';hgroup.append(small,h2);header.append(hgroup);dialog.append(header,body);
  const calls=[],navigations=[],events=[];
  const fetch=async(path,opts={})=>{calls.push({path,body:opts.body?JSON.parse(opts.body):null});const out=path.includes('action=profile')?{profile:card}:{ok:true,url:'https://auth.example/link'};return new Response(JSON.stringify(out),{status:200});};
  const context=vm.createContext({document:{createElement:t=>new Node(t),createTextNode:t=>t,querySelector:()=>null,getElementById:()=>null,dispatchEvent:event=>events.push(event),addEventListener(){}},CustomEvent:class{constructor(t,o){this.type=t;this.detail=o?.detail;}},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},location:{assign:url=>navigations.push(url)},fetch,AbortSignal,Response,console,setTimeout,
    analyticsAllowed:()=>false,setPrivacyChoice(){},mountPrivacyChoice:c=>{const l=new Node('label');l.className='account-consent';c.append(l);return {checked:false};},accountVerifiedBadge:v=>{if(!v)return null;const b=new Node('span');b.className='account-verified';b.textContent='✓ VERIFICADO';return b;}});
  const names=[...entry.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(\w+)/g)].map(m=>m[1]);
  const api=vm.runInContext('(function(){'+entry.replace(/^import .*;\n/gm,'').replace(/export\s+/g,'')+`;return {${names.join(',')}}})()`,context,{timeout:1000});
  const mount=async a=>{api.mountAccountEntry(body,{auth:a,config:{providers,email:true,linking},onGuest(){},onAuthenticated(){}});for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));};
  await mount(auth);
  return {dialog,body,small,h2,calls,navigations,events,nodes:()=>all(body),remount:mount};
}
async function header(card){
  const dialog=new Node('dialog'),body=new Node('div'),close=new Node('button'),open=new Node('button'),view=new Node('a'),pageBody=new Node('body'),mainMenu=new Node('div');
  mainMenu.classList={contains:()=>false};
  const ids={'account-entry-dialog':dialog,'account-entry-body':body,'account-entry-close':close,'hub-account-login':open,'hub-view-profile':view,'main-menu':mainMenu};
  const auth={...signedIn,profile:{...signedIn.profile}};
  const fetch=async path=>new Response(JSON.stringify(path.includes('action=providers')?{providers:[]}:path.includes('/api/social?action=profile')?{profile:card}:auth),{status:200});
  const context=vm.createContext({document:{body:pageBody,activeElement:null,createElement:t=>new Node(t),createTextNode:t=>t,querySelector:()=>null,getElementById:id=>ids[id]||null,dispatchEvent(){},addEventListener(){}},CustomEvent:class{constructor(t,o){this.type=t;this.detail=o?.detail;}},MutationObserver:class{observe(){}},URLSearchParams,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},location:{search:'',assign(){}},fetch,AbortSignal,Response,console,setTimeout,
    analyticsAllowed:()=>false,setPrivacyChoice(){},mountPrivacyChoice:c=>{const l=new Node('label');c.append(l);return {checked:false};},accountVerifiedBadge:()=>null});
  const names=[...entry.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(\w+)/g)].map(m=>m[1]);
  const api=vm.runInContext('(function(){'+entry.replace(/^import .*;\n/gm,'').replace(/export\s+/g,'')+`;return {${names.join(',')}}})()`,context,{timeout:1000});
  await api.initAccountEntry({skipPrompt:true});
  return view;
}
const signedIn={authenticated:true,profile:{id:'p1',nick:'TesteDominio'},identities:['google'],account_verified:true,emailVerified:true,newsletter:{status:'pending'}};
const primaries=nodes=>nodes.filter(n=>n.tagName==='BUTTON' && /\baccount-button\b/.test(n.className) && !/\baccount-(provider|guest)\b/.test(n.className));
const tests=[
  ['logado: saudação Olá, @handle no topo do modal',async()=>{
    const m=await modal({auth:signedIn,card:{id:'p1',handle:'rubenmarcus'}});
    assert.equal(m.h2.textContent,'Olá, @rubenmarcus','saudação sem @handle');assert.equal(m.small.textContent,'SUA CONTA');
    assert.doesNotMatch(m.body.textContent,/Salve, TesteDominio/,'saudação antiga duplicada no corpo');
    const plain=await modal({auth:signedIn,card:{id:'p1',handle:null}});assert.equal(plain.h2.textContent,'Olá, TesteDominio','sem ID público a saudação perde o nick');
  }],
  ['logado: uma ação primária só',async()=>{
    const m=await modal({auth:signedIn,card:{id:'p1',handle:'rubenmarcus'}});const p=primaries(m.nodes());
    assert.deepEqual(p.map(b=>b.textContent),['VER MEU PERFIL'],'botões chapados demais: '+p.map(b=>b.textContent).join(', '));
    assert(m.nodes().some(n=>n.tagName==='BUTTON' && n.textContent==='Sair da conta'),'sair da conta sumiu');
  }],
  ['ver meu perfil abre uma rota canônica uma vez, sem reiniciar a comunidade',async()=>{
    const m=await modal({auth:signedIn,card:{id:'p1',handle:'rubenmarcus',url:'/u/rubenmarcus'}});
    const view=m.nodes().find(n=>n.tagName==='BUTTON' && n.textContent==='VER MEU PERFIL');assert(view,'ação VER MEU PERFIL sumiu');
    await view.onclick();
    assert.deepEqual(m.navigations,['/u/rubenmarcus'],'perfil não abriu a rota própria uma vez');
    assert.equal(m.events.filter(event=>event.type==='cs-community-open').length,0,'clique reiniciou a comunidade por evento paralelo');
  }],
  ['login vinculado aparece como estado, os outros como ação',async()=>{
    const m=await modal({auth:signedIn,card:{id:'p1'}});const rows=m.nodes().filter(n=>n.tagName==='LI' && n.dataset.provider);
    assert.deepEqual(rows.map(r=>r.dataset.provider),['google','discord','x','linkedin_oidc']);
    const google=rows[0];assert.equal(google.dataset.linked,'true');assert.match(google.textContent,/Google.*✓ Vinculado/);assert(!all(google).some(n=>n.tagName==='BUTTON'),'vinculado continua botão');
    const discord=all(rows[1]).find(n=>n.tagName==='BUTTON');assert.equal(discord?.getAttribute('aria-label'),'Vincular Discord');await discord.onclick();assert(m.calls.some(c=>c.body?.action==='link' && c.body.provider==='discord'),'Vincular não chama o link');
    const off=await modal({auth:signedIn,card:{id:'p1'},linking:false});assert(!off.nodes().some(n=>n.tagName==='BUTTON' && /Vincular/.test(n.textContent)),'vinculação desligada ainda oferece botão');
    for(const r of rows)assert(all(r).some(n=>/svg/.test(n.innerHTML)),'ícone oficial ausente em '+r.dataset.provider);
  }],
  ['atalho do cabeçalho aponta para a rota canônica sem evento paralelo',async()=>{
    const view=await header({id:'p1',handle:'rubenmarcus',url:'/u/rubenmarcus'});
    assert.equal(view.href,'/u/rubenmarcus');
    assert.equal(view.hidden,false);
    assert.equal(view.onclick??null,null,'atalho intercepta o link e reinicia a comunidade');
  }],
  ['preferências recolhidas e depois dos logins',async()=>{
    const m=await modal({auth:signedIn,card:{id:'p1'}});const fold=m.nodes().find(n=>n.tagName==='DETAILS' && /account-fold/.test(n.className));
    assert(fold,'newsletter e cookies não estão recolhidos');assert.equal(fold.open,false,'preferências abertas por padrão');assert.match(fold.children[0].textContent,/Newsletter e cookies/);
    const order=m.body.children.map(c=>typeof c==='object'?c.className:'');assert(order.findIndex(c=>/account-integrations/.test(c))<order.findIndex(c=>/account-fold/.test(c)),'preferências antes dos logins');
    assert(!primaries(all(fold)).length,'cancelar inscrição voltou a ser botão chapado');
  }],
  ['visitante: botões com a marca de cada provedor e título de convite',async()=>{
    const m=await modal({auth:{authenticated:false}});assert.equal(m.h2.textContent,'CHEGA JUNTO.');
    const buttons=m.nodes().filter(n=>n.tagName==='BUTTON' && n.dataset.provider);assert.deepEqual(buttons.map(b=>b.dataset.provider),['google','discord','x','linkedin_oidc']);
    for(const b of buttons){assert.match(b.textContent,/^Continuar com (Google|Discord|X|LinkedIn)$/);assert(all(b).some(n=>/<svg/.test(n.innerHTML)),'sem ícone oficial: '+b.dataset.provider);}
    const rule=p=>new RegExp(`\\.account-provider\\[data-provider=${p}\\]\\{[^}]*`).exec(css)?.[0]||'';
    assert.match(rule('google'),/background:#fff/i,'Google sem botão branco');assert.match(rule('google'),/color:#1f1f1f/i);
    assert.match(rule('discord'),/#5865f2/i,'Discord sem blurple');assert.match(rule('linkedin_oidc'),/#0a66c2/i,'LinkedIn sem azul oficial');
    assert.match(css,/\.account-provider:is\(\[data-provider=x\],\[data-provider=twitter\]\)\{background:#000/,'X sem preto oficial');
  }],
  ['sair e voltar ao convite devolve o título de convite no mesmo modal',async()=>{
    const m=await modal({auth:signedIn,card:{id:'p1',handle:'rubenmarcus'}});assert.equal(m.h2.textContent,'Olá, @rubenmarcus');
    await m.remount({authenticated:false});assert.equal(m.h2.textContent,'CHEGA JUNTO.','título preso na saudação depois de sair');assert.equal(m.small.textContent,'A PORTA DA RESENHA');
  }],
];
let passed=0;
for(const [name,run] of tests){try{await run();passed++;console.log('PASS '+name);}catch(e){console.log('RED '+name+': '+e.message.split('\n')[0]);}}
console.log(`account modal: ${passed}/${tests.length}; mutante=${mutant||'nenhum'}`);
if(passed!==tests.length)process.exitCode=1;
