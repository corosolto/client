# Texturas do kit HD do Córrego (`?hd=1`)

Rodadas 1 e 2 **não adicionam arquivo nenhum**: `public/js/map_corrego_hd.js` reutiliza conjuntos CC0 já no repositório e
canvas gerados na hora.

| Uso no Córrego | Arquivo reutilizado | Origem (ver FONTE.md do conjunto) |
|---|---|---|
| Rua (cimentado em placas + remendo de asfalto), parede/rampa/fundo do canal | `hd_lajes/piso_cor_rug.webp` + `piso_normal.webp` | Poly Haven `concrete_floor_02`, CC0 |
| Embasamento, lajes, platibanda, pilares, postes, cruzetas, vigas/pilares/tablado da travessia (ex-madeira escura), entulho e manilha do leito | `hd_lajes/forma_color.webp` + `forma_normal.webp` | Poly Haven `wood_textured_concrete`, CC0 |
| Reboco pintado das casas e muros (8 tintas autorais mantidas) | `hd_lajes/reboco_cor_rug.webp` + `reboco_normal.webp` | Poly Haven `concrete_wall_003`, CC0 |
| Telhados e barracos de chapa | `hd_lajes/chapa_color.webp` + `chapa_normal.webp` | Poly Haven `worn_corrugated_iron`, CC0 |
| Tijolo sob o reboco descascado; grão do bloco cerâmico (padrão de bloco 39 × 19 cm é por shader, relevo = `reboco_normal`) | `pbr_bricks051_color.webp` (já usado pelo mapa) | ambientCG `Bricks051`, CC0 |
| Tábua cinza / compensado (ponte, tapume, barraco de passagem) | `tex_madeira.webp` do próprio mapa, só recolorida por shader | autoral |
| Janelas (9 tipos) e portas (5 tipos) nos vãos das casas | atlas canvas 1024² de `hd_detalhes_lajes.js` (`atlasJanelas`, `atlasPortas`), dispostos em `desliga()` | desenhado no kit |
| Porta de enrolar e placas pintadas das bocas de comércio | tela canvas 1024 × 512 de `hd_cenografia_corrego.js` (`telaComercio`, letras de `pintaLetreiro`) | desenhado no kit |

Peso novo em disco: 0 B. O resto da cenografia (`hd_cenografia_corrego.js`) é cor por vértice, sem textura.
