import {verifyResponseRecord,verifyDecoded} from './boot-network-body.mjs';
import {parseGuestAuthJson,parseProfileErrorJson,classifyProfile404s} from '../ui-regression/expected-guest-profile.mjs';

export const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const PROFILE_QUERY_RE=/^\?action=profile&id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const JSON_LIMIT=16*1024;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function bounded(promise,ms,label) {
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timeout')),ms);})]);}
  finally{clearTimeout(timer);}
}

export async function readGuestPageIdentity(page) {
  if(!page||page.isClosed())throw Error('página ausente/fechada para identidade');
  return page.evaluate(()=>({
    ownId:localStorage.getItem('cs_anon'),pageOrigin:location.origin,href:location.href,timeOrigin:performance.timeOrigin,
    explicitProfile:Boolean(/^\/u\//i.test(location.pathname)||new URLSearchParams(location.search).get('perfil')||document.getElementById('community')?.dataset.profile),
  }));
}

// Cada chave é o Request real do Playwright; associação ambígua de perfil é recusada.
export function createGuestProfileObserver({origin,identity,onInfra=()=>{},deadlineMs=30000,bodyTimeoutMs=5000,identityTimeoutMs=5000}) {
  if(typeof origin!=='function'||typeof identity!=='function')throw Error('origin/identity RO obrigatórios');
  for(const value of [deadlineMs,bodyTimeoutMs,identityTimeoutMs])if(!Number.isFinite(value)||value<=0)throw Error('deadline de contrato inválido');
  let phase='open',revision=0,documentIdentity=null,boundOwnId=null;
  const slots=new Map(),tasks=new Set(),failures=[],seen=new Set();
  const fail=message=>{failures.push(message);onInfra(message);return false;};
  const track=promise=>{tasks.add(promise);promise.then(()=>tasks.delete(promise),()=>tasks.delete(promise));return promise;};
  const snapshot=label=>track(bounded(Promise.resolve().then(identity),identityTimeoutMs,'identidade '+label).then(value=>{
    if(!value||value.pageOrigin!==origin()||typeof value.href!=='string'||new URL(value.href).origin!==origin()||!Number.isFinite(value.timeOrigin)||value.timeOrigin<=0||value.explicitProfile!==false)throw Error('documento/origin/perfil explícito inválido: '+label);
    const doc={pageOrigin:value.pageOrigin,pathname:new URL(value.href).pathname,timeOrigin:value.timeOrigin};
    if(documentIdentity&&Object.keys(doc).some(key=>doc[key]!==documentIdentity[key]))throw Error('documento/navegação mudou: '+label);
    documentIdentity??=doc;
    if(value.ownId!==null&&!UUID_RE.test(value.ownId||''))throw Error('cs_anon não canônico: '+label);
    if(boundOwnId&&value.ownId!==boundOwnId)throw Error('cs_anon mudou/desapareceu: '+label);
    if(value.ownId)boundOwnId=value.ownId;
    return value;
  }).catch(error=>{fail(error.message);throw error;}));
  const kindOf=(url,method)=>{
    const u=new URL(url),profile=u.pathname==='/api/social'&&u.searchParams.get('action')==='profile';
    const auth=u.pathname==='/api/social-auth'&&!u.search;
    if(!profile&&!auth)return null;
    if(u.origin!==origin()||method!=='GET')throw Error('origin/método fora do contrato: '+url);
    if(profile&&(!PROFILE_QUERY_RE.test(u.search)||url!==origin()+'/api/social'+u.search))throw Error('gramática crua de perfil inválida: '+url);
    return {kind:auth?'auth':'profile',ownId:profile?u.search.match(PROFILE_QUERY_RE)[1]:null};
  };
  const finishFailure=(slot,message)=>{slot.done=true;slot.error=message;fail(message);};
  const observer={
    observeRequest({key,url,method='GET',resourceType='other'}) {
      if(phase==='closed')return fail('request após seal: '+url);
      let kind;try{kind=kindOf(url,method);}catch(error){return fail(error.message);}
      if(!kind)return false;
      if(!key||slots.has(key))return fail('request sem chave única: '+url);
      const slot={key,url,method,resourceType,...kind,done:false,authorized:false};slots.set(key,slot);revision++;
      slot.requestIdentity=snapshot('request '+kind.kind).then(value=>{slot.requestSnapshot=value;return value;});slot.requestIdentity.catch(()=>{});
      return true;
    },
    authorizeProfile({path,method,id,origin:requestOrigin,originHeader,referer,fetchSite}) {
      revision++;
      return track((async()=>{
      if(phase==='closed'||phase==='closing')return fail('autorização durante/após fechamento')||null;
      if(method!=='GET'||requestOrigin!==origin()||path!=='/api/social?action=profile&id='+id||!UUID_RE.test(id||''))return null;
      if((originHeader&&originHeader!==origin())||(fetchSite&&fetchSite!=='same-origin'))return null;
      if(referer){try{if(new URL(referer).origin!==origin())return null;}catch{return null;}}
      const pendingMatches=()=>[...slots.values()].filter(slot=>slot.kind==='profile'&&!slot.authorizationStarted&&slot.url===origin()+path);
      const associationDeadline=Date.now()+identityTimeoutMs;let matches=pendingMatches();
      while(!matches.length&&Date.now()<associationDeadline){
        await wait(1);
        if(phase==='closed'||phase==='closing')return fail('autorização durante/após fechamento')||null;
        matches=pendingMatches();
      }
      if(matches.length!==1){fail('perfil sem associação única antes do upstream');return null;}
      const slot=matches[0];slot.authorizationStarted=true;
      try{
        const [atRequest,atForward]=await Promise.all([slot.requestIdentity,snapshot('antes do upstream')]);
        if(atRequest.ownId!==id||atForward.ownId!==id)throw Error('perfil não é cs_anon próprio antes do upstream');
        slot.forwardSnapshot=atForward;slot.authorized=true;return id;
      }catch(error){fail(error.message);return null;}
      })());
    },
    observeResponse({key,url,method='GET',status,id,record,contentType,getBody}) {
      if(phase==='closed')return fail('response após seal: '+url);
      let kind;try{kind=kindOf(url,method);}catch(error){return fail(error.message);}
      if(!kind)return false;
      const slot=slots.get(key);
      if(!slot||slot.url!==url||slot.responded)return fail('response sem request único: '+url);
      slot.responded=true;slot.status=status;revision++;
      if(slot.kind==='profile'&&!slot.authorized){finishFailure(slot,'perfil não autorizado antes do upstream');return false;}
      if((slot.kind==='auth'&&status!==200)||(slot.kind==='profile'&&![200,404].includes(status))){finishFailure(slot,'HTTP '+status+' '+url);return false;}
      try{slot.record=verifyResponseRecord({url,id,status,record,seen});}
      catch(error){finishFailure(slot,error.message);return false;}
      slot.id=id;
      const current=snapshot('response '+slot.kind);current.catch(()=>{});
      const proof=track(bounded(Promise.resolve().then(()=>{
        if(typeof getBody!=='function')throw Error('leitura do corpo ausente');return getBody();
      }),bodyTimeoutMs,'corpo de contrato').then(body=>{
        slot.proof=verifyDecoded(body,record);
        if((slot.kind==='auth'||status===404)&&(!/^application\/json(?:\s*;|$)/i.test(contentType||'')||body.length>JSON_LIMIT))throw Error('JSON de contrato inválido/acima de 16KiB');
        slot.parsed=slot.kind==='auth'?parseGuestAuthJson(body.toString('utf8')):status===404?parseProfileErrorJson(body.toString('utf8')):null;
        return current;
      }).then(()=>{slot.done=true;},error=>finishFailure(slot,error.message)));
      slot.bodyPromise=proof;
      // Só este 404 próprio autorizado aguarda; os demais erros HTTP são imediatos.
      return slot.kind==='profile'&&status===404;
    },
    observeFailure({key,error}) {
      const slot=slots.get(key);if(!slot)return false;
      revision++;finishFailure(slot,'request do contrato falhou: '+error);return true;
    },
    async seal({readFetchClones,closeObservation}={}) {
      if(phase!=='open')return {ok:false,reason:'seal duplicado',failures:[...failures]};
      phase='draining';const deadline=Date.now()+deadlineMs;
      const remaining=()=>Math.max(1,deadline-Date.now());
      let clones=[];let closeAttempted=false;
      try{
        if(typeof closeObservation!=='function')throw Error('fechamento terminal obrigatório');
        while(true){
          if(Date.now()>=deadline)throw Error('barreira semântica timeout/pendente');
          if(tasks.size)await bounded(Promise.allSettled([...tasks]),remaining(),'barreira semântica');
          if([...slots.values()].some(slot=>!slot.done)){await wait(Math.min(5,remaining()));continue;}
          const observedRevision=revision;
          await bounded(snapshot('terminal'),remaining(),'identidade terminal');
          const expected=[...slots.values()].filter(slot=>slot.resourceType==='fetch'&&slot.id).map(slot=>slot.id);
          if(expected.length){
            if(typeof readFetchClones!=='function')throw Error('prova clone fetch sem leitor');
            clones=await bounded(Promise.resolve().then(()=>readFetchClones(expected,remaining())),remaining(),'clone fetch semântico');
            if(!Array.isArray(clones)||new Set(clones.map(row=>row.id)).size!==clones.length)throw Error('clone fetch semântico duplicado/inválido');
            for(const id of expected){const row=clones.find(row=>row.id===id),record=[...slots.values()].find(slot=>slot.id===id)?.record;
              if(!row||row.state!=='checked'||row.sha256!==record?.sha256||row.bytes!==record?.decodedBytes)throw Error('clone fetch semântico ausente/divergente: '+id);
            }
          }
          if(observedRevision===revision&&tasks.size===0&&[...slots.values()].every(slot=>slot.done))break;
        }
        const closingRevision=revision;phase='closing';closeAttempted=true;
        await bounded(Promise.resolve().then(closeObservation),remaining(),'fechamento da observação');
        if(revision!==closingRevision)throw Error('atividade do contrato durante fechamento terminal');
        if(tasks.size)await bounded(Promise.allSettled([...tasks]),remaining(),'pendências terminais');
        if([...slots.values()].some(slot=>!slot.done))throw Error('request pendente no fechamento terminal');
      }catch(error){fail(error.message);}
      finally{
        if(!closeAttempted&&typeof closeObservation==='function'){
          phase='closing';try{await bounded(Promise.resolve().then(closeObservation),Math.min(bodyTimeoutMs,remaining()),'fechamento após falha');}catch(error){fail(error.message);}
        }
        phase='closed';
      }
      const all=[...slots.values()],auth=all.filter(slot=>slot.kind==='auth'),profiles=all.filter(slot=>slot.kind==='profile');
      const candidates=profiles.filter(slot=>slot.status===404),records=[],assets404=[];
      for(const slot of candidates){
        let snap;try{snap=await slot.requestIdentity;}catch{}
        records.push({pathname:'/api/social',entry:{sameOrigin:new URL(slot.url).origin===origin(),method:slot.method,pathname:'/api/social',action:'profile',status:404,errorCode:slot.parsed?.errorCode,jsonValid:slot.parsed?.jsonValid===true,ownGuestId:slot.authorized&&snap?.ownId===slot.ownId,explicitProfile:snap?.explicitProfile}});
        assets404.push('/api/social');
      }
      const observations=[];
      for(const slot of auth){
        let snap;try{snap=await slot.requestIdentity;}catch{}
        observations.push({status:slot.status,authenticated:slot.parsed?.authenticated,profileAbsent:slot.parsed?.profileAbsent,jsonValid:slot.parsed?.jsonValid===true});
      }
      const authState={pending:all.filter(slot=>!slot.done).length,observations};
      const classified=classifyProfile404s(records,assets404,authState);
      if(classified.assets404.length)fail('404 de perfil não explicado: '+classified.assets404.length);
      if(failures.length)return {ok:false,reason:failures[0],failures:[...failures]};
      return {ok:true,expected404s:classified.expected.length,guest200s:profiles.filter(slot=>slot.status===200).length,authObservations:auth.length,fetchClones:clones.length,terminal:'context-closed'};
    },
    summary:()=>({phase,requests:slots.size,pending:[...slots.values()].filter(slot=>!slot.done).length,failures:[...failures],observations:[...slots.values()].map(slot=>({url:slot.url,kind:slot.kind,status:slot.status,id:slot.id,authorized:slot.authorized,done:slot.done,error:slot.error,proof:slot.proof,requestIdentity:slot.requestSnapshot,forwardIdentity:slot.forwardSnapshot}))}),
  };
  return observer;
}
