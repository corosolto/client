# Fonte histórica preservada

Extraído de `public/models/props/FONTE.md` no commit `73cf81c8b7b7909e96dd9d5f2b9c40342ca4bf22`. Evidência de origem, sem nova aprovação visual.

## v2.1 — lote 4: jardim tropical da mansão (frente C, BUG-64)

Pedido do dono (20/08/2026): *"o pior de todos é a mansão do joá, o jardim está
horrível"*. O jardim era 100% primitiva de cor chapada (pirulitos de icosaedro,
maciços de esfera achatada). Oito espécies tropicais do jardim modernista
(referência Burle Marx / Joá), mesmo Mint text-to-3D, licença e pipeline dos
lotes 1-3 (`node tools/optimize-props-v21.mjs`, WebP 512², a partir dos brutos
`references/glb/*_mint.glb` não versionados). GLB normalizado ~1 m, pivô
central — escala no call-site do `map_mansao.js` (tabela JARDIM_VEG).

- `palmeira_imperial.glb` — "Imperial Grey Palm", palmeira-imperial com tronco
  anelado cinza e crownshaft verde. 3.637 tris. Tronco escurecido no pipeline
  (`trunkShade` do optimize: material-clone fator 0,55/0,47/0,40 nos triângulos
  dos 42% inferiores — o tronco branco-liso foi reprovado pelo crítico v2.1).
  Chat: <https://mint.gg/chat/ph70gyyyc7qvvem3mm8t0a29y98cv0tw>. Registro:
  `palmeira-imperial-jardim`.
- `palmeira_ravenala.glb` — "Dramatic Fan Palm", ravenala (palmeira-leque) em
  leque vertical. 4.428 tris. Chat:
  <https://mint.gg/chat/ph7by8184sbqmx1ev8j068pvm58ctqm0>. Registro:
  `palmeira-ravenala-jardim`.
- `heliconia.glb` — "Red Claw Heliconia", brácteas vermelho-amarelas pendentes.
  4.052 tris. Chat: <https://mint.gg/chat/ph7cp8y6gyxt9gg461m4rcg8th8ctwfd>.
  Registro: `heliconia-jardim`.
- `costela_adao.glb` — "Perforated Monstera Bush", monstera de folhas
  fenestradas. 3.472 tris. Chat:
  <https://mint.gg/chat/ph7byt97jw52ykdjrzezvwhsvn8cvsje>. Registro:
  `costela-adao-jardim`.
- `bananeira.glb` — "Drooping Paddle Banana Plant", pseudocaule verde com
  folhas-pá. 4.684 tris. Chat:
  <https://mint.gg/chat/ph71fmfkb7fb4433vac33xghd58cttan>. Registro:
  `bananeira-jardim`.
- `ixora.glb` — "Crimson Ixora Bloom", arbusto com buquês vermelho-alaranjados.
  4.496 tris. Chat: <https://mint.gg/chat/ph7dcr7emj3jkafn0yq98gantx8cvtvs>.
  Registro: `ixora-jardim`.
- `agave.glb` — "Blue-Green Agave Rosette", roseta azul-esverdeada. 4.688 tris.
  Chat: <https://mint.gg/chat/ph777k51x3zm7rh2p92m2yferh8cv41j>. Registro:
  `agave-jardim`.
- `samambaia.glb` — "Emerald Feather Clump", touceira densa de samambaia.
  3.757 tris. Chat: <https://mint.gg/chat/ph738vqqdc08zxxy7912d24w1n8cteh0>.
  Registro: `samambaia-jardim`.
