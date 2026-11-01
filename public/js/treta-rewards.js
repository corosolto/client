import { tr, frase } from './i18n.js';
import {TRETA_COIN_ART} from './treta-catalog.js';
const reason={email:'EMAIL CONFIRMADO',referral:'AMIGO NA TRETA',singleplayer:'PARTIDA SOLO CONCLUÍDA',multiplayer:'PARTIDA MULTIPLAYER CONCLUÍDA'};
const format=amount=>new Intl.NumberFormat('pt-BR').format(amount);
let owner=null,queue=[],queued=new Set(),seen=new Set(),active=null,stage=null,expiry=null,pump=null;
const key=()=>`cs_treta_rewards:${owner}`;
function hide(){clearTimeout(expiry);active=null;stage?.dispose();stage=null;document.getElementById('treta-earned').hidden=true;}
function next(){
  if(active || !queue.length || document.hidden || document.querySelector('dialog[open]') || document.getElementById('boot-splash'))return;
  const reward=queue.shift();queued.delete(reward.id);active=reward;seen.add(reward.id);
  try{localStorage.setItem(key(),JSON.stringify([...seen].slice(-200)));}catch{ /* current-session dedup still works */ }
  const box=document.getElementById('treta-earned'),host=document.getElementById('treta-earned-coin');
  document.getElementById('treta-earned-value').textContent=`+T$ ${format(reward.amount)}`;
  document.getElementById('treta-earned-reason').textContent=reason[reward.kind];
  box.hidden=false;host.replaceChildren();
  const image=document.createElement('img');
  image.src=TRETA_COIN_ART.poster;image.alt='Moeda TRETA$ girando';host.append(image);
  void import('./treta-stage.js').then(async({TretaStage})=>{
    if(active!==reward)return;
    let display;
    try{display=new TretaStage(host,{coin:true});stage=display;await display.load(TRETA_COIN_ART.model);if(active!==reward)display.dispose();else image.remove();}catch{display?.dispose();if(stage===display)stage=null;}
  }).catch(()=>{ /* Keep the spinning poster if the 3D module is unavailable. */ });
  expiry=setTimeout(()=>{hide();next();},6500);
}
export function updateTretaRewards(state){
  const nextOwner=state?.authenticated?state.accountId:null;
  if(nextOwner!==owner){if(owner)hide();owner=nextOwner;queue=[];queued.clear();seen.clear();if(owner){try{const ids=JSON.parse(localStorage.getItem(key()) || '[]');if(Array.isArray(ids))seen=new Set(ids.filter(x=>typeof x==='string'));}catch{ /* storage unavailable */ }}}
  const button=document.getElementById('hub-treta-wallet');
  document.getElementById('hub-treta-total').textContent=state?.wallet?`T$ ${format(state.wallet.balance)}`:owner?'T$ —':`T$ · ${tr('ENTRAR')}`;
  button.setAttribute('aria-label',state?.wallet?frase('carteiraSaldoAria',format(state.wallet.balance)):frase('carteiraEntrarAria'));
  if(!owner)return;
  for(const reward of [...(state.ledger || [])].reverse())if(reason[reward.kind] && Number.isSafeInteger(reward.amount) && reward.amount>0 && !seen.has(reward.id) && !queued.has(reward.id)){queue.push(reward);queued.add(reward.id);}
  next();
}
export function initTretaRewards(){
  if(pump)return;
  // O menu fica oculto em combate; as recompensas aparecem na camada da página.
  document.body.append(document.getElementById('treta-earned'));
  document.getElementById('treta-earned-close').onclick=()=>{hide();next();};
  document.getElementById('hub-treta-wallet').onclick=()=>document.querySelector('[data-hub-tab="loja"]')?.click();
  pump=setInterval(next,600);
}
