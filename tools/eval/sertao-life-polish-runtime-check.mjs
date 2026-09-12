import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:8149';
const OUT = process.env.ARTIFACT_DIR || 'artifacts/sertao-astra/life-polish';
const mut = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
const targets = { 'placa-western': 'LP1', 'aves-paradas': 'LP2', 'horizonte-ausente': 'LP3' };
if (mut && !targets[mut]) throw Error('Mutante desconhecido');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, ...args) {
      (this.canvas.drawnTexts ||= []).push(text); return original.call(this, text, ...args);
    };
  });
  if (mut) await page.route('**/js/map_velho_oeste.js*', async route => {
    const response = await route.fetch(), source = await response.text();
    const replacements = {
      'placa-western': ["addSign('CANUDOS', 'POP. 16.693 • IBGE 2025'", "addSign('WESTERN', 'POP. 16.693 • IBGE 2025'"],
      'aves-paradas': ['distantBirds.update(dt);', '/* voo removido pelo mutante */'],
      'horizonte-ausente': ['createSertaoHorizon(root, { low, leafMaterial: folha })', 'createSertaoHorizon(root, { low, leafMaterial: folha, enabled: false })'],
    };
    const body = source.replace(...replacements[mut]);
    if (body === source) throw Error('Mutante não aplicado');
    await route.fulfill({ response, body });
  });
  await page.goto(`${BASE}/mapview.html?map=velho_oeste&capture=1&hud=0`);
  await page.waitForFunction(() => window.__gworld?.ambience?.ready, null, { timeout: 90000 });
  const measured = await page.evaluate(() => {
    const w = __gworld, signs = [];
    w.root.traverse(o => { if (o.name === 'sertao-placa-canudos') signs.push(o.material.map.image.drawnTexts); });
    const bird = w.distantBirds.birds[0], before = bird.position.clone();
    w.update(2, 2);
    const delta = before.distanceTo(bird.position), horizon = w.horizon.report();
    const solid = w.occluders.some(o => w.horizon.group.children.includes(o) || w.distantBirds.group.children.includes(o));
    return { signs, delta, horizon, solid, birds: w.distantBirds.report() };
  });
  const checks = {
    LP1: measured.signs.length === 2 && measured.signs.every(s => s.includes('CANUDOS') && s.includes('POP. 16.693 • IBGE 2025')),
    LP2: measured.birds.birds === 4 && measured.delta > 1 && !measured.solid,
    LP3: measured.horizon.plants >= 25 && measured.horizon.heroTrees === 6 && measured.horizon.missingHeroes === 0 && measured.horizon.meshes <= 4 && measured.horizon.triangles <= 48000,
    LP4: errors.length === 0,
  };
  if (!mut) for (const [name, from, to] of [
    ['canudos',[0,2.3,33],[0,6.4,46]],
    ['horizonte',[25,1.62,5],[49,8,24]],
    ['aves',[-14,1.62,37],[-14,26,90]],
  ]) {
    await page.evaluate(({from,to}) => { MAPEVAL.cam.fov=55; MAPEVAL.cam.updateProjectionMatrix(); MAPEVAL.view(from,to); },{from,to});
    await page.screenshot({path:`${OUT}/${name}.png`});
  }
  const failed = Object.keys(checks).filter(id => !checks[id]);
  writeFileSync(`${OUT}/report${mut ? `-${mut}` : ''}.json`,JSON.stringify({checks,measured,errors,failed},null,2));
  console.log(JSON.stringify({checks,measured,failed}));
  process.exitCode = mut ? +(failed.length !== 1 || failed[0] !== targets[mut]) : +!!failed.length;
} finally { await browser.close(); }
