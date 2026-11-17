# Texturas HD do Sertão (kit `?hd=1`)

Todas vêm do Poly Haven, licença **CC0 1.0** (domínio público, sem atribuição obrigatória).
Baixadas em 10/11/2026 pela API `https://api.polyhaven.com/files/<slug>`, mapas JPG 2K nos conjuntos
anteriores e JPG 1K para `dry_ground_01`, e convertidas para WebP 1024 px (`sharp.resize(1024)` +
`.webp`, cor q82, normal/rough q86).

`*_cor.webp` = difuso multiplicado pela oclusão (AO × 0,75 + 0,25) do mesmo conjunto; `dry_ground_01_cor.webp` usa o difuso CC0 direto.
`*_normal.webp` = normal OpenGL (`nor_gl`); `*_rough.webp` preserva o mapa de rugosidade.

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

| `dry_ground_01_cor.webp` | `dry_ground_01` | https://polyhaven.com/a/dry_ground_01 | 227 KB |
| `dry_ground_01_normal.webp` | `dry_ground_01` | https://polyhaven.com/a/dry_ground_01 | 206 KB |
| `dry_ground_01_rough.webp` | `dry_ground_01` | https://polyhaven.com/a/dry_ground_01 | 143 KB |

Origem dos conjuntos antigos: `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/<slug>/<slug>_{diff,ao,nor_gl}_2k.jpg`.
Origem de `dry_ground_01`: `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/dry_ground_01/dry_ground_01_{diff,nor_gl,rough}_1k.jpg`.
Uso em `public/js/map_sertao_hd.js`: reboco (detalhe e relevo por cima da cor autoral), adobe sob o
reboco caído, terra do chão, tábua das caixas de madeira e telha das águas de caixa.
