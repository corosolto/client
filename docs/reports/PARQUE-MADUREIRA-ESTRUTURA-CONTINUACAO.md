# Parque Madureira — continuação estrutural e visual

Atualizado em 13/09/2026. Este é o ledger da lane isolada que mantém o id e o
nome compatíveis (`parque_treta`, **Parque da Treta**) e apresenta o lugar no
cenário como **Parque Madureira**.
Não autoriza merge/deploy e não substitui a revisão visual e de gameplay do dono.

## Objetivo e definição de pronto

Reautorizar o parque aberto e genérico como um parque urbano carioca disputado:
identidade de Madureira, marcos de diversão, três escolhas de rota, cobertura de
base e de miolo, CTF, bots 5x5/8x8, ambiência, custo WebGL medido e capturas reais
em 3:2 e 16:9.

A lane fica pronta para revisão quando:

- `PKE1..PKE7`, `PV1..PV6`, canopy e brinquedos passam, com mutantes que provam
  que as réguas mordem;
- MAP1/MAP2B/MAP5 e CTF1/CTF2 passam no mundo construído pelo jogo;
- 5x5 e 8x8 mantêm grafo conexo e bots sem travamento material;
- Chrome real carrega os seis GLBs por HTTP 200, sem erro de página, e passa os
  orçamentos em 1536x1024 e 1600x900;
- assets, licenças, hashes, recibos e dependências não versionadas ficam explícitos;
- o dono percorre as três faixas e aprova os enquadramentos antes da promoção.

## Topologia e estado recuperável

- worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/parque-estrutura-r1`
- branch: `codex/parque-estrutura-r1`
- base integrada por fast-forward normal: `origin/main@3a372fdd0a0d4dc3d0a3e84f18713a4cf58f01f1`
- checkpoints: `810e0372dacf4a9d585e7d702616c1d04df404de` e
  `beeb6d43ef5f36e91df42a8e6dc1b6180c922fe5`
- candidata local: `http://127.0.0.1:8165/?debug=1&auto=P,mst&map=parque_treta&perfilauto=0&ctf=1`
- recibos/capturas locais: `artifacts/parque/browser/`
- aprovação humana: pendente

O trabalho visual foi recuperado do ramo histórico
`origin/codex/mapas-parque-madureira@6f8c892ef`. Nenhum serviço pago foi chamado
nesta retomada. Os moldes já existentes foram portados seletivamente e o runtime
compartilhado de props não foi alterado.

## Resultado produzido

- A sinalização passa a ler **Parque Madureira**. Id e nome de catálogo continuam
  `parque_treta`/`Parque da Treta` para preservar links, estatísticas e personalidade.
- O entorno fecha o quarteirão com oito prédios art déco e alameda de palmeiras;
  o interior tem roda gigante, carrossel, coreto, castelo, trilho, barracas,
  bilheterias, bancos, lixeiras, postes e vegetação tropical.
- Quatro bilheterias sólidas protegem os spawns; oito coberturas de base e quatro
  jardins centrais quebram as linhas de tiro.
- Oeste, centro e leste continuam alcançáveis pelos dois times. O mapa tem 394
  nós, 2.258 arestas e um único componente conectado.
- Quatro slots por time têm folga mínima de 2,70 m e distância mínima de 6,00 m.
- Há rato, pombas, cachorro e papagaio; pássaros e vento formam os loops de fundo.
- Prédios e barracas repetidos usam `PropBatch`; roda, base, carrossel e coreto
  continuam únicos e animáveis.

## Geometria, rotas e CTF

Resultado de `npm run eval:parque` e do map-check global:

| Contrato | Resultado |
| --- | --- |
| MAP1 | 0 pontos com corpo dentro de sólido |
| MAP2 | exposição distante E 26,7%; B 27,5% |
| MAP2B | folga mínima 2,75 m; área contígua mínima 58,7 m² |
| MAP5 | pior espaçamento 6,33 m; pior razão prop 0,78x; waypoint 0,73x |
| CTF1 | altura do triângulo 4,79 m |
| CTF2 | mínimo de 3 rotas separadas; pares entre 3 e 4 |

`PKE1..PKE7` passam. Os mutantes `aberto`, `sem-madureira`, `sem-central`,
`rota-fechada`, `ctf-convergente`, `spawn-apertado` e `sem-ambiencia` acendem
ao menos a cláusula correspondente. `PV1..PV6` passam e os mutantes
`sem-coreto`, `sem-vegetacao`, `sem-variedade` e `sem-moldes` são mordidos.

Bots CTF, 30 s, média determinística:

| Matriz | bots reais | stuck | eficiência | lane spread | spin roam |
| --- | ---: | ---: | ---: | ---: | ---: |
| 5x5 | 9 | 2,711% | 0,520 | 0,64 | 0,067 |
| 8x8 | 15 | 1,056% | 0,555 | 0,64 | 0,039 |

Os avisos de áudio nesse arnês são esperados: `botsim` substitui `fetch` por uma
falha de rede intencional e não mede reprodução sonora.

## Chrome/WebGL real

