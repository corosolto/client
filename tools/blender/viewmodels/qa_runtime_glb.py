"""qa_runtime_glb.py — folha de contato do GLB QUE VAI SER SERVIDO.

Existe porque a cena de build e o arquivo exportado divergiram: no Blender o
braço retargetado segurava a AK, e no jogo o mesmo clipe subia o braço pelo meio
da tela. Renderizar a cena de build prova o retarget; só renderizar o ARQUIVO
prova o que o jogador vê.

Importa o runtime, toca cada clipe pela câmera embutida e escreve uma folha
`qa-<arma>-<clipe>-<t>.png` em quatro tempos do clipe.

Uso: blender -b --python qa_runtime_glb.py -- --glb=<runtime.glb> --saida=<dir>
     [--clipes=idle,reload_tactical] [--tempos=0,0.33,0.66,0.999]
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--glb", required=True, type=Path)
    p.add_argument("--saida", required=True, type=Path)
    p.add_argument("--clipes", default="")
    p.add_argument("--tempos", default="0,0.25,0.5,0.75,0.999")
    p.add_argument("--largura", type=int, default=1440)
    p.add_argument("--altura", type=int, default=960)
    return p.parse_args(argv)


def main():
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(args.glb))
    scene = bpy.context.scene

    cam = next((o for o in bpy.data.objects if o.type == "CAMERA"), None)
    if cam is None:
        raise SystemExit("runtime sem câmera embutida — quebra o contrato do viewmodel")
    scene.camera = cam

    mundo = bpy.data.worlds.new("QA")
    mundo.use_nodes = True
    mundo.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.07, 0.10, 1)
    scene.world = mundo
    sol = bpy.data.objects.new("QA_SOL", bpy.data.lights.new("QA_SOL", type="SUN"))
    sol.data.energy = 4.0
    sol.rotation_euler = (math.radians(55), 0, math.radians(35))
    scene.collection.objects.link(sol)

    args.saida.mkdir(parents=True, exist_ok=True)
    scene.render.resolution_x, scene.render.resolution_y = args.largura, args.altura
    scene.render.image_settings.file_format = "PNG"

    rigs = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    # O importador põe cada clipe numa trilha NLA por objeto. Tocar "o clipe X"
    # é ativar a trilha X em TODOS os rigs e silenciar as outras — é assim que o
    # runtime toca, com os dois esqueletos no mesmo clipe.
    nomes = sorted({t.name for r in rigs if r.animation_data
                    for t in r.animation_data.nla_tracks})
    pedidos = [c for c in args.clipes.split(",") if c] or nomes
    tempos = [float(t) for t in args.tempos.split(",") if t]
    folhas = []
    for clipe in pedidos:
        fim = 1
        for r in rigs:
            if not r.animation_data:
                continue
            # o importador deixa a ÚLTIMA animação como ação ativa, e ela toca
            # por cima das trilhas: a folha saía vazia porque o rig estava no
            # equip_rifle enquanto eu pedia idle.
            r.animation_data.action = None
            for t in r.animation_data.nla_tracks:
                t.mute = t.name != clipe
                if t.name == clipe:
                    for s in t.strips:
                        fim = max(fim, int(round(s.frame_end)))
        for frac in tempos:
            sample = max(1.0, fim * frac)
            scene.frame_set(int(sample), subframe=sample % 1.0)
            alvo = args.saida / f"qa-{args.glb.stem}-{clipe}-{int(frac * 100):03d}.png"
            scene.render.filepath = str(alvo)
            bpy.ops.render.render(write_still=True)
            folhas.append(str(alvo))
    report = {
        "glb": str(args.glb.resolve()),
        "sha256": hashlib.sha256(args.glb.read_bytes()).hexdigest(),
        "camera": cam.name,
        "resolution": [args.largura, args.altura],
        "clips": pedidos,
        "times": tempos,
        "files": folhas,
    }
    (args.saida / "qa-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("CORO_QA_FOLHAS=" + json.dumps({"clipes": pedidos, "arquivos": len(folhas)}))


if __name__ == "__main__":
    main()
