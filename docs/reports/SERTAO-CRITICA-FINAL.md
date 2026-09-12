# Sertão — crítica adversarial das capturas runtime

> Histórico de uma iteração rejeitada. O nome do arquivo não indica aprovação da entrega atual; veja `SERTAO-CRITICA-R4.md` e `SERTAO-ENTREGA.md`.

Data: 2026-09-06. Branch: `codex/sertao-astra`. Conjunto avaliado: **somente as sete PNG de `artifacts/sertao-astra/runtime/`**, abertas integralmente por `view_image`. Não foram usadas as imagens de `after/`. Cada frame tem 1536×1024, proporção 3:2. Não foi executado browser, editado runtime ou criado commit por esta crítica.

**Veredito final deste conjunto: REPROVADO visualmente. Nota editorial: 5/10, contra 4/10 no baseline.** O mapa ganhou massas de habitação e perdeu a dominante laranja, a costura do céu e as plantas rolantes. Agora a leitura brasileira depende mais de arquitetura e uso do que do letreiro. Entretanto, a vegetação nova e o horizonte parecem protótipos, o casario procedural está pobre e repetitivo ao lado dos GLBs detalhados, e o comércio conserva a fachada de madeira com uma placa cortada. O resultado ainda não entrega o Sertão estilizado realista pedido.

A nota é julgamento visual, não score de FPS, movimento, combate ou colisão. Não há aprovação automática por testes verdes ou redução de calls.

## Proveniência das imagens e referência fotográfica

| PNG de `runtime/` | SHA256 prefixo | Conferência principal |
|---|---|---|
| `praca.png` | `1ac13735533840e8` | Cobertura central, casario fechado, massas/sombras, orientação |
| `venda.png` | `93c4bd55fc3a8ed5` | Fachada, placa cortada, materiais e paisagem lateral |
| `poco.png` | `d8c924ab42f82456` | Copa nova, poço, repetição de trama nas paredes e flora |
| `forro.png` | `8aa39c93f38c49e4` | Palhoça, bandeiras, caixas de som, céu e arbustos distantes |
| `leste.png` | `c7a47e02db9bcad0` | Mistura de estilos: cacto/caminhão detalhados, casa/rocha simplificadas |
| `sul.png` | `9dd638d6310fda9d` | Casas de pedra repetidas, fachada bicolor, piso e sombras |
| `aerea.png` | `6fb8c1522e957055` | Arena, disco de terreno, distribuição e vazio exterior |

Comparação A/B: os sete PNG de `artifacts/sertao-astra/before/` foram abertos na crítica inicial; suas evidências e hashes estão em `SERTAO-CRITICA-BASELINE.md`. Coordenadas de pixel deste relatório usam origem no canto superior esquerdo da imagem original.

Comparação com fotografias: usei **as observações atribuídas ao agente principal** em `docs/reports/SERTAO-REFERENCIAS.md`, especialmente `Mud_house.JPG` (Maranguape) e a capela da Fazenda Colônia. Não alego ter aberto essas fotos nesta crítica. O registro descreve casa de barro fechada, trama exposta localizada, telha cerâmica baixa, morros com arbustos cinza densos; na capela, parede branca, degrau/piso de pedra e arbustos verdes espaçados. As fotos não foram medidas como paleta nem representam todo o Sertão. A divergência verificável aqui é entre essas características descritas e o que as PNG do jogo mostram.

## P1 — corrigir antes de novo aceite visual

### P1.1 — Copa de juazeiro com textura de parede e silhueta de balões

**REPROVADO; regressão de consistência em relação à árvore nua do baseline.** `poco.png`, x≈849–1326, y≈160–419: grandes volumes verdes arredondados e facetados, com pequenos desenhos escuros de trama que também aparecem nas casas. O mesmo padrão repete em `forro.png`, x≈20–295, y≈352–478. A copa parece várias bolas sobrepostas sobre um tronco detalhado. Acrescentar verde resolveu presença de folhas, mas introduziu uma linguagem diferente do cacto e do tronco.

**Causa concreta:** `public/js/map_velho_oeste.js:528` usa **`map: TX.paupique` no material de folha**. Linhas 529–535 repetem nove icosaedros de raio 1, com posições/escalas regulares. A textura de reboco não é um substituto válido para a textura/volume de folhagem; satisfazer a existência de `map` não dá aparência botânica.

