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

## Correções V9 e captura atômica — 10 outubro

- O usuário escolheu Eleição em guerra e rejeitou sete defeitos. O objetivo completo continua três trailers horizontais de 45–60s, filme cinematizado de cerca de 120s e três extras. Contrato e produção atual em `../../launch-media/2026-10-09-eleicao/02-project/CONTINUATION.md`; V8 permanece prévia, sem aprovação final.
- Falha observada: entre os cliques de despausar, iniciar gravação e mover, o Mandrake morreu; o vídeo continuou morto/respawn. Novo botão local `Gravar e mover juntos` reúne o início e o comando existente. Falhas soltam inputs e pausam. Não altera física, personagens, mapas, produção ou outros checkouts.
- Verificação: `node --check tools/capture-codex/runtime.js` passou. Crítico independente review_capture_controls revisou o delta final sem bloqueador. Teste IAB2/tab13: W por 1s, deslocamento 4.6m, vivo 100HP, autosave 317933 bytes, gravação inactive e menu de pausa. Isso comprova controles, não combate ou qualidade cinematográfica.
- Lajes: W1 até o centro, oito giros direita, W3 corredor (15.2m), W1 chegada (19.4m), W+C3 com tiros (27.0m, 30→4 balas, vivo). Último arquivo `00-inbox/gameplay/codex-mandrake-lajes-tiros-livres-v9.webm`, 642346 bytes, confirmado HF 8b34127f-69e5-4aad-b4f6-80671e082994. Revisão temporal encontrou caminho aberto e disparos, mas só 17 frames nativos em cerca de 2.7s/768×432: fluidez e alvo não aprovados. Não tratar interpolação/upscale como prova de captura nativa 30fps.
- Tabs13 e7 pausadas e marcadas handoff; nenhuma interação com Chrome nativo ou tela inteira. Próximo: melhorar rendimento de captura pelas configurações normais e revisar tomada inteira com inimigos visíveis antes de substituir o montage. Cinemáticas ainda têm escolhas de preset pendentes no HF.

## Render ao esgotar o orçamento físico — 11 outubro

- Lane confirmada limpa antes da edição: `feat/trailer-codex-input`, base `4b604aef0a19b58d31db2c640b2c9f3462f5e913`. Mudança restrita ao laço de `public/js/main.js`, régua existente `tools/eval/passo-sim-check.mjs` e este ledger. Nenhum outro checkout, preset, mapa, física ou ferramenta de captura alterado.
- Falha reproduzida antes da correção: `dtReal` de 201/300/800ms executava quatro passos de 50ms, todos com `render=false`, deixando zero desenho/HUD/radar no frame. O gate novo executa o bloco real do main; baseline 22 verdes e três falhas. Corrigido o argumento de render para também desenhar no último passo permitido pelo teto.
- Verificação final: gate 27/27; mutantes `--mutar=sem-render-teto` e `--mutar=antes-do-portao` saem1 com quatro falhas cada. Dez deltas entre zero e 800ms preservam quantidade e duração dos passos; integração do laço com `Game.update` real em 300ms avança apenas 200ms e desenha exatamente um quadro/HUD/radar. Sintaxe passa. A régua continua no `eval:passosim`, já incluído no `check:fast`.
- Tradeoff: frames acima de 200ms voltam a pagar o custo de um desenho completo, em vez de congelarem o canvas. Continua o descarte de tempo excedente, quatro subpassos no máximo e nenhuma promessa de 30fps nativos. Root e crítico de contexto limpo revisaram o delta sem bloqueador; o crítico comparou100.001 deltas0–1s e confirmou os mesmos passos físicos com um render final. A régua não verifica pixels/GPU ou a guarda externa de seleção; fluidez/combate/colisões ainda exigem nova tomada inteira pelo root.
- Evidência de mídia anterior: `oct11-esquerdomacho-piscina-live-01.webm` tem 26 frames1280×720 em cerca de 2.6s; `live-02.webm` tem 13 frames960×540 apenas nos últimos0.408s, com áudio até2.94s. Essas tomadas não provam fluidez ou saída das cadeiras e não substituem captura nova. VP9 pode ser outro custo, mas o gravador permaneceu igual; comparação com VP8/H264 precisa de medição própria.
- Reload: o manifesto JS é calculado no carregamento de `astro.config.mjs`; reiniciar somente o Astro local8779 e depois recarregar a aba do jogo no proxy8778. Revisão de conteúdo esperada `f33ac939be4f`. O proxy e `runtime.js` não mudaram. Não abrir Chrome externo nem produção. Root continua único operador do IAB.
- Próximo: nova captura curta no IAB, medindo frames nativos e vendo o percurso completo antes de aceitar o take. Checkpoint desta correção inclui este ledger, fonte e régua; consultar `git log -1` nesta branch para o SHA. Objetivo V9 e entregas posteriores permanecem no ledger da campanha.

