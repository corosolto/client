"""Fábrica de armas — montagem da BASE (braços + arma do pack + idle + câmera).

Uso (chamado por tools/fabrica/build.mjs; não rode à mão):
  Blender -b --python tools/fabrica/blender/montar.py -- <plano.json>

O plano é a ficha resolvida contra o chassi (tools/fabrica/lib/plano.mjs).
Zona de contato = o pack COMO AUTORADO: SK_Arms_Mono + a arma do próprio pack
+ a pose do próprio pack. Esta etapa só troca material (skins) e pendura peças
de zona livre RÍGIDAS no nó raiz da arma, que cavalga o osso ik_hand_gun
(o "Handle" do tutorial: tudo que não se mexe é filho da raiz; só pente,
ferrolho e bomba têm osso próprio, e esses vêm do pack).
Derivado de tools/blender/viewmodels/build_paid_family.py.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector


def carregar_plano() -> dict:
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if not argv:
        raise SystemExit("uso: montar.py -- <plano.json>")
    return json.loads(Path(argv[0]).read_text(encoding="utf-8"))


def importar_fbx(path: str) -> list:
    if not Path(path).is_file():
        raise RuntimeError(f"FBX ausente: {path}")
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path, use_anim=True, use_image_search=False)
    return [o for o in bpy.data.objects if o not in antes]


def armadura(objs: list):
    rigs = [o for o in objs if o.type == "ARMATURE"]
    if len(rigs) != 1:
        raise RuntimeError(f"esperava 1 armadura, veio {[o.name for o in rigs]}")
    return rigs[0]


def remover(objs: list) -> None:
    for o in objs:
        if o and o.name in bpy.data.objects:
            bpy.data.objects.remove(o, do_unlink=True)


def trilha_nla(alvo, acao, nome: str) -> None:
    anim = alvo.animation_data_create()
    trilha = anim.nla_tracks.new()
    trilha.name = nome
    strip = trilha.strips.new(nome, int(math.floor(acao.frame_range[0])), acao)
    strip.action_frame_start = acao.frame_range[0]
    strip.action_frame_end = acao.frame_range[1]


def transferir_acao(fbx: str, alvo, nome: str) -> dict:
    objs = importar_fbx(fbx)
    fonte = armadura(objs)
    acao = fonte.animation_data.action if fonte.animation_data else None
    if acao is None:
        remover(objs)
        raise RuntimeError(f"sem ação em {fbx}")
    faltam = sorted({b.name for b in fonte.data.bones} - {b.name for b in alvo.data.bones})
    if faltam:
        remover(objs)
        raise RuntimeError(f"{Path(fbx).name}: ossos fora do alvo {faltam}")
    acao.name = f"{alvo.name}_{nome}"
    trilha_nla(alvo, acao, nome)
    info = {"fonte": Path(fbx).name, "quadros": list(acao.frame_range)}
    remover(objs)
    return info


def entrada(shader, nome, valor) -> None:
    sock = shader.inputs.get(nome)
    if sock is not None:
        sock.default_value = valor


def material_liso(mat, cor, metal: float, rugo: float, normal: str | None = None, forca: float = 1.0) -> None:
    mat.use_nodes = True
    nos, lig = mat.node_tree.nodes, mat.node_tree.links
    nos.clear()
    saida = nos.new("ShaderNodeOutputMaterial")
    shader = nos.new("ShaderNodeBsdfPrincipled")
    lig.new(shader.outputs["BSDF"], saida.inputs["Surface"])
    entrada(shader, "Base Color", (*cor[:3], 1.0))
    entrada(shader, "Metallic", metal)
    entrada(shader, "Roughness", rugo)
    if normal:
        img = bpy.data.images.load(normal, check_existing=True)
        img.colorspace_settings.name = "Non-Color"
        tex = nos.new("ShaderNodeTexImage")
        tex.image = img
        nmap = nos.new("ShaderNodeNormalMap")
        nmap.inputs["Strength"].default_value = forca
        lig.new(tex.outputs["Color"], nmap.inputs["Color"])
        lig.new(nmap.outputs["Normal"], shader.inputs["Normal"])


def material_textura(mat, base: str, metal: float, rugo: float) -> None:
    mat.use_nodes = True
    nos, lig = mat.node_tree.nodes, mat.node_tree.links
    nos.clear()
    saida = nos.new("ShaderNodeOutputMaterial")
    shader = nos.new("ShaderNodeBsdfPrincipled")
    lig.new(shader.outputs["BSDF"], saida.inputs["Surface"])
    img = bpy.data.images.load(base, check_existing=True)
    tex = nos.new("ShaderNodeTexImage")
    tex.image = img
    lig.new(tex.outputs["Color"], shader.inputs["Base Color"])
    entrada(shader, "Metallic", metal)
    entrada(shader, "Roughness", rugo)


def srgb_linear(hexa: str):
    c = [int(hexa[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c]


def aplicar_skin_braco(objs: list, skin: dict) -> dict:
    """Base neutra do braço (aparência da AK aprovada). Os nomes CoroSolto_FP_{Cloth,
    Glove,Hand} fazem o runtime reconhecer a mão e tingir por time (vmhands.js)."""
    feitos = {}
    for o in objs:
        if o.type != "MESH":
            continue
        nome = o.name.lower()
        papel = "manga" if "cloth" in nome else "luva" if "glove" in nome else "pulso" if "hand" in nome else None
        if papel is None:
            continue
        spec = skin[papel]
        mat = bpy.data.materials.get(spec["material"]) or bpy.data.materials.new(spec["material"])
        material_liso(mat, spec["cor"], 0.0, spec["rugosidade"], spec.get("normalArquivo"), spec.get("forcaNormal", 1.0))
        o.data.materials.clear()
        o.data.materials.append(mat)
        o.name = f"GEO_FP_{o.name}"
        feitos[o.name] = spec["material"]
    return feitos


def unity_mat(path: Path):
    import re
    txt = path.read_text(encoding="utf-8", errors="replace")
    cor = re.search(r"- _BaseColor: \{r: ([\d.eE+-]+), g: ([\d.eE+-]+), b: ([\d.eE+-]+)", txt)
    met = re.search(r"- _Metallic: ([\d.eE+-]+)", txt)
    liso = re.search(r"- _Smoothness: ([\d.eE+-]+)", txt)
    tex = re.search(r"_BaseMap:\s*\n\s*m_Texture: \{fileID: \d+, guid: ([0-9a-f]+)", txt)
    # O Unity serializa a cor do material em gama (sRGB); o Principled quer linear.
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (
        [lin(float(v)) for v in cor.groups()] if cor else [0.03, 0.03, 0.03],
        float(met.group(1)) if met else 0.0,
        float(liso.group(1)) if liso else 0.45,
        tex.group(1) if tex else None,
    )


def aplicar_skin_arma(objs: list, chassi: dict, skin: dict | None) -> dict:
    """Material do pack (Unity .mat) por padrão; a skin da ficha sobrescreve por nome."""
    pasta = Path(chassi["pastaMateriais"])
    arquivos = {p.stem.lower(): p for p in pasta.glob("*.mat")} if pasta.is_dir() else {}
    guias = chassi.get("texturasPorGuid", {})
    receitas = (skin or {}).get("materiais", {})
    padrao = (skin or {}).get("padrao")
    usados = {}
    for o in objs:
        if o.type != "MESH":
            continue
        for mat in o.data.materials:
            if not mat or mat.name.startswith("CoroSolto_"):
                continue
            chave = mat.name.lower()
            receita = receitas.get(mat.name) or receitas.get(chave) or padrao
            if receita:
                material_liso(mat, srgb_linear(receita["cor"]), receita.get("metal", 0.5), receita.get("rugosidade", 0.5))
                usados[mat.name] = "ficha"
            else:
                fonte = arquivos.get(chave)
                cor, metal, liso, guid = unity_mat(fonte) if fonte else ([0.12, 0.13, 0.14], 0.55, 0.45, None)
                tex = guias.get(guid) if guid else None
                if tex:
                    material_textura(mat, tex, metal, 1.0 - liso)
                    usados[mat.name] = f"pack+textura:{Path(tex).name}"
                else:
                    material_liso(mat, cor, metal, 1.0 - liso)
                    usados[mat.name] = "pack"
            mat.name = f"CoroSolto_{mat.name}"
    return usados


def raiz_da_arma(objs: list, rig, nome: str):
    """Nó raiz do ARQUIVO FBX da arma (é ele que o prefab do Unity põe no ik_hand_gun).
    Quando o FBX não tem vazio de raiz (KXG12_fixed), a armadura vem no topo com a
    própria rotação (180° em Z) e escala 0,01: cria-se o vazio equivalente na origem,
    senão a solda no osso apagaria essa rotação e a arma montaria de trás para a frente."""
    vazia = next((o for o in objs if o.parent is None and o.type == "EMPTY"), None)
    if vazia is not None:
        return vazia
    raiz = bpy.data.objects.new(f"FBX_RAIZ_{nome}", None)
    bpy.context.collection.objects.link(raiz)
    raiz.scale = rig.matrix_world.to_scale()
    bpy.context.view_layer.update()
    mw = rig.matrix_world.copy()
    rig.parent = raiz
    rig.matrix_world = mw
    objs.append(raiz)
    return raiz


OSSO_ARMA = "Arma"


def fundir_arma(braco, rig_arma, raiz, malhas: list, osso: str = "ik_hand_gun") -> list:
    """Funde o rig da arma no esqueleto do braço, sob um osso raiz `Arma` filho do
    ik_hand_gun (o "Handle": toda peça rígida pesa 100% nele; pente/ferrolho/bomba
    mantêm o osso do pack, agora filhos de `Arma`).

    Por que fundir: o exportador glTF não serializa bem armadura pendurada em
    vazio preso a osso — os ossos da arma saíam a ~80 cm e o vértice sem peso
    colapsava na raiz (o ak-runtime.glb antigo tem o mesmo defeito). Um skin só
    é o caminho que o braço já prova."""
    cena = bpy.context.scene
    braco.data.pose_position = "REST"
    bpy.context.view_layer.update()
    # Mesma solda do build_paid_family (cabeça do osso, orientação do osso), no REPOUSO.
    repouso = braco.matrix_world @ braco.data.bones[osso].matrix_local
    raiz.matrix_world = repouso  # já traz a escala 0,01 do FBX (cm → m), como o import
    bpy.context.view_layer.update()

    # Osso Arma = referencial da ARMADURA da arma (os clipes do pack animam os ossos
    # nesse referencial; outro referencial espelharia o deslocamento do pente).
    # Mira e âncoras do chassi vivem no referencial da RAIZ do FBX: `em_rig` converte.
    em_rig = rig_arma.matrix_world.inverted() @ raiz.matrix_world
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = rig_arma
    rig_arma.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = rig_arma.data.edit_bones
    raizes = [b for b in eb if b.parent is None]
    novo = eb.new(OSSO_ARMA)
    novo.head = (0.0, 0.0, 0.0)
    novo.tail = (0.0, 10.0, 0.0)
    for b in raizes:
        b.parent = novo
        b.use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")

    # Vértice rígido (sem peso) passa a pesar no osso Arma; soma dos pesos = 1.
    for m in malhas:
        grupo = m.vertex_groups.get(OSSO_ARMA) or m.vertex_groups.new(name=OSSO_ARMA)
        for v in m.data.vertices:
            total = sum(g.weight for g in v.groups if g.group != grupo.index)
            if total < 0.999:
                grupo.add([v.index], 1.0 - total, "REPLACE")

    # Malhas passam a ser filhas do braço (mundo preservado) e deformadas por ele.
    for m in malhas:
        mw = m.matrix_world.copy()
        m.parent = braco
        m.matrix_world = mw
        for mod in m.modifiers:
            if mod.type == "ARMATURE":
                mod.object = braco
    ossos = [b.name for b in rig_arma.data.bones]
    vazia = raiz if raiz.type == "EMPTY" else None
    bpy.ops.object.select_all(action="DESELECT")
    rig_arma.select_set(True)
    braco.select_set(True)
    bpy.context.view_layer.objects.active = braco
    bpy.ops.object.join()
    bpy.ops.object.mode_set(mode="EDIT")
    eb = braco.data.edit_bones
    eb[OSSO_ARMA].parent = eb[osso]
    eb[OSSO_ARMA].use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")
    if vazia is not None:
        bpy.data.objects.remove(vazia, do_unlink=True)
    for pb in braco.pose.bones:
        if pb.name in ossos:
            pb.matrix_basis = Matrix.Identity(4)
    braco.data.pose_position = "POSE"
    bpy.context.view_layer.update()
    return ossos, em_rig


def pendurar_no_osso(obj, braco, osso: str, local_cm=None) -> None:
    """Objeto preso a osso com posição (cm) ou matriz local no referencial do osso; o
    Blender pendura filho de osso na CAUDA, o parent_inverse compensa."""
    pb = braco.pose.bones.get(osso)
    if pb is None:
        raise RuntimeError(f"rig sem {osso}")
    local = local_cm if isinstance(local_cm, Matrix) else Matrix.Translation(Vector(local_cm or (0, 0, 0)))
    alvo = braco.matrix_world @ pb.matrix @ local
    obj.parent = braco
    obj.parent_type = "BONE"
    obj.parent_bone = osso
    bpy.context.view_layer.update()
    cauda = braco.matrix_world @ pb.matrix @ Matrix.Translation((0.0, pb.length, 0.0))
    obj.matrix_basis = Matrix.Identity(4)
    obj.matrix_parent_inverse = cauda.inverted() @ alvo


def vazio(nome: str, braco, local_cm) -> bpy.types.Object:
    o = bpy.data.objects.new(nome, None)
    bpy.context.collection.objects.link(o)
    o.empty_display_size = 1.0
    pendurar_no_osso(o, braco, OSSO_ARMA, local_cm)
    return o


def para_raiz(braco, malha, em_rig) -> Matrix:
    """Espaço da malha (repouso) → referencial da RAIZ do FBX da arma, em cm."""
    return em_rig.inverted() @ braco.data.bones[OSSO_ARMA].matrix_local.inverted() @ braco.matrix_world.inverted() @ malha.matrix_world


def remover_regioes(braco, malhas: list, regioes: list, em_rig, protecao: list = ()) -> list:
    """Zona livre do chassi que a variante substitui: apaga vértices RÍGIDOS (peso
    só no osso Arma) dentro de caixas no referencial da arma (cm). Nunca sai: vértice
    com peso em osso móvel (pente, ferrolho, bomba, gatilho) e vértice dentro das
    caixas de proteção (zona de contato do chassi: mão forte, mão de apoio, ossos
    móveis, com folga). O relatório conta o que a proteção segurou."""
    relatorio = []
    guarda = [(Vector(c["min"]), Vector(c["max"])) for c in protecao]
    for o in malhas:
        m = para_raiz(braco, o, em_rig)
        arma = o.vertex_groups.get(OSSO_ARMA)
        bm = bmesh.new()
        bm.from_mesh(o.data)
        deform = bm.verts.layers.deform.verify()
        for regiao in regioes:
            mn, mx = Vector(regiao["min"]), Vector(regiao["max"])
            alvo = []
            protegidos = 0
            for v in bm.verts:
                p = m @ v.co
                if not all(mn[i] <= p[i] <= mx[i] for i in range(3)):
                    continue
                if any(w > 0.01 and g != arma.index for g, w in v[deform].items()):
                    protegidos += 1
                    continue
                if any(all(a[i] <= p[i] <= b[i] for i in range(3)) for a, b in guarda):
                    protegidos += 1
                    continue
                alvo.append(v)
            bmesh.ops.delete(bm, geom=alvo, context="VERTS")
            relatorio.append({"regiao": regiao.get("nome"), "malha": o.name, "vertices": len(alvo), "protegidos": protegidos})
        bm.to_mesh(o.data)
        bm.free()
    return relatorio


def importar_peca(peca: dict, braco, em_rig) -> dict:
    """Peça de zona livre: rígida, 100% no osso Arma, posta na âncora (cm) no repouso."""
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=peca["fonte"])
    novos = [o for o in bpy.data.objects if o not in antes]
    malhas = [o for o in novos if o.type == "MESH"]
    if not malhas:
        raise RuntimeError(f"peça {peca['peca']} sem malha: {peca['fonte']}")
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
    remover([o for o in novos if o.type != "MESH" and o.name in bpy.data.objects])
    recorte = peca.get("recorte")
    if recorte:
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        mn, mx = Vector(recorte["min"]), Vector(recorte["max"])
        fora = [v for v in bm.verts if not all(mn[i] <= v.co[i] <= mx[i] for i in range(3))]
        bmesh.ops.delete(bm, geom=fora, context="VERTS")
        bm.to_mesh(obj.data)
        bm.free()
    if peca.get("centrar"):
        # Origem da peça no ponto pedido do próprio recorte (min/centro/max por eixo).
        vs = [v.co for v in obj.data.vertices]
        ref = []
        for i, modo in enumerate(peca["centrar"]):
            lo, hi = min(v[i] for v in vs), max(v[i] for v in vs)
            ref.append(lo if modo == "min" else hi if modo == "max" else (lo + hi) / 2)
        obj.data.transform(Matrix.Translation(-Vector(ref)))
    ancora = peca["ancora"]
    rot = Vector([math.radians(a) for a in ancora.get("rotDeg", [0, 0, 0])])
    from mathutils import Euler
    local = (Matrix.Translation(Vector(ancora["pos"])) @ Euler(rot).to_matrix().to_4x4()
             @ Matrix.Scale(ancora.get("escala", 1.0) * 100.0, 4))
    obj.parent = None
    obj.matrix_world = braco.matrix_world @ braco.data.bones[OSSO_ARMA].matrix_local @ em_rig @ local
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.name = f"GEO_WEAPON_ZL_{peca['peca'].upper()}"
    grupo = obj.vertex_groups.new(name=OSSO_ARMA)
    grupo.add([v.index for v in obj.data.vertices], 1.0, "REPLACE")
    mw = obj.matrix_world.copy()
    obj.parent = braco
    obj.matrix_world = mw
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = braco
    for mat in obj.data.materials:
        if mat and not mat.name.startswith("CoroSolto_"):
            mat.name = f"CoroSolto_ZL_{mat.name}"
    return {"peca": peca["peca"], "objeto": obj.name, "vertices": len(obj.data.vertices),
            "ancora": ancora.get("nome"), "posCm": list(ancora["pos"])}


def camera_do_pack(cam_spec: dict):
    """Câmera do FPSPlayer.prefab (Unity → Blender: x=-x, y=-z, z=y). Fica no GLB:
    é a câmera de autoria — o runtime enquadra por ela e o QA renderiza por ela."""
    dados = bpy.data.cameras.new("VIEWMODEL_CAMERA_DATA")
    dados.sensor_fit = "VERTICAL"
    dados.sensor_height = 24.0
    dados.lens = (dados.sensor_height * 0.5) / math.tan(math.radians(cam_spec["fov"]) * 0.5)
    dados.clip_start = 0.01
    dados.clip_end = 50.0
    cam = bpy.data.objects.new("VIEWMODEL_CAMERA", dados)
    bpy.context.collection.objects.link(cam)
    ux, uy, uz = cam_spec["posUnity"]
    cam.location = (-ux, -uz, uy)
    cam.rotation_euler = (math.radians(90.0), 0.0, math.radians(180.0))  # olha para -Y (frente do Unity)
    cam["viewmodel_fov"] = cam_spec["fov"]
    cam["viewmodel_camera_source"] = cam_spec["fonte"]
    bpy.context.scene.camera = cam
    return cam


def main() -> None:
    plano = carregar_plano()
    chassi = plano["chassi"]
    nome = plano["id"].upper()
    saida = Path(plano["saida"]["dir"])
    saida.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    cena = bpy.context.scene
    cena.render.fps = 24

    personagem = Path(plano["personagem"])
    bracos = importar_fbx(str(personagem / "SK_Arms_Mono.fbx"))
    rig_braco = armadura(bracos)
    rig_braco.name = "RIG_FP_ARMS"
    if rig_braco.animation_data:
        rig_braco.animation_data_clear()
    skin_braco = aplicar_skin_braco(bracos, plano["skinBraco"])

    relatorio_clipes = {"idle": transferir_acao(chassi["poseFbx"], rig_braco, "idle")}
    cena.frame_set(int(relatorio_clipes["idle"]["quadros"][0]))
    bpy.context.view_layer.update()

    arma = importar_fbx(chassi["armaFbx"])
    rig_arma = armadura(arma)
    if rig_arma.animation_data:
        rig_arma.animation_data_clear()
    for pb in rig_arma.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    raiz = raiz_da_arma(arma, rig_arma, nome)
    malhas_arma = [o for o in arma if o.type == "MESH"]
    for o in malhas_arma:
        o.name = f"GEO_WEAPON_{nome}_{o.name}"
    skin_arma = aplicar_skin_arma(arma, chassi, plano.get("skinArma"))
    ossos_arma, em_rig = fundir_arma(rig_braco, rig_arma, raiz, malhas_arma, chassi.get("ossoArma", "ik_hand_gun"))

    rig_braco.data.pose_position = "REST"
    bpy.context.view_layer.update()
    removidos = remover_regioes(rig_braco, malhas_arma, plano.get("removerZonaLivre", []), em_rig, plano.get("protecao", []))
    pecas = [importar_peca(p, rig_braco, em_rig) for p in plano.get("zonaLivre", [])]
    rig_braco.data.pose_position = "POSE"
    cena.frame_set(int(relatorio_clipes["idle"]["quadros"][0]))
    bpy.context.view_layer.update()

    # Linha de visada do pack: AimPoint do prefab no referencial da arma (cm) e um
    # segundo ponto adiante no eixo do cano; o ADS "auto" do runtime alinha os dois.
    mira = Vector(chassi["mira"]["raizCm"])
    frente = Vector(chassi["eixos"]["frente"])
    vazio(f"SOCKET_WEAPON_{nome}", rig_braco, em_rig)
    vazio("SOCKET_FAB_SIGHT", rig_braco, em_rig @ Matrix.Translation(mira))
    vazio("SOCKET_FAB_MUZZLE", rig_braco, em_rig @ Matrix.Translation(mira + frente * 40.0))
    vazio("SOCKET_FAB_UP", rig_braco, em_rig @ Matrix.Translation(mira + Vector(chassi["eixos"]["cima"]) * 10.0))
    boca = chassi.get("ancoras", {}).get("boca")
    if boca:
        vazio("SOCKET_FAB_BARREL", rig_braco, em_rig @ Matrix.Translation(Vector(boca["raizCm"])))

    cam = camera_do_pack(plano["camera"])
    cena["fabrica_id"] = plano["id"]
    cena["fabrica_chassi"] = chassi["nome"]

    blend = saida / "base.blend"
    glb = saida / "base.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.export_scene.gltf(
        filepath=str(glb),
        export_format="GLB",
        export_cameras=True,
        export_lights=False,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_merge_animation="NLA_TRACK",
        export_skins=True,
        export_morph=False,
        export_materials="EXPORT",
        export_image_format="WEBP",
        export_image_quality=85,
        export_optimize_animation_size=True,
        export_optimize_animation_keep_anim_armature=True,
        export_yup=True,
    )
    relatorio = {
        "schemaVersion": 1,
        "id": plano["id"],
        "chassi": chassi["nome"],
        "glb": str(glb),
        "camera": {"fov": cam["viewmodel_fov"], "posicao": list(cam.location), "fonte": cam["viewmodel_camera_source"]},
        "bracos": {"ossos": len(rig_braco.data.bones), "skin": skin_braco, "clipes": relatorio_clipes},
        "arma": {"ossos": ossos_arma, "ossoRaiz": OSSO_ARMA, "materiais": skin_arma},
        "zonaLivre": {"removido": removidos, "pecas": pecas},
    }
    (saida / "montagem.json").write_text(json.dumps(relatorio, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("FABRICA_MONTAGEM=" + json.dumps({"glb": str(glb), "id": plano["id"]}))


if __name__ == "__main__":
    main()
