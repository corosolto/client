# AK e tampa da manga, 30/10/2026

Pedido 5 do prompt dos Javaporcos. A AK cobria a tela com um painel preto.
IBL já passava nos shaders da AK tanto em Javaporcos quanto Praça dos Poderes.
No navegador real, `mangatampa=0` retirou o painel e mostrou arma/mangas corretas.
A manga passa de 5.088 para 5.090 vértices ao fechar duas bocas.

A reprodução isolou a reconstrução dos atributos normalizados em `capSleeveOpenings`.
Os valores decodificados permaneciam corretos na CPU, mas o caminho de renderização
com pós desenhava o painel. Copiar os atributos normalizados como Float32, usando
acessores, elimina o defeito e preserva as duas tampas. Índices de ossos continuam
inteiros; os demais valores existentes não mudam. Não se alterou luz, pose ou asset.
Não atribuir isso a um detalhe específico do driver sem uma reprodução mínima.

Régua: `BASE=http://localhost:4321 PATH=/opt/homebrew/bin:$PATH sh
tools/eval/with-browser-lock.sh npm run eval:akmangagpu` (comando em uma linha).
Ela desenha o frame final real, incluindo pós, e lê a região x22–60%, y35–50%.
A referência sem tampa tinha 181/78.768 pixels escuros (0,23%), contra 100% com o
defeito. Teto 5% acomoda diferenças de cenário e exposição. A régua também exige
AK equipada, manga visível e duas tampas; esconder o braço não pode aprovar.
A máscara direta da vmScene sem pós dava verde mesmo com o defeito no frame final,
por isso ela foi rejeitada como critério. CPU MT8 preserva posições decodificadas;
o teste GPU é necessário para cobrir o caminho que falhava.

Artefatos: `artifacts/javaporcos-codex-20261030/ak/`, incluindo fotos antes,
controle sem tampa, protótipo Float32, scripts de diagnóstico e logs.
Mutantes: `quantizacao-antiga` restaura a reconstrução anterior;
`manga-oculta` tenta esconder a manga. Ambos devem reprovar nos dois mapas. `sem-pos` desliga o pós e reprova por não
medir o pipeline que continha o defeito, mesmo com pixels limpos. A régua exige
`__postPatched` e o vmPass apontando para a cena/câmera reais da arma.
