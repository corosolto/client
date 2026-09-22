# Atacadão da Treta — continuação da revisão estrutural

Atualizado em 22/09/2026. Esta é a fonte de continuidade da lane isolada do
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
- base verificada: `origin/main@60ad7501323ef076263f645bfca341e2454fce6b`
- PR draft: [#582](https://github.com/corosolto/client/pull/582)
- preview da base: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/previews/atacadao-main-2115d5e`
- candidata local: `http://127.0.0.1:8161/?debug=1&map=atacadao_treta&perfilauto=0`
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
procedurais instanciados no miolo. Cada um dos 48 módulos preserva um marcador e
colisor autoritativo próprio; as malhas visuais repetidas compartilham geometria e
`InstancedMesh`. Isso mantém a silhueta, a causalidade dos mutantes e a leitura de
estoque sem repetir os buffers e draw calls de cada peça.

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

### Revalidação sobre a alpha.252 — 13/09/2026

A branch recebeu `origin/main@5c2c5c93e32d0dcc96abbdc93e5ae9c767054fed`
por merge normal, sem rebase nem force-push. A única colisão de runtime foi no
import de `map_atacadao.js`: a resolução preserva `PropBatch` da candidata e
incorpora `aplicaSombraSol` da qualidade adaptativa que entrou na `main`. Os
conflitos globais tomaram a documentação da base; `package.json` preserva os
três scripts `eval:atacadao*`, e o registro Mint une os sete assets desta lane
às 15 entradas novas da Mansão.

Na alpha.252, a candidata passa MAP2B com 1,85 m/45,0 m², CTF2 com no mínimo
duas rotas, MAP5 com pior espaçamento de 5,16 m, `ATA1..ATA10`, os sete
mutantes, `eval:mapcontrato` e o build Astro. A base atual continua medindo
1,50 m/52,1 m² e CTF2 mínimo 2, portanto o contrato próprio segue preservado e
o mapa melhorou a densidade estrutural sem criar o antigo vermelho remoto.

Depois de regenerar os blocos documentais, `check:deploy` tem como único
vermelho esperado UIR15 em `eval:redesign`. A mesma cláusula reprova em uma
worktree destacada da própria `origin/main@5c2c5c93e`; a lane não altera os
arquivos de resultado/personagem medidos por ela. Nenhuma exceção ou teto foi
mudado.

### Auditoria dos vermelhos remotos de 10/09

O `build` do PR #582 (run `34473233511`, job `102857869756`) terminou vermelho
em `MAP2B`, mas a comparação causal distingue o mapa da lane do estado da base:

| Estado | Atacadão MAP2B | Atacadão CTF2 | Vermelho global |
| --- | --- | --- | --- |
| `origin/main@2115d5e2` | 1,50 m / 52,1 m² | mínimo 2 | Escadão 0,85 m |
| PR #582 `db5e51c14` | 1,85 m / 45,0 m² | mínimo 2 | Escadão 0,85 m |

Os comandos foram idênticos e direcionados:

```sh
node tools/eval/map-check.mjs atacadao_treta
node tools/eval/map-check.mjs escadao
```

O CI da própria `main` no mesmo SHA, run `34402769523`, também falha MAP2B e
lista somente os quatro slots do Escadão. Portanto o Atacadão não introduz o
vermelho: melhora a folga e preserva duas ou mais rotas. O `portao-browser`
também falha em `eval:select` tanto nos PRs #579/#582 por 14 personagens contra
o teto global de 12; os mapas não alteram seleção, personagens ou viewmodels.
Não foi feita exceção em `KNOWN-RED`, nem alteração de régua para obter verde.

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

## Sincronização com a alpha.254 — 13/09/2026

A branch recebeu `origin/main@3a372fdd0a0d4dc3d0a3e84f18713a4cf58f01f1`
por merge normal. Os blocos documentais gerados vieram da base atual; os três
scripts `eval:atacadao*` e a inclusão de `eval:atacadao` em `check:fast` foram
preservados junto ao novo `eval:sonda`. Não houve rebase, force-push, relaxamento
de régua ou mudança adicional de geometria.

Nesta base, `ATA1..ATA10` continuam verdes. A medição direcionada mantém MAP2B
em 1,85 m/45,0 m², MAP5 em 5,16 m e CTF2 com no mínimo duas rotas independentes.
Assim, a sincronização resolve a divergência da branch sem mascarar as falhas
globais herdadas já documentadas.

## Fechamento técnico sobre a alpha.262 — 22/09/2026

A branch recebeu `origin/main@60ad7501323ef076263f645bfca341e2454fce6b`
por merge normal, sem rebase ou force-push. Os únicos conflitos eram blocos
documentais gerados; a resolução tomou os blocos atuais da `main`, e `npm run
docs`/`npm run arch` os regeneram depois deste ledger. Não entrou asset novo,
material compartilhado ou mudança no runtime global.

### Correção causal de performance

O primeiro replay sobre a alpha.262 mostrou regressão de CPU no perfil médio.
A correção ficou inteiramente em `map_atacadao.js`:

- geometrias `BoxGeometry`/`PlaneGeometry` de mesmas dimensões são reutilizadas;
- as peças procedurais repetidas dos racks usam `InstancedMesh`, mantendo os 48
  marcadores, colliders e o lote visível removível pelos mutantes;
- o mapa expõe `rayOccluded` por AABB contra os colliders autoritativos, evitando
  raycast pelas centenas de malhas decorativas durante o raciocínio dos bots.

O A/B pareado foi repetido em processos Chrome frescos e na mesma janela de
carga da máquina. Isso é necessário porque, durante a medição, processos Lean,
Spotlight e Parsec elevaram tanto a base quanto a candidata de cerca de 10 ms
para 16–18 ms no perfil médio. Comparar a base ociosa com a candidata sob essa
carga produziria um falso vermelho.

| Célula | p95 base → candidata | Calls base → candidata | Tris base → candidata | >100 ms |
| --- | ---: | ---: | ---: | ---: |
| 5x5 DM, 3:2 médio | 16,7 → 17,7 ms (+6,0%) | 1.488 → 1.040 | 1.571.737 → 2.085.905 | 0 → 0 |
| 5x5 CTF, 3:2 médio | 16,7 → 18,1 ms (+8,4%) | 1.488 → 1.038 | 1.554.434 → 2.086.841 | 0 → 0 |
| 8x8 DM, 3:2 médio | 17,0 → 17,8 ms (+4,7%) | 1.607 → 1.063 | 1.670.658 → 2.227.461 | 0 → 0 |
| 8x8 CTF, 3:2 médio | 17,9 → 17,8 ms (-0,6%) | 1.561 → 1.131 | 1.692.602 → 2.240.321 | 0 → 0 |
| 5x5 DM, 16:9 baixo | 9,9 → 10,1 ms (+2,0%) | 691 → 667 | 701.567 → 1.045.445 | 0 → 0 |
| 5x5 CTF, 16:9 baixo | 10,1 → 10,0 ms (-1,0%) | 698 → 718 | 708.665 → 1.057.780 | 0 → 0 |
| 8x8 DM, 16:9 baixo | 9,8 → 10,0 ms (+2,0%) | 833 → 729 | 759.606 → 1.086.830 | 0 → 0 |
| 8x8 CTF, 16:9 baixo | 9,9 → 10,2 ms (+3,0%) | 780 → 751 | 751.851 → 1.104.244 | 0 → 0 |

Recibos locais ignorados pelo Git:

- `artifacts/atacadao/alpha262-paired-baseline/receipt.json`, SHA-256
  `17dc038f5c372fd745b0bd6e48fb8ba5ae17aa60485a552e424a703d99e7cd9f`;
- `artifacts/atacadao/alpha262-paired-candidate/receipt.json`, SHA-256
  `2d9d7c141115faaffc5d7c77981554594328489713689e7f04001999a5c0b6ab`.

O replay visual final, com fumaça removida apenas do harness e fachada útil no
lugar do antigo plano de telhado, passou nas oito células. Todos os cenários
carregaram o mapa, a contagem correta de bots, DM/CTF correto, 265 nós, 48
racks, 12 coberturas, seis freezers, cinco seções, seis caixas e os sete GLBs
com HTTP 200. O único 404 foi `/api/geo-lang` no servidor estático local; não
houve `pageerror` e ele não participa do mapa.

- mapa servido/local, SHA-256
  `7153344ea9f746a4796da1c0982dcd6c8444ea0642c5911f23915d91acda1fd8`;
- `artifacts/atacadao/alpha262-final-captures/receipt.json`, SHA-256
  `50d05293af54426d3b88a1a9c4b30892d4400e2128c378d7ece2b5439f7230a6`;
- `artifacts/atacadao/alpha262-final-contact-3x2.png`, SHA-256
  `a2c1a1a8f2ef1818bc1cee3208cafef19b495ff33e001b9af794626c770bde18`;
- `artifacts/atacadao/alpha262-final-contact-16x9.png`, SHA-256
  `21157ab7c0471a5ee4ec426fca50c8e130da8d2141e68b5613531202dc67b3fc`.

### Gates finais e dívidas separadas

`ATA1..ATA10`, os sete mutantes, `eval:mapcontrato`, `map-check` e `eval:ctfwin`
estão verdes. O mapa tem MAP1 zero, MAP2B 1,85 m/45 m², MAP4 zero occluder
invisível, MAP5 pior 5,16 m e CTF2 com pelo menos duas rotas. Bots de 60 s
passaram nas quatro células: stuck 2,089%/1,322% em 5x5 DM/CTF e
2,533%/1,011% em 8x8 DM/CTF, com `spinRoam` entre 0,024 e 0,034.

O aceite humano continua necessário e não é substituído pelos gates:

1. jogar 5x5 DM e confirmar largura dos corredores, caixa central e acesso à doca;
2. jogar 8x8 CTF e confirmar fluxo oeste/centro/leste e o MID;
3. observar a assimetria MAP2 dos spawns (E exposto 18,8%, B 3,6%) e decidir se
   ela cria defesa interessante ou vantagem indevida;
4. revisar fachada e os contatos 3:2/16:9: o atacarejo está reconhecível e as
   rotas são legíveis, mas módulos cinza, repetição de grafites/placas e a
   iluminação muito limpa ainda são dívidas visuais reais.

Não há bloqueio de licença conhecido para os sete assets já versionados: os
três itens Mint têm pack/chat/item e licença Mint Pro registrados; os quatro
itens Replicate têm conta, provider e pipeline registrados em `mint-assets.json`
e `public/models/props/FONTE.md`. Qualquer novo asset deve abrir novo registro
de proveniência antes de entrar. O PR deve permanecer draft, com automerge
desativado, até esse playtest visual/jogável.
