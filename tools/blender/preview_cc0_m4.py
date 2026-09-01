"""Cena de revisão M4 com o rig de dedos CC0 preparado para o viewmodel."""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'public/models/viewmodels/fpvm_arms_working.blend'
M4 = ROOT / 'public/models/weapons/m4.glb'
OUT = ROOT / 'public/models/viewmodels/fpvm_cc0_m4_preview.png'
BLEND = ROOT / 'public/models/viewmodels/fpvm_cc0_m4_layout.blend'


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


bpy.ops.wm.open_mainfile(filepath=str(BASE))
before = set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(M4))
imported = [o for o in bpy.context.scene.objects if o not in before]
# The source GLB carries its own studio cube/camera/light.  They are useful for
# an icon preview but would occlude and relight the first-person composition.
for obj in list(imported):
    if obj.name in {'Cube', 'Camera', 'Light'}:
        bpy.data.objects.remove(obj, do_unlink=True)
        imported.remove(obj)
pivot = bpy.data.objects.new('weapon.m4.preview', None)
bpy.context.collection.objects.link(pivot)
for obj in imported:
    if obj.parent is None:
        obj.parent = pivot

# A arma nasce longitudinal em X. A composição mantém o centro livre e põe
# cano/coronh a em diagonal, na leitura clássica de viewmodel.
# The CC0 mold's relaxed hands have the grip and support contact points on the
# X axis.  Place the receiver between them first; it proves contact before we
# author the per-weapon combat cant and finger curls.
pivot.rotation_euler = (0, 0, 0)
pivot.scale = (.84, .84, .84)
pivot.location = (0, -.53, .49)

# A cena preparada já traz câmera/luzes; apenas retoma o alvo para a arma.
camera = bpy.context.scene.camera
camera.location = (0, -2.10, .40)
camera.data.lens = 52
look_at(camera, (0, -.30, .49))
for obj in bpy.context.scene.objects:
    if obj.type == 'LIGHT':
        look_at(obj, (0, -.30, .49))

bpy.context.scene.render.filepath = str(OUT)
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
bpy.ops.render.render(write_still=True)
