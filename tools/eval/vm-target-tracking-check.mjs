#!/usr/bin/env node
// BUG-181: alvo de 1,6 m a 8 m em partida 3:2; alpha.7: 26–41% visível no centro, 0–7% nas bordas.
// Mede oclusão da arma no centro e visibilidade lateral. O alvo sintético ignora cobertura
// do mapa. O modo dinâmico mede entrada de mouse e raios reais, mas não line of sight.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { WEAPONS } from '../../public/js/data/weapons.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const measure = process.argv.includes('--measure');
const review = process.argv.includes('--review');
const perf = process.argv.includes('--perf');
const dynamic = process.argv.includes('--dynamic');
const dynamicOnly = process.argv.includes('--dynamic-only');
const mutant = process.argv.find((s) => s.startsWith('--mutante='))?.slice(10);
if (mutant && !['zoom-antigo', 'paralaxe-antiga', 'cruz-fixa'].includes(mutant)) throw new Error(`mutante desconhecido: ${mutant}`);
const small = process.argv.includes('--small');
const stationary = process.argv.includes('--stationary');
const depth = Number(process.argv.find((s) => s.startsWith('--depth='))?.slice(8) || 8);
const hitRadius = Number(process.argv.find((s) => s.startsWith('--hit-radius='))?.slice(13) || 0.5);
const camMode = process.argv.find((s) => s.startsWith('--cam='))?.slice(6) || 'first';
if (!['first', 'third', 'shoulder'].includes(camMode)) throw new Error(`câmera inválida: ${camMode}`);
const auto = process.argv.find((s) => s.startsWith('--auto='))?.slice(7) || 'E,esquerdomacho';
const out = path.join(root, 'artifacts/vm-target-tracking', auto.replace(/[^a-z0-9_-]/gi, '-'));
fs.mkdirSync(out, { recursive: true });
const weapons = (process.argv.find((s) => s.startsWith('--weapons='))?.slice(10).split(',')
  || (process.argv.includes('--all') ? Object.keys(WEAPONS).filter((id) => id !== 'knife' && !WEAPONS[id].scope)
    : ['ak', 'md97', 'mp5', 'p90', 'm92', 'uzi']));
