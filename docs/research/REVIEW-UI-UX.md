# REVIEW UI/UX — funil, boot, HUD, fim de partida, mobile

**Data:** 22/09/2026 · **Código lido:** worktree `csbrasil/worktrees/vm-unificado` (branch `claude/vm-integracao`). Todos os `arquivo:linha` abaixo são relativos à raiz desse worktree.
**Dados de produto** (Supabase, 14 dias até 22/09): land 1667 → menu 1137 (68%) → match_start 643 (39%) → match_end 191 (30%); 88% das partidas terminam em `quit`; `boot_ms` p50 2.588 ms / p90 58.904 ms; 30% das amostras <30 FPS; 21% das amostras em tela <900 px.

Leitura em código only — nada foi executado. Onde é julgamento, está marcado **[OPINIÃO]**.

---

## 1. O primeiro minuto, passo a passo — da landing ao primeiro tiro

### 1.1 A sequência real de telas e cliques (primeira visita, sem nick salvo)

| # | Ação do jogador | Handler | Onde o jogador pode desistir |
|---|---|---|---|
| 0 | Página carrega. Splash estática `#boot-splash` com "CARREGANDO ARENA…" e barra a 0% | `src/pages/index.astro:585-597` | **Aqui morre 32% do funil** (land→menu 68%). Ver §2. |
| 1 | Espera o texto virar "ARENA PRONTA / CLIQUE OU PRESSIONE QUALQUER TECLA" e **clica** | `main.js:233-242` (`_splashSetReady`), `main.js:529-543` (`dismissSplash`), listeners capture em `main.js:557-558` | O clique só é aceito depois dos downloads do gate (`main.js:531` exige `_splashReady`). |
| 2 | Menu principal: clica **SINGLE PLAYER** | `index.astro:678-679`; `main.js:1576-1584` (`case 'single-player': toggleModeMenu()`) | 1º clique real de menu — é ele (qualquer pointerdown/keydown) que dispara `_funnel('menu')` (`main.js:1179-1181`). |
| 3 | Submenu abre: clica **MATA-MATA** (ou CAPTURE THE FLAG) | `index.astro:680-683`; `main.js:1583-1584` → `openModeMap` (`main.js:1569-1573`) | — |
| 4 | **Tela cheia de escolha de mapa** (`#map-screen`, "04 · ESCOLHA DO MAPA", 17 mapas): clica **CONTINUAR ▶** | `index.astro:841-911`; `main.js:1976` (`ms-continue` → volta ao menu e **auto-clique** em `btn-jogar`) | Tela inteira extra entre o menu e a partida. Ver plano #5. |
| 5 | Sem nick, o JOGAR não segue: abre o **passo de perfil** ("SEM NOME NÃO TEM CORO!") | `main.js:1679-1689`; painel `index.astro:808-829` | Fricção clássica de primeira visita. |
| 6 | Digita nick, clica **TÁ ANOTADO** → volta ao passo da partida, clica **▶ JOGAR** | `main.js:1638-1640`, `main.js:1679-1696` | — |
| 7 | **PASSO 2 · O SEU LADO**: escolhe 1 entre 6 facções | `index.astro:918-993`; `main.js:2129-2134` → `pickTeam` (`main.js:2570`) | — |
| 8 | Tela de personagem **bloqueia** no overlay "CARREGANDO PERSONAGENS…" até os GLBs do roster baixarem | `main.js:2626-2627` (`showLoading` + `preloadCharacterAssets` antes de `mountCharList`) | Segundo gate de download dentro do funil. |
| 9 | **PASSO 3 · O PERSONAGEM**: 1º personagem já vem selecionado (`main.js:2620`); clica **USAR PERSONAGEM** | `index.astro:1024`; `main.js:2200-2227` | — |
| 10 | **PASSO 2 de novo, agora o ADVERSÁRIO** (mesma tela `team-select`, título trocado): escolhe a facção inimiga | `main.js:2216-2226` (`setEnemyPickMode`), `main.js:2573-2578` (`pickTeam` com `pickingEnemy` → `startGame`) | Última chance de desistir antes do download pesado. |
| 11 | Overlay opaco "CARREGANDO `<MAPA>`" (GLBs do roster + armas + props + fauna + braços FP + famílias de viewmodel + samples de áudio) | `main.js:1269` (`showLoading`), `main.js:1300-1316` (`Promise.all` de 7 preloads) | Terceiro gate. Watchdog de 60 s que renova enquanto a barra anda (`main.js:1188-1197`). |
| 12 | Partida nasce em `countdown` de **3 s** ("RODADA 1 / a treta está liberada") | `game.js:2466-2477`, `game.js:7816-7817` | — |
| 13 | Para atirar, precisa **clicar de novo** para travar a mira (hint "CLIQUE PARA ATIVAR A MIRA") | `game.js:7871-7875` (hint visível sem pointer lock), `game.js:2230` (`requestPointerLock`) | 1 clique a mais antes do primeiro tiro. |

