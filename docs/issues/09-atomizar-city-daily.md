# Corrigir a condição de corrida em `city_daily`

**Dificuldade:** média · **Área:** backend / banco · **Tempo:** ~1 h

## Contexto

`src/pages/api/submit-match.ts:58-65` faz **read-modify-write** sem transação:

```ts
const { data: row } = await supabaseAdmin
  .from('city_daily').select('matches, rounds').eq('day', today).eq('city', g.city).maybeSingle();
await supabaseAdmin.from('city_daily').upsert({
  day: today, city: g.city, country: g.country,
  matches: (row?.matches ?? 0) + 1,
  rounds:  (row?.rounds  ?? 0) + (rounds | 0),
});
```

Dois submits da mesma cidade no mesmo instante leem o mesmo valor e o segundo
sobrescreve o primeiro. Nenhuma partida some do ranking — mas o contador de
partidas por cidade do `/mapa` fica **abaixo do real**, e o erro nunca se
corrige sozinho.

Também são 2 round-trips ao banco em toda submissão bem-sucedida.

## O que fazer

Trocar por um `insert ... on conflict (day, city) do update` que soma no próprio
banco. A PK `(day, city)` já existe (`supabase/schema.sql`). Duas opções:

- uma migration com um RPC `bump_city_daily(p_day, p_city, p_country, p_rounds)`
  — recomendado, é 1 round-trip; ou
- `.upsert(..., { onConflict: 'day,city' })` com expressão de soma, se o
  PostgREST permitir na versão em uso.

Some `matches = city_daily.matches + 1` e
`rounds = city_daily.rounds + excluded.rounds`.

## Critério de aceite

- [ ] 50 submits concorrentes da mesma cidade resultam em `matches = 50`
- [ ] Uma chamada ao banco em vez de duas
- [ ] Migration numerada em `supabase/migrations/`, idempotente, com rollback comentado

## Arquivos

`src/pages/api/submit-match.ts` · `supabase/migrations/` (nova)
