from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
BLEND = ROOT / "artifacts/viewmodels/pistol-hires-pilot/pistol-hires-pilot.blend"

bpy.ops.wm.open_mainfile(filepath=str(BLEND))
scene = bpy.context.scene
rig = next(obj for obj in scene.objects if obj.type == "ARMATURE")
rig.animation_data.action = bpy.data.actions["Reload"]
camera = scene.camera


def projected_mesh_center(name):
    obj = bpy.data.objects[name]
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        center = sum(
            (evaluated.matrix_world @ vertex.co for vertex in mesh.vertices), Vector()
        ) / len(mesh.vertices)
    finally:
        evaluated.to_mesh_clear()
    ndc = world_to_camera_view(scene, camera, center)
    return tuple(round(value, 3) for value in (ndc.x, ndc.y, ndc.z))


for frame in (0, 7, 10, 14, 15, 18, 21, 24, 26, 33):
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    fresh = bpy.data.objects["coro_solto_project_pistol_fresh_magazine"]
    old = bpy.data.objects["coro_solto_project_pistol_magazine"]
    wrist = rig.pose.bones["L_wrist_02"]
    palm = rig.pose.bones["L_arm_01"]
    print(
        "FRAME", frame,
        "old", tuple(round(v, 3) for v in old.matrix_world.translation),
        "fresh", tuple(round(v, 3) for v in fresh.matrix_world.translation),
        "wrist", tuple(round(v, 3) for v in wrist.matrix.translation),
        "arm", tuple(round(v, 3) for v in palm.matrix.translation),
        "old_bone", tuple(round(v, 3) for v in rig.pose.bones["CoroMagazine"].matrix.translation),
        "fresh_bone", tuple(round(v, 3) for v in rig.pose.bones["CoroFreshMagazine"].matrix.translation),
        "old_scale", tuple(round(v, 3) for v in rig.pose.bones["CoroMagazine"].scale),
        "fresh_scale", tuple(round(v, 3) for v in rig.pose.bones["CoroFreshMagazine"].scale),
    )
    print(
        "PROJECT", frame,
        "old", projected_mesh_center("coro_solto_project_pistol_magazine"),
        "fresh", projected_mesh_center("coro_solto_project_pistol_fresh_magazine"),
        "hands", projected_mesh_center("coro_solto_hires_pistol_hands"),
    )
