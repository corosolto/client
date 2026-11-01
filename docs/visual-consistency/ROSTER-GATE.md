# Roster: contrato da régua UIR13 (grade do elenco)

## Origem

Relato do dono em 31/10: *"são muitos personagens, está difícil escolher assim"* — a faixa
horizontal de avatares de 114 px (`--char-thumb:114px`, `overflow-x:auto`) virou GRADE
multiline com rolagem própria, no commit `0e1fe896a` trazido pelo PR #1179
(merge `ad696fb87`). O contrato canônico é a grade vigente em `public/style.css:917–945`;
o rail horizontal de 114 px é estado antigo e NÃO é mais aceito.

## Contrato UIR13 (id preservado)

- **Duas colunas preservadas**: `.char-stage` mantém `grid-template-columns:minmax(280px,360px) minmax(0,1fr)`
  e áreas `"sheet preview" "rail rail"`; as linhas usam `auto minmax(84px,1fr)`, com piso para uma fileira do elenco.
- **Grade elástica**: `.char-list` com `--char-thumb:72px`, `display:grid`,
  `grid-template-columns:repeat(auto-fill,minmax(var(--char-thumb),1fr))`, `width:100%;max-width:100%`.
- **Rolagem vertical limitada à área do rail**: `max-height:100%`, com
  `overflow-y:auto`, `overflow-x:hidden` e `overscroll-behavior:contain`.
- **Controles laterais**: `.char-filmstrip` usa grid `44px minmax(0,1fr) 44px`;
  as setas44×44 deixam a altura disponível para a grade. A lista tem mínimo de uma
  fileira, e o palco touch usa `auto minmax(84px,1fr)` em vez de travar a rail em114px.
- **Preview não colide**: `#char-preview` mantém `max-height:calc(100% - 28px)` e `.pv-hints` é `flex:0 0 auto`.

Instrumento: `node tools/eval/redesign-check.mjs` (`eval:redesign`), contrato
`selecaoDuasColunas`. As capturas de UI anteriores ao #1179 não julgam a GRADE — a
verificação visual da grade nova cabe ao revisor (Root), não a este documento.

## Mutantes (cada um acende SÓ a UIR13)

| Mutante | Mutação | Decisão desfeita |
|---|---|---|
| `selecao-tres-colunas` | stage ganha coluna de 96 px | ficha + preview são as duas únicas colunas |
| `selecao-thumbs-pequenos` | `--char-thumb` da grade 72→36 (não o stage 114) | thumb do elenco é 72 |
| `selecao-rail-descentrado` | filmstrip coluna central `minmax(0,1fr)`→`160px` | grade se espalha pela segunda linha |
| `selecao-grade-sem-rolagem` | `overflow-y:auto;overflow-x:hidden`→`visible;visible` | grade multilinha tem rolagem própria |
| `selecao-controle-colide` | preview `max-height:calc(100% - 28px)`→`none` | preview respeita a linha do elenco |

Rodada de 31/10 (Node 26, worktree `consistencia-visual-release-20261031`): nominal VERDE
(49/49 contratos, incl. UIR13) e os cinco mutantes acima ficaram vermelhos com aplicação
única — nenhuma outra invariante caiu.

R2 Root: os cinco mutantes de UIR13 agora executam o nominal em subprocesso antes da
variante. A grade só é detectada com o mesmo conjunto de IDs e exatamente UIR13
vermelha; qualquer outra falha reprova, nominal vermelho/erro de filho é INFRA3.
CLI rejeita vazio, duplicado, sufixo e opção desconhecida.

A captura real R1 em844×390 encontrou lista de apenas10px, apesar do gate verde.
GLM ajustou o CSS para liberar altura à grade. A medição isolada de Playwright do GLM
não é aceita como QA desta missão; fotos e interação no Ego após o fix ainda pendentes.

### R3 — recaptura real e interação

Ego Space32 p1, desktop1320×880 e touch844×390: após o segundo ajuste CSS a grade horizontal começa emy183,90 e termina362, abaixo da ficha (até175,5) e botão (até163,70). Altura178,1, duas fileiras72px completas e rolagem interna até49itens. Clique real no último selecionou Dona Floresta; seta anterior selecionou Xandão da Toga (índice47). Imagens carregadas semfalha. Desktop preservou3fileiras244px; portrait390×844 mantém aviso de rotação. Evidências ui-grade-legacy-R3-photos.json e interaction.json no auditroot, fotos R3. Crítico visual/CSS em curso; sem prova física de aparelho mobile nem FPS. WrapperR2 crítico CLEAN com120contraprovas, sha9a061264.
