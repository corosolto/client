# Tabela comparativa de armas com ordenação no cliente

**Dificuldade:** fácil · **Área:** UI / front · **Tempo:** ~2 h

## Contexto

`/armas` mostra as 26 armas agrupadas por classe, cada grupo numa tabela. Dá
pra ler, mas não dá pra **comparar** — que é exatamente o que quem entra nessa
página quer fazer ("qual mata mais rápido?").

## O que fazer

Adicionar, acima dos grupos, uma tabela única com as 26 armas e ordenação por
clique no cabeçalho (dano, pente, reserva, cadência, DPS calculado).

Requisitos:

- **Sem dependência nova.** ~30 linhas de JS inline resolvem.
- **Funciona sem JS:** renderize a tabela já ordenada por dano no servidor; o
  script só adiciona a ordenação.
- Siga o CSS que já existe (`.tw`, `.num`, `th`) — nada de estilo novo.
- Calcule DPS como `dano / cadencia` e diga na página que é teórico, sem
  recarga.

## Critério de aceite

- [ ] Ordena por qualquer coluna, crescente e decrescente
- [ ] Com JS desligado a tabela continua legível e ordenada
- [ ] Nenhum pacote novo no `package.json`

## Arquivos

`src/pages/armas.astro`
