# Piloto de casca assada — fy_lajes, fileira norte (v2)

Gera a casca visual (geometria + PBR + lightmap) de um quarteirão do `fy_lajes`:
3 prédios (caixa + puxadinho cada) da fileira norte, faces norte flush em
`z=-31`, com anti-caixa de verdade: duas peles por prédio com faixa de laje
saliente, sobrados pendendo sobre os vãos, platibandas quebradas com
telhadinhos de zinco, escada externa no gable oeste do NW, remendos irregulares
de tijolo, janelas variadas (25% menores, algumas com grade, algumas tampadas
com madeira) e faixa de umidade na base.

## Re-rodar

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
    --python tools/blender/build_lajes_shell.py                # completo, com bake (~3 min)
/Applications/Blender.app/Contents/MacOS/Blender --background \
    --python tools/blender/build_lajes_shell.py -- --no-bake --engine BLENDER_EEVEE
#   ^ iteracao rapida; valide o final com --engine CYCLES
```

Idempotente: começa de cena vazia (`read_factory_settings`) e sobrescreve as
saídas. Não rode dois em paralelo (mesma saída).

## Saídas

| Arquivo | O que é |
|---|---|
| `public/models/shells/lajes_piloto.glb` | mesh único `LAJES_SHELL`, ~25 materiais PBR (webp packed), UV0 (`TEXCOORD_0`) + lightmap UV (`TEXCOORD_1`). Sem luzes/câmeras. |
| `public/models/shells/lajes_piloto_lm.png` | lightmap 2048² (GI difusa indireta, Cycles `DIFFUSE` com `use_pass_direct=False`), indexada pelo `TEXCOORD_1`. No three.js: `tex.channel = 1; tex.flipY = false; material.lightMap = tex`. |
| `/tmp/shell2-rua.png` | régua: rua norte, cam three.js (10, 1.7, -35.5) → (-14, 2.2, -31) |
| `/tmp/shell2-vao.png` | régua: dentro do vão oeste, cam (-8.1, 1.6, -31) → (-8.1, 2.8, -13) |
| `/tmp/shell2-roof.png` / `-wide.png` / `-gable.png` | diagnóstico: telhados, fileira, escada |

## Onde mexer

Parâmetros no topo de `build_lajes_shell.py`:

- `BUILDINGS` — footprint da caixa, altura e tints caiados **por faixa**
  (`tint_lo` térreo, `tint_hi` sobrado). `ANEXOS` — puxadinhos (`skip_edge` =
  parede colada na caixa principal). `BAND_Y` = cota da troca de pele (2.2 m).
- `OVERHANG` — sobrado sobre o vão por parede: `(u0, u1, avanço)`, só acima de
  `BAND_Y` (o térreo fica flush e o vão livre).
- `PARAPET` — trechos (fração, altura) por aresta; ausência = laje viva.
  `ROOFLET` — telhadinho de zinco de 1 água na beira norte (28°).
- `build_building()` — janelas/portas por fachada. `vary_windows()` —
  proporções de janela pequena / grade / madeira (seed estável via crc32).
- `build_staircase()` — escada externa do NW (degraus 0.17×0.29 + viga +
  corrimão; visual, sem colisão). `build_patches()` — manchas de tijolo
  (3 retângulos sobrepostos cada). `build_props()` — caixas d'água, bulkhead,
  antenas.
- `bake_lightmap()` — resolução (`LM_SIZE`), samples, bounces. Sol em
  `setup_lighting()` (de ~(25,45,15) three.js + céu azulado).

## Limitações conhecidas

- Paredes são montantes/vergas/ombreiras de caixas (sem booleans): costura de
  textura possível dentro dos vãos de janela, imperceptível a 12 cm.
- `rot_x` de `boxT` tem sinal "invertido" em relação à intuição (rotaciona o
  vértice +z para baixo com ângulo positivo) — diagonais usam `-radians(ang)`.
- Interiores ocos e escuros; vidro é material liso escuro.
- O sobrado avança 0.35–0.5 m sobre o vão acima de 2.2 m — propositalmente
  FORA do plano da caixa de colisão (combinado); todo o resto é flush.
- A escada do NW é só visual (não colide nem leva à laje de verdade no jogo).
