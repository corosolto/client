<!-- spec:mapa -->
# Piscina da Treta — reautoria controlada

Piloto do padrão de reautoria de mapas, preparado em 08/09/2026 sobre
`origin/main` (`3880380165c170c0e694c28088876e396d5a1e29`). Esta fase é somente de
baseline, contrato espacial e plano de validação. Não altera runtime, assets nem
arquivos compartilhados.

## Intenção

Preservar a piscina central, a leitura imediata de salão aquático e o combate rápido.
Corrigir os problemas observados pelo dono que a densidade genérica de props não mede:
arena aberta, ausência de rota lateral protegida, pouca decisão estratégica e ausência
de ambiência própria.

O programa de qualidade consultado foi
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/mapas-quality-program/docs/reports/MAPAS-PROGRAMA-QUALIDADE-2026-09-08.md`.
Ele exige três famílias de posição, comparação 5×5/8×8, ambiência de piscina coberta e
quatro aceites independentes: combate, leitura visual, vida local e entrega.

## Invariantes preservados

- Piscina centrada em `(0, 0)`, lâmina dominante e bacia atual: `hx=7,5`, `hz=9,5`,
  margem de 2,5 m e profundidade de 1,5 m.
- Quatro spawns por time em `x={-9,-3,3,9}`, `z=-21/+21` e CTF nos marcos
  `PARTIDA (0,-13)`, `ARMÁRIOS (12,0)` e `TRAMPOLIM (0,14)`.
- Rota central continua sendo a opção mais curta. O corredor novo é escolha de flanco,
  não desvio obrigatório nem substituto do salão.
- Simetria competitiva por rotação de 180°, silhueta clara, materialidade de azulejo
  branco/faixa azul, claraboia, armários e trampolim.
- Nenhuma arma de chão removida nesta fase de desenho. Qualquer conflito físico futuro
  deve ser resolvido e medido, não escondido.

## Blockout contratado

As coordenadas abaixo são hipóteses autorais do primeiro blockout. Elas viram contrato
somente após a régua vermelha medir o mundo real e o teste humano confirmar escala.

### B1 — corredor de serviço/armários

- Anexar ao lado oeste uma faixa curta de serviço em `x=-21..-17`, `z=-14..14`,
  mantendo intacto o salão principal atual (`x=-17..17`, `z=-25..25`).
- Eixo caminhável em `x≈-19`; largura livre alvo de 3,2 m. O valor comporta dois corpos
  de raio 0,38 m e ainda deixa margem para esquiva; não pode cair abaixo dos 1,2 m já
  derivados do corpo em MAP2B.
- Duas bocas distintas na parede oeste, centradas em `z=-11/+11`, com 2,4 m livres.
  A boca sul nasce no deque E e a norte desemboca no deque B. Nenhuma terceira saída
  direta para o meio no primeiro blockout.
- Dois vãos de observação não atravessáveis, centrados em `z=-4/+4`, largura 1,4 m e
  peitoril de 1,05 m, oferecem resposta do deque sem transformar o corredor em tubo de
  tiro axial.
- Dois volumes baixos alternados em `z=-3,5/+3,5` quebram a visada longitudinal, mas
  preservam pelo menos 1,4 m de passagem. Portas, armários técnicos e piso distinto
  devem tornar a rota legível também sem minimapa.
- A distância lateral do eixo novo ao passeio oeste atual é maior que 6 m, a separação
  usada por CTF2. A implementação só é aceita se o grafo provar uma terceira família
  espacial, sem cortar as duas existentes.

### B2 — cobertura fragmentada no deque

- Reautorizar as fileiras contínuas como seis ilhas de cobertura, três por extremidade,
  espelhadas por rotação: centros iniciais em `x/z=(-7/-13)`, `(0/-14,5)`, `(7/-13)`
  e `(7/13)`, `(0/14,5)`, `(-7/13)`.
- Cada ilha tem largura contínua máxima de 2,8 m, altura funcional entre 1,05 e 1,35 m
  para peek agachado/em pé e intervalo livre de 2,4–3,3 m até a próxima. Uma peça alta
  de armário pode ancorar cada trio, mas não formar uma parede.
- Cobertura válida para esta régua precisa nascer no deque (`minY>=-0,15`) e cruzar a
  altura de peito. Mureta submersa não conta como proteção do deque.
- Permanecem livres uma linha rápida por lado e a borda visual da piscina. O blockout
  não pode emparedar spawn, ocultar a água nem criar obstáculo atravessável visualmente.

### B3 — posição elevada curta com contrajogo

- Plataforma de salva-vidas/técnica no lado leste, centro inicial `x=12,8; z=5,5`, piso
  entre 1,25 e 1,50 m e área útil máxima de 10 m². O trampolim atual continua sendo
  marco visual, não plataforma jogável substituta.
- Dois acessos curtos, por norte e sul, evitam um poleiro de entrada única. Guarda-corpo
  e colisor devem concordar com a malha e com `groundHeightAt`.
- Resposta 1: janela norte do corredor de serviço enxerga a fenda de tiro da plataforma.
  Resposta 2: ilha sul-leste do deque oferece aproximação coberta e ângulo não colinear.
  A ilha norte-leste fornece uma terceira resposta desejável.
- A plataforma não pode ter linha direta para mais da metade de nenhum conjunto de
  spawns nem enxergar simultaneamente as duas faixas de nascimento. O ganho é visão
  estratégica do deque/piscina, não domínio gratuito do round.

## Réguas vermelhas

O futuro `tools/eval/piscina-rework-check.mjs` deve ser escrito e executado vermelho
antes de `public/js/map_piscina.js` ser editado. Ele mede mundo novo a cada caso; não
aceita metadado declaratório como substituto de geometria, colisão, navegação ou áudio.

- **PIS1 — corredor real:** duas bocas alcançáveis, passagem ponta a ponta e terceira
  família de rota separada por 6 m. Baseline esperado: vermelho (mínimo atual CTF2=2).
- **PIS2 — cobertura funcional:** seis ilhas acima do deque, gaps caminháveis, nenhuma
  tela contínua acima de 2,8 m e redução das linhas longas sem emparedar. Baseline:
  vermelho; MAP5 atual conta muretas submersas e não responde ao defeito humano.
- **PIS3 — altura com resposta:** piso elevado alcançável, dois acessos, duas respostas
  não colineares e veto de visão dominante sobre spawns. Baseline: vermelho; a prancha
  atual em `y=1,3` tem `collide:false` e não é posição jogável.
- **PIS4 — preservação competitiva:** oito spawns e três objetivos mantidos, exposição
  não pior que 17,8% E / 17,6% B, folga mínima 1,2 m, área contígua mínima 40 m²,
  triângulo CTF de pelo menos 12 m e nenhuma rota existente perdida.
- **PIS5 — rapidez e escala:** rota central mais curta que o flanco; custo e equilíbrio
  rebaseados após a fundação. Partidas 5×5 e 8×8 precisam chegar ao elenco real, sem
  engarrafamento persistente. Em 12 s, zero frame acima de 100 ms e orçamento med não
  maior que 860 calls/870 mil triângulos, salvo orçamento posterior explicitamente
  aprovado e documentado.
- **PIS6 — ambiência própria:** `world.sound` observável com água de piscina, hum interno,
  bioma indoor e splashes esparsos; ausência de URL/arquivo vira falha, não silêncio
  considerado verde. Reverberação que exija engine compartilhada fica em escopo separado.
- **PIS7 — identidade humana:** quatro capturas reais 3:2 med e low precisam preservar
  piscina dominante e permitir nomear corredor, ilhas e posto elevado sem minimapa.
  Esta cláusula exige aceite humano do dono e nunca fica verde por Node/headless.

## Mutantes previstos

Cada mutante deve alterar o mundo real em memória, registrar `applied:true`, reprovar
somente a cláusula alvo e reconstruir o mapa antes do próximo caso. Enquanto o baseline
normal já estiver vermelho, o resultado do mutante é **inconclusivo**, nunca “mordido”.

- `sem-corredor` remove o trecho central e deve matar PIS1.
- `boca-unica` fecha uma das duas entradas e deve matar PIS1.
- `muro-de-armarios` une as três ilhas de um lado e deve matar PIS2.
- `cobertura-submersa` desloca as ilhas para `y=-1,5` e deve matar PIS2.
- `posto-sem-colisao` mantém a malha, remove piso/colisor navegável e deve matar PIS3.
- `posto-sem-contrajogo` fecha as janelas/ângulos de resposta e deve matar PIS3.
- `spawn-exposto` remove o anteparo de uma faixa e deve matar PIS4.
- `rota-central-lenta` aumenta somente o custo central e deve matar PIS5.
- `low-completo` força custo med em low e deve matar PIS5.
- `sem-ambiencia` limpa o som do mapa e deve matar PIS6.

## Ordem de implementação depois do sinal da fundação

1. Atualizar este baseline contra a fundação estabilizada e registrar o novo SHA.
2. Criar a régua PIS1–PIS6 e guardar a execução vermelha; PIS7 já nasce pendente humana.
3. Implementar B1, depois navegação/colisão; rodar normal e mutantes de PIS1.
4. Implementar B2 e PIS2/PIS4; recusar qualquer ganho obtido por emparedamento.
5. Implementar B3 e PIS3; validar subida, descida, LoS, decal e impacto.
6. Ligar somente áudio já licenciado/registrado no mapa. Mudança compartilhada de reverb
   exige autorização e lane própria.
7. Rodar 5×5/8×8 med/low em janela GPU exclusiva, suíte global, build, capturas 3:2 e
   crítica adversarial. O dono decide PIS7 jogando; técnico verde não é aceite visual.

## Bloqueio atual

Nenhum runtime será editado antes de um sinal explícito sobre a fundação de mapas
#540–#551. Em 08/09/2026, a pilha de mapas #540, #541, #542, #545, #547, #548,
#550 e #551 estava aberta; #540 estava `DIRTY`, as demais `UNSTABLE`, com falhas de
`build` e, em #550/#551, também `portao`. #543, #544, #546 e #549 também estavam
abertas, mas são lanes não pertencentes à pilha sequencial de mapas.
