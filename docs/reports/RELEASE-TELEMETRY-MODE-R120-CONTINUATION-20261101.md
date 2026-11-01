# Release telemetry mode R120

Objective: continue the visual consistency/release mission (CS 1.6 gameplay, uniformity and animation), preserving contributor ownership, private assets and the separation between technical checks, runtime evidence, review and release. Flavio/#1158 remains excluded. This checkpoint addresses only the client telemetry defect blocking backend synchronization; Root owns independent review, integration, runtime and release decisions.

## Checkpoint and causal source

Isolated branch `codex/release-telemetry-mode-r120-20261101`, base `b808e1456db974bb8552ad86cfb804e96f7787bb`. Released alpha.134 is `f3e4310114f9bd2c739f1e7207c11b55dac7456a`, after main merge `59580703c606a3489bea691b3bb4f609bb062131`. The released object was absent locally, so Root authorized b808 without fetch. Baseline `public/js/main.js` is byte-identical to released R: SHA-256 `39408d6e8f5a7b278cd7fb43a53c07a7035d87b9651f45b4c607908829f40b10`. The candidate retains b808 release metadata and requires Root integration against current main.

R114 closed before implementation: release run 41286668380 published alpha.134 once; backend sync-nodes 41286788331 failed TL12 before pin/image/rollout (backend issue 200). `Game.arena` is set by the existing arena query, while all three client emitters reduced mode to ctf/rounds. The backend routes already accept arena. No backend oracle defect was demonstrated. The earlier PR1188 merge has an actual BYPASS rule-suite 4840057636 for a changes-requested review; this checkpoint does not change or conceal that governance result.

The product change is one local `modoTelemetria(g)` helper with arena > ctf > rounds, called by the real `sendTelemetry`, `sendGameStarted` and `sendMatchEvent` payload fields. Consent, testMode, absent-game guards, transport and dedupe stay intact. Arena is not activated and no UI/policy/dependency/configuration changes are included.

## Authorship and rejected result

One bounded OMP call used `zai/glm-5.3`, thinking low: 2026-11-01 08:10:47.326087Z to 08:13:18.081849Z, exit 0, 150.754 seconds. GLM authored the product logic, new real-emitter checker and initial ledger. Full raw `R120-RAW.jsonl` (1,361,247 bytes, SHA-256 `2a47f29438ddb2948b68a385257867117153540ff696e9c592a43916ec2a749b`) and author files were frozen before Native checks/edits in `R120-author-freeze/` and `R120-FROZEN.json`.

The initial authored checker was rejected: actual exit 2, zero assertions, `Illegal return statement` from its VM envelope (`R120-AUTHOR-CHECK-INITIAL.json`). It is not a semantic baseline failure. Native corrected that envelope only. Native also expanded partial patch contexts to exact existing source lines; the helper and three product substitutions remain GLM logic. Original and normalized patches are retained separately. With Root's explicit lease extension, Native updated the existing DAU instrument to extract/inject the real helper and reject a missing callee, preserving DT1-DT7 and every existing mutant. Native wrote this final ledger. No second model call was made.

## Validated milestones

All receipts below are in `/Volumes/Zenith/Projects/game/corosolto/csbrasil/audits/2026-10-31-visual-consistency/` with prefix `R120`.

- Before product application, the corrected checker executed real baseline emitter bodies on Node 22.23.4 and 26.12.1: exit 1, six measured Arena payload mismatches (arena became rounds or ctf), no infra failure. `R120-BASELINE-RECEIPT.json` binds the untouched baseline hash.
- After applying the frozen GLM logic, both Nodes passed 24 scenarios / 60 assertions: 12 mode scenarios, nine consent/testMode/absent-game guards and three repeat/dedupe scenarios. Every mode scenario checks capture count, route, event and payload mode. `R120-AFTER-RECEIPT.json` binds candidate main SHA-256 `39324fcd1b63272a746541e70304887f88fd4cb84227d000d32c813b87197a82`.
- Four mutations of the actual extracted functions produced semantic exit 1 on both Nodes, with exact application counts: legacy mode fields (six failures), ctf before arena (three), only game_started legacy (two), removed consent guards (three). The legacy mutant retains the helper and the literal required by TL12, proving the new checker measures callers/payloads rather than that literal alone.
- The existing DAU instrument passed both baseline and candidate on both Nodes; all seven existing mutants produced semantic exit 1 without unexpected throws. An external candidate fixture with the real callee removed failed DT3 explicitly on both Nodes. See `R120-DAU-RECEIPT.json` and `R120-DAU-MISSING-CALLEE-RECEIPT.json`.
- Main/new-check syntax, existing telemetry transport TT1-TT6, and scoped whitespace checks passed on both Nodes (`R120-SCOPED-CHECKS.json`). The helper-aware DAU syntax is included in the final check receipt. No transport or backend source was edited.

## Limits and next concrete step

These are offline source-extracted payload measurements with a captured transport; they do not prove live network delivery, production DB writes, multiplayer rollout or browser behavior. The brace extractor is scoped to the inspected function bodies, not a general JavaScript parser. No browser/server/build/full316/full deploy gate/backend gate/GitHub mutation/push/deploy was run here. No other worktree was edited. Shared progress files and owner branches remain untouched.

The new checker is directly runnable as `node tools/eval/telemetry-mode-check.mjs` (optional separate arguments `--source PATH` / `--mutante NAME`). It is not wired into package/CI aliases in this lease. Root should integrate its execution if adopting the candidate. Root must independently review all four changed paths, rebind onto current release/main metadata, run the authorized integration gates, and resume backend sync without blindly repeating the alpha.134 bump. Until then the candidate is local only; release/backend acceptance and runtime verification remain pending. Final commit/source/diff/check hashes are recorded externally in `R120-FINAL.json` and `R120-MANIFEST.json` after the signed-off checkpoint.
