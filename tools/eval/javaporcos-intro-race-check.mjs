import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync('public/js/main.js','utf8');const a=source.indexOf('  if (sessao) await preloadMapProps(mapaPartida.props || [], { required: true });');const b=source.indexOf('  /* RÉGUA:launch-race nascimento',a);
assert.ok(a >= 0 && b > a, 'trecho de entrada não encontrado');
let code=source.slice(a,b);const mutant=process.argv.includes('--mutante');
if(mutant)code=code.replace('  if (introAbort.signal.aborted || lancamentoPerdeu(meuLancamento)) return;','');
let release,generation=1;const events=[],old=new AbortController();const c=vm.createContext({sessao:{},mapaPartida:{},introAbort:old,window:{__javaporcosIntroAbort:old,__gameLaunch:{ready:()=>events.push('ready')}},preloadMapProps:()=>new Promise(r=>release=r),lancamentoPerdeu:n=>generation!==n,meuLancamento:1,currentMap:'invasao_javaporcos',ehMapaJavaporcos:id=>id==='invasao_javaporcos',continuaPartida:false,testMode:false,params:new URLSearchParams(),hideLoading:()=>events.push('hide'),apresentarJavaporcos:async()=>events.push('intro')});
const run=vm.runInContext(`(async()=>{${code}})()`,c);generation=2;old.abort();c.window.__javaporcosIntroAbort=new AbortController();release();await run;
if(mutant)assert.deepEqual(events,['ready','hide','intro'],'mutante não exerceu a entrada antiga');
let failed=false;try{assert.deepEqual(events,[]);console.log('✓ INTRO corrida: preload antigo não toca watchdog/loading/intro novos');}catch(e){failed=true;console.log('✗ INTRO corrida: '+JSON.stringify(events));}
process.exitCode=mutant?(failed?0:1):(failed?1:0);
