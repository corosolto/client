# v2.1 — DX, DOCS, SEO/AEO, RANKINGS E LIMPEZA

> **v2.1.** Nada aqui muda o jogo. Mas o item §1 (docs que mentem) está custando
> horas de agente todo dia, e o §2 (SEO) é o que transforma jogadores em tráfego recorrente.

---

## 1. Docs que contradizem o código (custo diário real)

Um dev novo — ou um agente — que segue a documentação de hoje vai para o lugar errado.

| Doc | Afirma | Realidade |
|---|---|---|
| `README.md`, `CONTRIBUTING.md` | jogo em `/game/`, entry `public/index.html` | **`public/index.html` não existe.** O jogo é `src/pages/index.astro` (615 linhas), servido na rota `/` |
| `README.md` | estrutura de `public/` com `index.html style.css js/ vendor/ audio/ robots.txt sitemap.xml llms.txt` | Não bate com a real |
| `README.md` | ranking "Fase 1 (atual): localStorage" | O backend Supabase está implementado, com **10 migrations e 7 endpoints** |
| **`tools/eval/ARCH.md`** | `game.js` tem **3.234 linhas** | Tem **5.361**. **Todos os `arquivo:linha` da tabela de conflito estão deslocados** — e essa tabela é o que impede agentes paralelos de colidirem. É a peça mais desatualizada e mais perigosa do repo |
| `HANDOFF-CLAUDE-CODE.md` | referencia `public/js/objgun.js` e branches `feat/graphics-textures`, `feat/weapons-models` | Não existem |
| `BOOTSTRAP-STUDIO.md` | descreve um `studio/` em Python/Typer | Não existe. Só sobrou `tools/studio.mjs` |
| `astro.config.mjs` | `site: 'https://csbrasil.online'` | Produção documentada como **`https://www.csbrasil.online`**. Todo canonical aponta para o host errado → **risco real de canonical split** |
| `index.astro` `<title>` | "CORO SOLTO: Treta Suprema ... (ex-CS BRASIL)" | `Layout.astro`, `og:site_name`, JSON-LD, README, CHANGELOG e `package.json` dizem **"CS BRASIL"**. O `name` do JSON-LD não bate com o `<title>` da página |

**Correção prioritária:** `ARCH.md` **tem que ser gerado**, não escrito (ver `05-HARNESS-AI.md` §2.1).
Depois: um `docs/` com índice, e o `README.md` reescrito contra o código real.

## 1.1 O `HANDOFF-KIMI.md` de 84 KB

441 linhas, log append-only fazendo papel de estado, e a skill `gauntlet-fps` manda **ler ele
primeiro**. Junto com `BAR.md` (60 KB) e `ARCH.md`, são ~150 KB de leitura obrigatória antes de
qualquer trabalho.

**Correção:** `STATUS.md` curto (≤100 linhas, só o estado de hoje) + `docs/historico/` com o
resto. A skill lê `STATUS.md` + `BAR.md`.

## 1.2 O que falta para onboarding impecável
```
[ ] docs/ com índice e ordem de leitura
[ ] STATUS.md substituindo o topo do HANDOFF-KIMI.md
[ ] tools/eval/README.md catalogando os 106 arquivos, marcando os OBSOLETOS
[ ] npm scripts expondo o harness (05-HARNESS-AI.md §2.2)
[ ] astro check + lint no package.json e no CI
[ ] .env.example  (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, AUDIO_PACK_URL)
[ ] CONTRIBUTING.md reescrito: como rodar, como adicionar arma, como adicionar personagem
[ ] 10-15 good-first-issue (também é requisito do plano 06)
```

**As duas skills que faltam** (`weapon-authoring` e `char-pipeline`) são a parte mais cara do
conhecimento tácito. O pipeline de personagem tem 6 passos com scripts reais
(`rig-from-donor` → `finger-curl` → `optimize-tribos` → `retarget-glb` → `check-clip` →
registry em 3 arquivos) e **não está escrito em lugar nenhum**. Todo agente novo redescobre.

---

## 2. SEO e AEO

### 2.1 O que você já tem, e é bom
- `Layout.astro`: title, description, **canonical** via `new URL(...)`, OG completo,
  `twitter:card summary_large_image`, `lang="pt-BR"`
- `index.astro`: head mais rico — keywords, robots, theme-color, og:url, og:image:width/height,
  **JSON-LD `VideoGame`** e **JSON-LD `FAQPage`** com 6 perguntas
- `u/[...path].astro`: **OG dinâmico por jogador**, com `og:type=profile` e `ogImage` = **badge
  PNG gerado em runtime** (`/api/badge/<id>.png`, resvg-wasm + fonte DejaVu embutida).
  Redirects 301 de `/u/<nick>` para `/u/<id>/<nick>`. **Isso é excelente e é seu maior ativo de
  SEO escalável** — cada jogador é uma página indexável com imagem própria

### 2.2 As lacunas, em ordem de impacto
1. **`site:` sem `www`** (§1). Corrija primeiro — tudo abaixo depende disso.
2. **Sem `@astrojs/sitemap`.** Um sitemap manual **não cobre `/u/<id>/<nick>`**, que é
   justamente o conteúdo indexável que escala. Instale o integration.
3. **Sem JSON-LD nas páginas internas:** `/ranking` (falta `ItemList`), `/u/*` (falta
   `ProfilePage`/`Person`), `/como-jogar` (falta `HowTo`), `/personagens`.
   E `sobre.astro` **duplica** o `VideoGame` do `index` — dois nós com a mesma `url` e sem `@id`,
   o que confunde deduplicação.
4. **`/ranking` e `/u/*` são `prerender=false` sem `Cache-Control`** → cada crawl bate no
   Supabase. Adicione cache de 60-300s.
