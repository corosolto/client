# Degrau #545 — Posto e Atacadão

Base: `origin/codex/mapas-stack-542-v2` (`58f36b42`). Escopo: somente UV por
metro em `map_posto.js` e `map_atacadao.js`, mais a guarda compartilhada que
recusa texturas sem wrapping repetível. Carandiru e Parque não receberam
alteração; #547 não foi iniciado.

Baseline vermelho: Posto TEXEL1–3b (32,3 px/m, 98,2% abaixo do piso) e
Atacadão TEXEL1–3b (42,4 px/m, 91,1%). Estado restaurado: ambos 128 px/m;
Posto 0% e Atacadão 2% abaixo do piso, sem cláusula TEXEL vermelha.

`map_uv.js` retorna nulo para ClampToEdge/Mirrored inválido para ladrilho: UV
além de uma volta borraria a última coluna da textura. UPA e Obras permanecem
fora deste lote. `mapcontrato`, `spawn`, `ctfround` e `ctfwin` verdes; as
capturas e playtest 3:2/5x5/8x8 ainda exigem execução e aprovação humana.
