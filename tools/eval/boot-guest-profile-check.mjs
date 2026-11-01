// Fixtures HTTP privadas exercitam o observador do boot-orcamento-check.mjs.
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {startBootOrigin} from './boot-network-origin.mjs';
import {createGuestProfileObserver} from './boot-guest-profile.mjs';
import {isExpectedGuestProfile404,classifyProfile404s} from '../ui-regression/expected-guest-profile.mjs';

const OWN='11111111-2222-4333-8444-555555555555',OTHER='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const PROFILE='/api/social?action=profile&id='+OWN;
const sha=body=>createHash('sha256').update(body).digest('hex');
const tick=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const entries=[{rel:'js/version.js',body:"export const VERSION = 'private-fixture';\n"}];
const snapshot={entries,fingerprint:sha(Buffer.from(JSON.stringify(entries)))};
const expectedEntry={sameOrigin:true,method:'GET',pathname:'/api/social',action:'profile',status:404,errorCode:'not_found',jsonValid:true,ownGuestId:true,explicitProfile:false};
const guestAuth={pending:0,observations:[{status:200,authenticated:false,profileAbsent:true,jsonValid:true}]};
let cases=0;
function frozenMatrix(){
  assert.equal(isExpectedGuestProfile404(expectedEntry,guestAuth),true);
  for(const [key,value] of [['sameOrigin',false],['method','POST'],['pathname','/missing'],['action','ranking'],['status',403],['errorCode','missing'],['jsonValid',false],['ownGuestId',false],['explicitProfile',true]])assert.equal(isExpectedGuestProfile404({...expectedEntry,[key]:value},guestAuth),false,key);
  for(const auth of [{pending:1,observations:guestAuth.observations},{pending:0,observations:[]},{pending:0,observations:[{...guestAuth.observations[0],status:404}]},{pending:0,observations:[{...guestAuth.observations[0],authenticated:true}]},{pending:0,observations:[{...guestAuth.observations[0],profileAbsent:false}]},{pending:0,observations:[{...guestAuth.observations[0],jsonValid:false}]},{pending:0,observations:[...guestAuth.observations,{authenticated:true}]}])assert.equal(isExpectedGuestProfile404(expectedEntry,auth),false);
  const classified=classifyProfile404s([{pathname:'/api/social',entry:expectedEntry},{pathname:'/api/social',entry:{...expectedEntry,jsonValid:false}}],['/api/social','/api/social'],guestAuth);
  assert.equal(classified.expected.length,1);assert.deepEqual(classified.assets404,['/api/social']);cases++;
}
async function harness(options={}){
  const upstreamRequests=[],infra=[],proxyErrors=[],clones=new Map();let authIndex=0,profileIndex=0,origin,observer,closed=false;
  const state={ownId:OWN,pageOrigin:null,href:null,timeOrigin:123456789,explicitProfile:false,...options.identity};
  const upstream=http.createServer((req,res)=>{
    upstreamRequests.push({path:req.url,cookie:req.headers.cookie,authorization:req.headers.authorization});
    let reply=req.url==='/api/social-auth?action=providers'?{body:{providers:[]}}:req.url==='/api/social-auth'?(options.authReplies?.[authIndex++]??{body:{authenticated:false}}):(options.profileReplies?.[profileIndex++]??{status:404,body:{error:'not_found'}});
    if(reply.hold)return;
    const body=Buffer.from(typeof reply.body==='string'?reply.body:JSON.stringify(reply.body));
    res.writeHead(reply.status??200,{'content-type':reply.type??'application/json','content-length':String(body.length+(reply.truncate?10:0))});
    if(reply.truncate){const socket=res.socket;res.end(body);setTimeout(()=>socket.destroy(),5);}else res.end(body);
  });
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  const identity=()=>{
    if(options.identityError)throw Error('identity fixture error');
    if(options.identityPending)return new Promise(()=>{});
    return {...state};
  };
  const authorize=options.authorize==='none'?null:options.authorize==='undefined'?()=>undefined:options.authorize==='throws'?()=>{throw Error('callback fixture error');}:options.authorize==='pending'?()=>new Promise(()=>{}):meta=>observer.authorizeProfile(meta);
  origin=await startBootOrigin({BASE:'http://127.0.0.1:'+upstream.address().port,snapshot,authorizeProfile:authorize,profileAuthorizationTimeoutMs:options.authorizationTimeoutMs??250,onError:error=>proxyErrors.push(error.message)});
  state.pageOrigin??=origin.url;state.href??=origin.url+'/?api='+encodeURIComponent(origin.url);
  observer=createGuestProfileObserver({origin:()=>origin.url,identity,onInfra:message=>infra.push(message),deadlineMs:options.deadlineMs??300,bodyTimeoutMs:options.bodyTimeoutMs??100,identityTimeoutMs:options.identityTimeoutMs??100});
  const h={origin,observer,state,infra,proxyErrors,upstreamRequests,clones,
    async request(path,{headers={},metadata,bodyReader,beforeWire,method='GET',resourceType='fetch'}={}){
      const key={},url=origin.url+path;
      observer.observeRequest({key,url,method,resourceType});
      if(beforeWire)await beforeWire(h);
      let response;
      try{response=await fetch(url,{method,headers,signal:AbortSignal.timeout(2000)});}catch(error){observer.observeFailure({key,error:error.message});throw error;}
      const id=response.headers.get('x-boot-response-id'),record=origin.byId.get(id),clone=response.clone();
      const clonePromise=clone.arrayBuffer().then(value=>({id,url,state:'checked',bytes:value.byteLength,sha256:sha(Buffer.from(value))}));clonePromise.catch(()=>{});if(id)clones.set(id,clonePromise);
      const bodyPromise=response.arrayBuffer().then(value=>Buffer.from(value));bodyPromise.catch(()=>{});
      const data={key,url,method,status:response.status,id,record,contentType:response.headers.get('content-type'),getBody:bodyReader?()=>bodyReader(bodyPromise):()=>bodyPromise};
      observer.observeResponse(metadata?metadata(data):data);
      return {status:response.status,id,record,body:await bodyPromise};
    },
    async seal({duringClones,duringClose,cloneRows}={}){
      let injected=false;
      return observer.seal({readFetchClones:async ids=>{
        if(duringClones&&!injected){injected=true;await duringClones(h);}
        const rows=await Promise.all(ids.map(id=>clones.get(id)));return cloneRows?cloneRows(rows):rows;
      },closeObservation:async()=>{if(duringClose)await duringClose(h);await origin.close();closed=true;}});
    },
    async close(){if(!closed)await origin.close();upstream.closeAllConnections();await new Promise(resolve=>upstream.close(resolve));},
  };return h;
}
async function scenario(name,options,run){
  const h=await harness(options);
  try{await run(h);cases++;}catch(error){throw Error(name+': '+error.message,{cause:error});}finally{await h.close();}
}
async function expected404(h){await h.request('/api/social-auth');await h.request(PROFILE);}
async function denied(h,path=PROFILE,requestOptions){const before=h.upstreamRequests.length;const response=await h.request(path,requestOptions);assert.ok([400,403,405].includes(response.status));assert.equal(h.upstreamRequests.length,before,'denied target reached upstream');assert.equal(response.id,null);}

