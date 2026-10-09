# Captura local no Codex

Objetivo completo: trailer CORO SOLTO horizontal 45–60s, combate real3p com player ativo em vários mapas/personagens, Reframes das referências, hino, logo/CTA e narrador; depois extras e comunidade. Direção e banco de mídia em `../../launch-media/2026-10-09-eleicao/02-project/CONTINUATION.md`. Não voltar a usar Chrome externo/CGEvent: usuário trabalha em outras coisas.

Base: origin/main62776184e00bd4484940cfe8d26b917a03083e3a, alpha.62. Branch feat/trailer-codex-input. Produto e assets versionados não alterados. Ferramenta fica em tools/capture-codex e só é servida pelo proxy local8778; Astro original8779. Dependências reutilizadas por symlink ignorado. Viewmodels privados reutilizados por symlink ignorado; áudio lido de client/public/audio, somente localhost.

Problema reproduzido: CUA click não concedeu pointer lock; hint persistiu e _acceptInput rejeitou movimento/tiro. getDisplayMedia retornou Invalid state no IAB. Dois cliques e W testados antes da alteração.

Ferramenta: botões DOM mandam KeyboardEvent/MouseEvent por1–5s ao Game normal, gated local/singleplayer. Física, colisão, bots, dano, munição e respawn originais. Gate de pointer lock adaptado somente na instância local. Novo perfil apenas local; fetch/beacon API de métricas/ranking bloqueados. CaptureStream do canvas1920x1080 + áudio real mixado; canvas exclui o HUD DOM e o painel, preserva cena original. Não usar como evidência de HUD.

Piloto validado: Peruca/PostoCTF8v8,3p, player avançou13.5m, deslocou-se/atirou até37m do início; UZI25→0, hp100→79→16. Hint saiu. Arquivo `../../launch-media/2026-10-09-eleicao/00-inbox/gameplay/codex-peruca-posto-v5.webm`,64776996bytes,VP9 1920x1080+Opus48kestéreo. Seleção4s em01-selects/codex-peruca-movimento-tiros-4s.mp4; contato review/v3/codex-peruca-v5-contact.jpg. Áudio primeiros8s: média-35.1dB,pico-7.3dB; prévia normalizada. Escuta criativa dos memes pendente. Bruto inclui intervalos entre comandos/fumaça; selecionar ação, não usar como cena longa.

Crítico independente de fonte revisou isolamento do painel, troca de instância, soltura na morte/pausa/blur, exclusão enquanto salva e EOF parcial; cinco pontos corrigidos. JS/Python sintaxe passam. Correção percent-encoding de áudio aplicada. Sem prova visual automática de aprovação criativa.

Estado: piloto salvo, gravação parada; jogo voltou ao menu local no IAB2tab3. Última chamada markHandoff precisa renovar ao terminar turno. Próximo passo: outras capturas em mapas diferentes com nomes únicos, movimentos/tiros guiados por screenshot, tomadas curtas. Não declarar trailer pronto.

Servidores: `/opt/homebrew/bin/node node_modules/astro/bin/astro.mjs dev --host127.0.0.1 --port8779` (usar espaços nas flags); `python3 tools/capture-codex/server.py --output <campaign>/00-inbox/gameplay --audio-root <aggregate>/client/public/audio` (8778). Sem credenciais/config de produção. Não publicar este instrumento nem mexer nos outros checkouts.
