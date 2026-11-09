# SOURCES — models/anims/emotes-mocap.glb

Pacote único dos emotes de captura no esqueleto meshy-28 de referência (304768 bytes, 8 clipes). Gerado por `node tools/build-emotes-mocap-pack.mjs --library=<biblioteca>/index.json`; os GLBs intermediários e FBX não são redistribuídos. O jogo baixa o pack no primeiro emote de clipe e reescala só a translação do `Hips` pela altura de quadril de cada corpo.

## Catálogo

| Clipe (= id do emote) | ID do catálogo | Duração | Reprodução (laço do catálogo) | QA de conversão aprovada |
|---|---|---:|---|---|
| capoeira | mixamo/capoeira-pack/capoeira | 3.4333 s | laço | mst, capitao-caveira |
| meia_lua | mixamo/capoeira-pack/meia-lua-de-frente | 2.4667 s | laço | mst, capitao-caveira |
| bencao | mixamo/capoeira-pack/bencao | 1.3667 s | laço | mst, capitao-caveira |
| uprock | mixamo/breakdance-pack/breakdance-uprock | 2.1000 s | laço | mst, capitao-caveira |
| freeze | mixamo/breakdance-pack/breakdance-freeze-var-2 | 4.8667 s | uma vez | mst, capitao-caveira |
| continencia | mixamo/loose/salute | 2.8333 s | laço | mst, capitao-caveira |
| marra | mixamo/gestures-pack-basic/being-cocky | 2.8667 s | laço | mst, capitao-caveira |
| comemoracao | mixamo/gestures-pack-basic/happy-hand-gesture | 2.7333 s | laço | mst, capitao-caveira |

## Licenças

- IDs `mixamo/*`: Adobe Mixamo, uso em jogos e mídia, inclusive comercial; a redistribuição dos FBX brutos não é permitida. https://helpx.adobe.com/mixamo/faq/mixamo-faq.html
- IDs `ual/*`: Quaternius Universal Animation Library, CC0 1.0 Universal. https://creativecommons.org/publicdomain/zero/1.0/

A conversão para meshy-28 preserva `extras.clip.source.id` em cada animação. A mescla reaproveita os nós por nome e elimina cenas duplicadas; o jogo consome `g.animations` e a altura de repouso do nó `Hips` da cena.
