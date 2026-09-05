# Prompts para frentes paralelas de preparação

Pedido de Ruben em 06/09/2026: preparar prompts para outras tarefas, para acelerar
o arsenal enquanto a tarefa integradora fecha continuidade e proporção faca/pistola.
Este documento não cria tarefas, não inicia agentes e não muda o portão de produção.

## Divisão e limite

`AGENTS.md` exige um responsável pelo sistema arma/mão/animação/câmera/HUD e um
único navegador. `VIEWMODEL-1P-PROFISSIONAL.md` exige pilotos sequenciais. Portanto,
as frentes abaixo fazem **pré-produção offline**, não implementações concorrentes.
Elas entregam diagnóstico medido e especificação executável por família; a integradora
produz e valida no Game, na ordem do contrato. A autorização para preparar prompts
não é autorização para mudar esse contrato ou promover famílias ainda não aprovadas.

| Frente | Worktree exclusivo | Responsabilidade exclusiva | Entrega |
|---|---|---|---|
| Integradora atual | `vm-astra-pistol` | faca/pistola, identidade por time, escala, runtime e browser | candidato revisado e integração sequencial |
| AWP | `vm-prep-awp` | inspeção do asset e mecânica do piloto sniper | `docs/reports/VM-PREP-AWP.md` |
| Escopeta | `vm-prep-shotgun` | inspeção do asset e mecânica da bomba/recarga | `docs/reports/VM-PREP-SHOTGUN.md` |
| Armas curtas | `vm-prep-armas-curtas` | inspeção separada da Deagle e do revólver .38 | `docs/reports/VM-PREP-ARMAS-CURTAS.md` |
| Rifles | `vm-prep-rifles` | M4, MD97, carabina, SCAR, FAMAS e M92 | `docs/reports/VM-PREP-RIFLES.md` |
| Snipers e precisão restantes | `vm-prep-precisao` | Mosin, SVD e SKS; exclui AWP | `docs/reports/VM-PREP-PRECISAO.md` |

Ruben reforçou em 06/09 que cada tarefa deve ter seu próprio worktree e pediu
incluir rifles e snipers. AWP continua exclusiva do piloto; não duplicar esse
trabalho na frente de precisão. A classificação da fila não implica que SKS
seja mecanicamente uma sniper. As branches seguem `codex/<nome-do-worktree>`.
Os destinos acima são especificações, não comprovantes de tarefas criadas.

O restante do catálogo continua em `VIEWMODEL-INVENTARIO.md`; não está descartado
nem declarado pronto. Não restaurar armas removidas pelo dono. Os estados da tabela
são histórico, não evidência atual: cada frente verifica seus insumos.

## Instruções comuns — ler junto do prompt escolhido

Responda em português. Leia integralmente `AGENTS.md`, as skills aplicáveis,
`docs/LICOES.md`, `docs/development/VIEWMODEL-1P-PROFISSIONAL.md` e os ledgers
`docs/reports/VIEWMODEL-SERIES-HANDOFF.md` e `VIEWMODEL-INVENTARIO.md` antes de atuar.
Este último par, na tarefa integradora, é a autoridade viva sobre progresso.

Fonte integradora, **somente leitura para estas frentes**:
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-astra-pistol`.
Checkpoint conhecido da base técnica: `961c70d2`, branch `codex/vm-astra-pistol`.
Confirme que o commit resolve nesse repositório. Não use o `main` antigo como base.
As mudanças de acabamento v4 ainda não commitadas na integradora não pertencem
às frentes novas e não devem ser copiadas ou promovidas por elas.

Cada prompt define um worktree e branch exclusivos abaixo de
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/`. Antes de escrever,
confira `git worktree list`, branch, HEAD e status. Se ainda não existirem,
crie o worktree e sua branch a partir do checkpoint acima. A criação altera só
metadados Git necessários, não o checkout integrador. Se o destino já existir,
verifique identidade e trabalho existente; não faça reset, checkout destrutivo,
limpeza ou reutilização de uma tarefa alheia. Não trabalhe em primary/Fable/retarget.

Worktree separado não isola um destino de symlink. Antes de qualquer saída,
confira o caminho real dos diretórios de artefatos, dos assets privados e de
`node_modules`. Insumos compartilhados são somente leitura; não grave através
de symlinks em outra lane. Se uma ferramenta exigir uma cópia editável, faça
uma cópia local explícita apenas do insumo necessário, sem sobrescrever origem,
após confirmar espaço e licença. Dependências existentes podem ser lidas, não
reinstaladas ou alteradas através de um symlink compartilhado.

Faixa de escrita de cada frente: seu relatório, scripts novos com prefixo exclusivo
em `tools/viewmodels/prep/` e artefatos em `artifacts/viewmodels/prep/<frente>/`.
**Não editar** `game.js`, `authoredvm.js`, `meleevm.js`, `vmhands.js`, `vmconfig.js`,
materiais/atlas compartilhados, fontes do asset, GLBs servidos, câmera/HUD, scripts
existentes ou ledgers globais. Propostas de alteração nesses lugares vão no relatório,
por símbolo e motivo. Nenhum `ready:true`, promoção de asset ou novo renderer.

