# Origem de luvas e corpos em terceira pessoa

`npm run eval:tp-cosmetic-source` usa Game e GLTFLoader reais em processos CPU
frescos. A textura de imagem é substituída por um texel branco. O teste não mede
aparência, encaixe, raster, UI, persistência, multiplayer ou desempenho mobile.

Um cosmético já carregado deve permitir pedir a luva própria mesmo sem corpo base
no cache. A luva só pode ser anexada se a procedência declarada do pacote coincidir
com a origem capturada do template efetivamente clonado. Essa captura permanece
válida quando outro template chega ao cache. Recusar o pacote no cosmético não
deve contaminar seu uso válido no corpo base.

A origem usa caminho e SHA esperado do catálogo: SHA completo no cosmético e
prefixo de revisão de conteúdo no corpo base. A família declarada da variante deve
coincidir com a família do pacote. Isso não calcula nem atesta o hash dos bytes da
resposta de rede em produção. O pacote base não se torna elegível para o Drip por
compartilhar nomes de ossos. Uma variante própria ainda exige fábrica e aceite.

| Cláusula | Comportamento |
|---|---|
| K1 | Cosmético pronto sem base faz um único pedido próprio |
| K2–K3 | Pacote base divergente é recusado no setter e no nascimento cosmético |
| K4 | Recusa não contamina o mesmo cache no corpo base válido |
| K5 | Clone base já criado conserva sua origem após chegada do cosmético |
| K6–K9 | Fonte ausente, SHA base, caminho ou família divergentes são recusados |
| K10–K11 | Skin de outro personagem ou inexistente conserva fallback base válido |
| K12 | Caminho cosmético correto com SHA esperado divergente é recusado |

O alias integra `check:fast` e `check:deploy`, depois de `eval:tp-identity`, pelo
runner que executa todas as etapas. Ele executa nominal e sete mutantes: `glove-availability`,
`glove-source-bypass`, `glove-origin-live`, `glove-source-path`,
`glove-source-base-sha`, `glove-source-cosmetic-sha`, `glove-source-family`.
Cada modo mutante executa primeiro o nominal completo; somente o conjunto exato
de cláusulas vermelhas esperado recebe crédito. Timeout, erro de importação,
protocolo ou âncora divergentes são INFRA, saída3. Falha semântica sai1.

Fontes de procedência: `public/models/skins/manifest.json`,
`public/data/gloves-manifest.json`, `public/js/data/assetver.js` e os GLBs reais
registrados por tamanho e SHA em cada processo. Não há novo teto visual ou
geométrico. A cronologia e as limitações ficam no ledger
`docs/reports/TP-COSMETIC-SOURCE-CONTINUATION-20261101.md`.
