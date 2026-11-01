# Procedência das luvas em corpos cosméticos

Objetivo: demandar a luva própria quando somente o corpo cosmético está pronto e
recusar todo pacote cuja origem declarada não corresponda ao clone efetivamente
criado. Preservar o corpo e os transientes da correção S1, o cache base válido e
o fallback já criado antes da chegada tardia do cosmético.

Worktree `tp-cosmetic-source-r600-20261101`, branch correspondente com prefixo
`codex/`, base S1 `f3952dbf6a958b7fa79b5638a8a1d62993951030`. Produto estava
intacto em R605, que executou o instrumento inicial com quatro processos frescos e
sete cláusulas em 1,942 s: RED K1/K2/K3/K6/K7, GREEN K4/K5, zero INFRA.
O caso cosmético fez zero pedidos próprios; o preload independente subsequente
entregou um pacote base e o setter anexou duas partes ao Drip. O nascimento com
cache quente também anexou partes incompatíveis. Descriptor ausente ou SHA
divergente não impediram o anexo. O controle base válido e o fallback criado
antes da chegada do cosmético passaram. Game e glbchars eram byte exatos
à base S1 nessa medição. Recibo externo `SKIN-COSMETIC-SOURCE-BASELINE-R605.json`.
Ainda sem mutantes, checkpoint, CI ou revisão integral desta frente.

R617: a primeira implementação passou as sete cláusulas, zero INFRA. hasModel
aceita o cosmético carregado do personagem solicitado. Uma WeakMap registra a
origem do template carregado; o builder captura a origem do template que realmente
escolheu, e o setter conserva essa captura, sem reconsultar o cache cosmético.
O pacote conserva descriptor de fonte com família coerente e SHA completo do
catálogo. O anexo exige caminho e origem correspondentes: SHA esperado completo
no cosmético, revisão esperada de dez dígitos no corpo base. Não há cálculo do SHA
da resposta de rede em produção. Recusa não apaga o pacote base válido.
O Drip permanece sem variante elegível; nenhuma geometria foi exportada.

R551 já demonstrou zero pedidos no caso cosmetic-only Drip. R546 demonstrou
famílias distintas; R560 foi rejeitado por reconsultar o cache e omitir SHA base.
R573 conserva faces candidatas para uma variante própria, ainda sem exportação.
O contrato Root R584 externo orientou a correção; não foi aplicado como patch.

A procedência de runtime deve descrever o template realmente escolhido e o
catálogo esperado. Não equivale a medir o SHA dos bytes da resposta em produção.
Sem aprovação de encaixe, material, arte, inventário/UI, mobile físico ou MP.

A missão completa de mapas/personagens/skins/movimento/AK, PRs e release/backend
permanece ativa. Flávio #1158 excluído; UI/redes sociais depois. O ledger externo
`audits/2026-10-31-visual-consistency/CURRENT-STATE-20261031.json` na raiz agregadora
mantém as outras frentes e owners. Próximo: acrescentar mutantes causais e controles
de caminho/família/SHA cosmético divergentes e fallback por skin inválida ou de
outro personagem. Depois repetir a matriz S1, checks focais e QA visual corrente,
crítica integral independente, checkpoint e publicação normal da camada.

R627/R629/R633: doze cláusulas em oito processos frescos passaram; sete mutantes
causais produziram apenas os failsets esperados, cada qual depois do nominal
completo, zero INFRA. R634 repetiu a matriz S1: nominal39cláusulas e14mutantes
exatos, todos PASS. R639 conferiu os56pacotes base contra os bytes atuais e
assetver: quatro fontes divergentes (Caipora, Canarinho, Zumbi, Esquerdomacho).
A fábrica existente --check também reprova antes de alterar os derivados: seleção
registrada difere do censo determinístico. Não reescrever SHAs à mão; próximo
passo é comprovar a mudança de fonte e reconstruir os quatro derivados necessários.

Ego R635: TaskSpace56 não existe mais; inventário só mostra outros três espaços
do usuário. Não houve takeover, espaço novo ou fallback de browser. QA visual
corrente permanece pendente, sem reaproveitar R559 como prova desta implementação.

R644/R656: a procedência histórica dos quatro corpos foi comprovada e a fábrica
oficial regenerou os derivados. O plano em memória e a escrita coincidiram em
todos os artefatos; três GLBs de luva mudaram somente pelo uso das normais atuais.
Canarinho conserva o pacote idêntico. Os demais derivados base e a primeira pessoa
permanecem byte idênticos. Fábrica --check, quatro testes e alias cosmético completo
passaram em Node22.23.4 depois da regeneração. O checkpoint `f63f62418782f3289e48cd494684d431384bc857`
isola os derivados; `GLOVE-DERIVATIVES-CONTINUATION-20261101.md` guarda o contrato.

O alias novo foi ligado a check:fast/check:deploy após eval:tp-identity; o runner
não interrompe na primeira falha. Revisão integral, focais de CLI/infra e checks
de documentação/arquitetura da versão final continuam pendentes. A pergunta de
recuperação do espaço do Ego está pendente; não houve QA visual nova ou aprovação.

R658: sintaxe, module graph, comentários, fixtures, mutantes anunciados, revisão de
assets, arquitetura e documentação passaram na árvore final. Três CLIs inválidas
saíram2; uma cópia externa do instrumento com fonte de entrada ausente saiu3/INFRA
antes de qualquer SUT ou recibo semântico. Os pacotes base do catálogo agora batem
integralmente com SHA da fonte, revisão e família (incluindo os quatro reparados).
Essas provas não equivalem a hash de resposta de rede nem aprovação de aparência.
Próximo: revisão GLM de código/fronteiras declaradas, Native integral e QA visual.
