import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

out = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
source = json.loads((out / 'scene.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
materials = {}
for i, entry in enumerate(source['meshes']):
    mesh = bpy.data.meshes.new(f'mesh-{i}')
    mesh.from_pydata(entry['vertices'], [], entry['faces'])
    mesh.update()
    obj = bpy.data.objects.new(entry['role'], mesh)
    bpy.context.collection.objects.link(obj)
    key = tuple(entry['color'])
    if key not in materials:
        mat = bpy.data.materials.new(f'color-{len(materials)}')
        mat.diffuse_color = (*key, 1)
        mat.use_nodes = True
        mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*key, 1)
        mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .85
        materials[key] = mat
    mesh.materials.append(materials[key])
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 8
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 4
scene.render.resolution_x = 1200
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('OfflineWorld')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.55, .65, .8, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .7
bpy.ops.object.light_add(type='SUN', location=(0, -35, 30))
sun = bpy.context.object
sun.data.energy = 2
sun.rotation_euler = (math.radians(25), math.radians(-20), math.radians(-25))
bpy.ops.object.camera_add()
camera = bpy.context.object
scene.camera = camera
camera.data.clip_end = 300
for name, position, target, orthographic in [
    ('aerea', (0, -37, 50), (0, -37, 0), True),
    ('entrada-oeste', (-15, -27, 1.65), (0, -40, 1.65), False),
    ('travessa-oeste', (-19.5, -25.5, 1.65), (-12, -29, 1.65), False),
    ('travessa-leste', (19.5, -25.5, 1.65), (12, -29, 1.65), False),
    ('fundo-campo', (4.5, -40.5, 1.65), (0, -45.8, 3.8), False),
]:
    if len(sys.argv) > sys.argv.index('--') + 2 and name not in sys.argv[sys.argv.index('--') + 2:]:
        continue
    camera.location = position
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO' if orthographic else 'PERSP'
    camera.data.ortho_scale = 57
    camera.data.lens = 24
    scene.render.filepath = str(out / f'{name}.png')
    bpy.ops.render.render(write_still=True)
