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

## Marco 1 — captura fiel e teste independente

- `baseline-runtime/` reproduziu o bug: o frame de saque 0% mostrava a pose
  pronta; em 50% a imagem ainda estava defasada. `capture-fixed/` mostra
  saída fora da tela e entrada progressiva; o
  contrato da pistola passa contra seu `runtime-report.json`.
- Causa: a pose do saque já era aplicada ao mount com `update(0)`, mas a foto
  não garantia render da nova pose/matriz. No tiro, a amostragem só do mixer
  também congelava o recuo do controlador. O nome `idle` no clipe subjacente
  de saque procedural, sozinho, não prova que o frame está parado.
- `golden-ak-runtime.mjs` agora usa o helper autocontido de captura, avança
  o recuo em subpassos de até 1/60 s (o controlador limita dt a 0,05 s), não
  amostra idle como se fosse tiro, renderiza explicitamente e restaura update,
  pausa do clipe e prazo finito da ação ao terminar, inclusive em exceção.
- Teste independente: `npm run eval:authored-capture -- --mutate`: **8/8**;
  seis mutantes mortos e retorno ao verde após cada um. Log:
  `capture-regression.log`. Não mede anatomia nem substitui a revisão visual.
- Captura corrigida: mesmo SHA servido da pistola, sem erros de runtime,
  caminhada 2,27 m, salto 0,078 m, parede 0,38 m. Não houve rebuild do GLB.
- O capturador aceita overrides de frame só em memória; os parâmetros ficam
  no relatório. Nenhum enquadramento novo foi aplicado ao jogo.
- `eval:authored-vm` tem **quatro falhas preexistentes**, reproduzidas na lane
  Fable limpa: expectativas de 26 armas/15 famílias contra catálogo 20/14 e
  escolha da rota golden da pistola. Não alterar esses contratos neste piloto.
  Logs: `authored-vm.log` e `authored-vm-source-baseline.log`.

## Comparações — A mantida; B e C rejeitadas

- A = baseline H: x 0,100; y -0,100; z -0,220; yaw 20°; FOV 55°.
- B = x 0,125; y -0,075; z -0,220; yaw 10°; FOV 55°.
  **Rejeitada em 3:2**: arma pequena (diagonal 11,9%) e mãos/arma 5,5×
  contra máximo existente 4,0×. `candidate-b-gauntlet/relatorio.json`.
- C = mesmo B com yaw 30°: **rejeitada em 3:2**: mãos/arma 4,9×,
  início do pacote x 0,48 fora do intervalo 0,50–0,66 e **amostra insuficiente**
  de contato na recarga. A crítica independente encontrou um erro no P4:
  pico de pente 1777 px, abaixo do filtro >2000; o resumo -1 era traduzido
  incorretamente como distância >192 px. Isso NÃO prova mão desconectada.
  `candidate-c-gauntlet/relatorio.json` conserva o relatório original para
  reproduzir o defeito. O helper novo mantém o portão reprovado por ausência
  de medição, sem inventar distância nem relaxar limites.
  Materiais reais: `candidate-c-runtime/`, `candidate-a-vs-c.png`.

## Marco 2 — crítica adversarial e diagnóstico honesto

- Checkpoint anterior: `66608e77` (preparação); `c3282daf` (captura e oito
  contratos iniciais). Esta rodada acrescentou avanço temporal durante draw e
  reload, retorno natural de recarga e diagnóstico P4 sem distância inventada.
- Réguas finais: **APC 10/10 + MCD 8/8**, oito + dois mutantes mortos. Logs:
  `capture-regression.log`, `contact-diagnostic-regression.log`.
- Crítico: contato não pode ser negado por oclusão ou por ausência de amostra.
  O inventário confirma Mag animado e com vértices; distância entre pivôs não
  prova contato entre superfícies. A troca do carregador segue mal legível.
- `capture-fix-before-after.png` compara o instrumento antes/depois; não é
  propaganda de um novo asset. `candidate-a-vs-c.png` compara materiais reais.
- Crítica adicional de fidelidade: a pose isolada não demonstra blends naturais.
  C mostrava HUD 12/47 enquanto o metadado pré-RAF registrava 11/48. Agora
  `rendered` lê HUD/pose após o render e congela a simulação até terminar a foto,
  com restauração em `finally` e teste de mutação próprio.
- `vmrecoil-sim` passou sem falhas; `npm run build` passou. `check:fast`:
  **63/66**, falhas `eval:mapid`, `audio:check`, `feet:check`; reproduzidas na
  lane Fable limpa, sem alterar mapas, áudio ou offsets neste piloto.
- Pistola 16:9: `final-pistol-16x9/runtime-report.json`, contrato verde, sem
  erros, retorno natural para idle, caminhada 2,80 m, salto 0,078 m, parede
  0,38 m. A manipulação do pente continua junto ao rodapé.
- AK 3:2: `final-ak-control/runtime-report.json`, fonte `gold#ak`, mesmo SHA
  original, sem erros, retorno natural a Idle, caminhada 2,47 m e parede
  0,38 m. Não houve alteração da AK nem dos arquivos servidos de gameplay.
- `final-pistol-3x2/` é a última recaptura, incluindo HUD congelado; a captura
  16:9 e o controle AK antecedem somente essa proteção atômica de screenshot.
  Contrato verde, sem erros, caminhada 0,92 m, salto 0,151 m, parede 0,38 m;
  retorno natural para idle. `reload-100` registra em `rendered.ammo` 12/47,
  conferido no PNG; os 11/48 no metadado de fase são explicitamente anteriores.
- `arch:check` e `docs:check` revalidados após integração das réguas. Código
  do segundo marco em `e242dc12`. Comparativos regenerados com o frame final.

## Resultado, limites e continuação

Piloto de enquadramento encerrado **sem nova candidata aprovada**. Aceitos:
correções do instrumento e diagnósticos. B/C foram barradas em 3:2; não houve
motivo para promovê-las a validação 16:9. A baseline foi conferida nos dois
aspectos. AK preservada. Nenhum merge, push, deploy ou publicação foi feito.

Próximo passo concreto, sem novo ciclo cego de offsets:

1. Na cópia local do Blender/GLB, inspecionar superfícies deformadas da mão
   esquerda, Mag e Cartridge em reload .52/.60/.68, com vistas ortogonais e
   câmera do jogo. Medir o contato das superfícies, não só os pivôs dos ossos.
2. Se houver defeito autoral, corrigir apenas os canais/rig comprovados e
   exportar com `privateRoot` explícito para esta cópia. Preservar a AK e o
   baseline por SHA; não compensar a arma com escalas de mãos sem referência.
3. Capturar uma sequência contínua curta de recarga para validar as misturas
   de entrada/saída: as séries atuais isolam fases do clipe e não provam blends.
4. Repetir gauntlet e materiais reais em 3:2/16:9, crítica independente e
   aprovação visual do Ruben. O BUG-75 continua aberto; nada foi declarado golden.

Não verificado: celular/Safari/ultrawide, FPS/custo comparativo, blends contínuos,
contato 3D de superfícies e publicação. O gate amplo tem os três vermelhos
preexistentes documentados, além das quatro falhas do contrato geral de catálogo.
