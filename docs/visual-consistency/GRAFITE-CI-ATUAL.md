# GRAFITE-CI-ATUAL — adaptador CI do contrato ATUAL de grafite (31/10)

`tools/eval/graffiti-current-ci-check.mjs` é o **adaptador CI** do mesmo contrato que o
gate runtime do Root (`graffiti-current-browser-check.mjs`, Ego/TaskSpace): arte única
por mapa, Ferro só na casa B, Piscina só na parede branca — `duplicates`/`outside`/
`unsupported`/`unknown`/`divergent` todos **zero**, fail-closed. A direção 31/10 do dono
**substituiu** a meta de saturação do censo histórico; a META antiga fica intacta para
auditoria (`eval:grafite`) e **não é baixada** aqui. Detalhes do contrato:
[`GRAFITE-CONTRATO-ATUAL.md`](GRAFITE-CONTRATO-ATUAL.md).

## O que este adaptador é — e o que não é

- **É**: o MESMO extrator (`graffiti-curation-measure.mjs`), o MESMO inventário
  (`graffiti-art-inventory.mjs`, `trackGraffitiCanvases` como init-script ANTES do import
  das texturas), o MESMO predicado (`predicadoVerde` importado do ego) e o MESMO MUTADOR
  (extraído do fonte do ego), dirigidos pelo **Chromium do portão-browser**: Playwright do
  root **global** (`npm root -g`), `CHROME_BIN`; SwiftShader no Linux e backend padrão no Mac, `BASE` obrigatória
  apontando para o servidor do próprio runner. Nada é instalado; sem `BASE` não lança
  nada (exit 2).
- **Não é**: QA pessoal do Root — esse continua no EgoSpace32 pelo ego-gate. Este
  adaptador **não abre Ego, não faz fallback** Ego→Playwright e não controla browser alheio.

## Comandos

```bash
node tools/eval/graffiti-current-ci-check.mjs --self-test            # sem navegador, sem BASE
BASE=http://localhost:8123 node tools/eval/graffiti-current-ci-check.mjs            # 14 mapas nominais
BASE=http://localhost:8123 node tools/eval/graffiti-current-ci-check.mjs --mutante=duplicada
BASE=http://localhost:8123 node tools/eval/graffiti-current-ci-check.mjs --mutantes # bateria nominal+todos
BASE=http://localhost:8123 node tools/eval/graffiti-current-ci-check.mjs --map=ferro_velho --json=/tmp/ci-grafite
node tools/eval/graffiti-current-accept.mjs --prova                  # avaliador puro
```

`--map=` aceita `all` (default, os MESMOS 14 mapas extraídos do ego) ou lista estrita de
ids. `--json=DIR` cria o diretório e grava por mapa `{ curation, raw: { nominal, pos } }`
(medição integral como prova; caminho privado, nunca `tools/`/`public/`; sem credenciais).
A ligação em package/workflows é preparada separadamente no checkout QA e exige revisão de integração antes do push.

## Protocolo (idêntico ao ego, ver CONTRATO-ATUAL para a motivação de cada regra)

- **Ordem da prova**: nominal verde com os MESMOS predicados ANTES de qualquer mutação;
  nominal vermelho encerra o mapa sem mutar (RED 1 chega ao main). Só então o MUTADOR
  aplica o patch REAL de cena e a medição repete. Mutante que **aplica 0** é infra (3).
- **Cláusulas/mutantes**: tabela extraída do fonte do ego (`duplicada`, `peca-no-ar`,
  `ferro-fora-b`, `piscina-azul`, `wireframe`, `canal-uv`, controle `draw-groups`).
  Zona exige `outside===1` E `unsupported===1` com as demais zero (efeito acoplado pelo
  produto). `wireframe` exige motivos exatos `wireframe`+`nao-medido` iguais somando
  `unknown`; `canal-uv` exige só `uv-canal`. Aprovação nominal exige `unknown===0` sempre.
- **Fail-closed de infra**: coletor de eventos **antes de qualquer navegação** (resposta
  ≥400 da BASE, `requestfailed`, `pageerror`, console `load failed` → exit 3 mesmo com
  métrica completa; no Playwright os eventos são push — não há drenada manual, mas o
  coletor nasce junto com a página). Fim de carga = `MAPEVAL.ready` + **1,5 s de silêncio
  de rede** da BASE; `__mapId` tem que bater com o pedido. Métrica pesada agendada na
  página (`setTimeout` 500 ms) e lida por poll, com as mesmas esperas do ego (poll do job pronto em até135s, sem sono fixo de45s). Todo código serializado (`medirCuradoria`, `trackGraffitiCanvases`, MUTADOR)
  é compilado executável por `vm.Script` antes do launch.
