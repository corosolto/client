import {proxyApiRequest} from './api-proxy.mjs';
const BACKEND=import.meta.env.PUBLIC_API_BASE || 'https://csbrasil-backend-hupd3weo5q-rj.a.run.app';
export const PROFILE_SITE='https://www.corosolto.com.br';
export async function publicProfile(key:string,request:Request,clientAddress:string){
 if(!/^(?:[a-z][a-z0-9_]{2,23}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(key))return {status:404,profile:null};
 const response=await proxyApiRequest(new Request(request.url),`${BACKEND.replace(/\/$/,'')}/api/social?action=profile&id=${encodeURIComponent(key)}`,clientAddress,fetch,{segredo:import.meta.env.API_PROXY_SECRET || ''});
 if(!response.ok)return {status:[404,429].includes(response.status)?response.status:503,profile:null};
 try{const {profile}=await response.json();if(profile?.visibility!=='public' || !['server_verified','historical_plus_server_verified'].includes(profile?.source))return {status:404,profile:null};return {status:200,profile};}catch{return {status:503,profile:null};}
}
