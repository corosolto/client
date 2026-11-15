#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {extname, join, normalize, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../', import.meta.url));
const publicRoot = join(root, 'public');
const output = join(root, 'tools/eval/asset-evidence/items/urban-catalog-fit');
const reportPath = join(output, 'report.json');
const evidencePath = join(output, 'evidence-manifest.json');
const scenePath = join(root, 'tools/eval/urban-catalog-fit-scene.mjs');
const port = Number(process.env.URBAN_FIT_PORT || 9475);
const catalog = readJson('tools/character-kit/garment/urban-catalog.json');
const census = readJson('tools/character-kit/garment/body-census.json');
const eyewearManifest = readJson('public/models/items/eyewear-manifest.json');
const BODY_CHUNK = 26;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashFile = path => hash(readFileSync(path));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const apparelFamilies = new Set(['boxy-tee', 'oversized-tee', 'shell-jacket', 'cargo-pants', 'bermuda-shorts', 'low-sneaker', 'chunky-runner', 'boot']);
const rigidFamilies = new Set([
  'backpack-rolltop', 'backpack-triple-pocket', 'backpack-sling', 'backpack-drypack', 'backpack-modular', 'backpack-tote', 'backpack-duffel',
  'headwear-trucker', 'headwear-boina', 'headwear-beanie', 'headwear-bucket', 'headwear-balaclava', 'headwear-hair', 'headwear-helmet',
  'accessory-chain', 'accessory-bandana', 'accessory-earring', 'accessory-bracelet', 'accessory-modular', 'accessory-ring', 'accessory-belt', 'accessory-case',
]);
const eyewearFamilies = Object.freeze({
  'eyewear-frame': 'oval-90',
  'eyewear-safety': 'metal-de-rua',
  'eyewear-visor': 'visor-de-pista',
  'eyewear-wrap': 'ouro-de-quebrada',
});

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
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
    scene: hashFile(scenePath),
    captureTool: hashFile(fileURLToPath(import.meta.url)),
  };
}

function factoryFor(family) {
  if (apparelFamilies.has(family)) return {kind: 'apparel-proxy', factory: 'createUrbanApparelProxy', assetId: null};
  if (rigidFamilies.has(family)) return {kind: 'rigid-proxy', factory: 'mountUrbanRigidCandidate', assetId: null};
  if (Object.hasOwn(eyewearFamilies, family)) return {kind: 'eyewear-glb-profile', factory: 'mountEyewearCandidate', assetId: eyewearFamilies[family]};
  return null;
}

function mime(path) {
  return ({'.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.webp': 'image/webp', '.wasm': 'application/wasm'}[extname(path)] || 'application/octet-stream');
}

function fitServer() {
  return createServer((request, response) => {
    const pathname = new URL(request.url, 'http://urban-fit.local').pathname;
    if (pathname === '/__urban-fit/') {
      response.setHeader('content-type', 'text/html');
      response.end('<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#111927}canvas{display:block;width:420px;height:560px}</style><script type="importmap">{"imports":{"three":"/vendor/three.module.js","three/addons/":"/vendor/addons/"}}</script><canvas width="420" height="560"></canvas><script type="module" src="/__urban-fit/scene.mjs"></script>');
      return;
    }
    const base = pathname === '/__urban-fit/scene.mjs' ? root : publicRoot;
    const file = pathname === '/__urban-fit/scene.mjs'
      ? scenePath
      : join(publicRoot, normalize(pathname).replace(/^[/\\]+/, ''));
    if (!relative(base, file).startsWith('..') && existsSync(file)) {
      response.setHeader('content-type', mime(file));
      response.end(readFileSync(file));
      return;
    }
    response.statusCode = 404;
    response.end('not found');
  });
}

