#!/usr/bin/env node
/* Pose Head autorada, sem recentro yaw implícito. O nome do comando é mantido para
   o wiring existente; história e rejeição da feature: docs/visual-consistency/HEAD-YAW.md. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const MUTANTS = ['yaw80', 'yaw-acumulativo', 'proxy-antes-pose', 'sem-pitch', 'sem-emote', 'pitch-fora-guarda'];
const args = process.argv.slice(2), proposal = args.includes('--proposta-sem-yaw');
const mutationArgs = args.filter(a => a.startsWith('--mutante='));
const mutant = mutationArgs[0]?.slice('--mutante='.length) || '';
const auto = args.includes('--autoteste');
if (new Set(args).size !== args.length || mutationArgs.length > 1 || (auto && mutationArgs.length)
    || (mutationArgs.length && !MUTANTS.includes(mutant))
    || args.some(a => !['--proposta-sem-yaw', '--autoteste', `--mutante=${mutant}`].includes(a))) {
  console.error('Use [--proposta-sem-yaw] [--autoteste | --mutante=' + MUTANTS.join('|') + ']'); process.exit(2);
}
if (auto) {
  const script = fileURLToPath(import.meta.url), common = proposal ? ['--proposta-sem-yaw'] : [];
  const nominal = spawnSync(process.execPath, [script, ...common], { encoding: 'utf8', maxBuffer: 32768 });
  let clean; try { clean = JSON.parse(nominal.stdout); } catch { console.error('nominal sem resposta válida'); process.exit(3); }
  if (nominal.status !== 0 || clean.status !== 'GREEN' || clean.failedCases !== 0 || !(clean.cases > 0)) {
    console.error('autoteste exige nominal GREEN antes dos mutantes'); process.exit(1);
  }
  for (const m of MUTANTS) {
    const r = spawnSync(process.execPath, [script, ...common, `--mutante=${m}`], { encoding: 'utf8', maxBuffer: 32768 });
    let result; try { result = JSON.parse(r.stdout); } catch { console.error(`mutante ${m}: resposta inválida`); process.exit(3); }
    if (r.error || r.status !== 0 || result.status !== 'RED' || !(result.failedCases > 0)) {
      console.error(`mutante ${m} sobreviveu: exit=${r.status}, status=${result.status}`); process.exit(1);
    }
    console.log(`✓ ${m}: ${result.failedCases} caso(s) RED`);
  }
  const bad = spawnSync(process.execPath, [script, '--argumento-desconhecido'], { encoding: 'utf8' });
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'head-pose-infra-'));
  let infra; try { infra = spawnSync(process.execPath, [script], { cwd: empty, encoding: 'utf8' }); }
  finally { fs.rmSync(empty, { recursive: true, force: true }); }
  if (bad.status !== 2 || infra.status !== 3) { console.error('CLI/infra não fecharam: ' + bad.status + '/' + infra.status); process.exit(1); }
  console.log('✓ CLI desconhecida exit2; produto ausente exit3'); process.exit(0);
}
const temps = [];
process.on('exit', () => { for (const f of temps) fs.rmSync(f, { recursive: true, force: true }); });
const replace = (s, a, b) => {
  if (a === b || s.split(a).length !== 2) throw new Error('adaptação temporária não única: ' + a.slice(0, 70));
  return s.replace(a, b);
};
try {
  const src = fs.readFileSync(path.resolve('public/js/glbchars.js'), 'utf8');
  const { THREE: T } = await import('./harness.mjs');
  let text = src;
  if (proposal) {
    const a = text.indexOf('    // Delta de yaw sai antes do mixer');
    const b = text.indexOf('    /* Hitbox da cabeça sincronizada por ÚLTIMO:', a);
    if (a < 0 || b <= a) throw new Error('proposta exige feature yaw61 ainda presente; rode nominal após sua retirada');
    text = text.slice(0, a) + text.slice(b);
  }
  const sync = `    if (this.headBone) {
      this.group.updateMatrixWorld(true);
      this.head.position.copy(this.group.worldToLocal(this.headBone.getWorldPosition(_v)));
    }`;
  if (mutant === 'proxy-antes-pose') {
    text = replace(text, sync, '');
    text = replace(text, '    const querEmote = !!this._emoteId && !this.dead;', sync + '\n    const querEmote = !!this._emoteId && !this.dead;');
  }
  if (mutant === 'sem-pitch') text = replace(text,
    'if (this.headBone && this.aimPitch !== undefined && !this.dead && this.lod < 2)',
    'if (false && this.headBone && this.aimPitch !== undefined && !this.dead && this.lod < 2)');
  if (mutant === 'pitch-fora-guarda') text = replace(text,
    'if (this.headBone && this.aimPitch !== undefined && !this.dead && this.lod < 2)',
    'if (this.headBone && this.aimPitch !== undefined)');
  if (mutant === 'sem-emote') text = replace(text, 'const querEmote = !!this._emoteId && !this.dead;', 'const querEmote = false;');
  if (mutant === 'yaw80' || mutant === 'yaw-acumulativo') {
    if (mutant === 'yaw80') text = replace(text,
      '  update(dt, moving, hasTarget, speed = 0, back = false, lateral = 0) {',
      `  update(dt, moving, hasTarget, speed = 0, back = false, lateral = 0) {
    if(this.__poseYawUndo){this.headBone.quaternion.premultiply(this.__poseYawUndo);this.__poseYawUndo=null;}`);
    const forced = `    if(this.headBone && !this.dead && !this.emotando && /^(idle|idle1h|crouch)$/.test(this.curName||'')){
      const bq=this.group.getWorldQuaternion(new THREE.Quaternion()),hq=this.headBone.getWorldQuaternion(new THREE.Quaternion());
      const f=new THREE.Vector3(0,0,1).applyQuaternion(bq),h=new THREE.Vector3(0,0,1).applyQuaternion(hq);
      const y=Math.atan2(f.x*h.z-f.z*h.x,f.x*h.x+f.z*h.z);
      this.__poseYawCorr=(this.__poseYawCorr||0)+(Math.max(-.5,Math.min(.5,y*.8))-(this.__poseYawCorr||0))*Math.min(1,dt*6);
      const pq=this.headBone.parent.getWorldQuaternion(new THREE.Quaternion());
      const delta=pq.clone().invert().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),this.__poseYawCorr)).multiply(pq);
      this.headBone.quaternion.premultiply(delta);this.__poseYawUndo=delta.invert();this.headBone.updateWorldMatrix(false,true);
    }
`;
    text = replace(text, sync, forced + sync);
  }
  text = replace(text, 'class CharController {', 'export class CharController {');
  // Cópia fora da árvore pública; só os imports apontam de volta aos módulos reais.
  text = text.replace(/from (['"])([^'"]+)\1/g, (whole, _quote, spec) => {
    const local = spec.startsWith('.') ? path.resolve('public/js', spec)
      : spec === 'three' ? path.resolve('node_modules/three/index.js')
      : spec.startsWith('three/') ? path.resolve('node_modules', spec) : null;
    return local ? 'from ' + JSON.stringify(pathToFileURL(local).href) : whole;
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'head-pose-source-')); temps.push(dir);
  const temp = path.join(dir, 'glbchars.mjs'); fs.writeFileSync(temp, text);
  const { CharController, setEmoteDriver } = await import(pathToFileURL(temp));
  const tol = 1e-6, rows = []; let frames = 0;
  const quat = (yaw, pitch = .1) => new T.Quaternion().setFromEuler(new T.Euler(pitch, yaw, .05, 'YXZ'));
  function error(a, b) {
    const same = Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z,a.w-b.w);
    const flip = Math.hypot(a.x+b.x,a.y+b.y,a.z+b.z,a.w+b.w);
    return 4*Math.asin(Math.min(1,Math.min(same,flip)/2));
  }
  function rig(type, yaw, complex) {
    const scene=new T.Group(),group=new T.Group(),model=new T.Group(),neck=new T.Bone(),head=new T.Bone(),proxy=new T.Object3D();
    const scale=complex?.01:1;group.scale.setScalar(scale);scene.scale.setScalar(complex?1.3:1);
    neck.name='Neck';head.name='Head';neck.position.y=1.1/scale;head.position.set(.11/scale,.27/scale,.04/scale);
    head.quaternion.copy(quat(yaw));scene.add(group);group.add(model,proxy);model.add(neck);neck.add(head);
    const clips={};
    for(const [i,name] of ['idle','idle1h','crouch','walk','walk1h','run','shoot','death','jump'].entries()){
      const v=yaw+i*.035, q0=quat(v),q1=quat(v+(type==='animated'?.17:0),type==='animated'?-.07:.1);
      const track=[];
      if(type!=='untracked') track.push(new T.QuaternionKeyframeTrack('Head.quaternion',[0,.5,1],[...q0.toArray(),...q1.toArray(),...q0.toArray()]));
      track.push(new T.VectorKeyframeTrack('Head.position',[0,.5,1],[...head.position.toArray(),head.position.x+.02/scale,head.position.y,head.position.z,...head.position.toArray()]));
      track.push(new T.QuaternionKeyframeTrack('Neck.quaternion',[0,.5,1],[...quat(-.12,.16).toArray(),...quat(-.08,.2).toArray(),...quat(-.12,.16).toArray()]));
      clips[name]=new T.AnimationClip(name,1,track);
    }
    const mixer=new T.AnimationMixer(model),actions=Object.fromEntries(Object.entries(clips).map(([n,c])=>[n,mixer.clipAction(c)]));
    return {scene,group,model,neck,head,proxy,mixer,actions,rest:quat(yaw),complex};
  }
  function actual(type,yaw,complex){
    const r=rig(type,yaw,complex);r.ctrl=new CharController(r.mixer,r.actions,r.group,r.head,r.proxy,'probe',r.model);
    for(const name of ['idle','idle1h','walk','walk1h','run','crouch','shoot','death','jump']) {
      if(!r.actions[name]?.getClip()?.tracks?.length)throw Error('clipe ausente na fixture: '+name);
    }
    r.ctrl.corpo=new Map([['Neck',r.neck],['Head',r.head]]);r.ctrl.torso={spines:[r.neck]};return r;
  }
  // O oráculo só toca clips num AnimationMixer independente; não importa CharController.
  function oracle(type,yaw,complex){
    const r=rig(type,yaw,complex);r.active=null;
    r.start=(name,once=false,fade=.16,rate=1)=>{
      if(r.active===name)return;
      const a=r.actions[name];a.reset().setLoop(once?T.LoopOnce:T.LoopRepeat,once?1:Infinity);a.clampWhenFinished=once;
      a.timeScale=rate;a.enabled=true;a.fadeIn(fade).play();if(r.active)r.actions[r.active].fadeOut(fade);r.active=name;
    };
    r.revive=()=>{r.mixer.stopAllAction();r.active=null;r.start('idle');};r.start('idle');return r;
  }
  function parents(r,i){
    r.scene.rotation.set(r.complex?.15*Math.sin(i/80):0,r.complex?.37:0,r.complex?-.06:0);
    r.group.rotation.set(r.complex?.1:0,.7+.5*Math.sin(i/45),r.complex?.04:0);
    r.scene.updateMatrixWorld(true);
  }
  function rates(r,speed,dead){
    if(dead)return;const rate=v=>Math.max(.45,Math.min(3,speed/v));
    r.actions.walk.timeScale=rate(.84);r.actions.walk1h.timeScale=rate(.84);r.actions.run.timeScale=rate(2.08);
  }
  function row(name){return {name,frames:0,maxError:0,maxProxyError:0,maxDirectError:0,stateErrors:0,finite:true};}
  function measure(out,a,o,authored=true,direct=false){
    frames++;out.frames++;
    if(authored)out.maxError=Math.max(out.maxError,error(a.head.quaternion,o.head.quaternion));
    if(direct)out.maxDirectError=Math.max(out.maxDirectError,error(a.head.quaternion,o.rest));
    const expected=a.head.getWorldPosition(new T.Vector3()),observed=a.group.localToWorld(a.proxy.position.clone());
    const proxyError=expected.distanceTo(observed);out.maxProxyError=Math.max(out.maxProxyError,proxyError);
    if(proxyError>tol&&!out.proxyWitness)out.proxyWitness={frame:out.frames,proxyError,
      neckDelta:error(a.neck.quaternion,o.neck.quaternion),headDelta:error(a.head.quaternion,o.head.quaternion)};
    out.finite &&= [...a.head.quaternion.toArray(),...expected.toArray(),...observed.toArray()].every(Number.isFinite);
  }
  const dtAt=i=>i%200===0?0:i===599?.3:[1/30,1/60,1/120][i%3];
  for(const type of ['untracked','constant','animated'])for(const yaw of [-.5,.5])for(const complex of [false,true]){
    const a=actual(type,yaw,complex),o=oracle(type,yaw,complex),out=row(`${type}/${yaw}/${complex?'parents-scaled':'upright'}`);
    for(let i=0;i<1800;i++){
      const phase=Math.floor(i/120),at=i%120,dt=dtAt(i);let moving=0,speed=0;
      a.ctrl.crouch=phase===7;a.ctrl.oneHanded=phase===5||phase===6;a.ctrl.lod=phase===13?2:0;
      if(at===0){
        if(phase===4){o.start('walk');}
        if(phase===5)o.start('idle1h');if(phase===6)o.start('walk1h');if(phase===7)o.start('crouch');if(phase===8)o.start('run');
        if(phase===9){a.ctrl.shoot();o.start('shoot',true,.06);}
        if(phase===10){a.ctrl.die();o.start('death',true,.16,1.8);}
        if(phase===11){a.ctrl.revive();o.revive();}
        if(phase===12){a.ctrl.die();a.ctrl.revive();o.start('death',true,.16,1.8);o.revive();}
      }
      if(phase===9&&at===10){a.ctrl.shooting=false;o.start('idle');}
      if([4,6,8].includes(phase)){moving=1;speed=phase===8?2.08:.84;}
      a.ctrl.aimPitch=undefined;
      if(a.ctrl.aimPitch!==undefined||a.ctrl._emoteId||a.ctrl.emotando)throw Error('fixture neutra recebeu overlay');
      parents(a,i);parents(o,i);rates(o,speed,phase===10);
      a.ctrl.update(dt,moving,false,speed);o.mixer.update(dt);
      if(a.ctrl.curName!==o.active)out.stateErrors++;
      measure(out,a,o,true,(type==='constant'||type==='untracked')&&phase===0&&i>30);
    }
    rows.push(out);
  }
  for(const yaw of [-.5,.5])for(const complex of [false,true]){
    const a=actual('animated',yaw,complex),o=oracle('animated',yaw,complex),out=row(`paused-animated/${yaw}/${complex}`);
    a.actions.idle.paused=true;o.actions.idle.paused=true;
    for(let i=0;i<600;i++){
      parents(a,i);parents(o,i);a.ctrl.update(dtAt(i),0,false);o.mixer.update(dtAt(i));measure(out,a,o);
    }
    out.proxyNonzero=a.proxy.position.length()>0;out.effectMissing=!out.proxyNonzero;rows.push(out);
  }
  // Valor autorado direto em repouso longo impede que dois caminhos errados concordem.
  for(const type of ['untracked','constant'])for(const yaw of [-.5,.5]){
    const a=actual(type,yaw,false),o=oracle(type,yaw,false),out=row(`standing-direct/${type}/${yaw}`);
    for(let i=0;i<600;i++){parents(a,i);parents(o,i);a.ctrl.update(1/60,0,false);o.mixer.update(1/60);measure(out,a,o,true,true);}
    rows.push(out);
  }
  for(const method of ['shoot','jump','die','revive']){
    const a=actual('animated',.5,true),o=oracle('animated',.5,true),out=row(`callsite/${method}`);
    for(let i=0;i<20;i++){a.ctrl.update(1/60,0,false);o.mixer.update(1/60);}
    if(method==='shoot'){a.ctrl.shoot();o.start('shoot',true,.06);}
    // Jump autorado termina sem clamp, diferentemente de shoot/death (contrato de jump()).
    if(method==='jump'){a.ctrl.jump();o.start('jump',true,.08);o.actions.jump.clampWhenFinished=false;}
    if(method==='die'){a.ctrl.die();o.start('death',true,.16,1.8);}
    if(method==='revive'){a.ctrl.die();a.ctrl.revive();o.start('death',true,.16,1.8);o.revive();}
    out.maxDirectError=error(a.head.quaternion,o.head.quaternion);
    for(let i=0;i<10;i++){a.ctrl.aimPitch=undefined;parents(a,i);parents(o,i);a.ctrl.update(1/60,0,false);o.mixer.update(1/60);measure(out,a,o);}
    rows.push(out);
  }
  for(const bone of ['Neck','Head']){
    const a=actual('animated',.5,true),o=oracle('animated',.5,true),out=row(`legitimate-emote/${bone}`);let effect=0;
    setEmoteDriver({laco:()=>true,duracao:()=>10,pose:(_id,t,list)=>{list.push([bone,'u',.25*Math.sin(t*3)+.15]);return .02;}});
    for(let i=0;i<180;i++){
      if(i===20&&!a.ctrl.emote('probe'))throw Error('emote recusado');if(i===100)a.ctrl.pararEmote();
      parents(a,i);parents(o,i);a.ctrl.update(1/60,0,false);o.mixer.update(1/60);
      const active=a.ctrl._emoteK>.004;
      effect=Math.max(effect,error(a[bone==='Head'?'head':'neck'].quaternion,o[bone==='Head'?'head':'neck'].quaternion));
      measure(out,a,o,bone!=='Head'||!active);
    }
    out.effect=effect;out.effectMissing=effect<.02;out.recoveryError=error(a.head.quaternion,o.head.quaternion);rows.push(out);
  }
  setEmoteDriver(null);
  for(const target of [-.2,.2]){
    const a=actual('animated',.5,false),o=oracle('animated',.5,false),out=row(`legitimate-aimPitch/${target}`);let improvement=0,localEffect=0,preError=null,preImprovement=0;
    for(let i=0;i<180;i++){
      const active=i>=20&&i<120;
      a.ctrl.aimPitch=active?target:undefined;parents(a,i);parents(o,i);a.ctrl.update(1/60,0,false);o.mixer.update(1/60);
      const pitch=r=>Math.asin(Math.max(-1,Math.min(1,new T.Vector3(0,0,1).applyQuaternion(r.head.getWorldQuaternion(new T.Quaternion())).y)));
      if(i===19)preError=Math.abs(pitch(a)-target);
      if(active){
        improvement=Math.max(improvement,Math.abs(pitch(o)-target)-Math.abs(pitch(a)-target));
        preImprovement=Math.max(preImprovement,preError-Math.abs(pitch(a)-target));
        localEffect=Math.max(localEffect,error(a.head.quaternion,o.head.quaternion));
      }
      measure(out,a,o,!active);
    }
    Object.assign(out,{improvement,preError,preImprovement,localEffect,effectMissing:improvement<.01||preImprovement<.01||localEffect<.01});rows.push(out);
  }
  for(const state of ['lod2','dead']){
    const a=actual('animated',.5,true),o=oracle('animated',.5,true),out=row(`pitch-guard/${state}`);
    if(state==='dead'){a.ctrl.die();o.start('death',true,.16,1.8);}else a.ctrl.lod=2;
    for(let i=0;i<180;i++){
      a.ctrl.aimPitch=.2;parents(a,i);parents(o,i);a.ctrl.update(1/60,0,false);o.mixer.update(1/60);measure(out,a,o);
    }
    rows.push(out);
  }
  const failures=rows.filter(r=>!r.finite||r.maxError>tol||r.maxProxyError>tol||r.maxDirectError>tol||r.stateErrors||r.effectMissing||r.recoveryError>tol);
  console.log(JSON.stringify({status:failures.length?'RED':'GREEN',contract:'authored-head-pose',proposal,mutant:mutant||null,
    sourceSha256:crypto.createHash('sha256').update(src).digest('hex'),oracle:'independent THREE.AnimationMixer + direct authored quaternion',neutral:{aimPitch:'undefined',emote:false},
    cases:rows.length,frames,maxError:Math.max(...rows.map(r=>r.maxError)),maxProxyError:Math.max(...rows.map(r=>r.maxProxyError)),
    maxDirectError:Math.max(...rows.map(r=>r.maxDirectError)),stateErrors:rows.reduce((n,r)=>n+r.stateErrors,0),
    legitimateEffects:rows.filter(r=>r.name.startsWith('legitimate-')).map(({name,effect,improvement,preError,preImprovement,localEffect,recoveryError})=>
      ({name,effect,improvement,preError,preImprovement,localEffect,recoveryError})),
    failedCases:failures.length,failures:failures.slice(0,3)},null,2));
  process.exitCode=mutant?(failures.length?0:1):(failures.length?1:0);
}catch(e){console.error(`head-pose infra: ${e.stack}`);process.exitCode=3;}
