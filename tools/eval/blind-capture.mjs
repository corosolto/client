// BLIND CAPTURE (GAUNTLET 2.0, protocolo do crítico): captura todas as armas com
// viewmodel estático, corta a região do VM EXCLUINDO #weapon-name E o contador de
// munição, embaralha (seed por argumento ou aleatória) e grava células cegas + grids
// (cor e grayscale). O gabarito vai para key.txt SEPARADO — abrir só depois de palpitar.
// Uso: node tools/eval/blind-capture.mjs <outDir> [seed] [W,H]
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/tmp/gauntlet/blind';
const SEED = parseInt(process.argv[3] || String(Date.now() % 100000), 10);
const [VW, VH] = (process.argv[4] || '1600,900').split(',').map(Number);
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const WEAPONS = ['ak', 'akm', 'm4', 'm92', 'g3', 'carbine', 'mp5', 'uzi', 'p90', 'scar', 'tavor', 'famas', 'lmg',
  'pistol', 'deagle', 'revolver38', 'shotgun', 'md97', 'awp', 'mosin', 'rem700', 'm400', 'svd', 'g3sg1', 'sks', 'knife'];
// PRNG determinístico (mulberry32) — mesma seed reproduz o teste
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
const shuffled = WEAPONS.slice();
for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(`${OUT}/cells`, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
let errors = 0;
page.on('console', m => { if (m.type() === 'error') { errors++; console.error('[console-err]', m.text()); } });
page.on('pageerror', e => { errors++; console.error('[pageerror]', e.message); });
for (let att = 0; att < 3; att++) {
  try { await page.goto(`${BASE}/?debug=1&auto=P,mst&map=piscina_treta`, { waitUntil: 'domcontentloaded', timeout: 120000 }); break; }   // G2-R8: 'load' estourava 30s em swiftshader (preload pesado); domcontentloaded + retry como os demais captures
  catch (e) { console.log('goto retry', att); if (att === 2) throw e; }
}
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });   // G2-R8: 60s estourava — o preload dos VMs heróis (~180MB de GLB) em swiftshader passa de 1min
await page.waitForTimeout(1000);
await page.evaluate(() => {
  const g = window.__game;
  for (const b of g.bots) { b.pos.set(0, -60, 0); b.hp = 1e9; }   // sem bot cruzando a lente
  g.player.hp = 1e9;
});

// crop do VM excluindo nome+munição (HUD bottom-right: nome ~y .90, ammo ~y .91-.97).
// x desde 0.40: com o framing afastado (R5) o cano/boca chega perto do centro da tela
const clip = { x: VW * 0.40, y: VH * 0.28, width: VW * 0.60, height: VH * 0.56 };
const sharp = (await import('sharp')).default;
const key = [];
for (let i = 0; i < shuffled.length; i++) {
  const w = shuffled[i];
  await page.evaluate((wid) => {
    const g = window.__game;
    g._switchWeapon(wid); g.player.drawUntil = 0; g.player.reloadUntil = 0; g.player.pitch = 0;
  }, w);
  await page.waitForTimeout(420);
  await page.evaluate(() => { const g = window.__game; g.player.drawUntil = 0; g.player.reloadUntil = 0; });
  const buf = await page.screenshot({ clip, timeout: 90000 });   // G2-R12: 30s default estourava em swiftshader sob carga
  await sharp(buf).png().toFile(`${OUT}/cells/cell-${String(i).padStart(2, '0')}.png`);
  await sharp(buf).grayscale().png().toFile(`${OUT}/cells/cell-${String(i).padStart(2, '0')}-gray.png`);
  key.push(`cell-${String(i).padStart(2, '0')} = ${w}`);
}
// grids 4×7 (cor + gray), sem rótulos
const CW = 560, CH = 340;
for (const [suffix, gray] of [['grid.png', false], ['grid-gray.png', true]]) {
  const grid = sharp({ create: { width: 4 * CW, height: 7 * CH, channels: 3, background: { r: 20, g: 20, b: 24 } } });
  const tiles = [];
  for (let i = 0; i < shuffled.length; i++) {
    const src = `${OUT}/cells/cell-${String(i).padStart(2, '0')}${gray ? '-gray' : ''}.png`;
    tiles.push({ input: await sharp(src).resize(CW, CH).png().toBuffer(), left: (i % 4) * CW, top: Math.floor(i / 4) * CH });
  }
  await grid.composite(tiles).png().toFile(`${OUT}/${suffix}`);
}
writeFileSync(`${OUT}/key.txt`, `seed ${SEED}\n` + key.join('\n') + '\n');
console.log(`seed ${SEED} | ${shuffled.length} armas | 0 erros = ${errors === 0}`);
await browser.close();
process.exit(errors ? 1 : 0);
