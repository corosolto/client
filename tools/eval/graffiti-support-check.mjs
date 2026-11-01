#!/usr/bin/env node
/** Geometry fixtures exercise production placement and pruning without a browser.
 * --self-test imports an in-memory mutant of graffiti_surface.js where the actual
 * support function always accepts. The SAME expectations must detect invalid
 * baked tags, baked murals, manual art and live placement in that mutant.
 * No repository source is patched and no fixture metadata is used as a mutation.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { THREE } from './harness.mjs';
import * as production from '../../public/js/graffiti_pass.js';
import { criarSuporteGrafite } from '../../public/js/graffiti_surface.js';

const texture = new THREE.Texture();
const T = { decalFiles: ['fixture.png'], decals: [texture], decalAspects: [1],
  posterFiles: [], posterImgs: [], posterAspects: [] };
const row = [0, 0, 2, .13, 0, 2, 2];
const box = (w = 4, h = 4, d = .2) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial());
  mesh.position.y = h / 2; mesh.name = 'fixture-concrete'; return mesh;
};
const plane = (z, name = '', material = new THREE.MeshLambertMaterial(), w = 4, h = 4) => {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.position.set(0, 2, z); mesh.name = name; return mesh;
};
const grouped = (...objects) => { const root = new THREE.Group(); if (objects.length) root.add(...objects); return root; };
const liveConfig = root => ({ id: '__graffiti_support_fixture__', root, T,
  waypoints: [{ x: -2, z: 4 }, { x: 0, z: 4 }, { x: 2, z: 4 }], seed: 7,
  passo: .8, alcance: 8, raios: 16, minLarg: .3, maxLarg: 2, exigeChao: false,
  bandas: [{ y0: .5, y1: 2.8, larg: 1, alturas: [.7], chance: 100, pool: [0], exigeChao: false }] });

function suite(api, quiet = false) {
  const cases = [];
  function test(name, category, body) {
    try { body(); cases.push({ name, category, ok: true }); if (!quiet) console.log(`PASS ${name}`); }
    catch (error) { cases.push({ name, category, ok: false, error: error.message });
      if (!quiet) console.error(`FAIL ${name}: ${error.message.split('\n')[0]}`); }
  }
  function baked(name, makeRoot, artRow, expected) {
    test(name, 'baked', () => {
      const root = makeRoot(); root.updateMatrixWorld(true);
      const result = api.aplicarGrafite(root, T, { arquivos: ['fixture.png'], pecas: [artRow] });
      assert.equal(result.pecas, expected, 'rendered baked piece count');
      assert.equal(root.userData.graffitiPecas?.length || 0, expected, 'inventoried piece count');
      let emitted = 0; root.traverse(o => { if (o.isMesh && o.name === 'decal:fixture.png') emitted++; });
      assert.equal(emitted, expected, 'actual rendered decal mesh count');
    });
  }
  baked('wall retains baked paint', () => grouped(box()), row, 1);
  // Matrizes Float32 dos painéis low 16/9 em map_ferrovelho.js; clipBounds
  // criava uma aresta invertida de 2,22e-16 m e descartava 1,26/0,43 m² válidos.
  const ferroClippingCases = [
    { name: 'Ferro panel16 retains actual Float32 artwork through clipping',
      matrix: [.051407694816589355, 0, 2.3121559619903564, 0, 0, 3.833750009536743, 0, 0, -.999752938747406, 0, .022228168323636055, 0, 31.479999542236328, 1.9168750047683716, 0, 1],
      row: [0, 31.425, 1.45, -.146, -1.57, 1.468, 2.1] },
    { name: 'Ferro panel9 retains actual Float32 artwork through clipping',
      matrix: [.021646810695528984, 0, 2.3126258850097656, 0, 0, 3.6549999713897705, 0, 0, -.9999561905860901, 0, .009359863586723804, 0, 31.479999542236328, 1.8274999856948853, -15.272727012634277, 1],
      row: [0, 31.425, 1.45, -15.527, -1.549, 1.05, .8] },
  ];
  for (const fixture of ferroClippingCases) baked(fixture.name, () => {
    const wall = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, .05), new THREE.MeshLambertMaterial(), 1);
    wall.setMatrixAt(0, new THREE.Matrix4().fromArray(fixture.matrix));
    return grouped(wall);
  }, fixture.row, 1);
  test('quantized live quad survives baked roundtrip on narrow real wall', 'live', () => {
    const raw = { x: 0, y: 2, z: .13, ry: 0, w: 1.0006, h: 1.2 };
    const makeRoot = () => grouped(box(1.0007));
    const root = makeRoot(), support = criarSuporteGrafite(root, production.gradeEspacial);
    assert.equal(support(raw), true, 'unrounded artwork has complete support');
    const roundedRow = [0, 0, 2, .13, 0, 1.001, 1.2];
    assert.equal(api.aplicarGrafite(makeRoot(), T, { arquivos: ['fixture.png'], pecas: [roundedRow] }).pecas, 0,
      'old three-decimal persistence loses support');
    const quad = api.quantizarGrafite(raw, support);
    assert.ok(quad && quad.w >= raw.w - .002 && quad.w < 1.001, 'millimetric inset preserves artwork');
    const fixedRow = [0, ...['x', 'y', 'z', 'ry', 'w', 'h'].map(key => quad[key])];
    assert.equal(api.aplicarGrafite(makeRoot(), T, { arquivos: ['fixture.png'], pecas: [fixedRow] }).pecas, 1,
      'the exact persisted rectangle renders with complete support');
  });
  test('Float32 drawn quad cannot overhang a wall at x40', 'live', () => {
    const makeRoot = () => { const wall = box(.4, 2); wall.position.x = 40; return grouped(wall); };
    const support = criarSuporteGrafite(makeRoot(), api.gradeEspacial);
    const raw = { x: 40, y: 1, z: .13, ry: 0, w: .4, h: 2 };
    assert.equal(support(raw), true, 'nominal rectangle fits');
    const geometry = new THREE.PlaneGeometry(raw.w, raw.h).translate(raw.x, raw.y, raw.z);
    const drawn = api.retanguloGrafiteDesenhado(geometry); geometry.dispose();
    assert.ok(drawn.w > raw.w, 'Float32 vertices reproduce widening');
    assert.equal(support(drawn), false, 'actual overhang is rejected');
    const oldRow = [0, ...['x', 'y', 'z', 'ry', 'w', 'h'].map(k => raw[k])];
    assert.equal(api.aplicarGrafite(makeRoot(), T, { arquivos: ['fixture.png'], pecas: [oldRow] }).pecas, 0);
    const quad = api.quantizarGrafite(raw, support);
    assert.ok(quad && quad.w < raw.w, 'live generation takes a supported margin');
    const goodRow = [0, ...['x', 'y', 'z', 'ry', 'w', 'h'].map(k => quad[k])];
    assert.equal(api.aplicarGrafite(makeRoot(), T, { arquivos: ['fixture.png'], pecas: [goodRow] }).pecas, 1);
  });
  baked('empty air rejects baked paint', () => grouped(), row, 0);
  const wallRect = (x0, x1, y0 = 0, y1 = 4, z = .1, name = 'concrete-wall') => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), new THREE.MeshLambertMaterial());
    mesh.name = name; mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); return mesh;
  };
  baked('joined coplanar walls retain paint across their exact seam', () => grouped(wallRect(-2, .25), wallRect(.25, 2)), row, 1);
  for (const width of [.1, .001]) {
    baked(`unsampled ${width}m slit between coplanar walls rejects paint`, () => grouped(wallRect(-2, .2), wallRect(.2 + width, 2)), row, 0);
  }
  baked('unsampled interior hole rejects paint', () => grouped(
    wallRect(-2, .2), wallRect(.3, 2), wallRect(.2, .3, 0, 2.2), wallRect(.2, .3, 2.3, 4)), row, 0);
  baked('L shaped wall cannot support its missing quadrant', () => grouped(wallRect(-2, .2), wallRect(.2, 2, 0, 2.2)), row, 0);
  baked('outermost unsampled edge cannot overhang wall', () => grouped(wallRect(-.99, 2)), row, 0);
  for (const name of ['samambaia', 'glass-window']) {
    baked(`unsampled narrow foreground ${name} rejects paint`, () => grouped(box(), wallRect(.2, .3, 1, 3, .115, name)), row, 0);
  }
  baked('unsampled narrow penetrating concrete rejects paint', () => grouped(box(), wallRect(.2, .3, 1, 3, .14)), row, 0);
  for (const segments of [1, 40]) {
    baked(`unsampled 1mm foreground plant with ${segments * segments * 2} triangles rejects paint`, () => {
      const plant = new THREE.Mesh(new THREE.PlaneGeometry(.001, .001, segments, segments), new THREE.MeshLambertMaterial());
      plant.name = 'samambaia'; plant.position.set(.25, 2.25, .115); return grouped(box(), plant);
    }, row, 0);
  }
  baked('dense tiny plant behind actual wall preserves support', () => {
    const plant = new THREE.Mesh(new THREE.PlaneGeometry(.001, .001, 40, 40), new THREE.MeshLambertMaterial());
    plant.name = 'samambaia'; plant.position.set(.25, 2.25, .09); return grouped(box(), plant);
  }, row, 1);
  baked('plant behind actual wall does not erase supported paint', () => grouped(box(), wallRect(.2, .3, 1, 3, .09, 'samambaia')), row, 1);
  baked('undrawn geometry triangles cannot bridge a slit', () => {
    const left = wallRect(-2, .2), right = wallRect(.3, 2);
    const fake = wallRect(.2, .3); fake.geometry.setDrawRange(0, 0);
    return grouped(left, right, fake);
  }, row, 0);
  baked('mesh on an invisible render layer cannot bridge a slit', () => {
    const left = wallRect(-2, .2), right = wallRect(.3, 2);
    const fake = wallRect(.2, .3); fake.layers.set(1);
    return grouped(left, right, fake);
  }, row, 0);
  baked('tessellated wall retains exact support', () => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4, 32, 32), new THREE.MeshLambertMaterial());
    mesh.name = 'tessellated-concrete'; mesh.position.set(0, 2, .1); return grouped(mesh);
  }, row, 1);

  baked('distant wall rejects floating paint', () => grouped(box()), [0, 0, 2, .5, 0, 2, 2], 0);
  baked('paint cannot overhang wall edges', () => grouped(box(1)), row, 0);
  baked('nonSolidSurface rejects support', () => { const m = box(); m.userData.nonSolidSurface = true; return grouped(m); }, row, 0);
  baked('opaque samambaia rejects support', () => { const m = box(); m.name = 'samambaia'; return grouped(m); }, row, 0);
  baked('plant ancestor rejects support', () => { const parent = grouped(box()); parent.name = 'planta'; return grouped(parent); }, row, 0);
  baked('suspended opaque faixa cannot support wall graffiti', () => grouped(plane(.1, 'faixa:eternamente')), row, 0);
  baked('opacity .2 rejects support even without transparency flag', () => { const m = box(); m.material.opacity = .2; return grouped(m); }, row, 0);
  baked('invisible material cannot support paint', () => { const m = box(); m.material.visible = false; return grouped(m); }, row, 0);
  baked('colorWrite false collision box cannot support paint', () => {
    const m = box(); m.material.colorWrite = false; m.material.depthWrite = false; return grouped(m);
  }, row, 0);
  baked('hidden ancestor cannot support paint', () => { const hidden = grouped(box()); hidden.visible = false; return grouped(hidden); }, row, 0);
  baked('alpha cutout cannot support paint', () => { const m = box(); m.material.alphaTest = .4; return grouped(m); }, row, 0);
  baked('transparent glass cannot support paint', () => { const m = box(); m.material.transparent = true; return grouped(m); }, row, 0);
  baked('nearest foreground plant blocks otherwise valid wall', () => {
    const plant = plane(.115, 'samambaia'); plant.userData.nonSolidSurface = true;
    return grouped(box(), plant);
  }, row, 0);
  baked('paint penetrating nearest foreground surface is rejected', () => grouped(box(), plane(.14, 'concrete-front')), row, 0);
  baked('hidden foreground plane does not invalidate visible wall', () => {
    const hidden = plane(.14); hidden.material.visible = false; return grouped(box(), hidden);
  }, row, 1);
  baked('colorWrite false foreground proxy does not invalidate visible wall', () => {
    const hidden = plane(.14); hidden.material.colorWrite = false; hidden.material.depthWrite = false;
    return grouped(box(), hidden);
  }, row, 1);
  baked('oblique normal cannot support flat paint', () => {
    const m = plane(.1, 'concrete-oblique', undefined, 4, 4); m.rotation.y = .25; return grouped(m);
  }, [0, 0, 2, .13, 0, .1, .5], 0);
  const yaw = Math.PI / 3;
  baked('rotated actual wall retains paint', () => { const m = box(); m.rotation.y = yaw; return grouped(m); },
    [0, Math.sin(yaw) * .13, 2, Math.cos(yaw) * .13, yaw, 2, 2], 1);
  test('scaled rotated InstancedMesh wall retains paint', 'baked', () => {
    const root = new THREE.Group(), parent = new THREE.Group(); parent.rotation.y = .7;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(4, 4, .2), new THREE.MeshLambertMaterial(), 2);
    mesh.name = 'concrete-instanced';
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(2, 2, -1),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), .3), new THREE.Vector3(1.3, 1, .8));
    mesh.setMatrixAt(0, matrix); mesh.setMatrixAt(1, new THREE.Matrix4().makeTranslation(20, 2, 20));
    parent.add(mesh); root.add(parent); root.updateMatrixWorld(true);
    const center = new THREE.Vector3(2, 2, -1).applyMatrix4(parent.matrixWorld);
    const artYaw = 1, gap = .11;
    const result = api.aplicarGrafite(root, T, { arquivos: ['fixture.png'],
      pecas: [[0, center.x + Math.sin(artYaw) * gap, center.y, center.z + Math.cos(artYaw) * gap, artYaw, 2, 2]] });
    assert.equal(result.pecas, 1);
    assert.equal(criarSuporteGrafite(root, production.gradeEspacial)(root.userData.graffitiPecas[0]), true);
  });
  test('unsupported baked mural is rejected', 'mural', () => {
    const root = grouped();
    const result = api.aplicarGrafite(root, T, { arquivos: [], pecas: [], murais: [['fixture', 0, 2, .13, 0, 2, 2]] }, { fixture: texture });
    assert.equal(result.murais, 0); assert.equal(root.children.length, 0);
  });
  test('supported baked mural remains rendered', 'mural', () => {
    const root = grouped(box());
    const result = api.aplicarGrafite(root, T, { arquivos: [], pecas: [], murais: [['fixture', 0, 2, .13, 0, 2, 2]] }, { fixture: texture });
    assert.equal(result.murais, 1); assert.ok(root.children.some(o => o.name === 'mural:fixture'));
  });
  function manual(name, makeRoot, expectedAttached) {
    test(name, 'manual', () => {
      const { root, art } = makeRoot();
      const oldLive = window.__grafiteLive; window.__grafiteLive = true;
      try { api.grafitar({ ...liveConfig(root), waypoints: [] }); }
      finally { window.__grafiteLive = oldLive; }
      assert.equal(art.parent === root, expectedAttached, 'manual artwork attachment after real grafitar');
    });
  }
  manual('manual unsupported decal is pruned before live placement', () => { const art = plane(.13, 'decal:fixture'); return { root: grouped(art), art }; }, false);
  manual('manual supported decal is preserved', () => { const art = plane(.13, 'decal:fixture', undefined, 2, 2); return { root: grouped(box(), art), art }; }, true);
  test('existing poster checks backing without intersecting itself', 'manual', () => {
    const art = plane(.13, 'poster:fixture', undefined, 2, 2), root = grouped(box(), art);
    const piece = { x: 0, y: 2, z: .13, ry: 0, w: 2, h: 2 };
    assert.equal(criarSuporteGrafite(root, production.gradeEspacial)(piece), false, 'placement still sees occupied artwork');
    assert.equal(criarSuporteGrafite(root, production.gradeEspacial, art)(piece), true, 'own artwork is not its backing');
    art.position.z = .5;
    assert.equal(criarSuporteGrafite(root, production.gradeEspacial, art)({ ...piece, z: .5 }), false, 'floating poster stays rejected');
  });
  test('excluding own poster still rejects a second foreground poster', 'manual', () => {
    const art = plane(.13, 'poster:fixture', undefined, 2, 2);
    const other = plane(.115, 'poster:other', undefined, 2, 2), root = grouped(box(), art, other);
    assert.equal(criarSuporteGrafite(root, production.gradeEspacial, art)({ x: 0, y: 2, z: .13, ry: 0, w: 2, h: 2 }), false);
  });
  for (const kind of ['empty-range', 'one-triangle', 'reversed-index']) {
    manual(`manual ${kind} cannot claim a complete drawn quad`, () => {
      const art = plane(.13, 'mural:fixture', undefined, 2, 2);
      if (kind === 'empty-range') art.geometry.setDrawRange(0, 0);
      if (kind === 'one-triangle') art.geometry.setIndex([0, 2, 1]);
      if (kind === 'reversed-index') art.geometry.setIndex([0, 1, 2, 2, 1, 3]);
      return { root: grouped(box(), art), art };
    }, false);
  }
  manual('manual material array without groups is not a drawn quad', () => {
    const art = plane(.13, 'mural:fixture', undefined, 2, 2); art.material = [art.material];
    return { root: grouped(box(), art), art };
  }, false);
  manual('rolled manual quad cannot claim an upright footprint', () => {
    const art = plane(.13, 'decal:fixture', undefined, 2, 2); art.rotation.z = Math.PI / 4;
    return { root: grouped(box(2.1, 2.1), art), art };
  }, false);
  test('live posters retain their actual texture identity after batching', 'live', () => {
    const root = grouped(box()), cfg = liveConfig(root);
    const posterT = { ...T, posterFiles: ['fixture.jpg'], posterImgs: [texture], posterAspects: [1] };
    const result = api.pintarParedes({ ...cfg, T: posterT, bandas: cfg.bandas.map(b => ({ ...b, fonte: 'poster' })) });
    assert.ok(result.pecas > 0);
    assert.ok(root.userData.graffitiPecas.every(p => p.f === 'poster:fixture.jpg'));
    assert.ok(root.children.some(o => o.name === 'decal:poster:fixture.jpg'));
  });
  manual('manual mural overhang is pruned', () => { const art = plane(.13, 'mural:fixture', undefined, 2, 2); return { root: grouped(box(1), art), art }; }, false);
  manual('manual decal on opaque samambaia is pruned', () => {
    const plant = box(); plant.name = 'samambaia'; const art = plane(.13, 'decal:fixture', undefined, 2, 2);
    return { root: grouped(plant, art), art };
  }, false);
  manual('nonvertical manual artwork is pruned', () => {
    const art = plane(.13, 'decal:fixture', undefined, 2, 2); art.rotation.x = Math.PI / 2;
    return { root: grouped(box(), art), art };
  }, false);
  test('live generation preserves supported wall artwork', 'live', () => {
    const root = grouped(box(8)); const result = api.pintarParedes(liveConfig(root));
    assert.ok(result.pecas > 0, 'live wall must receive artwork');
    const actual = root.userData.graffitiPecas || [];
    assert.equal(actual.length, result.pecas);
    const independent = criarSuporteGrafite(root, production.gradeEspacial);
    assert.ok(actual.every(p => independent(p)), 'all live pieces satisfy unmutated support measurement');
  });
  test('live placement slides past a panel seam to a supported spot', 'live', () => {
    // Chapas de 0,997 m com fresta de 3 mm: o encaixe tolerante aceita a âncora em
    // cima da fresta, o suporte estrito recusa, e o deslize de 0,5 m acha chapa inteira.
    // Pool com 3 artes DISTINTAS: a unicidade global (contrato 31/10) consome cada
    // arte uma vez, e >=3 peças só é alcançável se o deslize de fato acontecer.
    const panels = Array.from({ length: 8 }, (_, i) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(.997, 4, .2), new THREE.MeshLambertMaterial());
      mesh.position.set(-3.5 + i, 2, 0); mesh.name = 'fixture-panel'; return mesh;
    });
    const T3 = {
      ...T, decalFiles: ['seam-a.png', 'seam-b.png', 'seam-c.png'], decalAspects: [1, 1, 1],
      decals: ['a', 'b', 'c'].map(s => {
        const t = new THREE.Texture(); t.image = { src: `http://grafite.local/img/decals/seam-${s}.png` }; return t;
      }),
    };
    const root = grouped(...panels);
    const cfg = liveConfig(root);
    const result = api.pintarParedes({ ...cfg, T: T3, bandas: cfg.bandas.map(b => ({ ...b, pool: [0, 1, 2] })) });
    assert.ok(result.pecas >= 3, `seam must not discard a slide that fits (got ${result.pecas})`);
    const independent = criarSuporteGrafite(root, production.gradeEspacial);
    assert.ok((root.userData.graffitiPecas || []).every(p => independent(p)), 'slid pieces satisfy support');
  });
  test('live generation rejects translucent plant directly in front of wall', 'live', () => {
    const plant = plane(.115, 'samambaia', new THREE.MeshLambertMaterial({ transparent: true, opacity: .7 }), 8, 4);
    plant.userData.nonSolidSurface = true;
    const root = grouped(box(8), plant); const result = api.pintarParedes(liveConfig(root));
    assert.equal(result.pecas, 0, 'live placement must not bridge nearest plant');
    assert.equal(root.userData.graffitiPecas?.length || 0, 0);
  });
  test('live mural generation preserves supported artwork', 'live-mural', () => {
    const root = grouped(box(8));
    const result = api.pendurarMurais({ ...liveConfig(root), texturas: [texture], nomes: ['fixture'], larg: 3, alt: 2, minLarg: 2 });
    assert.ok(result.murais > 0, 'live wall must retain a mural');
  });
  test('live mural generation rejects foreground plant', 'live-mural', () => {
    const plant = plane(.115, 'samambaia', new THREE.MeshLambertMaterial({ transparent: true, opacity: .7 }), 8, 4);
    plant.userData.nonSolidSurface = true;
    const root = grouped(box(8), plant);
    const result = api.pendurarMurais({ ...liveConfig(root), texturas: [texture], nomes: ['fixture'], larg: 3, alt: 2, minLarg: 2 });
    assert.equal(result.murais, 0, 'mural must not bridge nearest plant');
  });
  return cases;
}

const cases = suite(production);
const failures = cases.filter(c => !c.ok);
if (failures.length) process.exitCode = 1;
console.log(JSON.stringify({ fixtures: cases.length, passed: cases.length - failures.length, failed: failures.length }));

if (process.argv.includes('--self-test')) {
  // Rebase the original imports into absolute URLs so the mutant is evaluated by
  // Node without a temporary source file, loader mocks or editing dependencies.
  const surfaceURL = new URL('../../public/js/graffiti_surface.js', import.meta.url);
  const passURL = new URL('../../public/js/graffiti_pass.js', import.meta.url);
  const source = readFileSync(surfaceURL, 'utf8');
  const passSource = readFileSync(passURL, 'utf8');
  const absoluteImports = (text, owner, overrides = {}) => text.replace(
    /(\bfrom\s*|\bimport\s*)(['"])([^'"\n]+)\2/g,
    (full, prefix, quote, specifier) => {
      const target = overrides[specifier] || (specifier.startsWith('.') ? new URL(specifier, owner).href : import.meta.resolve(specifier));
      return `${prefix}${JSON.stringify(target)}`;
    });
  const marker = 'export function criarSuporteGrafite(root, grade, ignorarMesh = null) {';
  assert.equal(source.split(marker).length, 2, 'mutant must patch exactly the current production support function');
  const mutatedSource = source.slice(0, source.indexOf(marker))
    + 'export function criarSuporteGrafite(root, grade) { return (piece) => true; }\n';
  const surfaceData = `data:text/javascript,${encodeURIComponent(absoluteImports(mutatedSource, surfaceURL))}`;
  const passData = `data:text/javascript,${encodeURIComponent(absoluteImports(passSource, passURL, { './graffiti_surface.js': surfaceData }))}`;
  let mutant;
  try { mutant = await import(passData); }
  catch (error) { console.error(`FAIL in-memory production mutant import: ${error.message.slice(0, 300)}`); process.exit(1); }
  const mutantCases = suite(mutant, true);
  const detected = mutantCases.filter(c => !c.ok);
  const detectedCategories = new Set(detected.map(c => c.category));
  for (const category of ['baked', 'mural', 'manual', 'live', 'live-mural']) {
    assert.ok(detectedCategories.has(category), `same fixtures must detect the disabled production support guard in ${category} path`);
  }
  assert.ok(mutantCases.find(c => c.name === 'wall retains baked paint')?.ok, 'mutant must preserve positive control');
  assert.equal(readFileSync(surfaceURL, 'utf8'), source, 'production support source must remain untouched');
  assert.equal(readFileSync(passURL, 'utf8'), passSource, 'production placement source must remain untouched');
  const exactMarker = 'return covers(piece, candidates);';
  const coverageURL = new URL('../../public/js/graffiti_coverage.js', import.meta.url);
  const coverageSource = readFileSync(coverageURL, 'utf8');
  const normalizationMarker = 'return normalizarPoligono(out);';
  assert.equal(coverageSource.split(normalizationMarker).length, 2, 'must restore raw production clip output exactly once');
  const rawClip = coverageSource.replace(normalizationMarker, 'return out;');
  const rawClipData = `data:text/javascript,${encodeURIComponent(absoluteImports(rawClip, coverageURL))}`;
  const rawClipSurface = `data:text/javascript,${encodeURIComponent(absoluteImports(source, surfaceURL, { './graffiti_coverage.js': rawClipData }))}`;
  const rawClipPass = `data:text/javascript,${encodeURIComponent(absoluteImports(passSource, passURL, { './graffiti_surface.js': rawClipSurface }))}`;
  const rawClipCases = suite(await import(rawClipPass), true);
  for (const panel of [16, 9]) assert.ok(rawClipCases.some(c => !c.ok && c.name === `Ferro panel${panel} retains actual Float32 artwork through clipping`),
    `raw clipping mutant must reproduce valid artwork discarded on Ferro panel ${panel}`);
  assert.ok(rawClipCases.find(c => c.name === 'unsampled 0.001m slit between coplanar walls rejects paint')?.ok,
    'normalization mutant preserves the 1mm gap control');
  assert.equal(readFileSync(coverageURL, 'utf8'), coverageSource, 'production coverage source must remain untouched by mutation');
  console.log(JSON.stringify({ clippingSelfTest: 'passed', mutation: 'production clip returns unnormalized polygons',
    detected: rawClipCases.filter(c => !c.ok).map(c => c.name) }));
  assert.equal(source.split(exactMarker).length, 2, 'must disable the actual exact-area production guard once');
  const raysOnly = source.replace(exactMarker, 'return true;');
  const raysOnlyData = `data:text/javascript,${encodeURIComponent(absoluteImports(raysOnly, surfaceURL))}`;
  const raysOnlyPass = `data:text/javascript,${encodeURIComponent(absoluteImports(passSource, passURL, { './graffiti_surface.js': raysOnlyData }))}`;
  let raysOnlyAPI;
  try { raysOnlyAPI = await import(raysOnlyPass); }
  catch (error) { console.error(`FAIL exact-area mutant import: ${error.message.slice(0, 300)}`); process.exit(1); }
  const raysOnlyCases = suite(raysOnlyAPI, true), exactDetected = raysOnlyCases.filter(c => !c.ok);
  for (const name of [
    'unsampled 0.1m slit between coplanar walls rejects paint',
    'unsampled 0.001m slit between coplanar walls rejects paint',
    'unsampled interior hole rejects paint',
    'outermost unsampled edge cannot overhang wall',
    'unsampled narrow foreground samambaia rejects paint',
    'unsampled narrow foreground glass-window rejects paint',
    'unsampled narrow penetrating concrete rejects paint',
    'unsampled 1mm foreground plant with 3200 triangles rejects paint'
  ]) assert.ok(exactDetected.some(c => c.name === name), `25-ray-only mutant must fail: ${name}`);
  assert.ok(raysOnlyCases.find(c => c.name === 'joined coplanar walls retain paint across their exact seam')?.ok);
  console.log(JSON.stringify({ exactAreaSelfTest: 'passed', mutation: 'production exact-area guard bypassed, original 25 rays retained',
    rejectedFixtures: exactDetected.length, detected: exactDetected.map(c => c.name) }));
  console.log(JSON.stringify({ selfTest: 'passed', mutation: 'production criarSuporteGrafite always accepts',
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    rejectedFixtures: detected.length, categories: [...detectedCategories], detected: detected.map(c => c.name) }));
}
