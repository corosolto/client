# Terminar os viewmodels do arsenal — CORO SOLTO / CS BRASIL

Retomada auditada: [diagnóstico e continuidade do fechamento](docs/reports/VM-DIAGNOSTICO-FECHAMENTO.md).
Leia antes de executar a fila abaixo: registra verificação atual e contradições ainda não resolvidas.

Você assume uma frente com duas semanas de trabalho do dono. Leia tudo antes de
tocar em qualquer coisa. O que está escrito aqui foi pago com erro.

## Onde

- Worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-unificado`
- Branch: `claude/vm-unificado`. **Nada entra na main sem o dono.**
- Servidor já de pé na porta 4361 (`node tools/eval/serve.mjs 4361`).
  A porta 4321 é OUTRA árvore — não tem este branch.
- Jogo para testar: `localhost:4361/jogo-teste.html` (entra direto na partida,
  ~18 s de carregamento). Dentro, `[` e `]` percorrem as 26 armas sem recarregar.
  O crachá no canto inferior esquerdo diz `vm: AUTORADO <arma>` (modelo novo) ou
  `vm: legado` (modelo antigo, arma ainda não refeita).
- Blender 5.2 em `/Applications/Blender.app/Contents/MacOS/Blender`.

## O que é o problema

Cada arma em primeira pessoa é um GLB com as mãos e a arma juntas, gerado por
`tools/blender/viewmodels/build_ak_hires_pilot.py` a partir de um doador de
animação. O construtor precisa **separar o carregador** da arma para que a
recarga o arranque. Errar essa separação produz os defeitos que o dono relatou
jogando: "recarregar tira o cano", "fica parte do pente", "sem pente".

**A AK é a única arma aprovada.** Ela é a referência de tudo: ângulo, tamanho na
tela, onde a mão encosta, o que sai na recarga. A faca e a pistola também estão
aprovadas mas são de outra família.

## Estado, com prova

Verde e medido:
- `npm run eval:vm-autorado-vivo` → 14/14 armas golden montam o GLB novo com mão
  visível no jogo real.
- `npm run eval:vm-cache` → a URL do GLB muda quando o arquivo muda.
- `node tools/eval/vm-escala-check.mjs` → 13/15 dentro de ±10% da AK.
- `node tools/eval/vm-peso-pente.mjs` → 15/15 sem vértice de peso partido.
- `npm run check:fast` → 132/135 (3 vermelhos são dívida da main: `eval:mapid`,
  `eval:redesign`, `audio:check`).

**Só a M4 foi aprovada pelo dono.** As outras ainda estão ruins.

## A descoberta que organiza o trabalho

O carregador **não é uma região do espaço, é uma peça da malha**. Recortar por
caixa corta ilhas no meio: sobra metade do pente ou entra metade do cano. Mas
`0 de 15` GLB tem o carregador como ilha única — cada malha tem de 20 a 68
ilhas.

A ferramenta que resolve: `public/vmilhas.html?arma=<id>&vista=lado` pinta cada
ilha candidata (1%–20% da malha) de uma cor, com legenda numerada.
`node tools/eval/vm-ilhas-figura.mjs --armas=... --vistas=lado,baixo,cima
--saida=<dir>` renderiza. O construtor aceita `--ilhapente=<n>` e corta **aquela
ilha exata**, com a mesma numeração da figura.

Calibrado: na AK, cujo pente é conhecido, ele sai como ilha 1, 379 triângulos.

### A classificação atual, e o que falta

| classe | armas | o que fazer |
|---|---|---|
| pente é ilha própria, JÁ FEITO e aprovado | `m4` (ilha 3, 226 tri) | nada |
| pente é ilha própria, ilha ERRADA escolhida | `uzi`, `p90` | reidentificar a ilha e reconstruir |
| pente é ilha própria, NUNCA FEITO | `famas`, `lmg`, `svd`, `akm` | identificar a ilha e construir |
| pente FUNDIDO ao corpo | `scar` (ilha de 77%), `m92` | só caixa resolve; erro residual é inevitável |
| modelo NÃO TEM carregador | `mp5`, `md97` | nenhum corte resolve — precisa de asset novo |
| carregador interno (correto assim) | `mosin`, `sks`, `lmg` | nada |

**A uzi e a p90 estão erradas porque EU escolhi a ilha olhando a figura.** Esse é
o erro de método a não repetir: veja abaixo.

## A lei que mais importa aqui

> **Quem constrói nunca dá a nota.**

Quem constrói conhece a intenção e lê o frame pela intenção. Existe um crítico
cego para isso: `.claude/agents/critico-visual-vm.md`, e a skill que amarra a
rodada em `.claude/skills/vm-critico-visual/SKILL.md`. Ele recebe **só imagens**,
nunca a justificativa, e responde no vocabulário do dono ("recarregar tira o
cano", "fica parte do pente", "mão por cima do cano", "arma apontada pro alto",
"recarrega com objeto no meio do ar", "tira carregador fantasma").

Ele já provou o valor duas vezes:
- achou que o carregador virava "um leque de lâminas chapadas" em cinco armas,
  **inclusive na AK aprovada** — era casca oca, 194 arestas abertas na AK;
- **impediu um conserto errado**: eu ia mexer no pitch da deagle e da shotgun, e
  ele mediu que "nenhuma arma sobe mais que a AK; o que varia é a altura de
  montagem, não o ângulo".

**Use-o para escolher a ilha do carregador.** É literalmente a pergunta dele:
mostre a figura de `vmilhas.html` e pergunte qual cor é o carregador. Não decida
você.

## O trabalho, em ordem de impacto

### 1. Reidentificar a ilha do pente de `uzi` e `p90`, e fazer `famas`, `lmg`, `svd`, `akm`

Figuras já renderizadas em 3 vistas. Para cada arma, entregue as três ao crítico
cego e pergunte **qual cor é o carregador**, sem dizer qual você acha. Depois:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b \
  --python tools/blender/viewmodels/build_ak_hires_pilot.py -- \
  --arma=public/models/weapons/<id>.glb --rot=<do CFG> \
  --comprimento=<cm> --ilhapente=<n> --saida=<dir>/<id>
```

