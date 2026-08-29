from pathlib import Path
import math
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
DONOR = Path.home() / "Downloads/fps_pistol_animated.glb"
OUT = Path("/tmp/pistol-donor-reload")
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(DONOR))
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 900
scene.render.resolution_y = 600
scene.render.resolution_percentage = 100
rig = next(obj for obj in scene.objects if obj.type == "ARMATURE")
rig.animation_data.action = next(iter(bpy.data.actions))
camera_data = bpy.data.cameras.new("inspection")
camera = bpy.data.objects.new("inspection", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (28.0, 52.0, 24.0)
target = Vector((-10.0, -19.0, 8.4))
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.lens = 46.0
camera_data.shift_x = 0.15
camera_data.shift_y = 0.12
scene.camera = camera
world = bpy.data.worlds.new("world")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.05, 0.06, 0.08, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.5
scene.world = world
light_data = bpy.data.lights.new("key", "AREA")
light_data.energy = 4500
light_data.size = 8
light = bpy.data.objects.new("key", light_data)
bpy.context.collection.objects.link(light)
light.location = (-7.0, -7.0, 28.0)
for frame in (48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 96, 100, 104):
    scene.frame_set(frame)
    wrist = rig.pose.bones["L_wrist_02"].matrix.translation
    clip = scene.objects.get("clip")
    if clip is not None:
        clip_local = rig.matrix_world.inverted() @ clip.matrix_world
        print(f"DONOR_REL {frame} wrist={tuple(round(v, 3) for v in wrist)} clip={tuple(round(v, 3) for v in clip_local.translation)} offset={tuple(round(v, 3) for v in (wrist - clip_local.translation))}")
    scene.render.filepath = str(OUT / f"donor-{frame:03d}.png")
    bpy.ops.render.render(write_still=True)
