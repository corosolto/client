# Campo do Morro: acabamento em andamento

Objetivo: atender o pedido de mapa limpo, material consistente, vãos construídos e obstáculos reconhecíveis, usando Complexo Favela como referência visual. A missão maior inclui os demais mapas, personagens, skins, motion, PRs e release. Este checkpoint não conclui a arte.

Base deste trabalho: `36af72ee210ef74c435e26d751bcb6c5e2a031cb`. Evidências locais estão em `audits/2026-10-31-visual-consistency` no workspace agregado. Nenhuma chave ou bitmap gerado faz parte deste commit.

## Implementado e conferido

As casas baixas da rua receberam esquadrias, divisões e ferragens mescladas por material, sem novos colisores. Os antigos obstáculos de textura rachada foram diferenciados em gabinete, carga cerâmica e carga mineral, preservando seus volumes físicos. O gabinete foi aprovado na crítica visual. Os paletes ainda precisam acabamento.

A parede azul usa o mesmo reboco PBR da família local, com UV métrico independente do atlas. O modelo original tinha normais discrepantes; a correção recalcula somente a geometria clonada de cada instância. Os planos reais da fachada e das quatro vidraças foram medidos no GLB original e separados por grupos. Fios, antenas, caixa-d'água e demais detalhes conservam o atlas original. O material original e suas texturas compartilhadas não são modificados.

O registro de clones mantém albedo, normal e roughness no canal UV correto tanto quando a carga chega antes como depois da criação do clone. A régua permanente `campo-blue-plaster-check.mjs`, ligada a `eval:map-material-finish`, usa as funções reais e mutações causais.

## Evidência deste ponto

- R1743: 15 pares, 30 capturas WebGL reais em 1200x800, câmeras idênticas, zero erros de runtime/requisição. Fonte e estado Git preservados.
- R1745: colisores, spawns, alturas, navegação, camBlockers e pickups iguais à base. XYZ e multiconjunto orientado dos triângulos de oclusão iguais; cada triângulo permanece coberto uma vez por material DoubleSide. Caches originais de geometria, material e sampler intactos.
- R1746: mutações reais de posição e winding alteram a prova de oclusão; mutação das normais no template original reprova o cache. Todos os componentes decorativos dos obstáculos ficam no envelope original.
- R1747: `syntax`, `eval:campo-contract`, `eval:campomorro-molde`, `eval:map-material-finish`, `eval:external-surface-binding` e `eval:visual-map-contracts` passaram.

A separação em grupos e a geometria clonada têm custo adicional. A evidência contém chamadas, triângulos e memória; ela não prova orçamento em aparelho mobile. Nenhum limite foi afrouxado.

## Aceites e rejeições

O crítico independente R1744 viu os 30 originais e a referência: reboco azul, gabinete e esquadrias das casas baixas APROVADOS. Paletes e vãos das casas azuis REPROVADOS. A carga ainda parece um bloco desenhado, com cor muito uniforme e juntas fortes; porta azul conserva imagem difusa e janelas precisam articulação. Próxima correção: grão mineral, variação discreta entre peças, madeira e juntas diferenciadas; folha e ferragem de porta, caixilhos e divisão de janela nas azuis.

As tentativas OpenRouter R1694/R1733 não foram integradas: a melhoria de atlas não corrigia os planos realmente visíveis e alterava detalhes. GLM participou da autoria; suas propostas foram adjudicadas, não tomadas como revisão independente.

## Pendente

Corrigir os dois itens reprovados, recapturar as vistas correspondentes e obter crítica independente atual. Compor com NET e PR1138 na lane de release, regenerar documentos oficiais, executar build/boot/portão normal e revisão do head publicado. Ego/Game, humano, mobile e MP real continuam sem aceite deste checkpoint.
