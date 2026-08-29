"""Assa a arma Mint DENTRO do GLB da família paga (BUG-75, caminho offline).

Importa o <familia>.glb já construído (rig + idle + câmera + arma do pack no
ik_hand_gun), alinha a malha Mint à arma do pack (mesma âncora de centro que
mediu razão 1,001 no runtime), separa o carregador pela caixa MAG medida e o
parenteia ao bone Mag, cria os sockets nomeados do contrato (muzzle/alça) e
renderiza um contact sheet ANTES de exportar — o olho vem antes do export.

Blender -b --python build_baked_family.py -- --familia ak --arma ak \
    --mint .../ak.glb --len 0.88 --gripz 0.62 [--magbox x,y,z,X,Y,Z] [--render-only]
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

PRIVATE_ROOT = Path("/Users/ruben/csbrasil-private-assets/generated/viewmodels")

# Reusa o construtor da família como MÓDULO (zero cópia, zero drift): build()
# deixa a cena viva — rig, arma do pack soldada no bone, câmera e idle.
_spec = importlib.util.spec_from_file_location(
    "build_paid_family", str(Path(__file__).with_name("build_paid_family.py")))
_bpf = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_bpf)


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--familia", required=True)
    parser.add_argument("--arma", required=True)
    parser.add_argument("--mint", type=Path, required=True)
    parser.add_argument("--len", dest="length", type=float, required=True)
    parser.add_argument("--gripz", type=float, default=0.6)
    parser.add_argument("--residuo", default="0,0,0")
    parser.add_argument("--magbox", default="")
    parser.add_argument("--render-only", action="store_true")
    return parser.parse_args(values)


def world_bbox(objects, depsgraph):
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for obj in objects:
        ev = obj.evaluated_get(depsgraph)
        mesh = ev.to_mesh()
        mw = ev.matrix_world
        for v in mesh.vertices:
            p = mw @ v.co
            lo = Vector(map(min, lo, p))
            hi = Vector(map(max, hi, p))
        ev.to_mesh_clear()
    return lo, hi


def main() -> None:
    args = parse_args()
    residuo = Vector([float(x) for x in args.residuo.split(",")])

    # Constrói a família com o código PROVADO (a cena fica viva ao final).
    sys.argv = ["blender", "--", "--family", args.familia]
    _bpf.build()
    scene = bpy.context.scene
    scene.frame_set(1)

    rig = next(o for o in scene.objects if o.type == "ARMATURE" and o.name.startswith("RIG_FP_ARMS"))
    pack_meshes = [o for o in scene.objects if o.type == "MESH" and "GEO_WEAPON_" in o.name]
    camera = next(o for o in scene.objects if o.type == "CAMERA")
    scene.camera = camera
    if not pack_meshes:
        raise RuntimeError("família sem malha de arma do pack (âncora do encaixe)")

    deps = bpy.context.evaluated_depsgraph_get()
    pack_lo, pack_hi = world_bbox(pack_meshes, deps)
    pack_center = (pack_lo + pack_hi) * 0.5
    pack_dim = pack_hi - pack_lo
    # Eixo do cano do pack = maior dimensão da caixa (empírico, sem convenção).
    barrel_axis = max(range(3), key=lambda i: pack_dim[i])
    barrel_dir = Vector((0, 0, 0))
    barrel_dir[barrel_axis] = 1.0
    # Sinal: a boca fica no lado OPOSTO à coronha; a coronha é o lado mais
    # próximo da câmera. Boca = extremo mais LONGE da câmera no eixo do cano.
    cam_pos = camera.matrix_world.translation
    if abs(pack_hi[barrel_axis] - cam_pos[barrel_axis]) < abs(pack_lo[barrel_axis] - cam_pos[barrel_axis]):
        barrel_dir[barrel_axis] = -1.0

    # ---- importa a Mint e alinha (cano +X do GLB cru -> barrel_dir; topo -> +Z)
    antes = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(args.mint))
    mint_objs = [o for o in set(scene.objects) - antes]
    mint_meshes = [o for o in mint_objs if o.type == "MESH"]
    if not mint_meshes:
        raise RuntimeError("mint sem malha")
    holder = bpy.data.objects.new(f"MINT_WEAPON_{args.arma.upper()}", None)
    scene.collection.objects.link(holder)
    for obj in mint_objs:
        if obj.parent is None:
            obj.parent = holder

    # rot [0,270,0] (three) => cano do GLB cru = +X no espaço Blender pós-import;
    # topo segue +Z. Gira +X para o barrel_dir empírico do pack.
    up = Vector((0, 0, 1))
    rot = Vector((1, 0, 0)).rotation_difference(barrel_dir).to_matrix().to_4x4()
    # mantém o topo para cima: corrige o roll residual em torno do cano
    top_rodado = rot @ Vector((0, 0, 1))
    roll = top_rodado.angle(up) if top_rodado.length > 1e-6 else 0.0
    if roll > 1e-3:
        eixo = top_rodado.cross(up)
        if eixo.length > 1e-6:
            rot = Matrix.Rotation(roll if eixo.dot(barrel_dir) >= 0 else -roll, 4, barrel_dir) @ rot
    holder.matrix_world = rot

    deps = bpy.context.evaluated_depsgraph_get()
    mint_lo, mint_hi = world_bbox(mint_meshes, deps)
    mint_dim = mint_hi - mint_lo
    escala = args.length / max(mint_dim)
    holder.scale = (escala, escala, escala)
    deps = bpy.context.evaluated_depsgraph_get()
    mint_lo, mint_hi = world_bbox(mint_meshes, deps)
    mint_center = (mint_lo + mint_hi) * 0.5
    lateral = barrel_dir.cross(up).normalized()
    holder.location += (pack_center - mint_center) \
        + lateral * residuo.x + up * residuo.y + barrel_dir * residuo.z
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    dbg_lo, dbg_hi = world_bbox(mint_meshes, deps)
    print("CORO_BAKED_DEBUG=" + json.dumps({
        "barrel_axis": barrel_axis,
        "barrel_dir": list(barrel_dir),
        "pack_center": [round(v, 3) for v in pack_center],
        "pack_dim": [round(v, 3) for v in pack_dim],
        "mint_center_final": [round(v, 3) for v in ((dbg_lo + dbg_hi) * 0.5)],
        "mint_dim_final": [round(v, 3) for v in (dbg_hi - dbg_lo)],
        "escala": round(escala, 4),
    }))
    # daqui em diante TUDO usa o centro PÓS-posicionamento (split e sockets)
    mint_center = (dbg_lo + dbg_hi) * 0.5

    # parenteia ao root da arma do pack (que já cavalga o ik_hand_gun desde M1)
    pack_root = next((o for o in scene.objects if o.name.startswith("SOCKET_WEAPON_")), None) \
        or next((o for o in scene.objects if o.name.startswith("RIG_WEAPON_")), None)
    keep = holder.matrix_world.copy()
    holder.parent = pack_root
    holder.matrix_world = keep

    # ---- carregador: separa pela caixa MAG (gun-space com origem no grip)
    if args.magbox:
        m = [float(x) for x in args.magbox.split(",")]
        grip = mint_center + barrel_dir * (args.length * (0.5 - args.gripz))
        eixos = (lateral, up, barrel_dir)

        def dentro(p_world):
            d = p_world - grip
            g = Vector((d.dot(eixos[0]), d.dot(eixos[1]), d.dot(eixos[2])))
            return (m[0] - 5e-3 <= g.x <= m[3] + 5e-3
                    and m[1] - 5e-3 <= g.y <= m[4] + 5e-3
                    and m[2] - 5e-3 <= g.z <= m[5] + 5e-3)

        corpo = mint_meshes[0]
        bm = bmesh.new()
        bm.from_mesh(corpo.data)
        mw = corpo.matrix_world
        faces_mag = [f for f in bm.faces if dentro(mw @ f.calc_center_median())]
        amostra = [mw @ f.calc_center_median() - grip for f in bm.faces[:0]] or None
        gs = [Vector(((mw @ f.calc_center_median() - grip).dot(eixos[0]),
                      (mw @ f.calc_center_median() - grip).dot(eixos[1]),
                      (mw @ f.calc_center_median() - grip).dot(eixos[2]))) for f in bm.faces]
        print("CORO_MAG_DEBUG=" + json.dumps({
            "faces": len(bm.faces), "dentro": len(faces_mag),
            "gunspace_min": [round(min(v[i] for v in gs), 3) for i in range(3)],
            "gunspace_max": [round(max(v[i] for v in gs), 3) for i in range(3)],
            "grip": [round(v, 3) for v in grip],
        }))
        if faces_mag:
            for f in bm.faces:
                f.select_set(False)
            for f in faces_mag:
                f.select_set(True)
            mag_bm = bm.copy()
            mag_bm.faces.ensure_lookup_table()
            for f in [f for f in mag_bm.faces if not f.select]:
                mag_bm.faces.remove(f)
            mag_bm.verts.ensure_lookup_table()
            for v in [v for v in mag_bm.verts if not v.link_faces]:
                mag_bm.verts.remove(v)
            mag_mesh = bpy.data.meshes.new(f"MINT_MAG_{args.arma.upper()}")
            mag_bm.to_mesh(mag_mesh)
            mag_bm.free()
            mag_obj = bpy.data.objects.new(f"MINT_WEAPON_MAG_{args.arma.upper()}", mag_mesh)
            mag_obj.data.materials.append(corpo.data.materials[0] if corpo.data.materials else None)
            scene.collection.objects.link(mag_obj)
            mag_obj.matrix_world = corpo.matrix_world.copy()
            bmesh.ops.delete(bm, geom=faces_mag, context="FACES")
            bm.to_mesh(corpo.data)
            # pente vai para o bone Mag do pack (anima na recarga)
            mag_bone = next((b.name for b in rig.pose.bones if b.name.lower() == "mag"), None)
            alvo_rig = next((o for o in scene.objects if o.type == "ARMATURE" and o.name.startswith("RIG_WEAPON_")), None)
            if alvo_rig is None:
                alvo_rig = rig
            if mag_bone is None:
                mag_bone = next((b.name for b in alvo_rig.pose.bones if "mag" in b.name.lower()), None)
            if mag_bone:
                keep_mag = mag_obj.matrix_world.copy()
                mag_obj.parent = alvo_rig
                mag_obj.parent_type = "BONE"
                mag_obj.parent_bone = mag_bone
                bpy.context.view_layer.update()
                pb = alvo_rig.pose.bones[mag_bone]
                tail = alvo_rig.matrix_world @ pb.matrix @ Matrix.Translation((0.0, pb.length, 0.0))
                mag_obj.matrix_basis = Matrix.Identity(4)
                mag_obj.matrix_parent_inverse = tail.inverted() @ keep_mag
        bm.free()

    # ---- sockets do contrato: boca e alça MEDIDOS nos vértices (porta do
    # measureGun: boca = centroide da fatia frontal de 2%; alça = topo entre o
    # grip e 45% do caminho até a boca, na linha do cano).
    deps = bpy.context.evaluated_depsgraph_get()
    pontos = []
    for obj in mint_meshes:
        ev = obj.evaluated_get(deps)
        me = ev.to_mesh()
        mw = ev.matrix_world
        passo = max(1, len(me.vertices) // 30000)
        for i in range(0, len(me.vertices), passo):
            pontos.append(mw @ me.vertices[i].co)
        ev.to_mesh_clear()
    grip0 = mint_center + barrel_dir * (args.length * (0.5 - args.gripz))
    ao_longo = [(p - grip0).dot(barrel_dir) for p in pontos]
    z_max = max(ao_longo)
    corte = z_max - args.length * 0.02
    frente_pts = [p for p, z in zip(pontos, ao_longo) if z >= corte]
    boca = sum(frente_pts, Vector()) / max(1, len(frente_pts))
    z_alca = z_max * 0.45
    faixa = [(p, (p - grip0).dot(up)) for p, z in zip(pontos, ao_longo) if 0 <= z <= z_alca]
    topo = max(h for _, h in faixa)
    topo_pts = [p for p, h in faixa if h > topo - 0.012]
    alca = sum(topo_pts, Vector()) / max(1, len(topo_pts))
    alca = grip0 + barrel_dir * (z_max * 0.30) + up * topo \
        + lateral * ((alca - grip0).dot(lateral))
    for nome, pos in (
        ("SOCKET_MINT_MUZZLE", boca),
        ("SOCKET_MINT_SIGHT", alca),
    ):
        empty = bpy.data.objects.new(nome, None)
        empty.empty_display_size = 0.01
        scene.collection.objects.link(empty)
        empty.matrix_world = Matrix.Translation(pos)
        keep_socket = empty.matrix_world.copy()
        empty.parent = holder
        empty.matrix_world = keep_socket

    # ---- contact sheet ANTES do export (o olho decide)
    out_dir = PRIVATE_ROOT / args.familia / "baked-preview"
    out_dir.mkdir(parents=True, exist_ok=True)
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    scene.render.engine = "BLENDER_EEVEE"
    mundo = bpy.data.worlds.new("PREVIA")
    mundo.color = (0.35, 0.38, 0.42)
    scene.world = mundo
    sol = bpy.data.objects.new("SOL", bpy.data.lights.new("SOL", type="SUN"))
    sol.data.energy = 3.0
    sol.rotation_euler = (math.radians(50), 0, math.radians(30))
    scene.collection.objects.link(sol)
    idle_action = bpy.data.actions.get("idle")
    if idle_action and rig.animation_data is None:
        rig.animation_data_create()
    if idle_action:
        rig.animation_data.action = idle_action
    for rotulo, frame in (("idle", 1),):
        scene.frame_set(frame)
        scene.render.filepath = str(out_dir / f"{args.arma}-{rotulo}.png")
        bpy.ops.render.render(write_still=True)
    # segundo render: SÓ a Mint (pack oculto) — separa "não existe" de "atrás".
    for obj in pack_meshes:
        obj.hide_render = True
    scene.render.filepath = str(out_dir / f"{args.arma}-so-mint.png")
    bpy.ops.render.render(write_still=True)
    for obj in pack_meshes:
        obj.hide_render = False
    print(f"CORO_BAKED_PREVIEW={out_dir}")
    if args.render_only:
        return

    # ---- exporta com tudo dentro
    alvo = PRIVATE_ROOT / args.familia / f"{args.arma}-baked.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(alvo),
        export_format="GLB",
        export_yup=True,
        export_animations=True,
        export_cameras=True,
        export_extras=True,
        export_image_format="WEBP",
    )
    print(f"CORO_BAKED_BUILD={json.dumps({'arma': args.arma, 'glb': str(alvo)})}")


main()
