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
- Draft PR: [#579](https://github.com/corosolto/client/pull/579)
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

`npm run eval:obras` mede nove invariantes e executa um mutante adversarial por cláusula:

1. OBRAS1: duas torres, deck alto e nós alcançáveis;
2. OBRAS2: quatro bunkers e cobertura dos spawns;
3. OBRAS3: ao menos 24 colisores de meia altura;
4. OBRAS4: quatro gruas sem colisão dentro dos limites;
5. OBRAS5: miolo fechado, no máximo 30% dos pares livres por mais de 20 m;
6. OBRAS6: passagem sob o deck e suporte em cima dele;
7. OBRAS7: rotas oeste, centro e leste por spawn, com baixa sobreposição.
8. OBRAS8: os oito slots mantêm ao menos 1,20 m de folga de sólidos;
9. OBRAS9: cada spawn alcança cada bandeira térrea por ao menos duas rotas separadas.

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

Os mutantes `plano`, `sem-bunker`, `terreo-liso`, `sem-grua`, `miolo-aberto`, `deck-macico`, `rota-fechada`, `spawn-apertado` e `ctf-deck` falharam individualmente no gate esperado.

## Fechamento dos vermelhos remotos de 10/09

O job `build` do PR #579 (run `34465436988`, job `102832866214`) reproduziu dois
vermelhos próprios da candidata: `MAP2B` media 0,80 m nos slots `(10,±31)` e
`CTF2` encontrava uma única rota nos quatro pares envolvendo E/B. A comparação
na mesma base `origin/main@2115d5e2` deu 3,45 m/68,3 m² e quatro rotas, provando
que ambos nasceram nesta lane.

A bissecção geométrica encontrou duas causas:

- o slot x=10 estava a 0,80 m do saco de areia do bunker leste; ele foi movido
  para x=8, mantendo a formação e elevando a pior folga para 2,50 m no MAP2B;
- as bandeiras em `(-10,±14)` sobrepunham o footprint das torres. Como
  `nearestWaypoint(x,z)` é 2D, o alvo virava o deck de 2,8 m e todas as rotas
  convergiam na única rampa. Em `(-10,±18)` os alvos ficam no térreo e CTF2
  mede três a quatro rotas separadas em todos os pares.

Comandos causais verdes após a correção:

```sh
node tools/eval/map-check.mjs obras_prefeitura
npm run eval:obras
for m in plano sem-bunker terreo-liso sem-grua miolo-aberto deck-macico rota-fechada spawn-apertado ctf-deck; do
  node tools/eval/obras-check.mjs --mutar="$m" && exit 1 || true
done
```

Os novos mutantes reproduzem exatamente os dois defeitos: `spawn-apertado`
volta a 0,80 m e acende OBRAS8; `ctf-deck` volta a y=2,80 m/uma rota e acende
OBRAS9. Nenhum limiar ou gate global foi afrouxado.

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
- `npm run check:deploy`: 39/39 verde após os checkpoints e a regeneração documental.
- `npm run setup`: instalou dependências, áudio e decals, mas retornou vermelho por 17 arquivos de soundscape ausentes na alpha.246. O `eval:assetfetch` do `check:deploy` passou, portanto o débito é herdado e não foi corrigido nesta lane de mapa.

## Pendências e próximo passo

## Revalidação sobre a alpha.252 — 13/09/2026

A branch recebeu `origin/main@5c2c5c93e32d0dcc96abbdc93e5ae9c767054fed`
por merge normal, sem rebase nem force-push. Os conflitos eram somente blocos
gerados/documentação global, `package.json` e o registro Mint; a resolução tomou
a documentação da `main`, preservou os dois scripts `eval:obras*` e uniu as duas
entradas locais de assets às 15 entradas novas da Mansão.

Na base atual, antes da candidata, `map-check` mede MAP2B de 3,45 m/68,3 m² e
CTF2 com quatro rotas em todos os pares. Depois da candidata, MAP2B mede
2,50 m/56,8 m² e CTF2 mede no mínimo três rotas; portanto os dois contratos
continuam verdes na mesma alpha.252. A régua `OBRAS1..OBRAS9`, seus nove
mutantes e `eval:mapcontrato` também passaram após o merge. O build Astro passou
com Node 23.6.0.

`check:deploy` ficou 38/39 após regenerar os blocos documentais: o único vermelho
é UIR15 em `eval:redesign`. A execução idêntica em uma worktree destacada da
própria `origin/main@5c2c5c93e` reprova a mesma cláusula, e a lane não altera os
arquivos de resultado/personagem inspecionados por ela. Trata-se de dívida
herdada da base, não de exceção nem de limiar afrouxado.

1. Na alpha.252, `npm run check:deploy`: 38/39; somente UIR15 herdado, reproduzido na `origin/main`.
2. `npm run check:fast`: 134/135 verde; somente `audio:check` falhou porque `npm run setup` materializou 442 arquivos enquanto o manifest da alpha.246 declara 66. A lane não executou `npm run audio`, pois isso alteraria o domínio compartilhado de áudio. O gate causal `eval:obras` passou dentro dessa suíte.
3. Draft PR #579 aberto contra `main`; preservar esta branch sem merge/deploy.
4. O dono deve jogar a URL local em 5x5 e 8x8, testar as três rotas dos dois lados, subir nas duas torres e verificar CTF.
5. Só após aceite estrutural, abrir uma fase visual separada para escala/ancoragem da maquinaria, paleta, iluminação e identidade de prefeitura brasileira.

## Sincronização com a alpha.254 — 13/09/2026

A branch recebeu `origin/main@3a372fdd0a0d4dc3d0a3e84f18713a4cf58f01f1`
por merge normal. Os conflitos eram novamente blocos gerados e `package.json`;
a resolução tomou a documentação da base, preservou `eval:obras*`, incorporou
`eval:sonda` da main e regenerou os blocos.

Após a sincronização, `OBRAS1..OBRAS9` continuam verdes. O MAP2B próprio mede
2,50 m de folga e 56,8 m² de área contígua; o CTF2 mantém no mínimo três rotas
separadas em todos os pares. `docs:check` também passa. A atualização não altera
geometria nem relaxa nenhum gate; serve apenas para remover o conflito do draft
#579 e manter a candidata comparável à release atual.

## Revalidação sobre a alpha.262 — 22/09/2026

A branch recebeu `origin/main@60ad7501323ef076263f645bfca341e2454fce6b`
(`v2.0.0-alpha.262`) pelo merge normal `c762a3bbacef144a0a1fdaa6d5115d85a35a4836`,
sem rebase ou force-push. Os conflitos eram apenas blocos documentais gerados;
a resolução tomou a base atual e regenerou esses blocos, sem misturar mudanças
de runtime, materiais compartilhados ou outros mapas.

### Correções causais e orçamento

O replay na alpha.262 expôs dois defeitos próprios desta candidata:

- `MAP1` encontrava 14 amostras de corpo dentro de sólido, com pior penetração
  de 1,31 m. Uma rampa decorativa sem navegação atravessava o chão alcançável e
  quatro degraus de bunker usavam a cota do container em vez do terreno da porta.
  A rampa falsa foi removida; os degraus agora seguem o terreno local e têm
  0,27 m, abaixo do limite de passo. O replay mede zero corpo dentro e zero
  submerso.
- `MAP5` encontrava quadrantes periféricos com até 14,33 m sem prop. Treze pilhas
  baixas de material, feitas apenas com geometria e materiais já locais, cobrem
  esses setores sem fechar as rotas. O pior espaçamento caiu para 6,81 m, razão
  de props 0,79 e razão de waypoints 0,68.

As caixas decorativas repetidas passaram a reutilizar geometria e
`InstancedMesh` dentro de `map_obras.js`. No mesmo probe 5x5 DM, qualidade média,
as chamadas caíram de 1.367 para 1.185 e as geometrias de 1.454 para 757, sem
alterar o total de triângulos nem o contrato de colisão. A régua oficial
`CENA1..CENA4`, após 30 s de aquecimento, passou com 1.150/1.200 calls,
1.515.783/1.610.000 triângulos, 133,3 FPS e sem laço de exceção.

### Gates, bots e rotas

- `OBRAS1..OBRAS9`: verde; 2 torres, 20 nós altos alcançáveis, 48 nós de deck,
  4 bunkers, 61 colisores de meia altura, 4 gruas, 23,5% dos pares longos livres,
  três rotas por lado e pior folga de spawn 2,45 m.
- Os nove mutantes `plano`, `sem-bunker`, `terreo-liso`, `sem-grua`,
  `miolo-aberto`, `deck-macico`, `rota-fechada`, `spawn-apertado` e `ctf-deck`
  continuam vermelhos no contrato esperado.
- `eval:mapcontrato`: 320 nós, 1.763 arestas, rota válida e grafo conectado.
- `map-check`: MAP1 0/0; MAP2 exposição E 40,1% e B 32,1%, linhas máximas
  68,3/67,7 m; MAP2B 2,50 m e 54,7 m²; MAP4 zero; MAP5 6,81 m; CTF2 mínimo
  de três rotas separadas.
- `eval:ctfwin`: três bandeiras declaradas e rodada encerrada exatamente na
  terceira captura.

Bots determinísticos, 60 s por célula:

| Célula | stuck | spinRoam | eficiência |
|---|---:|---:|---:|
| 5x5 DM | 3,256% | 0,091 | 0,159 |
| 5x5 CTF | 2,633% | 0,084 | 0,176 |
| 8x8 DM | 2,511% | 0,079 | 0,158 |
| 8x8 CTF | 1,644% | 0,062 | 0,171 |

### Matriz WebGL final

O harness agora entra pelo fluxo real dos menus e cobre DM/CTF, 5x5/8x8 e as
duas proporções. As oito células carregaram o mapa, 2 torres, 4 bunkers, os dois
GLBs por HTTP 200 e, em CTF, três pontos. Nenhuma célula teve erro de página ou
frame acima de 100 ms.

| Célula | p95 | Calls | Triângulos | Geometrias |
|---|---:|---:|---:|---:|
| 5x5 DM · 3:2 média | 10,0 ms | 1.170 | 1.597.389 | 764 |
| 5x5 CTF · 3:2 média | 10,0 ms | 1.188 | 1.614.634 | 770 |
| 8x8 DM · 3:2 média | 9,8 ms | 1.262 | 1.743.480 | 775 |
| 8x8 CTF · 3:2 média | 9,6 ms | 1.257 | 1.757.265 | 784 |
| 5x5 DM · 16:9 baixa | 9,6 ms | 679 | 758.269 | 743 |
| 5x5 CTF · 16:9 baixa | 9,5 ms | 729 | 775.785 | 752 |
| 8x8 DM · 16:9 baixa | 9,5 ms | 750 | 843.329 | 757 |
| 8x8 CTF · 16:9 baixa | 10,0 ms | 737 | 840.858 | 763 |

Evidência ignorada pelo Git: `artifacts/obras-prefeitura/alpha262-final-r2/`.
O `receipt.json` tem SHA-256
`5e5af680ab9ce66fedeeb1b0731bb46f1c5c6152073b3554b1f4f35099aa3653` e
registra `map_obras.js` com SHA-256
`25f32325d92dd014a33992a76004f5193c1cd9296dfebfa59ee3c8fd71f80dad`.
Os contact sheets 3:2 e 16:9 têm SHA-256
`1f193f9bd5d79f383f451db48ee51b9715d54a91d2ad80b598d940aa55f21458` e
`8cd7d329d1e7d08b3ad4645d2d1dbfefaed1920b7815096c104b9e4e6eaffef8`.

### Dívidas separadas do GO técnico

Esta candidata está tecnicamente pronta para playtest, mas ainda não tem aceite
visual/jogável humano. As capturas deixam explícitas quatro dívidas:

- exposição dos spawns ainda é alta (40,1%/32,1%) e as linhas máximas chegam a
  aproximadamente 68 m; a defesa real precisa ser julgada em combate;
- escavadeiras, sucata e algumas máquinas do perímetro têm escala dominante e
  leitura aparente de suspensão;
- superfícies grandes continuam planas e proceduralmente limpas, com repetição
  de formas e pouca variação de obra brasileira;
- a visão aérea é visualmente carregada, enquanto algumas rotas térreas ainda
  parecem abertas apesar de MAP5, OBRAS5 e CTF estarem verdes.

Nenhum asset novo foi gerado e a licença/proveniência dos dois GLBs Mint continua
inalterada e registrada. Uma futura passada Astra+Mint deve ser uma branch de
arte separada, com asset manifest e comparação antes/depois; não deve reabrir a
geometria estrutural aprovada sem um gate causal.

`docs:check`, `arch:check` e `npm run build` passaram na alpha.262. O
`check:deploy` passou 39/40; o único vermelho continua sendo `UIR15` em
`eval:redesign`, já herdado da base e fora do escopo desta lane. O diff contra
`origin/main` não toca `game.js`, `main.js`, DOM ou CSS do resultado inspecionado
por esse gate. Por isso o push normal pode exigir `--no-verify`; isto não torna
`UIR15` verde nem autoriza reduzir a régua.

Playtest mínimo do dono: abrir
`http://127.0.0.1:8157/?debug=1&map=obras_prefeitura&perfilauto=0`, jogar 5x5 DM
pelas três rotas nos dois sentidos, depois 8x8 CTF, subir nas duas torres, passar
sob os dois decks e verificar exposição, escala/apoio das máquinas e legibilidade
dos corredores em 3:2 e 16:9.
