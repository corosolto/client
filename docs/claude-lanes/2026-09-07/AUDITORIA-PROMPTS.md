# Auditoria somente leitura — lacunas dos prompts Claude/GLM

Data da observação: 2026-09-07 (Europe/Lisbon)

Escopo lido:

- `worktrees/claude-lane-prompts/docs/claude-lanes/*.md` (20 arquivos: 19 prompts/overlays + README);
- ledgers/handoffs de raiz: `GAME-CONSOLIDATION-LEDGER.md`, `WORKSPACE-CONTINUITY.md`, `HANDOFF-VM-CS16.md` e `worktrees/VIEWMODEL-LANES-LIVE.md`;
- branches, HEADs, estados locais, relatórios de cada lane referenciada;
- estado atual dos PRs de `corosolto/client` via GitHub CLI.

Nenhum arquivo do repositório foi alterado.

## Resumo executivo

O pacote de prompts não é um inventário atual de todas as frentes abertas. Ele é um retrato de uma rodada anterior e mistura:

1. prompts ainda executáveis;
2. prompts de implementação já cumpridos, cujo próximo passo é revisão humana/CI/merge;
3. prompts de PRs já mesclados;
4. prompts de preparação/candidato que receberam depois uma sobreposição de escopo final;
5. PRs e lanes conhecidas sem prompt próprio.

Só `VIEWMODEL-ZCODE-M4.md` corresponde diretamente a uma frente produzindo agora. `VIEWMODEL-ZCODE-PRECISAO.md` aponta para branch/HEAD atuais e deve ficar em espera pela M4, mas contém uma contradição sobre editar runtime. AWP, shotgun e curtas têm escopo final, porém HEADs congelados errados. O prompt de integração final ainda cobre apenas M4 e Precisão e ficou incompatível com a ampliação posterior para AWP, shotgun e curtas.

## Inventário dos prompts existentes

### Viewmodels

| Arquivo | Situação observada | Julgamento |
| --- | --- | --- |
| `VIEWMODEL-ZCODE-CORRECAO-FINAL.md` | Sobreposição posterior que exige arma final, mãos, ações, ADS e integração local em cada lane. | Atual como regra, mas não é prompt autônomo. Deve ser incorporada ao texto de cada tarefa para evitar dependência frágil entre arquivos. |
| `VIEWMODEL-ZCODE-M4.md` | Lane `vm-prep-rifles`, branch `codex/vm-prep-rifles`, HEAD esperado e atual `f63e730f`; há 4 scripts `rifles-m4-reload-final-*` não rastreados e o monitor marca “produzindo”. | Prompt atual/ativo. Pode continuar porque manda preservar divergência, mas o handoff para outro agente deve citar explicitamente os 4 arquivos locais. PR correto: #509. |
| `VIEWMODEL-ZCODE-PRECISAO.md` | Lane limpa em `a988d72b`, igual ao prompt; PR #513 aberto/draft. Deve esperar a M4. | Quase atual, porém internamente contraditório: proíbe editar “runtime” e depois exige integrar as três armas na rota autorada da branch. Corrigir para “runtime compartilhado/de outras famílias” antes de entregar. |
| `VIEWMODEL-ZCODE-AWP.md` | Lane limpa em `d35c6658`, sem upstream remoto e sem PR. O prompt exige HEAD `961c70d2`. | Escopo final correto após overlay, mas metadados desatualizados. Não executar literalmente sem trocar HEAD, registrar que a branch ainda não foi publicada e escolher base técnica do futuro PR. |
| `VIEWMODEL-ZCODE-SHOTGUN.md` | Lane limpa em `d35c6658`, sem upstream remoto e sem PR. O prompt exige HEAD `961c70d2`. | Mesmo problema da AWP. O README ainda a chama de “candidata offline”, embora o corpo exija entrega final. |
| `VIEWMODEL-ZCODE-CURTAS.md` | Lane limpa em `d35c6658`, sem upstream remoto e sem PR. O prompt exige HEAD `961c70d2`. | Escopo misto: introdução/entrega exigem Deagle e .38 finais e integradas, mas o meio ainda diz “Produza candidatas offline separadas”. Precisa texto único de produção final, HEAD atual e base do PR. |
| `VIEWMODEL-ZCODE-INTEGRACAO.md` | Diz esperar M4/Precisão “produzindo candidatos” e integra apenas controles + M4 + Mosin/SVD/SKS. | Desatualizado. Precisa esperar cinco lanes de produção e integrar também AWP, shotgun, Deagle e .38. Deve resolver como tratar PRs históricos #464/#468 e o PR de evidência #534, não apenas dizer para não usá-los como base. |
| `VIEWMODELS-1P.md` | Prompt Claude anterior: M4 + Precisão como candidatas offline, proíbe entrada em runtime antes de aprovação e deixa pistolas/faca/AWP fora. Manda ler PR #534 a partir da lane de rifles, enquanto a lane de rifles está no PR #509 e #534 pertence à lane de evidência. | Supersedido pela série ZCode + correção final. Não deve ser distribuído como tarefa atual. Pode ficar apenas como histórico ou ser reescrito como prompt de auditoria final. |

