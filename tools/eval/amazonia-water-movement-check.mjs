// Relato 06/09: água rasa deve responder como o controle sem freio; áudio continua aquático.
// O controle usa o MESMO trajeto e Game._updatePlayer; não mede FPS nem modelos GLB.
import {bootGame, initTextures} from './harness.mjs';
const g=bootGame('amazonia',{textures:initTextures(),ctf:true,seed:13007,bots:0}),w=g.world,p=g.player;
const oldSlow=w.slowAt,oldSurface=w.footstepSurfaceAt,oldSfx=g.sfx,mutant=process.argv.includes('--mutante=slow');
if(process.argv.includes('--mutante=audio'))w.footstepSurfaceAt=undefined;
const sounds=[];
g.sfx=new Proxy(oldSfx,{get:(target,key)=>key==='step'?surface=>sounds.push(surface):Reflect.get(target,key)});
function walk(label,slow,from,yaw=0) {
  w.slowAt=slow;p.pos.set(...from);p.vel.set(0,0,0);p.alive=true;p.hp=100;p.grounded=true;
  p.mantle=null;p.pitch=0;p.yaw=yaw;p.crouchF=0;p.scoped=false;p.weapon='ak';p.stepPhase=0;
  g.touchMove={x:0,z:0};g.keys={KeyW:true};g.mouseDown0=false;sounds.length=0;
  let firstMotionTick=null,zeroMotionFrames=0,maxCollisionShift=0;
  const collide=g._collide;
  g._collide=function(pos,...args){const before=pos.clone();const result=collide.call(this,pos,...args);maxCollisionShift=Math.max(maxCollisionShift,pos.distanceTo(before));return result;};
  try {for(let tick=1;tick<=120;tick++) {
    const before=p.pos.clone();g.time+=1/120;g._updatePlayer(1/120);
    if(p.pos.distanceTo(before)>1e-8)firstMotionTick??=tick;else zeroMotionFrames++;
  }} finally {g._collide=collide;g.keys={};}
  return {label,distance:Math.hypot(p.pos.x-from[0],p.pos.z-from[2]),speed:Math.hypot(p.vel.x,p.vel.z),firstMotionTick,zeroMotionFrames,maxCollisionShift,sounds:[...sounds]};
}
try {
  const actual=walk('agua-atual',mutant?()=>true:oldSlow,[0,-.6,18]);
  const control=walk('agua-controle-sem-freio',()=>false,[0,-.6,18]);
  const dry=walk('ponte-seca',oldSlow,[-2,.18,0],-Math.PI/2);
  const checks=[
    ['AMW1',Math.abs(actual.distance-control.distance)<1e-6&&Math.abs(actual.speed-control.speed)<1e-6&&control.distance>0,'velocidade e distância iguais ao controle sem freio'],
    ['AMW2',actual.firstMotionTick===1&&actual.zeroMotionFrames===0&&actual.maxCollisionShift<1e-6,'resposta no primeiro tick sem travar/empurrar'],
    ['AMW3',[actual,control].every(r=>r.sounds.length>0&&r.sounds.every(s=>s==='water'))&&dry.sounds.length>0&&dry.sounds.every(s=>s==='concrete'),'passos reais distinguem água e ponte seca sem depender do freio'],
  ];
  for(const [id,ok,rule] of checks)console.log(`${ok?'PASS':'FAIL'} ${id} ${rule}`);
  console.log(JSON.stringify({mutant,actual,control,dry}));
  if(checks.some(([,ok])=>!ok))process.exitCode=1;
} finally {w.slowAt=oldSlow;w.footstepSurfaceAt=oldSurface;g.sfx=oldSfx;}
