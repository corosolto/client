"""One offline round: fit four finger chains, preserving the tactical wrist path."""
import importlib.util
import json
import math
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
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
SOURCE = inv.OUT / 'm4-actions-c1'
OUT = inv.OUT / 'm4-actions-fingers-c1'
assert OUT.resolve().is_relative_to(inv.OUT.resolve())
OUT.mkdir(exist_ok=True)
source = SOURCE / 'm4-actions.blend'
assert inv.digest(SOURCE / 'm4-actions-runtime.glb') == '6c48a225f265785cf92410dccdd69712e085b1c6dcf54f1ab4aa09221422cb7e'
bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False)
scene = bpy.context.scene
rig = bpy.data.objects['RIG_FP_ARMS']
glove = bpy.data.objects['GEO_FP_SK_Glove_01']
mag = bpy.data.objects['MINT_WEAPON_M4_MAG']
fingers = ('index', 'middle', 'ring', 'pinky')
names = [f'{finger}_0{k}_l' for finger in fingers for k in (1, 2, 3)]
animated = (rig, bpy.data.objects['MINT_WEAPON_M4'], mag,
            bpy.data.objects['GEO_FP_SK_Cloth_01'].data.shape_keys)


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
at(20)
for track in rig.animation_data.nla_tracks:
    track.mute = True
for pb in rig.pose.bones:
    pb.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()
axes = lib.Rig(rig).finger_axes('l')
for pb in rig.pose.bones:
    pb.matrix_basis = baseline[20][pb.name]
bpy.context.view_layer.update()
tree = BVHTree.FromPolygons(points(mag), [tuple(p.vertices) for p in mag.data.polygons])
groups = {g.index: g.name for g in glove.vertex_groups}
ids = {finger: [v.index for v in glove.data.vertices
                if sum(g.weight for g in v.groups if groups[g.group].startswith(finger + '_')
                       and groups[g.group].endswith('_l')) > .35]
       for finger in fingers}
finger_edges = {finger: [tuple(edge.vertices) for edge in glove.data.edges
                         if all(i in ids[finger] for i in edge.vertices)] for finger in fingers}
adjacent = {v.index: set() for v in glove.data.vertices}
for edge in glove.data.edges:
    a, b = edge.vertices
    adjacent[a].add(b)
    adjacent[b].add(a)
before = points(glove)
patches = {}
for finger in fingers:
    distal = {v.index for v in glove.data.vertices if v.index in ids[finger]
              and sum(g.weight for g in v.groups if groups[g.group] in
                      {finger + '_02_l', finger + '_03_l'}) > .35}
    seed = min(distal, key=lambda i: tree.find_nearest(before[i])[3])
    patch, frontier = {seed}, [seed]
    while frontier:
        current = frontier.pop()
        for neighbor in adjacent[current] & distal - patch:
            if (before[neighbor] - before[seed]).length <= .007:
                patch.add(neighbor)
                frontier.append(neighbor)
    assert len(patch) >= 3, (finger, len(patch))
    patches[finger] = sorted(patch)


def stats(pts, finger):
    distances = sorted(tree.find_nearest(pts[i])[3] * 1000 for i in ids[finger])
    patch = [tree.find_nearest(pts[i])[3] * 1000 for i in patches[finger]]
    return {'min_mm': distances[0], 'p05_mm': distances[int(.05 * (len(distances) - 1))],
            'vertices_within_5mm': sum(d <= 5 for d in distances),
            'fixed_patch_vertices': len(patch), 'patch_max_mm': max(patch),
            'patch_mean_mm': sum(patch) / len(patch)}


def pose(finger, angles):
    for k, angle in enumerate(angles, 1):
        name = f'{finger}_0{k}_l'
        rig.pose.bones[name].matrix_basis = baseline[20][name] @ Matrix.Rotation(angle, 4, axes[name][0])
    bpy.context.view_layer.update()


