<!-- Recibo da rodada de conserto de 13/09/2026. Índice: ../RODADA-CONSERTO.md -->

# réguas (D1–D4 de instrumento) — recibo

## Aplicado

| item | arquivo:linha | o que entrou |
|---|---|---|
| **1. MAP4 ciente de instância** | `map-check.mjs:715-720` (pulo) + `:721-763` (laço por instância) | `isInstancedMesh` saiu do `continue` de `occPulados`. Cada instância é medida na matriz de mundo dela (`getMatrixAt(i, mW)` × `matrixWorld`, `premultiply`), MESMA tolerância 0,35 m, MESMO passo 0,5 m, MESMAS faces laterais. Pulo mantido só para não-Mesh, sem geometria e `userData.proxyGLB`. Caixa da instância reprovada vem de `geometry.boundingBox × mW` (não do AABB do lote inteiro) e o registro ganhou o campo `instancia` |
| 1b. contadores e doutrina | `map-check.mjs:107-122`, `:930-937`, `:947-951`, `:811` | `occInstanciados`/`occInstancias` no JSON e na linha impressa; comentário de topo e `criterios.map4` dizem que instância é occluder, com o número que o conserto moveu |
| **2. `texel-check` pula malha invisível** | `texel-check.mjs:345-355` (`invisivel()`) + `:369-370` (o pulo) | Critério COMPARTILHADO, não copiado: material escolhido com `visible === false` é o mesmo teste do SUP1 (`mapa-novo-gate.mjs:354`), e `userData.proxyGLB` é testado na CADEIA de ancestrais como em `occluder-ray-check.mjs:184`. Área pulada entra no JSON (`invisiveis`, `areaInvisivel`) e numa linha de diagnóstico — o pulo é auditável, não silencioso |
| 2b. TEXEL7 | `texel-check.mjs:502-517` | Cláusula que guarda o pulo: se malha invisível voltar para a conta, reprova com o número e o porquê. É a asserção do mutante e o alarme contra o pulo ser apagado em silêncio (foi assim que `SUP2:fy_lajes` andou de 17,2% para 27,9% sem ninguém ver) |
| **3. MAP7 — occluder não pode ser Group** | `map-check.mjs:163-198` (doutrina + dívida), `:204-222` (registro→arquivo lido de `maps.js`), `:225-270` (varredura de fonte), `:767-780` (varredura de mundo), `:996-1044` (veredito) | DUAS pontas. **Mundo**: varre `world.occluders` de cada mapa do registro e acusa o que não é Mesh com geometria, dizendo quantas malhas o Group esconde da bala. **Fonte**: varre os `map_*.js` do registro (arquivo por mapa PARSEADO de `maps.js`, nunca lista à mão) procurando `occluders.push(<ident>)` cujo identificador vem de `placeProp`/`new THREE.Group`. A ponta de fonte não é luxo: em node `placeProp` devolve `null`, então `map_obras.js:79` e `map_posto.js:116` são INVISÍVEIS para a ponta do mundo e é no navegador que eles apagam ~60 props cada |
| 3b. sítio que só o runtime decide | `map-check.mjs:259-265` | Sítio inclassificável na fonte (iteração de cena, param de helper) sai na lista com `arquivo:linha` e é DECIDIDO pela ponta do mundo do mesmo mapa; se o mapa não sobe, ninguém mediu e é VERMELHO |
| 3c. cláusula no portão | `invariants.mjs:1964-1994` | `put('MAP7', …)` consumindo `occluderSemGeometria` + `occluderGrupoFonte` do JSON, com o teto lido do próprio JSON (`map7Divida`) — teto compartilhado, não copiado |
| 3d. evidência da MAP4 corrigida | `invariants.mjs:1946-1957` | O rótulo dizia "N proxy de GLB pulado" e agora os pulos incluem Group; passou a dizer o que é, e a evidência mostra instâncias medidas e `inst#` do infrator |
| **mutantes** | `map-check.mjs:55-60`+`:317-336` · `:199`+`:338-354` · `texel-check.mjs:86-101`+`:585-600` | `--mutante=instancia-vazada`, `--mutante=occluder-grupo`, `--mutante=proxy-contado`. Todos com asserção de APLICAÇÃO (lançam "NAO APLICOU" se o alvo mudou de forma) |

## Medido (sonda própria, antes → depois)

