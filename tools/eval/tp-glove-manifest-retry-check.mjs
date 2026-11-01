#!/usr/bin/env node
// R864: erro transitório do manifesto virava negativo permanente; mede Game/GLTF reais.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const PREFIX = 'GLOVE-MANIFEST/1 ';
const CASES = {
  'recover-http': ['R1', 'R2'], 'recover-network': ['R1', 'R2'],
  'recover-json': ['R1', 'R2'], 'recover-shape': ['R1', 'R2'],
  persistent: ['P1', 'P2', 'P3'], concurrent: ['C1', 'C2'],
  'rearm-style': ['E1'], 'rearm-origin': ['E2'],
  'negative-package': ['N1'], 'negative-glb': ['N2'], stale: ['ST1', 'ST2'],
};
const MUTANTS = {
  'cache-forever': { cases: ['recover-http'], failed: ['recover-http/R2'] },
  'no-auto-retry': { cases: ['recover-http'], failed: ['recover-http/R2'] },
  'per-frame-storm': { cases: ['persistent'], failed: ['persistent/P1'] },
  'token-stale': { cases: ['stale'], failed: ['stale/ST1'] },
  'rearm-off': { cases: ['persistent'], failed: ['persistent/P2'] },
  'rearm-style': { cases: ['rearm-style'], failed: ['rearm-style/E1'] },
  'rearm-origin': { cases: ['rearm-origin'], failed: ['rearm-origin/E2'] },
  'warn-each-owner': { cases: ['concurrent'], failed: ['concurrent/C2'] },
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const CHECKER_HASH = hash(fs.readFileSync(SELF));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const turn = () => new Promise(resolve => setImmediate(resolve));
const gate = () => { let release; const promise = new Promise(r => { release = r; }); return { promise, release }; };
const replaceOne = (s, a, b) => {
  if (a === b || s.split(a).length !== 2) throw Error(`INFRA: anchor not unique: ${a.slice(0, 100)}`);
  return s.replace(a, b);
};
function productFiles(config) {
  const dir = config.productCopy
    ? (fs.existsSync(path.join(config.productCopy, 'public/js/game.js')) ? path.join(config.productCopy, 'public/js') : config.productCopy)
    : path.join(config.sourceRoot, 'public/js');
  return Object.fromEntries(['game.js', 'glbchars.js', 'main.js'].map(name => {
    const target = path.join(dir, name);
    const file = name === 'main.js' && !fs.existsSync(target) ? path.join(config.sourceRoot, 'public/js', name) : target;
    const bytes = fs.readFileSync(file);
    return [name, { file, bytes: bytes.length, sha256: hash(bytes), text: bytes.toString('utf8') }];
  }));
}
function pins(files) { return Object.fromEntries(Object.entries(files).map(([name, p]) => [name, { file: p.file, bytes: p.bytes, sha256: p.sha256 }])); }
function mutate(files, name) {
  if (!name) return files;
  const out = Object.fromEntries(Object.entries(files).map(([k, p]) => [k, { ...p }]));
  if (name === 'cache-forever') out['glbchars.js'].text = replaceOne(out['glbchars.js'].text,
    'if (_gloveManifest === request) _gloveManifest = null;', 'if (false) _gloveManifest = null;');
  if (name === 'no-auto-retry') {
    const key = out['game.js'].text.includes('void gloveHandle.preload()') ? 'gloveKey' : 'def.id';
    out['game.js'].text = replaceOne(out['game.js'].text, `asked.delete(${key});`, 'void 0;');
  }
  if (name === 'per-frame-storm') out['game.js'].text = replaceOne(out['game.js'].text, ' && !demand.retried)', ')');
  if (name === 'token-stale') out['game.js'].text = replaceOne(out['game.js'].text, 'this._tpGloveDemand === demand && ', '');
  if (name === 'rearm-off') out['game.js'].text = replaceOne(out['game.js'].text,
    'if (this._tpGloveDemand?.key !== demandKey)', 'if (gloveId && this._tpGloveDemand?.key !== demandKey)');
  if (name === 'rearm-style' || name === 'rearm-origin') {
    const key = out['game.js'].text.includes('void gloveHandle.preload()') ? 'gloveKey' : 'def.id';
    out['game.js'].text = replaceOne(out['game.js'].text, `JSON.stringify([${key}, gloveId])`,
      name === 'rearm-style' ? `JSON.stringify([${key}, null])` : 'JSON.stringify([null, gloveId])');
  }
  if (name === 'warn-each-owner') out['glbchars.js'].text = replaceOne(out['glbchars.js'].text,
    'if (!this.reported)', 'if (true)');
  return out;
}

async function worker(config) {
  const { sourceRoot, scenario, mutant, nonce } = config;
  const result = { version: 1, scenario, mutant, nonce, rows: [], sources: null, assets: [], scope: 'Game/GLTF CPU; no art/browser/MP/mobile' };
  const games = [], io = [], errors = [], warnings = [], cleanup = [];
  let temp, manifestCalls = 0, targetLoads = 0, tapCalls = 0;
  let delayedError = null, releaseOld = null, firstHold = null, secondHold = null;
  let mode = scenario.startsWith('recover-') ? scenario.slice(8)
    : ['persistent', 'stale', 'rearm-style', 'rearm-origin'].includes(scenario) ? 'http' : 'ok';
  const warn0 = console.warn;
  const deadline = setTimeout(() => { console.error('INFRA: glove-manifest worker deadline'); process.exit(3); }, 45000);
  const row = (id, ok, detail) => result.rows.push({ id, ok: Boolean(ok), detail });
  const counts = () => ({ manifestCalls, targetLoads, tapCalls, warnings: warnings.length });
  try {
    const shim = path.join(sourceRoot, 'node_modules/three/index.js');
    if (!fs.existsSync(shim)) throw Error('INFRA: existing source-root three shim required; no dependency writes allowed');
    const original = productFiles(config); result.sources = pins(original);
    const source = mutate(original, mutant);
    const publicFile = url => path.join(sourceRoot, 'public', new URL(String(url), 'http://fixture/').pathname.replace(/^\//, ''));
    const manifestFile = path.join(sourceRoot, 'public/data/gloves-manifest.json');
    const originalManifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    const variant = originalManifest.packages.filter(p => p.perspective === '3p')
      .flatMap(p => p.sourceVariants.filter(v => v.characterIds.includes('barbudo')).map(v => ({ pack: p, variant: v })));
    if (variant.length !== 1) throw Error('INFRA: published Barbudo variant must be unique');
    const targetPaths = new Map();
    for (const p of originalManifest.packages) if (p.perspective === '3p') for (const v of p.sourceVariants)
      for (const id of v.characterIds) if (['barbudo', 'capitao'].includes(id))
        targetPaths.set(id, `/models/gloves/3p/${v.id}-${p.skeletonFamily.fingerprintSha256.slice(0, 12)}.glb`);
    const targetParts = new Map();
    if (scenario === 'concurrent' || scenario === 'stale') { firstHold = gate(); secondHold = gate(); }
    const localFetch = async url => {
      const file = publicFile(url);
      if (file !== manifestFile) return fs.existsSync(file) ? new Response(fs.readFileSync(file)) : new Response('', { status: 404 });
      const n = ++manifestCalls;
      if (n === 1 && firstHold) await firstHold.promise;
      if (n === 2 && secondHold) await secondHold.promise;
      const failure = mode === 'third-http' ? n === 3
        : mode !== 'ok' && (['persistent', 'stale', 'rearm-style', 'rearm-origin'].includes(scenario) || n === 1);
      if (failure) {
        if (mode === 'network') throw new Error('controlled_manifest_network');
        if (mode === 'json') return new Response('{');
        if (mode === 'shape') return new Response('{"packages":null}');
        return new Response('', { status: 503 });
      }
      const data = JSON.parse(JSON.stringify(originalManifest));
      if (scenario === 'negative-package') for (const p of data.packages) if (p.perspective === '3p')
        for (const v of p.sourceVariants) v.characterIds = v.characterIds.filter(id => id !== 'barbudo');
      return new Response(JSON.stringify(data));
    };
    Object.defineProperty(globalThis, 'fetch', { configurable: true, get: () => localFetch, set() {} });
    const H = await import(pathToFileURL(path.join(sourceRoot, 'tools/eval/harness.mjs')).href);
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: localFetch });
    const require = createRequire(path.join(sourceRoot, 'package.json'));
    const { GLTFLoader } = await import(pathToFileURL(require.resolve('three/addons/loaders/GLTFLoader.js')).href);
    const load0 = GLTFLoader.prototype.load;
    cleanup.push(() => { GLTFLoader.prototype.load = load0; });
    GLTFLoader.prototype.load = function (url, done, progress, fail) {
      const file = publicFile(url), assetPath = new URL(String(url), 'http://fixture/').pathname;
      const isTarget = [...targetPaths.values()].includes(assetPath);
      if (isTarget) targetLoads++;
      const task = Promise.resolve().then(async () => {
        if (isTarget && scenario === 'negative-glb') { fail?.(new Error('controlled_glove_failure')); return; }
        const bytes = fs.readFileSync(file), loader = new GLTFLoader();
        loader.register(() => ({ name: 'EXT_texture_webp', async loadTexture() {
          const texture = new H.THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); texture.needsUpdate = true; return texture;
        } }));
        const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        if (isTarget) { const parts = []; gltf.scene.traverse(o => { if (o.isSkinnedMesh) parts.push(o); });
          if (parts.length !== 2 || new Set(parts.map(p => p.geometry)).size !== 2) throw Error('published glove parts changed'); targetParts.set(assetPath, parts); }
        result.assets.push({ file, bytes: bytes.length, sha256: hash(bytes) }); done(gltf);
      }).catch(e => { errors.push(String(e.stack || e)); fail?.(e); });
      io.push(task);
    };
    console.warn = (...args) => { warnings.push(args.map(String).join(' ')); };
    temp = fs.mkdtempSync(path.join(config.artifacts, 'worker-'));
    const baseURL = pathToFileURL(path.join(sourceRoot, 'public/js')).href + '/';
    const absolute = text => text.replace(/from '(\.\/[^']+)'/g, (_, rel) => `from ${JSON.stringify(baseURL + rel.slice(2))}`)
      .replace(/from '(three(?:\/[^']+)?)'/g, (_, name) => `from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`)
      .replace(/import\('\.\//g, `import('${baseURL}`);
    const glbURL = pathToFileURL(path.join(temp, 'glbchars.mjs')).href;
    fs.writeFileSync(path.join(temp, 'glbchars.mjs'), absolute(source['glbchars.js'].text));
    let gameText = replaceOne(source['game.js'].text, "from './glbchars.js'", `from ${JSON.stringify(glbURL)}`);
    const tapAnchor = gameText.includes('void gloveHandle.preload()') ? 'void gloveHandle.preload()' : 'void preloadGloveAssets([def.id])';
    gameText = replaceOne(gameText, tapAnchor, `void globalThis.__gloveRetryTap(${tapAnchor.slice(5)}, this)`);
    globalThis.__gloveRetryTap = promise => {
      const n = ++tapCalls;
      return scenario === 'stale' && n === 1 ? promise.then(v => v, e => {
        delayedError = e; return new Promise((_, reject) => { releaseOld = () => reject(e); });
      }) : promise;
    };
    fs.writeFileSync(path.join(temp, 'game.mjs'), absolute(gameText));
    const G = await import(glbURL), { Game } = await import(pathToFileURL(path.join(temp, 'game.mjs')).href);
    await G.preloadCharacterAssets(['barbudo', 'capitao'], { weapons: ['pistol', 'mp5'] });
    if (!G.hasModel('barbudo') || !G.hasModel('capitao')) throw Error('INFRA: real character asset absent');
    const textures = H.initTextures();
    const boot = (glove = 'luvas-brasil') => {
      H.seedRandom(12345);
      const g = new Game({ renderer: H.renderer, textures, sfx: H.sfx,
        settings: { bots: 1, allyBots: 0, enemyBots: 1, quality: 'low', difficulty: 'normal', sens: 1 },
        playerCharId: 'barbudo', playerGloveId: glove, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'SIM',
        mapId: 'posto_treta', ctf: false, testMode: true, matchRoster: { allyDefs: [], enemyDefs: [H.CHARACTERS.find(c => c.id === 'capitao')] },
        matchWeapons: ['pistol'], onQuit() {}, onMatchEnd() {} });
      games.push(g); g._ensureDolly = () => {}; g.killsToWin = Infinity; g.start(); g.state = 'live'; g.setCamView('third'); return g;
    };
    const gloves = g => { const list = []; g.playerTP.group.traverse(o => { if (o.name === 'luvas-3p') list.push(o); }); return list; };
    const complete = (g, style = 'luvas-brasil') => {
      const list = gloves(g); let body;
      g.playerTP.group.traverse(o => { if (!body && o.isSkinnedMesh && o.name !== 'luvas-3p') body = o; });
      const parts = targetParts.get(targetPaths.get(g.playerCharId));
      return g.playerTP.isGLB && list.length === 2 && parts?.every(p => list.filter(o => o.geometry === p.geometry).length === 1)
        && list.every(o => o.userData.gloveSkin === style && o.parent === body?.parent && o.skeleton.bones.every(b => body.skeleton.bones.includes(b)));
    };
    const settle = async () => { await turn(); let n = -1;
      while (n !== io.length) { n = io.length; await Promise.all(io); await turn(); }
      if (errors.length) throw Error('INFRA: loader failed: ' + errors[0]);
    };
    const snapshot = g => ({ tp: g.playerTP, ctrl: g.playerTP.ctrl, mixer: g.playerTP.mixer });
    const unchanged = (g, old) => g.playerTP === old.tp && g.playerTP.ctrl === old.ctrl && g.playerTP.mixer === old.mixer;
    const ensures = async (g, n = 20) => { for (let i = 0; i < n; i++) { g._ensurePlayerTP(); await settle(); } };
    if (scenario.startsWith('recover-')) {
      const g = boot(), old = snapshot(g); await settle();
      row('R1', manifestCalls === 1 && targetLoads === 0 && gloves(g).length === 0 && warnings.length === 1 && unchanged(g, old), counts());
      g._ensurePlayerTP(); await settle(); g._ensurePlayerTP(); await settle();
      row('R2', manifestCalls === 2 && targetLoads === 1 && complete(g) && unchanged(g, old), counts());
    } else if (scenario === 'persistent') {
      const g = boot(), old = snapshot(g); await settle(); g._ensurePlayerTP(); await settle(); await ensures(g);
      row('P1', manifestCalls === 2 && targetLoads === 0 && warnings.length === 2 && unchanged(g, old), counts());
      const beforeRearm = manifestCalls;
      mode = 'ok'; g.playerGloveId = null; g._ensurePlayerTP(); await settle(); g.playerGloveId = 'luvas-brasil'; g._ensurePlayerTP(); await settle(); g._ensurePlayerTP(); await settle();
      row('P2', manifestCalls === beforeRearm + 1 && targetLoads === 1 && complete(g) && unchanged(g, old), { beforeRearm, ...counts() });
      g.playerGloveId = 'luvas-brasil-de-rua'; g._ensurePlayerTP(); await settle(); g._ensurePlayerTP(); await settle();
      row('P3', complete(g, 'luvas-brasil-de-rua') && unchanged(g, old) && manifestCalls === beforeRearm + 1 && targetLoads === 1, counts());
    } else if (scenario === 'rearm-style' || scenario === 'rearm-origin') {
      const g = boot(); await settle(); g._ensurePlayerTP(); await settle(); await ensures(g);
      mode = 'third-http';
      if (scenario === 'rearm-style') g.playerGloveId = 'luvas-brasil-de-rua';
      else { g._switchTeam('capitao'); if (g.playerCharId !== 'capitao') throw Error('INFRA: real origin switch not reached'); }
      g._ensurePlayerTP(); const old = snapshot(g); await settle();
      g._ensurePlayerTP(); await settle(); g._ensurePlayerTP(); await settle();
      row(scenario === 'rearm-style' ? 'E1' : 'E2', manifestCalls === 4 && targetLoads === 1
        && complete(g, scenario === 'rearm-style' ? 'luvas-brasil-de-rua' : 'luvas-brasil') && unchanged(g, old), counts());
    } else if (scenario === 'concurrent') {
      mode = 'http'; const a = boot(), b = boot(), oldA = snapshot(a), oldB = snapshot(b);
      const preview = G.preloadGloveAssets(['barbudo']).catch(e => {
        if (!(e instanceof G.GloveManifestUnavailable)) throw e; e.warn();
      }); await turn();
      row('C1', manifestCalls === 1 && targetLoads === 0, counts()); firstHold.release(); await preview; await settle();
      mode = 'ok'; a._ensurePlayerTP(); b._ensurePlayerTP(); const preview2 = G.preloadGloveAssets(['barbudo']); await turn(); secondHold.release(); await preview2; await settle();
      a._ensurePlayerTP(); b._ensurePlayerTP(); await settle();
      row('C2', manifestCalls === 2 && targetLoads === 1 && warnings.length === 1
        && complete(a) && complete(b) && unchanged(a, oldA) && unchanged(b, oldB), counts());
    } else if (scenario.startsWith('negative-')) {
      const g = boot(), old = snapshot(g); await settle(); await ensures(g);
      g.playerGloveId = null; g._ensurePlayerTP(); g.playerGloveId = 'luvas-brasil'; g._ensurePlayerTP(); await settle();
      g.playerGloveId = 'luvas-brasil-de-rua'; g._ensurePlayerTP(); await settle(); await G.preloadGloveAssets(['barbudo']); await settle();
      row(scenario === 'negative-package' ? 'N1' : 'N2', manifestCalls === 1 && targetLoads === (scenario === 'negative-package' ? 0 : 1)
        && gloves(g).length === 0 && unchanged(g, old), counts());
    } else if (scenario === 'stale') {
      const g = boot(), old = snapshot(g); await turn(); firstHold.release(); await settle();
      if (!delayedError || !releaseOld) { row('ST1', false, { reason: 'manifest failure swallowed; no real rejection to delay', ...counts() }); row('ST2', false, counts()); }
      else {
        g.playerGloveId = 'luvas-brasil-de-rua'; g._ensurePlayerTP(); await turn();
        g.playerGloveId = 'luvas-brasil'; g._ensurePlayerTP(); await turn();
        const before = tapCalls; releaseOld(); releaseOld = null; await turn(); g._ensurePlayerTP(); await turn();
        row('ST1', tapCalls === before && manifestCalls === 2, { before, ...counts() });
        mode = 'ok'; secondHold.release(); await settle(); g._ensurePlayerTP(); await settle();
        row('ST2', complete(g) && unchanged(g, old) && manifestCalls === 2 && targetLoads === 1, counts());
      }
    }
    if (!same(result.rows.map(r => r.id), CASES[scenario])) throw Error('INFRA: row denominator/order');
    if (!same(pins(productFiles(config)), result.sources)) throw Error('INFRA: source drift');
    result.counts = counts(); result.status = result.rows.every(r => r.ok) ? 'GREEN' : 'RED';
  } catch (e) { result.status = 'INFRA'; result.error = String(e.stack || e); result.warnings = warnings.slice(-8); result.loaderErrors = errors.slice(-3); }
  finally {
    firstHold?.release(); secondHold?.release(); releaseOld?.();
    for (const g of games) { try { g.dispose(); } catch {} }
    cleanup.forEach(fn => fn()); delete globalThis.__gloveRetryTap; console.warn = warn0; clearTimeout(deadline);
    if (temp) fs.rmSync(temp, { recursive: true, force: true });
  }
  result.checkerSha256 = CHECKER_HASH;
  console.log(PREFIX + JSON.stringify(result)); process.exit(result.status === 'INFRA' ? 3 : result.status === 'GREEN' ? 0 : 1);
}

const args = process.argv.slice(2), internal = process.env.COROSOLTO_GLOVE_RETRY_WORKER;
if (internal || args.includes('--worker')) {
  let c; try { c = JSON.parse(internal); } catch { console.error('internal entry invalid'); process.exit(2); }
  if (!same(args, ['--worker']) || !/^[a-f0-9-]{36}$/.test(c?.nonce || '') || !Object.hasOwn(CASES, c?.scenario)
    || (c.mutant && !Object.hasOwn(MUTANTS, c.mutant))) { console.error('internal entry invalid'); process.exit(2); }
  await worker(c);
}
const config = { sourceRoot: path.resolve(path.dirname(SELF), '../..'), productCopy: '', scenario: 'all', mutant: '', json: '', artifacts: '' };
const seen = new Set();
for (const arg of args) {
  const match = /^--(source-root|product-copy|case|mutante|json|artifacts)=(.+)$/.exec(arg);
  if (!match || seen.has(match[1])) { console.error('CLI invalid'); process.exit(2); }
  seen.add(match[1]); const [, key, value] = match;
  if (['source-root', 'product-copy', 'json', 'artifacts'].includes(key) && !path.isAbsolute(value)) { console.error('absolute path required'); process.exit(2); }
  if (key === 'case' && value !== 'all' && !Object.hasOwn(CASES, value)) { console.error('unknown case'); process.exit(2); }
  if (key === 'mutante' && !Object.hasOwn(MUTANTS, value)) { console.error('unknown mutant'); process.exit(2); }
  config[{ 'source-root': 'sourceRoot', 'product-copy': 'productCopy', case: 'scenario', mutante: 'mutant' }[key] || key] = value;
}
if (config.mutant && config.scenario !== 'all') { console.error('mutant owns a fixed focal case set'); process.exit(2); }
config.artifacts ||= fs.mkdtempSync(path.join(os.tmpdir(), 'glove-manifest-receipts-'));
fs.mkdirSync(config.artifacts, { recursive: true });
const report = { version: 1, at: new Date().toISOString(), checkerSha256: CHECKER_HASH, config, runs: [], status: 'INFRA' };
try {
  report.sources = pins(productFiles(config));
  const selected = config.mutant ? MUTANTS[config.mutant].cases : config.scenario === 'all' ? Object.keys(CASES) : [config.scenario];
  const run = mutant => {
    const failed = [];
    for (const scenario of selected) {
      const nonce = randomUUID(), child = { ...config, scenario, mutant, nonce };
      const p = spawnSync(process.execPath, [SELF, '--worker'], { encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env, PATH: path.dirname(process.execPath) + path.delimiter + process.env.PATH, COROSOLTO_GLOVE_RETRY_WORKER: JSON.stringify(child) } });
      const stem = path.join(config.artifacts, `${scenario}-${mutant || 'nominal'}-${nonce}`);
      fs.writeFileSync(stem + '.stdout.log', p.stdout || ''); fs.writeFileSync(stem + '.stderr.log', p.stderr || '');
      const lines = (p.stdout || '').split('\n').filter(l => l.startsWith(PREFIX));
      if (p.error || p.signal || lines.length !== 1) throw Error(`INFRA: child ${scenario} missing receipt (${p.status}/${p.signal})`);
      const data = JSON.parse(lines[0].slice(PREFIX.length));
      if (data.status === 'INFRA') throw Error(data.error);
      if (data.version !== 1 || data.checkerSha256 !== CHECKER_HASH || data.nonce !== nonce || data.scenario !== scenario || data.mutant !== mutant || !same(data.sources, report.sources)
        || !same(data.rows.map(r => r.id), CASES[scenario]) || data.rows.some(r => typeof r.ok !== 'boolean')) throw Error('INFRA: child protocol/source');
      const red = data.rows.filter(r => !r.ok).map(r => scenario + '/' + r.id);
      if (p.status !== (red.length ? 1 : 0) || data.status !== (red.length ? 'RED' : 'GREEN')) throw Error('INFRA: exit contradicts rows');
      report.runs.push({ ...data, stdout: stem + '.stdout.log', stderr: stem + '.stderr.log' }); failed.push(...red);
    }
    return failed;
  };
  const nominal = run('');
  if (nominal.length) { report.status = config.mutant ? 'INFRA' : 'RED'; report.failed = nominal; if (config.mutant) report.error = 'nominal red, no mutation credit'; }
  else if (config.mutant) { report.failed = run(config.mutant); report.expected = MUTANTS[config.mutant].failed;
    report.status = same([...report.failed].sort(), [...report.expected].sort()) ? 'DETECTED' : 'RED'; }
  else report.status = 'GREEN';
  if (!same(pins(productFiles(config)), report.sources)) throw Error('INFRA: source changed');
  if (hash(fs.readFileSync(SELF)) !== CHECKER_HASH) throw Error('INFRA: checker changed during measurement');
} catch (e) { report.status = 'INFRA'; report.error = String(e.stack || e); }
try { if (config.json) fs.writeFileSync(config.json, JSON.stringify(report, null, 2) + '\n'); }
catch (e) { report.status = 'INFRA'; report.error = 'receipt write: ' + e; }
console.log(JSON.stringify({ status: report.status, failed: report.failed || [], expected: report.expected, runs: report.runs.length, error: report.error, artifacts: config.artifacts }));
process.exit(report.status === 'INFRA' ? 3 : ['GREEN', 'DETECTED'].includes(report.status) ? 0 : 1);
