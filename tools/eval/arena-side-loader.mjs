// Transforma apenas a fonte do Game em memória.
import { writeSync } from 'node:fs';
const mutant = process.env.ARENA_SIDE_MUTANT || '';
if (mutant && !['lado-antigo', 'halo-congelado', 'mapping-antigo'].includes(mutant)) throw new Error('ARENA_SIDE_MUTANT desconhecido');
const GAME_URL = new URL('../../public/js/game.js', import.meta.url).href;
const OLD_SIDE = 'if (!b.alive || b.team === this.player.team) continue;\n      const to = b.pos.clone().setY(b.pos.y + 1.2).sub(from);';
const NEW_SIDE = "if (!b.alive || b.team === this.playerTeam) continue;\n      const to = b.pos.clone().setY(b.pos.y + 1.2).sub(from);";
const OLD_HALO = 'if (m.ally !== ally) {';
const NEW_HALO = 'if (false) {';
const OLD_MAP = 'this.playerFaction = newFaction; this.enemyFaction = oldFaction;';
const NEW_MAP = 'this.playerFaction = this.enemyFaction; this.enemyFaction = oldFaction;';

function countOccurrences(haystack, needle) {
  let n = 0, i = haystack.indexOf(needle);
  while (i !== -1) { n++; i = haystack.indexOf(needle, i + needle.length); }
  return n;
}

function applySideMutant(before) {
  if (countOccurrences(before, OLD_SIDE) !== 1) {
    throw new Error('ARENA_SIDE_MUTANT=lado-antigo: âncora _meleeHit não é única');
  }
  return before.replace(OLD_SIDE, NEW_SIDE);
}

function applyMappingAntigo(before) {
  if (countOccurrences(before, OLD_MAP) !== 1) {
    throw new Error('ARENA_SIDE_MUTANT=mapping-antigo: âncora _switchTeam não é única');
  }
  return before.replace(OLD_MAP, NEW_MAP);
}

function applyHaloMutant(before) {
  if (countOccurrences(before, OLD_HALO) !== 1) {
    throw new Error('ARENA_SIDE_MUTANT=halo-congelado: âncora _updateTeamMark não é única');
  }
  return before.replace(OLD_HALO, NEW_HALO);
}

export async function load(url, context, nextLoad) {
  const loaded = await nextLoad(url, context);
  if (!mutant) return loaded;
  if (url !== GAME_URL) return loaded;
  if (loaded.source == null) {
    throw new Error(`ARENA_SIDE_MUTANT=${mutant}: loaded.source ausente/não-string em ${url}`);
  }
  const before = String(loaded.source);
  let after;
  if (mutant === 'lado-antigo') after = applySideMutant(before);
  else if (mutant === 'halo-congelado') after = applyHaloMutant(before);
  else if (mutant === 'mapping-antigo') after = applyMappingAntigo(before);
  else throw new Error(`ARENA_SIDE_MUTANT desconhecido: ${mutant}`);
  if (after === before) {
    throw new Error(`ARENA_SIDE_MUTANT=${mutant}: transformação não alterou o source`);
  }
  writeSync(2, 'ARENA_SIDE_APPLIED:' + mutant + '\n');
  return { ...loaded, source: after };
}
