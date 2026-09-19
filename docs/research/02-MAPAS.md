# MAPAS — o que foi feito, o que foi medido, e onde ainda dói

> **Como usar:** cole o `00-CONTEXTO-CORO-SOLTO.md` primeiro, depois este arquivo.
> A seção final (§8) é o pedido de pesquisa.
>
> **Procedência (revisão de 19/09):** §1–§2 vêm de `public/js/maps.js`; §3 de
> `docs/maps/PLANO-BUMP-MAPAS.md` (12/09); §4–§5 de `docs/maps/RODADA-CONSERTO.md` (13/09);
> §6 de `docs/maps/RELATORIO-LOWPOLY.md` (13–14/09). **Tudo de §4 a §6 está numa árvore de
> trabalho NÃO commitada** ("Nada foi commitado. O dono revisa antes."). Não é estado do
> repositório; é estado de uma máquina.

---

## 1. O acervo

**17 mapas** no registro (`public/js/maps.js`), todos lugares brasileiros satirizados:

| id | nome | o que é |
|---|---|---|
| `praca_poderes` | Praça dos Três Poderes | Brasília fiel — Congresso, Planalto, STF |
| `piscina_treta` | Piscina da Treta | salão fechado |
| `loja_h` | Loja H (Estacionamento) | varejão + estacionamento aberto |
| `ferro_velho` | Ferro Velho do Zé | ferro-velho |
| `quebrada` | Quebrada (Rua do Baile) | rua reta, rotunda do baile + campinho, CTF de 4 bandeiras |
| `fy_escadao` | Escadão (Morro) | escadaria de morro |
| `fy_campomorro` | Campo do Morro | campinho de várzea |
| `fy_lajes` | Lajes (Comunidade) | lajes de comunidade |
| `fy_corrego` | Córrego (Favela de SP) | favela sobre córrego |
| `fy_mansao` | Mansão do Joá | mansão |
| `posto_treta` | Posto da Treta | posto de estrada na hora dourada, greve dos caminhoneiros |
| `upa_24h` | UPA 24h da Treta | pronto-socorro, **100% interno, sem céu** |
| `obras_prefeitura` | Obras da Prefeitura | canteiro com **terreno ondulado e buracos de escavação** |
| `atacadao_treta` | Atacadão da Treta | galpão fechado + estacionamento, ligados por portas reais |
| `parque_treta` | Parque da Treta | parque de diversão |
| `velho_oeste` | Velho Oeste da Treta | faroeste |
| `penitenciaria` | Penitenciária da Treta | presídio |

Todos os mapas podem rodar em rounds **ou** CTF; alguns abrem em CTF por padrão porque a
geometria foi desenhada em volta das bandeiras.

## 2. Uma decisão de arquitetura que vale citar: o id do mapa é dado público

Os ids antigos eram herança literal do Counter-Strike (`awp_map`, `fy_pool_day`, prefixo `fy_`
de "fight yard"). Foram renomeados, **mas com tabela de alias obrigatória**, por dois motivos
medidos:

1. **O id vai gravado no banco** em toda partida. Sem alias, o mesmo mapa vira **duas entradas
   no ranking** — a de antes e a de depois do rename — e nenhuma fica certa.
2. **O id viaja em link** (`?map=fy_quebrada` é o que o jogador manda no grupo). E aqui está o
   perigo: o resolvedor devolve o **mapa padrão** para id desconhecido — logo, link antigo
   **não daria erro**, abriria calado a Praça no lugar da Quebrada.

**Falha silenciosa é a assinatura do defeito mais caro deste repo.** Essa decisão tem régua
própria (`tools/eval/mapa-id-check.mjs`, no `check:fast`): nenhum id do CS sobrevive no
código, e todo id antigo resolve para um mapa que existe. Ressalva honesta: a régua está
**vermelha hoje** — cinco ids `fy_*` (`fy_escadao`, `fy_campomorro`, `fy_lajes`,
`fy_corrego`, `fy_mansao`) sobrevivem como dívida declarada em `maps.js`.

