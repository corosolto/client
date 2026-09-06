# Menu do Sertão alinhado à main

Pedido do dono em 06/09/2026: “precisava o menu estar alinhado com a main”.
Referência consultada: `origin/main` em
`695557906bcf6a8a3a80e8baf4c434d17d492944`, arquivos
`src/pages/index.astro`, `public/style.css` e os handlers correspondentes de
`public/js/main.js`. Baseline desta worktree:
`018806e2d11a1eb10b118da0d5afa5ce35869375`.

## Diagnóstico e decisão

A captura do usuário continha `{FACTIONS.map(...)}`, atributos sem resolver e
brasões quebrados. O servidor `tools/eval/serve.mjs` faz substituições limitadas
no fonte Astro e declara que expressões de escopo não são compiladas. HTTP 200
nessa rota não prova que o menu real funciona. A revisão humana deve usar Astro.

Havia também diferença de produto: a branch mantinha o chrome de transmissão,
hero de facção e cinco composições cinematográficas que já não existem na main.
Servir Astro corrige o texto cru, mas sozinho não restaura o menu escolhido.

O alinhamento aplica coluna de navegação, links superiores reais, Single Player
direto, cartões de facção, ficha/personagem/faixa de elenco e configurações da
main. Preserva o catálogo completo, prontidão de elenco, as dez facções em grade
5×2, posição vazia do próprio lado ao escolher adversário e legenda de voz.
A seleção de mapa continua lendo o registro e as opções desta branch. O texto
antigo sobre saloon, madeira e tumbleweeds foi substituído pela descrição do
Sertão efetivamente implementado.

O multiplayer da main depende de uma integração extensa de rede, APIs e Game.
Esta mudança mantém o fluxo local funcional e não acrescenta uma ação sem
implementação. Portanto, é alinhamento de composição e navegação local, não
paridade funcional integral do cliente multiplayer.

## Régua substituída por decisão de produto

`eval:cinematic-ui` mantém sua entrada no portão, mas passa a verificar o contrato
MENU1–MENU7. O contrato antigo CINE1–CINE8 exigia explicitamente o chrome e os
shells agora rejeitados. Não houve redução de teto de imagem ou de performance;
mudou a premissa de produto por pedido do dono. As invariantes de catálogo e
estabilidade do adversário permanecem, junto de `eval:faction-registry`.

A nova régua foi escrita antes da edição do menu. No baseline, somente MENU6
(inventário de telas) passou: MENU1, MENU2, MENU3, MENU4, MENU5 e MENU7 ficaram
vermelhas. Depois da edição, os sete contratos passaram. As sete mutações
isoladas (`cinema`, `elenco`, `personagem`, `configuracoes`, `preview`, `rota`,
`foco`) fazem falhar exclusivamente sua cláusula. Mutação que não aplica ou
atinge uma cláusula adicional reprova o runner.

O contrato UIR26 de `eval:redesign` também exigia o antigo submenu. A alteração
restrita à cláusula e ao seu mutante passa a exigir Single Player direto, a
transição real para `map-screen` e o toggle de modo. Os demais contratos UIR
permaneceram. Resultado: 43/43; `modo-volta-setup` reprova somente UIR26.
A bateria de oito gates próximos passou integralmente (5,8 s), incluindo
matchoptions, charvoice, screenquery, character-voice, char-thumbnail,
faction-registry e cinematic-ui. `node --check public/js/main.js` e
`git diff --check` também passaram.

São contratos de estrutura e ligação do código, não medição de beleza ou prova
end-to-end. A aprovação depende de capturas reais do Astro em 1536×1024 e de
percorrer mapa → lado → personagem → adversário → partida.

## Artefatos e continuação

- `artifacts/sertao-astra/menu-main/before-contract.json`: baseline vermelho.
- `artifacts/sertao-astra/menu-main/after-contract.json`: resultado após edição.
- `artifacts/sertao-astra/menu-main/mutants.log`: prova de isolamento das mutações.
- `artifacts/sertao-astra/menu-main/related-gates.log`: primeira bateria, com UIR26 antigo vermelho.
- `artifacts/sertao-astra/menu-main/related-gates-after.log`: oito gates próximos verdes.
- `artifacts/sertao-astra/menu-main/redesign-mutant.log`: UIR26 isolado vermelho.

O preview recebe vídeo real pelo módulo `map_preview.js`, ligado aos cards e ao
cartaz, com encerramento em toda troca de tela. A procedência, o fallback, a
carga somente na interação e a reprodução são verificados pela frente de preview.
Capturas e revisão visual ainda devem ser anexadas pelo agente responsável pelo
único navegador da sessão antes de considerar este marco validado.

## Verificação final da revisão

Astro em localhost:8149 percorreu boot → mapas → facção → personagem → adversário
→ partida live com sete bots e nenhum erro JavaScript. Capturas reais 1536×1024
em `artifacts/sertao-astra/menu-main/*-final.png`; `flow.json` registra o percurso.
O personagem Caminhoneiro carregou com corpo inteiro e rosto visível. O crítico
independente aceitou menu, personagem e thumbnail para revisão humana.

A crítica encontrou chamada de entrada em facção EM PRODUÇÃO. MENU8 foi vermelho
antes de limitar o CTA a cards habilitados, verde depois; `--mutantes` agora prova
oito cláusulas isoladas. Hover real em card indisponível confirmou opacity0.
O Chrome headless não travou o ponteiro. Repetição em Chrome com janela confirmou
pointer lock e yaw acumulado de10,479rad (~600°) por eventos reais de mouse,
sem erros JavaScript. Evidência em menu-main/headed/flow.json e game-final.png.

O alinhamento usa a estrutura visual da main69555790, preservando dez facções e
single player desta branch. Não traz o backend/fluxo multiplayer da main.
O servidor estático8145 é apenas harness: renderiza fonte Astro crua no menu.
Para revisão local completa, usar `npm run dev -- --host 127.0.0.1 --port 8149`
na worktree exclusiva e abrir `http://localhost:8149/?map=velho_oeste&lang=pt`.
