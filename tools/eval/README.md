# `tools/eval/` — o arnês de medição

Este catálogo existe pra que ninguém precise abrir cada `.mjs` pra descobrir qual mede o quê —
e pra que os **geracionais aposentados** parem de ser reabertos por engano.

> **Regra deste diretório:** o que roda no CI e os arquivos `.md`/`.json`
> versionados são contrato. O resto é ferramenta de rodada — útil, mas
> descartável.

---

## 1. Portões (rodam no CI, reprovam PR)

Todos rodam em **Node puro**, sem Chrome, e terminam em segundos. Todos saem
com código 1 em falha crítica.

| Arquivo | O que mede | Artefato |
|---|---|---|
| `ballistics-falloff-check.mjs` | Extremos e interpolação da queda de dano; mede jogador e ambas as IAs, com mutações da curva e da distância. | `npm run eval:ballistics-falloff` |
| `firing-cadence-check.mjs` | Cadência pelo _updatePlayer real; calendário, cooldown, teto por passo, entrada e interrupções, com mutantes. | `npm run eval:firing-cadence` |
| `recoil-contract-check.mjs` | Perfis históricos de #970; mede câmera, padrão e kick entregue ao viewmodel pelo disparo real. | `npm run eval:recoil-contract` |
| `tp-jump-ownership-check.mjs` | Salto interrompido: seleção real cancela ownership, recusa preserva ação e revive permite retorno; rigs reais em CPU, sem aceite visual. | `npm run eval:tpjumpownership` |
| `tp-identity-check.mjs` | Arma do bot e luva própria no TP: Game/GLBs reais em CPU, boot frio com latch, todas as partes da luva, recusa atômica e mutantes causais; sem aceite visual. | `npm run eval:tp-identity` |
| `ranking-home-status.mjs` | Estado real dos renderers da home: 38 casos entre loading/OFF/rede/vazio/sucesso e oito mutantes; DOM em Node, sem aceite visual. | `npm run eval:ranking-home-status` |
| `invariants.mjs` | **O portão principal.** As invariantes permanentes: toda vez que o dono reporta um bug, ele vira uma invariante aqui e nunca mais volta. Regenera `vm_kick_sim.json` sozinho e LÊ `vm_mint_audit.json`. | `npm run eval:invariants` |
| `vm-mint-audit.mjs` | Enquadramento do viewmodel arma por arma, nos 26 GLBs reais. Mede a seção transversal perto de cada ponta em Z pra descobrir se a arma está de ré. | `vm_mint_audit.json` (**versionado — sem ele as invariantes VM1–VM6/VM9/VM10 viram PULADAS, que é portão verde por ausência de dado**) |
| `vm-kick-sim.mjs` | Coice do viewmodel: near plane + pitch em rajada. Prova que a coronha não atravessa a lente no pico. | `vm_kick_sim.json` |
| `duel-metrics-check.mjs` | BOT4 observa dano efetivo desde HP cheio, proteção, acerto fatal e cura; conserva a rajada final em diagnóstico e mata quatro mutantes. | `npm run eval:duel-metrics` |
| `botsim.mjs` | Navegação dos bots: 60 s × 5 mapas com sementes fixas. Roda a classe `Game` de verdade com os mapas de verdade. | `npm run eval:bots` |
| `release-check.mjs` | Release usa o nome CSBR e as notas nativas do GitHub, que preservam PRs e contribuidores. | `npm run eval:release` |
| `error-provenance-check.mjs` | Preserva erro externo no console/banco sem atribuí-lo ao jogo ou abrir issue automática. | `npm run eval:error-origin` |
| `shader-budget-check.mjs` | Deriva do GLB real o orçamento de varyings da urna e protege fog/triplanar no piso WebGL1. | `npm run eval:shaderbudget` |
| `lajes-cache-check.mjs` | Duas builds reais de Lajes: paridade dos buffers e da sequência RNG, colisores, navegação e oclusores; 49 geometrias compartilhadas nas 9162 caixas, descarte único e isolamento entre builds. | `npm run eval:lajes-cache` |
| `map-rotation-check.mjs` | Sugestão inicial de mapa: link manda, escolha do carrossel fica, e quem não escolhe roda pelos 5 mapas. | `npm run eval:maprotate` |
| `glb-peso-check.mjs` | GLB grande sem referência não entra em public/: todo .glb >10 MB precisa do stem citado em código/config tracked; mutante `bruto` planta 11 MB falso. Compra: os 162 MB de GLB PBR cru da Mint em `props/{caixa_dagua,trave_futebol,favela_house}/` sem nenhuma referência. | `npm run eval:glbpeso` |
| `asset-rev-check.mjs` | Revisão por ARQUIVO dos binários pesados de `/models` e `/audio`: mapa `data/assetver.js` em dia com o disco, nenhum consumidor montando `?v=${VERSION}` na mão, bump de release que não mexe no asset não muda a URL, 1 byte trocado muda só a rev daquele arquivo, e asset fora do mapa cai no fallback de VERSION. Mutantes `versao-crua`, `rev-ignorada` e `mapa-defasado`. Compra: `/models` é immutable por 1 ano e a query era a VERSION, então todo release rebaixava o acervo inteiro — centenas de MB na WebView do app de loja, que não tem service worker. | `npm run eval:assetrev` |
| `perfil-mobile-check.mjs` | Perfil mobile de qualidade (lane glm/peso): degrau inicial sem SSAO, sombra baixa, DPR ≤0,6 e mato ≤0,5; teto de textura min(1024, MAX_TEXTURE_SIZE); cadência de 60 FPS no jogo e 30 FPS no menu; degrau recuperado após reload. Cinco mutantes cobrem início, textura, memória, cadência e marcador automático. | `npm run eval:perfilmobile` |
| `perfil-mobile-browser.mjs` | Integração real em Chrome Android emulado a 780×360: migra o `low` automático antigo, cobra DPR 0,6, 30/60 FPS por contexto, orçamento de efeitos, restauração do degrau após reload e precedência de uma escolha manual. | `npm run eval:perfilmobile:browser` |
| `qa-mobile-check.mjs` | Harness de QA mobile (`public/js/qa-mobile.js`) medido em Chrome Android emulado numa partida viva: relatório completo com FPS p50/p5, degrau da escada, DPR, draw calls e triângulos por quadro (QAM1); prova de que o roteiro de 20 s MEXEU no jogo — munição caiu pelo gatilho de toque e a câmera girou (QAM2); zero erro de JS (QAM3); e custo zero, com a mesma partida sem `?qa=mobile` nunca baixando o arquivo nem publicando relatório (QAM4). Mutante `roteiro-mudo` cala o dispatch de toque e tem que acender QAM2. | `npm run eval:qamobile` |
| `toque-controles-check.mjs` | O dedo consegue jogar: os 3 slots de arma mostram o render real da arma carregada (eram glifos), 300 px de arrasto giram ≥100° com meia-volta em ≤480 px (eram 41° e 1309 px), e arrastar a partir do ATIRA mira sem soltar o tiro. Mutantes `glifo-cru`, `mira-lenta` e `gatilho-mudo`. | `npm run eval:toquecontroles` |
| `emote-partida-check.mjs` | Dançar DENTRO da partida: a tecla T abre a roda com os 8 passos e ESC fecha, o dígito toca no corpo de 3ª pessoa e tira a câmera da 1ª (senão o jogador não se vê), andar derruba o passo e devolve a câmera, morrer derruba e a roda não abre no cadáver, e a câmera AFASTA enquanto dança. 5 cláusulas, 5 mutantes. | `npm run eval:emotepartida` |
| `pose-verdade.mjs` + `../video-pose.py` | Pipeline de dança por vídeo: extrai direção de osso com MediaPipe e mede o erro contra uma animação que o jogo já tem. NÃO entra no check:fast (precisa de Python e do modelo .task baixado). O que ele provou e o que ainda não prova: docs/CAPTURA-VIDEO.md. | `node tools/eval/pose-verdade.mjs` |
| `emotes-check.mjs` | Dança brasileira no lobby: catálogo com origem citada, cada passo move o corpo com a assinatura que promete (passinho é de pé, frevo agacha, gesto é de braço), a MESMA coreografia sai na mesma direção em corpos diferentes — inclusive nos que não têm clipes próprios —, o corpo volta ao normal ao parar, `emotes.js` fica fora do grafo estático do boot e dano/morte cancelam a dança. 6 cláusulas, 5 mutantes. | `npm run eval:emotes` |
| `tp-anim3p-check.mjs` | O corpo em 3ª pessoa denuncia o que faz: mão ao pente e tronco mergulhando na recarga (CCD, sem clipe novo), inclinação no movimento lateral, corpo cedendo ao levar tiro, recuo mesmo agachado, pose de voo segurada no ar com amortecimento no pouso, quadril atrasando o giro, e LOD de animação por distância. Mais a fiação (jogador 3P + bots) e o manifesto de clipes com fallback registrado. 10 cláusulas, 10 mutantes. | `npm run eval:tpanim3p` |
| `mapas-sob-demanda-check.mjs` | Mapas sob demanda (lane glm/peso): nenhum módulo de ARENA no grafo estático do boot (import() dinâmico não conta); contrato de `carregaMapa` (instala build, memoiza, resolve alias) e conferência registro×módulo que rejeita metadado divergente. Mutantes `estatico` e `registro`. Entra no check:fast junto com a fiação do main.js. | `npm run eval:mapasobdemanda` |
| `meshopt-vm-check.mjs` | O GLB meshopt publicado é o que o manifest registra: sha256, container GLB (magic), EXT_meshopt requerida e CARGA com MeshoptDecoder; mutante `troca-byte`. Compra: o 1º conversor explodiu o viewmodel em .bin externo e nenhuma régua olhava o container. | `npm run eval:meshoptvm` |
| `vm-meshopt-ab.mjs` | A/B visual de viewmodel por arma na página `public/vm-meshopt-eval.html` (pose de bind, câmera exportada do GLB). VIÉS CONHECIDO: sob SwiftShader a captura dá 25% de falso positivo (A/A mediu); use em GPU real ou confira com o jogo. | `node tools/eval/vm-meshopt-ab.mjs` |
| `convida-amigos-check.mjs` | Modal de convite: seis plataformas, links de mensagem, cópia antes de abrir, Web Share exercitado, isolamento de `?ui=v3` e busca por e-mail degradável sem a migration 070; mutantes cobrem cada fronteira. | `npm run eval:convidaamigos` |
| `placar-amigo-check.mjs` | +AMIGO no placar Treta Pop: UUID de gente limpa pid velho de bot, legado não ganha controle, pedido usa a sessão real e erros honestos; mutantes cobrem botão, pid, clique, kill-switch e validação. | `npm run eval:placaramigo` |
| `../gen-arch.mjs` | (fora deste diretório) Gera e valida o `ARCH.md`. `--check` reprova se estiver desatualizado. | `npm run arch` |

