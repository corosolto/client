# Joá / Mansão — recuperação seletiva

**Worktree:** `worktrees/joa-recuperacao`  
**Branch:** `astra/joa-recuperacao-seletiva`  
**Base verificada:** `origin/main` em `42c01175` (`v2.0.0-alpha.235`)  
**Fonte histórica:** `origin/map2/mansao`  
**Método:** inspeção estática e gates locais; nenhum browser, merge, cherry-pick ou release.

## Decisão deste corte

Não há um primeiro slice de código que seja simultaneamente pequeno, coeso e seguro.
O Joá não existe no catálogo atual: recuperar uma melhoria visual isolada não muda o jogo,
e reintroduzir o mapa inteiro exige reintroduzir seu construtor, registro, prévia e contratos
de navegação em conjunto. Portanto este commit entrega a matriz de recuperação e a receita
executável para a frente seguinte, sem ocultar um merge em massa do PR #446.

## Matriz do diff histórico

| Item histórico | Estado na base atual | Recuperável neste corte? | Motivo |
|---|---|---:|---|
| `public/js/map_mansao.js` (1.333 linhas) | ausente | não isoladamente | é o único construtor do mapa; sem registro não há rota jogável para validar |
| entrada `mansao` em `public/js/maps.js` | ausente | não isoladamente | muda menu, rotação, link e pré-carregamento; exige prévia e mapa válido |
| céu Joá em `public/js/look.js` | existe como chave obsoleta fy_mansao | não | o construtor histórico chama `applyLook(..., 'mansao')`; a chave atual cairia no look padrão |
| texturas Joá (`mansao_streetart_marble`, `tex_mansao_lawn`, `tex_deck`, `concrete_br`) | presentes | sim, como dependência | os quatro arquivos existem; não são uma melhoria visível sem o mapa |
| água / `map_sky` / `soundscape` | presentes | não | APIs existem, mas pertencem a runtime compartilhado e não devem ser arrastadas pelo mapa |
| `MANSAO_AMBIENCE_ASSETS` | ausente de `ambientlife.js` | não | o import histórico falha; a base exporta somente famílias genéricas e Amazônia/Córrego |
| cinco gates `mansao-*` | ausentes | não antes do mapa | foram escritos para uma árvore antiga e precisam de adaptação e mutação contra o construtor reintroduzido |
| `docs/maps/MANSAO-R2.md` | ausente | sim, como referência | descreve a origem, mas não prova compatibilidade com os contratos atuais |

A divergência não é só de distância de commits: `origin/main...origin/map2/mansao` marca
**442 commits apenas na main e 231 apenas no histórico**, com merge-base
`463da9ffcf9ccf645e86ce8404bdd08194bcda46`.

## Evidência local

A base atual possui 16 mapas e não lista `mansao`. Os gates da base passaram sem mudanças:

```text
npm run eval:mapcontrato  PASSA — 16 mapas; MC1/MC2/MC3 verdes
npm run eval:mapid        PASSA — M1/M2/M3 verdes
npm run eval:maprotate    PASSA
```

Isso prova o estado de partida, não torna o Joá recuperado. O mapa histórico retornava
`colliders`, `occluders`, `pickups`, `ctfPoints`, `spawns`, `groundHeightAt`, waypoints e
`stairs`; esses contratos precisam ser verificados no runtime atual antes de entrar no registro.

## Receita de produção para o próximo corte

1. Criar uma branch nova sobre a `main` então vigente. Não usar o PR #446 como veículo e não
   cherry-pickar `map2/mansao` em massa.
2. Portar somente `map_mansao.js` para um arquivo temporário e adaptar as três incompatibilidades
   explícitas: remover/substituir `MANSAO_AMBIENCE_ASSETS`, trocar fy_mansao por `mansao` na
   tabela `LOOK`, e conferir o contrato atual de água/props antes de importar no catálogo.
3. Adicionar o registro `mansao` junto com prévia e alias somente depois que o construtor puder
   ser montado. Não publicar um item de menu que abra o mapa padrão silenciosamente.
