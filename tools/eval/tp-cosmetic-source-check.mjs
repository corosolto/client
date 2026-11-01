import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '../..');
const PREFIX = 'TP-COSMETIC/1 ';
const CASES = { cosmetic: ['K1', 'K2', 'K3', 'K4'], fallback: ['K5'], 'missing-source': ['K6'], 'wrong-source': ['K7'],
  'wrong-path': ['K8'], 'wrong-family': ['K9'], 'skin-fallback': ['K10', 'K11'], 'cosmetic-wrong-sha': ['K12'] };
const MUTANTS = {
  'glove-availability': { from: 'return _base.has(id) || _skins.get(skinId)?.character === id;', to: 'return _base.has(id);', failed: ['K1'] },
  'glove-source-bypass': { from: 'if (!estilo || !templates || !matches) return null;', to: 'if (!estilo || !templates) return null;', failed: ['K2', 'K3', 'K6', 'K7', 'K8', 'K9', 'K12'] },
  'glove-origin-live': { from: 'attachGloves(model, def.id, id, bodyOrigin)', to: 'attachGloves(model, def.id, id, _bodyOrigins.get(_skins.get(def.skinId)?.model || _base.get(def.id)))', failed: ['K5'] },
  'glove-source-path': { from: 'origin?.character === charId && source?.path === origin.path', to: 'origin?.character === charId && Boolean(source)', failed: ['K8'] },
  'glove-source-base-sha': { from: 'source.sha256.startsWith(origin.revision)', to: 'true', failed: ['K7'] },
  'glove-source-cosmetic-sha': { from: 'source.sha256 === origin.sha256', to: 'true', failed: ['K12'] },
  'glove-source-family': { from: " && source.skeletonFamilySha256 === family", to: '', failed: ['K9'] },
};
const sha = b => createHash('sha256').update(b).digest('hex');
const INPUTS = ['public/js/game.js', 'public/js/glbchars.js', 'public/js/data/assetver.js', 'public/data/gloves-manifest.json', 'public/models/skins/manifest.json'];
const sources = () => Object.fromEntries(INPUTS.map(f => [f, sha(fs.readFileSync(path.join(ROOT, f)))]));
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function mutate(source, mutant) {
  const m = MUTANTS[mutant];
  if (source.split(m.from).length !== 2) throw Error(`${mutant}: exige uma única âncora`);
  return source.replace(m.from, m.to);
}

