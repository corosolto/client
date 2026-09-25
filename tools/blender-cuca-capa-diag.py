"""Onde ficam os vértices que os OMBROS carregam na Cuca — diagnóstico, não conserto.

A régua `select-inflate.mjs --diagnose` acusou, na Cuca regerada:
    LeftShoulder=224 arestas ruins (o osso gira só 16,3°)
    RightShoulder=97 (gira 11,5°)
Os dois somam 321 dos 341 pontos. Osso que gira 16° e rasga 224 arestas está
carregando superfície que não devia estar pendurada nele — a hipótese é a CAPA.

Este script não muda nada. Ele mede, para cada osso, quantos vértices o osso
domina e qual a caixa que eles ocupam, para a hipótese ser confirmada ou
REFUTADA antes de alguém mexer na malha. Se a nuvem dominada pelos ombros for
um plano fino ATRÁS do torso, é capa. Se estiver em volta do braço, é ombro
mesmo e a hipótese morre.

Uso:
  blender --background --python tools/blender-cuca-capa-diag.py -- in.glb out.json
"""
import json
import sys

import bpy

argv = sys.argv[sys.argv.index('--') + 1:]
ENTRADA, SAIDA = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ENTRADA)

malha = next(o for o in bpy.data.objects if o.type == 'MESH')
grupos = {g.index: g.name for g in malha.vertex_groups}

# Para cada vértice, o osso de MAIOR peso é quem o "domina" — é a mesma
# convenção que a select-inflate usa para atribuir aresta rasgada a um osso.
dominio = {}
for v in malha.data.vertices:
    if not v.groups:
        continue
    g = max(v.groups, key=lambda x: x.weight)
    nome = grupos.get(g.group)
    if nome is None:
        continue
    co = malha.matrix_world @ v.co
    dominio.setdefault(nome, []).append((co.x, co.y, co.z, g.weight))

saida = []
for nome, pts in sorted(dominio.items(), key=lambda kv: -len(kv[1])):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    zs = [p[2] for p in pts]
    span = (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))
    # "achatamento": o menor eixo dividido pelo maior. Perto de 0 = chapa fina,
    # que é a assinatura de pano. Perto de 1 = volume, que é membro.
    menor, maior = min(span), max(span)
    saida.append({
        'osso': nome,
        'vertices': len(pts),
        'span': [round(s, 3) for s in span],
        'achatamento': round(menor / maior, 3) if maior else 0.0,
        'centro': [round(sum(a) / len(a), 3) for a in (xs, ys, zs)],
        'pesoMedio': round(sum(p[3] for p in pts) / len(pts), 3),
    })

with open(SAIDA, 'w', encoding='utf-8') as f:
    json.dump({'fonte': ENTRADA, 'ossos': saida}, f, ensure_ascii=False, indent=1)
print('DIAG_JSON=' + SAIDA)
