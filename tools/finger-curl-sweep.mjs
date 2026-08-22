// Diagnostico visual da orientacao do osso Curl_* em rigs Meshy.
// Captura a mesma pose montada da selecao e varia o eixo/sinal da dobra dos dedos.
// Uso: node tools/finger-curl-sweep.mjs <char> <arma> <saida-dir> [view]
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const CHAR = process.argv[2] || 'motoca-cachorro-loko';
const WEAPON = process.argv[3] || 'shotgun';
const OUT = process.argv[4] || `/tmp/curl-sweep-${CHAR}`;
const VIEW = process.argv[5] || 'tq';
const BASE = process.env.BASE || 'http://localhost:8123';
const candidates = [
  ['zero', 0, 0, 0],
  ['xp020', 0.20, 0, 0],
  ['xp035', 0.35, 0, 0],
  ['xp065', 0.65, 0, 0], ['xp075', 0.75, 0, 0], ['xp085', 0.85, 0, 0],
  ['xp05', 0.5, 0, 0], ['xn05', -0.5, 0, 0],
  ['yp05', 0, 0.5, 0], ['yn05', 0, -0.5, 0],
  ['zp05', 0, 0, 0.5], ['zn05', 0, 0, -0.5],
  ['xp10', 1.0, 0, 0], ['xn10', -1.0, 0, 0],
  ['yp10', 0, 1.0, 0], ['yn10', 0, -1.0, 0],
  ['zp10', 0, 0, 1.0], ['zn10', 0, 0, -1.0],
  ['xp15', 1.5, 0, 0], ['xp20', 2.0, 0, 0],
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const root = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${root}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new'],
});
const page = await browser.newPage({ viewport: { width: 720, height: 720 } });
await page.goto(`${BASE}/mounttest.html?char=${encodeURIComponent(CHAR)}&w=${encodeURIComponent(WEAPON)}&view=${VIEW}&play=idle&manual=1`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.MOUNT_READY, null, { timeout: 60000 });
console.log('runtime curl:', await page.evaluate(() => {
  const out = [];
  window.MOUNT_CTRL.model.traverse((o) => {
    if (o.isBone && /Curl_/.test(o.name)) out.push({ name: o.name, xyz: [o.rotation.x, o.rotation.y, o.rotation.z] });
  });
  return out;
}));
for (const [name, x, y, z] of candidates) {
  const metric = await page.evaluate(async ([rx, ry, rz]) => {
    const THREE = await import('three');
    const ctrl = window.MOUNT_CTRL;
    let n = 0;
    ctrl.model.traverse((o) => {
      if (o.isBone && /^Curl_[LR]/.test(o.name)) {
        o.rotation.set(rx, ry, rz);
        n++;
      }
    });
    ctrl.model.updateMatrixWorld(true);
    ctrl.model.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.update(); });
    window.RENDER?.();
    const gun = ctrl.tpMount?.mount?.children?.[0];
    const bb = gun ? new THREE.Box3().setFromObject(gun) : null;
    const distances = { R: [], L: [] };
    if (bb) ctrl.model.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const pos = o.geometry.getAttribute('position');
      const joints = o.geometry.getAttribute('skinIndex');
      const weights = o.geometry.getAttribute('skinWeight');
      if (!pos || !joints || !weights) return;
      for (let i = 0; i < pos.count; i++) {
        let side = null;
        for (let s = 0; s < 4; s++) {
          const bone = o.skeleton.bones[joints.array[i * joints.itemSize + s]];
          const weight = weights.array[i * weights.itemSize + s];
          if (weight > 0.05 && /^Curl_R(?:_Tip)?$/.test(bone?.name || '')) side = 'R';
          if (weight > 0.05 && /^Curl_L(?:_Tip)?$/.test(bone?.name || '')) side = 'L';
        }
        if (!side) continue;
        const p = new THREE.Vector3().fromBufferAttribute(pos, i);
        o.applyBoneTransform(i, p);
        o.localToWorld(p);
        distances[side].push(bb.distanceToPoint(p));
      }
    });
    const q = (a, f) => a.length ? a.sort((u, v) => u - v)[Math.floor((a.length - 1) * f)] : null;
    return { bones: n, p50R: q(distances.R, 0.5), p50L: q(distances.L, 0.5), p90R: q(distances.R, 0.9), p90L: q(distances.L, 0.9) };
  }, [x, y, z]);
  console.log(name, metric);
  await page.screenshot({ path: `${OUT}/${name}-${metric.bones}bones.png` });
}
await browser.close();
console.log(`curl sweep -> ${OUT}`);
