"""Render normalized side views used to register project weapons to the approved FPS rig."""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


CLIENT = Path(__file__).resolve().parents[3]
WEAPONS = CLIENT / "public" / "models" / "weapons"
OUTPUT = CLIENT / "artifacts" / "viewmodels" / "registration"


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def import_glb(path: Path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = [obj for obj in bpy.data.objects if obj not in before]
    meshes = [obj for obj in objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"No mesh in {path}")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    return bpy.context.view_layer.objects.active


def world_bounds(obj):
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    low = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    high = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return low, high


def add_axis(name: str, start, end, color):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.004
    spline = curve.splines.new("POLY")
    spline.points.add(1)
    spline.points[0].co = (*start, 1)
    spline.points[1].co = (*end, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    mat = bpy.data.materials.new(f"{name}_mat")
    mat.diffuse_color = (*color, 1)
    curve.materials.append(mat)


def look_at(obj, target=(0, 0, 0)):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def render_weapon(weapon_id: str) -> Path:
    reset_scene()
    weapon = import_glb(WEAPONS / f"{weapon_id}.glb")
    low, high = world_bounds(weapon)
    center = (low + high) * 0.5
    longest = max(high.x - low.x, high.y - low.y, high.z - low.z)
    weapon.location -= center

    mat = bpy.data.materials.new("registration_gray")
    mat.diffuse_color = (0.24, 0.27, 0.31, 1)
    mat.metallic = 0.15
    mat.roughness = 0.48
    weapon.data.materials.clear()
    weapon.data.materials.append(mat)

    span = longest * 0.62
    add_axis("X_axis", (-span, 0, 0), (span, 0, 0), (0.95, 0.12, 0.08))
    add_axis("Z_axis", (0, 0, -span), (0, 0, span), (0.08, 0.42, 0.95))

    camera_data = bpy.data.cameras.new("RegistrationCamera")
    camera = bpy.data.objects.new("RegistrationCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0, -2.5, 0)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = longest * 1.22
    look_at(camera)
    bpy.context.scene.camera = camera

    key_data = bpy.data.lights.new("Key", "AREA")
    key_data.energy = 900
    key_data.shape = "DISK"
    key_data.size = 4
    key = bpy.data.objects.new("Key", key_data)
    bpy.context.collection.objects.link(key)
    key.location = (-1.5, -2.0, 2.0)
    look_at(key)

    fill_data = bpy.data.lights.new("Fill", "AREA")
    fill_data.energy = 500
    fill_data.size = 3
    fill = bpy.data.objects.new("Fill", fill_data)
    bpy.context.collection.objects.link(fill)
    fill.location = (1.5, -1.0, -0.5)
    look_at(fill)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.035, 0.04, 0.05)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    destination = OUTPUT / f"{weapon_id}-registration.png"
    scene.render.filepath = str(destination)
    bpy.ops.render.render(write_still=True)
    return destination


def requested_ids():
    if "--" not in sys.argv:
        return ["ak", "akm", "m92"]
    values = sys.argv[sys.argv.index("--") + 1 :]
    return values or ["ak", "akm", "m92"]


for requested in requested_ids():
    print(render_weapon(requested))
