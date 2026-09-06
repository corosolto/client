# Orquestração do catálogo completo de viewmodels

## Objetivo e autorização

Em 06/09/2026 Ruben pediu: “quero que voce orquestre isso até terminarmos tudo com o claude”.
Codex/Astra coordena o catálogo completo; Claude executa etapas delimitadas. Esta autorização
amplia a coordenação além da preparação Mosin/SVD/SKS. Não encerra o objetivo ao terminar
uma arma, uma pose, os pilotos ou um PR. Não autoriza compras, merge ou deploy automático.
Publicação dos PRs de preparação já autorizados continua permitida; release exige o pacote
concreto validado e a aprovação final do dono.

Este arquivo é o registro de coordenação. Estado técnico/visual de cada frente permanece
no respectivo ledger; não substituir evidência nova por um snapshot deste documento.

## Responsáveis e isolamento

- Coordenador: tarefa Codex `01a073e4-50fa-7c52-9ac7-729a088fc976`, worktree
  `vm-prep-precisao`, branch `codex/vm-prep-precisao`. Escreve este registro, a documentação
  própria e artefatos de coordenação em `artifacts/viewmodels/prep/precisao/orquestracao/`.
- Integração de arma/mãos/animação/câmera/HUD: única lane `vm-astra-pistol`,
  branch `codex/vm-astra-pistol`; nenhum worker de asset escreve runtime/atlas comum.
  Browser continua exclusivo da integração, com reserva explícita; nenhum worker offline
  pode iniciá-lo. Não capturar enquanto outra frente usar o recurso. Não encerrar terceiros.
- Executor Claude inicial: `vm-prep-rifles`, branch `codex/vm-prep-rifles`.
  CLI autenticada da conta existente, sem nova compra, caminho
  `/Users/ruben/.claude/local/node_modules/.bin/claude` (2.1.258 na conferência).
  Configuração encontrada: `claude-fable-5-1[1m]`; confirmar modelo efetivo no início
  da sessão. Não alterar o modelo ou usar uma CLI antiga do PATH por engano.
- Só um executor escreve em cada lane. Antes de despacho/retomada conferir processos,
  sessão Claude, branch/status, caminho real e o ledger. Não duplicar worker ativo.
- Crítico independente recebe artefatos e critérios, sem a justificativa do construtor.
  Aprovação numérica não substitui a revisão visual de Ruben.

## Autoridades para retomada

- `../vm-astra-pistol/docs/reports/VIEWMODEL-SERIES-HANDOFF.md`: marco 31 e seguintes,
  estado faca/pistola, controles e próximos pilotos.
- `../vm-astra-pistol/docs/reports/VIEWMODEL-INVENTARIO.md`: fila do catálogo.
- `../vm-astra-pistol/docs/development/VIEWMODEL-1P-PROFISSIONAL.md`: conjunto completo
  de arma/mãos/peças/ações/câmera/sockets, paridade Blender→GLB→Game e portões humanos.
- `../vm-prep-rifles/docs/reports/VM-PREP-RIFLES.md`: M4 aprovada e receitas específicas.
- `VM-PREP-PRECISAO.md`: diagnóstico Mosin/SVD/SKS e limitações reais dos doadores.
- Escopo ativo deriva de `public/js/data/weapons.js` na integradora, incluindo knife,
  acrescido dos utilitários HE/flash/smoke. Não restaurar armas removidas do catálogo.

## Fila completa e definição de pronto

1. Preservar AK golden, pose pistola yaw 15°, ataques de faca aprovados e aparência
   M4 aprovada. Fechar evidência P4 da pistola em 16:9 e confirmação final de proporção/
   acabamento da faca. Não pedir outra aprovação dos ataques ou remodelar controles.
2. AWP e depois escopeta: pilotos completos e aprovados antes da promoção do restante.
3. Rifles: M4 completa, depois SCAR, MD97, M92, FAMAS e carabina, com solução própria.
4. Armas curtas: Deagle e revólver .38. SMGs: MP5, Uzi e P90.
5. Precisão: Mosin, SVD e SKS. Pesada: LMG.
6. Utilitários HE/flash/smoke; identidade por time, regressão e entrega do catálogo inteiro.

Candidatas offline podem avançar em sua lane autorizada; não equivalem à promoção da
família, não dispensam os pilotos nem autorizam renderer compartilhado concorrente.
Para cada arma fechar: insumos/procedência; geometria e peças; mãos/contatos por peça;
idle/equip/fire/reloads/inspect aplicáveis; câmera/sockets exportados; reimportação GLB;
Game real em 3:2/16:9 com movimentos/transições completos; crítico; aprovação humana;
pacote versionado de assets; incorporação. Dados insuficientes permanecem explícitos.
Se duas tentativas não melhorarem a evidência, mudar a hipótese/abordagem; não afrouxar
régua, repetir renders idênticos nem solicitar trabalho indefinido sem marco revisável.