async function bodyCell(front, threeQuarter, row) {
  const [a, b] = await Promise.all([
    sharp(front).resize(280, 373, {fit: 'fill'}).png().toBuffer(),
    sharp(threeQuarter).resize(280, 373, {fit: 'fill'}).png().toBuffer(),
  ]);
  const statusColor = row.status === 'study-only' ? '#f2d76b' : '#aebbd0';
  const statusText = row.status === 'study-only'
    ? 'ESTUDO DE SILHUETA · ENCAIXE NÃO AVALIADO'
    : row.status.toUpperCase();
  const requested = row.familiesRequested.map(value => value.replace(/^(headwear|backpack|accessory)-/, '')).join(' · ');
  const label = Buffer.from(`<svg width="560" height="72"><rect width="560" height="72" fill="#0b1220"/><text x="12" y="22" font-family="Arial" font-size="15" font-weight="700" fill="white">${escape(row.bodyId)}</text><text x="548" y="22" text-anchor="end" font-family="Arial" font-size="12" font-weight="700" fill="${statusColor}">${escape(statusText)}</text><text x="12" y="43" font-family="Arial" font-size="11" fill="#f2d76b">${escape(requested.slice(0, 82))}</text><text x="12" y="62" font-family="Arial" font-size="10" fill="#aebbd0">frente · 3/4 · sem headwear · perfil individual obrigatório · certified:false</text></svg>`);
  return sharp({create: {width: 560, height: 445, channels: 4, background: '#111927'}})
    .composite([{input: a, left: 0, top: 0}, {input: b, left: 280, top: 0}, {input: label, left: 0, top: 373}])
    .png().toBuffer();
}

async function writeBodySheet(rows, cells, index) {
  const columns = 2, cellWidth = 560, cellHeight = 445;
  const sheetName = `bodies-${String(index + 1).padStart(2, '0')}.png`;
  const title = Buffer.from(`<svg width="${columns * cellWidth}" height="74"><rect width="100%" height="74" fill="#101827"/><text x="20" y="30" font-family="Arial" font-size="23" font-weight="700" fill="white">Estudo urbano · corpos ${index * BODY_CHUNK + 1}–${index * BODY_CHUNK + rows.length} de ${census.bodies.length}</text><text x="20" y="55" font-family="Arial" font-size="13" fill="#f2d76b">SILHUETA APENAS · frente + 3/4 · bonés adiados · nenhum encaixe corporal aprovado</text></svg>`);
  const composites = [{input: title, left: 0, top: 0}];
  cells.forEach((cell, cellIndex) => composites.push({input: cell, left: (cellIndex % columns) * cellWidth, top: 74 + Math.floor(cellIndex / columns) * cellHeight}));
  await sharp({create: {width: columns * cellWidth, height: 74 + Math.ceil(cells.length / columns) * cellHeight, channels: 4, background: '#111927'}})
    .composite(composites).png({compressionLevel: 9}).toFile(join(output, sheetName));
  rows.forEach((row, rowIndex) => { row.evidence = {sheet: sheetName, tileIndex: rowIndex, views: ['front', 'threeQuarter']}; });
  return sheetName;
}

async function familyCell(buffer, row) {
  const image = await sharp(buffer).resize(300, 400, {fit: 'fill'}).png().toBuffer();
  const label = Buffer.from(`<svg width="300" height="74"><rect width="300" height="74" fill="#0b1220"/><text x="10" y="21" font-family="Arial" font-size="14" font-weight="700" fill="white">${escape(row.family)}</text><text x="10" y="42" font-family="Arial" font-size="11" fill="#f2d76b">${escape(row.factory)}</text><text x="10" y="61" font-family="Arial" font-size="10" fill="#9fb0c8">corpo real: ${escape(row.anchorBodyId)} · certified:false</text></svg>`);
  return sharp({create: {width: 300, height: 474, channels: 4, background: '#111927'}}).composite([{input: image, left: 0, top: 0}, {input: label, left: 0, top: 400}]).png().toBuffer();
}

async function writeFamilySheet(rows, cells) {
  const columns = 4, cellWidth = 300, cellHeight = 474, sheetName = 'families-34.png';
  const header = Buffer.from(`<svg width="${columns * cellWidth}" height="74"><rect width="100%" height="74" fill="#101827"/><text x="20" y="30" font-family="Arial" font-size="23" font-weight="700" fill="white">34 famílias geométricas · estudo de forma</text><text x="20" y="55" font-family="Arial" font-size="13" fill="#f2d76b">Não demonstra compatibilidade corporal · headwear adiado · nenhum asset Mint final</text></svg>`);
  const composites = [{input: header, left: 0, top: 0}];
  cells.forEach((cell, index) => composites.push({input: cell, left: (index % columns) * cellWidth, top: 74 + Math.floor(index / columns) * cellHeight}));
  await sharp({create: {width: columns * cellWidth, height: 74 + Math.ceil(cells.length / columns) * cellHeight, channels: 4, background: '#111927'}})
    .composite(composites).png({compressionLevel: 9}).toFile(join(output, sheetName));
  rows.forEach((row, index) => { row.evidence = {sheet: sheetName, tileIndex: index, view: 'gallery'}; });
  return sheetName;
}

