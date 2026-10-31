# Continuidade — entrega de normais de personagens

Missão geral31/10: acompanhar merges/release sem Operação Flávio e elevar consistência visual de mapas, UI, personagens, skins e animação durante10h. Ledger integral no WT consistencia-visual-release-20261031.

Esta branch codex/normais-personagens-20261031 parte de main00e746b5a e entrega somente normais de Caipora, Esquerdomacho, Lampião e Zumbi, cache/frescor e gates. Não depende de merge #1179 ou #1173.

Artefatos detalhados em NORMAIS-PERSONAGENS.md. Os GLBs mudam somente NORMAL; posições, UV, textura, rig, índices e animações preservados, hashes verificados. Crítico independente limpo e72fotos comparativas aceitas localmente no WT de implementação. Vídeo não aprova todo flicker/motion; limite descrito no doc.

Próximo: adaptar dependências Node com shim local ao checkout, rodar gate de normais + mutantes e pre-push obrigatório; abrir PR e aguardar revisão no SHA atual antes de merge/release. Arquivos privados de referência e auditoria não entram no Git.


### 13:43 UTC — entrega isolada validada

- Root e crítico independente confirmaram8/8GLBs/tools/ref idênticos à implementação já revista. JSON/tamanho e bytes fora deNORMAL preservados. Package da main preservado salvo2entradas equalitynosgates.
- Quality público4/4GREEN; originaisREDpeloNORMALcompleto; weldrecusaorigemjáalterada. CríticoCLEANfocal em2e8154d2e, relatórioCRITICO-NORMAIS-DELIVERY-R1.md SHAa1932b88da300eeee71052ee221e436e6966a5e165466db48b6114fffc2f0b99 no auditroot da missão.
- Próximo concreto: pushnormalcomprepushobrigatório, abrir PR próprio e conferir review/checks doSHApublicado. Nenhummerge/releasefeito nesta lane.
