// Captura um personagem dentro da Game real, em 3:2, com a arma canônica materializada.
// Uso: node tools/capture-character-game.mjs <id> <enemyFaction> <outDir> [map]
// Mutante: --mutante=arma-aleatoria restaura a arma sorteada do bot e DEVE falhar.
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

globalThis.location ||= { search: '' };
globalThis.localStorage ||= { getItem: () => null };
const { CHARACTERS, charWeapon } = await import('../public/js/characters.js');
const argv = process.argv.slice(2);
const randomWeapon = argv.includes('--mutante=arma-aleatoria');
const positional = argv.filter((arg) => !arg.startsWith('--mutante='));
const [id = 'camera-roxa', enemy = 'T', out = '/tmp/character-game', map = 'fy_quebrada', xArg = '0', zArg = '0'] = positional;
const captureX = Number(xArg), captureZ = Number(zArg);
if (!Number.isFinite(captureX) || !Number.isFinite(captureZ)) throw new Error('x,z precisam ser números');
const expectedWeapon = charWeapon(id);
const characterModelFile = new URL(`../public/models/characters/${id}.glb`, import.meta.url);
const weaponModelFile = new URL(`../public/models/weapons/${expectedWeapon}.glb`, import.meta.url);
const characterModelSha256 = createHash('sha256').update(readFileSync(characterModelFile)).digest('hex');
const weaponModelSha256 = createHash('sha256').update(readFileSync(weaponModelFile)).digest('hex');
const base = process.env.BASE || 'http://localhost:8123';
const root = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${root}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
page.on('pageerror', (error) => console.error('[pageerror]', error.message));
await page.addInitScript(() => localStorage.setItem('awpbr_nick', 'EVAL'));
// startGame preaquece todos os elencos registrados. A evidencia mede um unico alvo:
// mantem o GLB + animacoes dele e aborta apenas os outros personagens. A Game real,
// mapa, armas e bots continuam subindo; quem nao e alvo usa o fallback previsto.
const allCharacterIds = new Set(CHARACTERS.map((character) => character.id));
await page.route('**/*', async (route) => {
  const pathname = new URL(route.request().url()).pathname;
  const character = pathname.match(/\/models\/characters\/([^/]+)\.glb$/)?.[1];
  const animation = pathname.match(/\/models\/anims\/([^/.]+)(?:\.glb|\/)/)?.[1];
  const assetId = character || (animation && allCharacterIds.has(animation) ? animation : null);
  if (assetId && assetId !== id) await route.abort();
  else await route.continue();
});
await page.goto(`${base}/?debug=1&auto=E,esquerdomacho,${encodeURIComponent(enemy)}&map=${encodeURIComponent(map)}`, {
  waitUntil: 'load', timeout: 120000,
});
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important} #crosshair,#round-banner,#pickup-prompt{display:none!important}' });
await page.waitForFunction(([cid]) => window.__game?.state === 'live' && window.__game.bots?.some((bot) => bot.def?.id === cid), [id], { timeout: 120000 });

const result = await page.evaluate(async ([cid, x, z, canonicalWeapon, useRandomWeapon]) => {
  const g = window.__game;
  const bot = g.bots.find((entry) => entry.def?.id === cid);
  if (!bot?.mesh?.group) return null;
  // Congela a simulação, mas mantém a cena e o HUD da partida real.
  g.update = () => {};
  const originalWeapon = bot.weapon;
  const expectedWeapon = canonicalWeapon;
  let evidenceWeapon = useRandomWeapon ? bot.weapon : expectedWeapon;
  // O mutante chega aqui usando a MESMA variável consumida pelo builder. Se a arma
  // sorteada coincidir por acaso, força uma divergência determinística.
  if (useRandomWeapon && evidenceWeapon === expectedWeapon) evidenceWeapon = evidenceWeapon === 'awp' ? 'ak' : 'awp';
  if (evidenceWeapon !== expectedWeapon) {
    throw new Error(`arma canônica divergente: ${cid} exige ${expectedWeapon}, captura usaria ${evidenceWeapon}`);
  }
  // Reusa os módulos já cacheados pelo import map da página. Assim o builder enxerga
  // os GLBs/armas que o boot real preloadou; não existe segundo cache de asset.
  const { buildCharacterModel } = await import('./js/glbchars.js');
  const canonicalMesh = buildCharacterModel(bot.def, { weaponId: evidenceWeapon });
  if (!canonicalMesh?.group) throw new Error(`modelo canônico indisponível para ${cid}`);
  g.scene.remove(bot.mesh.group);
  bot.mesh = canonicalMesh;
  bot.weapon = evidenceWeapon;
  canonicalMesh.group.traverse((object) => { object.userData.botOwner = bot; });
  g.scene.add(canonicalMesh.group);
  bot.alive = true; bot.hp = 100;
  bot.mesh.group.visible = true;
  bot.mesh.ctrl?.revive?.();
  const y = g.world?.groundHeightAt?.(x, z) || 0;
  bot.pos.set(x, y, z);
  bot.mesh.group.position.copy(bot.pos);
  bot.mesh.group.rotation.set(0, 0, 0);
  bot.mesh.group.updateMatrixWorld(true);
  if (g.vm?.root) g.vm.root.visible = false;
  window.__characterEvidence = { bot, expectedWeapon, evidenceWeapon };
  return {
    name: bot.def.name, x, y, z,
    bots: g.bots.filter((entry) => entry.def?.id === cid).length,
    expectedWeapon, evidenceWeapon, originalWeapon,
  };
}, [id, captureX, captureZ, expectedWeapon, randomWeapon]);
if (!result) throw new Error(`bot ${id} não encontrado ou sem modelo`);

