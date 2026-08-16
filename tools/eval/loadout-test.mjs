// Loadout + spawn-rack verification: starts a match as mst (charWeapon 'ak') and checks:
//  1. player spawns holding charWeapon (not AWP)
//  2. primary/secondary slot memory is set
//  3. the full arsenal is dropped at the respawn (drops[] near the player's spawn)
//  4. switching 2 then 1 returns to the primary (slot memory, not AWP reset)
// Usage: node tools/eval/loadout-test.mjs [char]
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const CHAR = process.argv[2] || 'mst';
const BASE = process.env.BASE || 'http://localhost:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 620 } });
let errors = 0;
page.on('console', m => { if (m.type() === 'error') { errors++; console.error('[page-err]', m.text()); } });
page.on('pageerror', e => { errors++; console.error('[pageerror]', e.message); });
await page.goto(`${BASE}/?debug=1&auto=E,${CHAR}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60000 });

const r = await page.evaluate(() => {
  const g = window.__game, p = g.player;
  const spawnZ = g.world.spawns[p.team][0].z;
  const nearSpawn = g.drops.filter(d => Math.abs(d.z - spawnZ) < 12);
  return {
    weapon: p.weapon, primary: p.primary, secondary: p.secondary,
    charWeaponExpect: 'ak', team: p.team,
    totalDrops: g.drops.length, dropsNearSpawn: nearSpawn.length,
    rackWeapons: nearSpawn.map(d => d.weapon),
  };
});
console.log('spawn:', JSON.stringify(r, null, 1));

// slot memory: switch to 2 (pistol) then 1 (should return to primary, NOT awp)
const slot = await page.evaluate(() => {
  const g = window.__game, p = g.player;
  g._switchWeapon(p.secondary); const after2 = p.weapon;
  g._switchWeapon(p.primary); const after1 = p.weapon;
  return { after2, after1, primary: p.primary };
});
console.log('slot memory:', JSON.stringify(slot));

// screenshot the spawn area (should show the weapon rack)
await page.evaluate(() => { const g = window.__game, p = g.player; const s = g.world.spawns[p.team][0]; p.pos.set(s.x, 0, s.z); p.pitch = -0.1; p.yaw = p.team === 'E' ? Math.PI : 0; });
await page.waitForTimeout(150);
await page.screenshot({ path: '/tmp/spawn-rack.png' });
console.log('shot -> /tmp/spawn-rack.png | console errors:', errors);
await browser.close();
process.exit(errors ? 1 : 0);
