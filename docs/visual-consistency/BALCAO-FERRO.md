# Balcão do Ferro Velho

Integração visual do balcão existente em `(-8, -31.5)`. Envelope de contrato: `3,2 × 1,0 × 1,4 m` (medido **com** as transformações dos nós; o bbox cru dos accessors, 3,164 × 0,95 × 1,387, ignora transforms e **não** é envelope — ver `ferro-balcao-mint-assets.json`). Base no piso, collider AABB legado único e intacto.

`public/models/props/ferro_balcao.glb` é a cópia íntegra do asset Mint aprovado (hash no manifesto). Procedência, contagens e termos em `public/models/props/{ferro-balcao-mint-assets.json,FONTE-FERRO-BALCAO.md}`.

## Integração (PropBatch)

A lista `FERRO_PROPS` pre-carrega o GLB pelo registry existente. Carregado, o modelo entra por `PropBatch` (`tag: 'balcao'`): as 24 primitivas são fundidas nos 5 materiais PBR do arquivo — **5 draw calls** (um `InstancedMesh` por material, 1 instância), sem clone nem recolor de material, geometria e materiais idênticos ao GLB (608 triângulos desenhados). O grupo raiz `ferro-balcao` fica identificado por `userData.propId`. Sem o asset, ou com `?usarprop=0`, a caixa legada continua visível (fallback legítimo de diagnóstico) — e o kill-switch é provado COM o asset registrado: o cenário `fallback` da régua registra o template pré-build e valida que o switch desligado não instancia nada.

## Colisão e occlusão

O collider AABB legado (`3,2 × 1,0 × 1,4`, `collide:true`) nunca é desligado nem duplicado. Occlusão segue o contrato global `shot_surfaces`: **só superfície renderizada occlui** — com o modelo válido a caixa legada fica invisível e sai do array `world.occluders`, e as 5 malhas visíveis do modelo entram no lugar (mesmo padrão do `gprop`, BUG-54). Raios de tiro/LOS (`game.js` `_losClear`, tiro, penetração, blood) continuam bloqueados pelo balcão. `nextRust()` é consumido exatamente uma vez em qualquer modo — cor da caixa fallback, colliders, spawns e bandeiras são idênticos entre modelo e fallback. **Escopo da paridade**: estrutura estática + `nextRust`; o fluxo global do RNG NÃO é reivindicado, porque o branch com asset aloca `Group`/geometrias/`InstancedMesh` cujos UUIDs consomem `Math.random()` (three r160) — mesma partida semeada entre modos é contrato não medido aqui.

## Régua — `tools/eval/ferro-balcao-check.mjs`

Sobe `buildFerroVelho` real com `GLTFLoader` real e o GLB registrado no registry; cada cenário roda em processo filho próprio (med e low, modelo/fallback/sem-asset, `usarprop` on/off). Mede: envelope/base/centro por vértices de mundo efetivamente desenhados (visibilidade material+ancestor), 608 triângulos por `drawRange` (não só hash), 5 materiais/draws, collider ×1, occluders conforme modo, raycast real bloqueado, paridade de `nextRust`/colliders/spawns contra o fallback. O "sem clone/recolor" é medido contra um **snapshot PBR imutável tirado ANTES do register/build** (valores copiados de cor/roughness/metalness), não contra o próprio template — que é compartilhado por referência com o mundo desenhado e não pode testemunhar sobre si mesmo. 11 mutantes: os 8 originais (escala, deslocado, fallback-visível, collider-removido, occluder-removido, modelo-invisível, triângulo-ausente, prop-ausente) + `switch-ignorado` (bloco de integração executado com `usarprop=0` — a guarda removida, mordendo pelo mesmo acceptance do fallback) + `recolor-preto`/`roughness-alt` (mutação in-place do template entre parse e build, detectada só pela cláusula snapshot). Mutante que não aplica é denunciado (exit 3, lição 8 do `LICOES.md`). CLI de nome exato: typo (`--qualidadelow`), valor ausente (`--modo`), valor inválido (`--modo=xl`) e opção no orchestrator saem 2.

## Limites

A régua roda em node: não mede pixels, FPS mobile nem custo do renderer — isso exige captura no navegador 3:2 no mapa real (validação visual final na frente Root, ainda pendente). Nada aqui declara o visual integrado aprovado; a aprovação existente (`CRITICO-BALCAO-V1.md`) é do asset isolado.
