"""Reload-final ruler: everything the owner's mandate for the M4 tactical reload demands.

Measured per frame of `reload_tactical` (all 73), against the posed magazine:

- exact edge/triangle crossings in BOTH directions for ring and pinky (the
  mandate's hard zero), reported for every region;
- signed surface distance per finger region (nearest point + face normal, so
  "resting on the surface" and "buried past it" stop reading the same);
- skin area actually visible from the game viewmodel camera in 3:2 and 16:9,
  with occlusion by cloth, glove, gun, magazine and the forearm itself;
- thumb/index tip distance to `bolt_release`;
- continuous return to the approved idle (per-frame steps and end vs idle).

Mutants (run with --mutant=...): each must flip the verdict the way the defect
it simulates would, or the ruler is blind.  The default run on the current
candidate must reproduce the known failures before any fix is accepted.

Read-only on the source blend; writes JSON under the rifles artifacts.
"""
import importlib.util
import json
import math
import sys
from pathlib import Path
import bpy
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
SOURCE = inv.OUT / next((a.split('=')[1] for a in argv if a.startswith('--source=')), 'm4-actions-fingers-c1')
OUT = inv.OUT / next((a.split('=')[1] for a in argv if a.startswith('--out=')), 'm4-reload-final-verify')
MUTANT = next((a.split('=')[1] for a in argv if a.startswith('--mutant=')), None)
assert SOURCE.resolve().is_relative_to(inv.OUT.resolve()) and OUT.resolve().is_relative_to(inv.OUT.resolve())
OUT.mkdir(parents=True, exist_ok=True)
FRAMES = list(range(73))
COVER_RANGE = .020
# Ceilings come from measurements, not opinion: the idle the owner approved shows
# 76.37 mm2 of left-forearm skin in 3:2 and none in 16:9 (wrist ruler, 06/09),
# and the four-finger hold contact the critic accepted sat at p05 <= 5 mm.
IDLE_VISIBLE_CEILING_MM2 = {'3x2': 77., '16x9': .5}
# Contact ceiling for an open side grip: the distal surface must rest on the
# magazine (enough vertices within 5 mm) without being buried past it (signed
# depth).  A p05 over the whole finger measured wrapping poses that intersect.
HOLD_WITHIN_5MM_FLOOR = 10
HOLD_MIN_SIGNED_FLOOR_MM = -2.
BOLT_REACH_CEILING_MM = 2.

bpy.ops.wm.open_mainfile(filepath=str(SOURCE / 'm4-actions.blend'), load_ui=False)
scene = bpy.context.scene
rig = bpy.data.objects['RIG_FP_ARMS']
glove = bpy.data.objects['GEO_FP_SK_Glove_01']
skin = bpy.data.objects['GEO_FP_SK_Hand']
cloth = bpy.data.objects['GEO_FP_SK_Cloth_01']
gun = bpy.data.objects['MINT_WEAPON_M4']
mag = bpy.data.objects['MINT_WEAPON_M4_MAG']
bolt = bpy.data.objects['bolt_release']
camera = scene.camera
cuff = cloth.data.shape_keys.key_blocks['reload_cuff_cover_l']
animated = [rig, gun, mag, cloth.data.shape_keys]

REGIONS = {'palm': ('hand_l',), 'index': ('index_01_l', 'index_02_l', 'index_03_l'),
           'middle': ('middle_01_l', 'middle_02_l', 'middle_03_l'),
           'ring': ('ring_01_l', 'ring_02_l', 'ring_03_l'),
           'pinky': ('pinky_01_l', 'pinky_02_l', 'pinky_03_l'),
           'thumb': ('thumb_01_l', 'thumb_02_l', 'thumb_03_l')}
groups = {g.index: g.name for g in glove.vertex_groups}
region_ids = {name: {v.index for v in glove.data.vertices
                     if sum(g.weight for g in v.groups if groups[g.group] in bones) > .35}
              for name, bones in REGIONS.items()}
region_edges = {name: [tuple(e.vertices) for e in glove.data.edges if all(i in ids for i in e.vertices)]
                for name, ids in region_ids.items()}
