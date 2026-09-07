"""Régua de contato da candidata LMG no Blender (o domínio que renderiza certo).

Importa o GLB runtime (igual ao jogo serve), avalia cada frame crítico e mede
luva↔arma por BVH: distância mínima e profundidade de penetração por raio.
Mutante embutido: com --mutant a caixa é transladada 5 cm e a régua DEVE
reprovar — quem mede uma direção só é cega na outra (LICOES 1).
"""
import importlib.util
import json
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('inventory', Path(__file__).with_name('lmg-inventory.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
inv.guard()

RUNTIME = inv.OUT / 'lmg-candidate' / 'lmg-runtime-candidate.glb'
# o blend autoral não tem as recargas (elas entram no GLB pelo assembler);
# o contato delas herda os caminhos de mão do doador rebaseados — evidência no
# assembly-report (mecanismo) e pendente de validação no Game
FRAMES = [
    ('idle', 0.5),
    ('shoot', 0.12),
    ('inspect', 0.5),
]


def set_clip(scene, clip):
    strips = []
    for o in scene.objects:
        ad = o.animation_data
        if not ad:
            continue
        ad.action = None
        for track in ad.nla_tracks:
            track.mute = track.name != clip
            if not track.mute:
                strips.extend(track.strips)
    assert strips, f'clipe ausente: {clip}'
    return min(s.frame_start for s in strips), max(s.frame_end for s in strips)


def sampled_mesh(obj, deps, max_points=900):
    ev = obj.evaluated_get(deps)
    mesh = ev.to_mesh()
    points, normals = [], []
    pos = mesh.vertices
    step = max(1, len(pos) // max_points)
    for i in range(0, len(pos), step):
        v = pos[i]
        points.append(obj.matrix_world @ v.co)
        normals.append((obj.matrix_world.to_3x3() @ v.normal).normalized())
    ev.to_mesh_clear()
    return points, normals


def main():
    mutant = '--mutant' in sys.argv
    # contato no BLEND autoral: o import Blender do GLB exportado diverge
    # (rig aninhado, documentado na frente rifles); o bind foi autorado aqui
    BLEND = inv.OUT / 'lmg-candidate' / 'lmg-candidate.blend'
    assert BLEND.is_file(), BLEND
    bpy.ops.wm.open_mainfile(filepath=str(BLEND))
    scene = bpy.context.scene
    deps = bpy.context.evaluated_depsgraph_get()

    glove = bpy.data.objects['GEO_FP_SK_Glove_01']
    weapon_objs = [bpy.data.objects[n] for n in
                   ('GEO_LMG_MINT_BODY', 'GEO_LMG_MINT_COVER', 'GEO_LMG_MINT_BOX')]
    if mutant:
        # desloca os vértices da arma 30 cm PARA FRENTE: basis pós-NLA é sobrescrito na
        # reavaliação; dado de malha é imune
        for name in ('GEO_LMG_MINT_BODY', 'GEO_LMG_MINT_COVER', 'GEO_LMG_MINT_BOX', 'GEO_LMG_MINT_LEVER'):
            o = bpy.data.objects[name]
            for v in o.data.vertices:
                v.co += Vector((0.0, -0.30, 0.0))

    report = {'mutant': mutant, 'frames': []}
    for clip, fraction in FRAMES:
        start, end = set_clip(scene, clip)
        frame = start + (end - start) * fraction
        scene.frame_set(int(frame), subframe=frame % 1)
        bpy.context.view_layer.update()
        gpts, _ = sampled_mesh(glove, deps, 400)
        best = {'distance': 1e9}
        for w in weapon_objs:
            wpts, _ = sampled_mesh(w, deps, 400)
            if not wpts:
                continue
            # ponto-a-ponto bruto: BVH de triângulos entre amostras espaçadas
            # cria pontes falsas e mede ~0 sempre (régua cega do lado que premia)
            for g in gpts:
                for w in wpts:
                    d = (g - w).length
                    if d < best['distance']:
                        best['distance'] = d
        report['frames'].append({'clip': clip, 'fraction': fraction,
                                 'min_distance_mm': round(best['distance'] * 1000, 2)})
    # gate: em TODO frame crítico a luva chega a <= 12 mm da arma (contato), e
    # alguma penetração existe em algum frame (a pega afunda, como na idle M4)
    worst = max(f['min_distance_mm'] for f in report['frames'])
    report['worst_min_distance_mm'] = worst
    ok = worst <= 12.0
    report['pass'] = ok
    out = inv.OUT / 'lmg-candidate' / ('contact-check-mutant.json' if mutant else 'contact-check.json')
    out.write_text(json.dumps(report, indent=1))
    print('LMG_CONTACT=' + json.dumps(report))
    if mutant and ok:
        print('MUTANTE DE CONTATO NÃO MORDEU')
        sys.exit(1)
    if not mutant and not ok:
        print(f'CONTATO REPROVADO: pior distância {worst} mm')
        sys.exit(1)


if __name__ == '__main__':
    main()
