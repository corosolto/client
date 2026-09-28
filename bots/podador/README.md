# podador (persona: Ancap 🪙)

Fiscal do tamanho do estado: ronda semanal na main procurando **arquivo sem
uso** e **superengenharia** — e **nunca apaga nada**.

**Advisory, e é projeto.** O medo declarado da casa é "otimizar demais e
quebrar o jogo": por isso o podador abre/EDITA uma issue semanal com a lista e
a **prova de cada candidato**; falso positivo se refuta no fio e sai da edição
seguinte. Sentença de remoção é de humano, em PR, passando pelo portão.

## As duas frentes

| frente | como | classe |
|---|---|---|
| `arquivo morto` (determinístico) | módulos de `public/js` inalcançáveis de `main.js` + HTML servidos (grafo de importação real, `bots/lib/grafo.mjs`) e sem citação de nome em código; assets (`img/models`) cujo nome não aparece em NENHUM código vivo | morto de verdade |
| `só o arnês usa` | inalcançável do jogo, mas citado por `tools/`/`tests/` | classe separada — o harness é consumidor legítimo |
| `estado inchado` (LLM, `--deep`) | os maiores módulos julgados por prompt, com o contraposto declarado (game.js é grande POR HISTÓRICO DOCUMENTADO — tamanho não é defeito) | superengenharia |

Falso negativo declarado: nome de arquivo montado dinamicamente em runtime
que a regex de referência não pega aparece como morto — por isso nada é
apagado automaticamente e a refutação no fio é parte do contrato.

## Uso

```sh
cd bots/podador
bun poda.mjs rodada            # varredura + issue semanal (editada, dedupe)
bun poda.mjs rodada --deep     # + julgamento de superengenharia (LLM, top 6)
bun poda.mjs selftest
```

Credencial: `GH_PAT_FALA` (advisory). Estado em `estado/relatorios/`.

## Cron sugerido

Semanal, sexta ou sábado — depois do digest do cronista (o relatório da semana
merece saber o tamanho do estado).
