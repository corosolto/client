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

- `baseline-runtime/` reproduziu o bug: todos os cinco frames de saque mostravam
  idle. `capture-fixed/` mostra saída fora da tela e entrada progressiva; o
  contrato da pistola passa contra seu `runtime-report.json`.
- Causa: amostragem do mixer sem atualizar o mount procedural e sem garantir
  render da nova pose. O tiro também congelava o recuo do controlador.
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

## Comparações em andamento

- A = baseline H: x 0,100; y -0,100; z -0,220; yaw 20°; FOV 55°.
- B = x 0,125; y -0,075; z -0,220; yaw 10°; FOV 55°.
  **Rejeitada em 3:2**: arma pequena (diagonal 11,9%) e mãos/arma 5,5×
  contra máximo existente 4,0×. `candidate-b-gauntlet/relatorio.json`.
- C = mesmo B com yaw 30°: **rejeitada em 3:2**: mãos/arma 4,9×,
  início do pacote x 0,48 fora do intervalo 0,50–0,66 e apoio distante do pente
  na projeção de recarga (P4). `candidate-c-gauntlet/relatorio.json`.
  Captura com materiais reais em andamento; nenhum limite foi relaxado.

## Pendências e próximo passo

1. Concluir C e capturar comparação com materiais reais usando o helper final;
   `capture-fixed/` antecede a última proteção de retomada da série.
2. Comparar até três propostas com os mesmos assets, aspectos 3:2 e 16:9,
   mantendo pegada, arma reconhecível, recarga, saque e disparo completos.
3. Rodar contratos e mutantes pertinentes, regressão AK e crítico independente;
   guardar rejeitados com motivo. Checkpoint recuperável antes da entrega.
4. Entregar imagens e preview local para a decisão visual do Ruben.

Até aqui: captura corrigida, teste independente e B rejeitada. A pistola não
foi declarada golden; a leitura do carregador e das mãos ainda precisa melhorar.
