// Captura 3:2 da cena real em pontos que PROVAM os landmarks dos cinco mapas novos.
// Usa mapview.html: mesmo builder, texturas e GLBs do jogo, com câmera livre reprodutível.
// Diferente de uma câmera aleatória de bot, cada quadro tem intenção declarada e viaja
// com um manifest JSON. Uso: `ONLY=corrego,mansao node tools/capture-map-evidence.mjs`.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { MAP_EVIDENCE_ORDER, MAP_EVIDENCE_SHOTS } from './eval/map-evidence-views.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const OUT = process.env.OUT || 'tools/eval/asset-evidence/maps';
const ONLY = new Set((process.env.ONLY || '').split(',').filter(Boolean));
const VIEWPORT = Object.freeze({ width: 1536, height: 1024, aspect: '3:2' });
const sha = (value) => createHash('sha256').update(value).digest('hex');
const cameraSha = (map, shot) => sha(JSON.stringify({
  map, name: shot.name, from: shot.from, look: shot.look, proves: shot.proves,
  viewport: VIEWPORT,
}));
const propNames = existsSync('public/models/props')
  ? readdirSync('public/models/props').filter((name) => name.endsWith('.glb'))
  : [];
const sourceFiles = (map) => {
  const mapFile = map === 'lajes' ? 'public/js/map_lajes_authored.js' : `public/js/map_${map.slice(3)}.js`;
  const src = readFileSync(mapFile, 'utf8');
  const textureFiles = [...src.matchAll(/["']\/(img\/textures\/[^"']+)["']/g)]
    .map((match) => `public/${match[1]}`)
    .filter(existsSync);
  // Props sao declarados por id e resolvidos pelo mapprops em runtime. Vincular os GLBs
  // citados evita aprovar PNG velho quando um landmark foi reprocessado sem mudar o JS.
  const propFiles = propNames
    .filter((name) => src.includes(`'${name.slice(0, -4)}'`) || src.includes(`"${name.slice(0, -4)}"`))
    .map((name) => `public/models/props/${name}`);
  return [...new Set([
    mapFile, 'public/mapview.html', 'public/js/map_sky.js', 'public/js/mapprops.js',
    'public/js/textures.js', 'public/js/bloom.js', 'public/js/map_decals.js',
    'public/js/graffiti_pass.js', 'public/js/graffiti_layout.js',
    ...textureFiles, ...propFiles,
  ])].sort();
};
const sourceSha = (files) => {
  const hash = createHash('sha256');
  for (const file of files) hash.update(file).update('\0').update(readFileSync(file)).update('\0');
  return hash.digest('hex');
};
const sources = Object.fromEntries(MAP_EVIDENCE_ORDER.map((map) => {
  const files = sourceFiles(map);
  return [map, { files, sha256: sourceSha(files) }];
}));

if (process.argv.includes('--plan')) {
  const maps = MAP_EVIDENCE_ORDER.filter((map) => !ONLY.size || ONLY.has(map));
  const plan = JSON.stringify({
    schemaVersion: 2,
    viewport: VIEWPORT,
    mapOrder: maps,
    command: `${ONLY.size ? `ONLY=${maps.join(',')} ` : ''}node tools/capture-map-evidence.mjs`,
    maps: maps.map((map) => ({ map, source: sources[map], shots: MAP_EVIDENCE_SHOTS[map]
      .map((shot) => ({ ...shot, cameraSha256: cameraSha(map, shot) })) })),
  }, null, 2);
  // process.exit pode cortar stdout quando --plan esta encadeado por outro gate.
  await new Promise((resolve, reject) => process.stdout.write(`${plan}\n`, (error) => error ? reject(error) : resolve()));
  process.exit(0);
}

const root = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${root}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
let manifest = [];
if (ONLY.size && existsSync(`${OUT}/manifest.json`)) {
  try {
    const anterior = JSON.parse(readFileSync(`${OUT}/manifest.json`, 'utf8')).shots || [];
    // Preserva somente evidencia que continua ligada ao mesmo fonte, camera e PNG.
    // Manifest antigo ou incompleto desaparece em vez de ganhar cara de atual.
    manifest = anterior.filter((entry) => {
      if (ONLY.has(entry.map) || !sources[entry.map] || !existsSync(entry.file)) return false;
      return entry.sourceSha256 === sources[entry.map].sha256 &&
        entry.cameraSha256 === cameraSha(entry.map, entry) &&
        entry.imageSha256 === sha(readFileSync(entry.file));
    });
  } catch { /* uma captura completa reconstrói o manifest se o anterior estiver inválido */ }
}

for (const map of MAP_EVIDENCE_ORDER) {
  if (ONLY.size && !ONLY.has(map)) continue;
  const shots = MAP_EVIDENCE_SHOTS[map];
  const dir = `${OUT}/${map}`; mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: VIEWPORT.width, height: VIEWPORT.height } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${BASE}/mapview.html?map=${map}&capture=${sources[map].sha256.slice(0, 16)}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.MAPEVAL?.ready === true, null, { timeout: 180000 });
  await page.addStyleTag({ content: '#hud{display:none!important}' });
  await page.waitForTimeout(1200);
  for (const shot of shots) {
    await page.evaluate(({ from, look }) => window.MAPEVAL.view(from, look), shot);
    await page.waitForTimeout(350);
    const file = `${dir}/${shot.name}.png`;
    await page.screenshot({ path: file, timeout: 120000 });
    manifest.push({
      map, ...shot, file, viewport: VIEWPORT,
      sourceFiles: sources[map].files,
      sourceSha256: sources[map].sha256,
      cameraSha256: cameraSha(map, shot),
      imageSha256: sha(readFileSync(file)),
      errors: [...errors],
    });
    console.log('shot', map, shot.name);
  }
  await page.close();
}
await browser.close();
mkdirSync(OUT, { recursive: true });
const ordem = new Map(MAP_EVIDENCE_ORDER.flatMap((map, mi) =>
  MAP_EVIDENCE_SHOTS[map].map((shot, si) => [`${map}/${shot.name}`, mi * 100 + si])));
manifest.sort((a, b) => (ordem.get(`${a.map}/${a.name}`) ?? 9999) - (ordem.get(`${b.map}/${b.name}`) ?? 9999));
writeFileSync(`${OUT}/manifest.json`, JSON.stringify({
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  viewport: VIEWPORT,
  mapOrder: MAP_EVIDENCE_ORDER,
  shots: manifest,
}, null, 2));
if (manifest.some((entry) => entry.errors.length)) process.exitCode = 1;
