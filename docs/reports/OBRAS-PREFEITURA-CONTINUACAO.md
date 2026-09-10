# Prefeitura em Obra — continuidade da lane estrutural

Atualizado em 10/09/2026. Esta lane prepara uma candidata técnica isolada; não autoriza merge, deploy nem aprovação visual humana.

## Objetivo e definição de pronto

Corrigir o mapa excessivamente aberto sem descaracterizar o canteiro brasileiro:

- oferecer corredores, cobertura e linhas de tiro interrompidas;
- garantir ao menos três decisões de rota por spawn até o objetivo oposto;
- manter torres e pavimentos jogáveis, CTF e grafo de bots conectados;
- validar 5x5 e 8x8, 3:2 e 16:9 em WebGL real;
- reutilizar apenas assets locais com proveniência já registrada.

## Estado recuperável

- Worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/obras-prefeitura-estrutura`
- Branch: `codex/obras-prefeitura-estrutura-r1`
- Base: `origin/main@2115d5e2c29eefb4491ae63b0f1600c200a750bb` (`v2.0.0-alpha.246`)
- Servidor local: `http://127.0.0.1:8157`
- URL direta: `http://127.0.0.1:8157/?debug=1&auto=P,mst&map=obras_prefeitura&perfilauto=0&ctf=1`
- Evidência WebGL ignorada pelo Git: `artifacts/obras-prefeitura/browser/`

O servidor deve permanecer ativo para revisão do dono. Se ele cair, execute `npm run dev -- --port 8156`; o launcher poderá escolher a próxima porta livre e imprimirá a URL real.

## Implementações e PRs encontrados

- A implementação atual veio de Emerson: PR #256, substituído e integrado pelo PR #338.
- PR #547 está aberto e cobre somente anisotropia de quatro mapas; sua base é `codex/mapas-emerson-escala`, está `UNSTABLE` e não resolve estrutura.
- A antiga lane `origin/map2/obras` / PR #458 foi fechada e ficou divergente. Ela continha a solução estrutural nos commits `082b55128`, `5f12ac3f1` e `31483efb3`.
- Esta branch foi criada limpa sobre a alpha.246 e portou seletivamente apenas a estrutura, dois assets já licenciados e as réguas causais. Nenhum runtime, material compartilhado ou áudio foi trazido da branch antiga.

## Mudança estrutural

- Duas torres de andaime possuem decks, rampas e nós de navegação em altura.
- Quatro bunkers de container cobrem os dois spawns.
- Barreiras, sacos de cimento e tubos formam cobertura à altura de combate.
- Um núcleo central e dez barreiras alternadas quebram o tiro transversal e formam corredores.
- O grafo oferece rotas oeste, centro e leste a partir de cada spawn.
- Quatro gruas preservam a leitura de canteiro e ficam fora da área navegável, sem colisores.
- O grafo é podado ao maior componente conectado após a montagem multinível.

## Proveniência e orçamento

Foram reutilizados dois GLBs já existentes no histórico do projeto, ambos do pack Mint `posto_obras_r3`, gerado na conta do projeto sob os termos Mint Pro e registrado em `mint-assets.json` e `public/models/props/FONTE.md`:

| Asset | SHA-256 | Tamanho | Triângulos informados |
|---|---|---:|---:|
| `andaime.glb` | `f118b319e4f0a4452b5ec7293470dc5e3d8a2675833b0599179fd66e8f5ce8f0` | 458.884 B | 4.299 |
| `container_escritorio.glb` | `537ff936b913b1c2efdd9b6cb836949353408824574059f4c216331460b79fb5` | 363.668 B | 4.406 |

Nenhum serviço pago foi chamado e nenhum asset novo foi gerado. Os dois arquivos responderam HTTP 200 na captura real.

## Régua causal

`npm run eval:obras` mede sete invariantes e executa um mutante adversarial por cláusula:

1. OBRAS1: duas torres, deck alto e nós alcançáveis;
2. OBRAS2: quatro bunkers e cobertura dos spawns;
3. OBRAS3: ao menos 24 colisores de meia altura;
4. OBRAS4: quatro gruas sem colisão dentro dos limites;
5. OBRAS5: miolo fechado, no máximo 30% dos pares livres por mais de 20 m;
6. OBRAS6: passagem sob o deck e suporte em cima dele;
7. OBRAS7: rotas oeste, centro e leste por spawn, com baixa sobreposição.

