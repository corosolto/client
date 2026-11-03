# Captura dos mapas com IDs canônicos

O roteiro antigo de Escadão pedia um ID fora do registro e `resolveMapId` devolvia
Praça dos Poderes. Uma captura podia receber o nome de Escadão mostrando outra
arena. Os cinco roteiros agora usam os IDs atuais, com seus arquivos de fonte
correspondentes. Os capturadores rejeitam mapas desconhecidos antes de abrir o
browser e verificam o ID efetivamente carregado antes da primeira imagem.

As 27 câmeras conservaram posição, alvo, nome e intenção. O capturador de personagem
passou a usar `quebrada` por padrão. Referências de documentação foram atualizadas;
o histórico do layout órfão de Lajes continua no censo de 27/09 e no Git. O comentário
do builder foi reduzido à invariante e ao link para esse histórico.

## Verificação

Recibos privados em `audits/2026-10-31-visual-consistency`, no diretório agregado:

- R1315/R1317: plano anterior saía com sucesso, mas os cinco IDs falhavam contra
  `MAPS`/`resolveMapId` reais; Escadão resolvia para Praça dos Poderes.
- R1319/R1320: plano corrigido, contrato dos cinco mapas e sintaxe passaram;
  os 27 enquadramentos foram comparados ao plano anterior sem mudança.
- R1320: chave antiga reinjetada e seleção desconhecida abortaram com o erro
  específico de ID, antes do browser.
- R1323: gerador oficial e SHA-256 independente concordam no hash
  `95bd38cc965b182c`, com os mesmos 160 caminhos de simulação.

O M1 da régua geral ainda reprova: sua saída mostra só as primeiras 12 ocorrências.
R1324 inventariou outras 133 em 37 arquivos após esta correção, incluindo chamadas
ativas e evidências históricas. Esse restante exige triagem; nenhuma exclusão ampla
ou reescrita de manifests históricos foi feita nesta mudança.

O teste de cache no Node 22 (R1322) não conseguiu subir o servidor a tempo. Não é
PASS; o hash também foi regenerado durante essa tentativa, que não conta como gate
sobre fonte congelada. Capturas de Game, inspeção humana em 3:2, mobile físico e MP
humano continuam pendentes. Este commit não aprova arte nem libera o release.

`docs:check` (R1326) expirou em 150 s; `arch:check` não chegou a executar.
O checkpoint é recuperável, mas esses checks continuam pendentes.
