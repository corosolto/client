"""Retrato de cada viewmodel golden: a arma isolada, com a peça presa ao osso do
carregador pintada de VERMELHO, em fundo liso e três vistas fixas.

Existe porque em 11/09/2026 todas as réguas de CONTAGEM deram verde em treze
armas quebradas — elas contavam vértices presos ao osso sem saber se a peça era
um carregador. O dono jogou e listou, arma a arma: "recarregar tira o cano",
"tira o trigger", "tira o coldre". Esta figura mostra isso antes de alguém jogar.

  blender --background --python retrato_arsenal.py -- --saida=<dir>
"""
from __future__ import annotations
import argparse, math, sys
from pathlib import Path
import bpy
from mathutils import Vector

RAIZ = Path(__file__).resolve().parents[3]
CORO = RAIZ / "public" / "models" / "viewmodels" / "coro"


def limpar() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def retratar(glb: Path, saida: Path) -> dict:
    limpar()
    bpy.ops.import_scene.gltf(filepath=str(glb))
    # Filtra por MATERIAL, não por nome de objeto: o importador do Blender nomeia
    # os objetos pelo NÓ do glTF, não pela malha, e o filtro por nome deixava
    # braços e luvas na figura — a arma saía minúscula e ilegível.
    PELE = ("glove", "sleeve", "hand", "arm", "cloth", "skin")
    armas, maos = [], []
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        rotulos = [obj.name, obj.data.name] + [m.name for m in obj.data.materials if m]
        e_mao = any(t in r.lower() for r in rotulos for t in PELE)
        (maos if e_mao else armas).append(obj)
    print(f"  malhas de arma: {[o.data.name for o in armas]}")
    print(f"  removidas (mão): {[o.data.name for o in maos]}")
    for m in maos:
        bpy.data.objects.remove(m, do_unlink=True)
    if not armas:
        return {"erro": "sem malha de arma"}

    # Sem armadura no retrato: com ela a malha renderiza deformada e a caixa
    # calculada da pose de REPOUSO não bate com o que aparece — a arma saía
    # minúscula e fora do quadro.
    for obj in armas:
        for mod in list(obj.modifiers):
            if mod.type == "ARMATURE":
                obj.modifiers.remove(mod)
    for obj in list(bpy.data.objects):
        if obj.type == "ARMATURE":
            bpy.data.objects.remove(obj, do_unlink=True)

    vermelho = bpy.data.materials.new("Pente")
    vermelho.use_nodes = True
    bsdf = vermelho.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.85, 0.06, 0.04, 1.0)
    cinza = bpy.data.materials.new("Corpo")
    cinza.use_nodes = True
    cinza.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.62, 0.63, 0.66, 1.0)

    presos = 0
    for obj in armas:
        obj.data.materials.clear()
        obj.data.materials.append(cinza)
        obj.data.materials.append(vermelho)
        grupos = [g.index for g in obj.vertex_groups if g.name.lower().startswith("mag")]
        if not grupos:
            continue
        no_pente = set()
        for v in obj.data.vertices:
            for g in v.groups:
                if g.group in grupos and g.weight > 0.01:
                    no_pente.add(v.index)
                    break
        presos += len(no_pente)
        for p in obj.data.polygons:
            if all(i in no_pente for i in p.vertices):
                p.material_index = 1

    caixa_min = Vector((1e9, 1e9, 1e9))
    caixa_max = Vector((-1e9, -1e9, -1e9))
    for obj in armas:
        for v in obj.data.vertices:
            p = obj.matrix_world @ v.co
            for k in range(3):
                caixa_min[k] = min(caixa_min[k], p[k])
                caixa_max[k] = max(caixa_max[k], p[k])
    centro = (caixa_min + caixa_max) / 2
    raio = max(1e-3, (caixa_max - caixa_min).length / 2)

    mundo = bpy.data.worlds.new("W")
    mundo.use_nodes = True
    mundo.node_tree.nodes["Background"].inputs[0].default_value = (0.10, 0.11, 0.13, 1.0)
    mundo.node_tree.nodes["Background"].inputs[1].default_value = 1.1
    bpy.context.scene.world = mundo
    luz = bpy.data.lights.new("Sol", "SUN")
    luz.energy = 4.0
    no_luz = bpy.data.objects.new("Sol", luz)
    bpy.context.collection.objects.link(no_luz)
    no_luz.rotation_euler = (math.radians(55), 0, math.radians(35))

    cam_dados = bpy.data.cameras.new("Cam")
    cam_dados.lens = 60
    cam = bpy.data.objects.new("Cam", cam_dados)
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    cena = bpy.context.scene
    cena.render.engine = "BLENDER_EEVEE"
    cena.render.resolution_x, cena.render.resolution_y = 1100, 420
    cena.render.film_transparent = False

    vistas = {"lado": (0, -1, 0.10), "baixo": (0, -0.30, -1), "tres": (0.8, -0.9, 0.35)}
    for nome, d in vistas.items():
        direcao = Vector(d).normalized()
        cam.location = centro + direcao * raio * 3.0
        olhar = (centro - cam.location).to_track_quat("-Z", "Y")
        cam.rotation_euler = olhar.to_euler()
        cena.render.filepath = str(saida / f"{glb.stem.replace('-hires','')}-{nome}.png")
        bpy.ops.render.render(write_still=True)
    return {"presos": presos, "malhas": len(armas)}


args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--saida", type=Path, default=RAIZ / "artifacts" / "retrato-arsenal")
ap.add_argument("--armas", type=str, default="")
ap.add_argument("--dir", type=Path, default=None)
a = ap.parse_args(args)
a.saida.mkdir(parents=True, exist_ok=True)
so = set(a.armas.split(",")) if a.armas else None
FONTE = a.dir if a.dir else CORO
for glb in sorted(list(FONTE.glob("*-hires.glb")) + (list(FONTE.glob("*.glb")) if a.dir else [])):
    nome = glb.stem.replace("-hires", "")
    if so and nome not in so:
        continue
    r = retratar(glb, a.saida)
    print(f"RETRATO {nome}: {r}")
