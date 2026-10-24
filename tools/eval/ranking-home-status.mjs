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
assert(!mutant || ['frozen-ssr','disabled-as-network','empty-as-disabled','success-with-error','no-photo','no-profile','no-week-tab','nonarray-guard','hub-legacy-source','hub-title','hub-row-link','hub-char-avatar','hub-cta-logado','hub-sem-pagina','hub-pagina-sem-offset','hub-css-hidden'].includes(mutant),'unknown mutation');
let mutationsApplied=0;
if(args.includes('--mutants')) {
 assert(!mutant,'--mutants and --mutant cannot be combined');
 const folder=mkdtempSync(join(tmpdir(),'ranking-home-status-'));
 const names=['frozen-ssr','disabled-as-network','empty-as-disabled','success-with-error','no-photo','no-profile','no-week-tab','nonarray-guard','hub-legacy-source','hub-title','hub-row-link','hub-char-avatar','hub-cta-logado','hub-sem-pagina','hub-pagina-sem-offset','hub-css-hidden'];
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
let astro=source('src/pages/index.astro'),peleV3=source('public/css/tp/ranking.css');
const hashes=Object.fromEntries(['src/pages/index.astro','public/js/main.js','public/js/community.js','public/js/ranking-player.js'].map(p=>[p,createHash('sha256').update(source(p)).digest('hex')]));
if(mutant==='nonarray-guard'){const changed=main.replaceAll('!Array.isArray(data?.players)','!data?.players');assert.notEqual(changed,main,'MUTATION DID NOT APPLY');main=changed;mutationsApplied++;}
// A tela do hub só pode ler a fonte verificada: /api/leaderboard não filtra ranking_exclusion (22/10).
if(mutant==='hub-legacy-source'){const changed=main.replace("await api('/api/social?action=ranking&scope=global&period=all&mode=all&game_type=all&team=all')","await api('/api/leaderboard')");assert.notEqual(changed,main,'MUTATION DID NOT APPLY');main=changed;mutationsApplied++;}
// Os três pedidos de 22/10 na aba RANKING: título, linha inteira clicável e avatar de personagem.
if(mutant==='hub-title'){const changed=astro.replace('<h2>RANKING</h2>','<h2>PLACAR DA RUA</h2>');assert.notEqual(changed,astro,'MUTATION DID NOT APPLY');astro=changed;mutationsApplied++;}
if(mutant==='hub-row-link'){const changed=main.replace("linha.setAttribute('role', 'link'); linha.setAttribute('tabindex', '0');","linha.dataset.mutante = '1';");assert.notEqual(changed,main,'MUTATION DID NOT APPLY');main=changed;mutationsApplied++;}
if(mutant==='hub-char-avatar'){const changed=main.replace("? `/img/chars/avatars/${p.last_character}.webp` : ''","? '' : ''");assert.notEqual(changed,main,'MUTATION DID NOT APPLY');main=changed;mutationsApplied++;}
// Pedidos de 24/10: quem já está logado não vê convite de nick, e a lista rola em páginas de 25.
if(mutant==='hub-cta-logado'){const changed=main.replace('Boolean(registeredNick || contaNick)','Boolean(registeredNick)');assert.notEqual(changed,main,'MUTATION DID NOT APPLY');main=changed;mutationsApplied++;}
if(mutant==='hub-sem-pagina'){const changed=main.replace('  global.append(mais);\n','');assert.notEqual(changed,main,'MUTATION DID NOT APPLY');main=changed;mutationsApplied++;}
if(mutant==='hub-pagina-sem-offset'){const changed=main.replace('&offset=${corpo.children.length}','');assert.notEqual(changed,main,'MUTATION DID NOT APPLY');main=changed;mutationsApplied++;}
/* A pele v3 declara `display` para esses botões: sem `:not([hidden])` o atributo hidden do
   produto não esconde nada, que foi o convite de nick aparecendo para quem já estava logado. */
if(mutant==='hub-css-hidden'){const changed=peleV3.replaceAll(':not([hidden])','');assert.notEqual(changed,peleV3,'MUTATION DID NOT APPLY');peleV3=changed;mutationsApplied++;}
const helpers=await import(pathToFileURL(`${root}/public/js/ranking-player.js`).href);
// renderHubRanking monta a célula do jogador sozinha, mas reaproveita os mesmos selos do produto.
const selos={...await import(pathToFileURL(`${root}/public/js/account-verified.js`).href),...await import(pathToFileURL(`${root}/public/js/career-rank.js`).href)};
const player={id:'c026ab03-2aa8-4775-979c-fcb1414fa50b',nick:'Renderer Fixture',public_handle:'ruler_fixture',avatar_url:'/api/social-avatar?id=c026ab03-2aa8-4775-979c-fcb1414fa50b',position:1,points:25,career_points:25,kills:18,kd:9,matches:12,left_points:3,right_points:10,socials:[{net:'x',url:'https://x.com/ruler_fixture'}]};
// 21 dos 25 do ranking de produção não têm avatar_url: a segunda linha do hub é esse caso.
const charPlayer={id:'7f2d4c18-9b01-4f5a-8c3d-21e6a0b4d957',nick:'Sem Foto',public_handle:'sem_foto',avatar_url:null,last_character:'ancap',position:2,points:10,kills:3,deaths:3,kd:1,matches:7,socials:[]};
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
/* `pagina` entrega 25 (a página do servidor) e, no offset seguinte, 3 — é assim que a
   rolagem infinita prova que pediu a próxima página e que sabe parar na última. */
const pagina=(inicio,quantos)=>Array.from({length:quantos},(_,i)=>({...charPlayer,id:`fixture-${inicio+i}`,nick:`Fixture ${inicio+i}`,public_handle:`fixture_${inicio+i}`,position:inicio+i+1}));
function fetchResult(kind,surface,url) {
 if(kind==='network')return Promise.reject(new Error('network_unreachable'));
 if(kind==='rejection')return Promise.resolve({ok:false,status:503,json:async()=>({error:'social_unavailable'})});
 if(kind==='pagina'){
  const offset=Number(new URL(url,'https://fixture.test').searchParams.get('offset') || 0);
  const lote=offset?pagina(offset,3):pagina(0,25);
  return Promise.resolve({ok:true,status:200,json:async()=>({players:lote,total:28})});
 }
 const lista=surface==='hub'?[player,charPlayer]:[player];
 const data=kind==='disabled'?{disabled:true}:kind==='malformed'?{}:kind==='nonarray'?{players:{}}:{players:kind==='success'?lista:[],total:kind==='success'?lista.length:0,week:{starts_at:'2026-10-12T03:00:00Z',ends_at:'2026-10-19T03:00:00Z',timezone:'America/Sao_Paulo'}};
 return Promise.resolve({ok:true,status:200,json:async()=>data});
}
// Contrato da aba RANKING (pedidos de 22/10): colunas, linha-link e avatar que cai pro personagem.
function assertHub(pane,rows) {
 const colunas=[...pane.querySelectorAll('thead th')].map(th=>th.textContent.trim());
 check(colunas.join('|')==='POS.|JOGADOR|PONTOS|KILLS|K/D|PARTIDAS',`hub columns must read KILLS and carry PARTIDAS, got ${colunas.join('|')}`);
 const partidas=[...rows].map(linha=>linha.children[5]?.textContent.trim()).join(',');
 check(partidas===`${player.matches},${charPlayer.matches}`,`PARTIDAS column must print the payload matches, got ${partidas}`);
 for(const linha of rows){
  check(linha.getAttribute('role')==='link','hub ranking row is not announced as a link');
  check(linha.getAttribute('tabindex')==='0','hub ranking row is not reachable by keyboard');
  check(/^Ver perfil de \S/.test(linha.getAttribute('aria-label') || ''),`hub ranking row does not say where it goes: ${linha.getAttribute('aria-label')}`);
  check((linha.dataset.href || '').startsWith('/u/'),'hub ranking row has no profile destination');
  check(typeof linha.onclick==='function' && typeof linha.onkeydown==='function','hub ranking row has no click/keyboard handler');
  check(!linha.querySelector('a a'),'hub ranking row nests an anchor inside another anchor');
 }
 const arte=rows[1].querySelector('img');
 check(arte?.getAttribute('src')===`/img/chars/avatars/${charPlayer.last_character}.webp`,`player without photo must fall back to the character art, got ${arte?.getAttribute('src')}`);
 check(typeof arte.onerror==='function','character avatar has no onerror fallback to the initial');
}
function visibleText(node) {
 if(node.nodeType===3)return node.textContent;
 if(node.hidden || node.style?.display==='none' || node.classList?.contains('hidden'))return '';
 return [...node.childNodes || []].map(visibleText).join(' ');
}
function assertState(pane,kind,surface) {
 const text=visibleText(pane).replace(/\s+/g,' ').trim();
 const rows=pane.querySelectorAll('table tbody tr');
 if(kind==='pagina')return {text,rows:rows.length,photos:pane.querySelectorAll('img').length};
 if(kind==='success'){
  const esperadas=surface==='hub'?2:1;
  check(rows.length===esperadas,`expected ${esperadas} real rendered fixture row(s), got ${rows.length}`);
  check(!unavailable.test(text) && !disabled.test(text),`successful rows contradict global copy: ${text}`);
  check(pane.querySelector('img')?.getAttribute('src')===player.avatar_url,'player photo missing');
  check([...pane.querySelectorAll('a')].some(a=>a.getAttribute('href')==='/u/ruler_fixture'),'canonical profile link missing');
  // No hub a linha inteira é o link do perfil; as redes do jogador seguem no painel e na comunidade.
  if(surface==='hub')assertHub(pane,rows);
  else check([...pane.querySelectorAll('a')].some(a=>a.getAttribute('href')==='https://x.com/ruler_fixture'),'social link missing');
 }else{
  check(rows.length===0,`${kind} must not retain score rows`);
  check(!loading.test(text),`${kind} must settle loading state: ${text}`);
  if(kind==='empty')check(emptyCopy.test(text) && !disabled.test(text) && !unavailable.test(text),`empty active ranking is not disabled/error: ${text}`);
  if(kind==='disabled')check(surface==='community'?/indisponível neste ambiente|desligad|desativad/i.test(text):disabled.test(text) && !unavailable.test(text),`disabled response must explain the choice: ${text}`);
  if(['network','rejection','malformed','nonarray'].includes(kind))check(unavailable.test(text) && !disabled.test(text),`failed request must not claim the ranking was switched off: ${text}`);
 }
 return {text,rows:rows.length,photos:pane.querySelectorAll('img').length};
}
async function scenario(surface,flag,kind,period='all',conta='',semNick=false) {
 const {document}=parseHTML(`<html><body>${surface==='community'?'<section id="community"><p id="social-status"></p><details class="social-account-panel" open><div id="social-account"></div></details><div id="social-content"></div></section>':ssrFragment(flag,surface)}</body></html>`);
 globalThis.document=document;
 const pane=document.getElementById(surface==='hub'?'hub-ranking':surface==='panel'?'ranking-panel':'community');
 pane.hidden=false;pane.classList.remove('hidden');
 const requests=[];
 const nickRegistrado=(conta || semNick)?'':'Renderer Fixture';
 const context={...helpers,...selos,document,URL,Date,AbortSignal,UI_V3:false,tr:x=>x,auth:null,state:null,profileId:'',tab:'ranking',loadVersion:0,rankingPeriod:period,rankingScope:'global',rankingOffset:0,rankingQuery:'',rankingMode:'all',rankingGameType:'all',rankingTeam:'all',registeredNick:nickRegistrado,contaNick:conta,RANKING_PAGINA:25,loadStats:()=>({kills:4,deaths:2,wins:1,matches:2}),$:id=>document.getElementById(id),apiUrl:x=>x,fetch:async(url)=>{requests.push(url);return fetchResult(kind,surface,url);},content:document.getElementById('social-content'),status:document.getElementById('social-status'),account:document.getElementById('social-account')};
 let body;
 if(surface==='community'){
  context.root=pane; // community.js lê root no escopo do módulo (render marca data-view)
  // O recorte começa no painel da conta: render() chama painelDaConta() desde que o visitante passou a ver o perfil (22/10).
  const start=community.indexOf('  let painelPedido=');const stop=community.indexOf('  function presenceText',start);
  assert(start>=0 && stop>start,'community real DOM helpers unavailable');
  body=community.slice(start,stop)+'\n'+extract(community,'  function searchForm(', '  function friendCard(')+'\n'+extract(community,'  async function showRanking(version)','  const openTretaQuests=')+'\n'+extract(community,'  async function render(){','  async function boot(')+'\nrender()';
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
 const name=`${surface}/SSR=${flag}/${kind}${surface==='community'?`/${period}`:''}${conta?'/logado':''}`;
 try{
  check(!thrown,`renderer rejected without settling DOM: ${thrown}`);
  check(requests.length===1,'real renderer must execute one API request');
  /* Pedidos de 24/10. O convite de nick é só para quem não tem nick NENHUM: conta logada já
     participa. E a lista cresce por página — o botão é o mecanismo real da rolagem infinita,
     então ele existe enquanto o servidor devolveu uma página cheia e some na última. */
  if(surface==='hub'){
   const convite=pane.querySelector('#hub-rank-profile');
   const deveEsconder=Boolean(nickRegistrado || conta);
   check(convite.hidden===deveEsconder,deveEsconder?`quem já tem nick (${conta?'conta':'registro'}) ainda vê o convite de participar`:'quem não tem nick nenhum ficou sem o convite de participar');
  }
  if(surface==='hub' && kind==='pagina'){
   const mais=pane.querySelector('#hub-rank-mais');
   check(!!mais && typeof mais.onclick==='function','página cheia sem o acionador de mais uma página');
   check(pane.querySelectorAll('table tbody tr').length===25,`primeira página devia render 25 linhas, veio ${pane.querySelectorAll('table tbody tr').length}`);
   await mais.onclick();
   check(requests.length===2,`rolar devia pedir a página seguinte, pediu ${requests.length}`);
   check(new URL(requests[1],'https://fixture.test').searchParams.get('offset')==='25',`segunda página sem o offset certo: ${requests[1]}`);
   check(pane.querySelectorAll('table tbody tr').length===28,`linhas devem somar, vieram ${pane.querySelectorAll('table tbody tr').length}`);
   check(!pane.querySelector('#hub-rank-mais'),'última página (menor que 25) devia encerrar a rolagem');
  }
  // A aba RANKING do hub é a tela promovida a primeira linha: só a fonte verificada serve.
  if(surface==='hub')check(new URL(requests[0],'https://fixture.test').searchParams.get('action')==='ranking',`hub must read the verified ranking source, asked ${requests[0]}`);
  // Pedido do dono (22/10): o título desta tela é RANKING; PLACAR DA RUA ficou só na faixa do lobby.
  if(surface==='hub')check(pane.querySelector('h2')?.textContent.trim()==='RANKING',`hub ranking title must be RANKING, got ${pane.querySelector('h2')?.textContent}`);
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
for(const regra of peleV3.split('}')){
 if(!/#hub-ranking[^{]*(?:\.hub-rank-profile|#hub-rank-share)/.test(regra) || !/\{[^{]*display\s*:/.test(regra))continue;
 const seletores=regra.split('{')[0].split(',').map(s=>s.trim()).filter(s=>/\.hub-rank-profile|#hub-rank-share/.test(s));
 for(const seletor of seletores){
  if(/:(?:hover|focus|active|focus-visible|disabled)/.test(seletor))continue;
  if(!seletor.includes(':not([hidden])'))failures.push({name:'css/v3/hidden',pass:false,error:`pele v3 declara display sem :not([hidden]) em "${seletor}": o atributo hidden do produto não esconde o botão`,requests:[]});
 }
}
for(const surface of ['hub','panel'])for(const flag of [false,true])for(const kind of ['success','disabled','rejection','network','empty','malformed','nonarray'])await scenario(surface,flag,kind);
// Pedidos de 24/10 no renderer real: logado não vê convite, sem nick nenhum vê, lista rola por página.
await scenario('hub',true,'success','all','rubenmarcus');
await scenario('hub',true,'success','all','',true);
await scenario('hub',true,'pagina');
for(const period of ['all','week'])for(const kind of ['success','disabled','rejection','network','empty'])await scenario('community',false,kind,period);
assert(!mutant || mutationsApplied>0,'MUTATION DID NOT APPLY');
const report={root,nodeVersion:process.version,mutant:mutant || null,mutationsApplied,hashes,productionEvidence:false,total:results.length,passed:results.length-failures.length,failed:failures.length,results};
if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(`${failures.length?'RED':'GREEN'} real ranking renderers: ${report.passed}/${report.total}; ${failures.length} failures; no browser, product edit, DB call or live-score claim.`);
for(const f of failures)console.log(`RED ${f.name}: ${f.error.slice(0,370)}`);
process.exitCode=failures.length?1:0;
