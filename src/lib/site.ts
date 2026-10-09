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
// nome certo. O domínio segue csbrasil.online: trocar domínio no dia do
// release custa todo o histórico de indexação por zero ganho.

import { MAPAS } from '../data/jogo';

export const SITE = 'https://www.csbrasil.online';

export const BRAND = 'CORO SOLTO';
export const BRAND_FULL = 'CORO SOLTO: Treta Suprema';
export const BRAND_ALT = 'CS BRASIL';

// Descrições genéricas aqui evitam copiar a contagem editorial de src/data/jogo.ts:
// o elenco e os mapas jogáveis mudam antes de aquela vitrine ser revalidada.
export const DESC_SHORT =
  'FPS gratuito de navegador estilo CS 1.6: arena de sniper satírica numa Brasília fictícia, ' +
  'com Esquerda, Direita e outras facções originais.';

export const DESC_LONG =
  'Jogo FPS gratuito de navegador: arena de sniper estilo praca_poderes do CS 1.6 numa Brasília ' +
  'fictícia e satírica. Esquerda, Direita, Tribos Urbanas, Palhaços, Funkeiros e Mítico, ' +
  `${MAPAS.length} mapas, 26 armas, bots, rounds, CTF, placar e rádio de voz. Beta web com controles de toque no celular; sem cadastro.`;

// @id estável do nó VideoGame. É o que evita que o mesmo jogo apareça como
// DUAS entidades quando index.astro e sobre.astro emitem JSON-LD cada um: com
// @id igual, os crawlers deduplicam; sem @id, viram dois nós com a mesma url.
export const GAME_ID = `${SITE}/#game`;
export const ORG_ID = `${SITE}/#org`;
export const WEBSITE_ID = `${SITE}/#website`;

export const abs = (path = '/') => new URL(path, SITE).toString();

/* URL externa, não o atalho `/discord`: o atalho só resolve na Vercel, e o rodapé
   também é servido no dev, no itch.io e na CrazyGames. Mude aqui e em `vercel.json`. */
export const DISCORD_URL = '/discord';
export const TELEGRAM_URL = '/telegram';
export const GITHUB_URL = 'https://github.com/corosolto/client';

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
export const RANKING_ON = import.meta.env.RANKING_ON === 'true';
