# Claude Opus 5 — integração final das 26 armas

Só inicie após checkpoints revisáveis dos prompts 01–10. Crie worktree
`vm-catalogo-integracao` e branch `claude/vm-catalogo-integracao` sobre `main` atual. Extraia
seletivamente os commits finais; não faça merge cego dos PRs históricos #464/#468 nem carregue
o histórico intermediário #509/#513 sem revisar o diff.

Integre exatamente as 26 armas listadas no índice. Um único agente é dono de arma+mãos+ações+
ADS+HUD. Resolva configs, aliases, cache-bust, preload, peso de GLB e caminhos. Rode reimport de
todos os GLBs, suíte completa de viewmodels, mutantes transversais, build e jogo local. Gere
matriz por arma e contact sheets 3:2/16:9 de hip, ADS, tiro e recargas.

Falha em uma arma reprova apenas essa linha, mas impede declarar catálogo final. Prepare PR novo
e pequeno o bastante para revisão, com relação explícita aos PRs #464, #468, #509, #513 e #534.
Não feche PR antigo nem faça merge/release sem ordem. A aprovação visual final pertence ao dono.

