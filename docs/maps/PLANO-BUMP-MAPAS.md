# Plano de bump dos mapas — o acervo medido, os PRs abertos e a ordem de trabalho

> Escrito em 12/09/2026 contra o worktree principal (`feat/fps-paid-viewmodels-aaa`, `c25a14ed0`).
> **Todo número deste arquivo saiu de uma execução real desta data** — os dois comandos que o
> reproduzem estão citados em cada tabela. Nenhum teto foi asserido: os que existem são lidos
> das réguas que já os declaram (LIÇÃO 2 do [`docs/LICOES.md`](../LICOES.md)).
>
> Contexto do pedido: *"analisar todos os PRs de mapa, em especial os da comunidade, e montar
> um plano para os mapas segurarem o jogador"*.
>
> **O "como" não mora aqui.** As 11 receitas mapa a mapa — cada intervenção com coordenada,
> dimensão, prop do catálogo e o número que ela move — estão em
> [`RECEITAS-MAPAS.md`](RECEITAS-MAPAS.md) e em `receitas/<mapa>.md`. Elas também corrigem a
> leitura de parte dos números deste arquivo: **quatro defeitos de INSTRUMENTO** (occluder
> empurrado como `Group` e nunca testado pelo raycast; `InstancedMesh` pulado pela régua; GLB que
> não carrega em node, o que faz a Praça ser medida vazia; e o fallback errado de `MW/MD`) fazem
> parte da cobertura baixa ser do medidor, não do mapa.

---

## 1. O veredito, em uma frase

**Os 8 mapas marcados como COMUNIDADE são a metade fraca do acervo, e são exatamente os que
nenhuma régua cobre.** Das 20 cláusulas estruturais vermelhas fora da dívida declarada,
**18 caem nos mapas da comunidade** (`node tools/eval/mapa-novo-gate.mjs`, 12/09). Não é
julgamento de arte: é o portão que o próprio repositório escreveu, rodando contra o registro.

O agravante é de processo, não de mão de obra: **o portão que mostra isso não roda em lugar
nenhum**. `eval:mapanovo` está fora do `check:fast` e fora do `check:deploy`
(`package.json:42`, `:192-193`), e o CI cobra **uma** régua de mapa em node
(`eval:mapcontrato`, `.github/workflows/ci.yml:50`) mais `eval:grafite` em 5 mapas no
`portao-browser`. As outras ~26 réguas de mapa dependem de alguém lembrar de rodar
`check:fast` na própria máquina.

---

## 2. O que eu medi hoje

### 2.1 `node tools/eval/map-check.mjs all` — 17 mapas pela primeira vez

O `tools/eval/map_check.json` versionado cobria **5 mapas** (os `fy_*`) e foi gerado antes dos 7
mais novos existirem — por isso o portão acusa `JOG: <mapa> não aparece no map_check.json` para
12 dos 17. Rodei `all` e restaurei o arquivo ao estado da árvore em seguida; os números abaixo
são dessa execução.

`C` = mapa da categoria COMUNIDADE (`public/js/main.js:1670-1686`).

