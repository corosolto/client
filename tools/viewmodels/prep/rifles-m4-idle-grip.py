"""Re-author the M4 idle grip digit by digit, judged against the approved pose.

The owner approved how this idle looks, and the measured truth is that it holds
the vertical grip by passing through it: 428 exact crossings, palm 8.29 mm and
thumb 5.80 mm past the surface.  The criterion here is therefore not zero
interpenetration but the approved reference itself: every digit must end no
deeper than it already is, the hand must still rest on the grip, and the
silhouette the owner accepted must survive.

Authoring is per digit: a small rigid stand-off for the hand, then flexion
deltas on each of the fifteen left finger joints, each bounded so no joint can
become a deformation.  Writes a candidate blend and JSON; exports nothing.
"""
import importlib.util
import json
import math
import sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

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
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
INPUT = inv.OUT / 'm4-actions-c1/input/m4-approved.blend'
APPROVED_SHA = '6925c7f5633c7e2869e989bc4f379770965e7a9cd38fb505da2840ad082d0e26'
OUT = inv.OUT / next((a.split('=')[1] for a in argv if a.startswith('--out=')), 'm4-idle-grip-c4')
assert OUT.resolve().is_relative_to(inv.OUT.resolve()) and INPUT.is_file()
assert inv.digest(INPUT) == APPROVED_SHA, 'input copy differs from the approved snapshot'
OUT.mkdir(parents=True, exist_ok=True)
JOINT_LIMIT_DEG = 18.
GAP_RANGE_MM = (0, 1, 2, 3, 4, 5, 6)
GAP_TOLERANCE_MM = .5
TOUCH = .002
DIGITS = ('index', 'middle', 'ring', 'pinky', 'thumb')

bpy.ops.wm.open_mainfile(filepath=str(INPUT), load_ui=False)
scene = bpy.context.scene
rig_obj = bpy.data.objects['RIG_FP_ARMS']
glove = bpy.data.objects['GEO_FP_SK_Glove_01']
gun = bpy.data.objects['MINT_WEAPON_M4']
camera = scene.camera
R = lib.Rig(rig_obj)
fingers = R.finger_axes('l')
gun_polys = [tuple(p.vertices) for p in gun.data.polygons]
gun_edges = [tuple(e.vertices) for e in gun.data.edges]

groups = {g.index: g.name for g in glove.vertex_groups}
REGIONS = {'palm': ('hand_l',)}
for digit in DIGITS:
    REGIONS[digit] = tuple(f'{digit}_0{k}_l' for k in (1, 2, 3))
region_ids = {name: {v.index for v in glove.data.vertices
                     if sum(g.weight for g in v.groups if groups[g.group] in bones) > .35}
              for name, bones in REGIONS.items()}
region_edges = {name: [tuple(e.vertices) for e in glove.data.edges if all(i in ids for i in e.vertices)]
                for name, ids in region_ids.items()}
region_polys = {name: [tuple(p.vertices) for p in glove.data.polygons if all(i in ids for i in p.vertices)]
                for name, ids in region_ids.items()}
assert all(region_edges.values()) and all(region_polys.values())

# The hand stands off along the direction that carries the palm away from the
# grip axis, the same direction the approved bind already uses to hold it.
grip_ids = [v.index for v in gun.data.vertices if -.20 < v.co.x < -.14 and v.co.z < -.02]
assert len(grip_ids) > 50, len(grip_ids)
grip_axis = sum((gun.matrix_world @ gun.data.vertices[i].co for i in grip_ids), Vector()) / len(grip_ids)
palm_centre = (R.head('hand_l') + R.head('middle_01_l')) * .5
outward = (palm_centre - grip_axis)
outward = (outward - Vector((0, 0, 1)) * outward.dot(Vector((0, 0, 1)))).normalized()


def evaluated(obj):
    ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = ev.to_mesh()
    pts = [ev.matrix_world @ v.co for v in mesh.vertices]
    ev.to_mesh_clear()
    return pts


def pose(gap, deltas):
    """Rigid stand-off on the whole left hand plus flexion deltas per finger joint."""
    hand_world = Matrix.Translation(outward * gap) @ R.idle['hand_l']
    desired, info = R.two_bone('l', hand_world)
    local = dict(R.open_fingers(fingers, 0., extra=deltas))
    local['lowerarm_twist_01_l'] = R.twist_rotation('l', info['twist'], desired['lowerarm_l'])
    R.apply(desired, local)
    bpy.context.view_layer.update()


