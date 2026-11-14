import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { inspectBindBytes } from '../bind-inspector.mjs';
import { CANONICAL_SLOTS, TARGET_SLOTS } from './wearables-schema.mjs';

export const MANIFEST_VERSION = 'cs-wearables/1';
export const CENSUS_VERSION = 'cs-wearable-census/1';
export const MATRIX_VERSION = 'cs-wearable-matrix/1';

const SLOT_BY_CATEGORY = Object.freeze({
  backpack: 'back', cap: 'head', piercing: 'piercing', tattoo: 'tattoo',
  shirt: 'torso-inner', jacket: 'torso-outer', pants: 'legs', shoes: 'feet',
});
const MODES = new Set(['rigid', 'surface', 'skinned']);
const REQUIRED_ROLES = Object.freeze({
  hips: 'Hips', chest: 'Spine02', spine: 'Spine', head: 'Head',
  leftHand: 'LeftHand', rightHand: 'RightHand', leftFoot: 'LeftFoot', rightFoot: 'RightFoot',
});
const SOCKET_ROLE = Object.freeze({ back: 'chest', head: 'head', face: 'head', piercing: 'head' });
const fail = message => { throw new Error(message); };
const must = (condition, message) => { if (!condition) fail(message); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sorted = values => [...values].sort(compareText);
const plainObject = value => value && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys, label) => {
  must(plainObject(value), `${label} object required`);
  must(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()), `${label} keys mismatch`);
};
const uniqueStrings = (value, label) => {
  must(Array.isArray(value) && value.every(v => typeof v === 'string' && v.length > 0), `${label} string array required`);
  must(new Set(value).size === value.length, `${label} duplicates`);
};
const normalizeError = error => String(error?.message || error).replaceAll('\\', '/');

function safeFile(root, path, label) {
  must(typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.split('/').includes('..'), `${label} relative path required`);
  const base = `${realpathSync(root)}${sep}`, absolute = resolve(root, path);
  must(existsSync(absolute) && lstatSync(absolute).isFile() && !lstatSync(absolute).isSymbolicLink(), `${label} file missing/invalid`);
  must(`${realpathSync(absolute)}`.startsWith(base), `${label} escapes repository`);
  return absolute;
}

function parseGlbSkeleton(bytes, sourcePath) {
  must(Buffer.isBuffer(bytes) && bytes.length >= 20, `${sourcePath}: GLB bytes required`);
  must(bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, `${sourcePath}: invalid GLB header`);
  let offset = 12, document = null, chunk = 0;
  while (offset < bytes.length) {
    must(offset + 8 <= bytes.length, `${sourcePath}: truncated GLB chunk`);
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    must(length % 4 === 0 && offset + 8 + length <= bytes.length, `${sourcePath}: invalid GLB chunk bounds`);
    if (chunk === 0) {
      must(type === 0x4e4f534a, `${sourcePath}: JSON chunk must be first`);
      document = JSON.parse(bytes.toString('utf8', offset + 8, offset + 8 + length));
    }
    offset += 8 + length;
    chunk++;
  }
  must(document?.asset?.version === '2.0' && Array.isArray(document.nodes) && Array.isArray(document.skins), `${sourcePath}: glTF skeleton document required`);
  const parents = Array(document.nodes.length).fill(null);
  document.nodes.forEach((node, parent) => {
    for (const child of node.children ?? []) {
      must(Number.isSafeInteger(child) && child >= 0 && child < parents.length && parents[child] === null, `${sourcePath}: invalid node hierarchy`);
      parents[child] = parent;
    }
  });
  const skins = document.skins.map((skin, skinIndex) => {
    must(Array.isArray(skin.joints) && skin.joints.length > 0 && new Set(skin.joints).size === skin.joints.length, `${sourcePath}: invalid skin ${skinIndex}`);
    const jointIndex = new Map(skin.joints.map((node, index) => [node, index]));
    return skin.joints.map((node, index) => {
      must(Number.isSafeInteger(node) && node >= 0 && node < document.nodes.length, `${sourcePath}: joint outside node domain`);
      let parent = parents[node];
      while (parent !== null && !jointIndex.has(parent)) parent = parents[parent];
      return {
        index,
        name: typeof document.nodes[node].name === 'string' ? document.nodes[node].name : '',
        parent: parent === null ? null : jointIndex.get(parent),
      };
    });
  });
  return skins;
}

