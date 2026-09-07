"""Export the re-authored M4 idle grip, verify the round trip and shoot the sheets.

The candidate only means something if the GLB carries the pose that was measured,
so the exported file is read back and its deformed vertices are compared with
Blender's own evaluation.  The sheets are rendered in both delivery aspects and
against the approved pose, because the owner approved a look, not a number.
"""
import importlib.util
import json
import sys
from pathlib import Path
import bpy
from mathutils import Vector, kdtree

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), HERE / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


inv = load('rifles-inventory')
inv.guard()
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = inv.OUT / next((a.split('=')[1] for a in argv if a.startswith('--out=')), 'm4-idle-grip-c4')
APPROVED = inv.OUT / 'm4-actions-c1/input/m4-approved.blend'
assert OUT.resolve().is_relative_to(inv.OUT.resolve()) and (OUT / 'm4-idle-grip.blend').is_file()
ASPECTS = {'3x2': (1152, 768), '16x9': (1024, 576)}
SAMPLES = 96

bpy.ops.wm.open_mainfile(filepath=str(OUT / 'm4-idle-grip.blend'), load_ui=False)
scene = bpy.context.scene
rig = bpy.data.objects['RIG_FP_ARMS']
glove = bpy.data.objects["GEO_FP_SK_Glove_01"]
scene.frame_set(0)
bpy.context.view_layer.update()


def deformed(obj):
    ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = ev.to_mesh()
    pts = [(ev.matrix_world @ v.co).copy() for v in mesh.vertices]
    ev.to_mesh_clear()
    return pts


before = {name: deformed(bpy.data.objects[name]) for name in ('GEO_FP_SK_Glove_01', 'MINT_WEAPON_M4')}
glb = OUT / 'm4-idle-grip.glb'
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', export_cameras=True, export_lights=False,
                          export_animations=True, export_animation_mode='ACTIONS', export_skins=True,
                          export_materials='EXPORT', export_image_format='WEBP', export_image_quality=82,
                          export_yup=True, export_force_sampling=True, export_frame_range=False)
record = {'glb': glb.name, 'glb_sha256': inv.digest(glb), 'glb_bytes': glb.stat().st_size,
          'source_blend_sha256': inv.digest(OUT / 'm4-idle-grip.blend')}

# ---------------------------------------------------------------- round trip
bpy.ops.wm.read_homefile(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
scene = bpy.context.scene
scene.frame_set(0)
bpy.context.view_layer.update()
imported = {obj.name: deformed(obj) for obj in bpy.data.objects
            if obj.type == 'MESH' and obj.name in before}
assert set(imported) == set(before), (sorted(imported), sorted(before))


def farthest(source, target):
    """glTF splits vertices at seams, so positions are compared, not indices:
    every source position must coincide with an imported one."""
    tree = kdtree.KDTree(len(target))
    for index, point in enumerate(target):
        tree.insert(point, index)
    tree.balance()
    return max(tree.find(point)[2] for point in source)


worst = {name: farthest(points, imported[name]) for name, points in before.items()}
record['reimport_worst_delta'] = {k: float(v) for k, v in worst.items()}
record['reimport_counts'] = {k: [len(before[k]), len(imported[k])] for k in before}
record['reimport_tolerance'] = 1e-5
assert max(worst.values()) < 1e-5, worst

# The round trip has to be able to fail: one deliberately moved vertex must break
# the same comparison that just passed.
shifted = [p.copy() for p in before['GEO_FP_SK_Glove_01']]
shifted[0].x += .001
mutant = farthest(shifted, imported['GEO_FP_SK_Glove_01'])
assert mutant > 1e-5, mutant
record['reimport_mutant_delta'] = float(mutant)

# ---------------------------------------------------------------- sheets
sheets = {}
for label, blend in (('approved', APPROVED), ('candidate', OUT / 'm4-idle-grip.blend')):
    bpy.ops.wm.open_mainfile(filepath=str(blend), load_ui=False)
    scene = bpy.context.scene
    scene.frame_set(0)
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.camera = bpy.data.objects['VIEWMODEL_CAMERA']
    (OUT / 'evidence').mkdir(exist_ok=True)
    for aspect, (width, height) in ASPECTS.items():
        scene.render.resolution_x, scene.render.resolution_y = width, height
        path = OUT / f'evidence/idle-{label}-{aspect}.png'
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        sheets[f'{label}-{aspect}'] = path.name
    # A hand-sized view as well: the grip is what changed, and it is small on the sheet.
    close = bpy.data.objects.new('CLOSE_CAM', bpy.data.cameras.new('CLOSE_CAM'))
    scene.collection.objects.link(close)
    close.data.lens = 55
    # Frame the grip itself, far enough back that the fingers and the foregrip
    # are both in shot; the first attempt filled the frame with the back of a hand.
    gun_obj = bpy.data.objects['MINT_WEAPON_M4']
    grip_ids = [v.index for v in gun_obj.data.vertices if -.20 < v.co.x < -.14 and v.co.z < -.02]
    focus = sum((gun_obj.matrix_world @ gun_obj.data.vertices[i].co for i in grip_ids), Vector()) / len(grip_ids)
    for name, offset in (('left', (-.02, -.22, .04)), ('front', (-.20, -.10, .02)), ('under', (-.05, -.12, -.18))):
        close.location = focus + Vector(offset)
        close.rotation_euler = (focus - close.location).to_track_quat('-Z', 'Y').to_euler()
        scene.camera = close
        scene.render.resolution_x, scene.render.resolution_y = 900, 600
        path = OUT / f'evidence/grip-{label}-{name}.png'
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        sheets[f'grip-{label}-{name}'] = path.name
        # The lit pass is what the player sees; this one is what a reviewer can
        # actually read, with the glove and the weapon told apart by colour.
        scene.render.engine = 'BLENDER_WORKBENCH'
        scene.display.shading.light = 'STUDIO'
        scene.display.shading.color_type = 'OBJECT'
        for obj, colour in ((bpy.data.objects["GEO_FP_SK_Glove_01"], (.30, .55, .95, 1)), (gun_obj, (.25, .25, .27, 1)),
                            (bpy.data.objects['GEO_FP_SK_Cloth_01'], (.85, .35, .35, 1)),
                            (bpy.data.objects['GEO_FP_SK_Hand'], (.95, .80, .65, 1))):
            obj.color = colour
        flat = OUT / f'evidence/grip-{label}-{name}-flat.png'
        scene.render.filepath = str(flat)
        bpy.ops.render.render(write_still=True)
        sheets[f'grip-{label}-{name}-flat'] = flat.name
        scene.render.engine = 'CYCLES'
record['sheets'] = sheets
(OUT / 'export-check.json').write_text(json.dumps(record, indent=1) + '\n')
print('M4_IDLE_EXPORT', json.dumps({k: v for k, v in record.items() if k != 'sheets'}))
