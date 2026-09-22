# Viewmodels finais — catálogo integral

## Objetivo e definição de pronto

Entregar as 26 armas do jogo com uma linguagem visual única em primeira pessoa. O release só
fecha quando cada arma apresenta modelo correto, mãos completas, pega e contatos coerentes,
mecanismo próprio, disparo, recarga, ADS quando aplicável, enquadramento 16:9 e 3:2, HUD/munição
corretos e aprovação visual humana no jogo real. Resultado offline, still isolado ou “candidato”
não é versão final.

Durante a integração, o fallback atual permanece como proteção contra asset ausente. Ele não é
aceite para a campanha: misturar famílias novas com armas antigas quebra a uniformidade pedida.

## Checkout de integração

- worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final`;
- branch: `codex/viewmodels-catalog-final`;
- base: `origin/main@2115d5e2c29eefb4491ae63b0f1600c200a750bb` (`v2.0.0-alpha.246`);
- integrador único: Codex;
- produtores externos trabalham em worktrees próprios e entregam commits pequenos; não editam
  `game.js`, `weapons.js`, `vmattach.js`, `fparms.js`, ADS ou HUD nesta lane.

## Catálogo obrigatório

| Família | Armas |
|---|---|
| Controles | AK-47, PT-38, faca |
| Pistolas | Deagle, revólver .38 |
| Fuzis | M4, M92, AKM, G3, MD97, carabina, SCAR, Tavor, FAMAS |
| Submetralhadoras | MP5, Uzi, P90 |
| Precisão | AWP, M400, Mosin, Remington 700, SVD, G3SG1, SKS |
| Pesadas | LMG, shotgun |

## Continuação de 14/09 — Deagle

A Deagle foi fechada tecnicamente com produto DGL50 privado, duas mãos, slide/cão/pente
próprios, cinco ações, ADS, fallback e lifecycle 30x. Vinte capturas reais em 3:2/16:9
passaram sem erro fatal depois do novo enquadramento. O gate morde oito mutantes e o
produto de 3.136.132 bytes permanece fora do Git. Família e arma seguem `ready:false`, a
ativação global continua desligada e a revisão humana ainda é necessária. Recibo:
[`VIEWMODEL-PISTOL-DEAGLE-ALPHA252-2026-09-14.md`](VIEWMODEL-PISTOL-DEAGLE-ALPHA252-2026-09-14.md).

Próxima arma sequencial: revólver .38.

Fonte derivável: `WEAPONS` em `public/js/data/weapons.js` e `WEAPON_IDS` em
`public/js/weapons.js`. A contagem é regenerada pela documentação do projeto; este relatório
registra a obrigação de cobertura, não substitui a fonte.

## Fontes que serão extraídas

- controles: PR #549, preservando os checkpoints já aprovados pelo dono;
- DMR/precisão: PR #544 e preparação #513;
- fuzis: preparação #509 e evidência específica da M4;
- LMG: PR #546 serve como diagnóstico reprovado; sua saída visual não é promovida;
- infraestrutura histórica: PRs #464/#468 apenas como fonte de contratos e pequenos trechos
  comprovados, sem transportar a pilha de commits.

Nenhum cherry-pick amplo começa antes do inventário de arquivos e conflitos contra esta base.

## Gates por arma

1. **Identidade:** ID, malha, escala, orientação e materiais correspondem à arma.
2. **Mãos:** duas mãos quando a mecânica exige, dedos sem atravessar e pega estável.
3. **Ações:** começo/meio/fim de idle, tiro, recarga, equip e ADS; transições sem salto.
4. **Mecanismo:** ferrolho, slide, carregador, clip, cartucho ou tambor conforme a arma.
5. **Câmera:** 16:9 e 3:2, hip e ADS, sem cortar mãos nem dominar a tela.
6. **Jogo:** HUD, munição, áudio, muzzle, pickup e terceira pessoa sem regressão.
7. **Desempenho:** lazy load, descarte GPU, tamanho do asset e fallback medidos.
8. **Aceite:** captura/contact sheet e revisão humana no runtime real.

Toda régua nova precisa reprovar o estado anterior ou um mutante que quebre a invariante. A ordem
do projeto é `npm run eval:vm` antes das invariantes; gates técnicos não substituem a imagem.

## Ordem de integração

1. medir e congelar AK, PT-38 e faca como referência;
2. portar a infraestrutura mínima necessária sobre alpha.246;
3. integrar as famílias, uma por vez: controles → pistolas → fuzis → submetralhadoras → precisão
   → pesadas;
4. após cada família: commit recuperável, gates específicos e capturas;
5. depois das 26: regressão cruzada, duas proporções, HUD, terceira pessoa, build limpo e revisão
   adversarial;
6. abrir um único PR final sobre `main` e mapear cada PR-fonte incorporada.

## Estado inicial — 10/09

- worktree criada limpa na alpha.246;
- inventário paralelo das branches/PRs e do catálogo atual concluído;
- nenhum código de runtime portado ainda;
- próximo passo: comparar os commits aprovados de #549 contra a base e materializar a primeira
  régua de uniformidade que fique vermelha com o catálogo misto.

### Baseline reproduzido

- produção usa `WEAPON_ONLY` por padrão; mãos só entram com `?hands=1`;
- os 26 GLBs existem, mas cada um está achatado em um node e zero animações;
- recarga, recoil, draw e ADS atuais movem a raiz; `magDrop` não produz ação visual;
- não há slide, ferrolho, pump, tambor, clip ou cartucho móvel no caminho atual;
- somente oito armas têm fallback procedural; as outras dezoito podem ficar invisíveis quando o
  GLB falha;
- a suíte aceita dívidas VM conhecidas e não possui matriz 26 × ações/contatos/sincronização.

### Decisão de extração

Os PRs-fonte estão entre 537 e 645 commits atrás desta base. Nenhum será mesclado ou
cherry-picked integralmente. A espinha sai da linhagem #468 até `d35c6658`, portada por símbolos
para preservar multiplayer, combate e Míticos do `game.js` atual.

Ordem comprovada pelo inventário:

1. fundação autorada de #468/`d35c6658`;
2. correções transversais de #464: ausência sem AWP substituta, visibilidade só após malha,
   escala do pente e trims efetivos;
3. gates de #549 e congelamento dos três controles aprovados;
4. Rem700/G3SG1 de #544, ainda sujeitos à revisão visual;
5. M4 aprovada em idle, conclusão da recarga e produção dos demais fuzis;
6. Mosin/SVD/SKS, corrigindo primeiro o desaparecimento intermitente da SVD;
7. LMG refeita; o resultado anteriormente reprovado não entra;
8. AWP, shotgun, SMGs e curtas, que ainda não possuem saída final aprovada nas fontes auditadas.

Checkpoint documental: `41113d742`; `npm run check:deploy` passou 39/39 com Node 23 depois de
instalar as dependências do worktree. Draft de acompanhamento: client#572.

O censo das dezoito worktrees anteriores, incluindo conteúdo local não enviado e assets ignorados,
está em [`VM-WORKTREES-CENSUS-2026-09-10.md`](VM-WORKTREES-CENSUS-2026-09-10.md). Ele substitui
a suposição inicial de que os sete PRs continham todas as fontes relevantes.


## Preservação P0 antes da consolidação

Snapshot somente de estado Git e código-fonte criado em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/checkpoints/viewmodels-p0/20260910T015505Z`.
Ele fica fora dos checkouts e não contém `public/private-assets`, evidências geradas,
dependências, builds ou candidatos binários. Nenhuma worktree fonte foi limpa, alterada ou
promovida durante a captura.

### `vm-lmg-final`