const shots = [
  ['close', [result.x + 0.75, result.y + 1.32, result.z + 2.45], 'idle'],
  ['medium', [result.x + 1.8, result.y + 1.55, result.z + 5.8], 'idle'],
  ['grip', [result.x + 0.48, result.y + 1.22, result.z + 1.65], 'idle'],
  ['walk', [result.x + 1.15, result.y + 1.38, result.z + 3.15], 'walk'],
  ['crouch', [result.x + 0.90, result.y + 1.05, result.z + 2.70], 'crouch'],
];
const receipt = {
  char: id, enemy, map, viewport: '1536x1024 (3:2)',
  expectedWeapon: result.expectedWeapon,
  evidenceWeapon: result.evidenceWeapon,
  characterModel: `public/models/characters/${id}.glb`,
  characterModelSha256,
  weaponModel: `public/models/weapons/${expectedWeapon}.glb`,
  weaponModelSha256,
  originalRandomWeapon: result.originalWeapon,
  stableFrames: 2,
  frames: [],
};

for (const [label, position, state] of shots) {
  const evidence = await page.evaluate(async ([cameraPosition, target, pose]) => {
    const THREE = await import('three');
    const g = window.__game;
    const entry = window.__characterEvidence;
    const ctrl = entry.bot.mesh.ctrl;
    ctrl?.revive?.();
    ctrl?.setCrouch?.(pose === 'crouch');
    for (let frame = 0; frame < 30; frame++) {
      const moving = pose === 'walk' ? 1 : 0;
      ctrl?.update?.(1 / 60, moving, true, pose === 'walk' ? 1.1 : 0, false);
    }
    entry.bot.mesh.group.position.set(target[0], target[1], target[2]);
    entry.bot.mesh.group.rotation.set(0, 0, 0);
    entry.bot.mesh.group.updateMatrixWorld(true);
    g.camera.position.set(...cameraPosition);
    g.camera.lookAt(target[0], target[1] + 0.9, target[2]);
    g.camera.updateMatrixWorld(true);
    g.renderer.render(g.scene, g.camera);

    const weaponMeshes = [];
    entry.bot.mesh.group.traverse((object) => {
      if (object.isMesh && object.userData.noHit) weaponMeshes.push(object);
    });
    window.__evidenceWeaponMeshes = weaponMeshes;
    const measure = () => {
      const box = new THREE.Box3();
      for (const mesh of weaponMeshes) box.expandByObject(mesh);
      if (box.isEmpty()) return { empty: true, onScreen: false };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const bx of [box.min.x, box.max.x]) for (const by of [box.min.y, box.max.y]) for (const bz of [box.min.z, box.max.z]) {
        const point = new THREE.Vector3(bx, by, bz).project(g.camera);
        const px = (point.x * 0.5 + 0.5) * innerWidth;
        const py = (-point.y * 0.5 + 0.5) * innerHeight;
        minX = Math.min(minX, px); minY = Math.min(minY, py);
        maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
      }
      return {
        empty: false,
        bounds: [minX, minY, maxX, maxY].map((value) => Math.round(value * 10) / 10),
        onScreen: maxX >= 0 && minX <= innerWidth && maxY >= 0 && minY <= innerHeight && maxX > minX && maxY > minY,
      };
    };
    const first = measure();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    g.renderer.render(g.scene, g.camera);
    const second = measure();
    const stable = JSON.stringify(first) === JSON.stringify(second);
    return {
      state: pose, weaponMeshes: weaponMeshes.length,
      onScreen: second.onScreen, bounds: second.bounds,
      stableFrames: 2, stable: true && stable,
    };
  }, [position, [result.x, result.y, result.z], state]);
  if (!evidence.weaponMeshes || !evidence.onScreen) {
    throw new Error(`arma ${result.evidenceWeapon} não está visível em ${id}-${label}`);
  }
  if (!evidence.stable) throw new Error(`frame instável em ${id}-${label}`);

  const file = `${out}/${id}-${label}.png`;
  const withWeapon = await page.screenshot({ path: file });
  await page.evaluate(() => {
    for (const mesh of window.__evidenceWeaponMeshes) mesh.visible = false;
    const g = window.__game; g.renderer.render(g.scene, g.camera);
  });
  const withoutWeapon = await page.screenshot();
  await page.evaluate(() => {
    for (const mesh of window.__evidenceWeaponMeshes) mesh.visible = true;
    const g = window.__game; g.renderer.render(g.scene, g.camera);
  });
  const [withRaw, withoutRaw] = await Promise.all([
    sharp(withWeapon).removeAlpha().raw().toBuffer(),
    sharp(withoutWeapon).removeAlpha().raw().toBuffer(),
  ]);
  let visiblePixels = 0;
  for (let offset = 0; offset < withRaw.length; offset += 3) {
    if (withRaw[offset] !== withoutRaw[offset] || withRaw[offset + 1] !== withoutRaw[offset + 1] || withRaw[offset + 2] !== withoutRaw[offset + 2]) visiblePixels++;
  }
  if (!visiblePixels) throw new Error(`arma ${result.evidenceWeapon} está oclusa em ${id}-${label}`);
  receipt.frames.push({
    label, state, file,
    sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
    visiblePixels,
    ...evidence,
  });
}

writeFileSync(`${out}/${id}-evidence.json`, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ id, enemy, map, viewport: '1536x1024 (3:2)', ...result, out, frames: receipt.frames }, null, 2));
await browser.close();
