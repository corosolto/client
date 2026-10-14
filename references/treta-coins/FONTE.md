# Fontes das moedas TRETA$

Referências: personagens 3D já presentes no client, pipeline Mint documentado em `public/js/glbchars.js`. Não são novas gerações pagas. Fonte Git da lane: `34edf6558`. As moedas são derivados criados no Blender; os GLBs originais preservam sua aparência e não foram alterados.

- `public/models/characters/saci.glb` — SHA256 `10bd7ea91dae8e00fd306b10c8c4d4be1a28f3c3724d1cf4d13a63f5548cc562`. Referência visual: `saci.webp`.
- `public/models/characters/curupira.glb` — SHA256 `43e554c6aa08dee54f9e2d3e15bd88ab1d3a8ef1a20a8c91971b66ffbb198afc`. Referência visual: `curupira.webp`.
- `public/models/characters/caipora.glb` — SHA256 `2b15e377385aacb55c64d1c4922680afd7d2f7cda1dafcb4459ff7cd76b31b09`. Referência visual: `caipora.webp`.
- `public/models/characters/lobisomem.glb` — SHA256 `6b3839025c194b1418c71c7ddb68a9a9afe59794d50d49c4409197edf6f0093d`. Referência visual: `lobisomem.webp`.
- `public/models/characters/gotinha.glb` — SHA256 `941b812cad28ccac2cd25024292ad6f87efa1c2dcafecc694aa052209c603253`. Referência visual: `gotinha.webp`.
- `public/models/characters/canarinho.glb` — SHA256 `44bc26b92f8f99b60fe70a6f1f5b5ff79ee19061d4801a3b792eb28a8684a3ff`. Referência visual: `canarinho.webp`.
- `public/models/characters/zumbi.glb` — SHA256 `b8596378f0ba96d6cdf54b625edf2b6e79b920025abad8a0acdc9ad562bde2dd`. Referência visual: `zumbi.webp`.

Pedido atualizado: moedas v2 usam somente cabeça/rosto derivado dos mesmos GLBs, sem arma ou corpo. O relevo usa apenas geometria, com ouro original criado no Blender. A máscara facial da Caipora usa a referência caipora.webp (faixa dos olhos x95–147/y52–77) e é cunhada em ouro escuro sobre a superfície do rosto. Não inclui logos do Fortnite ou texturas do jogo de referência.

Fontes/renders atuais: `csbrasil/private-assets/treta-store/coins/portrait-v2/`; composição antiga preservada em `coins/rejected-fullbody-20261011/`. Frente: rosto sozinho; verso: valor/T$. Script reproduzível: `tools/blender/build_treta_coins.py`.

Referências visuais: Saci/Curupira/Caipora/Lobisomem/Zumbi copiados de `public/img/chars/avatars/`; Gotinha/Canarinho de `public/img/chars/`. Os retratos auxiliam identificação, mas a geometria cunhada deriva exclusivamente dos GLBs com hashes acima.
