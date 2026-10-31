# Anúncios de modos e trailers

Pedido de Ruben: telas inteiras antes do lobby, bonitas e com capturas do modo; trailers e gameplay para editar juntos. Fazer primeiro à mão; usar o processo validado como referência da automação.

## Entrega em andamento
Primeira tela: Operação Flávio, logo real, imagem grande do motor, objetivo e lados explicados; entrada explícita no lobby, com teclado e mobile. Catálogo deve aceitar Javaporcos quando houver captura e integração desse modo. Não anunciar um modo indisponível como jogável.
Sem publicação ou nova automação recorrente. Revisão estética/editorial de Ruben permanece parte da definição de pronto.

## Capturas de trabalho
Ego Lite Space13/p2, branch Flávio fba9eccdf, motor real offline. Fonte raw em /tmp/corosolto-mode-captures/. Câmeras de produção posicionadas manualmente; atores são bots, sem evidência de partida humana. Arquivos públicos webp são somente conversão de PNG, sem IA/desenho por cima.
- flavio-apron: câmera (27,5.2,61), alvo (0,2.2,55), 1920x1080. Avião/pátio e hangar.
- flavio-hangar: câmera (-10,4.2,17), alvo (4,2.2,39), 960x540. Secundária; substituir por frame HD antes do aceite visual final.
Captura de spawn voltada à parede e teste de atores debaixo da asa foram rejeitados para anúncio. Preview JPG existente é arte conceitual, não frame de gameplay.

## Fluxo manual que vai orientar a automação
Modo validado -> sessão e planos reais capturados -> ficha com build/câmera/atores/áudio e origem -> seleção dos planos -> corte vertical e horizontal -> revisão de imagem/áudio/legendas -> aprovação editorial -> publicação manual autorizada. Cada estágio mantém artefato e decisão; gerar arquivo não significa publicar.

## Plano do primeiro trailer candidato
15–20s: situação do aeroporto (2s), VIP e equipe se movendo (4s), contestação/combatente (4s), avanço/embarque (4s), logo e chamada (2s). Formatos 16:9 e 9:16. Capturar movimento real e áudio do jogo; evitar câmera parada, tiros repetidos, picos/clipping e tela vazia. Nenhum vídeo final foi aprovado ou publicado nesta fase.

## Pendências
Implementar/validar tela de Flávio; receber checkpoint e captura de Javaporcos sem escrever na lane externa; corrigir riscos MP de Flávio; gravar planos úteis; montar e revisar os candidatos antes de publicação.

## Recebimento GLM-06
117 linhas no módulo novo e integração localizada em dismissSplash. Ainda sem aceite: teste independente reproduziu force abrindo modo ausente; encontrados risco de botões cortados em viewport baixo e import tardio expondo lobby antes do anúncio. GLM-07 recebe apenas main.js/mode-announcements.js para corrigir. Capturas/conteúdo não mudam neste pacote.

### Recebimento visual/técnico em31/10
GLM06/07/12 implementaram módulo e entrada; Codex ajustou logo/tipografia e escreveu réguas independentes. Ego Space13/p2 confirmou abertura após gesto da splash antes do lobby, fechamento com entrada única/registro de visto, botões alcançáveis em360x640 e640x360. Falha real do download simulada por Network.setBlockedURLs no localhost: lobby liberado sem modal; bloqueio restaurado. Fixtures cobrem prazo2.5s e import tardio ignorado, convite/teste e contenção de gesto repetido;3mutantes reais reprovados.

Capturas/recibos preservados no HQ runtime/media/capture-receipts.json. Anúncio360x640 e pátio são candidatos internos, ainda sem aprovação estética do dono. Novas capturas1920x1080 do VIP no terminal foram rejeitadas para divulgação: plano aberto sem destaque e close com armas pelo chão/cenário pobre. Não usar como trailer aprovado nem esconder por tratamento de imagem. Capturas de bots pausados com câmera dirigida não são partidas humanas. Nenhum vídeo foi gravado/editado/aprovado/publicado nesta etapa.

O gravador existente public/js/gameplay-recorder.js já aceita aba com áudio, salva arquivo local e separa envio privado/publicação. Para o piloto manual, captura por esse botão exige seleção de aba pelo usuário; não contornar prompts. Roteiro e ficha desta frente continuam sendo o contrato para futura automação, que permanece sem retomada recorrente. Java só entra no catálogo após checkpoint/captura/integração próprios.

2026-10-31T00:56:51.589961+00:00 — Preparação de piloto manual dirigido: partida offline contra bots em Flávio caef2332a, atores reposicionados antes da tomada, câmera dirigida em runtime, áudio nativo pós-limiter. Captura do canvas própria, sem capturar tela/microfone. Candidato somente; sem aprovação editorial/publicação. Diretoria e receptor temporários em /tmp/corosolto-flavio-pilot/; artefato/receitas devem entrar no runtime/media do HQ após revisão. Não aplicar GLM23/Game durante gravação para evitar HMR.

2026-10-31T01:32:05.755223+00:00 — Piloto manualV2: horizontal17.6s1280x720 e vertical14s720x1280,30fps H264/AAC; decodificação estrita0 e crítico independente receberam ambos como candidatos revisáveis pelo dono. V1 vertical rejeitado/horizontal rascunho preservados; V2 remove planos das vigas, inclui combate/identificaçãoVIP e marcha original do modo renderizada22s em OfflineAudioContext como trilha de edição+SFX nativos. Picos−2.9/−2.8dBFS, nenhum silêncio≥0.5s abaixo−55dBFS; sem escuta humana/aceite estético/publicação. Montagem de bots dirigida, escolta sem atacantes ativos e sem prova visual de embarque completo. Artefatos/receitas/hashes no HQ runtime/media/flavio-piloto-20261031/{manifest-v2.json,export-validation-v2.json,edit-pilot-v2.py,take6-7-receipts.json}. Pronto desta etapa significa revisão conjunta, não automação ou divulgação autorizada. Java aguarda checkpoint/captura do owner; não foi escrito. Próximo: revisão editorial e continuar AN1/47PRs.
