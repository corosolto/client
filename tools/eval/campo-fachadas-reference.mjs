#!/usr/bin/env node
// Gerador offline da referência de fachadas do Campo (CU-5, Fase 1 da proposta R32); fonte congelada
// audits/2026-10-31-visual-consistency/CAMPO-CU5-APPROVED-ORIGINAL-7ca2.js; NÃO lê a candidata nem o R25.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const GENERATOR_PATH = 'tools/eval/campo-fachadas-reference.mjs';
export const GENERATOR_VERSION = '1.2.0';
export const SOURCE_SHA256 = '7ca2a7de566134c4aa45dad0213e8d2257f1aaef7a5b0a34621ed3a49cb73631';
export const SOURCE_COMMIT = '26ea02f088f27607335c8a66933a6626eac400df';
export const SOURCE_REPO_PATH = 'public/js/map_campomorro.js';
export const DESIGN_R22_SHA256 = '196458efed8c47040d7f4f3567a2fe92b6fc49233ccb876a12a937b9682cef5c';
export const DESIGN_R23_SHA256 = '1bf5bb5ed43553b9d969db15146e23f1d336291a85b01616c300e466ba92ddab';
export const DESIGN_VERSION = `R22 ${DESIGN_R22_SHA256}; desenho RO CAMPO-M3-PROPOSTA-R23.md ${DESIGN_R23_SHA256}`;
export const SEED = 7717;
export const MATCH_TOLERANCE = 1e-4;   // mesma procedência do campo-boundary-finish-check (Float32)
export const SCHEMA_VERSION = 1;
// Selo do JSON aprovado: regeneração offline explícita; a carga normal nunca atualiza dados.
export const FIXTURE_SHA256 = 'db72b51f8cd963a4b3b2947e76b5097f1832701a75ca99c8f67ce8db7db3aae1';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_FIXTURE = join(HERE, 'fixtures', 'campo-fachadas-inventory.json');
const REPO_ROOT = resolve(HERE, '..', '..');

export const PROFILE_IDS = Object.freeze({ 0: 'original', 1: 'r22', 2: 'r23' });
export const PROFILE_BY_NAME = Object.freeze({ original: 0, r22: 1, r23: 2 });
// batches std / materiais distintos: R22 7/7, R23 8/8 (roofPainted matte), original 0/0.
export const STD_BATCHES = Object.freeze({ 0: 0, 1: 7, 2: 8 });
export const COUNTS = deepFreeze({
  baseline: 202, excluded: 15, fimAdded: 37,
  stdCommon: 13, stdExtra: { r22: 16, r23: 37 },
  finishByProfile: { 0: 202, 1: 224, 2: 224 },
  stdByProfile: { 0: 0, 1: 29, 2: 50 },
  stdFacade: { r22: { F6: 10, F7: 9, F8: 10 }, r23: { F6: 18, F7: 14, F8: 18 } },
  fimFacade: { F6: 15, F7: 7, F8: 15 },
});

// ----- Desenho original aprovado (fonte 7ca2): cotas base e fórmula do morro -----
const FIELD_X = 20, FIELD_Z = 12.5, FIELD_Y = -0.08;
const encosta = (d) => (d <= 0 ? 0 : d * d / (d + 5));
const morroBaseLiteral = (x, z) => FIELD_Y
  + 0.34 * encosta(-x - FIELD_X)
  + 0.20 * encosta(-z - FIELD_Z)
  + 0.11 * encosta(z - FIELD_Z)
  + 0.07 * encosta(x - FIELD_X);

export const MODULE_CENTERS_X = Object.freeze({ F6: 10.5, F7: 17.5, F8: 24.5 });
export const MODULE_ROW_Z = 30;
function moduleBases() {
  return {
    F6: morroBaseLiteral(MODULE_CENTERS_X.F6, MODULE_ROW_Z),
    F7: morroBaseLiteral(MODULE_CENTERS_X.F7, MODULE_ROW_Z),
    F8: morroBaseLiteral(MODULE_CENTERS_X.F8, MODULE_ROW_Z),
  };
}

// ----- Utilidades -----
const r6 = (v) => { const r = Math.round(v * 1e6) / 1e6; return r === 0 ? 0 : r; };
const rbox = (b) => b.map(r6);
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
const sha256File = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
function piece(id, role, mat, cast, x0, x1, y0, y1, z0, z1) {
  return { id, role, mat, cast, box: rbox([x0, y0, z0, x1, y1, z1]) };
}
// x/y relativos ao centro/base do módulo; z sempre absoluto.
const rel = (f, xr, yr, zr) => {
  const cx = MODULE_CENTERS_X[f], base = moduleBases()[f];
  return [cx + xr[0], cx + xr[1], base + yr[0], base + yr[1], zr[0], zr[1]];
};

// ----- Literais de desenho: vãos (cxRel, yRel, w, h, porta) -----
const v = (name, cx, y, w, h, porta) => ({ name, cx, y, w, h, porta });
const VAOS = {
  r22: {
    F6: [v('dL', -1.9, .02, .95, 1.95, true), v('wL', -.9, 2.5, .95, .6, false),
         v('dR', 1.2, .02, .9, 1.9, true), v('wR', 1.2, 2.45, .8, .6, false)],
    F7: [v('d', -1, .02, 1.6, 1.95, true), v('w', 1.1, .45, 1.5, 1.5, false)],
    F8: [v('dL', -1.9, .02, .95, 1.95, true), v('wL', -1.9, 2.4, .9, .7, false),
         v('dR', 1.5, .02, 1.6, 1.95, true), v('wR', 1.5, 2.35, 1.5, .5, false)],
  },
  r23: {
    F6: [v('dL', -1.9, .02, .95, 1.95, true), v('wL', -1.9, 3.05, .95, .6, false),
         v('dR', 1.2, .02, .9, 1.9, true), v('wR', 1.2, 3.05, .9, .6, false)],
    F7: [v('d', -1, .02, 1.6, 1.95, true), v('w', 1.1, .45, 1.5, 1.5, false)],
    F8: [v('dL', -1.9, .02, .95, 1.95, true), v('wL', -1.9, 2.4, .95, .7, false),
         v('dR', 1.5, .02, 1.6, 1.95, true), v('wR', 1.5, 2.35, 1.6, .5, false)],
  },
};
const FIM_Z = {
  r22: { verga: [29.56, 29.84], ombro: [29.56, 29.80], peitoril: [29.56, 29.90] },
  r23: { verga: [29.56, 29.63], ombro: [29.56, 29.63], peitoril: [29.56, 29.63] },
};
const JUNTAS = [{ f: 'F6', h: 4.65 }, { f: 'F8', h: 3.55 }];   // x rel [.27,.53], z [29.57,29.73]

