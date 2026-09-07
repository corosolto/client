# Integração final sequencial dos viewmodels

Não execute este prompt enquanto M4 ou Precisão estiverem produzindo candidatos.
Ele só começa quando as duas tarefas entregarem commits, hashes, folhas 3:2/16:9,
mutantes vermelhos e lista explícita de pendências.

Use um único integrador para arma, mãos, animação, ADS, mira e HUD. Antes de criar
ou escolher a worktree de integração, leia os PRs #509, #513 e #534, o estado atual
de `vm-astra-pistol`, `VIEWMODEL-INVENTARIO.md` e `VIEWMODEL-SERIES-HANDOFF.md`.
Não use como base os PRs históricos #464/#468 nem a base congelada dos PRs de
preparação. Parta do `main` atual em uma branch/worktree nova e limpa, cujo nome
deve ser registrado antes de qualquer cherry-pick.

Integre uma família por vez: controles AK/pistola/faca; depois M4; depois
Mosin/SVD/SKS. Para cada família, selecione somente o commit e o artefato aprovado,
reproduza build/GLB, valide Game em 3:2 e 16:9, ações contínuas, troca, ADS, retorno,
skins por time e regressão dos controles. Se a revisão humana reprovar, reverta a
família antes de avançar. Não agrupe mapas, áudio, combate ou materiais alheios.

Abra um PR de integração somente quando a árvore estiver limpa, checks específicos
passarem e a matriz de aceite diferenciar: tecnicamente verde, visualmente aprovada,
pendente e bloqueada. Não faça merge ou release sem autorização final do Ruben.

