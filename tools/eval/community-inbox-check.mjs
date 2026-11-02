// Central solicitada em 13/10/2026: progresso só por perfil/conquista/amigo/identidade persistidos.
// Executa questList e community.js reais. DOM em Node não aprova aparência; captura fica com o operador.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const helperPath=new URL('public/js/community-inbox.js',root);
const mutant=process.argv.find(arg=>arg.startsWith('--mutant='))?.slice(9);
const ids=['profile','first_kill','first_win','first_friend','social_link'];
const supported=['google','discord','twitter','linkedin_oidc'];
let helperSource=existsSync(helperPath)?readFileSync(helperPath,'utf8'):null;
let communitySource=read('public/js/community.js');
const mutation=(source,before,after)=>{
  assert.equal(source.split(before).length-1,1,'MUTANTE NÃO APLICOU: trecho ausente ou repetido');
  const changed=source.replace(before,after);
  assert.notEqual(changed,source,'MUTANTE NÃO APLICOU');
  return changed;
};
const helperMutants={
  'forged-achievement':"if(state?.profile) state.profile.achievements=[{key:'first_kill'},{key:'first_win'}];",
  'pending-friend':"if(state?.friends) state.friends=state.friends.map(friend=>({...friend,state:'accepted'}));",
  'social-url-proof':"if(state?.profile?.socials?.length) auth={...auth,identities:['google']};",
  'anonymous-proof':"auth={authenticated:true,profile:state?.profile,identities:['google']};",
};
if(mutant && helperMutants[mutant]){
  assert(helperSource,'MUTANTE NÃO APLICOU: helper ausente');
  helperSource=mutation(helperSource,'export function questList({auth,state}) {',`export function questList({auth,state}) {\n${helperMutants[mutant]}`);
}else if(mutant==='unsafe-text'){
  communitySource=mutation(communitySource,'n.textContent=text;','n.innerHTML=text;');
}else if(mutant==='dead-actions'){
  communitySource=mutation(communitySource,'try{await fn();','try{await Promise.resolve();');
}else if(mutant==='missing-renderer'){
  communitySource=mutation(communitySource,'function showQuests()', 'function discardedQuests()');
}else if(mutant==='missing-import'){
  const line=communitySource.split('\n').find(line=>/^import/.test(line) && line.includes('community-inbox.js'));
  assert(line,'MUTANTE NÃO APLICOU: import ausente');communitySource=mutation(communitySource,line,'');
}else if(mutant==='retry-new-key'){
  communitySource=mutation(communitySource,'messageClientId ||= crypto.randomUUID();','messageClientId=crypto.randomUUID();');
}else if(mutant==='account-keeps-draft'){
  communitySource=mutation(communitySource,'if(changed){clearConversation();','if(changed){');
}else if(mutant==='account-keeps-dom'){
  communitySource=mutation(communitySource,'loadVersion++;content.replaceChildren();','loadVersion++;');
}else if(mutant==='stale-conversation-response'){
  communitySource=mutation(communitySource,'if(version!==loadVersion || owner!==auth?.profile?.id)return;','');
}else if(mutant==='typing-during-send'){
  communitySource=mutation(communitySource,'text.disabled=true;','');
}else if(mutant==='failure-keeps-disabled'){
  communitySource=mutation(communitySource,'if(pendingSend===attempt){pendingSend=null;if(owner===auth?.profile?.id && conversation?.id===peer.id)await render();}','if(pendingSend===attempt){if(owner===auth?.profile?.id && conversation?.id===peer.id)await render();}');
}else if(mutant==='rerender-keeps-input-enabled'){
  communitySource=mutation(communitySource,'text.disabled=Boolean(pendingSend);','text.disabled=false;');
}else if(mutant==='stale401-clears-current-account'){
  communitySource=mutation(communitySource,"data.error==='session_expired' && requestAuth===auth","data.error==='session_expired'");
}else if(mutant==='feature-off-entry'){
  // Duas portas de entrada da DM: o perfil (ternário com o chip de "em preparação") e a lista de amigos.
  const perfil="state?.messages_enabled?button('MANDAR MENSAGEM'",lista="if(state?.messages_enabled)buttons.append(button('MANDAR MENSAGEM'";
  assert.equal(communitySource.split(perfil).length-1,1,'MUTANTE NÃO APLICOU: entrada do perfil ausente');
  assert.equal(communitySource.split(lista).length-1,1,'MUTANTE NÃO APLICOU: entrada da lista de amigos ausente');
  communitySource=communitySource.replace(perfil,"true?button('MANDAR MENSAGEM'").replace(lista,"if(true)buttons.append(button('MANDAR MENSAGEM'");
}else if(mutant==='portao-mudo'){
  communitySource=mutation(communitySource,":chip('MENSAGENS EM PREPARAÇÃO')",":el('span','')");
}else if(mutant==='refresh-engole-render'){
  communitySource=mutation(communitySource,'try{await refresh();}catch{}await render();\n      }finally','await refresh();await render();\n      }finally');
}else if(mutant==='read-all-rows'){
  communitySource=mutation(communitySource,'ids:unread','ids:data.messages.map(m=>m.id)');
}else if(mutant==='ignore-message-badge'){
  communitySource=mutation(communitySource,'(state?.inbox?.unread_count || 0)','0');
}else if(mutant)assert.fail('Mutante desconhecido: '+mutant);
if(mutant)console.log('Mutação aplicada: '+mutant);

