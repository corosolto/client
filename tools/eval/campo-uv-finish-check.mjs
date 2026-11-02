/* campo-uv-finish-check.mjs — régua UV do acabamento Campo (CU-1..7) + fachadas piloto (CU-8).
   Contrato completo, procedência e mutações: docs/visual-consistency/CAMPO-UV-FINISH.md */
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadFixture, expectedForProfile, MATCH_TOLERANCE } from './campo-fachadas-reference.mjs';

const MUTANTES = ['guardrepeat20x3', 'removerguardUV', 'guardperiod2m', 'removerfimUV', 'removerlock',
  'uv-rank1', 'face-ausente', 'repeat-nao-finito', 'inventario-compensado',
  'fim-compensado', 'std-compensado', 'fim-oculto', 'std-oculto', 'fim-ancestral-oculto',
  'fim-face-duplicada', 'std-face-duplicada', 'fim-translado', 'folha-f7-metal',
  'std-drawrange', 'std-grupo-oculto', 'fim-alpha-test', 'fim-alpha-blend',
  'fim-raster-blend-zero', 'fim-raster-depth-never',
  'fim-position-itemsize1', 'fim-normal-itemsize1', 'fim-uv-itemsize1', 'fim-index-itemsize2',
  'std-position-itemsize1', 'std-normal-itemsize1', 'std-uv-itemsize1', 'std-index-itemsize2'];
const USO = 'uso: campo-uv-finish-check.mjs [--self-test-raster | [--perfil=original|r22|r23|0|1|2] '
  + '[--query=0|1|2|default] [--mutar=<nome>] [--fonte=<dir readonly>]]\n'
  + `--self-test-raster é modo único (não combinável)\nmutantes: ${MUTANTES.join('|')}`;

// Estado aprovado: original7ca2 + vendor a47c Material:9129–9187/MeshStandardMaterial:40616.
// Literais ativos/dormentes do desenho CAMPO-RASTERSTATE-DESIGN-R48.md; não derivar da candidata.
const RASTER = Object.freeze([
  ['visible', 'bool', true], ['side', 'num', 0], ['colorWrite', 'bool', true],
  ['depthTest', 'bool', true], ['depthWrite', 'bool', true], ['depthFunc', 'num', 3],
  ['blending', 'num', 1], ['premultipliedAlpha', 'bool', false], ['opacity', 'num', 1],
  ['transparent', 'bool', false], ['alphaTest', 'num', 0], ['alphaHash', 'bool', false],
  ['alphaToCoverage', 'bool', false], ['wireframe', 'bool', false], ['vertexColors', 'bool', false],
  ['clippingPlanes', 'null', null], ['stencilWrite', 'bool', false], ['polygonOffset', 'bool', false],
  ['blendSrc', 'num', 204], ['blendDst', 'num', 205], ['blendEquation', 'num', 100],
  ['blendSrcAlpha', 'null', null], ['blendDstAlpha', 'null', null], ['blendEquationAlpha', 'null', null],
  ['blendColor', 'color', 0], ['blendAlpha', 'num', 0], ['stencilWriteMask', 'num', 255],
  ['stencilFunc', 'num', 519], ['stencilRef', 'num', 0], ['stencilFuncMask', 'num', 255],
  ['stencilFail', 'num', 7680], ['stencilZFail', 'num', 7680], ['stencilZPass', 'num', 7680],
  ['polygonOffsetFactor', 'num', 0], ['polygonOffsetUnits', 'num', 0], ['clipIntersection', 'bool', false],
]);

// Color do vendor e canais lineares exatos evitam aceitar coerção ou getHex quantizado.
function pinsRaster(m, Color) {
  if (!m || typeof m !== 'object') return ['material ausente/não-objeto'];
  const errs = [];
  for (const [k, tipo, alvo] of RASTER) {
    const v = m[k];
    if (tipo === 'color') {
      if (!(v instanceof Color)) { errs.push(`${k} não é Color do vendor (${String(v)})`); continue; }
      for (const ch of ['r', 'g', 'b'])
        if (typeof v[ch] !== 'number' || !Number.isFinite(v[ch]) || v[ch] !== 0)
          errs.push(`${k}.${ch}=${String(v[ch])} ≠ 0 (linear, sem quantização)`);
    } else if (tipo === 'null') {
      if (v !== null) errs.push(`${k}=${String(v)} ≠ null`);
    } else if (tipo === 'bool') {
      if (typeof v !== 'boolean' || v !== alvo) errs.push(`${k}=${String(v)} ≠ ${alvo}`);
    } else if (typeof v !== 'number' || !Number.isFinite(v) || v !== alvo) {
      errs.push(`${k}=${String(v)} ≠ ${alvo}`);
    }
  }
  return errs;
}

// ----- CLI: tudo validado e SIM_QS configurado ANTES de qualquer import dinâmico -----
const args = process.argv.slice(2);
// --self-test-raster: modo único; combinação/duplicado/=? saem 2 antes de qualquer outra coisa.
const SELF_RASTER = args.includes('--self-test-raster');
if (SELF_RASTER && args.length !== 1) { console.error(`--self-test-raster é modo único\n${USO}`); process.exit(2); }
const vistos = new Set();
let MUTANTE = null, FONTE = null, PERFIL_VAL = null, QUERY_VAL = null;
for (const a of args) {
  if (a === '--self-test-raster') continue;
  const nome = a.startsWith('--') && a.includes('=') ? a.slice(0, a.indexOf('=')) : a;
  if (nome !== '--mutar' && nome !== '--fonte' && nome !== '--perfil' && nome !== '--query') {
    console.error(`argumento desconhecido: ${a}\n${USO}`); process.exit(2);
  }
  if (vistos.has(nome)) { console.error(`argumento duplicado: ${a}\n${USO}`); process.exit(2); }
  const val = a.includes('=') ? a.slice(a.indexOf('=') + 1) : '';
  if (!val) { console.error(`valor ausente: ${a}\n${USO}`); process.exit(2); }
  if (nome === '--mutar') MUTANTE = val;
  else if (nome === '--fonte') FONTE = val;
  else if (nome === '--perfil') PERFIL_VAL = val;
  else QUERY_VAL = val;
  vistos.add(nome);
}
if (MUTANTE && !MUTANTES.includes(MUTANTE)) { console.error(`mutante desconhecido: ${MUTANTE}\n${USO}`); process.exit(2); }

const NOME_PERFIL = { original: 'original', r22: 'r22', r23: 'r23', 0: 'original', 1: 'r22', 2: 'r23' };
if (PERFIL_VAL && !Object.hasOwn(NOME_PERFIL, PERFIL_VAL)) { console.error(`perfil desconhecido: ${PERFIL_VAL}\n${USO}`); process.exit(2); }
if (QUERY_VAL && !['0', '1', '2', 'default'].includes(QUERY_VAL)) { console.error(`query desconhecida: ${QUERY_VAL}\n${USO}`); process.exit(2); }
const NUM_PERFIL = { original: 0, r22: 1, r23: 2 };
let PERFIL_NOME = PERFIL_VAL ? NOME_PERFIL[PERFIL_VAL] : null;
let QUERY_LABEL;
if (PERFIL_NOME && QUERY_VAL) {
  // default só é compatível com R23; numérica tem de casar com o perfil.
  if (QUERY_VAL === 'default' ? PERFIL_NOME !== 'r23' : QUERY_VAL !== String(NUM_PERFIL[PERFIL_NOME])) {
    console.error(`query ${QUERY_VAL} incompatível com perfil ${PERFIL_NOME}\n${USO}`); process.exit(2);
  }
  QUERY_LABEL = QUERY_VAL;
} else if (PERFIL_NOME) {
  QUERY_LABEL = String(NUM_PERFIL[PERFIL_NOME]);
} else if (QUERY_VAL) {
  if (QUERY_VAL === '0' || QUERY_VAL === '1') { console.error(`query ${QUERY_VAL} exige --perfil explícito\n${USO}`); process.exit(2); }
  PERFIL_NOME = 'r23'; QUERY_LABEL = QUERY_VAL;
} else {
  PERFIL_NOME = 'r23'; QUERY_LABEL = 'default';
}
const PERFIL_NUM = NUM_PERFIL[PERFIL_NOME];

