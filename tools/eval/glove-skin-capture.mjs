#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { GLOVE_SKINS, STORE_GLOVES } from '../../public/js/data/glove-skin-definitions.js';
import { VM_WEAPON } from '../../public/js/data/vmconfig.js';
const ALL_GLOVES=Object.values(GLOVE_SKINS);
const POSTER_IDS=(process.env.GLOVE_IDS || '').split(',').map((id)=>id.trim()).filter(Boolean);
const POSTER_GLOVES=POSTER_IDS.length ? ALL_GLOVES.filter((skin)=>POSTER_IDS.includes(skin.id)) : ALL_GLOVES;
if(POSTER_IDS.some((id)=>!POSTER_GLOVES.some((skin)=>skin.id===id)))throw new Error(`luva desconhecida em GLOVE_IDS: ${POSTER_IDS.join(', ')}`);

const ROOT = path.resolve(import.meta.dirname, '../..');
const BASE = process.env.BASE || 'http://127.0.0.1:9481';
const OUT = process.env.OUT || '/tmp/glove-skins-ingame';
const storeOnly = process.argv.includes('--store-only');
const gRoot = execSync('npm root -g').toString().trim();
const playwright = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const catalog = STORE_GLOVES.map((skin) => ({
  id: skin.id,
  name: skin.name,
  character_id: null,
  price: skin.price,
  model_path: skin.model,
  available: true,
  slot: 'glove',
  weapon_id: null,
}));
const state = {
  authenticated: true,
  accountId: 'glove-capture-fixture',
  wallet: { balance: 10000 },
  inventory: [{ skin_id: STORE_GLOVES[0].id, slot: 'glove', weapon_id: null, equipped: true }],
  ledger: [],
  quests: {},
  campaign: {},
  catalog,
};

