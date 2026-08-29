# 23 - RENDER CORE: o salto de geração visual (CCC → A)

> Escrito em 19/08/2026, com as frases **literais** do dono e os prints de referência
> que ele mandou (barco com água viva estilizada; jogo de carros com poeira e horizonte
> dinâmico). É o plano que responde: *"eu quero saber como!!"*.

## O diagnóstico literal do dono

> *"no mapa do joa por exemplo parece NES->SNES, enquanto o Threejs entrega PS3, estamos
> 2 geracoes visuais atras, e isso e o que me incomoda mais, eu ja tentei de tudo e nao
> conseguimos"*

> *"nao e um padrao visual AAA, mas é um padrao AA ja ou A, e o nosso ta tipo CCC,
> melhorou muito mas ta ruim ainda [...] olha a poeira saindo dos carros, o horizonte
> dinamico cara é isso falta muito pros mapas, mas a gente pode chegar lá"*

> *"minha preocupacao nao é só a parte de models, mas é os mapas ter um padrao visual e
> qualidade visual, em escala, textura, ambiencia"*

## Por que "tentar de tudo" não fechou a conta

O salto dos prints dele **não é model** — é renderer. Model melhor dentro do mesmo render
continua CCC. Os ingredientes que os olhos dele marcaram, um a um, e a técnica Three.js
que os entrega (tudo zero-build, r160 vendorizado, sem CDN):

| O que ele apontou | A técnica | Estado no repo |
|---|---|---|
| Água com movimento, cor por profundidade, espuma na praia e no casco | `ShaderMaterial` de água com **depth texture** (tinta raso→fundo), 2 normal maps em scroll, Gerstner waves no vértice, espuma por profundidade (contato = espuma) | Não existe. Córrego tem onda de vértice + scroll de UV (frente B, v2.1); Joá é plano azul morto |
| Peixes/sombras visíveis sob a água | Transparência com cena atrás (a depth tint faz o resto) | Não existe |
| Poeira saindo dos carros | **Soft particles** (fade por depth texture — sem aresta dura onde a fumaça toca o chão) + billboard esticado | `gpuparticles.js` existe mas SEM depth fade (aresta dura) e só para tiro |
| Horizonte dinâmico | **Fog com a MESMA cor do horizonte do céu** (o truque que assenta a cena) + sky dome com gradiente/nuvens por hora do dia | Céu é webp estático; fog por mapa não amarrado ao céu |
| Árvores com vida | Wind sway no vertex shader (`onBeforeCompile`, seno ponderado por altura) | Não existe (grama da frente E chega estática) |
| O "A" dos AA | ACES + bloom + grade por mapa + sombras longas de sol baixo | `bloom.js` próprio com ACES/CustomToneMapping já existe (base boa!) |

Leitura: a base já tem composer, bloom, ACES e partículas GPU — o salto é **ligar essas
peças num sistema de "look por mapa"** e adicionar as duas tecnologias que faltam:
**depth texture** (água/soft particles) e **vertex wind**.

## As frentes do render core

**RC1 — Look por mapa (fog = horizonte = sol = grade, UM sistema).** Cada mapa declara
um `look`: cor do horizonte, cor/zénite do céu, direção/cor do sol, neblina, grade.
O fog nasce da cor do horizonte (nunca cinza genérico). Régua: para cada mapa, a cor do
fog amostrada bate com a cor do horizonte do sky (ΔE com teto; mutante descasada →
vermelho). É a frente mais barata e a que mais muda o jogo — é ela que tira o "CCC".

**RC2 — Água viva.** Shader de água com depth texture: tinta por profundidade, espuma
de contato (praia, casco, pedra, cais), 2 normal maps + Gerstner, especular de sol.
Ordem: oceano do Joá (o pior ofensor literal) → córrego (upgrade da frente B) → espelho
de Brasília → piscina. Régua: cláusula de que o material tem depth-fade + foam (mutante
remove `depthTexture` → vermelho) + captura 3:2 comparada com o print de referência do
dono, olhada por um humano/ crítico — número nenhum fecha água sozinho (Lei 4).

**RC3 — Soft particles ambientes.** Estender `gpuparticles.js` com depth fade (uma
`uniform sampler2D tDepth`, fade por distância de profundidade) e abrir usos ambientes:
poeira de rua/estrada, fumaça de churrasqueira de laje, fuligem de ferro-velho, névoa de
córrego de manhã. Régua: partícula que toca o chão sem fade reprova (sonda de shader +
mutante que corta o depth fade).

**RC4 — Vento.** Sway de vertex shader para: grama/tufo (frente E), palmeiras, bandeiras
(poste/fachada/praça), rabiola da pipa, roupa do varal. Mesmo chunk `onBeforeCompile`
com `uTime` + peso por altura. Régua: vértice do topo se move, da base não (mutante
congela → vermelho).

**RC5 — Gates visuais de mapa (o "padrão comum" do dono).** A régua visual vigente
(`tools/eval/BAR-CONSISTENCIA.md`) ganha a camada render-core: captura 3:2 por mapa com
checklist medido — fog==horizonte (RC1), água viva onde há água (RC2), partícula ambiente
onde faz sentido (RC3), vento onde há pano/folha (RC4), escala humana coerente (já existe
`escala-favela` como precedente de teto com procedência). **Temática diferente por mapa,
projeto e padrão comuns** — exatamente a frase dele.

**RC6 — Biblioteca comum de assets (a "lib" do dono).** Consolida o que a frente E
começou: props normalizados (~1 m, pivô central, FONTE+SHA) organizados por TEMA
(favela, praia, rodovia, interior, institucional) + gramática do
BuildingGeneratorThreeJS (MIT, kit de peças) para prédios/barracos com placement seeded
+ img2threejs local como rota open-source de image-to-3D (alternativa ao Mint/Tripo/
Meshy para props simples). Pesquisa de referência ANTES por tema ("como é uma favela de
córrego em SP?") — o padrão que a frente F provou com a pesquisa SP×RJ.

**Editor (pós-release): `mapbuilder.csbrasil.online`.** A visão CS 1.0→1.6: mapa-como-
dado (`map_json.js`, issue #210) + esta biblioteca + os gates visuais do RC5 como
validador do builder. Não começa antes da release; o RC5 é o pré-requisito real dele.

## Ordem de execução

1. **RC1** (look por mapa) — barato, maior delta visual por linha.
2. **RC2** no Joá — o alvo da frase mais dolorida; referência = print do barco.
3. **RC3 + RC4** — partículas e vento, independentes, paralelizáveis.
4. **RC5** — vira portão quando RC1-4 existirem; preview v2 do fy_campomorro (plans/22)
   entra DEPOIS do RC1+RC4, já nascendo no padrão novo (mato com vento, fog assentado).
5. RC6 contínuo; editor pós-release.

## Vetos e leis (herdados, não se negociam)

- Régua antes do conserto, com mutante que morde; teto com procedência; figura gerada e
  OLHADA (água/céu/partícula só fecham com captura 3:2 descrita — nunca por placar).
- Quem constrói não dá a nota: crítico adversarial por frente.
- Zero build, zero CDN: depth texture, shaders e passes novos entram como módulos
  vendored ou código próprio — `bloom.js` é o precedente de composer custom na casa.
- Mint só 3D/rig; 2D só OpenRouter; sprite sheets de fumaça/poeira são 2D (OpenRouter).
