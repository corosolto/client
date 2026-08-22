"""Gera evidência não-browser de personagem + arma em walk/crouch.

O script não altera os GLBs. Ele importa o esqueleto do personagem e os clipes
retargetados, copia a pose glTF dos nodes de animação para os bones homônimos e
encaixa a M4 entre as duas mãos. O mutante desloca somente a arma; a régua Node
recalcula as distâncias a partir das coordenadas persistidas no recibo.

Uso:
  blender --background --python tools/blender-camera-grip-evidence.py -- \
    tools/eval/asset-evidence/camera-roxa/grip
"""

import hashlib
import json
import pathlib
import shutil
import sys

import bpy
from mathutils import Vector


ROOT = pathlib.Path(__file__).resolve().parents[1]
argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
output = pathlib.Path(argv[0]).resolve() if argv else ROOT / "tools/eval/asset-evidence/camera-roxa/grip"
CHARACTER_ID = argv[1] if len(argv) > 1 else "camera-roxa"
WEAPON_ID = argv[2] if len(argv) > 2 else "m4"
WEAPON_LENGTH = float(argv[3]) if len(argv) > 3 else 0.84
# Espaço local do GLB: a P90 compacta precisa do arco dianteiro (x≈-0,20),
# enquanto a M4 usa o handguard em x≈-0,18. Ambos ficam longe da ponta ±0,50.
ANCHOR_HALF = 0.23 if WEAPON_LENGTH < 0.60 else 0.18
CHARACTER = ROOT / f"public/models/characters/{CHARACTER_ID}.glb"
WEAPON = ROOT / f"public/models/weapons/{WEAPON_ID}.glb"
ANIMS = ROOT / f"public/models/anims/{CHARACTER_ID}"
MUTANT_OFFSET = Vector((0.0, 0.18, 0.05))


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rounded(vector):
    return [round(value, 6) for value in vector]


