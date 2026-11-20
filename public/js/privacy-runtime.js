/* Medição LIGADA por padrão (dono, 09/11/2026): só recusa gravada em `cs_privacy` desliga;
   storage corrompido/antigo vale como padrão. Cloudflare Web Analytics só entra por este gate.
   Réguas: privacy-choice-check, privacy-ops-check. */
(function () {
  if (window.__csPrivacy) return;
  const VERSION='corosolto-analytics-v1',KEY='cs_privacy';
  const CLOUDFLARE_TOKENS=Object.freeze({
    'corosolto.com.br':'5f7f6c1ab01c4e2fb6b326dbab3e7197',
    'www.corosolto.com.br':'5f7f6c1ab01c4e2fb6b326dbab3e7197',
    'csbrasil.online':'b777fa448ebe48d8a635e74e9902be19',
    'www.csbrasil.online':'b777fa448ebe48d8a635e74e9902be19',
  });
  function choice() {
    try {
      const value=JSON.parse(localStorage.getItem(KEY) || 'null');
      return value?.version===VERSION && typeof value.analytics==='boolean'?value:null;
    } catch { return null; }
  }
  function allowed() { return choice()?.analytics!==false; }
  function cloudflareToken() {
    return CLOUDFLARE_TOKENS[location.hostname.toLowerCase()] || '';
  }
  let cloudflareLoaded=false,cloudflareScript=null;
  function enableCloudflareAnalytics() {
    const token=cloudflareToken();
    if(!allowed() || !token)return;
    window.__cfBeacon={token};
    if(cloudflareLoaded){
      // Se o script ainda não executou, restaura o token no mesmo elemento; nunca cria uma segunda instância.
      cloudflareScript.dataset.cfBeacon=JSON.stringify({token});
      return;
    }
    cloudflareLoaded=true;
    const script=document.createElement('script');
    cloudflareScript=script;
    /* Clássico, como no snippet da Cloudflare (#1425). Este arquivo roda antes do importmap: um
       `type=module` injetado aqui faz o Firefox ignorar o importmap, e `import 'three'` derruba o boot. */
    script.defer=true;
    script.src='https://static.cloudflareinsights.com/beacon.min.js';
    script.dataset.cfBeacon=JSON.stringify({token});
    script.addEventListener('load',()=>{
      if(!allowed())window.__cfBeacon=null;
    });
    document.head.appendChild(script);
  }
  function stopCloudflareAnalytics() {
    // O beacon consulta este global antes de cada envio; anulá-lo preserva o fluxo atual.
    window.__cfBeacon=null;
    // Se o script ainda não executou, ele também não pode capturar um token válido.
    if(cloudflareScript)cloudflareScript.dataset.cfBeacon='{"token":""}';
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
    if(!analytics)stopCloudflareAnalytics();
    return value;
  }
  if(!allowed())clearOptionalStorage();
  enableCloudflareAnalytics();
  window.addEventListener('cs-privacy-change',enableCloudflareAnalytics);
  window.addEventListener('storage',event=>{
    if(event.key!==KEY && event.key!==null)return;
    const value=choice() || {version:VERSION,analytics:true};
    if(!allowed())clearOptionalStorage();
    notify(value);
    if(!allowed())stopCloudflareAnalytics();
  });
  window.__csPrivacy={allowed,choice,set};
})();