**Correção de menor custo:** retirar a textura de parede das folhas e usar material específico sem trama/reboco; reduzir as unidades visíveis para três a cinco massas conectadas menores, com contorno irregular e lacunas que deixem aparecer parte dos ramos. Não trocar isso por nove esferas lisas maiores. Um atlas pequeno compartilhado ou geometria simples com variação de cor basta; não é necessário baixar outra árvore. Manter escala do tronco e o colisor.

**Aceite:** zero desenho de tijolo/trama nas copas; nenhum agrupamento lê como balões em `poco` e `forro`; mesma densidade de detalhe perceptível entre tronco e copa. Custo baixo/médio, impacto alto em dois primeiros planos e na identidade da flora.

### P1.2 — Horizonte é um disco recortado e a caatinga distante é feita de palitos

**REPROVADO; melhor que a borda quadrada original, ainda insuficiente.** `aerea.png` mostra um círculo/oval de terreno com contorno nítido, aproximadamente x=274–1264 e y=329–1007, flutuando visualmente num campo bege quase uniforme. A transição ainda denuncia o limite construído. Em `forro.png`, x≈1108–1452, y≈530–590, os “arbustos” são grupos de riscos em X, separados quase como sinalização. Atrás deles há uma faixa montanhosa clara sem massa vegetal reconhecível. `venda.png`, x≈1098–1535, y≈385–578, exibe a mesma superfície distante lisa.

**Causa concreta:** `public/js/map_sertao_landscape.js:6–20` usa cinco anéis concêntricos e material Basic com cor por anel; linhas 24–35 distribuem 220 grupos de cinco cilindros finos inclinados. Isso produz profundidade geométrica mínima, mas não o agrupamento de arbustos descrito na referência de Maranguape. A falta é de forma e transição, não de mais névoa.

**Correção de menor custo:** substituir os cinco palitos de cada grupo por uma silhueta ramificada compartilhada, com ramificações finas anexadas ao corpo principal; agrupar em quatro a seis manchas de densidade variável, concentradas fora das rotas. Quebrar o contorno próximo do terreno e casar cor/altura da borda com a primeira faixa externa. Manter duas silhuetas de serra distinguíveis; evitar que toda camada tenha a mesma luminosidade do fundo. Pode conservar instancing e um material por família. Não densificar a praça para disfarçar o exterior.

**Aceite:** do `forro` e da `venda`, o exterior lê como vegetação baixa seca, não riscos soltos; do alto, não há disco de recorte perceptível; ao nível do jogador, pelo menos dois planos de paisagem continuam legíveis. A imagem aérea é diagnóstico de cenário, não câmera normal de partida. Custo médio, impacto global.

### P1.3 — O principal nome comercial está truncado

**REPROVADO; defeito pequeno e diretamente visível.** Em `venda.png`, placa x≈681–1069, y≈330–463, lê-se **“ENDA DO SERTÃ…”**: o V inicial e o término da palavra ficam cortados no próprio letreiro. O arquivo inteiro mostra a placa, portanto não é corte de enquadramento. O subtítulo aparece menor e cabe.

**Causa concreta:** `public/js/map_velho_oeste.js:226–231` desenha o título numa canvas de 512 px com fonte fixa de 58 px, sem medir largura ou fornecer ajuste; a linha 421 passa `VENDA DO SERTÃO`.

**Correção de menor custo:** ajustar fonte pela largura medida do texto, reservando 24–32 px de margem de cada lado. Não encurtar o título de maneira silenciosa nem fazer uma placa maior que a fachada.

**Aceite:** `VENDA DO SERTÃO` integralmente dentro da moldura no mesmo frame. Custo muito baixo; impacto alto por ser uma das poucas mensagens de orientação/identidade do mapa.

## P2 — ainda impede consistência final

### P2.1 — Taipa fechada melhorou a arquitetura, mas a trama virou um carimbo repetido

**REPROVADO em material/variedade; APROVADO somente em massa fechada.** `leste.png`, x≈875–1300, y≈407–555, apresenta várias marcas idênticas de trama, em linhas regulares, sobre uma grande parede quase chapada. `poco.png`, x≈738–1008, y≈450–610, repete os mesmos motivos. A descrição da foto fala em trama exposta **localizada**; no mapa ela funciona como estampa periódica. As cinco casas compartilham um teto de planos finos com poucos sinais de telha, enquanto as casas de pedra e a geminada de `sul.png` têm telhado com telhas individualizadas.

