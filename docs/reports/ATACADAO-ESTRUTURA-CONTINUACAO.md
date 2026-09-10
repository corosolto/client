# Atacadão da Treta — continuação da revisão estrutural

Atualizado em 10/09/2026. Esta é a fonte de continuidade da lane isolada do
Atacadão. Ela não autoriza merge nem deploy e não substitui a aprovação visual
humana.

## Objetivo e definição de pronto

Converter o salão aberto da `origin/main` em um atacarejo brasileiro jogável:
corredores de rack, caixas, seções, doca e coberturas com três decisões de rota
por spawn, CTF equilibrado, bots funcionais e custo WebGL comparável à base.

A lane fica tecnicamente pronta quando:

- o contrato causal `ATA1..ATA10` passa e os sete mutantes são mortos;
- 5x5 em 3:2 e 8x8 em 16:9 passam no Chrome/WebGL real;
- p95 fica no máximo 10% acima da main e nenhum frame passa de 100 ms;
- build, contrato de mapas, pickups, CTF e bots passam;
- fontes e hashes dos assets locais ficam rastreáveis;
- o dono revisa as capturas e joga a URL local antes de promover o PR.

## Topologia

- worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/atacadao-estrutura-r1`
- branch: `codex/atacadao-estrutura-r1`
- base verificada: `origin/main@2115d5e2c29eefb4491ae63b0f1600c200a750bb`
- PR draft: [#582](https://github.com/corosolto/client/pull/582)
- preview da base: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/previews/atacadao-main-2115d5e`
- candidata local: `http://localhost:8161/?debug=1&auto=P,mst&map=atacadao_treta&perfilauto=0&ctf=1`
- base local: `http://localhost:8163/?debug=1&auto=P,mst&map=atacadao_treta&perfilauto=0&ctf=1`

## Inventário de autoria e PRs

- Emerson abriu o mapa no PR #253, que foi fechado sem merge.
- O PR #271 recuperou esse trabalho e foi mergeado em `8071cf9f07dc`.
- O PR draft #459 (`map2/atacadao`, fechado e conflitante) continha a revisão
  estrutural. Esta lane portou seletivamente o mapa final de
  `2158625ef9f46cfc74edff67c967fa80331f9f6b`, preservando a autoria e removendo
  dependências que não existem na alpha.246.
- O PR #562 está aberto e limpo em `efda5185d0bf315a515c664d3ff6c414aa796535`.
  Ele é uma correção empilhada de escala/UV para Posto e Atacadão, não resolve o
  salão aberto. O hunk do Atacadão deve ser reconciliado no review; a parte do
  Posto continua independente.

Commits históricos usados como evidência do desenho: `a3325b81d` (racks e LOS),
`a9822f5b4` (doca, bandeira E e estacionamento), `b9af467aa`, `7820ebf90` e
`e6cbbbf1e` (superfícies, seções e contratos). Não houve merge do ramo antigo.

## Baseline vermelha e resultado estrutural

O `tools/eval/atacadao-check.mjs` foi executado contra a alpha.246 antes do
porte. A base tinha zero racks/corredores, zero covers, zero freezers, zero
seções e zero caixas; a LOS média era 14,17 m, acima do teto causal de 10,50 m.

Resultado atual:

- 6 fileiras, 48 módulos e 4 corredores paralelos de 4,1 m;
- 12 covers de peito com colisão;
- 6 freezers, 15 luminárias e 17 luzes locais de galpão/seções/parede fria;
- 5 seções e 6 caixas acessíveis;
- 11 superfícies grandes com textura própria;
- todos os oito spawns alcançam oeste, centro e leste; sobreposição máxima 60%;
- MID em `(-1,6, -1,6)`: 44,4 m do time E e 43,0 m do time B, diferença 3,2%;
- 265 nós, 1.038 arestas, grafo conectado; 66 pickups válidos.

O detalhe repetido usa `PropBatch`. Há um rack GLB hero por cabeceira e módulos
procedurais no miolo. Isso mantém a silhueta, os colliders e a leitura de estoque,
sem repetir o custo do mesmo molde 48 vezes.

## Assets e proveniência

Nenhum serviço pago foi chamado. Foram recuperados sete assets locais já
produzidos e registrados no ramo histórico. `mint-assets.json` e
`public/models/props/FONTE.md` carregam os identificadores e o processo.

