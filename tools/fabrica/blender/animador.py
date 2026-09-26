"""Fábrica — MODO ANIMADOR (plano B): quadros-chave por bpy sobre a base da fábrica.

Para variante cuja zona de contato o pack não cobre (FAMAS bullpup, carabina de alavanca):
parte do `base.blend` que o build deixou (braço + arma fundidos, osso `Arma` no ik_hand_gun),
posa quadros-chave, exporta, renderiza PELA CÂMERA DE AUTORIA e mede contato por quadro.

Uso:
  Blender -b <trabalho>/<id>/base.blend --python tools/fabrica/blender/animador.py -- \
     --poses=<poses.json> --saida=<dir> [--render] [--tempos=0,0.25,0.5,0.75,1]

poses.json:
{
  "clipes": {
    "reload_empty": {
      "quadros": 96,                       # 24 fps
      "chaves": [
        {"q": 0,  "ossos": {"hand_l": {"rot": [0, 0, 0]}}},
        {"q": 40, "ossos": {"hand_l": {"loc": [0, -12, 3], "rot": [10, 0, -20]}, "Mag2": {"loc": [0, 0, 0]}}}
      ]
    }
  },
  "pente2": {"estacionamentoCm": [8, 20, -30]}   # opcional: truque do segundo pente
}
`loc` em cm e `rot` em graus (Euler XYZ), no referencial LOCAL do osso de pose (o que o
painel do Blender mostra). A mão esquerda se anima relativa à arma; a arma segue a mão
direita pelo ik_hand_gun (é o que o pack faz).

Truque do segundo pente: `pente2` duplica os vértices do pente (peso ≥ 0,5 no osso Mag) num
osso `Mag2` filho de `Arma`, estacionado FORA DA TELA; a mão pega o Mag2 fora do quadro, o
pente velho sai, e fora de vista os dois voltam — nunca troca de pai no meio da animação.

Saída: <saida>/animador.glb, <saida>/animador.blend, <saida>/contato.json (distância da palma
de apoio à arma e ao pente, por quadro) e, com --render, PNGs pela câmera de autoria.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector


def args_():
    argv = sys.argv[sys.argv.index("--") + 1:]
    p = argparse.ArgumentParser()
    p.add_argument("--poses", required=True)
    p.add_argument("--saida", required=True)
    p.add_argument("--render", action="store_true")
    p.add_argument("--tempos", default="0,0.25,0.5,0.75,1")
    return p.parse_args(argv)


def segundo_pente(rig, malhas, estacionamento_cm):
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = rig.data.edit_bones
    novo = eb.new("Mag2")
    base = eb["Mag"]
    novo.head, novo.tail, novo.roll = base.head.copy(), base.tail.copy(), base.roll
    novo.parent = eb["Arma"]
    bpy.ops.object.mode_set(mode="OBJECT")
    copiados = 0
    for m in malhas:
        g_mag = m.vertex_groups.get("Mag")
        if g_mag is None:
            continue
        g2 = m.vertex_groups.get("Mag2") or m.vertex_groups.new(name="Mag2")
        bm = bmesh.new()
        bm.from_mesh(m.data)
        deform = bm.verts.layers.deform.verify()
        sel = [v for v in bm.verts if v[deform].get(g_mag.index, 0.0) >= 0.5]
        faces = [f for f in bm.faces if all(v in sel for v in f.verts)]
        dup = bmesh.ops.duplicate(bm, geom=faces)
        novos = [e for e in dup["geom"] if isinstance(e, bmesh.types.BMVert)]
        for v in novos:
            v[deform].clear()
            v[deform][g2.index] = 1.0
        copiados += len(novos)
        bm.to_mesh(m.data)
        bm.free()
    pb = rig.pose.bones["Mag2"]
    pb.location = Vector(estacionamento_cm)
    return copiados


def posar(rig, nome, spec):
    acao = bpy.data.actions.new(f"{rig.name}_{nome}")
    rig.animation_data_create()
    rig.animation_data.action = acao
    for chave in spec["chaves"]:
        for osso, t in chave["ossos"].items():
            pb = rig.pose.bones.get(osso)
            if pb is None:
                raise RuntimeError(f"osso ausente: {osso}")
            if "loc" in t:
                pb.location = Vector(t["loc"])
                pb.keyframe_insert("location", frame=chave["q"])
            if "rot" in t:
                pb.rotation_mode = "XYZ"
                pb.rotation_euler = Euler([math.radians(a) for a in t["rot"]])
                pb.keyframe_insert("rotation_euler", frame=chave["q"])
    rig.animation_data.action = None
    trilha = rig.animation_data.nla_tracks.new()
    trilha.name = nome
    strip = trilha.strips.new(nome, 0, acao)
    strip.action_frame_start, strip.action_frame_end = 0, spec["quadros"]
    return acao


def contato(rig, malhas, nome, quadros):
    """Palma de apoio → malha da arma e → pente (cm), por quadro: a régua do laço."""
    cena = bpy.context.scene
    for t in rig.animation_data.nla_tracks:
        t.mute = t.name != nome
    linhas = []
    dg = bpy.context.evaluated_depsgraph_get()
    pente = {}
    for m in malhas:
        g_mag = m.vertex_groups.get("Mag")
        pente[m.name] = {v.index for v in m.data.vertices
                         if g_mag and any(g.group == g_mag.index and g.weight >= 0.5 for g in v.groups)}
    for q in range(0, quadros + 1, max(1, quadros // 24)):
        cena.frame_set(q)
        dg.update()
        palma = sum((rig.matrix_world @ rig.pose.bones[b].head for b in
                     ("hand_l", "index_01_l", "middle_01_l", "ring_01_l")), Vector()) / 4
        d_arma, d_pente = 1e9, 1e9
        for m in malhas:
            ev = m.evaluated_get(dg)
            me = ev.to_mesh()
            for i in range(0, len(me.vertices), 3):
                d = (ev.matrix_world @ me.vertices[i].co - palma).length
                d_arma = min(d_arma, d)
                if i in pente[m.name]:
                    d_pente = min(d_pente, d)
            ev.to_mesh_clear()
        linhas.append({"quadro": q, "palmaArmaCm": round(d_arma * 100, 2), "palmaPenteCm": round(d_pente * 100, 2)})
    return linhas


def main():
    a = args_()
    poses = json.loads(Path(a.poses).read_text(encoding="utf-8"))
    saida = Path(a.saida)
    saida.mkdir(parents=True, exist_ok=True)
    rig = bpy.data.objects["RIG_FP_ARMS"]
    malhas = [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("GEO_WEAPON_")]
    rel = {"clipes": {}}
    if poses.get("pente2"):
        rel["pente2"] = {"vertices": segundo_pente(rig, malhas, poses["pente2"]["estacionamentoCm"])}
    for nome, spec in poses["clipes"].items():
        posar(rig, nome, spec)
        rel["clipes"][nome] = contato(rig, malhas, nome, spec["quadros"])
    bpy.ops.wm.save_as_mainfile(filepath=str(saida / "animador.blend"))
    for t in rig.animation_data.nla_tracks:
        t.mute = False
    bpy.ops.export_scene.gltf(filepath=str(saida / "animador.glb"), export_format="GLB", export_cameras=True,
                              export_animations=True, export_animation_mode="NLA_TRACKS", export_skins=True,
                              export_image_format="WEBP", export_yup=True)
    (saida / "contato.json").write_text(json.dumps(rel, indent=2) + "\n", encoding="utf-8")
    print("FABRICA_ANIMADOR=" + json.dumps({"glb": str(saida / "animador.glb"), "clipes": list(poses["clipes"])}))
    if a.render:
        import subprocess
        render = Path(__file__).resolve().parent / "render.py"
        subprocess.run([bpy.app.binary_path, "-b", "--python", str(render), "--", f"--glb={saida / 'animador.glb'}",
                        f"--saida={saida / 'render'}", f"--clipes={','.join(poses['clipes'])}", f"--tempos={a.tempos}"], check=True)


if __name__ == "__main__":
    main()
