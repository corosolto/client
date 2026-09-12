<!-- spec:mapa -->
# Lajes — Santos Dumont no 14-bis

Pedido original de 06/09/2026: mais pipas e Santos Dumont voando sobre Lajes.
Interpretação comunicada ao usuário: 14-bis com Santos Dumont como piloto.

Papel: ambiência aérea local de Lajes, sem colisão, dano ou alteração de rotas.
A escala das casas e becos V6 permanece independente do avião.

Visual: células biplanas em tecido creme, treliças e montantes em madeira/bambu,
canard em caixa na frente, hélice propulsora atrás, rodas raiadas, cesta de vime
com piloto em pé, terno escuro, colarinho claro, bigode e chapéu de aba curta.
Envergadura de referência 12 m, comprimento 10 m; reconstrução estilizada,
sem alegação de réplica 1:1 ou retrato fotorrealista.

Referências e observação visual: `docs/maps/LAJES-V7-SANTOS.md`.
O modelo e seu código são autorados nesta tarefa. Não reutiliza malhas, texturas,
marcas ou fotografias de terceiros. Santos Dumont é figura histórica falecida
em 1932, expressamente pedida pelo usuário. Sem pessoas contemporâneas ou gore.

Aceite: canard dianteiro e piloto visíveis, movimento orbital e hélice, pausa
congela ambos, dispose remove cena e libera recursos, `lajessky=0` desativa.
Régua: `tools/eval/lajes-santos-check.mjs` com mutantes aplicados à cena real.
Capturas offline: geometria efetiva exportada por `--export` e renderizada por
`tools/render-lajes-santos.py`. Captura runtime e crítica independente são
responsabilidade da integração V7 e não são substituídas pelo render Blender.

O validador histórico `tools/spec.mjs` não existe na main atual; este documento
mantém o marcador e os campos da ficha, sem inventar execução desse portão.
