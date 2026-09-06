/* Capturas A/B do Game real. BASELINE intercepta apenas builder/layout desta revisão.
   Conta todos os passes, sem cronometrar FPS: execução não garante GPU exclusiva. */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const baseline = process.env.BASELINE || '4dc1f9bba764d5e3031ad2c530f7640247b48c54';
const base = process.env.BASE || 'http://127.0.0.1:8148';
const out = process.env.OUT || 'artifacts/escadao-visual/comparison';
const motion = process.argv.includes('--motion');
const revisions = process.env.REVISION ? [process.env.REVISION] : ['baseline', 'after'];
if (revisions.some(r => !['baseline', 'after'].includes(r))) throw Error('REVISION inválida');
if (revisions.includes('after')) execFileSync(process.execPath, ['tools/eval/graffiti-layout-check.mjs'], { stdio: ['ignore', 'pipe', 'pipe'] });
const files = ['public/js/map_escadao.js', 'public/js/graffiti_layout.js'];
const sharedFiles = ['public/js/game.js', 'public/js/mapprops.js', 'public/js/ambientlife.js', 'public/js/glbchars.js'];
const hash = text => createHash('sha256').update(text).digest('hex');
const sharedHashes = Object.fromEntries(sharedFiles.map(file => [file, hash(readFileSync(file))]));
function validateEvidence(errors, failed, menuImages = []) {
    if (errors.length) throw Error(`pageerror: ${errors.join('; ')}`);
    // O arnês estático não executa estes endpoints nem o template Astro da seleção.
    const harnessOnly = new Set(['/api/geo-lang', '/api/online', '/api/map-plays', '/api/pick', '/%7B%60/img/brasoes/$%7Bf.crest%7D.png%60%7D']);
    const relevantFailures = failed.filter(r => !(r.status === 404 && harnessOnly.has(new URL(r.url).pathname))
      && !(r.status === 'network' && r.error === 'net::ERR_ABORTED' && menuImages.some(i => i.url === r.url && i.width > 0 && i.height > 0)));
    if (relevantFailures.length) throw Error(`Falha de asset/rede: ${JSON.stringify(relevantFailures)}`);
    if (sharedFiles.some(f => hash(readFileSync(f)) !== sharedHashes[f])) throw Error('Fonte compartilhado mudou durante A/B');
}
const cameras = [
  ['subida', 0, 13.8, 0, .25], ['patamar', 1.4, 8.4, 0, .14],
  ['descida', 0, -8, Math.PI, -.40], ['beco-oeste', -12, 12, 0, .24],
  ['beco-leste', 12, 12, 0, .24], ['lateral', -12, 6.3, -Math.PI / 2, -.1],
  ['rua', 0, 25, 0, -.1], ['mirante', 0, -29, Math.PI, .08],
  ['comercio', 0, 14.6, Math.PI, .04],
  ['bar', -8, 26, Math.atan2(4, -3.4), .25],
  ['mercearia', 7, 28, Math.atan2(-5, -3.4), .22],
];
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--mute-audio'],
});
try {
  for (const revision of revisions) {
    const dir = `${out}/${revision}`;
    mkdirSync(dir, { recursive: true });
    const source = Object.fromEntries(files.map(file => [file, revision === 'baseline'
      ? execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8' })
      : readFileSync(file, 'utf8')]));
    const context = await browser.newContext({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1,
      ...(motion ? { recordVideo: { dir, size: { width: 1536, height: 1024 } } } : {}) });
    const page = await context.newPage();
    const errors = [], failed = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', r => failed.push({ status: 'network', url: r.url(), error: r.failure()?.errorText }));
    page.on('response', r => { if (r.status() >= 400) failed.push({ status: r.status(), url: r.url() }); });
    for (const file of files) await page.route(`**/${file.replace('public/', '')}*`, route =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: source[file] }));
    await page.addInitScript(() => {
      localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'high', vol: 0, speech: false }));
      let seed = 8012;
      Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
    });
    await page.goto(`${base}/?debug=1&map=escadao&auto=B,sertanejo`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 240000 });
    await page.addStyleTag({ content: '#round-banner { visibility: hidden !important }' });
    await page.waitForTimeout(2000);
    const loaded = await page.evaluate(async () => {
      const g = window.__game;
      const { hasProp } = await import('/js/mapprops.js');
      const { ESCADAO_PROPS } = await import('/js/map_escadao.js');
      g._updateBot = () => {};
      g.player.invuln = 1e9;
      const { preloadWeapons, WEAPON_IDS, hasWeapon } = await import('/js/weapons.js');
      await preloadWeapons(WEAPON_IDS);
      if (WEAPON_IDS.some(id => !hasWeapon(id))) throw Error('Arsenal GLB incompleto');
      // R3: o boot variável deixava capturas e drops de combate diferentes no A/B.
      // Reinicia a disposição real e fixa objetivos neutros, sem alterar física do jogador.
      let fixtureSeed = 9012;
      Math.random = () => ((fixtureSeed = Math.imul(fixtureSeed,1664525)+1013904223|0)>>>0)/4294967296;
      g._resetPositions(); g.ctfCaps = {E:0,B:0}; g.roundCaps = {E:0,B:0}; g.roundKills = {E:0,B:0};
      g._initCTF(); g._updateCTF = () => {}; g._checkCtfAlvo = () => {}; g._updatePickups = () => {};
      g.el.pickupHint?.classList.add('hidden');
      for (const group of g._routePings || []) group.removeFromParent(); g._routePings = [];
      g._updateCtfHud();
      g.player.hp = 100; g.player.invuln = 1e9; g.roundTime = 1e6;
      // Mesmo elenco/arma/pose/spawns nos dois custos: RNG de geometria muda o sorteio.
      const roster = ['proerd', 'caminhoneiro', 'coach', 'mst', 'doutora', 'mistico', 'gotinha'];
      if (g.bots.length !== roster.length) throw Error('Partida exige sete bots para comparação');
      const { preloadCharacterAssets, buildCharacterModel } = await import('/js/glbchars.js');
      const { byId } = await import('/js/characters.js');
      await preloadCharacterAssets(roster, { weapons: ['ak'] });
      const slots = { E: 0, B: 0 };
      for (const [i, b] of g.bots.entries()) {
        const def = byId(roster[i]), model = buildCharacterModel(def, { weaponId: 'ak' });
        if (!model?.isGLB) throw Error(`Bot final ausente: ${roster[i]}`);
        b.mesh.group.removeFromParent(); b.mesh = model; b.def = def;
        const spawn = g.world.spawns[b.team][slots[b.team]++];
        if (!spawn) throw Error('Spawn de bot ausente');
        b.pos.set(spawn.x, g.world.groundHeightAt(spawn.x, spawn.z), spawn.z);
        model.group.position.copy(b.pos); model.group.rotation.y = spawn.yaw;
        for (let frame = 0; frame < 60; frame++) model.ctrl.update(1 / 60, 0, true, 0);
        g.scene.add(model.group); model.group.visible = false;
        if (b._mark?.halo) b._mark.halo.visible = false;
      }
      return { houses: g.world.casario.length, complete: g.world.casario.every(c => !!c.obj),
        fauna: g.world.ambience?.report(), animals: g.world.ambience?.animals?.map(a => ({ id: a.id, source: a.source })),
        missing: ESCADAO_PROPS.filter(id => !hasProp(id)),
        vegetation: g.world.root.getObjectByName('escadao_vegetacao')?.userData.escadaoPlantios || [],
        wiring: g.world.root.getObjectByName('escadao_fiacao')?.userData.escadaoRamais || [],
        fixture: {roundCaps:g.roundCaps,points:g.ctfPts.map(p=>({id:p.id,owner:p.owner,prog:p.prog})),
          drops:g.drops.map(p=>({weapon:p.weapon,x:p.x,z:p.z})),weapons:WEAPON_IDS.length,hiddenBotHalos:true} };
    });
    if (loaded.houses !== 17 || !loaded.complete || loaded.missing.length || !loaded.fauna?.gltf
      || !loaded.animals?.length || loaded.animals.some(a => a.source !== 'gltf')) throw Error(`Acervo incompleto: ${JSON.stringify(loaded)}`);
    if (motion) {
      await page.evaluate(() => {
        const g = window.__game, p = g.player;
        p.pos.set(1.2, g.world.groundHeightAt(1.2, 13.6), 13.6); p.vel.set(0, 0, 0);
        p.yaw = 0; p.pitch = .20; g.keys = {}; window.__motionTrace = [];
        const record = () => { window.__motionTrace.push(p.pos.toArray()); window.__motionRAF = requestAnimationFrame(record); };
        window.__motionRAF = requestAnimationFrame(record);
      });
      const legs = [];
      for (const reverse of [false, true]) {
        await page.evaluate(reverse => {
          const g = window.__game; g.player.yaw = reverse ? Math.PI : 0;
          g.player.pitch = reverse ? -.35 : .20; g.keys.KeyW = true;
        }, reverse);
        try {
          await page.waitForFunction(reverse => reverse ? window.__game.player.pos.z >= 13.6 : window.__game.player.pos.z <= -6.4,
            reverse, { polling: 'raf', timeout: 60000 });
        } catch (error) {
          const partial = await page.evaluate(() => ({ position: window.__game.player.pos.toArray(), trace: window.__motionTrace, state: window.__game.state }));
          writeFileSync(`${dir}/motion-failed.json`, JSON.stringify({ reverse, error: error.message, ...partial }, null, 2));
          await page.screenshot({ path: `${dir}/motion-failed.png` }); throw error;
        }
        const end = await page.evaluate(() => { const g = window.__game; g.keys.KeyW = false; g.player.vel.set(0, 0, 0); return g.player.pos.toArray(); });
        legs.push({ reverse, end });
        await page.screenshot({ path: `${dir}/motion-${reverse ? 'return' : 'top'}.png` });
      }
      const trace = await page.evaluate(() => { cancelAnimationFrame(window.__motionRAF); return window.__motionTrace; });
      if (errors.length || !trace.length || trace.some(v => !v.every(Number.isFinite))) throw Error('Movimento não produziu série finita sem erros');
      const video = page.video(); await context.close();
      await video.saveAs(`${dir}/movement.webm`); await video.delete();
      validateEvidence(errors, failed);
      writeFileSync(`${dir}/motion.json`, JSON.stringify({ revision, baseline, hiddenOverlay: 'round-banner', viewport: [1536, 1024], fov: 70,
        quality: 'high', routeX: 1.2, routeZ: [13.6, -6.4, 13.6], input: 'KeyW no loop normal do Game, sem _updatePlayer manual', legs, trace, loaded,
        hashes: { ...sharedHashes, ...Object.fromEntries(files.map(f => [f, hash(source[f])])) }, errors, failed,
        performanceApproval: 'Sem benchmark; vídeo é evidência de movimento/render e não medição de FPS.' }, null, 2));
      console.log(`${revision}/movement: ${trace.length} posições; subida e retorno no loop normal`);
      continue;
    }
    const captures = [];
    for (const [id, x, z, yaw, pitch] of cameras) {
      await page.evaluate(({ x, z, yaw, pitch }) => {
        const g = window.__game, p = g.player;
        p.pos.set(x, g.world.groundHeightAt(x, z), z); p.vel.set(0, 0, 0); p.yaw = yaw; p.pitch = pitch;
      }, { x, z, yaw, pitch });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${dir}/${id}.png` });
      const measured = await page.evaluate(() => new Promise(resolve => {
        const g = window.__game, r = g.renderer;
        for (const b of g.bots) b.mesh.group.visible = true;
        // RAF inicial estabelece a fronteira de frame; todos os renders seguintes contam.
        requestAnimationFrame(() => {
          r.info.autoReset = false; r.info.reset();
          let n = 0;
          const tick = () => {
            if (++n < 5) return requestAnimationFrame(tick);
            const result = { calls: r.info.render.calls / n, triangles: r.info.render.triangles / n,
              textures: r.info.memory.textures, geometries: r.info.memory.geometries,
              camera: g.camera.position.toArray(), rotation: g.camera.rotation.toArray(), fov: g.camera.fov,
              quality: g.settings.quality, pixelRatio: r.getPixelRatio(), frames: n,
              fauna: g.world.ambience?.report(), bots: g.bots.map(b => ({ id: b.def.id, team: b.team, weapon: 'ak', position: b.pos.toArray() })), fps: null };
            r.info.autoReset = true;
            for (const b of g.bots) b.mesh.group.visible = false;
            resolve(result);
          };
          requestAnimationFrame(tick);
        });
      }));
      captures.push({ id, ...measured });
      console.log(`${revision}/${id}: ${Math.round(measured.calls)} calls, ${Math.round(measured.triangles)} tris`);
    }
    // Modelo final texturizado e pose determinística, independente do roster sorteado.
    const actor = await page.evaluate(async () => {
      const g = window.__game;
      const { preloadCharacterAssets, buildCharacterModel } = await import('/js/glbchars.js');
      const { byId } = await import('/js/characters.js');
      await preloadCharacterAssets(['esquerdomacho'], { weapons: ['ak'] });
      const c = buildCharacterModel(byId('esquerdomacho'), { weaponId: 'ak' });
      if (!c?.isGLB) throw Error('Modelo final de combate não carregou');
      let maps = 0; c.group.traverse(o => { if (o.isMesh) for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m.map) maps++; });
      if (!maps) throw Error('Personagem sem mapas de material');
      c.group.rotation.y = Math.PI;
      for (let i = 0; i < 60; i++) c.ctrl.update(1 / 60, 0, true, 0);
      g.scene.add(c.group); window.__escadaoEvidenceActor = c;
      return { id: 'esquerdomacho', weapon: 'ak', pose: 'idle@2s', mappedMaterials: maps };
    });
    const combatCaptures = [];
    for (const [id, zPlayer, zTarget, pitch] of [['combate', 13.8, 8.5, .16], ['combate-patamar', 8.4, 1.5, .18]]) {
      await page.evaluate(({ zPlayer, zTarget, pitch }) => {
        const g = window.__game, p = g.player;
        p.pos.set(1.2, g.world.groundHeightAt(1.2, zPlayer), zPlayer); p.vel.set(0, 0, 0); p.yaw = 0; p.pitch = pitch;
        window.__escadaoEvidenceActor.group.position.set(1.2, g.world.groundHeightAt(1.2, zTarget), zTarget);
      }, { zPlayer, zTarget, pitch });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${dir}/${id}.png` });
      combatCaptures.push({ id, ...await page.evaluate(() => {
        const g=window.__game;
        return {camera:g.camera.position.toArray(),rotation:g.camera.rotation.toArray(),fov:g.camera.fov,quality:g.settings.quality,pixelRatio:g.renderer.getPixelRatio(),targetPosition:window.__escadaoEvidenceActor.group.position.toArray()};
      }) });
    }
    // O auto-start remove o splash/menu durante o download de seus wallpapers.
    // Decodifica os dois arquivos no mesmo navegador: arquivo ausente/corrompido
    // reprova. Apenas cancelamentos dessas imagens comprovadas são recuperáveis.
    const menuImages = await page.evaluate(async () => Promise.all(
      ['/img/loading-1.webp', '/img/walls-3x2/wall-1.webp'].map(async path => {
        const img = new Image(); img.src = path; await img.decode();
        return { url: img.src, width: img.naturalWidth, height: img.naturalHeight };
      })));
    await context.close();
    writeFileSync(`${dir}/capture.json`, JSON.stringify({ revision, baseline, hiddenOverlay: 'round-banner', viewport: [1536, 1024],
      hashes: { ...sharedHashes, ...Object.fromEntries(files.map(f => [f, hash(source[f])])) }, loaded, actor, captures, combatCaptures, errors, failed, menuImages,
      performanceApproval: 'PENDENTE: GPU compartilhada; apenas contadores de geometria, FPS não medido.' }, null, 2));
    validateEvidence(errors, failed, menuImages);
  }
} finally {
  await browser.close();
}
