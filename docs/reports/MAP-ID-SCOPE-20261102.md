# IDs atuais nas ferramentas, provas antigas preservadas

A varredura M1 imprimia só as primeiras 12 ocorrências. Após a correção inicial
dos capturadores, R1324 inventariou outras 133 em 37 arquivos. Foram distinguidos
21 chamadores ativos, uma entrada de poses, nove provas históricas, cinco textos
de comentários e o teste de compatibilidade C1.

Os chamadores ativos passam a pedir IDs canônicos. As chaves relacionadas dos
relatórios e orçamentos acompanham essa troca; valores, fórmulas, limites e falhas
continuam iguais. As dez chaves e quarenta poses de `gl-poses.json` preservaram os
vetores. O caminho da imagem histórica citado no cabeçalho de ambiência foi mantido.
Os rótulos da tabela histórica de oclusão e o trecho literal do log de texel também
foram preservados; não representam execuções novas. Os controles negativos de
mantle continuam usando um mapa diferente de Córrego;
um rename cego teria transformado esse controle em candidato válido.

M1 continua cobrando todas as fontes, capturadores, relatórios e demais evidências.
Apenas as nove provas abaixo saem da busca textual de IDs: são resultados anteriores,
sem alteração de bytes. O contrato de captura atual continua reprovando evidência
sem vínculo com fontes, câmeras e PNGs atuais; este ajuste não a torna aprovada.

| Prova preservada | SHA-256 |
|---|---|
| `tools/eval/asset-evidence/bug56-antes/manifest.json` | `72b3c0ec228e641a6ddf2ba9932d38d6195903f44896913035380fbbbac2b202` |
| `tools/eval/asset-evidence/bug56-depois/manifest.json` | `a551e4f7b815c0b3a4d682afd49e955cd2b53754df2857798d44a721fff7c43d` |
| `tools/eval/asset-evidence/lenda-lanhouse/BROWSER-HANDOFF.md` | `99c40e2e8e69bf13b1d06e9d3f8d71569f1e07f81825972b5ef753ba6bc3aebb` |
| `tools/eval/asset-evidence/lenda-lanhouse/browser-handoff.json` | `374efd03667775dca653cd3d4b5908a82a97c3eea6d5abd98fc9b1fbc20438dc` |
| `tools/eval/asset-evidence/maps/manifest.json` | `e5b3c0fac7e5f9c164da91f5de6dbd5f144c88a2db42f997d019a4708a61b5c2` |
| `tools/eval/asset-evidence/profeta-calcada/game/profeta-calcada-evidence.json` | `6a349fe70bb52df70c9c2bf5b80a9b69797eb2b58047188a5d9de8dc54bd734d` |
| `tools/eval/graffiti_audit.json` | `ffff3dbc2296cbba30d88c31e006c0a815b560a79a33c5ca271d815e59658faa` |
| `tools/eval/mantle_check.json` | `bc52ca952bd936ed1236f656e448f28988d5e8f2081b4e8fbb1cec52c5ad0a8f` |
| `tools/eval/texel_check.json` | `1b628569b38003a14faa6ea8d74bc11ae94649ae0b32d9b4133b2fca927a5c2e` |


O teste C1 pode nomear os aliases que realmente existem em `ALIAS_MAPA`, pois mede
memoização entre nome antigo e atual. Essa permissão vale só naquele arquivo;
um alias inventado ali continua reprovando M1. M2 e M3 mantêm suas exigências de
compatibilidade e prévias. A saída agora informa quantos achados foram omitidos.

Recibos privados no agregado `audits/2026-10-31-visual-consistency`: R1336 é o
rascunho rejeitado em dois pontos; R1339 registra a revisão integral e a correção
antes de aplicar; R1340 conferiu sintaxe dos 21 scripts e R1341 passou nos 42
controles mais dois candidatos válidos e 17 controles adicionais de mantle.
R1343 passou no nominal; as quatro mutações reprovaram somente M1, M2, M3 e M1,
respectivamente. R1344 passou no autoteste de mantle-dt, em docs e em arch; confirmou
as quatro bijeções de limites sem alterar números, nove provas intactas e H95/160.
Nenhuma captura nova, aprovação visual, merge ou release é afirmada aqui.
