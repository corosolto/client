// Recaptura 1 mapa com teleporte pra coordenada fixa (miolo conhecido do mapa).
// Uso: node tools/eval/g2ui-map-tp.mjs piscina_treta 0,23 [-2.4..2.4]
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const OUT = process.env.OUT || '/tmp/gauntlet/g2ui-maps';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const MAP = process.argv[2] || 'piscina_treta';
const POS = (process.argv[3] || '0,1.7,23').split(',').map(Number);
const [TX, TY, TZ] = POS.length === 3 ? POS : [POS[0], 1.7, POS[1]];
const [VW, VH] = (process.env.VIEWPORT || '900,900').split(',').map(Number);
const PITCH = Number(process.env.PITCH || 0.06);
const YAWS = (process.env.YAWS || '-2.4,-1.8,-1.2,-0.6,0,0.6,1.2,1.8,2.4').split(',').map(Number);
mkdirSync(OUT, { recursive: true });
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1&auto=P,mst&map=${MAP}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 180000 });
await page.addStyleTag({ content: '#hud{display:none!important}' });
await page.evaluate(([tx, ty, tz, pitch]) => {
  const g = window.__game;
  const mute = (o) => { try { Object.defineProperty(o, 'visible', { get: () => false, set: () => {}, configurable: true }); } catch {} };
  for (const b of g.bots) { b.pos.set(0, -80, 0); b.hp = 1e9; if (b.mesh?.group) mute(b.mesh.group); }
  g.player.hp = 1e9;
  g.player.pos.set(tx, ty, tz);
  g.player.pitch = pitch;
  if (g.vmScene) g.vmScene.visible = false;
  if (g.drops) for (const d of g.drops) if (d.mesh) mute(d.mesh);
  window.__tpPin = { tx, ty, tz, pitch, yaw: 0 };
  const pin = () => {
    const p = window.__game?.player, q = window.__tpPin;
    if (p && q) { p.pos.set(q.tx, q.ty, q.tz); p.pitch = q.pitch; p.yaw = q.yaw; p.vel?.set?.(0, 0, 0); }
    requestAnimationFrame(pin);
  };
  requestAnimationFrame(pin);
}, [TX, TY, TZ, PITCH]);
await page.waitForTimeout(500);
for (const yaw of YAWS) {
  await page.evaluate((y) => {
    const g = window.__game;
    window.__tpPin.yaw = y; g.player.yaw = y; g.player.pitch = window.__tpPin.pitch; g.player.vel?.set?.(0, 0, 0);
    if (g.vmScene) g.vmScene.visible = false;
    if (g.vm?.root) g.vm.root.visible = false;
    if (g.drops) for (const d of g.drops) d.mesh.visible = false;   // racks spawnam DEPOIS do live
  }, yaw);
  await page.waitForTimeout(220);
  await page.screenshot({ path: `${OUT}/${MAP}-t${yaw}.png` });
}
console.log('tp-shots ok', MAP, TX, TY, TZ, `${VW}x${VH}`);
await browser.close();
