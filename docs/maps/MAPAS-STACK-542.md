# Degrau #542 — Parque Madureira

## Objetivo e escopo

Restaurar somente a autoria de Parque Madureira do PR #542 sobre
`origin/codex/carandiru-c1`, sem alterar `map_penitenciaria.js` nem os contratos
C1–C3 do Carandiru. Base: `7988ff04`; branch:
`codex/mapas-stack-542-v2`.

## Entrega validada

- `map_uv.js` volta como helper compartilhado; o Parque volta a aplicar UV por
  metro em plano, caixa, cilindro, cone e esfera.
- Baseline da base sem a restauração: TEXEL1/2/3/3b vermelhos no Parque
  (mediana 35,4 px/m; chão 17,5; 67,0% abaixo do piso; dispersão 6,68x/80,4x).
  Estado restaurado: mediana/chão 128; p05 107; 4,0% abaixo do piso;
  dispersão 1,00x/2,11x.
- Pérgolas nas duas orientações e palmeiras imperiais foram restauradas. A nova
  régua `eval:parquemadureira` mede 80 elementos de pérgola, 100 ripas, 32
  palmeiras/coplas e quatro posições da alameda liberadas pela guarda de rota.
  Os mutantes `sem-pergola`, `sem-palmeiras` e `alameda-bloqueada` acendem só
  PM1, PM2 e PM3, respectivamente.
- Gates verdes: texel do Parque; Madureira e mutantes; parquevida; parquecanopy;
  parquewheel; mapcontrato (Parque: 412 nós/2578 arestas, conexo); spawn;
  ctfround; ctfwin.

## Navegador e limite de aceite

Chrome/WebGL local em 1200x800 (3:2), URL
`http://127.0.0.1:8137/?debug=1&auto=P,mst&map=parque_treta&perfilauto=0&ctf=1`:
5x5 chegou a `live` com 9 bots e 8x8 com 15. Capturas e recibo ficam em
`artifacts/mapas-stack-542-v2/browser/` (não versionados). Não houve overlay.
O console ainda emite `SUPPORT_URL_BR is not defined` e há 404 locais de áudio,
`/api/geo-lang` e dois caminhos legados; não foram introduzidos por este diff.

Isso é evidência técnica, não aprovação visual humana. O frame ainda conserva a
paleta pastel das atrações; revisão humana 3:2 e playtest de rotas continuam
pendentes. Não avançar #545 nesta branch.
