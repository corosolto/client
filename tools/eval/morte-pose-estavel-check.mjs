import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {THREE} from './harness.mjs';

let src=readFileSync('public/js/glbchars.js','utf8');
const mutant=process.argv.includes('--mutante=acumula');
if(mutant) {
 const before=src;src=src.replace('this._restaurarPoseMorte();\n    if (!this.dead)', 'if (!this.dead)');
 assert.notEqual(src,before,'mutação impossível');
}
const Controller=vm.runInNewContext(src.slice(src.indexOf('class CharController'))+'\nCharController;',{
 THREE,FADE:.16,footOffset:()=>0,_emoteDriver:null,
 _pq:new THREE.Quaternion(),_qLean:new THREE.Quaternion(),_axisF:new THREE.Vector3()
});
const group=new THREE.Group(),spine=new THREE.Bone();spine.name='spine';group.add(spine);
const mixer=new THREE.AnimationMixer(group),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
const idle=new THREE.AnimationClip('idle',1,[new THREE.QuaternionKeyframeTrack('spine.quaternion',[0,1],[0,0,0,1,0,0,0,1])]);
const death=new THREE.AnimationClip('death',1,[new THREE.QuaternionKeyframeTrack('spine.quaternion',[0,1],[0,0,0,1,...q.toArray()])]);
const ctrl=new Controller(mixer,{idle:mixer.clipAction(idle),death:mixer.clipAction(death)},group,null,null,'qa',null);
ctrl.torso={spines:[spine]};
let fail=false;
try {
 ctrl.die({x:1,z:0});
 for(let i=0;i<120;i++)ctrl.update(1/60,0,false);
 const settled=spine.quaternion.clone().normalize();let drift=0;
 for(let i=0;i<600;i++){ctrl.update(1/60,0,false);drift=Math.max(drift,settled.angleTo(spine.quaternion.clone().normalize()));}
 console.log('Deriva após assentamento (rad): '+drift.toFixed(8));
 assert.ok(drift<1e-6,'corpo continua girando após clipe terminar');
 ctrl.revive();assert.equal(ctrl.dead,false);assert.equal(ctrl._deathK,0);
 ctrl.die({x:-1,z:0});for(let i=0;i<120;i++)ctrl.update(1/60,0,false);
 const second=spine.quaternion.clone().normalize();for(let i=0;i<120;i++)ctrl.update(1/60,0,false);
 assert.ok(second.angleTo(spine.quaternion.clone().normalize())<1e-6,'segunda morte acumula pose anterior');
 console.log('✓ Controlador real: morte assenta, mantém pose por 10s e reinicia ao reviver');
} catch(e) {fail=true;console.log('✗ MORTE: '+e.message);}
process.exitCode=mutant?(fail?0:1):(fail?1:0);
