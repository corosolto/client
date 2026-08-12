// Portão v4 baseado na crítica literal. Consome medição Blender da malha deformada.
// Proveniência dos limites: Hips exclusivo para props; simetria em profundidade com
// tolerância de 8/12 cm; mãos fisicamente separadas >=25 cm; piso z>=0.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , input, output] = process.argv;
if (!input) throw new Error('uso: script probe.json [contract.json]');
const probe = JSON.parse(readFileSync(input, 'utf8'));
const failures = [];
const propWeights = probe.propWeights;
const sockets = probe.socketWeights;
if ((sockets.lowProps.LeftUpLeg || 0) + (sockets.lowProps.RightUpLeg || 0) > 0) failures.push('PROP_SOCKET_UPLEG');
if (!(sockets.lowProps.Hips > 0)) failures.push('PROP_SOCKET_NOT_HIPS');
if (!(sockets.tower.Spine01 > 0)) failures.push('TOWER_NOT_SPINE01');
if ((sockets.tower.Hips || 0) > 0) failures.push('TOWER_ON_HIPS');
for (const [material, weights] of Object.entries(propWeights)) {
  if ((weights.LeftUpLeg || 0) + (weights.RightUpLeg || 0) > 0) {
    failures.push(`PROP_UPLEG:${material}`);
  }
  // Bege também pertence à torre Spine01; todos os demais props devem provar Hips.
  if (material !== 'CS_LAN_BEIGE_PLASTIC' && !(weights.Hips > 0)) {
    failures.push(`PROP_NOT_HIPS:${material}`);
  }
}
const c = probe.crouch;
if (c.handSeparationM < 0.25) failures.push(`CROUCH_HANDS:${c.handSeparationM}`);
if (c.kneeDepthDeltaM > 0.08) failures.push(`CROUCH_KNEE_DEPTH:${c.kneeDepthDeltaM}`);
if (c.footDepthDeltaM > 0.12) failures.push(`CROUCH_FOOT_DEPTH:${c.footDepthDeltaM}`);
if (!c.kneesOppositeSides) failures.push('CROUCH_KNEE_SIDES');
if (!c.feetOppositeSides) failures.push('CROUCH_FOOT_SIDES');
if (!(c.minZ >= -0.001 && c.minZ <= 0.01)) failures.push(`CROUCH_CONTACT_MINZ:${c.minZ}`);
const d = probe.death;
if (!(d.bodyMinZ >= 0)) failures.push(`DEATH_BODY_MINZ:${d.bodyMinZ}`);
if (!(d.towerMinZ >= 0)) failures.push(`DEATH_TOWER_MINZ:${d.towerMinZ}`);
const result = {
  input,
  provenance: {
    beforeProbe: 'v4-probe-before.json',
    crouchCandidateScan: 'v4-crouchwalk-scan.json',
    measurementScript: 'tmp/blender-lenda-lanhouse-v4-inspect.py',
    requirement: 'critica literal: Hips, crouch simetrico rifle-ready, death corpo+torre acima do piso',
  },
  thresholds: { handSeparationM: 0.25, kneeDepthDeltaM: 0.08, footDepthDeltaM: 0.12, crouchMinZ: [-0.001, 0.01], deathMinZ: 0 },
  failures,
  pass: failures.length === 0,
};
if (output) writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
