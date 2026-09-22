# CSBR Control Plane — handoff

Atualizado em 2026-09-04. Estado: observer-only em correção após revisão independente;
instalação local e heartbeat continuam proibidos neste checkpoint.

## Checkpoint de segurança antes da pausa para a lane de áudio

- corrigidos localmente os bypasses P0 de `--actor=human`, overrides arbitrários de
  worktree/branch/role/provider e `running` sem lease;
- `run-start` agora usa apenas o roadmap, falha fechado para dependência, provider, volume,
  Git, worktree dirty/ausente, checkout/branch protegidos, risco high sem liberação e limites
  de 2 workers + 1 reviewer;
- checks `passed` exigem SHA completo; `technically_green` exige todos os gates no mesmo SHA
  e HEAD limpo inventariado; mutações e eventos relevantes são transacionais;
- dashboard não faz mais `git status` síncrono em cada GET; refresh ocorre em subprocesso;
- wrapper Node >=22 tornou `npm run eval:controlplane` verde mesmo com o Node 16 do shell;
- teste normal passou e o mutante `sem-aprovacao` ficou vermelho como esperado;
- pendente: finalizar instalador transacional com rollback/smoke, atualizar UI/handoff sem
  overclaim, repetir gate visual e pedir nova revisão independente. Não instalar antes disso.

## Objetivo e definição de pronto

Reduzir a dependência de Ruben para o trabalho reversível cotidiano sem transformar autonomia
em publicação cega. O sistema fica pronto quando:

- roadmap, runs, worktrees, commits testados, gates, bloqueios e aprovações sobrevivem a
  reinícios num SQLite local;
- o dashboard continua no SSD interno e consegue mostrar `Zenith indisponível` se o volume
  externo cair;
- no máximo dois implementadores e um reviewer trabalham em lanes exclusivas;
- item bloqueado não paralisa itens independentes;
- nenhum agente atravessa sozinho merge, push, deploy, publicação, migração de produção,
  credencial, gasto, exclusão material ou aprovação visual/sonora.

## Branch, estado e superfícies

- worktree: `/Users/ruben/csbrasil/worktrees/agent-control-plane`;
- branch: `codex/agent-control-plane`, base `origin/main` em `dcd8858e`;
- runtime versionado: `tools/control-plane/`;
- runtime instalado: `~/.ai-infra/runtime`;
- estado: `~/.ai-infra/state/control-plane.sqlite` em WAL;
- dashboard: `http://127.0.0.1:4180/`, somente loopback;
- não fazer push, merge ou deploy sem aprovação do dono.

## Modelo operacional

Fluxo: roadmap/DAG → preflight → lease/run exclusivo → implementação → gates → review →
aprovação. O `control:tick` apenas reconcilia saúde, Git e runs stale; ele não executa LLM.
Quem continua as tarefas é o heartbeat nativo desta conversa, que usa a CLI para registrar
mudanças de estado e escolhe outro item seguro quando uma frente pede decisão humana.

Papéis iniciais: orchestrator, analytics, product_analyst, audio_qa e asset_qa. Codex é o
worker inicial porque seu CLI está saudável. Claude deve entrar somente depois de corrigir e
validar o CLI global; o agente Claude `auto-commit-pr` fica explicitamente fora porque abrir PR
automaticamente viola o gate humano.

Estados: `ready → running → verifying → review_ready → needs_approval → done`, com `blocked`,
`rejected` e `stale`. Uma run ativa por item é unicidade de banco. Item marcado
`requires_approval` só chega a `done` com `actor=human`; o mutante `sem-aprovacao` prova que a
régua detecta a remoção dessa trava.

## Roadmap inicial

1. `ADM-001`: telemetria e retenção confiáveis;
2. `AUD-001`: escuta humana do pack Fab no jogo;
3. `RET-001`: plano de retenção até 100 jogadores/dia, dependente de `ADM-001`;
4. `VM-001`: AK + pistola como prova do pipeline, sem tocar em `viewmodel-blender`;
5. `CP-001`: instalar e observar o control plane por um ciclo completo.

## Gates e riscos conhecidos

- `eval:controlplane` usa somente fixture temporária e nenhuma credencial;
- o servidor recusa método de escrita e Host externo, além de bindar em `127.0.0.1`;
- o instalador faz backup datado antes de substituir os LaunchAgents antigos;
- o dashboard antigo está vivo somente porque o processo ainda não reiniciou: o cwd foi
  apagado, o fonte não existe e o supervisor acumula falhas por `MODULE_NOT_FOUND`;
- o projeto salvo `CSBR` no Codex aponta para a pasta contêiner, não para o Git root real;
- a máquina precisa ficar acordada, o app aberto e o Zenith montado para trabalho local 24/7.

## Próximos passos concretos

1. rodar normal + mutante e inspeção visual do dashboard;
2. instalar o runtime interno e confirmar os dois LaunchAgents após restart do processo;
3. criar heartbeat a cada 30 minutos, notificando somente falhas;
4. observar 24–48 horas com concorrência 1 antes de habilitar dois workers;
5. corrigir o Claude CLI, fazer uma run de teste sem `auto-commit-pr` e só então ativar
   cross-review Codex ↔ Claude.
