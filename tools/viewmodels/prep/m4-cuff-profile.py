"""Measure deformed wrist layers without editing the approved rig or materials."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[3]
assert ROOT.name == 'vm-m4-reload-evidence'
assert subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip() == 'codex/vm-m4-reload-evidence'
SOURCE = ROOT.parent / 'vm-prep-rifles/artifacts/viewmodels/prep/rifles/m4-actions-fingers-c1'
TRANSFER = '--transfer-weights' in sys.argv
ALTERNATE = '--elbow-mag-source' in sys.argv
if ALTERNATE:
    SOURCE = ROOT / 'artifacts/viewmodels/m4-elbow-mag-path'
    assert SOURCE.resolve().is_relative_to(ROOT.resolve())
stem = 'm4-elbow-mag' if ALTERNATE else 'm4-cuff'
OUT = ROOT / 'artifacts/viewmodels' / (stem + ('-weights' if TRANSFER else '-profile'))
assert OUT.resolve().is_relative_to(ROOT.resolve())
OUT.mkdir(parents=True, exist_ok=True)
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
if not ALTERNATE:
    assert digest(SOURCE / 'm4-actions-runtime.glb') == '20fd7f8b69b9a88238596e1bccb089ca2bafeb5ad479f08c5ebe41f54344be06'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE / 'm4-actions.blend'), load_ui=False)
scene = bpy.context.scene
rig = bpy.data.objects['RIG_FP_ARMS']
cloth = bpy.data.objects['GEO_FP_SK_Cloth_01']
skin = bpy.data.objects['GEO_FP_SK_Hand']
glove = bpy.data.objects['GEO_FP_SK_Glove_01']
cam = scene.camera
home = cam.matrix_world.copy()
for obj in bpy.data.objects:
    for data in (obj, obj.data.shape_keys if obj.type == 'MESH' else None):
        ad = data.animation_data if data else None
        if ad:
            ad.action = None
            for track in ad.nla_tracks:
                track.mute = track.name != 'reload_tactical'


def at(frame):
    scene.frame_set(frame + 1)
    scene.frame_set(frame)
    bpy.context.view_layer.update()


def evaluated(obj):
    ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = ev.to_mesh()
    points = [ev.matrix_world @ v.co for v in mesh.vertices]
    polygons = [tuple(p.vertices) for p in mesh.polygons]
    ev.to_mesh_clear()
    return points, BVHTree.FromPolygons(points, polygons)


def weights(obj, v):
    return {obj.vertex_groups[g.group].name: round(g.weight, 6) for g in v.groups if g.weight > 1e-6}


def wrist_ids(obj):
    wrist = rig.matrix_world @ rig.data.bones['hand_l'].head_local
    elbow = rig.matrix_world @ rig.data.bones['lowerarm_l'].head_local
    axis = (elbow - wrist).normalized()
    result = []
    for v in obj.data.vertices:
        w = weights(obj, v)
        if sum(value for name, value in w.items() if name in ('hand_l', 'lowerarm_l', 'lowerarm_twist_01_l')) < .55:
            continue
        offset = obj.matrix_world @ v.co - wrist
        if -.025 <= offset.dot(axis) <= .09:
            result.append(v.index)
    assert result, obj.name
    return result


ids = {obj.name: wrist_ids(obj) for obj in (cloth, skin, glove)}
weight_changes = []
if TRANSFER:
    covers = []
    for obj in (cloth, glove):
        obj.data.calc_loop_triangles()
        pts = [obj.matrix_world @ v.co for v in obj.data.vertices]
        triangles = [tuple(t.vertices) for t in obj.data.loop_triangles]
        covers.append((obj, pts, triangles, BVHTree.FromPolygons(pts, triangles, all_triangles=True)))
    for i in ids[skin.name]:
        v = skin.data.vertices[i]
        p = skin.matrix_world @ v.co
        obj, pts, triangles, tree = min(covers, key=lambda c: c[3].find_nearest(p)[3])
        nearest, _, face, _ = tree.find_nearest(p)
        tri = triangles[face]
        a, b, c = [pts[j] for j in tri]
        x, y, z = b - a, c - a, nearest - a
        den = x.dot(x) * y.dot(y) - x.dot(y) ** 2
        assert abs(den) > 1e-20
        u = (y.dot(y) * z.dot(x) - x.dot(y) * z.dot(y)) / den
        w = (x.dot(x) * z.dot(y) - x.dot(y) * z.dot(x)) / den
        target = {}
        for j, factor in zip(tri, (1 - u - w, u, w)):
            for name, value in weights(obj, obj.data.vertices[j]).items():
                target[name] = target.get(name, 0.) + max(0., factor) * value
        total = sum(target.values())
        target = {name: value / total for name, value in target.items() if value > 1e-7}
        weight_changes.append({'id': i, 'before': weights(skin, v), 'after': target, 'cover': obj.name, 'triangle': tri})
        for group in skin.vertex_groups:
            group.remove([i])
        for name, value in target.items():
            (skin.vertex_groups.get(name) or skin.vertex_groups.new(name=name)).add([i], value, 'REPLACE')
    skin.data.update()
cuff = cloth.data.shape_keys.key_blocks['reload_cuff_cover_l']
changed = {v.index for v in cloth.data.vertices if (cuff.data[v.index].co - v.co).length > 1e-9}
report = {'source_blend_sha256': digest(SOURCE / 'm4-actions.blend'),
          'method': 'Fixed bind-space wrist selection. Signed nearest-surface distance uses triangle normal; '
                    'open garment means sign is local, not a global containment proof. Visibility rays test '
                    'cloth and glove occlusion at skin vertices, not raster pixels or self-occlusion.',
          'weight_changes': weight_changes, 'selection': {}, 'frames': {}}
for obj in (cloth, skin, glove):
    report['selection'][obj.name] = [{'id': i, 'weights': weights(obj, obj.data.vertices[i]),
                                    'cuff_changed': i in changed if obj == cloth else False}
                                   for i in ids[obj.name]]
mesh_objects = [o for o in scene.objects if o.type == 'MESH' and not o.hide_render]


def sample(frame):
    at(frame)
    cp, ct = evaluated(cloth)
    gp, gt = evaluated(glove)
    sp, _ = evaluated(skin)
    wrist = rig.matrix_world @ rig.pose.bones['hand_l'].head
    elbow = rig.matrix_world @ rig.pose.bones['lowerarm_l'].head
    axis = (elbow - wrist).normalized()
    direction = (home.translation - wrist).normalized()
    views = {'front': wrist + direction * .28 + Vector((0, 0, .03)),
             'opposite': wrist - direction * .28 + Vector((0, 0, .03))}
    rows = []
    for i in ids[skin.name]:
        p = sp[i]
        nearest, normal, face, distance = ct.find_nearest(p)
        visible = {}
        for name, origin in views.items():
            delta = p - origin
            visible[name] = not any(t.ray_cast(origin, delta.normalized(), max(0., delta.length - 1e-6))[0] is not None for t in (ct, gt))
        rows.append({'id': i, 'point': list(p), 'along_mm': (p - wrist).dot(axis) * 1000,
                     'cloth_distance_mm': distance * 1000,
                     'cloth_signed_mm': (p - nearest).dot(normal) * 1000,
                     'cloth_face': face, 'visible': visible})
    profile = {'skin': rows, 'cloth': [{'id': i, 'point': list(cp[i]), 'along_mm': (cp[i] - wrist).dot(axis) * 1000,
                                      'radius_mm': ((cp[i] - wrist) - axis * (cp[i] - wrist).dot(axis)).length * 1000}
                                     for i in ids[cloth.name]],
               'cuff_value': cuff.value,
               'visible_skin_vertices': {v: sum(r['visible'][v] for r in rows) for v in views}}
    return profile, wrist, views


for frame in range(73):
    profile, wrist, views = sample(frame)
    report['frames'][str(frame)] = profile
(OUT / 'profile.json').write_text(json.dumps(report, indent=2) + '\n')
summary = {'critical_frames': {f: {'visible': report['frames'][str(f)]['visible_skin_vertices'],
               'cuff': report['frames'][str(f)]['cuff_value']} for f in (0, 13, 25, 30, 35, 45, 62, 72)},
           'full_cycle_max_visible': {view: max((d['visible_skin_vertices'][view], int(f)) for f, d in report['frames'].items())
                                      for view in ('front', 'opposite')}}
(OUT / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print('M4_CUFF_PROFILE', json.dumps(summary), flush=True)

if '--export' in sys.argv:
    assert TRANSFER and ALTERNATE, 'The original weight-only trial is rejected; do not export it.'
    for obj in bpy.data.objects:
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
    for obj in bpy.data.objects:
        for data in (obj, obj.data.shape_keys if obj.type == 'MESH' else None):
            if data and data.animation_data:
                for track in data.animation_data.nla_tracks:
                    track.mute = track.name != 'reload_tactical'

if '--render' in sys.argv:
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x, scene.render.resolution_y = 768, 576
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 2
    scene.display.shading.color_type = 'OBJECT'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.show_cavity = True
    scene.render.film_transparent = False
    for obj in mesh_objects:
        obj.color = ((.8, .05, .05, 1) if obj == cloth else (.05, .15, .8, 1) if obj == glove
                     else (.15, .85, .2, 1) if obj == skin else (.3, .3, .3, 1))
    for frame in (0, 13, 25, 30, 35, 45, 54, 62, 70, 72):
        profile, wrist, views = sample(frame)
        for name, location in views.items():
            cam.location = location
            cam.rotation_euler = (wrist - location).to_track_quat('-Z', 'Y').to_euler()
            cam.data.lens = 40
            scene.render.filepath = str(OUT / f'f{frame:03d}-{name}.png')
            bpy.ops.render.render(write_still=True)
assert digest(SOURCE / 'm4-actions.blend') == report['source_blend_sha256']