- branch `glm/vm-lmg-final` em `a8a9a8e8965f0f35a0d0441ad4df6922cc943bad`;
- upstream `origin/glm/vm-lmg-final` em `90ec24d7d47fbcb668608c6eebb6b8357663d3ab`;
- dois commits locais preservados no bundle; a PR #546 continua apontando para o upstream;
- dois arquivos versionados modificados foram preservados em patch binário e três arquivos
  não versionados em arquivo tar comprimido;
- o estado da LMG continua `ready:false` e reprovado em revisão humana. Este snapshot preserva
  instrumentos e diagnóstico; não aprova nem promove a candidata anterior.

Arquivos de recuperação:

| Arquivo | SHA-256 |
|---|---|
| `vm-lmg-final-local-commits.bundle` | `bb56841d17b5cdaa10ae66fa1f97c00e00c2873ee13709683de85de12600be92` |
| `vm-lmg-final-working-tree.patch` | `fb02d7df604cf0ff3a2d69cd4644b96110515e0802fddd06c6fd5ff3271c3429` |
| `vm-lmg-final-untracked.tar.gz` | `026ffc314a81c4c189aacf302c244bcdf1c63fd6cd38ffb02c0be51fda03ec66` |
| `vm-lmg-final-state.txt` | `348969dca6b27b0543545453310f95646651885809af8090219a74ada1ca4346` |

### `vm-retarget`

- branch `vm-cs16-gabarito` em `6451ecaf5874266e3f3eec35056b8909e4123f38`;
- upstream `origin/vm-cs16-gabarito` em `9faf8d3011ed75c232bf487fd2a9151519f51ce8`;
- worktree limpa, doze commits à frente do upstream;
- os doze commits foram preservados em `vm-retarget-local-commits.bundle`, SHA-256
  `a6286c8df7383736c66d3e087bace9e680c25f2f5260fc8042b8252d1ac4ecc8`;
- `vm-retarget-state.txt` registra refs, status e os doze commits, SHA-256
  `0d41e3f426e72907ccdd08c67603bcc8bc70f5fe4c6aa9aadbcde739ea706879`.

Os dois bundles passaram em `git bundle verify` e registram seus commits-base como
pré-requisitos. O manifesto legível por máquina é `manifest.json`, SHA-256
`0c11059aa0ebd3a646fcf466c9c5663e59851782fc9252abaf79ff486dd4be64`; o inventário final de
checksums é `SHA256SUMS`, SHA-256
`387966506e85938ea1487141c258ba26dcfcb9cab8fd50d583b27702c2e4b3ee`.

Antes de aplicar qualquer parte na lane final, deve-se inspecionar o manifesto, restaurar em
refs temporárias e portar somente os símbolos aprovados. O patch e o tar da LMG devem ser
aplicados apenas sobre o HEAD exato salvo, sem substituir a worktree original.

## Preservação P0/P1 — M4, precisão e rifles

Um segundo snapshot, também ignorado, foi criado em
`artifacts/viewmodel-preservation-2026-09-10/`. Ele não contém bytes dos assets privados:
registra caminho relativo, tamanho, mtime e SHA-256 de cada evidência na worktree fonte, além
de bundles de commits e patches recuperáveis. As três worktrees fonte permaneceram intocadas.

| Fonte | HEAD | Estado preservado | Inventário local |
|---|---|---|---:|
| `vm-m4-reload-evidence` | `4d2a99ef6609` | um commit local; `m4-cuff-profile.py` modificado e dois scripts não rastreados; sonda anterior rejeitada | 174 arquivos / 130.007.644 bytes |
| `vm-prep-precisao` | `99a522684aa5` | limpa e publicada; Mosin/SVD/SKS verdes apenas nos gates offline | 257 arquivos / 241.087.234 bytes |
| `vm-prep-rifles` | `ea022c3c0ee5` | limpa e publicada; M4 idle aprovada, recarga ZCode ainda reprovada | 754 arquivos / 253.566.441 bytes |

O snapshot referencia 1.185 arquivos e 624.661.319 bytes sem copiá-los. Os três bundles
passaram em `git bundle verify`. Checksums principais:

| Arquivo ignorado | SHA-256 |
|---|---|
| `SHA256SUMS` | `42ecf812c1a4066e108efcc741dc89e9d2157d1625392c2058017be53e455f86` |
| `manifest.json` | `6279b13516612192560caeff80faa8bfe818e880456f0bd3bc2bc34ae942e2a6` |
| bundle M4 | `3c7650dcbb4de3460bb8331a3d656273589439538474f7179eb1e8b60f9b3afa` |
| patch dirty M4 | `eee78a52a5f8ce029495d67dfa4ddd850d98ea742bcdc3cd983ab7ff24b48ae3` |
| bundle precisão | `7bba9ab493949212b43b9756e262866610ff8a635e3bcaacf8655683e71ebad5` |
| bundle rifles | `ceb2e8177f15dd8721edcbcd66a4b2a53e643e010cdd5edea8cfa82b7aff992c` |

Decisão de promoção: a candidata M4 de `vm-m4-reload-evidence` não substitui a mais recente de
`vm-prep-rifles`; ambas continuam diagnóstico. A recarga M4 mais nova ainda expõe pele no press,
tem pico de velocidade de 92,45 mm/frame e polpa do mínimo a -6,19 mm, sem aceite visual. Em
precisão, `pronto:true` significa somente que a saída assada passou T/M/C/F/A offline; otimização,
Game, lifecycle e aprovação humana continuam pendentes.

A sequência de produção para Mosin/SVD/SKS está em
[`VIEWMODEL-PRECISAO-INTEGRACAO-ALPHA246.md`](VIEWMODEL-PRECISAO-INTEGRACAO-ALPHA246.md).
Ela corrige duas instruções não executáveis da fonte: o gate atual não aceita raiz por CLI e o
otimizador atual não aceita os nomes `*-baked-runtime.glb`. O próximo marco é implementar essas
interfaces e os gates vermelhos de assets/lifecycle sobre alpha.246, começando pela regressão
intermitente de visibilidade da SVD. Nenhum runtime foi alterado neste marco.

## Fundação authored integrada sobre alpha.246

A fase 1 foi implementada em três checkpoints: `8ecb7ab05`, `c8b75444f` e `a6ec3b49c`.
Ela preserva os 26 IDs, mantém todas as famílias `ready:false` e exige `?vmauthored=1` para
construir os controladores. AK e faca públicas foram congeladas pelos hashes aprovados; PT-38
continua fail-closed porque o produto aprovado mora em `public/private-assets` na fonte.

O gate novo passou 20/20, `check:deploy` passou 39/39 com Node 24.19.0, o pre-push passou e os
hashes publicados no build batem com a fonte. O marco foi publicado no draft #572 em
`0ef681a2e6286c5eb728c386ae9389d3378ed72b`. Ainda faltam captura fresca 3:2/16:9 e revisão
humana no Game real. A lista de rotas, evidências pendentes, dívidas de aspecto e limites está em
[`VIEWMODEL-FOUNDATION-ALPHA246-2026-09-10.md`](VIEWMODEL-FOUNDATION-ALPHA246-2026-09-10.md).

## Precisão integrada como candidata fechada

Mosin/SVD/SKS foram staged fora do Git, otimizadas e ligadas ao runtime somente por
`vmauthored=1&vmweapon=mosin,svd,sks`. O gate configurável e o otimizador de output único foram
implementados com mutantes. Fonte e otimizado passaram T/M/C/F/A e os doze controles vermelhos;
a matriz da SVD passou 30 ciclos/630 amostras sem desaparecimento.

