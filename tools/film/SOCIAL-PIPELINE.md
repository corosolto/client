# Captura → revisão → peças → fila social

Este fluxo prepara publicações. Ele **não** posta, agenda, gasta dinheiro nem aprova um vídeo sozinho. A meta informada pelo dono é até 15 publicações totais por dia entre as redes, condicionada a cortes distintos aprovados. Um corte pode aparecer uma vez em cada plataforma; views não substituem partidas iniciadas, concluídas e retorno.

## 1. Capturar e importar

A captura opt-in do jogo está no PR cliente #1068 e o upload privado no backend #164. Enquanto esses PRs não forem validados em produção, usar gravações próprias ou VODs de criadores com direito de importação. O fluxo exige gameplay real com HUD e áudio. A biblioteca local é `launch-media/2026-10-24-growth-pipeline/capture-library/` fora do Git.

```sh
node tools/film/library-import.mjs --source /caminho/take.mp4 --rights self --kind gameplay --opponents bots --map loja_h --creator Ruben --library /caminho/capture-library
node tools/film/library-review.mjs /caminho/capture-library
```

`opponents=players` só quando houver outros humanos confirmados. O importador deixa `review=pending`. O revisor deve assistir e ouvir o take inteiro, conferir alvo, reação, identidade, cortes, fluidez e direitos. Só então pode mudar `review` para `approved` no índice local e registrar decisão editorial separada. Não usar números de FPS ou abates como aprovação automática.

## 2. Preparar formatos

```sh
node tools/film/social-package.mjs --source /caminho/capture-library/originals/ID.mp4 --out /caminho/capture-library/packages/ID
```

O comando exige vídeo de ao menos 1280×720 e faixa de áudio. Ele faz `landscape.mp4` em 1920×1080 para X e `portrait.mp4` em 1080×1920 para Reels, TikTok e Shorts. A imagem inteira do gameplay permanece no centro; apenas o fundo decorativo usa uma cópia ampliada e desfocada. O logo do jogo fica na área superior da versão vertical, sem cobrir o HUD. Não há recorte da HUD nem quadros inventados para simular 60 fps. O pacote registra SHA-256 do original e dos derivados, duração e uma miniatura. `editorialStatus=preview_only` até haver decisão separada.

## 3. Decisão e fila

Crie `editorial-decisions.jsonl` **fora do Git**, uma linha JSON por corte aprovado. Exemplo de estrutura, não de aprovação real:

```json
{"id":"ID_DO_INDICE","status":"approved","visualReview":"passed","audioReview":"passed","publicationRights":true,"approvedBy":"nome do revisor","approvedAt":"2026-10-24T12:00:00Z","caption":"Cena verificada da partida.","character":"Canarinho","gameBuild":"v2.1.0-alpha.120","platforms":["x","instagram","tiktok","youtube"],"package":"packages/ID_DO_INDICE/package.json"}
```

Para vídeo de terceiro, `rightsEvidence` precisa apontar para a autorização de **publicação**, além do direito de importar para revisão. Mantenha essa prova privada. A fila confere `review=approved` no índice, decisão visual e de áudio, direitos, tipo de adversário, mapa/personagem/build, hash do original, hash dos derivados e duplicidade no histórico de posts.

```sh
node tools/film/social-queue.mjs --library /caminho/capture-library --decisions /caminho/editorial-decisions.jsonl --published /caminho/published.jsonl --out /caminho/queue.json --campaign hora-do-coro-20261025 --limit 15
```

`published.jsonl` aceita registros como `{"id":"ID","platform":"x","status":"published","postedAt":"...","url":"..."}`. A fila gera rascunhos com UTM por plataforma e nunca repete o mesmo corte na mesma rede se ele constar como publicado. X e YouTube recebem URL na legenda; Instagram e TikTok recebem chamada para o link da bio. Se faltarem takes aprovados, `count` fica abaixo de 15 e `blocked` informa o motivo. A fila deve ser revisada antes de usar a ferramenta oficial de cada rede.

## 4. Operação por sessão

1. Antes da Hora do Coro: confirmar sala oficial, link de convite, pessoa que joga e pessoa que grava; checar armazenamento e som.
2. Durante: registrar mapa, personagem, build, horário e se os adversários eram bots ou humanos. Gravar 16:9 completo e, se possível, 1080p/60 sem travamento.
3. Depois: importar originais, assistir/ouvir, cortar momentos com ação legível, gerar formatos, revisar miniaturas, preencher decisões e rodar a fila.
4. Publicação: usar canais e APIs oficiais com acesso autorizado. Registrar URL e métricas por plataforma no histórico. Medir clique, partida humana iniciada/concluída e retorno D1/D7, além de views.

Teste local do fluxo e dos bloqueios:

```sh
node tools/film/social-pipeline-check.mjs
```
