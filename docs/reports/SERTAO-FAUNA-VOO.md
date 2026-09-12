# Sertão: fauna aérea autoral em avaliação

Pedido de 06/09/2026: preview real do mapa e mais vida local, incluindo calango e aves nordestinas em voo. Este documento cobre apenas a fauna aérea. Implementação: `public/js/map_sertao_fauna.js`; régua: `tools/eval/sertao-fauna-check.mjs`.

## Referências e procedência

Pesquisa consultada em 06/09/2026:

- [Secretaria Municipal de Educação de Curitiba — Asa Branca](https://educacao.curitiba.pr.gov.br/conteudo/asa-branca/12868): identifica *Patagioenas picazuro*, ocorrência no Nordeste e Caatinga, comprimento aproximado de 34 cm e faixa branca superior das asas. Orientou escala pequena, ave de ambiente aberto e contraste branco na asa.
- [IlhaViva / UFRJ — Pomba-asa-branca](https://ilhaviva.eba.ufrj.br/pomba-asa-branca/): distingue a espécie do pombo doméstico e descreve preferência por áreas verdes abertas e rurais. Orientou a passagem pelo perímetro arborizado, sem substituir o pombo de chão existente.
- [Secretaria de Cultura de Jundiaí — Pombão](https://cultura.jundiai.sp.gov.br/festivais-e-programas/passaros-dos-jardins-do-solar/pombao/): confirma identificação da espécie pela faixa branca dorsal em voo.

Nenhuma foto, gravação, textura ou malha desses sites foi baixada ou incorporada. A geometria é código procedural original desta alteração: torso, peito, cabeça/bico, cauda em penas, asa interna e primárias articuladas. Materiais sólidos, sem texturas. Não atribuir o módulo ao Mint nem declarar licença Mint/CC0 para ele. O código segue o licenciamento do repositório. A espécie é uma escolha de referência, não uma reivindicação de reconstrução científica fiel; a revisão visual continua obrigatória.

O acervo existente já possui `calango.glb` e `lagarto_sertao.glb`, ambos Mint, documentados em `public/models/ambient/FONTE.md`. O papagaio existente inclui o poleiro na malha e não foi convertido em ave voadora. A confirmação dos termos dos assets Mint herdados continua independente deste código autoral.

## Integração e orçamento

API: `createSertaoFauna(root, { low, enabled })` retorna `group`, `birds`, `update(dt)`, `reset()`, `dispose()` e `report()`. A composição do mapa deve chamar `update(dt)` uma vez por frame e encadear `reset`/`dispose` no ciclo de vida já existente. `?sertaoFauna=0` e `enabled:false` retiram toda a fauna aérea; `low:true` conserva uma ave.

Snapshot Node de 06/09/2026, reproduzível pela régua: três aves, sete meshes instanciadas, quatro materiais compartilhados, 4.116 triângulos totais, zero texturas, zero sombras e nenhum colisor. O limite de 4.958 triângulos é o custo medido de **um** `public/models/ambient/calango.glb` já presente no Sertão, lido dos accessors glTF. O teto de sete meshes impede crescimento sobre este lote; é orçamento de regressão, não nota visual. O módulo compartilha cada geometria e material entre as aves e as duas asas.

O circuito elíptico fica sempre fora do retângulo jogável `|x|≤30, |z|≤45`, com centros entre 10 e 15 m de altura; é uma margem de segurança de design a conferir na captura, não uma alegação biológica. As asas têm articulação de ombro e ponta e fases próprias. O avanço usa somente a soma de `dt`, sem relógio externo. A régua percorre 90 s, cobrindo uma volta completa, mede matrizes desenhadas e limita saltos a 20 cm por frame de 60 Hz. Essa continuidade reutiliza o critério AM5b de `tools/eval/ambience-check.mjs`. O deslocamento mínimo de 20 m em 45 s separa passagem de ave parada; é requisito de comportamento explícito, não régua estética.

## Régua antes do módulo

Primeira execução com o arquivo ausente: `SF0 FALHA: módulo da fauna aérea ausente`, exit 1. Depois da implementação do módulo: SF1–SF6 verdes. A cláusula SF7 adicionada depois reprovou a integração ainda ausente (`present:false`). Após a composição do integrador, a execução final fechou SF1–SF7 e os sete mutantes isolados. SF7 mediu 0,08370553 m de avanço após `world.update(1/60,1/60)`. Mutantes executados individualmente e aceitos somente quando **exatamente** a cláusula indicada falha:

| Cláusula | O que observa | Mutante isolado |
|---|---|---|
| SF1 | três aves e batches instanciadas realmente visíveis | `sem-fauna` |
| SF2 | transformação da asa primária relativa ao corpo varia | `asas-congeladas` |
| SF3 | posições desenhadas, circuito seguro e contínuo | `voo-no-chao` |
| SF4 | custo, ausência de sombras e superfície não sólida | `sombra-cara` |
| SF5 | redução low e desligamento completo | `low-cheio` |
| SF6 | mesmo resultado em 60/20 Hz, reset e remoção no dispose | `relogio-por-frame` |
| SF7 | builder real entrega faunaFlight e world.update avança a ave | `mundo-parado` |

O mutante de asas congela as matrizes das asas **em relação ao corpo**, mantendo tanto o corpo em voo quanto o metadado `flap` funcionando. Assim a reprovação não depende de confiar na declaração do controlador. O mutante de altura move a matriz da instância desenhada, não apenas o objeto de relatório.

SF2 exige variação matricial acima de 0,1 e angular declarada acima de 0,5 rad para rejeitar asas presas. Esses limites separam claramente a batida autoral atual (~1,36 rad pico a pico) de zero; não substituem medição dos pixels da ave em tela nem aprovação humana.

Comandos:

```sh
node tools/eval/sertao-fauna-check.mjs
node tools/eval/sertao-fauna-check.mjs --mutante=asas-congeladas
node tools/eval/sertao-fauna-check.mjs --mutante=voo-no-chao
node tools/eval/sertao-fauna-check.mjs --mutante=sombra-cara
node tools/eval/sertao-fauna-check.mjs --mutante=low-cheio
node tools/eval/sertao-fauna-check.mjs --mutante=relogio-por-frame
node tools/eval/sertao-fauna-check.mjs --mutante=sem-fauna
node tools/eval/sertao-fauna-check.mjs --mutante=mundo-parado
```

## Pendências explícitas

O módulo não usa o tipo `pigeon` de `FavelaAmbience` nem altera a proibição histórica de pomba estática em `mode:flight`. Não é necessário afrouxar AR5/AM11. O controlador de fauna terrestre e sua ambiência continuam separados.

Faltam captura real 3:2, close de anatomia, sequência em movimento, avaliação de tamanho servido, crítico independente e medição de FPS do mapa integrado. Este documento não aprova o visual antes dessas evidências. A régua visual global `eval:ambience` só cobre Lajes/Córrego/Escadão; esta régua local cobre a composição aérea do Sertão. Na árvore integrada, `eval:sertao`, `eval:velhooeste`, `eval:mapcontrato` e `eval:ambience-registry` passaram. O registro de ambiência conta apenas os animais de `FavelaAmbience`, não os lagartos estáticos nem as aves deste módulo; não usar seu total como censo completo do cenário.

## Calango herdado: triângulo preto removido

A captura `artifacts/sertao-astra/fauna-runtime/calango-jogo.png` mostrou uma forma preta triangular sob o corpo, entre aproximadamente x=727–761/y=447–503 no raster 1536×1024. O albedo extraído do GLB (`calango-texture-0.webp`, na mesma pasta de artefatos) contém uma grande ilha preta; o centro UV da face acusada amostra RGB 24/24/24. Portanto o defeito não dependia de sombra dinâmica nem de um shader novo.

Diagnóstico sobre o original: 4.958 faces; a face ordinal 1118, índices `[1409,1410,1411]`, tem área 0,1571371153 no espaço do asset, 12,39% da área total da malha. A segunda maior mede apenas 0,0091915110. A face atravessa y=-0,33105 a +0,39160, preenchendo o vazio anatômico visto na captura. Cada um dos três índices é usado em uma única face; duas posições têm duplicatas em costuras da malha, portanto “isolado por índices” não implica três posições inéditas. A remoção é justificada pelo triângulo visível e sua área/anatomia, não apenas por conectividade.

`tools/repair-calango-surface.mjs` remove somente essa tríade do accessor de índices. Mantém os offsets dos buffers, atributos, texturas, materiais, nós, escala e pose. A reserva final de seis bytes não utilizada pelo accessor fica zerada. Derivado: 4.957 faces; maior área restante 0,0091915110. Todas as posições/normais/UVs/imagens continuam idênticas byte a byte, hash conjunto `f610f619a79e87f43a0b4860624135812e472d9f2a1880d4511bfba1cf946083`. Fonte/hashes antes e depois estão no FONTE e no registro `calango-sertao`.

Régua criada antes do reparo: `calango-surface-check.mjs`, CS1 vermelha no original (4.958 / área 0,1571371153), CS2 verde. Após reparo: CS1/CS2 verdes; `--mutante=recoloca-triangulo` restaura os índices originais na posição original e acende só CS1; `--mutante=textura-trocada` muda um byte da imagem em memória e acende só CS2. O teto de área é duas vezes a maior face anatômica remanescente medida no original; a folga não permite a face espúria de área 17 vezes maior reaparecer. O total contratado e o hash da sequência restante de índices impedem “resolver” removendo partes do animal. CS2 também preserva o hash da estrutura glTF normalizando apenas a contagem de índices; a comparação direta com o original recuperado do Git confirmou que nenhum outro campo JSON mudou.

Busca de call-sites em `public/js/*.js`: apenas `map_velho_oeste.js` instancia `calangos`. O preload genérico pode carregar esse template em outros mapas, mas nenhum outro builder instancia esse tipo. Não foi feita a substituição visual por `lagarto_sertao.glb`; a identidade e o controlador existentes foram conservados. A nova captura do integrador é obrigatória para confirmar que o triângulo sumiu sem dano visual.

A cláusula CS3 executa o corpo real de `preloadAmbientLife` com um loader observável em Node e verifica que a URL do calango contém os primeiros 12 caracteres do SHA do arquivo atual; as demais espécies continuam usando VERSION. `--mutante=cache-velho` troca o uso de `revision` por VERSION dentro desse corpo e reprova somente CS3. Execução final: CS1–CS3 e os três mutantes isolados verdes. Essa contraprova observa a URL realmente entregue ao loader; não basta a constante existir no fonte.

Khronos glTF Validator no original e no derivado: zero erros, um aviso igual nos dois (`MESH_PRIMITIVE_GENERATED_TANGENT_SPACE`, espaço tangente gerado em runtime). Relatório do derivado: `artifacts/sertao-astra/fauna-runtime/calango-gltf-validation.json`. Nenhuma edição de tangent space foi misturada ao reparo.