A primeira captura real produziu 42 frames em 1440×960/1440×810 para AK, faca, fallback e as três
armas de precisão e encontrou duas causas visuais: slots de skin avaliados por índice errado
criavam a peça bege dominante em Mosin/SKS, e anéis de ombro da SVD permaneciam opacos. A fase 3
corrigiu essas causas na assembly, ajustou contatos da recarga/inspeção e recapturou a matriz
inteira. Os produtos finais passaram T/M/C/F/A, doze mutantes, lifecycle 30× da SVD (630 amostras)
e inspeção das folhas 3:2/16:9 sem desaparecimento nem a geometria dominante anterior.

As três armas continuam `ready:false`: a inspeção interna elimina os defeitos conhecidos, mas não
substitui a revisão humana do dono no Game. O fallback das 26 armas está preservado e nenhum asset
privado entrou no Git. Checkpoints da fase 3: `e133be155`, `e44f1977b`, `662371b36`, `ff5148f15`.
Evidências, hashes e comando único estão em
[`VIEWMODEL-PRECISION-CANDIDATES-ALPHA246-2026-09-10.md`](VIEWMODEL-PRECISION-CANDIDATES-ALPHA246-2026-09-10.md).

## Marco noturno — inventário atualizado de worktrees e PRs

O inventário foi repetido após `git fetch --prune`, sem escrever nas fontes. A base segue
`origin/main@2115d5e2c` (`alpha.246`) e esta lane está limpa em `ff5148f15`, sincronizada com o
draft #572. As contagens de commits exclusivos das branches antigas são sinais de divergência
histórica; não autorizam transplantar a pilha.

| Fonte | Ref observada | Estado local | PR | Decisão para o catálogo final |
|---|---|---|---|---|
| controles | `glm/vm-controles-final@8b31f5dce5` | limpa, publicada | #549 · DIRTY | AK/faca já portadas; PT-38 segue fail-closed pelo asset privado; usar gates, não a branch |
| DMR | `claude/vm-dmr-final@701e98e44b` | 7 fixtures geradas modificadas | #544 · DIRTY | fonte reconstituída no #572; falso verde de pose/material corrigido; Rem700/G3SG1 seguem `ready:false` até revisão humana |
| LMG | `glm/vm-lmg-final@a8a9a8e896` | 2 commits adiante + 2 modificados + 3 novos, preservados | #546 · DIRTY | reprovada pelo dono; portar instrumentos apenas e reautorar depois |
| rifles | `codex/vm-prep-rifles@ea022c3c0e` | limpa, publicada | #509 · UNSTABLE | M4 aprovada somente em idle; recarga reprovada; outras cinco são receitas |
| precisão offline | `codex/vm-prep-precisao@99a522684a` | limpa, publicada | #513 · draft/UNSTABLE | supersedida funcionalmente pela precisão corrigida no #572 |
| retarget/gauntlet | `vm-cs16-gabarito@6451ecaf58` | limpa, 12 commits locais preservados | #468 · DIRTY | instrumentos e matemática; nenhum merge/cherry-pick integral |
| pilha paga histórica | `feat/fps-paid-viewmodels-aaa@c25a14ed01` | dirty fora de VM + privados ignorados | #464 · UNSTABLE | contratos e fixes transversais já extraídos; não promover bytes privados |
| pesadas piloto | `codex/vm-heavy@062543b12f` | limpa, publicada | sem PR próprio atual | AWP sem aceite; shotgun reprovada; somente builder/régua são reaproveitáveis |
| placeholders | `vm-prep-{armas-curtas,awp,shotgun}@d35c6658f0` | limpas, sem upstream | — | nenhuma produção final presente |
| integração final | `codex/viewmodels-catalog-final@ff5148f15` | limpa, sincronizada | #572 · draft/BLOCKED | única lane que escreve runtime e catálogo |

### Cobertura consolidada após o inventário

- **aprovadas pelo dono e integradas opt-in:** AK e faca; PT-38 aprovada na fonte, porém fechada
  nesta branch porque o produto não é publicável no Git;
- **tecnicamente fechadas, aguardando revisão humana:** Mosin, SVD e SKS;
- **tecnicamente fechadas, aguardando revisão humana:** Rem700 e G3SG1 agora também têm rebuild,
  hashes, mutantes e 24 capturas reais; continuam opt-in e `ready:false`;
- **tecnicamente fechadas, aguardando revisão humana:** M4, MD97, SCAR, FAMAS, M92 e carabina com seis
  clipes, carregadores separados e mãos; SCAR, FAMAS e M92 também movem seus comandos próprios;
- **tecnicamente fechadas, aguardando revisão humana:** Tavor com corpo bullpup próprio, carregador
  traseiro completo, paddle real, seis ações, mãos e apresentação corrigida da recarga;
- **tecnicamente fechada, aguardando revisão humana:** AKM com corpo/pente próprios e trava real;
  a fonte pública não oferece charging handle separável e a lacuna permanece explícita;
- **reprovadas:** LMG, shotgun e recargas M4 anteriores;
- **sem saída final localizada naquele inventário:** Deagle, revólver .38, MP5, Uzi, P90,
  G3, M400 e AWP; a G3 foi fechada depois sobre alpha.252, conforme o marco de 13/09 abaixo.

O rebuild DMR encontrou um falso verde na branch fonte: os nós rígidos eram anexados contra a bind
pose e os materiais copiavam índices sem transportar imagens/texturas. Os gates antigos passavam,
mas a primeira captura mostrava armas gigantes e desconectadas. A assembly do #572 passou a usar
`idle@first-key`, transportar recursos WebP com índices novos e validar os dois defeitos com
mutantes. As 24 recapturas em 3:2/16:9 mostram Rem700/G3SG1 novamente nas mãos, com material
próprio. O recibo completo está em
[`VIEWMODEL-DMR-INTEGRACAO-ALPHA246-2026-09-10.md`](VIEWMODEL-DMR-INTEGRACAO-ALPHA246-2026-09-10.md).

Checkpoints recuperáveis do marco DMR: `a61790562` (rebuild), `287cccc8a` (assembly e recursos),
`c2d93fa78` (contato/inspeção) e `24c72069f` (runtime opt-in, manifestos, mutantes e preview). Os
quatro commits preservam os binários fora do Git e não alteram o estado de aprovação.

## Índice exato para revisão da manhã

Estado tecnicamente mais forte para revisão humana: AK, faca, fallback, M4, MD97, SCAR, FAMAS,
M92, AKM, G3, carabina, Tavor, Mosin, SVD, SKS, Rem700 e G3SG1. A preparação do servidor mantém a ativação global
desligada e usa um snapshot imutável; o produto privado divergente da Mosin continua intacto e
rejeitado pelo hash:

```bash
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final
export PATH="/Users/ruben/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
CSBRASIL_VM_ASSET_ROOT=/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-snapshots/726ab95eb-54c72408 \
  npm run preview:vm-precision
```

Abrir somente após o comando:

```text
http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=ak&vmweapon=m4,md97,scar,famas,m92,akm,carbine,tavor,mosin,svd,sks,rem700,g3sg1&vmqa=precision
```

