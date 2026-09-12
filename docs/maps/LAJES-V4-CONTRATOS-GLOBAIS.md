# Lajes V4 — contratos globais

**Build e sintaxe passaram; 16 dos 20 scripts oficiais executados passaram.** Nesse snapshot inicial houve quatro falhas: pacote geral de assets incompleto, manifesto de áudio ausente/defasado, nove documentos gerados defasados e caminho legado no teste SSR. A sonda separada do handler atual passou; isso não muda o resultado vermelho do SSR oficial. Esta rodada não aprova aparência, movimento, navegação, desempenho ou publicação.

Executado em 06/09/2026, branch `codex/lajes-visual`, HEAD `b3afbcb124066771ee86b8838fcf16cd789d14cb`, Node `v23.6.0`, somente no worktree de Lajes. Janela inicial UTC: 2026-09-06T02:11:45.697Z a 2026-09-06T02:12:17.319Z; repetições terminaram em 2026-09-06T02:12:51.833Z. O builder estava em refinamento visual simultâneo.

## Escopo e estabilidade

Não há script `eval:map-contracts` neste package. Foram usados `eval:mapcontrato`, `eval:mapid`, `eval:mapjson` e `eval:map-source`. O agregado `check:fast`, os `eval:lajes-*`, browser/GPU e `eval:map-new` não foram executados. O último escreve `tools/eval/map_check.json`, já em uso pela frente principal; evitar essa escrita preservou sua evidência. Nenhuma instalação, fetch, cópia de áudio, alteração de produção/package/ledger ou commit foi feito.

A primeira execução de `eval:ambience-registry` passou enquanto o hash de `map_lajes_authored.js` mudou. Sintaxe, contrato geral e ambiência foram repetidos: os três passaram e nenhum dos quatro fontes monitorados mudou durante cada repetição. O build também teve hashes estáveis durante sua execução. Isso descreve os snapshots registrados, não congela edições posteriores. Metadados completos em [results.json](../../artifacts/lajes-visual/v4/global/results.json), [rechecks.json](../../artifacts/lajes-visual/v4/global/rechecks.json) e [start.json](../../artifacts/lajes-visual/v4/global/start.json).

Reprodução: `PATH=/opt/homebrew/bin:$PATH npm run <script>`. Scripts executados sequencialmente, saída inicial limitada a 1,5 MB por passo (nenhum log atingiu o limite), sem interromper processos alheios.

## Resultados oficiais

| Script | Resultado/exit | Segundos | Evidência |
|---|---|---:|---|
| `syntax` | PASSOU (0) | 1.79 | [log](../../artifacts/lajes-visual/v4/global/syntax.log) |
| `eval:mapcontrato` | PASSOU (0) | 3.21 | [log](../../artifacts/lajes-visual/v4/global/eval-mapcontrato.log) |
| `eval:mapid` | PASSOU (0) | 0.37 | [log](../../artifacts/lajes-visual/v4/global/eval-mapid.log) |
| `eval:mapjson` | PASSOU (0) | 0.27 | [log](../../artifacts/lajes-visual/v4/global/eval-mapjson.log) |
| `eval:map-source` | PASSOU (0) | 0.11 | [log](../../artifacts/lajes-visual/v4/global/eval-map-source.log) |
| `eval:ambience-registry` | PASSOU (0) | 1.54 | [log](../../artifacts/lajes-visual/v4/global/eval-ambience-registry.log) |
| `eval:asset-integrity` | PASSOU (0) | 0.13 | [log](../../artifacts/lajes-visual/v4/global/eval-asset-integrity.log) |
| `eval:gltf-validator` | PASSOU (0) | 0.41 | [log](../../artifacts/lajes-visual/v4/global/eval-gltf-validator.log) |
| `eval:props-acervo` | PASSOU (0) | 0.12 | [log](../../artifacts/lajes-visual/v4/global/eval-props-acervo.log) |
| `eval:propsuv1` | PASSOU (0) | 0.31 | [log](../../artifacts/lajes-visual/v4/global/eval-propsuv1.log) |
| `assert:assets` | FALHOU (1) | 0.27 | [log](../../artifacts/lajes-visual/v4/global/assert-assets.log) |
| `eval:grafite-editorial` | PASSOU (0) | 0.11 | [log](../../artifacts/lajes-visual/v4/global/eval-grafite-editorial.log) |
| `eval:look` | PASSOU (0) | 3.51 | [log](../../artifacts/lajes-visual/v4/global/eval-look.log) |
| `media:check` | PASSOU (0) | 0.12 | [log](../../artifacts/lajes-visual/v4/global/media-check.log) |
| `audio:check` | FALHOU (1) | 0.22 | [log](../../artifacts/lajes-visual/v4/global/audio-check.log) |
| `docs:check` | FALHOU (1) | 11.70 | [log](../../artifacts/lajes-visual/v4/global/docs-check.log) |
| `arch:check` | PASSOU (0) | 0.13 | [log](../../artifacts/lajes-visual/v4/global/arch-check.log) |
| `skills:check` | PASSOU (0) | 0.12 | [log](../../artifacts/lajes-visual/v4/global/skills-check.log) |
| `build` | PASSOU (0) | 7.05 | [log](../../artifacts/lajes-visual/v4/global/build.log) |
| `eval:ssr` | FALHOU (1) | 0.13 | [log](../../artifacts/lajes-visual/v4/global/eval-ssr.log) |

