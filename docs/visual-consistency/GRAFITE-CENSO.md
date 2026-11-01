# GRAFITE-CENSO — aceitação crua e caminho Ego (R1+R2, 31/10/2026)

Frente: `tools/eval/graffiti-census.mjs` nesta worktree (`consistencia-visual-release-20261031`).
Irmãos: `tools/eval/graffiti-census-accept.mjs` (aceitação), `tools/eval/ego-graffiti-census.mjs`
(caminho Ego), `tools/eval/ego-graffiti-bake.mjs` (padrão de marcador stdout+stderr).

## Objetivo 1 — aceitação por contagem inteira

**Defeito corrigido.** O portão decidia com `r.cobertura` e `r.densidade.total`, que são
valores de *apresentação* (arredondados a 0,1% e 0,01). Razão crua abaixo da meta podia
arredondar PARA CIMA e passar:

- cobertura `1183/2000` = 59,15% → apresenta **59,2** → antigo `59.2 >= 59.2` PASSAVA; a razão crua está **abaixo** da meta 59,2 da Piscina.
- densidade `851/1000` = 0,851 → apresenta **0.85** → antigo `0.85 > 0.85` era falso → PASSAVA; cru está **acima** do teto 0,85.

**Decisão.** Aceitação agora mora em `graffiti-census-accept.mjs` e compara **produtos
inteiros**, sem float no meio:

- piso: `pintadas * 1000 >= round(meta*10) * placas` (e `placas===0` só passa sem meta);
- teto: `pecas * 100 <= round(teto*100) * placas`;
- contagem não-inteira/NaN lança `contagem inválida: …` — falha de instrumento distinta de detecção.

`r.cobertura` / `r.densidade.total` continuam sendo impressos: são relatório, não portão.
**Pisos (`META`) e tetos (`TETO`) não mudaram** — nenhum valor foi redefinido para fechar placa.

**Prova (sem browser).** `node tools/eval/graffiti-census-accept.mjs --prova`:

1. para cada piso e teto real, com placas 2000/997 e 1000/997, verifica que a contagem
   mínima/máxima exata passa e a imediatamente abaixo/acima reprova — MESMA função de aceitação;
2. os dois casos "apresentação mentia a favor do mapa" acima;
3. cláusulas próprias: meta 0 passa, sem placa com meta reprova, NaN lança erro próprio;
4. integração: `avaliarMapa` reprova pelas contagens cruas, não pela apresentação.

Resultado nesta máquina: `PROVA VERDE — fronteira inteira exata` (exit 0).

**Migração completa:** o loop do censo agora chama `avaliarMapa(id, r, {META, TETO, ORFAS})`;
não existe segunda convenção de comparação no arquivo.

## R2 (31/10, resposta ao crítico) — integração

- `writeFileSync` perdido no R1 quebrava `--out`/`JSON=1`: a escrita agora mora em
  `gravarOut` (export de `graffiti-census-accept.mjs`, provada em node com arquivo temporário).
- `EGO_TASK_SPACE` fornecida mas inválida (`abc`, `0`) aborta com cláusula própria ANTES de
  qualquer import/launch — não cai mais silenciosamente no Playwright. Ausência deliberada
  continua significando caminho CI.
- `ONLY` é validado contra MAPS antes de iniciar backend; e o comando não encerra mais 0 sem
  avaliar nenhum mapa (guarda anti-GREEN-vazio, exit 2).
- Playwright (incl. `npm root -g`) só é resolvido/importado no ramo CI: Ego com Space válido
  não depende do pacote global.
- A linha `OK/BAIXO` por mapa deriva da MESMA decisão crua (`coberturaPasse`), não da
  apresentação arredondada; o percentual exibido continua como relatório.
- Adapter Ego: um único coletor processa TODOS os eventos CDP desde a navegação (inclusive
  os lotes consumidos pelo pump do `Fetch`), correlacionando requests/respostas/falhas na
  mesma coleção; e depois de `MAPEVAL.ready` o censo só começa quando a rede da BASE
  silencia (sem requests ativos por 1,5 s, timeout próprio de 30 s). Textura atrasada que
  falha durante a carga é falha de infraestrutura, nunca baseline aceito nem mutante detectado.
- R3: o silêncio de 1,5 s passou a ser exigido no fim do prazo também com zero pendentes
  (só `Network.*` da BASE renova a espera; console irrelevante não renova; zerar o prazo sem
  silêncio é recusa fail-closed) e o alcance é registrado em `silencioMs` do resultado.
