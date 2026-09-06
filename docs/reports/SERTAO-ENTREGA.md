# Sertão — entrega local para revisão adversarial

Esta etapa reconstrói o casario aberto, corrige bloqueios invisíveis e dá ao Sertão uma paisagem contínua, mantendo coordenadas de objetivos e pickups. A crítica visual independente da iteração anterior aos ajustes finais chegou a **7/10, apto para revisão humana**, com refinamentos restantes. Depois houve correção de oclusão sem mudar a imagem e deslocamento de um barril, inspecionado pelo responsável; não foi atribuída nova nota independente. Isso não aprova publicação, equilíbrio competitivo completo ou procedência de todo o acervo herdado.

## Branch, origem e integração

- Worktree exclusiva: `/Users/ruben/csbrasil/worktrees/sertao-astra`.
- Branch de entrega: `codex/sertao-astra`; iteração estética de referência em `22d5458e`, seguida por oclusão em `2f76b255` e deslocamento do barril CTF em `486cc3cd`.
- Origem: `49441895bebdfa328a228de142d0015b4597db9f`, head do [PR445](https://github.com/corosolto/client/pull/445), `map2/velho-oeste`.
- Conferência remota final: PR aberto, head inalterado, base `feat/times-e-mapas-completo`, `CONFLICTING/DIRTY`. Checks remotos antigos não foram aceitos como validação desta entrega.
- Não houve push, PR novo, merge ou deploy. Os commits locais são a alternativa de integração autorizada pelo dono. Integração futura deve usar PR de `codex/sertao-astra` contra `map2/velho-oeste`, sem force-push, após revisão.
- Outras worktrees e branches foram apenas identificadas por `git worktree list`; nenhuma recebeu edição, checkout, reset ou limpeza.

## Diagnóstico antes/depois

| Área | Antes, observado nos PNG e no runtime | Depois e limite |
|---|---|---|
| Arquitetura | Pau-a-pique aberto como armação de western, venda de madeira | Cinco casas de taipa fechadas e duas vendas rebocadas; telhas instanciadas, venezianas, rodapés, porta e potes. Três casas GLB preservadas. Acabamento autoral ainda mais regular que o GLB. |
| Identidade | Tumbleweeds, cactos sobre bases repetidas, madeira dominante | Tumbleweeds removidos; mandacaru autoral em três variantes, juazeiro com folhas, forró com bandeirolas e banco. Carroças/feno mantidos como cobertura rural. |
| Luz e horizonte | Dominante laranja, costura do céu, fim do plano no vazio | Céu contínuo, luz quente menos saturada, solo e terreno com material comum, camadas de vegetação exterior. Entorno ainda pouco denso e rochas facetadas. |
| Materiais | Trama de taipa estampada e solo com padrões evidentes | Reboco sem trama repetida; albedo existente de terra com mistura de amostras e gradientes explícitos. Emenda fina e repetição residual permanecem visíveis em alguns ângulos. |
| Física | Alpendres bloqueados por caixas invisíveis; igreja com colisor excessivo; yaw não chegava ao grupo GLB | Postes finos físicos, varandas transitáveis, igreja com footprint observado, OBB coerente com rotação. |
| Rotas/spawns | Busca espacial não encontrava três testemunhas disjuntas; spawns visíveis entre si | Três rotas com travessia real, quatro abrigos de spawn sem deslocar pontos. Métricas de LOS têm limites documentados abaixo. |
| Microvida | Plantas rolantes alteravam colisores | Calangos e tecidos animados sem mudar colisores. Áudio de natureza recuperado; sanfona ausente. |

A pesquisa orientou paredes fechadas de taipa, telha cerâmica, reboco creme/ocre, rodapé verde, vegetação irregular e uso rural. Fotografias e candidatos Sketchfab, incluindo rejeições por licença, estão em `SERTAO-REFERENCIAS.md`. Nenhum modelo novo do Sketchfab foi baixado ou integrado. A pesquisa de candidatos não equivale a aprovação de licença dos modelos herdados.

## Capturas reais e inspeção

Raiz de artefatos: `/Users/ruben/csbrasil/worktrees/sertao-astra/artifacts/sertao-astra/` (ignorados pelo Git; permanecem disponíveis localmente).

- `review.html`: comparador interativo antes/depois, sete câmeras, sem retoque. Verificado no navegador:14 imagens carregadas em1536×1024 e slider funcional, sem erros; `gallery-check.json`.
- `before/`: baseline49441895; sete PNG e `capture.json`.
- `after/`: sete PNG atuais, `report.json`; FOV70,1536×1024, Chrome/ANGLE Metal AppleM4Pro. As sete câmeras foram examinadas pelo responsável durante a revisão. A crítica independente deu7/10 às imagens anteriores ao agrupamento de meshes (menos cinco calls, mesmas matrizes), à correção de oclusão (sem alteração visual) e ao deslocamento do barril. O ajuste final do barril foi inspecionado pelo responsável na captura CTF B, sem nova nota independente.
- Câmeras: praça, venda, poço, forró, leste, sul e aérea. `ctf-evidence/ctf-b.png` acrescenta a visão real do objetivo B após deslocar o barril. A aérea serve à inspeção espacial, não representa a câmera de combate.
- `visual-manifest.json`: caminhos, tamanhos e SHA256 dos PNG, com identificação das versões de runtime e régua.
- `game-evidence/`: compositor e HUD reais com personagens GLB das duas equipes. A composição é controlada e não mede FPS. O personagem verde tem contraste menor que a Gotinha branca; dois enquadramentos não aprovam todo o elenco em todas as distâncias.
- `traversal/report.json`: trajetórias e três capturas da circulação real. `traversal-barreira/`: contraprova com barreira.
- `SERTAO-CRITICA-BASELINE.md`, `SERTAO-CRITICA-FINAL.md` e `SERTAO-CRITICA-R2.md` preservam iterações rejeitadas; a avaliação mais recente está no final de `SERTAO-CRITICA-R4.md`.

Sertão possui o look de tarde, sem variante própria de noite registrada. Não foi inventado ciclo dia/noite para cumprir uma captura; a validação noturna não se aplica a esta configuração.

## Orçamento e movimento

Orçamento do passe mapview: teto503 calls,368209 triângulos e99 texturas, derivado do baseline com folga de15% apenas em tris/texturas. O teto não é uma promessa de FPS. Folhagem/microdetalhes novos não lançam sombras caras; repetidos usam instancing. Céu procedural1024×512 RGBA usa2MiB antes de overhead. Nenhuma textura externa nova foi baixada.

| Máximo nas mesmas sete câmeras | Antes | Depois |
|---|---:|---:|
| Draw calls, mapview |503|482|
| Triângulos, mapview |320181|277033|
| Texturas residentes, mapview |86|84|
| Geometrias residentes, mapview |117|184|

Inventário real de `world.root`, em `scene-budget.json`: meshes502→481, materiais40→67, objetos que lançam sombra351→228, maior dimensão de textura1024px nos dois Sertões. Depois há32InstancedMesh com4101instâncias. Referência LojaH:295meshes,157materiais,46lotes/441instâncias,167casters e maior textura1696px; cada mapa distribui custo de forma diferente. Orçamentos de revisão desta etapa: não ultrapassar502meshes/351casters do baseline nem introduzir texturas acima de1024px sem nova medição. Esses inventários são auditoria, enquanto RV3 aplica os tetos de calls/tris/texturas automaticamente. O sol continua com shadow map2048². Oclusores efetivamente utilizáveis pelo jogo no browser:24Mesh+67Groups antes,379Mesh e zeroGroups depois.

Há **aumento de geometrias e memória**, apesar da redução de calls/tris. Não apresentar instancing como melhoria universal de memória. O mandacaru autoral soma11092 triângulos, contra97700 dos vinte GLBs substituídos. Copa/exterior somam33440 diante do limite33696; quatro draws externos. Contagens estruturais são do harness e não devem ser somadas ao renderer sem considerar passes/culling.

Partidas reais de30s em1536×1024, qualidade média, sete bots, todos os passes do compositor. Comparação controlada usa os mesmos sete personagens e AWP para todos, alterando somente o sorteio no instrumento de benchmark; o arquivo de jogo não foi modificado. Relatórios `motion-{before,after,reference}-controlled-*/report.json`.

| Ensaio controlado | p50 / p95, ms | Calls médios | Triângulos médios | Heap final, MB decimais |
|---|---:|---:|---:|---:|
| Sertão anterior |8.3 /9.7|664.64|701464|78.41|
| Sertão depois |8.3 /9.6|566.91|501205|89.24|
| Loja H, referência pesada existente |9.3 /15.8|602.49|1712661|87.79|

O elenco coincide, mas combate, mortes, trajetórias e enquadramentos variam: isso não é um benchmark determinístico de GPU nem prova de ganho causal de FPS. Também não certifica que Loja H foi aprovada por humano. Não houve outra medição GPU desta tarefa em paralelo; o host tem outras frentes e não foi isolado delas.

A série ABBA com armas/personagens sorteados registrou p95 antes11.4/10.6ms, depois10.1/10.3ms e LojaH14.3ms. A primeira série histórica, menos controlada, registrou piora14.5→19.2ms; foi preservada e motivou os novos ensaios. Todos os logs permanecem no diretório, sem seleção só dos melhores resultados. O resultado atual sustenta ausência de regressão importante neste Mac; não cobre GPU fraca, mobile ou partida multiplayer remota.

Amostra final após o barril ser deslocado, sobre o produto486cc3cd: **p50=8.3ms, p95=10.0ms**, sete bots,30s e76.0m percorridos, sem erros. Calls médios598.30, triângulos médios506814 e heap96.68MB. Arquivo `motion-final-controlled-velho_oeste/report.json`; mesmo elenco e AWP das comparações controladas. A amostra não completa o percurso inteiro sob combate; a chegada das três rotas é provada separadamente em TR1.

## Jogabilidade e limites dos instrumentos

- `SP5–7`: oito spawns,16 pickups e três CTF mantêm coordenadas exatas.
- `SP4`: três testemunhas de rota disjuntas no interior; oeste, centro e leste.
- `TR1–2`: `Game._updatePlayer` a60Hz simulados percorreu114.48/109.28/131.76m em22.77/21.77/26.25s; todas as chegadas a menos de0.35m. Sem teletransporte no percurso. Isso mede física e circulação, não FPS.
- Barreiras de teste impediram as três chegadas e reprovaram somenteTR1.
- `RV2`: cinco alpendres não empurram o corpo de raio0.38m. `SP8`: igreja com semi-extensões2.18×3.15m.
- `RV5`: zero dos16 pares de spawns opostos têm linha direta usando o raycast não recursivo do jogo. A versão antiga do instrumento era recursiva e não provava esse comportamento; foi corrigida.
- `map-check-comparison/occluded-result.json`: nenhum corpo dentro de sólido nas amostras de spawn/chão; folga mínima1.75m e área contígua64.1m². Antes do deslocamento do barril, MAP4 mediu549oclusores com superfície visível e pulou19InstancedMesh pelo limite do instrumento Node; não aprova todas as colisões GLB.
- O diagnóstico amplo imprime MAP5=9.78m diante da referência7m (baseline9.70). É uma estimativa por área/colisores, não a distância real até cobertura. Após corrigir oclusão e antes do deslocamento do barril, linhas CTF E/MID/B caíram de90.6/55.8/88.5 para56.2/54.9/59m, e exposição de spawn E/B para9.80%/7.71%. Esses diagnósticos **não participam do exit code**; o exit0 não aprova integralmente o mapa. A sonda específica da bandeira B revelou um barril herdado exatamente no centro do objetivo, com penetração de1.08m. O barril foi deslocado de[12,34] para[14,34], sem mover o CTF: SP9 e RV12 agora medem zero penetração e zero deslocamento do corpo nos três pontos.

### Correção adicional de tiros atravessando corpos

A revisão adversarial encontrou uma falha herdada:67Groups visíveis eram ignorados pelo raycast não recursivo dos bots e tiros. O mapa agora registra somente suas malhas sólidas já existentes, sem mudar `Game`, os pais, as matrizes ou a geometria. Folhas de copa e bandeirolas ficam fora por serem decoração flexível. Solo, horizonte e fauna não foram acrescentados à lista.

`RV12` também mede os três centros CTF com colisão do corpo e sonda vertical contra a geometria visível. Um barril de teste no centro B deve deixá-la vermelha.

`RV11` comprova em GLB que a igreja bloqueia `Game._losClear` e produz impacto no mesmo raycast não recursivo, mantendo trecho aberto livre. Remover somente os oclusores da igreja deixa RV11 vermelho. Os13mutantes de runtime passaram isoladamente após esse reparo; custo visual permaneceu482calls/277033tris. Antes do deslocamento final do barril, depois da correção de oclusão, duas partidas com elenco/arma fixos ficaram em p50=8.3ms e p95=10.0/10.1ms, sem erros. Na mesma rodada, a versão sem correção ficou em9.5ms no p95. Calls médios559.89/562.31, tris494348/494604; heap final96.12/74.55MB, sensível à coleta de lixo. Relatórios em `motion-unoccluded-controlled-velho_oeste/`, `motion-occluded-controlled-velho_oeste/` e `motion-occluded-controlled-b-velho_oeste/`, indexados por `motion-occlusion-runs.json`. O aumento observado de0.5–0.6ms no p95 é pequeno neste host, mas não elimina a necessidade de testar GPUs mais fracas. A correção muda quais paredes interrompem combate; movimentos/mortes entre ensaios continuam não determinísticos.

## Gates e mutações

Estado congelado, `closed-global-runs.json`: **check:fast108/109**, exit1 somente por `audio:check` (manifesto herdado DEFASADO). Todos os demais108gates passaram, inclusive contratos de mapa, assets, look, ambience-registry, documentação/autoria e comentário. `build`, `assert:assets` e `eval:maptex` passaram. Logs: `logs/closed-check-fast.log`, `closed-build.log`, `closed-assert-assets.log` e `closed-eval-maptex.log`. O runner durou236.59s; build5.83s. Não foi reduzido o gate de áudio nem reescrito o manifesto para eliminar associações.

| Régua específica | Resultado verificado |
|---|---|
| `eval:sertao` |6 cláusulas;6 mutantes isolados|
| `eval:velhooeste` |9 cláusulas;10 mutantes isolados|
| `eval:sertao-spatial -- --self-test` |9/9;14 mutantes isolados|
| `eval:sertao-runtime` |12/12;14 mutantes isolados; sete PNG reais|
| `eval:sertao-occlusion -- --self-test` |4/4;7 mutantes isolados|
| `eval:sertao-flora` |8/8;10 mutantes isolados e2 multialvo declarados|
| `eval:sertao-mandacaru` |5/5;6 mutantes isolados e2 multialvo declarados|
| `eval:sertao-traversal` |2/2; barreira derruba somenteTR1|
| `eval:look` |quatro mapas e quatro mutantes verificados|
| `eval:ambience`, Chrome Metal |16 cláusulas globais; não aprova música do Sertão|

FL/MC exigem conjunto observado exatamente igual ao declarado e ao menos uma prova isolada por cláusula. Mutantes multialvo não contam como prova isolada. O antigo runner permitia colaterais ocultos; resultados históricos foram preservados e não ganharam aprovação retroativa. ST1 também tinha uma mutação sobrevivente por contagem inflada de helpers, e RV1 aceitava fallback quando o GLB falhava: ambos foram corrigidos e suas contraprovas executadas.

Logs e JSON: `logs/node-mutants-final.json`, `runtime-delivery-runs.json`, `logs/flora-isolation-audit.json`, `logs/mandacaru-isolation-audit.json`, `logs/flora-runner-rejection-audit.json`. Não são alegações de cobertura exaustiva de todas as regressões possíveis.

## Pendências para aceite humano e publicação

1. Crítica visual anterior aos últimos ajustes,7/10: emenda fina no piso sul; rochas atrás do palco competindo com colunas; exterior ainda aberto; diferenças de detalhe entre casario autoral e GLBs. Silhuetas próximas de cactos/rochas ainda facetadas. O perímetro retangular continua perceptível.
2. Sessão humana de combate: avaliar risco/recompensa da rota central, linhas longas, controle dos flancos, spawn trap e contraste do elenco completo. Três rotas caminháveis não equivalem a balanceamento competitivo aprovado.
3. Sanfona/forró ausente:404 no navegador. Sete MP3 CC0 recuperados responderam200 e decodificaram, mas `audio-pack-v6` não distribui `ambiente/`. Não foi criado asset sem procedência nem renomeado acordeão genérico como forró.
4. Manifesto de áudio herdado incompatível com o gerador atual. Não reescrever eliminando falas/pools para forçar verde. A correção e distribuição pertencem ao pipeline de áudio.
5. Procedência herdada: Mint tem IDs/chats/hashes, mas termos específicos e autoria humana permanecem incompletos; algumas texturas real-v1 também carecem de fonte documental. Registro procedural próprio não licencia esses arquivos. Resolver antes de publicação.
6. PR445 segue conflitante com sua base. Resolver integração em frente própria após revisão, sem misturar alterações das outras worktrees.

## Arquivos e commits

Lista exata de arquivos adicionados/modificados frente a49441895 (inclui este relatório e o ledger; artefatos ignorados não entram no commit):

- `.gitignore`
- `ARCH.generated.md`
- `README.md`
- `SCRIPTS.md`
- `STATUS.md`
- `docs/docs/arquitetura.md`
- `docs/docs/colaborar.md`
- `docs/docs/comecando.md`
- `docs/docs/quality-gates.md`
- `docs/docs/stack.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/arquitetura.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/colaborar.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/quality-gates.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/stack.md`
- `docs/reports/SERTAO-AUDIO-PENDENCIAS.md`
- `docs/reports/SERTAO-CEU.md`
- `docs/reports/SERTAO-CONTINUACAO.md`
- `docs/reports/SERTAO-CRITICA-BASELINE.md`
- `docs/reports/SERTAO-CRITICA-FINAL.md`
- `docs/reports/SERTAO-CRITICA-R2.md`
- `docs/reports/SERTAO-CRITICA-R4.md`
- `docs/reports/SERTAO-ENTREGA.md`
- `docs/reports/SERTAO-ESPACIAL.md`
- `docs/reports/SERTAO-FLORA.md`
- `docs/reports/SERTAO-OCLUSAO.md`
- `docs/reports/SERTAO-REFERENCIAS.md`
- `package.json`
- `public/audio/ambiente/FONTE.md`
- `public/js/look.js`
- `public/js/map_sertao_architecture.js`
- `public/js/map_sertao_flora.js`
- `public/js/map_sertao_landscape.js`
- `public/js/map_sky.js`
- `public/js/map_velho_oeste.js`
- `public/models/ambient/FONTE.md`
- `public/models/props/FONTE.md`
- `public/models/props/sertao-procedural.json`
- `tools/eval/ambience-check.mjs`
- `tools/eval/look-check.mjs`
- `tools/eval/sertao-check.mjs`
- `tools/eval/sertao-flora-check.mjs`
- `tools/eval/sertao-occlusion-check.mjs`
- `tools/eval/sertao-runtime-check.mjs`
- `tools/eval/sertao-spatial-check.mjs`
- `tools/eval/sertao-traversal-check.mjs`
- `tools/eval/velho-oeste-check.mjs`

Checkpoints, em ordem:

- `727f3c84` — docs(sertao): registrar diagnóstico visual e procedência do acervo
- `d1ff3d60` — fix(sertao): unificar céu contínuo e névoa de fim de tarde
- `b4f96183` — fix(sertao): reconstruir casario e preservar circulação física
- `035d0a9f` — test(sertao): medir corpos, rotas e identidade sem contagem inflada
- `22d5458e` — feat(sertao): detalhar fachadas e reduzir repetição do terreno
- `5458d9c5` — test(sertao): provar GLBs, circulação e regressões em WebGL real
- `0ada9243` — test(sertao): exigir efeitos exatos e prova isolada nas mutações de flora
- `c10ed7ff` — docs(sertao): conservar críticas visuais e comprovar recuperação de áudio
- `2f76b255` — fix(sertao): registrar malhas sólidas para tiros e visão dos bots
- `e41b8cae` — docs(sertao): atualizar índices e registrar validação de oclusão
- `486cc3cd` — fix(sertao): liberar centro CTF sem deslocar o objetivo
- `a53ec67c` — docs(sertao): sincronizar índices após contratos finais de CTF

O commit que contém este relatório fecha o registro documental. Todos os commits usam Signed-off-by e trailer Agent. `SERTAO-CONTINUACAO.md` preserva marcos, rejeições e próximo passo.

Pacote local de revisão: `artifacts/sertao-astra/sertao-review-evidence.zip`, contendo comparador, capturas selecionadas, relatórios e logs principais. Não contém os grandes pacotes de áudio, assets brutos ou imagens rejeitadas. O manifesto de arquivos e o hash do ZIP ficam em `review-package.json`.
