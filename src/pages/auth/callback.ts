import type { APIRoute } from 'astro';
import { proxyApiRequest } from '../../lib/api-proxy.mjs';
export const prerender=false;
export const GET:APIRoute=async ({request,url,clientAddress})=> {
  const base=import.meta.env.PUBLIC_API_BASE || 'https://csbrasil-backend-hupd3weo5q-rj.a.run.app';
  const query=new URLSearchParams({action:'callback',state:url.searchParams.get('state') || '',code:url.searchParams.get('code') || ''});
  return proxyApiRequest(request,`${base}/api/social-auth?${query}`,clientAddress,fetch,{segredo:import.meta.env.API_PROXY_SECRET || '',session:true});
};
