# asset-review — fauna do córrego (BUG-57, frente B, 18/08/2026)

Crítico: agente B em modo adversarial, julgando MEDIDA e arquivo, não a intenção
do builder. Limitação declarada: este modelo não lê imagem — o "olhar" do portão 4
foi substituído por raster software (tools/render-fauna-soft.mjs, mesmas câmera/luz
do faunaview) + leitura direta de textura/malha. Render de browser no jogo segue
pendente para o integrador (ver "o que NÃO foi verificado").

Entrada: ficha `plans/21-FAUNA-CORREGO.md` · assets `public/models/ambient/
{jacare,capivara}_corrego.glb` · evidência `tools/eval/asset-evidence/fauna/
*-close.png` e `*-dist12.png` (1536×1024, o frame 3:2 do dono) + `*-meta.json` ·
referências `references/fauna-corrego/`.

## Jacaré `jacare_corrego.glb` — APROVADO com ressalva de escala

| Item | Medida | Veredito |
|---|---|---|
| Parece caiman (ficha) | textura: verde 54,9% · amarelo 17,2% (papo) · marrom 28%; silhueta bbox 3,9:1 (comp:alt) — caiman chunky, não crocodilo de focinho estreito (ponta do focinho 0,246 m ≈ metade da largura do corpo) | ✓ |
| Papo amarelo | amarelo presente na TEXTURA crua (17,2%); no render sombreado cai a ~4,5% da silhueta — visível, não dominante | ✓ |
| Verde-oliva | lum média 131 (dog_caramelo: materiais lum 86-165 — dentro da faixa) | ✓ |
| Brasil/sátira | jacaré estático no meio do córrego canalizado — a manchete urbana BR | ✓ |
| Vetos | sem pessoa real, sem copyright (Mint original), sem gore | ✓ |
| Legibilidade a 12 m | silhueta 85×31 px no frame 1536×1024 (meta.json dist12); contraste vs água do canal lum ~19-40 → delta ~112: o jacaré é o elemento MAIS claro do canal, não some | ✓ |
| Engine | 4.856 tris (dog: 1.950; teto da ficha 5k) · 237 KiB (dog: 497 KiB) · Khronos 0 erros · WebP 256² como os demais ambient | ✓ |
| Ressalva | bbox altura/comprimento 25,6% (caiman real ~15-17%) — mais gordo que o real; CONSISTENTE com o estilo chunky do dog, não reprovado | — |

## Capivara `capivara_corrego.glb` — APROVADO com ressalva de escala

| Item | Medida | Veredito |
|---|---|---|
| Parece capivara (ficha) | bbox 0,4×0,576×0,998 m — corpo barril (comp:alt 1,73:1 vs real 2:1, cartoon próximo); cabeça alta na frente (extremo +Z: estreito 0,154 m e yMédio alto) = silhueta de capivara e não de javali | ✓ |
| Marrom-avermelhado | textura crua 99,6% marrom; PÓS-PIPELINE brighten 1.45: lum 105, rgb 154,92,73 — caiu na faixa do dog (o Mint entregou lum 69, blob escuro; REPROVADO na primeira medição e corrigido no pipeline) | ✓ |
| Brasil/meme | capivara na margem alagada — leitura instantânea | ✓ |
| Vetos | ok | ✓ |
| Legibilidade a 12 m | silhueta 49×59 px (meta.json dist12) com marrom quente contra concreto cinza do talude | ✓ |
| Engine | 5.005 tris · 219 KiB · Khronos 0 erros · WebP 256² | ✓ |
| Ressalva | altura total do bbox em scale 1,05 = 0,61 m (real 0,6) — ficha pedia cernelha ~0,5; recomendo integrar com **scale 1,0** (comp 1,0 m, altura 0,58) e deixá-la em margem rasa | — |

## O que eu conferi de verdade (lista curta e honesta)

1. Texturas decodificadas pixel a pixel (hue histogram + luminância) — não screenshot.
2. Bounds e contagem de triângulos lidos do GLB (gltf-transform), não do site do Mint.
3. Silhueta em px medida no raster software 1536×1024 a 3,2 m e 12 m.
4. Contraste jacaré vs água REAL do mapa (tex_agua_poluida × tint 0x42543b do
   `map_corrego.js:138`).
5. Validador Khronos (0 erros), SHA-256 conferido contra `mint-assets.json`.
6. Vetos: conferidos contra o prompt registrado (mint-assets.json) e a ficha.

## O que NÃO foi verificado (para o integrador/dono)

1. Render no navegador com o GLTFLoader real do jogo (browser lock estava com
   outra frente do swarm). O raster software usa a mesma matemática, mas não é o
   pipeline three.js de verdade.
2. Aparência IN-GAME no corrego (luz fog/aerial do mapa,posição na água) —
   captura 3:2 no mapa é o fechamento do portão 4, tarefa da integração.
3. Gusto humano: o dono revisa por screenshot — nada aqui substitui o olho dele.
