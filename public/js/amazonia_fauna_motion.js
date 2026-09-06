import * as THREE from 'three';

const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const PROFILES = {
  onca: { pivot: [.31,.53,.62], floor:.2, yaw:.22, nod:.07, axis:'z', neck:(x,y)=>smooth(.43,.7,y)*(1-smooth(.48,.69,x)) },
  tucano: { pivot:[.54,.58,.5], floor:.46, yaw:.32, nod:.13, axis:'z', neck:(x,y)=>smooth(.53,.71,y) },
  hen: { pivot:[.67,.62,.5], floor:.26, yaw:.15, nod:.32, axis:'z', neck:(x,y)=>smooth(.52,.75,y)*smooth(.44,.67,x) },
  chick: { pivot:[.5,.6,.65], floor:.24, yaw:.18, nod:.2, axis:'x', neck:(x,y,z)=>smooth(.51,.75,y)*smooth(.36,.6,z) },
  jacare: { pivot:[.36,.45,.5], floor:.22, yaw:.08, nod:.025, axis:'z', neck:(x,y)=> (1-smooth(.24,.48,x))*smooth(.22,.43,y) },
  capivara: { pivot:[.5,.55,.65], floor:.24, yaw:.18, nod:.11, axis:'x', neck:(x,y,z)=>smooth(.47,.72,z)*smooth(.38,.63,y) },
};

function prepare(root, type, phase, animal) {
  const profile=PROFILES[type], parts=[], box=new THREE.Box3(), point=new THREE.Vector3();
  root.updateWorldMatrix(true,true);
  const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert();
  root.traverse(mesh=>{
    if(!mesh.isMesh || mesh.isSkinnedMesh || !mesh.geometry.attributes.position) return;
    const source=mesh.geometry, geometry=source.clone(), attribute=source.attributes.position;
    const original=new Float32Array(attribute.count*3), local=new Float32Array(attribute.count*3);
    const matrix=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
    for(let i=0;i<attribute.count;i++) {
      point.fromBufferAttribute(attribute,i);point.toArray(original,i*3);
      point.applyMatrix4(matrix);point.toArray(local,i*3);box.expandByPoint(point);
    }
    geometry.setAttribute('position',new THREE.BufferAttribute(original.slice(),3).setUsage(THREE.DynamicDrawUsage));
    if(!geometry.attributes.normal) geometry.computeVertexNormals();
    const normals=geometry.attributes.normal,originalNormals=new Float32Array(normals.count*3),localNormals=new Float32Array(normals.count*3);
    const normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix);
    for(let i=0;i<normals.count;i++) {
      point.fromBufferAttribute(normals,i);point.toArray(originalNormals,i*3);
      point.applyNormalMatrix(normalMatrix);point.toArray(localNormals,i*3);
    }
    geometry.setAttribute('normal',new THREE.BufferAttribute(originalNormals.slice(),3).setUsage(THREE.DynamicDrawUsage));
    mesh.geometry=geometry;
    const meshInverse=matrix.clone().invert();
    parts.push({mesh,source,geometry,original,local,originalNormals,localNormals,matrix,inverse:meshInverse,
      normalInverse:new THREE.Matrix3().getNormalMatrix(meshInverse),weights:new Float32Array(attribute.count*2),active:[]});
  });
  if(!parts.length) return null;
  const size=box.getSize(new THREE.Vector3()), pivot=new THREE.Vector3(...profile.pivot).multiply(size).add(box.min);
  for(const part of parts) for(let i=0;i<part.local.length;i+=3) {
    const x=(part.local[i]-box.min.x)/size.x,y=(part.local[i+1]-box.min.y)/size.y,z=(part.local[i+2]-box.min.z)/size.z;
    part.weights[i/3*2]=y<=profile.floor?0:profile.neck(x,y,z);
    part.weights[i/3*2+1]=y<=profile.floor?0:smooth(profile.floor,.55,y)*(1-smooth(.62,.84,y));
    if(part.weights[i/3*2]||part.weights[i/3*2+1]) part.active.push(i/3);
  }
  for(const part of parts) {
    part.geometry.computeBoundingSphere();
    part.inverse.decompose(new THREE.Vector3(),new THREE.Quaternion(),point);
    part.geometry.boundingSphere.radius+=size.length()*(profile.yaw+profile.nod+.007)*Math.max(Math.abs(point.x),Math.abs(point.y),Math.abs(point.z));
  }
  const position=animal?animal.origin.clone():root.position.clone(), rotation=root.rotation.clone(), scale=root.scale.clone();
  if(animal) {
    rotation.set(0,phase+(type==='onca'?Math.PI*1.5:0),0);
    scale.setScalar(1);
  }
  root.userData.motion='local-head-and-breathing';
  return {root,type,phase,animal,profile,parts,pivot,size,position,rotation,scale};
}

