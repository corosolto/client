// Constrói o mapa completo com GLBs reais em processos de qualidade separados.
// A igualdade das chapas não substitui o suporte do quad no root completo.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const option = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const worker = option('worker');
if (worker) {
  const quality = worker === 'artforaBhouse' ? 'med' : worker;
  globalThis.localStorage = { getItem: () => JSON.stringify({ quality }) };
  const { THREE, initTextures, seedRandom } = await import('./harness.mjs');
  const { preloadPropGeometry } = await import('./prop-geometry-fixture.mjs');
  const { COMMON_MAP_PROPS } = await import('../../public/js/mapprops.js');
  const { GRAFITE } = await import('../../public/js/graffiti_layout.js');
  const production = await import('../../public/js/map_ferrovelho.js');
  const { grafiteNoDedicado, gradeEspacial, quantizarGrafite, retanguloGrafiteDesenhado } = await import('../../public/js/graffiti_pass.js');
  const { criarSuporteGrafite, superficieGrafitavel } = await import('../../public/js/graffiti_surface.js');
  const { measureGraffitiArea } = await import('./graffiti-area-audit.mjs');
  const mapURL = new URL('../../public/js/map_ferrovelho.js', import.meta.url);
  const source = readFileSync(mapURL, 'utf8');
  let build = production.buildFerroVelho;
  if (option('mutant')) {
    const replaceOnce = (text, before, after) => {
      assert.equal(text.split(before).length, 2, `mutation must replace actual marker exactly once: ${before}`);
      return text.replace(before, after);
    };
    let mutated = source;
    if (option('mutant') === 'old-low-step') {
      mutated = replaceOnce(mutated, 'const step = 1.25;', 'const step = LOWQ ? 2.2 : 1.25;');
    } else if (option('mutant') === 'old-low-posts') {
      mutated = replaceOnce(mutated, 'i % (LOWQ ? 4 : 2)', 'i % (LOWQ ? 3 : 2)');
    } else if (option('mutant') === 'old-quality-rng') {
      mutated = replaceOnce(mutated, 'for (const [cx, cz] of spots) for (let k = 0; k < 9; k++)',
        'for (const [cx, cz] of spots) for (let k = 0; k < per; k++)');
      mutated = replaceOnce(mutated, 'for (const [cx, cz] of clumps) {\n        for (let k = 0; k < 7; k++)',
        'for (const [cx, cz] of clumps) {\n        for (let k = 0; k < perClump; k++)');
      mutated = replaceOnce(mutated, 'if (LOWQ && k >= 4) continue;', '');
      mutated = replaceOnce(mutated, 'if (LOWQ && k >= 3) continue;', '');
    } else if (option('mutant') === 'no-allowlist') {
      mutated = replaceOnce(mutated,
        'if (mesh.isMesh && !mesh.userData.graffitiRespawnB) mesh.userData.graffitiSupportExcluded = true;', '');
    } else if (option('mutant') === 'house-wall-shift') {
      mutated = replaceOnce(mutated,
        'addBox(G.x1 - G.x0, 3.4, 0.5, MAT.office, (G.x0 + G.x1) / 2, 0, G.z1);',
        'addBox(G.x1 - G.x0, 3.4, 0.5, MAT.office, (G.x0 + G.x1) / 2, 0, G.z1 + 0.4);');
    } else throw Error(`unknown mutant: ${option('mutant')}`);
    mutated = mutated
      .replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, specifier) => {
        const absolute = specifier.startsWith('.') ? new URL(specifier, mapURL).href
          : pathToFileURL(createRequire(mapURL).resolve(specifier)).href;
        return `from ${quote}${absolute}${quote}`;
      });
    build = (await import(`data:text/javascript,${encodeURIComponent(mutated)}`)).buildFerroVelho;
  }
  const props = [...new Set([...COMMON_MAP_PROPS, ...production.FERRO_PROPS])];
  await preloadPropGeometry(props);
  const textures = await initTextures();
  seedRandom(12345); grafiteNoDedicado(true);
  const scene = new THREE.Scene(), world = build(scene, textures);
  scene.updateMatrixWorld(true);
  const candidates = [];
  world.root.traverse(mesh => {
    const p = mesh.geometry?.parameters;
    if (mesh.isInstancedMesh && p?.width === 1 && p.height === 1 && p.depth === .05) candidates.push(mesh);
  });
  assert.equal(candidates.length, 1, 'actual map must expose one zinc panel lot');
  const panels = candidates[0], matrices = [], matrix = new THREE.Matrix4();
  if (option('mutant') !== 'old-low-step') assert.equal(panels.count, 211, 'actual stable zinc substrate must retain 211 panels');
  for (let i = 0; i < panels.count; i++) { panels.getMatrixAt(i, matrix); matrices.push(matrix.toArray()); }
  const support = criarSuporteGrafite(world.root, gradeEspacial);
  const drawnRectangle = (piece, local = false) => {
    const geometry = new THREE.PlaneGeometry(piece.w, piece.h);
    let transform;
    if (local) {
      transform = new THREE.Matrix4().makeRotationY(piece.ry);
      transform.setPosition(piece.x, piece.y, piece.z);
    } else { geometry.rotateY(piece.ry); geometry.translate(piece.x, piece.y, piece.z); }
    const drawn = retanguloGrafiteDesenhado(geometry, transform); geometry.dispose(); return drawn;
  };
  const panelRay = new THREE.Raycaster(), panelOrigin = new THREE.Vector3(), panelDirection = new THREE.Vector3();
  const allMeshes = []; world.root.traverse(mesh => { if (mesh.isMesh && mesh.layers.mask & 1) allMeshes.push(mesh); });
  const hitsPanel = piece => {
    const nx = Math.sin(piece.ry), nz = Math.cos(piece.ry), ux = Math.cos(piece.ry), uz = -Math.sin(piece.ry);
    panelDirection.set(-nx, 0, -nz); panelRay.far = .07;
    for (const su of [-.49, -.245, 0, .245, .49]) for (const sv of [-.49, -.245, 0, .245, .49]) {
      panelOrigin.set(piece.x + ux * su * piece.w + nx * .02, piece.y + sv * piece.h,
        piece.z + uz * su * piece.w + nz * .02); panelRay.set(panelOrigin, panelDirection);
      if (panelRay.intersectObjects(allMeshes, false)[0]?.object !== panels) return false;
    }
    return true;
  };
  const sources = Object.fromEntries(['map_ferrovelho.js', 'graffiti_layout.js', 'graffiti_pass.js',
    'graffiti_surface.js', 'graffiti_coverage.js'].map(file => [file,
    createHash('sha256').update(readFileSync(new URL(`../../public/js/${file}`, import.meta.url))).digest('hex')]));
  const finish = report => {
    writeFileSync(option('out'), JSON.stringify(report));
    assert.equal(readFileSync(mapURL, 'utf8'), source, 'production map source must remain untouched');
    world.ambience?.dispose?.();
    return report;
  };
  if (worker === 'artforaBhouse') {
    // Quad 0,6×0,6 na frente de cada chapa de zinco: a allowlist da casa B tem que recusar.
    const fronts = matrices.flatMap(values => {
      const normal = new THREE.Vector3(values[8], 0, values[10]).normalize();
      const piece = { x: values[12] + normal.x * .055, y: values[13],
        z: values[14] + normal.z * .055, ry: Math.atan2(normal.x, normal.z), w: .6, h: .6 };
      return hitsPanel(piece) ? [piece] : [];
    });
    assert.ok(fronts.length, 'control needs real zinc panel fronts to probe');
    const aplicouFora = fronts.filter(piece => quantizarGrafite(piece, support));
    const layout = GRAFITE.ferro_velho;
    assert.ok(layout?.pecas?.length, 'control needs the real B-house baked inventory');
    const positivoCasa = layout.pecas.filter(([, x, y, z, ry, w, h]) =>
      quantizarGrafite({ x, y, z, ry, w, h }, support)).length;
    const excluded = panels.userData.graffitiSupportExcluded === true && !superficieGrafitavel(panels);
    const report = finish({ control: 'artforaBhouse', mutant: option('mutant') || null, assets: props.length,
      panels: panels.count, fronts: fronts.length, recusas: fronts.length - aplicouFora.length,
      aplicouFora, positivoCasa, bakedTotal: layout.pecas.length, excluded, sources });
    console.log(JSON.stringify({ control: 'artforaBhouse', mutant: report.mutant, panels: panels.count,
      fronts: fronts.length, recusas: report.recusas, aplicouFora: aplicouFora.length,
      positivoCasa, excluded }));
    process.exitCode = aplicouFora.length === 0 && positivoCasa > 0 && excluded ? 0 : 1;
  } else {
    const reference = option('reference') ? JSON.parse(readFileSync(option('reference'), 'utf8')) : null;
    // Testemunhas positivas: os quads reais assados da casa B, cada um com parede
    // tagueada graffitiRespawnB atrás (raio pelo centro, malha visível do root real).
    const layout = GRAFITE.ferro_velho;
    assert.ok(layout?.pecas?.length, 'actual Ferro baked inventory must exist');
    const bakedCases = [
      ...layout.pecas.map(([a, x, y, z, ry, w, h]) => ({ file: layout.arquivos[a], kind: 'tag', piece: { x, y, z, ry, w, h } })),
      ...(layout.murais || []).map(([file, x, y, z, ry, w, h]) => ({ file, kind: 'mural', piece: { x, y, z, ry, w, h } })),
    ];
    const backingTagged = piece => {
      const nx = Math.sin(piece.ry), nz = Math.cos(piece.ry);
      panelOrigin.set(piece.x + nx * .02, piece.y, piece.z + nz * .02);
      panelDirection.set(-nx, 0, -nz); panelRay.far = .07;
      panelRay.set(panelOrigin, panelDirection);
      return panelRay.intersectObjects(allMeshes, false)[0]?.object.userData.graffitiRespawnB === true;
    };
    const bakedDiagnostics = [];
    for (const item of bakedCases) {
      const local = item.kind === 'mural', drawn = drawnRectangle(item.piece, local);
      const texturePresent = typeof item.file === 'string' && (local ? textures.muraisHomNomes?.includes(item.file)
        : item.file.startsWith('poster:') ? textures.posterFiles?.includes(item.file.slice(7)) : textures.decalFiles?.includes(item.file));
      bakedDiagnostics.push({ ...item, texturePresent, backingTagged: backingTagged(item.piece),
        productionNominal: support(item.piece), productionDrawn: !!drawn && support(drawn),
        nominal: await measureGraffitiArea(world.root, item.piece, THREE, superficieGrafitavel),
        drawn: drawn ? await measureGraffitiArea(world.root, drawn, THREE, superficieGrafitavel) : null });
    }
    const lostBakedDiagnostics = bakedDiagnostics.filter(result => !result.texturePresent || !result.backingTagged
      || !result.productionNominal || !result.productionDrawn
      || !result.nominal.supported || !result.drawn?.supported);
    const bakedInventoryEqual = !reference || JSON.stringify(bakedCases) === JSON.stringify(reference.bakedCases);
    const grass = [];
    world.root.traverse(mesh => {
      if (!mesh.isInstancedMesh || mesh.geometry.type !== 'PlaneGeometry' || mesh.material.alphaTest !== .4
        || !mesh.userData.nonSolidSurface) return;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix); const transform = mesh.matrixWorld.clone().multiply(matrix);
        const color = new THREE.Color(); mesh.getColorAt(i, color);
        grass.push(JSON.stringify([transform.toArray(), color.toArray()]));
      }
    });
    assert.ok(grass.length, 'actual map must retain its tall-grass lot');
    const availableGrass = new Map();
    for (const key of reference?.grass || grass) availableGrass.set(key, (availableGrass.get(key) || 0) + 1);
    const novelGrass = grass.filter(key => {
      const count = availableGrass.get(key) || 0;
      if (!count) return true; availableGrass.set(key, count - 1); return false;
    });
    const postLots = [];
    world.root.traverse(mesh => {
      const p = mesh.geometry?.parameters;
      if (mesh.isInstancedMesh && mesh.geometry.type === 'CylinderGeometry'
        && p.radiusTop === .075 && p.radiusBottom === .105 && p.height === 1) postLots.push(mesh);
    });
    assert.equal(postLots.length, 1, 'actual map must expose one fence-post lot');
    const posts = [];
    for (let i = 0; i < postLots[0].count; i++) {
      postLots[0].getMatrixAt(i, matrix);
      posts.push(JSON.stringify(postLots[0].matrixWorld.clone().multiply(matrix).toArray()));
    }
    const availablePosts = new Map();
    for (const key of reference?.posts || posts) availablePosts.set(key, (availablePosts.get(key) || 0) + 1);
    const novelPosts = posts.filter(key => {
      const count = availablePosts.get(key) || 0;
      if (!count) return true; availablePosts.set(key, count - 1); return false;
    });
    const matricesEqual = !reference || JSON.stringify(matrices) === JSON.stringify(reference.matrices);
    const report = finish({ quality: worker, mutant: option('mutant') || null, assets: props.length,
      panels: panels.count, matricesEqual, baked: bakedCases.length, lostBakedDiagnostics,
      bakedDiagnostics, bakedCases, bakedInventoryEqual, matrices, grass, novelGrass,
      posts, novelPosts, sources });
    console.log(JSON.stringify({ quality: worker, mutant: report.mutant, panels: panels.count,
      matricesEqual, baked: bakedCases.length, lostBaked: lostBakedDiagnostics.length, bakedInventoryEqual,
      grass: grass.length, novelGrass: novelGrass.length, posts: posts.length, novelPosts: novelPosts.length }));
    process.exitCode = matricesEqual && lostBakedDiagnostics.length === 0 && bakedInventoryEqual
      && novelGrass.length === 0 && novelPosts.length === 0 ? 0 : 1;
  }
} else {
  const directory = mkdtempSync(join(tmpdir(), 'ferro-graffiti-quality-'));
  console.log(`Artifacts: ${directory}`);
  const file = fileURLToPath(import.meta.url), records = [], unexpectedVerdicts = [];
  // Crash de filho ou JSON de veredito ausente é ERRO, nunca detecção.
  const run = (label, args, expected) => {
    const out = join(directory, `${label}.json`);
    const result = spawnSync(process.execPath, [file, ...args, `--out=${out}`],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
    let record = null;
    try { record = JSON.parse(readFileSync(out, 'utf8')); } catch { record = null; }
    if (result.status !== expected) unexpectedVerdicts.push(`${label}: exit ${result.status ?? 'crash'}, expected ${expected}`);
    if (!record) unexpectedVerdicts.push(`${label}: no verdict JSON (crash/malformed child is not detection)`);
    records.push(record || { label, missing: true });
    return record;
  };
  const reference = () => [`--reference=${join(directory, 'med.json')}`];
  run('med', ['--worker=med'], 0);
  run('low', ['--worker=low', ...reference()], 0);
  run('old-low-step', ['--worker=low', ...reference(), '--mutant=old-low-step'], 1);
  run('old-quality-rng', ['--worker=low', ...reference(), '--mutant=old-quality-rng'], 1);
  run('old-low-posts', ['--worker=low', ...reference(), '--mutant=old-low-posts'], 1);
  const control = run('artforaBhouse', ['--worker=artforaBhouse'], 0);
  const noAllowlist = run('artforaBhouse-no-allowlist', ['--worker=artforaBhouse', '--mutant=no-allowlist'], 1);
  const wallShift = run('low-house-wall-shift', ['--worker=low', ...reference(), '--mutant=house-wall-shift'], 1);
  assert.equal(records[0].panels, records[1].panels, 'med and low must render the same zinc substrate count');
  assert.ok(records[2].matricesEqual === false && records[2].panels !== records[0].panels,
    'old low step must move the real zinc substrate geometry, not merely an inventory count');
  assert.ok(records[3].novelGrass.length > 0,
    'old quality RNG must invent foliage outside the med subset');
  assert.ok(records[4].novelPosts.length > 0,
    'old low posts must move fence posts outside the med subset');
  assert.ok(control && control.fronts > 0 && control.recusas === control.fronts
    && control.aplicouFora.length === 0 && control.positivoCasa > 0 && control.excluded === true,
  'artforaBhouse must find zinc fronts, refuse all of them and still apply on the tagged B house');
  assert.ok(noAllowlist && noAllowlist.aplicouFora.length > 0,
    'removing the B-house allowlist must let zinc art apply and the control must report it');
  assert.ok(wallShift && wallShift.lostBakedDiagnostics.length > 0,
    'shifting a B-house wall must strip real baked support');
  const report = option('report') || join(directory, 'summary.json');
  const passed = unexpectedVerdicts.length === 0;
  writeFileSync(report, JSON.stringify({ passed, unexpectedVerdicts, directory,
    normalPanels: records[0].panels, matricesEqual: records[1].matricesEqual,
    baked: records[0].bakedCases.length, bakedLostMed: records[0].lostBakedDiagnostics.length,
    bakedLostLow: records[1].lostBakedDiagnostics.length,
    stepPanels: records[2].panels, stepMatricesEqual: records[2].matricesEqual,
    oldRngNovelGrass: records[3].novelGrass.length, oldPostNovelPosts: records[4].novelPosts.length,
    controlFronts: control?.fronts, controlRecusas: control?.recusas,
    controlAplicouFora: control?.aplicouFora?.length, controlPositivoCasa: control?.positivoCasa,
    noAllowlistAplicouFora: noAllowlist?.aplicouFora?.length,
    houseShiftLostBaked: wallShift?.lostBakedDiagnostics.length }, null, 2) + '\n');
  console.log(`${passed ? 'PASS' : 'FAIL'} Ferro graffiti quality: real GLBs, B-house baked quads with support tags, zinc substrate parity, grass/post subsets, artforaBhouse refusal control, five causal mutations; ${report}`);
  process.exitCode = passed ? 0 : 1;
}
