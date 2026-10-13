import type {APIRoute} from 'astro';
import {Resvg} from '@resvg/resvg-js';
import fontSource from '../../../lib/font-data.ts?raw';
import {publicProfile} from '../../../lib/public-profile';
import {profileCardSvg} from '../../../lib/profile-card.mjs';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
export const prerender=false;
declare const __SOCIAL_PORTRAITS__:Record<string,string>;
declare const __SOCIAL_CHARACTERS__:Record<string,{id:string;nome:string}>;
const fontBuffers=[Buffer.from([...fontSource.matchAll(/'([A-Za-z0-9+/=]+)'/g)].map(m=>m[1]).join(''),'base64')];
let fontFile:Promise<string> | null=null;
function embeddedFont(){return fontFile??=(async()=>{const dir=await mkdtemp(join(tmpdir(),'corosolto-profile-'));const file=join(dir,'bold.ttf');await writeFile(file,fontBuffers[0]);return file;})().catch(e=>{fontFile=null;throw e;});}
export const GET:APIRoute=async({params,request,clientAddress})=>{
 const headers={'cache-control':'no-store','x-content-type-options':'nosniff'};
 try{
  const {profile,status}=await publicProfile(params.key || '',request,clientAddress);
  if(!profile)return new Response('Perfil indisponível',{status,headers});
  const character=typeof profile.last_character==='string' && Object.hasOwn(__SOCIAL_CHARACTERS__,profile.last_character)?__SOCIAL_CHARACTERS__[profile.last_character]:null;
  const portrait=character?__SOCIAL_PORTRAITS__[character.id]:null;
  const svg=profileCardSvg(profile,character,portrait);
  const render=new Resvg(svg,{font:{fontFiles:[await embeddedFont()],loadSystemFonts:false,defaultFontFamily:'DejaVu Sans'},background:'#0c0e11'});
  return new Response(new Uint8Array(render.render().asPng()),{headers:{...headers,'content-type':'image/png'}});
 }catch{return new Response('Cartão indisponível',{status:503,headers});}
};
