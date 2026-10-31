import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

// Change only the presentation module in a fresh child; never edit the checkout.
const root=process.cwd(),moduleFile=path.join(root,'public/js/flavio-boarding.js');
const source=fs.readFileSync(moduleFile,'utf8');
const checker=fs.readFileSync(new URL('./operacao-flavio-boarding-assets-check.mjs',import.meta.url),'utf8');
const mutations=[
  ['sem-ik','for(let i=0;i<session.feet.length;i++)this._solveFoot(session.feet[i],targets[i]);','',
    'weighted soles avoid tread penetration and keep a planted foot'],
  ['apoio-alto','return height+.003;','return height+.12;',
    'weighted soles avoid tread penetration and keep a planted foot'],
  ['taxi-cedo','const WALK_END=5.4, DOOR_END=6.8;','const WALK_END=5.4, DOOR_END=3.15;',
    'walk enters cabin before door moves or taxi starts'],
  ['sem-restaurar','for(const [object,visible] of session.hidden)object.visible=visible;','',
    'stop restores remounted VIP and disposes only actor resources once'],
  ['sem-recursos-ator','releaseOwned(session.owned);','session.owned.clear();',
    'stop restores remounted VIP and disposes only actor resources once'],
  ['sem-recursos-estagio','this.stage?.removeFromParent();release(this.resources);','this.stage?.removeFromParent();',
    'final disposal releases unique stage resources exactly once'],
  ['ator-invisivel','actor.group.visible=close<1;','actor.group.visible=false;',
    'actor stays effectively visible throughout the walk'],
  ['excursao-do-piso','this.plane.position.z=taxi;','this.plane.position.z=(elapsed>0 && elapsed<WALK_END)?1:taxi;',
    'walk surfaces plane and door stay static before each contact query'],
  ['corpo-fora','steps.push({x:.35,y:top.y+.003},{x:.35,y:top.y+.003});','steps.push({x:1.3,y:top.y+.003},{x:1.3,y:top.y+.003});',
    'entire visible body clears the closing door into cabin'],
  ['sem-predicado-pronto',' || !isCurrent()','',
    'stale predicate before ready never allocates actor or hides originals'],
  ['refresh-por-vertice','bounds.expandByPoint(mesh.getVertexPosition(index,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));','mesh.skeleton.update();bounds.expandByPoint(mesh.getVertexPosition(index,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));',
    'pose queries avoid skeleton refresh per sampled vertex'],
  ['sem-recheck-preparo','if(!isCurrent()){this._rollback(session);return false;}','',
    'deadline expiring during real pose preparation restores presentation immediately'],
];
const absoluteImports=(text,from)=>text.replace(/from\s+(['"])([^'"]+)\1/g,(_,quote,spec)=>{
  const target=spec==='three'?pathToFileURL(path.join(root,'public/vendor/three.module.js')).href
    :spec.startsWith('three/addons/')?pathToFileURL(path.join(root,'public/vendor/addons',spec.slice(13))).href
    :spec.startsWith('.')?new URL(spec,from).href:spec;
  return 'from '+JSON.stringify(target);
});
function run(mutation){
  let candidate=source;
  if(mutation){
    const [name,before,after]=mutation;
    assert.equal(source.split(before).length-1,1,'unique applied target: '+name);
    candidate=source.replace(before,after);
  }
  const url='data:text/javascript;base64,'+Buffer.from(absoluteImports(candidate,pathToFileURL(moduleFile))).toString('base64');
  let worker=checker;
  for(const spec of ['./harness.mjs','../../public/js/glbchars.js']){
    const target=new URL(spec,new URL('./operacao-flavio-boarding-assets-check.mjs',import.meta.url));
    assert.equal(worker.split("'"+spec+"'").length-1,1,'unique checker import');
    worker=worker.replace("'"+spec+"'",JSON.stringify(target.href));
  }
  const boundary="const {FlavioBoarding}=await import('../../public/js/flavio-boarding.js');";
  assert.equal(worker.split(boundary).length-1,1,'actual presentation import boundary');
  worker=worker.replace(boundary,'const {FlavioBoarding}=await import('+JSON.stringify(url)+');\n'
    +(mutation?'console.log('+JSON.stringify('Mutação aplicada: '+mutation[0])+');':''));
  return spawnSync(process.execPath,['--input-type=module','--eval',worker],{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:3000000});
}
const reportOf=result=>{try{return JSON.parse(result.stdout.split('\n').findLast(line=>line.startsWith('{')));}catch{return null;}};
const proof=(result,name,clause)=>{
  const report=reportOf(result);
  return result.status===1 && !result.error && !result.signal
    && result.stdout.split(/\r?\n/).includes('Mutação aplicada: '+name)
    && report?.cases===24 && report.failed.length>0
    && report.failed.every(row=>row.type==='AssertionError')
    && report.failed.some(row=>row.clause===clause)
    && !/TypeError:|ReferenceError:|SyntaxError:/.test(result.stdout+result.stderr);
};
const name='sem-ik',clause=mutations[0][3];
const good={status:1,stdout:'Mutação aplicada: '+name+'\n'+JSON.stringify({cases:24,failed:[{clause,type:'AssertionError'}]}),stderr:''};
assert(proof(good,name,clause));
for(const bad of [{...good,status:0},{...good,status:2},{...good,signal:'SIGTERM'},{...good,error:new Error('setup')},
  {...good,stdout:good.stdout.replace('Mutação aplicada: ','Sem aplicação: ')},
  {...good,stdout:good.stdout.replace(name,'outro-mutante')},
  {...good,stdout:good.stdout.replace(clause,'outra cláusula')},
  {...good,stdout:good.stdout.replace('AssertionError','TypeError')},
  {...good,stdout:good.stdout.replace('"cases":24','"cases":23')},
  {...good,stdout:good.stdout.replace('"cases":24','"cases":25')},
  {...good,stdout:'Mutação aplicada: '+name+'\n'+JSON.stringify({cases:24,failed:[]})},
  {...good,stderr:'SyntaxError: setup failed'},
])assert(!proof(bad,name,clause),'false-positive result rejected');
const baseline=run(null),report=reportOf(baseline);
assert(baseline.status===0 && !baseline.error && !baseline.signal && report?.cases===24 && report.failed.length===0,
  'actual-stage baseline failed: '+JSON.stringify({status:baseline.status,signal:baseline.signal,error:baseline.error?.code,failed:report?.failed}));
console.log('boarding-assets: 24 real-stage baseline clauses passed');
for(const mutation of mutations){
  const result=run(mutation);
  assert(proof(result,mutation[0],mutation[3]),'mutant lacks semantic evidence: '+JSON.stringify({name:mutation[0],status:result.status,signal:result.signal,error:result.error?.code,failed:reportOf(result)?.failed}));
  console.log('boarding-assets: applied and detected '+mutation[0]);
}
console.log('boarding-assets: twelve semantic mutants detected; twelve false-positive results rejected');
