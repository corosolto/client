import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {THREE} from './harness.mjs';

let src=readFileSync('public/js/glbchars.js','utf8');
const args=process.argv.slice(2);
if(args.length>1||(args.length&&args[0]!=='--mutante=acumula')){console.error('Uso: morte-pose-estavel-check.mjs [--mutante=acumula]');process.exit(2);}
const mutant=args.length===1;
if(mutant) {
 const before=src,anchors=[...src.matchAll(/^  update\(dt,[^\n]*\) \{\n    this\._restaurarPoseMorte\(\);/gm)];
 if(anchors.length!==1){console.error(`INFRA morte: âncora update/restauração deve ser única (encontradas ${anchors.length})`);process.exit(2);}
 const anchor=anchors[0];
 src=src.slice(0,anchor.index)+anchor[0].replace('    this._restaurarPoseMorte();','')+src.slice(anchor.index+anchor[0].length);
 assert.ok(src!==before,'mutação impossível');
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
