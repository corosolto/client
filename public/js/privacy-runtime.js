/* Medição LIGADA por padrão (dono, 09/11/2026): só recusa gravada em `cs_privacy` desliga;
   storage corrompido/antigo vale como padrão. O coletor entra somente por este gate.
   Réguas: privacy-choice-check, privacy-ops-check. */
(function () {
  if (window.__csPrivacy) return;
  const VERSION='corosolto-analytics-v1',KEY='cs_privacy';
  const USAGE_HOSTS=Object.freeze({'corosolto.com.br':true,'www.corosolto.com.br':true,'csbrasil.online':true,'www.csbrasil.online':true});
  function choice() {
    try {
      const value=JSON.parse(localStorage.getItem(KEY) || 'null');
      return value?.version===VERSION && typeof value.analytics==='boolean'?value:null;
    } catch { return null; }
  }
  function allowed() { return choice()?.analytics!==false; }
  function usageHost() { return USAGE_HOSTS[location.hostname.toLowerCase()]===true; }
  let usageLoaded=false,usageScript=null;
  function enableUsage() {
    if(!allowed() || !usageHost())return;
    if(usageLoaded){
      usageScript.dataset.csAllowed='1';
      window.__csUsageStart?.();
      return;
    }
    usageLoaded=true;
    const script=document.createElement('script');
    usageScript=script;
    script.src='/api/usage-script.js';
    script.dataset.csAllowed='1';
    script.addEventListener('load',()=>{
      if(!allowed())stopUsage();
    });
    document.head.appendChild(script);
  }
  function stopUsage() {
    if(usageScript)usageScript.dataset.csAllowed='0';
    window.__csUsageStop?.();
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
    if(!analytics)stopUsage();
    return value;
  }
  if(!allowed())clearOptionalStorage();
  enableUsage();
  window.addEventListener('cs-privacy-change',enableUsage);
  window.addEventListener('storage',event=>{
    if(event.key!==KEY && event.key!==null)return;
    const value=choice() || {version:VERSION,analytics:true};
    if(!allowed())clearOptionalStorage();
    notify(value);
    if(!allowed())stopUsage();
  });
  window.__csPrivacy={allowed,choice,set};
})();
