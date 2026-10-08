# Identidade do personagem no multiplayer — 04/10/2026

## Objetivo e aceite

Resolver a descoberta descrita em [#677](https://github.com/corosolto/client/issues/677): mostrar ao jogador o personagem, facção e retrato que o servidor atribuiu, na entrada e durante a partida; acompanhar mudança de slot e estado de espectador. Aceite completo requer observação de duas pessoas em dispositivos reais, rotação de mapa e conferência do corpo visto pelo outro jogador.

## Estado e propriedade

- Branch: `codex/mp-character-identity-20261004`, checkout isolado `client/worktrees/mp-character-identity-20261004`, base `03c080632` (`main`, alpha.50).
- Esta lane altera apenas a apresentação da identidade e a régua de navegador. Não modifica protocolo, simulação nem seleção de personagem no servidor. Hash de simulação esperado: `414e5ed74af13502`.
- A lane principal de qualidade MP é `codex/mp-quality-rootcause-20261004`, PR #755. Seu checkout recebeu edições não atribuídas a esta lane e não foi modificado aqui. O backend candidato é PR #56, com imagem já construída e ainda sem deploy.
- Checkpoint: `2dfc9fc5c`, publicado como [PR #774 em rascunho](https://github.com/corosolto/client/pull/774). O pre-push `check:deploy` passou em 105 s. O PR #755 teve `smoke`, `build` e `portao` aprovados; o CI de #774 ainda estava na fila na última consulta.

## Implementado e validado localmente

- `main.js` cruza `yourEnt` e `yourTeam` com `roster` autoritativo e um ID conhecido de `CHARACTERS`. Mostra cartão temporário na entrada e cartão persistente na pausa. Quando falta a entrada, informa que o personagem não foi identificado; espectador recebe rótulo próprio. A identidade é limpa ao sair ou desconectar.
- `index.astro` e `style.css` contêm os cartões e ajuste da pausa para viewport baixa.
- A régua `tools/eval/tiro-mp-browser.mjs --identidade` cobre entrada, pausa, imagem, espectador, retorno ao time e viewport horizontal. Ela também abre a interface atual do hub, que substituiu o seletor antigo.
- Navegador local + backend local no mapa Escadão: 1280×800, 16/16; 1536×1024 (3:2), 17/17; 844×390, 18/18. Sem exceção na página. Logs: `/tmp/mp-identity-browser-r7-20261004.log`, `/tmp/mp-identity-3x2-20261004.log`, `/tmp/mp-identity-mobile-r2-20261004.log`. Capturas: `/tmp/mp-identity-3x2-20261004-identidade-{entrada,pausa}.png`, `/tmp/mp-identity-mobile-r2-20261004-identidade-pausa.png`. As capturas foram inspecionadas visualmente; isto não constitui aprovação humana.
- O backend local usou cópia isolada em `/tmp/mp-identity-backend-20261004`, sincronizada ao cliente alpha.50. O teste usou um navegador automatizado e bots, sem segunda pessoa.
- `npm run docs:check`, `npm run arch:check`, `npm run build`, verificação de sintaxe dos arquivos JS e `git diff --check` passaram. `node scripts/sim-hash.mjs --check` confirmou `414e5ed74af13502`. Todos os comandos de Node que exigem runtime moderno foram executados com Node 23.6.0; o `node` padrão do shell é 16.13.0 e rejeita Astro e `node:module.register`.

## Pendências e próximo passo

1. Conferir o CI de #774 e a compatibilidade desta lane com #755 em checkout isolado; se combinadas para release, reconstruir a imagem backend com o SHA exato do cliente integrado.
2. Validar rotação e troca de slot em navegador, depois jogar com duas pessoas em dispositivos reais (incluindo mobile), comparando o corpo visto pelo outro jogador.
3. Medir a qualidade MP do release coordenado por sete dias comparáveis. Nenhum desses testes locais comprova a meta de 90% de sessões boas/ótimas.
