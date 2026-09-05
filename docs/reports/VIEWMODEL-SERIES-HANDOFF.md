# Continuação das famílias de viewmodel

## Objetivo e autorização — 05/09/2026

Ruben aprovou a pistola com yaw 15° e pediu avançar a próxima série de armas,
preservando a continuidade caso a cota do Codex termine. Não autorizou novos
gastos, publicação nem transferência automática para outro serviço.

Objetivo completo: consolidar AK e pistola, depois os pilotos **faca →
sniper/AWP → escopeta**, conforme `docs/development/VIEWMODEL-1P-PROFISSIONAL.md`,
antes de ampliar ao restante do arsenal. A próxima frente ativa é a faca.
Cada piloto exige evidência real em 3:2/16:9, mãos/arma legíveis, ações corretas,
retorno natural ao idle, revisão independente e aprovação visual do Ruben.
Não marcar tudo pronto só porque testes estruturais passam.

## Checkout e preservação

- Worktree exclusivo: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-astra-pistol`.
- Branch `codex/vm-astra-pistol`; início desta rodada em `1afbf01e`, limpo.
- Não trabalhar em `primary`, Fable, retarget ou outros checkouts.
- `export PATH=/opt/homebrew/bin:$PATH` (Node 23); Node 16 sombreia o ambiente sem isso.
- `node_modules` é symlink para dependências Fable, somente leitura.
- `public/private-assets/viewmodels/` é clone APFS **local**. Builders devem
  receber esta pasta explicitamente; nunca usar o `privateRoot` compartilhado
  padrão nem reotimizar `shared/` por acidente.
- Um navegador por vez; não encerrar browsers/processos do usuário.
- Evidências novas: `artifacts/viewmodels/astra-series/`; pistola anterior:
  `artifacts/viewmodels/astra-pistol/`. Fora do Git, sem copiar dados brutos no prompt.

## Controles aprovados e dívida preservada

- AK: `public/models/viewmodels/coro/ak-hires.glb`, SHA-256
  `3b6ca23d7ea26017803d81f476b9d7a835eeb9f679f169ad0f520db82333df29`.
- Pistola: `public/private-assets/viewmodels/pistol/pistol-runtime.glb`, SHA-256
  `edb77908eadffd90fa3c2152ac00386372bf3002d20fb2c4d324d15ddad17e05`.
- Pistola aprovada: x 0,100; y -0,100; z -0,220; FOV 55°; rotação
  `[0, 15, -5]`; drawDrop 0,34. Só yaw mudou. O histórico causal completo
  está em `VIEWMODEL-ASTRA-PISTOL-HANDOFF.md`.
- Gauntlet anterior 3:2: 15° sem falhas, diagonal 12,15%, mãos/arma 3,890×.
  10° foi visualmente preferido pelo crítico, mas barrado por diagonal 11,85%
  abaixo de 12%; não reaplicar. B/C anteriores também foram rejeitados.
- **P4 em 16:9 segue pendente:** amostra insuficiente de contato mão/pente,
  tanto 20° (18 px máximos) quanto 15° (38 px), filtro >2000 px. Distância
  é `null`, não significa mão desconectada e não autoriza reduzir o filtro.
  A aprovação do enquadramento não converte essa medição em verde.
- Não foram validados todos os blends contínuos, celulares ou ultrawide.
- Último `check:fast` antes desta rodada: 63/66; vermelhos reproduzidos na
  Fable limpa: `eval:mapid`, `audio:check`, `feet:check`. Contrato geral
  `eval:authored-vm`: quatro falhas de catálogo/rota preexistentes. Reavaliar
  qualquer falha nova, sem misturar mapas/áudio nesta frente.

## Marcos desta rodada

1. Contrato da pistola atualizado para cobrar yaw 15° e conferir também o
   frame do relatório do browser. Antes de mudar o runtime ficou vermelho
   especificamente em `orientação-base divergiu (0, 20, -5)`;
   `astra-pistol/approved-frame-before.json`.
2. `FAMILY_FRAME.pistol` recebeu os 15° autorizados. Recaptura sem overrides
   em `astra-pistol/approved-runtime/`: 27 frames, sem erros; folha inspecionada.
   `approved-contract-final.json` passou. Os dois mutantes
   `--mutante-quadro-antigo` e `--mutante-runtime-quadro-antigo` ficaram
   vermelhos pelas causas esperadas. AK e GLB da pistola mantêm os hashes acima.
3. Próximo piloto confirmado: `KnifeMeleeViewModel` em `public/js/meleevm.js`,
   asset versionado `public/models/viewmodels/coro/melee/knife-hires.glb`.
   Não passa por `__authoredVm`; não chamar golden-ak-runtime com knife.
   Existe `tools/eval/melee-vm-check.mjs`, mas cobre estrutura, não movimento
   nem pixels. Primeiro capturar a implementação existente antes de alterar.
4. Inventário da faca em `astra-series/knife-inventory.json`: 52 joints, dois
   materiais, quatro clipes e câmera; `knife-contract.log` verde. GLB inicial
   SHA-256 `62119f066951cf8f98fbaa86bbe62f98800602b0ffaabfa83af45e2e61dc18b0`.
   Ataques quick/heavy usam Stab por intenção já documentada no controlador;
   Slash é clipe de biblioteca, não exigir sua troca sem evidência/autorização.
5. Build da pistola passou (`astra-pistol/approved-build.log`), incluindo os
   módulos servidos por hash. `check:fast`: 62/66 antes de regenerar docs;
   `eval:shaderbudget` passou, `docs:check` foi corrigido por `npm run docs`
   e os outros três vermelhos são os herdados acima. `arch:check` passou.
6. Capturador dedicado `tools/eval/melee-runtime.mjs` em desenvolvimento,
   ainda não promovido: primeira captura 3:2 em
   `astra-series/knife-baseline-3x2/`. Não confundir seu status estrutural
   com aprovação da faca. Ele avança `Game.update` real em passos <=1/120 s,
   incluindo blends, relógio e retorno `finished`; não é vídeo em tempo real.

## Próxima ação concreta

Concluir a captura inicial da faca e capturar idle, draw, ataque rápido, ataque forte e retorno no jogo,
usando o controlador melee real e não fingindo que é arma de fogo. Fazer a
crítica dos frames antes de propor mudanças. Atualizar este ledger após cada
marco e guardar um checkpoint Git apenas dos arquivos próprios.

Prompt pronto para outra ferramenta: `PROMPT-CLAUDE-VIEWMODELS.md`.
