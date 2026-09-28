/* acoes.mjs — loader das ações declarativas (acoes/*.md), o formato da casa.
   ─────────────────────────────────────────────────────────────────────────────
   Cada acao/*.md: frontmatter (nome, quando = globs, ativo, + campos livres
   por bot, ex.: checagem) + prompt/contrato no corpo. O runner descobre sozinho
   — acoplar ação nova é criar arquivo. Extraído do canarinho.mjs para servir
   vigia-prod, zelador, cenografo e companhia. */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const picomatchLite = (glob, s) => {
  const re = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${re}$`).test(s);
};

export function carregarAcoes(dirAcoes, { exigir = [] } = {}) {
  if (!readdirSync(dirAcoes).some) return [];
  return readdirSync(dirAcoes)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const t = readFileSync(join(dirAcoes, f), 'utf8');
      const fm = t.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!fm) throw new Error(`acoes/${f} sem frontmatter`);
      const cfg = Object.fromEntries(fm[1].split('\n').filter(Boolean).map((l) => {
        const i = l.indexOf(':');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
      }));
      for (const campo of exigir) if (!cfg[campo]) throw new Error(`acoes/${f}: frontmatter sem '${campo}'`);
      return {
        arquivo: f, nome: cfg.nome, quando: (cfg.quando || '**').split(',').map((g) => g.trim()),
        ativo: cfg.ativo !== 'false', prompt: fm[2].trim(), cfg,
      };
    })
    .filter((a) => a.ativo);
}
