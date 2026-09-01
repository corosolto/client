# Inventário de viewmodels — tabela de controle

Fonte autoritativa do arsenal: `WEAPON_IDS` em `public/js/weapons.js` — 20 armas, a faca
inclusa. Famílias e portão de rollout: `public/js/data/vmconfig.js`. Este arquivo é a tabela
de controle da frente; o estado narrativo mora em `STATUS.md` e o contrato normativo em
`VIEWMODEL_CONTRACT.md`.

A faca não entra: ela tem controlador melee próprio (`public/js/meleevm.js`) e não passa
pelo caminho autorado. Restam **19 armas em 14 famílias**.

## Como reproduzir cada coluna

```bash
node tools/eval/vm-gauntlet.mjs --modo=golden --armas=ak      # regressão da golden
node tools/eval/vm-gauntlet.mjs --modo=goldsrc                # trilha B, arsenal
node tools/eval/vm-gauntlet.mjs --modo=retarget               # trilha C, arsenal
node tools/viewmodels/build_goldsrc_all.mjs                   # constrói a trilha B
node tools/viewmodels/build_retarget_all.mjs                  # constrói a trilha C
node tools/eval/vm-frame-calibra.mjs --modo=goldsrc           # propõe o MOLDE_FRAME
node tools/eval/vm-kick-perfil.mjs --armas=m4                 # onde mora o coice
```

Os relatórios ficam em `artifacts/viewmodels/arsenal/` (fora do Git, por tamanho).

## As trilhas, medidas com a mesma régua

| Trilha | O que é | Braços | Clipes por arma | Onde vive |
|---|---|---|---|---|
| **golden** | build Blender dedicado da AK | rig golden, luva + manga, dedos | `Equip`, `Idle`, `Shoot`, `Reload` autorados | `public/models/viewmodels/coro/ak-hires.glb` |
| **A · KINEMATION** | famílias do pack pago | 67 juntas, luva + manga | `idle`, `reload_tactical`, `reload_empty` — **sem saque e sem tiro em 12 das 15 famílias** | `private-assets/viewmodels/<família>/` |
| **B · goldsrc** | moldes CC0 do CS 1.6 + arma Mint | 596 triângulos, sem dedos | `equip_rifle`, `idle`, `reload*`, `shoot`×3 — completos, por ARMA | `private-assets/viewmodels/goldsrc-vm/` |
| **C · retarget** | mecânica da B com os braços da A | 67 juntas, luva + manga | os da B, retargetados | `private-assets/viewmodels/retarget-vm/` |

Nenhuma das três é alcançável em produção hoje: `?cs16=1` liga a B, `?rt=1` liga a C, e sem
parâmetro as famílias `ready` caem na A. Trocar a fonte padrão é decisão do dono e continua
aberta.

## A referência de qualidade

A AK golden aprovada, medida pelo mesmo script em 1440 × 960
(`artifacts/viewmodels/arsenal/regressao-ak-golden-v1/relatorio.json`):

| Medida | AK golden |
|---|---|
| caixa do viewmodel começa em | `x/W 0,5306` · `y/H 0,5125` |
| pixels no quadrado central | 0 |
| arma como fração do quadro | 0,0596 |
| diagonal da arma / diagonal da tela | 0,440 |
| pixels de mão / pixels de arma | 0,771 |
| excursão do tiro | 9,2% da arma |

Esses números são o alvo do calibrador — não um teto inventado.

## Estados

- `GOLDEN_CONGELADA` — aprovada pelo dono, fora da fila de produção;
- `TECNICAMENTE_VERDE_AGUARDANDO_VISUAL` — portões verdes, falta a revisão do dono;
- `PRONTA` — toda a cadeia da "Definição de pronto" do `VIEWMODEL_CONTRACT.md`;
- `PARCIAL` — asset existe, carrega e roda, mas algum portão reprova;
- `AUSENTE` — sem asset servível;
- `BLOQUEADA` — depende de decisão ou insumo fora desta lane.

## Tabela por arma