def point_at(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def import_pose(combined, clip, frame):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(combined), import_shading="NORMALS")
    armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    character_meshes = {obj for obj in bpy.context.scene.objects if obj.type == "MESH"}
    scene = bpy.context.scene
    action = bpy.data.actions.get(clip)
    if action is None:
        raise RuntimeError(f"ação {clip} ausente no GLB combinado")
    # Blender 5 usa action slots. A importação já cria as strips; ativa a ação
    # homônima no armature para avaliar exatamente o frame pedido.
    armature.animation_data_create()
    armature.animation_data.action = action
    scene.frame_set(frame)
    bpy.context.view_layer.update()

    bpy.ops.import_scene.gltf(filepath=str(WEAPON), import_shading="NORMALS")
    weapon_meshes = [
        obj for obj in scene.objects
        if obj.type == "MESH" and obj not in character_meshes
    ]
    if len(weapon_meshes) != 1:
        raise RuntimeError(f"{WEAPON_ID} deveria importar uma malha, recebeu {len(weapon_meshes)}")
    weapon = weapon_meshes[0]

    # O runtime monta a arma na mão direita e aplica IK posicional na esquerda. Esta
    # auditoria reproduz o mesmo contrato sem importar código Three.js: mantém pernas,
    # quadril e tronco do clipe e resolve apenas as cadeias de braço até dois anchors
    # de uma M4 em comprimento real (0,84 m), num porte cruzado legível.
    chest = armature.matrix_world @ armature.pose.bones["Spine02"].matrix.translation
    right_initial = armature.matrix_world @ armature.pose.bones["RightHand"].matrix.translation
    left_initial = armature.matrix_world @ armature.pose.bones["LeftHand"].matrix.translation
    # Mantém a direção natural entre as mãos do clipe; encurta apenas a distância
    # até os anchors reais da M4, o que deixa o alvo dentro do alcance original.
    direction = (left_initial - right_initial).normalized()
    scale = WEAPON_LENGTH / 0.998046875
    anchor_half = ANCHOR_HALF
    # A mão de gatilho fica exatamente onde o clipe a deixou; isso preserva o
    # movimento autoral. Só a mão de apoio recebe IK, como no runtime.
    right_target = right_initial
    left_target = right_target + direction * (2 * anchor_half * scale)

    def ik_hand(name, forearm_name, target_position):
        target = bpy.data.objects.new(f"{name}_{clip}_IK", None)
        target.location = target_position
        scene.collection.objects.link(target)
        # O tail do antebraço coincide com o head/pulso da mão. Resolver o IK no
        # antebraço evita que o Blender leve a ponta longa do bone Hand ao anchor.
        constraint = armature.pose.bones[forearm_name].constraints.new("IK")
        constraint.target = target
        constraint.chain_count = 2
        constraint.iterations = 64
        return target

    left_ik = ik_hand("LeftHand", "LeftForeArm", left_target)
    # Alguns rigs Meshy não conectam Hand ao tail do ForeArm. Corrige essa folga
    # por iteração usando o head real da mão, sem alterar o GLB ou o clipe.
    for _ in range(12):
        bpy.context.view_layer.update()
        left_now = armature.matrix_world @ armature.pose.bones["LeftHand"].matrix.translation
        left_ik.location += left_target - left_now
    bpy.context.view_layer.update()
    right = armature.matrix_world @ armature.pose.bones["RightHand"].matrix.translation
    left = armature.matrix_world @ armature.pose.bones["LeftHand"].matrix.translation
    hand_span = (left - right).length

    # O IK do Blender converge no pulso real, mas em alguns rigs Meshy a folga
    # entre ForeArm.tail e Hand.head muda levemente a direção final. O runtime
    # monta a arma depois de avaliar a pose; faça o mesmo aqui. Usar o vetor
    # pré-IK deixava o Designer 4–5 cm fora embora as mãos estivessem separadas
    # pelos 30 cm corretos — defeito do arnês, não do GLB.
    direction = (left - right).normalized()

    # M4 tem eixo longitudinal local +X e bounds [-0,499; +0,499]. Os anchors
    # -0,18/+0,18 ficam separados por 0,303 m depois da escala real de 0,84 m.
    weapon.scale = (scale, scale, scale)
    weapon.rotation_mode = "QUATERNION"
    # Os GLBs canônicos têm a boca em -X. Alinha -X à mão de apoio e prende a
    # mão de gatilho no anchor +X; a versão anterior invertia isso na figura de
    # auditoria e punha a mão esquerda sobre a coronha.
    weapon.rotation_quaternion = Vector((1, 0, 0)).rotation_difference(-direction)
    weapon.location = right_target - weapon.rotation_quaternion @ (Vector((anchor_half, 0, 0)) * scale)
    bpy.context.view_layer.update()

    def anchors():
        return (
            weapon.matrix_world @ Vector((anchor_half, 0, 0)),
            weapon.matrix_world @ Vector((-anchor_half, 0, 0)),
        )

    right_anchor, left_anchor = anchors()
    measurement = {
        "clip": clip,
        "frame": frame,
        "handSpan": round(hand_span, 6),
        "weaponScale": round(scale, 6),
        "rightHand": rounded(right),
        "leftHand": rounded(left),
        "rightAnchor": rounded(right_anchor),
        "leftAnchor": rounded(left_anchor),
        "rightDistance": round((right_anchor - right).length, 6),
        "leftDistance": round((left_anchor - left).length, 6),
    }
    return scene, armature, character_meshes, weapon, measurement


def setup_render(scene, character_meshes, weapon):
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new("GripEvidenceWorld")
    scene.world.color = (0.025, 0.03, 0.045)

    vertices = [
        obj.matrix_world @ vertex.co
        for obj in [*character_meshes, weapon]
        for vertex in obj.data.vertices
    ]
    minimum = Vector(tuple(min(vertex[i] for vertex in vertices) for i in range(3)))
    maximum = Vector(tuple(max(vertex[i] for vertex in vertices) for i in range(3)))
    center = (minimum + maximum) * 0.5
    span = maximum - minimum

    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.data.lens = 56
    scene.camera = camera
    distance = max(span) * 1.55
    # Lado oposto ao yaw do cano: evita o escorço que transforma a M4 em volume
    # preto vertical e preserva a silhueta longitudinal no tamanho servido.
    camera.location = center + Vector((-distance * 0.62, -distance, distance * 0.18))
    point_at(camera, center + Vector((0, 0, span.z * 0.04)))

    for location, energy, size in [
        (center + Vector((-2.2, -2.5, 3.2)), 1250, 4.0),
        (center + Vector((2.4, -0.8, 1.8)), 850, 3.0),
        (center + Vector((0.0, 2.0, 2.2)), 600, 2.5),
    ]:
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        point_at(light, center)
    return camera, center, span, distance