Índice de revisão: (1) AK idle/reload e troca para faca;
(2) fallback ao desativar `vmauthored`;
(3) M4 equip/shoot/recarga tática/recarga vazia/inspect/ADS; (4) MD97 identidade/pente/
recargas/inspect/ADS; (5) SCAR pente/comando lateral/inspect/ADS; (6) FAMAS pente traseiro/
comando superior/ADS; (7) M92 carregador curvo/comando lateral/recargas/inspect/ADS; (8) AKM
silhueta/pente/trava/recargas/inspect/ADS e ausência declarada do charging handle; (9) carabina
alavanca/portinhola/recargas/inspect/ADS; (10) Tavor carregador traseiro/paddle/recargas/inspect/ADS;
(11) Mosin shoot/ferrolho/reload/inspect/ADS; (12) SVD 30 trocas ou recargas sem sumir;
(13) SKS reload/inspect/ADS; (14) Rem700 shoot/ferrolho/reload/ADS;
(15) G3SG1 recarga tática/ADS; (16) G3 pente reto/comandos bilaterais/duas recargas/ADS;
(17) repetir
em janela 1440×960 e 1440×810. Aprovação deve registrar arma,
proporção e ação; até isso ocorrer, todas permanecem `ready:false` e a flag global continua off.

## Marco rifles — SCAR reautorada

A SCAR pública agora tem pente completo e comando lateral separados, seis ações, mãos e câmera.
Os nove mutantes de asset e seis mutantes de lifecycle morderam; o lifecycle passou 30 ciclos/
540 amostras. As 20 capturas foram refeitas junto das evidências M4/MD97 depois que a lane
encontrou um falso-verde no ADS do harness: a captura agora usa o controle real do jogador e
exige `adsAmount > 0.9`. M4 e MD97 mostram alça centralizada; a SCAR usa a linha do trilho da
malha pública e aguarda julgamento humano nas duas proporções.

Recibo: [`VIEWMODEL-RIFLES-SCAR-ALPHA246-2026-09-10.md`](VIEWMODEL-RIFLES-SCAR-ALPHA246-2026-09-10.md).
Checkpoints: `9c967e8f6`, `788ec4e8e`, `78465afaa`. Próxima arma: FAMAS.

## Marco rifles — M4 reautorada

A M4 deixou de ser somente um idle aprovado. A receita final externa preserva a aparência e
adiciona `equip_rifle`, `shoot`, duas recargas semanticamente distintas e `inspect`. A primeira
saída foi rejeitada porque o exporter eliminava o movimento do root das mãos no equip; o produto
atual anima um root comum e mede deriva zero em equip/tiro/inspeção.

O gate de asset passou com sete mutantes, carregador com excursão de 0,4524 m e retorno ao poço.
O lifecycle passou 30 ciclos/540 amostras alternando 3:2 e 16:9; 20 capturas reais não tiveram
erro fatal de viewmodel/WebGL. A candidata permanece `ready:false`, família AR fechada e global
off até revisão humana. Recibo completo:
[`VIEWMODEL-RIFLES-M4-ALPHA246-2026-09-10.md`](VIEWMODEL-RIFLES-M4-ALPHA246-2026-09-10.md).

Checkpoints: `0604f8879`, `f1f0b5211`, `7ed7df1ea`. Próxima arma é a MD97, com carregador
frontal próprio conforme a receita da preparação; não se reutiliza o pente da M4.

## Marco rifles — MD97 reautorada

A MD97 usa seu corpo público próprio e um carregador frontal de 20 tiros reconstruído a partir da
especificação medida do jogo. A escala final de 1,05 × 0,87 foi aplicada à geometria porque os
tracks herdados reimpunham a escala M4 durante as ações. O gate específico valida 6.466 vértices
do corpo, 48 vértices dos dois segmentos do pente, comprimento 0,9135 m e oito mutantes.

Lifecycle passou 30 ciclos/540 amostras e 20 capturas reais cobrem as duas proporções. A candidata
segue `ready:false`, com AR/global off até revisão humana. Recibo:
[`VIEWMODEL-RIFLES-MD97-ALPHA246-2026-09-10.md`](VIEWMODEL-RIFLES-MD97-ALPHA246-2026-09-10.md).

Checkpoints: `35ad8e345`, `50d00eb39`, `c684f12fd`. Próxima arma: SCAR; precisa de pente
integral e comando lateral próprio, sem promover o fragmento reprovado da preparação.

## Marco rifles — FAMAS reautorada

A FAMAS agora preserva corpo bullpup próprio, pente traseiro completo e comando superior sob a
alça. A trajetória de recarga foi reautorada para levar a mão esquerda ao pente traseiro: menor
distância medida de 0,1000 m no ciclo tático e 0,0471 m no vazio. O comando superior só opera na
recarga vazia. Nove mutantes de asset, seis de lifecycle, 30 ciclos/540 amostras e 20 capturas
reais passaram; 3:2 e 16:9 mostram a silhueta/ADS, ainda sem substituir revisão humana.

Recibo: [`VIEWMODEL-RIFLES-FAMAS-ALPHA246-2026-09-10.md`](VIEWMODEL-RIFLES-FAMAS-ALPHA246-2026-09-10.md).
Checkpoints: `ad9438253`, `49eadfb17`, `aa25a86ef`. Próxima arma: M92.

## Marco rifles — M92 reautorada

A M92 usa sua geometria pública própria sobre o rig, mãos e gramática da fundação AK aprovada. A
preparação solda duplicatas exatas e separa o carregador curvo integral e o comando lateral
direito. Seis ações, nove mutantes de asset e seis de lifecycle passaram; o lifecycle cobre 30
ciclos/540 amostras. Vinte capturas reais cobrem 3:2 e 16:9, sem erro fatal de viewmodel/WebGL.

A revisão humana deve decidir a apresentação vertical no fim da recarga, a distinção visual entre
recarga tática e vazia e a ocupação inferior do ADS. A candidata segue `ready:false`, família AK e
global off. A Mosin externa divergiu durante este marco e não foi sobrescrita; o preview posterior
usa uma cópia validada em snapshot isolado, com os dois hashes preservados no recibo da Carabina.

Recibo: [`VIEWMODEL-RIFLES-M92-ALPHA246-2026-09-10.md`](VIEWMODEL-RIFLES-M92-ALPHA246-2026-09-10.md).
Checkpoints: `f71613c69`, `71c4f0408`. O AK golden permanece preservado na fundação aprovada.

## Marco rifles — Carabina reautorada

A Carabina usa sua geometria pública própria e os componentes reais identificados por inspeção
bilateral/topológica: alavanca e portinhola direita de alimentação. O tiro cicla a alavanca; as
duas recargas usam a portinhola sem inventar pente ou cartucho, e somente a vazia termina com novo
ciclo da alavanca. Seis ações, onze mutantes de asset e seis de lifecycle passaram; o lifecycle
cobre 30 ciclos/540 amostras.

A primeira captura tecnicamente verde foi visualmente rejeitada porque a mão forte dominava a
câmera durante o tiro. A correção reduziu sua excursão de 0,9475 m para 0,0901 m, manteve o contato
causal e produziu 26 novas capturas 3:2/16:9 sem erro fatal. A candidata segue `ready:false`, AR e
global off. O preview usa um snapshot isolado com a Mosin validada; o arquivo privado divergente
continua preservado e rejeitado, com ambos os hashes registrados no recibo.

Recibo: [`VIEWMODEL-RIFLES-CARABINA-ALPHA246-2026-09-10.md`](VIEWMODEL-RIFLES-CARABINA-ALPHA246-2026-09-10.md).
Checkpoints: `20a394bf9`, `1e7549966`, `dd32c516e`. Próxima arma incompleta da família: Tavor.

## Marco rifles — Tavor reautorada

A Tavor agora usa sua malha pública própria orientada para o contrato AR, com o carregador
bullpup traseiro completo e o paddle real separados. As duas recargas removem e reassentam o
carregador; apenas a vazia pressiona o paddle. Dez mutantes de asset e seis de lifecycle
morderam; o lifecycle passou 30 ciclos/540 amostras e a fundação permaneceu verde 20/20.

