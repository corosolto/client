import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import http from 'node:http';
import {instrumentPosterIntent,collectPosterProof,lazyPosterSubset,posterIdentity} from '../tools/eval/boot-poster-intent.mjs';
import {freezeWindow} from '../tools/eval/boot-network-window.mjs';
import {aceitaMutante} from '../tools/eval/boot-overlay.mjs';
import {awaitLocalModuleProof} from '../tools/eval/boot-local-proof.mjs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const textures=read('public/js/textures.js'),checker=read('tools/eval/boot-orcamento-check.mjs');
const begin=textures.indexOf('  const POSTER_FILES = ['),end=textures.indexOf('  T.posterAspects =',begin);
assert.ok(begin>=0&&end>begin,'real poster block missing');
const mutator=checker.slice(checker.indexOf('const ANSIOSO ='),checker.indexOf('// A chamada real é a âncora da mutação.'));
const eager=vm.runInNewContext(mutator+'poolAnsioso');
const origin='http://fixture',timeOrigin=100_000,cutoffEpoch=timeOrigin+1050;
function run({anxious=false,pick=[],base=origin,onStart=()=>{}}={}) {
  const requests=[],seen=new Set(),window={},T={};let now=100;
  class TextureLoader {load(file) {
    const url=new URL(file,base+'/').href;
    if(!seen.has(url)){seen.add(url);const row={requestId:'r'+requests.length,url,inicio:timeOrigin+now,fim:null,type:'Image',method:'GET'};requests.push(row);onStart(url,row);}
    return {};
  }}
  const source=instrumentPosterIntent(anxious?eager(textures):textures).slice(begin);
  const block=source.slice(0,source.indexOf('  T.posterAspects ='));
  vm.runInNewContext(block,{THREE:{TextureLoader},T,window,document:{baseURI:base+'/'},URL,performance:{timeOrigin,now:()=>now++}});
  const initial=window.__bootPosterIntent.calls.length;
  for(const index of pick)void T.posterImgs[index];
  return {trace:JSON.parse(JSON.stringify(window.__bootPosterIntent)),current:{timeOrigin,now:1100},requests,initial,T,origin:base};
}
const proof=sample=>collectPosterProof({...sample,origin:sample.origin||origin,timeOrigin,cutoffEpoch});
function verdict(cand,ref,legacy=false) {
  const a=checker.indexOf('const veredito='),b=checker.indexOf('const relatar=',a);
  assert.ok(a>=0&&b>a,'real verdict missing');let source=checker.slice(a,b);
  if(legacy){const anchor='lazyPosterSubset(cand.posterProof,ref.posterProof)';assert.equal(source.split(anchor).length,2);source=source.replace(anchor,'cand.cartazes<ref.cartazes');}
  return vm.runInNewContext(source+'veredito',{TETO_BYTES:8200000,TETO_REQS:340,lazyPosterSubset})(cand,ref);
}
function measure(sample,finished) {
  const requests=sample.requests.map((r,i)=>({...r,fim:i<finished?timeOrigin+900:timeOrigin+2000,bytes:500000}));
  const financial=freezeWindow(requests,timeOrigin+1000);
  return {causa:'assets',bytes:financial.length*500000,reqs:financial.length,cartazes:financial.length,ultimoProp:700,primeiraFauna:800,posterProof:proof({...sample,requests})};
}
const clone=value=>JSON.parse(JSON.stringify(value));
test('real lazy getters stay asleep through instrumentation and metadata reads',()=>{
  const cold=run();assert.equal(cold.initial,0);assert.equal(cold.trace.calls.length,0);assert.equal(cold.requests.length,0);
  const selected=run({pick:[0,4,21]});assert.equal(selected.trace.calls.length,3);assert.equal(lazyPosterSubset(proof(selected),proof(run({anxious:true}))),true);
});
test('both real eager pools reject ORC2 despite20vs21finished; old verdict mutation is caught',()=>{
  const left=run({anxious:true}),right=run({anxious:true});
  assert.deepEqual(proof(left).started,proof(right).started);
  assert.ok(left.trace.calls.length>proof(left).started.length,'tombstones remain duplicate invocations');
  const cand=measure(left,20),ref=measure(right,21),actual=verdict(cand,ref);
  assert.equal(cand.cartazes,20);assert.equal(ref.cartazes,21);assert.equal(actual.ORC2,false);assert.equal(actual.ORC1,false);
  assert.equal(verdict(cand,ref,true).ORC2,true,'actual legacy comparison reproduces false PASS');
  assert.equal(aceitaMutante('cartaz-ansioso',Object.entries(actual).filter(([,ok])=>!ok).map(([id])=>id)),true);
});
test('completion delay and pending responses cannot change lazy or eager proof or financial cutoff',()=>{
  const lazy=run({pick:[0,4,21]}),eagerPool=run({anxious:true});
  for(const [left,right] of [[0,0],[1,21],[3,0],[3,22]]) {
    assert.equal(verdict(measure(lazy,left),measure(eagerPool,right)).ORC2,true);
    assert.equal(verdict(measure(eagerPool,left),measure(eagerPool,right)).ORC2,false);
  }
  assert.equal(freezeWindow(lazy.requests,timeOrigin+1000).length,0);
  assert.deepEqual(proof(lazy).started,proof({...lazy,requests:lazy.requests.map(r=>({...r,fim:timeOrigin+999999}))}).started);
});
test('real HTTP responses held open reproduce20vs21 while eager identities remain equal',async t=>{
  async function round(finished) {
    const releases=[],responses=[];let sample,seen=0,allStarted;
    const started=new Promise(resolve=>{allStarted=resolve;});
    const server=http.createServer((req,res)=>{
      const index=sample.requests.findIndex(row=>new URL(row.url).pathname===new URL(req.url,sample.origin).pathname);
      assert.ok(index>=0);
      const finish=()=>{res.writeHead(200,{'content-type':'application/octet-stream'});res.end('poster:'+req.url);};
      if(index<finished)finish();else releases.push(finish);
      if(++seen===sample.requests.length)allStarted();
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    let released=false;
    try {
      sample=run({anxious:true,base:'http://127.0.0.1:'+server.address().port,onStart:(url,row)=>responses.push(fetch(url).then(async response=>{
        assert.equal(response.status,200);assert.equal(await response.text(),'poster:'+new URL(url).pathname);
        row.fim=timeOrigin+(released?2000:900);
      }))});
      await started;await Promise.all(responses.slice(0,finished));
      const financial=freezeWindow(sample.requests,timeOrigin+1000);
      const result={causa:'assets',bytes:financial.length*500000,reqs:financial.length,cartazes:financial.length,ultimoProp:700,primeiraFauna:800,posterProof:proof(sample)};
      assert.equal(sample.requests.filter(row=>row.fim===null).length,sample.requests.length-finished);
      return result;
    } finally {released=true;for(const release of releases)release();await Promise.all(responses);await new Promise(resolve=>server.close(resolve));}
  }
  const reference=await round(21),candidate=await round(20);
  assert.equal(reference.cartazes,21);assert.equal(candidate.cartazes,20);
  assert.equal(verdict(candidate,reference,true).ORC2,true);assert.equal(verdict(candidate,reference).ORC2,false);
  t.diagnostic('HTTP real: referências21/candidata20 completos; restantes mantidos pendentes no corte; mesmos22inícios eager.');
});
test('query identity is preserved and equal-sized different catalogues cannot substitute',()=>{
  assert.notEqual(posterIdentity(origin+'/posters/a.png?v=1',origin),posterIdentity(origin+'/posters/a.png?v=2',origin));
  const other=run({anxious:true}),old=other.trace.catalogue.at(-1),fresh=old+'?v=2';
  other.trace.catalogue=other.trace.catalogue.map(x=>x===old?fresh:x);other.trace.calls=other.trace.calls.map(x=>x.url===old?{...x,url:fresh}:x);other.requests=other.requests.map(x=>x.url===old?{...x,url:fresh}:x);
  assert.throws(()=>lazyPosterSubset(proof(other),proof(run({anxious:true}))),/catálogo divergiu/);
});
test('partial eager reference is INFRA and cannot give semantic credit',()=>{
  const partial=run({anxious:true}),key=partial.requests.at(-1).url;
  partial.requests=partial.requests.filter(r=>r.url!==key);partial.trace.calls=partial.trace.calls.filter(r=>r.url!==key);
  assert.throws(()=>lazyPosterSubset(proof(run({pick:[0]})),proof(partial)),/referência ansiosa incompleta/);
});
test('missing or stale trace, invalid clocks, missing starts and duplicateIDs fail closed',()=>{
  const valid=run({anxious:true});
  for(const mutate of [s=>delete s.trace,s=>s.trace.timeOrigin++,s=>s.current.timeOrigin++,s=>s.current.now=1,s=>s.trace.calls[0].time=NaN,s=>s.requests.pop(),s=>s.requests.push({...s.requests[0]}),s=>s.requests[0].inicio=NaN]) {
    const sample=clone(valid);mutate(sample);assert.throws(()=>proof(sample),error=>error.code===3);
  }
  const missingIntent=clone(valid);missingIntent.trace.calls=[];assert.throws(()=>proof(missingIntent),/intenção\/início CDP divergentes/);
  assert.throws(()=>instrumentPosterIntent('missing'),/âncora/);
});
test('financial tolerance and exact causal sets stay unchanged',()=>{
  const at=timeOrigin+1000,rows=[{inicio:timeOrigin,fim:at+50},{inicio:timeOrigin,fim:at+50.01},{inicio:timeOrigin,fim:null}];
  assert.equal(freezeWindow(rows,at).length,1);
  for(const ids of [['ORC2'],['ORC1','ORC2']])assert.equal(aceitaMutante('cartaz-ansioso',ids),true);
  for(const ids of [[],['ORC1'],['ORC2','ORC3'],['READY','ORC2']])assert.equal(aceitaMutante('cartaz-ansioso',ids),false);
});
test('local modules outside financial window drain body proofs and chained starts before close',async()=>{
  const a={url:'http://fixture/js/a.js'},b={url:'http://fixture/js/b.js'},c={url:'http://fixture/js/c.js'};
  const requested=new Set([a,b]),checked=new Set([a]),checks=new Map([[a,Promise.resolve()]]),events=[];let release;
  checks.set(b,new Promise(resolve=>{release=()=>{checked.add(b);requested.add(c);checks.set(c,Promise.resolve().then(()=>{checked.add(c);events.push('c-body');}));events.push('b-body');resolve();};}));
  setTimeout(release,2);
  const result=await awaitLocalModuleProof({requests:()=>requested,verification:r=>checks.get(r),verified:r=>checked.has(r),failure:r=>r.url,barrier:async()=>{},timeoutMs:1000});
  events.push('close');assert.deepEqual(result,{requests:3,verified:3});assert.deepEqual(events,['b-body','c-body','close']);
});
test('missing, rejected or mismatching local proof is INFRA; no body error is excused',async()=>{
  const request={url:'http://fixture/js/pending.js'},common={requests:()=>[request],verified:()=>false,failure:()=> 'decoded SHA mismatch',barrier:async()=>{},timeoutMs:5};
  await assert.rejects(awaitLocalModuleProof({...common,verification:()=>null}),error=>error.code===3&&/timeout/.test(error.message));
  await assert.rejects(awaitLocalModuleProof({...common,verification:()=>Promise.resolve()}),error=>error.code===3&&/decoded SHA mismatch/.test(error.message));
  await assert.rejects(awaitLocalModuleProof({...common,verification:()=>Promise.reject(Error('body truncated'))}),error=>error.code===3&&/body truncated/.test(error.message));
});