**Causa:** `public/js/map_velho_oeste.js:123–127` gera a lacuna dentro do tile e repete a textura 2×2. Não há separação entre reboco de base tileável e dano localizado. A família procedural substitui o GLB aberto, mas também simplifica bastante a cobertura.

**Correção:** retirar a trama do tile base; pôr um ou dois danos posicionados por parede, com tamanho/rotação diferentes. Acrescentar beiral/cumeeira e uma leitura de telha consistente nos telhados procedurais, mantendo footprints e usando a mesma família de material. Não voltar ao GLB vazado.

### P2.2 — Western perdeu força, mas a venda e os cactos ainda sustentam a associação

**REPROVADO no requisito “sem western americano”.** A retirada de plantas rolantes e das armações abertas foi eficaz. Contudo, `venda.png` continua dominada por tábuas verticais, molduras de madeira e frente alta; a placa nova nomeia o Brasil sem alterar a linguagem principal da fachada. Os cactos continuam isolados, repetidos sobre pedestais pétreos nas mesmas posições de `poco` e `leste`. Carroça e fardos podem existir num arraial brasileiro; não são veto isolado. A combinação com o comércio de tábuas e o perímetro estéril é o que mantém o faroeste.

**Correção:** reboco caiado/ocre nas superfícies grandes da venda, madeira concentrada em portas/janelas; manter a platibanda, que não é o problema por si só. Disfarçar as bases repetidas dos cactos e colocar parte deles junto de arbustos baixos em grupos assimétricos externos. Não acrescentar mais letreiros como substituto de forma/material.

### P2.3 — Rocha de faces planas e props em caixas não combinam com os GLBs detalhados

**REPROVADO em consistência, não por baixo polycount isoladamente.** `leste.png`, rocha x≈443–734, y≈532–699: cinco ou seis faces grandes, padrão vertical esticado e cor marrom, ao lado de cacto e caminhão com detalhes finos. Em `praca.png`, x≈243–614, y≈514–738, a cobertura principal são cubos de madeira sem travessas/estrutura que os identifique claramente como caixotes. Os contornos funcionam como massa, mas o acabamento parece proxy.

**Causas:** rochas em `public/js/map_velho_oeste.js:556` usam `DodecahedronGeometry(...,0)`; `MAT.pedra`, linha 202, reutiliza `TX.sand`. A madeira das caixas tem textura, mas quase nenhuma definição de construção nas faces.

**Correção:** uma geometria de pedra compartilhada com uma subdivisão adicional e material mineral de baixo contraste; manter cinco pedras e o footprint. Dar travessas/tampas ou juntas aos caixotes existentes com poucos detalhes compartilhados. Não elevar todo o mapa ao detalhe do caminhão para resolver isso.

### P2.4 — Piso perdeu ruído excessivo, mas ficou uniforme demais junto dos edifícios

**REPROVADO em acabamento local; melhora cromática real.** As tiras artificiais do baseline desapareceram e as rachaduras deixaram de disputar atenção. Entretanto, nos terços inferiores de `poco`, `sul` e `venda`, o mesmo bege contínuo cobre rua, soleira, quintal e base dos objetos. O chão tem pouca hierarquia de uso e quase nenhuma transição sob paredes/pedras. A solução não é encher de entulho nem voltar à textura laranja contrastada.

**Causa:** `public/js/map_velho_oeste.js:187–194` aplica ao solo inteiro uma textura de variação muito pequena, repetida 180×180. O mesmo plano atravessa o contexto das construções.

**Correção:** duas ou três manchas grandes de terra compactada de baixo contraste nos acessos e uma faixa discreta de contato na base das paredes, sem colisão e sem detalhe pequeno espalhado. Conferir sombras: em `praca.png`, a sombra do primeiro caixote tem degraus/pixels grandes no fim, x≈1050–1205, y≈791–870. Ajustar enquadramento da shadow camera antes de simplesmente aumentar a resolução.

## Comparação objetiva que realmente mudou

Média de saturação HSV na caixa fixa **x=100–1399, y=700–999**. É amostragem predominantemente de piso, não máscara semântica perfeita; portanto compara apenas os mesmos enquadramentos.