A primeira captura tecnicamente verde foi rejeitada internamente porque o contato acontecia
abaixo do quadro. O pacote passou a apresentar a região traseira durante a recarga, retornando
exatamente ao idle. As 22 capturas corrigidas em 3:2/16:9 não tiveram erro fatal; a candidata
segue `ready:false`, AR/global off até reprodução humana da animação completa.

Recibo: [`VIEWMODEL-RIFLES-TAVOR-ALPHA246-2026-09-10.md`](VIEWMODEL-RIFLES-TAVOR-ALPHA246-2026-09-10.md).
Checkpoints: `cc643e014`, `83d1124d9`, `3119608cb`. O preview imutável corrente é
`preview-snapshots/3119608cb-e9032640`; próxima arma ainda sem saída final deve ser escolhida
entre AKM/G3 e as famílias MP5/SMG/P90, sem reabrir a Mosin divergente.

## Marco rifles — AKM reautorada

A AKM usa somente sua geometria pública visível sobre a fundação AK aprovada. A receita separa
o carregador curvo completo por um corte bilateral de 407 faces e a trava real do pente por 70
faces, preservando as 4.221 faces restantes no corpo. A fonte não contém um charging handle
separável; a candidata registra essa limitação e não mistura o comando da AK doadora.

Seis ações, nove mutantes de asset e seis de lifecycle passaram; o lifecycle cobre 30 ciclos/
540 amostras. Vinte capturas reais em 3:2/16:9 não tiveram erro fatal e mostram a identidade,
mãos, ADS e recargas. A revisão humana precisa decidir a apresentação vertical e a lacuna do
charging handle. A candidata segue `ready:false`, AK/global off.

Recibo: [`VIEWMODEL-RIFLES-AKM-ALPHA246-2026-09-10.md`](VIEWMODEL-RIFLES-AKM-ALPHA246-2026-09-10.md).
Checkpoints: `d11df56dd`, `726ab95eb`. O preview imutável corrente é
`preview-snapshots/726ab95eb-54c72408`; próxima arma incompleta: G3.

## Integração alpha.252 e marco rifles — G3 reautorada

A lane integrou `origin/main@5c2c5c93e` (`alpha.252`) por merge recuperável em
`38291dc6f`, sem rebase ou force-push. Os conflitos eram somente artefatos gerados de docs e
arquitetura, regenerados a partir da nova base. O gate UIR15 foi atualizado para medir o fallback
robusto de troca de time que já veio de `main`; `check:deploy` passou 39/39 após o checkpoint
`6b80664b6`.

A G3 agora usa sua malha pública própria, carregador reto completo e os dois botões reais de
retenção do pente. A receita entrega mãos, câmera, muzzle/sight, `idle`, `equip_rifle`, `shoot`,
`reload_tactical`, `reload_empty`, `inspect` e ADS. A fonte não oferece charging handle
separável; a limitação continua explícita e nenhum componente da arma doadora aparece como G3.

Nove mutantes de asset e seis de lifecycle morderam. O lifecycle passou 30 ciclos/540 amostras.
Vinte capturas reais em 3:2/16:9, mais duas folhas de contato, não tiveram erro fatal. A primeira
captura 16:9 encontrou que o harness alternava a mira e às vezes registrava hip-fire como ADS; o
capturador passou a definir o estado explicitamente, e as duas recapturas mostram a alça
centralizada. A candidata segue `ready:false`, família G3/global off até revisão humana.

Recibo: [`VIEWMODEL-RIFLES-G3-ALPHA252-2026-09-13.md`](VIEWMODEL-RIFLES-G3-ALPHA252-2026-09-13.md).
Gate vermelho: `a41eb9718`; receita recuperável: `0f7f2cf1e`; integração: `b8e361a69`.
O preview imutável corrente é `preview-snapshots/b8e361a69-1d416e5b`. Próxima arma incompleta: M400.

## Marco de precisão alpha.252 — M400 reautorada

A M400 agora usa sua malha pública própria, carregador curvo completo, trava real do pente à
direita e bolt catch real à esquerda. A receita entrega mãos, câmera, muzzle/sight, `idle`,
`equip_rifle`, `shoot`, `reload_tactical`, `reload_empty`, `inspect`, ADS e cobertura real da
luneta. A fonte não contém charging handle separável; a limitação fica explícita e nenhum
componente da arma doadora aparece como M400.

Dez mutantes de asset e seis de lifecycle morderam. O lifecycle passou 30 ciclos/540 amostras.
Vinte e duas capturas reais em 3:2/16:9, mais duas folhas de contato, não tiveram erro fatal.
O capturador também passou a aguardar três frames completos após `scopeCovered`, eliminando o
quadro antigo que o SwiftShader podia preservar na máscara. A evidência confirma
`vmRootVisible:false` na luneta e a pose física ADS separadamente. A candidata segue
`ready:false`, família sniper/global off até revisão humana.

Recibo: [`VIEWMODEL-RIFLES-M400-ALPHA252-2026-09-13.md`](VIEWMODEL-RIFLES-M400-ALPHA252-2026-09-13.md).
Gate vermelho: `c16ada823`; receita recuperável: `411f9fbbc`; integração: `7621b8297`.
O preview imutável corrente é `preview-snapshots/7621b8297-c86d5f2c`. Próxima arma incompleta: AWP.

## Marco de precisão alpha.252 — AWP reautorada

A AWP agora usa sua malha pública própria, carregador destacável completo e alavanca real do
ferrolho. A receita entrega mãos, câmera, muzzle/sight, `idle`, `equip_rifle`, `shoot`,
`reload_tactical`, `reload_empty`, `inspect`, ADS físico e cobertura real da luneta. O tiro e a
recarga vazia ciclam o ferrolho; a tática não. A trava do pente é fundida ao receiver na fonte,
e essa lacuna continua explícita sem inventar um componente da arma doadora.

Dez mutantes de asset e seis de lifecycle morderam. O lifecycle passou 30 ciclos/540 amostras.
Vinte e duas capturas reais em 3:2/16:9, mais duas folhas de contato, não tiveram erro fatal. O
primeiro lote encontrou framebuffer antigo no ADS 16:9 sob SwiftShader; após exigir três frames
completos, a recaptura confirma a ocular centralizada nos dois aspectos e
`vmRootVisible:false` dentro do scope. A candidata segue `ready:false`, família sniper/global
off até revisão humana.

Recibo: [`VIEWMODEL-RIFLES-AWP-ALPHA252-2026-09-14.md`](VIEWMODEL-RIFLES-AWP-ALPHA252-2026-09-14.md).
Gate vermelho: `1b8d8cc9a`; receita recuperável: `57bbb8a9b`; integração: `66e3a5842`.
O preview imutável corrente é `preview-snapshots/66e3a5842-fb1d0961`. Próxima arma incompleta:
PT-38.

## Marco controles alpha.252 — PT-38 fechada

A PT-38 preserva por hash a X18/G18 aprovada em 07/09, com suas duas mãos,
materiais e quatro ações originais. A receita acrescenta `inspect` no root comum
e sockets medidos de muzzle/sight; o saque procedural existente continua
sincronizado ao gameplay. O produto final contém carregador, slide, gatilho,
cano e cartucho próprios, além de ADS físico.

Dez mutantes de asset e seis de lifecycle morderam. O lifecycle passou 30 ciclos/
540 amostras. Vinte capturas reais em 3:2/16:9, mais duas folhas de contato, não
tiveram erro fatal. A base visual já fora aprovada pelo dono, mas o novo inspect
e ADS ainda exigem revisão humana; a candidata segue `ready:false`, família
pistol/global off.

