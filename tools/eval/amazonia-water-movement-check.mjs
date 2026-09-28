// Relato 06/09: água rasa deve responder como o controle sem freio; áudio continua aquático.
// O controle usa o MESMO trajeto e Game._updatePlayer; não mede FPS nem modelos GLB.
import {bootGame, initTextures} from './harness.mjs';
const g=bootGame('amazonia',{textures:initTextures(),ctf:true,seed:13007,bots:0}),w=g.world,p=g.player;
const oldSlow=w.slowAt,oldSurface=w.footstepSurfaceAt,oldGround=w.groundHeightAt,oldSfx=g.sfx,mutant=process.argv.includes('--mutante=slow');
const semAcesso=process.argv.includes('--mutante=sem-acesso');
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
function pontao(x0,z,jump) {
  const start=x0-2.25;
  p.pos.set(start,w.groundHeightAt(start,z,0),z);p.vel.set(0,0,0);p.alive=true;p.hp=100;p.grounded=true;
  p.mantle=null;p.yaw=0;p.crouchF=0;p.scoped=false;p.weapon='knife';p._spaceHeld=false;p.jumpBufferedUntil=0;p.coyoteUntil=0;
  let crossed=false,maxX=start;
  for(let tick=0;tick<180;tick++) {
    g.time+=1/60;g._moveEntity(p,{ax:1,az:0,shift:false,jump:jump&&tick===0},1/60);
    maxX=Math.max(maxX,p.pos.x);
    if(p.pos.x>=x0+.25){crossed=true;break;}
  }
  if(crossed)for(let tick=0;tick<45;tick++){g.time+=1/60;g._moveEntity(p,{ax:0,az:0,shift:false,jump:false},1/60);}
  return {x0,z,jump,crossed,maxX,y:p.pos.y,ground:w.groundHeightAt(p.pos.x,p.pos.z,p.pos.y)};
}
try {
  const actual=walk('agua-atual',mutant?()=>true:oldSlow,[0,-.6,18]);
  const control=walk('agua-controle-sem-freio',()=>false,[0,-.6,18]);
  const dry=walk('ponte-seca',oldSlow,[-2,.18,0],-Math.PI/2);
  if(semAcesso)w.groundHeightAt=(x,z,y)=>
    ((z===12.8&&x>=2&&x<4)||(z===-11.2&&x>=1.8&&x<3.8))?-.6:oldGround(x,z,y);
  const pontos=[[4,12.8],[3.8,-11.2]].flatMap(([x,z])=>[false,true].map(jump=>pontao(x,z,jump)));
  const checks=[
    ['AMW1',Math.abs(actual.distance-control.distance)<1e-6&&Math.abs(actual.speed-control.speed)<1e-6&&control.distance>0,'velocidade e distância iguais ao controle sem freio'],
    ['AMW2',actual.firstMotionTick===1&&actual.zeroMotionFrames===0&&actual.maxCollisionShift<1e-6,'resposta no primeiro tick sem travar/empurrar'],
    ['AMW3',[actual,control].every(r=>r.sounds.length>0&&r.sounds.every(s=>s==='water'))&&dry.sounds.length>0&&dry.sounds.every(s=>s==='concrete'),'passos reais distinguem água e ponte seca sem depender do freio'],
    ['AMW4',pontos.every(r=>r.crossed&&Math.abs(r.y-.28)<.03),'água → pontões do mercado com e sem salto'],
  ];
  for(const [id,ok,rule] of checks)console.log(`${ok?'PASS':'FAIL'} ${id} ${rule}`);
  console.log(JSON.stringify({mutant,semAcesso,actual,control,dry,pontos}));
  if(checks.some(([,ok])=>!ok))process.exitCode=1;
} finally {w.slowAt=oldSlow;w.footstepSurfaceAt=oldSurface;w.groundHeightAt=oldGround;g.sfx=oldSfx;}