| Frame | Baseline | Runtime |
|---|---:|---:|
| praça | 0.789 | 0.300 |
| venda | 0.778 | 0.301 |
| poço | 0.781 | 0.303 |
| forró | 0.766 | 0.334 |
| leste | 0.752 | 0.316 |
| sul | 0.791 | 0.291 |

**APROVADO: correção da dominante laranja.** A redução média dessas seis caixas é aproximadamente 60%; não houve medição completa de C25 nem de contraste de personagem. A sombra alongada ainda dá pista de sol baixo, mas a tarde quente agora é sutil. Não se deve recuperar a atmosfera com um filtro laranja geral.

**APROVADO no conjunto visto: remoção da costura vertical do céu.** Na região usada no baseline de `forro` — y=30–249, comparando x=1150–1159 com x=1175–1184 — a diferença RGB média caiu de **16.81 para 0.47/255**. As sete imagens não mostram emenda vertical. Isso não é um giro completo de câmera.

**APROVADO: poço e capela seguem reconhecíveis.** Não perderam identidade com o ajuste de luz. **APROVADO: palhoça agora tem piso, cobertura, bandeirolas e som reconhecíveis**, embora ainda tenha acabamento de formas básicas. **APROVADO: as casas de taipa finalmente aparentam volume de parede sólido.** São aceitações específicas, não aprovação do mapa.

## Cobertura, personagens, vazio e limites de gameplay

- **Cobertura aparente:** caixas, fardos, carroça, casas fechadas e paredes baixas têm silhuetas visíveis na praça. A taipa sólida elimina a contradição visual óbvia de enxergar através de um volume supostamente fechado. Isso não comprova colisão nem bloqueio de tiros.
- **Ambiguidade restante:** postes e travessas finos perto das rotas continuam possíveis pontos de discordância entre bala/corpo/visual. Não há raycast ou movimento nas imagens para aprovar ou reprovar seu comportamento.
- **Personagens:** não há jogadores renderizados nos sete frames. Portanto não há evidência para aprovar separação aliado/inimigo, contraste de silhueta, visibilidade de cabeça ou leitura em sombra. Vãos escuros da venda e props pretos da praça merecem o próximo teste com personagens, mas não são prova de personagem invisível.
- **Vazio:** o centro deve conservar espaço de movimento. O vazio que reprova é a ausência de transição paisagística no exterior e de uso/material próximo às fachadas. Encher o piso jogável de props seria uma resposta errada.
- **Fauna:** `forro` mostra uma pequena ave junto ao alto da cobertura; `leste` mostra um animal muito pequeno perto da casa/caminhão. Um frame não demonstra contato, comportamento ou espécie. Não há nota de fauna animada.
- **Três rotas/spawns/CTF:** a régua Node e os testes do coordenador são evidência técnica separada. Esta crítica não os reaprova visualmente nem transforma seus resultados em prova de partida real.

## Custo: evidência de contadores, sem nota de FPS

`runtime/report.json` registra aérea com **447 calls / 325.057 triângulos**, contra **503 / 320.181** no baseline: calls **-11.1%**, triângulos **+1.5%**. Isso respeita o teto de 503 calls informado pelo coordenador para essa vista, mas não significa melhoria em todos os ângulos: poço passou de 369 para **402 calls**, forró de 62 para **72 calls**; triângulos do forró passaram de 37.686 para **66.708**. Registro atual tem 118 geometrias e 88 texturas.

Nenhum desses contadores mede frame time, FPS de notebook, estabilidade prolongada, partida com jogadores ou custo de combate. Não usar a redução aérea para declarar “mapa mais rápido” sem o percurso runtime equivalente.

## Decisão para a próxima passagem

Resolver primeiro **material/silhueta da copa**, **recorte/transição da paisagem** e **texto da venda**. Depois conferir trama repetida, telhados procedurais e rochas, preservando as três rotas e os ganhos de colisão. Repetir as sete câmeras, acrescentar personagens reais na praça/venda e manter a evidência por frame.

Este relatório reprova **as PNG identificadas por hash acima**. Se elas forem recapturadas, uma nova comparação deve dizer quais reprovações foram removidas. Resultado tecnicamente verde e mapa visualmente pronto são estados distintos; o primeiro não substitui o segundo.