Recibo: [`VIEWMODEL-PISTOL-PT38-ALPHA252-2026-09-14.md`](VIEWMODEL-PISTOL-PT38-ALPHA252-2026-09-14.md).
Gate vermelho: `a823a4c99`; receita recuperável: `c9795c612`; integração:
`373b27fec`. O preview imutável corrente é
`preview-snapshots/c9795c612-04c126d9`. Próxima arma incompleta: Deagle.

## Marco controles alpha.252 — Deagle fechada

A Deagle usa a DGL50 própria, duas mãos completas, slide, cão, gatilho e carregador
separados. O pacote entrega cinco ações, ADS físico e draw sincronizado à cadência da
pistola. Um primeiro enquadramento foi rejeitado internamente porque punho e mãos
ficavam baixos; o frame final elimina esse corte nos dois aspectos.

Oito mutantes de asset e seis de lifecycle morderam. O lifecycle passou 30 ciclos/
540 amostras. Vinte capturas reais em 3:2/16:9 não tiveram erro fatal e mostram as
duas recargas, slide/cão no tiro, inspect e ADS. A candidata segue `ready:false`,
família pistol/global off até revisão humana.

Recibo: [`VIEWMODEL-PISTOL-DEAGLE-ALPHA252-2026-09-14.md`](VIEWMODEL-PISTOL-DEAGLE-ALPHA252-2026-09-14.md).
Gate vermelho: `4d30a3365`; integração: `f1a871277`; enquadramento e capturas:
`9f1d7f5dd`. O preview imutável é `preview-snapshots/f1a871277-85c38a13`.
Próxima arma incompleta: Revólver .38.

## Marco controles alpha.252 — Revólver .38 fechado

O Revólver .38 congela por hash a Viper-357 própria e entrega duas mãos, tambor,
braço do tambor, extrator, cão e gatilho próprios. O tiro movimenta os três comandos;
a recarga abre o tambor, aciona o extrator e mantém contato visível da mão de apoio.
O pacote também entrega draw, inspect com retorno exato e ADS físico.

Nove mutantes de asset, três mutantes mecânicos independentes e seis de lifecycle
morderam. O lifecycle passou 30 ciclos/540 amostras. Dezoito capturas reais em
3:2/16:9 não tiveram erro fatal e confirmam enquadramento, contatos e eixo de mira.
A candidata segue `ready:false`, família revolver/global off até revisão humana.

Recibo: [`VIEWMODEL-PISTOL-REVOLVER-ALPHA252-2026-09-14.md`](VIEWMODEL-PISTOL-REVOLVER-ALPHA252-2026-09-14.md).
Gate vermelho: `51d617b60`; integração: `79b91e413`; captura final:
`cebe82502`. O preview imutável corrente é
`preview-snapshots/79b91e413-422b7118`. Próxima arma incompleta: MP5.

## Marco submetralhadoras alpha.252 — MP5 fechada

A MP5 congela por hash a fonte KINEMATION privada e entrega duas mãos, carregador,
ferrolho, alavanca, retém e gatilho próprios. O pacote tem cinco ações: o tiro cicla
ferrolho/gatilho, as duas recargas removem o pente, a vazia aciona a alavanca e o
inspect retorna ao idle sem drift final da pega forte.

Nove mutantes de asset e seis de lifecycle morderam. O lifecycle passou 30 ciclos/
540 amostras. Vinte e duas capturas reais em 3:2/16:9 não tiveram erro fatal e
confirmam enquadramento, mecanismos, contatos e pose de ombro. Tentativas de ADS
automático foram rejeitadas porque a topologia skinned/rest do pacote trazia manga e
arma para primeiro plano; o candidato final usa calibração de ombro e mantém a
limitação explícita. A candidata segue `ready:false`, família mp5/global off.

Recibo: [`VIEWMODEL-SMG-MP5-ALPHA252-2026-09-14.md`](VIEWMODEL-SMG-MP5-ALPHA252-2026-09-14.md).
Gate vermelho: `2e17261e6`; integração: `99305754b`; captura/ADS final:
`006a0814a`. O preview imutável corrente é
`preview-snapshots/9ff5f0ecf-14d430b6`. Próxima arma incompleta: Uzi.

## Marco submetralhadoras alpha.252 — Uzi fechada

A Uzi usa sua malha pública própria assada sobre a fundação KINEMATION privada, com
duas mãos completas. O carregador próprio acompanha o bone `Mag`; ferrolho superior
e gatilho próprios são visíveis e animados. O tiro e inspect agora congelam a pose
completa do idle, eliminando a herança indevida da última recarga. As duas recargas
removem o pente e a vazia também aciona o ferrolho.

Nove mutantes de asset e seis de lifecycle morderam. O lifecycle passou 30 ciclos/
540 amostras. Vinte e duas capturas reais em 3:2/16:9 não tiveram erro fatal e
confirmam enquadramento, mecanismos, contatos, draw, inspect e pose de ombro. O
retarget anterior foi rejeitado por sobreposição das mãos; o ADS automático também
foi rejeitado porque perdia a cruz. A candidata segue `ready:false`, família
smg/global off até revisão humana.

Recibo: [`VIEWMODEL-SMG-UZI-ALPHA252-2026-09-14.md`](VIEWMODEL-SMG-UZI-ALPHA252-2026-09-14.md).
Gate vermelho: `2ea19b608`; primeira integração: `fcb70b30e`; ações/ADS e captura
final: `d55560c68`. O preview imutável corrente é
`preview-snapshots/d55560c68-353d0384`. Próxima arma incompleta: P90.

## Marco submetralhadoras alpha.252 — P90 fechada

A P90 usa arma, pente superior e mecanismos próprios do pacote KINEMATION montados
sobre a câmera e as malhas de mãos da fundação SMG; as ações autorais foram
retargetadas por nome para esse esqueleto. O pacote isolado foi rejeitado porque
chegava 41,56° fora do eixo do gabarito. O tiro cicla alavanca, mecanismo e gatilho;
as duas recargas removem o pente superior e a vazia também aciona alavanca e
mecanismo.

Nove mutantes de asset e seis de lifecycle morderam. O lifecycle passou 30 ciclos/
540 amostras. Vinte e duas capturas reais em 3:2/16:9 não tiveram erro fatal. O ADS
automático por sockets foi rejeitado por tirar o cano do quadro; o produto usa pose
de ombro conservadora. A candidata segue `ready:false`, família smg/global off até
revisão humana.

Recibo: [`VIEWMODEL-SMG-P90-ALPHA252-2026-09-14.md`](VIEWMODEL-SMG-P90-ALPHA252-2026-09-14.md).
Gate vermelho: `ec1da3091`; integração: `f30cee9b0`; estabilização e captura final:
`e21aa2777`. O preview imutável corrente é `preview-snapshots/e21aa2777-85f87b74`.
Próxima arma incompleta: shotgun.

## Marco pesadas alpha.252 — Shotgun fechada

A M3 Conversa Fiada usa a KXG12 própria do pacote produzido para o catálogo, duas
mãos completas e ciclo de pump, gatilho e cartucho unitário. O produto entrega
`idle`, tiro, draw, início de recarga, inserção repetível de cartuchos, fechamento
e inspect. A receita substitui só os bytes duplicados dos nove atlas de mãos por
placeholders de mesmo nome (25 MB → 4,1 MB), sem mudar arma, rig, clipes ou
mecanismos. O resultado anterior reprovado de `codex/vm-heavy` não foi promovido.

Nove mutantes de asset e sete controles de lifecycle morderam. O lifecycle passou
30 ciclos/540 amostras incluindo oito inserções seguidas. Vinte e seis capturas
reais em 3:2/16:9 não tiveram erro fatal. O ADS usa pose de ombro conservadora
porque o alinhamento por sockets aproximava demais o cano. A candidata segue
`ready:false`, família heavy/global off até revisão humana.

