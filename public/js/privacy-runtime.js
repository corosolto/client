(function () {
  if (window.__csPrivacy) return;
  const VERSION='corosolto-analytics-v1',KEY='cs_privacy';
  function choice() {
    try {
      const value=JSON.parse(localStorage.getItem(KEY) || 'null');
      return value?.version===VERSION && typeof value.analytics==='boolean'?value:null;
    } catch { return null; }
  }
  function allowed() { return choice()?.analytics===true; }
  function clearOptionalStorage() {
    try { localStorage.removeItem('cs_acq');localStorage.removeItem('cs_ops_last');sessionStorage.removeItem('cs_session'); } catch {}
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
    notify(choice() || {version:VERSION,analytics:false});
  });
  window.__csPrivacy={allowed,choice,set};
})();
