/* Fase 6 da migração (docs/runbooks/MIGRACAO-CLOUDFLARE.md): o Workers é o único alvo.
   A função sobrevive só para as réguas que copiam trechos do astro.config e para o
   profile-card-contract; devolve o nome fixo da borda. */
export function adaptadorAlvo() {
  return 'cloudflare';
}
