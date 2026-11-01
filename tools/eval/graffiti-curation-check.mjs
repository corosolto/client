#!/usr/bin/env node
// Curadoria única e suporte permitido na cena real; baseline imutável e mutantes.
// Método, contagens e limites: docs/visual-consistency/GRAFITE-REGUA.md.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { THREE, MAPS, initTextures, seedRandom } from './harness.mjs';
import * as production from '../../public/js/graffiti_pass.js';
import { criarSuporteGrafite } from '../../public/js/graffiti_surface.js';
import { GRAFITE } from '../../public/js/graffiti_layout.js';

const passURL = new URL('../../public/js/graffiti_pass.js', import.meta.url);
const piscinaURL = new URL('../../public/js/map_piscina.js', import.meta.url);
const ferroURL = new URL('../../public/js/map_ferrovelho.js', import.meta.url);
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const TAG = { piscina_treta: 'graffitiWhiteWall', ferro_velho: 'graffitiRespawnB' };
const layoutURL = new URL('../../public/js/graffiti_layout.js', import.meta.url);

// URL normalizada identifica o asset; canvas sem src usa identidade da imagem.
const imagens = new Map();
function chaveDaArte(map, fallback) {
  const image = map?.source?.data || map?.image;
  if (image?.src) return decodeURIComponent(new URL(image.src, 'http://grafite.local').pathname);
  if (map?.userData?.decalArquivo) return '/img/decals/' + map.userData.decalArquivo;
  const arquivo = String(fallback || '').replace(/^decal:/, '');
  if (arquivo.startsWith('poster:')) return '/posters/' + arquivo.slice(7);
  if (/\.(png|jpe?g|webp)$/i.test(arquivo)) return '/img/decals/' + arquivo;
  if (!image || typeof image !== 'object') return 'sem-fonte:' + fallback;
  if (!imagens.has(image)) imagens.set(image, imagens.size + 1);
  return 'canvas:' + imagens.get(image);
}
function chaveDaPecaAssada(f) {
  return String(f || '').startsWith('poster:') ? '/posters/' + String(f).slice(7) : '/img/decals/' + f;
}
function inventariar(root) {
  const pieces = [], unknown = [];
  root.traverse((mesh) => {
    if (!mesh.isMesh || !/^(decal:|mural:|poster:)/.test(mesh.name)) return;
    for (let node = mesh; node; node = node.parent) if (!node.visible) return;
    // RGB visível (CRÍTICO R3 P2-1, predicado do gate/measure/inventário): opacity 0 com
    // NoBlending ou NormalBlending+transparent=false ainda desenha; transparent=true não.
    const desenhaRGB = mesh.material.blending === THREE.NoBlending
      || (mesh.material.blending === THREE.NormalBlending && mesh.material.transparent === false);
    if (Array.isArray(mesh.material) || !mesh.material?.visible
      || !(mesh.material.opacity > 0 || desenhaRGB)) return;
    if (mesh.userData.pecas) return;
    const rect = production.retanguloGrafiteDesenhado(mesh.geometry, mesh.matrixWorld);
    if (!rect) { unknown.push(mesh.name); return; }
    pieces.push({ ...rect, key: chaveDaArte(mesh.material.map, mesh.name), source: 'manual', f: mesh.name });
  });
  root.traverse((node) => {
    for (const p of node.userData.graffitiPecas || [])
      pieces.push({ ...p, key: chaveDaPecaAssada(p.f), source: 'assado', f: p.f });
  });
  return { pieces, unknown };
}
// Allowlist usa a tag da superfície física que sustenta a peça.
function foraDaAllowlist(root, pieces, tag) {
  const rc = new THREE.Raycaster(); rc.far = .4;
  const solidos = [];
  root.traverse((o) => { if (o.isMesh && !/^(decal:|mural:|poster:)/.test(o.name)) solidos.push(o); });
  const fora = [];
  for (const p of pieces) {
    const nx = Math.sin(p.ry), nz = Math.cos(p.ry), ux = Math.cos(p.ry), uz = -Math.sin(p.ry);
    let semTag = false;
    for (const su of [-.45, 0, .45]) for (const sv of [-.45, 0, .45]) {
      rc.set(new THREE.Vector3(p.x + ux * su * p.w + nx * .02, p.y + sv * p.h, p.z + uz * su * p.w + nz * .02),
        new THREE.Vector3(-nx, 0, -nz));
      const hit = rc.intersectObjects(solidos, false)[0];
      if (!hit?.object?.userData?.[tag]) semTag = true;
    }
    if (semTag) fora.push(p);
  }
  return fora;
}
/* Diagnóstico (NÃO portão): planos do mesmo arranjo da régua Ego, pra divergir
 * junto com ela. Portão é a TAG; isto só vai no relatório. */
