import {TRETA_ITEMS_ENABLED} from './treta-features.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const templates=new Map(),requests=new Map();let manifest;
export function eyewearProfile(entry,def) {
  if(!TRETA_ITEMS_ENABLED)return null;
  const profile=entry?.profiles?.[def.skinId || def.id];
  return entry?.approved===true && profile?.approved===true && [profile.width,profile.height,profile.depth].every(Number.isFinite)?profile:null;
}
export async function preloadEyewearAssets(ids=[]) {
  if(!TRETA_ITEMS_ENABLED)return;
  if(!ids.some(Boolean))return;
  manifest ??=fetch('/models/items/eyewear-manifest.json').then(r=>{if(!r.ok)throw new Error('eyewear_manifest');return r.json();}).catch(()=>{manifest=null;return {eyewear:{}};});
  const data=await manifest;
  await Promise.all([...new Set(ids.filter(Boolean))].map(async id=>{
    const entry=data.eyewear?.[id];
    if(entry?.approved!==true || !/^\/models\/items\/[a-z0-9-]+\.glb$/.test(entry.model || '') || !Object.values(entry.profiles || {}).some(p=>p.approved===true))return;
    if(templates.has(id))return;if(requests.has(id))return requests.get(id);
    const request=new GLTFLoader().loadAsync(entry.model).then(g=>templates.set(id,{entry,model:g.scene})).catch(e=>console.warn(`[eyewear] ${id}: ${e.message}`)).finally(()=>requests.delete(id));requests.set(id,request);return request;
  }));
}
export function mountEyewear(model,def) {
  if(!TRETA_ITEMS_ENABLED)return null;
  const template=templates.get(def.eyewearId),profile=eyewearProfile(template?.entry,def);if(!profile)return null;
  let body;model.traverse(o=>{if(!body && o.isSkinnedMesh && o.skeleton.bones.some(b=>b.name==='Head'))body=o;});if(!body)return null;
  const index=body.skeleton.bones.findIndex(b=>b.name==='Head'),head=body.skeleton.bones[index],p=body.geometry.getAttribute('position'),si=body.geometry.getAttribute('skinIndex'),sw=body.geometry.getAttribute('skinWeight');if(!p || !si || !sw)return null;
  const bounds=new THREE.Box3(),v=new THREE.Vector3(),get=['getX','getY','getZ','getW'];
  for(let i=0;i<p.count;i++){let weight=0;for(let k=0;k<4;k++)if(si[get[k]](i)===index)weight+=sw[get[k]](i);if(weight>.65)bounds.expandByPoint(v.fromBufferAttribute(p,i));}
  if(bounds.isEmpty())return null;
  const accessory=template.model.clone(true),assetBox=new THREE.Box3().setFromObject(accessory),size=bounds.getSize(new THREE.Vector3()),assetSize=assetBox.getSize(new THREE.Vector3());if(assetSize.x<=0)return null;
  const scale=size.x*profile.width/assetSize.x,center=assetBox.getCenter(new THREE.Vector3()),lensY=assetBox.min.y+assetSize.y*(profile.lensY ?? .5);
  accessory.scale.setScalar(scale);accessory.position.set(-center.x*scale,-lensY*scale,-assetBox.max.z*scale);
  accessory.traverse(o=>{if(o.isMesh){o.userData.noHit=true;o.raycast=()=>{};o.castShadow=false;o.receiveShadow=true;}});
  const anchor=new THREE.Group();anchor.name='TRETA-eyewear';anchor.userData.eyewearId=def.eyewearId;anchor.position.set(bounds.getCenter(new THREE.Vector3()).x,bounds.min.y+size.y*profile.height,bounds.max.z+size.z*profile.depth);anchor.updateMatrix();anchor.matrix.premultiply(new THREE.Matrix4().copy(body.skeleton.boneInverses[index]).multiply(body.bindMatrix));anchor.matrixAutoUpdate=false;anchor.add(accessory);head.add(anchor);return anchor;
}
