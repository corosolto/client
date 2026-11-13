import type { APIRoute } from 'astro';
import { proxyApiRequest } from '../../lib/api-proxy.mjs';
import { backendUrl, envRuntime } from '../../lib/env-runtime';
export const prerender=false;
export const GET:APIRoute=async ({request,url,clientAddress})=> {
  const base=backendUrl();
  const query=new URLSearchParams({action:'callback',state:url.searchParams.get('state') || '',code:url.searchParams.get('code') || ''});
  const response=await proxyApiRequest(request,`${base}/api/social-auth?${query}`,clientAddress,fetch,{segredo:envRuntime('API_PROXY_SECRET') || '',session:true});
  if(response.status!==302)return new Response(null,{status:303,headers:{location:'/?secao=comunidade&auth_error=expired','cache-control':'no-store'}});
  return response;
};
