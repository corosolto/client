#!/usr/bin/env python3
"""Inspeção offline dos mecanismos Rem700 e G3SG1 (lane vm-dmr-final).

Importa cada GLB Mint separadamente, normaliza pelas unidades do jogo
(yaw + len do CFG histórico pré-corte 84f691d1^), mede malhas/materiais e
renderiza vistas ortográficas + close do receiver para leitura do mecanismo
(ferrolho/alimentação no Rem700; carregador/ação no G3SG1).

Entrada:  public/models/weapons/{rem700,g3sg1}.glb (worktree, somente leitura)
Saída:    artifacts/viewmodels/dmr/inspect/{arma}/  (JSON + PNG)
Não salva .blend, não altera fontes.
"""
import json
import math
import os
import sys

import bpy
import mathutils

CWD = os.path.abspath(os.path.dirname(__file__) + '/../../..')
OUT = os.path.join(CWD, 'artifacts', 'viewmodels', 'dmr', 'inspect')

# CFG histórico (weapons.js@84f691d1^): len em metros, yaw para cano +Z.
ARMAS = {
    'rem700': {'len': 1.15, 'yaw': 270, 'gripZ': 0.66},
    'g3sg1':  {'len': 1.12, 'yaw': 270, 'gripZ': 0.58},
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def world_verts(obj):
    mesh = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
    verts = []
    if mesh.vertices:
        mat = obj.matrix_world
        verts = [(mat @ v.co.copy()) for v in mesh.vertices]
    obj.to_mesh_clear()
    return verts


def render(path, camera, resolution, shading='SOLID'):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'FLAT'
    scene.display.shading.show_object_outline = False
    scene.display.shading.show_cavity = True
    scene.render.filepath = path
    scene.render.resolution_x = resolution[0]
    scene.render.resolution_y = resolution[1]
    scene.camera = camera
    display = bpy.context.preferences.view.render_display_type
    bpy.context.preferences.view.render_display_type = 'NONE'
    try:
        bpy.ops.render.render(write_still=True)
    finally:
        bpy.context.preferences.view.render_display_type = display


def ortho_cam(name, direction, dist, collection):
    cam_data = bpy.data.cameras.new(name)
    cam_data.type = 'ORTHO'
    cam = bpy.data.objects.new(name, cam_data)
    collection.objects.link(cam)
    cam.location = direction.normalized() * dist
    # A câmera olha -Z local: aponta o eixo +Z local de volta à origem.
    pointing = direction.normalized()
    up = 'Z' if abs(pointing.z) < 0.9 else 'Y'
    cam.rotation_euler = pointing.to_track_quat('-Z', up).to_euler()
    return cam


def fit_ortho(cam, span, pad=1.06):
    cam.data.ortho_scale = span * pad


def inspect(arma, cfg):
    out = os.path.join(OUT, arma)
    os.makedirs(out, exist_ok=True)
    src = os.path.join(CWD, 'public', 'models', 'weapons', f'{arma}.glb')
    reset()
    objs = import_glb(src)
    col = bpy.data.collections.new('dmr')
    bpy.context.scene.collection.children.link(col)
    for o in objs:
        for c in o.users_collection:
            c.objects.unlink(o)
        col.objects.link(o)

    meshes = [o for o in objs if o.type == 'MESH']
    report = {'arma': arma, 'glb': src, 'yaw_graus': cfg['yaw'], 'len_m': cfg['len'],
              'meshes': [], 'materiais': [], 'imagens': []}
    for o in meshes:
        vs = world_verts(o)
        if not vs:
            continue
        xs = [v.x for v in vs]; ys = [v.y for v in vs]; zs = [v.z for v in vs]
        report['meshes'].append({
            'nome': o.name, 'vertices': len(vs),
            'bbox_local': {'min': [min(xs), min(ys), min(zs)], 'max': [max(xs), max(ys), max(zs)]},
        })
    for m in bpy.data.materials:
        if m.users:
            report['materiais'].append(m.name)
    for img in bpy.data.images:
        if img.users and img.filepath:
            report['imagens'].append(os.path.basename(img.filepath))

    # Normaliza como o jogo: maior eixo bruto -> len metros, depois yaw p/ cano +Z.
    allv = [v for o in meshes for v in world_verts(o)]
    xs = [v.x for v in allv]; ys = [v.y for v in allv]; zs = [v.z for v in allv]
    raw_min = mathutils.Vector((min(xs), min(ys), min(zs)))
    raw_max = mathutils.Vector((max(xs), max(ys), max(zs)))
    raw_size = raw_max - raw_min
    scale = cfg['len'] / max(raw_size)
    center = (raw_min + raw_max) / 2
    for o in objs:
        o.matrix_world = (mathutils.Matrix.Translation(-center) @
                          mathutils.Matrix.Diagonal((scale, scale, scale, 1.0)).to_4x4() @ o.matrix_world)
        bpy.context.view_layer.update()

    allv = [v for o in meshes for v in world_verts(o)]
    xs = [v.x for v in allv]; ys = [v.y for v in allv]; zs = [v.z for v in allv]
    size = (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))
    report['dims_normalizadas'] = {
        'x_largura_m': round(size[0], 5), 'y_altura_m': round(size[1], 5), 'z_comprimento_m': round(size[2], 5),
        'bbox_min': [round(min(xs), 5), round(min(ys), 5), round(min(zs), 5)],
        'bbox_max': [round(max(xs), 5), round(max(ys), 5), round(max(zs), 5)],
    }
    # Boca candidata: centroide dos 2% vértices mais avançados em +Z (contrato G3-R1).
    por_z = sorted(allv, key=lambda v: v.z)[-max(4, len(allv) // 50):]
    muzzle = mathutils.Vector((
        sum(v.x for v in por_z) / len(por_z), sum(v.y for v in por_z) / len(por_z), por_z[-1].z))
    report['boca_candidata_m'] = [round(c, 5) for c in muzzle]
    # Alça candidata: topo do receiver na metade da frente (contrato G3-R1).
    frente = [v for v in allv if v.z > min(zs) + size[2] * 0.5]
    if frente:
        topo = max(frente, key=lambda v: v.y)
        report['topo_receiver_m'] = [round(topo.x, 5), round(topo.y, 5), round(topo.z, 5)]

    # Vistas ortográficas: laterais (Y), topo (Z). Construção idêntica à dos closes.
    span = max(size)
    vistas = {
        'lado-direito': mathutils.Vector((0, -3, 0)),
        'lado-esquerdo': mathutils.Vector((0, 3, 0)),
        'topo': mathutils.Vector((0, 0, 3)),
    }
    for nome, pos in vistas.items():
        cam_data = bpy.data.cameras.new(f'cam_{nome}')
        cam_data.type = 'ORTHO'
        cam_data.ortho_scale = span * 1.06
        cam = bpy.data.objects.new(f'cam_{nome}', cam_data)
        col.objects.link(cam)
        cam.location = pos
        direcao = (-pos).normalized()
        up = 'Y' if abs(direcao.z) > 0.9 else 'Z'
        cam.rotation_euler = direcao.to_track_quat('-Z', up).to_euler()
        render(os.path.join(out, f'{arma}-{nome}.png'), cam, (1440, 960))

    # Close do receiver (metade traseira do cano + ação) em ambos os lados.
    centro_receiver = mathutils.Vector((0, 0, min(zs) + size[2] * 0.55))
    for lado, sinal in (('direito', -1), ('esquerdo', 1)):
        cam_data = bpy.data.cameras.new(f'cam_close_{lado}')
        cam_data.type = 'ORTHO'
        cam_data.ortho_scale = 0.34
        cam = bpy.data.objects.new(f'cam_close_{lado}', cam_data)
        col.objects.link(cam)
        cam.location = centro_receiver + mathutils.Vector((0, 0.62 * sinal, 0.06))
        direcao = (centro_receiver - cam.location).normalized()
        cam.rotation_euler = direcao.to_track_quat('-Z', 'Z').to_euler()
        render(os.path.join(out, f'{arma}-receiver-{lado}.png'), cam, (1440, 960))

    with open(os.path.join(out, 'inspecao.json'), 'w') as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    print('DMR_INSPECAO', arma, json.dumps(report['dims_normalizadas'], ensure_ascii=False))


if __name__ == '__main__':
    alvo = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else ''
    for arma, cfg in ARMAS.items():
        if alvo and arma != alvo:
            continue
        inspect(arma, cfg)
