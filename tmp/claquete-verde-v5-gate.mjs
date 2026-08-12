/* claquete-verde-v5-gate.mjs — gate v5 da Claquete Verde. REPRODUZÍVEL:
   nada aqui relê JSON gravado — cada caso é MEDIDO na hora, por caminho
   explícito de modelo e de clipes (o gate v4 lia um pose-inflate.json velho e,
   rodado de verdade, o pose-inflate.mjs caía no pack mixamo por fallback de
   nome — BUG-02 da família "a régua e o jogo têm que rodar no mesmo mundo").

   Eixos e procedência dos tetos:
   - estático   tmp/claquete-verde-v5-contract.mjs      (checks geométricos; tetos da v3 + 2 novos)
   - acabamento tmp/claquete-verde-v5-acabamento.mjs    (pele fora de zona; zonas medidas no mesh cru)
   - identidade tmp/blender-claquete-v5-identity-probe.py (PIXELS a 150px no enquadramento servido)
   - movimento  tmp/claquete-verde-v5-motion.mjs        (LBS; clipes por diretório explícito)

   Tetos de movimento com REFERÊNCIA, não "separa de um mutante pior":
   - stretch P95 ≤ 0.95 e %arestas>25% ≤ 22.0 — p90 do envelope medido dos 61
     personagens ACEITOS em produção, cada um com o pack que o jogo toca nele
     (pasta própria ou mixamo): p90 = 0.965 / 22.01. Medição:
     references/tv/claquete-verde/3d/blender-v5/referencia-envelope-producao.json
   - marcha: kneeRatio máx de walk/run ≤ 0.76 — máximo medido do mesmo roster
     no clipe walk (0.754; mediana 0.656). O walk da v4 (marcha alta "sneak")
     mede 0.837 — fora. referencia-envelope-marcha.json
   - contato: peMin do idle ≥ -0.05 — 5 cm ≈ 3,7 px no cartão servido
     (74,26 px/m em ortho 2.02 a 150 px); o idle da v4 afundava 6,2 cm.
   - bind: errBind ≤ 0.01 (rig nativo exato mede 0).

   Cada mutante declara o eixo que deve morder (expectedFailures) — mutante que
   falha "por tudo" ou pelo motivo errado é regression de régua e derruba o gate.
*/
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const base = 'references/tv/claquete-verde/3d';
const v5 = `${base}/blender-v5`;
const BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender';
const outDir = `${v5}/contracts`;
mkdirSync(outDir, { recursive: true });

const T = {
  motion: { worstP95Max: 0.95, worstPctAbove25Max: 22.0, bindErrorMax: 0.01, kneeRatioWalkRunMax: 0.76, idlePeMinMin: -0.05 },
  identity: { stripeFrontMin: 24, stripePadsideMin: 8, stripeBackMin: 12, hingeFrontMin: 20, hingePadsideMin: 1 },
};

const cases = [
  { id: 'final-v5', model: `${v5}/claquete-verde-final-v5.glb`, clips: `${v5}/anims`, expect: true, expectedFailures: [] },
  { id: 'before-v4', model: `${base}/blender-v4-native/claquete-verde-final-opt.glb`, clips: `${base}/blender-v4-native/anims`, expect: false, expectedFailures: ['identity', 'acabamento', 'gait'] },
  { id: 'mutant-v4-pad', model: `${v5}/mutantes/v4-pad.glb`, clips: `${v5}/anims`, expect: false, expectedFailures: ['static', 'identity'] },
  { id: 'mutant-gola-salmao', model: `${v5}/mutantes/gola-salmao.glb`, clips: `${v5}/anims`, expect: false, expectedFailures: ['acabamento'] },
  { id: 'mutant-low-contrast', model: `${v5}/mutantes/low-contrast.glb`, clips: `${v5}/anims`, expect: false, expectedFailures: ['static'] },
  { id: 'mutant-dorsal-slab', model: `${v5}/mutantes/dorsal-slab.glb`, clips: `${v5}/anims`, expect: false, expectedFailures: ['static'] },
  { id: 'mutant-toy-joints', model: `${v5}/mutantes/toy-joints.glb`, clips: `${v5}/anims`, expect: false, expectedFailures: ['static'] },
  { id: 'mutant-clipes-v4-sneak', model: `${v5}/claquete-verde-final-v5.glb`, clips: `${base}/blender-v4-native/anims`, expect: false, expectedFailures: ['gait'] },
  { id: 'mutant-pack-errado', model: `${v5}/claquete-verde-final-v5.glb`, clips: 'public/models/anims/mixamo', expect: false, expectedFailures: ['gait'] },
  { id: 'rejected-transfer', model: `${base}/blender-v3/REJECTED-transfer-final.glb`, clips: `${base}/blender-v3/anims`, expect: false, expectedFailures: ['stretch'] },
];

function runJson(cmd, args, label) {
  const p = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 24 });
  const out = p.stdout || '';
  const start = out.indexOf('{');
  let json = null;
  if (start >= 0) { try { json = JSON.parse(out.slice(start)); } catch { /* segue null */ } }
  return { status: p.status, json, stderr: (p.stderr || '').slice(0, 400), label };
}

