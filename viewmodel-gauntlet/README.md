# Evidência do gauntlet de viewmodel

**Por que isto está versionado, e não em `artifacts/`**

O `GOLDEN-AK-DECISION.md` (31/08) aprovou a AK citando capturas em
`artifacts/viewmodels/golden-ak/offline-reload-detail-v2/`. Esse diretório é
gitignored: **a prova evaporou** e, onze dias depois, ninguém podia conferir a
aprovação. Foi essa ausência que deixou passar o defeito abaixo.

Evidência de aceite fica aqui, versionada.

## `baseline-ak.mp4` — 11/09/2026

AK golden no jogo real (Praça dos Três Poderes, 3:2 → 1280×720, 300 quadros,
10 s), gravado por `tools/eval/vm-cs16-video.mjs --arma=ak --porta=4361`.

**O que ele prova:** o caminho autorado está ativo (HUD `vm: AUTORADO (ak)`), a
mão enluvada empunha, o tiro anima — e **a recarga NÃO anima**. No fim o HUD
acende `RECARREGANDO...` e o viewmodel fica parado.

Medido por RMS quadro a quadro no recorte do viewmodel (`crop=640:360:640:360`,
escala 80×45, cinza):

```
f021   2.92   movimento
f027  15.74   tiro / coice
f028   5.99
f029   0.14
f030   0.03   <- estado de recarga ATIVO, imagem congelada
```

O GLB tem o clipe: `Mag_metarig` percorre **71,7 cm em 101 chaves** no clipe
`Reload` de `coro/ak-hires.glb`. A animação existe no arquivo e não chega à tela.

**Reproduzir:**
```sh
npx astro dev --port 4361 --host 0.0.0.0
node tools/eval/vm-cs16-video.mjs --arma=ak --porta=4361 --out=viewmodel-gauntlet/baseline-ak.mp4
```

`contato-ak.png` é a folha 6×5 dos mesmos 300 quadros, 1 a cada 10.
