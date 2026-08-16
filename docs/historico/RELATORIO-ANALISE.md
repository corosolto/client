# Relatório — Análise CS BRASIL: 8 PRs abertos, gráficos e viralização

**Data:** 2026-07-18 · **Base:** main `b4ee2b3` (v1.12.4) · **Método:** review read-only via `git show`/`git diff` das refs `pr/4`–`pr/11`, syntax check com `node --check`, e **simulação headless dos builders dos mapas** (grafo de waypoints via BFS, spawns vs colliders, sightlines na altura do olho).

---

## 1. Resumo executivo

Dos 7 PRs de conteúdo, **5 são mergeáveis com ajustes pequenos** (#6, #7, #8, #9, #10) e **2 precisam de rework real** (#4 tem marcadores de conflito commitados no index.html e bots do time P presos por grafo unidirecional; #5 prende o jogador sob o piso em 50% dos respawns e o trem não bloqueia tiro nem movimento). O **PR #11 (Godot) deve ser recusado como direção** — o trabalho é de alta qualidade, mas troca o superpoder do jogo (link → jogando em 5s, ~1,5MB) por 40MB de wasm e ~25–45 dias de retrabalho para paridade, criando manutenção dupla eterna; há, porém, 7 ideias dele que valem cherry-pick (testes E2E Playwright, contrato de baseline, armas data-driven). O risco mais urgente **não está nos PRs**: se as migrations 008–010 não foram aplicadas no Supabase, o `/api/submit-match` está retornando 403 pra todo mundo e o ranking está quebrado em produção — verificar hoje. O anti-cheat atual só barra cheater preguiçoso (stats plausíveis passam por tudo). Os "gráficos ruins" têm causa identificada e barata de corrigir **dentro do Three.js vanilla**: 100% dos materiais são `MeshLambertMaterial` (fosco/chapado), sem env map, sem anisotropy, sem AO — não é preciso Godot pra resolver isso.

---

## 2. Tabela de PRs

| PR | Título | Recomendação | Justificativa (1 linha) |
|----|--------|--------------|--------------------------|
| #4 | fy_sitio (Atibaia) | **Rework** | Marcadores de conflito commitados no `index.html:107-133` + bots P presos na varanda (arestas unidirecionais no grafo). |
| #5 | fy_metro (trem) | **Rework** | 50% dos spawns nascem 1,9m abaixo do piso sem saída; grafo em 3 ilhas; trem sem collider/occluder; remover `map_sitio.js` do diff. |
| #6 | personagens v2 | **Merge com ajustes** | Hitbox/headshot/câmera intactos; só realinhar 7 acessórios (cachecóis na cara, luva/celulares flutuando). |
| #7 | fy_masp | **Merge com ajustes** | Sólido; mover spawn B0 que encosta em prédio (`map_masp.js:235`) e mitigar sightline de 132m no vão. |
| #8 | fy_baleia | **Merge com ajustes** | Melhor mapa dos quatro (0 sightlines entre spawns, grafo conexo); rebasear removendo `map_masp.js` e adicionar cabeça/cauda da baleia aos occluders. |
| #9 | fy_osasco (pombos) | **Merge com ajustes** | IA dos pombos limpa e barata (zero alocações/frame); mas mapa `fy_` com **zero pickups** — adicionar 4-6 armas no chão. |
| #10 | fy_havan | **Merge com ajustes** | Bom mapa, mas é o 1º com eixo de times em X e o engine ignora `spawn.yaw` (`game.js:352/935`) — precisa do suporte no game.js (parte já está nas suas mudanças locais não commitadas). |
| #11 | Port Godot 4.7.1 | **Fechar (recusar)** | Execução excelente, tese errada: 40MB vs 1,5MB, ~30% de paridade, 25–45 dias pra alcançar a main + dois clientes pra sempre. |

---

## 3. Plano de merge passo a passo

**Ordem ótima: #6 → #7 → #8 → #9 → #10 → (rework) #4 → #5.** A sugestão inicial (#6→#4→#5→...) não se sustenta: #4 e #5 não estão em estado de merge e segurá-los não gera conflito extra (todos os PRs têm base na main atual e as colisões em `maps.js` são de união trivial).

**Fase 0 — antes de qualquer merge (produção):**

```bash
# Verificar se o submit está vivo em produção (deve retornar erro de validação, não 403 genérico):
curl -s -X POST https://www.csbrasil.online/api/submit-match -H 'content-type: application/json' -d '{}'
# Se estiver quebrado: rodar o supabase/schema.sql inteiro no SQL Editor do Supabase
# (ele já contém o efeito das migrations 008, 009 e 010).
```

**Fase 1 — merges limpos (1 dia):**

```bash
# 1) PR #6 — personagens v2 (ajustar acessórios antes ou logo depois; nada estrutural)
git checkout main && git merge --no-ff pr/6

# 2) PR #7 — fy_masp (após mover spawn B0 de (-8,66) pra fora do AABB do prédio, ex. z=63)
git merge --no-ff pr/7        # conflito maps.js: manter união (import + entrada fy_masp)

# 3) PR #8 — fy_baleia SEM o map_masp.js encadeado (é byte-idêntico ao #7, mas não é
#    branch encadeada — está embutido no commit único b4f8f1e). Recriar limpo:
git checkout -b map/faria-lima-baleia-v2 main
git checkout pr/8 -- public/js/map_baleia.js
# editar public/js/maps.js: adicionar SÓ import + entrada fy_baleia
git add -A && git commit -m "mapa fy_baleia (Faria Lima)"   # push -f no branch do PR

# 4) PR #9 — fy_osasco (após adicionar pickups)
git merge --no-ff pr/9
# game.js vai conflitar com nada ainda (o #5 não entrou) — entra limpo.

# 5) PR #10 — fy_havan, por último e SÓ depois de:
#    a) commitar suas mudanças locais (roam dos bots por centróide de spawns — já resolve metade);
#    b) honrar s.yaw em _resetPositions/_respawnPlayer (hoje hardcoded P→π, B→0 em game.js:352/935);
#    c) remover do PR a reformatação de espaços do maps.js (transforma conflito trivial em modify+add).
git merge --no-ff pr/10
```

**Fase 2 — reworks:**

```bash
# 6) PR #4 — fy_sitio: recriar o index.html a partir da main (remover os 6 marcadores
#    <<<<<<< / ======= / >>>>>>> das linhas 107-133), corrigir:
#    - spawns P no chão (z≈-28) ou groundHeightAt na rampa (arestas hoje são só chão→varanda);
#    - não mutar T.grass.repeat (map_sitio.js:87 — textura compartilhada, vaza pro awp_map);
#    - colliders quadrados de cercas rotacionadas (10×10m de parede invisível).

# 7) PR #5 — fy_metro: rebasear sem map_sitio.js:
git checkout -b map/metro-sp-v2 main
git checkout pr/5 -- public/js/map_metro.js
git checkout pr/5 -- public/js/game.js      # mantém os 4 hunks de movers/tick/killfeed
# editar maps.js: SÓ fy_metro. Depois corrigir no map_metro.js:
#    - groundHeightAt das pontas (spawns x=±4,z=±42 caem no ramo PLAT → y=-0.8, preso pra sempre);
#    - collider + occluder no trem (hoje bala e LOS atravessam);
#    - ligar mezanino ao grafo (Δh 1.72 > step 0.65 → 3 ilhas, bots não cruzam de lado);
#    - retornar pickups (hoje ausente — mapa fy_ sem arma no chão).
```

**Resoluções exatas de conflito:**

- **`maps.js` (todos os mapas):** conflito add-add nos mesmos pontos (bloco de imports e registry). Resolução: **união das linhas**, uma entrada por mapa, sem reformatação de colunas.
- **`game.js` #5 × #9 (linha duplicada):** os dois inserem a **mesma linha** no mesmo ponto do `update()` (entre `_updateBot` e `_updatePickups`, ~l.1155): `if (this.world.tick) this.world.tick(this, dt);`. Só o comentário difere. Manter **uma única** chamada com o comentário do #9 (`// coisas vivas do mapa (pombos, trem...)`, mais genérico). Os outros 3 hunks do #5 (killfeed METRÔ, movers no player e nos bots) não se sobrepõem.

---

## 4. Veredito do PR #11 (Godot): **RECUSAR** — fechar com agradecimento explícito e cherry-pickar ideias

**O que o port realmente é:** dos +30.320, ~19.700 linhas são o addon GUT vendorado e só ~4.359 são GDScript próprio. O jogo portado é a main de fevereiro (pré-Astro): 1 arena procedural, 3 armas (AWP/pistola/faca), 4×4 com bots. O GDScript é **excelente** (tipagem estática total, zero autoloads, lógica pura testável, armas data-driven via Resource, contrato de baseline com valores dourados do cliente JS). Os números declarados **conferem**: 72 testes GUT contados de verdade, ~28 cenários Playwright; o autor é honesto até nos pontos fracos (40MB de wasm, 12,7s de boot no Firefox).

**Por que recusar mesmo assim:**

1. **Mata o superpoder do produto.** Cliente atual: ~1,5MB, zero build, abre instantâneo de um link no WhatsApp. Export Godot: `index.wasm` de 39,5MB + boot de 1,3s (Chromium)–12,7s (Firefox), medido pelo próprio autor num M4 Pro. Para um jogo viral de acesso casual, custo de aquisição de jogador é a métrica — isso é regressão de produto 25×.
2. **Paridade: ~30% e congelada.** Faltam: 6 mapas novos, arsenal (AK/M4/MP5/M3/Deagle), modos de arma, ranking/Supabase, perfis/badge, mapa de calor, anti-cheat, UI CS 1.6, site Astro inteiro. Estimativa: **25–45 dias de 1 dev** — com a main andando durante isso (alvo móvel).
3. **Estruturalmente incompatível:** o PR renomeia a raiz pra `web/` enquanto a main moveu os mesmos arquivos pra `public/` (rename/rename em ~15 arquivos) e o `vercel.json` dele **remove o build do Astro** — mergeado como está, derruba `/ranking`, `/u/*` e todos os `/api/*`.
4. **"Conviver com os dois"** = manutenção dupla eterna com contribuidor único externo como bus factor. O runbook dele institucionaliza isso.

**Cherry-picks recomendados (o valor real do PR):**

1. `godot/contracts/legacy_baseline.json` + teste de contrato → extrair as constantes de gameplay do `game.js` (walk 4.7, sprint 6.6, gravity 14.5, round 99s...) pra um JSON versionado com teste que trava regressão.
2. **Suíte Playwright inteira** (`tests/web/*.spec.mjs`, ~750 linhas): boot, pointer-lock, combate, armas, partida, UI, áudio — quase toda adaptável ao cliente atual, que hoje não tem E2E.
3. Gate de performance (`performance.spec.mjs`): média ≥60 FPS, p95 ≤33,3ms — perfeito como CI para PRs de mapas novos.
4. Padrão "lógica pura testável": extrair física/regras do `game.js` (1.195 linhas monolíticas) pra módulos puros unit-testáveis.
5. Armas data-driven (16 campos declarativos) como JSON — facilitaria PRs de arsenal.
6. Formato do runbook e do relatório de paridade (hardware, versões, números) como padrão de docs do repo.

**Custo social:** responder ao woliveiras reconhecendo a qualidade (é verdade e é raro), explicando a decisão pelo custo de distribuição/paridade, e convidando-o a portar a suíte Playwright pro cliente JS — é o item de maior valor do PR e o mantém engajado.

---

## 5. Top 10 riscos/bugs priorizados

| # | Risco/Bug | Referência | Sev. |
|---|-----------|------------|------|
| 1 | Migrations 008–010 não aplicadas ⇒ `submit_match` falha com erro que a regex de retry não casa ⇒ **403 pra todo submit, ranking morto** | `src/pages/api/submit-match.ts:41-44`, `supabase/migrations/008-010` | **ALTA** |
| 2 | Anti-cheat aceita stats forjados plausíveis (kills=44/round, seconds>80·rounds passam por tudo); sem HMAC/nonce/telemetria; replay a cada 90s com token do localStorage; sem check de Origin | `submit-match.ts:14`, `schema.sql:150-163` | **ALTA** |
| 3 | PR #5: spawns das pontas com `groundHeightAt=-0.8` ⇒ jogador preso sob o piso em 50% dos respawns | `map_metro.js:316,172-179` | **ALTA** |
| 4 | PR #4: 6 marcadores de conflito commitados renderizando na tela + IDs duplicados | `index.html:107-133` (pr/4) | **ALTA** |
| 5 | PR #4: grafo unidirecional chão→varanda ⇒ bots do time P presos no spawn o jogo todo | `map_sitio.js:306-313,352-355` | **ALTA** |
| 6 | PR #5: trem sem collider/occluder ⇒ bala, LOS de bot e jogador atravessam; portas que "abrem" jogam no fosso sem volta | `map_metro.js:230,357` | **ALTA** |
| 7 | PR #10: engine ignora `spawn.yaw` (hardcoded ±Z) ⇒ no havan todos nascem olhando 90° errado e bots avançam no eixo errado | `game.js:352,935,1036-1042` | **ALTA** |
| 8 | PR #7: spawn B0 encosta em AABB de prédio; com jitter ±0.5 nasce dentro do collider | `map_masp.js:235` vs `:118` | **ALTA** |
| 9 | Recarregar 1 arma reabastece o pente de **todas** (recarga grátis de AWP via pistola) | `game.js:832-835` | MÉDIA |
| 10 | Modo de arma não vale na troca manual (1/2/3) nem pra bots; mortos sempre dropam AWP mesmo em modo pistols/faca | `game.js:236-238,507-519,636,874-888` | MÉDIA |

Menções: mutação de `T.grass` compartilhada no #4 (`map_sitio.js:87` — grama do awp_map fica 9× densa); paredes invisíveis de 1,2m nos ~22 carros do #10 (`map_havan.js:166`); 259 shadow casters no #10 (3-4× os outros — instanciar carros); `setTimeout` não limpos no `dispose()` (`game.js:554,666,673,684,1104`).

---

## 6. Quick wins (cada um ≤ 1 dia)

1. **Rodar `schema.sql` no Supabase** e testar o submit em produção — minutos, e pode estar salvando o ranking inteiro.
2. **Anisotropy nas texturas**: `t.anisotropy = renderer.capabilities.getMaxAnisotropy()` em `textures.js:9` — chão deixa de borrar em ângulo raso, custo ~zero.
3. **Blob shadow** (sprite radial escuro) sob cada personagem — hoje eles parecem flutuar; é o fake-AO mais barato que existe.
4. **`sun.shadow.normalBias = 0.02`** junto do bias em `map.js:284` — mata acne de sombra.
5. **Check de Origin/Referer no `/api/submit-match`** + rate-limit durável único — não resolve forjação, mas corta o script kiddie de curl.
6. **Fix da recarga** (`game.js:832`): reabastecer só a arma ativa.
7. **Modo de arma consistente**: aplicar `_pickupAllowed` na troca manual e no drop/grab dos bots (dropar a arma que o morto usava, não sempre AWP).
8. **Pickups no fy_osasco** (4-6 armas com o `buildGun` do #10) — desbloqueia o merge do #9 completo.
9. **Limpar os diffs encadeados**: remover `map_sitio.js` do #5 e `map_masp.js` do #8 (ambos byte-idênticos aos originais; comandos na seção 3).
10. **Env map + materiais PBR nas armas/personagens**: `RoomEnvironment` + `PMREMGenerator` (vendorizável dos examples do r160) e `MeshStandardMaterial` (metalness ~0.8 nas armas) — o maior salto visual por dia investido.

---

## 7. Gráficos: diagnóstico e plano (sem sair do Three.js vanilla)

O pipeline de cor já está certo (r160: sRGB default, `ACESFilmicToneMapping` já ligado em `main.js:24-25`, PCFSoft shadows). O visual "ruim" vem de escolhas de material/textura, todas corrigíveis sem bundler:

| Causa | Onde | Correção |
|-------|------|----------|
| 100% `MeshLambertMaterial` (11×) — fosco, sem specular/reflexo | todo `public/js` | `MeshStandardMaterial` em armas/personagens/metais (roughness ~0.6, metalness ~0.8) |
| Sem `scene.environment` — iluminação chapada | — | `PMREMGenerator` + `RoomEnvironment` (examples r160 via importmap) ou gradiente procedural |
| Sem anisotropy — pisos borrados em perspectiva | `textures.js:9` | quick win #2 |
| `magFilter=NearestFilter` em tudo — lê como serrilhado | `textures.js:8` | `LinearFilter` em superfícies grandes; manter nearest só em props retrô intencionais |
| Sem AO — cantos sem profundidade, personagens flutuando | — | AO assado nas texturas procedurais (gradientes radiais em `concreteBase`) + blob shadows |
| Sem bloom — tiros/luzes sem brilho | — | emissive nos muzzle flashes + `UnrealBloomPass` vendorizado (opcional, preset high) |

Sequência sugerida (3-4 dias no total): anisotropy + normalBias + blob shadows (dia 1) → StandardMaterial + env map (dia 2) → AO assado + ajuste de fog/exposure ~1.12 (dia 3) → bloom no preset high (dia 4). Isso responde diretamente ao argumento "gráficos ruins ⇒ Godot": o gargalo é material e luz, não engine.

---

## 8. Gaps pra "1.0" (priorizados por valor ÷ dias)

1. **Controles touch/mobile** (~5-8 dias): hoje mobile = tela de aviso (`main.js:102,605`), zero touch handlers. O público casual BR é majoritariamente mobile — é provavelmente o maior desbloqueio de audiência do projeto inteiro, maior até que multiplayer.
2. **Visual pass** (3-4 dias, seção 7) — barato e muda a primeira impressão, que é o que viraliza.
3. **Anti-cheat honesto** (3-5 dias): HMAC do payload com segredo por sessão + telemetria mínima (timestamps de kills) validada no RPC; hoje o placar é fundamentalmente forjável.
4. **Testes E2E** (2-3 dias): portar a suíte Playwright do PR #11 — protege todos os merges futuros de mapas.
5. **Multiplayer real** (15-30 dias): começar com 1v1 P2P via WebRTC (sem servidor de jogo) — "manda o link pro amigo" é a mecânica viral mais forte que existe; salas dedicadas ficam pra depois.
6. **Mais personagens/mapas** — os PRs já cobrem 2026; manter cadência de 1 mapa/mês com o gate de performance do item 4.
7. **Acessibilidade** (1-2 dias): slider de sensibilidade, FOV, modo daltônico nos nomes de time, legenda dos áudios.
8. Monetização: manter nula por ora — qualquer atrito mata o loop viral; no máximo "apoie o projeto".

---

## 9. Viralização

O ativo viral do jogo é a combinação **sátira BR + zero fricção**. Estratégia em 4 frentes:

**a) Proteger a fricção zero.** Link abre jogando em segundos — nenhuma decisão (inclusive o Godot) pode custar isso. Meta: primeiro tiro em <10s do clique, inclusive em notebook fraco.

**b) Loop de compartilhamento embutido.** Já existe badge PNG de perfil — é o embrião certo. Adicionar: card de resultado pós-partida (imagem pronta pra WhatsApp/X com placar, personagem, mapa e link), botão "desafiar um amigo" com deep link `?map=fy_masp&mode=knife`, e **clip de 10s** do último kill via `MediaRecorder` do canvas (WhatsApp é o canal de distribuição BR — vídeo curto > screenshot).

