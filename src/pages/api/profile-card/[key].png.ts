import type {APIRoute} from 'astro';
import {publicProfile} from '../../../lib/public-profile';
import {profileCardSvg} from '../../../lib/profile-card.mjs';
import {renderPng} from '../../../lib/png';
import {bordaImagem} from '#borda-imagem';
import {SITE} from '../../../lib/site';
export const prerender=false;
declare const __SOCIAL_PORTRAITS__:Record<string,string>;
declare const __SOCIAL_CHARACTERS__:Record<string,{id:string;nome:string}>;
declare const __SOCIAL_LOGO__:string;
export const GET:APIRoute=async({params,request,clientAddress})=>{
 const headers={'cache-control':'no-store','x-content-type-options':'nosniff'};
 try{
  const {profile,status}=await publicProfile(params.key || '',request,clientAddress);
  if(!profile)return new Response('Perfil indisponível',{status,headers});
  const character=typeof profile.last_character==='string' && Object.hasOwn(__SOCIAL_CHARACTERS__,profile.last_character)?__SOCIAL_CHARACTERS__[profile.last_character]:null;
  const portrait=character?await bordaImagem.retratoDataUri(request,__SOCIAL_PORTRAITS__[character.id]):null;
  const svg=profileCardSvg(profile,character,portrait,SITE,__SOCIAL_LOGO__);
  // resvg-wasm nas duas bordas (src/lib/png.ts): o resvg-js nativo e o ttf em tmpdir saíram.
  return new Response(await renderPng(request,svg,'#0c0e11'),{headers:{...headers,'content-type':'image/png'}});
 }catch{return new Response('Cartão indisponível',{status:503,headers});}
};
