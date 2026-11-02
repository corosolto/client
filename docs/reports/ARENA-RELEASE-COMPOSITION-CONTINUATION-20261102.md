# Composição Arena na base de release

Missão integral: integrar PRs elegíveis e acompanhar release, preservando as lanes dos outros runs e excluindo Operação Flávio. Melhorar a consistência de mapas, personagens, skins, motion 1P/3P e mira conforme PDF, roadmap e referências. Esta composição é uma etapa técnica; não conclui release nem qualidade visual do jogo.

Base local `bb954c80a8b6996be006719646ece6a6e7c5957b`, sobre a publicação `69fa19a6a8a6c3f3b82c1efeef0866769eb184e8`. Entrada PR1138 `23c7402e94251a91f61ecae7a46835e7cc5f7b6d`. Lane própria `release-arena-compose-r1749-20261102`, sem edição no checkout ou ref do autor. PR1179 já é ancestral da base. Evidências locais no diretório agregado `audits/2026-10-31-visual-consistency`.

## Decisões da composição

Os 52 blocos de conflito foram resolvidos preservando os contratos mais recentes de boot, armas, skins, horda, rede e mantle. O Game e a telemetria distinguem Arena, CTF, rounds e modo objetivo. Mapa objetivo impede Arena; sessão multiplayer também. Uma instância existente do Game prevalece sobre a escolha antiga do menu. O ciclo de seleção inclui Arena e mantém o modo escolhido durante navegação elegível.

O RED real de R1765 mostrou troca de facção incorreta ao pressionar M depois de conversão Arena. `_switchTeam` agora captura a facção do destino antes de atualizar o mapeamento, mantendo o perfil de mãos/skins completo. R1767 passou no caso nominal e nos três mutantes de lado, halo e facção. Outro RED era infraestrutura do sandbox: o bloco inicial real já continha `modoEscolhido`, e a composição o injetava duas vezes. R1772 remove somente a reinjeção e exige que a declaração continue no bloco real; não enfraquece o veredito semântico de mutantes.

Mantle e o metadriver de boot preservam os arquivos atuais da base. A única contribuição anterior em `boot-orcamento` exige aplicação única do mutante `poolAnsioso`. CI e aliases incorporam os novos contratos Arena, formato de rounds e binding das armas. Os arquivos gerados conflitantes foram preservados temporariamente pela base e ainda devem ser regenerados pelas ferramentas oficiais depois da composição final.

## Evidência e limites

R1765 passou em 12 de 13 aliases: syntax, formato/horda, preload, taxa de rede, javaporcos, switchteam, fluxo de skins, TP, headshot, versão/origem, APIs e query de telas. O único vermelho era Arena e produziu os dois defeitos específicos acima. O teste de menu com baseline e mutante causal passou após o ajuste do sandbox. A nova execução conjunta Arena/syntax está registrada em R1772.

Os 1097 assets ignorados de execução foram hidratados e comparados por hash (R1764), incluindo os viewmodels privados. Um manifesto de áudio antigo foi rejeitado no primeiro preflight; o manifesto atual foi confirmado idêntico nos dois outputs do build publicado R1688 antes da cópia. Nenhum asset privado ou credencial integra o commit.

## Próximos passos concretos

Concluir execução focada atual, checkpoint normal da composição, incorporar o acabamento Campo validado e corrigir/compor o PR1101 (dimensões de prop sólido e rotação de collider/nav). Regenerar documentos/versão oficiais, build, boot e portão normal de publicação. Fazer revisão integral do head publicado e resolver todas as superfícies atuais antes de merge. Backend final, PostgreSQL/WS, ordem de deploy e rollback continuam pendentes. Ego/Game, humano, mobile e MP real ainda não têm aceite desta composição.

## R1790: composição do acabamento Campo

EntradaG `35a9442f86fd22de2e98d1d7190f03217f60e587`, com3814 ancestral, entrou sem conflitos. O Game permanece byteidêntico à composição Arena439da; os cinco módulos de arte/contrato são byteidênticos aos validados emG. O único script alterado foi `eval:map-material-finish`, que adiciona o checker permanente assíncrono de reboco. `check:fast` e o alias Arena permanecem completos. R1789 executou Campo/CVC1 e Arena no mundo combinado e ambos passaram.

Arte aceita somente nos itens/vistas do relatório Campo. O snapshot versionado de tiros mantém comparação exata, com mudança explícita de um miolo e quatro batches; a física continua igual. Ver `CAMPO-ART-CONTINUATION-20261102.md`. Próxima etapa: PR1101 em lane própria, corrigindo dimensões sólidas e rotação real da colisão/navegação, depois composição final e validação de publicação. Ainda sem novo push, release ou aprovação Ego/mobile/humana.

## R1806: composição do SDK

PR1101 entra pelo checkpoint corrigido `f8bf96eae77e843233147b8362975d09f4ca4854`, com o head original `7ed4f61c3a99181359b378046250661ee5b98c21` como ancestral e ownerref intocado. As únicas alterações de Game são os dois sorteios de spawn que agora usam o comprimento real de cada lado, mantendo as correções Arena de facção, os perfis inteiros de mãos/skins, weaponId e resets de mantle. A validação de prop sólido exige dimensões finitas e positivas antes do carregamento. Collider rotado, navegação e spawn usam a mesma orientação; assets ausentes não criam parede fantasma. O relatório SDK registra a prova RED e os limites.

O único conflito textual era o timeout de CI. Foi preservado o teto atual de 30 minutos e recusada a isenção de 40 da entrada: não há neste checkpoint uma execução completa que justifique relaxar a régua. A última execução remota 41411431006 terminou em 21m51s; falhou na fixture de rede já corrigida em J/K, e não por timeout.

R1803 passou syntax, Arena completo, switchteam, fluxo de skins e mutantes, boot JSON e mutante de relevo, preload/binding e timeout. Mapjson recusou corretamente duas instâncias Three: imports estáticos dos instrumentos antigos resolveram a ponte compartilhada antes do resolvedor canônico da base. R1805 muda somente a ordem dos imports de dois instrumentos, preserva o produto byteidêntico e passa o alias inteiro sem aviso, com 110 casos e cinco mutantes semânticos. O aviso continua sendo falha de infraestrutura, nunca aceite de mutante.

Checkpoint local recuperável; ainda requer regeneração oficial de documentação/índice, build, boot de origem, hooks normais, publicação e revisões atuais. Backend pareado, release e QA real continuam incompletos.
