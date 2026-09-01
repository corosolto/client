"""Converte um clipe de ARMA do pack (FBX) em GLB de animação via Blender.

Por que existe: o assemble convertia FBX→GLB com Assimp, e o Assimp monta o
frame local dos bones de arma com outra convenção — o delta do bone Mag saía
girado (pente voando a 1 m da mão na recarga, medido em 29/08). O rig ALVO do
GLB da família nasce do import FBX do Blender (build_paid_family), então
converter o clipe com o MESMO importador garante rest e eixos idênticos e o
rebase do assemble vira identidade.

Uso: Blender -b --python convert_weapon_clip_fbx.py -- entrada.fbx saida.glb
"""
import sys

import bpy

entrada, saida = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=entrada)
scene = bpy.context.scene
scene.render.fps = 60
scene.render.fps_base = 1
# A skin precisa existir durante o export: sem ela o glTF serializa os bones
# como nós genéricos e muda a base local dos pivôs de arma.
bpy.ops.export_scene.gltf(
    filepath=saida,
    export_format="GLB",
    export_animations=True,
    export_force_sampling=True,
    export_def_bones=False,
    export_materials="NONE",
)
print(f"CORO_WEAPON_CLIP_GLB={saida}")
