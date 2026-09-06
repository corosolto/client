// Captura de rodada: jogo real, câmeras fixas 3:2 e soma dos passes por frame.
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const globalRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${globalRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { walkAmazonia } from './amazonia-walk.mjs';
const out = process.argv[2] || 'artifacts/amazonia-visual/baseline';
const mapSource = process.env.MAP_SOURCE ? readFileSync(process.env.MAP_SOURCE, 'utf8') : null;
const quality = process.env.QUALITY || 'med';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--mute-audio'] });
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
  const errors = [], assets = [];
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::')) console.log('CONSOLE', m.text().slice(0,600)); });
  page.on('pageerror', e => { errors.push(e.message); console.log('PAGEERROR', e.message); });
  page.on('response', r => { if (/\.(glb|webp|mp3)(\?|$)/.test(r.url())) assets.push({ url: new URL(r.url()).pathname, status: r.status() }); });
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(u.hostname) || u.pathname.startsWith('/api/')) return route.abort();
    if (mapSource && u.pathname === '/js/map_amazonia.js') return route.fulfill({ contentType: 'text/javascript', body: mapSource });
    return route.continue();
  });
  await page.addInitScript(q => { localStorage.setItem('awpbr_settings', JSON.stringify({ quality: q, bots: 4, vol: 0, speech: false })); }, quality);
  await page.goto(`${process.env.BASE || 'http://127.0.0.1:8146'}/?debug=1&map=amazonia&auto=B,sertanejo&perfilauto=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live' || !document.getElementById('launch-error')?.classList.contains('hidden'), null, { timeout: 240000 });
  await page.waitForTimeout(4000);
  let launchRetried = false;
  for (let attempt = 0; attempt < 2 && await page.locator('#launch-error').isVisible(); attempt++) {
    launchRetried = true;
    console.log('BOOT guard visible: retry through UI');
    await page.screenshot({ path: `${out}/boot-failure.png` });
    await page.locator('#launch-error-retry').click();
    await page.waitForFunction(() => window.__game?.state === 'live' || !document.getElementById('launch-error')?.classList.contains('hidden'), null, { timeout: 240000 });
    await page.waitForTimeout(3000);
  }
  if (await page.locator('#launch-error').isVisible()) throw new Error('captura inválida: aviso de falha de boot');
  console.log('game live; guard hidden; retried=' + launchRetried);
  const trees = await page.evaluate(async () => {
    const THREE = await import('three'), g = window.__game;
    const offenders = [], matrix = new THREE.Matrix4(), v = new THREE.Vector3(), origin = new THREE.Vector3();
    let instances = 0;
    g.world.root.traverse(o => {
      if (!o.isInstancedMesh || !o.material.name.includes('Árvore de mata')) return;
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, matrix); matrix.premultiply(o.matrixWorld); origin.setFromMatrixPosition(matrix);
        const a = g.world.amazonia.interior.arvores.find(a => Math.hypot(a.x-origin.x,a.z-origin.z)<0.01);
        if (!a) continue;
        instances++;
        let extent = 0;
        const p = o.geometry.attributes.position;
        for (let j = 0; j < p.count; j++) {
          v.fromBufferAttribute(p,j).applyMatrix4(matrix);
          if (v.y >= .3 && v.y <= 2.6) extent = Math.max(extent, Math.hypot(v.x-a.x,v.z-a.z));
        }
        const col = g.world.colliders.find(c => Math.abs((c.minX+c.maxX)/2-a.x)<.001 && Math.abs((c.minZ+c.maxZ)/2-a.z)<.001 && c.maxY===2.6);
        const radius = col ? (col.maxX-col.minX)/2 : 0;
        if (!col || extent > radius + 1e-4 || radius - extent > .03) offenders.push({ x:a.x,z:a.z,extent,radius });
      }
    });
    const pos = new THREE.Vector3(-22,0,-16), before = pos.clone(); g._collide(pos,.38);
    return { id:'AMV4', instances, offenders, ok:instances===g.world.amazonia.interior.arvores.length && offenders.length===0,
      cameraInsideTree: { before:before.toArray(), after:pos.toArray(), displaced:pos.distanceTo(before) } };
  });
  writeFileSync(`${out}/trees.json`, JSON.stringify(trees,null,2));
  console.log(`${trees.ok ? 'PASS' : 'FAIL'} AMV4 ${trees.offenders.length}/${trees.instances} troncos excedem colisor na altura do corpo`);
  if (process.argv.includes('--checks-only')) { if (!trees.ok) process.exitCode=1; await page.close(); }
  else {
  const setup = await page.evaluate(() => {
    const g = window.__game;
    window.__amzOriginalUpdate = g.update;
    g.update = function(dt) { this.renderer.render(this.scene, this.camera); };
    g.scene.updateMatrixWorld(true);
    return { fov: g.camera.fov, settings: g.settings, state: g.state, player: g.player.pos, renderer: g.renderer.getContext().getParameter(g.renderer.getContext().RENDERER) };
  });
  const cameras = [
    { name: 'spawn', pos: [15, 1.62, 39], target: [0, 2, 10] },
    { name: 'canal', pos: [-10.8, 1.62, -18], target: [8, 1.4, 6] },
    { name: 'mata', pos: [-22, 1.62, -16], target: [-30, 4, -28] },
    { name: 'palafitas', pos: [9.4, 3.42, -14], target: [18, 3, -9] },
    { name: 'mercado', pos: [-7, 1.8, 0], target: [8, 1.7, 0] },
    { name: 'margem', pos: [8.7, 1.32, 20], target: [11, 0, 20] },
    { name: 'overview', pos: [-36, 30, 48], target: [0, 0, 0] },
  ];
  const metrics = [];
  for (const cam of cameras) {
    const m = await page.evaluate(cam => {
      const g = window.__game, r = g.renderer;
      g.camera.position.set(...cam.pos); g.camera.lookAt(...cam.target); g.camera.updateMatrixWorld(true);
      r.info.autoReset = false; r.info.reset(); r.render(g.scene, g.camera);
      const v = { ...r.info.render, memory: { ...r.info.memory }, programs: r.info.programs.length };
      r.info.autoReset = true;
      return v;
    }, cam);
    await page.waitForTimeout(250);
    if (await page.locator('#launch-error').isVisible()) throw new Error('captura coberta por falha de boot');
    await page.screenshot({ path: `${out}/${cam.name}.png` });
    metrics.push({ ...cam, ...m });
  }
  if (process.env.WALK === '1' && !await walkAmazonia(page,out)) process.exitCode = 1;
  const runtime = await page.evaluate(() => {
    const g = window.__game, w = g.world;
    const meshes = []; w.root.traverse(o => { if (o.isMesh) meshes.push({ name: o.name, type: o.geometry.type, count: o.count || 1, triangles: (o.geometry.index?.count || o.geometry.attributes.position.count) / 3, transparent: o.material.transparent, alphaTest: o.material.alphaTest, shadow: o.castShadow }); });
    return { meshes, metadata: w.amazonia, spawns: w.spawns, ctf: w.ctfPoints, pickups: w.pickups.map(p => ({x:p.x,z:p.z,kind:p.kind})), colliders: w.colliders, waters: g.scene.userData.waters?.length, animals: w.ambience?.animals.map(a => a.type), heap: performance.memory?.usedJSHeapSize };
  });
  writeFileSync(`${out}/capture.json`, JSON.stringify({ setup, mapSource:process.env.MAP_SOURCE || null, launchRetried, cameras: metrics, runtime, errors, assets, performanceApproval: 'PENDING: no exclusive GPU window' }, null, 2));
  console.log(JSON.stringify({ out, errors, assets: assets.length, cameras: metrics.map(m => ({name:m.name,calls:m.calls,triangles:m.triangles})) }));
  }
} finally { await browser.close(); }
