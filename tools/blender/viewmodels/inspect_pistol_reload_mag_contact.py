"""Render fresh-magazine registration candidates against the support palm."""
from __future__ import annotations

from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[3]
BLEND = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "pistol-hires-pilot.blend"
OUT = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "mag-contact-calibration-wide"
OUT.mkdir(parents=True, exist_ok=True)


def main() -> None:
    bpy.ops.wm.open_mainfile(filepath=str(BLEND))
    scene = bpy.context.scene
    scene.render.resolution_percentage = 60
    rig = bpy.data.objects["coro_solto_hires_pistol_rig"]
    rig.animation_data.action = bpy.data.actions["Reload"]
    # Frame 14 is the fully extracted, on-screen grip.  Frame 18 is deliberately
    # below the camera for the hidden old/new magazine swap and therefore cannot
    # be used to judge finger contact.
    scene.frame_set(14)
    bpy.context.view_layer.update()
    # Rendering re-evaluates active action F-curves and used to overwrite every
    # candidate transform below.  Freeze the evaluated production pose first,
    # then detach the action so each delta is actually visible in the render.
    frozen_pose = {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}
    rig.animation_data.action = None
    for bone in rig.pose.bones:
        bone.matrix_basis = frozen_pose[bone.name]
    bpy.context.view_layer.update()

    material = bpy.data.materials.get("CoroSolto_Pistol_Mag")
    if material and material.use_nodes:
        bsdf = material.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.9, 0.04, 0.45, 1.0)

    variants = (
        ("base", (0.0, 0.0, 0.0)),
        ("xneg1", (-1.0, 0.0, 0.0)),
        ("xneg2", (-2.0, 0.0, 0.0)),
        ("xneg3", (-3.0, 0.0, 0.0)),
        ("xneg1_yneg1", (-1.0, -1.0, 0.0)),
        ("xneg2_yneg1", (-2.0, -1.0, 0.0)),
        ("xneg3_yneg1", (-3.0, -1.0, 0.0)),
        ("xneg2_zneg1", (-2.0, 0.0, -1.0)),
        ("xneg2_zpos1", (-2.0, 0.0, 1.0)),
    )
    for label, delta in variants:
        # Frame 14 shows the spent magazine.  The fresh prop is hidden until
        # the below-frame swap at frame 18, so moving CoroFreshMagazine here
        # produced a misleading calibration grid with an unchanged visible
        # contact.  Move the actually rendered prop instead.
        visible_mag = rig.pose.bones["CoroMagazine"]
        visible_mag.matrix_basis = Matrix.Translation(Vector(delta)) @ frozen_pose["CoroMagazine"]
        bpy.context.view_layer.update()
        scene.render.filepath = str(OUT / f"{label}.png")
        bpy.ops.render.render(write_still=True)

    print(f"PISTOL_RELOAD_MAG_CONTACT_CALIBRATION {OUT}")


if __name__ == "__main__":
    main()
