"""Repair only the M4 ring/pinky transition around frame 62.

The C1 contact fitting intentionally ends before the post-seat transition.  This
round starts from its baked action and changes six left-hand joint curves only;
the palm, thumb, weapon, magazine, cuff and timing remain protected.
"""
import importlib.util
import json
import math
from pathlib import Path
import bpy
from mathutils import Matrix
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent

def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), HERE / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

inv = load('rifles-inventory')
lib = load('rifles-m4-actions-lib')
inv.guard()
SOURCE = inv.OUT / 'm4-actions-fingers-c1'
OUT = inv.OUT / 'm4-actions-fingers-c2'
assert SOURCE.resolve().is_relative_to(inv.OUT.resolve())
assert OUT.resolve().is_relative_to(inv.OUT.resolve())
assert inv.digest(SOURCE / 'm4-actions-runtime.glb') == '20fd7f8b69b9a88238596e1bccb089ca2bafeb5ad479f08c5ebe41f54344be06'
OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE / 'm4-actions.blend'), load_ui=False)
scene = bpy.context.scene
rig = bpy.data.objects['RIG_FP_ARMS']
glove = bpy.data.objects['GEO_FP_SK_Glove_01']
mag = bpy.data.objects['MINT_WEAPON_M4_MAG']
animated = (rig, bpy.data.objects['MINT_WEAPON_M4'], mag,
            bpy.data.objects['GEO_FP_SK_Cloth_01'].data.shape_keys)
fingers = ('ring', 'pinky')
names = [f'{finger}_0{k}_l' for finger in fingers for k in (1, 2, 3)]

def at(frame):
    for obj in animated:
        obj.animation_data.action = None
        for track in obj.animation_data.nla_tracks:
            track.mute = track.name != 'reload_tactical'
    scene.frame_set(frame + 1)
    scene.frame_set(frame)
    bpy.context.view_layer.update()

def points(obj):
    ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = ev.to_mesh()
    result = [ev.matrix_world @ v.co for v in mesh.vertices]
    ev.to_mesh_clear()
    return result

baseline = {}
for frame in range(73):
    at(frame)
    baseline[frame] = {pb.name: pb.matrix_basis.copy() for pb in rig.pose.bones}
# Axes derive from bind pose, then return to the actual transition frame.
at(62)
for track in rig.animation_data.nla_tracks:
    track.mute = True
for pb in rig.pose.bones:
    pb.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()
axes = lib.Rig(rig).finger_axes('l')
for pb in rig.pose.bones:
    pb.matrix_basis = baseline[62][pb.name]
bpy.context.view_layer.update()

ids = {}
groups = {g.index: g.name for g in glove.vertex_groups}
for finger in fingers:
    group_ids = {g.index for g in glove.vertex_groups if g.name.startswith(finger + '_') and g.name.endswith('_l')}
    ids[finger] = {v.index for v in glove.data.vertices if sum(g.weight for g in v.groups if g.group in group_ids) > .35}
mag_polys = [tuple(p.vertices) for p in mag.data.polygons]
glove_polys = {finger: [tuple(p.vertices) for p in glove.data.polygons if all(v in ids[finger] for v in p.vertices)] for finger in fingers}
assert all(glove_polys.values())

