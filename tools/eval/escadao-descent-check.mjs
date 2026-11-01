/* Relato 06/09: escada íngreme fazia o corpo saltar involuntariamente na descida.
 * _moveEntity real: descida/subida/pulo; salto parado usa oráculo discreto (impulso 5.6, e555cadf11). */
import assert from 'node:assert/strict';
import { bootGame, initTextures } from './harness.mjs';
const g = bootGame('escadao', { textures: initTextures(), ctf: true, seed: 8012 });
const W = g.world, p = g.player, dt = 1 / 60;
const mut = process.argv.includes('--mutante=sem-snap');
const snap0 = W.snapDownSteps, t0 = g.time;
const APPROVED_IMPULSE = 5.6, GRAVITY = 20.6, FRAMES = 70;
// EPS: limite conservador de arredondamento duplo — 8 operações/frame × 70 frames, magnitude ≤ 6. Não é tolerância estética.
const EPS = Number.EPSILON * 8 * FRAMES * 6;
const reset = (x,z) => {
  g.time = t0;
  p.pos.set(x,W.groundHeightAt(x,z),z); p.vel.set(0,0,0); p.grounded=true;
  p.weapon='revolver38'; p.yaw=0; p.crouchF=0; p.scoped=false;
  p._spaceHeld=false; p.jumpBufferedUntil=0; p.coyoteUntil=0;
  p.mantle=null; p.mantleF=0; p._mantleScanAt=0;
};
const move = (az, jump=false) => {
  g.time+=dt; g._moveEntity(p,{ax:0,az,jump,crouch:false,shift:false},dt);
};
// Oráculo discreto independente: gravidade aplicada antes da integração (game.js 7097→7123).
const ref = [];
{ let vy = APPROVED_IMPULSE, h = 0, grounded = false;
  for (let i=0;i<FRAMES;i++) {
    vy -= GRAVITY * dt; h += vy * dt;
    if (h <= 0) { h = 0; vy = 0; grounded = true; } else grounded = false;
    ref.push({ h, vy, grounded });
  } }
const refApex = Math.max(...ref.map(f => f.h));
try {
  if (mut) W.snapDownSteps = false;
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
    // Salto parado no ponto plano real (0,26): oráculo independente, liga e desliga o snap.
    assert.ok(W.jumpImpulse == null,'Mundo Escadão não deve sobrepor jumpImpulse (padrão aprovado 5.6)');
    const groundY = W.groundHeightAt(0,26);
    const runJump = (snap) => {
      W.snapDownSteps = snap;
      try {
        reset(0,26);
        const f=[];
        for(let i=0;i<FRAMES;i++) { move(0,i===0); f.push({h:p.pos.y-groundY, vy:p.vel.y, g:p.grounded, x:p.pos.x, z:p.pos.z}); }
        return f;
      } finally { W.snapDownSteps = snap0; }
    };
    const on = runJump(true), off = runJump(false);
    for (const [name,f] of [['ligado',on],['desligado',off]]) {
      assert.ok(f[0].vy > 0 && f[0].g === false,`Primeiro frame deve sair do chão com vy>0 (snap ${name}): vy=${f[0].vy}`);
      const apex = Math.max(...f.map(s => s.h));
      assert.ok(Math.abs(apex - refApex) <= EPS,`Ápice ${name} deve bater com o oráculo: real=${apex}, ref=${refApex}`);
      const last = f[FRAMES-1];
      assert.ok(last.g === true && Math.abs(last.vy) <= EPS,`Fim do salto ${name} deve pousar com vy=0: g=${last.g}, vy=${last.vy}`);
      for (let i=0;i<FRAMES;i++) {
        assert.ok(Math.abs(f[i].h - ref[i].h) <= EPS && Math.abs(f[i].vy - ref[i].vy) <= EPS && f[i].g === ref[i].grounded,
          `Frame ${i} (${name}) diverge do oráculo: real h=${f[i].h} vy=${f[i].vy} g=${f[i].g}; ref h=${ref[i].h} vy=${ref[i].vy} g=${ref[i].grounded}`);
        assert.ok(Math.abs(f[i].x - 0) <= EPS && Math.abs(f[i].z - 26) <= EPS,`Salto parado ${name} não pode mover em x/z no frame ${i}`);
      }
      console.log(`JUMP ORACLE PASS (snap ${name}): ápice real=${apex.toFixed(6)}m ref=${refApex.toFixed(6)}m`);
    }
    for (let i=0;i<FRAMES;i++)
      assert.ok(Math.abs(on[i].h - off[i].h) <= EPS && Math.abs(on[i].vy - off[i].vy) <= EPS && on[i].g === off[i].g,
        `Snap não pode alterar a trajetória do salto no frame ${i}`);
    reset(.8,-3);
    let stairJumpGap=0;
    for(let i=0;i<45;i++) { move(1,i===0); stairJumpGap=Math.max(stairJumpGap,p.pos.y-W.groundHeightAt(p.pos.x,p.pos.z)); }
    assert.ok(stairJumpGap>.5,'Pulo intencional durante descida deve sair do chão');
    // Fixture de queda real, isolada dos guarda-corpos: a regra não deve colar numa queda de 2m.
    const ground=W.groundHeightAt, colliders=W.colliders;
    try {
      W.groundHeightAt=(_x,z)=>z<0?2:0; W.colliders=[];
      reset(0,-.15); let observedFall=false;
      for(let i=0;i<15;i++) { move(1); if(p.pos.z>0 && p.pos.y>1 && !p.grounded) observedFall=true; }
      assert.ok(observedFall,'Borda maior que um passo deve continuar em queda livre');
    } finally { W.groundHeightAt=ground; W.colliders=colliders; }
    console.log(`DESCENT PASS: apoio contínuo, subida, salto oráculo (ref ${refApex.toFixed(3)}m) e queda real preservados`);
  }
} finally { W.snapDownSteps = snap0; }
process.exit(0);
