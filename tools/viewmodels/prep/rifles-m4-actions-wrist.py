"""Measure the M4 sleeve/skin border: signed cross-section and real occlusion.

The tactical reload was blocked because skin shows at the wrist in f013/f045.
Proximity does not decide that question, so this reads three independent things
per frame: the signed radial clearance between the deformed sleeve and the
deformed skin along the forearm axis, the skin area that no cover occludes along
its own outward normal, and the skin area actually visible from the viewmodel
camera in 3:2 and 16:9.  The approved idle is measured with the same ruler, so
the reload can be compared against the pose the owner already accepted.

Read-only: opens the candidate blend, writes JSON under the rifles artifacts.
"""
import importlib.util
import json
import math
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
OUT = inv.OUT / next((a.split('=')[1] for a in argv if a.startswith('--out=')), 'm4-actions-wrist')
assert SOURCE.resolve().is_relative_to(inv.OUT.resolve()) and OUT.resolve().is_relative_to(inv.OUT.resolve())
OUT.mkdir(parents=True, exist_ok=True)
FRAMES = list(range(73))
PROFILE_FRAMES = {0, 13, 20, 43, 45, 52, 62, 72}
COVER_RANGE = .020        # metres of outward ray used to call a skin face covered
STATION_MM = list(range(-12, 92, 4))
SLAB_MM = 3.

bpy.ops.wm.open_mainfile(filepath=str(SOURCE / 'm4-actions.blend'), load_ui=False)
scene = bpy.context.scene
rig = bpy.data.objects['RIG_FP_ARMS']
skin = bpy.data.objects['GEO_FP_SK_Hand']
cloth = bpy.data.objects['GEO_FP_SK_Cloth_01']
glove = bpy.data.objects['GEO_FP_SK_Glove_01']
gun = bpy.data.objects['MINT_WEAPON_M4']
mag = bpy.data.objects['MINT_WEAPON_M4_MAG']
camera = scene.camera
cuff = cloth.data.shape_keys.key_blocks['reload_cuff_cover_l']
animated = [rig, gun, mag, cloth.data.shape_keys]

skin_groups = {g.index: g.name for g in skin.vertex_groups}
LEFT = ('lowerarm_l', 'hand_l', 'thumb_01_l', 'lowerarm_twist_01_l')
skin_left = {v.index for v in skin.data.vertices
             if sum(g.weight for g in v.groups if skin_groups[g.group] in LEFT) > .5}
cloth_groups = {g.index: g.name for g in cloth.vertex_groups}
cloth_left = {v.index for v in cloth.data.vertices
              if sum(g.weight for g in v.groups if cloth_groups[g.group] in LEFT) > .5}
glove_groups = {g.index: g.name for g in glove.vertex_groups}
glove_left = {v.index for v in glove.data.vertices
              if sum(g.weight for g in v.groups if glove_groups[g.group].endswith('_l')) > .5}
assert skin_left and cloth_left and glove_left, (len(skin_left), len(cloth_left), len(glove_left))


def solo(name):
    for obj in animated:
        obj.animation_data.action = None
        for track in obj.animation_data.nla_tracks:
            track.mute = track.name != name


def at(name, frame):
    solo(name)
    scene.frame_set(frame + 1 if frame == 0 else frame - 1)
    scene.frame_set(frame)
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


def tree_of(obj):
    points, tris = evaluated(obj)
    return BVHTree.FromPolygons(points, tris), points, tris


def bone_head(name):
    m = rig.matrix_world @ rig.pose.bones[name].matrix
    return m.translation.copy()


def frustum(aspect):
    """Half angles of the game viewmodel camera: 74 deg vertical at 4:3, cropped."""
    half_h = math.atan(math.tan(math.radians(74) / 2) * (4 / 3))
    return math.tan(half_h), math.tan(math.atan(math.tan(half_h) / aspect))


