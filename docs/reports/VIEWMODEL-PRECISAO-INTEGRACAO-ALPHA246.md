# Mosin, SVD e SKS — receita de integração sobre alpha.246

## Escopo e estado de entrada

Esta receita porta somente Mosin, SVD e SKS para a lane
`codex/viewmodels-catalog-final`, baseada em
`origin/main@2115d5e2c29eefb4491ae63b0f1600c200a750bb`
(`v2.0.0-alpha.246`). Ela não promove AWP, não muda balanceamento e não autoriza
misturar uma arma final com fallback antigo no release do catálogo.

A preparação fonte está em `codex/vm-prep-precisao@99a522684aa5`. Seus gates
offline T/M/C/F/A e os doze mutantes estão verdes, mas isso não equivale a
aprovação no jogo. Os três GLBs continuam privados e ignorados:

| Arma | Família | Bytes | SHA-256 | Estado |
|---|---|---:|---|---|
| Mosin | `bolt` | 24.501.456 | `814d4974227e3a476593f11074fd06dee3e5de0c788835d634d29ee853e1c0bc` | pronta para integração controlada; sem aceite humano no Game |
| SVD | `svd` | 24.297.360 | `dc65b1ff6fd0f568c10bdf4180360edc9b54b1021058edeecc64e615fa09e981` | pronta para integração controlada; regressão intermitente de visibilidade ainda sem reprodução determinística |
| SKS | `marksman` | 24.633.392 | `d4d427547082775d23d5ea8d623c638b4283e7a56620c7fe810350b436f829f7` | pronta para integração controlada; sem aceite humano no Game |

`gates.json` tem SHA-256
`ad567e68a5ec5ded60375cdc3a41c5b9590f64b0a046e63b53c206d3264a2660`.
Os GLBs carregam nove texturas de braços redundantes e ainda precisam ser
otimizados e revalidados. Nenhum `ready:true` deve entrar antes dos gates e do
aceite visual descritos abaixo.

## Duas lacunas que precisam ser corrigidas antes da cópia

O texto final da fonte sugere “apontar” `precisao-final-gates.py` aos GLBs do
destino, mas o script em `99a522684` não possui argumento de linha de comando:
ele fixa `A/final` e a raiz C2 no código. A integradora deve portar o gate como
ferramenta e acrescentar `--asset-root`, `--baseline-root` e `--output`, mantendo
o comportamento sem argumentos para reproduzir a fonte.

Também não se deve chamar o otimizador atual diretamente sobre os nomes acima.
`optimize_paid_family.mjs` abre `<PRIVATE_ROOT>/<family>/<family>-runtime.glb`;
ele não aceita `mosin-baked-runtime.glb`, `svd-baked-runtime.glb` ou
`sks-baked-runtime.glb`. Antes de tocar nos privados, adicionar ao otimizador a
interface `--input=<arquivo> --output=<arquivo>`, preservar a operação por
família existente e criar um mutante que prove que nenhum outro GLB mudou.
Sem essas duas interfaces, a otimização e o regateamento não são reproduzíveis
e a integração deve parar.

## Ordem sequencial obrigatória

### 0. Congelar a base e conferir a preservação

Executar na lane final, sem checkout nas worktrees fonte:

```sh
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final
test "$(git branch --show-current)" = codex/viewmodels-catalog-final
git merge-base --is-ancestor 2115d5e2c29eefb4491ae63b0f1600c200a750bb HEAD
git status --short

P=artifacts/viewmodel-preservation-2026-09-10
(cd "$P" && shasum -a 256 -c SHA256SUMS)
git bundle verify "$P/git/vm-prep-precisao-commits.bundle"
```

Conferir os três hashes de GLB no inventário, sem copiar os bytes para o Git:

```sh
P=artifacts/viewmodel-preservation-2026-09-10/inventories/vm-prep-precisao.sha256.tsv
rg 'final/(mosin|svd|sks)-baked-runtime.glb$|final/gates.json$' "$P"
```

