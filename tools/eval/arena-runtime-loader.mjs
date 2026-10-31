// Mutação confinada em memória; o Game permanece no seu URL real.
import { writeSync } from 'node:fs';

export const MUTANTES = {
  'guarda-state': {
    alvo: "    if (this._matchEndShown) return;",
    troca: "    if (this.state === 'matchEnd') return;",
    clausula: 'P1 snapshot matchEnd apresenta o resultado uma vez',
  },
  'ignora-fila': {
    alvo: "    if (this.player._switchTeam) return;\n    for (const c of this.combatants || []) if (c._switchTeam) return;",
    troca: '',
    clausula: 'P2 respawn com fila cruzada pendente mantém a partida viva',
  },
  'vencedor-trocado': {
    alvo: "    this._endMatch(e > 0 ? 'E' : 'B');",
    troca: "    this._endMatch(e > 0 ? 'B' : 'E');",
    clausula: 'P2 última conversão encerra exatamente uma vez',
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
