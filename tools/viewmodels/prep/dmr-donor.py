#!/usr/bin/env python3
"""Inspeção dos doadores pagos bolt (Kar98K) e g3 (G3) para a lane vm-dmr-final.

Abre cada .blend SOMENTE LEITURA (nunca salva), lista armatures/bones de arma,
ações, malhas e materiais; importa os raw-clips GLB para inventariar tracks e
durações. Saída: artifacts/viewmodels/dmr/donadores/{familia}/
"""
import json
import os
import sys

import bpy
import mathutils

CWD = os.path.abspath(os.path.dirname(__file__) + '/../../..')
OUT = os.path.join(CWD, 'artifacts', 'viewmodels', 'dmr', 'donadores')
INTEGRADORA = '/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-astra-pistol'
PACKS = {
    'bolt': os.path.join(INTEGRADORA, 'public', 'private-assets', 'viewmodels', 'bolt'),
    'g3':   os.path.join(INTEGRADORA, 'public', 'private-assets', 'viewmodels', 'g3'),
}


def reset_empty():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def render(path, camera, res, ortho=None):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'FLAT'
    scene.display.shading.show_cavity = True
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.camera = camera
    scene.render.filepath = path
    display = bpy.context.preferences.view.render_display_type
    bpy.context.preferences.view.render_display_type = 'NONE'
    try:
        bpy.ops.render.render(write_still=True)
    finally:
        bpy.context.preferences.view.render_display_type = display


def camera_fit(collection, res, name='cam'):
    meshes = [o for o in collection.all_objects if o.type == 'MESH'] if hasattr(collection, 'all_objects') else []
    objs = [o for o in bpy.data.objects if o.type == 'MESH']
    box_min = mathutils.Vector((1e9,) * 3)
    box_max = mathutils.Vector((-1e9,) * 3)
    for o in objs:
        for corner in o.bound_box:
            v = o.matrix_world @ mathutils.Vector(corner)
            box_min = mathutils.Vector(map(min, box_min, v))
            box_max = mathutils.Vector(map(max, box_max, v))
    center = (box_min + box_max) / 2
    span = max(box_max - box_min)
    cam_data = bpy.data.cameras.new(name)
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = span * 1.15
    cam = bpy.data.objects.new(name, cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = center + mathutils.Vector((-0.9, -2.4, 0.55)) * (span / 1.2)
    direcao = (center - cam.location).normalized()
    cam.rotation_euler = direcao.to_track_quat('-Z', 'Z').to_euler()
    return cam


def dump_blend(familia, pack):
    out = os.path.join(OUT, familia)
    os.makedirs(out, exist_ok=True)
    blend = os.path.join(pack, f'{familia}.blend')
    reset_empty()
    bpy.ops.wm.open_mainfile(filepath=blend)
    report = {'familia': familia, 'blend': blend, 'objetos': [], 'armatures': {}, 'acoes': [], 'materiais': []}
    for o in bpy.data.objects:
        report['objetos'].append({'nome': o.name, 'tipo': o.type, 'pai': o.parent.name if o.parent else None})
        if o.type == 'ARMATURE':
            bones = [{'nome': b.name, 'pai': b.parent.name if b.parent else None,
                      'tail': [round(c, 4) for c in b.tail_local], 'head': [round(c, 4) for c in b.head_local]}
                     for b in o.data.bones]
            report['armatures'][o.name] = bones
    for a in bpy.data.actions:
        report['acoes'].append({'nome': a.name, 'frames': round(a.frame_range[1] - a.frame_range[0], 2)})
    for m in bpy.data.materials:
        if m.users:
            report['materiais'].append(m.name)
    cam = camera_fit(None, (1440, 960))
    render(os.path.join(out, f'{familia}-idle-blend.png'), cam, (1440, 960))
    with open(os.path.join(out, 'blend.json'), 'w') as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    print('DMR_DONOR_BLEND', familia, 'objetos', len(report['objetos']), 'acoes', [a['nome'] for a in report['acoes']])


def dump_clips(familia, pack):
    out = os.path.join(OUT, familia)
    os.makedirs(out, exist_ok=True)
    raw = os.path.join(pack, 'raw-clips')
    inventario = []
    for fname in sorted(os.listdir(raw)):
        if not fname.endswith('.glb'):
            continue
        reset_empty()
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(raw, fname))
        novos = [o for o in bpy.data.objects if o not in before]
        nomes_tracks = []
        for act in bpy.data.actions:
            fcurves = list(act.fcurves) if hasattr(act, 'fcurves') and act.fcurves else []
            if not fcurves:
                for layer in getattr(act, 'layers', []):
                    for strip in getattr(layer, 'strips', []):
                        bags = strip.channelbags
                        bags = bags() if callable(bags) else bags
                        for bag in bags:
                            fcurves.extend(bag.fcurves)
            tracks = sorted({tc.data_path.split('"')[1] if '"' in tc.data_path else tc.data_path
                             for tc in fcurves})
            nomes_tracks.append({'acao': act.name,
                                 'dur_s': round((act.frame_range[1] - act.frame_range[0]) / 30.0, 4),
                                 'alvo': sorted(tracks)[:80]})
        inventario.append({'clip': fname, 'objetos': [o.name for o in novos], 'acoes': nomes_tracks})
        print('DMR_DONOR_CLIP', familia, fname, [a['acao'] for a in nomes_tracks])
    with open(os.path.join(out, 'raw-clips.json'), 'w') as fh:
        json.dump(inventario, fh, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    alvo = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else ''
    for familia, pack in PACKS.items():
        if alvo and familia != alvo:
            continue
        dump_blend(familia, pack)
        dump_clips(familia, pack)
