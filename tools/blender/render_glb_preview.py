import math
import os
import sys

import bpy
from mathutils import Vector


def reset_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.images,
                       bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def world_bounds(objects):
    points = [obj.matrix_world @ Vector(corner)
              for obj in objects if hasattr(obj, 'bound_box')
              for corner in obj.bound_box]
    if not points:
        return Vector((-1, -1, -1)), Vector((1, 1, 1))
    return (Vector(tuple(min(p[i] for p in points) for i in range(3))),
            Vector(tuple(max(p[i] for p in points) for i in range(3))))


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def studio_material(name, color, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def render_asset(src, out_dir):
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=src)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    lo, hi = world_bounds(meshes)
    center = (lo + hi) * 0.5
    size = hi - lo
    radius = max(size.length * 0.58, 1.0)

    floor_z = lo.z - max(size.z * 0.04, 0.015)
    bpy.ops.mesh.primitive_plane_add(size=max(radius * 7, 12), location=(center.x, center.y, floor_z))
    floor = bpy.context.object
    floor.name = 'preview_floor'
    floor.data.materials.append(studio_material('preview_floor', (0.018, 0.023, 0.032), 0.84))

    bpy.ops.object.camera_add(location=(center.x + radius * 1.2,
                                        center.y - radius * 1.95,
                                        center.z + radius * 0.72))
    camera = bpy.context.object
    look_at(camera, center + Vector((0, 0, size.z * 0.02)))
    camera.data.lens = 65
    bpy.context.scene.camera = camera

    for location, energy, size_lamp, color in (
        ((center.x - radius * 1.2, center.y - radius * 1.4, center.z + radius * 2.1), 850, radius * 1.7, (1.0, 0.78, 0.58)),
        ((center.x + radius * 1.8, center.y - radius * 0.4, center.z + radius * 1.1), 500, radius * 1.3, (0.50, 0.70, 1.0)),
        ((center.x - radius * 0.2, center.y + radius * 1.6, center.z + radius * 0.6), 300, radius, (0.55, 0.72, 1.0)),
    ):
        bpy.ops.object.light_add(type='AREA', location=location)
        lamp = bpy.context.object
        lamp.data.energy = energy
        lamp.data.shape = 'DISK'
        lamp.data.size = size_lamp
        lamp.data.color = color
        look_at(lamp, center)

    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.007, 0.014, 1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.09
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = -0.65
    scene.render.filepath = os.path.join(out_dir, os.path.basename(src).rsplit('.', 1)[0] + '.png')
    bpy.ops.render.render(write_still=True)
    print(f'RENDER {scene.render.filepath} bounds={tuple(round(v, 3) for v in size)}')


args = sys.argv[sys.argv.index('--') + 1:]
out = os.path.abspath(args[0])
os.makedirs(out, exist_ok=True)
for asset in args[1:]:
    render_asset(os.path.abspath(asset), out)