- **Protocolo estrito do veredito**: cobertura exata por plano (sem ausência/duplicação/
  mapa extra), shapes validados (`validarResumo`: contadores inteiros ≥0, `unknownMotivos`
  coerentes com a soma, `nominalVerde` recalculado por `predicadoVerde` contra a flag
  ecoada) — violação é exit 3, nunca GREEN de subconjunto.
- **Prefs isoladas**: contexto efêmero por execução; `quality=med`/`manual` gravados num
  storage que morre com o `context.close()` (finally) — não há restauração a dever, ao
  contrário do ego que restaura chaves do TaskSpace do Root.
- **Sem claim de FPS/pixels**: nada aqui mede desempenho nem aprova estética; só o
  predicado nominal do contrato.

## Códigos de saída

`0` GREEN · `1` RED semântico · `2` uso/config (antes de qualquer launch) · `3` infra.

## Duplicação declarada e paridade

Três regras de controle vivem duplicadas em
`graffiti-current-accept.mjs` e são provadas iguais ao fonte do ego no `--prova`/`--self-test`:

1. `verdeSem` — cópia declarada; o prova **extrai a função do fonte do ego** e compara as
   duas sobre bateria exaustiva (768 combinações de contadores × zero-arte × arteEsperada × seis exceções).
2. Escada de aceite (`avaliar`) — reimplementação da lógica inline do `main()` do ego;
   tabela de mutantes e MUTADOR **não são duplicados**: são extraídos do fonte por
   `carregarDoEgo()` (falha alta se os marcadores sumirem).
3. `MUTANTES_ZONA` (par causal outside+unsupported) — checada contra a tabela extraída.

Controles de paridade: `--prova` (19 cláusulas de aceite + 10 contraprovas de protocolo),
`--self-test` (CLI/uso/2/infra-3 acima), e a bateria `--mutantes` real no Chromium, que
exige nominal 14/14 GREEN antes de qualquer mutante.

## Estado vigente: identidade editorial pós-alias

O nominal Ego14 R21 pós-alias registrou 14 mapas, 458 peças e os cinco contadores zero,
com preferências restauradas. Veredito e raw: `audits/2026-10-31-visual-consistency/curation-Ego-14-R21*`.
A crítica independente `CRITICO-CURATION-EGO14-R21-COERENCIA-R1.md` conferiu 597 relações
e a igualdade de contagens/distribuição com os 14 nominais `curation-identity-CI-R6/*.json`.
Os seis pins atuais e os 14 hashes raw foram reconferidos contra `8ee224e48` em
`review-r71-fixes-r73/preflight-r21-pins.json` no mesmo diretório de auditoria.

O log R21 conserva GREEN, mas não o envelope bruto nem hashes dos JS servidos na
navegação. Essa limitação impede certificar retrospectivamente esses bytes; não
transforma UNKNOWN em GREEN nem constitui aprovação estética geral ou de produção.
O transporte CI e os checkpoints anteriores descritos abaixo são históricos;
seus GREEN anteriores ao alias não provam ausência de repetição editorial.

## Histórico de implementação

Implementado e verificado **offline apenas** (`--self-test`, `--prova`, contraprovas de
CLI/exit codes; nenhum navegador, mapa ou servidor foi aberto nesta rodada — lease
proíbe launch aqui). Execução real no Chromium do CI é pendência do Root, junto com a
ligação no `portao-browser` (mesmo padrão `eval:serve` + `CHROME_BIN` do `eval:grafite`).

## Root R3
A barreira verifica erros/protocolo ANTES de qualquer mutador, tanto na bateria inicial como em cada recarga de variante; infra3 prevalece sobre RED1. --json resolve o ancestral real e recusa symlink para public/tools antes do mkdir/launch; escrita também valida resultado integral. Mac usa backend padrão como boot; Linux mantém SwiftShader. O poll espera o job pesado até135s sem atraso fixo de45s (o atraso do Ego é limite do SDK pessoal, não contrato da medição).


## Validação de transporte CI e fixtures físicas

R3 fonte CLEANee0ec016 fecha precedência de infra, barreira antes de mutar e caminho JSON por realpath. A bateria R4 realizou71medições:14nominais465peças, duplicação e peça no ar isoladas, zonas com efeito acoplado, wireframe/canalUV e draw-groups como controle positivo. Exit0. As fixtures duplicada/peca-no-ar agora alteram uma peça existente e preservam reconciliação geométrica; não criam clone sem metadado. Crítico independente20d25bc6 passou34controles e9JSONs. EgoR15 confirmou duplicada em Ferro com prefs restauradas.

Esta rodada ainda contava identidade por arquivo. Revisão visual posterior encontrou tag-fina/tag-larga como a mesma arte com recortes diferentes. Alias e bake posterior já foram concluídos, conforme `GRAFITE-IDENTIDADE.md`; a prova nominal pós-alias é a R21 acima. O GREEN anterior não prova ausência dessa repetição semântica.