assert all(region_ids.values()), {k: len(v) for k, v in region_ids.items()}
mag_polys = [tuple(p.vertices) for p in mag.data.polygons]
mag_edges = [tuple(e.vertices) for e in mag.data.edges]

skin_groups = {g.index: g.name for g in skin.vertex_groups}
LEFT = ('lowerarm_l', 'hand_l', 'thumb_01_l', 'lowerarm_twist_01_l')
skin_left = {v.index for v in skin.data.vertices
             if sum(g.weight for g in v.groups if skin_groups[g.group] in LEFT) > .5}
assert skin_left


def solo(name):
    for obj in animated:
        obj.animation_data.action = None
        for track in obj.animation_data.nla_tracks:
            track.mute = track.name != name


def at(name, frame, cover=None):
    solo(name)
    scene.frame_set(frame + 1 if frame == 0 else frame - 1)
    scene.frame_set(frame)
    if cover is not None:
        for track in cloth.data.shape_keys.animation_data.nla_tracks:
            track.mute = True
        cuff.value = cover
    bpy.context.view_layer.update()


def evaluated(obj):
    ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = ev.to_mesh()
    mesh.calc_loop_triangles()
    matrix = ev.matrix_world
    points = [matrix @ v.co for v in mesh.vertices]
    tris = [tuple(t.vertices) for t in mesh.loop_triangles]
    ev.to_mesh_clear()
    return points, tris


_region_edges = {name: [tuple(e.vertices) for e in glove.data.edges if all(i in ids for i in e.vertices)]
                 for name, ids in region_ids.items()}


def crossings(pts, mag_pts, name, tree):
    """Exact edge/triangle intersections both ways; the magazine is an open shell,
    so containment is never claimed, only crossings and how far edges run past."""
    direct, beyond = 0, 0.
    for a, b in _region_edges[name]:
        delta = pts[b] - pts[a]
        if delta.length < 1e-7:
            continue
        hit = tree.ray_cast(pts[a], delta.normalized(), delta.length)
        if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
            direct += 1
            beyond = max(beyond, min(hit[3], delta.length - hit[3]))
    return direct, beyond


def signed_stats(pts, ids, tree):
    """Signed distance to the magazine surface via nearest point and face normal."""
    signed, depths = [], []
    for i in ids:
        nearest, normal, _, distance = tree.find_nearest(pts[i])
        s = (pts[i] - nearest).dot(normal.normalized()) * 1000
        signed.append(s)
        depths.append(distance * 1000)
    signed.sort()
    depths.sort()
    return {'vertices': len(ids), 'min_signed_mm': round(signed[0], 3),
            'deepest_mm': round(-min(0., signed[0]), 3),
            'p05_abs_mm': round(depths[max(0, int((len(depths) - 1) * .05))], 3),
            'within_5mm': sum(d <= 5 for d in depths)}


_tan_h = math.tan(math.atan(math.tan(math.radians(74) / 2) * (4 / 3)))
ASPECTS = {'3x2': (_tan_h, math.tan(math.atan(_tan_h / 1.5))),
           '16x9': (_tan_h, math.tan(math.atan(_tan_h / (16 / 9))))}
SAMPLES = ((1 / 3, 1 / 3), (.6, .2), (.2, .6), (.2, .2))


def visible_skin(covers, blockers, points, tris, eye, inverse):
    total = 0.
    uncovered = 0.
    visible = {name: 0. for name in ASPECTS}
    for tri in tris:
        a, b, c = (points[i] for i in tri)
        if not all(i in skin_left for i in tri):
            continue
        normal = (b - a).cross(c - a)
        area = normal.length / 2
        if area < 1e-12:
            continue
        normal = normal.normalized()
        total += area
        share = area / len(SAMPLES)
        for u, v in SAMPLES:
            p = a + (b - a) * u + (c - a) * v
            if not any(t.ray_cast(p + normal * 1e-4, normal, COVER_RANGE)[0] is not None for t in covers):
                uncovered += share
            to_eye = eye - p
            distance = to_eye.length
            local = inverse @ p
            if local.z >= 0:
                continue
            inside = [name for name, (tan_h, tan_v) in ASPECTS.items()
                      if abs(local.x / -local.z) < tan_h and abs(local.y / -local.z) < tan_v]
            if not inside or normal.dot(to_eye) <= 0:
                continue
            if any(t.ray_cast(p + normal * 1e-4, to_eye.normalized(), distance - 1e-4)[0] is not None
                   for t in blockers):
                continue
            for name in inside:
                visible[name] += share
    return total, uncovered, visible


