"""Render support-finger chain candidates at the fresh-magazine contact frame."""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
BLEND = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "pistol-hires-pilot.blend"
OUT = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "finger-chain-calibration"
OUT.mkdir(parents=True, exist_ok=True)

FINGER_CHAINS = (
    ("L_point1_07", "L_point2_08", "L_point3_09"),
    ("L_middle1_011", "L_middle2_012", "L_middle3_013"),
    ("L_ring1_016", "L_ring2_017", "L_ring3_018"),
    ("L_pink1_020", "L_pink2_021", "L_pink3_022"),
)
THUMB_CHAIN = ("L_thumb1_03", "L_thumb2_04", "L_thumb3_05")


def rotate_chain(rig: bpy.types.Object, chain: tuple[str, ...], axis: str,
                 degrees: tuple[float, ...]) -> None:
    for bone_name, amount in zip(chain, degrees):
        bone = rig.pose.bones[bone_name]
        bone.matrix_basis = (
            bone.matrix_basis
            @ Matrix.Rotation(math.radians(amount), 4, axis)
        )


def main() -> None:
    bpy.ops.wm.open_mainfile(filepath=str(BLEND))
    scene = bpy.context.scene
    scene.render.resolution_percentage = 60
    rig = bpy.data.objects["coro_solto_hires_pistol_rig"]
    rig.animation_data.action = bpy.data.actions["Reload"]

    # Evaluate the actual reload contact once, then detach the action.  Keeping
    # the action active caused Blender to restore its F-curves immediately
    # before every render, silently erasing the diagnostic finger rotations.
    scene.frame_set(18)
    bpy.context.view_layer.update()
    frozen_pose = {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}
    rig.animation_data.action = None

    material = bpy.data.materials.get("CoroSolto_Pistol_Mag")
    if material and material.use_nodes:
        bsdf = material.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.22, 0.24, 0.28, 1.0)

    variants = (
        ("base", "Y", (0, 0, 0), (0, 0, 0)),
        ("yp_soft", "Y", (10, 28, 20), (-8, 18, 12)),
        ("yp_medium", "Y", (18, 45, 32), (-14, 28, 18)),
        ("yp_distal", "Y", (5, 48, 42), (-8, 30, 24)),
        ("yn_medium", "Y", (-18, -45, -32), (14, -28, -18)),
        ("xp_medium", "X", (18, 45, 32), (-14, 28, 18)),
        ("xn_medium", "X", (-18, -45, -32), (14, -28, -18)),
        ("zp_medium", "Z", (18, 45, 32), (-14, 28, 18)),
        ("zn_medium", "Z", (-18, -45, -32), (14, -28, -18)),
    )
    for label, axis, finger_degrees, thumb_degrees in variants:
        for bone in rig.pose.bones:
            bone.matrix_basis = frozen_pose[bone.name].copy()
        # Show the calibrated fresh magazine in the middle of the grip.  This
        # is the selected delta relative to the old production contact.
        fresh_mag = rig.pose.bones["CoroFreshMagazine"]
        fresh_mag.matrix_basis = (
            Matrix.Translation(Vector((-2.0, 0.0, 4.0)))
            @ frozen_pose["CoroFreshMagazine"]
        )
        bpy.context.view_layer.update()
        for chain in FINGER_CHAINS:
            rotate_chain(rig, chain, axis, finger_degrees)
        rotate_chain(rig, THUMB_CHAIN, axis, thumb_degrees)
        bpy.context.view_layer.update()
        scene.render.filepath = str(OUT / f"{label}.png")
        bpy.ops.render.render(write_still=True)

    print(f"PISTOL_RELOAD_FINGER_CHAIN_CALIBRATION {OUT}")


if __name__ == "__main__":
    main()
