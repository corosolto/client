// Relato de Ruben, 12/10/2026: ranking sem fotos/links. Executa os renderers reais.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../../',import.meta.url);
const helper=new URL('public/js/ranking-player.js',root);
const mutant=process.argv.find(a=>a.startsWith('--mutant='))?.split('=')[1];
let helperSource=existsSync(helper)?readFileSync(helper,'utf8'):null;
if(mutant && !['no-import','no-week-tab'].includes(mutant)){assert(helperSource,'helper missing');const pairs={'no-photo':['if(photo){','if(false){'],'no-handle':['/^[a-z][a-z0-9_]{2,23}$/.test','false && /^[a-z][a-z0-9_]{2,23}$/.test']};assert(pairs[mutant],'unknown mutation');const changed=helperSource.replace(...pairs[mutant]);assert.notEqual(changed,helperSource,'mutation did not apply');helperSource=changed;}
if(helperSource)helperSource=helperSource.replace(/from\s*(['"])(\.\.?\/[^'"]+)\1/g,(_,quote,spec)=>'from '+quote+new URL(spec,helper).href+quote);
const helpers=helperSource?await import(`data:text/javascript,${encodeURIComponent(helperSource)}`):{};
const player={id:'c026ab03-2aa8-4775-979c-fcb1414fa50b',nick:'<b>Ruben</b>',public_handle:'ruben',avatar_url:'/api/social-avatar?id=c026ab03-2aa8-4775-979c-fcb1414fa50b',position:1,points:25,kills:18,kd:9,left_points:3,right_points:10,legacy_points:12,socials:[{net:'x',url:'https://x.com/ruben'},{net:'bad',url:'javascript:alert(1)'}]};
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.attributes={};this.dataset={};}
 setAttribute(name,value){this.attributes[name]=value;}
 append(...children){this.children.push(...children);}appendChild(child){this.append(child);return child;}
 replaceChildren(...children){this.children=children;}
}
const document={createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text})};
globalThis.document=document;
const el=(tag,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
const tree=n=>[n,...n.children?.flatMap(tree)||[]];
let source=readFileSync(new URL('public/js/community.js',root),'utf8');
if(mutant==='no-week-tab'){const changed=source.replace("'week','SEMANAL'","'week','ABA_AUSENTE'");assert.notEqual(changed,source,'weekly mutation did not apply');source=changed;}
const mainSource=readFileSync(new URL('public/js/main.js',root),'utf8');
const importsRanking=source=>/^import\s*\{[^}]*\brankingTable\b[^}]*\}\s*from\s*['"]\.\/ranking-player\.js['"]/m.test(source);
if(mutant==='no-import')assert(!importsRanking(source.replace(/^import[^\n]*ranking-player[^\n]*\n/m,'')),'import mutation did not apply');
const body=source.slice(source.indexOf('  async function showRanking(version)'),source.indexOf('  const openTretaQuests',source.indexOf('  async function showRanking(version)')));
const content=new Element('div');
let request='';
const context={...helpers,document,el,content,link:(text,href)=>Object.assign(el('a',text),{href}),button:(text,onclick)=>Object.assign(el('button',text),{onclick}),empty:text=>el('p',text),field:(text,node)=>{const n=el('label',text);n.append(node);return n;},searchForm:()=>el('form'),api:async url=>{request=url;return {players:[player],total:1,week:{starts_at:'2026-10-12T03:00:00Z',ends_at:'2026-10-19T03:00:00Z',timezone:'America/Sao_Paulo'},reward_status:'not_enabled'};},rankingScope:'global',rankingQuery:'',rankingOffset:0,rankingPeriod:'all',rankingMode:'all',rankingGameType:'all',rankingTeam:'all',loadVersion:0,render:async()=>{}};
try {
 assert(importsRanking(mutant==='no-import'?source.replace(/^import[^\n]*ranking-player[^\n]*\n/m,''):source),'community renderer has no ranking helper import');
 assert(importsRanking(mainSource),'home renderer has no ranking helper import');
 await vm.runInNewContext(`${body}\nshowRanking(0)`,context);
 const nodes=tree(content);
 assert(nodes.some(n=>n.tag==='img' && n.alt.includes(player.nick)),'social ranking row has no player photo');
 assert(nodes.some(n=>n.tag==='a' && n.href==='/u/ruben'),'ranking does not use canonical profile handle');
 assert(nodes.some(n=>n.tag==='a' && n.href==='https://x.com/ruben'),'ranking has no social profile link');
 assert(!nodes.some(n=>n.href?.startsWith('javascript:')),'unsafe profile link rendered');
 assert(nodes.some(n=>n.textContent==='TIME E') && nodes.some(n=>n.textContent==='TIME B'),'current team headings absent');
 const weekly=nodes.find(n=>n.tag==='button' && n.textContent==='SEMANAL');
 assert(weekly,'dedicated weekly ranking tab absent');
 assert.equal(weekly.attributes['aria-pressed'],'false');
 context.rankingOffset=25;await weekly.onclick();assert.equal(context.rankingPeriod,'week');assert.equal(context.rankingOffset,0);
 content.replaceChildren();await vm.runInNewContext(`${body}\nshowRanking(0)`,context);
 assert(new URL(request,'https://fixture.test').searchParams.get('period')==='week','weekly tab must query weekly scores');
 const weekNodes=tree(content);assert(weekNodes.some(n=>n.tag==='button' && n.textContent==='SEMANAL' && n.attributes['aria-pressed']==='true'));
 assert(weekNodes.some(n=>n.textContent.includes('12/10/2026') && n.textContent.includes('19/10/2026')),'weekly tab must show the server period');
 assert(!weekNodes.some(n=>n.textContent.includes('Últimos 7 dias')),'weekly must not be a rolling window');
 console.log('PASS weekly tab: API period, selected state, pagination reset, server dates');
 console.log('PASS social renderer: photo, canonical profile, safe socials, both teams');
 const main=mainSource;
 const globalBody=main.slice(main.indexOf('async function renderGlobal(nick)'),main.indexOf('\n}',main.indexOf('async function renderGlobal(nick)'))+2);
 const box=new Element('div');
 await vm.runInNewContext(`${globalBody}\nrenderGlobal('test')`,{...helpers,document,$:()=>box,api:async()=>({players:[player]})});
 const homeNodes=tree(box);
 assert(homeNodes.some(n=>n.tag==='img'),'home ranking has no player photo');
 assert(homeNodes.some(n=>n.tag==='a' && n.href==='/u/ruben'),'home ranking has no canonical player link');
 for(const label of ['RANKING COMPLETO','MEU PERFIL','MAPA AO VIVO'])assert(homeNodes.some(n=>n.tag==='a' && n.textContent.startsWith(label) && n.target==='_blank' && n.rel.includes('noopener')),'footer must preserve game tab: '+label);
 console.log('PASS home renderer: photo and canonical profile');
}catch(e){console.error('RED ranking presentation:',e.message);process.exitCode=1;}
