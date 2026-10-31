// Executa a decisão real: falha alheia, crash e mutação ausente não são detecção.
import assert from 'node:assert/strict';
import { readFileSync, writeSync } from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const mutations={
 "referencia-ignorada":["cand.causa === 'assets' && ref.causa === 'assets'", "cand.causa === 'assets'", "referência failsafe recusa boot"],
 "qualquer-falha":["mutacaoAplicada && !erros.length && !falhas.includes('READY') && falhas.includes(exigida)", "falhas.length > 0", "cartaz exige ORC2"],
 "sem-aplicacao":["mutacaoAplicada && !erros.length && !falhas.includes('READY') && falhas.includes(exigida)", "!erros.length && !falhas.includes('READY') && falhas.includes(exigida)", "transformação ausente não prova mutante"],
 "pageerror-aceito":["mutacaoAplicada && !erros.length && !falhas.includes('READY') && falhas.includes(exigida)", "mutacaoAplicada && !falhas.includes('READY') && falhas.includes(exigida)", "erro de página não prova mutante"],
 "ready-ignorado":["mutacaoAplicada && !erros.length && !falhas.includes('READY') && falhas.includes(exigida)", "mutacaoAplicada && !erros.length && falhas.includes(exigida)", "READY inválido recusa cartaz"],
};