**Contagem:** primeira visita = **10 interações** (cliques/teclas) e **5 telas** (splash, menu, mapa, perfil/setup, lado, personagem, lado-inimigo) antes do primeiro tiro. Jogador recorrente com nick: 8 cliques. O multiplayer não escapa: `mpEntrar` lê o mesmo `nick-input` (`main.js:3437`).

### 1.2 Qual tela corresponde a cada queda do funil

- **land → menu: 68% (queda de 32%)** — o passo 0/1. O evento `menu` dispara no *primeiro pointerdown/keydown da página* (`main.js:1179-1181`), ou seja, quem morre aqui **nunca clicou em nada** — nem na splash. As causas estão no §2: splash trancada atrás de ~9 MB de GLB (gate `main.js:335`) e pacote JS grande parseando antes do menu existir. A splash nem é "pulável": o clique é ignorado até `_splashReady` (`main.js:531`), com failsafe de 20 s (`main.js:243`).
- **menu → match_start: 39% da landing (queda de 43% do público que chegou ao menu)** — os passos 2 a 10. São 8+ cliques, 1 gate de download no meio (roster de personagens, `main.js:2626-2627`) e 1 exigência de cadastro mínimo (nick, `main.js:1680-1688`).
- **match_start → match_end: 30% (queda de 70%; 88% quit)** — dentro da partida. Caminhos de saída mapeados no §4. Estrutura de partida: melhor de 5 (`ROUNDS_TO_WIN 3`, `game.js:67`), round de 99 s (`ROUND_TIME`, `game.js:67`), respawn 2,2 s (`RESPAWN_DELAY`, `game.js:67`), fim de round de 4 s (`game.js:2774-2775`), countdown 3 s (`game.js:2466-2467`) — pior caso de 530 s documentado no próprio código (`game.js:74-76`).

O comentário do próprio código corrobora o 88%: "o painel mostrava 1.1K `game_start` para 215 `match_end`" (`main.js:1413-1415`, `game.js:2846-2848`).

---

## 2. Boot de 59 s no p90 — o que é carregado antes de poder jogar

`boot_ms` é medido do load da página até `state === 'live'` (`main.js:1044-1062`): **inclui splash, menus e cliques**. O p90 de 59 s é a cauda: rede lenta + máquina fraca + funil de 5 telas. O que está no caminho crítico, em ordem:

### 2.1 Antes da primeira linha do menu (parse do grafo de módulos)

- `three.module.js` r160 **não minificado, 53.057 linhas** (`public/vendor/three.module.js:6`, tamanho do arquivo), mapeado em `index.astro:10-16`.
- `main.js` (191,7 KB) importa estaticamente `game.js` (**496,3 KB**) e `maps.js` — que importa estaticamente **os 17 construtores de mapa** (`maps.js:1-19`): `map_havan` 140,8 KB, `map_ferrovelho` 130,6 KB, `map_piscinao_ramos` 142,9 KB¹, `map_brasilia` 119,2 KB, `map_quebrada` 117,1 KB, `map_mansao` 93,9 KB etc. — ≈1,3 MB de código de mapas que o jogador ainda não escolheu.
- `style.css` **198,7 KB** (duas skins completas empilhadas: as regras da linha 909+ são sobrescritas pelas da linha 2301+) + `map-preview.css` (`index.astro:572-576`).
- `ops.js` e `main.js` como módulos no fim do body (`index.astro:1422-1423`). Antes disso, a tela é só o HTML estático da splash ("CARREGANDO ARENA…", `index.astro:593`) — em rede ruim o status muda para "CONEXÃO LENTA - AINDA BAIXANDO O JOGO…" (`index.astro:396-400`).

