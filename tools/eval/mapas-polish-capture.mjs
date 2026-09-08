import { chromium } from 'playwright';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const out = process.argv[2] || 'artifacts/mapas-polish/baseline';
const ids = (process.argv[3] || 'parque_treta,penitenciaria').split(',');
const base = process.env.BASE || 'http://127.0.0.1:8192';
const quality = process.env.QUALITY || 'med';
const baselineRef = process.env.BASELINE_REF;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--mute-audio', '--no-sandbox'] });
const results = [];
try {
  for (const id of ids) {
    const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
    await context.addInitScript(q => localStorage.setItem('awpbr_settings', JSON.stringify({ quality:q, bots:4 })), quality);
    const page = await context.newPage();
    if(baselineRef) await page.route(/\/js\/map_(parque|penitenciaria)\.js(?:\?|$)/, route => {
      const file = `public${new URL(route.request().url()).pathname}`;
      const body = execFileSync('git',['show',`${baselineRef}:${file}`],{encoding:'utf8'});
      return route.fulfill({status:200,contentType:'text/javascript',body});
    });
    const errors = new Set(), failed = new Set();
    page.on('pageerror', e => errors.add(e.stack || e.message));
    page.on('response', r => { if (r.status() >= 400) failed.add(`${r.status()} ${new URL(r.url()).pathname}`); });
    const started = Date.now();
    try {
      await page.goto(`${base}/?debug=1&map=${id}&auto=E,lula&perfilauto=0`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 120000 });
      const liveMs = Date.now() - started;
      await page.waitForFunction(async id => {
        const {MAPS}=await import('/js/maps.js'); const {hasProp}=await import('/js/mapprops.js');
        return (MAPS[id].props||[]).every(hasProp);
      },id,{timeout:45000});
      await page.waitForTimeout(1500);
      const views = id === 'parque_treta' ? [
        ['south', [3,1.7,-32], [0,3,0]], ['west', [-27,1.7,-12],[-10,3,6]],
        ['coreto',[-18,1.7,-14],[-25,3,-22.5]],
      ] : id === 'penitenciaria' ? [
        ['south', [0,1.7,-38],[0,4,15]], ['yard', [12,1.7,0],[-30,6,10]],
        ['galeria',[8,1.7,1],[0,3,-10]], ['campo',[14,1.7,29],[0,1,20]],
      ] : id === 'campomorro' ? [
        ['field-mouth',[-23,1.45,0],[0,1,0]], ['field-eye',[-4,1.57,5],[18,1.57,-2]],
        ['galpao-eye',[30.5,2.65,-23.5],[22,2.65,-20.5]], ['overview',[0,18,28],[0,-.2,-4]],
      ] : [];
      const viewsMetrics = [];
      for (const [label, from, to] of views) {
        const metrics = await page.evaluate(({from,to}) => {
          const g=window.__game; g.paused=true;
          document.getElementById('crash-overlay')?.click();
          g.camera.position.set(...from); g.camera.lookAt(...to);
          g.scene.updateMatrixWorld(true);
          const info=g.renderer.info;info.autoReset=false;info.reset();g.renderer.render(g.scene,g.camera);
          const metrics={calls:info.render.calls,triangles:info.render.triangles,textures:info.memory.textures,geometries:info.memory.geometries};
          info.autoReset=true;return metrics;
        }, {from,to});
        await page.screenshot({path:`${out}/${id}-${label}.png`}); viewsMetrics.push({label,from,to,...metrics});
      }
      await page.evaluate(() => { window.__game.paused=false; });
      const live = await page.evaluate(async () => {
        const times = []; let last = performance.now();
        // Somar TODOS os passes por quadro: sem autoReset, info acumula ate a leitura.
        // Ler info.render.calls sem isto devolve so o passe final do bloom (calls=1).
        const r0 = window.__game.renderer; r0.info.autoReset = false; r0.info.reset();
        let frames = 0;
        await new Promise(resolve => { const end = last + 30000; function tick(now) {
          times.push(now-last); last=now; frames++; if (now<end) requestAnimationFrame(tick); else resolve();
        } requestAnimationFrame(tick); });
        times.sort((a,b)=>a-b); const g = window.__game, r=g.renderer;
        const callsTotal = r.info.render.calls, trianglesTotal = r.info.render.triangles;
        r.info.autoReset = true;
        const p50 = times[Math.floor(times.length*.5)];
        return { id:g._mapId, state:g.state, frameMsP50:p50,
          frameMsP95:times[Math.floor(times.length*.95)], frames,
          calls: frames ? +(callsTotal/frames).toFixed(1) : null,
          triangles: frames ? Math.round(trianglesTotal/frames) : null,
          callsTotal, trianglesTotal,
          refreshHzP50: p50 ? +(1000/p50).toFixed(1) : null,
          textures:r.info.memory.textures, geometries:r.info.memory.geometries,
          heapMB:performance.memory?.usedJSHeapSize/1048576 };
      });
      await page.screenshot({ path:`${out}/${id}-live.png` });
      results.push({id,quality,baselineRef:baselineRef||null,liveMs,...live,views:viewsMetrics,errors:[...errors],failed:[...failed]});
      console.log(JSON.stringify({id,liveMs,frameMsP50:live.frameMsP50,errors:errors.size,failed:failed.size}));
    } catch(e) { results.push({id,fatal:e.message,errors:[...errors],failed:[...failed]}); console.log(`${id}: ${e.message.split('\n')[0]}`); }
    fs.writeFileSync(`${out}/browser-${quality}.json`,JSON.stringify(results,null,2)+'\n');
    await context.close();
  }
} finally { await browser.close(); }
if(results.some(r=>r.fatal)) process.exitCode=1;
