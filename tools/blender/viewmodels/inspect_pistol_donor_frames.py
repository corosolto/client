"""Render a diagnostic contact sheet source set for the CC0 pistol motion donor."""
import os
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
DONOR = Path(os.environ.get(
    "CORO_PISTOL_DONOR",
    str(Path.home() / "Downloads" / "fps_pistol_animated.glb"),
))
OUT = ROOT / "artifacts" / "viewmodels" / "pistol-hires-pilot" / f"donor-frames-{DONOR.stem}"
FRAME_START = int(os.environ.get("CORO_FRAME_START", "0"))
FRAME_END = int(os.environ.get("CORO_FRAME_END", "188"))
FRAME_STEP = int(os.environ.get("CORO_FRAME_STEP", "12"))
OUT_SUFFIX = os.environ.get("CORO_OUT_SUFFIX", "")
if OUT_SUFFIX:
    OUT = OUT.with_name(f"{OUT.name}-{OUT_SUFFIX}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(DONOR))
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 600
    scene.render.resolution_y = 400
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    # Neutral, bright inspection materials make finger contact and silhouettes
    # readable independently of the donor's dark presentation textures.
    hand_mat = bpy.data.materials.new("Inspection_Hands")
    hand_mat.diffuse_color = (0.32, 0.52, 0.82, 1.0)
    weapon_mat = bpy.data.materials.new("Inspection_Weapon")
    weapon_mat.diffuse_color = (0.16, 0.18, 0.22, 1.0)
    mesh_objects = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    if mesh_objects:
        hands = max(mesh_objects, key=lambda obj: len(obj.data.vertices))
        for obj in mesh_objects:
            obj.data.materials.clear()
            obj.data.materials.append(hand_mat if obj == hands else weapon_mat)
    camera_data = bpy.data.cameras.new("Donor_Inspection_Camera")
    camera = bpy.data.objects.new("Donor_Inspection_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (60.0, 48.5, 25.1)
    camera.rotation_euler = (Vector((-12.0, -19.0, 8.4)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = 46.0
    scene.camera = camera
    light_data = bpy.data.lights.new("Donor_Inspection_Key", "AREA")
    light_data.energy = 5000
    light_data.shape = "DISK"
    light_data.size = 12
    light = bpy.data.objects.new("Donor_Inspection_Key", light_data)
    bpy.context.collection.objects.link(light)
    light.location = (-8.0, -8.0, 30.0)
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Inspection_World")
    scene.world.color = (0.08, 0.08, 0.08)
    for frame in range(FRAME_START, FRAME_END, FRAME_STEP):
        scene.frame_set(frame)
        scene.render.filepath = str(OUT / f"frame-{frame:03d}.png")
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