Qualquer HEAD, hash ou status diferente exige novo inventário; não se corrige
essa diferença sobrescrevendo a fonte.

### 1. Escrever primeiro os gates vermelhos no alpha.246

Portar os avaliadores offline por símbolos e criar duas suítes da integradora:

1. `eval:vm-precision-assets`: T/M/C/F/A, leitura por `--asset-root`, hashes de
   entrada/saída, e mutantes T, M, C e F da preparação;
2. `eval:vm-precision-lifecycle`: controlador assíncrono, troca, scope, tiro,
   recarga, cancelamento, morte/respawn e descarte, sem WebGL.

Rodar primeiro `npm run eval:vm`, depois as duas novas suítes. A suíte de assets
deve reprovar porque os privados ainda não foram staged. A suíte de lifecycle
deve reprovar no alpha.246 ou, se a infraestrutura autorada ainda não existe,
em um fixture mínimo que omita a restauração de visibilidade. Cada regra nova
precisa morder pelo menos um mutante.

O gate específico da SVD usa relógio e Promise controlados, sem aleatoriedade.
Em cada transição ele amostra o estado antes, no limite e um frame depois:

- `svd → knife → svd` com load já resolvido;
- iniciar load da SVD, trocar para outra arma, resolver o load antigo e voltar;
- falhar o load e confirmar fallback visível, depois repetir com sucesso;
- entrar e sair do scope atravessando a máscara `0,55` nos dois sentidos;
- dez disparos a intervalos de `0,28 s`, mantendo a mira da semiautomática;
- recarga tática, recarga vazia e cancelamento por troca de arma;
- morrer/renascer e alternar primeira/terceira pessoa durante load e recarga;
- repetir a matriz trinta vezes, alternando 1440×960 e 1440×810.

Invariantes por amostra:

- vivo, primeira pessoa e máscara `<= 0,55`: exatamente um entre pacote autorado
  ativo e fallback está visível;
- vivo, primeira pessoa e máscara `> 0,55`: arma e fallback ocultos, overlay da
  luneta ativo;
- morto ou terceira pessoa: nenhum viewmodel de primeira pessoa visível;
- conclusão de Promise obsoleta não muda a arma ativa, não esconde a atual e
  não reativa a SVD;
- tiro, término/cancelamento da recarga e volta do scope não deixam `mount`,
  raiz ou entrada ativa em `visible=false`;
- erro de asset mantém fallback e registra uma só falha, sem loop de requests.

Mutantes mínimos: remover a reaplicação de visibilidade ao reselecionar; aceitar
resultado de Promise obsoleta; ocultar o mount em `shoot`; não restaurar após
`reload`; trocar `0,55` por comparação assimétrica; ocultar fallback antes de a
malha privada estar pronta. Todos precisam ficar vermelhos.

O “sumiço” da SVD foi observado no uso anterior, mas os artefatos preservados
não registram sequência, vídeo ou stack que identifique uma causa única. Até a
matriz acima reproduzir a falha ou provar todos os caminhos determinísticos, o
defeito permanece **aberto**; não atribuir a causa ao GLB por inferência.

### 2. Portar a infraestrutura mínima por símbolos

Usar a linhagem histórica apenas como arqueologia. Não fazer cherry-pick amplo:
ela está centenas de commits atrás e transportaria `game.js`, multiplayer e
HUD antigos. Portar, em commits pequenos, o contrato equivalente a:

1. catálogo/configuração (`vmconfig.js`), mantendo `ready:false`;
2. loader/cache/dispose (`vmweapon.js`), com token de seleção por request;
3. controlador de ações (`authoredvm.js`) e identidade central de mãos;
4. hooks mínimos no Game atual: construção, `_applyVmVisibility`,
   `_switchWeapon`, `_scope`, `_startReload`, `_tryShoot`, `_updatePlayer`,
   morte/respawn e dispose;
