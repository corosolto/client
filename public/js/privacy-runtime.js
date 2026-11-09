/* Medição opcional: LIGADA por padrão (interesse legítimo, decisão do dono em 09/11/2026),
   com recusa explícita e persistente em `cs_privacy`. Só a recusa gravada desliga; sem escolha,
   JSON corrompido ou versão antiga valem como padrão. O identificador que viaja é o `cs_anon`
   (UUID local, sem IP e sem e-mail); `set(false)` apaga o resto do armazenamento opcional.
   Réguas: tools/eval/privacy-choice-check.mjs e tools/eval/privacy-ops-check.mjs. */
(function () {
  if (window.__csPrivacy) return;
  const VERSION='corosolto-analytics-v1',KEY='cs_privacy';
  function choice() {
    try {
      const value=JSON.parse(localStorage.getItem(KEY) || 'null');
      return value?.version===VERSION && typeof value.analytics==='boolean'?value:null;
    } catch { return null; }
  }
  function allowed() { return choice()?.analytics!==false; }
  let vercelLoaded=false;
  function enableVercelAnalytics() {
    if(vercelLoaded || !allowed() || /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname))return;
    vercelLoaded=true;
    window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};
    window.va('beforeSend',event=>{
      if(!allowed())return null;
      try{
        const url=new URL(event.url);
        url.search='';url.hash='';
        if(url.pathname.startsWith('/u/'))url.pathname='/u/:perfil';
        return {...event,url:url.toString()};
      }catch{return null;}
    });
    const script=document.createElement('script');
    script.defer=true;script.src='/_vercel/insights/script.js';document.head.appendChild(script);
  }
  function clearOptionalStorage() {
    try { localStorage.removeItem('cs_acq');localStorage.removeItem('cs_ops_last');sessionStorage.removeItem('cs_session');sessionStorage.removeItem('cs_invite_landing'); } catch {}
  }
  function notify(value) { window.dispatchEvent(new CustomEvent('cs-privacy-change',{detail:value})); }
  function set(analytics) {
    if(typeof analytics!=='boolean')throw new TypeError('privacy_invalid');
    const value={version:VERSION,analytics,updatedAt:new Date().toISOString()};
    localStorage.setItem(KEY,JSON.stringify(value));
    if(!analytics)clearOptionalStorage();
    notify(value);
    return value;
  }
  if(!allowed())clearOptionalStorage();
  enableVercelAnalytics();
  window.addEventListener('cs-privacy-change',enableVercelAnalytics);
  window.addEventListener('storage',event=>{
    if(event.key!==KEY && event.key!==null)return;
    if(!allowed())clearOptionalStorage();
    notify(choice() || {version:VERSION,analytics:true});
  });
  window.__csPrivacy={allowed,choice,set};
})();
