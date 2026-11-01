import fs from 'node:fs';
import path from 'node:path';
import { inspectBindBytes } from '../bind-inspector.mjs';
import { parseMeshPartsJSON } from '../mesh-parts.mjs';
import { parseCosmeticSelections } from './cosmetics.mjs';
import {
  FAMILY_SCHEMA,
  MANIFEST_SCHEMA,
  MATERIAL_VARIANTS,
  MESH_PARTS_SCHEMA,
  SELECTION_SCHEMA,
  buildFirstPersonPackage,
  buildThirdPersonPackage,
  inspectFirstPersonSource,
  inspectThirdPersonCandidate,
  makeSelectionsDocument,
  parseGLB,
  parseSelections,
  sha256,
  staticFamilyFingerprint,
} from './core.mjs';

const must = (condition, message) => { if (!condition) throw new Error(message); };
const clone = value => JSON.parse(JSON.stringify(value));
const canonicalHash = value => sha256(Buffer.from(JSON.stringify(value)));

export function resolveRepositoryPaths(root) {
  return {
    root,
    characterDir: path.join(root, 'public/models/characters'),
    fpvmPath: path.join(root, 'public/models/viewmodels/fpvm_hands.glb'),
    selectionsPath: path.join(root, 'tools/character-kit/gloves/selections.json'),
    cosmeticSelectionsPath: path.join(root, 'tools/character-kit/gloves/cosmetic-selections.json'),
    manifestPath: path.join(root, 'public/data/gloves-manifest.json'),
    outputDir: path.join(root, 'public/models/gloves'),
  };
}

export function listCharacterSources(root) {
  const { characterDir } = resolveRepositoryPaths(root);
  return fs.readdirSync(characterDir)
    .filter(name => name.endsWith('.glb'))
    .sort()
    .map(name => ({ id: name.slice(0, -4), sourcePath: `public/models/characters/${name}`, absolutePath: path.join(characterDir, name) }));
}

function materialIds() {
  return MATERIAL_VARIANTS.map(variant => variant.id);
}

function technicalFlags() {
  return { visualApproved: false, runtimeEnabled: false, unverified: ['visual-fit', 'contact', 'clipping', 'material-art-direction', 'runtime-integration'] };
}

