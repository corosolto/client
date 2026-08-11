---
id: estado
title: 'Estado atual: produção, dados e dívidas'
sidebar_label: Estado atual
sidebar_position: 8
description: Fontes vivas para saber a versão publicada, a saúde de produção, as dívidas conhecidas e a cobertura dos dados.
---

# Estado atual: produção, dados e dívidas

Esta página não cola mais uma execução antiga do quality gate. Um placar copiado envelhece
no commit seguinte e já chegou a descrever mapas removidos, uma versão antiga e falhas
quitadas como se ainda fossem o estado atual.

## Onde olhar agora

| Pergunta | Fonte atual | Regra |
|---|---|---|
| Qual versão está publicada? | [`/changelog`](https://www.csbrasil.online/changelog) e `package.json` | o release abre uma seção e `docs:check` exige a mesma versão |
| Produção está respondendo? | `/api/health` e workflow `prod-watch.yml` | o monitor roda a cada 15 minutos e abre issue quando a falha persiste |
| O que está quebrado ou incompleto? | `KNOWN-BUGS.md` e `tools/eval/KNOWN-RED.json` | dívida nova reprova sem justificativa explícita no ratchet |
| Quais checks um PR precisa passar? | `npm run check:fast` e os jobs de `.github/workflows/` | cada régua importante tem mutante ou caso de falha conhecido |
| Onde as partidas acontecem? | [`/mapa`](https://www.csbrasil.online/mapa) | presença é aproximada por cidade; partidas são separadas nas cinco facções |

## Cobertura dos dados públicos

O mapa ao vivo combina três conjuntos diferentes e mantém os rótulos separados:

- `online_now`: presença recente de quem escolheu nick;
- `city_daily` + `presence`: histórico aproximado por cidade, sem publicar IP;
- `match_events.faction`: partidas anônimas por Time E, Time B, Tribos Urbanas,
  Palhaços e Funkeiros.

Clientes antigos não enviavam facção. Por isso o total identificado pode ser menor que o
total histórico de partidas. Se a tabela de eventos estiver indisponível, a página declara
o fallback legado E/B em vez de apresentar zero como dado completo.

## Como medir localmente

```bash
npm run docs:check
npm run check:fast
npm run eval:site
npm run eval:telemetry
```

O quality gate completo continua em `node tools/eval/invariants.mjs`; ele é mais caro e
depende de assets locais. Registre resultados datados em `KNOWN-BUGS.md`, não nesta página.