5. sockets de muzzle e sight, sem mudar dano, cadência, munição, áudio, HUD ou
   terceira pessoa.

Uma única função deve decidir a visibilidade a partir de arma selecionada,
estado do load, câmera, vida e máscara. Callbacks de load só publicam o pacote
se o token ainda corresponde à seleção atual. A troca nunca oculta o fallback
antes de a malha correta estar pronta.

Depois de cada commit: `npm run eval:vm`, `npm run eval:vm-precision-lifecycle`
e os mutantes. Se um hook do Game atual precisar ser substituído em bloco,
parar e comparar seus invariantes de gameplay antes de seguir.

### 3. Staging privado, otimização e regateamento

Criar uma cópia de trabalho fora do Git. Os nomes abaixo são o contrato do
loader; o caminho concreto de privados continua configurável:

```sh
SRC=/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-precisao/artifacts/viewmodels/prep/precisao/final
DST=/Users/ruben/csbrasil-private-assets/generated/viewmodels

install -d "$DST/bolt" "$DST/svd" "$DST/marksman"
cp "$SRC/mosin-baked-runtime.glb" "$DST/bolt/mosin-baked-runtime.glb.pre-optimize"
cp "$SRC/svd-baked-runtime.glb" "$DST/svd/svd-baked-runtime.glb.pre-optimize"
cp "$SRC/sks-baked-runtime.glb" "$DST/marksman/sks-baked-runtime.glb.pre-optimize"
```

Depois de implementar a interface explicitada acima:

```sh
node tools/viewmodels/optimize_paid_family.mjs --familia=bolt \
  --input="$DST/bolt/mosin-baked-runtime.glb.pre-optimize" \
  --output="$DST/bolt/mosin-baked-runtime.glb" "$DST"
node tools/viewmodels/optimize_paid_family.mjs --familia=svd \
  --input="$DST/svd/svd-baked-runtime.glb.pre-optimize" \
  --output="$DST/svd/svd-baked-runtime.glb" "$DST"
node tools/viewmodels/optimize_paid_family.mjs --familia=marksman \
  --input="$DST/marksman/sks-baked-runtime.glb.pre-optimize" \
  --output="$DST/marksman/sks-baked-runtime.glb" "$DST"
```

Registrar hashes e tamanhos dos três outputs. Confirmar que somente eles e o
relatório do otimizador mudaram. Rodar o gate portado sobre os outputs:

```sh
python3 tools/viewmodels/prep/precisao-final-gates.py \
  --asset-root="$DST" \
  --baseline-root=/Users/ruben/csbrasil-private-assets/generated/precisao-c2-isolated \
  --output=artifacts/viewmodels/integration/precisao/gates-optimized.json
npm run eval:vm-precision-assets
```

T/M/C/F/A e os doze mutantes devem manter o resultado da fonte. O tamanho
esperado é cerca de 5,2 MB por arma, mas tamanho não é critério de correção.
Diferença de animação, skin, sockets ou mecanismo barra o asset.

### 4. Integrar Mosin isoladamente

Ativar Mosin somente por override de teste, ainda com a família `ready:false`.
Configuração equivalente: `mosin: W('bolt', { baked: true })`.

Validar os clipes `idle`, `equip_rifle`, `shoot`, `reload_start`,
`reload_loop`, `reload_end`, `reload_empty` e `inspect`. No jogo, testar recarga
com N=1 e N=5, tiro imediato após draw/recarga, saída automática da luneta ao
disparar, ferrolho próprio e alimentação coerente com cinco cartuchos. Dano
120, cadência 1,50 s, recarga 3,40 s e reserva permanecem os do alpha.246.

Só seguir quando o GLB servido tiver o hash otimizado registrado, o lifecycle
estiver verde e as capturas 3:2/16:9 tiverem sido vistas.

### 5. Integrar SVD isoladamente

Manter Mosin verde e ativar SVD por override de teste. Configuração equivalente:
`svd: W('svd', { baked: true })`.