def score(finger, angles):
    pose(finger, angles)
    pts = points(glove)
    for a, b in finger_edges[finger]:
        delta = pts[b] - pts[a]
        if delta.length < 1e-7:
            continue
        hit = tree.ray_cast(pts[a], delta.normalized(), delta.length)
        if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
            return 1e9
    patch_cost = sum((tree.find_nearest(pts[i])[3] * 1000 - 1.5) ** 2
                     for i in patches[finger]) / len(patches[finger])
    penetration = []
    for i in ids[finger]:
        nearest, normal, _, distance = tree.find_nearest(pts[i])
        signed = (pts[i] - nearest).dot(normal) * 1000
        if distance < .03 and signed < -1:
            penetration.append((-signed - 1) ** 2)
    return patch_cost + 20 * sum(penetration) / len(ids[finger]) + .02 * sum(a*a for a in angles)


report = {'source_blend_sha256': inv.digest(source), 'reference_frame': 20,
          'method': 'Fixed connected distal surface patches; local joint rotations only. '
                    'Reject glove-edge/magazine-triangle crossings. Nearest-normal penalty '
                    'remains a heuristic; zero edge hits alone cannot exclude containment.',
          'before': {finger: stats(before, finger) for finger in fingers}, 'fit': {}}
for finger in fingers:
    angles = [0., 0., 0.]
    best = score(finger, angles)
    for step_deg in (12, 6, 3, 1):
        for sweep in range(8):
            changed = False
            for j in range(3):
                choice, value = list(angles), best
                for sign in (-1, 1):
                    trial = list(angles)
                    trial[j] += math.radians(step_deg * sign)
                    if not math.radians(-20) <= trial[j] <= math.radians(75):
                        continue
                    loss = score(finger, trial)
                    if loss < value:
                        choice, value = trial, loss
                if value < best:
                    angles, best, changed = choice, value, True
            if not changed:
                break
    pose(finger, angles)
    report['fit'][finger] = {'extra_degrees': [math.degrees(a) for a in angles],
                             'patch_ids': patches[finger], 'score': best,
                             'after': stats(points(glove), finger)}
    print('FINGER_FIT', finger, json.dumps(report['fit'][finger]), flush=True)

extras = {f'{finger}_0{k}_l': math.radians(report['fit'][finger]['extra_degrees'][k - 1])
          for finger in fingers for k in (1, 2, 3)}
track = next(t for t in rig.animation_data.nla_tracks if t.name == 'reload_tactical')
strip = track.strips[0]
action = strip.action.copy()
action.name = 'reload_tactical__finger_contact_round'
for track in rig.animation_data.nla_tracks:
    track.mute = True
rig.animation_data.action = action
rig.animation_data.action_slot = action.slots[0]
for frame in range(73):
    scene.frame_set(frame)
    t = frame / lib.FPS
    amount = lib.segment(t, .10, .40) * (1 - lib.segment(t, 1.56, 2.02))
    for name, angle in extras.items():
        pb = rig.pose.bones[name]
        pb.matrix_basis = baseline[frame][name] @ Matrix.Rotation(angle * amount, 4, axes[name][0])
        pb.keyframe_insert('rotation_quaternion', frame=frame, group=name)
rig.animation_data.action = None
strip.action = action
strip.action_slot = action.slots[0]
max_unmodified = 0.
max_endpoints = 0.
for frame in range(73):
    at(frame)
    for pb in rig.pose.bones:
        delta = max(abs(pb.matrix_basis[i][j] - baseline[frame][pb.name][i][j])
                    for i in range(4) for j in range(4))
        if pb.name not in extras:
            max_unmodified = max(max_unmodified, delta)
        if frame in (0, 72):
            max_endpoints = max(max_endpoints, delta)
assert max_unmodified < 1e-5 and max_endpoints < 1e-5, (max_unmodified, max_endpoints)
report['unchanged_bone_basis_max_delta'] = max_unmodified
report['endpoint_bone_basis_max_delta'] = max_endpoints
at(0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'm4-actions.blend'))
build = json.loads((SOURCE / 'build.json').read_text())
build['finger_contact_round'] = report
(OUT / 'build.json').write_text(json.dumps(build, indent=1) + '\n')
(OUT / 'finger-fit.json').write_text(json.dumps(report, indent=2) + '\n')
print('FINGER_ROUND', OUT, flush=True)
