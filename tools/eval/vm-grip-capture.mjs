#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '../..');
const out = process.env.VM_QA_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'vm-pegas-qa-'));
const baseline = process.env.VM_QA_BASELINE === '1';
const base = process.env.VM_QA_URL || 'http://127.0.0.1:4387/';
const framesOnly = process.env.VM_QA_FRAME_ONLY === '1';
const ids = framesOnly ? ['deagle', 'pistol'] : ['knife', 'deagle', 'pistol', 'revolver38', 'ak'];
fs.mkdirSync(out, { recursive: true });
const report = { baseline, sources: Object.fromEntries(['vmgrip.js', 'meleevm.js', 'authoredvm.js', 'data/vmconfig.js']
  .map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'public/js', file))).digest('hex')])), captures: [], pages: [] };
const save = () => fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(report, null, 2));
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio', '--js-flags=--max-old-space-size=768'] });
try {
  for (const [width, height] of [[1200, 800], [1280, 720]]) for (let offset = 0; offset < ids.length; offset += 4) {
    const page = await browser.newPage({ viewport: { width, height } }), errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    await page.addInitScript(() => {
      localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'low', allyBots: 0, enemyBots: 1, menuMusic: false, speech: false }));
      const timer = setInterval(() => {
        const g = window.__game;
        if (!g || g.__qaWrapped) return;
        g.__qaWrapped = true;
        const update = g.update;
        g.update = function(dt) { if (this.state !== 'live') return update.call(this, dt, false); };
        clearInterval(timer);
      }, 10);
    });
    const url = new URL(base);
    url.search = new URLSearchParams({ debug: '1', auto: 'E,mst', map: 'piscina_treta', vmauthored: '1', bloom: '0', vmgrip: baseline ? '0' : '1' });
    await page.goto(url.href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 120000 });
    await page.evaluate(async() => {
      const T = await import('three'), g = window.__game;
      g.update = () => {};
      g.el.banner.style.display = 'none'; document.getElementById('aviso-software')?.remove();
      g.world.root.visible = false;
      for (const object of g.scene.children) if (!object.isLight) object.visible = false;
      g.scene.background = new T.Color('#26313c');
      g.renderer.shadowMap.enabled = false;
      g.player.hp = 100; g.player.alive = true;
      for (const bot of g.bots) { bot.alive = false; bot.mesh.group.visible = false; }
      const label = document.createElement('div'); label.id = 'qa-label';
      label.style = 'position:fixed;left:20px;top:20px;background:#111d;color:white;padding:12px;font:16px sans-serif;z-index:99999'; document.body.appendChild(label);
      window.__render = (camera = g.vmCamera) => {
        g.renderer.autoClear = true; g.renderer.render(g.scene, g.camera);
        g.renderer.autoClear = false; g.renderer.clearDepth(); g.renderer.render(g.vmScene, camera); g.renderer.autoClear = true;
      };
      window.__step = (count = 1) => {
        for (let i = 0; i < count; i++) { g.time += 1 / 60; g._updatePlayer(1 / 60); g._updateFx(1 / 60); }
        g._updateHud(); window.__render();
      };
    });
    const capture = async(id, state, view = 'game') => {
      const data = await page.evaluate(async({ id, state, view }) => {
        const T = await import('three'), g = window.__game, entry = g.vm.authored?.entry(id);
        const scene = id === 'knife' ? g.vm.melee.scene : entry.scene;
        let camera = g.vmCamera;
        if (view !== 'game') {
          g.vmScene.updateMatrixWorld(true);
          const hand = scene.getObjectByName('hand_r').getWorldPosition(new T.Vector3());
          const knuckle = scene.getObjectByName('middle_01_r').getWorldPosition(new T.Vector3());
          const centre = hand.add(knuckle).multiplyScalar(0.5);
          const delta = { side: [0.22, 0.0484, 0.044], underside: [0, -0.198, 0.11], opposite: [-0.22, 0.044, 0.044], front: [0, -0.088, -0.198] }[view];
          camera = new T.PerspectiveCamera(45, g.vmCamera.aspect, 0.0001, 1000);
          camera.position.copy(centre).add(new T.Vector3(...delta)); camera.lookAt(centre);
        }
        document.getElementById('qa-label').textContent = `${id} · ${state} · ${view}`;
        window.__render(camera);
        return { authored: id === 'knife' ? g.vm.melee.active : g.vm.authored.active(id),
          corrected: id === 'knife' ? Boolean(scene.userData.knifeGripCorrected) : id === 'revolver38' ? Boolean(scene.userData.revolverGripCorrected) : null,
          scoped: g.player.scoped, frame: entry?.frame, heapMB: performance.memory?.usedJSHeapSize / 1048576 };
      }, { id, state, view });
      if (!data.authored || data.heapMB > 350) throw Error(`caminho/heap inválido: ${JSON.stringify(data)}`);
      if (data.corrected !== null && data.corrected === baseline) throw Error('flag de pega não chegou ao consumidor');
      const file = `${width}x${height}-${id}-${state.replace(/[^\w-]/g, '_')}-${view}.png`;
      await page.screenshot({ path: path.join(out, file) });
      if (state === 'hip' && ['deagle', 'pistol'].includes(id)) {
        const mask = await page.evaluate(async(id) => {
          const T = await import('three'), g = window.__game, e = g.vm.authored.entry(id);
          const weapons = new Set(e.weaponMeshes), old = [];
          const white = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
          const black = new T.MeshBasicMaterial({ color: 0, toneMapped: false });
          g.vmScene.traverse(o => { if (o.isMesh) { old.push([o,o.material]); o.material = weapons.has(o) ? white : black; } });
          const background = g.vmScene.background; g.vmScene.background = new T.Color(0);
          g.renderer.autoClear = true; g.renderer.render(g.vmScene,g.vmCamera);
          const image = g.renderer.domElement.toDataURL('image/png');
          for (const [o,m] of old) o.material = m;
          g.vmScene.background = background; white.dispose(); black.dispose(); window.__render();
          return image;
        }, id);
        const bytes = Buffer.from(mask.split(',')[1], 'base64');
        fs.writeFileSync(path.join(out, `${width}x${height}-${id}-mask.png`), bytes);
        const sharp = (await import('sharp')).default;
        const { data: pixels, info } = await sharp(bytes).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        let bottom = -1, count = 0;
        for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
          if (pixels[(y * info.width + x) * 3] > 240) { bottom = y; count++; }
        }
        if (count < 100) throw Error('máscara sem arma');
        data.bottomMarginCSS = height - (bottom + 1) * height / info.height;
        data.rasterHeight = info.height; data.visibleWeaponPixels = count;
      }
      report.captures.push({ file, width, height, id, state, view, ...data }); save();
    };
    for (const id of ids.slice(offset, offset + 4)) {
      await page.evaluate(id => { window.__game._switchWeapon(id); window.__step(90); }, id);
      await page.waitForFunction(id => id === 'knife' ? window.__game.vm.melee?.active : window.__game.vm.authored?.active(id), id, { timeout: 60000 });
      for (const mode of framesOnly ? ['hip', 'ads'] : ['hip', 'ads', 'fire']) {
        await page.evaluate(({ id, mode }) => {
          const g = window.__game, p = g.player;
          g._scope(mode === 'ads', true); window.__step(90);
          if (mode === 'fire') { p.nextShotAt = 0; p.reloadUntil = 0; p.drawUntil = 0; g._tryShoot(); window.__step(6); }
        }, { id, mode });
        await capture(id, mode);
      }
      if (id === 'ak' || framesOnly) continue;
      await page.evaluate(() => { window.__game._scope(false, true); window.__step(90); });
      const clips = await page.evaluate(id => id === 'knife' ? [...window.__game.vm.melee.actions.keys()]
        : [...window.__game.vm.authored.entry(id).clips.entries()].filter(([key]) => /idle|reload|shoot|fire|inspect|ads|equip|draw/.test(key)).map(([key]) => key), id);
      for (const clip of clips) for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
        await page.evaluate(async({ id, clip, fraction }) => {
          const T = await import('three'), g = window.__game;
          const controller = id === 'knife' ? g.vm.melee : g.vm.authored.entry(id);
          controller.mixer.stopAllAction();
          const action = id === 'knife' ? controller.actions.get(clip) : controller.mixer.clipAction(controller.clips.get(clip));
          action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).setLoop(T.LoopOnce, 1).play();
          action.clampWhenFinished = true;
          if (id === 'knife') controller.current = action;
          controller.mixer.setTime(Math.min(action.getClip().duration - 1e-5, action.getClip().duration * fraction));
        }, { id, clip, fraction });
        const state = `${clip}-${fraction * 100}`;
        await capture(id, state);
        if (id === 'knife') { await capture(id, state, 'side'); await capture(id, state, 'underside'); }
        else if (id === 'revolver38' && /idle|shoot|fire/.test(clip)) { await capture(id, state, 'opposite'); await capture(id, state, 'front'); }
      }
    }
    report.pages.push({ width, height, offset, errors }); save();
    if (errors.length) throw Error(`pageerrors: ${errors.join('; ')}`);
    await page.close();
  }
} finally { await browser.close(); save(); }
console.log(JSON.stringify({ out, captures: report.captures.length, maxHeapMB: Math.max(...report.captures.map(c => c.heapMB)), errors: report.pages.flatMap(p => p.errors) }));
