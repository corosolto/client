// Mutação confinada em memória; o Game permanece no seu URL real.
import { writeSync } from 'node:fs';

export const MUTANTES = {
  'guarda-state': {
    alvo: "    if (this._matchEndShown) return;",
    troca: "    if (this.state === 'matchEnd') return;",
    clausula: 'P1 snapshot matchEnd apresenta o resultado uma vez',
  },
  'ignora-fila': {
    /* Reintroduz o bug do review #1219: contar POPULAÇÃO TOTAL (mortos incluídos)
       em vez de vivos — a fila pendente é ignorada porque a conversão preserva o
       total e as mortes dos dois lados se compensam, então o fim nunca chega. */
    alvo: "    const e = this.combatants?.filter((c) => c.alive && c.team === 'E').length ?? 0;\n    const b = this.combatants?.filter((c) => c.alive && c.team === 'B').length ?? 0;",
    troca: "    const e = this._teamPopulation('E');\n    const b = this._teamPopulation('B');",
    clausula: 'P2 última morte encerra exatamente uma vez',
  },
  'vencedor-trocado': {
    alvo: "    this._endMatch(e > 0 ? 'E' : 'B');",
    troca: "    this._endMatch(e > 0 ? 'B' : 'E');",
    clausula: 'P2 última morte encerra exatamente uma vez',
  },
  'tela-so-ctf': {
    alvo: "    this.el.matchEnd.classList.remove('hidden');",
    troca: "    if (this.ctf) this.el.matchEnd.classList.remove('hidden');",
    clausula: 'P1 snapshot matchEnd apresenta o resultado uma vez',
  },
};

const mutante = process.env.ARENA_RUNTIME_MUTANT || '';
if (mutante && !Object.hasOwn(MUTANTES, mutante)) throw new Error(`setup: mutante desconhecido: ${mutante}`);

export async function load(url, context, nextLoad) {
  const loaded = await nextLoad(url, context);
  if (!mutante || !url.endsWith('/public/js/game.js')) return loaded;
  if (loaded.source == null) throw new Error('setup: Game sem fonte');
  const { alvo, troca } = MUTANTES[mutante];
  const before = String(loaded.source);
  if (before.split(alvo).length !== 2) throw new Error(`setup: alvo ${mutante} não é único`);
  const source = before.replace(alvo, troca);
  if (source === before) throw new Error(`setup: mutante ${mutante} não aplicado`);
  writeSync(2, `POST arena-runtime mutante=${mutante} aplicado\n`);
  return { ...loaded, source };
}
