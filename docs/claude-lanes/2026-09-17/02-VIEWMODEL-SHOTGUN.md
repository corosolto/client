# Claude Opus 5 — shotgun M3: a pior arma do placar, primeiro alvo da lista

Estado verificado em 17/09/2026. Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-unificado`, branch
`claude/vm-unificado`, após o push de recuperação de 17/09 (lane 01). Antes de editar,
confirme o HEAD com `git log -1`, presencie `git status` limpo e leia integralmente:

1. `docs/reports/VM-DIAGNOSTICO-FECHAMENTO.md` — fonte autoritativa, em especial o
   checkpoint de 14/09 (noite) e tudo que menciona shotgun/M3;
2. a entrada `BUG-VM-FECHAMENTO-RUBEN` em `KNOWN-BUGS.md`;
3. `docs/claude-lanes/2026-09-07/00-PROMPT-ORQUESTRADOR.md` (regras gerais).

## O defeito do dono (registro literal)

"M3 arma apontado pro alto e segunda mao nao segura o cano na frente". Aceite =
orientação coerente e mão de apoio segurando a região dianteira em idle e tiro, com
recarga por cartucho legível. No placar cego de 14/09 (`placar-dono-20260914/CRITICA.md`)
a shotgun foi a pior das 11: nenhuma mão encosta e a recarga aponta para o alto; sem
frame de tiro capturado.

## O que já existe e não deve ser jogado fora

- `shotgun-shell-fit-v8.mjs` é a fonte atual da candidata v8 (o gerador Python anterior
  NÃO contém os últimos ajustes manuais de corredor/keytimes).
- v8 tem passagem inferior correta: cartucho vermelho entre dedos em 045 e entrada sob
  o receiver em 046. Não instalada porque a luva atravessa a guarda.
- `shotgun-push-grip/` é o próximo estudo exigido: reorientar a mão para pressionar pela
  ponta. A receita do polegar inclinado só é válida até t=.213; t=.214 cruza a guarda.
  Não estender esse resultado até a ocultação.
- v6 provou que o registro geométrico antigo invertia a mão esquerda contra a anatomia
  do doador; qualquer trabalho parte do frame anatômico correto.
- O shell do doador tem hide/reset por escala e geometria absoluta inválida: não copiar
  às cegas.

## Entrega

Shotgun no caminho autorado com: orientação corrigida (não apontar para o alto), mão de
apoio na região dianteira em idle/tiro, recarga por cartucho com contato real,
enquadramento 3:2 e 16:9, captura viva sem overrides e crítica independente cega.
Depois dela, na ordem do crítico: uzi, recarga por clip do SKS, mp5 (pente ao sair), m92
(escala ~125% da AK) — uma por vez, sem expandir a receita antes de uma ação completa
melhorar na revisão independente.

## Réguas e limites

- Browser exige `PATH=/opt/homebrew/bin:$PATH` à frente; root é o único operador de
  browser desta árvore.
- `eval:vm` antes de `eval:invariants`; `eval:vm-autorado-vivo` na porta do arnês antes
  de encerrar. Checkpoint commitado a cada marco; push ao final.
- Assets privados apontam para `.../fechamento-ruben-20260914/active-worktree`; famílias
  não isoladas são symlinks: nunca escrever através delas.
- Defeito transversal conhecido: mp5, m92, scar, m4 e uzi ainda carregam a malha
  `coro_solto_project_ak_charging_handle` do rig da AK;
  `tools/viewmodels/remover-proxy-ak.mjs` remove só a malha e prova por hash que todos
  os accessors ficam. Aplique quando tocar cada família, com A/B cego.
- As cinco armas aprovadas pelo crítico (svd, deagle, revolver38, m4, scar) aguardam
  aceite do dono: não as altere sem instrução nova.
- "Candidata offline" não é entrega. Aprovação visual do dono é obrigatória e não pode
  ser declarada por agente.
