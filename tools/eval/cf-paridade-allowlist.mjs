import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ROTAS } from './cf-paridade-routes.mjs';

const ALLOWLIST_PATH = fileURLToPath(new URL('./cf-paridade-allowlist.json', import.meta.url));
export const ALLOWLIST = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));

export function validateAllowlist(entries = ALLOWLIST.entries, routes = ROTAS) {
  const validRoutes = new Set(routes.map(({ rota }) => rota));
  const errors = [];
  if (!Array.isArray(entries)) errors.push('entries precisa ser uma lista');
  for (const [index, entry] of (entries || []).entries()) {
    const rotas = Array.isArray(entry?.rotas) ? entry.rotas : [entry?.rota];
    if (!rotas.length || rotas.some((rota) => typeof rota !== 'string' || !validRoutes.has(rota))) {
      errors.push(`entrada ${index + 1}: rota não existe na régua`);
    }
    if (typeof entry?.reason !== 'string' || !entry.reason.trim()) {
      errors.push(`entrada ${index + 1}: reason obrigatório`);
    }
    if (entry?.kind !== 'route' && typeof entry?.header !== 'string') {
      errors.push(`entrada ${index + 1}: header ou kind=route obrigatório`);
    }
    if (entry?.kind === 'route' && entry?.header) {
      errors.push(`entrada ${index + 1}: kind=route não pode ter header`);
    }
    if (entry?.header && typeof entry?.contains !== 'string') {
      errors.push(`entrada ${index + 1}: contains obrigatório com header`);
    }
  }
  return errors;
}

function rotasDaEntrada(entry) {
  return Array.isArray(entry.rotas) ? entry.rotas : [entry.rota];
}

export function allowlisted(row, entries = ALLOWLIST.entries) {
  if (row.prod === row.alvo && row.diferentes.length === 0) return [];
  return (entries || []).filter((entry) => {
    if (!rotasDaEntrada(entry).includes(row.rota)) return false;
    if (entry.kind === 'route') return true;
    const prefix = `${entry.header}:`;
    return row.diferentes.some((difference) => difference.startsWith(prefix) && difference.includes(entry.contains));
  });
}
