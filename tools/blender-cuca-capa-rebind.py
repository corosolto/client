"""A capa da Cuca sai do ombro e passa a seguir a COLUNA.

O DEFEITO, medido antes (tools/blender-cuca-capa-diag.py + select-inflate --diagnose):
    LeftShoulder domina 1.232 vértices com span de 1,48 em Z — a personagem inteira
    tem 1,577 de altura. Um osso de ombro carregando do ombro ao tornozelo não é
    ombro: é a CAPA, colada nele pelo auto-skin. O ombro gira só 16,3° e mesmo assim
    rasga 224 arestas, contra 97 do ombro direito, que é compacto (span 0,79, centro
    na altura do ombro) e portanto é ombro de verdade.
    A capa vale ~321 dos 341 pontos da Cuca.

POR QUE REBIND E NÃO APAGAR: a capa é parte da identidade da Cuca canônica (vestido
bordô + capa verde). Apagar resolve a régua e perde o personagem. E ela NÃO é ilha
solta — está fundida no corpo (tools/blender-loose-parts.py: componente 0 com 5.198
vértices), então também não dá para separar por topologia.

O CONSERTO segue o precedente do repo — `blender-programador-prop-sockets.py` tirou a
caneca do peito e a prendeu no quadril com peso rígido. Aqui, os vértices de capa
abaixo da linha do ombro deixam de seguir o ombro e passam a seguir a cadeia da
coluna, com o peso distribuído por ALTURA: perto do ombro ainda acompanha Spine02,
mais embaixo acompanha Spine e depois Hips. Assim o pano balança com o torso em vez
de ser estilhaçado por cada rotação de braço.

LIMITE DECLARADO: isto não é simulação de pano. A capa vai seguir o tronco como uma
peça rígida. Num rig de 24 ossos sem física, é o melhor que existe — e a lição geral,
que vale para o elenco todo, é que capa e saia rodada são caras neste motor.

Uso:
  blender --background --python tools/blender-cuca-capa-rebind.py -- in.glb out.glb relatorio.json
"""
import json
import sys

import bpy

argv = sys.argv[sys.argv.index('--') + 1:]
ENTRADA, SAIDA, RELATORIO = argv[0], argv[1], argv[2]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ENTRADA)

malha = next(o for o in bpy.data.objects if o.type == 'MESH')
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')

# A linha de corte é a altura REAL do osso de ombro, lida do esqueleto — não um
# número escolhido a dedo. Vértice de ombro fica em volta dela; capa fica abaixo.
def altura_osso(nome):
    b = arm.pose.bones.get(nome) or arm.data.bones.get(nome)
    if b is None:
        return None
    m = arm.matrix_world @ (b.matrix if hasattr(b, 'matrix') else b.matrix_local)
    return m.translation.z

Z_OMBRO = max(filter(None, [altura_osso('LeftShoulder'), altura_osso('RightShoulder')]))
Z_HIPS = altura_osso('Hips') or 0.0
# margem: 8 cm abaixo do ombro ainda é ombro/manga, não capa.
Z_CORTE = Z_OMBRO - 0.08

idx = {g.name: g.index for g in malha.vertex_groups}
for alvo in ('Spine02', 'Spine', 'Hips'):
    if alvo not in idx:
        raise SystemExit(f'osso de destino ausente: {alvo}')

OMBROS = [n for n in ('LeftShoulder', 'RightShoulder') if n in idx]
movidos, total_peso = 0, 0.0

for v in malha.data.vertices:
    co = malha.matrix_world @ v.co
    if co.z >= Z_CORTE:
        continue                                   # altura de ombro: não mexe
    peso_ombro = sum(g.weight for g in v.groups if g.group in (idx[n] for n in OMBROS))
    if peso_ombro <= 0.001:
        continue                                   # não é carregado pelo ombro
    # t = 0 na altura do quadril, 1 na altura do ombro. Distribui pela cadeia.
    t = max(0.0, min(1.0, (co.z - Z_HIPS) / max(1e-6, Z_CORTE - Z_HIPS)))
    destino = {'Spine02': t * t, 'Spine': 2 * t * (1 - t), 'Hips': (1 - t) * (1 - t)}
    soma = sum(destino.values()) or 1.0
    for nome in OMBROS:
        malha.vertex_groups[nome].remove([v.index])
    for nome, w in destino.items():
        malha.vertex_groups[nome].add([v.index], peso_ombro * w / soma, 'ADD')
    movidos += 1
    total_peso += peso_ombro

bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(filepath=SAIDA, export_format='GLB', export_yup=True)

with open(RELATORIO, 'w', encoding='utf-8') as f:
    json.dump({
        'entrada': ENTRADA, 'saida': SAIDA,
        'zOmbro': round(Z_OMBRO, 4), 'zHips': round(Z_HIPS, 4), 'zCorte': round(Z_CORTE, 4),
        'verticesMovidos': movidos, 'pesoTransferido': round(total_peso, 2),
    }, f, ensure_ascii=False, indent=1)
print(f'REBIND movidos={movidos} zCorte={Z_CORTE:.3f}')