ASPECTS = {'3x2': frustum(1.5), '16x9': frustum(16 / 9)}
SAMPLES = ((1 / 3, 1 / 3), (.6, .2), (.2, .6), (.2, .2))


def measure(clip, frame, cover=None):
    at(clip, frame)
    if cover is not None:
        for track in cloth.data.shape_keys.animation_data.nla_tracks:
            track.mute = True
        cuff.value = cover
        bpy.context.view_layer.update()
    covers = [tree_of(o)[0] for o in (cloth, glove)]
    # The forearm occludes itself; leaving it out would overstate exposure.
    blockers = covers + [tree_of(o)[0] for o in (gun, mag, skin)]
    points, tris = evaluated(skin)
    eye = camera.matrix_world.translation.copy()
    inverse = camera.matrix_world.inverted()
    total = uncovered = 0.
    visible = {name: 0. for name in ASPECTS}
    framed = {name: 0. for name in ASPECTS}
    faces_uncovered = 0
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
        free = 0
        for u, v in SAMPLES:
            p = a + (b - a) * u + (c - a) * v
            lift = p + normal * 1e-4
            if not any(t.ray_cast(lift, normal, COVER_RANGE)[0] is not None for t in covers):
                free += 1
                uncovered += share
            to_eye = eye - p
            distance = to_eye.length
            local = inverse @ p
            if local.z >= 0:
                continue
            inside = [name for name, (tan_h, tan_v) in ASPECTS.items()
                      if abs(local.x / -local.z) < tan_h and abs(local.y / -local.z) < tan_v]
            for name in inside:
                framed[name] += share
            if not inside or normal.dot(to_eye) <= 0:
                continue
            if any(t.ray_cast(lift, to_eye.normalized(), distance - 1e-4)[0] is not None for t in blockers):
                continue
            for name in inside:
                visible[name] += share
        faces_uncovered += free == len(SAMPLES)
    wrist, elbow = bone_head('hand_l'), bone_head('lowerarm_l')
    axis = (elbow - wrist).normalized()
    skin_pts = [points[i] for i in skin_left]
    cloth_pts, _ = evaluated(cloth)
    glove_pts, _ = evaluated(glove)

    def radial(pts, ids=None):
        out = []
        for index, p in enumerate(pts):
            if ids is not None and index not in ids:
                continue
            d = p - wrist
            along = d.dot(axis)
            out.append((along * 1000, (d - axis * along).length * 1000))
        return out

    skin_ring = radial(points, skin_left)
    cloth_ring = radial(cloth_pts, cloth_left)
    glove_ring = radial(glove_pts, glove_left)
    profile = []
    for station in STATION_MM if frame in PROFILE_FRAMES else []:
        def band(ring):
            return [r for along, r in ring if abs(along - station) <= SLAB_MM]
        s, cl, gl = band(skin_ring), band(cloth_ring), band(glove_ring)
        if not s:
            continue
        row = {'station_mm': station, 'skin_vertices': len(s),
               'skin_radius_mm': [round(min(s), 3), round(sum(s) / len(s), 3), round(max(s), 3)]}
        for label, values in (('cloth', cl), ('glove', gl)):
            if values:
                row[f'{label}_vertices'] = len(values)
                row[f'{label}_radius_mm'] = [round(min(values), 3), round(sum(values) / len(values), 3), round(max(values), 3)]
                row[f'{label}_clearance_mm'] = round(sum(values) / len(values) - max(s), 3)
            else:
                row[f'{label}_vertices'] = 0
        profile.append(row)
    # Cuff edges are read only in the forearm sleeve/glove band, so distant
    # geometry of the same vertex groups cannot masquerade as an overlap.
    def edge(ring, pick):
        near = [along for along, radius in ring if -60 <= along <= 140 and radius <= 70]
        return round(pick(near), 2) if near else None

    cloth_edge, glove_edge = edge(cloth_ring, min), edge(glove_ring, max)
    return {'clip': clip, 'frame': frame, 't': round(frame / lib.FPS, 4),
            'skin_area_mm2': round(total * 1e6, 3),
            'uncovered_area_mm2': round(uncovered * 1e6, 3),
            'uncovered_faces': faces_uncovered,
            'framed_area_mm2': {k: round(v * 1e6, 3) for k, v in framed.items()},
            'visible_area_mm2': {k: round(v * 1e6, 3) for k, v in visible.items()},
            'cloth_cuff_edge_mm': cloth_edge,
            'glove_cuff_edge_mm': glove_edge,
            'axial_overlap_mm': round(glove_edge - cloth_edge, 2) if None not in (cloth_edge, glove_edge) else None,
            'cuff_cover_value': round(cuff.value, 4),
            'profile': profile}


