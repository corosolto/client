# Rodada de conserto dos mapas — 13/09/2026

> 14 builders em paralelo, um por arquivo, aplicando as receitas de
> [`RECEITAS-MAPAS.md`](RECEITAS-MAPAS.md). Os recibos de cada um estão em
> [`recibos/`](recibos/). **Os números desta página não são dos builders: são da minha
> reconferência**, com o instrumento oficial, depois de todos terem terminado —
> `node tools/eval/map-check.mjs all` e `node tools/eval/mapa-novo-gate.mjs`.
>
> Nada foi commitado. O dono revisa antes.

---

## 1. O placar

| régua | antes (12/09) | depois (13/09) |
|---|---|---|
| **Portão de mapa novo** — cláusulas vermelhas fora da dívida | **32** | **0** |
| **MAP1** — corpo dentro de sólido, somados os 17 mapas | **43** | **0** |
| **MAP5** — mapas com quadrante acima do teto de 7 m | **8** | **1** (`ferro_velho` 9,2 m, intocado nesta rodada) |
| **MAP5** — quadrantes sem nenhum prop (sentinela 99) | **3 mapas** | **0** |
| **CTF1** — bandeiras colineares (altura do triângulo 0,00 m) | **2 mapas** | **0** |
| **MAP7** (régua nova) — occluder empurrado como `Group` | **não existia** | **0 em 17 mapas** |
| `eval:mapcontrato` MC1/MC2/MC3 | MC3 passava | **as 3 passam** |
| `check:fast` | (não medido antes das edições) | **91/101** |

---

## 2. Exposição de spawn e visada — antes → depois, por mapa

Exposição = fração dos pontos andáveis a ≥25 m que enxergam a cabeça de quem nasce.
Visada = maior linha de tiro limpa a partir do spawn.

| mapa | exp. E | exp. B | maior visada | MAP5 pior esp. | corpo em sólido |
|---|---|---|---|---|---|
| `praca_poderes` | 74,6% → **1,3%** | 82,1% → **1,4%** | 153,6 → **52,5 m** | 99 → **6,56 m** | 0 → 0 |
| `obras_prefeitura` | 88,5% → **2,3%** | 89,0% → **3,2%** | 73,6 → **55,5 m** | 99 → **6,13 m** | **8 → 0** |
| `penitenciaria` | 79,3% → **9,8%** | 76,1% → **9,3%** | 98,5 → **67,9 m** | 20,6 → **5,70 m** | **14 → 0** |
| `posto_treta` | 72,0% → **3,9%** | 73,2% → **4,5%** | 73,6 → **36,1 m** | 10,5 → **5,83 m** | 0 → 0 |
| `velho_oeste` | 63,4% → **11,5%** | 66,6% → **14,0%** | 92,0 → **58,7 m** | 99 → **5,90 m** | 0 → 0 |
| `parque_treta` | 51,9% → **0,1%** | 52,2% → **0,1%** | 86,2 → **38,4 m** | 17,4 → **6,29 m** | **20 → 0** |
| `atacadao_treta` | 45,9% → **10,9%** | 7,8% → **4,0%** | 70,5 → **68,2 m** | 14,1 → **5,27 m** | 0 → 0 |
| `fy_lajes` | **100% → 0,0%** | **100% → 0,0%** | 67,5 → **0,0 m** | 1,06 → 1,00 m | 0 → 0 |
| `fy_campomorro` | 64,1% → **41,5%** | 15,0% → 15,4% | 44,1 m | 6,67 → **6,33 m** | 0 → 0 |
| `fy_corrego` | 29,2% → **19,1%** | 27,3% → **16,1%** | 77,0 → **64,7 m** | 6,61 → **4,58 m** | 0 → 0 |
| `upa_24h` | 15,6% → 15,6%* | 2,7% → 2,7%* | 64,3 → **~51 m** | 8,64 → **5,72 m** | 0 → 0 |
| `fy_mansao` | 11,2% | 11,0% | 66,6 m | 6,43 m | **1 → 0** |

\* a UPA já estava boa em exposição; lá o trabalho foi textura (52,2% → 0,4% de área sem
textura) e a visada do eixo de portas de serviço.

