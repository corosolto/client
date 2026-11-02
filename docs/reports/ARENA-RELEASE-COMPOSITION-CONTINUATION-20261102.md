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
