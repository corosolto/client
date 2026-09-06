# Treta na Amazônia — revisão local, 2026-09-06

**NÃO APROVADO para integração.** Há correções verificadas de superfície, colisão e
travessia, além de melhoria parcial do cenário. Restam falhas visuais e técnicas;
performance e mixagem não receberam aprovação humana. Nenhum push, merge ou deploy.

**Teste pelo menu:** use o [preview da main com a Amazônia](AMAZONIA-TESTE-LOCAL.md)
na porta 8157. A porta 8146 citada nas capturas é apenas de avaliação; não renderiza
as facções Astro. O preview tem runtime da main e não herda o aceite dos gates desta
revisão: recebeu somente o smoke de navegação descrito naquele documento.

## Escopo e origem

Worktree nova: `/Users/ruben/csbrasil/worktrees/amazonia-visual`.
Branch: `codex/amazonia-visual`, criada de `origin/map2/amazonia` após fetch.
Baseline PR439: `5c66d28b3d691a12ae2084dc3ddf19d7d8cf6dbf`.
Base do PR: `feat/times-e-mapas-completo`; inspeção final continua
`DIRTY / CONFLICTING`. Checks de avaliação/probe/varredura estão SKIPPED; sucesso
de Vercel/automerge não foi usado como aprovação do mapa. Detalhes: `pr-final.json`
e `pr-conflicts.txt` nos artefatos. Nenhuma outra worktree foi editada.

Runtime alterado somente em `map_amazonia.js` e no campo de força direcional da
névoa de `LOOK.amazonia`. Não foram alterados game.js, water.js, bloom.js, registro,
loader, física compartilhada, GLBs, package.json ou lockfile. A régua AMZ existente
recebeu apenas diagnóstico dos patamares inalcançáveis; limiares não foram reduzidos.

Referências e procedência: [AMAZONIA-REFERENCIAS.md](AMAZONIA-REFERENCIAS.md).
Recorte: comunidade fictícia de várzea na vazante, inspirada em Marajó. Fotografias
foram inspecionadas, não incorporadas como texturas. Usado o acervo local documentado;
nenhum modelo externo novo ou licença NC/editorial/ambígua foi integrado.

## Antes e depois

| Defeito demonstrado | Resultado e limite |
|---|---|
| Água .20m cobria pontes .18m; margem visual plana divergia até .305m do chão físico | Água −.12m, pontes .18m; 16 amostras de rampa coincidem com física (erro máximo ~2e−8m) |
| 63/63 troncos GLB excediam colisores na faixa do corpo | 0/63, inclusive sem instancing; geometria derivada preserva UV, raio físico acompanha escala |
| 44 massas retangulares formavam horizonte de cidade | Retiradas; 25 árvores originais do perímetro mais altas, sem instâncias extras; vãos e repetição ainda exigem avaliação |
| Seis pontes não completavam caminhada no baseline | Mesmos 12 percursos: 6/12→12/12. Mais dez escadas e dois trechos na mata: total24/24 em med e low |
| Teto da passarela acionava mantle involuntário | Vão ampliado com deck2.3m, estacas acompanhando; AMV7 passa |
| Deck elevado criou 12 quedas laterais sem guarda | Corrimãos acompanham escadas; MAP6 voltou a0; árvore na boca de uma escada deslocada1.2m, AMZ5 voltou a11/11 |
| Margem seca aplicava lentidão da água | slowAt termina na lâmina; três pontos secos passam |
| 11/25 raios diretos entre spawns no baseline | 0/25 após cobertura visível; dez spawns sem deslocamento ao assentar |
| Faixas claras sob troncos na água | Gradiente rasa/funda aproximado após diagnóstico isolado; melhora parcial, sem declarar eliminação completa |
| Arquitetura repetida de chalés | Duas casas ganham madeira, venezianas, portas fechadas e cobertura baixa; nove modelos herdados ainda limitam identidade e alinhamento do piso interno |

Três pontes, rota alta, objetivos/pickups e posições de spawn preservados. CTF do
map-check mantém mínimo2 rotas independentes entre spawn/objetivo, com três a quatro
em parte dos pares. MAP1=0 penetrações, MAP4=0 oclusores sem malha, MAP5 pior razão
.44≥.35. Caminhada usa Game._updatePlayer/_collide reais, passos fixos1/120s e bots
congelados; não cobre toda movimentação livre ou combate simultâneo.

## Evidências reproduzíveis

Diretório absoluto: `/Users/ruben/csbrasil/worktrees/amazonia-visual/artifacts/amazonia-visual/`.
Abrir `comparacao.html`: seletor de rodada/qualidade e pares de imagens.

- `baseline/` e `baseline-low/`: builder/LOOK originais.
- `revision-med/` e `revision-low/`: estado final, sete câmeras1536×1024, FOV70,
  24 screenshots de trajetos, walk.json, trees.json, capture.json e combate5/20/40m.
