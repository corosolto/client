# Carandiru — reconstrução limpa sobre `main`

## Objetivo e escolha

- Worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/carandiru-main-r3`.
- Branch: `codex/carandiru-main-r3`.
- Base atualizada: `origin/main@7bb2707ef576260b30ceb88c5973b9f6618684cd` (`v2.0.0-alpha.261`). O checkpoint inicial nasceu em `dffcf1f581` (`alpha.255`) e foi integrado sem conflito.
- Mapa: id técnico `penitenciaria`, identidade pretendida **Carandiru**.
- Prioridade: o inventário do PR #538 mede a pior densidade visual e custo de cena do grupo legado; o teste humano mais recente relatou escadas da muralha e guaritas inacessíveis e janelas suspensas no pavilhão. Obras, Parque, Atacadão, Posto, Piscina, Quebrada, Ferro Velho, Loja H e Córrego já têm candidatos atuais em draft; a UPA pertence a outra lane.
- Origem a preservar: builder original do Emerson Garrido e reautoria estrutural válida do PR #556. A nova lane extrai somente geometria, navegação, identidade procedural e gates que funcionem sobre a `main` atual.

## Restrições

- Somente `public/js/map_penitenciaria.js`, gates específicos e este dossiê.
- Sem runtime, materiais compartilhados, registro global de mapas, áudio compartilhado, Mint/Astra, assets privados, merge, deploy ou force-push.
- O asset Mint do PR #556 não entra: a própria descrição registra termos comerciais ainda pendentes. O mapa deve funcionar e manter identidade com geometria procedural e assets locais já licenciados.
- Aprovação visual humana não será presumida.

## Baseline na `main`

Comandos: `npm run eval:penitenciaria`, `node tools/eval/map-check.mjs penitenciaria`, `node tools/eval/botsim.mjs 20 penitenciaria` e `node tools/eval/ctf-win-check.mjs penitenciaria`.

- A régua antiga PEN1–PEN5 fica verde, mas não mede os defeitos relatados.
- MAP1 encontra 14 corpos dentro de sólido, com pior penetração de 1,02 m.
- Exposição de spawn: E 79,3% e B 76,1%; visadas máximas de 97,4 m e 98,5 m.
- MAP5: pior espaçamento sem cobertura de 20,60 m, acima do teto de 7 m; pior razão de props 0,12× da mediana.
- CTF1: três pontos colineares, altura do triângulo 0 m.
- CTF2 encontra quatro rotas no grafo térreo, mas isso não demonstra acesso à muralha, às guaritas ou ao pavimento superior.
- Botsim de 20 s: `stuckPct=3,311`, `eff=0,887`, `laneSpread=0,64`.
- O CTF encerra corretamente na terceira e última bandeira.

## Definição de pronto

- Quatro acessos reais do piso à muralha, quatro passarelas, quatro guaritas de canto e duas torres centrais alcançáveis em ida e volta.
- Pavilhão central oco no térreo, pavimento superior alcançável e janelas com parede, peitoril, verga, piso e posição de tiro.
- Três decisões de rota por spawn ligadas ao MID, cobertura contra linhas longas e CTF não colinear.
- Identidade de instituição prisional paulista dos anos 1990 por composição procedural local, sem pessoa real, gore ou marca.
- 5×5 e 8×8, DM e CTF, bots, mutantes causais, performance e matriz Chrome/WebGL2 em 3:2 e 16:9.
- Capturas inspecionadas por esta lane e crítica adversarial independente antes da promoção do draft.

## Entrega map-local

- A composição agora identifica fisicamente a **Casa de Detenção / Carandiru** e o **Pavilhão 6**, com pátio, alas, reboco gasto, tijolo aparente, grades, arame, marcações de quadra e uma viatura procedural. Nenhuma malha externa foi adicionada.
- Quatro escadas contínuas ligam o piso às passarelas da muralha. As quatro guaritas de canto e duas torres centrais têm entradas e rotas registradas.
- O Pavilhão 6 é oco: possui passagens norte–sul e leste–oeste, escada interna, galeria superior e 12 janelas inseridas em paredes reais, com piso, peitoril e posição de tiro.
- As rotas `radial-interna`, `externa-oeste` e `muralha-leste` ligam cada spawn ao MID. O MID do CTF foi deslocado para formar triângulo com altura de 8 m.
- O grafo de bots descarta 11 amostras de um bolsão decorativo fisicamente fechado atrás das alas, em vez de criar uma ligação falsa através da parede; os 1.229 nós jogáveis restantes formam um único componente.
- Sessenta e quatro coberturas baixas instanciadas fecham os vazios próximos aos spawns sem bloquear as três rotas. A pior lacuna do MAP5 caiu de 20,60 m para 6,64 m e a razão de props subiu de 0,12× para 0,54×.
- A ambiência cria três animais locais (um rato e dois pombos), com os tipos já pré-carregados para o mapa, três loops já existentes (`vento`, `hum`, `cidade`) e fachos móveis nas torres. O corte de 11 para três preserva as duas leituras de fauna e reduz o custo de triângulos.

## Régua causal

`node tools/eval/carandiru-main-r3-check.mjs` mede a cena e os colliders reais:

- CR3-1: identidade, procedência e ausência de asset privado/Mint.
- CR3-2: quatro acessos, quatro passarelas e seis entradas/rotas de guarita.
- CR3-3: duas passagens, escada/galeria e 12 janelas sustentadas no Pavilhão 6.
- CR3-4: três famílias de rota e CTF não colinear.
- CR3-5: cobertura entre spawn e centro e contrafogo às posições elevadas.
- CR3-6: fauna e loops de ambiência.

O self-test exige a cláusula exata para nove mutantes de mundo: `sem-identidade`, `fecha-escada`, `fecha-guarita`, `pavilhao-solido`, `janela-suspensa`, `rota-unica`, `ctf-colinear`, `spawn-exposto` e `sem-ambiencia`. Resultado: **9/9 contraprovas rejeitadas**; não há autoatestação por regex.

## Validação técnica

Comandos reexecutados em 22/09/2026 sobre a base `alpha.261`:

```text
npm run syntax                                                    PASS
npm run build                                                     PASS
npm run eval:penitenciaria                                       PASS
node tools/eval/carandiru-main-r3-check.mjs                       PASS (CR3-1..6)
node tools/eval/carandiru-main-r3-check.mjs --selftest-mutantes   PASS (9/9)
node tools/eval/carandiru-browser-matrix.mjs --self-test          PASS
node tools/eval/ctf-win-check.mjs penitenciaria                   PASS (3ª bandeira encerra)
npm run eval:mapcontrato -- --map penitenciaria                  PASS (1.229/1.229 conectados)
```

`npm run check:deploy` fechou **39/40** depois da atualização dos blocos de documentação gerados. A única falha é `eval:redesign` / UIR15 (`resultado usa exclusivamente arte estática do personagem atual`), herdada da `main` e fora do diff deste mapa: a lane não altera `public/js/game.js`, CSS/DOM de UI, `src/pages/index.astro` nem a régua de redesign.

O `map-check` confirma MAP2B (2,85 m / 69,6 m²), MAP4 (zero oclusores invisíveis), MAP5 (6,64 m / 0,54×), CTF1 (8 m) e CTF2 (quatro rotas entre todos os pares). A leitura genérica MAP1 ainda acusa 40 interseções não submersas, pior profundidade 1,133 m; parte vem de superfícies baixas transitáveis/escadas porque a régua empilha `groundHeightAt` sem `yRef`. A exposição genérica ficou E 62,2% e B 55,2%, melhor que o baseline, mas ainda alta. Esses dois pontos permanecem dívida declarada, sem mascarar a saída.

Botsim de 20 s após a compactação do grafo: `stuckPct=3,078`, melhor que 3,311 do baseline; `laneSpread=0,64` foi preservado; `eff=0,829` ficou abaixo do baseline 0,887.

## Chrome/WebGL e A/B

A matriz real entra pelo menu e cobre `3:2/16:9 × 5x5/8x8 × DM/CTF`. As oito células usaram WebGL2 por hardware, qualidade média, 9/15 bots reais, zero frame acima de 100 ms e zero dívida inesperada. A allowlist é explícita para os 404s locais de áudio/geo e CORS do backend; o self-test prova falha para `pageerror`, console, HTTP, request failure e teto de performance desconhecidos.

A execução usou o harness Playwright/WebGL do próprio repositório com Chrome real. O binário `agent-browser` não estava disponível neste ambiente; essa ausência não foi tratada como evidência, e a matriz abaixo é o recibo substituto verificável.

| Caso | p95 ms | calls | tris |
| --- | ---: | ---: | ---: |
| 3:2 5x5 DM | 9,1 | 892 | 920.827 |
| 3:2 5x5 CTF | 9,8 | 890 | 920.851 |
| 3:2 8x8 DM | 9,1 | 946 | 1.068.065 |
| 3:2 8x8 CTF | 9,1 | 946 | 1.067.111 |
| 16:9 5x5 DM | 9,1 | 897 | 919.393 |
| 16:9 5x5 CTF | 9,2 | 899 | 923.271 |
| 16:9 8x8 DM | 9,9 | 953 | 1.063.696 |
| 16:9 8x8 CTF | 9,9 | 955 | 1.066.524 |

O A/B arquivado em DM contra `origin/main@dffcf1f581` mostrou draw calls 27%–33% menores, triângulos 21%–25% maiores e p95 equivalente. A `main@7bb2707ef` conserva o mesmo arquivo de mapa baseline (hash `0c7759794db25f0a639ac5bd604e96ed11152029a76718fabe2fa3eb8ea2acaf`), mas o aceite atual usa a matriz completa acima após a atualização do runtime. A primeira amostra 3:2/5x5/CTF teve um único quadro transitório acima de 100 ms; a célula foi repetida isoladamente e passou com zero pausas. Hash atual do candidato: `28c2e5fee3fde420511bcedfb91d4307012cd4829db3870504c8b4087d2c6e0b`.

Recibos ignorados pelo Git ficam em:

- `artifacts/carandiru-main-r3/webgl-matrix/matrix.json` — matriz final 8/8.
- `artifacts/carandiru-main-r3/baseline-main/matrix.json` — A/B da `main`.
- `artifacts/carandiru-main-r3/evidence/captures.json` — manifesto das 14 capturas e hashes.

## Revisão visual

Foram inspecionadas 14 capturas reais, sete enquadramentos em cada proporção. As duas escadas da muralha mostram degraus contínuos até a abertura superior; a galeria mostra piso, paredes e janelas sustentadas; o enquadramento elevado mostra a hierarquia do pátio, Pavilhão 6, muralhas e coberturas. A viatura é procedural e funcional como leitura de cena, mas ainda tem acabamento simples. A aprovação visual/jogável do proprietário continua pendente.

URL local do candidato:

`http://127.0.0.1:8210/?debug=1&auto=E,mst&map=penitenciaria&perfilauto=0`

