/* Captura persistente dos seis fluxos cinematograficos aprovados em 1536x1024.

   Diferente das capturas de trabalho em /tmp, esta evidencia fica ligada ao fonte,
   versao e pixels por SHA. O browser sempre fecha, inclusive quando um seletor falha.

   Uso: BASE=http://127.0.0.1:8123 node tools/eval/cinematic-ui-capture.mjs
*/
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import sharp from 'sharp';

const ROOT = new URL('../../', import.meta.url);
const OUT = new URL('./asset-evidence/ui-cinematic/', import.meta.url);
const BASE = process.env.BASE || 'http://127.0.0.1:4321';
const VIEWPORT = Object.freeze({ width: 1536, height: 1024, aspect: '3:2' });
const VERSION = JSON.parse(readFileSync(new URL('package.json', ROOT), 'utf8')).version;
const SOURCES = ['src/pages/index.astro', 'public/style.css', 'public/js/main.js', 'public/js/version.js'];
const sha = (data) => createHash('sha256').update(data).digest('hex');
const sourceSha = Object.fromEntries(SOURCES.map((file) => [file, sha(readFileSync(new URL(file, ROOT)))]));
globalThis.location ||= { search: '' };
globalThis.localStorage ||= { getItem: () => null };
const { CHARACTERS } = await import(new URL('../../public/js/characters.js', import.meta.url));
const CAPTURE_FACTION = 'E';
const allCharacterIds = new Set(CHARACTERS.map((character) => character.id));
const captureRoster = new Set(CHARACTERS.filter((character) => character.team === CAPTURE_FACTION).map((character) => character.id));

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});

const frames = [];
let domProof = null;
try {
  const page = await browser.newPage({ viewport: VIEWPORT });
  page.on('pageerror', (error) => console.error('[pageerror]', error.message.slice(0, 240)));
  await page.addInitScript(() => localStorage.setItem('awpbr_nick', 'ZE DO AWP'));
  // O menu preaquece miniaturas de todas as faccoes. Para a evidencia desta tela,
  // deixa passar o roster E completo e encerra cedo apenas os GLBs dos outros elencos;
  // o personagem fotografado continua vindo do loader/modelo real de producao.
  await page.route('**/*', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const character = pathname.match(/\/models\/characters\/([^/]+)\.glb$/)?.[1];
    const animation = pathname.match(/\/models\/anims\/([^/.]+)(?:\.glb|\/)/)?.[1];
    const id = character || (animation && allCharacterIds.has(animation) ? animation : null);
    if (id && !captureRoster.has(id)) await route.abort();
    else await route.continue();
  });

  const shot = async (id, screen) => {
    await page.waitForTimeout(500);
    const path = new URL(`${id}.png`, OUT);
    await page.screenshot({ path: path.pathname });
    const data = readFileSync(path);
    frames.push({ id, screen, file: path.pathname, width: VIEWPORT.width, height: VIEWPORT.height, sha256: sha(data) });
    console.log(`shot ${id}`);
  };

  await page.goto(`${BASE}/?debug=1&lang=pt`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('#splash-enter:not(.hidden)', { timeout: 120000 });
  await page.click('#boot-splash', { timeout: 5000 }).catch(() => {});
  await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 60000 });
  await page.waitForTimeout(2500);
  await shot('01-menu', 'main-menu');

  await page.click('.cs-item[data-act="config"]');
  await page.waitForSelector('#settings-panel:not(.hidden)', { timeout: 10000 });
  await shot('06-configuracoes', 'settings-panel');
  await page.click('#settings-back');
  await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 10000 });

  await page.click('.cs-item[data-act="sp"]');
  await page.waitForSelector('#menu-setup:not(.hidden)', { timeout: 10000 });
  await shot('02-setup', 'menu-setup');

  await page.click('#map-thumb').catch(async () => page.click('.map-thumb'));
  await page.waitForSelector('#map-screen:not(.hidden)', { timeout: 10000 });
  await page.waitForTimeout(500);
  await shot('05-mapa', 'map-screen');
  await page.click('#ms-back');
  await page.waitForSelector('#menu-setup:not(.hidden)', { timeout: 10000 });

  await page.click('#btn-jogar');
  await page.waitForSelector('#team-select:not(.hidden)', { timeout: 15000 });
  domProof = await page.evaluate(() => ({
    teamCards: document.querySelectorAll('.team-card[data-faction]').length,
    rawAstroTokens: document.documentElement.innerHTML.includes('{FACTIONS.map'),
  }));
  await shot('03-faccao', 'team-select');

  // O CTA do dossie aciona o card atualmente apresentado e e o caminho primario da
  // composicao 5x2. Evita depender de atributos ARIA acrescentados depois do boot.
  await page.click(`.team-card[data-faction="${CAPTURE_FACTION}"]`);
  await page.waitForSelector('#char-select:not(.hidden)', { timeout: 120000 });
  await page.waitForTimeout(2000);
  await shot('04-personagem', 'char-select');
} finally {
  await browser.close().catch(() => {});
}

const cells = [];
for (const [index, frame] of frames.entries()) {
  const input = await sharp(frame.file).resize(512, 341, { fit: 'fill' }).jpeg({ quality: 88 }).toBuffer();
  cells.push({ input, left: (index % 2) * 512, top: Math.floor(index / 2) * 341 });
}
const contactPath = new URL('contact-sheet.jpg', OUT);
await sharp({ create: { width: 1024, height: 1023, channels: 3, background: '#101216' } })
  .composite(cells).jpeg({ quality: 90 }).toFile(contactPath.pathname);

const contact = readFileSync(contactPath);
const manifest = {
  schema: 1,
  version: VERSION,
  capturedAt: new Date().toISOString(),
  base: BASE,
  server: { kind: 'astro-ssr', origin: new URL(BASE).origin, dom: domProof },
  viewport: VIEWPORT,
  sources: sourceSha,
  frames,
  contactSheet: { file: contactPath.pathname, width: 1024, height: 1023, sha256: sha(contact) },
};
writeFileSync(new URL('manifest.json', OUT), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`CINEMATIC-UI EVIDENCE: ${frames.length} frames · ${VERSION}`);