// Verga/ombros/peitoril por vão; juntas só F6/F8; roles finishConcrete, cast true.
function fimAdditions(profileName) {
  const z = FIM_Z[profileName], out = [];
  for (const f of ['F6', 'F7', 'F8']) for (const g of VAOS[profileName][f]) {
    const { name, cx, y, w, h, porta } = g, id = (p) => `fim:${f}:${name}:${p}`;
    out.push(piece(id('verga'), 'verga', 'finishConcrete', true,
      ...rel(f, [cx - w / 2 - .13, cx + w / 2 + .13], [y + h, y + h + .09], z.verga)));
    out.push(piece(id('ombroL'), 'ombro', 'finishConcrete', true,
      ...rel(f, [cx - w / 2 - .13, cx - w / 2], [y, y + h], z.ombro)));
    out.push(piece(id('ombroR'), 'ombro', 'finishConcrete', true,
      ...rel(f, [cx + w / 2, cx + w / 2 + .13], [y, y + h], z.ombro)));
    if (!porta) out.push(piece(id('peitoril'), 'peitoril', 'finishConcrete', true,
      ...rel(f, [cx - w / 2 - .17, cx + w / 2 + .17], [y - .09, y], z.peitoril)));
  }
  for (const j of JUNTAS)
    out.push(piece(`fim:${j.f}:junta`, 'junta', 'finishConcrete', true,
      ...rel(j.f, [.27, .53], [0, j.h], [29.57, 29.73])));
  return out;
}

// ----- Std piloto: 13 comuns (compartilhados uma vez) + extras por perfil -----
function stdCommon() {
  const p = (id, f, role, mat, xr, yr, zr) =>
    piece(`std:${f}:${id}`, role, mat, true, ...rel(f, xr, yr, zr));
  return [
    p('base', 'F6', 'base', 'concrete', [-3.2, 3.2], [0, .18], [29.57, 29.77]),
    p('base', 'F7', 'base', 'concrete', [-3.2, 3.2], [0, .18], [29.57, 29.77]),
    p('base', 'F8', 'base', 'concrete', [-3.2, 3.2], [0, .18], [29.57, 29.77]),
    p('cinta', 'F6', 'cinta', 'concrete', [-3.15, .45], [2.08, 2.21], [29.56, 29.84]),
    p('cinta', 'F7', 'cinta', 'concrete', [-2.625, 2.625], [2.08, 2.24], [29.56, 29.84]),
    p('cinta', 'F8', 'cinta', 'concrete', [-3.15, .45], [2.08, 2.21], [29.56, 29.84]),
    p('pilar:L', 'F7', 'pilar', 'concrete', [-3.175, -2.625], [0, 3], [29.57, 29.79]),
    p('pilar:R', 'F7', 'pilar', 'concrete', [2.625, 3.175], [0, 3], [29.57, 29.79]),
    p('coroa:L', 'F6', 'coroa', 'roof', [-3.15, .45], [4.53, 4.65], [29.56, 29.94]),
    p('coroa:R', 'F6', 'coroa', 'roof', [.3, 3.2], [4.23, 4.35], [29.56, 29.94]),
    p('coroa', 'F7', 'coroa', 'roof', [-3.2, 3.2], [2.88, 3], [29.56, 29.94]),
    p('coroa:L', 'F8', 'coroa', 'roof', [-3.15, .45], [3.43, 3.55], [29.56, 29.94]),
    p('coroa:R', 'F8', 'coroa', 'roof', [.3, 3.2], [3.13, 3.25], [29.56, 29.94]),
  ];
}

const INFILL_Z = { r22: [29.625, 29.675], r23: [29.70, 29.75] };
function infills(profileName) {
  const zr = INFILL_Z[profileName], out = [];
  for (const f of ['F6', 'F7', 'F8']) for (const g of VAOS[profileName][f]) {
    const mat = g.porta ? (profileName === 'r23' && f === 'F7' ? 'roofPainted' : 'door') : 'glass';
    out.push(piece(`std:${f}:infill:${g.name}`, g.porta ? 'infill-porta' : 'infill-janela',
      mat, false, ...rel(f, [g.cx - g.w / 2, g.cx + g.w / 2], [g.y, g.y + g.h], zr)));
  }
  return out;
}

function stdExtraR22() {
  const p = (id, f, role, mat, xr, yr, zr) =>
    piece(`std:${f}:${id}`, role, mat, true, ...rel(f, xr, yr, zr));
  const parede = [29.63, 29.75];
  return [
    p('parede:L', 'F6', 'parede', 'wall', [-3.1, .4], [0, 4.65], parede),
    p('parede:R', 'F6', 'parede', 'concrete', [.4, 3.1], [0, 4.35], parede),
    p('parede', 'F7', 'parede', 'tintaZ7', [-3.2, 3.2], [0, 3], parede),
    p('parede:L', 'F8', 'parede', 'tintaZ3', [-3.1, .4], [0, 3.55], parede),
    p('parede:R', 'F8', 'parede', 'wall', [.4, 3.1], [0, 3.25], parede),
    p('remendo', 'F7', 'remendo', 'wall', [.5, 2.625], [2.35, 2.95], [29.57, 29.73]),
    ...infills('r22'),
  ];
}

