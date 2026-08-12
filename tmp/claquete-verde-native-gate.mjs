// Causal matrix: the static semantic ruler AND the motion ruler must pass.
// V2 is bitten by toy-surface semantics; the rejected transfer is bitten by
// pose inflation; each explicit mutant is bitten by the intended semantic proxy.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const base = 'references/tv/claquete-verde/3d';
const outDir = `${base}/blender-v4-native/contracts`;
mkdirSync(outDir, { recursive: true });
const finalPose = `${base}/blender-v4-native/pose-inflate.json`;
const cases = [
  { id: 'final-native', model: `${base}/blender-v4-native/claquete-verde-final-opt.glb`, pose: finalPose, expect: true },
  { id: 'before-v2-toy', model: `${base}/blender-v2/claquete-verde-final-opt.glb`, pose: `${base}/blender-v2/pose-inflate.json`, expect: false },
  { id: 'rejected-transfer', model: `${base}/blender-v3/REJECTED-transfer-final.glb`, pose: `${base}/blender-v3/REJECTED-transfer-pose-inflate.json`, expect: false },
  { id: 'mutant-toy-joints', model: `${base}/blender-v4-native/mutantes/toy-joints.glb`, pose: finalPose, expect: false },
  { id: 'mutant-dorsal-slab', model: `${base}/blender-v4-native/mutantes/dorsal-slab.glb`, pose: finalPose, expect: false },
  { id: 'mutant-low-contrast', model: `${base}/blender-v4-native/mutantes/low-contrast.glb`, pose: finalPose, expect: false },
];

const matrix = [];
for (const item of cases) {
  const proc = spawnSync(process.execPath, ['tmp/claquete-verde-v3-contract.mjs', item.model], { encoding: 'utf8' });
  if (!proc.stdout.trim()) throw new Error(`${item.id}: semantic ruler returned no JSON: ${proc.stderr}`);
  const semantic = JSON.parse(proc.stdout);
  const pose = JSON.parse(readFileSync(item.pose, 'utf8'));
  const characters = pose.personagens || [];
  const clips = characters.flatMap(c => Object.values(c.clipes || {}));
  const motion = {
    worstP95: Math.max(...clips.map(c => c.esticP95pior)),
    worstPctAbove25: Math.max(...clips.map(c => c.pctAcima25)),
    maxBindError: Math.max(...characters.map(c => c.errBind)),
  };
  const motionChecks = {
    nativeMotionStable: motion.worstP95 <= 0.80 && motion.worstPctAbove25 <= 22.0,
    bindReproducesMesh: motion.maxBindError <= 0.01,
  };
  const semanticPass = Object.values(semantic.checks).every(Boolean);
  const pass = semanticPass && Object.values(motionChecks).every(Boolean);
  const row = { ...item, semantic: semantic.checks, metrics: semantic.metrics, motion, motionChecks, pass };
  writeFileSync(path.join(outDir, `${item.id}.json`), JSON.stringify(row, null, 2) + '\n');
  matrix.push(row);
  if (pass !== item.expect) throw new Error(`${item.id}: expected pass=${item.expect}, measured ${pass}`);
}
const result = {
  provenance: {
    staticRuler: 'tmp/claquete-verde-v3-contract.mjs',
    servedCardPx: 150,
    motionThresholds: { worstP95Max: 0.80, worstPctAbove25Max: 22.0, bindErrorMax: 0.01 },
    thresholdBasis: 'separates native final P95 0.676 / 20.6% from rejected transfer P95 1.316 / 25.13%',
  },
  cases: matrix,
};
writeFileSync(`${base}/blender-v4-native/contract-matrix.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, cases: matrix.map(r => ({ id: r.id, pass: r.pass, expected: r.expect })) }, null, 2));
