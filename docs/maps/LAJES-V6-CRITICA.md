# Lajes V6 — crítica visual independente

Data: 2026-09-06. Branch: `codex/lajes-visual`; HEAD observado: `5bc91913` (árvore em edição pelo MAIN). Escopo: pixels V6 `artifacts/lajes-visual/v6/browser-first/` contra V5 `artifacts/lajes-visual/v5/browser-final/`. Nenhum navegador, alteração de produção ou commit foi feito por este crítico.

## Veredito da primeira captura

**A estreiteza das ruas está atendida nos frames apresentados. Nota para o pedido específico: 9/10. Nota visual do conjunto: 7/10.** As notas são julgamento visual, não resultado automatizado nem aprovação do dono.

O salto dos dois spawns V5 para V6 é inequívoco: o chão aberto em frente às casas deu lugar a passagens comprimidas entre portas e paredes próximas. Rua central, dois becos, esquina de respawn e travessa sob a ponte também leem como circulação pedonal estreita. Não encontrei outra rua larga nas vistas de térreo inspecionadas. O campo/praça é o único vazio largo contínuo mostrado no térreo.

As lajes continuam abertas: `circuito-superior-oeste-016.png` apresenta uma superfície generosa entre guarda-corpos e fachadas. Portanto, “só o campo é amplo” é verdadeiro para as ruas no chão deste conjunto, não para toda superfície jogável em qualquer altura. Não considero a abertura dos telhados uma violação automática do pedido sobre ruas.

Não encontrei ruptura visual concreta de continuidade, piso flutuante ou escala residencial incoerente nos frames. Portas, janelas, corrimãos e corpos dos personagens dão escala humana. A ambiência local ganhou confinamento; a primeira captura perdeu acabamento nas quatro empenas voltadas ao campo. Não usei imagens estáticas como prova de colisão, travessia completa, desempenho ou ausência de travamento de bots.

## Cobertura efetivamente vista com `view_image`

Todos os nomes V6 abaixo referem-se a `artifacts/lajes-visual/v6/browser-first/`.

| Frame / grupo V6 | Leitura dos pixels | Comparação V5 |
|---|---|---|
| `spawn-norte.png`, `spawn-sul.png` | Becos muito estreitos, paredes altas próximas; sem pátio largo na vista | Melhora forte frente aos dois frames homônimos V5 |
| `rua-central.png` | Corredor estreito até a abertura central; marquises reforçam confinamento | Não existe frame homônimo V5; sem A/B de pose idêntica |
| `beco-oeste.png`, `beco-leste.png` | Ambos estreitos; fiação e portas dão escala | Oeste mais comprimido que V5 homônimo. Leste sem homônimo V5; `beco-leste-003.png` V5 é outra pose, não comparação métrica |
| `esquina-respawn.png` | Corredor estreito até o fundo, seta informa mudança de direção | Sem homônimo V5 |
| `travessa-sob-ponte.png` | Passagem estreita e coberta, saída visível junto ao elemento de cobertura baixo | Sem homônimo V5; frame não basta para medir largura livre ao redor do obstáculo |
| `praca-norte.png`, `praca-sul.png` | Campo/praça preserva abertura; corredores de saída são estreitos | Em relação a V5, desaparece o prolongamento largo ao fundo; surgem duas empenas lisas dominantes em cada vista |
| `praca-da-laje.png` | Campo aberto e bar legível; nova casa fecha a esquerda da composição | Mais densidade que V5 homônimo; fechamento tem lateral lisa grande |
| `escada-norte.png` | Escada confinada por paredes; degraus e corrimãos legíveis | V5 expunha a lateral ao campo; V6 reforça compressão |
| `laje-oeste.png` | Varal e caixa-d’água dão identidade; caminho visível além deles | Mesma linguagem V5; não vejo ruptura de materiais/escala |
| `fachada-oeste.png` | Porta preenche quase toda a vista; fachada completa não é avaliável | Regressão da captura: V5 mostrava porta, verga, textura e instalação lateral |
| `horizonte-norte.png`, `horizonte-sul.png` | Casas, fiação, pipa, helicóptero e camada distante preservados | Sem regressão visível do horizonte; novas massas próximas ocultam parte do casario baixo |
| Circuitos superiores oeste e leste, `008`, `016`, `024`, `032`, `040`, `041` (12 frames) | Subida, topo e descida mostram continuidade de superfícies; descidas confinadas terminam junto a fachadas, com seta na vista alta | Cobertura complementar V6; não fiz comparação pixel a pixel dos 12 frames de movimento V5 |

Também foram vistos os 12 frames V5 explicitados na tabela, incluindo ambos os horizontes, ambas as praças, spawns, laje, escada, fachada e `beco-leste-003.png`. As diferenças de personagens e armas largadas são estado dinâmico e não foram atribuídas à alteração arquitetônica.

## Três gaps concretos, por prioridade