function stdExtraR23() {
  const pano = (f, mat, n, xr, yr) =>
    piece(`std:${f}:pano:${n}`, 'pano', mat, true, ...rel(f, xr, yr, [29.63, 29.75]));
  const panos = [
    pano('F6', 'wall', 0, [-3.1, -2.375], [0, 4.65]), pano('F6', 'wall', 1, [-1.425, .4], [0, 4.65]),
    pano('F6', 'wall', 2, [-2.375, -1.425], [0, .02]), pano('F6', 'wall', 3, [-2.375, -1.425], [1.97, 3.05]),
    pano('F6', 'wall', 4, [-2.375, -1.425], [3.65, 4.65]),
    pano('F6', 'concrete', 5, [.4, .75], [0, 4.35]), pano('F6', 'concrete', 6, [1.65, 3.1], [0, 4.35]),
    pano('F6', 'concrete', 7, [.75, 1.65], [0, .02]), pano('F6', 'concrete', 8, [.75, 1.65], [1.92, 3.05]),
    pano('F6', 'concrete', 9, [.75, 1.65], [3.65, 4.35]),
    pano('F7', 'tintaZ7', 0, [-3.2, -1.8], [0, 3]), pano('F7', 'tintaZ7', 1, [-.2, .35], [0, 3]),
    pano('F7', 'tintaZ7', 2, [1.85, 3.2], [0, 3]), pano('F7', 'tintaZ7', 3, [-1.8, -.2], [0, .02]),
    pano('F7', 'tintaZ7', 4, [-1.8, -.2], [1.97, 3]), pano('F7', 'tintaZ7', 5, [.35, 1.85], [0, .45]),
    pano('F7', 'tintaZ7', 6, [.35, 1.85], [1.95, 3]),
    pano('F8', 'tintaZ3', 0, [-3.1, -2.375], [0, 3.55]), pano('F8', 'tintaZ3', 1, [-1.425, .4], [0, 3.55]),
    pano('F8', 'tintaZ3', 2, [-2.375, -1.425], [0, .02]), pano('F8', 'tintaZ3', 3, [-2.375, -1.425], [1.97, 2.4]),
    pano('F8', 'tintaZ3', 4, [-2.375, -1.425], [3.1, 3.55]),
    pano('F8', 'wall', 5, [.4, .7], [0, 3.25]), pano('F8', 'wall', 6, [2.3, 3.1], [0, 3.25]),
    pano('F8', 'wall', 7, [.7, 2.3], [0, .02]), pano('F8', 'wall', 8, [.7, 2.3], [1.97, 2.35]),
    pano('F8', 'wall', 9, [.7, 2.3], [2.85, 3.25]),
  ];
  return [...panos, ...infills('r23')];
}

// ----- Baseline 202: tabela analítica do desenho 7ca2 (conferência por bijeção exata) -----
// Só geração offline: IDs e bijeção das 12 coroas do campo + 90 peças X + 100 Z, fonte 7ca2.
function baselineAnalytic() {
  const out = [];
  const e = (id, x, y, z, w, h, d) => out.push({ id, box: [x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2] });
  const pairsX = [[-20, -14.8], [-10.2, -2.2], [2.2, 10.2], [14.8, 20]];
  const pairsZ = [[-FIELD_Z, -2.2], [2.2, FIELD_Z]];
  for (let k = 0; k < 4; k++) {
    const [a, b] = pairsX[k];
    for (const sz of [-FIELD_Z, FIELD_Z])
      e(`coroa:${sz < 0 ? 'zneg' : 'zpos'}:i${k}`, (a + b) / 2, FIELD_Y + 1.05, sz, b - a + .12, .09, .5);
  }
  for (let k = 0; k < 2; k++) {
    const [a, b] = pairsZ[k];
    for (const sx of [-20, 20])
      e(`coroa:${sx < 0 ? 'xneg' : 'xpos'}:i${k}`, sx, FIELD_Y + 1.05, (a + b) / 2, .5, .09, b - a + .12);
  }
  const push = (id, x, y, z, w, h, d) => e(id, x, y, z, w, h, d);
  for (const sx of [-36, 36]) {
    const s = sx < 0 ? 'xneg' : 'xpos', sgn = Math.sign(sx);
    for (let k = 0; k < 9; k++) {
      const z = -26 + 6.5 * k, base = morroBaseLiteral(sx, z), h = 3.2 + (k % 3) * .72,
        fx = sx - sgn * .31, yv = base + 1.25 + (k % 2) * .42, p = (r, w2, h2, d2, x2, y2, z2) =>
          push(`fim:${s}:i${k}:${r}`, x2, y2, z2, w2, h2, d2);
      p('verga', .18, .09, 1.32, fx, yv + .82, z - 1.25);
      p('peitoril', .2, .07, 1.32, fx, yv - .07, z - 1.25);
      p('faixa', .16, .6, 5.9, fx, base - .05, z);
      p('borda-', .22, h + .12, .5, fx, base, z - 2.95);
      p('borda+', .22, h + .12, .5, fx, base, z + 2.95);
    }
  }
  for (const sz of [-30, 30]) {
    const s = sz < 0 ? 'zneg' : 'zpos', sgn = Math.sign(sz);
    for (let k = 0; k < 10; k++) {
      const x = -31.5 + 7 * k, base = morroBaseLiteral(x, sz), h = 3 + ((k + (sz > 0 ? 1 : 0)) % 4) * .55,
        fz = sz - sgn * .31, yv = base + 1.25 + (k % 2) * .38, p = (r, w2, h2, d2, x2, y2, z2) =>
          push(`fim:${s}:i${k}:${r}`, x2, y2, z2, w2, h2, d2);
      p('verga', 1.32, .09, .18, x - 1.4, yv + .78, fz);
      p('peitoril', 1.32, .07, .2, x - 1.4, yv - .07, fz);
      p('faixa', 5.9, .6, .16, x, base - .05, fz);
      p('borda-', .5, h + .12, .22, x - 2.95, base, fz);
      p('borda+', .5, h + .12, .22, x + 2.95, base, fz);
    }
  }
  return out;
}

