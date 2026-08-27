# CORO SOLTO automatic-family viewmodels

This asset-only pipeline inventories the rifle/SMG/LMG family and builds the
M4 pilot without changing gameplay or viewmodel runtime code.

```sh
/Applications/Blender.app/Contents/MacOS/Blender \
  --background \
  --python tools/blender/viewmodels/coro_auto/build_m4_pilot.py
```

The build writes the distributable GLB to
`public/models/viewmodels/coro-auto/m4-pilot.glb` and diagnostic frames to
`artifacts/viewmodels/coro-auto/m4-pilot/renders`. Generate each contact sheet
with the `animation-quality-gate` skill's `animation_contact_sheet.py`, using
the matching `idle_*`, `shoot_*`, or `reload_*` frame set.

The builder reads the accepted rifle rig from the advanced source tree, deletes
every source weapon object, then imports and splits the project's own
`public/models/weapons/m4.glb`. It exports only the rig, project anatomy, M4
body, two M4 magazine copies, and the marked 3:2 camera.

Do not propagate this registration while `visual_qa.md` says propagation is
rejected. Structural export checks do not override hand-contact failures.
