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
O padrão só-arma de primeira pessoa foi preservado. Os retratos de resultado voltaram à
mídia aprovada em `ac633518`; a seção seguinte registra a medição que rejeitou os
renders offline.

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

## Retratos de resultado: medição e decisão

`c90796ab` trocou o par aprovado em `ac633518` (77854 B, idêntico nos dois desfechos) por
dois renders offline e deixou `UIR19` vermelho. Medido em `tools/eval/redesign-check.mjs`,
com os arquivos de `c90796ab` no disco:

```
✗ UIR19 · resultado enquadra o personagem inteiro como recorte alpha
  2/90 artes cortadas, opacas ou no quadro errado:
  lobisomem-derrota.webp 1024×1536 alpha=true margens=9.7/25.4/44.7/27.0
  lobisomem-vitoria.webp 1024×1536 alpha=true margens=23.4/35.2/29.8/24.0
```

`UIA1` estava vermelho pelo mesmo motivo: `redesign-static-audit.json` continuou com
`67c827bc…`, o hash do lote aprovado, enquanto o disco entregava `91c2ae16…`. Restaurar a
mídia devolve o hash gravado à verdade, sem reescrever a auditoria para acompanhar o disco.

Três candidatos foram medidos contra os 88 retratos aprovados do elenco
(`artifacts/miticos-portraits/evidencia-candidatos.png`, luma/contraste/cores em canal
opaco `alpha ≥ 231`):

| candidato | topo | altura útil | luma | contraste | cores | UIR19 |
| --- | --- | --- | --- | --- | --- | --- |
| `c90796ab` (publicado em HEAD) | 0,2904 | 0,4772 | 40,5 | 21,8 | 241 | vermelho |
| render offline, tint branco | 0,0690 | 0,8997 | 88,8 | 34,0 | 786 | verde |
| render offline, tint e luz do runtime | 0,0690 | 0,8997 | 43,9 | 20,8 | 332 | verde |
| **`ac633518` (aceito)** | 0,1081 | 0,8366 | 31,2 | 28,8 | 820 | verde |
| envelope dos 88 aprovados | 0,0690–0,0801 | 0,8887–0,8997 | 28,0–156,2 | 26,1–61,9 | 473–7235 | — |

Os dois renders offline foram rejeitados por medição, não por gosto:

- Com tint branco a pelagem some: a razão retrato/avatar fica em 2,196 contra 0,754 do
  material aprovado; o lobo publica cinza claro onde `public/img/chars/avatars/lobisomem.webp`
  e os dois vídeos de resultado mostram pelo escuro violeta.
- Com o tint e a luz do runtime (`baseColorFactor` 0,3/0,32/0,36) a imagem cai para
  `contraste` 20,8 e `cores` 332, abaixo do mínimo do elenco aprovado (26,1 e 473).
- Causa raiz do equipamento: o GLB é `metallic=1`, o rig offline usa Principled dielétrico
  e as três áreas de luz do modo retrato saturam o especular. Baixar o albedo 3,3× moveu a
  luma só de 88,8 para 82,0 — a imagem é brilho, não pelagem. O modo `--portrait` e o
  normalizador foram removidos da árvore e ficam recuperáveis em
  `artifacts/miticos-portraits/rejeitado/`.

A convenção do elenco publicado também foi medida: 44 dos 45 pares de `.webp` de resultado
são byte-idênticos entre vitória e derrota, e 0 dos 45 pares de `.webm` são. O desfecho vive
no vídeo; o `.webp` é fallback compartilhado. Restaurar `ac633518` devolve o elenco a 45/45,
e `tools/eval/miticos-lobisomem-integration-check.mjs` passou a cobrir as duas metades dessa
convenção no lugar do teto sem procedência que exigia poses distintas.

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
- `node tools/eval/miticos-lobisomem-integration-check.mjs --mutate=<m>`
  - os seis mutantes (`sem-lobisomem`, `roster`, `links`, `gloves`, `resultados`, `clipes`)
    ficaram vermelhos; `resultados` reprova o par estático fora da convenção do elenco.
- `node tools/eval/faccao-paleta-check.mjs`
  - M coberto por `base`, `escura` e `palida`; nenhuma paleta duplicada.
- `node tools/eval/redesign-check.mjs`
  - 45 personagens com avatar, seleção e dois resultados; 135 vídeos VP9; auditorias de
    mídia e imagem atualizadas para os hashes publicados; `UIR19` verde com 90/90 recortes.
  - `--mutante=resultado-sem-alpha`, `--mutante=resultado-derrota-sem-alpha` e
    `--mutante=resultado-nao-auditado` ficaram vermelhos em `UIR19`/`UIA1`.
- `npm run check:fast`
  - 121/124. As três reprovações são anteriores a este trabalho e fora dos arquivos tocados:
    `audio:check` e `eval:audiofablocal` (pacote de áudio não baixado no worktree; além
    disso `CHARACTER_IDS` em `tools/audio/fab-game-local.mjs` tem 44 ids e não inclui
    `lobisomem`, então `LAB8e` marca 44/45) e `eval:grafitelayout` (layout do Escadão
    defasado, outra lane).
- Leitura do GLB com `NodeIO` + `ALL_EXTENSIONS`
  - uma cena, 28 nós, uma malha, uma skin, uma animação, um material e três texturas.

## Limites antes de release

Não houve navegador nem partida manual neste trabalho. Os gates provam registro, assets,
formato e contratos de seleção; não substituem revisão humana de pose, contato da escopeta,
animação e resultado dentro de uma partida real. O candidato requer essa revisão antes de
merge ou release.

Fica aberto, fora do escopo desta lane: `lobisomem` não tem perfil físico de áudio
(`CHARACTER_IDS` em `tools/audio/fab-game-local.mjs`), o que mantém `eval:audiofablocal`
vermelho em `LAB8e`. O conserto exige regerar o manifest com o pacote de áudio presente.
