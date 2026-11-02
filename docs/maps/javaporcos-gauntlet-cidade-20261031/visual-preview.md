# Checagem visual do preview — 31/10/2026

Preview servido: `a8892e1e2564e41a0556944db0db302ccbb3bc70`, deployment `dpl_Cynq1YHuas6LWP2JK2NEiKbqE67i`, SIM_HASH `e2fa9691a6ba19c5`.
Ego Lite, TaskSpace30 exclusivo, 1320×880 (3:2). Proteção Vercel acessada pelo conector existente, sem mudar configuração. Espaço finalizado ao concluir; nenhum segredo preservado.
Capturas persistentes em `artifacts/javaporcos-visual-preview-20261031/` (ignoradas no Git).

## Resultado observado

- Modal de anúncio (`01-modal.png`) e card do lobby (`02-lobby.png`): arte correta, textos/ações legíveis. Seletor estreito trunca o nome do modo, embora o card deixe o modo claro.
- Partida e placar (`05-partida.png`, `06-placar.png`): containers legíveis, avatar javaporco e contagem explícita de abates de defensores. HUD de domínio ocupa área grande no alto: oportunidade de compactação.
- Torre (`07-torre-oeste.png` a `09-torre-sul.png`): subida sem salto pela física real, pés finais 6.380000007m. Três direções capturadas, mas pilares interferem na mira oeste/leste a partir da posição de chegada; falta recapturar dos centros dos vãos e observar tiro real. Não aprovada integralmente como posto de tiro em três lados.
- Quatro casas: entrada e escada percorridas pelo método real `_moveEntity`, pés finais 3m em todas. Capturas `10-janela-interior.png` e `11-interior.png`: janela aberta e interior visíveis; uma janela voltada à parede vizinha oferece campo de tiro limitado.
- Acesso lateral (`15-acesso-lateral.png`): degraus com madeira e laterais de concreto visíveis de perto. A repetição da madeira é evidente; não houve inspeção próxima de todos os quatro acessos.
- Pistola visível em primeira pessoa. AK selecionada por pickup real do mapa através de `_grabPickup`: quadro imediato durante equipar ficou sem arma; após 2.5s com simulação ativa, `17-ak-estabilizada.png` mostra arma e mãos, metal e madeira, sem aparência preta chapada. Não é aprovação das outras armas.
- Javaporco vivo reconhecível perto e cadáveres laterais observados em `13-javaporco.png`/`15-acesso-lateral.png`. Frames estáticos não aprovam fluidez, ataque, revirar lixo ou ausência de loop de morte.
- Introdução `16-introducao.png`: arte, texto e botões cabem. Foi reaberta pelo módulo publicado para inspeção isolada; esta captura não comprova o momento automático de entrada.
- `03-loading.png` capturou a transição verde antes da tela e foi rejeitada como prova visual do loading. A árvore semântica mostrou o cartão Javaporcos, mas falta captura válida dessa tela.

## Método e limites

Modal/lobby/placar foram acionados pela interface. Rotas da torre/casas usam física real com posicionamento inicial de QA, não uma partida integral por teclado. Pausas e posicionamentos foram usados para compor imagens. O rótulo de viewmodel no canto é de `?debug=1`.
Crítica independente pela skill `.claude/skills/asset-review/SKILL.md`, agente `critica_visual_preview`, confirmou arte/lobby/cidade/placar/pistola e reprovou a comprovação completa de torre, janela útil e acessos por enquadramento/evidência insuficiente. Não houve modificação de runtime nesta rodada.

Pendências: loading válido e entrada automática, vídeo ou observação contínua de locomoção/ataque/lixo/morte, outras armas, posições de tiro entre pilares, campos de janela, demais acessos, revisão humana e multiplayer real. Nenhuma aprovação de servidor, FPS, merge ou produção.
