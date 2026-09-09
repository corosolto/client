"""Render articulated support-arm IK candidates for the pistol reload."""
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
BLEND = ROOT / "artifacts/viewmodels/pistol-hires-pilot/pistol-hires-pilot.blend"
OUT = Path("/tmp/pistol-reload-ik")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(BLEND))
    scene = bpy.context.scene
    rig = next(obj for obj in scene.objects if obj.type == "ARMATURE")
    rig.animation_data.action = bpy.data.actions["Reload"]
    scene.frame_set(0)
    bpy.context.view_layer.update()

    scene.render.resolution_x = 900
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100

    support_names = [bone.name for bone in rig.pose.bones if bone.name.startswith("L_")]
    baseline = {name: rig.pose.bones[name].matrix_basis.copy() for name in support_names}
    wrist = rig.pose.bones["L_wrist_02"]

    bpy.ops.object.empty_add(type="PLAIN_AXES")
    target = bpy.context.object
    target.name = "DebugSupportIK"
    constraint = wrist.constraints.new("IK")
    constraint.target = target
    constraint.chain_count = 3
    constraint.use_tail = False
    constraint.iterations = 64

    candidates = (
        ("contact", Vector((3.60, -12.65, 4.95))),
        ("down-left", Vector((0.80, -10.00, 3.80))),
        ("down-center", Vector((2.20, -10.50, 3.80))),
        ("down-right", Vector((4.20, -10.00, 3.80))),
        ("belt-left", Vector((0.20, -8.50, 3.40))),
        ("belt-center", Vector((2.20, -8.50, 3.40))),
        ("belt-right", Vector((4.20, -8.50, 3.40))),
    )
    for label, desired_head in candidates:
        for name, matrix in baseline.items():
            rig.pose.bones[name].matrix_basis = matrix
        bpy.context.view_layer.update()
        target.matrix_world.translation = rig.matrix_world @ desired_head
        bpy.context.view_layer.update()
        scene.render.filepath = str(OUT / f"{label}.png")
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