1. **Empenas do campo perderam leitura de casa — limitação estética localizada.** Nos dois frames `praca-norte.png` e `praca-sul.png`, quatro faces novas são grandes retângulos praticamente cegos: duas por vista, com largura 4,2 m e altura aproximada 6,12 m (25,7 m² por face na base geométrica). A passagem central ficou correta, mas essas faces parecem fechamento de bloco de teste. Causa geométrica: casas em `public/js/map_lajes_authored.js:231` e `:233`; `home` concentra composição na face longitudinal em `public/js/lajes_houses.js:80` e `:85`. Correção verificável: compor cada uma das quatro faces com dois níveis de vãos e marcação entre pavimentos, preservando o corredor. **O MAIN informou uma edição posterior à captura; o código atual já contém esse tratamento em `public/js/map_lajes_authored.js:236`. A primeira captura não comprova o resultado dessa edição.**

2. **Fachada-oeste perdeu utilidade como evidência — bloqueio de avaliação dessa pose, não defeito comprovado do mapa.** `fachada-oeste.png` V6 enquadra uma porta gigante e corta sua marquise, enquanto o V5 mostrava um módulo de fachada. A pose inicial em `tools/eval/lajes-browser-check.mjs:25` usava x=0, z=-13, mirando para oeste, perto das casas novas. Correção: capturar uma fachada exposta a partir do campo com porta inteira, marquise e ao menos uma janela no frame; registrar a mudança de pose para não chamar isso de A/B geométrico idêntico. MAIN informou que fará nova captura dessa pose.

3. **Ritmo arquitetônico excessivamente regular — limitação estética, não largura nem bloqueio funcional.** Em `rua-central.png`, `spawn-sul.png` e `beco-leste.png`, a sucessão muito reta de portas escuras, marquises iguais e faixas entre pisos dá aparência modular repetida. A estreiteza está correta, mas falta variação de silhueta residencial. Fontes: repetição de módulos de profundidade 5,75 m em `public/js/map_lajes_authored.js:232`; três variantes de porta/janela em `public/js/lajes_houses.js:90` e `:103`. Próximo ajuste opcional: variar somente elementos acima de 2,3 m, por exemplo duas profundidades de marquise e um recuo superior de 0,15–0,30 m a cada 3–4 unidades. Não aumentar a largura no térreo nem poluir a passagem com props. Esse gap já existia em parte no V5; a proximidade V6 o torna mais evidente.

## Estado e próximo passo

Aceito visualmente o estreitamento da primeira captura. Não há bloqueador concreto de largura identificado. A revisão das empenas e da pose de fachada ainda depende dos pixels finais. Reavaliar esses frames quando chegarem, conservar a diferença entre primeira captura e código posterior e atualizar este documento com o resultado. Testes de navegação/colisão ficam a cargo do MAIN e não são certificados por esta crítica de pixels.

## Adendo final — pendências verificadas nos pixels

Revisão final em 2026-09-06, na mesma branch. Foram vistos diretamente com `view_image` sete PNGs de `artifacts/lajes-visual/v6/browser-final/`: `praca-norte.png`, `praca-sul.png`, `praca-da-laje.png`, `fachada-oeste.png`, `rua-central.png`, `spawn-norte.png` e `spawn-sul.png`. A cobertura dos demais pontos continua sendo a análise da primeira captura acima; não apresento esses pontos como recapturados por este crítico.

**Veredito final: pedido de ruas estreitas atendido visualmente, 9/10. Nota visual do conjunto revisada de 7/10 para 8/10.** Sem bloqueador visual concreto identificado na revisão. As duas pendências anteriores estão encerradas.

- **Gap 1 resolvido.** Os dois frames do campo agora mostram quatro janelas por empena, divididas em dois pavimentos, além de vergas, molduras e faixa de tijolo na base. As quatro faces antes cegas passam a ler como casas. `praca-da-laje.png` confirma esse tratamento na vista oblíqua próxima, sem a grande lateral lisa que dominava a esquerda. O campo continua largo, as saídas continuam estreitas e os detalhes não encobrem sua leitura. Evidência final suporta o tratamento de `public/js/map_lajes_authored.js:236`.
- **Gap 2 resolvido como captura.** `fachada-oeste.png` agora mostra a mercearia: letreiro legível, balcão, abertura comercial, porta lateral, marquise e a relação com a laje acima. A pose final é `[-1.7, 0, -4.5, PI/2, 0]`, confirmada em `tools/eval/lajes-browser-check.mjs:25`. Ela é útil para avaliar material, escala e identidade da fachada, mas representa outra posição e outro módulo em relação ao V5; não é um A/B de pose idêntica.
- **Gap 3 permanece como polimento opcional.** Os três frames finais de rua/spawn mantêm a sucessão bastante regular de portas e marquises, mas também confirmam o confinamento correto das vias. Não surgiu outra rua larga nem houve regressão de largura aparente nesses frames. Não há motivo visual para reabrir os pátios ou alargar corredores para resolver esse ponto estético.

O campo permanece o único vazio largo contínuo mostrado no térreo; áreas abertas das lajes são a ressalva já registrada. Este adendo encerra a tarefa de crítica independente de pixels. Aprovação do dono, colisão, navegação e desempenho continuam fora da certificação visual deste documento.
