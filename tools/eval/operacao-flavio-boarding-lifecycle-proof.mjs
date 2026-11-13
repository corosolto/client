import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script=fileURLToPath(new URL('./operacao-flavio-boarding-lifecycle-check.mjs',import.meta.url));
const run=args=>spawnSync(process.execPath,[script,...args],{encoding:'utf8',timeout:30000,maxBuffer:1000000});
const reportOf=result=>{try{return JSON.parse(result.stdout.split('\n').findLast(line=>line.startsWith('{')));}catch{return null;}};
const proof=(result,name,clause)=>{
 const report=reportOf(result);
 return result.status===1 && !result.signal && !result.error
  && result.stdout.split(/\r?\n/).includes('Mutação aplicada: '+name)
  && report?.mutant===name && report.cases===23 && report.failed.length>0
  && report.failed.every(row=>row.type==='AssertionError') && report.failed.some(row=>row.clause===clause)
  && !/TypeError:|ReferenceError:|SyntaxError:/.test(result.stdout+result.stderr);
};
const name='sem-stop',clause='reset cancels active';
const good={status:1,stdout:'Mutação aplicada: '+name+'\n'+JSON.stringify({mutant:name,cases:23,failed:[{clause,type:'AssertionError'}]}),stderr:''};
assert(proof(good,name,clause));
for(const bad of [{...good,status:0},{...good,status:2},{...good,signal:'SIGTERM'},{...good,error:new Error('setup')},
 {...good,stdout:good.stdout.replace('Mutação aplicada: ','Sem aplicação: ')},
 {...good,stdout:good.stdout.replace('AssertionError','TypeError')},
 {...good,stdout:good.stdout.replace(clause,'outra cláusula')},
 {...good,stdout:good.stdout.replace('"cases":23','"cases":22')}])assert(!proof(bad,name,clause));
const baseline=run([]),report=reportOf(baseline);
assert(baseline.status===0 && !baseline.error && !baseline.signal && report?.mutant===null && report.cases===23 && report.failed.length===0,
 'baseline real do modo inválido: '+(baseline.stdout+baseline.stderr).slice(-1800));
for(const [mutant,expected] of [
 ['sem-stop','reset cancels active'],
 ['sem-predicado','expiry without presentation tick cannot create late actor'],
 ['reinicia-tempo','late ready resumes elapsed and effective appearance without changing authority'],
 ['import-antigo','reset cancels import'],
 ['sem-dispose','dispose cancels assets'],
]){
 const result=run(['--mutante='+mutant]);
 assert(proof(result,mutant,expected),'mutante sem prova semântica: '+mutant+'\n'+(result.stdout+result.stderr).slice(-1800));
 console.log('boarding-lifecycle: aplicado e detectado '+mutant);
}
console.log('boarding-lifecycle: 23cenários verdes, cinco mutantes semânticos, oito falsos positivos recusados');
