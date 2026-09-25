# Receita de integração — fauna do córrego (BUG-57, para a frente de integração)

Assets prontos e revisados (frente B, 18/08). Esta frente NÃO toca em
`ambientlife.js`/`map_corrego.js` — abaixo está o padrão a seguir.

## Arquivos

- `public/models/ambient/jacare_corrego.glb` — 4.856 tris, 237 KiB, estático.
  Bounds no GLB: 0,998 (X) × 0,256 (Y) × 0,650 (Z) m. Focinho aponta **+Z**
  (extremo +Z estreito; conferido por fatia de vértices).
- `public/models/ambient/capivara_corrego.glb` — 5.005 tris, 219 KiB, estático.
  Bounds: 0,400 (X) × 0,576 (Y) × 0,998 (Z) m. Cabeça aponta **+Z**.
- Mesa de bar: **reuso** — `public/models/props/mesa_guardasol.glb` já está
  declarado no córrego (`map_corrego.js:78`, lista PROPS) e é o padrão usado em
  lajes/escadão/posto/mansão/quebrada/piscinão. Não gerar mesa nova.

## Escala de mundo (alvo da ficha plans/21-FAUNA-CORREGO.md)

- Jacaré: `scale 1.8` → ~1,80 m de comprimento, ~0,46 m de altura. O canal tem
  6 m de largura — o jacaré ocupa ~30% da largura: mantê-lo FORA da rota de
  travessia das pontes (spec: não bloqueia tiro/movimento, `nonCollider`).
- Capivara: `scale 1.0` → 1,0 m comp × 0,58 m altura total (cernelha ~0,5).
  Margem alagada (z ∈ [-40,-34]/[34,40] alagados — ver `map_corrego.js`).

## Padrão de consumo (igual ao dog_caramelo)

1. `ambientlife.js`: acrescentar ao `ASSETS` (ex.: `alligator:
   'models/ambient/jacare_corrego.glb'`, `capybara: idem capivara`). O
   `preloadAmbientLife` já zera metalness e levanta roughness — os Mint vêm com
   1 material só, funciona direto.
2. `normalizeModel`: os dois são estáticos (não skinned) — o caminho
   `template.scene.clone(true)` do `cloneAsset` já cobre. Usar a dimensão de
   comprimento (eixo Z do GLB, ~0,998 m) como `dimension` para o scale-alvo:
   `target/alligator = 1.8` (comprimento), `target/capybara = 1.0`.
3. Animação: NÃO HÁ clipes — o Mint só anima humanoids (tentativa falhou limpo).
   Consumir como estático (sem mixer) ou com o bump procedural de "flutuar na
   água" que o mapa já faz nos outros objetos (o jacaré pode afundar 80% e só
   mostrar dorso/olhos — é a leitura clássica de jacaré no córrego).
4. Orientação: ambos apontam +Z — mesma convenção de `rotation.y = atan2(dx,dz)`
   já usada nos animais do controlador.
5. `userData.nonCollider = true` e `nonSolidSurface` nos meshes (padrão fauna,
   AR3 do `eval:ambience-registry` — fauna fora de sólido).

## Fechamento dos portões que ficam para a integração

- Portão 4 in-game: captura 3:2 (1536×1024) no fy_corrego com o jogo rodando —
  `public/faunaview.html?src=models/ambient/jacare_corrego.glb&dist=12` +
  `sh tools/eval/with-browser-lock.sh node tools/capture-fauna-evidence.mjs …`
  (exige `npm run eval:serve`) OU captura direta do mapa. As figuras desta
  frente (raster software, luz calibrada) estão em
  `tools/eval/asset-evidence/fauna/*-{close,dist12}.png` com `-meta.json`.
- Portão 6: estender o `eval:ambience`/`ambience-registry` para exigir jacaré no
  fy_corrego (fauna por bioma é cláusula aberta do BUG-57), com mutante
  `sem-jacare` — a régua morde na ausência, não na presença.