function foraDosPlanosEgo(id, pieces) {
  const dentro = (p) => {
    const dx = Math.abs(Math.cos(p.ry)) * p.w / 2, dz = Math.abs(Math.sin(p.ry)) * p.w / 2;
    const x0 = p.x - dx, x1 = p.x + dx, z0 = p.z - dz, z1 = p.z + dz;
    if (id === 'ferro_velho') return x0 >= -12.5 && x1 <= 2.5 && z0 >= -35.5 && z1 <= -26.5;
    const outerZ = Math.abs(Math.abs(p.z) - 25) < .06 && Math.abs(Math.sin(p.ry)) < .001 && x0 >= -18 && x1 <= 18;
    const outerX = Math.abs(Math.abs(p.x) - 17) < .06 && Math.abs(Math.cos(p.ry)) < .001 && z0 >= -25.5 && z1 <= 25.5;
    const spawnZ = Math.abs(Math.abs(p.z) - 15) < .36 && Math.abs(Math.sin(p.ry)) < .001 && x0 >= -17.5 && x1 <= 17.5;
    const cruzaFaixa = (outerX || outerZ) && p.y + p.h / 2 > 2 && p.y - p.h / 2 < 2.6;
    return (outerX || outerZ || spawnZ) && !cruzaFaixa;
  };
  return pieces.filter((p) => !dentro(p)).length;
}
function medirMapa(id, build) {
  seedRandom(12345);
  const T = initTextures();
  const world = build(new THREE.Scene(), T);
  world.root.updateMatrixWorld(true);
  const { pieces, unknown } = inventariar(world.root);
  const counts = new Map();
  for (const p of pieces) counts.set(p.key, (counts.get(p.key) || 0) + 1);
  const duplicadas = [...counts].filter(([, n]) => n > 1).map(([key, n]) => ({ key, n }));
  const fora = foraDaAllowlist(world.root, pieces, TAG[id]);
  const suporte = criarSuporteGrafite(world.root);
  const semSuporte = pieces.filter((p) => !suporte(p));
  return {
    id, T, world, pieces, duplicadas, fora, semSuporte, unknown,
    relatorio: {
      id, pecas: pieces.length, artes: counts.size,
      fontes: pieces.reduce((a, p) => (a[p.source] = (a[p.source] || 0) + 1, a), {}),
      duplicadas: duplicadas.length, foraDaAllowlist: fora.length,
      semSuporte: semSuporte.length, retangulosIlegiveis: unknown.length,
      foraDosPlanosEgo: foraDosPlanosEgo(id, pieces),
    },
    ok: pieces.length > 0 && !duplicadas.length && !fora.length && !semSuporte.length && !unknown.length,
  };
}

