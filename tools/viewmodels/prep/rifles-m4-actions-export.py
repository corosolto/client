"""Export the M4 action candidate (GLB + camera + sockets) and produce evidence.

Evidence per clip: camera-space vertex dumps at sampled frames (for the CPU
parity check), contact/continuity measurements for every frame, critical-frame
renders in 3:2 and 16:9, close-ups, material-id renders and a motion sheet.
Writes only under artifacts/viewmodels/prep/rifles/m4-actions-c1/.
"""
import importlib.util
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), HERE / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


inv = load('rifles-inventory')
lib = load('rifles-m4-actions-lib')
inv.guard()
OUT = inv.OUT / 'm4-actions-c1'
assert OUT.resolve().is_relative_to(inv.OUT)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
FAST = '--fast' in argv            # skip the heavy renders while iterating on poses
ONLY = next((a for a in argv if a.startswith('--frames=')), None)
ONLY = [int(v) for v in ONLY.split('=')[1].split(',')] if ONLY else None   # subset of renders, no strip
CLIP = next((a for a in argv if not a.startswith('--')), 'reload_tactical')
build = json.loads((OUT / 'build.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'm4-actions.blend'), load_ui=False)
scene = bpy.context.scene
rig = bpy.data.objects['RIG_FP_ARMS']
gun = bpy.data.objects['MINT_WEAPON_M4']
mag = bpy.data.objects['MINT_WEAPON_M4_MAG']
camera = scene.camera
cloth_shape_keys = bpy.data.objects['GEO_FP_SK_Cloth_01'].data.shape_keys
assert cloth_shape_keys and cloth_shape_keys.animation_data
animated = [rig, gun, mag, cloth_shape_keys]
clips = {t.name: t for t in rig.animation_data.nla_tracks}
assert CLIP in clips and 'idle' in clips, list(clips)
frames_of = {name: build['clips'][name]['frames'] for name in clips}
S = build['gun_scale']
evidence = OUT / 'evidence' / CLIP
evidence.mkdir(parents=True, exist_ok=True)


def solo(name):
    for obj in animated:
        for track in obj.animation_data.nla_tracks:
            track.mute = track.name != name
        obj.animation_data.action = None


def at(name, frame):
    solo(name)
    scene.frame_set(frame + 1 if frame == 0 else frame - 1)
    scene.frame_set(frame)
    bpy.context.view_layer.update()


def rigid(m):
    return Matrix.Translation(m.translation) @ m.to_3x3().normalized().to_4x4()


def bone_head(name):
    return rigid(rig.matrix_world @ rig.pose.bones[name].matrix).translation


def bone_tail(name):
    pb = rig.pose.bones[name]
    return rig.matrix_world @ pb.tail


# ---------------------------------------------------------------- GLB export (all tracks)
for obj in animated:
    for track in obj.animation_data.nla_tracks:
        track.mute = False
    obj.animation_data.action = None
scene.frame_set(0)
glb = OUT / 'm4-actions-runtime.glb'
export_args = dict(filepath=str(glb), export_format='GLB', export_cameras=True, export_lights=False,
                   export_animations=True, export_animation_mode='NLA_TRACKS', export_merge_animation='NLA_TRACK',
                   export_skins=True, export_materials='EXPORT', export_image_format='WEBP', export_image_quality=82,
                   export_yup=True, export_force_sampling=True, export_optimize_animation_size=True,
                   export_optimize_animation_keep_anim_armature=True, export_optimize_animation_keep_anim_object=True,
                   export_frame_range=False)
bpy.ops.export_scene.gltf(**export_args)
glb_sha = inv.digest(glb)

# ---------------------------------------------------------------- per-frame measurements
mag_local_pts = [v.co.copy() for v in mag.data.vertices]
mag_lo, mag_hi = lib.bounds(mag_local_pts)
mag_polys = [tuple(p.vertices) for p in mag.data.polygons]
gun_polys = [tuple(p.vertices) for p in gun.data.polygons]
glove = bpy.data.objects['GEO_FP_SK_Glove_01']
glove_groups = {g.index: g.name for g in glove.vertex_groups}
left_ids = [v.index for v in glove.data.vertices
            if sum(g.weight for g in v.groups if glove_groups[g.group].endswith('_l')) > .6]
right_ids = [v.index for v in glove.data.vertices
             if sum(g.weight for g in v.groups if glove_groups[g.group].endswith('_r')) > .6]
left_finger_ids = {
    finger: [v.index for v in glove.data.vertices
             if sum(g.weight for g in v.groups if glove_groups[g.group].startswith(f'{finger}_')
                    and glove_groups[g.group].endswith('_l')) > .35]
    for finger in ('index', 'middle', 'ring', 'pinky', 'thumb')
}
assert all(left_finger_ids.values()), {name: len(ids) for name, ids in left_finger_ids.items()}
tips_l = [f'{f}_03_l' for f in ('index', 'middle', 'ring', 'pinky', 'thumb')]
tips_r = [f'{f}_03_r' for f in ('index', 'middle', 'ring', 'pinky', 'thumb')]
frames = frames_of[CLIP]
measure = {'clip': CLIP, 'frames': frames, 'seconds': frames / lib.FPS, 'per_frame': []}
prev = None


def evaluated_points(obj, dg):
    ev = obj.evaluated_get(dg)
    mesh = ev.to_mesh()
    pts = [ev.matrix_world @ v.co for v in mesh.vertices]
    ev.to_mesh_clear()
    return pts


def surface_distance_stats(points, ids, tree):
    """Distance of deformed glove vertices to the real, posed magazine surface."""
    distances = sorted(tree.find_nearest(points[index])[3] * 1000 for index in ids)
    assert distances
    return {'vertices': len(distances), 'min_mm': round(distances[0], 3),
            'p05_mm': round(distances[max(0, int((len(distances) - 1) * .05))], 3),
            'median_mm': round(distances[(len(distances) - 1) // 2], 3),
            'within_5mm': sum(distance <= 5 for distance in distances)}


for frame in range(frames + 1):
    at(CLIP, frame)
    dg = bpy.context.evaluated_depsgraph_get()
    gun_tree = BVHTree.FromPolygons([gun.matrix_world @ v.co for v in gun.data.vertices], gun_polys)
    mag_world = [mag.matrix_world @ v.co for v in mag.data.vertices]
    mag_tree = BVHTree.FromPolygons(mag_world, mag_polys)
    glove_pts = evaluated_points(glove, dg)
    row = {'frame': frame, 't': round(frame / lib.FPS, 5), 'phase': build['clips'][CLIP]['log'][frame]['phase'],
           'left_glove_to_mag_surface': {name: surface_distance_stats(glove_pts, ids, mag_tree)
                                         for name, ids in left_finger_ids.items()},
           'left_tips_to_gun_mm': {n: round(gun_tree.find_nearest(bone_tail(n))[3] * 1000, 2) for n in tips_l},
           'right_tips_to_gun_mm': {n: round(gun_tree.find_nearest(bone_tail(n))[3] * 1000, 2) for n in tips_r},
           'left_glove_vertices_measured': len(left_ids),
           'magazine_to_insert_mm': round((bpy.data.objects['magazine'].matrix_world.translation
                                           - bpy.data.objects['magazine_insert'].matrix_world.translation).length * 1000, 2),
           'hand_l': list(bone_head('hand_l')), 'hand_r': list(bone_head('hand_r')),
           'gun_origin': list(gun.matrix_world.translation), 'mag_origin': list(mag.matrix_world.translation)}
    # What the player can see: magazine vertices inside the camera frustum, per aspect.
    vis = {}
    for label, aspect in (('3x2', 1.5), ('16x9', 16 / 9)):
        half_h = math.atan(math.tan(math.radians(74) / 2) * (4 / 3))
        half_v = math.atan(math.tan(half_h) / aspect)
        inv_cam = camera.matrix_world.inverted()
        count = 0
        for p in mag_world:
            c = inv_cam @ p
            if c.z < 0 and abs(c.x / -c.z) < math.tan(half_h) and abs(c.y / -c.z) < math.tan(half_v):
                count += 1
        vis[label] = round(count / len(mag_world), 3)
    row['magazine_visible_fraction'] = vis
    if prev:
        row['step_mm'] = {k: round((Vector(row[k]) - Vector(prev[k])).length * 1000, 2) for k in ('hand_l', 'hand_r', 'gun_origin', 'mag_origin')}
    measure['per_frame'].append(row)
    prev = row
first, last = measure['per_frame'][0], measure['per_frame'][-1]
at('idle', 0)
idle_ref = {'hand_l': list(bone_head('hand_l')), 'hand_r': list(bone_head('hand_r')),
            'gun_origin': list(gun.matrix_world.translation), 'mag_origin': list(mag.matrix_world.translation)}
measure['return_to_idle_mm'] = {k: {'first': round((Vector(first[k]) - Vector(idle_ref[k])).length * 1000, 3),
                                    'last': round((Vector(last[k]) - Vector(idle_ref[k])).length * 1000, 3)} for k in idle_ref}
measure['max_step_mm'] = {k: max(r['step_mm'][k] for r in measure['per_frame'][1:]) for k in ('hand_l', 'hand_r', 'gun_origin', 'mag_origin')}
right_ref = measure['per_frame'][0]['right_tips_to_gun_mm']
measure['right_tips_max_deviation_from_idle_mm'] = max(abs(r['right_tips_to_gun_mm'][n] - right_ref[n]) for r in measure['per_frame'] for n in tips_r if n != 'index_03_r')
measure['right_index_max_deviation_mm'] = max(abs(r['right_tips_to_gun_mm']['index_03_r'] - right_ref['index_03_r']) for r in measure['per_frame'])
hold = [r for r in measure['per_frame'] if 'hold-mag' in r['phase']]
measure['hold_phase'] = {'frames': [hold[0]['frame'], hold[-1]['frame']] if hold else None,
                         'deformed_glove_to_mag_surface_mm': {finger: {
                             'min': min(r['left_glove_to_mag_surface'][finger]['min_mm'] for r in hold),
                             'p05_range': [min(r['left_glove_to_mag_surface'][finger]['p05_mm'] for r in hold),
                                           max(r['left_glove_to_mag_surface'][finger]['p05_mm'] for r in hold)],
                             'max_vertices_within_5mm': max(r['left_glove_to_mag_surface'][finger]['within_5mm'] for r in hold)
                         } for finger in left_finger_ids} if hold else None,
                         'method': 'evaluated glove vertices to posed magazine BVH; no AABB or bone-tail contact claim'}
seated = [r['frame'] for r in measure['per_frame'] if r['magazine_to_insert_mm'] < .5]
moving = [r['frame'] for r in measure['per_frame'] if r['magazine_to_insert_mm'] >= .5]
measure['magazine_events'] = {'first_frame_off_seat': moving[0] if moving else None, 'first_frame_reseated': next((f for f in seated if moving and f > moving[0]), None),
                              'game_events_frames': {k: round(v * frames, 2) for k, v in lib.GAME_RELOAD_EVENTS.items()}}
(evidence / 'measurements.json').write_text(json.dumps(measure, indent=1) + '\n')

# ---------------------------------------------------------------- camera-space dumps for the CPU check
SAMPLE_FRAMES = {'reload_tactical': [0, 13, 20, 27, 38, 45, 62, 72], 'idle': [0]}
dump = {'glb_sha256': glb_sha, 'fps': lib.FPS, 'camera': {'vfov': 74, 'aspect': 4 / 3}, 'clips': {}}
inverse = camera.matrix_world.inverted()
for name in ('idle', CLIP):
    dump['clips'][name] = {'frames': frames_of[name], 'samples': {}}
    for frame in SAMPLE_FRAMES.get(name, [0, frames_of[name]]):
        at(name, frame)
        dg = bpy.context.evaluated_depsgraph_get()
        sample = {'meshes': {}, 'sockets': {}}
        for obj in scene.objects:
            if obj.type == 'MESH':
                pts = evaluated_points(obj, dg)
                sample['meshes'][obj.name] = [[round(c, 7) for c in (inverse @ p)] for p in pts]
            elif obj.type == 'EMPTY':
                sample['sockets'][obj.name] = [round(c, 7) for c in (inverse @ obj.matrix_world.translation)]
        dump['clips'][name]['samples'][str(frame)] = sample
(OUT / 'blender-samples.json').write_text(json.dumps(dump) + '\n')

# ---------------------------------------------------------------- renders
solo(CLIP)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 12
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.render.film_transparent = True
scene.render.image_settings.color_mode = 'RGBA'
scene.render.resolution_percentage = 100
home_location, home_rotation = camera.location.copy(), camera.rotation_euler.copy()
home_lens = camera.data.lens


def render(path, width, height, frame, clip=CLIP, location=None, target=None, lens=None):
    at(clip, frame)
    camera.location = location if location is not None else home_location
    camera.rotation_euler = ((Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
                             if target is not None else home_rotation)
    camera.data.lens = lens if lens is not None else home_lens
    scene.render.resolution_x, scene.render.resolution_y = width, height
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


critical = SAMPLE_FRAMES.get(CLIP, [0, frames])
closeups = [13, 20, 45, 62] if CLIP == 'reload_tactical' else critical
if ONLY:
    critical = [f for f in ONLY]
    closeups = [f for f in ONLY]
if not FAST:
    for frame in critical:
        render(evidence / f'f{frame:03d}-1152x768.png', 1152, 768, frame)
        render(evidence / f'f{frame:03d}-1024x576.png', 1024, 576, frame)
    # Close-ups on the left hand / magazine from the camera side, following the hand.
    for frame in closeups:
        at(CLIP, frame)
        hand = bone_head('hand_l')
        toward_camera = (home_location - hand).normalized()
        render(evidence / f'f{frame:03d}-close-hand.png', 768, 576, frame, location=hand + toward_camera * .28 + Vector((0, 0, .03)), target=hand, lens=40)
        render(evidence / f'f{frame:03d}-close-hand-opposite.png', 768, 576, frame, location=hand - toward_camera * .28 + Vector((0, 0, .03)), target=hand, lens=40)
    # Material-id renders: cloth red, glove blue, skin green, gun grey, magazine orange.
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.light = 'FLAT'
    for obj in scene.objects:
        if obj.type != 'MESH':
            continue
        for material in obj.data.materials:
            material.diffuse_color = ((1, 0, 0, 1) if 'Cloth' in material.name else (0, 0, 1, 1) if 'Glove' in material.name
                                      else (0, 1, 0, 1) if obj.name.startswith('GEO_FP_') else (.3, .3, .3, 1))
    mag_mat = mag.data.materials[0].copy()
    mag_mat.name = 'QA_MAG_ID'
    mag_mat.diffuse_color = (1, .5, 0, 1)
    mag.data.materials[0] = mag_mat
    for frame in closeups:
        at(CLIP, frame)
        hand = bone_head('hand_l')
        toward_camera = (home_location - hand).normalized()
        render(evidence / f'f{frame:03d}-material-id.png', 768, 576, frame, location=hand + toward_camera * .28 + Vector((0, 0, .03)), target=hand, lens=40)
        render(evidence / f'f{frame:03d}-material-id-opposite.png', 768, 576, frame, location=hand - toward_camera * .28 + Vector((0, 0, .03)), target=hand, lens=40)
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 6
    strip = evidence / 'strip'
    strip.mkdir(exist_ok=True)
    for frame in ([] if ONLY else range(0, frames + 1, 3)):
        render(strip / f'f{frame:03d}.png', 384, 256, frame)
camera.location, camera.rotation_euler, camera.data.lens = home_location, home_rotation, home_lens
summary = {'glb': str(glb.relative_to(inv.ROOT)), 'glb_sha256': glb_sha, 'glb_bytes': glb.stat().st_size,
           'clips': {n: frames_of[n] / lib.FPS for n in frames_of}, 'measurements': str((evidence / 'measurements.json').relative_to(inv.ROOT)),
           'return_to_idle_mm': measure['return_to_idle_mm'], 'max_step_mm': measure['max_step_mm'],
           'hold_phase': measure['hold_phase'], 'magazine_events': measure['magazine_events'],
           'right_tips_max_deviation_from_idle_mm': measure['right_tips_max_deviation_from_idle_mm'],
           'right_index_max_deviation_mm': measure['right_index_max_deviation_mm'],
           'magazine_visible_fraction_at_frames': {str(r['frame']): r['magazine_visible_fraction'] for r in measure['per_frame'] if r['frame'] in critical}}
(evidence / 'summary.json').write_text(json.dumps(summary, indent=1) + '\n')
print('M4_ACTIONS_EXPORT', json.dumps(summary, indent=None))