async function blockedCell(item) {
  return Buffer.from(`<svg width="360" height="210"><rect width="360" height="210" rx="12" fill="#171d2a"/><rect x="8" y="8" width="344" height="194" rx="9" fill="none" stroke="#e85c65" stroke-width="3"/><text x="20" y="38" font-family="Arial" font-size="16" font-weight="700" fill="#ff7b83">BLOQUEADO · PERMISSION-NEEDED</text><text x="20" y="70" font-family="Arial" font-size="15" font-weight="700" fill="white">${escape(item.name).slice(0, 40)}</text><text x="20" y="94" font-family="Arial" font-size="11" fill="#aebbd0">${escape(item.itemId).slice(0, 52)}</text><text x="20" y="124" font-family="Arial" font-size="12" fill="#f2d76b">família: ${escape(item.geometryFamily)}</text><text x="20" y="157" font-family="Arial" font-size="13" font-weight="700" fill="#ffb2b6">SEM ARTE · NÃO MONTAR · NÃO ENVIAR AO MINT</text><text x="20" y="182" font-family="Arial" font-size="11" fill="#aebbd0">approved:false · certified:false · runtime:false</text></svg>`);
}

async function writeBlockedSheet(rows) {
  const cells = await Promise.all(rows.map(blockedCell));
  const columns = 3, cellWidth = 360, cellHeight = 210, sheetName = 'blocked-permission-needed-13.png';
  const header = Buffer.from(`<svg width="${columns * cellWidth}" height="70"><rect width="100%" height="70" fill="#101827"/><text x="20" y="29" font-family="Arial" font-size="22" font-weight="700" fill="white">13 pedidos protegidos · cards sem arte copiada</text><text x="20" y="53" font-family="Arial" font-size="13" fill="#ff9198">Somente inventário bloqueado. Nenhum logo renderizado, nenhum asset vestido, nenhum envio Mint.</text></svg>`);
  const composites = [{input: header, left: 0, top: 0}];
  cells.forEach((cell, index) => composites.push({input: cell, left: (index % columns) * cellWidth, top: 70 + Math.floor(index / columns) * cellHeight}));
  await sharp({create: {width: columns * cellWidth, height: 70 + Math.ceil(cells.length / columns) * cellHeight, channels: 4, background: '#111927'}})
    .composite(composites).png({compressionLevel: 9}).toFile(join(output, sheetName));
  rows.forEach((row, index) => { row.evidence = {sheet: sheetName, tileIndex: index, artIncluded: false}; });
  return sheetName;
}