const tests=[];
const test=(name,run)=>tests.push({name,run});
let questList;
test('helper executável obrigatório',async()=>{
  assert(helperSource,'public/js/community-inbox.js ausente: a central ainda não deriva missões verificáveis');
  ({questList}=await import(`data:text/javascript,${encodeURIComponent(helperSource)}`));
  assert.equal(typeof questList,'function','questList não exportada');
  assert(/^import\s*\{[^}]*\bquestList\b[^}]*\}\s*from\s*['"]\.\/community-inbox\.js['"]/m.test(communitySource),'Community não importa o helper que executa no navegador');
});
const account={authenticated:true,profile:{id:'11111111-1111-4111-8111-111111111111',nick:'Jogador'},identities:[]};
const stateBase={profile:{...account.profile,handle:null,bio:'',avatar_url:null,achievements:[],socials:[],settings:{profile:'public',presence:'friends',activity:'friends'},history:[],favorites:[]},friends:[],notifications:[],invites:[],blocks:[],feed:[]};
const copy=value=>JSON.parse(JSON.stringify(value));
const missions=(auth=account,state=stateBase)=>{
  assert(questList,'Não foi possível medir: helper ausente');
  const list=questList({auth:copy(auth),state:copy(state)});
  assert(Array.isArray(list),'questList deve devolver uma lista');
  return list;
};
const mission=(id,auth=account,state=stateBase)=>{
  const row=missions(auth,state).find(row=>row.id===id);
  assert(row,'Missão obrigatória ausente: '+id);
  assert.equal(typeof row.complete,'boolean','Conclusão ambígua: '+id);
  return row;
};
test('cinco missões honestas com ação útil',()=>{
  const list=missions();assert.deepEqual(list.map(row=>row.id).sort(),ids.slice().sort());
  for(const row of list){assert.equal(row.complete,false,row.id+' concluída sem prova');assert(row.title?.trim(),'Título ausente: '+row.id);assert(row.detail?.trim(),'Explicação ausente: '+row.id);assert(['settings','friends','play'].includes(row.action),'Ação sem destino: '+row.id);}
  assert.equal(mission('profile').action,'settings');assert.equal(mission('first_friend').action,'friends');assert.equal(mission('first_kill').action,'play');assert.equal(mission('first_win').action,'play');assert.equal(mission('social_link').action,'settings');
  assert(!/\b(follow|seguir|moedas|treta\$|recompensa)\b/i.test(JSON.stringify(list)),'Missões não podem inventar verificação de seguidores ou prêmio');
});
test('perfil: ID persistido basta; bio e foto continuam opcionais',()=>{
  assert.equal(mission('profile',account,{...stateBase,profile:{...stateBase.profile,handle:'jogador'}}).complete,true);
  assert.equal(mission('profile',account,{...stateBase,profile:{...stateBase.profile,bio:'Bio',avatar_url:'/foto.png'}}).complete,false);
});
test('abate e vitória: somente as respectivas conquistas do servidor',()=>{
  const legacy={...stateBase,profile:{...stateBase.profile,kills:99999,wins:99999,matches:99999,points:99999}};
  for(const id of ['first_kill','first_win'])assert.equal(mission(id,account,legacy).complete,false,'Histórico não prova '+id);
  for(const id of ['first_kill','first_win']){
    const own={...stateBase,profile:{...stateBase.profile,achievements:[{key:id,at:'2026-10-13T10:00:00Z'}]}};
    assert.equal(mission(id,account,own).complete,true,'Conquista persistida ignorada: '+id);
    assert.equal(mission(id==='first_kill'?'first_win':'first_kill',account,own).complete,false,'Conquistas confundidas');
  }
});
test('amizade: pedidos, bloqueios e recusas não contam',()=>{
  for(const state of ['pending','requested','blocked','declined'])assert.equal(mission('first_friend',account,{...stateBase,friends:[{id:'friend',state,direction:'incoming'}]}).complete,false,'Pedido não aceito contou: '+state);
  assert.equal(mission('first_friend',account,{...stateBase,friends:[{id:'friend',state:'accepted'}]}).complete,true);
});
test('rede vinculada: identidade autenticada, nunca URL pública',()=>{
  for(const provider of supported)assert.equal(mission('social_link',{...account,identities:[provider]}).complete,true,'Identidade suportada ignorada: '+provider);
  for(const provider of ['github','email','unknown'])assert.equal(mission('social_link',{...account,identities:[provider]}).complete,false,'Identidade fora do contrato: '+provider);
  assert.equal(mission('social_link',account,{...stateBase,profile:{...stateBase.profile,socials:[{net:'google',url:'https://google.com/jogador'}]}}).complete,false,'URL pública apresentada como vínculo');
});
test('sessão incompleta ou perfil de outra conta não ganha conclusão',()=>{
  const all={...stateBase,profile:{...stateBase.profile,handle:'jogador',achievements:[{key:'first_kill'},{key:'first_win'}]},friends:[{id:'friend',state:'accepted'}]};
  for(const [auth,state] of [[null,all],[{authenticated:false,profile:account.profile},all],[{authenticated:true},all],[account,null],[account,{...all,profile:{...all.profile,id:'other-player'}}]]){
    const list=missions(auth,state);assert(list.every(row=>row.complete===false),'Estado não autenticado/indisponível completou missão');
  }
});
test('derivação não altera dados de conta ou servidor',()=>{
  assert(questList,'Não foi possível medir: helper ausente');
  const auth=copy(account),state=copy(stateBase),before=JSON.stringify({auth,state});questList({auth,state});assert.equal(JSON.stringify({auth,state}),before,'questList alterou a fonte de verdade');
});

