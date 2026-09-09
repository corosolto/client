"""Report the donor pistol finger motion so retargeting uses measured deltas."""
from __future__ import annotations

import math
from pathlib import Path

import bpy


DONOR = Path.home() / "Downloads" / "fps_pistol_animated.glb"
FINGERS = ("R_point1_031", "R_point2_032", "R_point3_033")


def main() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(DONOR))
    rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    source = next(iter(bpy.data.actions))
    rig.animation_data_create()
    rig.animation_data.action = source

    bpy.context.scene.frame_set(160)
    bpy.context.view_layer.update()
    bases = {name: rig.pose.bones[name].matrix_basis.copy() for name in FINGERS}
    print(f"SOURCE action={source.name} range={tuple(source.frame_range)}")
    for frame in range(160, 185):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        values = []
        for name in FINGERS:
            current = rig.pose.bones[name].matrix_basis.copy()
            delta = bases[name].inverted() @ current
            loc, quat, scale = delta.decompose()
            axis, angle = quat.to_axis_angle()
            values.append(
                f"{name}:deg={math.degrees(angle):.3f} "
                f"axis=({axis.x:.3f},{axis.y:.3f},{axis.z:.3f}) "
                f"loc=({loc.x:.4f},{loc.y:.4f},{loc.z:.4f})"
            )
        print(f"SOURCE frame={frame} | " + " | ".join(values))


if __name__ == "__main__":
    main()