function sourceIdentity(path, skinByPath) {
  if (path.startsWith('public/models/characters/')) {
    return { bodyId: `character:${path.slice(path.lastIndexOf('/') + 1, -4)}`, sourceKind: 'character' };
  }
  if (path.startsWith('public/models/skins/')) {
    const skin = skinByPath.get(path);
    must(skin, `${path}: versioned skin missing from manifest`);
    return { bodyId: `skin:${skin.id}`, sourceKind: 'skin', baseCharacter: skin.character };
  }
  must(path === 'public/models/dollynho_dance.glb', `unsupported body source ${path}`);
  return { bodyId: 'auxiliary:dollynho-dance', sourceKind: 'auxiliary' };
}


export function buildCensus(root) {
  const skinManifest = JSON.parse(readFileSync(join(root, 'public/models/skins/manifest.json'), 'utf8'));
  must(skinManifest?.schema === 1 && plainObject(skinManifest.skins), 'skin manifest schema unsupported');
  const skinByPath = new Map(Object.entries(skinManifest.skins).map(([id, skin]) => [`public${skin.model}`, { id, character: skin.character }]));
  const listDirectory = directory => sorted(readdirSync(directory).filter(name => name.endsWith('.glb')).map(name => relative(root, join(directory, name)).split(sep).join('/')));
  const paths = sorted([...listDirectory(join(root, 'public/models/characters')), ...listDirectory(join(root, 'public/models/skins')), 'public/models/dollynho_dance.glb']);
  const manifestPaths = sorted([...skinByPath.keys()]);
  must(JSON.stringify(manifestPaths) === JSON.stringify(paths.filter(path => path.startsWith('public/models/skins/'))), 'skin manifest/files are not a complete bijection');
  const bodies = [];
  for (const path of paths) {
    const bytes = readFileSync(join(root, path)), sourceSha256 = hash(bytes), skins = parseGlbSkeleton(bytes, path);
    const identity = sourceIdentity(path, skinByPath), jointNames = skins.flatMap(skin => skin.map(joint => joint.name));
    const duplicateJointNames = sorted([...new Set(jointNames.filter((name, index) => name && jointNames.indexOf(name) !== index))]);
    const structure = skins.map(skin => skin.map(({ name, parent }) => ({ name, parent })));
    const structureSha256 = hash(JSON.stringify({ version: 1, skins: structure }));
    const roles = {};
    for (const [role, bone] of Object.entries(REQUIRED_ROLES)) {
      const count = jointNames.filter(name => name === bone).length;
      roles[role] = count === 1 ? bone : null;
    }
    const sockets = Object.fromEntries(Object.entries(SOCKET_ROLE).map(([slot, role]) => [slot, roles[role] ? {
      bone: roles[role], certified: false, transform: null, reason: 'body-specific transform not authored or human-certified',
    } : null]));
    let bindInspection;
    try {
      const report = inspectBindBytes(bytes, sourceSha256);
      bindInspection = { status: 'pass', bindFingerprintSha256: report.bindFingerprintSha256, geometryFingerprintSha256: report.geometryFingerprintSha256, weightsFingerprintSha256: report.weightsFingerprintSha256 };
    } catch (error) {
      bindInspection = { status: 'fail', reason: normalizeError(error) };
    }
    const issues = [];
    if (skins.length !== 1) issues.push(`skin-count-${skins.length}`);
    if (duplicateJointNames.length) issues.push(`ambiguous-joint-names:${duplicateJointNames.join(',')}`);
    const missingRoles = Object.entries(roles).filter(([, bone]) => bone === null).map(([role]) => role);
    if (missingRoles.length) issues.push(`missing-canonical-roles:${missingRoles.join(',')}`);
    if (bindInspection.status === 'fail') issues.push(`bind-inspection:${bindInspection.reason}`);
    const profileId = `${identity.bodyId}@${sourceSha256.slice(0, 12)}`;
    bodies.push({
      ...identity, path, bytes: bytes.length, sourceSha256, structureSha256,
      familyId: `rig-${structureSha256.slice(0, 12)}`, profileId,
      skinCount: skins.length, jointCount: jointNames.length, jointNames, duplicateJointNames, roles, sockets,
      bindInspection,
      structuralStatus: issues.length ? 'incompatible' : 'candidate', issues,
      fitProfile: { status: issues.length ? 'incompatible' : 'unknown', certifiedSlots: [], reason: issues.length ? issues.join('; ') : 'no body/slot fit has been authored or human-certified' },
    });
  }
  must(new Set(bodies.map(body => body.bodyId)).size === bodies.length, 'duplicate bodyId');
  const grouped = new Map();
  for (const body of bodies) {
    if (!grouped.has(body.familyId)) grouped.set(body.familyId, []);
    grouped.get(body.familyId).push(body);
  }
  const families = sorted(grouped.keys()).map(familyId => {
    const members = grouped.get(familyId).sort((a, b) => compareText(a.bodyId, b.bodyId));
    const structureIssues = sorted([...new Set(members.flatMap(body => body.issues.filter(issue => !issue.startsWith('bind-inspection:'))))]);
    return {
      familyId, structureSha256: members[0].structureSha256,
      status: structureIssues.length ? 'incompatible' : 'structurally-compatible',
      reasons: structureIssues,
      bodies: members.map(body => body.bodyId),
      note: 'A shared joint vocabulary/hierarchy is not proof of shared proportions, bind pose, topology, socket transform, garment fit or clipping clearance.',
    };
  });
  const sourceCounts = Object.fromEntries(['character', 'skin', 'auxiliary'].map(kind => [kind, bodies.filter(body => body.sourceKind === kind).length]));
  return {
    schemaVersion: CENSUS_VERSION, status: 'draft', runtimeEnabled: false,
    discovery: { roots: ['public/models/characters/*.glb', 'public/models/skins/*.glb', 'public/models/dollynho_dance.glb'], ordering: 'UTF-16 path sort; no timestamps' },
    summary: { bodies: bodies.length, families: families.length, sourceCounts, candidates: bodies.filter(body => body.structuralStatus === 'candidate').length, incompatible: bodies.filter(body => body.structuralStatus === 'incompatible').length },
    families, bodies: bodies.sort((a, b) => compareText(a.bodyId, b.bodyId)),
  };
}

