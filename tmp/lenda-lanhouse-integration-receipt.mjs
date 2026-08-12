// Recibo determinístico da integração offline da Lenda da Lan House.
// Não abre browser nem atribui nota visual: liga a origem v4 aos arquivos servidos.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const states = ['idle', 'walk', 'run', 'shoot', 'death', 'crouch', 'crouchwalk', 'jump', 'idle1h', 'walk1h', 'walkfire'];
const sourceModel = 'references/nerdolas/lenda-lanhouse/3d/meshy-t2-v1/lenda-lanhouse-v4-final-opt.glb';
const publicModel = 'public/models/characters/lenda-lanhouse.glb';
const sourceAnimations = 'references/nerdolas/lenda-lanhouse/3d/meshy-t2-v1/anims-v4-final';
const publicAnimations = 'public/models/anims/lenda-lanhouse';
const files = {
  sourceModel: { file: sourceModel, sha256: sha256(sourceModel) },
  publicModel: { file: publicModel, sha256: sha256(publicModel) },
  merged: {
    file: 'public/models/anims/lenda-lanhouse.glb',
    sha256: sha256('public/models/anims/lenda-lanhouse.glb'),
  },
  animations: Object.fromEntries(states.map((state) => [state, {
    source: `${sourceAnimations}/${state}.glb`,
    sourceSha256: sha256(`${sourceAnimations}/${state}.glb`),
    public: `${publicAnimations}/${state}.glb`,
    publicSha256: sha256(`${publicAnimations}/${state}.glb`),
  }])),
};
const exactModelCopy = files.sourceModel.sha256 === files.publicModel.sha256;
const exactAnimationCopies = Object.values(files.animations).every((entry) => entry.sourceSha256 === entry.publicSha256);
if (!exactModelCopy || !exactAnimationCopies) {
  throw new Error(`integração não é cópia exata: model=${exactModelCopy} animations=${exactAnimationCopies}`);
}
const receipt = {
  char: 'lenda-lanhouse',
  phase: 'offline-integration',
  version: JSON.parse(readFileSync('package.json', 'utf8')).version,
  canonicalWeapon: 'm4',
  states,
  exactModelCopy,
  exactAnimationCopies,
  files,
  blenderGripEvidence: 'tools/eval/asset-evidence/lenda-lanhouse/grip/lenda-lanhouse-grip-evidence.json',
  browserEvidence: {
    status: 'pending-single-browser-agent',
    handoff: 'tools/eval/asset-evidence/lenda-lanhouse/BROWSER-HANDOFF.md',
  },
};
const output = 'tools/eval/asset-evidence/lenda-lanhouse/integration-receipt.json';
mkdirSync('tools/eval/asset-evidence/lenda-lanhouse', { recursive: true });
writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ output, exactModelCopy, exactAnimationCopies, clips: states.length, version: receipt.version }));
