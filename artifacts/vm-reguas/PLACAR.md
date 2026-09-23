# PLACAR das réguas de imagem do viewmodel

Gerado por `node tools/eval/vm-reguas-check.mjs --regua=todas --placar` em 2026-09-23, quadro 3x2
(1440 px de largura), produtos do catálogo privado servidos pelo `vmbytes.js` deste branch. Entradas: `0525a3c8517685fc`.
Célula = estado e valor. `NÃO MEDE` conta como vermelho. Detalhe por célula logo abaixo.

| arma | mira | cobertura | pistola-ref | maos | carregador |
|---|---|---|---|---|---|
| awp | n/a | **VERMELHO** 1.43× AK | n/a | verde 0.08 | verde ok |
| ak | verde 29 px | verde 0.95× AK | n/a | verde 0.01 | verde ok |
| m4 | **VERMELHO** 43 px | verde 1.01× AK | n/a | verde 0.00 | verde ok |
| mp5 | verde 1 px | verde 0.79× AK | n/a | verde 0.01 | verde ok |
| shotgun | verde 7 px | verde 1.06× AK | n/a | verde 0.02 | **VERMELHO** 4 falha(s) |
| deagle | verde 10 px | verde 1.13× PT-38 | verde 1.13× pistola aprovada | n/a | **VERMELHO** 9 falha(s) |
| pistol | verde 20 px | verde 1.00× PT-38 | verde 1.00× pistola aprovada | n/a | verde ok |
| knife | n/a | n/a | n/a | n/a | n/a |
| m92 | verde 17 px | verde 1.15× AK | n/a | verde 0.00 | verde ok |
| akm | verde 19 px | verde 0.93× AK | n/a | verde 0.01 | verde ok |
| g3 | **VERMELHO** 89 px | **VERMELHO** 1.06× AK | n/a | **VERMELHO** 0.40 | verde ok |
| revolver38 | verde 9 px | verde 0.83× PT-38 | verde 0.83× pistola aprovada | n/a | n/a |
| md97 | verde 16 px | **VERMELHO** 1.04× AK | n/a | verde 0.02 | verde ok |
| carbine | verde 16 px | verde 0.94× AK | n/a | **VERMELHO** 0.38 | n/a |
| m400 | n/a | **VERMELHO** 0.91× AK | n/a | verde 0.01 | verde ok |
| mosin | n/a | **VERMELHO** 1.13× AK | n/a | verde 0.03 | **VERMELHO** 1 falha(s) |
| rem700 | n/a | **VERMELHO** 1.07× AK | n/a | verde 0.04 | **VERMELHO** 1 falha(s) |
| svd | n/a | **VERMELHO** 0.50× AK | n/a | verde 0.01 | **VERMELHO** 2 falha(s) |
| g3sg1 | n/a | **VERMELHO** 1.06× AK | n/a | verde 0.03 | verde ok |
| sks | n/a | **VERMELHO** 0.64× AK | n/a | verde 0.02 | verde ok |
| lmg | **VERMELHO** 31 px | verde 0.75× AK | n/a | verde 0.13 | n/a |
| scar | **VERMELHO** 99 px | verde 1.20× AK | n/a | **VERMELHO** 0.44 | verde ok |
| tavor | **VERMELHO** 41 px | verde 1.04× AK | n/a | **VERMELHO** 0.30 | **VERMELHO** 1 falha(s) |
| famas | **VERMELHO** 64 px | verde 0.91× AK | n/a | verde 0.19 | **VERMELHO** 1 falha(s) |
| uzi | **VERMELHO** 25 px | verde 0.53× AK | n/a | n/a | **VERMELHO** 2 falha(s) |
| p90 | **VERMELHO** 71 px | verde 0.68× AK | n/a | verde 0.06 | **VERMELHO** 1 falha(s) |

**Vermelhas na máquina:** 19 de 26 — awp, m4, shotgun, deagle, g3, md97, carbine, m400, mosin, rem700, svd, g3sg1, sks, lmg, scar, tavor, famas, uzi, p90.

