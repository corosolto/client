# Viewmodel K — integração de todas as frentes (#629–#637) e decisões do dono

**Data:** 23/09/2026 · **Branch:** `vm/integracao-k` · **Base:** `vm/launch-k` (`1b5858568`, PR #629).
Substitui #629 e os PRs #630–#637. Nenhuma flag `ready` nem `VM_LAUNCH` foi mudada.

Retrato datado. O estado vivo é o que as réguas citadas imprimem; se este arquivo e a régua
divergirem, vale a régua.

## 1. Junção

Contenção medida com `git merge-base --is-ancestor` antes de juntar:

| Branch (PR) | Contida em |
|---|---|
| vm/review-bench (#630) | reguas, fix-l3l5 |
| vm/k-rebuild (#631), vm/fix-mesh (#632), vm/fix-grips (#633) | fix-l3l5, fix-grips-r2 |
| vm/fix-mags (#634), vm/reguas (#636) | fix-l3l5 |
| vm/fix-l3l5 (#635), vm/fix-grips-r2 (#637) | nenhuma |

Por isso bastaram três fusões, nesta ordem: #636, #635 e #637. Nenhuma frente de 630–634 ficou
de fora; todas entram pelo #635 ou pelo #637.

| Fusão | Conflitos | Resolução |
|---|---|---|
| #636 `vm/reguas` | nenhum | — |
| #635 `vm/fix-l3l5` | nenhum (o #635 já tinha fundido 631–634 e 636) | — |
| #637 `vm/fix-grips-r2` | `ARCH.generated.md`, `README.md`, `STATUS.md`, 8 páginas de `docs/**` | gerados: `npm run docs` e `npm run arch` |
| | `package.json` | união dos scripts: `eval:vm-orientacao` (#635) + `eval:vm-manga-oca` |
| | `public/js/data/vmbytes.js` | regerado por `gen-vmbytes.mjs` dos manifestos fundidos; cada arma sai do dono (abaixo) |
| | `tools/eval/authored-ads-check.mjs` (cabeçalho) | união: nota de cegueira do AD1 (#636) + AD4 da pose de ADS (#637) |

Sem conflito textual, conferi cada entrada por arma de `vmconfig.js` e `vmframe.js` contra
os nove branches (script de comparação por arma, não o diff):

- **fix-grips-r2**: ak, akm, m92, revolver38 e shotgun. Frame, ADS e `linhaDeMira` são os do
  #637, que é o mais novo do dono dessas armas.
- **fix-grips**: md97.
- **reguas**: config de mp5 e p90. O produto das duas é do fix-mags.
- **review-bench**: `ads.auto` de uzi, p90 e lmg.
- **fix-mags**: linha `sks` do `vmframe.js`.
- **fix-l3l5**: linhas de mosin, rem700, g3 e carbine no `vmframe.js`.
- **k-rebuild**: faca e granada (`VM_MELEE`/`VM_FAMILY`), e a pistola antes da decisão (a).

Geradores: `gen-vmbytes` regerado. `gen-vmsharedver` e `gen-goldenver` não mudaram nada.
`gen-weaponver` não roda por inteiro em nenhum branch, porque o catálogo não tem o
`<família>-runtime.glb` das famílias assadas. Mesmo assim, o `eval:vm-cache` confere o
`FAMILY_VER` contra todo GLB de família presente e passa verde.

## 2. Catálogo privado único

`~/csbrasil-private-assets/generated/viewmodels-integracao-k/overlay` junta duas fontes:
hardlinks do catálogo Codex (`viewmodels-catalog-final/preview-root`) e, para cada arma, o
produto da overlay dona dela. Cada arquivo foi conferido pelo sha256 do manifesto
`*-candidates.json` integrado; é o mesmo valor que o `vmbytes.js` publica. A origem de cada
arquivo está em `overlay-origem.json`. Nenhuma outra overlay e nenhum arquivo do catálogo foram
escritos. O worktree aponta para o catálogo por `public/private-assets/viewmodels`.

| Overlay | Armas (sha256[:10]) |
|---|---|
| fix-grips-r2 | ak `eb81672988`, akm `b9d689749c`, m92 `dd51c07b8f`, revolver38 `40b53e2fba`, shotgun `48f292b918` |
| fix-grips | md97 `4cd468a65f` |
| fix-mesh | lmg `025a99f2f5` |
| fix-mags | mp5 `b548817afd`, p90 `1484c03ba7`, uzi `f5c2da77aa`, sks `0e5d0ff138` |
| fix-l3l5 | mosin `69c750bb5b`, rem700 `314cf08a94`, deagle `e480f69e76`, m400 `838066951a`, svd `605df7e22d` |
| k-rebuild | knife `93028919ee`, grenade-runtime `f6033daefb`, grenades-world `0e64280c5b` |
| catálogo | m4, scar, famas, carbine, tavor, g3, g3sg1, awp, pistol `04c126d931` e os compartilhados |

Réguas de catálogo: `eval:vm-cache` verde (todos os `VM_BYTES` batem com os bytes) e
`eval:vm-launch` verde (VL6 sem faltantes, 7/7 mutantes vermelhos).

## 3. Decisões do dono aplicadas

Todos os limiares ficam num lugar só, `tools/eval/lib/vm-limiares.mjs`. O crítico
(`.claude/agents/critico-visual-vm.md`) declara os mesmos números.

**(a) Curtas contra a PT-38 aprovada.**
- A reescala do #631 saiu. A pistola voltou ao `FAMILY_FRAME.pistol` (z −0,22, fov 55, yaw 15°) e deixou de ter `frame` e `ads.pull` próprios.
- `ARMAS_CURTAS` + `PISTOLA_APROVADA` (frame aprovado e produto `04c126d931`) valem para as três réguas que medem tamanho, com a mesma faixa `PISTOLA_FAIXA`, 0,80–1,25 por metro:
  - `eval:vm-frame` mede por vértice contra a aprovada. Se o produto não for o aprovado, reprova.
  - `eval:vm-cobertura` passou a medir as curtas: tamanho por metro, cruz e olho. Antes dava N/A.
  - `eval:vm-pistola-ref` continua como estava.
- Mutantes novos, todos vermelhos:
  - `pistola-631` na cobertura: 0,58×.
  - `pistola-631` no vm-frame: 0,556×.
  - `curta-na-ak` no vm-frame: 1,796×.
- A deagle media 0,63× da PT-38. Recebeu frame de curta (fov 55, yaw 15°, z −0,25) e resíduo de ADS:
  - raster 1,13×, `eval:vm-pistola-ref` verde;
  - mira 47 → 10 px;
  - vm-frame 0,927×.
- Crítico da pistola: **IGUAL-A-APROVADA** (`artifacts/review-integrado/critico/pistola/veredito.txt`).
- Crítico A/B da deagle: **MELHOROU**, de REPROVADA para RESSALVA. Sobram a alça ~30 px à direita no ADS e a vazia 75% abaixo do quadro (fila C11).

**(b) LMG na opção B.**
- `VM_WEAPON.lmg.frame.z` passou a −0,375.
- vm-frame 0,877× (3:2) e 0,837× (16:9).
- O teto da faixa própria subiu de 0,85 para 0,95 em `FAIXA_ESCALA.lmg` e em `COBERTURA_FAIXA.lmg`.
- **Achado:** a área que o jogador vê não cresce. O raster (A/B por `--variante`) vai de 0,78× para 0,75× da AK, porque mais arma sai do quadro. O crítico A/B também não viu mudança de tamanho. Deu MELHOROU pelo ADS e pelo braço, e segue REPROVADA pelas luvas.
- A opção B fica, porque é a decisão do dono. A pergunta volta para ele na fila C13.

**(c) AKM em escala 1,0.** Nenhuma opção de 1,4× foi ligada. A mão de apoio do #637 continua. O raster mede 0,93× da AK.

**(d) Raster manda onde discorda do vértice.**
- `VM_FRAME_INFORMATIVO` = akm (0,558×), m92, mp5 (0,827× pela rolagem de +18°).
- Nessas armas o `eval:vm-frame` imprime a razão como INFORMATIVA e não reprova.
- O mutante `raster-desligado` volta a reprovar a akm.
- **Extensão, para o dono confirmar:** revolver38 também entrou na lista. A faixa de curtas criou a mesma discordância nele: vértice 0,62× (vermelho) contra raster 0,83× (verde).

**(e) M92 em escala real.**
- Faixa própria: `COBERTURA_FAIXA.m92` 0,80–1,50 e `FAIXA_ESCALA.m92` 0,88–1,50. Fica no frame do #637.
- O crítico lê "~145% da AK". O dono aceitou.

**(f) Rem700 mantém a orientação do #635.** O braço na recarga e no saque entra na fila como pose da próxima onda (P9).

`eval:vm-frame` (agora com `--mutantes`): **25/25 verde**, com 3/3 mutantes vermelhos.

## 4. PLACAR integrado (26 armas, 3:2 e 16:9)

Réguas de imagem do #636 medidas no build integrado nas duas proporções:
`tools/eval/vm-reguas-placar.json` e o novo `vm-reguas-placar-16x9.json`. O `--placar` com
`--aspecto=16x9` grava no arquivo próprio, e o `eval:vm-placar` cobra P1, P2 e P3 nos dois
placares. Mais as réguas de produto: `eval:vm-frame`, `eval:vm-orientacao`,
`eval:vm-pente-na-mao`, `eval:vm-pegada-k --mutantes` e `eval:vm-manga-oca`.

Célula = estado em 3:2 + estado em 16:9, seguido do valor em 3:2. Legenda: ✓ verde · ✗ vermelho · · n/a · ⓘ informativo (raster manda).

| arma | mira | cobertura | pistola-ref | mãos | carregador | vm-frame 3:2/16:9 | orientação | pente-na-mão | pegada-k | manga-oca | vermelho em |
|---|---|---|---|---|---|---|---|---|---|---|---|
| awp | ·· | ✗✗ 1.43× AK | ·· | ✓✓ 0.08 | ✓✓ ok | ✓ 0.936/0.89 | ✓ 5.32 | · | · | ✓ | cobertura |
| ak | ✓✓ 29 px | ✓✓ 0.95× AK | ·· | ✓✓ 0.01 | ✓✓ ok | ✓ 0.987/0.896 | ✓ 1.29 | · | ✓ | ✓ | **VERDE** |
| m4 | ✗✗ 43 px | ✓✓ 1.01× AK | ·· | ✓✓ 0.00 | ✓✓ ok | ✓ 0.946/0.881 | ✓ 1.46 | · | · | ✓ | mira |
| mp5 | ✓✓ 1 px | ✓✓ 0.79× AK | ·· | ✓✓ 0.01 | ✓✓ ok | ⓘ 0.827/0.774 | · | ✓ | · | ✓ | **VERDE** |
| shotgun | ✓✓ 7 px | ✓✓ 1.06× AK | ·· | ✓✓ 0.02 | ✗✓ 4 falha(s) | ✓ 0.979/0.935 | · | · | ✓ | ✓ | carregador |
| deagle | ✓✓ 10 px | ✓✓ 1.13× PT-38 | ✓✓ 1.13× pistola aprovada | ·· | ✗✗ 9 falha(s) | ✓ 0.927/0.924 PT-38 | · | · | · | ✓ | carregador |
| pistol | ✓✓ 20 px | ✓✓ 1.00× PT-38 | ✓✓ 1.00× pistola aprovada | ·· | ✓✓ ok | ✓ 1/1 PT-38 | · | · | · | ✓ | **VERDE** |
| knife | ·· | ·· | ·· | ·· | ·· | · | · | · | · | · | n/a (melee: eval:melee-vm) |
| m92 | ✓✓ 17 px | ✓✓ 1.15× AK | ·· | ✓✓ 0.00 | ✓✓ ok | ✓ 0.954/0.909 | ✓ 2.86 | · | ✓ | ✓ | **VERDE** |
| akm | ✓✓ 19 px | ✓✓ 0.93× AK | ·· | ✓✓ 0.01 | ✓✓ ok | ⓘ 0.558/0.527 | ✓ 1.16 | · | ✓ | ✓ | **VERDE** |
| g3 | ✗✗ 89 px | ✗✗ 1.06× AK | ·· | ✗✗ 0.40 | ✓✓ ok | ✓ 0.946/0.907 | ✓ 2.28 | · | · | ✓ | mira, cobertura, maos |
| revolver38 | ✓✓ 9 px | ✓✓ 0.83× PT-38 | ✓✓ 0.83× pistola aprovada | ·· | ·· | ⓘ 0.62/0.609 PT-38 | · | · | ✓ | ✓ | **VERDE** |
| md97 | ✓✓ 16 px | ✗✗ 1.04× AK | ·· | ✓✓ 0.02 | ✓✓ ok | ✓ 0.944/0.891 | ✓ 2.98 | · | ✓ | ✓ | cobertura |
| carbine | ✓✓ 16 px | ✓✓ 0.94× AK | ·· | ✗✗ 0.38 | ·· | ✓ 0.936/0.881 | ✓ 2.30 | · | · | ✓ | maos |
| m400 | ·· | ✗✗ 0.91× AK | ·· | ✓✓ 0.01 | ✓✓ ok | ✓ 1.096/1.076 | ✓ 1.90 | · | · | ✓ | cobertura |
| mosin | ·· | ✗✗ 1.13× AK | ·· | ✓✓ 0.03 | ✗✗ 1 falha(s) | ✓ 0.984/0.926 | ✓ 2.11 | · | · | ✓ | cobertura, carregador |
| rem700 | ·· | ✗✗ 1.07× AK | ·· | ✓✓ 0.04 | ✗✗ 1 falha(s) | ✓ 0.967/0.918 | ✓ 4.24 | · | · | ✓ | cobertura, carregador |
| svd | ·· | ✗✗ 0.50× AK | ·· | ✓✓ 0.01 | ✗✗ 2 falha(s) | ✓ 0.955/0.954 | ✓ 3.26 | · | · | ✓ | cobertura, carregador |
| g3sg1 | ·· | ✗✗ 1.06× AK | ·· | ✓✓ 0.03 | ✓✓ ok | ✓ 1.061/1.022 | ✓ 1.97 | · | · | ✓ | cobertura |
| sks | ·· | ✗✗ 0.64× AK | ·· | ✓✓ 0.02 | ✓✓ ok | ✓ 0.938/0.907 | ✓ 1.25 | · | · | ✓ | cobertura |
| lmg | ✗✗ 31 px | ✓✓ 0.75× AK | ·· | ✓✓ 0.13 | ·· | ✓ 0.877/0.837 | · | · | · | ✓ | mira |
| scar | ✗✗ 99 px | ✓✓ 1.20× AK | ·· | ✗✗ 0.44 | ✓✓ ok | ✓ 0.972/0.9 | ✓ 2.62 | · | · | ✓ | mira, maos |
| tavor | ✗✗ 41 px | ✓✓ 1.04× AK | ·· | ✗✗ 0.30 | ✗✗ 1 falha(s) | ✓ 0.978/0.921 | ✓ 1.86 | · | · | ✓ | mira, maos, carregador |
| famas | ✗✗ 64 px | ✓✓ 0.91× AK | ·· | ✓✓ 0.19 | ✗✗ 1 falha(s) | ✓ 0.979/0.925 | ✓ 5.37 | · | · | ✓ | mira, carregador |
| uzi | ✗✗ 25 px | ✓✓ 0.53× AK | ·· | ·· | ✗✗ 2 falha(s) | ✓ 1.008/0.941 | · | ✓ | · | ✓ | mira, carregador |
| p90 | ✗✗ 71 px | ✓✓ 0.68× AK | ·· | ✓✓ 0.06 | ✗✗ 1 falha(s) | ✓ 0.988/0.934 | · | ✓ | · | ✓ | mira, carregador |

**Verdes em todas as réguas: 6/25 armas de fogo** — ak, mp5, pistol, m92, akm, revolver38 (faca: n/a nas réguas de imagem).
**Vermelhas: 19/25.** Por régua: cobertura 9 (awp, g3, md97, m400, mosin, rem700, svd, g3sg1, sks); mira 8 (m4, g3, lmg, scar, tavor, famas, uzi, p90); carregador 9 (shotgun, deagle, mosin, rem700, svd, tavor, famas, uzi, p90); maos 4 (g3, carbine, scar, tavor).

Verdes fora da tabela:
- `eval:vm-rig` 25/25 (55/55 ossos).
- `eval:vm-foundation` 23/23.
- `eval:vm-orientacao --mutantes`: 17 medidas; o catálogo Codex reprova exatamente mosin, svd, m400 e sks.
- `eval:vm-pegada-k --mutantes`, `eval:vm-manga-oca` 25/25 e `eval:vm-pente-na-mao` (mp5, p90, uzi).
- `eval:vm-placar` e os 3 mutantes do placar.

A dívida (`tools/eval/vm-reguas-divida.json`) foi reconstruída a partir dos dois placares:
- 9 dívidas pagas: mira de ak, shotgun, m92 e akm; cobertura da akm; mãos de ak e akm; pistola-ref de pistol e deagle.
- 1 nova, com dono: carregador/shotgun. O cartucho fica no ar na vazia 23% e 46%, com o produto do #637.
- Todo vermelho ganhou o campo `fila`.

Células instáveis sob carga (a máquina estava com load ~40). Cada uma foi re-medida isolada e atualizada no placar como `parcial`:
- mira/mp5 em 3:2: 192 px, depois 1 px nas duas re-medidas.
- cobertura/ak: 0,46× e 0,57× na re-medida final, depois 0,95× e 0,94×; em todas as outras rodadas deu 0,93–0,95×.
- carregador/shotgun: oscila. Vermelho em 3:2 quando medido depois da AK na mesma sessão, verde isolado e em 16:9. Fica como dívida com nota.
- carregador/pistol: verde nos dois placares, mas vermelho no `eval:vm-reguas` do `check:vm` e em 1 de 3 re-medidas isoladas (tática 57%, 0,88 palma). A PT-38 aprovada não mudou; é a régua. Fica como dívida com dono vm-reguas (fila R1).

`eval:vm-ads` rodado nas 25 armas: o AD1 fica diferente de 0 onde há resíduo de ADS (mp5 e p90 desde o #636, deagle agora) e nas armas de luneta. Isso é esperado. A régua é prova de pipeline, a imagem de mira é o `eval:vm-mira`, e o `check:vm` roda o padrão (ak, revolver38), que dá verde.

## 5. Crítico cego (último veredito por arma)

| Arma | Veredito | Rodada | O que resta |
|---|---|---|---|
| pistol | **IGUAL-A-APROVADA** | integração K | inspeção vazia (igual na aprovada) |
| deagle | RESSALVA (MELHOROU) | integração K, A/B | alça ~30 px à direita no ADS; vazia 75% abaixo do quadro |
| revolver38 | REPROVADA | #637 r3 | recarga sem estojo; pequeno no ADS |
| ak | RESSALVA | #637 r3 | mão no pente a 95% da vazia |
| akm | RESSALVA | #637 r3 | idem; mão direita grande na recarga |
| m92 | REPROVADA | #637 final | "~145% da AK": escala real decidida pelo dono |
| md97 | RESSALVA | #633 | pente sem nervura |
| mp5 | RESSALVA | #634 + A/B #636 | bloco do guarda-mão; pente reto × curvo |
| uzi | RESSALVA | #634 r2 | pente com cara de tubo |
| sks | RESSALVA | #634 | sem madeira |
| m400 | RESSALVA | #635 | yaw forte |
| p90 | REPROVADA | #634 r3 | peça na mão; ADS de novo fora (C2) |
| shotgun | REPROVADA | #637 r3 | braço esticado até a boca (KSG) |
| lmg | REPROVADA (MELHOROU) | integração K, A/B | luvas somem no ADS; tamanho visto igual |
| mosin, svd, rem700, g3, g3sg1, awp, carbine | REPROVADA | #635 | fila L3–L5 |
| m4, scar, tavor, famas | REPROVADA | #635 (sem conserto) | fila L3–L5 |
| knife | REPROVADA | #637 r2 | funil da luva no Inspect |
| grenade | RESSALVA | #631 | dedos tampam a granada |

## 6. Fila

`docs/reports/VM-INTEGRACAO-K-FILA-CORRECAO.md`: 43 itens, sendo 13 de config, 16 de pose/IK,
13 de Blender/clipe e 1 de régua (`eval:vm-carregador` intermitente em pistol e shotgun). Junta as filas L1, L3–L5, os restos do #634 e do #637 e o que o placar mediu.

## 7. Revisão do dono

- Página: `artifacts/review-integrado/index.html`, no worktree `vm-integracao-k`, não versionada. Tem as 25 armas de fogo, faca e granada, com capturas 3:2 e 16:9, vídeo, último veredito do crítico, fila de réguas, URL do jogo e os botões de `VEREDITO-DONO <arma> <VEREDITO> — nota`.
- Servidor: `node tools/eval/serve.mjs 4661`, deixado no ar.

## 8. Portões

Ver a seção de portões do PR. Os vermelhos de ambiente ou pré-existentes estão listados lá.

Nota de ambiente: com `node_modules` compartilhado por symlink, o pacote `three` apontava para o
`public/vendor` de outro worktree. O `GLTFLoader` do stub e o do jogo viravam instâncias
diferentes, e o `eval:amazonia` reprovava ("GLB geometry fixture ausente"). Com o `three` apontando
para o vendor do próprio worktree, ele passa. Não é defeito de código.
