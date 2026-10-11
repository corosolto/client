import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export class TretaStage {
  constructor(host,{coin=false,celebrate=false,count=1}={}) {
    this.host=host;this.coin=coin;this.celebrate=celebrate;this.count=Math.max(1,Math.min(matchMedia('(pointer: coarse), (max-width: 680px)').matches?1:5,count));this.disposed=false;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(34,1,.01,100);
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.4;
    this.renderer.domElement.setAttribute('aria-label',coin?`${this.count} moedas TRETA$ em 3D`:'Skin em 3D');
    host.append(this.renderer.domElement);
    const pixels=new Float32Array(64*32*4);
    for(let y=0;y<32;y++)for(let x=0;x<64;x++){
      const u=x/64,v=y/32,softbox=(cx,cy)=>Math.exp(-((u-cx)**2/.006+(v-cy)**2/.03));
      const glow=.28+3*softbox(.25,.3)+2*softbox(.75,.4),i=(y*64+x)*4;
      pixels.set([glow,glow*.95,glow*.85,1],i);
    }
    const environment=new THREE.DataTexture(pixels,64,32,THREE.RGBAFormat,THREE.FloatType);
    environment.mapping=THREE.EquirectangularReflectionMapping;environment.needsUpdate=true;
    const pmrem=new THREE.PMREMGenerator(this.renderer);
    this.environment=pmrem.fromEquirectangular(environment);this.scene.environment=this.environment.texture;
    environment.dispose();pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xcbdfff,0x59391f,2));
    for(const [color,intensity,position] of [[0xffedd0,5,[3,4,5]],[0x91bcff,4,[-3,2,-3]],[0xffffff,2,[-3,4,4]]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(...position);this.scene.add(light);}
    this.resize=()=>{if(this.disposed)return;const {width,height}=host.getBoundingClientRect();this.renderer.setSize(Math.max(1,width),Math.max(1,height),false);this.camera.aspect=width/Math.max(1,height);if(this.size){const fit=Math.max(this.size.y,this.size.x/this.camera.aspect,this.size.z);this.camera.position.set(0,0,fit/(2*Math.tan(THREE.MathUtils.degToRad(17)))*1.3);this.camera.lookAt(0,0,0);}this.camera.updateProjectionMatrix();this.renderer.render(this.scene,this.camera);};
    this.observer=new ResizeObserver(this.resize);this.observer.observe(host);
    this.clock=new THREE.Clock();this.mixers=[];this.spinHold=0;
    this.renderer.setAnimationLoop(()=>{if(this.disposed)return;const delta=Math.min(this.clock.getDelta(),.05);if(document.hidden)return;if(this.model && !this.reduced){if(!this.coin)this.model.rotation.y+=delta*.25;if(this.spinHold>0)this.spinHold=Math.max(0,this.spinHold-delta);else for(const mixer of this.mixers)mixer.update(delta);}this.renderer.render(this.scene,this.camera);});
  }
  async load(path) {
    const started=performance.now();
    const gltf=await new GLTFLoader().loadAsync(path);
    if(this.disposed){this.disposeModel(gltf.scene);return;}
    this.model=new THREE.Group();this.scene.add(this.model);
    for(let i=0;i<(this.coin?this.count:1);i++){
      const asset=i===0?gltf.scene:gltf.scene.clone(true),holder=new THREE.Group();
      holder.add(asset);this.model.add(holder);
      asset.updateMatrixWorld(true);
      if(gltf.animations.length && !this.reduced){
        const mixer=new THREE.AnimationMixer(asset);this.mixers.push(mixer);
        const spin=gltf.animations.find(c=>/idle|spin/i.test(c.name)) || gltf.animations[0];
        const reveal=this.celebrate && gltf.animations.find(c=>c.name==='PurchaseReveal');
        if(reveal){const action=mixer.clipAction(reveal);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.addEventListener('finished',()=>{if(!this.disposed){action.stop();mixer.clipAction(spin).play();}});}else mixer.clipAction(spin).play();
        if(!this.coin)mixer.update(0);
      }
      asset.updateMatrixWorld(true);
      asset.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
      const bounds=new THREE.Box3().setFromObject(asset),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      asset.position.sub(center);
      holder.position.x=(i-(this.count-1)/2)*size.x*.68;
      if(this.coin && this.count>1)holder.position.z=-Math.abs(i-(this.count-1)/2)*.12;
    }
    this.spinHold=this.coin && !this.celebrate ? .7 : 0;
    this.size=new THREE.Box3().setFromObject(this.model).getSize(new THREE.Vector3());this.resize();
    this.camera.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(this.model),corners=[];
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new THREE.Vector3(x,y,z).project(this.camera));
    const fitsViewport=corners.every(p=>Math.abs(p.x)<=1 && Math.abs(p.y)<=1);
    this.host.dispatchEvent(new CustomEvent('cs-treta-stage-ready',{bubbles:true,detail:{loadMs:Math.round(performance.now()-started),triangles:this.renderer.info.render.triangles,calls:this.renderer.info.render.calls,count:this.count,fitsViewport}}));
  }
  snapshot() {this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');}
  disposeModel(model) {const geometries=new Set(),materials=new Set(),textures=new Set();model.traverse(o=>{if(!o.isMesh)return;geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});for(const x of [...textures,...materials,...geometries])x.dispose();}
  dispose() {if(this.disposed)return;this.disposed=true;this.observer.disconnect();this.renderer.setAnimationLoop(null);for(const mixer of this.mixers)mixer.stopAllAction();if(this.model)this.disposeModel(this.model);this.environment.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
