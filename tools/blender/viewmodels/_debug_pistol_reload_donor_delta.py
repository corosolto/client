"""Render donor-relative support-arm poses on the Coro Solto pistol setup.

This diagnostic never exports or overwrites the production asset.  It compares
two matrix-composition orders so the useful shoulder/elbow trajectory from the
CC0 reference can be reused without importing the reference weapon or its
absolute first-person framing.
"""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[3]
BUILDER_PATH = ROOT / "tools/blender/viewmodels/build_pistol_hires_pilot.py"
OUT = Path("/tmp/pistol-reload-donor-delta")


def load_builder():
    spec = spec_from_file_location("pistol_builder", BUILDER_PATH)
    module = module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def main() -> None:
    builder = load_builder()
    OUT.mkdir(parents=True, exist_ok=True)
    builder.setup_scene()
    rig, arms, weapon_control, mag_control, source = builder.load_donor()
    builder.add_control_bones(rig)

    idle_pose, _, _ = builder.sample_source(
        rig, source, weapon_control, mag_control, builder.IDLE_SOURCE
    )
    support_pose, _, _ = builder.sample_source(
        rig, source, weapon_control, mag_control, builder.IDLE_SUPPORT_SOURCE
    )
    for bone_name, matrix in support_pose.items():
        if bone_name.startswith(builder.SUPPORT_PREFIX):
            idle_pose[bone_name] = matrix.copy()
    builder.register_support_grip(rig, idle_pose)
    builder.register_trigger_contact(idle_pose)

    donor_base, _, _ = builder.sample_source(
        rig, source, weapon_control, mag_control, builder.IDLE_SUPPORT_SOURCE
    )
    donor_frames = {
        frame: builder.sample_source(rig, source, weapon_control, mag_control, frame)[0]
        for frame in (48, 56, 64, 72, 76, 84, 92, 100, 104)
    }

    builder.fit_project_weapon(rig)
    builder.remove_donor_weapon(rig, arms)
    builder.setup_camera_and_lights()
    scene = bpy.context.scene
    scene.render.resolution_x = 900
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    rig.animation_data.action = None

    transfer = ("L_arm_01", "L_elbow_00", "L_wrist_02")
    for mode in ("post", "pre"):
        for donor_frame, donor_pose in donor_frames.items():
            for bone in rig.pose.bones:
                bone.matrix_basis = idle_pose.get(bone.name, builder.Matrix.Identity(4))
            for name in transfer:
                delta = donor_base[name].inverted() @ donor_pose[name]
                if mode == "post":
                    rig.pose.bones[name].matrix_basis = idle_pose[name] @ delta
                else:
                    rig.pose.bones[name].matrix_basis = delta @ idle_pose[name]
            # Use the reference finger articulation only after the hand reaches
            # the magazine; absolute arm framing remains project-authored.
            if donor_frame >= 72:
                for name, matrix in donor_pose.items():
                    if name.startswith("L_") and name not in transfer:
                        rig.pose.bones[name].matrix_basis = matrix.copy()
            bpy.context.view_layer.update()
            scene.render.filepath = str(OUT / f"{mode}_{donor_frame:03d}.png")
            bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