const argv = process.argv.slice(2);
const mutation = argv.length === 1 && argv[0].startsWith('--mutante=') ? argv[0].slice(10) : '';
const driver = argv.length === 1 && argv[0] === '--mutantes';
if (argv.length && !driver && !(argv.length === 1 && Object.hasOwn(mutations, mutation))) {
 console.error('uso: boot-mutant-verdict-check [--mutantes|--mutante=nome]'); process.exit(2);
}
if(driver){
 const run=args=>spawnSync(process.execPath,[fileURLToPath(import.meta.url),...args],{encoding:'utf8',timeout:30000,maxBuffer:2000000});
 const baseline=run([]);assert(baseline.status===0&&!baseline.error&&!baseline.signal,'baseline válido');
 for(const [name,[,,clause]] of Object.entries(mutations)){
  const result=run(['--mutante='+name]),output=result.stdout+result.stderr;
  assert(result.status===1&&!result.error&&!result.signal&&output.split('Mutação aplicada: '+name).length===2
   &&output.includes('✗ '+clause+': AssertionError:')&&!/TypeError:|ReferenceError:|SyntaxError:/.test(output),'mutante exige prova semântica: '+name);
  console.log('✓ veredicto: '+name+' aplicado e detectado');
 }
 process.exit(0);
}
let source=readFileSync(new URL('./boot-orcamento-check.mjs', import.meta.url),'utf8');
if(mutation){
 assert(Object.hasOwn(mutations,mutation),'mutante conhecido');
 const [before,after]=mutations[mutation];assert.equal(source.split(before).length,2,'mutação única na fonte real');
 source=source.replace(before,after);writeSync(2, 'Mutação aplicada: '+mutation+'\n');
}
const begin=source.indexOf('  if (MUTANTE) {\n'), end=source.indexOf('\n} catch (e)',begin);
assert(begin>=0&&end>begin,'fronteira real do veredicto');
const helpersBegin=source.indexOf('const ANSIOSO = '), helpersEnd=source.indexOf('\nlet mutacaoAplicada =',helpersBegin);
assert(helpersBegin>=0&&helpersEnd>helpersBegin,'fronteira real dos transformadores');
const helperSource = source.slice(helpersBegin,helpersEnd);
const helpers=vm.runInNewContext(helperSource+'\n({FAUNA_ADIADA,ANSIOSO})', {}, {timeout:1000});
for (const name of ['poolAnsioso','faunaCedo']) helpers[name] = body => vm.runInNewContext(helperSource+`\n${name}(__body)`, {__body:body}, {timeout:1000});
const textures=readFileSync(new URL('../../public/js/textures.js',import.meta.url),'utf8');
const main=readFileSync(new URL('../../public/js/main.js',import.meta.url),'utf8');
let failures=0;
const ready = [...source.matchAll(/READY: ([^,\n]+),/g)];
assert.equal(ready.length,1,'expressão READY real única');
for (const [name,cand,ref,expected] of [
 ['ambos assets liberam boot','assets','assets',true],
 ['candidato failsafe recusa boot','failsafe','assets',false],
 ['referência failsafe recusa boot','assets','failsafe',false],
 ['referência ausente recusa boot','assets',null,false],
]) {
 const actual=vm.runInNewContext(ready[0][1],{cand:{causa:cand},ref:{causa:ref}},{timeout:1000});
 try {assert.equal(actual,expected);console.log('✓ '+name);} catch(e) {failures++;console.error('✗ '+name+': '+e.name+': saída '+actual+' deveria ser '+expected);}
}
for(const [name,task] of [
 ['cartaz transforma fonte real',()=>assert.notEqual(helpers.poolAnsioso(textures),textures)],
 ['fauna transforma fonte real',()=>assert.notEqual(helpers.faunaCedo(main),main)],
 ['cartaz rejeita âncora ausente',()=>assert.throws(()=>helpers.poolAnsioso(textures.replace(helpers.ANSIOSO,'')))],
 ['cartaz rejeita âncora duplicada',()=>assert.throws(()=>helpers.poolAnsioso(textures+'\n'+textures))],
 ['cartaz rejeita reaplicação',()=>assert.throws(()=>helpers.poolAnsioso(helpers.poolAnsioso(textures)))],
 ['fauna rejeita chamada ausente',()=>assert.throws(()=>helpers.faunaCedo(main.replace(helpers.FAUNA_ADIADA,'')))],
 ['fauna rejeita chamada duplicada',()=>assert.throws(()=>helpers.faunaCedo(main+'\n'+helpers.FAUNA_ADIADA))],
 ['fauna rejeita retorno ausente',()=>assert.throws(()=>helpers.faunaCedo(main.replace('    return propsReady.then(() => {','')))],
 ['fauna rejeita retorno duplicado',()=>assert.throws(()=>helpers.faunaCedo(main+'\n    return propsReady.then(() => {'))],
 ['fauna rejeita reaplicação',()=>assert.throws(()=>helpers.faunaCedo(helpers.faunaCedo(main)))],
]){
 try{task();console.log('✓ '+name);}catch(e){failures++;console.error('✗ '+name+': '+e.name+': '+e.message.split('\n')[0]);}
}
for(const [name,MUTANTE,falhas,erros,mutacaoAplicada,expected] of [
 ['cartaz exige ORC2','cartaz-ansioso',['ORC1'],[],true,1],
 ['fauna exige ORC3','fauna-cedo',['ORC1'],[],true,1],
 ['erro de página não prova mutante','fauna-cedo',['ORC3','pageerror'],['crash'],true,1],
 ['transformação ausente não prova mutante','cartaz-ansioso',['ORC2'],[],false,1],
 ['controle cartaz','cartaz-ansioso',['ORC2'],[],true,0],
 ['controle fauna','fauna-cedo',['ORC3'],[],true,0],
 ['ORC1 pode acompanhar a falha esperada','cartaz-ansioso',['ORC1','ORC2'],[],true,0],
 ['READY inválido recusa cartaz','cartaz-ansioso',['READY','ORC2'],[],true,1],
 ['READY inválido recusa fauna','fauna-cedo',['READY','ORC3'],[],true,1],
 ['baseline verde','',[],[],false,0],
 ['baseline erro','',['pageerror'],['crash'],false,1],
]){
 const context={MUTANTE,falhas,erros,mutacaoAplicada,saida:1,console:{log(){},error(){}}};
 vm.runInNewContext(source.slice(begin,end),context,{timeout:1000});
 try{assert.equal(context.saida,expected);console.log('✓ '+name);}catch(e){failures++;console.error('✗ '+name+': '+e.name+': saída '+context.saida+' deveria ser '+expected);}
}
if(failures)process.exitCode=1;
