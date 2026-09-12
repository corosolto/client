# Sertão — crítica adversarial do baseline

Data: 2026-09-05. Branch inspecionada: `codex/sertao-astra`; HEAD `49441895bebdfa328a228de142d0015b4597db9f`.

**Veredito visual: REPROVADO.** O conjunto ainda lê como arena de faroeste com capela e algumas casas brasileiras. A igreja, o casario caiado e o telhado cerâmico ajudam, mas o horizonte vazio, as armações abertas repetidas, o comércio com fachada de madeira e os cactos isolados dominam a leitura. Fim de tarde está presente; profundidade de paisagem e caatinga crível não estão.

Nota editorial de aderência visual: **4/10**. É julgamento do conjunto de imagens, não score de teste, FPS ou jogabilidade. Nenhuma nota de gameplay ou performance é atribuída.

## Escopo e evidência

Pedido usado: Sertão brasileiro estilizado realista; caatinga; adobe/taipa/capela/poço/palhoça/comércio; luz quente baixa; horizonte seco profundo; fauna coerente; ausência de western americano; três rotas, spawns/CTF/colisão corretos; variedade e performance.

Lidas `.claude/skills/asset-review/SKILL.md` e `.claude/skills/gauntlet-fps/SKILL.md`; critérios de consistência/espaço de jogo confrontados com `tools/eval/BAR-CONSISTENCIA.md`. Não foram lidos relatórios nem justificativas do builder. Código foi consultado depois das imagens para localizar causas; comentários de intenção do código não contam como evidência de aprovação. Não foi executado browser, teste de combate, edição de runtime ou commit.

Todas as **7 PNG reais**, 1536×1024, proporção **3:2**, foram abertas por `view_image`:

| Captura em `artifacts/sertao-astra/before/` | SHA256 prefixo | Conferência visual |
|---|---|---|
| `aerea.png` | `9e7fc1fb7629fd5d` | Plano retangular exposto, cerca retangular, distribuição das casas e vegetação |
| `praca.png` | `8ba2a9424fd5f97f` | Capela, caixas, carroça, feno, armações abertas e ruído do piso |
| `sul.png` | `ebb70b94ee9ee821` | Duas casas de pedra repetidas, casa bicolor, telhados, faixa de madeira no chão |
| `leste.png` | `47d579ab901514d1` | Cacto próximo, caminhão, casa aberta, pedra facetada e contraste de estilos |
| `venda.png` | `15216522798af34a` | Fachada comercial, janela, platibanda, ausência de identidade comercial legível |
| `forro.png` | `f13125a52f5d60c7` | Emenda do céu, armação de palco, bandeirolas escuras, cacto sobreposto à estrutura |
| `poco.png` | `75a9e0f10aff8292` | Poço legível, árvore nua, cactos repetidos, casas abertas e planta rolante |

Coordenadas abaixo são pixels da imagem original; origem no canto superior esquerdo. Medidas RGB/HSV foram feitas por Python/PIL/NumPy sem modificar imagens. Não há captura 16:9, personagens, HUD, tiros ou vídeo neste conjunto.

## Reprovações por retorno da correção

### 1. P1 — Casas visivelmente abertas recebem volume sólido sem acompanhar sua rotação

**REPROVADO por inconsistência visual/código; consequência em movimento ainda precisa de reprodução.** Em `leste.png`, x=875–1275, y=370–635, e `poco.png`, x=730–1010, y=405–620, as casas mostram uma trama aberta através da qual se vê o fundo. Não parecem massas de parede que justificariam bloqueio completo.

