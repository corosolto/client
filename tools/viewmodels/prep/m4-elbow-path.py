"""Test an anatomical elbow pole while preserving the hand and magazine paths."""
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import subprocess
import sys

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[3]
assert ROOT.name == 'vm-m4-reload-evidence'
assert subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip() == 'codex/vm-m4-reload-evidence'
RIFLES = ROOT.parent / 'vm-prep-rifles'
SOURCE = RIFLES / 'artifacts/viewmodels/prep/rifles/m4-actions-fingers-c1/m4-actions.blend'
ORIENT = '--orient-mag' in sys.argv
OUT = ROOT / ('artifacts/viewmodels/m4-elbow-mag-path' if ORIENT else 'artifacts/viewmodels/m4-elbow-path')
assert OUT.resolve().is_relative_to(ROOT.resolve())
OUT.mkdir(parents=True, exist_ok=True)
source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
assert source_hash == '2955150a0ea7842d08d0fb205ad96691c090df3ac5562be9a0303595df89ac5b'
spec = importlib.util.spec_from_file_location('m4_rig', RIFLES / 'tools/viewmodels/prep/rifles-m4-actions-lib.py')
lib = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lib)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE), load_ui=False)
scene = bpy.context.scene
rig = bpy.data.objects['RIG_FP_ARMS']
mag = bpy.data.objects['MINT_WEAPON_M4_MAG']
cam = scene.camera
home = cam.matrix_world.copy()
home_lens = cam.data.lens
meshes = [o for o in scene.objects if o.type == 'MESH' and not o.hide_render]
original_colors = {o.name: tuple(o.color) for o in meshes}


def at(frame):
    scene.frame_set(frame + 1)
    scene.frame_set(frame)
    bpy.context.view_layer.update()


for obj in scene.objects:
    for data in (obj, obj.data.shape_keys if obj.type == 'MESH' else None):
        if data and data.animation_data:
            data.animation_data.action = None
            for track in data.animation_data.nla_tracks:
                track.mute = track.name != 'reload_tactical'
baseline = {}
for frame in range(73):
    at(frame)
    baseline[frame] = {b.name: b.matrix_basis.copy() for b in rig.pose.bones}
for track in rig.animation_data.nla_tracks:
    track.mute = True
for bone in rig.pose.bones:
    bone.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()
driver = lib.Rig(rig)
idle_low = driver.head('lowerarm_l')
idle_hand = driver.head('hand_l')
rest_rel = driver.idle['lowerarm_l'].to_quaternion().inverted() @ driver.idle['hand_l'].to_quaternion()


def rigid_bone(name):
    return driver.rigid_world(rig.pose.bones[name].matrix)


def angle():
    rel = rigid_bone('lowerarm_l').to_quaternion().inverted() @ rigid_bone('hand_l').to_quaternion()
    degrees = math.degrees(rest_rel.rotation_difference(rel).angle)
    return min(degrees, 360 - degrees)


def pose(frame, candidate):
    at(frame)
    for name, matrix in baseline[frame].items():
        rig.pose.bones[name].matrix_basis = matrix
    bpy.context.view_layer.update()
    target = rigid_bone('hand_l')
    original_target = target.copy()
    mag_before = mag.matrix_world.copy()
    original = angle()
    fingers = {b.name: rigid_bone(b.name) for b in rig.pose.bones if b.name.endswith('_l') and any(b.name.startswith(x) for x in ('thumb', 'index', 'middle', 'ring', 'pinky'))}
    strength = lib.segment(frame, 18., 24.) * (1 - lib.segment(frame, 36., 42.)) if candidate else 0.
    if strength:
        rotation = target.to_quaternion() @ driver.idle['hand_l'].to_quaternion().inverted()
        ideal = target.translation - rotation @ (idle_hand - idle_low)
        hint = idle_low.lerp(ideal, strength)
        desired, info = driver.two_bone('l', target, elbow_hint=hint)
        if ORIENT:
            neutral = desired['lowerarm_l'].to_quaternion() @ rest_rel
            target = Matrix.Translation(target.translation) @ target.to_quaternion().slerp(neutral, strength).to_matrix().to_4x4()
            desired['hand_l'] = target
            mag.matrix_world = target @ original_target.inverted() @ mag_before
        for name in ('upperarm_l', 'lowerarm_l', 'hand_l'):
            rig.pose.bones[name].matrix = driver.to_armature(desired[name])
            bpy.context.view_layer.update()
        rig.pose.bones['lowerarm_twist_01_l'].rotation_quaternion = driver.twist_rotation('l', info['twist'] * (1 - strength if ORIENT else 1), desired['lowerarm_l']).to_quaternion()
        bpy.context.view_layer.update()
    after = angle()
    hand_error = max(abs(a - b) for ra, rb in zip(target, rigid_bone('hand_l')) for a, b in zip(ra, rb))
    delta = target @ original_target.inverted()
    finger_error = max(abs(a - b) for name, old in fingers.items() for ra, rb in zip(delta @ old, rigid_bone(name)) for a, b in zip(ra, rb))
    mag_error = max(abs(a - b) for ra, rb in zip(delta @ mag_before, mag.matrix_world) for a, b in zip(ra, rb))
    assert hand_error < 1e-5 and finger_error < 1e-5, (frame, hand_error, finger_error)
    assert mag_error < 1e-5
    return {'before_wrist_delta_deg': original, 'after_wrist_delta_deg': after,
            'hand_matrix_error': hand_error, 'finger_matrix_error': finger_error, 'mag_matrix_error': mag_error, 'strength': strength}


