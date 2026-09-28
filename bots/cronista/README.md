# cronista (persona: Raul 🎸)

Narrador da semana: compila o CHANGELOG a partir dos commits da main e narra a
crônica semanal em dois formatos (Discord e Telegram).

**Nunca commit direto.** A atualização do CHANGELOG sai como PR; os digests
saem como arquivo em `estado/digests/` (e POST só quando os webhooks estiverem
no config — hoje vazios — sempre respeitando `GH_DRY_RUN`).

## Os dois movimentos

### `rodada` (pós-merge na main)

1. `git log` dos commits novos desde a última rodada (`estado/ultimo-commit.json`;
   primeira execução pega 7 dias), sem merge commits nem `chore(release)` do bot;
2. agrupa por **área** (mapas · armas e viewmodel · personagens · infra, site e
   docs — pelos caminhos tocados) e por **trailer `Agent:`** (a convenção do
   `CONTRIBUTING.md`; commit sem trailer conta como `(sem Agent:)`, honestamente);
3. monta a seção do CHANGELOG **no gabarito seco do arquivo** (subject cru,
   `## [versão] — data`, link de notas) — se a versão atual já tem seção (o
   release automático chega primeiro), acrescenta só os bullets que faltam;
4. branch `cronista/changelog-<data>` + PR com corpo em voz de Raul (tabela de
   áreas, contagem por agente).

### `digest` (semanal)

Crônica da semana em **markdown pro Discord** (com quem escreveu pelo trailer
`Agent:` e as personas em cena, lidas do estado dos outros bots) e **texto
curto pro Telegram** (≤400 chars, plain). Tudo derivado de commit e de estado
— **nada inventado**: commit sem trailer aparece como sem trailer.

## Uso

```sh
cd bots/cronista
bun cronica.mjs rodada     # CHANGELOG → PR
bun cronica.mjs digest     # crônica semanal (2 formatos + POST se configurado)
bun cronica.mjs selftest
GH_DRY_RUN=1 bun cronica.mjs rodada   # push/PR/webhook pulados e salvos
```

Credencial: `GH_PAT_ESCREVE` (abre PR — mesma conta do csbrasil-bot que faz
releases).

## Cron sugerido

`rodada` após cada janela de merges (2×/dia) e `digest` na sexta à noite.
