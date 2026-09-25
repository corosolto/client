# Handoff — arsenal de viewmodels, 01/09/2026 (noite)

Sessão **pausada a pedido do Ruben** para atacar um bug de produção. Nada ficou em execução:
sem gauntlet, sem Blender, sem calibrador rodando. Tudo commitado no branch.

- Worktree: `/Users/ruben/csbrasil/worktrees/vm-retarget`
- Branch: `vm-cs16-gabarito` — árvore limpa, **não** foi feito push
- Tabela de controle por arma: [`VIEWMODEL-INVENTARIO.md`](VIEWMODEL-INVENTARIO.md)
- Evidência: `artifacts/viewmodels/arsenal/` (fora do Git, por tamanho)

## O placar, em uma linha

A trilha CS 1.6 (goldsrc) saiu de **0/19 limpas** para **12/19** no gauntlet do jogo real, e
os dois ajustes seguintes (recuo do mount, `recoilScale` da md97/p90) fecharam mais três.
A AK golden continua verde e não foi tocada. A X18/G18 continua tecnicamente verde.

## Reparo de ambiente — leia antes de rodar qualquer portão

O arquivamento de `/Users/ruben/game` levou junto o symlink global do Playwright: os 136
scripts do arnês que resolvem `npm root -g` estavam todos mortos. Foi consertado assim:

```bash
ln -s /Users/ruben/csbrasil/client/node_modules/playwright     /opt/homebrew/lib/node_modules/playwright
ln -s /Users/ruben/csbrasil/client/node_modules/playwright-core /opt/homebrew/lib/node_modules/playwright-core
npx playwright install chromium
```

Se outra máquina reclamar de `Cannot find module .../playwright/index.js`, é isso.

## Os cinco defeitos de raiz consertados

| # | Defeito | Efeito medido | Commit |
|---|---|---|---|
| 1 | A régua não achava o GLB servido em `gs#`/`rt#` | morria antes de medir, toda arma | `9a0d2ab7` |
| 2 | Recarga não fechava no relógio do jogo | SKS: 4,667 s de clipe contra 2,6 s de jogo; P4 vermelho em 17/19 | `04f650a3` |
| 3 | O pacote do molde não media metro (~23 unidades por metro) | `frame`, recuo e ADS viravam ruído; 6 cm moviam a caixa 0,3% | `2fff9261`, `18e184aa` |
| 4 | Sem enquadramento por arma no caminho molde | `{0,0,0}` nas 19; C5 reprovava 14 e o centro 13 | `422bd72d` |
| 5 | O P7 amostrava o tiro onde o coice não está | coice cabe nos primeiros 100 ms; media repouso em 12/19 | `7d078462` |

O defeito 3 é o mais importante: ele explica por que "o mount não recua" tinha sido
desligado em 29/08 — em 23 unidades por metro, um coice de 2 cm era invisível. Com a escala
certa o recuo procedural voltou e resolveu o P7 de mp5, svd e sks sozinho (`dbf1e73e`).

## O que falta, arma por arma

Última rodada completa: `artifacts/viewmodels/arsenal/goldsrc-calibrado-v2/relatorio.json`
(12/19), mais os testes dirigidos `goldsrc-recuo-teste-v1` e `goldsrc-ajuste-teste-v1`.

| Arma | Estado | O que falta |
|---|---|---|
| ak | GOLDEN_CONGELADA | nada — regressão verde, inclusive com a régua nova |
| pistol | TECNICAMENTE_VERDE_AGUARDANDO_VISUAL | revisão do dono |
| m4, m92, carbine, scar, famas, mosin, lmg, shotgun, deagle, revolver38 | verde no gauntlet | revisão visual |
| svd, sks, mp5*, md97 | verde depois de `dbf1e73e` | reconfirmar na rodada completa |
| awp | reprova | `P4`: mão de apoio a 32 px do pente (teto 24) |
| mp5 | reprova | `P4`: mão de apoio a 72 px do pente |
| p90 | reprova | `P1` mãos não se separam · `P4` mão a >192 px do pente |
| uzi | reprova | `P6`: primeiro quadro do saque a 700 px, precisa de ≥720 |