/* ── Fixtures sintéticas: identidade do asset através das APIs reais ───────── */
function texComSrc(src) { const t = new THREE.Texture(); t.image = { src }; return t; }
const parede = (x = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(4, 4, .2), new THREE.MeshLambertMaterial());
  m.position.set(x, 2, 0); return m;
};
const raiz = (...objs) => { const g = new THREE.Group(); if (objs.length) g.add(...objs); g.updateMatrixWorld(true); return g; };
const peca = (x, w = 2, h = 2) => [0, x, 2, .13, 0, w, h];
function fixtures(api) {
  const cases = [];
  const test = (name, body) => {
    try { body(); cases.push({ name, ok: true }); }
    catch (error) { cases.push({ name, ok: false, error: error.message.split('\n')[0] }); }
  };
  const cenario = (T, manual) => {
    const root = raiz(parede(0), parede(10));
    if (manual) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(manual.w || 2, manual.h || 2),
        new THREE.MeshLambertMaterial({ map: manual.tex }));
      m.name = manual.name; m.position.set(0, 2, .13); root.add(m);
    }
    return root;
  };
  const aplica = (root, T, pecas, arquivos) =>
    api.aplicarGrafite(root, T, { arquivos: arquivos || pecas.map(() => T.decalFiles[0]), pecas });

  test('arte assada não repete a arte manual noutra parede', () => {
    const imagem = { src: 'http://grafite.local/img/decals/mesma.png' };
    const T = { decalFiles: ['mesma.png', 'outra.png'], decalAspects: [1, 1],
      decals: [texComSrc(imagem.src), texComSrc('http://grafite.local/img/decals/outra.png')], posterFiles: [], posterImgs: [], posterAspects: [] };
    const root = cenario(T, { tex: T.decals[0], name: 'decal:mesma.png' });
    const { pecas } = aplica(root, T, [peca(10), [1, 10, 2, .13, 0, 2, 2]], ['mesma.png', 'outra.png']);
    assert.equal(pecas, 1, 'a repetida da manual cai; a arte nova fica');
    assert.equal(inventariar(root).pieces.filter((p) => p.key === '/img/decals/mesma.png').length, 1);
  });
  test('poster e decal do mesmo arquivo são o MESMO asset', () => {
    const src = 'http://grafite.local/posters/gemeo.jpg';
    const T = { decalFiles: ['gemeo.jpg'], decalAspects: [1], decals: [texComSrc(src)],
      posterFiles: ['gemeo.jpg'], posterAspects: [1], posterImgs: [texComSrc(src)] };
    const root = cenario(T, { tex: T.decals[0], name: 'decal:gemeo.jpg' });
    const { pecas } = api.aplicarGrafite(root, T, { arquivos: ['poster:gemeo.jpg'], pecas: [peca(10)] });
    assert.equal(pecas, 0, 'cartaz não contorna a identidade por vir de outro pool');
  });
  test('texture.clone() conserva a identidade do asset', () => {
    const tex = texComSrc('http://grafite.local/img/decals/clone.png'), copia = tex.clone();
    const T = { decalFiles: ['clone.png'], decalAspects: [1], decals: [copia], posterFiles: [], posterImgs: [], posterAspects: [] };
    const root = cenario(T, { tex, name: 'decal:clone.png' });
    assert.equal(aplica(root, T, [peca(10)]).pecas, 0, 'clone divide a fonte e é repetição');
  });
  test('duas texturas com a mesma URL são o mesmo asset', () => {
    const url = 'http://grafite.local/img/decals/url.png';
    const T = { decalFiles: ['url.png'], decalAspects: [1], decals: [texComSrc(url)], posterFiles: [], posterImgs: [], posterAspects: [] };
    const root = cenario(T, { tex: texComSrc(url), name: 'decal:url.png' });
    assert.equal(aplica(root, T, [peca(10)]).pecas, 0);
  });
  test('mesmo asset em outra escala continua repetição', () => {
    const url = 'http://grafite.local/img/decals/escala.png';
    const T = { decalFiles: ['escala.png'], decalAspects: [1], decals: [texComSrc(url)], posterFiles: [], posterImgs: [], posterAspects: [] };
    const root = cenario(T, { tex: T.decals[0], name: 'decal:escala.png', w: 3.5, h: 3.5 });
    assert.equal(aplica(root, T, [peca(10, .8, .8)]).pecas, 0, 'escala não cria arte nova');
  });
  test('recorte (repeat/offset) não cria asset novo', () => {
    const tex = texComSrc('http://grafite.local/img/decals/recorte.png');
    tex.repeat.set(2, 2); tex.offset.set(.25, 0);
    const T = { decalFiles: ['recorte.png'], decalAspects: [1], decals: [tex], posterFiles: [], posterImgs: [], posterAspects: [] };
    const root = cenario(T, { tex, name: 'decal:recorte.png' });
    assert.equal(aplica(root, T, [peca(10)]).pecas, 0);
  });
  test('passada viva não põe a mesma arte duas vezes no mapa inteiro', () => {
    const T = { decalFiles: ['viva-a.png', 'viva-b.png'], decalAspects: [1, 1],
      decals: [texComSrc('http://grafite.local/img/decals/viva-a.png'), texComSrc('http://grafite.local/img/decals/viva-b.png')],
      posterFiles: [], posterImgs: [], posterAspects: [] };
    const uma = { ...T, decals: [T.decals[0]], decalFiles: ['viva-a.png'] };
    const cfg = (texturas) => ({
      id: '__curation__', root: raiz(parede(0), parede(10)), T: texturas,
      waypoints: [{ x: 0, z: 4 }, { x: 10, z: 4 }], seed: 7, passo: .8, alcance: 8, raios: 16,
      minLarg: .3, maxLarg: 2, exigeChao: false,
      bandas: [{ y0: .5, y1: 2.8, larg: 1, alturas: [.7], chance: 100, pool: [0], exigeChao: false }],
    });
    assert.equal(api.pintarParedes({ ...cfg(uma), T: uma }).pecas, 1, 'uma arte → uma peça, sem raio');
    assert.equal(api.pintarParedes({ ...cfg(T), bandas: [{ y0: .5, y1: 2.8, larg: 1, alturas: [.7], chance: 100, pool: [0, 1], exigeChao: false }] }).pecas,
      2, 'duas artes distintas → duas peças (a parede não é o limite)');
  });
  test('grafitar descarta a segunda cópia do layout assado', () => {
    const url = 'http://grafite.local/img/decals/assada.png';
    const T = { decalFiles: ['assada.png'], decalAspects: [1], decals: [texComSrc(url)], posterFiles: [], posterImgs: [], posterAspects: [] };
    GRAFITE['curation-fixture'] = { arquivos: ['assada.png'], pecas: [peca(0), peca(10)], murais: [] };
    const oldLive = globalThis.window?.__grafiteLive; globalThis.window.__grafiteLive = false;
    try {
      const { pass } = api.grafitar({ id: 'curation-fixture', root: raiz(parede(0), parede(10)), T, waypoints: [], bandas: [] });
      assert.equal(pass.pecas, 1, 'o mesmo arquivo duas vezes no layout vira uma peça');
    } finally {
      delete GRAFITE['curation-fixture'];
      if (oldLive === undefined) delete globalThis.window.__grafiteLive; else globalThis.window.__grafiteLive = oldLive;
    }
  });
  return cases;
}
/* Determinismo em geometria REAL: cópia do asset em parede distinta, fontes
 * manual+assada, through aplicarGrafite de verdade na piscina construída. */
