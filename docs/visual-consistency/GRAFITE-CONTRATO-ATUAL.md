# GRAFITE-CONTRATO-ATUAL — gate runtime do contrato vigente (31/10)

**Direção do dono (31/10, explícita): mapas limpos, zero arte repetida por mapa, Ferro só na
casa B, Piscina só no parede branca — incluindo posters.** A meta antiga de *saturação*
(cobertura % de placa de parede por mapa) foi **substituída** por este contrato. Proveniência
da troca: pedido do dono em 31/10 registrado em `GRAFITE-REGUA.md` (seção "Origem e o RED
real de #1179") e no SURVEY6; o censo antigo marcava Piscina em 59,2% de cobertura, mas a
mesma superfície medida com a régua de geometria correta dá **11,2% (102/910)** depois da
limpeza — número que **não autoriza baixar a META** do censo histórico para fechar GREEN.

## Dois comandos, dois contratos

| comando | instrumento | contrato | resultado esperado hoje |
|---|---|---|---|
| `tools/eval/graffiti-current-browser-check.mjs` | Ego + `medirCuradoria()` na cena real (`__gworld.root`) | contrato ATUAL: `duplicates`/`outside`/`unsupported`/`unknown`/`divergent` todos **zero**, fail-closed | **GREEN nominal pós-alias** — prova Ego14 R21, abaixo |
| `eval:grafite` (censo histórico, `graffiti-census.mjs`) | Ego/Playwright | tetos de META de cobertura % de 07–30/10 | **RED sem waiver** até a cobertura voltar à meta — é o passivo histórico, não erro do gate |

O gate atual **não codifica contagem mínima estética**: zero arte num mapa só reprova quando
há arte **esperada** — peça declarada no inventário real (`declared-overlay` com
`visibleArtwork`) ou metadado de bake (`userData.graffitiPecas`) sem geometria desenhada.
Mapa limpo sem arte esperada é GREEN; vacuidade total da medição não é critério.

## Escopo

Os **14 mapas abertos** medidos no Ego14 R21 pós-alias — não apenas os 11 legados do censo:
`ferro_velho, campomorro, loja_h, mansao, upa_24h, obras_prefeitura, atacadao_treta,
escadao, lajes, corrego, quebrada, piscina_treta, praca_poderes, posto_treta`.

Prova vigente: `audits/2026-10-31-visual-consistency/curation-Ego-14-R21-verdict.json`
e os 14 `curation-Ego-14-R21.<mapa>.json`: 458 peças, todos os cinco contadores zero,
preferências restauradas. A crítica independente
`CRITICO-CURATION-EGO14-R21-COERENCIA-R1.md` conferiu 597 relações, os hashes dos raw
e a coerência com os nominais CI identity R6. Os seis pins de fonte em
`critico-curation-ego14-r21/coherence.json` conferem com a base `8ee224e48` nesta revisão
(`review-r71-fixes-r73/preflight-r21-pins.json`).

Limite de proveniência: o log R21 retém somente GREEN; não conserva o envelope bruto
`BROWSER_CHECK_RESULT` nem hashes dos JS respondidos naquela navegação. Os pins atuais
não certificam retrospectivamente bytes servidos. Esta prova fecha o nominal pós-alias
do contrato medido; não aprova estética geral, produção, mobile, MP ou FPS. UNKNOWN
continua sem aceite. SURVEY6 e os resultados R6/R4 anteriores ao alias são históricos:
o GREEN por arquivo não demonstra identidade editorial única. Fixtures Node não são
evidência de GLB; a cena do browser é.

## Ordem da prova (R3): nominal antes da mutação, vermelho não muta

**A cena é medida primeiro no estado nominal e exigida verde com os MESMOS predicados
(`predicadoVerde`, compartilhado entre Node e página).** Nominal vermelho **encerra o mapa
sem aplicar mutante** — a decisão semântica do nominal chega ao main como RED (exit 1)
mesmo que o cenário não tenha peça elegível para o mutador; pré-condição do mutador só é
testada com nominal verde. Só então o mutador aplica o patch real de cena e a medição roda
de novo com os mesmos predicados. UNKNOWN nominal é RED semântico (exit1). Erro de página ou protocolo é infraestrutura (exit3).

## Cláusulas e mutantes

Reuso integral dos extratores `graffiti-curation-measure.mjs` (medição) e
`graffiti-art-inventory.mjs` (inventário + `trackGraffitiCanvases` instrumentado via
`Page.addScriptToEvaluateOnNewDocument` **antes** do import das texturas). Mutação é **real,
de geometria/material na cena, aplicada APÓS o build** — nunca nos dados de retorno:

| mutante | cláusula exigida | mapas válidos | efeito |
|---|---|---|---|
| (nominal) | nominal verde ANTES de mutar | 14 | mesma cena medida antes do patch; exigido verde com os mesmos predicados |
| `duplicada` | `duplicates > 0` | 14 | clone de peça canônica na mesma pose (mesma arte 2×) |
| `peca-no-ar` | `unsupported > 0` | 13 (exceto piscina: peça ergida cairia também em `outside`) | clone ergido 3 m sem parede atrás |
| `ferro-fora-b` | `outside === 1` e `unsupported === 1`, demais zero | ferro_velho | peça movida a parede real fora da casa B (metadado do bake acompanha) |
| `piscina-azul` | `outside === 1` e `unsupported === 1`, demais zero | piscina_treta | peça movida à faixa azul (pose legada do mutante `faixa-azul`) |
| `wireframe` | `unknown:wireframe` | 7 com peça manual | material wireframe não desenha o quad |
| `canal-uv` | `unknown:uv-canal` | 7 com peça manual | `map.channel=1` desenha por UV não medido |
| `draw-groups` | **controle: segue GREEN** | 14 | material array + grupo correto não gera falso positivo |

Peça manual = mesh de grafite **sem** `userData.pecas` (mesma chave que a medição usa para
classificar `baked`/`manual`; `graffitiPecas` é o metadado do bake, outra coisa). Mutantes
de material (`wireframe`, `canal-uv`) valem só nos mapas com peça **manual** confirmada no
SURVEY6 (`sources.manual>0`): em peça assada eles contaminam a cláusula `divergente`
(bake 0 ≠ `pecas`). Mutante que **aplica 0** é falha de infra (exit 3), não baseline. Em
todo mutante, as demais cláusulas precisam continuar verdes. Os dois mutantes de zona têm efeitos acoplados pelo próprio produto: a faixa navy da Piscina e TODAS as superfícies fora da casa B no Ferro são marcadas como `graffitiSupportExcluded` (`map_piscina.js` e `map_ferrovelho.js:2013`). A mesma peça viola a zona permitida e o suporte. O aceite exige exatamente uma peça em cada uma dessas duas cláusulas, com todas as demais em zero. Não há superfície grafitável fora da casa B; exigir suporte válido ali tornava a fixture impossível.

## Fail-closed de infraestrutura

- `BASE` obrigatória; sem ela **não lança nada** (exit 2). `EGO_TASK_SPACE` fornecida e
  inválida → exit 2 **sem fallback** para Playwright (o caminho CI/Playwright deste gate é o
  censo histórico existente; nada é instalado ou navegado aqui).
- Ego roda em TaskSpace **existente** do Root (`taskSpace(N)`, página `pN`); o gate **nunca**
  chama `finish`.
- **Protocolo estrito do veredito (P2-1):** o main valida a resposta do filho contra o
  pedido — exatamente os mapas pedidos, sem ausência/duplicação/mapa extra; `mutante` ecoado
  igual ao pedido; `actualMap` igual ao id; `nominalVerde`/`arteEsperada` booleanos;
  contadores inteiros ≥0 (no resumo final e no nominal); `invalidado`/`erros` bem tipados;
  resumo nominal completo. O main **recalcula** `predicadoVerde(nominal)` e recusa a
  contradição com a flag (exit 3): o booleano ecoado nunca é a única fonte do aceite. Na
  rodada nominal, o resumo final também tem que passar o predicado exatamente. Resposta
  vazia, parcial, divergente ou JSON inválido do filho é **infra (exit 3)** — nunca GREEN
  de subconjunto.
- Todo código serializado que vai ao browser (`medirCuradoria`, `trackGraffitiCanvases`,
  mutador e o script Ego inteiro) é compilado **executável** por `vm.Script` antes do launch
  (exit 3 se não parseia) — `node --check` do arquivo externo não vê string quebrada dentro.
- CLI estrito: opção desconhecida/sem valor, opção duplicada e dois alvos posicionais dão
  exit 2; não existe parse leniente.
- Um coletor único desde o `goto`: resposta ≥400, `loadingFailed`, `exceptionThrown` e
  console `load failed` **invalidam a rodada** (exit 3, infra) mesmo com métrica completa —
  erro de página nunca é veredito semântico. O coletor drena **também depois da última
  consulta/evaluate** do ciclo (R4 do censo), não só durante a carga.
- Fim de carga = `MAPEVAL.ready` + **1,5 s de silêncio de rede** da BASE (ativos=0 sozinho
  não basta, R4); mapa carregado (`__mapId`) tem que bater com o pedido.
- Métrica pesada é agendada na página (`setTimeout` 500 ms) e lida por poll curto no Node,
  com espera inicial de 45 s (evaluate do Ego corta em 15 s — nunca segurar a medição num
  evaluate único).
- **Cleanup transacional (P2-3):** TODA mutação de estado (cache off, prefs `med`/manual,
  preload) acontece dentro da região protegida. A obrigação de restaurar as prefs é
  registrada **antes da primeira escrita** — escrita parcial (ex.: `awpbr_settings` vingou,
  `cs_quality_auto` lançou) é revertida ao snapshot original. A limpeza tenta remover
  preload, religar cache e restaurar as duas prefs **independentemente** — a falha de uma
  não impede as outras — e, havendo erro causal, as falhas de limpeza são **agregadas à
  causa** na mesma exceção (nada de limpeza falhada silenciosa).
- Saída é só resumo por mapa; `--out=PREFIXO` (caminho **privado**, fora de `tools/` e
  `public/`, diretório existente) grava por mapa `{ curation: resumo, raw: { nominal, pos } }` —
  a medição **integral** (raw, com inventário) fica guardada como prova ao lado do resumo.
  Nada de base64, traces ou inventário gigante no stdout.

## Códigos de saída

`0` contrato cumprido · `1` RED semântico (nominal fora do contrato ou cláusula-alvo de
mutante) · `2` uso/config inválido (antes de qualquer launch) · `3` infra (código
serializado que não parseia, erro Ego, resposta vazia/parcial/divergente do filho, erro de
página, falha de limpeza, mutante que aplicou 0, medição que não terminou).

## Histórico de implementação

O nominal vigente é o Ego14 R21 descrito acima. As rodadas abaixo documentam a evolução
do instrumento e não substituem a prova pós-alias.

Implementado e verificado offline em duas rodadas. R2 (31/10): mutador consertado (ramo
`draw-groups` fechado, `bbox`/`eixo` definidos, ramo `piscina-azul` existente), parse
executável via `vm.Script` (a mutação com o `if` aberto do R1 reprova), fluxo
nominal-verde→mutação→mesmos predicados, coletor drenando após a última consulta/evaluate
(R4) e CLI estrito. Probe Node contra o Three vendorizado real (r160) executou todos os
ramos do mutador em cena sintética — inclusive `ferro-fora-b` com metadado acompanhando e
`piscina-azul` na pose legada — 22/22 PASS
(`audits/2026-10-31-visual-consistency/GLM-CURATION-RUNTIME-R2-RESULTADO.md`).
**Execução no browser real pendente para o Root** — nominal 14/14 primeiro, depois mutante
por mutante exigindo a cláusula-alvo e as demais verdes. Aprovação visual não é inventada
aqui: vale o que o Root medir no Ego.

R3 (31/10), fechando os P2/P3 do crítico `CRITICO-CURATION-RUNTIME-R2.md`: validação
estrita de protocolo no main (vazio/parcial/duplicado/mapa errado = exit 3, provado por
contraprova com executável Ego fake), nominal vermelho encerra sem mutar (RED 1 chega ao
main), cleanup transacional com flags e limpeza por chave independente, e `--out` guardando
o raw integral + resumo por mapa. Verificação offline com adaptador CDP fake — **nenhum
browser real, mapa ou Ego foi aberto**; veja
`audits/2026-10-31-visual-consistency/GLM-CURATION-RUNTIME-R3-RESULTADO.md`.

R4 (31/10), fechando os 2 P2 + P3 de `CRITICO-CURATION-RUNTIME-R3.md`: coerência nominal
recalculada no main (contradição flag×contadores = exit 3, nunca GREEN), contadores como
inteiros ≥0, `invalidado`/`erros` tipados, JSON inválido do filho vira infra 3 (não crash
exit 1), rollback de escrita parcial das prefs e falhas de limpeza agregadas ao erro causal.
Verificação offline reexecutando todos os controles R2+R3 com fake-ego/adaptador privados —
**nenhum browser real, mapa ou Ego foi aberto**; o processo GLM terminou por deadline. Root repetiu as provas privadas de R3; o crítico
R4 confirmou esses fechamentos e encontrou as falhas adicionais abaixo.

R5 fecha os achados concretos de R4: antes de ler/escrever preferências, navega ao
`robots.txt` estático da BASE e confere `location.origin`. Snapshot e rollback pertencem
à mesma origem; em redirecionamento a prova falha. Cada chave tenta restaurar mesmo se
a outra falhar. O produtor emite `erros: []` sempre; o main recusa erros de página
independentemente de `invalidado`, valida amostras como strings e classifica shapes
malformados como INFRA3. Novas provas offline e execução real ainda pendentes de Root.

### R6: encerramento real no Ego, anterior ao alias

A execução R5 coletou14mapas/465peças com contadores zerados, mas terminou INFRA3 ao restaurar prefs: Ego não aceita argumento para evaluate de string. O callback agora é função real. Falha continua fechada; não aproveitar o exit3 como GREEN. Com --out, snapshot de preferências é persistido antes da escrita e stdout/stderr completo em erro; o encerramento compara também o recibo final com o snapshot. Diagnóstico Posto após fix retornou GREEN real. O censo14R6 terminou GREEN no Ego:14/14mapas,465peças, todos os contadores de erro zero; o recibo final de preferências foi igual ao snapshot. A recuperação da chave manual de QA usa a referência persistida bake14-R1-settings-before.json (manual=null), sem regravar outras preferências.


### R7: mutantes reais e recibos persistentes

A rodada real R6 detectou os mutantes duplicada, wireframe e canal-uv no Córrego, com controle draw-groups mantendo GREEN. Dois fixtures precisaram correção, sem alterar produto nem extrator: Ferro exigia largura no eixo fino e não achava parede; agora mede largura no eixo tangencial, assenta o quad inteiro no centro de parede externa real e mantém3cm de afastamento. Piscina-azul produz outside1/unsupported1 porque a faixa navy é excluída do suporte por regra explícita do mapa; esse par causal exato substitui a expectativa incorreta de somente outside.

Com --out, prefs-before.json é salvo antes das escritas e prefs-after.json depois da restauração por callback real; os dois valores das chaves precisam ser idênticos antes de GREEN. Nenhum snapshot inteiro de storage é restaurado. Logs completos de falha Ego ficam no audit privado, com excerto limitado na saída. Reteste real dos dois fixturesR7 em execução no momento desta redação; fonte e doc aguardam focal independente final. O censo nominal14mapas continua comprovado pelo R6; isto não inventa aceite estético geral dos mapas nem FPS.


### R9: motivos UNKNOWN completos

O resumo transporta `unknownMotivos` integral, com contagens inteiras positivas cuja soma deve ser exatamente `unknown`, inclusive no nominal. A amostra truncada serve só para diagnóstico. Os mutantes de wireframe e canalUV só passam quando TODOS os UNKNOWN têm o motivo alvo; misturar outra falha reprova. Ausência ou incoerência do inventário é infra3. Censo e contraprovas reais após esta versão ainda estão em execução; os resultados R6/R10 acima pertencem à versão anterior do protocolo.

## Wireframe e ausência de medição

O extrator exclui de sua medição de superfície uma peça em wireframe e registra
tanto `wireframe` quanto `nao-medido` para ela. A contraprova exige essas duas
chaves exatas, contagens positivas iguais e soma igual a `unknown`; as demais
cláusulas continuam zeradas. Motivo extra, contagem desigual ou motivo ausente
reprovam. O modo nominal continua exigindo zero `unknown`. Canal UV diferente
continua exigindo apenas `uv-canal`, sem essa combinação.
