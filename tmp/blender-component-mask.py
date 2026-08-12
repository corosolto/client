import bpy, bmesh, json, math, pathlib, sys
from collections import defaultdict
from mathutils import Vector

source = pathlib.Path(sys.argv[sys.argv.index('--') + 1]).resolve()
labels = json.loads(pathlib.Path(sys.argv[sys.argv.index('--') + 2]).read_text())
output = pathlib.Path(sys.argv[sys.argv.index('--') + 3]).resolve()
selected_ranks = {int(value) for value in sys.argv[sys.argv.index('--') + 4].split(',')}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading='NORMALS')
body = bpy.data.objects['char1']
rank_by_component = {c['component']: c['rank'] for c in labels['components']}
vertex_faces = defaultdict(list)
for face in body.data.polygons:
    for vertex in face.vertices: vertex_faces[vertex].append(face.index)
remaining = set(range(len(body.data.polygons))); face_rank = {}
component = 0
while remaining:
    seed = remaining.pop(); queue = [seed]; faces = []
    while queue:
        index = queue.pop(); faces.append(index)
        for vertex in body.data.polygons[index].vertices:
            for adjacent in vertex_faces[vertex]:
                if adjacent in remaining: remaining.remove(adjacent); queue.append(adjacent)
    rank = rank_by_component[component]
    for index in faces: face_rank[index] = rank
    component += 1

palette = [(1,.08,.08),(.08,1,.08),(.08,.2,1),(1,.8,.05),(1,.05,.8),(.05,1,1),(.8,.4,.05),(.5,.05,1)]
materials = {}
for order, rank in enumerate(sorted(selected_ranks)):
    mat = bpy.data.materials.new(f'RANK_{rank}')
    mat.diffuse_color = (*palette[order % len(palette)],1)
    mat.use_nodes = True; bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*palette[order % len(palette)],1)
    bsdf.inputs['Emission Color'].default_value=(*palette[order % len(palette)],1)
    bsdf.inputs['Emission Strength'].default_value=.8
    body.data.materials.append(mat); materials[rank]=len(body.data.materials)-1
bm=bmesh.new();bm.from_mesh(body.data);bm.faces.ensure_lookup_table()
delete=[]
for face in bm.faces:
    rank=face_rank[face.index]
    if rank in selected_ranks: face.material_index=materials[rank]
    else: delete.append(face)
bmesh.ops.delete(bm,geom=delete,context='FACES');bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(body.data);bm.free()
for obj in list(bpy.context.scene.objects):
    if obj != body and obj.type != 'ARMATURE': bpy.data.objects.remove(obj,do_unlink=True)
world=bpy.data.worlds.new('World');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.01,.012,.015,1)
bpy.ops.object.light_add(type='AREA',location=(4,-4,6));bpy.context.object.data.energy=1000;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=5
bpy.ops.object.camera_add(location=(0,6,1.3));camera=bpy.context.object;direction=Vector((.05,.08,1.25))-camera.location;camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=.9;bpy.context.scene.camera=camera
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False;scene.render.filepath=str(output);scene.view_settings.look='AgX - Medium High Contrast';bpy.ops.render.render(write_still=True)
legend={rank:palette[order%len(palette)] for order,rank in enumerate(sorted(selected_ranks))};pathlib.Path(str(output)+'.json').write_text(json.dumps(legend,indent=2))
