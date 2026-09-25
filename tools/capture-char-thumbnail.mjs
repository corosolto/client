// Captura o thumbnail pelo mesmo buildCharacterModel da tela de seleção, incluindo
// arma, IK e curl de dedos. Uso:
//   node tools/capture-char-thumbnail.mjs <char> [saida.webp]
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { chromium } from 'playwright';

const inputArgs = process.argv.slice(2);
const CHAR = inputArgs[0];
const explicitOut = inputArgs[1] && !inputArgs[1].startsWith('--') ? inputArgs[1] : null;
const OUT = explicitOut || (CHAR ? `public/img/chars/${CHAR}.webp` : null);
const BASE = process.env.BASE || 'http://localhost:8123';
const DRY_RUN = process.argv.includes('--dry-run');
if (!CHAR || !OUT) {
  console.error('uso: capture-char-thumbnail <char> [saida.webp]');
  process.exit(1);
}
// A arma não é argumento: o bug real nasceu exatamente porque duas capturas receberam
// `svd` enquanto o jogo declarava M4/P90. A única fonte é o mesmo CHAR_WEAPON do runtime.
globalThis.location ||= { search: '' };
globalThis.localStorage ||= { getItem: () => null };
const { charWeapon } = await import('../public/js/characters.js');
const WEAPON = charWeapon(CHAR);
const URL = `${BASE}/mounttest.html?char=${encodeURIComponent(CHAR)}&w=${encodeURIComponent(WEAPON)}&play=idle&manual=1&view=tq&clean=1`;
if (DRY_RUN) {
  console.log(JSON.stringify({ dryRun: true, char: CHAR, weapon: WEAPON, output: OUT, url: URL }, null, 2));
  process.exit(0);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new'],
});
const page = await browser.newPage({ viewport: { width: 720, height: 926 }, deviceScaleFactor: 1 });
await page.goto(URL, {
  waitUntil: 'domcontentloaded', timeout: 60000,
});
await page.waitForFunction(() => window.MOUNT_READY, null, { timeout: 60000 });
for (let i = 0; i < 15; i++) await page.evaluate(() => window.STEP?.(1 / 30));
await page.evaluate(() => window.RENDER?.());
const png = await page.screenshot();
await browser.close();
await sharp(png).resize(360, 463).webp({ quality: 92 }).toFile(OUT);
const sha256 = createHash('sha256').update(readFileSync(OUT)).digest('hex');
writeFileSync(`${OUT}.json`, JSON.stringify({ char: CHAR, weapon: WEAPON, width: 360, height: 463, sha256 }, null, 2));
console.log(`thumbnail -> ${OUT} (360x463)`);
