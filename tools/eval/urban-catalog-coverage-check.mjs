#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {URBAN_BODY_ADAPTERS} from '../../public/js/procedural-urban-apparel.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const evidenceRoot = join(root, 'tools/eval/asset-evidence/items/urban-catalog-fit');
const reportPath = join(evidenceRoot, 'report.json');
const evidencePath = join(evidenceRoot, 'evidence-manifest.json');
const reviewPath = join(evidenceRoot, 'visual-review.json');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hashFile = path => sha(readFileSync(path));
const read = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
const finite = value => typeof value === 'number' && Number.isFinite(value);
const same = (actual, expected, message) => assert.deepEqual([...actual].sort(), [...expected].sort(), message);
const MAX_OUTFIT_DRAW_CALLS = 40;
const MAX_OUTFIT_TRIANGLES = 50_000;
const MAX_FAMILY_DRAW_CALLS = 12;
const MAX_FAMILY_TRIANGLES = 8_000;
const SPECIAL_BODY_IDS = Object.freeze([
  'character:camera-roxa', 'character:designer-ux', 'character:doidinho-bairro', 'character:lenda-lanhouse',
  'character:microfonildo', 'character:motoca-cachorro-loko', 'character:profeta-calcada', 'character:programador-virado',
  'character:cuca', 'character:lobisomem', 'skin:lobisomem-cyborg', 'skin:lula-cyborg', 'skin:lula-drip', 'skin:lula-mandrake',
  'skin:senador-drip', 'skin:zero-um-mandrake', 'character:mst', 'character:lampiao', 'character:mariabonita',
]);
const adapterByHash = new Map(Object.entries(URBAN_BODY_ADAPTERS));

const apparelFamilies = new Set(['boxy-tee', 'oversized-tee', 'shell-jacket', 'cargo-pants', 'bermuda-shorts', 'low-sneaker', 'chunky-runner', 'boot']);
const rigidFamilies = new Set([
  'backpack-rolltop', 'backpack-triple-pocket', 'backpack-sling', 'backpack-drypack', 'backpack-modular', 'backpack-tote', 'backpack-duffel',
  'headwear-trucker', 'headwear-boina', 'headwear-beanie', 'headwear-bucket', 'headwear-balaclava', 'headwear-hair', 'headwear-helmet',
  'accessory-chain', 'accessory-bandana', 'accessory-earring', 'accessory-bracelet', 'accessory-modular', 'accessory-ring', 'accessory-belt', 'accessory-case',
]);
const eyewearFamilies = new Map([
  ['eyewear-frame', 'oval-90'],
  ['eyewear-safety', 'metal-de-rua'],
  ['eyewear-visor', 'visor-de-pista'],
  ['eyewear-wrap', 'ouro-de-quebrada'],
]);

function factoryFor(family) {
  if (apparelFamilies.has(family)) return {kind: 'apparel-proxy', factory: 'createUrbanApparelProxy', assetId: null};
  if (rigidFamilies.has(family)) return {kind: 'rigid-proxy', factory: 'mountUrbanRigidCandidate', assetId: null};
  if (eyewearFamilies.has(family)) return {kind: 'eyewear-glb-profile', factory: 'mountEyewearCandidate', assetId: eyewearFamilies.get(family)};
  return null;
}

function sourceHashes() {
  return {
    urbanCatalog: hashFile(join(root, 'tools/character-kit/garment/urban-catalog.json')),
    mintBatch: hashFile(join(root, 'tools/character-kit/garment/mint-urban-batch.json')),
    bodyCensus: hashFile(join(root, 'tools/character-kit/garment/body-census.json')),
    rigidFactory: hashFile(join(root, 'public/js/procedural-urban-rigid.js')),
    apparelFactory: hashFile(join(root, 'public/js/procedural-urban-apparel.js')),
    eyewearManifest: hashFile(join(root, 'public/models/items/eyewear-manifest.json')),
    eyewearRuntime: hashFile(join(root, 'public/js/eyewear.js')),
    faceLandmarks: hashFile(join(root, 'public/models/items/face-landmarks.json')),
    scene: hashFile(join(root, 'tools/eval/urban-catalog-fit-scene.mjs')),
    captureTool: hashFile(join(root, 'tools/eval/urban-catalog-fit-matrix.mjs')),
  };
}

