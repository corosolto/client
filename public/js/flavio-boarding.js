import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {assetUrl} from './data/asseturl.js';
import {buildCharacterModel,preloadCharacterAssets} from './glbchars.js';
import {solveCCDIK} from './handik.js';

const WALK_END=5.4, DOOR_END=6.8;
const release = resources => {for(const resource of resources)resource.dispose();resources.clear();};
// Fault-tolerant owned release: each resource is removed from the set BEFORE dispose so a throwing dispose cannot re-enter or block the remaining ones; other resources still release.
const releaseOwned = resources => {for(const resource of [...resources]){resources.delete(resource);try{resource.dispose();}catch{}}};

export class FlavioBoarding {
  constructor(game) {
    this.game=game;
    this.resources=new Set();
    this.session=null;
    this.disposed=false;
    this.target=new THREE.Vector3(0,2.1,55);
  }

  _load() {
    const pending=this.ready ??= new GLTFLoader().loadAsync(assetUrl('models/cinematics/operacao_flavio_boarding.glb')).then(gltf=>{
      const stage=gltf.scene;
      stage.traverse(object=>{
        if(!object.isMesh)return;
        object.castShadow=true;object.receiveShadow=true;
        this.resources.add(object.geometry);
        for(const material of Array.isArray(object.material)?object.material:[object.material]) {
          this.resources.add(material);
          for(const value of Object.values(material))if(value?.isTexture)this.resources.add(value);
        }
      });
      if(this.disposed){release(this.resources);return null;}
      const content=stage.getObjectByName('boarding-stage') || stage;
      this.door=stage.getObjectByName('boarding-door-pivot');
      if(!this.door){release(this.resources);this._invalidate(pending);return null;}
      this.openDoor=this.door.quaternion.clone();
      this.plane=new THREE.Group();this.plane.name='flavio-boarding-plane';content.add(this.plane);
      for(const child of [...content.children]) {
        if(child!==this.plane && !['GEO-boarding-stairs','GEO-boarding-entry'].includes(child.name))this.plane.add(child);
      }
      this.floor=[];
      stage.traverse(object=>{if(object.isMesh && ['GEO-boarding-stairs','GEO-boarding-entry','GEO-boarding-threshold','GEO-boarding-cabin-floor'].includes(object.name))this.floor.push(object);});
      this.stage=stage;this.content=content;
      stage.name='flavio-boarding-stage';stage.position.set(0,.08,55);stage.visible=false;
      return stage;
    }).catch(()=>{release(this.resources);this._invalidate(pending);return null;});
    return this.ready;
  }

  _invalidate(pending) {
    // Negative cache: a failed load frees own resources and drops only that pending promise so a later start reattempts the loader.
    // Identity guard preserves concurrent shared loads; a disposed board stays terminal (no resurrection).
    if(this.ready===pending && !this.disposed)this.ready=null;
  }

  start(vip,def,isCurrent=()=>true) {
    this.stop();
    if(this.disposed || !def?.id)return Promise.resolve(false);
    const session={vip,def,isCurrent,hidden:new Map(),owned:new Set(),actor:null,last:0,vipVisible:vip?.mesh?.group?.visible ?? true};
    this.session=session;
    return Promise.all([this._load(),preloadCharacterAssets([def.id],{weapons:[]})]).then(([stage])=>{
      if(this.disposed || this.session!==session || !stage || !isCurrent())return false;
      const actor=buildCharacterModel(def,{weapon:false,ownedResources:session.owned});
      if(!actor)return false;
      session.actor=actor;actor.group.name='flavio-boarding-vip';this.content.add(actor.group);
      actor.group.position.set(3.8,0,-3);actor.group.rotation.y=-Math.PI/2;
      const originalPlane=this.game.world.objectivePlane;
      const stairs=this.game.world.root.getObjectByName('escada_embarque') || this.game.world.root.getObjectByName('fallback-escada_embarque');
      for(const object of [originalPlane,stairs])if(object){session.hidden.set(object,object.visible);object.visible=false;}
      this.game.world.root.add(stage);stage.visible=true;
      this._buildProfile();
      if(!this._prepareFeet(session,actor)){this._rollback(session);return false;}
      if(!isCurrent()){this._rollback(session);return false;}
      this._hideVip(session);
      return true;
    }).catch(()=>{this._rollback(session);return false;});
  }

  _rollback(session) {
    // Rollback runs only while the captured session still owns this board: a stale failure must not tear down a newer session on the same instance.
    // World/actor/owned restore happens exactly once; cleanup errors are contained so start() keeps resolving false instead of rejecting.
    if(this.session!==session)return;
    try{this.stop();}catch{}
  }

