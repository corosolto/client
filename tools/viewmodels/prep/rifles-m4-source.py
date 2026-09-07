"""Read the original Blender rig, avoiding the nested glTF import conversion."""
import importlib.util
import json
import sys
from pathlib import Path
import bpy

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('inventory', Path(__file__).with_name('rifles-inventory.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
inv.guard()
out = inv.OUT / 'm4-candidate'
out.mkdir(exist_ok=True)
assert out.resolve().is_relative_to(inv.OUT)
source = inv.SOURCE / 'public/private-assets/viewmodels/ar/ar.blend'
bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
scene = bpy.context.scene
scene.frame_set(1)
bpy.context.view_layer.update()
record = {'source': str(source), 'sha256': inv.digest(source), 'objects': []}
for obj in scene.objects:
    item = {'name': obj.name, 'type': obj.type, 'parent': obj.parent.name if obj.parent else None,
            'parent_bone': obj.parent_bone, 'matrix': [list(r) for r in obj.matrix_world]}
    if obj.type == 'ARMATURE':
        item['bones'] = [{'name': b.name, 'parent': b.parent.name if b.parent else None,
                          'head_world': list(obj.matrix_world @ b.head),
                          'matrix': [list(r) for r in obj.matrix_world @ b.matrix]}
                         for b in obj.pose.bones]
    if obj.type == 'MESH':
        ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = ev.to_mesh()
        pts = [ev.matrix_world @ v.co for v in mesh.vertices]
        item['bounds'] = [[min(p[i] for p in pts) for i in range(3)],
                          [max(p[i] for p in pts) for i in range(3)]]
        ev.to_mesh_clear()
    record['objects'].append(item)
(out / 'source.json').write_text(json.dumps(record, indent=2) + '\n')
scene.render.engine = 'BLENDER_WORKBENCH'
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.render.resolution_x = 1024
scene.render.resolution_y = 768
scene.render.resolution_percentage = 100
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.show_cavity = True
scene.render.filepath = str(out / 'source.png')
bpy.ops.render.render(write_still=True)
print('M4_SOURCE', out)
