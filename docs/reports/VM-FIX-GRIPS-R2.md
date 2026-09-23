# vm-fix-grips-r2: pegadas K de AK, AKM, M92, revólver, LMG, shotgun e faca

**Data:** 23/09/2026 · **Branch:** `vm/fix-grips-r2` · **Base:** `vm/fix-grips` (#633) com
`vm/fix-mesh` (#632) e `vm/k-rebuild` (#631) juntados; o PR aponta para `vm/launch-k`.

Retrato datado. O estado vivo é o que `npm run eval:vm-pegada-k`, `eval:vm-ads` e o crítico cego
dizem.

## Junção dos três PRs

Conflitos só em blocos gerados (`README.md`, `STATUS.md`, `ARCH.generated.md`, `docs/**`:
regerados com `npm run docs`), em `package.json` (os dois scripts novos ficaram: `eval:vm-pegada-k`
e `eval:vm-manga-oca`), em `public/js/data/vmbytes.js` (regerado por `gen-vmbytes.mjs`) e em
`tools/eval/vm-cache-assets.mjs` (os dois mutantes ficaram; `faca-reassada` entrou na lista do
`--mutantes`, que agora roda 10).

## O que mudou, arma por arma

Tudo por pós-processo determinístico (Node + gltf-transform), sem Blender: `postProcess` e
`postProcessInputSha256` nos manifestos; as cinco receitas reproduzem o sha256 do manifesto a partir
da entrada declarada.

| Arma | Defeito medido | Conserto |
|---|---|---|
| ak | Mão de apoio fechada abaixo do guarda-mão, na frente do pente (pose do doador M4); punho direito ~9 cm à frente do cabo; mão/arma 0,49 contra 0,73 da golden; mira 91 px fora da cruz | Mão de apoio no guarda-mão (`grip-support.mjs`, IK); a arma anda até o punho direito (`tipo: 'deslocar'`, o braço esquerdo vai junto pela clavícula, sem IK); dedos direitos fechados na recarga; frame pelo retrato da golden (vm-gauntlet: mão/arma **0,74**, arma 5,8% do quadro, centro 1200,726 contra 1226,720); ADS pela alça tangente e massa (`linhaDeMira`) |
| akm | Mão de apoio no ar; 0,57× no vm-frame; mira 107 px | Mesma receita da AK (mesmo braço K) e o mesmo frame; ADS por `linhaDeMira` |
| m92 | Punho direito ~20 cm à frente do cabo real, atrás do pente, em todos os clipes; ADS com mangas achatadas e mira 79 px | A arma anda 0,224 (espaço do corpo) até o punho, que fecha no cabo a 3,5 cm do guarda-mato (PG8); frame com o cabo na borda; ADS por alça e massa (17 px) com a luva do cabo visível |
| revolver38 | Luvas ~2× as da pistola no ADS; revólver de perfil no idle | Clipe `ads` de um quadro (`ads-pose.mjs`: arma 13 cm à frente e 0,5 cm mais alta na mão, braços por IK) que o runtime soma ao idle como camada aditiva com peso = ADS (`authoredvm.js`, `adsActionOf`); yaw do frame 25° → 16° (cano ~15°, como a PT-38); luvas no ADS simulado 10,5% → 5,7% da tela |
| shotgun | Falanges da mão de apoio 1,7 cm dentro do punho vertical da bomba; ADS tombado −16° | Punho 1 cm à frente, dedos abertos (fecho 0,7), polegar girado: 0,7 cm (PG11); ADS com rolagem −4° (tombo −3°, mira 7 px) |
| lmg | "Mão de apoio sem luva" | Tentado por IK (luva 41% → 66% à vista no offline), **revertido**: no jogo a manga estendida do `vmsleeve.js` cobre a luva e o crítico não viu diferença; a régua de imagem do #636 piorou (0,13 → 0,22 palma) |
| knife | Inspect (e32b0314c) e mão de apoio 1,35× | Re-julgado; afastar a mão de apoio 7 cm foi lido pelo crítico como "mão que não encosta" e **revertido**; o funil da luva no Inspect não sai por pose |

## Réguas

- **`eval:vm-pegada-k`**: PG1 com paridade em 4 raios (face duplicada da AKM virava "fora");
  PG8 punho direito dentro do corte horizontal do cabo (ak/akm/m92); PG9 luvas ≤ 8% da tela no
  ADS simulado (PT-38 aprovada 5,2%, revólver reprovado 10,5%); PG10 luva de apoio ≥ 60% à vista
  (m4 0,85, md97 0,77); PG11 juntas de apoio ≤ 1 cm dentro da malha (shotgun reprovada 1,74 cm).
  Mutantes novos vermelhos: ak/akm/m92 reprovados (PG1/PG8), revólver sem a pose de ADS (PG9),
  ADS sem resíduo da m92 (PG6).
- **`eval:vm-ads` AD4**: com clipe `ads`, os nós dele ficam na pose do clipe com o ADS assentado
  (revólver: 0,03°, 0,00 mm); `--mutante=sem-pose-ads` morde (28,6°, 130 mm).
- **`eval:vm-pistol-revolver`** exige o clipe `ads`, só com canais de braço e arma; `eval:vm-ads` roda
  ak e revolver38 por padrão e reprova o revólver sem a pose. O runtime recusa clipe `ads` com trilha
  sem par no idle. Os mutantes de produto reprovado exigem a cláusula própria de cada arma.
- `vmads-sim.mjs` aplica a pose `ads`; `vmpose.mjs` separa pixels de luva.

## Réguas de imagem do #636 (arquivos trazidos só para medir, não versionados aqui)

3:2 e 16:9, estado final: ak mira 11 px, cobertura 0,95×, mãos 0,01 palma; akm mira 19 px,
cobertura 0,93×; m92 mira 17 px, cobertura 1,15×, mãos 0,00; revolver38 mira 9 px, pistola-ref
0,83×; shotgun mira 7 px com tombo −3°; lmg mira 135 px (ADS da lmg é conserto do próprio #636),
mãos 0,13.

## Portões (estado final, logs em `artifacts/fix-grips-r2/gates-final/`, não versionados)

Verdes: `eval:vm-pegada-k --mutantes`, `eval:vm-ads` (6 armas, 3:2 e 16:9) e os mutantes
`socket` e `sem-pose-ads`, `eval:vm-rig`, `eval:vm-cache` (+ `vm-cache-assets --mutantes` 10/10),
`eval:vm-launch`, `eval:vm-manga-oca`, `eval:vm-autorado-vivo --todas` (25/25), `eval:authored-vm`,
`eval:melee-vm`, `eval:vm-rifle-m92`, `eval:vm-rifle-akm`, `eval:vm-pistol-revolver`,
`eval:vm-shotgun-final`, `eval:vm-lmg-final`, lifecycles de revólver, shotgun e lmg,
`rifles-ak-verify`, `knife-k-verify`.
Vermelhos que já estavam: `eval:vm-frame` só pela akm (0,56×; percentil de vértice, a mesma
silhueta rasterizada mede 0,93× da AK no #636), lifecycles de m92/akm só por `ready:false` da
família AK (decisão do dono).

## Crítico cego (contexto limpo, só pixel; antes = junção dos três PRs)

| Arma | r1 | r2 | r3 | O que resta, nas palavras do crítico |
|---|---|---|---|---|
| ak | REPROVADA → REPROVADA (arma grande no tiro) | REPROVADA (ADS) | **RESSALVA** | pega em pé com o dorso para a câmera; luva achatada na recarga vazia 75% (igual antes); mão ainda no pente a 95% da vazia |
| akm | REPROVADA (lascas do guarda-mão nos dedos) | REPROVADA (mão do gatilho aberta na recarga) | **RESSALVA** | mão de apoio abaixo do guarda-mão a 95% da vazia; mão direita grande na recarga |
| m92 | REPROVADA (gigante) | **RESSALVA** | REPROVADA (frame da AK: traseira à vista) | confirmação no frame final: REPROVADA, "arma gigante, ~145% da AK" |
| revolver38 | REPROVADA (recarga "tira no ar") | REPROVADA (ADS menor) | REPROVADA | recarga sem estojo (clipe); arma pequena no ADS contra a pistola |
| shotgun | REPROVADA | REPROVADA | REPROVADA | braço de apoio esticado até a frente (a KSG tem o punho da bomba a ~10 cm da boca); nenhuma diferença visível desta frente |
| lmg | REPROVADA, sem mudança | REPROVADA, sem mudança | revertida | ADS e luva coberta pela manga do runtime |
| knife | REPROVADA (funil no Inspect) | REPROVADA, mão mais longe = pior | revertida | funil da luva direita no Inspect |

## O que não foi resolvido e por quê

- **Tamanho da M92.** O frame final cumpre o `eval:vm-frame` (0,954/0,909) e as réguas de imagem,
  mas o crítico lê a M92 maior que a AK. No frame da AK (mesma pega, mesmas mãos) ela fica 0,77× no
  vm-frame e 1,11× por metro em pixel (vm-gauntlet: 655 px contra 592 px pedidos), e o crítico
  reprovou a traseira à vista. É decisão do dono: régua por metro ou "do tamanho da AK".
- **Revólver:** recarga sem estojo e inspeção quase parada são do clipe, fora da pegada.
- **Shotgun:** a leitura "braço esticado até a boca" vem da KSG (punho da bomba na frente) com o
  frame do #633; a pegada em si não tem mais falange enterrada.
- **LMG:** a luva de apoio fica atrás da manga estendida em runtime (`vmsleeve.js`, #632) e o ADS
  é do #636; nada disto é pose.
- **Faca:** o funil do Inspect é pele/peso do produto Blender (`knife-k-build.py`, #631).
- **Mão de apoio a 95% da recarga vazia (AK/AKM):** a IK desvanece quando a mão sai do guarda-mão
  e o clipe do pacote M4 termina a recarga no pente.