**A/B limpo de INSTRUMENTO** (mesmo estado de código, execuções consecutivas, `fy_corrego`):

| métrica | antes | depois | esperado na receita |
|---|---|---|---|
| `occMedidos` | 108 | **672** | 672 ✓ |
| `occPulados` | 62 | **0** | 0 ✓ |
| `fracSemMalha` | 0,0037 | **0,0021** | 0,0021 ✓ |
| `occluderSemMalha` | 0 | 0 | 0 instâncias reprovando ✓ |
| custo | 11,6 s | 18,1 s | — |

**O que o instrumento passou a olhar em todo o acervo** (sonda `/tmp/probe-occ-grupo.mjs`, estado final): **116 `InstancedMesh` = 1.019 instâncias** em 4 mapas que a régua antiga pulava inteiras — `fy_corrego` 79/683, `atacadao_treta` 20/94, `praca_poderes` 15/204, `obras_prefeitura` 2/38. `praca_poderes` tinha 11 occluders pulados no baseline de 12/09 e hoje mede 204 instâncias.

**SUP2 do `fy_lajes`** (A/B pelo mutante, que É o comportamento antigo, mesmo estado de código): **21,37% → 1,08%**. As 22 caixas invisíveis são **3.886 m²** (o número exato da receita) = **96% de toda a área sem textura** do mapa. Não bateu o 27,9% → 8,6% previsto porque o `FixLajes` já texturizou madeira/zinco/porta hoje: a área chapada tinha caído de 5.124 m² para 4.048 m² antes de eu medir, então o pulo leva a 1,08% em vez de 8,6%.

**Efeito colateral do pulo em todo o acervo** (17 mapas, com e sem o mutante): move só `fy_lajes` (21,38 → 1,08%) e `fy_corrego` (1,88 → 0,91%); `fy_campomorro` 0,05 → 0,06% (26 proxies saem do denominador). Os outros 14 idênticos. `mediana`, `p05`, `p95`, `dispersaoP95`, `dispersaoMax`, `anisoRuim`, `borrados`, `superficies` e `areaEstrutural`: **iguais dígito a dígito**, e o conjunto de 43 cláusulas vermelhas pré-existentes é **idêntico** antes e depois (diff vazio) — o pulo toca só a conta de área sem textura. Consumidor conferido: `corrego-superficie-check` VERDE, 0,9% de 20.832 m² (era 1,88%).

**MAP7, estado medido:** nasceu com 8 dívidas (mundo `velho_oeste` 11 Groups escondendo ~120 malhas, `penitenciaria` 1; fonte `map_obras.js:79`, `map_posto.js:116`, `map_upa.js:94`, `map_atacadao.js:65` e `:66`, `map_velho_oeste.js:308` e `:328`, `map_penitenciaria.js:200`). Os 6 mapas receberam o `occMesh` nesta rodada — `map_posto.js:127` e `map_atacadao.js:122` já estavam consertados quando escrevi a cláusula; obras/UPA/penitenciária caíram durante a minha execução; o velho_oeste foi o último, depois de eu nomear as duas linhas para o `FixVelhoOeste` (occluders **67 → 339**, 0 Group). **Estado final: 0 Group em 17 mapas, 0 push de Group em 17 arquivos, `MAP7_DIVIDA` VAZIA — teto zero em todo o registro.** Sobram 9 sítios de fonte que só o runtime decide, todos em mapa que sobe e mede 0.

**MAP4 depois da mudança, 17 mapas:** 0 occluder sem malha visível em todos. Nenhum mapa virou vermelho. `map-check all`: 110 s (3 min na execução anterior, variação do que os builders acrescentaram).

## Mutantes provados (saída colada)

