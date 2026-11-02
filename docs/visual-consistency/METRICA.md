# Como avaliar a consistência no jogo

Direção de Ruben em 31/10/2026: o jogo precisa parecer uma obra com acabamento
intencional. Referências de experiência: Complexo Favela, CS 1.6, Valorant,
Fortnite e ev.io. A BAR-CONSISTENCIA existente continua sendo contrato; este
documento acrescenta observação por dimensão, cobertura e evidência da rodada.

## Escala e regra de decisão

Cada dimensão recebe uma classificação independente por crítico que não construiu
a correção: **0**, defeito que prejudica jogar; **1**, defeito evidente em movimento
normal; **2**, coerente em jogo, com defeito localizado identificado; **3**, coerente
também nos casos difíceis verificados. **UNKNOWN** significa falta de evidência,
nunca zero defeitos. São categorias de triagem, não limiares físicos medidos.

Publicar o vetor completo, o pior caso e a cobertura. Não usar média para aceitar
um mapa ou personagem. Um requisito explícito violado bloqueia a entrega, qualquer
que seja a nota nas demais dimensões. Uma captura bonita não encerra a avaliação.

## Mapas

| Dimensão | O que observar | Medição e evidência |
|---|---|---|
| M1. Composição e limpeza | Rotas, coberturas e inimigos reconhecíveis; decoração intencional | Capturas dos spawns, centro e rotas; inventário de decalques com arte, suporte e posição; contagem de arte repetida |
| M2. Acabamento de superfícies | Escala de tijolo/reboco coerente, encontros de paredes, quinas, portas e telhados resolvidos | Pares de superfícies na mesma distância; UV/materiais reais; textura em close e em distância de combate; sem premiar ruído fino |
| M3. Identidade e construção | Favela reconhecível pela arquitetura, comércio e uso do lugar, sem coleção de caixas intercambiáveis | Vista de rua e silhueta; elementos estruturais com função; comparar referência e jogo por enquadramento, sem copiar assets |
| M4. Leitura e custo | Personagem/arma legíveis contra o cenário; física e desempenho preservados | Contraste personagem/fundo e rim existente; colisão/tiro nas malhas visíveis; renderer.info e frame time com cenário/dispositivo declarados |

Contratos novos pedidos pelo dono: **zero arte duplicada no mesmo mapa**, inclusive
mesma imagem recortada ou escalada; Ferro Velho com grafites somente na casa de
respawn B; Piscina com grafites e posters somente em paredes brancas. Inventariar
também reutilização entre mapas, para curadoria. Ausência total de grafite não
comprova curadoria: conferir assets carregados e preservar arte intencional válida.

Não inventar posição da casa B ou classificar parede por aparência no nome do
material. Confirmar geometria, spawn e pixel no runtime. Não alterar collider para
resolver defeito de decoração. Limites técnicos vigentes vêm dos gates existentes.

## Interface visual

| Dimensão | O que observar | Medição e evidência |
|---|---|---|
| U1. Hierarquia | Uma ação principal reconhecível, moeda/estado/objetivo próximos do contexto | Capturas menu, seleção, loading, compra, HUD, pausa e resultado; caixas DOM e oclusões |
| U2. Legibilidade | Tipografia e ícones legíveis no tamanho usado; preço e time inequívocos | 1320×880 e viewport móvel declarado; texto cortado, sobreposição, overflow e contraste |
| U3. Coerência | Componentes repetidos mantêm espaçamento, cor semântica e estilo | Comparação dos mesmos componentes entre telas; sem reprojetar fluxos nesta etapa |
| U4. Estabilidade | Sem flicker, troca brusca de personagem, placeholder ou canvas sumindo | Sequência temporal de transições e carregamento; eventos/erros correlacionados com frames |

## Personagens, roupas e armas

| Dimensão | O que observar | Medição e evidência |
|---|---|---|
| P1. Identidade e superfície | Silhueta/roupa/rosto fiéis; volume contínuo, textura e normal coerentes | Referência aprovada do personagem, quatro vistas em luz igual, depois duas condições reais de mapa; não alisar silhueta por subdivisão indiscriminada |
| P2. Contato e postura | Dedos envolvem cabo; mãos sustentam arma; cabeça/torso/pés coerentes | Gauntlet #1179, distâncias reais de contato, limites de IK e captura de recarga/idle; conferir pele e proporções sem impor rig humano a mascote |
| P3. Movimento e peso | Andar, parar, virar, pular, recarregar, atirar e morrer sem rigidez ou interpenetração | Trecho contínuo em velocidade normal; passos sincronizados com deslocamento; bob/sway ligados à velocidade real, ADS estável e sem deriva acumulada |
| P4. Continuidade no jogo | Skin e arma escolhidas são as vistas no lobby, 1P, 3P, multiplayer e resultado | Rastrear ID/ownership/equipamento até renderer; contato e material em mapas distintos; sem dar posse nem mudar economia para corrigir apresentação |

Contrato de tiro: direção autoritativa e impacto correspondem ao centro da mira;
efeito visual nasce na boca do cano; projétil visual converge ao impacto. Medir
câmeras mundo/VM separadamente e distâncias perto/longe. Não deslocar hitbox ou
vetor de dano para esconder cano/mira errados. Arma+mão+animação+ADS+HUD têm um
único escritor e são verificados como sistema, sequencialmente.

## Registro reproduzível por rodada

Cada linha de resultado precisa de: SHA e mudanças locais, mapa/personagem/arma,
aspecto/qualidade/dispositivo, estado do jogo e câmera, assets que carregaram,
baseline e depois, valor observado, captura/trecho temporal, custo e veredito
independente. Falta de asset/erro de instrumento produz UNKNOWN/FAIL.

Régua automatizada entra depois de provar RED na baseline ou em mutante aplicável.
Nunca alterar teto existente para produzir verde. Métricas de referência terão
arquivo, frame/pixel e script antes de virarem novos limiares. Móvel emulado prova
layout; desempenho mobile depende de dispositivo físico pareado.

## Fontes desta rodada

- PDF integral e páginas renderizadas na auditoria `2026-10-31-visual-consistency`.
- Vídeo local `/Users/ruben/Downloads/O-COMPLEXO-FAVELA-SnapYT.App.mp4`, 360×640,
  40,426667 s medidos por ffprobe. Contact sheet em `complexo-local-sheet.jpg`.
  Observação: reboco/tijolo, esquadrias, beirais e decoração localizada; esse
  arquivo não comprova hardware, FPS nem versão do jogo de referência.
- Página oficial: https://play.google.com/store/apps/details?id=com.BrunoSanta.OComplexo
- Gameplay público encontrado: https://www.youtube.com/watch?v=bx8DlVC0uFY
- Stack indicada por Ruben: https://github.com/corosolto/client/pull/1179