Inspecione os GLBs existentes sem modificá-los. Quando um insumo ignorado não
estiver no worktree novo, leia o caminho explícito na integradora como fonte
somente leitura e registre SHA-256; gere saídas apenas no seu worktree. Nunca
execute builders com `privateRoot` compartilhado padrão. Não inclua assets pagos,
malhas privadas, dumps grandes, tokens ou credenciais no Git ou no prompt.

Blender CLI está disponível em `/Applications/Blender.app/Contents/MacOS/Blender`.
Use processo isolado `--background`, após ler a skill aplicável; não altere a sessão
interativa do Ruben. Limite inspeções offline a baixa carga; não inicie render batch
pesado concorrente. Não abra browser, Playwright, dev server ou testes que iniciem
navegador. Não mate processos de outras tarefas. Para Node use
`export PATH=/opt/homebrew/bin:$PATH`; verifique dependências antes de instalar algo.
MCP é opcional, não um pré-requisito da entrega; não instalar se a CLI bastar.

A identidade das mãos é por time e vem do trabalho integrador. Não desenhe luvas
alternativas por arma. Documente compatibilidade de UV/material/rig e o que ainda
depende do acabamento central. Preserve AK golden e pistola yaw 15°; testes verdes
não equivalem a aprovação visual, contato 3D ou aprovação do dono.

Cada relatório deve conter: objetivo/definição de pronto desta preparação, commit
de entrada, caminhos e hashes dos insumos, medições reproduzíveis, defeitos versus
hipóteses, mecânica necessária, proposta mínima por símbolo, plano de validação
Blender→GLB→Game em 3:2/16:9, dependências, artefatos e próximo comando concreto.
Não substitua investigação por um plano genérico. Não invente dimensões, clipes,
licenças ou medições. Asset ausente é bloqueio explícito, não permissão de compra.
Referências externas, se necessárias, só informam a análise; não copie assets de
outros jogos. Use fontes primárias e registre procedência.

Faça checkpoint apenas do seu relatório e scripts próprios conforme a convenção
de commits do projeto (Signed-off-by e Agent verdadeiro). Sem push, merge, deploy,
gastos ou envio automático a outras tarefas. Ao concluir a preparação, entregue
branch, commit, relatório e pendências; pare antes da produção do piloto. A
integradora decide a incorporação, e Ruben mantém a aprovação visual.

## Frente AWP

Prepare o próximo piloto AWP/sniper do CSBrasil, seguindo as instruções comuns
deste documento. Worktree `vm-prep-awp`, branch `codex/vm-prep-awp`, saída de
artefatos `awp`, scripts prefixados `awp-`. O escopo é somente a arma `awp`.

Localize a arma própria, o pacote da família sniper, os builders existentes e a
rota atual de carregamento. Meça unidades, transformações, bounds, rig, câmera
exportada, sockets e biblioteca de ações reais. Separe o que é nativo, legado
e retarget; não trate o caminho retarget bloqueado como solução pronta.

Inspecione peças e eventos necessários: empunhadura, apoio, luneta, ferrolho,
ejeção e recarga conforme o asset real. Identifique contatos da mão forte e
trajetória da mão que opera o ferrolho, incluindo retorno à empunhadura. Leia os
tempos de gameplay sem alterá-los e compare com as durações dos clipes existentes.
Não invente uma recarga que apenas abaixa ou esconde a arma.

Entregue `docs/reports/VM-PREP-AWP.md` com baseline reproduzível, problemas
priorizados e receita de produção específica para o asset. Inclua o plano para
validar comprimento aparente, enquadramento da luneta/ADS e continuidade das luvas,
sem recalibrar agora a câmera comum. A produção e o browser aguardam a integradora.

## Frente Escopeta

Prepare o piloto de escopeta do CSBrasil, seguindo as instruções comuns deste
documento. Worktree `vm-prep-shotgun`, branch `codex/vm-prep-shotgun`, saída de
artefatos `shotgun`, scripts prefixados `shotgun-`. Escopo somente `shotgun`.

Localize arma própria, pacote da família, fontes/builders e carregamento atual.
Meça unidades, transformações, bounds, rig, câmera, sockets e ações existentes.
Verifique se a bomba é peça independente e como a mão de apoio a acompanha:
recuo, extração/ejeção, avanço e retorno devem estar descritos com a geometria real.

Leia no código a recarga e os tempos vigentes: cartucho a cartucho, interrupção,
arma vazia e retomada após disparo, conforme o que estiver implementado. Mapeie
clip, evento mecânico e evento do Game, indicando desencontros sem mudar balanceamento
ou o relógio do jogo. Não assuma que existe clipe de pump só pelo nome da família.

Entregue `docs/reports/VM-PREP-SHOTGUN.md`, com baseline medido e receita específica
de montagem/animação, contatos críticos e testes de ciclo/interrupção. Documente
dependências da mão comum. Não abra produção simultânea com AWP: esse piloto entra
pela integradora depois do portão anterior.

