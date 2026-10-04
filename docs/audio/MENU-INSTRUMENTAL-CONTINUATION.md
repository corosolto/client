# Continuação: intro instrumental e controle da música

## Objetivo e pronto quando

Pedido de 04/10/2026: retirar da intro/menu todas as músicas com voz, manter apenas as instrumentais e oferecer no topo da home um botão para desligar/religar a música, com escolha persistente. Pronto quando a seleção e o pacote privado contiverem só as faixas instrumentais, o botão funcionar após boot, retorno ao menu e reload, e o jogo real for conferido visualmente e com áudio em 3:2.

## Estado da lane

- Worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/menu-instrumental-toggle`; branch `codex/menu-instrumental-toggle`, criada de `origin/main` em `45fcf958f` (03/10/2026). Não tocar no checkout principal sujo nem na lane `primary`.
- Commit de implementação: `18ff1e261` (`feat(audio): manter instrumentais e alternar música do menu`). Este registro é o checkpoint documental seguinte; confira `git log -2` na retomada.
- Fonte de áudio local: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/private-assets/audio/menu-main-alpha218/`, documentada em `SOURCE.md`. Cinco MP3 foram copiados para `public/audio/menu-music/` somente para teste local; essa pasta é ignorada pelo Git.
- A seleção anterior da produção era `m03,m05,m10,m11,m14,m16,m17,m22`. O modelo local faster-whisper-small, aplicado aos oito arquivos completos, reconheceu frases/voz em `m03,m05,m10`. Em `m11,m14,m16,m17,m22` não encontrou fala confiável (altas probabilidades de ausência de fala ou nenhum segmento); isso ainda precisa de escuta humana para excluir vocalização sem palavras.
- Nova seleção nominal em `public/js/menu-music-selection.js`: `m11,m14,m16,m17,m22`. Runtime e instalador local consomem essa lista. O teste `menu-music-review-check` foi alterado primeiro e reprovou a base por seleção antiga e ausência do botão (MMR0, MMR10); depois passou. `audio-fab-local-check` passou com fixture de cinco faixas. `npm run syntax` passou com Node 23.
- O botão `hub-music-toggle` fica no cabeçalho da home, informa LIGADA/DESLIGADA, usa `aria-pressed` e salva `settings.menuMusic` em `awpbr_settings`. `startMenuMusic`, gesto da splash, autoplay assíncrono e `canplay` respeitam a opção desligada. Restaurar configurações liga a música novamente apenas se o retorno for ao menu. Há tradução PT/EN.
- `tools/gen-audio-manifest.mjs` passou a rejeitar um pacote privado antigo com faixas extras no espelho ou contagem de músicas divergente. Ainda falta medir essa recusa com fixture e conferir a cadeia real de build: `vercel.json` busca o pacote e roda `assert:assets`, `check:vercel`, `build`, sem `audio:check` explícito.
- A skill `vercel:agent-browser` foi consultada, mas o CLI não estava instalado. O servidor Astro local chegou a subir na porta 8137; a automação do Chrome recusou abrir `http://127.0.0.1:8137/?debug=1` por política de segurança com motivo "user declined permission". Não contornar a recusa por Playwright, CDP, outro navegador ou rota indireta. O servidor PID 51321 foi encerrado.

## Pendências para fechar

1. Após a mudança de permissões do usuário, retomar pelo status/diff deste worktree e confirmar o novo escopo de acesso. Rodar `git diff --check`, `node tools/eval/menu-music-review-check.mjs`, `node tools/eval/audio-fab-local-check.mjs` e o build com `PATH=/opt/homebrew/bin:$PATH`.
2. Exercitar a recusa de pacote privado antigo e garantir que o build de produção falhe se ainda trouxer as oito músicas. Gerar/atualizar o pacote privado com as cinco faixas antes de qualquer deploy. Não colocar MP3, tokens, URLs assinadas ou dados de acesso no Git.
3. Conferir no jogo real em 3:2: botão visível no topo; OFF pausa imediatamente e sobrevive a reload; ON retoma; voltar de partida preserva OFF; nenhuma das cinco faixas tem voz. A verificação visual e escuta estão pendentes pela recusa do navegador nesta sessão.
4. Atualizar este registro com resultados e SHAs, revisar diff e então preparar integração/publicação conforme autorização do usuário. Não afirmar deploy ou aprovação auditiva antes da evidência.