const port = await new Promise((resolve, reject) => {
  const socket = net.createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => {
    const p = socket.address().port;
    socket.close(() => resolve(p));
  });
});
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['tools/eval/serve.mjs', String(port)], { cwd: root, stdio: 'ignore' });
let browser;
const failures = [];
const check = (name, ok, value) => {
  console.log(`${ok ? 'PASSA' : 'FALHA'} ${name}: ${JSON.stringify(value)}`);
  if (!ok) failures.push(name);
};
const visibleTarget = async (png) => {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let visible = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > 170 && data[i + 1] < 90 && data[i + 2] > 170) visible++;
  }
  return visible;
};
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { ready = (await fetch(base)).ok; if (ready) break; } catch { /* boot */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw new Error('jogo local não subiu');
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
  const page = await browser.newPage({ viewport: small ? { width: 900, height: 600 } : { width: 1500, height: 1000 } });
  let mutationApplied = false;
  if (mutant) await page.route('**/js/game.js*', async (route) => {
    const response = await route.fetch();
    let source = await response.text();
    const old = 'return Z[w] || 66;';
    if (mutant === 'zoom-antigo') {
      if (!source.includes(old)) throw new Error('mutante não encontrou o zoom de produção');
      mutationApplied = true;
      source = source.replace(old, 'return Z[w] || 56;');
    }
    if (mutant === 'paralaxe-antiga') {
      const shot = "const aimQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(shotAim.pitch, shotAim.yaw, 0, 'YXZ'));";
      const camera = 'cam.lookAt(aimPoint.copy(this._eyeWorld).addScaledVector(fwd, 12));';
      const reticle = 'this._updateCrosshairParallax();';
      if (!source.includes(shot) || !source.includes(camera) || !source.includes(reticle)) throw new Error('mutante não encontrou convergência');
      mutationApplied = true;
      source = source.replace(shot, 'const aimQ = this.camera.quaternion;')
        .replace(camera, 'cam.rotation.set(p.pitch, p.yaw, 0);')
        .replace(reticle, "this.el.crosshair.style.left = '50%'; this.el.crosshair.style.top = '50%';");
    }
    if (mutant === 'cruz-fixa') {
      const gap = 'gap = Math.max(2, Math.min(26, Math.tan(spread * 0.5) / Math.tan(this.camera.fov * Math.PI / 360) * innerHeight / 2));';
      if (!source.includes(gap)) throw new Error('mutante não encontrou a cruz de ADS');
      mutationApplied = true;
      source = source.replace(gap, 'gap = 2;');
    }
    await route.fulfill({ response, body: source });
  });
  page.on('pageerror', (error) => console.log(`pageerror: ${error.message.slice(0, 160)}`));
  await page.goto(`${base}/?debug=1&auto=${encodeURIComponent(auto)}&map=${small ? 'piscina_treta' : 'amazonia'}&vmqa=precision&bloom=0`, { waitUntil: 'load', timeout: 180000 });
  if (mutant && !mutationApplied) throw new Error('mutante não interceptou o módulo do jogo');
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 90000 });
  if (review && await page.locator('#aviso-software button').count()) await page.locator('#aviso-software button').click({ force: true });
  if (small) await page.evaluate(() => { const g = window.__game; g.settings.quality = 'low'; g._applyQuality(); });
  await page.evaluate(() => window.__game._ensureVmPrecisionQa());
  await page.evaluate(async (targetDepth) => {
    const THREE = await import('/vendor/three.module.js');
    const g = window.__game;
    const target = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6), new THREE.MeshBasicMaterial({
      color: 0xff00ff, side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    }));
    target.renderOrder = 9999;
    target.position.set(0, -0.35, -targetDepth);
    g.camera.add(target);
    window.__trackingTarget = target;
  }, depth);
  for (const id of weapons) {
    await page.evaluate(({ w, cam }) => { window.__vmPrecisionQa.equip(w); window.__game.setCamView(cam); window.__game._scope(true, true); }, { w: id, cam: camMode });
    await page.waitForFunction((w) => {
      const g = window.__game;
      return g.player.weapon === w && g.vm.authored?.active(w) && g._aimF >= 0.95 && g.vm.adsF >= 0.95 && Math.abs(g.camera.fov - g._zoomFov(w)) < 0.1;
    }, id, { timeout: 20000 });
    await page.waitForTimeout(300);
    if (perf && camMode !== 'first') {
      const cost = await page.evaluate(() => {
        const g = window.__game, t0 = performance.now();
        for (let i = 0; i < 50; i++) g._updateCrosshairParallax();
        return { msPerCall: +((performance.now() - t0) / 50).toFixed(3), occluders: g.world.occluders.length };
      });
      console.log(`TEMPO ${id} ${camMode}: ${JSON.stringify(cost)}`);
    }
    const crosshair = await page.evaluate(async () => {
      const g = window.__game;
      const gap = () => parseFloat(g.el.crosshair.style.getPropertyValue('--ch'));
      g.bloom = 0;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const idle = gap();
      g.bloom = 1.4;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const spray = gap();
      g.bloom = 0;
      return { idle, spray };
    });
    // Armas sem rajada podem ter cone projetado abaixo do piso legível de 2 px.
    // Nessas, a cruz não pode fechar quando o cone cresce; nas automáticas deve abrir.
    check(`${id} ${camMode} cruz reage à dispersão`, WEAPONS[id].auto
      ? crosshair.spray > crosshair.idle + (small ? 0.5 : 1) : crosshair.spray >= crosshair.idle, crosshair);
    if (!dynamicOnly) {
      const fov = await page.evaluate(() => window.__game.camera.fov);
      const samples = [];
      for (const x of [-7, -3, 0, 3, 7]) {
        await page.evaluate((offset) => { window.__trackingTarget.position.x = offset; }, x);
        await page.evaluate(() => new Promise((resolve) => {
          let frames = 0;
          const step = () => (++frames >= 4 ? resolve() : requestAnimationFrame(step));
          requestAnimationFrame(step);
        }));
        const file = path.join(out, `${id}-${camMode}-${x}.png`);
        const png = await page.screenshot({ path: file });
        samples.push({ x, pixels: await visibleTarget(png) });
      }
      const core = Math.max(samples.find((s) => s.x === -3).pixels, samples.find((s) => s.x === 3).pixels);
      const center = samples.find((s) => s.x === 0).pixels / core;
      const side = Math.min(...[-7, 7].map((x) => samples.find((s) => s.x === x).pixels / core));
      const result = { weapon: id, fov: +fov.toFixed(2), center: +center.toFixed(3), side: +side.toFixed(3), samples };
      check(`${id} ${camMode} oclusão em ADS`, fov >= 64 && center >= 0.6 && side >= 0.72, result);
    }
    if (dynamic || dynamicOnly) {
      const burst = await page.evaluate(async ({ still, targetDepth, radius }) => {
        const THREE = await import('/vendor/three.module.js');
        const g = window.__game, target = window.__trackingTarget;
        // Distância medida a partir do olho (origem autoritativa), não da câmera
        // deslocada de terceira pessoa.
        const origin = g._eyeWorld.clone().addScaledVector(
          new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(g.player.pitch, g.player.yaw, 0, 'YXZ')),
          targetDepth);
        origin.y -= 0.35;
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(g.camera.quaternion);
        g.scene.add(target);
        const occluders = g.world.occluders;
        g.world.occluders = [target]; // alvo sintético em linha de visão isolada
        target.position.copy(origin);
        const ray = new THREE.Ray();
        let shots = 0, hits = 0, samples = 0, error = 0, errorY = 0, maxError = 0, miss = 0, signedX = 0, signedY = 0;
        let aimDeltaDeg = 0, originDeltaCm = 0;
        const gapIdle = parseFloat(g.el.crosshair.style.getPropertyValue('--ch'));
        let gapPeak = gapIdle;
        const fire = g._fireHitscan.bind(g);
        g._fireHitscan = function (...args) {
          if (args[4]) {
            shots++;
            ray.set(args[1], args[2]);
            if (g._tpReticleDir) aimDeltaDeg += Math.acos(Math.max(-1, Math.min(1, ray.direction.dot(g._tpReticleDir)))) * 180 / Math.PI;
            originDeltaCm += ray.origin.distanceTo(g._eyeWorld) * 100;
            const missSq = ray.distanceSqToPoint(target.position);
            miss += Math.sqrt(missSq);
            const closest = ray.closestPointToPoint(target.position, new THREE.Vector3());
            signedX += closest.x - target.position.x;
            signedY += closest.y - target.position.y;
            if (missSq < radius * radius) hits++;
          }
          return fire(...args);
        };
        const start = performance.now();
        let lastFrame = start, simTime = 0;
        await new Promise((resolve) => {
          const frame = () => {
            const now = performance.now();
            const t = (now - start) / 1000;
            if (t > 3) { resolve(); return; }
            // SwiftShader pode renderizar a 10 FPS; limitar o passo simulado
            // evita saltos impossíveis de seguir entre dois quadros. A 30+ FPS
            // o alvo conserva sua velocidade real máxima de 5,5 m/s.
            simTime += Math.min((now - lastFrame) / 1000, 1 / 30);
            lastFrame = now;
            target.position.copy(origin).addScaledVector(right, still ? 0 : 2.5 * Math.sin(simTime * 2.2));
            target.lookAt(g.camera.position);
            const projected = target.position.clone().project(g.camera);
            const px = projected.x * (innerWidth / 2);
            const reticleX = (parseFloat(g.el.crosshair.style.left) / 100 - 0.5) * innerWidth;
            const reticleY = (parseFloat(g.el.crosshair.style.top) / 100 - 0.5) * innerHeight;
            const hFov = Math.atan(Math.tan(g.camera.fov * Math.PI / 360) * g.camera.aspect);
            const yawError = Math.atan((px - reticleX) / (innerWidth / 2) * Math.tan(hFov));
            const pitchError = Math.atan((projected.y * innerHeight / 2 + reticleY) / (innerHeight / 2)
              * Math.tan(g.camera.fov * Math.PI / 360));
            const sens = g.settings.sens * 0.0021 * (g.camera.fov / 70);
            if (t > (still ? 1.2 : 0.8)) {
              const deltaPx = px - reticleX;
              const deltaY = -projected.y * innerHeight / 2 - reticleY;
              samples++; error += Math.abs(deltaPx); errorY += Math.abs(deltaY);
              maxError = Math.max(maxError, Math.hypot(deltaPx, deltaY));
              gapPeak = Math.max(gapPeak, parseFloat(g.el.crosshair.style.getPropertyValue('--ch')));
              g.player.hp = 100;
              if (!still || shots === 0) g._tryShoot();
            }
            if (!still || t < 0.8) g._mm({ movementX: Math.max(-400, Math.min(400, yawError / sens)),
              movementY: Math.max(-300, Math.min(300, -pitchError / sens)) });
            requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        });
        g._fireHitscan = fire;
        g.ray.set(g._eyeWorld, g._tpReticleDir || new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion));
        g.ray.far = 200;
        const firstWorld = g.ray.intersectObjects(g.world.occluders, false)[0];
        const reticleHit = firstWorld ? { target: firstWorld.object === target,
          distance: +firstWorld.distance.toFixed(2),
          missCm: +(firstWorld.point.distanceTo(target.position) * 100).toFixed(1) } : null;
        g.world.occluders = occluders;
        g.camera.add(target);
        target.position.set(0, -0.35, -targetDepth);
        return { shots, hits, frames: samples, missCm: +(miss / shots * 100).toFixed(1),
          dxCm: +(signedX / shots * 100).toFixed(1), dyCm: +(signedY / shots * 100).toFixed(1),
          aimDeltaDeg: +(aimDeltaDeg / shots).toFixed(2), originDeltaCm: +(originDeltaCm / shots).toFixed(1),
          meanErrorPx: +(error / samples).toFixed(1), meanErrorYPx: +(errorY / samples).toFixed(1),
          maxErrorPx: +maxError.toFixed(1), simSeconds: +simTime.toFixed(2), gapIdle, gapPeak, reticleHit };
      }, { still: stationary, targetDepth: depth, radius: hitRadius });
      const pass = stationary ? burst.shots === 1 && burst.hits === 1
        : burst.shots >= 4 && burst.hits / burst.shots >= 0.35 && burst.meanErrorPx <= 115;
      check(`${id} ${camMode} câmera e tiros com alvo lateral`, pass, burst);
    }
    if (review) {
      await page.evaluate(() => {
        window.__trackingTarget.visible = false;
        document.querySelector('#vm-precision-qa').style.display = 'none';
      });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(out, `${id}-${camMode}-review.png`) });
      await page.evaluate(() => {
        window.__trackingTarget.visible = true;
        document.querySelector('#vm-precision-qa').style.display = '';
      });
    }
  }
} catch (error) {
  check('execução', false, error.stack || String(error));
} finally {
  await browser?.close();
  server.kill();
}
console.log(`vm-target-tracking: ${failures.length} falha(s)`);
process.exitCode = measure ? 0 : mutant ? Number(failures.length === 0) : Number(failures.length > 0);
