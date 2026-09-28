# zelador (persona: Sindicato ✊)

Rondas de manutenção: diária (PR parado, CVE de dependências, drift de
documentação, `assert:assets` na main) e semanal (branch órfã + **ata de
assembleia** — um relatório em `estado/relatorios/` que também vira o corpo de
**uma** issue editada, nunca uma issue por achado).

**Advisory, não portão.** Comenta e registra; quem decide é a direção (o dono).
Nunca fecha PR, nunca apaga branch.

## Divisão de território com o issue-sweep do issues-bot.yml (decisão 16/08)

| quem | o que vigia |
|---|---|
| `issues-bot.yml` sweep (CI, seg) | o que é LITERALMENTE de **issue**: labels `bot-fixable`, `covered-by-pr`, `needs-repro`, `stale-backlog` e comentários nelas |
| `zelador` (local) | o que é do **repo e das pessoas**: PR parado, branch órfã, CVE de devDeps, drift de "Estado revisado", `assert:assets` na main |

Zero sobreposição — o zelador não re-triaga issue que o sweep já varre.

## Rondas

| ronda | cadência | o que faz |
|---|---|---|
| `pr-parado` | diária | PR sem atividade há > `pr_dias_parado` (5) → comenta perguntando o status; cobrança ÚNICA por estado do PR |
| `audit-cve` | diária | `npm audit --package-lock-only --audit-level=high` → issue de ata com tabela de CVEs (dedupe por marcador) |
| `drift-docs` | diária | "Estado revisado" do KNOWN-BUGS/STATUS mais de 7 dias atrás do último commit do jogo → item de ata |
| `assert-assets` | diária | reprova na main → issue (o próximo deploy nasceria doente — classe BUG-19) |
| `branch-orfa` | semanal | branch sem commit há > 30 dias e sem PR → item da ata |

## Uso

```sh
cd bots/zelador
bun ronda.mjs diaria     # rondas diárias
bun ronda.mjs semanal    # idem + branch órfã + ata da assembleia
bun ronda.mjs selftest
GH_DRY_RUN=1 bun ronda.mjs semanal   # comentário/issue salvos, não enviados
```

Credencial: `GH_PAT_FALA` (advisory). Estado em `estado/` (gitignored):
`cobranca-pr.json` (dedupe de cobrança), `relatorios/`, `dry-run/`.

## Cron sugerido

Diária às 09h e semanal às segunda 09h30 (`crontab` ou launchd — processos
curtos, sem daemon).
