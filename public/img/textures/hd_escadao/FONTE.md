# Texturas do kit HD do Escadão (`?hd=1`)

Rodada 1: **nenhuma textura nova**. `public/js/map_escadao_hd.js` reutiliza os conjuntos CC0 (Poly Haven) já em
`public/img/textures/hd_lajes/` (ver `hd_lajes/FONTE.md` para slug, página, tratamento e peso):

| Uso no Escadão | Arquivo reutilizado | Projeção |
|---|---|---|
| reboco das PAREDES, cimento (MAT_CIMENTO) e muretas (MAT_GUARDA) | `hd_lajes/reboco_cor_rug.webp` + `reboco_normal.webp` (`concrete_wall_003`) | metros de mundo, 1,7 m |
| pisos de concreto, degraus e espelhos (MAT.concrete, MAT_DEGRAU) | `hd_lajes/piso_cor_rug.webp` + `piso_normal.webp` (`concrete_floor_02`) | metros de mundo, 1,9 m |
| faces verticais de concreto (aterro, fundações, parapeitos) | `hd_lajes/forma_color.webp` + `forma_normal.webp` (`wood_textured_concrete`) | metros de mundo, 1,8 m |

Tijolo (`lajes_tijolo_baiano_color.webp`), zinco (`tex_zinco.webp`) e azulejo continuam os do mapa autoral; janelas e
portas vêm dos atlas procedurais de `public/js/hd_detalhes_lajes.js`. Peso adicional em disco: 0 B.
