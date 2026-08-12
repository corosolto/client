---
id: instrumentacao-ai
title: 'AI instrumentation: how the work gets done'
sidebar_label: AI instrumentation
sidebar_position: 3
slug: /ai-instrumentation
description: How the work gets done here — ruler, builders in disjoint ranges, adversarial critic with clean context, regression hunter. And the rule "whoever builds never grades".
---

{/* traduzido de docs/docs/instrumentacao-ai.md em 06/08/2026 — números refletem essa data; sync automático: issue #54 */}

# AI instrumentation: how the work gets done

This game was built almost entirely by AI agents, and still is. That is not
a marketing adjective: it is an engineering constraint that changes how the repository
is organized. This page describes the mechanism, and it is the same if you are human.

The loop is codified in `.claude/skills/gauntlet-fps/SKILL.md` — read the file, not
the summary.

## The problem the loop solves {#the-problem-the-loop-solves}

Quoting the file itself (`.claude/skills/gauntlet-fps/SKILL.md:10`):

> A lone agent produces *one* decent result and stops. It stops because **it itself**
> is the judge, and it knows every reason behind every decision it made — which
> makes it excellent at explaining why its own work is acceptable.

A model is great at building and terrible at failing what it built. Not because it lies
— because it knows the intention. It reads its own result through the justification. The
only known fix is structural: separate whoever builds from whoever measures.

## The three rules {#the-three-rules}

From `.claude/skills/gauntlet-fps/SKILL.md:14-16`:

1. **The ruler (quality gate) is non-negotiable.** It is not "it looks good", it is "does it lose or beat a frame of
   CS2, and by which measurement".
2. **Whoever builds never grades.** The critic is another agent, with clean context, that
   only sees the pixel — never the builder's justification.
3. **The loop has no fixed number of rounds.** It stops when you stop, not when the
   agent declares itself satisfied.

And the rule worth more than the three (`SKILL.md:18`):

> What makes the difference here **is not the number of agents** — it is that every claim
> carries a number and an `arquivo:linha`. A critique that says "improve the lighting" is
> noise. One that says "22,7% of the pixels of `game-praca_poderes-169-a.png` are at L\* < 3 and the
> cause is `bloom.js:18` `power=1.25`" is work.

## The cycle, in order {#the-cycle-in-order}

### 1. Ruler {#1-ruler}

Before any edit, there is an instrument. Two different things are called
"ruler" here and it is worth separating them:

