import bpy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts/viewmodels/astra-series/hand-continuity'
OUT.mkdir(parents=True, exist_ok=True)
report = {}
for name, source in [('knife', 'public/models/viewmodels/coro/melee/knife-hires.glb'),
                     ('pistol', 'public/private-assets/viewmodels/pistol/pistol-runtime.glb')]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / source))
    meshes = []
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue
        materials = [m.name if m else '' for m in obj.data.materials]
        is_hand = any('CoroSolto_FP_' in m or 'Mandrake' in m for m in materials)
        groups = {g.index: g.name for g in obj.vertex_groups}
        bounds = [[min(v.co[i] for v in obj.data.vertices), max(v.co[i] for v in obj.data.vertices)] for i in range(3)]
        meshes.append({'name': obj.name, 'materials': materials, 'vertices': len(obj.data.vertices),
                       'bounds': bounds, 'scale': list(obj.scale), 'hand': is_hand,
                       'groups': list(groups.values()) if is_hand else []})
        if not is_hand:
            continue
        uv = obj.data.uv_layers.active
        faces = []
        obj.data.calc_loop_triangles()
        for tri in obj.data.loop_triangles:
            faces.append({'material': tri.material_index,
                          'uv': [list(uv.data[i].uv) for i in tri.loops],
                          'vertices': list(tri.vertices)})
        vertices = [{'p': list(v.co), 'weights': [[groups[g.group], g.weight] for g in v.groups]} for v in obj.data.vertices]
        (OUT / f'{name}-{obj.name}.json').write_text(json.dumps({'materials': materials, 'vertices': vertices, 'faces': faces}))
    rigs = [{ 'name': o.name, 'scale': list(o.scale), 'bones': [{'name': b.name, 'head': list(b.head_local), 'tail': list(b.tail_local)} for b in o.data.bones]} for o in bpy.data.objects if o.type == 'ARMATURE']
    report[name] = {'source': source, 'meshes': meshes, 'rigs': rigs,
                    'cameras': [{'name': o.name, 'lens': o.data.lens, 'angle': o.data.angle, 'matrix': [list(row) for row in o.matrix_world]} for o in bpy.data.objects if o.type == 'CAMERA']}
(OUT / 'inspection.json').write_text(json.dumps(report, indent=2))
print(json.dumps({k: [{'name': m['name'], 'materials': m['materials'], 'bounds': m['bounds'], 'vertices': m['vertices']} for m in v['meshes']] for k, v in report.items()}))