## Dívidas e fronteiras

- A raiz map-local agora se chama `carandiru`, e toda a geometria/identidade interna usa Carandiru. O seletor, descrição e minimapa ainda exibem “Penitenciária da Treta”; essas strings vivem em registros compartilhados (`maps.js`/`main.js`) e a troca global foi deliberadamente deixada fora desta lane map-local.
- A dívida genérica MAP1/exposição e a queda de eficiência do botsim estão registradas acima e precisam de teste humano antes de promoção.
- A crítica adversarial independente não foi executada: as quatro vagas de agentes estavam ocupadas pelas lanes prioritárias. Ela continua sendo gate de promoção, junto com o playtest humano.
- O gate agregado de deploy está em 39/40 pela falha herdada de redesign UIR15 descrita acima; corrigir essa UI compartilhada nesta lane violaria a fronteira map-local.
- Não houve consumo de Mint/Astra nem inclusão de assets privados. O PR #556 permanece como fonte histórica; esta branch não o carrega como stack.
- Merge, deploy e aprovação visual humana não fazem parte desta entrega.

## Estado

Implementação, régua causal, build, CTF, bots, matriz WebGL e capturas concluídos na `main@alpha.261`. O draft pode ser aberto com a promoção bloqueada por aprovação visual/jogável humana e por crítica adversarial independente.