def bone_head(name):
    return (rig.matrix_world @ rig.pose.bones[name].matrix).translation.copy()


def bone_tail(name):
    return rig.matrix_world @ rig.pose.bones[name].tail


rows = []
for frame in FRAMES:
    at('reload_tactical', frame)
    dg = bpy.context.evaluated_depsgraph_get()
    pts, _ = evaluated(glove)
    mag_pts, _ = evaluated(mag)
    tree = BVHTree.FromPolygons(mag_pts, mag_polys)
    row = {'frame': frame, 't': round(frame / lib.FPS, 4), 'regions': {}}
    for name, ids in region_ids.items():
        direct, beyond = crossings(pts, mag_pts, name, tree)
        # Reverse is per region: a magazine edge passing through the palm (which
        # the approved idle tolerates against its own grip) must not be charged
        # to the ring or the pinky.
        own_tree = BVHTree.FromPolygons(pts, [tuple(p.vertices) for p in glove.data.polygons
                                              if all(v in ids for v in p.vertices)])
        reverse = 0
        for a, b in mag_edges:
            delta = mag_pts[b] - mag_pts[a]
            if delta.length < 1e-7:
                continue
            hit = own_tree.ray_cast(mag_pts[a], delta.normalized(), delta.length)
            if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
                reverse += 1
        row['regions'][name] = {'direct': direct, 'reverse': reverse,
                                'beyond_surface_mm': round(beyond * 1000, 3),
                                **signed_stats(pts, ids, tree)}
    skin_pts, skin_tris = evaluated(skin)
    covers = [BVHTree.FromPolygons(*evaluated(o)) for o in (cloth, glove)]
    blockers = covers + [BVHTree.FromPolygons(*evaluated(o)) for o in (gun, mag, skin)]
    total, uncovered, visible = visible_skin(covers, blockers, skin_pts, skin_tris,
                                               camera.matrix_world.translation.copy(), camera.matrix_world.inverted())
    row['skin_uncovered_mm2'] = round(uncovered * 1e6, 3)
    row['skin_visible_mm2'] = {k: round(v * 1e6, 3) for k, v in visible.items()}
    row['skin_total_mm2'] = round(total * 1e6, 1)
    row['thumb_tip_to_bolt_release_mm'] = round((bone_tail('thumb_03_l') - bolt.matrix_world.translation).length * 1000, 2)
    row['index_tip_to_bolt_release_mm'] = round((bone_tail('index_03_l') - bolt.matrix_world.translation).length * 1000, 2)
    row['hand_l'] = list(bone_head('hand_l'))
    row['cuff_cover_value'] = round(cuff.value, 4)
    rows.append(row)

at('idle', 0)
dg = bpy.context.evaluated_depsgraph_get()
skin_pts, skin_tris = evaluated(skin)
covers = [BVHTree.FromPolygons(*evaluated(o)) for o in (cloth, glove)]
blockers = covers + [BVHTree.FromPolygons(*evaluated(o)) for o in (gun, mag, skin)]
idle_total, idle_uncovered, idle_visible = visible_skin(covers, blockers, skin_pts, skin_tris,
                                                        camera.matrix_world.translation.copy(), camera.matrix_world.inverted())
idle_ref = {'hand_l': list(bone_head('hand_l')), 'hand_r': list(bone_head('hand_r')),
            'gun_origin': list(gun.matrix_world.translation), 'mag_origin': list(mag.matrix_world.translation)}
idle_visible = {k: round(v * 1e6, 3) for k, v in idle_visible.items()}

