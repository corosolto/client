# Campinho sobre a `main` — integração seletiva do PR #530

## Resultado e definição de pronto

Esta lane torna integrável o Campinho que existe dentro da **Quebrada**. Ela parte
exatamente de `origin/main` em `2115d5e2c29eefb4491ae63b0f1600c200a750bb`, na
worktree `campinho-main-r2` e branch `codex/campinho-main-r2`. Campinho do Morro é
outro mapa e ficou fora do escopo.

O PR #530 continua aberto e conflitante em documentação/gerados antigos. Esta lane
o substitui por um porte seletivo: somente os hunks funcionais de
`public/js/map_quebrada.js` do head `378e400078aba8f8f7d5807d45a3515c72f2c923`
e a régua local de `c885b210433fd00ef76c3365323a40231d7af5f9`. Nenhum merge
ou cherry-pick trouxe os 42 conflitos, os relatórios históricos ou o build antigo.

Pronto técnico significa: cobertura e rotas protegidas por mutantes; 5×5/8×8 em
mata-mata e CTF; mapa, pickups e alvo CTF válidos; Chrome real em 3:2/16:9; áudio
ativo sem erro de runtime; build e `check:deploy`. Aprovação estética e de gameplay
continua sendo decisão humana depois de jogar o link local.

## RED antes do porte

O gate `tools/eval/campinho-integration-foundation-check.mjs` foi materializado
antes de editar a Quebrada e executado sobre a base exata. Ele saiu `1`:

```text
CAMPINHO_INTEGRACAO falhou: gate-cover: 0, esperado 2;
sideline-cover: 0, esperado 11; sideline-backrest: 0, esperado 2
```

Isso mede a ausência concreta das novas posições defensivas. A composição 5×5/8×8,
as quatro bandeiras e as rotas antigas já existiam na base; não foram usadas para
inventar um RED.

## Porte funcional

- duas muretas baixas e rotacionadas protegem a chegada sem fechar os portões;
- onze coberturas laterais e dois encostos criam reposicionamento nas duas margens;
- o placar físico fecha a leitura do fundo sem colisor na faixa de spawn;
- três nós de contorno preservam arquibancada, ponto e margem da feira;
- `segClear` passou de cinco amostras pontuais para interseção contínua com AABB/OBB
  inflada pelo raio real do corpo;
- o caixote da viela leste saiu do ponto que interferia no novo contorno.

Os commits de implementação e proteção são, respectivamente, `58f259e81` e
`8f7f9867a`. `public/js/audio.js`, `public/js/soundscape.js` e o exemplo de manifesto
permanecem byte a byte na base; o fix de áudio já presente na `main` foi preservado.

## GREEN causal

Comando principal:

```sh
npm run eval:campinho-integration
```

Resultado: 5×5 e 8×8 compõem os dois times em mata-mata e CTF; 15 coberturas são
visíveis e bloqueiam bala; spawns `4×4` ficam livres; CTF fecha em `4/4`; as 32
combinações spawn→bandeira têm caminho.

Os sete mutantes saíram `1` na cláusula esperada:

| Mutante | Quebra observada |
| --- | --- |
| `cobertura-invisivel` | cobertura invisível |
| `cobertura-sem-bala` | cobertura não bloqueia bala |
| `spawn-obstruido` | spawn B0 em sólido |
| `ctf-curto` | alvo 3 para 4 bandeiras |
| `rota-partida` | rotas dos dois times até R ausentes |
| `time-5x5` | composição 5×4 |
| `time-8x8` | composição 8×7 |

Os gates de mapa observaram 344 nós, 2.042 arestas dirigidas, grafo conexo,
zero corpos dentro de sólido, pior cobertura média de 4,28 m, no mínimo duas rotas
separadas para cada par time→bandeira, 62 pickups válidos e rodada CTF fechando na
quarta bandeira.

## Bots 5×5 e 8×8

Cada cenário usou 60 s e as nove sementes padrão de `botsim`.