function inputs() {
  return {
    catalog: read('tools/character-kit/garment/urban-catalog.json'),
    batch: read('tools/character-kit/garment/mint-urban-batch.json'),
    census: read('tools/character-kit/garment/body-census.json'),
    eyewear: read('public/models/items/eyewear-manifest.json'),
    report: JSON.parse(readFileSync(reportPath, 'utf8')),
    evidence: JSON.parse(readFileSync(evidencePath, 'utf8')),
    review: JSON.parse(readFileSync(reviewPath, 'utf8')),
  };
}

function rejectPromotion(value, path = 'root') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (['approved', 'certified', 'runtimeEnabled', 'finalAsset'].includes(key)) assert.notEqual(child, true, `${path}.${key}: proxy candidate was promoted`);
    rejectPromotion(child, `${path}.${key}`);
  }
}

function assertFiniteBounds(row, label) {
  assert.equal(row.boundsFinite, true, `${label}: non-finite rendered bounds`);
  assert(row.bounds && row.bounds.min.length === 3 && row.bounds.max.length === 3, `${label}: rendered bounds missing`);
  assert([...row.bounds.min, ...row.bounds.max].every(finite), `${label}: rendered bounds contain non-finite values`);
  for (let axis = 0; axis < 3; axis++) assert(row.bounds.max[axis] > row.bounds.min[axis], `${label}: empty rendered bounds on axis ${axis}`);
}

