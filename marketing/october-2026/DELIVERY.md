# Kit utilizável e reprodução

Comece por `index.html` servido localmente. Revise arte/legenda/destino, copie o texto e exporte decisões para a equipe. Os PNGs e SVGs estão em `exports/`; fonte editável em `cards.json`, tokens em `tokens.json`, template em `tools/render.mjs`.

```sh
node marketing/october-2026/tools/render.mjs
node marketing/october-2026/tools/prepare-queue.mjs
python3 -m http.server 4417 --bind 127.0.0.1 --directory marketing/october-2026
```

Na worktree exclusiva, dependências do child client já instalado podem ser usadas sem copiar ou alterar seu checkout:

```sh
CORO_RENDER_PACKAGE=/Volumes/Zenith/Projects/game/corosolto/csbrasil/client/package.json node marketing/october-2026/tools/render.mjs
```

Render exige `@resvg/resvg-js` e `sharp` existentes no projeto. As fontes TTF incluídas derivam das WOFF2 e impedem fallback silencioso: exportador falha se qualquer fonte falta. Para abrir SVG em editor externo, instalar/carregar as fontes incluídas. PNG é a referência final. Exports volumosos são ignorados pelo Git e podem ser regenerados; `QUEUE.json` contém hash do arquivo esperado.

`CALENDAR.md`: 15 dias de outubro + quatro semanas depois. `SUPPORTS.md`: roteiros dos três apoios e os roteiros futuros aceitos pelo dono. `CAPTIONS.md`: textos distintos por plataforma. `BRAND.md`/`SOURCES.json`: identidade, fonte visual e recibos. `WELCOME.html`: layout e copy; `WELCOME-CONTRACT.md`: pendências da frente social.

## Ferramentas sociais conferidas em 10/10/2026

Busca Plugin Management por Instagram/TikTok/YouTube/X/LinkedIn retornou Metricool, entre outros. Metricool declara analytics/fila/publicação, mas `get_app_permissions` confirmou `not_installed`. A permissão global “Allow low-risk actions” não é OAuth de conta nem autorização para postar. Não há publisher conectado/capacidade de escrita de perfil certificada nesta lane. Nenhuma conta, instalação, assinatura ou conexão foi criada. Diretório pode ter mais plugins; esta busca não é inventário exaustivo.

Preparação funciona inteiramente local: arquivos, legenda, UTMs e decisões de revisão. Publicação depende da aprovação do lote concreto e da superfície realmente disponível na conta; Shorts dependem de vídeo da mídia. Newsletter segue contrato da frente social e exige aprovação de envio.

## Comunicação real de benefícios

Call to action do kit: jogo gratuito de navegador e repo aberto para contribuição. A página pública confirma estes caminhos; leitura HTML não é prova de partida completa. Conta/social ainda draft não aparecem como benefício entregue. Proposta de monetização não prova emblema/cosmético/ads ativos e não entra nas peças. Nenhuma métrica de jogadores, retenção, alcance ou receita está na copy.

## Personagens e alternativas políticas

O kit tem oito cards em três formatos (24 PNG/SVG). Canarinho ocupa a altura inteira da composição com fade lateral para preto. As três alternativas políticas são Barbudo do Planalto, Capitão do Cercadinho e os dois juntos; usam variantes estilizadas por image_gen a partir das caricaturas existentes, com os nomes do jogo, alpha preservado e procedência em SOURCES.json. Prompts em GENERATION-PROMPTS.md. Rótulos técnicos saíram das composições e referências de arte saíram das legendas dos personagens. Datas das capturas históricas de mapas/dev continuam nas legendas. São peças sociais; OG images do site não foram modificadas.

A fila contém 63 rascunhos originais e 12 alternativas políticas nas datas12,17,23. Cada alternativa traz alternativeTo: escolha uma versão para aquele canal/data, sem somar publicações automaticamente. Todas aguardam revisão e autorização de publicar. Regenerar arte invalida aprovação anterior por hash. URL sempre www.corosolto.com.br.