function determinismoReal(api, mapa) {
  const { world, T, pieces } = mapa;
  const usadas = new Set(pieces.map((p) => p.key));
  const livres = T.decalFiles.map((f, i) => ({ f, i, key: '/img/decals/' + f })).filter((a) => !usadas.has(a.key));
  assert.ok(livres.length >= 2, 'pool precisa ter ao menos 2 artes fora do mapa');
  const [A, B] = livres;
  const manual = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshLambertMaterial({ map: T.decals[A.i] }));
  manual.name = 'decal:' + A.f; manual.position.set(16.97, 5.65, -18); manual.rotation.y = -1.571;
  world.root.add(manual);
  const r = api.aplicarGrafite(world.root, T, {
    arquivos: [A.f, B.f],
    pecas: [[0, -16.97, 5.65, -18, 1.571, 2, 2], [1, -16.97, 4.6, -18, 1.571, 2, 2]],
  });
  assert.equal(r.pecas, 1, `arte já usada pela manual cai e a distinta fica (colocadas ${r.pecas})`);
  const depois = inventariar(world.root);
  const duplicadas = depois.pieces.filter((p, i, all) => all.some((q, j) => j !== i && q.key === p.key));
  assert.equal(duplicadas.length, 0, 'manual+assado no mapa real segue sem repetição');
  world.root.remove(manual);
}

