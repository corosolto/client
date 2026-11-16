const SITE_TOKENS = new Map([
  ['corosolto.com.br', '5f7f6c1ab01c4e2fb6b326dbab3e7197'],
  ['www.corosolto.com.br', '5f7f6c1ab01c4e2fb6b326dbab3e7197'],
  ['csbrasil.online', 'b777fa448ebe48d8a635e74e9902be19'],
  ['www.csbrasil.online', 'b777fa448ebe48d8a635e74e9902be19'],
]);

export const usageSiteToken = (hostname) => SITE_TOKENS.get(String(hostname).toLowerCase()) || '';

export function wrapUsageScript(source, token) {
  if (!token) throw new TypeError('usage_site_token_required');
  const bootstrap = `(()=>{const script=document.currentScript,token=${JSON.stringify(token)};const start=()=>{if(script?.dataset.csAllowed!=='1')return;script.dataset.cfBeacon=JSON.stringify({token});window.__cfBeacon={token};};const stop=()=>{if(script)script.dataset.cfBeacon='{"token":""}';window.__cfBeacon=null;};window.__csUsageStart=start;window.__csUsageStop=stop;if(script?.dataset.csAllowed==='1')start();else stop();})();\n`;
  return bootstrap + source;
}
