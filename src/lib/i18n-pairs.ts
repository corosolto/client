// Fonte única dos pares PT↔EN. Layout (hreflang + lang), sitemap e a régua
// leem daqui - copiar a tabela em três lugares é o bug do /about em MIT.
// A home (`/`) tem <head> próprio em index.astro e declara o par `/en` ali;
// o Layout só vê o lado EN (`/en` é página de conteúdo, não o jogo).
export const PT_EN_PAIRS = [
  ['/', '/en'],
  ['/como-jogar', '/how-to-play'],
  ['/personagens', '/characters'],
  ['/mapas', '/maps'],
  ['/armas', '/weapons'],
  ['/sobre', '/about'],
  ['/changelog', '/whats-new'],
] as const;
