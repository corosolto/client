"""Inspeção Blender isolada dos insumos LMG; renders são diagnóstico offline.

Mede o doador MGX5 (braços + arma + mecanismo Feed_Tray/Top/Lever/Bag/bullets)
nos clipes idle/recargas, a Mint própria normalizada pelo contrato e o molde
GoldSrc M249 como referência de categoria. Saídas em artifacts/…/lmg/.
"""
import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('inventory', Path(__file__).with_name('lmg-inventory.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
inv.guard()
DATA = json.loads((inv.OUT / 'inventory.json').read_text())

MECHANISM = ('Feed_Tray', 'Top', 'Top_Catch', 'Lever', 'Rail', 'Switch', 'Bag')
HANDS = ('hand_l', 'hand_r', 'ik_hand_gun', 'ik_hand_l', 'ik_hand_r')


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
    ev.to_mesh_clear()
    return points


def photo(name, objects, canonical=False):
    scene = bpy.context.scene
    for o in scene.objects:
        if o.type == 'MESH':
            o.hide_render = o not in objects
    pts = [v for o in objects for v in evaluated(o)]
    b = bounds(pts)
    center = Vector(b['center'])
    span = max(b['size'])
    camdata = bpy.data.cameras.new('DIAGNOSTIC_CAMERA')
    cam = bpy.data.objects.new('DIAGNOSTIC_CAMERA', camdata)
    scene.collection.objects.link(cam)
    direction = Vector((1, 0, 0)) if canonical else Vector((0, -1, .15))
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


def sample_rigs(rigs):
    out = {}
    for rig in rigs:
        for bone in rig.pose.bones:
            if bone.name in MECHANISM or bone.name in HANDS:
                out[bone.name] = {
                    'head': vec(rig.matrix_world @ bone.head),
                    'matrix': [vec(row) for row in (rig.matrix_world @ bone.matrix)],
                }
    return out


def main():
    report = {'blender': bpy.app.version_string,
              'space': 'Blender world Z-up; canonical X=lateral,Y=-forward,Z=up',
              'assets': {}}

    # --- doador MGX5: braços + arma, clipes com mecanismo ---
    key = 'doador_lmg_runtime'
    data = DATA[key]
    assert inv.digest(Path(data['path'])) == data['sha256']
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 2
    bpy.ops.import_scene.gltf(filepath=data['path'])
    scene = bpy.context.scene
    meshes = [o for o in scene.objects if o.type == 'MESH']
    rigs = [o for o in scene.objects if o.type == 'ARMATURE']
    record = {'path': data['path'], 'sha256': data['sha256'],
              'meshes': [{'name': o.name, 'vertices': len(o.data.vertices),
                          'world_bounds': bounds(evaluated(o))} for o in meshes],
              'rigs': [{'name': r.name, 'scale': vec(r.scale),
                        'bones': [{'name': b.name, 'parent': b.parent.name if b.parent else None,
                                   'head': vec(b.head_local), 'tail': vec(b.tail_local)}
                                  for b in r.data.bones]} for r in rigs],
              'clips': {}}
    for clip in ('idle', 'reload_tactical', 'reload_empty'):
        start, end = set_clip(clip)
        frames = []
        for fraction in [0, .18, .35, .5, .62, .75, .86, 1]:
            frame = start + (end - start) * fraction
            scene.frame_set(int(frame), subframe=frame % 1)
            bpy.context.view_layer.update()
            frames.append({'fraction': fraction, 'frame': frame, 'bones': sample_rigs(rigs)})
        record['clips'][clip] = {'frame_range': [start, end], 'samples': frames}
    start, end = set_clip('idle')
    scene.frame_set(int(start))
    bpy.context.view_layer.update()
    photo('doador-idle', meshes)
    for clip in ('reload_tactical', 'reload_empty'):
        start, end = set_clip(clip)
        for fraction in (.18, .5, .86):
            frame = start + (end - start) * fraction
            scene.frame_set(int(frame), subframe=frame % 1)
            bpy.context.view_layer.update()
            photo(f'doador-{clip}-f{int(round(fraction * 100))}', meshes)
    report['assets'][key] = record
    print('LMG_INSPECTED', key, flush=True)

    # --- Mint própria normalizada pelo contrato (len 1.10, yaw 90, gripZ .58) ---
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 2
    bpy.ops.import_scene.gltf(filepath=DATA['mint_lmg']['path'])
    scene = bpy.context.scene
    meshes = [o for o in scene.objects if o.type == 'MESH']
    length, yaw, grip = 1.10, 90.0, 0.58
    for o in meshes:
        o.matrix_world = Matrix.Rotation(math.radians(yaw), 4, 'Z') @ o.matrix_world
    bpy.context.view_layer.update()
    pts = [v for o in meshes for v in evaluated(o)]
    b = bounds(pts)
    scale = length / max(b['size'])
    grip_y = b['min'][1] + b['size'][1] * grip
    for o in meshes:
        o.matrix_world = Matrix.Scale(scale, 4) @ Matrix.Translation((0, -grip_y, 0)) @ o.matrix_world
        o.color = (.55, .58, .62, 1)
    bpy.context.view_layer.update()
    pts = [v for o in meshes for v in evaluated(o)]
    gun = [Vector((v.x, v.z, -v.y)) for v in pts]
    slices = []
    lo, hi = min(v.z for v in gun), max(v.z for v in gun)
    for i in range(20):
        a, c = lo + (hi - lo) * i / 20, lo + (hi - lo) * (i + 1) / 20
        part = [v for v in gun if a <= v.z <= c]
        slices.append({'z': [a, c], 'n': len(part), 'bounds': bounds(part) if part else None})
    report['assets']['mint_lmg'] = {
        'path': DATA['mint_lmg']['path'], 'sha256': DATA['mint_lmg']['sha256'],
        'normalization': scale, 'canonical_bounds': bounds(gun), 'slices': slices,
        'meshes': [{'name': o.name, 'vertices': len(o.data.vertices)} for o in meshes],
    }
    photo('raw-lmg', meshes, canonical=True)
    print('LMG_INSPECTED mint_lmg', flush=True)

    # --- molde GoldSrc M249: referência CC0 de categoria ---
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.threads_mode = 'FIXED'
    bpy.context.scene.render.threads = 2
    bpy.ops.import_scene.gltf(filepath=DATA['goldsrc_m249']['path'])
    scene = bpy.context.scene
    meshes = [o for o in scene.objects if o.type == 'MESH']
    rigs = [o for o in scene.objects if o.type == 'ARMATURE']
    record = {'path': DATA['goldsrc_m249']['path'], 'sha256': DATA['goldsrc_m249']['sha256'],
              'clips': {}}
    for clip in ('idle1', 'idle1-reload', 'idle1-draw', 'idle1-shoot1'):
        start, end = set_clip(clip)
        frames = []
        for fraction in [0, .18, .5, .62, .86, 1]:
            frame = start + (end - start) * fraction
            scene.frame_set(int(frame), subframe=frame % 1)
            bpy.context.view_layer.update()
            hands = {}
            for rig in rigs:
                for bone in rig.pose.bones:
                    if 'hand' in bone.name.lower():
                        hands[bone.name] = vec(rig.matrix_world @ bone.head)
            frames.append({'fraction': fraction, 'frame': frame, 'hands': hands})
        record['clips'][clip] = {'frame_range': [start, end], 'samples': frames}
    for clip, fraction in (('idle1', 0), ('idle1-reload', .5), ('idle1-draw', .5), ('idle1-shoot1', .3)):
        start, end = set_clip(clip)
        frame = start + (end - start) * fraction
        scene.frame_set(int(frame), subframe=frame % 1)
        bpy.context.view_layer.update()
        photo(f'goldsrc-m249-{clip}-f{int(round(fraction * 100))}', meshes)
    report['assets']['goldsrc_m249'] = record
    print('LMG_INSPECTED goldsrc_m249', flush=True)

    (inv.OUT / 'blender.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
