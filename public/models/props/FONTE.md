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

- `escadao_cat_r4.glb`: 4.723 triângulos, PBR WebP 1024, rig autoral de 19 ossos com idle/walk/run. Caminhada 0,55 m/s e fuga 1,5 m/s, altura de referência 0,48 m. Usado no Escadão e em Lajes; mesma altura e cadência do rig, sem alterar o GLB.
- `escadao_varanda_r4.glb`: 4.453 triângulos, cadeira plástica, pano e dois vasos; geometria original preservada.
- `escadao_eletrica_r4.glb`: 3.470 triângulos, caixa de medição e conduítes; simplificação limitada por erro geométrico.

Pipeline reproduzível em `tools/optimize-escadao-r4.mjs` e `tools/rig-escadao-cat-r4.py`; inspeção do GLB reimportado em `tools/inspect-escadao-cat-r4.py`. Recibos e renders privados em `artifacts/escadao-visual/r4/assets/`.

## Atacadão da Treta — assets recuperados com proveniência

Esta lane recupera sete assets já produzidos e versionados em `origin/map2/atacadao`.
Nenhum serviço pago foi chamado nesta recuperação.

### Pack Mint `atacadao_r3`

Gerado no projeto do dono pelo Mint, pack `th7dnpa6tmkqv43k7s3458exmx8d79aq`,
chat <https://mint.gg/chat/ph7emw51xss7hs3n3war213h618d7ayv>, e otimizado para
WebP 1024 e aproximadamente 4–5 mil triângulos por molde. Licença de uso do
assinante Mint Pro; assets originais gerados por prompt, sem conteúdo de terceiros.

- `estante_pallets.glb`: 4.565 tris; registro `estante-pallets`; item
  `ks7d5h0jrqz526fsqjtmed8d8s8d6780`.
- `freezer.glb`: 4.486 tris; registro `freezer-atacadao`; item
  `ks7fwtjj0r7fy6fqce79scb0y18d6yja`.
- `ilha_caixas.glb`: 4.424 tris; registro `ilha-caixas`; item
  `ks77jm9rp5ek9an2s31q8608rx8d71a1`.

### Seções do mercado — lote Replicate de 27/08/2026

Este lote não é Mint. Foi gerado na conta Replicate do dono por
`tools/gen-asset.mjs --provider replicate`: `black-forest-labs/flux-schnell` para
imagem e `ndreca/hunyuan3d-2` para malha, seguido de dedup/prune e WebP 1024. Os
registros correspondentes em `mint-assets.json` declaram honestamente
`source.kind: replicate-gen` e `processing.provider: replicate`.

- `balcao_acougue.glb`: 12.000 tris; quatro instâncias de balcão de meia altura.
- `balcao_padaria.glb`: 12.000 tris; três ilhas de exposição.
- `ilha_hortifruti.glb`: 12.000 tris; quatro ilhas de hortifrúti.
- `geladeira_bebidas.glb`: 22.158 tris; quatro expositores verticais; é o molde
  mais pesado do lote e deve permanecer limitado a essas quatro instâncias.

Os moldes reprovados `balcao_peixaria`, `cancela_estacionamento` e `lava_rapido`
continuam ausentes; o mapa usa equivalentes procedurais para não promover malhas
achatadas ou com ocupação inadequada.

## r3 — kit `posto_obras_r3`, parte POSTO (frente map2/posto)

Pedido do dono (26/08/2026): *"os mapas do emerson acho que da pra fazer models
no mintgg e deixar mais realista, especialmente... posto da treta"*. Kit gerado
no Mint (projeto `zd7cbsyxbzmf05b3w084t51ymd8c5hfr`), pack
`th74q1agb8zfn1hnfbqmmrhd998d6fj6`, otimizado pelo próprio Mint (WebP 1024,
~4-5k tris) — sem passo local, por isso `processing.tools` traz só `mint.gg`.
Licença de uso do assinante Mint Pro (asset original gerado por prompt, sem
copyright de terceiros). Chat do kit:
<https://mint.gg/chat/ph70t6mnh0164gg0ej3dg6te4s8d6w0t>. Convenção do acervo
mantida: GLB normalizado ~1 m, pivô central, escala no call-site.

Os outros dois itens do mesmo kit (`andaime.glb`, `container_escritorio.glb`)
entram pela frente `map2/obras`, que é o PR irmão.

