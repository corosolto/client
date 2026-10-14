// Os GLBs Mint originais só tinham Idle. Ausência de combate ou pesos de mão
// não pode passar como skin jogável. Mutação opera numa cópia em memória.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {TRETA_SKINS} from '../../public/js/treta-catalog.js';
import {readGLB,accessor} from './tp-mount-probe.mjs';
const manifest=JSON.parse(fs.readFileSync('public/models/skins/manifest.json'));
if(process.argv.includes('--mutations')){
 for(const [id,message] of [['sem-combate','clipe shoot ausente'],['sem-flexao','osso Curl_R ausente']]){
  const r=spawnSync(process.execPath,[new URL(import.meta.url).pathname,`--mutante=${id}`],{encoding:'utf8'});
  assert(r.status!==0 && r.stderr.includes(message),`Mutante ${id} não foi detectado pelo contrato esperado`);
 }
 console.log('PASS: 2/2 mutações de asset detectadas');process.exit(0);
}
const mutation=process.argv.find(a=>a.startsWith('--mutante='))?.split('=')[1];
let mutated=false;
const states=['idle','walk','run','shoot','death','crouch','crouchwalk','jump'];
let bytes=0,vertices=0;
for(const spec of TRETA_SKINS){
 const entry=manifest.skins[spec.id];assert(entry,`${spec.id}: manifest ausente`);
 assert.equal(entry.character,spec.character,`${spec.id}: personagem trocado`);
 assert(/^\/models\/skins\/[a-z0-9-]+\.glb$/.test(entry.model),`${spec.id}: caminho inválido`);
 const file=`public${entry.model}`,data=fs.readFileSync(file);
 assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256,`${spec.id}: hash divergente; regenere manifest`);
 assert(fs.statSync(`public${entry.poster}`).size>1000,`${spec.id}: poster real ausente`);
 assert(data.length<1500000,`${spec.id}: GLB excede orçamento de 1.5 MB`);bytes+=data.length;
 const g=readGLB(file),j=g.json;
 if(mutation && !mutated){
  if(mutation==='sem-combate'){const n=j.animations.length;j.animations=j.animations.filter(a=>a.name!=='shoot');assert(j.animations.length<n,'MUTANTE NÃO APLICOU');}
  else if(mutation==='sem-flexao'){const joint=j.skins[0].joints.find(i=>j.nodes[i].name==='Curl_R');assert(joint!==undefined,'MUTANTE NÃO APLICOU');j.nodes[joint].name='BrokenGrip';}
  else throw new Error('Mutante desconhecido');mutated=true;
 }
 const names=new Set(j.animations.map(a=>a.name));
 for(const state of [...states,'showroomIdle'])assert(names.has(state),`${spec.id}: clipe ${state} ausente; retarget necessário`);
 for(const skin of j.skins){
  const joints=skin.joints.map(i=>j.nodes[i].name);
  assert.equal(joints.length,26,`${spec.id}: rig não é o derivado esperado`);
  for(const name of ['Head','Hips','RightHand','LeftHand','Curl_R','Curl_L'])assert(joints.includes(name),`${spec.id}: osso ${name} ausente`);
  const weightsByJoint=new Array(joints.length).fill(0);
  for(const node of j.nodes.filter(n=>n.skin===j.skins.indexOf(skin)))for(const p of j.meshes[node.mesh].primitives){
   const ids=accessor(g,p.attributes.JOINTS_0),weights=accessor(g,p.attributes.WEIGHTS_0);vertices+=weights.length/4;
   for(let i=0;i<weights.length;i+=4){
    let total=0;for(let k=0;k<4;k++){assert(ids[i+k]<joints.length,`${spec.id}: joint inválido`);assert(weights[i+k]>=0,`${spec.id}: peso negativo`);total+=weights[i+k];weightsByJoint[ids[i+k]]+=weights[i+k];}
    assert(Math.abs(total-1)<.001,`${spec.id}: pesos não normalizados`);
   }
  }
  for(const curl of ['Curl_R','Curl_L'])assert(weightsByJoint[joints.indexOf(curl)]>10,`${spec.id}: ${curl} sem geometria ponderada`);
 }
 for(const state of states){
  const anim=j.animations.find(a=>a.name===state);assert(anim.channels.length>20,`${spec.id}: ${state} incompleto`);
  const times=accessor(g,anim.samplers[0].input);assert(times.at(-1)>.2,`${spec.id}: ${state} sem duração`);
 }
}
assert(!mutation || mutated,'MUTANTE NÃO APLICOU');
console.log(`PASS: ${TRETA_SKINS.length} assets, ${vertices} vértices, ${(bytes/1e6).toFixed(2)} MB; clips, pesos, rig, hashes e posters`);
