"""Render the CC0 donor Reload unchanged as motion-only reference."""
from pathlib import Path
import math

import bpy
from mathutils import Vector


DONOR = Path.home() / "Downloads" / "ak-12animated.glb"
OUT = Path("/tmp/coro-donor-reload-reference")


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(DONOR))
    rig = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    rig.animation_data_create()
    rig.animation_data.action = bpy.data.actions["Reload"]

    camera_data = bpy.data.cameras.new("ReferenceCamera")
    camera = bpy.data.objects.new("ReferenceCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0.62, 0.18, 4.42)
    target = Vector((0.10, -1.35, 4.00))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.sensor_fit = "VERTICAL"
    camera_data.angle_y = math.radians(58.0)
    bpy.context.scene.camera = camera

    world = bpy.data.worlds.new("ReferenceWorld")
    world.color = (0.05, 0.07, 0.09)
    bpy.context.scene.world = world
    for name, location, energy, size in (
        ("Key", (-2.5, -1.0, 6.0), 600.0, 2.0),
        ("Fill", (2.0, -0.5, 4.5), 300.0, 2.0),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(light)
        light.location = location

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    OUT.mkdir(parents=True, exist_ok=True)
    for frame in (0, 10, 20, 30, 40, 48, 54, 60, 68, 76, 86, 100):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        scene.render.filepath = str(OUT / f"donor_reload_{frame:03d}.png")
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
