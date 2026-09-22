# Receitas de mapa — o específico, mapa a mapa

> 11 receitas escritas em 12/09/2026, cada uma por um agente de contexto limpo que leu o
> `map_*.js` inteiro e **mediu a própria proposta** com `bootGame()` do `tools/eval/harness.mjs`
> (build real, raycast em memória, nada escrito no repo). O baseline de todas é a execução de
> hoje de `node tools/eval/map-check.mjs all` e `node tools/eval/mapa-novo-gate.mjs`.
>
> Plano e diagnóstico: [`PLANO-BUMP-MAPAS.md`](PLANO-BUMP-MAPAS.md). **Este arquivo é o "como".**
> Cada linha de cada receita tem coordenada, dimensão e o número que ela move — é para aplicar,
> não para discutir.

| mapa | receita |
|---|---|
| Obras da Prefeitura | [`receitas/obras_prefeitura.md`](receitas/obras_prefeitura.md) |
| Penitenciária (Carandiru) | [`receitas/penitenciaria.md`](receitas/penitenciaria.md) |
| Parque da Treta | [`receitas/parque_treta.md`](receitas/parque_treta.md) |
| Velho Oeste → Sertão | [`receitas/velho_oeste.md`](receitas/velho_oeste.md) |
| Posto da Treta | [`receitas/posto_treta.md`](receitas/posto_treta.md) |
| UPA 24h | [`receitas/upa_24h.md`](receitas/upa_24h.md) |
| Lajes (Comunidade) | [`receitas/fy_lajes.md`](receitas/fy_lajes.md) |
| Campo do Morro | [`receitas/fy_campomorro.md`](receitas/fy_campomorro.md) |
| Praça dos Três Poderes | [`receitas/praca_poderes.md`](receitas/praca_poderes.md) |
| Córrego (Favela de SP) | [`receitas/fy_corrego.md`](receitas/fy_corrego.md) |
| Atacadão da Treta | [`receitas/atacadao_treta.md`](receitas/atacadao_treta.md) |

---

## 1. Antes de qualquer geometria: quatro defeitos de INSTRUMENTO

Quatro receitas independentes chegaram, cada uma pelo seu mapa, ao mesmo tipo de achado: **parte
dos números ruins não é do mapa, é de quem mede — e parte do que parece construído não existe
para quem atira.** Nenhum deles é opinião; todos vieram com `arquivo:linha` e medição A/B.

### D1 · `occluders.push(Group)` — o prop GLB não para bala nem visão de bot

Todo consumidor de `occluders` usa `intersectObjects(lista, false)` — **não recursivo**: bala
(`game.js:3310`, `:6445`, `:6953`), LOS de bot (`game.js:5914`), auto-mira (`game.js:2101`).
`placeProp` devolve um **Group** (`mapprops.js:48-64`). Mapa que empurra o Group na lista
(`map_obras.js:79`, `map_posto.js:116`) registra um objeto **sem geometria**: o raio nunca o
testa.

- **Obras** — medido: um tiro de (4,−31) para (4,+31) na altura do olho atravessa **62 m** do
  mapa e só para no tapume do fundo. Corrigindo para `o.traverse(m => m.isMesh && occluders.push(m))`
  (padrão que já existe em `map_brasilia.js:584`, `map_quebrada.js:99`, `map_lajes_authored.js:276`):
  **occluders 32 → 188**, exposição de spawn **88,5% → 76,1%** e **89,1% → 66,7%**, sem mexer em
  uma única peça de geometria.
- **Posto** — o PR #586 repete o defeito: com a estação nova entrando como Group, a exposição
  medida **sobe de 72/73% para 99,1%/99,3%**. Os ~60 props GLB do mapa hoje não param nada.
- **Obras/#579** — o PR aberto repete o mesmo `occluders.push(glb)` em dois lugares (torres e
  bunkers), e a régua nova dele (`obras-check.mjs` OBRAS5) mede contra `colliders`, não contra
  `occluders`: **pode ficar verde com o mapa inteiro transparente para tiro**.

### D2 · A régua pula `InstancedMesh` — e no Córrego isso é 43% da superfície

`map-check.mjs:550-552` pula occluder que não seja `isMesh`, que seja `isInstancedMesh`, ou que
tenha `userData.proxyGLB`. No Córrego os **62 occluders "pulados" são todos instanciados** (564
instâncias). A receita reimplementou a MAP4 ciente de instância (`getMatrixAt`, mesma tolerância
0,35 m): **0 instâncias reprovando**, `fracSemMalha` 0,0037 → 0,0021.