function rejectApprovalTrue(value, path = 'manifest') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    must(!(key === 'approved' && child === true), `${path}.${key}: approved:true prohibited`);
    rejectApprovalTrue(child, `${path}.${key}`);
  }
}

export function validateManifest(manifest, root) {
  exactKeys(manifest, ['schemaVersion', 'status', 'runtimeEnabled', 'certificationPolicy', 'clippingPolicy', 'slots', 'items'], 'manifest');
  must(manifest.schemaVersion === MANIFEST_VERSION && manifest.status === 'draft' && manifest.runtimeEnabled === false, 'manifest draft/runtime contract');
  must(manifest.certificationPolicy === 'deny-unlisted-body-profiles', 'manifest must deny unlisted profiles');
  exactKeys(manifest.clippingPolicy, ['default', 'requiredMotionReview', 'hideBodyRegions', 'unknownResult'], 'clippingPolicy');
  must(manifest.clippingPolicy.default === 'human-certification-required' && manifest.clippingPolicy.unknownResult === 'not-compatible', 'clipping defaults must fail closed');
  must(manifest.clippingPolicy.hideBodyRegions === 'explicit-certified-mask-only', 'body hiding policy must be explicit');
  uniqueStrings(manifest.clippingPolicy.requiredMotionReview, 'required motion review');
  must(JSON.stringify(Object.keys(manifest.slots).sort()) === JSON.stringify([...CANONICAL_SLOTS].sort()), 'canonical slot set mismatch');
  const slotEntries = CANONICAL_SLOTS.map(slot => {
    const policy = manifest.slots[slot];
    const keys = ['allowedModes', 'layer', 'regions', 'conflicts', 'socketRole'];
    if (slot === 'head') keys.push('fitPolicy', 'knownIncompatibleBodies');
    exactKeys(policy, keys, `slot ${slot}`);
    uniqueStrings(policy.allowedModes, `${slot}.allowedModes`); must(policy.allowedModes.every(mode => MODES.has(mode)), `${slot}: invalid attachment mode`);
    must(Number.isSafeInteger(policy.layer) && policy.layer >= 0, `${slot}: invalid layer`);
    uniqueStrings(policy.regions, `${slot}.regions`); uniqueStrings(policy.conflicts, `${slot}.conflicts`);
    must(policy.conflicts.every(conflict => CANONICAL_SLOTS.includes(conflict) && conflict !== slot), `${slot}: invalid slot conflict`);
    must(policy.socketRole === null || Object.hasOwn(REQUIRED_ROLES, policy.socketRole), `${slot}: invalid socket role`);
    if (slot === 'head') {
      must(policy.fitPolicy === 'deferred-per-body', 'head: invalid fit policy');
      must(Array.isArray(policy.knownIncompatibleBodies), 'head.knownIncompatibleBodies array required');
      const incompatibleIds = new Set();
      for (const row of policy.knownIncompatibleBodies) {
        exactKeys(row, ['bodyId', 'bodySha256', 'reason'], 'head known incompatible body');
        must(typeof row.bodyId === 'string' && /^(character|skin):[a-z0-9-]+$/.test(row.bodyId) && !incompatibleIds.has(row.bodyId), 'head: invalid or duplicate incompatible body');
        incompatibleIds.add(row.bodyId);
        must(typeof row.bodySha256 === 'string' && /^[a-f0-9]{64}$/.test(row.bodySha256), `head: invalid body hash for ${row.bodyId}`);
        must(typeof row.reason === 'string' && row.reason.length > 0, `head: missing incompatibility reason for ${row.bodyId}`);
      }
    }
    return [slot, policy];
  });
  for (const [slot, policy] of slotEntries) for (const conflict of policy.conflicts) {
    must(manifest.slots[conflict].conflicts.includes(slot), `${slot}/${conflict}: asymmetric slot conflict`);
  }
  for (let i = 0; i < slotEntries.length; i++) for (let j = i + 1; j < slotEntries.length; j++) {
    const [a, left] = slotEntries[i], [b, right] = slotEntries[j];
    const overlap = left.regions.some(region => right.regions.includes(region));
    must(!(overlap && left.layer === right.layer && !left.conflicts.includes(b)), `layer collision: ${a}/${b}`);
  }
  must(Array.isArray(manifest.items) && manifest.items.length === Object.keys(SLOT_BY_CATEGORY).length, 'one explicit candidate per target category required');
  const ids = new Set(), categories = new Set();
  for (const item of manifest.items) {
    exactKeys(item, ['id', 'category', 'slot', 'attachmentMode', 'inventoryStatus', 'asset', 'provenance', 'layer', 'conflicts', 'hideBodyRegions', 'certifiedFamilies', 'certifiedBodies', 'incompatibleBodies', 'fitProfiles', 'approvals', 'runtimeEnabled', 'reason'], `item ${item?.id}`);
    must(typeof item.id === 'string' && /^[a-z0-9][a-z0-9:-]*$/.test(item.id) && !ids.has(item.id), 'unique stable item id required'); ids.add(item.id);
    must(Object.hasOwn(SLOT_BY_CATEGORY, item.category) && !categories.has(item.category), `${item.id}: unique target category required`); categories.add(item.category);
    must(item.slot === SLOT_BY_CATEGORY[item.category] && TARGET_SLOTS.includes(item.slot), `${item.id}: category/slot mismatch`);
    must(manifest.slots[item.slot].allowedModes.includes(item.attachmentMode), `${item.id}: attachment mode not allowed in slot`);
    must(item.layer === manifest.slots[item.slot].layer, `${item.id}: item/slot layer mismatch`);
    uniqueStrings(item.conflicts, `${item.id}.conflicts`); uniqueStrings(item.hideBodyRegions, `${item.id}.hideBodyRegions`);
    uniqueStrings(item.certifiedFamilies, `${item.id}.certifiedFamilies`); uniqueStrings(item.certifiedBodies, `${item.id}.certifiedBodies`); uniqueStrings(item.incompatibleBodies, `${item.id}.incompatibleBodies`);
    must(!item.certifiedFamilies.includes('*') && !item.certifiedBodies.includes('*'), `${item.id}: universal wildcard prohibited`);
    must(item.certifiedBodies.every(body => !item.incompatibleBodies.includes(body)), `${item.id}: body both certified and incompatible`);
    must(Array.isArray(item.fitProfiles), `${item.id}: fitProfiles array required`);
    exactKeys(item.approvals, ['asset', 'fit', 'clipping', 'human'], `${item.id}.approvals`);
    must(Object.values(item.approvals).every(value => value === false) && item.runtimeEnabled === false, `${item.id}: approvals/runtime must remain false`);
    must(typeof item.reason === 'string' && item.reason.length > 0, `${item.id}: reason required`);
    if (item.inventoryStatus === 'missing') {
      must(item.asset === null && item.provenance === null, `${item.id}: missing inventory cannot claim asset/provenance`);
      must(item.certifiedFamilies.length === 0 && item.certifiedBodies.length === 0 && item.fitProfiles.length === 0, `${item.id}: missing asset cannot certify fit`);
    } else {
      must(item.inventoryStatus === 'versioned' || item.inventoryStatus === 'deferred', `${item.id}: invalid inventory status`);
      if (item.inventoryStatus === 'deferred') {
        must(item.certifiedFamilies.length === 0 && item.certifiedBodies.length === 0 && item.fitProfiles.length === 0, `${item.id}: deferred asset cannot certify fit`);
      }
      exactKeys(item.asset, ['path', 'sha256', 'bytes'], `${item.id}.asset`);
      const asset = safeFile(root, item.asset.path, `${item.id} asset`), bytes = readFileSync(asset);
      must(item.asset.bytes === bytes.length && item.asset.sha256 === hash(bytes), `${item.id}: asset bytes/hash mismatch`);
      exactKeys(item.provenance, ['author', 'source', 'license', 'evidence'], `${item.id}.provenance`);
      for (const key of ['author', 'source', 'license']) must(typeof item.provenance[key] === 'string' && item.provenance[key].length > 0, `${item.id}: provenance ${key} required`);
      safeFile(root, item.provenance.evidence, `${item.id} provenance evidence`);
    }
  }
  const itemsById = new Map(manifest.items.map(item => [item.id, item]));
  for (const item of manifest.items) for (const conflict of item.conflicts) {
    const other = itemsById.get(conflict);
    must(other && other.id !== item.id, `${item.id}: unknown/self item conflict ${conflict}`);
    must(other.conflicts.includes(item.id), `${item.id}/${conflict}: asymmetric item conflict`);
  }
  rejectApprovalTrue(manifest);
  return manifest;
}

