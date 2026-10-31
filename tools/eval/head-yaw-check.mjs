#!/usr/bin/env node
/* #1188/4432950826: o mesmo recentro deve atuar em clipe animado e pose estática.
   Reprodução e contratos: docs/visual-consistency/HEAD-YAW.md. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const MUTANTS = ['sem-undo', 'undo-tardio', 'sinal-invertido', 'sem-clamp', 'sem-yaw', 'yaw-emote', 'estado-persistente', 'revive-pendente'];
const args = process.argv.slice(2);
if (args.length > 1 || (args.length && !MUTANTS.some((m) => args[0] === `--mutante=${m}`))) {
  console.error(`Use --mutante=${MUTANTS.join('|')} ou nenhum argumento`); process.exit(2);
}
const mutant = args[0]?.slice('--mutante='.length) || '';
const tmpFiles = [];
process.on('exit', () => { for (const f of tmpFiles) fs.rmSync(f, { force: true }); });
try {
  const { THREE } = await import('./harness.mjs');
  const src = fs.readFileSync(path.resolve('public/js/glbchars.js'), 'utf8');
  const start = src.indexOf('    // Delta de yaw sai antes do mixer');
  const end = src.indexOf('    /* Hitbox da cabeça sincronizada por ÚLTIMO:', start);
  if (start < 0 || end < start) throw new Error('bloco de recentro ausente: não foi possível medir o produto');
  const block = src.slice(start, end);
  const undo = '    this._undoHeadYaw();\n';
  const replace = (text, from, to) => {
    if (text.split(from).length !== 2 || from === to) throw new Error('mutação não aplicou de forma única');
    return text.replace(from, to);
  };
  let candidate = src;
  if (mutant === 'sem-undo') candidate = replace(candidate, '    this._undoHeadYaw();\n    if (!this.dead) {', '    if (!this.dead) {');
  if (mutant === 'undo-tardio') {
    candidate = replace(candidate, '    this._undoHeadYaw();\n    if (!this.dead) {', '    if (!this.dead) {');
    candidate = replace(candidate, '    this.mixer.update(dt);', `    this.mixer.update(dt);\n${undo}`);
  }
  if (mutant === 'sinal-invertido') candidate = replace(candidate, 'setFromAxisAngle(_upY, this._yawCorr)', 'setFromAxisAngle(_upY, -this._yawCorr)');
  if (mutant === 'sem-clamp') candidate = replace(candidate,
    'Math.max(-AIM_CORR_CLAMP, Math.min(AIM_CORR_CLAMP, curYaw * 0.8))', 'curYaw * 0.8');
  if (mutant === 'sem-yaw') candidate = replace(candidate, block, '');
  if (mutant === 'yaw-emote') candidate = replace(candidate,
    'if (this.headBone && !this.dead && !this.emotando && this.lod < 2', 'if (this.headBone && !this.dead && this.lod < 2');
  if (mutant === 'estado-persistente') candidate = replace(candidate, '} else this._yawCorr = 0;', '}');
  if (mutant === 'revive-pendente') candidate = replace(candidate, '    this._undoHeadYaw(); this._yawCorr = 0;\n', '');
  async function load(text, label) {
    const exp = replace(text, 'class CharController {', 'export class CharController {');
    const tmp = path.resolve(`public/js/.head-yaw-${process.pid}-${label}.mjs`);
    tmpFiles.push(tmp); fs.writeFileSync(tmp, exp);
    return (await import(pathToFileURL(tmp))).CharController;
  }
  const Actual = await load(candidate, 'actual'), Natural = await load(replace(src, block, ''), 'natural');
  // Contrato anterior21f264c51: preservar ganho/limite/tempo, sem aceitar regressão da própria referência.
  const clamp = .5, factor = .8, rate = 6, deadzone = 1e-4;
  const up = new THREE.Vector3(0, 1, 0), forward = new THREE.Vector3(0, 0, 1), tol = 1e-6;
  function angle(group, head) {
    const f = forward.clone().applyQuaternion(group.getWorldQuaternion(new THREE.Quaternion()));
    const h = forward.clone().applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()));
    return Math.atan2(f.z * h.x - f.x * h.z, f.x * h.x + f.z * h.z);
  }
  function make(Controller, type, yaw, bodyYaw, neckPitch, scale) {
    const scene = new THREE.Group(), group = new THREE.Group(), model = new THREE.Group();
    const neck = new THREE.Bone(), head = new THREE.Bone(), proxy = new THREE.Object3D();
    scene.rotation.y = .37; group.rotation.y = bodyYaw; group.scale.setScalar(scale);
    neck.name = 'Neck'; neck.rotation.x = neckPitch; head.name = 'Head';
    neck.position.y = 1.2 / scale; head.position.set(.1 / scale, .3 / scale, .04 / scale);
    head.quaternion.setFromAxisAngle(up, yaw); scene.add(group); group.add(model, proxy); model.add(neck); neck.add(head);
    const q = (v) => new THREE.Quaternion().setFromAxisAngle(up, v).toArray();
    const track = type === 'untracked' ? new THREE.VectorKeyframeTrack('Head.position', [0, 1], [...head.position.toArray(), ...head.position.toArray()])
      : new THREE.QuaternionKeyframeTrack('Head.quaternion', [0, .5, 1], [...q(yaw), ...q(type === 'animated' ? yaw + .12 : yaw), ...q(yaw)]);
    const clip = new THREE.AnimationClip('idle', 1, [track]), mixer = new THREE.AnimationMixer(model), actions = {};
    for (const name of ['idle', 'idle1h', 'crouch', 'walk', 'run']) actions[name] = mixer.clipAction(clip.clone());
    const ctrl = new Controller(mixer, actions, group, head, proxy, 'probe', model);
    scene.updateMatrixWorld(true);
    return { ctrl, group, head, proxy, actions };
  }
  const rows = [], failures = [];
  for (const type of ['untracked', 'constant', 'animated', 'paused']) for (const yaw of [-.5, .5, 1.2]) {
    for (const [bodyYaw, neckPitch, scale] of [[0, 0, 1], [2.4, .22, .01]]) {
      const a = make(Actual, type, yaw, bodyYaw, neckPitch, scale);
      const n = make(Natural, type, yaw, bodyYaw, neckPitch, scale);
      let correction = 0, maxError = 0, proxyError = 0, maxCorrection = 0, worstFrame = 0;
      for (let i = 0; i < 1200; i++) {
        const dt = i % 3 === 0 ? 1 / 30 : i % 3 === 1 ? 1 / 60 : 1 / 120;
        const phase = Math.floor(i / 120);
        if (i === 350 || i === 375) correction = 0;
        for (const r of [a, n]) {
          if (i === 350) r.ctrl.revive();
          if (i === 375) { r.ctrl.die(); r.ctrl.revive(); }
          r.group.rotation.y = bodyYaw + .4 * Math.sin(i / 50);
          r.ctrl.crouch = phase === 2; r.ctrl.oneHanded = phase === 3;
          r.ctrl.dead = phase === 5; r.ctrl.lod = phase === 6 ? 2 : 0;
          r.ctrl.aimPitch = phase === 9 ? .2 * Math.sin(i / 35) : undefined;
          if (phase === 7 && !r.ctrl._emoteId) r.ctrl.emote('test');
          if (phase === 8) r.ctrl.pararEmote();
          if (type === 'paused') for (const action of Object.values(r.actions)) action.paused = true;
        }
        const moving = phase === 4 ? 1 : 0;
        a.ctrl.update(dt, moving, false, moving * 2);
        n.ctrl.update(dt, moving, false, moving * 2);
        const raw = angle(n.group, n.head);
        const active = !n.ctrl.dead && !n.ctrl.emotando && n.ctrl.lod < 2 && /^(idle|idle1h|crouch)$/.test(n.ctrl.curName || '');
        if (active) correction += (Math.max(-clamp, Math.min(clamp, -raw * factor)) - correction) * Math.min(1, dt * rate);
        else correction = 0;
        const expected = raw + (active && Math.abs(correction) > deadzone ? correction : 0);
        const delta = Math.abs(Math.atan2(Math.sin(angle(a.group, a.head) - expected), Math.cos(angle(a.group, a.head) - expected)));
        if (delta > maxError) { maxError = delta; worstFrame = i; }
        const actual = a.group.worldToLocal(a.head.getWorldPosition(new THREE.Vector3()));
        proxyError = Math.max(proxyError, actual.distanceTo(a.proxy.position));
        maxCorrection = Math.max(maxCorrection, Math.abs(a.ctrl._yawCorr || 0));
      }
      const row = { type, yaw, bodyYaw, neckPitch, scale, maxError, worstFrame, proxyError, maxCorrection };
      rows.push(row);
      if (![maxError, proxyError, maxCorrection].every(Number.isFinite) || maxError > tol || proxyError > tol || maxCorrection > clamp + tol) failures.push(row);
    }
  }
  const status = failures.length ? 'RED' : 'GREEN';
  console.log(JSON.stringify({ status, mutant: mutant || null, cases: rows.length, frames: rows.length * 1200,
    maxError: Math.max(...rows.map((r) => r.maxError)), maxProxyError: Math.max(...rows.map((r) => r.proxyError)),
    failedCases: failures.length, failures: failures.slice(0, 2) }, null, 2));
  process.exitCode = mutant ? (failures.length ? 0 : 1) : (failures.length ? 1 : 0);
} catch (e) { console.error(`head-yaw infra: ${e.stack}`); process.exitCode = 3; }