**Cobertura medida (occluders):** `posto_treta` 26 → **74** · `obras_prefeitura` 32 → **259** ·
`parque_treta` 48 → **160** · `velho_oeste` 56 → **339** · `atacadao_treta` 65 → **250** ·
`penitenciaria` 77 → **355** · `upa_24h` 122 → **344** · `praca_poderes` 68 → **359** ·
`fy_corrego` 108 → **845** (deste, boa parte é a régua que passou a enxergar instância).

**Bandeiras que não davam contra-jogo:** `velho_oeste` CTF1 0,00 → **7,97 m** ·
`penitenciaria` 0,00 → **19,50 m** · `upa_24h` 4,33 → **6,31 m** e a bandeira saiu de 3,61 m
do próprio spawn · `atacadao_treta` a bandeira B saiu de 5,00 m do próprio spawn.

---

## 3. Mais bonito e mais brasileiro — o que entrou

**Textura (SUP1 = materiais sem `map`, SUP2 = área sem textura):**

| mapa | SUP1 | SUP2 |
|---|---|---|
| `fy_mansao` | 95,7% → **10,9%** | 62,6% → **0,6%** |
| `obras_prefeitura` | 41,3% → **17,1%** | 75,4% → **0,1%** |
| `atacadao_treta` | 30,5% → **21,6%** | 60,8% → **2,7%** |
| `upa_24h` | 45,8% → **14,4%** | 52,2% → **0,4%** |
| `fy_campomorro` | 71,7% → **30,8%** | 13,2% → **0,0%** |
| `penitenciaria` | 77,8% → **22,0%** | 1,4% → **0,0%** |
| `fy_lajes` | 38,7% → **35,6%** | 27,9% → **1,1%** |
| `posto_treta` | 30,9% → **21,7%** | 17,7% → **4,6%** |

**Céu:** os 7 mapas que não tratavam céu de forma nenhuma (`posto`, `upa`, `obras`,
`atacadao`, `parque`, `velho_oeste`, `penitenciaria`) agora chamam `setMapSky`. O
`obras_prefeitura` entrou no `eval:look` com ΔE76 **0,00** contra o horizonte assado do
`sky_sp.webp` — a régua passou de 3 para 4 mapas.

**Ortogonalidade (ORT1 — "o mapa lê como maquete"):** `obras` 0,0%/1 ângulo → **40,3%/41** ·
`atacadao` 0,0%/1 → **54,2%/24** · `upa` 0,0%/1 → **48,1%/42** · `penitenciaria` 4,4%/9 →
**17,6%/30** · `parque` 10,4%/2 → **25,4%/22** · `posto` 16,6%/2 → **23,1%/29** ·
`fy_campomorro` 0,0%/1 → **17,3%/38**.

**Brasilidade que entrou, com prop do catálogo (nenhum asset novo):** placa de obra com
valor e prazo vencido e faixa de sindicato (obras) · borracharia, totem de preço, cozinha da
greve e faixa "A GENTE PARA O BRASIL" (posto) · cartaz de oferta escrito à mão, torre de fardo
de arroz, engradado de cerveja e guarita de "REVISTA NA SAÍDA" (atacadão) · senha eletrônica,
fila de balizador, cadeira monobloco, ventilador de parede e Kombi-ambulância (UPA) · varal
entre as grades, mural descascado e letreiro de pavilhão (penitenciária) · barraca de pastel,
algodão-doce, tiro ao alvo, trio elétrico e bilheteria com cartaz de pincel (parque) · lona de
patrocínio no alambrado, churrasqueira com fumaça, bandeirinha de festa e mototáxi
(campo do morro) · varal sobre o córrego, mercadinho, carrinho de catador e gambiarra
(córrego) · ônibus de caravana, camelô, palanque e acampamento (praça).

**Orçamento:** `fy_mansao` saiu de **984 para 508 malhas** (−48%) — era o mapa mais caro do
jogo em chamada de desenho. O `fy_corrego` acrescentou **+4.296 triângulos** (+0,05% do
orçamento dele).