¹ `map_piscinao_ramos.js` entra via `map_piscina.js`/outros imports do grafo; o ponto é o tamanho do conjunto, não o item.

### 2.2 O gate da splash: ~9,2 MB de GLB antes de "CLIQUE OU PRESSIONE"

`loadMenuBackdrop().then(_splashSetReady)` (`main.js:335`) — **a splash só libera a entrada depois de**:

1. **23 props GLB globais** (`MAP_PROPS`, `main.js:192-194`) = **5,9 MB**: congresso 205,7 KB, catedral 269,6, ministério 188,3, palácio 239,6, justiça 235,6, tires 203,0, stall 285,6, tent 313,6, bus 230,0, drinkstand 223,2, urna 245,9, towner 690,4, quiosque 451,3, skate_ramp 190,8, lifeguard_tower 337,5, guarda_sol 395,7, arquibancada 231,3, churrasqueira 170,6, mesa_guardasol 212,8, cooler 144,8, boia 147,1, placa_piscina 129,9, caixa_som 200,4 (`public/models/props/`, tamanhos do diretório; URL montada em `mapprops.js:37`).
2. **11 GLBs de fauna urbana** = **3,3 MB**: `FAVELA_AMBIENCE_ASSETS` (`ambientlife.js:46`) — rato 238,2 KB, pombo 503,6, cachorro-caramelo 485,8, jacaré 237,1, capivara 219,0, gato 207,4, galinha 112,7, vaca 845,9, tatu 197,5, barata 126,6, papagaio 184,2 (`public/models/ambient/`). Carregam porque `loadMenuBackdrop` chama `preloadAmbientLife((MAPS[id].ambience) || [])` (`main.js:326`) e **lista vazia vira "todos"** (`ambientlife.js:76-79`).

O detalhe que dói: o mapa padrão é `praca_poderes` (`maps.js:98`), que **não tem props nem fauna próprios** (`maps.js:44`) — a cena de menu de Brasília usa 5 daqueles 23 props (1,1 MB); os outros 18 (≈4,8 MB, todos do Piscinão) e a fauna inteira são baixados no boot **para não aparecerem**. O cenário 3D do menu é enfeite atrás do wallpaper (`index.astro:647`); prendê-lo na frente do funil custa ~8 MB. Failsafe: 20 s (`main.js:243`) — na cauda lenta o jogador espera 20 s vendo barra andar para depois ainda ter que clicar.

Ainda no boot: personagem 3D da splash (`loadingStage.show('B')` → canarinho, `main.js:249-250`, `loading3d.js:8-15`), 6 artes de facção em `<img>` (`main.js:353-365`), manifesto de áudio + trilha do menu (trims ~105 s, `main.js:447-461`), manifestos de wallpaper (`main.js:404-418`).

### 2.3 Dentro da partida (o que o overlay "CARREGANDO" espera)

`Promise.all` de 7 frentes (`main.js:1300-1316`): GLBs do roster sorteado (padrão 4×4 ≈ 8 personagens × 0,3–5,8 MB, `public/models/characters/`), samples das ~9 armas da partida (o arsenal completo eram "164 MB de VRAM e 7,5 MB de download", já reduzido por sorteio — `main.js:1289-1295`), props do mapa, fauna, `MAPS[].preload`, braços FP e **famílias de viewmodel (~3 MB pós-de-dup, `main.js:1312-1314`)**. As outras armas já são preguiçosas por padrão (`armaslazy`, só após `live` + idle, `main.js:1336-1352` — desativável com `?armaslazy=0`). Depois: construção do mundo, **countdown de 3 s** (`game.js:2466-2467`) e o clique de pointer lock (`game.js:2230`) — a tela cheia é pedida antes dos awaits justamente porque o gesto do clique expira (`main.js:1248-1263`).

