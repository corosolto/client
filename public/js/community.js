import {mountAccountEntry,mountProfilePreferences,mountAccountIntegrations,loadAccount,loadAuthOptions,acceptAccount,logoutAccount} from './account-entry.js';
import {rankingTable,profileSocialLinks,profileSocialLink} from './ranking-player.js';
import {careerRankBadge,careerRankTitle} from './career-rank.js';
import {questList} from './community-inbox.js';
import {accountVerifiedBadge} from './account-verified.js';
import {profileCharacterCard} from './profile-character.js';
import {abrirConviteAmigos} from './convida-amigos.js';
import {WEAPONS} from './data/weapons.js';
const root=document.getElementById('community');
if(root) {
  const status=document.getElementById('social-status'),account=document.getElementById('social-account'),content=document.getElementById('social-content');
  let loginConfig={providers:[]};
  let inboxSection='quests',conversation=null,conversationBefore=null,messageDraft='',messageClientId=null,pendingSend=null;
  let auth=null,state=null,tab=root.dataset.tab || 'profile',profileId=root.dataset.profile || new URLSearchParams(location.search).get('perfil') || '',rankingScope='global',rankingQuery='',rankingOffset=0,rankingPeriod='all',rankingMode='all',rankingGameType='all',loadVersion=0;
  // Perfil compartilhado (/u/<perfil>, ou o link antigo com ?perfil=) chega com o perfil como destino: o painel da conta começa recolhido para o perfil ficar no topo.
  if(new URLSearchParams(location.search).get('perfil') || /^\/u\/[^/]/.test(location.pathname || ''))account.closest?.('details')?.removeAttribute('open');
  // O SSR de /u/<perfil> manda o perfil legível ao lado da comunidade (crawler e sem JS). Com a comunidade no ar, ela desenha o perfil.
  document.getElementById?.('perfil-ssr')?.remove();
  const errors={handle_invalid:'Use de 3 a 24 letras, números ou _. Comece com letra.',handle_taken:'Esse ID já tem dono. Escolha outro.',handle_locked:'Seu ID já foi escolhido e fica fixo para preservar os links.',nick_invalid:'Use de 2 a 14 letras, números, _ . ou -.',nick_taken:'Esse nick já está em uso. Escolha outro.',account_hidden:'Esta conta está indisponível pela moderação.',session_expired:'Sua sessão expirou. Entre de novo para continuar.',social_unavailable:'A resenha está fora do ar. Tente de novo.',social_not_configured:'A comunidade aguarda configuração do servidor.',rate_limited:'Calma, fiscal da resenha. Tente de novo em um minuto.',blocked:'Esse jogador não pode interagir com você.',room_solo:'Essa sala é solo. Entre no multiplayer para chamar amigos.',room_full:'A sala lotou. Peça outro convite.',room_closed:'Essa sala já encerrou.',room_unavailable:'O servidor da sala não respondeu.',invite_expired:'O convite venceu. Peça outro.',invite_closed:'Esse convite já foi respondido.',join_room_first:'Entre numa sala do jogo antes de convidar.',provider_unavailable:'Esse login ainda não está habilitado.',account_conflict:'Esse nick ou progresso já pertence a outra conta.',guest_invalid:'Não foi possível comprovar o convidado. Seu progresso local continua salvo.',links_invalid:'Use links HTTPS das redes indicadas.',settings_invalid:'Revise a bio e as opções de privacidade.'};
  const el=(tag,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
  const message=(text)=>{status.textContent=text;};
  async function api(path,body) {
    const requestAuth=auth;
    const r=await fetch(path,{credentials:'same-origin',headers:{'content-type':'application/json'},...(body?{method:'POST',body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
    let data;try{data=await r.json();}catch{throw new Error('social_unavailable');}
    if(!r.ok) {if(data.error==='session_expired' && requestAuth===auth){auth=null;state=null;profileId='';clearConversation();content.replaceChildren();document.getElementById('social-unread').textContent='';document.getElementById('hub-social-unread').textContent='';renderAccount();}throw new Error(data.error || 'social_unavailable');}
    return data;
  }
  // `feedback`: aviso ao lado do botão. O #social-status fica no topo da comunidade e some da tela quando o perfil rola.
  function button(text,fn,cls='',feedback=null) {
    const say=t=>{message(t);if(feedback)feedback.textContent=t;};
    const b=el('button',text,cls);b.type='button';b.onclick=async()=>{b.disabled=true;say('Só um instante…');try{await fn();say('Tá anotado.');}catch(e){say(errors[e.message] || 'Não deu certo agora. Tente de novo.');}finally{b.disabled=false;}};return b;
  }
  function link(text,href) {const a=el('a',text);a.href=href;return a;}
  const chip=(text)=>el('span',text,'social-chip');
  /* Abas da comunidade que são da conta de quem está logado (turma, central, resenha, configurações).
     No perfil de OUTRA pessoa elas saem: o visitante vê o perfil público, não a própria conta. */
  const PRIVATE_TABS=['friends','notifications','feed','settings'];let viewingOther=false;
  function syncPrivateTabs(){for(const b of document.querySelectorAll('.social-tabs button'))b.hidden=viewingOther && PRIVATE_TABS.includes(b.dataset.tab);}
  const ABAS_DO_PERFIL={'':'PERFIL',conquistas:'CONQUISTAS',partidas:'PARTIDAS',privacidade:'PRIVACIDADE'};
  const abaDaUrl=()=>(typeof location==='undefined'?'':location.pathname || '').match(/^\/u\/[^/]+\/(conquistas|partidas|privacidade)\/?$/)?.[1] || '';
  let profileAba=abaDaUrl();
  /* ADICIONAR AMIGO sem conta: guarda o pedido (1 h), abre o login da comunidade (volta para cá) e manda depois. */
  const PENDING_FRIEND='cs_amizade_pendente';
  function askLoginForFriend(p){
    try{localStorage.setItem(PENDING_FRIEND,JSON.stringify({id:p.id,url:p.url || '',at:Date.now()}));}catch{}
    profileNotice={id:p.id,text:auth?.authenticated?'Escolha seu nick em SUA CONTA. O pedido de amizade sai logo depois.':'Entre na conta em SUA CONTA. Depois do login o pedido de amizade sai sozinho.'};
    const panel=account.closest?.('details');if(panel){panel.hidden=false;panel.open=true;panel.scrollIntoView?.({block:'center',behavior:'smooth'});}
    return render();
  }
  async function completePendingFriend(){
    let pending=null;try{pending=JSON.parse(localStorage.getItem(PENDING_FRIEND) || 'null');localStorage.removeItem(PENDING_FRIEND);}catch{return;}
    if(!pending?.id || !auth?.profile || pending.id===auth.profile.id || !(Date.now()-Number(pending.at)<3600000))return;
    profileId=pending.id;tab='profile';profileAba='';
    const menu=document.getElementById('main-menu');
    if(menu?.dataset.hubTab==='comunidade' && /^\/u\/[a-z0-9_-]+$/i.test(pending.url)){try{history.replaceState(history.state,'',pending.url);}catch{}}
    try{const out=await api('/api/social',{action:'request',target:pending.id});profileNotice={id:pending.id,text:out?.state==='accepted'?'Pedido aceito: agora vocês são amigos.':'Pedido de amizade enviado. Ele aparece na CENTRAL de quem recebe.'};await refresh();}
    catch(e){if(e.message==='not_found')noAccountTargets.add(pending.id);profileNotice={id:pending.id,text:e.message==='not_found'?'Este jogador ainda não tem conta na resenha, então não recebe pedido de amizade.':errors[e.message] || 'Não deu certo agora. Tente de novo.'};}
  }
  const empty=(text)=>el('p',text,'social-muted');
  const card=(title)=>{const c=el('section','','social-card');c.append(el('h2',title));return c;};
  function field(title,input) {const label=el('label',title,'social-field');label.append(input);return label;}
  function input(value='',max=280,type='text') {const i=el('input');i.type=type;i.value=value;if(Number.isInteger(max))i.maxLength=max;return i;}
  const date=(value)=>value?new Date(value).toLocaleString('pt-BR'):'Ainda sem atividade';
  function presenceText(p) {if(!p)return 'Presença privada';if(p.game)return `Jogando ${p.game.mode==='ctf'?'CAPTURA':'ABATE'} · ${p.game.map}`;return p.online?'Online na resenha':`Offline · ${date(p.last_active_at)}`;}
  // Pedido de amizade: o banco só aceita alvo com conta (social_action, 040). Perfil de histórico sem conta responde not_found.
  let profileNotice=null;const noAccountTargets=new Set();
  async function requestFriend(p){
    try{const out=await api('/api/social',{action:'request',target:p.id});profileNotice={id:p.id,text:out?.state==='accepted'?'Pedido aceito: agora vocês são amigos.':'Pedido de amizade enviado. Ele aparece na CENTRAL de quem recebe.'};}
    catch(e){if(e.message!=='not_found')throw e;noAccountTargets.add(p.id);profileNotice={id:p.id,text:'Este jogador ainda não tem conta na resenha, então não recebe pedido de amizade.'};}
    await refresh();await render();
  }
  const names={first_kill:'Primeiro abate',ten_kills:'Dez abates na conta',first_win:'Primeira vitória',one_hour:'Uma hora de arena ativa'};
  /* Conquistas de contagem seguem os totais que o próprio perfil mostra (histórico preservado + confirmadas).
     O banco só grava player_achievement quando ingere rodada verificada, então quem jogou antes do corte ficava sem nada.
     Hora de arena usa só o tempo confirmado: o tempo antigo contava menu e AFK. Data só aparece quando o servidor manda. */
  function profileAchievements(p){
    const kills=Number(p.kills) || 0,wins=Math.max(Number(p.round_wins) || 0,Number(p.legacy_wins ?? p.wins) || 0),active=Number(p.verified_play_seconds ?? 0) || 0;
    const derived={first_kill:kills>=1,ten_kills:kills>=10,first_win:wins>=1,one_hour:active>=3600};
    const saved=new Map((p.achievements || []).filter(a=>Object.hasOwn(names,a?.key)).map(a=>[a.key,a]));
    return Object.keys(names).filter(k=>saved.has(k) || derived[k]).map(k=>({key:k,at:saved.get(k)?.at || null,source:saved.has(k)?'server':'history'}));
  }
  const achievementText=a=>`${names[a.key]} · ${a.at?new Date(a.at).toLocaleDateString('pt-BR'):a.source==='history'?'pelo histórico preservado':'conquistada'}`;
  async function refresh(){
    const owner=auth?.profile?.id,next=owner?await api('/api/social'):null;if(owner!==auth?.profile?.id)return;
    if(next?.messages_enabled){try{next.inbox=await api('/api/social?action=inbox');}catch{next.inboxError=true;}}
    if(owner!==auth?.profile?.id)return;
    state=next;
    const count=(state?.notifications.filter(n=>!n.read_at).length || 0)+(state?.inbox?.unread_count || 0);
    for(const id of ['social-unread','hub-social-unread'])document.getElementById(id).textContent=count || '';
  }
  function clearConversation(){conversation=null;conversationBefore=null;messageDraft='';messageClientId=null;pendingSend=null;}
  async function openConversation(p){clearConversation();conversation={id:p.id,nick:p.nick};inboxSection='messages';tab='notifications';await render();}
  async function action(name,target,data={}) {const out=await api('/api/social',{action:name,...(target?{target}:{}),...data});await refresh();await render();return out;}
  // Saudação no topo da Comunidade; com perfil, o painel de conta some e sobra só o "Sair da conta".
  function renderGreeting() {
    const hello=document.getElementById('social-hello'),logout=document.getElementById('social-logout'),panel=account.closest?.('details'),p=auth?.profile;
    const handle=p && state?.profile?.id===p.id?state.profile.handle:null;
    if(hello)hello.textContent=p?`Olá, ${handle?'@'+handle:p.nick}`:'Olá';
    if(panel)panel.hidden=!!p;
    if(logout){logout.hidden=!p;logout.onclick=async()=>{logout.disabled=true;try{await logoutAccount(auth);auth=null;state=null;profileId='';clearConversation();await boot();}catch(e){message(errors[e.message] || 'Não deu certo agora. Tente de novo.');}finally{logout.disabled=false;}};}
  }
  function renderAccount() {
    account.replaceChildren();renderGreeting();
    if(auth?.profile)return;
    if(auth?.authenticated) {
      account.append(el('h2','Sua conta entrou. Falta o nome na camisa.'));
      mountAccountEntry(account,{auth,config:loginConfig,returnTo:'community',onAuthenticated:boot,message});
      return;
    }
    mountAccountEntry(account,{auth,config:loginConfig,returnTo:'community',onGuest:()=>document.querySelector('[data-hub-tab=jogar]')?.click(),onAuthenticated:boot,message});
  }
  /* Visualizações (backend 064): o total só aparece quando a API manda o campo. Cada perfil
     de outra pessoa aberto aqui manda UM aviso por carregamento; o backend deduplica por
     visitante e dia. fetch direto e mudo: falha (backend sem a 064, sem conta) não mexe na sessão. */
  const viewedProfiles=new Set();
  const viewsText=n=>`${n.toLocaleString('pt-BR')} ${n===1?'visualização':'visualizações'}`;
  function countProfileView(p,line){if(!p?.id || viewedProfiles.has(p.id) || auth?.profile?.id===p.id)return;viewedProfiles.add(p.id);fetch('/api/social',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'profile_view',target:p.id}),signal:AbortSignal.timeout(12000)}).then(r=>r.ok?r.json():null).then(out=>{if(line && Number.isSafeInteger(out?.views) && out.views>=0)line.textContent=viewsText(out.views);}).catch(()=>{});}
  async function showProfile(id,version) {
    const {profile:p}=await api('/api/social?action=profile'+(id?`&id=${encodeURIComponent(id)}`:''));
    if(version!==loadVersion)return;
    const c=card(p.nick),identity=el('div','','social-identity');
    const badge=accountVerifiedBadge(p.account_verified);if(badge)c.querySelector('h2').append(badge);
    if(p.avatar_url){const image=el('img','','social-avatar');image.src=p.avatar_url;image.alt=`Avatar de ${p.nick}`;image.width=76;image.height=76;image.referrerPolicy='no-referrer';identity.append(image);}
    const bio=el('div');bio.append(el('p',p.bio || 'A bio ainda está no aquecimento.'),empty(`Nível ${p.level} · faltam ${p.next_level_points} pontos para o próximo.`));const rank=careerRankBadge(p.points);if(rank)bio.append(rank,empty(careerRankTitle(p.points)));identity.append(bio);c.append(identity);if(p.handle)c.append(empty('@'+p.handle));
    const ranking=el('div','','social-profile-ranking');ranking.append(el('span','RANKING GERAL'),el('strong',p.position?`#${p.position}`:'Privada'));c.append(ranking);
    const views=Number.isSafeInteger(p.views) && p.views>=0?el('p',viewsText(p.views),'social-profile-views'):null;if(views)c.append(views);countProfileView(p,views);
    // Saldo TRETA$ (backend #114, treta_balance): só quando a API manda o campo. Backend sem o campo não mostra nada.
    if(Number.isSafeInteger(p.treta_balance) && p.treta_balance>=0){const treta=el('div','','social-profile-treta');treta.setAttribute('aria-label',`Saldo TRETA$ de ${p.nick}`);treta.append(el('span','SALDO TRETA$'),el('strong',`T$ ${p.treta_balance.toLocaleString('pt-BR')}`));c.append(treta);}
    /* last_character só chega aberto quando a pessoa marcou "Mostrar meu último personagem" (share_character, padrão desligado,
       migration 048), para ela mesma e para amigos. Vazio para os outros quase sempre é escolha de privacidade, não falta de dado. */
    const own=auth?.profile?.id===p.id,character=profileCharacterCard(p.last_character);
    c.append(character || empty(own?'Seu último personagem aparece aqui depois da primeira rodada confirmada pelo servidor.':'Este jogador não compartilha o último personagem, ou ainda não jogou uma rodada confirmada.'));
    if(own && p.settings?.share_character===false)c.append(empty('Só você e seus amigos veem seu personagem. Para mostrar a todos, marque "Mostrar meu último personagem no perfil público" em PRIVACIDADE.'));
    const stats=el('div','','social-stats');
    for(const [label,value] of [['PONTOS',p.points],['PARTIDAS',p.matches],['RODADAS GANHAS',p.round_wins ?? p.wins],['RODADAS PERDIDAS',p.round_losses ?? p.losses],['ABATES',p.kills],['MORTES',p.deaths],['K/D',p.kd],['HORAS ATIVAS CONFIRMADAS',(Number(p.verified_play_seconds ?? p.play_seconds)/3600).toFixed(2)]]){const s=el('div','','social-stat');s.append(el('strong',String(value)),el('span',label));stats.append(s);}c.append(stats,empty(p.source==='historical_plus_server_verified'?`Histórico preservado: ${p.legacy_points} pontos. Após a atualização: ${p.verified_points} pontos confirmados pelo servidor. Rodadas ganhas e horas ativas são métricas confirmadas; o tempo antigo fica no histórico.`:'Estatísticas confirmadas pelo servidor. Tempo no menu, espectador e AFK não contam.'),empty(presenceText(p.presence)));
    // Armas mais usadas (backend 068): abates confirmados pelo nó em partida multiplayer. Sem o campo, a seção não aparece.
    if(Array.isArray(p.top_weapons)){
      const top=p.top_weapons.filter(w=>typeof w?.weapon==='string' && Number.isSafeInteger(w.kills) && w.kills>0).slice(0,3),list=el('ol','','social-list profile-weapons');
      for(const w of top)list.append(el('li',`${WEAPONS[w.weapon]?.name || w.weapon.toUpperCase()} · ${w.kills.toLocaleString('pt-BR')} ${w.kills===1?'abate':'abates'}`));
      c.append(el('h3','Armas que mais usa'),top.length?list:empty('As armas aparecem a partir das partidas multiplayer confirmadas pelo servidor.'));
    }
    const notice=el('p',profileNotice?.id===p.id?profileNotice.text:'','social-inline-status');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
    const buttons=el('div','','social-actions');buttons.append(button('COPIAR LINK',async()=>navigator.clipboard.writeText(`${root.dataset.site}${p.url}`)));
    // /u/<perfil> já é o hub: o perfil público é esta tela, sem botão para "abrir o perfil público".
    if(p.visibility==='public'){
      // Import na hora do clique: a régua do backend roda este arquivo num vm sem módulos.
      const share=button('COMPARTILHAR PERFIL',async()=>{const {compartilhar,linkCompartilhavel}=await import('./compartilhar.js');const r=await compartilhar({titulo:`${p.nick} no CORO SOLTO`,texto:`Olha o perfil de ${p.nick} no CORO SOLTO.`,url:linkCompartilhavel(p.url,'perfil')});if(r==='copiado')message('Link do perfil copiado.');});share.dataset.share='perfil';buttons.append(share);}
    if(auth?.profile && auth.profile.id!==p.id) {
      if(p.relationship==='friend'){buttons.append(chip('AMIGOS ✓'));if(state?.messages_enabled)buttons.append(button('MANDAR MENSAGEM',()=>openConversation(p),'',notice));buttons.append(button('CHAMAR PARA A SALA',()=>action('invite',p.id),'',notice),button('REMOVER AMIGO',()=>action('remove',p.id),'',notice));}
      else if(p.relationship==='incoming')buttons.append(button('ACEITAR AMIZADE',()=>action('accept',p.id),'',notice),button('RECUSAR',()=>action('decline',p.id),'',notice));
      else if(p.relationship==='outgoing')buttons.append(chip('PEDIDO ENVIADO'),button('CANCELAR PEDIDO',()=>action('cancel',p.id),'',notice));
      else if(!noAccountTargets.has(p.id))buttons.append(button('ADICIONAR AMIGO',()=>requestFriend(p),'social-primary',notice));
      buttons.append(button('BLOQUEAR',async()=>{await action('block',p.id);profileId='';await render();},'social-danger',notice),button('DENUNCIAR',()=>showReport(p),'',notice));
    }
    // Sem conta (ou sem nick): o pedido fica guardado, o login abre aqui e o pedido sai sozinho depois (completePendingFriend).
    else if(!own && !noAccountTargets.has(p.id))buttons.append(button('ADICIONAR AMIGO',()=>askLoginForFriend(p),'social-primary',notice));
    c.append(buttons,notice);
    if(p.socials?.length || p.social_link){const socials=profileSocialLinks(p);if(socials.length){const row=el('nav','','profile-socials');row.setAttribute('aria-label','Redes públicas');for(const s of socials)row.append(profileSocialLink(s));c.append(row);}}
    const secConquistas=el('section','','social-profile-section');secConquistas.append(el('h3','Conquistas'));
    const earned=profileAchievements(p),achievements=el('ul','','social-list');for(const a of earned)achievements.append(el('li',achievementText(a)));secConquistas.append(earned.length?achievements:empty('A primeira conquista vem do primeiro abate.'));c.append(secConquistas);
    // Rodadas e preferências: o servidor só manda para a própria pessoa e para amigos (activity_visibility). Vazio para os outros não quer dizer "sem rodada".
    const sees=auth?.profile?.id===p.id || p.relationship==='friend',noActivity=sees?(p.source==='historical_plus_server_verified'?'O histórico antigo guarda só os totais. As rodadas aparecem aqui a partir da primeira partida confirmada pelo servidor.':'Nenhuma rodada confirmada ainda.'):'As rodadas deste jogador aparecem só para os amigos dele.';
    const secPartidas=el('section','','social-profile-section');secPartidas.append(el('h3','Preferências na arena'));
    const favorites=el('ul','','social-list');for(const f of p.favorites)favorites.append(el('li',`${f.map} · ${f.mode} · ${f.character || 'Personagem não registrado'} · ${f.faction || 'Facção não registrada'} (${f.rounds} rodadas)`));secPartidas.append(p.favorites.length?favorites:empty(noActivity));
    secPartidas.append(el('h3','Rodadas recentes'));
    for(const h of p.history)secPartidas.append(empty(`${date(h.started_at)} · ${h.map} · ${h.mode} · ${h.kills} abates / ${h.deaths} mortes${h.complete?'':' · encerrada antes do placar'}`));
    if(!p.history.length)secPartidas.append(empty(noActivity));
    // Rodadas e preferências são da pessoa e dos amigos: o visitante vê só uma linha dizendo isso.
    if(sees)c.append(secPartidas);else c.append(empty(noActivity));
    // Abas do perfil (/u/<perfil>/<aba>) só para o dono logado. Visitante vê o perfil público inteiro, sem abas.
    viewingOther=!own;syncPrivateTabs();
    if(!own){content.append(c);return;}
    const nav=profileTabs(p);
    if(profileAba==='privacidade'){content.append(nav);showSettings();return;}
    if(profileAba==='conquistas' || profileAba==='partidas'){const only=card(p.nick);only.append(profileAba==='conquistas'?secConquistas:secPartidas);content.append(nav,only);return;}
    content.append(nav,c);
  }
  /* Abas do perfil do dono. Trocar de aba grava /u/<perfil>/<aba> (rotas.js guarda a aba) sem recarregar. */
  function profileTabs(p){
    const nav=el('nav','','profile-tabs social-profile-tabs');nav.setAttribute('aria-label','Abas do seu perfil');
    for(const [slug,label] of Object.entries(ABAS_DO_PERFIL)){
      const b=el('button',label);b.type='button';b.dataset.aba=slug;b.setAttribute('aria-pressed',String(profileAba===slug));
      b.onclick=()=>{profileAba=slug;const menu=document.getElementById('main-menu');if(menu?.dataset.socialPaused!=='true' && menu?.dataset.hubTab==='comunidade' && p.url){const alvo=new URL(location.href);alvo.pathname=p.url+(slug?`/${slug}`:'');for(const k of ['secao','social','perfil'])alvo.searchParams.delete(k);if(alvo.href!==location.href)history.pushState(null,'',alvo);}void render();};
      nav.append(b);
    }
    return nav;
  }
  function showReport(p) {
    content.replaceChildren();const c=card(`Denunciar ${p.nick}`),reason=el('select'),detail=el('textarea');detail.maxLength=1000;detail.minLength=5;detail.required=true;
    for(const [value,label] of [['abuse','Abuso ou assédio'],['cheating','Suspeita de cheat'],['profile','Conteúdo do perfil'],['other','Outro motivo']]){const o=el('option',label);o.value=value;reason.append(o);}
    c.append(empty('A denúncia vai para a fila de moderação. Ela não aplica punição automática.'),field('Motivo',reason),field('O que aconteceu? (5 a 1000 caracteres)',detail),button('ENVIAR DENÚNCIA',async()=>{if(!detail.reportValidity())return;await action('report',p.id,{reason:reason.value,detail:detail.value});message('Denúncia recebida para análise.');}));content.append(c);
  }
  function searchForm(fn,value='') {const f=el('form','','social-search'),i=input(value,40,'search');const label=el('label','Buscar por nickname ou e-mail');label.append(i);const b=button('BUSCAR',()=>fn(i.value));f.append(label,b);f.onsubmit=e=>{e.preventDefault();b.click();};return f;}
  function friendCard(f) {
    const c=card(f.nick);c.append(empty(f.state==='accepted'?presenceText(f.profile?.presence):f.direction==='incoming'?'Quer entrar na sua turma.':'Pedido enviado.'));
    const buttons=el('div','','social-actions');if(f.profile)buttons.append(link('VER PERFIL',f.profile.url));else buttons.append(empty('Perfil privado.'));
    if(f.state==='accepted'){if(state?.messages_enabled)buttons.append(button('MANDAR MENSAGEM',()=>openConversation(f)));buttons.append(button('CONVIDAR',()=>action('invite',f.id)),button('REMOVER',()=>action('remove',f.id)));}
    else if(f.direction==='incoming')buttons.append(button('ACEITAR',()=>action('accept',f.id)),button('RECUSAR',()=>action('decline',f.id)));
    else buttons.append(button('CANCELAR PEDIDO',()=>action('cancel',f.id)));
    c.append(buttons);return c;
  }
  function showFriends() {
    content.append(button('ATUALIZAR TURMA',async()=>{await refresh();await render();}),button('CONVIDAR AMIGOS',()=>abrirConviteAmigos(state?.profile?.nick || '')));
    content.append(searchForm(async q=>{const r=await api(`/api/social?action=search&q=${encodeURIComponent(q)}`);const results=document.getElementById('social-search-results');results.replaceChildren();for(const p of r.players){const c=card(p.nick);c.append(link('VISITAR PERFIL',`/u/${p.id}/${encodeURIComponent(p.nick)}`));results.append(c);}if(!r.players.length)results.append(empty('Nenhum jogador encontrado.'));}));
    const results=el('div','','social-grid');results.id='social-search-results';content.append(results);
    if(!state){content.append(empty('Entre na conta para reunir sua turma.'));return;}
    const grid=el('div','','social-grid');for(const f of state.friends)grid.append(friendCard(f));content.append(grid);
    if(!state.friends.length)content.append(empty('Sua turma está começando. Busque um jogador e mande um pedido.'));
    content.append(el('h2','Convites para a próxima treta'));
    for(const inv of state.invites){const c=card(inv.nick);c.append(empty(`${inv.node.toUpperCase()}-${inv.code} · vence ${date(inv.expires_at)}`));
      if(inv.direction==='incoming')c.append(button('ACEITAR E ENTRAR',async()=>{const result=await action('invite_accept',null,{id:inv.id});if(result.join)location.assign(result.join);}),button('RECUSAR',()=>action('invite_decline',null,{id:inv.id})));
      else c.append(empty('Aguardando resposta.'),button('CANCELAR CONVITE',()=>action('invite_cancel',null,{id:inv.id})));content.append(c);}
    if(!state.invites.length)content.append(empty('Nenhum convite pendente. Entre numa sala para chamar a turma; os convites usam essa mesma sala.'));
  }
  async function showRanking(version) {
    const periods=el('div','','social-actions ranking-periods');periods.setAttribute('aria-label','Período do ranking');
    for(const [period,label] of [['all','GERAL'],['week','SEMANAL'],['month','ÚLTIMOS 30 DIAS']]){const b=button(label,async()=>{rankingPeriod=period;rankingOffset=0;await render();});b.setAttribute('aria-pressed',String(rankingPeriod===period));periods.append(b);}content.append(periods);
    const controls=el('div','','social-actions');for(const [scope,label] of [['global','GLOBAL'],['friends','ENTRE AMIGOS']])controls.append(button(label,async()=>{rankingScope=scope;rankingOffset=0;await render();}));content.append(controls,searchForm(async q=>{rankingQuery=q;rankingOffset=0;await render();},rankingQuery));
    const filters=el('div','','social-actions');for(const [label,values,current,set] of [['Modo',[['all','Todos'],['ctf','Captura'],['rounds','Abate']],rankingMode,v=>rankingMode=v],['Partida',[['all','Todas'],['singleplayer','Solo'],['multiplayer','Multiplayer']],rankingGameType,v=>rankingGameType=v]]){const select=el('select');for(const [value,text] of values){const option=el('option',text);option.value=value;select.append(option);}select.value=current;select.onchange=()=>{set(select.value);rankingOffset=0;void render();};filters.append(field(label,select));}content.append(filters);
    const r=await api(`/api/social?action=ranking&scope=${rankingScope}&q=${encodeURIComponent(rankingQuery)}&offset=${rankingOffset}&period=${rankingPeriod}&mode=${rankingMode}&game_type=${rankingGameType}`);if(version!==loadVersion)return;
    if(r.disabled){content.append(empty('Ranking ainda indisponível neste ambiente.'));return;}
    if(rankingPeriod==='week'){const w=r.week;if(w?.starts_at && w?.ends_at && w?.timezone){const fmt=at=>new Date(at).toLocaleString('pt-BR',{timeZone:w.timezone,dateStyle:'short',timeStyle:'short'}),zone=w.timezone==='America/Sao_Paulo'?'horário de Brasília':'UTC';content.append(empty(`Semana: ${fmt(w.starts_at)} até ${fmt(w.ends_at)} (${zone}). Contam as rodadas iniciadas nesse intervalo; o horário final já pertence à próxima semana.`));}else content.append(empty('Calendário semanal indisponível neste ambiente.'));content.append(empty('Premiação em TRETA$ ainda não ativada.'));}
    if(r.own)content.append(empty(`Sua posição: #${r.own.position} · ${r.own.points} pontos.`));
    const wrap=el('div','','social-table-wrap');wrap.append(rankingTable(r.players,{teams:true,offset:rankingOffset,careerOnly:true}));content.append(wrap,empty('Patentes usam os pontos acumulados da carreira e permanecem iguais ao trocar de período ou modo.'));
    if(!r.players.length)content.append(empty('Nenhum jogador encontrado nesse ranking.'));
    const pages=el('div','','social-actions');if(rankingOffset>0)pages.append(button('ANTERIOR',async()=>{rankingOffset=Math.max(0,rankingOffset-25);await render();}));if(rankingOffset+25<r.total)pages.append(button('PRÓXIMA',async()=>{rankingOffset+=25;await render();}));content.append(pages,empty('Solo: 1 ponto por abate confirmado. MP: 2 pontos quando o servidor confirma contas distintas juntas na rodada. O placar geral preserva o histórico anterior; filtros e pontos de Esquerda/Direita usam apenas partidas confirmadas após a atualização. O time é o da partida.'));
  }
  function showQuests(){
    content.append(el('h2','Missões da resenha'),empty('Seu progresso vem da conta e das partidas confirmadas. Estas missões ainda não distribuem TRETa$.'));
    if(!auth?.profile)content.append(empty('Entre e escolha seu nickname para acompanhar suas missões.'));
    const grid=el('div','','social-grid');
    for(const q of questList({auth,state})){
      const c=el('section','','social-card social-quest-card'+(q.complete?' social-quest-complete':'')),header=el('div','','social-quest-header');
      header.append(el('h3',q.title),el('span',q.complete?'✓ CONCLUÍDA':'A FAZER','social-quest-status'));c.append(header,el('p',q.detail));
      if(!q.complete)c.append(button(q.action==='play'?'JOGAR':q.action==='friends'?'ENCONTRAR AMIGOS':'ABRIR PERFIL',async()=>{
        if(q.action==='play')document.querySelector('[data-hub-tab=jogar]')?.click();else{tab=q.action;await render();}
      }));grid.append(c);
    }content.append(grid);
  }
  function showNotifications(){if(!state){content.append(empty('Entre para receber avisos da turma.'));return;}if(state.notifications.some(n=>!n.read_at))content.append(button('MARCAR COMO LIDOS',()=>action('read_notifications')));for(const n of state.notifications){const c=card(({friend_request:'Pedido de amizade',friend_accepted:'Amizade confirmada',invite:'Convite para jogar',achievement:'Conquista desbloqueada'})[n.kind] || 'Aviso da turma');c.append(empty(`${n.nick || names[n.label] || 'Sua conta'} · ${date(n.created_at)}${n.read_at?'':' · NOVO'}`));if(n.actor_id)c.append(link('VER PERFIL',`/u/${n.actor_id}/perfil`));if(n.kind==='invite')c.append(button('VER CONVITES',async()=>{tab='friends';await render();}));content.append(c);}if(!state.notifications.length)content.append(empty('Sem avisos por enquanto. A paz é provisória.'));}
  async function showCentral(version){
    const sections=el('div','','social-inbox-sections');sections.setAttribute('aria-label','Central da conta');
    for(const [key,label] of [['quests','MISSÕES'],['notifications','AVISOS'],['messages','MENSAGENS']]){const b=button(label,async()=>{inboxSection=key;await render();});b.setAttribute('aria-pressed',String(inboxSection===key));sections.append(b);}content.append(sections);
    if(inboxSection==='quests')showQuests();else if(inboxSection==='notifications')showNotifications();else await showMessages(version);
  }
  async function showMessages(version){
    content.append(el('h2','Mensagens da turma'),empty('Conversas privadas entre amigos. Só vocês podem abrir a conversa pela conta; a moderação pode investigar denúncias.'));
    if(!auth?.profile){content.append(empty('Entre na conta para conversar com seus amigos.'));return;}
    if(!state?.messages_enabled){content.append(empty('As mensagens estão em preparação neste ambiente.'));return;}
    if(!conversation){
      if(state.inboxError){content.append(empty('Não foi possível carregar suas conversas.'),button('TENTAR DE NOVO',async()=>{await refresh();await render();}));return;}
      for(const t of state.inbox?.conversations || []){
        const c=card(t.nick);c.append(el('p',t.last_message.body,'social-message-preview'),empty(`${date(t.last_message.created_at)}${t.unread_count?` · ${t.unread_count} não lida(s)`:''}`),button('ABRIR CONVERSA',()=>openConversation({id:t.target_id,nick:t.nick})));content.append(c);
      }
      if(!state.inbox?.conversations?.length)content.append(empty('Sem conversas ainda. Abra o perfil de um amigo para mandar a primeira mensagem.'));
      content.append(button('VER AMIGOS',async()=>{tab='friends';await render();}));return;
    }
    const peer={...conversation},owner=auth.profile.id;
    content.append(button('VOLTAR ÀS CONVERSAS',async()=>{clearConversation();await refresh();await render();}));
    let data;
    try{data=await api(`/api/social?action=conversation&target=${encodeURIComponent(peer.id)}${conversationBefore?`&before=${encodeURIComponent(conversationBefore)}`:''}`);}
    catch(e){if(version!==loadVersion)return;content.append(empty(e.message==='friends_required'?'Adicione este jogador aos amigos para conversar.':e.message==='blocked'?'Esta conversa está bloqueada.':'Esta conversa está indisponível.'));return;}
    if(version!==loadVersion || owner!==auth?.profile?.id)return;
    const c=card(data.peer.nick),actions=el('div','','social-actions');
    if(data.peer.url)actions.append(link('VER PERFIL',data.peer.url));
    actions.append(button('DENUNCIAR',()=>showReport(data.peer)),button('BLOQUEAR',async()=>{await api('/api/social',{action:'block',target:peer.id});clearConversation();await refresh();await render();},'social-danger'));c.append(actions);
    const list=el('div','','social-message-list');list.setAttribute('aria-label',`Conversa com ${data.peer.nick}`);
    for(const m of data.messages){const bubble=el('div','','social-message'+(m.sender_id===owner?' social-message-own':''));bubble.append(el('div',m.body));const time=el('time',`${m.sender_id===owner?'Você':'Recebida'} · ${date(m.created_at)}${m.sender_id===owner && m.read_at?' · Lida':''}`);time.dateTime=m.created_at;bubble.append(time);list.append(bubble);}c.append(list);
    if(!data.messages.length)c.append(empty('A primeira mensagem começa a conversa.'));
    const pages=el('div','','social-actions');
    if(data.has_more)pages.append(button('MENSAGENS ANTERIORES',async()=>{conversationBefore=data.next_before;await render();}));
    if(conversationBefore)pages.append(button('MAIS RECENTES',async()=>{conversationBefore=null;await render();}));
    const unread=data.messages.filter(m=>m.recipient_id===owner && !m.read_at).map(m=>m.id);
    if(unread.length)pages.append(button('MARCAR ESTAS MENSAGENS COMO LIDAS',async()=>{await api('/api/social',{action:'message_read',target:peer.id,ids:unread});await refresh();await render();}));c.append(pages);
    const form=el('form','','social-message-form'),text=el('textarea');text.value=messageDraft;text.required=true;text.maxLength=1000;text.disabled=Boolean(pendingSend);
    text.oninput=()=>{messageDraft=text.value;messageClientId=null;};
    const send=button('ENVIAR MENSAGEM',async()=>{
      if(pendingSend || !text.reportValidity() || !text.value.trim())return;
      messageDraft=text.value;messageClientId ||= crypto.randomUUID();
      const attempt={id:messageClientId,body:messageDraft};pendingSend=attempt;text.disabled=true;
      try{
        await api('/api/social',{action:'message_send',target:peer.id,body:attempt.body,client_id:attempt.id});
        if(owner!==auth?.profile?.id || conversation?.id!==peer.id || pendingSend!==attempt)return;
        messageDraft='';messageClientId=null;conversationBefore=null;pendingSend=null;await refresh();await render();
      }finally{if(pendingSend===attempt){pendingSend=null;if(owner===auth?.profile?.id && conversation?.id===peer.id)await render();}}
    });send.disabled=Boolean(pendingSend);
    form.append(field('Sua mensagem (até 1000 caracteres)',text),send);form.onsubmit=e=>{e.preventDefault();send.click();};c.append(form);content.append(c);list.scrollTop=list.scrollHeight;
  }
  function showFeed(){content.append(empty('Só entram rodadas confirmadas pelo servidor, de amigos que compartilham a atividade.'));for(const f of state?.feed || []){const c=card(f.nick);c.append(empty(`${date(f.at)} · ${f.map} · ${f.mode} · ${f.kills} abates${f.result==='win'?' · levou a rodada':''}`),link('VER PERFIL',`/u/${f.player_id}/perfil`));content.append(c);}if(!state?.feed.length)content.append(empty('A resenha ainda está quieta. Jogue com amigos para ver novidades aqui.'));}
  function showSettings(){const p=state?.profile;if(!p){content.append(empty('Entre para configurar seu perfil.'));return;}const c=card('Seu perfil, suas regras.'),bio=el('textarea');bio.value=p.bio;bio.maxLength=280;const form=el('form');
    const nick=input(auth.profile.nick,14);nick.pattern='[A-Za-z0-9_.\\-]{2,14}';nick.required=true;c.append(field('Seu nickname',nick),empty('2 a 14 caracteres: letras, números, _ . e -. Troque quando quiser; seu ID público e seus links não mudam.'),button('TROCAR NICK',async()=>{if(!nick.reportValidity())return;const out=await action('nick',null,{nick:nick.value});auth.profile.nick=out.nick;acceptAccount(auth);}));
    const handle=input(p.handle || '',24);handle.pattern='[A-Za-z][A-Za-z0-9_]{2,23}';handle.required=true;handle.disabled=Boolean(p.handle);c.append(field('Seu ID público único',handle),empty('3 a 24 caracteres: letras, números e _. O ID fica fixo; seu nickname continua separado.'));if(p.handle)c.append(empty(new URL(p.url,root.dataset.site).host+p.url));else c.append(button('ESCOLHER ID',async()=>{if(!handle.reportValidity())return;await action('handle',null,{handle:handle.value});}));const share=input('',undefined,'checkbox');share.checked=p.settings.share_character===true;form.append(field('Mostrar meu último personagem no perfil público e no cartão de compartilhamento',share),field('Bio (até 280 caracteres)',bio));const selections={};for(const [key,label,options] of [['profile','Quem vê seu perfil?',[['public','Todo mundo'],['friends','Amigos'],['private','Só você']]],['presence','Quem vê sua presença?',[['friends','Amigos'],['private','Só você']]],['activity','Quem vê sua atividade?',[['friends','Amigos'],['private','Só você']]]]){const select=el('select');for(const [value,text]of options){const o=el('option',text);o.value=value;select.append(o);}select.value=p.settings[key];selections[key]=select;form.append(field(label,select));}
    const urls=el('textarea');urls.value=(p.socials || []).map(s=>s.url).join('\n');urls.maxLength=1100;form.append(field('Links opcionais, um por linha: Instagram, TikTok, X, GitHub, YouTube ou Twitch',urls));
    const save=button('SALVAR PERFIL',async()=>{const list=urls.value.split('\n').map(s=>s.trim()).filter(Boolean).map(url=>({url}));await action('settings',null,{shareCharacter:share.checked,bio:bio.value,profile:selections.profile.value,presence:selections.presence.value,activity:selections.activity.value,links:list});});form.append(save);form.onsubmit=e=>{e.preventDefault();save.click();};c.append(form);
    const avatar=input('',undefined,'file');avatar.accept='image/png,image/jpeg,image/webp';c.append(field('Avatar (PNG, JPEG ou WebP, até 3 MB)',avatar),button('ENVIAR FOTO',async()=>{const file=avatar.files[0];if(!file || !['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>3000000)throw new Error('avatar_invalid');const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});await api('/api/avatar',{image});await refresh();await render();}));
    mountAccountIntegrations(c,auth,loginConfig,message);void mountProfilePreferences(c,{auth,message});
    c.append(el('h3','Jogadores bloqueados'));for(const b of state.blocks)c.append(empty(b.nick),button('DESBLOQUEAR',()=>action('unblock',b.id)));if(!state.blocks.length)c.append(empty('Nenhum jogador bloqueado.'));content.append(c);
  }
  async function render(){const version=++loadVersion;root.dataset.view=tab;if(tab!=='profile' || !profileId){viewingOther=false;syncPrivateTabs();}content.replaceChildren();content.setAttribute('aria-busy','true');for(const b of document.querySelectorAll('.social-tabs button')){const on=b.dataset.tab===tab;b.setAttribute('aria-selected',String(on));b.setAttribute('tabindex',on?'0':'-1');if(on)content.setAttribute('aria-labelledby',b.id);}try{if(tab==='profile'){if(profileId || auth?.profile)await showProfile(profileId || auth.profile.id,version);else content.append(empty('Entre na conta para criar seu perfil.'));}else if(tab==='friends')showFriends();else if(tab==='ranking')await showRanking(version);else if(tab==='notifications')await showCentral(version);else if(tab==='feed')showFeed();else if(tab==='settings')showSettings();}catch(e){message(errors[e.message] || 'Perfil privado ou indisponível.');content.append(empty('Não foi possível carregar esta tela.'),button('TENTAR DE NOVO',render));}finally{if(version===loadVersion)content.setAttribute('aria-busy','false');}}
  async function boot(){message('Carregando a turma…');try{[auth,loginConfig]=await Promise.all([loadAccount(),loadAuthOptions()]);if(auth?.profile){acceptAccount(auth);await api('/api/social',{action:'presence'});}await refresh();await completePendingFriend();renderAccount();await render();message('');}catch(e){message(errors[e.message] || 'A comunidade não respondeu.');renderAccount();content.replaceChildren(button('TENTAR DE NOVO',boot));}}
  /* Aba da comunidade no CAMINHO (/comunidade/amigos), mesma tabela de public/js/rotas.js
     (tools/eval/rotas-check.mjs confere). Sem import: a régua do backend roda este arquivo num vm. */
  const SLUG_DA_ABA={profile:'',friends:'amigos',ranking:'ranking',notifications:'notificacoes',feed:'feed',settings:'configuracoes'};
  const abaDoCaminho=()=>{const slug=(location.pathname || '').match(/^\/comunidade(?:\/([a-z]+))?\/?$/);return slug?Object.keys(SLUG_DA_ABA).find(k=>SLUG_DA_ABA[k]===(slug[1] || '')) || null:null;};
  const caminhoDaAba=aba=>{const menu=document.getElementById('main-menu');if(menu?.dataset.socialPaused==='true' || menu?.dataset.hubTab!=='comunidade' || !(aba in SLUG_DA_ABA))return;const alvo=new URL(location.href);alvo.pathname=SLUG_DA_ABA[aba]?`/comunidade/${SLUG_DA_ABA[aba]}`:'/comunidade';for(const k of ['secao','social','perfil'])alvo.searchParams.delete(k);if(alvo.href!==location.href)history.pushState(null,'',alvo);};
  for(const b of document.querySelectorAll('.social-tabs button'))b.onclick=()=>{tab=b.dataset.tab;if(tab==='profile'){profileId=root.dataset.profile || '';profileAba='';}const url=new URL(location.href);if(url.searchParams.has('perfil')){url.searchParams.delete('perfil');if(url.searchParams.has('social'))url.searchParams.set('social',tab);history.replaceState(history.state,'',url);}caminhoDaAba(tab);message('');void render();};
  // Teclado de abas (WAI-ARIA tabs): setas e Home/End movem o foco e ativam a aba.
  for(const b of document.querySelectorAll('.social-tabs button'))b.onkeydown=event=>{const list=[...document.querySelectorAll('.social-tabs button')],i=list.indexOf(b);const next={ArrowRight:i+1,ArrowLeft:i-1,Home:0,End:list.length-1}[event.key];if(next===undefined)return;event.preventDefault();const t=list[(next+list.length)%list.length];t.focus();t.click();};
  setInterval(async()=>{if(document.hidden || !auth?.profile)return;try{await api('/api/social',{action:'presence'});await refresh();if(['notifications','feed'].includes(tab) && !document.activeElement?.closest('form'))await render();}catch(e){message(errors[e.message] || 'A atualização da comunidade falhou.');}},30000);
  const query=new URLSearchParams(location.search);if(['profile','friends','ranking','notifications','feed','settings'].includes(query.get('social')))tab=query.get('social');if(abaDoCaminho())tab=abaDoCaminho();
  root.addEventListener('click',event=>{const a=event.target.closest('a');if(!a || a.dataset.publicProfile==='true')return;const url=new URL(a.href,location.href),match=url.pathname.match(/^\/u\/([a-z][a-z0-9_]{2,23}|[0-9a-f-]{36})(?:\/|$)/i);if(url.origin!==location.origin || !match)return;event.preventDefault();profileId=match[1];tab='profile';profileAba='';void render();});
  document.addEventListener('cs-account-change',event=>{const changed=auth?.profile?.id!==event.detail?.profile?.id;auth=event.detail;if(changed){clearConversation();state=null;loadVersion++;content.replaceChildren();for(const id of ['social-unread','hub-social-unread'])document.getElementById(id).textContent='';renderAccount();}void refresh().then(()=>{renderAccount();return render();}).catch(e=>message(errors[e.message] || 'Sua sessão está indisponível.'));});
  document.addEventListener('cs-community-open',event=>{if(event.detail?.tab)tab=event.detail.tab;if(event.detail?.perfil)profileId=event.detail.perfil;profileAba=abaDaUrl();void boot();});
  void boot();
}