def render(scene, path):
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


output.mkdir(parents=True, exist_ok=True)
combined = output / f"{CHARACTER_ID}-posed-source.glb"
if not combined.is_file():
    raise SystemExit(
        f"fonte combinada ausente: {combined}; rode node tools/eval/build-camera-grip-source.mjs {combined}"
    )

poses = {}
for clip, frame in (("idle", 15), ("walk", 15), ("crouch", 15)):
    scene, armature, character_meshes, weapon, measurement = import_pose(combined, clip, frame)
    camera, center, span, distance = setup_render(scene, character_meshes, weapon)
    wide = output / f"{CHARACTER_ID}-{clip}-{WEAPON_ID}.png"
    render(scene, wide)
    measurement["render"] = str(wide.relative_to(ROOT))

    if clip == "walk":
        camera.location = center + Vector((-distance * 0.52, -distance * 0.58, distance * 0.06))
        point_at(camera, (Vector(measurement["rightHand"]) + Vector(measurement["leftHand"])) * 0.5)
        clean = output / f"{CHARACTER_ID}-grip-a-{WEAPON_ID}.png"
        render(scene, clean)
        measurement["gripRender"] = str(clean.relative_to(ROOT))

        weapon.location += MUTANT_OFFSET
        bpy.context.view_layer.update()
        right_anchor = weapon.matrix_world @ Vector((ANCHOR_HALF, 0, 0))
        left_anchor = weapon.matrix_world @ Vector((-ANCHOR_HALF, 0, 0))
        measurement["mutant"] = {
            "operation": "weapon.location += [0, 0.18, 0.05]",
            "offset": rounded(MUTANT_OFFSET),
            "rightAnchor": rounded(right_anchor),
            "leftAnchor": rounded(left_anchor),
            "rightDistance": round((right_anchor - Vector(measurement["rightHand"])).length, 6),
            "leftDistance": round((left_anchor - Vector(measurement["leftHand"])).length, 6),
        }
        mutant = output / f"{CHARACTER_ID}-grip-b-mutant-{WEAPON_ID}.png"
        render(scene, mutant)
        measurement["mutant"]["render"] = str(mutant.relative_to(ROOT))
    poses[clip] = measurement

receipt = {
    "character": f"public/models/characters/{CHARACTER_ID}.glb",
    "characterSha256": sha256(CHARACTER),
    "weapon": WEAPON_ID,
    "weaponFile": f"public/models/weapons/{WEAPON_ID}.glb",
    "weaponSha256": sha256(WEAPON),
    "socketContract": {
        "triggerHand": "RightHand",
        "supportHand": "LeftHand",
        "triggerAnchorLocal": [ANCHOR_HALF, 0.0, 0.0],
        "supportAnchorLocal": [-ANCHOR_HALF, 0.0, 0.0],
        "maxHandDistanceMeters": 0.03,
    },
    "animations": {
        clip: {
            "file": f"public/models/anims/{CHARACTER_ID}/{clip}.glb",
            "sha256": sha256(ANIMS / f"{clip}.glb"),
        }
        for clip in poses
    },
    "blender": bpy.app.version_string,
    "method": f"clipe glTF importado no armature; {WEAPON_ID} em {WEAPON_LENGTH:.2f} m; mão de gatilho preservada, IK da mão de apoio e arma alinhada ao vetor final das mãos",
    "limitation": "evidência offline de asset/clipe/pegada; o porte cruzado reproduz o contrato de mount+IK, mas não substitui recaptura do runtime no browser",
    "poses": poses,
}
receipt_path = output / f"{CHARACTER_ID}-grip-evidence.json"
receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"CAMERA_GRIP_EVIDENCE={receipt_path}")
