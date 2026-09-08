# Joá — decisão de integração sobre a main atual

Data: 08/09/2026. A recuperação final foi feita em `v2/mansao-joa-recuperacao`, criada
diretamente de `origin/main` em `e67addf4` (`v2.0.0-alpha.242`). O PR histórico #533 e
a branch `astra/joa-recuperacao-seletiva` foram preservados sem rebase ou force-push.

## Decisão

A pilha de fundação #540–#551 não era uma base estável: a raiz #540 conflituava com a
main e as PRs de mapas seguintes eram mergeáveis apenas contra suas bases encadeadas.
Rebasear #533 carregaria conflitos de catálogo, arquivos gerados e história não relacionada.
Por isso, a integração transporta seletivamente apenas a Mansão do Joá e seus contratos
para uma branch limpa da main atual.

Foram trazidos o construtor, registro e alias, preview, look, horizonte, ambiência, assets
com proveniência, apresentação editorial e gates `mansao-*`. O `mint-assets.json` foi
mesclado como JSON: quinze entradas do Joá foram adicionadas sem substituir o catálogo
atual. Dois overlays de Lajes que apareciam no diff antigo foram excluídos.

## Compatibilidade reaplicada

As consultas de camada do CTF foram reaplicadas sobre o `game.js` atual. O bot agora só
consome um waypoint quando também alcança sua altura em mapas com navegação em camadas.
Uma simulação contínua prova duas subidas até o ponto MEZZO: pela escada de serviço e desde
o spawn do jardim. O patamar visual da escada de serviço deixou de ser colisor, porque
`groundHeightAt` já fornece o piso; a duplicação prendia bots na borda em carga 8x8.

Os spawns autorados agora olham para o centro da arena. Quatro apoios finos tornam legível
a cobertura do mezanino, e os vasos repetidos do deck usam o `vaso_tropical` do Mint GG,
mantendo o cubo procedural apenas como fallback.

## Evidência técnica atual

- `npm run eval:mansao`: verde; 528 nós, 7.110 arestas dirigidas, zero nó ocupado e zero
  aresta atravessando sólido.
- CTF contínuo: serviço em 4,17 s e spawn em 20,33 s; piso inferior não captura nem contesta
  MEZZO.
- Carga CTF: 5x5 com 9 bots, stuck 2,0%, eficiência 0,387; 8x8 com 15 bots, stuck 0,9%,
  eficiência 0,448. O teto de stuck é 5%.
- `eval:mapcontrato`: 17 mapas e MC1/MC2/MC3 verdes. `map-check mansao`, `eval:mapid`,
  `eval:maprotate` e `eval:botsim-golden` verdes.
- Regressões de navegação em camadas verdes: `eval:amazonia`, `eval:amazonia-8x8`,
  `eval:lajes-bots`, `eval:lajes-nav` e `eval:lajes-ctf-surface`.
- Mutantes de spawn invertido, apoios ausentes, salto de patamar e CTF sem camada ficam
  vermelhos como esperado.

Node 16 falha em `import.meta.dirname`; os resultados válidos usam Node 23.6.0 por
`PATH=/opt/homebrew/bin:$PATH`.

## Evidência visual e aceite

O jogo local roda em `http://127.0.0.1:4382/?debug=1&auto=P,mst&map=mansao&perfilauto=0`.
As portas 4321 e 4322 já pertenciam a outros processos e não foram interrompidas. O
capturador registra um quadro de partida com HUD e nove câmeras fixas 1536x1024, além de
frame time do `requestAnimationFrame`, assets HTTP e movimento do avião.

Os recibos finais estão em `artifacts/joa-recuperacao/main-242-final-r2-med/` e
`artifacts/joa-recuperacao/main-242-final-r2-low/`. Em 180 frames, `med` mediu p50
16,2 ms / p95 18,0 ms / máximo 25,0 ms; `low` mediu p95 16,9 ms. São tempos do browser
local em dev, não benchmark de GPU. O avião percorreu 9,08 m (`med`) e 9,01 m (`low`)
durante a amostra, com `source: gltf` e `faixaPintada: true`. Os contact sheets têm hashes
SHA-256 `8a655e8f7a63157cc89c97948b0ccf90064c8265844200fd399600f2fbb574a8`
e `aacdb31d4e6b8120b210d9d23fc0a8ba1002782e8fc704beebdd70f60bcae639`.

Os três 404 de `folha-pixaca-03/04/05.png` são decalques genéricos também ausentes na main;
não pertencem ao pacote Joá. Os modelos e texturas Joá, incluindo
`models/props/aviao_faixa.glb` e `img/textures/faixa_aviao.webp`, respondem 2xx.

Captura real e gates técnicos não substituem aprovação visual humana. O horizonte ainda
tem leitura deliberadamente low poly e a revisão final deve observar fachada, jardim,
interior, mezanino, piscina, praia, avião/faixa e legibilidade em combate.

## Roteiro local exato

```bash
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/joa-recuperacao
PATH=/opt/homebrew/bin:$PATH npm run eval:mansao
env -u CODEX_CI -u CODEX_SHELL -u CODEX_THREAD_ID -u CODEX_SESSION_ID \
  -u CODEX_INTERNAL_ORIGINATOR_OVERRIDE PATH=/opt/homebrew/bin:$PATH \
  node_modules/.bin/astro dev --host 127.0.0.1 --port 4382 --ignore-lock
```

Abrir a URL acima e testar 5x5 e 8x8 em CTF: os dois spawns, ambas as escadas, captura do
MEZZO apenas no piso superior, vãos da casa, entrada e saída da piscina, praia e avião com
faixa. Não houve merge nem deploy.