`npm run eval:parque-browser` abriu Chrome/ANGLE Metal no Apple M4 Pro, carregou os
seis GLBs por HTTP 200 e produziu seis vistas por matriz: spawn sul, rota oeste,
praça central, rota leste, spawn norte e overview.

| Matriz | p50 | p95 | máximo | >100 ms | draw calls | triângulos |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 5x5, 1536x1024, médio | 8,3 ms | 9,9 ms | 10,4 ms | 0 | 749 | 1.211.214 |
| 8x8, 1600x900, baixo | 8,3 ms | 9,9 ms | 10,4 ms | 0 | 450 | 636.363 |

O boot mediu WebGL2 real, 394 nós, três pontos CTF, 16 wrappers hero, quatro
bilheterias, doze peças de cobertura e quatro tipos de fauna. Não houve erro de
página ou HTTP inesperado. O recibo final é
`artifacts/parque/browser/receipt.json`, SHA-256
`707d843d9b10da0a979c7aa2d45507787218068b768eb9ea8098770a27e36bab`.
Os artefatos ficam ignorados pelo Git para não inflar o repositório.

## Assets locais e proveniência

As seis entradas abaixo já existiam no ramo histórico e agora estão preservadas
em `mint-assets.json`, com asset id, chat de origem, processamento e hash. Nesta
retomada não houve nova chamada a Mint ou Astra.

| Arquivo | SHA-256 |
| --- | --- |
| `parque_coreto.glb` | `7278c6deb242234459b27c966af1d92afc0fcf425901075d99f237c29e194ae0` |
| `roda_gigante_roda.glb` | `b5ba3713bb23cdbb3b617d691532adf79b2e9b31683413d5d5f6df39a2fa205f` |
| `roda_gigante_base.glb` | `cbe7321c54a64f87a5935ee4718f5c5e9de3ad595b652092dc3053015a947792` |
| `carrossel.glb` | `0a96f3a605ef36eefe8aa483c13c610391525144bdf96916da5f6f735843c340` |
| `barraca_quermesse.glb` | `bef57d0ea1310119356cb9104c0d916fdcf6f7b82b9981f18136e4405bc3f204` |
| `predio_artdeco.glb` | `54772ff857273da0630f46d9fe7b0f67dfbc3dad71ed123eb1f085e7ca7717cc` |

O céu local `sky_parque.webp` tem SHA-256
`a5c8f4e5de530cfedeecfcd0652fce15bde84fdb76cbdc4b7e5ca5b5104ff799`.

Os sete MP3 de natureza usados na prova local são os mesmos CC0 documentados em
`SERTAO-AUDIO-PENDENCIAS.md` (Freesound, URLs e hashes já auditados). Todos
responderam HTTP 200 na candidata. `public/audio/` é ignorado pelo Git; portanto
eles **não fazem parte deste commit** e precisam entrar no próximo audio-pack.
O navegador provou disponibilidade na máquina de revisão, não distribuição em
clone limpo ou produção.

## Gates e dívida herdada

Comandos verdes:

```sh
npm run eval:parque
npm run eval:parquewheel
node tools/eval/map-check.mjs all
npm run eval:mapcontrato
SIM_CTF=1 SIM_TEAM_SIZE=5 node tools/eval/botsim.mjs 30 parque_treta
SIM_CTF=1 SIM_TEAM_SIZE=8 node tools/eval/botsim.mjs 30 parque_treta
npm run eval:parque-browser
npm run build
npm run docs
npm run docs:check
```

O `check:deploy` passa todos os passos próprios do mapa e conserva um vermelho
global: UIR15 em `eval:redesign`. A mesma UIR15 foi reproduzida em worktree
destacada da própria `origin/main@3a372fdd0`; ela mede arte estática de resultado
e não toca nenhum arquivo alterado por esta lane. Nenhuma exceção ou teto foi
reduzido para obter verde.

O `check:fast` executa `eval:parque` e o deixa verde. Os vermelhos amplos restantes
são dívidas externas reproduzíveis: `eval:mapid` encontra o id legado `fy_mansao`
em `docs/reports/JOA-MAIN-R2.md:39` tanto aqui quanto na mesma `origin/main`; UIR15
é a falha acima; e `audio:check` continua vermelho porque o pacote ignorado pelo
Git está divergente/ausente. Com os sete MP3 locais presentes, `eval:audioproc`
passa e somente o inventário do pack reprova. `eval:amazonia`, que falhara com um
`node_modules` emprestado de outra worktree, passou após `npm ci` local.

## Próximo passo

1. Jogar a URL local em 5x5 e 8x8, atravessando oeste, centro e leste pelos dois
   lados e disputando as três bandeiras.
2. Avaliar se as bilheterias protegem sem travar a saída, se o miolo tem cobertura
   suficiente e se roda/carrossel/coreto dominam a leitura sem poluir a mira.
3. Ouvir pássaros, vento e eventos de fauna com combate ativo; aprovar volume e
   distância separadamente da aprovação visual.
4. Só após aceite humano promover o PR draft. Merge e deploy permanecem fora do
   escopo desta lane.
