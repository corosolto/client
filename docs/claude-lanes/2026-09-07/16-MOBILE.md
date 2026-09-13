# GLM 5.3 — recuperar e finalizar mobile/WebView

Use a worktree da branch `feat/mobile-app-ui`, PR #496. Confirme o caminho pelo `git worktree
list` antes de editar; se não existir, crie uma worktree isolada sem tocar no checkout primário.
O PR está conflitante e teve falhas de build/preview.

Resolva conflitos contra `main` preservando controles touch e UI responsiva. Valide pointer
lock/touch coexistindo, mira, tiro, ADS, troca/recarga, menus, safe areas, orientação, teclado,
WebView e desktop. Não esconda controles essenciais em telas pequenas e não degrade desktop.
Crie testes de eventos reais e mutantes, build, preview local e matriz de dispositivos/tamanhos.

Faça commits pequenos, push e atualize #496. Teste em dispositivo/WebView real quando possível;
se indisponível, marque como pendência de lançamento em vez de inferir aprovação.