## 2. Documentos — leitura, não execução

| Arquivo | O que é |
|---|---|
| `ARCH.md` | **GERADO.** Índice do `game.js` por linha + tabela de conflito (quem pode editar qual região). O bloco entre `BEGIN:GERADO` e `END:GERADO` **não se edita à mão** — rode `npm run arch`. O texto fora dos marcadores é conhecimento humano e é preservado. |
| `BAR-CONSISTENCIA.md` | **A régua vigente.** 25 critérios de consistência e flow. Tem **precedência** sobre a `BAR.md`. |
| `BAR.md` | A régua de fidelidade visual (CS2/Valorant, o que é alcançável em Three.js r160, como os lugares brasileiros realmente são). |
| `RUBRIC.md` | Rubrica de avaliação usada pelos críticos do gauntlet. |
| `BASELINE-v2.json` | Baseline numérico da v2, pra comparação A/B. |

## 3. Verificadores de mapa, modo e UI

TRETA: `npm run eval:treta-rewards` valida fila, saldo e dedup por conta com três mutações. `npm run eval:treta-skins` valida os arquivos reais, pesos, clipes e duas
mutações. `npm run eval:treta-video` confere os vídeos de hover das skins (webm VP9, mp4 H.264, poster, até 400 KB) com quatro
mutações; `npm run eval:treta-video-hover` (browser, `BASE=` explícito) mede que nenhum vídeo baixa no boot, que o hover, o foco por teclado
e o primeiro toque tocam o vídeo e que prefers-reduced-motion não baixa nada, com três mutações. `npm run eval:treta-classic` mede o giro/reveal da moeda Saci no loader
do jogo e duas mutações. `treta-integration-browser.mjs` roda compra/equipamento,
recarga e SP/MP no Astro/API/Supabase locais, com contas e saldo temporários.
Use `--backend=<lane> --env=<JSON privado> --fotos=<pasta de evidência>`; a régua
recusa DB/site remoto e restaura catálogo/contas no finally. Aprovação no manifest
é uma fixture explícita dessa QA; os GLBs são os reais. Não prova pagamento real.

