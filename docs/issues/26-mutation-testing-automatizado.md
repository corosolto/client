# `tools/eval/mutate.mjs` — mutation testing automatizado (T4 da trilha)

**Dificuldade:** difícil · **Área:** arnês / IA · **Tempo:** ~6 h

## Contexto

A técnica que mais achou defeito nesta base é quebrar o código **de propósito** e ver se a
régua fica vermelha. Foi assim que apareceram quatro invariantes cegas — a pior lia a
*declaração* de uma constante em vez do *uso*, e um mutante que desfazia a correção inteira
passava **20/22 verde**.

Hoje toda mutação é feita **à mão, uma por vez**. É a regra da casa ("mutação que prova a
régua"), mas ela só é aplicada quando alguém lembra, e nada re-verifica as réguas antigas.
O portão pode apodrecer sem ninguém notar: uma régua que parou de morder continua
imprimindo verde, que é exatamente o sintoma que ela deveria denunciar.

Esta é a **T4** do `TRILHA-V2.md` (Bloco 2), aberta aqui porque é o item de maior
alavancagem do bloco.

## O que fazer

1. Um catálogo **declarativo**: invariante → patch → qual régua deveria ficar vermelha.
   Arquivo de dados, não código — quem adiciona mutante não deve precisar mexer no motor.
2. `tools/eval/mutate.mjs` aplica, roda a régua, **restaura**, e reporta:
   - mutantes que **mataram** a régua (bom, a régua morde);
   - mutantes que **sobreviveram** — invariante cega, e esse é o achado.
3. Restaurar é a parte perigosa: use cópia em memória e `finally`, e prove que uma
   interrupção no meio (Ctrl-C) não deixa o repositório sujo.

## Critério de aceite

- [x] Rodando hoje, acha pelo menos os buracos já documentados (`knifeRot`, pose de ADS,
      escala por arma). **Se não achar, o catálogo está incompleto** — esse é o teste do teste.
- [x] Interromper no meio não deixa arquivo modificado (`git status` limpo)
- [x] Relatório separa "matou" de "sobreviveu", com o nome da régua em cada linha
- [x] Adicionar um mutante novo não exige tocar no motor

Prova real (08/2026): `npm run eval:mutate` → `aud1-kniferot MATOU · aud1-pose-ads-pistol
MATOU · aud1-escala-por-arma MATOU` + `OK: 3 mutantes MATARAM a régua`. Interrupção: rodar
`node tools/eval/mutate.mjs --demo-interrompe` e `kill -INT` no meio deixa `public/` intacto
(`git status --porcelain -- public/` vazio).

## Arquivos

`tools/eval/mutate.mjs` (novo) · `tools/eval/mutantes.json` (novo) · `TRILHA-V2.md` (T4)
