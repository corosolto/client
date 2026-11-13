# Origem efetiva da luva TP

`npm run eval:tp-glove-origin` mede o handle capturado do template que forneceu
o corpo real. O catálogo pode oferecer corpo base e skin para o mesmo personagem;
uma skin que chega depois não muda a origem de um clone existente. Game conserva
o handle enquanto conserva esse corpo. Preview e boot resolvem a origem depois
dos preloads; o boot tolera falha do cosmético opcional e usa o fallback base.

O handle é imutável, com prontidão consultada dinamicamente. Cache, pedidos em
voo e negativos são separados por tipo, personagem, caminho e digest completo
do cosmético ou revisão do corpo base. Somente uma variante de procedência e
família compatíveis pode ser escolhida. Ausência, SHA divergente ou duplicação
recusam o pacote inteiro e permanecem terminais. O legado base pode fazer preload
antes do corpo; a API pública retorna null enquanto não há template carregado.

| Caso | Comportamento medido |
|---|---|
| O1 | Handle imutável, prontidão dinâmica e legado base antes do corpo |
| O2–O3 | Corpos base e Drip coexistem nas duas ordens de carga |
| O4 | Clone fallback mantém a origem; novo clone pode usar o Drip |
| O5 | A→B→A compartilha o pedido correto e conserva a seleção atual |
| O6–O8 | Ausência, SHA divergente e variante duplicada não carregam luva errada |

Game e GLTFLoader são reais em processos CPU frescos. O candidato Drip é gerado
pela fábrica apenas em memória; texturas viram um texel branco. Geometria,
esqueleto e bind são comparados por identidade. Não há GLB ou manifesto novo
distribuído por esta frente. A identidade de catálogo não atesta o hash dos bytes
recebidos pela rede.

Cada mutante executa primeiro o nominal completo e depois a matriz mutada.
As alterações e os conjuntos exatos esperados estão em
`tools/eval/fixtures/tp-glove-origin-mutations.mjs`. O pai exige recibo único com
nonce, fonte, fábrica, aplicação, IDs e booleanos válidos, além de coerência entre
status e exit. Erro de CLI sai2; infraestrutura sai3 sem crédito; falha semântica
sai1; nominal completo verde ou mutação detectada sai0. A cópia mutada é privada
e removida ao terminar. `--json=/caminho/absoluto` salva o recibo integral.

O alias integra check:fast, check:deploy e o job equipamento-tp. A prova de
transientes e máscara continua em [`TP-IDENTITY.md`](TP-IDENTITY.md); a recusa de
procedência está em [`TP-COSMETIC-SOURCE.md`](TP-COSMETIC-SOURCE.md). Nenhum deles
aprova contato, dedos, materiais, animação, enquadramento 3:2, multiplayer ou
mobile físico. Essas verificações continuam no jogo real. Evidência e próximos
passos ficam em `docs/reports/TP-GLOVE-ORIGIN-RUNTIME-CONTINUATION-20261101.md`.
