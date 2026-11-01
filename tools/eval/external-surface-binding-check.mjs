// Fallback, clones anteriores ao load e derivados: docs/visual-consistency/ACABAMENTO-MAPAS.md.
import { readFileSync } from 'node:fs';
import * as THREE from '../../public/vendor/three.module.js';
const files = ['map_campomorro.js', 'map_escadao.js'];
const extract = source => {
  const body = source.match(/const external = (\(mat, url, rx, ry\) => \{[\s\S]*?\n    \});/)?.[1];
  if (!body) throw Error('callback external não localizado');
  return body;
};
const extractRepetido = source => source.match(/const repetido = (\(base, rx, ry\) => \{[\s\S]*?\n  \});/)?.[1] || null;

function measure(body, { details, detalhe = null, roughness = .9, metalness = 0 } = {}) {
  const callbacks = [], tex = new THREE.Texture(), fallback = new THREE.Texture();
  const oldNormal = new THREE.Texture(), oldRough = new THREE.Texture();
  const loader = { load(_url, onLoad) { callbacks.push(onLoad); return tex; } };
  const external = new Function('loader', 'detailFor', 'THREE', `return (${body})`)(loader, () => details, THREE);
  const mat = new THREE.MeshStandardMaterial({ map: fallback, normalMap: oldNormal, roughnessMap: oldRough, roughness, metalness });
  if (detalhe) mat.userData.detalhe = detalhe;
  external(mat, '/img/textures/probe.webp', 4, 3);
  const fallbackHeld = mat.map === fallback && mat.normalMap === oldNormal && mat.roughnessMap === oldRough;
  if (callbacks.length !== 1) throw Error('callback ausente ou duplicado');
  callbacks[0]();
  const ef = detalhe || details;
  return {
    fallbackHeld, albedo: mat.map === tex,
    normal: mat.normalMap === (ef?.normalMap || null),
    roughness: mat.roughnessMap === (ef?.roughnessMap || null),
    mineralScale: !ef?.normalMap || roughness < .8 || metalness >= .2 || mat.normalScale.toArray().every(v => v === .4),
    sampler: tex.repeat.equals(new THREE.Vector2(4, 3)) && tex.colorSpace === THREE.SRGBColorSpace && tex.wrapS === THREE.RepeatWrapping && tex.wrapT === THREE.RepeatWrapping,
    upload: mat.version > 0,
  };
}

// Clone + detalhe explícito no mesmo fluxo do mapa: repetido(mat, 20, 3) ANTES do external.
function measureClone(body, repetidoBody, { details = null, detalhe = null } = {}) {
  const callbacks = [], tex = new THREE.Texture(), fallback = new THREE.Texture();
  const oldNormal = new THREE.Texture(), oldRough = new THREE.Texture();
  const loader = { load(_url, onLoad) { callbacks.push(onLoad); return tex; } };
  const external = new Function('loader', 'detailFor', 'THREE', `return (${body})`)(loader, () => details, THREE);
  const lamLocal = opts => new THREE.MeshStandardMaterial({ roughness: .94, metalness: 0, ...opts });
  const repetido = new Function('lam', 'THREE', `return (${repetidoBody})`)(lamLocal, THREE);
  const mat = new THREE.MeshStandardMaterial({ map: fallback, normalMap: oldNormal, roughnessMap: oldRough, roughness: .94, metalness: 0 });
  if (detalhe) mat.userData.detalhe = detalhe;
  const muralha = repetido(mat, 20, 3);
  const mapaAntes = muralha.map;
  external(mat, '/img/textures/probe.webp', 4, 3);
  if (callbacks.length !== 1) throw Error('callback ausente ou duplicado');
  const fallbackAteCarregar = mat.map === fallback && muralha.map === mapaAntes;
  callbacks[0]();
  const ef = detalhe || details || {};
  const par = (d, ref) => !ref ? d === null
    : !!d && d !== ref && d.source === ref.source && d.repeat.equals(muralha.map.repeat) && d.offset.equals(muralha.map.offset);
  return {
    fallbackAteCarregar,
    detalheSobrevive: !detalhe || (mat.normalMap === detalhe.normalMap && mat.roughnessMap === detalhe.roughnessMap),
    cloneMapaFinal: muralha.map !== mapaAntes && muralha.map !== tex && muralha.map.source === tex.source,
    cloneSampler: muralha.map.repeat.equals(new THREE.Vector2(20, 3)) && muralha.map.wrapS === THREE.RepeatWrapping && muralha.map.wrapT === THREE.RepeatWrapping,
    cloneDerivados: par(muralha.normalMap, ef.normalMap) && par(muralha.roughnessMap, ef.roughnessMap),
    cloneUpload: muralha.version > 0,
  };
}