`rot` sai de `public/js/weapons.js` (campo `rot`, ex.: `0,90,0`).
`comprimento` está em `tools/blender/viewmodels/armas-hires.json` para quem já
tem; para arma nova, comece em `len*100` e **corrija por MEIO-PASSO** contra
`vm-escala-check` — correção pela razão cheia OSCILA (medido: uzi 47cm→1,60x,
38→1,30x, 34→1,16x, 31,5→1,07x).

Publicar:
```sh
mkdir -p artifacts/viewmodels/pub/<id> && cp <dir>/<id>/ak-hires-pilot.glb artifacts/viewmodels/pub/<id>/
node tools/viewmodels/publicar-hires.mjs --de=artifacts/viewmodels/pub
rm -rf artifacts/viewmodels/pub
```
O publicador já regenera `data/goldenver.js` (a revisão de cache pelos bytes).

**Registre a receita** em `tools/blender/viewmodels/armas-hires.json`. Até
13/09 os parâmetros de build só existiam no terminal de quem rodou e os GLB
publicados **não eram reproduzíveis**.

### 2. A âncora da mão — a quinta constante da AK

`sks`, `svd`, `shotgun`, `carbine` e `awp` têm a mão de apoio **flutuando**, sem
tocar a arma. O crítico: *"cheiro de âncora ajustada à mão só para a AK, com as
demais herdando um offset genérico que nunca foi conferido arma a arma"*.

A constante era fixa no código e **já virou parâmetro**: `--ancora=dx,dy,dz`
(padrão `-0.1475,-1.6065,-0.3500`). Confirmado vivo: varrendo ±6 cm na sks o
centro da arma em relação à mão anda `0,8864 → 0,7428 / 1,0299`.

**O que bloqueia:** não existe régua válida de contato. A que escrevi
(`tools/eval/vm-contato-mao.mjs`) lê `POSITION` no espaço local da malha, sem a
pele do esqueleto, e mede a **AK aprovada a 83 cm da própria mão** — absurdo.
Ela está no repo com um guard que a reprova a si mesma.

Para valer, a régua precisa medir **com o esqueleto aplicado**, em Three no
navegador — `tools/eval/vm-retrato-golden.mjs` já carrega GLB e posa esqueleto,
copie a montagem dele. O alvo: distância mínima mão↔arma na AK define o que é
"encostado"; qualquer arma muito acima disso está solta.

Com a régua de pé, varra `--ancora` por arma e convirja por meio-passo.
`weapons.js` já tem `gripZ` por arma (fração do comprimento onde a mão segura) e
o construtor **não usa** — é a entrada natural para derivar o offset em vez de
varrer no escuro.

### 3. As armas de família (caminho diferente, não passa pelo construtor)

