"""Fábrica — chassi do pack e malha do jogo SOBREPOSTOS no referencial da raiz (cm), grade rotulada.

Uso: Blender -b --python tools/fabrica/blender/sobrepor.py -- --fbx=<arma do pack.fbx> --glb=<public/models/weapons/x.glb>
       --pos=x,y,z --rot=rx,ry,rz --escala=s --saida=<png> [--vista=lado|topo] [--caixas=<json>]
       [--recorte=<json {min,max} em m no GLB>] [--medir=<json {min,max} em cm na raiz>] [--largura=1800]

É a conta que a ficha de variante faz: a peça de zona livre é posta com
T(pos)·R(rot)·S(escala·100) (tools/fabrica/blender/montar.py importar_peca, sem `centrar`).
Calibrando aqui a malha do jogo INTEIRA contra o chassi (punho sobre punho, poço sobre poço),
toda peça recortada dela cai no lugar com a mesma âncora. Chassi em cinza, jogo em laranja
translúcido; caixas (remoção/proteção) em vermelho/verde. Grade de 5 cm com rótulo a cada 10.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import montar  # noqa: E402


def args_():
    argv = sys.argv[sys.argv.index("--") + 1:]
    p = argparse.ArgumentParser()
    p.add_argument("--fbx")
    p.add_argument("--glb")
    p.add_argument("--pos", default="0,0,0")
    p.add_argument("--rot", default="0,0,0")
    p.add_argument("--escala", type=float, default=1.0)
    p.add_argument("--recorte", default="")
    p.add_argument("--caixas", default="", help='JSON [{"min":[..],"max":[..],"cor":"vermelho|verde"}] em cm na raiz')
    p.add_argument("--medir", default="", help='JSON {min,max} em cm na raiz: caixa e centro dos vértices do jogo dentro dela')
    p.add_argument("--vista", default="lado")
    p.add_argument("--saida", required=True)
    p.add_argument("--largura", type=int, default=1800)
    return p.parse_args(argv)


def vec(s):
    return [float(v) for v in s.split(",")]


def mat(nome, cor):
    m = bpy.data.materials.new(nome)
    m.diffuse_color = cor
    return m


def colorir(o, cor):
    o.color = cor
    o.data.materials.clear()
    o.data.materials.append(mat(f"m_{o.name}", cor))


def caixa(mn, mx, cor):
    bpy.ops.mesh.primitive_cube_add(size=1, location=[(a + b) / 2 for a, b in zip(mn, mx)])
    c = bpy.context.object
    c.scale = [max(0.05, b - a) for a, b in zip(mn, mx)]
    c.display_type = "WIRE"
    bpy.context.view_layer.update()
    bpy.ops.object.transform_apply(scale=True)
    me = c.data
    bm = bmesh.new()
    bm.from_mesh(me)
    geo = bmesh.ops.wireframe(bm, faces=bm.faces[:], thickness=0.25)
    del geo
    bm.to_mesh(me)
    bm.free()
    colorir(c, cor)
    return c


def texto(corpo, loc, rot, tam, cor):
    cu = bpy.data.curves.new("t", "FONT")
    cu.body = corpo
    cu.size = tam
    cu.align_x = "CENTER"
    o = bpy.data.objects.new("TXT", cu)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    o.color = cor
    cu.materials.append(mat("mt", cor))
    return o


def main():
    a = args_()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    pontos = []
    if a.fbx:
        objs = montar.importar_fbx(a.fbx)
        rig = montar.armadura(objs)
        if rig.animation_data:
            rig.animation_data_clear()
        for pb in rig.pose.bones:
            pb.matrix_basis = Matrix.Identity(4)
        raiz = montar.raiz_da_arma(objs, rig, "SOBREPOR")
        raiz.matrix_world = Matrix.Identity(4)
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        for o in [o for o in objs if o.type == "MESH"]:
            colorir(o, (0.32, 0.33, 0.36, 1.0))
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            pontos += [ev.matrix_world @ v.co for v in me.vertices]
            ev.to_mesh_clear()
    if a.glb:
        antes = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=a.glb)
        novos = [o for o in bpy.data.objects if o not in antes]
        malhas = [o for o in novos if o.type == "MESH"]
        for o in malhas:
            mw = o.matrix_world.copy()
            o.parent = None
            o.matrix_world = mw
        bpy.ops.object.select_all(action="DESELECT")
        for o in malhas:
            o.select_set(True)
        bpy.context.view_layer.objects.active = malhas[0]
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        if len(malhas) > 1:
            bpy.ops.object.join()
        obj = bpy.context.view_layer.objects.active
        montar.remover([o for o in novos if o.type != "MESH" and o.name in bpy.data.objects])
        if a.recorte:
            r = json.loads(a.recorte)
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            mn, mx = Vector(r["min"]), Vector(r["max"])
            fora = [v for v in bm.verts if not all(mn[i] <= v.co[i] <= mx[i] for i in range(3))]
            bmesh.ops.delete(bm, geom=fora, context="VERTS")
            bm.to_mesh(obj.data)
            bm.free()
        local = (Matrix.Translation(Vector(vec(a.pos))) @ Euler([math.radians(v) for v in vec(a.rot)]).to_matrix().to_4x4()
                 @ Matrix.Scale(a.escala * 100.0, 4))
        obj.matrix_world = local
        bpy.context.view_layer.update()
        colorir(obj, (1.0, 0.45, 0.05, 0.55))
        pontos += [obj.matrix_world @ v.co for v in obj.data.vertices]
        vs = [obj.matrix_world @ v.co for v in obj.data.vertices]
        if a.medir:
            r = json.loads(a.medir)
            dentro = [p for p in vs if all(r["min"][i] <= p[i] <= r["max"][i] for i in range(3))]
            if dentro:
                print("FABRICA_SOBREPOR_MEDIDA=", json.dumps({"n": len(dentro),
                      "min": [round(min(p[i] for p in dentro), 2) for i in range(3)],
                      "max": [round(max(p[i] for p in dentro), 2) for i in range(3)],
                      "centro": [round(sum(p[i] for p in dentro) / len(dentro), 2) for i in range(3)]}))
        print("FABRICA_SOBREPOR_JOGO_BBOX=", [round(min(p[i] for p in vs), 2) for i in range(3)],
              [round(max(p[i] for p in vs), 2) for i in range(3)])
    for c in json.loads(a.caixas or "[]"):
        caixa(c["min"], c["max"], (0.9, 0.1, 0.1, 1) if c.get("cor", "vermelho") == "vermelho" else (0.1, 0.7, 0.2, 1))
    mn = Vector([min(p[i] for p in pontos) for i in range(3)])
    mx = Vector([max(p[i] for p in pontos) for i in range(3)])
    lado = a.vista == "lado"
    # lado: olha para -X (Y na horizontal, Z para cima); topo: olha para -Z (Y na horizontal, X para cima)
    h_ax, v_ax, prof = (1, 2, 0) if lado else (1, 0, 2)
    cena = bpy.context.scene
    cam = bpy.data.objects.new("CAM", bpy.data.cameras.new("CAM"))
    cena.collection.objects.link(cam)
    cam.data.type = "ORTHO"
    alt_px = 900
    larg = (mx[h_ax] - mn[h_ax]) + 16
    alt = (mx[v_ax] - mn[v_ax]) + 16
    cam.data.ortho_scale = max(larg, alt * a.largura / alt_px)
    centro = (mn + mx) / 2
    if lado:
        cam.location = (mx.x + 300, centro.y, centro.z)
        cam.rotation_euler = (math.radians(90), 0, math.radians(90))
        rot_txt = (math.radians(90), 0, math.radians(90))
    else:
        cam.location = (centro.x, centro.y, mx.z + 300)
        cam.rotation_euler = (0, 0, math.radians(90))
        rot_txt = (0, 0, math.radians(90))
    cam.data.clip_end = 2000
    cena.camera = cam
    grade = (0.75, 0.75, 0.78, 1)
    fundo = mn[prof] - 5

    def em(h, v):
        p = [0.0, 0.0, 0.0]
        p[h_ax], p[v_ax], p[prof] = h, v, fundo
        return p
    for y in range(int(mn[h_ax] // 5) * 5 - 5, int(mx[h_ax]) + 10, 5):
        bpy.ops.mesh.primitive_cube_add(size=1, location=em(y, centro[v_ax]))
        c = bpy.context.object
        s = [0.05, 0.05, 0.05]
        s[h_ax] = 0.08 if y % 10 else 0.2
        s[v_ax] = alt + 8
        c.scale = s
        colorir(c, grade)
        if y % 10 == 0:
            texto(str(y), em(y, mn[v_ax] - 6), rot_txt, 2.2, (0.1, 0.1, 0.1, 1))
    for z in range(int(mn[v_ax] // 5) * 5 - 5, int(mx[v_ax]) + 10, 5):
        bpy.ops.mesh.primitive_cube_add(size=1, location=em(centro[h_ax], z))
        c = bpy.context.object
        s = [0.05, 0.05, 0.05]
        s[v_ax] = 0.08 if z % 10 else 0.2
        s[h_ax] = larg + 8
        c.scale = s
        colorir(c, grade)
        if z % 10 == 0:
            texto(str(z), em(mn[h_ax] - 6, z - 0.8), rot_txt, 2.2, (0.1, 0.1, 0.1, 1))
    mundo = bpy.data.worlds.new("m")
    cena.world = mundo
    cena.render.engine = "BLENDER_WORKBENCH"
    sh = cena.display.shading
    sh.light = "FLAT"
    sh.color_type = "OBJECT"
    sh.background_type = "VIEWPORT"
    sh.background_color = (1, 1, 1)
    sh.show_xray = True
    sh.xray_alpha = 0.75
    cena.render.resolution_x = a.largura
    cena.render.resolution_y = alt_px
    cena.render.filepath = a.saida
    bpy.ops.render.render(write_still=True)
    print("FABRICA_SOBREPOR=" + json.dumps({"saida": a.saida, "min": list(mn), "max": list(mx)}))


if __name__ == "__main__":
    main()
