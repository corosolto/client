import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./mantle-lifecycle-check.mjs',import.meta.url));
const reportOf=result=>{try{return JSON.parse(result.stdout.split('\n').findLast(line=>line.startsWith('{')));}catch{return null;}};
const proof=(result,name,clause)=>{
 const report=reportOf(result);
 return result.status===1 && !result.error && !result.signal
  && result.stdout.split(/\r?\n/).includes('Mutação aplicada: '+name)
  && report?.mutant===name && report.cases===6 && report.failed.length>0
  && report.failed.every(row=>row.type==='AssertionError') && report.failed.some(row=>row.clause===clause)
  && !/TypeError:|ReferenceError:|SyntaxError:/.test(result.stdout+result.stderr);
};
const name='sem-reset',clause='reset limpa trajetória e buffers remote';
const good={status:1,stdout:'Mutação aplicada: '+name+'\n'+JSON.stringify({mutant:name,cases:6,failed:[{clause,type:'AssertionError'}]}),stderr:''};
assert(proof(good,name,clause));
for(const bad of [{...good,status:0},{...good,status:2},{...good,status:78},{...good,signal:'SIGTERM'},
 {...good,error:new Error('setup')},{...good,stdout:good.stdout.replace('Mutação aplicada: ','Sem aplicação: ')},
 {...good,stdout:good.stdout.replace('"mutant":"sem-reset"','"mutant":"outro"')},
 {...good,stdout:good.stdout.replace(clause,'outra cláusula')},
 {...good,stdout:good.stdout.replace('AssertionError','TypeError')},
 {...good,stdout:good.stdout.replace('"cases":6','"cases":5')},
 {...good,stdout:'Mutação aplicada: '+name+'\n'+JSON.stringify({mutant:name,cases:6,failed:[]})},
 {...good,stderr:'SyntaxError: setup'},
])assert(!proof(bad,name,clause));
for(const [novo,clausula] of [['sem-clear-jogador','troca de lado limpa trajetória e mantém o spawn do jogador'],['sem-clear-bot','troca de lado limpa trajetória e mantém o spawn do bot desertor']]){
 const ok={status:1,stdout:'Mutação aplicada: '+novo+'\n'+JSON.stringify({mutant:novo,cases:6,failed:[{clause:clausula,type:'AssertionError'}]}),stderr:''};
 assert(proof(ok,novo,clausula));
 assert(!proof({...ok,stdout:ok.stdout.replace('"mutant":"'+novo+'"','"mutant":"sem-reset"')},novo,clausula),'mutante errado não conta');
 assert(!proof({...ok,stdout:ok.stdout.replace(clausula,'reset limpa trajetória e buffers remote')},novo,clausula),'cláusula errada não conta');
}
const run=args=>spawnSync(process.execPath,[script,...args],{encoding:'utf8',timeout:180000,maxBuffer:1000000});
const baseline=run([]),report=reportOf(baseline);
assert(baseline.status===0 && !baseline.error && !baseline.signal && report?.mutant===null && report.cases===6 && report.failed.length===0,
 'mantle-lifecycle baseline invalid: '+JSON.stringify({status:baseline.status,error:baseline.error?.code,failed:report?.failed}));
for(const [mutant,expected] of [[name,clause],['sem-buffers',clause],['sem-ar','consumidor remoto entra no ar e pousa antes do update'],['ar-no-repouso','consumidor remoto entra no ar e pousa antes do update'],['sem-precalculo','cache territorial pronto antes da primeira consulta'],['sem-clear-jogador','troca de lado limpa trajetória e mantém o spawn do jogador'],['sem-clear-bot','troca de lado limpa trajetória e mantém o spawn do bot desertor']]){
 const result=run(['--mutante='+mutant]);
 assert(proof(result,mutant,expected),'mantle mutant lacks semantic evidence: '+JSON.stringify({mutant,status:result.status,error:result.error?.code,failed:reportOf(result)?.failed}));
 console.log('mantle-lifecycle: applied and detected '+mutant);
}
console.log('mantle-lifecycle: six clauses, seven semantic mutants, sixteen false positives rejected');