const matrix = [];
for (const item of cases) {
  const failedAxes = new Set();

  const stat = runJson(process.execPath, ['tmp/claquete-verde-v5-contract.mjs', item.model], 'static');
  if (stat.status !== 0 || !stat.json || !Object.values(stat.json.checks || {}).every(Boolean)) failedAxes.add('static');

  const finish = runJson(process.execPath, ['tmp/claquete-verde-v5-acabamento.mjs', item.model], 'acabamento');
  if (finish.status !== 0 || !finish.json || !Object.values(finish.json.checks || {}).every(Boolean)) failedAxes.add('acabamento');

  const probeJson = `${outDir}/identity-${item.id}.json`;
  // apaga antes: o valor só vale se a sonda desta execução o reescrever (nada de JSON velho)
  try { unlinkSync(probeJson); } catch { /* não existia */ }
  runJson(BLENDER, ['--background', '--python', 'tmp/blender-claquete-v5-identity-probe.py', '--', path.resolve(item.model), path.resolve(probeJson)], 'identity');
  let idViews = null;
  try { idViews = JSON.parse(readFileSync(probeJson, 'utf8')).views; } catch { /* sonda falhou */ }
  if (!idViews) failedAxes.add('identity');
  else {
    if (idViews.front.stripePx < T.identity.stripeFrontMin || idViews.padside.stripePx < T.identity.stripePadsideMin || idViews.back.stripePx < T.identity.stripeBackMin) failedAxes.add('identity');
    if (idViews.front.hingePx < T.identity.hingeFrontMin || idViews.padside.hingePx < T.identity.hingePadsideMin) failedAxes.add('identity');
  }

  const motionJson = `${outDir}/motion-${item.id}.json`;
  const mot = runJson(process.execPath, ['tmp/claquete-verde-v5-motion.mjs', item.model, '--clips', item.clips, '--out', motionJson], 'motion');
  const m = mot.json;
  if (!m || mot.status !== 0) { failedAxes.add('motion'); }
  else {
    const clips = Object.entries(m.clipes);
    const worstP95 = Math.max(...clips.map(c => c[1].esticP95pior));
    const worstPct = Math.max(...clips.map(c => c[1].pctAcima25));
    if (m.errBind > T.motion.bindErrorMax) failedAxes.add('bind');
    if (worstP95 > T.motion.worstP95Max || worstPct > T.motion.worstPctAbove25Max) failedAxes.add('stretch');
    const gait = ['walk', 'run'].filter(k => (m.clipes[k]?.semantica?.kneeRatioMax ?? 0) > T.motion.kneeRatioWalkRunMax);
    if (gait.length) failedAxes.add('gait');
    if ((m.clipes.idle?.semantica?.peMinY?.min ?? 0) < T.motion.idlePeMinMin) failedAxes.add('contact');
    item.motion = {
      errBind: m.errBind, worstP95, worstPct,
      walkKneeRatio: m.clipes.walk?.semantica?.kneeRatioMax ?? null,
      runKneeRatio: m.clipes.run?.semantica?.kneeRatioMax ?? null,
      idlePeMin: m.clipes.idle?.semantica?.peMinY?.min ?? null,
    };
  }

  item.identity = idViews;
  item.failedAxes = [...failedAxes].sort();
  item.pass = failedAxes.size === 0;
  const axesOk = item.expect
    ? item.pass
    : (!item.pass && item.expectedFailures.every(a => failedAxes.has(a)));
  item.axesAsExpected = axesOk;
  matrix.push(item);
  writeFileSync(path.join(outDir, `${item.id}.json`), JSON.stringify(item, null, 2) + '\n');
  if (item.pass !== item.expect) throw new Error(`${item.id}: expected pass=${item.expect}, measured ${item.pass} (axes: ${item.failedAxes})`);
  if (!axesOk) throw new Error(`${item.id}: eixos inesperados — esperava ${item.expectedFailures}, falhou ${item.failedAxes}`);
}

const result = {
  generatedAt: new Date().toISOString(),
  provenance: {
    staticRuler: 'tmp/claquete-verde-v5-contract.mjs',
    acabamentoRuler: 'tmp/claquete-verde-v5-acabamento.mjs',
    identityProbe: 'tmp/blender-claquete-v5-identity-probe.py (PIXELS no enquadramento servido: ortho 2.02, 150px)',
    motionRuler: 'tmp/claquete-verde-v5-motion.mjs (clipes por diretório explícito, sem fallback de nome)',
    thresholds: T,
    thresholdBasis: {
      stretch: 'p90 do envelope medido dos 61 personagens aceitos em produção com seus packs reais (0.965/22.01) — referencia-envelope-producao.json',
      gait: 'máximo medido do roster de produção no clipe walk (0.754; mediana 0.656) — referencia-envelope-marcha.json',
      contact: '5cm ≈ 3.7px no cartão servido (74.26 px/m em ortho 2.02 a 150px); idle v4 media -0.062',
      identity: 'pixels medidos: v4 front 18/6, padside 0, back 0; v5 front 28/34, padside 15/2, back 25 — tetos entre os dois estados',
      bind: 'rig nativo exato mede errBind 0',
    },
  },
  cases: matrix.map(({ id, expect, pass, failedAxes, expectedFailures, motion, identity }) => ({ id, expect, pass, failedAxes, expectedFailures, motion, identity })),
};
writeFileSync(`${v5}/contract-matrix.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, cases: result.cases.map(c => ({ id: c.id, pass: c.pass, expected: c.expect, failedAxes: c.failedAxes })) }, null, 2));