Recibo: [`VIEWMODEL-HEAVY-SHOTGUN-ALPHA252-2026-09-14.md`](VIEWMODEL-HEAVY-SHOTGUN-ALPHA252-2026-09-14.md).
Gate vermelho: `b6128b842`; integração e captura: `8bedf48ed`. O preview imutável
corrente é `preview-snapshots/8bedf48ed-f4522831`. Próxima arma incompleta: LMG —
a última das 26.

## Marco pesadas alpha.252 — LMG fechada, última das 26

A Metralha "Treta Pesada" usa a MGX5 própria do pacote, duas mãos completas e
mecanismos próprios de caixa, cinto, tampa, bandeja e alavanca. O produto entrega
`idle`, tiro que avança o cinto um elo, recarga tática, recarga vazia e inspect;
o saque vem do pacote General, como na P90.

O ciclo achou um defeito que a régua não via porque a régua o premiava. As
recargas do pacote transladavam a tampa 87,79 cm, a bandeja 54,32 cm e a caixa
57,79 cm no rig; em primeira pessoa a tampa aparecia pairando no canto superior
direito, solta no ar. Os limites antigos eram só inferiores
(`coverExcursion >= 0.5`) e mediam excursão de origem de nó no mundo — mas essas
peças são ossos sem malha própria, então a medida não descrevia nem contato nem
enquadramento. A régua passou a medir rotação e translação local em cm: tampa e
bandeja abrem por dobradiça no pivô do receiver (76,6° e 45,1°, 0 cm de
translação) e a caixa sai do poço com módulo limitado a 18 cm, preservando a
trajetória autorada.

Treze mutantes morderam, incluindo três novos que reintroduzem o defeito. O
lifecycle passou 13 controles/30 ciclos/600 amostras. Trinta e duas capturas
reais em 3:2/16:9 não tiveram erro fatal e nenhuma fase mostra peça solta no
quadro. A candidata segue `ready:false`, família lmg/global off.

Recibo: [`VIEWMODEL-HEAVY-LMG-ALPHA252-2026-09-18.md`](VIEWMODEL-HEAVY-LMG-ALPHA252-2026-09-18.md).
Integração: `abd34869e`. O preview imutável corrente é
`preview-snapshots/abd34869e-2afc8c26`.

As 26 armas do catálogo agora têm candidata técnica. Nenhuma está aprovada: todas
seguem `ready:false` com ativação global desligada, e a pendência de contato da
mão de apoio nas recargas continua aberta para o arsenal inteiro. O próximo marco
é a etapa 5 da ordem de integração — regressão cruzada, duas proporções, HUD,
terceira pessoa, build limpo e revisão adversarial —, ainda não executada.

## Checkpoint de continuidade — 22/09/2026 01:48 WEST

A branch `codex/viewmodels-catalog-final` foi reconciliada por merge com
`origin/main@7bb2707ef576260b30ceb88c5973b9f6618684cd` sem descartar os checkpoints
do catálogo. O primeiro commit publicado após a reconciliação é
`2e44edaef7f1e8a5f45df5954d3f4c3e140281d7`; `check:deploy` passou 40/40 sobre
a versão `alpha.261`. O PR #572 continua Draft, mergeável, sem `ready:true` e
sem ativação de família ou global.

O preview privado estava atrasado em relação ao manifesto em dois produtos. Ele
foi reparado fora do Git, com cópia de segurança do produto anterior:

- M400 promovida para o piloto KINEMATION `f75e4625…` (1.537.064 bytes), com
  55/55 ossos, três camadas de mãos, seis ações, recargas com excursão 0,3285 m
  e retorno 0; lifecycle 10/10, 30 ciclos/540 amostras. A M400 também passa a
  régua de enquadramento (1,006× em 3:2, 0,970× em 16:9, 95,3% visível);
- LMG restaurada no preview pelo produto fixado `2afc8c26…` (6.601.448 bytes),
  gate causal verde com 13/13 mutantes e lifecycle 13/13, 30 ciclos/600
  amostras.

O contrato comum de recarga foi corrigido para reconhecer `reload_empty` como
uma recarga completa válida. Isso remove o falso vermelho do Revólver .38, cujo
produto já prova tambor, extrator, cão e gatilho na recarga vazia. O gerador e o
JSON congelado continuam concordando.

Estado causal corrente de `eval:vm-rig`: 24 produtos privados localizados; 20
estão no rig KINEMATION. Restam quatro produtos inteiramente no rig legado
(`m92`, `akm`, `g3`, `awp`) e três lacunas reais de ações (`rem700`: inspect;
`g3sg1`: shoot e inspect). `eval:vm-frame` agora mede todas as 24 candidatas,
mas continua vermelho por enquadramento/escala/ordem dos sockets em várias
famílias; esse vermelho é pendência de produção, não autorização para ligar o
catálogo.

Próximo passo sequencial: reautorar Rem700 sobre a gramática bolt KINEMATION e
G3SG1 sobre a gramática AR KINEMATION, preservando suas malhas e mecanismos;
depois migrar `m92`, `akm`, `g3` e `awp` do metarig. Cada promoção exige gate
causal/mutante, lifecycle, enquadramento nas duas proporções e capturas reais
antes de revisão humana. Nenhuma candidata está aprovada.

### Marco de ações DMR — 22/09/2026 01:00 WEST

As lacunas de ação da Rem700 e G3SG1 foram fechadas como candidatas, ainda sem
aprovação humana. A receita `dmr-action-contract.mjs` clona os 201 canais do
`idle` para preservar a pose inteira das mãos e adiciona movimento autorado no
root; um clipe isolado apenas de root faria o rig cair na bind pose. A Rem700
passa a ter `inspect` (excursão 7,92 cm, endpoint 0); a G3SG1 passa a ter
`shoot` (3,34 cm, endpoint 0) e `inspect` (7,92 cm, endpoint 0).

Produtos privados candidatos: Rem700 `8e16a7e8…` (4.695.400 bytes) e G3SG1
`3334e5a2…` (4.080.224 bytes). O gate DMR passou nove mutantes por arma,
incluindo remoção específica de shoot/inspect, e preservou ferrolho, pente,
alavanca, materiais, sockets e alinhamento idle. O lifecycle combinado passou
11/11 controles, 30 ciclos por arma e 1.020 amostras em 3:2/16:9. O contrato
do arsenal agora fica vermelho apenas pelos quatro rigs legados: M92, AKM, G3
e AWP.

A captura no jogo real produziu 36 PNGs em 1440×960 e 1440×810, sem erro fatal,
mais folhas de contato. Evidência privada:
`evidence/dmr-actions-20260922-0055`; `capture.json` SHA-256
`1b1e080774363c49e59ef48b49b046c2d1d8688879beb73519b474762cb8e354`.
A inspeção técnica não encontrou peça desaparecida nem quebra entre aspectos,
mas Rem700 e G3SG1 continuam reprovadas pela régua de enquadramento/escala e o
contato/pose das mãos ainda exige julgamento humano. `ready:false` e flags de
família/global permanecem desligadas.

### Marco de rig legado — M92 KINEMATION em 22/09/2026

A M92 deixou o rig `*_metarig` e foi reautorada sobre o checkpoint final da M4
KINEMATION. O produto `95b0445b…` (1.654.024 bytes) mantém a malha pública
própria, pente curvo separado e alavanca lateral real, agora com 55/55 ossos do
contrato e três camadas de mãos skinadas. As seis ações estão presentes; as
duas recargas percorrem 0,3873 m com o pente e retornam a zero, e somente a
recarga vazia aciona a alavanca por 0,0446 m, também com retorno a zero.

