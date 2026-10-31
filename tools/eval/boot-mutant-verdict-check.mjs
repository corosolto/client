// Executa a decisão real: falha alheia, crash e mutação ausente não são detecção.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const mutations={
 'qualquer-falha':['mutacaoAplicada && !erros.length && falhas.includes(exigida)','falhas.length > 0','cartaz exige ORC2'],
 'sem-aplicacao':['mutacaoAplicada && !erros.length && falhas.includes(exigida)','!erros.length && falhas.includes(exigida)','transformação ausente não prova mutante'],
 'pageerror-aceito':['mutacaoAplicada && !erros.length && falhas.includes(exigida)','mutacaoAplicada && falhas.includes(exigida)','erro de página não prova mutante'],
};
if(process.argv.includes('--mutantes')){
 const run=args=>spawnSync(process.execPath,[fileURLToPath(import.meta.url),...args],{encoding:'utf8',timeout:30000,maxBuffer:2000000});
 const baseline=run([]);assert(baseline.status===0&&!baseline.error&&!baseline.signal,'baseline válido');
 for(const [name,[,,clause]] of Object.entries(mutations)){
  const result=run(['--mutante='+name]),output=result.stdout+result.stderr;
  assert(result.status===1&&!result.error&&!result.signal&&output.includes('Mutação aplicada: '+name)
   &&output.includes('✗ '+clause+': AssertionError:')&&!/TypeError:|ReferenceError:|SyntaxError:/.test(output),'mutante exige prova semântica: '+name);
  console.log('✓ veredicto: '+name+' aplicado e detectado');
 }
 process.exit(0);
}
let source=readFileSync(new URL('./boot-orcamento-check.mjs', import.meta.url),'utf8');
const mutation=process.argv.find(arg=>arg.startsWith('--mutante='))?.slice(10);
if(mutation){
 assert(Object.hasOwn(mutations,mutation),'mutante conhecido');
 const [before,after]=mutations[mutation];assert.equal(source.split(before).length,2,'mutação única na fonte real');
 source=source.replace(before,after);console.log('Mutação aplicada: '+mutation);
}
const begin=source.indexOf('  if (MUTANTE) {\n'), end=source.indexOf('\n} catch (e)',begin);
assert(begin>=0&&end>begin,'fronteira real do veredicto');
const helpersBegin=source.indexOf('const ANSIOSO = '), helpersEnd=source.indexOf('\nlet mutacaoAplicada =',helpersBegin);
assert(helpersBegin>=0&&helpersEnd>helpersBegin,'fronteira real dos transformadores');
const helpers=vm.runInNewContext(source.slice(helpersBegin,helpersEnd)+'\n({poolAnsioso,faunaCedo,FAUNA_ADIADA,ANSIOSO})');
const textures=readFileSync(new URL('../../public/js/textures.js',import.meta.url),'utf8');
const main=readFileSync(new URL('../../public/js/main.js',import.meta.url),'utf8');
let failures=0;
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
 ['baseline verde','',[],[],false,0],
 ['baseline erro','',['pageerror'],['crash'],false,1],
]){
 const context={MUTANTE,falhas,erros,mutacaoAplicada,saida:1,console:{log(){},error(){}}};
 vm.runInNewContext(source.slice(begin,end),context);
 try{assert.equal(context.saida,expected);console.log('✓ '+name);}catch(e){failures++;console.error('✗ '+name+': '+e.name+': saída '+context.saida+' deveria ser '+expected);}
}
if(failures)process.exitCode=1;