`public/js/map_velho_oeste.js:263–274` aplica `opts.ry` à malha retornada por `placeProp`, mas calcula o AABB usando `group.rotation.y`, que fica em zero no ramo GLB. A rotação do grupo só é atribuída no ramo proxy, linha 268. `public/js/mapprops.js:48–59` confirma a aplicação da rotação ao prop. Exemplo da casa em (-17.2,-7), linhas 393/400: com yaw π/2+0.08 e semi-extensões locais (2.9,3.55), a fórmula de rotação produz (3.770,3.174); o ramo GLB registra (2.9,3.55). Isso é divergência demonstrável de **0.870 m em X** e **0.376 m em Z** entre as fórmulas, sem precisar alegar colisão observada em jogo. Além disso, `varanda-casa-*` registra caixas completas de altura 2.6 m, linhas 409–415, cuja correspondência com os GLB abertos não foi comprovada.

**Correção barata:** centralizar o yaw antes da bifurcação GLB/proxy e usar a mesma transformação nos colisores. Fechar com barro/reboco os painéis que têm colisão sólida; se a varanda deve permitir passagem, subdividir seus postes em colisores finos. Conferir dimensões finais do GLB, pois `placeProp` usa média geométrica de `targetH` e `targetLen`, não garante ambas as medidas exatas. Não aumentar todos os AABB para esconder a divergência: isso pode cortar rotas.

**Aceite:** captura com overlay visual/colisor nas 10 casas, percurso nas quatro faces de cada família e tiros pelos vãos visíveis; repetir nos ramos GLB/proxy. Custo baixo para o yaw, médio para fechar painéis/casar footprint. Impacto alto em consistência e circulação.

### 2. P1 — Plantas rolantes mantêm o faroeste e alteram colisão nas rotas

**REPROVADO.** `poco.png`, x=1390–1535, y=548–710, mostra uma bola de aros castanhos; em `aerea.png` há outros objetos dessa família isolados na arena. Esse signo visual, junto dos cactos e carroças, reforça precisamente a leitura western rejeitada.

`public/js/map_velho_oeste.js:723–737` cria **3** plantas rolantes, cada uma com **9** toros; linhas 734 e 793–794 adicionam e deslocam AABB de colisão. Portanto são obstáculos móveis reais no código, embora não haja vídeo de um jogador esbarrando. O comentário “sem colisão” não corresponde à implementação.

**Correção barata:** remover as três plantas e seus colisores desta composição. Nenhuma substituição móvel é necessária. Se algum detalhe seco for indispensável, usar uma touceira estática baixa fora do corredor, sem colisão. Ganho adicional: elimina 27 toros, sujeito ao comportamento de batching da cena.

**Aceite:** nenhuma bola rolante nas mesmas sete câmeras e nenhuma entrada correspondente em `colliders`. Custo muito baixo; impacto alto na identidade e previsibilidade espacial.

### 3. P1 — Céu com emenda e povoado sem horizonte profundo

**REPROVADO.** `forro.png` tem uma linha vertical aproximadamente em **x=1164**, de y=0 até perto de y=540. Na área de céu y=30–249, a média RGB das faixas x=1150–1159 e x=1175–1184 muda de (107.65,85.87,68.62) para (133.32,102.98,76.27): diferença absoluta média **16.81/255**. A transição entre colunas adjacentes mais forte é em x=1164: 3.25 níveis, contra mediana 0.127 na mesma faixa. Não é sombra de um objeto.

`public/js/map_sky.js:16–20` aplica mapeamento equiretangular ao arquivo escolhido por `public/js/look.js:32`, `public/img/textures/sky_sertao.webp`. A textura tem 1774×887; a diferença RGB média entre primeira e última coluna é **12.10/255**, consistente com bordas não contínuas. A causa provável está no panorama; o mapping já é explicitamente equiretangular.

Em `aerea.png`, o chão termina em lados retos (vértice superior por volta de 772,252 e borda direita até 1451,439), suspenso visualmente contra o fundo. Em `forro.png`, y≈543, uma linha horizontal nua é tudo o que existe além da cerca. `public/js/map_velho_oeste.js:239` cria um plano 150×180; não há relevo externo nesse trecho de construção.

