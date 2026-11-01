// Exercita os mapas reais; nominal verde, inventário completo e RED exato são obrigatórios.
// Contratos: docs/visual-consistency/FAVELAS-M3.md e CORREGO-MATERIAL.md.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const suites = {
  campo: { file: 'campo-boundary-finish-check.mjs', flag: '--mutar=', ids: ['CB-M1', 'CB-M2', 'CB-M3', 'CB-M4'], mutations: {
    inteira: ['CB-M1'], trecho: ['CB-M1', 'CB-M3'], colisao: ['CB-M2', 'CB-M4'], material: ['CB-M2'],
    ancestral: ['CB-M2'], orfao: ['CB-M2', 'CB-M4'], obb: ['CB-M4'], pickup: ['CB-M4'], camblocker: ['CB-M4'],
  } },
  favela: { file: 'favela-finish-check.mjs', flag: '--mutar=', ids: ['FV-M1', 'FV-M2', 'FV-M3', 'FV-M4', 'FV-M5'], mutations: {
    fisica: ['FV-M1'], esconder: ['FV-M2', 'FV-M3', 'FV-M4', 'FV-M5'], verga: ['FV-M2'], uv: ['FV-M3'], occluder: ['FV-M5'],
  } },
  materiais: { file: 'corrego-masonry-material-check.mjs', flag: '--mutante=', mutations: {
    'procedural-faixas': { 'muro-fontes-pbr': 8 }, 'normal-srgb': { 'muro-normal-srgb': 8 },
    'repeat-diverge': { 'muro-samplers': 1, 'muro-sampler-transform': 1 },
    'offset-nan': { 'muro-sampler-finito': 1, 'muro-sampler-transform': 1 },
    'offset-diverge': { 'muro-sampler-transform': 1 }, 'rotacao-no-probe': { 'muro-sampler-transform': 1 },
    'rough-srgb': { 'cru-rough-srgb': 1 }, 'raw-double-tint': { 'cru-tint': 1 },
  } },
  uv: { file: 'texture-reference-check.mjs', flag: '--mutante=', jsonMode: 'counts', mutations: {
    'missing-reference': { 'fria-vspan': 1, 'fria-texel-escalada': 1, 'uv-fria-quente': 1, 'uv-fria-baseline': 1, 'v-efetivo': 1, 'prop-lock': 1, 'cross-accept': 1, 'cross-contaminacao': 1 },
    'reference-wrong-dims': { 'fria-vspan': 1, 'uv-fria-baseline': 1, 'v-efetivo': 1, 'ref-invalida-bloqueada': 8, 'ref-invalida-uv': 8, 'ref-invalida-marcada': 8 },
    'lock-removal-factor1': { 'prop-lock': 1 },
    'uv-nao-finito': { 'uv-finita-fria': 1, 'uv-finita-quente': 1, 'uv-finita-baseline': 1, 'uv-finita-prop': 1 },
  } },
};
const sorted = (obj) => JSON.stringify(Object.entries(obj).sort());
const counts = (ids) => ids.reduce((r, id) => (r[id] = (r[id] || 0) + 1, r), Object.create(null));

export function avaliarResultado(run, suite, mutation = '') {
  if (run.error || run.signal || run.status !== (mutation ? 1 : 0)) return false;
  if (suite.ids) {
    const rows = [...String(run.stdout).matchAll(/^\s+((?:CB|FV)-M\d+) (PASSA|FALHA) —/gm)];
    if (rows.length !== suite.ids.length || rows.some((r, i) => r[1] !== suite.ids[i])) return false;
    return sorted(counts(rows.filter((r) => r[2] === 'FALHA').map((r) => r[1])))
      === sorted(counts(mutation ? suite.mutations[mutation] : []));
  }
  try {
    const r = JSON.parse(String(run.stdout).trim());
    if (!r || typeof r !== 'object' || Array.isArray(r)) return false;
    if (r.mutante !== (mutation || null) || r.veredito !== (mutation ? 'RED' : 'GREEN')) return false;
    if (mutation && suite.jsonMode === 'counts') {
      const validCounts = (obj) => obj && typeof obj === 'object' && !Array.isArray(obj)
        && Object.values(obj).every((n) => Number.isInteger(n) && n > 0);
      return validCounts(r.obtido) && validCounts(r.esperado)
        && sorted(r.obtido) === sorted(suite.mutations[mutation])
        && sorted(r.esperado) === sorted(suite.mutations[mutation]);
    }
    if (!Array.isArray(r.falhas) || r.falhas.some((f) => !f || typeof f.id !== 'string' || !f.id)) return false;
    return sorted(counts(r.falhas.map((f) => f.id))) === sorted(mutation ? suite.mutations[mutation] : {});
  } catch { return false; }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !Object.hasOwn(suites, args[0])) {
    console.error('uso: visual-map-mutations.mjs campo|favela|materiais|uv'); process.exitCode = 2; return;
  }
  const name = args[0], suite = suites[name], file = fileURLToPath(new URL(suite.file, import.meta.url));
  const run = (mutation = '') => spawnSync(process.execPath, [file, ...(mutation ? [suite.flag + mutation] : [])], { encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  const nominal = run();
  if (!avaliarResultado(nominal, suite)) {
    console.error(`INFRA ${name}: nominal não mediu GREEN completo\n${(nominal.stdout || '').slice(-3000)}\n${(nominal.stderr || '').slice(-1000)}`);
    process.exitCode = 3; return;
  }
  for (const mutation of Object.keys(suite.mutations)) {
    const variant = run(mutation);
    if (!avaliarResultado(variant, suite, mutation)) {
      console.error(`REPROVA ${name}/${mutation}: status=${variant.status}; exige RED1 com cláusulas exatas\n${(variant.stdout || '').slice(-3000)}\n${(variant.stderr || '').slice(-1000)}`);
      process.exitCode = variant.error || variant.signal ? 3 : variant.status === 0 || variant.status === 1 ? 1 : 3; return;
    }
    console.log(`PASSA ${name}/${mutation}: RED1 exato`);
  }
  console.log(`GREEN ${name}: nominal completo e ${Object.keys(suite.mutations).length} mutantes reais`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
