Retratos para o cartão público de perfil, derivados dos vídeos de personagens já versionados em `public/video/chars/<id>.webm`. Frame em 1 segundo, proporção preservada, sem asset externo ou geração por IA. Reproduzir na raiz do client: `node scripts/social-portraits.mjs` (ffmpeg local). O deploy usa os PNGs versionados e não requer ffmpeg. Os vídeos originais e arquivos do trailer não são alterados. Lobisomem reutiliza o retrato existente em `public/img/chars-hero`.

Desde a revisão visual de11/10, o cartão OG usa as artes verticais estilizadas
existentes em `public/img/resultado/<id>-vitoria.webp`, vinculadas aos63 IDs do
roster. Estes frames não são as fontes do OG atual. Arquivos e procedência
originais permanecem preservados. Composição e reprodução em
[`docs/social/PROFILE-PORTRAITS.md`](../../../docs/social/PROFILE-PORTRAITS.md).
