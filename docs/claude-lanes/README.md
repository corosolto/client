# Lanes Claude do sprint de 72 horas

Estes prompts são auto-contidos e podem ser entregues diretamente ao Claude Code. Cada lane
tem worktree e branch exclusivas. Não mova alterações entre lanes sem PR ou cherry-pick
deliberado.

## Como executar

Use Node 23 no `PATH` e o modelo exato Opus 5:

```bash
PATH=/opt/homebrew/bin:$PATH claude --print --model claude-opus-5 \
  --max-turns 120 --dangerously-skip-permissions "$(cat docs/claude-lanes/ARQUIVO.md)"
```

Antes de executar, troque para a worktree indicada no arquivo. Se a execução parar por limite,
rode o mesmo comando outra vez: o prompt manda preservar e retomar o `git status` existente.

Para as seções marcadas como ZCode GLM 5.3, selecione `GLM-5.3` no ZCode, abra a worktree
indicada e envie integralmente o arquivo correspondente. Não execute essas seções por outro
provedor: a disponibilidade do GLM desta máquina pertence ao ZCode.

## Regras comuns

- Leia `AGENTS.md`, `STATUS.md`, `HANDOFF.md` e os relatórios citados antes de editar.
- Preserve todo diff já existente; não descarte, sobrescreva nem limpe trabalho interrompido.
- Escreva a régua antes do conserto e prove o mutante vermelho.
- Não abra navegador. Use Node, Blender headless e capturas offline; registre a revisão humana
  no jogo como pendente quando ela não puder ser realizada.
- Não altere materiais compartilhados, runtime de outra frente, segredos ou arquivos privados.
- Não faça merge nem release. Faça commit pequeno com `AGENTE="Claude Code (Opus 5)"`, push e
  abra ou atualize somente o PR da lane.
- Relate: arquivos alterados, comandos executados, resultados, evidência visual, limitações e
  próximo passo. Gate verde não substitui inspeção visual.
- Viewmodels são sequenciais: arma, mãos, animação, ADS e HUD ficam com um único integrador.

## Índice

- `COMBATE-HEADSHOT-ABATES-FACA.md`
- `MITICOS-LOBISOMEM.md`
- `AMAZONIA-8X8.md`
- `SERTAO-CASAS-POR-DO-SOL.md`
- `ESCADAO-JANELAS-ABRIGO.md`
- `CAMPINHO-COBERTURA.md`
- `VIEWMODELS-1P.md`
- `AUDIO-FUNKEIROS-URBANAS.md`
- `JOA-MANSAO.md`
- `LAJES.md`
- `MAPAS-LEGADOS.md`
- `AWP-PENETRACAO.md`
