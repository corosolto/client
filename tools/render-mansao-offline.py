"""Render da cena Three exportada: geometria/GLBs reais, shaders Blender equivalentes.
Uso: Blender --background --python tools/render-mansao-offline.py -- [nome-da-captura]
"""
import bpy, json, math, sys
from pathlib import Path
from mathutils import Matrix, Vector

base = Path('artifacts/joa-recuperacao/offline').resolve()
data = json.loads((base / 'scene.json').read_text())
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 1200, 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.72, .78, .85, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .65
env = scene.world.node_tree.nodes.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(str(Path('public/img/textures/sky_joa.webp').resolve()))
scene.world.node_tree.links.new(env.outputs['Color'], scene.world.node_tree.nodes['Background'].inputs['Color'])
materials = {}
for m in data['materials']:
    mat = bpy.data.materials.new(m['id'])
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*m['color'], 1)
    bsdf.inputs['Roughness'].default_value = m['roughness']
    bsdf.inputs['Metallic'].default_value = m['metalness']
    if m.get('emissive'):
        bsdf.inputs['Emission Color'].default_value = (*m['emissive'], 1)
        bsdf.inputs['Emission Strength'].default_value = m['emissiveIntensity']
    if m['water']:
        bsdf.inputs['Roughness'].default_value = .18
        bsdf.inputs['Transmission Weight'].default_value = .18
        bsdf.inputs['IOR'].default_value = 1.333
    t = m['texture']
    if t:
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        image = nodes.new('ShaderNodeTexImage')
        image.image = bpy.data.images.load(str(base / t['file']), check_existing=True)
        uv = nodes.new('ShaderNodeTexCoord')
        mapping = nodes.new('ShaderNodeMapping')
        mapping.inputs['Scale'].default_value = (t['repeat'][0], t['repeat'][1] * (1 if t['flipY'] else -1), 1)
        mapping.inputs['Location'].default_value = (t['offset'][0], t['offset'][1] + (0 if t['flipY'] else 1), 0)
        links.new(uv.outputs['UV'], mapping.inputs['Vector'])
        links.new(mapping.outputs['Vector'], image.inputs['Vector'])
        mult = nodes.new('ShaderNodeMixRGB')
        mult.blend_type = 'MULTIPLY'; mult.inputs[0].default_value = 1
        mult.inputs[2].default_value = (*m['color'], 1)
        links.new(image.outputs['Color'], mult.inputs[1]); links.new(mult.outputs[0], bsdf.inputs['Base Color'])
    if m['opacity'] < 1:
        bsdf.inputs['Alpha'].default_value = m['opacity']
    materials[m['id']] = mat

geometries = {}
for g in data['geometry']:
    verts = list(zip(*[iter(g['position'])] * 3))
    ix = g['index'] if g['index'] is not None else list(range(len(verts)))
    faces = list(zip(*[iter(ix)] * 3))
    mesh = bpy.data.meshes.new(g['id']); mesh.from_pydata(verts, [], faces); mesh.update()
    if g['uv']:
        uv = mesh.uv_layers.new(name='UVMap')
        for poly in mesh.polygons:
            for loop in poly.loop_indices:
                v = mesh.loops[loop].vertex_index
                uv.data[loop].uv = g['uv'][v * 2:v * 2 + 2]
    for group in g['groups']:
        for face in mesh.polygons[group['start']//3:(group['start']+group['count'])//3]:
            face.material_index = group['materialIndex']
    geometries[g['id']] = mesh

conversion = Matrix.Rotation(math.pi / 2, 4, 'X')
mesh_variants = {}
for o in data['objects']:
    key = (o['geometry'], tuple(o['materials']))
    if key not in mesh_variants:
        mesh = geometries[o['geometry']].copy()
        for m in o['materials']: mesh.materials.append(materials[m])
        mesh_variants[key] = mesh
    obj = bpy.data.objects.new(o['name'], mesh_variants[key]); scene.collection.objects.link(obj)
    matrix = Matrix([o['matrix'][i:i+4] for i in range(0, 16, 4)]).transposed()
    obj.matrix_world = conversion @ matrix

def convert(p): return conversion @ Vector(p)
for i, light in enumerate(data['lights']):
    if light['type'] == 'HemisphereLight': continue
    kind = 'SUN' if light['type'] == 'DirectionalLight' else 'POINT'
    lamp = bpy.data.lights.new('source-light-'+str(i), kind)
    lamp.energy = light['intensity'] if kind == 'SUN' else light['intensity'] * 60
    lamp.color = light['color']
    if kind == 'SUN': lamp.angle = math.radians(4)
    obj = bpy.data.objects.new(lamp.name, lamp); scene.collection.objects.link(obj)
    obj.location = convert(light['position'])
    obj.rotation_euler = (-obj.location).to_track_quat('-Z', 'Y').to_euler()

cam_data = bpy.data.cameras.new('Camera'); cam = bpy.data.objects.new('Camera', cam_data)
scene.collection.objects.link(cam); scene.camera = cam
cam_data.type = 'PERSP'; cam_data.angle = math.radians(76); cam_data.clip_end = 450
shots = {
    'jardim-spawn': ([0, 1.65, 32], [0, 2, 4]),
    'fachada': ([-10, 1.65, 22], [1, 2.2, 1]),
    'sala': ([-10, 1.65, 2], [3, 2, -9]),
    'mezanino': ([8, 6.15, -11], [0, 1, 4]),
    'piscina-spawn': ([0, 1.65, -22], [0, -.2, -40]),
    'praia': ([15, 1.65, -34], [0, -.8, -49]),
    'piscina-fundo': ([0, -.20, -31.5], [0, -.5, -25]),
    'escada-servico': ([17, 1.65, -5], [13, 3, -14]),
    'preview': ([30, 24, 44], [0, 1, -1]),
}
selection = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
receipt = {'engine': 'Blender Cycles offline', 'limits': 'GLB bind poses, water material approximation; no WebGL bloom/aerial fog/HUD. Not runtime visual approval.', 'shots': {}}
for name, (pos, target) in shots.items():
    if selection and name not in selection: continue
    cam.location = convert(pos); cam.rotation_euler = (convert(target)-cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(base / (name+'.png'))
    bpy.ops.render.render(write_still=True)
    receipt['shots'][name] = {'eye':pos, 'target':target, 'size':[1200,800]}
(base / ('render-receipt'+('-'+selection[0] if selection else '')+'.json')).write_text(json.dumps(receipt, indent=2))
