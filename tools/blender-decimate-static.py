"""Decima um GLB estático preservando materiais. Uso pelo optimize-ambient-fauna.mjs."""
import bpy
import sys

args = sys.argv[sys.argv.index('--') + 1:]
source, output, ratio = args[0], args[1], float(args[2])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)
meshes = [item for item in bpy.context.scene.objects if item.type == 'MESH']
for obj in meshes:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    modifier = obj.modifiers.new(name='CSBR_DECIMATE', type='DECIMATE')
    modifier.decimate_type = 'COLLAPSE'
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)

if len(meshes) > 1:
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()

bpy.ops.export_scene.gltf(
    filepath=output,
    export_format='GLB',
    export_animations=False,
    export_apply=True,
    export_yup=True,
)