### 2.4 O que poderia ser adiado (resumo)

- Fauna do menu (3,3 MB) e 18 props não usados pelo mapa corrente (4,8 MB): nenhum efeito no menu padrão.
- A cena 3D do menu inteira: o wallpaper CSS já existe (`index.astro:647`, `style.css:1507-1511`).
- Trilha do menu e artes de facção: cabem em idle.
- Construtores dos 17 mapas: import dinâmico por mapa escolhido.
- Countdown/pointer-lock: o hint já existe; permitir atirar no `countdown` eliminaria o clique 13.

---

## 3. HUD e o centro da tela

O viewmodel (a feature crítica — braços + arma autorais, `fpsrig.js:306-308`, `docs/VIEWMODELS.md`) mora no **quadrante inferior direito** da tela. O que compete com ele hoje:

- **`#weapon-hud`** (slots de arma 1–5, silhuetas de 92×40 px): `right:20px; bottom:122px` (`style.css:2340`, inventário em `style.css:2283-2294`) — atravessa o corpo da arma.
- **`#hud-bottom-right`**: nome da arma, munição 42 px, barras e "RECARREGANDO…" (`index.astro:1334-1341`, `style.css:2330-2337`) — colado na boca do cano/abaixo da arma.
- **`#hud-shortcuts`** ("Z/X/V RÁDIO · TAB PLACAR · M TROCAR DE TIME") centrado no rodapé (`index.astro:1342`, `style.css:2338-2339`) — texto permanente competindo com o viewmodel em telas baixas.
- **O toast de CPU, em cima da arma**: `avisaSoftware` (`glcontext.js:148-171`) cria um card `position:fixed; right:12px; bottom:12px; z-index:2147483000` (`glcontext.js:157`) — exatamente sobre a munição e o viewmodel. Nasce no boot quando a GPU casa com `llvmpipe|softpipe|swiftshader|software raster` (`glcontext.js:12`, chamado em `main.js:103`) — ou seja, **só nas máquinas que rodam a 2–8 FPS** (`main.js:87`), onde a tela já está poluída e lenta. Ele **não some sozinho**: só o clique em OK remove e grava `cs_aviso_software` no localStorage (`glcontext.js:150,165-168`); sem clique, fica a partida inteira por cima da arma (é o que aparece nas capturas de hoje). O comentário do próprio arquivo registra que a posição anterior cobria o `#ms-continue` (`glcontext.js:155-156`) — a mudança de faixa para canto só trocou de vítima: agora é o viewmodel.
- Centro da tela: crosshair + hitmarker (`style.css:928-950`), números de dano (`style.css:954-957`), anel direcional de dano de 230 px (`style.css:977-981`), banner de multi-kill a 26% da altura com letter-spacing de 20 px (`style.css:982-986`) e banner de round a 30% (`style.css:1161-1163`). O `#dmg-dir` de 230 px é o mais agressivo ao centro (o próprio CSS admite o conflito, `style.css:975-976`).
- Legibilidade: trabalho real de contraste no killfeed (ratio 3,85:1 medido e corrigido, `game.js:4632-4636`), contornos de texto no topo (`style.css:909,1019`), placar com `backdrop-filter:blur` (`style.css:1322-1323`). Killfeed: máx. 6 linhas, cada uma some em 4,6 s (`game.js:3997-3999`), empurrado 38 px para baixo no CTF (`style.css:1065-1066`).
- **[OPINIÃO]** Inconsistência de linguagem: a base decidiu "nada de emoji no HUD" para a caveira do headshot (`game.js:4001-4002`) e trocou a engrenagem por SVG (`index.astro:1287-1288`), mas o contador de utilitários ainda escreve `'💨 5 🧨 1'` (`game.js:4459-4461`, markup `index.astro:1339`) e o botão de falas usa `🔊` (`index.astro:1286`). No skin atual o `#smoke-count` está até escondido (`style.css:2337`) — ou seja, no desktop o jogador não vê quantas fumaças/granadas tem sem esse bloco.

---

