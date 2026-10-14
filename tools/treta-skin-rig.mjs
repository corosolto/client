import * as THREE from '../public/vendor/three.module.js';
import {GLTFLoader} from '../public/vendor/addons/loaders/GLTFLoader.js';

// Osso de flexão simples: pivô e inverse-bind no espaço LOCAL da mão.
// Preserva a bind pose e o total de pesos; não transplanta o rig de outra skin.
export function addGripRig(doc){
  const root=doc.getRoot(),report=[];
  for(const side of ['Right','Left']){
    const hand=root.listNodes().find(n=>n.getName()===`${side}Hand`);
    for(const skin of root.listSkins()){
      const joints=skin.listJoints(),hi=joints.indexOf(hand);if(hi<0)throw new Error('Missing hand');
      const inverse=new THREE.Matrix4().fromArray(skin.getInverseBindMatrices().getArray(),hi*16);
      const samples=[];
      for(const node of root.listNodes().filter(n=>n.getSkin()===skin))for(const p of node.getMesh().listPrimitives()){
        const positions=p.getAttribute('POSITION'),ji=p.getAttribute('JOINTS_0'),w=p.getAttribute('WEIGHTS_0');
        const local=new THREE.Vector3();
        for(let i=0;i<positions.getCount();i++){
          const ids=ji.getElement(i,[]),weights=w.getElement(i,[]);
          if(ids.some((id,k)=>id===hi && weights[k]>.5)){
            local.fromArray(positions.getElement(i,[])).applyMatrix4(inverse);samples.push(local.y);
          }
        }
      }
      samples.sort((a,b)=>a-b);if(samples.length<12)throw new Error('Insufficient hand geometry');
      const pivot=samples[Math.floor(samples.length*.45)],end=samples[Math.floor(samples.length*.95)];
      const bone=doc.createNode(`Curl_${side==='Right'?'R':'L'}`).setTranslation([0,pivot,0]);hand.addChild(bone);
      const ci=joints.length;skin.addJoint(bone);
      const old=skin.getInverseBindMatrices().getArray(),ibm=new Float32Array(old.length+16);ibm.set(old);
      ibm.set(new THREE.Matrix4().makeTranslation(0,-pivot,0).multiply(inverse).toArray(),old.length);skin.getInverseBindMatrices().setArray(ibm);
      let changed=0;
      for(const node of root.listNodes().filter(n=>n.getSkin()===skin))for(const p of node.getMesh().listPrimitives()){
        const positions=p.getAttribute('POSITION'),ji=p.getAttribute('JOINTS_0'),weights=p.getAttribute('WEIGHTS_0'),v=new THREE.Vector3();
        for(let i=0;i<positions.getCount();i++){
          const ids=ji.getElement(i,[]),w=weights.getElement(i,[]),slot=ids.findIndex((id,k)=>id===hi && w[k]>.3),free=w.findIndex(x=>x===0);
          if(slot<0 || free<0)continue;
          v.fromArray(positions.getElement(i,[])).applyMatrix4(inverse);
          const f=THREE.MathUtils.clamp((v.y-pivot)/Math.max(end-pivot,1e-6),0,1);if(f<=0)continue;
          const moved=w[slot]*f;w[slot]-=moved;w[free]=moved;ids[free]=ci;ji.setElement(i,ids);weights.setElement(i,w);changed++;
        }
      }
      if(changed<10)throw new Error('Grip rig has no finger weights');report.push({side,pivot,changed});
    }
  }
  return report;
}

// Parseia a geometria com o MESMO loader do jogo sem precisar de imagem/DOM.
// Apenas esta cópia de medição perde materiais; o documento final os preserva.
export async function bakeGround(doc,io){
  const binary=await io.writeBinary(doc),raw=Buffer.from(binary),jsonSize=raw.readUInt32LE(12);
  const j=JSON.parse(raw.subarray(20,20+jsonSize));
  delete j.materials;delete j.textures;delete j.images;delete j.extensionsUsed;delete j.extensionsRequired;
  for(const m of j.meshes)for(const p of m.primitives)delete p.material;
  const json=Buffer.from(JSON.stringify(j)),padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
  const bin=raw.subarray(20+jsonSize),header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+bin.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const measurement=Buffer.concat([header,padded,bin]);
  const g=await new GLTFLoader().parseAsync(measurement.buffer.slice(measurement.byteOffset,measurement.byteOffset+measurement.byteLength),'');
  const model=g.scene;
  // A malha pode preceder os ossos na árvore. Box3 atualiza só o ramo da
  // malha; medir antes de propagar TODOS os ossos produz um piso falso.
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model),s=1.72/(bounds.max.y-bounds.min.y);
  model.scale.setScalar(s);model.position.y=-bounds.min.y*s;model.updateMatrixWorld(true);
  let mesh;model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});
  const hips=model.getObjectByName('Hips'),v=new THREE.Vector3(),mixer=new THREE.AnimationMixer(model),report={};
  for(const anim of doc.getRoot().listAnimations()){
    const name=anim.getName();if(['showroomIdle','jump'].includes(name))continue;
    const clip=g.animations.find(c=>c.name===name),action=mixer.clipAction(clip).setLoop(THREE.LoopOnce,1);
    action.clampWhenFinished=true;
    const track=anim.listChannels().find(c=>c.getTargetNode().getName()==='Hips' && c.getTargetPath()==='translation');
    if(!track)throw new Error('Missing root translation');
    const times=track.getSampler().getInput().getArray(),array=new Float32Array(track.getSampler().getOutput().getArray());
    const scale=new THREE.Vector3();hips.parent.getWorldScale(scale);let worst=0;
    mixer.stopAllAction();action.reset().play();
    for(let i=0;i<times.length;i++){
      mixer.setTime(times[i]);model.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity;
      for(let k=0;k<mesh.geometry.attributes.position.count;k++){mesh.getVertexPosition(k,v).applyMatrix4(mesh.matrixWorld);min=Math.min(min,v.y);}
      array[i*3+1]-=min/scale.y;worst=Math.max(worst,Math.abs(min));
    }
    track.getSampler().getOutput().setArray(array);report[name]={frames:times.length,maxCorrectionMeters:worst};
  }
  return report;
}