export function buildRepositoryArtifacts(root, { selectionBytes, includeCosmetics = false, cosmeticSelectionBytes } = {}) {
  must(typeof includeCosmetics === 'boolean', 'includeCosmetics must be boolean');
  const paths = resolveRepositoryPaths(root);
  const sources = listCharacterSources(root);
  const census = sources.map(source => inspectThirdPersonCandidate({ ...source, bytes: fs.readFileSync(source.absolutePath) }));
  const compatible = census.filter(result => result.compatible);
  const incompatible = census.filter(result => !result.compatible).map(result => result.incompatibility);
  const selectionsRaw = selectionBytes ?? fs.readFileSync(paths.selectionsPath);
  const selectionsDoc = parseSelections(selectionsRaw);
  const expectedSelections = makeSelectionsDocument(compatible);
  must(JSON.stringify(selectionsDoc) === JSON.stringify(expectedSelections), 'checked glove selections differ from deterministic census');
  const selectionById = new Map(selectionsDoc.entries.map(entry => [entry.characterId, entry.selection]));
  const artifacts = new Map();
  const packageGroups = new Map();
  for (const candidate of compatible) {
    const selection = selectionById.get(candidate.id);
    const sourceBytes = fs.readFileSync(path.join(root, candidate.sourcePath));
    const built = buildThirdPersonPackage(sourceBytes, selection);
    must(built.report.bindFingerprintSha256 === candidate.fingerprints.skeletonFamilySha256, `output bind changed for ${candidate.id}`);
    must(JSON.stringify(built.metrics) === JSON.stringify(candidate.metrics.selected), `output metrics changed for ${candidate.id}`);
    const family = candidate.fingerprints.skeletonFamilySha256;
    const outputRelative = `public/models/gloves/3p/${candidate.id}-${family.slice(0, 12)}.glb`;
    artifacts.set(outputRelative, built.bytes);
    if (!packageGroups.has(family)) packageGroups.set(family, []);
    packageGroups.get(family).push({ candidate, built, outputRelative });
  }
  const fpSourceBytes = fs.readFileSync(paths.fpvmPath);
  const fpInspection = inspectFirstPersonSource({ sourcePath: 'public/models/viewmodels/fpvm_hands.glb', bytes: fpSourceBytes });
  const fpBuilt = buildFirstPersonPackage(fpSourceBytes, fpInspection);
  const fpOutputRelative = `public/models/gloves/1p/fpvm-hands-${fpInspection.familyFingerprintSha256.slice(0, 12)}.glb`;
  artifacts.set(fpOutputRelative, fpBuilt.bytes);
  const characterIds = sources.map(source => source.id);
  const packages = [{
    id: `fpvm-${fpInspection.familyFingerprintSha256.slice(0, 12)}`,
    perspective: '1p',
    packageVersion: 1,
    skeletonFamily: { schema: FAMILY_SCHEMA, id: 'fpvm-hands', fingerprintSha256: fpInspection.familyFingerprintSha256 },
    supportedCharacterIds: characterIds,
    sourceVariants: [{
      id: 'fpvm-hands',
      characterIds,
      source: { path: fpInspection.sourcePath, sha256: fpInspection.sourceSha256 },
      selection: { method: 'authored-glove-primitive', nodes: fpInspection.entries },
      mesh: { path: fpOutputRelative, sha256: sha256(fpBuilt.bytes) },
      metrics: { before: fpInspection.before, after: fpBuilt.metrics },
    }],
    materialVariantIds: materialIds(),
    handOwnership: { baseHandsOwner: 'fpvm_hands', gloveSurfaceRole: 'material-overlay', sourceHandRemovalCount: 0 },
    animationOwnership: { owner: 'fpvm_hands', mode: 'inherit-existing-transforms', animationsEmbedded: false, poseOverrides: false, teleport: false },
    ...technicalFlags(),
  }];
  for (const [family, variants] of [...packageGroups].sort(([left], [right]) => left.localeCompare(right))) {
    variants.sort((left, right) => left.candidate.id.localeCompare(right.candidate.id));
    packages.push({
      id: `tp-${family.slice(0, 12)}`,
      perspective: '3p',
      packageVersion: 1,
      skeletonFamily: { schema: FAMILY_SCHEMA, id: `tp-${family.slice(0, 12)}`, fingerprintSha256: family },
      supportedCharacterIds: variants.map(variant => variant.candidate.id),
      sourceVariants: variants.map(({ candidate, built, outputRelative }) => ({
        id: candidate.id,
        characterIds: [candidate.id],
        source: {
          path: candidate.sourcePath,
          sha256: candidate.sourceSha256,
          skeletonFamilySha256: candidate.fingerprints.skeletonFamilySha256,
          geometrySha256: candidate.fingerprints.geometrySha256,
          weightsSha256: candidate.fingerprints.weightsSha256,
        },
        selection: {
          path: 'tools/character-kit/gloves/selections.json',
          fileSha256: sha256(selectionsRaw),
          recordSha256: canonicalHash(selectionById.get(candidate.id)),
          schema: SELECTION_SCHEMA,
          meshPartsSchema: MESH_PARTS_SCHEMA,
        },
        mesh: {
          path: outputRelative,
          sha256: sha256(built.bytes),
          bindFingerprintSha256: built.report.bindFingerprintSha256,
          geometryFingerprintSha256: built.report.geometryFingerprintSha256,
          weightsFingerprintSha256: built.report.weightsFingerprintSha256,
        },
        metrics: { before: candidate.metrics.before, after: built.metrics },
      })),
      materialVariantIds: materialIds(),
      handOwnership: { baseHandsOwner: 'character-body', gloveSurfaceRole: 'derived-overlay', sourceHandRemovalCount: 0 },
      animationOwnership: { owner: 'character-rig', mode: 'inherit-live-skeleton', animationsEmbedded: false, poseOverrides: false, teleport: false },
      ...technicalFlags(),
    });
  }
  const supported3p = compatible.map(candidate => candidate.id).sort();
  const blocked3p = incompatible.map(entry => entry.id).sort();
  const cosmetics = [];
  if (includeCosmetics) {
    const raw = cosmeticSelectionBytes ?? fs.readFileSync(paths.cosmeticSelectionsPath);
    const records = parseCosmeticSelections(raw).entries;
    const catalog = parseMeshPartsJSON(fs.readFileSync(path.join(root, 'public/models/skins/manifest.json'), 'utf8'));
    for (const record of records) {
      const { id, characterId, skinId, source, selection } = record;
      const approved = catalog.skins?.[skinId];
      must(approved?.approved === true && approved.character === characterId
        && `public${approved.model}` === source.path && approved.sha256 === source.sha256, `cosmetic catalog mismatch for ${id}`);
      must(sources.some(candidate => candidate.id === characterId), `unknown cosmetic character ${characterId}`);
      const absolute = path.join(root, source.path);
      must(fs.lstatSync(absolute).isFile(), `cosmetic source must be a local file: ${id}`);
      const sourceBytes = fs.readFileSync(absolute);
      must(sha256(sourceBytes) === source.sha256, `cosmetic source digest mismatch for ${id}`);
      const before = inspectBindBytes(sourceBytes, source.sha256);
      must(before.bindFingerprintSha256 === source.skeletonFamilySha256, `cosmetic source family mismatch for ${id}`);
      const built = buildThirdPersonPackage(sourceBytes, selection);
      must(built.report.bindFingerprintSha256 === source.skeletonFamilySha256, `cosmetic output bind changed for ${id}`);
      const family = source.skeletonFamilySha256;
      const outputRelative = `public/models/gloves/3p/${id}-${family.slice(0, 12)}.glb`;
      const packageId = `tp-cosmetic-${family.slice(0, 12)}-${id}`;
      must(!artifacts.has(outputRelative) && !packages.some(pack => pack.id === packageId
        || pack.sourceVariants.some(variant => variant.id === id)), `duplicate cosmetic variant ${id}`);
      artifacts.set(outputRelative, built.bytes);
      packages.push({
        id: packageId,
        perspective: '3p',
        packageVersion: 1,
        skeletonFamily: { schema: FAMILY_SCHEMA, id: packageId, fingerprintSha256: family },
        supportedCharacterIds: [characterId],
        sourceVariants: [{
          id,
          characterIds: [characterId],
          source: { kind: 'cosmetic', skinId, path: source.path, sha256: source.sha256,
            skeletonFamilySha256: family, geometrySha256: before.geometryFingerprintSha256, weightsSha256: before.weightsFingerprintSha256 },
          selection: { path: 'tools/character-kit/gloves/cosmetic-selections.json', fileSha256: sha256(raw),
            recordSha256: canonicalHash(selection), schema: selection.schema, meshPartsSchema: MESH_PARTS_SCHEMA },
          mesh: { path: outputRelative, sha256: sha256(built.bytes), bindFingerprintSha256: built.report.bindFingerprintSha256,
            geometryFingerprintSha256: built.report.geometryFingerprintSha256, weightsFingerprintSha256: built.report.weightsFingerprintSha256 },
          metrics: { before: {
            vertices: before.primitives.reduce((sum, primitive) => sum + primitive.vertices, 0),
            joints: parseGLB(sourceBytes).document.skins[0].joints.length,
            nonzeroWeights: before.primitives.reduce((sum, primitive) => sum + primitive.weightedJoints.reduce((part, joint) => part + joint.nonzeroInfluences, 0), 0),
            primitives: before.primitives.length,
          }, after: built.metrics },
        }],
        materialVariantIds: materialIds(),
        handOwnership: { baseHandsOwner: 'character-body', gloveSurfaceRole: 'derived-overlay', sourceHandRemovalCount: 0 },
        animationOwnership: { owner: 'character-rig', mode: 'inherit-live-skeleton', animationsEmbedded: false, poseOverrides: false, teleport: false },
        ...technicalFlags(),
      });
      cosmetics.push({ skinId, characterId, sourcePath: source.path, sourceSha256: source.sha256, skeletonFamilySha256: family });
    }
  }
  const manifest = {
    schema: MANIFEST_SCHEMA,
    manifestVersion: 1,
    generatedBy: 'tools/character-kit/gloves/build.mjs',
    selectionContract: MESH_PARTS_SCHEMA,
    familyContract: FAMILY_SCHEMA,
    materials: MATERIAL_VARIANTS.map(variant => clone(variant)),
    packages,
    incompatible: incompatible.sort((left, right) => left.id.localeCompare(right.id)),
    coverage: {
      candidateCharacterIds: characterIds,
      firstPersonSupportedCharacterIds: characterIds,
      thirdPersonSupportedCharacterIds: supported3p,
      thirdPersonBlockedCharacterIds: blocked3p,
      ...(includeCosmetics ? { cosmetics } : {}),
    },
    ...technicalFlags(),
  };
  artifacts.set('public/data/gloves-manifest.json', Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
  return { manifest, artifacts, census, selections: expectedSelections };
}

function assertSortedUnique(values, message) {
  must(Array.isArray(values) && values.every((value, index) => typeof value === 'string' && (index === 0 || value > values[index - 1])), message);
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function verifyRepository(root, { manifest = null, readAsset = null, selectionBytes = null } = {}) {
  const paths = resolveRepositoryPaths(root);
  const actualManifest = manifest ?? JSON.parse(fs.readFileSync(paths.manifestPath, 'utf8'));
  must(actualManifest?.schema === MANIFEST_SCHEMA && actualManifest.manifestVersion === 1, 'manifest schema/version mismatch');
  must(actualManifest.selectionContract === MESH_PARTS_SCHEMA && actualManifest.familyContract === FAMILY_SCHEMA, 'manifest contract mismatch');
  must(JSON.stringify(actualManifest.materials) === JSON.stringify(MATERIAL_VARIANTS), 'material variants changed');
  const reader = readAsset ?? (relative => fs.readFileSync(path.join(root, relative)));
  const selectionsRaw = selectionBytes ?? reader('tools/character-kit/gloves/selections.json');
  const rebuilt = buildRepositoryArtifacts(root, { selectionBytes: selectionsRaw });
  const expectedManifest = rebuilt.manifest;
  const candidateIds = listCharacterSources(root).map(source => source.id);
  for (const key of ['candidateCharacterIds', 'firstPersonSupportedCharacterIds', 'thirdPersonSupportedCharacterIds', 'thirdPersonBlockedCharacterIds']) assertSortedUnique(actualManifest.coverage[key], `coverage ${key} must be sorted/unique`);
  must(sameArray(actualManifest.coverage.candidateCharacterIds, candidateIds), 'candidate coverage differs from character directory');
  must(sameArray(actualManifest.coverage.firstPersonSupportedCharacterIds, candidateIds), 'fpvm coverage must include every candidate');
  const union3p = [...actualManifest.coverage.thirdPersonSupportedCharacterIds, ...actualManifest.coverage.thirdPersonBlockedCharacterIds].sort();
  must(sameArray(union3p, candidateIds), '3p coverage must account for every candidate exactly once');
  must(!actualManifest.coverage.thirdPersonSupportedCharacterIds.some(id => actualManifest.coverage.thirdPersonBlockedCharacterIds.includes(id)), '3p supported/blocked overlap');
  for (const glovePackage of actualManifest.packages) {
    must(glovePackage.packageVersion === 1 && ['1p', '3p'].includes(glovePackage.perspective), 'package version/perspective invalid');
    must(glovePackage.visualApproved === false && glovePackage.runtimeEnabled === false, 'technical package cannot self-approve');
    must(glovePackage.handOwnership?.sourceHandRemovalCount === 0, 'source hand removal must occur zero times');
    const animationOwner = glovePackage.perspective === '1p' ? 'fpvm_hands' : 'character-rig';
    const animationMode = glovePackage.perspective === '1p' ? 'inherit-existing-transforms' : 'inherit-live-skeleton';
    must(JSON.stringify(glovePackage.animationOwnership) === JSON.stringify({
      owner: animationOwner,
      mode: animationMode,
      animationsEmbedded: false,
      poseOverrides: false,
      teleport: false,
    }), 'package must inherit animation without pose override or teleport');
    must(JSON.stringify(glovePackage.materialVariantIds) === JSON.stringify(materialIds()), 'package material variants changed');
    for (const variant of glovePackage.sourceVariants) {
      const sourceBytes = reader(variant.source.path);
      must(sha256(sourceBytes) === variant.source.sha256, `source digest mismatch for ${variant.id}`);
      const outputBytes = reader(variant.mesh.path);
      must(sha256(outputBytes) === variant.mesh.sha256, `mesh digest mismatch for ${variant.id}`);
      if (glovePackage.perspective === '3p') {
        must(variant.source.skeletonFamilySha256 === glovePackage.skeletonFamily.fingerprintSha256, `package assigned to wrong skeleton family for ${variant.id}`);
        inspectBindBytes(sourceBytes, variant.source.sha256, {
          bindFingerprintSha256: variant.source.skeletonFamilySha256,
          geometryFingerprintSha256: variant.source.geometrySha256,
          weightsFingerprintSha256: variant.source.weightsSha256,
        });
        inspectBindBytes(outputBytes, variant.mesh.sha256, {
          bindFingerprintSha256: variant.mesh.bindFingerprintSha256,
          geometryFingerprintSha256: variant.mesh.geometryFingerprintSha256,
          weightsFingerprintSha256: variant.mesh.weightsFingerprintSha256,
        });
        must(variant.mesh.bindFingerprintSha256 === glovePackage.skeletonFamily.fingerprintSha256, `output bind changed family for ${variant.id}`);
      } else {
        const outputDocument = parseGLB(outputBytes).document;
        must(staticFamilyFingerprint(outputDocument) === glovePackage.skeletonFamily.fingerprintSha256, 'fpvm output hierarchy mismatch');
      }
    }
  }
  must(JSON.stringify(actualManifest) === JSON.stringify(expectedManifest), 'manifest differs from deterministic rebuild');
  for (const [relative, expectedBytes] of rebuilt.artifacts) {
    const actualBytes = relative === 'public/data/gloves-manifest.json' ? Buffer.from(`${JSON.stringify(actualManifest, null, 2)}\n`) : reader(relative);
    must(Buffer.compare(actualBytes, expectedBytes) === 0, `${relative} differs from deterministic rebuild`);
  }
  const expectedGloveFiles = [...rebuilt.artifacts.keys()].filter(relative => relative.startsWith('public/models/gloves/')).sort();
  const actualGloveFiles = [];
  const visit = (directory, relativeDirectory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) visit(path.join(directory, entry.name), relative);
      else if (entry.isFile()) actualGloveFiles.push(relative);
      else must(false, `unsupported glove output entry ${relative}`);
    }
  };
  visit(paths.outputDir, 'public/models/gloves');
  actualGloveFiles.sort();
  must(sameArray(actualGloveFiles, expectedGloveFiles), 'generated glove asset set differs from deterministic rebuild');
  return {
    packages: actualManifest.packages.length,
    meshVariants: actualManifest.packages.reduce((sum, glovePackage) => sum + glovePackage.sourceVariants.length, 0),
    supported1p: actualManifest.coverage.firstPersonSupportedCharacterIds,
    supported3p: actualManifest.coverage.thirdPersonSupportedCharacterIds,
    blocked3p: actualManifest.coverage.thirdPersonBlockedCharacterIds,
    metrics: actualManifest.packages.flatMap(glovePackage => glovePackage.sourceVariants.map(variant => ({ perspective: glovePackage.perspective, id: variant.id, ...variant.metrics }))),
  };
}
