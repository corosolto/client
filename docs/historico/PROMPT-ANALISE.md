# PROMPT — Análise completa do CS BRASIL (jogo + PRs abertos)

> Cole o texto abaixo no outro worker (Claude). Ele assume que o worker roda
> dentro do clone do repositório `rubenmarcus/csbrasil`.

---

## Missão

Você é um engenheiro sênior de jogos web. Faça uma análise **read-only** do jogo CS BRASIL e dos **8 PRs abertos** deste repositório, e entregue um relatório com: review técnico por PR, plano de merge ordenado, recomendação estratégica sobre o PR #11 (port Godot), e lista priorizada de riscos/bugs/melhorias. **Não modifique código** — o entregável é análise e plano.

## O que é o projeto

CS BRASIL é um FPS satírico brasileiro estilo CS 1.6 rodando no navegador (times Petistas × Bolsonaristas, personagens fictícios estereotipados, tom cartunesco, sem gore, sem pessoas ou marcas reais). Deploy em produção: https://www.csbrasil.online

Stack:

- **Jogo**: Three.js em JS vanilla, sem build, em `public/`. Entry `public/index.html`; código em `public/js/` — `game.js` (loop principal, ~1.2k linhas), `maps.js` (registry de arenas), `map.js` (awp_map), `map_*.js` (um arquivo por arena), `characters.js` (modelos procedurais), bots com waypoints, áudio por manifest em `public/audio/`.
- **Padrão de mapa**: cada arena exporta `build(scene, T)` retornando `{ root, colliders, occluders, groundHeightAt, spawns, sun, hemi, pickups, waypoints:{nodes,adj}, nearestWaypoint, findPath, bounds, tick? }`. `T` são texturas compartilhadas de `textures.js`.
- **Site**: Astro na raiz (`src/pages/`: `/ranking`, `/u/[id]/[nick]`, `/mapa`, `/api/*`), SSR na Vercel.
- **Backend**: Supabase Postgres (`supabase/schema.sql` + `supabase/migrations/`). Ranking global, perfil público com badge PNG (resvg-wasm), presença/geo. Anti-cheat server-side em `/api/submit-match` (rate limits + consistência física, kills≤45/round) — há histórico de pentester usando trainer (god mode/autoshot).
- **Versão atual da main**: v1.12.4 — modos de arma (TODAS/PISTOLAS/FACA/AWP), dropdown de mapas com ícones, captura de arma do chão com E, troca de time com M, nick obrigatório, bots com dificuldade 1.5x.

## PRs abertos (verificar com `gh pr list` / `gh pr view N`)

| PR | Título | Tamanho | Estado | Notas |
|----|--------|---------|--------|-------|
| #4 | mapa fy_sitio (Atibaia, lago/pedalinhos) | +375 | CLEAN | toca `maps.js`, `index.html` |
| #5 | mapa fy_metro (trem que para/abre portas) | +750 | CLEAN | toca `game.js` (adiciona `world.tick`/`world.movers`); **contém `map_sitio.js` encadeado do #4** |
| #6 | personagens v2 (proporções humanas) | +39/-25 | CLEAN | só `characters.js` |
| #7 | mapa fy_masp (vão do MASP) | +245 | CLEAN | toca `maps.js` |
| #8 | mapa fy_baleia (Faria Lima) | +481 | CLEAN | **contém `map_masp.js` encadeado do #7** |
| #9 | mapa fy_osasco (pombos com IA) | +266 | CLEAN | adiciona a **mesma linha** `world.tick` no `game.js` que o #5 |
| #10 | mapa fy_havan (estacionamento) | +329 | CLEAN | toca `maps.js` |
| #11 | **port completo pra Godot 4.7.1** (autor externo: woliveiras) | +30.320/-56, 437 arquivos | DIRTY | feito sobre main pré-Astro; o próprio autor diz que deve ficar Draft até reconciliar |

Interações conhecidas: todos os PRs de mapa tocam `public/js/maps.js` (conflitos triviais em sequência); #5 e #9 colidem na mesma linha de `game.js`; #11 conflita estruturalmente com tudo.

## Como rodar e verificar

