# Decisão: trilha canônica da AK golden

**Data:** 31/08/2026
**Estado:** escolhida, validada no jogo real e aprovada por crítico adversarial

## Escolha

A fonte canônica é o piloto dedicado `ak-hires`: um único rig, braços de alta resolução,
geometria própria da AK, câmera exportada, carregadores separados e ações autoradas no mesmo
arquivo. O artefato servido é `public/models/viewmodels/coro/ak-hires.glb`; o builder é
`tools/blender/viewmodels/build_ak_hires_pilot.py`.

## Evidência observada

- O portão 3:2 reproduz o defeito da trilha retarget: caixa em `(0,48; 0,32)`, invasão do
  centro e braço direito fechado no ar. Relatório:
  `artifacts/viewmodels/golden-ak/baseline-3x2-ruler-v2/relatorio.json`.
- GoldSrc preserva mecânica e enquadramento, mas os braços visíveis são o molde de baixa
  resolução que motivou a reabertura do BUG-75.
- Kinemation tem mãos modernas e a melhor pose dos três pacotes servidos, porém o GLB da AK
  oferece apenas idle e recargas; draw e fire dependem de camadas externas.
- `ak-hires.glb` contém um skin, câmera própria e os quatro estados exigidos. A folha do
  GLB reimportado está em
  `artifacts/viewmodels/golden-ak/offline-final-v2/contact-sheet.png`; a contagem e a lente são
  reproduzidas por `node tools/eval/ak-viewmodel-contract.mjs`.

## Alternativas descartadas

- **GoldSrc como final:** descartada por anatomia e densidade visual; permanece controle de
  cadência, mecânica e enquadramento.
- **Retarget GoldSrc → pack moderno:** descartada como arquitetura final porque o bake atual
  transfere pose incompatível para o rig moderno e diverge no runtime. Permanece somente como
  experimento reversível, sem expansão para outras armas.
- **Kinemation assada:** descartada como fonte canônica da AK porque divide os quatro estados
  entre GLB da família, motions compartilhadas e recoil procedural. Permanece controle visual.

## Custo aceito

A primeira AK recebeu ajuste manual e builder específico. Isso adia a generalização, mas
elimina offsets concorrentes e torna Blender, GLB e jogo uma cadeia única. O builder possui
entrada/saída explícitas, publicação opt-in e relatório com hashes em
`artifacts/viewmodels/golden-ak/build-final-v2/build-report.json`.

No runtime, o relatório aprovado é
`artifacts/viewmodels/golden-ak/runtime-final-v11/runtime-report.json`; a régua visual passou
em `artifacts/viewmodels/golden-ak/gauntlet-final-v7/relatorio.json`. Os mutantes de saque
imediato, tiro estático, corte no topo, ausência do pente e invasão do centro ficaram
vermelhos nos diretórios `mutante-final-v6-*`.

O GLB reimportado, o GLB servido e o produto registrado no build têm o mesmo SHA-256,
documentado nos relatórios de build, QA offline, runtime e gauntlet. O runtime também mede
2,5 s tanto no relógio funcional quanto no `AnimationAction`, com erro zero em cada amostra;
a munição só muda no pós-recarga. A captura detalhada de recarga em
`artifacts/viewmodels/golden-ak/offline-reload-detail-v2/` confirma aquisição, inserção e
assentamento do pente, operação do ferrolho e retorno ao guarda-mão.

## Reversão

A integração usa uma chave de catálogo exclusiva da AK. Reverter significa marcar
`VM_FAMILY.ak.ready=false` e retirar a chave golden; nenhum asset antigo é apagado, nenhum
worktree é consolidado e nenhum caminho das outras armas muda.

## Liberação

Um crítico de contexto limpo, sem editar arquivos nem abrir navegador, revisou as folhas e
relatórios finais listados no contrato e deu veredito **APROVA**. A revisão anterior havia
reprovado sincronismo e cadeia de hash; `runtime-final-v11` e `gauntlet-final-v7` fecharam
ambos antes desta liberação.
