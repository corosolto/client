"""Render wrist-rotation candidates at the fresh-magazine contact frame."""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Matrix


ROOT = Path(__file__).resolve().parents[3]
BLEND = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "pistol-hires-pilot.blend"
OUT = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "wrist-grip-calibration"
OUT.mkdir(parents=True, exist_ok=True)


def main() -> None:
    bpy.ops.wm.open_mainfile(filepath=str(BLEND))
    scene = bpy.context.scene
    scene.render.resolution_percentage = 50
    rig = bpy.data.objects["coro_solto_hires_pistol_rig"]
    rig.animation_data.action = bpy.data.actions["Reload"]
    material = bpy.data.materials.get("CoroSolto_Pistol_Mag")
    if material and material.use_nodes:
        material.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (
            0.16, 0.18, 0.20, 1.0
        )

    variants = (
        ("base", (0, 0, 0)),
        ("xp20", (20, 0, 0)),
        ("xn20", (-20, 0, 0)),
        ("yp20", (0, 20, 0)),
        ("yn20", (0, -20, 0)),
        ("zp20", (0, 0, 20)),
        ("zn20", (0, 0, -20)),
        ("yp35", (0, 35, 0)),
        ("yn35", (0, -35, 0)),
    )
    for label, rotations in variants:
        scene.frame_set(18)
        bpy.context.view_layer.update()
        wrist = rig.pose.bones["L_wrist_02"]
        for axis, degrees in zip("XYZ", rotations):
            wrist.matrix_basis = (
                wrist.matrix_basis
                @ Matrix.Rotation(math.radians(degrees), 4, axis)
            )
        bpy.context.view_layer.update()
        scene.render.filepath = str(OUT / f"{label}.png")
        bpy.ops.render.render(write_still=True)

    print(f"PISTOL_RELOAD_WRIST_CALIBRATION {OUT}")


if __name__ == "__main__":
    main()
