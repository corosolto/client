# UI TRETA: continuidade da lane

## Objetivo e DoD

Executar `plans/UI-LOJA-TRETA.md`: renovar menu, loja, detalhe, armário, carteira e recibos, com respiro e tipografia inspirados na referência Fortnite e identidade CORO SOLTO. Entregar implementação local, capturas desktop 3:2 e mobile 390, estados de carregamento/vazio/erro/saldo insuficiente, contratos de economia preservados, proposta de packs e acessórios sem cobrança, crítica independente e checkpoint recuperável. O objetivo amplo mantém integração/combate das skins, vídeos, campanha real e publicação como etapas ainda pendentes.

## Ownership

Branch `codex/treta-ui-clean-20261011`, base `bea564e966a1ab6d0eadeca96bed02af9d5f4563`. Lane `worktrees/treta-ui-clean-20261011`. Criada via Git porque create_worktree retorna Not a git repository no cwd agregado. Primary e lane de exportação Mint preservados. Sem backend, merge, deploy, migration remota ou cobrança real.

## Decisões

- T$ 800 por skin, saldo/inventário/compra/equipamento autoritativos e gates de manifesto existentes.
- Pack 1.000/R$10 definido pelo dono; 3.000/R$27 e 5.000/R$40 são propostas, 10.000/R$75 futuro. Nenhum botão inicia pagamento.
- Acessórios são propostas com compatibilidade por personagem. Bonés/correntes fundidos nas malhas não removíveis; nenhuma geração Mint repetida.
- Capturas com fixtures explicitamente marcadas. Não comprovam crédito, compra ou partida real. Assets privados não entram no Git nem no catálogo público.
- Música desligada nas sessões de validação; nenhuma preferência do usuário reativada.

## Estado

Ficha, ledger e AGENTS lidos. Base limpa verificada. Dependências locais instaladas com Node 23, sem segredos copiados. Próximo: baseline real no Astro e régua comportamental; implementar, capturar e criticar.

## Marco: baseline e régua vermelha

Capturas em `/tmp/treta-ui-baseline`: desktop menu/loja e mobile menu. Mobile 390 ficou coberto pelo aviso de girar a tela, impedindo acesso à loja em retrato. Desktop mostrava fundo azul e metadados pequenos. `treta-ui-browser.mjs` reprovou a base: `Packs need a separate view`, 0 versus 1. Logs `/tmp/treta-ui-{baseline,red}.log`. Capturas da base mostram fixtures; ainda faltava esperar as imagens lazy antes do screenshot. Implementação nova em andamento; próximo: rodar fluxo e revisar imagens finais.

## Marco: fluxo funcional, enquadramento rejeitado

`/tmp/treta-ui-final/report.json`: 26 capturas desktop 1536×1024/mobile 390×844, zero pageerrors, compra simulada 800, armário, três packs desabilitados, acessórios, carteira, vazio, retry/carregamento, saldo insuficiente e prêmio. Música OFF verificada. GPU via ANGLE Metal, navegador desktop com viewport/touch emulado, não aparelho real. Compra: desktop 211.016 triângulos/12 draw calls (4 moedas), mobile 52.754/3 (1 moeda).

Inspeção própria rejeitou o enquadramento do GLB rigado: close de pés em vez do corpo inteiro. Dialog também herdava margin zero. Corrigir pose/matrizes de skin antes de medir Box3 e restaurar margin auto. Não considerar a frente pronta pelo teste funcional. Próximo: recapturar e crítico independente.

## Marco: pose e composição corrigidas

Rodada 2 em `/tmp/treta-ui-r2`: fluxo aprovado novamente com 26 capturas e zero pageerrors. GLB Idle privado mostra corpo inteiro desktop/mobile, caixa projetada dentro do viewport em todos os estágios. Moedas preservam os clipes originais. `npm run build`, `npm run syntax`, `npm run eval:modgraph` (inclui mutante), `treta-rewards-check` e suas 3 mutações, `treta-coins-check` passaram. O teste passou a exigir o enquadramento projetado e uma única moeda no mobile.