class Element {
  constructor(tag){this.tagName=tag;this.children=[];this._text='';this.dataset={};this.attributes={};this.listeners={};this.disabled=false;}
  set textContent(value){this._text=String(value??'');this.children=[];}
  get textContent(){return this._text+this.children.map(child=>child.textContent||'').join(' ');}
  set innerHTML(value){assert.fail('HTML inseguro entregue ao DOM: '+String(value).slice(0,70));}
  setAttribute(key,value){this.attributes[key]=String(value);}
  append(...nodes){this.children.push(...nodes);}
  appendChild(node){this.append(node);return node;}
  replaceChildren(...nodes){this._text='';this.children=nodes;}
  addEventListener(name,listener){(this.listeners[name]??=[]).push(listener);}
  async click(){if(!this.disabled)await this.onclick?.();}
  reportValidity(){return true;}
  closest(){return null;}
  querySelector(selector){return tree(this).find(node=>node.tagName.toLowerCase()===selector.toLowerCase())||null;}
  get childElementCount(){return this.children.length;}
}
const tree=node=>[node,...(node.children||[]).flatMap(tree)];
async function runtime({auth=account,state=stateBase,tab='notifications',peer=null,messages=[],inboxData={conversations:[],unread_count:0},failSend=0}={}){
  assert(questList,'Não foi possível medir: helper ausente');
  const dom=Object.fromEntries(['community','social-status','social-account','social-content','social-unread','hub-social-unread','social-hello'].map(id=>[id,new Element('div')]));
  dom.community.dataset={tab,profile:tab==='profile'?peer?.id||'':''};
  const nav=[...read('src/components/Community.astro').matchAll(/<button\b[^>]*data-tab="([^"]+)"[^>]*>([^<]*)/g)].map(match=>Object.assign(new Element('button'),{dataset:{tab:match[1]},textContent:match[2]}));
  const calls=[],navigation=[],events={};
  const gameTab=new Element('button');gameTab.onclick=()=>navigation.push('play');
  let liveState=copy(state);
  let liveMessages=copy(messages),liveInbox=copy(inboxData),sendFailures=failSend,estadoQuebrado=false;
  const document={getElementById:id=>dom[id] || null,createElement:tag=>new Element(tag),createTextNode:text=>({textContent:String(text)}),querySelectorAll:selector=>selector==='.social-tabs button'?nav:[],querySelector:selector=>selector.includes('jogar')?gameTab:null,addEventListener:(name,fn)=>events[name]=fn,dispatchEvent:event=>{(events[event?.type]||(()=>{}))(event);return true;},hidden:false};
// `cs-social-live` (lista de amigos em partida) entrou depois desta régua: sem CustomEvent e sem
// document.dispatchEvent no contexto, `refresh()` morria no meio e levava junto contador e render.
class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
  const ctx=vm.createContext({document,questList,console,CustomEvent,URL,URLSearchParams,Date,crypto:{randomUUID},AbortSignal:{timeout:()=>null},setInterval:()=>1,location:{origin:'https://fixture.test',href:'https://fixture.test/?social='+tab,search:'?social='+tab,assign:url=>navigation.push(String(url))},navigator:{clipboard:{writeText:async()=>{}}},fetch:async(path,options={})=>{
    const body=options.body?JSON.parse(options.body):null;calls.push({path,body});
    const parsed=new URL(path,'https://fixture.test');
    const action=body?.action||parsed.searchParams.get('action');let data=liveState;
    if(estadoQuebrado && !action)throw new Error('Fixture state offline');
    if(action==='profile')data={profile:peer&&parsed.searchParams.get('id')===peer.id?peer:liveState.profile};
    else if(action==='inbox')data=liveInbox;
    else if(action==='conversation')data={messages:copy(liveMessages),peer:copy(peer),has_more:false,next_before:null};
    else if(action==='message_send'){
      if(sendFailures>0){sendFailures--;throw new Error('Fixture offline');}
      const message={id:randomUUID(),sender_id:auth.profile.id,recipient_id:body.target,body:body.body,client_id:body.client_id,created_at:'2026-10-13T10:05:00Z',read_at:null};liveMessages.push(message);data={message};
    }else if(action==='message_read'){
      let read_count=0;for(const message of liveMessages)if(body.ids.includes(message.id)&&!message.read_at){message.read_at='2026-10-13T10:05:00Z';read_count++;}data={read_count};
    }
    return {ok:true,json:async()=>copy(data)};
  },mountAccountEntry:container=>container.append(Object.assign(new Element('p'),{textContent:'ENTRAR NA CONTA'})),mountAccountIntegrations:container=>container.append(Object.assign(new Element('p'),{textContent:'LOGINS VINCULADOS'})),mountProfilePreferences:async()=>{},loadAccount:async()=>copy(auth),loadAuthOptions:async()=>({providers:supported,linking:true}),acceptAccount(){},logoutAccount:async()=>{},rankingTable:()=>new Element('table')});
  vm.runInContext(read('public/js/profile-character-catalog.js').replace(/export\s+/g,''),ctx,{timeout:1000});
  vm.runInContext(read('public/js/profile-character.js').replace(/^import .*\n/gm,'').replace(/export\s+/g,''),ctx,{timeout:1000});
  vm.runInContext(read('public/js/account-verified.js').replace(/export\s+/g,''),ctx,{timeout:1000});
  vm.runInContext('(function(){'+read('public/js/career-rank.js').replace(/export\s+/g,'')+';Object.assign(globalThis,{careerRankBadge,careerRankTitle});})()',ctx,{timeout:1000});
  let source=communitySource.replace(/^import[^\n]*\n/gm,'');
  source=mutation(source,'  void boot();',`  globalThis.__inboxTest={boot,render,setFixture(a,s,t){auth=a;state=s;tab=t;},getTab(){return tab;}};`);
  vm.runInContext(source,ctx,{timeout:1000});
  assert(ctx.__inboxTest,'Community não inicializou: fixture ou estrutura incompatível');
  await ctx.__inboxTest.boot();
  for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
  return {ctx,dom,nav,calls,navigation,events,document,setState:state=>liveState=copy(state),setInbox:value=>liveInbox=copy(value),quebrarEstado:v=>{estadoQuebrado=v;},nodes:()=>tree(dom['social-content'])};
}
const matches=(nodes,pattern)=>nodes.filter(node=>['button','a'].includes(node.tagName) && pattern.test(node.textContent));
test('central renderiza missões reais ao abrir avisos',async()=>{
  const ui=await runtime();const nodes=ui.nodes();
  assert(nodes.some(node=>/MISS[ÕO]ES/i.test(node.textContent)),'A central de avisos não oferece missões');
  const titles=missions().map(row=>row.title);
  assert(titles.every(title=>nodes.some(node=>node.textContent.includes(title))),'Missões derivadas não chegaram à UI');
});
test('ações de missão chegam a perfil, amigos e jogo',async()=>{
  for(const [id,destination] of [['profile','settings'],['first_friend','friends'],['first_kill','play']]){
    const ui=await runtime();const row=mission(id);
    const card=ui.nodes().find(node=>node.tagName==='section' && tree(node).some(child=>child.tagName==='h2' && child.textContent===row.title || child.tagName==='h3' && child.textContent===row.title));
    assert(card,'Cartão de missão ausente: '+id);
    const action=tree(card).find(node=>['button','a'].includes(node.tagName) && !node.disabled);
    assert(action,'Missão pendente sem ação habilitada: '+id);
    await action.click();for(let i=0;i<3;i++)await new Promise(resolve=>setImmediate(resolve));
    if(destination==='play')assert(ui.navigation.some(value=>value==='play' || /^\/(?:\?|$)/.test(value)),'A missão não abre o jogo');
    else assert.equal(ui.ctx.__inboxTest.getTab(),destination,'A missão abre a aba errada: '+id);
  }
});
test('avisos mantêm prova, texto seguro e leitura do servidor',async()=>{
  const unsafe='<img src=x onerror=alert(1)>',state={...copy(stateBase),notifications:[{id:'notice',kind:'friend_request',nick:unsafe,actor_id:'22222222-2222-4222-8222-222222222222',created_at:'2026-10-13T10:00:00Z',read_at:null}]};
  const ui=await runtime({state});
  const noticeTab=matches(ui.nodes(),/^AVISOS$/i)[0];if(noticeTab){await noticeTab.click();for(let i=0;i<3;i++)await new Promise(resolve=>setImmediate(resolve));}
  assert(ui.nodes().some(node=>node.textContent.includes(unsafe)),'Nickname literal ausente dos avisos');
  assert(!ui.nodes().some(node=>node.tagName==='img' && node.src==='x'),'Nickname virou HTML');
  assert.equal(domText(ui.dom['social-unread']),'1','Contagem não usa avisos não lidos');
  const readButton=matches(ui.nodes(),/MARCAR COMO LIDOS/i)[0];assert(readButton,'Ação de leitura ausente');await readButton.click();
  assert(ui.calls.some(call=>call.body?.action==='read_notifications'),'Leitura não persistida via API existente');
  // O link do aviso é a rota viva do perfil (/u/<id>); o sufixo com nick é a forma antiga, e a
  // régua cobrava a antiga. O que importa é o aviso levar ao perfil de quem o gerou.
  const profile=ui.nodes().find(node=>node.tagName==='a' && node.href==='/u/22222222-2222-4222-8222-222222222222');assert(profile,'Aviso não oferece perfil do remetente');
});
function domText(node){return node.textContent;}
test('convidado recebe entrada de conta, sem progresso fictício',async()=>{
  const ui=await runtime({auth:null,state:null});
  assert(!ui.nodes().some(node=>/conclu[ií]d[ao]|desbloquead[ao]/i.test(node.textContent)),'Convidado recebeu conclusão sem conta');
  assert(/entr[ae]|conta|login/i.test(ui.dom['social-content'].textContent+' '+ui.dom['social-account'].textContent),'Convidado ficou sem caminho para autenticação');
});

