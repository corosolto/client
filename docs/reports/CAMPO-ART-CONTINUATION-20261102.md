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

## Atualização R1783: aceite visual dos itens corrigidos

O checkpoint inicial foi mantido como histórico. Depois dele os paletes ganharam textura de madeira, as cargas receberam grão mineral e variações discretas, e as casas azuis receberam folhas de porta e caixilhos físicos nos planos medidos. GLM1752 participou da autoria; suas propostas de cross-Z incorreto, perda da fachada seletiva e troca global de juntas foram recusadas ou corrigidas.

R1758 produziu 15 pares/30 capturas atuais com os oito materiais minerais PBR1024 e dois de madeira512 efetivamente carregados, sem erros. R1761 passou em seis aliases focados (syntax, Campo, molde, material/PBR, surface binding e contratos visuais). A crítica independente R1760 aprovou as casas azuis e a cerâmica e apontou uma cinta lateral interrompida. Removida, a crítica R1770 apontou somente a tampa plana da carga clara.

A carga clara agora tem unidades separadas, duas cavidades rasas por bloco superior e fundo físico visível. A proposta inicial GLM1771 de esconder um proxy foi REJEITADA pelo contrato real de tiros: `colorWrite=false` exclui a malha da oclusão. O candidato R1774/1775 não foi aceito. A solução R1777 usa um miolo visível rebaixado e os quatro batches visíveis de concreto como superfícies de tiro, preservando o colisor de movimento original. Não há superfície invisível que retenha a bala no topo antigo.

R1778 mediu os quatro raios reais: os dois fundos são atingidos 4,5cm abaixo do topo, a borda a 6mm e a frente na face visível. R1781 incorporou o contrato CVC1 ao checker Campo: nominal passa; restaurar a tampa plana e retirar os blocos da lista de tiro reprovam na cláusula própria, sem aceitar erro de infraestrutura.

R1782 confirmou física, spawns, grafo e caches originais iguais; 455 detalhes ficam no envelope original. A oclusão mudou intencionalmente apenas na carga clara: um miolo rebaixado e quatro batches de blocos. Os outros 149 occluders originais permanecem semanticamente idênticos. Os mutantes reais de posição, winding e cache original continuam detectados. Esta mudança de superfície é explícita; não se declara oclusão integralmente idêntica.

R1779 recapturou os quatro originais focais em 1200x800, sem erros e com fonte preservada. Crítico independente R1780, sem código ou críticas anteriores, aprovou as duas cargas no enquadramento fornecido. Os demais itens aceitos em R1760 não foram modificados. Isto fecha os itens locais reprovados, sem substituir avaliação global do jogo.

Nas duas vistas focais, comparando com a base anterior a todo este acabamento, as chamadas passaram de 425/411 para459/445 e os triângulos de254663/254407 para269147/269803; texturas102 nas duas condições. Estes números incluem as casas e outros detalhes anteriores, não apenas as cavidades. Não há benchmark em aparelho mobile nem aprovação de orçamento.

Próximo passo: checkpoint normal e composição na lane Arena; regeneração/build/boot/portão normal, revisão do head publicado e release ainda pendentes. A missão integral e Ego/Game/humano/mobile continuam em aberto.

R1783 detectou o snapshot histórico de oclusão em CB-M4. R1784 reconstruiu o estado anterior e provou igualdade exata com o baseline: todas as chaves físicas continuam iguais; somente uma entrada de miolo e quatro batches de concreto mudam no interior. O baseline atual registra fonte, hash, blob Git e meta anterior, motivo e provas da migração. A comparação permanece exata; nenhuma tolerância ou exclusão foi ampliada. O nominal e os nove mutantes de borda precisam passar no novo snapshot antes do commit.

R1785: o alias completo de contratos visuais passou em22.423s, incluindo nominal e nove mutantes de borda, além dos grupos favela/material/UV. O mutante CVC1 de remoção dos quatro batches foi reaplicado, confirmou a quantidade e reprovou na cláusula de borda visível em0.540s. Syntax atual passou em4.581s noR1783.