/* ── modos ─────────────────────────────────────────────────────────────────── */
function absoluteImports(text, owner, overrides = {}) {
  return text.replace(/(\bfrom\s*|\bimport\s*)(['"])([^'"\n]+)\2/g, (full, prefix, quote, specifier) => {
    const target = overrides[specifier]
      || (specifier.startsWith('.') ? new URL(specifier, owner).href : import.meta.resolve(specifier));
    return `${prefix}${JSON.stringify(target)}`;
  });
}
const dataURL = (text) => `data:text/javascript,${encodeURIComponent(text)}`;
const BASE = 'ad696fb87'; // imutável: HEAD anda com commits e carrega layout já curado
const gitBase = (path) => {
  const r = spawnSync('git', ['show', `${BASE}:${path}`], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git show ${BASE}:${path} falhou: ${String(r.stderr).slice(0, 200)}`);
  return r.stdout;
};

function rollbackLayoutPiscina(build) {
  const salvo = GRAFITE.piscina_treta, original = THREE.Object3D.prototype.traverse;
  const marcador = new Error('falha explícita durante empréstimo do layout');
  let injetada = false, recebida = null;
  THREE.Object3D.prototype.traverse = function (...args) {
    if (!injetada && GRAFITE.piscina_treta !== salvo) { injetada = true; throw marcador; }
    return original.apply(this, args);
  };
  try { build(new THREE.Scene(), initTextures()); }
  catch (error) { recebida = error; }
  finally { THREE.Object3D.prototype.traverse = original; }
  const restaurado = GRAFITE.piscina_treta === salvo;
  GRAFITE.piscina_treta = salvo;
  return { name: 'Piscina restaura layout compartilhado após exceção',
    ok: injetada && recebida === marcador && restaurado,
    injetada, excecaoOriginal: recebida === marcador, restaurado,
    error: !injetada ? 'injeção não alcançou empréstimo' : recebida !== marcador
      ? 'exceção original não atravessou' : !restaurado ? 'referência compartilhada vazou' : '' };
}

const modo = process.argv.find((a) => a.startsWith('--')) || '';
const bytesAntes = [passURL, piscinaURL, ferroURL].map((u) => sha256(readFileSync(u, 'utf8')));

if (modo === '--baseline') {
  const base = {
    pass: gitBase('public/js/graffiti_pass.js'),
    piscina: gitBase('public/js/map_piscina.js'),
    ferro: gitBase('public/js/map_ferrovelho.js'),
    layout: gitBase('public/js/graffiti_layout.js'),
  };
  assert.ok(!base.pass.includes('usadas.has'), `${BASE} não pode já ter os guardas de unicidade`);
  const passData = dataURL(absoluteImports(base.pass, passURL));
  const overrides = {
    './graffiti_pass.js': passData,
    './graffiti_layout.js': dataURL(absoluteImports(base.layout, layoutURL)),
  };
  const pool = (await import(dataURL(absoluteImports(base.piscina, piscinaURL, overrides)))).buildPoolDay;
  const ferro = (await import(dataURL(absoluteImports(base.ferro, ferroURL, overrides)))).buildFerroVelho;
  const resultados = [medirMapa('piscina_treta', pool), medirMapa('ferro_velho', ferro)];
  /* Node não carrega GLB/textura real (Lição 3): a base reproduz a DIREÇÃO do RED
   * do Ego (465/45/100 e 207/30/172), não os números — ver GRAFITE-REGUA.md. */
  for (const m of resultados) {
    console.log(JSON.stringify({ baseline: `${BASE} (#1179)`, ...m.relatorio, ok: m.ok }));
    assert.ok(!m.ok, `${m.id}: base ${BASE} tem que estar vermelha na curadoria`);
    assert.ok(m.fora.length > 0, `${m.id}: base precisa ter arte fora da allowlist (régua cega?)`);
    assert.ok(m.pieces.length > 0, `${m.id}: base tinha arte — sumir aqui é a régua quebrada`);
  }
  assert.ok(resultados.some((m) => m.duplicadas.length > 0),
    'a dimensão de repetição precisa morder na base em ao menos um mapa');
  console.log(JSON.stringify({ baseline: 'RED confirmado nos dois mapas', revisao: BASE, saida: 0 }));
} else {
  const api = production;
  const fixturesCases = fixtures(api);
  fixturesCases.push(rollbackLayoutPiscina((s, T) => MAPS.piscina_treta.build(s, T)));
  const mapaPiscina = medirMapa('piscina_treta', (s, T) => MAPS.piscina_treta.build(s, T));
  const mapaFerro = medirMapa('ferro_velho', (s, T) => MAPS.ferro_velho.build(s, T));
  let determinismo = { name: 'determinismo manual×assado na piscina real', ok: true, error: '' };
  try { determinismoReal(api, mapaPiscina); }
  catch (error) { determinismo = { ...determinismo, ok: false, error: error.message.split('\n')[0] }; }
  for (const m of [mapaPiscina, mapaFerro]) console.log(JSON.stringify(m.relatorio));
  const falhas = [...fixturesCases.filter((c) => !c.ok), ...(!determinismo.ok ? [determinismo] : []),
    ...(!mapaPiscina.ok ? [{ name: 'piscina_treta: curadoria', ...mapaPiscina.relatorio, ok: false }] : []),
    ...(!mapaFerro.ok ? [{ name: 'ferro_velho: curadoria', ...mapaFerro.relatorio, ok: false }] : [])];
  if (falhas.length) { process.exitCode = 1; for (const f of falhas) console.error(`FAIL ${f.name}: ${f.error || 'ver relatório acima'}`); }
  console.log(JSON.stringify({ gate: 'graffiti-curation', fixtures: fixturesCases.length,
    passaram: fixturesCases.filter((c) => c.ok).length + (determinismo.ok ? 1 : 0) + (mapaPiscina.ok ? 1 : 0) + (mapaFerro.ok ? 1 : 0),
    total: fixturesCases.length + 3 }));

  if (modo === '--self-test') {
    const passSource = readFileSync(passURL, 'utf8');
    const piscinaSource = readFileSync(piscinaURL, 'utf8');
    /* M1 — mutação factual: os guardas usadas.has de produção desligados. */
    const guardas = passSource.split('usadas.has(').length - 1;
    assert.ok(guardas > 0, 'M1 NÃO APLICOU: graffiti_pass sem guardas usadas.has');
    const m1Source = passSource.replaceAll('usadas.has(', '(()=>false)(');
    assert.ok(!m1Source.includes('usadas.has(') && m1Source !== passSource, 'M1 NÃO APLICOU: substituição não casou');
    const m1Pass = dataURL(absoluteImports(m1Source, passURL));
    const m1API = await import(m1Pass);
    const m1Pool = (await import(dataURL(absoluteImports(piscinaSource, piscinaURL, { './graffiti_pass.js': m1Pass })))).buildPoolDay;
    const m1Piscina = medirMapa('piscina_treta', m1Pool);
    const m1Fixtures = fixtures(m1API);
    for (const c of m1Fixtures) assert.ok(!c.ok, `M1 tem que quebrar a MESMA expectativa: ${c.name}`);
    let m1Det = true;
    try { determinismoReal(m1API, m1Piscina); m1Det = false; } catch { /* esperado */ }
    assert.ok(m1Det, 'M1 tem que quebrar o determinismo manual×assado no mapa real');
    assert.ok(m1Piscina.duplicadas.length > 0, 'M1 tem que reintroduzir repetição na piscina real');
    console.log(JSON.stringify({ mutante: 'M1 usadas.has desligado', duplicadasReais: m1Piscina.duplicadas.length,
      exemplos: m1Piscina.duplicadas.slice(0, 3), fixturesQuebradas: m1Fixtures.filter((c) => !c.ok).length }));
    /* M2 — allowlist do mapa desligada: arte em parede não permitida volta. */
    const traverse = '  root.traverse(mesh => {\n    if (mesh.isMesh && !mesh.userData.graffitiWhiteWall) mesh.userData.graffitiSupportExcluded = true;\n  });\n';
    assert.ok(piscinaSource.includes(traverse), 'M2 NÃO APLICOU: traverse de allowlist não encontrado');
    const m2Pool = (await import(dataURL(absoluteImports(piscinaSource.replace(traverse, ''), piscinaURL)))).buildPoolDay;
    const m2 = medirMapa('piscina_treta', m2Pool);
    assert.ok(m2.fora.length > 0, 'M2 tem que deixar arte fora da allowlist');
    assert.ok(m2.pieces.length > 0, 'M2 sem arte não prova nada');
    console.log(JSON.stringify({ mutante: 'M2 allowlist do mapa desligada', pecas: m2.pieces.length, fora: m2.fora.length }));
    const restauracao = '  } finally {\n    GRAFITE.piscina_treta = graffitiLayoutSalvo;\n  }';
    assert.equal(piscinaSource.split(restauracao).length - 1, 1, 'M3 NÃO APLICOU: restauração única não encontrada');
    const m3Pool = (await import(dataURL(absoluteImports(piscinaSource.replace(restauracao, '  } finally {}'), piscinaURL)))).buildPoolDay;
    const m3 = rollbackLayoutPiscina(m3Pool);
    assert.ok(m3.injetada && m3.excecaoOriginal && !m3.restaurado && !m3.ok,
      'M3 deve vazar a referência após a mesma exceção real');
    console.log(JSON.stringify({ mutante: 'M3 restauração do layout desligada', ...m3 }));
    const bytesDepois = [passURL, piscinaURL, ferroURL].map((u) => sha256(readFileSync(u, 'utf8')));
    assert.deepEqual(bytesDepois, bytesAntes, 'mutação vazou para o repositório');
    console.log(JSON.stringify({ selfTest: 'passed', mutacoes: ['M1 usadas.has', 'M2 allowlist mapa', 'M3 restauração layout'], repoIntacto: true }));
  }
}
