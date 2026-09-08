/* Régua de reautoria do Carandiru. Nasce antes do blockout e cresce por checkpoint.
   C1 ativa CAR1/CAR2/CAR3/CAR6. C2 ativa CAR4/CAR5/CAR8; C3 ativa CAR7.
   Uso: node tools/eval/carandiru-jogabilidade-check.mjs --checkpoint=C1
        node tools/eval/carandiru-jogabilidade-check.mjs --checkpoint=C1 --mutante=muro-sem-acesso
*/
import { THREE, MAPS, initTextures } from './harness.mjs';

const checkpoint = (process.argv.find((a) => a.startsWith('--checkpoint=')) || '=C1').split('=')[1];
const mutant = (process.argv.find((a) => a.startsWith('--mutante=')) || '=').split('=')[1];
const mutants = {
  'muro-sem-acesso': 'CAR2', 'guarita-fechada': 'CAR2',
  'pavilhao-solido': 'CAR3', 'escada-decorativa': 'CAR3',
  'rota-unica': 'CAR4', 'spawn-exposto': 'CAR5',
  'arame-na-passarela': 'CAR6', 'viatura-procedural': 'CAR7',
};
if (!['C1', 'C2', 'C3', 'C4'].includes(checkpoint)) throw new Error(`checkpoint desconhecido: ${checkpoint}`);
if (mutant && !mutants[mutant]) throw new Error(`mutante desconhecido: ${mutant}`);

const source = await import('../../public/js/maps.js');
const world = MAPS.penitenciaria.build(new THREE.Scene(), await initTextures());
world.root.updateMatrixWorld(true);
const c = structuredClone(world.carandiru || {});
if (mutant === 'muro-sem-acesso') c.wallAccesses = [];
if (mutant === 'guarita-fechada') c.guardEntries = [];
if (mutant === 'pavilhao-solido') c.pavilionPassages = [];
if (mutant === 'escada-decorativa') c.pavilionStairs = [];
if (mutant === 'rota-unica') c.routes = (c.routes || []).slice(0, 1);
if (mutant === 'spawn-exposto') c.maxSpawnSight = 4;
if (mutant === 'arame-na-passarela') c.wireClearance = 0;
if (mutant === 'viatura-procedural') c.mintVehicle = false;

const named = (name) => !!world.root.getObjectByName(name);
const staircaseWorks = (samples = []) => samples.length >= 8
  && samples[0] <= .65 && samples.at(-1) >= 5.7
  && samples.every((h, i) => i === 0 || h >= samples[i - 1] && h - samples[i - 1] <= .65);
const results = [];
const put = (id, ok, detail) => { results.push({ id, ok }); console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${detail}`); };

put('CAR1', source.MAPS.penitenciaria?.name === 'Carandiru' && source.MAPS.penitenciaria?.build === MAPS.penitenciaria.build,
  `nome=${source.MAPS.penitenciaria?.name}; ID penitenciaria preservado`);
const access = c.wallAccesses || [], entries = c.guardEntries || [], walks = c.wallWalkways || [];
put('CAR2', access.length >= 2 && access.every((a) => named(a.name) && staircaseWorks(a.heights))
  && walks.length >= 3 && walks.every((w) => named(w.name)) && entries.length >= 2 && entries.every(named),
  `${access.length}/2 acessos; ${walks.length}/3 lados; ${entries.length}/2 guaritas`);
const passages = c.pavilionPassages || [], pStairs = c.pavilionStairs || [], gallery = c.pavilionGallery;
put('CAR3', passages.length >= 2 && passages.every((p) => p.width >= 2.2 && named(p.name))
  && pStairs.length >= 1 && pStairs.every((s) => named(s.name) && staircaseWorks(s.heights))
  && gallery?.connected && named(gallery.name) && (c.pavilionWindows || []).length >= 4
  && !world.colliders.some((x) => x.tag === 'pavilhao'),
  `${passages.length}/2 passagens; ${pStairs.length}/1 escada; galeria=${!!gallery?.connected}`);
put('CAR4', (c.routes || []).length >= 3 && c.minRouteWidth >= 1.2, `${(c.routes || []).length}/3 rotas; largura ${c.minRouteWidth ?? 'pendente'}`);
put('CAR5', c.maxSpawnSight <= 2 && c.counterfireRoutes >= 2, `visão ${c.maxSpawnSight ?? 'pendente'}/4; contrafogo ${c.counterfireRoutes ?? 'pendente'}`);
put('CAR6', c.elevatedCoverage >= .9 && c.wireClearance >= 1.75,
  `piso ${Math.round((c.elevatedCoverage || 0) * 100)}%; altura livre ${c.wireClearance ?? 'pendente'} m`);
put('CAR7', c.mintVehicle === true && c.vehicleFallback === true && c.vehicleCollider === true,
  `Mint=${!!c.mintVehicle}; fallback=${!!c.vehicleFallback}; colisor=${!!c.vehicleCollider}`);
put('CAR8', c.cost?.med <= c.cost?.baselineMed * 1.15 && c.cost?.low <= c.cost?.baselineLow * 1.15,
  `med=${c.cost?.med ?? 'pendente'}; low=${c.cost?.low ?? 'pendente'}`);

const active = checkpoint === 'C1' ? new Set(['CAR1', 'CAR2', 'CAR3', 'CAR6'])
  : checkpoint === 'C2' ? new Set(['CAR1', 'CAR2', 'CAR3', 'CAR4', 'CAR5', 'CAR6', 'CAR8'])
    : new Set(results.map((r) => r.id));
const failed = results.filter((r) => active.has(r.id) && !r.ok).map((r) => r.id);
if (mutant) {
  const target = mutants[mutant];
  if (!active.has(target)) throw new Error(`mutante ${mutant} pertence a ${target}, inativo em ${checkpoint}`);
  if (failed.length !== 1 || failed[0] !== target) throw new Error(`mutante ${mutant} deveria reprovar somente ${target}; reprovou ${failed.join(', ') || 'nada'}`);
  console.log(`MUTANTE MORDIDO: ${mutant} -> ${target}`);
  process.exit(0);
}
console.log(`CARANDIRU ${checkpoint} ${failed.length ? `VERMELHO: ${failed.join(', ')}` : 'VERDE'}`);
process.exit(failed.length ? 1 : 0);
