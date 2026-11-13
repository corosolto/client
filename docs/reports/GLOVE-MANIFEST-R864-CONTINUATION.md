# Continuidade do instrumento de manifesto TP R864

Objetivo: medir o Game e os loaders reais contra uma source-root imutável, antes
do reparo, e demonstrar recovery após uma falha transitória, bloqueio após a
segunda, rearm explícito, concorrência, negativos definitivos e token antigo.
O instrumento não aprova aparência, MP, mobile ou release. A missão integral
continua; #1158 excluído e UI/social depois.

Branch `codex/tp-glove-manifest-retry-r864-20261101`, base
`1e69c84949d8b7d91e4d6ad9d4da0a02df00107c`. Somente checker e documentação
pertencem a esta lane. W766/W770 e public JS são de Root e não serão editados.

Política de Root: uma recuperação automática por demanda efetiva origem+estilo;
após a segunda falha de manifesto, ensures não repetem I/O. Off/on, estilo ou
origem rearma. Ausência válida e falha do GLB continuam negativas definitivas.

O checker roda em Node 22 e usa o `harness.mjs`, os módulos e os GLBs da
`--source-root`. A dependência Three vendorizada deve estar preparada nessa
origem. A ferramenta recusa ausência do shim; não instala dependências. Cada
cenário ganha processo novo e só personagens/armas são aquecidos. O manifesto
das luvas começa frio. Texturas viram DataTexture CPU; as geometrias, skeletons,
GLTFLoader e Game são reais.

```sh
node tools/eval/tp-glove-manifest-retry-check.mjs \
  --source-root=/caminho/absoluto/client \
  --json=/caminho/absoluto/nominal.json \
  --artifacts=/caminho/absoluto/logs

node tools/eval/tp-glove-manifest-retry-check.mjs \
  --source-root=/caminho/absoluto/client \
  --mutante=cache-forever \
  --json=/caminho/absoluto/mutante.json \
  --artifacts=/caminho/absoluto/logs-mutante
```

`--product-copy=/caminho/absoluto/copia` permite medir arquivos privados
`game.js`, `glbchars.js` e `main.js`, com os demais imports/assets da origem.
`--case` restringe nominal; `--mutante` usa seu grupo focal fechado, sempre com
nominal verde antes. O recibo contém casos, contadores, hashes, nonce e caminhos
separados de stdout/stderr. GREEN/DETECTED saem 0, RED sai 1, CLI inválida sai 2
e INFRA sai 3. Âncora ausente/duplicada e falha de loader são INFRA, sem crédito
de detecção. Os prazos do processo detectam travamento de infraestrutura.

Assegura recuperação HTTP/rede/JSON/shape, bloqueio após falha persistente com
20 ensures, rearm off/on, estilo e origem, erro antigo A→B→A, duas Games com
preload concorrente, aviso compartilhado e cache negativo de pacote/GLB. A
checagem aguarda o loader e chama a ensure que consome a prontidão antes de
avaliar o attachment. Confere as partes publicadas por identidade de geometria,
bones do mesmo corpo e identidade do corpo/controller/mixer.

Resultados medidos, comandos exatos, fontes fixadas, versões descartadas e
artefatos estão em
`audits/2026-10-31-visual-consistency/GLOVE-MANIFEST-RETRY-R864-REPORT.md`, no
workspace agregador. A matriz aceita fica no arquivo de mesmo prefixo
`ACCEPTED-MATRIX.json`. Baselines antigos BASE/S4 são RED sem INFRA; o produto
BASE de Root e a proposta S4 em cópia privada são GREEN, e os mutantes causais
têm failsets exatos. O relatório externo é a fonte dos números medidos.

Autoria do instrumento: Codex. A política e a contraproposta são Native/Root,
com proposta anterior de GLM qualificada no R857. Este trabalho não oferece
review independente. O terceiro consumidor exercita o preload real com catch
equivalente ao owner; não executa o preview DOM/main. `main.js` é fixado por hash,
mas não importado. Arma/pose/morte/dispose/dedicado e a matriz antiga continuam
sob os controles existentes e a validação integradora de Root. Sem browser,
aceite visual, MP, mobile ou certificação de CI nesta medição.

Próximo passo: Root adota checker/documentação, roda a matriz antiga e seus
gates sobre o produto aplicado, e conclui os ciclos de bot e crítico no head
novo. Nenhuma fonte de produto foi alterada nesta worktree.
