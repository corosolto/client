import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(new URL('./character-owned-resources-check.mjs', import.meta.url));
const run = args => spawnSync(process.execPath, [script,...args], {encoding:'utf8',timeout:30000,maxBuffer:1000000});
const reportOf = result => { try { return JSON.parse(result.stdout.split('\n').findLast(line => line.startsWith('{'))); } catch { return null; } };
const proof = (result, name, clause) => {
  const report = reportOf(result);
  return result.status === 1 && !result.signal && !result.error
    && result.stdout.split(/\r?\n/).includes('Mutação aplicada: ' + name)
    && report?.mutant === name && report.cases === 13 && report.failed.length > 0
    && report.failed.every(row => row.type === 'AssertionError')
    && report.failed.some(row => row.clause === clause)
    && !/TypeError:|ReferenceError:|SyntaxError:/.test(result.stdout + result.stderr);
};
const name = 'sem-skeleton', clause = 'private bone textures released, mats=false';
const good = {status:1,stdout:'Mutação aplicada: ' + name + '\n' + JSON.stringify({mutant:name,cases:13,failed:[{clause,type:'AssertionError'}]}),stderr:''};
assert(proof(good,name,clause));
for (const bad of [{...good,status:0},{...good,status:2},{...good,signal:'SIGTERM'},{...good,error:new Error('setup')},
  {...good,stdout:good.stdout.replace('Mutação aplicada: ','Sem aplicação: ')},
  {...good,stdout:good.stdout.replace('AssertionError','TypeError')},
  {...good,stdout:good.stdout.replace(clause,'outra cláusula')},
  {...good,stdout:good.stdout.replace('"cases":13','"cases":12')}]) assert(!proof(bad,name,clause));
const baseline = run([]), report = reportOf(baseline);
assert(baseline.status === 0 && !baseline.error && !baseline.signal && report?.mutant === null && report.cases === 13 && report.failed.length === 0,
  'baseline real de ownership válido: ' + (baseline.stdout + baseline.stderr).slice(-2000));
for (const [mutant, expected] of [
  ['sem-skeleton','private bone textures released, mats=false'],
  ['geometria-compartilhada','shared cache preserved, mats=false'],
  ['sem-material','actor-owned allocations released, mats=true'],
  ['sem-head','actor-owned allocations released, mats=false'],
  ['sombra-compartilhada','shared cache preserved, mats=false'],
  ['sem-oculos','eyewear deformation geometry released'],
  ['sem-repasse-factory','factory eyewear ownership forwarded end to end'],
  ['sem-repasse-mount','factory eyewear ownership forwarded end to end'],
]) {
  const result = run(['--mutante=' + mutant]);
  assert(proof(result,mutant,expected), 'mutante sem prova semântica: ' + mutant + '\n' + (result.stdout + result.stderr).slice(-2000));
  console.log('ownership-proof: aplicado e detectado ' + mutant);
}
console.log('ownership-proof: 13 casos reais verdes, oito mutantes detectados, oito falsos positivos rejeitados');
