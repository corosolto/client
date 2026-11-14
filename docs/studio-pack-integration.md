# Studio asset pack verification and local installation

`scripts/studio-pack.mjs` verifies an immutable Studio asset-pack directory and can install it into a separate local library. It is a consumer-side trust boundary: a Studio validation result is an input to recheck, not permission to execute or load pack content.

The checked-in fixture at `tests/fixtures/studio-pack/valid/` exercises this contract with real bytes. Its ID is `contract-fixture`; it is not a Lajes release and is never loaded by the game. No Lajes runtime integration is enabled by this tool.

## Requirements and commands

Use Node.js 22.12 or newer and run `npm ci` after creating the worktree. The client keeps an exact copy of the public Studio `schemas/asset-pack.schema.json` at the same repository-relative path so verification is offline and deterministic. Schema updates must be copied verbatim from the public Studio change that defines them.

Verify a pack without writing anything:

```bash
npm run studio:pack:verify -- /path/to/pack/manifest.json
```

The package root defaults to the manifest's directory. Override it only when the manifest is stored beside, rather than inside, the package:

```bash
npm run studio:pack:verify -- /path/to/manifest.json \
  --package-root=/path/to/pack \
  --json
```

Install into an explicit library root:

```bash
npm run studio:pack:install -- /path/to/pack/manifest.json \
  --install-root="$HOME/.cache/coro-solto/studio-packs" \
  --json
```

The final location is `<install-root>/<kind>/<id>/<version>/`. The default schema can be replaced explicitly with `--schema=<file>` when testing a newer contract; production verification must use the reviewed, vendored schema. Kind, ID and semantic-version syntax are revalidated in code regardless of the selected schema, and every destination component is containment-checked before creation.

A successful JSON report contains only stable release facts:

```json
{
  "operation": "install",
  "status": "installed",
  "schemaVersion": 1,
  "kind": "map",
  "id": "contract-fixture",
  "version": "0.1.0",
  "fileCount": 9,
  "totalBytes": 499,
  "manifestSha256": "<64 lowercase hex characters>",
  "installPath": "map/contract-fixture/0.1.0"
}
```

`manifestSha256` is the digest of the exact manifest bytes and is the release pin for a future runtime change. Reports contain no timestamps, random identifiers or machine-specific absolute paths. Repeating an identical install returns `status: "unchanged"` and performs no writes. Exit code 0 means verified, 1 means rejected, and 2 means invalid CLI usage.

## Verification boundary

Verification fails closed on all of the following:

- malformed JSON or any Ajv draft 2020-12 schema violation;
- absolute, drive-qualified, NTFS alternate-stream, backslash, empty-segment, dot-segment or parent-traversal paths;
- Windows-forbidden characters, trailing dots/spaces, control characters and reserved DOS device names;
- duplicate paths, portable case/Unicode collisions and file/directory conflicts;
- case-insensitive reserved payload aliases for `manifest.json`;
- missing files, undeclared files, symbolic links and non-regular filesystem entries;
- any extension outside the explicit inert asset/data allowlist, including executable scripts, HTML/SVG, WebAssembly and native binaries;
- shebang, WebAssembly, ELF, PE, Mach-O or fat-binary signatures, and executable mode bits;
- a declared byte size that differs from the pre-open, opened or streamed file size;
- a SHA-256 digest that differs from the declared digest, or file identity/metadata changes during hashing.

The `INERT_ASSET_EXTENSIONS` allowlist covers GLB/GLTF/BIN and mesh data; KTX2/Basis/DDS/PNG/JPEG/WebP/AVIF/HDR/EXR textures; JSON/JSONL/TXT/Markdown/CSV/YAML/TOML/XML data; NAV/collision/spawn/region data; common audio and font formats; PDF evidence; and image/video previews. `.fixture` is included for the checked-in contract fixture. Any additional format requires an explicit reviewed client change rather than silent acceptance.

The complete directory tree must be declared. Files are processed in lexical package-path order, sizes and hashes are checked through no-follow file handles, and the hash is streamed and counted rather than loading a large asset into memory. A post-read stat checks that the opened file stayed stable. Unknown manifest fields remain inert data; the installer never imports, evaluates or launches pack content.

