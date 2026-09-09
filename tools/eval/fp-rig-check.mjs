/* First-person rig regression: all weapons, all manual reload families. */
import { chromium } from 'playwright';

const arg = process.argv.find((x) => x.startsWith('--mutante='));
const mutante = arg ? arg.slice('--mutante='.length) : '';
const idsArg = process.argv.find((x) => x.startsWith('--ids='));
const idleOnly = process.argv.includes('--idle-only');
const BASE = process.env.BASE || 'http://127.0.0.1:4339';
const CHAR = 'mandrake';
const IDS = ['awp', 'ak', 'm4', 'mp5', 'shotgun', 'deagle', 'pistol', 'knife',
  'm92', 'akm', 'g3', 'revolver38', 'md97', 'carbine', 'm400', 'mosin', 'rem700',
  'lmg', 'scar', 'tavor', 'famas', 'uzi', 'p90', 'svd', 'g3sg1', 'sks'];
const selectedIds = idsArg
  ? idsArg.slice('--ids='.length).split(',').filter((id) => IDS.includes(id))
  : IDS;
const reloadIds = idsArg
  ? ['ak', 'pistol', 'shotgun', 'awp'].filter((id) => selectedIds.includes(id))
  : ['ak', 'pistol', 'shotgun', 'awp'];
const PISTOLS = new Set(['deagle', 'pistol', 'revolver38']);
const BOLT = new Set(['awp', 'mosin', 'm400']);
const sampleK = [0.25, 0.48, 0.58, 0.78, 0.86, 0.96];

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
const rows = [];

for (const id of selectedIds) {
  const qs = new URLSearchParams({ weapon: id, reload: '0' });
  if (mutante) qs.set('fprigmut', mutante);
  await page.goto(`${BASE}/fparmsviewer.html?${qs}`, { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => window.__fpRigState, null, { timeout: 120000 });
  rows.push({ id, idle: await page.evaluate(() => window.__fpRigState) });
  console.log(`MEDIU FPRIG ${id}`);
}

const familyFrames = new Map();
for (const id of idleOnly ? [] : reloadIds) {
  const frames = [];
  for (const reload of sampleK) {
    const qs = new URLSearchParams({ weapon: id, reload: String(reload) });
    if (mutante) qs.set('fprigmut', mutante);
    await page.goto(`${BASE}/fparmsviewer.html?${qs}`, { waitUntil: 'commit', timeout: 120000 });
    await page.waitForFunction(() => window.__fpRigState, null, { timeout: 120000 });
    frames.push(await page.evaluate(() => window.__fpRigState));
  }
  familyFrames.set(id, frames);
  console.log(`MEDIU FPRIG recarga ${id}`);
}

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASSA' : 'FALHA'} FPRIG ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

check(pageErrors.length === 0, 'sem erro de página', pageErrors.join(' | '));
for (const { id, idle } of rows) {
  check(idle.sourceId === CHAR, `${id} usa identidade do personagem`, idle.sourceId);
  check(idle.skinned > 0, `${id} usa mãos articuladas`, `skinned=${idle.skinned}`);
  check(idle.weaponVisible, `${id} arma permanece visível`);
  check(idle.err.r <= 0.015, `${id} mão direita encaixada`, `erro=${idle.err.r.toFixed(4)}`);
  check(idle.err.l <= 0.015, `${id} mão esquerda encaixada`, `erro=${idle.err.l.toFixed(4)}`);
  if (id === 'knife') check(idle.phase === 'slash', 'knife anima o golpe', idle.phase);
}
for (const [id, frames] of familyFrames) {
  const phases = new Set(frames.map((f) => f.phase));
  const manual = id === 'shotgun' ? phases.has('pump')
    : BOLT.has(id) ? phases.has('bolt')
      : PISTOLS.has(id) ? phases.has('magazine') && phases.has('slide')
        : phases.has('magazine') && phases.has('bolt');
  check(frames.every((f) => f.weaponVisible), `${id} permanece visível durante recarga`);
  check(manual, `${id} recarga manual por família`, [...phases].join(','));
  if (!BOLT.has(id) && id !== 'shotgun') {
    check(frames.some((f) => f.magazineVisible), `${id} carregador destacado visível`);
  }
}

console.log(JSON.stringify({ mutante, weapons: rows.length, failures }, null, 2));
await browser.close();
process.exit(failures ? 1 : 0);
