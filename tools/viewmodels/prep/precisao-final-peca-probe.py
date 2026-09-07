"""Sonda visual de peças: destaca regiões candidatas via vertex color e renda vistas.

Uso (Blender headless):
  Blender --background --factory-startup --python-exit-code 1 \
    --python tools/viewmodels/prep/precisao-final-peca-probe.py -- --arma mosin
Saída em artifacts/viewmodels/prep/precisao/final/peca-probe-<arma>/{lateral,topo,frente,persp}.png + probe.json
"""
import bpy
import json
import math
import sys
from pathlib import Path

RAIZ = Path('/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-precisao')
A = RAIZ / 'artifacts/viewmodels/prep/precisao/final'

CAIXAS = {
    'mosin': {
        'bolt_handle': dict(x=[-0.199, -0.040], y=[-0.05, 0.08], z=[0.004, 0.10]),
    },
    'svd': {
        'mag': dict(x=[-0.150, -0.041], y=[-0.115, -0.040], z=[-0.06, 0.06]),
        'bolt_handle': dict(x=[-0.101, -0.001], y=[-0.03, 0.07], z=[0.010, 0.08]),
    },
    'sks': {
        'bolt_handle': dict(x=[-0.081, 0.059], y=[-0.05, 0.07], z=[0.006, 0.08]),
    },
}

CORES = {
    'bolt_handle': (0.95, 0.10, 0.40, 1.0),
    'mag': (0.95, 0.10, 0.40, 1.0),
}
COR_CORPO = (0.45, 0.55, 0.60, 1.0)


def main():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    arma = args[args.index('--arma') + 1] if '--arma' in args else 'mosin'
    caixas = CAIXAS[arma]

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(RAIZ / f'public/models/weapons/{arma}.glb'))
    obj = next(o for o in bpy.data.objects if o.type == 'MESH')
    me = obj.data
    me.vertex_colors.new(name='probe')
    vcol = me.vertex_colors['probe'].data
    # polígonos → loop indices; cor por vértice
    dentro = [False] * len(me.vertices)
    por_caixa = {n: 0 for n in caixas}
    # Blender importa glTF Y-up como Z-up: gltf(x,y,z) == blender(x,z,y)
    def caixa_contem(cx, p_b):
        gx, gy, gz = p_b.x, p_b.z, p_b.y
        return (cx['x'][0] <= gx <= cx['x'][1] and cx['y'][0] <= gy <= cx['y'][1]
                and cx['z'][0] <= gz <= cx['z'][1])
    for i, v in enumerate(me.vertices):
        for nome, cx in caixas.items():
            if caixa_contem(cx, v.co):
                dentro[i] = True
                por_caixa[nome] += 1
                break
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index
            hit = None
            p = me.vertices[vi].co
            for nome, cx in caixas.items():
                if caixa_contem(cx, p):
                    hit = nome
                    break
            vcol[li].color = CORES.get(hit, COR_CORPO) if hit else COR_CORPO

    mat = bpy.data.materials.new('probe')
    mat.use_nodes = True
    obj.data.materials.clear()
    obj.data.materials.append(mat)

    import mathutils
    todos = [obj]
    dim = max((o.dimensions.length for o in todos), default=1)
    saida = A / f'peca-probe-{arma}'
    saida.mkdir(parents=True, exist_ok=True)
    vistas = {
        'lateral': ((math.radians(-90), 0, 0), (0, dim * 1.7, 0)),
        'topo': ((0, 0, math.radians(180)), (0, 0, dim * 1.7)),
        'frente': ((math.radians(90), 0, math.radians(90)), (-dim * 1.7, 0, 0)),
        'persp': ((math.radians(70), 0, math.radians(40)), (-dim, -dim, dim * 0.7)),
    }
    for nome_v, (rot, pos) in vistas.items():
        cam_data = bpy.data.cameras.new('cam')
        cam_data.type = 'ORTHO' if nome_v != 'persp' else 'PERSP'
        cam_data.ortho_scale = dim * 1.3
        cam = bpy.data.objects.new(f'cam_{nome_v}', cam_data)
        cam.rotation_euler = rot
        cam.location = pos
        bpy.context.collection.objects.link(cam)
        bpy.context.scene.camera = cam
        sc = bpy.context.scene
        sc.render.engine = 'BLENDER_WORKBENCH'
        sc.display.shading.light = 'FLAT'
        try:
            sc.display.shading.color_type = 'VERTEX'
        except TypeError:
            sc.display.shading.color_type = 'ATTRIBUTE'
        sc.display.shading.show_object_outline = True
        sc.render.resolution_x = 900
        sc.render.resolution_y = 600
        sc.render.filepath = str(saida / f'{nome_v}.png')
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(cam, do_unlink=True)

    (saida / 'probe.json').write_text(json.dumps(
        {'caixas': caixas, 'verts_dentro': por_caixa}, indent=2) + '\n')
    print(json.dumps({'caixas': caixas, 'verts_dentro': por_caixa}, indent=2))


main()