// ----- --self-test-raster: table-driven do PRÓPRIO comparador, antes de fixture/harness/SIM_QS -----
if (SELF_RASTER) {
  let Color;
  try { ({ Color } = await import(new URL('../../public/vendor/three.module.js', import.meta.url).href)); }
  catch (e) { console.error('infraestrutura: import do vendor — ' + String(e?.message || e)); process.exit(3); }
  const base = () => {
    const o = { blendColor: new Color(0, 0, 0) };
    for (const [k, tipo, alvo] of RASTER) if (tipo !== 'color') o[k] = tipo === 'null' ? null : alvo;
    return o;
  };
  let ok = true, total = 0;
  const confere = (rot, deveFalhar, falhas) => {
    total++;
    const bom = deveFalhar ? falhas.length > 0 : falhas.length === 0;
    if (!bom) { ok = false; console.error(`controle ${rot}: esperava ${deveFalhar ? 'FAIL' : 'PASS'} — [${falhas.join(' | ')}]`); }
  };
  confere('nominal-literal', false, pinsRaster(base(), Color));
  for (const [k, tipo, alvo] of RASTER) {
    const errado = base();
    if (tipo === 'color') errado.blendColor = new Color(1, 0, 0);
    else if (tipo === 'null') errado[k] = 0;
    else errado[k] = tipo === 'bool' ? !alvo : alvo + 1;
    confere(`${k}:valor-errado`, true, pinsRaster(errado, Color));
    const ausente = base(); delete ausente[k];
    confere(`${k}:ausente`, true, pinsRaster(ausente, Color));
    if (tipo === 'num') {
      const coerc = base(); coerc[k] = String(alvo);
      confere(`${k}:string-coercivel`, true, pinsRaster(coerc, Color));
      const nan = base(); nan[k] = NaN;
      confere(`${k}:nan`, true, pinsRaster(nan, Color));
    } else if (tipo === 'bool') {
      const coerc = base(); coerc[k] = alvo ? 1 : 0;
      confere(`${k}:numero-coercivel`, true, pinsRaster(coerc, Color));
    }
  }
  const plain = base(); plain.blendColor = { r: 0, g: 0, b: 0 };
  confere('blendColor:plain-object', true, pinsRaster(plain, Color));
  const nulo = base(); nulo.blendColor = null;
  confere('blendColor:null', true, pinsRaster(nulo, Color));
  for (const ch of ['r', 'g', 'b']) for (const v of [1, undefined, '0', NaN, Infinity, 1e-9]) {
    const canal = base(); canal.blendColor[ch] = v;
    confere(`blendColor.${ch}:${String(v)}`, true, pinsRaster(canal, Color));
  }
  console.log(`CAMPO-RASTER-SELF ${ok ? 'OK' : 'FALHA'} · ${total} controles do comparador de 36 pins (literal aprovado + Color do vendor, sem fixture/harness)`);
  process.exit(ok ? 0 : 1);
}

// SIM_QS: o checker é dono de campoFachadas; resto dos params do ambiente é preservado.
{
  const qs = new URLSearchParams(process.env.SIM_QS ?? '');
  const pre = qs.getAll('campoFachadas');
  if (pre.length) { console.error(`SIM_QS já carrega campoFachadas (${pre.join(',')}) — dup/inválido/conflitante\n${USO}`); process.exit(2); }
  if (QUERY_LABEL !== 'default') qs.set('campoFachadas', QUERY_LABEL);
  process.env.SIM_QS = qs.toString();
}

// ----- Esperado do fixture lacrado ANTES do harness: falha aqui é infra, nunca mutante -----
let esperado;
try {
  esperado = expectedForProfile(loadFixture(), PERFIL_NUM);
} catch (e) {
  console.error(`infraestrutura: fixture/esperado — ${String(e?.message || e)}`);
  process.exit(3);
}
const FIM_TRIS = { original: 2424, r22: 2688, r23: 2688 }[PERFIL_NOME];

// Tiles/m; Float32 nominal fica a menos de 1e-5 do período métrico.
const GUARD_TILE = 4, FIM_TILE = 2, TOL = 1e-5;

let THREE, initTextures, seedRandom;
try { ({ THREE, initTextures, seedRandom } = await import('./harness.mjs')); }
catch (e) { console.error('infraestrutura: import do harness — ' + String(e?.message || e)); process.exit(3); }
if (typeof initTextures !== 'function' || typeof seedRandom !== 'function')
  process.exit(console.error('infraestrutura: harness não expõe initTextures/seedRandom') || 3);

async function sobe() {
  seedRandom(7717);   // mesma semente da fase 1: hash estrutural comparável entre processos
  const mod = FONTE
    ? await import(pathToFileURL(`${FONTE}/map_campomorro.js`).href)
    : await import(new URL('../../public/js/map_campomorro.js', import.meta.url).href);
  const T = await initTextures();
  const scene = new THREE.Scene();
  const W = mod.buildCampoMorro(scene, T);
  if (!W?.root || !Array.isArray(W?.colliders)) throw new Error('build devolveu mundo sem root/colliders');
  W.root.updateMatrixWorld(true);
  return W;
}

const guardsDe = (W) => {
  const gs = [];
  W.root.traverse((o) => { if (o.userData?.guardaBorda) gs.push(o); });
  return gs;
};
const fimDe = (W) => {
  const fs = [];
  W.root.traverse((o) => { if (o.userData?.favelaFinish === 'campo') fs.push(o); });
  return fs;
};

// Triângulos efetivamente desenhados, incluindo drawRange e materiais por grupo.
const triangulos = (mesh) => {
  const g = mesh.geometry, total = g.index?.count ?? g.attributes.position.count;
  const inicio = Math.max(0, g.drawRange.start), fim = Math.min(total, inicio + g.drawRange.count);
  const ranges = Array.isArray(mesh.material) ? g.groups.filter(v => mesh.material[v.materialIndex]?.visible !== false) : [{start: 0, count: total}];
  const out = [];
  if (!Array.isArray(mesh.material) && mesh.material.visible === false) return out;
  for (const r of ranges) for (let t = Math.max(inicio, r.start); t + 2 < Math.min(fim, r.start + r.count); t += 3)
    out.push([0, 1, 2].map(k => g.index ? g.index.getX(t + k) : t + k));
  return out;
};

// SVD do Jacobiano UV numa base tangente ortonormal; detecta colapso e cisalhamento.
const singulares = (mesh) => {
  const g = mesh.geometry, uv = g.attributes.uv, pos = g.attributes.position, res = [];
  for (const ids of triangulos(mesh)) {
    const p = ids.map(i => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
    const a = p[1].clone().sub(p[0]), b = p[2].clone().sub(p[0]), l1 = a.length();
    const x2 = b.dot(a) / l1, y2 = Math.sqrt(Math.max(0, b.lengthSq() - x2 * x2));
    const du1 = uv.getX(ids[1]) - uv.getX(ids[0]), dv1 = uv.getY(ids[1]) - uv.getY(ids[0]);
    const du2 = uv.getX(ids[2]) - uv.getX(ids[0]), dv2 = uv.getY(ids[2]) - uv.getY(ids[0]);
    if (![l1,y2,du1,dv1,du2,dv2].every(Number.isFinite) || l1 < 1e-9 || y2 < 1e-9) { res.push(null); continue; }
    const j00 = du1/l1, j10 = dv1/l1, j01 = (du2-j00*x2)/y2, j11 = (dv2-j10*x2)/y2;
    const A = j00*j00+j01*j01, B = j00*j10+j01*j11, C = j10*j10+j11*j11;
    const delta = Math.hypot(A-C, 2*B);
    res.push([Math.sqrt(Math.max(0,(A+C+delta)/2)), Math.sqrt(Math.max(0,(A+C-delta)/2))]);
  }
  return res;
};

const q = (v) => Math.round(v * 1e4) / 1e4;

const medeGuards = (W) => {
  const guards = guardsDe(W);
  const facesPorMesh = new Set(), dens = [];
  let repeatErr = null, lockErr = null, tris = 0;
  const nrm = new THREE.Vector3();
  for (const g of guards) {
    if (g.material?.map) {
      const r = g.material.map.repeat;
      if (![r.x,r.y].every(Number.isFinite) || Math.abs(r.x - 1) > 1e-6 || Math.abs(r.y - 1) > 1e-6)
        repeatErr ??= `repeat ${q(r.x)}x${q(r.y)} ≠ 1x1`;
    } else repeatErr ??= 'guarda sem map';
    if (g.geometry.userData?.texelEscalada !== true) lockErr ??= 'guarda sem texelEscalada';
    const nor = g.geometry.attributes.normal;
    const seen = new Set(), porFace = new Map(), tt = triangulos(g), unicos = new Set();
    for (const ids of tt) {
      unicos.add([...ids].sort((a,b)=>a-b).join(","));
      nrm.fromBufferAttribute(nor,ids[0]);
      const face=`${Math.round(nrm.x*8)},${Math.round(nrm.y*8)},${Math.round(nrm.z*8)}`;
      porFace.set(face,(porFace.get(face)||0)+1);
    }
    for (const ids of tt) for (const i of ids) {
      nrm.fromBufferAttribute(nor, i);
      seen.add(`${Math.round(nrm.x * 8)},${Math.round(nrm.y * 8)},${Math.round(nrm.z * 8)}`);
    }
    if (seen.size !== 6 || tt.length !== 12 || unicos.size !== 12 || porFace.size !== 6 || [...porFace.values()].some(n=>n!==2)) facesPorMesh.add(`faces=${seen.size},tris=${tt.length},unicos=${unicos.size},porFace=${[...porFace.values()]}`);
    for (const s of singulares(g)) dens.push(s);
  }
  return { n: guards.length, guards, facesErr: facesPorMesh.size ? [...facesPorMesh] : null, repeatErr, lockErr, dens };
};

const medeFim = (W) => {
  const fims = fimDe(W);
  if (fims.length !== 1) return { n: fims.length, fims };
  const f = fims[0];
  const dens = [], grupos = f.geometry.groups?.length ?? 0;
  let lock = f.geometry.userData?.texelEscalada === true;
  for (const s of singulares(f)) dens.push(s);
  const uv = f.geometry.attributes.uv;
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i));
    v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i));
  }
  return { n: 1, fims, mesh: f, lock, grupos, dens, uvSpan: [u1 - u0, v1 - v0] };
};