**1. `--mutante=instancia-vazada`** — injeta um `InstancedMesh` invisível (3 cubos de 1,2 m) a 40 m dos spawns e o registra em `occluders`. Ciclo completo no código entregue:
```
=== [A] normal: atacadao_treta ===
  MAP4 0 occluder(s) sem malha visível de 237 medidos (0 pulados, 105 instância(s) de 20 InstancedMesh)   exit=0
=== [B] --mutante=instancia-vazada ===
  MAP4 3 occluder(s) sem malha visível de 240 medidos (0 pulados, 108 instância(s) de 21 InstancedMesh) | 100% vazio até y 40.5 m em [5.4 39.4 -37.6 6.6 40.6 -36.4] inst#0 · … inst#1 · … inst#2
  MUTANTE instancia-vazada mordido: os 1 mapa(s) acusaram a instância vazada a 40 m (atacadao_treta 3/240)   exit=1
=== [C] volta ao normal ===
  MAP4 0 occluder(s) sem malha visível de 237 medidos   exit=0
```
E o DISCRIMINADOR, que é o que prova que a cláusula nova é o que mordeu — reconstruí a régua ANTIGA (só devolvendo `oc.isInstancedMesh` ao `continue`) e rodei o mesmo mutante:
```
  MAP4 0 occluder(s) sem malha visível de 111 medidos (98 pulados, 0 instância(s) de 0 InstancedMesh)
  MUTANTE instancia-vazada SOBREVIVEU em 1 mapa(s): fy_corrego(medidos 111, pulados 98) — a MAP4 voltou a pular InstancedMesh
```
A instância vazada sai contada como "pulada" e a régua antiga fica VERDE.

**2. `--mutante=occluder-grupo`** — duas pontas num flag: empurra um Group de 3 malhas para `world.occluders` e desfaz, EM MEMÓRIA, o idioma `occMesh` de `map_quebrada.js:99` (com asserção de que o replace aplicou):
```
=== NORMAL (teto zero, sem anistia) ===
MAP7 mundo: 0 occluder(s) sem geometria em 1 mapa(s) medido(s) | fonte: 0 push de Group em 17 arquivo(s) do registro   exit=0
=== MUTANTE occluder-grupo ===
MAP7 mundo: 1 occluder(s) sem geometria | fonte: 1 push de Group em 17 arquivo(s)
MAP7 FALHA: 2 item(ns) acima do teto declarado. Occluder é MALHA, nunca Group — o conserto é uma linha: `o.traverse(m => { if (m.isMesh) occluders.push(m); })` (map_brasilia.js:584, map_quebrada.js:99). Sem isso o prop não para bala nem LOS de bot (game.js:3310, :5914, :6445, :6953). velho_oeste: 1 occluder(s) sem geometria [teto 0] — Group[mutante-grupo-sem-geometria] (-9,-38) esconde 3 malha(s) | map_quebrada.js: 1 push de Group na fonte [teto 0] — map_quebrada.js:99 occluders.push(o) <- :99 const o = placeProp(…)
MUTANTE occluder-grupo mordido: o Group injetado no mundo e o occMesh desfeito na fonte ficaram VERMELHOS   exit=1
```

**3. `--mutante=proxy-contado`** (texel-check):
```
=== NORMAL ===
  · fy_lajes: 22 malhas INVISÍVEIS (3886 m², 20.5% da superfície) fora da conta — (anon) [proxyGLB] 312 m², …
  (TEXEL7 não aparece)
=== --mutante=proxy-contado ===
  · fy_lajes: 22 malhas INVISÍVEIS (3886 m²) DEVOLVIDAS à conta pelo mutante
  ✗ TEXEL7 fy_lajes: 3886 m² de malha INVISÍVEL entraram na conta de superfície (22 malhas…). Isso põe a área sem textura em 21.4% — o SUP2 do mapa-novo-gate passa a cobrar textura de superfície que ninguém desenha e ninguém vê.
  · MUTANTE proxy-contado mordido: 3886 m² de malha invisível voltaram para a conta e a TEXEL7 reprovou.   exit=1
=== mutante desconhecido ===
✗ TEXEL: mutante desconhecido "xxx". O único desta régua é proxy-contado.   exit=2
```

`node --check` OK em `map-check.mjs`, `texel-check.mjs` e `invariants.mjs` depois de cada bloco. Nada commitado.

## Não aplicado (e por quê)

