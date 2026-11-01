/* R276/R280/R307: bot pistol/MP5 recebia AWP; corpo perdia seleção ou metade da luva.
   Game e GLBs reais em CPU; contrato e limites em docs/visual-consistency/TP-IDENTITY.md. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const JS = path.join(ROOT, 'public/js');
const SELF = fileURLToPath(import.meta.url);
const PREFIX = 'TP-IDENTITY/1 ';
const CASES = {
  weapon: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'],
  own: ['O1', 'O2', 'O3', 'O5'],
  incompatible: ['O4'],
  cold: ['C1', 'C2', 'C3', 'C4'],
  'reject-other': ['C6'],
  'no-glove': ['C5a'],
  'nav-only': ['C5b'],
};
const EXPECTED = {
  'swap-weapon': ['W1', 'W2', 'W3'],
  'own-glove': ['O1', 'C4'],
  'glove-preload': ['C1', 'C2', 'C3', 'C4', 'C6'],
  'boot-await': ['C2', 'C3', 'C4', 'C6'],
  'glove-first-part': ['O1', 'O4', 'C4'],
  'glove-partial-bind': ['O4'],
};
const sha = (v) => createHash('sha256').update(v).digest('hex');
const sources = () => Object.fromEntries(['game.js', 'main.js', 'glbchars.js'].map(f => [f, sha(fs.readFileSync(path.join(JS, f)))]));
const replaceOne = (s, a, b) => {
  if (s.split(a).length !== 2 || a === b) throw Error(`Âncora não única/mutação inerte: ${a.slice(0, 80)}`);
  return s.replace(a, b);
};
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function worker(fixture, mutant) {
  const out = { version: 1, fixture, mutant, sources: sources(), rows: [], loaded: [] };
  const games = [];
  let releaseGlove = () => {};
  const check = (id, ok, detail) => out.rows.push({ id, ok: Boolean(ok), detail });
  const deadline = setTimeout(() => { console.error('TP fixture deadline'); process.exit(3); }, 45000);
  const errorOriginal = console.error, unexpected = [];
  try {
    const filename = (u) => path.join(ROOT, 'public', new URL(String(u), 'http://fixture/').pathname.replace(/^\//, ''));
    const localFetch = async (u) => fs.existsSync(filename(u)) ? new Response(fs.readFileSync(filename(u))) : new Response('', { status: 404 });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, get: () => localFetch, set() {} });
    const H = await import('./harness.mjs');
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: localFetch });
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const held = new Promise(r => { releaseGlove = r; });
    let enteredGlove;
    const entered = new Promise(r => { enteredGlove = r; });
    const isCold = ['cold', 'reject-other', 'no-glove', 'nav-only'].includes(fixture);
    let gloveAtIO = false, changedBone = null, gloveParts = [];
    GLTFLoader.prototype.load = function (u, done, progress, fail) {
      const loader = new GLTFLoader();
      loader.register(() => ({ name: 'EXT_texture_webp', async loadTexture() {
        const t = new H.THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true; return t;
      } }));
      Promise.resolve().then(async () => {
        const b = fs.readFileSync(filename(u));
        const g = await loader.parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
        if (new URL(String(u), 'http://fixture/').pathname === '/models/gloves/3p/barbudo-b2013bcf639a.glb') {
          gloveAtIO = true;
          g.scene.traverse(o => { if (o.isSkinnedMesh) gloveParts.push(o); });
          if (gloveParts.length !== 2 || new Set(gloveParts.map(o => o.geometry)).size !== 2) throw Error('Pacote R307 mudou; conferir os dois primitivos publicados');
          if (fixture === 'incompatible') {
            const mesh = gloveParts[1], bone = mesh?.skeleton?.bones[0];
            if (!bone || changedBone) throw Error('Pacote incompatível: aplicação não única');
            const bones = [...mesh.skeleton.bones], bad = bone.clone(false);
            changedBone = { part: 1, before: bone.name, after: '__tp_incompatible_bone__' }; bad.name = changedBone.after; bones[0] = bad;
            mesh.skeleton = new H.THREE.Skeleton(bones, mesh.skeleton.boneInverses);
            if (gloveParts[0].skeleton.bones.some(b => b.name === changedBone.after)) throw Error('Controle contaminou a primeira parte');
          }
          enteredGlove(); if (isCold) await held;
        }
        out.loaded.push({ url: String(u), bytes: b.length, sha256: sha(b) }); done(g);
      }).catch(e => fail?.(e));
    };
    const weapons = await import('../../public/js/weapons.js');
    let G, actual;
    if (['swap-weapon', 'own-glove', 'glove-first-part', 'glove-partial-bind'].includes(mutant)) {
      let s = fs.readFileSync(path.join(JS, 'game.js'), 'utf8');
      if (mutant === 'swap-weapon') s = replaceOne(s, 'buildCharacterModel(veste, { weaponId: swapBot.weapon })', 'buildCharacterModel(veste)');
      if (mutant === 'own-glove') s = replaceOne(s, 'buildCharacterModel(def, { weaponId: w, weaponSkinId: skinTP, gloveSkinId: this.playerGloveId })', 'buildCharacterModel(def, { weaponId: w, weaponSkinId: skinTP })');
      const tmp = fs.mkdtempSync(path.join(ROOT, 'node_modules', '.tp-identity-'));
      try {
        const prefix = pathToFileURL(JS).href;
        const absoluteImports = text => text.replace(/from '(\.\/[^']+)'/g, (_, rel) => `from ${JSON.stringify(prefix + rel.slice(1))}`)
          .replace(/import\('\.\//g, `import('${prefix}/`);
        let gloveModule = pathToFileURL(path.join(JS, 'glbchars.js')).href;
        if (mutant.startsWith('glove-')) {
          let gs = fs.readFileSync(path.join(JS, 'glbchars.js'), 'utf8');
          if (mutant === 'glove-first-part') gs = replaceOne(gs, '_gloveMeshes.set(id, meshes.length ? meshes : null);', '_gloveMeshes.set(id, meshes.length ? meshes.slice(0, 1) : null);');
          else {
            gs = replaceOne(gs, '  if (binds.some(({ bones }) => bones.some(b => !b))) return null;', '  const validBinds = binds.filter(({ bones }) => bones.every(Boolean));');
            gs = replaceOne(gs, '  return binds.map(({ template, bones }) => {', '  return validBinds.map(({ template, bones }) => {');
          }
          out.mutatedGlbchars = sha(gs);
          const gf = path.join(tmp, 'glbchars.mjs'); fs.writeFileSync(gf, absoluteImports(gs)); gloveModule = pathToFileURL(gf).href;
          s = replaceOne(s, "from './glbchars.js'", `from ${JSON.stringify(gloveModule)}`);
        }
        G = await import(gloveModule); out.mutatedGame = sha(s); s = absoluteImports(s);
        const f = path.join(tmp, 'game.mjs'); fs.writeFileSync(f, s); actual = await import(pathToFileURL(f).href);
      } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    } else { G = await import('../../public/js/glbchars.js'); actual = await import('../../public/js/game.js'); }
    const textures = H.initTextures();
    const settings = { bots: 1, allyBots: 0, enemyBots: 1, quality: 'low', difficulty: 'normal', sens: 1 };
    const roster = { allyDefs: [], enemyDefs: [H.CHARACTERS.find(c => c.id === 'capitao')] };
    const options = (glove = null, w = 'pistol') => ({ renderer: H.renderer, textures, sfx: H.sfx, settings: { ...settings },
      playerCharId: 'barbudo', playerGloveId: glove, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B', nickname: 'SIM',
      mapId: 'posto_treta', ctf: false, testMode: true, matchRoster: roster, matchWeapons: [w], onQuit() {}, onMatchEnd() {} });
    const boot = (glove, w) => {
      H.seedRandom(12345); const g = new actual.Game(options(glove, w)); games.push(g);
      g._ensureDolly = () => {}; g.killsToWin = Infinity; g.start(); g.state = 'live'; return g;
    };
    const meshes = (model, name) => { const a = []; model.group.traverse(o => { if (o.name === name) a.push(o); }); return a; };
    const completeGloves = (model, luvas) => {
      let body; model.group.traverse(o => { if (!body && o.isSkinnedMesh && o.name !== 'luvas-3p') body = o; });
      return model.isGLB && gloveParts.length === 2 && luvas.length === gloveParts.length
        && gloveParts.every(part => luvas.filter(l => l.geometry === part.geometry).length === 1)
        && luvas.every(l => l.userData.gloveSkin === 'luvas-brasil' && l.parent === body?.parent
          && l.skeleton.bones.every(b => body.skeleton.bones.includes(b)));
    };
    const warm = async () => {
      await G.preloadCharacterAssets(['barbudo', 'capitao'], { weapons: ['pistol', 'mp5', 'awp'] });
      await G.preloadGloveAssets(['barbudo']);
      if (!G.hasModel('barbudo') || !G.hasModel('capitao') || !G.hasGloveModel('barbudo') || !['pistol', 'mp5', 'awp'].every(weapons.hasWeapon)) {
        throw Error('Corpo/arma/luva GLB real ausente; restaurar assets e manifestos');
      }
    };
    if (!isCold) {
      await warm();
      if (fixture === 'weapon') {
        let controls = true;
        for (const [i, w] of ['pistol', 'mp5', 'awp'].entries()) {
          const g = boot(null, w), bot = g.bots[0], old = bot.mesh.group;
          g._switchTeam('capitao'); const group = bot.mesh.group, m = meshes(bot.mesh, 'arma-glb');
          if (!bot.mesh.isGLB || bot.def.id !== 'barbudo' || m.length !== 1) throw Error('Troca não alcançou Barbudo/arma GLB');
          check(`W${i * 2 + 1}`, m[0].userData.weaponRequested === w, { logical: bot.weapon, cache: bot._meshWeapon,
            requested: m[0].userData.weaponRequested, source: m[0].userData.weaponSource });
          check(`W${i * 2 + 2}`, bot.mesh.ctrl.oneHanded === (w === 'pistol'), { oneHanded: bot.mesh.ctrl.oneHanded });
          let owned = true; group.traverse(o => { if (o.userData.botOwner !== bot) owned = false; });
          controls &&= !old.parent && group.parent === g.scene && owned && bot.weapon === w && bot._meshWeapon === w;
          const result = g._syncRemoteWeapon(bot, w);
          controls &&= result === false && bot.mesh.group === group;
          const team = g.playerTeam; g.player.alive = false; g._switchTeam('capitao'); controls &&= g.playerTeam === team && bot.mesh.group === group;
          g.player.alive = true; g.state = 'matchEnd'; g._switchTeam('capitao'); controls &&= g.playerTeam === team && bot.mesh.group === group;
        }
        check('W7', controls, 'Ownership, cena, cache e chamadas únicas sem rebuild; morto/estado inválido recusados');
      } else if (fixture === 'own') {
        const g = boot('luvas-brasil'); g.setCamView('third'); const tp = g.playerTP, luvas = meshes(tp, 'luvas-3p');
        check('O1', completeGloves(tp, luvas), { isGLB: tp.isGLB, gloves: luvas.length, publishedParts: gloveParts.length,
          parts: gloveParts.map(part => ({ name: part.name, attached: luvas.some(l => l.geometry === part.geometry), triangles: part.geometry.index.count / 3 })) });
        g._ensurePlayerTP(); check('O2', g.playerTP === tp && g.playerTP.group === tp.group, 'ensure repetido conserva identidade');
        const plain = boot(null); plain.setCamView('third');
        check('O3', G.hasGloveModel('barbudo') && plain.playerTP.isGLB && meshes(plain.playerTP, 'luvas-3p').length === 0, 'Cache quente sem luva selecionada');
        const ownGroup = tp.group; g._switchTeam('capitao'); const bot = g.bots[0];
        const atSwap = bot.def.id === 'barbudo' && bot.mesh.isGLB && bot.mesh.group !== ownGroup && meshes(bot.mesh, 'luvas-3p').length === 0;
        const rebuilt = g._syncRemoteWeapon(bot, 'mp5');
        check('O5', G.hasGloveModel('barbudo') && atSwap && rebuilt === true && bot.mesh.isGLB
          && bot.mesh.group !== ownGroup && meshes(bot.mesh, 'luvas-3p').length === 0, 'Bot Barbudo compatível distinto, swap e rebuild reais sem herdar luva');
      } else {
        const template = G.getCharTemplate('barbudo'); const names = new Set(); template.traverse(o => { if (o.isBone) names.add(o.name); });
        if (!changedBone || !names.has(changedBone.before) || names.has(changedBone.after)) throw Error('Incompatibilidade do pacote não comprovada');
        if (!gloveParts[0].skeleton.bones.every(b => names.has(b.name)) || gloveParts[1].skeleton.bones.every(b => names.has(b.name))) throw Error('Controle deve preservar primeira parte válida e segunda incompatível');
        const g = boot('luvas-brasil'); g.setCamView('third');
        check('O4', g.playerTP.isGLB && G.hasGloveModel('barbudo') && meshes(g.playerTP, 'luvas-3p').length === 0, changedBone);
      }
    } else {
      if (G.hasGloveModel('barbudo')) throw Error('Worker frio já tinha pacote');
      let source = fs.readFileSync(path.join(JS, 'main.js'), 'utf8');
      if (mutant === 'glove-preload') source = replaceOne(source, '        playerGloveId ? preloadGloveAssets([charId]) : null,\n', '');
      if (mutant === 'boot-await') source = replaceOne(source, '      await aguardarPreloads([', '      aguardarPreloads([');
      const start = '  try {\n    if (!navOnly) {', end = '  /* RÉGUA:launch-race nascimento fim */';
      for (const a of [start, end]) if (source.split(a).length !== 2) throw Error('Recorte real do nascimento não único');
      const block = source.slice(source.indexOf(start), source.indexOf(end) + end.length); out.birthSlice = sha(block);
      const born = []; let loads, glovePromise;
      const hasSelection = fixture !== 'no-glove', navOnly = fixture === 'nav-only';
      const Game = new Proxy(actual.Game, { construct(target, args) {
        const ready = G.hasGloveModel('barbudo'), g = Reflect.construct(target, args, target); games.push(g);
        g._ensureDolly = () => {}; g.setCamView('third'); const luvas = meshes(g.playerTP, 'luvas-3p');
        born.push({ ready, isGLB: g.playerTP.isGLB, gloves: luvas.length, skin: luvas[0]?.userData.gloveSkin,
          completeGloves: completeGloves(g.playerTP, luvas) }); return g;
      } });
      console.error = (...a) => {
        errorOriginal(...a);
        if (String(a[0]).includes('preload da partida falhou parcialmente') && !a.some(x => x?.message === 'controlled different optional load')) unexpected.push(a.map(String).join(' '));
      };
      const noop = () => Promise.resolve();
      const env = {
        navOnly, aguardarPreloads: ls => { loads = ls; return actual.aguardarPreloads(ls); },
        preloadCharacterAssets: G.preloadCharacterAssets, _charsToLoad: ['barbudo', 'capitao'], _armasDaPartida: ['pistol', 'awp', 'ak'],
        preloadCosmeticAssets: () => fixture === 'reject-other' ? Promise.reject(new Error('controlled different optional load')) : Promise.resolve(),
        matchSkins: [], preloadEyewearAssets: noop, matchEyewear: [], playerGloveId: hasSelection ? 'luvas-brasil' : null, charId: 'barbudo',
        preloadGloveAssets: ids => {
          if (!equal(ids, ['barbudo'])) throw Error('Preload pediu corpo errado');
          glovePromise = G.preloadGloveAssets(ids); return glovePromise;
        },
        playerWeaponSkins: {}, preloadWeaponSkinCandidate: noop, playerKnifeSkinId: null, sfx: H.sfx,
        preloadMapProps: noop, mapPropIds: () => [], mapaPartida: {}, MOBILE_AUTO: true, preloadMapAmbientLife: noop,
        preloadFPArms: noop, preloadAuthoredFamilies: noop, authoredBootFamilies: () => [], _vmBootWeapons: ['pistol'],
        lancamentoPerdeu: () => false, meuLancamento: 1, sessao: null, _lstat: {}, Game, settings: { ...settings }, tamanhoTime: 1,
        renderer: H.renderer, textures, playerSkinId: null, playerEyewearId: null, side: 'E', faction: 'E', enemyFac: 'B',
        currentMap: 'posto_treta', $: () => ({ value: 'SIM' }), testMode: true, TOUCH: false, matchRoster: roster,
        matchWeapons: ['pistol'], economia: false, matchMode: 'dm', sanitizeRounds: () => 5, matchRounds: () => 5,
        recordMatchStats() {}, trainingEnabled: () => false, sendTrainingFrames() {}, window: globalThis, game: null,
      };
      const pending = new Function(...Object.keys(env), `return (async()=>{${block}\n})();`)(...Object.values(env));
      await Promise.allSettled((loads || []).filter(p => p !== glovePromise));
      for (let i = 0; i < 30; i++) await Promise.resolve();
      await new Promise(r => setImmediate(r));
      if (glovePromise) await entered;
      if (unexpected.length) throw Error(`Falha inesperada de preload: ${unexpected.join(' | ')}`);
      const before = { births: born.length, cacheReady: G.hasGloveModel('barbudo'), gloveAtIO,
        gloveCalled: Boolean(glovePromise), inBarrier: Boolean(glovePromise) && loads.includes(glovePromise) };
      if (fixture === 'cold') {
        check('C1', before.gloveCalled && before.inBarrier, before);
        check('C2', before.births === 0 && !before.cacheReady && before.gloveAtIO, before);
      }
      releaseGlove(); await pending; await glovePromise;
      if (!navOnly && !G.hasModel('barbudo')) throw Error('Corpo GLB real não carregado');
      const readyBirth = born.length === 1 && born[0].ready;
      if (fixture === 'cold') {
        check('C3', readyBirth, born);
        check('C4', born.length === 1 && born[0].completeGloves, born);
      } else if (fixture === 'reject-other') {
        check('C6', before.gloveCalled && before.inBarrier && before.gloveAtIO && !before.cacheReady && before.births === 0 && readyBirth, { before, born });
      } else check(navOnly ? 'C5b' : 'C5a', !before.gloveCalled && !before.gloveAtIO && born.length === 1 && born[0].gloves === 0, { before, born });
    }
    out.status = out.rows.every(r => r.ok) ? 'GREEN' : 'RED';
  } catch (e) { out.status = 'INFRA'; out.error = String(e.stack || e); }
  finally {
    releaseGlove(); for (const g of games) g.dispose(); clearTimeout(deadline); console.error = errorOriginal;
  }
  console.log(PREFIX + JSON.stringify(out)); process.exit(out.status === 'INFRA' ? 3 : out.status === 'GREEN' ? 0 : 1);
}

