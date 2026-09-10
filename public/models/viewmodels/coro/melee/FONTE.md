# Faca melee Coro Solto

`knife-hires.glb` é gerado por
`tools/blender/viewmodels/knife_melee/build.py`.

- Geometria e material visíveis da arma: `public/models/weapons/knife.glb`.
- Mãos, antebraços, mangas e rig: `public/models/viewmodels/coro/pistol-hires.glb`,
  asset autorado no projeto.
- Referência local de movimento: `~/Downloads/knife_animated.glb`, usada apenas
  para estudar ritmo e composição. O builder não a importa e ela é excluída do
  export.

O manifesto reproduzível em
`artifacts/viewmodels/knife-melee-pilot/reference_manifest.json` registra hashes e
declara explicitamente que nenhuma geometria, textura, material ou skin doadora é
exportada.
