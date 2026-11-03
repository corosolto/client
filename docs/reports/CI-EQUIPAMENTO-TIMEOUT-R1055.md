# Orçamento de CI para equipamento TP (R1055)

A missão completa permanece consistência visual de mapas/personagens/skins/armas/ADS/movimento e integração/release, com Flávio excluído e UI/social depois. Esta continuação muda somente equipamento-tp.timeout-minutes de10 para15 e registra a causa observada; asserções, quatro aliases, ordem e needs são preservados. O reguas-e-site30 já vem do checkpoint R1023 integrado.

R1047 leu logs e annotations reais: S4 run41350473713 job124979380993 e Factory run41350474298 job124979371503 excederam10min. S4 completou identidade416,3s/cosmética130,9s e não terminou os outros dois aliases. Factory imprimiu3/3 em576,3s, mas setup de cerca30s levou o job ao cancelamento. O agregador build falhou corretamente por needs cancelados. Factory também atingiu25min no smoke final de reguas; o limite30 desta composição cobre essa segunda causa sem aceitar CANCELLED como verde.

Quinze minutos é a recomendação mínima prática do diagnóstico para equipamento, dentro do teto comum WT2 de30. A quarta régua S4 ainda exige execução hospedada completa; não há promessa de duração ou resultado verde. Não foi criada isenção, removido passo ou afrouxado agregador.

Validação local: comparação YAML semântica confirma somente o campo10→15. WT2 nominal passou e seus três controles existentes reprovaram nos exits esperados; o controle isencao-estourada atinge o primeiro job decide no arquivo, sem crédito específico de portao. Segurança, ação local, concorrência, checkout e agregador passaram. Uma chamada extra a workflow-secret-check com --self-test foi registrada, mas o script ignora esse flag: sem crédito de self-test. Fonte das réguas permaneceu intacta.

Evidência completa: STACK-CI-CANCEL-R1047-* e CI-EQUIPAMENTO-TIMEOUT-R1055-* no agregado audits/2026-10-31-visual-consistency. Não houve rerun remoto ou mudança de outro checkout. Autoria mecânica deste ajuste: Codex; diagnóstico independente R50. Próximo: publicar normalmente o head final, concluir CI/formal/crítico integral e a sequência DB→API/runtime8→frontend8→JAVA. Game visual/mobile/MP continuam pendentes.
