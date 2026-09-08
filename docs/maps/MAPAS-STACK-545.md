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
fora deste lote. `mapcontrato`, `spawn`, `ctfround` e `ctfwin` verdes.

## Runtime local

URL: `http://127.0.0.1:8146/?debug=1&auto=P,mst&map=posto_treta&perfilauto=0&ctf=1`.
As quatro capturas 1200×800 (3:2) ficam fora do Git em
`artifacts/mapas-stack-545-v2/runtime/`: Posto 5×5/8×8 e Atacadão 5×5/8×8.
Atacadão 8×8 chegou a `live` com 15 bots, 8 spawns de cápsula livre, 283 nós,
103 colisores e 126 occluders. A matriz de rotas/LOS competitiva continua
coberta pelos contratos `mapcontrato` e CTF; esta captura não substitui
playtest humano. Avisos locais: `SUPPORT_URL_BR is not defined` e 404s de
áudio/API/decals ausentes, não atribuídos a este diff.

Roteiro humano: em cada mapa, nascer nos dois times, atravessar as passagens
de loja/pátio (Atacadão) e bombas/conveniência (Posto), testar tiro entre
cover e capturar as três bandeiras. Aprovação visual humana permanece pendente.
