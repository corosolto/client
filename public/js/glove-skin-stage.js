import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {applyTeamHandMaterial} from './vmhands.js';

const GLOVE_MATERIAL=/CoroSolto_FP_Gloves/i;

export class GloveSkinStage {
  constructor(host) {
    this.host=host;this.disposed=false;this.dragging=false;this.lastX=0;this.model=null;this.mixer=null;
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(28,1,.01,100);
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.45;
    this.renderer.domElement.setAttribute('aria-label','Par de luvas em 3D. Arraste para girar.');
    host.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xdde8ff,0x180d16,2.6));
    for(const [color,intensity,position] of [[0xffffff,5,[3,4,5]],[0xff4fc4,3,[-3,1,-4]],[0x6ca8ff,3,[-2,4,3]]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(...position);this.scene.add(light);}
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',(event)=>{this.dragging=true;this.lastX=event.clientX;this.lastY=event.clientY;canvas.setPointerCapture(event.pointerId);});
    canvas.addEventListener('pointermove',(event)=>{if(!this.dragging || !this.model)return;this.model.rotation.y+=(event.clientX-this.lastX)*.008;this.model.rotation.x+=(event.clientY-this.lastY)*.004;this.lastX=event.clientX;this.lastY=event.clientY;});
    canvas.addEventListener('pointerup',()=>{this.dragging=false;});
    this.resize=()=>{if(this.disposed)return;const {width,height}=host.getBoundingClientRect();this.renderer.setSize(Math.max(1,width),Math.max(1,height),false);this.camera.aspect=width/Math.max(1,height);this.camera.updateProjectionMatrix();this.renderer.render(this.scene,this.camera);};
    this.observer=new ResizeObserver(this.resize);this.observer.observe(host);
    this.clock=new THREE.Clock();
    this.renderer.setAnimationLoop(()=>{if(this.disposed || document.hidden)return;this.mixer?.update(Math.min(.05,this.clock.getDelta()));this.renderer.render(this.scene,this.camera);});
  }

  async load(gloveSkinId) {
    const started=performance.now();
    const gltf=await new GLTFLoader().loadAsync('/models/viewmodels/coro/melee/knife-hires.glb');
    if(this.disposed)return;
    const model=gltf.scene,profile={id:'store-gloves',faction:'U',gloveSkinId};
    let assetCamera=null;
    model.traverse((object)=>{
      if(!assetCamera && object.isCamera)assetCamera=object;
      if(!object.isMesh)return;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      const gloves=materials.map((material)=>GLOVE_MATERIAL.test(material?.name || '')?applyTeamHandMaterial(material,profile,'knife'):null);
      object.visible=gloves.some(Boolean);
      if(object.visible)object.material=Array.isArray(object.material)?gloves:gloves[0];
      object.frustumCulled=false;
    });
    if(!assetCamera)throw new Error('knife-hires.glb sem câmera para o molde de luva');
    model.updateMatrixWorld(true);assetCamera.updateMatrixWorld(true);
    this.camera.fov=assetCamera.fov;
    model.applyMatrix4(assetCamera.matrixWorld.clone().invert());
    assetCamera.removeFromParent();
    this.mixer=new THREE.AnimationMixer(model);
    const idle=gltf.animations.find((clip)=>clip.name==='Idle');
    if(idle)this.mixer.clipAction(idle).play();
    this.mixer.update(0);
    const packageRoot=new THREE.Group();packageRoot.name='store_glove_mold';packageRoot.scale.setScalar(.0135);packageRoot.position.set(.10,-.05,-.32);packageRoot.rotation.set(-.04,.08,.02);packageRoot.add(model);
    this.model=packageRoot;this.scene.add(packageRoot);this.resize();
    this.host.dispatchEvent(new CustomEvent('cs-treta-stage-ready',{bubbles:true,detail:{loadMs:Math.round(performance.now()-started),gloveSkinId,fitsViewport:true}}));
  }

  snapshot(){this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');}
  dispose(){if(this.disposed)return;this.disposed=true;this.observer.disconnect();this.renderer.setAnimationLoop(null);this.mixer?.stopAllAction();if(this.model){this.model.traverse((object)=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material])material?.dispose();});this.model.removeFromParent();}this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
