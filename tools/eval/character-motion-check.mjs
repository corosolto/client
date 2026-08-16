#!/usr/bin/env node
/* Continuidade do rig em transições de locomoção e correção vertical dos pés.
   Mutações reescrevem o helper real em memória: --mutante=sem-fase|offset-brusco. */
import fs from 'node:fs';

const FILE = 'public/js/character_motion.js';
const mutante = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
if (!fs.existsSync(FILE)) {
  console.error(`MOVRIG FALHA — helper de movimento ausente: ${FILE}`);
  process.exit(1);
}
let source = fs.readFileSync(FILE, 'utf8');
const original = source;
if (mutante === 'sem-fase') source = source.replace('next.time = phase * nextDuration;', 'next.time = 0;');
if (mutante === 'offset-brusco') source = source.replace('return current + (target - current) * (1 - Math.exp(-response * dt));', 'return target;');
if (mutante && source === original) {
  console.error(`MOVRIG FALHA — mutação ${mutante} não aplicou`);
  process.exit(2);
}

const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { syncLocomotionPhase, dampRigValue } = await import(moduleUrl);
const action = (duration, time = 0) => ({ time, getClip: () => ({ duration }) });

const walk = action(1.2, 0.9), run = action(0.6);
const phase = syncLocomotionPhase(walk, run, 'walk', 'run');
const phaseOk = Math.abs(phase - 0.75) < 1e-9 && Math.abs(run.time - 0.45) < 1e-9;
const idle = action(2, 1), runFromIdle = action(0.6);
const idleIgnored = syncLocomotionPhase(idle, runFromIdle, 'idle', 'run') === null && runFromIdle.time === 0;

const target = 0.08, response = 14;
const first = dampRigValue(0, target, 1 / 60, response);
const simulate = (hz) => { let value = 0; for (let i = 0; i < hz; i++) value = dampRigValue(value, target, 1 / hz, response); return value; };
const at30 = simulate(30), at120 = simulate(120);
const smoothOk = first > 0 && first < target && dampRigValue(0, target, 0, response) === 0
  && Math.abs(at30 - at120) < 1e-9 && Math.abs(at30 - target) < 1e-6;

console.log(`MOVRIG1 ${phaseOk && idleIgnored ? 'PASSA' : 'FALHA'} — walk 75% → run ${(run.time / 0.6 * 100).toFixed(1)}% · idle não sincroniza`);
console.log(`MOVRIG2 ${smoothOk ? 'PASSA' : 'FALHA'} — primeiro quadro ${first.toFixed(5)} m · 30/120 Hz Δ ${Math.abs(at30 - at120).toExponential(2)}`);
process.exit(phaseOk && idleIgnored && smoothOk ? 0 : 1);
