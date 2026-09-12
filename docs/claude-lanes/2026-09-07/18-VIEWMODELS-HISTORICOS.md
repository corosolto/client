# GLM 5.3 — sanear PRs históricos de viewmodel

Audite somente leitura primeiro os PRs #464 (`feat/fps-paid-viewmodels-aaa`), #468
(`vm-cs16-gabarito`) e #534 (`codex/vm-m4-reload-evidence`). #464 usa base antiga e tem diff
grande; #468 é conflitante e enorme; #534 é evidência da M4. Nenhum deve ser mergeado inteiro.

Construa uma matriz de arquivos/commits ainda úteis, já substituídos e perigosos. Compare cada
item com os checkpoints finais dos prompts 01–10. Extraia seletivamente apenas ferramentas,
contratos ou assets com proveniência e testes que ainda não existam na integração final.
Verifique licenças/dependências privadas, DCO, cache-bust e gerados.

Proponha destino de cada PR: atualizar pequeno, substituir por novo PR ou fechar como
supersedido. Não feche nem comente externamente sem ordem do dono. Entregue relatório com hashes
e comandos; qualquer cherry-pick ocorre em worktree nova, nunca no histórico original.