function check(body, repetidoBody) {
  const variants = [null, { normalMap: new THREE.Texture(), roughnessMap: new THREE.Texture() }, { normalMap: null, roughnessMap: new THREE.Texture() }];
  const cases = variants.map(details => measure(body, { details }));
  if (!repetidoBody) return { cases, clones: null };
  const clones = [
    measureClone(body, repetidoBody, { detalhe: { normalMap: new THREE.Texture(), roughnessMap: new THREE.Texture() } }),
    measureClone(body, repetidoBody, { details: { normalMap: new THREE.Texture(), roughnessMap: new THREE.Texture() } }),
  ];
  return { cases, clones };
}
const green = cases => cases.every(row => Object.values(row).every(Boolean));
// Mutante só por alvo único: 0 ou >1 ocorrência é régua cega, não mutante.
const replaceOnce = (body, alvo, novo, mutante) => {
  const n = typeof alvo === 'string'
    ? body.split(alvo).length - 1
    : body.match(new RegExp(alvo.source, 'g'))?.length ?? 0;
  if (n !== 1) throw Error(`alvo do mutante ${mutante}: ${n} ocorrência(s) — régua cega`);
  return body.replace(alvo, novo);
};
const redClauses = rows => rows.flatMap(r => Object.entries(r).filter(([, v]) => !v).map(([k]) => k));

let failed = false;
for (const file of files) {
  const source = readFileSync(new URL(`../../public/js/${file}`, import.meta.url), 'utf8');
  const body = extract(source), repetidoBody = extractRepetido(source);
  const { cases, clones } = check(body, repetidoBody);
  const rows = clones ? [...cases, ...clones] : cases;
  const pass = green(rows);
  console.log(JSON.stringify({ file, pass, cases, clones }));
  failed ||= !pass;
  if (process.argv.includes('--self-test') && pass) {
    const mutantes = {
      staleNormal: replaceOnce(body, /mat\.normalMap = [^;]+;/, 'mat.normalMap = mat.normalMap;', 'staleNormal'),
      staleRoughness: replaceOnce(body, /mat\.roughnessMap = [^;]+;/, 'mat.roughnessMap = mat.roughnessMap;', 'staleRoughness'),
      swapBeforeLoad: replaceOnce(body, 'const tex = loader.load(url, () => {', 'mat.map = null; const tex = loader.load(url, () => {', 'swapBeforeLoad'),
      mineralScale: replaceOnce(body, /mat\.normalScale\.set\([^;]+\);/, 'mat.normalScale.set(.65, .65);', 'mineralScale'),
      missingUpload: replaceOnce(body, 'mat.needsUpdate = true;', '', 'missingUpload'),
      detalhePisado: body.includes('mat.userData.detalhe ||') ? replaceOnce(body, 'mat.userData.detalhe || detailFor(tex)', 'detailFor(tex)', 'detalhePisado') : null,
      cloneFicaNoFallback: repetidoBody && body.includes('c.map = tex.clone();') ? replaceOnce(body, 'c.map = tex.clone();', 'c.map = c.map;', 'cloneFicaNoFallback') : null,
      cloneSamplerDaBase: repetidoBody && body.includes('c.map.repeat.copy(c.userData.baseRepeat);') ? replaceOnce(body, 'c.map.repeat.copy(c.userData.baseRepeat);', 'c.map.repeat.copy(tex.repeat);', 'cloneSamplerDaBase') : null,
      cloneDerivadoStale: repetidoBody && body.includes('c.normalMap = cd.normalMap || null;') ? replaceOnce(body, 'c.normalMap = cd.normalMap || null;', 'c.normalMap = c.normalMap;', 'cloneDerivadoStale') : null,
    };
    for (const [name, mutado] of Object.entries(mutantes)) {
      if (mutado === null) continue;
      const r = check(mutado, repetidoBody);
      const rowsM = r.clones ? [...r.cases, ...r.clones] : r.cases;
      if (green(rowsM)) throw Error(`${file}: mutante cego ${name}`);
      console.log(`${file}: mutante ${name} RED <- ${[...new Set(redClauses(rowsM))].join(',')}`);
    }
  }
}

