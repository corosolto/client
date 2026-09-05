# Sertão: continuação da revisão do PR #445

## Objetivo e aceite
Elevar visual e tecnicamente o Sertão preservando layout, três rotas, objetivos, spawns, pickups e desempenho. Aprovação exige captura real 3:2, movimento, contratos e mutações, comparação antes/depois e revisão adversarial humana. Não fazer merge nem deploy. A entrega autorizada pode ser commits locais prontos para integração.

## Isolamento
Worktree criada exclusivamente em `/Users/ruben/csbrasil/worktrees/sertao-astra`, branch `codex/sertao-astra`, origem `49441895bebdfa328a228de142d0015b4597db9f` de `origin/map2/velho-oeste`. Nenhuma worktree existente usada para implementação. `git worktree list` verificou que a branch original estava livre. O diretório agregado `csbrasil` não é raiz Git.

## Diagnóstico antes de alterar o mapa
Evidência: `artifacts/sertao-astra/before/` contém sete PNG 1536×1024, câmera FOV 70 e metadados em `capture.json`. Chrome/ANGLE Metal Apple M4 Pro, sem SwiftShader. Fonte: baseline acima. Todas as imagens foram abertas pelo responsável; revisão independente em andamento.

- Bom: igreja branca reconhecível, poço, caminhão antigo, três famílias de fachadas fechadas e porte de vila. Há cobertura central, flancos e objetivos definidos.
- Reprovado visualmente: casas pau-a-pique são pavilhões abertos de madeira; folha inexistente no juazeiro; cerca de ranch, carroças e tumbleweeds reforçam western; amarelo/laranja domina luz e solo; costura vertical do céu no quadro forró; plano acaba no vazio; planta invade o palco; placas se sobrepõem e não há venda/forró identificáveis.
- Escala/colisão: igreja visível mede cerca de 4.35×6.30 m no chão, mas seu colisor ocupa 8.8×13.4 m. No ramo GLB a rotação do prop não chega ao grupo usado no cálculo do colisor. Alpendres são caixas sólidas invisíveis até 2.6 m de altura. É hipótese de impacto jogável a medir, não aprovação da geometria.
- Repetição: mesmo mandacaru e esqueleto arbóreo por todo perímetro. Nenhum fundo em camadas.
- Performance baseline: 503 calls / 320181 tris na aérea, 86 texturas / 117 geometrias. Build 64 ms. Captura estática não prova FPS de partida; medição em movimento pendente.
- Gates frescos iniciais: `eval:sertao`, `eval:velhooeste`, `eval:mapcontrato`, `eval:ambience-registry`, `eval:look` passaram. `eval:ambience` não executou por dependência ausente, resolvida com `npm ci --ignore-scripts` na worktree. Essa falha não conta como reprovação do mapa.
- PR remoto: `CONFLICTING/DIRTY`; merge virtual apontou seis conflitos em documentação gerada, sem conflito de runtime. O merge virtual não alterou checkout/index. Não incorporar toda a base nesta entrega para não misturar outras frentes.

## Decisões
Pesquisa de referências e acervo em `SERTAO-REFERENCIAS.md`; crítico independente em `SERTAO-CRITICA-BASELINE.md`. Não comprar nem gerar assets pagos. Reusar acervo com procedência verificável e modelagem procedural própria quando o molde não satisfaz a silhueta. Preservar posições das casas, spawns, bandeiras e armas. Corrigir falsos bloqueios e correspondência de colisão com geometria visível. Remover tumbleweeds por decisão explícita do dono de eliminar western; substituir a exigência antiga de colisão móvel por régua de microvida sem bloqueio competitivo. Não baixar áudio de origem incerta.

## Em andamento / próximo passo
Criar réguas antes da correção para textura íntegra, vegetação não obstrutiva, semântica ligada à malha, correspondência física e três rotas. Corrigir céu, casario e entorno; recapturar e testar. Registrar commits e resultado integral dos gates antes da entrega. Nenhum resultado visual está aprovado.