report = {'source_sha256': source_hash, 'orient_mag': ORIENT, 'method': 'Elbow pole derived from target hand orientation; '
          'only during swing frames 18–42. Optional hand/magazine rigid rotation towards bind wrist relationship. '
          'Finger and magazine relationship to hand protected. '
          'Wrist angle is rotation from approved bind relationship, not a clinical joint limit.', 'frames': {}}
baked = {}
changed_bones = ('upperarm_l', 'lowerarm_l', 'hand_l', 'lowerarm_twist_01_l')
for frame in range(73):
    report['frames'][str(frame)] = pose(frame, True)
    baked[frame] = {'bones': {name: rig.pose.bones[name].matrix_basis.copy() for name in changed_bones},
                    'mag': mag.matrix_basis.copy()}
(OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
scene.render.engine = 'BLENDER_WORKBENCH'
scene.render.resolution_x, scene.render.resolution_y = 768, 576
scene.render.resolution_percentage = 100
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.render.film_transparent = False
scene.display.shading.color_type = 'OBJECT'
scene.display.shading.light = 'STUDIO'
scene.display.shading.show_cavity = True
for obj in meshes:
    obj.color = ((.8, .05, .05, 1) if 'Cloth' in obj.name else (.05, .15, .8, 1) if 'Glove' in obj.name
                 else (.15, .85, .2, 1) if obj.name == 'GEO_FP_SK_Hand' else (.3, .3, .3, 1))
for frame in (20, 25, 30, 35, 40):
    for candidate in (False, True):
        pose(frame, candidate)
        wrist = rigid_bone('hand_l').translation
        direction = (home.translation - wrist).normalized()
        for side, sign in (('front', 1), ('opposite', -1)):
            cam.location = wrist + direction * .28 * sign + Vector((0, 0, .03))
            cam.rotation_euler = (wrist - cam.location).to_track_quat('-Z', 'Y').to_euler()
            cam.data.lens = 40
            scene.render.filepath = str(OUT / f'f{frame:03d}-{side}-{"after" if candidate else "before"}.png')
            bpy.ops.render.render(write_still=True)
if ORIENT:
    for frame in range(0, 73, 3):
        pose(frame, True)
        cam.matrix_world, cam.data.lens = home, home_lens
        for label, width, height in (('3x2', 768, 512), ('16x9', 768, 432)):
            scene.render.resolution_x, scene.render.resolution_y = width, height
            scene.render.filepath = str(OUT / f'motion-{label}-f{frame:03d}.png')
            bpy.ops.render.render(write_still=True)
    cam.matrix_world, cam.data.lens = home, home_lens
    for obj in meshes:
        obj.color = original_colors[obj.name]
    for obj in (rig, mag):
        strip = next(t for t in obj.animation_data.nla_tracks if t.name == 'reload_tactical').strips[0]
        action = strip.action.copy()
        obj.animation_data.action = action
        obj.animation_data.action_slot = action.slots[0]
        for frame, state in baked.items():
            scene.frame_set(frame)
            if obj == rig:
                for name, basis in state['bones'].items():
                    bone = rig.pose.bones[name]
                    bone.matrix_basis = basis
                    bone.keyframe_insert('location', frame=frame, group=name)
                    bone.keyframe_insert('rotation_quaternion', frame=frame, group=name)
            else:
                mag.matrix_basis = state['mag']
                mag.keyframe_insert('location', frame=frame)
                mag.keyframe_insert('rotation_quaternion', frame=frame)
        obj.animation_data.action = None
        strip.action = action
        strip.action_slot = action.slots[0]
    for obj in scene.objects:
        for data in (obj, obj.data.shape_keys if obj.type == 'MESH' else None):
            if data and data.animation_data:
                data.animation_data.action = None
                for track in data.animation_data.nla_tracks:
                    track.mute = False
    scene.frame_set(0)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'm4-actions.blend'))
    bpy.ops.export_scene.gltf(filepath=str(OUT / 'm4-actions-runtime.glb'), export_format='GLB',
        export_cameras=True, export_lights=False, export_animations=True,
        export_animation_mode='NLA_TRACKS', export_merge_animation='NLA_TRACK', export_skins=True,
        export_materials='EXPORT', export_image_format='WEBP', export_image_quality=82,
        export_yup=True, export_force_sampling=True, export_optimize_animation_size=True,
        export_optimize_animation_keep_anim_armature=True, export_optimize_animation_keep_anim_object=True,
        export_frame_range=False)
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == source_hash
print('M4_ELBOW', json.dumps({f: report['frames'][str(f)] for f in (20, 25, 30, 35, 40)}), flush=True)
