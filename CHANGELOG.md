# Changelog

> ## Como este projeto versiona (decidido em 04/08/2026)
>
> ```
> 2.0.0-alpha.N   bug conhecido em aberto; o portão de qualidade pode estar vermelho
> 2.0.0-beta.N    zero P0 no KNOWN-BUGS.md E `node tools/eval/invariants.mjs` saindo 0
> 2.0.0           beta rodando em produção sem P0 novo
> ```
>
<!-- BEGIN:GERADO:versao_atual — não edite à mão, rode `npm run docs` -->

**O jogo está em `2.0.0-alpha.237`.** Prerelease do semver ordena sozinho
(`alpha` < `beta` < release), e o fluxo automático cuida do bump.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `grep VERSION public/js/version.js · node -p "require('./package.json').version"`

<!-- END:GERADO:versao_atual -->
>
> **Renumeração:** as entradas abaixo marcadas `[3.x]` foram publicadas como `2.0.0-alpha.N`
> — o contador tinha saltado de `1.15.0` para `3.1.0` sem nenhum release no meio, e **nenhuma
> das três tem tag git** (a última tag é `v1.12.4`). "v3" nunca existiu como coisa publicada.
> O conteúdo e as datas das entradas continuam intactos; só o rótulo mudou, porque chamar de
> 3.3.0 um build com P0 em aberto promete ao jogador uma estabilidade que ele não tem.

## Não lançado — 2026-09-06

### Adicionado
- Sertão da Treta substitui o Velho Oeste: casario de taipa, Caatinga, Canudos, calango quadrúpede, aves, cabras e galinha com pintinhos. Preview real com vídeo silencioso ao passar o mouse; criação com caminhada e pausas. O memorial de Padre Cícero permanece fora desta entrega.
- Camada operacional (`tools/ops/`, `npm run ops:diag`): o jogo diagnostica boot, deploy, assets no edge, APIs, telemetria, ranking e partida sintética e explica cada achado com causa provável, evidência, impacto e próximo passo; separa "tecnicamente verde" de "pronto para lançamento". Mutantes em `ops:selftest` e unidades em `ops:test`, os dois no `check:fast`.
- `public/js/ops.js`: sinais da sessão no navegador (marcos de boot, FPS em partida, falhas de carga, contexto WebGL, erros de partida, abandono) expostos em `window.__csbOps` e como migalhas do relatório de erro — sem endpoint novo, sem desenhar nada.
- Runbook `docs/runbooks/operacao-autonoma.md`: como diagnosticar, recuperar por classe de achado e reverter site, edge, backend e banco.
- `npm run ops:aquecer` e o passo no `prod-watch.yml`: depois do purge de cada deploy, o edge é aquecido com os módulos e todos os assets que a produção pede (111 MISS de 112 logo após a alpha.224 → HIT).
- `ops-diag.yml`: a diagnose com navegador roda a cada hora e vira issue `ops-diag` em vermelho; `portao-browser.yml` passa a rodar `eval:boot` e as provas de navegador da camada operacional em PR que toca o boot.
- O beacon de `/api/perf` leva o resumo do `ops.js` (boot, FPS p50/p5, falhas de carga, sessão anterior) e o relatório de crash diz onde a sessão anterior parou; a sonda de navegador usa a GPU do Mac sozinha e o elenco é sondado pelo `glbchars.js` que a produção serve.

