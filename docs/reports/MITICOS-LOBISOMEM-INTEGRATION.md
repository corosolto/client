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
default segue arma apenas, e o render com mãos existe só como evidência da limitação
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
- `npm run check:fast` (07/09, depois do merge da `main` em `2.0.0-alpha.239`)
  - **125/127.** As duas reprovações são anteriores a este trabalho e fora dos arquivos
    tocados: `audio:check` (pacote Fab não baixado neste worktree — `manifest.json
    DEFASADO em relação ao disco`) e `eval:grafitelayout` (a geometria do Escadão mudou na
    `main` e o layout não foi regerado; esta branch não toca nenhum `map_*.js`).
  - Passaram a verde no caminho: `eval:audiofablocal` (o id entrou em `CHARACTER_IDS`,
    BUG-147), `feet:check` (`foot-offsets.json` regerado; os 44 offsets saíram idênticos,
    só o carimbo estava velho), `eval:comentario` (CM1 — os comentários voltaram ao teto
    de 2 linhas e a evidência virou BUG-149), `docs:check`, `arch:check` e
    `eval:docsautoria`.
- `npm run build` — completo, com a poda do publicado.
- Leitura do GLB com `NodeIO` + `ALL_EXTENSIONS`
  - uma cena, 28 nós, uma malha, uma skin, uma animação, um material e três texturas.

## Procedência dos binários (incorporada do PR #528)

O PR #528 é o relatório que concluiu, sobre a `main` de 06/09, que **não existia patch
escopado possível** para o Lobisomem: os sete binários não estavam na `main`, `GLB_CHARS`
não listava o personagem e não havia facção Mítico, então trazer só a mídia geraria
assets órfãos. A recomendação 1 daquele relatório era *"integração do personagem/facção
Mítico em PR própria, com o wiring de `glbchars.js` e roster, e então validar seleção +
partida real"*. **Este PR é esse veículo**, e por isso #528 fica supersedido — a análise
dele não é reaplicada aqui como documento, só o que nela é fato duradouro:

| arquivo | commit de origem | blob |
| --- | --- | --- |
| `public/models/characters/lobisomem.glb` | `f05edaf9` | `229754f5` |
| `public/video/chars/lobisomem.webm` | `f05edaf9` | `215bb26e` |
| `public/video/resultado/lobisomem-derrota.webm` | `f05edaf9` | `97e4021b` |
| `public/video/resultado/lobisomem-vitoria.webm` | `f05edaf9` | `380a6126` |
| `public/img/chars/avatars/lobisomem.webp` | `e4f52162` | `9675a565` |
| `public/img/resultado/lobisomem-{vitoria,derrota}.webp` | `e4f52162` | `94b7aa10` (o MESMO nos dois) |

O GLB não é o "delta da cauda": ele passou por seis commits entre a base comum
(`dc634392`) e `f05edaf9` — `4e198dfd` → `fbed2fc7` → `03fdf24d` → `9b80d299` →
`eb1491b2` → `f05edaf9` —, indo de 1.007.904 para 2.755.204 bytes, acumulando regeração,
retarget e retextura. A aprovação registrada na origem é incremental (66 vértices de
cauda, 3547 preservados) e **não cobre** empunhadura nem release.

Os dois pontos que #528 levantou como risco estão resolvidos ou explícitos aqui:

- **retratos idênticos nos dois desfechos** (blob `94b7aa10`): deixou de ser acidente e
  virou convenção medida — 44 dos 45 pares `.webp` publicados são byte-idênticos e 0 dos
  45 pares `.webm` são; o desfecho vive no vídeo. O mutante `resultados` do
  `eval:miticos-lobisomem` reprova quem foge dessa convenção.
- **"nenhuma partida validada ainda"**: continua sendo o limite principal, agora com o
  navegador atravessado (seção abaixo) e a revisão humana ainda pendente.

## Revisão em navegador (07/09)