- O payload do censo agora expõe `contagemPorArquivo` (quantas vezes cada arquivo foi usado).
  `usados` continua sendo só o inventário de nomes — não é prova de repetição.

## Objetivo 2 — caminho Ego (EGO_TASK_SPACE), sem tocar o CI

`EGO_TASK_SPACE=<id> [EGO_PAGE=p2] [BASE=…] node tools/eval/graffiti-census.mjs [mapa] [--mutante=…] [--out=privado.json]`

- Reaproveita a TaskSpace/página da missão (nunca cria/encerra/usa outra); BASE obrigatório como antes.
- NÃO lança Playwright/Chromium: o launch é pulado quando `EGO_TASK_SPACE` está setado; o caminho CI (`page.route`) segue intacto e sem mudança de comportamento.
- Mutante no Ego usa só CDP documentado: `Fetch.enable` com padrão literal `*graffiti_layout.js*`
  em `requestStage: Request`; o corpo mutado é preparado em Node (fonte pública lida por
  `fetch`, layout alterado **em memória**, nunca em disco), servido com
  `Fetch.fulfillRequest` (200, `text/javascript`, base64). O loop de eventos é bombeado
  enquanto o `goto` está em andamento (goto não esperado com request pausado); `Fetch.disable`
  no `finally`.
- Mutação compartilhada: `mutarLayout(id, mutante, layout)` é UMA função usada pelos dois
  caminhos (Playwright embeda no `page.route`, Ego recebe `mutarLayout.toString()`), provada
  em node (`sem-layout` esvazia pecas+murais da Piscina; `peca-no-ar` soma 2,5 m só na peça 0
  do Ferro; `demais` dobra as pecas do Ferro; mapa fora do alvo → baseline, igual ao fallback CI).
- Avaliação longa: job assíncrono na página (`window.__censoJob`) + polling de 1 s por
  `page.evaluate` curto — nunca um evaluate único longo.
- Validações com cláusula própria (todas falham distinto de detecção): BASE/id/space/page/mutante
  inválidos; `CENSO_RESULT` ausente; `actualMap !== id`; erros de página (>=400, loadingFailed,
  exceptionThrown, console "load failed"); contagens não-inteiras; placas=0 **e** waypoints=0
  (montagem suspeita); mutante armado que nunca interceptou o layout ("mutante não aplicado").
- Marcador `CENSO_RESULT=` extraído de **stdout+stderr combinados** (ego escreve console da
  página em stderr), como o `ego-graffiti-bake.mjs`.
- `--out=ARQUIVO` grava o JSON em arquivo privado; no caminho Ego, `JSON=1` sem `--out`
  é recusado (exit 2) para não sobrescrever o tracked `tools/eval/graffiti_census.json`.

### Pendência verdadeira

O caminho Ego **não foi executado** nesta lease (o Root assava 14 mapas no Ego32 p2; browser
proibido). Validado em node puro: sintaxe, guards de entrada (6 cláusulas), serialização do
`CENSO` em IIFE válida (12.753 bytes), semântica do mutador compartilhado e prova de fronteira.
O adapter precisa da validação do Root com o bake terminado, inclusive o par mutante
(`--mutante=peca-no-ar` deve reprovar por órfã; `--mutante=demais` deve reprovar por densidade;
`--mutante=sem-layout-piscina` deve reprovar Piscina por cobertura — se a produção dedupar/cuar
a cópia de layout antes de desenhar, o mutante NÃO é defeito desenhado e precisa de outro ponto
físico, não de detecção forçada).

## Brief novo do dono (31/10) — registrado, NÃO aplicado

Zero arte repetida · Ferro apenas casa B · Piscina só branco. As metas atuais de
cobertura/densidade foram medidas com o denominador "toda placa visível"; se o denominador
elegível muda (ex.: só superfícies que podem receber aquele tipo de arte), piso e teto terão
que ser remedidos. **Decisão é do Root após medição real** — nada foi baixado nem inventado
aqui. A medição por mapa (pintadas/placas cruas + `contagemPorArquivo`, contagem por
arquivo que expõe repetição) já sai do censo atual para embasar essa decisão.

R4: a coleta final também drena eventos após a leitura de `window.__mapId`; erro de página/404 enfileirado durante essa chamada não pode escapar do payload. Contraprova do crítico R3 fechada no código, repetição independente pendente.
