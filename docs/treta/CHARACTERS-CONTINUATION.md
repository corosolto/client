# Continuidade — skin comprada é personagem no lobby (23/10/2026)

Pedido do dono: skin comprada tem que ser personagem selecionável no modal TODOS OS PERSONAGENS, e anônimo com nick precisa de um convite dizendo que logando ganha 1.000 T$. Branch `feat/lobby-skins-tretas` (worktree lobby-tretas-20261023), base origin/main 0a505cbf2.

Modal: `openHubRoster` (public/js/main.js) lê `tretaSkinsDoArmario()` da loja e cria uma célula por skin possuída logo após o personagem base, com selo SKIN e o pôster do manifesto recortado na cabeça. Clicar na skin chama `equiparTretaSkin`; clicar no personagem base com skin equipada chama `desequiparTretaSkin` (POST /api/treta action=unequip, backend 079) e só troca de personagem se o servidor confirmar. Sem conta ou sem skin aprovada o armário vem vazio e o modal é o de sempre. Régua: `npm run eval:roster-skins` (RS1-RS6 + 5 mutantes).

Convite: `signupPitch(campaign)` em public/js/login-prompt.js promete exatamente `treta_campaign.signup_bonus` do servidor; sem o campo, não promete nada. Dispara para anônimo com `awpbr_nick` salvo, sem esperar partida, respeitando a mesma trava de visita/recusa do convite pós-partida. Réguas LP16/LP17 e LB9.

Limite de rollout: `unequip` e `signup_bonus` dependem da migration 079 e do deploy do backend. Antes disso, o convite não promete T$ e tirar a skin mostra erro sem trocar o personagem.

# Continuidade — corte da loja só com personagens

Pedido de 13/10/2026: separar acessórios numa PR própria e revisar os encaixes aos poucos; publicar primeiro a loja somente com personagens. A imagem de Saci com óculos fora da altura dos olhos foi reprovada pelo dono. Nenhum encaixe foi aprovado nesta etapa.

Base: client #819, 80afbcb61522d351239e0c6261b02a65adf12c22. Branch própria codex/treta-approved-skins-20261013; preservada a lane ativa treta-skin-store. O candidato remove aba/painel/propostas de acessórios e exibe somente skins com approved=true no manifesto. Quests e armário continuam. O catálogo real tem 12 skins aprovadas; lula-na-regua fica fora da vitrine.

Validação: Chrome real via CUA, servidor próprio127.0.0.1:8139, 12cards/0abas acessórios/0card não aprovado. Captura privada em csbrasil/private-assets/growth-readiness/ranking-20261012/treta-split-20261013/approved-skins-store-desktop.png. A API não está configurada nesta lane: carteira retornou indisponível; esta captura não valida saldo, compra, quests, OAuth ou publicação. Harness normal de loja adaptado para teclado quests→skins e ausência de acessórios; não executado via Playwright nesta sessão. Parecer independente e gates em andamento.

Definição de pronto: corte revisado e validado, PR própria empilhada sobre #819; itens em PR separada com default OFF, sem aprovar encaixes por teste técnico. Produção exige o par social/economia, gate de desativação backend, migrações, compra/equipamento reais e release coordenado. Nenhum merge/deploy neste checkpoint.

Objetivo completo e sequência das 23PRs: progress/worktrees/progress-growth-readiness-20261012/docs/growth/CONTINUATION.md e PR-MERGE-ORDER-20261013.md. Quatro emails de teste continuam preparados para o destinatário aprovado; único remetente fale@corosolto.com.br, cadastro raiz pendente de confirmação exigida pelo conector para substituir o domínio auth.

Próximo: terminar revisão/gates do corte, checkpoint e publicar PR draft sem tocar a branch ativa do dono; empilhar itens sobre este corte. Backend #73 já contém o contrato 056 de itens e precisa de extração/revisão antes de declarar o split completo do par. CI verde anterior de #819 não valida este candidato.

Marco validado: Node24 syntax/modgraph/treta-skins/rewards/classic 5/5 PASS; build exit0 (log privado approved-skins-build.log). Chrome confirmou teclado quests→skins. Crítico independente items-off-review.md/adendos aceita corte de12skins e ausência de acessórios; nenhum fit/compra/release aprovado. Checkpoint270c4c49d. Próximo: hook obrigatório e PR draft, depois itens empilhados.
