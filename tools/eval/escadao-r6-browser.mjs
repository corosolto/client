import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.env.OUT || 'artifacts/escadao-r7/browser';
const base = process.env.BASE || 'http://127.0.0.1:8164';
const sourceRoot = process.env.SOURCE_ROOT || process.cwd();
const files = ['public/js/map_escadao.js', 'public/js/map_escadao_home.js', 'public/js/ambientlife.js', 'public/js/game.js'];
const sha = data => createHash('sha256').update(data).digest('hex');
const sources = Object.fromEntries(files.map(file => [file, sha(readFileSync(join(sourceRoot, file)))]));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--mute-audio'],
});
const receipt = { base, viewport: [1200, 800], sources, errors: [], photos: [] };
try {
  const servedMap = Buffer.from(await (await fetch(`${base}/js/map_escadao.js`)).arrayBuffer());
  receipt.servedMapSha256 = sha(servedMap);
  assert.equal(receipt.servedMapSha256, sources['public/js/map_escadao.js'], 'Servidor não corresponde ao checkout declarado');

  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => receipt.errors.push(`PAGE ${error.message}`));
  page.on('response', response => { if (response.status() >= 400) receipt.errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'high', bots: 4, vol: 0, speech: false })));
  await page.goto(`${base}/?debug=1&map=escadao&auto=B,sertanejo`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 240000 });

  receipt.fixture = await page.evaluate(() => {
    const g = window.__game;
    g.update = () => {};
    g.el.banner.classList.add('hidden');
    g.world.ambience.reset();
    for (const b of g.bots) { b.mesh.group.visible = false; if (b._mark?.halo) b._mark.halo.visible = false; }
    for (const p of g.ctfPts || []) for (const mesh of [p.ring, p.zone, p.pole, p.flag]) if (mesh) mesh.visible = false;
    g.player.alive = true; g.player.hp = 100; g.player.grounded = true; g.player.vel.set(0, 0, 0); g.player.mantle = null;
    g._updateBot = () => {}; g._checkCtfAlvo = () => {}; g._checkPace = () => {};
    g.roundTime = 1e6; g.touchMove = null; g.mouseDown0 = false;
    return { state: g.state, mapId: g.mapId, bots: g.bots.length };
  });

  const views = [
    { id: 'casa-central-exterior-escada', pos: [0, 2.75, 11], look: [-1.4, 4.35, 14.2] },
    { id: 'casa-central-janela-escada', pos: [-1.4, 2.75, 15.35], look: [0, 4.25, 10.5] },
    { id: 'casa-central-janela-rua', pos: [-1.4, 2.75, 15.65], look: [0, 4.25, 24] },
    { id: 'casa-central-acesso-inferior', pos: [10.8, 0, 24], look: [7, 4.1, 16] },
    { id: 'mirante-oeste-entrada', pos: [-9.2, 7.56, -31], look: [-12, 8.8, -28] },
    { id: 'mirante-oeste-interior', pos: [-12, 7.56, -26], look: [-12, 9.05, -21.8] },
    { id: 'mirante-leste-entrada', pos: [9.4, 7.56, -30.2], look: [12, 8.8, -29] },
    { id: 'mirante-leste-interior', pos: [12, 7.56, -27], look: [12, 9.05, -22.8] },
    { id: 'escada-ambiencia', pos: [1.1, 0, 13.5], look: [-1.45, 4.1, -2.5] },
    { id: 'esgoto-curvo', pos: [.15, 5.04, -3.4], look: [-1.22, 2.7, 5.2] },
  ];
  for (const view of views) {
    const pose = await page.evaluate(view => {
      const g = window.__game;
      g.player.pos.fromArray(view.pos);
      const requested = g.player.pos.clone();
      g._collide(g.player.pos, .38);
      g.camera.position.set(view.pos[0], view.pos[1] + 1.62, view.pos[2]);
      g.camera.fov = 70; g.camera.updateProjectionMatrix(); g.camera.lookAt(...view.look);
      g.scene.updateMatrixWorld(true);
      const before = g.renderer.info.render.frame;
      g.renderer.render(g.scene, g.camera);
      if (!g.renderer.__postPatched && g.vmScene) {
        g.renderer.autoClear = false; g.renderer.clearDepth(); g.renderer.render(g.vmScene, g.vmCamera); g.renderer.autoClear = true;
      }
      return { collisionDrift: g.player.pos.distanceTo(requested), rendered: g.renderer.info.render.frame > before };
    }, view);
    await page.screenshot({ path: `${out}/${view.id}.png` });
    receipt.photos.push({ ...view, ...pose });
  }

  const result = await page.evaluate(async () => {
    const THREE = await import('three');
    const g = window.__game, W = g.world, p = g.player;
    const capsule = (x, y, z) => {
      const requested = new THREE.Vector3(x, y, z), resolved = requested.clone();
      g._collide(resolved, .38);
      return resolved.distanceTo(requested) < 1e-6;
    };
    const clear = (a, b) => g._losClear(new THREE.Vector3(...a), new THREE.Vector3(...b));
    const drive = (id, floor, points) => {
      p.pos.set(points[0][0], W.groundHeightAt(points[0][0], points[0][1]), points[0][1]);
      p.vel.set(0, 0, 0); p.grounded = true; p.mantle = null; p.crouchF = 0; p.scoped = false;
      let frames = 0, reached = true;
      for (const [x, z] of [...points.slice(1), ...points.slice(0, -1).reverse()]) {
        p.vel.set(0, 0, 0);
        let leg = 0;
        while (Math.hypot(x - p.pos.x, z - p.pos.z) > .15 && leg++ < 420) {
          p.yaw = Math.atan2(p.pos.x - x, p.pos.z - z);
          g.time += 1 / 60;
          g._moveEntity(p, { ax: 0, az: -1, jump: false, crouch: false, shift: false }, 1 / 60);
          frames++;
        }
        if (leg >= 420) { reached = false; break; }
      }
      return { id, reached, frames, end: p.pos.toArray(), floor, endedOnFloor: Math.abs(p.pos.y - W.groundHeightAt(p.pos.x, p.pos.z, p.pos.y)) < .03 };
    };
    const routes = [
      drive('central-superior', 2.75, [[.3, 10.12], [.9, 10.12], [.9, 12], [.9, 14.4], [1, 14.9], [-1.4, 15.5]]),
      drive('central-inferior', 2.75, [[9.2, 23.2], [9.2, 20], [9.2, 17.5], [9.2, 16], [8, 16], [7, 16], [4.4, 15], [1.45, 14.94], [-1.4, 15.5]]),
      drive('mirante-oeste', 7.56, [[-4.5, -34], [-8.8, -33], [-9.4, -30.4], [-12, -28.6], [-12, -26]]),
      drive('mirante-leste', 7.56, [[4.5, -34], [8.6, -31], [9.4, -29.6], [12, -29.6], [12, -27]]),
    ];
    const rows = [
      { id: 'janela-escada', eye: [-1.4, 4.37, 15.3], target: [-.6, W.groundHeightAt(-.6, 11) + 1.5, 11], floor: 2.75 },
      { id: 'janela-rua', eye: [-1.4, 4.37, 15.7], target: [0, W.groundHeightAt(0, 24) + 1.5, 24], floor: 2.75 },
      { id: 'mirante-oeste', eye: [-12, 9.18, -25], target: [-12, 9.06, -21.8], floor: 7.56 },
      { id: 'mirante-leste', eye: [12, 9.18, -26], target: [12, 9.06, -22.8], floor: 7.56 },
    ];
    const los = rows.map(row => ({
      id: row.id,
      eyeCapsule: capsule(row.eye[0], row.floor, row.eye[2]),
      targetCapsule: capsule(row.target[0], row.target[1] - 1.5, row.target[2]),
      fire: clear(row.eye, row.target),
      counter: clear(row.target, row.eye),
    }));
    const centralFloor = W.groundHeightAt(-1.4, 15.3, 2.75);
    const exposedE = W.spawns.E.filter(slot => clear([-1.4, 4.37, 15.7], [slot.x, W.groundHeightAt(slot.x, slot.z) + 1.62, slot.z])).length;
    const exposedB = rows.filter(row => row.id.startsWith('mirante-')).map(row => ({
      id: row.id,
      exposed: W.spawns.B.filter(slot => clear(row.eye, [slot.x, W.groundHeightAt(slot.x, slot.z) + 1.62, slot.z])).length,
    }));
    const fauna = Object.fromEntries(['rat','pigeon','cat','cockroach'].map(type => [type, W.ambience.animals.filter(a => a.type === type).length]));
    const faunaSources = [...new Set(W.ambience.animals.filter(a => ['rat','pigeon','cat','cockroach'].includes(a.type)).map(a => a.source))];
    const esgoto = W.root.getObjectByName('escadao_esgoto_curvo')?.userData.escadaoEsgoto;
    const plantios = W.root.getObjectByName('escadao_vegetacao')?.userData.escadaoPlantios?.length || 0;
    const fios = W.root.getObjectByName('escadao_fiacao')?.userData.escadaoRamais?.length || 0;
    return { routes, los, centralFloor, exposedE, exposedB, fauna, faunaSources, esgoto, plantios, fios };
  });
  receipt.result = result;

  assert.ok(receipt.photos.every(photo => photo.rendered), 'Capturas exigem render real');
  assert.ok(result.routes.every(route => route.reached && route.endedOnFloor), JSON.stringify(result.routes));
  assert.ok(result.los.every(row => row.eyeCapsule && row.targetCapsule && row.fire && row.counter), JSON.stringify(result.los));
  assert.equal(result.centralFloor, 2.75, 'Piso central contínuo na mesma sala');
  assert.equal(result.exposedE, 0, 'Janela oposta não lê o spawn inferior');
  assert.ok(result.exposedB.every(row => row.exposed === 0), JSON.stringify(result.exposedB));
  assert.deepEqual(result.fauna, { rat: 5, pigeon: 5, cat: 2, cockroach: 5 });
  assert.deepEqual(result.faunaSources, ['gltf'], `faunaSources=${result.faunaSources}`);
  assert.ok(result.esgoto?.points >= 24 && result.esgoto?.yDrop >= 7, JSON.stringify(result.esgoto));
  assert.ok(result.plantios >= 25, `plantios=${result.plantios}`);
  assert.ok(result.fios >= 28, `fios=${result.fios}`);
  receipt.criticalErrors = receipt.errors.filter(error => error.startsWith('PAGE ') || /\/js\/|\/models\/props\/escadao_/.test(error));
  assert.equal(receipt.criticalErrors.length, 0, JSON.stringify(receipt.criticalErrors));
  receipt.status = 'passed';
  console.log(`ESCADAO R7 BROWSER PASS: ${result.routes.length} rotas ida/volta, ${result.los.length} linhas de tiro, ${views.length} capturas 1200x800`);
} catch (error) {
  receipt.status = 'failed'; receipt.error = error.stack; process.exitCode = 1;
  console.error(error.message);
} finally {
  writeFileSync(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
  await browser.close();
}
