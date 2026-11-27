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

## Rodada 26: três conjuntos PBR gerados no Mint (mint.gg)

Gerados por texto (sem imagem de referência) em 27/11/2026 na conta Pro do dono, projeto "CORO SOLTO — Mapas HD", 100 créditos
cada. PNG 1024 px do Mint convertidos para WebP com `sharp`: cor (RGB) + rugosidade (alfa) num arquivo, normal em outro.
Originais (cor, normal, rugosidade, altura, metalness) e manifestos em `scratchpad/lane/r26/mint-materiais/` (local).
Licença: conteúdo gerado sob os termos de uso do Mint; **conferir os termos para repositório público AGPL antes de publicar**.

| Arquivo | Material no Mint | ID do asset | Uso previsto | Peso |
|---|---|---|---|---|
| `bloco_cor_rug.webp` + `bloco_normal.webp` | "Bloco baiano 29x19" | `w178nvmvp7x1e727ytfv729gp98k16pk` | bloco cerâmico à vista (crítica A1) | 482 KB + 281 KB |
| `fibro_cor_rug.webp` + `fibro_normal.webp` | "Telha de fibrocimento" | `w173zp2kj7ejyzkzn78x5kzpc98k09qq` | telhados (A2) | 521 KB + 98 KB |
| `tabua_cor_rug.webp` + `tabua_normal.webp` | "Tapume de madeirite" | `w17cx36bd8mg91pcf63cg49rgd8k0m5g` | tábua vertical dos barracos (A4) | 294 KB + 123 KB |

Cuidados medidos nos arquivos:
- `bloco`: o ladrilho tem 2 blocos de largura por 6 fiadas de altura, com face 3:1. Para o bloco real de 29 x 19 cm projetar com
  repetição anisotrópica: 1 ladrilho = 0,60 m de largura x 1,26 m de altura. Média da cor: sRGB 205/135/105 (linear 0,641 / 0,261 / 0,159).
- `fibro`: ondas na vertical do ladrilho, linha de recobrimento horizontal 1 vez por ladrilho. Média sRGB 189/190/181.
- `tabua`: tábuas na vertical. Média sRGB 167/165/162.
- A rugosidade do Mint sai baixa (média 0,23–0,26): não usar o alfa direto; remapear para 0,7–1,0 ou fixar no material.
- Normal usado como OpenGL (verde para cima); nas capturas de 27/11/2026 o relevo não leu invertido.

A terra batida da rua (r26) reutiliza `hd_sertao/dry_ground_rocks_cor.webp` (Poly Haven, CC0; ver `hd_sertao/FONTE.md`), lida só em
mips altos: entra a mancha de baixa frequência, sem a trinca do conjunto.
