# Welcome: contrato e entrega revisável

Copy/layout em `WELCOME.html`, assunto “Salve. Bora pra próxima partida?” e preheader “Escolha seu personagem e teste a próxima partida.” Texto simples equivalente: você confirmou novidades; teste personagem/mapa; envie Feedback com passos; gerencie sua preferência. Nenhum fluxo, formulário ou backend novo.

Fonte: lane social `docs/social/OPERACAO.md`, entrada por email/newsletter; checkpoints informados no ledger social, a verificar no rollout. Consentimento opcional separado e desmarcado; email confirmado; retirada/cancelamento de pendência não podem ser revertidos por callback antigo. Social continua dona única da lista e do envio.

`{{manage_preferences_url}}` precisa ser substituído pela rota/link real validado pela frente social antes de qualquer uso em transporte. Não inventar link assinado nem copiar credencial para template ou Git. O texto assume destinatário confirmado e consentimento ainda ativo no momento do envio. Usuário que só entrou como convidado, fez login sem opt-in ou retirou preferência não recebe welcome de marketing.

Prévia local não confirma render em clientes de email. Antes de envio autorizado, social valida remetente/domínio, SMTP produção, estado de consentimento atual, opt-out, transporte real, versão plain text, rodapé aplicável e render mobile/email. Sem cadastro/importação em Resend, automação, destinatário, tracking pixel ou envio nesta lane.

Monetização lida em `launch-media/2026-10-09-eleicao/02-project/RETENCAO-MONETIZACAO-15-DIAS.md`: apoiador com emblema/cosmético e ads são propostas sem entrega verificada. Welcome e peças não prometem esses benefícios nem preço/compra. Copy de campanha de apoiador só será preparada quando existir benefício entregue e aprovado com fonte.