O limite "sem navegador" do texto acima **caiu**. `tools/eval/miticos-browser-review.mjs`
sobe Chrome com `astro dev` e mede sete pontos em 3:2, o formato de revisão do dono:
facção (as seis placas, brasão e arte de M), seleção (avatar próprio, ficha sem
`undefined`), palco 3D de carregamento, corpo inteiro capturado do canvas em
`run/ready/shoot/crouch/jump`, partida viva (`MÍTICO`/`MIT`, vida 100), primeira pessoa
(viewmodel e mira) e os dois retratos. Figuras em `artifacts/miticos-browser/`.

**Bind pose:** o palco 3D roda 44 quadros e todos saem distintos, com os pares
`ação:clipe` batendo em `run`, `shoot`, `crouch`, `crouchwalk`, `jump` e `walkfire`. O
personagem não herda bind pose — é a mesma régua que o `screen-query-browser.mjs` cobra
do Time B.

**Defeito achado e consertado aqui:** `LOADING_CHARACTER_IDS` (`public/js/loading3d.js`)
tinha cinco facções e o fallback `|| .E` engolia a sexta em silêncio — quem escolhia
MÍTICO via **GOTINHA, do Time E**, girando na tela de carregamento. É o mesmo defeito de
"puxar gente de outra facção" que esta lane consertou no roster, um andar acima, e nenhuma
régua olhava para lá porque o dicionário sempre devolvia alguém. A invariante nova cobre
**todas** as facções do `FACCOES`, não só a M, com mutante `loading`.

**Armadilha registrada:** na rota `?tela=personagem` o preview 3D da seleção sai como o
boneco procedural de caixas. Isso **não** é defeito do Lobisomem: a rota de inspeção
direta não roda o preload dos GLB e o elenco inteiro cai no fallback. Conferido lado a
lado com `mandrake`, personagem publicado — mesma tela, mesmo boneco.

## Chão: o que o contato de pata não media (BUG-148)

O contato de pata (CHR3) está em `1e-7 m` — melhor que o elenco. Mas ele só olha os ossos
de **perna**. Olhando a malha inteira, o quadril do lobo fica **45 cm abaixo do chão** na
morte: o cadáver afunda em vez de deitar. A causa é a malha, não o esqueleto — no mesmo
clipe o `Hips` para na mesma altura do `mandrake` (0,138 × 0,129), mas o corpo do lobo
desce 0,59 m abaixo do próprio quadril contra 0,18 m.

**E o Lobisomem não é o pior — é o terceiro.** `proerd` (-0,7771) e `canarinho` (-0,7484)
já estão no ar e nunca foram acusados. Não é regressão desta lane; é uma classe sem régua.
`npm run eval:chao` (CHR7) passou a travar o estado de hoje por personagem, com mutante
`afunda`, e a decisão de não consertar aqui está justificada no BUG-148.

## Limites antes de release

Houve navegador (seção acima); **não houve partida jogada por gente**. Os gates e as
figuras provam registro, assets, formato, contratos de seleção, troca de ação e
enquadramento de retrato — e **não** substituem revisão humana de pose, contato da
escopeta, animação e resultado dentro de uma partida real. O candidato requer essa
revisão antes de merge ou release.

Três pontos que só uma pessoa decide, todos visíveis nas figuras de
`artifacts/miticos-browser/`:

1. **Cópia da tela de resultado:** lê-se "MÍTICO VENCERAM A TRETA" — nome no singular num
   molde plural que serve FUNKEIROS/PALHAÇOS. Ou a facção vira "MÍTICOS", ou o molde
   ganha exceção. Não foi mexido aqui porque é decisão de marca, não defeito de código.
2. **Contador do elenco:** "MÍTICO · 1 PERSONAGENS" — o mesmo molde, com uma facção de um
   personagem só.
3. **Time inteiro de clones:** com um personagem para 4-8 vagas, o roster repete o mesmo
   Lobisomem dos dois lados (o próprio `pickMatchRoster` avisa no log). É consequência
   direta de a facção ter um candidato; some quando o segundo Mítico entrar.

Fica aberto, fora do escopo desta lane: `lobisomem` não tem perfil físico de áudio
(`CHARACTER_IDS` em `tools/audio/fab-game-local.mjs`), o que mantém `eval:audiofablocal`
vermelho em `LAB8e`. O conserto exige regerar o manifest com o pacote de áudio presente.
