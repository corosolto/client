---
nome: mapas
quando: public/js/map_*.js, public/js/maps.js
ativo: true
---
Revisão de MAPA NOVO/ALTERADO. As 4 classes de defeito abaixo foram reais em PRs de mapas (256/257) — verifique cada uma no diff:

1. PICKUP NO BURACO (VM14): pickups e fileiras do armário (rack) precisam de groundHeightAt(x,z) ≥ −0,10 m. Mapa com TERRENO ONDULADO (groundHeightAt com senos/pits) + armas em linha reta = fileira atravessando depressão. O slot 0 do spawn é onde o ARMÁRIO ancora (game.js _resetPositions): se ele cai em depressão, o rack inteiro afunda.
2. ROTA ÚNICA (CTF2): entre cada spawn e cada bandeira precisam existir ≥ 2 rotas com ≥ 6 m de separação no miolo. Corredor único com paredes nas duas pontas = funil = reprovação. Atenção a mapas internos com corredor central estreito.
3. SUPERFÍCIE CLARA GIGANTE SEM ALBEDO (TEX1): teto/parede de BoxGeometry larga com cor clara (#e* ou luminância alta) e sem textura — cada triângulo ≥ 6 m² conta. Escurece ou texturiza.
4. ORÇAMENTO DE LUZ (MAT2): a luz do mapa tem que ficar na faixa 0,80–1,40× a do viewmodel (mapas existentes: ~2,4–3,6). Mapa interno escuro (luz total < 2) estoura a razão — HemisphereLight fraco + DirectionalLight fraco é o sintoma.

Também: id de mapa segue a convenção (sem prefixo fy_/awp_); registro MAPS é UMA linha por mapa (gen-docs parseia linha a linha); entrada no registro precisa dos campos do contrato (waypoints/spawns obrigatórios sem guarda no game.js).
