import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import './harness.mjs';

const mutant=process.argv.find(arg=>arg.startsWith('--mutante='))?.split('=')[1] || null;
const mutations={
 'sem-stop':['this._boarding?.stop();',''],
 'sem-predicado':['boarding.start(this.vip, def, atual)','boarding.start(this.vip, def)'],
 'reinicia-tempo':['if (ok && atual()) boarding.update(this._elapsedCinematic());','if (ok && atual()) boarding.update(0);'],
 'import-antigo':['if (!atual()) return;',''],
 'sem-dispose':['this._boarding?.dispose();',''],
};
let source=readFileSync(new URL('../../public/js/mode_operacao_flavio.js',import.meta.url),'utf8');
if(mutant){
 assert(Object.hasOwn(mutations,mutant),'known mutation');const [before,after]=mutations[mutant];
 assert.equal(source.split(before).length-1,1,'mutation has unique real target');source=source.replace(before,after);
 console.log('Mutação aplicada: '+mutant);
}
const boundary="import('./flavio-boarding.js')";
assert.equal(source.split(boundary).length-1,1,'one actual dynamic stage boundary');
let now=100000,serial=0;
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'performance');
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
const drain=()=>new Promise(resolve=>setImmediate(resolve));
const rows=[],failed=[];
const check=async(clause,fn)=>{try{await fn();rows.push({clause,pass:true});}catch(error){rows.push({clause,pass:false});failed.push({clause,type:error.name,message:error.message});}};
async function fixture(){
 const key='__flavioBoardingFixture'+(++serial),imports=[],starts=[],instances=[];
 class Stage {
  constructor(game){this.game=game;this.active=false;this.target=new THREE.Vector3(0,2.1,55);this.disposed=0;instances.push(this);}
  start(vip,def,isCurrent=()=>true){
   this.stop();const session={vip,def,isCurrent};this.session=session;
   return new Promise(resolve=>starts.push(()=>{
    if(this.disposed || this.session!==session || !isCurrent()){resolve(false);return;}
    this.active=true;resolve(true);
   }));
  }
  update(elapsed){this.elapsed=elapsed;return this.active;}
  stop(){this.session=null;this.active=false;}
  dispose(){if(this.disposed)return;this.stop();this.disposed++;}
 }
 globalThis[key]={importModule:()=>new Promise(resolve=>imports.push(()=>resolve({FlavioBoarding:Stage})))};
 const instrumented=source.replace(boundary,'globalThis['+JSON.stringify(key)+'].importModule()');
 const {OperacaoFlavio}=await import('data:text/javascript;base64,'+Buffer.from(instrumented+'\n// fixture '+serial).toString('base64'));
 const vip={team:'B',def:{id:'senador'},pos:new THREE.Vector3(),_meshWeapon:'knife',alive:true};
 const effective={...vip.def,effectiveFixture:true};
 const game={bots:[vip],world:{root:new THREE.Group(),objectivePlane:new THREE.Group(),escortPath:[{x:0,z:0},{x:0,z:8}],groundHeightAt:()=>.08},
  online:true,dedicated:false,time:10,state:'roundEnd',stateUntil:500,camera:new THREE.PerspectiveCamera(75,1.5,.1,300),el:{},vmScene:{visible:true},
  _trocarPersonagem(){},_syncRemoteWeapon(){},_defNoLado:()=>effective};
 game.world.objectivePlane.position.set(0,.08,55);
 const mode=new OperacaoFlavio(game,vip.def);now+=10000;mode.startCinematic('B');
 return {mode,game,vip,effective,imports,starts,instances,advance(seconds){now+=seconds*1000;},
  async importReady(){for(const resolve of imports.splice(0))resolve();await drain();},
  async assetsReady(index=0){const resolve=starts[index];assert(resolve,'pending stage start');resolve();await drain();},
  clean(){mode.dispose();delete globalThis[key];}};
}
const actions={
 reset:f=>f.mode.prepareRound(),
 skip:f=>f.mode._key({code:'Space'}),
 expiry:f=>{f.advance(7);f.mode.updatePresentation();},
 interruption:f=>{f.game.state='matchEnd';f.mode.updatePresentation();},
 dispose:f=>f.mode.dispose(),
 victoryE:f=>f.mode.startCinematic('E'),
};
try{
 for(const [name,act] of Object.entries(actions))for(const phase of ['import','assets','active']){
  await check(name+' cancels '+phase,async()=>{
   const f=await fixture();try{
    if(phase!=='import')await f.importReady();
    if(phase==='active'){await f.assetsReady();assert(f.instances[0].active,'positive active control');}
    f.advance(2.1);act(f);
    if(phase==='import'){await f.importReady();assert.equal(f.instances.length,0,'cancelled import never constructs stage');}
    else if(phase==='assets')await f.assetsReady();
    assert(f.instances.every(instance=>!instance.active),'cancelled stage never visible');
    if(name==='dispose' && phase!=='import')assert.equal(f.instances[0].disposed,1,'final dispose releases stage');
    assert.equal(f.game.stateUntil,500,'online deadline preserved');
   }finally{f.clean();}
  });
 }
 await check('expiry without presentation tick cannot create late actor',async()=>{
  const f=await fixture();try{await f.importReady();f.advance(9.1);await f.assetsReady();assert.equal(f.instances[0].active,false,'late actor guarded before construction');assert.equal(f.game.stateUntil,500);}finally{f.clean();}
 });
 await check('state change without presentation tick cannot create late actor',async()=>{
  const f=await fixture();try{await f.importReady();f.game.state='live';await f.assetsReady();assert.equal(f.instances[0].active,false,'late actor guarded by current round');}finally{f.clean();}
 });
 await check('late ready resumes elapsed and effective appearance without changing authority',async()=>{
  const f=await fixture();try{
   const scene=f.mode.cinematic,anchor=scene.anchorAt,mesh=f.vip.mesh,position=f.vip.pos.clone();
   await f.importReady();f.advance(3.2);await f.assetsReady();
   assert(f.instances[0].active);assert.equal(f.instances[0].elapsed,3.2,'ready uses current elapsed');
   assert.equal(f.mode.cinematic,scene);assert.equal(scene.anchorAt,anchor);assert.equal(f.instances[0].session.def,f.effective);
   assert(f.vip.pos.equals(position));assert.equal(f.vip.mesh,mesh);assert.equal(f.game.stateUntil,500);
  }finally{f.clean();}
 });
 for(const oldFirst of [false,true])await check('B replacement keeps new session, oldFirst='+oldFirst,async()=>{
  const f=await fixture();try{
   await f.importReady();f.advance(1);f.mode.startCinematic('B');await f.importReady();assert.equal(f.instances.length,1,'reuse one stage instance');
   if(oldFirst){await f.assetsReady(0);assert.equal(f.instances[0].active,false);await f.assetsReady(1);}
   else{await f.assetsReady(1);assert(f.instances[0].active);await f.assetsReady(0);}
   assert(f.instances[0].active,'old completion cannot stop new session');assert.equal(f.game.stateUntil,500);
  }finally{f.clean();}
 });
}finally{Object.defineProperty(globalThis,'performance',descriptor);}
console.log(JSON.stringify({mutant,cases:rows.length,rows,failed}));
if(failed.length)process.exitCode=1;
