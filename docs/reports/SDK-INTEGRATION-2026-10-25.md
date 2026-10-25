# SDK integrado à main — 25/10/2026

## Objetivo e definição de pronto

Integrar o pacote existente de mapas JSON/Construtor/CLI sobre a main corrente, preservando os checkouts de origem e a contribuição #1088, e executar o caminho exportação real → CLI → motor nessa árvore. Esta entrega é uma candidata técnica local revisável. Pronto para produção ainda requer revisão de integração, CI remoto, recibo de browser/preview e o fluxo de publicação autorizado.

## Base, ownership e recuperação

- Checkout: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/sdk-main-integration-20261025`.
- Branch: `codex/sdk-main-integration-20261025`.
- Base remota revalidada: `c1bae41cdf9317623071baff1e9aa1c24ac88cc6`, release alpha.126.
- Fonte do pacote: `codex/mapjson-file-check-20261025` em `cc8014667a7f81d588ccca9ad61bb7f7e62c6ed3`.
- Sete cherry-picks com `-x` preservam a autoria: `5262873b9`, `922cf57f8`, `2927d6db1`, `ea168f543`, `d91518c9c`, `ecc2f430e`, `46e3cba33`.
- As origens SDK e Loja H permaneceram intocadas. A issue #1088 continuava OPEN, atribuída a `nunreasonable`; não houve contato, atribuição ou tarefa concorrente.
- A correção descrita abaixo está no mesmo commit deste relatório. O recibo externo `audits/2026-10-25-factory-resume/gameplay-sdk/CONTINUATION.md` registra seu SHA após o checkpoint.

A criação pelo app foi tentada, mas respondeu “Not a git repository” para o agregador. Foi criado um worktree Git isolado sobre a base explícita. Nenhum push, merge, deploy, alteração remota ou registro permanente de mapa foi feito.

## Defeitos reproduzidos e corrigidos

### Entrada da grade sem limite

`waypoints.step=0`, negativo ou minúsculo fazia o laço gerar nós indefinidamente ou consumir memória. Em subprocessos com heap de 64 MiB, casos zero/negativo/minúsculo/bounds enormes encerraram por SIGABRT; segmentos muito longos excederam o timeout de 2 s. O problema estava antes da validação estrutural do mapa.

A entrada agora exige bounds positivos finitos (incluindo o dobro sem overflow), step positivo finito e inset finito entre zero e o menor semieixo. Antes da alocação, calcula um teto conservador de células e trabalho: `cells² + cells * 8 * edgeSamples <= 2**24`, com segmento amostrado a cada 0,45 m. O primeiro termo cobre a comparação quadrática existente; o segundo cobre as até oito células vizinhas e o custo de segmentos grandes. Este é um limite operacional de cálculo, não uma nota de qualidade visual ou de gameplay. Contadores inteiros limitam as iterações. O limite não pretende limitar tamanho do arquivo, número de caixas/props/rampas ou todo recurso consumido por JSON não confiável.

A CLI retorna diagnóstico controlado com exit 1 para 11 entradas inválidas: zero, negativo, minúsculo e null em step; bounds enormes, com overflow e negativos; inset negativo e além dos bounds; segmentos enormes e grade de custo quadrático excessivo. Nenhuma delas termina por timeout ou sinal após a correção.

### Delete/Backspace no campo de texto

O handler global excluía o objeto selecionado ao apagar caracteres em input, textarea, select ou contentEditable. O handler real, extraído do HTML e executado em VM, confirmou oito exclusões indevidas antes da correção. Agora ignora campos editáveis e composição IME; no canvas preserva Delete/Backspace e previne o comportamento padrão. Os 15 casos comportamentais cobrem esses cinco contextos com Backspace, Delete e ArrowLeft. É uma prova do handler; não substitui a interação de browser.

O novo `eval:construtor-input` integra `eval:mapjson`. Os 26 casos passam. O registro anterior e posterior está na auditoria externa.

## Resultado rejeitado durante a revisão

Uma primeira versão do limitador calculou coordenadas por índice (`origem + índice * step`). O arredondamento diferente acrescentou o nó `(5.800000000000001, 3)` no limite inflado de uma caixa, alterando o export de 94/598 para 95/608 nós/arestas. Essa versão foi rejeitada, mesmo passando os contratos estruturais.

A versão final mantém as somas acumuladas originais, a condição geométrica de fim e contadores com teto conservador `ceil(span/step)+1`. Comparação em processos separados comprovou equivalência **byte a byte de nodes+adj**:

| Entrada | Nós / arestas | SHA256 do JSON nodes+adj (com newline) |
|---|---:|---|
| Export real | 94 / 598 | `8f4096dbea6b6a7ce9a441003dcac281f4ea7c7b6db52b0109224313ba64ca09` |
| Fixture versionada | 117 / 724 | `13007917d12abc610643b7b263297d7d1b6c2f27bb76d6cb60c4f8231e4f3c99` |

A equivalência é do grafo dessas duas entradas, não de toda a simulação nem de todos os possíveis JSONs.

## Evidência na árvore integrada

Todas as provas abaixo executaram neste checkout sobre main, com Node v23.6.0:

- `eval:mapjson`: entrada válida, 26 regressões de input/teclado e cinco mutantes estruturais verdes.
- `eval:mapjsonboot`: motor e mutante de relevo verdes.
- `eval:mapcontrato`: 18 mapas verdes.
- `eval:spawn`: 308 posições em 18 mapas verdes.
- `eval:modgraph`: grafo normal e mutante verdes.
- `docs:check`, sintaxe dos dois JS/HTML afetados e `git diff --check` verdes.
- Export real na CLI: exit 0; spawn fora da área: exit 1; JSON malformado: exit 2.
- Export real em Game: 94 nós, 598 arestas, três bandeiras, dois spawns por time com posição/yaw preservados, água/lentidão aplicada e 12/12 rotas spawn → bandeira.
- Simulação determinística de 20 s: sete bots efetivos, deslocamento amostrado de **147,15683 m**, acima do piso B3 existente de 20 m. O SDK original sobre sua base antiga produziu 196,6668 m; a árvore integrada já produzia 147,15683 m antes da correção da grade. Não se atribui essa diferença ao limitador e não se declara a simulação inteira idêntica.
- Mutantes que removem flags ou slowAt do mundo falham nos respectivos contratos, exit 1.

Os contratos amplos de mapas/spawn/modgraph foram executados após os cherry-picks e antes da correção restrita a map_json/keydown. Os gates mapjson, motor, export e negativos foram repetidos após a correção final. Não foi rodada a suíte inteira de deploy.

O gate adicional `eval:shaderbudget` passou SB1–SB6. SB7 não concluiu: seu servidor de teste não encontrou Astro no momento da execução. Posteriormente `npm ci --ignore-scripts --prefer-offline --no-audit --no-fund` instalou 408 pacotes locais, sem modificar lockfile; a instalação em shell emitiu avisos de Node 16.13, enquanto as provas via subprocesso usaram Node 23.6. Não repetimos esse gate opcional, por orientação do integrador para não ampliar a suíte. Esse registro não é um PASS de SB7.

## Arquivo e artefatos

Exportação real obtida pelo owner do editor às 08:56 UTC, reutilizada sem alteração:

`/Volumes/Zenith/Projects/game/corosolto/analysis-media/2026-10-25-mapjson-editor-qa/arena_treta.json`

SHA256: `2bff609b20a7fcef6090159c2b3fae63274ead57b11b5de5129d4eae52635134`.

Auditoria desta integração:

`/Volumes/Zenith/Projects/game/corosolto/csbrasil/audits/2026-10-25-factory-resume/gameplay-sdk/integrated`

Contém `results.json` (gates iniciais), `final-results.json` (gates após correção, incluindo SB7 incompleto), logs individuais, provas antes/depois de inputs, `grid-equivalence.json`, dumps e `dump-grid.mjs`. O probe de Game está um diretório acima: `export-to-game-probe.mjs`, SHA256 `14e01b25d196525e9b33c60747d1dfe951fc7dd27db4b4b71a28ed4ff70e09fa`.

## Reprodução e próximo passo

No checkout:

```sh
npm run eval:mapjson
npm run eval:mapjsonboot
node tools/eval/mapjson-check.mjs /Volumes/Zenith/Projects/game/corosolto/analysis-media/2026-10-25-mapjson-editor-qa/arena_treta.json
node /Volumes/Zenith/Projects/game/corosolto/csbrasil/audits/2026-10-25-factory-resume/gameplay-sdk/export-to-game-probe.mjs "$PWD" /Volumes/Zenith/Projects/game/corosolto/analysis-media/2026-10-25-mapjson-editor-qa/arena_treta.json
```

O integrador pode revisar e recuperar a candidata pelo branch/checkpoint. Continuam separados: browser real do Construtor pós-fix, preview visual/captura humana, revisão da integração e CI remoto. A exportação entrou no Game via registro em memória do probe; isso não cria importação pública no menu. Loja H mantém seus próprios gates de visual/integração. Nenhuma dessas limitações foi convertida em aprovação de produção.
