/* ============================================================================
   ambience-check.mjs — FAUNA VIVA E TRAÇANTE SÃO VISÍVEIS NO JOGO REAL?
   ----------------------------------------------------------------------------
   POR QUE EXISTE
     Pedido literal do dono, 16/08/2026: “o rato correndo, as pombas voando no
     céu [...] ambiência, reação, e também colocar as balas voando igual traças”.

   O QUE MEDE
     O pré-voo confere licença convertida em assets finais, clips, skins, peso e
     os hooks nos corpos reais de Game._fireHitscan e Game.update. Passado isso,
     Chromium abre os GLBs reais: anda o controlador com deltas fixos, dispara
     perto de cada espécie, compara LOWQ e mede a geometria real do traçante.
     `--fotos` registra o tamanho servido em 1536×1024 (3:2).

   PROCEDÊNCIA DOS LIMIARES
     O frame 1536×1024 vem de
     tools/eval/asset-evidence/maps/lajes/roof-eye.png e é contratado por
     map-evidence-contract-check.mjs. Um traço com diâmetro projetado menor que
     um pixel a 15 m não materializa uma coluna completa desse raster. Três
     quadros a 60 Hz são o piso temporal pedido no spec
     plans/20-AMBIENCIA-FAVELA.md. O teto de fauna é POR MAPA (AM7_TETOS): a
     população autoral do lajes (6 ratos + 7 pombos + 1 cachorro do R27,
     elogiada nominalmente pelo dono em 16/08) mede 84.082 tris / 19 draws, e o
     custo de cena real dos mapas em produção é 650k-1.8M tris por frame
     (tools/eval/cena-tetos.mjs, medição de 11/08) — o teto único de 40k citava
     um orçamento de 500k que nenhum mapa pratica. Mesmo padrão do cena-tetos:
     medido + folga curta, e piora reprova.

    MUTAÇÕES
      --mutante=sem-reacao       neutraliza onShot no objeto que o jogo chama
      --mutante=relogio          injeta performance.now no avanço determinístico
      --mutante=lowq-cheio       abre a medição LOWQ com qualidade completa
      --mutante=tracer-fino      repõe o raio anterior de 0,0035 m
      --mutante=teleporte-volta  injeta salto de dois metros após a reação
      --mutante=pomba-voa-de-novo restaura o _updatePigeon pré-v2.1 (pombo em
                                 trajetória de voo) — AM11 acende (BUG-57 v2.1)
      --mutante=bicho-estatico   zera os mixers de dog/cat/chicken/cow — AM12
                                 acende (clipe parado = bicho estático)

   Uso:
     npm run eval:serve
     node tools/eval/ambience-check.mjs [--fotos[=dir]] [--mutante=...]
   ============================================================================ */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const ROOT = new URL('../../', import.meta.url).pathname;
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const arg = (name, fallback = null) => {
  const prefix = `--${name}=`;
  const exact = process.argv.find((value) => value.startsWith(prefix));
  return exact ? exact.slice(prefix.length) : (process.argv.includes(`--${name}`) ? true : fallback);
};
const mutante = arg('mutante');
const fotosArg = arg('fotos');
const fotos = fotosArg ? (fotosArg === true ? '/tmp/ambience-check' : fotosArg) : null;
const saida = arg('saida');
const MAPAS = ['lajes', 'corrego', 'escadao'];
const esperadoPorMutante = {
  'sem-reacao': 'AM5',
  relogio: 'AM4',
  'lowq-cheio': 'AM6',
  'tracer-fino': 'AM8',
  'tracer-um-em-tres': 'AM8b',
  'teleporte-volta': 'AM5b',
  'pomba-voa-de-novo': 'AM11',
  'bicho-estatico': 'AM12',
};
if (mutante && !esperadoPorMutante[mutante]) {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

function corpoMetodo(src, assinatura) {
  const inicio = src.indexOf(assinatura);
  if (inicio < 0) return '';
  const abre = src.indexOf('{', inicio);
  if (abre < 0) return '';
  let nivel = 0;
  for (let i = abre; i < src.length; i++) {
    if (src[i] === '{') nivel++;
    else if (src[i] === '}' && --nivel === 0) return src.slice(abre + 1, i);
  }
  return '';
}

const checks = [];
const put = (id, descricao, ok, evidencia) => checks.push({ id, descricao, ok: !!ok, evidencia });
const finalAssets = {
  rat: 'public/models/ambient/rat_animated.glb',
  pigeonGround: 'public/models/ambient/pigeon_ground.glb',
  cat: 'public/models/ambient/cat_telhado.glb',
  chicken: 'public/models/ambient/galinha_campo.glb',
  cow: 'public/models/ambient/vaca_campo.glb',
};
const faltando = Object.values(finalAssets).filter((file) => !existsSync(`${ROOT}${file}`));
put('AM1', 'assets finais de rato, pombo de chão e das espécies v2.1 (gato/galinha/vaca) existem',
  faltando.length === 0,
  faltando.length ? `faltam: ${faltando.join(', ')}` : Object.values(finalAssets).join(', '));

const srcAmb = existsSync(`${ROOT}public/js/ambientlife.js`)
  ? readFileSync(`${ROOT}public/js/ambientlife.js`, 'utf8') : '';
const srcGame = readFileSync(`${ROOT}public/js/game.js`, 'utf8');
const srcMain = readFileSync(`${ROOT}public/js/main.js`, 'utf8');
const srcMaps = Object.fromEntries(MAPAS.map((id) => [id,
  readFileSync(`${ROOT}public/js/map_${id.slice(3)}.js`, 'utf8')]));
const fireBody = corpoMetodo(srcGame, '\n  _fireHitscan(');
const updateBody = corpoMetodo(srcGame, '\n  update(dt');
const mapasIntegrados = Object.entries(srcMaps).filter(([, src]) =>
  src.includes('createFavelaAmbience') && /\bambience\b/.test(src)).map(([id]) => id);
put('AM2', 'os três builders instanciam o controlador comum', mapasIntegrados.length === MAPAS.length,
  `${mapasIntegrados.length}/${MAPAS.length}: ${mapasIntegrados.join(', ') || 'nenhum'}`);
put('AM3', 'preload e hooks moram nos caminhos executados de produção',
  srcMain.includes('preloadAmbientLife') && fireBody.includes('this.world.ambience?.onShot')
    && updateBody.includes('this.world.ambience?.update'),
  `preload=${srcMain.includes('preloadAmbientLife')} fire=${fireBody.includes('this.world.ambience?.onShot')} update=${updateBody.includes('this.world.ambience?.update')}`);

const assetReport = {};
if (!faltando.length) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  for (const [id, relative] of Object.entries(finalAssets)) {
    const doc = await io.read(`${ROOT}${relative}`);
    const root = doc.getRoot();
    const triangles = root.listMeshes().flatMap((mesh) => mesh.listPrimitives()).reduce((total, primitive) => {
      const accessor = primitive.getIndices() || primitive.getAttribute('POSITION');
      return total + (accessor ? accessor.getCount() / 3 : 0);
    }, 0);
    assetReport[id] = {
      bytes: statSync(`${ROOT}${relative}`).size,
      triangles: Math.round(triangles),
      skins: root.listSkins().length,
      animations: root.listAnimations().map((clip) => clip.getName()),
    };
  }
  const totalBytes = Object.values(assetReport).reduce((sum, item) => sum + item.bytes, 0);
  /* Quaternius v2.1: quads vêm com skin + Idle/Walk (o controlador casa por sufixo);
     pombo de voo saiu do acervo — assets sem skin em trajetória de voo é o BUG-57 */
  const clipsDe = (id, nomes) => {
    const lista = assetReport[id].animations;
    return nomes.every((nome) => lista.some((clip) => clip.endsWith(`|${nome}`) || clip === nome));
  };
  const clipsOk = assetReport.rat.skins >= 1 && assetReport.rat.animations.includes('Run')
    && assetReport.pigeonGround.skins >= 1 && assetReport.pigeonGround.animations.includes('Animation')
    && assetReport.cat.skins >= 1 && clipsDe('cat', ['Idle', 'Walk', 'Run'])
    && assetReport.chicken.skins >= 1 && clipsDe('chicken', ['Idle', 'Walk'])
    && assetReport.cow.skins >= 1 && clipsDe('cow', ['Idle', 'Walk', 'Gallop']);
  const budgetOk = assetReport.rat.triangles <= 4500 && assetReport.pigeonGround.triangles <= 7500
    && assetReport.cat.triangles <= 4500 && assetReport.chicken.triangles <= 4500 && assetReport.cow.triangles <= 4500
    && totalBytes <= 2 * 1024 * 1024;
  put('AM1b', 'os clips/skins finais continuam presentes', clipsOk, JSON.stringify(assetReport));
  put('AM1c', 'fauna final cabe no orçamento de malha e download', budgetOk,
    `${Math.round(totalBytes / 1024)} KiB; tris ${Object.entries(assetReport).map(([id, value]) => `${id}=${value.triangles}`).join(' ')}`);
}

