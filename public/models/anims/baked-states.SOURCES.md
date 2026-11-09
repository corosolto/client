# Estados assados por corpo

Gerado por `tools/import-baked-states.mjs` a partir dos packs meshy-28 e do QA Studio. Os arquivos `<id>.glb` preservam meshopt + rotações int16; as pastas `<id>/` guardam o fallback por estado.

- 41 BODIES substituídos; 33 excluídos por introduzir tipo novo de violação QA.
- Nenhum arquivo de `public/models/skins/` participa deste pipeline.
- Piso mínimo aceito: -3 cm; quadril: limite do Studio por estado (1,08× ou fonte +0,08).
- A cuca usa `--passive-knees`, mas o pacote final introduz `hips`/`float`; permanece nos clipes atuais.

Fontes Mixamo/Quaternius e licenças seguem a procedência registrada nos manifests do Studio. O índice `baked-states.json` contém hashes, velocidades, números de QA e todas as exclusões.