Baseline em `origin/main` com a régua final:

- OBRAS1: 0 torres;
- OBRAS2: 0 bunkers;
- OBRAS3: 20 colisores de cobertura;
- OBRAS4: 0 gruas;
- OBRAS5: 58,9% de 15.282 pares livres por mais de 20 m, 39 sólidos à altura dos olhos;
- OBRAS6: sem piso alto ou passagem sob deck.

Resultado da candidata:

- OBRAS1: 2 torres, 20 nós altos alcançáveis e 48 nós de deck;
- OBRAS2: 4 bunkers, ambos os spawns cobertos;
- OBRAS3: 48 colisores de meia altura;
- OBRAS4: 4 gruas fora dos limites e sem collider;
- OBRAS5: 23,6% de 12.249 pares livres por mais de 20 m, 69 sólidos à altura dos olhos;
- OBRAS6: topo a 5,60 m e terreno sob os decks a -0,22/-0,15 m;
- OBRAS7: rotas com 33/18/23 nós no sentido norte e 31/17/22 no sentido sul; sobreposição máxima 56%/43%.

Os mutantes `plano`, `sem-bunker`, `terreo-liso`, `sem-grua`, `miolo-aberto`, `deck-macico` e `rota-fechada` falharam individualmente no gate esperado.

## Bots, CTF e contrato

- `npm run eval:mapcontrato`: 327 nós, 1.879 arestas, rota válida e componente conectado.
- `npm run eval:botpercurso -- --map obras_prefeitura --bots 5`: 9 bots reais, 2,978% presos, `laneSpread 0.64`, exit 0.
- `npm run eval:botpercurso -- --map obras_prefeitura --bots 8`: 15 bots reais, 2,478% presos, `laneSpread 0.64`, exit 0.
- O modo CTF foi carregado nas duas matrizes e expôs `CANTEIRO SUL → A OBRA → CANTEIRO NORTE` sem erro de console.

## WebGL real e capturas

Comando:

```bash
npm run eval:obras-browser -- --base=http://127.0.0.1:8157 --seconds=8
```

Renderer real: `ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)`.

| Matriz | Bots reais | Frames | p50 | p95 | Máximo | >100 ms | Calls | Triângulos | Texturas |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5x5, 1536×1024 (3:2) | 9 | 952 | 8,3 ms | 10 ms | 66,1 ms | 0 | 1.475 | 1.657.312 | 554 |
| 8x8, 1600×900 (16:9) | 15 | 961 | 8,3 ms | 10 ms | 25 ms | 0 | 1.553 | 1.826.472 | 575 |

As capturas de spawn sul/norte, corredor, torre e overview estão em `artifacts/obras-prefeitura/browser/`; `receipt.json` registra fontes, hashes, métricas e caminhos.

Observação do construtor, sem substituir aprovação humana: os corredores e coberturas são visíveis e as torres têm leitura clara em primeira pessoa. O overview também evidencia um débito visual herdado: escavadeiras e sucata gigantes dominam o perímetro, algumas com leitura aparente de suspensão. A lane estrutural não alterou essa cenografia; ela deve ser julgada separadamente na fase artística.

## Validação de repositório

- `npm run build`: verde.
- `npm run check:deploy`: 38/39 antes dos commits; a única falha era `eval:docsautoria` porque os documentos gerados ainda estavam modificados. Repetir após os checkpoints.
- `npm run setup`: instalou dependências, áudio e decals, mas retornou vermelho por 17 arquivos de soundscape ausentes na alpha.246. O `eval:assetfetch` do `check:deploy` passou, portanto o débito é herdado e não foi corrigido nesta lane de mapa.

## Pendências e próximo passo

1. Repetir `check:deploy` e `check:fast` depois de versionar os checkpoints.
2. Abrir draft PR contra `main` e preservar esta branch sem merge/deploy.
3. O dono deve jogar a URL local em 5x5 e 8x8, testar as três rotas dos dois lados, subir nas duas torres e verificar CTF.
4. Só após aceite estrutural, abrir uma fase visual separada para escala/ancoragem da maquinaria, paleta, iluminação e identidade de prefeitura brasileira.