report = {'source_blend_sha256': inv.digest(SOURCE / 'm4-actions.blend'),
          'method': {'cover': f'skin face is covered when a ray along its own outward normal hits cloth or glove within {COVER_RANGE * 1000:.0f} mm',
                     'visibility': 'skin sample is visible when the segment to the viewmodel camera is not blocked by cloth, glove, gun or magazine and lands inside the cropped frustum',
                     'profile': f'radius to the wrist->elbow axis in {SLAB_MM:.0f} mm slabs; clearance is mean cover radius minus max skin radius, so negative means the cover sits inside the skin',
                     'sampling': f'{len(SAMPLES)} barycentric samples per triangle; area is attributed per sample, not per face',
                     'selection': {'skin_vertices_left': len(skin_left), 'cloth_vertices_left': len(cloth_left),
                                   'glove_vertices_left': len(glove_left), 'weight_threshold': .5, 'groups': list(LEFT)}},
          'idle': measure('idle', 0), 'reload_tactical': [measure('reload_tactical', f) for f in FRAMES]}

# The ruler has to see the sleeve cover it is meant to judge: disabling the
# authored cuff shape key must increase exposure at the blocked frames.
mutant = {}
for frame in (13, 45):
    authored = next(r for r in report['reload_tactical'] if r['frame'] == frame)
    without = measure('reload_tactical', frame, cover=0.)
    mutant[str(frame)] = {'cuff_cover_value_authored': authored['cuff_cover_value'],
                          'uncovered_area_mm2': [authored['uncovered_area_mm2'], without['uncovered_area_mm2']],
                          'visible_area_mm2': [authored['visible_area_mm2'], without['visible_area_mm2']],
                          'axial_overlap_mm': [authored['axial_overlap_mm'], without['axial_overlap_mm']],
                          'cloth_cuff_edge_mm': [authored['cloth_cuff_edge_mm'], without['cloth_cuff_edge_mm']]}
assert all(m['uncovered_area_mm2'][0] < m['uncovered_area_mm2'][1] - 50 for m in mutant.values()), mutant
report['cover_mutation'] = mutant
idle = report['idle']
rows = report['reload_tactical']
report['verdict'] = {
    'idle_visible_area_mm2': idle['visible_area_mm2'],
    'frames_visible_above_idle': {name: [r['frame'] for r in rows if r['visible_area_mm2'][name] > idle['visible_area_mm2'][name] + 1e-9]
                                  for name in ASPECTS},
    'peak_visible': {name: max(rows, key=lambda r: r['visible_area_mm2'][name])['frame'] for name in ASPECTS},
    'peak_visible_area_mm2': {name: max(r['visible_area_mm2'][name] for r in rows) for name in ASPECTS},
    'frames_with_any_visible_skin': {name: [r['frame'] for r in rows if r['visible_area_mm2'][name] > 0] for name in ASPECTS},
    'peak_uncovered_area_mm2': max(r['uncovered_area_mm2'] for r in rows),
    'min_axial_overlap_mm': min(r['axial_overlap_mm'] for r in rows)}
(OUT / 'wrist-profile.json').write_text(json.dumps(report, indent=1) + '\n')
print('M4_WRIST', json.dumps({'verdict': report['verdict'], 'mutation': mutant}))