Falhas transversais do bloco de viewmodels:

- O README ainda descreve AWP e shotgun como candidatas offline e a integração como posterior a “dois checkpoints”, contradizendo a correção final posterior.
- AWP, shotgun e curtas nasceram de `d35c6658`, não de `961c70d2`; as três branches não têm ref remota nem PR.
- O prompt final de integração omite três lanes agora obrigatórias.
- A lane de M4 possui trabalho local ainda não commitado. Transferir apenas branch/PR perde os 4 scripts.
- Os ledgers `WORKSPACE-CONTINUITY.md` (01/09), `HANDOFF-VM-CS16.md` (31/08) e partes de `GAME-CONSOLIDATION-LEDGER.md` (04/09) são históricos; o retrato atual das cinco lanes é `worktrees/VIEWMODEL-LANES-LIVE.md`.

### Mapas, combate, áudio e personagens

| Arquivo | Estado real atual | Julgamento |
| --- | --- | --- |
| `AMAZONIA-8X8.md` | PR #527 foi mesclado em 06/09; branch tem validação pós-merge em `8fbd1358`. | Obsoleto como tarefa aberta. Se houver trabalho novo, precisa novo relato/bug e nova lane. |
| `AWP-PENETRACAO.md` | PR #535 foi mesclado em 06/09. | Obsoleto como implementação/auditoria de PR aberto. Pode virar prompt separado para paridade no servidor multiplayer, que o relatório ainda marca como limite de release. |
| `COMBATE-HEADSHOT-ABATES-FACA.md` | A implementação foi concluída, PR #536 foi mesclado; handoff fecha réguas e mutantes. | Obsoleto. O único restante documentado era observação visual/manual, não repetir implementação. |
| `SERTAO-CASAS-POR-DO-SOL.md` | O follow-up de 07/09 foi implementado: colisão da carroça, duas casas dos spawns, contratos e mutantes; HEAD limpo `58923044`, PR #526 aberto. | Prompt cumprido. Novo prompt deve ser de revisão do PR/aceite humano, sem refazer BUG-91. |
| `ESCADAO-JANELAS-ABRIGO.md` | O follow-up de 07/09 foi implementado: shell procedural autoritativo, janela, piso, entradas e mutantes; HEAD `6412880a`, PR #529 aberto. Há `tools/eval/asset-evidence/maps/` não rastreado. | Prompt cumprido tecnicamente e desatualizado para retomada. Novo prompt deve preservar/classificar o artefato local, regenerar grafite quando autorizado e fazer revisão real 3:2/partida. |
| `CAMPINHO-COBERTURA.md` | Implementação e reverificação concluídas, gates de deploy 37/37, HEAD limpo `73dfc45b`, PR #530 aberto. | Prompt cumprido. Restam revisão humana WebGL/partida, decisão sobre placar decorativo e merge/release. |
| `JOA-MANSAO.md` | Os dois defeitos citados no “estado a retomar” já foram corrigidos; suíte Mansão, build e verificação local final passaram; HEAD limpo `640da258`, PR #533 aberto. | Desatualizado. Próximo prompt deve revisar visual/partida real e as falhas herdadas, não implementar novamente CTF por camada/vãos. |
| `MITICOS-LOBISOMEM.md` | Retratos com alpha já foram resolvidos/restaurados em `adef1692`. A lane tem 27 arquivos rastreados modificados + 2 não rastreados, incluindo todos os clipes do Lobisomem, retarget e novos verificadores; PR #532 aberto. | Estado de retomada desatualizado e perigoso. Precisa prompt de continuação que preserve o diff atual, audite ciclos completos/contato/inflação e checkpointe antes de regenerar qualquer GLB. |
| `AUDIO-FUNKEIROS-URBANAS.md` | A busca posterior encontrou fontes v7/v8 fora do Git; HEAD local `7b2b0e4b` está 1 commit à frente do remoto; PR #531 aberto. A decisão pendente é do dono: v7 sem IA ou v8 com Fish TTS; nada foi ouvido. | Desatualizado. Não mandar “localizar fontes” de novo. Próximo prompt só pode avançar depois da escolha v7/v8 e deve começar por push do relatório local/preservação dos hashes. |
| `MAPAS-LEGADOS.md` | O inventário medido pedido foi concluído em `ce16872d`; PR #538 está draft. | Escopo desta rodada concluído. É prompt de inventário, não de produção final. Falta escolher o primeiro mapa e criar prompt específico de implementação. O quality brief antigo sugere direção Carandiru, enquanto o status medido recomenda manter penitenciária genérica; não distribuir sem reconciliar. |
| `LAJES.md` | O prompt aponta `codex/lajes-performance`, mas a worktree está em `docs/lajes-bug141-estado`, PR #539. O PR de desempenho #517 já foi mesclado. A árvore tem `tools/eval/asset-evidence/maps/` não rastreado. | Desatualizado e aponta a branch errada. A frente aberta atual é apenas reconciliação documental do BUG-141/PR #539, mais classificação do artefato local; não uma nova rodada de desempenho/passagens. |

