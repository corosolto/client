<!-- Recibo da rodada de conserto de 13/09/2026. Índice: ../RODADA-CONSERTO.md -->

{
  "aplicado": [
    {
      "frente": "MAP1",
      "onde": "public/js/map_mansao.js:909-914",
      "o_que": "O ÚNICO ponto era (4,5; 34,5), pen 0,90 m. CAUSA NOMEADA: o MOTOR do portão de correr — `addBox(.5,.9,.35, …, 4.62, 0, 34.55, { collide:false })`, antes na linha 705 do arquivo no HEAD. Caixa de aço VISÍVEL de 0,90 m de altura, sem colisor, plantada na calçada de fora do portão; o colisor do portão é `col(-4,4,…)` e só cobre 8 m dos 44 m de largura, então a faixa z∈[34,15; 35,75] é andável contornando o portão por x>4,5 e o corpo entrava dentro do motor. Sonda: raycast do peito (1,40 m) até o chão local, idêntica a map-check.mjs:449-462 — a caixa devolvida pelo raio foi o próprio motor (bbox 4,37..4,87 × 0..0,90 × 34,38..34,72). CONSERTO NA CAUSA: motor e os 2 mourões (alvenaria de 2,6 m, também `collide:false` e também para fora do colisor 8×3, escapando da amostra de 1 m só por sorte) passaram a ter colisor de verdade. A sonda não foi tocada."
    },
    {
      "frente": "SUP1/SUP2",
      "onde": "public/js/map_mansao.js:50-245 (paleta) e ~90 sítios no corpo",
      "o_que": "Paleta de 12 DataTexture locais (estuque, laje, forro, areia, pedra, azulejo, folha, tecido, metal, liso, tábua clara, + concreto/ripado/aço que já existiam), todas com anisotropia 8 (4 em LOWQ). A cor de cada peça é a cor antiga DIVIDIDA pela MÉDIA DA TEXTURA EM LINEAR, calculada no build (`mediaLin`/`corSobreTex`) em vez de à mão como no map_campomorro.js:103-140 — inclusive a cor POR INSTÂNCIA do InstancedMesh. Material compartilhado por (textura, cor) via `matPor`: a folha dentro do laço criava 1 material por iteração (486 dos 508). Piso/forro/leito/cuba usam `matPiso`, que tira o `repeat` do tamanho do mundo (UV 0→1 num plano de 30 m dava 1,5 px/m)."
    },
    {
      "frente": "Draw calls",
      "onde": "public/js/map_mansao.js:214-244 (loteBox/lotePeca/loteLocal) + sítios",
      "o_que": "InstBatch do mapprops.js em 3 lotes com semântica distinta: IB_BALA entra em `occluders` na mesma varredura do PropBatch (ripa, brise, montante, corrimão, mureta, base de vaso — param bala como paravam soltos), IB_LEVE e IB_FOLHA entram DEPOIS da varredura (degrau e folhagem nunca pararam bala), e toda malha do IB_FOLHA recebe `nonSolidSurface` para não virar chão na sonda do MAP1. O lote é POR TAMANHO porque a UV em metros e a banda de AO são assadas na geometria (vao.js aoBoxGeo) — colisor, saia de contato e sombra idênticos. Maciço denso e bromélia usam InstancedMesh FILHA do próprio grupo (`loteLocal`), porque o mansao-water-check conta malhas por grupo e o garden-check mede o Box3 do grupo."
    }
  ],
  "medido_antes_depois": {
    "instrumento": "sonda própria em /tmp/mansao-probe.mjs sobre tools/eval/harness.mjs (cópia da lógica de map-check.mjs:441-479 + mapa-novo-gate.mjs:352-406 + texel-check.mjs); map-check.mjs NÃO foi executado por mim",
    "MAP1": "1 ponto dentro / pior 0,90 m → 0 ponto / 0,00 m. CONFIRMADO pelo artefato oficial: o map_check.json regerado às 12:28 traz fy_mansao dentro 0, pior 0 (e MAPCHECK dentro total 0)",
    "SUP1": "95,7% (486/508 materiais sem map) → 10,9% (13/119). Teto 40%. Confirmado pelo próprio mapa-novo-gate: coluna mats✗ 10.9% e ✓ SUP1:fy_mansao em QUITADAS. Os 13 restantes são de arquivo alheio: contactSkirt (vao.js), 3 lâminas d'água (water.js) e os bichos do ambientlife.js",
    "SUP2": "62,64% (15.238 m² sem textura) → 0,57% (135 m²). Teto 6%. Confirmado no gate: área✗ 0.6% e ✓ SUP2:fy_mansao. O leito do oceano sozinho era 8.900 m² (58% do total)",
    "malhas": "984 → 508 (−476, −48%); InstancedMesh 2 → 49, instâncias 56 → 579. A/B exato contra `git show HEAD:` do próprio arquivo",
    "invariantes_preservadas": "colisores 178 → 181 (+3 = os 2 mourões + o motor, nada mais); waypoints 411 → 411 (grafo do A* idêntico); occMedidos do MAP4 323 → 334 com occPulados 0 e occluderSemMalha 0; MAP6 bordas 0 → 0; piorArea do respawn 45,3 → 44,8 m² (teto 40); piorFolga 0,8 inalterada",
    "albedo": "A/B de albedo efetivo (cor × média da textura, por peça casada em posição+tamanho): 962 peças casadas, 18 com desvio > 0,02, maior desvio 0,053 em peça de 2,8 m² (faixa do heliponto). O piso da casa (690 m²) foi calibrado em 0xb3a997 para casar o albedo MEDIDO do estado anterior",
    "texel": "não é régua da minha lista, mas melhorou: TEXEL2 10,6% → 4% da área abaixo de 64 px/m (VERDE agora), dispersão p95/mediana 4,00× → 1,63×, p05 1,49 → 103 px/m, aniso✗ 0. TEXEL3/TEXEL3b seguem vermelhas como já estavam, com o MESMO culpado de antes (PlaneGeometry a 563,6 px/m, 4,4× — número idêntico ao de antes da minha mudança)"
  },
  "saldo_de_malhas": {
    "total_node": "984 → 508 (−476)",
    "sobrevive_no_browser_com_GLB": "−276: ripas do forro 62→1, montantes dos panos 20→2, brises 28→2, degraus 52→1, corrimãos 52→3, muretas 4→1, vasos do deck 74→11, forração 6→1 (298 malhas → 22 lotes). Esses sítios existem com ou sem GLB",
    "so_no_fallback": "−200 (copa, palmeira, bananeira, bromélia, maciço, folhagem): só aparecem em `?glb=0`/node, porque no browser o PropBatch substitui por GLB",
    "nao_feito_de_proposito": "maciço denso do jardim continua com 30 malhas soltas por grupo — o mansao-water-check exige ≥20 malhas visíveis por `garden-mass`; instanciar ali trocaria imagem por número. Biombo (mourões/travessas), beirais, pedras do caminho e partes do portão também ficaram soltos porque as réguas G6/G7/G8/G2.a contam OBJETOS marcados"
  },
  "reguas": {
    "eval:mansao-water": "exit 0 — MANSÃO-CONTRATO OK: piscina entrável com saída, espelho seguro e composição autorada presente.",
    "eval:mansao-garden": "exit 0 — MANSÃO-JARDIM OK: variedade, composição e escala presentes. (G5 hardscape: 8 peças, chapadas 0)",
    "eval:mansao-ocean": "exit 0 — OCEANO ok · água viva do Joá: depth-fade + espuma + onda + sol do LOOK",
    "eval:look": "exit 0 — LOOK ok · 4/4 mapas com fog == horizonte; fy_mansao fog=#b1aca5 horizonte=#b1aca5 ΔE76=0.0 ≤ 8 (não toquei em névoa nem céu)",
    "node --check": "OK"
  },
  "nao_aplicado_e_por_que": [
    "Remoção das entradas `SUP1:fy_mansao` e `SUP2:fy_mansao` do DIVIDA em tools/eval/mapa-novo-gate.mjs:203,213 — arquivo compartilhado. O portão já imprime `QUITADAS (2) — REMOVA a entrada de DIVIDA`. Patch exato enviado ao Main pelo hub.",
    "TEXEL3/TEXEL3b do fy_mansao: o culpado (PlaneGeometry a 563,6 px/m) é anterior à minha mudança e o número voltou ao valor original (4,4×) depois que baixei a grade do carro para o canvas de 64. Mexer nele não estava no pedido e é ajuste de outra peça.",
    "occluder-ray-check e a contagem de draw call em GPU: exigem browser, proibido nesta rodada.",
    "`npm install --no-save @gltf-transform/core @gltf-transform/extensions` foi preciso para rodar as réguas do mansão (o node_modules desta árvore só tinha `three`). package.json e package-lock.json NÃO foram tocados (mtime do lock segue 09/09); as 44 outras mudanças na árvore são de terceiros."
  ],
  "o_que_exige_figura": [
    "A cara da paleta nova em GPU: as 12 texturas são DataTexture procedural e o A/B que fiz é de ALBEDO MÉDIO (≤0,053 de desvio em peça de ≤2,8 m²), não de imagem. Junta de 1 m no piso da casa, pastilha de 10 cm na cuba, veio da tábua clara e nervura da folha precisam de captura 3:2 para julgamento de desenho.",
    "O número de draw call de verdade: o 2.038 do #589 foi medido no browser; em node eu meço malha. O saldo de −276 malhas sempre-construídas é a previsão; a confirmação é o contador do renderer.",
    "Folhagem instanciada com cor por instância: a divisão pela média do mapa foi verificada numericamente (nenhum canal saturado sobrou fora dos casos intencionais de tinta branca), mas o tom das bromélias/flores em tela é julgamento de olho."
  ],
  "commit": "nenhum — trabalho deixado na árvore"
}
