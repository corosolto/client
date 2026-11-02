# Relógio indisponível no protocolo legado

Missão integral ativa: PRs e release, mapas, personagens, skins, movimento 1P/3P e
ADS. Flávio client1158/backend196 fora. Novos fluxos de UI e redes sociais ficam
para a etapa seguinte. Este checkpoint resolve somente a taxa de rede legada.

Lane própria `codex/net-legacy-unavailable-r1700-20261102`, baseada no merge
`43383016667a1456360c6da5a6d04f662eb35546` do #1143. O merge foi feito por outra
execução. A revisão 5733190907 deixou aberto o fio 4439781815:

> Protocolo antigo mede o relógio da drenagem, não a chegada

O transporte chama o medidor com três argumentos. Sem `snapshot.t`, o quarto
argumento inventava chegada a partir de `performance.now()` da drenagem. O cliente
real com transporte simulado recebeu 273 snapshots e publicou 30 Hz no fluxo
contínuo ou 5 Hz no backlog de um único instante (RED R1701). A régua permanente
reproduziu quatro falhas sem alterar o produto (R1709).

O medidor agora publica `null` quando faltam ambos os relógios confiáveis. Limpa
a janela anterior, acompanha o último pacote pelo tempo local e publica zero
somente após a janela de silêncio já existente. Um novo relógio confiável
recomeça a janela. O estado existente de indisponibilidade atende os dois casos,
sem criar outro estado ou estimar chegada pela drenagem.

O cliente real passou nos quatro cenários antes vermelhos, no controle de
30 Hz e 20,80 KB/s e na retomada com a amostra única do piso existente. O cenário
com quarto argumento continua medindo uma fila sintética que preserva a chegada;
seu texto deixa explícita essa diferença do navegador. NR8/NR8b exigem `null` em
todas as leituras, em vez de aceitar uma taxa baixa inventada.

A mutação `chegada-pela-drenagem` restaura o default removido e passa pela mesma
classe NetClient, com o import do medidor mutado ligado a ela. Precisa acender as
duas cláusulas causais exatas; erro de setup, classe de erro diferente ou falha
de um controle positivo não contam como detecção. Substitui a antiga mutação
que perdia a condição causal após remover o fallback. O alias completo
`eval:netrate` passou em R1710, incluindo os controles de relógio congelado.

GLM via OMP auxiliou a autoria. A primeira resposta atingiu o limite e ficou
incompleta; não recebe crédito de conclusão. A resposta menor do checker foi
conferida e corrigida antes de uso: assinatura mutante, import do data URL,
relógio monotônico, controles positivos exatos e classificação das falhas.

Evidências no aggregate `audits/2026-10-31-visual-consistency/`: RED R1701/R1709,
adjudicação R1709 e verde R1710. Não prova rede WAN, browser humano ou produção.
Próximo: integrar este checkpoint no publisher próprio, validar a composição e
obter revisão atual e crítico independente antes do release.
