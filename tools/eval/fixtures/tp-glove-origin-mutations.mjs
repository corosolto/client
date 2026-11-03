/* Mutações S4 na fonte real: cardinalidade única e sem escrita do produto. */
export const MUTANTS = {
  "legacy-needs-body": {
    "failed": [
      "O1"
    ],
    "edits": [
      {
        "file": "glbchars.js",
        "from": "gloveHandleFor(baseGloveOrigin(id))?.preload()",
        "to": "getGloveHandle(id)?.preload()"
      }
    ]
  },
  "origin-key-char": {
    "failed": [
      "O1",
      "O2",
      "O3",
      "O4",
      "O5"
    ],
    "edits": [
      {
        "file": "glbchars.js",
        "from": "JSON.stringify([origin.kind, origin.character, origin.path, origin.kind === 'cosmetic' ? origin.sha256 : origin.revision])",
        "to": "origin.character"
      }
    ]
  },
  "ready-static": {
    "failed": [
      "O1",
      "O2",
      "O3",
      "O4",
      "O5"
    ],
    "edits": [
      {
        "file": "glbchars.js",
        "from": "get ready() { return !!_gloveMeshes.get(key); }",
        "to": "get ready() { return false; }"
      }
    ]
  },
  "request-no-join": {
    "failed": [
      "O5"
    ],
    "edits": [
      {
        "file": "glbchars.js",
        "from": "      if (_gloveRequests.has(key)) return _gloveRequests.get(key);",
        "to": ""
      }
    ]
  },
  "setter-live-origin": {
    "failed": [
      "O4"
    ],
    "edits": [
      {
        "file": "glbchars.js",
        "from": "attachGloves(model, id, gloveHandle)",
        "to": "attachGloves(model, id, getGloveHandle(def.id, def.skinId))"
      }
    ]
  },
  "game-handle-by-def": {
    "failed": [
      "O4"
    ],
    "edits": [
      {
        "file": "game.js",
        "from": "this.playerTP?.isGLB && !weaponChanged ? this.playerTP.gloveHandle : getGloveHandle(def.id, def.skinId)",
        "to": "getGloveHandle(def.id, def.skinId)"
      }
    ]
  },
  "cosmetic-sha-prefix": {
    "failed": [
      "O7"
    ],
    "edits": [
      {
        "file": "glbchars.js",
        "from": "source.sha256 === origin.sha256",
        "to": "source.sha256.startsWith(origin.sha256.slice(0, 10))"
      }
    ]
  },
  "origin-fallback-base": {
    "failed": [
      "O6",
      "O7"
    ],
    "edits": [
      {
        "file": "glbchars.js",
        "from": "return matches.length === 1 ? matches[0] : null;",
        "to": "return matches.length === 1 ? matches[0] : matches.length === 0 && origin.kind === 'cosmetic' ? glovePath(manifest, baseGloveOrigin(origin.character)) : null;"
      }
    ]
  },
  "duplicate-first": {
    "failed": [
      "O8"
    ],
    "edits": [
      {
        "file": "glbchars.js",
        "from": "return matches.length === 1 ? matches[0] : null;",
        "to": "return matches.length >= 1 ? matches[0] : null;"
      }
    ]
  }
};
export function mutateOriginSources(original, name) {
  if (!Object.hasOwn(MUTANTS, name)) throw Error('Unknown origin mutant');
  const output = { ...original };
  for (const { file, from, to } of MUTANTS[name].edits) {
    if (from === to || output[file].split(from).length !== 2) throw Error(`${name}/${file}: unique non-inert anchor required`);
    output[file] = output[file].replace(from, to);
  }
  return output;
}
