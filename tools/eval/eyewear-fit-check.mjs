#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {NORMAL_ONLY_EQUIVALENCE, proveNormalOnlyEquivalence} from '../characters/normal-only-equivalence.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),read=path=>JSON.parse(readFileSync(join(root,path))),hash=path=>createHash('sha256').update(readFileSync(join(root,path))).digest('hex');
const eyewearPath='public/models/items/eyewear-manifest.json',landmarksPath='public/models/items/face-landmarks.json',factoryPath='tools/character-kit/garment/wearables-manifest.json',reportPath='tools/eval/asset-evidence/items/fit-matrix/report.json';
const coveredItems=['metal-de-rua','ouro-de-quebrada','oval-90','visor-de-pista'],coveredBodies=['capitao','esquerdomacho'],landmarkBodies=['capitao','esquerdomacho','barbudo'],poses=['idle','walk','run','crouch','shoot','walkfire'];
const finite=value=>typeof value==='number'&&Number.isFinite(value),same=(actual,expected,message)=>assert.deepEqual([...actual].sort(),[...expected].sort(),message);
function inputs(){return {eyewear:read(eyewearPath),landmarks:read(landmarksPath),factory:read(factoryPath),report:read(reportPath)};}
function rejectApprovalTrue(value,path='root'){
  if(!value||typeof value!=='object')return;
  for(const [key,child]of Object.entries(value)){assert(!(key==='approved'&&child===true),`${path}.${key}: approved:true prohibited in candidate lane`);rejectApprovalTrue(child,`${path}.${key}`);}
}
function validateOvalCapitao(eyewear,landmarks,report){
  const profile=eyewear.eyewear['oval-90'].profiles.capitao,row=report.eyewear.find(candidate=>candidate.itemId==='oval-90'&&candidate.bodyId==='capitao'),uncertaintyCm=landmarks.coordinateSystem.uncertaintyCm,ears=landmarks.bodies.capitao.eyewear.ears;
  assert.equal(profile.classification,'needs-human-review','oval-90/capitao: user rejection must remain recorded until a new visual review');
  assert.equal(profile.frontFrameFit,true,'oval-90/capitao: bridge centered from whole accessory instead of front frame');
  assert(profile.width>=.52&&profile.width<=.58,'oval-90/capitao: frame remains oversized for this face');
  assert(profile.frameHeightScale>=.66&&profile.frameHeightScale<=.76,'oval-90/capitao: lens height remains oversized for this face');
  assert(profile.depth>=.025&&profile.depth<=.045,'oval-90/capitao: frame sits too far from this face');
  assert(profile.lensY>=.52&&profile.lensY<=.58,'oval-90/capitao: eye line offset escaped the reviewed range');
  assert(profile.templeScaleL>=1.8&&profile.templeScaleL<=2,'oval-90/capitao: left temple misses ear after the smaller front frame');
  assert(profile.templeScaleR>=1.6&&profile.templeScaleR<=1.8,'oval-90/capitao: right temple misses ear after the smaller front frame');
  assert(profile.templeArcL>=.25&&profile.templeArcL<=.5&&profile.templeArcR>=.25&&profile.templeArcR<=.5,'oval-90/capitao: skull-following temple arc missing');
  assert(profile.templeLiftL>=.3&&profile.templeLiftL<=.6&&profile.templeLiftR>=.3&&profile.templeLiftR<=.6,'oval-90/capitao: temple tails must remain visually horizontal instead of following the bad ear-height metric');
  assert(row,'oval-90/capitao: captured matrix row missing');
  for(const sample of row.poses){
    const {metrics}=sample;
    assert(Math.abs(metrics.lensEyeCm)<=.5,`oval-90/capitao/${sample.pose}: frame misses eye line`);
    assert(metrics.clippingPct<=1,`oval-90/capitao/${sample.pose}: frame clips the face`);
    assert(['left','right'].every(side=>metrics[side].templeEarCm<=1&&metrics[side].templeEarCm>=-(ears[side].frontZ-ears[side].backZ)*100),`oval-90/capitao/${sample.pose}: temple misses ear`);
    assert(Math.abs(metrics.left.templeEarCm-metrics.right.templeEarCm)<=uncertaintyCm*2,`oval-90/capitao/${sample.pose}: asymmetric ear reach`);
    assert(metrics.left.sunkFraction<=.05&&metrics.right.sunkFraction<=.05,`oval-90/capitao/${sample.pose}: temple sinks into head`);
  }
}
function validate({eyewear,landmarks,factory,report}){
  assert.equal(eyewear.schema,1);assert.equal(landmarks.schemaVersion,'cs-face-landmarks/1');assert.equal(landmarks.status,'candidate');assert.equal(landmarks.runtimeEnabled,false);assert.equal(landmarks.provenance.origin,'gpt-pilot+human-candidate');
  assert.deepEqual(landmarks.profilePolicy,{identity:'bodyId+bodySha256',inheritance:'forbidden',unmeasuredResult:'not-compatible',review:'required-per-item-per-body'});
  rejectApprovalTrue(eyewear);same(Object.keys(landmarks.bodies),landmarkBodies,'landmark body coverage changed');
for(const bodyId of landmarkBodies){const landmark=landmarks.bodies[bodyId],expectedId=`character:${bodyId}`;assert.equal(landmark.bodyId,expectedId,`${bodyId}: landmark bodyId diverges from external key`);const evidence=NORMAL_ONLY_EQUIVALENCE[expectedId],expectedModel=evidence?.model??`/models/characters/${bodyId}.glb`;assert.equal(landmark.model,expectedModel,`${bodyId}: landmark model path diverges from expected body`);if(evidence)proveNormalOnlyEquivalence({bodyId:expectedId,legacySha:landmark.bodySha256,buffer:readFileSync(join(root,`public${landmark.model}`))});else assert.equal(landmark.bodySha256,hash(`public${landmark.model}`),`${bodyId}: bodySha256 does not match public model`);assert.equal(landmark.profileId,`${landmark.bodyId}@${landmark.bodySha256.slice(0,12)}`);assert.equal(landmark.headwear?.status,'invalidated-user-review',`${bodyId}: obsolete cap proof remained active`);}
  for(const bodyId of coveredBodies){const eye=landmarks.bodies[bodyId].eyewear;assert.equal(eye?.status,'measured',`${bodyId}: body without measured landmarks`);assert.equal(eye.calibration,'integrated-real-browser-visual-review');assert(finite(eye.pilotEyeLineY)&&eye.pilotEyeLineY-eye.eyeLineY>=.03,`${bodyId}: uncorrected pilot eye line`);}
  for(const itemId of coveredItems){const entry=eyewear.eyewear[itemId];assert(entry&&entry.approved===false,`${itemId}: candidate asset must stay unapproved`);same(Object.keys(entry.profiles),coveredBodies,`${itemId}: measured body coverage changed`);
    for(const bodyId of coveredBodies){const profile=entry.profiles[bodyId],landmark=landmarks.bodies[bodyId];assert.equal(profile.status,'candidate');assert.equal(profile.certified,false);assert.equal(profile.source,'gpt-pilot+human-candidate');assert.equal(profile.bodyId,landmark.bodyId,`${itemId}/${bodyId}: profile transferred to another body`);assert.equal(profile.profileId,landmark.profileId);assert.equal(profile.bodySha256,landmark.bodySha256,`${itemId}/${bodyId}: stale profile hash`);assert.equal(landmark.origin,'gpt-pilot+human-candidate');assert.equal(landmark.eyewear?.status,'measured',`${itemId}/${bodyId}: body without measured landmarks`);
      assert.notEqual(profile.classification,'candidate-for-human-approval',`${itemId}/${bodyId}: user-rejected universal fit claim remained active`);if(profile.classification==='needs-human-review'){assert(profile.metrics.lensEyeAbsMaxCm<=.5,`${itemId}/${bodyId}: lens below eye limit`);assert(profile.metrics.templeEarAbsMaxCm<=1,`${itemId}/${bodyId}: short temple cannot be reviewed`);}else if(profile.classification==='blocked-baked-eyewear')assert.equal(landmark.eyewear.bakedEyewearConflict,true);else assert.equal(profile.classification,'needs-adjustment');
    }
  }
  for(const itemId of ['rebite-roxo','arco-orbital']){const entry=eyewear.eyewear[itemId];assert.equal(entry.approved,false);assert.deepEqual(entry.profiles,{},`${itemId}: rejected item gained a body profile`);}
  assert.equal(report.schemaVersion,'cs-fit-matrix/1');assert.equal(report.reportedDefect,'encaixe depende do rosto e da cabeca; oval vermelho ainda estava fora de posicao e escala');assert.equal(report.certifiedPairs,0);assert.equal(report.eyewear.length,8);assert.equal(report.headwear.length,0);same(report.views,['front','threeQuarter','profile']);assert.equal(report.summary.assetAndPipeline.state,'body-specific-study');assert.deepEqual(report.summary.measuredPairs,{eyewear:8,headwear:0});assert.deepEqual(report.summary.humanDecision,{state:'pending',certifiedPairs:0,storeEnabled:false});
  for(const row of report.eyewear){const entry=eyewear.eyewear[row.itemId],profile=entry?.profiles?.[row.bodyId],landmark=landmarks.bodies[row.bodyId];assert(profile&&landmark,'orphan eyewear matrix row');assert.equal(row.bodySha256,landmark.bodySha256);assert.equal(row.assetSha256,entry.sha256);assert.equal(row.profileStatus,'candidate');assert.equal(row.classification,profile.classification);assert.equal(row.certified,false);same(row.poses.map(sample=>sample.pose),poses);for(const sample of row.poses){assert(sample.metrics&&finite(sample.metrics.lensEyeCm)&&finite(sample.metrics.clippingPct),'eyewear measurements missing');for(const side of ['left','right']){const metric=sample.metrics[side],ends=[metric?.templeEarCm,metric?.templeEarVerticalCm];assert(metric&&ends.every(value=>value===null||finite(value))&&finite(metric.sunkFraction),`${row.itemId}/${row.bodyId}/${sample.pose}/${side}: temple measurements missing`);}}}
  const cap=factory.items.find(item=>item.id==='treta-cap-procedural-v1');assert(cap&&cap.inventoryStatus==='deferred');assert.equal(cap.asset.sha256,hash(cap.asset.path));assert.equal(cap.asset.bytes,readFileSync(join(root,cap.asset.path)).length);assert.equal(cap.runtimeEnabled,false);assert(Object.values(cap.approvals).every(value=>value===false));assert.deepEqual(cap.certifiedBodies,[]);assert.deepEqual(cap.certifiedFamilies,[]);assert.deepEqual(cap.fitProfiles,[],'headwear fitting must stay deferred');
  const headSlot=factory.slots.head;assert.equal(headSlot.fitPolicy,'deferred-per-body');same(headSlot.knownIncompatibleBodies.map(row=>row.bodyId),['character:lobisomem','character:julia-zanatta'],'known headwear conflicts changed');
  validateOvalCapitao(eyewear,landmarks,report);
  return {eyewearPairs:report.eyewear.length,capPairs:report.headwear.length,certified:0};
}
function mutants(){
  const cases={
    'lens-low':data=>{data.eyewear.eyewear['metal-de-rua'].profiles.capitao.metrics.lensEyeAbsMaxCm=3;data.eyewear.eyewear['metal-de-rua'].profiles.capitao.classification='needs-human-review';},
    'uncorrected-eye-line':data=>{data.landmarks.bodies.capitao.eyewear.eyeLineY=data.landmarks.bodies.capitao.eyewear.pilotEyeLineY;},
    'temple-short':data=>{data.eyewear.eyewear['ouro-de-quebrada'].profiles.capitao.metrics.templeEarAbsMaxCm=3;data.eyewear.eyewear['ouro-de-quebrada'].profiles.capitao.classification='needs-human-review';},
    'stale-hash':data=>{data.eyewear.eyewear['metal-de-rua'].profiles.capitao.bodySha256='0'.repeat(64);},
    'stale-landmark-hash':data=>{data.landmarks.bodies.esquerdomacho.bodySha256='0'.repeat(64);},
    'body-without-landmark':data=>{data.landmarks.bodies.capitao.eyewear=null;},
    'universal-fit-claim':data=>{data.eyewear.eyewear['metal-de-rua'].profiles.capitao.classification='candidate-for-human-approval';},
    'headwear-reenabled':data=>{data.factory.items.find(item=>item.id==='treta-cap-procedural-v1').fitProfiles.push({bodyId:'character:capitao'});},
    'profile-transferred':data=>{data.eyewear.eyewear['metal-de-rua'].profiles.capitao.bodyId='character:barbudo';},
    'oval-90-bad-fit':data=>{const profile=data.eyewear.eyewear['oval-90'].profiles.capitao;Object.assign(profile,{classification:'needs-adjustment',frontFrameFit:false,width:.96,depth:.08,templeScale:1.25,templeSpreadL:.2,templeSpreadR:.45});delete profile.frameHeightScale;delete profile.templeScaleL;delete profile.templeScaleR;},
'integrated-retarget-historical-shas':data=>{const expectedId='character:esquerdomacho',output=NORMAL_ONLY_EQUIVALENCE[expectedId].exactOutputSha,landmark=data.landmarks.bodies.esquerdomacho;landmark.bodySha256=output;landmark.profileId=`${expectedId}@${output.slice(0,12)}`;for(const itemId of coveredItems){const profile=data.eyewear.eyewear[itemId].profiles.esquerdomacho;profile.bodySha256=output;profile.profileId=landmark.profileId;}let rows=0;for(const row of data.report.eyewear)if(row.bodyId==='esquerdomacho'){row.bodySha256=output;rows++;}assert.equal(rows,4,'retarget mutante exige quatro linhas reais de Esquerdomacho');},
'exception-borrowed-by-barbudo':data=>{const donor=data.landmarks.bodies.esquerdomacho,borrower=data.landmarks.bodies.barbudo;borrower.bodyId=donor.bodyId;borrower.model=donor.model;borrower.bodySha256=donor.bodySha256;borrower.profileId=donor.profileId;},
  },result=[];
  for(const [name,mutate]of Object.entries(cases)){const data=structuredClone(inputs());mutate(data);let killed=false,reason='';try{validate(data);}catch(error){killed=true;reason=error.message;}assert(killed,`${name} mutant survived`);result.push({name,killed,reason});}
  return result;
}
const mutation=process.argv.includes('--mutate');const result=validate(inputs()),killed=mutation?mutants():[];console.log(`eyewear-fit ${mutation?'mutate':'check'}: ${JSON.stringify({...result,mutants:killed})}`);