/* snapshot estrutural: AABBs de guardas, bbox do fim, contagens — nada de UV. */
const snapEstrutural = (W) => {
  const box = new THREE.Box3();
  const gs = guardsDe(W).map((g) => {
    box.setFromObject(g);
    return [q(box.min.x), q(box.min.y), q(box.min.z), q(box.max.x), q(box.max.y), q(box.max.z)];
  });
  const fim = fimDe(W)[0];
  let fb = null;
  if (fim) { box.setFromObject(fim); fb = [q(box.min.x), q(box.min.y), q(box.min.z), q(box.max.x), q(box.max.y), q(box.max.z)]; }
  const mats = guardsDe(W).map((g) => (g.matrixWorld.elements.slice().map(q)).join(',')).sort();
  return { guards: gs.sort(JSON.stringify), fimBBox: fb, colliders: W.colliders.length, occluders: W.occluders.length, mats };
};

const avaliar = (W, rotulo) => {
  const cl = [];
  const put = (id, ok, msg) => { cl.push({ id, ok, msg }); console.log(`  [${rotulo}] ${id} ${ok ? 'PASSA' : 'FALHA'} — ${msg}`); };

  const mg = medeGuards(W);
  const densOk = (arr, alvo, etiqueta) => {
    let pior = 0, nulos = 0, ex = null;
    for (const d of arr) {
      if (!d || !d.every(Number.isFinite)) { nulos++; continue; }
      for (const s of d) { const e = Math.abs(s - alvo); if (e > pior) { pior = e; ex = s; } }
    }
    return { ok: arr.length > 0 && nulos === 0 && pior <= TOL, msg: `${arr.length} tris ${etiqueta}: ${nulos} nulo/degenerado, pior |s−${alvo}|=${q(pior)}${ex !== null ? ` (s=${q(ex)})` : ''}, teto ${TOL}`, pior, nulos };
  };

  const r1 = densOk(mg.dens, 1 / GUARD_TILE, `guardas (tile ${GUARD_TILE} m)`);
  put('CU-1', mg.n === 40 && !mg.repeatErr,
    `${mg.n}/40 guardas; repeat muralha ${mg.repeatErr ?? '1x1'}${mg.facesErr ? `; normais≠6faces: ${mg.facesErr.join(',')}` : ''}`);
  put('CU-2', !mg.lockErr, mg.lockErr ?? '40 guardas com geometry.userData.texelEscalada=true (lock anti 2ª escala do vao.js)');
  put('CU-3', r1.ok && mg.dens.length === 480 && !mg.facesErr, r1.msg + `; esperado 480 triângulos/6 faces por guarda, facesErr=${mg.facesErr}`);

  const mf = medeFim(W);
  if (mf.n !== 1) { for (const id of ['CU-4', 'CU-5', 'CU-6']) put(id, false, `${mf.n} malhas favelaFinish=campo (esperado 1)`); }
  else {
    const r2 = densOk(mf.dens, 1 / FIM_TILE, `acabamento mesclado (tile ${FIM_TILE} m)`);
    put('CU-4', mf.lock && mf.grupos === 0, `lock pós-merge=${mf.lock}, groups=${mf.grupos} (mergeParts descarta userData: o lock é do caller Campo)`);
    put('CU-5', r2.ok && mf.dens.length === FIM_TRIS, r2.msg + `; esperado ${FIM_TRIS} triângulos desenhados (${PERFIL_NOME})`);
    put('CU-6', mf.uvSpan[0] > 2 && mf.uvSpan[1] > 2,
      `período do UV mesclado: u=${q(mf.uvSpan[0])} tiles, v=${q(mf.uvSpan[1])} tiles — reset 0–1 por caixa colapsaria ambos em 1.0`);
  }
  return cl;
};

// ============================ CU-8: fachadas (fim + piloto std) ============================
// Paleta aprovada ORIGINAL 7ca2 (color/rough/metal); labels junta/finishConcrete compartilham matJunta.
const PALAVRA = Object.freeze({
  junta: [0x7c7466, .94, 0], finishConcrete: [0x7c7466, .94, 0], concrete: [0x8b8b83, .94, 0],
  wall: [0xc0a78c, .94, 0], tintaZ7: [0xa8a396, .94, 0], tintaZ3: [0xb9a98c, .94, 0],
  door: [0x4a3325, .9, 0], glass: [0x24383f, .24, .18], roof: [0x777a76, .75, .32],
  roofPainted: [0x777a76, .9, 0],
});

function blocos(mesh, errs, rot) {
  const g = mesh.geometry, pos = g.attributes.position, nor = g.attributes.normal, idx = g.index, uv = g.attributes.uv;
  if (!pos || !nor || !idx || !uv) { errs.push(`${rot}: geometry sem position/normal/uv/index`); return []; }
  if (pos.itemSize !== 3 || nor.itemSize !== 3 || uv.itemSize !== 2 || idx.itemSize !== 1) {
    errs.push(`${rot}: itemSize inválido (pos=${pos.itemSize}, nor=${nor.itemSize}, uv=${uv.itemSize}, idx=${idx.itemSize}; exigido 3/3/2/1)`); return [];
  }
  if (pos.count % 24 || idx.count % 36 || pos.count / 24 !== idx.count / 36 || nor.count !== pos.count || uv.count !== pos.count) {
    errs.push(`${rot}: counts fora do formato 24v/36idx (pos=${pos.count}, idx=${idx.count})`); return [];
  }
  const out = [];
  for (let b = 0, n = idx.count / 36; b < n; b++) {
    const start = 36 * b, first = 24 * b, used = new Set(), ids = [];
    let dentro = true;
    for (let k = 0; k < 36; k++) {
      const v = idx.getX(start + k);
      if (!Number.isInteger(v) || v < first || v >= first + 24) dentro = false;
      used.add(v); ids.push(v);
    }
    if (!dentro || used.size !== 24) { errs.push(`${rot} bloco ${b}: índice fora do bloco ou ${used.size}/24 vértices usados`); continue; }
    const verts = [];
    let bbox = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let i = 0; i < 24; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, first + i).applyMatrix4(mesh.matrixWorld);
      verts.push(v);
      bbox[0] = Math.min(bbox[0], v.x); bbox[1] = Math.min(bbox[1], v.y); bbox[2] = Math.min(bbox[2], v.z);
      bbox[3] = Math.max(bbox[3], v.x); bbox[4] = Math.max(bbox[4], v.y); bbox[5] = Math.max(bbox[5], v.z);
    }
    if (!bbox.every(Number.isFinite) || !(bbox[3] > bbox[0] && bbox[4] > bbox[1] && bbox[5] > bbox[2])) {
      errs.push(`${rot} bloco ${b}: bbox não finita/positiva`); continue;
    }
    out.push({ b, start, first, ids, verts, bbox });
  }
  return out;
}