const EXCLUDED_LEGACY_IDS = ['i6', 'i7', 'i8'].flatMap((i) =>
  ['verga', 'peitoril', 'faixa', 'borda-', 'borda+'].map((r) => `fim:zpos:${i}:${r}`));
const EXCLUDED_ID_RE = /^fim:zpos:i[678]:(verga|peitoril|faixa|borda-|borda\+)$/;

// ----- Validação fail-closed -----
const MATS = ['junta', 'finishConcrete', 'concrete', 'wall', 'roof', 'roofPainted', 'door', 'glass', 'tintaZ7', 'tintaZ3'];
const ROLES = ['coroa', 'verga', 'ombro', 'peitoril', 'faixa', 'borda', 'junta',
  'base', 'cinta', 'pilar', 'parede', 'remendo', 'infill-porta', 'infill-janela', 'pano'];
const TOP_KEYS = ['schemaVersion', 'generator', 'provenance', 'baseline', 'excludedLegacy', 'stdCommon', 'profiles'];
const PROV_KEYS = ['sourceSha256', 'sourceCommit', 'sourceRepoPath', 'seed', 'designVersion',
  'moduleCentersX', 'moduleBases', 'adaptation', 'extraction', 'dependencies'];
const DEP_PATHS = ['public/js/mapprops.js', 'public/vendor/three.module.js', 'tools/eval/harness.mjs'];
const SHA_RE = /^[0-9a-f]{64}$/;
const PIECE_KEYS = ['id', 'role', 'mat', 'cast', 'box'];