async function worker(fixture, mutant) {
  const out = { schema: 'tp-cosmetic/1', fixture, mutant, sources: null, applied: null, rows: [], loaded: [] };
  const games = [], tasks = [], targetParts = [];
  let tmp;
  let release = () => {}, calls = 0;
  const deadline = setTimeout(() => { console.error('Cosmetic fixture deadline'); process.exit(3); }, 45000);
  try {
    out.sources = sources();
    const file = u => path.join(ROOT, 'public', new URL(String(u), 'http://fixture/').pathname);
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/gloves-manifest.json'), 'utf8'));
    const variants = manifest.packages.filter(p => p.perspective === '3p').flatMap(p => p.sourceVariants
      .filter(v => v.characterIds.includes('capitao')).map(v => ({ pack: p, variant: v })));
    if (variants.length !== 1) throw Error('Capitão precisa de exatamente um pacote base nesta prova');
    const { pack, variant } = variants[0];
    const target = `/models/gloves/3p/${variant.id}-${pack.skeletonFamily.fingerprintSha256.slice(0, 12)}.glb`;
    const localFetch = async u => {
      if (!fs.existsSync(file(u))) return new Response('', { status: 404 });
      if (file(u).endsWith('/data/gloves-manifest.json') && ['missing-source', 'wrong-source', 'wrong-path', 'wrong-family', 'cosmetic-wrong-sha'].includes(fixture)) {
        const data = JSON.parse(fs.readFileSync(file(u), 'utf8'));
        for (const p of data.packages) for (const v of p.sourceVariants || []) if (v.characterIds.includes('capitao')) {
          if (fixture === 'missing-source') delete v.source;
          else if (fixture === 'wrong-source') v.source.sha256 = '0'.repeat(64);
          else if (fixture === 'wrong-path') v.source.path = 'public/models/characters/barbudo.glb';
          else if (fixture === 'wrong-family') v.source.skeletonFamilySha256 = '0'.repeat(64);
          else v.source.path = `public${JSON.parse(fs.readFileSync(path.join(ROOT, 'public/models/skins/manifest.json'), 'utf8')).skins['bolsonaro-drip'].model}`;
        }
        return new Response(JSON.stringify(data));
      }
      return new Response(fs.readFileSync(file(u)));
    };
    Object.defineProperty(globalThis, 'fetch', { configurable: true, get: () => localFetch, set() {} });
    const H = await import('./harness.mjs');
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: localFetch });
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const held = new Promise(r => { release = r; });
    GLTFLoader.prototype.load = function (u, done, progress, fail) {
      const isTarget = new URL(String(u), 'http://fixture/').pathname === target;
      if (isTarget) calls++;
      const loader = new GLTFLoader();
      loader.register(() => ({ name: 'EXT_texture_webp', async loadTexture() {
        const t = new H.THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true; return t;
      } }));
      tasks.push(Promise.resolve().then(async () => {
        const b = fs.readFileSync(file(u));
        const g = await loader.parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
        if (isTarget) {
          const parts = []; g.scene.traverse(o => { if (o.isSkinnedMesh) parts.push(o); });
          if (parts.length !== 2) throw Error('Pacote base Capitão sem as duas partes reais');
          targetParts.push(parts); await held;
        }
        out.loaded.push({ url: String(u), bytes: b.length, sha256: sha(b) }); done(g);
      }).catch(e => fail?.(e)));
    };
    let G, actual;
    if (mutant) {
      const js = path.join(ROOT, 'public/js'), gs = mutate(fs.readFileSync(path.join(js, 'glbchars.js'), 'utf8'), mutant);
      const absoluteImports = s => s.replace(/(from\s*['"]|import\s*\(\s*['"])(\.[^'"]+)(['"])/g,
        (_, a, spec, z) => a + new URL(spec, pathToFileURL(path.join(js, 'module.js'))).href + z);
      tmp = fs.mkdtempSync(path.join(ROOT, 'node_modules', '.tp-cosmetic-'));
      const gf = path.join(tmp, 'glbchars.mjs'), game = path.join(tmp, 'game.mjs');
      fs.writeFileSync(gf, absoluteImports(gs));
      const gameSource = fs.readFileSync(path.join(js, 'game.js'), 'utf8');
      if (gameSource.split("'./glbchars.js'").length !== 2) throw Error('Game exige um único import glbchars');
      fs.writeFileSync(game, absoluteImports(gameSource.replace("'./glbchars.js'", `'${pathToFileURL(gf).href}'`)));
      out.applied = { mutant, rawSha256: sha(gs), moduleSha256: sha(fs.readFileSync(gf)) };
      G = await import(pathToFileURL(gf).href); actual = await import(pathToFileURL(game).href);
    } else {
      G = await import('../../public/js/glbchars.js'); actual = await import('../../public/js/game.js');
    }
    const meshes = tp => { const result = []; tp.group.traverse(o => { if (o.name === 'luvas-3p') result.push(o); }); return result; };
    const complete = tp => {
      const parts = meshes(tp);
      return parts.length === 2 && targetParts.some(set => set.every(p => parts.filter(o => o.geometry === p.geometry).length === 1));
    };
    const flush = async () => { for (let i = 0; i < 32; i++) await Promise.resolve(); await new Promise(r => setImmediate(r)); };
    const drain = async () => { await Promise.all(tasks); await flush(); };
    const boot = skin => {
      H.seedRandom(12345);
      const g = new actual.Game({ renderer: H.renderer, textures: H.initTextures(), sfx: H.sfx,
        settings: { bots: 1, allyBots: 0, enemyBots: 1, quality: 'low', difficulty: 'normal', sens: 1 },
        playerCharId: 'capitao', playerSkinId: skin, playerGloveId: 'luvas-brasil', playerTeam: 'B', playerFaction: 'B',
        enemyFaction: 'E', nickname: 'SIM', mapId: 'posto_treta', ctf: false, testMode: true,
        matchRoster: { allyDefs: [], enemyDefs: [H.CHARACTERS.find(c => c.id === 'barbudo')] }, matchWeapons: ['pistol'], onQuit() {}, onMatchEnd() {} });
      games.push(g); g._ensureDolly = () => {}; g.killsToWin = Infinity; g.start(); g.state = 'live'; g.setCamView('third'); return g;
    };
    const stable = g => { const tp = g.playerTP; for (let i = 0; i < 20; i++) g._ensurePlayerTP(); return g.playerTP === tp; };
    const check = (id, ok, detail) => out.rows.push({ id, ok: Boolean(ok), detail });
    await G.preloadCharacterAssets(['barbudo'], { weapons: ['pistol'] });
    if (fixture === 'cosmetic') {
      await G.preloadCosmeticAssets(['bolsonaro-drip']);
      const g = boot('bolsonaro-drip'), tp = g.playerTP, ctrl = tp.ctrl, mixer = tp.mixer;
      if (G.hasModel('capitao') || !tp.isGLB || tp.skinId !== 'bolsonaro-drip') throw Error('Pré-condição cosmetic-only não atingida');
      await flush(); stable(g);
      check('K1', calls === 1, { ownRequestCount: calls, baseReady: G.hasModel('capitao') });
      const previewRequest = G.preloadGloveAssets(['capitao']);
      release(); await previewRequest; await drain(); g._ensurePlayerTP();
      check('K2', calls === 1 && G.hasGloveModel('capitao') && meshes(g.playerTP).length === 0 && g.playerTP === tp
        && tp.ctrl === ctrl && tp.mixer === mixer && stable(g), { calls, attached: meshes(g.playerTP).length, scope: 'setter com origem Drip e pacote base divergente' });
      const warm = boot('bolsonaro-drip');
      check('K3', warm.playerTP.isGLB && warm.playerTP.skinId === 'bolsonaro-drip' && meshes(warm.playerTP).length === 0 && stable(warm), 'Nascimento cosmético com pacote base já quente');
      await G.preloadCharacterAssets(['capitao'], { weapons: ['pistol'] });
      const base = boot(null);
      check('K4', complete(base.playerTP) && stable(base) && calls === 1, 'Recusa Drip não contamina o mesmo pacote base válido');
    } else if (fixture === 'fallback') {
      await G.preloadCharacterAssets(['capitao'], { weapons: ['pistol'] });
      const g = boot('bolsonaro-drip'), tp = g.playerTP;
      if (!tp.isGLB || tp.skinId) throw Error('Pré-condição clone base com cosmético ainda ausente não atingida');
      const pending = G.preloadGloveAssets(['capitao']);
      await G.preloadCosmeticAssets(['bolsonaro-drip']);
      const probe = boot('bolsonaro-drip');
      if (probe.playerTP.skinId !== 'bolsonaro-drip') throw Error('Cosmético tardio não entrou no cache');
      release(); await pending; await drain(); g._ensurePlayerTP();
      check('K5', g.playerTP === tp && !tp.skinId && complete(tp) && stable(g), 'Setter usa origem do clone base já criado, mesmo após o cache cosmético aquecer');
    } else if (fixture === 'skin-fallback') {
      await G.preloadCharacterAssets(['capitao'], { weapons: ['pistol'] });
      await G.preloadCosmeticAssets(['lula-drip']);
      release(); await G.preloadGloveAssets(['capitao']); await drain();
      const other = boot('lula-drip');
      check('K10', other.playerTP.isGLB && !other.playerTP.skinId && complete(other.playerTP) && stable(other), 'Skin de outro personagem conserva fallback base e pacote válido');
      const invalid = boot('skin-inexistente');
      check('K11', invalid.playerTP.isGLB && !invalid.playerTP.skinId && complete(invalid.playerTP) && stable(invalid), 'Skin inexistente conserva fallback base e pacote válido');
    } else {
      if (fixture === 'cosmetic-wrong-sha') await G.preloadCosmeticAssets(['bolsonaro-drip']);
      await G.preloadCharacterAssets(['capitao'], { weapons: ['pistol'] });
      release(); await G.preloadGloveAssets(['capitao']); await drain();
      const g = boot(fixture === 'cosmetic-wrong-sha' ? 'bolsonaro-drip' : null);
      const id = { 'missing-source': 'K6', 'wrong-source': 'K7', 'wrong-path': 'K8', 'wrong-family': 'K9', 'cosmetic-wrong-sha': 'K12' }[fixture];
      check(id, g.playerTP.isGLB && meshes(g.playerTP).length === 0 && stable(g), 'Descriptor de procedência ausente/divergente recusa o pacote inteiro');
    }
    out.status = out.rows.every(r => r.ok) ? 'GREEN' : 'RED';
  } catch (e) { out.status = 'INFRA'; out.error = String(e.stack || e); }
  finally { release(); for (const g of games) g.dispose(); if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); clearTimeout(deadline); }
  console.log(PREFIX + JSON.stringify(out)); process.exit(out.status === 'INFRA' ? 3 : out.status === 'GREEN' ? 0 : 1);
}

