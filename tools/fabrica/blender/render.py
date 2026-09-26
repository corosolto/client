"""Fábrica — render de QA pela CÂMERA DE AUTORIA (a do GLB), como o jogador vê.

Uso: Blender -b --python tools/fabrica/blender/render.py -- --glb=<produto.glb> --saida=<dir>
       [--clipes=idle,reload_tactical] [--tempos=0,0.25,0.5,0.75,0.999]
       [--largura=1440 --altura=960] [--fov=<vfov em 16:9>]

A lente do GLB é gravada em 16:9; em outro aspecto a meia-tangente HORIZONTAL
fica constante (mesma regra do AuthoredViewModels.fov no runtime).
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy


def args_():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--glb", required=True, type=Path)
    p.add_argument("--saida", required=True, type=Path)
    p.add_argument("--clipes", default="")
    p.add_argument("--tempos", default="0,0.25,0.5,0.75,0.999")
    p.add_argument("--largura", type=int, default=1440)
    p.add_argument("--altura", type=int, default=960)
    p.add_argument("--fov", type=float, default=0.0)
    return p.parse_args(argv)


def main():
    a = args_()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(a.glb))
    cena = bpy.context.scene
    cam = next((o for o in bpy.data.objects if o.type == "CAMERA"), None)
    if cam is None:
        raise SystemExit("GLB sem câmera de autoria")
    cena.camera = cam
    ref = 16 / 9
    vfov16 = math.radians(a.fov) if a.fov > 0 else cam.data.angle_y if cam.data.sensor_fit == "VERTICAL" else cam.data.angle
    meia_h = math.atan(math.tan(vfov16 / 2) * ref)
    aspecto = a.largura / a.altura
    vfov = 2 * math.atan(math.tan(meia_h) / aspecto)
    cam.data.sensor_fit = "VERTICAL"
    cam.data.angle_y = vfov
    cam.data.clip_start = 0.01

    mundo = bpy.data.worlds.new("QA")
    mundo.use_nodes = True
    mundo.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.6, 0.66, 1)
    mundo.node_tree.nodes["Background"].inputs[1].default_value = 0.9
    cena.world = mundo
    sol = bpy.data.objects.new("QA_SOL", bpy.data.lights.new("QA_SOL", type="SUN"))
    sol.data.energy = 3.0
    sol.rotation_euler = (math.radians(50), math.radians(10), math.radians(30))
    cena.collection.objects.link(sol)
    cena.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items} else "BLENDER_EEVEE"
    cena.render.resolution_x, cena.render.resolution_y = a.largura, a.altura
    cena.render.image_settings.file_format = "PNG"
    cena.view_settings.view_transform = "Standard"
    a.saida.mkdir(parents=True, exist_ok=True)

    rigs = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    nomes = sorted({t.name for r in rigs if r.animation_data for t in r.animation_data.nla_tracks})
    pedidos = [c for c in a.clipes.split(",") if c] or nomes
    tempos = [float(t) for t in a.tempos.split(",") if t]
    arquivos = []
    for clipe in pedidos:
        if clipe not in nomes:
            print(f"AVISO clipe ausente: {clipe}")
            continue
        ini, fim = 1e9, 0
        for r in rigs:
            if not r.animation_data:
                continue
            r.animation_data.action = None
            for t in r.animation_data.nla_tracks:
                t.mute = t.name != clipe
                if t.name == clipe:
                    for s in t.strips:
                        ini, fim = min(ini, s.frame_start), max(fim, s.frame_end)
        for frac in tempos:
            q = ini + (fim - ini) * frac
            cena.frame_set(int(q), subframe=q % 1.0)
            alvo = a.saida / f"{clipe}-{int(round(frac * 100)):03d}.png"
            cena.render.filepath = str(alvo)
            bpy.ops.render.render(write_still=True)
            arquivos.append({"clipe": clipe, "fracao": frac, "arquivo": alvo.name})
    rel = {"glb": str(a.glb), "camera": cam.name, "vfov": math.degrees(vfov), "resolucao": [a.largura, a.altura],
           "arquivos": arquivos}
    (a.saida / "render.json").write_text(json.dumps(rel, indent=2) + "\n", encoding="utf-8")
    print("FABRICA_RENDER=" + json.dumps({"n": len(arquivos)}))


if __name__ == "__main__":
    main()