  _hideVip(session) {
    const group=session.vip?.mesh?.group;
    if(!group)return;
    if(!session.hidden.has(group))session.hidden.set(group,session.vipVisible);
    group.visible=false;
  }

  _buildFloorIndex() {
    if(this.floorIndex)return;
    const size=.1,index=new Map(),add=(key,triangle)=>{const list=index.get(key);list?list.push(triangle):index.set(key,[triangle]);};
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),edge1=new THREE.Vector3(),edge2=new THREE.Vector3(),normal=new THREE.Vector3();
    for(const mesh of this.floor) {
      const position=mesh.geometry.getAttribute('position'),indices=mesh.geometry.getIndex();
      const count=indices?indices.count:position.count;
      for(let i=0;i<count;i+=3) {
        const ia=indices?indices.getX(i):i,ib=indices?indices.getX(i+1):i+1,ic=indices?indices.getX(i+2):i+2;
        a.fromBufferAttribute(position,ia).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(position,ib).applyMatrix4(mesh.matrixWorld);
        c.fromBufferAttribute(position,ic).applyMatrix4(mesh.matrixWorld);
        edge1.copy(b).sub(a);edge2.copy(c).sub(a);normal.crossVectors(edge1,edge2);
        if(normal.lengthSq()===0)continue;
        normal.normalize();
        const normalY=normal.y;
        if(normalY<=.5)continue;
        const triangle={a:a.clone(),b:b.clone(),c:c.clone(),normalY};
        const minX=Math.floor(Math.min(a.x,b.x,c.x)/size),maxX=Math.floor(Math.max(a.x,b.x,c.x)/size);
        const minZ=Math.floor(Math.min(a.z,b.z,c.z)/size),maxZ=Math.floor(Math.max(a.z,b.z,c.z)/size);
        for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++)add(x+'|'+z,triangle);
      }
    }
    this.floorCell=size;this.floorIndex=index;
  }

  _floorAt(x,z,minNormal) {
    const index=this.floorIndex;
    if(index) {
      const candidates=index.get(Math.floor(x/this.floorCell)+'|'+Math.floor(z/this.floorCell));
      if(candidates && candidates.length) {
        const ray=new THREE.Ray(new THREE.Vector3(x,4.5,z),new THREE.Vector3(0,-1,0)),hit=new THREE.Vector3();
        let best=-Infinity;
        for(const triangle of candidates) {
          if(triangle.normalY<=minNormal)continue;
          if(ray.intersectTriangle(triangle.a,triangle.b,triangle.c,false,hit) && hit.y>=-.5 && hit.y<=4.5 && hit.y>best)best=hit.y;
        }
        if(best>-Infinity)return best;
      }
    }
    return this.game.world.groundHeightAt(x,z);
  }

  _buildProfile() {
    if(this.treads)return;
    this.stage.updateMatrixWorld(true);
    this._buildFloorIndex();
    const ground=this.game.world.groundHeightAt(3.8,52),levels=[];
    for(let x=3.8;x>=.2;x-=.01) {
      const y=this._floorAt(x,52,.999);
      if(y<ground+.04)continue;
      const previous=levels.at(-1);
      if(!previous || y>previous.y+.04)levels.push({minX:x,maxX:x,y,heights:[y]});
      else if(Math.abs(y-previous.y)<.04){previous.minX=x;previous.heights.push(y);}
    }
    for(const level of levels) {
      level.heights.sort((a,b)=>a-b);level.y=level.heights[Math.floor(level.heights.length/2)];
    }
    this.treads=levels;
  }

  _prepareFeet(session,actor) {
    actor.ctrl.update(0,0,false,0);this.stage.updateMatrixWorld(true);
    const meshes=[];actor.ctrl.model.traverse(object=>{if(object.isSkinnedMesh)meshes.push(object);});
    const feet=[];
    for(const side of ['Left','Right']) {
      const bone=meshes.map(mesh=>mesh.skeleton.getBoneByName(side+'Foot')).find(Boolean);
      const hip=meshes.map(mesh=>mesh.skeleton.getBoneByName(side+'UpLeg')).find(Boolean);
      const knee=meshes.map(mesh=>mesh.skeleton.getBoneByName(side+'Leg')).find(Boolean);
      if(!bone || !hip || !knee)return false;
      const vertices=[];
      for(const mesh of meshes) {
        const indices=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');
        if(!indices || !weights)continue;
        mesh.skeleton.update();
        for(let i=0;i<indices.count;i++) {
          let weight=0;
          for(const channel of ['getX','getY','getZ','getW'])
            if([side+'Foot',side+'ToeBase'].includes(mesh.skeleton.bones[indices[channel](i)]?.name))weight+=weights[channel](i);
          if(weight>=.5)vertices.push({mesh,index:i,p:mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld)});
        }
      }
      if(!vertices.length)return false;
      const bounds=new THREE.Box3().setFromPoints(vertices.map(item=>item.p));
      const center=bounds.getCenter(new THREE.Vector3());center.y=bounds.min.y;
      const selected=new Set();
      for(const axis of ['x','y','z'])for(const direction of [-1,1])
        selected.add(vertices.reduce((a,b)=>a.p[axis]*direction<b.p[axis]*direction?a:b));
      for(const vertex of vertices)if(vertex.p.y<=bounds.min.y+(bounds.max.y-bounds.min.y)*.25)selected.add(vertex);
      const toe=meshes.map(mesh=>mesh.skeleton.getBoneByName(side+'ToeBase')).find(Boolean);
      feet.push({bone,chain:[hip,knee],toe,toeRest:toe?.quaternion.clone(),
        orientation:bone.getWorldQuaternion(new THREE.Quaternion()).normalize(),
        offset:center.clone().sub(bone.getWorldPosition(new THREE.Vector3())),
        length:hip.getWorldPosition(new THREE.Vector3()).distanceTo(knee.getWorldPosition(new THREE.Vector3()))
          +knee.getWorldPosition(new THREE.Vector3()).distanceTo(bone.getWorldPosition(new THREE.Vector3())),
        samples:[...selected].map(({mesh,index,p})=>({mesh,index,relative:p.clone().sub(center)})),center,front:center.x-bounds.min.x});
    }
    if(this.treads.length<2)return false;
    const actorPosition=actor.group.getWorldPosition(new THREE.Vector3());
    const average=feet[0].center.clone().add(feet[1].center).multiplyScalar(.5);
    session.rootBias=actorPosition.clone().sub(average);
    session.soleDelta=Math.min(...feet.map(foot=>foot.center.y))-actorPosition.y;
    session.feet=feet;
    const front=Math.max(...feet.map(foot=>foot.front)),steps=[];
    let previous=average.x;
    for(const level of this.treads.slice(0,-1)) {
      const x=Math.min(previous-.04,level.minX+front+.025);
      steps.push({x,y:level.y+.003});previous=x;
    }
    const top=this.treads.at(-1);
    previous=Math.min(previous-.04,top.maxX+front-.05);
    steps.push({x:previous,y:top.y+.003});
    while(previous-.30>.35){previous-=.30;steps.push({x:previous,y:top.y+.003});}
    steps.push({x:.35,y:top.y+.003},{x:.35,y:top.y+.003});
    session.initial=feet.map(foot=>new THREE.Vector3(foot.center.x,this._support(foot,foot.center.x,foot.center.z),foot.center.z));
    const previousFeet=session.initial.map(point=>point.clone());
    for(let i=0;i<steps.length;i++) {
      const foot=feet[i%2],step=steps[i],from=previousFeet[i%2];
      step.y=this._support(foot,step.x,from.z);
      let apex=Math.max(from.y,step.y);
      const samples=Math.max(1,Math.ceil(Math.abs(from.x-step.x)/.04));
      for(let j=1;j<samples;j++)apex=Math.max(apex,this._support(foot,THREE.MathUtils.lerp(from.x,step.x,j/samples),from.z));
      step.apex=apex+.14;previousFeet[i%2].set(step.x,step.y,from.z);
    }
    session.steps=steps;
    return true;
  }

  _support(foot,x,z) {
    let height=-Infinity;
    for(const {relative} of foot.samples)
      height=Math.max(height,this._floorAt(x+relative.x,z+relative.z,.5)-relative.y);
    return height+.003;
  }

  _targets(session,elapsed,taxi) {
    const targets=session.initial.map(point=>point.clone()),scaled=Math.min(1,Math.max(0,elapsed/WALK_END))*session.steps.length;
    const completed=Math.min(session.steps.length,Math.floor(scaled));
    for(let i=0;i<completed;i++){const step=session.steps[i];targets[i%2].set(step.x,step.y,targets[i%2].z);}
    if(completed<session.steps.length) {
      const foot=targets[completed%2],from=foot.clone(),step=session.steps[completed],t=scaled-completed;
      const smooth=value=>value*value*(3-2*value),apex=step.apex;
      if(t<.25)foot.y=THREE.MathUtils.lerp(from.y,apex,smooth(t*4));
      else if(t<.75){foot.x=THREE.MathUtils.lerp(from.x,step.x,smooth((t-.25)*2));foot.y=apex;}
      else{foot.x=step.x;foot.y=THREE.MathUtils.lerp(apex,step.y,smooth((t-.75)*4));}
    }
    for(const point of targets)point.z+=taxi;
    return targets;
  }

  _solePosition(foot) {
    const bounds=new THREE.Box3();
    for(const {mesh,index} of foot.samples) {
      bounds.expandByPoint(mesh.getVertexPosition(index,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
    }
    const point=bounds.getCenter(new THREE.Vector3());point.y=bounds.min.y;return point;
  }

  _solveFoot(foot,sole) {
    const target=sole.clone().sub(foot.offset);
    for(let pass=0;pass<3;pass++) {
      solveCCDIK(foot.chain,foot.bone,target,{reach:false,iterations:18,maxStep:.4});
      const parent=foot.bone.parent.getWorldQuaternion(new THREE.Quaternion());
      foot.bone.quaternion.copy(parent.invert().multiply(foot.orientation));
      if(foot.toe)foot.toe.quaternion.copy(foot.toeRest);
      foot.bone.updateWorldMatrix(true,true);
      const difference=sole.clone().sub(this._solePosition(foot));
      if(difference.length()<.001)break;
      target.add(difference);
    }
  }

  _gait(session,actor,elapsed,taxi) {
    const targets=this._targets(session,elapsed,taxi);
    const center=targets[0].clone().add(targets[1]).multiplyScalar(.5).add(session.rootBias);
    center.y=Math.min(targets[0].y,targets[1].y)-session.soleDelta;
    actor.group.position.copy(this.content.worldToLocal(center));this.stage.updateMatrixWorld(true);
    let drop=0;
    for(let i=0;i<session.feet.length;i++) {
      const foot=session.feet[i],hip=foot.chain[0].getWorldPosition(new THREE.Vector3()),target=targets[i].clone().sub(foot.offset);
      const horizontal=(hip.x-target.x)**2+(hip.z-target.z)**2;
      const vertical=Math.sqrt(Math.max(0,(foot.length*.985)**2-horizontal));
      drop=Math.max(drop,hip.y-target.y-vertical);
    }
    if(drop>0){actor.group.position.y-=drop;this.stage.updateMatrixWorld(true);}
    for(let i=0;i<session.feet.length;i++)this._solveFoot(session.feet[i],targets[i]);
  }

  update(elapsed) {
    const session=this.session,actor=session?.actor;
    if(session && !session.isCurrent()){this.stop();return false;}
    if(this.disposed || !actor || !this.stage?.visible)return false;
    this._hideVip(session);
    const close=THREE.MathUtils.clamp((elapsed-WALK_END)/(DOOR_END-WALK_END),0,1);
    const taxi=Math.max(0,elapsed-DOOR_END)*5;
    this.plane.position.z=taxi;
    this.door.quaternion.copy(this.openDoor).slerp(new THREE.Quaternion(),close);
    const walking=elapsed<WALK_END;
    const dt=Math.max(0,elapsed-session.last);session.last=elapsed;
    actor.ctrl.update(dt,walking?1:0,false,walking?3.45/WALK_END:0);
    this._gait(session,actor,elapsed,taxi);
    if(actor.ctrl.shadow)actor.ctrl.shadow.visible=false;
    actor.group.visible=close<1;
    this.target.set(0,2.1,55+taxi);
    return true;
  }

  stop() {
    const session=this.session;this.session=null;
    if(session) {
      for(const [object,visible] of session.hidden)object.visible=visible;
      if(session.actor) {
        // Independent cleanup actions: a throwing mixer hook must not skip actor removal, owned release, stage hide/detach, or world restore (session is already cleared above).
        try{session.actor.mixer.stopAllAction();}catch{}
        try{session.actor.mixer.uncacheRoot(session.actor.ctrl.model);}catch{}
        session.actor.group.removeFromParent();
      }
      releaseOwned(session.owned);
    }
    if(this.stage){this.stage.visible=false;this.stage.removeFromParent();}
    if(this.plane)this.plane.position.z=0;
    if(this.door)this.door.quaternion.copy(this.openDoor);
  }

  dispose() {
    if(this.disposed)return;
    this.disposed=true;this.stop();
    this.floorIndex=null;
    this.stage?.removeFromParent();release(this.resources);
  }
}