- **`tools/eval/BAR.md`** — the VISUAL ruler: 25 criteria A1–D4 on a screenshot, on two
  independent axes ("does this look like a modern FPS?" and "does this look like the real
  Brazil?"). A map can pass one and fail the other; the ruler separates them on purpose.
- **`tools/eval/invariants.mjs`** — the GATE: runs in pure node and exits with code 1 if
  any critical invariant fails. How many exist and how many are evaluated is in the generated
  block of [The gate](./quality-gates.md) — not a number to repeat here.

The ruler is never written by the same agent that will fix the defect it measures.
When that happened, the result is documented in the repo — see the section
[Mutation test](./quality-gates.md#mutation-test).

### 2. Measured baseline {#2-measured-baseline}

```bash
CHROME_BIN=/opt/pw-browsers/chromium-*/chrome-linux/chrome \
  node tools/eval/gl-shots.mjs /root/shots/base all
```

Without a baseline there is no A/B, and without A/B the loop becomes opinion. An expensive detail of this
codebase: software rendering (SwiftShader) runs the game at **~0,3 FPS**, and an in-game
capture costs 4 to 6 minutes per map/aspect (`SKILL.md:39`). It is not a bug, it is the budget. It was
exactly because of that cost that the harness migrated to pure node: `tools/eval/botsim.mjs:4-6`
records that the previous version with Playwright+SwiftShader cost **~10 min per map**
on a 2-CPU machine.

### 3. Adversarial critics, in parallel, with clean context {#3-adversarial-critics}

One critic per front: graphics, maps/fidelity, weapons (visual and feel with separate
grades), UI (menu and HUD with separate grades), gameplay.

What makes a critic useful (`SKILL.md:62-66`):

- It receives the PNGs and the code, **never** the builder's report.
- It delivers a 0–10 grade **and** the gaps ordered by (impact ÷ cost), each with: what
  is visible in the frame that gives it away, the cause in `arquivo:linha`, and the fix with numbers.
- Literal instruction: *"improve the lighting" is an invalid answer; "half-res SSAO with 8
  samples in the `bloom.js` composite, radius 0.6 m, and the floor 8 points of L\* darker
  than the walls" is a valid answer.*

"Clean context" is literal: the critic does not see the builder's history. If it does, it
inherits the justification, and the justification is precisely what needs to be tested.

### 4. Builders in parallel, partitioned by line range {#4-parallel-builders}

This is the piece that allows N agents in the same 6.427-line file without conflict. It
has its own page: [Architecture](./arquitetura.md#disjoint-line-ranges).

The operational summary:

- The partition is declared in `tools/gen-arch.mjs` by **symbol**, not by line, and the
  script resolves symbol → line on the fly (`tools/gen-arch.mjs:11-13`).
- The resulting table lives in `tools/eval/ARCH.md`, inside
  `BEGIN:GERADO` / `END:GERADO` markers.
- In `game.js`, **only the Edit tool, never Write** — another agent is in the same
  file, in another range, right now.
- Three methods are a **red zone, append-only** — `update()`, `_dom()` and
  `constructor()` — because any front may need them
  (`tools/gen-arch.mjs:75-77`).

Rules every builder receives (`SKILL.md:78-83`): a querystring kill-switch on
every risky change (`?ao=0`, `?fxaa=0`, `?water=0`), safe degradation on
`quality === 'low'`, `node --check` on every edited file before returning, a target of
60 fps on a laptop GPU, and a comment **in Portuguese explaining the why** — it is what
survives the next handoff.

### 5. Capture and metrics: one agent only {#5-capture-and-metrics}

**A single agent runs the browser.** Two heavy headless sessions in parallel take down the
boot and produce a "frozen countdown" that looks like a bug and is load (`SKILL.md:87`). The same
agent reports, per map: time until `live`, `renderer.info` (calls, triangles,
textures, programs, geometries) and `usedJSHeapSize` after 30 s. The project has already had an OOM
crash: heap above ~350 MB is an alarm, and a fast-rising texture count is the
precursor.

### 6. A/B verification + regression hunter {#6-ab-verification}

Two new critics, clean context:

- **A/B** — compares `base` × `r1` × `r2` frame by frame, runs the A1–D4 checklist again,
  and says which criteria went from FAIL to PASS.
- **Regression hunter** — single mission: find what got **worse**. This is the agent that
  pays for the whole loop.

Literal instruction for the hunter (`SKILL.md:100`): *if there is no regression, say so —
don't make one up.*

:::note A trick that works
To isolate the weapon viewmodel without a manual mask, take the **pixels invariant across
the 4 angles** of the same map/aspect: the scenery changes, the weapon does not. You can measure the
left edge, the right edge and the viewmodel's screen area with subpixel precision
(`SKILL.md:98`).
:::

## Why "whoever builds never grades" is not philosophy {#why-builders-never-grade}

There is a measured case, and it is in the code: a critic that also built raised the gate's score
**for real, without loosening a single ceiling**, and was still rejected — because
to close two invariants it silently destroyed an aesthetic decision that no ruler
encoded.

The full account, with the numbers and the law that came out of it, is in
[Law 1](./quality-gates.md#law-1).
What matters here is the mechanism, not the episode: **the agent did not cheat.** It honestly
optimized the only thing that was measured. The ruler was the problem, and whoever wrote the
ruler was the one who would be measured by it.

## Expensive traps of this codebase (do not repeat them) {#expensive-traps}

Table reproduced from `.claude/skills/gauntlet-fps/SKILL.md:111-121`. Two items I
confirmed in the code: both aspects are measured in the gate (VM4 and VM10 compare 16:9
with 3:2) and the `?v=` warning is in `public/js/version.js:2-4`. The others are declared
memory of the project — treat them as such.

| Trap | What happens |
|---|---|
| Validating weapon framing only in 16:9 | The owner plays in **3:2**. It has already cost an entire round. The gate measures both aspects (VM4, VM10) |
| Rotating the weapon to "expose identity" | Root cause of "aiming at one place, the weapon points at another". The owner's direction: **functional > identity through angle** |
| Weapon orientation measured by eye | Always objective measurement (`weapontest.html`, `weapon-capture.mjs`) |
| Preloading all viewmodels | It was the "Aw Snap" crash (OOM). Today it is lazy-load. Do not undo it |
| Calibrating exposure by the darkest frame | One round did that and inverted the order across maps: the Piscinão, a beach map, became the darkest. Calibrate by the average of the 8 frames |
| A published module missing from the cache manifest | Its URL does not change with its bytes, or the import map advertises a pruned file. SB7 checks the graph, content, and publication boundary |
| `//` in CSS | It is not a comment. The parser swallows the next block. It has already killed an entire `@keyframes` |
| Two headless captures in parallel | Takes down the boot and falsifies the measurement |

## Where the knowledge lives {#where-knowledge-lives}

`STUDIO_CONSTITUTION.md:7-8`, principle 2:

> **Knowledge lives in the repository, never in the model's memory.** Decisions go to
> CHANGELOG/commits/docs; a new agent must be able to take over by reading the repo.

In practice this means the comments in this repository are long, in
Portuguese, and tell **why** each number exists and what happened when it was
wrong. If you find that verbose: that comment is what kept the next round from
redoing the same three-day mistake. Do not delete a provenance comment in a cleanup
PR.

:::warning Not everything that is written is up to date
`SKILL.md:72` states that `game.js` has 3.234 lines — the file has passed twice that
(today's number is in the generated block of [Architecture](./arquitetura.md#indexed-files),
and in `tools/eval/ARCH.md`). That is the exact reason `ARCH.md` and the blocks of this
documentation are **generated by script**: a hand-written index by number goes stale on the
first commit, and fixing it by hand lasts exactly one commit too.
:::