## Preparar mira durante a pausa — 11 outubro

- Retomada limpa em `feat/trailer-codex-input`, base `537b2bb8703472f535c10a40ce628a664e26ad23`. Root confirmou render corrigido carregado: Sertão03 atualiza imagem e consumiu19 balas em3s, bruto cerca2.97MB; isso não equivale a aprovação do take.
- Problema reproduzido: os callbacks `data-look`/`data-pitch` rejeitavam partida pausada, exigindo vários cliques enquanto o player permanecia exposto. Novo `lookBy` local suspende somente a flag `paused`, despacha um único `mousemove` no canvas original e restaura a flag em `finally`, no mesmo evento síncrono. Não chama `setPaused`, que limpa teclas/tiro e altera menu/áudio; não simula tempo, não move posição e não usa mira automática.
- Adicionados giros esquerda/direita45°/90°. MovimentoX é graus×π/180 dividido pela sensibilidade real do handler desktop (`sens×0.0021`, incluindo FOV de scoped/piso0.28). Os ajustes finos de olhar/pitch continuam em pixels, com inversão vertical/clamp do Game original. Órbita/revelar preservam caminho Alt e guards próprios; nenhum controlador de combate ou preset alterado.
- Régua própria `node tools/capture-codex/controls-check.mjs` extrai os callbacks do runtime e `_mm`/`_acceptInput` do Game original. Baseline4/12; patch12/12; mutante `--mutar=sem-finally` falha9/12. Verifica restauração em sucesso/erro, um único mousemove sem Alt, teclas/tiro/posição preservados, zoom/sensibilidade/invertY, morte/online/entrada travada/fim de round/valor inválido bloqueados. Sintaxe do runtime passa. Root revisou o diff e aprovou restauração síncrona/mouse único/sensibilidade equivalente. UI real destes controles ainda pendente, sem declaração de aprovação visual.
- Reload: somente recarregar o jogo local via8778, pois o proxy injeta `runtime.js` diretamente. Sem restart do Astro, Chrome externo ou publicação. Pausado, a orientação muda no estado do jogador; câmera renderizada acompanha no próximo frame normal, após iniciar a tomada atômica.
- Root reportou probes após o conserto de render: tomadas03/04/05 têm89/96/88 frames nativos,29.9/29.8/29.5fps.03 aponta parede e fica fora;04 tem recarga/órbita;05 tem passagem livre e tiros perto da igreja/oponente distante. Rendimento recuperado nestes probes não aprova todas as cenas. Root segue Professor/Zero Um em mapas diferentes.
- Próximo: root validar ajuste pausado seguido de tomada atômica curta com player ativo, acompanhando o percurso inteiro e frames nativos. O checkpoint inclui runtime, régua e este ledger; SHA via `git log -1`. Objetivo completo e pendências V9 permanecem na campanha.

## PR das ferramentas autorizado, 12/10/2026

Dono pediu abrir PRs de todos os chats ativos. Checkpoint `de9810472` publicado com push normal e hook check:deploy aprovado em 52s. Draft https://github.com/corosolto/client/pull/821, base main, branch feat/trailer-codex-input. A orientação anterior de manter o instrumento local continua valendo para execução/distribuição no site; a nova autorização permite publicar o código para revisão. Nenhum merge, deploy, playback, servidor ou captura foi iniciado pela coordenação.

Revalidação: controls-check 12/12, mutante sem-finally 9 falhas; passo-sim 27/27, mutante sem-render-teto 4 falhas. Sintaxe JS/Python passou. Logs /tmp/csbr-trailer-pr-{controls,controls-mut,sim,sim-mut,push}.log. Revisões independentes anteriores preservadas. PR marcado para staging e gameplay humano por tocar render. Filmes, arquivos brutos e o HTML ad hoc public/trailer-map-capture.html permanecem fora do checkpoint.

Objetivo completo da campanha e produção corrente continuam no ledger privado referenciado acima. Próximo da integração: reconciliar a base alpha.62 com main, CI e revisão de render em staging. Próximo da produção: seguir o ledger da campanha e revisão criativa humana; PR aberto não constitui aprovação final dos filmes.
