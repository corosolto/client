// In-game locomotion capture: starts a real match (?debug=1&auto=...), attaches the
// camera to a walking bot every frame, and screenshots frames for video review.
// Also samples ground speed vs animation state each frame (slip telemetry).
//
// Usage: node tools/eval/game-capture.mjs [outDir] [seconds] [team,char] [botIdx]
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/gameframes';
const SECS = parseFloat(process.argv[3] || '10');
const AUTO = process.argv[4] || 'P,mst';
const BOTIDX = parseInt(process.argv[5] || '0', 10);
const BASE = process.env.BASE || 'http://localhost:8123';
const FPS = 12, FRAMES = Math.round(SECS * FPS);

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
page.on('console', m => { if (m.type() === 'error') console.error('[page-err]', m.text()); });
page.on('pageerror', e => console.error('[pageerror]', e.message));

await page.goto(`${BASE}/?debug=1&auto=${encodeURIComponent(AUTO)}&camd=${process.env.CAMD || 3.2}&camh=${process.env.CAMH || 1.25}&side=${process.env.SIDE || 0}&front=${process.env.FRONT || 0}`, { waitUntil: 'load' });
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });

// hide HUD overlays that block the view
await page.addStyleTag({ content: '#hud,.screen{display:none!important}' });

// Pick a bot and drive the PLAYER as a follow-cam (game loop owns the camera, so we
// puppet the player state it reads: pos/yaw/pitch). Player is made unkillable and the
// first-person viewmodel is hidden.
await page.evaluate((idx) => {
  const g = window.__game;
  window.__follow = g.bots[idx] || g.bots[0];
  if (g.player) g.player.hp = 1e9;
  if (g.vm && g.vm.root) g.vm.root.visible = false;
}, BOTIDX);

const telemetry = [];
for (let i = 0; i < FRAMES; i++) {
  const t = await page.evaluate(() => {
    const g = window.__game, b = window.__follow, p = g.player;
    if (!b || !p) return null;
    const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw);
    const D = parseFloat(new URLSearchParams(location.search).get('camd')) || 3.2;
    const H = parseFloat(new URLSearchParams(location.search).get('camh')) || 1.25;
    const SIDE = parseFloat(new URLSearchParams(location.search).get('side')) || 0;
    const FRONT = parseFloat(new URLSearchParams(location.search).get('front')) || 0;
    // side=1: camera on the bot's right flank; front=1: camera ahead facing back at it
    const ox = FRONT ? fx * D : (SIDE ? fz * D : -fx * D);
    const oz = FRONT ? fz * D : (SIDE ? -fx * D : -fz * D);
    p.pos.set(b.pos.x + ox, b.pos.y + H, b.pos.z + oz);
    if (p.vel) p.vel.set(0, 0, 0);
    p.yaw = FRONT ? Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z) : (SIDE ? Math.atan2(b.pos.x - p.pos.x, b.pos.z - p.pos.z) : b.yaw);
    p.pitch = SIDE || FRONT ? -0.12 : -0.28;
    p.hp = 1e9; if (p.alive === false) p.alive = true;
    if (g.vm && g.vm.models) for (const k in g.vm.models) g.vm.models[k].visible = false;
    const m = b.mesh;
    const curName = m && m.isGLB && m.ctrl && m.ctrl.cur ? (Object.keys(m.ctrl.actions).find(k => m.ctrl.actions[k] === m.ctrl.cur) || '?') : 'box';
    return {
      t: +g.time.toFixed(2), alive: b.alive, hasTarget: !!b.target,
      cur: curName,
      ts: m && m.isGLB && m.ctrl && m.ctrl.cur ? +m.ctrl.cur.timeScale.toFixed(2) : 0,
    };
  });
  telemetry.push(t);
  await page.screenshot({ path: `${OUT}/f${String(i).padStart(4, '0')}.png` });
  await page.waitForTimeout(1000 / FPS);
}
writeFileSync(`${OUT}/telemetry.json`, JSON.stringify(telemetry.filter(Boolean), null, 1));
console.log('frames ->', OUT);
const states = telemetry.filter(Boolean).map(x => `${x.cur}@${x.ts}${x.hasTarget ? '*' : ''}`);
console.log('states:', states.filter((v, i) => i % 15 === 0).join(' '));
await browser.close();
