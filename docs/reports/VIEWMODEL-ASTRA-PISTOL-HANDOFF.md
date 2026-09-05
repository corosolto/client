# Piloto Astra — pistola X18/G18

## Objetivo e pronto

Continuar o piloto autorizado na conversa de 05/09/2026: melhorar a leitura da
pistola e das duas mãos, comparando até três candidatos no mesmo jogo e nos
mesmos portões. Entregar antes/depois e movimento verificáveis para a revisão
visual do Ruben. A AK golden é o controle de regressão. Aprovação técnica não
declara a pistola golden nem libera outras famílias.

## Checkout e insumos

- Branch `codex/vm-astra-pistol`, base `fd58f492` (`claude/vm-fable51-pistol`).
- Worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-astra-pistol`.
- Histórico causal e resultados anteriores: [handoff Fable](VIEWMODEL-FABLE51-PISTOL-HANDOFF.md).
- `public/private-assets/viewmodels/` é uma cópia APFS local, não um symlink
  gravável para o acervo compartilhado. Não executar builders com o `privateRoot`
  padrão; configurar explicitamente esta cópia antes de qualquer rebuild.
- Node: `export PATH=/opt/homebrew/bin:$PATH`; dependências reutilizadas por
  symlink somente para leitura do `node_modules` da lane Fable.
- Evidências novas: `artifacts/viewmodels/astra-pistol/` (gitignored).

## Marcos conferidos em 05/09/2026

- Base Fable limpa em `fd58f492`, com socket corrigido; nenhum checkout anterior
  foi editado.
- SHA da pistola copiada: `edb77908eadffd90fa3c2152ac00386372bf3002d20fb2c4d324d15ddad17e05`.
- SHA da AK: `3b6ca23d7ea26017803d81f476b9d7a835eeb9f679f169ad0f520db82333df29`.
- Inventário estrutural salvo em `baseline-inventory.json`: idle, shoot e
  reload_tactical amostrados pelo `vm-glb-inventory.mjs` sobre a cópia local.
- Antes/depois anterior inspecionado: pistola nivelada, luvas visíveis, pacote
  concentrado no rodapé. O tamanho/enquadramento ainda requer comparação visual.

## Pendências e próximo passo

1. Reproduzir o baseline de captura na nova lane e isolar a divergência do saque
   registrada no handoff Fable; provar uma captura que corresponde à pose medida.
2. Comparar até três propostas com os mesmos assets, aspectos 3:2 e 16:9,
   mantendo pegada, arma reconhecível, recarga, saque e disparo completos.
3. Rodar contratos e mutantes pertinentes, regressão AK e crítico independente;
   guardar rejeitados com motivo. Checkpoint recuperável antes da entrega.
4. Entregar imagens e preview local para a decisão visual do Ruben.

Até aqui: preparação e inventário. Nenhuma nova candidata foi validada.
