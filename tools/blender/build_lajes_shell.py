# build_lajes_shell.py — casca visual assada (lightmap) do fy_lajes inteiro.
#
# v2: footprints novos (caixa + puxadinho) e anti-caixa: duas peles por predio
# com faixa de laje saliente, sobrado pendendo sobre o vão, platibanda quebrada
# com telhadinhos de zinco, escada externa, remendos irregulares de tijolo e
# janelas variadas (menores / com grade / tampadas com madeira).
#
# Roda com:
#   /Applications/Blender.app/Contents/MacOS/Blender --background \
#       --python tools/blender/build_lajes_shell.py -- [--no-bake] [--engine BLENDER_EEVEE]
#
# Produz:
#   public/models/shells/lajes_completa.glb     (mesh + base-color fosca + UV0/UV1)
#   public/models/shells/lajes_completa_lm.png/.webp (lightmap 2048^2, GI difusa, UV1)
#   /tmp/shell2-rua.png / /tmp/shell2-vao.png (+ diags roof/wide)
#
# Convencao de coordenadas: o modelo inteiro e descrito em coordenadas three.js
# (x direita, y cima, z sul). Internamente converte para Blender (z-up) com
# (x,y,z)_three -> (x,-z,y)_blender; o exporter glTF (+Y up) desfaz a conversao,
# entao os numeros no GLB batem com as caixas de colisao do jogo.

import bpy
import math
import os
import random
import shutil
import subprocess
import sys
import zlib
from mathutils import Vector

ROOT = os.environ.get("GAME_ROOT", "/Users/ruben/game")
TEX = os.path.join(ROOT, "public/img/textures")
OUT_DIR = os.path.join(ROOT, "public/models/shells")
OUT_GLB = os.path.join(OUT_DIR, "lajes_completa.glb")
OUT_LM = os.path.join(OUT_DIR, "lajes_completa_lm.png")
OUT_LM_WEBP = os.path.join(OUT_DIR, "lajes_completa_lm.webp")
PREVIEW_RUA = "/tmp/shell2-rua.png"
PREVIEW_VAO = "/tmp/shell2-vao.png"

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SKIP_BAKE = "--no-bake" in ARGS
ENGINE = ARGS[ARGS.index("--engine") + 1] if "--engine" in ARGS else "BLENDER_EEVEE"

WALL_T = 0.25          # espessura de parede
BAND_Y = 2.2           # cota da laje de piso (troca de pele terreo/sobrado)
LM_SIZE = 2048         # atlas de lightmap do bloco inteiro

# ---------------------------------------------------------------- parametros
PALETTES = {
    "areia": ((0.58, 0.55, 0.49, 1.0), (0.72, 0.68, 0.60, 1.0)),
    "ocre": ((0.58, 0.47, 0.36, 1.0), (0.72, 0.58, 0.42, 1.0)),
    "verde": ((0.44, 0.52, 0.47, 1.0), (0.56, 0.64, 0.58, 1.0)),
    "azul": ((0.42, 0.50, 0.56, 1.0), (0.53, 0.61, 0.66, 1.0)),
    "rosa": ((0.55, 0.45, 0.43, 1.0), (0.67, 0.54, 0.51, 1.0)),
}
BUILDINGS = [
    dict(name="NW", x0=-18, x1=-9.5, z0=-31, z1=-13, h=3.5, pal="areia"),
    dict(name="CN", x0=-6.75, x1=6.75, z0=-31, z1=-13, h=5.0, pal="ocre"),
    dict(name="NE", x0=9.5, x1=18, z0=-31, z1=-13, h=3.5, pal="verde"),
    dict(name="SW", x0=-18, x1=-9.5, z0=13, z1=27, h=3.5, pal="rosa"),
    dict(name="CS", x0=-4.25, x1=4.25, z0=13, z1=27, h=3.5, pal="areia"),
    dict(name="SE", x0=9.5, x1=18, z0=13, z1=27, h=3.5, pal="azul"),
    dict(name="WN", x0=-18, x1=-9.5, z0=-12, z1=-2.5, h=3.5, pal="verde"),
    dict(name="EN", x0=9.5, x1=18, z0=-12, z1=-2.5, h=3.5, pal="areia"),
    dict(name="WS", x0=-18, x1=-9.5, z0=2.5, z1=12, h=3.5, pal="azul"),
    dict(name="ES", x0=9.5, x1=18, z0=2.5, z1=12, h=3.5, pal="ocre"),
    dict(name="MN", x0=-6.75, x1=-3.45, z0=-12, z1=-2.5, h=3.5, pal="rosa"),
    dict(name="MS", x0=3.45, x1=6.75, z0=2.5, z1=12, h=3.5, pal="verde"),
    dict(name="MEIO", x0=-1.5, x1=1.5, z0=-1.5, z1=1.5, h=3.5, pal="areia"),
]
ANEXOS = [
    dict(name="A01", x0=-9.5, x1=-8.1, z0=-27, z1=-22.5, h=2.8, skip="W", pal="rosa"),
    dict(name="A02", x0=6.75, x1=8.25, z0=-19, z1=-15, h=2.6, skip="W", pal="areia"),
    dict(name="A03", x0=8.3, x1=9.5, z0=-29, z1=-25, h=2.9, skip="E", pal="rosa"),
    dict(name="A04", x0=-9.5, x1=-8.2, z0=-10, z1=-6.5, h=2.7, skip="W", pal="ocre"),
    dict(name="A05", x0=-9.5, x1=-8.3, z0=17, z1=22, h=2.5, skip="W", pal="azul"),
    dict(name="A06", x0=8.2, x1=9.5, z0=15, z1=19, h=2.8, skip="E", pal="areia"),
    dict(name="A07", x0=8.1, x1=9.5, z0=5, z1=9, h=2.4, skip="E", pal="rosa"),
    dict(name="A08", x0=-5.65, x1=-4.25, z0=16, z1=20, h=2.6, skip="E", pal="verde"),
    dict(name="A09", x0=18, x1=19.3, z0=-10, z1=-6, h=2.5, skip="W", pal="ocre"),
    dict(name="A10", x0=4, x1=6, z0=1.3, z1=2.5, h=2.3, skip="S", pal="azul"),
]
WIN_W, WIN_H = 0.88, 0.96
DOOR_W, DOOR_H, DOOR_YB = 0.95, 2.05, 0.15