export function validateCensus(census) {
  must(census?.schemaVersion === CENSUS_VERSION && census.status === 'draft' && census.runtimeEnabled === false, 'census version/status invalid');
  must(Array.isArray(census.families) && Array.isArray(census.bodies), 'census collections required');
  must(census.summary.bodies === census.bodies.length && census.summary.families === census.families.length, 'census summary mismatch');
  const bodies = new Map(census.bodies.map(body => [body.bodyId, body]));
  must(bodies.size === census.bodies.length, 'duplicate census body');
  const families = new Map(census.families.map(family => [family.familyId, family]));
  must(families.size === census.families.length, 'duplicate census family');
  for (const body of census.bodies) {
    must(families.has(body.familyId) && families.get(body.familyId).bodies.includes(body.bodyId), `${body.bodyId}: orphan family`);
    must(typeof body.profileId === 'string' && body.profileId.length > 0, `${body.bodyId}: profile id required`);
    for (const [slot, socket] of Object.entries(body.sockets)) {
      must(Object.hasOwn(SOCKET_ROLE, slot), `${body.bodyId}: unknown socket slot`);
      if (socket) {
        must(body.jointNames.filter(name => name === socket.bone).length === 1, `${body.bodyId}/${slot}: socket bone missing or ambiguous`);
        must(socket.certified === false && socket.transform === null, `${body.bodyId}/${slot}: uncaptured socket cannot be certified`);
      }
    }
  }
  for (const family of census.families) {
    must(family.bodies.length > 0 && family.bodies.every(bodyId => bodies.get(bodyId)?.familyId === family.familyId), `${family.familyId}: family membership mismatch`);
  }
  return census;
}

