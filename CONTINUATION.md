# Studio pack client integration continuation

## 2026-11-03: local trust boundary delivered for review

- Added the offline schema-v1 verifier and immutable local installer in `scripts/studio-pack.mjs`; no runtime file or map registry changed.
- Added the real nine-file `contract-fixture` map pack and consumer CLI tests for valid installs, deterministic output, bad sizes and hashes, traversal, invalid manifests, map-role ownership, executable content, symlinks, undeclared files and immutable destinations.
- Synced the conditional Studio map schema byte-for-byte after two strict-Ajv schema fixes landed in the public Studio worktree. Studio's own validator accepts the client fixture: nine files and hashes valid.
- Replaced executable-extension blacklisting with an inert asset/data allowlist. Portable paths reject Windows aliases and file/directory conflicts. Release identity and install containment are schema-independent. Opened, streamed and post-read file stability is checked.
- Independent adversarial review closed with no concrete remaining correctness or security finding after all reported issues were fixed and regressed.
- Final `npm run eval:studiopack`: 34/34 passed. Explicit CLI smoke installed the fixture, independently verified the installed manifest and returned `unchanged` on exact reinstall. Manifest SHA-256: `29191665e4297ea5d6acd024f30994a585211b1f103b9e4b44e1316b7e84122e`.
- `node --check scripts/studio-pack.mjs`, `npm run docs:check`, `git diff --check`, Studio validation and schema byte comparison passed.
- Added `studio:pack:verify`, `studio:pack:install` and `eval:studiopack`; `pr-fast` invokes the suite.
- Documented the exact future runtime promotion contract in `docs/studio-pack-integration.md`. The fixture is not a Lajes asset and no pack is presented as integrated.

## Prepush environment and baseline freshness

- The first push under Node 26.12.1 stopped at the existing `tp-origin` Node 22 requirement with `INFRA`; no project check ran in that attempt. The retry used Node 22.23.4 without bypassing hooks.
- The Node 22 gate then rejected `eval:weapon-matrix`. This branch had not changed any weapon, runtime, generator or matrix input. `node tools/gen-weapon-matrix.mjs` refreshed only the two stale source links (`game.js` 4273/4219 to 4278/4224), and its `--check` passed. This baseline documentation freshness fix is a separate commit.

## Pending external candidate

The Studio coordinator reports that `map/lajes/0.1.0` is still an unapproved, unpromoted candidate. The genuine private manifest/package root, pushed schema/release identity and Studio gauntlet evidence have not yet been delivered. Runtime promotion remains blocked and no runtime fallback is allowed.

This change belongs on the `feat/studio-pack-integration-20261103` feature branch in an unmerged PR. Merge, deployment and any future runtime promotion remain owner-controlled.