| Arma | Família | Rig/base | Trilha B | Trilha C | Estado |
|---|---|---|---|---|---|
| ak | ak | golden dedicado | construída | construída | **GOLDEN_CONGELADA** |
| pistol | pistol | X18/G18 KINEMATION | construída | construída | **TECNICAMENTE_VERDE_AGUARDANDO_VISUAL** |
| awp | sniper | molde `awp` + Mint | construída | construída | PARCIAL |
| m4 | ar | molde `m4a1` + Mint | construída | construída | PARCIAL |
| mp5 | mp5 | molde `mp5` + Mint | construída | construída | PARCIAL |
| shotgun | shotgun | molde `m3` + Mint | construída | construída | PARCIAL |
| deagle | deagle | molde `deagle` + Mint | construída | construída | PARCIAL |
| m92 | ak | molde `ak47` + Mint | construída | construída | PARCIAL |
| revolver38 | revolver | molde `deagle` + Mint | construída | construída | PARCIAL |
| md97 | ar | molde `famas` + Mint | construída | construída | PARCIAL |
| carbine | ar | molde `m4a1` + Mint | construída | construída | PARCIAL |
| mosin | bolt | molde `scout` + Mint | construída | construída | PARCIAL |
| lmg | lmg | molde `m249` + Mint | construída | construída | PARCIAL |
| scar | ar | molde `sg552` + Mint | construída | construída | PARCIAL |
| famas | ar | molde `famas` + Mint | construída | construída | PARCIAL |
| uzi | smg | molde `mac10` + Mint | construída | construída | PARCIAL |
| p90 | p90 | molde `p90` + Mint | construída | construída | PARCIAL |
| svd | svd | molde `g3sg1` + Mint | construída | construída | PARCIAL |
| sks | marksman | molde `g3sg1` + Mint | construída | construída | PARCIAL |
| knife | melee | pipeline próprio | fora do caminho autorado | — | fora do lote |

O doador de cada arma está em `DOADORES` de `tools/viewmodels/build_goldsrc_all.mjs`.

## Defeitos de raiz encontrados e consertados

1. **O arnês inteiro estava morto.** O arquivamento de `/Users/ruben/game` levou o symlink
   global do Playwright; 136 scripts que resolvem `npm root -g` não subiam. Reparo de
   ambiente, registrado em `WORKSPACE-CONTINUITY.md`.
2. **A régua não chegava a medir `gs#`/`rt#`.** O gauntlet procurava o GLB servido na pasta
   da família; goldsrc e retarget servem por arma.
3. **A recarga não fechava no relógio do jogo.** A cadência do QC do CS 1.6 sobrescrevia a
   duração de `_startReload`: a SKS rodava 4,667 s de animação contra 2,6 s de jogo. P4
   vermelho em 17 das 19 armas.
4. **O molde não media metro.** O pacote chegava a ~23 unidades por metro, então `frame`,
   recuo e ADS — todos em metros — eram ruído: 6 cm moviam a caixa 0,3% da largura.
5. **Sem enquadramento por arma.** O caminho molde usava `{0,0,0}` nas 19 armas.

## Bloqueio medido da trilha C

A trilha C tem a anatomia certa (luva, manga e cinco dedos, a mesma da AK aprovada), mas a
manga do pack entra no quadro por cima da arma. Consequência medida no m4:

| Distância | diagonal da arma | mão/arma | pixels no centro | caixa |
|---|---|---|---|---|
| base | 0,4409 | 1,35 | 7.932 | `0,462 ; 0,407` |
| com o C5 fechado | 0,2871 | 6,70 | 0 | `0,592 ; 0,560` |

Fechar o C5 e liberar o centro custa metade da diagonal da arma e multiplica por cinco a
massa de braço: o cano some atrás da manga. O conserto é no build (pose da mão de apoio e
recorte da manga em `tools/blender/viewmodels/build_retarget_vm.py`), não no enquadramento.
O erro de mão do próprio build já denuncia isso: `CORO_RT_ERRO_MAO` fica entre 0,15 e 0,32
do comprimento da arma, contra a mão de apoio que o contrato da AK exige a ≤1 cm.

Enquanto isso não for resolvido, a trilha C fica **BLOQUEADA** para produção e serve como
caminho de upgrade documentado.