O gate causal passou 13 mutantes. O lifecycle passou 10/10 controles, 30
ciclos/540 amostras. A calibração individual passou nas duas proporções:
0,987× e 95,9% visível em 3:2; 0,942× e 95,9% visível em 16:9. O contrato do
arsenal agora fica vermelho somente por AKM, G3 e AWP.

A captura real ligada ao checkpoint `fb443673a` produziu 20 PNGs em 1440×960 e
1440×810, sem erro fatal. Evidência privada:
`evidence/m92-kinemation-20260922-0340`; `capture.json` SHA-256
`4ee05b41b81093289dafcf09b22de4873d621d6b5a2b6e2cf54dae1bc7885d37`.
As folhas de contato não mostram desaparecimento, inversão ou quebra entre
aspectos, mas mãos, contato, ADS e movimento ainda dependem de revisão humana.
Recibo:
[`VIEWMODEL-RIFLES-M92-KINEMATION-2026-09-22.md`](VIEWMODEL-RIFLES-M92-KINEMATION-2026-09-22.md).
`ready:false`, família AK e global permanecem desligados. Próximo rig: AKM.

### Marco de rig legado — AKM KINEMATION em 22/09/2026

A AKM deixou o rig `*_metarig` e foi reautorada sobre o checkpoint final da M4
KINEMATION. O produto `ebcfd0d3…` (1.487.308 bytes) mantém a malha pública
própria, o pente curvo completo e a trava real do pente, agora com 55/55 ossos
do contrato e três camadas de mãos skinadas. As seis ações estão presentes; as
duas recargas percorrem 0,3873 m com o pente e 0,0056 m com a trava, retornando
as duas peças a zero. A fonte não possui alavanca de manejo separável, e a
receita não inventa uma.

O gate causal passou 13 mutantes. O lifecycle passou 10/10 controles, 30
ciclos/540 amostras. A calibração individual passou nas duas proporções:
0,913× e 93,5% visível em 3:2; 0,905× e 93,5% visível em 16:9, com o braço
abaixo do orçamento de 1,4×. O contrato do arsenal agora fica vermelho somente
por G3 e AWP.

A captura real ligada ao checkpoint `22db178b6` produziu 20 PNGs em 1440×960 e
1440×810, sem erro fatal. Evidência privada:
`evidence/akm-kinemation-20260922-0426`; `capture.json` SHA-256
`0ed39d63d10607b1787cac7944e710d6c4797a93a425adcadcd514b943ca1467`.
As folhas de contato não mostram desaparecimento, inversão ou quebra entre
aspectos. A inclinação do eixo, mãos, contatos, ADS e movimento ainda dependem
de revisão humana. Recibo:
[`VIEWMODEL-RIFLES-AKM-KINEMATION-2026-09-22.md`](VIEWMODEL-RIFLES-AKM-KINEMATION-2026-09-22.md).
`ready:false`, família AK e global permanecem desligados. Próximo rig: G3.

### Marco de rig legado — G3 KINEMATION em 22/09/2026

A G3 deixou o rig `*_metarig` e foi reautorada sobre o checkpoint final da M4
KINEMATION. O produto `6a4cd484…` (1.607.272 bytes) mantém a malha pública
própria, o pente reto completo e os dois botões reais de retenção, agora com
55/55 ossos do contrato e três camadas de mãos skinadas. As seis ações estão
presentes; as duas recargas percorrem 0,3873 m com o pente e 0,0056 m com os
botões, retornando as peças a zero. A fonte não possui alavanca de manejo
separável, e a receita não inventa uma.

O gate causal passou 13 mutantes. O lifecycle passou 10/10 controles, 30
ciclos/540 amostras. A calibração individual passou nas duas proporções:
1,038× e 97,6% visível em 3:2; 1,006× e 97,6% visível em 16:9, com o braço
abaixo do orçamento de 1,4×. O contrato do arsenal agora fica vermelho somente
por AWP.

A captura real ligada ao checkpoint `d0037ac08` produziu 20 PNGs em 1440×960 e
1440×810, sem erro fatal. Evidência privada:
`evidence/g3-kinemation-20260922-0440`; `capture.json` SHA-256
`7f662ff1045a7fd3830532f2087b0d8eb4b58dc7158a816a04b52cbb80b16c84`.
As folhas de contato não mostram desaparecimento, inversão ou quebra entre
aspectos. A inclinação do eixo, mãos, contatos, ADS e movimento ainda dependem
de revisão humana. Recibo:
[`VIEWMODEL-RIFLES-G3-KINEMATION-2026-09-22.md`](VIEWMODEL-RIFLES-G3-KINEMATION-2026-09-22.md).
`ready:false`, família G3 e global permanecem desligados. Próximo rig: AWP.

### Marco de rig legado — AWP KINEMATION em 22/09/2026

A AWP deixou o rig `*_metarig` e foi reautorada sobre o checkpoint final da M4
KINEMATION. O produto `3e6b77e4…` (1.486.132 bytes) mantém a malha pública
própria, o pente completo e a alavanca real do ferrolho, agora com 55/55 ossos
do contrato e três camadas de mãos skinadas. As seis ações estão presentes; as
duas recargas percorrem 0,3873 m com o pente, o ferrolho percorre 0,1000 m no
tiro e na recarga vazia e fica fechado na tática. A trava do pente é fundida ao
receiver da fonte, e a receita não inventa uma.

O gate causal passou 14 mutantes, com mutantes próprios para cada ciclo do
ferrolho. O lifecycle passou 10/10 controles, 30 ciclos/540 amostras. A
calibração individual passou nas duas proporções: 0,936× e 95,3% visível em
3:2; 0,890× e 96,0% visível em 16:9, com o braço abaixo do orçamento de 1,4×.
O contrato `eval:vm-rig` agora fica verde nas 24 candidatas medidas: não resta
rig legado nem ação obrigatória faltando.

A captura real ligada ao checkpoint `920d2e6ca` produziu 22 PNGs em 1440×960 e
1440×810, incluindo ADS e scope, sem erro fatal. Evidência privada:
`evidence/awp-kinemation-20260922-0455`; `capture.json` SHA-256
`76dd0608011347825c8a8e9b9eb2faca86089e9a3d5bc7a2467b4a6491e9c665`.
As folhas de contato não mostram desaparecimento, inversão ou quebra entre
aspectos, mas mãos, contatos, ADS/scope e movimento ainda dependem de revisão
humana. Recibo:
[`VIEWMODEL-RIFLES-AWP-KINEMATION-2026-09-22.md`](VIEWMODEL-RIFLES-AWP-KINEMATION-2026-09-22.md).
`ready:false`, família sniper e global permanecem desligados.

### Regressão de enquadramento — cluster AR MD97/SCAR em 22/09/2026

Os dois vermelhos residuais da família AR foram removidos sem trocar produto.
A MD97 passa a régua com 0,944×/86,8% visível/1,385× de braço em 3:2 e
0,891×/92,7%/1,288× em 16:9. A SCAR passa com 0,972×/94,4%/0,929× e
0,900×/95,5%/0,866×. Seus gates causais e lifecycles continuam verdes.

As capturas reais ligadas a `d60469593` produziram 20 PNGs por arma e aspecto,
sem erro fatal: `evidence/ar-frame-md97-20260922-0510` e
`evidence/ar-frame-scar-20260922-0512`. Recibo:
[`VIEWMODEL-FRAME-AR-MD97-SCAR-2026-09-22.md`](VIEWMODEL-FRAME-AR-MD97-SCAR-2026-09-22.md).
As candidatas continuam `ready:false`; escala, inclinação, mãos, ADS e ações
dependem de revisão humana.