def crossings(pts, mag_pts, finger):
    mag_tree = BVHTree.FromPolygons(mag_pts, mag_polys)
    direct = 0
    for edge in glove.data.edges:
        a, b = edge.vertices
        if a not in ids[finger] or b not in ids[finger]:
            continue
        delta = pts[b] - pts[a]
        if delta.length < 1e-7:
            continue
        hit = mag_tree.ray_cast(pts[a], delta.normalized(), delta.length)
        if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
            direct += 1
    glove_tree = BVHTree.FromPolygons(pts, glove_polys[finger])
    reverse = 0
    for edge in mag.data.edges:
        a, b = edge.vertices
        delta = mag_pts[b] - mag_pts[a]
        if delta.length < 1e-7:
            continue
        hit = glove_tree.ray_cast(mag_pts[a], delta.normalized(), delta.length)
        if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
            reverse += 1
    distances = sorted(mag_tree.find_nearest(pts[i])[3] * 1000 for i in ids[finger])
    return {'direct': direct, 'reverse': reverse, 'p05_mm': distances[max(0, int((len(distances)-1)*.05))],
            'median_mm': distances[(len(distances)-1)//2]}

def pose(angles):
    for name, angle in angles.items():
        rig.pose.bones[name].matrix_basis = baseline[62][name] @ Matrix.Rotation(angle, 4, axes[name][0])
    bpy.context.view_layer.update()

def measure(angles):
    pose(angles)
    pts, mag_pts = points(glove), points(mag)
    return {finger: crossings(pts, mag_pts, finger) for finger in fingers}

def score(angles):
    m = measure(angles)
    hits = sum(v['direct'] + v['reverse'] for v in m.values())
    # Zero intersections outrank all pose preferences.  Once clear, favour the
    # smallest local rotation and prevent an implausibly distant hand.
    distance = sum(max(0., v['p05_mm'] - 18.) ** 2 for v in m.values())
    return hits * 1e6 + distance + .03 * sum(math.degrees(a) ** 2 for a in angles.values()), m

angles = {name: 0. for name in names}
best, before = score(angles)
# Coordinate descent is deterministic and bounded; it never moves the palm.
for step_deg in (24, 12, 6, 3, 1):
    for _ in range(12):
        changed = False
        for name in names:
            choice, value = angles.copy(), best
            for sign in (-1, 1):
                trial = angles.copy()
                trial[name] += math.radians(step_deg * sign)
                if not math.radians(-85) <= trial[name] <= math.radians(85):
                    continue
                loss, _ = score(trial)
                if loss < value - 1e-8:
                    choice, value = trial, loss
            if value < best - 1e-8:
                angles, best, changed = choice, value, True
        if not changed:
            break
after_score, after = score(angles)
# Refuse to bake a cosmetic change that leaves either direction intersecting.
assert all(v['direct'] == 0 and v['reverse'] == 0 for v in after.values()), (before, after, angles)

track = next(t for t in rig.animation_data.nla_tracks if t.name == 'reload_tactical')
strip = track.strips[0]
action = strip.action.copy()
action.name = 'reload_tactical__ring_pinky_transition_round'
for t in rig.animation_data.nla_tracks:
    t.mute = True
rig.animation_data.action = action
rig.animation_data.action_slot = action.slots[0]
for frame in range(73):
    scene.frame_set(frame)
    time = frame / lib.FPS
    envelope = lib.segment(time, 1.60, 1.95) * (1 - lib.segment(time, 2.15, 2.32))
    for name, angle in angles.items():
        pb = rig.pose.bones[name]
        pb.matrix_basis = baseline[frame][name] @ Matrix.Rotation(angle * envelope, 4, axes[name][0])
        pb.keyframe_insert('rotation_quaternion', frame=frame, group=name)
rig.animation_data.action = None
strip.action = action
strip.action_slot = action.slots[0]
# Endpoints and all non-authorised bones must remain exactly on the C1 action.
max_protected = max_endpoint = 0.
for frame in range(73):
    at(frame)
    for pb in rig.pose.bones:
        delta = max(abs(pb.matrix_basis[i][j] - baseline[frame][pb.name][i][j]) for i in range(4) for j in range(4))
        if pb.name not in names:
            max_protected = max(max_protected, delta)
        if frame in (0, 72):
            max_endpoint = max(max_endpoint, delta)
assert max_protected < 1e-5 and max_endpoint < 1e-5, (max_protected, max_endpoint)
at(62)
final = {finger: crossings(points(glove), points(mag), finger) for finger in fingers}
assert all(v['direct'] == 0 and v['reverse'] == 0 for v in final.values()), final
report = {'source_blend_sha256': inv.digest(SOURCE / 'm4-actions.blend'), 'source_glb_sha256': inv.digest(SOURCE / 'm4-actions-runtime.glb'),
          'frame': 62, 'method': 'Six ring/pinky local rotations only. Exact edge tests in both directions against the posed magazine; zero does not prove absence of containment or coplanar overlap.',
          'extra_degrees': {name: round(math.degrees(v), 4) for name, v in angles.items()}, 'before': before, 'after': final,
          'score': after_score, 'protected_bone_basis_max_delta': max_protected, 'endpoint_bone_basis_max_delta': max_endpoint,
          'envelope_seconds': [1.60, 1.95, 2.15, 2.32]}
(OUT / 'transition-fit.json').write_text(json.dumps(report, indent=2) + '\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'm4-actions.blend'))
build = json.loads((SOURCE / 'build.json').read_text())
build['ring_pinky_transition_round'] = report
(OUT / 'build.json').write_text(json.dumps(build, indent=1) + '\n')
print('M4_RING_PINKY_C2', json.dumps(report), flush=True)