**Correção barata em duas partes:** primeiro substituir/reparar o panorama para continuidade horizontal, sem apenas girar a costura para outro corredor. Depois criar **2–3 faixas externas** de relevo baixo e irregular, com materiais compartilhados, sem colisão nem sombras dinâmicas, escondendo a borda do plano em todas as câmeras do jogador. Sugestão inicial: faixa de terreno de transição, serra próxima baixa e serra distante com contraste reduzido; orçamento inicial de até 3 mil triângulos e até 3 materiais para o conjunto, a medir. Preservar área navegável e alturas do playspace.

**Aceite:** rotação de câmera 360° sem linha vertical; seis vistas de altura de jogador mostram ao menos dois planos distantes; nenhuma borda do chão em vista jogável. A vista aérea deve mostrar transição paisagística em vez de tabuleiro. Custo baixo para céu, médio para relevo; impacto visual muito alto.

### 4. P1 — Cinco casas de taipa são o mesmo esqueleto de madeira

**REPROVADO.** Em `praca.png` há armações abertas dos dois lados da igreja; em `poco.png` aparecem pelo menos três coberturas/armações da mesma família; `leste.png` mostra o mesmo volume próximo. Telhas e troncos estão resolvidos, mas falta a massa de barro que tornaria a construção uma habitação acabada. A repetição de aberturas, cor e telhado ocupa as laterais das rotas.

`public/js/map_velho_oeste.js:393–395` coloca **5** entradas `paupique`; todas usam o mesmo `casa_pau_a_pique`, linha 400. O parâmetro `variante` é usado pelos proxies, mas não enviado a `placeProp` no ramo GLB, linhas 264/408. Trocar `v` na tabela não muda a cor desses GLB.

**Correção barata:** manter os footprints e telhados, fechar **4 das 5** casas com painéis de taipa/reboco e deixar apenas uma estrutura parcialmente exposta como variação intencional. Usar duas caiações claras e uma terra neutra, com uma porta e 1–2 janelas por frente. Variar disposição das aberturas/uma empena, sem gerar cinco modelos totalmente novos. Usar materiais compartilhados; verificar clones antes de alterar material de uma instância.

**Aceite:** pelo menos quatro fachadas laterais leem como paredes à distância da praça; nenhuma sequência de três casas parece cópia idêntica; volume opaco visual concorda com colisor. Custo médio; impacto alto. Fazer junto do item 1.

### 5. P2 — Vegetação parece coleção de cactos isolados, não uma paisagem de caatinga

**REPROVADO.** `leste.png`, x=0–475, é dominado por um único cacto de braços elevados; `poco.png`, x=146–302 e x=1420–1535, repete a silhueta, todos sobre bases/pedestais visíveis. `aerea.png` revela plantas pontuais ao longo do cercado, com terra limpa entre elas. A árvore de `poco.png`, x=825–1327, é inteiramente nua; não há massa vegetal que produza transição entre povoado e horizonte.

O mapa distribui **20** instâncias de mandacaru, **6** macambiras, **4** árvores e **6** xique-xiques nas linhas 483–530. Esses nomes no código não comprovam a leitura botânica; o que o frame entrega são cactos isolados e árvores secas. Não é uma identificação taxonômica do GLB.

**Correção barata:** redistribuir parte dos 20 cactos em **4–6 grupos assimétricos fora das três rotas**, intercalados com arbustos baixos de ramos finos; reduzir a repetição da mesma silhueta e esconder as bases pétreas padronizadas no terreno. Reservar a maior densidade para fora do cercado, como transição ao relevo. Manter chão limpo junto aos acessos e ao corpo dos jogadores. Não preencher o centro de props.

**Aceite:** em `forro`, `poco` e `leste`, o perímetro deve apresentar uma faixa irregular de vegetação seca de alturas distintas, sem esconder silhuetas humanas ou criar colisão nova. Custo médio; impacto alto na identidade.

### 6. P2 — Venda e praça ainda carregam linguagem de fachada western

