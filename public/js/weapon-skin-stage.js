import * as THREE from 'three';
import {preloadWeapons,weaponModel} from './weapons.js';
import {preloadWeaponSkinCandidate} from './weapon-skins.js';

export class WeaponSkinStage {
  constructor(host) {
    this.host=host;this.disposed=false;this.dragging=false;this.lastX=0;this.lastY=0;
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(30,1,.01,100);
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.35;
    this.renderer.domElement.setAttribute('aria-label','Skin de arma em 3D. Arraste para girar.');
    host.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xdde8ff,0x241910,2.2));
    for(const [color,intensity,position] of [[0xffe1b8,5,[3,4,5]],[0x6ca8ff,4,[-3,2,-4]],[0xffffff,2,[-2,4,3]]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(...position);this.scene.add(light);}
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',event=>{this.dragging=true;this.lastX=event.clientX;this.lastY=event.clientY;canvas.setPointerCapture(event.pointerId);});
    canvas.addEventListener('pointermove',event=>{if(!this.dragging || !this.model)return;this.model.rotation.y+=(event.clientX-this.lastX)*.008;this.model.rotation.z+=(event.clientY-this.lastY)*.004;this.lastX=event.clientX;this.lastY=event.clientY;});
    canvas.addEventListener('pointerup',()=>{this.dragging=false;});
    this.resize=()=>{if(this.disposed)return;const {width,height}=host.getBoundingClientRect();this.renderer.setSize(Math.max(1,width),Math.max(1,height),false);this.camera.aspect=width/Math.max(1,height);if(this.radius){const distance=this.radius*3.6;this.camera.position.set(distance,distance*.16,distance*.08);this.camera.lookAt(0,0,0);}this.camera.updateProjectionMatrix();this.renderer.render(this.scene,this.camera);};
    this.observer=new ResizeObserver(this.resize);this.observer.observe(host);
    this.renderer.setAnimationLoop(()=>{if(!this.disposed && !document.hidden)this.renderer.render(this.scene,this.camera);});
  }
  async load(weaponId,skinId) {
    const started=performance.now();
    await Promise.all([preloadWeapons([weaponId]),preloadWeaponSkinCandidate(skinId)]);
    if(this.disposed)return;
    const model=weaponModel(weaponId,skinId);
    if(!model)throw new Error(`weapon_model_unavailable:${weaponId}`);
    this.model=model;this.scene.add(model);model.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
    model.position.sub(center);model.updateMatrixWorld(true);this.radius=Math.max(size.x,size.y,size.z)*.68;this.resize();
    this.host.dispatchEvent(new CustomEvent('cs-treta-stage-ready',{bubbles:true,detail:{loadMs:Math.round(performance.now()-started),weaponId,skinId,fitsViewport:true}}));
  }
  snapshot(){this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');}
  dispose(){if(this.disposed)return;this.disposed=true;this.observer.disconnect();this.renderer.setAnimationLoop(null);if(this.model){this.model.traverse(object=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material])material?.dispose();});this.model.removeFromParent();}this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