async function capture() {
  mkdirSync(output, {recursive: true});
  const http = fitServer();
  await new Promise((resolve, reject) => http.once('error', reject).listen(port, '127.0.0.1', resolve));
  const browser = await chromium.launch({executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--mute-audio', '--use-angle=metal']});
  const page = await browser.newPage({viewport: {width: 420, height: 560}, deviceScaleFactor: 1});
  const consoleErrors = [];
  page.on('pageerror', error => consoleErrors.push(`pageerror:${error.message}`));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`console:${message.text()}`); });
  const hashes = sourceHashes();
  const allFamilies = [...new Set(catalog.items.map(item => item.geometryFamily))].sort();
  const safeItems = catalog.items.filter(item => item.rightsStatus === 'original-safe');
  const blockedItems = catalog.items.filter(item => item.rightsStatus === 'permission-needed');
  const report = {
    schemaVersion: 'cs-urban-catalog-fit/1',
    status: 'silhouette-study-not-body-fit',
    approved: false,
    certified: false,
    runtimeEnabled: false,
    sourceHashes: hashes,
    views: ['front', 'threeQuarter'],
    summary: {catalogItems: catalog.items.length, safeConcepts: safeItems.length, blockedPermissionNeeded: blockedItems.length, bodiesObserved: census.bodies.length, selectableBodies: census.bodies.filter(body => body.sourceKind !== 'auxiliary').length, auxiliaryBodies: census.bodies.filter(body => body.sourceKind === 'auxiliary').length, bodyFitCandidates: 0, bodyFitUnassessed: census.bodies.filter(body => body.sourceKind !== 'auxiliary').length, headwearDeferred: true, geometryFamiliesObserved: allFamilies.length, certified: 0, mintSubmitted: false},
    catalog: catalog.items.map(item => {
      const mapping = factoryFor(item.geometryFamily), headwearDeferred = item.geometryFamily.startsWith('headwear-');
      return item.rightsStatus === 'permission-needed'
        ? {itemId: item.id, geometryFamily: item.geometryFamily, rightsStatus: item.rightsStatus, resolution: 'blocked-permission-needed', mounted: false, artIncluded: false, status: 'blocked', approved: false, certified: false, runtimeEnabled: false}
        : {itemId: item.id, geometryFamily: item.geometryFamily, rightsStatus: item.rightsStatus, resolution: headwearDeferred ? 'deferred-headwear' : mapping ? 'research-proxy' : 'missing-factory', mounted: false, fitStatus: headwearDeferred ? 'unassessed-per-body' : mapping ? 'silhouette-study-not-body-fit' : null, ...mapping, approved: false, certified: false, runtimeEnabled: false};
    }),
    bodies: [],
    families: [],
    blockedCards: blockedItems.map(item => ({itemId: item.id, name: item.name, geometryFamily: item.geometryFamily, mounted: false, artIncluded: false, approved: false, certified: false, runtimeEnabled: false})),
    consoleErrors,
  };
  const evidenceFiles = [];
  try {
    await page.goto(`http://127.0.0.1:${port}/__urban-fit/`, {waitUntil: 'load'});
    await page.waitForFunction(() => window.urbanCatalogFitReady === true);
    for (let chunkStart = 0; chunkStart < census.bodies.length; chunkStart += BODY_CHUNK) {
      const rows = [], cells = [];
      for (let index = chunkStart; index < Math.min(census.bodies.length, chunkStart + BODY_CHUNK); index++) {
        const record = census.bodies[index];
        let row;
        try {
          row = await page.evaluate(([body, ordinal]) => window.urbanCatalogFit.loadBody(body, ordinal), [record, index]);
          await page.evaluate(() => window.urbanCatalogFit.render('front'));
          const front = await page.locator('canvas').screenshot();
          await page.evaluate(() => window.urbanCatalogFit.render('threeQuarter'));
          const threeQuarter = await page.locator('canvas').screenshot();
          row.path = record.path;
          row.bodySha256 = record.sourceSha256;
          row.censusStatus = record.fitProfile.status;
          rows.push(row);
          cells.push(await bodyCell(front, threeQuarter, row));
        } catch (error) {
          throw new Error(`${record.bodyId}: body capture failed: ${error.message}`);
        }
      }
      const sheet = await writeBodySheet(rows, cells, chunkStart / BODY_CHUNK);
      evidenceFiles.push({name: sheet, kind: 'body-contact-sheet'});
      report.bodies.push(...rows);
    }
    const anchorBodies = [
      census.bodies.find(body => body.bodyId === 'character:capitao'),
      ...census.bodies.filter(body => body.fitProfile.status === 'unknown' && body.bodyId !== 'character:capitao'),
    ].filter(Boolean);
    for (const family of allFamilies) {
      const candidates = Object.hasOwn(eyewearFamilies, family) ? anchorBodies.slice(0, 1) : anchorBodies;
      let row, lastError;
      for (const anchor of candidates) {
        try {
          row = await page.evaluate(({value, body}) => window.urbanCatalogFit.loadFamily({
            family: value,
            anchorPath: body.path,
            anchorBodyId: body.bodyId,
            anchorBodySha256: body.sourceSha256,
          }), {value: family, body: anchor});
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!row) throw new Error(`${family}: no real census anchor mounted: ${lastError?.message || 'unknown error'}`);
      await page.evaluate(() => window.urbanCatalogFit.render('gallery'));
      const screenshot = await page.locator('canvas').screenshot();
      report.families.push(row);
      if (row.factory === 'mountEyewearCandidate') {
        const entry = eyewearManifest.eyewear[row.assetId];
        row.assetSha256 = entry.sha256;
        row.profileBodySha256 = entry.profiles.capitao.bodySha256;
      }
      if (!report._familyCells) report._familyCells = [];
      report._familyCells.push(await familyCell(screenshot, row));
    }
    const familySheet = await writeFamilySheet(report.families, report._familyCells);
    delete report._familyCells;
    evidenceFiles.push({name: familySheet, kind: 'family-gallery'});
    const blockedSheet = await writeBlockedSheet(report.blockedCards);
    evidenceFiles.push({name: blockedSheet, kind: 'blocked-card-gallery'});
    report.resourceDisposals = await page.evaluate(() => window.urbanCatalogFit.dispose());
    if (consoleErrors.length) throw new Error(`browser console errors: ${consoleErrors.join('; ')}`);
    report.browserVersion = await browser.version();
    report.budgets = {
      maximumBodyDrawCalls: Math.max(...report.bodies.map(row => row.drawCalls)),
      maximumBodyTriangles: Math.max(...report.bodies.map(row => row.triangles)),
      maximumFamilyDrawCalls: Math.max(...report.families.map(row => row.drawCalls)),
      maximumFamilyTriangles: Math.max(...report.families.map(row => row.triangles)),
    };
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    const files = {};
    for (const entry of evidenceFiles) {
      const path = join(output, entry.name), metadata = await sharp(path).metadata(), bytes = readFileSync(path);
      files[entry.name] = {kind: entry.kind, bytes: bytes.length, sha256: hash(bytes), width: metadata.width, height: metadata.height};
    }
    const evidence = {schemaVersion: 'cs-urban-catalog-fit-evidence/1', sourceHashes: hashes, files};
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(`urban-catalog-fit write: ${report.bodies.filter(row => row.status === 'study-only').length}/${report.summary.selectableBodies} selectable study-only, ${report.bodies.filter(row => row.status === 'not-applicable').length}/${report.summary.auxiliaryBodies} auxiliary not-applicable, ${report.families.length}/34 shape families, ${report.catalog.filter(row => row.resolution === 'deferred-headwear').length} headwear concepts deferred, ${report.blockedCards.length}/13 rights-blocked, ${Object.keys(files).length} hash-pinned sheets`);
  } finally {
    await browser.close();
    await new Promise(resolve => http.close(resolve));
  }
}