4. Adaptar os cinco gates históricos (`mansao-beach`, `mansao-garden`, `mansao-glb-fit`,
   `mansao-ocean`, `mansao-water`) e adicionar uma mutação por regra. Os gates precisam medir o
   construtor realmente selecionado por `MAPS.mansao`.
5. Rodar, nesta ordem: `npm run eval:mapcontrato`, `npm run eval:mapid`, o conjunto `mansao-*`,
   `npm run eval:bots`, `npm run check:fast` e captura visual 3:2 do interior, jardim, praia,
   respawns e rota CTF.
6. Só abrir PR quando a captura mostrar que interior, praia e linhas de tiro funcionam e um crítico
   independente revisar as imagens. Nenhum destes requisitos foi executado neste corte porque o
   mapa ainda não foi reintroduzido.

## Bloqueio e próxima ação

O bloqueio é arquitetural, não falta de asset: um PR pequeno de Joá ainda precisa ser uma
**reintrodução completa e validada do mapa**, não uma alteração cosmética. A próxima ação é
atribuir essa receita a uma lane exclusiva de reintrodução; ela não deve concorrer por
`maps.js`, `look.js`, `ambientlife.js` ou runtime com outra frente de mapas.

## Continuação autorizada: produção completa (06/09/2026)

Objetivo: retornar Joá ao catálogo, com preview, contratos, rotas, CTF, ambiência e captura offline. Done: gates locais, mutações, revisão independente, checkpoints e PR #533 atualizado; sem browser, merge ou release.

Base sincronizada por fast-forward: `9e016deb`. Fonte histórica fixa: `73cf81c8b7b7909e96dd9d5f2b9c40342ca4bf22`. Os gates históricos de praia foram recuperados antes do mapa: baseline reprovou 19 cláusulas (`artifacts/joa-recuperacao/baseline-beach.log`). A execução inicial de água encontrou dependência local ausente; `npm ci --ignore-scripts` instalou o lockfile.

Correção ao relatório anterior: faltavam 17 GLBs de props no checkout; todos existem na fonte histórica e estão sendo restaurados byte a byte. Não são novas gerações. Horizonte e fauna costeira ficam em módulos exclusivos do Joá. Autoria original será preservada por fonte/commits e hashes no inventário. Capturas Blender offline terão limites explícitos frente ao renderer WebGL.

Próximo passo: fechar import de ambiência, medir navegação por corpo real, gates de água/praia/jardim e carregar GLBs reais nas capturas.

### Marco: catálogo e contratos locais

Registry, alias fy_mansao, apresentação editorial e prévia histórica restaurados. Horizonte e ambiência isolados em módulos Joá; preload explícito. Todos os mapas passam MC1/MC2/MC3 após corrigir raio do grafo, amostragem de arestas e apoio do patamar. `mansao-runtime-check` passou com 515 nós / 6936 arestas dirigidas, zero nós ocupados, zero arestas bloqueadas e rotas spawn/CTF completas. Antes: um nó ocupado, 80 arestas bloqueadas e bandeira sobre vaso. Gates históricos água/jardim/praia/GLB-fit passam.

Assets restaurados: `docs/maps/MANSAO-RECOVERY-ASSETS.json` registra SHA256 e blob de origem. A arara histórica recebeu nome exclusivo `mansao_arara_voo.glb` para preservar o asset atual usado por `skylife.js`. Fauna de céu agora possui deformação procedural de asas, medida em vértices reais; 10 verificações verdes e mutante `asas-travadas` vermelho. Autoria da fonte: commits históricos de Ruben Marcus, incluindo `fd792d0c`, `5bbcd849`, `e8acea8a`, `5d06613e`; adaptação nesta lane por Codex.

Capturas em geração: `artifacts/joa-recuperacao/offline/scene.json`, export de 30 GLBs do disco, 826 objetos e 76 texturas. Render Blender não é aprovação de shaders WebGL. Próximo: revisão visual independente, física contínua/CTF, mutações, gates amplos e atualização do PR.

Checkpoint de origem/vegetação: `df0a1295`. Mobília e jardim complementares a seguir, sem alterar os bytes históricos.
