import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bootGame,initTextures,THREE} from './harness.mjs';
import {usePresentationClock} from './presentation-clock-fixture.mjs';
// Executa o bloco de QA com relógio e render controlados; não é captura de browser.
const source=readFileSync(new URL('./operacao-flavio-browser.mjs',import.meta.url),'utf8');
const anchor="    g._endRound('B');\n  });";
assert.equal(source.split(anchor).length,2,'unique victory probe');
const end=source.indexOf('\n\n  assert.deepEqual(errors',source.indexOf(anchor));
const start=source.lastIndexOf('  await page.evaluate(',source.indexOf(anchor));
assert(start>0 && end>start);
const body=source.slice(start,end);
const run=new (Object.getPrototypeOf(async function(){}).constructor)('page','assert','out',body+'\nreturn cinematic;');
const positivesOnly=process.argv.includes('--positivos');
const scenarios=[['boarding',false],['fallback',false],...positivesOnly?[]:[
 ['taxi-cedo',true],['sem-taxi',true],['original-oculto-move',true],['prazo-curto',true],
]];
const rows=[];
for(const [scenario,reject] of scenarios){
 let wall=0;const restore=usePresentationClock(()=>wall);
 const g=bootGame('operacao_flavio',{textures:initTextures(),bots:4});
 const previous=window.__game;window.__game=g;
 g._ensureDolly=()=>{};
 g.objective._iniciarBoarding=function(){
  if(scenario==='fallback')return;
  const stage=new THREE.Group(),plane=new THREE.Group();stage.position.set(0,.08,55);
  stage.name='flavio-boarding-stage';plane.name='flavio-boarding-plane';stage.add(plane);g.world.root.add(stage);
  const target=new THREE.Vector3(0,2.1,55),mode=this;
  const boarding={stage,plane,target,session:{actor:{}},
   update(elapsed){
    const taxi=['sem-taxi','original-oculto-move'].includes(scenario)?0:Math.max(0,elapsed-(scenario==='taxi-cedo'?1:6.8))*5;
    plane.position.z=taxi;target.z=55+taxi;stage.updateMatrixWorld(true);
    if(scenario==='original-oculto-move')g.world.objectivePlane.position.z=85;
    return true;
   },
   stop(){stage.visible=false;g.world.objectivePlane.visible=true;mode._boardingSession=null;},
  };
  this._boarding=boarding;this._boardingSession=this.cinematic;g.world.objectivePlane.visible=false;
 };
 const advance=ms=>{wall+=ms;g.time+=ms/1000;g.objective.updatePresentation();};
 const page={
  async evaluate(fn,arg){const value=fn(arg);if(scenario==='prazo-curto'&&g.objective.cinematic)g.stateUntil=g.objective.cinematic.startedAt+4;return value;},
  async waitForTimeout(ms){for(let left=ms;left>0;left-=100)advance(Math.min(100,left));},
  async waitForFunction(fn,arg){for(let i=0;i<100;i++){if(fn(arg))return;advance(100);}throw new Error('timeline fixture timeout');},
  async screenshot(){},
 };
 try{
  let error=null;try{await run(page,assert,'/tmp/no-browser-capture');}catch(e){error=e;}
  if(reject){assert(error instanceof assert.AssertionError,'invalid timeline must fail a semantic assertion: '+scenario);}
  else if(error)throw error;
  rows.push({clause:scenario,pass:true});console.log('ok browser timeline '+scenario);
 }catch(e){rows.push({clause:scenario,pass:false,type:e.name,message:e.message});console.error('FALHA browser timeline '+scenario+': '+e.message);}
 finally{window.__game=previous;g.dispose();restore();}
}
console.log(JSON.stringify({cases:rows.length,failed:rows.filter(r=>!r.pass)}));
process.exitCode=rows.some(r=>!r.pass)?1:0;
