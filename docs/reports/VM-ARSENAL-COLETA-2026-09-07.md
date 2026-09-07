# Coleta medida do arsenal no jogo real — 07/09

Primeira coleta da retomada. Escrita ANTES de qualquer conserto (LICOES 1) e antes
de tocar em curva de mão, porque ela desmente a premissa do handoff da LMG.

## O que a coleta desmente

O `PROMPT-CODEX-VM-LMG-RETOMADA.md` e o `VM-LMG-FINAL.md` tratam o frame
`15.47.19` como "caso de teste primário da LMG": *"em plena recarga a arma flutua a
~20% da tela SEM mãos/braços visíveis"*. **O frame não é da LMG.** O HUD dele lê
`AWP "DE…"` com `RECARREGANDO…` e o slot 1 (sniper) selecionado.

Lidos os 16 frames comparáveis (3024×1964, 3:2) da revisão do dono, eles percorrem
**sete armas**:

| frames | arma no HUD |
|---|---|
| 04–09 | METRALHA "TRETA PESADA" (lmg) |
| 10, 19 | AWP |
| 11 | M3 "CONVE…" (shotgun) |
| 12 | MP5 |
| 13–15 | PT-92 (pistol) |
| 16–17 | ZASTAVA M92 |
| 18 | REVÓLVER .38 |

Consequência direta: a triagem de `lmg-review-measure.py` — *"luva some nos frames
09–12/15–17 (87–820 px vs 2.500–4.700)"* — comparou massa de luva **entre armas
diferentes**, várias delas em famílias sem viewmodel autorado. O número existe, mas
não mede o que o relatório disse que media. A régua nova não pode herdar esse piso.

## Instrumento

`tools/viewmodels/prep/vm-arsenal-frames.mjs` — mede EM-PÁGINA, por captura, no jogo
real (playwright + `tools/eval/serve.mjs`), para os DOIS caminhos (legado e autorado):
vértices de mão em quadro, vértices de arma em quadro, contato mão↔arma em px e
diagonal aparente da arma. Inventário de malhas vai no `frames.json` — régua sem alvo
declarado passa por vacuidade.

Armadilha já paga na v1 desta régua: `arm` cru como token de mão casa com `Armature`,
nó pai de todo skinned mesh — a régua classificou a arma inteira como mão
(`m92: mao 278/306, arma 0/0`). Tokens agora são ancorados.

## Medida (checkout principal `feat/fps-paid-viewmodels-aaa`, mapa `piscina_treta`, 3:2, 1440×960)

Faixas min–max sobre 7 capturas por arma (idle, ADS, fire, recarga em 15/35/60/85%).

| arma | legado mão | legado arma | legado diag px | autorado mão | autorado arma | autorado contato px | autorado diag px |
|---|---|---|---|---|---|---|---|
| `lmg` | 0–0 | 0–0 | 0–0 | 222–280 | 276–290 | 1–3 | 407–698 |
| `awp` | 0–0 | 0–54 | 0–380 | 0–262 | 0–0 | — | 0–0 |
| `shotgun` | 0–0 | 26–46 | 232–270 | 232–282 | 0–0 | — | 0–0 |
| `mp5` | 42–87 | 294–311 | 491–669 | 234–274 | 286–292 | 1–21 | 509–696 |
| `pistol` | 73–92 | 303–303 | 270–364 | 162–264 | 304–304 | 2–29 | 353–412 |
| `m92` | 0–0 | 0–0 | 0–0 | 154–224 | 222–282 | 4–32 | 470–861 |
| `revolver38` | 0–1 | 0–0 | 0–0 | 150–252 | 0–0 | — | 0–0 |
| `m4` | 50–89 | 302–309 | 531–731 | 202–258 | 294–298 | 1–16 | 495–675 |
| `ak` | 0–0 | 28–46 | 242–264 | 144–230 | 286–296 | 1–3 | 431–553 |
| `knife` | 0–0 | 0–0 | 0–0 | — | — | — | — |

Amostra: 306–312 pontos de mão, 304–315 de arma.

## Leitura

1. **Três famílias não têm arma autorada nenhuma**: `awp`, `shotgun`, `revolver38`
   medem `arma 0/0` no caminho autorado com a mão presente — são **luvas segurando o
   vazio**. É o que o dono fotografou nos frames 10, 11, 18 e 19.
2. **`m92` tem escala em fuga**: diagonal aparente 470–861 px contra 431–553 px da
   `ak` na MESMA família. É o "caixão preto" do frame 16.
3. **O caminho legado está pior que o autorado** em quase tudo: `lmg`, `m92` e
   `revolver38` não desenham arma alguma; `awp`, `shotgun` e `ak` desenham uma lasca
   com a mão fora do quadro (`mão 0/312`).
4. **A LMG autorada tem mão em quadro e contato de 1–3 px** em todas as 7 capturas —
   o defeito que o handoff mandou consertar (mão fora do quadro na recarga) **não
   reproduz** neste instrumento. O que sobra na LMG é material espelhado e
   enquadramento, não caminho de mão.
5. `mp5`, `pistol`, `m4` e `ak` autoradas têm mão e arma em quadro com contato ≤ 5 px
   na maioria das capturas.

## Reprodução

```bash
node tools/eval/serve.mjs 8167                    # na raiz do checkout medido
node tools/viewmodels/prep/vm-arsenal-frames.mjs \
  --porta=8167 --aspecto=32 --mapa=piscina_treta \
  --modo=autorado --armas=lmg,awp,shotgun,mp5,pistol,m92,revolver38,m4,ak --tag=<nome>
```

Saída: `artifacts/viewmodels/arsenal/<tag>-<modo>-<aspecto>/` com `frames.json` + PNGs.

## O que esta coleta NÃO verificou

- 16:9 (só 3:2 nesta rodada).
- A faca (`knife`), que roda no caminho melee e mede 0/0 nos dois modos — precisa de
  alvo próprio na régua.
- Qual build o dono tinha na tela em 07/09 14:03–15:52: a lane havia publicado a LMG
  reprovada nas raízes compartilhadas e o rollback veio às 16:06. Os frames 04–09
  são daquele build; os demais são das famílias como estão hoje.
- Materiais: a leitura "espelhado/cromado" da `lmg` e da `m92` é visual, sem régua.
