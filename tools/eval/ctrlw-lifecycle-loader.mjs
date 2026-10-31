/* Mutantes EM MEMÓRIA do ciclo de vida do Keyboard Lock — só a fonte do Game, nunca em disco. */
import { writeSync } from 'node:fs';
const mutant = process.env.CTRLW_LIFECYCLE_MUTANT || '';
if (mutant && !['sem-posse', 'sem-resume'].includes(mutant)) throw new Error('CTRLW_LIFECYCLE_MUTANT desconhecido');
const GAME_URL = new URL('../../public/js/game.js', import.meta.url).href;
/* sem-posse: remove SÓ a comparação de posse (gen) dentro do callback trava(). */
const OLD_POSSE = 'if (gen !== this._atalhosGen || this.testMode || this._disposed || this.paused';
const NEW_POSSE = 'if (this.testMode || this._disposed || this.paused';
/* sem-resume: remove SÓ o rearme do método resume() exato. */
const OLD_RESUME = 'resume() {\n    this.setPaused(false);\n    if (!this.testMode) this._requestLock();\n  }';
const NEW_RESUME = 'resume() {\n    this.setPaused(false);\n  }';
function conta(haystack, needle) { let n = 0, i = haystack.indexOf(needle); while (i !== -1) { n++; i = haystack.indexOf(needle, i + needle.length); } return n; }
function aplica(before, oldTxt, newTxt, nome) {
  if (conta(before, oldTxt) !== 1) throw new Error('CTRLW_LIFECYCLE_MUTANT=' + nome + ': âncora não é única no Game');
  const after = before.replace(oldTxt, newTxt);
  if (after === before) throw new Error('CTRLW_LIFECYCLE_MUTANT=' + nome + ': transformação não alterou o source');
  return after;
}
export async function load(url, context, nextLoad) {
  const loaded = await nextLoad(url, context);
  if (!mutant) return loaded;
  if (url !== GAME_URL) return loaded;
  if (loaded.source == null) throw new Error('CTRLW_LIFECYCLE_MUTANT=' + mutant + ': loaded.source ausente em ' + url);
  const before = String(loaded.source);
  const after = mutant === 'sem-posse' ? aplica(before, OLD_POSSE, NEW_POSSE, mutant)
    : aplica(before, OLD_RESUME, NEW_RESUME, mutant);
  writeSync(2, 'CTRLW_LIFECYCLE_APPLIED:' + mutant + '\n');   /* POST só depois da mutação comprovada */
  return { ...loaded, source: after };
}
