# Lajes — crítica independente do baseline

06/09/2026. Branch conferida: `codex/lajes-visual`, HEAD `bb37c048`.
Crítico separado do builder, sem leitura do ledger ou do relatório de implementação.
Lidos `asset-review`, `gauntlet-fps`, os critérios de mapa da
`tools/eval/BAR-CONSISTENCIA.md` e `LAJES-VISUAL-REFERENCIAS.md`.
Inspecionados **os nove PNGs reais**, com `view_image`, de
`artifacts/lajes-visual/baseline/`, 1536×1024, quality med, FOV 70.
Poses reproduzíveis em `baseline/cameras.json`. Coordenadas abaixo são caixas
aproximadas de localização visual, origem no canto superior esquerdo; não são
máscaras segmentadas nem percentuais medidos de oclusão.

**Veredito geral: REPROVADO para o pedido de comunidade habitada convincente.**
Nota editorial da composição atual: **4/10**. A praça aberta existe e o nível
superior enxerga o térreo, mas a imagem dominante é um conjunto de paredes cegas
de arena alternadas com fatias estreitas de casas. Cabos e roupas comunicam
ocupação, porém ainda não corrigem a arquitetura repetida. A nota é julgamento
visual, não benchmark de performance ou aprovação da régua completa.

## Gaps em ordem de impacto/custo

### 1. REPROVADO — relevos de fachada voltados para apenas duas direções

**Pixel:** em `praca-da-laje-oeste`, x270–760/y340–680, pilares/painéis inteiros
de tijolo enquadram uma casa estreita; x760–1050/y370–600 tem grandes faces de
reboco sem abertura aparente. Em `praca-da-laje-leste`, x350–780/y340–680 repete
a composição. `beco-varal`, x210–565/y65–745, é um painel de tijolo sem piso,
janela ou porta legíveis. Nem todo painel vem da mesma função: o último inclui
poço de escada, tratado no gap 2.

**Causa conferida:** `public/js/map_lajes_authored.js:189` (`wallWithRelief`)
aplica porta/janela/medidor exclusivamente no lado positivo de X ou Z:
`:201–203`, `px/pz` usam `+face`. O perímetro é percorrido com normais positivas
e negativas em `:677–681`, mas `:734` chama o helper sem orientação. Faces
negativas recebem relevo na traseira. O problema é determinístico; não é falta
de textura nova.

**Correção barata:** passar a normal exterior da face ao helper e aplicar o
mesmo sinal a batente, porta, soleira, janela e peitoril. Para muros vistos dos
dois lados, declarar explicitamente quais faces são visíveis. Preservar os
colliders. Depois comparar as quatro câmeras da praça: aberturas devem aparecer
no lado da rua, em escala de pavimento, sem prometer passagem onde não existe.
Só após isso decidir se alguma face ainda precisa de composição própria.

### 2. REPROVADO — poços de escada parecem lâminas gigantes independentes

**Pixel:** `beco-varal`, painel x210–565/y65–745 e escada x570–770/y585–735;
`praca-do-chao-sul`, painel x980–1060/y190–595 à esquerda do lance x1060–1260;
`praca-da-laje-leste`, painel x360–580/y340–680. O pé da escada aparece, mas a
fachada não explica os pavimentos nem o destino: uma parede muito alta vira
o principal marco em todas as áreas. O corrimão/apoio não se distingue desse
bloco de contenção.

**Causa conferida:** `map_lajes_authored.js:912` cria os dois painéis de
`.18 × 5.9 m`, e `:914` a divisão central de 5.7 m; `:916–918` coloca a casa
de contexto 4.2 m para fora da lateral. O pano do poço não recebe o relevo de
fachada do gap 1.

**Correção localizada:** dar aos panos existentes encontros de laje/patamar e
reboco por pavimento, mais uma indicação de acesso no pé da escada. Fazer isso
como superfície rasa sobre o volume atual primeiro. Não reduzir altura/abrir
janelas de tiro sem medir novamente cima×baixo. Não espalhar o mesmo remendo
por todos os poços. Revalidar as mesmas três câmeras e uma aproximação pelo
patamar superior; a captura `descida-norte` atual tem jogadores ocultando esse
destino e não basta para aprová-lo.

### 3. REPROVADO — ramais elétricos acabam no céu

**Pixel:** `praca-da-laje-oeste`, curva x505–680/y130–230 sem ancoragem nas duas
extremidades; `praca-da-laje-leste`, curva x1150–1495/y135–230; `spawn-sul`,
segmentos x120–520/y370–420 e x1060–1535/y345–405. São defeitos de ligação
facilmente reconhecíveis, repetidos ao longo do mapa. O feixe principal também
domina a perspectiva central dos dois spawns, reforçando a leitura de série.

**Causa conferida:** `map_lajes_authored.js:1223–1224` deriva início por `z-2`,
sem selecionar um poste real de `:1210`, e termina em y8.4 na coordenada da
fachada, sem suporte criado nesse ponto. Não coincide necessariamente com
poste, casa ou haste.

**Correção barata:** conectar cada ramal a um poste existente e a um suporte
visível da casa atendida; onde não há casa atendida, remover aquele ramal.
Preservar a rede principal e avaliar se sua repetição ainda compete com a rota
depois de corrigir arquitetura. Não acrescentar fios aleatórios para compensar.

### 4. REPROVADO — roupa atravessa a frente do spawn sul