| Arquivo | O que mede |
|---|---|
| `map-check.mjs` | Geometria do mapa: colisores, spawns, alcançabilidade. |
| `probe-grafite.mjs` | Sonda descartável da passada viva de grafite: abre `mapview?grafite=vivo` e despeja âncoras (com `__grafiteDebug`), contadores de recusa e superfícies por mapa. Diagnóstico, não é régua. |
| `mode-check.mjs` | Rounds × CTF: o modo abre e termina em todos os mapas. |
| `ctf-verify.mjs` | Bandeiras alcançáveis a partir dos dois spawns. |
| `fv-verify.mjs` | Específico do Ferro Velho (A*/waypoints/LOS com o cânion BECO OESTE). |
| `pickup-check.mjs` | Itens coletáveis: posição e alcance. |
| `ui-check.mjs` | Elementos de HUD presentes e legíveis. |
| `mat-check.mjs` | Materiais: nada preto chapado, nada estourado. `npm run eval:mat` |
| `bot-routes.mjs`, `botdiag.mjs`, `bot-moving-loops.mjs` | Diagnóstico de rota e de estado dos bots. `npm run eval:bot-moving-loops` prova o detector; `SIM_MOVING_LOOPS=1 SIM_SEEDS=12345 node tools/eval/botsim.mjs 60 praca_poderes` imprime candidatos e contexto do alvo em stderr. `target.sampleShare` mede cobertura, `switches` conta trocas, e `travel`/`centerOffset` só aparecem com o mesmo alvo em toda a janela; isto não serve como aceite visual/MP. |
| `stance-speed.mjs` | Velocidade por postura (andar/correr/agachar). |
| `pulo-tiro-recarga-check.mjs` | Os 3 bugs de gameplay de 01/10/2026: (A) tiro no pulo tem piso ADITIVO de imprecisão — a AWP de luneta no ar não é laser (mesma `aberturaCone` do cliente e do nó MP), semente por tiro; (B) pulo agachado não corre no ar (mesma altura, distância ≤ pulo em pé); (C) gatilho preso/clique não rearma recarga vencendo — o pente vazio volta a 30. Mutantes: `cone-ar`, `crouch-ar`, `reload-rearma`. `npm run eval:pulotirorecarga` |
| `round-municao-check.mjs` | Contrato de munição entre rounds (relato de out/2026): sobreviver ao corte de round não entrega o round seguinte sem balas — o loadout dos SLOTS (primária/secundária do modo) renasce cheio igual ao respawn, sem presentear slot proibido (SÓ AWP não ganha pistola, FACA não ganha pente de rifle). Mutantes: `sem-refill`, `refill-ignora-modo` (`mut:roundmunicao`). `npm run eval:roundmunicao` |
| `camera-oclusao-check.mjs` | Oclusão do boom da câmera de 3ª pessoa/ombro (relato de out/2026, ferro velho/favela): a câmera para ANTES de prop alto atrás do jogador (occluders via raycaster) e do PANO que não segura bala (`world.camBlockers`, Box3 — varal da favela: câmera para, tiro passa), com piso de 0,35 m e boom recompondo a 5 m/s sem elástico. Mutantes: `sem-pull-in`, `ignora-camBlockers` (`mut:cameraoclusao`). `npm run eval:cameraoclusao` |
| `pistola-cadencia-check.mjs` | Cadência das pistolas semi no piso do gênero (relato de out/2026: "firerate muito baixo"): PT-38 0,17 s e Deagle 0,24 s, TTK de corpo < 0,40 s, ordem de TTK preservada (pistola perde pra MP5, Deagle mais lenta que AK) e pente/reserva intactos. Mutantes: `rate-antigo`, `pistola-laser` (`mut:pistolacadencia`). `npm run eval:pistolacadencia` |
| `frag-restock-check.mjs` | A granada volta por sequência (pedido de jogador, out/2026): a cada 3 abates NA rodada, +1 frag só pra quem está sem (teto 1, sem banco), contador zerado a cada round, slot remoto reposto no MESMO `_kill` que roda no nó autoritativo e o cliente MP prediz em `morteRemota`. Mutantes: `sem-restock`, `restock-empilha`, `sequencia-atravessa-round` (`mut:fragrestock`). `npm run eval:fragrestock` |
| `formato-melhorde-check.mjs` | O banner do ROUND 1 declara o formato da partida (melhor de N, primeiro a X) nos dois modos e na transição replicada do MP, sem repetir nos rounds seguintes (relato de out/2026: jogador pediu melhor de 3/5/7 sem saber que já existia). Mutantes: `sem-formato-sp`, `sem-formato-mp`, `formato-todo-round` (`mut:formatomelhorde`). `npm run eval:formatomelhorde` |
| `loadout-test.mjs` | Loadout por personagem/facção. |
| `abateshud-check.mjs` | O contador de abates do JOGADOR existe no HUD, é legível por medida (piso de 24px fora de `@media`), imprime `player.kills` — não o placar do time — e sobrevive à virada de rodada. `npm run eval:abateshud` |
| `killstreak-check.mjs` | A sequência da vida atual aparece somente após abate confirmado, é separada do total da partida e funciona em SP/MP sem contar previsão nem inventar histórico ao reconectar; morte e round zeram. `npm run eval:killstreak` |
| `chao-check.mjs` | CHR7: nenhuma malha atravessa o chão na pose assentada (`idle`/`crouch`/`death`). O contato de pé só olhava os PES — `proerd`/`canarinho`/`lobisomem` enterravam 75/75/45 cm de corpo na morte sem nada acusar (BUG-148). Catraca por personagem em `chao_check.json`; `idle` tem teto absoluto. Mutante: `afunda`. `npm run eval:chao` |
| `postura-check.mjs`, `canarinho-tail-check.mjs` | Postura de arma em terceira pessoa: contato da mão, arma à frente/abaixo da cabeça, braço livre, cotovelo e estabilidade em movimento. Para o Canarinho, a régua também lê a geometria real das quatro variantes e limita a cauda a 22% da altura. Mutantes `cotovelo-reto` e `cauda-gigante` provam os dois defeitos relatados. `npm run eval:postura` |
| `botfaca-check.mjs` | Rodada de faca: o bot fecha até o alcance da arma (a banda de fuzil recuava abaixo de 6 m com faca de 2,4 m), ataca por caminho de corpo a corpo — sem traçante, fogacho nem som de cano — e a rodada normal continua com bot que abre distância. `npm run eval:botfaca` |
| `replaycam-check.mjs` | Headshot do jogador **não** pode tirar a câmera da primeira pessoa, escalar o relógio (hit-stop) nem esconder arma/mira — e segue contando abate. Mede o contrário do que media até 06/09/2026. `npm run eval:replaycam` |

