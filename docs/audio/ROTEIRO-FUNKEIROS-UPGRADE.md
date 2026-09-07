# ROTEIRO — Upgrade de vozes dos FUNKEIROS (Fish Audio)

Lote de upgrade do time F (+ Pagodeiro do U) com modelos comunitários do Fish
escolhidos pelo dono (30/08). **Staging separado** em
`public/audio/ia/funkeiros-upgrade/` — o pack F atual fica intacto; a
integração no pool é decisão à parte.

Regra de destino (a mesma dos míticos): **(kill)** curto → ingame;
**(select)** → tela de seleção. PEGI12, sem citar pessoa real; gírias são da
CENA (funk das antigas, trap/drill, mandrakeria), não de artista específico.

Gerador: `tools/gerar-pilotos-fish.mjs` (embute esta tabela).

## cria do RJ funk (pool F genérico) — `cf4a65e7fff3408aa30982d4ddfbddb2`
Tom: piloto f-rj do pack atual ("BOTA A CARA!"), call-and-response de baile.

| slug | fala | destino |
|---|---|---|
| bota-a-cara | "BOTA A CARA! Bota a cara agora!" | kill |
| e-os-cria | "É os cria, mermão!" | kill |
| abaixa | "Abaixa a CABEÇA!" | kill |
| tomou | "Tomou, né?! Fala aí!" | kill |
| ta-de-xereka | "Tá de xereka!" | kill |
| sarneou | "Sarneou!" | kill |

## Funk Raiz (F) — `8ccdb95bd1f3415d8a4004ff13b95c3c`
> Blurb: "Tamborzão na cabeça e passinho no recuo. O funk mais velho da arena."
Tom: das antigas, charme, malandragem calma de quem viu o baile nascer.

| slug | fala | destino |
|---|---|---|
| coe-caiu | "Coé, caiu!" | kill |
| das-antigas | "Das antigas, né?" | kill |
| tamborzao | "Tamborzão comeu." | kill |
| na-base | "Na base do charme." | kill |
| sentiu-o-grave | "Sentiu o grave." | kill |
| select-raiz | "Funk raiz é isso: tamborzão no peito e respeito na pista." | select |

## Trap Funk (F) — `b1355c5151eb43d88df3efe2e1bad5c7`
> Blurb: "Autotune no grito de guerra e 808 no peito. Trap em dose dupla."
Tom: drill/trap novo, frio, beat arrastado, flexing.

| slug | fala | destino |
|---|---|---|
| no-beat | "No beat, mano." | kill |
| oitocentos-e-oito | "808 no peito." | kill |
| tomou-drill | "Tomou drill." | kill |
| ta-pago | "Tá pago." | kill |
| sem-flow | "Sem flow, né?" | kill |
| select-trap | "Autotune no grito e 808 no coração — isso aqui é trap funk." | select |

## Oakley (F) — `0c5d8d65ded6439a8466e3ca8ec73a50`
> Blurb (mandrakeria): óculos Juliet, corte na régua, brilho na quebrada.

| slug | fala | destino |
|---|---|---|
| pela-lente | "Pela lente, cria." | kill |
| juliet-viu | "Juliet viu tudo." | kill |
| brilhou-caiu | "Brilhou, caiu." | kill |
| estilo-mata | "Estilo mata." | kill |
| perdeu-a-pose | "Perdeu a pose." | kill |
| select-oakley | "De Juliet no rosto e corte na régua — quem brilha aqui sou eu." | select |

## Mandrake (F) — `6a27a3ab74af45cb8890a6974e9eeb06` (piloto aprovado)
> Blurb: "Boné, Juliet vermelho e corrente de ouro. Ostenta e domina na quebrada."

| slug | fala | destino |
|---|---|---|
| no-fluxo | "No fluxo é assim, mano." | kill |
| na-regua | "Corte na régua, mira na régua." | kill |
| perdeu-playboy | "Perdeu, playboy." | kill |
| quebrada-manda | "Quebrada manda." | kill |
| o-mandrake | "Ó o mandrake! Juliet no rosto, ouro no pescoço." | select |

## Pagodeiro (U) — `c481e5eba6254be49de0f33af6736085` (piloto aprovado)
> Blurb: "Platinado, roupa toda branca e corrente de ouro. Canta o hit e acerta o tiro no refrão."

| slug | fala | destino |
|---|---|---|
| no-refrao | "Acertei no refrão!" | kill |
| sorriso | "Sorriso aberto, gatilho também." | kill |
| tanta | "Tá no couro do tantã!" | kill |
| so-no-grave | "Só no grave, parceiro." | kill |
| pagode-e-paz | "Pagode é paz... foi você que atirou primeiro." | select |
