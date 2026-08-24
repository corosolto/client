# Operacional — continuar Lajes R26

Repo `/Users/ruben/game`, branch `feat/times-e-mapas-completo`, trabalho não commitado.
Leia primeiro `scratchpad/PROMPT-HANDOFF-VISUAL.md`. Não use `map_lajes.js` ou a casca
histórica como runtime vigente: `public/js/maps.js` registra
`public/js/map_lajes_authored.js`.

## Arquivos que mandam agora

- planta, proxies, arquitetura, rotas, fauna: `public/js/map_lajes_authored.js`;
- registro do mapa: `public/js/maps.js`;
- hitscan: `public/js/game.js` `_fireHitscan`;
- corpo/camadas: `game.js` `_collide` e `_updatePlayer`;
- gates atuais: `tools/eval/lajes-spatial-check.mjs`, `lajes-gap-check.mjs`,
  `map-check.mjs`, `map-contrato-check.mjs`, `lajes-authored-check.mjs`;
- contrato e defeito: `plans/10-LAJES.md`, `KNOWN-BUGS.md` BUG-54;
- evidência antiga do candidato: `tools/eval/asset-evidence/maps/lajes/`;
- screenshots do teste do dono: caminhos absolutos listados no handoff visual.

## Antes de editar

```bash
npm run arch
graphify query "lajes authored collide occluder spawn respawn bounds roof ground walls blocks beco"
npm run eval:lajes-spatial
npm run eval:lajes-gap
node tools/eval/map-check.mjs lajes
```

O estado recebido passa esses gates e mesmo assim falha no jogo. A próxima régua precisa
ficar vermelha no estado atual e ter mutantes próprios antes do conserto.

## Reproduções a instrumentar

### Bala no ar

O caminho real é `game.js:_fireHitscan` → `world.occluders`. Em Lajes, toda caixa proxy
entra nessa lista. O teste precisa carregar GLB no navegador e comparar raycast de proxy
com raycast da arquitetura visível; harness node sem GLB mede outro mapa.

### Salto de camada

Reproduza `groundHeightAt(x,z,yRef)` com duas alturas no mesmo footprint e depois faça uma
queda dirigida com `_updatePlayer`. Controle: mapa multinível que já respeita `yRef`, como
Mansão/Loja H. Mutante: apagar a condição de `yRef` deve restaurar o salto.

### Becos e limites

Faça flood/caminhada no térreo com o corpo real (raio 0,38), registrando componentes,
becos sem saída e distância entre clamp e primeiro obstáculo visível. Gere overlay PNG com
livre/bloqueado/limite; o próximo modelo precisa olhar a figura.

## Servidor e captura

```bash
node tools/eval/serve.mjs 8124
# jogo real
open 'http://127.0.0.1:8124/?map=lajes'
# revisão isolada
open 'http://127.0.0.1:8124/mapview.html?map=lajes'
```

Um único browser por vez. Capturar sempre 3:2 e no nível do jogador: spawn norte, spawn
sul, descida das três escadas, cada retorno do beco, quatro limites e dois tiros através
de vãos visuais. Reinicie o servidor depois de editar `public/` se o arnês mantiver módulo
em memória.

## Portões depois do conserto

```bash
node --check public/js/map_lajes_authored.js
npm run syntax
npm run eval:lajes-spatial
npm run eval:lajes-gap
npm run eval:lajes-authored
npm run eval:lajes-rooftop
node tools/eval/map-check.mjs lajes
npm run eval:mapcontrato
npm run eval:spawn
node tools/eval/botsim.mjs 30 lajes
npm run docs
npm run docs:check
npm run arch
npm run arch:check
graphify update .
```

Também rode cada mutante novo e confirme exit 1 na cláusula correta. Não declare pronto
sem screenshots 3:2 olhadas e `asset-review` de contexto limpo. O teste final que fecha
BUG-54 é do Ruben.

## Não repetir

- não consertar o tiro tornando a caixa visível;
- não remover colisão de corpo para fazer a bala passar;
- não abrir o mapa inteiro para “resolver” beco bloqueado;
- não transformar o limite em parede invisível mais grossa;
- não mexer em renderer/exposição porque um vídeo antigo parece lavado;
- não trocar a arquitetura aprovada por outra geração em massa;
- não rodar browser em paralelo;
- não reverter arquivos sujos fora desta frente.