const peerId='22222222-2222-4222-8222-222222222222';
const peer={...copy(stateBase.profile),id:peerId,nick:'Amigo <b>literal</b>',url:'/u/amigo',relationship:'friend',level:1,next_level_points:100};
const messageState={...copy(stateBase),messages_enabled:true,friends:[{id:peerId,nick:peer.nick,state:'accepted',profile:peer}]};
const incoming={id:'33333333-3333-4333-8333-333333333333',sender_id:peerId,recipient_id:account.profile.id,body:'<img src=x onerror=alert(1)>',client_id:'44444444-4444-4444-8444-444444444444',created_at:'2026-10-13T10:00:00Z',read_at:null};
const outgoing={...incoming,id:'55555555-5555-4555-8555-555555555555',sender_id:account.profile.id,recipient_id:peerId,body:'Minha mensagem'};
async function openPeer(ui){const action=matches(ui.nodes(),/^MANDAR MENSAGEM$/)[0];assert(action,'Botão de mensagem para amigo ausente');await action.click();assert(ui.calls.some(call=>new URL(call.path,'https://fixture.test').searchParams.get('target')===peerId),'Botão abriu outra identidade');}
const settle=async()=>{for(let index=0;index<5;index++)await new Promise(resolve=>setImmediate(resolve));};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function holdRequests(ui,match,response=null){
  const gate=deferred(),original=ui.ctx.fetch,observed=[];let entered=0;
  ui.ctx.fetch=async(path,options={})=>{if(match(path,options)){entered++;observed.push({path,body:options.body?JSON.parse(options.body):null});await gate.promise;if(response)return response;}return original(path,options);};
  return {...gate,observed,entered:()=>entered,restore:()=>ui.ctx.fetch=original};
}
const nextAccount={authenticated:true,profile:{id:'66666666-6666-4666-8666-666666666666',nick:'Outra conta'},identities:[]};
function prepareNextAccount(ui){ui.setState({...copy(stateBase),profile:{...copy(stateBase.profile),...nextAccount.profile},messages_enabled:true});ui.setInbox({conversations:[],unread_count:0});}
function assertNoPreviousPrivateDom(ui){
  assert(!ui.dom['social-content'].textContent.includes('SEGREDO DA CONTA ANTERIOR'),'Corpo privado permanece no DOM depois da troca');
  assert(!ui.nodes().some(node=>node.tagName==='textarea'&&node.value==='RASCUNHO DA CONTA ANTERIOR'),'Rascunho privado permanece no DOM depois da troca');
  assert(!ui.nodes().some(node=>node.textContent===peer.nick),'Nome da conversa anterior permanece no DOM');
}
test('perfil e cartão de amigo abrem a conversa da identidade escolhida',async()=>{
  for(const tab of ['profile','friends']){
    const ui=await runtime({state:messageState,tab,peer,messages:[incoming,outgoing]});await openPeer(ui);
    assert.equal(ui.ctx.__inboxTest.getTab(),'notifications');assert(matches(ui.nodes(),/^ENVIAR MENSAGEM$/).length,'Conversa não chegou ao formulário de envio');
  }
  /* A DM deixou de exigir amizade (dono, 28/10/2026): pedido pendente, recebido ou nenhum
     vínculo continuam abrindo a conversa. Quem barra agora é o servidor (perfil fechado,
     bloqueio, teto de primeiro contato), e a recusa chega como texto na tela. */
  for(const relation of ['none','incoming','outgoing']){
    const ui=await runtime({state:messageState,tab:'profile',peer:{...peer,relationship:relation}});assert.equal(matches(ui.nodes(),/^MANDAR MENSAGEM$/).length,1,'Perfil sem amizade perdeu a entrada de DM: '+relation);
  }
});
test('corpo e nome do remetente são texto literal; leitura envia apenas IDs recebidos vistos',async()=>{
  const ui=await runtime({state:messageState,tab:'friends',peer,messages:[incoming,outgoing]});await openPeer(ui);
  assert(ui.nodes().some(node=>node.textContent===incoming.body),'Mensagem recebida não é texto literal');assert(ui.nodes().some(node=>node.textContent===peer.nick),'Nome do remetente não é texto literal');
  const read=matches(ui.nodes(),/^MARCAR ESTAS MENSAGENS COMO LIDAS$/)[0];assert(read,'Ação de leitura das mensagens exibidas ausente');await read.click();
  const request=ui.calls.find(call=>call.body?.action==='message_read');assert(request,'Leitura não chamou API');assert.equal(request.body.target,peerId);assert.deepEqual(request.body.ids,[incoming.id],'Leitura incluiu mensagem enviada ou não exibida');assert(!Object.hasOwn(request.body,'through'),'Cursor antigo de leitura ainda usado');
});
/* Relato de 28/10/2026: a mensagem sai, o servidor confirma, e a tela continua com o rascunho —
   bastava o `refresh` seguinte falhar (estado fora do ar) para o render nunca acontecer. */