frozenMatrix();
await scenario('own absent real404 + auth + clone + record',{},async h=>{
  await expected404(h);const result=await h.seal();assert.equal(result.ok,true);assert.equal(result.expected404s,1);assert.equal(result.fetchClones,2);
  for(const row of h.origin.requests){assert.equal(row.registeredBeforeWrite,true);assert.ok(row.payloadBytes>0);assert.ok(row.decodedBytes>0);assert.match(row.sha256,/^[a-f0-9]{64}$/);}
});
await scenario('server callback before real Request event waits boundedly',{},async h=>{
  await h.request('/api/social-auth');const key={},url=h.origin.url+PROFILE;
  const pending=fetch(url);await tick(10);h.observer.observeRequest({key,url,method:'GET',resourceType:'xhr'});
  const response=await pending,id=response.headers.get('x-boot-response-id');
  h.observer.observeResponse({key,url,status:response.status,id,record:h.origin.byId.get(id),contentType:response.headers.get('content-type'),getBody:async()=>Buffer.from(await response.arrayBuffer())});
  assert.equal(response.status,404);assert.equal((await h.seal()).ok,true);assert.equal(h.upstreamRequests.filter(row=>row.path===PROFILE).length,1);
});
await scenario('server callback without real Request event denies',{identityTimeoutMs:20},async h=>{
  const response=await fetch(h.origin.url+PROFILE);assert.equal(response.status,403);assert.equal(h.upstreamRequests.length,0);assert.equal((await h.seal()).ok,false);
});
await scenario('ambiguous simultaneous real Request associations deny',{},async h=>{
  for(let i=0;i<2;i++)h.observer.observeRequest({key:{},url:h.origin.url+PROFILE,method:'GET'});
  const response=await fetch(h.origin.url+PROFILE);assert.equal(response.status,403);assert.equal(h.upstreamRequests.length,0);assert.equal((await h.seal()).ok,false);
});
await scenario('registered guest real200 is ordinary verified payload',{profileReplies:[{status:200,body:{profile:{id:OWN,nick:'fixture'}}}],authReplies:[{body:{authenticated:false}}]},async h=>{
  await expected404(h);const result=await h.seal();assert.equal(result.ok,true);assert.equal(result.expected404s,0);assert.equal(result.guest200s,1);
});
await scenario('large registered200 keeps ordinary proof',{profileReplies:[{status:200,body:{profile:{id:OWN,bio:'x'.repeat(17*1024)}}}]},async h=>{await expected404(h);assert.equal((await h.seal()).ok,true);});
await scenario('local JS transport still serves registered gzip snapshot',{},async h=>{const result=await h.request('/js/version.js');assert.equal(result.status,200);assert.equal(result.body.toString(),entries[0].body);assert.equal(result.record.kind,'local-js');assert.equal((await h.seal()).ok,true);});
await scenario('credentials stripped before real upstream',{},async h=>{
  await h.request('/api/social-auth');await h.request(PROFILE,{headers:{cookie:'fixture=private',authorization:'Bearer fixture-only'}});
  assert.ok(h.upstreamRequests.every(row=>row.cookie===undefined&&row.authorization===undefined));assert.equal((await h.seal()).ok,true);
});
for(const authorize of ['none','undefined','throws','pending'])await scenario('default/callback refusal '+authorize,{authorize,authorizationTimeoutMs:20},async h=>{await denied(h);});
for(const suffix of ['&extra=1','&id='+OWN,'&action=profile'])await scenario('extra/duplicate raw query '+suffix,{},async h=>{await denied(h,PROFILE+suffix);assert.equal((await h.seal()).ok,false);});
for(const path of ['/api/social?%61ction=profile&id='+OWN,'/api/social?action=profile&id=%31'+OWN.slice(1),'/api/%73ocial?action=profile&id='+OWN,'/api/social?id='+OWN+'&action=profile'])await scenario('encoded/reordered query '+path,{},async h=>{await denied(h,path);});
await scenario('other UUID never forwarded',{},async h=>{await denied(h,'/api/social?action=profile&id='+OTHER);assert.equal((await h.seal()).ok,false);});
await scenario('explicit selected profile denied',{identity:{explicitProfile:true}},async h=>{await denied(h);assert.equal((await h.seal()).ok,false);});
await scenario('other document origin denied',{identity:{pageOrigin:'https://other.invalid',href:'https://other.invalid/'}},async h=>{await denied(h);assert.equal((await h.seal()).ok,false);});
for(const header of [{origin:'https://other.invalid'},{referer:'https://other.invalid/'},{'sec-fetch-site':'cross-site'}])await scenario('cross-origin request headers '+JSON.stringify(header),{},async h=>{await denied(h,PROFILE,{headers:header});});
for(const option of ['identityError','identityPending'])await scenario('RO identity failure '+option,{[option]:true,identityTimeoutMs:20},async h=>{await denied(h);assert.equal((await h.seal()).ok,false);});
for(const property of ['ownId','href','timeOrigin'])await scenario('identity/document mutation '+property,{},async h=>{
  await h.request('/api/social-auth');await denied(h,PROFILE,{beforeWire:async()=>{await tick(2);h.state[property]=property==='ownId'?OTHER:property==='href'?h.origin.url+'/changed':987654321;}});assert.equal((await h.seal()).ok,false);
});
await scenario('providers is not a session observation',{},async h=>{assert.equal((await h.request('/api/social-auth?action=providers')).status,200);await h.request(PROFILE);assert.equal((await h.seal()).ok,false);});
await scenario('profile404 without auth is rejected',{},async h=>{await h.request(PROFILE);assert.equal((await h.seal()).ok,false);});
for(const body of ['not json','null','[]','{"authenticated":"false"}','{"authenticated":true}','{"authenticated":false,"profile":{}}'])await scenario('unknown/mixed auth '+body,{authReplies:[{body}]},async h=>{await expected404(h);assert.equal((await h.seal()).ok,false);});
await scenario('mixed auth observations',{authReplies:[{body:{authenticated:false}},{body:{authenticated:true}}]},async h=>{await h.request('/api/social-auth');await h.request('/api/social-auth');await h.request(PROFILE);assert.equal((await h.seal()).ok,false);});
for(const body of ['not json','null','[]','"not_found"','{"error":1}','{"error":"wrong"}','{"error":"not_found","path":"/api/social"}','{"error":"not_found","extra":true}'])await scenario('malformed/fallback profile '+body,{profileReplies:[{status:404,body}]},async h=>{await expected404(h);assert.equal((await h.seal()).ok,false);});
await scenario('oversized valid404 JSON',{profileReplies:[{status:404,body:JSON.stringify({error:'not_found'})+' '.repeat(17*1024)}]},async h=>{await expected404(h);assert.equal((await h.seal()).ok,false);});
await scenario('oversized valid anonymous JSON',{authReplies:[{body:JSON.stringify({authenticated:false})+' '.repeat(17*1024)}]},async h=>{await expected404(h);assert.equal((await h.seal()).ok,false);});
await scenario('anonymous auth before local UUID initialization is valid same-document proof',{identity:{ownId:null}},async h=>{await h.request('/api/social-auth');h.state.ownId=OWN;await h.request(PROFILE);assert.equal((await h.seal()).ok,true);});
await scenario('same-document map/character query update preserves guest identity',{},async h=>{await h.request('/api/social-auth');h.state.href+='&map=praca_poderes&personagem=esquerdomacho';await h.request(PROFILE);assert.equal((await h.seal()).ok,true);});
await scenario('non-JSON404',{profileReplies:[{status:404,body:{error:'not_found'},type:'text/plain'}]},async h=>{await expected404(h);assert.equal((await h.seal()).ok,false);});
for(const status of [400,403,500])await scenario('unexpected HTTP remains immediate '+status,{profileReplies:[{status,body:{error:'not_found'}}]},async h=>{await expected404(h);assert.ok(h.infra.some(message=>message.includes('HTTP '+status)));assert.equal((await h.seal()).ok,false);});
await scenario('good404 then bad404 same path',{profileReplies:[{status:404,body:{error:'not_found'}},{status:404,body:{error:'not_found',path:'/api/social'}}]},async h=>{await expected404(h);await h.request(PROFILE);assert.equal((await h.seal()).ok,false);});
await scenario('missing real server ID',{},async h=>{await h.request('/api/social-auth');await h.request(PROFILE,{metadata:data=>({...data,id:undefined})});assert.equal((await h.seal()).ok,false);});
await scenario('wrong decoded SHA',{},async h=>{await h.request('/api/social-auth');await h.request(PROFILE,{metadata:data=>({...data,record:{...data.record,sha256:'0'.repeat(64)}})});assert.equal((await h.seal()).ok,false);});
await scenario('nonfetch body SHA cannot rely on clone proof',{},async h=>{await h.request('/api/social-auth');await h.request(PROFILE,{resourceType:'xhr',metadata:data=>({...data,record:{...data.record,sha256:'0'.repeat(64)}})});assert.equal((await h.seal()).ok,false);});
await scenario('auth body SHA is mandatory',{},async h=>{await h.request('/api/social-auth',{metadata:data=>({...data,record:{...data.record,sha256:'0'.repeat(64)}})});await h.request(PROFILE);assert.equal((await h.seal()).ok,false);});
await scenario('different delivered body',{},async h=>{await h.request('/api/social-auth');await h.request(PROFILE,{bodyReader:async()=>Buffer.from('{"error":"different"}')});assert.equal((await h.seal()).ok,false);});
await scenario('bounded body timeout',{bodyTimeoutMs:20},async h=>{await h.request('/api/social-auth');await h.request(PROFILE,{bodyReader:()=>new Promise(()=>{})});assert.equal((await h.seal()).ok,false);});
await scenario('truncated upstream body',{profileReplies:[{status:404,body:{error:'not_found'},truncate:true}]},async h=>{await expected404(h);assert.ok(h.proxyErrors.length);assert.equal((await h.seal()).ok,false);});
await scenario('auth pending until terminal',{authReplies:[{hold:true}],deadlineMs:50},async h=>{
  const pending=h.request('/api/social-auth');pending.catch(()=>{});await tick(5);await h.request(PROFILE);assert.equal((await h.seal()).ok,false);
});
await scenario('candidate enters during body/clone barrier',{},async h=>{
  await h.request('/api/social-auth');const result=await h.seal({duringClones:async()=>h.request(PROFILE)});assert.equal(result.ok,true);assert.equal(result.expected404s,1);assert.equal(result.fetchClones,2);
});
await scenario('late mixed auth during barrier',{authReplies:[{body:{authenticated:false}},{body:{authenticated:true}}]},async h=>{await expected404(h);assert.equal((await h.seal({duringClones:async()=>h.request('/api/social-auth')})).ok,false);});
await scenario('any semantic activity while close awaits',{},async h=>{await expected404(h);assert.equal((await h.seal({duringClose:async()=>h.request('/api/social-auth')})).ok,false);});
await scenario('late event after seal is refused',{},async h=>{await expected404(h);assert.equal((await h.seal()).ok,true);assert.equal(h.observer.observeRequest({key:{},url:h.origin.url+'/api/social-auth',method:'GET'}),false);assert.ok(h.infra.some(message=>message.includes('após seal')));});
await scenario('response event after seal is refused',{},async h=>{await expected404(h);assert.equal((await h.seal()).ok,true);assert.equal(h.observer.observeResponse({key:{},url:h.origin.url+PROFILE,method:'GET',status:404}),false);assert.ok(h.infra.some(message=>message.includes('após seal')));});
await scenario('fetch clone mismatch is never body-only acceptance',{},async h=>{await expected404(h);assert.equal((await h.seal({cloneRows:rows=>rows.map(row=>({...row,sha256:'0'.repeat(64)}))})).ok,false);});
await scenario('fetch clone missing is rejected',{},async h=>{await expected404(h);assert.equal((await h.seal({cloneRows:()=>[]})).ok,false);});
console.log('✓ boot guest profile contract: '+cases+' frozen/HTTP/event scenarios');
