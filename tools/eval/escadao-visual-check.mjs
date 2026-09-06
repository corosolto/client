/* Baseline real: red/runtime.json tinha 3 varais sobre rotas e 1 headHit; 12/12
   travessias já passavam. Este gate não concede aprovação estética/FPS/competitiva. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { probeRuntime, probeSightlines } from './escadao-runtime-probe.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.env.OUT || path.join(root, 'artifacts/escadao-visual/check'));
const base = process.env.BASE || 'http://127.0.0.1:8148';
const mutante = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
const photos = process.argv.includes('--fotos');
const expectedClause = { 'varal-na-rota': 'EV1', 'escada-bloqueada': 'EV2', 'sem-abrigo': 'EV7' };
if (mutante && !expectedClause[mutante]) throw Error('Mutante desconhecido');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceFiles = ['public/js/map_escadao.js', 'public/js/game.js', 'public/js/mapprops.js', 'public/js/ambientlife.js',
  'tools/eval/escadao-visual-check.mjs', 'tools/eval/escadao-runtime-probe.mjs', 'tools/eval/escadao-rota-check.mjs'];
const sources = Object.fromEntries(sourceFiles.map(file => [file, sha256(fs.readFileSync(path.join(root, file)))]));
const gameSource = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
const mapSource = fs.readFileSync(path.join(root, 'public/js/map_escadao.js'), 'utf8');
const physics = {
  stepHeight: Number(gameSource.match(/const STEP_H\s*=\s*([\d.]+)/)?.[1]),
  riserHeight: Number(mapSource.match(/const ESC\s*=\s*\{[^}]*espelho:\s*([\d.]+)/)?.[1]),
  ctfRadius: Number(gameSource.match(/return \{ id, label, x, z, r:\s*([\d.]+)/)?.[1]),
};
if (!Object.values(physics).every(v => Number.isFinite(v) && v > 0)) throw Error('Constantes físicas não reconhecidas: não inventar limiares');
const routeContractSource = fs.readFileSync(path.join(root, 'tools/eval/escadao-rota-check.mjs'), 'utf8');
const contractNumber = name => Number(routeContractSource.match(new RegExp(`const ${name}\\s*=\\s*([\\d.]+)`))?.[1]);
const losContract = { high: contractNumber('ALTO'), outside: contractNumber('FORA'), grid: contractNumber('GRID'),
  losGrid: contractNumber('GRID_LOS'), bodyRadius: contractNumber('R'), eye: contractNumber('OLHO') };
if (!Object.values(losContract).every(v => Number.isFinite(v) && v > 0)) throw Error('Contrato LOS não reconhecido');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const provenance = { createdAt: new Date().toISOString(), root, branch: git('branch', '--show-current'), commit: git('rev-parse', 'HEAD'), sources };
if (!['codex/escadao-visual', 'codex/escadao-main'].includes(provenance.branch)) throw Error(`Branch inesperada: ${provenance.branch}`);
fs.mkdirSync(out, { recursive: true });

function evaluate(result) {
  const runs = result.results || [], stairs = runs.filter(r => r.category === 'stairs');
  const finiteRun = r => Number.isFinite(r.frames) && r.frames > 0 && r.collisionCalls === r.frames
    && r.trace.length === r.frames + 1 && [...r.start, ...r.end, r.seconds, r.distance, r.maxSpeed].every(Number.isFinite)
    && r.trace.every(v => v.length === 3 && v.every(Number.isFinite));
  const stairCases = new Set(stairs.map(r => `${r.id}:${r.walk}:${r.reverse}`));
  const expectedCases = ['central', 'oeste', 'leste'].flatMap(id => [false, true].flatMap(walk => [false, true].map(reverse => `${id}:${walk}:${reverse}`)));
  const valid = runs.length > 0 && stairs.length === 12 && expectedCases.every(key => stairCases.has(key)) && runs.every(finiteRun);
  const sum = key => runs.reduce((total, r) => total + r[key], 0);
  const los = result.los;
  return [
    ['EV0', valid, `${runs.filter(finiteRun).length}/${runs.length} séries finitas; ${stairs.length}/${result.measurement.expectedStairRuns} escadas`],
    ['EV1', valid && result.varais.length >= 5 && sum('varalHits') === 0, `${sum('varalHits')} amostras do corpo intersectam AABB de varal; ${result.varais.length} varais`],
    ['EV2', valid && stairs.every(r => !r.failed), `${stairs.filter(r => !r.failed).length}/${stairs.length} subidas/retornos contínuos`],
    ['EV3', valid && sum('headHits') === 0 && sum('unsupported') === 0, `headHits=${sum('headHits')}, sem piso=${sum('unsupported')}, superfícies de degrau=${sum('stepSurfaceHits')}`],
    ['EV4', valid && stairs.every(r => !r.stalled), `${stairs.reduce((n, r) => n + r.contacts, 0)} contatos; ${stairs.filter(r => r.stalled).length} travamentos sem progresso`],
    ['EV5', valid && result.circulation.length === 2 && result.spawnLinks.length === 8 && result.spawnLinks.every(s => s.planned)
      && result.circulation.every(c => c.returned && c.visits.length === c.expectedVisits && c.visits.every(v => !v.failed)),
    result.circulation.map(c => `${c.team}:${c.visits.filter(v => !v.failed).length}/${c.expectedVisits},retorno=${c.returned}`).join('; ')],
    ['EV6', los.spawnSightlines.length === 16 && los.flankSightlines.length === 16
      && [...los.spawnSightlines, ...los.flankSightlines].every(s => !s.clear),
    `${[...los.spawnSightlines, ...los.flankSightlines].filter(s => s.clear).length} LOS abertas spawn×spawn/flanco`],
    ['EV7', los.highSightlines.length === 7 && los.highSightlines.every(s => s.routes.length === 3 && s.interruptedRoutes >= 2)
      && los.spawnProtection.length === 2 && los.spawnProtection.some(s => s.pairs > 0)
      && los.spawnProtection.every(s => s.exposedPairs === 0) && los.shelters.length > 0 && los.shelters.every(s => s.active),
    `${los.highSightlines.filter(s => s.interruptedRoutes < 2).length} observadores sem 2 rotas interrompidas; `
      + `${los.spawnProtection.reduce((n, s) => n + s.exposedPairs, 0)} LOS alto→spawn abertas; `
      + `máxima exposição contínua por rota: ${['central', 'oeste', 'leste'].map(id => `${id}=${Math.max(...los.highSightlines.flatMap(s => s.routes.filter(r => r.id === id).map(r => r.longestExposed))).toFixed(2)}m`).join(', ')}`],
  ];
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--mute-audio'],
});
let receipt = { provenance, mutante, status: 'incomplete' };
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
  const errors = [], failedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  await page.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'high', vol: 0, speech: false })));
  await page.goto(`${base}/?debug=1&map=escadao&auto=B,sertanejo`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 240000 });
  const loaded = await page.evaluate(async () => {
    const { hasProp } = await import('/js/mapprops.js');
    const { ESCADAO_PROPS } = await import('/js/map_escadao.js');
    const W = window.__game.world;
    return { props: ESCADAO_PROPS.map(id => ({ id, loaded: hasProp(id) })),
      houses: { count: W.casario?.length || 0, complete: !!W.casario?.length && W.casario.every(c => !!c.obj) },
      fauna: W.ambience?.report(),
      animals: W.ambience?.animals?.map(a => ({ id: a.id, type: a.type, source: a.source })),
      importMap: JSON.parse(document.querySelector('script[type="importmap"]').textContent),
      viewport: [innerWidth, innerHeight], dpr: devicePixelRatio, fov: window.__game.camera.fov };
  });
  receipt.loaded = loaded;
  if (!loaded.props.length || loaded.props.some(p => !p.loaded) || !loaded.houses.complete
    || !loaded.fauna?.gltf || !loaded.animals?.length || loaded.animals.some(a => a.source !== 'gltf')) {
    throw Error('GLBs incompletos: confira props/casario/fauna no recibo; fallback não aprova');
  }
  const served = {};
  for (const file of sourceFiles.filter(file => file.startsWith('public/'))) {
    const key = './' + file.slice('public/'.length);
    const url = new URL(loaded.importMap.imports[key] || key, page.url()).href;
    const response = await page.request.get(url);
    if (!response.ok()) throw Error(`Fonte servido indisponível: ${url}`);
    served[file] = { url, sha256: sha256(await response.body()) };
    if (served[file].sha256 !== sources[file]) throw Error(`Fonte servido diverge do checkout: ${file}`);
  }
  receipt.served = served;
  // Mantém a mesma pose de fauna e estado de partida entre baseline e mutação.
  await page.evaluate(() => { window.__game.update = () => {}; });
  const before = await page.evaluate(probeRuntime, physics);
  const sightlineInput = { contract: losContract, radius: before.measurement.radius,
    routes: before.results.filter(r => r.category === 'stairs' && !r.walk && !r.reverse).map(({ id, trace }) => ({ id, trace })) };
  Object.assign(before.los, await page.evaluate(probeSightlines, sightlineInput));
  const beforeChecks = evaluate(before);
  receipt = { ...receipt, ...before, checks: beforeChecks, errors, failedRequests };
  if (mutante) {
    fs.writeFileSync(path.join(out, 'before-mutation.json'), JSON.stringify(receipt, null, 2));
    if (beforeChecks.some(([, ok]) => !ok)) throw Error('Baseline vermelho: não atribuir falha preexistente ao mutante');
    const mutation = await page.evaluate(async name => {
      const g = window.__game;
      if (name === 'sem-abrigo') {
        const targets = [...new Set(g.world.occluders.filter(o => o.userData.escadaoAbrigo))];
        if (!targets.length) throw Error('MUTANTE NÃO APLICOU: nenhum abrigo contratual ativo');
        const beforeCount = g.world.occluders.length;
        g._evalOriginalOccluders = g.world.occluders;
        g.world.occluders = g.world.occluders.filter(o => !targets.includes(o));
        if (g.world.occluders.length === beforeCount) throw Error('MUTANTE NÃO REMOVEU OCLUSORES');
        return { name, removed: targets.map(o => ({ uuid: o.uuid, name: o.name })), beforeCount, afterCount: g.world.occluders.length };
      }
      if (name === 'varal-na-rota') {
        const THREE = await import('three');
        const targets = [];
        g.world.root.traverse(o => { if (o.userData.escadaoVaral === 'varal_roupas' && Math.abs(o.position.x + 14.2) < .1 && Math.abs(o.position.z - 6.6) < .1) targets.push(o); });
        if (targets.length !== 1) throw Error(`MUTANTE NÃO APLICOU: ${targets.length} varais candidatos`);
        const target = targets[0], before = target.position.toArray();
        target.position.x = -12;
        target.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(target);
        if (Math.abs(before[0] - target.position.x) < 1) throw Error('MUTANTE NÃO ALTEROU VARAL');
        return { name, uuid: target.uuid, before, after: target.position.toArray(), bbox: { min: box.min.toArray(), max: box.max.toArray() } };
      }
      const collider = { minX: -13.5, maxX: -10.5, minY: 2, maxY: 8, minZ: 3, maxZ: 3.5 };
      const index = g.world.colliders.length;
      g.world.colliders.push(collider);
      if (g.world.colliders[index] !== collider) throw Error('MUTANTE NÃO INSERIU COLISOR');
      return { name, index, collider };
    }, mutante);
    // Abrigo muda apenas LOS: repete exatamente as posições da baseline, sem refazer
    // circulação nem trocar fauna/observadores e sem atribuir falha só à tag ausente.
    const after = mutante === 'sem-abrigo' ? { ...before, los: { ...before.los } } : await page.evaluate(probeRuntime, physics);
    Object.assign(after.los, await page.evaluate(probeSightlines, sightlineInput));
    const checks = evaluate(after);
    const clause = expectedClause[mutante];
    const newlyExposed = mutante === 'sem-abrigo' ? after.los.spawnProtection.flatMap(group => {
      const baseline = before.los.spawnProtection.find(s => s.team === group.team);
      return group.observations.flatMap(sample => {
        const prior = baseline.observations.find(s => s.from[0] === sample.from[0] && s.from[1] === sample.from[1]);
        return sample.visibleSlots.filter(slot => prior?.testedSlots.includes(slot) && !prior.visibleSlots.includes(slot))
          .map(slot => ({ team: group.team, from: sample.from, position: sample.position, to: group.slots[slot], slot }));
      });
    }) : [];
    const causal = mutante === 'varal-na-rota'
      ? after.results.some(r => r.varalSamples.some(hit => hit.uuid === mutation.uuid))
      : mutante === 'sem-abrigo' ? mutation.removed.length > 0 && newlyExposed.length > 0
        : after.results.some(r => r.category === 'stairs' && r.id === 'oeste' && r.failed && r.contacts > 0);
    if (mutante === 'sem-abrigo') mutation.newlyExposed = newlyExposed;
    receipt = { ...receipt, ...after, mutation, checks, beforeChecks, causal };
    if (checks.find(([id]) => id === clause)?.[1] !== false || !causal) throw Error(`Mutante sobreviveu ou sem causalidade: ${clause}`);
    if (mutante === 'sem-abrigo') {
      await page.evaluate(() => {
        const g = window.__game;
        if (!g._evalOriginalOccluders) throw Error('Lista original de abrigos perdida');
        g.world.occluders = g._evalOriginalOccluders;
        delete g._evalOriginalOccluders;
      });
      const restored = { ...before, los: { ...before.los, ...await page.evaluate(probeSightlines, sightlineInput) } };
      receipt.restoredChecks = evaluate(restored);
      if (receipt.restoredChecks.some(([, ok]) => !ok)) throw Error('Restaurar abrigos não recuperou o verde');
    }
    console.log(`MUTANTE MORDIDO: ${clause}; objeto/colisor identificado no recibo`);
  } else if (beforeChecks.some(([, ok]) => !ok)) process.exitCode = 1;
  for (const file of sourceFiles) if (sha256(fs.readFileSync(path.join(root, file))) !== sources[file]) throw Error(`Fonte mudou durante a execução: ${file}`);
  if (errors.length) throw Error(`${errors.length} erros JS durante medição; veja recibo`);
  if (photos) {
    const samples = [
      // O teste já restaurou o abrigo: estas fotos mostram a cobertura recuperada,
      // não fingem ser capturas da geometria removida pelo mutante de oclusão.
      ...(receipt.mutation?.newlyExposed || []).slice(0, 3).map(hit => ({ position: hit.position, lookAt: hit.to, run: 'abrigo', reason: 'los-restored' })),
      ...receipt.results.flatMap(run => [
      ...run.varalSamples.map(hit => ({ ...hit, run: run.id, reason: 'varal' })),
      ...run.headSamples.map(hit => ({ ...hit, run: run.id, reason: 'headroom' })),
      ...(run.failed?.position ? [{ position: run.failed.position, run: run.id, reason: 'traversal' }] : []),
      ]),
    ].slice(0, 3);
    if (!samples.length) samples.push({ position: receipt.results[0].trace[0], run: receipt.results[0].id, reason: 'sample' });
    receipt.photos = [];
    for (const [index, sample] of samples.entries()) {
      await page.evaluate(({ position, lookAt }) => {
        const g = window.__game;
        g.player.pos.fromArray(position);
        g.camera.position.set(position[0], position[1] + 1.62, position[2]);
        if (lookAt) g.camera.lookAt(lookAt[0], lookAt[1] + 1.62, lookAt[2]);
        else g.camera.lookAt(position[0], position[1] + 1, position[2] - 4);
      }, sample);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const filename = `sample-${index}-${sample.reason}.png`;
      await page.screenshot({ path: path.join(out, filename) });
      receipt.photos.push({ ...sample, filename });
    }
  }
  receipt.status = mutante ? 'mutation-detected' : process.exitCode ? 'failed' : 'passed';
  for (const [id, ok, detail] of receipt.checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail}`);
} catch (error) {
  receipt.status = 'error'; receipt.error = error.stack;
  process.exitCode = 1;
  console.error(error.message);
} finally {
  fs.writeFileSync(path.join(out, 'runtime.json'), JSON.stringify(receipt, null, 2));
  await browser.close();
}