| Cenário | Bots de IA | `stuck%` | `spinRoam` | `laneSpread` |
| --- | ---: | ---: | ---: | ---: |
| 5×5 mata-mata | 9 | 1,744 | 0,076 | 0,640 |
| 5×5 CTF | 9 | 3,800 | 0,081 | 0,640 |
| 8×8 mata-mata | 15 | 1,356 | 0,068 | 0,640 |
| 8×8 CTF | 15 | 2,000 | 0,086 | 0,640 |

Todos ficaram abaixo do teto existente de 4% de travamento. Os JSONs completos
estão em `artifacts/campinho-main-r2/logs/bots-*.json` e não entram no Git.

## Chrome WebGL e áudio

O gate `tools/eval/campinho-browser-check.mjs` abre uma partida real em Chrome,
mede o runtime por processo fresco, conta os objetos portados, mantém o contexto de
áudio ativo e captura o mesmo plano elevado do Campinho. A primeira matriz usou o
fallback sintético; a prova adicional 8×8 usou o pack local referenciado e ignorado
pelo Git.

| Times | Quadro | p50 | p95 | máximo | calls / triângulos máx. | áudio |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 5×5 | 1536×1024 (3:2) | 9,0 ms | 17,1 ms | 18,5 ms | 1.855 / 1.418.387 | 38 tiros, contexto ativo |
| 5×5 | 1600×900 (16:9) | 9,3 ms | 17,3 ms | 18,7 ms | 1.875 / 1.423.499 | 43 tiros, contexto ativo |
| 8×8 | 1536×1024 (3:2) | 15,4 ms | 17,3 ms | 18,5 ms | 2.082 / 1.517.425 | 49 tiros, contexto ativo |
| 8×8 | 1600×900 (16:9) | 16,5 ms | 17,8 ms | 242,6 ms | 2.046 / 1.513.419 | 47 tiros, contexto ativo |

Todos os processos usaram `WebGL2`, tier `padrao`, GPU
`ANGLE Metal Renderer: Apple M4 Pro`, sem software fallback, page error ou resposta
obrigatória falhando. O soak com pack real teve dois frames acima de 100 ms no
cenário 8×8/16:9, durante o primeiro uso de samples; o p95 permaneceu 17,8 ms. A lane
não altera o sistema de áudio, então o pico fica declarado como dívida herdada e não
é mascarado como aprovação de performance de áudio.

Capturas e medições reproduzíveis:

- `artifacts/campinho-main-r2/browser/campinho-5-1536x1024.png`
- `artifacts/campinho-main-r2/browser/campinho-5-1600x900.png`
- `artifacts/campinho-main-r2/browser/campinho-8-1536x1024.png`
- `artifacts/campinho-main-r2/browser/campinho-8-1600x900.png`
- JSON equivalente ao lado de cada PNG.

O pack local foi reduzido aos 66 arquivos alcançáveis e o manifesto local foi
regenerado somente para o teste: `audio:check` ficou verde com zero órfãos. Nada de
`public/audio/manifest.json` ou dos samples, todos ignorados, foi preparado para Git.
`eval:audioenvelope`, `eval:audioeventos` e `eval:audioruntimeassets` ficaram verdes.

## Build, publicação e teste humano

`npm run build` ficou verde. A primeira execução de `npm run check:deploy` passou
38/39 e parou apenas porque `eval:docsautoria` recusa medir documentação gerada ainda
não commitada; o rerun após o checkpoint documental é o próximo passo desta lane.

Servidor local ativo:

```sh
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/campinho-main-r2
npm run dev -- --host 127.0.0.1 --port 8173
```

- CTF: `http://127.0.0.1:8173/?debug=1&auto=P,mst&map=quebrada&perfilauto=0&ctf=1`
- mata-mata: `http://127.0.0.1:8173/?debug=1&auto=P,mst&map=quebrada&perfilauto=0`

Na revisão humana, percorrer os dois portões, contornar as duas margens, usar bancos
e muretas como proteção e confirmar que nenhum slot de spawn nasce preso. Comparar
3:2 e 16:9; as capturas técnicas não aprovam sozinhas ritmo, densidade ou leitura de
combate.

## Próximo passo

Commitar este ledger e os blocos gerados atuais, repetir `check:deploy`, atualizar o
resultado final, fazer push e abrir um draft PR que declare explicitamente que
supersede o #530. Não fazer merge nem deploy antes do playtest do dono.