**Veredito: defeito de régua, não de mapa.** Quem cobra o Córrego pelos 108 occluders está
cobrando um instrumento que não olha 43% da superfície dele. Conserto: iterar instâncias
(`occMedidos` 108 → 672, `occPulados` 62 → 0) e manter o pulo só para `proxyGLB`/Group.

### D3 · Em node nenhum GLB carrega — a Praça é medida vazia

`map-check.mjs:111` declara: *"em node nenhum GLB carrega"*, e o harness não chama
`preloadMapProps`. Como `putBuilding` (`map_brasilia.js:604-621`) só empurra colisor **se** o GLB
carregou, os 4 ministérios, os 2 palácios, 8 `tires`, 4 `stall`, 12 `tent`, `urna`, `towner` e
`drinkstand` **não existem para régua nenhuma**. Os 68 occluders, o MAP5 de 99 e os 74/82% de
exposição da Praça são de **uma esplanada literalmente vazia**.

Pior, o fallback está errado: `MW=26, MD=14` (`:654`) contra o GLB real medido em
**MW=10,96 · MD=55,93** — em node o mapa fica **21 m mais largo de cada lado** que no browser
(`FLANK_X` 44 contra 33,46). Toda coordenada com |x|>33,4 seria jogo de régua.

Idioma da casa que resolve, já escrito em `map_ferrovelho.js:1033`: `gprop(id,…) || addBox(…);
collide(…)` — prop GLB **ou** caixa procedural, **e o colisor sempre à mão**.

### D4 · Simetria de rotação de 180° força bandeira colinear

`velho_oeste` e `penitenciaria` têm CTF1 = **0,00 m**, e o trio novo do PR #586 no Posto também
(12,−12) · (0,0) · (−12,12). A causa é geométrica: com `E = P`, `B = −P` e `MID = (0,0)`, os três
pontos estão **sempre** numa reta — a altura do triângulo é zero por construção.

Numa simetria **espelhada em z** (`E=(a,−c)`, `B=(a,+c)`, `MID=(m,0)`) vale
**CTF1 = |m − a|**: basta deslocar as pontas lateralmente e a justiça entre os times continua
exata. É o que as receitas de Penitenciária (0,00 → **19,50 m**), Velho Oeste (0,00 → **7,97 m**)
e Posto (0,00 → **7,78 m**) fazem, cada uma com 1 a 3 linhas.

---

## 2. O resumo: o pior número de cada mapa e o que o move

Todos os "depois" são **simulados e medidos** pela receita, não estimados.

