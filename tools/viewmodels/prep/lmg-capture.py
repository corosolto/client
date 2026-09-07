"""Capturas da candidata LMG a partir do GLB RUNTIME (o arquivo que o jogo serve).

Importa lmg-runtime-candidate.glb, fotografa pela VIEWMODEL_CAMERA em 1152x768
(3:2) e 1024x576 (16:9) nos frames críticos: idle, pico do shoot, meio do
inspect e as frações 18/50/86% das recargas (alimentação: tampa/caixa/cinto).
O import é do próprio export (estrutura socket→rig como a família serve), não
do blend — prova de round-trip visual do arquivo final.
"""
import importlib.util
import json
import sys
from pathlib import Path

import bpy

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('inventory', Path(__file__).with_name('lmg-inventory.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
inv.guard()

RUNTIME = inv.OUT / 'lmg-candidate' / 'lmg-runtime-candidate.glb'
OUTDIR = inv.OUT / 'lmg-candidate' / 'evidence-runtime'
FRAMES = [
    ('idle', 0.5),
    ('shoot', 0.12),
    ('inspect', 0.5),
    ('reload_tactical', 0.18),
    ('reload_tactical', 0.5),
    ('reload_tactical', 0.86),
    ('reload_empty', 0.18),
    ('reload_empty', 0.5),
    ('reload_empty', 0.86),
]


def main():
    assert RUNTIME.is_file(), RUNTIME
    OUTDIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(RUNTIME))
    scene = bpy.context.scene
    camera = bpy.data.objects.get('VIEWMODEL_CAMERA')
    assert camera is not None, 'câmera ausente no GLB runtime'
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.show_shadows = False
    scene.display.shading.show_cavity = True
    report = {'frames': []}
    import math
    for clip, fraction in FRAMES:
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
        if not strips:
            print(f'CLIP AUSENTE: {clip}')
            continue
        start = min(s.frame_start for s in strips)
        end = max(s.frame_end for s in strips)
        frame = start + (end - start) * fraction
        scene.frame_set(int(frame), subframe=frame % 1)
        bpy.context.view_layer.update()
        tag = f'{clip}-f{int(round(fraction * 100)):03d}'
        for suffix, w, h in (('-32', 1152, 768), ('-169', 1024, 576)):
            scene.render.resolution_x = w
            scene.render.resolution_y = h
            scene.render.resolution_percentage = 100
            scene.render.image_settings.file_format = 'PNG'
            scene.render.filepath = str(OUTDIR / f'{tag}{suffix}.png')
            scene.camera = camera
            bpy.ops.render.render(write_still=True)
        report['frames'].append({'clip': clip, 'fraction': fraction, 'tag': tag,
                                 'range': [start, end]})
    (OUTDIR / 'capture-report.json').write_text(json.dumps(report, indent=1))
    print('LMG_CAPTURE_DONE', json.dumps(report))


if __name__ == '__main__':
    main()
