import {proxyApiRequest} from './api-proxy.mjs';
import {backendUrl,envRuntime} from './env-runtime';
// Clã para o head da página pública /clans/<id>: sem sessão, só o que o diretório mostra a qualquer um.
export async function publicClan(id:string,request:Request,clientAddress:string){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return {status:404,clan:null};
 try{
  const response=await proxyApiRequest(new Request(request.url),`${backendUrl().replace(/\/$/,'')}/api/clans?id=${encodeURIComponent(id)}`,clientAddress,fetch,{segredo:envRuntime('API_PROXY_SECRET') || ''});
  if(!response.ok)return {status:response.status===404?404:503,clan:null};
  const {clan}=await response.json();
  if(!clan || clan.id!==id || !/^[A-Z0-9]{2,5}$/.test(clan.tag) || typeof clan.name!=='string')return {status:404,clan:null};
  return {status:200,clan};
 }catch{return {status:503,clan:null};}
}