10 armas ainda usam o pacote pago: `awp shotgun deagle g3 revolver38 carbine
m400 tavor g3sg1` (+ `pistol`, que o dono aprovou). O ângulo delas vive em
`FAMILY_FRAME`, `public/js/authoredvm.js`.

Veredito do crítico:
- `shotgun` — **a pior de todas**: as duas mãos no ar em todos os quadros, e a
  recarga sobe a 75° atravessando o ponto de mira.
- `deagle` — **rolada de topo** (vê-se o ferrolho de cima, some o perfil).
  NÃO é pitch: isso já foi medido e refutado.
- `revolver38` — o tambor nunca abre.
- `carbine`, `awp` — mão de apoio solta.
- Padrão: *"o objeto de munição existe só para AK e AWP; nas outras quatro a
  recarga é gesto puro"*.

### 4. `mp5` e `md97`

Os modelos **não têm carregador nenhum**. Confirmado na figura de ilhas e pelo
crítico independentemente. Não invente recorte — foi isso que produziu o
"recarregar tira o cano". Precisa de asset novo, decisão do dono.

## O que existe para VER — figuras, bancadas e doadores

Você não precisa gerar nada para começar: as figuras já estão renderizadas.

### Figuras prontas em `artifacts/viewmodels/critica/` (fora do git, em disco)

| pasta | o que tem | para que serve |
|---|---|---|
| `ilhas/` | 30 PNG — 10 armas × 3 vistas (lado, baixo, cima) + `ilhas.json` | **a mais importante.** Cada ilha candidata da malha pintada de uma cor, com legenda numerada. É aqui que se decide qual peça é o carregador. O número da legenda entra direto em `--ilhapente=<n>` |
| `frames-golden/` | 63 PNG — 9 armas × 7 estados + `frames.json` | idle, ads, fire e 4 quadros de recarga, capturados no JOGO REAL em 3:2. A recarga é sequência: `f015` começa o gesto, `f085` termina |
| `frames-familia/` | 42 PNG — 6 armas × 7 estados | idem, para as armas do pacote (awp, shotgun, deagle, revolver38, carbine) |
| `bancada/` | as 15 lado a lado, e o antes/depois da m4 com o pente tingido | o vermelho é exatamente o que a recarga arranca |

**Atenção nos `frames-golden`:** os 7 quadros da `ak` saíram com um personagem de
luva AZUL e os outros 56 com luva cinza e manga vermelha. O crítico avisou que
isso pode invalidar a comparação de mão. Ao recapturar, **trave o personagem**.

### Bancadas vivas (melhor que imagem parada)

Servidor na 4361, abra no navegador:

- `localhost:4361/vmtest.html` — as 15 golden lado a lado, **animando**. Seletor
  de clipe (Reload é o padrão), o pente pintado de vermelho, mostrar/esconder
  mãos, e um selo verde `no jogo` / vermelho `FORA do jogo` lido do vmconfig.
- `localhost:4361/vmilhas.html?arma=<id>&vista=lado` — as ilhas coloridas.
  Aceita `&fmin=` e `&fmax=` para abrir a faixa de tamanho: foi assim que se
  descobriu que o pente da `scar` está fundido numa ilha de 77% da malha.
- `localhost:4361/jogo-teste.html` — o jogo, com `[` e `]` ciclando as 26 armas.

Para gerar figura nova:
```sh
node tools/eval/vm-ilhas-figura.mjs --armas=<lista> --vistas=lado,baixo,cima --saida=<dir>
node tools/viewmodels/prep/vm-arsenal-frames.mjs --porta=4361 --aspecto=32 \
  --modo=autorado --mapa=brasilia --armas=<lista> --out=<dir>
node tools/eval/vm-bancada-check.mjs --clipe=Reload --maos=1 --figura=<png>
```

### Os doadores de animação que o dono baixou

42 GLB de arma em primeira pessoa em `~/Downloads`, inventariados em
`docs/reports/VM-DOADORES-ANIMACAO.md` (gerado por
`node tools/viewmodels/inventario-doadores.mjs`). Os mais ricos:

| ossos | clipes | arquivo | observação |
|---:|---:|---|---|
| 1072 | 13 | `uzi__first_person_animations_2026_remake.glb` | o acervo de animação mais rico do lote |
| 1068 | 9 | `desert_eagle__first_person_animations.glb` | a deagle é uma das reprovadas |
| 89 | 7 | `animated_shotgun.glb` | a shotgun é **a pior de todas** segundo o crítico |
| 50 | 7 | `ak74u__free_animation..glb` | |
| 46 | 7 | `pistol_animated.glb` | |
| 418 | 5 | `m4a1-s_cs2__first_person_animations.glb` | animação CS2 |
| **77** | 4 | `ak-12animated.glb` | **é o doador em uso**, o rig da AK aprovada |

