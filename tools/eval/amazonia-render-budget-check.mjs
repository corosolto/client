import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const budgetPath = new URL('../../public/js/renderbudget.js', import.meta.url);
const gamePath = new URL('../../public/js/game.js', import.meta.url);
const bloomPath = new URL('../../public/js/bloom.js', import.meta.url);

const cases = [
  { name: 'amazonia-8-med', quality: 'med', mapId: 'amazonia', teamSize: 8, dpr: 2, want: 0.8 },
  { name: 'amazonia-5-med', quality: 'med', mapId: 'amazonia', teamSize: 5, dpr: 2, want: 1 },
  { name: 'lajes-8-med', quality: 'med', mapId: 'lajes', teamSize: 8, dpr: 2, want: 1 },
  { name: 'amazonia-8-low', quality: 'low', mapId: 'amazonia', teamSize: 8, dpr: 2, want: 0.75 },
  { name: 'amazonia-8-high', quality: 'high', mapId: 'amazonia', teamSize: 8, dpr: 2.5, want: 2 },
];

function evaluate(resolvePixelRatio) {
  return cases.map(c => ({
    ...c,
    got: resolvePixelRatio({
      quality: c.quality,
      mapId: c.mapId,
      teamSize: c.teamSize,
      devicePixelRatio: c.dpr,
    }),
  }));
}

function valid(rows) {
  return rows.every(row => Math.abs(row.got - row.want) < 1e-9);
}

const module = await import(pathToFileURL(budgetPath.pathname));
const rows = evaluate(module.resolveMatchPixelRatio);
const gameSource = readFileSync(gamePath, 'utf8');
const bloomSource = readFileSync(bloomPath, 'utf8');
const integrated = /resolveMatchPixelRatio\s*\(\s*\{/.test(gameSource)
  && /mapId:\s*this\._mapId/.test(gameSource)
  && /teamSize:\s*this\.settings\.bots/.test(gameSource)
  && /this\.scene\.userData\.renderPixelRatio\s*=\s*pixelRatio/.test(gameSource)
  && /scene\.userData\.renderPixelRatio\s*\?\?\s*defaultPixelRatio/.test(bloomSource)
  && /cp\.setPixelRatio\(scenePixelRatio\)/.test(bloomSource);

const source = readFileSync(budgetPath, 'utf8');
const mutants = {
  'sem-amazonia': source.replace("mapId === 'amazonia'", 'false'),
  global: source.replace("quality === 'med' && mapId === 'amazonia' && teamSize >= 8", "quality === 'med' && teamSize >= 8"),
  'vaza-5x5': source.replace('teamSize >= 8', 'teamSize >= 5'),
  'perde-low': source.replace("if (quality === 'low') return 0.75;", "if (quality === 'low') return 0.8;"),
};
const mutantResults = {};
for (const [name, mutantSource] of Object.entries(mutants)) {
  if (mutantSource === source) throw new Error(`mutante ${name} não alterou a fonte`);
  const encoded = Buffer.from(mutantSource).toString('base64');
  const mutantModule = await import(`data:text/javascript;base64,${encoded}#${name}`);
  mutantResults[name] = valid(evaluate(mutantModule.resolveMatchPixelRatio));
}

const report = {
  valid: valid(rows) && integrated && Object.values(mutantResults).every(result => result === false),
  rows,
  integrated,
  mutantResults,
};
console.log(`${report.valid ? '✓' : '✗'} AMZRB1 orçamento de render 8×8: ${JSON.stringify(report)}`);
if (!report.valid) process.exitCode = 1;