test('estado fora do ar depois do envio não segura a tela no rascunho',async()=>{
  const ui=await runtime({state:messageState,tab:'friends',peer,messages:[incoming]});await openPeer(ui);
  const text=ui.nodes().find(node=>node.tagName==='textarea'),send=matches(ui.nodes(),/^ENVIAR MENSAGEM$/)[0];
  text.value='Mensagem que o servidor aceitou';text.oninput();
  ui.quebrarEstado(true);
  await send.click();
  ui.quebrarEstado(false);
  const enviados=ui.calls.filter(call=>call.body?.action==='message_send');
  assert.equal(enviados.length,1,'o envio tem de ter saído uma vez');
  const atual=ui.nodes().find(node=>node.tagName==='textarea');
  assert.equal(atual?.value,'','refresh quebrado segurou o rascunho enviado na tela');
  assert.equal(atual?.disabled,false,'campo ficou bloqueado depois do envio confirmado');
});
test('falha de envio preserva rascunho e a mesma chave no retry',async()=>{
  const ui=await runtime({state:messageState,tab:'friends',peer,messages:[incoming],failSend:1});await openPeer(ui);
  const text=ui.nodes().find(node=>node.tagName==='textarea'),send=matches(ui.nodes(),/^ENVIAR MENSAGEM$/)[0];text.value='Rascunho com acento e <texto>';text.oninput();await send.click();
  const retryText=ui.nodes().find(node=>node.tagName==='textarea'),retrySend=matches(ui.nodes(),/^ENVIAR MENSAGEM$/)[0];assert.equal(retryText?.value,'Rascunho com acento e <texto>','Falha apagou rascunho');assert.equal(retrySend?.disabled,false,'Falha bloqueou retry');await retrySend.click();
  const attempts=ui.calls.filter(call=>call.body?.action==='message_send');assert.equal(attempts.length,2);assert.equal(attempts[0].body.client_id,attempts[1].body.client_id,'Retry trocou chave idempotente');assert.equal(attempts[1].body.body,text.value);assert.equal(attempts[1].body.target,peerId);assert(attempts.every(call=>!Object.hasOwn(call.body,'actor')&&!Object.hasOwn(call.body,'sender_id')),'Browser envia identidade forjada');
  assert.equal(ui.nodes().find(node=>node.tagName==='textarea')?.value,'','Envio confirmado não limpou rascunho');
});
test('troca de conta limpa conversa e rascunho antes da próxima tela',async()=>{
  const ui=await runtime({state:messageState,tab:'friends',peer,messages:[incoming]});await openPeer(ui);
  const text=ui.nodes().find(node=>node.tagName==='textarea');text.value='Privado da conta anterior';text.oninput();
  const next={authenticated:true,profile:{id:'66666666-6666-4666-8666-666666666666',nick:'Outra conta'},identities:[]};ui.setState({...copy(stateBase),profile:{...copy(stateBase.profile),...next.profile},messages_enabled:true});ui.setInbox({conversations:[],unread_count:0});
  const before=ui.calls.length;ui.events['cs-account-change']({detail:next});await settle();
  assert(!ui.nodes().some(node=>node.tagName==='textarea'&&node.value==='Privado da conta anterior'),'Rascunho vazou entre contas');assert(!ui.nodes().some(node=>node.textContent===peer.nick),'Conversa anterior sobreviveu à troca de conta');assert(!ui.calls.slice(before).some(call=>new URL(call.path,'https://fixture.test').searchParams.get('action')==='conversation'),'Conta nova consultou conversa anterior');
});
test('troca de conta remove imediatamente o DOM privado mesmo se refresh falhar',async()=>{
  const ui=await runtime({state:messageState,tab:'friends',peer,messages:[{...incoming,body:'SEGREDO DA CONTA ANTERIOR'}],inboxData:{conversations:[],unread_count:7}});await openPeer(ui);
  const text=ui.nodes().find(node=>node.tagName==='textarea');text.value='RASCUNHO DA CONTA ANTERIOR';text.oninput();assert(ui.dom['social-content'].textContent.includes('SEGREDO DA CONTA ANTERIOR'),'Fixture privada não foi renderizada');
  prepareNextAccount(ui);const held=holdRequests(ui,(path,options)=>path==='/api/social'&&!options.body);
  try{
    ui.events['cs-account-change']({detail:nextAccount});assert.equal(held.entered(),1,'Refresh não está realmente pendente');
    assertNoPreviousPrivateDom(ui);for(const id of ['social-unread','hub-social-unread'])assert.equal(ui.dom[id].textContent,'','Badge da conta anterior permaneceu antes da rede responder');
    assert(ui.dom['social-hello'].textContent.includes(nextAccount.profile.nick),'Identidade visual não mudou imediatamente');
    held.reject(new Error('Fixture refresh offline'));await settle();assertNoPreviousPrivateDom(ui);
  }finally{held.resolve();held.restore();await settle();}
});
test('resposta antiga de conversa não volta ao DOM depois da troca de conta',async()=>{
  const ui=await runtime({state:messageState,tab:'friends',peer,messages:[{...incoming,body:'SEGREDO DA CONTA ANTERIOR'}]});await openPeer(ui);
  const held=holdRequests(ui,path=>new URL(path,'https://fixture.test').searchParams.get('action')==='conversation');
  const oldRender=ui.ctx.__inboxTest.render();assert.equal(held.entered(),1,'Conversa antiga não ficou em voo');
  try{
    prepareNextAccount(ui);ui.events['cs-account-change']({detail:nextAccount});await settle();assertNoPreviousPrivateDom(ui);
    held.resolve();await oldRender;await settle();assertNoPreviousPrivateDom(ui);
  }finally{held.resolve();held.restore();await oldRender;}
});
test('401 de requisição da conta anterior não revoga a conta atual',async()=>{
  const ui=await runtime({state:messageState,tab:'friends',peer,messages:[incoming]});await openPeer(ui);
  const held=holdRequests(ui,path=>new URL(path,'https://fixture.test').searchParams.get('action')==='conversation',{ok:false,json:async()=>({error:'session_expired'})}),oldRender=ui.ctx.__inboxTest.render();assert.equal(held.entered(),1,'Requisição antiga não está em voo');
  try{
    prepareNextAccount(ui);ui.events['cs-account-change']({detail:nextAccount});await settle();assert(ui.dom['social-hello'].textContent.includes(nextAccount.profile.nick),'Conta atual não entrou antes do 401 antigo');
    held.resolve();await oldRender;await settle();assert(ui.dom['social-hello'].textContent.includes(nextAccount.profile.nick),'401 antigo revogou a conta atual');assert(!ui.dom['social-account'].textContent.includes('ENTRAR NA CONTA'),'401 antigo substituiu sessão atual por login');
  }finally{held.resolve();held.restore();await oldRender;}
});
test('campo fica bloqueado durante envio e falha reativa o mesmo rascunho e retry',async()=>{
  const ui=await runtime({state:messageState,tab:'friends',peer,messages:[incoming]});await openPeer(ui);
  const text=ui.nodes().find(node=>node.tagName==='textarea'),send=matches(ui.nodes(),/^ENVIAR MENSAGEM$/)[0];text.value='Rascunho pendente';text.oninput();
  const held=holdRequests(ui,(_path,options)=>options.body&&JSON.parse(options.body).action==='message_send'),inFlight=send.click();
  try{
    assert.equal(held.entered(),1,'Envio não ficou realmente pendente');assert.equal(text.disabled,true,'Campo permite digitar rascunho durante envio');assert.equal(send.disabled,true,'Botão permite envio simultâneo');
    held.reject(new Error('Fixture send offline'));await inFlight;const retryText=ui.nodes().find(node=>node.tagName==='textarea'),retrySend=matches(ui.nodes(),/^ENVIAR MENSAGEM$/)[0];assert.equal(retryText?.disabled,false,'Falha não reativou o campo atual');assert.equal(retrySend?.disabled,false,'Falha não reativou envio atual');assert.equal(retryText?.value,'Rascunho pendente','Falha perdeu rascunho');
    held.restore();await retrySend.click();const request=ui.calls.find(call=>call.body?.action==='message_send');assert(request,'Retry não chegou ao servidor');assert.equal(request.body.client_id,held.observed[0].body.client_id,'Falha em voo trocou a chave idempotente');assert.equal(request.body.body,'Rascunho pendente');assert.equal(ui.nodes().find(node=>node.tagName==='textarea')?.value,'','Sucesso não limpou formulário');
  }finally{held.resolve();held.restore();await inFlight;}
});
test('reabrir mensagens durante envio preserva bloqueio e impede um segundo envio',async()=>{
  const ui=await runtime({state:messageState,tab:'friends',peer,messages:[incoming]});await openPeer(ui);
  const text=ui.nodes().find(node=>node.tagName==='textarea'),send=matches(ui.nodes(),/^ENVIAR MENSAGEM$/)[0];text.value='Envio original pendente';text.oninput();
  const held=holdRequests(ui,(_path,options)=>options.body&&JSON.parse(options.body).action==='message_send'),inFlight=send.click();
  try{
    assert.equal(held.entered(),1);await matches(ui.nodes(),/^MENSAGENS$/)[0].click();
    const currentText=ui.nodes().find(node=>node.tagName==='textarea'),currentSend=matches(ui.nodes(),/^ENVIAR MENSAGEM$/)[0];assert.notEqual(currentText,text,'Fixture não criou um formulário novo');assert.equal(currentText?.disabled,true,'Formulário novo libera digitação durante envio');assert.equal(currentSend?.disabled,true,'Formulário novo permite duplicar envio');assert.equal(currentText?.value,'Envio original pendente');await currentSend.click();assert.equal(held.entered(),1,'Reabertura duplicou pedido de envio');
    held.resolve();await inFlight;assert.equal(ui.nodes().find(node=>node.tagName==='textarea')?.value,'','Resposta confirmada deixou rascunho antigo');assert.equal(ui.calls.filter(call=>call.body?.action==='message_send').length,1,'Um clique criou múltiplos envios');
  }finally{held.resolve();held.restore();await inFlight;}
});
test('contadores somam avisos e mensagens sem marcar conteúdo como lido',async()=>{
  const ui=await runtime({state:{...copy(messageState),notifications:[{id:'notice',kind:'achievement',read_at:null}]},peer,inboxData:{conversations:[],unread_count:3}});
  for(const id of ['social-unread','hub-social-unread'])assert.equal(ui.dom[id].textContent,'4','Contador ignorou mensagens: '+id);
  assert(!ui.calls.some(call=>call.body?.action==='message_read'),'Abrir central marcou mensagens não vistas');
});
test('mensagens desabilitadas explicam indisponibilidade e não consultam conversa',async()=>{
  for(const tab of ['friends','profile']){const ui=await runtime({state:{...copy(messageState),messages_enabled:false},tab,peer});assert.equal(matches(ui.nodes(),/^MANDAR MENSAGEM$/).length,0,'Feature desativada apresentou entrada de DM em '+tab);}
  const ui=await runtime({state:{...copy(messageState),messages_enabled:false},peer});const section=matches(ui.nodes(),/^MENSAGENS$/)[0];assert(section,'Central sem seção de mensagens');await section.click();
  assert(/prepara[çc][ãa]o|configura[çc][ãa]o|indispon[ií]vel/i.test(ui.dom['social-content'].textContent),'Flag desativada apresentou tela vazia');assert(!ui.calls.some(call=>new URL(call.path,'https://fixture.test').searchParams.get('action')==='conversation'),'Flag desativada consultou mensagens');assert.equal(matches(ui.nodes(),/^ENVIAR MENSAGEM$/).length,0);
});
/* "Mandar pra todo cadastrado" (dono, 28/10/2026): a DM deixou de exigir amizade, então o
   botão vale em qualquer perfil. O portão que sobra é a flag do servidor, e ela se explica. */