# ---- verdicts -------------------------------------------------------------
ring_pinky = [r for r in rows if r['regions']['ring']['direct'] + r['regions']['ring']['reverse'] > 0
              or r['regions']['pinky']['direct'] + r['regions']['pinky']['reverse'] > 0]
hold = [r for r in rows if .40 <= r['t'] <= 1.56]
hold_contact = {f: {'min_within_5mm': min(r['regions'][f]['within_5mm'] for r in hold),
                    'worst_signed_mm': min(r['regions'][f]['min_signed_mm'] for r in hold),
                    'p05_abs_max_mm': max(r['regions'][f]['p05_abs_mm'] for r in hold)}
                for f in ('index', 'middle', 'ring', 'pinky')}
skin_over = {a: [r['frame'] for r in rows if r['skin_visible_mm2'][a] > IDLE_VISIBLE_CEILING_MM2[a]]
             for a in ASPECTS}
first, last = rows[0], rows[-1]
return_mm = {k: round((Vector(last[k]) - Vector(idle_ref[k])).length * 1000, 4) for k in ('hand_l',)}
at('reload_tactical', 72)
end_glove, _ = evaluated(glove)
at('idle', 0)
idle_glove, _ = evaluated(glove)
return_mesh_mm = round(max((a - b).length for a, b in zip(end_glove, idle_glove)) * 1000, 4)
bolt_row = next(r for r in rows if r['frame'] == 62)
bolt_reach = min(bolt_row['thumb_tip_to_bolt_release_mm'], bolt_row['index_tip_to_bolt_release_mm'])
steps = [round((Vector(rows[i]['hand_l']) - Vector(rows[i - 1]['hand_l'])).length * 1000, 2)
         for i in range(1, len(rows))]
verdict = {
    'ring_pinky_crossing_frames': [r['frame'] for r in ring_pinky],
    'hold_contact_p05_max_mm': hold_contact,
    'skin_visible_ceiling_mm2': IDLE_VISIBLE_CEILING_MM2,
    'idle_visible_mm2': idle_visible,
    'frames_skin_over_idle': skin_over,
    'return_hand_l_last_vs_idle_mm': return_mm['hand_l'],
    'return_glove_mesh_max_mm': return_mesh_mm,
    'max_step_mm': max(steps),
    'bolt62_reach_mm': bolt_reach,
}
verdict['pass'] = (not verdict['ring_pinky_crossing_frames']
                   and all(v['min_within_5mm'] >= HOLD_WITHIN_5MM_FLOOR
                           and v['worst_signed_mm'] >= HOLD_MIN_SIGNED_FLOOR_MM for v in hold_contact.values())
                   and not any(skin_over.values())
                   and return_mm['hand_l'] < 1e-3 and return_mesh_mm < .01 and max(steps) < 60.
                   and bolt_reach <= BOLT_REACH_CEILING_MM)

# ---- mutants --------------------------------------------------------------
mutants = {}
if MUTANT == 'cuff':
    # Disabling the authored sleeve cover must expose skin the ruler can see.
    for frame in (13, 45, 53):
        at('reload_tactical', frame, cover=0.)
        skin_pts, skin_tris = evaluated(skin)
        covers = [BVHTree.FromPolygons(*evaluated(o)) for o in (cloth, glove)]
        blockers = covers + [BVHTree.FromPolygons(*evaluated(o)) for o in (gun, mag, skin)]
        _, uncovered, visible = visible_skin(covers, blockers, skin_pts, skin_tris,
                                        camera.matrix_world.translation.copy(), camera.matrix_world.inverted())
        mutants[f'cuff_off_f{frame}'] = {'visible_mm2': {k: round(v * 1e6, 3) for k, v in visible.items()},
                                        'uncovered_mm2': round(uncovered * 1e6, 3)}
        authored = next(r for r in rows if r['frame'] == frame)
        assert mutants[f'cuff_off_f{frame}']['uncovered_mm2'] > authored['skin_uncovered_mm2'] + 50., \
            f'cuff mutant invisible at f{frame}'
    mutants['note'] = 'cover disabled at blocked frames increases uncovered skin area: the skin ruler bites'