As três reprovações de `P4` são verdade do asset: a recarga do molde CS 1.6 não leva a mão
de apoio até o pente nessas armas. Não invente pose no runtime para fechar o número.

O `drawDrop` da UZI foi acrescentado mas o `P6` **não mudou** (20957 px, topo 700). Ou o
arco não está sendo aplicado junto do `equip_rifle`, ou 0,28 é pouco. Confirmar com
`node tools/eval/vm-gauntlet.mjs --modo=goldsrc --armas=uzi --frames` e olhar `draw-0.png`
antes de mexer de novo.

## Bloqueio medido da trilha C (retarget)

Anatomia certa (luva, manga, cinco dedos — a mesma da AK aprovada), mas a manga do pack
entra no quadro por cima da arma. No m4:

| | diagonal da arma | mão/arma | pixels no centro | caixa |
|---|---|---|---|---|
| base | 0,4409 | 1,35 | 7.932 | `0,462 ; 0,407` |
| com o C5 fechado | 0,2871 | 6,70 | 0 | `0,592 ; 0,560` |

Fechar o C5 custa metade da diagonal da arma e o cano some atrás da manga. O conserto é na
pose de apoio e no recorte da manga em `tools/blender/viewmodels/build_retarget_vm.py` — o
próprio build já denuncia com `CORO_RT_ERRO_MAO` entre 0,15 e 0,32 do comprimento da arma.
**Não calibre a trilha C antes disso.** As 19 estão construídas em
`private-assets/viewmodels/retarget-vm/`.

## A decisão que continua sendo do dono

Nenhuma trilha do molde é alcançável em produção: `?cs16=1` liga a B, `?rt=1` liga a C, e
sem parâmetro as famílias `ready` caem na A (KINEMATION), que não tem clipe de saque nem de
tiro em 12 das 15 famílias. Trocar a fonte padrão é a decisão pendente desde 31/08 e **não
foi tomada aqui**. Nenhuma família nova ganhou `ready: true`.

Como ver o resultado desta sessão sem mudar nada:

```bash
cd /Users/ruben/csbrasil/worktrees/vm-retarget
npx astro dev --port 8300
# http://localhost:8300/?cs16=1   (trilha B, calibrada — é o que esta sessão mexeu)
# http://localhost:8300/?rt=1     (trilha C, bloqueada)
```

## Retomada, na ordem

1. Rodar a rodada completa e confirmar o placar depois de `dbf1e73e`:
   `node tools/eval/vm-gauntlet.mjs --modo=goldsrc --largura=1440 --altura=960`
2. Regressão obrigatória da golden: `node tools/eval/vm-gauntlet.mjs --modo=golden --armas=ak`
   e o mutante `--mutante=tiro-estatico`, que precisa ficar vermelho.
3. Atacar `awp`/`mp5`/`p90` (contato mão↔pente) no build goldsrc, não no runtime.
4. Fechar a UZI olhando o quadro do saque.
5. Consertar a pose da trilha C no Blender e só então calibrá-la.
6. Montar a folha única com uma linha por arma (idle, tiro, recarga, contato) para o Ruben.
7. Só depois da aprovação dele: virar `ready` e decidir a fonte padrão.

## Pendências que não são desta frente

- `npm run eval:vm-catalog` está vermelho: `pistol-runtime.glb` tem 22 MB contra o teto de
  8 MB porque o passo `optimize_paid_family.mjs` não foi rodado depois do rebuild de 01/09
  às 14:59. Backup em `pistol-runtime.glb.pre-optimize.bak`, SHA do servido
  `f90d28788a85383f6db8dec227ff5d0481f3ffd2bb7e0f985f0b89eeb1cc94dc` (o mesmo que o handoff
  anterior congelou). **Não foi mexido** para preservar o estado da X18.
