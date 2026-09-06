/* Relato 06/09: escada mais íngreme fazia o corpo saltar involuntariamente na descida.
 * _moveEntity real: subida/descida, pulo e borda de queda maior que um passo.
 * Opt-in desligado é o mutante: deve recuperar o afastamento do chão. */
import assert from 'node:assert/strict';
import { bootGame, initTextures } from './harness.mjs';
const g = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const W = g.world, p = g.player, dt = 1 / 60;
const mut = process.argv.includes('--mutante=sem-snap');
if (mut) W.snapDownSteps = false;
const reset = (x,z) => {
  p.pos.set(x,W.groundHeightAt(x,z),z); p.vel.set(0,0,0); p.grounded=true;
  p.weapon='revolver38'; p.yaw=0; p.crouchF=0; p._spaceHeld=false;
  p.jumpBufferedUntil=0; p.coyoteUntil=0;
};
const move = (az, jump=false) => {
  g.time+=dt; g._moveEntity(p,{ax:0,az,jump,crouch:false,shift:false},dt);
};
reset(.8,-5.6);
let gap=0, air=0;
for(let i=0;i<180;i++) { move(1); gap=Math.max(gap,p.pos.y-W.groundHeightAt(p.pos.x,p.pos.z)); air+=!p.grounded; }
if(mut) {
  assert.ok(gap>.25 && air>0,`Mutante precisa recuperar salto involuntário: ${gap},${air}`);
  console.log(`DESCENT PASS: mutante sem snap tem gap=${gap.toFixed(3)}m, ${air} frames aéreos`);
} else {
  assert.ok(gap<.025 && air===0,`Descida deve manter apoio: gap=${gap.toFixed(3)}m, air=${air}`);
  reset(.8,13.7);
  for(let i=0;i<285;i++) move(-1);
  assert.ok(p.pos.z < -5.5 && Math.abs(p.pos.y-W.groundHeightAt(.8,-20))<.01,'Subida continua chegando ao mirante');
  reset(0,26);
  let apex=0;
  for(let i=0;i<70;i++) { move(0,i===0); apex=Math.max(apex,p.pos.y); }
  assert.ok(apex>.5 && apex<.7 && p.grounded,'Snap não pode suprimir salto nem pouso');
  reset(.8,-3);
  let stairJumpGap=0;
  for(let i=0;i<45;i++) { move(1,i===0); stairJumpGap=Math.max(stairJumpGap,p.pos.y-W.groundHeightAt(p.pos.x,p.pos.z)); }
  assert.ok(stairJumpGap>.5,'Pulo intencional durante descida deve sair do chão');
  // Fixture de queda real, isolada dos guarda-corpos: a regra não deve colar numa queda de 2m.
  const ground=W.groundHeightAt, colliders=W.colliders;
  W.groundHeightAt=(_x,z)=>z<0?2:0; W.colliders=[];
  reset(0,-.15); let observedFall=false;
  for(let i=0;i<15;i++) { move(1); if(p.pos.z>0 && p.pos.y>1 && !p.grounded) observedFall=true; }
  W.groundHeightAt=ground; W.colliders=colliders;
  assert.ok(observedFall,'Borda maior que um passo deve continuar em queda livre');
  console.log(`DESCENT PASS: apoio contínuo, subida, salto ${apex.toFixed(3)}m e queda real preservados`);
}
process.exit(0);
