"""Fábrica — clipe de ARMA do pack (FBX) → GLB de animação, no fps DO ARQUIVO.

O convert_weapon_clip_fbx.py antigo forçava 60 fps depois do import: os FBX de
arma do pack a 30 fps (KXG12, MX16A4) saíam com metade da duração, e o montador
esticava o clipe para caber no do braço. O Unity toca os dois animadores em
velocidade 1, cada um no seu tempo — é o tempo autorado que vale aqui.

Uso: Blender -b --python clipe_arma.py -- entrada.fbx saida.glb
"""
import sys

import bpy

entrada, saida = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=entrada)
fps = bpy.context.scene.render.fps / bpy.context.scene.render.fps_base
bpy.ops.export_scene.gltf(
    filepath=saida,
    export_format="GLB",
    export_animations=True,
    export_force_sampling=True,
    export_def_bones=False,
    export_materials="NONE",
)
print(f"FABRICA_CLIPE_ARMA={saida} fps={fps}")