- `baseline-walk-retry/`: repetição dos12 percursos no builder original.
- `final-v2-unbatched/`: fallback sem instancing, AMV4 verde. A geometria dos
  troncos não mudou após esse teste; posição de uma árvore e escadas mudaram depois.
- `review-med/canal-sem-gradiente-agua.png`: experimento que isolou contribuição
  do gradiente; variantes sem espuma/fog/glint não resolveram o halo.
- `iteration-1/` rejeitada: aviso de boot cobria imagens. Nunca usar como evidência.

Hash SHA256 do builder final, registrado em AMV, mutantes e nas duas capturas:
`2a6e9e5b89e4011fde1747a80040c16de840d0e30ba632de301ce411f85847e7`.
Capturador fixa a fonte por interceptação local para que o hash corresponda ao JS
realmente executado. Sessão própria Chrome, porta8146; APIs externas bloqueadas.
Sem pageerrors e GLBs centrais HTTP200. O servidor de avaliação deixa uma URL de
brasão Astro não expandida retornar404; não é falha de asset do mapa nem prova SSR.

Câmera fixa `mata` atravessa posição de tronco: é diagnóstico, não prova de acesso.
Os dois screenshots `walk-mata-*` documentam posições atingidas pela física.
Combate usa o mesmo bot GLB em três distâncias, sem penetração, raycast livre e
mira fora da silhueta. Não generalizar contraste do canal a toda a mata. Não há
modo dia/noite implementado no builder/LOOK; nenhuma variação fictícia foi criada.

## Réguas e mutantes

- `npm run eval:amazonia` e execução direta `node tools/eval/amazonia-check.mjs`:
  AMZ1–7 passam, 11/11 patamares e travessia A→M→F.
- `node tools/eval/amazonia-surface-check.mjs`: AMV1/2/3/5/6/7 passam.
- `node tools/eval/map-check.mjs amazonia`: passa, sem bordas MAP6 desprotegidas.
- Nove mutantes reais: AMV1 água/ponte, AMV2 margem, AMV3 skyline, AMV4 GLB no
  browser, AMV5 spawn, AMV6 margem seca, AMV7 mantle, MAP6 guarda e AMZ5 árvore na
  entrada. Cada um retorna exit1 somente na cláusula pretendida; fonte restaurada.
  Logs: `mutations-release-candidate.log`, `mutations-browser-release-candidate.log`.
- Build e assert:assets passam. Contratos mapcontrato, ambience-registry,
  corrego-water, look, wind, asset-integrity, gltf-validator, props-acervo e propsuv1
  passam. Atenção ao alcance: look/wind/corrego-water não medem por si só toda a
  Amazônia; evidência específica está em AMZ/AMV e browser.
- `npm run check:fast`: **103/104 passaram**,251.6s; única falha `audio:check`.
  Inclui docs:check, docsautoria, skills e os contratos citados. Resultado completo
  em `check-fast-final.log`; o portão direto de Amazônia abaixo continua vermelho.

Falhas mantidas e não mascaradas:

1. **mapa-novo-gate:3 cláusulas vermelhas.** ORT1=10.4% e17 ângulos (pisos15%/20),
   ALT1 h90=6.8m (piso9), SUP1=51.4% materiais sem map (teto40). Baseline tinha
   somente SUP1=52.8%. ORT1/ALT1 são falhas novas após retirar caixas altas do
   horizonte; o arnês Node não carrega o dossel GLB. Não foram reinseridas caixas
   para comprar aprovação nem alterados os limiares. Reconciliação ainda pendente.
2. **eval:ssr:** exige `_render.func/dist/server/entry.mjs`; adapter atual produz
   `_render.func/.vercel/output/server/entry.mjs`. O gate original continua vermelho. Diagnóstico separado em `ssr-actual-entry.mjs`
   lê o handler do .vc-config.json (única adaptação, fora do fonte versionado):
   SSR1/2/3 passam; HTTP200 em /mapa, /ranking e /u/exemplo, com20.081,16.151
   e14.815 unidades de texto (`resp.text().length`, rotuladas bytes pelo arnês).
   Executado com Node23.6, enquanto descriptor pede Node24. Isso comprova corpo
   nessa execução local, sem vender como gate canônico verde ou prova de deploy.
3. **eval:ambience:** aborta antes de medir, ENOENT `public/js/map_es.js`, causado
   por construção de caminho no script herdado. Registro e runtime foram medidos
   separadamente, sem corrigir a ferramenta compartilhada fora do escopo.
4. **audio:check:** manifest legado defasado em relação aos packs restaurados nesta
   worktree. Não regenerado o catálogo global. Quatro loops do mapa decodificados
   (três arquivos) e ligados ao duckBus; nenhum erro de carregamento. Ambiente
   posicional confirmado no estado real, mas mascaramento de passos e conforto
   precisam de escuta. Não se reivindica licença nova para o restante do pack.

