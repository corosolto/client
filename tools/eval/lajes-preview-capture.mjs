import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const out = 'artifacts/lajes-visual/v7/preview'; fs.mkdirSync(out, { recursive: true });
try {
 const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 await page.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', bots: 0, vol: 0, speech: false })));
 await page.goto('http://127.0.0.1:8147/?debug=1&auto=P,mst&map=lajes&perfilauto=0&ctf=1');
 await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
 await page.waitForTimeout(2500);
 const recorded = await page.evaluate(async () => {
  const g = window.__game; g.paused = true; if(g.vmScene)g.vmScene.visible=false; if(g.vm?.root)g.vm.root.visible=false;
  if (g._mapId !== 'lajes') throw Error('Mapa errado');
  for (const bot of g.bots) bot.mesh.visible = false;
  g.renderer.setSize(960, 640, false); g.camera.aspect = 1.5; g.camera.fov = 57; g.camera.updateProjectionMatrix();
  const render = t => {
   const angle = .58 + .22 * Math.sin(t / 12 * Math.PI * 2);
   g.camera.position.set(Math.sin(angle) * 48, 35 + 2 * Math.sin(t / 12 * Math.PI * 2), Math.cos(angle) * 48);
   g.camera.lookAt(0, 1, 0); g.camera.updateMatrixWorld(true);
   g.world.ambience.paused = false; g.world.ambience.update(1 / 30, g.player.pos); g.renderer.render(g.scene, g.camera);
  };
  render(0);
  const poster = g.renderer.domElement.toDataURL('image/jpeg', .91);
  const stream = g.renderer.domElement.captureStream(24), chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 1600000 });
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise(resolve => recorder.onstop = resolve); recorder.start();
  const start = performance.now();
  await new Promise(resolve => {
   function frame() { const t = (performance.now() - start) / 1000; render(Math.min(t, 12)); if (t < 12) requestAnimationFrame(frame); else resolve(); }
   requestAnimationFrame(frame);
  });
  recorder.stop(); await done; stream.getTracks().forEach(t => t.stop());
  return { poster, video: Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer())), map: g._mapId, source: g.world.ambience.lajesSantosDumont?.snapshot(), quality: g.settings.quality };
 });
 fs.mkdirSync('public/video/map-previews', { recursive: true });
 fs.writeFileSync('public/img/map-previews/lajes.jpg', Buffer.from(recorded.poster.split(',')[1], 'base64'));
 fs.writeFileSync('public/video/map-previews/lajes.webm', Buffer.from(recorded.video));
 fs.writeFileSync(`${out}/capture.json`, JSON.stringify({ map: recorded.map, quality: recorded.quality, source: recorded.source, errors, viewport: [960, 640], duration: 12, videoBytes: recorded.video.length, camera: 'orbit radius48 y35 target0,1,0 FOV57' }, null, 2));
 console.log(JSON.stringify({ map: recorded.map, videoBytes: recorded.video.length, errors }));
 if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
