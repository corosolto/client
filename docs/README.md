# `docs/` — developer documentation site (Docusaurus 3)

A **separate** application from the Astro site at the root. It has its own `package.json` and its
own `node_modules`. Nothing here is imported by the game or the main site.

Contents: AI instrumentation, processes, quality gates, architecture, current status, and how to
contribute. Everything is written against the code, with verified `file:line` references.

```
docs/
  .gitignore              node_modules, build, .docusaurus
  package.json            docusaurus 3.6.3 + react 18 (+ override do webpackbar, ver abaixo)
  docusaurus.config.js    config mínima; baseUrl '/docs/'
  sidebars.js             sidebar manual, na ordem de leitura
  src/css/custom.css      paleta do jogo (marrom-neutro + âmbar), com a procedência
                          de cada valor no topo do arquivo
  static/
    img/favicon.ico             cópia do public/favicon.ico do site (o canarinho, 16/32/48)
    img/canarinho-icone.webp    ícone da navbar (128 px)
    img/canarinho-header.webp   banner animado da home (604×240, 24 quadros)
    img/logo-coro-solto.webp    a logomarca, no rodapé (recorte de public/logo.png)
    .nojekyll
  docs/                   NA ORDEM DE LEITURA — a mesma do sidebars.js
    comecando.md          o que é, 3 comandos, estrutura real do repo
    stack.md              Three.js/WebGL sem build, Astro/Vercel, Supabase, geração de
                          asset (mint.gg, Tripo3D, Meshy, OpenRouter), Playwright,
                          gltf-transform e as skills. É a página CANÔNICA das duas zonas
    instrumentacao-ai.md  o loop: régua -> builders -> crítico -> caçador de regressões
    quality-gates.md      invariantes, as 2 leis da casa, teste de mutação da régua
    arquitetura.md        ARCH gerado + faixas de linha disjuntas + o que é gerado aqui
    colaborar.md          setup, portão, o que um PR precisa, boas primeiras tarefas
    estado.md             fontes vivas de produção, dados e dívidas; sem placar colado
  issues/                 as good-first-issues, uma por arquivo (README.md indexa)
  LICENCA.md              as decisões de licença, arte paga e marca — fora do site de
                          propósito: quem declara é o LICENSE, e a tabela de superfícies
                          é gerada no CONTRIBUTING.md
  seguranca.md            fronteira de segurança do backend (/api/*, supabase)
  studio-pack-integration.md  Offline pack verification/install and the exact future
                          runtime promotion contract (English)
  chat-de-sala.md         contrato v1 do chat de sala: identidade, limites, abuso (#686)
  onboarding.md           setup mínimo pra contribuir
  quality-gates.md        labels, merge policy e crash triage (o processo do PR)
  csbrasil-bot.md         o bot de issues/PRs do repositório
  adr/                    decisões congeladas: contexto, decisão, consequências (índice no README)
  audio/proveniencia.json ledger de procedência dos assets de áudio (lido pelo gate)
  runbooks/operacao-autonoma.md  diagnóstico e rollback de produção (npm run ops:diag)
```

> Only the contents of `docs/docs/` are included in the Docusaurus site — this is the preset's
> `routeBasePath: '/'`. Internal working `.md` files are not published pages and are not part
> of the public tree.

## Running locally

```bash
cd docs
npm install
npm start          # http://localhost:3000/docs/
```

`npm start` respects `baseUrl: '/docs/'`, so the dev server opens at
`http://localhost:3000/docs/`, not at the root. This is intentional: it is the same path used
in production.

Build:

```bash
cd docs
npm run build      # gera docs/build/
npm run serve      # serve docs/build/ localmente pra conferir
```

### The build RUNS — and what it took to run (08/05/2026)

Until 08/05, this section said "nobody has run `npm run build` yet," because the documentation
was written on a machine without network access. It has now been run. `npm install` (1,307
packages) and `npx docusaurus build` complete, with **one** necessary fix:

```
[ERROR] Error: Unable to build website for locale pt-BR.
  [cause]: ValidationError: Invalid options object.
    Progress Plugin has been initialized using an options object that does not
    match the API schema.
     * options has an unknown property 'name'  … 'color' … 'reporters' … 'reporter'
```

**Root cause:** `webpackbar@6.0.1` (the version shipped with Docusaurus 3.6.3) passes
`{name, color, reporter, reporters}` to webpack's `ProgressPlugin`. The webpack version resolved
here is **5.109.2**, which tightened that plugin's schema and began rejecting unknown properties.
This is neither our configuration nor our content: it is an incompatibility between two
transitive dependencies.

**Fix:** a one-line `overrides` entry in `docs/package.json`, upgrading `webpackbar` to `7.0.0`
(the version compatible with webpack 5.10x). It is the smallest change that resolves the issue —
it does not change the Docusaurus or webpack version:

```json
"overrides": { "webpackbar": "^7.0.0" }
```

After that: `✔ Client: Compiled successfully` and `[SUCCESS] Generated static files in
"build"`. `npm start` (dev server) uses the same webpack and the same plugin, so the fix applies
to both.

> The CLI reports that Docusaurus 3.10.2 is available. A major version upgrade **would also**
> solve the problem, with less workaround debt in the long term — but it is a large change to a
> package that nobody had managed to build until now. Get it working first, then upgrade.

## Publishing at `/docs` alongside the Astro site

The simplest approach is to build the documentation **into** Astro's static directory:

```bash
cd docs
npm run build:site      # equivale a: docusaurus build --out-dir ../public/docs
```

Then the normal site build at the root publishes everything together:

