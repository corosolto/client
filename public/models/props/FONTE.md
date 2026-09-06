# Props da Amazônia

## Ronda 2 do amazonia (PR #439) — palafita de verdade e mata densa

Kit de revisão r2 (26/08/2026): o dono pediu palafita com travessia na madeira
e horizonte de floresta. Mint text-to-3D (Meshy), projeto CS BRASIL - Time
Mítico, prompt próprio — sem copyright de terceiro. Pipeline `gen-asset`
(dedup + WebP 1024 + prune). Kit: pack `th74btzfmyqgvrwzv97c3svtad8d7shz`,
chat <https://mint.gg/chat/ph7ajexkae9z6baym58jt1ekf18d73ye>.

- `palafita_pro.glb` — "Palafita com passarela", casa sobre estacas com
  passarela e escada (~2,0k tris). Registro: `palafita-pro-amazonia`. Colisor,
  escada andável e corrimões são dados do `map_amazonia.js` (AMZ5).
- `arvore_mata.glb` — "Árvore de mata densa", dossel do anel do perímetro
  (~2,6k tris, 25 instâncias). Registro: `arvore-mata-amazonia` (AMZ6).
- `palmeira_babacu.glb` — "Palmeira babaçu", sub-bosque (~2,3k tris).
  Registro: `palmeira-babacu-amazonia`.


### Derivação local Amazônia visual — 2026-09-06

Sem substituir os GLBs ou criar procedência nova: `map_amazonia.js` clona a
geometria da árvore para ajustar a seção inferior ao colisor proporcional,
preserva UV/material e aplica o mesmo ajuste com e sem instancing. Estende
estacas das nove palafitas herdadas para acompanhar o deck elevado. Duas casas
procedurais de madeira/chapa usam texturas existentes. Os registros Mint acima
continuam sendo a origem. Medição atual por índices: árvore 4.334 tri/399.168 bytes,
palmeira 4.694 tri/529.844 bytes, palafita 3.522 tri/440.420 bytes; substitui apenas
as estimativas aproximadas anteriores. Referências e limites:
`docs/reports/AMAZONIA-REFERENCIAS.md`.

### Feedback de navegação e ambiência — 06/09/2026

Derivados exclusivos da Amazônia, sob a mesma procedência/licença dos originais
Mint acima. Pipeline reproduzível `tools/amazonia-assets.mjs`; hashes e ligações
`derivedFrom` no `mint-assets.json`. Os três originais permanecem intactos.

- `palafita_pro_amazonia.glb`: 3.522 → 3.048 triângulos. Retira a escada embutida
  estreita; builder fornece lance lateral com degraus, piso e colisão até a varanda.
- `arvore_mata_amazonia.glb`: 4.334 → 3.324 triângulos; simplificação Meshopt.
- `palmeira_babacu_amazonia.glb`: 4.694 → 2.830 triângulos; simplificação Meshopt.
- `canoa_rabeta_amazonia.glb`: Teal Stripe Riverboat, Mint / Tripo P1, prompt próprio
  autorizado em06/09. [Chat](https://mint.gg/project/zd7cbsyxbzmf05b3w084t51ymd8c5hfr?chat=ph741qaase7ng7c5gbq3348t658dwt3n).
  Licença de uso da conta Mint, sem referência de terceiro. Original4.819tris,
  derivado3.758tris/360.236bytes: `tools/amazonia-boat-asset.mjs`, Meshopt .78/.004
  e três mapas WebP1024. Casco+motor estáticos; navegação pertence ao builder.

`arara_voo.glb` foi reutilizada sem modificar bytes da main69555790; procedência
no FONTE de ambient. As aves usam o módulo skylife idêntico àquela main.

## Galinha e pintinho Mint — preview da Amazônia, 06/09/2026

`galinha_mint_amazonia.glb` e `pintinho_mint_amazonia.glb`: Adult Hen / Baby Chick
no pack Caatinga Village Animals, conta do usuário, prompt original e Tripo P1.
Chat: https://mint.gg/project/zd7d9mfmgv0b80ezp3xbykp1ns8dw47r?chat=ph7b9m9y8gfz5j83vkxqsrbvzs8dxgba
Uso local explicitamente solicitado pelo dono. Originais arquivados em
`artifacts/amazonia-visual/fauna-round2/{hen,chick}-mint.glb`; URLs/hashes no
`mint-assets.json`. Derivação reprodutível: `tools/amazonia-yard-assets.mjs`.
Galinha: 5.078→4.062 triângulos, 370.588 bytes, WebP até1024. Pintinho:
4.910→3.616 triângulos, 198.532 bytes, WebP até512. Malhas estáticas sem rig;
não representam animações humanoides adaptadas. Originais preservados.
Apenas procedência, não concessão de licença: a URL oficial de termos/atribuição
não foi confirmada. Publicação comercial permanece pendente; não declarar CC0.

### Palafita aberta da Amazônia — 06/09/2026

`palafita_aberta_amazonia.glb` deriva localmente de `palafita_pro_amazonia.glb`.
Ferramenta: `tools/amazonia-cabin-asset.mjs`. Remove volume fechado e eleva beiral,
preservando bounds, cume e postes. Piso/porta/janelas e colisores correspondentes
são construídos por `public/js/amazonia_cabins.js`. Sem nova geração ou licença.
Final: 2167 triângulos, 352964 bytes, SHA256
`2d5724305e9dd7e42689692f14cec6fff4a8f84ec8e5b8948825129d276dc954`.
Origem SHA256 `0acc6dd66fd3e4f25281c124f6b87a96fcd5a7e61c43d4bc21cf473e15b65594`.
Khronos: zero erros, um aviso de tangent space. Recibo local em
`artifacts/amazonia-visual/cabin-round/asset.json`. Originais preservados.