OBJS = []  # todos os objetos de geometria da casca


# ------------------------------------------------------------------ helpers
def boxT(name, cx, cy, cz, w, h, d, mat, rot_x=0.0):
    """Caixa em coordenadas three.js (cx,cy,cz centro; w=x, h=y, d=z).
    rot_x (rad) inclina a caixa em torno do eixo x (three.js), no proprio centro."""
    x0, x1 = cx - w / 2, cx + w / 2
    y0, y1 = -cz - d / 2, -cz + d / 2      # blender y = -z_three
    z0, z1 = cy - h / 2, cy + h / 2        # blender z = y_three
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
         (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    if rot_x:
        c, s = math.cos(rot_x), math.sin(rot_x)
        ctr = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
        v = [(x, ctr[1] + (y - ctr[1]) * c - (z - ctr[2]) * s,
              ctr[2] + (y - ctr[1]) * s + (z - ctr[2]) * c) for (x, y, z) in v]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
         (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(v, [], f)
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    me.materials.append(mat)
    OBJS.append(ob)
    return ob


def cylT(name, cx, cy, cz, radius, h, mat, verts=24):
    """Cilindro vertical em coordenadas three.js (cy = centro)."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=h,
                                        location=(cx, -cz, cy))
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    OBJS.append(ob)
    return ob


# ----------------------------------------------------------------- materiais
def load_img(fname, noncolor=False):
    img = bpy.data.images.load(os.path.join(TEX, fname), check_existing=True)
    if noncolor:
        img.colorspace_settings.name = "Non-Color"
    return img


def base_mat(name, prefix, tint, tile_m):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.0 / tile_m,) * 3
    nt.links.new(tex.outputs["UV"], mapping.inputs["Vector"])
    c = nt.nodes.new("ShaderNodeTexImage")
    c.image = load_img(prefix + "_color.webp")
    nt.links.new(mapping.outputs["Vector"], c.inputs["Vector"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    mix.inputs["B"].default_value = tint
    nt.links.new(c.outputs["Color"], mix.inputs["A"])
    nt.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
    normal = nt.nodes.new("ShaderNodeTexImage")
    normal.image = load_img(prefix + "_normal.webp", noncolor=True)
    nt.links.new(mapping.outputs["Vector"], normal.inputs["Vector"])
    normal_map = nt.nodes.new("ShaderNodeNormalMap")
    normal_map.inputs["Strength"].default_value = 0.55
    nt.links.new(normal.outputs["Color"], normal_map.inputs["Color"])
    nt.links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    rough_path = os.path.join(TEX, prefix + "_rough.webp")
    if os.path.exists(rough_path):
        rough = nt.nodes.new("ShaderNodeTexImage")
        rough.image = load_img(prefix + "_rough.webp", noncolor=True)
        nt.links.new(mapping.outputs["Vector"], rough.inputs["Vector"])
        nt.links.new(rough.outputs["Color"], bsdf.inputs["Roughness"])
    else:
        bsdf.inputs["Roughness"].default_value = 0.98
    bsdf.inputs["Metallic"].default_value = 0.0
    return m


def flat_mat(name, color, rough, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = color
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m


def build_materials():
    M = {}
    # Cinco rebocos + tijolo + concreto + estrutura = oito materiais. A versão
    # anterior declarava cinco paletas, mas apontava todas aos mesmos dois mats.
    for name, (lo, _hi) in PALETTES.items():
        plaster = base_mat("Reboco_" + name, "pbr_paintedplaster017", lo, 4.0)
        M["plaster_" + name + "_lo"] = plaster
        M["plaster_" + name + "_hi"] = plaster
    M["bricks"] = base_mat("TijoloBaiano", "lajes_tijolo_baiano", (1.0, 1.0, 1.0, 1.0), 0.90)
    M["concrete"] = base_mat("Concreto", "pbr_concrete046", (0.78, 0.75, 0.69, 1.0), 3.2)
    M["concrete_dark"] = flat_mat("EstruturaEscura", (0.25, 0.23, 0.20, 1.0), 0.94)
    M["steel"] = M["concrete_dark"]
    M["glass"] = M["concrete_dark"]
    M["frame"] = M["steel"]
    M["tank"] = M["concrete_dark"]
    M["door_blue"] = M["concrete_dark"]
    M["door_green"] = M["door_blue"]
    M["door_red"] = M["concrete_dark"]
    M["door_ANX"] = M["door_red"]
    M["pole"] = M["concrete_dark"]
    M["wood"] = M["door_red"]
    M["pot"] = M["door_red"]
    M["leaf"] = M["door_blue"]
    return M


# ------------------------------------------------- paredes com vaos recuados
def dress_opening(bname, axis, plane, outward, uc, yb, w, h, kind, var, M, door_mat):
    """Esquadria, vidro, peitoril e verga de um vao; profundidades medidas da
    face externa (positivo = para dentro da parede). var: '', 'bars', 'board'."""
    tag = bname + ("_window_dress" if kind == "win" else "_door_dress")

    def place(u, y, d, su, sy, sd, mat):
        pc = plane - outward * d
        if axis == "x":
            boxT(tag, u, y, pc, su, sy, sd, mat)
        else:
            boxT(tag, pc, y, u, sd, sy, su, mat)

    if kind == "win":
        if var == "board":  # tampada com madeira
            for i, fy in enumerate((0.22, 0.55, 0.88)):
                place(uc, yb + h * fy, -0.04, w + 0.06, 0.24, 0.03, M["wood"])
        else:
            fw = 0.06
            place(uc - (w / 2 - fw / 2), yb + h / 2, -0.05, fw, h, 0.06, M["frame"])
            place(uc + (w / 2 - fw / 2), yb + h / 2, -0.05, fw, h, 0.06, M["frame"])
            place(uc, yb + fw / 2, -0.05, w - 2 * fw, fw, 0.06, M["frame"])
            place(uc, yb + h - fw / 2, -0.05, w - 2 * fw, fw, 0.06, M["frame"])
            if var == "bars":  # grade: 3 barras horizontais finas
                for fy in (0.30, 0.55, 0.80):
                    place(uc, yb + h * fy, -0.07, w - 0.06, 0.03, 0.03, M["pole"])
            else:
                place(uc, yb + h * 0.55, -0.05, w - 2 * fw, 0.045, 0.05, M["frame"])
            place(uc, yb + h / 2, -0.025, w - 0.09, h - 0.09, 0.02, M["glass"])
        place(uc, yb - 0.035, 0.025, w + 0.12, 0.07, 0.15, M["concrete"])   # peitoril
        place(uc, yb + h + 0.06, 0.12, w + 0.24, 0.12, 0.30, M["concrete"])  # verga
    else:  # porta
        place(uc - (w / 2 + 0.045), yb + h / 2, -0.02, 0.09, h + 0.09, 0.30, M["concrete"])
        place(uc + (w / 2 + 0.045), yb + h / 2, -0.02, 0.09, h + 0.09, 0.30, M["concrete"])
        place(uc, yb + h + 0.045, -0.02, w + 0.18, 0.09, 0.30, M["concrete"])
        place(uc, yb + h / 2, -0.025, w - 0.04, h - 0.04, 0.04, door_mat)
        place(uc, 0.08, -0.17, w + 0.30, 0.16, 0.34, M["concrete"])          # degrau


def vary_windows(openings, seed_str):
    """Varia janelas deterministicamente: ~25% menores, algumas com grade,
    algumas tampadas com madeira."""
    seed = zlib.crc32(seed_str.encode())
    rnd = random.Random(seed)
    out = []
    for (uc, yb, w, h, kind) in openings:
        if kind == "door":
            out.append((uc, yb, w, h, kind, ""))
            continue
        if rnd.random() < 0.25:
            w, h, yb = 0.6, 0.8, yb + 0.15
        r = rnd.random()
        var = "bars" if r < 0.22 else ("board" if r < 0.34 else "")
        out.append((uc, yb, w, h, kind, var))
    return out


def build_wall(bname, mats, M, axis, plane, outward, u0, u1, h, openings,
                door_mat=None, overhang=None, band=True):
    """Parede com buracos de verdade, duas peles (terreo/sobrado) e faixa de
    laje saliente na cota BAND_Y. overhang=(u0,u1,avanco) desloca a pele de
    cima para fora (sobrado sobre o vão). axis 'x': parede varre x; 'z': varre z."""
    mat_lo, mat_hi = mats
    band_y = BAND_Y if band and h > BAND_Y + 0.3 else None
    ops = sorted(openings, key=lambda o: (o[0], o[1]))
    # agrupa vaos empilhados: spans que se tocam/sobrepoem viram a mesma coluna
    cols = []
    for op in ops:
        ua, ub = op[0] - op[2] / 2, op[0] + op[2] / 2
        if cols and ua < cols[-1][1] + 0.01:
            cols[-1][0] = min(cols[-1][0], ua)
            cols[-1][1] = max(cols[-1][1], ub)
            cols[-1][2].append(op)
        else:
            cols.append([ua, ub, [op]])

    def emit(mat, pc, ua, ub, ya, yb):
        if ub - ua < 0.02 or yb - ya < 0.02:
            return
        cu, cy = (ua + ub) / 2, (ya + yb) / 2
        if axis == "x":
            boxT(bname + "_wall", cu, cy, pc, ub - ua, yb - ya, WALL_T, mat)
        else:
            boxT(bname + "_wall", pc, cy, cu, WALL_T, yb - ya, ub - ua, mat)

    def emit_rect(ua, ub, ya, yb):
        # fatia em y na cota da laje e em u nos limites do sobrado
        yspans = [(ya, yb)]
        if band_y and ya < band_y < yb:
            yspans = [(ya, band_y), (band_y, yb)]
        for (y0_, y1_) in yspans:
            hi = band_y is not None and y0_ >= band_y - 1e-6
            uspans = [(ua, ub, 0.0)]
            if hi and overhang:
                ou0, ou1, dep = overhang
                uspans = []
                if ua < ou0:
                    uspans.append((ua, min(ub, ou0), 0.0))
                uspans.append((max(ua, ou0), min(ub, ou1), dep))
                if ub > ou1:
                    uspans.append((max(ua, ou1), ub, 0.0))
            for (u0_, u1_, shift) in uspans:
                if u1_ - u0_ < 0.02:
                    continue
                pc = plane - outward * (WALL_T / 2 - shift) + outward * 0.012
                emit(mat_hi if hi else mat_lo, pc, u0_, u1_, y0_, y1_)

    cursor = u0
    for (cua, cub, col_ops) in cols:
        emit_rect(cursor, cua, 0, h)  # montante entre colunas
        ycur = 0.0
        for (uc, yb_, w, hh, kind, var) in col_ops:
            ua, ub = uc - w / 2, uc + w / 2
            emit_rect(cua, cub, ycur, yb_)        # painel cheio entre vaos
            emit_rect(cua, ua, yb_, yb_ + hh)     # ombreira esquerda do vao
            emit_rect(ub, cub, yb_, yb_ + hh)     # ombreira direita do vao
            p2 = plane
            if overhang and band_y and yb_ >= band_y - 0.01 \
                    and overhang[0] - 0.01 <= uc <= overhang[1] + 0.01:
                p2 = plane + outward * overhang[2]
            dress_opening(bname, axis, p2, outward, uc, yb_, w, hh, kind, var, M,
                          door_mat or M["door_blue"])
            ycur = yb_ + hh
        emit_rect(cua, cub, ycur, h)
        cursor = cub
    emit_rect(cursor, u1, 0, h)

    if not band_y:
        return
    # faixa da laje de piso saliente (8-12 cm), com sofito no trecho do sobrado
    segs = [(u0, u1, 0.0)]
    if overhang:
        ou0, ou1, dep = overhang
        segs = []
        if u0 < ou0:
            segs.append((u0, min(u1, ou0), 0.0))
        segs.append((max(u0, ou0), min(u1, ou1), dep))
        if u1 > ou1:
            segs.append((max(u0, ou1), u1, 0.0))
    for (a, b_, dep) in segs:
        if b_ - a < 0.05:
            continue
        cu = (a + b_) / 2
        if dep:  # sofito cobrindo o avanco
            pc = plane + outward * (dep + 0.06) / 2
            dd = dep + 0.06
            if axis == "x":
                boxT(bname + "_soffit", cu, band_y - 0.04, pc, b_ - a, 0.12, dd, M["concrete"])
            else:
                boxT(bname + "_soffit", pc, band_y - 0.04, cu, dd, 0.12, b_ - a, M["concrete"])
        else:
            pc = plane - outward * 0.02
            if axis == "x":
                boxT(bname + "_slabband", cu, band_y, pc, b_ - a, 0.10, 0.16, M["concrete"])
            else:
                boxT(bname + "_slabband", pc, band_y, cu, 0.16, 0.10, b_ - a, M["concrete"])


def dirt_band(bname, M, x0, x1, z0, z1):
    band_h, proud = 0.42, 0.012
    boxT(bname + "_band", (x0 + x1) / 2, band_h / 2, z0 - proud / 2,
         x1 - x0, band_h, proud, M["concrete_dark"])
    boxT(bname + "_band", (x0 + x1) / 2, band_h / 2, z1 + proud / 2,
         x1 - x0, band_h, proud, M["concrete_dark"])
    boxT(bname + "_band", x0 - proud / 2, band_h / 2, (z0 + z1) / 2,
         proud, band_h, z1 - z0, M["concrete_dark"])
    boxT(bname + "_band", x1 + proud / 2, band_h / 2, (z0 + z1) / 2,
         proud, band_h, z1 - z0, M["concrete_dark"])


def roof_slab(bname, M, x0, x1, z0, z1, h):
    boxT(bname + "_slab", (x0 + x1) / 2, h - 0.10, (z0 + z1) / 2,
         (x1 - x0) - 2 * WALL_T, 0.20, (z1 - z0) - 2 * WALL_T, M["concrete"])


def parapets(bname, M, edges):
    for edge, (axis, center, u0, u1) in edges.items():
        rnd = random.Random(zlib.crc32((bname + edge).encode()))
        cortes = [(0.00, 0.20 + rnd.random() * 0.12),
                  (0.38 + rnd.random() * 0.08, 0.61 + rnd.random() * 0.10),
                  (0.78 + rnd.random() * 0.05, 1.00)]
        for i, (f0, f1) in enumerate(cortes):
            ph = (0.42, 0.72, 1.02)[(i + int(rnd.random() * 3)) % 3]
            ua, ub = u0 + (u1 - u0) * f0, u0 + (u1 - u0) * f1
            if axis == "x":
                boxT(bname + "_parapet", (ua + ub) / 2, edges_h[bname] + ph / 2, center,
                     ub - ua, ph, 0.15, M["concrete_dark"])
            else:
                boxT(bname + "_parapet", center, edges_h[bname] + ph / 2, (ua + ub) / 2,
                     0.15, ph, ub - ua, M["concrete_dark"])


edges_h = {}  # altura da laje por predio (usada por parapets)


def rooflet(bname, M, plane, outward, u0, u1, h):
    """Telhadinho de zinco de 1 agua na beira do topo (paredes norte, axis x)."""
    ang = math.radians(28.0)
    run = 1.15
    slope = run / math.cos(ang)
    cu = (u0 + u1) / 2
    pc = plane - outward * run / 2
    cy = h + 1.25 - math.sin(ang) * run / 2  # borda alta acima de qualquer platibanda
    boxT(bname + "_rooflet", cu, cy, pc, u1 - u0, 0.05, slope, M["steel"],
         rot_x=-ang * outward)
    low_y = h + 1.25 - math.sin(ang) * run
    for u in (u0 + 0.12, u1 - 0.12):
        cylT(bname + "_rooflet_post", u, h + (low_y - h) / 2, plane - outward * (run - 0.08),
             0.025, low_y - h, M["pole"], verts=12)


def balcony(bname, M, plane, outward, u, y, width):
    depth = 0.82
    pc = plane + outward * depth / 2
    boxT(bname + "_balcony", u, y, pc, width, 0.10, depth, M["concrete"])
    front = plane + outward * (depth - 0.025)
    rail_h = 0.84
    for du in (-width / 2 + 0.035, 0, width / 2 - 0.035):
        boxT(bname + "_balcony_rail", u + du, y + 0.10 + rail_h / 2, front,
             0.045, rail_h, 0.045, M["pole"])
    for dy in (0.42, 0.84):
        boxT(bname + "_balcony_rail", u, y + dy, front,
             width, 0.045, 0.045, M["pole"])
        for side in (-1, 1):
            boxT(bname + "_balcony_side_rail", u + side * (width / 2 - 0.025), y + dy,
                 pc, 0.045, 0.045, depth, M["pole"])

    door_h = 1.04
    door_pc = plane + outward * 0.025
    boxT(bname + "_balcony_door_dress", u, y + 0.06 + door_h / 2, door_pc,
         min(0.86, width * 0.42), door_h, 0.04, M["door_green"])
    for side in (-1, 1):
        boxT(bname + "_balcony_door_frame", u + side * min(0.46, width * 0.23),
             y + 0.06 + door_h / 2, door_pc + outward * 0.015,
             0.055, door_h + 0.10, 0.045, M["frame"])

    # roupa secando + vaso: sinais domesticos grandes o bastante para a camera do jogo.
    for i, (du, mat) in enumerate(((-0.31, M["door_red"]), (0.16, M["door_blue"]))):
        boxT(bname + "_balcony_cloth", u + du, y + 0.61 - i * 0.07,
             front + outward * 0.025, 0.34, 0.46 + i * 0.08, 0.025, mat)
    pot_u = u + width * 0.34
    cylT(bname + "_balcony_pot", pot_u, y + 0.16, pc, 0.13, 0.26, M["pot"], verts=12)
    cylT(bname + "_balcony_leaf", pot_u, y + 0.43, pc, 0.20, 0.34, M["leaf"], verts=10)

    # duas escoras tornam a laje plausivel e quebram a leitura de caixa flutuante.
    brace_ang = math.radians(42) * outward
    for du in (-width * 0.34, width * 0.34):
        boxT(bname + "_balcony_brace", u + du, y - 0.30, plane + outward * 0.34,
             0.055, 0.055, 0.80, M["pole"], rot_x=brace_ang)


def build_building(b, M):
    n = b["name"]
    x0, x1, z0, z1, h = b["x0"], b["x1"], b["z0"], b["z1"], b["h"]
    mats = (M["plaster_" + b["pal"] + "_lo"], M["plaster_" + b["pal"] + "_hi"])
    door = M[("door_blue", "door_green", "door_red")[zlib.crc32(n.encode()) % 3]]
    zi0, zi1 = z0 + WALL_T, z1 - WALL_T
    edges_h[n] = h

    def openings(u0, u1, edge):
        span = u1 - u0
        rnd = random.Random(zlib.crc32((n + edge + "openings").encode()))
        rows = [0.78] + ([2.34] if h >= 3.45 else []) + ([3.84] if h >= 4.85 else [])
        count = max(1, int(span / 3.35))
        us = [u0 + span * (i + 1) / (count + 1) + (rnd.random() - 0.5) * 0.38
              for i in range(count)]
        put_door = edge == ("N" if zlib.crc32(n.encode()) % 2 else "S") and span >= 3.0
        dc = u0 + span * (0.38 if zlib.crc32((n + edge).encode()) % 2 else 0.62)
        ops = [(dc, DOOR_YB, DOOR_W, DOOR_H, "door")] if put_door else []
        for yb in rows:
            for u in us:
                if rnd.random() < 0.22:
                    continue
                if put_door and yb < 1.0 and abs(u - dc) < 1.15:
                    continue
                ops.append((u, yb + (rnd.random() - 0.5) * 0.16,
                            WIN_W * (0.82 + rnd.random() * 0.28),
                            WIN_H * (0.82 + rnd.random() * 0.25), "win"))
        return ops

    walls = {
        "N": ("x", z0, -1, x0, x1),
        "S": ("x", z1, +1, x0, x1),
        "W": ("z", x0, -1, zi0, zi1),
        "E": ("z", x1, +1, zi0, zi1),
    }
    for edge, (axis, plane, outward, u0, u1) in walls.items():
        ops = openings(u0, u1, edge)
        varied = vary_windows(ops, n + "_" + edge)
        overhang = None
        if h >= 3.45 and edge == ("E" if zlib.crc32(n.encode()) % 2 else "W"):
            overhang = (u0 + (u1 - u0) * 0.18, u0 + (u1 - u0) * 0.55, 0.22)
        build_wall(n + "_" + edge, mats, M, axis, plane, outward, u0, u1, h,
                    varied, door, overhang=overhang)

    roof_slab(n, M, x0, x1, z0, z1, h)
    dirt_band(n, M, x0, x1, z0, z1)

    edges = {
        "N": ("x", z0 + WALL_T / 2, x0, x1),
        "S": ("x", z1 - WALL_T / 2, x0, x1),
        "W": ("z", x0 + WALL_T / 2, zi0, zi1),
        "E": ("z", x1 - WALL_T / 2, zi0, zi1),
    }
    parapets(n, M, edges)
    if n in {"NW", "CN", "NE", "CS", "ES"}:
        ru0 = x0 + (x1 - x0) * 0.16
        ru1 = x0 + (x1 - x0) * 0.52
        rooflet(n + "_N", M, z0, -1, ru0, ru1, h)
    if n in {"NW", "NE", "SW", "CS", "EN", "WS", "ES"}:
        side = -1 if zlib.crc32(n.encode()) % 2 else 1
        plane, outward = (z0, -1) if side < 0 else (z1, 1)
        u = x0 + (x1 - x0) * (0.34 if side < 0 else 0.66)
        balcony(n, M, plane, outward, u, min(h - 1.08, 2.20), min(2.5, (x1 - x0) * 0.45))
    if n in {"NW", "CN", "NE"}:
        u = x0 + (x1 - x0) * (0.68 if n != "CN" else 0.28)
        balcony(n + "_street", M, z0, -1, u, min(h - 1.08, 2.20), min(2.4, (x1 - x0) * 0.42))


def build_annex(a, M):
    n = a["name"]
    x0, x1, z0, z1, h = a["x0"], a["x1"], a["z0"], a["z1"], a["h"]
    mats = (M["plaster_" + a["pal"] + "_lo"], M["plaster_" + a["pal"] + "_hi"])
    door = M["door_ANX"]
    edges_h[n] = h
    zi0, zi1 = z0 + (WALL_T if a["skip"] in ("N",) else 0), z1
    small = lambda u, yb: (u, yb, 0.6, 0.8, "win")
    door_op = lambda u: (u, DOOR_YB, DOOR_W, DOOR_H, "door")

    walls = {}
    if a["skip"] != "N":
        walls["N"] = ("x", z0, -1, x0, x1, [small((x0 + x1) / 2, 0.9)])
    if a["skip"] != "S":
        walls["S"] = ("x", z1, +1, x0, x1, [small((x0 + x1) / 2, 0.9)])
    if a["skip"] != "W":
        ops = [small((z0 + z1) / 2, 0.9)]
        if z1 - z0 >= 2.8:
            ops = [door_op((z0 + z1) / 2 + 0.45), small((z0 + z1) / 2 - 0.8, 0.9)]
        walls["W"] = ("z", x0, -1, z0 + WALL_T, z1 - WALL_T, ops)
    if a["skip"] != "E":
        ops = [small((z0 + z1) / 2, 0.9)]
        if z1 - z0 >= 2.8:
            ops = [door_op((z0 + z1) / 2 - 0.45), small((z0 + z1) / 2 + 0.8, 0.9)]
        walls["E"] = ("z", x1, +1, z0 + WALL_T, z1 - WALL_T, ops)
    for edge, (axis, plane, outward, u0, u1, ops) in walls.items():
        varied = vary_windows(ops, n + "_" + edge)
        build_wall(n + "_" + edge, mats, M, axis, plane, outward, u0, u1, h,
                    varied, door)

    roof_slab(n, M, x0, x1, z0, z1, h)
    dirt_band(n, M, x0, x1, z0, z1)
    # platibanda baixa com buraco, so nas faces livres
    for edge, (axis, plane, outward, u0, u1, _ops) in walls.items():
        center = plane - outward * WALL_T / 2
        ua, ub = u0 + (u1 - u0) * 0.15, u0 + (u1 - u0) * 0.75
        if axis == "x":
            boxT(n + "_parapet", (ua + ub) / 2, h + 0.2, center, ub - ua, 0.4, 0.15,
                 M["concrete_dark"])
        else:
            boxT(n + "_parapet", center, h + 0.2, (ua + ub) / 2, 0.15, 0.4, ub - ua,
                 M["concrete_dark"])


def build_props(M):
    # caixa d'agua no CN e no NE (cilindro preto ~1.7 x 2.0 sobre base)
    for (bx, bz, roof) in [(-3.8, -16.5, 5.0), (15.2, -17.0, 3.5)]:
        boxT("tank_pad", bx, roof + 0.05, bz, 2.0, 0.10, 2.0, M["concrete"])
        cylT("tank", bx, roof + 0.10 + 1.0, bz, 0.85, 2.0, M["tank"])
        cylT("tank_lid", bx, roof + 0.10 + 2.05, bz, 0.90, 0.12, M["tank"])
    # caixa de escada no CN com capa de zinco inclinada
    bh = 2.3
    boxT("bulkhead", 4.2, 5.0 + bh / 2, -27.5, 2.2, bh, 2.0, M["concrete"])
    boxT("bulkhead_door", 4.2, 5.0 + 0.95, -26.48, 0.85, 1.9, 0.06, M["door_blue"])
    boxT("bulkhead_cap", 4.2, 5.0 + bh + 0.10, -27.5, 2.5, 0.06, 2.3,
         M["steel"], rot_x=math.radians(7))
    # bases de antena (bloco de concreto + haste)
    for (bx, bz, roof) in [(-16.8, -14.6, 3.5), (11.3, -28.8, 3.5)]:
        boxT("antenna_base", bx, roof + 0.15, bz, 0.45, 0.30, 0.45, M["concrete_dark"])
        cylT("antenna_pole", bx, roof + 0.30 + 1.0, bz, 0.025, 2.0, M["pole"], verts=12)


def build_staircase(M):
    """Escada externa reta encostada na face oeste do NW (visual, sem colisao):
    degraus finos (0.17x0.29) sobre viga inclinada, corrimao de um lado."""
    x_face, width = -18.0, 0.9
    n_steps = 21
    rise = 3.5 / n_steps  # ~0.167
    run = 0.29
    z_start = -25.0
    for i in range(n_steps):
        top = (i + 1) * rise
        boxT("stair", x_face - width / 2, top - 0.03, z_start + (i + 0.5) * run,
             width, 0.06, run, M["concrete"])
    # viga (stringer) inclinada sob os degraus
    z_a, y_a = z_start, 0.0
    z_b, y_b = z_start + n_steps * run, 3.5
    length = math.hypot(z_b - z_a, y_b - y_a)
    ang = math.degrees(math.atan2(y_b - y_a, z_b - z_a))
    boxT("stair_stringer", x_face - width / 2, 1.75 - 0.29, (z_a + z_b) / 2,
         width, 0.30, length * 0.90, M["concrete_dark"], rot_x=-math.radians(ang))
    # corrimao simples: 3 postes + trilho inclinado
    x_rail = x_face - width + 0.05
    for i in (0, 10, 20):
        base = (i + 1) * rise
        cylT("stair_post", x_rail, base + 0.45, z_start + (i + 0.5) * run,
             0.02, 0.9, M["pole"], verts=12)
    z_a, y_a = z_start + 0.5 * run, rise + 0.9
    z_b, y_b = z_start + 20.5 * run, 3.5 + 0.9
    length = math.hypot(z_b - z_a, y_b - y_a)
    ang = math.degrees(math.atan2(y_b - y_a, z_b - z_a))
    boxT("stair_rail", x_rail, (y_a + y_b) / 2, (z_a + z_b) / 2,
         0.05, 0.05, length * 0.94, M["pole"], rot_x=-math.radians(ang))


# ------------------------------------------------------------- UVs e bake
def join_all():
    bpy.ops.object.select_all(action="DESELECT")
    for ob in OBJS:
        ob.select_set(True)
        while ob.data.uv_layers:  # cilindros do ops trazem UV propria
            ob.data.uv_layers.remove(ob.data.uv_layers[0])
    bpy.context.view_layer.objects.active = OBJS[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    shell = bpy.context.active_object
    shell.name = "LAJES_SHELL"
    shell.data.name = "LAJES_SHELL"
    return shell


def assign_uv0(shell):
    """UV0 planar em metros (world-space), eixo dominante por face."""
    me = shell.data
    me.update()
    uv = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        n = poly.normal
        an = (abs(n.x), abs(n.y), abs(n.z))
        axis = an.index(max(an))
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            if axis == 0:
                p = (co.y, co.z)
            elif axis == 1:
                p = (co.x, co.z)
            else:
                p = (co.x, co.y)
            uv.data[li].uv = p
    return uv


def pack_lightmap_uv(shell):
    me = shell.data
    lm_uv = me.uv_layers.new(name="lightmap")
    me.uv_layers.active = lm_uv
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.lightmap_pack(PREF_CONTEXT="ALL_FACES", PREF_PACK_IN_ONE=True,
                             PREF_BOX_DIV=48, PREF_MARGIN_DIV=0.01,
                             PREF_NEW_UVLAYER=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    return shell.data.uv_layers.get("lightmap")


def bake_lightmap(shell, lm_uv):
    img = bpy.data.images.new("lajes_lm", width=LM_SIZE, height=LM_SIZE)
    for mat in shell.data.materials:
        if not mat or not mat.use_nodes:
            continue
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = img
        mat.node_tree.nodes.active = node
    shell.data.uv_layers.active_index = list(shell.data.uv_layers).index(lm_uv)
    lm_uv.active_render = True
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    try:  # prefere GPU (Metal) quando houver
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for dev in prefs.devices:
            dev.use = True
        sc.cycles.device = "GPU"
    except Exception as e:
        print("BAKE: GPU indisponivel, usando CPU:", e)
    sc.cycles.samples = 64
    sc.cycles.max_bounces = 3
    sc.cycles.diffuse_bounces = 2
    sc.render.bake.use_pass_direct = False
    sc.render.bake.use_pass_indirect = True
    sc.render.bake.use_pass_color = False
    bpy.ops.object.bake(type="DIFFUSE", use_clear=True, margin=8)
    os.makedirs(OUT_DIR, exist_ok=True)
    img.filepath_raw = OUT_LM
    img.file_format = "PNG"
    img.save()
    # devolve o UV0 como canal ativo de render
    shell.data.uv_layers.active = shell.data.uv_layers["UVMap"]
    shell.data.uv_layers["UVMap"].active_render = True
    return img


# ------------------------------------------------------------ luz e camera
def setup_lighting():
    sc = bpy.context.scene
    world = bpy.data.worlds.new("World")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.38, 0.47, 0.62, 1.0)
    bg.inputs[1].default_value = 0.9
    sc.world = world
    sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
    sc.collection.objects.link(sun)
    sun.data.energy = 3.0
    sun.data.color = (1.0, 0.90, 0.78)
    sun.data.angle = 0.10
    sun_dir = Vector((-25.0, 15.0, -45.0))  # luz viaja de (25,45,15) three.js
    sun.rotation_euler = sun_dir.to_track_quat("-Z", "Y").to_euler()
    return sun


def add_camera(name, loc_three, target_three):
    loc = Vector((loc_three[0], -loc_three[2], loc_three[1]))
    tgt = Vector((target_three[0], -target_three[2], target_three[1]))
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name))
    bpy.context.scene.collection.objects.link(cam)
    cam.location = loc
    cam.rotation_euler = (tgt - loc).to_track_quat("-Z", "Y").to_euler()
    cam.data.angle = math.radians(75)
    return cam


def render_preview(cam, path):
    sc = bpy.context.scene
    if ENGINE == "CYCLES":
        sc.render.engine = "CYCLES"
        sc.cycles.samples = 48
        sc.cycles.use_denoising = True
        sc.cycles.max_bounces = 4
    else:
        try:
            sc.render.engine = ENGINE
        except TypeError:
            sc.render.engine = "BLENDER_EEVEE"
    sc.camera = cam
    sc.render.resolution_x = 1280
    sc.render.resolution_y = 720
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


# ------------------------------------------------------------------- main
def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M = build_materials()
    for b in BUILDINGS:
        build_building(b, M)
    for a in ANEXOS:
        build_annex(a, M)
    shell = join_all()
    assign_uv0(shell)
    lm_uv = pack_lightmap_uv(shell)
    setup_lighting()
    if not SKIP_BAKE:
        bake_lightmap(shell, lm_uv)
        cwebp = shutil.which("cwebp")
        if not cwebp:
            raise RuntimeError("cwebp ausente: o runtime serve _lm.webp; não exportar lightmap velho")
        subprocess.run([cwebp, "-quiet", "-q", "90", OUT_LM, "-o", OUT_LM_WEBP], check=True)
        print("Lightmap WebP:", OUT_LM_WEBP, os.path.getsize(OUT_LM_WEBP), "bytes")
    else:
        shell.data.uv_layers.active = shell.data.uv_layers["UVMap"]

    os.makedirs(OUT_DIR, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    shell.select_set(True)
    bpy.context.view_layer.objects.active = shell
    bpy.ops.object.modifier_add(type="TRIANGULATE")
    bpy.ops.object.modifier_apply(modifier=shell.modifiers[-1].name)
    bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format="GLB",
                              use_selection=True, export_apply=True,
                              export_yup=True, export_image_format="WEBP",
                              export_image_quality=82, export_animations=False,
                              export_cameras=False, export_lights=False,
                              export_tangents=True)
    print("GLB exportado:", OUT_GLB, os.path.getsize(OUT_GLB), "bytes")

    cam = add_camera("RuaCam", (10.0, 1.7, -35.5), (-14.0, 2.2, -31.0))
    render_preview(cam, PREVIEW_RUA)
    cam2 = add_camera("VaoCam", (-8.1, 1.6, -31.0), (-8.1, 2.8, -13.0))
    render_preview(cam2, PREVIEW_VAO)
    cam3 = add_camera("RoofCam", (0.0, 14.0, -6.0), (0.0, 3.5, -24.0))
    render_preview(cam3, "/tmp/shell2-roof.png")
    cam4 = add_camera("WideCam", (16.0, 4.0, -46.0), (-8.0, 2.5, -31.0))
    render_preview(cam4, "/tmp/shell2-wide.png")
    cam5 = add_camera("GableCam", (-25.0, 2.5, -21.0), (-18.0, 2.0, -22.0))
    render_preview(cam5, "/tmp/shell2-gable.png")
    print("Previews:", PREVIEW_RUA, PREVIEW_VAO)


main()
