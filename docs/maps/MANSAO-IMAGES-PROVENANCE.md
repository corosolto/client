# Fonte histórica preservada

Extraído de `public/img/FONTE.md` no commit `73cf81c8b7b7909e96dd9d5f2b9c40342ca4bf22`. Evidência de origem, sem nova aprovação visual.

- `textures/sky_joa.webp` — regerado na r2 da mansão (26/08). O arquivo da r1
  (`c8da2430…`, fica arquivado em `tools/eval/asset-evidence/skies/sky_joa.webp`)
  NÃO era panorama: apesar de o prompt pedir equirretangular, o modelo devolveu uma
  foto RETILÍNEA de varanda de mansão — deck de pedra, piscina de borda infinita,
  espreguiçadeiras, jardineira e um coqueiro — e ela foi publicada sem verificação
  visual. Servida como equirretangular, a metade de baixo vira deck do tamanho do
  mundo e a folha de coqueiro fica na altura do olho: é o "efeito muito estranho" no
  horizonte que o dono relatou. Diagnóstico, medida e limiar em
  `tools/eval/sky-foreground-check.mjs` e em `docs/maps/MANSAO-R2.md`.
  SHA-256 do PNG cru `f07afdcda0c43709c18e22572b7e44ab97fc0b295d2b768ae4975b6f8e2f4d7c`,
  SHA-256 final `9cc6d444facebdfb3b0de2517b5ee7bd41ad70d7847ac0195f805d756f7d4e74`.
  Prompt: "Seamless 360-degree EQUIRECTANGULAR panorama (spherical projection, 2:1)
  of open tropical ocean at late golden hour, seen from high above the water off Rio
  de Janeiro. ABSOLUTELY NO foreground objects: no terrace, no pool, no deck, no
  furniture, no chairs, no palm trees, no plants, no railings, no buildings, no
  people, no boats, no text. The lower half is only open sea stretching to the
  horizon in every direction. The upper half is open sky with high wispy cirrus
  clouds, warm cream-gold near the horizon fading to clear blue at the zenith. Flat
  unbroken horizon line running perfectly straight across the entire width at the
  vertical centre of the image. Uniform lighting all around, no strong sun disc.
  Photorealistic, clean, no vignette, no letterbox, no borders."
  Duas variações foram geradas com `--n 2 --raw-only` e OLHADAS antes de publicar.
  Processamento: `tools/sky-equirect-publica.py` recorta 2:1 alinhando a linha do
  horizonte ao equador (desvio medido 0 px — a r1 não fechava essa conta, e o
  `look-horizonte.py` já amostra assumindo o alinhamento), e
  `tools/eval/sky_seam.py fix --cols 192` fecha o wrap em ΔL* -0,04 / Δb* -0,09, a
  melhor costura da árvore. Desvio de L* na banda do equador: 16,76 na r1, 3,21 aqui
  (teto 12,0).