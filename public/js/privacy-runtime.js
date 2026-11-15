/* Medição LIGADA por padrão (dono, 09/11/2026): só recusa gravada em `cs_privacy` desliga;
   storage corrompido/antigo vale como padrão. Cloudflare Web Analytics só entra por este gate.
   Réguas: privacy-choice-check, privacy-ops-check. */
(function () {
  if (window.__csPrivacy) return;
  const VERSION='corosolto-analytics-v1',KEY='cs_privacy';
  const CLOUDFLARE_TOKENS=Object.freeze({
    'corosolto.com.br':'5f7f6c1ab01c4e2fb6b326dbab3e7197',
    'csbrasil.online':'b777fa448ebe48d8a635e74e9902be19',
  });
  function choice() {
    try {
      const value=JSON.parse(localStorage.getItem(KEY) || 'null');
      return value?.version===VERSION && typeof value.analytics==='boolean'?value:null;
    } catch { return null; }
  }
  function allowed() { return choice()?.analytics!==false; }
  function cloudflareToken() {
    const host=location.hostname.toLowerCase();
    return Object.entries(CLOUDFLARE_TOKENS).find(([domain])=>host===domain || host.endsWith(`.${domain}`))?.[1] || '';
  }
  let cloudflareLoaded=false;
  function enableCloudflareAnalytics() {
    const token=cloudflareToken();
    if(cloudflareLoaded || !allowed() || !token)return;
    cloudflareLoaded=true;
    const script=document.createElement('script');
    script.type='module';
    script.src='https://static.cloudflareinsights.com/beacon.min.js';
    script.dataset.cfBeacon=JSON.stringify({token});
    document.head.appendChild(script);
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
  enableCloudflareAnalytics();
  window.addEventListener('cs-privacy-change',enableCloudflareAnalytics);
  window.addEventListener('storage',event=>{
    if(event.key!==KEY && event.key!==null)return;
    if(!allowed())clearOptionalStorage();
    notify(choice() || {version:VERSION,analytics:true});
  });
  window.__csPrivacy={allowed,choice,set};
})();
