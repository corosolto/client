# Integração da cadeia de luvas em staging

## Objetivo e estado

Integrar as correções de #1198, #1200, #1201 e #1204 na branch staging real.
A missão completa continua: PRs e release, mapas limpos e acabados, personagens,
skins, animação, armas e ADS. Flávio/#1158 fica excluído; UI/social vêm depois.

Worktree própria `glove-stack-staging-r766-20261101`, branch
`codex/glove-stack-staging-r766-20261101`, base staging
`21cbda10d63152faa1e9e2eed79dd9eaab1954a5`.

Em 01/11 às16:34Z, #1204 foi mesclado na branch de #1201, produzindo
`68f81b314e4087d725b2a1c33b44a49d5c6b68ba`. Essa árvore é exatamente a de
`e1a2b50ac10c8029bc5f40dec081d54cb406d874`, já revisada. #1198, #1200 e #1201
foram fechados sem merge. Os comentários de integração em staging não descreviam
o destino real: staging continuava em21cbda10, com os comportamentos antigos.
R762 conferiu ancestralidade, trees, fonte e eventos via GitHub API. Os branches
foram preservados; esta lane corrige o encaminhamento por um novo PR.

## Conteúdo e evidência preservada

O merge local sem conflitos conserva as duas partes da luva TP e sua recusa
atômica, limpa o desenho repetido do albedo E no layout pistol, corrige a âncora
do mutante assetrev e sincroniza a luva no corpo vivo sem reiniciar animações.
Quinze dos dezesseis arquivos integrados são byte-idênticos ao head68. No
package.json, somente os dois campos do alias `eval:tp-identity` diferem da
staging inicial; são exatamente os valores revisados no head68. O próprio
package conserva as demais alterações de staging.

Os ledgers das quatro camadas conservam baseline, mutantes, focais e limites.
R711 executou oito focais no ponto reempilhado com os mesmos bytes de produto.
R717 passou pelo push normal e seus hooks em898,988s. O CI de #1198 no head7859d32f
passou no run41324550797, incluindo build/agregador e smoke. Os runs cancelados
das outras camadas não recebem crédito de sucesso.

Os quatro formais atuais foram lidos por Root. R756 fez crítica independente
após esses formais: delta integral, unidades alteradas e fronteiras, nenhum novo
achado acionável. Root leu o relatório completo e rebindou40pins mais o relatório,
zero drift. R762 confirmou que o merge68 não acrescenta conteúdo ao head de #1204.
Essas revisões são provas dos SHAs de origem, não um formal no novo PR ou head.

Ego R342 verificou a presença das duas luvas no Game normal em3:2. R559 verificou
a chegada tardia conservando corpo/controller/mixer e avanço do emote no RAF.
As qualificações de captura, inventário, material, fit, dedos, pose, MP e mobile
permanecem nos ledgers de origem. Não há nova aprovação artística nesta integração.

## Próximo passo e limites

Criar checkpoint normal deste merge, executar o push com hooks habilitados,
abrir PR para staging, obter CI e formal do head novo e crítica independente
pós-bot antes do merge ordinário. Qualquer novo achado exige correção e prova
focal. Não usar os fechamentos anteriores como evidência de entrega em staging.

F2/#1207 continua separada e draft. A factory Drip S3 também está em outra lane;
nenhum derivado cosmético, runtime por origem ou asset adicional entra aqui.
Release135/backend e convergência do nó têm provas próprias. Os artefatos de
R756/R762 e da missão vivem em `audits/2026-10-31-visual-consistency` no agregado;
este ledger guarda a continuação recuperável desta branch.
