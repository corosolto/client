# Degrau #548 — UV por metro em Escadão, Loja H e Piscina

Base `origin/codex/mapas-stack-547-v2` (`cb56b011`). Escopo: UV em metros
nestes três mapas e `aoBoxGeo` opt-in por `opts.material`; os outros cinco
consumidores não mudam. #558 e #550 ficam fora desta branch.

Baseline vermelho: Escadão `TEXEL2/3/3b` (26,7%, 5,39x, 12,9x), Loja H
`TEXEL3/3b` (5,25x, 34,2x), Piscina `TEXEL2/3/3b/5` (41,1%, 1,74x, 9,1x,
decalques ausentes). Após a restauração: mediana 128 nos três; Escadão 4%
abaixo do piso e 1,27x p95; Loja H 8% e 1,00x; Piscina 0% e 1,00x.

Mutantes temporários e restaurados: retirar `caixaUVPorNormal` devolveu o
baseline vermelho de Escadão/Loja; substituir `fabricasUV` por geometrias
cruas devolveu `TEXEL2/3/3b` da Piscina. A régua ainda acusa `TEXEL3b` nos
três e `TEXEL5` na Piscina: dívida existente, não recalibrada neste degrau.

Gates verdes: `mapcontrato`, `spawn` (276), `ctfround`, `ctfwin`,
`shaderbudget`, `mapjson`, `preload`. `escadao-rota` continua vermelho no
`lance inferior` sem destino; não foi afrouxado. `escadao-ring` também não
foi alterado e reporta divergência do fonte servido.

## Runtime

Servidor: `node tools/eval/serve.mjs 8149`; URL:
`http://127.0.0.1:8149/?debug=1&auto=P,mst&map=escadao&perfilauto=0&ctf=1`.
Troque `map` por `loja_h` e `piscina_treta`. Capturas 1200x800 e recibos 5x5/8x8:
`artifacts/mapas-stack-548-v2/runtime/`. Os três chegaram a `live`, 9/15 bots,
4/4 spawns, matriz LOS E×B 16/16 e sem overlay. Loja/Piscina passaram a sonda
de cápsula; Escadão divergiu (sonda acusa ocupado, embora `eval:spawn` verde),
portanto a cápsula do Escadão não está aprovada por esta evidência.

Roteiro humano: percorrer os patamares/escadas do Escadão, pátio→loja da Loja H
e borda/vestiário/trampolim da Piscina, em 5x5 e 8x8, com câmera rasante e
troca de time. Capturas não constituem aprovação visual humana.