## Installation and immutability

Installation starts only after the source pack passes verification. The installer copies the sorted file inventory and the exact manifest bytes into a sibling staging directory, clears executable bits, and verifies the staged pack again. Only then does an atomic rename promote it to `<kind>/<id>/<version>`.

There is no force or overwrite mode. An existing destination succeeds only when its exact manifest and complete installed bytes still verify against the same release. A missing, modified or different release is rejected and left untouched. A stale `.${version}.staging` directory also blocks installation for manual inspection; the tool never deletes a directory it did not create. Failed installs remove only their own staging directory.

Installation does not copy anything into `public/`, change a map registry, generate a URL or modify runtime code.

## Exact future runtime promotion contract

A verified local install is not runtime approval. Promoting a genuine Lajes pack requires all of the following, in order, in a separate client change:

1. **Release identity.** The Studio coordinator supplies the actual immutable package root and manifest, Studio verification evidence, explicit release status, source revision, provenance and licensing. The release must be owner-approved and must not reference a Studio working branch. A review candidate remains unpromoted.
2. **Independent client verification.** Run the Studio validator and the client verifier against the same bytes. Install them into a local non-runtime library and verify the installed manifest again. Record `kind/map`, `id/lajes`, the exact semantic version, `manifestSha256` and the complete per-file hashes in the promotion PR.
3. **Complete map declaration.** The schema-v1 map manifest must declare package-relative `geometry`, `textures`, `lods`, `collision`, `navigation`, `spawns`, `regions` and `previews`. `lods.low` is mandatory. Every role path must resolve to exactly one verified `files` entry, every declared file must have exactly one owning map role (including a LOD or `evidence` role), and a path cannot be shared by multiple roles. Missing collision, navigation, spawn, region, preview or low-LOD data blocks promotion; the installer does not infer substitutes.
4. **Immutable publication.** Publish the exact approved binaries and manifest to owner-approved immutable storage. Do not commit private editable sources or generated binaries to public history, do not overwrite media while retaining its URL, and do not append ad-hoc `?v=` parameters. Runtime URLs must go through the client's `assetUrl()` path.
5. **Explicit runtime adapter.** A runtime PR must pin the expected kind, ID, version and manifest SHA-256, validate every map-role reference, and load only allowlisted data formats through the existing Three.js loaders. It must not dynamically import pack JavaScript or treat unknown fields as commands. Missing or divergent required content must fail visibly; a procedural or legacy scene must not be reported as the Studio pack.
6. **Complete consumer registration.** Register the promoted map in the real runtime map registry and update the consumer-facing map catalog in the same PR. Keep content-addressed asset URLs and generated documentation checks current. Do not wire an unavailable pack or add a speculative fallback.
7. **Runtime evidence.** Exercise the actual promoted bytes in the real game: boot, alley, commercial corner and accessible rooftop routes; geometry and textures; `low` LOD selection; collision; navigation; spawns and regions. Run the existing map, collision, navigation, spawn, asset-serving and gameplay gates, plus fixed-camera visual captures at the owner's 3:2 aspect ratio. Schema checks and local installation are not substitutes for these checks.
8. **Owner review and controlled release.** Obtain owner visual and gameplay review. Merge and deployment remain owner-controlled. Rollback is a revert of the explicit runtime pin and registration; old installed releases remain immutable.

Until every step has evidence for an actual Lajes release, the runtime stays unchanged.

## Consumer checks

Run the real CLI fixtures and failure mutants with:

```bash
npm run eval:studiopack
```

The suite covers valid verification, deterministic and idempotent installation, independent installed-pack verification, size and SHA-256 failures, parent, drive-path and NTFS-stream traversal, custom-schema install escape, portable manifest and Windows filename aliases, portable file/directory conflicts, invalid JSON and schemas, map-role references and ownership, executable JavaScript, VBScript, AppleScript, Lua, shebang and WebAssembly payloads, symlink escape, undeclared and duplicate entries, immutable destinations and invalid CLI usage. The `pr-fast` workflow runs the same suite.
