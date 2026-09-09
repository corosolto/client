"""Render support-hand offset candidates around the moving reload magazine."""
from __future__ import annotations

from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
BLEND = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "pistol-hires-pilot.blend"
OUT = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "reload-hand-offsets"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(BLEND))
    scene = bpy.context.scene
    rig = next(obj for obj in scene.objects if obj.type == "ARMATURE")
    rig.animation_data.action = bpy.data.actions["Reload"]
    scene.frame_set(18)
    bpy.context.view_layer.update()

    debug_material = bpy.data.materials.new("Reload_Magazine_Debug")
    debug_material.diffuse_color = (1.0, 0.02, 0.01, 1.0)
    debug_material.use_nodes = True
    debug_bsdf = debug_material.node_tree.nodes.get("Principled BSDF")
    debug_bsdf.inputs["Base Color"].default_value = (1.0, 0.02, 0.01, 1.0)
    debug_bsdf.inputs["Emission Color"].default_value = (1.0, 0.0, 0.0, 1.0)
    debug_bsdf.inputs["Emission Strength"].default_value = 0.8
    fresh = bpy.data.objects.get("coro_solto_project_pistol_fresh_magazine")
    old = bpy.data.objects.get("coro_solto_project_pistol_magazine")
    hands = bpy.data.objects.get("coro_solto_hires_pistol_hands")
    weapon = bpy.data.objects.get("coro_solto_project_pistol")
    fresh.data.materials.clear()
    fresh.data.materials.append(debug_material)

    scene.render.resolution_x = 900
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    arm = rig.pose.bones["L_arm_01"]
    baseline = arm.matrix.copy()
    fresh_bone = rig.pose.bones["CoroFreshMagazine"]
    fresh_baseline = fresh_bone.matrix_basis.copy()

    # Diagnostic isolation: prove which prop is moving and whether its
    # silhouette is merely occluded by the support hand.
    for obj in (hands, weapon, old):
        if obj is not None:
            obj.hide_render = True
    scene.render.filepath = str(OUT / "fresh-magazine-only.png")
    bpy.ops.render.render(write_still=True)
    for obj in (hands, weapon, old):
        if obj is not None:
            obj.hide_render = False
    candidates = (
        ("baseline", (0.0, 0.0, 0.0)),
        ("arm-x-pos-2", (2.0, 0.0, 0.0)),
        ("arm-x-pos-4", (4.0, 0.0, 0.0)),
        ("arm-x-neg-2", (-2.0, 0.0, 0.0)),
        ("arm-x-neg-4", (-4.0, 0.0, 0.0)),
        ("arm-y-pos-2", (0.0, 2.0, 0.0)),
        ("arm-y-pos-4", (0.0, 4.0, 0.0)),
        ("arm-y-neg-2", (0.0, -2.0, 0.0)),
        ("arm-y-neg-4", (0.0, -4.0, 0.0)),
        ("arm-z-pos-2", (0.0, 0.0, 2.0)),
        ("arm-z-pos-4", (0.0, 0.0, 4.0)),
        ("arm-z-neg-2", (0.0, 0.0, -2.0)),
        ("arm-z-neg-4", (0.0, 0.0, -4.0)),
        ("arm-xpos-zpos", (3.0, 0.0, 3.0)),
        ("arm-xneg-zneg", (-3.0, 0.0, -3.0)),
    )
    for label, xyz in candidates:
        fresh_bone.matrix_basis = fresh_baseline
        candidate = baseline.copy()
        candidate.translation += Vector(xyz)
        arm.matrix = candidate
        bpy.context.view_layer.update()
        scene.render.filepath = str(OUT / f"{label}.png")
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