async function check() {
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  const current = sourceHashes();
  assert.deepEqual(report.sourceHashes, current, 'fit report inputs are stale; run capture:urban-catalog-fit');
  assert.deepEqual(evidence.sourceHashes, current, 'evidence inputs are stale; run capture:urban-catalog-fit');
  assert.equal(report.consoleErrors.length, 0, 'captured browser console errors');
  for (const [file, expected] of Object.entries(evidence.files)) {
    const bytes = readFileSync(join(output, file));
    assert.equal(bytes.length, expected.bytes, `${file}: evidence byte count changed`);
    assert.equal(hash(bytes), expected.sha256, `${file}: evidence hash changed`);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.width, expected.width, `${file}: evidence width changed`);
    assert.equal(metadata.height, expected.height, `${file}: evidence height changed`);
  }
  console.log(`urban-catalog-fit check: ${report.bodies.filter(row => row.status === 'study-only').length}/${report.summary.selectableBodies} selectable study-only, ${report.bodies.filter(row => row.status === 'not-applicable').length}/${report.summary.auxiliaryBodies} auxiliary not-applicable, ${report.families.length}/34 shape families, ${Object.keys(evidence.files).length} hash-pinned sheets, console errors=0`);
}

const mode = process.argv[2] || '--check';
if (mode === '--write' || mode === '--capture') await capture();
else if (mode === '--check') await check();
else throw new Error('usage: urban-catalog-fit-matrix.mjs --check|--write');