**REPROVADO.** Em `venda.png`, x=410–1102, y=205–748, a platibanda alta é dominada por tábuas verticais, molduras de madeira e uma frente sem nome nem mercadoria identificável. A combinação parece fachada de faroeste; uma platibanda por si só não é o problema. Na praça, caixas sem detalhe, carroça e fardos são os principais marcos de primeiro plano; a placa “SERTÃO” fica atrás da torre da capela (`praca.png`, x≈704–829, y≈476–509).

Família GLB escolhida em `public/js/map_velho_oeste.js:392/402`; placa de entrada criada nas linhas 252–254; caixotes nas linhas 682–685/696–698. A renderização do material da venda vem do GLB `public/models/props/casa_platibanda.glb`, não da caiação declarada no proxy.

**Correção barata:** tratar a venda como reboco caiado/ocre de baixo ruído, manter madeira apenas na porta/janela, acrescentar uma única inscrição curta de comércio e um pequeno elemento de uso sob a fachada. Reaproveitar a massa dos caixotes como engradados/banca legíveis mantendo suas dimensões de cobertura. Não acrescentar cartazes grandes por toda a praça.

**Aceite:** a venda é identificável em sua própria captura sem depender do nome do arquivo; a igreja continua o marco principal da praça. Custo baixo/médio; impacto médio/alto.

### 7. P2 — Piso saturado e repetitivo compete com os assets; pedras mudam de linguagem

**REPROVADO.** Em `praca.png` e `sul.png`, uma faixa de madeira reta cruza quase toda a tela perto de y=740 e y=820, respectivamente. O chão tem fendas/granulação ampliadas em todos os primeiros planos. `leste.png`, x≈445–733, y≈533–699, traz uma rocha marrom de grandes faces planas ao lado de caminhão/cacto com muito mais detalhe. Essas diferenças fazem o conjunto parecer montado de fontes distintas.

Métrica repetível: na caixa **x=100–1399, y=700–999**, predominantemente piso, a saturação HSV média foi 0.766 (`forro`), 0.752 (`leste`), 0.781 (`poco`), 0.789 (`praca`), 0.791 (`sul`), 0.778 (`venda`). Essa caixa não é máscara semântica perfeita; serve para A/B do mesmo enquadramento, não para aprovar C25 inteiro. Não houve medição de texel density.

Causas: piso/rachaduras em `public/js/map_velho_oeste.js:173/186`; tiras repetidas a cada 8 m na linha 240; pedra feita por `DodecahedronGeometry(...,0)` com `MAT.pedra` nas linhas 534–539. A iluminação quente (`public/js/look.js:35–38`) se soma à cor do piso.

**Correção barata:** retirar as tiras decorativas do chão; baixar aproximadamente 25–35% a saturação do albedo do solo e reduzir `bumpScale` do piso de 0.22 para um experimento entre **0.06 e 0.10**, sem mexer no sol de início. Para as cinco pedras, usar material cinza-terra menos saturado e uma geometria simples compartilhada com mais uma subdivisão, se necessário. Não elevar todo o cenário para o nível de detalhe do caminhão.

**Aceite:** sem linhas artificiais no piso nas câmeras `praca`/`sul`; saturação média da mesma caixa ao menos 15% menor sem perder tarde quente; menor contraste das fendas; pedras compatíveis com a paleta do chão. Custo baixo; impacto médio e global.

### 8. P2 — Palhoça de forró parece estrutura incompleta

**REPROVADO.** `forro.png`, x≈405–1099, y≈284–717: cobertura de tábuas estreita e irregular, estrado aberto, dois quadros/caixas na frente e bandeirolas quase pretas. Um cacto se projeta sob o telhado, confundindo os volumes. O nome “forró” não é recuperável com segurança só pelo frame.

O GLB de `sertao_palhoca_forro` substitui todo o proxy em `public/js/map_velho_oeste.js:584–605`. As bandeiras coloridas, bancos e caixa de som daquele callback só são construídos quando não há GLB. Portanto alterar o array de cores do proxy não conserta a captura real.

