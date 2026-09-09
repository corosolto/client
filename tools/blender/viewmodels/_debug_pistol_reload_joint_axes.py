"""Render single-axis shoulder/elbow rotations for reload pose selection."""
import math
from pathlib import Path

import bpy
from mathutils import Matrix


ROOT = Path(__file__).resolve().parents[3]
BLEND = ROOT / "artifacts/viewmodels/pistol-hires-pilot/pistol-hires-pilot.blend"
OUT = Path("/tmp/pistol-reload-joint-axes")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(BLEND))
    scene = bpy.context.scene
    rig = next(obj for obj in scene.objects if obj.type == "ARMATURE")
    rig.animation_data.action = bpy.data.actions["Reload"]
    scene.frame_set(0)
    bpy.context.view_layer.update()
    scene.render.resolution_x = 720
    scene.render.resolution_y = 480
    scene.render.resolution_percentage = 100
    names = [bone.name for bone in rig.pose.bones]
    baseline = {name: rig.pose.bones[name].matrix_basis.copy() for name in names}

    for bone_name in ("L_arm_01", "L_elbow_00"):
        for axis in "XYZ":
            for degrees in (-40, -25, 25, 40):
                for name, matrix in baseline.items():
                    rig.pose.bones[name].matrix_basis = matrix
                bone = rig.pose.bones[bone_name]
                bone.matrix_basis = bone.matrix_basis @ Matrix.Rotation(
                    math.radians(degrees), 4, axis
                )
                bpy.context.view_layer.update()
                scene.render.filepath = str(
                    OUT / f"{bone_name}_{axis}_{degrees:+03d}.png"
                )
                bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