function fail(msg) { throw new Error(`fixture inválido: ${msg}`); }
function exactKeys(obj, keys, what) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)
    || JSON.stringify(Object.keys(obj).sort()) !== JSON.stringify([...keys].sort()))
    fail(`${what}: campos desconhecidos/ausentes (esperado ${keys.join(',')})`);
}
function checkPiece(p, mats) {
  exactKeys(p, PIECE_KEYS, 'peça');
  if (typeof p.id !== 'string' || !p.id) fail('id ausente');
  if (!ROLES.includes(p.role)) fail(`role desconhecida "${p.role}" em ${p.id}`);
  if (!mats.includes(p.mat)) fail(`mat desconhecido "${p.mat}" em ${p.id}`);
  if (typeof p.cast !== 'boolean') fail(`cast não booleano em ${p.id}`);
  if (!Array.isArray(p.box) || p.box.length !== 6 || p.box.some((n) => typeof n !== 'number' || !Number.isFinite(n)))
    fail(`bbox malformata em ${p.id}`);
  const [x0, y0, z0, x1, y1, z1] = p.box;
  if (!(x1 > x0 && y1 > y0 && z1 > z0)) fail(`bbox não positiva em ${p.id}`);
}
export function validateFixture(value) {
  if (!value || typeof value !== 'object') fail('ausente');
  exactKeys(value, TOP_KEYS, 'topo');
  if (value.schemaVersion !== SCHEMA_VERSION) fail('schemaVersion');
  exactKeys(value.generator, ['path', 'version'], 'generator');
  if (value.generator.path !== GENERATOR_PATH || value.generator.version !== GENERATOR_VERSION) fail('generator');

  const pv = value.provenance;
  exactKeys(pv, PROV_KEYS, 'provenance');
  if (pv.sourceSha256 !== SOURCE_SHA256 || !SHA_RE.test(pv.sourceSha256)) fail('procedência da fonte');
  if (pv.sourceCommit !== SOURCE_COMMIT) fail('sourceCommit');
  if (pv.sourceRepoPath !== SOURCE_REPO_PATH) fail('sourceRepoPath');
  if (pv.seed !== SEED) fail('seed');
  if (pv.designVersion !== DESIGN_VERSION) fail('designVersion');
  if (typeof pv.adaptation !== 'string' || !pv.adaptation.includes('morroBase') || !pv.adaptation.includes('data URL'))
    fail('adaptation');
  exactKeys(pv.moduleCentersX, ['F6', 'F7', 'F8'], 'moduleCentersX');
  if (pv.moduleCentersX.F6 !== 10.5 || pv.moduleCentersX.F7 !== 17.5 || pv.moduleCentersX.F8 !== 24.5) fail('moduleCentersX');
  exactKeys(pv.moduleBases, ['F6', 'F7', 'F8'], 'moduleBases');
  if (['F6', 'F7', 'F8'].some((f) => typeof pv.moduleBases[f] !== 'number' || !Number.isFinite(pv.moduleBases[f])))
    fail('moduleBases');
  exactKeys(pv.extraction, ['mesh', 'blocks', 'vertsPerBlock', 'indicesPerBlock', 'tolerance'], 'extraction');
  if (pv.extraction.mesh !== 'favelaFinish=campo' || pv.extraction.blocks !== 202
    || pv.extraction.vertsPerBlock !== 24 || pv.extraction.indicesPerBlock !== 36
    || pv.extraction.tolerance !== MATCH_TOLERANCE) fail('extraction');
  if (!Array.isArray(pv.dependencies) || pv.dependencies.length !== DEP_PATHS.length) fail('dependencies');
  if (JSON.stringify(pv.dependencies.map((d) => d.path).sort()) !== JSON.stringify([...DEP_PATHS].sort()))
    fail(`dependencies: esperado exatamente ${DEP_PATHS.join(', ')}`);
  for (const d of pv.dependencies) {
    exactKeys(d, ['path', 'sha256'], 'dependency');
    if (!SHA_RE.test(d.sha256)) fail(`dependency ${d.path}: sha256 não é 64 hex lowercase`);
    if (d.path.startsWith('/') || d.path.split('/').includes('..')) fail(`dependency ${d.path}: path não relativo conhecido`);
  }

  const baseIds = new Set();
  const base = value.baseline;
  exactKeys(base, ['count', 'pieces'], 'baseline');
  if (base.count !== 202 || !Array.isArray(base.pieces) || base.pieces.length !== 202) fail('baseline 202');
  const classes = { coroa: 0, xside: 0, zside: 0 };
  for (const p of base.pieces) {
    checkPiece(p, MATS);
    if (baseIds.has(p.id)) fail(`id duplicado ${p.id}`); baseIds.add(p.id);
    if (p.mat !== 'junta' || p.cast !== true) fail(`baseline ${p.id}: material/cast do merge original`);
    if (!['coroa', 'verga', 'peitoril', 'faixa', 'borda'].includes(p.role)) fail(`baseline ${p.id}: role`);
    if (/^coroa:(?:z(?:neg|pos):i[0-3]|x(?:neg|pos):i[01])$/.test(p.id)) classes.coroa++;
    else if (/^fim:x(?:neg|pos):i[0-8]:(?:verga|peitoril|faixa|borda-|borda\+)$/.test(p.id)) classes.xside++;
    else if (/^fim:z(?:neg|pos):i[0-9]:(?:verga|peitoril|faixa|borda-|borda\+)$/.test(p.id)) classes.zside++;
    else fail(`baseline ${p.id}: id fora do papel semântico do desenho 7ca2`);
    const role = p.id.startsWith('coroa:') ? 'coroa' : p.id.split(':')[3].replace(/[+-]$/, '');
    if (p.role !== role) fail(`baseline ${p.id}: role divergente do ID`);
  }
  if (baseIds.size !== 202) fail('baseline ids únicos');
  if (classes.coroa !== 12 || classes.xside !== 90 || classes.zside !== 100)
    fail(`classificação baseline: ${JSON.stringify(classes)} (esperado coroa 12, fachadas X 90, Z 100)`);

  exactKeys(value.excludedLegacy, ['count', 'ids'], 'excludedLegacy');
  if (value.excludedLegacy.count !== 15 || !Array.isArray(value.excludedLegacy.ids)
    || value.excludedLegacy.ids.length !== 15) fail('excluded 15');
  if (new Set(value.excludedLegacy.ids).size !== 15) fail('excluded ids duplicados');
  for (const id of value.excludedLegacy.ids) {
    if (!EXCLUDED_ID_RE.test(id)) fail(`excluído ${id}: papel não é fim zpos i6/i7/i8`);
    if (!baseIds.has(id)) fail(`excluído ${id} fora da baseline`);
  }

  if (!Array.isArray(value.stdCommon) || value.stdCommon.length !== COUNTS.stdCommon) fail('stdCommon 13');
  for (const p of value.stdCommon) {
    checkPiece(p, MATS);
    if (!/^std:F[678]:/.test(p.id)) fail(`stdCommon: id ${p.id}`);
    if (baseIds.has(p.id)) fail(`id duplicado ${p.id}`); baseIds.add(p.id);
  }

  const commonFacade = { F6: 0, F7: 0, F8: 0 };
  for (const p of value.stdCommon) commonFacade[p.id.split(':')[1]]++;

  exactKeys(value.profiles, ['r22', 'r23'], 'profiles');
  for (const pn of ['r22', 'r23']) {
    const pr = value.profiles[pn];
    exactKeys(pr, ['fimAdded', 'stdExtra'], `profiles.${pn}`);
    exactKeys(pr.fimAdded, ['count', 'pieces'], `${pn}.fimAdded`);
    exactKeys(pr.stdExtra, ['count', 'pieces'], `${pn}.stdExtra`);
    if (pr.fimAdded.count !== 37 || !Array.isArray(pr.fimAdded.pieces) || pr.fimAdded.pieces.length !== 37) fail(`${pn}.fimAdded 37`);
    if (pr.stdExtra.count !== COUNTS.stdExtra[pn] || !Array.isArray(pr.stdExtra.pieces)
      || pr.stdExtra.pieces.length !== COUNTS.stdExtra[pn])
      fail(`${pn}.stdExtra ${COUNTS.stdExtra[pn]} (13 comuns contam uma vez, na expansão)`);
    // Escopo de unicidade é POR PERFIL: r22 e r23 repetem intencionalmente os mesmos papéis.
    const scopeIds = new Set(baseIds);
    const facade = (obj) => {
      const per = { F6: 0, F7: 0, F8: 0 };
      for (const p of obj.pieces) {
        checkPiece(p, MATS);
        if (scopeIds.has(p.id)) fail(`id duplicado no perfil ${pn}: ${p.id}`);
        scopeIds.add(p.id);
        const f = p.id.split(':')[1];
        if (!Object.hasOwn(per, f)) fail(`fachada desconhecida em ${p.id}`);
        per[f]++;
      }
      return per;
    };
    const fimPer = facade(pr.fimAdded), extraPer = facade(pr.stdExtra);
    if (JSON.stringify(fimPer) !== JSON.stringify(COUNTS.fimFacade))
      fail(`${pn}: fim por fachada ${JSON.stringify(fimPer)}`);
    const stdFacade = { F6: commonFacade.F6 + extraPer.F6, F7: commonFacade.F7 + extraPer.F7, F8: commonFacade.F8 + extraPer.F8 };
    if (JSON.stringify(stdFacade) !== JSON.stringify(COUNTS.stdFacade[pn]))
      fail(`${pn}: std por fachada ${JSON.stringify(stdFacade)} (comum 13 contado uma vez)`);
    for (const p of pr.fimAdded.pieces)
      if (!/^fim:F[678]:(?:(?:dL|dR|wL|wR|d|w):(?:verga|ombroL|ombroR|peitoril)|junta)$/.test(p.id)
        || p.mat !== 'finishConcrete' || p.cast !== true
        || !['verga', 'ombro', 'peitoril', 'junta'].includes(p.role)) fail(`${p.id}: papel fim novo`);
    for (const p of pr.stdExtra.pieces) {
      if (!/^std:F[678]:(?:parede(?::[LR])?|remendo|pano:\d+|infill:(?:dL|dR|wL|wR|d|w))$/.test(p.id))
        fail(`${p.id}: papel std novo`);
      if (p.cast !== !p.id.includes(':infill:')) fail(`${p.id}: cast incompatível com infill/estrutura`);
    }
    const tally = {};
    for (const p of pr.stdExtra.pieces) tally[p.mat] = (tally[p.mat] || 0) + 1;
    for (const p of value.stdCommon) tally[p.mat] = (tally[p.mat] || 0) + 1;
    const norm = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
    const want = pn === 'r22'
      ? { concrete: 9, wall: 3, roof: 5, door: 5, glass: 5, tintaZ7: 1, tintaZ3: 1 }
      : { concrete: 13, wall: 10, roof: 5, roofPainted: 1, door: 4, glass: 5, tintaZ7: 7, tintaZ3: 5 };
    if (norm(tally) !== norm(want)) fail(`${pn}: materiais ${JSON.stringify(tally)} vs ${JSON.stringify(want)}`);
  }
  return true;
}