**Correção barata:** completar uma cobertura de palha com espessura legível, simplificar o estrado para uma superfície contínua, tornar 5–7 bandeirolas visíveis e deslocar o cacto sobreposto. Reposicionar bancos/caixa de som usando medidas reais do GLB, sem aumentar área de colisão.

**Aceite:** cobertura lê como palha; palco/bancos distinguíveis; bandeiras são acento pequeno e legível; nenhum cacto atravessa visualmente a estrutura. Custo médio; impacto localizado.

## O que está aprovado — alcance estrito

- **APROVADO: horário quente e baixo.** Luz âmbar e sombras longas aparecem em todas as capturas; `aerea.png` mostra a direção de sombras. Isso não aprova a saturação global.
- **APROVADO: capela reconhecível.** Cruz, campanário e paredes claras se identificam em `praca`, `venda` e `poco`. Não foi provada visibilidade a partir de todas as entradas.
- **APROVADO: poço reconhecível.** `poco.png` mostra borda circular de alvenaria, estrutura superior e mecanismo lateral. Aceite é da leitura visual, não de contato/colisão.
- **APROVADO: existência de famílias de casa diferentes.** `sul.png` diferencia pedra e fachada caiada bicolor. As duas casas de pedra repetem a mesma malha; variedade geral ainda reprova.
- Não há pessoa real, marca comercial indevida, gore ou conteúdo vetado identificável nas sete imagens.

## Não comprovado: três rotas, spawn, CTF, fauna e performance

**Não aprovar nem reprovar por falta de prova de runtime.** A vista aérea sugere circulação central e laterais, mas não demonstra três rotas independentes, tempo de chegada, ângulos de spawn, captura de bandeira ou colisão durante movimento. Os problemas estáticos dos itens 1/2 precisam ser resolvidos e depois medidos no caminho real.

Fauna: há objetos pequenos na cena, mas as capturas não permitem confirmar espécie, escala consistente ou comportamento. As declarações `lagarto`, `calangos`, `rats`, `pigeons`, `chickens` e `parrots` no código não bastam. Pedir ao responsável pela captura um pequeno vídeo de 10–15 s em um ponto de ocorrência de cada família carregada; não adicionar bichos apenas para satisfazer contagem.

O arquivo de evidência `artifacts/sertao-astra/before/capture.json` registra, em Apple M4 Pro, **62–369 calls** e **37.686–256.555 triângulos** nas seis vistas do jogador; aérea: **503 calls**, **320.181 triângulos**. Há **117 geometrias**, **86 texturas** e heap amostrado de aproximadamente **36.5–38.0 MB decimais**. São contadores de frames, não FPS, estabilidade após 30 s, execução de partida ou limite seguro em notebook. `errors: []` não prova gameplay.

Orçamento de continuidade sugerido: alterações de horizonte/vegetação devem ficar dentro de **+5% das calls e triângulos** nos mesmos seis ângulos antes de justificar qualquer aumento. Preferir economizar nas plantas rolantes e casas repetidas; não abrir uma frente de pós-processamento para resolver estes defeitos. Verificar frame time mediano/p95 em partida com personagens e estabilidade de heap/texturas antes de declarar performance aprovada.

## Próxima rodada concreta

1. Corrigir yaw/footprints GLB, fechar paredes coerentes com colisão e remover plantas rolantes/colisores.
2. Resolver costura do céu; adicionar paisagem externa simples, fora das rotas.
3. Ajustar venda, variação de taipa e paleta/piso; completar o forró se os três primeiros passos já estiverem aceitos.
4. Repetir exatamente as sete câmeras em 3:2; acrescentar 16:9 e vídeo de circulação/combate. Comparar custo render, sobreposição de colisores, três rotas, spawns e CTF em runtime. Revisor independente decide o que passou; estes PNG não são baseline de FPS.

Entregável desta crítica: somente este relatório. Runtime e assets intactos; nenhum commit criado.
