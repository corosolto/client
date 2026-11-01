# Recorte da luva Drip

`npm run eval:tp-drip-source` verifica o candidato produzido por
`buildRepositoryArtifacts(root, { includeCosmetics: true })`. O modo padrão da
fábrica continua produzindo os mesmos arquivos distribuídos. O opt-in retorna um
Map em memória; não há flag de escrita ou variante cosmética no manifesto público.

A seleção revisada está em
`tools/character-kit/gloves/cosmetic-selections.json`. Ela identifica o arquivo de
corpo aprovado pelo SHA completo e registra as faces explicitamente, separada da
seleção automática das bases. O core reutiliza a extração existente, preservando
vértices distintos, costuras, atributos, pesos e o esqueleto da fonte. A seleção
retira os acessórios somente do derivado. O corpo original permanece intacto.

| Cláusula | Contrato |
|---|---|
| F0 | Variante e GLB presentes no resultado real do opt-in |
| F1 | Origem e seleção correspondem à revisão da fonte |
| F2 | Faces, winding, atributos e bijeção de vértices preservados |
| F3 | Joints, hierarquia, transforms e inverse bind matrices preservados |
| F4 | Default, arquivos distribuídos e cobertura base preservados |
| F5 | Corpo de origem intacto após a execução |

O controlador executa processos novos para dois nominais, sete negativos e um
controle positivo de reindexação. Trocar faces por ring/cuff, omitir o punho,
trocar os lados ou alterar pesos deve reprovar F2. Retirar o nome Curl_R ou alterar
uma IBM deve reprovar F3. A reindexação consistente dos atributos e índices deve
continuar passando. O controle de Curl testa o nome de binding, não uma remoção
topológica. As demais cláusulas precisam conservar o resultado esperado.

O pai confere aplicação, schema, censo, exit e failset. Erro de instrumento,
timeout, saída incompleta, mutação não aplicada ou sobrevivente reprovam o comando;
não recebem crédito como detecção. A fixture e o leitor independente de GLB são
distintos do builder.

O alias integra `check:fast`, `check:deploy` e o job `equipamento-tp` do pr-fast,
junto de `eval:tp-identity` e `eval:tp-cosmetic-source`. O agregador `build` exige
sucesso desse job. A execução separada evita somar esses processos ao job geral
de réguas e site.

Esta prova cobre extração em CPU. O GLTFLoader e a clonagem do projeto também
foram exercitados, e há vistas sólidas em REST no ledger de continuidade. Essas
vistas conservam as facetas da fonte e não demonstram aparência com material,
contato com arma, ausência de z-fighting ou animação no jogo. A seleção e o cache
por origem efetivamente clonada ainda precisam ser integrados ao runtime antes
de distribuir a variante. O aceite visual usa o Game real em 3:2.

Evidências e próximos passos:
`docs/reports/DRIP-GLOVE-ORIGIN-CONTINUATION-20261101.md` e
`docs/reports/TP-DRIP-SOURCE-CONTINUATION-20261101.md`.