Os perfis explícitos do arsenal e seus consumidores de dano, entrada e saque são
verificados por `npm run eval:weapon-profiles`, com mutantes que removem cada vínculo.
`npm run eval:weapon-matrix` reprova a matriz quando diverge do consumidor de dano.
`npm run eval:weapon-skin-body` renderiza cada imagem lateral ligada e desligada,
compara os pixels contra uma máscara da malha e reprova qualquer pintura fora do
corpo da arma; o mutante `extravasar` amplia os planos 2,4× para provar WB1.


`npm run eval:penetration-geometry` mede a travessia real em caixas rotacionadas,
fechadas e sobrepostas, com mutantes de AABB global, validação e oclusão.

`npm run eval:bot-shot-direction` mede o raio e o rastro efetivos do caminho NN,
com mutante que restaura o raio central apesar do erro sorteado.

## 4. Viewmodel e rig — a família mais densa

| Arquivo | O que faz |
|---|---|
| `vmrig-test.mjs` | Rig do viewmodel a 240 Hz, em node puro. |
| `vm-frame-check.mjs` | Enquadramento por frame. |
| `vm-orto.mjs` | Área de tela ocupada pela arma (a métrica de "arma gigante"). |
| `vm-project.mjs`, `vm-solve.mjs` | Projeção e solução do enquadramento. |
| `vm-verify.mjs` | Verificação final do viewmodel. |
| `tp-mount-probe.mjs` | Mount de 3ª pessoa, com parser de GLB próprio. |
| `tp-glove-manifest-retry-check.mjs` | Retry do manifesto TP: Game e GLTFLoader reais em CPU, orçamento por demanda, concorrência e negativos definitivos; `--source-root` e mutantes focais. Comandos e limites em [R864](../../docs/reports/GLOVE-MANIFEST-R864-CONTINUATION.md). Ferramenta focal, sem registro no CI. |
| `fparms-capture.mjs` | Captura dos braços de 1ª pessoa. |
| `mount-capture.mjs` | Captura do ponto de mount. |
| `weapon-capture.mjs` | Captura arma a arma. |
| `char-probe.mjs`, `char_probe.py`, `char_sim.py` | Sondas de personagem (proporção, escala, palma). |
| `mixamo-capture.mjs`, `mixamo-measure.mjs` | Clipes do pack Mixamo. |
| `granada-porte-check.mjs` | Granada EQUIPADA: precedência sobre o pacote de faca no viewmodel e alcance do arremesso curto (botão direito) contra o cheio. `npm run eval:granada-porte` |
| `faca-porte-check.mjs` | Porte de LÂMINA em 3ª pessoa (ponta acima do porte de cano), lido do fonte vivo. Evidência: `asset-evidence/faca-3p-20261021/faca-3p-ab.png`. `npm run eval:faca-porte` |
| `arma-orientacao-check.mjs` | Boca × coronha das 26 armas com o `rot` da CFG aplicado — pega arma montada de costas. `npm run eval:arma-orientacao` |
| `skin-cobertura-check.mjs` | Pintura equipada na arma INTEIRA (corpo, pente, ferrolho, peça do `splitParts`) em 1ª pessoa, e no corpo de 3ª pessoa. `npm run eval:skin-cobertura` |
| `inspect-lado-check.mjs` | Inspeção (tecla I) vira a arma de lado em 1ª pessoa sem clipe no pack e sem sair do quadro. `npm run eval:inspect-lado` |
| `manga-tampa-check.mjs` | Manga do pacote golden sem boca aberta (o "leque" que aparece ao girar a arma na inspeção); tampa no bind space, idempotente. `npm run eval:manga-tampa` |