## Frentes/PRs abertos sem prompt atual próprio

Lista baseada no estado aberto do GitHub em 07/09. “Sem prompt” inclui casos em que há menção incidental, mas nenhuma tarefa que conduza o PR ao próximo estado.

| PR / frente | Branch | Lacuna |
| --- | --- | --- |
| #464 — pipeline AAA de viewmodels pagos | `feat/fps-paid-viewmodels-aaa` | Sem prompt próprio; integração só o cita como base histórica a evitar. O ledger já o classifica como fonte para extração seletiva, não merge direto. Falta prompt de decisão/extração/encerramento do PR. |
| #467 — Córrego rota baixa | `fix/corrego-rota-baixa` | Nenhum prompt no pacote. |
| #468 — âncora CS 1.6 / 14 famílias | `vm-cs16-gabarito` | Sem prompt atual. `HANDOFF-VM-CS16.md` é de 31/08 e cita checkout `/tmp` antigo; integração só diz não usar como base. Falta prompt de auditoria seletiva e decisão de destino do PR. |
| #486 — vozes Míticas ElevenLabs | `feat/vozes-miticos-elevenlabs` | Nenhum prompt. É distinta do rollback F/U. |
| #496 — mobile/WebView | `feat/mobile-app-ui` | Nenhum prompt. |
| #528 — bloqueio de recuperação do Lobisomem | `claude/miticos-lobisomem-scoped` | Nenhum prompt de reconciliação com #532. Provável PR documental supersedido; precisa decidir atualizar/fechar, sem duplicar a implementação da lane #532. |
| #534 — diagnóstico/bloqueio da recarga M4 | `codex/vm-m4-reload-evidence` | Só é fonte somente leitura no prompt M4. Falta prompt de resolução do PR após a M4 final: incorporar documentação útil, atualizar ou fechar como supersedido. A worktree está 1 commit local à frente e tem 3 itens locais. |
| #537 — pacote de prompts | `codex/claude-lane-prompts` | É o próprio pacote auditado; falta atualizar o índice/estados antes de usá-lo como fonte de transferência. |
| #538 — inventário dos mapas legados | `claude/mapas-legado-qualidade` | Tem prompt, mas ele já foi cumprido e só entrega inventário. Falta prompt de revisão do draft e prompt separado do primeiro mapa escolhido. |
| #539 — estado do BUG-141/Lajes | `docs/lajes-bug141-estado` | O arquivo `LAJES.md` aponta outra branch e outro objetivo; efetivamente não há prompt atual para #539. |

