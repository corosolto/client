#!/usr/bin/env node
// ============================================================================
// flip-gate.mjs — regressão perceptual FLIP (NVIDIA) entre duas baterias de shots.
// ----------------------------------------------------------------------------
// Compara PNGs de mesmo nome entre <refDir> (golden) e <testDir> (atual) com a
// métrica FLIP (perceptual, pensada para imagens renderizadas; pip flip-evaluator).
// Mean FLIP: 0 = idêntico; >~0.08 já é diferença perceptível de peso (empírico,
// calibrar por tipo de cena). Sai com exit 1 se a média geral passar do limiar.
//
// Uso:
//   node tools/eval/flip-gate.mjs <refDir> <testDir> [--thresh 0.08] [--suffix -32]
//   node tools/eval/flip-gate.mjs ref/ test/ --thresh 0.05 --out flip.json
// Requer: .ml-venv do monorepo (pip install flip-evaluator) — resolvido abaixo.
// ============================================================================
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const [refDir, testDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!refDir || !testDir || !existsSync(refDir) || !existsSync(testDir)) {
  console.error('uso: node tools/eval/flip-gate.mjs <refDir> <testDir> [--thresh 0.08] [--suffix -32] [--out flip.json]');
  process.exit(2);
}
const THRESH = parseFloat(arg('thresh', '0.08'));
const SUFFIX = arg('suffix', '');
const OUT = arg('out');

const PY = process.env.FLIP_PY
  || (existsSync(resolve(HERE, '../../../../.ml-venv/bin/python')) ? resolve(HERE, '../../../../.ml-venv/bin/python') : null);

const refPngs = readdirSync(refDir).filter((f) => f.endsWith('.png') && f.includes(SUFFIX)).sort();
const testPngs = new Set(readdirSync(testDir).filter((f) => f.endsWith('.png')));
const pairs = refPngs.filter((f) => testPngs.has(f));
if (!pairs.length) { console.error(`nenhum par ${SUFFIX || '*.png'} comum entre ${refDir} e ${testDir}`); process.exit(2); }

/* Um processo python avalia todos os pares (carregar o módulo custa; imagens não). */
const py = `
import json, sys
from flip_evaluator import load, evaluate
out = []
for ref, test in json.load(sys.stdin):
    a, b = load(ref), load(test)
    r = evaluate(a, b, 'LDR', computeMeanError=True)
    mean = float(r[1]) if isinstance(r, (tuple, list)) and len(r) == 2 else float(r['mean']) if isinstance(r, dict) and 'mean' in r else None
    if mean is None:
        import numpy as np
        mean = float(np.asarray(r if not isinstance(r, (tuple, list)) else r[0]).mean())
    out.append({'file': ref.split('/')[-1], 'flip': round(mean, 4)})
print(json.dumps(out))
`;
const payload = JSON.stringify(pairs.map((f) => [resolve(refDir, f), resolve(testDir, f)]));
const r = spawnSync(PY, ['-c', py], { input: payload, encoding: 'utf8', timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
if (r.status !== 0) { console.error(`flip python falhou: ${(r.stderr || '').slice(0, 400)}`); process.exit(2); }
const rows = JSON.parse(r.stdout);
const overall = rows.reduce((s, x) => s + x.flip, 0) / rows.length;

console.log(`FLIP ${refDir} vs ${testDir} (${rows.length} pares, sufixo "${SUFFIX}")`);
for (const x of rows) console.log(`  ${x.flip.toFixed(4)}  ${x.file}`);
console.log(`média geral: ${overall.toFixed(4)}  (limiar ${THRESH})`);
if (OUT) {
  writeFileSync(OUT, JSON.stringify({ overall, thresh: THRESH, rows, ts: new Date().toISOString() }, null, 2));
  console.log(`escrito ${OUT}`);
}
process.exit(overall > THRESH ? 1 : 0);
