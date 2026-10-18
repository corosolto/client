import {TRETA_ITEMS_ENABLED} from './treta-features.js';
import {initTretaRewards,updateTretaRewards} from './treta-rewards.js';
import {TRETA_SKINS,TRETA_COINS,TRETA_DEFAULT_REWARDS,TRETA_COIN_ART,TRETA_EYEWEAR} from './treta-catalog.js';
import {TRETA_ACCESSORY_PROPOSALS} from './treta-proposals.js';
import {loadAccount,socialApi} from './account-entry.js';
import {byId} from './characters.js';
import {estadoDaUrl,urlDoEstado,ABAS_LOJA} from './rotas.js';
import {ligarCompartilhar,linkCompartilhavel} from './compartilhar.js';
import {eyewearProfile} from './eyewear.js';

const node=(tag,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
const errors={account_required:'Entre e escolha seu nick para guardar seus T$.',insufficient_balance:'Ainda faltam T$ para esta skin. Ganhe mais jogando e convidando amigos.',skin_unavailable:'Este visual ainda está em produção ou revisão.',request_reused:'Este pedido já foi usado. Atualize a carteira.',skin_not_owned:'Este visual ainda não está no seu armário.',referral_ineligible:'Este convite não é elegível para a recompensa.',rate_limited:'Espere um momento antes de tentar novamente.'};
const errorText=e=>errors[e.message] || 'A carteira está indisponível agora. Tente novamente em instantes.';
const money=value=>`T$ ${new Intl.NumberFormat('pt-BR').format(value)}`;
const stored=(key,value)=>{try{if(value===undefined)return localStorage.getItem(key);localStorage.setItem(key,value);}catch{return null;}};
const storeEvent=(event,itemId='')=>{
  if(!window.__csPrivacy?.allowed())return;
  void socialApi('/api/treta',{action:'analytics',event,itemId}).catch(()=>{});
};
let state=null,manifest={skins:{}},eyeManifest={eyewear:{}},selected=null,filter='all',stage=null,purchaseStage=null,refreshPromise=null,account=null;
let onEquip=()=>{},infoStage=null,infoVersion=0;
let equipmentRevision='';
let accountEpoch=0,refreshEpoch=-1,loading=false,refreshFailed=false,purchasePending=false,view='skins',detailVersion=0,previewReady=false,previewLoading=false;
const $=id=>document.getElementById(id);
const owned=id=>state?.inventory?.some(s=>s.skin_id===id);
const equipped=id=>state?.inventory?.some(s=>s.skin_id===id && s.equipped);
const item=id=>state?.catalog?.find(s=>s.id===id);
const campaignActive=()=>Boolean(state?.campaign?.starts_at && Date.now()>=Date.parse(state.campaign.starts_at) && Date.now()<Date.parse(state.campaign.ends_at));
const asset=id=>eyeManifest.eyewear[id] || manifest.skins[id];
const available=id=>item(id)?.available===true && asset(id)?.approved===true && item(id).model_path===asset(id).model && (item(id).slot==='eyewear'?Object.keys(asset(id).profiles || {}).some(key=>eyewearProfile(asset(id),{id:key})):asset(id).character===item(id).character_id);
// A vitrine pode mostrar um modelo real ainda em revisão; venda/equipamento
// continuam dependendo do catálogo do servidor e da aprovação no manifesto.
const previewable=id=>Boolean((asset(id)?.preview || asset(id)?.approved) && /^\/models\/(skins|items)\/[a-z0-9-]+\.glb$/.test(asset(id).model));
export function equippedTretaSkin(characterId) {
  const skin=state?.inventory?.find(s=>s.equipped && item(s.skin_id)?.slot!=='eyewear' && available(s.skin_id));
  return skin && item(skin.skin_id)?.character_id===characterId?skin.skin_id:null;
}
const portrait=skin=>asset(skin.id)?.poster || (skin.slot==='eyewear'?`/img/items/${skin.id}.webp`:`/img/chars/${skin.character}.webp`);
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
  if(!state?.catalog || refreshFailed || !Object.keys(manifest.skins).length)return null;
  return TRETA_SKINS.filter(s=>available(s.id) && manifest.skins[s.id]?.poster).map(s=>({id:s.id,name:s.name,color:s.color,series:s.series,price:item(s.id).price,poster:manifest.skins[s.id].video?.poster || manifest.skins[s.id].poster,owned:owned(s.id),equipped:equipped(s.id)}));
}
export function abrirTretaSkin(id) {
  const skin=TRETA_SKINS.find(s=>s.id===id);
  if(skin)void detail(skin);
  return Boolean(skin);
}
export async function equiparTretaSkin(id) {
  const skin=TRETA_SKINS.find(s=>s.id===id);
  if(!skin || !owned(id) || !available(id))return false;
  return equip(skin);
}
function notifyEquipment() {
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
  const c=state?.campaign || TRETA_DEFAULT_REWARDS,q=state?.quests || {},active=campaignActive();
  const specs=[
    {id:'email',name:'Confirme seu email',copy:'Entre com uma conta de email confirmado. Recompensa única.',reward:c.email_reward,done:q.email>0,progress:q.email>0?'CONCLUÍDA':'UMA VEZ POR CONTA',action:login,label:'ENTRAR E CONFIRMAR'},
    {id:'referral',name:'Chame sua turma',copy:'Seu amigo confirma o email e conclui a primeira partida válida. Aceite o convite antes de entrar na primeira partida, em conta criada há até 7 dias.',reward:c.referral_reward,done:q.referral>=c.referral_cap,progress:`${q.referral || 0}/${c.referral_cap} AMIGOS`,action:()=>$('treta-invite').click(),label:'COPIAR CONVITE'},
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
  $('treta-quest-limit').textContent=`Partidas hoje: ${money(q.dailyMatchEarned || 0)} de ${money(c.daily_match_cap)}. O limite renova à meia-noite UTC. Créditos entram automaticamente após confirmação.`;
}
function draw() {
  if(!loading && !refreshFailed)updateTretaRewards(state);
  else{
    $('hub-treta-total').textContent=refreshFailed?'T$ · ERRO':'T$ · …';
    $('hub-treta-wallet').setAttribute('aria-label',refreshFailed?'Carteira TRETA$ indisponível. Abra a loja para tentar novamente.':'Consultando carteira TRETA$');
  }
  $('treta-balance-value').textContent=state?.wallet?money(state.wallet.balance):loading?'CARREGANDO…':refreshFailed?'INDISPONÍVEL':'ENTRE NA CONTA';
  $('treta-grid').setAttribute('aria-busy',String(loading));
  $('treta-retry').hidden=!refreshFailed;
  $('treta-view-title').replaceChildren(node('span',view==='quests'?'COMPLETE ':view==='accessories'?'SEU ':'LOJA '),node('em',view==='quests'?'QUESTS':view==='accessories'?'DRIP':filter==='owned'?'E ARMÁRIO':'DE SKINS'));
  $('treta-view-description').textContent=view==='quests'?'Ganhe TRETA$ jogando e completando quests.':view==='accessories'?'Mais jeitos de vestir seu coro.':filter==='owned'?'Seus visuais, prontos para a próxima partida.':'Seu estilo entra em jogo.';
  const skins=TRETA_SKINS.filter(s=>manifest.skins[s.id]?.approved===true).filter(s=>filter==='owned'?owned(s.id):filter==='drip'?s.id.endsWith('-drip'):true);
  $('treta-grid').replaceChildren(...skins.map(s=>{
    const button=node('button','','treta-card');button.type='button';button.style.setProperty('--skin-color',s.color);
    const label=node('span',refreshFailed?'CONSULTA INDISPONÍVEL':loading?'CONSULTANDO…':equipped(s.id)?'EQUIPADA':owned(s.id)?'NO SEU ARMÁRIO':available(s.id)?manifest.skins[s.id]?.poster?'NOVA SKIN':'PRÉVIA 3D NO DETALHE':'EM PRODUÇÃO','treta-label');
    const image=node('img');image.src=portrait(s);image.alt=manifest.skins[s.id]?.poster?`Skin ${s.name}`:'Personagem base usado como referência de produção';image.loading='lazy';
    const copy=node('div','','treta-card-copy');const price=node('b',money(item(s.id)?.price ?? s.price));price.append(node('span',owned(s.id)?'VER SKIN':'VER DETALHE'));
    copy.append(node('small',manifest.skins[s.id]?.poster?s.series:`${s.series} · PERSONAGEM BASE`),node('strong',s.name),price);
    button.append(label,image,copy);const preview=skinPreview(button,s.id);button.onclick=()=>{if(preview.tap())return;void detail(s);};return button;
  }));
  if(!skins.length){
    const empty=node('div','','treta-empty');empty.append(node('strong',loading?'CARREGANDO ARMÁRIO':refreshFailed?'ARMÁRIO INDISPONÍVEL':'SEU PRÓXIMO VISUAL COMEÇA AQUI'),node('p',loading?'Buscando seus visuais na conta.':refreshFailed?'Tente de novo para consultar suas skins.':state?.authenticated?'As skins que você adquirir vão aparecer aqui.':'Entre na conta para ver seus visuais.'),node('button','VER TODAS AS SKINS','treta-secondary'));
    empty.lastChild.type='button';empty.lastChild.onclick=()=>document.querySelector('[data-treta-filter=all]').click();$('treta-grid').append(empty);
  }
  rewards($('treta-rewards'));rewards($('treta-info-rewards'));
  const c=state?.campaign,active=campaignActive();
  $('treta-campaign-status').textContent=active?`Quests até ${new Date(Date.parse(c.ends_at)-1).toLocaleDateString('pt-BR',{timeZone:'UTC'})}. Limite de partidas: ${money(c.daily_match_cap)} por dia (UTC).`:'Não há quests ativas neste momento. Seu saldo e suas skins permanecem na conta.';
  $('treta-promo-copy').textContent=active?`Confirme seu email: ${money(c.email_reward)}. Convide um amigo elegível: ${money(c.referral_reward)}. Neste mês não há compra de moeda.`:'Neste mês, seus T$ vêm das quests. A compra de moeda não está disponível.';
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
    ganhoHoje:q.dailyMatchEarned || 0,tetoDiario:c.daily_match_cap,amigos:q.referral || 0,tetoAmigos:c.referral_cap,porAmigo:c.referral_reward,
    itens:TRETA_SKINS.filter(s=>manifest.skins[s.id]?.approved===true).map(s=>({id:s.id,name:s.name,series:s.series,color:s.color,poster:portrait(s),
      price:item(s.id)?.price ?? null,raridade:item(s.id)?.rarity || '',owned:Boolean(owned(s.id)),equipped:Boolean(equipped(s.id)),available:available(s.id)}))};
}
function openDialog(dialog) {
  if(dialog.open)return;
  const focus=document.activeElement;
  dialog.showModal();
  dialog.addEventListener('close',()=>focus?.focus(),{once:true});
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
async function visual(host,{model,poster,coin=false,celebrate=false,count=1}) {
  host.replaceChildren();
  const fallback=node('img');fallback.src=poster || '/img/treta/coin-classic-saci.webp';fallback.alt=coin?'Moeda dourada TRETA$':'Prévia visual da skin';host.append(fallback);
  if(!model)return {loaded:false,dispose(){}};
  let display;
  try{const {TretaStage}=await import('./treta-stage.js');display=new TretaStage(host,{coin,celebrate,count});await display.load(model);fallback.remove();display.loaded=true;return display;}catch{display?.dispose();return {loaded:false,dispose(){}};}
}
async function detail(skin,track=true) {
  if(track)storeEvent('preview',skin.id);
  const version=++detailVersion;
  selected=skin;stage?.dispose();stage=null;previewReady=false;previewLoading=previewable(skin.id);
  $('treta-preview-retry').hidden=true;
  $('treta-detail-name').textContent=skin.name;$('treta-detail-series').textContent=skin.series;
  $('treta-detail-description').textContent=skin.description;$('treta-detail-price').textContent=money(item(skin.id)?.price ?? skin.price);
  const fits=skin.slot==='eyewear'?Object.keys(asset(skin.id)?.profiles || {}).filter(key=>eyewearProfile(asset(skin.id),{id:key})).map(key=>TRETA_SKINS.find(s=>s.id===key)?.name || byId(key)?.name || key):[];
  $('treta-detail-fit').hidden=skin.slot!=='eyewear';$('treta-detail-fit').textContent=fits.length?`Personagens compatíveis: ${fits.join(', ')}.`:'O encaixe nos personagens ainda está em revisão.';
  $('treta-detail-production').textContent=refreshFailed?'Consulta indisponível. Feche o detalhe e tente atualizar a carteira.':previewLoading?'Carregando prévia 3D do visual…':'Em produção. A imagem abaixo é a referência do personagem base; o visual final terá roupas e acessórios novos.';
  $('treta-buy-status').textContent='';updateBuy();openDialog($('treta-detail'));
  const loaded=await visual($('treta-stage'),{model:previewable(skin.id)?asset(skin.id).model:null,poster:portrait(skin)});
  if(version!==detailVersion || !$('treta-detail').open){loaded.dispose();return;}
  stage=loaded;previewLoading=false;previewReady=loaded.loaded || !!asset(skin.id)?.poster;
  if(previewable(skin.id)){
    $('treta-detail-production').textContent=refreshFailed?'Consulta indisponível. Feche o detalhe e tente atualizar a carteira.':loaded.loaded?(available(skin.id)?(skin.slot==='eyewear'?'Prévia 3D dos óculos.':'Prévia 3D da skin.'):(skin.slot==='eyewear'?'Modelo 3D dos óculos. Venda em preparação.':'Modelo 3D da skin. Venda em preparação.')) :previewReady?'Prévia 3D indisponível. Veja a imagem da skin.':'Prévia 3D indisponível. Esta imagem é do personagem base. Tente novamente para ver a skin antes de comprar.';
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
  button.textContent=!available(selected.id)?(selected.slot==='eyewear'?'ENCAIXE EM REVISÃO':'EM PRODUÇÃO'):equipped(selected.id)?'JÁ EQUIPADA':owned(selected.id)?(selected.slot==='eyewear'?'EQUIPAR ÓCULOS':'EQUIPAR SKIN'):state?.wallet?`COMPRAR POR ${money(item(selected.id).price)}`:'ENTRAR PARA COMPRAR';
  if(equipped(selected.id))button.disabled=true;
}
async function equip(skin) {
  const epoch=accountEpoch,owner=state?.accountId;
  const result=await socialApi('/api/treta',{action:'equip',skinId:skin.id});
  if(epoch!==accountEpoch || result.accountId!==owner)return false;
  state=result;
  draw();updateBuy();notifyEquipment();
  if(skin.slot==='eyewear')document.dispatchEvent(new CustomEvent('cs-eyewear-equipped',{detail:{eyewearId:skin.id}}));
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
    state=result;draw();$('treta-detail').close();
    const reveal=$('treta-purchase-item');reveal.src=revealPoster;reveal.alt=`${skin.name} adicionada ao armário`;reveal.hidden=false;
    $('treta-purchase-title').textContent=result.purchase.owned?'JÁ É SUA':`${skin.name.toUpperCase()}`;
    $('treta-purchase-copy').textContent=result.purchase.owned?'A skin já estava no seu armário.':`${money(result.purchase.spent)} investidos no drip. Saldo: ${money(result.wallet.balance)}.`;
    $('treta-purchase-equip').onclick=async()=>{const b=$('treta-purchase-equip');b.disabled=true;try{if(!await equip(skin))return;$('treta-purchase-copy').textContent='Visual equipado para a próxima partida.';$('treta-purchase').close();}catch(e){$('treta-purchase-copy').textContent=errorText(e);}finally{b.disabled=false;}};
    openDialog($('treta-purchase'));purchaseStage?.dispose();
    const display=result.purchase.owned
      ? {model:asset(skin.id).model,poster:portrait(skin)}
      : {...TRETA_COIN_ART,coin:true,celebrate:true};
    const loaded=await visual($('treta-purchase-stage'),display);
    if(epoch!==accountEpoch || !$('treta-purchase').open)loaded.dispose();else purchaseStage=loaded;
  }catch(e){if(epoch===accountEpoch)$('treta-buy-status').textContent=errorText(e);}
  finally{purchasePending=false;updateBuy();}
}

function initProposals() {
  if(TRETA_ITEMS_ENABLED)$('treta-accessories').replaceChildren(...TRETA_ACCESSORY_PROPOSALS.map(a=>{const card=node('article','','treta-accessory');card.append(node('span',a.mark),node('h4',a.name),node('p',a.description),node('p',a.compatibility),node('small','EM ESTUDO · SEM VENDA ATIVA'));return card;}));
  const allTabs=[...document.querySelectorAll('[data-treta-view]')];
  for(const tab of allTabs)if(tab.dataset.tretaView==='accessories')tab.hidden=!TRETA_ITEMS_ENABLED;
  const tabs=allTabs.filter(tab=>TRETA_ITEMS_ENABLED || tab.dataset.tretaView!=='accessories');
  // Aba da loja no caminho (/loja/quests, ADR 0008): clique empilha; abrir a loja segue a URL.
  const slugDaView=Object.fromEntries(Object.entries(ABAS_LOJA).map(([slug,v])=>[v,slug]));
  const select=(button,push=true)=>{
    view=button.dataset.tretaView;
    if(push && $('main-menu')?.dataset.hubTab==='loja'){const url=urlDoEstado({secao:'loja',loja:slugDaView[view]},location.href);if(url.href!==location.href)history.pushState(null,'',url);}
    for(const tab of tabs){const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;$(tab.getAttribute('aria-controls')).hidden=!active;}draw();$('hub-shop').scrollTop=0;
  };
  const seguirUrl=()=>{const rota=estadoDaUrl(location.href);const alvo=tabs.find(tab=>tab.dataset.tretaView===(rota?.secao==='loja' && ABAS_LOJA[rota.loja] || 'skins')) || tabs[0];if(alvo && alvo.dataset.tretaView!==view)select(alvo,false);};
  document.addEventListener('cs-shop-open',seguirUrl);seguirUrl();
  for(const tab of tabs){tab.tabIndex=tab.dataset.tretaView==='skins'?0:-1;tab.onclick=()=>select(tab);tab.onkeydown=e=>{
    const i=tabs.indexOf(tab),next=e.key==='ArrowRight'?(i+1)%tabs.length:e.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:e.key==='Home'?0:e.key==='End'?tabs.length-1:null;
    if(next===null)return;e.preventDefault();select(tabs[next]);tabs[next].focus();
  };}
}

export function initTretaStore({skipPrompt=false,onEquipped=()=>{}}={}) {
  if(!$('hub-shop'))return;
  onEquip=onEquipped;initTretaRewards();initProposals();
  $('treta-retry').onclick=()=>void refresh();
  const code=new URLSearchParams(location.search).get('treta');
  if(code && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(code))stored('cs_treta_referral',code);
  $('treta-buy').onclick=()=>void buy();
  ligarCompartilhar($('treta-share'),()=>({titulo:'Loja do CORO SOLTO',texto:`Olha a skin ${$('treta-detail-name').textContent} na loja do CORO SOLTO.`,url:linkCompartilhavel('/loja','skin')}));
  $('treta-preview-retry').onclick=()=>{if(selected)void detail(selected,false);};
  for(const button of document.querySelectorAll('[data-treta-close]'))button.onclick=()=>button.closest('dialog').close();
  for(const dialog of [$('treta-detail'),$('treta-purchase')])dialog.addEventListener('close',()=>{if(dialog.id==='treta-detail'){detailVersion++;stage?.dispose();stage=null;}else{purchaseStage?.dispose();purchaseStage=null;}});
  $('treta-info').addEventListener('close',()=>{infoVersion++;infoStage?.dispose();infoStage=null;});
  const explain=async(value=200)=>{
    const version=++infoVersion;infoStage?.dispose();infoStage=null;
    rewards($('treta-info-rewards'));stored('cs_treta_intro','v1');openDialog($('treta-info'));
    const loaded=await visual($('treta-info-coin'),{...TRETA_COIN_ART,coin:true});
    if(version!==infoVersion || !$('treta-info').open)loaded.dispose();else infoStage=loaded;
  };
  $('treta-how').onclick=()=>void explain();$('treta-balance').onclick=()=>void explain();
  $('treta-solo').onclick=()=>{if(!state?.authenticated){login();return;}document.dispatchEvent(new CustomEvent('cs-treta-solo'));};
  $('treta-info-login').onclick=()=>{$('treta-info').close();login();};
  const introCoin=node('img');introCoin.src=TRETA_COIN_ART.poster;introCoin.alt='Moeda TRETA$ do Saci';$('treta-info-coin').append(introCoin);
  $('treta-coins').replaceChildren(...TRETA_COINS.map(c=>{const e=node('button','','treta-coin-card');e.type='button';e.onclick=()=>void explain(c.value);const text=node('div');text.append(node('b',money(c.value)),node('small',c.name));const img=node('img');img.src=c.poster;img.alt=`Moeda ${money(c.value)} com ${c.name}`;img.loading='lazy';e.append(img,text);return e;}));
  for(const button of document.querySelectorAll('[data-treta-filter]'))button.onclick=()=>{filter=button.dataset.tretaFilter;for(const b of document.querySelectorAll('[data-treta-filter]'))b.setAttribute('aria-pressed',String(b===button));draw();};
  $('treta-invite').onclick=async()=>{if(!state?.wallet){login();return;}const url=new URL('/',location.origin);url.searchParams.set('treta',state.wallet.referral_code);try{await navigator.clipboard.writeText(url.href);$('treta-status').textContent='Convite copiado. Envie para sua turma!';}catch{$('treta-status').textContent=`Seu convite: ${url.href}`;}};
  setInterval(()=>{if(account?.authenticated && !document.hidden)void refresh();},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && account?.authenticated)void refresh();});
  document.addEventListener('cs-match-end',()=>{for(const delay of [2000,12000,30000])setTimeout(()=>{if(account?.authenticated)void refresh();},delay);});
  document.addEventListener('cs-shop-open',()=>{storeEvent('visit');void refresh();});
  document.addEventListener('cs-account-change',event=>{accountEpoch++;account=event.detail;state=null;selected=null;updateTretaRewards(null);for(const id of ['treta-detail','treta-purchase'])if($(id).open)$(id).close();draw();updateBuy();notifyEquipment();void refresh();});
  // Apresentação só depois da 1ª partida, quando o convite pós-partida (login-prompt.js) já decidiu.
  document.addEventListener('cs-pos-partida',event=>{
    if(event.detail?.treta){stored('cs_treta_intro','v1');return;}   // o convite já mostrou os T$
    if(document.documentElement.dataset.ui==='v3'){stored('cs_treta_intro','v1');return;}   // Treta Pop: a carteira só abre por clique
    if(skipPrompt || stored('cs_treta_intro') || $('main-menu')?.classList.contains('hidden') || document.querySelector('dialog[open]'))return;
    explain();
  });
  draw();
  const manifestsReady=()=>{draw();notifyEquipment();if(selected && $('treta-detail').open)void detail(selected,false);};
  void fetch('/models/skins/manifest.json').then(r=>{if(!r.ok)throw new Error('manifest_unavailable');return r.json();}).then(data=>{manifest=data;manifestsReady();}).catch(()=>{});
  if(TRETA_ITEMS_ENABLED)void fetch('/models/items/eyewear-manifest.json').then(r=>{if(!r.ok)throw new Error('manifest_unavailable');return r.json();}).then(data=>{eyeManifest=data;manifestsReady();}).catch(()=>{});
  void loadAccount().then(auth=>{account=auth;}).catch(()=>{});
  void refresh();
}
