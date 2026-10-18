/* Treta Pop · 07 loja, 09 armário, 23 mobile. Carregado por tp/ligar.js só com ?ui=v3. */
import { tretaLoja, abrirTretaSkin, equiparTretaSkin } from '../treta-store.js';
import { tr, LANG } from '../i18n.js';

/* Só os slots que o backend já guarda; fuzil, faca, spray e afins entram quando a API tiver o campo. */
const SLOTS=['visual'];
const RARIDADES=new Set(['comum','incomum','raro','epico','lendario','mitico','gambiarra']);
const NOME_RAR={comum:'COMUM',incomum:'INCOMUM',raro:'RARO',epico:'ÉPICO',lendario:'LENDÁRIO',mitico:'MÍTICO',gambiarra:'SÉRIE GAMBIARRA'};
const $=(id)=>document.getElementById(id);
const el=(tag,cls='',texto='')=>{const e=document.createElement(tag);if(cls)e.className=cls;if(texto)e.textContent=texto;return e;};
const numero=(v)=>new Intl.NumberFormat(LANG==='en'?'en-US':'pt-BR').format(v);
const moeda=(v)=>`T$ ${numero(v)}`;
const modelo=(chave,vals)=>tr(chave).replace(/\{(\w+)\}/g,(_,k)=>vals[k]);

let raiz=null,aba='weapons';