## 3. O veredito de 12/09: a metade fraca é exatamente a que nenhuma régua cobria

**Os 8 mapas marcados como "COMUNIDADE" são a metade fraca do acervo, e são exatamente os que
nenhuma régua cobre.** Das 20 cláusulas estruturais vermelhas fora da dívida declarada,
**18 caem neles**. Não é julgamento de arte — é o portão que o próprio repositório escreveu.

**O agravante é de processo, não de mão de obra:** o portão que mostra isso
(`eval:mapanovo`) **não roda em lugar nenhum**. Está fora do `check:fast` e do
`check:deploy`. O CI roda só `eval:mapcontrato`, `eval:escala` e `botsim` em 5 mapas
(`ci.yml`) mais `eval:grafite` em 5 mapas no portão de browser — **nenhum workflow chama
`check:fast`**. As outras ~26 réguas dependem de alguém lembrar de rodar na própria máquina.

## 4. A rodada de conserto de 13/09 — 14 builders em paralelo, um por arquivo

Placar, conferido depois com o instrumento oficial (não com os números dos builders):

| régua | antes | depois |
|---|---|---|
| Portão de mapa novo — cláusulas vermelhas | **32** | **0** |
| MAP1 — corpo dentro de sólido (17 mapas somados) | **43** | **0** |
| MAP5 — mapas com quadrante acima do teto de 7 m | 9 (fonte diz 8; a tabela de 12/09 lista 9) | **1** (`ferro_velho`, 9,2 m, intocado) |
| MAP5 — quadrantes sem nenhum prop | 3 mapas | **0** |
| CTF1 — bandeiras colineares (sem contra-jogo) | 2 mapas | **0** |
| MAP7 (régua nova) — occluder empurrado como `Group` | não existia | **0 em 17** |
| `check:fast` | — | **91/101** (7 dos 10 vermelhos são dívida anterior ou máquina) |

**Exposição de spawn** (fração dos pontos andáveis a ≥25 m que enxergam a cabeça de quem
nasce) e **maior visada limpa a partir do spawn**:

| mapa | exp. E | exp. B | maior visada |
|---|---|---|---|
| `praca_poderes` | 74,6% → **1,3%** | 82,1% → **1,4%** | 153,6 → **52,5 m** |
| `obras_prefeitura` | 88,5% → **2,3%** | 89,0% → **3,2%** | 73,6 → **55,5 m** |
| `penitenciaria` | 79,3% → **9,8%** | 76,1% → **9,3%** | 98,5 → **67,9 m** |
| `posto_treta` | 72,0% → **3,9%** | 73,2% → **4,5%** | 73,6 → **36,1 m** |
| `velho_oeste` | 63,4% → **11,5%** | 66,6% → **14,0%** | 92,0 → **58,7 m** |
| `parque_treta` | 51,9% → **0,1%** | 52,2% → **0,1%** | 86,2 → **38,4 m** |
| `fy_lajes` | **100% → 0,0%** | **100% → 0,0%** | 67,5 → **0,0 m** |

**Textura** (SUP2 = fração de área sem textura): `fy_mansao` 62,6% → **0,6%** ·
`obras_prefeitura` 75,4% → **0,1%** · `upa_24h` 52,2% → **0,4%** · `atacadao_treta` 60,8% →
**2,7%** · `penitenciaria` 1,4% → **0,0%**.

**Ortogonalidade** ("o mapa lê como maquete" — tudo alinhado a 90°): `obras` de 1 ângulo
distinto para **41** · `upa` 1 → **42** · `fy_campomorro` 1 → **38** · `atacadao` 1 → **24**.

