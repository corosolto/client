import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { WEAPON_SKINS } from '../../public/js/data/weapon-skin-definitions.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const SKIN_ID = process.env.SKIN_ID || 'ondas-cariocas';
const DEFINITION = WEAPON_SKINS[SKIN_ID];
const TARGETS = Object.freeze(Object.fromEntries(Object.values(WEAPON_SKINS)
  .flatMap((skin)=>skin.targetWeapons.map((weaponId)=>[skin.id,weaponId]))));
const WEAPON_ID = TARGETS[SKIN_ID];
if (!WEAPON_ID) throw new Error(`skin desconhecida: ${SKIN_ID}`);
const OUT = path.join(ROOT, 'tools/eval/asset-evidence/items/weapon-skins', SKIN_ID);
const BASE = process.env.BASE || 'http://127.0.0.1:9478';
const CDP_URL = process.env.CDP_URL || null;
const CHECK = process.argv.includes('--check');
const FILES = ['side-left.png', 'side-right.png', 'three-quarter.png'];
const markSource = DEFINITION?.markAsset ? `public${DEFINITION.markAsset}` : null;
const SOURCES = [
  'public/js/data/weapon-skin-definitions.js',
  'public/js/weapon-skins.js',
  'public/js/weapons.js',
  'public/weapon-skin-review.html',
  ...(markSource ? [markSource] : []),
];
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

if (CHECK) {
  const report = JSON.parse(readFileSync(path.join(OUT, 'report.json')));
  if (report.schemaVersion !== 'cs-weapon-skin-evidence/1') throw new Error('schema de evidência inválido');
  if (report.skinId !== SKIN_ID || report.weaponId !== WEAPON_ID) throw new Error('alvo da evidência mudou');
  if (report.approved !== DEFINITION.approved || report.certified !== DEFINITION.certified || report.runtimeEnabled !== DEFINITION.runtimeEnabled) throw new Error('estado de ativação da skin mudou');
  if (report.status !== DEFINITION.status || report.officialMarksIncluded !== !!DEFINITION.officialMarksIncluded) throw new Error('estado jurídico da evidência mudou');
  if (report.markPlacement !== (DEFINITION.markPlacement || null)) throw new Error('posição do escudo mudou');
  if (report.sloganPlacement !== (DEFINITION.sloganPlacement || null)) throw new Error('posição da frase mudou');
  for (const file of FILES) if (report.files[file] !== sha(path.join(OUT, file))) throw new Error(`${file}: hash desatualizado`);
  for (const file of SOURCES) if (report.sources[file] !== sha(path.join(ROOT, file))) throw new Error(`${file}: fonte mudou sem recaptura`);
  console.log(`weapon-skin check: ${SKIN_ID} ${FILES.length} views hash-pinned, approved=${Number(DEFINITION.approved)}, runtime=${Number(DEFINITION.runtimeEnabled)}`);
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });
const globalRoot = execSync('npm root -g').toString().trim();
const playwright = await import(pathToFileURL(`${globalRoot}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const browser = CDP_URL
  ? await chromium.connectOverCDP(CDP_URL)
  : await chromium.launch({
      executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
    });
const context = CDP_URL
  ? browser.contexts()[0]
  : await browser.newContext({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 1 });
const page = await context.newPage();
if (CDP_URL) await page.setViewportSize({ width: 1200, height: 675 });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
const open = async (view) => {
  await page.goto(`${BASE}/weapon-skin-review.html?weapon=${encodeURIComponent(WEAPON_ID)}&skin=${encodeURIComponent(SKIN_ID)}&view=${view}`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForFunction(() => window.REVIEW_READY === true, null, { timeout: 60000 });
  await page.waitForTimeout(300);
};
await open('side');
await page.screenshot({ path: path.join(OUT, 'side-left.png') });
await page.evaluate(() => { window.REVIEW_MODEL.rotation.y = Math.PI; });
await page.waitForTimeout(100);
await page.screenshot({ path: path.join(OUT, 'side-right.png') });
await open('three-quarter');
await page.screenshot({ path: path.join(OUT, 'three-quarter.png') });
await page.close();
if (!CDP_URL) {
  await context.close();
  await browser.close();
}
if (errors.length) throw new Error(`console: ${errors.join(' | ')}`);
const report = {
  schemaVersion: 'cs-weapon-skin-evidence/1',
  skinId: SKIN_ID,
  weaponId: WEAPON_ID,
  status: DEFINITION.status,
  approved: DEFINITION.approved,
  certified: DEFINITION.certified,
  runtimeEnabled: DEFINITION.runtimeEnabled,
  designOrigin: DEFINITION.designOrigin,
  rightsStatus: DEFINITION.rightsStatus || 'original-safe',
  officialMarksIncluded: !!DEFINITION.officialMarksIncluded,
  markPlacement: DEFINITION.markPlacement || null,
  sloganPlacement: DEFINITION.sloganPlacement || null,
  markSourceUrl: DEFINITION.markSourceUrl || null,
  referenceRule: DEFINITION.rightsStatus === 'permission-needed'
    ? 'official club mark shown only in an internal, store-off preview; written trademark clearance required before release'
    : DEFINITION.rightsStatus === 'political-satire'
      ? 'project-authored political satire using original vector geometry; no party or campaign logo copied'
      : DEFINITION.metalFinish
        ? 'project-authored metallic finish without brand, badge or copied commercial skin'
        : DEFINITION.preserveBase
          ? 'project-authored Brazilian lettering and illustration over the original weapon finish; no copied brand or commercial skin'
          : DEFINITION.theme === 'camo-selva'
            ? 'project-authored procedural camouflage without copied military or commercial pattern'
            : 'original Brazilian Portuguese-pavement reinterpretation; no brand, club badge or copied commercial skin',
  slogan: DEFINITION.slogan || null,
  storePrice: DEFINITION.storePrice || null,
  views: ['left-side', 'right-side', 'three-quarter'],
  files: Object.fromEntries(FILES.map((file) => [file, sha(path.join(OUT, file))])),
  sources: Object.fromEntries(SOURCES.map((file) => [file, sha(path.join(ROOT, file))])),
  consoleErrors: errors,
};
writeFileSync(path.join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`weapon-skin write: ${SKIN_ID} ${FILES.length} views, approved=${Number(DEFINITION.approved)}, runtime=${Number(DEFINITION.runtimeEnabled)}`);
if (CDP_URL) process.exit(0);