## mira

- **awp** N/A — luneta: no ADS o viewmodel some e entra o overlay 2D
- **ak** VERDE — massa a 29 px da cruz (+6, -28); teto 30 px; eixo no ADS -0° da vertical (teto ±12°); linhaDeMira (#633): massa declarada a 17 px do aparelho visto · socket sight (o que o AD1 lê) 0.123 NDC
- **m4** VERMELHO — mira fora da cruz a 43 px — massa a 43 px da cruz (+5, -43); teto 30 px; eixo no ADS +1° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **mp5** VERDE — aro a 1 px da cruz (-0, -0); teto 30 px; eixo no ADS +2° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.101 NDC
- **shotgun** VERDE — massa a 7 px da cruz (+2, -7); teto 30 px; eixo no ADS -3° da vertical (teto ±12°); linhaDeMira (#633): massa declarada a 10 px do aparelho visto · socket sight (o que o AD1 lê) 0.013 NDC
- **deagle** VERDE — massa a 10 px da cruz (-10, +1); teto 30 px; eixo no ADS -1° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.082 NDC
- **pistol** VERDE — massa a 20 px da cruz (+0, -20); teto 30 px; eixo no ADS -4° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC
- **knife** N/A — faca: sem ADS
- **m92** VERDE — massa a 17 px da cruz (+16, -7); teto 30 px; eixo no ADS +1° da vertical (teto ±12°); linhaDeMira (#633): massa declarada a 18 px do aparelho visto · socket sight (o que o AD1 lê) 0.127 NDC
- **akm** VERDE — massa a 19 px da cruz (+15, -11); teto 30 px; eixo no ADS +8° da vertical (teto ±12°); linhaDeMira (#633): massa declarada a 19 px do aparelho visto · socket sight (o que o AD1 lê) 0.157 NDC
- **g3** VERMELHO — mira fora da cruz a 89 px — massa a 89 px da cruz (+3, -89); teto 30 px; eixo no ADS +8° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **revolver38** VERDE — massa a 9 px da cruz (-9, +1); teto 30 px; eixo no ADS -6° da vertical (teto ±12°); linhaDeMira (#633): massa declarada a 9 px do aparelho visto · socket sight (o que o AD1 lê) 0.018 NDC
- **md97** VERDE — massa a 16 px da cruz (-8, -14); teto 30 px; eixo no ADS +3° da vertical (teto ±12°); linhaDeMira (#633): massa declarada a 13 px do aparelho visto · socket sight (o que o AD1 lê) 0.093 NDC
- **carbine** VERDE — massa a 16 px da cruz (+0, -16); teto 30 px; eixo no ADS +0° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC
- **m400** N/A — luneta: no ADS o viewmodel some e entra o overlay 2D
- **mosin** N/A — luneta: no ADS o viewmodel some e entra o overlay 2D
- **rem700** N/A — luneta: no ADS o viewmodel some e entra o overlay 2D
- **svd** N/A — luneta: no ADS o viewmodel some e entra o overlay 2D
- **g3sg1** N/A — luneta: no ADS o viewmodel some e entra o overlay 2D
- **sks** N/A — luneta: no ADS o viewmodel some e entra o overlay 2D
- **lmg** VERMELHO — mira fora da cruz a 31 px — massa a 31 px da cruz (+31, -3); teto 30 px; eixo no ADS +7° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **scar** VERMELHO — mira fora da cruz a 99 px; ângulo esquisito no ADS: arma tombada +29° da vertical — massa a 99 px da cruz (+36, -92); teto 30 px; eixo no ADS +29° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **tavor** VERMELHO — mira fora da cruz a 41 px — massa a 41 px da cruz (+1, -41); teto 30 px; eixo no ADS -9° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **famas** VERMELHO — mira fora da cruz a 64 px — massa a 64 px da cruz (-8, -63); teto 30 px; eixo no ADS -5° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **uzi** VERMELHO — ângulo esquisito no ADS: arma tombada +14° da vertical — massa a 25 px da cruz (+5, -25); teto 30 px; eixo no ADS +14° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.000 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).
- **p90** VERMELHO — mira fora da cruz a 71 px — aro a 71 px da cruz (-29, +65); teto 30 px; eixo no ADS +4° da vertical (teto ±12°) · socket sight (o que o AD1 lê) 0.108 NDC. Conserto: ads.off/rotDeg da arma (vmconfig) ou o socket SOCKET_MINT_SIGHT no produto (vm-fix-mesh).

## cobertura

- **awp** VERMELHO — arma gigante: 143% da AK (faixa 0.8–1.25, classe longa); braço 1.47× a área do braço da AK (teto 1.4) — tamanho 1.43× AK, rolagem -17° da AK (informativa), eixo +1° da AK, braço 1.47×, cruz 0 px, olho 1.03 palma, ADS: viewmodel some (luneta). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **ak** VERDE — tamanho 0.95× AK, rolagem +13° da AK (informativa), eixo -1° da AK, braço 0.94×, cruz 0 px, olho 2.86 palma, ADS cobre 7.4% (teto 18.5%)
- **m4** VERDE — tamanho 1.01× AK, rolagem +5° da AK (informativa), eixo +7° da AK, braço 0.79×, cruz 0 px, olho 1.36 palma, ADS cobre 10.3% (teto 18.5%)
- **mp5** VERDE — tamanho 0.79× AK, rolagem +12° da AK (informativa), eixo -7° da AK, braço 0.90×, cruz 0 px, olho 2.49 palma, ADS cobre 5.6% (teto 18.5%)
- **shotgun** VERDE — tamanho 1.06× AK, rolagem +20° da AK (informativa), eixo -6° da AK, braço 1.28×, cruz 0 px, olho 0.99 palma, ADS cobre 12.7% (teto 18.5%)
- **deagle** VERDE — curta: tamanho 1.13× PT-38 aprovada por metro (faixa 0.8–1.25), cruz 0 px, olho 3.30 palma
- **pistol** VERDE — curta: tamanho 1.00× PT-38 aprovada por metro (faixa 0.8–1.25), cruz 0 px, olho 3.36 palma
- **knife** N/A — faca: meleevm, régua própria (melee-framing)
- **m92** VERDE — tamanho 1.15× AK, rolagem +14° da AK (informativa), eixo +10° da AK, braço 1.16×, cruz 0 px, olho 3.13 palma, ADS cobre 7.4% (teto 18.5%)
- **akm** VERDE — tamanho 0.93× AK, rolagem +3° da AK (informativa), eixo +0° da AK, braço 0.99×, cruz 0 px, olho 2.88 palma, ADS cobre 7.5% (teto 18.5%)
- **g3** VERMELHO — braço 1.41× a área do braço da AK (teto 1.4); ângulo esquisito: eixo da arma na tela 142° contra 155° da AK (-14°, teto ±12°) — tamanho 1.06× AK, rolagem +34° da AK (informativa), eixo -14° da AK, braço 1.41×, cruz 0 px, olho 1.38 palma, ADS cobre 14.1% (teto 18.5%). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **revolver38** VERDE — curta: tamanho 0.83× PT-38 aprovada por metro (faixa 0.8–1.25), cruz 0 px, olho 5.56 palma
- **md97** VERMELHO — braço 1.61× a área do braço da AK (teto 1.4); ângulo esquisito: eixo da arma na tela -176° contra 155° da AK (+29°, teto ±12°) — tamanho 1.04× AK, rolagem -114° da AK (informativa), eixo +29° da AK, braço 1.61×, cruz 0 px, olho 1.53 palma, ADS cobre 8.7% (teto 18.5%). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **carbine** VERDE — tamanho 0.94× AK, rolagem +15° da AK (informativa), eixo -4° da AK, braço 1.26×, cruz 0 px, olho 1.46 palma, ADS cobre 11.5% (teto 18.5%)
- **m400** VERMELHO — ângulo esquisito: eixo da arma na tela 133° contra 155° da AK (-22°, teto ±12°) — tamanho 0.91× AK, rolagem +44° da AK (informativa), eixo -22° da AK, braço 0.73×, cruz 0 px, olho 1.90 palma, ADS: viewmodel some (luneta). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **mosin** VERMELHO — braço 2.44× a área do braço da AK (teto 1.4); 3479 px de arma/braço sobre a cruz no quadril — tamanho 1.13× AK, rolagem +25° da AK (informativa), eixo -11° da AK, braço 2.44×, cruz 3479 px, olho 0.76 palma, ADS: viewmodel some (luneta). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **rem700** VERMELHO — 2205 px de arma/braço sobre a cruz no quadril — tamanho 1.07× AK, rolagem +21° da AK (informativa), eixo -7° da AK, braço 1.01×, cruz 2205 px, olho 1.19 palma, ADS: viewmodel some (luneta). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **svd** VERMELHO — arma pequena: 50% da AK (faixa 0.8–1.25, classe longa); ângulo esquisito: eixo da arma na tela 98° contra 155° da AK (-57°, teto ±12°) — tamanho 0.50× AK, rolagem +44° da AK (informativa), eixo -57° da AK, braço 1.15×, cruz 0 px, olho 1.83 palma, ADS: viewmodel some (luneta). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **g3sg1** VERMELHO — ângulo esquisito: eixo da arma na tela 135° contra 155° da AK (-21°, teto ±12°) — tamanho 1.06× AK, rolagem +37° da AK (informativa), eixo -21° da AK, braço 1.08×, cruz 0 px, olho 1.44 palma, ADS: viewmodel some (luneta). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **sks** VERMELHO — arma pequena: 64% da AK (faixa 0.8–1.25, classe longa); ângulo esquisito: eixo da arma na tela 138° contra 155° da AK (-17°, teto ±12°) — tamanho 0.64× AK, rolagem +9° da AK (informativa), eixo -17° da AK, braço 0.64×, cruz 0 px, olho 2.01 palma, ADS: viewmodel some (luneta). Conserto: z/escala do frame da arma (vmframe.js) ou malha (vm-fix-mesh).
- **lmg** VERDE — tamanho 0.75× AK, rolagem +0° da AK (informativa), eixo -12° da AK, braço 0.62×, cruz 0 px, olho 1.58 palma, ADS cobre 9.6% (teto 18.5%)
- **scar** VERDE — tamanho 1.20× AK, rolagem +11° da AK (informativa), eixo +5° da AK, braço 0.82×, cruz 0 px, olho 1.03 palma, ADS cobre 17.9% (teto 18.5%)
- **tavor** VERDE — tamanho 1.04× AK, rolagem +12° da AK (informativa), eixo +7° da AK, braço 0.46×, cruz 0 px, olho 1.83 palma, ADS cobre 9.5% (teto 18.5%)
- **famas** VERDE — tamanho 0.91× AK, rolagem -8° da AK (informativa), eixo -2° da AK, braço 0.78×, cruz 0 px, olho 1.72 palma, ADS cobre 13.0% (teto 18.5%)
- **uzi** VERDE — tamanho 0.53× AK, rolagem -3° da AK (informativa), eixo +0° da AK, braço 0.25×, cruz 0 px, olho ? palma, ADS cobre 3.4% (teto 18.5%)
- **p90** VERDE — tamanho 0.68× AK, rolagem +49° da AK (informativa), eixo -7° da AK, braço 0.38×, cruz 0 px, olho 4.16 palma, ADS cobre 10.5% (teto 18.5%)

## pistola-ref

- **awp** N/A — só armas curtas
- **ak** N/A — só armas curtas
- **m4** N/A — só armas curtas
- **mp5** N/A — só armas curtas
- **shotgun** N/A — só armas curtas
- **deagle** VERDE — tamanho 1.13× pistola aprovada, desvio 42 px, ADS 121%
- **pistol** VERDE — tamanho 1.00× pistola aprovada, desvio 0 px, ADS 100%
- **knife** N/A — só armas curtas
- **m92** N/A — só armas curtas
- **akm** N/A — só armas curtas
- **g3** N/A — só armas curtas
- **revolver38** VERDE — tamanho 0.83× pistola aprovada, desvio 24 px, ADS 97%
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

## maos

- **awp** VERDE — dedos da mão de apoio a 0.08 palma da malha da arma (palma 0.26); teto 0.2
- **ak** VERDE — dedos da mão de apoio a 0.01 palma da malha da arma (palma 0.14); teto 0.2
- **m4** VERDE — dedos da mão de apoio a 0.00 palma da malha da arma (palma 0.08); teto 0.2
- **mp5** VERDE — dedos da mão de apoio a 0.01 palma da malha da arma (palma 0.22); teto 0.2
- **shotgun** VERDE — dedos da mão de apoio a 0.02 palma da malha da arma (palma 0.32); teto 0.2
- **deagle** N/A — curta: mão de apoio envolve a outra mão, não a arma
- **pistol** N/A — curta: mão de apoio envolve a outra mão, não a arma
- **knife** N/A — faca
- **m92** VERDE — dedos da mão de apoio a 0.00 palma da malha da arma (palma 0.05); teto 0.2
- **akm** VERDE — dedos da mão de apoio a 0.01 palma da malha da arma (palma 0.13); teto 0.2
- **g3** VERMELHO — mão de apoio não encosta / fica no ar: dedos da mão de apoio a 0.40 palma da malha da arma (palma 0.74); teto 0.2. Conserto: pose da mão de apoio no produto (vm-fix-grips); não é config.
- **revolver38** N/A — curta: mão de apoio envolve a outra mão, não a arma
- **md97** VERDE — dedos da mão de apoio a 0.02 palma da malha da arma (palma 0.03); teto 0.2
- **carbine** VERMELHO — mão de apoio não encosta / fica no ar: dedos da mão de apoio a 0.38 palma da malha da arma (palma 0.70); teto 0.2. Conserto: pose da mão de apoio no produto (vm-fix-grips); não é config.
- **m400** VERDE — dedos da mão de apoio a 0.01 palma da malha da arma (palma 0.09); teto 0.2
- **mosin** VERDE — dedos da mão de apoio a 0.03 palma da malha da arma (palma 0.16); teto 0.2
- **rem700** VERDE — dedos da mão de apoio a 0.04 palma da malha da arma (palma 0.28); teto 0.2
- **svd** VERDE — dedos da mão de apoio a 0.01 palma da malha da arma (palma 0.17); teto 0.2
- **g3sg1** VERDE — dedos da mão de apoio a 0.03 palma da malha da arma (palma 0.01); teto 0.2
- **sks** VERDE — dedos da mão de apoio a 0.02 palma da malha da arma (palma 0.02); teto 0.2
- **lmg** VERDE — dedos da mão de apoio a 0.13 palma da malha da arma (palma 0.18); teto 0.2
- **scar** VERMELHO — mão de apoio não encosta / fica no ar: dedos da mão de apoio a 0.44 palma da malha da arma (palma 0.79); teto 0.2. Conserto: pose da mão de apoio no produto (vm-fix-grips); não é config.
- **tavor** VERMELHO — mão de apoio não encosta / fica no ar: dedos da mão de apoio a 0.30 palma da malha da arma (palma 0.60); teto 0.2. Conserto: pose da mão de apoio no produto (vm-fix-grips); não é config.
- **famas** VERDE — dedos da mão de apoio a 0.19 palma da malha da arma (palma 0.51); teto 0.2
- **uzi** N/A — uzi: uma mão só (decisão do dono); mão de apoio é da vm-fix-grips
- **p90** VERDE — dedos da mão de apoio a 0.06 palma da malha da arma (palma 0.12); teto 0.2

## carregador

- **awp** VERDE — vazia0.08:fora vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:fora vazia0.46:fora vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:fora tatica0.14:arma tatica0.29:mao tatica0.43:fora tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **ak** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **m4** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **mp5** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:fora tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **shotgun** VERMELHO — recarrega com objeto no meio do ar: vazia 23% — 0.98 palma da mão, deslocado 0.77 do encaixe, na tela; recarrega com objeto no meio do ar: vazia 46% — 0.98 palma da mão, deslocado 0.77 do encaixe, na tela; recarrega com objeto no meio do ar: vazia 69% — 0.98 palma da mão, deslocado 0.77 do encaixe, na tela; tira no ar: em nenhum quadro da recarga a peça está na mão. Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.
- **deagle** VERMELHO — recarrega com objeto no meio do ar: vazia 15% — 3.64 palma da mão, deslocado 3.04 do encaixe, na tela; recarrega com objeto no meio do ar: vazia 38% — 1.20 palma da mão, deslocado 0.84 do encaixe, na tela; recarrega com objeto no meio do ar: vazia 46% — 1.18 palma da mão, deslocado 0.95 do encaixe, na tela; recarrega com objeto no meio do ar: vazia 54% — 1.98 palma da mão, deslocado 1.43 do encaixe, na tela (+5). Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.
- **pistol** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:fora vazia0.38:mao vazia0.46:arma vazia0.54:mao vazia0.62:mao vazia0.69:mao vazia0.77:fora vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:fora tatica0.43:fora tatica0.57:mao tatica0.71:mao tatica0.86:arma
- **knife** N/A — faca: sem carregador
- **m92** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **akm** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:fora vazia0.46:mao vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:fora tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **g3** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **revolver38** N/A — cilindro: tambor e cartuchos são do eval:vm-pistol-revolver
- **md97** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:mao vazia0.69:arma vazia0.77:arma vazia0.85:fora vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **carbine** N/A — alavanca com cartucho solto pela janela: sem peça de carregador no produto
- **m400** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:arma vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **mosin** VERMELHO — tira no ar: em nenhum quadro da recarga a peça está na mão. Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.
- **rem700** VERMELHO — tira no ar: em nenhum quadro da recarga a peça está na mão. Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.
- **svd** VERMELHO — tira carregador fantasma: a peça do carregador mede 100% da arma; tira no ar: em nenhum quadro da recarga a peça está na mão. Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.
- **g3sg1** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:mao vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:mao tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **sks** VERDE — vazia0.08:mao-vazia vazia0.15:mao-vazia vazia0.23:mao-vazia vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao-vazia vazia0.62:mao-vazia vazia0.69:mao-vazia vazia0.77:mao-vazia vazia0.85:mao-vazia vazia0.92:mao-vazia tatica0.14:mao-vazia tatica0.29:mao tatica0.43:mao tatica0.57:mao-vazia tatica0.71:mao-vazia tatica0.86:mao-vazia
- **lmg** N/A — fita/caixa: eval:vm-lmg-final (tampa/caixa/fita)
- **scar** VERDE — vazia0.08:arma vazia0.15:arma vazia0.23:mao vazia0.31:mao vazia0.38:mao vazia0.46:mao vazia0.54:mao vazia0.62:mao vazia0.69:arma vazia0.77:arma vazia0.85:arma vazia0.92:arma tatica0.14:arma tatica0.29:mao tatica0.43:fora tatica0.57:mao tatica0.71:arma tatica0.86:arma
- **tavor** VERMELHO — mão vazia: vazia 38% — mão de apoio na tela e o carregador a 0.89 palma dela, fora do quadro. Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.
- **famas** VERMELHO — mão vazia: vazia 38% — mão de apoio na tela e o carregador a 0.85 palma dela, fora do quadro. Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.
- **uzi** VERMELHO — em repouso o carregador não encosta na arma (Infinity palma); tira carregador fantasma: a peça do carregador mede 100% da arma. Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.
- **p90** VERMELHO — tira carregador fantasma (toco): com o pente na mão aparece no máximo 30% dele (mínimo 35%). Conserto: prender a peça ao osso da mão no clipe reload_* (vm-fix-mags); não é config.