Validar `idle`, `equip_rifle`, `shoot`, `reload_tactical`, `reload_empty` e
`inspect`. A troca de pente deve seguir a mão esquerda e assentar sem pop; a
coreografia preservada é translacional, sem tilt, o que precisa de julgamento
visual explícito. Dano 62, cadência 0,28 s, carregador 10, recarga 3,00 s e
scope contínuo ao atirar não mudam.

Executar toda a matriz de desaparecimento antes e depois das capturas. Qualquer
frame sem arma/fallback quando a máscara não cobre a tela reprova a SVD, mesmo
que o restante do ciclo pareça bom.

### 6. Integrar SKS isoladamente

Ativar SKS por override de teste. Configuração equivalente:
`sks: W('marksman', { baked: true })`.

Validar `idle`, `equip_rifle`, `shoot`, `reload_start`, `reload_loop`,
`reload_end`, `reload_empty` e `inspect`. Confirmar ação própria do ferrolho e
alimentação, sem copiar visualmente o Mk14 doador. A pegada direita preservada
mede 31 mm no gate e precisa ser julgada no runtime. Dano 48, cadência 0,18 s,
carregador 10 e recarga 2,60 s permanecem.

### 7. Fechar a família e só então promover

Rodar a regressão Mosin → SVD → SKS → AK/PT-38/faca nas duas proporções. Depois:

```sh
npm run eval:vm
npm run eval:vm-precision-assets
npm run eval:vm-precision-lifecycle
npm run check:deploy
```

O `ready:true` e o bump de `CATALOG_VERSION` só entram após aceite humano das
três armas no Game real. Se uma falhar, as outras permanecem em override de
teste; o release não mistura a família parcialmente nova com fallback antigo.

## Matriz visual obrigatória

Capturar sem redimensionar o canvas em 1440×960 (3:2) e 1440×810 (16:9):

| Estado | Mosin | SVD | SKS |
|---|---:|---:|---:|
| idle hip + movimento | ✓ | ✓ | ✓ |
| equip início/meio/fim | ✓ | ✓ | ✓ |
| tiro início/pico/retorno | ✓ | ✓, rajada de 10 | ✓, rajada de 10 |
| recarga tática início/contato/fim | N=1 e N=5 | ✓ | N=1 e N=10 |
| recarga vazia início/contato/fim | ✓ | ✓ | ✓ |
| ADS ida/centro/volta | ✓, sai ao tiro | ✓, permanece | ✓, permanece |
| cancelamento por troca | ✓ | ✓ | ✓ |
| morte/respawn e 1P/3P | ✓ | ✓ | ✓ |

Cada folha precisa mostrar arma e duas mãos legíveis, dedos, punhos, peça móvel,
HUD/munição e área central. Vídeo sem cortes cobre draw, tiro, reload, scope e
troca; contact sheet cobre os frames extremos. A revisão humana olha os pixels,
não apenas os JSONs.

## Critérios de aceite e rollback

Uma arma só é aceita quando:

- identidade, escala, materiais, duas mãos e pega são coerentes nos dois
  aspectos;
- o mecanismo próprio se move e retorna sem pop, clipping visível ou mão solta;
- clipes fecham no prazo do Game e permitem a próxima ação no deadline;
- muzzle, sight, recoil, scope, HUD e munição concordam com o alpha.246;
- load tardio, 404, troca, cancelamento, morte e dispose preservam um fallback
  correto e não vazam GPU;
- T/M/C/F/A otimizado, lifecycle, mutantes, regressão e `check:deploy` passam;
- um crítico independente revisa as folhas e Ruben aprova no jogo real.

Rollback é por configuração: manter `ready:false`, remover o override de teste e
preservar o fallback atual. Não apagar os privados nem alterar a worktree fonte.
Falhas de hash, otimização, lifecycle da SVD, sincronismo, clipping ou aceite
visual encerram a rodada antes da arma seguinte.

