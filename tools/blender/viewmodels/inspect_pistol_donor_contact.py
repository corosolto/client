"""Measure the donor magazine-to-hand contact used by the pistol pilot."""
from pathlib import Path

import bpy


DONOR = Path.home() / "Downloads" / "fps_pistol_animated.glb"


def main() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(DONOR))
    rig = next(obj for obj in bpy.data.objects if obj.type == "ARMATURE")
    magazine = bpy.data.objects["clip"]
    action = next(iter(bpy.data.actions))
    rig.animation_data_create()
    rig.animation_data.action = action
    for frame in (48, 56, 64, 72, 76, 80, 88, 96, 104):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        wrist = rig.pose.bones["L_wrist_02"].matrix.translation.copy()
        magazine_local = rig.matrix_world.inverted() @ magazine.matrix_world
        offset = magazine_local.translation - wrist
        print(
            f"DONOR_CONTACT frame={frame} wrist={tuple(round(v, 3) for v in wrist)} "
            f"mag={tuple(round(v, 3) for v in magazine_local.translation)} "
            f"offset={tuple(round(v, 3) for v in offset)}"
        )


if __name__ == "__main__":
    main()