def measure(names=None):
    pts = evaluated(glove)
    gun_pts = evaluated(gun)
    tree = BVHTree.FromPolygons(gun_pts, gun_polys)
    out = {}
    for name in names or region_ids:
        direct, beyond = 0, 0.
        for a, b in region_edges[name]:
            delta = pts[b] - pts[a]
            if delta.length < 1e-7:
                continue
            hit = tree.ray_cast(pts[a], delta.normalized(), delta.length)
            if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
                direct += 1
                beyond = max(beyond, min(hit[3], delta.length - hit[3]))
        reverse = 0
        own = BVHTree.FromPolygons(pts, region_polys[name])
        for a, b in gun_edges:
            delta = gun_pts[b] - gun_pts[a]
            if delta.length < 1e-7:
                continue
            hit = own.ray_cast(gun_pts[a], delta.normalized(), delta.length)
            if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
                reverse += 1
        distances = [tree.find_nearest(pts[i])[3] for i in region_ids[name]]
        out[name] = {'direct': direct, 'reverse': reverse,
                     'beyond_surface_mm': round(beyond * 1000, 3),
                     'touching': sum(1 for d in distances if d <= TOUCH),
                     'nearest_mm': round(min(distances) * 1000, 3)}
    return out


def totals(rows):
    return {'crossings': sum(r['direct'] + r['reverse'] for r in rows.values()),
            'worst_beyond_mm': round(max(r['beyond_surface_mm'] for r in rows.values()), 3),
            'touching': sum(r['touching'] for r in rows.values())}


def silhouette():
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'FLAT'
    scene.display.shading.color_type = 'OBJECT'
    scene.render.film_transparent = True
    scene.render.resolution_x, scene.render.resolution_y = 384, 256
    scene.camera = camera
    path = OUT / 'silhouette-tmp.png'
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    image = bpy.data.images.load(str(path))
    pixels = np.array(image.pixels[:], dtype=np.float32).reshape(-1, 4)
    bpy.data.images.remove(image)
    path.unlink()
    return pixels[:, 3] > .5


pose(0., {})
reference = measure()
reference_mask = silhouette()
record = {'input_sha256': APPROVED_SHA, 'joint_limit_deg': JOINT_LIMIT_DEG, 'touch_mm': TOUCH * 1000,
          'criterion': 'no digit may end deeper than the approved reference, contact may not collapse, '
                       'and the approved silhouette must survive; zero interpenetration is not required',
          'approved_reference': reference, 'approved_totals': totals(reference)}

gap_scan = []
for millimetres in GAP_RANGE_MM:
    pose(millimetres / 1000, {})
    gap_scan.append({'gap_mm': millimetres, **totals(measure())})
# Depth across the stand-off is nearly flat and noisy, and every extra millimetre
# costs contact and silhouette, so take the smallest stand-off that is within a
# tolerance of the best rather than the nominal minimum.
deepest = min(g['worst_beyond_mm'] for g in gap_scan)
best_gap = min(g['gap_mm'] for g in gap_scan if g['worst_beyond_mm'] <= deepest + GAP_TOLERANCE_MM) / 1000
record['gap_scan'] = gap_scan
record['chosen_gap_mm'] = round(best_gap * 1000, 2)
record['gap_rule'] = f'smallest stand-off within {GAP_TOLERANCE_MM} mm of the best depth'

# Coordinate descent per digit: each joint is scanned on its own flexion axis
# within the limit, deepest digit first, so one finger cannot be freed by pushing
# another one in.
deltas = {}
order = sorted(DIGITS, key=lambda d: -reference[d]['beyond_surface_mm'])
history = []
for _ in range(2):
    for digit in order:
        for joint in (1, 2, 3):
            name = f'{digit}_0{joint}_l'
            trials = []
            for degrees in np.linspace(-JOINT_LIMIT_DEG, JOINT_LIMIT_DEG, 13):
                probe = dict(deltas)
                probe[name] = math.radians(float(degrees))
                pose(best_gap, probe)
                row = measure([digit])[digit]
                # Depth first, then how much surface is crossed, then contact kept:
                # a shallower digit that cuts more of the grip is not an improvement.
                trials.append((row['beyond_surface_mm'], row['direct'] + row['reverse'], -row['touching'],
                               float(degrees), row))
            # The approved reference is the ceiling: a digit may not end up
            # cutting more of the weapon than it already does, whatever it gains
            # in depth.  Only inside that budget is the shallowest pose chosen.
            budget = reference[digit]['direct'] + reference[digit]['reverse']
            allowed = [t for t in trials if t[1] <= budget] or trials
            allowed.sort(key=lambda t: t[:3])
            depth, _, _, degrees, row = allowed[0]
            if abs(degrees) > 1e-9:
                deltas[name] = math.radians(degrees)
            else:
                deltas.pop(name, None)
            history.append({'joint': name, 'degrees': round(degrees, 2), 'beyond_mm': depth,
                            'touching': row['touching']})
