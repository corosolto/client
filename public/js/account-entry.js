import {analyticsAllowed,mountPrivacyChoice,setPrivacyChoice} from './privacy-preferences.js';
import {accountVerifiedBadge} from './account-verified.js';
const REQUIRED_PROVIDERS=['google','discord','x','linkedin_oidc'];
const providerChoices=config=>[...new Set([...REQUIRED_PROVIDERS.map(p=>p==='x' && config.providers?.includes('twitter') && !config.providers?.includes('x')?'twitter':p),...(config.providers || [])])];
const PROVIDER_NAMES={google:'Google',twitter:'X / Twitter',x:'X / Twitter',facebook:'Facebook',linkedin_oidc:'LinkedIn',discord:'Discord',github:'GitHub'};
// Marcas oficiais: G do Google (asset do Google), Discord/X/LinkedIn do simple-icons (CC0; LinkedIn via v11.14.0, como em src/lib/net-svg.ts).
const PROVIDER_ICONS={"google":"<svg viewBox=\"0 0 120 120\" aria-hidden=\"true\"><path fill=\"#4285F4\" d=\"M117.6,61.3636364 C117.6,57.1090909 117.218182,53.0181818 116.509091,49.0909091 L60,49.0909091 L60,72.3 L92.2909091,72.3 C90.9,79.8 86.6727273,86.1545455 80.3181818,90.4090909 L80.3181818,105.463636 L99.7090909,105.463636 C111.054545,95.0181818 117.6,79.6363636 117.6,61.3636364 L117.6,61.3636364 Z\"/><path fill=\"#34A853\" d=\"M60,120 C76.2,120 89.7818182,114.627273 99.7090909,105.463636 L80.3181818,90.4090909 C74.9454545,94.0090909 68.0727273,96.1363636 60,96.1363636 C44.3727273,96.1363636 31.1454545,85.5818182 26.4272727,71.4 L6.38181818,71.4 L6.38181818,86.9454545 C16.2545455,106.554545 36.5454545,120 60,120 L60,120 Z\"/><path fill=\"#FBBC05\" d=\"M26.4272727,71.4 C25.2272727,67.8 24.5454545,63.9545455 24.5454545,60 C24.5454545,56.0454545 25.2272727,52.2 26.4272727,48.6 L26.4272727,33.0545455 L6.38181818,33.0545455 C2.31818182,41.1545455 0,50.3181818 0,60 C0,69.6818182 2.31818182,78.8454545 6.38181818,86.9454545 L26.4272727,71.4 L26.4272727,71.4 Z\"/><path fill=\"#EA4335\" d=\"M60,23.8636364 C68.8090909,23.8636364 76.7181818,26.8909091 82.9363636,32.8363636 L100.145455,15.6272727 C89.7545455,5.94545455 76.1727273,0 60,0 C36.5454545,0 16.2545455,13.4454545 6.38181818,33.0545455 L26.4272727,48.6 C31.1454545,34.4181818 44.3727273,23.8636364 60,23.8636364 L60,23.8636364 Z\"/></svg>","discord":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"#5865F2\" d=\"M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z\"/></svg>","x":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z\"/></svg>","linkedin_oidc":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"#0A66C2\" d=\"M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z\"/></svg>","twitter":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z\"/></svg>"};
const withIcon=(b,provider)=>{if(PROVIDER_ICONS[provider]){const i=node('span','','account-provider-icon');i.innerHTML=PROVIDER_ICONS[provider];const label=b.textContent;b.textContent='';b.append(i,label);}return b;};
const ERRORS={email_invalid:'Revise seu e-mail.',email_unavailable:'A entrada por e-mail está indisponível agora.',email_unverified:'Sua conta precisa de um e-mail confirmado.',rate_limited:'Muitos pedidos. Aguarde antes de tentar de novo.',guest_invalid:'Não foi possível vincular este convidado. Seu progresso local continua salvo.',account_conflict:'Esse nick já tem dono. Escolha outro.',session_expired:'Sua sessão expirou. Entre novamente.',account_hidden:'Conta indisponível pela moderação.'};
const node=(tag,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
/* /u/<perfil> roda o jogo num iframe da mesma origem. Provedor de login recusa iframe,
   então a ida ao provedor sai do quadro. Em portal de outra origem nada muda. */
const leaveTo=url=>{let target=location;try{if(top!==self && top.location.origin===location.origin)target=top.location;}catch{ /* topo de outra origem */ }target.assign(url);};
let accountRequest=null,configRequest=null,accountActive=false;
let newsletterDraft=false;
export async function socialApi(path,body) {
  const r=await fetch(path,{credentials:'same-origin',headers:{'content-type':'application/json'},...(body?{method:'POST',body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
  let data;try{data=await r.json();}catch{throw new Error('social_unavailable');}
  if(!r.ok)throw new Error(data.error || 'social_unavailable');
  return data;
}
export function loadAccount() {
  if(!accountRequest)accountRequest=socialApi('/api/social-auth').finally(()=>accountRequest=null);
  return accountRequest;
}
export function loadAuthOptions() {
  if(!configRequest)configRequest=socialApi('/api/social-auth?action=providers').finally(()=>configRequest=null);
  return configRequest;
}
export function accountError(e){return ERRORS[e.message] || 'A conta não respondeu. Tente novamente; você pode continuar como convidado.';}
export function guestProof() {
  if(accountActive)return undefined;
  const uid=localStorage.getItem('cs_anon'),token=localStorage.getItem('awpbr_token'),nick=localStorage.getItem('awpbr_nick');
  return uid && token && nick?{uid,token}:undefined;
}
export function acceptAccount(auth) {
  accountActive=!!auth?.authenticated;
  if(accountActive)newsletterDraft=false;
  if(!auth?.profile)return;
  const guest=localStorage.getItem('awpbr_token');
  if(guest && localStorage.getItem('cs_anon') && localStorage.getItem('awpbr_nick'))localStorage.setItem('cs_guest_identity',JSON.stringify({uid:localStorage.getItem('cs_anon'),token:guest,nick:localStorage.getItem('awpbr_nick')}));
  localStorage.setItem('awpbr_nick',auth.profile.nick);
  localStorage.removeItem('awpbr_token');
  document.dispatchEvent(new CustomEvent('cs-account-change',{detail:auth}));
}
export async function logoutAccount(auth) {
  let guest;try{guest=JSON.parse(localStorage.getItem('cs_guest_identity') || 'null');}catch{guest=null;}
  const out=await socialApi('/api/social-auth',{action:'logout',...(guest?{guest:{uid:guest.uid,token:guest.token}}:{})});
  accountActive=false;
  if(out.guestAvailable!==false && guest && ['uid','token','nick'].every(k=>typeof guest[k]==='string' && guest[k].length<=256)) {
    localStorage.setItem('cs_anon',guest.uid);localStorage.setItem('awpbr_token',guest.token);localStorage.setItem('awpbr_nick',guest.nick);localStorage.removeItem('cs_guest_identity');
  }else {
    if(guest && out.guestAvailable===false){localStorage.removeItem('cs_guest_identity');localStorage.removeItem('awpbr_token');localStorage.removeItem('cs_anon');}
    if(localStorage.getItem('awpbr_nick')===auth?.profile?.nick)localStorage.removeItem('awpbr_nick');
  }
  document.dispatchEvent(new CustomEvent('cs-account-change',{detail:{authenticated:false}}));
}
export function mountAccountEntry(container,{auth=null,config={providers:[]},returnTo='game',onAuthenticated=()=>{},onGuest=()=>{},message=()=>{}}={}) {
  container.replaceChildren();
  const status=node('p','','account-entry-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const say=text=>{status.textContent=text;message(text);};
  const button=(text,fn,cls='')=>{const b=node('button',text,`account-button ${cls}`);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){say(accountError(e));}finally{b.disabled=false;}};return b;};
  if(auth?.authenticated) {
    if(auth.profile){container.append(node('p',`Salve, ${auth.profile.nick}. Sua conta está salva.`),button('VER MEU PERFIL',()=>{document.querySelector('[data-hub-tab=comunidade]')?.click();document.dispatchEvent(new CustomEvent('cs-community-open',{detail:{tab:'profile'}}));onGuest();}),button('SAIR DA CONTA',async()=>{await logoutAccount(auth);await onAuthenticated({authenticated:false});}));mountAccountIntegrations(container,auth,config,say);void mountProfilePreferences(container,{auth,message:say});container.append(status);return;}
    const form=node('form'),label=node('label','Como a turma vai te chamar?','social-field'),nick=node('input');nick.required=true;nick.maxLength=32;nick.pattern='[A-Za-z0-9_.\\-]{2,32}';nick.autocomplete='nickname';label.append(nick);
    const submit=button('VESTIR A CAMISA ▸',async()=>{if(!form.reportValidity())return;const out=await socialApi('/api/social-auth',{action:'onboard',nick:nick.value,...(guestProof()?{guest:guestProof()}:{})});auth.profile=out.profile;auth.account_verified=out.account_verified===true;acceptAccount(auth);await onAuthenticated(auth);});
    form.append(label,node('p','2 a 32 letras, números, ponto, hífen ou _.','social-muted'),submit);form.onsubmit=e=>{e.preventDefault();submit.click();};container.append(form);void mountProfilePreferences(container,{auth,message:say});container.append(status);return;
  }
  container.append(node('p','Guarde suas conquistas, encontre a turma e volte pra próxima treta.','social-muted'));
  const grid=node('div','','account-entry-grid'),entryColumn=node('section','','account-login-column'),choiceColumn=node('section','','account-choice-column');
  entryColumn.append(node('h3','ENTRE OU CRIE SUA CONTA'));choiceColumn.append(node('h3','SUAS ESCOLHAS'));
  grid.append(entryColumn,choiceColumn);container.append(grid);
  const consentLabel=node('label','','account-consent'),consent=node('input');consent.type='checkbox';consent.name='newsletter';consent.checked=newsletterDraft;
  consentLabel.append(consent,document.createTextNode('Quero receber novidades do Coro Solto por e-mail. Opcional; vou confirmar meu e-mail e posso sair quando quiser.'));
  const privacy=node('a','Como usamos seus dados','account-privacy');privacy.href='/privacidade';privacy.target='_blank';privacy.rel='noopener';
  choiceColumn.append(consentLabel);
  const analytics=mountPrivacyChoice(choiceColumn);
  const terms=node('a','Termos de uso','account-privacy');terms.href='/termos';terms.target='_blank';terms.rel='noopener';
  choiceColumn.append(privacy,document.createTextNode(' · '),terms);
  let linkGuest=true;
  const payload=()=>{setPrivacyChoice(analytics.checked);newsletterDraft=consent.checked;return {returnTo,newsletter:consent.checked,analytics:analytics.checked,...(linkGuest && guestProof()?{guest:guestProof()}:{})};};
  const perform=async fn=>{try{await fn();}catch(e){if(e.message==='guest_invalid'){container.append(button('ENTRAR SEM VINCULAR O CONVIDADO',async()=>{linkGuest=false;say('Seu histórico local continua neste navegador. Tente entrar de novo.');}));}throw e;}};
  const providers=node('div','','account-providers');
  for(const provider of providerChoices(config))if(PROVIDER_NAMES[provider]) {
    const enabled=(config.providers || []).includes(provider);
    const b=button(`ENTRAR COM ${PROVIDER_NAMES[provider]}${enabled?'':' · EM CONFIGURAÇÃO'}`,()=>perform(async()=>{if(!enabled)return;const out=await socialApi('/api/social-auth',{action:'start',provider,...payload()});leaveTo(out.url);}),'account-provider');b.disabled=!enabled;b.dataset.provider=provider;providers.append(withIcon(b,provider));
  }
  entryColumn.append(providers);
  if(!config.providers?.length)entryColumn.append(node('p','Os logins sociais estão em configuração. Você já pode usar e-mail quando habilitado.','social-muted'));
  if(config.email) {
    const form=node('form','','account-email'),label=node('label','Ou entre / crie sua conta com e-mail','social-field'),email=node('input');email.type='email';email.required=true;email.maxLength=254;email.autocomplete='email';email.placeholder='Seu e-mail';label.append(email);
    const submit=button('RECEBER LINK DE ENTRADA ▸',()=>perform(async()=>{if(!form.reportValidity())return;await socialApi('/api/social-auth',{action:'email',email:email.value,...payload()});say('Confira sua caixa de entrada. Abra o link neste navegador para confirmar a conta'+(consent.checked?' e sua escolha de receber novidades.':'.'));}));
    form.append(label,submit);form.onsubmit=e=>{e.preventDefault();submit.click();};entryColumn.append(form);
  }
  if(!config.providers?.length && !config.email)container.append(node('p','Login de conta ainda indisponível neste ambiente. O jogo como convidado está liberado.','social-muted'));
  if(config.password) {
    const details=node('details','','account-dev'),summary=node('summary','Conta de teste local'),form=node('form'),email=node('input'),password=node('input');email.type='email';email.required=true;email.autocomplete='username';password.type='password';password.required=true;password.autocomplete='current-password';
    const eLabel=node('label','E-mail de teste','social-field'),pLabel=node('label','Senha de teste','social-field');eLabel.append(email);pLabel.append(password);
    const submit=button('ENTRAR NA CONTA DE TESTE',async()=>{if(!form.reportValidity())return;await socialApi('/api/social-auth',{action:'password',email:email.value,password:password.value});password.value='';const session=await loadAccount();acceptAccount(session);await onAuthenticated(session);});
    form.append(eLabel,pLabel,submit);form.onsubmit=e=>{e.preventDefault();submit.click();};details.append(summary,form);entryColumn.append(details);
  }
  container.append(status,button('CONTINUAR COMO CONVIDADO',()=>{setPrivacyChoice(analytics.checked);newsletterDraft=consent.checked;onGuest();},'account-guest'));
}
export function mountAccountIntegrations(container,auth,config,message=()=>{}) {
  const section=node('section','','account-integrations');section.append(node('h3','Logins vinculados'),node('p','Vincule uma rede para entrar depois na mesma conta. Links públicos do perfil são configurados separadamente.','social-muted'));
  const identities=new Set(auth.identities || []),list=node('div','','account-providers');
  for(const provider of providerChoices(config)) {
    const linked=identities.has(provider),enabled=(config.providers || []).includes(provider),b=node('button',`${linked?'✓ '+PROVIDER_NAMES[provider]+' VINCULADO':'VINCULAR '+PROVIDER_NAMES[provider]}`,'account-button');b.type='button';b.disabled=linked || !enabled || !config.linking;
    b.onclick=async()=>{b.disabled=true;try{const out=await socialApi('/api/social-auth',{action:'link',provider});leaveTo(out.url);}catch(e){message(e.message==='linking_unavailable'?'Vinculação em configuração. Tente novamente mais tarde.':e.message==='identity_already_linked'?'Esta rede já está vinculada. Atualize a página.':e.message==='identity_link_failed'?'Não foi possível vincular. Esta rede pode pertencer a outra conta.':accountError(e));b.disabled=false;}};list.append(b);
  }
  section.append(list);if(auth.emailVerified)section.append(node('p','✓ E-mail confirmado','social-muted'));
  const badge=accountVerifiedBadge(auth.account_verified);section.append(node('h3','Selo da conta'));
  if(badge)section.append(badge,node('p','Seu e-mail está confirmado e uma rede social está vinculada. O selo indica essas verificações da conta.','social-muted'));
  else section.append(node('p','Para receber o selo de verificado, confirme seu e-mail e vincule pelo menos uma rede social.','social-muted'));
  if(!list.childElementCount)section.append(node('p','Os logins sociais ainda não estão habilitados neste ambiente.','social-muted'));if(!config.linking)section.append(node('p','A vinculação de novas redes aguarda habilitação neste ambiente.','social-muted'));container.append(section);
}
const preferenceMounts=new WeakMap();
export async function mountProfilePreferences(container,{auth=null,message=()=>{}}={}) {
  const section=node('section','','account-preferences'),stamp={};preferenceMounts.set(container,stamp);
  if(container.id==='profile-preferences')container.replaceChildren();container.append(section);
  section.append(node('h3','Newsletter e cookies'));
  const note=node('p','','account-entry-status');note.setAttribute('role','status');
  const say=text=>{note.textContent=text;message(text);};
  let current=auth;
  const control=mountPrivacyChoice(section,{onChange:async value=>{try{setPrivacyChoice(value);if(current?.authenticated){await socialApi('/api/social-auth',{action:'privacy',analytics:value});current.privacy={analytics:value};}say(value?'Permissão salva neste navegador.':'Coleta opcional desativada neste navegador.');}catch(e){say('Escolha local aplicada; o registro na conta não respondeu. Tente novamente.');throw e;}}});
  section.append(note);
  if(!current)try{current=await loadAccount();}catch{}
  if(preferenceMounts.get(container)!==stamp)return;
  if(current?.authenticated){const news=node('div');mountNewsletter(news,current,say);section.append(news);}else{
    const label=node('label','','account-consent'),check=node('input');check.type='checkbox';check.name='newsletter';check.checked=newsletterDraft;check.onchange=()=>{newsletterDraft=check.checked;say(check.checked?'Entre ou crie sua conta e confirme seu e-mail para receber novidades.':'Você não será inscrito na newsletter.');};label.append(check,document.createTextNode('Quero receber novidades por e-mail. Opcional; preciso entrar na conta e confirmar meu e-mail.'));
    const login=node('button','ENTRAR OU CRIAR CONTA','account-button');login.type='button';login.onclick=()=>document.getElementById('hub-account-login')?.click();section.append(label,login);
  }
  return control;
}
export function mountNewsletter(container,auth,message=()=>{}) {
  container.replaceChildren();const label=node('label','','account-consent'),check=node('input');check.type='checkbox';check.checked=auth.newsletter?.status==='subscribed';label.append(check,document.createTextNode('Receber novidades do Coro Solto por e-mail'));
  const status=node('p',auth.newsletter?.status==='pending'?'Falta confirmar seu e-mail para receber novidades.':'Sua escolha é opcional e separada da conta.','social-muted');status.setAttribute('role','status');
  check.onchange=async()=>{check.disabled=true;try{if(check.checked){await socialApi('/api/social-auth',{action:'newsletter_start',returnTo:'community'});auth.newsletter={status:'pending'};check.checked=false;status.textContent='Enviamos o link. Confirme seu e-mail neste navegador para receber novidades.';mountNewsletter(container,auth,message);}else{await socialApi('/api/social-auth',{action:'newsletter',subscribed:false});auth.newsletter={status:'unsubscribed'};status.textContent='Você saiu da lista de novidades.';}message(status.textContent);}catch(e){check.checked=auth.newsletter?.status==='subscribed';status.textContent=accountError(e);message(status.textContent);}finally{check.disabled=false;}};
  container.append(label,status);
  if(auth.newsletter?.status==='pending'){const cancel=node('button','CANCELAR INSCRIÇÃO PENDENTE','account-button');cancel.type='button';cancel.onclick=async()=>{try{await socialApi('/api/social-auth',{action:'newsletter',subscribed:false});auth.newsletter={status:'unsubscribed'};mountNewsletter(container,auth,message);}catch(e){message(accountError(e));}};container.append(cancel);}
}
export async function initAccountEntry({onSession=()=>{},skipPrompt=false}={}) {
  const dialog=document.getElementById('account-entry-dialog'),body=document.getElementById('account-entry-body'),close=document.getElementById('account-entry-close'),open=document.getElementById('hub-account-login');
  if(!dialog || !body)return;
  let auth=null,config=null,dismissed=false,previousFocus=null,loading=true,loadError=null;
  const hide=()=>{dismissed=true;dialog.close();previousFocus?.focus();};
  close.onclick=hide;dialog.addEventListener('cancel',()=>{dismissed=true;});
  const draw=()=>{
    if(loading || loadError){const p=node('p',loading?'Carregando as opções de entrada…':accountError(loadError),'account-entry-status');p.setAttribute('role','status');const guest=node('button','CONTINUAR COMO CONVIDADO','account-button account-guest');guest.type='button';guest.onclick=hide;body.replaceChildren(p,guest);if(loadError){const retry=node('button','TENTAR DE NOVO','account-button');retry.type='button';retry.onclick=()=>void hydrate();body.append(retry);}return;}
    mountAccountEntry(body,{auth,config,onGuest:hide,onAuthenticated:async session=>{auth=session;acceptAccount(auth);onSession(auth);if(auth.profile){hide();await completion();}else draw();}});
  };
  const show=()=>{previousFocus=document.activeElement;draw();if(!dialog.open)dialog.showModal();};
  open.onclick=show;
  const nudge=document.getElementById('account-completion');
  async function completion() {
    nudge.hidden=true;
    if(!auth?.profile)return;
    try{const {profile}=await socialApi('/api/social?action=profile');if(!profile.avatar_url || !profile.socials?.length){nudge.hidden=false;document.getElementById('account-completion-copy').textContent=!profile.avatar_url && !profile.socials?.length?'Dê uma cara ao seu coro: adicione foto e redes.':!profile.avatar_url?'Sua foto ainda está no aquecimento.':'Adicione suas redes ao perfil, se quiser.';}}catch{ /* lembrete não bloqueia a entrada */ }
  }
  const failedReturn=new URLSearchParams(location.search).has('auth_error');
  const maybePrompt=()=>{if(loading || skipPrompt || dismissed || dialog.open || document.getElementById('boot-splash') || document.getElementById('main-menu')?.classList.contains('hidden'))return;if(failedReturn || (auth?.authenticated?!auth.profile:true)){show();if(failedReturn)body.append(node('p','Esse link de entrada expirou ou foi aberto em outro navegador. Peça um novo link.','account-entry-status'));}};
  const observer=new MutationObserver(maybePrompt);observer.observe(document.body,{childList:true});
  async function hydrate(){loading=true;loadError=null;if(dialog.open)draw();try{[auth,config]=await Promise.all([loadAccount(),loadAuthOptions()]);acceptAccount(auth);onSession(auth);open.textContent=auth?.authenticated?'MINHA CONTA':'ENTRAR';await completion();}catch(e){loadError=e;}finally{loading=false;if(dialog.open)draw();maybePrompt();}}
  await hydrate();
  document.addEventListener('cs-account-change',event=>{auth=event.detail;onSession(auth);open.textContent=auth?.authenticated?'MINHA CONTA':'ENTRAR';void completion();});
}
