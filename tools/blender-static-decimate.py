"""Reduz um GLB estático para orçamento de navegador preservando materiais/texturas.

Uso:
  blender --background --python tools/blender-static-decimate.py -- in.glb out.glb 12000

Só serve para prop estático: armature/shape keys exigem outro pipeline. A razão é derivada
dos triângulos reais; o número-alvo vem do contrato do asset, não deste script.
"""
import pathlib
import sys
import bpy


args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(args) < 2:
    raise SystemExit("uso: blender --background --python <script> -- entrada.glb saida.glb [triangulos]")

source = pathlib.Path(args[0]).resolve()
output = pathlib.Path(args[1]).resolve()
target = max(500, int(args[2]) if len(args) > 2 else 12000)
if not source.is_file():
    raise SystemExit(f"GLB inexistente: {source}")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not meshes:
    raise SystemExit("GLB sem mesh")
if any(obj.find_armature() or obj.data.shape_keys for obj in meshes):
    raise SystemExit("asset rigado/shape key: decimator estático recusou")

before = sum(len(obj.data.loop_triangles) for obj in meshes)
ratio = min(1.0, target / max(1, before))
if ratio < 0.999:
    for obj in meshes:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        mod = obj.modifiers.new(name="BrowserBudget", type="DECIMATE")
        mod.decimate_type = "COLLAPSE"
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.select_set(False)

after = sum(len(obj.data.loop_triangles) for obj in meshes)
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(output), export_format="GLB", export_apply=True,
    export_materials="EXPORT", export_image_format="AUTO",
    export_yup=True, export_animations=False,
)
print(f"STATIC_DECIMATE before={before} target={target} after={after} ratio={ratio:.7f} out={output}")