| mapa | C | occluders | exp. spawn E/B | maior visada | MAP5 pior espaçamento (teto **7 m**) | corpo dentro de sólido (teto **0**) | escadas | altura do triângulo CTF (piso **4,5 m**) |
|---|---|---|---|---|---|---|---|---|
| `fy_lajes` | | **971** | 100% / 100% | 67,5 m | **1,1 m** | 0 | 6 | 18,1 |
| `fy_escadao` | | 443 | 0% / 16,1% | 74,0 m | 6,5 m | 0 | 5 | 6,8 |
| `quebrada` | | 433 | 8,8% / 0,8% | 70,0 m | 5,4 m | 0 | 0 | 10,4 |
| `fy_mansao` | | 323 | 11,2% / 11,0% | 66,6 m | 6,4 m | **1** (0,9 m) | 2 | 9,5 |
| `loja_h` | | 316 | 53,4% / 0% | 89,7 m | 6,1 m | 0 | 2 | 32,8 |
| `ferro_velho` | | 184 | 33,6% / 23,1% | 71,7 m | 9,2 m | 0 | 0 | 6,8 |
| `upa_24h` | **C** | 122 | 15,6% / 2,7% | 64,3 m | **8,6 m** | 0 | 0 | 4,3 |
| `fy_campomorro` | | 118 | **64,1%** / 15,0% | 73,8 m | 6,7 m | 0 | 0 | 11,9 |
| `piscina_treta` | **C** | 109 | 15,9% / 15,7% | 48,6 m | 5,4 m | 0 | 0 | 12,0 |
| `fy_corrego` | | 108 | 29,2% / 27,3% | 77,0 m | 6,6 m | 0 | 0 | 8,3 |
| `penitenciaria` | **C** | 77 | **79,3% / 76,1%** | **98,5 m** | **20,6 m** | **14** (1,02 m) | 0 | **0** |
| `praca_poderes` | | 68 | 74,6% / 82,1% | **153,6 m** | **99 m** | 0 | 0 | 6,3 |
| `atacadao_treta` | **C** | 65 | 45,9% / 7,8% | 70,5 m | **14,1 m** | 0 | 0 | 18,0 |
| `velho_oeste` | **C** | 56 | 63,4% / 66,6% | 92,0 m | **99 m** | 0 | 0 | **0** |
| `parque_treta` | **C** | 48 | 51,9% / 52,2% | 86,2 m | **17,4 m** | **20** (1,06 m) | 0 | 4,8 |
| `obras_prefeitura` | **C** | 32 | **88,5% / 89,0%** | 73,6 m | **99 m** | **8** (1,31 m) | 0 | 19,0 |
| `posto_treta` | **C** | **26** | 72,0% / 73,2% | 73,6 m | **10,5 m** | 0 | 0 | 14,0 |

Critérios, copiados do próprio JSON (`criterios`):
MAP1 corpo dentro de sólido (raycast do peito a 1,4 m; sólido com topo > 0,30 m acima do chão
local reprova) · MAP2 exposição = fração dos pontos andáveis a ≥ 25 m com LOS até a cabeça de
quem nasce · MAP5 espaçamento médio entre props ≤ 7 m **e** densidade prop/waypoint ≥ 0,35× a
mediana do próprio mapa, por quadrante de uma grade 4×4 · CTF1 altura do triângulo das
bandeiras. `99 m` é o valor sentinela de quadrante **sem nenhum prop**.

Leitura direta:

- **Cobertura**: `posto_treta` tem **26 occluders**; o `fy_lajes` tem **971**. Os 7 piores do
  acervo em cobertura são 6 mapas da comunidade + a Praça (que é esplanada por desenho).
- **Pontos de defesa**: MAP5 reprova em **6 dos 8** mapas da comunidade, com 3 deles tendo
  quadrante **inteiro sem cobertura nenhuma** (`obras`, `velho_oeste`, e a Praça).
- **Spawn**: em `obras_prefeitura` **89% do mapa enxerga quem nasce**; em `penitenciaria`, 79%.
  O teto do `loja_h/B` é 0% (`invariants.mjs:1850`) — existe precedente de exigir isso.
- **Bandeiras colineares**: `velho_oeste` e `penitenciaria` têm altura de triângulo **0,00 m** —
  as três bandeiras estão numa reta. É CTF1, hoje anistiada em `KNOWN-RED.json` como "mapa(s)
  legado(s)". A anistia está escondendo dois mapas vivos.
- **Verticalidade**: **zero escadas** nos 8 mapas da comunidade. `groundHeightAt = () => 0` em
  `map_posto.js:399`, `map_upa.js:248`, `map_atacadao.js:212`, `map_parque.js:413`,
  `map_velho_oeste.js:391`, `map_penitenciaria.js:234`.

### 2.2 `node tools/eval/mapa-novo-gate.mjs` — 32 cláusulas vermelhas

