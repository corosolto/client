"""Compare the offline finger round against its source; no asset mutations."""
import importlib.util
import json
from pathlib import Path
import bpy
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('inventory', HERE / 'rifles-inventory.py')
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
inv.guard()
OUT = inv.OUT / 'm4-actions-fingers-c1'
fit = json.loads((OUT / 'finger-fit.json').read_text())


def evaluated(obj):
    ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = ev.to_mesh()
    pts = [ev.matrix_world @ v.co for v in mesh.vertices]
    ev.to_mesh_clear()
    return pts


def sample(directory):
    bpy.ops.wm.open_mainfile(filepath=str(directory / 'm4-actions.blend'), load_ui=False)
    scene = bpy.context.scene
    for obj in bpy.data.objects:
        data = obj.animation_data
        if data:
            data.action = None
            for track in data.nla_tracks:
                track.mute = track.name != 'reload_tactical'
    cloth = bpy.data.objects['GEO_FP_SK_Cloth_01']
    for track in cloth.data.shape_keys.animation_data.nla_tracks:
        track.mute = track.name != 'reload_tactical'
    glove = bpy.data.objects['GEO_FP_SK_Glove_01']
    skin = bpy.data.objects['GEO_FP_SK_Hand']
    mag = bpy.data.objects['MINT_WEAPON_M4_MAG']
    adjacent = {v.index: set() for v in glove.data.vertices}
    for edge in glove.data.edges:
        a, b = edge.vertices
        adjacent[a].add(b)
        adjacent[b].add(a)
    result = {}
    for frame in (0, 13, 20, 43, 45, 62, 72):
        scene.frame_set(frame + 1)
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        pts = evaluated(glove)
        mag_pts = evaluated(mag)
        tree = BVHTree.FromPolygons(mag_pts, [tuple(p.vertices) for p in mag.data.polygons])
        crossings = {}
        reverse_crossings = {}
        patches = {}
        for finger, info in fit['fit'].items():
            group_names = {g.index for g in glove.vertex_groups
                           if g.name.startswith(finger + '_') and g.name.endswith('_l')}
            ids = {v.index for v in glove.data.vertices
                   if sum(g.weight for g in v.groups if g.group in group_names) > .35}
            count = 0
            for edge in glove.data.edges:
                a, b = edge.vertices
                if a not in ids or b not in ids:
                    continue
                delta = pts[b] - pts[a]
                if delta.length < 1e-7:
                    continue
                hit = tree.ray_cast(pts[a], delta.normalized(), delta.length)
                if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
                    count += 1
            crossings[finger] = count
            polys = [tuple(p.vertices) for p in glove.data.polygons if all(i in ids for i in p.vertices)]
            glove_tree = BVHTree.FromPolygons(pts, polys)
            reverse_count = 0
            for edge in mag.data.edges:
                a, b = edge.vertices
                delta = mag_pts[b] - mag_pts[a]
                if delta.length < 1e-7:
                    continue
                hit = glove_tree.ray_cast(mag_pts[a], delta.normalized(), delta.length)
                if hit[0] is not None and 1e-6 < hit[3] < delta.length - 1e-6:
                    reverse_count += 1
            reverse_crossings[finger] = reverse_count
            distances = [tree.find_nearest(pts[i])[3] * 1000 for i in info['patch_ids']]
            near = {i for i, d in zip(info['patch_ids'], distances) if d <= 5}
            largest = 0
            while near:
                component, todo = set(), [near.pop()]
                while todo:
                    vertex = todo.pop()
                    component.add(vertex)
                    neighbors = adjacent[vertex] & near
                    near.difference_update(neighbors)
                    todo.extend(neighbors)
                largest = max(largest, len(component))
            patches[finger] = {'max_mm': max(distances), 'mean_mm': sum(distances) / len(distances),
                               'within_5mm': sum(d <= 5 for d in distances), 'vertices': len(distances),
                               'largest_connected_within_5mm': largest}
        result[str(frame)] = {'edge_crossings': crossings, 'reverse_edge_crossings': reverse_crossings, 'patches': patches,
                             'cloth': evaluated(cloth), 'skin': evaluated(skin)}
    return result


baseline = sample(inv.OUT / 'm4-actions-c1')
candidate = sample(OUT)
report = {'edge_test': 'Exact edge ray segments in both directions, restricted to finger surface triangles; '
                      'positive count proves intersection; zero does not rule out containment or coplanar overlap.',
          'frames': {}}
for frame in baseline:
    before, after = baseline[frame], candidate[frame]
    deltas = {part: max((a - b).length * 1000 for a, b in zip(before[part], after[part]))
              for part in ('cloth', 'skin')}
    report['frames'][frame] = {'before': {k: v for k, v in before.items() if k not in deltas},
                               'after': {k: v for k, v in after.items() if k not in deltas},
                               'mesh_delta_mm': deltas}
(OUT / 'contact-check.json').write_text(json.dumps(report, indent=2) + '\n')
for frame, data in report['frames'].items():
    print('CONTACT', frame, json.dumps({'before': data['before']['edge_crossings'],
                                      'after': data['after']['edge_crossings'], 'delta': data['mesh_delta_mm']}))
