import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:4339';
const OUT = process.argv[2] || 'artifacts/viewmodels/runtime';
fs.mkdirSync(OUT, { recursive: true });
const errors = [];
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.setDefaultNavigationTimeout(120000);
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' && message.text().includes('[authored-vm]')) errors.push(message.text());
});
page.on('requestfailed', (request) => {
  if (request.url().includes('/models/viewmodels/goldsrc/')) errors.push(`${request.url()} ${request.failure()?.errorText}`);
});

await page.goto(`${BASE}/?debug=1&auto=P,mst&map=fy_piscina_treta`, { waitUntil: 'domcontentloaded' });
await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 90000 });
await page.waitForFunction(() => window.__game?.vm?.authored?.entries?.size === 16, null, { timeout: 60000 });
await page.evaluate(() => {
  const game = window.__game;
  game.player.hp = 1e9;
  for (const bot of game.bots) bot.hp = 1e9;
});

const ALL_IDS = ['awp', 'ak', 'm4', 'mp5', 'shotgun', 'deagle', 'pistol', 'knife',
  'm92', 'akm', 'g3', 'revolver38', 'md97', 'carbine', 'm400', 'mosin', 'rem700',
  'lmg', 'scar', 'tavor', 'famas', 'uzi', 'p90', 'svd', 'g3sg1', 'sks'];
const ids = process.env.WEAPON ? process.env.WEAPON.split(',') : ALL_IDS;
const shots = [];
const capturedModels = new Set();
for (const id of ids) {
  const evidence = await page.evaluate(async (weapon) => {
    const game = window.__game;
    await game.vm.authored.ensureSkin(weapon);
    game.player.reloadUntil = 0;
    game.player.drawUntil = 0;
    game.player.nextShotAt = 0;
    game._rlTok = (game._rlTok || 0) + 1;
    game.player.weapon = weapon;
    if (weapon !== 'knife') game.player.ammo[weapon] = { mag: 2, res: 90 };
    game._applyVmVisibility();
    game.vm.authored.draw(weapon, 0.32);
    const entry = game.vm.authored.entry(weapon);
    const mounted = entry.skins.get(weapon);
    let ownMeshes = 0;
    mounted?.visual?.traverse((object) => { if (object.isMesh) ownMeshes++; });
    const handMaterials = entry.handMeshes.flatMap((mesh) => Array.isArray(mesh.material) ? mesh.material : [mesh.material]);
    return {
      weapon,
      model: entry.model,
      active: game.vm.authored.active(weapon),
      authoredVisible: entry.scene.visible,
      legacyVisible: game.vm.models[weapon]?.visible || false,
      genericArmsVisible: game.vm.arms?.group.visible || false,
      ownWeaponId: mounted?.object?.userData?.coroWeaponId || '',
      ownWeaponVisible: mounted?.object?.visible || false,
      ownMeshes,
      ownScale: mounted?.visual?.scale.x || 0,
      donorWeaponVisible: entry.weaponMeshes.some((mesh) => mesh.visible),
      donorWeaponTagged: entry.weaponMeshes.every((mesh) => mesh.userData.animationDonorOnly === true),
      handIdentity: [...new Set(entry.handMeshes.map((mesh) => mesh.userData.authoredCharacterHand))],
      donorHandTextures: handMaterials.filter((material) => material?.map && !material.map.userData?.coroCharacterTexture).length,
      characterHandTextures: handMaterials.filter((material) => material?.map?.userData?.coroCharacterTexture).length,
      fov: game.vmCamera.fov,
      meshes: entry.scene.getObjectsByProperty('isMesh', true).length,
    };
  }, id);
  try {
    await page.waitForFunction((weapon) => {
      const name = window.__game.vm.authored.entry(weapon)?.action?.getClip()?.name || '';
      return ['idle', 'idle1', 'idle2', 'idle3'].includes(name.split('-').at(-1));
    }, id, { timeout: 5000 });
  } catch (error) {
    const diagnostic = await page.evaluate((weapon) => {
      const game = window.__game;
      const entry = game.vm.authored.entry(weapon);
      const mounted = entry?.skins.get(weapon);
      return {
        weapon,
        model: entry?.model,
        active: game.vm.authored.active(weapon),
        sceneVisible: entry?.scene.visible,
        action: entry?.action?.getClip()?.name,
        ownWeapon: mounted?.object?.userData?.coroWeaponId,
        ownVisible: mounted?.object?.visible,
        donorVisible: entry?.weaponMeshes.filter((mesh) => mesh.visible).length,
        hands: entry?.handMeshes.length,
      };
    }, id);
    throw new Error(`idle timeout ${JSON.stringify(diagnostic)}: ${error.message}`);
  }
  await page.waitForTimeout(80);
  const shouldCapture = !capturedModels.has(evidence.model);
  if (shouldCapture) capturedModels.add(evidence.model);
  const idle = shouldCapture ? path.join(OUT, `${evidence.model}-idle.png`) : '';
  if (idle) await page.screenshot({ path: idle });
  shots.push({ ...evidence, idle });

  await page.evaluate((weapon) => {
    const game = window.__game;
    if (weapon === 'knife') game.vm.authored.shoot(weapon);
    else {
      const ammo = game.player.ammo[weapon];
      ammo.mag = Math.max(0, ammo.mag - 2);
      game._startReload();
    }
  }, id);
  await page.waitForFunction((weapon) => {
    const game = window.__game;
    const name = game.vm.authored.entry(weapon)?.action?.getClip()?.name || '';
    const normalized = name.split('-').at(-1);
    return weapon === 'knife'
      ? ['slash1', 'slash2', 'stab', 'stab_miss'].includes(normalized)
      : ['reload', 'insert'].includes(normalized);
  }, id, { timeout: 5000 });
  await page.waitForTimeout(id === 'knife' ? 150 : 650);
  if (shouldCapture) {
    await page.screenshot({ path: path.join(OUT, `${evidence.model}-${id === 'knife' ? 'slash' : 'reload'}.png`) });
  }
}

for (const shot of shots) {
  const ok = shot.active && shot.authoredVisible && !shot.legacyVisible && !shot.genericArmsVisible
    && shot.ownWeaponId === shot.weapon && shot.ownWeaponVisible && shot.ownMeshes > 0 && shot.ownScale > 0
    && !shot.donorWeaponVisible && shot.donorWeaponTagged
    && shot.handIdentity.length === 1 && shot.handIdentity[0] && shot.donorHandTextures === 0
    && shot.characterHandTextures > 0
    && shot.meshes >= 3;
  console.log(`${ok ? 'PASSA' : 'FALHA'} AVM-BROWSER ${shot.weapon}`, JSON.stringify(shot));
  if (!ok) errors.push(`contrato visual ${shot.weapon}`);
}
if (errors.length) console.error('ERROS', JSON.stringify(errors, null, 2));
await browser.close();
process.exit(errors.length ? 1 : 0);
