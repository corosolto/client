// Bot route-spread capture: parks the camera high above the map looking straight down,
// samples every bot's position over a whole round segment, and saves (a) screenshots for
// a video and (b) an SVG trail map. Objective evidence for "rotas variadas": if the
// trails spread across lanes/edges they work; if they stack on one corridor they don't.
// Usage: node tools/eval/bot-routes.mjs [outDir] [seconds]
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/fase3/routes';
const SECS = parseFloat(process.argv[3] || '45');
const BASE = process.env.BASE || 'http://localhost:8123';
const FPS = 8, FRAMES = Math.round(SECS * FPS);

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 760, height: 1080 } });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1&auto=E,mst`, { waitUntil: 'load' });
await page.addStyleTag({ content: 'astro-dev-toolbar,#hud,.screen{display:none!important}' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });
await page.evaluate(() => {
  const g = window.__game;
  if (g.player) g.player.hp = 1e9;
  if (g.vm && g.vm.root) g.vm.root.visible = false;
});

// world reference data for the SVG overlay
const world = await page.evaluate(() => {
  const g = window.__game, W = g.world;
  return {
    bounds: W.bounds,
    nodes: W.waypoints.nodes,
    spawns: { P: W.spawns.E, B: W.spawns.B },
  };
});

const trails = []; // per bot index: [{t,x,z,team,hasTarget}]
for (let i = 0; i < FRAMES; i++) {
  const sample = await page.evaluate(() => {
    const g = window.__game, p = g.player;
    if (!p) return null;
    p.pos.set(0, 78, 0); if (p.vel) p.vel.set(0, 0, 0);
    p.yaw = 0; p.pitch = -1.45;
    p.hp = 1e9; if (p.alive === false) p.alive = true;
    if (g.vm && g.vm.models) for (const k in g.vm.models) g.vm.models[k].visible = false;
    return {
      t: +g.time.toFixed(2), state: g.state,
      bots: g.bots.map((b, bi) => ({ bi, team: b.team, alive: b.alive, x: +b.pos.x.toFixed(2), z: +b.pos.z.toFixed(2), tgt: !!b.target, lane: b.lanePref })),
    };
  });
  if (sample) trails.push(sample);
  if (i % 2 === 0) await page.screenshot({ path: `${OUT}/f${String(i).padStart(4, '0')}.png` });
  await page.waitForTimeout(1000 / FPS);
}
await browser.close();
writeFileSync(`${OUT}/trails.json`, JSON.stringify({ world, samples: trails }, null, 1));

// ---- SVG trail map: x right, z down (map is longer on z). P=warm hues, B=cool hues.
const W = 520, H = 1080, pad = 16;
const bx = world.bounds || { minX: -25.5, maxX: 25.5, minZ: -60, maxZ: 60 };
const sx = (W - 2 * pad) / (bx.maxX - bx.minX), sz = (H - 2 * pad) / (bx.maxZ - bx.minZ);
const X = x => pad + (x - bx.minX) * sx, Z = z => pad + (z - bx.minZ) * sz;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#111">`;
svg += `<rect x="${X(bx.minX)}" y="${Z(bx.minZ)}" width="${(bx.maxX - bx.minX) * sx}" height="${(bx.maxZ - bx.minZ) * sz}" fill="#1a1f1a" stroke="#444"/>`;
for (const n of world.nodes) svg += `<circle cx="${X(n.x)}" cy="${Z(n.z)}" r="1" fill="#333"/>`;
for (const [team, arr] of Object.entries(world.spawns)) for (const s of arr)
  svg += `<rect x="${X(s.x) - 3}" y="${Z(s.z) - 3}" width="6" height="6" fill="${team === 'E' ? '#f66' : '#6af'}"/>`;
const NBOTS = trails.length ? trails[trails.length - 1].bots.length : 0;
for (let bi = 0; bi < NBOTS; bi++) {
  const pts = [];
  let team = 'E', tgt = false;
  for (const s of trails) {
    const b = s.bots.find(o => o.bi === bi);
    if (b && b.alive) { pts.push(`${X(b.x).toFixed(1)},${Z(b.z).toFixed(1)}`); team = b.team; tgt ||= b.tgt; }
  }
  if (pts.length < 2) continue;
  const hue = team === 'E' ? 10 + bi * 14 : 180 + bi * 14;
  svg += `<polyline points="${pts.join(' ')}" fill="none" stroke="hsl(${hue},85%,60%)" stroke-width="2" stroke-opacity="0.9"/>`;
  svg += `<circle cx="${pts[0].split(',')[0]}" cy="${pts[0].split(',')[1]}" r="3.5" fill="hsl(${hue},85%,60%)"/>`;
  const last = pts[pts.length - 1].split(',');
  svg += `<rect x="${last[0] - 3}" y="${last[1] - 3}" width="6" height="6" fill="none" stroke="hsl(${hue},85%,60%)" stroke-width="1.5"/>`;
  svg += `<text x="${+last[0] + 6}" y="${+last[1] + 4}" fill="hsl(${hue},85%,75%)" font-size="11">b${bi}${team}${tgt ? '*' : ''}</text>`;
}
svg += `</svg>`;
writeFileSync(`${OUT}/trails.svg`, svg);
console.log('frames ->', OUT, '| samples:', trails.length, '| bots:', NBOTS);
console.log('svg ->', `${OUT}/trails.svg`);
