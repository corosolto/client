# Matriz gerada do arsenal

Gerada por `node tools/gen-weapon-matrix.mjs`; não editar os valores à mão.
O dano vem do consumidor real em [game.js:3819](../public/js/game.js#L3819).

Alvo ideal de 100 HP, sem proteção/regeneração, primeiro tiro imediato, todos os
pellets no mesmo alvo, sem erro de mira, saque ou latência. TTK usa cadência
configurada e inclui recarga ao ultrapassar o pente. É um limite ideal, não
previsão de partida nem equivalência entre HP e energia de munição real.

Para a escopeta, dano é por cartucho completo; pellets mostra a contagem e o
dano individual de contato. A probabilidade de concentrá-los depende da
dispersão. Luneta é equipamento do jogo e não determina o perfil de dano.

| ID | Referência / cartucho | Ação / entrada | Perfil / luneta | RPM máximo do jogo | Pente | Pellets × dano | Torso 0 / 50 / 100 / 200 m | BTK torso 0 / 100 m | TTK torso 0 / 100 m (s) | HS a 0 m |
|---|---|---|---|---:|---:|---|---|---|---|---:|
| awp | Accuracy International AW Police / 7,62×51 | ferrolho / pressionar | sniper / sim | 35.294 | 5 | 1 × 400 | 400 / 400 / 400 / 400 | 1 / 1 | 0 / 0 | 1000 |
| ak | AK-47 / 7,62×39 | seletiva / segurar | rifle / não | 600 | 30 | 1 × 36 | 36 / 35.46 / 30.6 / 30.6 | 3 / 4 | 0.2 / 0.3 | 144 |
| m4 | M4A1 / 5,56×45 | seletiva / segurar | rifle / não | 666.667 | 30 | 1 × 31 | 31 / 30.535 / 26.35 / 26.35 | 4 / 4 | 0.27 / 0.27 | 124 |
| mp5 | HK MP5 / 9×19 | seletiva / segurar | smg / não | 800 | 30 | 1 × 26 | 26 / 19.5 / 15.6 / 15.6 | 4 / 7 | 0.225 / 0.45 | 104 |
| shotgun | Benelli M3 em modo pump / 12 gauge | pump / pressionar | shotgun / não | 66.667 | 7 | 9 × 14 | 126 / 37.8 / 37.8 / 37.8 | 1 / 3 | 0 / 1.8 | 214.2 |
| deagle | Desert Eagle Mark XIX / .50 AE | semiautomatica / pressionar | pistol / não | 250 | 7 | 1 × 53 | 53 / 42.93 / 32.86 / 32.86 | 2 / 4 | 0.24 / 0.72 | 212 |
| pistol | Taurus PT-938 / .380 ACP | semiautomatica / pressionar | pistol / não | 352.941 | 12 | 1 × 34 | 34 / 27.54 / 21.08 / 21.08 | 3 / 5 | 0.34 / 0.68 | 136 |
| m92 | Zastava M92 militar / 7,62×39 | seletiva / segurar | rifle / não | 600 | 30 | 1 × 32 | 32 / 31.52 / 27.2 / 27.2 | 4 / 4 | 0.3 / 0.3 | 128 |
| akm | AKM / 7,62×39 | seletiva / segurar | rifle / não | 571.429 | 30 | 1 × 34 | 34 / 33.49 / 28.9 / 28.9 | 3 / 4 | 0.21 / 0.315 | 136 |
| g3 | HK G3 / 7,62×51 | seletiva / segurar | rifle / não | 545.455 | 20 | 1 × 37 | 37 / 36.445 / 31.45 / 31.45 | 3 / 4 | 0.22 / 0.33 | 148 |
| revolver38 | Revólver .38 fictício / .38 Special | revolver / pressionar | pistol / não | 166.667 | 6 | 1 × 46 | 46 / 37.26 / 28.52 / 28.52 | 3 / 4 | 0.72 / 1.08 | 184 |
| md97 | IMBEL MD97 militar / 5,56×45 | seletiva / segurar | rifle / não | 500 | 20 | 1 × 38 | 38 / 37.43 / 32.3 / 32.3 | 3 / 4 | 0.24 / 0.36 | 152 |
| carbine | Rossi R92 / .357 Magnum | alavanca / pressionar | rifle / não | 120 | 10 | 1 × 42 | 42 / 41.37 / 35.7 / 35.7 | 3 / 3 | 1 / 1 | 168 |
| m400 | SIG M400 militar / 5,56×45 | seletiva / segurar | rifle / sim | 545.455 | 20 | 1 × 40 | 40 / 39.4 / 34 / 34 | 3 / 3 | 0.22 / 0.22 | 160 |
| mosin | Mosin-Nagant M91/30 / 7,62×54R | ferrolho / pressionar | sniper / sim | 40 | 5 | 1 × 120 | 120 / 120 / 120 / 120 | 1 / 1 | 0 / 0 | 300 |
| rem700 | Remington Model 700 / .308 Winchester | ferrolho / pressionar | rifle / sim | 40 | 5 | 1 × 130 | 130 / 128.05 / 110.5 / 110.5 | 1 / 1 | 0 / 0 | 520 |
| svd | SVD / 7,62×54R | semiautomatica / segurar | sniper / sim | 214.286 | 10 | 1 × 62 | 62 / 62 / 62 / 62 | 2 / 2 | 0.28 / 0.28 | 155 |
| g3sg1 | HK G3SG1 / 7,62×51 | seletiva / segurar | rifle / sim | 272.727 | 20 | 1 × 55 | 55 / 54.175 / 46.75 / 46.75 | 2 / 3 | 0.22 / 0.44 | 220 |
| sks | SKS / 7,62×39 | semiautomatica / segurar | sniper / sim | 333.333 | 10 | 1 × 48 | 48 / 48 / 48 / 48 | 3 / 3 | 0.36 / 0.36 | 120 |
| lmg | FN Minimi 5.56 / 5,56×45 | automatica / segurar | lmg / sim | 705.882 | 100 | 1 × 31 | 31 / 29.76 / 24.8 / 24.8 | 4 / 5 | 0.255 / 0.34 | 111.6 |
| scar | FN SCAR-H / 7,62×51 | seletiva / segurar | rifle / não | 545.455 | 20 | 1 × 37 | 37 / 36.445 / 31.45 / 31.45 | 3 / 4 | 0.22 / 0.33 | 148 |
| tavor | IWI Tavor TAR-21 / 5,56×45 | seletiva / segurar | rifle / não | 666.667 | 30 | 1 × 32 | 32 / 31.52 / 27.2 / 27.2 | 4 / 4 | 0.27 / 0.27 | 128 |
| famas | FAMAS F1 / 5,56×45 | seletiva / segurar | rifle / não | 800 | 25 | 1 × 29 | 29 / 28.565 / 24.65 / 24.65 | 4 / 5 | 0.225 / 0.3 | 116 |
| uzi | UZI 9 mm / 9×19 | seletiva / segurar | smg / não | 857.143 | 25 | 1 × 25 | 25 / 18.75 / 15 / 15 | 4 / 7 | 0.21 / 0.42 | 100 |
| p90 | FN P90 / 5,7×28 | seletiva / segurar | smg / não | 923.077 | 50 | 1 × 23 | 23 / 17.25 / 13.8 / 13.8 | 5 / 8 | 0.26 / 0.455 | 92 |

A faca usa [game.js:3765](../public/js/game.js#L3765), sem modelo de pellet,
falloff ou headshot de tiro. Golpe rápido: 55 HP; alcance configurado
2.4 m; intervalo 0.55 s. O golpe pesado possui seu próprio
contrato e não é equiparado a um disparo nesta tabela.
