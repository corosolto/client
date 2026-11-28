# Texturas do kit HD do Lajes (`?hd=1`)

Todas do Poly Haven (https://polyhaven.com), licença **CC0 1.0**, baixadas em 2K JPG em 10/11/2026 pela API
`https://api.polyhaven.com/files/<slug>` e convertidas para WebP 1024 px (ImageMagick). Nos mapas de cor o AO do
conjunto foi multiplicado (nível 30–100%) e a saturação reduzida (valor na tabela). Usadas só por
`public/js/map_lajes_hd.js`.

| Arquivo | Slug | Página | Mapa de origem | Saturação | Peso |
|---|---|---|---|---|---|
| `reboco_cor_rug.webp` | `concrete_wall_003` | https://polyhaven.com/a/concrete_wall_003 | diff + ao (RGB), rough (alfa) | 45% | 388 KB |
| `reboco_normal.webp` | `concrete_wall_003` | idem | nor_gl | – | 223 KB |
| `piso_cor_rug.webp` | `concrete_floor_02` | https://polyhaven.com/a/concrete_floor_02 | diff + ao (RGB), rough (alfa) | 70% | 464 KB |
| `piso_normal.webp` | `concrete_floor_02` | idem | nor_gl | – | 190 KB |
| `forma_color.webp` | `wood_textured_concrete` | https://polyhaven.com/a/wood_textured_concrete | diff + ao | 60% | 66 KB |
| `forma_normal.webp` | `wood_textured_concrete` | idem | nor_gl | – | 89 KB |
| `chapa_color.webp` | `worn_corrugated_iron` | https://polyhaven.com/a/worn_corrugated_iron | diff + ao | 100% | 173 KB |
| `chapa_normal.webp` | `worn_corrugated_iron` | idem | nor_gl | – | 269 KB |

Os dois `*_cor_rug.webp` juntam cor e rugosidade num arquivo (Pillow, WebP com alfa, qualidade 74): uma textura e uma
leitura a menos por material.

Total: 8 arquivos, 1,9 MB. Autores (crédito não exigido pela CC0): Dimitrios Savva, Rico Cilliers, Rob Tuytel,
Jenelle van Heerden.
