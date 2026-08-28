"""Find camera-safe FK shoulder/elbow poses for the project pistol reload."""
import math
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix


ROOT = Path(__file__).resolve().parents[3]
BLEND = ROOT / "artifacts/viewmodels/pistol-hires-pilot/pistol-hires-pilot.blend"
OUT = Path("/tmp/pistol-reload-fk-search")


def apply_pose(rig, baseline, arm_xyz, elbow_xyz, wrist_xyz=(0, 0, 0)):
    for name, matrix in baseline.items():
        rig.pose.bones[name].matrix_basis = matrix.copy()
    for bone_name, degrees in (
        ("L_arm_01", arm_xyz),
        ("L_elbow_00", elbow_xyz),
        ("L_wrist_02", wrist_xyz),
    ):
        bone = rig.pose.bones[bone_name]
        for axis, value in zip("XYZ", degrees):
            bone.matrix_basis = bone.matrix_basis @ Matrix.Rotation(
                math.radians(value), 4, axis
            )
    bpy.context.view_layer.update()


def screen(scene, camera, rig, bone_name):
    bone = rig.pose.bones[bone_name]
    world = rig.matrix_world @ bone.matrix.translation
    p = world_to_camera_view(scene, camera, world)
    return (p.x, p.y, p.z)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(BLEND))
    scene = bpy.context.scene
    camera = bpy.data.objects["Pistol_Hires_FP_Camera"]
    rig = bpy.data.objects["coro_solto_hires_pistol_rig"]
    rig.animation_data.action = bpy.data.actions["Reload"]
    scene.frame_set(0)
    bpy.context.view_layer.update()
    baseline = {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}
    rig.animation_data.action = None
    base_wrist = screen(scene, camera, rig, "L_wrist_02")
    base_elbow = screen(scene, camera, rig, "L_elbow_00")
    print("BASE", base_wrist, base_elbow)

    # Lower-left and under-pistol targets in normalized camera coordinates.
    targets = {
        "belt": (0.30, 0.05),
        "insert": (0.40, 0.18),
    }
    candidates = {name: [] for name in targets}
    arm_values = (-45, -30, -15, 0, 15, 30, 45)
    elbow_values = (-75, -50, -25, 0, 25, 50, 75)
    # The rig axes are not semantic, so search all three local channels while
    # keeping a moderate range that cannot stretch or invert the limb.
    for ax in arm_values:
        for ay in arm_values:
            for az in arm_values:
                for ex in elbow_values:
                    for ey in (-50, -25, 0, 25, 50):
                        for ez in (-50, -25, 0, 25, 50):
                            apply_pose(rig, baseline, (ax, ay, az), (ex, ey, ez))
                            wx, wy, wz = screen(scene, camera, rig, "L_wrist_02")
                            exs, eys, ezs = screen(scene, camera, rig, "L_elbow_00")
                            if wz <= 0 or ezs <= 0:
                                continue
                            if not (-0.1 <= wx <= 1.1 and -0.15 <= wy <= 0.75):
                                continue
                            # Penalize an elbow above/inside the weapon and
                            # extreme projected forearm lengths.
                            limb = math.hypot(wx - exs, wy - eys)
                            safety = max(0.0, eys - 0.34) * 4.0
                            safety += max(0.0, 0.05 - limb) * 8.0
                            safety += max(0.0, limb - 0.48) * 5.0
                            params = ((ax, ay, az), (ex, ey, ez))
                            for name, (tx, ty) in targets.items():
                                score = math.hypot(wx - tx, wy - ty) + safety
                                candidates[name].append((score, params, (wx, wy), (exs, eys)))

    scene.render.resolution_x = 720
    scene.render.resolution_y = 480
    scene.render.resolution_percentage = 100
    for target, values in candidates.items():
        values.sort(key=lambda item: item[0])
        # Keep diverse shoulder solutions, otherwise the top results differ
        # only by an invisible elbow twist.
        chosen = []
        seen = set()
        for value in values:
            arm, elbow = value[1]
            key = tuple(round(v / 15) for v in arm)
            if key in seen:
                continue
            seen.add(key)
            chosen.append(value)
            if len(chosen) == 12:
                break
        for index, (score, (arm, elbow), wrist, elbow_screen) in enumerate(chosen):
            apply_pose(rig, baseline, arm, elbow)
            scene.render.filepath = str(OUT / f"{target}-{index:02d}.png")
            bpy.ops.render.render(write_still=True)
            print(target, index, round(score, 4), arm, elbow, wrist, elbow_screen)


if __name__ == "__main__":
    main()