**c) Momentos memeáveis por design.** Cada mapa já tem um gimmick clipável (pombos, trem, pedalinho, estátua) — dobrar a aposta: conquistas absurdas com cards compartilháveis ("Morreu pro trem 3×", "Matou de faca no vão do MASP"), frases dubladas como soundboard. O conteúdo que viraliza é o ridículo, não o competitivo.

**d) Ritmo e criadores.** Ranking semanal com reset (razão de retorno + post semanal "top 10 da semana"), desafios temáticos com hashtag (ex.: #SóFacaNoMASP), e pacote de mídia pra streamers/TikTokers BR pequenos (o nicho "jogo BR zoeira" tem apetite enorme e custo de aquisição zero — basta o jogo abrir rápido no navegador deles, ver item a).

Cuidado permanente: manter a sátira 100% ficcional (personagens estereotipados, marcas parodiadas tipo "Havão") — além de ser a linha editorial, reduz risco de takedown justamente quando um clipe viralizar.

---

*Análise read-only: nenhum arquivo do jogo foi modificado. As mudanças locais não commitadas no seu branch `map/havan-estacionamento` (estátua maior + roam de bots por centróide de spawns no game.js) foram detectadas e consideradas no plano do PR #10 — precisam ser commitadas/pushadas pra contar.*
