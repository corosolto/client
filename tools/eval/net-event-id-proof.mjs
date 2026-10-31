import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./net-event-id-check.mjs',import.meta.url));
const reportOf=result=>{try{return JSON.parse(result.stdout.split('\n').findLast(line=>line.startsWith('{')));}catch{return null;}};
const proof=(result,name,clause)=>{
 const report=reportOf(result);
 return result.status===1 && !result.error && !result.signal
  && result.stdout.split(/\r?\n/).includes('Mutação aplicada: '+name)
  && report?.mutant===name && report.cases===8 && report.failed.length>0
  && report.failed.every(row=>row.type==='AssertionError') && report.failed.some(row=>row.clause===clause)
  && !/TypeError:|ReferenceError:|SyntaxError:/.test(result.stdout+result.stderr);
};
const name='signed-id',clause='uint32 attacker reaches real hit feedback';
const good={status:1,stdout:'Mutação aplicada: '+name+'\n'+JSON.stringify({mutant:name,cases:8,failed:[{clause,type:'AssertionError'}]}),stderr:''};
assert(proof(good,name,clause));
for(const bad of [{...good,status:0},{...good,status:2},{...good,status:78},{...good,signal:'SIGTERM'},
 {...good,error:new Error('setup')},{...good,stdout:good.stdout.replace('Mutação aplicada: ','Sem aplicação: ')},
 {...good,stdout:good.stdout.replace('"mutant":"signed-id"','"mutant":"outro"')},
 {...good,stdout:good.stdout.replace(clause,'outra cláusula')},
 {...good,stdout:good.stdout.replace('AssertionError','TypeError')},
 {...good,stdout:good.stdout.replace('"cases":8','"cases":7')},
 {...good,stdout:'Mutação aplicada: '+name+'\n'+JSON.stringify({mutant:name,cases:8,failed:[]})},
 {...good,stderr:'SyntaxError: setup'},
])assert(!proof(bad,name,clause));
const run=args=>spawnSync(process.execPath,[script,...args],{encoding:'utf8',timeout:10000,maxBuffer:1000000});
const baseline=run([]),report=reportOf(baseline);
assert(baseline.status===0 && !baseline.error && !baseline.signal && report?.mutant===null && report.cases===8 && report.failed.length===0,
 'event-ID baseline invalid: '+JSON.stringify({status:baseline.status,error:baseline.error?.code,failed:report?.failed}));
for(const [mutant,expected] of [[name,clause],
 ['invalid-alias','invalid IDs never alias entity zero or valid local victim'],
 ['signed-attacker',clause],['signed-victim','uint32 kill reaches feed and actual remote death feedback'],
 ['signed-hit','uint32 local victim receives real hit feedback'],
 ['signed-nade','uint32 grenade owner reaches spawn and explosion'],
 ['signed-boom','uint32 grenade owner reaches spawn and explosion']]){
 const result=run(['--mutante='+mutant]);
 assert(proof(result,mutant,expected),'event-ID mutant lacks semantic evidence: '+JSON.stringify({mutant,status:result.status,error:result.error?.code,failed:reportOf(result)?.failed}));
 console.log('event-ID: applied and detected '+mutant);
}
console.log('event-ID: eight clauses, seven semantic mutants, twelve false positives rejected');