elif MUTANT == 'crossing':
    # The ruler control from the bolt round: a clean pose plus a magazine pushed
    # into the palm must light up.  Frame 72 is the approved idle pose.
    at('reload_tactical', 72)
    pts, _ = evaluated(glove)
    mag_pts, _ = evaluated(mag)
    control_ids = region_ids['palm'] | region_ids['pinky']
    control_edges = [tuple(e.vertices) for e in glove.data.edges if all(i in control_ids for i in e.vertices)]

    def control_direct(mag_points):
        tree = BVHTree.FromPolygons(mag_points, mag_polys)
        direct = 0
        for a, b in control_edges:
            delta = pts[b] - pts[a]
            if delta.length < 1e-7:
                continue
            hit = tree.ray_cast(pts[a], delta.normalized(), delta.length)
            if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
                direct += 1
        return direct

    clean_d = control_direct(mag_pts)
    palm_centre = sum((pts[i] for i in region_ids['palm']), Vector()) / len(region_ids['palm'])
    shift = palm_centre - sum(mag_pts, Vector()) / len(mag_pts)
    pushed_d = control_direct([p + shift for p in mag_pts])
    mutants['crossing_control'] = {'clean_direct': clean_d, 'pushed_mm': round(shift.length * 1000, 2),
                                   'pushed_direct': pushed_d}
    assert clean_d == 0 and pushed_d > 0, mutants
elif MUTANT == 'return':
    # Perturb the terminal key of a pinky joint: the return check must notice.
    track = next(t for t in rig.animation_data.nla_tracks if t.name == 'reload_tactical')
    strip = track.strips[0]
    bag = strip.action.layers[0].strips[0].channelbag(strip.action_slot)
    fc = next(f for f in bag.fcurves if f.data_path == 'pose.bones["pinky_01_l"].rotation_quaternion' and f.array_index == 1)
    last = len(fc.keyframe_points) - 1
    saved = fc.keyframe_points[last].co.copy()
    fc.keyframe_points[last].co = (saved.x, saved.y + .4)
    at('reload_tactical', 72)
    mutated_glove, _ = evaluated(glove)
    fc.keyframe_points[last].co = saved.copy()
    mutants['return_control'] = {'perturbed_frame': 72, 'joint': 'pinky_01_l',
                                 'glove_mesh_max_mm': round(max((a - b).length for a, b in zip(mutated_glove, idle_glove)) * 1000, 4)}
    assert mutants['return_control']['glove_mesh_max_mm'] > 1., mutants
    mutants['note'] = 'terminal-key perturbation deforms the end pose away from the approved idle: the return check bites'

report = {'source': str(SOURCE.relative_to(inv.OUT)), 'source_blend_sha256': inv.digest(SOURCE / 'm4-actions.blend'),
          'mutant': MUTANT, 'method': {
              'crossings': 'exact edge/triangle intersections both directions; open shell, no containment claim',
              'signed': 'nearest point + face normal via BVH find_nearest; negative = past the surface',
              'skin': 'skin triangles of the left forearm sampled barycentrically, visible when unoccluded by cloth/glove/gun/mag/forearm and inside the cropped game frustum',
              'ceilings': {'idle_visible_mm2': IDLE_VISIBLE_CEILING_MM2, 'hold_within_5mm_floor': HOLD_WITHIN_5MM_FLOOR, 'hold_min_signed_mm': HOLD_MIN_SIGNED_FLOOR_MM,
                           'bolt_reach_mm': BOLT_REACH_CEILING_MM, 'return_mm': .001, 'max_step_mm': 60.}},
          'idle_reference': {'visible_mm2': idle_visible, 'hand_l': idle_ref['hand_l']},
          'verdict': verdict, 'mutants': mutants,
          'frames': rows}
(OUT / f'reload-final{"-" + MUTANT if MUTANT else ""}.json').write_text(json.dumps(report, indent=1) + '\n')
print('M4_RELOAD_FINAL_VERIFY', json.dumps({'source': report['source'], 'mutant': MUTANT, 'verdict': verdict,
                                            'mutants': mutants}))
if MUTANT is None and verdict['pass']:
    sys.exit(0)
if MUTANT is None:
    sys.exit(1)
