"""Renderiza idle/walk/crouch da Lenda para inspeção visual pré-integração."""
import pathlib
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(args) != 2:
    raise SystemExit("uso: script -- posed-source.glb out-dir")
source = pathlib.Path(args[0]).resolve()
out = pathlib.Path(args[1]).resolve()
out.mkdir(parents=True, exist_ok=True)


def point_at(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
scene = bpy.context.scene
armature = next(obj for obj in scene.objects if obj.type == "ARMATURE")
helpers = {bone.custom_shape for bone in armature.pose.bones if bone.custom_shape is not None}
meshes = [obj for obj in scene.objects if obj.type == "MESH" and obj not in helpers]
vertices = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
minimum = Vector(tuple(min(vertex[i] for vertex in vertices) for i in range(3)))
maximum = Vector(tuple(max(vertex[i] for vertex in vertices) for i in range(3)))
center = (minimum + maximum) * 0.5
span = maximum - minimum

scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.world = bpy.data.worlds.new("LendaPoseWorld")
scene.world.color = (0.025, 0.030, 0.045)
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = "ORTHO"
camera.data.ortho_scale = max(span) * 1.18
camera.location = center + Vector((0.0, -4.0, 0.0))
point_at(camera, center)
scene.camera = camera
for location, energy, size in [
    (center + Vector((-2.2, -2.5, 3.2)), 1250, 4.0),
    (center + Vector((2.4, -0.8, 1.8)), 850, 3.0),
    (center + Vector((0.0, 2.0, 2.2)), 600, 2.5),
]:
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.size = size
    point_at(light, center)

armature.animation_data_create()
for action_name, frame in [("idle", 20), ("walk", 15), ("crouch", 100)]:
    action = bpy.data.actions.get(action_name)
    if action is None:
        raise RuntimeError(f"ação ausente: {action_name}")
    armature.animation_data.action = action
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    scene.render.filepath = str(out / f"lenda-lanhouse-{action_name}.png")
    bpy.ops.render.render(write_still=True)
print(f"LENDA_POSE_EVIDENCE={out}")