## Falhas e ações concretas

**Assets:** `assert:assets` acusa `public/audio/manifest.json` ausente e **196 de 197 decalques do acervo ausentes**. É a dívida de hidratação já registrada antes da V4, não uma falha introduzida pelas fachadas. Os nove sons de ambiente agora no disco não equivalem ao pacote geral de vozes, tiros e música. O teste deixa o layout de grafite verde, mas reprova a disponibilidade do pack. Não foram baixados arquivos sem procedência individual para mudar o resultado.

**Áudio:** `audio:check` encontra nove arquivos em `ambiente/`, zero alcançáveis pelo manifesto e nove chamados de órfãos. O `soundscape.js` referencia esses nomes diretamente; portanto a mensagem não prova que os nove estejam sem uso no jogo. O manifesto geral está ausente e a geração isolada a partir desses nove não restauraria o pacote completo. A hidratação local do ambiente e a distribuição geral precisam ser verificadas separadamente.

**Documentação:** `docs:check` acusou nove blocos gerados defasados: STATUS.md, README.md, docs/docs/comecando.md, docs/docs/colaborar.md, ARCH.generated.md, docs/docs/arquitetura.md e as traduções EN de comecando, colaborar e arquitetura. A V4 acrescenta módulos e scripts, então a atualização é esperada. Não houve regeneração enquanto a frente principal escrevia. Após fechar os fontes, o integrador deve executar `npm run docs` e repetir `docs:check`. `arch:check` passou para o índice atual (game.js: 7.264 linhas, 273 símbolos).

**SSR oficial:** `eval:ssr` continua procurando `.vercel/output/functions/_render.func/dist/server/entry.mjs`. O build atual declara o handler `.vercel/output/server/entry.mjs`, relativo à função. A mensagem “sem build” vem dessa resolução antiga, embora o build tenha concluído. Esse mesmo defeito foi registrado na rodada anterior em [LAJES-VISUAL-CONTRATOS.md](LAJES-VISUAL-CONTRATOS.md). A correção pertence à ferramenta oficial; ela não foi alterada nesta subtarefa.

## Sonda do artefato SSR

Uma cópia do teste oficial troca **somente a resolução de ENTRY**, usando `.vc-config.json`. A equivalência com a substituição única foi conferida antes de rodar. [Procedência](../../artifacts/lajes-visual/v4/global/ssr-probe-provenance.json), [sonda](../../artifacts/lajes-visual/v4/global/ssr-current-handler-probe.mjs) e [identidade do artefato](../../artifacts/lajes-visual/v4/global/build-artifact.json).