## 5. Referência e cor

| Arquivo | O que faz |
|---|---|
| `ref-measure.py` | Mede as fotos de referência de `references/viewmodel/` (é de onde saiu o teto de área de tela da VM18b). |
| `ref-body.py`, `ref-overlay.py` | Proporção corporal e sobreposição com a referência. |
| `r3_color.py`, `r3_depth.py`, `r3_fog.py`, `r3_texsim.py`, `r3_vm.py`, `r3_sim.py` | Rodada R3: cor, profundidade, névoa, textura. |
| `tone_calib.py`, `tone_r3.py`, `tone_sat.py` | Calibração de tonemap e saturação. |
| `vao_a1.py`, `vao_predict.py` | Oclusão de ambiente. |
| `mat_shade.py` | Sombreamento de material. |
| `havan-planta.py` + `.png` | Planta baixa da Loja H. |
| `p0-pix.py` | Comparação pixel a pixel da rodada P0. |
| `vm_quake_measure.py` | Medição do look Quake 4 (o antecessor do look CS 1.6 atual). |

## 6. Infra

| Arquivo | O que faz |
|---|---|
| `serve.mjs` | Servidor estático pro harness. `npm run eval:serve` |
| `harness.mjs` | Base compartilhada dos capturadores com Chrome. |
| `measure.mjs` | Utilitários de medição. |
| `shot.mjs`, `vmshot.mjs` | Screenshot simples. |
| `gl-metrics.mjs`, `gl-shots.mjs` | Métricas de GPU e capturas. |
| `blind-capture.mjs` | Captura cega das 26 armas (o "0 erros" que fecha rodada). |
| `game-capture.mjs`, `map-capture.mjs`, `select-capture.mjs`, `bv-capture.mjs`, `vm-capture.mjs`, `walk-video.mjs` | Capturadores por cena. |
| `peso-boot.mjs` | Régua de peso/tempo do boot (lane glm/peso): browser real, cache limpo, CDP controlando rede (1,6 Mbps/150 ms/CPU 4x) e CPU. Bytes por tipo até o menu pronto, a splash clicável e a partida viva (mapa leve e pesado), só payload de jogo (public/); o número abre todo PR da lane. Rode sob `with-browser-lock.sh`, porta 9100-9900. |
| `smoke-pos-deploy.mjs` | Gate de DEPOIS do deploy (não entra em `check:*`, depende de rede externa): abre partida real no endereço publicado, espera `live`, assiste ~15 s e reprova se não abriu (SPD1), se houve erro de console nosso (SPD2) ou se o jogo não desenhou quadro (SPD3). Em menos de 2 min e sem escrever um byte no repositório. | `BASE=https://www.csbrasil.online npm run smoke:prod` |

