// Sonda de ADS no jogo real: projeta alça/massa (nó ref + coordenada local) na vmCamera.
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const PORT = opt('porta', '4641');
const ROOT = process.cwd();
const { VM_WEAPON } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/vmconfig.js')).href);
const families = [...new Set(Object.values(VM_WEAPON).map((e) => e.family))];
const query = new URLSearchParams({ debug: '1', auto: 'P,mst', map: 'piscina_treta', armaslazy: '0', vmauthored: '1', vmqa: 'precision', vmready: families.join(','), vmweapon: Object.keys(VM_WEAPON).join(',') }).toString();
const pw = await import(pathToFileURL(`${execSync('npm root -g').toString().trim()}/playwright/index.js`).href);
const browser = await (pw.chromium || pw.default.chromium).launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.goto(`http://127.0.0.1:${PORT}/?${query}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
await page.waitForFunction(() => window.__game?.state === 'live' && window.__vmPrecisionQa && window.__authoredVm, null, { timeout: 240000 });
const alvos = JSON.parse(opt('alvos'));
for (const [w, a] of Object.entries(alvos)) {
  await page.evaluate((x) => window.__vmPrecisionQa.equip(x), w);
  await page.waitForFunction((x) => { const e = window.__authoredVm.entry(x); return e && e.mint?.active && e.mount.visible; }, w, { timeout: 120000 });
  await page.waitForTimeout(2500);
  for (const fase of ['idle', 'ads']) {
    if (fase === 'ads') { await page.evaluate(() => window.__vmPrecisionQa.ads()); await page.waitForTimeout(2500); }
    const r = await page.evaluate(({ x, a }) => {
      const g = window.__game; const vm = window.__authoredVm; const e = vm.entry(x);
      const cam = g.vmCamera; const T = e.mount.parent.constructor; // THREE.Object3D
      const proj = (obj, loc) => { const v = obj.localToWorld(obj.worldToLocal(obj.getWorldPosition(new (Object.getPrototypeOf(cam.position).constructor)())).set(...loc)); const c = v.clone().project(cam); return [Math.round(c.x * 720), Math.round(-c.y * 480), +(-v.z).toFixed(3)]; };
      e.mount.updateWorldMatrix(true, true);
      const ref = e.scene.getObjectByName(a.ref);
      return { ads: vm.adsAmount, fov: cam.fov, aspect: cam.aspect, mount: [...e.mount.position.toArray().map((v) => +v.toFixed(3)), ...e.mount.rotation.toArray().slice(0, 3).map((v) => +(v * 57.3).toFixed(1))],
        alca: proj(ref, a.alca), massa: proj(ref, a.massa), sight: proj(e.sockets.sight, [0, 0, 0]) };
    }, { x: w, a });
    console.log(w, fase, JSON.stringify(r));
  }
  await page.evaluate(() => window.__vmPrecisionQa.ads());
  await page.waitForTimeout(800);
}
await browser.close();