| mapa | pior número hoje | intervenção-chave | depois (medido na simulação) |
|---|---|---|---|
| **obras_prefeitura** | exposição de spawn **88,5%/89,0%**; MAP5 99 (quadrante vazio); 8 corpos em sólido; 75,4% da área sem textura | `occMesh` no `prop()` + **tapume de canteiro** em 3 painéis por lado (saídas de 2,0 m a oeste e 3,0 m a leste) + apagar a rampa fantasma `:117` e subir as 2 lajes | exposição **4,6%/4,2%**; MAP1 **0**; occluders 32 → **188**; SUP2 75,4% → **≤0,3%**; ORT1 0,0%/1 → **27,8%/32** |
| **penitenciaria** | CTF1 **0,00 m**; visada **98,5 m**; MAP5 **20,6 m**; 14 corpos em sólido; 77,8% dos materiais sem `map` | Pavilhões 4/6 a oeste e leste (11×5,8×8 m, portas em pontas opostas) + pórtico da Divinéia + solários; bandeiras E/B para (−19,5; ∓27,5) | CTF1 → **19,50 m**; exposição 79,3/76,1% → **11,6/11,7%**; visada do spawn → **70,4 m**; MAP5 → **6,84 m**; ALT1 8,80 → **9,20**; malhas 1.167 → **827** |
| **parque_treta** | **20 corpos dentro de sólido** (o pior do acervo); MAP5 17,3 m nos 4 cantos; exposição 52% | `collide:true` nas **4 floreiras** (`:242-249`, 16 dos 20 pontos) e nos **4 jatos do espelho d'água** (`:317`, os outros 4) + pórtico-bilheteria de 4,8 m + carrossel virando plataforma jogável | MAP1 20 → **0**; exposição → **0,0–0,9%**; visada 86,2 → **40,8 m**; CTF1 4,79 → **21,07 m**; MAP5 → **5,69 m** |
| **velho_oeste** | h90 **3,5 m**; MAP5 99; CTF1 **0,00**; **único mapa sem tema brasileiro** | **Aterrar o retheme Sertão que já existe** em `worktrees/mapas-stack-550-v2` (889 linhas, 7 módulos `map_sertao_*`, céu procedural, 13 réguas) — o dono já vetou o faroeste por escrito | occluders 56 → **568**; ORT1 31,5 → **78,1%**; MAP5 99 → **9,8 m**; com os passos 2-5: CTF1 → 7,97 m, h90 → **9,20 m**, visada 89 → **32 m** |
| **posto_treta** | **26 occluders** (o menor do jogo); exposição 72/73%; h90 5,5 m; 2 ângulos distintos | occluder por malha + **greve de caminhoneiros vira parede** no corredor oeste (volumes de ~6,2 m com vão alternado de 5,6 m) + laje da loja acessível | occluders 12 (pós-#586) → **95**; exposição → **6,8/8,4%**; MAP5 10,58 → **6,12 m**; ALT1 4,15 → **9,60 m**; ORT1 2 → **32 ângulos** |
| **upa_24h** | **52,2% da área sem textura**; 1 ângulo distinto em 220 massas; CTF1 4,33 m | forro + luminária texturizados; **4 estantes no eixo de portas de serviço** (x=±22,5, z=±7) — que é a visada real de 70 m, não o corredor; posto de enfermagem 3,4×2,3×4,4 girado 0,26 rad no centro | SUP2 52,2% → **4,95%**; SUP1 45,8% → **35,0%**; visada 66,4 → **56,0/50,7 m**; MAP5 8,64 → **5,57 m**; CTF1 → **5,62 m**; **−20 draw calls** |
| **fy_lajes** | exposição de spawn **100%/100%** (único do acervo) | **Platibanda de 1,9 m exatamente ±1,9 m do eixo** no vão central das 2 lajes de spawn + 4 passarelas cobertas sobre as tábuas de acesso | exposição **0,0%/0,0%**; visada do spawn 67,4/67,5 → **0,0 m**; com as 20 divisas: pares com visada limpa 100% → **28,4%** |
| **fy_campomorro** | assimetria **64,1% × 15,0%** (4,3×) | **Lona de patrocínio no alambrado** (10 painéis, 2,15 m, nos mesmos vãos que a tela já declara) + basculante no galpão + casario em cota no barranco oeste | E → **34,2%** × B **15,5%** (razão **2,22×**); visadas ≥34 m ao spawn E: 70 → **34**; SUP1 71,7 → **32,0%**; ALT1 8,71 → **9,60 m** |
| **praca_poderes** | visada **153,6 m**; 68 occluders em 91×160 m; **4 occluders na metade sul inteira** | Consertar o fallback `MW/MD`, tornar pilotis e palácio incondicionais, **chicane de 3 ônibus de caravana** (portão reto de 3,4 m ainda deixa 138 m de linha viva) | visada **153,6 → 54,8 m**; exposição B 82,0 → **3,6%** / E 74,3 → **1,6%**; 8 quadrantes de 99 → 7,6 |
| **fy_corrego** | 108 occluders / **62 pulados**; visada 77 m no canal | **A régua é o defeito** (D2); no mapa: grades de retenção de lixo (3,6×3,0×0,5 m, topo +1,25 m, vão de 2,4 m alternado) + passarelas | `occMedidos` 108 → **672**; a receita inteira custa **+0,036%** do orçamento de triângulos, e a poda que ela propõe (decimar `grama_corrego_*`, hoje **4.142 tri por tufo de 0,2 m**) leva o mapa de **8,3 M → ≈1,8 M** |
| **atacadao_treta** | assimetria **45,9% × 7,8%**; MAP5 **14,05 m** (q3,0); bandeira a **5,0 m** do próprio spawn; 60,8% da área sem textura; 1 ângulo em 208 massas | causa medida: **os 24 carros têm colisor `maxY = 1,5 m` (`:145`) e o olho da régua está em 1,62 m** — não há uma massa acima da linha do olho em 36 m de asfalto. Pátio de carga em z=−22,4 (caminhão baú, ônibus de sacoleiro, torre de fardo de arroz) + porta-palete de 9,2 m + mezanino de estoque | exposição E 45,9% → **10,9%**; MAP5 14,05 → **5,97 m**; razão 0,13× → **0,46×**; bandeira 5,0 → **11,0 m** do spawn; ORT1 0%/1 → **≈41%/25**; 1ª cota andável do mapa |

---

## 3. Os quatro eixos do pedido, com o que cada um virou na prática

### Visual
O padrão que se repete: **material sem `map` e canvas esticado**, não falta de talento. UPA com
parede de canvas 8×256 esticado em 21 m (**4,4 px/m**), Obras com 75,4% da área sem textura,
Penitenciária com 21 de 27 materiais chapados, Campo do Morro com `external()` que não roda em
node. O conserto é sempre o mesmo trio: chave de `T` existente ou canvas tilável, `aoBoxGeo` +
`aoMatFactory` para UV em metros a 128 px/m, e `applyAniso`. Nas Lajes, **75,8% da "área sem
textura" é malha invisível** (`MAT.proxy`) — lá o conserto é na régua, que precisa pular
`proxyGLB` no `texel-check`.

### Jogabilidade
Três dispositivos resolveram quase tudo, porque o defeito é quase sempre o mesmo — **linha reta
longa demais e spawn exposto**:
1. **Anteparo na altura certa.** Medido nas Lajes: platibanda de 1,3 m **não move nada** (100% →
   100%), porque olho e alvo estão os dois a 6,82 m e o raio é horizontal. 1,9 m resolve. Altura
   de cobertura útil é **0,9–1,6 m**; altura que corta visada é **≥2,0 m** (olho a 1,62 m).
2. **Vão alternado, nunca portão reto.** Praça: portão reto de 3,4 m deixa 138 m vivos; chicane
   desencontrada de 3 ônibus dá 54,8 m com a mesma passagem aberta. Posto: vão de 5,6 m alternando
   de lado. Penitenciária: portas em pontas opostas do mesmo bloco.
3. **Fechar sem selar.** O limite é medido, não estimado: nas Lajes ±2,2 m de platibanda
   estrangula a boca (8.384 → 1.492 células andáveis); no Campo do Morro fechar os 3 corredores
   oeste orfanou 22–31 nós; na UPA, 3 de 6 arranjos de mobília derrubaram o **CTF2** de 2 rotas
   para 1.

### Dificuldade (mais lugar de onde defender)
MAP5 é a régua que já existe para isso (espaçamento ≤7 m por quadrante). As receitas fecham
**todos** os quadrantes vazios com prop do catálogo já baixado — contêiner, caminhão, fardo,
barril, banca, churrasqueira, pilha de pneu — e, onde faltava cota, criam **uma camada alta
acessível**: guarita com escada (Penitenciária), laje da loja (Posto), passarela da montanha-russa
e carrossel (Parque), sobrado com interior (Sertão), casario em cota (Campo do Morro).

### Brasilidade
O que se repete nas 11 receitas: **céu regional primeiro** (7 mapas não tratam céu de forma
nenhuma), depois objeto que denuncia o lugar — placa de obra com prazo vencido e faixa de
sindicato; borracharia, totem de preço e caminhão de greve; cartaz de oferta escrito à mão e
torre de fardo de arroz; senha eletrônica, cadeira de plástico e ventilador de parede; varal
entre grades e mural de tinta descascada; barraca de pastel e trio elétrico. Nada disso precisa
de asset novo: sai do catálogo `public/models/props/` e das chaves de `T`.

---

## 4. Ordem global (o que o dono decide, o que o builder aplica)

1. **Os quatro defeitos de instrumento (D1–D4).** São de 1 a 15 linhas cada e mudam o valor de
   todas as réguas de mapa. Fazer **antes** de qualquer geometria — senão a rodada seguinte mede
   errado e o esforço vai para o lugar errado.
2. **As decisões que o builder não pode tomar sozinho:** aterrar (ou não) o retheme Sertão; o
   destino do arquivo morto `map_lajes.js` e da cláusula `semCasca`; e a reconciliação dos PRs
   #579, #582 e #586 com estas receitas — cada receita já diz, item a item, o que acrescenta e o
   que contradiz.
3. **Textura e céu** (passo barato, zero risco de gameplay, move SUP1/SUP2/brasilidade).
4. **Anteparo e vão** (exposição, visada) — com `map-check` rodando a cada peça.
5. **Cota andável** por último, sempre sozinha: é o único passo que mexe em `groundHeightAt`,
   `stairs`, `levels` e no A* dos bots. `map_havan.js:1674-1716` documenta duas rodadas perdidas
   exatamente aí.

## 5. Limites declarados desta rodada

- **Nenhuma figura foi olhada.** Tudo aqui é medição em node. Pela LEI 4 do `AGENTS.md`, nenhuma
  frente fecha sem captura olhada e descrita; cada receita tem uma seção 6 dizendo exatamente o
  que exige figura.
- **Os "depois" são simulação de geometria em node, não partida jogada.** Cada receita replicou a
  régua no mesmo harness e mediu a própria proposta; onde o instrumento do agente diverge do
  oficial (grade de observador de 1 m contra 2 m), ela declara o offset. Nenhum desses números
  veio de rodar `map-check` sobre código aplicado — porque nenhum código foi aplicado.
- **Nada disso mede diversão.** Exposição, visada, MAP5, CTF, ALT1 e orçamento são condições
  necessárias, não suficientes. Essa nota é do dono, na figura e na partida.