function validate(data, {verifyFiles = true} = {}) {
  const {catalog, batch, census, eyewear, report, evidence, review} = data;
  assert.equal(catalog.items.length, 160, 'catalog must contain exactly 160 items');
  const safe = catalog.items.filter(item => item.rightsStatus === 'original-safe');
  const blocked = catalog.items.filter(item => item.rightsStatus === 'permission-needed');
  const safeHeadwear = safe.filter(item => item.geometryFamily.startsWith('headwear-'));
  assert.equal(safe.length, 147, 'original-safe coverage changed');
  assert.equal(blocked.length, 13, 'permission-needed coverage changed');
  const families = [...new Set(catalog.items.map(item => item.geometryFamily))];
  assert.equal(families.length, 34, 'geometry-family coverage changed');
  assert.equal(apparelFamilies.size, 8);
  assert.equal(rigidFamilies.size, 22);
  assert.equal(eyewearFamilies.size, 4);
  same([...apparelFamilies, ...rigidFamilies, ...eyewearFamilies.keys()], families, 'factory map does not exactly cover catalog families');

  assert.equal(batch.provider, 'Mint');
  assert.equal(batch.submitted, false, 'Mint batch falsely submitted');
  assert.equal(batch.submissionStatus, 'not-submitted-no-credits', 'Mint submission status changed');
  assert.equal(batch.submittedAt, null);
  assert.equal(batch.providerBatchId, null);
  assert.equal(batch.costReceipt.status, 'not-submitted-no-credits');
  assert.equal(batch.costReceipt.chargedCost, 0);
  assert.equal(batch.costReceipt.creditsSpent, 0);
  same(batch.jobs.map(job => job.itemId), safe.map(item => item.id), 'Mint queue must cover only 147 original-safe records');
  same(batch.excluded.map(item => item.itemId), blocked.map(item => item.id), 'Mint exclusions must cover the 13 permission-needed records');

  assert.equal(report.schemaVersion, 'cs-urban-catalog-fit/1');
  assert.equal(report.status, 'silhouette-study-not-body-fit');
  assert.deepEqual(report.sourceHashes, sourceHashes(), 'fit report source hashes are stale');
  assert.deepEqual(evidence.sourceHashes, sourceHashes(), 'evidence source hashes are stale');
  assert.equal(report.consoleErrors.length, 0, 'browser console errors were captured');
  assert.deepEqual(report.views, ['front', 'threeQuarter']);
  assert.deepEqual(report.summary, {catalogItems: 160, safeConcepts: 147, blockedPermissionNeeded: 13, bodiesObserved: 101, selectableBodies: 100, auxiliaryBodies: 1, bodyFitCandidates: 0, bodyFitUnassessed: 100, headwearDeferred: true, geometryFamiliesObserved: 34, certified: 0, mintSubmitted: false});
  rejectPromotion({catalog, batch, census, eyewear, report});

  const catalogById = new Map(catalog.items.map(item => [item.id, item]));
  assert.equal(report.catalog.length, 160, 'catalog resolution rows missing');
  same(report.catalog.map(row => row.itemId), catalogById.keys(), 'catalog resolution IDs diverge');
  for (const row of report.catalog) {
    const item = catalogById.get(row.itemId);
    assert(item, `${row.itemId}: orphan resolution row`);
    assert.equal(row.geometryFamily, item.geometryFamily, `${row.itemId}: geometry family changed during resolution`);
    assert.equal(row.rightsStatus, item.rightsStatus, `${row.itemId}: rights status changed during resolution`);
    assert.equal(row.mounted, false, `${row.itemId}: catalog rows are resolution-only, never runtime-mounted`);
    if (item.rightsStatus === 'permission-needed') {
      assert.equal(row.resolution, 'blocked-permission-needed', `${row.itemId}: protected item escaped blocking`);
      assert.equal(row.artIncluded, false, `${row.itemId}: protected card copied art`);
      assert.equal(row.status, 'blocked', `${row.itemId}: protected item lacks blocked status`);
      assert(!Object.hasOwn(row, 'factory'), `${row.itemId}: protected item reached a factory`);
    } else {
      const expected = factoryFor(item.geometryFamily), headwearDeferred = item.geometryFamily.startsWith('headwear-');
      assert(expected, `${row.itemId}: safe item has no research factory`);
      assert.equal(row.resolution, headwearDeferred ? 'deferred-headwear' : 'research-proxy', `${row.itemId}: dishonest fit resolution`);
      assert.equal(row.fitStatus, headwearDeferred ? 'unassessed-per-body' : 'silhouette-study-not-body-fit', `${row.itemId}: proxy mislabeled as body fit`);
      assert.equal(row.factory, expected.factory, `${row.itemId}: wrong factory`);
      assert.equal(row.kind, expected.kind, `${row.itemId}: wrong factory kind`);
      assert.equal(row.assetId, expected.assetId, `${row.itemId}: wrong eyewear asset mapping`);
    }
  }

  assert.equal(census.bodies.length, 101, 'body census coverage changed');
  assert.equal(census.bodies.filter(body => body.fitProfile.status === 'unknown').length, 97, 'global census must remain unpromoted');
  assert.equal(census.bodies.filter(body => body.fitProfile.status === 'incompatible').length, 4, 'global census incompatibilities must remain unchanged');
  const selectableBodies = census.bodies.filter(body => body.sourceKind !== 'auxiliary');
  const auxiliaryBodies = census.bodies.filter(body => body.sourceKind === 'auxiliary');
  assert.equal(selectableBodies.length, 100, 'selectable body census changed');
  assert.deepEqual(auxiliaryBodies.map(body => body.bodyId), ['auxiliary:dollynho-dance'], 'unexpected auxiliary body');
  assert.equal(adapterByHash.size, 19, 'special adapter registry changed');
  same(census.bodies.filter(body => adapterByHash.has(body.sourceSha256)).map(body => body.bodyId), SPECIAL_BODY_IDS, 'special adapters are not pinned to the diagnosed playable bodies');
  assert.equal(report.bodies.length, 101, 'body evidence omitted a census body');
  const bodiesById = new Map(census.bodies.map(body => [body.bodyId, body]));
  same(report.bodies.map(row => row.bodyId), bodiesById.keys(), 'body evidence IDs diverge from census');
  for (const [bodyIndex, row] of report.bodies.entries()) {
    const body = bodiesById.get(row.bodyId);
    assert(body, `${row.bodyId}: orphan body observation`);
    assert.equal(row.path, body.path, `${row.bodyId}: body path changed`);
    assert.equal(row.bodySha256, body.sourceSha256, `${row.bodyId}: report body hash stale`);
    if (verifyFiles) {
      const path = join(root, body.path);
      assert(existsSync(path), `${row.bodyId}: GLB missing`);
      assert.equal(readFileSync(path).length, body.bytes, `${row.bodyId}: GLB byte count stale`);
      assert.equal(hashFile(path), body.sourceSha256, `${row.bodyId}: census GLB hash stale`);
    }
    assert.equal(row.fitStatus, 'silhouette-study-not-body-fit', `${row.bodyId}: silhouette study mislabeled as body fit`);
    assert.equal(row.familiesRequested.length, 6, `${row.bodyId}: study outfit changed`);
    assertFiniteBounds(row, row.bodyId);
    assert(row.evidence?.sheet && row.evidence.views?.length === 2, `${row.bodyId}: front/3/4 evidence missing`);
    assert(evidence.files[row.evidence.sheet], `${row.bodyId}: referenced body sheet absent from evidence manifest`);
    assert.equal(row.cleanupBeforeLoad?.disposed?.models, bodyIndex === 0 ? 0 : 1, `${row.bodyId}: previous model was not disposed before load`);
    if (body.sourceKind === 'auxiliary') {
      assert.equal(row.status, 'not-applicable', `${row.bodyId}: non-selectable auxiliary was included`);
      assert.equal(row.familiesMounted.length, 0, `${row.bodyId}: auxiliary body reached the mounter`);
      assert.equal(row.selections.length, 0, `${row.bodyId}: auxiliary body selected a research mesh`);
      assert(row.failures.some(reason => reason.startsWith('auxiliary-not-selectable:')), `${row.bodyId}: auxiliary reason was hidden`);
    } else {
      assert.equal(row.status, 'study-only', `${row.bodyId}: body contact sheet claims compatibility`);
      assert.equal(row.familiesMounted.length, 6, `${row.bodyId}: silhouette study is partial`);
      assert.deepEqual(row.failures, [], `${row.bodyId}: study hides mount failures`);
      assert.equal(row.noHit, true, `${row.bodyId}: proxy entered hit/raycast surfaces`);
      assert.equal(row.selections.length, 6, `${row.bodyId}: body selection audit is incomplete`);
      const expectedAdapter = adapterByHash.get(body.sourceSha256) || null;
      for (const selection of row.selections) {
        assert.equal(selection.strategy, 'largest-required-weighted-vertex-set', `${row.bodyId}/${selection.family}: first-mesh selection escaped`);
        assert.equal(selection.bodySha256, body.sourceSha256, `${row.bodyId}/${selection.family}: selection hash is not pinned`);
        assert(selection.weightedVertices > 0 && selection.positionCount >= selection.weightedVertices, `${row.bodyId}/${selection.family}: weighted vertex evidence invalid`);
        assert(selection.eligibleMeshes >= 1 && selection.observedSkinnedMeshes >= selection.eligibleMeshes, `${row.bodyId}/${selection.family}: mesh selection cardinality invalid`);
        assert(Array.isArray(selection.requiredBones) && selection.requiredBones.length > 0, `${row.bodyId}/${selection.family}: required bones missing`);
        assert.equal(selection.adapterId, expectedAdapter?.id || null, `${row.bodyId}/${selection.family}: wrong special adapter`);
        assert.equal(selection.normalizeReadWeights, expectedAdapter?.normalizeReadWeights === true, `${row.bodyId}/${selection.family}: weight normalization escaped its hash profile`);
      }
    }
    assert(row.drawCalls >= 0 && row.drawCalls <= MAX_OUTFIT_DRAW_CALLS, `${row.bodyId}: draw-call budget exceeded`);
    assert(row.triangles >= 0 && row.triangles <= MAX_OUTFIT_TRIANGLES, `${row.bodyId}: triangle budget exceeded`);
    assert.equal(row.clipping?.method, 'conservative-body-vertices-inside-proxy-world-aabb', `${row.bodyId}: clipping observation missing`);
    assert.equal(row.clipping?.certified, false, `${row.bodyId}: clipping was falsely certified`);
    if (row.status === 'study-only') {
      assert(row.clipping.sampledVertices > 0, `${row.bodyId}: no vertices sampled for contact observation`);
      assert(finite(row.clipping.overlapPct), `${row.bodyId}: contact percentage not finite`);
      assert(['potential-contact-review-required', 'no-aabb-overlap-detected'].includes(row.clipping.classification), `${row.bodyId}: invalid contact classification`);
    }
  }
  assert.equal(report.bodies.filter(row => row.status === 'candidate').length, 0, 'user-rejected universal body candidates remained active');
  assert.equal(report.bodies.filter(row => row.status === 'study-only').length, 100, 'selectable study coverage must be 100/100');
  assert.deepEqual(report.bodies.filter(row => row.status === 'not-applicable').map(row => row.bodyId), ['auxiliary:dollynho-dance'], 'only the auxiliary may be not applicable');

  assert.equal(report.families.length, 34, 'family gallery coverage changed');
  same(report.families.map(row => row.family), families, 'family gallery omitted or invented a family');
  for (const [familyIndex, row] of report.families.entries()) {
    const expected = factoryFor(row.family);
    assert(expected, `${row.family}: no factory mapping`);
    assert.equal(row.factory, expected.factory, `${row.family}: gallery used wrong factory`);
    assert.equal(row.assetId, expected.assetId, `${row.family}: gallery used wrong eyewear asset`);
    assert.equal(row.fitStatus, 'silhouette-study-not-body-fit', `${row.family}: gallery mislabeled shape study as body fit`);
    assert.equal(row.noHit, true, `${row.family}: gallery proxy entered hit surfaces`);
    assert.equal(row.cleanupBeforeLoad?.disposed?.models, 1, `${row.family}: previous model was not disposed before family load ${familyIndex}`);
    assertFiniteBounds(row, row.family);
    assert(row.drawCalls > 0 && row.drawCalls <= MAX_FAMILY_DRAW_CALLS, `${row.family}: draw-call budget exceeded`);
    assert(row.triangles > 0 && row.triangles <= MAX_FAMILY_TRIANGLES, `${row.family}: triangle budget exceeded`);
    assert(evidence.files[row.evidence?.sheet], `${row.family}: family screenshot missing`);
    if (expected.assetId) {
      const entry = eyewear.eyewear[expected.assetId];
      assert(entry, `${row.family}: mapped eyewear asset missing`);
      assert.equal(row.selection, null, `${row.family}: eyewear invented a procedural body selection`);
      assert.equal(row.assetSha256, entry.sha256, `${row.family}: eyewear asset hash stale`);
      assert.equal(row.profileBodySha256, entry.profiles.capitao.bodySha256, `${row.family}: eyewear profile hash stale`);
      if (verifyFiles) assert.equal(hashFile(join(root, `public${entry.model}`)), entry.sha256, `${row.family}: eyewear GLB hash stale`);
    } else {
      assert.equal(row.selection?.strategy, 'largest-required-weighted-vertex-set', `${row.family}: gallery used first mesh`);
      assert.match(row.selection?.bodySha256 || '', /^[a-f0-9]{64}$/, `${row.family}: gallery selection is not hash-pinned`);
    }
  }

  assert.equal(report.blockedCards.length, 13, 'blocked-card gallery coverage changed');
  same(report.blockedCards.map(row => row.itemId), blocked.map(item => item.id), 'blocked cards diverge from protected catalog rows');
  for (const row of report.blockedCards) {
    assert.equal(row.mounted, false, `${row.itemId}: permission-needed card was mounted`);
    assert.equal(row.artIncluded, false, `${row.itemId}: permission-needed card copied art`);
    assert(evidence.files[row.evidence?.sheet], `${row.itemId}: blocked card screenshot missing`);
  }

  const bodySheets = new Set(report.bodies.map(row => row.evidence.sheet));
  assert.equal(bodySheets.size, 5, '101 bodies must be split across five contact sheets');
  const familySheets = new Set(report.families.map(row => row.evidence.sheet));
  const blockedSheets = new Set(report.blockedCards.map(row => row.evidence.sheet));
  assert.equal(familySheets.size, 1, 'family gallery screenshot missing');
  assert.equal(blockedSheets.size, 1, 'blocked gallery screenshot missing');
  const requiredSheets = new Set([...bodySheets, ...familySheets, ...blockedSheets]);
  same(Object.keys(evidence.files), requiredSheets, 'evidence manifest contains missing or unreferenced sheets');
  for (const [file, expected] of Object.entries(evidence.files)) {
    assert.match(expected.sha256, /^[a-f0-9]{64}$/, `${file}: screenshot hash missing`);
    assert(expected.bytes > 0 && expected.width > 0 && expected.height > 0, `${file}: screenshot dimensions/bytes invalid`);
    if (verifyFiles) {
      const path = join(evidenceRoot, file);
      assert(existsSync(path), `${file}: screenshot absent`);
      const bytes = readFileSync(path);
      assert.equal(bytes.length, expected.bytes, `${file}: screenshot bytes changed`);
      assert.equal(sha(bytes), expected.sha256, `${file}: screenshot hash changed`);
    }
  }

  assert.deepEqual(report.budgets, {
    maximumBodyDrawCalls: Math.max(...report.bodies.map(row => row.drawCalls)),
    maximumBodyTriangles: Math.max(...report.bodies.map(row => row.triangles)),
    maximumFamilyDrawCalls: Math.max(...report.families.map(row => row.drawCalls)),
    maximumFamilyTriangles: Math.max(...report.families.map(row => row.triangles)),
  }, 'render budgets are stale');
  assert(report.budgets.maximumBodyDrawCalls <= MAX_OUTFIT_DRAW_CALLS && report.budgets.maximumBodyTriangles <= MAX_OUTFIT_TRIANGLES, 'outfit budget exceeded');
  assert(report.budgets.maximumFamilyDrawCalls <= MAX_FAMILY_DRAW_CALLS && report.budgets.maximumFamilyTriangles <= MAX_FAMILY_TRIANGLES, 'family budget exceeded');
  const expectedDisposedCandidates = report.bodies.reduce((sum, row) => sum + row.familiesMounted.length, 0)
    + report.families.filter(row => row.factory !== 'mountEyewearCandidate').length;
  assert.equal(report.resourceDisposals?.disposed?.models, 1, 'last captured model was not disposed');
  assert.equal(report.resourceDisposals?.totals?.models, report.bodies.length + report.families.length, 'not every captured model was disposed');
  assert.equal(report.resourceDisposals?.totals?.candidates, expectedDisposedCandidates, 'not every procedural candidate was disposed');
  assert(report.resourceDisposals?.totals?.geometries > 0, 'captured geometry disposal was not observed');
  assert(report.resourceDisposals?.totals?.materials > 0, 'captured material disposal was not observed');
  assert(report.resourceDisposals?.totals?.textures > 0, 'captured texture disposal was not observed');

  assert.equal(review.schemaVersion, 'cs-urban-catalog-fit-visual-review/1');
  assert.equal(review.reviewMode, 'user-feedback-applied');
  assert.equal(review.verdict, 'research-only', 'study was promoted after user rejected universal fitting');
  assert.equal(review.evidenceManifestSha256, hashFile(evidencePath), 'review targets stale evidence');
  assert.deepEqual(review.sourceHashes, report.sourceHashes, 'review targets stale source hashes');
  same(review.sheetsReviewed, requiredSheets, 'review did not inspect every contact sheet');
  assert.equal(review.rejectionPolicy, 'no-fit-approval-without-exact-body-profile', 'review can promote a universal fit');
  assert.deepEqual(review.criteria, {noUniversalFitClaim: 'pass', headwearAbsentFromBodySheets: 'pass', bodySilhouetteVisible: 'pass'}, 'review does not preserve the corrected scope');
  assert(Array.isArray(review.findings) && review.findings.length > 0, 'review contains no visual observations');

  return {
    items: report.catalog.length,
    safeConcepts: safe.length,
    researchProxies: report.catalog.filter(row => row.resolution === 'research-proxy').length,
    headwearDeferred: report.catalog.filter(row => row.resolution === 'deferred-headwear').length,
    expectedHeadwearDeferred: safeHeadwear.length,
    blocked: report.catalog.filter(row => row.resolution === 'blocked-permission-needed').length,
    bodies: report.bodies.length,
    studyOnly: report.bodies.filter(row => row.status === 'study-only').length,
    candidates: report.bodies.filter(row => row.status === 'candidate').length,
    notApplicable: report.bodies.filter(row => row.status === 'not-applicable').length,
    families: report.families.length,
    sheets: Object.keys(evidence.files).length,
    consoleErrors: report.consoleErrors.length,
    certified: 0,
  };
}