- [Sonda atual](../../artifacts/lajes-visual/v4/global/ssr-current-handler.log): exit 0; /mapa 200, comprimento 20.249; /ranking 200, 16.319; /u/exemplo 200, 14.983. Os números são comprimento de string (`text().length`); o rótulo “bytes” do gate é impreciso. Nenhuma leitura de stream lançou e nenhuma página SSR recalculou o manifesto no request.
- [Mutação corpo vazio](../../artifacts/lajes-visual/v4/global/ssr-empty-mutant.log): exit 1 esperado; as três rotas foram reprovadas mesmo retornando 200.
- O verde da sonda não substitui o vermelho oficial, não representa execução na infraestrutura Vercel e não comprova os serviços externos ou a experiência no browser.

## O que os verdes realmente cobrem

`eval:mapcontrato` valida a forma do mundo, referências de rota e conexidade conforme os tetos herdados de cada mapa; não mede legibilidade dos caminhos nem experiência de respawn. `eval:ambience-registry` valida registro e geometria da fauna e configuração de áudio; não escuta/decode arquivos reais. `eval:look` cobre os três mapas da sua própria seleção; o verde não é uma nota visual da V4 de Lajes.

`eval:asset-integrity` conferiu **56 artefatos finais registrados**; Khronos conferiu **36 GLBs, zero erros e 46 avisos**. `eval:props-acervo` cobre **12 props com marcador v2.1**, exigindo arquivo, SHA e menção em FONTE. Esses checks não certificam toda licença do legado. `eval:grafite-editorial` passou seu escopo editorial/procedência; `docs:check` contém verificações de coerência da licença do projeto, mas não substitui documentação de direitos de cada asset. Nenhum script separado de auditoria universal de licenças foi encontrado no package. As lacunas de origem dos modelos legados continuam descritas em [LAJES-V4-ESCALA.md](LAJES-V4-ESCALA.md).

## Gerados e preservação

Os checks de docs, ARCH, áudio e mídia foram executados exclusivamente com `--check`; nenhum gerado textual foi escrito ou restaurado. O build produziu suas saídas locais normais em dist/.vercel e executou copy-wasm. Antes do build, `public/wasm/resvg.wasm` foi preservado em [before/](../../artifacts/lajes-visual/v4/global/before/public/wasm/resvg.wasm); depois, em [generated/](../../artifacts/lajes-visual/v4/global/generated/public/wasm/resvg.wasm). Os dois têm o mesmo SHA-256 `22bf6e9f9a100d972da0411a69c5ba504367fc1fa87b3b64e3f35e53926d2d70`: não houve mudança de conteúdo a restaurar. [Registro](../../artifacts/lajes-visual/v4/global/generated-after.json).

As saídas de build foram mantidas para inspeção; o handler/config têm identidade registrada. Nenhum reset/checkout geral foi usado e nenhum arquivo modificado pela frente principal foi restaurado. A única documentação escrita por esta subtarefa é este relatório. O próximo passo é fechar a revisão visual da V4, regenerar os nove docs e separar a resolução das dívidas de pack/SSR da aprovação de jogabilidade.

## Integração após congelar a geometria

MAIN repetiu syntax, mapcontrato, ARCH, skills e build: todos passaram, build5,7s (`artifacts/lajes-visual/v4/final-global/results.json`). O registro de ambiência encontrou um gato dentro de um dos novos quartos superiores; seu percurso emx−10 foi deslocado de z12–16 para16–18. A repetição preservada em `eval-ambience-registry-corrected.log` passou AR1–6. Não foi alterado limite da régua. O resultado vermelho intermediário permanece em `results.json`. As falhas do pacote geral/SSR não foram convertidas em verde por esta integração.

Fechamento de entrega:13docs gerados atualizados em`01f0ca25`; `docs:check` agoraPASSOU,26blocos/33marcadores (`final-global/docs-check-final.log`). O build foi repetido após a correção do gato e passou (`final-global/build-delivery.log`). Permanecem as falhas oficiais de assets, audio:check e SSR descritas acima; autoria pós-merge não foi alegada como conferida.