```bash
cd ..
npm run build           # astro build
```

Result: `https://csbrasil.online/docs/`.

### Why this works — verified in this repository

1. `astro.config.mjs` does not override `publicDir`. Astro's default is `./public`, and the
   contents of that directory are copied **as-is** to the build output and served from the site
   root.
2. The game itself proves that `public/` is served at the root: the import map in
   `src/pages/index.astro:97-123` points to `./js/main.js`, `./js/game.js`, etc., and those
   files exist **only** in `public/js/`. Since the game works in production, `public/X` is
   served at `/X`. Therefore, `public/docs/` is served at `/docs/`.
3. The root `package.json` confirms the output layout: the `preview` script is
   `python3 -m http.server 4321 -d dist/client` — in other words, the static output (including
   what came from `public/`) goes into `dist/client`.
4. `baseUrl: '/docs/'` is already configured in `docusaurus.config.js`. Without it, every asset
   and internal link would point to the root and break.
5. There is no `/docs` route in Astro (`ls src/pages` contains neither `docs.astro` nor
   `docs/index.astro`), so there is no route collision.

### Precautions

- **The root HAS a `.gitignore`** (this section previously claimed the opposite; that was true
  when it was written and has since changed). It does not list `public/docs/`, so a build
  generated there appears in `git status` ready to be committed. Choose one of the two options:
  - **Do not commit the build** — create a `.gitignore` entry with `public/docs/` and add the
    documentation build to `buildCommand` in `vercel.json`, before `npm run build`. Example:
    `"buildCommand": "bash scripts/fetch-audio.sh && (cd docs && npm ci && npm run build:site) && npm run build"`.
  - **Commit the build** — simpler, works without changing the Vercel pipeline, but clutters the
    diff. In this case, run `npm run build:site` whenever the documentation changes.
- **`docusaurus build --out-dir` deletes the output directory before writing.** Do not point it
  at all of `public/`. Point it at `public/docs/` only.
- **Do not put anything in `public/docs/` manually.** It is generated.

### Alternative: publish separately

If you prefer to keep the documentation outside the game's domain (GitHub Pages, Netlify, Vercel
in another project), change `docusaurus.config.js`:

```js
baseUrl: '/',            // em vez de '/docs/'
url: 'https://SEU-DOMINIO',
```

and run the normal `npm run build`. In this case, `static/.nojekyll` (already included) prevents
GitHub Pages from ignoring directories that start with `_`.

## Visual identity — where each piece comes from

Nothing here was designed in this folder: the four images are crops/conversions of files that
already exist at the root, and they are duplicated because **Docusaurus can only see
`docs/static/`**.

| Where it appears | File | Source |
|---|---|---|
| browser tab | `static/img/favicon.ico` | `public/favicon.ico` (byte-for-byte copy) |
| navbar | `static/img/canarinho-icone.webp` | `public/img/canarinho-pistola.png`, cropped and resized to 128 px |
| home header | `static/img/canarinho-header.webp` | `public/img/canarinho-header.webp` (copy) |
| footer | `static/img/logo-coro-solto.webp` | `public/logo.png`, cropped and resized to 440 px |

Two decisions that may seem arbitrary but are not:

- **The logo does not go in the navbar.** It is a four-line wordmark (`CORO / SOLTO / TRETA /
  SUPREMA`); at the navbar's 32 px height, it becomes a blur. The canary icon goes in the navbar;
  the wordmark goes in the footer, where there is enough width.
- **The animated banner already includes the wordmark**, so the standalone logo is not repeated
  in the same fold of the home page.

If the favicon or banner changes on the site, copy them again:

```bash
cd docs
cp ../public/favicon.ico static/img/favicon.ico
cp ../public/img/canarinho-header.webp static/img/canarinho-header.webp
```

**Size:** all of `docs/static/img/` is ~174 KB. This is intentional — the repository's versioned
`public/` is already well above CrazyGames' 250 MB limit, so every new image is converted to WebP
at its display resolution, never kept at its original size.

## How to keep this documentation honest

The rule is the same as in the rest of the repository: **no invented numbers**.

**A number derivable from code must NOT be written manually here.** It becomes a block generated
by `node tools/gen-docs.mjs`, between `BEGIN:GERADO:<name>` / `END:GERADO:<name>` markers, and
`npm run docs:check` (inside `check:fast`) fails when a block diverges from the code.

```bash
npm run docs          # regenera todos os blocos
npm run docs:check    # sai 1 se algum estiver velho — é o que roda no portão
node tools/gen-docs.mjs --json   # todos os fatos medidos, para outra ferramenta
```

In `docs/docs/` pages, the marker is an **MDX** comment (`{/* … */}`): Docusaurus 3 compiles
`.md` as MDX, and an HTML comment there is a parse error that **breaks the build**. In the root
`README.md`, a normal HTML comment is used.

What is **not** derivable — gate scores, decisions, the rationale behind each number — remains
manually written, and the rule there is to avoid numbers that become outdated: cite the command
that produces them, or write the sentence without them.

- Every technical claim has a `file:line` reference. If the file changes, the pointer becomes
  incorrect — check it before editing (this is the same problem that `tools/gen-arch.mjs` solves
  for `ARCH.md`). The `ponteiros` block in [Architecture](docs/arquitetura.md) reports references
  that point beyond the end of a file.
- The `estado.md` page contains terminal output **pasted from a real run**. When updating it,
  actually run `node tools/eval/invariants.mjs` and paste the entire output, including failures.
  Record the commit and date.
- If you did not measure it, do not write it.