## 4. Fim de partida e o segundo round

### 4.1 O que a tela oferece hoje

`#match-end` (`index.astro:1387-1404`) mostra: VITÓRIA/DERROTA (`game.js:2825-2830`), uma frase de time, **uma única linha** de stats (`frase('statsFim', rounds, kills, nome, deaths)` — `game.js:2831-2832`), arte estática do personagem vitorioso/derrotado (`game.js:2835-2840`, poses em `public/img/resultado/`), e dois botões: **JOGAR NOVAMENTE** e **VOLTAR AO MENU** (`index.astro:1396-1398`; handlers `main.js:2189-2190`). Online, troca por "PRÓXIMO MAPA CARREGANDO…" (`game.js:2842-2843`). Não há foco automático/Enter no JOGAR NOVAMENTE (nenhum `.focus()` em `_endMatch`, `game.js:2814-2871`), nem progressão exibida — nível/XP estão no DOM mas ocultos por decisão do dono (`index.astro:692-699`).

### 4.2 Quanto tempo até voltar à ação

- Entre rounds: fim de round **4 s** com placar forçado (`game.js:2774-2775`, `_resultadoDaRodada` `game.js:7630-7632`) + countdown **3 s** (`game.js:2466-2467`).
- Revanche: `btn-again` → `startGame` com os mesmos parâmetros (`main.js:2189`) → overlay de loading de novo (`main.js:1269`) com assets já em cache (maps de `_base`/glbchars), novo `Game`, novo countdown de 3 s. O custo dominante é reconstrução do mundo + os mesmos 3 s de countdown; a percepção é "carregou de novo".
- Partida padrão: melhor de 5 (`main.js:42` `rounds: 5`; `game.js:67,76-77`), round de 99 s — uma partida completa dura de ~3 a 9 min. **[OPINIÃO]** Para um público de curiosos de eleição, o melhor-de-5 padrão é longo demais; `settings.rounds` já aceita 1/3/5/7 (`main.js:1770-1773`, UI em `index.astro:883-887`).

### 4.3 Os caminhos de saída (o código dos 88% de `quit`)

1. **ESC → pausa → SAIR PRO MENU**: pausa (`index.astro:1369-1381`), botão destrutivo exige 2 cliques (`needsConfirm`, `main.js:2183-2188`) → `quitToMenu` (`main.js:1408-1444`). Ao sair por aqui dispara `match_abandon` **com `seconds`** (`main.js:1413-1430`) e `_funnel('quit')` (`main.js:1429`).
2. **Fim de partida → VOLTAR AO MENU**: `main.js:2190` → `quitToMenu` (conta como fim normal, `match_end` já foi enviado em `main.js:2417`).
3. **Fechar a aba / Ctrl+W no meio da partida**: `beforeunload` envia `sendMatchEvent('quit')` + `_funnel('quit')` (`main.js:2365-2366`) — este é o caminho silencioso que domina o 88% (o comentário do `match_abandon` existe justamente porque "NENHUM evento dizia por quê", `main.js:1413-1417`). A trava de Ctrl+W via Keyboard Lock só existe com tela cheia concedida (`main.js:1248-1255`).
4. Reiniciar partida (pausa → REINICIAR, também com confirmação, `main.js:2182`).

**[OPINIÃO]** O dado "88% quit" mistura abandono por tédio/frustração com partidas longas demais para a sessão disponível; o `seconds` do `match_abandon` (já implementado) + o `quit` do beforeunload separam os dois — vale ler antes de mexer em pacing.

---

## 5. Mobile (21% das amostras)

