// Exceção auditável à identidade bodyId+bodySha256 dos landmarks de eyewear: legacySha é o
// sha do ORIGINAL congelado na ref v2 e o público atual é o OUTPUT exato aprovado. Proveniência: NORMAIS-PERSONAGENS.md.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const sha = buffer => createHash('sha256').update(buffer).digest('hex');

export const REFS = {
  path: 'tools/eval/refs/character-normal-smooth-groups.json',
  sha256: '26abbd0e9247dbf10ddb92df72ee7602cf78db96a3a146f865f811d780f768a9',
};

// Toda exceção é declarada aqui, com o sha EXATO do output público congelado.
// Sem entrada nesta tabela não existe exceção — nunca "NORMAL não importa".
export const NORMAL_ONLY_EQUIVALENCE = {
  'character:esquerdomacho': {
    model: '/models/characters/esquerdomacho.glb',
    legacySha: '51bd7a1aaa6ffd13dcb24dfc03d54ebed77b4e1dc4bd0aaf58de6b1ae84cbbf0',
    exactOutputSha: '5a615784b38b71cd3b2557f8baa7440ad7b972ad6d8dc1f3dddd75a4cee9afe2',
  },
};

export function parseCharacterGlb(buffer) {
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('não é GLB');
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength));
  const binBase = 20 + jsonLength + 8;
  if (json.meshes?.length !== 1 || json.meshes[0].primitives?.length !== 1)
    throw new Error('layout GLB inesperado: exige 1 mesh / 1 primitive');
  const prim = json.meshes[0].primitives[0];
  const accessor = name => {
    const index = prim.attributes[name];
    if (index == null) throw new Error(`atributo ${name} ausente`);
    const a = json.accessors[index], v = json.bufferViews[a.bufferView];
    return { base: binBase + (v.byteOffset ?? 0) + (a.byteOffset ?? 0), stride: v.byteStride ?? 12 };
  };
  const positionAccessor = json.accessors[prim.attributes.POSITION];
  if (positionAccessor.componentType !== 5126) throw new Error('POSITION não é FLOAT');
  const normal = accessor('NORMAL');
  const count = positionAccessor.count;
  const ranges = [];
  for (let i = 0; i < count; i++) {
    const offset = normal.base + i * normal.stride;
    ranges.push([offset, offset + 12]);
  }
  // Semântica idêntica ao character-normal-quality-check: NORMAL zerada no clone,
  // NORMAL extraída contígua — protectedSha cobre JSON+bin fora de NORMAL.
  const protectedBytes = Buffer.from(buffer);
  for (const [start, end] of ranges) protectedBytes.fill(0, start, end);
  const normalBytes = Buffer.alloc(count * 12);
  for (let i = 0; i < count; i++) buffer.copy(normalBytes, i * 12, ranges[i][0], ranges[i][1]);
  return { sha: sha(buffer), protectedSha: sha(protectedBytes), normalSha: sha(normalBytes), count, ranges };
}

// Prova pura contra uma entrada de ref v2: aceita identidade (original inalterado)
// ou equivalência NORMAL-only; qualquer divergência recusa com motivo específico.
export function proveAgainstReference({ ref, bodyId, legacySha, buffer }) {
  const assert = (condition, message) => { if (!condition) throw new Error(`${bodyId}: ${message}`); };
  assert(ref && typeof ref === 'object', 'entrada de referência ausente');
  const parsed = parseCharacterGlb(buffer);
  if (parsed.sha === legacySha && legacySha === ref.sha)
    return { bodyId, mode: 'identity', sha: parsed.sha, protectedSha: parsed.protectedSha, normalSha: parsed.normalSha, count: parsed.count };
  assert(legacySha === ref.sha, `legacySha ${legacySha?.slice(0, 12)} não é o sha do ORIGINAL congelado na ref (${ref.sha.slice(0, 12)}) — captura histórica não pode ser retargetada`);
  assert(parsed.count === ref.count, `vértices ${parsed.count} ≠ original ${ref.count}`);
  assert(parsed.protectedSha === ref.protectedSha, `fingerprint protegido ${parsed.protectedSha.slice(0, 12)} ≠ ${ref.protectedSha.slice(0, 12)} — bytes fora de NORMAL mudaram (POSITION/JOINTS/skin/materiais/anims/layout)`);
  assert(parsed.normalSha === ref.normalSha, `fingerprint NORMAL ${parsed.normalSha.slice(0, 12)} ≠ ${ref.normalSha.slice(0, 12)} — normais não são as do output aprovado`);
  return { bodyId, mode: 'normal-only-equivalence', sha: parsed.sha, protectedSha: parsed.protectedSha, normalSha: parsed.normalSha, count: parsed.count };
}

// Caminho do gate: valida o arquivo de ref congelado e a tabela de exceções antes de provar.
export function proveNormalOnlyEquivalence({ bodyId, legacySha, buffer }) {
  const evidence = NORMAL_ONLY_EQUIVALENCE[bodyId];
  if (!evidence) throw new Error(`${bodyId}: sem exceção de equivalência NORMAL-only declarada — identidade bodyId+bodySha256 permanece obrigatória`);
  const refRaw = readFileSync(join(root, REFS.path));
  const refSha = sha(refRaw);
  if (refSha !== REFS.sha256)
    throw new Error(`refs ${REFS.path} sha ${refSha.slice(0, 12)} ≠ congelado ${REFS.sha256.slice(0, 12)} — referência mudou, equivalência recusada`);
  const ref = JSON.parse(refRaw).models[bodyId.split(':').pop()];
  if (!ref) throw new Error(`${bodyId}: sem entrada na ref v2 — equivalência impossível`);
  const proof = proveAgainstReference({ ref, bodyId, legacySha, buffer });
  if (proof.mode === 'normal-only-equivalence')
    if (proof.sha !== evidence.exactOutputSha || legacySha !== evidence.legacySha)
      throw new Error(`${bodyId}: prova passou na ref mas diverge da tabela de exceções (output exato ${evidence.exactOutputSha.slice(0, 12)} / legacy ${evidence.legacySha.slice(0, 12)})`);
  return proof;
}
