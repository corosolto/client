"""M4 action candidate C1: real magazine split, semantic sockets and authored clips.

Reads ONLY the local copy of the approved composition and writes ONLY to
artifacts/viewmodels/prep/rifles/m4-actions-c1/. The approved idle pose is the
rest pose of the rig: every clip starts and ends on it. Timings come from the
Game (M4 reload 2.4 s, events 18/62/86 %) and are not altered.

Frames of reference: "mesh units" are the Mint GLB's local coordinates (the gun
object carries the 0.84 contract scale); "gun metres" is the same frame without
that scale, used for every hand target so bone bases stay unscaled.
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
OUT = inv.OUT / next((a.split('=')[1] for a in argv if a.startswith('--out=')), 'm4-actions-c1')
INPUT = inv.OUT / 'm4-actions-c1/input/m4-approved.blend'
APPROVED_BLEND_SHA = '6925c7f5633c7e2869e989bc4f379770965e7a9cd38fb505da2840ad082d0e26'
assert OUT.resolve().is_relative_to(inv.OUT) and INPUT.is_file()
assert inv.digest(INPUT) == APPROVED_BLEND_SHA, 'input copy differs from the approved snapshot'
OUT.mkdir(parents=True, exist_ok=True)
# C1 held the magazine with the pose calibrated for the vertical grip cylinder and
# aimed the palm, not a digit, at the bolt catch.  --fit-contact re-fits both
# against the deformed glove; without it this script still reproduces C1.
FIT_CONTACT = '--fit-contact' in argv
CLIPS = [a for a in argv if not a.startswith('--')] or ['reload_tactical']

bpy.ops.wm.open_mainfile(filepath=str(INPUT), load_ui=False)
scene = bpy.context.scene
scene.render.fps = lib.FPS
scene.frame_set(0)
bpy.context.view_layer.update()
rig_obj = bpy.data.objects['RIG_FP_ARMS']
gun = bpy.data.objects['MINT_WEAPON_M4']
camera = scene.camera
assert rig_obj.animation_data is None and gun.animation_data is None
R = lib.Rig(rig_obj)
cloth = bpy.data.objects['GEO_FP_SK_Cloth_01']
cloth_groups = {group.index: group.name for group in cloth.vertex_groups}

# Full gloves leave a narrow, accepted inner wrist layer in the idle.  During
# reload the forearm reaches far enough to pull the sleeve back.  This local
# shape key advances only the sleeve cuff while the action runs; frame zero and
# the final idle retain the approved mesh exactly.
cuff = cloth.data.shape_keys.key_blocks.get('reload_cuff_cover_l') if cloth.data.shape_keys else None
if cuff is None:
    cloth.shape_key_add(name='Basis')
    cuff = cloth.shape_key_add(name='reload_cuff_cover_l')
elbow_l = R.head('lowerarm_l')
wrist_l = R.head('hand_l')
cuff_axis = (elbow_l - wrist_l).normalized()
cuff_local_direction = cloth.matrix_world.inverted().to_3x3() @ (-cuff_axis)
cuff_affected = []
for vertex in cloth.data.vertices:
    side_weight = sum(group.weight for group in vertex.groups
                      if cloth_groups[group.group] in {'lowerarm_l', 'lowerarm_twist_01_l', 'hand_l'})
    along = (cloth.matrix_world @ vertex.co - wrist_l).dot(cuff_axis)
    if side_weight < .55 or not 0 <= along < .055:
        continue
    fade = side_weight * (1 - along / .055)
    cuff.data[vertex.index].co = vertex.co + cuff_local_direction * (.014 * fade)
    cuff_affected.append((vertex.index, along, fade))
assert cuff_affected, 'no sleeve cuff vertices selected'
cuff.value = 0
G0 = gun.matrix_world.copy()                       # scaled object matrix
S = G0.to_scale().x
assert all(abs(v - S) < 1e-6 for v in G0.to_scale()), 'non-uniform gun scale'
G0_rot = G0.to_3x3().normalized()
G0n = Matrix.Translation(G0.translation) @ G0_rot.to_4x4()   # gun metres frame
G0n_inv = G0n.inverted()
SCALE4 = Matrix.Scale(S, 4)
record = {'input_sha256': APPROVED_BLEND_SHA, 'fps': lib.FPS, 'gun_scale': S, 'clips': {}, 'gun': {}, 'sockets': {}, 'grasp': {},
          'reload_cuff_cover_l': {'affected_vertices': len(cuff_affected), 'max_extension_mm': 14,
                                  'axis_world': list(cuff_axis),
                                  'along_wrist_to_elbow_mm': [round(min(v[1] for v in cuff_affected) * 1000, 2), round(max(v[1] for v in cuff_affected) * 1000, 2)]}}

# ---------------------------------------------------------------- magazine split (mesh units)
groups, label = lib.components(gun.data)
verts = gun.data.vertices
mag_groups = []
for gi, members in enumerate(groups):
    lo, hi = lib.bounds([verts[i].co for i in members])
    if lo.z < -.03 and lo.x > -.06 and hi.x < .056 and lo.y > -.0135 and hi.y < .0215:
        mag_groups.append(gi)
mag_vertex_ids = {i for gi in mag_groups for i in groups[gi]}
mag_face_ids = {p.index for p in gun.data.polygons if all(v in mag_vertex_ids for v in p.vertices)}
assert all(any(v in mag_vertex_ids for v in p.vertices) == all(v in mag_vertex_ids for v in p.vertices)
           for p in gun.data.polygons), 'a face straddles magazine and body shells'
mag_lo, mag_hi = lib.bounds([verts[i].co for i in mag_vertex_ids])
record['gun'].update(magazine_shells=len(mag_groups), magazine_vertices=len(mag_vertex_ids), magazine_faces=len(mag_face_ids),
                     magazine_local_bounds=[list(mag_lo), list(mag_hi)], body_vertices_before=len(verts))
bpy.ops.object.select_all(action='DESELECT')
gun.select_set(True)
bpy.context.view_layer.objects.active = gun
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='DESELECT')
bpy.ops.object.mode_set(mode='OBJECT')
for p in gun.data.polygons:
    p.select = p.index in mag_face_ids
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_mode(type='FACE')
bpy.ops.mesh.separate(type='SELECTED')
bpy.ops.object.mode_set(mode='OBJECT')
mag = next(o for o in scene.objects if o.type == 'MESH' and o is not gun and o.name.startswith('MINT_WEAPON_M4'))
mag.name = mag.data.name = 'MINT_WEAPON_M4_MAG'
assert len(mag.data.vertices) == len(mag_vertex_ids), (len(mag.data.vertices), len(mag_vertex_ids))
assert len(gun.data.vertices) + len(mag.data.vertices) == record['gun']['body_vertices_before']
record['gun']['body_vertices_after'] = len(gun.data.vertices)
mag.parent = gun
mag.matrix_parent_inverse = Matrix.Identity(4)
mag.matrix_basis = Matrix.Identity(4)
gun.rotation_mode = mag.rotation_mode = 'QUATERNION'
bpy.context.view_layer.update()
assert max(abs(a - b) for ra, rb in zip(mag.matrix_world, G0) for a, b in zip(ra, rb)) < 1e-6

mag_co = [v.co.copy() for v in mag.data.vertices]
def centroid(points):
    return sum(points, Vector()) / len(points)
# The magazine is a fan of long rib boxes with vertices only at their ends. The
# extraction axis is the length-weighted mean rib direction: sliding along it keeps
# the outline at the well lip in place (each rib slides through its own hole).
rib_dirs = []
mag_groups_local, _ = lib.components(mag.data)
for members in mag_groups_local:
    pts = [mag_co[i] for i in members]
    lo, hi = lib.bounds(pts)
    if hi.z - lo.z < .12:
        continue
    mid = (lo.z + hi.z) * .5
    d = centroid([p for p in pts if p.z > mid]) - centroid([p for p in pts if p.z < mid])
    rib_dirs.append(d)
assert len(rib_dirs) >= 8, len(rib_dirs)
axis_up = sum(rib_dirs, Vector()).normalized()                       # unit, same in both frames
record['gun']['magazine_ribs_measured'] = len(rib_dirs)
record['gun']['magazine_rib_tilt_deg_range'] = [math.degrees(d.angle(Vector((0, 0, 1)))) for d in (min(rib_dirs, key=lambda d: d.normalized().x), max(rib_dirs, key=lambda d: d.normalized().x))]
record['gun']['magazine_axis_up_local'] = list(axis_up)
record['gun']['magazine_axis_tilt_deg'] = math.degrees(axis_up.angle(Vector((0, 0, 1))))
def section(z):
    """Cross-section points of the magazine at height z: its edges cut by the plane."""
    pts = []
    for e in mag.data.edges:
        a, b = mag_co[e.vertices[0]], mag_co[e.vertices[1]]
        if (a.z - z) * (b.z - z) < 0:
            s = (z - a.z) / (b.z - a.z)
            pts.append(a.lerp(b, s))
    assert len(pts) >= 8, (z, len(pts))
    return pts
WELL_Z = -.0283
insert_point = centroid(section(WELL_Z))
record['gun']['magazine_section_at_well'] = [list(v) for v in lib.bounds(section(WELL_Z))]
record['gun']['magazine_insert_local'] = list(insert_point)
record['gun']['magazine_seated_depth_above_well'] = float(mag_hi.z - WELL_Z)

body_tree = BVHTree.FromPolygons([v.co.copy() for v in gun.data.vertices], [tuple(p.vertices) for p in gun.data.polygons])
well_hits = []
for dx in (-.02, -.01, 0., .01, .02, .03):
    for dy in (-.006, 0., .006, .012):
        origin = insert_point + Vector((dx, dy, -.06))
        hit = body_tree.ray_cast(origin, axis_up, .12)
        well_hits.append({'origin': list(origin), 'hit': list(hit[0]) if hit[0] else None,
                          'normal': list(hit[1]) if hit[0] else None, 'distance': hit[3]})
hits = [h for h in well_hits if h['hit']]
caps = [h for h in hits if h['hit'][2] < -.005 and abs(h['normal'][2]) > .8]
record['gun']['well_probe'] = {'rays': len(well_hits), 'hits': len(hits), 'flat_caps_below_z_-0.005': len(caps),
                               'first_hit_z_range': [min(h['hit'][2] for h in hits), max(h['hit'][2] for h in hits)] if hits else None}
top_faces = [p for p in mag.data.polygons if abs(p.normal.z) > .8 and all(mag.data.vertices[i].co.z > mag_hi.z - .004 for i in p.vertices)]
record['gun']['magazine_top_lid_faces'] = len(top_faces)

def surface(origin, direction, distance=.4):
    hit = body_tree.ray_cast(Vector(origin), Vector(direction).normalized(), distance)
    assert hit[0] is not None, f'no surface for {origin} {direction}'
    return hit[0]
left_face_at_bolt = surface((.062, -.2, .062), (0, 1, 0))
right_face_at_release = surface((.038, .2, .042), (0, -1, 0))
right_face_at_eject = surface((.013, .2, .083), (0, -1, 0))
rear_top = surface((.22, .0, .3), (0, 0, -1))
record['gun']['left_face_y_at_bolt_release'] = left_face_at_bolt.y
record['gun']['right_face_y_at_mag_release'] = right_face_at_release.y

# ---------------------------------------------------------------- approved grip, in gun metres
grip_pts = [v.co for v in gun.data.vertices if -.195 < v.co.x < -.145 and -.088 < v.co.z < -.04]
grip_center = centroid(grip_pts)
grip_radius = sum(math.hypot(p.x - grip_center.x, p.y - grip_center.y) for p in grip_pts) / len(grip_pts)
record['grasp']['vertical_grip'] = {'center_xy_mesh': [grip_center.x, grip_center.y], 'mean_radius_mesh': grip_radius,
                                    'mean_radius_m': grip_radius * S, 'vertices': len(grip_pts)}
def to_m(v_world):
    return G0n_inv @ v_world
hand_head_l = to_m(R.head('hand_l'))
middle_l = to_m(R.head('middle_01_l'))
palm_center_l = (hand_head_l + middle_l) * .5
palm_offset_l = palm_center_l - hand_head_l
grip_axis_point = Vector((grip_center.x * S, grip_center.y * S, palm_center_l.z))
dorsal_l = palm_center_l - grip_axis_point
dorsal_l.z = 0
dorsal_l.normalize()
forward_l = (middle_l - hand_head_l).normalized()
H_idle_l = G0n_inv @ R.idle['hand_l']
H_idle_r = G0n_inv @ R.idle['hand_r']
for name, m in (('hand_l', H_idle_l), ('hand_r', H_idle_r)):
    assert all(abs(v - 1) < 1e-5 for v in m.to_scale()), name
record['grasp']['idle_left'] = {'palm_center_m': list(palm_center_l), 'dorsal': list(dorsal_l), 'forward': list(forward_l),
                                'palm_to_grip_axis_m': (palm_center_l - grip_axis_point).length}

def hand_pose(palm_target, forward_t, dorsal_t):
    """Left hand matrix (gun metres) with the palm centre at `palm_target`, fingers
    along `forward_t` and back of the hand along `dorsal_t`, from the approved idle."""
    delta = lib.basis(forward_t, dorsal_t) @ lib.basis(forward_l, dorsal_l).inverted()
    m = delta.to_4x4() @ Matrix.Translation(-H_idle_l.translation) @ H_idle_l
    m.translation = palm_target - delta @ palm_offset_l
    return m

GRASP_Z = -.100
band = section(GRASP_Z)
band_lo, band_hi = lib.bounds(band)
front_m = (Vector((-1, 0, 0)) - axis_up * Vector((-1, 0, 0)).dot(axis_up)).normalized()
left_m = axis_up.cross(front_m).normalized()
if left_m.y > 0:
    left_m.negate()
def remap(v):
    """Grip frame (front -X, up +Z, right +Y) -> magazine frame (front_m, axis_up, -left_m)."""
    return front_m * v.dot(Vector((-1, 0, 0))) + axis_up * v.dot(Vector((0, 0, 1))) + (-left_m) * v.dot(Vector((0, 1, 0)))
K_EDGE = .80
# The hand closes around the vertical grip, a cylinder of `grip_radius`.  The
# magazine is a slab: what the fingers could wrap is its front edge, whose radius
# is half the slab thickness.  Only the fit uses that; C1's value is kept as-is.
edge_radius = (band_hi.y - band_lo.y) / 2
wrap_radius = edge_radius if FIT_CONTACT else grip_radius * K_EDGE
grasp_axis_point = Vector((band_lo.x + wrap_radius, band_lo.y + wrap_radius, GRASP_Z)) * S
palm_mag = grasp_axis_point + remap(palm_center_l - grip_axis_point)
record['grasp']['magazine'] = {'band_bounds_mesh': [list(band_lo), list(band_hi)], 'grasp_axis_point_m': list(grasp_axis_point),
                               'edge_radius_mesh': edge_radius, 'grip_radius_mesh': grip_radius,
                               'radius_deficit_m': (grip_radius - edge_radius) * S, 'edge_factor': K_EDGE, 'grasp_z_mesh': GRASP_Z}
grasp_out = remap(dorsal_l).normalized()
GRASP_DIR = remap(forward_l), remap(dorsal_l)

paddle = Vector((.062, left_face_at_bolt.y, .062))
BOLT_DIR = Vector((-1, 0, .5)).normalized(), Vector((0, -1, 0))
bolt_out = Vector((0, -1, 0))

# ---------------------------------------------------------------- sockets (mesh units, children of gun/mag)
def socket(name, parent, local):
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_size = .01
    scene.collection.objects.link(empty)
    empty.parent = parent
    empty.matrix_parent_inverse = Matrix.Identity(4)
    empty.location = Vector(local)
    record['sockets'][name] = {'parent': parent.name, 'local_mesh': list(local)}
    return empty
socket('SOCKET_MINT_MUZZLE', gun, (-.497, .004, .085))
socket('SOCKET_MINT_SIGHT', gun, (.14, .004, .155))
socket('weapon_root', gun, (0, 0, 0))
socket('muzzle', gun, (-.497, .004, .085))
socket('sight', gun, (.14, .004, .155))
socket('grip_r', gun, tuple(G0.inverted() @ ((R.head('hand_r') + R.head('middle_01_r')) * .5)))
socket('support_l', gun, tuple(grip_axis_point / S))
socket('shell_eject', gun, tuple(right_face_at_eject))
socket('mag_release', gun, tuple(right_face_at_release))
socket('bolt_release', gun, tuple(paddle))
socket('charging_handle', gun, tuple(rear_top))
socket('magazine_insert', gun, tuple(insert_point))
socket('magazine', mag, tuple(insert_point))
bpy.context.view_layer.update()

# ---------------------------------------------------------------- authoring helpers
fingers_l = R.finger_axes('l')
fingers_r = R.finger_axes('r')
pivot_r = R.head('hand_r')

# ---------------------------------------------------------------- contact fit against the deformed glove
glove = bpy.data.objects['GEO_FP_SK_Glove_01']
glove_groups = {g.index: g.name for g in glove.vertex_groups}
hand_ids = {v.index for v in glove.data.vertices
            if sum(g.weight for g in v.groups if glove_groups[g.group].endswith('_l')
                   and not glove_groups[g.group].startswith(('lowerarm', 'upperarm'))) > .35}
hand_edges = [tuple(e.vertices) for e in glove.data.edges if all(i in hand_ids for i in e.vertices)]
hand_polys = [tuple(p.vertices) for p in glove.data.polygons if all(i in hand_ids for i in p.vertices)]
assert hand_ids and hand_edges and hand_polys, (len(hand_ids), len(hand_edges), len(hand_polys))
mag_polys = [tuple(p.vertices) for p in mag.data.polygons]
mag_edge_list = [tuple(e.vertices) for e in mag.data.edges]
body_polys = [tuple(p.vertices) for p in gun.data.polygons]


def pose_left(hand_world, fraction, extra=None):
    desired, info = R.two_bone('l', hand_world)
    local = dict(R.open_fingers(fingers_l, fraction, extra=extra))
    local['lowerarm_twist_01_l'] = R.twist_rotation('l', info['twist'], desired['lowerarm_l'])
    R.apply(desired, local)
    bpy.context.view_layer.update()


def world_points(obj):
    ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = ev.to_mesh()
    pts = [ev.matrix_world @ v.co for v in mesh.vertices]
    ev.to_mesh_clear()
    return pts


def contact(target_pts, target_polys, target_edges=None, touch=.002):
    """Crossings both ways plus how much of the hand actually rests on the surface.

    Distance alone cannot tell a grip from a burial, so a candidate only counts
    when nothing crosses; only then is the touching area worth comparing.
    """
    pts = world_points(glove)
    tree = BVHTree.FromPolygons(target_pts, target_polys)
    direct = 0
    for a, b in hand_edges:
        delta = pts[b] - pts[a]
        if delta.length < 1e-7:
            continue
        hit = tree.ray_cast(pts[a], delta.normalized(), delta.length)
        if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
            direct += 1
    reverse = 0
    if target_edges:
        hand_tree = BVHTree.FromPolygons(pts, hand_polys)
        for a, b in target_edges:
            delta = target_pts[b] - target_pts[a]
            if delta.length < 1e-7:
                continue
            hit = hand_tree.ray_cast(target_pts[a], delta.normalized(), delta.length)
            if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
                reverse += 1
    distances = [tree.find_nearest(pts[i])[3] for i in hand_ids]
    return {'direct': direct, 'reverse': reverse, 'touching': sum(1 for d in distances if d <= touch),
            'nearest_mm': round(min(distances) * 1000, 3)}


def joint_degrees(fraction):
    return round(max(math.degrees(abs(fraction * bend)) for _, bend in fingers_l.values()), 2)


REGIONS = {'palm': ('hand_l',), 'index': tuple(f'index_0{k}_l' for k in (1, 2, 3)),
           'middle': tuple(f'middle_0{k}_l' for k in (1, 2, 3)), 'ring': tuple(f'ring_0{k}_l' for k in (1, 2, 3)),
           'pinky': tuple(f'pinky_0{k}_l' for k in (1, 2, 3)), 'thumb': tuple(f'thumb_0{k}_l' for k in (1, 2, 3))}
region_ids = {name: {v.index for v in glove.data.vertices
                     if sum(g.weight for g in v.groups if glove_groups[g.group] in bones) > .35}
              for name, bones in REGIONS.items()}
region_edges = {name: [tuple(e.vertices) for e in glove.data.edges if all(i in ids for i in e.vertices)]
                for name, ids in region_ids.items()}


def by_region(target_pts, target_polys):
    pts = world_points(glove)
    tree = BVHTree.FromPolygons(target_pts, target_polys)
    out = {}
    for name, edges in region_edges.items():
        direct = 0
        for a, b in edges:
            delta = pts[b] - pts[a]
            if delta.length < 1e-7:
                continue
            hit = tree.ray_cast(pts[a], delta.normalized(), delta.length)
            if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
                direct += 1
        near = min(tree.find_nearest(pts[i])[3] for i in region_ids[name])
        out[name] = {'direct': direct, 'nearest_mm': round(near * 1000, 3)}
    return out


def grasp_pose(gap, roll_deg, fingers, thumb, slide=0.):
    """Hand on the magazine: stand-off across the broad face, slide along the mag's
    front-back axis, roll about the magazine axis, and a thumb opening of its own,
    because the closed hand encircles a slab far deeper than the grip cylinder."""
    axis = Matrix.Rotation(math.radians(roll_deg), 4, axis_up)
    pivot = grasp_axis_point
    placed = Matrix.Translation(pivot) @ axis @ Matrix.Translation(-pivot) @ \
        hand_pose(palm_mag + grasp_out * gap + front_m * slide, *GRASP_DIR)
    extra = {name: (thumb - fingers) * -bend for name, (_, bend) in fingers_l.items() if name.startswith('thumb')}
    pose_left(G0n @ placed, fingers, extra=extra)
    return placed


if '--fit-report' in argv:
    table = []
    for slide in [s / 1000 for s in range(0, 41, 5)]:
        for gap in [g / 1000 for g in (0, 5, 10)]:
            for roll in (-30, 0, 30):
                for fingers in (.2, .5):
                    for thumb in (.4, .8):
                        grasp_pose(gap, roll, fingers, thumb, slide)
                        row = contact(world_points(mag), mag_polys, mag_edge_list)
                        row.update(gap_mm=round(gap * 1000, 1), slide_mm=round(slide * 1000, 1), roll_deg=roll,
                                   open_fraction=fingers, thumb_fraction=thumb,
                                   max_joint_deg=joint_degrees(max(fingers, thumb)),
                                   regions=by_region(world_points(mag), mag_polys))
                        table.append(row)
    best = min(table, key=lambda t: (t['direct'] + t['reverse'], -t['touching']))
    # Where the crossings land decides whether this is a placement problem or a
    # shape problem, so the best candidate reports them in magazine coordinates.
    grasp_pose(best['gap_mm'] / 1000, best['roll_deg'], best['open_fraction'], best['thumb_fraction'],
               best.get('slide_mm', 0) / 1000)
    pts = world_points(glove)
    mag_pts = world_points(mag)
    tree = BVHTree.FromPolygons(mag_pts, mag_polys)
    to_local = mag.matrix_world.inverted()
    where = {}
    for name in ('palm', 'thumb'):
        hits = []
        for a, b in region_edges[name]:
            delta = pts[b] - pts[a]
            if delta.length < 1e-7:
                continue
            hit = tree.ray_cast(pts[a], delta.normalized(), delta.length)
            if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
                hits.append(to_local @ hit[0])
        if hits:
            where[name] = {'hits': len(hits),
                           'local_x_mm': [round(min(h.x for h in hits) * 1000, 1), round(max(h.x for h in hits) * 1000, 1)],
                           'local_y_mm': [round(min(h.y for h in hits) * 1000, 1), round(max(h.y for h in hits) * 1000, 1)],
                           'local_z_mm': [round(min(h.z for h in hits) * 1000, 1), round(max(h.z for h in hits) * 1000, 1)]}
    span = {'mag_local_bounds_mm': [[round(v * 1000, 1) for v in mag_lo], [round(v * 1000, 1) for v in mag_hi]],
            'grasp_station_mm': round(GRASP_Z * 1000, 1)}
    (OUT / 'grasp-fit-report.json').write_text(json.dumps({'trials': table, 'best': best, 'crossing_sites': where,
                                                           'magazine': span}, indent=1) + '\n')
    # A pose that measures impossible has to be looked at before it is believed.
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'FLAT'
    scene.display.shading.color_type = 'OBJECT'
    scene.render.film_transparent = True
    scene.render.resolution_x, scene.render.resolution_y = 900, 600
    for obj, colour in ((glove, (0, .35, 1, 1)), (mag, (1, .2, .1, 1)), (gun, (.45, .45, .45, 1)),
                        (bpy.data.objects['GEO_FP_SK_Cloth_01'], (.8, .8, .2, 1)),
                        (bpy.data.objects['GEO_FP_SK_Hand'], (.2, .9, .3, 1))):
        obj.color = colour
    look = bpy.data.objects.new('FIT_CAM', bpy.data.cameras.new('FIT_CAM'))
    scene.collection.objects.link(look)
    look.data.lens = 55
    focus = mag.matrix_world @ Vector((0, 0, GRASP_Z))
    shots = {'left': Vector((-.15, -.42, .10)), 'front': Vector((-.55, -.10, .06)), 'below': Vector((-.10, -.22, -.36))}
    (OUT / 'fit-evidence').mkdir(exist_ok=True)
    for name, offset in shots.items():
        look.location = focus + offset
        direction = focus - look.location
        look.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
        scene.camera = look
        scene.render.filepath = str(OUT / f'fit-evidence/best-{name}.png')
        bpy.ops.render.render(write_still=True)
    scene.camera = camera
    print('M4_FIT_REPORT', json.dumps({'rows': len(table), 'best': {k: v for k, v in best.items() if k != 'regions'},
                                       'crossing_sites': where, 'magazine': span,
                                       'clear': len([t for t in table if t['direct'] == 0 and t['reverse'] == 0])}))
    sys.exit(0)


if FIT_CONTACT:
    trials = []
    for gap in [g / 1000 for g in range(0, 9)]:
        for fraction in [f / 100 for f in range(-10, 35, 5)]:
            pose_left(G0n @ hand_pose(palm_mag + grasp_out * gap, *GRASP_DIR), fraction)
            score = contact(world_points(mag), mag_polys, mag_edge_list)
            score.update(gap_mm=round(gap * 1000, 1), open_fraction=fraction, max_joint_deg=joint_degrees(fraction))
            trials.append(score)
    clear = [t for t in trials if t['direct'] == 0 and t['reverse'] == 0]
    assert clear, max(trials, key=lambda t: -t['direct'] - t['reverse'])
    # Among poses that do not cross, keep the one resting on the most surface;
    # ties go to the smaller opening so the hand stays closest to the approved idle.
    grasp_fit = max(clear, key=lambda t: (t['touching'], -abs(t['open_fraction']), -t['gap_mm']))
    GRASP_GAP, F_HOLD = grasp_fit['gap_mm'] / 1000, grasp_fit['open_fraction']
    record['grasp']['magazine_fit'] = {'chosen': grasp_fit, 'clear_candidates': len(clear), 'trials': len(trials),
                                       'legacy_gap_mm': 0., 'legacy_open_fraction': .12}
else:
    GRASP_GAP, F_HOLD = 0., .12
    record['grasp']['magazine_fit'] = {'chosen': None, 'legacy': True}
palm_mag = palm_mag + grasp_out * GRASP_GAP
H_grasp = hand_pose(palm_mag, *GRASP_DIR)
record['grasp']['magazine']['palm_center_m'] = list(palm_mag)

# The bolt catch is pressed by the thumb, so the thumb tip is what has to arrive.
# The palm target that puts it there is found by iteration: the map is a rigid
# translation, so the residual collapses in a few passes.
if FIT_CONTACT:
    bolt_trials = []
    for fraction in [f / 100 for f in range(0, 55, 10)]:
        for stand in [s / 1000 for s in (3, 5, 7)]:
            target = paddle * S + bolt_out * stand
            palm = paddle * S + bolt_out * .02 + Vector((.012, 0, -.012))
            residual = None
            for _ in range(6):
                pose_left(G0n @ hand_pose(palm, *BOLT_DIR), fraction)
                tip = G0n_inv @ (R.world @ rig_obj.pose.bones['thumb_03_l'].tail)
                residual = target - tip
                palm = palm + residual
                if residual.length < 1e-5:
                    break
            pose_left(G0n @ hand_pose(palm, *BOLT_DIR), fraction)
            score = contact(world_points(mag), mag_polys, mag_edge_list)
            body = contact(world_points(gun), body_polys)
            tip = G0n_inv @ (R.world @ rig_obj.pose.bones['thumb_03_l'].tail)
            score.update(open_fraction=fraction, standoff_mm=round(stand * 1000, 1), palm_m=list(palm),
                         body_direct=body['direct'], body_nearest_mm=body['nearest_mm'],
                         thumb_to_paddle_mm=round((tip - paddle * S).length * 1000, 3),
                         residual_mm=round(residual.length * 1000, 4), max_joint_deg=joint_degrees(fraction))
            bolt_trials.append(score)
    clear = [t for t in bolt_trials if t['direct'] == 0 and t['reverse'] == 0 and t['body_direct'] == 0]
    assert clear, min(bolt_trials, key=lambda t: t['direct'] + t['reverse'] + t['body_direct'])
    bolt_fit = min(clear, key=lambda t: (t['standoff_mm'], t['open_fraction']))
    palm_bolt = Vector(bolt_fit['palm_m'])
    F_PRESS = bolt_fit['open_fraction']
    PRESS = -bolt_out * (bolt_fit['standoff_mm'] / 1000 - .0005)
    record['grasp']['bolt_fit'] = {'chosen': bolt_fit, 'clear_candidates': len(clear), 'trials': len(bolt_trials),
                                   'press_travel_mm': round(PRESS.length * 1000, 3)}
else:
    palm_bolt = paddle * S + Vector((0, -.020, 0)) + Vector((.012, 0, -.012))
    F_PRESS, PRESS = .45, Vector((0, .012, 0))
    record['grasp']['bolt_fit'] = {'chosen': None, 'legacy': True}
H_bolt = hand_pose(palm_bolt, *BOLT_DIR)
record['grasp']['bolt'] = {'paddle_mesh': list(paddle), 'palm_center_m': list(palm_bolt),
                           'press_vector_m': list(PRESS), 'press_open_fraction': F_PRESS}
R.apply()
bpy.context.view_layer.update()

def gun_frame(t, spec):
    """Unscaled world frame of the gun: rise/roll about the right hand plus bobs."""
    a = spec['rise'](t)
    roll = Matrix.Rotation(math.radians(spec['roll_deg']) * a, 4, G0_rot @ Vector((1, 0, 0)))
    pitch = Matrix.Rotation(math.radians(spec['pitch_deg']) * a, 4, G0_rot @ Vector((0, 1, 0)))
    lift = Vector(spec['lift']) * a + Vector((0, 0, spec['bob'](t)))
    return Matrix.Translation(lift) @ Matrix.Translation(pivot_r) @ pitch @ roll @ Matrix.Translation(-pivot_r) @ G0n

def bump(t, t0, t1, amount):
    if t <= t0 or t >= t1:
        return 0.
    return amount * math.sin(math.pi * (t - t0) / (t1 - t0))

def to_mesh_basis(m_metres):
    """Rigid matrix in gun metres -> child basis under the scaled gun object."""
    return Matrix.Translation(m_metres.translation / S) @ m_metres.to_quaternion().to_matrix().to_4x4()

def key_object(obj, frame):
    obj.keyframe_insert('location', frame=frame, group=obj.name)
    obj.keyframe_insert('rotation_quaternion', frame=frame, group=obj.name)

def push(obj, name, start):
    action = obj.animation_data.action
    action.name = f'{name}__{obj.name}'
    track = obj.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, start, action)
    if getattr(strip, 'action_slot', True) is None:
        strip.action_slot = action.slots[0]
    track.mute = True
    obj.animation_data.action = None
    return strip

def author(name, frames, sample):
    """sample(t) -> dict(gun=unscaled world frame, mag=matrix in gun metres, hand_l/hand_r=world,
    fingers_l=open fraction, fingers_r=local rotations or None, phase=str, mag_offset=float)."""
    for obj in (rig_obj, gun, mag):
        if obj.animation_data:
            obj.animation_data.action = None
    log = []
    for frame in range(frames + 1):
        t = frame / lib.FPS
        s = sample(t)
        scene.frame_set(frame)
        cuff.value = s.get('cuff_cover', 0.)
        cuff.keyframe_insert('value', frame=frame)
        gun.matrix_world = s['gun'] @ SCALE4
        mag.matrix_basis = to_mesh_basis(s['mag'])
        key_object(gun, frame)
        key_object(mag, frame)
        desired, info_l = R.two_bone('l', s['hand_l'])
        desired_r, info_r = R.two_bone('r', s['hand_r'])
        desired.update(desired_r)
        local = dict(R.open_fingers(fingers_l, s['fingers_l']))
        if s.get('fingers_r'):
            local.update(s['fingers_r'])
        local['lowerarm_twist_01_l'] = R.twist_rotation('l', info_l['twist'], desired['lowerarm_l'])
        local['lowerarm_twist_01_r'] = R.twist_rotation('r', info_r['twist'], desired['lowerarm_r'])
        R.apply(desired, local, frame=frame, verify=frame in (0, frames // 2, frames))
        log.append({'frame': frame, 't': round(t, 5), 'phase': s.get('phase', ''), 'mag_axis_offset_m': s.get('mag_offset'),
                    'stretch_l': round(info_l['stretch'], 4), 'stretch_r': round(info_r['stretch'], 4),
                    'twist_l_deg': round(math.degrees(info_l['twist']), 2), 'twist_r_deg': round(math.degrees(info_r['twist']), 2)})
    for obj in (rig_obj, gun, mag):
        push(obj, name, 0)
    if name == 'reload_tactical':
        push(cuff.id_data, name, 0)
    record['clips'][name] = {'frames': frames, 'seconds': frames / lib.FPS, 'log': log}

# ---------------------------------------------------------------- idle: approved pose, two frames
author('idle', 1, lambda t: {'gun': G0n, 'mag': Matrix.Identity(4), 'hand_l': R.idle['hand_l'], 'hand_r': R.idle['hand_r'],
                             'fingers_l': 0., 'phase': 'idle', 'mag_offset': 0., 'cuff_cover': 0.})

# ---------------------------------------------------------------- reload_tactical: 2.4 s, events 13/45/62
if 'reload_tactical' in CLIPS:
    T = lib.GAME_RELOAD_SECONDS
    FRAMES = round(T * lib.FPS)
    E = {k: v * T for k, v in lib.GAME_RELOAD_EVENTS.items()}
    t_mag_out, t_mag_in, t_bolt = 13 / lib.FPS, 45 / lib.FPS, 62 / lib.FPS
    record['events'] = {'reload_tactical': {'game_seconds': E,
                        'authored_seconds': {'mag_out': t_mag_out, 'mag_in': t_mag_in, 'bolt': t_bolt},
                        'divergence_ms': {k: round((v - E[k]) * 1000, 2) for k, v in {'mag_out': t_mag_out, 'mag_in': t_mag_in, 'bolt': t_bolt}.items()}}}
    gun_spec = {'rise': lambda t: min(lib.segment(t, .03, .42), 1 - lib.segment(t, 1.95, 2.38)),
                'roll_deg': -16., 'pitch_deg': 9., 'lift': (.03, .0, .06),
                'bob': lambda t: bump(t, .40, .62, -.012) + bump(t, 1.44, 1.64, .010)}
    PULL = .095 * S                                    # clears the 0.086 mesh-unit seated depth
    K_out = Matrix.Translation(-axis_up * PULL)
    swing_rot = Matrix.Rotation(math.radians(-38), 4, 'X') @ Matrix.Rotation(math.radians(22), 4, 'Y')
    swing_move = Vector((-.03, -.11, -.24))
    grasp_pt = palm_mag.copy()
    about_grasp = lambda m: Matrix.Translation(grasp_pt) @ m @ Matrix.Translation(-grasp_pt)
    LOW = Matrix.Translation(swing_move) @ about_grasp(swing_rot) @ K_out

    def mag_pose(t):
        if t < t_mag_out:
            return Matrix.Identity(4), 'seated', 0.
        if t < .62:
            s = lib.segment(t, t_mag_out, .62, lib.ease_out)
            return Matrix.Translation(-axis_up * PULL * s), 'pull', PULL * s
        if t < .90:
            s = lib.segment(t, .62, .90)
            return Matrix.Translation(swing_move * s) @ about_grasp(lib.lerp_matrix(Matrix.Identity(4), swing_rot, s)) @ K_out, 'swing-out', None
        if t < 1.10:
            drift = Matrix.Translation(Vector((0, -.01, -.03)) * math.sin(math.pi * lib.segment(t, .90, 1.10)))
            return drift @ LOW, 'offscreen', None
        if t < 1.36:
            s = lib.segment(t, 1.10, 1.36)
            arc = Matrix.Translation(Vector((0, -.04, 0)) * math.sin(math.pi * s))
            return arc @ lib.lerp_matrix(LOW, K_out, s), 'swing-in', None
        if t < t_mag_in:
            s = lib.segment(t, 1.36, t_mag_in, lib.ease_in)
            return Matrix.Translation(-axis_up * PULL * (1 - s)), 'insert', PULL * (1 - s)
        return Matrix.Identity(4), 'seated', 0.

    def left_hand(t, mag_m):
        if t < .10:
            return H_idle_l, 0., 'grip'
        if t < .40:
            s = lib.segment(t, .10, .40)
            arc = Matrix.Translation(Vector((0, -.045, -.02)) * math.sin(math.pi * s))
            return arc @ lib.lerp_matrix(H_idle_l, H_grasp, s), .35 * math.sin(math.pi * min(1., s * 1.15)) + F_HOLD * s, 'reach'
        if t < 1.56:
            return mag_m @ H_grasp, F_HOLD, 'hold-mag'
        if t < 2.02:
            s = lib.segment(t, 1.56, 2.02)
            arc = Matrix.Translation(Vector((0, -.05, .01)) * math.sin(math.pi * s))
            return arc @ lib.lerp_matrix(H_grasp, H_bolt, s), F_HOLD + (F_PRESS - F_HOLD) * s, 'to-bolt'
        if t < 2.14:
            s = lib.segment(t, 2.02, t_bolt, lib.ease_in) if t <= t_bolt else 1 - lib.segment(t, t_bolt, 2.14, lib.ease_out)
            return Matrix.Translation(PRESS * s) @ H_bolt, F_PRESS, 'press'
        s = lib.segment(t, 2.14, 2.40)
        arc = Matrix.Translation(Vector((0, -.035, -.015)) * math.sin(math.pi * s))
        return arc @ lib.lerp_matrix(H_bolt, H_idle_l, s), F_PRESS * (1 - s), 'return'

    def right_index(t):
        e = lib.segment(t, .27, .40) * (1 - lib.segment(t, .50, .82))
        return R.open_fingers(fingers_r, e, only=['index']) if e > 1e-4 else None

    def reload_sample(t):
        G = gun_frame(t, gun_spec)
        mag_m, phase, offset = mag_pose(t)
        hand_l, open_l, hand_phase = left_hand(t, mag_m)
        # The action begins at frame 0.  The prior 0.24 s ramp still exposed
        # the accepted inner-wrist layer at extraction (f13); keep the cuff
        # fully advanced throughout the tactical interval, then restore it in
        # the final recovery so both end poses remain the approved idle.
        cover = lib.segment(t, 0., .06) * (1 - lib.segment(t, 2.14, 2.40))
        return {'gun': G, 'mag': mag_m, 'hand_l': G @ hand_l, 'hand_r': G @ H_idle_r, 'fingers_l': open_l,
                'fingers_r': right_index(t), 'phase': f'{phase}/{hand_phase}', 'mag_offset': offset, 'cuff_cover': cover}
    author('reload_tactical', FRAMES, reload_sample)

scene.frame_start, scene.frame_end = 0, max(c['frames'] for c in record['clips'].values())
for obj in (rig_obj, gun, mag):
    for track in obj.animation_data.nla_tracks:
        track.mute = track.name != 'idle'
scene.frame_set(1)
scene.frame_set(0)
bpy.context.view_layer.update()
worst = {}
for name in ('hand_l', 'hand_r', 'index_03_l', 'thumb_03_r', 'upperarm_l', 'lowerarm_twist_01_l'):
    got = R.rigid_world(rig_obj.pose.bones[name].matrix)
    worst[name] = max(abs(a - b) for ra, rb in zip(got, R.idle[name]) for a, b in zip(ra, rb))
assert max(worst.values()) < 1e-5, worst
assert max(abs(a - b) for ra, rb in zip(gun.matrix_world, G0) for a, b in zip(ra, rb)) < 1e-6
assert max(abs(a - b) for ra, rb in zip(mag.matrix_world, G0) for a, b in zip(ra, rb)) < 1e-6
record['idle_track_matches_approved_pose'] = worst
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'm4-actions.blend'))
(OUT / 'build.json').write_text(json.dumps(record, indent=1) + '\n')
print('M4_ACTIONS_BUILD', OUT / 'm4-actions.blend')
print(json.dumps({k: v for k, v in record['gun'].items()}, indent=None))
print(json.dumps(record.get('events')))
