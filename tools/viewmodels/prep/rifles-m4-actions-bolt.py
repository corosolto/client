"""Diagnose the M4 bolt-press pose: what actually enters the seated magazine.

Round C2 removed the ring/pinky crossings at f062 by straightening the pinky by
83 degrees, which is a deformation, not a grip.  Before authoring anything else
this asks whether the crossings come from the fingers at all: it reports, per
hand region and per frame, the exact intersections against the posed magazine in
both directions, how far past its surface the hand goes, and how close the left
index and thumb actually get to the bolt release socket they are supposed to press.

Read-only: opens the candidate blend and writes JSON under the rifles artifacts.
"""
import importlib.util
import json
import sys
from pathlib import Path
import bpy
from mathutils import Vector
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
OUT = inv.OUT / next((a.split('=')[1] for a in argv if a.startswith('--out=')), 'm4-actions-bolt')
assert SOURCE.resolve().is_relative_to(inv.OUT.resolve()) and OUT.resolve().is_relative_to(inv.OUT.resolve())
OUT.mkdir(parents=True, exist_ok=True)
FRAMES = list(range(73))
REGIONS = {'palm': ('hand_l',), 'index': ('index_01_l', 'index_02_l', 'index_03_l'),
           'middle': ('middle_01_l', 'middle_02_l', 'middle_03_l'),
           'ring': ('ring_01_l', 'ring_02_l', 'ring_03_l'),
           'pinky': ('pinky_01_l', 'pinky_02_l', 'pinky_03_l'),
           'thumb': ('thumb_01_l', 'thumb_02_l', 'thumb_03_l')}

bpy.ops.wm.open_mainfile(filepath=str(SOURCE / 'm4-actions.blend'), load_ui=False)
scene = bpy.context.scene
rig = bpy.data.objects['RIG_FP_ARMS']
glove = bpy.data.objects['GEO_FP_SK_Glove_01']
gun = bpy.data.objects['MINT_WEAPON_M4']
mag = bpy.data.objects['MINT_WEAPON_M4_MAG']
bolt = bpy.data.objects['bolt_release']
animated = [rig, gun, mag, bpy.data.objects['GEO_FP_SK_Cloth_01'].data.shape_keys]
groups = {g.index: g.name for g in glove.vertex_groups}
region_ids = {name: {v.index for v in glove.data.vertices
                     if sum(g.weight for g in v.groups if groups[g.group] in bones) > .35}
              for name, bones in REGIONS.items()}
assert all(region_ids.values()), {k: len(v) for k, v in region_ids.items()}
mag_polys = [tuple(p.vertices) for p in mag.data.polygons]
mag_edges = [tuple(e.vertices) for e in mag.data.edges]
body_polys = [tuple(p.vertices) for p in gun.data.polygons]


def at(frame, clip='reload_tactical'):
    for obj in animated:
        obj.animation_data.action = None
        for track in obj.animation_data.nla_tracks:
            track.mute = track.name != clip
    scene.frame_set(frame + 1 if frame == 0 else frame - 1)
    scene.frame_set(frame)
    bpy.context.view_layer.update()


def evaluated(obj):
    ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = ev.to_mesh()
    pts = [ev.matrix_world @ v.co for v in mesh.vertices]
    ev.to_mesh_clear()
    return pts


def crossings(pts, mag_pts, ids, polys, tree):
    """Exact intersections in both directions plus how far past the surface they go.

    The magazine is an open shell, so containment cannot be decided by parity.
    `beyond_mm` is the length of the glove edge that continues past the magazine
    triangle it crosses: a lower bound on the intrusion that needs no closed solid.
    """
    direct, beyond = 0, 0.
    for edge in glove.data.edges:
        a, b = edge.vertices
        if a not in ids or b not in ids:
            continue
        delta = pts[b] - pts[a]
        if delta.length < 1e-7:
            continue
        hit = tree.ray_cast(pts[a], delta.normalized(), delta.length)
        if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
            direct += 1
            beyond = max(beyond, min(hit[3], delta.length - hit[3]))
    reverse = 0
    if polys:
        glove_tree = BVHTree.FromPolygons(pts, polys)
        for a, b in mag_edges:
            delta = mag_pts[b] - mag_pts[a]
            if delta.length < 1e-7:
                continue
            hit = glove_tree.ray_cast(mag_pts[a], delta.normalized(), delta.length)
            if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
                reverse += 1
    return direct, reverse, beyond


# The magazine shell decides which ruler is legitimate, so it is measured first.

at(62)
_mag_pts = evaluated(mag)
_faces_per_edge = {}
for polygon in mag.data.polygons:
    ids = list(polygon.vertices)
    for a, b in zip(ids, ids[1:] + ids[:1]):
        key = (min(a, b), max(a, b))
        _faces_per_edge[key] = _faces_per_edge.get(key, 0) + 1
integrity = {'vertices': len(mag.data.vertices), 'faces': len(mag.data.polygons), 'edges': len(_faces_per_edge),
             'boundary_edges': sum(1 for n in _faces_per_edge.values() if n == 1),
             'non_manifold_edges': sum(1 for n in _faces_per_edge.values() if n > 2)}
integrity['closed'] = integrity['boundary_edges'] == 0 and integrity['non_manifold_edges'] == 0
# A first attempt read depth by ray parity; the shell is open, so that ruler was
# discarded rather than reported.  Crossing counts do not need a closed solid.
assert not integrity['closed'], integrity