const args = process.argv.slice(2), selected = process.env.COROSOLTO_COSMETIC_CASE;
if (selected !== undefined || Object.hasOwn(process.env, 'COROSOLTO_COSMETIC_MUTANT') || args.includes('--cosmetic-worker-internal')) {
  const mutant = process.env.COROSOLTO_COSMETIC_MUTANT;
  if (!equal(args, ['--cosmetic-worker-internal']) || !Object.hasOwn(CASES, selected)
    || (mutant !== '' && !Object.hasOwn(MUTANTS, mutant))) process.exit(2);
  await worker(selected, mutant);
}
const mutant = args.length === 1 && args[0].startsWith('--mutante=') ? args[0].slice(10) : '';
if ((args.length && (!mutant || !Object.hasOwn(MUTANTS, mutant))) || args.length > 1) { console.error('CLI inválida; use sem argumentos ou --mutante=NOME'); process.exit(2); }
const report = { schema: 'tp-cosmetic/1', at: new Date().toISOString(), sources: null, runs: [],
  scope: 'Game/GLTF reais em CPU; catálogo esperado e origem efetiva do clone. Sem pixels/fit/UI/MP/GPU/atestado SHA da resposta em produção.' };
try {
  report.sources = sources();
  runs: for (const selectedMutant of mutant ? ['', mutant] : ['']) for (const [fixture, ids] of Object.entries(CASES)) {
    const p = spawnSync(process.execPath, [SELF, '--cosmetic-worker-internal'], { encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, COROSOLTO_COSMETIC_CASE: fixture, COROSOLTO_COSMETIC_MUTANT: selectedMutant } });
    const lines = (p.stdout || '').split('\n').filter(l => l.startsWith(PREFIX));
    if (p.error || p.signal || lines.length !== 1) throw Error(`${fixture}: filho sem recibo único (${p.status}/${p.signal}); ${p.stderr?.slice(-700)}`);
    const data = JSON.parse(lines[0].slice(PREFIX.length));
    if (data.status === 'INFRA') throw Error(`${fixture}: ${data.error}`);
    if (data.schema !== report.schema || data.fixture !== fixture || data.mutant !== selectedMutant || !equal(data.sources, report.sources) || !Array.isArray(data.rows)
      || !equal(data.rows.map(r => r.id), ids) || data.rows.some(r => typeof r.ok !== 'boolean')) throw Error(`${fixture}: protocolo divergente`);
    const expectedHash = selectedMutant ? sha(mutate(fs.readFileSync(path.join(ROOT, 'public/js/glbchars.js'), 'utf8'), selectedMutant)) : null;
    if (selectedMutant ? data.applied?.mutant !== selectedMutant || data.applied.rawSha256 !== expectedHash || !/^[a-f0-9]{64}$/.test(data.applied.moduleSha256 || '') : data.applied !== null) throw Error(`${fixture}: aplicação divergente`);
    const red = data.rows.some(r => !r.ok);
    if (p.status !== (red ? 1 : 0) || data.status !== (red ? 'RED' : 'GREEN')) throw Error(`${fixture}: exit/veredito divergente`);
    report.runs.push(data);
    if (!selectedMutant && fixture === Object.keys(CASES).at(-1) && report.runs.some(r => r.rows.some(row => !row.ok))) break runs;
  }
  if (!equal(report.sources, sources())) throw Error('Fontes mudaram durante a prova');
  const failures = name => report.runs.filter(r => r.mutant === name).flatMap(r => r.rows.filter(x => !x.ok).map(x => x.id));
  report.nominalFailed = failures(''); report.failed = mutant ? failures(mutant) : report.nominalFailed;
  report.mutant = mutant; report.expected = mutant ? MUTANTS[mutant].failed : [];
  report.status = report.nominalFailed.length || !equal(report.failed, report.expected) ? 'RED' : 'GREEN';
} catch (e) { report.status = 'INFRA'; report.error = String(e.stack || e); }
console.log(JSON.stringify(report)); process.exit(report.status === 'INFRA' ? 3 : report.status === 'GREEN' ? 0 : 1);
