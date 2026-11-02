#!/usr/bin/env node
/**
 * Strict, independent support measurement against rendered map meshes.
 * Run after eval:serve (Chrome is operated by the coordinating agent):
 * node tools/eval/graffiti-support-browser-check.mjs --base=http://127.0.0.1:8166 \
 *   --maps=ferro_velho,upa_24h --out=/tmp/graffiti-support-baseline --fotos=3
 * Omitting --maps audits every MAP_IDS entry, including maps awaiting rework.
 * No debt ceilings: every piece needs all 25 support samples. This script never
 * calls suporteGrafite, rewrites layouts, or accepts a fallback to colliders.
 */
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { measureGraffitiArea } from './graffiti-area-audit.mjs';
import { MAP_SOURCES } from './graffiti-fingerprint.mjs';
import { identifyGraffitiTexture, inventoryGraffitiMaterials, trackGraffitiCanvases } from './graffiti-art-inventory.mjs';

const textureSource = readFileSync(new URL('../../public/js/textures.js', import.meta.url), 'utf8');
const canvasStart = textureSource.indexOf('T.graffiti =');
const canvasEnd = textureSource.indexOf('// --- fictional campaign posters', canvasStart);
if (canvasStart < 0 || canvasEnd < 0) throw Error('Canvas graffiti producer range could not be measured');
const canvasRanges = { graffitiStart: textureSource.slice(0, canvasStart).split('\n').length,
  graffitiEnd: textureSource.slice(0, canvasEnd).split('\n').length - 1 };

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const exact = args.indexOf(`--${name}`);
  return args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3)
    ?? (exact >= 0 ? args[exact + 1] : undefined) ?? fallback;
};
if (args.some(a => a.startsWith('--repair-bake'))) throw Error('This auditor measures only; --repair-bake is not implemented.');
const base = option('base', process.env.BASE || 'http://127.0.0.1:8166');
const out = resolve(option('out', '/tmp/graffiti-support'));
const photos = Number(option('fotos', '3'));
if (!Number.isInteger(photos) || photos < 0 || photos > 30) throw Error('--fotos must be an integer from 0 to 30');
const requested = option('maps', '').split(',').map(s => s.trim()).filter(Boolean);
const selfTest = args.includes('--self-test');
const quality = option('quality', 'med');
if (!['med', 'low'].includes(quality)) throw Error('--quality must be med or low');
const limits = { samplesPerPiece: 25, halfQuadFraction: .49, originOffset: .02, supportDepth: .05, normalDot: .98 };
mkdirSync(out, { recursive: true });
const propSources = readdirSync('public/models/props').filter(file => file.endsWith('.glb')).sort().map(file => `public/models/props/${file}`);
const sourcePaths = [...propSources, 'public/js/maps.js', 'public/js/mapprops.js', 'public/js/textures.js', 'public/js/graffiti_pass.js', 'public/js/graffiti_layout.js', 'public/js/graffiti_surface.js', 'public/js/graffiti_coverage.js', 'tools/eval/graffiti-area-audit.mjs', 'tools/eval/graffiti-fingerprint.mjs',
  'tools/eval/graffiti-support-browser-check.mjs', 'tools/eval/graffiti-art-inventory.mjs', ...Object.values(MAP_SOURCES)];
const sources = Object.fromEntries(sourcePaths.map(file => {
  try { return [file, createHash('sha256').update(readFileSync(file)).digest('hex')]; }
  catch { return [file, null]; }
}));
const receipt = { generatedAt: new Date().toISOString(), base, sources, limits, maps: {}, quality, status: 'running', selfTests: [] };
const save = () => writeFileSync(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));

