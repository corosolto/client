import { InfraError } from './boot-overlay.mjs';

const must=(ok,message)=>{if(!ok)throw new InfraError('prova de cartazes: '+message);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sorted=values=>[...new Set(values)].sort();

export function instrumentPosterIntent(source) {
  const anchor='  const _tl = new THREE.TextureLoader();\n  const _cartaz = (f) => {\n';
  must(source.split(anchor).length===2,'âncora _cartaz ausente/duplicada');
  return source.replace(anchor,`  if(window.__bootPosterIntent!==undefined)throw Error('prova de cartazes duplicada');
  const _posterProof=window.__bootPosterIntent={schema:'boot-poster-intent/1',timeOrigin:performance.timeOrigin,catalogue:POSTER_FILES.map(([f])=>new URL('posters/'+f,document.baseURI).href),calls:[]};
${anchor}    _posterProof.calls.push({url:new URL('posters/'+f,document.baseURI).href,time:performance.now()});
`);
}

export function posterIdentity(value,origin) {
  let url,base;
  try {url=new URL(value);base=new URL(origin);}catch {throw new InfraError('prova de cartazes: URL inválida');}
  must(url.origin===base.origin&&/^https?:$/.test(url.protocol)&&url.pathname.startsWith('/posters/')&&url.pathname.length>9,'URL fora da origem/catálogo de cartazes');
  return url.pathname+url.search;
}

export function collectPosterProof({trace,current,requests,origin,timeOrigin,cutoffEpoch}) {
  must(Number.isFinite(timeOrigin)&&timeOrigin>0&&Number.isFinite(cutoffEpoch)&&cutoffEpoch>=timeOrigin,'clock do corte inválido');
  const cutoff=cutoffEpoch-timeOrigin;
  must(current?.timeOrigin===timeOrigin&&Number.isFinite(current.now)&&current.now>=cutoff,'documento stale ou captura anterior ao corte');
  must(trace?.schema==='boot-poster-intent/1'&&trace.timeOrigin===timeOrigin&&Array.isArray(trace.catalogue)&&trace.catalogue.length>0&&Array.isArray(trace.calls),'trace ausente/schema/documento inválido');
  const catalogue=trace.catalogue.map(url=>posterIdentity(url,origin)),inventory=new Set(catalogue),intended=[];
  for(const call of trace.calls) {
    must(call&&Number.isFinite(call.time)&&call.time>=0&&call.time<=current.now,'clock de intenção inválido');
    const key=posterIdentity(call.url,origin);
    must(inventory.has(key),'intenção fora do catálogo: '+key);
    if(call.time<=cutoff)intended.push(key);
  }
  must(Array.isArray(requests),'inícios CDP ausentes');
  const started=[],ids=new Set();
  for(const request of requests) {
    let url;try {url=new URL(request.url);}catch {throw new InfraError('prova de cartazes: URL CDP inválida');}
    if(url.origin!==new URL(origin).origin||!url.pathname.startsWith('/posters/'))continue;
    must(typeof request.requestId==='string'&&request.requestId.length>0&&!ids.has(request.requestId),'requestId ausente/duplicado');ids.add(request.requestId);
    must(Number.isFinite(request.inicio)&&request.inicio>=timeOrigin,'clock de início inválido');
    const key=posterIdentity(request.url,origin);
    if(!inventory.has(key))continue;
    if(request.inicio<=cutoffEpoch)started.push(key);
  }
  const intendedSet=sorted(intended),startedSet=sorted(started);
  must(same(intendedSet,startedSet),'intenção/início CDP divergentes');
  return Object.freeze({schema:'boot-poster-proof/1',catalogue,expected:sorted(catalogue),intended:intendedSet,started:startedSet,invocations:intended.length,requestIds:[...ids],cutoffEpoch});
}

export function lazyPosterSubset(candidate,reference) {
  must(candidate?.schema==='boot-poster-proof/1'&&reference?.schema==='boot-poster-proof/1','prova coletada ausente');
  must(same(candidate.catalogue,reference.catalogue),'catálogo divergiu entre passadas');
  must(same(reference.started,reference.expected)&&same(reference.intended,reference.expected),'referência ansiosa incompleta');
  const full=new Set(reference.started);
  return candidate.started.length<full.size&&candidate.started.every(key=>full.has(key));
}
