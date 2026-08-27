"""Render read-only M4 magazine-region extraction candidates."""
from __future__ import annotations

import json
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "artifacts/viewmodels/coro-auto/m4-final-topology"
OUT.mkdir(parents=True, exist_ok=True)


def make_candidate(source: bpy.types.Object, name: str, predicate, offset: float):
    faces = [polygon for polygon in source.data.polygons if predicate(polygon)]
    used = sorted({index for polygon in faces for index in polygon.vertices})
    remap = {old: new for new, old in enumerate(used)}
    vertices = [source.data.vertices[index].co.copy() for index in used]
    polygons = [[remap[index] for index in polygon.vertices] for polygon in faces]
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(vertices, [], polygons)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location.x = offset
    if source.data.materials:
        obj.data.materials.append(source.data.materials[0])
    return obj, {"faces": len(faces), "vertices": len(used)}


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / "public/models/weapons/m4.glb"))
source = next(obj for obj in bpy.data.objects if obj.type == "MESH")


def all_inside(poly, xmin, xmax, zmax):
    return all(xmin < source.data.vertices[i].co.x < xmax and source.data.vertices[i].co.z < zmax for i in poly.vertices)


def center_inside(poly, xmin, xmax, zmax):
    return xmin < poly.center.x < xmax and poly.center.z < zmax


specs = [
    ("all_mag", lambda p: all_inside(p, -0.07, 0.11, -0.012), -0.28),
    ("center_mag", lambda p: center_inside(p, -0.07, 0.11, -0.012), 0.0),
    ("all_tight", lambda p: all_inside(p, -0.07, 0.11, 0.06), 0.28),
]
report = {}
for name, predicate, offset in specs:
    obj, metrics = make_candidate(source, name, predicate, offset)
    report[name] = metrics
source.hide_render = True

world = bpy.data.worlds.new("QA World")
bpy.context.scene.world = world
world.color = (0.025, 0.035, 0.05)
area_data = bpy.data.lights.new("Key", "AREA")
area_data.energy = 700
area_data.shape = "RECTANGLE"
area_data.size = 3
area = bpy.data.objects.new("Key", area_data)
area.location = (-0.5, -1.2, 1.2)
bpy.context.collection.objects.link(area)
camera_data = bpy.data.cameras.new("Camera")
camera_data.type = "ORTHO"
camera_data.ortho_scale = 0.8
camera = bpy.data.objects.new("Camera", camera_data)
camera.location = (0.0, -1.2, -0.02)
camera.rotation_euler = (1.5707963268, 0.0, 0.0)
bpy.context.collection.objects.link(camera)
bpy.context.scene.camera = camera
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1200
scene.render.resolution_y = 700
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUT / "candidates.png")
bpy.ops.render.render(write_still=True)
(OUT / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print("M4_MAG_TOPOLOGY=" + json.dumps(report, sort_keys=True))