pose(best_gap, deltas)
after = measure()
after_mask = silhouette()
record['joint_scan'] = history
record['authored_deltas_deg'] = {k: round(math.degrees(v), 2) for k, v in sorted(deltas.items())}
record['max_authored_joint_deg'] = round(max((abs(math.degrees(v)) for v in deltas.values()), default=0.), 2)
record['result'] = after
record['result_totals'] = totals(after)
union = int((reference_mask | after_mask).sum())
record['silhouette'] = {'approved_pixels': int(reference_mask.sum()), 'candidate_pixels': int(after_mask.sum()),
                        'iou': round(float((reference_mask & after_mask).sum() / union), 5) if union else 1.,
                        'changed_fraction': round(float((reference_mask ^ after_mask).sum() / reference_mask.sum()), 5)}

# The candidate is only defensible if it beats the reference where it hurts and
# keeps the pose the owner approved.
regressions = {name: {'beyond_surface_mm': [reference[name]['beyond_surface_mm'], after[name]['beyond_surface_mm']],
                      'crossings': [reference[name]['direct'] + reference[name]['reverse'],
                                    after[name]['direct'] + after[name]['reverse']]}
               for name in region_ids
               if after[name]['beyond_surface_mm'] > reference[name]['beyond_surface_mm'] + 1e-6
               or after[name]['direct'] + after[name]['reverse'] > reference[name]['direct'] + reference[name]['reverse']}
record['regressions'] = regressions
record['verdict'] = {
    'deeper_than_reference': bool(regressions),
    'worst_beyond_mm': [record['approved_totals']['worst_beyond_mm'], record['result_totals']['worst_beyond_mm']],
    'crossings': [record['approved_totals']['crossings'], record['result_totals']['crossings']],
    'touching': [record['approved_totals']['touching'], record['result_totals']['touching']],
    'silhouette_iou': record['silhouette']['iou'],
    'joint_limit_respected': record['max_authored_joint_deg'] <= JOINT_LIMIT_DEG + 1e-6}

# Mutant: putting any authored joint back to the approved value must be visible
# to the ruler, otherwise the ruler is not reading the authoring.
sensitivity = {}
for joint in sorted(deltas):
    digit = joint.split('_')[0]
    pose(best_gap, {k: v for k, v in deltas.items() if k != joint})
    sensitivity[joint] = {'digit': digit, 'degrees': round(math.degrees(deltas[joint]), 2),
                          'beyond_mm_with': after[digit]['beyond_surface_mm'],
                          'beyond_mm_without': measure([digit])[digit]['beyond_surface_mm']}
record['joint_sensitivity'] = sensitivity
# Reverting a whole digit has to be visible; individual joints may legitimately
# carry no depth, and that is reported rather than hidden.
improved = max(DIGITS, key=lambda d: reference[d]['beyond_surface_mm'] - after[d]['beyond_surface_mm'])
pose(best_gap, {k: v for k, v in deltas.items() if not k.startswith(improved)})
mutant = {'digit': improved, 'reverted_joints': [k for k in deltas if k.startswith(improved)],
          'beyond_mm_authored': after[improved]['beyond_surface_mm'],
          'beyond_mm_reverted': measure([improved])[improved]['beyond_surface_mm'],
          'beyond_mm_reference': reference[improved]['beyond_surface_mm'],
          'joints_without_effect': [k for k, v in sensitivity.items()
                                    if abs(v['beyond_mm_without'] - v['beyond_mm_with']) < 1e-9]}
assert mutant['beyond_mm_reverted'] > mutant['beyond_mm_authored'] + 1e-6, mutant
record['mutant'] = mutant

pose(best_gap, deltas)
for pb in rig_obj.pose.bones:
    pb.keyframe_insert('location', frame=0, group=pb.name)
    pb.keyframe_insert('rotation_quaternion', frame=0, group=pb.name)
    pb.keyframe_insert('location', frame=1, group=pb.name)
    pb.keyframe_insert('rotation_quaternion', frame=1, group=pb.name)
rig_obj.animation_data.action.name = 'idle__RIG_FP_ARMS'
scene.frame_start, scene.frame_end = 0, 1
scene.render.engine = 'CYCLES'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'm4-idle-grip.blend'))
(OUT / 'idle-grip.json').write_text(json.dumps(record, indent=1) + '\n')
print('M4_IDLE_GRIP', json.dumps({'chosen_gap_mm': record['chosen_gap_mm'],
                                  'max_joint_deg': record['max_authored_joint_deg'],
                                  'verdict': record['verdict'], 'mutant': mutant,
                                  'per_digit': {k: [reference[k]['beyond_surface_mm'], after[k]['beyond_surface_mm']]
                                                for k in region_ids}}))