- `bombas_combustivel.glb` — "Bombas de combustível", ilha de duas bombas com
  visor, mangueira e coluna. 5.081 tris. Registro: `bombas-combustivel-posto`.
  Escala usada em `map_posto.js`: `targetH` 2,0 ⇒ 2,47 × 0,94 m sobre o meio-fio.
- `loja_conveniencia.glb` — "Loja de conveniência", corpo de loja de posto com
  vitrine e testeira. 4.369 tris. Registro: `loja-conveniencia-posto`. Escala
  usada: `targetH` 5,0 ⇒ 4,9 × 5,4 m, um corpo em cada ponta da fachada oeste.

## Recuperação seletiva dos PRs #440 e #441 (07/09/2026)

Bytes históricos, sem regeneração. Manifesto de origem: `docs/maps/POLISH-RECOVERY-ASSETS.json`.

- `parque_coreto.glb` — "Festive Green Coreto", coreto octogonal de praça com
  colunas de ferro branco, telhado de zinco verde e bandeirolas juninas. 4.742
  tris, 1 primitiva, texturas WebP 1024. Mint text-to-3D, gerado 25/08/2026 para
  o rebuild USANTOS do parque_treta (pedido do dono: mapas usantos "não podem
  parecer low poly"). Chat: <https://mint.gg/chat/ph74qprnsd4nzq113248a9sd6s8d4zhk>.
  Registro: `coreto-praca-parque`. Otimizado por `tools/optimize-props.mjs`
  (dedup + webp 1024 + prune, 1.107 KB → 448 KB). No mapa, substitui o coreto
  procedural quando carrega (fallback idêntico em colisores).
- `roda_gigante.glb` — "Ferris Wheel", roda-gigante completa (aro duplo, raios,
  14 gôndolas, pernas em A, plataforma). 3.913 tris. Mint text-to-3D, kit
  "parque" (26/08/2026, pack th783j3d4kq2saf84wyv3kfpkh8d6fmz). Chat:
  <https://mint.gg/chat/ph71fzmc1gjm6tvbve4b59x4td8d6gvn>. Registro:
  `roda-gigante-parque`. Modelo-fonte do split abaixo; o mapa não o carrega.
- `roda_gigante_roda.glb` — parte ROTATIVA do split (aro duplo + raios +
  gôndolas). 2.871 tris. Split por componentes conexos em Blender headless
  (`tools/blender-split-roda-gigante.py`), verificado por render (composite
  idêntico ao original). Registro: `roda-gigante-roda-parque`. No mapa, filha
  do grupo `roda-gigante` — gira com a rotação procedural do update.
- `roda_gigante_base.glb` — parte ESTÁTICA do split (pernas A, pés, plataforma,
  cabine do operador). 1.042 tris, mesma origem e script. Registro:
  `roda-gigante-base-parque`. Pés em y=0, mesma escala da parte rotativa.
- `carrossel.glb` — "Carousel", carrossel com cavalos e cobertura. 4.419 tris,
  mesmo kit/chat. Registro: `carrossel-parque`. Filho do grupo
  `carrossel-giratorio` (gira junto); substitui plataforma/cavalos/teto
  procedurais no browser.
- `predio_artdeco.glb` — "Art Deco Building", prédio de entorno. 4.297 tris,
  mesmo kit/chat. Registro: `predio-artdeco-entorno-parque`. 8 instâncias fora
  dos bounds jogáveis fechando o quarteirão, rotações/alturas variadas.
- `barraca_quermesse.glb` — "Quermesse Tent", barraca de quermesse. 4.419
  tris, mesmo kit/chat. Registro: `barraca-quermesse-parque`. Substitui os 4
  quiosques-caixa (PIPOCA/ALGODÃO DOCE/PESCARIA/ARGOLA); placas signTexture e
  colisores procedurais mantidos.

- `penitenciaria_guarita.glb` — "Weathered Searchlight Guarita", torre de
  vigilância de presídio com escada metálica, cabine octogonal envidraçada,
  telhado de zinco e holofote no canto da cabine. 4.749 tris, 1 primitiva,
  texturas WebP 1024. Mint text-to-3D, gerado 25/08/2026 para o rebuild USANTOS
  da penitenciaria. Chat: <https://mint.gg/chat/ph7dbfdzwpfa6mzdh15wx5tprx8d4c3v>.
  Registro: `guarita-vigilancia-penitenciaria`. Otimizado por
  `tools/optimize-props.mjs` (1.110 KB → 431 KB). Saiu de cena na USANTOS-R2
  (substituída pela `torre_vigilancia.glb`) e segue no acervo. A torre
  procedural fica de fallback (colisores idênticos) e o SpotLight que
  varre o pátio (NV2) é sempre procedural — o GLB é só visual.
- `torre_vigilancia.glb` — "Prison Guard Tower", torre de vigilância de
  presídio com quatro pernas de concreto em treliça X, escada metálica,
  varanda com guarda-corpo e cabine envidraçada com telhado. 4.535 tris,
  1 primitiva. Mint text-to-3D, gerado 26/08/2026 para a frente USANTOS-R2
  (kit penitenciaria_gelo). Chat:
  <https://mint.gg/chat/ph73cszyryt8jreekq64vj4s1x8d66ef>. Registro:
  `torre-vigilancia-penitenciaria`. Substitui o visual da
  `penitenciaria_guarita.glb` nas 4 guaritas de canto do muro; o fallback
  procedural e os colisores são os mesmos nos dois mundos.
- `bloco_celas.glb` — "Bloco de celas", pavilhão de 2 pavimentos com galeria
  e grades. 3.988 tris, texturas WebP 1024. Mint text-to-3D, gerado 26/08/2026 —
  item do pack carandiru_r3b. Chat:
  <https://mint.gg/chat/ph7en60deef2j48p2mwg3ztfdx8d68dt>. Registro:
  `bloco-celas-carandiru`. Pavilhão central do mapa penitenciária (referência
  Carandiru): escala não-uniforme no call-site (9 × 15 m de planta, 6,6 m);
  o jogador circula pela galeria externa gradeada ao redor; procedural de
  tijolo com janelas de grade cobre o arnês (colisor idêntico).
- `portao_penitenciaria.glb` — "Portão de penitenciária", portão principal
  com pilastras e folha de grade fechada. 4.491 tris, texturas WebP 1024.
  Mint text-to-3D, gerado 26/08/2026 — item do pack carandiru_r3b. Chat:
  <https://mint.gg/chat/ph7en60deef2j48p2mwg3ztfdx8d68dt>. Registro:
  `portao-penitenciaria-carandiru`. Embutido no muro norte do mapa
  penitenciária; portão fechado — o colisor sela o vão.
- `guarita_muro.glb` — "Guarita de muro", cabine envidraçada sobre estrutura
  de concreto. 4.827 tris, texturas WebP 1024. Mint text-to-3D, gerado
  26/08/2026 — modelo solto da onda carandiru_r3b. Chat:
  <https://mint.gg/chat/ph77vksqsbvk24d8gv6zkytdtn8d7f7t>. Registro:
  `guarita-muro-carandiru`. 2 instâncias flanqueando o portão norte do mapa
  penitenciária (a frente sem vigia entre as guaritas de canto); fallback
  procedural de pernas+cabine no arnês.

### Viatura Carandiru C3 — 08/09/2026

- `carandiru_viatura_1990.glb` — "Weathered Grey Patrol Wagon", perua policial
  brasileira genérica do fim dos anos 1980/início dos 1990, sem marca, pessoas ou
  cena de violência. Mint / Tripo P1, 4.840 triângulos e 3 texturas WebP até 1024.
  [Projeto e chat](https://mint.gg/project/zd7agpw4xxat6kytnxka8kj19h8e1969?chat=ph7ev8zdhy23p8v1ec4vtjyt058e1r4k),
  asset `p97a1j1skm2w33wjyv8pkw92n18e0g2j`. Original 1.043.988 bytes / SHA-256
  `26c04d5b950633e7882e98826cc454a4bb4cab0e204dcad0a747815a0671d752`; final
  415.268 bytes / SHA-256
  `5251a70e9e63a1652f129d945a79d901d0b0e2d7b7394414ca393fe64062f2bf`.
  `dedup`, compressão WebP 1024 e `prune` não alteraram os 4.840 triângulos. A
  casca GLB substitui apenas o visual da viatura; o fallback e o colisor existente
  permanecem determinísticos. A geração ocorreu na conta Mint do usuário para este
  projeto. Termos públicos e publicação comercial ainda exigem verificação; não
  declarar CC0.

## Kit estrutural de Obras da Prefeitura

Reaproveitado da frente histórica `map2/obras`; nenhum crédito novo foi consumido.
Ambos pertencem ao pack Mint `posto_obras_r3`, gerado pela conta do projeto com
prompt próprio e sob licença de assinante Mint Pro. O registro completo, incluindo
IDs, chat, hashes e processamento, está em `mint-assets.json`.

- `andaime.glb` — torre tubular com plataformas e travessas; 4.299 triângulos,
  WebP 1024. Registro `andaime-obras`.
- `container_escritorio.glb` — container de canteiro com porta e janela; 4.406
  triângulos, WebP 1024. Registro `container-escritorio-obras`.

Licença de uso da conta Mint; não declarar CC0. Os arquivos continuam sujeitos aos
termos e direitos de terceiros registrados no manifesto.

## Piscina da Treta: mobiliário Mint (07/10/2026)

Mint text-to-3D, projeto "CS BRASIL — Piscina props", prompts próprios derivados dos
contratos de módulo do plano 25 (`plans/25-PISCINA-DA-TRETA-REWORK.md`), sem copyright de
terceiro. Brutos em `references/glb/piscina_*_mint.glb` (gitignored); derivados por
`tools/optimize-piscina-props.mjs`: material canônico fosco (sem normal/MR; só a escada
mantém metal), albedo WebP 512/256 e simplificação meshopt. Registro: `mint-assets.json`.

| Arquivo | Mint | Tris (bruto) | KB | SHA-256 bruto | SHA-256 derivado |
|---|---|---|---|---|---|
| `piscina_espreguicadeira.glb` | <https://mint.gg/chat/ph7f5h69frj9w3bsytxer0arf58ft0pe> | 2.724 (4.860) | 167 | `fe035add14616cf63fd4a1dc089161064350796f0e592301e7bba8213ed83cea` | `09ad4599070ba169a5ef83ed484d686419483cb2a2df1bc8545dd8dafdc13fa7` |
| `piscina_armarios.glb` | <https://mint.gg/chat/ph70saqc8tc23f03cad1tqdpex8ftmmz> | 2.519 (4.330) | 168 | `92ecebbebc50049466729f1b2c265d172ec20daadaf0902a882e6093098475fd` | `9d03911f980b3a8e60f339f92b06e0fe082e5edb90f49febf580ac52d8f6c1e9` |
| `piscina_banco.glb` | <https://mint.gg/chat/ph71f31nch3gyjqtj9d0vpjg3h8fts72> | 2.670 (4.348) | 169 | `92a0288f1f45842e323ebd89dbebcb3270927658e373d35a46e115b94cc92265` | `94f63dbbdf6ddd4bf33108f2e522c650aab5de0355ac8677f902eaa24335b6e7` |
| `piscina_escada.glb` | <https://mint.gg/chat/ph78byp06py2f4239bqvq8me118fv9e7> | 1.499 (4.694) | 61 | `fd8792d9d01a4f70eeeeb3f11abe5daf3d273c5b4c9bcf64be1963de6493fcfd` | `9d64cfe54ac551e47f8aea1c8a18a9a2f8e2934934cf56b73ae6fe8d7c7c1293` |

Os colisores continuam sendo as caixas de sempre (`map_piscina.js`, material `OCULTO`);
o GLB só substitui a imagem e é esticado para caber exatamente na caixa.


## UPA 24h: mobiliário clínico Mint (11/10/2026)

Nove props gerados por prompts próprios na conta Mint do usuário, TRIPO_P1:
maca, longarina, monitor, soro, oxigênio, biombo, cadeira de rodas, armário e
balcão modular. Projeto, packs, prompts e fontes documentados em
UPA: procedência em `upa-mint-assets.json` (a ficha saiu da árvore pública no #835); hashes dos originais
e derivados, dimensões e tratamento offline nas entradas `upa_*` de
[mint-assets.json](../../../mint-assets.json). A coleção está em
[upa-mint-assets.json](upa-mint-assets.json).
GLBs autocontidos, normalizados antes da integração para escala runtime1.
Estado de revisão registrado no manifesto; renders/originais/rejeições preservados
fora do Git. A procedência confirma geração e download, não uma concessão de
licença: termos de publicação não confirmados nesta sessão; não declarar CC0.


## Invasão dos Javaporcos: props realistas (30/10/2026)

O dono pediu o mapa "mais realista, sem lowpoly" (carros, lixo, mato, postes). Nada gerado:
modelos da biblioteca local do dono (Sketchfab, licença no `asset.extras` de cada GLB e
conferida na página) e do Poly Haven (CC0, baixado pela API em `references/polyhaven/`,
gitignored). Derivados por `tools/javaporcos-realista-assets.mjs`: recorte da variante,
Meshopt (permissivo nos scans), giro assado, pivô no chão em metros, WebP. Registro com SHA
em `mint-assets.json` (`frente: javaporcos-realista`); a régua é `npm run eval:props-acervo`.
Crédito CC-BY/CC-BY-NC-SA: autor e link abaixo. Os NC-SA (Ddiaz Design) proíbem uso comercial:
Saveiro Robust e BYD abaixo estão em quarentena local, fora de `public/`, do registro
de publicação e do pipeline. Uso não autorizado. Gol G2 e Fusca legados também não
entram neste modo; a decisão sobre o acervo dos outros mapas continua pendente.

### Carros (rua)

| Arquivo | Origem | Autor | Licença | Tris (bruto) | KB | Dimensão (m) | Uso |
|---|---|---|---|---|---|---|---|
| `chevette_sl76.glb` | <https://sketchfab.com/3d-models/chevrolet-chevette-sl-76-2322139894c545b6838000f08d853662> | Laerte.Hubaleque | CC-BY-4.0 | 37.983 (53.839) | 1391 | 1.61 x 1.35 x 4.12 | rua |
| `saveiro_robust.glb` | <https://sketchfab.com/3d-models/2022-volkswagen-saveiro-16-robust-bd312f832dd64eb8acb01923b85283de> | Ddiaz Design | CC-BY-NC-SA-4.0 | 16.093 (290.097) | 856 | 1.88 x 1.51 x 4.49 | quarentena local, fora da publicação |
| `byd_dolphin.glb` | <https://sketchfab.com/3d-models/2024-byd-dolphin-e8f3cf54c0e545b1b290d7a55ca77fca> | Ddiaz Design | CC-BY-NC-SA-4.0 | 19.992 (112.804) | 1461 | 1.99 x 1.54 x 4.29 | quarentena local, fora da publicação |
| `carro_batido_scan_03.glb` | <https://sketchfab.com/3d-models/destroyed-car-03-raw-scan-483fe7f26336463fba66638ca4200c5a> | Renafox | CC-BY-4.0 | 39.979 (2.499.993) | 1225 | 2.41 x 1.22 x 4.2 | rua/beco |
| `carro_batido_scan_07.glb` | <https://sketchfab.com/3d-models/destroyed-car-07-raw-scan-916b51c7e5644eb2a6c9b3797ebb08cf> | Renafox | CC-BY-4.0 | 39.995 (2.500.000) | 1171 | 2.97 x 1.8 x 4 | rua/beco |
| `perua_pichada_scan.glb` | <https://sketchfab.com/3d-models/graffitid-toyota-wagon-raw-scan-cb1a538a5e84460e8dfeb4cfff109653> | Renafox | CC-BY-4.0 | 39.986 (2.499.862) | 1201 | 1.81 x 1.47 x 4.34 | rua/pasto |

### Rua, beco e praça: lixo, sujeira e mobiliário

| Arquivo | Origem | Autor | Licença | Tris (bruto) | KB | Dimensão (m) | Uso |
|---|---|---|---|---|---|---|---|
| `saco_lixo.glb` | <https://polyhaven.com/a/trashbag> | Benny Weimer | CC0 1.0 | 4.482 (4.482) | 193 | 0.53 x 0.57 x 0.46 | rua/beco |
| `caixa_papelao.glb` | <https://polyhaven.com/a/cardboard_box_01> | Poly Haven | CC0 1.0 | 5.000 (16.952) | 187 | 0.39 x 0.34 x 0.52 | rua/beco |
| `engradado_plastico.glb` | <https://polyhaven.com/a/plastic_crate_02> | Poly Haven | CC0 1.0 | 5.840 (5.840) | 262 | 0.51 x 0.25 x 0.41 | praça/rua |
| `caixote_madeira.glb` | <https://polyhaven.com/a/wooden_crate_01> | Poly Haven | CC0 1.0 | 6.576 (6.576) | 270 | 0.83 x 0.35 x 0.41 | praça (feira) |
| `pneu_velho.glb` | <https://polyhaven.com/a/old_tyre> | Poly Haven | CC0 1.0 | 2.880 (2.880) | 175 | 0.6 x 0.6 x 0.16 | praça/rua |
| `cadeira_plastico.glb` | <https://polyhaven.com/a/plastic_monobloc_chair_01> | Poly Haven | CC0 1.0 | 3.356 (3.356) | 214 | 0.64 x 0.88 x 0.63 | rua (bar) |
| `saco_cimento.glb` | <https://polyhaven.com/a/cement_bag> | Poly Haven | CC0 1.0 | 844 (844) | 62 | 0.46 x 0.18 x 0.7 | beco/rua |
| `tambor_metal.glb` | <https://polyhaven.com/a/barrel_03> | Poly Haven | CC0 1.0 | 1.473 (1.473) | 121 | 0.63 x 0.93 x 0.64 | beco/pasto |
| `tampa_bueiro.glb` | <https://polyhaven.com/a/water_manhole_cover> | Poly Haven | CC0 1.0 | 2.999 (6.301) | 213 | 0.69 x 0.07 x 0.69 | rua |
| `lixeira_metal.glb` | <https://polyhaven.com/a/metal_trash_can> | Poly Haven | CC0 1.0 | 7.532 (7.532) | 342 | 0.77 x 0.91 x 0.55 | beco |
| `lata_enferrujada.glb` | <https://polyhaven.com/a/can_rusted> | Poly Haven | CC0 1.0 | 1.500 (3.520) | 66 | 0.12 x 0.15 x 0.12 | beco/rua |
| `caixa_energia.glb` | <https://polyhaven.com/a/utility_box_01> | Poly Haven | CC0 1.0 | 4.404 (4.404) | 203 | 0.52 x 1.12 x 0.43 | beco |
| `porta_aco.glb` | <https://polyhaven.com/a/rollershutter_door> | Poly Haven | CC0 1.0 | 552 (552) | 182 | 1.08 x 2.4 x 0.3 | rua (comércio fechado) |
| `porta_aco_pichada.glb` | <https://polyhaven.com/a/rollershutter_door> | Poly Haven | CC0 1.0 | 552 (552) | 217 | 1.08 x 2.4 x 0.3 | rua/beco |
| `barreira_concreto.glb` | <https://polyhaven.com/a/concrete_road_barrier> | Poly Haven | CC0 1.0 | 8.000 (60.928) | 281 | 1.54 x 0.83 x 0.64 | praça (barricada) |
| `luminaria_parede.glb` | <https://polyhaven.com/a/street_lamp_02> | Poly Haven | CC0 1.0 | 8.096 (20.338) | 287 | 0.39 x 1.67 x 0.81 | praça (fachada da igreja) |

### Postes (rua, beco e praça)

| Arquivo | Origem | Autor | Licença | Tris (bruto) | KB | Dimensão (m) | Uso |
|---|---|---|---|---|---|---|---|
| `poste_transformador.glb` | <https://polyhaven.com/a/modular_electricity_poles> | Poly Haven | CC0 1.0 | 12.665 (31.932) | 867 | 1.2 x 6.13 x 1.96 | rua/praça |
| `poste_fiacao.glb` | <https://polyhaven.com/a/modular_electricity_poles> | Poly Haven | CC0 1.0 | 12.499 (26.466) | 856 | 1.2 x 6.13 x 0.85 | rua/beco |
| `poste_luz_praca.glb` | <https://polyhaven.com/a/street_lamp_01> | Poly Haven | CC0 1.0 | 12.095 (30.610) | 359 | 0.7 x 3.87 x 0.39 | praça |

### Mato, mata e pasto

| Arquivo | Origem | Autor | Licença | Tris (bruto) | KB | Dimensão (m) | Uso |
|---|---|---|---|---|---|---|---|
| `capim_touceira_a.glb` | <https://polyhaven.com/a/grass_medium_02> | Poly Haven | CC0 1.0 | 2.489 (2.489) | 111 | 0.32 x 0.26 x 0.36 | pasto/mata |
| `capim_touceira_b.glb` | <https://polyhaven.com/a/grass_medium_02> | Poly Haven | CC0 1.0 | 1.760 (1.760) | 87 | 0.18 x 0.18 x 0.2 | pasto/calçada |
| `mato_erva.glb` | <https://polyhaven.com/a/weed_plant_02> | Poly Haven | CC0 1.0 | 2.967 (2.967) | 157 | 0.22 x 0.07 x 0.29 | calçada/beco |
| `arbusto_mata_a.glb` | <https://polyhaven.com/a/shrub_02> | Poly Haven | CC0 1.0 | 9.234 (9.234) | 306 | 1.77 x 1.31 x 2.29 | mata/pasto |
| `arbusto_mata_b.glb` | <https://polyhaven.com/a/shrub_02> | Poly Haven | CC0 1.0 | 7.590 (7.590) | 258 | 1.31 x 1.69 x 1.64 | mata/praça |
| `samambaia_mata.glb` | <https://polyhaven.com/a/fern_02> | Poly Haven | CC0 1.0 | 2.384 (2.384) | 112 | 0.99 x 0.43 x 0.89 | mata |
| `calathea_mata.glb` | <https://polyhaven.com/a/calathea_orbifolia_01> | Poly Haven | CC0 1.0 | 5.904 (5.904) | 194 | 0.6 x 0.42 x 0.53 | mata |
| `galhos_secos.glb` | <https://polyhaven.com/a/dry_branches_medium_01> | Poly Haven | CC0 1.0 | 5.933 (5.933) | 332 | 0.32 x 0.34 x 1.3 | mata/pasto |
| `toco_arvore.glb` | <https://polyhaven.com/a/tree_stump_01> | Poly Haven | CC0 1.0 | 7.994 (41.046) | 404 | 1.43 x 0.57 x 1.59 | pasto/mata |
| `tronco_caido.glb` | <https://polyhaven.com/a/dead_tree_trunk> | Poly Haven | CC0 1.0 | 7.994 (101.802) | 324 | 3.05 x 0.29 x 0.28 | mata/pasto |
| `pedra_mata.glb` | <https://polyhaven.com/a/rock_07> | Poly Haven | CC0 1.0 | 3.998 (14.844) | 216 | 0.17 x 0.14 x 0.32 | pasto/mata |

### Javaporcos: quatro aparências Mint — 30/10/2026

Modelos próprios do projeto CORO SOLTO — Javaporcos, pack
`th7f82d138zgbc9bzs2c3032f58h9f8g`,
[solicitação no Mint](https://mint.gg/chat/ph73ry10s4j7w9gtzw6k8vqqqx8h8jmk).
Os animais ficam em `public/models/enemies/javaporcos/`, registrados em
`mint-assets.json` e no `asset-manifest.json` dessa pasta com hashes e origem.

- `leitao_listrado.glb` — `ks72s7n7xpvss3hp3vncm5xd2h8h8w2w`.
- `javaporco_malhado.glb` — `ks77ht2fkgabbttc2mqq96p0x98h962g`.
- `javaporco_ruivo.glb` — `ks7c1r9d83q0d6ekjd3m6747vx8h8qgm`.
- `javaporco_velho_cicatrizado.glb` — `ks70t3c3mkxgtszkhd7wb1q54n8h88xn`.

Originais completos preservados em `references/glb/` (ignorados). Receita
`tools/javaporcos-variantes.mjs`: geometria intacta, WebP512/quality90, dedup/prune.
Derivados `_lod.glb` por `tools/javaporcos-lod.mjs`: weld e simplify com razão0,30,
erro0,01; materiais e bytes das texturas preservados. Rig de passada feito no
runtime, sem animação gerada/paga adicional. Os quatro modelos anteriores permanecem.

<!-- javaporcos-mint-packs:start -->

### Pacotes Mint cidade e vegetação — 30/10/2026

Modelos próprios do projeto CORO SOLTO — Javaporcos. Cidade: [pack](https://mint.gg/assets?asset=th753rbz1fjyvfcsypbdcfcntn8h8wr4), [solicitação](https://mint.gg/chat/ph71s3avnfz5xtf76nm4vg7dnn8h91hc). Vegetação: [pack](https://mint.gg/assets?asset=th7a6e6j8ex8gx7jc3btycpjdn8h8xj5), [solicitação](https://mint.gg/chat/ph78p4ab22f3c9cmqk4qy5hx9d8h9391).

Originais ignorados em references/glb/javaporcos-mint-packs; hashes e processamento em mint-assets.json. Receita tools/javaporcos-mint-packs.mjs: escala uniforme declarada, pivô no chão, geometria original e WebP512/quality90. Sem quantização, sem conversão paga. Modelos catalogados; ainda não colocados no mapa, que mantém sua geometria física validada. Escalas são calibração local para futura integração, não medidas de objetos reais.

| Arquivo | Item | Pack | Tris | KiB | Dimensão local (m) |
|---|---|---|---|---|---|
| `javaporcos_mint_fachada.glb` | Fachada de comércio do interior | cidade | 4713 | 338 | 5.228 × 4 × 4.552 |
| `javaporcos_mint_fundo_casa.glb` | Fundo de casa do beco | cidade | 4674 | 311 | 4.249 × 4 × 2.287 |
| `javaporcos_mint_cacamba.glb` | Caçamba de entulho | cidade | 4681 | 373 | 2.281 × 1.76 × 3.5 |
| `javaporcos_mint_poste_trafo.glb` | Poste de concreto com transformador | cidade | 4863 | 437 | 3.335 × 8 × 1.988 |
| `javaporcos_mint_padrao_luz.glb` | Padrão de entrada de luz | cidade | 4758 | 243 | 0.511 × 1 × 0.284 |
| `javaporcos_mint_lixeira_tombada.glb` | Lixeira tombada | cidade | 4790 | 375 | 1.3 × 0.674 × 0.791 |
| `javaporcos_mint_pilha_sacos.glb` | Pilha de sacos de lixo | cidade | 4920 | 369 | 1.491 × 1.034 × 1.5 |
| `javaporcos_mint_banca_feira.glb` | Banca de feira | cidade | 4428 | 407 | 2.4 × 2.4 × 2.052 |
| `javaporcos_mint_uno_batido.glb` | Uno batido abandonado | cidade | 4859 | 320 | 1.85 × 1.479 × 3.65 |
| `javaporcos_mint_varal.glb` | Varal com roupas | cidade | 4601 | 363 | 4 × 2.262 × 1.01 |
| `javaporcos_mint_mesa_bar.glb` | Mesa e cadeiras de bar | cidade | 4826 | 324 | 1.516 × 1 × 1.392 |
| `javaporcos_mint_orelhao.glb` | Orelhão | cidade | 4515 | 265 | 0.908 × 2.2 × 1.003 |
| `javaporcos_mint_mangueira.glb` | Mangueira | vegetacao | 4708 | 390 | 6.767 × 7 × 6.726 |
| `javaporcos_mint_ipe_amarelo.glb` | Ipê-amarelo | vegetacao | 4498 | 439 | 7.17 × 8 × 7.342 |
| `javaporcos_mint_arvore_mata.glb` | Árvore da mata atlântica | vegetacao | 4057 | 384 | 8.434 × 10 × 7.691 |
| `javaporcos_mint_embauba.glb` | Embaúba | vegetacao | 4912 | 394 | 6.184 × 8 × 6.278 |
| `javaporcos_mint_bananeira.glb` | Bananeira | vegetacao | 4897 | 339 | 4.217 × 5 × 4.178 |
| `javaporcos_mint_jucara.glb` | Palmeira juçara | vegetacao | 5460 | 438 | 4.174 × 9 × 4.033 |
| `javaporcos_mint_capim.glb` | Touceira de capim braquiária | vegetacao | 4249 | 428 | 1.167 × 1.2 × 1.2 |
| `javaporcos_mint_cupinzeiro.glb` | Cupinzeiro de pasto | vegetacao | 4349 | 380 | 1.789 × 1.6 × 1.789 |
| `javaporcos_mint_mourao.glb` | Mourão com arame farpado | vegetacao | 4285 | 387 | 0.186 × 1.3 × 2.433 |
| `javaporcos_mint_moita.glb` | Moita de samambaia e helicônia | vegetacao | 3555 | 301 | 1.931 × 1.5 × 1.908 |

<!-- javaporcos-mint-packs:end -->
