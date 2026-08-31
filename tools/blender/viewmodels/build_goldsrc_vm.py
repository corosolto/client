"""Monta o viewmodel GoldSrc (braços + 6 sequências CS 1.6, CC0 — FONTE.md) com a
arma MINT no lugar do template: a animação do pente tira o pente DE VERDADE.

Por arma: importa goldsrc/<cs>.glb, alinha a Mint ao bbox do template (mesma
âncora do bake provado), parenteia a Mint ao bone dominante do template e o
pente (ilhas da magbox) ao bone dominante da região do pente, APAGA o template,
cria câmera na origem (fwd -Y, up +Z, fov vertical 74) e exporta com os clipes
renomeados para o contrato do runtime (idle, reload_tactical, equip_rifle,
shoot). O espelho righthand fica para o RUNTIME (mount.scale.x = -1).

Uso: Blender -b --python build_goldsrc_vm.py -- \
  --cs=ak47 --arma=ak --mint=public/models/weapons/ak.glb --len=0.88 \
  [--magbox=x,y,z,X,Y,Z --gripz=0.62] --saida=<dir>
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

RENOMES = {
    "idle1": "idle", "idle": "idle",
    "idle1-reload": "reload_tactical", "idle1-draw": "equip_rifle",
    "idle1-shoot1": "shoot", "idle1-shoot2": "shoot2", "idle1-shoot3": "shoot3",
    "idle1-shoot_1": "shoot", "idle1-shoot_2": "shoot2",
    "idle1-shoot": "shoot", "idle1-shoot_empty": "shoot_empty",
}


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--cs", required=True)
    p.add_argument("--arma", required=True)
    p.add_argument("--mint", type=Path, required=True)
    p.add_argument("--len", dest="length", type=float, required=True)
    p.add_argument("--gripz", type=float, default=0.6)
    p.add_argument("--rot", default="0,0,0")
    p.add_argument("--escala-extra", dest="escala_extra", type=float, default=1.0)  # weaponCFG.rot (espaço three, cano canônico +Z)
    p.add_argument("--magbox", default="")
    p.add_argument("--saida", type=Path, required=True)
    return p.parse_args(values)


def bbox_mundo(objs, deps):
    lo = Vector((1e9,) * 3)
    hi = Vector((-1e9,) * 3)
    for o in objs:
        ev = o.evaluated_get(deps)
        me = ev.to_mesh()
        mw = ev.matrix_world
        for v in me.vertices:
            p = mw @ v.co
            lo = Vector(map(min, lo, p))
            hi = Vector(map(max, hi, p))
        ev.to_mesh_clear()
    return lo, hi


def bone_dominante(mesh_obj, arm, filtro=None, posados=None):
    """Bone com maior soma de pesos nos vértices (opcionalmente filtrados).
    `posados[i]` = posição POSADA do vértice i (o filtro por região precisa da
    pose do idle — em bind o rig BST fica na origem e o filtro erra o bone)."""
    somas = {}
    nomes = {g.index: g.name for g in mesh_obj.vertex_groups}
    for i, v in enumerate(mesh_obj.data.vertices):
        ponto = posados[i] if posados else v.co
        if filtro and not filtro(ponto):
            continue
        for g in v.groups:
            nome = nomes.get(g.group)
            if nome:
                somas[nome] = somas.get(nome, 0.0) + g.weight
    if not somas:
        return None
    return max(somas, key=somas.get)


def parentear_no_bone(obj, arm, bone):
    keep = obj.matrix_world.copy()
    obj.parent = arm
    obj.parent_type = "BONE"
    obj.parent_bone = bone
    bpy.context.view_layer.update()
    pb = arm.pose.bones[bone]
    # âncora na MESMA pose em que o keep foi medido (idle) — neste rig BST o
    # REST (bind na origem) difere do idle (arma na vista) e ancorar em REST
    # jogava a Mint pra fora do quadro. TAIL é a semântica do parent de bone.
    tail = arm.matrix_world @ pb.matrix @ Matrix.Translation((0.0, pb.length, 0.0))
    obj.matrix_basis = Matrix.Identity(4)
    obj.matrix_parent_inverse = tail.inverted() @ keep
    bpy.context.view_layer.update()


def bone_mag_por_movimento(arm, bone_arma, template=None, arma_len=None, limiar=0.18):
    """Bone que mais se desloca EM RELAÇÃO ao bone da arma no clipe de recarga.

    Devolve None quando nenhum bone se solta o suficiente (arma sem pente
    destacável: awp/scout/m3/knife) — aí o chamador cai na heurística velha.
    """
    # a m3 chama o laço de cartucho de "insert"/"start_reload" — sem isso a
    # shotgun ficava sem cartucho-objeto e a mão subia vazia (dono, 30/08).
    def _chave(a):
        return re.sub(r"^idle1?-", "", a.name.lower().split("|")[-1])
    acao = next((a for a in bpy.data.actions if _chave(a) == "reload"), None)
    if acao is None:
        acao = next((a for a in bpy.data.actions if _chave(a) in ("insert", "start_reload")), None)
    if acao is None or bone_arma not in arm.pose.bones:
        return None
    antes = arm.animation_data.action if arm.animation_data else None
    if arm.animation_data is None:
        arm.animation_data_create()
    arm.animation_data.action = acao
    scene = bpy.context.scene
    f0, f1 = (int(acao.frame_range[0]), int(acao.frame_range[1]))
    ref = arm.pose.bones[bone_arma]
    # SÓ bones que pesam na malha da ARMA: os das mãos também se soltam muito
    # na recarga e venciam a disputa (mediu Bone41/Bone43 = dedos, 31/08).
    candidatos = set()
    if template is not None:
        nomes_g = {g.index: g.name for g in template.vertex_groups}
        peso = {}
        for v in template.data.vertices:
            for g in v.groups:
                nome = nomes_g.get(g.group)
                if nome:
                    peso[nome] = peso.get(nome, 0.0) + g.weight
        total = sum(peso.values()) or 1.0
        candidatos = {n for n, w in peso.items() if w / total >= 0.01}
    trilhas = {b.name: [] for b in arm.pose.bones
               if b.name != bone_arma and (not candidatos or b.name in candidatos)}
    if not trilhas:
        return None
    quadros = [f0 + round((f1 - f0) * i / 12) for i in range(13)]
    for f in quadros:
        scene.frame_set(f)
        base = (arm.matrix_world @ ref.matrix).translation
        for nome in trilhas:
            pos = (arm.matrix_world @ arm.pose.bones[nome].matrix).translation
            trilhas[nome].append(pos - base)
    # excursão relativa ao COMPRIMENTO DA ARMA: pente que sai anda ~20-40% dela,
    # ferrolho que só corre no trilho anda ~5-10% (awp/mosin dariam falso-pente).
    escala_ref = max(arma_len if arma_len else ref.length, 1e-6)
    melhor, melhor_exc = None, 0.0
    for nome, serie in trilhas.items():
        lo = Vector((min(v.x for v in serie), min(v.y for v in serie), min(v.z for v in serie)))
        hi = Vector((max(v.x for v in serie), max(v.y for v in serie), max(v.z for v in serie)))
        exc = (hi - lo).length / escala_ref
        if exc > melhor_exc:
            melhor, melhor_exc = nome, exc
    arm.animation_data.action = antes
    scene.frame_set(0)
    print("CORO_GS_MAG_MOVIMENTO=" + json.dumps({
        "bone": melhor, "excursao": round(melhor_exc, 3), "limiar": limiar}))
    return melhor if melhor_exc >= limiar else None


def main() -> None:
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    raiz = Path(__file__).resolve().parents[3]
    bpy.ops.import_scene.gltf(filepath=str(raiz / f"public/models/viewmodels/goldsrc/{args.cs}.glb"))
    scene = bpy.context.scene
    scene.render.fps = 30
    arm = next(o for o in scene.objects if o.type == "ARMATURE")
    template = next((o for o in scene.objects if o.type == "MESH"
                     and ("template" in o.name.lower() or o.name.lower().startswith("ref_"))), None)
    so_arma_idx = None
    if template is None:
        maos = {"lhand", "rhand"}
        template = next(o for o in scene.objects if o.type == "MESH" and o.name.lower() not in maos)
        # mesh único (famas): arma e mãos juntas — mede só vértices cujo bone
        # dominante NÃO é de mão/braço (senão o bbox vira um cubo e o centro
        # desloca a Mint pra perto da câmera — inflava 2x na tela, 30/08)
        nomes_g = {g.index: g.name.lower() for g in template.vertex_groups}
        so_arma_idx = set()
        for i, v in enumerate(template.data.vertices):
            dom = max(v.groups, key=lambda g: g.weight, default=None)
            nome = nomes_g.get(dom.group, "") if dom else ""
            if not any(t in nome for t in ("hand", "arm", "finger", "thumb", "bip")):
                so_arma_idx.add(i)
        print("CORO_GS_TEMPLATE_FILTRO=" + json.dumps({
            "verts_arma": len(so_arma_idx), "verts_total": len(template.data.vertices)}))

    # pose do idle frame 0 (é o quadro que o jogo mostra parado)
    idle = next((a for a in bpy.data.actions if a.name.lower().startswith("idle")), None)
    if idle:
        if arm.animation_data is None:
            arm.animation_data_create()
        arm.animation_data.action = idle
    scene.frame_set(0)
    deps = bpy.context.evaluated_depsgraph_get()
    t_lo, t_hi = bbox_mundo([template], deps)
    t_centro = (t_lo + t_hi) * 0.5
    t_dim = t_hi - t_lo
    eixo_i = max(range(3), key=lambda i: t_dim[i])
    # eixo do cano por PCA dos vértices POSADOS (bbox mentia na MAC-10: a
    # diagonal corpo+coronha ganhava do cano) — autovetor dominante da
    # covariância, orientado para LONGE da câmera (-Y).
    ev_t = template.evaluated_get(deps)
    me_t = ev_t.to_mesh()
    pts_t = [ev_t.matrix_world @ v.co for i, v in enumerate(me_t.vertices)
             if so_arma_idx is None or i in so_arma_idx]
    ev_t.to_mesh_clear()
    if so_arma_idx is not None and pts_t:
        lo2 = Vector((min(p.x for p in pts_t), min(p.y for p in pts_t), min(p.z for p in pts_t)))
        hi2 = Vector((max(p.x for p in pts_t), max(p.y for p in pts_t), max(p.z for p in pts_t)))
        t_lo, t_hi = lo2, hi2
        t_centro = (t_lo + t_hi) * 0.5
        t_dim = t_hi - t_lo
        eixo_i = max(range(3), key=lambda i: t_dim[i])
    medio = sum(pts_t, Vector()) / len(pts_t)
    import numpy as _np
    M = _np.array([[p.x - medio.x, p.y - medio.y, p.z - medio.z] for p in pts_t])
    _, _, Vt = _np.linalg.svd(M, full_matrices=False)
    cano = Vector(Vt[0]).normalized()
    if cano.y > 0:
        cano = -cano

    # ---- Mint alinhada ao template (cano +X do GLB cru -> cano; topo +Z)
    antes = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(args.mint))
    mint_objs = [o for o in set(scene.objects) - antes]
    mint_meshes = [o for o in mint_objs if o.type == "MESH"]
    holder = bpy.data.objects.new(f"MINT_WEAPON_{args.arma.upper()}", None)
    scene.collection.objects.link(holder)
    for o in mint_objs:
        if o.parent is None:
            o.parent = holder
    up = Vector((0, 0, 1))
    # normalização MEDIDA da arma (weaponCFG.rot, espaço three: cano canônico
    # +Z, topo +Y). Em Blender (glTF Y-up→Z-up): canônico fica cano -Y, topo +Z.
    from math import radians as _rad
    rx, ry, rz = (float(v) for v in args.rot.split(","))
    from mathutils import Euler as _Euler
    R3 = _Euler((_rad(rx), _rad(ry), _rad(rz)), "XYZ").to_matrix().to_4x4()
    C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
    canon = C @ R3 @ C.inverted()
    # alinha o canônico (-Y) ao cano do molde, mantendo o topo (+Z) para cima
    rot = Vector((0, -1, 0)).rotation_difference(cano).to_matrix().to_4x4()
    topo = rot @ Vector((0, 0, 1))
    ang = topo.angle(up) if topo.length > 1e-6 else 0.0
    if ang > 1e-3:
        eixo = topo.cross(up)
        if eixo.length > 1e-6:
            rot = Matrix.Rotation(ang if eixo.dot(cano) >= 0 else -ang, 4, cano) @ rot
    holder.matrix_world = rot @ canon
    deps = bpy.context.evaluated_depsgraph_get()
    m_lo, m_hi = bbox_mundo(mint_meshes, deps)
    escala = args.length / max(m_hi - m_lo)
    # comprimento por PROJEÇÃO no eixo do cano dos dois lados (bbox superestima
    # em arma atarracada — UZI saía 25% maior, crítico 30/08)
    proj_t = [p.dot(cano) for p in pts_t]
    len_t = max(proj_t) - min(proj_t)
    pontos_m = []
    for o in mint_meshes:
        ev_m = o.evaluated_get(deps)
        me_m = ev_m.to_mesh()
        passo = max(1, len(me_m.vertices) // 20000)
        for i in range(0, len(me_m.vertices), passo):
            pontos_m.append(ev_m.matrix_world @ me_m.vertices[i].co)
        ev_m.to_mesh_clear()
    proj_m = [p.dot(cano) for p in pontos_m]
    len_m = max(proj_m) - min(proj_m)
    escala_cs = len_t / max(len_m, 1e-6)
    holder.scale = (escala_cs,) * 3
    # régua interna de paridade: comprimento re-medido PÓS-escala na direção do
    # cano — razão ≠1 aqui denuncia eixo/canonização errada antes de ir pro olho
    deps2 = bpy.context.evaluated_depsgraph_get()
    reproj = []
    for o in mint_meshes:
        ev2 = o.evaluated_get(deps2)
        me2 = ev2.to_mesh()
        passo2 = max(1, len(me2.vertices) // 8000)
        for i in range(0, len(me2.vertices), passo2):
            reproj.append((ev2.matrix_world @ me2.vertices[i].co).dot(cano))
        ev2.to_mesh_clear()
    len_pos = max(reproj) - min(reproj)
    # extensão TOTAL (qualquer direção) pra pegar arma atravessada no eixo
    import numpy as _np2
    print("CORO_GS_PARIDADE=" + json.dumps({
        "len_template": round(len_t, 2), "len_mint_pos_escala": round(len_pos, 2),
        "razao_interna": round(len_pos / max(len_t, 1e-6), 3)}))
    deps = bpy.context.evaluated_depsgraph_get()
    m_lo, m_hi = bbox_mundo(mint_meshes, deps)
    holder.location += t_centro - (m_lo + m_hi) * 0.5
    bpy.context.view_layer.update()

    bone_arma = bone_dominante(template, arm) or arm.pose.bones[0].name
    if abs(args.escala_extra - 1.0) > 1e-3:
        # override por arma (molde com attachment embutido, ex. USP+silenciador):
        # escala ancorada no HEAD do bone da arma — o punho fica na mão.
        pb0 = arm.pose.bones[bone_arma]
        piv = arm.matrix_world @ pb0.matrix.translation
        holder.scale = tuple(v * args.escala_extra for v in holder.scale)
        holder.location = piv + (holder.location - piv) * args.escala_extra
        bpy.context.view_layer.update()
        print("CORO_GS_ESCALA_EXTRA=" + json.dumps({"fator": args.escala_extra}))
    parentear_no_bone(holder, arm, bone_arma)
    print("CORO_GS_VM=" + json.dumps({
        "cs": args.cs, "arma": args.arma, "bone_arma": bone_arma,
        "template_dim": [round(v, 3) for v in t_dim], "escala_cs": round(escala_cs, 4),
    }))

    # ---- pente: bone e CAIXA derivados do próprio molde (vértices dominados
    # pelo bone do pente → bbox posado) — zero medição manual por arma.
    ev = template.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me_pos = ev.to_mesh()
    mesmo_n = len(me_pos.vertices) == len(template.data.vertices)
    posados_t = [(ev.matrix_world @ me_pos.vertices[i].co) if mesmo_n else (template.matrix_world @ v.co)
                 for i, v in enumerate(template.data.vertices)]
    ev.to_mesh_clear()

    def filtro_regiao(pnt):
        d = pnt - t_centro
        return abs(d.dot(cano)) < t_dim[eixo_i] * 0.30 and d.dot(up) < -t_dim[2] * 0.15

    # O pente é, por DEFINIÇÃO, o que se move em relação à arma durante a
    # recarga. A heurística geométrica só achava o bone quando ele calhava de
    # dominar a região de baixo — em 16 das 26 armas ela falhava e o pente
    # ficava preso, deixando a mão esquerda agarrando o vazio (dono, 30/08).
    bone_mag_auto = bone_mag_por_movimento(arm, bone_arma, template, t_dim[eixo_i])
    if bone_mag_auto is None:
        bone_mag_auto = bone_dominante(template, arm, filtro_regiao, posados_t)
    caixa_auto = None
    if bone_mag_auto and bone_mag_auto != bone_arma:
        nomes_grp = {g.index: g.name for g in template.vertex_groups}
        pts = []
        for i, v in enumerate(template.data.vertices):
            dom = max(v.groups, key=lambda g: g.weight, default=None)
            if dom and nomes_grp.get(dom.group) == bone_mag_auto:
                pts.append(posados_t[i])
        if len(pts) >= 8:
            lo = Vector((min(q.x for q in pts), min(q.y for q in pts), min(q.z for q in pts)))
            hi = Vector((max(q.x for q in pts), max(q.y for q in pts), max(q.z for q in pts)))
            folga = (hi - lo) * 0.15
            caixa_auto = (lo - folga, hi + folga)
            print("CORO_GS_CAIXA_AUTO=" + json.dumps({
                "bone": bone_mag_auto, "verts": len(pts),
                "lo": [round(v, 2) for v in caixa_auto[0]], "hi": [round(v, 2) for v in caixa_auto[1]]}))

    if args.magbox or caixa_auto:
        if caixa_auto:
            c_lo, c_hi = caixa_auto

            def dentro(p):
                return (c_lo.x <= p.x <= c_hi.x and c_lo.y <= p.y <= c_hi.y
                        and c_lo.z <= p.z <= c_hi.z)
        else:
            m = [float(x) for x in args.magbox.split(",")]
            deps = bpy.context.evaluated_depsgraph_get()
            m_lo, m_hi = bbox_mundo(mint_meshes, deps)
            centro = (m_lo + m_hi) * 0.5
            lateral = cano.cross(up).normalized()
            grip = centro + cano * (t_dim[eixo_i] * (0.5 - args.gripz))
            eixos = (lateral, up, cano)

            def dentro(p):
                d = p - grip
                g = Vector((d.dot(eixos[0]), d.dot(eixos[1]), d.dot(eixos[2])))
                k = escala_cs / max(escala, 1e-9)
                return (m[0] * k - 5e-3 <= g.x <= m[3] * k + 5e-3
                        and m[1] * k - 5e-3 <= g.y <= m[4] * k + 5e-3
                        and m[2] * k - 5e-3 <= g.z <= m[5] * k + 5e-3)

        corpo = mint_meshes[0]
        bm = bmesh.new()
        bm.from_mesh(corpo.data)
        mw = corpo.matrix_world
        bm.faces.ensure_lookup_table()
        visitado = set()
        faces_mag = []
        for f0 in bm.faces:
            if f0.index in visitado:
                continue
            ilha = []
            fila = [f0]
            visitado.add(f0.index)
            while fila:
                f = fila.pop()
                ilha.append(f)
                for e in f.edges:
                    for lf in e.link_faces:
                        if lf.index not in visitado:
                            visitado.add(lf.index)
                            fila.append(lf)
            na_caixa = sum(1 for f in ilha if dentro(mw @ f.calc_center_median()))
            if na_caixa > len(ilha) * 0.5:
                faces_mag.extend(ilha)
        print("CORO_GS_MAG_ILHAS=" + json.dumps({"faces": len(faces_mag)}))
        if faces_mag:
            mag_bm = bm.copy()
            mag_bm.faces.ensure_lookup_table()
            marca = {f.index for f in faces_mag}
            for f in [f for f in mag_bm.faces if f.index not in marca]:
                mag_bm.faces.remove(f)
            for v in [v for v in mag_bm.verts if not v.link_faces]:
                mag_bm.verts.remove(v)
            mag_mesh = bpy.data.meshes.new(f"MINT_MAG_{args.arma.upper()}")
            mag_bm.to_mesh(mag_mesh)
            mag_bm.free()
            mag_obj = bpy.data.objects.new(f"MINT_WEAPON_MAG_{args.arma.upper()}", mag_mesh)
            if corpo.data.materials:
                mag_obj.data.materials.append(corpo.data.materials[0])
            scene.collection.objects.link(mag_obj)
            mag_obj.matrix_world = corpo.matrix_world.copy()
            # apaga do corpo e tapa a costura
            alvo = set(faces_mag)
            costura = list({e for f in faces_mag for e in f.edges
                            if any(lf not in alvo for lf in e.link_faces)})
            bmesh.ops.delete(bm, geom=faces_mag, context="FACES")
            costura = [e for e in costura if e.is_valid and e.is_boundary]
            if costura:
                bmesh.ops.holes_fill(bm, edges=costura, sides=0)
            bm.to_mesh(corpo.data)
            bone_mag = bone_mag_auto or bone_arma
            parentear_no_bone(mag_obj, arm, bone_mag)
            print("CORO_GS_MAG_BONE=" + json.dumps({"bone": bone_mag}))
        bm.free()

    # ---- sockets do contrato (boca/alça medidos na Mint)
    deps = bpy.context.evaluated_depsgraph_get()
    pontos = []
    for o in mint_meshes:
        ev = o.evaluated_get(deps)
        me = ev.to_mesh()
        mw = ev.matrix_world
        passo = max(1, len(me.vertices) // 20000)
        for i in range(0, len(me.vertices), passo):
            pontos.append(mw @ me.vertices[i].co)
        ev.to_mesh_clear()
    ao_longo = [p.dot(cano) for p in pontos]
    z_max = max(ao_longo)
    frente = [p for p, z in zip(pontos, ao_longo) if z >= z_max - t_dim[eixo_i] * 0.02]
    boca = sum(frente, Vector()) / max(1, len(frente))
    # ALÇA = topo do receiver na metade traseira, não um ponto no eixo do cano.
    # O `up * 0.0` de antes punha a mira DENTRO do cano: no ADS o runtime
    # centraliza esse ponto e a câmera passava a olhar para dentro da arma —
    # era o "miro com zoom e some a visão" (dono, 30/08).
    meia = z_max - t_dim[eixo_i] * 0.5
    tras = [p for p, z in zip(pontos, ao_longo) if z <= meia]
    if tras:
        topo = max(p.dot(up) for p in tras)
        crista = [p for p in tras if p.dot(up) >= topo - t_dim[2] * 0.08]
        alca = sum(crista, Vector()) / max(1, len(crista))
    else:
        alca = boca - cano * (t_dim[eixo_i] * 0.6) + up * (t_dim[2] * 0.5)
    eixo_no_ponto = boca + cano * ((alca - boca).dot(cano))
    print("CORO_GS_ALCA=" + json.dumps({
        "altura_sobre_o_cano": round((alca - eixo_no_ponto).dot(up), 3),
        "altura_da_arma": round(t_dim[2], 3)}))
    for nome, pos in (("SOCKET_MINT_MUZZLE", boca), ("SOCKET_MINT_SIGHT", alca)):
        e = bpy.data.objects.new(nome, None)
        e.empty_display_size = 0.01
        scene.collection.objects.link(e)
        e.matrix_world = Matrix.Translation(pos)
        keep = e.matrix_world.copy()
        e.parent = holder
        e.matrix_world = keep

    # ---- template FORA (a Mint é a identidade). Em molde de MESH ÚNICO
    # (famas/knife) a arma e as mãos moram na mesma malha: apagar o objeto
    # levava as mãos junto e a arma flutuava sozinha (dono, 30/08). Aqui
    # apagamos só os vértices da ARMA e preservamos lhand/rhand.
    if so_arma_idx:
        bm_t = bmesh.new()
        bm_t.from_mesh(template.data)
        bm_t.verts.ensure_lookup_table()
        alvo = [v for v in bm_t.verts if v.index in so_arma_idx]
        bmesh.ops.delete(bm_t, geom=alvo, context="VERTS")
        bm_t.to_mesh(template.data)
        bm_t.free()
        template.data.update()
        template.name = "GS_HANDS"
        print("CORO_GS_MAOS_PRESERVADAS=" + json.dumps({
            "verts_restantes": len(template.data.vertices)}))
    else:
        bpy.data.objects.remove(template, do_unlink=True)
    for _ in range(3):
        bpy.data.orphans_purge(do_recursive=True)

    # ---- câmera na origem (GoldSrc: frente -Y, topo +Z), fov vertical 74
    cam_data = bpy.data.cameras.new("VIEWMODEL_CAMERA_DATA")
    cam_data.sensor_fit = "VERTICAL"
    cam_data.sensor_height = 24.0
    cam_data.lens = (24.0 * 0.5) / math.tan(math.radians(84.0) * 0.5)
    cam = bpy.data.objects.new("VIEWMODEL_CAMERA", cam_data)
    scene.collection.objects.link(cam)
    cam.rotation_euler = (math.radians(90), 0, math.radians(180))
    scene.camera = cam
    cam["viewmodel_fov"] = 84.0

    # ---- keyframes normalizados: primeira chave em 0 — o exportador glTF
    # preserva o tempo absoluto da action e o runtime segurava a primeira pose
    # (fase do reload +33% na AWP/UZI, crítico 30/08).
    def _curvas(acao):
        # Blender 5.2: ação slotted não tem .fcurves — vem por layers/strips.
        if getattr(acao, "fcurves", None):
            return list(acao.fcurves)
        out = []
        for slot in getattr(acao, "slots", []):
            bag = acao.layers[0].strips[0].channelbag(slot)
            if bag:
                out.extend(bag.fcurves)
        return out

    for a in bpy.data.actions:
        curvas = _curvas(a)
        xs = [k.co.x for fc in curvas for k in fc.keyframe_points]
        if not xs:
            continue
        # extensão REAL de chaves (frame_range pode ter padding manual — a AWP
        # e a Deagle chegavam no t=100% ainda na pose de ~75%, crítico 30/08)
        f0 = min(xs)
        if abs(f0) > 1e-6:
            for fc in curvas:
                for k in fc.keyframe_points:
                    k.co.x -= f0
                    k.handle_left.x -= f0
                    k.handle_right.x -= f0
        if getattr(a, "use_frame_range", False):
            a.frame_range = (0.0, max(xs) - f0)

    # ---- clipes renomeados para o contrato (prefixo idle-/idle1- cai fora;
    # doadores com idle.smd geram "idle-reload" em vez de "idle1-reload")
    lixo = []
    for a in bpy.data.actions:
        chave = a.name.lower().split("|")[-1]
        chave = re.sub(r"^idle1?-", "", chave)
        if chave in ("idle", "idle1"):
            novo = "idle"
        else:
            novo = {"reload": "reload_tactical", "draw": "equip_rifle",
                    "shoot1": "shoot", "shoot_1": "shoot", "shoot": "shoot",
                    "shoot2": "shoot2", "shoot_2": "shoot2", "shoot3": "shoot3",
                    "shoot1_unsil": None, "shoot2_unsil": None, "shoot3_unsil": None,
                    "shoot_empty": "shoot_empty", "shootlast": None,
                    "reload_unsil": None, "draw_unsil": None,
                    "pump": "pump", "insert": "reload_loop",
                    "after_reload": "reload_end", "start_reload": "reload_start",
                    "slash1": "shoot", "slash2": "shoot2", "stab": "shoot3",
                    }.get(chave)
        if novo:
            a.name = novo
        elif chave not in ("idle",):
            # clipe sem destino no contrato (add_silencer, idle_unsil, …)
            # sobrevivia com o nome original e poluía o GLB: 9-11 por arma.
            lixo.append(a)
    if "reload_tactical" in bpy.data.actions and "reload_empty" not in bpy.data.actions:
        pass  # runtime cai no tactical quando o empty falta

    # ---- materiais das mãos no CONTRATO da casa: o tint por personagem casa
    # /CoroSolto_FP_(Hand|Glove|Cloth)/ e os moldes CS chamam view_skin.bmp —
    # por isso a mão saía branca com relógio gringo (dono, 30/08).
    CONTRATO = {"view_skin": "CoroSolto_FP_Hand", "view_finger": "CoroSolto_FP_Hand",
                "view_glove": "CoroSolto_FP_Glove"}
    renomeados = []
    for mat in bpy.data.materials:
        base = mat.name.lower().rsplit(".", 1)[0].replace(".bmp", "")
        alvo = CONTRATO.get(base)
        if alvo and not mat.name.startswith("CoroSolto_FP_"):
            mat.name = alvo
            renomeados.append(alvo)
    if renomeados:
        print("CORO_GS_MATERIAIS=" + json.dumps({"renomeados": sorted(set(renomeados))}))

    for a in lixo:
        bpy.data.actions.remove(a)
    if lixo:
        print("CORO_GS_CLIPES_LIXO=" + json.dumps({"removidos": len(lixo)}))

    args.saida.mkdir(parents=True, exist_ok=True)
    alvo = args.saida / f"{args.arma}-runtime.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(alvo), export_format="GLB", export_yup=True,
        export_animations=True, export_cameras=True, export_extras=True,
        export_image_format="WEBP",
    )
    print("CORO_GS_BUILD=" + json.dumps({"glb": str(alvo)}))


main()
