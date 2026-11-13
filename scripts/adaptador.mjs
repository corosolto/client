/* Alvo do deploy do site: `ADAPTER=cloudflare` liga o spike do Workers; o default é Vercel.
   Uma função só, lida pelo astro.config e injetada no bundle como __ADAPTADOR__, para o
   middleware e as rotas SSR escolherem a borda sem adivinhar pelo ambiente em runtime. */
const ALVOS = new Set(['vercel', 'cloudflare']);

export function adaptadorAlvo() {
  const alvo = (process.env.ADAPTER || 'vercel').trim().toLowerCase();
  if (!ALVOS.has(alvo)) throw new Error(`ADAPTER desconhecido: "${alvo}" (use vercel ou cloudflare)`);
  return alvo;
}