// Serialized into the browser. Only the paintability predicate is shared; the
// sampling, spatial index, nearest-hit, normals and verdict code are independent.
const measure = async ({ limits, areaSource, graffitiMapIds, identifySource, inventorySource }) => {
  const identifyTexture = (0, eval)(`(${identifySource})`);
  const inventoryMaterials = (0, eval)(`(${inventorySource})`);
  const areaAudit = new Function(`return (${areaSource})`)();
  const THREE = await import('three');
  const { superficieGrafitavel } = await import('./js/graffiti_surface.js');
  const { MAPS } = await import('./js/maps.js');
  const { GRAFITE } = await import('./js/graffiti_layout.js');
  const { mapPropIds, hasProp } = await import('./js/mapprops.js');
  const scene = window.__scene;
  scene.updateMatrixWorld(true);
  const visible = o => {
    for (let a = o; a; a = a.parent) if (!a.visible) return false;
    return true;
  };
  const art = o => {
    for (let a = o; a; a = a.parent) if (/^(decal:|mural:)/.test(a.name || '')) return true;
    return false;
  };
  const meshes = [], allowed = [], pieces = [], unclassifiedArt = [];
  let batchMeshPieces = 0, realDrawnBatches = 0;
  const drawnBounds = new THREE.Box3(), batchVisibility = [], artworkPaths = new Set();
  // Independente da produção: mede a largura/altura pelos quatro vértices do desenho.
  const drawnRectangle = points => {
    const right = points[1].clone().sub(points[0]), down = points[2].clone().sub(points[0]);
    if (Math.abs(right.y) > 1e-8 || Math.hypot(down.x, down.z) > 1e-8 || down.y >= 0
      || points[3].distanceTo(points[0].clone().add(right).add(down)) > 1e-8) return null;
    const center = points[0].clone().add(points[3]).multiplyScalar(.5);
    return { x: center.x, y: center.y, z: center.z, ry: Math.atan2(-right.z, right.x), w: right.length(), h: -down.y };
  };
  const batchGeometryVerdicts = new WeakMap(), renderedQuads = new WeakMap();
  const drawableBatch = (mesh, expected) => {
    if (batchGeometryVerdicts.has(mesh)) return batchGeometryVerdicts.get(mesh);
    const verdict = reason => { batchGeometryVerdicts.set(mesh, reason); return reason; };
    const geometry = mesh.geometry, position = geometry?.attributes?.position, index = geometry?.index;
    if (position?.count !== expected.length * 4 || index?.count !== expected.length * 6) return verdict('batch-geometry-count');
    if (geometry.drawRange.start !== 0 || geometry.drawRange.count < index.count || geometry.groups.length) return verdict('batch-draw-range');
    const pattern = [0, 2, 1, 2, 3, 1], actual = [];
    for (let q = 0; q < expected.length; q++) {
      for (let t = 0; t < 6; t++) if (index.getX(q * 6 + t) !== q * 4 + pattern[t]) return verdict('batch-triangle-topology');
      actual.push(Array.from({ length: 4 }, (_, k) => new THREE.Vector3().fromBufferAttribute(position, q * 4 + k).applyMatrix4(mesh.matrixWorld)));
    }
    for (const p of expected) {
      const ux = Math.cos(p.ry), uz = -Math.sin(p.ry);
      const corners = [[-.5, .5], [.5, .5], [-.5, -.5], [.5, -.5]]
        .map(([u, v]) => new THREE.Vector3(p.x + ux * u * p.w, p.y + v * p.h, p.z + uz * u * p.w));
      const found = actual.findIndex(points => corners.every((corner, k) => corner.distanceToSquared(points[k]) < 1e-8));
      if (found < 0) return verdict('batch-quad-missing-or-moved');
      const drawn = drawnRectangle(actual[found]);
      if (!drawn) return verdict('batch-nonrectangular-quad');
      renderedQuads.set(p, drawn);
      actual.splice(found, 1);
    }
    return verdict(null);
  };
  const visibleArtwork = mesh => {
    if (!mesh?.isMesh || !visible(mesh)) return 'hidden-or-missing-mesh';
    if (!mesh.geometry?.attributes?.position?.count) return 'missing-drawable-geometry';
    if (!(mesh.layers.mask & 1)) return 'hidden-artwork-layer';
    if (Array.isArray(mesh.material)) return 'artwork-material-array-without-groups';
    if (!mesh.userData?.pecas) {
      const g = mesh.geometry, pattern = [0, 2, 1, 2, 3, 1];
      if (g.attributes.position.count !== 4 || g.index?.count !== 6 || g.drawRange.start !== 0
        || g.drawRange.count < 6 || g.groups.length || pattern.some((v, i) => g.index.getX(i) !== v)) return 'manual-incomplete-draw';
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (!materials.length) return 'missing-material';
    for (const material of materials) {
      if (!material || material.visible === false || material.colorWrite === false || !(material.opacity > 0)) return 'hidden-material';
      const texture = material.map, data = texture?.source?.data || texture?.image;
      if (typeof data?.src === 'string') artworkPaths.add(new URL(data.src, location.href).pathname);
      if (!texture || texture.userData?.faltou === true || !data) return 'missing-artwork-texture';
      const width = data.naturalWidth ?? data.videoWidth ?? data.width;
      const height = data.naturalHeight ?? data.videoHeight ?? data.height;
      if (!(width >= 1 && height >= 1) || data.complete === false) return 'unloaded-artwork-texture';
    }
    return null;
  };
  scene.traverse(o => {
    if (o.isMesh && o.geometry && o.material && visible(o) && !art(o)) {
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      if (materials.some(m => m?.visible !== false && m?.colorWrite !== false && (m?.opacity ?? 1) > 0)) {
        meshes.push(o);
        if (superficieGrafitavel(o)) allowed.push(o);
      }
    }
    if (Array.isArray(o.userData?.graffitiPecas)) {
      for (const p of o.userData.graffitiPecas) {
        if (typeof p.f === 'string') artworkPaths.add(new URL(p.f.startsWith('poster:') ? `posters/${p.f.slice(7)}` : `img/decals/${p.f}`, location.href).pathname);
        const matching = o.children.filter(mesh => mesh.isMesh && mesh.name === `decal:${p.f}` && mesh.userData?.pecas);
        const artVisibilityReason = matching.length === 1
          ? visibleArtwork(matching[0]) || drawableBatch(matching[0], o.userData.graffitiPecas.filter(q => q.f === p.f))
          : 'missing-or-ambiguous-batch-mesh';
        pieces.push({ ...p, rendered: renderedQuads.get(p), owner: o.name || '(group)', source: 'batch', visible: !artVisibilityReason, artVisibilityReason });
      }
    }
    if (o.isMesh && /^(decal:|mural:)/.test(o.name || '') && o.userData?.pecas) {
      batchMeshPieces += o.userData.pecas;
      const reason = visibleArtwork(o), bounds = new THREE.Box3().setFromObject(o);
      batchVisibility.push({ name: o.name, owner: o.parent?.name || '(group)', count: o.userData.pecas,
        visible: !reason, reason, bbox: bounds.isEmpty() ? null : { min: bounds.min.toArray(), max: bounds.max.toArray() } });
      if (!reason) { realDrawnBatches++; drawnBounds.union(bounds); }
    }
  });
  const artMaterialInventory = inventoryMaterials(scene, THREE, superficieGrafitavel,
    identifyTexture, window.__graffitiCanvasSources);
  unclassifiedArt.push(...artMaterialInventory.filter(e => e.classification === 'unclassified-overlay'));
  const paintedArtSurfaces = artMaterialInventory.filter(e => e.classification === 'painted-surface');
  const unpaintableTexturedSurfaces = paintedArtSurfaces.filter(e => !e.eligibleSurface || !e.visibleArtwork);
  for (const entry of artMaterialInventory) if (entry.artwork.path) artworkPaths.add(entry.artwork.path);
  scene.traverse(o => {
    if (!o.isMesh || !/^(decal:|mural:)/.test(o.name || '') || o.userData?.pecas) return;
    const params = o.geometry?.parameters;
    if (!params?.width || !params?.height) return;
    const pos = o.getWorldPosition(new THREE.Vector3());
    const n = new THREE.Vector3(0, 0, 1).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(o.matrixWorld));
    const up = new THREE.Vector3(0, 1, 0).transformDirection(o.matrixWorld);
    const scale = o.getWorldScale(new THREE.Vector3());
    const position = o.geometry.attributes.position;
    const rendered = position?.count === 4 ? drawnRectangle(Array.from({ length: 4 }, (_, k) => new THREE.Vector3().fromBufferAttribute(position, k).applyMatrix4(o.matrixWorld))) : null;
    pieces.push({ rendered, x: pos.x, y: pos.y, z: pos.z, ry: Math.atan2(n.x, n.z),
      w: params.width * Math.abs(scale.x), h: params.height * Math.abs(scale.y),
      f: o.name, owner: o.parent?.name || '(group)', source: 'manual', visible: !visibleArtwork(o), artVisibilityReason: visibleArtwork(o), vertical: Math.abs(n.y) < .001 && Math.abs(up.y) >= 1 - 1e-6 });
    if (!visibleArtwork(o)) drawnBounds.union(new THREE.Box3().setFromObject(o));
  });

  // Conservative independent index: a 7-cm ray cannot reach anything outside the
  // 3x3 neighboring four-meter cells. Full AABBs include all InstancedMesh copies.
  const cell = 4, grid = new Map(), box = new THREE.Box3();
  for (const mesh of meshes) {
    box.setFromObject(mesh);
    if (box.isEmpty() || !Number.isFinite(box.min.x + box.max.x + box.min.z + box.max.z)) continue;
    const x0 = Math.floor(box.min.x / cell), x1 = Math.floor(box.max.x / cell);
    const z0 = Math.floor(box.min.z / cell), z1 = Math.floor(box.max.z / cell);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const key = `${x},${z}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(mesh);
    }
  }
  const nearby = (x, z) => {
    const objects = new Set(), gx = Math.floor(x / cell), gz = Math.floor(z / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      for (const o of grid.get(`${gx + dx},${gz + dz}`) || []) objects.add(o);
    }
    return [...objects];
  };
  const rc = new THREE.Raycaster(), origin = new THREE.Vector3(), direction = new THREE.Vector3();
  const worldMatrix = new THREE.Matrix4(), instanceMatrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3();
  const worldNormal = new THREE.Vector3();
  const inspected = [], failures = [], byReason = {}, supportedBy = {};
  for (let index = 0; index < pieces.length; index++) {
    const inventory = pieces[index], p = { ...inventory, ...inventory.rendered }, failedSamples = [];
    const numeric = ['x', 'y', 'z', 'ry', 'w', 'h'].every(k => Number.isFinite(p[k])) && p.w > 0 && p.h > 0;
    if (!numeric || !inventory.rendered || p.vertical === false || !p.visible) {
      const reason = !numeric ? 'invalid-piece-metadata' : !inventory.rendered ? 'missing-drawn-rectangle' : p.vertical === false ? 'nonvertical-art-plane' : 'visible-art';
      byReason[reason] = (byReason[reason] || 0) + 1;
      failures.push({ ...p, index, failedSamples: [{ reason }], failed: 25 });
      continue;
    }
    const nx = Math.sin(p.ry), nz = Math.cos(p.ry), ux = Math.cos(p.ry), uz = -Math.sin(p.ry);
    let maxDepth = 0, minNormalDot = 1;
    for (const su of [-.49, -.245, 0, .245, .49]) for (const sv of [-.49, -.245, 0, .245, .49]) {
      const x = p.x + ux * su * p.w, y = p.y + sv * p.h, z = p.z + uz * su * p.w;
      origin.set(x + nx * limits.originOffset, y, z + nz * limits.originOffset);
      direction.set(-nx, 0, -nz);
      rc.set(origin, direction); rc.near = 0; rc.far = limits.originOffset + limits.supportDepth + 1e-6;
      const hit = rc.intersectObjects(nearby(x, z), false).find(h => {
        const mats = Array.isArray(h.object.material) ? h.object.material : [h.object.material];
        const material = mats[h.face?.materialIndex || 0];
        return material && material.visible !== false && material.colorWrite !== false && (material.opacity ?? 1) > 0;
      });
      let reason = null, dot = null, depth = null;
      if (!hit) reason = 'no-support-within-5cm';
      else {
        depth = hit.distance - limits.originOffset;
        maxDepth = Math.max(maxDepth, depth);
        const mats = Array.isArray(hit.object.material) ? hit.object.material : [hit.object.material];
        const mat = mats[hit.face?.materialIndex || 0];
        if (depth < -.001) reason = 'art-penetrates-foreground-surface';
        else if (!superficieGrafitavel(hit.object) || !mat || mat.visible === false || mat.colorWrite === false || mat.transparent || mat.alphaTest > 0 || (mat.opacity ?? 1) < 1) reason = 'nearest-surface-not-paintable';
        else if (!hit.face) reason = 'missing-geometric-normal';
        else {
          worldMatrix.copy(hit.object.matrixWorld);
          if (hit.object.isInstancedMesh && hit.instanceId !== undefined) {
            hit.object.getMatrixAt(hit.instanceId, instanceMatrix); worldMatrix.multiply(instanceMatrix);
          }
          normalMatrix.getNormalMatrix(worldMatrix);
          worldNormal.copy(hit.face.normal).applyMatrix3(normalMatrix).normalize();
          dot = worldNormal.x * nx + worldNormal.z * nz;
          minNormalDot = Math.min(minNormalDot, dot);
          if (dot < limits.normalDot) reason = 'wall-normal-mismatch';
        }
        if (!reason) supportedBy[hit.object.name || '(unnamed wall)'] = (supportedBy[hit.object.name || '(unnamed wall)'] || 0) + 1;
      }
      if (reason) {
        byReason[reason] = (byReason[reason] || 0) + 1;
        failedSamples.push({ su, sv, x, y, z, reason, hit: hit?.object.name || null, depth, normalDot: dot });
      }
    }
    const area = failedSamples.length ? null : await areaAudit(scene, p, THREE, superficieGrafitavel);
    if (area && !area.supported) {
      const reason = `area:${area.reason}`;
      byReason[reason] = (byReason[reason] || 0) + 1;
    }
    const entry = { ...p, nominal: Object.fromEntries(['x', 'y', 'z', 'ry', 'w', 'h'].map(k => [k, inventory[k]])), index, samples: 25, failed: failedSamples.length, maxDepth, minNormalDot, area };
    inspected.push(entry);
    if (failedSamples.length || (area && !area.supported)) failures.push({ ...entry, failedSamples });
  }
  failures.sort((a, b) => b.failed - a.failed || a.index - b.index);
  const declaredGraffiti = graffitiMapIds.includes(window.__mapId);
  const runtime = window.__grafite || null;
  const baked = GRAFITE[window.__mapId] || null;
  const pieceKey = p => [p.f, ...['x', 'y', 'z', 'ry', 'w', 'h'].map(k => {
    const value = k === 'ry' ? Math.atan2(Math.sin(p[k]), Math.cos(p[k])) : Number(p[k]);
    return (Math.abs(value) < .0000005 ? 0 : value).toFixed(6);
  })].join('|');
  const drawnInventory = new Map();
  for (const p of pieces) {
    const key = pieceKey(p); drawnInventory.set(key, (drawnInventory.get(key) || 0) + 1);
  }
  const expected = [
    ...(baked?.pecas || []).map(([a, x, y, z, ry, w, h]) => ({ f: baked.arquivos[a], x, y, z, ry, w, h })),
    ...(baked?.murais || []).map(([f, x, y, z, ry, w, h]) => ({ f: 'mural:' + f, x, y, z, ry, w, h })),
  ];
  const missingBakedArtifacts = [];
  for (const p of expected) {
    const key = pieceKey(p), count = drawnInventory.get(key) || 0;
    if (!count) missingBakedArtifacts.push(p);
    else drawnInventory.set(key, count - 1);
  }
  const bakeApplied = !declaredGraffiti || (!!baked && runtime?.mapa === window.__mapId
    && runtime.pass?.assado === true && runtime.hom?.assado === true
    && runtime.pass.pecas === baked.pecas.length && runtime.hom.murais === (baked.murais?.length || 0)
    && missingBakedArtifacts.length === 0);
  const totalArea = pieces.reduce((sum, p) => sum + (Number.isFinite(p.w * p.h) ? p.w * p.h : 0), 0);
  const visibleArea = pieces.filter(p => p.visible).reduce((sum, p) => sum + (Number.isFinite(p.w * p.h) ? p.w * p.h : 0), 0);
  const unloadedTemplates = mapPropIds(MAPS[window.__mapId]).filter(id => !hasProp(id));
  const rejectedArea = failures.reduce((sum, p) => sum + (Number.isFinite(p.w * p.h) ? p.w * p.h : 0), 0);
  return { actualMapId: window.__mapId, total: pieces.length, valid: pieces.length - failures.length,
    rejected: failures.length, sampledPoints: inspected.length * 25, candidateMeshes: meshes.length,
    declaredGraffiti, runtimeGraffiti: runtime, bakeApplied,
    missingBakedCount: missingBakedArtifacts.length, missingBakedArtifacts: missingBakedArtifacts.slice(0, 30), buildMs: window.__buildMs,
    expectedBakedPieces: baked?.pecas?.length ?? null, expectedBakedMurals: baked?.murais?.length ?? null,
    realDrawnBatches, visibleArea, usedArtworkPaths: [...artworkPaths], visiblePieces: pieces.filter(p => p.visible).length, batchVisibility, unloadedTemplates,
    drawnBBox: drawnBounds.isEmpty() ? null : { min: drawnBounds.min.toArray(), max: drawnBounds.max.toArray() },
    batchMeshPieces, inventoriedBatchPieces: pieces.filter(p => p.source === 'batch').length, unclassifiedArt,
    artMaterialInventory, paintedArtSurfaces, unpaintableTexturedSurfaces,
    canvasProvenanceInstrumented: !!window.__graffitiCanvasSources,
    totalArea, validArea: totalArea - rejectedArea, rejectedArea,
    allowedWallMeshes: allowed.length, allowedWallNames: [...new Set(allowed.map(o => o.name || '(unnamed wall)'))],
    byReason, supportedBy, pieces: inspected, failures, bounds: window.__world?.bounds || null };
};

const browser = await chromium.launch({ ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : { channel: 'chrome' }),
  headless: true, args: ['--mute-audio'] });
try {
  const registryPage = await browser.newPage();
  await registryPage.goto(`${base}/mapview.html?map=ferro_velho&capture=1&hud=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const registry = await registryPage.evaluate(async () => (await import('./js/maps.js')).MAP_IDS);
  await registryPage.close();
  if (!registry.length) throw Error('MAP_IDS is empty');
  const ids = requested.length ? [...new Set(requested)] : registry;
  for (const id of ids) if (!registry.includes(id)) throw Error(`Unknown map '${id}'; use canonical MAP_IDS`);
  receipt.registry = registry; receipt.requestedMaps = ids;
  save();
  for (const id of ids) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
    await page.addInitScript(quality => localStorage.setItem('awpbr_settings', JSON.stringify({ quality })), quality);
    await page.addInitScript(trackGraffitiCanvases, canvasRanges);
    const errors = [], failedRequests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) failedRequests.push({ status: r.status(), url: r.url() }); });
    page.on('requestfailed', r => failedRequests.push({ status: null, url: r.url(), error: r.failure()?.errorText }));
    const dir = `${out}/${id}`; mkdirSync(dir, { recursive: true });
    try {
      await page.goto(`${base}/mapview.html?map=${encodeURIComponent(id)}&capture=1&hud=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForFunction(() => window.MAPEVAL?.ready === true && !!window.__scene, null, { timeout: 180000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      // Ociosidade da rede pode chegar antes do callback de TextureLoader no build
      // síncrono do Córrego. Só medir depois de decodificar a arte que será desenhada.
      const textureWaitStart = Date.now();
      await page.waitForFunction(() => {
        let ready = true;
        window.__scene.traverse(mesh => {
          if (!mesh.isMesh || !/^(decal:|mural:)/.test(mesh.name || '')) return;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const material of materials) {
            const texture = material?.map;
            if (texture?.userData?.faltou === true) continue; // a medição reprova a falha real
            const data = texture?.source?.data || texture?.image;
            if (!data || !(data.naturalWidth ?? data.videoWidth ?? data.width)
              || !(data.naturalHeight ?? data.videoHeight ?? data.height) || data.complete === false) ready = false;
          }
        });
        return ready;
      }, null, { timeout: 60000 });
      const result = await page.evaluate(measure, { limits, areaSource: measureGraffitiArea.toString(), graffitiMapIds: Object.keys(MAP_SOURCES),
        identifySource: identifyGraffitiTexture.toString(), inventorySource: inventoryGraffitiMaterials.toString() });
      result.textureWaitMs = Date.now() - textureWaitStart;
      result.errors = errors; result.failedRequests = failedRequests; result.photos = [];
      result.relevantFailedRequests = failedRequests.filter(r => /\/models\/props\//.test(r.url)
        || /\/img\/textures\/(corrego_streetart_pixo|campomorro_streetart_baile)\.webp/.test(r.url)
        || result.usedArtworkPaths.includes(new URL(r.url).pathname));
      result.emptyIsAuthored = !result.declaredGraffiti && result.total === 0;
      result.ok = result.actualMapId === id && (result.total > 0 || result.emptyIsAuthored)
        && result.bakeApplied
        && result.rejected === 0 && errors.length === 0 && result.unclassifiedArt.length === 0
        && result.unpaintableTexturedSurfaces.length === 0 && result.canvasProvenanceInstrumented
        && result.batchMeshPieces === result.inventoriedBatchPieces
        && result.relevantFailedRequests.length === 0 && result.unloadedTemplates.length === 0;
      if (selfTest && result.ok) {
        for (const mode of ['batch-empty-range', 'batch-index-missing-quad', 'manual-partial-range', 'manual-material-array']) {
          if (receipt.selfTests.some(test => test.mode === mode)) continue;
          const applied = await page.evaluate(mode => {
            let mesh;
            window.__scene.traverse(o => {
              if (!mesh && o.isMesh && /^(decal:|mural:)/.test(o.name || '')
                && (mode.startsWith('batch-') ? !!o.userData?.pecas : !o.userData?.pecas)) mesh = o;
            });
            if (!mesh) return false;
            const g = mesh.geometry;
            window.__mapAuditMutation = { mesh, material: mesh.material, index: g.index,
              start: g.drawRange.start, count: g.drawRange.count };
            if (mode === 'batch-index-missing-quad') {
              g.setIndex(g.index.clone()); g.index.setX(0, g.index.getX(0) + 1);
            } else if (mode === 'manual-material-array') mesh.material = [mesh.material];
            else g.setDrawRange(0, mode === 'manual-partial-range' ? 3 : 0);
            return true;
          }, mode);
          if (!applied) continue;
          let mutant;
          try {
            mutant = await page.evaluate(measure, { limits, areaSource: measureGraffitiArea.toString(), graffitiMapIds: Object.keys(MAP_SOURCES),
              identifySource: identifyGraffitiTexture.toString(), inventorySource: inventoryGraffitiMaterials.toString() });
          } finally {
            await page.evaluate(() => {
              const saved = window.__mapAuditMutation;
              saved.mesh.material = saved.material; saved.mesh.geometry.setIndex(saved.index);
              saved.mesh.geometry.setDrawRange(saved.start, saved.count);
              delete window.__mapAuditMutation;
            });
          }
          const detected = !mutant.bakeApplied || mutant.rejected > 0 || mutant.batchMeshPieces !== mutant.inventoriedBatchPieces;
          receipt.selfTests.push({ map: id, mode, detected, rejected: mutant.rejected,
            bakeApplied: mutant.bakeApplied, reasons: mutant.byReason });
          if (!detected) throw Error(`Auditor missed actual drawing mutation: ${mode}`);
          console.log(JSON.stringify({ selfTest: mode, map: id, detected, rejected: mutant.rejected }));
        }
      }
      receipt.maps[id] = result;
      writeFileSync(`${dir}/report.json`, JSON.stringify(result, null, 2)); save();
      const overview = `${dir}/overview.png`;
      await page.screenshot({ path: overview, timeout: 30000 });
      result.photos.push(overview);
      for (let i = 0; i < Math.min(photos, result.failures.length); i++) {
        const p = result.failures[i];
        if (!['x', 'y', 'z', 'ry'].every(k => Number.isFinite(p[k]))) continue;
        const nx = Math.sin(p.ry), nz = Math.cos(p.ry), distance = Math.max(3.2, p.w * .8, p.h * 1.2);
        await page.evaluate(({ from, look }) => window.MAPEVAL.view(from, look),
          { from: [p.x + nx * distance, p.y + .2, p.z + nz * distance], look: [p.x, p.y, p.z] });
        const imagePath = `${dir}/failure-${String(i + 1).padStart(2, '0')}-piece-${p.index}.png`;
        await page.screenshot({ path: imagePath, timeout: 30000 }); result.photos.push(imagePath);
      }
      receipt.maps[id] = result;
      writeFileSync(`${dir}/report.json`, JSON.stringify(result, null, 2));
      console.log(JSON.stringify({ map: id, ok: result.ok, total: result.total, rejected: result.rejected,
        declaredGraffiti: result.declaredGraffiti, validArea: Math.round(result.validArea * 100) / 100,
        buildMs: result.buildMs, allowedWallMeshes: result.allowedWallMeshes,
        byReason: result.byReason, report: `${dir}/report.json` }));
    } catch (error) {
      receipt.maps[id] = { ...receipt.maps[id], ok: false, error: error.message, errors, failedRequests };
      writeFileSync(`${dir}/report.json`, JSON.stringify(receipt.maps[id], null, 2));
      console.error(JSON.stringify({ map: id, ok: false, error: error.message.split('\n')[0] }));
    } finally { save(); await page.close(); }
  }
  const mutationsComplete = !selfTest || receipt.selfTests.length === 4 && receipt.selfTests.every(test => test.detected);
  receipt.status = Object.values(receipt.maps).every(r => r.ok) && mutationsComplete ? 'passed' : 'failed';
  if (!mutationsComplete) receipt.error = 'Requested drawing mutations were not all exercised';
} catch (error) {
  receipt.status = 'failed'; receipt.error = error.message; console.error(error.message);
} finally { await browser.close(); save(); }
console.log(JSON.stringify({ status: receipt.status, auditedMaps: Object.keys(receipt.maps).length, receipt: `${out}/receipt.json` }));
if (receipt.status !== 'passed') process.exitCode = 1;
