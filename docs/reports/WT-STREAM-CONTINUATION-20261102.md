# Continuidade: limite do stream WebTransport

A critica GLM13F3 e a leitura independente R1879 identificaram um defeito anterior a esta composicao. No caminho de stream, o cabecalho acima de `MAX_SNAPSHOT_BYTES` causava apenas `break` no loop interno; o loop externo continuava lendo e acumulando bytes. O probe real R1890 confirmou tres leituras sem close nem cancel para um tamanho invalido conhecido no primeiro cabecalho.

Agora o transporte fecha com1009 e `snapshot_too_large`, cancela o reader e retorna ao reconhecer esse cabecalho. A recusa vale antes de esperar o corpo declarado. Uma rejeicao de cancelamento depois do fechamento nao reabre a leitura. Nao altera o tamanho permitido, o protocolo ou a entrega dos quadros validos.

O checker novo executa o metodo real em oito cenarios: quadro inteiro, cabecalho/corpo fragmentados, dois quadros unidos, limite inclusivo, tamanho acima do limite, uint32 maximo, cabecalho invalido fragmentado e cancelamento rejeitado. O mutante restaura o `break` original no fonte importado e falha exatamente os quatro casos de tamanho invalido. O alias entra em check:fast, check:deploy e no job explicito de CI.

Validacao Node22: R1892 nominal e mutante PASS; R1893 syntax4.723s, wflocal0.216s e netcodecbin1.351s PASS; R1894 portaointeiro0.216s PASS. Artefatos em `audits/2026-10-31-visual-consistency/WT-*R189*.{json,log}` no volume do projeto.

O probe R1890 tambem registrou uma mutacao de visibilidade do metodo throwUtility isolado. Isso nao prova defeito visual: o caller real Game restaura o mount no mesmo tick quando o metodo retorna false. Essa hipotese foi refutada e nao motivou mudanca.

Ainda faltam integracao, review do delta e gates/publicacao atuais da composicao; nenhum aceite visual, Ego, mobile, MP ou release decorre destes checks de enquadramento.


Revisao R1905/R1908: argumentos desconhecidos do checker agora retornam 2 com uso, separados do RED semantico 1. A chave de motivo do alias foi acrescentada. O probe real antes da correcao retornou 1 com AssertionError; depois deve retornar 2 sem stack. Nao foi comprovada a hipotese de falha em docs:check por motivo ausente; a geracao de SCRIPTS.md vive fora deste checkout.

Revisao independente R1879: o deadline do worker tp-glove-origin chamava process.exit(3) antes do finally e deixava a propria pasta temporaria de mutante. R1908 executou o callback registrado extraido do fonte, com filesystem real e diretorio sintetico proprio, e comprovou a sobra antes do conserto. O callback agora remove somente tmp e preserva a saida INFRA 3 em finally. A prova nao representa um worker completo nem conta timeout como deteccao semantica. Validacao apos a correcao e gates completos ainda pendentes neste checkpoint de trabalho.

R1908 AFTER PASS: deadline exit3 sem sobra de tmp; CLI desconhecida exit2 sem stack. R1909 framing nominal+causal0.198s e docs:check0.834s PASS. R1910 Game/GLTF CPU real nominal5.396s e causal origin-key-char9.140s PASS, sem modificar failset ou prazo. Sao verificacoes tecnicas limitadas, sem aceite visual.