function structuralIncompatibility(item, body) {
  if (item.attachmentMode === 'rigid') {
    const socket = body.sockets[item.slot];
    if (!socket) return `body lacks an unambiguous ${item.slot} socket bone`;
  }
  if (item.attachmentMode === 'skinned') {
    if (body.duplicateJointNames.length) return `ambiguous joint names: ${body.duplicateJointNames.join(',')}`;
    const missing = Object.entries(body.roles).filter(([, bone]) => bone === null).map(([role]) => role);
    if (missing.length) return `missing canonical rig roles: ${missing.join(',')}`;
    if (body.bindInspection.status !== 'pass') return `bind inspection failed: ${body.bindInspection.reason}`;
  }
  return null;
}

export function buildMatrix(manifest, census) {
  validateCensus(census);
  const familyIds = new Set(census.families.map(family => family.familyId));
  const bodyById = new Map(census.bodies.map(body => [body.bodyId, body]));
  const entries = [];
  for (const item of manifest.items) for (const body of census.bodies) {
    const structuralReason = structuralIncompatibility(item, body);
    let status, reason;
    if (structuralReason) { status = 'incompatible'; reason = structuralReason; }
    else if (item.incompatibleBodies.includes(body.bodyId)) { status = 'incompatible'; reason = 'item explicitly marks this body incompatible'; }
    else if (item.inventoryStatus !== 'versioned') { status = 'unknown'; reason = item.reason; }
    else {
      const profile = item.fitProfiles.find(candidate => candidate.bodyId === body.bodyId);
      if (item.certifiedBodies.includes(body.bodyId) && profile?.status === 'certified') { status = 'certified'; reason = 'body profile and human gates recorded'; }
      else if (profile?.status === 'candidate') { status = 'candidate'; reason = profile.reason; }
      else { status = 'unknown'; reason = 'no measured body profile'; }
    }
    entries.push({ itemId: item.id, slot: item.slot, bodyId: body.bodyId, familyId: body.familyId, certified: status === 'certified', status, reason });
  }
  const countsBySlot = Object.fromEntries(CANONICAL_SLOTS.map(slot => {
    const rows = entries.filter(entry => entry.slot === slot);
    return [slot, { items: manifest.items.filter(item => item.slot === slot).length, pairs: rows.length, certified: rows.filter(row => row.status === 'certified').length, candidate: rows.filter(row => row.status === 'candidate').length, incompatible: rows.filter(row => row.status === 'incompatible').length, unknown: rows.filter(row => row.status === 'unknown').length }];
  }));
  const familyWork = census.families.map(family => {
    const bodies = family.bodies.map(bodyId => bodyById.get(bodyId));
    return {
      familyId: family.familyId,
      bodies: family.bodies,
      blockers: bodies.flatMap(body => body.issues.map(reason => ({ bodyId: body.bodyId, reason }))),
      remaining: [
        { slots: ['back', 'head', 'piercing'], action: 'Create or register licensed 3D assets, author a transform in every listed body profile, then inspect idle/walk/run/crouch/jump/aim/shoot/reload/death for clipping and silhouette.' },
        { slots: ['tattoo'], action: 'Create or register a licensed texture/decal asset, author UV or surface-region masks per listed body, and inspect seams, stretch, skin coverage and all required motions.' },
        { slots: ['torso-inner', 'torso-outer', 'legs', 'feet'], action: 'Create or register licensed skinned assets, author weights/bind variants for each listed body profile, author explicit body masks, then inspect neck/shoulders/armpits/wrists/waist/knees/ankles in every required motion.' },
      ],
    };
  });
  must([...familyIds].every(id => familyWork.some(work => work.familyId === id)), 'human work missing family');
  return { schemaVersion: MATRIX_VERSION, status: 'draft', runtimeEnabled: false, summary: { bodies: census.bodies.length, items: manifest.items.length, countsBySlot }, entries, humanVisualWorkByFamily: familyWork };
}
function validateFitTransform(item, profile) {
  if (profile.status === 'incompatible' || item.attachmentMode !== 'rigid') {
    must(profile.transform === null, `${item.id}/${profile.profileId}: transform must be null for ${profile.status} ${item.attachmentMode} profile`);
    return;
  }
  exactKeys(profile.transform, ['position', 'rotation', 'scale', 'space', 'source'], `${item.id}/${profile.profileId} transform`);
  const vector = (value, length) => Array.isArray(value) && value.length === length && value.every(Number.isFinite);
  must(vector(profile.transform.position, 3), `${item.id}/${profile.profileId}: finite position required`);
  must(vector(profile.transform.rotation, 4) && Math.abs(Math.hypot(...profile.transform.rotation) - 1) <= 1e-5, `${item.id}/${profile.profileId}: unit quaternion required`);
  must(vector(profile.transform.scale, 3) && profile.transform.scale.every(value => value > 0), `${item.id}/${profile.profileId}: positive scale required`);
  must(profile.transform.space === 'bone-local' && typeof profile.transform.source === 'string' && profile.transform.source.length > 0, `${item.id}/${profile.profileId}: explicit transform space/source required`);
}