5. Sem `hreflang`, sem `og:image:alt`, sem `BreadcrumbList`.
6. **Páginas que faltam e são SEO orgânico barato:** `/mapas`, `/armas`, `/changelog` — o
   conteúdo já existe em Markdown.
7. Branding inconsistente (§1) — resolva o nome antes de indexar.

### 2.3 Sobre AEO / `aeo.js`
Você mencionou `aeo.js`. O que de fato move a agulha para respostas de IA hoje:
- **`llms.txt`** na raiz (você já cita ter) — mantenha atualizado e aponte para os docs reais
- **JSON-LD correto e sem duplicata** (§2.2 item 3) — é o que os crawlers de IA leem primeiro
- **`FAQPage`** — você já tem no `index`; estenda para `/como-jogar`
- **Conteúdo em texto, não só em imagem** — as páginas `/mapas` e `/armas` do item 6 são
  exatamente isso
Não existe um padrão `aeo.js` estabelecido; o que funciona é schema limpo + texto extraível.

---

## 3. Rankings e páginas estáticas

**O ranking hoje é forjável.** Detalhado em `00-RELEASE-V2.md` §4 — a coluna `token` é legível
publicamente via anon key, e o modelo é client-authoritative por construção.

O anti-cheat que existe no RPC `submit_match` é bom para o que é: token, rate limit
(1 partida/90 s por nick, 60 s por IP, teto 200/dia), tetos absolutos (kills ≤150, streak ≤30),
consistência física (`kills ≤ 45 × rounds`, `seconds ≥ rounds × 80`), e `_flag()` que esconde do
ranking com 3+ flags. **Mas ele só barra o implausível** — um bot que respeita os limites farma
indefinidamente.

**A correção real é o plano `03` §5 dia 4:** o servidor de jogo escreve no Supabase com
`service_role`, e RLS bloqueia insert/update do cliente. Enquanto isso não sobe, feche pelo menos
o furo do `token` (é 15 minutos).

**Outros riscos catalogados:**
- `submit_log` guarda **IP bruto** com promessa de retenção de 7 dias e **sem job de limpeza**
  (nenhum `pg_cron`, nenhum delete em nenhuma migration)
- `/api/heartbeat` e `/api/avatar` **sem rate limit**; `avatar.ts` aceita 3 MB de base64 e roda
  `sharp` — vetor de custo/DoS
- Rate limits em `Map` na memória da instância serverless (`regHits`, `hits`) são
  **essencialmente inoperantes** sob cold start. O único limite durável é o do RPC
- `/ranking` (SSR) faz `select('*')` na view (500 linhas) **sem cache** e pagina em memória
- Nick squatting sem prova de posse (`register_player` é first-come)
- `vercel.json` **sem headers de segurança** (CSP, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy)

---

## 4. Limpeza do repo (por último, como você pediu)

| Item | Tamanho / impacto |
|---|---|
| `public/models/fpvm/arms_*.glb` | **155 MB de código morto** — só carregam com `?tripovm=1` (`fparms.js:35`). Tirar do bundle publicado é pré-requisito do CrazyGames (plano `06` §1.1) |
| `.agents/skills/` | **O grosso dos 18 MB de fonte** — 31 skills de terceiros versionadas junto do produto, incluindo 8 GIFs do `img2threejs`. Deveriam ser instaladas por `skills-lock.json`, não commitadas |
| **18 arquivos `.md` na raiz** | 2.407 linhas. Nenhum `docs/`. Um dev novo não sabe por onde entrar |
| `HANDOFF-KIMI.md` | 84 KB (§1.1) |
| `tools/eval/__pycache__/` | versionado |
| `tools/` raiz | 21 scripts one-off sem docs |
| `tools/eval/` | duplicação geracional não aposentada (5 `audio-probe*`, 3 `p1-menu*`, `g2r7`/`g2r7b`/`g2r8`) |
| `.xfer/`, `xferwork/`, `.b64tmp/`, `--help/` | pastas de transferência no repo |
| Branches | 10+ branches, várias já mergeadas ou abandonadas (`_cap_test`, `feat/characters-v2`, `map/faria-lima-baleia`) |
| `mint-assets.json`, `ASSETS-PROMPTS.md` na raiz | pipeline de asset misturado com docs de projeto |
| **`skills-lock.json` sem verificação** | 31 skills com `computedHash` SHA-256 e **nenhum script valida o hash** contra `.agents/skills/` |

**Nenhuma skill do lock cobre backend, SEO ou netcode.** A superfície de agente é 100%
gráficos/3D/gameplay — exatamente as áreas onde a auditoria encontrou *menos* dívida. As áreas
com mais dívida (segurança do backend, docs, netcode) não têm agente especializado nenhum.

---

## 5. Ordem sugerida (v2.1, ~1,5 dia)

```
[15m] site: com www em astro.config.mjs         ← desbloqueia todo o SEO
[30m] Decidir o nome (CS BRASIL vs CORO SOLTO) e alinhar em todos os lugares
[1h]  @astrojs/sitemap + Cache-Control em /ranking e /u/*
[1h]  JSON-LD: ItemList no ranking, ProfilePage em /u/*, HowTo em como-jogar, @id nos VideoGame
[2h]  Páginas /mapas, /armas, /changelog a partir do MD existente
[2h]  docs/ + STATUS.md + README reescrito contra o código real
[30m] ARCH.md gerado por script (05-HARNESS-AI.md §2.1)
[1h]  .env.example, CONTRIBUTING reescrito, good-first-issues
[1h]  Headers de segurança no vercel.json + job de limpeza do submit_log
[2h]  Limpeza: arms_*.glb fora do bundle, .agents/skills fora do git,
      __pycache__, pastas de transferência, branches mortas, marcar evals obsoletos
```
