# Contributing to CORO SOLTO: Treta Suprema

Thanks for wanting to contribute. This is an open-source fan project made to
celebrate **Brazilian culture** with humor — the *zoeira* (playful Brazilian
ribbing) is universal and dished out equally to everyone.

**To get started:** choose an [open issue](https://github.com/corosolto/client/issues)
and check its recent comments and associated PRs. Agree on a small scope
with the maintainer. [`docs/issues/`](docs/issues/) contains proposals with files and
acceptance criteria; compare them with existing issues before opening another one.

---

## Our position (read before contributing)

- **The game does NOT take political sides.** The factions have the same mechanics,
  the same exaggerated characters, and the same playful ribbing. Two of the five
  (Tribos Urbanas and Funkeiros) have nothing to do with politics.
- **The game does NOT incite hatred** against any person or group. It is light,
  cartoonish, fictional satire — no gore, no realistic violence.
- **No real people.** No identifiable politicians, celebrities, or private
  individuals (name, face, or imitated voice). Original archetypes only.
- Contributions that violate these principles will be rejected.

## PR rules (they apply to everyone, and CI enforces them)

1. **PR title and description MUST be written in English** — this applies to every author, human or bot.
   The `pr-language` check rejects Portuguese text in the title or body; code, commands, and links
   are still allowed. The template is already in English.
2. **`package.json` and `public/js/version.js` must agree** — the import map's `?v=`
   (`src/pages/index.astro`) comes from the version at build time; if the two files differ, the
   browser serves a stale cached module and "the fix never arrives" — this has already cost us days
   (see `public/js/version.js`). The `pr-gates.yml` workflow rejects mismatches. Bumping
   the version is NO longer the PR's job: since 08/08, `release.yml` automatically bumps, tags, and
   publishes the GitHub Release — in BATCHES (since 14/10; on 13/10 it was 2×/day, and before that on every push).
3. **Production ships in BATCHES, not on every merge** (14/10): Vercel's Git integration on `main`
   is still the path (owner's decision on 08/08), but `ignoreCommand`
   (`scripts/ci/vercel-ignore.sh`) only allows production builds on `chore(release):` commits.
   Stack the PRs and close them in a batch PR: `release.yml` runs when a PR reaches `main`
   with the `release` label or a `lote-*`, `claude/lote-*`, or `*/lote-*` branch, and only when
   `pr-fast` is green on that merge. Regular PRs do not trigger a release. Batch PRs land via
   **merge commit** (no squash or rebase): the `lote` job reads the PR associated with the commit that
   reached `main`, and the merge commit is what points to the batch. `csbrasil-bot-daily-release`
   creates or updates one `staging → main` PR per day at 12:17 UTC; safe PRs enter
   `staging` through automerge. A hotfix uses the `hotfix:` title and a PR based on and targeting `main`:
   the bot compares its ancestry with `main` and `staging`; any unpublished commit from
   `staging` applies `needs-hotfix-review`, removes `safe-automerge`, and blocks the release. With
   main-only ancestry, it receives `release` and starts the release train after a green merge. Manual dispatch
   (`gh workflow run release.yml`) remains available as a fallback. Production deploys come from
   `main` only (Vercel Git integration and `cf-prod-deploy.yml`); there is no manual deploy workflow.
4. **Fork PRs get a diff classification, not a preview**: `cs-brasil-ai-bot` (`preview-bot.yml`)
   classifies the fork diff without executing it when the PR is opened or reopened. In-repo PR
   previews are Cloudflare (`cf-preview.yml`).
5. **Local quality gates before opening**: `npm run check:fast` (seconds) and, if you changed
   the game, `npm run check:deploy` (the same gate run by the `pre-push` hook). A new
   quality-gate failure = PR sent back.
6. **No em dashes `—` in site text (`src/`)**. Use a hyphen with spaces (` - `). The
   em dash is a hallmark of AI-generated text and, in a game that presents itself as original, reveals
   that origin in titles, meta tags, OG tags, and weapon/character descriptions. `travessao:check`
   rejects `—` and `–` in `src/`; write ` - ` and move on. This applies to text written by
   humans and AI alike - the rule does not distinguish between them, and that is intentional.

## Running locally

```bash
git clone https://github.com/corosolto/client.git
cd client
npm ci
npm run fetch-audio       # opcional — sem o pacote, o jogo usa sons sintetizados
npm run dev               # http://localhost:4321 · o JOGO está na rota /
```

Check the Node requirement in the [README quickstart](README.md#rodar-localmente)
and run `node --version` and `npm --version` in the terminal you will use to install dependencies.

To reproduce the CI environment without hunting down Chromium versions or libraries, open the clone in a
**Dev Container**. The image uses Node 22, the npm version from `packageManager`, and the exact Playwright version from
the lockfile; `postCreateCommand` runs the same `scripts/setup.mjs` shown above and finishes with
browser diagnostics. In an already configured terminal, the equivalent path is:

```bash
node scripts/ci-local.mjs --setup       # setup + Playwright do lock num prefixo privado + Chromium (sem root)
node scripts/ci-local.mjs --setup-system  # Linux: Playwright eleva só a instalação das libs nativas
node scripts/ci-local.mjs --diagnose    # só ambiente; não roda teste
node scripts/ci-local.mjs               # diagnóstico e check:fast
node scripts/ci-local.mjs eval:boot     # qualquer script npm, com CHROME_BIN já descoberto
```

The private prefix in `node_modules/.ci-local-prefix` supports gates that query
`npm root -g` without writing to the system's global npm installation. A `CHROME_BIN`
override is only accepted when it resolves to the same Chromium installed by the lockfile's Playwright version.

The runner does not set `PREPUSH=0` or any other way to skip a gate. Missing Node/npm, packages,
Chromium, or native libraries produces `⊘ SKIP` with exit code **78** (`EX_CONFIG`) before the tests;
after diagnostics pass, the exit code and verdict come from the script being run.

**The game is at route `/`, and its HTML is `src/pages/index.astro`.** There is no
`public/index.html` — serving `public/` with a static server gives you the assets,
not the game. (The previous version of this file pointed to exactly the wrong
place.)

### One worktree per feature: `npm ci` is mandatory

The house rule is a fresh worktree for each feature, created from `origin/main`:

```bash
git fetch origin main
git worktree add -b fix/meu-defeito ../worktrees/meu-defeito origin/main
cd ../worktrees/meu-defeito
npm ci                    # obrigatório, uma vez por worktree
```

**Never** run `ln -s ../outra-worktree/node_modules .`. That shortcut saves a
minute and costs a day:

1. **Cross-contamination.** Both branches end up measuring the same dependency
   tree. On 28/10, this caused issue #1135 (opened and closed on the same
   day): an A/B comparison had three red gates on **both** sides
   because both sides were reading the wrong `node_modules`. A comparison with a
   shared tree measures no diff at all.
2. **A verdict on the wrong thing.** Without dependencies installed, a gate that
   runs a child process can fail while blaming the content. That was the bug in issue
   #1133: SB7 printed `✗ SB7 módulos locais mudam de URL junto com o conteúdo`
   when the real cause, two layers down, was `Cannot find package 'astro'`.

Today, this second case produces `⊘ SKIP` with the cause and the command that fixes it, and
the process exits with **78** (`EX_CONFIG`), which is neither green nor red. If one
of your gates skips with 78, read it as "not measured": run `npm ci` and run it again. The
mechanism lives in `tools/eval/sonda-filho.mjs`, and the reason SKIP has its own code
instead of becoming 0 or 1 is in `docs/docs/sonda-processos.md`.

## The two zones

| | `public/` — the GAME | `src/` — the SITE |
|---|---|---|
| Stack | vanilla JS, ES modules, vendored Three.js | Astro + SSR on Vercel |
| Build | **none** | `astro build` |
| Framework | **forbidden** (project decision) | welcome |
| New dependency | open an issue first | okay, if justified |
| Before editing | read `tools/eval/ARCH.md` | read `docs/seguranca.md` for `/api/*` |

## How to do things

### Adding a weapon

1. Put the GLB in `public/models/weapons/<id>.glb` (normalized, ~1 unit
   on its longest axis).
2. `public/js/weapons.js`: add the `id` to `WEAPON_IDS` and an entry to
   `CFG` with `len` (actual length in meters), `rot` (degrees to point the barrel
   along +Z), and `gripZ` (fraction of the length from the muzzle to the grip).
3. **Do not guess `rot`.** Run `npm run eval:vm` (`vm-mint-audit.mjs`): it measures
   the cross-section near each end along Z — the barrel is thin, the stock is
   thick. If the +Z end is not the thinnest, the weapon is backward and needs +180
   yaw. Visual inspection has already failed on bullpups; measurement does not fail.
4. `public/js/game.js`: add an entry to the `WEAPONS` object (`name`, `short`, `dmg`,
   `mag`, `reserve`, `rate`, `reload`, `spreadHip`, `recoil`).
5. `src/data/jogo.ts`: mirror it in `ARMAS` so the weapon appears on `/armas`.
6. Run `npm run check:deploy` and the blocking checks `npm run eval:vm` and `npm run eval:kick`.

### Adding a character

The pipeline has 6 steps, and none of them is optional:

```
tools/rig-from-donor.mjs    esqueleto de um doador + auto-skin (GLBs da Mint vêm sem rig)
tools/finger-curl.mjs       curvatura dos dedos pra empunhadura
tools/optimize-tribos.mjs   redução de malha e textura
tools/retarget-glb.mjs      11 clipes de animação em models/anims/<id>/
tools/check-clip.mjs        valida: 0 ossos faltando, durações e root motion iguais ao pack
registry em 3 arquivos      public/js/characters.js · manifest de áudio · src/data/jogo.ts
```

Run `check-clip.mjs` **before** committing: a character without a validated clip
enters the game in a T-pose.

### Adding a map

Create `public/js/map_<nome>.js` exporting a `build*`, registered in
`public/js/maps.js` (`MAPS`). Colliders are AABBs declared alongside each mesh.
Mirror it in `src/data/jogo.ts` (`MAPAS`) so the map appears on `/mapas`.

**Without writing code:** the "map as data" format (`public/js/map_json.js`) loads
an arena from a JSON descriptor — boxes, ramps, platforms, water, GLB props,
spawns, flags, and pickups. The visual editor is `public/construtor.html` (open
`/construtor.html` with `npm run dev`): it validates against the same rules as the game
(`npm run eval:mapjson` · `npm run eval:mapjsonboot`) and generates the `.json` plus the registration
snippet. See the step-by-step guide in `docs/docs/construtor-de-mapas.md`. Layered terrain
(a mezzanine above the floor) still requires the code path above.

> **This mirror has been forgotten before, in both directions.** `quebrada` was added
> to the game registry but did not appear on `/mapas`, in `llms.txt`, or in the JSON-LD;
> `praca_old` was removed from the registry but remained listed in all three. One extra and one
> missing: the **total** stayed at 5, so no count caught it. Map added or
> removed → update `src/data/jogo.ts` in the same PR and run `npm run check:seo`.

### Working on the site

- Name, host, and descriptions come from `src/lib/site.ts`. **Never hard-code the
  game's name on any page** — that is how "CS BRASIL" and "CORO SOLTO"
  diverged between the `<title>` and JSON-LD for months.
- New page = new `jsonld` in `<Layout>` and an entry in
  `src/pages/sitemap.xml.ts`.
- New `/api/*` route that writes data: use `rateLimit()` from
  `src/lib/ratelimit.ts`.
- Any user-supplied URL that the server will FETCH: use
  `src/lib/safe-url.ts`. Reading `docs/seguranca.md` first saves a review round.

## Before opening the PR

**`git push` already runs `check:prepush` automatically** — through the `.githooks/pre-push` hook.
It exists because in a single session on 12/08/2026, four consecutive pushes triggered red CI
on a gate that runs in **5 seconds** locally: `docs:check` twice,
`arch:check`, and `eval:shaderlog`. The gate existed; nobody ran it.

The hook runs the core checks and the suites affected by the diff. Any unknown or
cross-cutting path (`package.json`, `game.js`, `main.js`, boot/network, workflows) triggers the full
`check:deploy`. Selection is local only; CI still runs everything. Run `npm run check:fast` or
`npm run check:deploy` directly whenever you want the full suite before the first push.

For a proven pre-existing failure, `PREPUSH=0 git push` skips the hook — and CI remains
the safety net. Do not use this escape hatch for a failure caused by your own diff.

Before opening the PR, the rest is still up to you:

```bash
npm run check:deploy # quality gate completo (check:fast é a versão rápida)
npm run arch         # se você mexeu em public/js, o ARCH.md precisa ser regerado
npm run build        # o site tem que buildar
npm run check:seo    # se você mexeu em src/ (inclui src/pages/llms.txt.ts)
```

`check:seo` runs `npm run build` and then measures the **published HTML**, not the
`.astro`. That is intentional: it is how a static `sitemap.xml` shadowing the
dynamic route was caught, and how the AEO1 clause catches a page promising a
global ranking with `RANKING_ON = false`. **Do not loosen a limit just to make the score pass.**

Test manually too: the game opens, the console stays clean, and a full match runs
(the round ends, and the scoreboard opens with Tab).

## Code rules

- **Portuguese** in names, comments, commits, and docs.
- **Code is not a report.** A new comment should only explain an invariant, compatibility requirement, or
  risk that the names do not express, in at most two lines. History, root cause, numbers, and
  reproduction steps belong in the issue, `KNOWN-BUGS.md`, or `docs/`; the comment only points to them.
- Do not narrate the obvious, leave an investigation diary, or use comments to compensate for poor
  naming. When touching a section, remove redundant comments from that same section.
- Use `arquivo:linha` in every claim about code.
- Small, focused PRs: one feature or one fix per PR.
- **Interconnected systems** (weapon + hand + animation + ADS + crosshair + HUD) must be changed
  **sequentially, by one person**. Parallel fan-out in this system has already
  caused 13 regressions in a single round.
- **Secrets never go into git.** `service_role` keys and `.env` belong only in Vercel.
- Large assets do not go into git. `public/audio/` is ignored; new sounds are added
  to the package via `audio/manifest.example.json`.

## Content

- Nothing copyrighted: sprites, sounds, models from commercial games, logos, brands,
  or photos. Original material or material with a compatible license only.
- New characters follow the standard: fictional archetype, fictional name, humor without
  cruelty, and no targeting protected groups.
- Exception decided by the owner on 04/10/2026: a **public political figure** may appear
  as a satirical caricature, and only in that form. Use a caricatured name, never the real name. Generate the 3D
  model from a caricatured 2D concept; a real photo may only serve as a reference for the
  concept and must be visually reviewed (`docs/LICOES.md` in `../progress`, lesson 9). The same
  treatment applies across the political spectrum. No gore and no physical humiliation.
  The owner decides when such a character goes live.

## Process

1. Large feature? Open an **issue** first (ideas live in `docs/IDEAS.md` in the private `progress` repo).
2. Fork, branch, and open a PR with a clear description and screenshots.

   **Branch name: `v2/<assunto>`** — `v2/multiplayer`, `v2/audio`, `v2/ui-hud`.
   The prefix is the release cycle (see the top of [`CHANGELOG.md`](CHANGELOG.md)): everything
   in v2 lives in `v2/*` and goes from there to `main`. This rule came from a
   concrete problem: on 04/08, the working branch was called `feat/evio-feel` — the name of a
   July feature — and had accumulated **143 commits** on completely different
   subjects (GLB characters, funkeiros, viewmodel, maps), with no upstream, while
   `main` had been stuck since 18/07. A name that does not say what the branch is turns it into a dumping ground.
3. By contributing, you agree to license your contribution under **AGPL-3.0**
   (see [`LICENSE`](LICENSE)).

   > **Migration applied on 07/08/2026.** The project was MIT and became **AGPL-3.0**.
   > Contributions made before the change were submitted under MIT — a permissive,
   > compatible license: they remain MIT within the whole, which is distributed under
   > AGPL-3.0. If this is a deciding factor for you, ask before opening the PR.

### License surfaces

These files **repeat the license name** — a license change updates all of them in the
same commit (changing only half is worse than changing none). The table is generated:

<!-- BEGIN:GERADO:licenca_pontos — do not edit manually, run `npm run docs` -->

| Surface | File | Where it says `AGPL-3.0` |
|---|---|---|
| canonical license | `LICENSE` | 11×  |
| badge + license section | `README.md` | 5×  |
| term accepted by the contributor | `CONTRIBUTING.md` | 6×  |
| site footer | `src/layouts/Layout.astro` | 1×  |
| game JSON-LD | `src/pages/index.astro` | 1×  |
| `/sobre` page | `src/pages/sobre.astro` | 3×  |
| `llms.txt` (LLM response) | `public/llms.txt` | **file does not exist**  |
| footer of this documentation | `docs/docusaurus.config.js` | — (does not name the license)  |

**27 occurrences** of `AGPL-3.0` across **6** of the 8 declared surfaces. Changing the license means changing **all of them in the same commit**: changing only half is worse than changing none, because each file would give a different answer to the same question.

**Other license names mentioned on these surfaces:** `MIT` in `README.md` (4×), `MIT` in `CONTRIBUTING.md` (4×), `MIT` in `src/pages/sobre.astro` (1×), `MIT` in `docs/docusaurus.config.js` (1×). Mentioning is not declaring — these lines are migration history or credits for third-party dependencies. The rule remains the same: **only `LICENSE` declares the license**, and today it says `AGPL-3.0`.

> Block generated by `node tools/gen-docs.mjs`. Source: `grep -n of known license names, on the surfaces declared in tools/gen-docs.mjs`

<!-- END:GERADO:licenca_pontos -->

CI validates the presence of `Signed-off-by:` in every commit in the PR. After
`npm install` or `npm run setup`, the versioned hook in `.githooks/` automatically adds
the name and email configured in Git. By committing, you confirm
this declaration for the submitted contribution. If you already use your own
`core.hooksPath`, it is preserved and the installer tells you to keep using `git commit -s`.

If you have not installed the dependencies yet, sign manually:

```bash
git commit -s -m "feat: minha mudança"
```

### Who wrote the commit

This repository is **AI-generated and AI-friendly**: much of the code is written
by AI agents, and **every** commit says who wrote it in the `Agent:` trailer —
this is what backs the README's "every commit says which one" claim. A human committing alone
uses `Agent: humano`; the field is never empty, because optional fields become
empty over time (the convention was initially written in three files and, 200 commits later,
was in **none** of them).

You do not need to type it: `.githooks/prepare-commit-msg` fills it in automatically
by reading the environment signature (`CLAUDECODE`, `KIMI_*`, `CODEX_*`, `OPENCODE*`,
`CURSOR_TRACE_ID`, `AI_AGENT`). To include the model — which is rarely available in
the environment — export `AGENTE`, which takes precedence over detection:

```bash
export AGENTE="Claude Code (Opus 5)"
git commit -s -m "fix: minha correção"      # trailer entra sozinho
git commit -s -m "fix: x" --trailer "Agent: Kimi Code"   # ou explícito
```

An agent committing on a human's behalf keeps the signer's `Signed-off-by` and
adds the writer's `Agent:`. `.githooks/commit-msg` rejects commits
without the trailer, and CI's `Check trailer Agent` gate covers what the hook cannot
reach: clones without `npm run setup`, `--no-verify`, and commits made through the
GitHub interface.

#### AI co-authorship is not allowed

`Agent:` is this codebase's attribution mechanism, and it says **which** agent.
The `Co-Authored-By: Claude` line that tools add automatically says nothing
that `Agent:` does not already say, always appears next to it — **415 of the 1004 commits
on main** carry the pair — and invents a co-author without an account, which appears in
GitHub's "Contributors" mixed in with real people.

The same three `Agent:` gates reject this line, reading the agent list
from `scripts/coautoria-ia.re` (a single file: a list copied to three places
diverges, and then the same message passes one gate and fails another).
**Human co-authors are still allowed** — the rule only rejects tool names.

Disable it at the source and you will never see the gate: Claude Code is already disabled by
`"includeCoAuthoredBy": false` in `.claude/settings.json`; other tools
have an equivalent option. If it is already in the message, clean the range with:

```bash
git rebase <base> --exec 'git log -1 --format=%B | sh scripts/checa-coautoria-ia.sh --limpa > /tmp/m && git commit --amend --no-edit -F /tmp/m'
```

### Large commits need a reason

Small commits make reviews, `git bisect`, and reverts cheap, and they are the
first thing lost when an agent works for hours without stopping.
`.githooks/commit-msg` rejects commits over **15 files or 800 lines**,
ignoring generated files (`public/docs/`, `CHANGELOG.md`, `package-lock.json`,
`STATUS.md`, `tools/eval/ARCH.md`, `docs/i18n/`, `graphify-out/`,
`public/js/version.js`) and release commits.

The limit is not a matter of opinion. It is a **dated observation anchored to a commit**, which is
why the command below returns the same result today and a year from now:

```bash
git log --no-merges -400 --format='%H%x00%s' --numstat 7b20e46 |
  python3 scripts/medir-historico.py
#   340 commits não-release, sem arquivo gerado
#     p50:  3 arquivos,   89 linhas
#     p75:  8 arquivos,  276 linhas
#     p90: 15 arquivos,  845 linhas   <- é onde o teto fica
#     p95: 21 arquivos, 1736 linhas
```

**This is not a generated block, and the decision is deliberate.** The first version of this
section was generated by `gen-docs`, and the measurement changed with every commit — including
the commit that regenerated it. A moving-window percentile is not a fact about the repository's
state, like "34 files, 27,639 lines"; it is a **historical observation**,
and observations are anchored, not chased. House rule 2 requires
reproducibility, and the `7b20e46` anchor provides exactly that.

Re-anchor it when the work profile genuinely changes — not on every PR. The
generated-file list is the same one in `scripts/medir-commit.awk`, which the
hook uses, exercised by a fixture in `agente_check.py --selftest` (the filter
was broken once from the start, with a `^` in the middle of a line that never matched).

When a large commit is the right choice (moving a directory, regenerating a collection, applying
a rename), explain why and proceed:

```bash
git commit -s --trailer "Commit-grande: git mv da pasta fpvm, sem mudança de conteúdo"
```

Rebases, merges, cherry-picks, and reverts are not measured again: the commit has already
passed the limit check once, and checking twice turns a resolved conflict into a
rejected commit.

## Reporting bugs

Open an issue with: what happened, what you expected, steps to reproduce,
browser/OS and, if possible, a console screenshot (F12). The game has a crash overlay
that keeps the exception on screen specifically for that screenshot.

**Describe it in your own words, not with the diagnosis you imagine.** In this
codebase, the symptom is almost never the bug: *"the game restarted by itself"* was a button
in the pause menu underneath the crosshair, and *"the music does not play"* was a `%2520` in a
twice-encoded URL. The literal statement is the data; we measure the interpretation.

**Security vulnerabilities do not belong in public issues** — see
[`SECURITY.md`](SECURITY.md).

### Going to fix a bug?

There is a skill for that, for agents and humans alike:
[`.claude/skills/bug-hunt/SKILL.md`](.claude/skills/bug-hunt/SKILL.md). It codifies the
method this repository paid dearly to learn — a gate before the fix, a mutation that proves
the gate has teeth, and disproving the obvious guess before acting on it — each rule paired with the
real case that taught it. It also includes the workflow: where to record findings
(`KNOWN-BUGS.md`), the order in which to run the quality
gates, and how to report what you did **not** verify.

A bug with evidence (`arquivo:linha`, gate output, or reproduction steps)
goes into `KNOWN-BUGS.md`. An unmeasured suspicion goes
to the end of the file, in the *Relatados, ainda não reproduzidos* (Reported, not yet reproduced) section — and does not move up
without numbers.
