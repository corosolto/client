#!/usr/bin/env node
// Gate da exceção NORMAL-only do esquerdomacho: landmark histórico aponta o ORIGINAL
// (51bd…) e o público é o output exato aprovado (5a61…). Régua: GLM-NORMAIS-FIT-EQUIVALENCE-R1-RESULTADO.md.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {REFS, NORMAL_ONLY_EQUIVALENCE, parseCharacterGlb, proveAgainstReference, proveNormalOnlyEquivalence} from '../characters/normal-only-equivalence.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const ref = JSON.parse(readFileSync(join(root, REFS.path)));
const landmarks = JSON.parse(readFileSync(join(root, 'public/models/items/face-landmarks.json')));

function attributeOffset(buffer, name) {
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength));
  const prim = json.meshes[0].primitives[0];
  const a = json.accessors[prim.attributes[name]], v = json.bufferViews[a.bufferView];
  return { base: 20 + jsonLength + 8 + (v.byteOffset ?? 0) + (a.byteOffset ?? 0), componentType: a.componentType };
}

function check() {
  const results = [];
  for (const [bodyId, evidence] of Object.entries(NORMAL_ONLY_EQUIVALENCE)) {
    const buffer = readFileSync(join(root, `public${evidence.model}`));
    const legacySha = landmarks.bodies[bodyId.split(':').pop()]?.bodySha256;
    const proof = proveNormalOnlyEquivalence({ bodyId, legacySha, buffer });
    if (proof.sha !== evidence.exactOutputSha) throw new Error(`${bodyId}: output público não é o sha exato congelado`);
    results.push(`${bodyId}: ${proof.mode} legacy ${legacySha.slice(0, 12)} → output ${proof.sha.slice(0, 12)} (protected ${proof.protectedSha.slice(0, 12)}, normal ${proof.normalSha.slice(0, 12)}, ${proof.count} vértices)`);
  }
  return results;
}

function mutants() {
  const bodyId = 'character:esquerdomacho', evidence = NORMAL_ONLY_EQUIVALENCE[bodyId];
  const pristine = readFileSync(join(root, `public${evidence.model}`));
  const refEntry = ref.models.esquerdomacho;
  const position = attributeOffset(pristine, 'POSITION'), joints = attributeOffset(pristine, 'JOINTS_0');
  const parsed = parseCharacterGlb(pristine);
  const flip = (buffer, offset) => { const mutant = Buffer.from(buffer); mutant[offset] ^= 1; return mutant; };
  const cases = {
    'position-byte': () => proveNormalOnlyEquivalence({ bodyId, legacySha: evidence.legacySha, buffer: flip(pristine, position.base) }),
    'joints-byte': () => proveNormalOnlyEquivalence({ bodyId, legacySha: evidence.legacySha, buffer: flip(pristine, joints.base) }),
    'normal-byte': () => proveNormalOnlyEquivalence({ bodyId, legacySha: evidence.legacySha, buffer: flip(pristine, parsed.ranges[0][0]) }),
    'legacy-sha': () => proveNormalOnlyEquivalence({ bodyId, legacySha: '0'.repeat(64), buffer: pristine }),
    'legacy-retarget-to-output': () => proveNormalOnlyEquivalence({ bodyId, legacySha: evidence.exactOutputSha, buffer: pristine }),
    'item-id-unknown': () => proveNormalOnlyEquivalence({ bodyId: 'character:capitao', legacySha: evidence.legacySha, buffer: pristine }),
    'json-layout-byte': () => { const mutant = Buffer.from(pristine); mutant[24] ^= 1; return proveNormalOnlyEquivalence({ bodyId, legacySha: evidence.legacySha, buffer: mutant }); },
    'other-normal-byte': () => proveNormalOnlyEquivalence({ bodyId, legacySha: evidence.legacySha, buffer: flip(pristine, parsed.ranges[parsed.ranges.length - 1][0] + 4) }),
  };
  const killed = [];
  for (const [name, run] of Object.entries(cases)) {
    let reason = '';
    try { run(); } catch (error) { reason = error.message; }
    if (!reason) throw new Error(`mutante ${name} sobreviveu — a régua de equivalência está cega`);
    killed.push({ name, reason: reason.slice(0, 90) });
  }
  // O positivo de identidade usa o original ad696fb87 com SHA conferido.
  // Clone shallow sem esse objeto registra a ausência; não fabrica uma referência.
  const notes = [];
  let original = null;
  try {
    const candidate = execFileSync('git', ['-C', root, 'show', `ad696fb87:public${evidence.model}`], {maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore']});
    if (createHash('sha256').update(candidate).digest('hex') === evidence.legacySha) original = candidate;
    else notes.push('legacy-buffer-sha-mismatch');
  } catch { notes.push('legacy-buffer-unavailable-shallow-clone'); }
  if (original) {
    const identity = proveAgainstReference({ ref: refEntry, bodyId, legacySha: evidence.legacySha, buffer: original });
    if (identity.mode !== 'identity' || identity.sha !== evidence.legacySha) throw new Error('positivo identidade (original ad696fb87) falhou');
  } else {
    notes.push('identity-positive-not-exercised');
  }
  return { mutants: killed, notes, identityVerified: !!original };
}

const results = check();
console.log(results.join('\n'));
if (process.argv.includes('--mutate')) { const killed = mutants(); console.log(`normal-only-fit-equivalence-check mutate: ${JSON.stringify(killed)}`); }
else console.log(`normal-only-fit-equivalence-check: ${results.length}/${Object.keys(NORMAL_ONLY_EQUIVALENCE).length} VERDE`);
