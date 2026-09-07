"""Read-only inspection of the approved M4 composition, from the local input copy.

Dumps rig topology, gun geometry components and side/bottom orthographic renders
so the magazine surface can be selected by evidence, not by bounding box.
"""
import importlib.util
import json
import math
import sys
from collections import defaultdict
from pathlib import Path
import bpy
import bmesh
from mathutils import Matrix, Vector

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('inventory', Path(__file__).with_name('rifles-inventory.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
inv.guard()
OUT = inv.OUT / 'm4-actions-c1'
INPUT = OUT / 'input/m4-approved.blend'
assert OUT.resolve().is_relative_to(inv.OUT) and INPUT.is_file()
assert inv.digest(INPUT) == '6925c7f5633c7e2869e989bc4f379770965e7a9cd38fb505da2840ad082d0e26'
report_dir = OUT / 'inspect'
report_dir.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(INPUT), load_ui=False)
scene = bpy.context.scene
scene.frame_set(1)
bpy.context.view_layer.update()
rig = bpy.data.objects['RIG_FP_ARMS']
gun = bpy.data.objects['MINT_WEAPON_M4']
record = {'input_sha256': inv.digest(INPUT), 'objects': [], 'rig': {}, 'gun': {}}
for obj in scene.objects:
    item = {'name': obj.name, 'type': obj.type, 'parent': obj.parent.name if obj.parent else None,
            'matrix_world': [list(r) for r in obj.matrix_world]}
    if obj.type == 'MESH':
        item['vertices'] = len(obj.data.vertices)
        item['materials'] = [m.name for m in obj.data.materials]
        item['modifiers'] = [(m.name, m.type, getattr(m, 'object', None) and m.object.name) for m in obj.modifiers]
        item['vertex_groups'] = len(obj.vertex_groups)
    if obj.type == 'CAMERA':
        item['lens'] = obj.data.lens
        item['sensor_fit'] = obj.data.sensor_fit
        item['sensor_height'] = obj.data.sensor_height
        item['angle_y_deg'] = math.degrees(obj.data.angle_y)
    record['objects'].append(item)
record['rig'] = {'scale': list(rig.scale), 'bones': []}
for b in rig.pose.bones:
    world = rig.matrix_world @ b.matrix
    record['rig']['bones'].append({'name': b.name, 'parent': b.parent.name if b.parent else None,
        'head_world': list(rig.matrix_world @ b.head), 'tail_world': list(rig.matrix_world @ b.tail),
        'length_world': ((rig.matrix_world @ b.tail) - (rig.matrix_world @ b.head)).length,
        'axes_world': {'x': list(world.to_3x3().col[0].normalized()), 'y': list(world.to_3x3().col[1].normalized()),
                       'z': list(world.to_3x3().col[2].normalized())},
        'rotation_mode': b.rotation_mode, 'basis_identity': b.matrix_basis == Matrix.Identity(4)})
# Gun geometry: components and a spatial histogram in LOCAL gun coordinates.
bm = bmesh.new()
bm.from_mesh(gun.data)
bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()
component = [-1] * len(bm.verts)
components = []
for v in bm.verts:
    if component[v.index] >= 0:
        continue
    stack, members = [v], []
    component[v.index] = len(components)
    while stack:
        cur = stack.pop()
        members.append(cur.index)
        for e in cur.link_edges:
            other = e.other_vert(cur)
            if component[other.index] < 0:
                component[other.index] = len(components)
                stack.append(other)
    members_co = [bm.verts[i].co for i in members]
    components.append({'vertices': len(members),
        'faces': sum(1 for f in bm.faces if component[f.verts[0].index] == len(components)),
        'min': [min(c[i] for c in members_co) for i in range(3)], 'max': [max(c[i] for c in members_co) for i in range(3)]})
record['gun'] = {'matrix_world': [list(r) for r in gun.matrix_world], 'vertices': len(bm.verts), 'faces': len(bm.faces),
    'edges': len(bm.edges), 'boundary_edges': sum(1 for e in bm.edges if e.is_boundary),
    'components': sorted(components, key=lambda c: -c['vertices']),
    'local_bounds': [[min(v.co[i] for v in bm.verts) for i in range(3)], [max(v.co[i] for v in bm.verts) for i in range(3)]]}
# Histogram of vertices hanging below the receiver, by local X (long axis) in 1 cm bins.
below = defaultdict(int)
for v in bm.verts:
    if v.co.z < -0.02:
        below[round(v.co.x, 2)] += 1
record['gun']['below_z_-0.02_by_x'] = {f'{k:+.2f}': below[k] for k in sorted(below)}
zmin_by_x = defaultdict(lambda: 1.0)
for v in bm.verts:
    key = round(v.co.x, 2)
    zmin_by_x[key] = min(zmin_by_x[key], v.co.z)
record['gun']['zmin_by_x'] = {f'{k:+.2f}': round(zmin_by_x[k], 4) for k in sorted(zmin_by_x)}
bm.free()
(report_dir / 'inspect.json').write_text(json.dumps(record, indent=1) + '\n')

# Orthographic diagnostic renders of the gun alone, in its LOCAL frame, with a
# 1 cm grid drawn as thin cylinders so pixel positions read as local metres.
for obj in list(scene.objects):
    if obj.type == 'MESH' and obj is not gun:
        obj.hide_render = True
gun_local = gun.matrix_world.copy()
gun.matrix_world = Matrix.Identity(4)
bpy.context.view_layer.update()
grid = bpy.data.objects.new('QA_GRID', bpy.data.meshes.new('QA_GRID'))
gb = bmesh.new()
for x in range(-50, 51, 5):
    for z in [-.25, .25]:
        pass
for x10 in range(-50, 51, 5):
    x = x10 / 100
    v1 = gb.verts.new((x, 0.0, -0.25)); v2 = gb.verts.new((x, 0.0, 0.25)); v3 = gb.verts.new((x + .0007, 0.0, 0.25)); v4 = gb.verts.new((x + .0007, 0.0, -0.25))
    gb.faces.new((v1, v2, v3, v4))
for z10 in range(-25, 26, 5):
    z = z10 / 100
    v1 = gb.verts.new((-0.5, 0.0, z)); v2 = gb.verts.new((0.5, 0.0, z)); v3 = gb.verts.new((0.5, 0.0, z + .0007)); v4 = gb.verts.new((-0.5, 0.0, z + .0007))
    gb.faces.new((v1, v2, v3, v4))
gb.to_mesh(grid.data)
gb.free()
scene.collection.objects.link(grid)
grid.location = (0, 0.12, 0)
mat = bpy.data.materials.new('QA_GRID_MAT')
mat.diffuse_color = (1, .2, .1, 1)
grid.data.materials.append(mat)
cam = scene.camera
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 1.05
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.show_cavity = True
scene.render.film_transparent = False
scene.render.image_settings.color_mode = 'RGB'
scene.render.resolution_percentage = 100
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
views = {'side-left': ((0, -1.5, 0), Vector((0, 1, 0)), (2100, 1050)),
         'side-right': ((0, 1.5, 0), Vector((0, -1, 0)), (2100, 1050)),
         'bottom': ((0, 0, -1.5), Vector((0, 0, 1)), (2100, 1050))}
for name, (location, forward, size) in views.items():
    grid.hide_render = name != 'side-left'
    cam.location = location
    up = Vector((0, 0, 1)) if name != 'bottom' else Vector((0, 1, 0))
    cam.rotation_euler = forward.to_track_quat('-Z', 'Y').to_euler() if name != 'bottom' else Matrix(((1,0,0),(0,-1,0),(0,0,-1))).to_euler()
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.filepath = str(report_dir / f'gun-{name}.png')
    bpy.ops.render.render(write_still=True)
gun.matrix_world = gun_local
print('M4_ACTIONS_INSPECT', report_dir)
