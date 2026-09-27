"""Fábrica — perfil lateral ortográfico com régua em cm (planejar zona livre e âncoras).

Uso: Blender -b --python tools/fabrica/blender/perfil.py -- --fbx=<arma.fbx> | --glb=<peca.glb>
       --saida=<png> [--escala=1.0] [--largura=1600]

FBX: desenha a arma do pack no referencial da RAIZ do arquivo (o mesmo do chassi,
cm, frente = -Y do chassi). GLB: desenha a peça como veio (metros × escala → cm).
Grade a cada 5 cm; o eixo Y do chassi vira o horizontal da figura.
"""
import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import montar  # noqa: E402


def args_():
    argv = sys.argv[sys.argv.index("--") + 1:]
    p = argparse.ArgumentParser()
    p.add_argument("--fbx")
    p.add_argument("--glb")
    p.add_argument("--saida", required=True)
    p.add_argument("--escala", type=float, default=1.0)
    p.add_argument("--largura", type=int, default=1600)
    p.add_argument("--girar", type=float, default=0.0, help="graus em Z (GLB: alinhar o comprimento com Y)")
    return p.parse_args(argv)


def main():
    a = args_()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if a.fbx:
        objs = montar.importar_fbx(a.fbx)
        rig = montar.armadura(objs)
        raiz = montar.raiz_da_arma(objs, rig, "PERFIL")
        raiz.matrix_world = __import__("mathutils").Matrix.Identity(4)  # raiz = mundo, em cm
        bpy.context.view_layer.update()
    else:
        bpy.ops.import_scene.gltf(filepath=a.glb)
        for o in bpy.data.objects:
            if o.parent is None:
                o.scale = [s * 100.0 * a.escala for s in o.scale]
                bpy.context.view_layer.update()
                o.matrix_world = __import__("mathutils").Matrix.Rotation(math.radians(a.girar), 4, "Z") @ o.matrix_world
        bpy.context.view_layer.update()
    malhas = [o for o in bpy.data.objects if o.type == "MESH"]
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in malhas:
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        pts += [ev.matrix_world @ v.co for v in me.vertices]
        ev.to_mesh_clear()
    mn = Vector([min(p[i] for p in pts) for i in range(3)])
    mx = Vector([max(p[i] for p in pts) for i in range(3)])
    print("FABRICA_PERFIL_BBOX=", [round(v, 2) for v in mn], [round(v, 2) for v in mx])
    cena = bpy.context.scene
    cam = bpy.data.objects.new("CAM", bpy.data.cameras.new("CAM"))
    cena.collection.objects.link(cam)
    cam.data.type = "ORTHO"
    larg = (mx.y - mn.y) * 1.1
    alt = (mx.z - mn.z) * 1.3
    cam.data.ortho_scale = max(larg, alt * a.largura / 800)
    cam.location = ((mn.x + mx.x) / 2 + 200, (mn.y + mx.y) / 2, (mn.z + mx.z) / 2)
    cam.rotation_euler = (math.radians(90), 0, math.radians(90))  # olha para -X: Y na horizontal
    cam.data.clip_end = 1000
    cena.camera = cam
    # grade de 5 cm (linhas finas como cilindros) no plano x = mn.x - 1
    mat = bpy.data.materials.new("grade")
    mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.9, 0.2, 0.2, 1)
    for y in range(int(mn.y // 5) * 5, int(mx.y) + 6, 5):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(mn.x - 2, y, (mn.z + mx.z) / 2))
        c = bpy.context.object
        c.scale = (0.1, 0.06 if y % 10 else 0.15, (mx.z - mn.z) * 1.2)
        c.data.materials.append(mat)
    for z in range(int(mn.z // 5) * 5, int(mx.z) + 6, 5):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(mn.x - 2, (mn.y + mx.y) / 2, z))
        c = bpy.context.object
        c.scale = (0.1, (mx.y - mn.y) * 1.1, 0.06 if z % 10 else 0.15)
        c.data.materials.append(mat)
    luz = bpy.data.objects.new("SOL", bpy.data.lights.new("SOL", type="SUN"))
    luz.rotation_euler = (0, math.radians(-70), 0)
    cena.collection.objects.link(luz)
    mundo = bpy.data.worlds.new("m")
    mundo.use_nodes = True
    mundo.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1)
    cena.world = mundo
    cena.render.engine = "BLENDER_WORKBENCH"
    cena.render.resolution_x = a.largura
    cena.render.resolution_y = 800
    cena.render.filepath = a.saida
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