> **Correção de 14/09:** esta linha dizia que o córrego "continua com os 7,59 M de tufo de
> capim intactos". **Errado** — `map_corrego.js:443` chama `hasProp('grama_corrego')` com id
> sem sufixo, que não existe, e `grama_corrego` não está em `CORREGO_PROPS`: **nenhum tufo
> nasce ali**. O capim é do `fy_campomorro` (68 tufos, 281.656 tri). Os 8,3 M do córrego são
> reais mas a causa segue por identificar. Detalhe em
> [`RELATORIO-LOWPOLY.md`](RELATORIO-LOWPOLY.md) §1.

---

## 4. As quatro réguas que ganharam olho

1. **MAP4 ciente de instância** (`map-check.mjs`): `InstancedMesh` deixou de ser pulado. No
   `fy_corrego` eram 62 occluders / 564 instâncias = **43% da superfície do mapa** que a régua
   não olhava. `occMedidos` 108 → 672, `occPulados` 62 → 0.
2. **`texel-check` pula malha invisível**: 75,8% da "área sem textura" do `fy_lajes` era malha
   `visible:false` (proxy de GLB). SUP2 21,4% → 1,1% **sem tocar em arte**.
3. **MAP7, nova**: occluder empurrado como `Group` nunca era testado pelo raycast
   (`intersectObjects(lista, false)`). Duas pontas — mundo e fonte — e hoje **0 em 17 mapas**.
4. **`eval:poly`, nova** (`tools/eval/poly-check.mjs`, no `check:fast`): piso e teto de
   polígono de asset, com 7 cláusulas e 3 mutantes provados. Ver
   [`RELATORIO-LOWPOLY.md`](RELATORIO-LOWPOLY.md).

**Fauna:** o proxy de esfera-e-cone que substituía o bicho quando o GLB falhava **não nasce
mais no browser** (`ambientlife.js`, mais os dois proxies do córrego). Provado em Chromium com
as 44 requisições de GLB abortadas: padrão = 0 bichos, `?fauna=proxy` = 5 bichos. Em node o
proxy continua, porque é o que as réguas medem.

**Dívidas quitadas** (a régua manda remover a entrada, e foram removidas):
`ORT1:fy_campomorro`, `SUP1:fy_campomorro`, `SUP2:fy_campomorro`, `SUP1:fy_lajes`,
`SUP2:fy_lajes`, `SUP1:fy_mansao`, `SUP2:fy_mansao`, `POLY6:fy_corrego` (jacaré e capivara).

**Dívidas novas, declaradas com motivo** — as duas que só a cota andável resolve:
`ALT1:upa_24h` (h90 4,2 m **é** o pé-direito: mapa 100% interno) e `ALT1:penitenciaria`
(8,8 m, faltam 0,2 m; a massa que falta é a passarela de guarita).

---

## 5. O que ficou de fora, e por quê

- **Cota andável nova** (`groundHeightAt` multinível, `stairs`, `levels`) em todos os mapas.
  Foi cortada do escopo de propósito: é o único passo que mexe no A* dos bots e no flood-fill,
  e `map_havan.js:1674-1716` documenta duas rodadas perdidas exatamente aí. É a rodada seguinte,
  e é ela que fecha as duas dívidas de ALT1 acima.
- **Retheme do `velho_oeste` para Sertão.** O trabalho já existe pronto em
  `worktrees/mapas-stack-550-v2` (889 linhas, 7 módulos `map_sertao_*`, céu procedural, 13
  réguas) e o dono já vetou a estética faroeste por escrito. **É decisão do dono**, não do
  builder. Os consertos aplicados no mainline valem nos dois cenários.
- **Mintar ou re-mintar qualquer asset.** ~~Não existe `.env` nesta máquina.~~ **Desbloqueado
  em 13/09**: o MCP do mint.gg está conectado (`.omp/mcp.json`, token OAuth fora do repo) e a
  conta tem **49.350 créditos** — mas gerar continua sendo **decisão do dono**, e a análise de
  14/09 mostrou que antes de gerar há **386 assets pagos parados** na conta.