| mapa | massas | massa girada (piso 15%) | ângulos distintos (piso 20) | h90 (piso 9 m) | materiais sem `map` (teto 40%) | área sem textura (teto 6%) |
|---|---|---|---|---|---|---|
| `posto_treta` **C** | 145 | 16,6% | **2** | **5,5 m** | 30,9% | **17,7%** |
| `upa_24h` **C** | 220 | **0,0%** | **1** | **4,2 m** | **45,8%** | **52,2%** |
| `obras_prefeitura` **C** | 189 | **0,0%** | **1** | 11,0 m | **41,3%** | **75,4%** |
| `atacadao_treta` **C** | 208 | **0,0%** | **1** | 10,5 m | 30,5% | **60,8%** |
| `parque_treta` **C** | 231 | **10,4%** | **2** | 22,6 m | 36,6% | **8,8%** |
| `velho_oeste` **C** | 438 | 31,5% | 23 | **3,5 m** | 23,4% | 0,2% |
| `penitenciaria` **C** | 843 | **4,4%** | **9** | **8,8 m** | **77,8%** | 1,4% |
| `fy_corrego` | 531 | 68,2% | 39 | 9,4 m | 31,4% | 1,8% |
| `ferro_velho` | 1058 | 41,2% | 46 | 4,2 m ~ | 17,7% | 0,2% |

(`~` = dívida declarada que avisa e não reprova; a tabela completa dos 17 sai no comando.)

Um ângulo distinto em 208 massas é o que o próprio portão chama de *"o mapa lê como maquete"*.
75,4% da área sem textura é o que ele chama de *"lê como plástico"*. Esses dois números são a
resposta técnica ao "não parece profissional".

---

## 3. "Mapas da comunidade" — o que é, e a documentação que mente

**É a categoria `COMUNIDADE` do seletor**: 8 dos 17 mapas, creditados na ficha a três autores de
fora da casa. Entrou pelo PR #334 em 17/08/2026 (`CHANGELOG.md:202`).

| id | autor exibido | data | commits no git com esse autor |
|---|---|---|---|
| `piscina_treta` | Dalton Fontes | 17/07/2026 | `ruben-cytonic` 11, `Ruben Marcus` 7 — **nenhum do autor creditado** |
| `posto_treta` | Emerson Garrido | 13/08/2026 | Emerson 1, Ruben 3 |
| `upa_24h` | Emerson Garrido | 13/08/2026 | **nenhum do autor creditado** |
| `obras_prefeitura` | Emerson Garrido | 13/08/2026 | **nenhum** |
| `atacadao_treta` | Emerson Garrido | 14/08/2026 | **nenhum** |
| `parque_treta` | Ubiracy Santos | 17/08/2026 | **nenhum** |
| `velho_oeste` | Ubiracy Santos | 17/08/2026 | Emerson 1, Ruben 5 — **nenhum do autor creditado** |
| `penitenciaria` | Ubiracy Santos | 17/08/2026 | Emerson 1, Ruben 7 — **nenhum do autor creditado** |

Fonte: `public/js/main.js:1670-1693` (categoria/autor/data) × `git log --format='%an' -- public/js/map_<x>.js`.

Três furos que o plano precisa fechar, porque cada um custa confiança:

1. **`docs/lore-mapas.md:25-27` afirma que "mapas da comunidade" são os mapas de favela e que
   "não existem mapas feitos por contribuidores externos".** O código diz o contrário
   (`main.js:1700`: *"Mapas feitos pela comunidade"*). Um agente que planeje pela lore ataca o
   mapa errado — foi o que aconteceu numa das leituras desta própria investigação.
2. **A autoria só existe no cliente do jogo.** Nem `public/js/maps.js:39-95` nem
   `src/data/jogo.ts:121-131` têm campo de autor, e o catálogo do site lista **10** dos 17 ids:
   7 dos 8 mapas da comunidade **não existem em `/mapas`**.
