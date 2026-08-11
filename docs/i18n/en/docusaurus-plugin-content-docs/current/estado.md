---
id: estado
title: 'Current state: production, data, and debt'
sidebar_label: Current state
sidebar_position: 8
slug: /status
description: Live sources for the deployed version, production health, known debt, and data coverage.
---

# Current state: production, data, and debt

This page no longer embeds an old quality-gate run. A copied score becomes stale on the
next commit and had started describing removed maps, an old version, and fixed failures as
if they were still current.

## Where to look now

| Question | Current source | Rule |
|---|---|---|
| Which version is deployed? | [`/changelog`](https://www.csbrasil.online/changelog) and `package.json` | release automation creates an entry and `docs:check` requires matching versions |
| Is production healthy? | `/api/health` and `prod-watch.yml` | the monitor runs every 15 minutes and opens an issue after persistent failures |
| What is broken or incomplete? | `KNOWN-BUGS.md` and `tools/eval/KNOWN-RED.json` | new debt fails the ratchet unless explicitly justified |
| Which checks must a PR pass? | `npm run check:fast` and `.github/workflows/` | each important check has a mutation or a known failure case |
| Where are matches happening? | [`/mapa`](https://www.csbrasil.online/mapa) | presence is city-level; matches are split across all five factions |

## Public data coverage

The live map combines three distinct datasets and labels them separately:

- `online_now`: recent presence for players who chose a nickname;
- `city_daily` + `presence`: approximate city history, without exposing IP addresses;
- `match_events.faction`: anonymous matches for Team E, Team B, Urban Tribes, Clowns,
  and Funkeiros.

Older clients did not send a faction, so identified matches may be fewer than all historic
matches. If the event table is unavailable, the page explicitly labels its legacy E/B
fallback instead of presenting zero as complete data.

## Measure locally

```bash
npm run docs:check
npm run check:fast
npm run eval:site
npm run eval:telemetry
```

The full quality gate remains `node tools/eval/invariants.mjs`; it is more expensive and
depends on local assets. Store dated results in `KNOWN-BUGS.md`, not on this page.
