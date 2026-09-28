# caca-bug (persona: Proerd 📋)

Fiscal de invariantes: ronda noturna que roda `node tools/eval/invariants.mjs`
no repo do jogo (~10-12 min), compara com a última rodada salva e mantém o
[`KNOWN-BUGS.md`](../../KNOWN-BUGS.md) sincronizado com o que a régua diz.

**Advisory, não portão.** Abre issue, comenta e risca entrada resolvida —
nunca fecha issue, nunca bloqueia, nunca faz merge.

## O que uma rodada faz

| transição | ação |
|---|---|
| VERDE → VERMELHA | entrada nova no `KNOWN-BUGS.md` (gabarito da skill `bug-hunt`, **voz seca**) + issue com evidência |
| VERMELHA → VERDE | entrada riscada `~~…~~ · RESOLVIDO dd/mm` + comentário na issue ligada |
| id some + id novo com descrição parecida | **rename** (caso real VM5→VM9): mapeia em `estado/renames.json`, não duplica |
| invariante nova já vermelha | reporta como "nasceu vermelha" — silenciar seria cegueira |

As entradas do `KNOWN-BUGS.md` saem no gabarito seco, **SEM persona** (registro
é registro); a voz do Proerd vive na issue e no comentário. A entrada automática
marca **Causa raiz — a investigar**: subir a entrada de seção e preencher causa,
reprodução e mutação é trabalho da skill `bug-hunt`, não do bot.

## Falha ruidosa > escrita errada

O parser aceita variação de espaçamento na saída do `invariants.mjs`, mas se a
estrutura não for reconhecida (0 resultados ou sem a linha `CRÍTICAS`), o bot
**não escreve nada** e sai 1. Régua que mudou de formato exige mão humana.

## Uso

```sh
cd bots/caca-bug
bun fiscal.mjs rodada                    # régua real + sincronização (10-12 min)
bun fiscal.mjs comparar a.txt b.txt      # offline: diff entre duas saídas salvas
bun fiscal.mjs selftest                  # fixture mínima
GH_DRY_RUN=1 bun fiscal.mjs rodada       # issue/comentário salvos, não enviados
```

Credencial: `GH_PAT_FALA` (advisory). Estado em `estado/` (gitignored):
`ultima-rodada.json`, `renames.json`, `ligacoes.json` (invariante → issue).

## Cron sugerido

Noturno (a régua é longa): `crontab` ou launchd às 03h, por exemplo. O bot não
tem daemon — cada rodada é um processo.