test('a mensagem vale em qualquer perfil, e a flag desligada se explica',async()=>{
  const desligada=await runtime({state:{...copy(messageState),messages_enabled:false},tab:'profile',peer});
  assert.equal(matches(desligada.nodes(),/^MANDAR MENSAGEM$/).length,0,'Flag desligada manteve o botão');
  assert(desligada.nodes().some(node=>/^MENSAGENS EM PREPARA[ÇC][ÃA]O$/.test(node.textContent.trim())),'Flag desligada não explica no perfil');
  const estranho={...copy(peer),relationship:null};
  const semAmizade=await runtime({state:{...copy(messageState),friends:[],messages_enabled:true},tab:'profile',peer:estranho});
  assert.equal(matches(semAmizade.nodes(),/^MANDAR MENSAGEM$/).length,1,'Perfil de desconhecido ficou sem entrada de DM');
  assert.equal(matches(semAmizade.nodes(),/^ADICIONAR AMIGO$/).length,1,'O pedido de amizade sumiu do perfil de desconhecido');
  const amigo=await runtime({state:copy(messageState),tab:'profile',peer});
  assert.equal(matches(amigo.nodes(),/^MANDAR MENSAGEM$/).length,1,'Perfil de amigo perdeu a entrada de DM');
});

let passed=0;const failed=[];
for(const {name,run} of tests){try{await run();passed++;console.log('PASS '+name);}catch(error){failed.push({clause:name,type:error?.name||'Error',message:String(error?.message||error).split('\n')[0]});console.error('RED '+name+': '+error.message.split('\n')[0]);}}
console.log(`community inbox: ${passed}/${tests.length} contratos; mutante=${mutant||'nenhum'}; DOM Node, aparência não avaliada`);
console.log(JSON.stringify({mutant:mutant||null,cases:tests.length,failed}));
if(passed!==tests.length)process.exitCode=1;
