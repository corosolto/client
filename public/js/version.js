// Versão do jogo — bump a cada release (segue as tags git v*).
// ATENÇÃO: o mesmo ?v= vai no import map do index.astro (bump dos dois lados juntos,
// senão o navegador serve módulos JS velhos do cache — causa raiz de "correções que
// não chegavam ao usuário" por dias).
export const VERSION = '2.0.0-alpha.79';

/* POR QUE 2.0.0-alpha E NÃO 3.3.0 (04/08/2026)
   O número tinha saltado de 1.15.0 para 3.1.0 sem nenhum release no meio: nenhuma das
   três entradas 3.x tem tag git (a última tag é `v1.12.4`), então "v3" nunca existiu
   como coisa publicada — era só o contador subindo sozinho.

   O produto está em **v2 alpha**: o jogo tem bug conhecido em aberto (ver KNOWN-BUGS.md),
   e chamar isso de 3.3.0 dá ao jogador a impressão de estabilidade que ele não tem.

   A escada, decidida pelo dono:
     2.0.0-alpha.N  ← aqui. Bug conhecido em aberto; portão pode estar vermelho.
     2.0.0-beta.N   ← nenhum P0 no KNOWN-BUGS.md e `invariants.mjs` saindo 0.
     2.0.0          ← beta rodando em produção sem P0 novo.
   Prerelease do semver ordena sozinho: alpha < beta < release.

   O `?v=` do import map do index.astro tem que bater com esta string. Bump dos dois lados
   juntos — divergir foi a causa raiz de "correção que não chegava no usuário" por dias. */