rows = []
for frame in FRAMES:
    at(frame)
    pts, mag_pts = evaluated(glove), evaluated(mag)
    tree = BVHTree.FromPolygons(mag_pts, mag_polys)
    row = {'frame': frame, 't': round(frame / lib.FPS, 4), 'regions': {}}
    for name, ids in region_ids.items():
        polys = [tuple(p.vertices) for p in glove.data.polygons if all(v in ids for v in p.vertices)]
        direct, reverse, beyond = crossings(pts, mag_pts, ids, polys, tree)
        nearest = min(tree.find_nearest(pts[i])[3] for i in ids) * 1000
        row['regions'][name] = {'vertices': len(ids), 'direct': direct, 'reverse': reverse,
                                'beyond_surface_mm': round(beyond * 1000, 3),
                                'nearest_surface_mm': round(nearest, 3)}
    tip = rig.matrix_world @ rig.pose.bones['index_03_l'].tail
    thumb = rig.matrix_world @ rig.pose.bones['thumb_03_l'].tail
    target = bolt.matrix_world.translation
    row['index_tip_to_bolt_release_mm'] = round((tip - target).length * 1000, 2)
    row['thumb_tip_to_bolt_release_mm'] = round((thumb - target).length * 1000, 2)
    row['hand_head'] = [round(v, 6) for v in (rig.matrix_world @ rig.pose.bones['hand_l'].matrix).translation]
    rows.append(row)

# Controls: the ruler must stay silent on the clean end pose and must speak when
# the magazine is deliberately pushed into that same hand.
at(72)
control_ids = region_ids['palm'] | region_ids['pinky']
control_polys = [tuple(p.vertices) for p in glove.data.polygons if all(v in control_ids for v in p.vertices)]
clean_pts, clean_mag = evaluated(glove), evaluated(mag)
clean = crossings(clean_pts, clean_mag, control_ids, control_polys, BVHTree.FromPolygons(clean_mag, mag_polys))
palm_centre = sum((clean_pts[i] for i in region_ids['palm']), Vector()) / len(region_ids['palm'])
shift = palm_centre - sum(clean_mag, Vector()) / len(clean_mag)
pushed_mag = [p + shift for p in clean_mag]
pushed = crossings(clean_pts, pushed_mag, control_ids, control_polys, BVHTree.FromPolygons(pushed_mag, mag_polys))
control = {'clean_frame': 72, 'clean_crossings': clean[:2], 'pushed_mm': round(shift.length * 1000, 2),
           'pushed_crossings': pushed[:2]}
assert clean[0] == clean[1] == 0, control
assert pushed[0] > 0 and pushed[1] > 0, control

# The reload is only fairly judged against the pose the owner already approved,
# so the same ruler reads the idle left hand against the weapon it holds.
at(0, 'idle')
idle_pts, body_pts = evaluated(glove), evaluated(gun)
body_tree = BVHTree.FromPolygons(body_pts, body_polys)
baseline = {}
for name, ids in region_ids.items():
    polys = [tuple(p.vertices) for p in glove.data.polygons if all(v in ids for v in p.vertices)]
    direct, reverse, beyond = crossings(idle_pts, body_pts, ids, polys, body_tree)
    baseline[name] = {'direct': direct, 'reverse': reverse, 'beyond_surface_mm': round(beyond * 1000, 3),
                      'nearest_surface_mm': round(min(body_tree.find_nearest(idle_pts[i])[3] for i in ids) * 1000, 3)}
baseline['total_crossings'] = sum(r['direct'] + r['reverse'] for r in baseline.values() if isinstance(r, dict))

worst = {}
for frame in FRAMES:
    row = next(r for r in rows if r['frame'] == frame)
    total = sum(r['direct'] + r['reverse'] for r in row['regions'].values())
    if total:
        worst[str(frame)] = {'crossings': total,
                             'regions': sorted(name for name, r in row['regions'].items() if r['direct'] or r['reverse']),
                             'max_beyond_surface_mm': max(r['beyond_surface_mm'] for r in row['regions'].values())}
report = {'source_blend_sha256': inv.digest(SOURCE / 'm4-actions.blend'),
          'method': {'containment': 'not measured: the separated magazine is an open shell, so no parity or signed-distance containment is claimed',
                     'crossings': 'exact edge/triangle intersections in both directions, per hand region',
                     'beyond_surface': 'shortest side of a crossed glove edge, a lower bound on how far the hand passes the magazine surface',
                     'selection': {name: len(ids) for name, ids in region_ids.items()},
                     'overlap': 'palm and thumb share the vertices weighted to both hand_l and thumb_01_l above the threshold',
                     'weight_threshold': .35},
          'approved_idle_left_hand_vs_gun': baseline,
          'magazine_integrity': integrity, 'ruler_control': control, 'frames': rows, 'frames_with_crossings': worst,
          'bolt_release_reach_mm': {str(r['frame']): min(r['index_tip_to_bolt_release_mm'], r['thumb_tip_to_bolt_release_mm']) for r in rows}}
(OUT / 'bolt-press.json').write_text(json.dumps(report, indent=1) + '\n')
print('M4_BOLT', json.dumps({'approved_idle_left_hand_vs_gun': baseline,
                             'frames_with_crossings': len(worst),
                             'bolt_release_reach_mm': min(report['bolt_release_reach_mm'].values())}))
