"""Render first-person pistol camera candidates without altering the asset."""
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / "camera-angles"
GLB = ROOT / "public" / "models" / "viewmodels" / "coro" / "pistol-hires.glb"
# glTF does not preserve Blender's lens shift.  Every candidate therefore uses
# a real camera transform and a zero-shift optical centre so the winning frame
# can be reproduced exactly by Three.js after applying the exported camera
# inverse.  Target X controls lower-right composition without flattening the
# pistol back into a side profile; location X controls the actual view angle.
CAMERAS = tuple(
    (
        f"cx20-cy36-tx{target_x:+03.0f}-tz{target_z:02.0f}",
        (20.0, 36.0, 24.0),
        (target_x, -19.0, target_z),
        46.0,
    )
    for target_x in (12.0, 14.0, 16.0)
    for target_z in (14.0, 17.0)
)
ACTION_FRAMES = (("Idle", 0), ("Reload", 10), ("Reload", 14), ("Reload", 21), ("Reload", 25))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for old_render in OUT.glob("*.png"):
        old_render.unlink()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(GLB))
    scene = bpy.context.scene
    scene.render.resolution_x = 600
    scene.render.resolution_y = 400
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    world = bpy.data.worlds.new("Inspection_Pistol_World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.09, 0.11, 0.14, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.2
    scene.world = world
    light_data = bpy.data.lights.new("Inspection_Pistol_Key", "AREA")
    light_data.energy = 4500
    light_data.size = 10
    light = bpy.data.objects.new("Inspection_Pistol_Key", light_data)
    bpy.context.collection.objects.link(light)
    light.location = (-7.0, -7.0, 28.0)
    rig = bpy.data.objects["coro_solto_hires_pistol_rig"]
    idle = next(action for action in bpy.data.actions if action.name.lower().startswith("idle"))
    rig.animation_data.action = idle
    scene.frame_set(0)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in (candidate for candidate in scene.objects if candidate.type == "MESH"):
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
        if points:
            minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
            maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
            print(f"PISTOL_BOUNDS {obj.name} min={tuple(round(value, 3) for value in minimum)} max={tuple(round(value, 3) for value in maximum)}")
        evaluated.to_mesh_clear()
    # Never reuse the camera imported from the GLB here.  The glTF exporter can
    # sample scene objects into the armature actions; after reimport that camera
    # may be parented, constrained, or animated indirectly.  A fresh root-level
    # camera makes every candidate a genuinely independent physical transform
    # and exactly matches the static camera node consumed by Three.js.
    camera_data = bpy.data.cameras.new("Pistol_Physical_Camera_Inspection")
    camera = bpy.data.objects.new("Pistol_Physical_Camera_Inspection", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    for label, location, target, lens in CAMERAS:
        camera.location = location
        camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
        camera.data.lens = lens
        camera.data.sensor_width = 36.0
        camera.data.shift_x = 0.0
        camera.data.shift_y = 0.0
        bpy.context.view_layer.update()
        evaluated = camera.evaluated_get(bpy.context.evaluated_depsgraph_get())
        world_location = evaluated.matrix_world.translation
        print(
            f"PISTOL_CAMERA {label} raw={tuple(round(value, 3) for value in camera.location)} "
            f"world={tuple(round(value, 3) for value in world_location)}"
        )
        for action_name, frame in ACTION_FRAMES:
            rig.animation_data.action = bpy.data.actions[action_name]
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            scene.render.filepath = str(OUT / f"{label}-{action_name.lower()}-{frame:03d}.png")
            bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