3. **Não há porta de entrada.** `CONTRIBUTING.md:106-116` ensina a adicionar mapa sem citar
   autoria ou categoria; `.github/PULL_REQUEST_TEMPLATE/` não existe; `docs/**/mapas-comunidade*`
   não existe. O módulo que entregava isso (PR #273, de `@EmersonGarrido`) foi fechado como
   supersedido — mas o que entrou (#334) foi só o crachá.

E o caminho técnico que tornaria contribuição barata **existe e está parado**:
`public/js/map_json.js` (mapa como dado, PR #223) com validador de grafo/spawn e régua com 3
mutantes (`tools/eval/mapjson-check.mjs`), **dentro do `check:fast`** — e com **zero mapas JSON
registrados**; o único spec é o fixture de teste. O `docs/ROADMAP.md:94-107` ainda diz que isso
"não começou", o que também está errado: o loader foi construído e nunca foi usado.

---

## 4. Os 31 PRs de mapa abertos

### 4.1 Duas correntes fazendo a mesma coisa duas vezes

| corrente | raiz | estado da raiz | degraus | PRs presos |
|---|---|---|---|---|
| **A** (original) | #540 `codex/mapas-polish-integral` | **DIRTY** | 541 → 542 → 545 → 547 → 548 → 550 → 551 | 7 |
| **B** (reconstrução) | #554 `codex/mapas-stack-root-v2` | **DIRTY**, 13 avisos de autofix | 555 → 556 → 560 → 562 → 563 → 564 → {565, 566, 567} | 9 |

Nove pares são substituição declarada no corpo do PR novo — e **a corrente B é a mais recente em
todos**: #540↔#554, #541↔#555, #542↔#560, #545↔#562, #547↔#563, #548↔#564, #550↔#565,
#557↔#566, #530↔#577 (+#558↔#567 parcial). O #583 chegou ao mesmo número por outro caminho:
*"#554 destrava 9, #540 destrava 7 … seguram 16 dos 47 PRs"*.

**Decisão proposta: adotar a corrente B, fechar a A, e transplantar o #551 (Amazônia, único
degrau sem par) para o topo da B.** Manter as duas vivas duplica todo conflito em
`map_uv.js` (criado duas vezes, em #542 e #560), `textures.js`, `vao.js` e `graffiti_layout.js`
(regenerado por 8 PRs diferentes porque a régua de grafite compara hash de cada `map_*.js`).

### 4.2 O que os PRs abertos já entregam para cada eixo do pedido

| eixo | PR | número que ele move | mapa |
|---|---|---|---|
| **dificuldade / cobertura** | **#579** | abertura central 58,9% → **23,6%**, 2 torres, 4 bunkers, 3 rotas por spawn | `obras_prefeitura` **C** |
| | **#582** | 6 fileiras/48 módulos, 4 corredores de 4,1 m, 3 rotas por spawn, doca | `atacadao_treta` **C** |
| | **#566** | corredor técnico oeste, ilhas de cobertura, posto elevado leste | `piscina_treta` **C** |
| | **#577** | 2 muretas de portão + 11 coberturas laterais (gate novo mede 0/2 e 0/11 na base) | `quebrada` |
| | **#556** | 4 passarelas a 5,8 m, 6 rotas pátio→guarita, Pavilhão 6 com piso superior | `penitenciaria` **C** |
| | **#567** | portas viradas para a fachada do respawn, janela de contrajogo, 2 guardas | `fy_escadao` |
| **visual / escala** | #541/#555, #542/#560, #545/#562, #548/#564, #550/#565, #551 | UV em metros: 3,95 → 128 px/m (Penitenciária), 35,4 → 128 (Parque), 32,3 → 128 (Posto) | 10 mapas |
| | #547/#563 | 106 superfícies com anisotropia < 4 → **0** | 4 mapas |
| | **#586** | Posto vira GLB: 3,67 MB → 509 KB, 4.273 tri, **3 draw calls** | `posto_treta` **C** |
| **jogabilidade / rota** | **#467** | rota baixa do Córrego: degrau de 1,90 m → **0,00 m**; 4ª rampa 1,435 → 0,073 m | `fy_corrego` |
| **desempenho** | **#589** | orçamento dos 17 mapas medido: `fy_mansao` 2.038 draw calls, `fy_corrego` 8,3 M triângulos | todos |
| **retenção / vitrine** | **#585** | `VIDEO_MAPS` vira allow-list — prévia em vídeo deixa de ser `id === 'lajes'` cravado | qualquer |
| **inventário** | #538 | ficha medida dos 6 mapas legados (bandeira de Obras em cova a −1,58 m; bandeira B do Atacadão a 5,00 m do próprio spawn) | 6 mapas **C** |

**Os PRs abertos já atacam 5 dos 8 mapas da comunidade.** O que falta não é trabalho de mapa —
é o portão que os defenda e a ordem de integração. Sem PR aberto hoje: `upa_24h`,
`parque_treta` e `velho_oeste` — que são, respectivamente, o 3º pior em textura (52,2% da área
sem textura), o recordista de corpo dentro de sólido (**20 pontos**) e o único mapa sem tema
brasileiro.

### 4.3 Conflito por arquivo (quem não pode trabalhar em paralelo)

| arquivo | PRs abertos que o tocam |
|---|---|
| `map_piscina.js` | #547, #548, #557, #563, #564, **#566**, #589 |
| `map_penitenciaria.js` | #540, #541, #542, #554, #555, **#556**, #589 |
| `map_quebrada.js` | #530, #550, #565, **#577**, #589 |
| `map_atacadao.js` | #545, #562, **#582**, #589 |
| `map_posto.js` | #545, #562, **#586**, #589 — a UV de #562 vira código morto se #586 entrar antes |
| `map_uv.js` | #542 (cria), #545, #548, #560 (cria de novo), #562, #564 |
| `graffiti_layout.js` | #540, #554, #550, #565, #557, #566, #567, #589 |

---

## 5. Trabalho de mapa fora dos PRs

- **16 frentes órfãs** (commit de mapa não mergeado e sem PR aberto), entre elas cinco
  checkpoints que nunca foram para o `origin`: `codex/lajes-visual`, `codex/escadao-visual`,
  `codex/amazonia-visual`, `codex/mapas-quality-program`, `claude/praca-poderes-visual`.
- **A onda `map2/*` e `map/*`: 17 branches remotas**, todas com PR fechado e nenhuma contida na
  `main` (`map2/amazonia` #439, `map2/lajes` #438, `map2/piscina` #447, `map2/escadao` #436,
  `map2/campomorro` #437, `map2/corrego` #435, `map2/obras` #458, `map2/velho-oeste` #445,
  `map2/posto` #457, `map2/parque` #440, `map2/mansao` #446, `map2/atacadao` #459 …). É **estoque
  de geometria, grafite e pickups**, não trabalho novo — inclusive `v21/a-lajes`, que carrega a
  régua anti-trap AT1.
- **102 worktrees**, das quais **32 podáveis hoje** (29 presas a branch já mergeada + 3 detached
  em commit mergeado), 9 delas de mapa. Três pastas mentem sobre a branch que hospedam
  (`mapas-polish-integral`, `escadao-visual`, `lajes-visual`).
- **Workflows**: os 5 arquivos modificados na árvore só acrescentam `permissions: contents: read`
  — **zero efeito** sobre régua de mapa. A matriz real é a do §1: `ci.yml` cobra
  `eval:mapcontrato` + `eval:escala` + `botsim` (5 mapas); `portao-browser.yml` roda
  `eval:grafite` (5 mapas) filtrado por path; `smoke-web`, `pr-gates` e `staging` não rodam
  nenhuma régua de mapa. **Nenhum workflow invoca `check:fast`.**

---

## 6. As dimensões do pedido que hoje não têm régua nenhuma

| dimensão pedida | régua hoje | o que existe para reaproveitar (LIÇÃO 2: não invente limiar novo) |
|---|---|---|
| quantidade de **pontos de defesa** por objetivo | **nenhuma** | MAP5 já deriva cobertura de `colliders` (altura ≥ 0,6 m, pegada ≤ 60 m²) com teto de **7 m** de espaçamento — `map-check.mjs:598` |
| **ângulos de aproximação** por objetivo | **nenhuma** genérica | `campo-contract-check.mjs:103-110` exige **5 bocas com linha de tiro** — mas só no `fy_campomorro` |
| **tempo de rotação** entre objetivos | **nenhuma** genérica | `campo-contract-check.mjs:80-91`: rota ≤ **25 s** a 4,17 m/s (velocidade da arma mais lenta do `game.js`) |
| **distância até a cobertura mais próxima** | **nenhuma** genérica | `campo-contract-check.mjs:129-135`: cover a ≤ **3 s** (~12,5 m), caixa com ≥ 0,9 m de altura |
| **linha de visão longa demais** | **nenhuma** | MAP2 já usa **25 m** como "distância em que a AWP mata sem reação"; `maiorVisada` já é medido e chega a 98,5 m |
| **densidade de detalhe brasileiro** | **nenhuma** genérica | `lajes-rooftop-check.mjs:28` conta 3 categorias (caixa d'água ≥ 8, antena ≥ 5, varal ≥ 4) em quadrantes — **num mapa só** |
| **retenção por mapa** | **nenhuma** | o dado existe: `/api/match` grava `p_map`, `p_result` (com `quit`), `p_seconds`, `p_rounds`; `/api/telemetry` grava `p_map`+`p_seconds`. **Ninguém lê por mapa** — a única leitura é `/api/map-plays`, que só soma escolhas |

Duas réguas de mapa estão **órfãs** (existem em `tools/eval/` e nenhum script npm as chama):
`relevo-check.mjs` (topografia) e `escadao-rota-check.mjs` (lance de escada que não leva a lugar
nenhum). A segunda nasceu de um relato do dono — *"tem 3 escadas, 2 não levam pra lugar nenhum"* —
e nunca entrou no portão.

---

## 7. O plano, em degraus

Cada degrau tem **entregável, régua e critério de aceite**. Nenhum degrau depende de julgamento
de gosto para ser considerado fechado. A ordem não é negociável nos dois primeiros: sem eles, o
trabalho de mapa continua entrando sem defesa e saindo sem prova.

### Degrau 0 — parar a sangria de processo (antes de qualquer geometria)

1. `node tools/eval/map-check.mjs all` vira o artefato versionado (17 mapas, não 5), e
   `eval:map-new` passa a rodar `all` em vez de `novos`.
2. **`eval:mapanovo` e `eval:map-new` entram no `ci.yml`.** As 32 vermelhas de hoje viram
   **dívida declarada com data** em `KNOWN-RED.json` (ratchet: pode diminuir, nunca aumentar) —
   é assim que se acende a luz sem travar o repositório.
3. `relevo-check.mjs` e `escadao-rota-check.mjs` ganham script npm e entram no `check:fast`.
4. Corrente B adotada; corrente A (#540, #541, #542, #545, #547, #548, #550) fechada com o
   motivo no corpo; #551 transplantado para o topo de B.
5. Poda: 32 worktrees, e as 17 branches `map2/*` viram tag de arquivo antes de sumirem do
   `origin` — **é estoque, não lixo**.

**Aceite**: CI reprovando um mapa novo que nasça com quadrante sem cobertura; `check:fast` com
os dois scripts órfãos; ≤ 1 corrente de PR de mapa aberta.

### Degrau 1 — a régua de dificuldade que não existe (`tools/eval/defesa-check.mjs`)

Uma régua só, varrendo o **registro** (nunca lista literal), com mutante por cláusula:

| cláusula | mede | teto/piso proposto | procedência do número |
|---|---|---|---|
| DEF1 | pontos de cobertura por objetivo num raio de 12 m | ≥ 3 | altura mínima de caixa de cover 0,9 m do `campo-contract-check.mjs:129-135` |
| DEF2 | ângulos de aproximação distintos por bandeira | ≥ 3 | 5 bocas do `campo-contract` relaxado para o mapa médio; medir os 17 antes de cravar |
| DEF3 | tempo de rotação objetivo → objetivo | ≤ 25 s | `campo-contract-check.mjs:80-81` (4,17 m/s, arma mais lenta) |
| DEF4 | distância até a cobertura mais próxima, por waypoint | p95 ≤ 12,5 m | mesmo arquivo, cláusula de cover a 3 s |
| DEF5 | fração de waypoints com visada livre > 40 m | teto a calibrar nos 17 | MAP2 já usa 25 m como distância letal sem reação |
| DEF6 | exposição do spawn | ≤ teto por mapa, ratchet | `invariants.mjs:1850` já exige **0%** no `loja_h/B` |

**Aceite**: cada cláusula com um mutante que a deixa vermelha (LEI 3 do `AGENTS.md`), e o
relatório dos 17 mapas publicado como linha de base — inclusive para os mapas que hoje passam.

### Degrau 2 — os 8 mapas da comunidade, um por vez, com o número a mover

Ordem por (dano medido ÷ custo). Mapas são arquivos disjuntos: **estes podem ir em paralelo**,
desde que ninguém toque `map_uv.js`, `textures.js` e `graffiti_layout.js` na mesma rodada.

| # | mapa | o número que tem que se mover | alavanca que já existe |
|---|---|---|---|
| 1 | `obras_prefeitura` | exp. spawn 89% · MAP5 99 m · 8 corpos dentro de sólido · 75,4% área sem textura | **PR #579** (abertura 58,9→23,6%) + textura |
| 2 | `penitenciaria` | visada 98,5 m · MAP5 20,6 m · CTF1 **0,00 m** (bandeiras em linha) · 14 corpos dentro de sólido | **PR #556** (passarelas a 5,8 m, 6 rotas) |
| 3 | `posto_treta` | **26 occluders** · MAP5 10,5 m · exp. 72/73% | **PR #586** (GLB, 3 draw calls) libera orçamento para props |
| 4 | `parque_treta` | **20 corpos dentro de sólido** · MAP5 17,4 m · 2 ângulos distintos | nenhum PR aberto — frente nova |
| 5 | `velho_oeste` | MAP5 99 m · h90 3,5 m · CTF1 **0,00 m** · **único mapa sem tema brasileiro** | nenhum PR; `codex/sertao-*` e `plans/22` já registram a sobreposição de tema |
| 6 | `atacadao_treta` | MAP5 14,1 m · 1 ângulo distinto · 60,8% área sem textura | **PR #582** (4 corredores, 3 rotas por spawn) |
| 7 | `upa_24h` | **52,2% da área sem textura** · 1 ângulo distinto · MAP5 8,6 m | nenhum PR — é o mapa 100% interno, o mais barato de texturizar |
| 8 | `piscina_treta` | o menos ruim do grupo: MAP5 5,4 m já passa | **PR #566** conclui o rework |

Regra de cada frente: **uma figura no tamanho em que ela é servida, olhada e descrita** (LEI 4),
e a nota final dada por um crítico de contexto limpo (`asset-review`), nunca por quem construiu.

### Degrau 3 — brasilidade medida, não declarada

Generalizar o `lajes-rooftop-check.mjs` para `brasil-check.mjs`, varrendo o registro:

- **BR1 · densidade de detalhe por quadrante**: caixa d'água, varal, antena/parabólica, botijão,
  grade, ar-condicionado, fiação, laje inacabada. Piso por quadrante, como no rooftop.
- **BR2 · céu regional obrigatório em mapa externo**: medido hoje, **os 7 mapas mais novos não
  tratam céu de forma nenhuma** — nem `setMapSky`, nem `applyLook`, nem `Sky(` (`posto`, `upa`,
  `obras`, `atacadao`, `parque`, `velho_oeste`, `penitenciaria`; a UPA é interna por desenho, o
  que deixa **6 mapas externos sem céu**). Os outros 10 usam um dos três caminhos.
- **BR3 · pixação/grafite**: o portão cobre 5–8 mapas; os da comunidade estão fora.
- **BR4 · tema**: `velho_oeste` é o único mapa sem lugar brasileiro (`map_velho_oeste.js:1`) —
  reautoria para sertão/cangaço resolve tema **e** a sobreposição já registrada em `plans/22`.

Insumo já pago e não usado: os 17 branches `map2/*` e `v21/*` carregam props, grafite e fauna.

### Degrau 4 — retenção por mapa (o pedido central: "os mapas têm que segurar o usuário")

O dado já é gravado e ninguém o lê. Entregar:

1. `GET /api/map-retention` (service_role, mesmo padrão fechado do `map-plays.ts`), devolvendo
   por mapa e por janela: partidas, **taxa de `quit`**, mediana de `p_seconds`, mediana de
   `p_rounds`, vitória/derrota.
2. Um painel interno mínimo (rota já protegida, como as outras leituras administrativas).
3. **O fecho do laço**: a fila do Degrau 2 passa a ser reordenada pelo mapa que mais perde
   jogador, não pelo mapa que mais incomoda quem está olhando. Hoje a ordenação do carrossel usa
   `picks_daily` (escolha), que mede curiosidade — não retenção.

**Aceite**: o primeiro relatório publicado cruzando `quit` × mapa, com N por mapa declarado.

### Degrau 5 — a comunidade como motor, e não como crachá

1. **Autoria vira dado no registro** (`maps.js`), consumida pelo jogo **e** pelo site; os 7
   mapas da comunidade que faltam entram em `src/data/jogo.ts` (hoje o site anuncia 10 de 17).
2. **Porta de entrada escrita**: seção em `CONTRIBUTING.md` + template de PR de mapa com o
   critério de aceite = as réguas do Degrau 1 (o contribuidor sabe o que vai ser medido **antes**
   de construir).
3. **O primeiro mapa JSON de verdade.** `map_json.js` já valida grafo conexo, aresta
   bidirecional e spawn jogável, já recusa spec inválido e já está no `check:fast` — falta um
   mapa real usando o caminho. É o que transforma "PR de código arriscado" em "abre um JSON".
4. **Corrigir o crédito**: `docs/LICENCA.md:96-103` reconhece só `daltonfontes`; Ubiracy Santos
   não tem um commit sequer e Emerson tem 3. Crédito na UI sem procedência no git é dívida de
   licença, não detalhe.
5. **Corrigir a documentação que mente**, porque nesta base ela é o defeito mais caro:
   `docs/lore-mapas.md:25-27` (diz que não existe mapa de autor externo), `docs/ROADMAP.md:94-107`
   (diz que "conteúdo como dado" não começou, com o loader mergeado desde o #223) e o bloco
   gerado do `AGENTS.md` + o cabeçalho do `KNOWN-BUGS.md`, que citam **`npm run check`** — script
   que **não existe** em `package.json` (só `check:fast`, `check:deploy`, `check:vm`, `check:web`,
   `check:seo`). O placar oficial do quality gate cita um comando que ninguém consegue rodar.

---

## 8. O que este plano respeita, e o que ele não faz

- **Não reduz arma no chão** em nenhum mapa (veto do dono).
- **Não afrouxa teto**: todos os números do Degrau 1 são lidos de réguas existentes; onde não
  havia número, o degrau manda **medir os 17 antes de cravar**, não chutar.
- **Não paraleliza sistema interconectado**: o paralelismo do Degrau 2 é por `map_*.js`, que são
  arquivos disjuntos; os três arquivos compartilhados ficam com um dono por rodada.
- **Não commita nada sem autorização** — este arquivo é o entregável desta rodada.

## 9. O que eu não verifiquei

- **Nada foi olhado em pixel nesta rodada**: não rodei captura nem browser. As afirmações
  visuais (textura, ângulo, escala) são as das réguas em node puro, não da figura. Pelo LEI 4,
  o Degrau 2 não fecha sem figura olhada e descrita.
- Não rodei `check:fast` inteiro nem o `portao-browser`; o placar vigente é o do cabeçalho do
  [`KNOWN-BUGS.md`](../../KNOWN-BUGS.md).
- Não abri, fechei, rebaseei ou mergeei nenhum PR, branch ou worktree. `tools/eval/map_check.json`
  foi regenerado para medir e **restaurado** ao estado da árvore em seguida.
- A telemetria foi lida no código (`src/pages/api/*.ts`); **não consultei o banco** — o volume
  real por mapa, e se há N suficiente, continua por medir.
