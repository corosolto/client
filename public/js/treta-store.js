import {initTretaRewards,updateTretaRewards} from './treta-rewards.js';
import {TRETA_SKINS,TRETA_COINS,TRETA_DEFAULT_REWARDS,tretaChange} from './treta-catalog.js';
import {TRETA_PACK_PROPOSALS,TRETA_FUTURE_PACK,TRETA_ACCESSORY_PROPOSALS} from './treta-proposals.js';
import {loadAccount,socialApi} from './account-entry.js';

const node=(tag,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
const errors={account_required:'Entre e escolha seu nick para guardar seus T$.',insufficient_balance:'Ainda faltam T$ para esta skin. Ganhe mais jogando e convidando amigos.',skin_unavailable:'Esta skin está sendo produzida. A compra abre quando o modelo estiver pronto.',request_reused:'Este pedido já foi usado. Atualize a carteira.',skin_not_owned:'Esta skin ainda não está no seu armário.',referral_ineligible:'Este convite não é elegível para a recompensa.',rate_limited:'Espere um momento antes de tentar novamente.'};
const errorText=e=>errors[e.message] || 'A carteira está indisponível agora. Tente novamente em instantes.';
const money=value=>`T$ ${new Intl.NumberFormat('pt-BR').format(value)}`;
const stored=(key,value)=>{try{if(value===undefined)return localStorage.getItem(key);localStorage.setItem(key,value);}catch{return null;}};
let state=null,manifest={skins:{}},selected=null,filter='all',stage=null,purchaseStage=null,refreshPromise=null,account=null;
let onEquip=()=>{},infoStage=null,infoVersion=0;
let accountEpoch=0,refreshEpoch=-1,loading=false,refreshFailed=false,purchasePending=false,view='skins',detailVersion=0,previewReady=false,previewLoading=false;
const $=id=>document.getElementById(id);
const owned=id=>state?.inventory?.some(s=>s.skin_id===id);
const equipped=id=>state?.inventory?.some(s=>s.skin_id===id && s.equipped);
const item=id=>state?.catalog?.find(s=>s.id===id);
const available=id=>item(id)?.available===true && manifest.skins[id]?.approved===true && manifest.skins[id]?.character===item(id).character_id && item(id).model_path===manifest.skins[id].model;
export function equippedTretaSkin(characterId) {
  const skin=state?.inventory?.find(s=>s.equipped && available(s.skin_id));
  return skin && item(skin.skin_id)?.character_id===characterId?skin.skin_id:null;
}
const portrait=skin=>manifest.skins[skin.id]?.poster || `/img/chars/${skin.character}.webp`;

function rewards(container) {
  const campaign=state?.campaign || TRETA_DEFAULT_REWARDS;
  container.replaceChildren(...[['email_reward','Conta com email confirmado'],['referral_reward','Amigo que concluiu a partida'],['sp_reward','Partida solo confirmada'],['mp_reward','Partida multiplayer confirmada']].map(([key,label])=>{
    const e=node('div','','treta-reward');e.append(node('b',money(campaign[key])),node('span',label));return e;
  }));
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
  $('treta-view-title').replaceChildren(node('span',view==='packs'?'PACKS ':view==='accessories'?'SEU ':'LOJA '),node('em',view==='packs'?'TRETA$':view==='accessories'?'DRIP':filter==='owned'?'E ARMÁRIO':'DE SKINS'));
  $('treta-view-description').textContent=view==='packs'?'Saldo para o seu próximo visual.':view==='accessories'?'Mais jeitos de vestir seu coro.':filter==='owned'?'Seus visuais, prontos para a próxima partida.':'Seu estilo entra em jogo.';
  const skins=TRETA_SKINS.filter(s=>filter==='owned'?owned(s.id):filter==='drip'?s.id.endsWith('-drip'):true);
  $('treta-grid').replaceChildren(...skins.map(s=>{
    const button=node('button','','treta-card');button.type='button';button.style.setProperty('--skin-color',s.color);
    const label=node('span',refreshFailed?'CONSULTA INDISPONÍVEL':loading?'CONSULTANDO…':equipped(s.id)?'EQUIPADA':owned(s.id)?'NO SEU ARMÁRIO':available(s.id)?manifest.skins[s.id]?.poster?'NOVA SKIN':'PRÉVIA 3D NO DETALHE':'EM PRODUÇÃO','treta-label');
    const image=node('img');image.src=portrait(s);image.alt=manifest.skins[s.id]?.poster?`Skin ${s.name}`:'Personagem base usado como referência de produção';image.loading='lazy';
    const copy=node('div','','treta-card-copy');const price=node('b',money(item(s.id)?.price ?? s.price));price.append(node('span',owned(s.id)?'VER SKIN':'VER DETALHE'));
    copy.append(node('small',manifest.skins[s.id]?.poster?s.series:`${s.series} · PERSONAGEM BASE`),node('strong',s.name),price);
    button.append(label,image,copy);button.onclick=()=>void detail(s);return button;
  }));
  if(!skins.length){
    const empty=node('div','','treta-empty');empty.append(node('strong',loading?'CARREGANDO ARMÁRIO':refreshFailed?'ARMÁRIO INDISPONÍVEL':'SEU PRÓXIMO VISUAL COMEÇA AQUI'),node('p',loading?'Buscando seus visuais na conta.':refreshFailed?'Tente de novo para consultar suas skins.':state?.authenticated?'As skins que você adquirir vão aparecer aqui.':'Entre na conta para ver seus visuais.'),node('button','VER TODAS AS SKINS','treta-secondary'));
    empty.lastChild.type='button';empty.lastChild.onclick=()=>document.querySelector('[data-treta-filter=all]').click();$('treta-grid').append(empty);
  }
  rewards($('treta-rewards'));rewards($('treta-info-rewards'));
  const c=state?.campaign,active=c?.starts_at && Date.now()>=Date.parse(c.starts_at) && Date.now()<Date.parse(c.ends_at);
  $('treta-campaign-status').textContent=active?`Campanha até ${new Date(c.ends_at).toLocaleDateString('pt-BR')}. Limite de partidas: ${money(c.daily_match_cap)} por dia (UTC).`:'A campanha do primeiro mês ainda não está ativa. Estes são os valores previstos.';
  $('treta-promo-copy').textContent=active?`Sua conta vale ${money(c.email_reward)}. Cada amigo elegível vale ${money(c.referral_reward)}.`:'A campanha de lançamento abrirá junto da loja. Veja como juntar seus T$.';
  $('treta-solo').disabled=!active;
  $('treta-solo').textContent=active?'JOGAR SOLO POR T$ ▸':'SOLO POR T$ · EM BREVE';
  $('treta-info-login').hidden=!!account?.authenticated;
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
    if(epoch!==accountEpoch)return;loading=false;draw();updateBuy();
  })().finally(()=>{if(refreshPromise===request)refreshPromise=null;});
  refreshPromise=request;return request;
}
async function visual(host,{model,poster,coin=false,celebrate=false,count=1}) {
  host.replaceChildren();
  const fallback=node('img');fallback.src=poster;fallback.alt=coin?'Moeda dourada TRETA$':'Prévia visual da skin';host.append(fallback);
  if(!model)return {loaded:false,dispose(){}};
  let display;
  try{const {TretaStage}=await import('./treta-stage.js');display=new TretaStage(host,{coin,celebrate,count});await display.load(model);fallback.remove();display.loaded=true;return display;}catch{display?.dispose();return {loaded:false,dispose(){}};}
}
async function detail(skin) {
  const version=++detailVersion;
  selected=skin;stage?.dispose();stage=null;previewReady=false;previewLoading=available(skin.id);
  $('treta-preview-retry').hidden=true;
  $('treta-detail-name').textContent=skin.name;$('treta-detail-series').textContent=skin.series;
  $('treta-detail-description').textContent=skin.description;$('treta-detail-price').textContent=money(item(skin.id)?.price ?? skin.price);
  $('treta-detail-production').textContent=previewLoading?'Carregando prévia 3D da skin…':refreshFailed?'Consulta indisponível. Feche o detalhe e tente atualizar a carteira.':'Em produção. A imagem abaixo é a referência do personagem base; o visual final terá roupas e acessórios novos.';
  $('treta-buy-status').textContent='';updateBuy();openDialog($('treta-detail'));
  const loaded=await visual($('treta-stage'),{model:available(skin.id)?manifest.skins[skin.id].model:null,poster:portrait(skin)});
  if(version!==detailVersion || !$('treta-detail').open){loaded.dispose();return;}
  stage=loaded;previewLoading=false;previewReady=loaded.loaded || !!manifest.skins[skin.id]?.poster;
  if(available(skin.id)){
    $('treta-detail-production').textContent=loaded.loaded?'Prévia 3D da skin.':previewReady?'Prévia 3D indisponível. Veja a imagem da skin.':'Prévia 3D indisponível. Esta imagem é do personagem base. Tente novamente para ver a skin antes de comprar.';
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
  button.textContent=!available(selected.id)?'EM PRODUÇÃO':equipped(selected.id)?'JÁ EQUIPADA':owned(selected.id)?'EQUIPAR SKIN':state?.wallet?`COMPRAR POR ${money(item(selected.id).price)}`:'ENTRAR PARA COMPRAR';
  if(equipped(selected.id))button.disabled=true;
}
async function equip(skin) {
  const epoch=accountEpoch,owner=state?.accountId;
  const result=await socialApi('/api/treta',{action:'equip',skinId:skin.id});
  if(epoch!==accountEpoch || result.accountId!==owner)return false;
  state=result;
  draw();updateBuy();
  onEquip({...skin,model:manifest.skins[skin.id].model});
  document.dispatchEvent(new CustomEvent('cs-skin-equipped',{detail:{skinId:skin.id,characterId:skin.character,model:manifest.skins[skin.id].model}}));
  return true;
}
async function buy() {
  if(purchasePending || loading || refreshFailed || !selected || !available(selected.id) || (!owned(selected.id) && !previewReady))return;
  if(!state?.authenticated){$('treta-detail').close();login();return;}
  const skin=selected,epoch=accountEpoch,owner=state.accountId;
  let revealPoster=portrait(skin);try{if(stage)revealPoster=stage.snapshot();}catch{}
  purchasePending=true;updateBuy();
  try {
    if(owned(skin.id)){if(!await equip(skin))return;$('treta-buy-status').textContent='Skin equipada para a próxima partida.';return;}
    const result=await socialApi('/api/treta',{action:'purchase',skinId:skin.id,requestId:crypto.randomUUID()});
    if(epoch!==accountEpoch || result.accountId!==owner)return;
    state=result;draw();$('treta-detail').close();
    const reveal=$('treta-purchase-item');reveal.src=revealPoster;reveal.alt=`${skin.name} adicionada ao armário`;reveal.hidden=false;
    $('treta-purchase-title').textContent=result.purchase.owned?'JÁ É SUA':`${skin.name.toUpperCase()}`;
    $('treta-purchase-copy').textContent=result.purchase.owned?'A skin já estava no seu armário.':`${money(result.purchase.spent)} investidos no drip. Saldo: ${money(result.wallet.balance)}.`;
    $('treta-purchase-equip').onclick=async()=>{const b=$('treta-purchase-equip');b.disabled=true;try{if(!await equip(skin))return;$('treta-purchase-copy').textContent='Skin equipada para a próxima partida.';$('treta-purchase').close();}catch(e){$('treta-purchase-copy').textContent=errorText(e);}finally{b.disabled=false;}};
    openDialog($('treta-purchase'));purchaseStage?.dispose();
    const coin=tretaChange(result.purchase.spent || 0)[0];
    const display=result.purchase.owned
      ? {model:manifest.skins[skin.id].model,poster:portrait(skin)}
      : {model:`/models/treta/coin-${coin.value}.glb`,poster:`/img/treta/coin-${coin.value}.png`,coin:true,celebrate:true,count:coin.count};
    const loaded=await visual($('treta-purchase-stage'),display);
    if(epoch!==accountEpoch || !$('treta-purchase').open)loaded.dispose();else purchaseStage=loaded;
  }catch(e){if(epoch===accountEpoch)$('treta-buy-status').textContent=errorText(e);}
  finally{purchasePending=false;updateBuy();}
}

function initProposals() {
  const brl=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
  $('treta-packs').replaceChildren(...TRETA_PACK_PROPOSALS.map(pack=>{
    const card=node('article','','treta-pack'),image=node('img');image.src='/img/treta/coin-1000.png';image.alt='Moeda TRETA$';image.loading='lazy';
    const button=node('button','EM PREPARAÇÃO','treta-primary');button.type='button';button.disabled=true;
    card.append(node('small',pack.label),image,node('strong',money(pack.amount)),node('b',brl(pack.brlCents)),node('span',pack.priceStatus==='owner'?'PREÇO DEFINIDO':'PREÇO PROPOSTO','treta-pack-status'),node('p',`${money(pack.amount)} no total. ${pack.priceStatus==='owner'?'Valor definido para este pack.':'Valor em revisão.'}`),button);return card;
  }));
  $('treta-future-pack').textContent=`Para uma próxima etapa: ${money(TRETA_FUTURE_PACK.amount)} por ${brl(TRETA_FUTURE_PACK.brlCents)}. Quarta opção e preço ainda em proposta.`;
  $('treta-accessories').replaceChildren(...TRETA_ACCESSORY_PROPOSALS.map(a=>{const card=node('article','','treta-accessory');card.append(node('span',a.mark),node('h4',a.name),node('p',a.description),node('p',a.compatibility),node('small','EM ESTUDO · SEM VENDA ATIVA'));return card;}));
  const tabs=[...document.querySelectorAll('[data-treta-view]')];
  const select=button=>{
    view=button.dataset.tretaView;
    for(const tab of tabs){const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;$(tab.getAttribute('aria-controls')).hidden=!active;}draw();
  };
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
  $('treta-preview-retry').onclick=()=>{if(selected)void detail(selected);};
  for(const button of document.querySelectorAll('[data-treta-close]'))button.onclick=()=>button.closest('dialog').close();
  for(const dialog of [$('treta-detail'),$('treta-purchase')])dialog.addEventListener('close',()=>{if(dialog.id==='treta-detail'){detailVersion++;stage?.dispose();stage=null;}else{purchaseStage?.dispose();purchaseStage=null;}});
  $('treta-info').addEventListener('close',()=>{infoVersion++;infoStage?.dispose();infoStage=null;});
  const explain=async(value=200)=>{
    const version=++infoVersion;infoStage?.dispose();infoStage=null;
    rewards($('treta-info-rewards'));stored('cs_treta_intro','v1');openDialog($('treta-info'));
    const loaded=await visual($('treta-info-coin'),{model:`/models/treta/coin-${value}.glb`,poster:`/img/treta/coin-${value}.png`,coin:true});
    if(version!==infoVersion || !$('treta-info').open)loaded.dispose();else infoStage=loaded;
  };
  $('treta-how').onclick=()=>void explain();$('treta-balance').onclick=()=>void explain();
  $('treta-solo').onclick=()=>{if(!state?.authenticated){login();return;}document.dispatchEvent(new CustomEvent('cs-treta-solo'));};
  $('treta-info-login').onclick=()=>{$('treta-info').close();login();};
  const introCoin=node('img');introCoin.src='/img/treta/coin-200.png';introCoin.alt='Moeda TRETA$ do Canarinho Pistola';$('treta-info-coin').append(introCoin);
  $('treta-coins').replaceChildren(...TRETA_COINS.map(c=>{const e=node('button','','treta-coin-card'),img=node('img');e.type='button';e.onclick=()=>void explain(c.value);img.src=`/img/treta/coin-${c.value}.png`;img.alt=`Moeda ${money(c.value)} com ${c.name}`;img.loading='lazy';const text=node('div');text.append(node('b',money(c.value)),node('small',c.name));e.append(img,text);return e;}));
  for(const button of document.querySelectorAll('[data-treta-filter]'))button.onclick=()=>{filter=button.dataset.tretaFilter;for(const b of document.querySelectorAll('[data-treta-filter]'))b.setAttribute('aria-pressed',String(b===button));draw();};
  $('treta-invite').onclick=async()=>{if(!state?.wallet){login();return;}const url=new URL('/',location.origin);url.searchParams.set('treta',state.wallet.referral_code);try{await navigator.clipboard.writeText(url.href);$('treta-status').textContent='Convite copiado. Envie para sua turma!';}catch{$('treta-status').textContent=`Seu convite: ${url.href}`;}};
  setInterval(()=>{if(account?.authenticated && !document.hidden)void refresh();},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && account?.authenticated)void refresh();});
  document.addEventListener('cs-match-end',()=>{for(const delay of [2000,12000,30000])setTimeout(()=>{if(account?.authenticated)void refresh();},delay);});
  document.addEventListener('cs-shop-open',()=>void refresh());
  document.addEventListener('cs-account-change',event=>{accountEpoch++;account=event.detail;state=null;selected=null;updateTretaRewards(null);for(const id of ['treta-detail','treta-purchase'])if($(id).open)$(id).close();draw();updateBuy();void refresh();});
  $('account-entry-dialog')?.addEventListener('close',()=>{if(!skipPrompt && !stored('cs_treta_intro'))explain();});
  let accountReady=false;
  const introObserver=new MutationObserver(()=>{
    if(skipPrompt || !accountReady || stored('cs_treta_intro') || $('boot-splash') || $('main-menu')?.classList.contains('hidden') || document.querySelector('dialog[open]'))return;
    explain();introObserver.disconnect();
  });
  introObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
  draw();
  void fetch('/models/skins/manifest.json').then(r=>{if(!r.ok)throw new Error('manifest_unavailable');return r.json();}).then(data=>{manifest=data;draw();}).catch(()=>{});
  void loadAccount().then(auth=>{account=auth;}).catch(()=>{}).finally(()=>{accountReady=true;});
  void refresh();
}