// Posições do index buffer efetivamente desenhadas + materiais que as cobrem.
function coberturaDesenho(mesh) {
  const g = mesh.geometry, total = g.index ? g.index.count : g.attributes.position.count;
  const ini = Math.max(0, g.drawRange.start), fim = g.drawRange.count === Infinity ? total : Math.min(total, ini + g.drawRange.count);
  const positions = new Set(), matAt = new Map();
  if (!Array.isArray(mesh.material) && (!mesh.material || mesh.material.visible === false)) return { positions, matAt };
  const ranges = Array.isArray(mesh.material)
    ? g.groups.filter((gr) => mesh.material[gr.materialIndex] && mesh.material[gr.materialIndex].visible !== false)
    : [{ start: 0, count: total, materialIndex: null }];
  for (const r of ranges) {
    const mat = Array.isArray(mesh.material) ? mesh.material[r.materialIndex] : mesh.material;
    for (let t = Math.max(ini, r.start); t < Math.min(fim, r.start + r.count); t++) {
      positions.add(t);
      if (!matAt.has(t)) matAt.set(t, []);
      matAt.get(t).push(mat);
    }
  }
  return { positions, matAt };
}

function efetivamenteVisivel(o) {
  for (let n = o; n; n = n.parent) if (n.visible === false) return false;
  return true;
}

// Topologia combinatorial: cantos, 2 tris/face, diagonal comum, winding/normais WORLD outward.
function topoBloco(mesh, bl, box, id, errs) {
  const T = MATCH_TOLERANCE, corners = [];
  for (const X of [box[0], box[3]]) for (const Y of [box[1], box[4]]) for (const Z of [box[2], box[5]]) corners.push([X, Y, Z]);
  const cornerOf = [], perCorner = new Array(8).fill(0);
  for (const v of bl.verts) {
    const hits = corners.map((c, k) => c.every((n, a) => Math.abs(n - v.getComponent(a)) <= T) ? k : -1).filter(k => k >= 0);
    if (hits.length !== 1) { errs.push(id + ': vértice com ' + hits.length + ' cantos candidatos (teto ' + T + 'm por eixo)'); return; }
    cornerOf.push(hits[0]); perCorner[hits[0]]++;
  }
  if (perCorner.some(n => n !== 3)) { errs.push(id + ': cantos sem multiplicidade 3x8'); return; }
  const nMat = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld), nrm = new THREE.Vector3();
  const normals = mesh.geometry.attributes.normal, porFace = new Map(), assinaturas = new Set();
  const center = new THREE.Vector3((box[0] + box[3]) / 2, (box[1] + box[4]) / 2, (box[2] + box[5]) / 2);
  for (let t = 0; t < 12; t++) {
    const vi = [0, 1, 2].map(k => bl.ids[3 * t + k] - bl.first), cs = vi.map(i => cornerOf[i]);
    if (new Set(cs).size !== 3) { errs.push(id + ': tri ' + t + ' repete cantos'); return; }
    const axes = [0, 1, 2].filter(a => cs.every(c => corners[c][a] === corners[cs[0]][a]));
    if (axes.length !== 1) { errs.push(id + ': tri ' + t + ' não pertence a uma face retangular'); return; }
    const eixo = axes[0], sinal = corners[cs[0]][eixo] === box[eixo + 3] ? 1 : 0, fk = '' + eixo + sinal;
    if (!porFace.has(fk)) porFace.set(fk, []);
    porFace.get(fk).push(cs);
    const ass = [...cs].sort((a, b) => a - b).join(',');
    if (assinaturas.has(ass)) errs.push(id + ': triângulo geométrico duplicado ' + ass);
    assinaturas.add(ass);
    const [p0, p1, p2] = vi.map(i => bl.verts[i]);
    const cross = new THREE.Vector3().subVectors(p1, p0).cross(new THREE.Vector3().subVectors(p2, p0));
    if (!Number.isFinite(cross.lengthSq()) || cross.lengthSq() === 0) { errs.push(id + ': tri degenerado'); return; }
    const fc = new THREE.Vector3(...corners[cs[0]]).sub(center);
    if (!(cross.dot(fc) > 0)) errs.push(id + ': winding não aponta para fora');
    const outward = [0, 0, 0]; outward[eixo] = sinal ? 1 : -1;
    for (const i of vi) {
      nrm.fromBufferAttribute(normals, bl.first + i).applyNormalMatrix(nMat);
      if (!outward.every((v, a) => Number.isFinite(nrm.getComponent(a)) && Math.abs(nrm.getComponent(a) - v) <= T))
        errs.push(id + ': normal WORLD não coincide com face outward');
    }
  }
  if (porFace.size !== 6 || [...porFace.values()].some(ts => ts.length !== 2)) {
    errs.push(id + ': topologia não tem seis faces com duas metades'); return;
  }
  for (const [fk, tris] of porFace) {
    const comum = tris[0].filter(c => tris[1].includes(c)), eixo = Number(fk[0]);
    const diagonal = comum.length === 2 && [0, 1, 2].filter(a => a !== eixo)
      .every(a => corners[comum[0]][a] !== corners[comum[1]][a]);
    if (new Set(tris.flat()).size !== 4 || !diagonal)
      errs.push(id + ': face ' + fk + ' não cobre quatro cantos por duas metades distintas');
  }
}

function confereMaterial(m, label, ctx, errs) {
  if (!(m instanceof THREE.MeshStandardMaterial)) { errs.push(`${ctx}: ${m?.type ?? 'null'} ≠ MeshStandardMaterial`); return; }
  const [c, r, mt] = PALAVRA[label];
  if (m.color.getHex() !== c) errs.push(`${ctx}: cor ${m.color.getHexString()} ≠ ${c.toString(16)}`);
  if (m.roughness !== r || m.metalness !== mt)
    errs.push(`${ctx}: PBR ${m.roughness}/${m.metalness} ≠ ${r}/${mt}`);
  for (const e of pinsRaster(m, THREE.Color)) errs.push(`${ctx}: raster ${e}`);
}

