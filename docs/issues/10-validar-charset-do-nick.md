# Validar os caracteres do nick no registro

**Dificuldade:** fácil · **Área:** segurança / produto · **Tempo:** ~1 h

## Contexto

`register_player` (`supabase/schema.sql`) valida **só o comprimento** do nick:
`check (char_length(nick) between 2 and 14)`. Não valida caractere nenhum. Hoje
dá pra registrar nick com `<`, `>`, aspas, caracteres de controle, RTL override
(`U+202E`, que inverte a ordem visual do texto), zero-width space e emoji.

Consequências reais:

- **Homoglifo:** `Аdmin` com "А" cirílico é visualmente idêntico a `Admin` e
  passa no `unique`. Nick squatting invisível.
- **RTL override** embaralha a exibição do ranking e da badge.
- Foi por causa disso que os popups de `/mapa` precisaram de escape manual
  (`docs/seguranca.md` §6).

## O que fazer

1. Migration com um `check` no banco (a fonte da verdade):
   ```sql
   alter table public.players add constraint players_nick_charset
     check (nick ~ '^[A-Za-z0-9_.\-]{2,14}$');
   ```
   **Cuidado:** nicks já existentes podem violar. Use
   `alter table ... add constraint ... not valid` e rode um relatório antes de
   validar; decida com o dono o que fazer com os inválidos.
2. Espelhar a mesma regex em `src/pages/api/register.ts`, pra devolver um erro
   legível em vez de um 409 genérico do Postgres.
3. Espelhar no cliente, pra mensagem aparecer antes de enviar (o input do nick
   fica em `public/js/main.js` — **combine com quem estiver mexendo lá antes**).

## Critério de aceite

- [ ] Nick com `<`, RTL override ou zero-width é recusado com mensagem clara
- [ ] Nicks legítimos existentes continuam funcionando
- [ ] O relatório de nicks inválidos pré-existentes está no PR

## Arquivos

`supabase/migrations/` (nova) · `src/pages/api/register.ts`
