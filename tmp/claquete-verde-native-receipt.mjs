import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = 'references/tv/claquete-verde/3d';
const base = `${root}/blender-v4-native`;
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const row = file => ({ file, bytes: statSync(file).size, sha256: sha256(file) });
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});

const rigReceipt = {
  provider: 'meshy',
  endpoint: 'v1/rigging',
  sourceModelTaskId: '019ff2db-f6a6-7170-a299-c8ffbdbb1810',
  rigTaskId: '019ff300-3625-7aeb-b638-292d73a2aa41',
  status: 'SUCCEEDED',
  progress: 100,
  createdAtEpochMs: 1786488311295,
  startedAtEpochMs: 1786488315775,
  finishedAtEpochMs: 1786488347312,
  authorizedStageCreditCeiling: 10,
  estimatedCreditsBeforeCall: 5,
  consumedCredits: 5,
  balanceBefore: 2565,
  balanceAfter: 2560,
  withinAuthorizedCeiling: true,
  newTextTo3DTasks: 0,
  exactSurfacePolicy: 'Meshy A geometry unchanged; preflight adds UV plus neutral packed texture only',
  artifacts: {
    originalMeshyA: row(`${root}/meshy-v1/claquete_verde_meshy_v1.glb`),
    texturedRigInput: row(`${base}/meshy-a-rig-input.glb`),
    rawNativeRig: row(`${base}/meshy-a-native-rig.glb`),
  },
};
writeFileSync(`${base}/rig-receipt.json`, JSON.stringify(rigReceipt, null, 2) + '\n');

const audit = JSON.parse(readFileSync(`${base}/audit/blender-audit.json`, 'utf8'));
const khronos = JSON.parse(readFileSync(`${base}/khronos-validator.json`, 'utf8'));
const pose = JSON.parse(readFileSync(`${base}/pose-inflate.json`, 'utf8'));
const contract = JSON.parse(readFileSync(`${base}/contract-matrix.json`, 'utf8'));
const animations = readdirSync(`${base}/anims`).filter(f => f.endsWith('.glb')).sort().map(f => row(`${base}/anims/${f}`));
const mutants = readdirSync(`${base}/mutantes`).filter(f => f.endsWith('.glb')).sort().map(f => row(`${base}/mutantes/${f}`));
const reviewPngs = walk(base).filter(f => f.toLowerCase().endsWith('.png')).sort().map(row);
const finalCase = contract.cases.find(c => c.id === 'final-native');

const receipt = {
  generatedAt: new Date().toISOString(),
  final: row(`${base}/claquete-verde-final-opt.glb`),
  source: row(`${base}/claquete-verde-source.glb`),
  posedEvidenceSource: row(`${base}/claquete-verde-posed-source.glb`),
  rig: rigReceipt,
  animations,
  mutants,
  reviewPngs,
  technical: {
    blender: audit.blender,
    armatures: audit.armatureCount,
    meshes: audit.meshCount,
    triangles: audit.meshes.reduce((n, m) => n + m.triangles, 0),
    bones: audit.armatures.reduce((n, a) => n + a.boneCount, 0),
    vertexGroups: audit.meshes[0]?.vertexGroups?.length,
    khronosFiles: khronos.files.length,
    khronosErrors: khronos.totalErrors,
    khronosWarnings: khronos.files.reduce((n, f) => n + f.warnings, 0),
    poseInflate: pose.personagens?.[0] || null,
    finalStaticMetrics: finalCase?.metrics || null,
    finalMotionMetrics: finalCase?.motion || null,
    finalChecks: { ...finalCase?.semantic, ...finalCase?.motionChecks },
  },
  causalEvidence: {
    matrix: row(`${base}/contract-matrix.json`),
    beforeV2Pass: contract.cases.find(c => c.id === 'before-v2-toy')?.pass,
    rejectedTransferPass: contract.cases.find(c => c.id === 'rejected-transfer')?.pass,
    mutantResults: Object.fromEntries(contract.cases.filter(c => c.id.startsWith('mutant-')).map(c => [c.id, c.pass])),
  },
  integration: { performed: false, allowed: false },
  approval: { selfApproved: false, cleanAssetReviewRequired: true },
};
writeFileSync(`${base}/artifact-receipt.json`, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({
  finalSha256: receipt.final.sha256,
  rigTaskId: rigReceipt.rigTaskId,
  consumedCredits: rigReceipt.consumedCredits,
  animations: animations.length,
  mutants: mutants.length,
  reviewPngs: reviewPngs.length,
  khronosErrors: receipt.technical.khronosErrors,
}, null, 2));