## Frente Armas Curtas

Prepare Deagle e revólver .38 do CSBrasil, seguindo as instruções comuns deste
documento. Worktree `vm-prep-armas-curtas`, branch `codex/vm-prep-armas-curtas`,
saída de artefatos `armas-curtas`, scripts prefixados `curtas-`. Escopo somente
`deagle` e `revolver38`; não alterar a `pistol` aprovada.

Faça inventários separados de fontes, GLBs, rig, unidades, câmera, UV, sockets,
peças e ações. Na Deagle, inspecione slide, carregador, empunhadura/apoio, disparo
e recargas existentes. No .38, inspecione tambor, eixo, ejeção, municiamento e
fechamento conforme a geometria real. Não transplante uma recarga de pistola com
carregador para um revólver, nem assuma que animações de uma arma servem na outra.

Compare as mãos/UV com o contrato central, e os enquadramentos com a referência
da pistola aprovada sem editar essa referência. Leia os tempos do Game e a
disponibilidade dos clipes. Separe reaproveitamento possível, ajuste necessário e
incompatibilidade comprovada.

Entregue `docs/reports/VM-PREP-ARMAS-CURTAS.md` com uma seção por arma: hashes,
medições, defeitos, receita mínima, contatos a validar e ordem sugerida de produção.
Deixe explícito que a implementação dessas armas espera os pilotos obrigatórios;
o resultado desta tarefa é pré-produção executável, não armas certificadas.

## Frente Rifles

Prepare os rifles do CSBrasil, seguindo as instruções comuns deste documento.
Worktree `vm-prep-rifles`, branch `codex/vm-prep-rifles`, saída de artefatos
`rifles`, scripts prefixados `rifles-`. Escopo: `m4`, `md97`, `carbine`, `scar`,
`famas` e `m92`. A AK golden está fora do escopo de escrita, mesmo que M92
compartilhe sua família de configuração. AWP, SVD, SKS, Mosin, LMG e SMGs
não pertencem a esta frente.

Comece pela M4 como caso de inspeção, depois percorra cada arma concretamente.
Confirme a associação arma/família em `public/js/data/vmconfig.js` e o catálogo
em `public/js/weapons.js`; nomes de família não garantem que geometria, contatos
ou recarga possam ser compartilhados. Levante por arma: fonte/licença, GLBs,
hashes, unidades, câmera exportada, rig, UV, sockets, peças e clipes reais.

Inspecione empunhadura, mão de apoio, carregador e sua inserção, ferrolho/alavanca,
ejeção e retorno ao idle. Trate geometrias bullpup e pontos de operação diferentes
conforme o asset observado, sem transplantar gestos de M4 automaticamente. Compare
duração dos clipes e eventos com os tempos do Game sem editar balanceamento.
Verifique no código a possibilidade de reaproveitar o contrato de luvas por time,
mas não altere ou regenere materiais centrais.

Entregue `docs/reports/VM-PREP-RIFLES.md`: matriz por arma de insumo existente,
defeito comprovado, reaproveitamento seguro, adaptação necessária, contato crítico
e próximo passo reproduzível. Inclua uma receita de produção específica para M4
e as diferenças necessárias para cada restante, sem transformar essa inspeção
em produção concorrente. A saída deve permitir ao integrador começar sem repetir
a busca de assets e sem presumir que o `ready` herdado equivale a aprovação.

## Frente Snipers e Precisão

Prepare as armas longas de precisão restantes do CSBrasil, seguindo as instruções
comuns deste documento. Worktree `vm-prep-precisao`, branch `codex/vm-prep-precisao`,
saída de artefatos `precisao`, scripts prefixados `precisao-`. Escopo somente
`mosin`, `svd` e `sks`. AWP tem frente própria: não criar outro piloto nem editar
seus assets. Não tratar todas essas armas como sniper de ferrolho.

Inspecione cada pacote: fontes/licença, GLBs, hashes, escala, transforms, rig,
câmera, UV, sockets, partes móveis e ações. Distinga a operação manual de ferrolho
da Mosin dos mecanismos presentes nos assets de SVD e SKS. Determine a recarga
realmente suportada por cada modelo e pelo Game; não invente pente, carregador
removível, luneta ou clipe que o insumo não tenha.

Meça contatos e limitações observáveis das mãos, incluindo operação de peças e
retorno à empunhadura. Documente o enquadramento de arma longa e mira/luneta quando
existir, sem mexer na câmera comum ou extrapolar dimensões físicas pelo FOV.
Compare os tempos de ações e do Game, marque dados insuficientes e proponha os
frames críticos para a validação futura em Blender e no navegador.

Entregue `docs/reports/VM-PREP-PRECISAO.md` com uma seção por arma, evidências
reproduzíveis e receita mínima de produção. Registre o que pode aproveitar do
piloto AWP depois de aprovado e o que exige solução própria, sem depender de uma
AWP ainda não certificada como se já estivesse pronta. Preserve a identidade de
luva central e deixe a produção/browser para a integradora.