export function validateBundle(manifest, census, matrix, root) {
  validateCensus(census);
  const bodies = new Map(census.bodies.map(body => [body.bodyId, body])), families = new Map(census.families.map(family => [family.familyId, family]));
  for (const item of manifest.items) {
    for (const familyId of item.certifiedFamilies) {
      const family = families.get(familyId); must(family, `${item.id}: orphan certified family ${familyId}`);
      must(family.bodies.every(bodyId => item.certifiedBodies.includes(bodyId)), `${item.id}: false family-wide certification ${familyId}`);
    }
    for (const bodyId of [...item.certifiedBodies, ...item.incompatibleBodies]) must(bodies.has(bodyId), `${item.id}: orphan body ${bodyId}`);
    const profileIds = new Set();
    for (const profile of item.fitProfiles) {
      exactKeys(profile, ['profileId', 'bodyId', 'familyId', 'status', 'reason', 'transform'], `${item.id} fit profile`);
      const body = bodies.get(profile.bodyId);
      must(body && body.profileId === profile.profileId && body.familyId === profile.familyId, `${item.id}: orphan fit profile ${profile.profileId}`);
      must(!profileIds.has(profile.profileId), `${item.id}: duplicate fit profile ${profile.profileId}`); profileIds.add(profile.profileId);
      must(['candidate', 'certified', 'incompatible'].includes(profile.status) && typeof profile.reason === 'string' && profile.reason.length > 0, `${item.id}: invalid fit profile status/reason`);
      validateFitTransform(item, profile);
      if (profile.status === 'certified') must(item.certifiedBodies.includes(profile.bodyId), `${item.id}: certified profile not in certifiedBodies`);
    }
    for (const bodyId of item.certifiedBodies) must(item.fitProfiles.some(profile => profile.bodyId === bodyId && profile.status === 'certified'), `${item.id}: certified body lacks certified profile ${bodyId}`);
  }
  validateManifest(manifest, root);
  must(matrix?.schemaVersion === MATRIX_VERSION && matrix.status === 'draft' && matrix.runtimeEnabled === false, 'matrix version/status invalid');
  must(Array.isArray(matrix.entries) && matrix.entries.length === manifest.items.length * census.bodies.length, 'matrix pair coverage mismatch');
  const pairs = new Set();
  for (const entry of matrix.entries) {
    const key = `${entry.itemId}\u0000${entry.bodyId}`; must(!pairs.has(key), 'duplicate matrix pair'); pairs.add(key);
    must(entry.certified === (entry.status === 'certified') && ['candidate', 'certified', 'incompatible', 'unknown'].includes(entry.status), 'matrix status/boolean mismatch');
    must(typeof entry.reason === 'string' && entry.reason.length > 0, 'matrix reason required');
  }
  for (const slot of CANONICAL_SLOTS) {
    const count = matrix.summary.countsBySlot[slot];
    must(count && count.certified + count.candidate + count.incompatible + count.unknown === count.pairs, `${slot}: matrix counts mismatch`);
  }
  must(matrix.entries.every(entry => entry.certified === false), 'certification cannot be generated before human gate');
  return { manifest, census, matrix };
}