- **D3 (fazer GLB carregar em node)** — fora do meu escopo e é frente própria. A consequência dele eu tratei onde dava: a ponta de FONTE do MAP7 existe justamente porque a ponta do mundo é CEGA para o Group de `placeProp` em node.
- **Remover `SUP2:fy_lajes` da lista de dívidas do `mapa-novo-gate.mjs:204`** — o portão já imprime `QUITADAS (5) … REMOVA a entrada: ✓ SUP2:fy_lajes` (medido 1,08% contra teto de 6%), mas o `FixLajes` ainda está pondo massa no mapa. Apagar a entrada agora é apostar no número de um mapa que está mudando; é reconciliação de fim de rodada, do Main.
- **Anistia no MAP7** — não precisou: os 6 mapas foram consertados hoje. O mecanismo de teto por mapa/arquivo ficou no código, documentado, com a regra de nunca subir teto para acomodar Group novo (cheguei a declarar teto 11 para o velho_oeste e a recusar subir para 15 quando ele regrediu para 15; o builder consertou).
- **Entrada `MAP7` no `KNOWN-RED.json`** — criei enquanto o velho_oeste estava vermelho e APAGUEI quando ele ficou verde. O arquivo está byte a byte igual ao HEAD (`git diff --exit-code` limpo).

## Pedido ao Main (arquivo compartilhado)

1. **`tools/eval/map_check.json` ficou REESCRITO** (17 mapas, `gerado 2026-09-13T09:19:26Z`, com os campos novos `occInstanciados`/`occInstancias`/`occluderSemGeometria`/`occluders` e as chaves de topo `occluderGrupoFonte`/`map7Divida`). Cópia do estado anterior em `/tmp/map_check.json.antes-FixReguas`. **Ele já está VELHO**: a cláusula de frescor do `mapa-novo-gate.mjs` reprova porque `map_posto.js` foi salvo 2 min depois (`map_check.json é MAIS VELHO que map_posto.js`). Quem fecha a rodada tem que rodar `node tools/eval/map-check.mjs all` DEPOIS do último builder — não tem como eu deixar isso pronto.
2. **Vermelhos do `map-check all` que NÃO são meus** (estado 09:19): `CTF2` 11 pares (praca_poderes 4, obras_prefeitura 6, parque_treta 1), `MAP6` 21 bordas (é a dívida `JOG2:loja_h` do KNOWN-RED) e `MAP1` 1 ponto no `fy_mansao` — este último está igual no baseline de 12/09 (`fy_mansao 1, pior 0,9 m`). O MAP4 e o MAP7 estão VERDES nos 17.
3. **Eu sujei 4 artefatos e limpei**: rodar `node tools/eval/invariants.mjs` reescreve `char_probe.json`, `mat_check.json` (−40.627 linhas), `mat_scenes.json` e `vm_kick_sim.json` como efeito colateral. Restaurei os 4 com `git checkout --` (cópia do que saiu em `/tmp/FixReguas-artefatos-colaterais/`); `git status` em `tools/eval/` só mostra o que é meu. Vale avisar os outros: `invariants.mjs` NÃO é read-only.
4. **`tools/eval/escala-favela-check.mjs` está modificado e não é meu** — alguém (pelo diff, o Córrego) acrescentou 6 classes de prop à `FAIXA_PROP` com comentário e faixa medida. Parece legítimo, só não passou por mim.
5. **Alerta que eu já mandei pelos canais:** `FixParque` teve `parque_treta` sem subir por ~8 min (`aoMatFactory is not defined`) — e um único mapa com `err` derruba JUNTAS as cláusulas MAP1/MAP2B/MAP4/MAP5/MAP7/CTF2 do `invariants.mjs`, porque todas usam `!erros.length`. Já consertado por ele (`@@BOOT OK colisores 160 malhas 287`), mas esse acoplamento é uma régua que falta: mapa que não sobe deveria reprovar SOZINHO, com nome, em vez de pintar seis cláusulas de vermelho.

## O que exige figura

- **Nada do que eu mexi muda pixel** — as três mudanças são de instrumento (o que a régua olha), não de mapa. Não pedi nem preciso de captura para elas.
- **O que passou a exigir figura por causa da correção alheia que a minha régua provocou:** com `occMesh` em 6 mapas, a bala passa a parar na lataria dos ~60 props GLB de cada um (posto, atacadão, obras, UPA, penitenciária, velho oeste: occluders 67 → 339 só no último). É a mudança de jogo mais sentida da rodada e ela não aparece em número nenhum meu — exige partida jogada, não figura parada.
- **`fy_lajes` com o SUP2 em 1,08%:** o número agora diz que o mapa está texturizado, e 3.886 m² dele são corpo invisível. Se a figura mostrar fachada chapada, o vermelho certo é o TEXEL1/TEXEL3 (mediana 536 px/m, dispersão 42×, 72 superfícies com anisotropia 1) — que estão vermelhos desde antes de mim e continuam vermelhos.
