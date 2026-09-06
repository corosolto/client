// Captura o Game real; recibo liga o clipe servido às fontes e aos assets carregados.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
const pw = await import(pathToFileURL(`${execFileSync('npm',['root','-g']).toString().trim()}/playwright/index.js`));
const chromium = pw.chromium || pw.default.chromium;
const base = process.env.BASE || 'http://127.0.0.1:8156';
const out = 'artifacts/amazonia-visual/hover-capture';
const dest = 'public/img/map-previews', frames = 144, fps = 24;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
mkdirSync(`${out}/frames`, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const sources = {}, errors = [], pending = [], failedHTTP = [];
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => {
    const u = new URL(r.url()), file = `public${u.pathname}`;
    if (u.origin !== new URL(base).origin) return;
    if (r.status() >= 400 && !u.pathname.startsWith('/api/')) failedHTTP.push({ path: u.pathname, status: r.status() });
    if (/\.(js|glb|webp|png|jpg)$/.test(u.pathname) && existsSync(file))
      pending.push(r.body().then(bytes => { sources[file] = sha(bytes); }).catch(() => {}));
  });
  await page.route('**/*', r => { const u=new URL(r.request().url()); return u.origin!==new URL(base).origin || u.pathname.startsWith('/api/') ? r.abort() : r.continue(); });
  await page.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality:'med',bots:4,vol:0,speech:false })));
  await page.goto(`${base}/?debug=1&map=amazonia&auto=B,sertanejo&perfilauto=0`, { waitUntil:'domcontentloaded', timeout:120000 });
  const waitForBoot=()=>page.waitForFunction(() => window.__game?.state === 'live' || !document.getElementById('launch-error')?.classList.contains('hidden'), null, { timeout:240000 });
  await waitForBoot();
  for(let attempt=0;attempt<2 && await page.locator('#launch-error').isVisible();attempt++){
    await page.screenshot({path:`${out}/boot-failure.png`});
    console.log('BOOT: retry through UI');
    await page.locator('#launch-error-retry').click();
    await waitForBoot();
  }
  if(await page.locator('#launch-error').isVisible()) throw Error('captura inválida: aviso de falha de boot');
  console.log('Game live; guard hidden');
  await page.waitForFunction(() => window.__game.world.barco.children.length > 0 && window.__game.world.skyLife.stats().glb === 4, null, { timeout:90000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const g=window.__game;
    g.update=()=>{};
    g.vm.root.visible=false;
    g.world.ambience?.reset?.();
    g.camera.fov=65; g.camera.updateProjectionMatrix();
  });
  for (let i=0;i<frames;i++) {
    const png = await page.evaluate(({ i, frames, fps }) => {
      const g=window.__game, phase=i/frames*Math.PI*2, t=6+i/fps;
      g.world.ambience?.update(1/fps,null); g.world.update(1/fps,t);
      g.camera.position.set(-8+Math.sin(phase)*1.5,8,31+(1-Math.cos(phase))*.5);
      g.camera.lookAt(3,2,-5); g.renderer.render(g.scene,g.camera);
      return g.renderer.domElement.toDataURL('image/png');
    }, { i, frames, fps });
    writeFileSync(`${out}/frames/${String(i).padStart(4,'0')}.png`, Buffer.from(png.split(',')[1],'base64'));
    if(i%48===0) console.log(`frame ${i}/${frames}`);
  }
  await Promise.all(pending);
  if(errors.length || failedHTTP.length) throw Error(JSON.stringify({ errors, failedHTTP }));
} finally { await browser.close(); }
const poster=`${dest}/amazonia.jpg`,video=`${dest}/amazonia.mp4`;
await sharp(`${out}/frames/0000.png`).resize(960,640).jpeg({quality:88}).toFile(poster);
execFileSync(process.env.FFMPEG || 'ffmpeg',['-y','-framerate',String(fps),'-i',`${out}/frames/%04d.png`,'-vf','scale=960:640','-c:v','libx264','-preset','slow','-crf','25','-pix_fmt','yuv420p','-an','-movflags','+faststart',video],{stdio:['ignore','ignore','pipe']});
const media=Object.fromEntries(Object.entries({poster,video}).map(([key,path])=>[key,{path,bytes:readFileSync(path).length,sha256:sha(readFileSync(path))}]));
const receipt={kind:'webgl-game-capture',map:'amazonia',capturedAt:new Date().toISOString(),base,main:execFileSync('git',['merge-base','HEAD','origin/main']).toString().trim(),worktreeCommit:execFileSync('git',['rev-parse','HEAD']).toString().trim(),sourcesAreWorkingTree:true,viewport:{width:1536,height:1024},output:{width:960,height:640,fps,frames,seconds:frames/fps},camera:{fov:65,from:[-8,8,31],look:[3,2,-5],motion:'closed orbit, radiusX 1.5m/radiusZ .5m'},sources,media,errors,failedHTTP};
writeFileSync(`${dest}/amazonia.capture.json`,JSON.stringify(receipt,null,2)+'\n');
writeFileSync('public/js/map_preview_media.js',`export const MAP_PREVIEW_MEDIA = Object.freeze(${JSON.stringify({amazonia:{poster:media.poster.sha256.slice(0,12),video:media.video.sha256.slice(0,12)}})});\n`);
console.log(JSON.stringify(media));
