// FONTE ÚNICA de identidade do produto (nome, host, descrições, @id de JSON-LD).
//
// POR QUE ESTE ARQUIVO EXISTE
// O nome do jogo estava escrito à mão em 8 lugares e divergia entre eles:
//   index.astro <title>      "CORO SOLTO: Treta Suprema (ex-CS BRASIL)"
//   Layout.astro og:site_name / JSON-LD / README / CHANGELOG / package.json
//                            "CS BRASIL"
// Um buscador que vê `<title>` dizendo uma coisa e o JSON-LD `name` dizendo
// outra não sabe qual é a entidade, e a rich card fica inconsistente.
//
// DECISÃO: o nome é **CORO SOLTO: Treta Suprema**.
// "CS BRASIL" vira `alternateName` - some da UI, sobrevive só onde ajuda a
// busca (JSON-LD alternateName, keywords, e a frase "ex-CS BRASIL" no title da
// home). Quem já busca "cs brasil" continua achando; quem chega novo aprende o
// nome certo. O host canônico mora em site-origin.mjs (decisão de 13/10/2026).

import { SITE } from './site-origin.mjs';

export { SITE };
export const HOST = new URL(SITE).host;

export const BRAND = 'CORO SOLTO';
export const BRAND_FULL = 'CORO SOLTO: Treta Suprema';
export const BRAND_ALT = 'CS BRASIL';

// Descrições estáveis: gameplay tem dois times; catálogo e mapas mudam sem invalidá-las.
export const DESC_SHORT =
  'FPS gratuito de navegador estilo CS 1.6: Time E contra Time B numa Brasília fictícia e satírica.';

export const DESC_LONG =
  'Jogo FPS gratuito de navegador com dois times, Time E e Time B, sátira brasileira, arenas, armas, bots, rounds e Capture the Flag. Multiplayer beta e controles de toque no celular; sem cadastro.';

// Acesso membro a membro: capturar `import.meta.env` inteiro embutiria no chunk
// SSR o objeto de env do build (réguas ER1 de env-runtime-check).
export const RANKING_ON = import.meta.env.RANKING_ON === 'true';
export const RANKING_DESCRIPTION_PT = RANKING_ON
  ? 'O ranking soma a pontuação das partidas. Cada abate confirmado soma um ponto; abates multiplayer entre perfis distintos recebem um ponto extra. Consulte o ranking para ver os resultados.'
  : 'O ranking global está indisponível por enquanto. Os stats de partida ficam salvos no seu navegador e aparecem no menu RANKING do jogo.';
export const RANKING_DESCRIPTION_EN = RANKING_ON
  ? 'The leaderboard adds up match scores. Each confirmed kill earns one point; multiplayer kills between distinct profiles earn one extra point. Check the leaderboard for results.'
  : 'The global leaderboard is currently unavailable. Your match stats are saved in your browser and appear in the game’s LEADERBOARD menu.';

// @id estável do nó VideoGame. É o que evita que o mesmo jogo apareça como
// DUAS entidades quando index.astro e sobre.astro emitem JSON-LD cada um: com
// @id igual, os crawlers deduplicam; sem @id, viram dois nós com a mesma url.
export const GAME_ID = `${SITE}/#game`;
export const ORG_ID = `${SITE}/#org`;
export const WEBSITE_ID = `${SITE}/#website`;

export const abs = (path = '/') => new URL(path, SITE).toString();
export const routeOgPath = (path: string, title: string) =>
  `/api/og/pagina.png?${new URLSearchParams({ rota: path, titulo: title })}`;

/* URL externa, não o atalho `/discord`: o atalho só resolve na Vercel, e o rodapé
   também é servido no dev, no itch.io e na CrazyGames. Mude aqui e em `vercel.json`. */
export const DISCORD_URL = '/discord';
export const TELEGRAM_URL = '/telegram';
export const GITHUB_URL = 'https://github.com/corosolto/client';

export const REDES_OFICIAIS = [
  { nome: 'X', url: 'https://x.com/corosolto', icone: 'M3 3h4l5.2 6.8L18 3h3l-7.2 8.9L21 21h-4l-5.3-7L6 21H3l7.1-8.9L3 3Z' },
  { nome: 'Instagram', url: 'https://www.instagram.com/corosolto/', icone: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm6-4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z' },
  { nome: 'TikTok', url: 'https://www.tiktok.com/@corosolto', icone: 'M13 2h3c.3 3 2 4.5 5 5v3a10 10 0 0 1-5-2v8a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3V2Z' },
  { nome: 'YouTube', url: 'https://www.youtube.com/@corosolto', icone: 'M5 4h14a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Zm5 4v8l7-4-7-4Z' },
  { nome: 'LinkedIn', url: 'https://www.linkedin.com/company/corosolto/', icone: 'M3 8h4v13H3V8Zm2-6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm5 6h4v2c1-2 7-3 7 4v7h-4v-7c0-3-3-3-3 0v7h-4V8Z' },
];

// Apoio: o endereço da campanha brasileira entra depois que ela for criada no MeApoia.
// Os fallbacks deixam a página utilizável no primeiro deploy e podem ser trocados só por
// variáveis públicas, sem espalhar URL de plataforma pelo jogo.
export const SUPPORT_URL_BR = import.meta.env.PUBLIC_SUPPORT_URL_BR || 'https://meapoia.com/vaquinhas/ajude-a-manter-o-coro-solto-online';
export const SUPPORT_URL_INTL = import.meta.env.PUBLIC_SUPPORT_URL_INTL || 'https://ko-fi.com/corosolto';

/* ===========================================================================
   RANKING: DESLIGADO (decisão do dono, 04/08/2026)
   ===========================================================================
   "vamos desabilitar o ranking por enquanto, depois a gente ajeita; vamos usar
   o supabase pra monitorar os usuários por enquanto."

   É FLAG, não remoção - religar tem que custar uma linha. Com `false`:
     · `/ranking` e `/u/*` respondem 200 com aviso + `noindex` (não 404: a URL
       volta, e 404 em URL indexada joga fora o histórico de busca);
     · o link some do nav e do rodapé (`Layout.astro`);
     · `/api/leaderboard` responde `{disabled:true}` e o painel do jogo mostra
       "desligado" em vez de tabela - o cliente NÃO conhece esta flag, ele só
       reage à resposta da API. Uma fonte de verdade, no servidor;
     · o FAQ e o JSON-LD da home param de prometer ranking global.

   O QUE **NÃO** PARA: a coleta. `submit_match` continua gravando e a telemetria
   nova (`/api/telemetry`) continua medindo. Desligar a vitrine não é desligar o
   dado - quando o ranking voltar, o histórico está lá.

   AO RELIGAR, LEIA ISTO: a rota canônica do perfil já é `/u/<id>/<nick>`, mas o
   cliente monta o legado `/u/<nick>` (`main.js`, `renderGlobal`). Nick aceita
   caractere especial; a URL tem que ser montada a partir do **id**. */
// Ativar apenas no build que seguir migration 037 + rollout compatível de API/nós.
