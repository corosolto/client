// Node não carrega GLBs: mede fauna servida e fuga dos dois calangos adicionados.
// Caso inicial: 41 amostras dentro de cobertura em oito direções de susto.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:8149';
const OUT = process.env.ARTIFACT_DIR || 'artifacts/sertao-astra/fauna-runtime';
const mut = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
const expected = { 'glb-ausente': 'FA1', 'calango-parede': 'FA2', 'low-cheio': 'FA3', sombra: 'FA4' };
if (mut && !expected[mut]) throw Error('Mutante desconhecido');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const samples = [];
try {
  for (const quality of ['med', 'low']) {
    const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
    await page.addInitScript(q => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: q })), quality);
    if (mut === 'glb-ausente') await page.route('**/models/ambient/calango.glb*', route => route.abort());
    if (mut === 'low-cheio') await page.route('**/js/map_velho_oeste.js*', async route => {
      const response = await route.fetch(), source = await response.text();
      const body = source.replace("map: 'velho_oeste', low,", "map: 'velho_oeste', low: false,");
      if (source === body) throw Error('Mutante não aplicou');
      await route.fulfill({ response, body });
    });
    await page.goto(`${BASE}/mapview.html?map=velho_oeste&hud=0&capture=1`);
    await page.waitForFunction(() => window.__gworld?.ambience?.ready, null, { timeout: 90000 });
    await page.waitForTimeout(1000);
    const sample = await page.evaluate(async ({ mut, quality }) => {
      const { Game } = await import('/js/game.js'), w = __gworld;
      const probe = Object.create(Game.prototype); probe.world = w;
      const calangos = w.ambience.animals.filter(a => a.type === 'calango'), added = calangos.slice(3);
      if (mut === 'calango-parede' && added.length) {
        added[0].origin.set(0, 0, -15.5); added[0].to.set(0, 0, -15.5);
      }
      if (mut === 'sombra') w.faunaFlight.group.children[0].castShadow = true;
      let blocked = 0, maxPush = 0, observed = 0;
      if (quality === 'med') for (let direction = 0; direction < 8; direction++) {
        w.ambience.reset();
        for (const animal of added) {
          animal.alertAt = 0; animal.alertUntil = 1.1; animal.alertOrigin.copy(animal.origin);
          animal.flee.set(Math.sin(direction * Math.PI / 4), 0, Math.cos(direction * Math.PI / 4));
        }
        for (let frame = 0; frame < 900; frame++) {
          w.ambience.update(1 / 60, null);
          for (const animal of added) {
            const position = animal.root.position.clone(); probe._collide(position, .12);
            const delta = position.distanceTo(animal.root.position);
            maxPush = Math.max(maxPush, delta); if (delta > .001) blocked++; observed++;
          }
        }
      }
      const bodies = new Set();
      for (const animal of w.ambience.animals) animal.root.traverse(mesh => { if (mesh.isMesh) bodies.add(mesh); });
      w.faunaFlight.group.traverse(mesh => { if (mesh.isMesh) bodies.add(mesh); });
      const solid = w.occluders.filter(mesh => bodies.has(mesh)).length;
      const casters = [...bodies].filter(mesh => mesh.castShadow).length;
      const before = w.faunaFlight.birds[0]?.position.clone(); w.update(.2, .2);
      const flightMoved = before?.distanceTo(w.faunaFlight.birds[0].position) || 0;
      return { quality, calangos: calangos.length, sources: calangos.map(a => a.source), birds: w.faunaFlight.report(), flightMoved, observed, blocked, maxPush, solid, casters };
    }, { mut, quality });
    samples.push(sample);
    await page.close();
  }
} finally { await browser.close(); }
const [normal, low] = samples;
const checks = {
  FA1: normal.calangos === 5 && normal.sources.every(s => s === 'gltf') && normal.birds.birds === 3 && normal.flightMoved > .01,
  FA2: normal.observed === 14400 && normal.blocked === 0,
  FA3: low.calangos === 1 && low.birds.birds === 1 && low.birds.triangles < normal.birds.triangles,
  FA4: samples.every(s => s.solid === 0 && s.casters === 0),
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
writeFileSync(`${OUT}/report${mut ? `-${mut}` : ''}.json`, JSON.stringify({ checks, samples, failed }, null, 2));
console.log(JSON.stringify({ checks, samples, failed }));
process.exitCode = mut ? +(failed.length !== 1 || failed[0] !== expected[mut]) : +!!failed.length;
