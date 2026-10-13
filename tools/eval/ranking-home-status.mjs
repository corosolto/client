// Regression ruler: SSR ranking copy must agree with the result of the real client renderer.
// Uses source-derived HTML, a real DOM parser, real ranking helper, main.api and community.api/render.
// API fixtures are controlled test inputs, never evidence of production scores or a human match.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {parseHTML} from 'linkedom';
const args=process.argv.slice(2);
const root=args.find(a=>a.startsWith('--root='))?.slice(7) || args.find(a=>!a.startsWith('--')) || fileURLToPath(new URL('../../',import.meta.url)).replace(/\/$/,'');
assert(args.every(a=>!a.startsWith('--') || a.startsWith('--root=') || a.startsWith('--out=') || a.startsWith('--mutant=') || a==='--mutants'),'unknown option: use --root, --out, --mutant or --mutants');
const output=process.argv.find(x=>x.startsWith('--out='))?.slice(6);
const mutant=process.argv.find(x=>x.startsWith('--mutant='))?.slice(9);
assert(!mutant || ['frozen-ssr','disabled-as-network','empty-as-disabled','success-with-error','no-photo','no-profile','no-week-tab','nonarray-guard'].includes(mutant),'unknown mutation');
let mutationsApplied=0;
if(args.includes('--mutants')) {
 assert(!mutant,'--mutants and --mutant cannot be combined');
 const folder=mkdtempSync(join(tmpdir(),'ranking-home-status-'));
 const names=['frozen-ssr','disabled-as-network','empty-as-disabled','success-with-error','no-photo','no-profile','no-week-tab','nonarray-guard'];
 try {
  const run=(name)=>{const reportPath=join(folder,(name || 'baseline')+'.json');const child=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--root='+root,'--out='+reportPath,...(name?['--mutant='+name]:[])],{encoding:'utf8',maxBuffer:262144});assert(existsSync(reportPath),'cannot measure child '+(name || 'baseline')+': '+(child.stderr || child.error || child.stdout || '').slice(0,700));return {status:child.status,report:JSON.parse(readFileSync(reportPath,'utf8'))};};
  const baseline=run(null);assert.equal(baseline.status,0,'baseline must be green before mutation proof');
  const results=names.map(name=>{const child=run(name);return {name,killed:child.status===1 && child.report.mutationsApplied>0 && child.report.failed>0,applied:child.report.mutationsApplied,failed:child.report.failed};});
  const summary={root,nodeVersion:process.version,productionEvidence:false,baseline:baseline.report,mutants:results};
  if(output)writeFileSync(output,JSON.stringify(summary,null,2)+'\n');
  console.log((results.every(r=>r.killed)?'GREEN':'RED')+' baseline '+baseline.report.passed+'/'+baseline.report.total+'; mutants rejected '+results.filter(r=>r.killed).length+'/'+names.length);
  assert(results.every(r=>r.killed),'at least one mutation did not apply or survived');
 } finally {rmSync(folder,{recursive:true,force:true});}
 process.exit(0);
}
const source=path=>readFileSync(`${root}/${path}`,'utf8');
let main=source('public/js/main.js'),community=source('public/js/community.js');
const astro=source('src/pages/index.astro');
const hashes=Object.fromEntries(['src/pages/index.astro','public/js/main.js','public/js/community.js','public/js/ranking-player.js'].map(p=>[p,createHash('sha256').update(source(p)).digest('hex')]));
if(mutant==='nonarray-guard'){const changed=main.replaceAll('!Array.isArray(data?.players)','!data?.players');assert.notEqual(changed,main,'MUTATION DID NOT APPLY');main=changed;mutationsApplied++;}
const helpers=await import(pathToFileURL(`${root}/public/js/ranking-player.js`).href);
const player={id:'c026ab03-2aa8-4775-979c-fcb1414fa50b',nick:'Renderer Fixture',public_handle:'ruler_fixture',avatar_url:'/api/social-avatar?id=c026ab03-2aa8-4775-979c-fcb1414fa50b',position:1,points:25,career_points:25,kills:18,kd:9,left_points:3,right_points:10,socials:[{net:'x',url:'https://x.com/ruler_fixture'}]};
function extract(text,name,end) {
 const start=text.indexOf(name);assert(start>=0,`cannot measure: source function missing ${name}`);
 const stop=end?text.indexOf(end,start):text.indexOf('\n}',start)+2;
 assert(stop>start,`cannot measure: source function end missing ${name}`);return text.slice(start,stop);
}
function ssrFragment(flag,surface) {
 const start=astro.indexOf(surface==='hub'?'<section id="hub-ranking"':'<div id="ranking-panel"');assert(start>=0,'ranking SSR source not found');
 const stop=surface==='hub'?astro.indexOf('</section>',start)+10:astro.indexOf('<!-- Feedback',start);
 assert(stop>start,'ranking SSR source boundary not found');
 let html=astro.slice(start,stop).replace(/\{RANKING_ON\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\}/g,(_,yes,no)=>flag?yes:no);
 assert(!html.includes('{RANKING_ON'),'cannot measure: unsupported SSR expression');
 return html;
}
const unavailable=/indisponível|fora do ar|não (?:foi possível|respondeu)|não deu certo/i;
const disabled=/desligad[oa]|desativad[oa]/i;
const loading=/carregando|só um instante/i;
const emptyCopy=/ainda (?:não há|vazio)|nenhum jogador/i;
const failures=[],results=[];
function check(condition,message){if(!condition)throw new Error(message);}
function fetchResult(kind) {
 if(kind==='network')return Promise.reject(new Error('network_unreachable'));
 if(kind==='rejection')return Promise.resolve({ok:false,status:503,json:async()=>({error:'social_unavailable'})});
 const data=kind==='disabled'?{disabled:true}:kind==='malformed'?{}:kind==='nonarray'?{players:{}}:{players:kind==='success'?[player]:[],total:kind==='success'?1:0,week:{starts_at:'2026-10-12T03:00:00Z',ends_at:'2026-10-19T03:00:00Z',timezone:'America/Sao_Paulo'}};
 return Promise.resolve({ok:true,status:200,json:async()=>data});
}
function visibleText(node) {
 if(node.nodeType===3)return node.textContent;
 if(node.hidden || node.style?.display==='none' || node.classList?.contains('hidden'))return '';
 return [...node.childNodes || []].map(visibleText).join(' ');
}
function assertState(pane,kind,surface) {
 const text=visibleText(pane).replace(/\s+/g,' ').trim();
 const rows=pane.querySelectorAll('table tbody tr');
 if(kind==='success'){
  check(rows.length===1,`expected one real rendered fixture row, got ${rows.length}`);
  check(!unavailable.test(text) && !disabled.test(text),`successful rows contradict global copy: ${text}`);
  check(pane.querySelector('img')?.getAttribute('src')===player.avatar_url,'player photo missing');
  check([...pane.querySelectorAll('a')].some(a=>a.getAttribute('href')==='/u/ruler_fixture'),'canonical profile link missing');
  check([...pane.querySelectorAll('a')].some(a=>a.getAttribute('href')==='https://x.com/ruler_fixture'),'social link missing');
 }else{
  check(rows.length===0,`${kind} must not retain score rows`);
  check(!loading.test(text),`${kind} must settle loading state: ${text}`);
  if(kind==='empty')check(emptyCopy.test(text) && !disabled.test(text) && !unavailable.test(text),`empty active ranking is not disabled/error: ${text}`);
  if(kind==='disabled')check(surface==='community'?/indisponível neste ambiente|desligad|desativad/i.test(text):disabled.test(text) && !unavailable.test(text),`disabled response must explain the choice: ${text}`);
  if(['network','rejection','malformed','nonarray'].includes(kind))check(unavailable.test(text) && !disabled.test(text),`failed request must not claim the ranking was switched off: ${text}`);
 }
 return {text,rows:rows.length,photos:pane.querySelectorAll('img').length};
}
async function scenario(surface,flag,kind,period='all') {
 const {document}=parseHTML(`<html><body>${surface==='community'?'<section id="community"><p id="social-status"></p><div id="social-content"></div></section>':ssrFragment(flag,surface)}</body></html>`);
 globalThis.document=document;
 const pane=document.getElementById(surface==='hub'?'hub-ranking':surface==='panel'?'ranking-panel':'community');
 pane.hidden=false;pane.classList.remove('hidden');
 const requests=[];
 const context={...helpers,document,URL,Date,AbortSignal,auth:null,state:null,profileId:'',tab:'ranking',loadVersion:0,rankingPeriod:period,rankingScope:'global',rankingOffset:0,rankingQuery:'',rankingMode:'all',rankingGameType:'all',registeredNick:'Renderer Fixture',loadStats:()=>({kills:4,deaths:2,wins:1,matches:2}),$:id=>document.getElementById(id),apiUrl:x=>x,fetch:async(url)=>{requests.push(url);return fetchResult(kind);},content:document.getElementById('social-content'),status:document.getElementById('social-status')};
 let body;
 if(surface==='community'){
  const start=community.indexOf('  const errors=');const stop=community.indexOf('  function presenceText',start);
  assert(start>=0 && stop>start,'community real DOM helpers unavailable');
  body=community.slice(start,stop)+'\n'+extract(community,'  function searchForm(', '  function friendCard(')+'\n'+extract(community,'  async function showRanking(version)','  function showQuests(')+'\n'+extract(community,'  async function render(){','  async function boot(')+'\nrender()';
 }else body=extract(main,'async function api(path, body)')+'\n'+extract(main,surface==='hub'?'async function renderHubRanking()':'async function renderGlobal(nick)')+`\n${surface==='hub'?'renderHubRanking()':"renderGlobal('Renderer Fixture')"}`;
 // Mutation applied to measured runtime state after executing real product; no product bytes are written.
 const staleNodes=surface==='hub'?[...pane.querySelectorAll(':scope > p')]:surface==='panel'?[...pane.querySelectorAll('.rank-note')]:[];
  let thrown=null;try{await vm.runInNewContext(body,context);}catch(e){thrown=e.message;}
 if(mutant==='frozen-ssr' && surface!=='community'){
  if(!staleNodes.length){const n=document.createElement('p');pane.append(n);staleNodes.push(n);}
  for(const node of staleNodes){node.hidden=false;node.textContent=flag?'No ranking global, abates multiplayer confirmados recebem um ponto extra.':'O ranking global está desligado por enquanto.';}mutationsApplied++;
 }
 if(mutant==='disabled-as-network' && kind==='disabled'){
  const box=document.getElementById(surface==='hub'?'hub-rank-global':surface==='panel'?'rank-global':'social-content');
  box.replaceChildren(document.createTextNode('Ranking global indisponível no momento.'));mutationsApplied++;
 }
 if(mutant==='empty-as-disabled' && kind==='empty'){
  const box=document.getElementById(surface==='hub'?'hub-rank-global':surface==='panel'?'rank-global':'social-content');box.replaceChildren(document.createTextNode('O ranking global está desligado por enquanto.'));mutationsApplied++;
 }
 if(mutant==='success-with-error' && kind==='success'){const note=document.createElement('p');note.textContent='Ranking global indisponível no momento.';pane.append(note);mutationsApplied++;}
 if(mutant==='no-photo' && kind==='success')for(const image of pane.querySelectorAll('img')){image.remove();mutationsApplied++;}
 if(mutant==='no-profile' && kind==='success')for(const a of pane.querySelectorAll('a'))if(a.getAttribute('href')==='/u/ruler_fixture'){a.remove();mutationsApplied++;}
 if(mutant==='no-week-tab' && surface==='community')for(const b of pane.querySelectorAll('button'))if(b.textContent==='SEMANAL'){b.remove();mutationsApplied++;}
 const name=`${surface}/SSR=${flag}/${kind}${surface==='community'?`/${period}`:''}`;
 try{
  check(!thrown,`renderer rejected without settling DOM: ${thrown}`);
  check(requests.length===1,'real renderer must execute one API request');
  const snapshot=assertState(pane,kind,surface);
  if(surface==='panel' && kind==='success')for(const label of ['RANKING COMPLETO','MEU PERFIL','MAPA AO VIVO'])check([...pane.querySelectorAll('a')].some(a=>a.textContent.startsWith(label) && a.target==='_blank' && a.rel.includes('noopener')),`preserve game tab footer: ${label}`);
  if(surface==='community'){
   check([...pane.querySelectorAll('button')].some(b=>b.textContent==='SEMANAL'),'dedicated weekly tab missing');
   check(new URL(requests[0],'https://fixture.test').searchParams.get('period')===period,'real API must use selected weekly period');
   if(kind==='success' && period==='week')check(snapshot.text.includes('12/10/2026') && snapshot.text.includes('19/10/2026'),'weekly server dates missing');
  }
  results.push({name,pass:true,...snapshot,requests});
 }catch(e){const failure={name,pass:false,error:e.message,text:visibleText(pane).replace(/\s+/g,' ').trim(),rows:pane.querySelectorAll('table tbody tr').length,requests};failures.push(failure);results.push(failure);}
}
for(const surface of ['hub','panel'])for(const flag of [false,true])for(const kind of ['success','disabled','rejection','network','empty','malformed','nonarray'])await scenario(surface,flag,kind);
for(const period of ['all','week'])for(const kind of ['success','disabled','rejection','network','empty'])await scenario('community',false,kind,period);
assert(!mutant || mutationsApplied>0,'MUTATION DID NOT APPLY');
const report={root,nodeVersion:process.version,mutant:mutant || null,mutationsApplied,hashes,productionEvidence:false,total:results.length,passed:results.length-failures.length,failed:failures.length,results};
if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(`${failures.length?'RED':'GREEN'} real ranking renderers: ${report.passed}/${report.total}; ${failures.length} failures; no browser, product edit, DB call or live-score claim.`);
for(const f of failures)console.log(`RED ${f.name}: ${f.error.slice(0,370)}`);
process.exitCode=failures.length?1:0;