if (!storeOnly) {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
}
await mkdir(path.join(ROOT, 'public/img/gloves'), { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
await context.route('**/api/treta*', (route) => route.fulfill({ json: state }));
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const captures = [];
if (!storeOnly) {
const query = new URLSearchParams({
  debug: '1',
  auto: 'E',
  map: 'piscina_treta',
  armaslazy: '0',
  vmauthored: '1',
  vmfabrica: '1',
  vmqa: 'precision',
  vmready: [...new Set(Object.values(VM_WEAPON).map((entry) => entry.family))].join(','),
  vmweapon: Object.keys(VM_WEAPON).join(','),
});
await page.goto(`${BASE}/?${query}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.addStyleTag({ content: 'astro-dev-toolbar,#vm-precision-qa,#crash-overlay,#boot-splash,#aviso-software,.tutorial-overlay,[data-vmqa]{display:none!important}' });
await page.waitForFunction(() => window.__game?.state === 'live' && window.__vmPrecisionQa && window.__authoredVm, null, { timeout: 240000 });
await page.waitForFunction((id) => window.__game.playerGloveId === id, STORE_GLOVES[0].id, { timeout: 30000 });

for (const skin of STORE_GLOVES) {
  const applied = await page.evaluate((id) => {
    const game = window.__game;
    const vm = window.__authoredVm;
    game.playerGloveId = id;
    const profile = { ...vm.profile, gloveSkinId: id };
    vm.setProfile(profile);
    game.vm.melee?.setProfile(profile);
    window.__vmPrecisionQa.equip('ak');
    game.player.drawUntil = 0;
    return { game: game.playerGloveId, profile: vm.profile.gloveSkinId };
  }, skin.id);
  try {
    await page.waitForFunction((id) => {
      const entry = window.__authoredVm?.entry?.('ak');
      if (!entry?.handMeshes?.length) return false;
      const materials = entry.handMeshes.flatMap((mesh) => Array.isArray(mesh.material) ? mesh.material : [mesh.material]);
      return materials.some((material) => material?.userData?.teamHands?.style === id && material.map);
    }, skin.id, { timeout: 120000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => {
      const vm = window.__authoredVm;
      const entry = vm?.entry?.('ak');
      return {
        weapon: window.__game?.player?.weapon,
        profile: vm?.profile,
        entries: vm ? [...vm.entries.keys()] : [],
        pending: vm ? [...vm.pending.keys()] : [],
        fallback: window.__game?._vmVisibility?.fallback,
        hands: entry?.handMeshes?.map((mesh) => ({
          name: mesh.name,
          materials: (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((material) => ({
            name: material?.name,
            style: material?.userData?.teamHands?.style,
            key: material?.userData?.teamHands?.key,
            map: Boolean(material?.map),
          })),
        })) || [],
      };
    });
    throw new Error(`${skin.id}: ${error.message}; ${JSON.stringify(diagnostic)}; page=${errors.join(' | ')}`);
  }
  await page.waitForTimeout(400);
  const runtime = await page.evaluate((id) => {
    const entry = window.__authoredVm.entry('ak');
    const materials = entry.handMeshes.flatMap((mesh) => Array.isArray(mesh.material) ? mesh.material : [mesh.material]);
    return {
      styles: [...new Set(materials.map((material) => material?.userData?.teamHands?.style).filter(Boolean))],
      maps: materials.filter((material) => material?.userData?.teamHands?.style === id && material.map).length,
    };
  }, skin.id);
  if (applied.game !== skin.id || applied.profile !== skin.id || !runtime.styles.includes(skin.id) || runtime.maps < 1) {
    throw new Error(`${skin.id}: luva não chegou ao material do jogo`);
  }
  const png = path.join(OUT, `${skin.id}.png`);
  await page.screenshot({ path: png, clip: { x: 450, y: 250, width: 990, height: 710 } });
  const poster = path.join(ROOT, 'public', skin.poster.replace(/^\//, ''));
  await sharp(png).resize(960, 640, { fit: 'cover', position: 'southeast' }).webp({ quality: 90 }).toFile(poster);
  captures.push({ id: skin.id, png, poster: path.relative(ROOT, poster), maps: runtime.maps });
}
}
await page.goto(`${BASE}/loja/luvas`, { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.addStyleTag({ content: 'astro-dev-toolbar,#crash-overlay,#boot-splash,#aviso-software,.tutorial-overlay{display:none!important}' });
await page.waitForTimeout(3000);
if (!await page.locator('#treta-gloves-grid .treta-card').count()) console.error(JSON.stringify({ url: page.url(), glovesGrid: await page.locator('#treta-gloves-grid').count(), tabs: await page.locator('[data-treta-view]').allTextContents(), errors }));
await page.waitForFunction(() => document.querySelectorAll('#treta-gloves-grid .treta-card').length > 0, null, { timeout: 60000 });
await page.waitForFunction(() => ![...document.querySelectorAll('#treta-gloves-grid .treta-label')].some((label) => label.textContent === 'CONSULTANDO…'), null, { timeout: 60000 });
const storeNames = await page.locator('#treta-gloves-grid .treta-card strong').allTextContents();
const missingInStore = STORE_GLOVES.map((skin) => skin.name).filter((name) => !storeNames.includes(name));
if (missingInStore.length) throw new Error(`luvas ausentes na loja: ${missingInStore.join(', ')}`);
const moldDir='/tmp/glove-molds';await rm(moldDir,{recursive:true,force:true});await mkdir(moldDir,{recursive:true});
for(const skin of POSTER_GLOVES){
  await page.evaluate(async(id)=>{
    window.__gloveCaptureStage?.dispose();
    document.querySelector('#glove-capture-host')?.remove();
    const host=document.createElement('div');host.id='glove-capture-host';host.style.cssText='position:fixed;left:50%;top:50%;translate:-50% -50%;width:960px;height:640px;z-index:99999;background:radial-gradient(circle at 50% 45%,#273126,#080a08 72%)';document.body.append(host);
    const {GloveSkinStage}=await import('/js/glove-skin-stage.js');const stage=new GloveSkinStage(host);window.__gloveCaptureStage=stage;await stage.load(id);
  },skin.id);
  await page.waitForFunction((id)=>{
    let materials=0,ready=true;
    window.__gloveCaptureStage?.model?.traverse((object)=>{
      if(!object.isMesh)return;
      for(const material of Array.isArray(object.material)?object.material:[object.material]){
        if(material?.userData?.teamHands?.style!==id)continue;
        materials++;
        const image=material.map?.image;
        if(!image || image.complete===false || !(image.naturalWidth || image.width))ready=false;
      }
    });
    return materials>0 && ready;
  },skin.id,{timeout:30000});
  const clip=await page.locator('#glove-capture-host').evaluate((element)=>{const rect=element.getBoundingClientRect();return {x:rect.x,y:rect.y,width:rect.width,height:rect.height};});
  const shot=path.join(moldDir,`${skin.id}.png`);await page.screenshot({path:shot,clip});
  const poster=path.join(ROOT,'public',skin.poster.replace(/^\//,''));
  await sharp(shot).resize(960,640,{fit:'contain',background:{r:8,g:10,b:8,alpha:1}}).webp({quality:92}).toFile(poster);
}
await page.evaluate(()=>{window.__gloveCaptureStage?.dispose();document.querySelector('#glove-capture-host')?.remove();delete window.__gloveCaptureStage;});
await page.reload({waitUntil:'domcontentloaded',timeout:240000});
await page.addStyleTag({ content: 'astro-dev-toolbar,#crash-overlay,#boot-splash,#aviso-software,.tutorial-overlay{display:none!important}' });
await page.waitForFunction(() => document.querySelectorAll('#treta-items-grid .treta-card').length > 0, null, { timeout: 60000 });
const storeCapture = `/tmp/glove-store-${STORE_GLOVES.length}.png`;
await page.evaluate((names) => {
  const stage = document.createElement('section');
  stage.id = 'glove-store-capture';
  stage.style.cssText = 'position:fixed;inset:0;z-index:99999;padding:32px;background:#11140f;overflow:auto';
  const title = document.createElement('h2');
  title.textContent = `LUVAS DA TRETA · ${names.length} VISUAIS`;
  title.style.cssText = 'color:#d9ff42;font:48px Impact,sans-serif;margin:0 0 24px';
  const grid = document.querySelector('#treta-items-grid').cloneNode(false);
  grid.removeAttribute('id');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;height:auto';
  for (const card of document.querySelectorAll('#treta-items-grid .treta-card')) {
    if (names.includes(card.querySelector('strong')?.textContent)) grid.append(card.cloneNode(true));
  }
  stage.append(title, grid);
  document.body.append(stage);
}, STORE_GLOVES.map((skin) => skin.name));
await page.locator('#glove-store-capture').screenshot({ path: storeCapture });
await page.locator('#glove-store-capture').evaluate((element) => element.remove());
await page.locator('#treta-items-grid .treta-card').filter({ hasText: STORE_GLOVES[0].name }).click();
await page.waitForFunction(() => document.querySelector('#treta-detail')?.open && document.querySelector('#treta-buy')?.textContent === 'JÁ EQUIPADA' && document.querySelector('#treta-detail-production')?.textContent.includes('Molde 3D isolado'));
const detailCopy = await page.locator('#treta-detail-production').textContent();
if (!detailCopy.includes('todas as armas')) throw new Error('detalhe da luva não explica o equipamento global');
await page.screenshot({ path: '/tmp/glove-store-detail.png' });
await browser.close();
const unexpectedErrors = errors.filter((message) => !message.includes('/.astro/eval-vite/deps/astro-'));
if (unexpectedErrors.length) throw new Error(`page errors: ${unexpectedErrors.join(' | ')}`);
console.log(JSON.stringify({ checked: captures.length, captures, storeCapture, storeDetail: '/tmp/glove-store-detail.png', storeNames: STORE_GLOVES.map((skin) => skin.name), errors }, null, 2));