function inventarioFachadas(W) {
  const errs = [];
  const fims = [], stds = [];
  W.root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData?.favelaFinish === 'campo') fims.push(o);
    else if (o.userData?.campoFachadaPiloto === true) stds.push(o);
  });
  if (fims.length !== 1) errs.push(`CU-8: ${fims.length} malhas favelaFinish=campo (esperado 1)`);
  if (stds.length !== esperado.counts.stdBatches)
    errs.push(`CU-8: ${stds.length}/${esperado.counts.stdBatches} batches piloto (campoFachadaPiloto)`);
  const matsStd = new Set(stds.map((m) => (Array.isArray(m.material) ? null : m.material)));
  if (matsStd.has(null) || matsStd.size !== esperado.counts.stdBatches)
    errs.push(`CU-8: identidade de materiais std ${matsStd.size}/${esperado.counts.stdBatches}`);

  const porId = new Map();
  const cob = new Map();
  const casa = (mesh, rot, pieces) => {
    if (!mesh) return;
    if (!cob.has(mesh)) cob.set(mesh, coberturaDesenho(mesh));
    const des = cob.get(mesh);
    const bls = blocos(mesh, errs, rot);
    const usados = new Array(bls.length).fill(false);
    for (const p of pieces) {
      const hits = [];
      for (let j = 0; j < bls.length; j++)
        if (!usados[j] && p.box.every((lim, k) => Math.abs(lim - bls[j].bbox[k]) <= MATCH_TOLERANCE)) hits.push(j);
      if (hits.length !== 1) { errs.push(`CU-8 ${rot} ${p.id}: ${hits.length} candidatos de bbox (esperado 1)`); continue; }
      usados[hits[0]] = true;
      porId.set(p.id, { mesh, bl: bls[hits[0]], p, des });
    }
    if (usados.some((u) => !u)) errs.push(`CU-8 ${rot}: ${usados.filter((u) => !u).length} blocos extra sem peça esperada`);
  };
  if (fims.length === 1) casa(fims[0], 'fim', esperado.finish);
  const blStd = [];
  for (const m of stds) {
    if (!cob.has(m)) cob.set(m, coberturaDesenho(m));
    for (const bl of blocos(m, errs, 'std')) blStd.push({ mesh: m, bl, des: cob.get(m) });
  }
  const usadosStd = new Array(blStd.length).fill(false);
  for (const p of esperado.std) {
    const hits = [];
    for (let j = 0; j < blStd.length; j++)
      if (!usadosStd[j] && p.box.every((lim, k) => Math.abs(lim - blStd[j].bl.bbox[k]) <= MATCH_TOLERANCE)) hits.push(j);
    if (hits.length !== 1) { errs.push(`CU-8 std ${p.id}: ${hits.length} candidatos de bbox (esperado 1)`); continue; }
    usadosStd[hits[0]] = true;
    porId.set(p.id, { mesh: blStd[hits[0]].mesh, bl: blStd[hits[0]].bl, p, des: blStd[hits[0]].des });
  }
  if (usadosStd.some((u) => !u)) errs.push(`CU-8 std: ${usadosStd.filter((u) => !u).length} blocos extra`);

  for (const [id, { mesh, bl, p, des }] of porId) {
    topoBloco(mesh, bl, p.box, id, errs);
    if (!efetivamenteVisivel(mesh)) errs.push(`CU-8 ${id}: malha/ancestral invisível`);
    if (!(mesh.layers.mask & 1)) errs.push(`CU-8 ${id}: layer 0 desligada`);
    if (mesh.receiveShadow !== true) errs.push(`CU-8 ${id}: receiveShadow=${mesh.receiveShadow}`);
    if (mesh.castShadow !== p.cast) errs.push(`CU-8 ${id}: castShadow=${mesh.castShadow} ≠ ${p.cast}`);
    let mats = new Set();
    for (let k = 0; k < 36; k++) {
      const t = bl.start + k;
      if (!des.positions.has(t)) { errs.push(`CU-8 ${id}: índice ${t} fora do desenho (drawRange/grupos)`); break; }
      if (des.matAt.get(t)?.length !== 1) errs.push('CU-8 ' + id + ': índice ' + t + ' coberto mais de uma vez por grupos');
      for (const m of des.matAt.get(t) ?? []) mats.add(m);
    }
    if (mats.size !== 1) { errs.push(`CU-8 ${id}: ${mats.size} materiais sobre o bloco`); continue; }
    const m = [...mats][0];
    confereMaterial(m, p.mat, `CU-8 ${id} [${p.mat}]`, errs);
  }
  // junta/finishConcrete compartilham o MESMO matJunta real do merge
  const mate = (e) => { const s = new Set(); for (let k = 0; k < 36; k++) for (const m of e.des.matAt.get(e.bl.start + k) ?? []) s.add(m); return [...s]; };
  const cj = [...porId.values()].filter((v) => v.p.mat === 'junta');
  const cf = [...porId.values()].filter((v) => v.p.mat === 'finishConcrete');
  if (cj.length && cf.length) {
    const aj = new Set(cj.flatMap(mate)), af = new Set(cf.flatMap(mate));
    if (aj.size !== 1 || af.size !== 1 || [...aj][0] !== [...af][0])
      errs.push('CU-8: junta/finishConcrete não compartilham o mesmo matJunta real');
  }

  // F7 roofPainted: só R23, identificado PRIMEIRO por bbox/ID std:F7:infill:d
  const folha = porId.get('std:F7:infill:d');
  if (PERFIL_NUM === 2) {
    if (!folha) errs.push('CU-8: folha std:F7:infill:d (roofPainted) ausente no R23');
    else {
      const s = new Set();
      for (let k = 0; k < 36; k++) for (const m of folha.des.matAt.get(folha.bl.start + k) ?? []) s.add(m);
      const mf = [...s][0];
      if (!mf) errs.push('CU-8 folha F7: bloco sem material desenhado');
      else confereMaterial(mf, 'roofPainted', 'CU-8 folha F7', errs);
      const coroa = porId.get('std:F6:coroa:L');
      if (coroa) {
        const sc = new Set();
        for (let k = 0; k < 36; k++) for (const m of coroa.des.matAt.get(coroa.bl.start + k) ?? []) sc.add(m);
        const mc = [...sc][0];
        if (mf && mc && mf === mc) errs.push('CU-8 folha F7: material idêntico ao roof das coroas');
        if (!!mf?.map !== !!mc?.map) errs.push('CU-8 folha F7: mapa ausente só na folha ou coroa');
        if (mf?.map && mc?.map) {
          const iguais = mf.map.source === mc.map.source && mf.map.wrapS === mc.map.wrapS && mf.map.wrapT === mc.map.wrapT
            && mf.map.magFilter === mc.map.magFilter && mf.map.minFilter === mc.map.minFilter
            && mf.map.colorSpace === mc.map.colorSpace && mf.map.flipY === mc.map.flipY
            && mf.map.channel === mc.map.channel && mf.map.rotation === mc.map.rotation
            && mf.map.offset.equals(mc.map.offset) && mf.map.center.equals(mc.map.center);
          if (!iguais) errs.push('CU-8 folha F7: sampler/cor divergem do roof das coroas');
          if (mf.map.repeat.x !== 3 || mf.map.repeat.y !== 3 || mc.map.repeat.x !== 3 || mc.map.repeat.y !== 3)
            errs.push('CU-8 folha F7: repeat ≠ 3x3');
        }
      }
    }
  } else if (folha && folha.p.mat === 'roofPainted') {
    errs.push(`CU-8: roofPainted presente no perfil ${PERFIL_NOME} (só R23)`);
  }
  return { errs, porId, fims, stds, cob };
}

function avaliarCU8(W, rotulo) {
  const inv = inventarioFachadas(W);
  const ok = inv.errs.length === 0;
  console.log(`  [${rotulo}] CU-8 ${ok ? 'PASSA' : 'FALHA'} — ${ok
    ? `${esperado.counts.finish} peças fim + ${esperado.counts.std} std (${esperado.counts.stdBatches} batches), topologia/desenhabilidade/material conforme fixture ${PERFIL_NOME}`
    : `${inv.errs.length} violações: ${inv.errs.slice(0, 6).join(' | ')}${inv.errs.length > 6 ? ' …' : ''}`}`);
  return { id: 'CU-8', ok, msg: inv.errs.slice(0, 3).join(' | ') || 'fachadas conforme fixture', inv };
}