export function loadFixture(path = DEFAULT_FIXTURE) {
  if (!FIXTURE_SHA256) throw new Error('FIXTURE_SHA256 vazio: fixture não lacrado — gere e sele antes de usar');
  if (!SHA_RE.test(FIXTURE_SHA256)) throw new Error('FIXTURE_SHA256 não é 64 hex lowercase');
  if (!existsSync(path)) throw new Error(`fixture ausente: ${path}`);
  const buf = readFileSync(path);
  const got = createHash('sha256').update(buf).digest('hex');
  if (got !== FIXTURE_SHA256) throw new Error(`hash do fixture diverge: ${got} != ${FIXTURE_SHA256}`);
  const value = JSON.parse(buf.toString('utf8'));
  validateFixture(value);
  return deepFreeze(value);
}

// ----- Expansão de esperado por perfil (Fase 1: dados, sem comparador/CU-8) -----
export function expectedForProfile(fixture, profile) {
  const p = typeof profile === 'string' ? PROFILE_BY_NAME[profile] : profile;
  if (typeof p !== 'number' || !Number.isInteger(p) || !(p >= 0 && p <= 2))
    throw new Error(`perfil desconhecido: ${profile}`);
  if (!Object.hasOwn(PROFILE_IDS, p)) throw new Error(`perfil desconhecido: ${profile}`);
  validateFixture(fixture);
  if (p === 0) return deepFreeze({ profile: 'original', finish: fixture.baseline.pieces, std: [],
    counts: { finish: 202, std: 0, stdBatches: 0 } });
  const pn = PROFILE_IDS[p];
  const excluded = new Set(fixture.excludedLegacy.ids);
  const retained = fixture.baseline.pieces.filter((x) => !excluded.has(x.id));
  if (retained.length !== 187) throw new Error(`baseline retida ${retained.length} (esperado 187 = 202-15)`);
  const finish = [...retained, ...fixture.profiles[pn].fimAdded.pieces];
  const std = [...fixture.stdCommon, ...fixture.profiles[pn].stdExtra.pieces];
  if (finish.length !== COUNTS.finishByProfile[p] || std.length !== COUNTS.stdByProfile[p])
    throw new Error(`expansão ${pn}: contagens incoerentes`);
  return deepFreeze({ profile: pn, finish, std, counts: { finish: finish.length, std: std.length, stdBatches: STD_BATCHES[p] } });
}

// ----- Serialização determinística (uma peça por linha) -----
function pieceLines(arr) { return arr.map((p) => JSON.stringify(p)).join(',\n'); }
function serializeFixture(data) {
  const pv = data.provenance;
  const dep = pv.dependencies.map((d) => JSON.stringify(d)).join(',\n');
  const prof = (pn) =>
    `"fimAdded": {\n"count": ${data.profiles[pn].fimAdded.count},\n"pieces": [\n${pieceLines(data.profiles[pn].fimAdded.pieces)}\n]\n},\n` +
    `"stdExtra": {\n"count": ${data.profiles[pn].stdExtra.count},\n"pieces": [\n${pieceLines(data.profiles[pn].stdExtra.pieces)}\n]\n}`;
  return `{
"schemaVersion": ${SCHEMA_VERSION},
"generator": ${JSON.stringify(data.generator)},
"provenance": {
"sourceSha256": "${pv.sourceSha256}",
"sourceCommit": "${pv.sourceCommit}",
"sourceRepoPath": "${pv.sourceRepoPath}",
"seed": ${pv.seed},
"designVersion": ${JSON.stringify(pv.designVersion)},
"moduleCentersX": ${JSON.stringify(pv.moduleCentersX)},
"moduleBases": ${JSON.stringify(pv.moduleBases)},
"adaptation": ${JSON.stringify(pv.adaptation)},
"extraction": ${JSON.stringify(pv.extraction)},
"dependencies": [${dep}]
},
"baseline": {
"count": ${data.baseline.count},
"pieces": [
${pieceLines(data.baseline.pieces)}
]
},
"excludedLegacy": ${JSON.stringify({ count: 15, ids: EXCLUDED_LEGACY_IDS })},
"stdCommon": [
${pieceLines(data.stdCommon)}
],
"profiles": {
"r22": {
${prof('r22')}
},
"r23": {
${prof('r23')}
}
}
}
`;
}

