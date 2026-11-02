import fs from 'node:fs';
import { THREE, MAPS, bootGame, initTextures } from './harness.mjs';
import { measureLajesVisual } from './lajes-visual-measure.mjs';
import { buildLajes } from '../../public/js/map_lajes_authored.js';
import { withVisibleShotOccluders } from '../../public/js/shot_surfaces.js';
const mutante = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1] || '';
const known = ['', 'seta-eixo-errado', 'porta-escala', 'sem-oclusao', 'builder-antigo'];
if (!known.includes(mutante)) throw Error(`Mutante desconhecido: ${mutante}`);
if (mutante === 'builder-antigo') {
  const outro = (...args) => buildLajes(...args);
  Object.defineProperty(outro, 'name', { value: buildLajes.name });
  MAPS.lajes.build = withVisibleShotOccluders(outro);
}
const registered = MAPS.lajes.build === withVisibleShotOccluders(buildLajes);
console.log(`${registered ? '✓' : '✗'} LVA1 builder ativo`);
if (!registered) process.exit(1);
const game = bootGame('lajes', { textures: initTextures(), bots: 0, seed: 12345 }), w = game.world;
let changed = 0;
if (mutante === 'sem-oclusao') { changed = w.occluders.length; w.occluders = []; }
w.root.traverse(m => {
  if (mutante === 'seta-eixo-errado' && m.userData.routeCue) { m.rotation.x = 0; changed++; }
  if (mutante === 'porta-escala' && m.userData.lajesDoor) { m.scale.y = .5; changed++; }
});
if (mutante && !changed) throw Error('MUTANTE NÃO APLICOU');
const result = measureLajesVisual(THREE, game);
const rows = [['LVA2', 'setas horizontais', result.arrows], ['LVA3', 'portas humanas e bala coincide', result.doors],
  ['LVA4', 'lajes: bala coincide com piso', result.roofs], ['LVA5', 'spawns sem visada direta', result.spawnLOS]];
for (const [id, label, r] of rows) console.log(`${r.valid ? '✓' : '✗'} ${id} ${label}: ${r.samples.filter(s => s.valid).length}/${r.expected}`);
const output = process.argv.find(a => a.startsWith('--json='))?.slice(7);
if (output) fs.writeFileSync(output, JSON.stringify({ registered, mutante, changed, ...result }, null, 2));
if (rows.some(([, , r]) => !r.valid)) process.exitCode = 1;
else if (mutante) throw Error(`MUTANTE ${mutante} SOBREVIVEU`);
const photos = process.argv.find(a => a.startsWith('--fotos='));
if (photos) {
  const { sonda, pula } = await import('./sonda-filho.mjs');
  const r = sonda(['tools/eval/lajes-browser-check.mjs', photos,
    ...process.argv.filter(a => a.startsWith('--base=') || a.startsWith('--out='))], { stdio: ['ignore', 'inherit', 'pipe'] });
  /* lajes-browser-check precisa de playwright; ausente, ele morre e a régua
     visual reprovaria por "foto errada" sem ter tirado foto (issue #1133). */
  if (!r.mediu) pula(r.causa, 'lajes-visual --fotos');
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) process.exitCode = 1;
}
