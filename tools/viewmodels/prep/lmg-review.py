"""Renderiza evidência da candidata LMG a partir do .blend (import de GLB aninhado diverge).

Câmera do jogo (VIEWMODEL_CAMERA, VFOV 80) em 1152x768 (3:2) e 1024x576 (16:9),
mais vistas ortográficas de diagnóstico. Frames por clipe NLA.
Saída: artifacts/viewmodels/prep/lmg/<pasta>/evidence/.
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

CAND = inv.OUT / 'lmg-candidate'


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


def render(scene, out, w, h, camera):
    scene.render.resolution_x = w
    scene.render.resolution_y = h
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(out)
    scene.camera = camera
    bpy.ops.render.render(write_still=True)


def ortho_photo(scene, out, objects, direction, span_pad=2.24):
    from mathutils import Vector
    pts = []
    for o in objects:
        ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = ev.to_mesh()
        pts.extend(ev.matrix_world @ v.co for v in mesh.vertices)
        ev.to_mesh_clear()
    center = Vector([sum(p[i] for p in pts) / len(pts) for i in range(3)])
    span = max(max(p[i] for p in pts) - min(p[i] for p in pts) for i in range(3))
    camdata = bpy.data.cameras.new('ORTHO_TMP')
    cam = bpy.data.objects.new('ORTHO_TMP', camdata)
    scene.collection.objects.link(cam)
    cam.location = center + direction.normalized() * span * 3
    cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()
    camdata.type = 'ORTHO'
    camdata.ortho_scale = span_pad * span
    camdata.clip_end = span * 10
    camdata.clip_start = .001
    render(scene, out, 900, 600, cam)
    bpy.data.objects.remove(cam, do_unlink=True)
    bpy.data.cameras.remove(camdata)


def main():
    blend = CAND / 'lmg-candidate.blend'
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    scene = bpy.context.scene
    camera = bpy.data.objects['VIEWMODEL_CAMERA']
    meshes = [o for o in scene.objects if o.type == 'MESH']
    ev_dir = CAND / 'evidence'
    ev_dir.mkdir(parents=True, exist_ok=True)
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.show_shadows = False
    scene.display.shading.show_cavity = True
    report = {'frames': {}}
    for clip in ('idle', 'shoot', 'inspect'):
        start, end = set_clip(clip)
        report['frames'][clip] = [start, end]
        for fraction in (0, .25, .5, .75, 1):
            frame = start + (end - start) * fraction
            scene.frame_set(int(frame), subframe=frame % 1)
            bpy.context.view_layer.update()
            tag = f'{clip}-f{int(round(fraction * 100)):03d}'
            render(scene, ev_dir / f'{tag}-32.png', 1152, 768, camera)
            render(scene, ev_dir / f'{tag}-169.png', 1024, 576, camera)
    # vistas de diagnóstico do conjunto (lado e topo) em idle
    set_clip('idle')
    scene.frame_set(1)
    bpy.context.view_layer.update()
    from mathutils import Vector
    ortho_photo(scene, ev_dir / 'diag-side.png', meshes, Vector((0, -1, .15)))
    ortho_photo(scene, ev_dir / 'diag-top.png', meshes, Vector((0, 0, 1)))
    ortho_photo(scene, ev_dir / 'diag-front.png', meshes, Vector((1, 0, .15)))
    (CAND / 'review-report.json').write_text(json.dumps(report, indent=1))
    print('LMG_REVIEW_DONE', json.dumps(report))


if __name__ == '__main__':
    main()