| Arquivo | Origem | SHA-256 |
| --- | --- | --- |
| `estante_pallets.glb` | Mint pack `atacadao_r3` | `7c49c3a17a7118437fd4804397305c6a024e6c5d3da1ac7a99e2f11735c14368` |
| `freezer.glb` | Mint pack `atacadao_r3` | `86d7cbd7f7b9441d26576cec93b8364b3239f41fd21649d93d166cf75d0d077e` |
| `ilha_caixas.glb` | Mint pack `atacadao_r3` | `d8332cc0d92c122abe01d9a840eac85e1e4fe7b4085dda3244f1e58d766e4c5b` |
| `balcao_acougue.glb` | Replicate, conta do dono | `54162fc6a9f5151f2264de2c4df63388508cee5b327b1efc3a91e8e45f3698e3` |
| `balcao_padaria.glb` | Replicate, conta do dono | `8f2a25fa9c02b2d5958c48353a2a645a0c7931657098d32dc01c518ee0fc4242` |
| `ilha_hortifruti.glb` | Replicate, conta do dono | `01d1c0736151491050b15dde70085133894d343850787e9d24ad42f0d51422ad` |
| `geladeira_bebidas.glb` | Replicate, conta do dono | `0521658c629dd048f0be681cbbf41505c016ec9f9d0a647192c9d21e018563bd` |

Os moldes históricos reprovados `balcao_peixaria`, `cancela_estacionamento` e
`lava_rapido` continuam ausentes. Os equivalentes são procedurais.

## Gates e evidência

Comandos verdes:

```sh
npm run eval:atacadao
for mutant in sem-racks aberto sem-secoes sem-caixas cinza rota-fechada mid-antigo; do
  node tools/eval/atacadao-check.mjs --mutar="$mutant" && exit 1 || true
done
npm run eval:mapcontrato -- --map=atacadao_treta
npm run eval:pickuparma -- --map=atacadao_treta
SIM_TEAM_SIZE=5 SIM_CTF=1 node tools/eval/botsim.mjs 60 atacadao_treta
SIM_TEAM_SIZE=8 SIM_CTF=1 node tools/eval/botsim.mjs 60 atacadao_treta
npm run build
npm run eval:atacadao-browser:compare
npm run check:deploy
```

Bots: 5x5 teve 2,411% de stuck, 0,038 spinRoam e 0,64 laneSpread; 8x8 teve
2,289%, 0,037 e 0,64. Ambos saíram com código zero.

`check:deploy`: 39/39 passos verdes. `check:fast`: 134/135 verdes; a única
falha foi `audio:check`, com `442 arquivos no disco · 66 alcançáveis pelo
manifest · 376 órfãos` e `manifest.json DEFASADO em relação ao disco`. Esse
estado nasce do setup global da alpha.246 e não foi corrigido nesta lane para
preservar a fronteira de áudio.

Chrome/ANGLE Metal no Apple M4 Pro, build estático:

| Matriz | p95 main | p95 candidata | Draws main → candidata | Tris main → candidata | >100 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| 5x5, 1536×1024, médio | 9,8 ms | 10,4 ms | 1.420 → 1.239 | 1.553.707 → 2.085.638 | 0 → 0 |
| 8x8, 1600×900, baixo | 9,9 ms | 9,8 ms | 830 → 868 | 780.552 → 1.099.673 | 0 → 0 |

Recibos ignorados pelo Git:

- `artifacts/atacadao/browser/baseline/receipt.json`, SHA-256
  `e124c2e87db26d571c4e27fca626002341973ecc12f1620bee0001e769da8f57`
- `artifacts/atacadao/browser/candidate/receipt.json`, SHA-256
  `6a211cffbba97d887761fd176409f8b1b49552595a636b819a6a8006aa9d5a99`
- 12 capturas de base e 12 da candidata, cobrindo estacionamento, caixas,
  corredor oeste, corredor central, doca e overview nas duas matrizes.

Observação do construtor: estacionamento, frente de caixa, três corredores e
doca aparecem sem clipping nas capturas finais; a cobertura do galpão domina o
overview externo como esperado. Isso ainda requer avaliação visual do dono.

## Limites e próximo passo

- A alpha.246 falha no setup por 17 arquivos globais de soundscape ausentes.
  Esta lane não altera áudio. O Atacadão fica em silêncio fail-closed e preserva
  a fauna visual, sem música ou voz genérica.
- `tools/inspect-glb.mjs` não registra `EXT_texture_webp` no `NodeIO` e por isso
  rejeita estes sete GLBs antes de ler a malha. A estrutura foi conferida por
  parser direto do contêiner (glTF 2, uma malha por arquivo, 4.424–22.158 tris),
  e o Chrome carregou e renderizou todos com HTTP 200. O inspetor não foi alterado.
- O máximo de 84,1 ms observado na amostra 5x5 ficou abaixo do teto de 100 ms,
  mas o p95 é o comparador principal e passou com +6,1%.
- O próximo passo é o dono jogar 5x5 e 8x8 na URL candidata, conferir largura
  dos corredores, exposição do MID e acesso à doca. Só após esse aceite o PR
  pode sair de draft e ser ordenado em relação ao #562.