## Primeira etapa despachada ao Claude

Entregar candidata M4 em movimento preservando a aparência aprovada. Primeiro marco:
recarga tactical com carregador real, visita da mão esquerda e retorno ao grip; depois
empty, fire, equip e inspect. Saída exclusiva `A/m4-actions-c1/` da frente rifles,
scripts novos `rifles-m4-actions-*`, atualização do ledger próprio e checkpoints locais.
Controle imutável `A/m4-approved-2a4a189d/`, SHA GLB
`2a4a189d89f7c3912e60660d08ab4694dc07886a775e63a265afc1f4ffd197fd`.
Não escrever sobre `m4-candidate/` nem promover a candidata no servidor antes da revisão.

Prompt e metadados do despacho ficam em `artifacts/viewmodels/prep/precisao/orquestracao/`.
O executor escreve `../vm-prep-rifles/artifacts/viewmodels/prep/rifles/m4-actions-c1/progress.json`
com fase, saídas, validações, bloqueios e próximo passo.

Sessão ativa confirmada: `5f4987a8-7d43-462a-9892-e95258051bee`; modelo efetivo
`claude-fable-5-1`, cwd e permissionMode `acceptEdits` conferidos no evento init.
O worker já começou a leitura do ledger e dos insumos. PID/argv reais, arquivos
stdout/stderr, supervisor e caminho do resultado de saída estão em `claude-worker.json`
e `claude-launch.json`; confira o comando do PID, pois um PID antigo pode ser reutilizado.
Logs JSONL ficam em arquivo e não devem ser despejados na conversa.

A tentativa inicial nativa `--bg`, ID `acf78e9f`, é rejeitada: serviço perdeu
`/tmp/cc-daemon-504/a99da0ef/control.sock` com ENOENT e não listou worker ativo.
Foi substituída por CLI não interativa `-p --output-format stream-json`, executada
por `run-claude-worker.py` em subprocesso próprio; sem bypass global de permissões.
Não confundir o UUID solicitado ao --bg (ignorado pela ferramenta) com a sessão real.

Acompanhamento persistente criado nesta tarefa: automação
`coordenar-cat-logo-de-viewmodels-com-claude`, ativa a cada 15 minutos. Só notifica
marco significativo, conclusão, falha ou ação do dono; sem recados repetidos de estado.
O coordenador revisa/retoma a sessão real e não cria workers duplicados.

## Ciclo do coordenador

Resumo read-only, com limite de saída e conferência do PID contra a sessão:
`python3 tools/viewmodels/prep/precisao-orquestracao-status.py` nesta worktree.
O registro `claude-worker.json` deve apontar para o worker atual após cada nova etapa.

1. Ler este registro e os progressos dos workers; usar metadados/logs compactos. Não ler
   JSONLs enormes nem colocar imagens/base64 no transcript de monitoramento.
2. Se worker ativo e avançando, preservar sua execução. Ler imagens somente quando
   um marco revisável estiver disponível; não disputar Blender pesado ou browser.
3. Se terminou, verificar branch/diff/artefatos, medições e imagens. Solicitar revisão
   independente delimitada. Devolver achados concretos à mesma sessão Claude para ajuste.
4. Com marco validado, atualizar ledger/PR próprio e despachar a próxima etapa útil.
   Nunca classificar asset, Game, aprovação humana e publicação como um único estado.
5. Cota/autenticação/permissão/insumo: registrar erro exato; preservar sessão e trabalho.
   Não trocar para API paga, comprar créditos ou reiniciar sessão repetidamente.
6. Avisar Ruben em mudança significativa, conclusão, falha ou ação dele necessária.
   Se nada mudou, o acompanhamento deve ficar silencioso. Não terminar a coordenação
   porque o usuário ficou ausente; manter continuidade até completar a definição de pronto.

## Release ainda pendente

PR rifles #509 e precisão #513 usam `codex/vm-prep-base-961c70d2`; são etapas de
preparação/candidata. Consolidar na integração antes de staging. Assets privados locais
não viajam no Git: preparar derivados autorizados, manifesto de URLs/bytes/hashes e
verificar o build limpo com os arquivos efetivamente servidos. Não publicar fontes pagas.
Conferência remota de 06/09 não encontrou `STAGING_URL` nos secrets do repositório;
confirmar/configurar o ambiente antes de contar seu smoke como executado.
A main aciona versão/tag/release e publicação Vercel conforme workflows: reservar sua
entrada para pacote aprovado, com rollback do código E assets e checagem pós-publicação.
