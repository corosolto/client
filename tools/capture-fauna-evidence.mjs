// Captura evidência de GLB de fauna no faunaview.html (frame 3:2 1536×1024, o
// tamanho em que o dono revisa). Uso:
//   sh tools/eval/with-browser-lock.sh node tools/capture-fauna-evidence.mjs <glb> <slug>
// Requer `npm run eval:serve` (porta 8123) no ar.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const [, , GLB, SLUG] = process.argv;
if (!GLB || !SLUG) { console.error('uso: capture-fauna-evidence.mjs <glb> <slug>'); process.exit(1); }
const BASE = process.env.BASE || 'http://localhost:8123';
const OUTDIR = 'tools/eval/asset-evidence/fauna';
mkdirSync(OUTDIR, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new'],
});
const shots = [];
for (const [tag, dist] of [['close', 3.2], ['dist12', 12]]) {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
  const url = `${BASE}/faunaview.html?src=${encodeURIComponent(GLB)}&dist=${dist}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__READY, null, { timeout: 60000 });
  for (let i = 0; i < 20; i++) await page.evaluate(() => window.__STEP?.());
  const out = `${OUTDIR}/${SLUG}-${tag}.png`;
  await page.screenshot({ path: out });
  const meta = await page.evaluate(() => ({ hud: document.getElementById('hud').textContent, size: window.__SIZE, clips: window.__CLIPS, error: window.__ERROR || null }));
  shots.push({ tag, out, ...meta });
  await page.close();
}
await browser.close();
writeFileSync(`${OUTDIR}/${SLUG}-meta.json`, JSON.stringify({ glb: GLB, frame: '1536x1024', shots }, null, 2));
for (const s of shots) console.log(s.tag, '->', s.out, '·', s.hud);
