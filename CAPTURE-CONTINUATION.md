# Captura local no Codex

Objetivo completo: trailer CORO SOLTO horizontal 45–60s, combate real3p com player ativo em vários mapas/personagens, Reframes das referências, hino, logo/CTA e narrador; depois extras e comunidade. Direção e banco de mídia em `../../launch-media/2026-10-09-eleicao/02-project/CONTINUATION.md`. Não voltar a usar Chrome externo/CGEvent: usuário trabalha em outras coisas.

Base: origin/main62776184e00bd4484940cfe8d26b917a03083e3a, alpha.62. Branch feat/trailer-codex-input. Produto e assets versionados não alterados. Ferramenta fica em tools/capture-codex e só é servida pelo proxy local8778; Astro original8779. Dependências reutilizadas por symlink ignorado. Viewmodels privados reutilizados por symlink ignorado; áudio lido de client/public/audio, somente localhost.

Problema reproduzido: CUA click não concedeu pointer lock; hint persistiu e _acceptInput rejeitou movimento/tiro. getDisplayMedia retornou Invalid state no IAB. Dois cliques e W testados antes da alteração.

Ferramenta: botões DOM mandam KeyboardEvent/MouseEvent por1–5s ao Game normal, gated local/singleplayer. Física, colisão, bots, dano, munição e respawn originais. Gate de pointer lock adaptado somente na instância local. Novo perfil apenas local; fetch/beacon API de métricas/ranking bloqueados. CaptureStream do canvas1920x1080 + áudio real mixado; canvas exclui o HUD DOM e o painel, preserva cena original. Não usar como evidência de HUD.

Piloto validado: Peruca/PostoCTF8v8,3p, player avançou13.5m, deslocou-se/atirou até37m do início; UZI25→0, hp100→79→16. Hint saiu. Arquivo `../../launch-media/2026-10-09-eleicao/00-inbox/gameplay/codex-peruca-posto-v5.webm`,64776996bytes,VP9 1920x1080+Opus48kestéreo. Seleção4s em01-selects/codex-peruca-movimento-tiros-4s.mp4; contato review/v3/codex-peruca-v5-contact.jpg. Áudio primeiros8s: média-35.1dB,pico-7.3dB; prévia normalizada. Escuta criativa dos memes pendente. Bruto inclui intervalos entre comandos/fumaça; selecionar ação, não usar como cena longa.

Crítico independente de fonte revisou isolamento do painel, troca de instância, soltura na morte/pausa/blur, exclusão enquanto salva e EOF parcial; cinco pontos corrigidos. JS/Python sintaxe passam. Correção percent-encoding de áudio aplicada. Sem prova visual automática de aprovação criativa.

Estado: piloto salvo, gravação parada; jogo voltou ao menu local no IAB2tab3. Última chamada markHandoff precisa renovar ao terminar turno. Próximo passo: outras capturas em mapas diferentes com nomes únicos, movimentos/tiros guiados por screenshot, tomadas curtas. Não declarar trailer pronto.

Servidores: `/opt/homebrew/bin/node node_modules/astro/bin/astro.mjs dev --host127.0.0.1 --port8779` (usar espaços nas flags); `python3 tools/capture-codex/server.py --output <campaign>/00-inbox/gameplay --audio-root <aggregate>/client/public/audio` (8778). Sem credenciais/config de produção. Não publicar este instrumento nem mexer nos outros checkouts.

## Segundo marco validado — Piscina/Lula
- `codex-lula-piscina-v5.webm`: 35.505.104 bytes, 1920×1080, VP9 + Opus. Travessia de porta, deslocamento atirando, recarga, dano e respawn normais.
- Prévia revisada: `01-selects/codex-lula-piscina-movimento-4s.mp4`, 4s, H.264 + AAC. Contato: `02-project/review/v3/codex-lula-v5-contact.jpg`. Trecho aproximadamente 12–16s aproveitável; vestiário e intervalos parado excluídos.
- Controle agora oferece 0.25/0.5s e pitch para ajustar navegação e compensar recuo. JS syntax check passou.
- Tentativa Deputada/Sertão não gerou take aproveitável: percurso pelos corredores externos, bloqueios em fachadas. Partida encerrada normalmente; browser local no menu. Não contabilizar como captura.
- O objetivo completo do trailer permanece no ledger da campanha. Capturas dos demais personagens e master 45–60s ainda pendentes.

