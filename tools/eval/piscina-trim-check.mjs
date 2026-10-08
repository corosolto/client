/* Regressão do cintilar azul reportado em 09/10/2026.
   Mede as separações entre as faces que disputavam o depth buffer e lê do mapa real
   se cada acabamento ficou fora dos colisores e sem sombra própria. */
import { bootGame, initTextures } from './harness.mjs';
import { piscinaTrimLayout } from '../../public/js/map_piscina.js';

const coplanar = process.argv.includes('--mutante=coplanar');
const game = bootGame('piscina_treta', { textures: initTextures(), ctf: false, seed: 20261009 });
const contract = game.world.root.userData.piscinaTrimContract;
const layout = coplanar ? piscinaTrimLayout({ coplanar: true }) : contract?.layout;

if (!layout || !contract?.evidence) throw new Error('contrato piscinaTrimContract ausente no mapa real');

const { portal, band, minimumGap } = layout;
const separations = {
  jambFromPortalEdge: portal.halfWidth - (portal.jamb.offset - portal.jamb.width / 2),
  headerFromPortalEdge: portal.height - portal.header.bottom,
  trimFromWall: (portal.jamb.depth - portal.wallDepth) / 2,
  bandFromWall: band.thickness / 2,
  bandFromDecal: band.decalOffset - band.thickness / 2,
};
const evidence = contract.evidence;
const byId = Object.fromEntries(['portal-jamb', 'portal-header', 'wall-band']
  .map((id) => [id, evidence.filter((item) => item.id === id).length]));
const verdicts = {
  PZT1: Object.values(separations).every((gap) => gap > 0) &&
    separations.jambFromPortalEdge >= minimumGap &&
    separations.headerFromPortalEdge >= minimumGap &&
    separations.bandFromDecal >= minimumGap,
  PZT2: evidence.length === 22 && evidence.every((item) => item.colliderDelta === 0),
  PZT3: evidence.length === 22 && evidence.every((item) => item.castShadow === false),
};

for (const [id, ok] of Object.entries(verdicts)) console.log(`${ok ? 'PASSA' : 'FALHA'} ${id}`);
console.log(JSON.stringify({ mutant: coplanar ? 'coplanar' : null, separations, minimumGap,
  evidence: {
    total: evidence.length,
    byId,
    colliderDeltas: [...new Set(evidence.map((item) => item.colliderDelta))],
    castShadows: [...new Set(evidence.map((item) => item.castShadow))],
  }, verdicts }, null, 2));

process.exitCode = Object.values(verdicts).every(Boolean) ? 0 : 1;