// ==================== hash estrutural da cena nominal (sem UUID) ====================
const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
function atributo(a) {
  if (!a) return null;
  const v = a.array || a.data?.array;
  if (!ArrayBuffer.isView(v)) throw new Error('atributo sem typed array real');
  return { type: v.constructor.name, itemSize: a.itemSize, count: a.count, normalized: a.normalized,
    offset: a.offset ?? null, stride: a.data?.stride ?? null,
    sha: createHash('sha256').update(Buffer.from(v.buffer, v.byteOffset, v.byteLength)).digest('hex') };
}
function textura(t) {
  if (!t) return null;
  return { type: t.type, repeat: t.repeat.toArray(), offset: t.offset.toArray(), center: t.center.toArray(),
    rotation: t.rotation, wrapS: t.wrapS, wrapT: t.wrapT, channel: t.channel, colorSpace: t.colorSpace,
    flipY: t.flipY, magFilter: t.magFilter, minFilter: t.minFilter,
    imageData: t.image?.data ? createHash('sha256').update(Buffer.from(t.image.data.buffer, t.image.data.byteOffset, t.image.data.byteLength)).digest('hex') : null,
    imageSize: t.image ? [t.image.width, t.image.height] : null };
}
function materialDados(m) {
  const out = { type: m.type };
  for (const k of ['visible','colorWrite','depthWrite','depthTest','transparent','opacity','roughness','metalness','side',
    'alphaTest','alphaHash','toneMapped','vertexColors','fog','wireframe','blending','blendSrc','blendDst','blendEquation',
    'polygonOffset','polygonOffsetFactor','polygonOffsetUnits','emissiveIntensity','envMapIntensity','normalMapType',
    'displacementScale','displacementBias']) if (m[k] !== undefined) out[k] = m[k];
  // R49: os 36 pins de estado raster no digest, sem quantização (depthFunc e canais blendColor incluídos)
  const rasterValor = v => v === undefined ? { missing: true }
    : typeof v === 'number' && !Number.isFinite(v) ? { nonfinite: String(v) } : v;
  for (const [k] of RASTER) out[k] = rasterValor(m[k]);
  if (m.blendColor instanceof THREE.Color) out.blendColor = ['r', 'g', 'b'].map(k => rasterValor(m.blendColor[k]));
  for (const k of ['color','emissive','normalScale']) if (m[k]) out[k] = m[k].toArray();
  for (const k of ['map','normalMap','roughnessMap','metalnessMap','alphaMap','aoMap','emissiveMap','displacementMap']) out[k] = textura(m[k]);
  if (m.vertexShader) out.vertexShader = digest(m.vertexShader);
  if (m.fragmentShader) out.fragmentShader = digest(m.fragmentShader);
  return out;
}
function malhaDados(o) {
  const g = o.geometry;
  return { name: o.name, world: o.matrixWorld.toArray(), visible: o.visible, effectiveVisible: efetivamenteVisivel(o),
    cast: o.castShadow, receive: o.receiveShadow, layers: o.layers.mask, renderOrder: o.renderOrder, frustumCulled: o.frustumCulled,
    groups: g.groups, drawRange: { start: g.drawRange.start, count: String(g.drawRange.count) },
    lock: g.userData?.texelEscalada ?? null,
    attributes: Object.fromEntries(Object.keys(g.attributes).sort().map(k => [k, atributo(g.attributes[k])])),
    index: atributo(g.index), morphAttributes: Object.fromEntries(Object.keys(g.morphAttributes).sort().map(k => [k, g.morphAttributes[k].map(atributo)])),
    morphTargetsRelative: g.morphTargetsRelative, morphTargetInfluences: o.morphTargetInfluences ?? null,
    instances: o.isInstancedMesh ? { count: o.count, matrix: atributo(o.instanceMatrix), color: atributo(o.instanceColor) } : null,
    mats: (Array.isArray(o.material) ? o.material : [o.material]).map(materialDados) };
}
function valorFisico(v, seen = new Set()) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : { nonfinite: String(v) };
  if (['string','boolean'].includes(typeof v)) return v;
  if (typeof v === 'function') return { functionSHA256: digest(String(v)) };
  if (v.isMesh) return malhaDados(v);
  if (seen.has(v)) throw new Error('referência cíclica inesperada no hash físico');
  seen.add(v);
  let out;
  if (v.isObject3D) out = { type: v.type, world: v.matrixWorld.toArray(), visible: v.visible,
    layers: v.layers.mask, children: v.children.map(x => valorFisico(x, seen)) };
  else if (ArrayBuffer.isView(v)) out = { type: v.constructor.name, values: Array.from(v) };
  else out = Array.isArray(v) ? v.map(x => valorFisico(x, seen)) :
    Object.fromEntries(Object.keys(v).sort().filter(k => k !== 'uuid').map(k => [k, valorFisico(v[k], seen)]));
  seen.delete(v);
  return out;
}
function hashCena(W) {
  W.root.updateMatrixWorld(true);
  const meshes = [];
  W.root.traverse(o => { if (o.isMesh) meshes.push(malhaDados(o)); });
  const physics = {};
  for (const k of ['colliders','camBlockers','spawns','pickups','ctfPoints','waypoints','tacticalRoutes','casario','bounds','levels','occluders'])
    physics[k] = valorFisico(W[k]);
  if (typeof W.groundHeightAt !== 'function') throw new Error('groundHeightAt ausente no hash estrutural');
  const ground = [];
  for (let x = -35; x <= 35; x += .5) for (let z = -29; z <= 29; z += .5) {
    const y = W.groundHeightAt(x, z);
    if (!Number.isFinite(y)) throw new Error('amostra de ground não finita');
    ground.push(y);
  }
  physics.ground = ground;
  return digest({ meshes, physics });
}

// ============================ execução ============================
let W1, W2;
try {
  W1 = await sobe();
  W2 = await sobe();
} catch (e) {
  console.error(`infraestrutura: build não subiu — ${String(e?.message || e)}`);
  process.exit(3);
}

const antes = { guards: guardsDe(W1).map((g) => g.matrixWorld.clone()), snap: snapEstrutural(W1) };
const nominal = avaliar(W1, 'nominal');
const cu8nom = avaliarCU8(W1, 'nominal');

const deterministico = JSON.stringify(snapEstrutural(W2)) === JSON.stringify(antes.snap);
const bijecao = (() => {
  const gs = guardsDe(W1), box = new THREE.Box3();
  let semCollider = 0, semOccluder = 0;
  for (const g of gs) {
    box.setFromObject(g);
    const tem = W1.colliders.some((c) => Math.abs(c.minX - box.min.x) < 1e-3 && Math.abs(c.maxX - box.max.x) < 1e-3
      && Math.abs(c.minZ - box.min.z) < 1e-3 && Math.abs(c.maxZ - box.max.z) < 1e-3
      && Math.abs(c.minY - box.min.y) < 1e-3 && Math.abs(c.maxY - box.max.y) < 1e-3);
    if (!tem) semCollider++;
    if (!W1.occluders.includes(g)) semOccluder++;
  }
  const fim = fimDe(W1)[0];
  const fimColisao = fim ? W1.colliders.some((c) => { const b = new THREE.Box3().setFromObject(fim); return c.minX === b.min.x && c.maxX === b.max.x && c.minZ === b.min.z && c.maxZ === b.max.z; }) : false;
  return { ok: gs.length === 40 && semCollider === 0 && semOccluder === 0 && !fimColisao, msg: `${gs.length} guardas, ${semCollider} sem collider, ${semOccluder} sem occluder, fim com collider=${fimColisao}` };
})();
console.log(`  [estrutural] CU-7 ${deterministico && bijecao.ok ? 'PASSA' : 'FALHA'} — determinismo=${deterministico}, ${bijecao.msg}`);
const clausulas = [...nominal, { id: 'CU-7', ok: deterministico && bijecao.ok, msg: bijecao.msg }, cu8nom];
const nominalVerde = clausulas.every((c) => c.ok);

// hash estrutural ANTES de qualquer mutação; default e --query=2 têm de dar o mesmo SHA
let SHA_ESTRUTURAL;
try { SHA_ESTRUTURAL = hashCena(W1); }
catch (e) { console.error('infraestrutura: hash estrutural — ' + String(e?.message || e)); process.exit(3); }
console.log(`\nCAMPO-PERFIL ${JSON.stringify({ perfil: PERFIL_NOME, query: QUERY_LABEL, sha: SHA_ESTRUTURAL })}`);