## Pré-requisito implementado em 10/09/2026

A fundação requerida por este plano foi portada por símbolos nos checkpoints `8ecb7ab05`,
`c8b75444f` e `a6ec3b49c`. Ela preserva 26 armas, mantém todas as famílias fechadas, centraliza
a visibilidade com fallback até a malha existir e descarta conclusões assíncronas fora do token
ativo. AK e faca podem ser avaliadas somente por opt-in; PT-38 permanece fail-closed.

Esse marco não liberou a precisão. O marco seguinte integrou os três assets privados somente como
candidatos opt-in; o registro atual está abaixo.

## Integração candidata executada em 10/09/2026

As duas interfaces bloqueadas foram corrigidas antes do staging: o gate aceita raízes por CLI e o
otimizador aceita um único `*-baked-runtime.glb`, com mutantes que provam a raiz e o output
isolados. Mosin, SVD e SKS usam `baked:true`, mas as três famílias seguem `ready:false`, a ativação
global segue desligada e nenhum privado foi versionado.

Fonte e outputs otimizados passaram T/M/C/F/A com os doze mutantes. O lifecycle da SVD passou 30
ciclos e 630 amostras alternando 1440×960/1440×810; 42 capturas reais confirmaram que ela não some
em idle, tiro, recarga ou entrada do ADS. A folha visual, porém, reprovou a promoção: Mosin/SKS têm
uma peça bege dominante e a SVD tem mangas/antebraços grandes demais. Nenhum `ready:true` pode ser
aberto antes da correção e nova revisão humana.

Evidência, hashes, comandos e limites:
[`VIEWMODEL-PRECISION-CANDIDATES-ALPHA246-2026-09-10.md`](VIEWMODEL-PRECISION-CANDIDATES-ALPHA246-2026-09-10.md).

## Phase 3 executada em 10/09/2026

O builder passou a resolver `JOINTS_0` pelo slot de `skin.joints`; isso removeu os blocos bege de
Mosin/SKS sem trocar os modelos. A SVD preserva geometria e skinning das mangas e esconde apenas a
borda aberta do ombro com vertex alpha. Correções locais de contato fecham um vértice visível na
recarga da SVD e os dois resíduos observados no `inspect` do SKS, mantendo o teto em zero.

Uma captura adicional revelou que o `inspect` autoral voltava ossos ao bind após o crossfade e
girava o conjunto na origem do rig. Os clipes rígidos agora carregam a pose idle e compensam a
rotação no pivô da arma. As três armas permanecem no quadro no ponto de maior rotação em 3:2 e
16:9. A matriz de 42 frames foi recapturada sem erro fatal; os mutantes visuais reprovam.

O estado continua candidato: `ready:false`, ativação global desligada e revisão humana pendente.
Assets e artefatos permanecem privados/ignorados; o Git contém apenas receita, gates, hashes e
documentação.

O código causal está no checkpoint `662371b36`. O recibo final combinado T/M/C/F/A tem SHA-256
`0f4d342a2924e6b4d63973a84550d5ce8e3c5c7ccf5b26345e87613fed625193`; o contrato visual
tem SHA-256 `c302b90214247cf8887863545c84321806dff0af60b08aa29a4d723ed8dd604c`. A recaptura
`phase3-final-v3` contém 42 frames, seis inspeções adicionais e comparações antes/depois nas duas
proporções. Ela não substitui o aceite humano e não muda `ready:false`.

As falhas vistas nos runs `34433700979` e `34433700983` também existem no mesmo conteúdo de
`origin/main@2115d5e2` (`34402769444` e `34402769523`): `SUPPORT_URL_BR`, 14/53 silhuetas,
CHR5B, MAP2B do Escadão e CENA3 stale. Os arquivos responsáveis não diferem nesta lane; esses
itens são dívida da base e não serão mascarados nem corrigidos no PR de viewmodels.
