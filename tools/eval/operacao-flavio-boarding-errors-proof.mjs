// GLM256 private causal meta-proof: runs the REAL 31c07 checker against the fixed class (baseline), 3 single-literal mutants, and a cleanup-fault checker copy (faults only in the TMP checker's I/O fixtures), all in private TMP copies.
// Class copies are textual; harness is a symlink to the real own harness; the fixed source and the real checker are never mutated by this proof.
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=dirname(fileURLToPath(import.meta.url));
const CHECKER=join(HERE,'operacao-flavio-boarding-errors-check.mjs');
const HARNESS=join(HERE,'harness.mjs');
const CLASS_FILE=join(HERE,'..','..','public','js','flavio-boarding.js');
const CHECKER_SHA='31c07c39f9c5cddbfca1184ac07f4b6537322edf7e7078eca509aa31e32b44dd';
const EXPECTED_BASE=['happy start succeeds with live stage and hidden originals','BERR_ROLLBACK restores world and releases actor once','BERR_RETRY_REJECT second start reattempts loader','BERR_RETRY_NULL releases first stage once and retries independently','BERR_STALE_REJECT old failure cannot tear down new session'];
const EXPECTED_SET=[...EXPECTED_BASE].sort();
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(cwd,file)=>new Promise(resolve=>{execFile(process.execPath,[file],{cwd,timeout:45000,maxBuffer:1024*1024},(error,stdout,stderr)=>resolve({code:error?(error.code??null):0,signal:error?.signal??null,killed:error?.killed===true,spawnError:error?String(error.code??error.name??error.message).slice(0,200):null,timeout:error?.code==='ETIMEDOUT',stdout:String(stdout),stderr:String(stderr)}));});
class InfraError extends Error{}
class MetaError extends Error{}
let infra=null,metaFailure=null;
const markInfra=e=>{infra??=e;},markMeta=e=>{metaFailure??=e;};
let tmp=null,classPin=null;
function parseResult({code,signal,killed,spawnError,timeout,stdout,stderr},label,expectedExit){
  // Expected exit is explicit per run (baseline 0, mutants 1, cleanup-fault copy 0); the exit code is never discarded.
  if(code!==0&&code!==1)throw new InfraError(label+': non-proof exit code='+JSON.stringify(code).slice(0,64)+' signal='+(signal===null?'null':String(signal))+' killed='+String(killed)+' timeout='+String(timeout)+(spawnError?' spawn='+String(spawnError):'')+' stderr='+stderr.slice(0,160));
  if(signal||killed||timeout)throw new InfraError(label+': child signaled/killed or timed out (code='+code+',signal='+(signal===null?'null':String(signal))+',killed='+String(killed)+',timeout='+String(timeout)+') stderr='+stderr.slice(0,160));
  const lines=stdout.split('\n').filter(line=>line.trim().startsWith('{'));
  if(lines.length!==1)throw new InfraError(label+': not a single JSON object');
  let parsed;try{parsed=JSON.parse(lines[0]);}catch{throw new InfraError(label+': stdout JSON parse failed');}
  if(parsed===null||typeof parsed!=='object'||Array.isArray(parsed))throw new InfraError(label+': result not a non-null object');
  if(!Array.isArray(parsed.cases))throw new InfraError(label+': cases not an array');
  if(parsed.tool!=='operacao-flavio-boarding-errors-check')throw new InfraError(label+': wrong tool marker');
  if(parsed.synthetic!==true)throw new InfraError(label+': synthetic marker missing');
  if(parsed.setupStage!=='cases')throw new InfraError(label+': setupStage not cases');
  if(parsed.cases.some(row=>row===null||typeof row!=='object'||Array.isArray(row)||typeof row.clause!=='string'||typeof row.pass!=='boolean'))throw new InfraError(label+': malformed case row');
  const names=parsed.cases.map(row=>row.clause);
  if(names.length!==5||new Set(names).size!==5)throw new InfraError(label+': not 5 unique case names');
  if(JSON.stringify([...names].sort())!==JSON.stringify(EXPECTED_SET))throw new InfraError(label+': case name set mismatch');
  if(parsed.cases.some(row=>typeof row.pass!=='boolean'))throw new MetaError(label+': pass not boolean for every case');
  if(!Array.isArray(parsed.failed))throw new InfraError(label+': failed not an array');
  if(parsed.failed.some(row=>row===null||typeof row!=='object'||Array.isArray(row)||typeof row.clause!=='string'||typeof row.type!=='string'||typeof row.message!=='string'))throw new InfraError(label+': malformed failed row shape');
  if(parsed.failed.some(row=>row.clause.endsWith(':cleanup')))throw new InfraError(label+': cleanup failure leaked into failed (infra)');
  const nonAssertion=parsed.failed.find(row=>row.type!=='AssertionError');
  if(nonAssertion)throw new InfraError(label+': failed row type '+nonAssertion.type+' is not AssertionError');
  if(parsed.failed.some(row=>!EXPECTED_SET.includes(row.clause)))throw new InfraError(label+': unknown failed clause');
  if(new Set(parsed.failed.map(row=>row.clause)).size!==parsed.failed.length)throw new InfraError(label+': failed rows not unique');
  const hard=parsed.failed;
  const hardNames=hard.map(row=>row.clause),falseNames=parsed.cases.filter(row=>row.pass===false).map(row=>row.clause);
  if(JSON.stringify([...hardNames].sort())!==JSON.stringify([...falseNames].sort()))throw new InfraError(label+': failed rows do not match false cases exactly');
  if(code!==expectedExit)throw new MetaError(label+': unexpected exit '+code+' (expected '+expectedExit+') stderr='+stderr.slice(0,160));
  return parsed;
}
function assertSourceSHA(parsed,expected,label){
  // The copied class hash is always compared as an error condition, never just logged.
  if(parsed.sourceSHA!==expected)throw new InfraError(label+': sourceSHA mismatch (exit result class differs from the copy this run wrote)');
}
function lenientCases(stdout){
  // Partial capture only (e.g. 254-style P2 stage/owned partial): records case-level outcome without validating it.
  try{
    const line=stdout.split('\n').filter(l=>l.trim().startsWith('{'))[0];
    const parsed=JSON.parse(line);
    if(parsed&&Array.isArray(parsed.cases))return parsed.cases.map(row=>({clause:row.clause,pass:row.pass}));
  }catch{}
  return null;
}
async function runCopy({name,classText,checkerText,expectedExit,expected}){
  const dir=join(tmp,name);
  mkdirSync(join(dir,'public','js'),{recursive:true});mkdirSync(join(dir,'tools','eval'),{recursive:true});
  writeFileSync(join(dir,'public','js','flavio-boarding.js'),classText);
  writeFileSync(join(dir,'tools','eval','operacao-flavio-boarding-errors-check.mjs'),checkerText);
  symlinkSync(HARNESS,join(dir,'tools','eval','harness.mjs'));
  const executed=await run(dir,join(dir,'tools','eval','operacao-flavio-boarding-errors-check.mjs'));
  let parsed;try{parsed=parseResult(executed,name,expectedExit);}catch(error){error.capturedStdout=executed.stdout;throw error;}
  assertSourceSHA(parsed,sha(Buffer.from(classText,'utf8')),name);
  const hard=parsed.failed.filter(row=>!String(row.clause).endsWith(':cleanup'));
  const ok=hard.length===expected.length
    && hard.every(row=>row.type==='AssertionError')
    && expected.every(exp=>hard.some(row=>row.clause===exp.clause && String(row.message).split('\n')[0]===exp.message))
    && parsed.cases.filter(row=>row.pass).length===5-expected.length;
  return {name,ok,sourceSHA:parsed.sourceSHA,expectedSHA:sha(Buffer.from(classText,'utf8')),failed:hard,cases:parsed.cases.map(row=>({clause:row.clause,pass:row.pass}))};
}
async function runMutant(classText,spec){
  const occurrences=classText.split(spec.oldL).length-1;
  if(occurrences!==1)throw new InfraError(spec.name+': literal not unique ('+occurrences+' occurrences)');
  return runCopy({name:spec.name,classText:classText.replace(spec.oldL,spec.newL),checkerText:readFileSync(CHECKER).toString('utf8'),expectedExit:1,expected:spec.failed});
}
const MUTANTS=[
  {name:'mut-no-rollback-catch',oldL:'}).catch(()=>{this._rollback(session);return false;});',newL:'}).catch(()=>false);',failed:[{clause:'BERR_ROLLBACK restores world and releases actor once',message:'rollback clears session'}]},
  {name:'mut-no-negative-invalidate',oldL:'if(this.ready===pending && !this.disposed)this.ready=null;',newL:';',failed:[{clause:'BERR_RETRY_REJECT second start reattempts loader',message:'retry after reject must reattempt loader'},{clause:'BERR_RETRY_NULL releases first stage once and retries independently',message:'retry after null stage must reattempt loader'}]},
  {name:'mut-unconditional-stop-catch',oldL:'}).catch(()=>{this._rollback(session);return false;});',newL:'}).catch(()=>{this.stop();return false;});',failed:[{clause:'BERR_STALE_REJECT old failure cannot tear down new session',message:'same board keeps session B identity'}]}
];
// Cleanup-fault control: literal injections ONLY in the TMP checker copy's I/O fixtures (fresh reset, rollback arming, FakeBuild mixer throw + owned[0] throw-after-increment). Real class and ALL checker asserts stay intact.
const CLEANUP_FAULT_INJECTIONS=[
  {name:'cleanupfaultfixtures-fresh-reset',oldL:'fixture.rejectPreload=null;};',newL:'fixture.rejectPreload=null;fixture.cleanupFault=false;};'},
  {name:'cleanupfaultfixtures-rollback-arm',oldL:"board._buildProfile=()=>{throw new Error('fixture profile failure');};board._prepareFeet=()=>true;",newL:"board._buildProfile=()=>{throw new Error('fixture profile failure');};board._prepareFeet=()=>true;fixture.cleanupFault=true;"},
  {name:'cleanupfaultfixtures-mixer-throw',oldL:'mixer:{stopAllAction(){},uncacheRoot(){}}',newL:"mixer:{stopAllAction(){if(fixture.cleanupFault)throw new Error('cleanupFault fixture mixer stopAllAction');},uncacheRoot(){}}"},
  {name:'cleanupfaultfixtures-owned-throw',oldL:'r.dispose=()=>{r.disposed++;};',newL:"r.dispose=()=>{r.disposed++;if(fixture.cleanupFault && i===0)throw new Error('cleanupFault fixture owned dispose');};"}
];
function buildCleanupFaultChecker(){
  let text=readFileSync(CHECKER).toString('utf8');
  for(const injection of CLEANUP_FAULT_INJECTIONS){
    const occurrences=text.split(injection.oldL).length-1;
    if(occurrences!==1)throw new InfraError(injection.name+': injection literal not unique ('+occurrences+' occurrences)');
    text=text.replace(injection.oldL,injection.newL);
  }
  return text;
}
async function runCleanupFault(classText){
  try{return await runCopy({name:'cleanupfaultfixtures',classText,checkerText:buildCleanupFaultChecker(),expectedExit:0,expected:[]});}
  catch(error){
    if(error instanceof MetaError){markMeta(error);return {name:'cleanupfaultfixtures',ok:false,failed:[],cases:lenientCases(error instanceof Error&&error.capturedStdout?error.capturedStdout:''),metaError:String(error.message||error)};}
    throw error;
  }
}
let baseline=null;const mutants=[];let cleanupFault=null;
let pinnedCheckerBytes,pinnedClassBytes;
try{
  pinnedCheckerBytes=readFileSync(CHECKER);pinnedClassBytes=readFileSync(CLASS_FILE);classPin=sha(pinnedClassBytes);
  if(sha(pinnedCheckerBytes)!==CHECKER_SHA)throw new InfraError('checker sha mismatch (expected 31c07)');
  const argv=process.argv.slice(2);
  if(argv.length)throw new InfraError('no arguments allowed (got '+argv.length+'): '+JSON.stringify(argv).slice(0,256));
  const base=parseResult(await run(HERE,CHECKER),'baseline',0);
  const classBytes=pinnedClassBytes;
  assertSourceSHA(base,classPin,'baseline');
  if(base.failed.length!==0||base.cases.some(row=>row.pass!==true))throw new MetaError('baseline not green');
  if(JSON.stringify(base.cases.map(row=>row.clause))!==JSON.stringify(EXPECTED_BASE))throw new MetaError('baseline case names mismatch');
  baseline={sourceSHA:base.sourceSHA,cases:base.cases.map(row=>({clause:row.clause,pass:row.pass})),failed:0,ok:true};
  tmp=mkdtempSync(join(tmpdir(),'glm256-proof-'));
  for(const spec of MUTANTS)mutants.push(await runMutant(classBytes.toString('utf8'),spec));
  cleanupFault=await runCleanupFault(classBytes.toString('utf8'));
}catch(error){if(error instanceof MetaError)markMeta(error);else markInfra(error);}
let metaExit=2;
if(!infra)metaExit=metaFailure||mutants.length!==MUTANTS.length||!mutants.every(m=>m.ok)||!cleanupFault?.ok?1:0;
let pinError=null;
try{
  if(sha(readFileSync(CHECKER))!==CHECKER_SHA)pinError='checker changed during proof';
  if(!classPin||sha(readFileSync(CLASS_FILE))!==classPin)pinError??='class changed during proof';
}catch(error){pinError??=String(error.message||error);}
if(pinError)metaExit=2;
let tmpCleanupError=null;
try{if(tmp)rmSync(tmp,{recursive:true,force:true});}catch(error){tmpCleanupError=String(error.message||error);metaExit=2;}
console.log(JSON.stringify({tool:'operacao-flavio-boarding-errors-proof',checkerSHA:CHECKER_SHA,baseline,mutants:mutants.map(({name,ok,sourceSHA,expectedSHA,failed})=>({name,ok,sourceSHA,expectedSHA,failed})),cleanupFault:cleanupFault&&{ok:cleanupFault.ok,sourceSHA:cleanupFault.sourceSHA,expectedSHA:cleanupFault.expectedSHA,failed:cleanupFault.failed,cases:cleanupFault.cases,metaError:cleanupFault.metaError||null},cleanupFaultInjections:CLEANUP_FAULT_INJECTIONS.map(injection=>injection.name),pins:{classSHA:classPin,ok:!pinError,error:pinError},infra:infra?String(infra.message||infra):null,meta:metaFailure?String(metaFailure.message||metaFailure):null,tmpCleanupError,metaExit}));
process.exitCode=metaExit;
