# ROADMAP — next steps

> Updated on **October 13, 2026** (`v2.1.0-alpha.69`). This file is the HIGH-LEVEL VIEW:
> the order and the why. Execution details (TRILHA-V2 and plans for workstreams already
> completed) have left the public tree; living content sheets live in the private repo
> (`../progress` → `archive/plans/`). A good starting task for a contributor is a
> [GitHub issue](https://github.com/corosolto/client/issues)
> + [`docs/issues/`](docs/issues/). When an item here is completed, it leaves this file —
> history lives in git, not here.

## Now (finishing the v2 release)

1. **REPUBLISH THE DECAL PACK** — *blocks deployment*. The `decals-pack-v1`
   has **174** files, while `DECAL_FILES` in textures.js requests **196**: the 22
   `folha-*` files (pixação tagging, throw-up, stencil, paste-up, character) were never
   republished. They currently return 404 in production — **513 of the 4,671 graffiti
   pieces disappear, 30% of the Quebrada map**. The T1 assertion in a clean build caught
   this; before it, nobody had a way to see the problem. The corrected zip already builds
   with `node -e` from `public/img/decals` (196 files, 9.4 MB). Remaining work: upload it
   as `decals-pack-v2` and point `scripts/fetch-decals.sh` to it. Until it is uploaded,
   `npm run assert:assets` fails the build — intentionally.
   *(The published audio manifest is also 2 paths behind: 306 versus 308.
   It passes the 250 floor, so this does not block the release.)*
2. **Graffiti parity in production** — the collection is gitignored because of its
   provenance, so production depends on the pack above. The long-term path remains:
   generate `or-*` batches through OpenRouter (`tools/gen-image.mjs`) until the
   web-downloaded collection can be retired. Procedural coverage was completed on August 7
   (`graffiti_pass.js` + baked layout):
   piscina 99.1% · ferrovelho 95.7% · loja H 89.6% · quebrada 88.7% · brasília 88.5%,
   measured by `npm run eval:grafite`.
3. **Apply migration `013_feedback.sql` to the production Supabase** — the menu's
   FEEDBACK form (the seed for the newsletter) responds "unavailable" until this is done.
4. **Blocks 2–7 of the track, in order** — AI engineering (mutation testing, severity
   gate, CI commenting on scores), telemetry, channels, first impression, contributor
   repo, release. T25 (feedback form) **already landed on August 7**;
   T23 (mobile capture) and T28 (GitHub issues) are about halfway done.
   *(BOT8/BUG-03, which used to live here, is gone: the duel-turn fix is in the
   code with a measurement — `game.js`, search for `BUG-03`.)*

## After the release

- **Multiplayer** — beta is live: public servers and private rooms using invitation
  codes (`public/js/net.js`, `transporte.js`, `netgame.js`). The open workstream is
  connection robustness and enabling room chat (backend).
- **Gate debts** ([`tools/eval/KNOWN-RED.json`](tools/eval/KNOWN-RED.json)) —
  13 known critical issues that do not fail CI but remain outstanding:
  viewmodel framing (VM1/3/9/12/16/18/19/20), cast anthropometry
  (CHR1/3/4), CTF1. Pay one off → remove it from the list (the gate will warn you).
- **FP arms** — shapeless rig; the current default is the weapon alone (`?hands=1` re-enables them).
- **Mobile/PWA** — installable beta with touch controls published
  (`public/site.webmanifest`); validation on real devices and the portrait in-game HUD
  remain open.
- **A real newsletter** — the funnel: export `feedback where newsletter=true`,
  choose a provider, publish the first issue (captures in `newsletter/`, outside git).
- **Monetization** — donations + our own ads + portals (CrazyGames/itch:
  `frame-ancestors` is already allowed; the submission package is still needed).

## Block 1 — CLOSED on August 7

T1, T2, and T3 delivered and verified. What is in place:

- **T1** `npm run assert:assets` (`tools/eval/assets-check.mjs`) in Vercel's
  `buildCommand`, between the fetches and the build. It counts STRING SHEETS in the
  manifest (the method matters more than the number: the same file yields 309 per list
  item and 9 per top-level key; per sheet it yields 308 in the real manifest and 62 in the
  example — floor 250). Decals come from the module imported in Node, not from line
  parsing, with diagnostics by class (`or-*` from git × the pack collection). Proven with
  a zip WITHOUT a manifest served on localhost: `fetch-audio.sh` says "Pronto" and exits
  0, while the check fails and identifies line 23.
- **T2** `scripts/prune-dist.mjs` at the end of the build: `models/fpvm` is removed from
  `dist/client` AND from the `.vercel/output/static` mirror (154.3 MB in each).
  `dist/client` went from 625 → 488 MB. Declared cost: `?tripovm=1` and `?tvm=1` only
  work in dev. `KEEP_FPVM=1` disables this.
- **T3** done in a disposable clone (Vercel-like), which is what found the two real
  defects in this round: the outdated decal pack (item 1 under "Now") and the `three`
  symlink that the harness planted OUTSIDE the project — an old clone in /tmp left the
  link dangling, and any new checkout started with all 150 `tools/eval` checks silently
  broken.

## How to contribute

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md) and the
[open issues](https://github.com/corosolto/client/issues) — each one has a
file, line, and acceptance criterion. Starter issues are mirrored in
[`docs/issues/`](docs/issues/). Non-negotiable rules:
a check before the fix, a mutation that proves the check, no critical check that was
green may turn red (`npm run check:deploy`), and comments explain the *why*.