function mutants() {
  const cases = {
    'first-mesh': data => {
      const row = data.report.bodies.find(candidate => candidate.selections.some(selection => selection.observedSkinnedMeshes > 1));
      row.selections[0].strategy = 'first-skinned-mesh';
    },
    'skip-special-profile': data => {
      const row = data.report.bodies.find(candidate => adapterByHash.has(candidate.bodySha256));
      row.selections[0].adapterId = null;
    },
    'normalize-anything': data => {
      const row = data.report.bodies.find(candidate => candidate.status === 'study-only' && !adapterByHash.has(candidate.bodySha256));
      row.selections[0].normalizeReadWeights = true;
    },
    'include-auxiliary': data => {
      const row = data.report.bodies.find(candidate => candidate.bodyId === 'auxiliary:dollynho-dance');
      row.status = 'study-only';
    },
    'universal-fit-claim': data => { data.report.bodies.find(row => row.status === 'study-only').status = 'candidate'; },
    'headwear-promoted': data => { data.report.catalog.find(row => row.resolution === 'deferred-headwear').resolution = 'research-proxy'; },
    'full-body-masking': data => { data.review.criteria.bodySilhouetteVisible = 'fail'; },
    'skip-resource-disposal': data => { data.report.resourceDisposals.totals.models--; },
    'item-without-factory': data => {
      const row = data.report.catalog.find(candidate => candidate.rightsStatus === 'original-safe');
      row.resolution = 'missing-factory';
      row.factory = null;
    },
    'permission-needed-mounted': data => {
      const row = data.report.catalog.find(candidate => candidate.rightsStatus === 'permission-needed');
      row.mounted = true;
      row.resolution = 'research-proxy';
      row.factory = 'createUrbanApparelProxy';
    },
    'body-omitted': data => { data.report.bodies.pop(); },
    'hash-stale': data => { data.report.sourceHashes.bodyCensus = '0'.repeat(64); },
    'proxy-certified': data => { data.report.families[0].certified = true; },
    'mint-falsely-submitted': data => {
      data.batch.submitted = true;
      data.batch.submissionStatus = 'submitted';
      data.batch.submittedAt = '2026-10-17T00:00:00Z';
      data.batch.providerBatchId = 'fake';
    },
    'screenshot-missing': data => { delete data.evidence.files[data.report.bodies[0].evidence.sheet]; },
  };
  const killed = [];
  for (const [name, mutate] of Object.entries(cases)) {
    const data = structuredClone(inputs());
    const before = JSON.stringify(data);
    mutate(data);
    assert.notEqual(JSON.stringify(data), before, `${name}: mutation did not apply`);
    let reason = '';
    try { validate(data, {verifyFiles: false}); } catch (error) { reason = error.message; }
    assert(reason, `${name}: mutant survived`);
    killed.push({name, killed: true, reason});
  }
  return killed;
}

const mutationMode = process.argv.includes('--mutate') || process.argv.includes('--mutations');
const result = validate(inputs());
const mutationResults = mutationMode ? mutants() : [];
console.log(`urban-catalog-coverage ${mutationMode ? 'mutate' : 'check'}: ${JSON.stringify({...result, mutants: mutationResults})}`);
