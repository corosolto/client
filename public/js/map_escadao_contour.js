import * as THREE from 'three';
import {InstBatch} from './mapprops.js';
export const ESCADAO_CONTOUR = Object.freeze({x:16.4,width:2.2,start:4.5,end:-5.44,top:7.56,steps:36});
export function contourHeight(x,z) {
  const c=ESCADAO_CONTOUR;
  if(Math.abs(Math.abs(x)-c.x)>c.width/2||z<c.end||z>c.start)return undefined;
  return Math.min(c.top,c.top/c.steps/2+c.top*(c.start-z)/(c.start-c.end));
}
export function buildEscadaoContour({root,colliders,occluders,concrete,guard}) {
  const c=ESCADAO_CONTOUR,run=(c.start-c.end)/c.steps,rise=c.top/c.steps;
  const group=new THREE.Group();group.name='ESCADAO_ESCADAS_CONTORNO';root.add(group);
  const batch=new InstBatch(),geo=new THREE.BoxGeometry(1,1,1),pose=new THREE.Object3D();
  const box=(x,y,z,w,h,d,mat,solid=false)=>{
    pose.position.set(x,y+h/2,z);pose.scale.set(w,h,d);batch.add(geo,mat,pose);
    if(solid)colliders.push({minX:x-w/2,maxX:x+w/2,minY:y,maxY:y+h,minZ:z-d/2,maxZ:z+d/2});
  };
  for(const side of [-1,1]) {
    for(let i=0;i<c.steps;i++)box(side*c.x,0,c.start-(i+.5)*run,c.width,(i+1)*rise,run,concrete);
    for(const edge of [-1,1])for(let i=0;i<c.steps;i+=4)
      box(side*c.x+edge*(c.width/2-.07),i*rise,c.start-(i+2)*run,.14,1.05+4*rise,4*run,guard,true);
  }
  batch.build(group);for(const mesh of group.children)occluders.push(mesh);
  return group;
}