**Como usar, e o que já foi refutado:** retarget por NOME de osso está morto —
a sobreposição de nomes com o rig da AK é de 0 a 2%. O que resta é casamento
ESTRUTURAL, e o primeiro filtro é a contagem: doadores na faixa de 58 a 98 ossos
têm topologia comparável aos 77 da AK (`animated_shotgun` 89, `scar-h` 85,
`makarov` 83, `m4a1_low_poly` 80, `fps_animations_sniper_rifle` 79). Os de
1000+ ossos (uzi, deagle) são outra espécie: trazem 9 a 13 clipes, mas o
casamento com o rig da AK é trabalho próprio.

Nenhum desses doadores foi usado até hoje além do `ak-12animated.glb`. O dono
cobrou isso explicitamente: *"todos os glbs que eu trouxe de animação têm vários
muito bons, também não estamos usando de nada de referência"*.

## Armadilhas que já custaram caro

1. **Régua verde com o jogo morto.** `check:fast` roda o motor em node e nunca
   abre o navegador: ele ficou 129/135 verde com o viewmodel inteiro quebrado.
   Depois de mexer, rode `npm run eval:vm-autorado-vivo`, que boota de verdade.
2. **O navegador serve o GLB velho.** A URL do golden tinha versão escrita à
   mão; o dono testou o arquivo de ontem e reportou os mesmos defeitos. Hoje a
   revisão vem do sha256 (`npm run eval:vm-cache` guarda isso). Nunca escreva
   versão à mão.
3. **Duas sessões headless em paralelo derrubam o boot.** Um navegador por vez;
   `pkill -f "chrome-mac|chromium"` entre lotes.
4. **Correção por razão cheia oscila.** Meio-passo converge.
5. **Não tape o buraco no CORPO da arma.** O corte da coronha procura a borda
   aberta e reprova com "stock mask too small". Tape só o carregador (já feito:
   `tapar_buraco`, levou a m4 de 176 arestas abertas para 4).
6. **O dono joga em 3:2.** Validar só em 16:9 já custou uma rodada. Use
   `--aspecto=32` em `vm-arsenal-frames`.
7. **Trave o personagem ao capturar.** Os quadros da AK saíram com luva azul e
   os das outras com luva cinza, e o crítico avisou que isso pode invalidar a
   comparação.
8. **Comentário no código: no máximo 2 linhas** (`npm run eval:comentario`), em
   português, apontando para `KNOWN-BUGS.md`. História e número vão para lá.
9. **Não commite sem autorização do dono.**

## Como saber que terminou

Por arma, nesta ordem:

1. `npm run eval:vm-autorado-vivo` verde.
2. `node tools/eval/vm-escala-check.mjs` — a arma dentro de ±10% da AK.
3. `node tools/eval/vm-peso-pente.mjs` — sem vértice partido.
4. `node tools/eval/vm-bancada-check.mjs --clipe=Reload --maos=1 --figura=<png>`
   — na bancada `localhost:4361/vmtest.html`, o vermelho (o que a recarga
   arranca) é o carregador e **só** ele.
5. O crítico cego, com figuras novas em 3:2, move a arma de REPROVADA para
   RESSALVA ou APROVADA.
6. **O dono joga e aprova.** Nenhuma régua substitui isso — quando ele diz que
   está errado e o portão está verde, o defeito é do portão.

**Detector de giro:** se duas rodadas seguidas não moverem nenhuma arma de
REPROVADA para melhor, pare e reporte o platô medido em vez de continuar. Rodada
que não move número é custo.

## Leitura obrigatória no repo

- `KNOWN-BUGS.md` — BUG-156 (o merge matou o caminho autorado) e BUG-157 (o
  navegador servia o GLB velho) são os dois desta semana, com causa e régua.
- `tools/blender/viewmodels/armas-hires.json` — a receita por arma, incluindo um
  bloco `_refutado` com hipóteses já derrubadas por medição. Não as repita.
- `AGENTS.md` e `.claude/skills/bug-hunt/SKILL.md` — as leis da casa: régua antes
  do conserto, toda correção com a mutação que a deixa vermelha, gere a figura e
  OLHE, refute o palpite óbvio antes de agir nele.