const preFalhas = checks.filter((check) => !check.ok);
if (preFalhas.length) {
  for (const check of checks) console.log(`${check.ok ? '✓' : '✗'} ${check.id} ${check.descricao} — ${check.evidencia}`);
  if (mutante) console.error(`MUTANTE NÃO APLICADO: o estado-base falhou antes de ${mutante}.`);
  else console.error(`AMBIENCE FALHA ANTES DO NAVEGADOR: ${preFalhas.length}/${checks.length}`);
  process.exit(1);
}

const globalRoot = execSync('npm root -g').toString().trim();
const playwright = await import(pathToFileURL(`${globalRoot}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio', '--no-sandbox'],
});
if (fotos) mkdirSync(fotos, { recursive: true });
const runtime = { maps: {}, lowq: null, game: null };
const runtimeMaps = mutante ? ['lajes'] : MAPAS;

async function abrirMapa(map, quality = 'med') {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`[pageerror] ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(`[console] ${message.text()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`);
  });
  await page.addInitScript(({ requested, forceFull }) => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ quality: forceFull ? 'med' : requested }));
  }, { requested: quality, forceFull: mutante === 'lowq-cheio' && quality === 'low' });
  await page.goto(`${BASE}/mapview.html?map=${map}&hud=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.MAPEVAL?.ready === true && window.__gworld?.ambience?.ready === true,
    null, { timeout: 180000 });
  const measured = await page.evaluate(async (activeMutant) => {
    const THREE = await import('/vendor/three.module.js');
    const ambience = window.__gworld.ambience;
    ambience.setPaused(true);
    const run = () => {
      ambience.reset();
      for (let i = 0; i < 90; i++) ambience.update(1 / 60, null);
      return ambience.snapshot();
    };
    const first = run();
    let mutationApplied = null;
    let originalUpdate = null;
    if (activeMutant === 'relogio') {
      originalUpdate = ambience.update.bind(ambience);
      ambience.update = (dt, player) => {
        originalUpdate(dt, player);
        const animal = ambience.animals[0];
        if (animal) animal.root.position.x += performance.now() * 0.01;
      };
      mutationApplied = true;
    }
    const second = run();
    const deterministic = JSON.stringify(first) === JSON.stringify(second);
    if (originalUpdate) ambience.update = originalUpdate;
    const reactions = {};
    const continuity = {};
    const reactionSpecs = [
      ['rat', (item) => item.type === 'rat'],
      ['pigeonGround', (item) => item.type === 'pigeon'],
    ];
    for (const [key, pick] of reactionSpecs) {
      ambience.reset();
      const animal = ambience.animals.find(pick);
      if (!animal) { reactions[key] = { ok: false, reason: 'ausente' }; continue; }
      const before = ambience.snapshot().find((item) => item.id === animal.id);
      const p = animal.root.getWorldPosition(new THREE.Vector3());
      if (activeMutant === 'sem-reacao') {
        ambience.onShot = () => 0;
        mutationApplied = ambience.onShot() === 0;
      } else ambience.onShot(p.clone().add(new THREE.Vector3(0, .25, -2)), p.clone().add(new THREE.Vector3(0, .1, 2)));
      for (let i = 0; i < 45; i++) ambience.update(1 / 60, null);
      const after = ambience.snapshot().find((item) => item.id === animal.id);
      const distance = before && after ? Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z) : 0;
      /* v2.1: pombo foge a pé (sem takeoff) — o estado de voo não existe mais */
      const reactionState = 'flee';
      reactions[key] = { ok: !!before && !!after && after.state === reactionState && distance >= .08, distance, before, after };

      ambience.reset();
      const continuityAnimal = ambience.animals.find(pick);
      const continuityPoint = continuityAnimal.root.getWorldPosition(new THREE.Vector3());
      ambience.onShot(continuityPoint.clone().add(new THREE.Vector3(0, .25, -2)),
        continuityPoint.clone().add(new THREE.Vector3(0, .1, 2)));
      let previous = continuityAnimal.root.position.clone();
      let maxStep = 0;
      for (let i = 0; i < 270; i++) {
        ambience.update(1 / 60, null);
        if (activeMutant === 'teleporte-volta' && i === 120) {
          continuityAnimal.root.position.x += 2;
          mutationApplied = true;
        }
        maxStep = Math.max(maxStep, previous.distanceTo(continuityAnimal.root.position));
        previous.copy(continuityAnimal.root.position);
      }
      continuity[key] = { maxStep };
    }
    /* AM12 — bicho novo (dog/cat/chicken/cow) anda com clipe tocando. Mutante
       bicho-estatico zera os mixers: clipe parado é bicho estático. */
    ambience.reset();
    if (activeMutant === 'bicho-estatico') {
      /* o estático-sem-rig não tem mixer NEM actions (é o que o pigeon_flight.glb
         produzia): zera os dois, como cloneAsset de um GLB sem clipes */
      for (const a of ambience.animals) if (['dog', 'cat', 'chicken', 'cow'].includes(a.type)) { a.mixer = null; a.actions = null; }
      mutationApplied = true;
    }
    for (let i = 0; i < 90; i++) ambience.update(1 / 60, null);
    const quads = ambience.animals.filter((item) => ['dog', 'cat', 'chicken', 'cow'].includes(item.type));
    const speciesAudit = {
      quads: quads.length,
      clipMin: quads.length ? Math.min(...ambience.snapshot()
        .filter((item) => ['dog-', 'cat-', 'chicken-', 'cow-'].some((prefix) => item.id.startsWith(prefix)))
        .map((item) => item.clipTime)) : null,
    };
    /* AM11 — pombo não voa (BUG-57 v2.1). Mutante pomba-voa-de-novo restaura o
       _updatePigeon pré-v2.1: trajetória aérea + estado 'fly'. Roda por ÚLTIMO para
       não vazar estado nas medições de reação/continuidade. */
    const pigeon = ambience.animals.find((item) => item.type === 'pigeon');
    const flightAudit = { presente: !!pigeon, states: [], bob: 0 };
    if (pigeon) {
      if (activeMutant === 'pomba-voa-de-novo') {
        pigeon.mode = 'flight';
        ambience._updatePigeon = function (animal) {
          const angle = this.time * .42 + animal.phase;
          animal.root.position.set(
            animal.origin.x + Math.cos(angle) * animal.radius[0],
            animal.origin.y + 1.2 + Math.sin(angle * 2.3) * .28,
            animal.origin.z + Math.sin(angle) * animal.radius[1]);
          animal.root.position.y = animal.origin.y + 1.2 + Math.sin(angle * 2.3) * .28;
          animal.state = 'fly';
        };
        mutationApplied = true;
      }
      ambience.reset();
      const baseY = pigeon.origin.y;
      for (let i = 0; i < 120; i++) {
        ambience.update(1 / 60, null);
        if (!flightAudit.states.includes(pigeon.state)) flightAudit.states.push(pigeon.state);
        flightAudit.bob = Math.max(flightAudit.bob, Math.abs(pigeon.root.position.y - baseY));
      }
    }
    return { report: ambience.report(), deterministic, reactions, continuity, errors: [], mutationApplied, speciesAudit, flightAudit };
  }, mutante);
  measured.errors = errors;
  if (fotos && quality === 'med') {
    for (const focus of ['rat', 'pigeon-ground', 'cat', 'chicken', 'cow']) {
      const focused = await page.evaluate((kind) => {
        const ambience = window.__gworld.ambience;
        ambience.reset();
        const animal = ambience.animals.find((item) => kind === 'rat'
          ? item.type === 'rat'
          : kind === 'pigeon-ground' ? item.type === 'pigeon' : item.type === kind);
        if (!animal) return false;
        const p = animal.root.getWorldPosition(new animal.root.position.constructor());
        const offset = { rat: [1.15, .46, 1.45], 'pigeon-ground': [3.2, 1.35, 3.8],
          cat: [2.6, .9, 3.1], chicken: [1.6, .75, 1.9], cow: [3.6, 1.7, 4.4] }[kind];
        window.MAPEVAL.view([p.x + offset[0], p.y + offset[1], p.z + offset[2]], [p.x, p.y + (kind === 'rat' ? .03 : 0), p.z]);
        return true;
      }, focus);
      if (focused) await page.screenshot({ path: `${fotos}/${map}-${focus}.png`, timeout: 120000 });
    }
  }
  await page.close();
  return measured;
}

for (const map of runtimeMaps) runtime.maps[map] = await abrirMapa(map, 'med');
runtime.lowq = await abrirMapa('lajes', 'low');

const gamePage = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
await gamePage.goto(`${BASE}/?debug=1&nav=1&auto=P,mst&map=lajes&bloom=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await gamePage.waitForFunction(() => window.__game?.state === 'live' && window.__game.world?.ambience?.ready === true,
  null, { timeout: 300000 });
runtime.game = await gamePage.evaluate(async (activeMutant) => {
  const THREE = await import('/vendor/three.module.js');
  const game = window.__game;
  const ambience = game.world.ambience;
  ambience.setPaused(true);
  const animal = ambience.animals[0];
  const p = animal.root.getWorldPosition(new THREE.Vector3());
  let shotCalls = 0;
  const onShot = ambience.onShot.bind(ambience);
  ambience.onShot = (...args) => { shotCalls++; return onShot(...args); };
  game._fireHitscan(game.player, p.clone().add(new THREE.Vector3(0, .2, -1.5)), new THREE.Vector3(0, 0, 1), 0, true, 'TESTE', 'ak', false);
  let updateCalls = 0;
  const update = ambience.update.bind(ambience);
  ambience.update = (...args) => { updateCalls++; return update(...args); };
  game.update(1 / 60);
  game.paused = true;
  if (activeMutant === 'tracer-fino') {
    game._tracerGeo.dispose();
    game._tracerGeo = new THREE.CylinderGeometry(.0035, .0035, 1, 5, 1, true);
    game._tracerPool.length = 0;
  }
  const radius = game._tracerGeo.parameters.radiusTop;
  const height = 1024;
  const focal = height / (2 * Math.tan(THREE.MathUtils.degToRad(game.camera.fov) / 2));
  const projectedPixels15m = 2 * radius * focal / 15;
  game.camera.updateMatrixWorld(true);
  const tracerStart = game.camera.localToWorld(new THREE.Vector3(-4, 2, -12));
  const tracerEnd = game.camera.localToWorld(new THREE.Vector3(4, 2, -12));
  game._tracer(tracerStart, tracerEnd);
  const tracer = game.tracers.at(-1);
  const ttl = tracer?.ttl || 0;
  game._updateFx(1 / 60);
  game.renderer.render(game.scene, game.camera);
  /* AM8b — TODO tiro traça (dono, 17/08): três _tryShoot reais seguidos têm de gerar
     três traçantes. O 1-em-3 antigo derrubava esta contagem para 1. O mutante
     tracer-um-em-tres reproduz a regressão no boundary do _tracer. */
  game.paused = false;
  const p2 = game.player;
  p2.weapon = 'ak'; p2.ammo.ak = { mag: 30, res: 90 }; p2.nextShotAt = 0; p2.sprayI = 0;
  let tracerCalls = 0;
  const tracerReal = game._tracer.bind(game);
  game._tracer = (...args) => {
    tracerCalls++;
    if (activeMutant === 'tracer-um-em-tres' && tracerCalls % 3 !== 1) return;
    return tracerReal(...args);
  };
  const antes = game.tracers.length;
  for (let i = 0; i < 3; i++) { game._tryShoot(); game.time += 0.2; p2.nextShotAt = 0; }
  const tracersPorTresTiros = game.tracers.length - antes;
  game._tracer = tracerReal;
  game.paused = true;
  return { shotCalls, updateCalls, radius, projectedPixels15m, ttl, tracersPorTresTiros,
    mutationApplied: activeMutant !== 'tracer-fino' || Math.abs(radius - .0035) < 1e-6 };
}, mutante);
if (fotos) await gamePage.screenshot({ path: `${fotos}/lajes-tracer.png`, timeout: 120000 });
await gamePage.close();
await browser.close();

const reports = Object.values(runtime.maps).map((item) => item.report);
const allKinds = reports.every((report) => report.counts.rat >= 1 && report.counts.pigeon >= 1 && report.gltf === true);
put('AM4', 'duas corridas com os mesmos deltas produzem a mesma pose',
  Object.values(runtime.maps).every((item) => item.deterministic),
  Object.entries(runtime.maps).map(([map, item]) => `${map}=${item.deterministic}`).join(' '));
put('AM5', 'tiro próximo muda estado ou desloca rato e pombo (pombo foge a pé, v2.1)',
  Object.values(runtime.maps).every((item) => item.reactions.rat.ok && item.reactions.pigeonGround.ok),
  JSON.stringify(Object.fromEntries(Object.entries(runtime.maps).map(([map, item]) => [map, item.reactions]))));
put('AM5b', 'fauna reage e retoma a rota sem salto maior que 20 cm por quadro',
  Object.values(runtime.maps).every((item) => Object.values(item.continuity).every((entry) => entry.maxStep <= .2)),
  Object.entries(runtime.maps).map(([map, item]) => `${map}=${Object.entries(item.continuity).map(([kind, entry]) => `${kind}:${entry.maxStep.toFixed(3)}m`).join(',')}`).join(' '));
put('AM6', 'LOWQ preserva as duas espécies e reduz instâncias',
  runtime.lowq.report.counts.rat >= 1 && runtime.lowq.report.counts.pigeon >= 1
    && runtime.lowq.report.counts.total < runtime.maps.lajes.report.counts.total,
  `full=${runtime.maps.lajes.report.counts.total} low=${runtime.lowq.report.counts.total}`);
/* Teto por mapa, medido + folga curta. 17/08: população R27 do lajes media
   84.082 tris/19 draws (com 3 pombos de voo a 10.856 tris cada). 19/08 (v2.1
   frente D): pombo pousado (6.928) no lugar do voo + gato/galinha/vaca mediu
   74.746/20 (lajes), 33.776/12 (corrego), 28.068/5 (escadão). 19/08 (vida 1):
   +2 baratas (2.124 tris cada, Mint simplificado 0,4) → corrego 38.024/14
   medido no browser; teto rederivado com a mesma folga. A integração com a
   frente B (jacaré/capivara/grama no córrego) re-mede e rederiva de novo.
   Piora reprova; população nova mede antes. Ver PROCEDÊNCIA DOS LIMIARES. */
const AM7_TETOS = {
  lajes: { tris: 78000, meshes: 21 },
  corrego: { tris: 39000, meshes: 15 },
  escadao: { tris: 29000, meshes: 6 },
};
put('AM7', 'os três mapas desenham GLBs da fauna dentro do orçamento',
  allKinds && reports.every((report) => { const t = AM7_TETOS[report.map]; return t && report.triangles <= t.tris && report.meshes <= t.meshes; }),
  reports.map((report) => `${report.map}: ${report.counts.total} animais ${report.meshes} draws ${report.triangles} tris gltf=${report.gltf}`).join(' | '));
put('AM8', 'traçante ocupa ao menos 1 px a 15 m e vive três frames de 60 Hz',
  runtime.game.projectedPixels15m >= 1 && runtime.game.ttl >= 3 / 60,
  `raio=${runtime.game.radius.toFixed(4)} m projeção=${runtime.game.projectedPixels15m.toFixed(2)} px ttl=${(runtime.game.ttl * 1000).toFixed(1)} ms`);
put('AM8b', 'todo tiro do jogador deixa traçante (3 tiros = 3 rastros)',
  runtime.game.tracersPorTresTiros >= 3,
  `3 _tryShoot -> ${runtime.game.tracersPorTresTiros} traçantes`);
put('AM9', 'Game._fireHitscan e Game.update chamam o controlador real',
  runtime.game.shotCalls >= 1 && runtime.game.updateCalls >= 1,
  `onShot=${runtime.game.shotCalls} update=${runtime.game.updateCalls}`);
const errosFauna = Object.fromEntries(Object.entries(runtime.maps).map(([map, item]) => [map,
  item.errors.filter((error) => /\[pageerror\]|ambientlife|models\/ambient/i.test(error))]));
put('AM10', 'navegador não registrou erro ao carregar fauna',
  Object.values(errosFauna).every((errors) => errors.length === 0),
  Object.entries(errosFauna).map(([map, errors]) => `${map}=${errors.length}`).join(' '));
/* AM11 (v2.1, BUG-57): pombo não voa mais — dono 18/08: "a pomba que nao esta com
   bracos avertos deveria ficar so na ponta das lajes ou no chao". O GLB de voo era
   estático (0 skins) com asas abertas: trajetória aérea com asset sem rig é o defeito.
   Mede o ESTADO real do controlador (nenhum fly/takeoff) e a trajetória (bob vertical
   ≤ 0,35 m); o pombo pousado numa laje anda na cota da laje. Mutante:
   pomba-voa-de-novo. */
const vooEstados = Object.values(runtime.maps).flatMap((item) => item.flightAudit.states);
const bobMax = Math.max(...Object.values(runtime.maps).map((item) => item.flightAudit.bob));
put('AM11', 'nenhuma pomba voa: sem estado fly/takeoff e bob vertical ≤ 0,35 m',
  !srcAmb.includes('pigeonFlight')
    && Object.values(runtime.maps).every((item) => item.flightAudit.presente)
    && !vooEstados.some((estado) => estado === 'fly' || estado === 'takeoff')
    && bobMax <= .35,
  `srcSemPigeonFlight=${!srcAmb.includes('pigeonFlight')} estados=[${[...new Set(vooEstados)].join(',') || '-'}] bobMax=${bobMax.toFixed(3)}m`);
/* AM12 (v2.1): espécies novas por bioma, com rig tocando — gato na favela (lajes),
   galinha no córrego; o clipTime > 0 prova que o AnimationMixer anda (bicho estático
   com mixer nulo é o mutante bicho-estatico). */
const ESPECIE_ESPERADA = { lajes: ['cat'], corrego: ['chicken'], escadao: [] };
const especieFalha = Object.entries(ESPECIE_ESPERADA).flatMap(([map, especies]) => {
  const report = runtime.maps[map]?.report;
  /* em modo mutante só o lajes abre (runtimeMaps): mapa não aberto não é cláusula */
  if (!report || !especies.length) return [];
  const faltam = especies.filter((e) => !(report.counts[e] > 0));
  return faltam.map((e) => `${map} sem ${e}`);
});
const quadsParados = Object.entries(runtime.maps).filter(([, item]) =>
  item.speciesAudit.quads > 0 && (item.speciesAudit.clipMin === null || item.speciesAudit.clipMin <= 0)).map(([map]) => map);
put('AM12', 'espécies novas por bioma existem e o clipe anda (mixer > 0)',
  especieFalha.length === 0 && quadsParados.length === 0,
  `${especieFalha.join(' ') || 'biomas ok'}; quads=${Object.entries(runtime.maps).map(([map, item]) => `${map}:${item.speciesAudit.quads}t${item.speciesAudit.clipMin === null ? '-' : item.speciesAudit.clipMin.toFixed(2)}s`).join(' ')}${quadsParados.length ? ` PARADOS: ${quadsParados.join(',')}` : ''}`);

if (saida) writeFileSync(saida, JSON.stringify({ assetReport, runtime, checks }, null, 2));
for (const check of checks) console.log(`${check.ok ? '✓' : '✗'} ${check.id} ${check.descricao} — ${check.evidencia}`);
const falhas = checks.filter((check) => !check.ok);
if (mutante) {
  const esperado = esperadoPorMutante[mutante];
  const aplicou = mutante === 'lowq-cheio'
    ? runtime.lowq.report.low === false
    : mutante === 'tracer-fino'
      ? runtime.game?.mutationApplied === true
      : mutante === 'tracer-um-em-tres'
        ? runtime.game?.tracersPorTresTiros < 3
        : Object.values(runtime.maps).some((item) => item.mutationApplied === true);
  const mordeu = falhas.some((check) => check.id === esperado);
  if (!aplicou) { console.error(`MUTANTE NÃO APLICOU: ${mutante}`); process.exit(1); }
  if (!mordeu) { console.error(`MUTANTE SOBREVIVEU: ${mutante} não acendeu ${esperado}`); process.exit(1); }
  const colaterais = falhas.filter((check) => check.id !== esperado);
  if (colaterais.length) { console.error(`MUTANTE ${mutante} acendeu cláusulas colaterais: ${colaterais.map((c) => c.id).join(', ')}`); process.exit(1); }
  console.log(`MUTANTE MORDIDO: ${mutante} -> ${esperado}`);
} else if (falhas.length) {
  console.error(`AMBIENCE FALHA: ${falhas.length}/${checks.length}`);
  process.exit(1);
} else console.log(`AMBIENCE OK${fotos ? ` · fotos em ${fotos}` : ''}`);
