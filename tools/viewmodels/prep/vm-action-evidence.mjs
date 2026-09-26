// Poses deterministas no jogo; nao substituem o teste de transicoes em tempo real.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { MEDIR } from './vm-frame-measure.mjs';

const arg = (name, fallback = '') => process.argv.find((v) => v.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const root = process.cwd();
const out = path.resolve(arg('out', 'artifacts/viewmodels/fechamento-ruben/poses'));
const weapons = arg('armas', 'ak,m4,uzi').split(',');
const char = arg('personagem', 'esquerdomacho');
const mutant = arg('mutante');
const candidate = arg('candidato');
const candidateWeapon = arg('arma-candidata');
const candidateRuntime = arg('vmweapon-candidato');
const candidateMapFile = arg('candidatas-json');
const familyMapFile = arg('familias-json');
const worldMapFile = arg('fontes-json');
let candidatePaths = {};
let familyPaths = {};
const inspect = process.argv.includes('--inspecao');
const inspectionOrbit = Number(arg('orbita-inspecao', '0'));
if (!Number.isFinite(inspectionOrbit)) throw new Error('Órbita de inspeção inválida');
const idleOnly = process.argv.includes('--so-idle');
const packReference = process.argv.includes('--referencia-pack');
const sequence = process.argv.includes('--sequencia-real');
const pick = arg('pick').split(',').filter(Boolean).map(Number);
if (pick.length && (pick.length !== 2 || pick.some(v => !Number.isFinite(v)))) throw new Error('Pick exige x,y em pixels');
const shootFractions = arg('shoot-frames', '0.3').split(',').map(Number);
if (shootFractions.some((f) => !Number.isFinite(f) || f < 0 || f > 1.5)) throw new Error('Fração de tiro inválida');
const reloadFractions = arg('reload-frames', '0,0.15,0.25,0.35,0.45,0.55,0.65,0.75,0.85,1').split(',').map(Number);
if (reloadFractions.some((f) => !Number.isFinite(f) || f < 0 || f > (sequence ? 1.5 : 1))) throw new Error('Fração de recarga inválida');
const gRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const playwright = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default.chromium;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const report = { head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  personagem: char, referenciaPack: packReference, inspecao: inspect, orbitaInspecao: inspectionOrbit, mutante: mutant,
  modo: sequence ? 'controlador-com-passo-fixo' : 'pose-congelada-no-jogo', assets: {}, frames: [], errors: [] };
report.assetRequests = [];
page.on('request', (request) => {
  const url = new URL(request.url());
  if (/\/(models\/weapons|models\/viewmodels|private-assets\/viewmodels)\/.+\.glb$/.test(url.pathname))
    report.assetRequests.push(`${url.pathname}${url.search}`);
});
page.on('pageerror', (e) => report.errors.push(String(e).slice(0, 200)));
await fs.mkdir(out, { recursive: true });
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
try {
  if (candidateRuntime) {
    const content = await fs.readFile(path.resolve(candidateRuntime));
    report.runtimeCandidate = { path: candidateRuntime, sha256: hash(content) };
    await page.route('**/js/vmweapon.js*', (route) => route.fulfill({ body: content, contentType: 'text/javascript' }));
  }
  if (candidateMapFile) candidatePaths = JSON.parse(await fs.readFile(candidateMapFile, 'utf8'));
  if (familyMapFile) familyPaths = JSON.parse(await fs.readFile(familyMapFile, 'utf8'));
  for (const [family, file] of Object.entries(familyPaths)) {
    if (!/^[a-z0-9]+$/.test(family)) throw new Error(`Família inválida: ${family}`);
    await page.route(`**/private-assets/viewmodels/${family}/${family}-runtime.glb*`,
      (route) => route.fulfill({ path: path.resolve(file), contentType: 'model/gltf-binary' }));
  }
  if (worldMapFile) {
    report.worldCandidates = {};
    for (const [weapon, file] of Object.entries(JSON.parse(await fs.readFile(worldMapFile, 'utf8')))) {
      if (!/^[a-z0-9]+$/.test(weapon)) throw new Error(`Arma inválida: ${weapon}`);
      report.worldCandidates[weapon] = { file, sha256: hash(await fs.readFile(file)) };
      await page.route(`**/models/weapons/${weapon}.glb*`,
        (route) => route.fulfill({ path: path.resolve(file), contentType: 'model/gltf-binary' }));
    }
  }
  if (candidate) {
    if (!candidateWeapon) throw new Error('--candidato exige --arma-candidata');
    candidatePaths[candidateWeapon] = candidate;
  }
  for (const [weapon, file] of Object.entries(candidatePaths)) {
    if (!/^[a-z0-9]+$/.test(weapon)) throw new Error(`Arma invalida: ${weapon}`);
    await page.route(`**/models/viewmodels/coro/${weapon}-hires.glb*`,
      (route) => route.fulfill({ path: path.resolve(file), contentType: 'model/gltf-binary' }));
  }
  const base = `http://127.0.0.1:${arg('porta', '4361')}`;
  const query = new URLSearchParams({ debug: '1', vmauthored: '1', auto: `E,${char}`, map: 'brasilia', armaslazy: '0' });
  await page.goto(`${base}/?${query}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.evaluate((m) => { window.__game.paused = true; window.__VM_MUTANTE = m; }, mutant);
  for (const weapon of weapons) {
    await page.evaluate((w) => {
      const g = window.__game;
      g.paused = false;
      g._switchWeapon(w);
      g.paused = true;
    }, weapon);
    await page.waitForFunction((w) => window.__game.vm.authored?.entry(w)?.handMeshes?.length > 0,
      weapon, { timeout: 60000 });
    const metadata = await page.evaluate((w) => {
      const g = window.__game, vm = g.vm.authored, e = vm.entry(w);
      g._applyVmVisibility();
      vm._idle(e);
      e.drawTime = e.drawDuration;
      vm.setAim(w, 0);
      vm.adsAmount = 0;
      vm.update(0);
      return { key: e.key, character: g.playerDef?.id, clips: [...e.clips].map(([k, c]) => ({ key: k, name: c.name, duration: c.duration })) };
    }, weapon);
    if (metadata.character !== char) throw new Error(`Personagem mudou: ${metadata.character}`);
    const source = familyPaths[metadata.key] || (candidatePaths[weapon] ? candidatePaths[weapon]
      : metadata.key.startsWith('gold#') ? `public/models/viewmodels/coro/${weapon}-hires.glb`
      : !metadata.key.includes('#') ? `public/private-assets/viewmodels/${metadata.key}/${metadata.key}-runtime.glb` : null);
    report.assets[weapon] = { ...metadata, source, sha256: source ? hash(await fs.readFile(source)) : null };
    const poses = [['idle', 0], ...(!idleOnly ? [...shootFractions.map((f) => ['shoot', f]), ...reloadFractions.map((f) => ['reload', f])] : []),
      ...(process.argv.includes('--incluir-equip') ? [0, 0.25, 0.5, 0.75, 1, ...(sequence ? [1.1] : [])].map((f) => ['equip', f]) : [])];
    for (const [action, fraction] of poses) {
      const frame = await page.evaluate(async ({ weapon, action, fraction, inspect, inspectionOrbit, packReference, sequence, pick }) => {
        const g = window.__game, vm = g.vm.authored, e = vm.entry(weapon);
        const key = action === 'reload' ? ['reload', 'reload_tactical', 'reload_empty', 'reload_loop'].find((k) => e.clips.has(k))
          : action === 'equip' ? 'equip_rifle' : action;
        const clip = e.clips.get(key);
        if (!clip && !sequence) return { missing: action };
        vm._idle(e);
        e.drawTime = e.drawDuration;
        let duration = clip?.duration || 0, elapsed = 0;
        const visited = [];
        if (sequence) {
          const { WEAPONS } = await import('/js/data/weapons.js');
          const { VM_FAMILY } = await import('/js/data/vmconfig.js');
          vm.recoil.t = Infinity;
          vm.recoil.lastShot = -Infinity;
          for (const k of Object.keys(vm.recoil.residual)) vm.recoil.residual[k] = vm.recoil.out[k] = 0;
          e.stateUntil = 0;
          if (action === 'reload') {
            duration = WEAPONS[weapon].reload;
            if (!vm.reload(weapon, duration, true, 3)) return { missing: action };
          } else if (action === 'equip') {
            duration = VM_FAMILY[e.family]?.cs16?.draw || 0.32;
            if (!vm.draw(weapon, duration)) return { missing: action };
          } else if (action === 'shoot') {
            duration = VM_FAMILY[e.family]?.cs16?.shoot || e.clips.get('pump')?.duration || duration || 0.25;
            const random = Math.random;
            try { Math.random = () => 0.5; if (!vm.shoot(weapon)) return { missing: action }; }
            finally { Math.random = random; }
          }
          const target = duration * fraction;
          while (elapsed < target - 1e-10) {
            const name = e.action?.getClip().name;
            if (visited.at(-1) !== name) visited.push(name);
            const dt = Math.min(1 / 120, target - elapsed);
            vm.update(dt);
            elapsed += dt;
          }
        } else {
          if (key !== 'idle') vm._play(e, key, { fade: 0 });
          const a = e.action;
          a.stopFading();
          a.setEffectiveWeight(1);
          a.time = clip.duration * fraction;
          a.paused = true;
        }
        vm.update(0);
        if (packReference) {
          for (const mesh of e.weaponMeshes) if (!/^UTILITY_/.test(mesh.name)) mesh.visible = true;
          if (e.mint?.holder) e.mint.holder.visible = false;
          for (const wrap of e.mint?.wraps?.values() || []) for (const part of wrap.userData.mintParts || []) part.visible = false;
        }
        if (inspect) e.mount.position.z -= 0.35;
        e.scene.updateWorldMatrix(true, true);
        e.scene.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.update(); });
        g.camera.updateMatrixWorld(true);
        if (inspectionOrbit) {
          const { Vector3, Box3 } = await import('three');
          const center = new Box3().setFromObject(e.mint?.holder || e.scene).getCenter(new Vector3());
          g.vmCamera.position.copy(center.clone().negate().applyAxisAngle(new Vector3(1, 0, 0), inspectionOrbit * Math.PI / 180).add(center));
          g.vmCamera.lookAt(center);
        }
        g.vmCamera.updateMatrixWorld(true);
        g.renderer.render(g.scene, g.camera);
        if (!g.renderer.__postPatched) {
          g.renderer.autoClear = false;
          g.renderer.clearDepth();
          g.renderer.render(g.vmScene, g.vmCamera);
          g.renderer.autoClear = true;
        }
        let picked = [];
        if (pick.length) {
          const { Raycaster, Vector2 } = await import('three');
          const ray = new Raycaster();
          ray.setFromCamera(new Vector2(pick[0] / innerWidth * 2 - 1, 1 - pick[1] / innerHeight * 2), g.vmCamera);
          const visible = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
          picked = ray.intersectObjects(g.vmScene.children, true).filter(h => visible(h.object)).slice(0, 8)
            .map(h => ({ object: h.object.name, face: h.faceIndex, distance: h.distance }));
        }
        return { action, clip: e.action?.getClip().name, duration, elapsed, visited, picked,
          time: e.action?.time, state: e.state, queue: e.queue.length, key: e.key,
          parts: [...(e.mint?.wraps?.values() || [])].flatMap((wrap) => (wrap.userData.mintParts || []).map((part) => ({
            name: part.name, bone: part.parent?.name, visible: part.visible,
            local: part.matrix.toArray(), world: part.matrixWorld.toArray(), boneWorld: part.parent.matrixWorld.toArray(),
          }))),
          fov: g.vmCamera.fov, mountPosition: e.mount.position.toArray() };
      }, { weapon, action, fraction, inspect, inspectionOrbit, packReference, sequence, pick });
      if (frame.missing) { report.frames.push({ weapon, ...frame }); continue; }
      const measurement = await page.evaluate(MEDIR, weapon);
      const percent = Number((fraction * 100).toFixed(3));
      const label = String(percent).replace('.', '_').padStart(3, '0');
      const name = `${weapon}-${action}-${label}.png`;
      await page.screenshot({ path: path.join(out, name) });
      report.frames.push({ weapon, png: name, ...frame, ...measurement });
      console.log(`${weapon} ${action} ${fraction} hands=${measurement.classificacaoMaoCorreta}`);
    }
  }
} catch (error) {
  report.failure = String(error);
  process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
if (!report.frames.length || report.frames.some((f) => f.missing || f.classificacaoMaoCorreta === false)) process.exitCode = 1;
console.log(`VM_ACTION_EVIDENCE=${out}`);
