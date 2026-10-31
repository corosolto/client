# Continuidade — entrega de normais de personagens

Missão geral31/10: acompanhar merges/release sem Operação Flávio e elevar consistência visual de mapas, UI, personagens, skins e animação durante10h. Ledger integral no WT consistencia-visual-release-20261031.

Esta branch codex/normais-personagens-20261031 parte de main00e746b5a e entrega somente normais de Caipora, Esquerdomacho, Lampião e Zumbi, cache/frescor e gates. Não depende de merge #1179 ou #1173.

Artefatos detalhados em NORMAIS-PERSONAGENS.md. Os GLBs mudam somente NORMAL; posições, UV, textura, rig, índices e animações preservados, hashes verificados. Crítico independente limpo e72fotos comparativas aceitas localmente no WT de implementação. Vídeo não aprova todo flicker/motion; limite descrito no doc.

Próximo: adaptar dependências Node com shim local ao checkout, rodar gate de normais + mutantes e pre-push obrigatório; abrir PR e aguardar revisão no SHA atual antes de merge/release. Arquivos privados de referência e auditoria não entram no Git.
