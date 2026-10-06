# PR #773 — continuação do elenco político

## Objetivo e aceite

No worktree `worktrees/politicos`, entregar o PR [#773](https://github.com/corosolto/client/pull/773): substituir avatares 2D por retratos do modelo 3D, reduzir proporções de balão nos políticos, corrigir o cabelo de Dama, remover Agitador do Carro de Som (Renan Santos), e permitir orbitar a câmera durante movimento e tiro para ver o corpo de lado e de frente. Aceite exige captura do jogo real em 1200×800 (3:2), teste de controle/tiro e revisão visual humana dos modelos, retratos e clipes. Régua numérica verde, sozinha, não aprova a arte.

## Estado recuperável

- Branch: `feat/elenco-politicos`; base de trabalho `b2375303e0a88cecaffbbc92e01b9351d0190567` (PR draft aberto, conflito com `main` visto em 2026-10-06).
- Checkpoints: `a708f2557` (órbita, retículo e teste de navegador), `2749a86fa` (remoção de Agitador e dados derivados) e `1574fed2f` (avatares 3D). Este relatório e as capturas de evidência serão o próximo checkpoint; `client/` principal não foi editado.
- O pedido original e o PR permanecem o objetivo inteiro. A etapa atual é revisar e validar as alterações antes de checkpoint e atualização do PR.

## Feito e verificado localmente

- A câmera de terceira pessoa/ombro recebeu órbita com `Alt+mouse`; a rotação do jogador e sua mira continuam separadas. O enquadramento passa a mirar o corpo inteiro quando a órbita se afasta da mira. `tools/eval/politicos-orbit-browser.mjs` cobre o jogo Astro real com Dama em 1200×800: lado/frente, movimento, tiro, retículo oculto quando a câmera olha para o rosto, e retorno à primeira pessoa. O teste primeiro reprovou a cruz sobre o rosto; após corrigir, passou com tiro alinhado à mira do jogador (`dot > 0,999`) e câmera frontal apontando em outra direção. Capturas atuais: `tools/eval/asset-evidence/pr773/dama-orbit-{side,front}.png` (SHA-256 lado `4de5c1bf00e5e25e9c558f6dc2b887727a17164e2438474f5115c31fe874608b`, frente `33b6f5ab5d8e3639eccd37587ab1675b4f5563f57f066f644d20112c1613a687`). O aviso de CPU no navegador foi fechado pelo próprio botão `OK` antes das capturas; o asset privado da faca foi montado por symlink local ignorado no Git.
- `Agitador` saiu do elenco, da arma inicial, do conjunto GLB, do manifesto de animações e dos assets rastreados. A sonda completa foi regenerada com 61 personagens, e `foot-offsets.json` não tem mais entrada órfã. `git grep` não encontra referência restante fora deste relatório.
- Os oito avatares foram renderizados dos GLB originais por `tools/render-politicos-avatars.mjs`; contato `tools/eval/asset-evidence/pr773/avatars-3d.jpg` (SHA-256 `b4d499cf5679d6a1dc448bbe80882e0886f92c94816f7abb437109f56bb389f9`). Os vídeos e artes de resultado existentes continuam coerentes com esses GLB. Os retratos agora são 3D como a seleção do jogo, mas a qualidade do modelo aparece neles e depende do próximo passo.
- `npm run syntax`, `node tools/gen-anim-manifest.mjs --check`, `node tools/gen-foot-offsets.mjs --check`, o teste de navegador via eventos de mouse do DOM e `git diff --check` passaram. Log local do último teste: `/private/tmp/pr773-orbit-dispatch.log`. `char-thumbnail-contract-check.mjs` reprova seis personagens preexistentes fora deste lote (camera-roxa, programador-virado, motoca-cachorro-loko, doidinho-bairro, designer-ux, lenda-lanhouse); nenhuma falha cita os oito políticos.
- Mint MCP está configurado localmente, mas desabilitado nesta sessão; nenhuma geração Mint foi feita. Blender headless caiu neste ambiente. Essas restrições não transformam o ajuste geométrico atual em aprovação visual.

## Rejeitado / pendente

- Uma tentativa inicial de simplificar materiais foi descartada por remover a textura de roughness (regressão histórica registrada em `tools/char-plastico.mjs`).
- A tentativa seguinte de comprimir cabeças e troncos preservou materiais/UV/rig, mas a revisão adversarial independente **reprovou** as proporções: Barbudo e Ministro ainda parecem largos (C1 torso/altura 0,355 e 0,314 na tentativa), e o cabelo da Dama continuou como tufo alto. A sonda C3 também mostrou piora no pé durante animações, incluindo Dama/walk acima do limiar compensável. Os oito GLB experimentais foram restaurados ao commit base e o script experimental saiu do PR; cópia temporária em `/private/tmp/pr773-rejected-sculpt.mjs`, sem valor de entrega. **Não relançar essa deformação como solução.** Os GLB originais têm C1 cabeça/altura Barbudo 0,285, Dama 0,295, Ministro 0,299; torso/altura Barbudo 0,348, Ministro 0,310. Fonte: `/private/tmp/pr773-char-probe-restored.log` e `tools/eval/char_probe.json`.
- Dama e os outros políticos ainda exigem substituição/revisão real do GLB. O cabelo não foi corrigido. Mint MCP está desabilitado; Blender headless caiu neste ambiente. Antes de aceitar qualquer novo modelo, comparar frente/lado e movimento no jogo, preservar a identidade, rig, materiais PBR, armas e pés no chão, regenerar os oito avatares e os vídeos/artes derivados, e pedir crítica adversarial independente. A revisão atual aprovou a correspondência dos avatares aos GLB, mas reprovou a silhueta e o cabelo.
- O PR ainda mostra conflito com `main`. Conferir novamente o estado remoto depois do checkpoint. Push/merge ainda não ocorreram.

## Próximo passo

Para completar o objetivo visual, habilitar acesso ao Mint 3D ou outro pipeline 3D autorizado e gerar modelos substitutos rigados; começar por Dama, Barbudo e Ministro, medir C1/C3 e capturar o jogo antes de avançar aos cinco restantes. Depois atualizar os derivados, resolver o conflito do PR e publicar os commits aprovados sem incorporar mudanças de outros checkouts.
