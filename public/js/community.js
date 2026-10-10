import {mountAccountEntry,mountNewsletter,loadAccount,loadAuthOptions,acceptAccount,logoutAccount} from './account-entry.js';
const root=document.getElementById('community');
if(root) {
  const status=document.getElementById('social-status'),account=document.getElementById('social-account'),content=document.getElementById('social-content');
  let loginConfig={providers:[]};
  let auth=null,state=null,tab=root.dataset.tab || 'profile',profileId=root.dataset.profile || new URLSearchParams(location.search).get('perfil') || '',rankingScope='global',rankingQuery='',rankingOffset=0,rankingPeriod='all',rankingMode='all',loadVersion=0;
  const errors={account_hidden:'Esta conta está indisponível pela moderação.',session_expired:'Sua sessão expirou. Entre de novo para continuar.',social_unavailable:'A resenha está fora do ar. Tente de novo.',social_not_configured:'A comunidade aguarda configuração do servidor.',rate_limited:'Calma, fiscal da resenha. Tente de novo em um minuto.',blocked:'Esse jogador não pode interagir com você.',room_solo:'Essa sala é solo. Entre no multiplayer para chamar amigos.',room_full:'A sala lotou. Peça outro convite.',room_closed:'Essa sala já encerrou.',room_unavailable:'O servidor da sala não respondeu.',invite_expired:'O convite venceu. Peça outro.',invite_closed:'Esse convite já foi respondido.',join_room_first:'Entre numa sala do jogo antes de convidar.',provider_unavailable:'Esse login ainda não está habilitado.',account_conflict:'Esse nick ou progresso já pertence a outra conta.',guest_invalid:'Não foi possível comprovar o convidado. Seu progresso local continua salvo.',links_invalid:'Use links HTTPS das redes indicadas.',settings_invalid:'Revise a bio e as opções de privacidade.'};
  const el=(tag,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
  const message=(text)=>{status.textContent=text;};
  async function api(path,body) {
    const r=await fetch(path,{credentials:'same-origin',headers:{'content-type':'application/json'},...(body?{method:'POST',body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
    let data;try{data=await r.json();}catch{throw new Error('social_unavailable');}
    if(!r.ok) {if(data.error==='session_expired'){auth=null;state=null;profileId='';content.replaceChildren();document.getElementById('social-unread').textContent='';renderAccount();}throw new Error(data.error || 'social_unavailable');}
    return data;
  }
  function button(text,fn,cls='') {
    const b=el('button',text,cls);b.type='button';b.onclick=async()=>{b.disabled=true;message('Só um instante…');try{await fn();message('Tá anotado.');}catch(e){message(errors[e.message] || 'Não deu certo agora. Tente de novo.');}finally{b.disabled=false;}};return b;
  }
  function link(text,href) {const a=el('a',text);a.href=href;return a;}
  const empty=(text)=>el('p',text,'social-muted');
  const card=(title)=>{const c=el('section','','social-card');c.append(el('h2',title));return c;};
  function field(title,input) {const label=el('label',title,'social-field');label.append(input);return label;}
  function input(value='',max=280,type='text') {const i=el('input');i.type=type;i.value=value;if(Number.isInteger(max))i.maxLength=max;return i;}
  const date=(value)=>value?new Date(value).toLocaleString('pt-BR'):'Ainda sem atividade';
  function presenceText(p) {if(!p)return 'Presença privada';if(p.game)return `Jogando ${p.game.mode==='ctf'?'CAPTURA':'ABATE'} · ${p.game.map}`;return p.online?'Online na resenha':`Offline · ${date(p.last_active_at)}`;}
  const names={first_kill:'Primeiro abate confirmado',ten_kills:'Dez abates na conta',first_win:'Primeira vitória',one_hour:'Uma hora de arena ativa'};
  async function refresh(){state=auth?.profile?await api('/api/social'):null;const count=state?.notifications.filter(n=>!n.read_at).length || '';for(const id of ['social-unread','hub-social-unread'])document.getElementById(id).textContent=count;}
  async function action(name,target,data={}) {const out=await api('/api/social',{action:name,...(target?{target}:{}),...data});await refresh();await render();return out;}
  function renderAccount() {
    account.replaceChildren();
    if(auth?.authenticated) {
      account.append(el('h2',auth.profile?`Salve, ${auth.profile.nick}.`:'Sua conta entrou. Falta o nome na camisa.'));
      if(!auth.profile) {
        mountAccountEntry(account,{auth,config:loginConfig,returnTo:'community',onAuthenticated:boot,message});
      } else {
        account.append(empty('Sua conta e seu progresso ficam salvos no servidor. O modo offline continua disponível.'));
        const buttons=el('div','','social-actions');buttons.append(button('SOLO VERIFICADO',async()=>{const out=await api('/api/social',{action:'solo',node:'br'});location.assign(out.join);}));
        buttons.append(link('SEU PERFIL',`/u/${auth.profile.id}/${encodeURIComponent(auth.profile.nick)}`));
        buttons.append(button('SAIR DA CONTA',async()=>{await logoutAccount(auth);auth=null;state=null;profileId='';await boot();}));account.append(buttons);
      }
      return;
    }
    mountAccountEntry(account,{auth,config:loginConfig,returnTo:'community',onGuest:()=>document.querySelector('[data-hub-tab=jogar]')?.click(),onAuthenticated:boot,message});
  }
  async function showProfile(id,version) {
    const {profile:p}=await api('/api/social?action=profile'+(id?`&id=${encodeURIComponent(id)}`:''));
    if(version!==loadVersion)return;
    const c=card(p.nick),identity=el('div','','social-identity');
    if(p.avatar_url){const image=el('img','','social-avatar');image.src=p.avatar_url;image.alt=`Avatar de ${p.nick}`;image.width=76;image.height=76;image.referrerPolicy='no-referrer';identity.append(image);}
    const bio=el('div');bio.append(el('p',p.bio || 'A bio ainda está no aquecimento.'),empty(`Nível ${p.level} · faltam ${p.next_level_points} pontos para o próximo.`));identity.append(bio);c.append(identity);
    const stats=el('div','','social-stats');
    for(const [label,value] of [['PONTOS',p.points],['POSIÇÃO',p.position?`#${p.position}`:'Privada'],['PARTIDAS',p.matches],['RODADAS GANHAS',p.wins],['RODADAS PERDIDAS',p.losses],['ABATES',p.kills],['MORTES',p.deaths],['K/D',p.kd],['HORAS ATIVAS',(Number(p.play_seconds)/3600).toFixed(2)]]){const s=el('div','','social-stat');s.append(el('strong',String(value)),el('span',label));stats.append(s);}c.append(stats,empty('Estatísticas confirmadas pelo servidor. Tempo no menu, espectador e AFK não contam. O histórico offline deste navegador fica separado.'),empty(presenceText(p.presence)));
    const buttons=el('div','','social-actions');buttons.append(button('COPIAR LINK',async()=>navigator.clipboard.writeText(`${location.origin}${p.url}`)));
    if(auth?.profile && auth.profile.id!==p.id) {
      if(p.relationship==='friend')buttons.append(button('CHAMAR PARA A SALA',()=>action('invite',p.id)),button('REMOVER AMIGO',()=>action('remove',p.id)));
      else if(p.relationship==='incoming')buttons.append(button('ACEITAR AMIZADE',()=>action('accept',p.id)),button('RECUSAR',()=>action('decline',p.id)));
      else if(p.relationship==='outgoing')buttons.append(button('CANCELAR PEDIDO',()=>action('cancel',p.id)));
      else buttons.append(button('PEDIR AMIZADE',()=>action('request',p.id)));
      buttons.append(button('BLOQUEAR',async()=>{await action('block',p.id);profileId='';await render();},'social-danger'),button('DENUNCIAR',()=>showReport(p)));
    }
    c.append(buttons);
    if(p.socials?.length){const row=el('p');for(const s of p.socials.filter(s=>/^https:\/\//.test(s.url || ''))){const a=link(`${s.net} ↗ `,s.url);a.target='_blank';a.rel='noopener noreferrer nofollow';row.append(a);}c.append(row);}
    c.append(el('h3','Conquistas'));
    const achievements=el('ul','','social-list');for(const a of p.achievements)achievements.append(el('li',`${names[a.key] || a.key} · ${date(a.at)}`));c.append(p.achievements.length?achievements:empty('A primeira conquista vem da primeira treta confirmada.'));
    c.append(el('h3','Preferências na arena'));
    const favorites=el('ul','','social-list');for(const f of p.favorites)favorites.append(el('li',`${f.map} · ${f.mode} · ${f.character || 'Personagem não registrado'} · ${f.faction || 'Facção não registrada'} (${f.rounds} rodadas)`));c.append(p.favorites.length?favorites:empty('Jogue uma rodada verificada para começar seu histórico.'));
    c.append(el('h3','Rodadas recentes'));
    for(const h of p.history)c.append(empty(`${date(h.started_at)} · ${h.map} · ${h.mode} · ${h.kills} abates / ${h.deaths} mortes${h.complete?'':' · encerrada antes do placar'}`));
    if(!p.history.length)c.append(empty('Nenhuma rodada confirmada ainda.'));
    content.append(c);
  }
  function showReport(p) {
    content.replaceChildren();const c=card(`Denunciar ${p.nick}`),reason=el('select'),detail=el('textarea');detail.maxLength=1000;detail.minLength=5;detail.required=true;
    for(const [value,label] of [['abuse','Abuso ou assédio'],['cheating','Suspeita de cheat'],['profile','Conteúdo do perfil'],['other','Outro motivo']]){const o=el('option',label);o.value=value;reason.append(o);}
    c.append(empty('A denúncia vai para a fila de moderação. Ela não aplica punição automática.'),field('Motivo',reason),field('O que aconteceu? (5 a 1000 caracteres)',detail),button('ENVIAR DENÚNCIA',async()=>{if(!detail.reportValidity())return;await action('report',p.id,{reason:reason.value,detail:detail.value});message('Denúncia recebida para análise.');}));content.append(c);
  }
  function searchForm(fn,value='') {const f=el('form','','social-search'),i=input(value,40,'search');const label=el('label','Buscar pelo nickname');label.append(i);const b=button('BUSCAR',()=>fn(i.value));f.append(label,b);f.onsubmit=e=>{e.preventDefault();b.click();};return f;}
  function friendCard(f) {
    const c=card(f.nick);c.append(empty(f.state==='accepted'?presenceText(f.profile?.presence):f.direction==='incoming'?'Quer entrar na sua turma.':'Pedido enviado.'));
    const buttons=el('div','','social-actions');if(f.profile)buttons.append(link('VER PERFIL',f.profile.url));else buttons.append(empty('Perfil privado.'));
    if(f.state==='accepted')buttons.append(button('CONVIDAR',()=>action('invite',f.id)),button('REMOVER',()=>action('remove',f.id)));
    else if(f.direction==='incoming')buttons.append(button('ACEITAR',()=>action('accept',f.id)),button('RECUSAR',()=>action('decline',f.id)));
    else buttons.append(button('CANCELAR PEDIDO',()=>action('cancel',f.id)));
    c.append(buttons);return c;
  }
  function showFriends() {
    content.append(button('ATUALIZAR TURMA',async()=>{await refresh();await render();}));
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
    const controls=el('div','','social-actions');for(const [scope,label] of [['global','GLOBAL'],['friends','ENTRE AMIGOS']])controls.append(button(label,async()=>{rankingScope=scope;rankingOffset=0;await render();}));content.append(controls,searchForm(async q=>{rankingQuery=q;rankingOffset=0;await render();},rankingQuery));
    const filters=el('div','','social-actions');for(const [label,values,current,set] of [['Período',[['all','Todo o histórico'],['week','Últimos 7 dias'],['month','Últimos 30 dias']],rankingPeriod,v=>rankingPeriod=v],['Modo',[['all','Todos'],['ctf','Captura'],['rounds','Abate']],rankingMode,v=>rankingMode=v]]){const select=el('select');for(const [value,text] of values){const option=el('option',text);option.value=value;select.append(option);}select.value=current;select.onchange=()=>{set(select.value);rankingOffset=0;void render();};filters.append(field(label,select));}content.append(filters);
    const r=await api(`/api/social?action=ranking&scope=${rankingScope}&q=${encodeURIComponent(rankingQuery)}&offset=${rankingOffset}&period=${rankingPeriod}&mode=${rankingMode}`);if(version!==loadVersion)return;
    if(r.disabled){content.append(empty('Ranking ainda indisponível neste ambiente.'));return;}
    if(r.own)content.append(empty(`Sua posição: #${r.own.position} · ${r.own.points} pontos.`));
    const wrap=el('div','','social-table-wrap'),table=el('table','','social-table'),thead=el('thead'),tr=el('tr');for(const text of ['POS.','JOGADOR','PONTOS','ABATES','K/D'])tr.append(el('th',text));thead.append(tr);table.append(thead);
    const body=el('tbody');for(const p of r.players){const row=el('tr');row.append(el('td',`#${p.position}`));const nick=el('td');nick.append(link(p.nick,`/u/${p.id}/${encodeURIComponent(p.nick)}`));row.append(nick,el('td',String(p.points)),el('td',String(p.kills)),el('td',String(p.kd)));body.append(row);}table.append(body);wrap.append(table);content.append(wrap);
    if(!r.players.length)content.append(empty('Nenhum jogador encontrado nesse ranking.'));
    const pages=el('div','','social-actions');if(rankingOffset>0)pages.append(button('ANTERIOR',async()=>{rankingOffset=Math.max(0,rankingOffset-25);await render();}));if(rankingOffset+25<r.total)pages.append(button('PRÓXIMA',async()=>{rankingOffset+=25;await render();}));content.append(pages,empty('1 ponto por abate confirmado. Bônus MP: +1 somente quando o servidor confirma contas distintas juntas na rodada. Filtros usam o início da rodada, em UTC. O perfil e a home mostram todo o histórico.'));
  }
  function showNotifications(){if(!state){content.append(empty('Entre para receber avisos da turma.'));return;}if(state.notifications.some(n=>!n.read_at))content.append(button('MARCAR COMO LIDOS',()=>action('read_notifications')));for(const n of state.notifications){const c=card(({friend_request:'Pedido de amizade',friend_accepted:'Amizade confirmada',invite:'Convite para jogar',achievement:'Conquista desbloqueada'})[n.kind]);c.append(empty(`${n.nick || names[n.label] || 'Sua conta'} · ${date(n.created_at)}${n.read_at?'':' · NOVO'}`));if(n.actor_id)c.append(link('VER PERFIL',`/u/${n.actor_id}/perfil`));if(n.kind==='invite')c.append(button('VER CONVITES',async()=>{tab='friends';await render();}));content.append(c);}if(!state.notifications.length)content.append(empty('Sem avisos por enquanto. A paz é provisória.'));}
  function showFeed(){content.append(empty('Só entram rodadas confirmadas pelo servidor, de amigos que compartilham a atividade.'));for(const f of state?.feed || []){const c=card(f.nick);c.append(empty(`${date(f.at)} · ${f.map} · ${f.mode} · ${f.kills} abates${f.result==='win'?' · levou a rodada':''}`),link('VER PERFIL',`/u/${f.player_id}/perfil`));content.append(c);}if(!state?.feed.length)content.append(empty('A resenha ainda está quieta. Jogue com amigos para ver novidades aqui.'));}
  function showSettings(){const p=state?.profile;if(!p){content.append(empty('Entre para configurar seu perfil.'));return;}const c=card('Seu perfil, suas regras.'),bio=el('textarea');bio.value=p.bio;bio.maxLength=280;const form=el('form');
    form.append(field('Bio (até 280 caracteres)',bio));const selections={};for(const [key,label,options] of [['profile','Quem vê seu perfil?',[['public','Todo mundo'],['friends','Amigos'],['private','Só você']]],['presence','Quem vê sua presença?',[['friends','Amigos'],['private','Só você']]],['activity','Quem vê sua atividade?',[['friends','Amigos'],['private','Só você']]]]){const select=el('select');for(const [value,text]of options){const o=el('option',text);o.value=value;select.append(o);}select.value=p.settings[key];selections[key]=select;form.append(field(label,select));}
    const urls=el('textarea');urls.value=(p.socials || []).map(s=>s.url).join('\n');urls.maxLength=1100;form.append(field('Links opcionais, um por linha: Instagram, TikTok, X, GitHub, YouTube ou Twitch',urls));
    const save=button('SALVAR PERFIL',async()=>{const list=urls.value.split('\n').map(s=>s.trim()).filter(Boolean).map(url=>({url}));await action('settings',null,{bio:bio.value,profile:selections.profile.value,presence:selections.presence.value,activity:selections.activity.value,links:list});});form.append(save);form.onsubmit=e=>{e.preventDefault();save.click();};c.append(form);
    const avatar=input('',undefined,'file');avatar.accept='image/png,image/jpeg,image/webp';c.append(field('Avatar (PNG, JPEG ou WebP, até 3 MB)',avatar),button('ENVIAR FOTO',async()=>{const file=avatar.files[0];if(!file || !['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>3000000)throw new Error('avatar_invalid');const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});await api('/api/avatar',{image});await refresh();await render();}));
    const newsletter=el('section','','social-newsletter');newsletter.append(el('h3','Novidades por e-mail'));const control=el('div');mountNewsletter(control,auth,message);newsletter.append(control);c.append(newsletter);
    c.append(el('h3','Jogadores bloqueados'));for(const b of state.blocks)c.append(empty(b.nick),button('DESBLOQUEAR',()=>action('unblock',b.id)));if(!state.blocks.length)c.append(empty('Nenhum jogador bloqueado.'));content.append(c);
  }
  async function render(){const version=++loadVersion;content.replaceChildren();content.setAttribute('aria-busy','true');for(const b of document.querySelectorAll('.social-tabs button'))b.setAttribute('aria-current',String(b.dataset.tab===tab));try{if(tab==='profile'){if(profileId || auth?.profile)await showProfile(profileId || auth.profile.id,version);else content.append(empty('Entre na conta para criar seu perfil.'));}else if(tab==='friends')showFriends();else if(tab==='ranking')await showRanking(version);else if(tab==='notifications')showNotifications();else if(tab==='feed')showFeed();else if(tab==='settings')showSettings();}catch(e){message(errors[e.message] || 'Perfil privado ou indisponível.');content.append(empty('Não foi possível carregar esta tela.'),button('TENTAR DE NOVO',render));}finally{if(version===loadVersion)content.setAttribute('aria-busy','false');}}
  async function boot(){message('Carregando a turma…');try{[auth,loginConfig]=await Promise.all([loadAccount(),loadAuthOptions()]);if(auth?.profile){acceptAccount(auth);await api('/api/social',{action:'presence'});}await refresh();renderAccount();await render();message('');}catch(e){message(errors[e.message] || 'A comunidade não respondeu.');renderAccount();content.replaceChildren(button('TENTAR DE NOVO',boot));}}
  for(const b of document.querySelectorAll('.social-tabs button'))b.onclick=()=>{tab=b.dataset.tab;if(tab==='profile')profileId=root.dataset.profile || '';message('');void render();};
  setInterval(async()=>{if(document.hidden || !auth?.profile)return;try{await api('/api/social',{action:'presence'});await refresh();if(['notifications','feed'].includes(tab) && !document.activeElement?.closest('form'))await render();}catch(e){message(errors[e.message] || 'A atualização da comunidade falhou.');}},30000);
  const query=new URLSearchParams(location.search);if(['profile','friends','ranking','notifications','feed','settings'].includes(query.get('social')))tab=query.get('social');
  root.addEventListener('click',event=>{const a=event.target.closest('a');if(!a)return;const url=new URL(a.href,location.href),match=url.pathname.match(/^\/u\/([0-9a-f-]{36})(?:\/|$)/i);if(url.origin!==location.origin || !match)return;event.preventDefault();profileId=match[1];tab='profile';void render();});
  document.addEventListener('cs-account-change',event=>{auth=event.detail;void refresh().then(()=>{renderAccount();return render();}).catch(e=>message(errors[e.message] || 'Sua sessão está indisponível.'));});
  document.addEventListener('cs-community-open',event=>{if(event.detail?.tab)tab=event.detail.tab;void boot();});
  void boot();
}
