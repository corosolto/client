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
# Props Mint integrados no Escadão

Arquivos preservados da branch `codex/escadao-visual` (072e6d71), com origem e
processamento completos em `mint-assets.json`. Somente estes sete GLBs foram
acrescentados ao acervo da main nesta integração.

- `varal_roupas_01.glb` — [Colorful Laundry Varal (varal de corda)](https://mint.gg/chat/ph7cqm9tnn58h1sxznpq26wgax8cr51p). SHA256: `3ea3085f1c0f0729b0563b3a9c6e9330a39c4a7da720592d931ef1681edb1a52`.
- `varal_roupas_02.glb` — [Colorful Laundry Varal (varal de chão)](https://mint.gg/chat/ph79avg70bbmppdah59xczz0m58cr0dg). SHA256: `389993f574d3dcfabca27109268ce50a47438c72618f6b0c057a647ceaf89969`.
- `samambaia.glb` — [Emerald Feather Clump (samambaia)](https://mint.gg/chat/ph738vqqdc08zxxy7912d24w1n8cteh0). SHA256: `d5fdc03244bbb0acf4599ea6358b8083a1b6a1f91ce7f9a531c9413ec6052e1c`.
- `casa_favela_azul.glb` — [Casa de favela azul](https://mint.gg/chat/ph75rmydefr3btvm85a61hra6h8d74qq). SHA256: `c311fd2a66e7aeeb8c218cfd74b4a8e0dcb79130f62766451eb4b2b5ffc4ae92`.
- `casa_favela_tijolo.glb` — [Casa de favela tijolo](https://mint.gg/chat/ph75rmydefr3btvm85a61hra6h8d74qq). SHA256: `c6d26492a9d5a5b2a0676169de4f43ad5e67ac83bafda8ba6f7e0e9171e15016`.
- `varal_roupas.glb` — [Varal de roupas](https://mint.gg/chat/ph75rmydefr3btvm85a61hra6h8d74qq). SHA256: `0cd259177b239c7198b8158195c82a493480c69846f210981faeb87eac2c89bf`.
- `escadao_casa_r3.glb` — [01-escadao-casa-residencial-r3.glb](https://mint.gg/chat/ph76fdb7fh3t30vzjz8ajv01xs8dx139). SHA256: `9bceba38acb38726b1df871b4a22697d5cb988f10e6cde13a972bdbf4eeb3a4b`.

A casa R3 foi gerada em 06/09/2026; licença e seleção documentadas em
`docs/reports/ESCADAO-MINT-R3.md`. Os outros seis modelos reutilizam o acervo Mint
anterior, sem alteração dos bytes ou da proveniência. O mato novo rejeitado não
foi incluído. Demais props usados pelo mapa já existiam na main.

## R4 — gato e detalhes domésticos

Gerados em 06/09/2026 no [projeto Mint do Escadão](https://mint.gg/chat/ph71esgt6wvxqr9ywswh7nr8f58dxycs), pack `th71b3y03ksncsfj8wzt08w5hh8dxjpk`, run `vd7cw36hdpbv3zxwkt19km2d6h8dwz6j`, TRIPO_P1 Standard. Termos e hashes das fontes/finais em `mint-assets.json`; mesma seção 4 dos termos documentados na R3. Nenhuma foto de referência foi incorporada à textura.

- `escadao_cat_r4.glb`: 4.723 triângulos, PBR WebP 1024, rig autoral de 19 ossos com idle/walk/run. Caminhada 0,55 m/s e fuga 1,5 m/s, altura de referência 0,48 m. Substituição restrita ao Escadão.
- `escadao_varanda_r4.glb`: 4.453 triângulos, cadeira plástica, pano e dois vasos; geometria original preservada.
- `escadao_eletrica_r4.glb`: 3.470 triângulos, caixa de medição e conduítes; simplificação limitada por erro geométrico.

Pipeline reproduzível em `tools/optimize-escadao-r4.mjs` e `tools/rig-escadao-cat-r4.py`; inspeção do GLB reimportado em `tools/inspect-escadao-cat-r4.py`. Recibos e renders privados em `artifacts/escadao-visual/r4/assets/`.

## Recuperação seletiva dos PRs #440 e #441 (07/09/2026)

Bytes históricos, sem regeneração. Manifesto de origem: `docs/maps/POLISH-RECOVERY-ASSETS.json`.

- `parque_coreto.glb` — "Festive Green Coreto", coreto octogonal de praça com
- `roda_gigante_roda.glb` — parte ROTATIVA do split (aro duplo + raios +
- `roda_gigante_base.glb` — parte ESTÁTICA do split (pernas A, pés, plataforma,
- `carrossel.glb` — "Carousel", carrossel com cavalos e cobertura. 4.419 tris,
- `barraca_quermesse.glb` — "Quermesse Tent", barraca de quermesse. 4.419
- `predio_artdeco.glb` — "Art Deco Building", prédio de entorno. 4.297 tris,
  (substituída pela `torre_vigilancia.glb`) e segue no acervo. A torre
- `torre_vigilancia.glb` — "Prison Guard Tower", torre de vigilância de
- `bloco_celas.glb` — "Bloco de celas", pavilhão de 2 pavimentos com galeria
- `portao_penitenciaria.glb` — "Portão de penitenciária", portão principal
- `guarita_muro.glb` — "Guarita de muro", cabine envidraçada sobre estrutura