const INTERNAL = '--tp-worker-internal';
const args = process.argv.slice(2);
const workerEnv = ['COROSOLTO_TP_CASE', 'COROSOLTO_TP_MUTANT'].some(k => Object.hasOwn(process.env, k));
if (workerEnv || args.includes(INTERNAL)) {
  const fixture = process.env.COROSOLTO_TP_CASE, selected = process.env.COROSOLTO_TP_MUTANT;
  if (!equal(args, [INTERNAL]) || !Object.hasOwn(CASES, fixture) || typeof selected !== 'string'
    || (selected && !Object.hasOwn(EXPECTED, selected))) {
    console.error('Entrada interna inválida: ambiente de worker não pode substituir o CLI público'); process.exit(2);
  }
  await worker(fixture, selected);
}

let mutant = '', jsonPath;
for (const arg of args) {
  if (arg.startsWith('--mutante=') && !mutant && Object.hasOwn(EXPECTED, arg.slice(10))) mutant = arg.slice(10);
  else if (arg.startsWith('--json=') && !jsonPath && path.isAbsolute(arg.slice(7))) jsonPath = arg.slice(7);
  else { console.error(`CLI inválida: ${arg}; use --mutante=${Object.keys(EXPECTED).join('|')} e/ou --json=/caminho/absoluto`); process.exit(2); }
}
const report = { at: new Date().toISOString(), sources: sources(), mutant, runs: [], scope: 'Game/GLTF reais, texturas CPU1×1, recorte real do nascimento; sem raster/UI/arte/persistência/MP' };
try {
  const run = (selected) => {
    const failed = [];
    for (const [fixture, ids] of Object.entries(CASES)) {
      const p = spawnSync(process.execPath, [SELF, INTERNAL], { encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, COROSOLTO_TP_CASE: fixture, COROSOLTO_TP_MUTANT: selected } });
      const lines = (p.stdout || '').split('\n').filter(l => l.startsWith(PREFIX));
      if (p.error || p.signal || lines.length !== 1) throw Error(`${fixture}: filho sem recibo único/status válido (${p.status}/${p.signal}); ${p.stderr?.slice(-900)}`);
      const data = JSON.parse(lines[0].slice(PREFIX.length));
      if (data.status === 'INFRA') throw Error(`${fixture}: ${data.error}`);
      if (data.version !== 1 || data.fixture !== fixture || data.mutant !== selected || !equal(data.sources, report.sources)
        || !Array.isArray(data.rows) || !equal(data.rows.map(r => r.id), ids) || data.rows.some(r => typeof r.ok !== 'boolean')
        || !Array.isArray(data.loaded) || data.loaded.some(a => !a.url || !Number.isInteger(a.bytes) || !/^[a-f0-9]{64}$/.test(a.sha256))) throw Error(`${fixture}: protocolo/fonte/denominador divergente`);
      const red = data.rows.filter(r => !r.ok).map(r => r.id);
      if (p.status !== (red.length ? 1 : 0) || data.status !== (red.length ? 'RED' : 'GREEN')) throw Error(`${fixture}: exit/veredito contradizem as cláusulas`);
      report.runs.push(data); failed.push(...red);
    }
    if (!equal(sources(), report.sources)) throw Error('Fontes mudaram durante a medição');
    return failed;
  };
  const nominal = run('');
  if (nominal.length) {
    report.status = mutant ? 'INFRA' : 'RED'; report.failed = nominal;
    if (mutant) report.error = 'Nominal vermelho; nenhum crédito de mutante';
  } else if (mutant) {
    report.failed = run(mutant); report.expected = EXPECTED[mutant];
    report.status = equal([...report.failed].sort(), [...report.expected].sort()) ? 'DETECTED' : 'RED';
  } else report.status = 'GREEN';
} catch (e) { report.status = 'INFRA'; report.error = String(e.stack || e); }
if (jsonPath) fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, mutant, failed: report.failed || [], expected: report.expected, cases: report.runs.length, error: report.error }));
process.exit(report.status === 'INFRA' ? 3 : ['GREEN', 'DETECTED'].includes(report.status) ? 0 : 1);
