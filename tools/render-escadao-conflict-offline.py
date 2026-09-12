import bpy, sys, json, math
from pathlib import Path
from mathutils import Vector

out = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
data = json.loads((out / 'geometry.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
materials = {}
for i, spec in enumerate(data['meshes']):
    mesh = bpy.data.meshes.new(str(i))
    mesh.from_pydata(spec['vertices'], [], spec['faces'])
    obj = bpy.data.objects.new(str(i), mesh)
    bpy.context.collection.objects.link(obj)
    slots = {}
    for face, color in zip(mesh.polygons, spec['colors']):
        key = tuple(round(c, 4) for c in color)
        if key not in materials:
            mat = bpy.data.materials.new(str(key))
            mat.diffuse_color = (*key, 1)
            mat.use_nodes = True
            mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*key, 1)
            mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .8
            materials[key] = mat
        if key not in slots:
            slots[key] = len(mesh.materials)
            mesh.materials.append(materials[key])
        face.material_index = slots[key]
# Alvo de diagnóstico na posição ocupável cobrada pelo teste; não faz parte do mapa.
bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=.18, location=(10.8,-24,1.5))
marker = bpy.data.materials.new('Alvo de diagnostico')
marker.use_nodes = True
marker.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (1,.12,.01,1)
bpy.context.object.data.materials.append(marker)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 8
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 4
scene.render.resolution_x = 1536
scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('World')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.45,.52,.6,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .7
bpy.ops.object.light_add(type='SUN', location=(10,-10,30))
bpy.context.object.rotation_euler = (.45,-.5,-.4)
bpy.context.object.data.energy = 2
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.lens = 28
scene.camera = camera
views = [
    ('casa-rua', (11,-24,4), (6.8,-18.375,4.3)),
    ('casa-interior', (7.175,-17.7,4.37), (10.8,-24,1.5)),
    ('mirante-frente', (7,15,11), (0,21.5,8.8)),
    ('mirante-interior', (0,21.5,9.18), (0,15,8)),
]
for name, eye, target in views:
    camera.location = eye
    camera.rotation_euler = (Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath = str(out / (name + '.png'))
    bpy.ops.render.render(write_still=True)
(out / 'render.json').write_text(json.dumps({'sources':data['sources'], 'limitation':data['limitation'], 'engine':'Cycles CPU', 'views':views, 'size':[1536,1024]}, indent=2))
