#!/usr/bin/env node
/* ============================================================================
   pose-posture.mjs — C8: A POSTURA QUE O JOGADOR VÊ (pose, não bind)
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O dono, 04/08: "todos personagens após o pagodeiro e os palhaços estão uma merda
   na postura". O char-probe mede BIND POSE — e em bind todo mundo passa. O defeito
   que ele vê só existe COM O CLIPE RODANDO. Nenhuma régua olhava isso.

   O QUE MEDE (por personagem, amostrando o clipe em N quadros):
     • hipsDrop   — queda do quadril vs bind, em fração da altura do quadril.
                    Ajoelhado = queda grande. É o "ajoelhado" das capturas do dono.
     • kneeFlex   — menor ângulo Perna-Joelho-Pé no clipe (180° = perna reta).
     • torsoPitch — inclinação do vetor Hips->Neck contra a vertical (encurvado).
     • spread     — desvio-padrão da distância junta-a-junta vs bind (deformação geral).

   PROCEDÊNCIA DOS TETOS
   Nenhum teto vem de tabela publicada — vêm do PRÓPRIO ELENCO, que é a forma como o
   dono reclama ("compare com o mandrake", "os palhaços estão bem"). O grupo de
   controle é declarado: os 8 palhaços (adjim, cadequinha, esbirro, jozo, padata,
   padati, palhacomal, titica), que o dono aprovou e que rodam o clipe COMPARTILHADO
   sobre esqueleto idêntico ao doador — o caso em que o clipe casa por construção.

   O TESTE DECISIVO (--ab)
   18 personagens têm esqueleto IDÊNTICO ao doador mst (skel-family.mjs, maxDist=0.0000).
   Para esses, retargetar o clipe compartilhado é, por definição, a IDENTIDADE: o rig de
   origem e o de destino são o mesmo. Então `models/anims/<id>/idle.glb` TEM que produzir
   a mesma pose que `models/anims/mixamo/idle.glb`. `--ab` mede a diferença. Se ela não
   for ~0, o retarget por personagem está corrompendo, e não corrigindo.

   uso: node tools/eval/pose-posture.mjs            (relatório do elenco)
        node tools/eval/pose-posture.mjs --ab       (A/B clipe por char vs compartilhado)
        node tools/eval/pose-posture.mjs --json
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { readGLB, buildScene, worldMats, poseWith } from './tp-mount-probe.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const CHARDIR = path.join(ROOT, 'public/models/characters');
const ANIMDIR = path.join(ROOT, 'public/models/anims');
const SHARED = path.join(ANIMDIR, 'mixamo');

const FRAMES = 24;          // amostras no clipe
const STATE = process.env.POSE_STATE || 'idle';

const ids = fs.readdirSync(CHARDIR).filter((f) => f.endsWith('.glb')).map((f) => f.replace(/\.glb$/, '')).sort();

// grupo de controle declarado: os palhaços que o dono aprovou
const CONTROLE = new Set(['adjim', 'cadequinha', 'esbirro', 'jozo', 'padata', 'padati', 'palhacomal', 'titica']);

const RX = {
  hips: /^hips$/i, neck: /^neck$/i, head: /^head$/i,
  upleg: /^(left|right)upleg$/i, leg: /^(left|right)leg$/i, foot: /^(left|right)foot$/i,
};
const ang = (a, b, c) => {
  const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
  const lu = Math.hypot(...u) || 1, lv = Math.hypot(...v) || 1;
  const d = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (lu * lv);
  return Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI;
};
const pos = (W, i) => [W[i][12], W[i][13], W[i][14]];

function clipFor(id, state) {
  const per = path.join(ANIMDIR, id, `${state}.glb`);
  if (fs.existsSync(per)) return { file: per, src: 'perChar' };
  const sh = path.join(SHARED, `${state}.glb`);
  if (fs.existsSync(sh)) return { file: sh, src: 'shared' };
  return null;
}

function measure(id, clipFile) {
  const g = readGLB(path.join(CHARDIR, `${id}.glb`));
  const sc = buildScene(g);
  const bind = worldMats(sc);
  const idx = {};
  sc.nodes.forEach((n) => {
    for (const [k, rx] of Object.entries(RX)) {
      if (rx.test(n.name)) { (idx[k] ||= []).push(n.i); }
    }
  });
  if (!idx.hips) return null;
  const hipsI = idx.hips[0];
  const hipsBindY = bind[hipsI][13] || 1;

  // duração do clipe
  const ag = readGLB(clipFile);
  const an = ag.json.animations && ag.json.animations[0];
  let dur = 1;
  if (an) for (const ch of an.channels) {
    const inp = ag.json.accessors[an.samplers[ch.sampler].input];
    if (inp && inp.max) dur = Math.max(dur, inp.max[0]);
  }

  let maxDrop = 0, minKnee = 180, maxPitch = 0, maxSpread = 0;
  for (let f = 0; f < FRAMES; f++) {
    const t = (f / FRAMES) * dur;
    const W = poseWith(sc, clipFile, t);
    const hp = pos(W, hipsI);
    maxDrop = Math.max(maxDrop, (hipsBindY - hp[1]) / hipsBindY);
    if (idx.upleg && idx.leg && idx.foot) {
      for (let s = 0; s < Math.min(idx.upleg.length, idx.leg.length, idx.foot.length); s++) {
        minKnee = Math.min(minKnee, ang(pos(W, idx.upleg[s]), pos(W, idx.leg[s]), pos(W, idx.foot[s])));
      }
    }
    const top = idx.neck ? idx.neck[0] : (idx.head ? idx.head[0] : null);
    if (top !== null) {
      const tp = pos(W, top);
      const v = [tp[0] - hp[0], tp[1] - hp[1], tp[2] - hp[2]];
      const l = Math.hypot(...v) || 1;
      maxPitch = Math.max(maxPitch, Math.acos(Math.max(-1, Math.min(1, v[1] / l))) * 180 / Math.PI);
    }
    // deformação geral: quanto cada junta se afastou da bind, normalizado
    let sum = 0, n = 0;
    for (let i = 0; i < W.length; i++) {
      if (!W[i] || !bind[i]) continue;
      const d = Math.hypot(W[i][12] - bind[i][12], W[i][13] - bind[i][13], W[i][14] - bind[i][14]);
      sum += d; n++;
    }
    if (n) maxSpread = Math.max(maxSpread, sum / n / hipsBindY);
  }
  return { hipsDrop: maxDrop, kneeFlex: minKnee, torsoPitch: maxPitch, spread: maxSpread };
}

// ---------- A/B: clipe por char vs compartilhado, em rig IDÊNTICO ao doador ----------
function ab(id) {
  const per = path.join(ANIMDIR, id, `${STATE}.glb`);
  const sh = path.join(SHARED, `${STATE}.glb`);
  if (!fs.existsSync(per) || !fs.existsSync(sh)) return null;
  const g = readGLB(path.join(CHARDIR, `${id}.glb`));
  const sc = buildScene(g);
  const bind = worldMats(sc);
  const hipsI = sc.nodes.findIndex((n) => RX.hips.test(n.name));
  const hipsBindY = hipsI >= 0 ? (bind[hipsI][13] || 1) : 1;
  const ag = readGLB(sh);
  const an = ag.json.animations && ag.json.animations[0];
  let dur = 1;
  if (an) for (const ch of an.channels) {
    const inp = ag.json.accessors[an.samplers[ch.sampler].input];
    if (inp && inp.max) dur = Math.max(dur, inp.max[0]);
  }
  let maxd = 0, sumd = 0, n = 0;
  for (let f = 0; f < FRAMES; f++) {
    const t = (f / FRAMES) * dur;
    const A = poseWith(sc, per, t), B = poseWith(sc, sh, t);
    for (let i = 0; i < A.length; i++) {
      if (!A[i] || !B[i]) continue;
      const d = Math.hypot(A[i][12] - B[i][12], A[i][13] - B[i][13], A[i][14] - B[i][14]) / hipsBindY;
      maxd = Math.max(maxd, d); sumd += d; n++;
    }
  }
  return { maxDelta: maxd, meanDelta: n ? sumd / n : 0 };
}

const wantAB = process.argv.includes('--ab');
const out = [];

if (wantAB) {
  // só faz sentido nos rigs idênticos ao doador (skel-family.mjs)
  console.log(`A/B — clipe POR CHAR vs COMPARTILHADO, estado "${STATE}", em rigs idênticos ao doador.`);
  console.log('Nesses rigs o retarget é, por definição, a identidade. delta>0 = corrupção.\n');
  console.log('id             maxDelta  meanDelta   veredito');
  console.log('-'.repeat(56));
  for (const id of ids) {
    const r = ab(id);
    if (!r) continue;
    out.push({ id, ...r });
    const bad = r.maxDelta > 0.02;
    console.log(id.padEnd(14) + r.maxDelta.toFixed(4).padStart(9) + r.meanDelta.toFixed(4).padStart(11)
      + '   ' + (bad ? 'CORROMPE' : 'ok'));
  }
  console.log('-'.repeat(56));
} else {
  console.log(`C8 — POSTURA EM POSE, estado "${STATE}" (${FRAMES} quadros).`);
  console.log('controle = os 8 palhaços aprovados pelo dono (clipe compartilhado, rig do doador)\n');
  console.log('id            clipe     hipsDrop  kneeFlex  torsoPitch  spread');
  console.log('-'.repeat(66));
  for (const id of ids) {
    const c = clipFor(id, STATE);
    if (!c) continue;
    const m = measure(id, c.file);
    if (!m) continue;
    out.push({ id, src: c.src, ...m, controle: CONTROLE.has(id) });
    console.log(id.padEnd(14) + c.src.padEnd(10)
      + m.hipsDrop.toFixed(3).padStart(8) + m.kneeFlex.toFixed(1).padStart(10)
      + m.torsoPitch.toFixed(1).padStart(12) + m.spread.toFixed(3).padStart(8)
      + (CONTROLE.has(id) ? '   <- controle' : ''));
  }
  console.log('-'.repeat(66));
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
  const ctl = out.filter((r) => r.controle), rest = out.filter((r) => !r.controle);
  const per = out.filter((r) => r.src === 'perChar');
  const shr = out.filter((r) => r.src === 'shared');
  const line = (nome, arr) => console.log(`  ${nome.padEnd(22)} n=${String(arr.length).padStart(2)}  hipsDrop=${med(arr.map(r => r.hipsDrop)).toFixed(3)}  kneeFlex=${med(arr.map(r => r.kneeFlex)).toFixed(1)}  torsoPitch=${med(arr.map(r => r.torsoPitch)).toFixed(1)}  spread=${med(arr.map(r => r.spread)).toFixed(3)}`);
  console.log('\nMEDIANAS POR GRUPO');
  line('controle (palhacos)', ctl);
  line('resto', rest);
  line('clipe compartilhado', shr);
  line('clipe por personagem', per);
}

if (process.argv.includes('--json')) fs.writeFileSync(path.join(ROOT, 'tools/eval/pose_posture.json'), JSON.stringify(out, null, 2));
