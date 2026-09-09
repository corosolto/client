"""Render project-AK mechanical-region candidates for measured separation."""
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "artifacts" / "viewmodels" / "ak-pilot" / "source_analysis" / "ak_part_regions.png"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT / "public" / "models" / "weapons" / "ak.glb"))
weapon = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH")


def material(name, color):
    value = bpy.data.materials.new(name)
    value.diffuse_color = color
    return value


base = material("base", (0.08, 0.08, 0.09, 1.0))
magazine = material("magazine_candidate", (0.8, 0.03, 0.02, 1.0))
bolt = material("bolt_candidate", (0.02, 0.75, 0.12, 1.0))
weapon.data.materials.clear()
weapon.data.materials.append(base)
weapon.data.materials.append(magazine)
weapon.data.materials.append(bolt)

for polygon in weapon.data.polygons:
    center = polygon.center
    if -0.09 <= center.x <= 0.10 and center.z < 0.055:
        polygon.material_index = 1
    elif -0.18 <= center.x <= 0.14 and center.z > 0.090 and center.y < 0.0:
        polygon.material_index = 2
    else:
        polygon.material_index = 0

scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = "BOTH"
scene.render.resolution_x = 1500
scene.render.resolution_y = 700
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUT)

camera_data = bpy.data.cameras.new("part_camera")
camera_data.type = "ORTHO"
camera_data.ortho_scale = 1.15
camera = bpy.data.objects.new("part_camera", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (0.0, -2.0, 0.0)
camera.rotation_euler = (Vector((0.0, 0.0, 0.0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = camera
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.render.render(write_still=True)
print(f"AK_PART_DIAGNOSTIC {OUT}")
