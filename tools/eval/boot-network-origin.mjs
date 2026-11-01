import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import {readFileSync,readdirSync,realpathSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {gzipSync,gunzipSync,brotliDecompressSync,inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const isText=t=>/^(text\/|application\/(?:javascript|json|xml)|image\/svg\+xml)/i.test(t);
function decodeWire(body,encoding='') {
 for(const part of encoding.split(',').map(v=>v.trim().toLowerCase()).filter(Boolean).reverse()) {
  if(part==='gzip')body=gunzipSync(body);else if(part==='br')body=brotliDecompressSync(body);else if(part==='deflate')body=inflateSync(body);else if(part!=='identity')throw Error('content-encoding desconhecido: '+part);
 }
 return body;
}
export function snapshotPublicJs(publicRoot) {
 const root=realpathSync(publicRoot instanceof URL?fileURLToPath(publicRoot):publicRoot),jsroot=realpathSync(path.join(root,'js'));
 const inside=(p,base)=>p===base||p.startsWith(base+path.sep);
 if(!inside(jsroot,root))throw Error('public/js fora da raiz pública');
 const entries=[],visiting=new Set();
 function walk(dir,relative='js') {
  if(visiting.has(dir))throw Error('ciclo de symlink em public/js');visiting.add(dir);
  for(const name of readdirSync(dir).sort()) {
   const file=realpathSync(path.join(dir,name));if(!inside(file,jsroot))throw Error('symlink fora public/js');
   const rel=relative+'/'+name;
   if(statSync(file).isDirectory()){walk(file,rel);continue;}if(!name.endsWith('.js'))continue;
   entries.push(Object.freeze({rel,body:readFileSync(file,'utf8')}));
  }
  visiting.delete(dir);
 }
 walk(jsroot);if(!entries.length)throw Error('grafo JS vazio');entries.sort((a,b)=>a.rel.localeCompare(b.rel));
 const fingerprint=sha(Buffer.from(JSON.stringify(entries)));
 return Object.freeze({root,jsroot,fingerprint,entries:Object.freeze(entries)});
}
export function assertSnapshotLive(snapshot) {
 const current=snapshotPublicJs(snapshot.root);
 if(current.fingerprint!==snapshot.fingerprint)throw Error('snapshot public/js mudou entre passadas: '+snapshot.fingerprint+' -> '+current.fingerprint);
 return true;
}
export async function startBootOrigin({BASE,publicRoot,snapshot=snapshotPublicJs(publicRoot),transformJs=(rel,body)=>body,onError=()=>{},authorizeProfile=null,profileAuthorizationTimeoutMs=5000}) {
 if(!Number.isFinite(profileAuthorizationTimeoutMs)||profileAuthorizationTimeoutMs<=0||profileAuthorizationTimeoutMs>5000)throw Error('timeout de autorização inválido');
 const upstream=new URL(BASE);
 if(!['http:','https:'].includes(upstream.protocol)||upstream.username||upstream.password)throw Error('BASE pública HTTP(S) sem credenciais exigida');
 const modules=new Map(),requests=[],byId=new Map(),active=new Set(),sockets=new Set(),profileDenials=[];let closing=false,nextId=0;
 if(snapshot.fingerprint!==sha(Buffer.from(JSON.stringify(snapshot.entries))))throw Error('snapshot inconsistente');
 for(const {rel,body:original} of snapshot.entries) {
  const body=transformJs(rel,original);if(typeof body!=='string')throw Error('transformJs não retornou texto');
  const decoded=Buffer.from(body),payload=gzipSync(decoded,{level:9});
  modules.set(rel,{rel,body,payload,payloadBytes:payload.length,decodedBytes:decoded.length,sha256:sha(decoded)});
 }
 const versionSource=modules.get('js/version.js')?.body||'',versionMatches=[...versionSource.matchAll(/^export const VERSION = (['"])([^'"\r\n]+)\1;$/gm)];
 const expectedVersion=versionMatches.length===1?versionMatches[0][2]:null;
 function safePath(raw) {
  if(typeof raw!=='string'||!raw.startsWith('/')||raw.startsWith('//')||/[\\\x00-\x20]/.test(raw))throw Error('request-target inválido');
  const parts=raw.split('?')[0].split('/').map(decodeURIComponent);
  if(parts.some(p=>p==='.'||p==='..'||/[\\/\x00-\x1f\x7f]/.test(p)))throw Error('travessia/segmento inválido');
  return parts.join('/');
 }
 function record(res,row) {
  row.id=String(++nextId);row.registeredBeforeWrite=true;row.registeredAt=Date.now();
  requests.push(row);byId.set(row.id,row);res.setHeader('x-boot-response-id',row.id);
  res.once('finish',()=>row.serverFinish=Date.now());res.once('close',()=>{row.serverClose=Date.now();row.closedBeforeFinish=!res.writableFinished;});
 }
 function getWire(url,{method='GET',body}={}) {
  return new Promise((resolve,reject)=>{
   const transport=url.protocol==='https:'?https:http;
   const headers={accept:'*/*','accept-encoding':'gzip, br'};
   if(body){headers['content-type']='application/json';headers['content-length']=String(body.length);headers.origin=upstream.origin;}
   const request=transport.request(url,{method,headers},response=>{
    const chunks=[];response.on('data',b=>chunks.push(b));response.on('aborted',()=>reject(Error('upstream body abortado')));response.on('error',reject);
    response.on('end',()=>{
     try {
      const body=Buffer.concat(chunks),length=response.headers['content-length'];
      if(length!==undefined&&(!/^\d+$/.test(String(length))||Number(length)!==body.length))throw Error('content-length upstream inconsistente');
      resolve({status:response.statusCode,headers:response.headers,body});
     }catch(e){reject(e);}
    });
   });
   request.end(body);
   active.add(request);request.setTimeout(90000,()=>request.destroy(Error('upstream timeout90s')));request.on('error',reject);request.once('close',()=>active.delete(request));
  });
 }
 const server=http.createServer(async(req,res)=>{
  try {
   let pathname;try{pathname=safePath(req.url);}catch(e){res.writeHead(400,{'cache-control':'no-store'});res.end(e.message);return;}
   const query=new URL(req.url,'http://loopback').search;
   let requestBody;
   const heartbeat=req.method==='POST'&&pathname==='/api/treta'&&!query;
   if(req.method!=='GET'&&!heartbeat){res.writeHead(405,{'cache-control':'no-store',allow:'GET'});res.end();return;}
   if(heartbeat) {
    if(!expectedVersion||req.headers['content-type']!=='application/json'){res.writeHead(400);res.end('heartbeat inválido');return;}
    const chunks=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>1024)throw Error('heartbeat acima de 1KiB');chunks.push(chunk);}
    requestBody=Buffer.concat(chunks);let parsed;try{parsed=JSON.parse(requestBody.toString('utf8'));}catch{res.writeHead(400);res.end('JSON inválido');return;}
    if(!parsed||Object.keys(parsed).length!==2||!Object.hasOwn(parsed,'action')||!Object.hasOwn(parsed,'version')||parsed.action!=='invite-health'||parsed.version!==expectedVersion||JSON.stringify(parsed)!==requestBody.toString('utf8')){res.writeHead(400);res.end('heartbeat fora do snapshot');return;}
   }
   const publicApi=(['/api/geo-lang','/api/online','/api/map-plays','/api/treta'].includes(pathname)&&!query)||(pathname==='/api/social-auth'&&['','?action=providers'].includes(query))||(pathname==='/api/social-avatar'&&/^\?id=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(query))||(pathname==='/api/social'&&query==='?action=ranking&scope=global&period=all&mode=all&game_type=all&team=all');
   // Autorização own-profile precede getWire; sem callback ou sem identidade própria, mantém 403.
   const PROFILE_RE=/^\?action=profile&id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
   let profileOk=false;
   if(pathname==='/api/social'&&req.url==='/api/social'+query&&req.method==='GET'&&PROFILE_RE.test(query)) {
    const id=query.match(PROFILE_RE)[1];let own=null;
    if(typeof authorizeProfile==='function'){let timer;try{own=await Promise.race([Promise.resolve().then(()=>authorizeProfile({path:req.url,method:req.method,id,origin:url,originHeader:req.headers.origin||null,referer:req.headers.referer||null,fetchSite:req.headers['sec-fetch-site']||null})),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('autorização de perfil timeout')),profileAuthorizationTimeoutMs);})]);}catch(e){own=null;if(!closing)onError(e);}finally{clearTimeout(timer);}}
    if(own!==id){profileDenials.push({path:req.url});res.writeHead(403,{'cache-control':'no-store'});res.end('own guest profile required');return;}
    profileOk=true;
   }
   if(!publicApi&&!profileOk&&/^\/(?:api|auth|rest|functions|graphql|\.env|\.git)(?:\/|$)/i.test(pathname)){res.writeHead(403,{'cache-control':'no-store'});res.end('public GET only');return;}
   const rel=pathname.slice(1),local=modules.get(rel);
   if(pathname.startsWith('/js/')&&!local){res.writeHead(404,{'cache-control':'no-store'});res.end('módulo local ausente');return;}
   if(local) {
    record(res,{path:req.url,kind:'local-js',rel,status:200,payloadBytes:local.payloadBytes,decodedBytes:local.decodedBytes,sha256:local.sha256,encoding:'gzip'});
    res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','content-encoding':'gzip','content-length':String(local.payloadBytes),'cache-control':'no-store',vary:'Accept-Encoding','x-boot-origin':'local-js'});res.end(local.payload);return;
   }
   const dest=new URL(req.url,upstream.origin);if(dest.origin!==upstream.origin)throw Error('origin escapou');
   const upstreamResponse=await getWire(dest,{method:req.method,body:requestBody}),{status,body:wire}=upstreamResponse,headers=upstreamResponse.headers;
   if(status>=300&&status<400)throw Error('redirect upstream não aceito: '+status+' '+dest.pathname);
   const originalEncoding=String(headers['content-encoding']||''),decoded=decodeWire(wire,originalEncoding),type=String(headers['content-type']||'application/octet-stream');
   let payload=wire,encoding=originalEncoding;
   if(isText(type)&&decoded.length){payload=gzipSync(decoded,{level:9});encoding='gzip';}
   const outputHeaders={'content-type':type,'cache-control':'no-store','content-length':String(payload.length),'x-boot-origin':'upstream-public'};
   if(encoding)outputHeaders['content-encoding']=encoding;
   record(res,{path:req.url,method:req.method,requestBodyBytes:requestBody?.length||0,requestBodySha256:requestBody?sha(requestBody):null,kind:'upstream-public',status,payloadBytes:payload.length,decodedBytes:decoded.length,sha256:sha(decoded),encoding,upstreamEncoding:originalEncoding,upstreamWireBytes:wire.length});
   res.writeHead(status,outputHeaders);res.end(payload);
  }catch(e){if(!closing)onError(e);if(!res.headersSent)res.writeHead(502,{'cache-control':'no-store'});res.end('boot proxy failed');}
 });
 server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const url='http://127.0.0.1:'+server.address().port;
 return {url,snapshotFingerprint:snapshot.fingerprint,modules,requests,byId,profileDenials,lookup(requestUrl){const u=new URL(requestUrl);if(u.origin!==url)return undefined;try{return modules.get(decodeURIComponent(u.pathname).slice(1));}catch{return undefined;}},async close(){closing=true;for(const request of active)request.destroy();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}};
}