### Corrigido
- Single Player voltou a abrir o submenu de MATA-MATA e CAPTURE A BANDEIRA (CTF), que segue para a seleção de mapas com o modo escolhido.
- `eval:boot` voltou a rodar: a fixture do `boot-check.mjs` ancorava na assinatura antiga de `_startGame` (mudada no #489) e reprovava antes de medir; agora ancora no nome da função.
- Os contadores do menu (`/api/online` e `/api/map-plays`) tentam de novo no cold start do backend (503 na primeira chamada, medido 06/09) em vez de ficar vazios.
- O proxy da rede de segurança do site repassa a geo da borda (`x-vercel-ip-*`); a diagnose distingue `city` parado com `presence` viva (ingestão parada, corosolto/backend#22) de "ninguém jogou".
- O build privado volta a carregar os 16 anúncios Fish, as 36 falas finais dos nove Funkeiros e somente as oito músicas aprovadas do menu.
- Palhaços e Funkeiros sem take próprio deixam de tocar dublagem genérica; os Funkeiros preservam somente as 36 falas aprovadas.
- A primeira fala de kill não é mais bloqueada por uma seleção ou chamada de rádio imediatamente anterior.
- O empacotador limpa saídas anteriores e reconhece uma AWP CC0 catalogada sem confundi-la com áudio legado pelo nome.
- Tiros ficam abaixo das vozes e a contingência original restaura falas, rounds e kill streaks em single-player e multiplayer.
- O multiplayer reconhece inputs por sequência e suaviza correções sem apagar movimento pendente.
- Arma, slots, pente, reserva e recarga passam a ser autoritativos no protocolo snapshot v4.
- Trocas de arma remotas remontam a malha visível; clientes lentos não acumulam snapshots obsoletos.
- A qualidade envia magnitude das correções para diagnóstico por sessão e round.
- Multiplayer não vaza mais para a partida single-player depois de voltar ao menu.
- O primeiro spawn e o respawn online obedecem imediatamente à posição autoritativa.
- Captura de bandeira passa a receber placar, progresso, donos e relógio pelo snapshot v3.
- Slots abandonados voltam à IA e as salas oficiais passam de 5v5 para 4v4.
- O catálogo in-game usa a mesma versão v8 do pacote de áudio baixado no build.

## [2.0.0-alpha.237] — 2026-09-06

### Mudado
- feat(combat): add bounded AWP penetration (#535)
- feat(combat): add bounded AWP penetration

## [2.0.0-alpha.236] — 2026-09-06

### Mudado
- fix(sertao): restaura grafo de módulos do preview (#525)
- chore(docs): regenera bloco derivado (autofix)
- fix(sertao): separa revisão de mídia do preview

## [2.0.0-alpha.235] — 2026-09-06

### Mudado
- feat(sertao): vila de caatinga com criação animada e preview real (#516)
- fix(sertao): estabiliza captura da criação no CI
- chore(docs): regenera bloco derivado (autofix)
- docs: registra validação alpha.233 do Sertão
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- fix(sertao): restaura loader e índices após rebase
- fix(sertao): preserva procedência e revisão da criação após rebase
- fix(maps): regenera grafite e previews após integrar main227
- fix(audio): inclui Escadão no gerador do laboratório local
- docs(sertao): registra portões finais e submissão para merge
- docs(sertao): sincroniza índices e autoria na submissão limpa
- docs(sertao): registra integração preservada e correção adversarial
- feat(sertao): preserva menu main e preview real junto ao de Lajes
- fix(sertao): reutiliza céu procedural por configuração de luz
- ci(sertao): conecta contratos e evidência de runtime aos portões
- docs(sertao): registra procedência e pendências explícitas
- docs(sertao): registra céu horizonte e animação regional
- docs(sertao): preserva críticas adversariais por rodada
- docs(sertao): registra referências e régua espacial
- docs(sertao): registra continuidade e entrega validada
- docs(sertao): preserva capturas e medições da revisão de mapa
- docs(sertao): preserva comparações visuais de fauna e horizonte
- docs(sertao): preserva evidência visual da criação animada
- build(sertao): preserva derivação reproduzível do calango
- test(sertao): registra régua de luz e contraste
- test(sertao): verifica animais e orçamento no jogo servido
- test(sertao): mede fauna rig e integração sem ampliar preload
- test(sertao): verifica rotas vegetação e oclusores
- test(sertao): mede identidade e cobertura competitiva
- feat(sertao): transforma o arraial preservando rotas e objetivos
- feat(sertao): integra fauna animada e criação com contato
- feat(sertao): compõe arquitetura e horizonte de caatinga
- feat(sertao): adiciona fauna Mint com rig e procedência
- feat(sertao): adiciona acervo de arquitetura e caatinga

## [2.0.0-alpha.234] — 2026-09-06

### Mudado
- Escadão: casa frontal conectada e horizonte (#522)
- docs(escadao): registrar ajuste de passarela
- fix(escadao): preservar lance sob passarela
- docs(escadao): registrar casa de disputa R5
- feat(escadao): abrir casa frontal aos dois lados
- docs(escadao): registrar contratos R5
- feat(escadao): adicionar horizonte de morro
- docs(escadao): registrar prazo e marco para redistribuição
- wip(escadao): preservar passagens R5 antes da pausa coordenada
- docs(escadao): registrar merge e evidência final

## [2.0.0-alpha.233] — 2026-09-06

### Mudado
- fix(lajes): evita travamentos ao aumentar a partida para 8x8 (#517)

## [2.0.0-alpha.232] — 2026-09-06

### Mudado
- fix(menu): restore Single Player mode submenu (#518)
- test(smoke): open Single Player before mode
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- fix(skylife): skip bird preload in Node probes
- chore(docs): regenera bloco derivado (autofix)
- test(boot): follow Single Player submenu
- docs: regenerate architecture index
- docs: update CTF menu checkpoint
- fix(menu): restore single-player mode submenu
- docs: record CTF home verification and remaining gates
- fix(menu): restore direct CTF entry on home

## [2.0.0-alpha.231] — 2026-09-06

### Mudado
- fix(audio): remover fallback de voz sintetica (#520)
- docs(audio): atualiza índices após rebase
- fix(audio): restaurar memes e rounds historicos
- fix(audio): remover fallback de voz sintetica
- fix(audio): restaurar memes e rounds historicos
- chore(docs): regenera bloco derivado (autofix)
- fix(audio): remover fallback de voz sintetica

## [2.0.0-alpha.230] — 2026-09-06

### Mudado
- fix(amazonia): restaura rota alternativa do spawn B (#521)

## [2.0.0-alpha.229] — 2026-09-06

### Mudado
- fix(audio): revalidar manifesto ingame por release (#519)
- chore(docs): regenera bloco derivado (autofix)
- fix(audio): revalidar manifesto ingame por release

## [2.0.0-alpha.228] — 2026-09-06

### Mudado
- feat(amazonia): integrar mapa ribeirinho jogável

## [2.0.0-alpha.227] — 2026-09-06

### Mudado
- feat(escadao): integrar mapa com becos, casa acessível e fauna (#515)
- fix(escadao): manter chegada dos becos no grafo físico
- fix(escadao): completar ambiência do pacote publicado
- chore(escadao): finalizar mídia e registrar validação do mapa
- fix(escadao): validar rotas físicas e proteger o patamar do objetivo
- docs(escadao): atualizar inventário e gates da rodada R4
- feat(escadao): preview real e provas de navegação e fauna
- fix(escadao): fechar pisos e abrir casa com circulação e janela
- feat(escadao): preserve Mint cat rig and domestic props
- feat(menu): preview atual do Escadão com vídeo sob demanda
- record verified Astro preview on current main
- refresh generated documentation for Escadao integration
- preserve Escadao evidence and main integration report
- integrate Escadao on main and validate real menu and bot routes
- import approved Escadao assets onto current main

## [2.0.0-alpha.226] — 2026-09-06

### Mudado
- feat(lajes): comunidade com becos estreitos, ambiência e preview

## [2.0.0-alpha.225] — 2026-09-06

### Mudado
- feat(ops): rodada 2 — GPU no Mac, edge aquecido, diagnose agendada, eval:boot no CI, beacon, retry no menu, elenco servido (#514)

## [2.0.0-alpha.224] — 2026-09-06

### Mudado
- feat(ops): camada de autonomia operacional — diagnose que explica, ops.js e runbook (#512)

## [2.0.0-alpha.223] — 2026-09-06

### Mudado
- fix(audio): restaurar vozes aprovadas e remover falas genericas (#510)

## [2.0.0-alpha.222] — 2026-09-06

### Mudado
- fix(telemetry): make browser delivery reliable (#508)
- chore(docs): regenera bloco derivado (autofix)
- fix(boot): keep early telemetry fail-silent
- chore(docs): regenera bloco derivado (autofix)
- fix(telemetry): make browser delivery reliable

## [2.0.0-alpha.221] — 2026-09-05

### Mudado
- fix(audio): renovar cache do manifesto privado (#507)
- fix(audio): renovar cache do manifesto privado

## [2.0.0-alpha.220] — 2026-09-05

### Mudado
- feat(audio): incorporar pack aprovado via Blob privado (#506)
- fix(ci): desacoplar gate de assets do three
- fix(ci): preservar preview sem segredo
- docs: sincronizar inventario de gates
- docs(audio): registrar canal privado
- feat(audio): buscar pack privado no build

## [2.0.0-alpha.219] — 2026-09-05

### Mudado
- feat(audio): consolidar arsenal e feedback tatil no jogo (#504)
- docs(audio): fechar handoff do gate de publicação
- fix(audio): impedir pack restrito fora da allowlist
- docs(audio): fechar handoff pos-merge
- docs(audio): registrar seleção e continuação da lane
- fix(audio): consolidar curadoria e feedback de combate
- docs(audio): registrar bloqueio do preview
- docs: atualizar autoria da locucao Fish
- docs(audio): registrar locucao e bloqueio de direitos
- feat(audio): adicionar locucao Fish local
- docs(audio): registrar PR e validacao final
- docs: registrar gate de eventos de audio
- docs: sincronizar contratos de audio
- feat(audio): completar feedback tatil local
- fix(audio): preservar fallbacks e balancear boom
- fix(audio): tornar boom padrao no laboratorio
- docs(audio): registrar boom guns designed para escuta
- feat(audio): integrar boom guns designed em ab local
- docs(audio): registrar arsenal cc0 para escuta
- feat(audio): mapear arsenal para gravacoes cc0
- docs(audio): registrar rejeicoes da escuta
- fix(audio): remover sobreposicao e distinguir pistolas
- docs(audio): registrar escuta de eventos e mapas
- feat(audio): dar identidade a armas mapas e eventos
- docs(audio): registrar cobertura e validacao local
- feat(audio): cobrir arsenal e eventos no jogo local
- docs(audio): registrar escuta Fab no jogo local
- feat(audio): ligar laboratorio Fab ao jogo local
- feat(audio): ampliar escuta local para biblioteca segura
- test(audio): isolar ledger da fixture PRV13
- docs(audio): 5ª rodada — BUG-138/139, três camadas com prova automatizada
- test(audio): prova automatizada do assets-check contra fixture (PRV13)
- fix(audio): ledger ausente aborta o gerador, nos dois modos (PRV12)
- docs(audio): resultados da 4ª rodada e audio:check registrado como vermelho
- docs(audio): registra o escape P0 e corrige o que os docs superdeclaravam
- fix(audio): P0 fail-closed — allowlist no prefixo derivado, nas três camadas
- docs(audio): estados por evento, BUG-132..136 e handoff da 3ª rodada
- feat(audio): legado CS/Valve/UT catalogado e bloqueado, sem fingir substituição
- feat(audio): gate de capacidade — só se aprova o que o runtime sabe tocar
- fix(audio): sha256Fonte exige formato E é conferido contra o arquivo real (PRV8)
- fix(audio): inventariador sinaliza falha POR ARQUIVO, e sai 1
- fix(audio): rajada com cache frio faz uma requisição, não uma por tiro (ESP9)
- docs(audio): handoff da 2ª rodada e BUG-128..131 no KNOWN-BUGS
- feat(audio): shortlist por metadado e escuta A/B local, sem aprovar nada sozinho
- fix(audio): a decisão do ledger passa a controlar o gerador (PRV7)
- fix(audio): P0 trava a redistribuição Fab e PRV5 volta a poder disparar
- fix(audio): sample que não carrega cai no synth, não em silêncio (ESP8)
- fix(audio): ALC2 era falso-verde — o empacotador morria em toda execução
- docs(audio): BUG-126 e BUG-127 no KNOWN-BUGS, com régua e reprodução
- docs(audio): handoff do piloto Fab, SCRIPTS.md e blocos regerados
- fix(audio): volume do usuário entra uma vez no caminho por sample (ESP7)
- feat(audio): inventariador local do staging privado — só metadado
- feat(audio): contrato de procedência por asset — origem, licença, hash e aprovação
- fix(audio): tiro por sample entra no grafo — pan, propagação e duck do synth
- test(audio): régua espacial do tiro por sample (ESP) — 3 cláusulas vermelhas
- fix(audio): ambiente entra no manifest e no pack — ALC 17/17 verde
- test(audio): régua de alcance do empacotamento (ALC) — vermelha por 17 de 17
- docs(audio): iniciar piloto Fab

## [2.0.0-alpha.218] — 2026-09-05

### Mudado
- fix(multiplayer): reconcile authoritative state and quality telemetry (#505)

## [2.0.0-alpha.217] — 2026-09-03

### Mudado
- feat(multiplayer): granadas online — o 4/5 pede ao servidor, nade/boom desenham sem dano local (fase 3) (#503)
- feat(multiplayer): granadas online — o 4/5 pede ao servidor, `nade`/`boom` desenham sem dano local (fase 3)

## [2.0.0-alpha.216] — 2026-09-03

### Mudado
- feat(multiplayer): drops de arma online — cria e some por id do servidor, E pede pick (fase 2) (#502)
- chore(docs): regenera bloco derivado (autofix)
- feat(multiplayer): drops de arma online — cria e some por id do servidor, E pede `pick` (fase 2)

## [2.0.0-alpha.215] — 2026-09-03

### Mudado
- feat(multiplayer): eventos do servidor no cliente — arco, killfeed e painel de morte com o autor real (BUG-90, fase 1) (#501)
- chore(docs): regenera bloco derivado (autofix)
- feat(multiplayer): consome os eventos do servidor — arco, killfeed e painel de morte com o autor real (BUG-90, fase 1)

## [2.0.0-alpha.214] — 2026-09-03

### Mudado
- fix(ci): substitui a action local fantasma do issues-bot pelos passos reais (PR #490 do nfvelten) (#500)
- chore(docs): regenera blocos com o package.json do PR (eval:wflocal)
- chore(docs): regenera bloco derivado (autofix)
- Merge origin/main (alpha.212) em conserta-action-fantasma-issues-bot e regenera blocos
- chore(docs): regenera bloco derivado (autofix)
- ci: dispara os checks obrigatórios no head do autofix (PR #490)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- fix(ci): substitui a action local fantasma do issues-bot pelos passos reais

## [2.0.0-alpha.213] — 2026-09-03

### Mudado
- docs(known-bugs): fechar BUG-117..124, BUG-18 e BUG-41 com o estado real (#499)
- docs(known-bugs): fechar BUG-117..124 com release e deploy, e as entradas velhas BUG-18 e BUG-41

## [2.0.0-alpha.212] — 2026-09-03

### Mudado
- fix(multiplayer): paridade com o single player — acerto previsto, killfeed, respawn, fim de partida, viewmodel e [BOT] (BUG-119, 121-124) (#498)
- fix(multiplayer): paridade com o single player — acerto previsto, killfeed, respawn, fim de partida, caixa do viewmodel e [BOT] (BUG-119, 121-124)

## [2.0.0-alpha.211] — 2026-09-02

### Mudado
- feat(analytics): correlate player journey and online presence (#495)
- fix(online): register presence before refreshing count
- feat(analytics): attach gameplay context to telemetry

## [2.0.0-alpha.210] — 2026-09-02

### Mudado
- fix(multiplayer): remotos no relógio do servidor e espectador em 3ª pessoa (BUG-117, BUG-118) (#494)
- fix(multiplayer): remotos no relógio do servidor e espectador em 3ª pessoa (BUG-117, BUG-118)

## [2.0.0-alpha.209] — 2026-09-02

### Mudado
- fix(multiplayer): virada de partida, animação dos remotos, viewmodel tardio, fim de round, pausa e sons (BUG-110..116) (#493)
- chore(docs): regenerar blocos gerados e ARCH.md (game.js 7220 linhas)
- chore(multiplayer): comentários novos no teto de 2 linhas (histórico no KNOWN-BUGS)
- fix(multiplayer): morte de remoto com som e kill confirm no online
- fix(multiplayer): pausa não devolve o corpo à IA (input parado a cada 2 s)
- fix(multiplayer): virada de partida, animação dos remotos, viewmodel tardio e fim de round

## [2.0.0-alpha.208] — 2026-09-02

### Mudado
- fix(multiplayer): smooth sessions and report client quality (#492)
- fix(multiplayer): smooth sessions and report client quality

## [2.0.0-alpha.207] — 2026-09-02

### Mudado
- fix: keep prod watch green during legitimate player idle (#491)
- fix: do not page on idle telemetry

## [2.0.0-alpha.206] — 2026-09-02

### Mudado
- fix(multiplayer): estabiliza sessão, bots, CTF e áudio (#489)

## [2.0.0-alpha.205] — 2026-08-30

### Mudado
- feat(audio): pack v8 — vozes do time Mítico e upgrade dos funkeiros (#487)
- feat(audio): pack v8 — vozes do time Mítico e upgrade dos funkeiros

## [2.0.0-alpha.204] — 2026-08-30

### Mudado
- feat(audio): roteiro e gerador de vozes do time Mítico (#485)
- feat(audio): roteiro e gerador de vozes do time Mítico

## [2.0.0-alpha.203] — 2026-08-30

### Mudado
- chore: APIs saem do cliente (#462 + main) (#474)
- fix(smoke): contrato de /api/leaderboard vira o da rede de segurança — 307 pro backend
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado após o merge da alpha.201
- fix(ci+boot): import do apibase que faltava e workflows apontam para as réguas que restaram
- chore(docs): regenera bloco derivado após o merge
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(api): as 18 rotas de banco saem do cliente e vão para o backend privado

## [2.0.0-alpha.202] — 2026-08-29

### Mudado
- fix(chr3): régua mede o PÉ (não a bbox); tabela compensa crouch constante — afundando 5 → 2 (#482)
- fix(chr3): régua mede o PÉ (não a bbox); tabela compensa crouch constante — afundando 5 → 2

## [2.0.0-alpha.201] — 2026-08-29

### Mudado
- Dois P0 saem da lista: BUG-36 (Ctrl+W) e BUG-03 (bot mudo) rebaixados com medição (#480)
- docs(bugs): BUG-36 e BUG-03 saem do P0 — mitigação/conserto já na main, rebaixados com medição

## [2.0.0-alpha.200] — 2026-08-29

### Mudado
- fix(eval): régua de UI deixa de ser cega a font-size fluida (BUG-05) (#479)
- fix(eval): régua de UI deixa de ser cega a font-size fluida (BUG-05)

## [2.0.0-alpha.199] — 2026-08-29

### Mudado
- fix(edge+telemetria): os dois P0 — /js/ sai do TTL de 1 mês no edge (BUG-39) e BUG-51 fecha com evidência (#476)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- fix(edge+telemetria): /js/ sai do TTL de 1 mês no edge e o BUG-51 fecha com evidência

## [2.0.0-alpha.198] — 2026-08-29

### Mudado
- feat(audio): músicas do menu trocadas pela leva Suno — audio-pack-v7 (#473)
- feat(audio): menu 100% Suno — pack v7 no ar e a URL aponta pra ele

## [2.0.0-alpha.197] — 2026-08-29

### Mudado
- fix(armas): o preload do corpo (tecla B) puxava as 26 armas bloqueando (BUG-85) (#478)
- fix(armas): o preload do corpo (tecla B) puxava as 26 armas bloqueando (BUG-85)

## [2.0.0-alpha.196] — 2026-08-29

### Mudado
- docs: fecha BUG-01 — HUD de CTF já tem guarda, limpeza e régua (5/5) (#475)
- docs: fechar BUG-01 — a faixa de CTF ja tem guarda de modo, limpeza e regua

## [2.0.0-alpha.195] — 2026-08-29

### Mudado
- fix(three): render() pergunta ao driver se o contexto vive — a corrida da perda no meio do frame (#420)
- fix: invariantes MAT2/TEX1, poster duplicado e check de posters (#365 + main) (#470)
- fix(crash): perda de contexto WebGL no meio do frame (#444 + main) (#472)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- fix(crash): perda de contexto no meio do frame é recuperável — TypeError do WebKit não abre issue nem derruba o launch (#419 #420)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- Merge da base (conflito só em arquivo gerado, resolvido pelo autofix)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- Merge da base (conflito só em arquivo gerado, resolvido pelo autofix)
- chore(docs): regenera bloco derivado (autofix)
- Merge da base (conflito só em arquivo gerado, resolvido pelo autofix)
- fix: invariantes MAT2/TEX1, poster duplicado, check de posters e limpeza de PNGs

## [2.0.0-alpha.194] — 2026-08-29

### Mudado
- feat(docs): como criar mapa com IA (#373 com DCO) (#469)
- fix(csp): connect-src passa a casar wss — sem isto o multiplayer nao conecta (#471)
- chore(docs): regenera bloco derivado (autofix)
- chore(docs): regenera bloco derivado (autofix)
- Documentação de como criar mapa com IA.

## [2.0.0-alpha.193] — 2026-08-29

### Mudado
- fix(crash): erro que o próprio three ENGOLE não é bug do jogo — WebGLState fica na telemetria (#465)
- chore(docs): regenera bloco derivado (autofix)
- fix(mobile): a promessa do orientation.lock chega com catch — a rejeição para de derrubar o launch (#431 #432)

## [2.0.0-alpha.192] — 2026-08-28

### Mudado
- map: Córrego entra na main sozinho — e paga a dívida do prefixo fy_ (#460)

## [2.0.0-alpha.191] — 2026-08-28

### Mudado
- feat: fumaça do cano + tranco e cápsulas mais fortes no tiro (#405)

## [2.0.0-alpha.190] — 2026-08-28

### Mudado
- fix(autofix): branch da mesma casa mantém as ferramentas do PR (#434)
- fix(ci): o bootstrap do issues-bot leva o trailer Agent, e a AF7 varre todos os workflows (#451) (#455)

## [2.0.0-alpha.189] — 2026-08-27

### Mudado
- fix(crash): ponte injetada pelo navegador não é bug do jogo — __gCrWeb para de abrir issue (#428) (#433)

## [2.0.0-alpha.188] — 2026-08-27

### Mudado
- feat(i18n): gêmea EN do /changelog e idioma honesto nas rotas EN (#400)

## [2.0.0-alpha.187] — 2026-08-27

### Mudado
- fix(crash): carteira cripto injetada não é bug do jogo — window.ethereum para de abrir issue (#403) (#406)

## [2.0.0-alpha.186] — 2026-08-26

### Mudado
- fix(crash): redações do WebKit e do Firefox pt-BR entram no CACHE_SPLIT_RE (#443) (#448)

## [2.0.0-alpha.185] — 2026-08-26

### Mudado
- fix(ci): o commit "regenera bloco derivado" leva o trailer Agent, e a AF7 volta a morder (#450) (#452)

## [2.0.0-alpha.184] — 2026-08-24

### Mudado
- chore(portao): co-autoria de agente de IA não entra mais na mensagem (#430)

## [2.0.0-alpha.183] — 2026-08-23

### Mudado
- fix(site): /discord levava para um convite que não é mais o nosso (#429)

## [2.0.0-alpha.182] — 2026-08-22

### Mudado
- fix(ci): o artefato de preview perdia os arquivos ocultos (#427)

## [2.0.0-alpha.181] — 2026-08-22

### Mudado
- perf(vram): armas param de custar 259 MB de textura — 96 MB a menos por partida (#407)

## [2.0.0-alpha.180] — 2026-08-22

### Mudado
- fix(ci): extrai a trava logo depois do fetch, antes do FETCH_HEAD virar outro (#426)

## [2.0.0-alpha.179] — 2026-08-22

### Mudado
- fix(ci): o merge limpo do bot também leva os trailers (destrava o #406) (#425)

## [2.0.0-alpha.178] — 2026-08-22

### Mudado
- fix(ci): o bot para de reprovar o PR que ele acabou de consertar (#424)

## [2.0.0-alpha.177] — 2026-08-22

### Mudado
- feat(ci): o que ficou de fora do #408 — fase 5, varredura pós-release e preview sem token (#422)

## [2.0.0-alpha.176] — 2026-08-22

### Mudado
- fix(ci): classify não reprova PR de fork por secret que o gatilho não pode ter (#408)

## [2.0.0-alpha.175] — 2026-08-22

### Mudado
- fix(régua): prova de mordida que não morde passa a REPROVAR (#416)

## [2.0.0-alpha.174] — 2026-08-22

### Mudado
- fix(regua): DOCSAUT deixa de reprovar branch de PR com autor novo (#415)

## [2.0.0-alpha.173] — 2026-08-21

### Mudado
- perf(armas): a partida carrega as armas dela — 26 no bloqueante viram 9 (#410)

## [2.0.0-alpha.172] — 2026-08-21

### Mudado
- fix: importmap do Layout e CVEs altas nas dependências (#363)

## [2.0.0-alpha.171] — 2026-08-21

### Mudado
- feat: kill replay cam com hit-stop (#364)

## [2.0.0-alpha.170] — 2026-08-21

### Mudado
- feat(tela-04): duas colunas na escolha de mapa e varredura do i18n (#401)

## [2.0.0-alpha.169] — 2026-08-21

### Mudado
- fix(boot): falha de carregamento do módulo chega com evidência (#387)

## [2.0.0-alpha.168] — 2026-08-21

### Mudado
- fix(portao): autoria não vota em clone raso - Vercel e produção vermelhas desde o #398 (#402)

## [2.0.0-alpha.167] — 2026-08-21

### Mudado
- fix(crash): abort de mídia é recuperável — play() cortado por pause() não abre issue (#390)

## [2.0.0-alpha.166] — 2026-08-21

### Mudado
- fix(docs): o portão de autoria cobra de quem pode consertar, não do PR seguinte (#398)

## [2.0.0-alpha.165] — 2026-08-21

### Mudado
- docs(gerados): re-deriva o bloco de autoria após o squash do #392 (DOCS1) (#395)

## [2.0.0-alpha.164] — 2026-08-21

### Mudado
- fix(botbrain): separa treino e avaliação com sementes holdout (#392)

## [2.0.0-alpha.163] — 2026-08-20

### Mudado
- feat: sangue CS 1.6, controles mobile (CoD-like), perf auto e ajustes de menu (#368)

## [2.0.0-alpha.162] — 2026-08-20

### Mudado
- fix(home): home estática de volta; idioma por país via /api/geo-lang (Stateloop) (#388)

## [2.0.0-alpha.161] — 2026-08-19

### Mudado
- fix(telemetria): console.error com string é log, não bug do jogo (#382) (#385)

## [2.0.0-alpha.160] — 2026-08-19

### Mudado
- chore(ci): consolida bots de issue em issues-bot.yml (#378)

## [2.0.0-alpha.159] — 2026-08-19

### Mudado
- fix(release): perdedor da corrida não toca na release — edit apagava o crédito dos colaboradores (#374)

## [2.0.0-alpha.158] — 2026-08-19

### Mudado
- fix(mapa): arma 'smg' não existe — crash de todo quadro no _updatePickups (#366) (#367)

## [2.0.0-alpha.157] — 2026-08-18

### Mudado
- fix(ci): guarda de dedupe na shell — triage não morre mais em issue não-crash (#358)

## [2.0.0-alpha.156] — 2026-08-18

### Mudado
- fix(ci): classify serializa por PR, posta como csbrasil-BOT e dedupa por marcador (#351)
- fix(eval): vm-kick-sim importa WEAPONS e REC_DEG em vez de parsear fonte (#352)
- ci(portao-browser): caminho do viewmodel entra no gatilho de browser (#353)
- feat(ci): comentários do bot legíveis — caixa colorida, mapa da mudança e ficha de triagem (#354)
- fix(release): criação de release idempotente — corrida tag×main não pinta mais vermelho (#355)

## [2.0.0-alpha.155] — 2026-08-18

### Mudado
- docs: handoff da 2a sessao de 18/08 — ruleset ativo, bot no ar, planos 1/2/6 concluidos (#350)

## [2.0.0-alpha.154] — 2026-08-18

### Mudado
- ci(release): run mais novo cancela o velho no ar (atomic push failed da .152) (#349)

## [2.0.0-alpha.153] — 2026-08-18

### Mudado
- ci(release): push do bump autentica como csbrasil-BOT para passar no ruleset da main (#343)

## [2.0.0-alpha.152] — 2026-08-18

### Mudado
- fix(eval): changelog conta squash-merge e foot-offsets volta a bater com a sonda (#348)
- chore(scripts): documentacao dos // sai do package.json para SCRIPTS.md (#347)

## [2.0.0-alpha.151] — 2026-08-18

### Mudado
- fix(ci): portao build verde de novo: eval:deps + vm-kick-sim le data/weapons.js (#344)

## [2.0.0-alpha.150] — 2026-08-18

### Mudado
- docs: handoff para proxima sessao (plano completo de 7 frentes)

## [2.0.0-alpha.149] — 2026-08-17

### Mudado
- fix(input): preventDefault em pointer lock impede Quick Find do Firefox

## [2.0.0-alpha.148] — 2026-08-17

### Mudado
- chore(portões): travas locais, agrupamento de crash por classe, timeouts e vulnerabilidades (#209)

## [2.0.0-alpha.147] — 2026-08-17

### Mudado
- ci: liga as réguas de navegador ao portão (portao-browser) (#232) (#339)
- feat(mapa): adiciona "Obras da Prefeitura" (terreno ondulado) (#256) (#338)

## [2.0.0-alpha.146] — 2026-08-17

### Mudado
- feat(mapa): adiciona "UPA 24h da Treta" (pronto-socorro interno) (#257) (#337)

## [2.0.0-alpha.145] — 2026-08-17

### Mudado
- docs: atualiza placar do quality gate (51/51) e corrige gen-arch WEAPONS

## [2.0.0-alpha.144] — 2026-08-17

### Mudado
- fix: adiciona texturas faltantes do mapa Velho Oeste
- fix: adiciona arquivos faltantes do mapa Velho Oeste (map_velho_oeste.js, eval)
- feat(mapa): adiciona Penitenciária e Velho Oeste da Treta (#335)

## [2.0.0-alpha.143] — 2026-08-17

### Mudado
- Publicação 2.0.0-alpha.143

## [2.0.0-alpha.142] — 2026-08-17

### Mudado
- feat(mapas): categoria COMUNIDADE — mapas de autoria de fora da casa (#334)
- feat(mapa): adiciona e estabiliza Parque da Treta (#333)
- fix(grafite): fachada da Loja H pintável acima da linha do olho (BUG-53) (#267)
- refactor(core): extrai WEAPONS para data/weapons.js e quebra o ciclo do BotBrain (#332)
- fix(eval): SG6 — régua do teto de kills do submit_match (issue #116, BUG-54) (#288)

## [2.0.0-alpha.141] — 2026-08-17

### Mudado
- fix(telemetry): FPS do painel mede PARTIDA, não jank de boot (BUG-55) (#291)

## [2.0.0-alpha.140] — 2026-08-17

### Mudado
- feat(release): notas consolidadas por faixa de tag + domínio canônico corosolto/client (#323)

## [2.0.0-alpha.139] — 2026-08-17

### Mudado
- chore: limpeza e instrumentação — cache split, portas, GPU shots, readiness
- [Notas completas do release](https://github.com/rubenmarcus/csbrasil/releases/tag/v2.0.0-alpha.139).

## [2.0.0-alpha.138] — 2026-08-17

### Mudado
- docs(contributing): divisão de bots — estraga-codigo conserta, regras de fork (#324)

## [2.0.0-alpha.137] — 2026-08-16

### Mudado
- fix(client): bundle público não nomeia o backend — régua eval:backendhints (#299)

## [2.0.0-alpha.136] — 2026-08-16

### Mudado
- fix(audio): troca voz do Faria Limer

## [2.0.0-alpha.135] — 2026-08-16

### Mudado
- ci: gate de review-bot enxerga o estraga-codigo (reviews, nao so comments)

## [2.0.0-alpha.134] — 2026-08-16

### Mudado
- docs: BUG-57 - regua casava literal de formatacao e travou deploy por 14h

## [2.0.0-alpha.133] — 2026-08-16

### Mudado
- fix(eval): UIA6 aceita o fatiador de dt do #300 - regex exigia literal 'update(dt)'

## [2.0.0-alpha.132] — 2026-08-16

### Mudado
- fix(webgl): contexto perdido na abertura da arena tenta se recuperar (16a22c40) (#303)

## [2.0.0-alpha.131] — 2026-08-16

### Mudado
- fix(game): FPS baixo não desacelera mais o relógio do jogo (issue #295, BUG-56) (#300)

## [2.0.0-alpha.130] — 2026-08-16

### Mudado
- fix(audio): associa bordões aos personagens

## [2.0.0-alpha.129] — 2026-08-16

### Mudado
- feat(ui): fecha redesign AAA, loading e seleção de mapas

## [2.0.0-alpha.128] — 2026-08-16

### Mudado
- chore: plans/ - docs/historico/plans/ (arquivo morto, não estado atual)

## [2.0.0-alpha.127] — 2026-08-16

### Mudado
- chore: remove symlink node_modules commitado por engano + fecha a brecha do gitignore

## [2.0.0-alpha.126] — 2026-08-15

### Mudado
- chore: confirma auto-deploy Vercel pós-org corosolto

## [2.0.0-alpha.125] — 2026-08-15

### Mudado
- chore: verifica integração Vercel após transfer p/ org corosolto

## [2.0.0-alpha.124] — 2026-08-15

### Mudado
- feat: adicionar apoio nacional e internacional

## [2.0.0-alpha.123] — 2026-08-15

### Mudado
- fix(bots): fumaça estica o grace de alvo p/ 4s (#281) (#290)

## [2.0.0-alpha.122] — 2026-08-15

### Mudado
- feat(ui): opcao de inverter o eixo vertical do mouse (#280) (#289)

## [2.0.0-alpha.121] — 2026-08-15

### Mudado
- chore(release): v2.0.0-alpha.120

## [2.0.0-alpha.120] — 2026-08-15

### Mudado
- fix(webgl1): skinning compila no WebGL1 - getBoneMatrix bifurca por __VERSION__ (#275) (#287)

## [2.0.0-alpha.119] — 2026-08-14

### Mudado
- feat(ci): CodeRabbit no lugar do Greptile como revisor de PR (#272)

## [2.0.0-alpha.118] — 2026-08-14

### Mudado
- fix(gameplay): modo arma-única fecha slots, pickup não recarrega, lastinv (Q) (#279)

## [2.0.0-alpha.117] — 2026-08-14

### Mudado
- fix(boot): watchdog distingue rede lenta de travamento (#265) (#278)

## [2.0.0-alpha.116] — 2026-08-14

### Mudado
- feat(mapa): Atacadão da Treta (8º mapa) — supersedes #253 (#271)

## [2.0.0-alpha.115] — 2026-08-14

### Mudado
- fix(eval): mat_shade guard de numpy — build de fork PR volta a passar

## [2.0.0-alpha.114] — 2026-08-14

### Mudado
- fix(api): client de dados com timeout no fetch — acaba com os 504 de 300s (#269)

## [2.0.0-alpha.113] — 2026-08-14

### Mudado
- feat(site): redes sociais no rodapé, atalhos /discord e /telegram, e SEO/GSC pendente (#263)

## [2.0.0-alpha.112] — 2026-08-14

### Mudado
- fix(mapa): adiciona preview do Posto da Treta (sumiu no merge do #250) (#255)

## [2.0.0-alpha.111] — 2026-08-13

### Mudado
- fix(grafite): placement pula caixa procedural + tool tira fundo branco do decal (#260)

## [2.0.0-alpha.110] — 2026-08-13

### Mudado
- chore(release): v2.0.0-alpha.109

## [2.0.0-alpha.109] — 2026-08-13

### Mudado
- fix: música de menu vira pool do manifesto de áudio (#225)

## [2.0.0-alpha.108] — 2026-08-13

### Mudado
- fix(grafite): reassa o layout — loja_h volta de 39,7% para 51,8% (#254)

## [2.0.0-alpha.107] — 2026-08-13

### Mudado
- feat(mapa): adiciona Posto da Treta (6º mapa) — #250 (#250)

## [2.0.0-alpha.106] — 2026-08-13

### Mudado
- feat(portões): régua que casa tag, main e versão (#252)

## [2.0.0-alpha.105] — 2026-08-13

### Mudado
- fix(eval): char-floor skipa CHR8 graciosamente quando magick falta (build fork PR)

## [2.0.0-alpha.104] — 2026-08-13

### Mudado
- fix(build): error-console preserva a exceção antes do guard Script-error (#251)

## [2.0.0-alpha.103] — 2026-08-13

### Mudado
- fix: marcador de registro de tiro na hud (#248)

## [2.0.0-alpha.102] — 2026-08-13

### Mudado
- fix: trata bundles /_vercel/ como terceiro na proveniência de crash (#229)

## [2.0.0-alpha.101] — 2026-08-13

### Mudado
- fix(telemetria): descarta "Script error." cross-origin opaco no coletor de crash (#221)

## [2.0.0-alpha.100] — 2026-08-13

### Mudado
- fix(hud): indicador de dano aponta pra onde o tiro veio (BUG-52)

## [2.0.0-alpha.99] — 2026-08-13

### Mudado
- chore: remove a rota /editor do build público (bancada WIP com problemas) (#220)

## [2.0.0-alpha.98] — 2026-08-13

### Mudado
- fix(eval): mapa-id ignora .worktrees e isenta atribuição histórica da LICENCA

## [2.0.0-alpha.97] — 2026-08-13

### Mudado
- fix(eval): os 4 apontamentos do Greptile na régua de contrato — e um defeito real que o MC3 achou (#242)

## [2.0.0-alpha.96] — 2026-08-13

### Mudado
- feat(portões): pre-push roda o CI antes do push, e o cache para de raspar o teto (#243)

## [2.0.0-alpha.95] — 2026-08-13

### Mudado
- test(eval): contrato de mapa vira régua — o que o game.js consome (#240)

## [2.0.0-alpha.94] — 2026-08-13

### Mudado
- fix(release): push atômico de commit+tag — destrava pr-fast e release (#239)

## [2.0.0-alpha.93] — 2026-08-13

### Mudado
- feat(seguranca): verifica hashes do skills-lock.json na instalação (#230)

## [2.0.0-alpha.92] — 2026-08-12

### Mudado
- fix(eval): reconcilia decal-probe com o medirParede da Quebrada (#75) (#231)

## [2.0.0-alpha.91] — 2026-08-12

### Mudado
- fix(piscina): molde lowpoly da arma não some debaixo do GLB (#211)

## [2.0.0-alpha.90] — 2026-08-12

### Mudado
- fix(havan): veículos em escala de fábrica (a moto era a maior do pátio) (#212)

## [2.0.0-alpha.89] — 2026-08-12

### Mudado
- feat(armas): reserva infinita nos modos de arma única (#213)

## [2.0.0-alpha.88] — 2026-08-12

### Mudado
- feat(armas): arma do morto cai no chão, com prazo e teto (#214)

## [2.0.0-alpha.87] — 2026-08-12

### Mudado
- chore(hooks): todo commit diz quem escreveu, e commit grande pede motivo (#207)

## [2.0.0-alpha.86] — 2026-08-12

### Mudado
- docs: atribuição multiagente, identidade pós-CS 1.6 e licença fora do site (#205)

## [2.0.0-alpha.85] — 2026-08-12

### Mudado
- feat(menu): rotação de mapas na sugestão inicial — menos awp_map, mais exposição (#204)

## [2.0.0-alpha.84] — 2026-08-12

### Mudado
- fix(webgl): WeakMap do drawBuffers não derruba mais o loop (issue #171, BUG-50) (#203)

## [2.0.0-alpha.83] — 2026-08-12

### Mudado
- fix(crash): erro externo não vira mais bug do jogo (BUG-51) (#202)

## [2.0.0-alpha.82] — 2026-08-12

### Mudado
- Custo de cena vira portão, e cor de facção passa a ter origem única (#198)

## [2.0.0-alpha.81] — 2026-08-11

### Mudado
- fix(deploy): não anunciar módulos podados (#199)

## [2.0.0-alpha.80] — 2026-08-11

### Mudado
- fix(shader): fit WebGL1 varying budget (#194)

## [2.0.0-alpha.79] — 2026-08-11

### Mudado
- fix(ci): keep production deploy fallback manual (#193)

## [2.0.0-alpha.78] — 2026-08-11

### Mudado
- fix(three): tolerate null shader logs (#192)

## [2.0.0-alpha.77] — 2026-08-11

### Mudado
- fix(webgl): ampliar compatibilidade no Linux (#191)

## [2.0.0-alpha.76] — 2026-08-11

### Mudado
- fix(webgl): add Linux compatibility mode

## [2.0.0-alpha.75] — 2026-08-11

### Mudado
- fix(site): restore live counts for all five factions

## [2.0.0-alpha.74] — 2026-08-11

### Mudado
- feat(botbrain): bots com rede neural que aprende com jogadores

## [2.0.0-alpha.73] — 2026-08-11

### Mudado
- chore(eval): aposenta 5 famílias de evals obsoletos (G2-R6/R7/R8/R14, R7x, P1/P0) (#43)

## [2.0.0-alpha.72] — 2026-08-11

### Mudado
- fix(eval): censo de grafite mede em 3 alturas, não só na do olho (#76)

## [2.0.0-alpha.71] — 2026-08-11

### Mudado
- fix(identity): migrar autenticação de jogador para UID

## [2.0.0-alpha.70] — 2026-08-11

### Mudado
- docs: atualiza estado e audita backlog

## [2.0.0-alpha.69] — 2026-08-11

> Saldo agrupado das versões `alpha.33` a `alpha.69`. A partir daqui o release automático
> abre uma seção para toda versão publicada, e `docs:check` reprova se o topo divergir do jogo.

### Corrigido - abertura e recuperação do jogo
- O botão JOGAR deixou de ficar inerte por erro de inicialização; falhas de abertura agora
  voltam ao menu com mensagem amigável, tentativa de novo e erro preservado no console.
- O watchdog passou a separar navegação do carregamento 3D, reduzindo falsos timeouts em
  desktop e celular sem esconder travamentos reais.
- UUIDs anônimos ganharam compatibilidade com navegadores sem `crypto.randomUUID`, sem cair
  em identificadores previsíveis.

### Adicionado - telemetria e operação
- Eventos anônimos de partida, funil, aquisição e performance passaram a registrar mapa,
  modo, personagem, arma, resultado e as cinco facções; `/api/health` e o monitor de
  produção tornam falhas de ingestão visíveis.
- Erros públicos de API deixaram de expor detalhes internos; o diagnóstico usa UID anônimo,
  enquanto cooldown e mensagens úteis continuam chegando ao jogador.
- O pipeline ganhou triagem de issues e PRs, previews controlados, smoke de produção,
  ratchet de dívidas, mutation testing e commits automáticos assinados via DCO.

### Adicionado - jogo, HUD e ferramentas
- HUD mobile em retrato, menu de armas no modo `?vmlab=1`, tabela comparativa das 26 armas
  e editor unificado de viewmodel/mapa com alinhamento, recuo e teste no jogo.
- O boot passou a carregar animações mescladas e wallpapers WebP, reduzindo centenas de
  requests; bancadas e viewmodels de laboratório ficam fora do pacote publicado.
- Cartazes tiveram proporção validada, grafites órfãos passaram a reprovar o build e as
  gerações antigas de probes de áudio foram aposentadas.

### Mudado - releases e documentação
- Releases automáticos preservam créditos nativos do GitHub, usam tags anotadas e assinam
  o commit do bot com DCO. O Graphify passou a documentar dependências e zonas de conflito.
- Textos públicos deixaram de usar travessão e a documentação gerada acompanha versão,
  arquitetura, colaboradores e contagens do código.

## [2.0.0-alpha.32] — 2026-08-07

> Primeira entrada da linha `alpha` desde a `.4`. As 27 versões do meio existiram como
> commit e não como release; o que está aqui é o saldo delas, agrupado pelo que mudou
> para quem joga, para quem contribui e para quem publica.

### Adicionado — arte urbana medida, não declarada
- **A parede dos 5 mapas passou a ser pintada por medição.** O jeito antigo era lista de
  coordenadas escrita à mão (`for (const z of [-34, -22, -17, …])`), e ela tem três
  doenças que esforço não cura: só cobre a parede de que alguém lembrou, não sabe se a
  peça sobreviveu, e não escala. `public/js/graffiti_pass.js` inverteu a pergunta — em
  vez de declarar ONDE pintar, ele **descobre onde há parede**, por raycast a partir dos
  waypoints (por onde se anda de fato), e pinta em faixas de altura.
- **A régua que faltava**: `npm run eval:grafite` abre cada mapa num navegador de verdade
  e conta quantas placas de parede VISÍVEL têm tinta. Foi escrita ANTES do conserto e
  reproduziu a queixa do dono com um ponto de erro — ele disse "10-15% de arte urbana na
  Quebrada"; ela mediu **12,7%**.

  | mapa | antes | depois |
  |---|---|---|
  | Piscina | 42,1% | **99,1%** |
  | Loja H | — | **95,6%** |
  | Brasília | **0,0%** | **87,1%** |
  | Quebrada | 12,7% | **87,1%** |
  | Ferro Velho | — | **70,5%** |

  A Brasília tinha literalmente **zero** peça na tela: as 16 dos ministérios nasciam no
  vão do pilotis e eram, corretamente, reprovadas uma a uma.
- **A colocação é assada** (`public/js/graffiti_layout.js`, via `npm run grafite`). A
  passada custa ~9 s na Quebrada e o build inteiro do Piscina custa 88 ms; como a
  colocação é função pura de (geometria, semente), ela roda uma vez no navegador — o único
  lugar onde os GLB existem — e o jogo só monta a geometria pronta, em 6 ms.
- **Direção de arte por declaração**: `limpo` (zona sem tinta — a Loja H só é pichada por
  fora) e `evitar` (tipo de superfície — no Ferro Velho, lataria e mato não recebem tinta).
  As duas viajam no layout, então a régua não cobra dívida de parede que ninguém quer
  pintada.
- **Galeria de homenagens póstumas** em mural de tijolo de 5,4 × 2,8 m: Chorão, Champignon,
  Tim Maia, Rita Lee, Raul Seixas, Sabotage, Marcelo Yuka e Chico Science. A vaga de cada
  uma é **medida** — a passada procura a maior parede livre de cada região. Antes elas
  existiam como adesivo de 1 m dentro de um pool de tags, e por isso só apareciam num mapa.
- Os **cartazes da coleção** deixaram de viver em 2 dos 5 mapas. Nenhum ficou órfão.

### Corrigido — o que quebrava calado
- **Decalque morria em silêncio.** Os barracos da Quebrada são `InstancedMesh` criados na
  penúltima linha do build; todo decalque era colado ANTES disso, num mundo onde a fachada
  ainda não existia. `medirParede` não achava malha, devolvia `null`, e a peça sumia sem
  aviso: **96 peças na tela de 334 pedidas**. Em node o GLB nunca carrega, então o probe
  antigo jurava que estava tudo lá.
- **PNG que dá 404 virava retângulo branco.** Só 12 dos 209 decalques estão no git (o resto
  é gitignored por procedência); textura que falha no three não some — fica sem `image` e o
  material desenha branco chapado. Agora a peça some junto com o arquivo.
- **O pacote de decalques publicado estava atrás do jogo**: `decals-pack-v1` tinha 174
  arquivos e o `DECAL_FILES` já pedia 196. Os 22 `folha-*` davam 404 em produção — **513
  das 4.671 peças sumiam, 30% da Quebrada**. Publicado o `decals-pack-v2`.
- **Peça no ar**: toldo, marquise e lona passavam no teste de encaixe (a face de um toldo É
  plana) e liam como pintura pairando. Duas regras novas — a parede tem que descer até o
  chão, e lona não é parede.

### Adicionado — o build reprova antes de publicar coisa quebrada
- **`npm run assert:assets`** entra no `buildCommand` da Vercel. `scripts/fetch-audio.sh`
  terminava com `|| cp manifest.example.json manifest.json`: zip sem manifest = build
  **verde** com o jogo mudo, no áudio sintetizado. E isso nunca aparecia na máquina de quem
  desenvolve, porque os dois fetch scripts começam com early-exit — o caminho de download
  só roda na Vercel. Bug invisível por construção.
- **154 MB de viewmodel Tripo fora do publicado** (`scripts/prune-dist.mjs`). Só carregam
  atrás de `?tripovm=1` e `?tvm=1`. `dist/client` 625 → 488 MB.
- **O atalho do `three` do arnês mudou de casa.** Era plantado UM NÍVEL ACIMA do projeto,
  logo compartilhado por todo checkout debaixo daquele pai — um clone velho em `/tmp`
  deixou o link pendurado e qualquer checkout novo nascia com as ~150 réguas de
  `tools/eval` quebradas, em silêncio (`existsSync` num symlink quebrado devolve `false`,
  e um `try{}catch{}` engolia o `EEXIST`).

### Adicionado — jogo e interface
- **Inglês no jogo**: detecção pelo navegador, seletor em CONFIGURAÇÕES e `?lang=`. As
  páginas estáticas ganharam gêmeas EN, com nav e rodapé por idioma.
- **FEEDBACK no menu** (era MAPA): texto livre, email e consentimento explícito de
  newsletter em coluna própria — só entra na lista quem marcou.
- **Placar** com brasão por time, duas colunas alinhadas e bandeirinha na cor do time.
- **Menu mobile em retrato** consertado. O HUD em pé continua devendo.
- Spawn nasce no chão do mapa (fim do teleporte de 3,40 m na Loja H); colisores na altura
  do corpo em Brasília; bandeira de CTF com o nome do próprio mapa.
- **Áudio** com nomes binários, fechando o BUG-19 (produção servia o pack de julho e todo
  som novo dava 404).

### Adicionado — site, SEO e acessibilidade
- `hreflang` pt-BR + `x-default`; sitemap vira índice paginado acima de 5.000 URLs;
  `og:image` própria por página; uma página por facção em `/faccoes/<id>`; 404 no visual do
  jogo; âncoras e busca por versão no `/changelog`.
- Skip link, foco visível universal e auditoria de contraste.
- Página de armas com as **26 renderizadas do GLB do jogo**, não geradas por IA.

### Mudado — licença e governança
- **AGPL-3.0** aplicada em 8 superfícies, num commit só.
- Produção passa a sair **só por Release** — a Vercel deixou de auto-deployar a `main`.
- Portões de PR, banco fora do repo público (schema e migrations viram acervo privado) e
  ratchet de dívidas conhecidas no portão de invariantes.

### Conhecido — o que continua devendo
- Quebrada em 87,1% contra a meta de 90%. As placas que faltam estão num trecho escalonado
  do muro oeste onde a régua enxerga uma face 0,6 m à frente daquela em que a peça
  encaixou; densidade maior não move o número.
- Brasília recebeu **1** mural de homenagem: é praça aberta sobre pilotis e não tem 8
  paredes de 4 m livres. As vagas são medidas, não declaradas.
- Os murais do Chorão e do Yuka são "no espírito de", não retrato — semelhança de verdade
  precisa de foto de referência local (`tools/gen-image.mjs --ref`).
- `013_feedback.sql` é aplicada **à mão** na base de produção; até lá o form responde
  "indisponível".
- 13 dívidas críticas seguem no `tools/eval/KNOWN-RED.json` e o BOT8/BUG-03 continua aberto.

## [2.0.0-alpha.4] — 2026-08-04
### Mudado — ranking DESLIGADO, medição LIGADA
- **`RANKING_ON = false`** (`src/lib/site.ts`, fonte única). `/ranking` e `/u/*` respondem
  **200 com aviso + `noindex`** — não 404, porque as URLs estão indexadas, são o que a badge
  PNG referencia nas redes, e vão voltar. O link sai do nav e do rodapé;
  `/api/leaderboard` responde `{disabled:true}` e o painel do jogo mostra "desligado" em vez
  de "indisponível" (escolha ≠ defeito, e o jogador lê a diferença). O FAQ e o JSON-LD da home
  pararam de prometer ranking global. **Religar é uma linha.**
- **Telemetria anônima** (`migrations internas 012` + `POST /api/telemetry`): quanto tempo se
  joga e em que mapa/modo, agregado por dia em `map_daily` e `player_daily`. `anonId` é UUID
  no `localStorage` — identifica navegador, não pessoa; nenhum IP é gravado. **Não passa pelo
  rate limit do `submit_match`** (1 partida/90 s por nick), que existe contra ranking forjado
  e aqui só apagaria dado real. Cobre também quem **não digita nick** — que era invisível para
  o banco e é o caminho de menor atrito, logo o mais comum.

### Adicionado — chão multinível no motor
- `groundHeightAt(x, z)` virou `groundHeightAt(x, z, yRef)`: o mapa responde *"qual superfície
  é o chão de quem está nesse Y"* em vez de "a de cima, sempre". **Dá pra andar debaixo da
  escada da Havan** — antes o vão era visível e o motor tratava a escada como o chão dali,
  então a boca da escada era uma parede invisível. Pé-direito é parte da regra
  (`ALTURA_LIVRE = 1,95 m`): só abre embaixo onde cabe gente em pé. Sem `yRef` devolve o topo,
  o comportamento antigo — nenhuma régua mudou. **Falta a metade dos bots:** o A* é grafo de
  `(x,z)` sem camada, então o bot ainda não planeja rota por baixo.
- **Cartazes no Piscinão** (12, das 4 paredes): os 18 arquivos de `public/posters/` já eram
  carregados e só a Brasília usava. O Piscinão era azulejo branco de parede a parede, sem
  referência de direção.

### Mudado — jogo
- **Round de single player não tem mais teto de abates.** Fechava no alvo (4v4 → 12 abates),
  cortando a rodada quando ela estava boa, sem o jogador ter escolhido isso em lugar nenhum
  do menu. Agora termina por relógio ou eliminação, como no CS. `?pace=1` devolve o alvo.
  O CTF não muda: lá o alvo é de bandeiras, é a mecânica do modo.
- **Tiro 4,2 dB mais baixo** (`GUN_VOL = 0.62`, `?gunvol=N`). Baixar o master abafaria voz,
  passo e rádio junto — e passo é informação de jogo. O desequilíbrio era da arma contra o
  resto, então o fator mexe só no tiro e preserva a hierarquia de calibre.
- **Fala in-game tem teto de 8 s.** O "coe rapaziada" dos funkeiros tinha **28 s** (o segundo
  mais longo da facção tem 5,8 s) e ficava na frente do tiroteio inteiro. Cortado com
  fade-out e renomeado. `npm run audio` agora reporta toda fala de `ingame/` acima do teto —
  sobraram 3 (bolsonaro 13,0 s, petista 12,5 s e 8,2 s).

### Corrigido — áudio: a pasta virou a verdade
- **O manifest de áudio agora é GERADO do disco** (`tools/gen-audio-manifest.mjs`,
  `npm run audio`, com `npm run audio:check` no portão). Era escrito à mão, então toda leva de
  som novo dependia de alguém lembrar — e não lembrava. **Os funkeiros ganharam a própria voz
  (40 ingame + 20 round; usavam a dos Tribos)**, petista foi de 11+7 para 17+14, bolsonaro de
  13+6 para 16+14. Os 289 caminhos foram conferidos contra o disco: 0 quebrados, e os nomes com
  espaço e parêntese saem codificados (sem isso o som simplesmente não toca).
- **Ordem do portão** (`npm run check`): `eval:vm` roda **antes** de `eval:invariants`. Na
  ordem antiga o `&&` cortava no primeiro vermelho e o JSON do viewmodel nunca era regenerado —
  o portão media o dia anterior e inventava vermelha.
- **Removidos três PDFs pessoais de dentro de `public/`** — tudo ali é servido pelo site.
  Não chegaram a ficar expostos em produção; um `vercel deploy` local os publicaria.

### Corrigido
- **O build estava quebrado e ninguém sabia**, porque `npm run build` nunca havia rodado nesta
  árvore. `changelog.astro` lia o `CHANGELOG.md` por caminho relativo a `import.meta.url`, que
  no bundle aponta para `dist/server/` — ENOENT derrubando o prerender inteiro. Agora usa
  `?raw` (Vite embute no bundle). No mesmo build nasceu **`public/wasm/resvg.wasm`**, que
  faltava para o og:image das páginas de jogador.
- **`/mapa`:** o nome da cidade era etiqueta permanente — 40+ rótulos amarelos empilhados
  sobre o Sudeste, escondendo os próprios círculos que rotulavam. Agora a cidade aparece no
  **clique**, e no hover.
- **Arte nova não aparecia.** `wall-9.png` e `loading-6.png` estavam no disco e eram
  ignorados em silêncio: as listas de `main.js` paravam em `wall-8` e `loading-5`. Os dois
  entraram; o conserto de fundo (manifesto gerado em build) está em KNOWN-BUGS.md BUG-08.

### Mudado
- **Versionamento** passa a distinguir alpha/beta/release (bloco acima).
- **`references/` e `issues/` saíram do git** — a construção é local. Os 2,5 GB de captura de
  rodada e as telas-alvo da UI ficam na máquina; o que sobrevive ao clone são os números
  medidos, em `tools/eval/ref_ui.json`.

### Documentação
- **`KNOWN-BUGS.md`** (novo): 17 defeitos com `arquivo:linha`, causa raiz e reprodução.
- `HANDOFF.md` e `PROMPT.md` atualizados: estado do portão, ordem de trabalho e a armadilha
  do `npm run check`, que media o viewmodel com JSON de ontem e inventava vermelha.

## [3.3.0] — 2026-08-02 *(publicada como `2.0.0-alpha.3`)*
### Adicionado — Funkeiros: 5ª facção jogável (9 personagens GLB da Mint)
- **Roster** (`characters.js`, `team:'F'` + `tribe:'funkeiros'`): Mandrake, Raul da
  Franja, Oakley, Cria RJ, Chave SP, Funk Raiz, Trap Funk, Fluxo, Ostentação.
  Selecionável no menu (card novo `btn-team-f`, dourado) em qualquer lado — joga no
  lado P, como Tribos e Palhaços. Rim dourado (`TEAM_RIM.F`), cor/nome/tag no HUD e
  CTF (`game.js`), armas próprias no `CHAR_WEAPON`.
- **Mandrake é o antigo "funkeiro" dos Tribos** — o visual (boné + Juliet vermelho)
  sempre foi de mandrake; só estava na facção errada. `funkeiro.glb`/`anims/funkeiro/`
  viraram `mandrake.glb`/`anims/mandrake/` (originais mantidos no disco, fora do registry).
- **Pagodeiro** (GLB novo, roupa branca + platinado) cobre o slot dele nos Tribos Urbanas.
- **Pipeline**: Raul/Oakley/Cria RJ/Chave regerados na Mint com as referências de
  `references/funkeiros/` (o Raul agora tem franja açucarada + cordões; o Oakley tem o
  chapéu Medusa; o Cria RJ tem o cabelo zebrado platinado); Pagodeiro é novo; os 4
  restantes vieram do pack original. Nenhum GLB da Mint veio riggado — todos passaram
  por `tools/rig-from-donor.mjs` (esqueleto do mst + auto-skin), `optimize-tribos.mjs`
  e `retarget-glb.mjs` (11 clipes por personagem em `models/anims/<id>/`, validados com
  `check-clip.mjs`: 0 ossos faltantes, durações e root motion idênticos ao pack mixamo).
- Voz/round da facção: `manifest.json` local ganha chave `F` espelhando a dos Tribos
  (pack próprio de funk fica como follow-up; sem a chave o fallback já é gracioso).
- Bump de cache: `VERSION` 3.3.0 + import map do `index.astro`.

## [3.2.0] — 2026-08-02 *(publicada como `2.0.0-alpha.2`)*
### Mudado — viewmodel: o look final é CS 1.6 (escolha do dono)
- Medido frame a frame no vídeo de referência (aim_ak-colt): arma BAIXA (boca do cano a
  ~0,66H, abaixo da mira), flanco aparecendo, coronha inteira no canto inferior-direito.
  `VM_FOV_DEFAULT` 92→80, `recuoZ` 0,75→1,10, `nearX` 1,35→1,05, `tanH` 0,80→0,67,
  `VM_OFF` y −0,10→−0,23. O look Quake 4 (3.1.0) fica reproduzível por querystring —
  ver o bloco de comentário no `VM_FRAME` (vmattach.js). Cano continua exatamente
  paralelo à mira (`rotation.set(0,0,roll)`, checado em runtime nas 6 classes).

### Adicionado — Ferro Velho: cânion BECO OESTE (imagem-conceito do dono)
- O flanco oeste vira um cânion reto de z=+32 a z=-24: muros DUPLOS de carros (~5,6 m)
  contínuos, duas saídas laterais de 5,6 m pro miolo, placa suspensa "BECO OESTE" na
  boca sul e a bandeira W (agora 'BECO OESTE') no miolo do beco. Kill-switch `?beco=0`
  restaura o layout antigo. A*/waypoints e LOS spawn↔spawn verificados
  (`tools/eval/fv-verify.mjs`: 4 bandeiras alcançáveis dos 2 spawns nos dois modos).
- **Clima de fim de tarde**: sol mais baixo e quente (sombras longas), silhueta de
  FAVELA nova nos cartões de skyline do fundo norte, chão de barro úmido com poças de
  chuva espelhadas no vão do beco, e o capim alto sai do vão (barro limpo como na
  referência — o verde×ferrugem do BAR segue no resto do pátio).
- Harness novo: `public/fveval.html` + `tools/eval/fv-capture.mjs` (7 ângulos do mapa)
  e `tools/eval/fv-verify.mjs` (A*/LOS).

## [3.1.0] — 2026-08-01 *(publicada como `2.0.0-alpha.1`)*
### Corrigido — enquadramento do viewmodel no nível Quake 4 / UT / Halo
- **Look refeito** (refs do dono: Quake 4, Halo Infinite, UT): lente do VM 64°→92°,
  arma mais perto do olho (`recuoZ` 1,35→0,75), coronha CORTADA pela borda direita
  (`nearX` 0,80→1,35), `tanH` 0,46→0,80 (compensa a lente aberta puxando a arma pro
  centro), cano 12,5°→16,7° abaixo do eixo, e arma 10 cm mais alta (`VM_OFF` y
  −0,20→−0,10) pra coronha cruzar a borda direita dentro do quadro em vez de sumir
  por baixo. Cano continua exatamente paralelo à mira (`rotation.set(0,0,roll)`).
- **Bug do re-frame**: o `_vmFrame` rodava uma única vez ANTES da `vmCamera` existir —
  a trava de borda calculava com o fallback de 62° pra sempre e a lente real (e o
  `?vmfov=`) nunca afetavam o enquadramento. Agora há re-frame forçado após a criação
  da `vmCamera`.
- **Código morto removido**: `?vmlook=quake|halo|cs` (tunava o pipeline Tripo, inativo
  desde que o padrão é MINT_VM — os presets renderizavam idênticos).
- **5 knobs ao vivo** por querystring: `?vmfov= ?vmzmul= ?vmnearx= ?vmtanh= ?vmtanb=`
  (mais o `?vmoff=` que já existia).
- Harness novo: `tools/eval/vm-quake-capture.mjs` (máscara exata do VM via on/off da
  vmScene), `tools/eval/vm_quake_measure.py` (6 métricas do look) e
  `tools/eval/vm-quake-scen.mjs` (regressão: flash na boca, ADS, reload, look-down).

## [1.15.0] — 2026-07-20 (branch feat/evio-feel)
### Adicionado — feel ev.io
- **Movimento crocante**: aceleração 55/12 (era 42/8), atrito contínuo com parada
  suave, air control real no ar, landing dip proporcional ao impacto, bob de
  câmera escalonado pela velocidade
- **Recoil com retorno**: acumula por tiro e recupera suave (padrão por arma),
  em vez da subida permanente
- **Sway do viewmodel**: a arma fica defasada ao mouse (ev.io feel)
- **Indicador direcional de dano**: cunha vermelha na tela apontando a origem do
  tiro (ângulo relativo à câmera)
- **Contraste ACES**: hemi 1.05→0.82, sol 1.5→1.65 (mais estrutura sem perder o
  claro de Brasília)

### Infra
- `STUDIO_CONSTITUTION.md` (10 princípios) e `QUALITY.md` (barra ev.io mensurável)
- `studio benchmark` (FPS/p95/draw calls/tris numa partida real) e `studio validate`

## [1.14.0] — 2026-07-20
### Corrigido
- **Bots empunham de verdade**: idle agora é pose de empunhadura (frame de passagem do
  clipe de andar, pés juntos no chão — sem perna levantada "flutuando") e a cabeça
  sobe 2° em runtime (adeus "cabeça baixa")
- **Bots exploram o mapa todo**: direção de roam derivada do layout dos spawns (a troca
  P<->B tinha invertido o lado), 40% dos alvos são distantes, repick ao CHEGAR ao nó
  (não por tempo), e lane preferida por bot — o time se espalha
- **Strafe deslizante em combate**: juke lateral menor + bot fica em idle quando está
  quase parado (sem "andar no lugar")
- **Estátua A Justiça**: grafite "PERDEU, MANÉ" agora NO PEITO da estátua (medido por
  raycast), não flutuando ao lado
- **Palácio do Planalto**: assentado NO TOPO do plinto (antes afundava no chão)
- **Posters**: nas pontas cinzas dos Ministérios, grandes (DOLLYNHO, ET, Chupacabra,
  Saci e os demais memes da pasta public/posters)
- **Armas só no respawn**: fileira alinhada de 8 por spawn (snipers primeiro), sem
  scatter pelo mapa; bots não devoram a rack
- **Viewmodel 1ª pessoa**: mãos com dedos de 2 segmentos e palma mais fina
- **Cache de assets**: GLBs carregam com ?v=VERSION (sem versão velha presa no cache)

### Adicionado
- **Ônibus do DF gerado no Mint** (amarelinho de verdade, não caixas) atravessado no
  CENTRO da Esplanada como cover
- **Barraquinha de bebida gerada no Mint**: quiosque + guarda-sol grande + cadeiras de
  plástico + engradados (mini-bar de rua)
- **Zastava M92 e HK G3 gerados no Mint**: a M92 (AK curto iugoslavo, madeira +
  receiver preto) substitui a Type 56, e a G3 (battle rifle alemã, coronha oliva)
  entra no arsenal — ambas com sons próprios (takes PD do AK-47 e do 50 Cal)
- **Caixas Correios/SEDEX** no lugar das caixas "FRÁGIL TRETA" (que eram do outro mapa)

## [1.13.0] — 2026-07-20
### Corrigido
- **Bots "de skate/moonwalk"**: cadência das pernas agora segue a velocidade real do
  chão por clipe (refs medidos no harness: walk 0.79, run 1.92, crouch 0.83 m/s),
  escolha walk↔run por velocidade com histerese, e backpedal toca o clipe de andar
  revertido (recuar não é mais moonwalk)
- **Congresso invertido**: torres gêmeas agora atrás, cúpula do Senado à esquerda e
  tigela da Câmara à direita (vista cartão-postal a partir da Esplanada)
- **Palácio do Planalto "flutuando"**: plinto de pedra medido do footprint real do
  prédio, aterrando os pilotis
- **Vidros da Catedral**: vitral azul entre as costelas (perfil medido do modelo),
  em vez do cilindro atravessado na coroa
- **Posters flutuando**: colados na face real de cada Ministério (medida por bbox)
- **Mãos em 1ª pessoa**: mão do gatilho no cabo real da arma e mão de apoio no
  guarda-mão (derivado de len/gripZ de cada arma) — pistola não fica mais sem mão
- **Pop-in no seletor**: não aparece mais o personagem em blocos antes do GLB —
  o modelo anterior fica na tela até o novo chegar

### Adicionado
- **Ônibus quebrado do DF** ("amarelinho", pneu murcho, caído pro lado) como cover
  grande no meio da Esplanada + **barricada improvisada** (bloco, chapa, tábuas)
- **Estátua A Justiça v2**: bandeira do Brasil como faixa no peito (mesh) +
  grafite "PERDEU, MANÉ" pequeno no peito, como na referência do 8/1
- **Sons reais de armas em produção**: pack CC0/domínio público (gravações reais,
  qubodup/Freesound) commitado — AWP/snipers, AK, M16, LMG, escopeta, pistola, SMG
  e reload tocam de verdade no ar; o manifest local com sons do CS segue tendo
  prioridade em dev
- **Harness de eval** (tools/eval + public/*eval.html): captura headless de mapa,
  personagem, viewmodel e gameplay com telemetria — verificação local antes de mostrar

## [1.12.3] — 2026-07-18
### Corrigido
- **Modo de armas também filtra o mapa**: em SÓ PISTOLAS/FACA/AWP os pickups
  incompatíveis somem do chão (não só da mão do jogador)
- Home: RANKING/COMO JOGAR/CONFIG viraram botões laterais menores; dropdown
  de armas agora é custom com **ícones SVG das armas** (mesmo CSS do dropdown
  de mapa)

## [1.12.2] — 2026-07-18
### Mudado
- **Nick obrigatório** pra jogar: sem nome, o JOGAR não deixa passar (campo
  treme, fica vermelho e pede "DIGITE UM NICK PRIMEIRO!")

## [1.12.1] — 2026-07-18
### Adicionado
- **Modo de armas** (dropdown ao lado do mapa): TODAS / SÓ PISTOLAS (pistola +
  deagle nos pickups) / SÓ FACA (sem armas nem pickups) / SÓ AWP (sem pistola,
  pickups só de AWP) — afeta loadout inicial e quais pickups o jogador pode
  pegar com E (bots seguem no padrão AWP)

## [1.12.0] — 2026-07-18
### Adicionado
- **Arsenal completo**: AK-47, M4A1, MP5, Escopeta M3 e Deagle jogáveis
  (auto-fire com bloom, 8 pellets na M3, viewmodels próprios, sons reais da
  pasta `audio/weapons/`) além da AWP, pistola e faca
- **Captura com E** + hint `[E] PEGAR <ARMA>` (bots continuam pegando andando)
- **M mostra a seleção de personagem** do novo time antes de trocar de lado
- **Dropdown de mapas** na home (depois dos campos, antes do JOGAR)
- Mais obstáculos no Piscinão (pilares, bancos, boxes de chuveiro, lixeiras)
  e no Sítio (fardos de feno, trator, poço, bebedouro, cercas extras)

## [1.11.0] — 2026-07-18
### Adicionado
- **Mapa fy_pool_day "Piscinão da Treta"** (cherry-pick do PR #3 de
  [@daltonfontes](https://github.com/daltonfontes) 🎉) + registro de mapas
  (`js/maps.js`) e seletor MAPA no menu — estilo "full weapons" com 22
  pickups de arma no chão
- **Weapon drop**: morto larga a arma no chão (CS clássico); passar por cima
  pega + munição cheia — drops somem ao ser pegos, pickups do mapa respawnam
- **Dificuldade 1.5x**: precisão ×1.5 (c/ bônus de posição parada), reação e
  cadência dos bots 1.5× mais rápidas, dano 42→63; jogador com troca de arma
  e scope mais responsivos
- **Bots mais espertos**: caçam quem atirou neles mesmo sem ver o atacante
- **+2 personagens**: Jovem Místico (P — faixa, cristal, aura calibrada) e
  Coach Quântico (B — blazer, headset, "DESPROGRAME-SE"); roster 5×5, 4×4
  mantido em campo

## [1.10.0] — 2026-07-18
### Adicionado
- **Anti-trainer (servidor)**: consistência física no RPC — kills ≤ 45/round
  e ≥ 80s/round (impossível pra trainer de speed/autoshot), rate limit por IP
  via `submit_log` (60s + 200/dia), flags automáticas (3 = sai do ranking)
  — migration 009
- **Paginação no /ranking** (25/página) e view com limite de 500 jogadores
- **Ícones de marca reais** (simple-icons CC0) nos chips sociais
- URLs sociais auto-normalizadas (conserta links quebrados de dados antigos)
- `SECURITY.md`: modelo de segurança honesto + SQL de moderação

## [1.9.0] — 2026-07-18
### Adicionado
- **Tema terminal Y2K/Half-Life** no site: âmbar em fundo escuro, monospace,
  cantos retos, scanlines, tabelas e cards terminal (Layout + páginas)
- **Multi-redes sociais** (até 3) no card de perfil do menu, com extração
  automática de handle ao colar URL e validação — `players.socials` (jsonb,
  migration 008)
- **Chips de rede** (ícones X/GH/IG/in/TT/YT) no ranking e perfil em vez da URL crua
- **Personagem como fallback de ícone** no ranking e no perfil (charSvg
  compartilhado via `src/lib/charsvg.ts`)
- **Botões no HUD durante o jogo**: ⚙ configurações e 🔊/🔇 liga-desliga falas
  (só memes — vitória/UT/arma continuam), também nas configurações

## [1.8.1] — 2026-07-18
### Mudado
- Botões de login social removidos do menu (OAuth fica pra era multiplayer)
- Upload de foto agora fica **na tela principal**, visível quando a rede não é
  X/GitHub (esses puxam avatar sozinhos)
- Logo menor e mais pra cima no menu

## [1.8.0] — 2026-07-18
### Adicionado
- **Seletor de rede social** no menu (X, GitHub, Instagram, LinkedIn, TikTok,
  YouTube, site próprio) + handle — sem precisar de login; campo de usuário
  fica desabilitado até escolher a rede
- **Avatar do GitHub automático** (oficial, `github.com/handle.png`) além do X
- **Upload de foto sem login** (`POST /api/avatar`, validado por nick+token,
  resize 128×128 no servidor) — cobre Instagram/LinkedIn/TikTok, que não têm
  fetch público de avatar

### Mudado
- OAuth social passa a ser opcional/dormant (volta na era multiplayer)

## [1.7.6] — 2026-07-18
### Adicionado
- Mapa: nome da cidade sempre visível (tooltip amarelo permanente) e popup com
  **lista de jogadores + total por cidade** (via presence, cidades com 0
  partidas mas com jogadores também aparecem)

## [1.7.5] — 2026-07-18
### Corrigido
- Proporções do card de badge: cabeçalho compacto, grade 3×3 com margem real,
  skyline removida (colidia com a última linha de stats)

## [1.7.4] — 2026-07-18
### Adicionado
- **Mortes (deaths)** no ranking, perfil, painel local e badge (agora em grade
  3×3 com MORTES entre KILLS e HEADSHOTS)

## [1.7.3] — 2026-07-18
### Mudado
- Vitórias zeradas aparecem como "—" (não parece mais bug) no ranking, perfil,
  badge e painel local

## [1.7.2] — 2026-07-18
### Corrigido
- Submits rejeitados pelo rate limit de 90s (abandono + partida em seguida)
  agora entram numa fila local e são reenviados automaticamente — nenhuma
  partida se perde mais por janela de rate limit

## [1.7.1] — 2026-07-18
### Adicionado
- Placar geral no `/mapa`: total de jogadores, partidas e kills + barra de
  proporção % petistas × % bolsonaristas

## [1.7.0] — 2026-07-18
### Adicionado
- **Personagem como avatar**: sem foto/X, a badge usa o personagem escolhido no
  jogo (SVG por id) e mostra "joga de &lt;personagem&gt;" — `last_character`
  gravado por partida (rode o schema.sql pra criar a coluna)
- **NEUTRO**: empate de lados (1P × 1B) vira terceiro estado no card
- **Site imersivo**: páginas do Astro agora têm o fundo 3D do jogo (o mundo
  real orbitando, mesmo código do menu) com overlay escuro
- **Botões de canto** no menu do jogo: RANKING ↗ MAPA ↗ SOBRE ↗

### Mudado
- Redesign do card de badge: stat-cards arredondados, glow na cor do lado,
  skyline de Brasília no rodapé

## [1.6.3] — 2026-07-18
### Mudado
- "Abates" vira "kills" em toda a UI (placar, ranking, perfil, badge, docs)

## [1.6.2] — 2026-07-18
### Corrigido
- Heartbeat/submit usam o nick **registrado** na sessão (editar o nick no menu
  não quebra mais o token) e param de tentar após 403

## [1.6.1] — 2026-07-17
### Corrigido
- `submit-match` auto-recuperável: se a função do banco está desatualizada
  (sem p_seconds/p_rounds/p_team), grava o núcleo dos stats mesmo assim e
  responde com aviso pra rodar o schema.sql atual

## [1.6.0] — 2026-07-17
### Adicionado
- **Stats de abandono**: quem sai da partida no meio (botão sair ou fechar a
  aba) também entra no ranking — submit parcial ao sair + sendBeacon no unload
- **Mapa com histórico total** por cidade (partidas + rounds), não só 7 dias
- **Social link clicável** no perfil e no /ranking
- **Avatar automático do X/Twitter** via unavatar.io quando o social link é um
  handle do X (badge, perfil e ranking; fallback: inicial)
- city_daily agora soma rounds também (migration 005)

## [1.5.3] — 2026-07-17
### Corrigido
- Badge sem texto em produção: o binding nativo Linux do `resvg-js` ignorava
  fontes em buffer — render migrado pra `@resvg/resvg-wasm` (binário único
  embutido, determinístico em qualquer serverless)

## [1.5.2] — 2026-07-17
### Corrigido
- Links de perfil com `undefined` quando a view não tem `id` (fallback /u/nick)

## [1.5.1] — 2026-07-17
### Corrigido
- Falhas de envio pro ranking (função desatualizada, rate limit, token) eram
  engolidas em silêncio — agora aparecem na tela de fim de partida e no console

## [1.5.0] — 2026-07-17
### Mudado
- URL de perfil agora é canônica `/u/<id>/<nick>` (estável mesmo com troca de
  nick e pronta pra nicks duplicados no futuro); `/u/<nick>` redireciona (301)
- Badge aceita id ou nick (`/api/badge/<id>.png`)
- Leaderboard expõe `players.id` (migration 004)

## [1.4.3] — 2026-07-17
### Corrigido
- Tempo "0min" em partidas anteriores ao tracking: agora estima pelos rounds
  (`~Xh Ymin` = estimado, ~99s/round) na badge, perfil, /ranking e painel local

## [1.4.2] — 2026-07-17
### Corrigido
- Página `/mapa` quebrada: o Layout não tinha `<slot name="head"/>` — o CSS do
  Leaflet (e o JSON-LD da landing e as meta do perfil) eram descartados
- Tiles do mapa agora escuros (CARTO dark), combinando com o tema do site

## [1.4.1] — 2026-07-17
### Adicionado
- Avatar do usuário na badge compartilhável (círculo com anel na cor do time;
  fallback: inicial do nick) e no topo do perfil `/u/[nick]`

## [1.4.0] — 2026-07-17
### Adicionado
- **Tempo de jogo** por usuário (min/horas/dias): contado por partida no client
  e somado no ranking — aparece na badge compartilhável, no perfil `/u/[nick]`,
  na página `/ranking` e no painel local do jogo
- Badge agora tem 8 stats (entra TEMPO e ROUNDS)

## [1.3.1] — 2026-07-17
### Corrigido
- Badge de perfil renderizava texto como caixas (□□□): serverless da Vercel
  não tem fontes de sistema — render agora via `@resvg/resvg-js` com
  DejaVu Sans Bold embutida no bundle
- og:image do perfil era sobrescrita pela padrão do Layout (crawler pegava a
  imagem errada) — `ogImage` agora é prop do Layout e `/u/[nick]` usa a badge

## [1.3.0] — 2026-07-17
Fase 3: login social, avatar e mapa ao vivo.

### Adicionado
- Login com **Google, GitHub, LinkedIn e X** (auth própria) — botões no menu
  principal; avatar do provedor entra no perfil automaticamente
- **Upload de foto de perfil** (tela RANKING): redimensiona pra 128×128 no
  client e sobe pro bucket `avatars` com policy por dono
- **Mapa da treta** (`/mapa`): jogadores online agora + partidas por cidade
  nos últimos 7 dias, via Leaflet/OpenStreetMap. Geo aproximado (cidade) dos
  headers da Vercel — IP nunca é armazenado
- Heartbeat de presença a cada 30s durante o jogo (`/api/heartbeat`)
- `city_daily`: histórico agregado de partidas por cidade
- `GET /api/config`: entrega URL + anon key (públicas) pro client ligar OAuth

## [1.2.0] — 2026-07-17
Ranking global (Fase 2) — código completo, ativa ao configurar o servidor de ranking.

### Adicionado
- Stats novos por jogador: rounds jogados e partidas como Petista × Bolsonarista
- Página pública de perfil `/u/[nick]` com badge de stats compartilhável
  (PNG dinâmica em `/api/badge/[nick].png`, aparece no card ao postar o link)
- Página `/ranking` com o leaderboard global (top 100)
- Tela RANKING do jogo mostra o top 10 global sem sair do canvas, com links
  pro ranking completo e pro perfil
- Registro automático de nick no primeiro jogo (token UUID no navegador) e
  envio automático de stats ao fim de cada partida via `/api/*` (SSR, sem
  chave no client)

## [1.1.0] — 2026-07-17
O jogo agora é a rota principal (`/`), menu redesenhado e troca de time livre.

### Adicionado
- Troca de time a qualquer momento com **M** (respawn no outro lado + um bot
  deserta pro time oposto, mantendo o 4×4)
- Landing Astro com FAQ e SEO movida para `/sobre`

### Mudado
- Jogo movido de `/game/` para `/` — URL principal é o jogo
- Menu com botões menores em grid (nick e link social lado a lado)

## [1.0.2] — 2026-07-17
### Corrigido
- Pointer lock: sem ele, tiros/mouse/ESC eram ignorados em silêncio. Agora o
  jogo mostra "clique para ativar a mira" e qualquer clique re-tenta o lock.

## [1.0.1] — 2026-07-17
### Corrigido
- Arma travava inclinada ao trocar de arma no meio da recarga (reload dip
  resetado + decaimento de segurança).

## [1.0.0] — 2026-07-17
Primeira release pública.

### Incluído
- Jogo completo: FPS estilo CS 1.6 com AWP/pistola/faca, bots com IA, rounds,
  placar, radar, rádio de voz, multikills estilo UT e headshots
- 8 personagens satíricos originais (Petistas × Bolsonaristas), mapa
  awp_map brasileiro procedural, 100% vanilla JS + Three.js, zero build
- Site Astro (landing, personagens, como-jogar) + API routes SSR pro ranking
- Ranking local com nick + link social; schema do backend pronto (Fase 2)
- SEO/AEO: JSON-LD, sitemap, robots, llms.txt, og-image