export function runMutants(manifest, census, matrix, root) {
  const mutants = {
    'missing-bone': () => {
      const c = structuredClone(census), body = c.bodies.find(candidate => candidate.sockets.head);
      const bone = body.sockets.head.bone, index = body.jointNames.indexOf(bone);
      must(index >= 0, 'missing-bone mutant did not apply'); body.jointNames.splice(index, 1);
      validateBundle(manifest, c, matrix, root);
    },
    'orphan-profile': () => {
      const m = structuredClone(manifest);
      m.items[0].fitProfiles.push({ profileId: 'missing@000000000000', bodyId: 'character:missing', familyId: 'rig-missing', status: 'incompatible', reason: 'mutant', transform: null });
      must(m.items[0].fitProfiles.length === 1, 'orphan-profile mutant did not apply');
      validateBundle(m, census, matrix, root);
    },
    'layer-collision': () => {
      const m = structuredClone(manifest); m.slots['torso-outer'].layer = m.slots['torso-inner'].layer;
      must(m.slots['torso-outer'].layer === m.slots['torso-inner'].layer, 'layer-collision mutant did not apply');
      validateBundle(m, census, matrix, root);
    },
    'false-universal': () => {
      const m = structuredClone(manifest); m.items[0].certifiedFamilies = census.families.map(family => family.familyId);
      must(m.items[0].certifiedFamilies.length > 0, 'false-universal mutant did not apply');
      validateBundle(m, census, matrix, root);
    },
  };
  return Object.entries(mutants).map(([name, mutate]) => {
    try { mutate(); } catch (error) { return { name, killed: true, reason: normalizeError(error) }; }
    fail(`${name} mutant survived`);
  });
}

export const serialize = json;
