// Captura de rodada: jogo real, câmeras fixas 3:2 e soma dos passes por frame.
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const globalRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${globalRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { walkAmazonia } from './amazonia-walk.mjs';
const out = process.argv[2] || 'artifacts/amazonia-visual/baseline';
const mapSource = process.env.MAP_SOURCE ? readFileSync(process.env.MAP_SOURCE, 'utf8') : null;
const lookSource = process.env.LOOK_SOURCE ? readFileSync(process.env.LOOK_SOURCE,'utf8') : null;
const quality = process.env.QUALITY || 'med';
const builderSource = mapSource || readFileSync('public/js/map_amazonia.js','utf8');
const sourceSHA256 = createHash('sha256').update(builderSource).digest('hex');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--mute-audio'] });
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
  const errors = [], assets = [], failedHTTP = [];
  page.on('response', r => { if (r.status() >= 400) failedHTTP.push({url:new URL(r.url()).pathname,status:r.status()}); });
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::')) console.log('CONSOLE', m.text().slice(0,600)); });
  page.on('pageerror', e => { errors.push(e.message); console.log('PAGEERROR', e.message); });
  page.on('response', r => { if (/\.(glb|webp|mp3)(\?|$)/.test(r.url())) assets.push({ url: new URL(r.url()).pathname, status: r.status() }); });
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(u.hostname) || u.pathname.startsWith('/api/')) return route.abort();
    if (lookSource && u.pathname === '/js/look.js') return route.fulfill({contentType:'text/javascript',body:lookSource});
    if (u.pathname === '/js/map_amazonia.js') return route.fulfill({ contentType: 'text/javascript', body: builderSource });
    return route.continue();
  });
  await page.addInitScript(q => { localStorage.setItem('awpbr_settings', JSON.stringify({ quality: q, bots: 4, vol: 0, speech: false })); }, quality);
  await page.goto(`${process.env.BASE || 'http://127.0.0.1:8146'}/?debug=1&map=amazonia&auto=B,sertanejo&perfilauto=0${process.env.EXTRA_QUERY || ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
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
      if (!o.isMesh || !o.material.name.includes('Árvore de mata')) return;
      for (let i = 0; i < (o.isInstancedMesh ? o.count : 1); i++) {
        if (o.isInstancedMesh) { o.getMatrixAt(i, matrix); matrix.premultiply(o.matrixWorld); } else matrix.copy(o.matrixWorld);
        origin.setFromMatrixPosition(matrix);
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
  if (process.env.AUDIO === '1') {
    await page.evaluate(()=>{const g=window.__game;g.sfx.ensure();g.soundscape?.update(.016,g.player.pos);});
    await page.waitForFunction(()=>{const s=window.__game.soundscape?.state;return s && s.loops.length+s.failed.size>=s.config.loops.length;},null,{timeout:30000});
  }
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
  for (const cam of process.env.COMBAT_ONLY === '1' ? [] : cameras) {
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
    if (cam.name === 'canal' && process.env.WATER_DIAG === '1') {
      await page.evaluate(() => { const g=window.__game; const w=g.scene.userData.waters[0]; window.__waterDiag=w; w.mesh.visible=false; g.renderer.render(g.scene,g.camera); });
      await page.screenshot({ path:`${out}/canal-sem-agua.png` });
      await page.evaluate(() => { const g=window.__game, w=window.__waterDiag; w.mesh.visible=true; const u=w.mesh.material.uniforms;
        window.__foamOld={a:u.uEspumaFaixa.value,b:u.uEspumaMiolo.value,c:u.uCorEspuma.value.clone()};
        u.uEspumaFaixa.value=.001; u.uEspumaMiolo.value=.0001; u.uCorEspuma.value.setHex(0x302f22); g.renderer.render(g.scene,g.camera); });
      await page.screenshot({ path:`${out}/canal-espuma-discreta.png` });
      await page.evaluate(() => { const u=window.__waterDiag.mesh.material.uniforms, old=window.__foamOld; u.uEspumaFaixa.value=old.a;u.uEspumaMiolo.value=old.b;u.uCorEspuma.value.copy(old.c); });
      const waterUniforms = await page.evaluate(() => {
        const u=window.__waterDiag.material.uniforms;
        const keys=['uFogD','uFogCor','uCorRasa','uCorFunda','uCeuCor','uSolCor','uDepthOn'];
        const data={}; for(const k of keys)data[k]=u[k].value?.toArray?.() ?? u[k].value;
        window.__waterSaved={fog:u.uFogD.value, sol:u.uSolCor.value.clone(), rasa:u.uCorRasa.value.clone()};
        u.uFogD.value=0;u.uSolCor.value.setHex(0);window.__game.renderer.render(window.__game.scene,window.__game.camera);
        return data;
      });
      writeFileSync(`${out}/water-uniforms.json`,JSON.stringify(waterUniforms,null,2));
      await page.screenshot({path:`${out}/canal-sem-fog-glint-agua.png`});
      await page.evaluate(()=>{const u=window.__waterDiag.material.uniforms, old=window.__waterSaved;u.uFogD.value=old.fog;u.uSolCor.value.copy(old.sol);u.uCorRasa.value.copy(u.uCorFunda.value);window.__game.renderer.render(window.__game.scene,window.__game.camera);});
      await page.screenshot({path:`${out}/canal-sem-gradiente-agua.png`});
      await page.evaluate(()=>window.__waterDiag.material.uniforms.uCorRasa.value.copy(window.__waterSaved.rasa));
    }
  }
  if (process.env.COMBAT === '1') {
    const combat=[];
    for (const distance of [5,20,40]) {
      const sample=await page.evaluate(async distance=>{
        const THREE=await import('three'),g=window.__game,w=g.world;
        if(!window.__combatSaved)window.__combatSaved=g.bots.map(b=>({b,visible:b.mesh.group.visible,pos:b.mesh.group.position.clone(),rot:b.mesh.group.rotation.clone()}));
        for(const b of g.bots)b.mesh.group.visible=false;
        const b=g.bots.find(b=>b.team!==g.playerTeam); if(!b)throw new Error('sem inimigo real para contraste');
        const a=new THREE.Vector3(0,w.groundHeightAt(0,32,0),32), target=new THREE.Vector3(0,w.groundHeightAt(0,32-distance,0),32-distance);
        const shifted=target.clone();g._collide(shifted,.38);
        b.mesh.group.visible=true;b.mesh.group.position.copy(target);b.mesh.group.rotation.set(0,Math.PI,0);if(b.mesh.isGLB)b.mesh.ctrl.revive();
        g.scene.updateMatrixWorld(true);g.camera.position.copy(a).add(new THREE.Vector3(0,1.62,0));g.camera.lookAt(target.clone().add(new THREE.Vector3(distance*.09,1,0)));g.camera.updateMatrixWorld(true);
        const head=target.clone().add(new THREE.Vector3(0,1.4,0)), dir=head.clone().sub(g.camera.position), ray=new THREE.Raycaster(g.camera.position,dir.clone().normalize(),0,dir.length());
        const blocked=ray.intersectObjects(w.occluders,true).length>0;
        const screen=head.clone().project(g.camera);
        g.renderer.render(g.scene,g.camera);
        return {distance,from:a.toArray(),target:target.toArray(),enemyGLB:b.mesh.isGLB,team:b.team,blocked,collisionShift:shifted.distanceTo(target),headPixels:[(screen.x+1)*768,(1-screen.y)*512]};
      },distance);
      await page.screenshot({path:`${out}/combat-${distance}m.png`});combat.push(sample);
    }
    writeFileSync(`${out}/combat.json`,JSON.stringify(combat,null,2));
    await page.evaluate(()=>{for(const {b,visible,pos,rot} of window.__combatSaved){b.mesh.group.visible=visible;b.mesh.group.position.copy(pos);b.mesh.group.rotation.copy(rot);}});
  }
  if (process.env.WALK === '1'  && !await walkAmazonia(page,out)) process.exitCode = 1;
  const runtime = await page.evaluate(() => {
    const g = window.__game, w = g.world;
    const meshes = []; w.root.traverse(o => { if (o.isMesh) meshes.push({ name: o.name, type: o.geometry.type, count: o.count || 1, triangles: (o.geometry.index?.count || o.geometry.attributes.position.count) / 3, transparent: o.material.transparent, alphaTest: o.material.alphaTest, shadow: o.castShadow }); });
    return { meshes, metadata: w.amazonia, spawns: w.spawns, ctf: w.ctfPoints, pickups: w.pickups.map(p => ({x:p.x,z:p.z,kind:p.kind})), colliders: w.colliders, waters: g.scene.userData.waters?.length, animals: w.ambience?.animals.map(a => a.type), sound: g.soundscape ? {started:g.soundscape.state.started, failed:[...g.soundscape.state.failed], decoded:[...g.soundscape.state.buffers].map(([src,b])=>({src,duration:b.duration,channels:b.numberOfChannels})), loops:g.soundscape.state.loops.map(l=>({src:l.src,pos:l.pos,radius:l.radius,vol:l.vol})), duckBus:!!g.sfx.duckBus} : null, heap: performance.memory?.usedJSHeapSize };
  });
  writeFileSync(`${out}/capture.json`, JSON.stringify({ setup, sourceSHA256, lookSource:process.env.LOOK_SOURCE || null, failedHTTP, mapSource:process.env.MAP_SOURCE || null, launchRetried, cameras: metrics, runtime, errors, assets, performanceApproval: 'PENDING: no exclusive GPU window' }, null, 2));
  console.log(JSON.stringify({ out, errors, assets: assets.length, cameras: metrics.map(m => ({name:m.name,calls:m.calls,triangles:m.triangles})) }));
  }
} finally { await browser.close(); }