- **Decimar asset inflado.** ~~Exige `gltf-transform`, que não está instalado aqui.~~ **Errado
  e corrigido em 14/09**: `@gltf-transform` 4.4.1 e `meshoptimizer` 1.2.0 **estão** em
  `node_modules`; o `ERR_MODULE_NOT_FOUND` era resolução ESM de script rodando em `/tmp`. A
  decimação foi executada de prova (`vw_9150` 89.198 → **7.132**, bbox 1,31%) e **custa zero**.
- **Regenerar o layout de grafite.** Tentei e **revertí**: a regeneração nesta máquina
  introduz 12 peças órfãs apontando para pôsteres que não existem no pool local
  (`DOLLYNHO.png`, `ashtar.png`, `ashtar-meme.jpg`) — os decalques não estão todos no Git, por
  procedência. Medido: com o layout do HEAD, `M4 = 0` e `F2 = 6`; com o regerado, `M4 = 12`.
  **Fica vermelho o `F2` dos 6 mapas que mudaram**, e a regeneração tem que ser feita onde o
  pool está completo.

---

## 6. `check:fast` — 91/101, e o que são as 10

| passo | é regressão desta rodada? | por quê |
|---|---|---|
| `eval:grafitelayout` | **consequência declarada** | F2: 6 mapas mudaram e o layout não pôde ser regerado aqui (§5) |
| `eval:mapid` | não | M1 acusa `fy_escadao`/`fy_campomorro` no bloco **gerado** do README; o mesmo bloco existe no HEAD. É a dívida do prefixo `fy_`, declarada em `maps.js` |
| `feet:check` | não | `foot-offsets.json` defasado; pré-existente e registrado no `KNOWN-BUGS.md` |
| `eval:camera-grip`, `eval:char-thumbnail`, `eval:asset-integrity`, `eval:gltf-validator` | não | personagens e assets (`camera-roxa` com SHA fora do registro, `lenda-lanhouse` sem thumbnail) — as mesmas vermelhas do cabeçalho do `KNOWN-BUGS.md` |
| `skills:check` | não | `.agents/skills/` não está linkado nesta máquina (`npm run skills:sync`) |
| `eval:fixture` | não | FX3, dispensa na lista `SEM_FIXTURE`; pré-existente |
| `eval:docsautoria` | não | recusa medir com mudança não commitada em `docs/docs/colaborar.md` — é o estado da árvore, não o código |

`npm run docs` foi rodado: os 13 blocos gerados estão atualizados.

---

## 7. O que exige figura (nada disto foi olhado)

**Nenhum pixel foi verificado nesta rodada** — a regra de um agente só por browser valeu para
todos, e a medição contratada foi sonda em node. Pela LEI 4 do `AGENTS.md`, nada disto está
pronto até alguém capturar e descrever. A fila, em ordem de risco:

1. **`praca_poderes`** — a chicane de ônibus corta 153,6 m de visada; é o `DEFAULT_MAP` e é
   Brasília, que é vazia de propósito. Se alguma coisa desta rodada descaracterizou a
   Esplanada, é aqui.
2. **`fy_lajes`** — a platibanda de 1,9 m e as 4 passarelas cobertas mudam a silhueta do
   telhado, que é a identidade do mapa.
3. **`posto_treta`** — com os ~60 GLB virando occluders de verdade, o tiro passa a parar na
   lataria. É a mudança de *feel* mais forte da rodada e só partida responde.
4. **`fy_mansao`** — 12 texturas novas e a cor recalculada peça a peça; o A/B de albedo deu
   desvio máximo de 0,053, mas quem julga é o olho.
5. **`obras_prefeitura`, `atacadao_treta`, `parque_treta`, `upa_24h`** — textura nova em
   quase tudo; o risco é o oposto do anterior, material chapado que virou textura errada.

Armadilha de captura medida por dois builders: o servidor de `:8123` roda com `cwd` em
`worktrees/vm-unificado` e serve o `public/` **daquele** checkout — quem fotografar sem subir
`node tools/eval/serve.mjs <porta>` dentro de `client/` fotografa o mapa de ontem.