**Orçamento:** `fy_mansao` saiu de **984 para 508 malhas** (−48%, contagem de malha em node;
o browser media 2.038 draw calls antes, PR #589) — era o mapa mais caro do jogo.

**Brasilidade acrescentada sem asset novo** (só props do catálogo): placa de obra com prazo
vencido e faixa de sindicato · borracharia, totem de preço e cozinha da greve · cartaz de
oferta escrito à mão e torre de fardo de arroz · senha eletrônica e Kombi-ambulância · varal
entre as grades e mural descascado · barraca de pastel, trio elétrico e tiro ao alvo · lona de
patrocínio no alambrado e churrasqueira com fumaça · carrinho de catador e gambiarra ·
ônibus de caravana, camelô e palanque.

## 5. As quatro réguas que "ganharam olho" — e o que isso ensina

Cada uma destas estava **verde medindo a coisa errada**:

1. **MAP4 não enxergava instância.** `InstancedMesh` era pulado. No `fy_corrego` eram 62
   occluders / **564 instâncias = 43% da superfície do mapa** que a régua não olhava.
2. **O medidor de textura contava malha invisível.** 75,8% da "área sem textura" do `fy_lajes`
   era malha `visible:false` (proxy de GLB). O número caiu de 21,4% para 1,1% **sem tocar em
   arte nenhuma** (a tabela do mesmo relatório diz 27,9% → 1,1%; o recibo diz 21,38 → 1,08).
3. **MAP7, nova:** occluder empurrado como `Group` **nunca era testado pelo raycast** (a
   chamada não era recursiva). Duas pontas, mundo e fonte, hoje 0 em 17 mapas.
4. **`eval:poly`, nova:** piso e teto de triângulo por mapa, dentro do portão rápido.

## 6. O relatório low-poly de 13/09 — e a correção honesta de 14/09

Pedido do dono: *"quero fazer um relatório do que está muito lowpoly, temos que melhorar os
animais, nenhum pode ser lowpoly"*. Medido lendo **todo GLB servido** pelo container glTF —
248 arquivos.

**O achado principal não é low-poly. É orçamento no lugar errado:**

| objeto | triângulos | o que é |
|---|---:|---|
| `vw_9150` | **89.198** | um caminhão |
| `caixa_dagua` | **18.749** | uma caixa d'água |
| `botijao_gas` | **17.132** | um botijão de gás |
| `concrete_roadblock` | 10.593 | um bloco de concreto |
| **`congresso`** | **4.905** | **o Congresso Nacional inteiro** |
| `grama_corrego_01` | 4.142 | um tufo de capim de 0,2 m |
| `kombi` | 2.797 | uma Kombi |
| **`fav_house`** | **1.070** | **uma casa de favela inteira** |

**Um botijão de gás custa 16 casas de favela. Um tufo de capim custa quase um Congresso
Nacional.** E o caminhão `vw_9150` aparece **7× no `posto_treta` = 624.386 triângulos**, mais
5× na Praça e 3× nas Obras.

**Correção de 14/09 registrada no próprio relatório** (exemplo do padrão da casa de corrigir
em público): a versão de 13/09 dizia que 7,59 M dos 8,3 M de triângulos do `fy_corrego` eram
capim. **Errado** — o código chama o prop com id sem sufixo, que não existe, e o prop não está
na lista do mapa: **nenhum tufo nasce ali**. O capim é do `fy_campomorro` (68 tufos, 281.656
tri). **Os 8,3 M do córrego são reais, mas a causa continua por identificar.**

**Consequência prática:** não falta budget para deixar casa, bicho e prop bonitos. Falta
**tirar o budget de onde ele não aparece** e pôr onde o jogador olha.

## 7. Armadilhas de medição já pagas nos mapas

- **Frametime não discrimina.** 8,30 ms é só o vsync de 120 Hz da máquina de teste
  (`POLISH-CATALOGO-CONTINUIDADE.md`, só na branch da pilha). O orçamento que importa é
  **draw call e triângulo por quadro**.
- **Medir uma vez engana.** (A versão anterior citava "uma leitura de p95 fingiu regressão de
  65%" — **sem procedência em nenhum arquivo**; fica a lição, não o número.)
- **O gerador de grafite tem carimbo de frescor atacadão:** regerar **um** mapa marca **todos**
  como frescos — dá para deixar o portão verde sem ter feito o trabalho. **Defeito de
  ferramenta ainda de pé.**
- **A régua de cena reescreve o arquivo do catálogo inteiro** — não pode entrar em PR de um
  mapa só.
- **GLB que não carrega em node faz um mapa ser medido vazio.** A Praça foi medida assim.
- **Identidade é o que menos avançou.** A régua de densidade de texel deixou 43 cláusulas
  vermelhas pré-existentes (recibo `_reguas.md`); nas branches da pilha (não na main) onze
  mapas medem 128 px/m — 8 com dispersão 1,00×, Córrego 1,03×, Escadão 1,27×, Amazônia
  1,38×. Mas **"parece o Brasil?" nenhuma régua responde** (`KNOWN-BUGS.md`: "só o dono
  responde").

**Estado de entrega:** **31 PRs de mapa abertos** em duas correntes que duplicam o mesmo
trabalho — A = `#540→541→542→545→547→548→550→551` (8) e B = `#554→…→567` (10) — mais
avulsos (`PLANO-BUMP-MAPAS.md §4`). **Nenhum da pilha mesclado, nenhum com aprovação visual
humana** ("Nenhum pixel foi verificado"). A exceção é o **PR #589 (MERGED 12/09)**, que trouxe
o orçamento dos 17 mapas e é a origem dos 8,3 M tri do córrego. A decisão pendente é fechar
uma das duas correntes. Mesmo padrão do viewmodel: o trabalho existe, a entrega não chegou.

---

## 8. O QUE EU PRECISO DE VOCÊ (o pedido de pesquisa)

Você é um **level designer sênior de FPS competitivo** com experiência em mapas de CS/Valorant
e em jogos de navegador com orçamento apertado.

1. **Exposição de spawn.** Nós medimos "fração dos pontos andáveis a ≥25 m que enxergam a
   cabeça de quem nasce" e derrubamos de ~75% para ~2–10%. **Existe um alvo publicado ou
   praticado para isso?** Qual é a faixa saudável, e o que acontece quando ela fica baixa
   demais (spawn camping invertido, rotação morta)?

2. **Maior visada limpa.** Reduzimos a maior linha de tiro do spawn de 153 m para 52 m.
   **Qual é a distância de engajamento saudável para um FPS de partida curta (~2 min de
   mediana) com armas hitscan?** Como CS2 e Valorant distribuem sightlines curtas/médias/longas
   dentro de um mesmo mapa?

3. **Os 17 mapas são demais.** Com DAU de 57, cada mapa é jogado pouquíssimo. **Qual é o
   número certo de mapas para um jogo neste estágio**, e qual o critério para aposentar um?
   Existe evidência de que catálogo grande **prejudica** retenção em early access?

4. **Retenção pelo mapa.** Nossa mediana de partida é **108 segundos** e 73,7% terminam em
   `quit`. **O que, em level design, faz alguém jogar o segundo round?** Quais decisões
   concretas de layout (rotas de rotação, pontos de contra-jogo, ritmo de encontro) são
   citadas por designers como as que seguram o jogador?

5. **Orçamento de polígono em navegador.** Temos um caminhão de 89 k tri repetido 7× e casas
   de 1 k tri. **Qual é a prática para budget por mapa em WebGL/Three.js**, considerando que
   17–28% dos nossos jogadores rodam abaixo de 30 FPS? Draw call vs. triângulo: qual é o
   gargalo real e como se mede isso corretamente num navegador?

6. **Identidade visual mensurável.** A única coisa que nenhuma régua alcança é "isso parece o
   Brasil?". **Existe alguma forma de tornar identidade visual verificável** — paleta medida,
   densidade de sinalização/tipografia, razão de materiais — ou isso é irredutivelmente
   humano?

7. **Referências.** Aponte breakdowns de mapa, GDC talks ou documentos de Valve/Riot sobre
   metodologia de layout, blockout e teste de mapa que valham a leitura. Prefiro fonte real e
   verificável a conselho genérico.