// ----- Geração a partir do fonte aprovado (CLI) -----
const VENDOR_THREE = 'public/vendor/three.module.js';
const VENDOR_ADDONS = 'public/vendor/addons';
const ADAPTATION = 'fonte congelado importado via data URL (sem escrita em disco, sem corrida entre worktrees) '
  + "com 'export { morroBase }' readonly acrescentado; imports 'three'→vendor real e './x.js'→public/js do worktree via file URL";

// Confere a ponte node_modules→vendor ANTES de qualquer import; não cria nem repara nada.
function preflightBridge() {
  const problems = [];
  const sameReal = (a, b) => { try { return realpathSync(a) === realpathSync(b); } catch { return false; } };
  const threePath = join(REPO_ROOT, VENDOR_THREE), addonsPath = join(REPO_ROOT, VENDOR_ADDONS);
  if (!existsSync(threePath) || !existsSync(addonsPath))
    problems.push(`vendor real ausente (${VENDOR_THREE} | ${VENDOR_ADDONS})`);
  if (!sameReal(join(REPO_ROOT, 'node_modules/three/index.js'), threePath))
    problems.push('node_modules/three/index.js não resolve ao vendor real (alias de outro checkout?)');
  if (!sameReal(join(REPO_ROOT, 'node_modules/three/addons'), addonsPath))
    problems.push('node_modules/three/addons não resolve ao addons real (alias de outro checkout?)');
  if (!existsSync(join(HERE, 'harness.mjs'))) problems.push('tools/eval/harness.mjs');
  if (problems.length)
    throw new Error(`ponte harness/vendor ausente — recusando sem reparar: ${problems.join(', ')}`);
}

async function importApprovedModule(text) {
  const threeUrl = pathToFileURL(join(REPO_ROOT, VENDOR_THREE)).href;
  const addonsUrl = pathToFileURL(join(REPO_ROOT, VENDOR_ADDONS)).href;
  const pj = (f) => pathToFileURL(join(REPO_ROOT, 'public/js', f)).href;
  const rewritten = text
    .replace(/(\sfrom\s*)'three'/g, `$1'${threeUrl}'`)
    .replace(/(\sfrom\s*)'three\/addons\/([^']+)'/g, `$1'${addonsUrl}/$2'`)
    .replace(/(\sfrom\s*)'\.\/([^']+)'/g, (_, pre, f) => `${pre}'${pj(f)}'`)
    + '\nexport { morroBase };\n';
  const url = 'data:text/javascript;base64,' + Buffer.from(rewritten, 'utf8').toString('base64');
  return import(url);   // data URL: nenhum arquivo temporário compartilhado
}

function extractBlocks(mesh) {
  const geo = mesh.geometry, idx = geo.index, pos = geo.attributes.position;
  if (!idx || !pos) throw new Error('mesh fim sem index/position');
  if (idx.count % 36 !== 0) throw new Error(`índices ${idx.count} não múltiplos de 36`);
  const n = idx.count / 36;
  if (n !== 202) throw new Error(`blocos fim: ${n} (esperado 202)`);
  mesh.updateWorldMatrix(true, false);
  const m = mesh.matrixWorld.elements;
  const blocks = [];
  for (let b = 0; b < n; b++) {
    const seen = new Set(); let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let k = 36 * b; k < 36 * (b + 1); k++) {
      const i = idx.getX(k);
      if (seen.has(i)) continue; seen.add(i);
      const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
      const wx = m[0] * vx + m[4] * vy + m[8] * vz + m[12];
      const wy = m[1] * vx + m[5] * vy + m[9] * vz + m[13];
      const wz = m[2] * vx + m[6] * vy + m[10] * vz + m[14];
      x0 = Math.min(x0, wx); y0 = Math.min(y0, wy); z0 = Math.min(z0, wz);
      x1 = Math.max(x1, wx); y1 = Math.max(y1, wy); z1 = Math.max(z1, wz);
    }
    if (seen.size !== 24) throw new Error(`bloco ${b}: ${seen.size} vértices únicos (esperado 24)`);
    blocks.push([x0, y0, z0, x1, y1, z1]);
  }
  return blocks;
}

// Bijeção exige correspondência EXATAMENTE ÚNICA por peça; ambiguidade ou sobra é erro.
function matchBijection(blocks) {
  const expected = baselineAnalytic();
  if (expected.length !== 202) throw new Error(`tabela analítica com ${expected.length} peças`);
  const used = new Array(blocks.length).fill(false), byId = {};
  for (const e of expected) {
    const hits = [];
    for (let j = 0; j < blocks.length; j++)
      if (!used[j] && e.box.every((lim, i) => Math.abs(lim - blocks[j][i]) <= MATCH_TOLERANCE)) hits.push(j);
    if (hits.length !== 1)
      throw new Error(`peça ${e.id}: ${hits.length} candidatos (esperado exatamente 1) ${JSON.stringify(e.box)}`);
    used[hits[0]] = true; byId[e.id] = rbox(blocks[hits[0]]);
  }
  const left = used.map((u, j) => (u ? -1 : j)).filter((j) => j >= 0);
  if (left.length) throw new Error(`${left.length} blocos extra sem papel semântico`);
  return Object.entries(byId).sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([id, box]) => {
      const tail = id.split(':')[3] || '';
      return { id, role: tail.startsWith('borda') ? 'borda' : (id.startsWith('coroa:') ? 'coroa' : tail), mat: 'junta', cast: true, box };
    });
}

