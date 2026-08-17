# GL-SHOTS-REPORT — SwiftShader vs Metal

Mapa: `praca_poderes` · Condição: `?debug=1&auto=P,mst` · Browsers: Chrome do macOS.

## tLive (tempo até `window.__game.state === 'live'`)

| Aspecto | SwiftShader `tLive` (s) | Metal `tLive` (s) | Acelerou |
|---|---:|---:|---:|
| 3:2 (1500×1000) | 43.733 | 8.958 | ~4.9× |
| 16:9 (1600×900) | 31.647 | 6.495 | ~4.9× |

## Métricas de cena

| Aspecto | Backend | calls | tris | textures | geometries | programs | heap (MB) |
|---|---|---:|---:|---:|---:|---:|---:|
| 3:2 | SwiftShader | 1 | 4576 | 285 | 519 | 75 | 74.8 |
| 16:9 | SwiftShader | 1 | 4576 | 282 | 523 | 73 | 73.4 |
| 3:2 | Metal | 1 | **1** | 560 | 600 | 100 | 94.5 |
| 16:9 | Metal | 1 | **1** | 560 | 603 | 100 | 106.3 |

## Divergência de pixels

| Par | Tamanho Swift | Tamanho Metal | MSE | RMSE |
|---|---|---:|---:|---:|---:|
| `game-praca_poderes-32-a.png` | 865 KB | 1.8 MB | **3 866.98** | **62.19** |

Mesmas dimensões (1500×1000), mas MSE/RMSE alto e tamanhos de arquivo muito diferentes.

## Alertas

- **O Metal subiu em ~1/5 do tempo, mas `tris === 1` e `calls === 1` indicam que o `renderer.info` pode não estar sendo atualizado** — ou o frame foi capturado antes/depois do render real.
- **Os PNGs do Metal são quase 2× maiores que os do SwiftShader**, com MSE de ~3 900 por pixel (0-255), o que equivale a uma diferença visual forte.
- **Console no Metal/SwiftShader** mostra `503` (Supabase não configurado) e `404` para assets opcionais; não parece bloquear o boot, mas pode afetar a composição da cena.

## Recomendação

1. Verificar se `headless=new` no Chrome macOS realmente usa a GPU Metal; talvez `headless: false` ou `--headless` (antigo) mude o comportamento.
2. Adicionar uma régua que compare `renderer.info.render.triangles` contra um teto mínimo por mapa, para não aceitar `tris=1` como captura válida.
3. Incluir `game-praca_poderes-*-a.png` do Metal e SwiftShader em `tools/eval/BAR-CONSISTENCIA.md` para inspeção visual.
