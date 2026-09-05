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
- Checkpoint da aprovação da pistola e do prompt: `946cd4c6`.
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
6. Capturador dedicado `tools/eval/melee-runtime.mjs`: controles reais em
   `astra-series/knife-runtime-3x2/` e `knife-runtime-16x9/`, 19 fotos cada,
   sem erros e 15 verificações de estado/retorno passaram. Não confundir isso
   com aprovação da faca. Ele avança `Game.update` real em passos <=1/120 s,
   incluindo blends, relógio e retorno `finished`; não é vídeo em tempo real.
   A tentativa inicial `knife-baseline-3x2/` é **inválida para timing**:
   `setDuration` não atualiza `getEffectiveTimeScale` antes de um tick; o
   capturador agora faz tick zero antes de ler duração. A régua detectou a
   própria amostragem errada (Draw/quick já em Idle no suposto meio). Não é
   falha do controlador de produção. Os dois controles corretos acima a substituem.
7. Inspeção inicial e crítico independente detectaram empunhadura/mão forte
   cortadas e mão livre pouco articulada; não promover a faca. Experimento
   **somente em memória**, pacote inteiro em z=-0,25, demais valores/lente/GLB
   intactos: `knife-depth-candidate-3x2/`. O crítico confirmou melhora clara:
   dedos/cabo mais legíveis, sem regressão visível de silhueta/mira. Ainda
   falta mostrar contato inteiro sem borda/HUD. O padrão permanece z=0.
8. A revisão também encontrou bind pose no término do saque/ataques. A régua
   `melee-motion-check.mjs` reproduziu quatro falhas antes de alterar runtime:
   três ações com contribuição caindo a zero e evento obsoleto encerrando
   ação nova. `meleevm.js` agora usa clamp da pose final no crossfade e filtra
   `finished` pela ação atual. Depois: 7/7; mutante sem-clamp falha em 3,
   evento-antigo falha em 1. `npm run eval:melee-vm` incorpora a régua, também
   executada pelo CI e `check:vm`. Não depende de assets privados.
9. Recapturas com correção + candidata z=-0,25:
   `knife-fixed-candidate-3x2/` e `knife-fixed-candidate-16x9/`, 19 fotos cada,
   15 verificações cada, sem erros. Crítico conferiu os quadros 100% e os
   retornos e aprovou **somente esse recorte**: sumiu a mão aberta/baixa,
   enquadramento 16:9 melhor, nenhuma nova regressão visível. Isso não
   certifica o movimento entre fotos nem o contato 3D. BUG-83 registra a causa.
10. Mutante de browser `knife-mutant-no-attack/` fica vermelho em quick/heavy
    no meio da ação, sem erros: o capturador detecta ataque realmente desligado.
    Mutante estrutural sem-construtor também falhou na cláusula certa;
    versão normal voltou a passar. Build, sintaxe e shaderbudget passaram.
    AK, pistola e faca conservam os três hashes registrados acima.
11. Fechamento: `check-fast-final.log` = **63/66**, somente `eval:mapid`,
    `audio:check`, `feet:check` herdados. Docs e arquitetura em dia. Build
    `astra-series/build.log` passou. Não há navegador/servidor/captura próprios
    ativos. Nenhum GLB alterado; nenhum push, merge, deploy ou envio ao Claude.

## Revisão visual / limites da próxima família

- Abrir `artifacts/viewmodels/astra-series/review.html`, autocontido, e
  `knife-comparison.png` (antes/candidata 3:2). Gerador local `make-review.mjs`.
- Não aplicar o z da candidata como se já tivesse aprovação do Ruben.
- Mão livre ainda tem acabamento anatômico simples; contato da mão forte
  parcialmente oculto por borda/HUD. Não chamar a família de golden.
- Mecânica: o contrato antigo pede slash/stab, mas o controlador herdado
  documenta quick/heavy como duas estocadas. O crítico aceitou registrar
  essa divergência como decisão pendente; **nenhuma mecânica foi trocada**.
- Ainda faltam inspeção de superfícies deformadas/contato no Blender,
  comparação Blender→GLB→browser e vídeo contínuo, além da aprovação do dono.
  Não substituir isso pelas caixas projetadas ou por pesos de ações.
- `tools/blender/viewmodels/inspect_knife_registration.py` aponta o donor
  `/Users/ruben/Downloads/knife_animated.glb` (existe, 5,3 MB). O builder exato
  do pacote atual não foi localizado entre os scripts versionados; não assumir
  que `tools/blender/goldsrc/knife.blend` é sua fonte nem reconstruir às cegas.
- Nos relatórios, peso isolado não significa contribuição: ações nunca
  iniciadas podem manter `weight=1`. A prova de transição usa a fixture animada
  e a inspeção das fotos, não a soma ingênua dos pesos.

## Comandos para reproduzir (Node 23, um browser de cada vez)

```sh
export PATH=/opt/homebrew/bin:$PATH
npm run eval:melee-vm
node tools/eval/melee-motion-check.mjs --mutante=sem-clamp
node tools/eval/melee-motion-check.mjs --mutante=evento-antigo
node tools/eval/melee-runtime.mjs --porta=8347 --quadro-z=-0.25 \
  --saida=artifacts/viewmodels/astra-series/knife-review-new-3x2
node tools/eval/melee-runtime.mjs --porta=8347 --quadro-z=-0.25 \
  --largura=1440 --altura=810 --saida=artifacts/viewmodels/astra-series/knife-review-new-16x9
```

Os comandos com mutantes DEVEM sair 1; normal sai 0. Omitir `--quadro-z`
captura o padrão real. Não sobrescrever controles/artefatos de antes do conserto.

## Próxima ação concreta

Colher revisão do Ruben sobre o enquadramento candidato. Se aprovado, aplicar
somente z=-0,25 em PACKAGE_OFFSET e recapturar **sem override**; preservar os
outros parâmetros. Depois fechar contato/Blender/vídeo e reconciliar o contrato
dos ataques antes de liberar o piloto. Não avançar a AWP antes da faca passar.
Atualizar este ledger após cada marco e guardar checkpoint apenas dos arquivos próprios.

Prompt pronto para outra ferramenta: `PROMPT-CLAUDE-VIEWMODELS.md`.