/* Ferro: tijoloBaianoTex — o 404 tem que alcançar o material REAL clonado pelo
   aoMatFactory (é o que a casa desenha), executando o callback exato entregue ao loader.
   Loader que engole/ignora onError é proibido: sem callback entregue = NAOAPLICOU. */
{
  const source = readFileSync(new URL('../../public/js/map_ferrovelho.js', import.meta.url), 'utf8');
  const body = source.match(/^function tijoloBaianoTex\(mat\) \{[\s\S]*?\n\}/m)?.[0];
  const { bootGame, initTextures } = await import('./harness.mjs');   // também planta o shim 'three'
  const { aoMatFactory } = await import('../../public/js/vao.js');
  const SRGB = THREE.SRGBColorSpace, CHAPA = 0xc18b71;

  // unidade: body real (ou mutado) + clone REAL pelo aoMatFactory, registrado como o addBox faz
  const makeUnit = (src) => {
    const errs = new Map(), texs = [];
    class Loader { load(url, _l, _p, onErr) { errs.set(url, onErr); const t = new THREE.Texture(); texs.push(t); return t; } }
    const fake = Object.assign(Object.create(null), THREE, { TextureLoader: Loader });
    const mat = new THREE.MeshStandardMaterial({ color: CHAPA, roughness: .95, metalness: 0, normalScale: new THREE.Vector2(.65, .65) });
    new Function('THREE', 'mat', `${src}\ntijoloBaianoTex(mat);`)(fake, mat);
    const drawn = aoMatFactory()(mat);
    if (mat.userData.tijoloDeps instanceof Set) mat.userData.tijoloDeps.add(drawn);   // idem addBox
    new THREE.Mesh(new THREE.BoxGeometry(3, 3, .5), drawn);
    return { errs, texs, mat, drawn };
  };
  const extrai = (unit, frag) => {
    const hits = [...unit.errs.entries()].filter(([u]) => u.includes(frag));
    if (hits.length !== 1 || typeof hits[0][1] !== 'function')
      throw Error(`NAOAPLICOU: onError do tijolo (${frag}) não entregue ao loader`);
    return hits[0][1];
  };

  // UMA aceitação para baseline e mutante: clone desenhou textura, 404 limpa clone+original,
  // slot são, cor chapada preservada, needsUpdate sobe no material desenhado
  const aceitacao = (u) => {
    const onA = extrai(u, '_color.webp'), onN = extrai(u, '_normal.webp');
    const hex = (m) => m.color.getHex(SRGB);
    const antes = u.drawn !== u.mat && u.drawn.vertexColors === true
      && u.mat.map === u.texs[0] && u.drawn.map === u.texs[0]
      && u.mat.normalMap === u.texs[1] && u.drawn.normalMap === u.texs[1] && hex(u.drawn) === CHAPA
      && u.texs[0].colorSpace === SRGB && u.texs[1].colorSpace === THREE.NoColorSpace
      && u.texs.every((t) => t.wrapS === THREE.RepeatWrapping && t.anisotropy === 4);
    const v0 = u.drawn.version;
    onA();
    const cor404 = u.drawn.map === null && u.mat.map === null && u.drawn.normalMap === u.texs[1]
      && hex(u.drawn) === CHAPA && u.drawn.version > v0;
    onN();
    const normal404 = u.drawn.normalMap === null && u.mat.normalMap === null && u.drawn.map === null;
    return { antes, cor404, normal404 };
  };

  // build real: buildFerroVelho de verdade, loaders do produto capturados, parede por parede
  const buildReal = () => {
    const textures = initTextures();                    // fora do patch: só o load do BUILD é capturado
    const cap = new Map();
    const realLoad = THREE.TextureLoader.prototype.load;
    THREE.TextureLoader.prototype.load = function (url, onLoad, onProgress, onError) {
      const t = new THREE.Texture(); cap.set(url, { onError, tex: t }); return t;
    };
    try {
      const game = bootGame('ferro_velho', { textures, bots: 0 });
      const paredes = [];
      game.scene.traverse((o) => { if (o.isMesh && o.userData.graffitiRespawnB) paredes.push(o); });
      const cego = { paredes: paredes.length, casos: { antes: false, cor404: false, normal404: false } };
      if (!paredes.length) return cego;
      const [a, n] = ['_color.webp', '_normal.webp'].map((f) => [...cap.entries()].filter(([u]) => u.includes(f)));
      if (a.length !== 1 || n.length !== 1 || typeof a[0][1].onError !== 'function')
        throw Error('NAOAPLICOU: build real não entregou o onError do tijolo ao loader');
      const drawn = paredes[0].material, u = { mat: drawn, drawn, texs: [a[0][1].tex, n[0][1].tex], real: true };
      const v0 = drawn.version, hex = () => drawn.color.getHex(SRGB);
      const antes = paredes.length === 4 && drawn.vertexColors === true
        && paredes.every((p) => p.material === drawn) && drawn.map === u.texs[0] && drawn.normalMap === u.texs[1];
      a[0][1].onError();
      const cor404 = drawn.map === null && drawn.normalMap === u.texs[1] && hex() === CHAPA
        && drawn.version > v0 && paredes.every((p) => p.material.map === null);
      n[0][1].onError();
      const normal404 = drawn.normalMap === null && paredes.every((p) => p.material.normalMap === null);
      return { paredes: paredes.length, casos: { antes, cor404, normal404 } };
    } finally { THREE.TextureLoader.prototype.load = realLoad; }
  };

  const rows = aceitacao(makeUnit(body));
  const real = buildReal();
  const pass = Object.values(rows).every(Boolean) && Object.values(real.casos).every(Boolean);
  console.log(JSON.stringify({ file: 'map_ferrovelho.js', pass, casos: rows, buildReal: real }));
  failed ||= !pass;

  if (process.argv.includes('--self-test') && pass) {
    const mutantes = {
      // callback existe mas não limpa: loader captura o no-op REAL e o executa — RED pela cláusula
      tijoloSemFallback: replaceOnce(body, '() => { for (const m of deps) { m[slot] = null; m.needsUpdate = true; } }', '() => {}', 'tijoloSemFallback'),
      // defeito P2-1: limpa só o original, clone desenhado continua com sampler morto
      tijoloSemPropagar: replaceOnce(body, 'for (const m of deps) { m[slot] = null; m.needsUpdate = true; }', 'mat[slot] = null; mat.needsUpdate = true;', 'tijoloSemPropagar'),
      // sem 4º argumento: o loader não recebe callback — o runner ABORTA, nunca fabrica RED
      tijoloSemOnErr: replaceOnce(body, `.load(\`/img/textures/\${arq}\`, undefined, undefined,`, '.load(`/img/textures/${arq}`, undefined,', 'tijoloSemOnErr'),
    };
    for (const [name, mutado] of Object.entries(mutantes)) {
      if (name === 'tijoloSemOnErr') {
        try { aceitacao(makeUnit(mutado)); throw Error('mutante cego: tijoloSemOnErr rodou sem onError e não abortou'); }
        catch (e) { if (!/NAOAPLICOU/.test(e.message)) throw e; console.log(`map_ferrovelho.js: mutante ${name} NAOAPLICOU (abort honesto) <- sem onError entregue`); }
        continue;
      }
      const r = aceitacao(makeUnit(mutado));
      if (Object.values(r).every(Boolean)) throw Error(`map_ferrovelho.js: mutante cego ${name}`);
      console.log(`map_ferrovelho.js: mutante ${name} RED <- ${redClauses([r]).join(',')}`);
    }
  }
}

process.exitCode = failed ? 1 : 0;