---

## 7. OBSOLETOS — duplicação geracional não aposentada

**Não abra estes para entender o sistema.** Cada um foi escrito para UMA rodada
específica de gauntlet, resolveu o que tinha que resolver e ficou. O
conhecimento deles já está ou nos portões da §1, ou nos comentários de causa
raiz dentro do `weapons.js`/`game.js`, ou no `CHANGELOG.md`. Ficam versionados
porque reproduzem medições históricas — não porque alguém deva rodá-los.

**Aposentados** (movidos para `tools/eval/aposentados/`, fora do `grep` de
quem busca no arnês ativo): as 5 gerações de `audio-probe*.mjs` (sondas da
rodada 4 — grafo WebAudio, eco, duck, pan/PropDelay). O que cada uma media
sobreviveu nos comentários de causa raiz do `audio.js` (master chain com
limiter anti-clip, `duckBus` sidechain, caps de bounce em ~80ms) e nos portões
`audio:check`/`assert:assets` — nenhuma delas é mais execução de portão.

**Aposentada — Rodada G2-R6 (pose e troca de arma)** (movida para
`tools/eval/aposentados/` em 2026-08-11, issue #43):
`g2r6-blackband.mjs` · `g2r6-bots.mjs` · `g2r6-bots2.mjs` · `g2r6-capture.mjs` ·
`g2r6-pose-tune.mjs` · `g2r6-switch-capture.mjs` · `g2r6-switch2.mjs`. O que
mediram sobreviveu: a pose e o framing da arma nos comentários de causa raiz do
`weapons.js`/`game.js`; o critério de troca (holster→draw, nunca duas armas no
quadro) no `BAR-CONSISTENCIA.md` §C14; e `g2r6-bots2` foi o predecessor do
`botsim.mjs`, que o substituiu (ver o cabeçalho do `botsim.mjs`).

**Aposentada — Rodada G2-R7 / R7b / R8 (framing e boca do cano)** (movida para
`tools/eval/aposentados/` em 2026-08-11, issue #43):
`g2r7-aksweep.mjs` · `g2r7-capture.mjs` · `g2r7-mzprobe.mjs` · `g2r7-orbit.mjs` ·
`g2r7-smoke.mjs` · `g2r7b-capture.mjs` · `g2r7b-mzmarks.mjs` · `g2r7b-smoke.mjs` ·
`g2r7b-sweep.mjs` · `g2r8-sweep.mjs`. Superadas pelo `vm-mint-audit.mjs`, que mede
em vez de varrer — é lá que o framing e a boca do cano viraram portão.
**Ficam onde estão** (não são obsoletos: `vmattach.js` os cita como proveniência
das offsets do viewmodel): `g2r7-mzmarks.mjs` (vmattach.js:18) e
`../g2r7-measure.mjs` em `tools/` (vmattach.js:15/20/27).

**Aposentada — Rodada G2-R14 (OOM e ADS)** (movida para
`tools/eval/aposentados/` em 2026-08-11, issue #43):
`g2r14-ads.mjs` · `g2r14-capture.mjs` · `g2r14-memprobe.mjs`. O `memprobe` foi o
que achou o OOM de 322 MB no boot; o problema morreu com a migração pros GLBs da
Mint, e o registro do episódio ficou no `CHANGELOG.md`.

**Rodada G2-UI:**
`g2ui-map-bot.mjs` · `g2ui-map-previews.mjs` · `g2ui-map-tp.mjs` ·
`g2ui-map-walk.mjs` · `g2ui-probe.mjs` · `g2ui-verify.mjs` ·
`g2-capture.mjs` · `g2-tune.mjs` · `../g2-gunspace.mjs` · `../g2-maskprobe.mjs`

**Aposentada — Menus P1 (3 gerações) + P0** (movida para
`tools/eval/aposentados/` em 2026-08-11, issue #43):
`p1-menu.mjs` · `p1-menu2.mjs` · `p1-menu3.mjs` · `p1-game.mjs` · `p0-armas.mjs`.
Capturas das telas de menu e da tela de armas de gerações antigas; a UI atual e
o que essas rodadas decidiram vivem no site/`main.js` e no `CHANGELOG.md`.

**Aposentada — Rodadas R7x (feel)** (movida para `tools/eval/aposentados/` em
2026-08-11, issue #43):
`r7-feel-capture.mjs` · `r75-capture.mjs` · `r76-capture.mjs` · `r77-capture.mjs`.
Eram capturas de tuning de game feel; o que decidiram sobreviveu nos comentários
de causa raiz do `game.js`/`springs.js` e no `CHANGELOG.md`.

**Look Quake 4** (o projeto escolheu o look CS 1.6 na v3.2.0):
`vm-quake-capture.mjs` · `vm-quake-scen.mjs` · `vm_quake_measure.py`

**Diagnósticos R2:** `r2_audit.py` · `r2_diag.py`

### Se for aposentar de verdade

Antes de apagar qualquer um, confira:

```bash
grep -rn "<nome-do-arquivo>" tools/ .github/ package.json
```

`invariants.mjs` importa `tp-mount-probe.mjs`, e vários capturadores importam
`harness.mjs` — obsoleto que é dependência de portão **não é obsoleto**.

---

## 8. Não versionar

`__pycache__/` estava versionado (12 `.pyc`) e agora está no `.gitignore`.
Se ele reaparecer no `git status`, é porque alguém removeu a regra.

`npm run eval:bot-crouch-geometry` mede postura lógica/animação, origem, LOS,
raios, respawn e round dos bots locais, incluindo três mutantes. O ensaio opcional
`node tools/eval/ballistics-range-playtest.mjs [--fixed-five]` produz dados de
TTK condicional e dispersão com cinco disparos; método e limites em
`docs/qa/balistica/autorado/README.md`. Ele não impõe tuning ou teto novo ao gate.

### Cidade Invadida — gauntlet31/10/2026

- `npm run eval:javaporcoscidadeacessivel`: torre por escada real nos dois sentidos, três linhas de tiro, percurso rua/andar/janela/rua nas quatro casas, 24 armas fora do centro e UV das rampas e proteção das bordas; seis mutantes.
- `npm run eval:javaporcosdirecao`: percurso curvo, desvio de muro, flancos/antecipação, bando com separação, patas apoiadas e planejamento FIFO sem starvation; cinco mutantes.
- `npm run eval:javaporcoscidadeinterface`: seleção só Cidade, silêncio de falas/vinhetas no modo com recarga preservada, elenco real4–8 no solo, coop explícito/MP legado e kills/avatar da horda; três mutantes.
- `npm run eval:javaporcosnetpersonagem`: eventos e roster J preservam o NPC, troca humana continua; mutante personagem-humano.
- `npm run eval:javaporcosperf`: orçamento CPU separado de render; não equivale a FPS ou aprovação visual.

Captura real3:2, leitura do modal/card e avaliação dos GLBs em movimento continuam portões independentes; testes Node não os substituem.
