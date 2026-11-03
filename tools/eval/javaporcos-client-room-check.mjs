import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const ROOT=new URL('../../',import.meta.url),SELF=fileURLToPath(import.meta.url);
const FILES={main:'public/js/main.js',net:'public/js/net.js',nos:'public/js/nos.js',maps:'public/js/maps.js'};
const IDS=['HEALTH_FIELDS','SOLO_JAVA','SOLO_ROUNDS','SOLO_CTF','FORM_ROUNDS','FORM_CTF','FORM_STALE','FORM_JAVA','FRIENDS','QUICK_PVP','QUICK_CREATE','QUICK_FULL_PRIVATE','SP_JAVA','LIST_JAVA','PAYLOAD_MODE','NODE_QUICK','NODE_NONE','NODE_FORM','NODE_FRIENDS','NODE_SOLO','NODE_MIXED','NODE_LEGACY','NODE_RANK'];
const MUTANTS={
 'solo-guard':['SOLO_JAVA'], 'catalog-horde':['FORM_JAVA'], 'quick-horde':['QUICK_PVP','NODE_QUICK'],
 'explicit-mode':['PAYLOAD_MODE'], 'stale-selection':['FORM_STALE'],
 'node-guard':['NODE_QUICK','NODE_NONE','NODE_FORM','NODE_FRIENDS','NODE_SOLO'],
 'health-fields':['HEALTH_FIELDS','NODE_QUICK','NODE_NONE','NODE_FORM','NODE_FRIENDS','NODE_SOLO'],
 'mixed-overfilter':['NODE_MIXED'], 'sp-overfilter':['SP_JAVA'], 'list-overfilter':['LIST_JAVA'],
};
const SCHEMA='cs-javaporcos-client-room-check/1',ENV='CS_JAVA_ROOM_CHECK_WORKER';
const sha=s=>createHash('sha256').update(s).digest('hex');
function need(ok,message){if(!ok)throw Error(message);}
const walk=(n,fn)=>{if(!n||typeof n.type!=='string')return;fn(n);for(const [key,v]of Object.entries(n)){if(key==='loc')continue;if(Array.isArray(v))for(const c of v)walk(c,fn);else if(v&&typeof v.type==='string')walk(v,fn);}};
function tree(source,parse){return parse(source,{ecmaVersion:'latest',sourceType:'module',locations:true});}
function matches(ast,pred){const out=[];walk(ast,n=>{if(pred(n))out.push(n);});return out;}
function unique(ast,pred,label){const list=matches(ast,pred);need(list.length===1,label+': expected1 found'+list.length);return list[0];}
const cut=(s,n)=>s.slice(n.start,n.end);
const functionNode=(ast,name)=>unique(ast,n=>n.type==='FunctionDeclaration'&&n.id?.name===name,name);
const variable=(ast,name)=>unique(ast,n=>n.type==='VariableDeclarator'&&n.id?.name===name,name);
function callback(ast,name){return unique(ast,n=>n.type==='AssignmentExpression'&&n.left?.type==='MemberExpression'&&n.left.object?.name===name&&n.left.property?.name==='onclick',name+'.onclick').right;}
function soloNode(ast){return unique(ast,n=>n.type==='CallExpression'&&n.callee?.object?.name==='document'&&n.callee.property?.name==='addEventListener'&&n.arguments[0]?.value==='cs-treta-solo','solo callback').arguments[1];}
function replaceNodes(source,nodes,replacement){let out=source;for(const n of nodes.toSorted((a,b)=>b.start-a.start))out=out.slice(0,n.start)+replacement(n)+out.slice(n.end);return out;}
function mutate(source,kind,parse){
 const out={...source},a=tree(out.main,parse),m=out.main;let key='main',nodes=[],replace;
 const unit=name=>functionNode(a,name),q=callback(a,'quick'),solo=soloNode(a),form=callback(a,'criar');
 if(kind==='solo-guard'){
  nodes=matches(solo,n=>n.type==='IfStatement'&&/currentMap/.test(cut(m,n.test))&&/ehMapaJavaporcos|objectiveMode|horde/.test(cut(m,n.test)));replace=()=>';';
 }else if(kind==='catalog-horde'){
  nodes=matches(unit('mpCarregarMapasDoNo'),n=>(n.type==='BinaryExpression'&&/objectiveMode/.test(cut(m,n))&&/horde/.test(cut(m,n)))||(n.type==='UnaryExpression'&&n.operator==='!'&&/ehMapaJavaporcos/.test(cut(m,n))));replace=()=>'true';
 }else if(kind==='quick-horde'){
  const filter=unique(q,n=>n.type==='CallExpression'&&n.callee?.property?.name==='filter'&&/\.private/.test(cut(m,n))&&/\.livre/.test(cut(m,n)),'quick roomfilter');nodes=[filter.arguments[0]];replace=()=>"r=>!r.private&&((r.livre?.E||0)+(r.livre?.B||0))>0";
 }else if(kind==='explicit-mode'){
  const calls=matches(a,n=>n.type==='CallExpression'&&n.callee?.name==='createRoom');need(calls.length===4,'createRoom census');
  nodes=calls.flatMap(c=>c.arguments[1].properties.filter(p=>p.key?.name==='mode'));need(nodes.length===4,'mode anchors4');
  const objects=calls.map(c=>c.arguments[1]);
  const before=out.main;out.main=replaceNodes(m,objects,n=>'{'+n.properties.filter(p=>p.key?.name!=='mode').map(p=>cut(m,p)).join(',')+'}');
  return {source:out,application:{kind,file:FILES.main,count:4,before:sha(before),after:sha(out.main)}};
 }else if(kind==='stale-selection'){
  nodes=matches(form,n=>n.type==='IfStatement'&&/escolhidos/.test(cut(m,n.test))&&/some|every|MAPS|mpMapasDoNo/.test(cut(m,n.test)));replace=n=>'if(aDedo&&!escolhidos.length)'+cut(m,n.consequent);
 }else if(kind==='node-guard'||kind==='mixed-overfilter'){
  nodes=matches(a,n=>n.type==='BinaryExpression'&&/^(===|!==|==|!=)$/.test(n.operator)&&((n.left.type==='MemberExpression'&&['nodeMode','roomCreation'].includes(n.left.property?.name))||(n.right.type==='MemberExpression'&&['nodeMode','roomCreation'].includes(n.right.property?.name))));
  if(kind==='mixed-overfilter')nodes=nodes.filter(n=>cut(m,n).includes('nodeMode'));
  need(nodes.length>0,'nodeguard anchors absent');
  replace=n=>{const member=n.left.type==='MemberExpression'?n.left:n.right,allow=n.operator.includes('!');if(kind==='node-guard')return allow?'true':'false';return (allow?'!':'!!')+cut(m,member.object)+'.horde';};
 }else if(kind==='health-fields'){
  key='net';const net=out.net,na=tree(net,parse),probe=functionNode(na,'sondarNos');const object=unique(probe,n=>n.type==='ObjectExpression'&&n.properties.some(p=>p.key?.name==='ticketNode'),'health return');
  need(object.properties.filter(p=>['nodeMode','roomCreation'].includes(p.key?.name)).length===2,'health2 anchors');nodes=[object];replace=n=>'{'+n.properties.filter(p=>!['nodeMode','roomCreation'].includes(p.key?.name)).map(p=>cut(net,p)).join(',')+'}';
 }else if(kind==='sp-overfilter'){
  nodes=[variable(a,'MAPAS_MENU').init];replace=n=>'('+cut(m,n)+").filter(id=>MAPS[id].objectiveMode!=='horde')";
 }else if(kind==='list-overfilter'){
  const f=unit('mpAtualizarSalas');nodes=[unique(f,n=>n.type==='ForOfStatement'&&n.right?.name==='salas','listingloop').right];replace=()=>"salas.filter(r=>r.mode!=='horde')";
 }else throw Error('unknown mutation');
 if(!['node-guard','mixed-overfilter'].includes(kind))need(nodes.length===1,kind+': anchor census'+nodes.length);
 const before=out[key];out[key]=replaceNodes(before,nodes,replace);need(out[key]!==before,'mutation no-op');tree(out[key],parse);
 return {source:out,application:{kind,file:FILES[key],count:nodes.length,before:sha(before),after:sha(out[key])}};
}
const element=()=>({dataset:{},value:'',checked:false,disabled:false,children:[],innerHTML:'',textContent:'',appendChild(x){this.children.push(x);},append(...x){this.children.push(...x);},querySelectorAll:()=>[],querySelector(){return this.actions??=element();}});
async function evaluate(source,parse){
 const ast=Object.fromEntries(Object.entries(source).map(([k,s])=>[k,tree(s,parse)])),ex=(k,n)=>cut(source[k],variable(ast[k],n).init),fn=(k,n)=>cut(source[k],functionNode(ast[k],n));
 const metadata=vm.runInNewContext('const JAVAPORCOS_META='+ex('maps','JAVAPORCOS_META')+';const MAPS='+ex('maps','MAPS')+';const MAP_IDS=Object.keys(MAPS);const MAPAS_PARADOS='+ex('maps','MAPAS_PARADOS')+';const MAP_IDS_JOGAVEIS=MAP_IDS.filter(id=>!MAPAS_PARADOS.has(id));({MAPS,MAP_IDS,MAPAS_PARADOS,MAP_IDS_JOGAVEIS});');
 const units={solo:cut(source.main,soloNode(ast.main)),form:cut(source.main,callback(ast.main,'criar')),friends:cut(source.main,callback(ast.main,'amigos')),quick:cut(source.main,callback(ast.main,'quick'))};
 const java={id:'javaporcos',codigo:'JAVA',name:'JAVA',mode:'horde',cooperative:true,map:'invasao_javaporcos',oficial:true,players:4,max:8,livre:{E:4,B:0}},pvp={id:'pvp',mode:'rounds',cooperative:false,map:'praca_poderes',oficial:true,players:1,max:10,livre:{E:4,B:5}};
 const normal={id:'normal',ping:20,health:{salaConvite:true,soloVerified:true}},mixed={id:'mixed',ping:20,health:{nodeMode:'mixed',roomCreation:true,horde:{protocol:8},salaConvite:true,soloVerified:true}};
 const denied=[{id:'dedicated',ping:1,health:{nodeMode:'horde',roomCreation:true,horde:{protocol:8},salaConvite:true,soloVerified:true,players:8}},{id:'closed',ping:1,health:{nodeMode:'mixed',roomCreation:false,salaConvite:true,soloVerified:true,players:8}}];
 const posts=[],rows=[];
 const result=(id,ok,detail)=>rows.push({id,status:ok?'PASS':'FAIL',detail});
 async function fixture({nodes=[normal],rooms=[java,pvp],selected=['praca_poderes'],map='praca_poderes',ctf=false}={}){
  const els=new Map(),el=id=>{if(!els.has(id))els.set(id,element());return els.get(id);},events={tickets:0,posts:[],joins:[],errors:[],rankInputs:[],healthRequests:0},observers=[];
  el('mp-rotacao').value='escolher';el('mp-modo').value=ctf?'ctf':'rounds';el('mp-teamsize').value='5';
  const inputNodes=nodes.map(n=>({id:n.id,url:'ws://'+n.id+'.fixture.invalid/ws',nome:n.id}));
  const ctx={...metadata,oficina:false,currentMap:map,matchMode:ctf?'ctf':'rounds',settings:{bots:4},mpConectando:false,tretaSoloStarting:false,mpMapasEscolhidos:new Set(selected),mpMapasDoNo:[...metadata.MAP_IDS_JOGAVEIS].filter(id=>metadata.MAPS[id].objectiveMode!=='horde'),NOS:inputNodes,mpNos:[],mpNoAtual:null,
   ui:{click(){},hover(){}},show(){},mpEstado(){},mpErro:m=>events.errors.push(String(m)),mpSelecionarNo:n=>{ctx.mpNoAtual=n;},mpDesenharNos(){},tpMp(){},tr:x=>x,VERSION:'fixture',FACTION_NAME:{E:'E',B:'B'},mapPreviewPoster:id=>'/fixture/'+id+'.jpg',clientUuid:()=> '[REDACTED:synthetic-fixture]',obterMpTicket:async()=>{events.tickets++;return '';},mpEl:el,$:el,nickEl:el('nick-input'),amigos:el('mp-amigos'),mpEntrar:async(r,team)=>events.joins.push({id:r.id,mode:r.mode,team}),mpModalSalaCriada:r=>events.joins.push({id:r.id,modal:true}),document:{createElement:element},AbortController,URL,URLSearchParams,performance:{now:()=>0},setInterval,clearInterval,setTimeout,
   console:{info(){},warn(){},error(){}},PerformanceObserver:class{constructor(cb){this.cb=cb;this.active=true;observers.push(this);}observe(){}disconnect(){this.active=false;}},
   fetch:async(url,opt)=>{const host=new URL(url).hostname,id=host.split('.')[0],n=nodes.find(n=>n.id===id);need(n,'fixture host unknown');for(const o of observers)if(o.active)o.cb({getEntries:()=>[{name:url,duration:n.ping}]});
    if(opt?.method==='POST'){const body=JSON.parse(opt.body);const post={node:id,name:body.name,mapId:body.mapId,mapas:body.mapas,ctf:body.ctf,mode:body.mode,private:body.private,solo:body.solo,rotacao:body.rotacao};events.posts.push(post);posts.push(post);return {ok:true,json:async()=>({id:'created',convite:'FIXTURE'})};}
    if(String(url).endsWith('/health')){events.healthRequests++;return {ok:true,json:async()=>({regiao:id,players:0,rooms:1,...n.health})};}
    return {ok:true,json:async()=>String(url).endsWith('/maps')?{maps:metadata.MAP_IDS_JOGAVEIS}:{rooms:rooms.map(r=>({...r}))}};}};
  vm.createContext(ctx);
  for(const n of ast.main.body){const d=n.type==='ExportNamedDeclaration'?n.declaration:n;if(d?.type==='FunctionDeclaration'&&!(d.id.name in ctx))ctx[d.id.name]=vm.runInContext('('+cut(source.main,d)+')',ctx);if(d?.type==='VariableDeclaration')for(const v of d.declarations)if(v.id.type==='Identifier'&&['ArrowFunctionExpression','FunctionExpression'].includes(v.init?.type)&&!(v.id.name in ctx))ctx[v.id.name]=vm.runInContext('('+cut(source.main,v.init)+')',ctx);}
  const defs=fn('net','mpUrls')+';const j='+ex('net','j')+';globalThis.createRoom='+ex('net','createRoom')+';globalThis.listRooms='+ex('net','listRooms')+';globalThis.listMaps='+ex('net','listMaps')+';'+fn('net','prazoAcordado')+';'+fn('net','observaRede')+';'+fn('net','sondarNos')+';globalThis.sondarNos=sondarNos;';vm.runInContext(defs,ctx);
  vm.runInContext('const PASSO_MS='+ex('net','PASSO_MS')+';const FAIXA_PING_MS='+ex('nos','FAIXA_PING_MS')+';const TETO_COMPANHIA_MS='+ex('nos','TETO_COMPANHIA_MS')+';'+fn('nos','ordenarNos')+';globalThis.ordenarNos=ordenarNos;'+fn('nos','melhorNoParaJogar')+';globalThis.rankReal=melhorNoParaJogar;',ctx);
  ctx.melhorNoParaJogar=(ns,...args)=>{events.rankInputs.push(ns.map(n=>n.id));return ctx.rankReal(ns,...args);};
  vm.runInContext('const ALIAS_MAPA='+ex('maps','ALIAS_MAPA')+';const DEFAULT_MAP='+ex('maps','DEFAULT_MAP')+';'+fn('maps','resolveMapId')+';globalThis.ehMapaJavaporcos='+ex('maps','ehMapaJavaporcos')+';',ctx);
  ctx.mapasDoMenu=vm.runInContext(fn('maps','mapasDoMenu')+';mapasDoMenu;',ctx);ctx.MAPAS_MENU=vm.runInContext(ex('main','MAPAS_MENU'),ctx);
  ctx.mpNos=await ctx.sondarNos(inputNodes,2500,1);ctx.mpNoAtual=ctx.mpNos[0];events.healthRequests=0;
  return {ctx,events,el,run:name=>vm.runInContext('('+units[name]+')',ctx)()};
 }
 let x=await fixture({nodes:[...denied,mixed,normal]});const h=x.ctx.mpNos;result('HEALTH_FIELDS',h[0].nodeMode==='horde'&&h[0].roomCreation===true&&h[1].nodeMode==='mixed'&&h[1].roomCreation===false&&h[2].nodeMode==='mixed'&&h[2].roomCreation===true&&h[2].horde?.protocol===8&&h[3].nodeMode===undefined&&h[3].roomCreation===undefined,'literal health fields incl OR cases, mixed+horde, legacy');rows.at(-1).observed=h.map(n=>({id:n.id,nodeMode:n.nodeMode,roomCreation:n.roomCreation,horde:n.horde}));
 x=await fixture({map:'invasao_javaporcos'});await x.run('solo');result('SOLO_JAVA',x.events.healthRequests===0&&x.events.tickets===0&&x.events.posts.length===0&&x.events.errors.length>0&&x.ctx.tretaSoloStarting===false,'reject before probe/ticket/POST; local practice remains separate');
 for(const ctf of [false,true]){x=await fixture({ctf});await x.run('solo');result(ctf?'SOLO_CTF':'SOLO_ROUNDS',x.events.posts.length===1&&x.events.posts[0].mapId==='praca_poderes'&&x.events.posts[0].ctf===ctf&&x.ctx.tretaSoloStarting===false,'normal solo map and existing mode retained');}
 for(const ctf of [false,true]){x=await fixture({ctf});await x.run('form');result(ctf?'FORM_CTF':'FORM_ROUNDS',x.events.posts.length===1&&x.events.posts[0].mapas?.join()==='praca_poderes'&&x.events.posts[0].ctf===ctf&&x.events.posts[0].rotacao==='todos','same explicit ordinary map; no capture-only policy');}
 x=await fixture({selected:['invasao_javaporcos']});await x.run('form');result('FORM_STALE',x.events.tickets===0&&x.events.posts.length===0&&x.events.errors.length>0,'stale selection rejected before ticket');
 x=await fixture({selected:['invasao_javaporcos']});await x.ctx.mpCarregarMapasDoNo();const catalogClean=!x.ctx.mpMapasDoNo.some(id=>metadata.MAPS[id].objectiveMode==='horde')&&!x.ctx.mpMapasEscolhidos.has('invasao_javaporcos');await x.run('form');result('FORM_JAVA',catalogClean&&x.events.posts.length===0&&x.events.tickets===0,'PvP catalog and stale selectedSet both cleaned');
 x=await fixture();await x.run('friends');result('FRIENDS',x.events.posts.length===1&&x.events.posts[0].private===true&&x.events.posts[0].ctf===false,'invite flow preserved');
 x=await fixture();await x.run('quick');result('QUICK_PVP',x.events.joins[0]?.id==='pvp'&&x.events.posts.length===0,'horde+PvP chooses PvP');
 x=await fixture({rooms:[]});await x.run('quick');result('QUICK_CREATE',x.events.posts.length===1&&x.events.posts[0].ctf===false,'empty ordinary node creates existing normal room');
 x=await fixture({rooms:[{...java,private:true},{...pvp,livre:{E:0,B:0}}]});await x.run('quick');result('QUICK_FULL_PRIVATE',x.events.posts.length===1&&!x.events.joins.some(j=>['javaporcos','pvp'].includes(j.id)),'private/full rooms not joined');
 const menuCtx=vm.createContext({...metadata,oficina:false});vm.runInContext(fn('maps','mapasDoMenu'),menuCtx);const sp=vm.runInContext(ex('main','MAPAS_MENU'),menuCtx);menuCtx.oficina=true;const workshop=vm.runInContext(ex('main','MAPAS_MENU'),menuCtx);result('SP_JAVA',sp.includes('invasao_javaporcos')&&workshop.includes('distrito_rural'),'actual globalSP menu initializer unchanged incl oficina');
 x=await fixture();await x.ctx.mpAtualizarSalas();const row=x.el('mp-salas').children[0],defender=row?.actions?.children.find(b=>String(b.textContent).startsWith('DEFENDER A CIDADE'));if(defender)await defender.onclick();result('LIST_JAVA',x.events.joins.some(j=>j.id==='javaporcos'&&j.team==='E'),'existing official deliberate join');
 result('PAYLOAD_MODE',posts.length>=7&&posts.every(p=>p.mode===(p.ctf?'ctf':'rounds')),'explicit mode consistent with existing ctf at all four create callsites');
 x=await fixture({nodes:[denied[0],normal],rooms:[java,pvp]});await x.run('quick');result('NODE_QUICK',x.ctx.mpNoAtual.id==='normal'&&x.events.joins[0]?.id==='pvp'&&x.events.rankInputs.every(ns=>!ns.includes('dedicated')),'rank receives only eligible nodes');
 x=await fixture({nodes:[denied[0]],rooms:[]});await x.run('quick');result('NODE_NONE',x.events.tickets===0&&x.events.posts.length===0&&x.events.joins.length===0&&x.events.errors.length>0,'null eligible target never reverts to current node');
 for(const [kind,id]of [['form','NODE_FORM'],['friends','NODE_FRIENDS'],['solo','NODE_SOLO']]){let ok=true;for(const d of denied){x=await fixture({nodes:[d],rooms:[]});await x.run(kind);ok&&=x.events.tickets===0&&x.events.posts.length===0&&x.events.errors.length>0;}result(id,ok,'either nodeMode:horde OR roomCreation:false blocks before ticket');}
 for(const [node,id]of [[mixed,'NODE_MIXED'],[normal,'NODE_LEGACY']]){let ok=true;for(const name of Object.keys(units)){x=await fixture({nodes:[node],rooms:[]});await x.run(name);ok&&=x.events.posts.length===1;}result(id,ok,'all four create paths preserved, flags true');}
 x=await fixture({nodes:[{id:'near',ping:149,health:{players:1}},{id:'far',ping:151,health:{players:20}}],rooms:[pvp]});await x.run('quick');result('NODE_RANK',x.ctx.mpNoAtual.id==='near','same150ms company ceiling and existing ranking');
 need(rows.length===IDS.length&&rows.every((r,i)=>r.id===IDS[i]),'row census drift');return rows;
}
async function main(){
 const args=process.argv.slice(2),worker=args[0]?.startsWith('--internal-worker=');let packet;
 if(worker){if(args.length!==1||process.env[ENV]===undefined){console.error('Internal worker requires parent packet');process.exitCode=2;return;}try{packet=JSON.parse(process.env[ENV]||'');}catch{throw Error('invalid worker packet');}need(args.length===1&&packet.nonce===args[0].slice(18)&&packet.parent===process.ppid&&Object.hasOwn(packet,'variant')&&(packet.variant===''||Object.hasOwn(MUTANTS,packet.variant)),'worker identity');}
 else if(process.env[ENV]!==undefined||args.length>1||(args.length&&args[0]!=='--mutantes'&&!/^--mutante=/.test(args[0]))){console.error('Uso: javaporcos-client-room-check.mjs [--mutantes|--mutante=nome]');process.exitCode=2;return;}
 const selected=args[0]?.startsWith('--mutante=')?args[0].slice(10):null;
 if(!worker&&selected!==null&&!Object.hasOwn(MUTANTS,selected)){console.error('Mutante desconhecido');process.exitCode=2;return;}
 const {parse}=await import('acorn');const source=Object.fromEntries(Object.entries(FILES).map(([k,p])=>[k,readFileSync(new URL(p,ROOT),'utf8')]));
 const inputs=Object.fromEntries(Object.entries(source).map(([k,s])=>[FILES[k],sha(s)]));inputs['checker']=sha(readFileSync(SELF));
 if(worker){need(JSON.stringify(packet.inputs)===JSON.stringify(inputs),'worker source drift');let active=source,application=null;if(packet.variant){const changed=mutate(source,packet.variant,parse);active=changed.source;application=changed.application;}const rows=await evaluate(active,parse),failset=rows.filter(r=>r.status==='FAIL').map(r=>r.id);console.log(JSON.stringify({schema:SCHEMA,role:'worker',nonce:packet.nonce,variant:packet.variant,inputs,denominator:IDS.length,rows,failset,application}));process.exitCode=failset.length?1:0;return;}
 const run=variant=>{
  const expectedApplication=variant?mutate(source,variant,parse).application:null;
  const nonce=randomUUID(),p={nonce,variant,inputs,parent:process.pid},child=spawnSync(process.execPath,[SELF,'--internal-worker='+nonce],{cwd:fileURLToPath(ROOT),env:{...process.env,[ENV]:JSON.stringify(p)},encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
  need(!child.error&&!child.signal&&child.stderr===''&&[0,1].includes(child.status),'child process/INFRA: '+String(child.error?.message||child.stderr||('exit'+child.status)).slice(0,180));let r;try{r=JSON.parse(child.stdout);}catch{throw Error('child JSON');}
  need(r.schema===SCHEMA&&r.role==='worker'&&r.nonce===nonce&&r.variant===variant&&JSON.stringify(r.inputs)===JSON.stringify(inputs)&&r.denominator===IDS.length,'child identity');
  need(Array.isArray(r.rows)&&r.rows.length===IDS.length&&r.rows.every((x,i)=>x.id===IDS[i]&&['PASS','FAIL'].includes(x.status)),'child rows');
  const failset=r.rows.filter(x=>x.status==='FAIL').map(x=>x.id);need(JSON.stringify(r.failset)===JSON.stringify(failset)&&child.status===(failset.length?1:0),'child exit/failset');
  if(variant)need(JSON.stringify(r.application)===JSON.stringify(expectedApplication),'mutation application');return r;
 };
 const nominal=run(''),wanted=selected!==null?[selected]:args[0]==='--mutantes'?Object.keys(MUTANTS):[],controls=[];
 const rebind=()=>{const after=Object.fromEntries(Object.entries(FILES).map(([k,p])=>[p,sha(readFileSync(new URL(p,ROOT)))]));after.checker=sha(readFileSync(SELF));need(JSON.stringify(inputs)===JSON.stringify(after),'parent source drift');};
 if(nominal.failset.length){rebind();console.log(JSON.stringify({schema:SCHEMA,role:'parent',status:'RED',inputs,denominator:IDS.length,nominal,controls:wanted.map(variant=>({variant,status:'UNRUN_NOMINAL_RED'}))},null,2));process.exitCode=1;return;}
 for(const variant of wanted){const r=run(variant),expected=IDS.filter(id=>MUTANTS[variant].includes(id));need(JSON.stringify(r.failset)===JSON.stringify(expected),'mutant exact failset '+variant);controls.push(r);}
 rebind();
 console.log(JSON.stringify({schema:SCHEMA,role:'parent',status:'PASS',inputs,denominator:IDS.length,nominal,controls},null,2));
}
try{await main();}catch(error){console.error('INFRA room-check: '+String(error?.message||error).slice(0,250));process.exitCode=3;}