Cards com poster ausente agora dizem PERSONAGEM BASE / PRÉVIA 3D NO DETALHE. O recibo usa snapshot do modelo carregado antes da compra para animar o item correto sem segundo renderer WebGL. Próximo: rodada final com novos casos de contrato/teclado e crítica independente.

## Defeitos reproduzidos na crítica independente

“Recuperação da carteira fica escondida” e “O fallback do detalhe pode anunciar o personagem base como modelo final” (ui_critic). Régua nova `/tmp/treta-ui-preview-red.log` reprovou antes do ajuste: preview falhou por HTTP503, mas texto de indisponibilidade não apareceu. Retry movido perto do saldo; falha de consulta agora tem label próprio; preview anuncia carregamento/falha, oferece retry e bloqueia compra quando só há imagem base. Versão de detalhe descarta carga antiga após close/reabertura. Próximo: validar fluxo e mutações, recapturar, reavaliar crítico. Checkpoint anterior `1901898ed`.

## Marco: contratos e crítica aprovados com fixtures

Rodada `/tmp/treta-ui-delivery-final/report.json` passou 34 capturas, zero pageerrors, teclado nas tabs, compra duplicada (1 pedido/800 T$), equip, visitante e manifesto fechado. Espera explícita por conclusão das cargas evita confundir renderer cancelado ao fechar dialog com falha de enquadramento; aguardadas prévias de armário, carteira e prêmio. Label de fixture visível inclusive no top layer dos dialogs.

Crítico independente reavaliou R4: sem regressão material de layout, retry/preview e snapshot do recibo corrigidos. Residual de texto do detalhe durante erro foi ajustado. Falha/transição da carteira não reinicia fila/dedup de recompensas; logout continua descartando o owner anterior. Cabeçalho usa estados curtos para preservar espaço mobile.

`treta-ui-mutations.mjs` detectou 3/3: preview sem gate, framing com câmera próxima e disponibilidade ignorando manifesto. Logs `/tmp/treta-ui-mutations/{preview,framing,manifest}.log`. Build/syntax/modgraph/shaderbudget e moedas/recompensas passaram; rodada final após ajuste de cabeçalho em andamento. Artefatos duráveis serão `csbrasil/private-assets/treta-store/ui-clean-20261011/`, fora do Git. Próximo: inspeção final de capturas, copiar evidência, checkpoint DCO e abrir galeria para revisão do dono.

## Entrega local concluída — 11/10/2026

Galeria e evidências duráveis: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/private-assets/treta-store/ui-clean-20261011/` (`index.html`, `report.json`, 34 PNG finais, 2 baselines de menu, logs, crítica e SHA256). Servidor de revisão em `http://127.0.0.1:4348/`; dev Astro em 4347. Final `/tmp/treta-ui-release-review.log`: PASS, 34 capturas, 0 pageerrors. Inspeção final confirma corpo inteiro, erro/retry sem sobreposição do logo e snapshot do item no recibo. Build/syntax/modgraph após último ajuste passaram.

Carga observada mobile emulado: skin 215–397ms/4.812 triângulos/1 draw; confirmação 53ms/52.754 triângulos/3 draws/1 moeda. Desktop confirmação 48ms/211.016/12/4 moedas. Não são medição em celular físico ou aprovação de gameplay. Referência base dos cards explicitada; catálogo público permanece fechado, sem GLBs privados publicados. Comparação anterior só usa menu: baseline de loja foi descartado por captura antes das imagens carregarem.

Implementação local e revisão automatizada/independente concluídas nesta autorização. Checkpoint anterior `1901898ed`; o commit que contém este marco registra as correções e réguas finais (consulte `git log -1` nesta branch). Próximo passo concreto: dono revisar a galeria desktop/mobile e decidir ajustes visuais. Integração/retarget/combate das skins e exportações lote2 seguem na lane de assets original. Celular físico, campanha, provedor/checkout e publicação exigem etapas próprias; sem merge, deploy, backend ou migration nesta lane.
