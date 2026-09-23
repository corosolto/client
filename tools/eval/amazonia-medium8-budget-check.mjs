// Contrato local: medium 8x8 corta apenas sombras secundárias da mata. O mapa,
// a resolução, 5x5 e o preset low conservam seus contratos próprios.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

globalThis.location = {search:''};
globalThis.localStorage = {getItem:()=>null};

const sourceUrl = new URL('../../public/js/map_amazonia.js', import.meta.url);
const targetUrl = new URL(`../../public/js/.amz-budget-${process.pid}.mjs`, import.meta.url);
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.slice(10) || '';
if (mutant && !['sem-8x8', 'vaza-5x5', 'desliga-integracao'].includes(mutant)) throw Error('Mutante desconhecido');
const original = readFileSync(sourceUrl, 'utf8');
let source = original;
const replaceOnce = (from, to) => {
  if (source.split(from).length !== 2) throw Error(`Alvo não único: ${from}`);
  source = source.replace(from, to);
};
if (mutant === 'sem-8x8') replaceOnce("quality === 'med' && Number(settings.bots || 4) >= 8", "quality === 'never' && Number(settings.bots || 4) >= 8");
if (mutant === 'vaza-5x5') replaceOnce("Number(settings.bots || 4) >= 8", "Number(settings.bots || 4) >= 5");
if (mutant === 'desliga-integracao') replaceOnce("cast: renderProfile.foliageShadows", 'cast: true');

try {
  writeFileSync(targetUrl, source);
  const { resolveAmazoniaRenderProfile } = await import(pathToFileURL(fileURLToPath(targetUrl)));
  const q = value => new URLSearchParams(value);
  const cases = {
    medium8: resolveAmazoniaRenderProfile({quality:'med',bots:8}, q('')),
    medium5: resolveAmazoniaRenderProfile({quality:'med',bots:5}, q('')),
    low8: resolveAmazoniaRenderProfile({quality:'low',bots:8}, q('')),
    high8: resolveAmazoniaRenderProfile({quality:'high',bots:8}, q('')),
    control: resolveAmazoniaRenderProfile({quality:'med',bots:8}, q('amzfoliageshadow=1')),
  };
  const integration = {
    batch: source.includes("cast: renderProfile.foliageShadows"),
    cuts: source.includes('cortes: cuts ? {'),
    canopy: source.includes('copa.castShadow = renderProfile.foliageShadows'),
    understory: source.includes('m.castShadow = renderProfile.foliageShadows'),
  };
  const valid = cases.medium8.crowdedMedium && !cases.medium8.foliageShadows && cases.medium8.foliageCutMeters?.trees === 16
    && !cases.medium5.crowdedMedium && cases.medium5.foliageShadows && cases.medium5.foliageCutMeters === null
    && !cases.low8.foliageShadows && cases.high8.foliageShadows
    && cases.control.foliageShadows && cases.control.foliageCutMeters === null && cases.control.fullFoliageOverride
    && Object.values(integration).every(Boolean);
  const report = {valid,mutant,cases,integration};
  const out = process.argv.find(a=>a.startsWith('--out='))?.slice(6);
  if(out) writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  process.exitCode = valid ? 0 : 1;
} finally { try { unlinkSync(targetUrl); } catch {} }
