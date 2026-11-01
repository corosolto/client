import {TRETA_ITEMS_ENABLED} from './treta-features.js';
import {initTretaRewards,updateTretaRewards} from './treta-rewards.js';
import {TRETA_SKINS,TRETA_WEAPON_SKINS,TRETA_GLOVES,TRETA_PACKS,TRETA_COINS,TRETA_DEFAULT_REWARDS,TRETA_COIN_ART,TRETA_EYEWEAR} from './treta-catalog.js';
import {TRETA_ACCESSORY_PROPOSALS} from './treta-proposals.js';
import {loadAccount,socialApi} from './account-entry.js';
import {byId} from './characters.js';
import {estadoDaUrl,urlDoEstado,ABAS_LOJA} from './rotas.js';
import {ligarCompartilhar,linkCompartilhavel} from './compartilhar.js';
import {eyewearFitCount,eyewearProfile,loadEyewearFitData} from './eyewear.js';
import {VERSION} from './version.js';
import { tr, frase } from './i18n.js';
import { assetUrl } from './data/asseturl.js';

const STORE_SKINS=Object.freeze([...TRETA_SKINS,...TRETA_WEAPON_SKINS,...TRETA_GLOVES,...TRETA_PACKS]);

const node=(tag,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
const errors={account_required:'Entre e escolha seu nick para guardar seus T$.',insufficient_balance:'Ainda faltam T$ para esta skin. Ganhe mais jogando e convidando amigos.',skin_unavailable:'Este visual ainda está em produção ou revisão.',request_reused:'Este pedido já foi usado. Atualize a carteira.',skin_not_owned:'Este visual ainda não está no seu armário.',referral_ineligible:'Este convite não é elegível para a recompensa.',rate_limited:'Espere um momento antes de tentar novamente.'};
const errorText=e=>errors[e.message] || 'A carteira está indisponível agora. Tente novamente em instantes.';
const money=value=>`T$ ${new Intl.NumberFormat('pt-BR').format(value)}`;
const stored=(key,value)=>{try{if(value===undefined)return localStorage.getItem(key);localStorage.setItem(key,value);}catch{return null;}};
const storeEvent=(event,itemId='')=>{
  if(!window.__csPrivacy?.allowed())return;
  void socialApi('/api/treta',{action:'analytics',event,itemId}).catch(()=>{});
};
const inviteEvent=async event=>{
  if(!window.__csPrivacy?.allowed())return false;
  try{return (await socialApi('/api/treta',{action:'invite-analytics',event,version:VERSION})).stored===true;}catch{return false;}
};
let lastStoreVisit=0;
const storeVisit=()=>{
  const now=Date.now();
  if(now-lastStoreVisit<1000)return;
  lastStoreVisit=now;storeEvent('visit');
};
let state=null,manifest={skins:{}},eyeManifest={eyewear:{}},selected=null,filter='all',stage=null,purchaseStage=null,refreshPromise=null,account=null;
let onEquip=()=>{},infoStage=null,infoVersion=0;
let equipmentRevision='';
const inventoryWaiters=new Set();
let accountEpoch=0,refreshEpoch=-1,loading=false,refreshFailed=false,purchasePending=false,view='characters',detailVersion=0,previewReady=false,previewLoading=false;
const $=id=>document.getElementById(id);
const owned=id=>state?.inventory?.some(s=>s.skin_id===id);
const equipped=id=>state?.inventory?.some(s=>s.skin_id===id && s.equipped);
const item=id=>state?.catalog?.find(s=>s.id===id);
const product=id=>STORE_SKINS.find(s=>s.id===id) || TRETA_EYEWEAR.find(s=>s.id===id);
const campaignActive=()=>Boolean(state?.campaign?.starts_at && Date.now()>=Date.parse(state.campaign.starts_at) && Date.now()<Date.parse(state.campaign.ends_at));
const asset=id=>eyeManifest.eyewear[id] || manifest.skins[id];
const available=id=>{
  const server=item(id),client=product(id);
  if(!server || !client || server.available!==true)return false;
  if(client.slot==='weapon')return server.slot==='weapon' && server.weapon_id===client.weapon && server.model_path===client.model && client.ready===true;
  if(client.slot==='glove')return server.slot==='glove' && server.weapon_id==null && server.model_path===client.model && client.ready===true;
  if(client.slot==='pack')return server.slot==='pack' && server.weapon_id==null && server.model_path===client.model && client.ready===true;
  const model=asset(id);
  return !!model && model.approved===true && server.model_path===model.model && (server.slot==='eyewear'?Object.keys(model.profiles || {}).some(key=>eyewearProfile(model,{id:key})):model.character===server.character_id);
};
// A vitrine pode mostrar um modelo real ainda em revisão; venda/equipamento
// continuam dependendo do catálogo do servidor e da aprovação no manifesto.
const previewable=id=>{
  const client=product(id);
  if(client?.slot==='weapon' || client?.slot==='glove')return client.ready===true;
  const model=asset(id);
  return Boolean((model?.preview || model?.approved) && /^\/models\/(skins|items)\/[a-z0-9-]+\.glb$/.test(model.model));
};
export function equippedTretaSkin(characterId) {
  const skin=state?.inventory?.find(s=>s.equipped && (item(s.skin_id)?.slot || 'character')==='character' && available(s.skin_id));
  return skin && item(skin.skin_id)?.character_id===characterId?skin.skin_id:null;
}
export function equippedTretaWeaponSkin(weaponId) {
  return state?.inventory?.find(s=>s.equipped && item(s.skin_id)?.slot==='weapon' && item(s.skin_id)?.weapon_id===weaponId && available(s.skin_id))?.skin_id || null;
}
export function equippedTretaGlove() {
  return state?.inventory?.find(s=>s.equipped && item(s.skin_id)?.slot==='glove' && available(s.skin_id))?.skin_id || null;
}
export function equippedTretaPack() {
  return state?.inventory?.find(s=>s.equipped && item(s.skin_id)?.slot==='pack' && available(s.skin_id))?.skin_id || null;
}
export function tretaSkinPresentation(id,characterId) {
  const skin=product(id),model=asset(id);
  if(!available(id) || !owned(id) || skin?.slot!=='character' || skin.character!==characterId || model?.character!==characterId)return null;
  const localPoster=/^\/(img|video)\/skins\/[a-z0-9-]+\.webp$/;
  const video=model.video;
  return {id,name:skin.name || item(id)?.name || id,poster:localPoster.test(model.poster || '')?model.poster:null,
    video:video && [video.webm,video.mp4,video.poster].every(src=>VIDEO_PATH.test(src || ''))?video:null};
}
export function tretaWeaponPresentation(weaponId,skinId) {
  if(!skinId)return null;
  const skin=product(skinId);
  if(skin?.slot==='weapon' && skin.weapon===weaponId && available(skinId) && owned(skinId))return {name:skin.name};
  const pack=product(equippedTretaPack());
  return pack && pack.weaponSkins?.[weaponId]===skinId?{name:pack.name}:null;
}
const portrait=skin=>skin.poster || asset(skin.id)?.poster || (skin.slot==='eyewear'?`/img/items/${skin.id}.webp`:`/img/chars/${skin.character}.webp`);
/* Vídeo curto da skin no card (tools/gen-skin-video.mjs). Nada de vídeo no boot: o
   <video> só nasce no primeiro hover, foco por teclado ou primeiro toque, com preload
   none. Com prefers-reduced-motion o card fica no poster estático. Um vídeo por vez. */
const VIDEO_PATH=/^\/video\/skins\/[a-z0-9-]+\.(webm|mp4|webp)$/;
let lastPointer='mouse',activePreview=null;
document.addEventListener('pointerdown',e=>{lastPointer=e.pointerType || 'mouse';},true);
export function skinPreview(button,id) {
  const v=manifest.skins[id]?.video;
  if(!v || ![v.webm,v.mp4,v.poster].every(src=>VIDEO_PATH.test(src || '')))return {tap:()=>false};
  let video=null,tapped=false;
  const stop=()=>{button.classList.remove('treta-previewing');video?.pause();if(activePreview===stop)activePreview=null;};
  const start=()=>{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return false;
    if(activePreview && activePreview!==stop)activePreview();
    if(!video){
      video=document.createElement('video');video.className='treta-card-video';video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='none';video.poster=v.poster;video.setAttribute('aria-hidden','true');
      for(const [src,type] of [[v.webm,'video/webm; codecs="vp9"'],[v.mp4,'video/mp4']]){const source=document.createElement('source');source.src=src;source.type=type;video.append(source);}
      button.querySelector('img').after(video);
    }
    activePreview=stop;button.classList.add('treta-previewing');video.play().catch(()=>{});return true;
  };
  button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')start();});
  button.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')stop();});
  button.addEventListener('focus',()=>{if(button.matches(':focus-visible'))start();});
  button.addEventListener('blur',stop);
  return {tap:()=>{if(lastPointer!=='touch' || tapped)return false;tapped=true;return start();}};
}
/* Vitrine do menu (treta-vitrine.js): só skin à venda e aprovada, com arte. null com a
   loja fora do ar (TRETA_ENABLED off devolve 503) ou antes do manifesto. */
export function tretaVitrine() {
  if(!state?.catalog || refreshFailed)return null;
  return STORE_SKINS.filter(s=>available(s.id) && portrait(s)).map(s=>({id:s.id,name:s.name,color:s.color,series:s.series,price:item(s.id).price,poster:asset(s.id)?.video?.poster || portrait(s),owned:owned(s.id),equipped:equipped(s.id)}));
}
export function abrirTretaSkin(id) {
  const skin=STORE_SKINS.find(s=>s.id===id);
  if(skin)void detail(skin);
  return Boolean(skin);
}
export async function equiparTretaSkin(id) {
  const skin=STORE_SKINS.find(s=>s.id===id);
  if(!skin || !owned(id) || !available(id))return false;
  return equip(skin);
}
/* Armário do roster (main.js, openHubRoster): skin de personagem possuída vira
   personagem selecionável. Mesma regra do available(), só que paramétrica. */
export function skinsDeArmario(inventory,catalog,manifesto) {
  if(!Array.isArray(inventory) || !Array.isArray(catalog))return [];
  const armario=[];
  for(const server of catalog){
    const posse=inventory.find(p=>p.skin_id===server.id);
    if(!posse || server.available!==true || (server.slot || 'character')!=='character')continue;
    const arte=manifesto?.[server.id];
    if(!arte || arte.approved!==true || arte.model!==server.model_path || arte.character!==server.character_id)continue;
    armario.push({id:server.id,name:server.name,character:server.character_id,poster:arte.poster,equipped:posse.equipped===true});
  }
  return armario.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
export function tretaSkinsDoArmario() {
  return skinsDeArmario(state?.inventory,state?.catalog,manifest.skins);
}
export async function desequiparTretaSkin() {
  const epoch=accountEpoch,owner=state?.accountId;
  const result=await socialApi('/api/treta',{action:'unequip',slot:'character'});
  if(epoch!==accountEpoch || result.accountId!==owner)return false;
  state=result;
  draw();updateBuy();notifyEquipment();
  document.dispatchEvent(new CustomEvent('cs-skin-equipped',{detail:{skinId:null,characterId:null,model:null}}));
  return true;
}
function notifyEquipment() {
  // A skin pode ser removida do inventário antes de seu manifesto chegar.
  for(const resolve of inventoryWaiters)resolve();inventoryWaiters.clear();
  const revision=`${state?.accountId || ''}:${state?.inventory?.filter(s=>s.equipped && available(s.skin_id)).map(s=>s.skin_id).join(',') || ''}`;
  if(revision===equipmentRevision)return;
  equipmentRevision=revision;document.dispatchEvent(new CustomEvent('cs-treta-inventory-change'));
}

function rewards(container) {
  const campaign=state?.campaign || TRETA_DEFAULT_REWARDS;
  container.replaceChildren(...[['email_reward','Conta com email confirmado'],['referral_reward','Amigo que concluiu a partida'],['sp_reward','Partida solo confirmada'],['mp_reward','Partida multiplayer confirmada']].map(([key,label])=>{
    const e=node('div','','treta-reward');e.append(node('b',money(campaign[key])),node('span',label));return e;
  }));
}
function drawQuests() {
  const c=state?.campaign || TRETA_DEFAULT_REWARDS,q=state?.quests || {},invites=state?.invites || {},active=campaignActive();
  const linked=invites.linked ?? q.referral ?? 0,rewarded=invites.rewarded ?? q.referral ?? 0,pending=invites.pending ?? 0;
  const specs=[
    {id:'email',name:'Confirme seu email',copy:'Entre com uma conta de email confirmado. Recompensa única.',reward:c.email_reward,done:q.email>0,progress:q.email>0?'CONCLUÍDA':'UMA VEZ POR CONTA',action:login,label:'ENTRAR E CONFIRMAR'},
    {id:'referral',name:'Chame sua turma',copy:'Seu amigo confirma o email e conclui a primeira partida válida. Aceite o convite antes de entrar na primeira partida, em conta criada há até 7 dias.',reward:c.referral_reward,done:rewarded>=c.referral_cap,progress:state?.authenticated?`${linked} VINCULADOS · ${rewarded} PAGOS · ${pending} PENDENTES`:`ATÉ ${c.referral_cap} AMIGOS`,action:()=>$('treta-invite').click(),label:'COPIAR CONVITE'},
    {id:'singleplayer',name:'Conclua uma partida solo',copy:'Jogue a partida solo premiada até o fim, com ao menos 60 segundos de atividade.',reward:c.sp_reward,done:false,progress:`${q.singleplayer || 0} PARTIDAS · REPETÍVEL`,action:()=>$('treta-solo').click(),label:'JOGAR SOLO'},
    {id:'multiplayer',name:'Conclua uma partida multiplayer',copy:'Termine a partida com outro jogador autenticado e ao menos 60 segundos de atividade.',reward:c.mp_reward,done:false,progress:`${q.multiplayer || 0} PARTIDAS · REPETÍVEL`,action:()=>document.dispatchEvent(new CustomEvent('cs-treta-multiplayer')),label:'JOGAR MULTIPLAYER'},
  ];
  $('treta-quests').replaceChildren(...specs.map(s=>{
    const card=node('article','','treta-quest');card.dataset.quest=s.id;
    const button=node('button',s.done?'CONCLUÍDA':!active?'INDISPONÍVEL':!state?.authenticated?'ENTRAR PARA COMEÇAR':s.label,'treta-secondary');button.type='button';
    const capReached=['singleplayer','multiplayer'].includes(s.id) && (q.dailyMatchEarned || 0)+s.reward>c.daily_match_cap;
    button.disabled=s.done || !active || loading || refreshFailed || capReached;
    if(capReached)button.textContent='LIMITE DIÁRIO ATINGIDO';
    button.onclick=()=>state?.authenticated?s.action():login();
    card.append(node('small',s.progress),node('h4',s.name),node('strong',money(s.reward)),node('p',s.copy),button);return card;
  }));
  const lastDay=c.ends_at?new Date(Date.parse(c.ends_at)-1).toLocaleDateString('pt-BR',{timeZone:'UTC'}):null;
  $('treta-quest-period').textContent=refreshFailed?'Não foi possível consultar suas quests. Tente atualizar a carteira.':active?`Quests disponíveis até ${lastDay}. O saldo conquistado continua na sua conta.`:c.ends_at && Date.now()>=Date.parse(c.ends_at)?'Este período de quests terminou. Seu saldo e suas skins continuam na conta.':'Quests de lançamento em preparação.';
  const incoming=$('treta-incoming-status'),incomingState=invites.incoming;
  incoming.hidden=!incomingState;
  incoming.textContent=incomingState==='rewarded'?'Seu convite foi recompensado depois da primeira partida válida.':incomingState==='pending'?'Seu convite está vinculado. Complete a primeira partida válida para liberar a recompensa de quem convidou você.':'';
  $('treta-quest-limit').textContent=`Partidas hoje: ${money(q.dailyMatchEarned || 0)} de ${money(c.daily_match_cap)}. O limite renova à meia-noite UTC. Créditos entram automaticamente após confirmação.`;
}
function draw() {
  if(!loading && !refreshFailed)updateTretaRewards(state);
  else{
    // Visitante nao tem saldo: falha de consulta vira o convite de sempre, nunca ERRO.
    const visitante=!account?.authenticated;
    $('hub-treta-total').textContent=visitante?`T$ · ${tr('ENTRAR')}`:refreshFailed?tr('T$ · ERRO'):'T$ · …';
    $('hub-treta-wallet').setAttribute('aria-label',visitante?frase('carteiraEntrarAria'):refreshFailed?frase('carteiraErroAria'):frase('carteiraConsultandoAria'));
  }
  $('treta-balance-value').textContent=state?.wallet?money(state.wallet.balance):loading?'CARREGANDO…':!account?.authenticated?'ENTRE NA CONTA':refreshFailed?'INDISPONÍVEL':'ENTRE NA CONTA';
  for(const id of ['treta-grid','treta-characters-grid','treta-gloves-grid','treta-packs-grid'])$(id).setAttribute('aria-busy',String(loading));
  $('treta-retry').hidden=!refreshFailed;
  const heading={
    weapons:['LOJA ','DE ARMAS','Skins para AK e pistola. Abra um detalhe para ver a pintura isolada em movimento.'],
    characters:['LOJA ','DE PERSONAGENS','Personagens e acessórios para montar seu visual.'],
    gloves:['LOJA ','DE LUVAS','Luvas para todas as armas, do AK à faca.'],
    packs:['PACKS ','DA TRETA','AK, pistola, luvas e faca coordenadas por T$ 2.000.'],
    quests:['COMPLETE ','QUESTS','Ganhe TRETA$ jogando e completando quests.'],
  }[view] || ['LOJA ','DE PERSONAGENS','Seu estilo entra em jogo.'];
  $('treta-view-title').replaceChildren(node('span',heading[0]),node('em',heading[1]));
  $('treta-view-description').textContent=heading[2];
  const balance=state?.wallet?.balance;
  const groups=[
    ['treta-grid',TRETA_WEAPON_SKINS],
    ['treta-characters-grid',TRETA_SKINS.filter(s=>manifest.skins[s.id]?.approved===true)],
    ['treta-gloves-grid',TRETA_GLOVES],
    ['treta-packs-grid',TRETA_PACKS],
  ];
  for(const [targetId,products] of groups){
    const shown=products.filter(s=>filter==='owned'?owned(s.id):true).sort((a,b)=>{
      if(balance==null)return 0;
      const rank=s=>equipped(s.id)?0:owned(s.id)?1:available(s.id) && (item(s.id)?.price ?? s.price)<=balance?2:available(s.id)?3:4;
      return rank(a)-rank(b) || (item(a.id)?.price ?? a.price)-(item(b.id)?.price ?? b.price);
    });
    const target=$(targetId);
    target.replaceChildren(...shown.map(s=>{
      const button=node('button','','treta-card');button.type='button';button.style.setProperty('--skin-color',s.color);
      const hasPoster=Boolean(s.poster || manifest.skins[s.id]?.poster);
      const label=node('span',refreshFailed?'CONSULTA INDISPONÍVEL':loading?'CONSULTANDO…':equipped(s.id)?s.slot==='pack'?'PACK EQUIPADO':'EQUIPADA':owned(s.id)?'NO SEU ARMÁRIO':available(s.id)?s.slot==='pack'?'KIT COMPLETO':hasPoster?'NOVA SKIN':'PRÉVIA 3D NO DETALHE':'EM PRODUÇÃO','treta-label');
      const image=node('img');image.src=portrait(s);image.alt=hasPoster?`${s.name}`:'Personagem base usado como referência de produção';image.loading='lazy';
      const copy=node('div','','treta-card-copy'),priceValue=item(s.id)?.price ?? s.price,missing=balance!=null && !owned(s.id)?Math.max(0,priceValue-balance):0,price=node('b',money(priceValue));price.append(node('span',owned(s.id)?'VER VISUAL':missing?`FALTAM ${money(missing)}`:'VER DETALHE'));
      copy.append(node('small',hasPoster?s.series:`${s.series} · PERSONAGEM BASE`),node('strong',s.name),price);
      button.append(label,image,copy);const preview=skinPreview(button,s.id);button.onclick=()=>{if(preview.tap())return;void detail(s);};return button;
    }));
    if(!shown.length){
      const empty=node('div','','treta-empty');empty.append(node('strong',loading?'CARREGANDO ARMÁRIO':refreshFailed?'ARMÁRIO INDISPONÍVEL':'NENHUM VISUAL NESTA LISTA'),node('p',loading?'Buscando seus visuais na conta.':refreshFailed?'Tente de novo para consultar seus visuais.':state?.authenticated?'Troque o filtro para ver o catálogo completo.':'Entre na conta para ver seus visuais.'),node('button','VER CATÁLOGO COMPLETO','treta-secondary'));
      empty.lastChild.type='button';empty.lastChild.onclick=()=>document.querySelector('[data-treta-filter=all]')?.click();target.append(empty);
    }
  }
  rewards($('treta-rewards'));rewards($('treta-info-rewards'));
  const c=state?.campaign,active=campaignActive(),invites=state?.invites || {};
  $('treta-campaign-status').textContent=active?`Quests até ${new Date(Date.parse(c.ends_at)-1).toLocaleDateString('pt-BR',{timeZone:'UTC'})}. Limite de partidas: ${money(c.daily_match_cap)} por dia (UTC).`:'Não há quests ativas neste momento. Seu saldo e suas skins permanecem na conta.';
  $('treta-promo-copy').textContent=active?`Confirme seu email: ${money(c.email_reward)}. Convide um amigo elegível: ${money(c.referral_reward)}. Neste mês não há compra de moeda.`:'Neste mês, seus T$ vêm das quests. A compra de moeda não está disponível.';
  $('treta-invite-progress').textContent=state?.authenticated?`${invites.linked ?? state?.quests?.referral ?? 0} convite(s) vinculado(s) · ${invites.rewarded ?? state?.quests?.referral ?? 0} recompensado(s) · ${invites.pending ?? 0} pendente(s).`:'Entre na conta para criar seu convite e acompanhar as recompensas.';
  if(!$('treta-invite-arrival')?.hidden && c?.referral_reward)$('treta-invite-arrival-copy').textContent=`Entre com uma conta nova elegível antes da primeira partida. Depois da primeira partida válida, quem convidou você recebe ${money(c.referral_reward)}.`;
  $('treta-invite').textContent=state?.wallet?'COPIAR MEU CONVITE ↗':'ENTRAR PARA CRIAR MEU CONVITE';
  $('treta-solo').disabled=!active;
  $('treta-solo').textContent=active?'JOGAR SOLO POR T$ ▸':'SOLO POR T$ · EM BREVE';
  $('treta-info-login').hidden=!!account?.authenticated;
  drawQuests();if(TRETA_ITEMS_ENABLED)drawEyewear();
  document.dispatchEvent(new CustomEvent('cs-treta-state'));
}
function drawEyewear() {
  $('treta-eyewear-grid').replaceChildren(...TRETA_EYEWEAR.map(s=>{
    const button=node('button','','treta-card');button.type='button';button.style.setProperty('--skin-color',s.color);
    const label=node('span',equipped(s.id)?'EQUIPADO':owned(s.id)?'NO ARMÁRIO':available(s.id)?'NOVO VISUAL':'ENCAIXE EM REVISÃO','treta-label');
    const image=node('img');image.src=portrait(s);image.alt=s.name;image.loading='lazy';
    const copy=node('div','','treta-card-copy'),price=node('b',money(item(s.id)?.price ?? s.price));price.append(node('span','VER DETALHE'));
    copy.append(node('small',s.series),node('strong',s.name),price);button.append(label,image,copy);button.onclick=()=>void detail(s);return button;
  }));
}
export function equippedTretaEyewear() {
  if(!TRETA_ITEMS_ENABLED)return null;
  return state?.inventory?.find(s=>s.equipped && item(s.skin_id)?.slot==='eyewear' && available(s.skin_id))?.skin_id || null;
}
/* Leitura da loja Treta Pop (tp/loja.js): preço e raridade só do servidor; sem eles, null e ''. */
export function tretaLoja() {
  const c=state?.campaign || TRETA_DEFAULT_REWARDS,q=state?.quests || {};
  return {loading,failed:refreshFailed,authenticated:Boolean(state?.authenticated),saldo:state?.wallet?.balance ?? null,campanha:campaignActive(),
    ganhoHoje:q.dailyMatchEarned || 0,tetoDiario:c.daily_match_cap,amigos:state?.invites?.rewarded ?? q.referral ?? 0,tetoAmigos:c.referral_cap,porAmigo:c.referral_reward,
    convites:state?.invites || {linked:0,rewarded:0,pending:0,incoming:null},
    itens:STORE_SKINS.filter(s=>['weapon','glove','pack'].includes(s.slot) || manifest.skins[s.id]?.approved===true).map(s=>({id:s.id,name:s.name,slot:s.slot,series:s.series,color:s.color,poster:portrait(s),
      price:item(s.id)?.price ?? null,raridade:item(s.id)?.rarity || '',owned:Boolean(owned(s.id)),equipped:Boolean(equipped(s.id)),available:available(s.id)}))};
}
function openDialog(dialog) {
  if(dialog.open)return;
  const focus=document.activeElement;
  dialog.showModal();
  dialog.addEventListener('close',()=>focus?.focus(),{once:true});
}
const INSPECT_WEAPON_LABELS=Object.freeze({ak:'AK',pistol:'PISTOLA'});
function resetInspectPreview() {
  const video=$('treta-inspect-video'),hint=$('treta-inspect-hint');
  if(!video || !hint)return;
  video.pause();video.onloadeddata=null;video.onended=null;video.onerror=null;
  video.removeAttribute('src');video.replaceChildren();video.load();
  video.loop=false;video.hidden=true;video.removeAttribute('data-detail-version');hint.hidden=true;
}
function playInspectPreview(skin,version) {
  const clips=skin.slot==='weapon' && skin.previewVideo
    ? [{weapon:skin.weapon,src:skin.previewVideo}]
    : skin.slot==='pack'
      ? ['ak','pistol'].map(weapon=>({weapon,src:skin.weaponPreviewVideos?.[weapon]})).filter(clip=>clip.src)
      : [];
  if(!clips.length)return;
  const video=$('treta-inspect-video'),hint=$('treta-inspect-hint'),label=$('treta-inspect-label');
  let current=0;
  const isCurrent=src=>version===detailVersion && selected===skin && $('treta-detail').open
    && video.dataset.detailVersion===String(version) && video.getAttribute('src')===src;
  const selectClip=()=>{
    if(version!==detailVersion || selected!==skin || !$('treta-detail').open)return;
    const clip=clips[current];
    video.pause();video.onloadeddata=null;video.onerror=null;video.hidden=true;
    video.removeAttribute('src');video.replaceChildren();video.load();
    video.dataset.detailVersion=String(version);
    label.textContent=`PRÉVIA ISOLADA EM MOVIMENTO · ${INSPECT_WEAPON_LABELS[clip.weapon] || clip.weapon.toUpperCase()} · SEM MÃOS, BRAÇOS OU HUD`;
    video.loop=clips.length===1;
    video.onloadeddata=()=>{
      if(!isCurrent(clip.src))return;
      video.hidden=false;video.play().catch(()=>{});
    };
    video.onerror=()=>{if(isCurrent(clip.src))video.hidden=true;};
    video.src=clip.src;video.load();
  };
  video.onended=clips.length>1?()=>{
    if(version!==detailVersion || selected!==skin || video.dataset.detailVersion!==String(version))return;
    current=(current+1)%clips.length;selectClip();
  }:null;
  hint.hidden=false;selectClip();
}
function login() { $('hub-account-login')?.click(); }
async function refresh() {
  const epoch=accountEpoch;
  if(refreshPromise && refreshEpoch===epoch)return refreshPromise;
  refreshEpoch=epoch;loading=true;refreshFailed=false;
  $('treta-status').textContent='Atualizando saldo e armário…';draw();
  const request=(async()=>{
    try {
      let fresh=await socialApi('/api/treta');
      if(epoch!==accountEpoch)return;
      if(fresh.authenticated) {
        const code=stored('cs_treta_referral');
        if(code){try{await socialApi('/api/treta',{action:'referral',code});stored('cs_treta_referral','');}catch(e){if(e.message==='referral_ineligible')stored('cs_treta_referral','');}}
        if(epoch!==accountEpoch)return;
        fresh=await socialApi('/api/treta',{action:'refresh'});
      }
      if(epoch!==accountEpoch)return;
      state=fresh;
      if($('treta-status').textContent===errorText({}))$('treta-status').textContent='';
      $('treta-status').textContent=state?.wallet?'Seu saldo e armário estão sincronizados com a conta.':'Entre na conta para guardar seus T$ e suas skins.';
    }catch(e){if(epoch!==accountEpoch)return;state=null;refreshFailed=true;$('treta-status').textContent=errorText(e);}
    if(epoch!==accountEpoch)return;loading=false;draw();updateBuy();notifyEquipment();
  })().finally(()=>{if(refreshPromise===request)refreshPromise=null;});
  refreshPromise=request;return request;
}
async function visual(host,{model,poster,coin=false,celebrate=false,count=1,weaponSkin=null,gloveSkin=null}) {
  host.replaceChildren();
  const fallback=node('img');fallback.src=poster || '/img/treta/coin-classic-saci.webp';fallback.alt=coin?'Moeda dourada TRETA$':'Prévia visual da skin';host.append(fallback);
  if(!model && !weaponSkin && !gloveSkin)return {loaded:false,dispose(){}};
  let display;
  try{
    if(weaponSkin){
      const {WeaponSkinStage}=await import('./weapon-skin-stage.js');
      display=new WeaponSkinStage(host);await display.load(weaponSkin.weapon,weaponSkin.id);
    }else if(gloveSkin){
      const {GloveSkinStage}=await import('./glove-skin-stage.js');
      display=new GloveSkinStage(host);await display.load(gloveSkin.id);
    }else{
      const {TretaStage}=await import('./treta-stage.js');
      display=new TretaStage(host,{coin,celebrate,count});await display.load(model);
    }
    fallback.remove();display.loaded=true;return display;
  }catch{display?.dispose();return {loaded:false,dispose(){}};}
}
async function detail(skin,track=true) {
  if(track)storeEvent('preview',skin.id);
  const version=++detailVersion,isWeapon=skin.slot==='weapon',isGlove=skin.slot==='glove',isPack=skin.slot==='pack';
  resetInspectPreview();
  selected=skin;stage?.dispose();stage=null;previewReady=false;previewLoading=previewable(skin.id);
  $('treta-preview-retry').hidden=true;
  $('treta-detail-name').textContent=skin.name;$('treta-detail-series').textContent=skin.series;
  $('treta-detail-description').textContent=skin.description;$('treta-detail-price').textContent=money(item(skin.id)?.price ?? skin.price);
  const fitCount=skin.slot==='eyewear'?eyewearFitCount(asset(skin.id)):0;
  $('treta-detail-fit').hidden=skin.slot!=='eyewear';$('treta-detail-fit').textContent=fitCount?`Encaixa em ${fitCount} personagens certificados.`:'Encaixa em 0 personagens certificados. Os perfis candidatos ainda aguardam decisão humana.';
  $('treta-detail-production').textContent=refreshFailed?'Consulta indisponível. Feche o detalhe e tente atualizar a carteira.':isPack?'O pack equipa AK, pistola, luvas e faca coordenadas. A prévia alterna AK e pistola isoladas em movimento, sem mãos, braços ou HUD; não representa a empunhadura na partida.':isGlove?'Carregando o molde 3D isolado das luvas…':isWeapon?'Carregando o modelo 3D e a prévia isolada em movimento…':previewLoading?'Carregando prévia 3D do visual…':'Em produção. A imagem abaixo é a referência do personagem base; o visual final terá roupas e acessórios novos.';
  $('treta-buy-status').textContent='';updateBuy();openDialog($('treta-detail'));playInspectPreview(skin,version);
  const model=!isWeapon && !isGlove && !isPack && previewable(skin.id)?asset(skin.id).model:null;
  const loaded=await visual($('treta-stage'),{model,poster:portrait(skin),weaponSkin:isWeapon?skin:null,gloveSkin:isGlove?skin:null});
  if(version!==detailVersion || !$('treta-detail').open){loaded.dispose();return;}
  stage=loaded;previewLoading=false;previewReady=loaded.loaded || Boolean(skin.poster || asset(skin.id)?.poster);
  if(previewable(skin.id)){
    $('treta-detail-production').textContent=refreshFailed?'Consulta indisponível. Feche o detalhe e tente atualizar a carteira.':loaded.loaded?(available(skin.id)?(isWeapon?'Modelo 3D da arma e prévia isolada em movimento, sem mãos, braços ou HUD; a empunhadura na partida não é representada.':isGlove?'Molde 3D isolado da luva. Ao equipar, ela aparece em todas as armas.':skin.slot==='eyewear'?'Prévia 3D dos óculos.':'Prévia 3D da skin.'):(isWeapon?'Modelo 3D da arma e prévia isolada em movimento. Venda em preparação.':isGlove?'Molde 3D da luva. Venda em preparação.':skin.slot==='eyewear'?'Modelo 3D dos óculos. Venda em preparação.':'Modelo 3D da skin. Venda em preparação.')) :previewReady?'Prévia 3D indisponível. Veja a imagem da skin.':'Prévia 3D indisponível. Esta imagem é do personagem base. Tente novamente para ver a skin antes de comprar.';
    $('treta-preview-retry').hidden=loaded.loaded;
  }
  updateBuy();
}
function updateBuy() {
  if(!selected)return;
  const button=$('treta-buy'),price=item(selected.id)?.price ?? selected.price;
  const shortfall=state?.wallet && !owned(selected.id)?Math.max(0,price-state.wallet.balance):0;
  button.disabled=purchasePending || loading || refreshFailed || !available(selected.id) || shortfall>0 || (!owned(selected.id) && !previewReady);
  $('treta-detail').dataset.busy=String(purchasePending);
  if(shortfall>0)$('treta-buy-status').textContent=`Faltam ${money(shortfall)} para este visual.`;
  if(refreshFailed){button.textContent='CONSULTA INDISPONÍVEL';return;}
  if(shortfall>0 && !purchasePending){button.textContent='SALDO INSUFICIENTE';return;}
  if(purchasePending){button.textContent='CONFIRMANDO…';return;}
  if(available(selected.id) && !owned(selected.id) && !previewReady){button.textContent=previewLoading?'CARREGANDO PRÉVIA…':'PRÉVIA INDISPONÍVEL';return;}
  button.textContent=!available(selected.id)?(selected.slot==='eyewear'?'ENCAIXE EM REVISÃO':'EM PRODUÇÃO'):equipped(selected.id)?'JÁ EQUIPADA':owned(selected.id)?(selected.slot==='eyewear'?'EQUIPAR ÓCULOS':selected.slot==='glove'?'EQUIPAR LUVAS':selected.slot==='pack'?'EQUIPAR PACK':'EQUIPAR SKIN'):state?.wallet?`COMPRAR POR ${money(item(selected.id).price)}`:'ENTRAR PARA COMPRAR';
  if(equipped(selected.id))button.disabled=true;
}
async function equip(skin) {
  const epoch=accountEpoch,owner=state?.accountId;
  const result=await socialApi('/api/treta',{action:'equip',skinId:skin.id});
  if(epoch!==accountEpoch || result.accountId!==owner)return false;
  state=result;
  draw();updateBuy();notifyEquipment();
  if(skin.slot==='weapon')document.dispatchEvent(new CustomEvent('cs-weapon-skin-equipped',{detail:{skinId:skin.id,weaponId:skin.weapon}}));
  else if(skin.slot==='eyewear')document.dispatchEvent(new CustomEvent('cs-eyewear-equipped',{detail:{eyewearId:skin.id}}));
  else if(skin.slot==='glove')document.dispatchEvent(new CustomEvent('cs-glove-equipped',{detail:{gloveId:skin.id}}));
  else if(skin.slot==='pack')document.dispatchEvent(new CustomEvent('cs-pack-equipped',{detail:{packId:skin.id}}));
  else {onEquip({...skin,model:asset(skin.id).model});document.dispatchEvent(new CustomEvent('cs-skin-equipped',{detail:{skinId:skin.id,characterId:skin.character,model:asset(skin.id).model}}));}
  return true;
}
async function buy() {
  if(purchasePending || loading || refreshFailed || !selected || !available(selected.id) || (!owned(selected.id) && !previewReady))return;
  if(!state?.authenticated){$('treta-detail').close();login();return;}
  const skin=selected,epoch=accountEpoch,owner=state.accountId;
  const revealPoster=portrait(skin);
  purchasePending=true;updateBuy();
  try {
    if(owned(skin.id)){if(!await equip(skin))return;$('treta-buy-status').textContent='Visual equipado para a próxima partida.';return;}
    const result=await socialApi('/api/treta',{action:'purchase',skinId:skin.id,requestId:crypto.randomUUID()});
    if(epoch!==accountEpoch || result.accountId!==owner)return;
    state=result;draw();notifyEquipment();$('treta-detail').close();
    const reveal=$('treta-purchase-item');reveal.src=revealPoster;reveal.alt=`${skin.name} adicionada ao armário`;reveal.hidden=false;
    $('treta-purchase-title').textContent=result.purchase.owned?'JÁ É SUA':`${skin.name.toUpperCase()}`;
    $('treta-purchase-copy').textContent=result.purchase.owned?'A skin já estava no seu armário.':`${money(result.purchase.spent)} investidos no drip. Saldo: ${money(result.wallet.balance)}.`;
    $('treta-purchase-equip').onclick=async()=>{const b=$('treta-purchase-equip');b.disabled=true;try{if(!await equip(skin))return;$('treta-purchase-copy').textContent='Visual equipado para a próxima partida.';$('treta-purchase').close();}catch(e){$('treta-purchase-copy').textContent=errorText(e);}finally{b.disabled=false;}};
    openDialog($('treta-purchase'));purchaseStage?.dispose();
    const display=result.purchase.owned
      ? skin.slot==='weapon'?{weaponSkin:skin,poster:portrait(skin)}:skin.slot==='glove'?{gloveSkin:skin,poster:portrait(skin)}:skin.slot==='pack'?{poster:portrait(skin)}:{model:asset(skin.id).model,poster:portrait(skin)}
      : {...TRETA_COIN_ART,coin:true,celebrate:true};
    const loaded=await visual($('treta-purchase-stage'),display);
    if(epoch!==accountEpoch || !$('treta-purchase').open)loaded.dispose();else purchaseStage=loaded;
  }catch(e){if(epoch===accountEpoch)$('treta-buy-status').textContent=errorText(e);}
  finally{purchasePending=false;updateBuy();}
}

function initProposals() {
  if(TRETA_ITEMS_ENABLED)$('treta-accessories').replaceChildren(...TRETA_ACCESSORY_PROPOSALS.map(a=>{const card=node('article','','treta-accessory');card.append(node('span',a.mark),node('h4',a.name),node('p',a.description),node('p',a.compatibility),node('small','EM ESTUDO · SEM VENDA ATIVA'));return card;}));
  const allTabs=[...document.querySelectorAll('[data-treta-view]')];
  const tabs=allTabs;
  // Aba da loja no caminho (/loja/quests, ADR 0008): clique empilha; abrir a loja segue a URL.
  const slugDaView=Object.fromEntries(Object.entries(ABAS_LOJA).map(([slug,v])=>[v,slug]));
  const select=(button,push=true)=>{
    view=button.dataset.tretaView;
    if(push && $('main-menu')?.dataset.hubTab==='loja'){const url=urlDoEstado({secao:'loja',loja:slugDaView[view]},location.href);if(url.href!==location.href)history.pushState(null,'',url);}
    for(const tab of tabs){const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;$(tab.getAttribute('aria-controls')).hidden=!active;}draw();$('hub-shop').scrollTop=0;
  };
  const seguirUrl=()=>{const rota=estadoDaUrl(location.href);const alvo=tabs.find(tab=>tab.dataset.tretaView===(rota?.secao==='loja' && ABAS_LOJA[rota.loja] || 'characters')) || tabs[0];if(alvo && alvo.dataset.tretaView!==view)select(alvo,false);};
  document.addEventListener('cs-shop-open',seguirUrl);seguirUrl();
  for(const tab of tabs){tab.tabIndex=tab.dataset.tretaView===view?0:-1;tab.onclick=()=>select(tab);tab.onkeydown=e=>{
    const i=tabs.indexOf(tab),next=e.key==='ArrowRight'?(i+1)%tabs.length:e.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:e.key==='Home'?0:e.key==='End'?tabs.length-1:null;
    if(next===null)return;e.preventDefault();select(tabs[next]);tabs[next].focus();
  };}
}

export function initTretaStore({skipPrompt=false,onEquipped=()=>{}}={}) {
  if(!$('hub-shop'))return;
  onEquip=onEquipped;initTretaRewards();initProposals();
  let accountChange;
  let accountChanged=new Promise(resolve=>{accountChange=resolve;});
  $('treta-retry').onclick=()=>void refresh();
  const code=new URLSearchParams(location.search).get('treta');
  const inviteCode=code && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(code)?code:null;
  if(inviteCode)stored('cs_treta_referral',inviteCode);
  const arrival=$('treta-invite-arrival');
  if(inviteCode && arrival){arrival.hidden=false;$('treta-invite-arrival-close').onclick=()=>{arrival.hidden=true;};}
  const clientVersion=typeof VERSION==='string'?VERSION:'';
  const healthKey=`cs_invite_health:${clientVersion}`;
  try{
    if(!sessionStorage.getItem(healthKey))void socialApi('/api/treta',{action:'invite-health',version:clientVersion}).then(result=>{if(result.stored)sessionStorage.setItem(healthKey,'1');}).catch(()=>{});
  }catch{}
  let landingPending=false;
  const trackInviteLanding=()=>{
    if(!inviteCode || landingPending || !globalThis.__csPrivacy?.allowed())return;
    try{if(sessionStorage.getItem('cs_invite_landing'))return;}catch{}
    landingPending=true;
    void inviteEvent('landing').then(saved=>{if(saved && globalThis.__csPrivacy?.allowed())try{sessionStorage.setItem('cs_invite_landing','1');}catch{}}).finally(()=>{landingPending=false;});
  };
  trackInviteLanding();
  globalThis.addEventListener?.('cs-privacy-change',trackInviteLanding);
  $('treta-buy').onclick=()=>void buy();
  ligarCompartilhar($('treta-share'),()=>({titulo:'Loja do CORO SOLTO',texto:`Olha a skin ${$('treta-detail-name').textContent} na loja do CORO SOLTO.`,url:linkCompartilhavel('/loja','skin')}));
  $('treta-preview-retry').onclick=()=>{if(selected)void detail(selected,false);};
  for(const button of document.querySelectorAll('[data-treta-close]'))button.onclick=()=>button.closest('dialog').close();
  for(const dialog of [$('treta-detail'),$('treta-purchase')])dialog.addEventListener('close',()=>{if(dialog.id==='treta-detail'){detailVersion++;stage?.dispose();stage=null;resetInspectPreview();}else{purchaseStage?.dispose();purchaseStage=null;}});
  $('treta-info').addEventListener('close',()=>{infoVersion++;infoStage?.dispose();infoStage=null;});
  const explain=async(value=200)=>{
    const version=++infoVersion;infoStage?.dispose();infoStage=null;
    rewards($('treta-info-rewards'));stored('cs_treta_intro','v1');openDialog($('treta-info'));
    const loaded=await visual($('treta-info-coin'),{...TRETA_COIN_ART,coin:true});
    if(version!==infoVersion || !$('treta-info').open)loaded.dispose();else infoStage=loaded;
  };
  $('treta-how').onclick=()=>void explain();$('treta-balance').onclick=abrirTretaHistorico;
  $('treta-solo').onclick=()=>{if(!state?.authenticated){login();return;}document.dispatchEvent(new CustomEvent('cs-treta-solo'));};
  $('treta-info-login').onclick=()=>{$('treta-info').close();login();};
  const introCoin=node('img');introCoin.src=TRETA_COIN_ART.poster;introCoin.alt='Moeda TRETA$ do Saci';$('treta-info-coin').append(introCoin);
  $('treta-coins').replaceChildren(...TRETA_COINS.map(c=>{const e=node('button','','treta-coin-card');e.type='button';e.onclick=()=>void explain(c.value);const text=node('div');text.append(node('b',money(c.value)),node('small',c.name));const img=node('img');img.src=c.poster;img.alt=`Moeda ${money(c.value)} com ${c.name}`;img.loading='lazy';e.append(img,text);return e;}));
  for(const button of document.querySelectorAll('[data-treta-filter]'))button.onclick=()=>{filter=button.dataset.tretaFilter;for(const b of document.querySelectorAll('[data-treta-filter]'))b.setAttribute('aria-pressed',String(b===button));draw();};
  $('treta-invite').onclick=async()=>{
    void inviteEvent('cta');
    if(!state?.wallet){login();return;}
    const url=new URL('/',location.origin);url.searchParams.set('treta',state.wallet.referral_code);
    try{
      await navigator.clipboard.writeText(url.href);
      void inviteEvent('copied');
      $('treta-status').textContent='Convite copiado. Envie para sua turma!';
    }catch{
      void inviteEvent('manual');
      $('treta-status').textContent=`Seu convite: ${url.href}`;
    }
  };
  setInterval(()=>{if(account?.authenticated && !document.hidden)void refresh();},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && account?.authenticated)void refresh();});
  document.addEventListener('cs-match-end',()=>{for(const delay of [2000,12000,30000])setTimeout(()=>{if(account?.authenticated)void refresh();},delay);});
  document.addEventListener('cs-shop-open',()=>{storeVisit();void refresh();});
  if(estadoDaUrl(location.href)?.secao==='loja')storeVisit();
  document.addEventListener('cs-account-change',event=>{accountEpoch++;accountChange();accountChanged=new Promise(resolve=>{accountChange=resolve;});account=event.detail;state=null;selected=null;updateTretaRewards(null);for(const id of ['treta-detail','treta-purchase'])if($(id).open)$(id).close();draw();updateBuy();notifyEquipment();void refresh();});
  // Apresentação só depois da 1ª partida, quando o convite pós-partida (login-prompt.js) já decidiu.
  document.addEventListener('cs-pos-partida',event=>{
    if(event.detail?.treta){stored('cs_treta_intro','v1');return;}   // o convite já mostrou os T$
    if(document.documentElement.dataset.ui==='v3'){stored('cs_treta_intro','v1');return;}   // Treta Pop: a carteira só abre por clique
    if(skipPrompt || stored('cs_treta_intro') || $('main-menu')?.classList.contains('hidden') || document.querySelector('dialog[open]'))return;
    explain();
  });
  draw();
  const manifestsReady=()=>{draw();notifyEquipment();if(selected && $('treta-detail').open)void detail(selected,false);};
  let skinManifestSettled=false,manifestTimer;
  const skinManifestReady=Promise.resolve().then(()=>{const controller=new AbortController();manifestTimer=setTimeout(()=>controller.abort(),12000);return fetch(assetUrl('models/skins/manifest.json'),{signal:controller.signal});}).then(r=>{if(!r.ok)throw new Error('manifest_unavailable');return r.json();}).then(data=>{
    if(!data || typeof data!=='object' || !data.skins || typeof data.skins!=='object' || Array.isArray(data.skins))throw new Error('manifest_invalid');
    manifest=data;manifestsReady();
  }).catch(()=>{}).finally(()=>{clearTimeout(manifestTimer);skinManifestSettled=true;});
  if(TRETA_ITEMS_ENABLED)void loadEyewearFitData().then(data=>{eyeManifest=data.manifest;manifestsReady();});
  void loadAccount().then(auth=>{account=auth;}).catch(()=>{});
  return (async()=>{
    let epoch;
    do{
      epoch=accountEpoch;const changed=accountChanged;
      await Promise.race([refresh(),changed]);
      if(epoch!==accountEpoch)continue;
      while(!skinManifestSettled && epoch===accountEpoch && state?.inventory?.some(s=>s.equipped && product(s.skin_id)?.slot==='character' && item(s.skin_id)?.available===true && (item(s.skin_id)?.slot || 'character')==='character')){
        let wake;
        const inventoryChanged=new Promise(resolve=>{wake=resolve;inventoryWaiters.add(resolve);});
        try{await Promise.race([skinManifestReady,changed,inventoryChanged]);}finally{inventoryWaiters.delete(wake);}
      }
    }while(epoch!==accountEpoch);
  })();
}
/* Histórico de compras: linhas de ledger kind='purchase' nomeadas pelo catálogo. */
function drawHistory(){
  const list=$('treta-history-list');if(!list)return;
  const rows=(state?.ledger || []).filter(entry=>entry.kind==='purchase' && entry.skin_id).slice(0,20);
  $('treta-history-balance').textContent=state?.wallet?money(state.wallet.balance):'—';
  $('treta-history-empty').hidden=rows.length>0;
  list.replaceChildren(...rows.map(entry=>{
    const row=node('li','','treta-history-row');
    const nome=item(entry.skin_id)?.name || product(entry.skin_id)?.name;
    row.append(node('time',new Date(entry.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}),'treta-history-date'),
      node('strong',nome || 'VISUAL REMOVIDO',''),
      node('span',money(entry.amount),'treta-history-amount'),
      node('span',`SALDO ${money(entry.balance_after)}`,'treta-history-after'));
    return row;
  }));
}
export function abrirTretaHistorico(){drawHistory();openDialog($('treta-history'));}
