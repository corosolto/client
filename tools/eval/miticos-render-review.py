"""Render offline dos vértices já posados pelo Three. Não substitui captura WebGL/CSS.
blender --background --python tools/eval/miticos-render-review.py -- <pasta>
"""
import bpy
import json
import math
import os
import sys
from mathutils import Vector

folder = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
names = ['lobisomem-selection-15', 'mandrake-selection-15', 'lobisomem-idle-15',
         'lobisomem-walk-7', 'lobisomem-run-15', 'lobisomem-crouch-15',
         'lobisomem-death-29', 'lobisomem-revive-15', 'fp-32', 'fp-169',
         'lobisomem-run-15-opposite', 'lobisomem-crouch-15-opposite']
if '--fp-only' in sys.argv:
    names = ['fp-32', 'fp-169']
results = '--results' in sys.argv
if results:
    names = ['lobisomem-selection-119', 'lobisomem-death-119']
convert = lambda p: (p[0], -p[2], p[1])
for name in names:
    data = json.load(open(os.path.join(folder, name.replace('-opposite', '') + '.json')))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 8
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 900
    scene.render.resolution_y = 600 if name != 'fp-169' else 506
    scene.render.resolution_percentage = 100
    if results:
        scene.render.resolution_x, scene.render.resolution_y = 1024, 1536
        scene.render.film_transparent = True
    scene.world = bpy.data.worlds.new('Review world')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.2, .23, .28, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .7
    for item in data['meshes']:
        pts = item['positions']
        mesh = bpy.data.meshes.new(item['name'])
        faces = [item['indices'][i:i+3] for i in range(0, len(item['indices']), 3)]
        mesh.from_pydata([convert(pts[i:i+3]) for i in range(0, len(pts), 3)], [], faces)
        mesh.update()
        obj = bpy.data.objects.new(item['name'], mesh)
        scene.collection.objects.link(obj)
        mat = bpy.data.materials.new('Runtime material')
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get('Principled BSDF')
        bsdf.inputs['Base Color'].default_value = (*item['color'], 1)
        bsdf.inputs['Roughness'].default_value = .8
        if item['texture'] and item['uv']:
            uv = mesh.uv_layers.new()
            for polygon in mesh.polygons:
                polygon.use_smooth = True
                for loop in polygon.loop_indices:
                    idx = mesh.loops[loop].vertex_index * 2
                    uv.data[loop].uv = (item['uv'][idx], 1 - item['uv'][idx+1])
            tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
            tex.image = bpy.data.images.load(item['texture'])
            mult = mat.node_tree.nodes.new('ShaderNodeMixRGB')
            mult.blend_type = 'MULTIPLY'
            mult.inputs[0].default_value = 1
            mult.inputs[2].default_value = (*item['color'], 1)
            mat.node_tree.links.new(tex.outputs['Color'], mult.inputs[1])
            mat.node_tree.links.new(mult.outputs[0], bsdf.inputs['Base Color'])
        mesh.materials.append(mat)
    camera = bpy.data.cameras.new('Review camera')
    obj = bpy.data.objects.new('Review camera', camera)
    scene.collection.objects.link(obj)
    scene.camera = obj
    if data['camera']:
        obj.location = (0, 0, 0)
        target = Vector((0, 1, 0))
        camera.angle = 2 * math.atan(math.tan(math.radians(data['camera']['fov']) / 2) * data['camera']['aspect'])
        camera.clip_start = .01
    else:
        obj.location = convert((-2.4 if name.endswith('-opposite') else 2.4, 1.5, 4))
        target = Vector(convert((0, .75, 0)))
        camera.lens = 55
        if results:
            obj.location = convert((1.5, 1.4, 4.8))
            target = Vector(convert((0, .85 if 'selection' in name else .45, 0)))
            camera.lens = 48
        bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.001))
        floor = bpy.context.object
        floor.name = 'Ground y=0'
        floor.hide_render = results
        mat = bpy.data.materials.new('Ground')
        mat.diffuse_color = (.16, .18, .21, 1)
        floor.data.materials.append(mat)
    obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()
    for loc, power, size in [((2, -3, 5), 500, 4), ((-3, 1, 3), 300, 3)]:
        light = bpy.data.lights.new('Softbox', 'AREA')
        light.energy = power
        light.shape = 'DISK'
        light.size = size
        lamp = bpy.data.objects.new('Softbox', light)
        scene.collection.objects.link(lamp)
        lamp.location = loc
        lamp.rotation_euler = (Vector((0, 0, .8)) - lamp.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(folder, ('result-' if results else '') + name + '.png')
    bpy.ops.render.render(write_still=True)
    print('REVIEW_RENDER', name, flush=True)