## Órbita e janela — marco validado
- Runtime impede fullscreen na página local antes do boot; IAB5 permaneceu fullscreen=false após início. Captura direta do canvas, sem desktop/Chrome externo.
- codex-peruca-orbita-v6.webm salvo automaticamente: 5127647 bytes, VP9 1920x1080 + Opus48k estéreo, aproximadamente5s. Contato codex-peruca-orbita-v6-contact.jpg confirma movimento lateral, rajadas, órbita completa e rosto. Pausa final confirmada no menu.
- Crítico independente confirmou correção de soltura no start, deadline persistente após morte/blur e guard de terceira pessoa, sem nova regressão material. Áudio bruto acusa pacote Opus no EOF; revisar/remux selecionados antes do master.
- Próximo: novas tomadas do elenco/mapas e montagem integral45–60s. Não considerar trailer pronto.

## Elenco completo e montagem horizontal — 2026-10-09
- Capturas curtas salvas para Peruca/Posto, Capitão/Praça, Deputada/Ferro, Zero Um/Loja, Dona Floresta/Amazônia, Dama/Quebrada e Barbudo/Posto/Piscina. Movimento e rajadas pelos inputs originais; dano adversário observado no Posto/Piscina/Loja. Não afirmar que todas as arenas tinham combate intenso: Praça está esparsa.
- Dama: tentativas frontal e lateral em 44.6m ficaram bloqueadas pela colisão; rejeitadas. `codex-dama-quebrada-recuo-v6.webm`5380035 bytes percorre44.6→25.5m, mostra rosto e disparos. Excluir passagem da câmera pela lixeira.
- Master em `../../launch-media/2026-10-09-eleicao/03-exports/coro-solto-trailer-horizontal-50s-v6.mp4`; montagem cerca49s com menu, Reframe, hino, narrador Andre/Seed Audio, logo e URL. EDL/script/proveniência e evidências na campanha. Aprovação criativa/escuta humana pendentes; vozes próprias de memes ainda não verificadas.
- AAC concatenado gerava DTS regressivo. Corrigido com timeline PCM de duração explícita e master CFR30; manter esse método ao remontar. DRS exige `-reinit_filter 0` nos brutos antes de normalizar a resolução.
- Três extras horizontais de gameplay exportados,9.4s/9.2s/7.5s, decodificação integral sem erros; nada publicado.
- Último estado observado IAB2/tab5, Dama/Quebrada: gravação inativa, jogo pausado, fullscreen=false. Sem inputs nativos ou navegador externo. Restrição de tela vale para futuras capturas.
- Próximo passo: concluir QA da última correção de corte, mostrar master/extras ao usuário e resolver fontes dos memes preservando as identidades de áudio aprovadas. Roadmap social e conteúdo90dias permanecem no ledger da campanha, não implementados/publicados por este instrumento.

## Três trailers V7 entregues para revisão, 2026-10-10

- Objetivo desta fase concluído: três cortes horizontais distintos, Eleição em guerra56.5s, Caos brasileiro57.4s e Escolha seu coro52.6s. Arquivos em `../../launch-media/2026-10-09-eleicao/03-exports/`; continuidade completa em `../../launch-media/2026-10-09-eleicao/02-project/CONTINUATION.md`.
- Todos incluem14 personagens, menu real, gameplay nativo em terceira pessoa com deslocamento/disparos, cinco áudios Fish fornecidos, trilha fornecida e marcha armada em Brasília gerada por Seedream5Pro/Seedance2.5, seguida pelo logo/URL. Caos brasileiro inclui os memes originais localizados de Lula/Bolsonaro. A voz Higgsfield anterior foi substituída.
- Cada exportação1920×1080/CFR30/H264/AAC48k estéreo foi decodificada integralmente sem erros. A/B preservados após a primeira revisão. C foi remontado após crítica de semelhança com A: abertura de combate/menu, escolha na locução, elenco mais rápido e ápice de8.7s de gameplay. SHA do C atual: `d80e4c6a332dab452b0e94ecb7d2a86dcc0631949b5af7a17d383984d0e6140d`.
- Crítico independente com contexto limpo aceitou o delta visual de C sem bloqueadores; Gotinha segue breve e visto de costas, ressalva menor de acabamento. Parecer no pacote `review/independent/c-delta-verdict.json`. Métricas e transcrição não equivalem a escuta humana ou aprovação estética AAA.
- Previews e downloads no painel Codex8780 e nos resultados Higgsfield. Pacote de entrega preserva masters, EDLs, script produzido, hashes, QA e final gerado. C anterior57.1s e ZIP anterior ficam no histórico da campanha.
- Captura permanece exclusivamente no Codex IAB2/tab5, pausada e sem gravação/tela cheia; viewport temporário resetado. Nenhuma alteração de código nesta etapa e nenhum checkout alheio tocado. Renovar marcas de painel/handoff antes de encerrar.
- Próximo passo: usuário assistir/escutar e escolher o corte para divulgação. Nenhuma publicação feita. Extras de gameplay anteriores preservados; conteúdo/comunidade90dias, campanhas e ranking/perfis/amigos/login social seguem objetivos posteriores no ledger da campanha, ainda não implementados.
