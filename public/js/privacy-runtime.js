/* Medição LIGADA por padrão (dono, 09/11/2026): só recusa gravada em `cs_privacy` desliga;
   storage corrompido/antigo vale como padrão; nenhum script de terceiro. Réguas: privacy-choice-check, privacy-ops-check. */
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
  window.addEventListener('storage',event=>{
    if(event.key!==KEY && event.key!==null)return;
    if(!allowed())clearOptionalStorage();
    notify(choice() || {version:VERSION,analytics:true});
  });
  window.__csPrivacy={allowed,choice,set};
})();
