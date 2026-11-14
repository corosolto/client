# Vídeos de hover das skins da loja

Pedido do dono em 14/10/2026: ao passar o mouse (ou focar por teclado, ou no primeiro
toque) o card da skin mostra um vídeo curto em loop do personagem com a skin.

## Procedência

Nada aqui é gerado por IA e nada foi pago. Cada quadro é render three.js do GLB
aprovado da skin (`public/models/skins/manifest.json`), montado pelo mesmo
`preloadCosmeticAssets()` + `buildCharacterModel()` do jogo, em
`public/charvideo.html?skin=<id>`. O personagem gira 360° enquanto toca o clipe
`idle` do próprio GLB; o loop tem dois ciclos do idle (2,83 s, 68 quadros a 24 fps),
então o último quadro emenda no primeiro. Fundo: o gradiente radial do card
(`.treta-card` em `public/treta.css`) com a cor da skin.

Comando, 14/10/2026, servidor local próprio:

```
node tools/eval/serve.mjs 9311
tools/eval/with-browser-lock.sh node tools/gen-skin-video.mjs --base http://localhost:9311
```

Encoder: ffmpeg, VP9 (`libvpx-vp9`, CRF 32) e H.264 (`libx264` high, CRF 22,
faststart), 480×480, sem áudio. Poster: webp q80 da pose do instante zero.
Teto de 400 KB por vídeo, conferido por `npm run eval:treta-video`.

| skin | GLB de origem | webm / mp4 / poster | SHA-256 (12) webm / mp4 |
|---|---|---|---|
| `lula-drip` | `lula-drip-881e87facd89.glb` | 271 KB / 233 KB / 10 KB | `c996713a57eb` / `0ac4bed5ae34` |
| `bolsonaro-drip` | `bolsonaro-drip-d2544f0b5f95.glb` | 228 KB / 198 KB / 9 KB | `922058f15b2a` / `b19a472327c5` |
| `senador-drip` | `senador-drip-4db27d13f43f.glb` | 234 KB / 210 KB / 9 KB | `0095225e2fe3` / `4194ad5050de` |
| `janja` | `janja-a268fab50a32.glb` | 210 KB / 176 KB / 8 KB | `cde411af02d4` / `9aaabbd8e02c` |
| `michelle-bolsonaro` | `michelle-bolsonaro-15a1099a0f1b.glb` | 202 KB / 175 KB / 8 KB | `ed5359d5bc0f` / `efe3830b3b64` |
| `lula-cyborg` | `lula-cyborg-e94ce8f2be07.glb` | 318 KB / 280 KB / 11 KB | `c02d12ba23da` / `fe92f02b1412` |
| `bolsonaro-cyborg` | `bolsonaro-cyborg-1ca095b97b57.glb` | 226 KB / 198 KB / 8 KB | `52b5777c80b1` / `5f82a4be15c3` |
| `aljuiz-toga-mandrake` | `aljuiz-toga-mandrake-e4bebe4f7c20.glb` | 264 KB / 226 KB / 11 KB | `553fe382828e` / `604b52922076` |
| `lula-mandrake` | `lula-mandrake-4e58761e8ed5.glb` | 249 KB / 219 KB / 10 KB | `fbcfd136c8a8` / `59fe88202522` |
| `bolsonaro-mandrake` | `bolsonaro-mandrake-bcd355b78b39.glb` | 257 KB / 222 KB / 10 KB | `ee2570703192` / `f31b6222a8e0` |
| `michelle-mandrake` | `michelle-mandrake-2a3fcdf22215.glb` | 210 KB / 186 KB / 8 KB | `d21208fe076f` / `e63e7e63d44f` |
| `zero-um-mandrake` | `zero-um-mandrake-43eb4d073d4a.glb` | 275 KB / 238 KB / 10 KB | `a87864efdbe3` / `fa231a2e4e91` |

Regerar depois de trocar um GLB: rode o mesmo comando com `--ids <skin>` e
atualize esta tabela.
