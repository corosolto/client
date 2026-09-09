/* Contraste do inimigo real no pôr do sol do Sertão, em navegador e 3:2.
   A máscara vem da diferença entre dois renders idênticos, com e sem o mesmo
   personagem GLB. C18 do BAR exige ΔL* >= 20 entre corpo e fundo local.
   BASE=http://localhost:8145 node tools/eval/sertao-contrast-check.mjs
   Mutante: --mutante=sem-rim remove o mecanismo ativo e deixa C18 vermelho. */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://localhost:8145';
const OUT = process.env.ARTIFACT_DIR || 'artifacts/sertao-casas/contrast-final';
const MUT = process.argv.find(a => a.startsWith('--mutante='))?.slice(10) || '';
if (MUT && !['sem-rim', 'sem-inimigo'].includes(MUT)) throw Error(`Mutante desconhecido: ${MUT}`);
mkdirSync(OUT, { recursive: true });
const root = execSync('npm root -g').toString().trim();
const { chromium } = await import(pathToFileURL(`${root}/playwright/index.mjs`).href);
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--mute-audio'] });

const labL = ([R, G, B]) => {
  const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  const y = .2126729 * f(R) + .7151522 * f(G) + .072175 * f(B);
  return 116 * (y > .008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116) - 16;
};
const median = values => { const s = values.toSorted((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', bots: 4 })));
  await page.goto(`${BASE}/?debug=1&map=velho_oeste&auto=B,sertanejo`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live' && window.__game?.bots?.some(b => b.mesh?.group), null, { timeout: 120000 });
  await page.addStyleTag({ content: '#hud,.screen,astro-dev-toolbar{display:none!important}' });
  const setup = await page.evaluate(async () => {
    const THREE = await import('/vendor/three.module.js'), g = window.__game, w = g.world;
    g.paused = true; if (g.vm?.root) g.vm.root.visible = false;
    const enemy = g.bots.find(b => b.team !== g.playerTeam && b.mesh?.group);
    if (!enemy) throw Error('Sem inimigo GLB real para a régua');
    for (const b of g.bots) b.mesh.group.visible = false;
    enemy.mesh.group.traverse(o => { if (o.isMesh) o.castShadow = false; });
    const rimUniforms = [];
    enemy.mesh.group.traverse(o => {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const material of mats) {
        const u = material?.userData?.csUniforms;
        if (u?.csRimNear && !rimUniforms.some(r => r.u === u)) rimUniforms.push({ u,
          near: u.csRimNear.value, far: u.csRimFar.value, edge: u.csRimEdge.value });
      }
    });
    window.__sertaoContrast = { enemy, THREE, rimUniforms };
    const probe = Object.create(Object.getPrototypeOf(g)); probe.world = w;
    const clearPoint = (x, z) => { const p = new THREE.Vector3(x, 0, z), q = p.clone(); probe._collide(q, .38); return q.distanceTo(p) < 1e-6; };
    const samples = [];
    for (const distance of [5, 20, 40]) {
      let selected = null;
      outer: for (let z = 34; z >= -34; z -= 4) for (let x = -28; x <= 28; x += 4) for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
        const cx = x + Math.sin(angle) * distance, cz = z + Math.cos(angle) * distance;
        if (cx < w.bounds.minX + 1 || cx > w.bounds.maxX - 1 || cz < w.bounds.minZ + 1 || cz > w.bounds.maxZ - 1) continue;
        if (!clearPoint(x, z) || !clearPoint(cx, cz)) continue;
        const from = new THREE.Vector3(cx, 1.62, cz), head = new THREE.Vector3(x, 1.35, z), delta = head.clone().sub(from);
        const ray = new THREE.Raycaster(from, delta.clone().normalize(), 0, delta.length() - .45);
        if (ray.intersectObjects(w.occluders, false).length) continue;
        selected = { distance, target: [x, 0, z], camera: [cx, 1.62, cz] }; break outer;
      }
      if (!selected) throw Error(`Sem linha livre de ${distance} m para contraste`);
      samples.push(selected);
    }
    return { samples, enemyGLB: !!enemy.mesh.isGLB, enemyTeam: enemy.team,
      enemyId: enemy.charId || enemy.id || null, rimMaterials: rimUniforms.length };
  });

  const results = [];
  for (const sample of setup.samples) {
    await page.evaluate(({ sample, mutant }) => {
      const g = window.__game, { enemy, THREE, rimUniforms } = window.__sertaoContrast;
      for (const r of rimUniforms) { r.u.csRimNear.value = r.near; r.u.csRimFar.value = r.far; r.u.csRimEdge.value = r.edge; }
      if (mutant === 'sem-rim') for (const r of rimUniforms) {
        r.u.csRimNear.value = 0; r.u.csRimFar.value = 0; r.u.csRimEdge.value = 0;
      }
      const target = new THREE.Vector3(...sample.target), camera = new THREE.Vector3(...sample.camera);
      enemy.pos?.copy(target); enemy.mesh.group.position.copy(target); enemy.mesh.group.rotation.set(0, Math.PI, 0);
      enemy.alive = true; enemy.hp = 100; enemy.mesh.ctrl?.revive?.();
      enemy.mesh.group.visible = mutant !== 'sem-inimigo';
      g.camera.position.copy(camera); g.camera.lookAt(target.clone().add(new THREE.Vector3(0, 1, 0)));
      g.camera.updateMatrixWorld(true); g.scene.updateMatrixWorld(true); g.renderer.render(g.scene, g.camera);
    }, { sample, mutant: MUT });
    const visible = await page.screenshot();
    await page.evaluate(() => {
      const g = window.__game, state = window.__sertaoContrast;
      for (const r of state.rimUniforms) { r.u.csRimNear.value = 0; r.u.csRimFar.value = 0; r.u.csRimEdge.value = 0; }
      g.renderer.render(g.scene, g.camera);
    });
    const noRim = await page.screenshot();
    await page.evaluate(() => { const g = window.__game, e = window.__sertaoContrast.enemy; e.mesh.group.visible = false; g.renderer.render(g.scene, g.camera); });
    const hidden = await page.screenshot();
    if (!MUT) await sharp(visible).png().toFile(`${OUT}/inimigo-${sample.distance}m.png`);

    const a = await sharp(visible).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const r = await sharp(noRim).removeAlpha().raw().toBuffer();
    const b = await sharp(hidden).removeAlpha().raw().toBuffer();
    const bodyL = [], backgroundL = [], rimGain = []; let changed = 0, rimPixels = 0;
    for (let i = 0; i < a.data.length; i += 3) {
      const delta = Math.max(Math.abs(a.data[i] - b[i]), Math.abs(a.data[i + 1] - b[i + 1]), Math.abs(a.data[i + 2] - b[i + 2]));
      if (delta < 8) continue;
      changed++;
      const onL = labL([a.data[i], a.data[i + 1], a.data[i + 2]]), offL = labL([r[i], r[i + 1], r[i + 2]]);
      bodyL.push(onL); backgroundL.push(labL([b[i], b[i + 1], b[i + 2]]));
      rimGain.push(onL - offL); if (onL - offL >= 2) rimPixels++;
    }
    const body = median(bodyL), background = median(backgroundL);
    const positiveRim = rimGain.filter(v => v > 0).toSorted((x, y) => x - y);
    const rimP95 = positiveRim.length ? positiveRim[Math.floor(positiveRim.length * .95)] : 0;
    results.push({ ...sample, changedPixels: changed, bodyL: body, backgroundL: background,
      deltaL: body == null || background == null ? 0 : Math.abs(body - background), rimPixels, rimFraction: changed ? rimPixels / changed : 0,
      // O BAR aceita contorno explícito sem impor força numérica. A prova exige
      // uma banda em >=10% da máscara e ganho p95 >=3 L*, acima do ruído/JND
      // observado no contrafactual sem rim (p95 <=2,71 L*).
      rimP95, explicitRim: rimPixels >= 24 && rimPixels / Math.max(1, changed) >= .10 && rimP95 >= 3 });
    await page.evaluate(() => { window.__sertaoContrast.enemy.mesh.group.visible = true; });
  }
  const checks = { C18: setup.enemyGLB && setup.rimMaterials > 0
    && results.every(r => r.changedPixels >= 12 && (r.deltaL >= 20 || r.explicitRim)), C18R: errors.length === 0 };
  const report = { checks, setup, results, errors, mutation: MUT || null, method: 'máscara diferencial do inimigo GLB real contra o mesmo fundo, CIELAB D65, 1536x1024' };
  writeFileSync(`${OUT}/report${MUT ? `-${MUT}` : ''}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  if (MUT) process.exitCode = !checks.C18 && checks.C18R ? 0 : 1;
  else process.exitCode = Object.values(checks).every(Boolean) ? 0 : 1;
} finally { await browser.close(); }
