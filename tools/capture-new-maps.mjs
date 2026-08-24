// Captura 3:2 no jogo real das cinco arenas novas. Os bots percorrem o mapa por alguns
// segundos; a câmera usa o par de posições vivas mais distante para mostrar duas zonas.
// Uso: node tools/capture-new-maps.mjs [saida]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/newmaps-game';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const MAPS = process.env.ONLY
  ? process.env.ONLY.split(',').map((id) => id.trim()).filter(Boolean)
  : ['escadao', 'campomorro', 'lajes', 'corrego', 'mansao'];
mkdirSync(OUT, { recursive: true });
const root = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${root}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const report = [];

for (const map of MAPS) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`);
  });
  const started = Date.now();
  await page.goto(`${BASE}/?debug=1&auto=P,mst&map=${map}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.addStyleTag({ content: '#hud,#crosshair,#damage-vignette{display:none!important}' });
  await page.evaluate(() => {
    const game = window.__game;
    game.player.hp = 1e9;
    game.player.pos.set(0, -100, 0);
    for (const bot of game.bots) bot.hp = 1e9;
    if (game.vmScene) game.vmScene.visible = false;
    if (game.vm?.root) game.vm.root.visible = false;
    if (game.drops) for (const drop of game.drops) drop.mesh.visible = false;
  });
  await page.waitForTimeout(5000);
  const positions = await page.evaluate(() => {
    const bots = window.__game.bots.filter((bot) => bot.alive).map((bot) => ({ x: bot.pos.x, y: bot.pos.y, z: bot.pos.z }));
    if (!bots.length) return [{ x: 0, y: 1.7, z: 0 }];
    let pair = [bots[0], bots[Math.min(1, bots.length - 1)]], best = -1;
    for (let i = 0; i < bots.length; i++) for (let j = i + 1; j < bots.length; j++) {
      const dx = bots[i].x - bots[j].x, dz = bots[i].z - bots[j].z;
      const distance = dx * dx + dz * dz;
      if (distance > best) { best = distance; pair = [bots[i], bots[j]]; }
    }
    return pair;
  });
  // O par móvel cobre gameplay; este ponto fixo prova o landmark que motivou o A/B.
  if (map === 'escadao') positions.push({ x: -8, y: 6.12, z: -28 });
  await page.evaluate(() => {
    const game = window.__game;
    for (const bot of game.bots) { bot.pos.set(0, -80, 0); bot.vel?.set?.(0, 0, 0); }
  });
  for (let location = 0; location < positions.length; location++) {
    for (const [index, yaw] of [-2.2, -0.8, 0.8, 2.2].entries()) {
      await page.evaluate(({ position, yaw }) => {
        const game = window.__game;
        game.player.pos.set(position.x, position.y, position.z);
        game.player.yaw = yaw;
        game.player.pitch = 0.03;
        game.player.vel?.set?.(0, 0, 0);
        if (game.vmScene) game.vmScene.visible = false;
        if (game.vm?.root) game.vm.root.visible = false;
        if (game.drops) for (const drop of game.drops) drop.mesh.visible = false;
      }, { position: positions[location], yaw });
      await page.waitForTimeout(180);
      await page.screenshot({ path: `${OUT}/${map}-p${location}-${index}.png`, timeout: 120000 });
    }
  }
  const metrics = await page.evaluate(() => {
    const info = window.__game.renderer?.info;
    return {
      calls: info?.render?.calls ?? null,
      triangles: info?.render?.triangles ?? null,
      geometries: info?.memory?.geometries ?? null,
      textures: info?.memory?.textures ?? null,
      programs: info?.programs?.length ?? null,
    };
  });
  report.push({ map, bootSeconds: +((Date.now() - started) / 1000).toFixed(2), positions, metrics, errors: errors.slice(0, 8) });
  console.log(map, metrics, errors.length ? `${errors.length} erro(s)` : 'sem erros');
  await page.close();
}
await browser.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(`capturas 3:2 -> ${OUT}`);
