"""Mede GLBs intactos em Blender isolado; imagens são diagnósticos offline."""
import importlib.util
import json
import math
import re
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('inventory', Path(__file__).with_name('rifles-inventory.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
inv.guard()
DATA = json.loads((inv.OUT / 'inventory.json').read_text())
CFG = {}
source = (inv.ROOT / 'public/js/weapons.js').read_text()
for weapon in inv.WEAPONS:
    match = re.search(r'^\s*' + weapon + r':\s*\{ len: ([\d.]+), rot: \[0, ([\d.]+), 0\], gripZ: ([\d.]+)', source, re.M)
    assert match, f'configuração mudou: {weapon}'
    CFG[weapon] = tuple(map(float, match.groups()))


def vec(v):
    return [round(float(x), 7) for x in v]


def bounds(points):
    lo = Vector([min(p[i] for p in points) for i in range(3)])
    hi = Vector([max(p[i] for p in points) for i in range(3)])
    return {'min': vec(lo), 'max': vec(hi), 'size': vec(hi - lo), 'center': vec((lo + hi) / 2)}


def evaluated(obj):
    ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = ev.to_mesh()
    points = [ev.matrix_world @ v.co for v in mesh.vertices]
    faces = [list(p.vertices) for p in mesh.polygons]
    ev.to_mesh_clear()
    return points, faces


def photo(name, objects, canonical=False):
    scene = bpy.context.scene
    for o in scene.objects:
        if o.type == 'MESH':
            o.hide_render = o not in objects
    pts = [v for o in objects for v in evaluated(o)[0]]
    b = bounds(pts)
    center = Vector(b['center'])
    span = max(b['size'])
    camdata = bpy.data.cameras.new('DIAGNOSTIC_CAMERA')
    cam = bpy.data.objects.new('DIAGNOSTIC_CAMERA', camdata)
    scene.collection.objects.link(cam)
    if canonical:
        direction = Vector((1, 0, 0))
    else:
        # O eixo mais longo escolhe apenas o ângulo diagnóstico, sem mudar o asset.
        axis = b['size'].index(max(b['size']))
        direction = Vector((1, 0, .15)) if axis == 1 else Vector((0, -1, .15))
    cam.location = center + direction.normalized() * span * 3
    cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()
    camdata.type = 'ORTHO'
    inverse_rotation = cam.rotation_euler.to_matrix().transposed()
    projected = [inverse_rotation @ (p - center) for p in pts]
    camdata.ortho_scale = 2.24 * max(max(abs(p.x) for p in projected),
                                   2 * max(abs(p.y) for p in projected))
    camdata.clip_end = span * 10
    camdata.clip_start = .001
    scene.camera = cam
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = 720
    scene.render.resolution_y = 360
    scene.render.resolution_percentage = 100
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'OBJECT'
    scene.display.shading.show_shadows = False
    scene.display.shading.show_cavity = True
    scene.display.shading.background_type = 'WORLD'
    if scene.world is None:
        scene.world = bpy.data.worlds.new('DIAGNOSTIC_WORLD')
    scene.world.color = (.12, .12, .12)
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(inv.OUT / f'{name}.png')
    bpy.ops.render.render(write_still=True)
    for o in objects:
        o.hide_render = False


def set_clip(name):
    strips = []
    for o in bpy.context.scene.objects:
        ad = o.animation_data
        if not ad:
            continue
        ad.action = None
        for track in ad.nla_tracks:
            track.mute = track.name != name
            if not track.mute:
                strips.extend(track.strips)
    assert strips, f'clipe NLA ausente: {name}'
    return min(s.frame_start for s in strips), max(s.frame_end for s in strips)


def main():
    detail = '--detail' in sys.argv
    report = {'blender': bpy.app.version_string, 'space': 'Blender world Z-up; raw canonical X=lateral,Y=-forward,Z=up', 'assets': {}}
    for key, data in DATA.items():
        if detail and not key.startswith('goldsrc-vm/'):
            continue
        if not key.startswith(('mint/', 'native/ar', 'native/ak', 'goldsrc-vm/', 'retarget-vm/')):
            continue
        assert inv.digest(Path(data['path'])) == data['sha256']
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.context.scene.render.threads_mode = 'FIXED'
        bpy.context.scene.render.threads = 2
        bpy.ops.import_scene.gltf(filepath=data['path'])
        scene = bpy.context.scene
        source_names = {n.get('name') for n in data['nodes'] if 'mesh' in n}
        meshes = [o for o in scene.objects if o.type == 'MESH' and o.name in source_names]
        rigs = [o for o in scene.objects if o.type == 'ARMATURE']
        record = {'path': data['path'], 'sha256': data['sha256'], 'unit_system': scene.unit_settings.system,
                  'unit_scale': scene.unit_settings.scale_length, 'fps': scene.render.fps,
                  'meshes': [], 'rigs': [], 'clips': {}}
        for o in meshes:
            record['meshes'].append({'name': o.name, 'parent': o.parent.name if o.parent else None,
                                    'parent_bone': o.parent_bone, 'vertices': len(o.data.vertices),
                                    'world_bounds': bounds(evaluated(o)[0]), 'matrix_world': [vec(row) for row in o.matrix_world],
                                    'uv_layers': [u.name for u in o.data.uv_layers],
                                    'materials': [m.name for m in o.data.materials if m]})
        for rig in rigs:
            record['rigs'].append({'name': rig.name, 'scale': vec(rig.scale),
                                  'bones': [{'name': b.name, 'parent': b.parent.name if b.parent else None,
                                             'head': vec(b.head_local), 'tail': vec(b.tail_local)} for b in rig.data.bones]})
        if key.startswith('mint/'):
            w = key.split('/')[1]
            length, yaw, grip = CFG[w]
            for o in meshes:
                o.matrix_world = Matrix.Rotation(math.radians(yaw), 4, 'Z') @ o.matrix_world
            bpy.context.view_layer.update()
            pts = [v for o in meshes for v in evaluated(o)[0]]
            b = bounds(pts)
            scale = length / max(b['size'])
            grip_y = b['min'][1] + b['size'][1] * grip
            for o in meshes:
                o.matrix_world = Matrix.Scale(scale, 4) @ Matrix.Translation((0, -grip_y, 0)) @ o.matrix_world
                o.color = (.55, .58, .62, 1)
            bpy.context.view_layer.update()
            pts = [v for o in meshes for v in evaluated(o)[0]]
            gun = [Vector((v.x, v.z, -v.y)) for v in pts]
            slices = []
            lo, hi = min(v.z for v in gun), max(v.z for v in gun)
            for i in range(20):
                a, b = lo + (hi - lo) * i / 20, lo + (hi - lo) * (i + 1) / 20
                part = [v for v in gun if a <= v.z <= b]
                slices.append({'z': [a, b], 'n': len(part), 'bounds': bounds(part) if part else None})
            record.update(canonical_bounds=bounds(gun), normalization=scale, slices=slices)
            photo(f'raw-{w}', meshes, canonical=True)
        else:
            for clip in data['clips']:
                if clip['name'] not in ['idle', 'reload_tactical', 'reload_empty']:
                    continue
                start, end = set_clip(clip['name'])
                frames = []
                for fraction in [0, .18, .35, .5, .62, .75, .86, 1]:
                    frame = start + (end - start) * fraction
                    scene.frame_set(int(frame), subframe=frame % 1)
                    bpy.context.view_layer.update()
                    mechanical = [o for o in meshes if 'MINT_WEAPON_MAG_' in o.name]
                    bones = {}
                    for rig in rigs:
                        for bone in rig.pose.bones:
                            if re.search(r'(^hand_[lr]$|hand\.[LR]$|^Mag$|^Charge$|^Bolt|^MagRelease)', bone.name):
                                bones[f'{rig.name}/{bone.name}'] = vec(rig.matrix_world @ bone.matrix.translation)
                    mags = {o.name: bounds(evaluated(o)[0]) for o in mechanical}
                    distances = {}
                    for o in mechanical:
                        pts, faces = evaluated(o)
                        tree = BVHTree.FromPolygons(pts, faces)
                        for bn, pos in bones.items():
                            if 'hand' in bn.lower():
                                distances[f'{bn}->{o.name}'] = tree.find_nearest(Vector(pos))[3]
                    frames.append({'fraction': fraction, 'frame': frame, 'bones': bones, 'magazines': mags,
                                   'bone_origin_to_mag_surface': distances})
                record['clips'][clip['name']] = {'frame_range': [start, end], 'samples': frames}
            if key.startswith('goldsrc-vm/'):
                start, end = set_clip('idle')
                scene.frame_set(int(start))
                weapon = [o for o in meshes if not (o.name in ['lhand', 'rhand', 'GS_HANDS'])]
                for o in weapon:
                    o.color = (.9, .08, .03, 1) if 'MAG_' in o.name else (.55, .58, .62, 1)
                if detail:
                    photo(key.replace('/', '-') + '-part', [o for o in weapon if 'MAG_' in o.name])
                    start, end = set_clip('reload_tactical')
                    frame = (start + end) / 2
                    scene.frame_set(int(frame), subframe=frame % 1)
                    photo(key.replace('/', '-') + '-reload-half', weapon)
                else:
                    photo(key.replace('/', '-'), weapon)
        report['assets'][key] = record
        filename = 'blender-detail.json' if detail else 'blender.json'
        (inv.OUT / filename).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        print('RIFLES_INSPECTED', key, flush=True)


if __name__ == '__main__':
    main()
