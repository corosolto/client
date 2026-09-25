"""Render a diagnostic contact sheet for a supplied FPS animation donor.

This tool is read-only with respect to the donor.  It samples the imported
animation from the intended first-person eye so clip boundaries can be chosen
from visible hand/weapon motion instead of guessed frame numbers.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]


def main() -> None:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if not args:
        raise SystemExit("usage: blender --background --python script.py -- donor.glb [step]")
    donor = Path(args[0]).expanduser().resolve()
    step = int(args[1]) if len(args) > 1 else 8
    output = ROOT / "artifacts" / "viewmodels" / "diagnostics" / f"{donor.stem}-contact"
    output.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(donor))
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 400
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    world = bpy.data.worlds.new("DiagnosticWorld")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.035, 0.045, 0.06, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 2.2
    scene.world = world

    camera_data = bpy.data.cameras.new("DiagnosticFPSCamera")
    camera = bpy.data.objects.new("DiagnosticFPSCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0.0, 9.0, 10.0)
    camera.rotation_euler = Vector((0.0, -1.0, -0.02)).to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = 30.0
    camera_data.sensor_width = 36.0
    scene.camera = camera

    key_data = bpy.data.lights.new("DiagnosticKey", "AREA")
    key_data.energy = 4200
    key_data.shape = "DISK"
    key_data.size = 8.0
    key = bpy.data.objects.new("DiagnosticKey", key_data)
    bpy.context.collection.objects.link(key)
    key.location = (-8.0, -10.0, 28.0)
    key.rotation_euler = (math.radians(35), 0.0, math.radians(-25))

    action = next(iter(bpy.data.actions), None)
    if action is None:
        raise RuntimeError(f"No action in {donor}")
    start, end = (int(math.floor(action.frame_range[0])), int(math.ceil(action.frame_range[1])))
    frames = sorted(set(range(start, end + 1, max(1, step))) | {start, end})
    for frame in frames:
        scene.frame_set(frame)
        scene.render.filepath = str(output / f"frame_{frame:03d}.png")
        bpy.ops.render.render(write_still=True)
    print(f"DONOR_CONTACT frames={frames} output={output}")


if __name__ == "__main__":
    main()