async function generateData(sourcePath) {
  preflightBridge();
  const text = readFileSync(sourcePath, 'utf8');
  const gotSha = createHash('sha256').update(text).digest('hex');
  if (gotSha !== SOURCE_SHA256) throw new Error(`SHA-256 do fonte diverge do aprovado 7ca2: ${gotSha}`);
  // harness planta o DOM/canvas antes do módulo aprovado entrar; import dinâmico só na geração.
  const harness = await import('./harness.mjs');
  const { initTextures, seedRandom } = harness;
  if (typeof initTextures !== 'function' || typeof seedRandom !== 'function')
    throw new Error(`harness não expõe initTextures/seedRandom (exports: ${Object.keys(harness).join(',')})`);
  const mod = await importApprovedModule(text);
  if (typeof mod.buildCampoMorro !== 'function' || typeof mod.morroBase !== 'function')
    throw new Error('módulo aprovado não expõe buildCampoMorro/morroBase');
  const bases = moduleBases();
  for (const f of ['F6', 'F7', 'F8'])
    if (Math.abs(mod.morroBase(MODULE_CENTERS_X[f], MODULE_ROW_Z) - bases[f]) > 1e-9)
      throw new Error(`morroBase aprovado diverge do literal em ${f}`);
  seedRandom(SEED);
  const T = await initTextures();
  const THREE = await import(pathToFileURL(join(REPO_ROOT, VENDOR_THREE)).href);
  const scene = new THREE.Scene();
  mod.buildCampoMorro(scene, T);
  scene.updateMatrixWorld(true);
  const fimMeshes = [];
  scene.traverse((o) => { if (o.isMesh && o.userData?.favelaFinish === 'campo') fimMeshes.push(o); });
  if (fimMeshes.length !== 1) throw new Error(`meshes favelaFinish=campo: ${fimMeshes.length} (esperado exatamente 1)`);
  const deps = [
    { path: 'tools/eval/harness.mjs', sha256: sha256File(join(HERE, 'harness.mjs')) },
    { path: 'public/js/mapprops.js', sha256: sha256File(join(REPO_ROOT, 'public/js/mapprops.js')) },
    { path: VENDOR_THREE, sha256: sha256File(join(REPO_ROOT, VENDOR_THREE)) },
  ];
  return {
    schemaVersion: SCHEMA_VERSION,
    generator: { path: GENERATOR_PATH, version: GENERATOR_VERSION },
    provenance: {
      sourceSha256: SOURCE_SHA256, sourceCommit: SOURCE_COMMIT, sourceRepoPath: SOURCE_REPO_PATH,
      seed: SEED, designVersion: DESIGN_VERSION,
      moduleCentersX: MODULE_CENTERS_X, moduleBases: bases, adaptation: ADAPTATION,
      extraction: { mesh: 'favelaFinish=campo', blocks: 202, vertsPerBlock: 24, indicesPerBlock: 36, tolerance: MATCH_TOLERANCE },
      dependencies: deps,
    },
    baseline: { count: 202, pieces: matchBijection(extractBlocks(fimMeshes[0])) },
    excludedLegacy: { count: 15, ids: EXCLUDED_LEGACY_IDS },
    stdCommon: stdCommon(),
    profiles: {
      r22: { fimAdded: { count: 37, pieces: fimAdditions('r22') }, stdExtra: { count: COUNTS.stdExtra.r22, pieces: stdExtraR22() } },
      r23: { fimAdded: { count: 37, pieces: fimAdditions('r23') }, stdExtra: { count: COUNTS.stdExtra.r23, pieces: stdExtraR23() } },
    },
  };
}

// ----- CLI -----
const USAGE = `uso:
  --write-approved=<fonte7ca2.js>   gera tools/eval/fixtures/campo-fachadas-inventory.json (só se não existe)
  --verify-approved=<fonte7ca2.js>  regenera e confere serialização completa byte a byte com o fixture
  --validate                        carrega e valida o fixture lacrado default
sem flag, flag desconhecida, duplicada ou opções extras: este uso (exit 2). Falhas explícitas: exit 3.`;

async function runCLI(argv) {
  const single = (name) => argv.length === 1 && argv[0].startsWith(`${name}=`);
  const isValidate = argv.length === 1 && argv[0] === '--validate';
  const isWrite = single('--write-approved'), isVerify = single('--verify-approved');
  const looksFlag = argv.some((a) => a.startsWith('--'));
  if (!(isValidate || isWrite || isVerify) || (looksFlag && !isValidate && !isWrite && !isVerify)) {
    console.error(USAGE); return 2;
  }
  try {
    if (isValidate) {
      const fx = loadFixture();
      for (const p of [0, 1, 2]) {
        const e = expectedForProfile(fx, p);
        console.log(`perfil ${e.profile}: fim=${e.counts.finish} std=${e.counts.std} batchesStd=${e.counts.stdBatches}`);
      }
      return 0;
    }
    const src = argv[0].split('=').slice(1).join('=');
    if (!existsSync(src)) { console.error(`fonte ausente: ${src}`); return 3; }
    if (isWrite && existsSync(DEFAULT_FIXTURE)) {
      console.error(`fixture já existe — não sobrescreve: ${DEFAULT_FIXTURE}`); return 3;
    }
    if (isVerify && !existsSync(DEFAULT_FIXTURE)) {
      console.error(`verify sem fixture para conferir: ${DEFAULT_FIXTURE}`); return 3;
    }
    const data = await generateData(src);
    validateFixture(data);
    if (isVerify) {
      const existing = readFileSync(DEFAULT_FIXTURE, 'utf8');
      const fresh = serializeFixture(data);
      if (existing !== fresh) {
        console.error('verify: serialização diverge byte a byte do fixture existente');
        return 3;
      }
      console.log('verify: serialização idêntica byte a byte ao fixture existente');
      return 0;
    }
    writeFileSync(DEFAULT_FIXTURE, serializeFixture(data), { flag: 'wx' });
    console.log(`fixture gerado: ${DEFAULT_FIXTURE}`);
    console.log(`próximo passo do coordenador: sha256sum do fixture -> FIXTURE_SHA256 (selar) e revalidar com --validate`);
    return 0;
  } catch (err) {
    console.error(`falha explícita: ${err.message}`);
    return 3;
  }
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  process.exit(await runCLI(process.argv.slice(2)));
}
