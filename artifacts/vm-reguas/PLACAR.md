# PLACAR — réguas de imagem do viewmodel × 26 armas

Medido em 2026-09-23, quadro 3:2 (1440×960, o do dono), no jogo real (`?vmauthored=1&vmqa=precision`, relógio segurado), com
`node tools/eval/vm-reguas-check.mjs --regua=todas --placar`. Referências: AK golden e PT-38 **aprovadas** (retratos assados
pré-#631 em `tools/eval/vm-ak-aprovada.json` e `vm-pistola-aprovada.json`). `NÃO MEDE` conta como vermelho; `n/a` tem motivo no detalhe.

## 1. Estado real de todas as correções (base composta)

`vm/launch-k` + #630 (review-bench) + este branch + #631 (k-rebuild) + #632 (fix-mesh) + #633 (fix-grips) + #634 (fix-mags),
diffs aplicados numa cópia local descartável (nada mesclado em branch), com os overlays privados
`~/csbrasil-private-assets/generated/viewmodels-{k-rebuild,fix-mesh,fix-grips,fix-mags}/overlay` sobre o catálogo final.

| arma | mira | cobertura | pistola-ref | maos | carregador |
|---|---|---|---|---|---|
| awp | n/a | **VERMELHO** 1.43× AK | n/a | verde 0.08 | verde ok |
| ak | **VERMELHO** 92 px | verde 0.98× AK | n/a | **VERMELHO** 0.61 | verde ok |
| m4 | **VERMELHO** 43 px | verde 1.01× AK | n/a | verde 0.00 | verde ok |
| mp5 | verde 1 px | verde 0.79× AK | n/a | verde 0.01 | verde ok |
| shotgun | **VERMELHO** 12 px | verde 1.06× AK | n/a | verde 0.06 | verde ok |
| deagle | verde 30 px | n/a | **VERMELHO** 0.63× pistola aprovada | n/a | **VERMELHO** 1 falha(s) |
| pistol | verde 20 px | n/a | **VERMELHO** 0.58× pistola aprovada | n/a | verde ok |
| knife | n/a | n/a | n/a | n/a | n/a |
| m92 | **VERMELHO** 79 px | verde 0.99× AK | n/a | verde 0.00 | verde ok |
| akm | **VERMELHO** 66 px | **VERMELHO** 0.73× AK | n/a | **VERMELHO** 0.60 | verde ok |
| g3 | **VERMELHO** 90 px | **VERMELHO** 1.04× AK | n/a | **VERMELHO** 0.40 | verde ok |
| revolver38 | verde 13 px | n/a | verde 0.85× pistola aprovada | n/a | n/a |
| md97 | verde 16 px | **VERMELHO** 1.04× AK | n/a | verde 0.02 | verde ok |
| carbine | verde 16 px | **VERMELHO** 1.20× AK | n/a | **VERMELHO** 0.38 | n/a |
| m400 | n/a | **VERMELHO** 0.77× AK | n/a | verde 0.06 | verde ok |
| mosin | n/a | **VERMELHO** 0.64× AK | n/a | verde 0.01 | **VERMELHO** 14 falha(s) |
| rem700 | n/a | **VERMELHO** 1.47× AK | n/a | **VERMELHO** 0.22 | **VERMELHO** 5 falha(s) |
| svd | n/a | **VERMELHO** 0.36× AK | n/a | verde 0.06 | **VERMELHO** 1 falha(s) |
| g3sg1 | n/a | **VERMELHO** 1.06× AK | n/a | verde 0.03 | verde ok |
| sks | n/a | **VERMELHO** 0.64× AK | n/a | verde 0.02 | verde ok |
| lmg | **VERMELHO** 30 px | verde 0.78× AK | n/a | verde 0.13 | n/a |
| scar | **VERMELHO** 99 px | verde 1.20× AK | n/a | **VERMELHO** 0.44 | verde ok |
| tavor | **VERMELHO** 41 px | verde 1.04× AK | n/a | **VERMELHO** 0.30 | **VERMELHO** 1 falha(s) |
| famas | **VERMELHO** 64 px | verde 0.91× AK | n/a | verde 0.19 | **VERMELHO** 1 falha(s) |
| uzi | **VERMELHO** 25 px | verde 0.53× AK | n/a | n/a | **VERMELHO** 2 falha(s) |
| p90 | **VERMELHO** 71 px | verde 0.68× AK | n/a | verde 0.06 | **VERMELHO** 1 falha(s) |

**Vermelhas na máquina: 23 de 26** — awp, ak, m4, shotgun, deagle, pistol, m92, akm, g3, md97, carbine, m400, mosin, rem700, svd, g3sg1, sks, lmg, scar, tavor, famas, uzi, p90.
Células vermelhas por régua: mira 12 · cobertura 11 · pistola-ref 2 · maos 7 · carregador 8.

## 2. Este branch sozinho (o que o `eval:vm-placar` do CI confere)

`vm/reguas` (= `vm/launch-k` + #630 + réguas + config de mp5/p90) sobre o catálogo final sem overlays. Placar assado: `tools/eval/vm-reguas-placar.json` (entradas `e3f6af324d7cc9c1`).

| arma | mira | cobertura | pistola-ref | maos | carregador |
|---|---|---|---|---|---|
| awp | n/a | **VERMELHO** 1.43× AK | n/a | verde 0.08 | verde ok |
| ak | **VERMELHO** 213 px | verde 0.97× AK | n/a | verde 0.19 | verde ok |
| m4 | **VERMELHO** 43 px | verde 1.01× AK | n/a | verde 0.00 | verde ok |
| mp5 | verde 1 px | verde 0.79× AK | n/a | verde 0.01 | **VERMELHO** 1 falha(s) |
| shotgun | **VERMELHO** 67 px | **VERMELHO** 1.61× AK | n/a | verde 0.03 | verde ok |
| deagle | verde 30 px | n/a | **VERMELHO** 0.63× pistola aprovada | n/a | **VERMELHO** 1 falha(s) |
| pistol | verde 20 px | n/a | verde 1.00× pistola aprovada | n/a | verde ok |
| knife | n/a | n/a | n/a | n/a | n/a |
| m92 | **VERMELHO** 79 px | verde 0.99× AK | n/a | **VERMELHO** 0.70 | verde ok |
| akm | **VERMELHO** 107 px | **VERMELHO** 0.71× AK | n/a | **VERMELHO** 0.60 | verde ok |
| g3 | **VERMELHO** 90 px | **VERMELHO** 1.04× AK | n/a | **VERMELHO** 0.40 | verde ok |
| revolver38 | verde 5 px | n/a | **VERMELHO** 0.64× pistola aprovada | n/a | n/a |
| md97 | **VERMELHO** 54 px | **VERMELHO** 1.06× AK | n/a | **VERMELHO** 0.25 | verde ok |
| carbine | verde 16 px | verde 1.20× AK | n/a | **VERMELHO** 0.38 | n/a |
| m400 | n/a | **VERMELHO** 0.77× AK | n/a | verde 0.06 | verde ok |
| mosin | n/a | **VERMELHO** 0.64× AK | n/a | verde 0.01 | **VERMELHO** 14 falha(s) |
| rem700 | n/a | **VERMELHO** 1.47× AK | n/a | **VERMELHO** 0.22 | **VERMELHO** 5 falha(s) |
| svd | n/a | **VERMELHO** 0.36× AK | n/a | verde 0.06 | **VERMELHO** 1 falha(s) |
| g3sg1 | n/a | **VERMELHO** 1.06× AK | n/a | verde 0.03 | verde ok |
| sks | n/a | **VERMELHO** 0.43× AK | n/a | verde 0.02 | **VERMELHO** 9 falha(s) |
| lmg | **VERMELHO** 3 px | verde 0.71× AK | n/a | verde 0.13 | n/a |
| scar | **VERMELHO** 99 px | verde 1.20× AK | n/a | **VERMELHO** 0.44 | verde ok |
| tavor | **VERMELHO** 41 px | verde 1.04× AK | n/a | **VERMELHO** 0.30 | verde ok |
| famas | **VERMELHO** 64 px | verde 0.91× AK | n/a | verde 0.19 | **VERMELHO** 1 falha(s) |
| uzi | **VERMELHO** 25 px | verde 0.54× AK | n/a | n/a | **VERMELHO** 4 falha(s) |
| p90 | verde 3 px | verde 0.66× AK | n/a | verde 0.06 | **VERMELHO** 1 falha(s) |

**Vermelhas: 24 de 26** — awp, ak, m4, mp5, shotgun, deagle, m92, akm, g3, revolver38, md97, carbine, m400, mosin, rem700, svd, g3sg1, sks, lmg, scar, tavor, famas, uzi, p90.

## 3. Detalhe por célula (base composta)

### mira

- **awp** N/A — luneta: no ADS o viewmodel some e entra o overlay 2D
- **ak** VERMELHO — mira fora da cruz a 92 px — massa a 92 px da cruz (-9, -92); teto 30 px; eixo no ADS +4° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **m4** VERMELHO — mira fora da cruz a 43 px — massa a 43 px da cruz (+5, -43); teto 30 px; eixo no ADS +1° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **mp5** VERDE — aro a 1 px da cruz (-0, -0); teto 30 px; eixo no ADS +2° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.101 NDC
- **shotgun** VERMELHO — ângulo esquisito no ADS: arma tombada -16° da vertical — massa a 12 px da cruz (-1, -12); teto 30 px; eixo no ADS -16° da vertical (teto ±12°); linhaDeMira (#633): massa declarada a 12 px do aparelho visto · socket sight (o que o AD1 lê) 0.003 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **deagle** VERDE — massa a 30 px da cruz (+24, -18); teto 30 px; eixo no ADS +0° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC
- **pistol** VERDE — massa a 20 px da cruz (+0, -20); teto 30 px; eixo no ADS -4° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC
- **knife** N/A — faca: sem ADS
- **m92** VERMELHO — mira fora da cruz a 79 px — massa a 79 px da cruz (+8, -79); teto 30 px; eixo no ADS -8° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **akm** VERMELHO — mira fora da cruz a 66 px; ângulo esquisito no ADS: arma tombada -14° da vertical — massa a 66 px da cruz (-10, -65); teto 30 px; eixo no ADS -14° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **g3** VERMELHO — mira fora da cruz a 90 px — massa a 90 px da cruz (+3, -90); teto 30 px; eixo no ADS +8° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **revolver38** VERDE — massa a 13 px da cruz (-11, -6); teto 30 px; eixo no ADS -10° da vertical (teto ±12°); linhaDeMira (#633): massa declarada a 11 px do aparelho visto · socket sight (o que o AD1 lê) 0.020 NDC
- **md97** VERDE — massa a 16 px da cruz (-8, -14); teto 30 px; eixo no ADS +3° da vertical (teto ±12°); linhaDeMira (#633): massa declarada a 13 px do aparelho visto · socket sight (o que o AD1 lê) 0.093 NDC
- **carbine** VERDE — massa a 16 px da cruz (+0, -16); teto 30 px; eixo no ADS -0° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC
- **m400** N/A — luneta: no ADS o viewmodel some e entra o overlay 2D
- **mosin** N/A — luneta: no ADS o viewmodel some e entra o overlay 2D
- **rem700** N/A — luneta: no ADS o viewmodel some e entra o overlay 2D
- **svd** N/A — luneta: no ADS o viewmodel some e entra o overlay 2D
- **g3sg1** N/A — luneta: no ADS o viewmodel some e entra o overlay 2D
- **sks** N/A — luneta: no ADS o viewmodel some e entra o overlay 2D
- **lmg** VERMELHO — mira fora da cruz a 30 px — massa a 30 px da cruz (+30, -3); teto 30 px; eixo no ADS +6° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **scar** VERMELHO — mira fora da cruz a 99 px; ângulo esquisito no ADS: arma tombada +29° da vertical — massa a 99 px da cruz (+36, -92); teto 30 px; eixo no ADS +29° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **tavor** VERMELHO — mira fora da cruz a 41 px — massa a 41 px da cruz (+1, -41); teto 30 px; eixo no ADS -9° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **famas** VERMELHO — mira fora da cruz a 64 px — massa a 64 px da cruz (-8, -63); teto 30 px; eixo no ADS -5° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **uzi** VERMELHO — ângulo esquisito no ADS: arma tombada +14° da vertical — massa a 25 px da cruz (+5, -25); teto 30 px; eixo no ADS +14° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **p90** VERMELHO — mira fora da cruz a 71 px — aro a 71 px da cruz (-29, +65); teto 30 px; eixo no ADS +4° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.108 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).

### cobertura

- **awp** VERMELHO — arma gigante: 143% da AK (faixa 0.8–1.25, classe longa); braço 1.47× a área do braço da AK (teto 1.4) — tamanho 1.43× AK, rolagem -17° da AK (informativa), eixo +1° da AK, braço 1.47×, cruz 0 px, olho 1.03 palma, ADS: viewmodel some (luneta). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **ak** VERDE — tamanho 0.98× AK, rolagem +14° da AK (informativa), eixo -2° da AK, braço 0.58×, cruz 0 px, olho 3.20 palma, ADS cobre 11.2% (teto 18.5%)
- **m4** VERDE — tamanho 1.01× AK, rolagem +5° da AK (informativa), eixo +7° da AK, braço 0.79×, cruz 0 px, olho 1.36 palma, ADS cobre 10.3% (teto 18.5%)
- **mp5** VERDE — tamanho 0.79× AK, rolagem +12° da AK (informativa), eixo -7° da AK, braço 0.90×, cruz 0 px, olho 2.49 palma, ADS cobre 5.6% (teto 18.5%)
- **shotgun** VERDE — tamanho 1.06× AK, rolagem +20° da AK (informativa), eixo -6° da AK, braço 1.26×, cruz 0 px, olho 0.99 palma, ADS cobre 11.9% (teto 18.5%)
- **deagle** N/A — arma curta: medida contra a pistola em eval:vm-pistola-ref
- **pistol** N/A — arma curta: medida contra a pistola em eval:vm-pistola-ref
- **knife** N/A — faca: meleevm, régua própria (melee-framing)
- **m92** VERDE — tamanho 0.99× AK, rolagem +22° da AK (informativa), eixo -1° da AK, braço 0.71×, cruz 0 px, olho 2.09 palma, ADS cobre 12.3% (teto 18.5%)
- **akm** VERMELHO — arma pequena: 73% da AK (faixa 0.8–1.25, classe longa); ângulo esquisito: eixo da arma na tela 142° contra 155° da AK (-13°, teto ±12°) — tamanho 0.73× AK, rolagem +17° da AK (informativa), eixo -13° da AK, braço 0.43×, cruz 0 px, olho 2.43 palma, ADS cobre 15.9% (teto 18.5%). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **g3** VERMELHO — braço 1.52× a área do braço da AK (teto 1.4); ângulo esquisito: eixo da arma na tela 138° contra 155° da AK (-17°, teto ±12°) — tamanho 1.04× AK, rolagem +32° da AK (informativa), eixo -17° da AK, braço 1.52×, cruz 0 px, olho 1.69 palma, ADS cobre 14.1% (teto 18.5%). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **revolver38** N/A — arma curta: medida contra a pistola em eval:vm-pistola-ref
- **md97** VERMELHO — braço 1.61× a área do braço da AK (teto 1.4); ângulo esquisito: eixo da arma na tela -176° contra 155° da AK (+29°, teto ±12°) — tamanho 1.04× AK, rolagem -114° da AK (informativa), eixo +29° da AK, braço 1.61×, cruz 0 px, olho 1.53 palma, ADS cobre 8.7% (teto 18.5%). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **carbine** VERMELHO — braço 1.97× a área do braço da AK (teto 1.4) — tamanho 1.20× AK, rolagem +5° da AK (informativa), eixo +0° da AK, braço 1.97×, cruz 0 px, olho 0.97 palma, ADS cobre 11.3% (teto 18.5%). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **m400** VERMELHO — arma pequena: 77% da AK (faixa 0.8–1.25, classe longa); ângulo esquisito: eixo da arma na tela 133° contra 155° da AK (-22°, teto ±12°) — tamanho 0.77× AK, rolagem +19° da AK (informativa), eixo -22° da AK, braço 0.98×, cruz 0 px, olho 2.08 palma, ADS: viewmodel some (luneta). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **mosin** VERMELHO — arma pequena: 64% da AK (faixa 0.8–1.25, classe longa); braço 5.72× a área do braço da AK (teto 1.4); 162 px de arma/braço sobre a cruz no quadril; ângulo esquisito: eixo da arma na tela -180° contra 155° da AK (+25°, teto ±12°) — tamanho 0.64× AK, rolagem -65° da AK (informativa), eixo +25° da AK, braço 5.72×, cruz 162 px, olho 0.77 palma, ADS: viewmodel some (luneta). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **rem700** VERMELHO — arma gigante: 147% da AK (faixa 0.8–1.25, classe longa); braço 1.66× a área do braço da AK (teto 1.4); 222 px de arma/braço sobre a cruz no quadril; ângulo esquisito: eixo da arma na tela 53° contra 155° da AK (-102°, teto ±12°); câmera dentro da arma: a parte mais perto está a 0.54 palma do olho (mínimo 0.6) — tamanho 1.47× AK, rolagem +5° da AK (informativa), eixo -102° da AK, braço 1.66×, cruz 222 px, olho 0.54 palma, ADS: viewmodel some (luneta). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **svd** VERMELHO — arma pequena: 36% da AK (faixa 0.8–1.25, classe longa); ângulo esquisito: eixo da arma na tela 94° contra 155° da AK (-61°, teto ±12°) — tamanho 0.36× AK, rolagem +42° da AK (informativa), eixo -61° da AK, braço 1.35×, cruz 0 px, olho 1.66 palma, ADS: viewmodel some (luneta). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **g3sg1** VERMELHO — ângulo esquisito: eixo da arma na tela 135° contra 155° da AK (-21°, teto ±12°) — tamanho 1.06× AK, rolagem +37° da AK (informativa), eixo -21° da AK, braço 1.08×, cruz 0 px, olho 1.44 palma, ADS: viewmodel some (luneta). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **sks** VERMELHO — arma pequena: 64% da AK (faixa 0.8–1.25, classe longa); ângulo esquisito: eixo da arma na tela 138° contra 155° da AK (-17°, teto ±12°) — tamanho 0.64× AK, rolagem +9° da AK (informativa), eixo -17° da AK, braço 0.64×, cruz 0 px, olho 2.01 palma, ADS: viewmodel some (luneta). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **lmg** VERDE — tamanho 0.78× AK, rolagem +2° da AK (informativa), eixo -4° da AK, braço 0.69×, cruz 0 px, olho 1.42 palma, ADS cobre 9.5% (teto 18.5%)
- **scar** VERDE — tamanho 1.20× AK, rolagem +11° da AK (informativa), eixo +5° da AK, braço 0.82×, cruz 0 px, olho 1.03 palma, ADS cobre 17.9% (teto 18.5%)
- **tavor** VERDE — tamanho 1.04× AK, rolagem +12° da AK (informativa), eixo +7° da AK, braço 0.46×, cruz 0 px, olho 1.83 palma, ADS cobre 9.5% (teto 18.5%)
- **famas** VERDE — tamanho 0.91× AK, rolagem -8° da AK (informativa), eixo -2° da AK, braço 0.78×, cruz 0 px, olho 1.72 palma, ADS cobre 13.0% (teto 18.5%)
- **uzi** VERDE — tamanho 0.53× AK, rolagem -3° da AK (informativa), eixo +0° da AK, braço 0.25×, cruz 0 px, olho ? palma, ADS cobre 3.4% (teto 18.5%)
- **p90** VERDE — tamanho 0.68× AK, rolagem +49° da AK (informativa), eixo -7° da AK, braço 0.38×, cruz 0 px, olho 4.16 palma, ADS cobre 10.5% (teto 18.5%)

### pistola-ref

- **awp** N/A — só armas curtas
- **ak** N/A — só armas curtas
- **m4** N/A — só armas curtas
- **mp5** N/A — só armas curtas
- **shotgun** N/A — só armas curtas
- **deagle** VERMELHO — arma pequena: 63% da pistola aprovada por metro (faixa 0.8–1.25); posição: centro da arma a 129 px do da pistola (33, -125; teto 86); ADS: só 49% da arma visível contra a pistola (mínimo 50%) — tamanho 0.63× pistola aprovada, desvio 129 px, ADS 49%. Conserto: FAMILY_FRAME/VM_FRAME da família curta (escala/offset/rotDeg).
- **pistol** VERMELHO — arma pequena: 58% da pistola aprovada por metro (faixa 0.8–1.25) — tamanho 0.58× pistola aprovada, desvio 26 px, ADS 100%. Conserto: FAMILY_FRAME/VM_FRAME da família curta (escala/offset/rotDeg).
- **knife** N/A — só armas curtas
- **m92** N/A — só armas curtas
- **akm** N/A — só armas curtas
- **g3** N/A — só armas curtas
- **revolver38** VERDE — tamanho 0.85× pistola aprovada, desvio 28 px, ADS 191%
- **md97** N/A — só armas curtas
- **carbine** N/A — só armas curtas
- **m400** N/A — só armas curtas
- **mosin** N/A — só armas curtas
- **rem700** N/A — só armas curtas
- **svd** N/A — só armas curtas
- **g3sg1** N/A — só armas curtas
- **sks** N/A — só armas curtas
- **lmg** N/A — só armas curtas
- **scar** N/A — só armas curtas
- **tavor** N/A — só armas curtas
- **famas** N/A — só armas curtas
- **uzi** N/A — só armas curtas
- **p90** N/A — só armas curtas

### maos

- **awp** VERDE — dedos da mão de apoio a 0.08 palma da malha da arma (palma 0.26); teto 0.2
- **ak** VERMELHO — mão de apoio não encosta / fica no ar: dedos da mão de apoio a 0.61 palma da malha da arma (palma 0.68); teto 0.2. Conserto: pose da mão de apoio no produto (vm-fix-grips); não é config.
- **m4** VERDE — dedos da mão de apoio a 0.00 palma da malha da arma (palma 0.08); teto 0.2
- **mp5** VERDE — dedos da mão de apoio a 0.01 palma da malha da arma (palma 0.22); teto 0.2
- **shotgun** VERDE — dedos da mão de apoio a 0.06 palma da malha da arma (palma 0.31); teto 0.2
- **deagle** N/A — curta: mão de apoio envolve a outra mão, não a arma
- **pistol** N/A — curta: mão de apoio envolve a outra mão, não a arma
- **knife** N/A — faca
- **m92** VERDE — dedos da mão de apoio a 0.00 palma da malha da arma (palma 0.05); teto 0.2
- **akm** VERMELHO — mão de apoio não encosta / fica no ar: dedos da mão de apoio a 0.60 palma da malha da arma (palma 0.74); teto 0.2. Conserto: pose da mão de apoio no produto (vm-fix-grips); não é config.
- **g3** VERMELHO — mão de apoio não encosta / fica no ar: dedos da mão de apoio a 0.40 palma da malha da arma (palma 0.74); teto 0.2. Conserto: pose da mão de apoio no produto (vm-fix-grips); não é config.
- **revolver38** N/A — curta: mão de apoio envolve a outra mão, não a arma
- **md97** VERDE — dedos da mão de apoio a 0.02 palma da malha da arma (palma 0.03); teto 0.2
- **carbine** VERMELHO — mão de apoio não encosta / fica no ar: dedos da mão de apoio a 0.38 palma da malha da arma (palma 0.70); teto 0.2. Conserto: pose da mão de apoio no produto (vm-fix-grips); não é config.
- **m400** VERDE — dedos da mão de apoio a 0.06 palma da malha da arma (palma 0.10); teto 0.2
- **mosin** VERDE — dedos da mão de apoio a 0.01 palma da malha da arma (palma 0.01); teto 0.2
- **rem700** VERMELHO — mão de apoio não encosta / fica no ar: dedos da mão de apoio a 0.22 palma da malha da arma (palma 0.55); teto 0.2. Conserto: pose da mão de apoio no produto (vm-fix-grips); não é config.
- **svd** VERDE — dedos da mão de apoio a 0.06 palma da malha da arma (palma 0.22); teto 0.2
- **g3sg1** VERDE — dedos da mão de apoio a 0.03 palma da malha da arma (palma 0.01); teto 0.2
- **sks** VERDE — dedos da mão de apoio a 0.02 palma da malha da arma (palma 0.02); teto 0.2
- **lmg** VERDE — dedos da mão de apoio a 0.13 palma da malha da arma (palma 0.18); teto 0.2
- **scar** VERMELHO — mão de apoio não encosta / fica no ar: dedos da mão de apoio a 0.44 palma da malha da arma (palma 0.79); teto 0.2. Conserto: pose da mão de apoio no produto (vm-fix-grips); não é config.
- **tavor** VERMELHO — mão de apoio não encosta / fica no ar: dedos da mão de apoio a 0.30 palma da malha da arma (palma 0.60); teto 0.2. Conserto: pose da mão de apoio no produto (vm-fix-grips); não é config.
- **famas** VERDE — dedos da mão de apoio a 0.19 palma da malha da arma (palma 0.51); teto 0.2
- **uzi** N/A — uzi: uma mão só (decisão do dono); mão de apoio é da vm-fix-grips
- **p90** VERDE — dedos da mão de apoio a 0.06 palma da malha da arma (palma 0.12); teto 0.2

### carregador

- **awp** VERDE — vazia0.08:fora vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:fora vazia0.46:fora vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:fora tatica0.14:arma tatica0.29:mao tatica0.43:fora tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **ak** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:fora tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **m4** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **mp5** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:fora tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **shotgun** VERDE — vazia0.08:arma vazia0.15:mao-vazia vazia0.23:mao vazia0.31:mao-vazia vazia0.38:mao-vazia vazia0.46:mao vazia0.54:mao-vazia vazia0.62:mao-vazia vazia0.69:mao vazia0.77:mao-vazia vazia0.85:mao-vazia vazia0.92:arma tatica0.14:arma tatica0.29:mao-vazia tatica0.43:mao-vazia tatica0.57:mao-vazia tatica0.71:mao tatica0.86:arma
- **deagle** VERMELHO — recarrega com objeto no meio do ar: vazia 15% — 2.30 palma da mão, deslocado 3.04 do encaixe, na tela. Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.
- **pistol** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:arma vazia0.54:mao vazia0.62:mao vazia0.69:mao vazia0.77:mao vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:mao tatica0.86:arma
- **knife** N/A — faca: sem carregador
- **m92** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **akm** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **g3** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:fora vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **revolver38** N/A — cilindro: tambor e cartuchos são do eval:vm-pistol-revolver
- **md97** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:mao vazia0.69:arma vazia0.77:arma vazia0.85:fora vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **carbine** N/A — alavanca com cartucho solto pela janela: sem peça de carregador no produto
- **m400** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:fora vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **mosin** VERMELHO — em repouso o clipe está solto no quadro (3.99 palma da mão, ∞ da arma); recarrega com objeto no meio do ar: vazia 23% — 7.31 palma da mão, deslocado 4.16 do encaixe, 96 px na tela; recarrega com objeto no meio do ar: vazia 31% — 6.99 palma da mão, deslocado 4.16 do encaixe, 101 px na tela; recarrega com objeto no meio do ar: vazia 38% — 7.31 palma da mão, deslocado 4.16 do encaixe, 98 px na tela (+10). Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.
- **rem700** VERMELHO — em repouso o clipe está solto no quadro (1.47 palma da mão, 0.20 da arma); recarrega com objeto no meio do ar: vazia 15% — 2.58 palma da mão, deslocado 4.62 do encaixe, 112 px na tela; recarrega com objeto no meio do ar: vazia 31% — 2.69 palma da mão, deslocado 4.62 do encaixe, 96 px na tela; recarrega com objeto no meio do ar: vazia 54% — 2.69 palma da mão, deslocado 4.62 do encaixe, 97 px na tela (+1). Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.
- **svd** VERMELHO — tira carregador fantasma: a peça do carregador mede 100% da arma. Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.
- **g3sg1** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:mao vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **sks** VERDE — vazia0.08:mao-vazia vazia0.15:mao-vazia vazia0.23:mao-vazia vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao-vazia vazia0.62:mao-vazia vazia0.69:mao-vazia vazia0.77:mao-vazia vazia0.85:mao-vazia vazia0.92:mao-vazia tatica0.14:mao-vazia tatica0.29:mao tatica0.43:mao tatica0.57:mao-vazia tatica0.71:mao-vazia tatica0.86:mao-vazia
- **lmg** N/A — fita/caixa: eval:vm-lmg-final (tampa/caixa/fita)
- **scar** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:mao vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:fora tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **tavor** VERMELHO — mão vazia: vazia 38% — mão de apoio na tela e o carregador a 0.89 palma dela, fora do quadro. Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.
- **famas** VERMELHO — mão vazia: vazia 38% — mão de apoio na tela e o carregador a 0.85 palma dela, fora do quadro. Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.
- **uzi** VERMELHO — em repouso o carregador não encosta na arma (Infinity palma); tira carregador fantasma: a peça do carregador mede 100% da arma. Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.
- **p90** VERMELHO — tira carregador fantasma (toco): com o pente na mão aparece no máximo 30% dele (mínimo 35%). Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.

