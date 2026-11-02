# Continuação da integração de áudio e Piscina

Missão integral ativa: integrar PRs elegíveis e release, melhorar mapas, personagens,
skins, movimentos 1P/3P e ADS conforme PDF, roadmap e Complexo Favela. Flávio
client1158/backend196 fora. UI nova e redes sociais ficam para a etapa seguinte.
Não há aprovação global de arte, mobile, Game humano ou produção neste checkpoint.

Lane própria: `codex/release-base-reconcile-r1619-20261102`. Merge ordinário de
`126299a09be95374047216008ef79c01644a93ad` sobre
`bb447c6b50b44dc8718b07ffd795b90910c79254`. O segundo passou os 112 passos e foi
publicado pelo push normal R1597. Preserva a integração visual ancestral do #1179,
os demais autores e o trabalho Javaporco/itens. Root é o único publisher desta lane.

## Resultados e decisões

O #1145 passou a consumir `jogo`, mas o pacote privado instalado continha `cs`.
O teste com `Sfx` real reproduziu cinco consumidores sem samples (R1622).
A normalização na fronteira de leitura recuperou os cinco com as mesmas URLs
(R1630). A família canônica explícita prevalece, inclusive quando vazia; o objeto
recebido não é mutado. Os consumidores usam somente a família canônica.

Instalação e geração usam a mesma normalização. O gerador privado valida primeiro
todas as referências e os arquivos órfãos. `--check` rejeita o esquema antigo sem
escrever; geração normal migra, e o check seguinte passa (R1641). Os 839 arquivos
de mídia mantiveram seus hashes. Nenhum take, voz ou música foi substituído.
O instalador local acompanha o registro atual de personagens, em vez de congelar
uma cópia de 53 IDs. Gate real `eval:audiofablocal` passou em R1640.

Na Piscina, o adapter traduz somente recibo aceito pelo controlador existente.
Mantém nonce, fontes antes/depois, censo completo, quatro lotes exatos, aplicação
única e falha exclusiva da cláusula de permissão. Falha de setup, interrupção,
resultado parcial ou mutação cega não contam como prova. Os 18 controles de
protocolo e a remoção causal do alias no CI passaram (R1626); o juiz genérico não
foi afrouxado. O alias agora roda no job visual obrigatório.

Após a curadoria global, os antigos controles causais deixaram de gerar as entradas
inválidas: remover deduplicação de um layout já único não cria repetição; cartazes
estrangeiros são removidos antes de testar a faixa. A medição exercita a passada
viva nominal e mutante, reordena o mesmo catálogo real para colocar cartaz permitido
nas vagas manuais e usa duas artes permitidas na prova do seam. Não altera produção,
posição física, tolerância geométrica ou regra editorial. R1645 mediu cinco artes
repetidas e duas sobre a faixa somente nos mutantes, sem atribuir isso ao nominal.

## Evidência e próximo passo

Artefatos externos à árvore pública: `audits/2026-10-31-visual-consistency/` no
aggregate, especialmente `AUDIO-PRIVATE-MIGRATION-R1641.json`,
`RECONCILE-FOCUSED-R1640.json`, `PISCINA-DIRECT-R1645.log`,
`J-PRIVATE-VM-R1644.json` (63 arquivos exatos), `CLIENT-PUSH-R1597.json` e
`CURRENT-STATE-20261031.json`. Logs anteriores vermelhos são preservados.

A medição integrada da Piscina passou em 24,515 s (R1647): nominal, mutante com
quatro lotes pintáveis e tradução pelo driver genérico. Geradores oficiais de
matriz, assets, SIM, docs e arquitetura passaram; SIM atual `8e895517178023ab`.
Os 16 aliases pertinentes passaram em 11,563 s (R1649), incluindo áudio privado,
consumidores, documentação, sintaxe, módulo, cache e wiring. Não é o gate integral
de publicação deste novo merge.

O acabamento Campo de `56ea38711349f8893172c750d3789fe6ba04370e` foi integrado no
merge `36af72ee210ef74c435e26d751bcb6c5e2a031cb`, com SIM `9c50fae39e7e435a`.
Build e oito passadas de boot passaram (R1655/R1657). O push normal R1659 reteve a
publicação: 110/112 aliases passaram. O remoto continua `bb447c6b50b44dc8718b07ffd795b90910c79254`.

O diagnóstico real do retry de luvas mostrou duas instâncias de Three.js: a fixture
resolvia o loader por node_modules compartilhado de outra worktree, enquanto o
arnês usava o vendor desta fonte. A fixture agora usa o mesmo vendor e verifica
identidade de Scene e GLTFLoader. Avisos continuam estritos. No Lajes, a fixture
do fetch de áudio passa a copiar também a CLI de migração e sua dependência real.
O RED integral e o diagnóstico são preservados em R1679/R1680. R1683 passou no
Lajes real e no alias completo de retry, incluindo os oito mutantes causais.
Não houve mudança em public/, avisos filtrados ou relaxamento de assertivas.

Próximo: checkpoint normal, build e boot vinculados ao novo head, push normal com
os 112 aliases, review formal atual e críticos integrais independentes.
Depois repinar o backend para o client publicado e validar o par antes do release.
Continuam abertos os débitos artísticos do Campo, a avaliação dos demais mapas,
personagens e skins, além do QA real pelo Ego e em aparelho mobile.
