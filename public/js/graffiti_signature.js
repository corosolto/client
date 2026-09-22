/*
 * Assinatura compartilhada das superfícies observadas pela passada de grafite.
 * Só entram medidas espaciais: UV, material e nome da malha são deliberadamente
 * excluídos para que uma troca de acabamento não envelheça o layout.
 */
export const GRAFFITI_SIGNATURE_VERSION = 1;

const q = (v) => Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;

function comparar(a, b) {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

function hashTexto(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/* `kind` separa âncora de mural; as demais colunas são coordenadas/medidas da
   superfície. Campos de textura/material não chegam ao vetor canônico. */
export function canonicalSurfaceRows(observacoes = []) {
  return observacoes.map((o) => [
    String(o.kind || 'anchor'), q(o.x), q(o.z), q(o.ry), q(o.teto), q(o.largura),
  ]).sort(comparar);
}

export function surfaceSignature(observacoes = []) {
  const rows = canonicalSurfaceRows(observacoes);
  const canonical = JSON.stringify(rows);
  return { version: GRAFFITI_SIGNATURE_VERSION, count: rows.length, hash: hashTexto(canonical) };
}
