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

O gate novo passou 20/20, sintaxe/arquitetura/build passaram, e os hashes publicados no build
batem com a fonte. Ainda faltam captura fresca 3:2/16:9 e revisão humana no Game real. A lista
de rotas, evidências pendentes, dívidas de aspecto e limites de reconstrução está em
[`VIEWMODEL-FOUNDATION-ALPHA246-2026-09-10.md`](VIEWMODEL-FOUNDATION-ALPHA246-2026-09-10.md).
A etapa de Mosin/SVD/SKS permanece bloqueada até esse aceite e não foi iniciada.