export function createAmazoniaFaunaMotion({ambience,quintal,jacare,capivaras=[]}) {
  const entries=[];
  const add=(root,type,phase=0,animal=null)=>{if(root){const entry=prepare(root,type,phase,animal);if(entry)entries.push(entry);}};
  for(const animal of ambience?.animals||[]) if(animal.type==='onca'||animal.type==='tucano') add(animal.root,animal.type,animal.phase,animal);
  for(const [i,root] of (quintal?.children||[]).entries()) add(root,i===0?'hen':'chick',i*1.7);
  add(jacare,'jacare',.8);
  capivaras.forEach((root,i)=>add(root,'capivara',1.2+i*2));
  const point=new THREE.Vector3(), scale=new THREE.Vector3();
  let lastTick=-Infinity, updates=0;
  function update(time) {
    for(const e of entries) if(e.animal) {
      e.root.position.copy(e.position);e.root.rotation.copy(e.rotation);e.root.scale.copy(e.scale);e.animal.state='idle';
    }
    const tick=Math.floor(time*20);
    if(tick===lastTick) return;
    lastTick=tick;updates++;
    for(const e of entries) {
      const t=tick/20+e.phase,p=e.profile;
      const yaw=Math.sin(t*.83)*p.yaw, nod=Math.sin(t*1.31+.6)*p.nod;
      const sy=Math.sin(yaw),cy=Math.cos(yaw),sn=Math.sin(nod),cn=Math.cos(nod);
      const breath=Math.sin(t*2.2)*e.size.y*.007;
      for(const part of e.parts) {
        const target=part.geometry.attributes.position,normals=part.geometry.attributes.normal;
        for(const i of part.active) {
          const j=i*3,head=part.weights[i*2],body=part.weights[i*2+1];
          const x=part.local[j]-e.pivot.x,y=part.local[j+1]-e.pivot.y,z=part.local[j+2]-e.pivot.z;
          let nx=cy*x+sy*z,ny=y,nz=-sy*x+cy*z;
          if(p.axis==='z') {const xx=cn*nx-sn*ny;ny=sn*nx+cn*ny;nx=xx;}
          else {const yy=cn*ny-sn*nz;nz=sn*ny+cn*nz;ny=yy;}
          point.set(part.local[j]+(nx-x)*head,part.local[j+1]+(ny-y)*head+breath*body*(1-head),part.local[j+2]+(nz-z)*head);
          point.applyMatrix4(part.inverse);target.setXYZ(i,point.x,point.y,point.z);
          if(head) {
            const bx=part.localNormals[j],by=part.localNormals[j+1],bz=part.localNormals[j+2];
            let rx=cy*bx+sy*bz,ry=by,rz=-sy*bx+cy*bz;
            if(p.axis==='z') {const xx=cn*rx-sn*ry;ry=sn*rx+cn*ry;rx=xx;}
            else {const yy=cn*ry-sn*rz;rz=sn*ry+cn*rz;ry=yy;}
            point.set(bx+(rx-bx)*head,by+(ry-by)*head,bz+(rz-bz)*head).applyNormalMatrix(part.normalInverse);
            normals.setXYZ(i,point.x,point.y,point.z);
          }
        }
        target.needsUpdate=true;normals.needsUpdate=true;
      }
    }
  }
  function snapshot() {
    return {updates,tick:lastTick,animals:entries.map(e=>{
      let maxHeadDelta=0,pinnedFootDelta=0,maxHeadNormalDelta=0,pinnedNormalDelta=0,headVertices=0,pinnedVertices=0;
      e.root.updateWorldMatrix(true,false);e.root.getWorldScale(scale);
      const worldScale=Math.max(scale.x,scale.y,scale.z);
      for(const part of e.parts) {
        const attribute=part.geometry.attributes.position,normals=part.geometry.attributes.normal;
        for(let i=0;i<attribute.count;i++) {
          point.fromBufferAttribute(attribute,i).applyMatrix4(part.matrix);
          const delta=Math.hypot(point.x-part.local[i*3],point.y-part.local[i*3+1],point.z-part.local[i*3+2])*worldScale;
          const normalDelta=Math.hypot(normals.getX(i)-part.originalNormals[i*3],normals.getY(i)-part.originalNormals[i*3+1],normals.getZ(i)-part.originalNormals[i*3+2]);
          if(part.weights[i*2]>.8){headVertices++;maxHeadDelta=Math.max(maxHeadDelta,delta);maxHeadNormalDelta=Math.max(maxHeadNormalDelta,normalDelta);}
          if(!part.weights[i*2]&&!part.weights[i*2+1]){pinnedVertices++;pinnedFootDelta=Math.max(pinnedFootDelta,delta);pinnedNormalDelta=Math.max(pinnedNormalDelta,normalDelta);}
        }
      }
      return {type:e.type,id:e.animal?.id,headVertices,pinnedVertices,maxHeadDelta,pinnedFootDelta,maxHeadNormalDelta,pinnedNormalDelta,rootDrift:e.root.position.distanceTo(e.position)};
    })};
  }
  function dispose() {
    for(const e of entries) for(const part of e.parts) {part.mesh.geometry=part.source;part.geometry.dispose();}
    entries.length=0;
  }
  return {update,snapshot,dispose};
}