- **Boot:** mobile entra direto no menu normal (`main.js:2917` — "mobile agora entra no menu normal (fase 1)"). A tela de aviso `#mobile-warning` ("feito para desktop") **é código morto**: markup em `index.astro:636-643`, handler `main.js:2077`, mas nenhuma chamada `show('mobile-warning')` existe.
- **Controles de toque existem e são completos:** joystick esquerdo, mira por arraste na metade direita, botões de tiro/ADS/recarregar/agachar/pausa e barra de armas (`game.js:2079-2160`; CSS `style.css:2385-2429`, com safe-areas de notch). `#touch-ui` só é criado com `this.mobile` (`game.js:2076`).
- **Retrato:** overlay "Gire o celular" cobre a tela inteira com z-index 2147483000 (`index.astro:1407`, `style.css:2421-2426`) — bloqueio total até deitar. Na entrada da partida pede tela cheia + trava de orientação (`main.js:1256-1263`).
- **Telas <900 px:** a barra inferior do menu (acesso rápido a ARMAS/MAPA) **some** (`style.css:283`); o menu vira fluxo vertical com o wallpaper acima (`style.css:2102-2105`); HUD compacto (`style.css:2246-2281`); stage 3D do loading escondido <820 px (`style.css:1792`); config vira tela cheia (`style.css:2434-2445`); CONFIRMAR de personagem vira sticky (`style.css:2431-2437`); painel MP empilha em 1 coluna (`style.css:2490`).
- **Perf:** o modo leve (`LEAN`: previews estáticos + DPR menor) só liga por GPU fraca/compat (`main.js:100-105`) — **não** por ser touch. Um celular com GPU "boa o suficiente" no papel ainda paga preview 3D de personagem (canvas 640², `index.astro:1027`) e cena de menu 3D. **[OPINIÃO]** `TOUCH` deveria entrar no `LEAN`: 30% das amostras <30 FPS e 21% <900 px pedem o caminho leve por padrão no dedo.
- Pointer lock não existe no toque: mira por delta de arraste (`game.js:2116-2159`) e o gate de input aceita touch sem lock (`game.js:2264-2265`).

---

## 6. Plano de 15 dias (máx. 8 mudanças, por impacto ÷ custo)

Ordenado por impacto ÷ custo. Meta: transformar as 3 quedas do funil antes da janela eleitoral acabar.

| # | Mudança | Evidência | Custo | Risco | Como medir |
|---|---|---|---|---|---|
| **1** | **Desacoplar a splash do 3D do menu.** Liberar "CLIQUE/PRESSIOONE" quando o JS do menu está pronto; o cenário 3D e a fauna chegam por baixo (wallpaper CSS é o fallback). Não gastar 20 s de failsafe. | Gate `main.js:335` + 23 props (5,9 MB) + 11 fauna (3,3 MB) §2.2; 32% do funil morre antes do 1º clique; failsafe `main.js:243` | 3–4 h | Baixo: menu já tem wallpaper próprio (`style.css:1507-1511`); pior caso = backdrop atrasado | **land→menu** (68% → 75%+); taxa de splash que bate o failsafe de 20 s; `boot_ms` p90 |
| **2** | **PARTIDA RÁPIDA: 1 clique do menu ao loading.** Item de menu que pula mapa/facção/personagem com sorteio (o roster já é sorteado, `main.js:1284`; 1º personagem já é pré-selecionado, `main.js:2620`). Fluxo detalhado continua existindo. | 8–10 interações e 5 telas hoje (§1.1); queda menu→match_start de 43% | 4–6 h | Baixo: caminho novo, não substitui o existente | **menu→match_start** (57% → 70%+) |
| **3** | **Nick automático na primeira visita.** Gerar "Jogador###" e deixar a edição para depois; JOGAR nunca desvia mais para o perfil. | Desvio obrigatório `main.js:1679-1689`; `mpEntrar` depende do mesmo campo `main.js:3437` | 1–2 h | Baixo (o killfeed mostra o nome; troca depois continua possível) | **menu→match_start**; % de `game_start` com nick gerado |
| **4** | **Partida mais curta por padrão: melhor de 3 + fim de round 4 s → 2,5 s.** | `rounds: 5` default `main.js:42`; roundEnd 4 s `game.js:2774-2775`; pior caso 530 s `game.js:74-76`; 88% quit §4 | 1–2 h | Médio: pacing é terreno do dono (ele já vetou regen e limite de kills — `game.js:296-297`, `game.js:112-113`); propor, não impor | **match_start→match_end**; distribuição do `seconds` do `match_abandon` (`main.js:1417`) |
| **5** | **Tirar a tela cheia de mapas do fluxo padrão.** MATA-MATA/CTF abrem o setup (cartaz do mapa já tem carrossel próprio, `index.astro:758-779`); tela "04 · ESCOLHA DO MAPA" fica para quem clicar no cartaz. | `openModeMap` força `show('map-screen')` (`main.js:1583-1584, 1569-1573`); `ms-continue` já é um auto-clique em JOGAR (`main.js:1976`) — a tela adiciona um clique sem decidir nada | 2–3 h | Baixo: descoberta de mapas continua pelo cartaz e pelo setup | **menu→match_start**; `pick kind=mapa` (quantos entram na tela de mapas) |
| **6** | **Toast de CPU: sair de cima do viewmodel e se auto-dismissar.** Mover para o topo (fora da área da arma/munição), auto-some em ~10 s, mantém o OK/`localStorage`. | `glcontext.js:157` (right/bottom/z-index máx), só sai no clique (`glcontext.js:150,165-168`), aparece só nas máquinas 2–8 FPS (`main.js:87,103`) | 1 h | Baixo | Tempo de exibição do aviso; sessão média das amostras `software:true` |
| **7** | **Pré-carga da partida durante a seleção.** Quando entra em time/personagem, começar (idle) props+fauna+armas do mapa corrente, que hoje só sobem no `Promise.all` final. | Bloqueio final `main.js:1300-1316`; o roster do personagem já é preload adiantado (`main.js:2626-2627`) — falta o resto | 3–4 h | Médio: banda desperdiçada se voltar (mitigar: só o mapa já escolhido) | `boot_ms` p50/p90; tempo do overlay `#load-overlay` |
| **8** | **Mobile leve por padrão: `TOUCH` entra no `LEAN`.** Previews estáticos + DPR menor no dedo, sem depender da GPU detectada. | `main.js:100-105` (LEAN só por GPU); 30% <30 FPS, 21% <900 px (§5) | 1–2 h | Baixo (o caminho estático já existe e é testado: `staticPreviews`) | `fps` p50 nas amostras <900 px; `boot_ms` mobile; land→menu mobile |

