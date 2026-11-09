# Estados assados por corpo

Gerado por `tools/import-baked-states.mjs` a partir dos packs meshy-28 e do QA Studio. Os arquivos `<id>.glb` preservam meshopt + rotações int16; as pastas `<id>/` guardam o fallback por estado.

- 0 BODIES substituídos; 74 excluídos por pelo menos uma métrica QA pior.
- Nenhum arquivo de `public/models/skins/` participa deste pipeline.
- Piso mínimo aceito: -3 cm; quadril: limite do Studio por estado (1,08× ou fonte +0,08).
- A cuca permanece fora: o pacote final piora métricas QA apesar de melhorar piso e quadril.

Fontes Mixamo/Quaternius e licenças seguem a procedência registrada nos manifests do Studio. O índice `baked-states.json` contém hashes, velocidades, números de QA e todas as exclusões.