function botao(cls,texto,acao){const b=el('button',cls,texto);b.type='button';if(acao)b.onclick=acao;return b;}
function vistaLegada(){return document.querySelector('[data-treta-view][aria-selected=true]')?.dataset.tretaView || 'weapons';}
function entrar(){$('hub-account-login')?.click();}
/* Ícone por tipo de quest (pedido do dono 15/10): a placa entra pela camada tp, o card continua do treta-store. */
const QUEST_ICONES={
  email:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  referral:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M19 8v6M16 11h6"/>',
  singleplayer:'<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  multiplayer:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.5c2.3.3 4 1.9 4.6 4.5"/>',
};
const QUEST_ICONE_GERAL='<path d="M4 6h16M4 12h10M4 18h7"/>';
function decorarQuests(){
  for(const c of document.querySelectorAll('#treta-quests [data-quest]')){
    if(c.querySelector(':scope > .tp-loja-quest-icone'))continue;
    const placa=el('span','tp-loja-quest-icone');
    placa.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${QUEST_ICONES[c.dataset.quest]||QUEST_ICONE_GERAL}</svg>`;
    const corpo=el('div','tp-loja-quest-corpo');
    corpo.append(...c.childNodes);
    c.append(placa,corpo);
  }
}
function raridade(s){return RARIDADES.has(s.raridade)?s.raridade:'';}
function cartao(s,d){
  const b=botao('tp-card tp-loja__cartao','',()=>abrirTretaSkin(s.id));
  b.dataset.skin=s.id;b.style.setProperty('--skin-color',s.color);
  const rar=raridade(s);
  if(rar)b.dataset.raridade=rar;
  const arte=el('span','tp-loja__arte'),img=el('img');img.src=s.poster;img.alt='';img.loading='lazy';arte.append(img);
  const info=el('span','tp-loja__info');
  if(rar)info.append(el('span','tp-loja__rar',tr(NOME_RAR[rar])));
  info.append(el('span','tp-loja__nome tp-disp',s.name));
  if(s.owned)info.append(el('span','tp-loja__meu',tr(s.equipped?'EQUIPADO':'NO SEU ARMÁRIO')));
  else if(d.failed)info.append(el('span','tp-loja__estado',tr('CONSULTA INDISPONÍVEL')));
  else if(d.loading)info.append(el('span','tp-loja__estado',tr('CONSULTANDO…')));
  else if(s.available && s.price!=null)info.append(el('span','tp-loja__preco tp-num',moeda(s.price)));
  else info.append(el('span','tp-loja__estado',tr('EM PRODUÇÃO')));
  b.setAttribute('aria-label',`${s.name}. ${info.lastChild.textContent}`);
  b.append(arte,info);return b;
}

function meta(rotulo,texto,p){
  const m=el('div','tp-loja__meta'),topo=el('span','tp-loja__meta-topo'),barra=el('span','tp-barra');
  topo.append(el('span','',rotulo),el('span','tp-num',texto));
  barra.append(el('i'));barra.style.setProperty('--p',String(Number.isFinite(p)?Math.max(0,Math.min(1,p)):0));
  m.append(topo,barra);return m;
}

function desenharLoja(painel,d,categoria){
  const slots={weapons:new Set(['weapon']),items:new Set(['character','glove','eyewear']),packs:new Set(['pack'])};
  const itens=d.itens.filter((s)=>slots[categoria]?.has(s.slot));
  const grade=el('div','tp-loja__grade');
  grade.append(...itens.map((s)=>cartao(s,d)));
  const rodape=el('div','tp-loja__rodape'),ganhe=el('div','tp-painel tp-loja__ganhe');
  ganhe.append(el('span','tp-disp tp-loja__ganhe-titulo',tr('GANHE T$')));
  if(d.authenticated && d.campanha){
    ganhe.append(meta(tr('Partidas hoje'),`T$ ${d.ganhoHoje} / ${d.tetoDiario}`,d.ganhoHoje/d.tetoDiario),
      meta(modelo('Chame sua turma · T$ {v} por amigo',{v:d.porAmigo}),`${d.amigos} / ${d.tetoAmigos}`,d.amigos/d.tetoAmigos),
      botao('tp-btn tp-loja__convite',tr('COPIAR CONVITE'),()=>$('treta-invite')?.click()));
  } else if(!d.authenticated){
    ganhe.append(el('span','tp-loja__ganhe-texto',tr('Entre na conta para ganhar T$ e guardar seu armário.')),botao('tp-btn tp-loja__convite',tr('ENTRAR NA CONTA'),entrar));
  } else ganhe.append(el('span','tp-loja__ganhe-texto',tr('Não há quests ativas agora. Seu saldo e seus visuais continuam na conta.')));
  rodape.append(ganhe,el('p','tp-loja__aviso',tr('Sem compra de moeda: T$ só vem de quests e partidas. Visual não dá vantagem.')));
  painel.replaceChildren(grade,rodape);
}


function posicionarRisco(){
  const nav=raiz?.querySelector('.tp-loja__abas'),sel=nav?.querySelector('[aria-selected=true]'),risco=nav?.querySelector('.tp-abas__risco');
  if(!sel || !risco)return;
  risco.style.setProperty('--x',`${sel.offsetLeft}px`);risco.style.setProperty('--w',String(sel.offsetWidth));
}

function render(){
  if(!raiz)return;
  const d=tretaLoja(),legada=vistaLegada();if(['weapons','items','packs'].includes(legada))aba=legada;const atual=legada==='quests'?'ganhar':aba;
  raiz.querySelector('.tp-loja__saldo').textContent=d.saldo!=null?numero(d.saldo):'—';
  for(const t of raiz.querySelectorAll('.tp-loja__abas [role=tab]')){const on=t.dataset.tpAba===atual;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;}
  for(const p of raiz.querySelectorAll('.tp-loja__painel'))p.hidden=legada==='quests' || p.dataset.painel!==aba;
  if(legada!=='quests')desenharLoja(raiz.querySelector(`[data-painel=${aba}]`),d,aba);
  posicionarRisco();
}

function irPara(alvo){
  if(alvo==='ganhar')document.querySelector('[data-treta-view=quests]')?.click();
  else{aba=alvo;document.querySelector(`[data-treta-view=${alvo}]`)?.click();}
  render();
}

function montar(){
  raiz=el('div','tp-loja');
  const topo=el('header','tp-loja__topo'),titulo=el('h2','tp-loja__titulo tp-disp'),it=el('span','tp-ital'),em=el('em','',tr('TRETA'));
  if(LANG==='en')it.append(em,` ${tr('LOJA DA')}`);else it.append(`${tr('LOJA DA')} `,em);
  titulo.append(it);
  const nav=el('nav','tp-abas tp-loja__abas');nav.setAttribute('role','tablist');nav.setAttribute('aria-label',tr('Seções da loja'));
  for(const [id,rot] of [['weapons','ARMAS'],['items','ITENS'],['packs','PACKS'],['ganhar','GANHAR T$']]){
    const t=botao('tp-aba',tr(rot),()=>irPara(id));t.setAttribute('role','tab');t.dataset.tpAba=id;
    t.onkeydown=(e)=>{
      const tabs=[...nav.querySelectorAll('[role=tab]')],i=tabs.indexOf(t),n=e.key==='ArrowRight'?(i+1)%tabs.length:e.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:null;
      if(n===null)return;e.preventDefault();irPara(tabs[n].dataset.tpAba);tabs[n].focus();
    };
    nav.append(t);
  }
  nav.append(el('span','tp-abas__risco'));
  const carteira=el('div','tp-loja__carteira'),ic=el('span','tp-loja__moeda tp-disp','T$');ic.setAttribute('aria-hidden','true');
  carteira.append(ic,el('b','tp-loja__saldo tp-num','—'),botao('tp-btn tp-loja__ganhar',tr('GANHAR MAIS'),()=>irPara('ganhar')));
  topo.append(titulo,nav,carteira);
  const panels=['weapons','items','packs'].map((id)=>{const panel=el('section','tp-loja__painel');panel.dataset.painel=id;panel.setAttribute('role','tabpanel');return panel;});
  raiz.append(topo,...panels);
  $('hub-shop').prepend(raiz);
  new ResizeObserver(posicionarRisco).observe(nav);
  document.fonts?.ready.then(posicionarRisco);
}

export function ligar(){
  if(!$('hub-shop') || raiz)return;
  montar();
  document.addEventListener('cs-treta-state',render);
  document.addEventListener('cs-treta-state',decorarQuests);
  const quests=$('treta-quests');
  if(quests)new MutationObserver(decorarQuests).observe(quests,{childList:true});
  decorarQuests();
  render();
}
