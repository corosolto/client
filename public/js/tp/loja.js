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

let raiz=null,aba='loja',filtro='todos',escolhido=null,equipando=false;

function botao(cls,texto,acao){const b=el('button',cls,texto);b.type='button';if(acao)b.onclick=acao;return b;}
function vistaLegada(){return document.querySelector('[data-treta-view=quests]')?.getAttribute('aria-selected')==='true'?'quests':'skins';}
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

function desenharLoja(painel,d){
  const grade=el('div','tp-loja__grade');
  grade.append(...d.itens.map((s)=>cartao(s,d)));
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

function acaoPrimaria(sel,d){
  const prim=botao('tp-btn tp-btn--primario tp-loja__acao','');
  if(!d.authenticated){prim.textContent=tr('ENTRAR NA CONTA');prim.onclick=entrar;}
  else if(!sel){prim.textContent=tr('EQUIPAR');prim.disabled=true;}
  else if(sel.equipped){prim.textContent=`${tr('EQUIPADO')} ✓`;prim.disabled=true;prim.dataset.estado='equipado';}
  else if(sel.owned){prim.textContent=tr('EQUIPAR');prim.disabled=equipando || !sel.available;prim.onclick=async()=>{
    equipando=true;prim.disabled=true;
    try{await equiparTretaSkin(sel.id);}catch{const st=$('treta-status');if(st)st.textContent=tr('Não deu para equipar agora. Tente de novo.');}finally{equipando=false;render();}
  };}
  else if(sel.available && sel.price!=null){prim.textContent=tr('DESBLOQUEAR VISUAL');prim.onclick=()=>abrirTretaSkin(sel.id);}
  else {prim.textContent=tr('EM PRODUÇÃO');prim.disabled=true;}
  return prim;
}

function desenharArmario(painel,d){
  const itens=d.itens,meus=itens.filter((s)=>s.owned),equipada=itens.find((s)=>s.equipped);
  if(!itens.some((s)=>s.id===escolhido))escolhido=(equipada || meus[0] || itens[0])?.id || null;
  const sel=itens.find((s)=>s.id===escolhido);
  const palco=el('div','tp-loja__palco');
  if(sel){
    const fig=el('img','tp-loja__figura');fig.src=sel.poster;fig.alt='';
    const titulo=el('h3','tp-disp tp-loja__destaque');titulo.append(el('span','tp-ital',sel.name));
    const rar=raridade(sel),olho=el('span','tp-rotulo tp-loja__serie',rar?`${tr(NOME_RAR[rar])} · ${sel.series}`:sel.series);
    if(rar)olho.dataset.raridade=rar;
    palco.append(fig,olho,titulo,botao('tp-btn tp-btn--fantasma tp-loja__3d',tr('VER EM 3D'),()=>abrirTretaSkin(sel.id)));
  }
  const lado=el('div','tp-loja__lado'),slots=el('div','tp-loja__slots');
  for(const slot of SLOTS){
    const s=el('div','tp-loja__slot');s.dataset.slot=slot;
    const ic=el('span','tp-loja__slot-ic');
    if(equipada){const i=el('img');i.src=equipada.poster;i.alt='';ic.append(i);}
    const tx=el('span','tp-loja__slot-tx');tx.append(el('span','tp-rotulo',tr('VISUAL')),el('b','',equipada?.name || tr('Personagem base')));
    s.append(ic,tx);slots.append(s);
  }
  const barra=el('div','tp-loja__filtros'),cont=el('h3','tp-disp tp-loja__contagem'),grupo=el('span','tp-loja__chips');
  cont.append(el('span','tp-ital',modelo('VISUAIS · {n} DE {m}',{n:meus.length,m:itens.length})));
  grupo.setAttribute('role','group');grupo.setAttribute('aria-label',tr('Filtrar visuais'));
  for(const [f,rot] of [['todos','TODOS'],['meus','MEUS']]){
    const b=botao('tp-loja__chip',tr(rot),()=>{filtro=f;render();});b.dataset.filtro=f;b.setAttribute('aria-pressed',String(filtro===f));grupo.append(b);
  }
  barra.append(cont,grupo);
  const grade=el('div','tp-loja__itens');
  for(const s of itens.filter((x)=>filtro!=='meus' || x.owned)){
    const b=botao('tp-card tp-loja__item','',()=>{escolhido=s.id;render();});
    b.dataset.skin=s.id;b.style.setProperty('--skin-color',s.color);b.setAttribute('aria-pressed',String(s.id===escolhido));
    if(raridade(s))b.dataset.raridade=raridade(s);
    if(!s.owned)b.dataset.trancado='';
    const img=el('img');img.src=s.poster;img.alt='';img.loading='lazy';
    b.append(img,el('span','tp-loja__item-nome tp-disp',s.name));
    if(s.equipped)b.append(el('span','tp-loja__selo tp-loja__selo--equipado',tr('EQUIPADO')));
    else if(!s.owned && s.available && s.price!=null)b.append(el('span','tp-loja__selo tp-num',moeda(s.price)));
    grade.append(b);
  }
  const acao=el('div','tp-painel tp-loja__equipar');
  acao.append(el('p','',tr('Visual é só cosmético: mesmo dano, velocidade e hitbox. O equipado entra com você na próxima partida.')),acaoPrimaria(sel,d));
  lado.append(slots,barra,grade,acao);
  painel.replaceChildren(palco,lado);
}

function posicionarRisco(){
  const nav=raiz?.querySelector('.tp-loja__abas'),sel=nav?.querySelector('[aria-selected=true]'),risco=nav?.querySelector('.tp-abas__risco');
  if(!sel || !risco)return;
  risco.style.setProperty('--x',`${sel.offsetLeft}px`);risco.style.setProperty('--w',String(sel.offsetWidth));
}

function render(){
  if(!raiz)return;
  const d=tretaLoja(),legada=vistaLegada(),atual=legada==='quests'?'ganhar':aba;
  raiz.querySelector('.tp-loja__saldo').textContent=d.saldo!=null?numero(d.saldo):'—';
  for(const t of raiz.querySelectorAll('.tp-loja__abas [role=tab]')){const on=t.dataset.tpAba===atual;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;}
  for(const p of raiz.querySelectorAll('.tp-loja__painel'))p.hidden=legada==='quests' || p.dataset.painel!==aba;
  if(legada!=='quests')(aba==='armario'?desenharArmario:desenharLoja)(raiz.querySelector(`[data-painel=${aba}]`),d);
  requestAnimationFrame(posicionarRisco);
}

function irPara(alvo){
  if(alvo==='ganhar')document.querySelector('[data-treta-view=quests]')?.click();
  else{aba=alvo;if(vistaLegada()!=='skins')document.querySelector('[data-treta-view=skins]')?.click();}
  render();
}

function montar(){
  raiz=el('div','tp-loja');
  const topo=el('header','tp-loja__topo'),titulo=el('h2','tp-loja__titulo tp-disp'),it=el('span','tp-ital'),em=el('em','',tr('TRETA'));
  if(LANG==='en')it.append(em,` ${tr('LOJA DA')}`);else it.append(`${tr('LOJA DA')} `,em);
  titulo.append(it);
  const nav=el('nav','tp-abas tp-loja__abas');nav.setAttribute('role','tablist');nav.setAttribute('aria-label',tr('Seções da loja'));
  for(const [id,rot] of [['loja','SKINS'],['armario','ARMÁRIO'],['ganhar','GANHAR T$']]){
    const t=botao('tp-aba',tr(rot),()=>irPara(id));t.setAttribute('role','tab');t.dataset.tpAba=id;
    t.onkeydown=(e)=>{
      const tabs=[...nav.querySelectorAll('[role=tab]')],i=tabs.indexOf(t),n=e.key==='ArrowRight'?(i+1)%tabs.length:e.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:null;
      if(n===null)return;e.preventDefault();irPara(tabs[n].dataset.tpAba);tabs[n].focus();
    };
    nav.append(t);
  }
  nav.append(el('span','tp-abas__risco'));
  const carteira=el('div','tp-loja__carteira'),ic=el('img','tp-loja__moeda');ic.src='/img/treta/coin-classic-saci.webp';ic.alt='';ic.width=30;ic.height=30;ic.setAttribute('aria-hidden','true');
  carteira.append(ic,el('b','tp-loja__saldo tp-num','—'),botao('tp-btn tp-loja__ganhar',tr('GANHAR MAIS'),()=>irPara('ganhar')));
  topo.append(titulo,nav,carteira);
  const pLoja=el('section','tp-loja__painel'),pArm=el('section','tp-loja__painel tp-loja__armario');
  pLoja.dataset.painel='loja';pArm.dataset.painel='armario';
  for(const p of [pLoja,pArm])p.setAttribute('role','tabpanel');
  raiz.append(topo,pLoja,pArm);
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