## Performance e limites visuais

| Métrica diagnóstica | Baseline med | Revisão med | Baseline low | Revisão low |
|---|---:|---:|---:|---:|
| Triângulos estáticos do mundo | 981999 | 981825 | 914864 | 914954 |
| Malhas transparentes no mundo | 4 | 1 | 4 | 1 |
| Malhas com sombra | 511 | 444 | 474 | 407 |
| Máximo de calls somando passes nas7 câmeras | 933 | 856 | 664 | 766 |

As chamadas/triângulos renderizados incluem personagens variáveis e não são um
A/B de carga idêntica. Medição low de calls aumentou; não ocultar esse resultado.
A revisão med variou231–856 calls e0.695–1.429 milhões de triângulos somando passes;
low112–766 e0.324–1.084 milhões. Heap amostrado84.5/79.8MiB, não teste prolongado.

**FPS/GPU PENDENTE.** Havia outros Chrome/Blender ativos; nenhum processo de outra
frente foi interrompido. BAR recomenda300–400 calls típicos, pico<800 e<500k tri
na cena: o mapa continua pesado. Não foi encontrado comparativo de mapa pesado
com aprovação atual e medição equivalente verificável; essa comparação também
fica pendente. Instancing preservado; árvores usam material opaco, não alpha-test.
Remover três planos transparentes reduz camadas, mas não mede diretamente overdraw.

Crítica independente final (`review_delivery`, contexto limpo): **5/10, reprovado
visualmente**, embora haja ganho sobre baseline. Conferiu sete pares med/low,
percursos e combate. Piso do mercado: L*81.9→31.2 med e45.5→38.9 low em ROI
x600–800/y700–900. Identidade brasileira ainda superficial, próxima de vila tropical
genérica; fachadas precisam de profundidade e sinais específicos de habitação.

C18 não recebeu PASS: personagem legível5m, tênue20m e quase reduzido à cabeça40m;
raycast livre não comprova contraste. Falta máscara do corpo/anel de20px e os oito
pontos exigidos pela régua. C23 não demonstrado: faltam marcos únicos por entrada;
a proteção de spawn oculta a escada e a fachada M–F não orienta continuação.
C25 segue inconsistente: copas triangulares, palmeiras detalhadas e solo fotográfico
não compartilham o mesmo tratamento. Em escada17–29 folhas grandes cruzam a observação;
em mata leste há travessa/apoios dominantes. Halos da água e borda reta do terreno
continuam visíveis. Esses achados são pendências reais, não aprovação própria.

## Checkpoints e arquivos

Commits locais: a15f6bbe (baseline/réguas),16381649 (superfície/troncos/horizonte),
fa43a79b (referências/procedência),93f623ea (guardas/rotas/validação),31b29509
(contagens geradas). O commit deste relatório fecha a documentação da entrega.
Os13 arquivos gerados contêm apenas22 linhas de contagens sincronizadas; não há
refatoração global. Artefatos volumosos, pacotes e capturas permanecem locais.

Lista exata em relação ao baseline, incluindo este relatório:

```text
ARCH.generated.md
README.md
STATUS.md
docs/docs/arquitetura.md
docs/docs/colaborar.md
docs/docs/comecando.md
docs/docs/quality-gates.md
docs/docs/stack.md
docs/i18n/en/docusaurus-plugin-content-docs/current/arquitetura.md
docs/i18n/en/docusaurus-plugin-content-docs/current/colaborar.md
docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md
docs/i18n/en/docusaurus-plugin-content-docs/current/quality-gates.md
docs/i18n/en/docusaurus-plugin-content-docs/current/stack.md
docs/reports/AMAZONIA-REFERENCIAS.md
docs/reports/AMAZONIA-VISUAL-CONTINUATION.md
plans/AMAZONIA-VISUAL.md
public/js/look.js
public/js/map_amazonia.js
public/models/props/FONTE.md
tools/eval/amazonia-check.mjs
tools/eval/amazonia-surface-check.mjs
tools/eval/amazonia-visual-capture.mjs
tools/eval/amazonia-visual-mutate.mjs
tools/eval/amazonia-walk.mjs
docs/reports/AMAZONIA-VISUAL-REVIEW.md
```

Continuidade: [AMAZONIA-VISUAL-CONTINUATION.md](AMAZONIA-VISUAL-CONTINUATION.md).
Próximo aceite exige resolver/verificar falhas visuais, reconciliar os três gates
de mapa novo e obter janela exclusiva para performance e escuta humana da ambiência.
Eventual PR deve partir desta branch isolada contra map2/amazonia, após revisão;
nenhum PR novo foi aberto nesta execução.