**Pixel:** `spawn-sul`, roupas x0–575/y645–955, corda diagonal até x945/y610.
Três grandes panos ocupam a região onde o jogador precisa ler saída e piso.
O lado norte não tem o mesmo obstáculo visual. A diferença pode afetar leitura
de saída mesmo se não houver colisão; screenshot sozinho não prova bala.

**Causa conferida:** `map_lajes_authored.js:1166–1167` inclui um varal em
`[-1.5,32]`, rotação `Math.PI/2`, altura alvo 1.4 m, justamente diante da pose
`spawn-sul=[0,5.2,32.3]`.

**Correção barata:** mover esse conjunto para a borda doméstica lateral da
cobertura, com acesso e ancoragem, fora da boca de saída e pouso. Conferir a
silhueta inteira do GLB, não só seu ponto central. A/B do spawn sul e checagem
de navegação/tiro na boca da ponte são obrigatórias antes do aceite.

### 5. REPROVADO — faixas brancas curvas sem função arquitetônica legível

**Pixel:** `descida-norte`, faixa x0–835/y745–1024 e outra x460–860/y375–425;
`laje-oeste`, faixa x945–1060/y640–1024; `spawn-norte`, x1165–1425/y550–645.
Parecem fitas largas/planos curvos sobrepostos à construção; não se lê apoio,
canaleta ou uma pintura acompanhando a superfície. Competem com o contorno
de bordas/pousos porque têm valor muito mais claro que a laje.

**Origem não confirmada no código.** Não atribuo isso a PVC ou às setas sem
evidência. **Correção mais barata:** identificar o objeto pelo raycast/UUID no
runtime da câmera, capturar o mesmo frame com apenas esse objeto oculto e
decidir remoção ou correção de encaixe. Não fazer uma mudança global de
exposição para esconder a faixa.

### 6. REPROVADO — mobília da praça ainda é bloco de protótipo

**Pixel:** `praca-do-chao-norte`, x510–625/y560–612 e x950–1000/y530–590;
`praca-da-laje-leste`, x1180–1310/y640–700. Os cubos azuis têm forma de
obstáculo/caixa e não comunicam mesa, assento ou caixa d'água de modo inequívoco.
A quadra e as árvores são os únicos sinais claros de praça; faltam relações
entre acesso doméstico, fachada e pequeno espaço de uso. O vazio no meio da
quadra **não é falha** e deve continuar livre.

**Causa conferida:** `map_lajes_authored.js:995–999` constrói a mesa como cubo
de `.74 m` e quatro cubos de `.44 m`. `:1012` representa a caixa d'água como
um cubo azul de 1.25×1.28×1.25 m.

**Correção localizada:** melhorar a silhueta apenas desses objetos existentes
(tampo/apoio/assento; tampa e corpo do reservatório), preservando volume útil
de cobertura e faixa livre. Nenhuma população extra de props é necessária.
Dar à área de convivência uma relação com uma fachada específica depois do
gap 1. Não pintar mais acentos para substituir forma.

## O que a imagem permite aceitar e o que não permite

- **APROVADO, presença da praça térrea:** traves, desenho da quadra, bancos e
  árvores aparecem em ambas as vistas de chão e de cima. O centro está aberto.
- **APROVADO, presença visual do conflito vertical:** ambas as vistas da laje
  mostram chão e fachadas opostas. Isso não aprova balanço, alcance ou exposição.
- **REPROVADO, diversidade arquitetônica percebida:** tijolo/reboco alternados
  em muros altos dominam as casas estreitas; trocar cores sem corrigir orientação
  e composição não resolve.
- **REPROVADO, clareza de acessos completa:** há pés de escada visíveis, porém
  não há prova de destino, pouso e retorno claros por todas as aproximações.
- **APROVADO apenas como presença de identidade:** varais, reservatórios,
  autoconstrução e pelada são reconhecíveis. Não equivalem a aprovação da
  representação da comunidade. A vida doméstica está concentrada em props e
  ainda não é explicada pela arquitetura.
- **Não aferidos:** C18/C19 de contraste de personagens, C21 de bala/colisão,
  C22/C24 em todas as posições e C25 por dump/histograma. Nenhum foi promovido
  a PASS por screenshot. `descida-norte` contém personagens em primeiro plano;
  repetir a pose sem essa oclusão para julgar acesso, mantendo também captura
  com combate para avaliar distração. Performance, animação e geometria real
  sob movimento não foram executadas nesta subtarefa.

Árvores ocultam trechos de fachada em `praca-da-laje-leste` (x795–940/y400–535)
e `praca-da-laje-oeste` (x1070–1250/y400–555). Isso é área observada de risco,
não prova de inimigo oculto: exige alvo nas passagens correspondentes. Não
recomendo remoção automática. Cão no centro chama atenção e cruza linha de
tiro em frames de chão; sua colisão/oclusão não foi inferida do pixel.

As referências foram lidas no documento fornecido; suas fotografias originais
não foram inspecionadas nesta crítica. Não alego correspondência fotográfica,
escala extraída de fotos ou fidelidade 1:1. As correções acima têm custo
qualitativo (baixo/médio), não estimativas de horas. Não foi inventado teto
novo de geometria, luz ou densidade. O próximo aceite exige A/B nas mesmas
câmeras e validação dos contratos de circulação pelo executor principal.
