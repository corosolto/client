# Partição offline por faces registradas

Esta ferramenta transforma uma seleção **humana já identificada** em duas malhas
estáticas. Não identifica partes, não gera arte, rig ou animação, não normaliza
escala e não ativa assets no Game. Node puro, sem pacote, build, rede ou CDN novo.

```sh
node tools/character-kit/mesh-parts-cli.mjs INPUT.glb SELECTION.json /real/parent/NEWOUT
node --test tools/character-kit/mesh-parts.test.mjs
```

`NEWOUT` deve ser inexistente, com todos os ancestrais existentes e sem symlinks.
O comando cria exclusivamente `parts.glb` e `correspondence.json`; recusa arquivos,
pastas existentes e symlinks pendentes. Erros retornam código 1. Trabalhe com
arquivos estáveis: a ferramenta não é sandbox contra alterações concorrentes.
Uma falha de escrita pode deixar a pasta parcial; preserve-a e escolha outra.

## Contrato de seleção

```json
{
  "schema": "cs-mesh-part-selection/1",
  "sourceSha256": "SHA256_HEXADECIMAL_MINUSCULO_DO_GLB_INTEIRO",
  "partName": "piece",
  "sourceFaceIDs": [1, 3]
}
```

Esses são todos os campos obrigatórios; campos desconhecidos e chaves JSON
repetidas (inclusive escapes equivalentes) são recusados. O digest precisa
corresponder aos bytes de entrada. Os IDs são índices base zero dos triângulos
na sequência original de índices: **não são semântica nem nomes persistentes**.
Trocar qualquer byte do GLB exige nova seleção registrada para aquele hash.

IDs devem ser inteiros, estritamente crescentes, únicos e no domínio da fonte.
A seleção deve ser não vazia e deixar ao menos uma face no corpo. Não há sort ou
deduplicação silenciosa. `partName` segue `[a-z][a-z0-9-]{0,79}`, não pode ser
`body` nem colidir com nome original de nó/malha. `body` também é reservado.

A API `splitMeshParts(Buffer, selection) -> {bytes, report}` não escreve arquivos.
`parseMeshPartsJSON(text)` é o leitor estrito compartilhado pelo container/CLI;
`sha256` e o leitor limitado de manifesto vêm de `kit.mjs`. O leitor legado é
precedido pela verificação estrita, porque nesta base não detecta duplicatas.

## Preservação e limites

Suporte deliberado: uma cena, um nó raiz com uma malha, uma primitive indexada
TRIANGLES, estática e BIN embutido. Índices UBYTE/USHORT/UINT; POSITION float VEC3,
NORMAL/TANGENT float, UV e COLOR float ou unsigned normalizado. Offsets, stride,
domínio, contagens, valores finitos, bounds declarados e referências de recursos
são verificados. O stride efetivo de cada atributo de vértice deve ser múltiplo de
quatro, inclusive sem `byteStride` explícito. Layouts compactados de UV/COLOR que
não atendem esse alinhamento são recusados; a ferramenta não acrescenta padding
nem reescreve o BIN. Todas as views/accessors são verificadas, inclusive as inativas.
O limite de trabalho agregado de escalares é proteção de memória/CPU, como os
limites de leitura de 256 MiB GLB e 1 MiB seleção; não são budgets artísticos.

A raiz conserva exatamente matrix ou TRS, nome e extras; perde somente `mesh`
e ganha dois filhos identity: `body` e a parte nomeada. Nenhuma transformação é
assada nos vértices. O BIN original inteiro, incluindo padding, fica como prefixo
intacto; dois buffers de índices e accessors são acrescentados. Atributos,
vértices compartilhados, costuras UV, winding, materiais, imagens, texturas e
samplers conservam bytes/metadados. Não cria vértices, tampas ou retopologia.
Os accessors antigos permanecem, inclusive o índice original agora inativo.

Body é complemento exato da seleção; cada face fonte aparece uma vez. O relatório
mapeia cada face de saída ao sourceFaceID e registra hashes, transformação,
prefixo BIN e contagens. A ordem dentro de cada parte é preservada. A ordem global
pode mudar ao agrupar body antes da parte: `globalFaceOrderPreserved` é calculado,
não prometido. A saída tem duas malhas/primitives. O relatório nominal registra draw calls
1→2; não é `renderer.info` medido nem medição de FPS.
Transparência, ordenação entre superfícies e costuras precisam de revisão visual.

Recusados: grafos adicionais/ambíguos, children na fonte, skins, animações, morphs,
sparse, Draco, meshopt, quantização, dados externos/data URI e extensões estruturais.
A única extensão permitida é `EXT_texture_webp`, declarada no topo e apenas nas
texturas; seus recursos embutidos são preservados sem decodificar imagem.
Campos estruturais fora do subconjunto documentado são recusados; `extras` é
metadado opaco. A ferramenta não substitui o validador glTF Khronos completo.

Toda saída mantém `visualApproved` e `runtimeEnabled` falsos. Integridade CPU não
aprova seleção semântica, pixels/PBR, licença, fit, contato, recarga ou desempenho.
Fixtures dos testes são sintéticas; nenhum asset artístico é distribuído aqui.