**Total estimado:** 16–25 h de implementação (sem contar revisão/observação), cabendo nos 15 dias com folga para medir cada degrau.

### NÃO FAZER nestes 15 dias

- **Novo redesign de menu/HUD/skin** — `style.css` já carrega duas skins empilhadas (198,7 KB); outra camada piora o boot que se quer consertar.
- **Tutorial/onboarding em vídeo ou tour guiado** — não é a queda dominante e come o tempo das mudanças 1–3.
- **Recomprimir/re-tratar os ~170 GLB do acervo à mão** — o ganho relevante (≈8 MB) vem de *não baixar*, não de encolher (plano #1); otimização de assets é projeto próprio.
- **Trocar three.js, migrar WebGPU ou refatorar `game.js` (496 KB)** — risco de regressão em massa na única janela de distribuição que existe.
- **Sistema de XP/progressão/loot na tela de fim** — nível/XP foram ocultados por decisão do dono (`index.astro:692-699`); reverter agora é aposta, não funil.
- **Novos modos de jogo, ranking global, anticheat, PWA/offline** — nada disso move land→menu→match_start→match_end.
- **Otimizar pacing de bots/IA além do default** — sem ler o `seconds` do `match_abandon` (`main.js:1417`) antes, seria chute.
- **Campanha de aquisição/anúncios** — com 93% de queda semanal e funil furado, comprar tráfego é encher um balde furado.

---

### Apêndice: arquivos-chave citados

`src/pages/index.astro` (landing completa: splash, menu, setup, mapas, times, personagem, MP, HUD, pausa, fim de partida) · `public/js/main.js` (fluxo, funil, preloads, MP) · `public/js/game.js` (HUD, rounds, fim de partida, touch) · `public/js/glcontext.js` (toast de software) · `public/js/maps.js` (registro de mapas) · `public/js/mapprops.js` / `public/js/ambientlife.js` (preload de props/fauna) · `public/style.css` (HUD e media queries) · `public/models/props/`, `public/models/ambient/`, `public/models/characters/` (pesos dos GLB).
