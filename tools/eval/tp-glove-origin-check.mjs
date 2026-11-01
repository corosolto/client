/* R780: origem base/Drip compartilha charId; char-only escolhe a primeira variante.
   Game/GLTF reais em CPU e candidato da fábrica somente em memória. Não mede arte/fit/MP.
   Antes da API existir: FEATURE_ABSENT/RED explícito, demais casos UNRUN, nunca INFRA-kill. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url), ROOT = path.resolve(path.dirname(SELF), '../..');
const PREFIX = 'TP-ORIGIN/1 ', INTERNAL = '--origin-worker-internal';
const CASES = { contract: 'O1', 'base-first': 'O2', 'drip-first': 'O3', 'live-body': 'O4', race: 'O5', missing: 'O6', mismatch: 'O7', duplicate: 'O8' };
const INPUTS = ['public/js/glbchars.js', 'public/js/game.js', 'public/js/main.js', 'public/js/data/assetver.js',
  'public/data/gloves-manifest.json', 'public/models/skins/manifest.json', 'tools/character-kit/gloves/core.mjs',
  'tools/character-kit/gloves/repository.mjs', 'tools/character-kit/gloves/cosmetic-selections.json',
  'tools/eval/tp-glove-origin-check.mjs'];
const sha = b => createHash('sha256').update(b).digest('hex');
const sources = () => Object.fromEntries(INPUTS.map(f => [f, sha(fs.readFileSync(path.join(ROOT, f)))]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const must = (ok, why) => { if (!ok) throw Error(why); };
const clone = v => JSON.parse(JSON.stringify(v));
const pathname = u => new URL(String(u), 'http://fixture/').pathname;

async function worker(fixture) {
  const out = { schema: 'tp-origin/1', fixture, sources: sources(), rows: [], loaded: [], mode: 'FULL', status: 'INFRA' };
  const games = [], tasks = [], parts = new Map(), calls = new Map(), released = new Set(), gates = new Map();
  let manifestCalls = 0;
  const holding = ['base-first', 'drip-first', 'live-body', 'race'].includes(fixture);
  const release = url => { released.add(url); for (const resolve of gates.get(url) || []) resolve(); };
  const releaseAll = () => { for (const url of gates.keys()) release(url); };
  const check = (ok, detail) => out.rows.push({ id: CASES[fixture], ok: Boolean(ok), detail });
  const deadline = setTimeout(() => { console.error('origin worker deadline'); process.exit(3); }, 45000);
  try {
    const input = JSON.parse(fs.readFileSync(0, 'utf8'));
    must(input.nonce === process.env.CSBR_ORIGIN_NONCE && same(input.sources, out.sources), 'input identity/source drift');
    out.nonce = input.nonce;
    const candidate = Buffer.from(input.candidate.base64, 'base64');
    must(sha(candidate) === input.candidate.sha256, 'candidate transport digest mismatch');
    out.factory = { manifestSha256: sha(Buffer.from(JSON.stringify(input.manifest))), candidateSha256: sha(candidate), candidatePath: input.candidate.path };
    const manifest = clone(input.manifest);
    const dripPack = manifest.packages.find(p => p.sourceVariants?.some(v => v.id === 'bolsonaro-drip'));
    must(dripPack?.perspective === '3p', 'actual factory Drip pack missing');
    const dripVariant = dripPack.sourceVariants.find(v => v.id === 'bolsonaro-drip');
    const baseMatches = manifest.packages.filter(p => p.perspective === '3p').flatMap(p => p.sourceVariants
      .filter(v => v.source?.path === 'public/models/characters/capitao.glb' && v.characterIds.includes('capitao')).map(v => ({ p, v })));
    must(baseMatches.length === 1, 'actual BASE pack not unique');
    const baseURL = '/' + baseMatches[0].v.mesh.path.replace(/^public\//, '');
    const dripURL = '/' + input.candidate.path.replace(/^public\//, '');
    if (fixture === 'drip-first') manifest.packages.reverse();
    if (fixture === 'missing') manifest.packages = manifest.packages.filter(p => p !== dripPack);
    if (fixture === 'mismatch') {
      const digest = dripVariant.source.sha256;
      dripVariant.source.sha256 = digest.slice(0, -1) + (digest.endsWith('0') ? '1' : '0');
    }
    if (fixture === 'duplicate') manifest.packages.push(clone(dripPack));
    const file = u => path.join(ROOT, 'public', pathname(u).replace(/^\//, ''));
    const localFetch = async u => {
      if (pathname(u) === '/data/gloves-manifest.json') { manifestCalls++; return new Response(JSON.stringify(manifest)); }
      return fs.existsSync(file(u)) ? new Response(fs.readFileSync(file(u))) : new Response('', { status: 404 });
    };
    Object.defineProperty(globalThis, 'fetch', { configurable: true, get: () => localFetch, set() {} });
    const H = await import('./harness.mjs');
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: localFetch });
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    GLTFLoader.prototype.load = function (url, done, progress, fail) {
      const name = pathname(url), glove = name.startsWith('/models/gloves/3p/');
      if (glove) calls.set(name, (calls.get(name) || 0) + 1);
      const record = { name, promise: null };
      record.promise = Promise.resolve().then(async () => {
        const bytes = name === dripURL ? candidate : fs.readFileSync(file(url));
        const loader = new GLTFLoader();
        loader.register(() => ({ name: 'EXT_texture_webp', async loadTexture() {
          const texture = new H.THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); texture.needsUpdate = true; return texture;
        } }));
        const g = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
        if (glove) {
          const set = []; g.scene.traverse(o => { if (o.isSkinnedMesh) set.push(o); });
          if (!parts.has(name)) parts.set(name, []); parts.get(name).push(set);
          if (holding && !released.has(name)) await new Promise(resolve => {
            if (!gates.has(name)) gates.set(name, new Set()); gates.get(name).add(resolve);
          });
        }
        out.loaded.push({ url: String(url), bytes: bytes.length, sha256: sha(bytes) }); done(g);
      }).catch(e => { fail?.(e); });
      tasks.push(record);
    };
    const settle = async () => {
      // Missing dispatch is measured as false; never wait on an expected-but-absent URL.
      for (let i = 0; i < 4; i++) {
        await Promise.all(tasks.filter(t => !holding || !t.name.startsWith('/models/gloves/3p/') || released.has(t.name)).map(t => t.promise));
        await new Promise(r => setImmediate(r));
      }
    };
    const G = await import('../../public/js/glbchars.js');
    const actual = await import('../../public/js/game.js');
    const api = typeof G.getGloveHandle === 'function';
    const beforeBody = api ? G.getGloveHandle('capitao') : null;
    await G.preloadCharacterAssets(['barbudo'], { weapons: ['pistol'] });
    if (!['missing', 'mismatch', 'duplicate'].includes(fixture)) await G.preloadCharacterAssets(['capitao'], { weapons: ['pistol'] });
    if (fixture !== 'live-body') await G.preloadCosmeticAssets(['bolsonaro-drip']);
    must(G.hasModel('barbudo') && (['missing', 'mismatch', 'duplicate'].includes(fixture) || G.hasModel('capitao')), 'actual base bodies not available');
    must(fixture === 'live-body' || G.hasModel('capitao', 'bolsonaro-drip'), 'actual cosmetic body not available');
    const boot = (skin, glove = 'luvas-brasil') => {
      H.seedRandom(12345);
      const game = new actual.Game({ renderer: H.renderer, textures: H.initTextures(), sfx: H.sfx,
        settings: { bots: 1, allyBots: 0, enemyBots: 1, quality: 'low', difficulty: 'normal', sens: 1 },
        playerCharId: 'capitao', playerSkinId: skin, playerGloveId: glove, playerTeam: 'B', playerFaction: 'B', enemyFaction: 'E',
        nickname: 'SIM', mapId: 'posto_treta', ctf: false, testMode: true,
        matchRoster: { allyDefs: [], enemyDefs: [H.CHARACTERS.find(c => c.id === 'barbudo')] }, matchWeapons: ['pistol'], onQuit() {}, onMatchEnd() {} });
      games.push(game); game._ensureDolly = () => {}; game.killsToWin = Infinity; game.start(); game.state = 'live'; game.setCamView('third'); return game;
    };
    const gloves = tp => { const result = []; tp.group.traverse(o => { if (o.name === 'luvas-3p') result.push(o); }); return result; };
    const body = tp => { let found; tp.group.traverse(o => { if (!found && o.isSkinnedMesh && o.name !== 'luvas-3p') found = o; }); return found; };
    const complete = (tp, url) => {
      const attached = gloves(tp), b = body(tp);
      return attached.length === 2 && (parts.get(url) || []).some(set => set.length === 2 && new Set(set.map(o => o.geometry)).size === 2
        && set.every(template => attached.filter(o => o.geometry === template.geometry).length === 1)
        && attached.every(o => o.parent === b?.parent && o.skeleton.bones.every(bone => b.skeleton.bones.includes(bone))
          && set.some(t => t.geometry === o.geometry && t.bindMode === o.bindMode && t.bindMatrix.equals(o.bindMatrix)
            && t.skeleton.boneInverses.length === o.skeleton.boneInverses.length
            && t.skeleton.boneInverses.every((m, i) => m.equals(o.skeleton.boneInverses[i])))));
    };
    const count = url => calls.get(url) || 0, total = () => [...calls.values()].reduce((a, b) => a + b, 0);
    const stable = game => { const tp = game.playerTP, ctrl = tp.ctrl, mixer = tp.mixer; for (let i = 0; i < 20; i++) game._ensurePlayerTP(); return game.playerTP === tp && tp.ctrl === ctrl && tp.mixer === mixer; };
    if (!api) {
      const base = G.hasModel('capitao') ? boot(null, null) : null, drip = boot('bolsonaro-drip', null);
      must(drip.playerTP?.isGLB && drip.playerTP.skinId === 'bolsonaro-drip' && (!base || base.playerTP?.isGLB), 'real Game/body fixture did not load');
      out.mode = 'FEATURE_ABSENT';
      check(false, { reason: 'getGloveHandle is absent from successfully imported runtime namespace', moduleImported: true,
        realGames: { base: base?.playerTP.isGLB ?? false, drip: drip.playerTP.isGLB }, joints: { base: base ? body(base.playerTP).skeleton.bones.length : null, drip: body(drip.playerTP).skeleton.bones.length } });
    } else if (fixture === 'contract') {
      const base = G.getGloveHandle('capitao'), drip = G.getGloveHandle('capitao', 'bolsonaro-drip');
      const shape = h => h && Object.isFrozen(h) && typeof h.key === 'string' && !!h.key && typeof h.preload === 'function'
        && typeof h.ready === 'boolean' && typeof Object.getOwnPropertyDescriptor(h, 'ready')?.get === 'function';
      const cold = shape(base) && shape(drip) && base.key !== drip.key && !base.ready && !drip.ready;
      if (base && drip) await Promise.all([base.preload(), drip.preload()]); await settle();
      check(beforeBody === null && cold && base?.ready && drip?.ready && G.hasGloveModel('capitao')
        && G.getGloveHandle('capitao', 'missing-skin')?.key === base.key, { beforeBody, cold, baseReady: base?.ready, dripReady: drip?.ready });
    } else if (fixture === 'base-first' || fixture === 'drip-first') {
      const order = fixture === 'base-first' ? [null, 'bolsonaro-drip'] : ['bolsonaro-drip', null];
      const actors = order.map(skin => boot(skin)); await settle();
      const pending = { base: count(baseURL), drip: count(dripURL) }; release(baseURL); release(dripURL); await settle();
      actors.forEach(g => g._ensurePlayerTP());
      const cold = actors.every((g, i) => complete(g.playerTP, order[i] ? dripURL : baseURL));
      const before = total(), hot = order.map(skin => boot(skin)); await settle();
      check(pending.base === 1 && pending.drip === 1 && cold && hot.every((g, i) => complete(g.playerTP, order[i] ? dripURL : baseURL) && stable(g))
        && total() === before, { pending, cold, hotParts: hot.map(g => gloves(g.playerTP).length), counts: [...calls] });
    } else if (fixture === 'live-body') {
      const old = boot('bolsonaro-drip'), tp = old.playerTP, ctrl = tp.ctrl, mixer = tp.mixer;
      must(!tp.skinId && tp.isGLB, 'actual base fallback was not reached'); await settle();
      const key = tp.gloveHandle?.key; await G.preloadCosmeticAssets(['bolsonaro-drip']); const fresh = boot('bolsonaro-drip'); await settle();
      release(dripURL); await settle(); old._ensurePlayerTP();
      const heldBase = old.playerTP === tp && gloves(tp).length === 0;
      release(baseURL); await settle(); old._ensurePlayerTP(); fresh._ensurePlayerTP();
      check(heldBase && old.playerTP === tp && tp.ctrl === ctrl && tp.mixer === mixer && tp.gloveHandle?.key === key && !!key
        && fresh.playerTP.gloveHandle?.key !== key && complete(tp, baseURL) && complete(fresh.playerTP, dripURL) && stable(old),
      { heldBase, key, freshKey: fresh.playerTP.gloveHandle?.key, oldParts: gloves(tp).length, freshParts: gloves(fresh.playerTP).length, counts: [...calls] });
    } else if (fixture === 'race') {
      const base = G.getGloveHandle('capitao'), drip = G.getGloveHandle('capitao', 'bolsonaro-drip');
      const requests = [base.preload(), base.preload(), drip.preload(), drip.preload()];
      const g = boot(null); const def = g.playerDef;
      g.playerDef = { ...def, skinId: 'bolsonaro-drip' }; g._ensurePlayerTP();
      g.playerDef = { ...def, skinId: null }; g._ensurePlayerTP(); const tp = g.playerTP, ctrl = tp.ctrl, mixer = tp.mixer; await settle();
      release(dripURL); await settle(); g._ensurePlayerTP(); const noLateB = g.playerTP === tp && gloves(tp).length === 0;
      release(baseURL); await Promise.all(requests); await settle(); g._ensurePlayerTP();
      check(count(baseURL) === 1 && count(dripURL) === 1 && total() === 2 && noLateB && g.playerTP === tp && tp.ctrl === ctrl && tp.mixer === mixer
        && complete(tp, baseURL) && tp.gloveHandle?.key === base.key && base.key !== drip.key && stable(g), { noLateB, counts: [...calls], attached: gloves(tp).length });
    } else {
      const g = boot('bolsonaro-drip'); await settle();
      const handle = g.playerTP.gloveHandle, before = manifestCalls;
      if (handle) await Promise.all([handle.preload(), handle.preload()]); await settle();
      check(!!handle && Object.isFrozen(handle) && handle.ready === false && manifestCalls === 1 && before === 1 && total() === 0
        && gloves(g.playerTP).length === 0 && stable(g), { policy: fixture, manifestCalls, counts: [...calls], ready: handle?.ready, attached: gloves(g.playerTP).length });
    }
    must(same(sources(), out.sources), 'sources changed in worker');
    out.status = out.rows.every(r => r.ok) ? 'GREEN' : 'RED';
  } catch (e) { out.status = 'INFRA'; out.error = String(e.stack || e); }
  finally {
    releaseAll(); for (const g of games) g.dispose(); clearTimeout(deadline);
  }
  console.log(PREFIX + JSON.stringify(out)); process.exit(out.status === 'INFRA' ? 3 : out.status === 'GREEN' ? 0 : 1);
}

const args = process.argv.slice(2), hasWorkerEnv = ['CSBR_ORIGIN_CASE', 'CSBR_ORIGIN_NONCE'].some(k => Object.hasOwn(process.env, k));
if (hasWorkerEnv || args.includes(INTERNAL)) {
  if (!same(args, [INTERNAL]) || !Object.hasOwn(CASES, process.env.CSBR_ORIGIN_CASE) || !/^[a-f0-9-]{36}$/.test(process.env.CSBR_ORIGIN_NONCE || '')) process.exit(2);
  await worker(process.env.CSBR_ORIGIN_CASE);
}
let output;
for (const arg of args) {
  if (!output && arg.startsWith('--json=') && path.isAbsolute(arg.slice(7))) output = arg.slice(7);
  else { console.error('CLI inválida; use --json=/caminho/absoluto'); process.exit(2); }
}
const report = { schema: 'tp-origin/1', at: new Date().toISOString(), node: process.version, sources: sources(), runs: [], unrun: [],
  scope: 'actual Game/GLTF CPU; actual factory candidate in memory; no raster/fit/MP/mobile or production byte-hash certification' };
try {
  must(process.versions.node.split('.')[0] === '22', 'Node22 required for comparable gate');
  const { buildRepositoryArtifacts } = await import('../character-kit/gloves/repository.mjs');
  const built = buildRepositoryArtifacts(ROOT, { includeCosmetics: true });
  const variants = built.manifest.packages.filter(p => p.perspective === '3p').flatMap(p => p.sourceVariants.filter(v => v.id === 'bolsonaro-drip'));
  must(variants.length === 1, 'factory Drip candidate not unique');
  const relative = variants[0].mesh.path, bytes = built.artifacts.get(relative);
  must(bytes && sha(bytes) === variants[0].mesh.sha256, 'factory bytes/manifest mismatch');
  report.factory = { candidatePath: relative, candidateSha256: sha(bytes), candidateBytes: bytes.length, manifestSha256: sha(Buffer.from(JSON.stringify(built.manifest))) };
  for (const [fixture, id] of Object.entries(CASES)) {
    const nonce = randomUUID();
    const p = spawnSync(process.execPath, [SELF, INTERNAL], { encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024,
      input: JSON.stringify({ nonce, sources: report.sources, manifest: built.manifest, candidate: { path: relative, sha256: sha(bytes), base64: bytes.toString('base64') } }),
      env: { ...process.env, CSBR_ORIGIN_CASE: fixture, CSBR_ORIGIN_NONCE: nonce } });
    const lines = (p.stdout || '').split('\n').filter(l => l.startsWith(PREFIX));
    must(!p.error && !p.signal && lines.length === 1, `${fixture}: invalid child/unique receipt (${p.status}/${p.signal}) ${p.stderr?.slice(-700)}`);
    const data = JSON.parse(lines[0].slice(PREFIX.length));
    must(data.status !== 'INFRA', `${fixture}: ${data.error}`);
    must(data.schema === report.schema && data.fixture === fixture && data.nonce === nonce && ['FULL', 'FEATURE_ABSENT'].includes(data.mode) && same(data.sources, report.sources)
      && same(data.factory, { manifestSha256: report.factory.manifestSha256, candidateSha256: report.factory.candidateSha256, candidatePath: report.factory.candidatePath })
      && Array.isArray(data.rows) && same(data.rows.map(r => r.id), [id]) && typeof data.rows[0].ok === 'boolean', `${fixture}: source/factory/row protocol mismatch`);
    const red = data.rows.some(r => !r.ok);
    must(p.status === (red ? 1 : 0) && data.status === (red ? 'RED' : 'GREEN'), `${fixture}: exit/semantic contradiction`);
    report.runs.push(data);
    if (data.mode === 'FEATURE_ABSENT') {
      must(fixture === 'contract' && red, 'feature-absent mode cannot satisfy other fixtures');
      report.mode = 'FEATURE_ABSENT'; report.unrun = Object.keys(CASES).filter(f => f !== fixture); break;
    }
  }
  must(same(sources(), report.sources), 'source changes during run');
  report.failed = report.runs.flatMap(r => r.rows.filter(x => !x.ok).map(x => x.id));
  report.status = report.failed.length ? 'RED' : 'GREEN';
  must(report.status !== 'GREEN' || report.runs.length === Object.keys(CASES).length, 'partial proof cannot be GREEN');
} catch (e) { report.status = 'INFRA'; report.error = String(e.stack || e); }
if (output) {
  try { fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); }
  catch (e) { report.status = 'INFRA'; report.error = `receipt write: ${e.message}`; }
}
console.log(JSON.stringify({ status: report.status, mode: report.mode || 'FULL', failed: report.failed || [], cases: report.runs.length, unrun: report.unrun, error: report.error }));
process.exit(report.status === 'INFRA' ? 3 : report.status === 'GREEN' ? 0 : 1);