- Jogo local: `cd public && python3 -m http.server 8123` → http://localhost:8123
- URL de debug: `?debug=1&auto=P,mst&map=fy_havan` (`auto = time,personagem`; expõe `window.__game` no console). IDs de mapa: `awp_map`, `fy_pool_day`, e nos branches: `fy_sitio`, `fy_metro`, `fy_masp`, `fy_baleia`, `fy_osasco`, `fy_havan`.
- Syntax check de arquivo JS: `node --input-type=module --check < arquivo.js`.
- Testes headless de referência (puppeteer-core + Chrome real) em `/tmp/awptest/test53.js` e `test54.js` — use como padrão pra criar novos.
- Site Astro: `npm run dev`, `npm run build` (conferir o fim do log).
- PR #11: `gh pr checkout 11` e seguir `docs/runbooks/testar-cliente-godot.md` do branch; rodar os testes GUT e os web tests dele e **verificar se os números que ele declara (72 testes, ~120 FPS) se confirmam**.

## O que analisar

1. **Review por PR (#4–#10)**: aderência ao padrão de builder dos mapas; qualidade de colliders/waypoints/spawns (spawn camping? sightlines longas demais? cover suficiente?); performance (nº de meshes, draw calls, shadow map); bugs prováveis; se o arquivo encadeado (map_sitio.js no #5, map_masp.js no #8) deve ser removido do diff antes do merge.
2. **Plano de merge**: ordem ótima dos 7 PRs minimizando conflitos (sugestão inicial: #6 → #4 → #5 → #7 → #8 → #9 → #10 — validar ou corrigir), com a resolução exata esperada para `maps.js` (união das entradas) e para a linha duplicada `world.tick` entre #5 e #9.
3. **PR #11 — decisão estratégica** (a mais importante): comparar "manter Three.js" vs "adotar Godot" vs "conviver com os dois". Critérios mínimos:
   - Paridade de features: o port Godot **não tem** os 6 mapas novos, arsenal completo (AK/M4/MP5/M3/Deagle), modos de arma, ranking/Supabase, perfis/badge, mapa de calor, áudios BR dublados, anti-cheat, UI CS 1.6. Estime o custo de levar isso tudo pro Godot.
   - Qualidade real do port: rodar os testes dele, medir o tamanho do export web (.pck/.wasm), tempo de carregamento vs o cliente atual (~zero build, abre instantâneo).
   - Arquitetura: o que o Godot faz melhor (scenes, testes, tipos) que valeria trazer pro JS mesmo se recusar o port.
   - Custo social: dois clientes pra manter, contribuidor externo engajado.
4. **Saúde geral do jogo**: caçar bugs reais no `game.js` atual da main (estados de round/respawn, troca de arma, modos de arma filtrando pickups, pointer lock); revisar anti-cheat do `/api/submit-match` contra bypass óbvio; checar pendências de migrations (`supabase/migrations/008..010`) e o que quebra se o usuário não rodou; mobile fallback.
5. **Gaps pra "1.0"**: o que falta — multiplayer real, mais personagens/mapas, sombreamento/arte, acessibilidade, monetização nula etc. Priorizar pelo que dá mais valor por dia de trabalho.

## Entregáveis (neste formato)

1. **Resumo executivo** (máx. 10 linhas).
2. **Tabela de PRs**: recomendação `merge / merge com ajustes / rework / fechar` + justificativa de 1 linha cada.
3. **Plano de merge passo a passo** com comandos git concretos (incluindo como limpar os arquivos encadeados dos diffs do #5 e #8).
4. **Veredito do #11**: `adotar / adaptar / recusar`, com plano de migração por fases se adotar, ou lista do que cherry-pickar de ideias se recusar.
5. **Top 10 riscos/bugs** priorizados, com referência `arquivo:linha` e severidade.
6. **Quick wins** (cada um ≤ 1 dia de trabalho).

## Restrições e tom

- Sátira fictícia: nunca propor pessoas, partidos ou marcas reais; manter tom cartunesco sem gore.
- KISS: o cliente Three.js é vanilla **de propósito** — não propor framework/bundler pra ele.
- O dono do repo é brasileiro; escreva o relatório em português.
- Read-only: análise e plano, sem commits.
