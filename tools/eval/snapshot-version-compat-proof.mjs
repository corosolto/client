import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./snapshot-version-compat-check.mjs',import.meta.url));
const reportOf=result=>{try{return JSON.parse(result.stdout.split('\n').findLast(line=>line.startsWith('{')));}catch{return null;}};
const proof=(result,name,clause)=>{
 const report=reportOf(result);
 return result.status===1 && !result.error && !result.signal
  && result.stdout.split(/\r?\n/).includes('Mutação aplicada: '+name)
  && report?.mutant===name && report.cases===11 && report.failed.length>0
  && report.failed.every(row=>row.type==='AssertionError') && report.failed.some(row=>row.clause===clause)
  && !/TypeError:|ReferenceError:|SyntaxError:/.test(result.stdout+result.stderr);
};
const name='objective-no-v7',clause='published v7 preserves exact bytes and cross-codec decoding';
const good={status:1,stdout:'Mutação aplicada: '+name+'\n'+JSON.stringify({mutant:name,cases:11,failed:[{clause,type:'AssertionError'}]}),stderr:''};
assert(proof(good,name,clause));
for(const bad of [{...good,status:0},{...good,status:2},{...good,status:78},{...good,signal:'SIGTERM'},
 {...good,error:new Error('setup')},{...good,stdout:good.stdout.replace('Mutação aplicada: ','Sem aplicação: ')},
 {...good,stdout:good.stdout.replace('"mutant":"objective-no-v7"','"mutant":"outro"')},
 {...good,stdout:good.stdout.replace(clause,'outra cláusula')},
 {...good,stdout:good.stdout.replace('AssertionError','TypeError')},
 {...good,stdout:good.stdout.replace('"cases":11','"cases":10')},
 {...good,stdout:'Mutação aplicada: '+name+'\n'+JSON.stringify({mutant:name,cases:11,failed:[]})},
 {...good,stderr:'SyntaxError: setup'},
])assert(!proof(bad,name,clause));
const run=args=>spawnSync(process.execPath,[script,...args],{encoding:'utf8',timeout:10000,maxBuffer:1000000});
const baseline=run([]),report=reportOf(baseline);
assert(baseline.status===0 && !baseline.error && !baseline.signal && report?.mutant===null && report.cases===11 && report.failed.length===0,
 'cross-codec baseline invalid: '+JSON.stringify({status:baseline.status,error:baseline.error?.code,failed:report?.failed}));
for(const [mutant,expected] of [[name,clause],['sem-mantle',clause],['namespace-antigo','objective extension has a distinct preferred v8 namespace'],
 ['limite-v7','published v7 keeps its original team and entity limits'],['time-j-v7','published v7 keeps its original team and entity limits']]){
 const result=run(['--mutante='+mutant]);
 assert(proof(result,mutant,expected),'version mutant lacks semantic evidence: '+JSON.stringify({mutant,status:result.status,error:result.error?.code,failed:reportOf(result)?.failed}));
 console.log('version-compat: applied and detected '+mutant);
}
console.log('version-compat: eleven clauses, five semantic mutants, twelve false positives rejected');