if (MUTANTE) {
  if (!nominalVerde) {
    console.error(`nominal não-VERDE: mutante não aplicado (régua exige nominal verde antes de qualquer mutante)`);
    process.exit(1);
  }
  const gs = guardsDe(W1), fim = fimDe(W1)[0];
  const inv = cu8nom.inv;
  const infra = (msg) => { console.error(`infraestrutura: ${msg}`); process.exit(3); };
  const raster = ['fim-raster-blend-zero', 'fim-raster-depth-never'].includes(MUTANTE);
  if (raster && (inv.fims.length !== 1 || inv.fims[0] !== fim || Array.isArray(fim.material)))
    infra('raster: alvo finish/material real não é único');
  const rasterMaterialAntes = raster ? fim.material : null;
  const exigeStd = () => { if (!inv.stds.length) infra(`mutante ${MUTANTE}: alvo std ausente no perfil ${PERFIL_NOME}`); };
  const alvo = (id) => { const e = inv.porId.get(id); if (!e) infra(`mutante ${MUTANTE}: alvo ${id} ausente no perfil ${PERFIL_NOME}`); return e; };
  let alvoInfo = null;
  const antigo = ["guardrepeat20x3", "removerguardUV", "guardperiod2m", "removerfimUV", "removerlock", "uv-rank1", "face-ausente", "repeat-nao-finito", "inventario-compensado"].includes(MUTANTE);
  if (!antigo) for (const m of [...inv.fims, ...inv.stds]) m.geometry = m.geometry.clone();

  if (MUTANTE === 'guardrepeat20x3') {
    for (const g of gs) g.material.map.repeat.set(20, 3);
  } else if (MUTANTE === 'removerguardUV') {
    for (const g of gs) {
      const uv = g.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (i / uv.count) % 1 <= 0.5 ? 0 : 1, i % 2);
      uv.needsUpdate = true;
    }
  } else if (MUTANTE === 'guardperiod2m') {
    for (const g of gs) {
      const uv = g.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 2);
      uv.needsUpdate = true;
    }
  } else if (MUTANTE === 'removerfimUV') {
    const uv = fim.geometry.attributes.uv, idx = fim.geometry.index;
    for (let t = 0; t < idx.count; t += 3) {
      const ids = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const i of ids) { u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i)); v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i)); }
      const du = u1 - u0 || 1, dv = v1 - v0 || 1;
      for (const i of ids) uv.setXY(i, (uv.getX(i) - u0) / du, (uv.getY(i) - v0) / dv);
    }
    uv.needsUpdate = true;
  } else if (MUTANTE === 'uv-rank1') {
    for (const g of gs) {
      const pos=g.geometry.attributes.position, uv=g.geometry.attributes.uv;
      for (const ids of triangulos(g)) {
        const p0=new THREE.Vector3().fromBufferAttribute(pos,ids[0]);
        for (const i of ids) uv.setXY(i,new THREE.Vector3().fromBufferAttribute(pos,i).distanceTo(p0)/4,0);
      }
    }
  } else if (MUTANTE === 'face-ausente') {
    gs[0].geometry=gs[0].geometry.clone();
    gs[0].geometry.setDrawRange(0,gs[0].geometry.index.count-6);
  } else if (MUTANTE === 'inventario-compensado') {
    for (const g of gs.slice(0,2)) g.geometry=g.geometry.clone();
    const a=gs[0].geometry,b=gs[1].geometry,ai=Array.from(a.index.array),bi=Array.from(b.index.array);
    a.setIndex(ai.slice(3)); b.setIndex([...bi,...bi.slice(0,3)]);
  } else if (MUTANTE === 'repeat-nao-finito') {
    gs[0].material.map.repeat.x=NaN;
  } else if (MUTANTE === 'removerlock') {
    delete fim.geometry.userData.texelEscalada;
  } else if (/^(?:fim|std)-(position|normal|uv)-itemsize1$|^(?:fim|std)-index-itemsize2$/.test(MUTANTE)) {
    const m = MUTANTE.match(/^(fim|std)-(position|normal|uv|index)-itemsize(\d)$/);
    const familia = m[1], attr = m[2];
    const alvoMesh = familia === 'fim' ? fim : (exigeStd(), inv.stds[0]);
    const g = alvoMesh.geometry;
    alvoInfo = `${familia}:${attr}:itemSize${m[3]}`;
    if (attr === 'index') {
      const orig = g.index, Dados = orig.array.constructor;
      const data = new Dados(orig.count * 2);
      for (let i = 0; i < orig.count; i++) { data[i * 2] = orig.getX(i); data[i * 2 + 1] = 0; }
      const novo = new THREE.BufferAttribute(data, 2, orig.normalized);
      g.setIndex(novo);
      if (g.index !== novo || g.index.itemSize !== 2 || g.index.count !== orig.count) infra(`${MUTANTE}: index não substituído`);
      for (let i = 0; i < orig.count; i++) if (g.index.getX(i) !== orig.getX(i)) infra(`${MUTANTE}: getX do index divergiu`);
    } else {
      const esperado = attr === 'uv' ? 2 : 3;
      const orig = g.attributes[attr];
      if (!orig || orig.itemSize !== esperado || !orig.array || orig.array.length % esperado !== 0)
        infra(`${MUTANTE}: aridade/fonte nominal de ${attr} ausente`);
      const novo = new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(orig.array, esperado), 1, 0, orig.normalized);
      g.setAttribute(attr, novo);
      if (g.attributes[attr] !== novo || novo.itemSize !== 1 || novo.count !== orig.count) infra(`${MUTANTE}: ${attr} não substituído`);
      for (let i = 0; i < orig.count; i++) {
        if (novo.getX(i) !== orig.getX(i) || novo.getY(i) !== orig.getY(i)
          || (esperado === 3 && novo.getZ(i) !== orig.getZ(i))) infra(`${MUTANTE}: getter de ${attr} divergiu no vértice ${i}`);
      }
    }
  } else if (MUTANTE === 'fim-compensado') {
    const dst = alvo('fim:xneg:i4:borda-'), src = alvo('fim:xneg:i4:borda+');
    const g = fim.geometry, pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv, idx = g.index;
    const antesZ = pos.getZ(dst.bl.first);
    for (let i = 0; i < 24; i++) {
      pos.setXYZ(dst.bl.first + i, pos.getX(src.bl.first + i), pos.getY(src.bl.first + i), pos.getZ(src.bl.first + i));
      nor.setXYZ(dst.bl.first + i, nor.getX(src.bl.first + i), nor.getY(src.bl.first + i), nor.getZ(src.bl.first + i));
      uv.setXY(dst.bl.first + i, uv.getX(src.bl.first + i), uv.getY(src.bl.first + i));
    }
    for (let k = 0; k < 36; k++) idx.setX(dst.bl.start + k, src.bl.ids[k] - src.bl.first + dst.bl.first);
    pos.needsUpdate = nor.needsUpdate = uv.needsUpdate = idx.needsUpdate = true;
    if (pos.getZ(dst.bl.first) === antesZ) infra('fim-compensado: aplicação não mudou bytes');
    alvoInfo = 'fim:xneg:i4:borda-';
  } else if (MUTANTE === 'std-compensado') {
    exigeStd();
    const dst = alvo('std:F7:base'), src = alvo('std:F6:base');
    if (dst.mesh !== src.mesh) infra('std-compensado: alvos não estão no mesmo batch');
    const g = dst.mesh.geometry, pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv, idx = g.index;
    const antesX = pos.getX(dst.bl.first);
    for (let i = 0; i < 24; i++) {
      pos.setXYZ(dst.bl.first + i, pos.getX(src.bl.first + i), pos.getY(src.bl.first + i), pos.getZ(src.bl.first + i));
      nor.setXYZ(dst.bl.first + i, nor.getX(src.bl.first + i), nor.getY(src.bl.first + i), nor.getZ(src.bl.first + i));
      uv.setXY(dst.bl.first + i, uv.getX(src.bl.first + i), uv.getY(src.bl.first + i));
    }
    for (let k = 0; k < 36; k++) idx.setX(dst.bl.start + k, src.bl.ids[k] - src.bl.first + dst.bl.first);
    pos.needsUpdate = nor.needsUpdate = uv.needsUpdate = idx.needsUpdate = true;
    if (pos.getX(dst.bl.first) === antesX) infra('std-compensado: aplicação não mudou bytes');
    alvoInfo = 'std:F7:base';
  } else if (MUTANTE === 'fim-oculto') {
    fim.visible = false;
    if (fim.visible !== false) infra('fim-oculto: aplicação não mudou flags');
    alvoInfo = 'favelaFinish=campo';
  } else if (MUTANTE === 'std-oculto') {
    exigeStd();
    inv.stds[0].visible = false;
    if (inv.stds[0].visible !== false) infra('std-oculto: aplicação não mudou flags');
    alvoInfo = 'batch std #0';
  } else if (MUTANTE === 'fim-ancestral-oculto') {
    const pai = fim.parent;
    const grupo = new THREE.Group();
    grupo.visible = false;
    const k = pai.children.indexOf(fim);
    pai.add(grupo); grupo.add(fim);
    pai.children.splice(pai.children.indexOf(grupo), 1); pai.children.splice(k, 0, grupo);
    W1.root.updateMatrixWorld(true);
    if (fim.parent !== grupo || grupo.visible !== false || W1.root.visible === false || gs.some((g) => !g.visible))
      infra('fim-ancestral-oculto: aplicação não confere');
    alvoInfo = 'Group pai do fim';
  } else if (MUTANTE === 'fim-face-duplicada') {
    const e = alvo('fim:xneg:i0:verga');
    const idx = fim.geometry.index, s = e.bl.start, antesIdx = idx.getX(s);
    for (let k = 0; k < 6; k++) idx.setX(s + k, e.bl.ids[6 + k]);
    idx.needsUpdate = true;
    if (idx.getX(s) === antesIdx) infra('fim-face-duplicada: aplicação não mudou índices');
    alvoInfo = 'fim:xneg:i0:verga';
  } else if (MUTANTE === 'std-face-duplicada') {
    exigeStd();
    const e = alvo('std:F6:base');
    const idx = e.mesh.geometry.index, s = e.bl.start, antesIdx = idx.getX(s);
    for (let k = 0; k < 6; k++) idx.setX(s + k, e.bl.ids[6 + k]);
    idx.needsUpdate = true;
    if (idx.getX(s) === antesIdx) infra('std-face-duplicada: aplicação não mudou índices');
    alvoInfo = 'std:F6:base';
  } else if (MUTANTE === 'fim-translado') {
    const e = alvo('fim:zneg:i4:verga');
    const pos = fim.geometry.attributes.position, antesX = pos.getX(e.bl.first);
    for (let i = 0; i < 24; i++) pos.setX(e.bl.first + i, pos.getX(e.bl.first + i) + 0.125);
    pos.needsUpdate = true;
    if (Math.abs(pos.getX(e.bl.first) - antesX - 0.125) > 1e-9) infra('fim-translado: aplicação não mudou bytes');
    alvoInfo = 'fim:zneg:i4:verga (+0.125m x)';
  } else if (MUTANTE === 'fim-alpha-test') {
    const m0 = fim.material;
    fim.material = m0.clone();
    fim.material.alphaTest = 2;
    if (fim.material === m0 || fim.material.alphaTest !== 2) infra('fim-alpha-test: aplicação não mudou material');
    alvoInfo = 'favelaFinish=campo alphaTest=2';
  } else if (MUTANTE === 'fim-alpha-blend') {
    const m0 = fim.material;
    fim.material = m0.clone();
    fim.material.transparent = true;
    fim.material.opacity = 0.01;
    if (fim.material === m0 || fim.material.transparent !== true || fim.material.opacity !== 0.01)
      infra('fim-alpha-blend: aplicação não mudou material');
    alvoInfo = 'favelaFinish=campo transparent+opacity0.01';
  } else if (MUTANTE === 'fim-raster-blend-zero') {
    const m0 = fim.material;
    fim.material = m0.clone();
    const m = fim.material;
    m.blending = THREE.CustomBlending; m.blendSrc = THREE.ZeroFactor; m.blendDst = THREE.OneFactor; m.blendEquation = THREE.AddEquation;
    if (fim.material === m0 || m.blending !== 5 || m.blendSrc !== 200 || m.blendDst !== 201 || m.blendEquation !== 100)
      infra('fim-raster-blend-zero: aplicação não mudou blend (5/200/201/100)');
    if (m.alphaTest !== 0 || m.opacity !== 1 || m.transparent !== false)
      infra('fim-raster-blend-zero: alphaTest/opacity/transparent não são nominais 0/1/false');
    alvoInfo = 'favelaFinish=campo CustomBlending src=ZERO dst=ONE eq=ADD';
  } else if (MUTANTE === 'fim-raster-depth-never') {
    const m0 = fim.material;
    fim.material = m0.clone();
    const m = fim.material;
    m.depthFunc = THREE.NeverDepth;
    if (fim.material === m0 || m.depthFunc !== 0 || m.depthTest !== true)
      infra('fim-raster-depth-never: aplicação não mudou depth (func=0/test=true)');
    if (m.alphaTest !== 0 || m.opacity !== 1 || m.transparent !== false)
      infra('fim-raster-depth-never: alphaTest/opacity/transparent não são nominais 0/1/false');
    alvoInfo = 'favelaFinish=campo depthFunc=NeverDepth(0) depthTest=true';
  } else if (MUTANTE === 'folha-f7-metal') {
    if (PERFIL_NUM !== 2) infra(`folha-f7-metal: roofPainted só existe no r23 (perfil ${PERFIL_NOME})`);
    const e = alvo('std:F7:infill:d');
    const m0 = e.mesh.material;
    e.mesh.material = m0.clone();
    e.mesh.material.roughness = 0.75;
    e.mesh.material.metalness = 0.32;
    e.mesh.castShadow = false;
    if (e.mesh.material === m0 || e.mesh.material.roughness !== 0.75) infra('folha-f7-metal: aplicação não mudou material');
    alvoInfo = 'std:F7:infill:d';
  } else if (MUTANTE === 'std-drawrange') {
    exigeStd();
    const e = alvo('std:F6:base');
    const g = e.mesh.geometry, total = g.index.count, antes = g.drawRange.count;
    if (e.bl.start !== 0) infra('std-drawrange: alvo esperado não é o primeiro bloco');
    g.setDrawRange(36, total - 36);
    if (g.drawRange.count === antes) infra('std-drawrange: aplicação não mudou drawRange');
    alvoInfo = 'std:F6:base truncado';
  } else if (MUTANTE === 'std-grupo-oculto') {
    exigeStd();
    const e = alvo('std:F6:base');
    const g = e.mesh.geometry, m0 = Array.isArray(e.mesh.material) ? e.mesh.material[0] : e.mesh.material;
    const m1 = m0.clone();
    m1.visible = false;
    e.mesh.material = [m0, m1];
    g.clearGroups();
    g.addGroup(0, e.bl.start, 0);
    g.addGroup(e.bl.start, 36, 1);
    g.addGroup(e.bl.start + 36, g.index.count - e.bl.start - 36, 0);
    if (!g.groups.some((gr) => gr.materialIndex === 1)) infra('std-grupo-oculto: aplicação não criou grupo oculto');
    alvoInfo = 'std:F6:base grupo oculto';
  }
  // coordenadas/matrizes imutáveis: mutante só pode tocar UV/userData/material/visibilidade/bloco alvo
  if (raster) {
    const m = fim.material, original = materialDados(rasterMaterialAntes), aplicado = materialDados(m);
    const alterados = MUTANTE === 'fim-raster-blend-zero'
      ? ['blending', 'blendSrc', 'blendDst', 'blendEquation'] : ['depthFunc'];
    for (const k of alterados) aplicado[k] = original[k];
    if (m === rasterMaterialAntes || digest(aplicado) !== digest(original)
      || ['alphaTest', 'opacity', 'transparent'].some(k => m[k] !== rasterMaterialAntes[k]))
      infra('raster: clone alterou material/alpha fora dos campos previstos');
    // Repor só o binding original deve recuperar o digest inteiro (UV/índices/grupos/física incluídos).
    fim.material = rasterMaterialAntes;
    const restanteIntacto = hashCena(W1) === SHA_ESTRUTURAL;
    fim.material = m;
    if (!restanteIntacto) infra('raster: mutação alterou cena fora do único material alvo');
  }
  if (!antigo) for (const m of [...inv.fims, ...inv.stds]) m.geometry.computeBoundingBox();
  const intactas = gs.every((g, i) => g.matrixWorld.equals(antes.guards[i])) && JSON.stringify(snapEstrutural(W1)) === JSON.stringify(antes.snap);
  console.log(`  [mutante:${MUTANTE}] matrizes/AABBs/extremos intactos pós-mutação: ${intactas}`);
  if (!intactas) { console.error('infraestrutura: mutante vazou para posição/escala — aborta'); process.exit(3); }
  if (hashCena(W1) === SHA_ESTRUTURAL) infra('mutante não alterou atributos/índices/material/lock/desenho reais');
  console.log(`CAMPO-MUTANTE ${JSON.stringify({ name: MUTANTE, aplicado: true, ...(alvoInfo ? { target: alvoInfo } : {}) })}`);
  const pos = avaliar(W1, `mut:${MUTANTE}`);
  const pos8 = avaliarCU8(W1, `mut:${MUTANTE}`);
  for (const c of [...pos, clausulas[6], pos8]) console.log(`${c.id} ${c.ok ? 'PASSA' : 'FALHA'} — protocolo`);
  const vermelhas = [...pos, clausulas[6], pos8].filter((c) => !c.ok).map((c) => c.id);
  console.log(`\nCAMPO-UV-FINISH mutante ${MUTANTE}: cláusulas vermelhas = [${vermelhas.join(', ') || 'NENHUMA'}]`);
  process.exit(vermelhas.length ? 1 : 0);
}

for (const c of clausulas) console.log(`${c.id} ${c.ok ? 'PASSA' : 'FALHA'} — protocolo`);
const verde = nominalVerde;
console.log(`\nCAMPO-UV-FINISH ${verde ? 'VERDE' : 'VERMELHA'} · ${clausulas.filter((c) => c.ok).length}/${clausulas.length}`);
process.exit(verde ? 0 : 1);
