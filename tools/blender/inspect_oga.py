import bpy
import json
from pathlib import Path

out = {
    'objects': [(o.name, o.type, list(o.dimensions)) for o in bpy.context.scene.objects],
    'armatures': {},
    'meshes': {},
}
for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        out['armatures'][obj.name] = [bone.name for bone in obj.pose.bones]
    if obj.type == 'MESH':
        out['meshes'][obj.name] = [group.name for group in obj.vertex_groups]
Path('/tmp/fpvm-review/oga-inspect.json').write_text(json.dumps(out, indent=2))