PRs abertos cobertos por prompt, porém com prompt em estágio antigo: #526, #529, #530, #531, #532 e #533. PRs #509 e #513 têm os prompts mais próximos do estado atual; #509 está em produção e #513 deve esperar.

## Lanes conhecidas nos ledgers sem prompt dedicado

O ledger de 04/09 ainda registra frentes que não aparecem no pacote `docs/claude-lanes`:

- `admin-retention` / `claude/admin-retention-truth`: implementação candidata aguardando validação com dados reais autenticados;
- `audio-fab-pilot` / `claude/audio-fab-pilot`: código e inventário prontos, sem escuta A/B e sem canal de incorporação decidido;
- `vm-fable51-pistol` / `claude/vm-fable51-pistol`: candidato técnico sem aprovação visual e sem PR;
- limpeza/consolidação de checkouts e arquivo externo: tarefa operacional ainda aberta no `GAME-CONSOLIDATION-LEDGER.md`;
- multiplayer e telemetria aparecem nos handoffs genéricos, mas o ledger indica que partes já foram publicadas/validadas; exigem auditoria atual antes de gerar um prompt, não cópia do texto histórico.

Essas frentes podem estar fora do recorte “client PRs”, mas são conhecidas como pendentes pelos ledgers e precisam constar do inventário mestre para o usuário decidir se também vai transferi-las.

## Ordem segura para refazer o pacote

1. Congelar o retrato atual por lane: caminho, branch, HEAD, dirty files, upstream e PR.
2. Separar `EXECUTAR AGORA`, `AGUARDAR DEPENDÊNCIA`, `REVISAR PR`, `AGUARDAR DECISÃO HUMANA`, `MESCLADO/ENCERRAR`.
3. Transferir agora somente a continuação M4, preservando os 4 scripts locais.
4. Manter Precisão bloqueada até o checkpoint da M4 e corrigir a contradição de runtime.
5. Atualizar AWP/shotgun/curtas para `d35c6658`, base técnica explícita e criação de upstream/PR.
6. Reescrever a integração para as cinco lanes finais, além dos controles AK/pistola/faca.
7. Para mapas/PRs já implementados, gerar prompts curtos de auditoria visual/CI/merge em vez de repetir a implementação.
8. Gerar prompts novos para #467, #486, #496 e para a resolução dos PRs históricos/supersedidos #464, #468, #528 e #534.

## Evidência-chave

- PRs mesclados que ainda aparecem como tarefas: #527, #535 e #536.
- PR #517 de Lajes já mesclado; a frente atual é #539 em outra branch.
- Estado ao vivo: M4 `f63e730f` com 4 arquivos locais; Precisão `a988d72b`; AWP/shotgun/curtas `d35c6658`.
- Sertão `58923044`, Escadão `6412880a`, Campinho `73dfc45b` e Joá `640da258` já contêm os consertos que seus prompts mandam produzir.
- Míticos tem trabalho local volumoso fora do HEAD; áudio F/U tem um relatório local ainda não enviado.

