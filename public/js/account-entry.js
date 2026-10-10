const PROVIDER_NAMES={google:'Google',twitter:'X / Twitter',x:'X / Twitter',facebook:'Facebook',linkedin_oidc:'LinkedIn',discord:'Discord',github:'GitHub'};
const ERRORS={email_invalid:'Revise seu e-mail.',email_unavailable:'A entrada por e-mail está indisponível agora.',email_unverified:'Sua conta precisa de um e-mail confirmado.',rate_limited:'Muitos pedidos. Aguarde antes de tentar de novo.',guest_invalid:'Não foi possível vincular este convidado. Seu progresso local continua salvo.',account_conflict:'Esse nick já tem dono. Escolha outro.',session_expired:'Sua sessão expirou. Entre novamente.',account_hidden:'Conta indisponível pela moderação.'};
const node=(tag,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
let accountRequest=null,configRequest=null,accountActive=false;
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
    if(auth.profile){container.append(node('p',`Salve, ${auth.profile.nick}. Sua conta está salva.`),button('VER MEU PERFIL',()=>{document.querySelector('[data-hub-tab=comunidade]')?.click();document.dispatchEvent(new CustomEvent('cs-community-open',{detail:{tab:'profile'}}));onGuest();}),button('SAIR DA CONTA',async()=>{await logoutAccount(auth);await onAuthenticated({authenticated:false});}),status);return;}
    const form=node('form'),label=node('label','Como a turma vai te chamar?','social-field'),nick=node('input');nick.required=true;nick.maxLength=14;nick.pattern='[A-Za-z0-9_.\\-]{2,14}';nick.autocomplete='nickname';label.append(nick);
    const submit=button('VESTIR A CAMISA ▸',async()=>{if(!form.reportValidity())return;const out=await socialApi('/api/social-auth',{action:'onboard',nick:nick.value,...(guestProof()?{guest:guestProof()}:{})});auth.profile=out.profile;acceptAccount(auth);await onAuthenticated(auth);});
    form.append(label,node('p','2 a 14 letras, números, ponto, hífen ou _.','social-muted'),submit);form.onsubmit=e=>{e.preventDefault();submit.click();};container.append(form,status);return;
  }
  container.append(node('p','Guarde suas conquistas, encontre a turma e volte pra próxima treta.','social-muted'));
  const consentLabel=node('label','','account-consent'),consent=node('input');consent.type='checkbox';consent.name='newsletter';consent.checked=false;
  consentLabel.append(consent,document.createTextNode('Quero receber novidades do Coro Solto por e-mail. Opcional; vou confirmar meu e-mail e posso sair quando quiser.'));
  const privacy=node('a','Como usamos seus dados','account-privacy');privacy.href='/privacidade';privacy.target='_blank';privacy.rel='noopener';
  let linkGuest=true;
  const payload=()=>({returnTo,newsletter:consent.checked,...(linkGuest && guestProof()?{guest:guestProof()}:{})});
  const perform=async fn=>{try{await fn();}catch(e){if(e.message==='guest_invalid'){container.append(button('ENTRAR SEM VINCULAR O CONVIDADO',async()=>{linkGuest=false;say('Seu histórico local continua neste navegador. Tente entrar de novo.');}));}throw e;}};
  const providers=node('div','','account-providers');
  for(const provider of config.providers || [])if(PROVIDER_NAMES[provider])providers.append(button(`ENTRAR COM ${PROVIDER_NAMES[provider]}`,()=>perform(async()=>{const out=await socialApi('/api/social-auth',{action:'start',provider,...payload()});location.assign(out.url);}),'account-provider'));
  if(providers.childElementCount)container.append(providers);
  if(config.email) {
    const form=node('form','','account-email'),label=node('label','Ou entre / crie sua conta com e-mail','social-field'),email=node('input');email.type='email';email.required=true;email.maxLength=254;email.autocomplete='email';email.placeholder='Seu e-mail';label.append(email);
    const submit=button('RECEBER LINK DE ENTRADA ▸',()=>perform(async()=>{if(!form.reportValidity())return;await socialApi('/api/social-auth',{action:'email',email:email.value,...payload()});say('Confira sua caixa de entrada. Abra o link neste navegador para confirmar a conta'+(consent.checked?' e sua escolha de receber novidades.':'.'));}));
    form.append(label,submit);form.onsubmit=e=>{e.preventDefault();submit.click();};container.append(form,consentLabel,privacy);
  } else if(providers.childElementCount)container.append(consentLabel,privacy);
  if(!providers.childElementCount && !config.email)container.append(node('p','Login de conta ainda indisponível neste ambiente. O jogo como convidado está liberado.','social-muted'));
  if(config.password) {
    const details=node('details','','account-dev'),summary=node('summary','Conta de teste local'),form=node('form'),email=node('input'),password=node('input');email.type='email';email.required=true;email.autocomplete='username';password.type='password';password.required=true;password.autocomplete='current-password';
    const eLabel=node('label','E-mail de teste','social-field'),pLabel=node('label','Senha de teste','social-field');eLabel.append(email);pLabel.append(password);
    const submit=button('ENTRAR NA CONTA DE TESTE',async()=>{if(!form.reportValidity())return;await socialApi('/api/social-auth',{action:'password',email:email.value,password:password.value});password.value='';const session=await loadAccount();acceptAccount(session);await onAuthenticated(session);});
    form.append(eLabel,pLabel,submit);form.onsubmit=e=>{e.preventDefault();submit.click();};details.append(summary,form);container.append(details);
  }
  container.append(status,button('CONTINUAR COMO CONVIDADO',onGuest,'account-guest'));
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
  const maybePrompt=()=>{if(loading || skipPrompt || dismissed || dialog.open || document.getElementById('boot-splash') || document.getElementById('main-menu')?.classList.contains('hidden'))return;if(failedReturn || (auth?.authenticated?!auth.profile:!localStorage.getItem('awpbr_nick')?.trim())){show();if(failedReturn)body.append(node('p','Esse link de entrada expirou ou foi aberto em outro navegador. Peça um novo link.','account-entry-status'));}};
  const observer=new MutationObserver(maybePrompt);observer.observe(document.body,{childList:true});
  async function hydrate(){loading=true;loadError=null;if(dialog.open)draw();try{[auth,config]=await Promise.all([loadAccount(),loadAuthOptions()]);acceptAccount(auth);onSession(auth);open.textContent=auth?.authenticated?'MINHA CONTA':'ENTRAR';await completion();}catch(e){loadError=e;}finally{loading=false;if(dialog.open)draw();maybePrompt();}}
  await hydrate();
  document.addEventListener('cs-account-change',event=>{auth=event.detail;onSession(auth);open.textContent=auth?.authenticated?'MINHA CONTA':'ENTRAR';void completion();});
}
