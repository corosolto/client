"""M4 composition candidate; private outputs only, no shared runtime edits."""
import importlib.util
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
from bpy_extras.object_utils import world_to_camera_view

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('inventory', Path(__file__).with_name('rifles-inventory.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
inv.guard()
OUT = inv.OUT / 'm4-candidate'
OUT.mkdir(exist_ok=True)
assert OUT.resolve().is_relative_to(inv.OUT)
source = inv.SOURCE / 'public/private-assets/viewmodels/ar/ar.blend'
inputs = json.loads((inv.OUT / 'inventory.json').read_text())
assert inv.digest(source) == inputs['family-source/ar/ar.blend']['sha256']
assert inv.digest(inv.ROOT / 'public/models/weapons/m4.glb') == inputs['mint/m4']['sha256']
bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
scene = bpy.context.scene
scene.frame_set(1)
bpy.context.view_layer.update()
rig = bpy.data.objects['RIG_FP_ARMS']
rig.location.y -= .12
bpy.context.view_layer.update()
pose = {b.name: b.matrix.copy() for b in rig.pose.bones}
weight_changes = {}
for obj in list(scene.objects):
    if obj.type != 'MESH' or not obj.name.startswith('GEO_FP_'):
        continue
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    weight_changes[obj.name] = sum(sum(g.weight > 0 for g in v.groups) > 4 for v in obj.data.vertices)
    bpy.ops.object.vertex_group_limit_total(group_select_mode='BONE_DEFORM', limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM', lock_active=False)
for obj in list(scene.objects):
    if obj.name.startswith(('GEO_WEAPON_', 'RIG_WEAPON_', 'SOCKET_WEAPON_')):
        bpy.data.objects.remove(obj, do_unlink=True)
rig.animation_data_clear()
for name, mat in pose.items():
    rig.pose.bones[name].matrix = mat
bpy.context.view_layer.update()
before = set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(inv.ROOT / 'public/models/weapons/m4.glb'))
gun = next(o for o in scene.objects if o not in before and o.type == 'MESH')
gun.name = 'MINT_WEAPON_M4'
scale = .84 / .998046875
gun.matrix_world = Matrix.Translation((-.078, -.38, 1.54)) @ Matrix.Scale(scale, 4) @ Matrix.Rotation(math.pi / 2, 4, 'Z')
bpy.context.view_layer.update()

def move_hand(side, target, rotation):
    upper, lower, hand = [rig.pose.bones[n + '_' + side] for n in ['upperarm', 'lowerarm', 'hand']]
    world = rig.matrix_world
    a, b, c = [world @ bone.head for bone in [upper, lower, hand]]
    length1, length2 = (b-a).length, (c-b).length
    direction = target - a
    assert direction.length < length1 + length2, f'Unreachable {side} wrist'
    distance = min(direction.length, length1 + length2 - .0001)
    direction.normalize()
    pole = (b-a) - direction * (b-a).dot(direction)
    pole.normalize()
    along = (length1**2 - length2**2 + distance**2) / (2*distance)
    elbow = a + direction*along + pole*math.sqrt(max(0, length1**2-along**2))
    for bone, origin, old, new in [(upper,a,b-a,elbow-a), (lower,elbow,c-b,target-elbow)]:
        desired = world @ pose[bone.name]
        desired = Matrix.Translation(origin) @ old.rotation_difference(new).to_matrix().to_4x4() @ Matrix.Translation(-Vector(desired.translation)) @ desired
        bone.matrix = world.inverted() @ desired
        bpy.context.view_layer.update()
    desired = world @ pose[hand.name]
    desired.translation = Vector((0,0,0))
    hand.matrix = world.inverted() @ Matrix.Translation(target) @ rotation @ desired
    bpy.context.view_layer.update()

move_hand('r', Vector((-.07786, -.16768, 1.48755)), Matrix.Identity(4))
mirror = Matrix.Diagonal((-1, 1, 1, 1))
target = Vector((-.078, -.445, 1.482))
right_wrist = rig.matrix_world @ pose['hand_r'].translation
shift = Matrix.Translation(target - mirror @ right_wrist)
desired_left = {}
for bone in [rig.pose.bones['hand_l'], *rig.pose.bones['hand_l'].children_recursive]:
    right = bone.name[:-2] + '_r'
    deformation = (rig.matrix_world @ pose[right]) @ (rig.matrix_world @ rig.data.bones[right].matrix_local).inverted()
    desired_left[bone.name] = shift @ mirror @ deformation @ mirror @ rig.matrix_world @ bone.bone.matrix_local
left_matrix = desired_left['hand_l']
rotation = (left_matrix.to_3x3() @ (rig.matrix_world @ pose['hand_l']).to_3x3().inverted()).to_4x4()
move_hand('l', left_matrix.translation, rotation)
for name, mat in desired_left.items():
    rig.pose.bones[name].matrix = rig.matrix_world.inverted() @ mat
    bpy.context.view_layer.update()
for joint in ['01', '02', '03']:
    index = rig.pose.bones[f'index_{joint}_l']
    middle = rig.pose.bones[f'middle_{joint}_l']
    index.rotation_mode = 'QUATERNION'
    index.rotation_quaternion = middle.matrix_basis.to_quaternion()
    right_index = rig.pose.bones[f'index_{joint}_r']
    right_index.rotation_mode = 'QUATERNION'
    right_index.rotation_quaternion = rig.pose.bones[f'middle_{joint}_r'].matrix_basis.to_quaternion()
scale_residue = max(abs(value-1) for bone in rig.pose.bones for value in bone.scale)
assert scale_residue < .001, f'Unexpected authored scale: {scale_residue}'
for bone in rig.pose.bones:
    bone.scale = (1,1,1)
    if bone.rotation_mode == 'QUATERNION':
        bone.rotation_quaternion.normalize()
bpy.context.view_layer.update()
arm_meshes = [o for o in scene.objects if o.type == 'MESH' and o.name.startswith('GEO_FP_')]
for obj in arm_meshes:
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    modifier = next(m for m in obj.modifiers if m.type == 'ARMATURE')
    bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')
for obj in arm_meshes:
    obj.modifiers.new('M4_POSE_BIND', 'ARMATURE').object = rig
bpy.context.view_layer.update()

camera = scene.camera
camera.data.sensor_fit = 'VERTICAL'
camera.data.sensor_height = 24
camera.data.lens = 24 / (2*math.tan(math.radians(74)/2))
camera.location = (.12, -.02, 1.766)
scene.render.resolution_x = 1024
scene.render.resolution_y = 768
scene.render.resolution_percentage = 100
scene.render.engine = 'BLENDER_WORKBENCH'
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.show_cavity = True
scene.render.film_transparent = True
scene.render.image_settings.color_mode = 'RGBA'
scene.render.filepath = str(OUT / 'idle.png')
bpy.ops.render.render(write_still=True)
for obj in scene.objects:
    if not obj.name.startswith('GEO_FP_'):
        continue
    for mat in obj.data.materials:
        role = 'cloth' if 'Cloth' in mat.name else 'glove' if 'Glove' in mat.name else 'skin'
        texture = inv.ROOT / f'public/models/viewmodels/coro/hands/pistol/{role}-E.webp'
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        principled = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
        for inp in ['Base Color', 'Normal', 'Roughness', 'Metallic']:
            for link in list(principled.inputs[inp].links):
                mat.node_tree.links.remove(link)
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(str(texture), check_existing=True)
        mat.node_tree.links.new(tex.outputs['Color'], principled.inputs['Base Color'])
        principled.inputs['Roughness'].default_value = .86
        principled.inputs['Metallic'].default_value = 0
scene.render.engine = 'CYCLES'
scene.cycles.samples = 12
scene.cycles.use_denoising = True
if scene.world is None:
    scene.world = bpy.data.worlds.new('QA_WORLD')
scene.world.use_nodes = True
scene.world.node_tree.nodes.get('Background').inputs[0].default_value = (.5,.55,.6,1)
scene.world.node_tree.nodes.get('Background').inputs[1].default_value = .7
lamp = bpy.data.lights.new('QA_KEY', 'AREA')
lamp.energy = 80
lamp.shape = 'DISK'
lamp.size = 1.5
light = bpy.data.objects.new('QA_KEY', lamp)
scene.collection.objects.link(light)
light.location = (.4,-.5,2.6)
light.rotation_euler = (Vector((-.08,-.4,1.5))-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath = str(OUT / 'idle-material.png')
bpy.ops.render.render(write_still=True)
camera.location = (-.70,-.51,1.55)
camera.rotation_euler = (Vector((-.07,-.51,1.49))-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x = 768
scene.render.resolution_y = 576
scene.render.filepath = str(OUT / 'support-side.png')
bpy.ops.render.render(write_still=True)
camera.location = (.12,-.02,1.766)
camera.rotation_euler = Vector((0,-1,0)).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x = 1024
scene.render.resolution_y = 768
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'm4-candidate.blend'))
record = {'source_sha256': inv.digest(source), 'vertices_over_four_weights_in_source':weight_changes,
          'max_imported_bone_scale_residue_removed':scale_residue,
          'camera': {'world': [list(r) for r in camera.matrix_world], 'vfov':74},
          'meshes': {o.name: {'matrix': [list(r) for r in o.matrix_world], 'vertices': len(o.data.vertices)}
                     for o in scene.objects if o.type == 'MESH'}, 'status': 'composition-only; actions pending'}
(OUT / 'candidate.json').write_text(json.dumps(record, indent=2) + '\n')
print('M4_CANDIDATE', OUT)
