import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./operacao-flavio-team-check.mjs',import.meta.url));
const reportOf=result=>{try{return JSON.parse(result.stdout.split('\n').findLast(line=>line.startsWith('{')));}catch{return null;}};
const proof=(result,name,clause)=>{
 const report=reportOf(result);
 return result.status===1 && !result.error && !result.signal
  && result.stdout.split(/\r?\n/).includes('Mutação aplicada: '+name)
  && report?.mutant===name && report.cases===5 && report.failed.length>0
  && report.failed.every(row=>row.type==='AssertionError') && report.failed.some(row=>row.clause===clause)
  && !/TypeError:|ReferenceError:|SyntaxError:/.test(result.stdout+result.stderr);
};
const name='sem-reserva',clause='troca offline preserva identidade lado e personagem do VIP';
const good={status:1,stdout:'Mutação aplicada: '+name+'\n'+JSON.stringify({mutant:name,cases:5,failed:[{clause,type:'AssertionError'}]}),stderr:''};
assert(proof(good,name,clause));
for(const bad of [{...good,status:0},{...good,status:2},{...good,status:78},{...good,signal:'SIGTERM'},
 {...good,error:new Error('setup')},{...good,stdout:good.stdout.replace('Mutação aplicada: ','Sem aplicação: ')},
 {...good,stdout:good.stdout.replace('"mutant":"sem-reserva"','"mutant":"outro"')},
 {...good,stdout:good.stdout.replace(clause,'outra cláusula')},
 {...good,stdout:good.stdout.replace('AssertionError','TypeError')},
 {...good,stdout:good.stdout.replace('"cases":5','"cases":4')},
 {...good,stdout:'Mutação aplicada: '+name+'\n'+JSON.stringify({mutant:name,cases:5,failed:[]})},
 {...good,stderr:'SyntaxError: setup'},
])assert(!proof(bad,name,clause));
const run=args=>spawnSync(process.execPath,[script,...args],{encoding:'utf8',timeout:10000,maxBuffer:1000000});
const baseline=run([]),report=reportOf(baseline);
assert(baseline.status===0 && !baseline.error && !baseline.signal && report?.mutant===null && report.cases===5 && report.failed.length===0,
 'team-switch baseline invalid: '+JSON.stringify({status:baseline.status,error:baseline.error?.code,failed:report?.failed}));
for(const [mutant,expected] of [[name,clause],['apenas-boolean',clause],['sem-rebalancear','mapa comum continua rebalanceando um combatente elegível']]){
 const result=run(['--mutante='+mutant]);
 assert(proof(result,mutant,expected),'team mutant lacks semantic evidence: '+JSON.stringify({mutant,status:result.status,error:result.error?.code,failed:reportOf(result)?.failed}));
 console.log('team-switch: applied and detected '+mutant);
}
console.log('team-switch: five clauses, three semantic mutants, twelve false positives rejected');
