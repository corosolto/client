# Texturas HD do Sertão (kit `?hd=1`)

Todas vêm do Poly Haven, licença **CC0 1.0** (domínio público, sem atribuição obrigatória).
Baixadas em 10/11/2026 pela API `https://api.polyhaven.com/files/<slug>`, mapa JPG 2K, e
convertidas para WebP 1024 px (`magick -resize 1024x1024` + `cwebp`, cor q82, normal q86).

`*_cor.webp` = difuso multiplicado pela oclusão (AO × 0,75 + 0,25) do mesmo conjunto.
`*_normal.webp` = normal OpenGL (`nor_gl`).

| Arquivo | Slug | Página | Peso |
|---|---|---|---|
| `white_rough_plaster_cor.webp` | `white_rough_plaster` | https://polyhaven.com/a/white_rough_plaster | 303 KB |
| `white_rough_plaster_normal.webp` | `white_rough_plaster` | https://polyhaven.com/a/white_rough_plaster | 246 KB |
| `clay_block_wall_cor.webp` | `clay_block_wall` | https://polyhaven.com/a/clay_block_wall | 184 KB |
| `dry_ground_rocks_cor.webp` | `dry_ground_rocks` | https://polyhaven.com/a/dry_ground_rocks | 350 KB |
| `dry_ground_rocks_normal.webp` | `dry_ground_rocks` | https://polyhaven.com/a/dry_ground_rocks | 482 KB |
| `old_planks_02_cor.webp` | `old_planks_02` | https://polyhaven.com/a/old_planks_02 | 76 KB |
| `old_planks_02_normal.webp` | `old_planks_02` | https://polyhaven.com/a/old_planks_02 | 158 KB |
| `clay_roof_tiles_02_cor.webp` | `clay_roof_tiles_02` | https://polyhaven.com/a/clay_roof_tiles_02 | 164 KB |
| `clay_roof_tiles_02_normal.webp` | `clay_roof_tiles_02` | https://polyhaven.com/a/clay_roof_tiles_02 | 257 KB |

Origem dos arquivos: `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/<slug>/<slug>_{diff,ao,nor_gl}_2k.jpg`.

Uso em `public/js/map_sertao_hd.js`: reboco (detalhe e relevo por cima da cor autoral), adobe sob o
reboco caído, terra do chão, tábua das caixas de madeira e telha das águas de caixa.
