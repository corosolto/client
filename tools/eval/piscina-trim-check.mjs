/* Regressão do cintilar azul reportado em 09/10/2026.
   Mede as caixas e planos efetivamente criados pelo mapa real. O mutante conserva a
   declaração corrigida, mas devolve a geometria antiga ao caminho de addBox. */
import { bootGame, initTextures } from './harness.mjs';

const coplanar = process.argv.includes('--mutante=coplanar');
if (coplanar) process.env.PISCINA_TRIM_MUTANT = 'coplanar';
else delete process.env.PISCINA_TRIM_MUTANT;

const game = bootGame('piscina_treta', { textures: initTextures(), ctf: false, seed: 20261009 });
const contract = game.world.root.userData.piscinaTrimContract;
if (!contract?.layout || !contract?.evidence || !contract?.references)
  throw new Error('contrato piscinaTrimContract ausente no mapa real');

const trim = contract.evidence;
const refs = contract.references;
const openings = refs.filter((item) => item.id === 'portal-opening-top');
const boundaryWalls = refs.filter((item) => item.id === 'boundary-wall');
const decals = refs.filter((item) => item.id === 'wall-decal-plane');
const jambs = trim.filter((item) => item.id === 'portal-jamb');
const headers = trim.filter((item) => item.id === 'portal-header');
const bands = trim.filter((item) => item.id === 'wall-band');
const EPS = 1e-9;

const closestOpening = (item) => openings.reduce((best, candidate) => {
  const distance = Math.abs(item.x - candidate.x) + Math.abs(item.z - candidate.z);
  return !best || distance < best.distance ? { item: candidate, distance } : best;
}, null).item;

const jambGaps = jambs.map((jamb) => {
  const opening = closestOpening(jamb);
  return opening.w / 2 - (Math.abs(jamb.x - opening.x) - jamb.w / 2);
});
const headerGaps = headers.map((header) => closestOpening(header).y - header.y);
const trimWallGaps = [...jambs, ...headers].map((item) =>
  (item.d - closestOpening(item).d) / 2);

function bandAxis(item) { return item.w > item.d ? 'z' : 'x'; }
function normalValue(item, axis) { return axis === 'z' ? item.z : item.x; }
function normalSize(item, axis) { return axis === 'z' ? item.d : item.w; }
function overlapsVertically(plane, box) {
  return plane.y + plane.h / 2 >= box.y - EPS && plane.y - plane.h / 2 <= box.y + box.h + EPS;
}

const bandMeasurements = bands.map((band) => {
  const axis = bandAxis(band);
  const center = normalValue(band, axis);
  const sign = Math.sign(center);
  const wall = boundaryWalls.find((candidate) => {
    const candidateAxis = candidate.w > candidate.d ? 'z' : 'x';
    return candidateAxis === axis && Math.sign(normalValue(candidate, axis)) === sign;
  });
  if (!wall) throw new Error(`parede de referência ausente para faixa ${axis}:${sign}`);

  const wallInner = Math.abs(normalValue(wall, axis)) - normalSize(wall, axis) / 2;
  const bandInner = Math.abs(center) - normalSize(band, axis) / 2;
  const candidates = decals.filter((plane) => {
    const normal = Math.abs(normalValue(plane, axis));
    return Math.sign(normalValue(plane, axis)) === sign &&
      normal <= wallInner + EPS && normal >= wallInner - 0.5 && overlapsVertically(plane, band);
  });
  if (!candidates.length) throw new Error(`decal de referência ausente para faixa ${axis}:${sign}`);
  const decalPlane = Math.max(...candidates.map((plane) => Math.abs(normalValue(plane, axis))));
  return { axis, sign, bandFromWall: wallInner - bandInner, bandFromDecal: bandInner - decalPlane };
});

const separations = {
  jambFromPortalEdge: Math.min(...jambGaps),
  headerFromPortalEdge: Math.min(...headerGaps),
  trimFromWall: Math.min(...trimWallGaps),
  bandFromWall: Math.min(...bandMeasurements.map((item) => item.bandFromWall)),
  bandFromDecal: Math.min(...bandMeasurements.map((item) => item.bandFromDecal)),
};
const minimumGap = contract.layout.minimumGap;
const declarationUnchanged = contract.layout.portal.jamb.offset === 1.52 &&
  contract.layout.portal.header.bottom === 3.06 && contract.layout.band.thickness === 0.06;
const byId = Object.fromEntries(['portal-jamb', 'portal-header', 'wall-band']
  .map((id) => [id, trim.filter((item) => item.id === id).length]));
const verdicts = {
  PZT1: Object.values(separations).every((gap) => gap > EPS) &&
    separations.jambFromPortalEdge + EPS >= minimumGap &&
    separations.headerFromPortalEdge + EPS >= minimumGap &&
    separations.bandFromDecal + EPS >= minimumGap,
  PZT2: trim.length === 22 && trim.every((item) => item.colliderDelta === 0),
  PZT3: trim.length === 22 && trim.every((item) => item.castShadow === false),
};

if (!declarationUnchanged)
  throw new Error('a declaração corrigida mudou; a contraprova deve alterar só a construção');
if (coplanar && contract.constructionMutant !== 'coplanar')
  throw new Error('mutante não chegou ao caminho de construção');

for (const [id, ok] of Object.entries(verdicts)) console.log(`${ok ? 'PASSA' : 'FALHA'} ${id}`);
console.log(JSON.stringify({
  mutant: contract.constructionMutant,
  measuredFrom: 'constructed-meshes',
  declarationUnchanged,
  separations,
  minimumGap,
  evidence: {
    total: trim.length,
    byId,
    references: { openings: openings.length, boundaryWalls: boundaryWalls.length, decals: decals.length },
    colliderDeltas: [...new Set(trim.map((item) => item.colliderDelta))],
    castShadows: [...new Set(trim.map((item) => item.castShadow))],
  },
  verdicts,
}, null, 2));

process.exitCode = Object.values(verdicts).every(Boolean) ? 0 : 1;
