import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = 'references/nerdolas/lenda-lanhouse/3d/meshy-t2-v1';
const describe = (path) => ({
  path,
  bytes: statSync(path).size,
  sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
});
const model = describe(`${base}/lenda-lanhouse-v4-final-opt.glb`);
const animations = readdirSync(`${base}/anims-v4-final`).filter((name) => name.endsWith('.glb')).sort().map((name) => describe(join(base, 'anims-v4-final', name)));
const evidenceNames = [
  'v4-finalize-receipt.json', 'anims-v4-final/v4-animation-receipt.json',
  'v4-probe-before.json', 'v4-contract-before.json', 'v4-probe-after.json', 'v4-contract-after.json',
  'v4-mutant-props-contract.json', 'v4-mutant-crouch-contract.json', 'v4-mutant-death-contract.json',
  'v4-final-audit.json', 'v4-khronos-report.json', 'v4-pose-inflate.json',
  'v4-floor-render-receipt.json', 'v4-crouch-death-contact.png', 'v4-crouchwalk-scan.json',
];
const receipt = {
  artifactType: 'model/gltf-binary',
  model,
  animations,
  evidence: evidenceNames.map((name) => describe(join(base, name))),
  sourceModelTask: '019ff299-4947-7300-bf91-8e60bf775532',
  rigTask: '019ff29c-5a2f-7f9e-a649-ef0cd5c8c373',
  blender: '5.2.0 LTS',
  integrationStatus: 'not-integrated',
  reviewStatus: 'awaiting-clean-asset-review',
};
writeFileSync(`${base}/v4-artifact-receipt.json`, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ model: model.sha256, animations: animations.length, evidence: receipt.evidence.length }));
