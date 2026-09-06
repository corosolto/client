# Candidato integrado: Lobisomem Mítico

**Worktree:** `miticos-integracao-priority`
**Branch:** `astra/miticos-integracao-priority`
**Base:** `origin/main` em `42c01175` (`v2.0.0-alpha.235`)
**Data:** 06/09/2026

## Continuidade da revisão local

Objetivo: revisar seleção, primeira/terceira pessoa, animação, mãos/arma, HUD e
resultado na lane deste PR, sem navegador, merge ou release. Pronto para esta etapa
significa evidência local comparável, regressões protegidas e limites explícitos no PR.
Base da revisão: `f03c0a9c`, após fast-forward dos commits automáticos do PR #532.

Reproduzidos no runtime Three com GLBs reais: facção M gerava aliados de outros times;
links de inspeção rejeitavam M; luva opcional usava a cor neutra. Corrigidos na lane.
O padrão só-arma de primeira pessoa foi preservado. As imagens de resultado eram
idênticas; agora derivam de renders 3D diretos, exportados em alpha para os nomes
`lobisomem-vitoria.webp` e `lobisomem-derrota.webp`.

Animação: pack compartilhado enterrava as patas; retarget simples foi rejeitado por
flutuação em idle e crouch. Candidato atual adapta os clipes ao rig e assa contato de
patas por Y da raiz nos estados terrestres. Rotações, salto e morte são preservados.
Primeira amostragem do controlador passou CHR3; validação entre keyframes e crítica
visual ainda em andamento. Não equivale a aprovação para release.

Mãos opcionais em primeira pessoa continuam visualmente fracas quando ligadas: o modo
default segue arma בלבד, e o render com mãos existe só como evidência da limitação
herdada do rig compartilhado.

Evidências e logs: `artifacts/miticos-review/` (fora do Git). Instrumentos:
`tools/eval/miticos-runtime-review.mjs`, `tools/eval/miticos-render-review.py` e
`tools/ground-lobisomem-anims.mjs`. Render offline não executa WebGL nem CSS.
Próximo passo: amostrar ciclos completos, renderizar antes/depois, revisar ângulos
opostos e o modo opcional de mãos, executar gates, criar checkpoints e atualizar o PR.

## Escopo entregue

Este candidato introduz somente a facção `M` com **um único personagem selecionável**:
`lobisomem`. O fluxo de seleção cria o roster M, pré-carrega
`public/models/characters/lobisomem.glb`, aplica a paleta/brasão M e carrega a mídia
correspondente de seleção e resultado.

A fonte dos assets é limitada aos commits históricos `f05edaf9` (GLB e vídeos) e
`e4f52162` (avatar e resultados estáticos). A arte da placa e o brasão já pertenciam à
mesma linha histórica. Não houve geração de arte ou alteração de mapas, áudio, backend ou
viewmodel.

## Exclusões deliberadas

O roster M contém exatamente `lobisomem`. Cuca, Saci, Lampião, Maria Bonita, Curupira,
Zumbi, Boto e Bandeirante continuam fora do runtime por seus bloqueios visuais registrados.
Este PR não declara o time Mítico completo pronto.

O fallback estático usa o avatar aprovado também como `chars-hero`; em navegadores com
WebGL, o caminho normal é o GLB real. Isso evita referência quebrada sem apresentar uma
nova arte como se fosse aprovada.

## Evidência técnica

- `node tools/eval/miticos-lobisomem-integration-check.mjs`
  - roster `M/lobisomem`, dez assets, SHA-256 do lote
    `cee31d103554b1d1ae5d3939ae94429d4594cf068f6fb1af5338f15dc95aa336`.
- `node tools/eval/miticos-lobisomem-integration-check.mjs --mutate=sem-lobisomem`
  - reprovou a remoção do registro da seleção.
- `node tools/eval/faccao-paleta-check.mjs`
  - M coberto por `base`, `escura` e `palida`; nenhuma paleta duplicada.
- `node tools/eval/redesign-check.mjs`
  - 45 personagens com avatar, seleção e dois resultados; 135 vídeos VP9; auditorias de
    mídia e imagem atualizadas para os hashes publicados.
- Leitura do GLB com `NodeIO` + `ALL_EXTENSIONS`
  - uma cena, 28 nós, uma malha, uma skin, uma animação, um material e três texturas.

## Limites antes de release

Não houve navegador nem partida manual neste trabalho. Os gates provam registro, assets,
formato e contratos de seleção; não substituem revisão humana de pose, contato da escopeta,
animação e resultado dentro de uma partida real. O candidato requer essa revisão antes de
merge ou release.
