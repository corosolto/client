"""Faca no rig K (KINEMATION): mãos do pack sobre o movimento da faca aprovada.

Entradas: checkpoint m4-final.blend (rig K, três camadas de mão, câmera) e os alvos
de knife-k-alvos.mjs (faca e palmas da faca L, no espaço de câmera do jogo). A faca
segue a trajetória aprovada; cada mão K é levada por IK de dois ossos até a palma
correspondente, na escala em que a palma K tem o tamanho de tela da palma L. A
câmera recua o necessário para os alvos ficarem ao alcance do braço. Inspect é
novo: a lâmina gira na mão em torno do próprio eixo e volta ao idle.
Produtos ficam fora do Git.
"""
from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

M4_SHA = "e4b3fdfcbc6ba4f259fe349d12c58759efdd2669d84056a4c643f6d66359a0fe"
CLIPS = ("Idle", "Draw", "Slash", "Stab", "QuickThrust", "HeavyStab")
INSPECT_SECONDS = 2.2
REACH_MAX = 0.93
SHOULDER_DROP = float(next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--ombro=")), "-0.18"))


def argument(name: str) -> Path:
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    value = next((item.split("=", 1)[1] for item in argv if item.startswith(f"--{name}=")), "")
    return Path(value).expanduser().resolve()


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def m4x4(elements) -> Matrix:
    # three.js grava coluna a coluna.
    return Matrix([[elements[c * 4 + r] for c in range(4)] for r in range(4)])


m4_source = argument("m4-source")
alvos_path = argument("alvos")
faca_path = argument("faca")
# Mão aberta: pose da mão esquerda apontando no throw_loop da granada K (mesmo rig).
granada_path = argument("granada")
output_dir = argument("output-dir")
if digest(m4_source) != M4_SHA:
    raise RuntimeError("checkpoint M4 ausente ou divergente")
output_dir.mkdir(parents=True, exist_ok=True)
alvos = json.loads(alvos_path.read_text())

bpy.ops.wm.open_mainfile(filepath=str(m4_source), load_ui=False)
scene = bpy.context.scene
fps = alvos["fps"]
scene.render.fps = fps
arm = bpy.data.objects["RIG_FP_ARMS"]
package = bpy.data.objects["VM_PACKAGE_M4"]
camera = bpy.data.objects["VIEWMODEL_CAMERA"]
weapon = bpy.data.objects["MINT_WEAPON_M4"]

# Pose de referência: idle da M4 (coluna, clavículas, dedos).
for owner in (arm, package, weapon):
    for track in (owner.animation_data.nla_tracks if owner.animation_data else []):
        track.mute = track.name != "idle"
scene.frame_set(1)
scene.frame_set(0)
bpy.context.view_layer.update()
idle_basis = {pb.name: pb.matrix_basis.copy() for pb in arm.pose.bones}

for obj in [weapon, *weapon.children_recursive]:
    bpy.data.objects.remove(obj, do_unlink=True)
for obj in list(scene.objects):
    if obj.type == "LIGHT":
        bpy.data.objects.remove(obj, do_unlink=True)
for owner in (arm, package):
    if owner.animation_data:
        for track in list(owner.animation_data.nla_tracks):
            owner.animation_data.nla_tracks.remove(track)
        owner.animation_data.action = None
for obj in scene.objects:
    keys = obj.data.shape_keys if obj.type == "MESH" else None
    if keys and keys.animation_data:
        keys.animation_data_clear()
package.name = "VM_PACKAGE_KNIFE"
with bpy.data.libraries.load(str(granada_path), link=False) as (source, target):
    target.actions = [name for name in source.actions if name == "RIG_FP_ARMS_throw_loop"]
if not target.actions:
    raise RuntimeError("throw_loop da granada K ausente")
open_action = target.actions[0]
arm.animation_data.action = open_action
if open_action.slots:
    arm.animation_data.action_slot = open_action.slots[0]
scene.frame_set(2)
scene.frame_set(1)
bpy.context.view_layer.update()
open_basis = {pb.name: pb.matrix_basis.copy() for pb in arm.pose.bones}
arm.animation_data.action = None
# O saque da M4 (HOLD) deixava o pacote fora do neutro; a faca nasce do pacote neutro.
package.matrix_world = Matrix.Identity(4)
package.rotation_mode = "QUATERNION"

# Dedos: mão direita fecha no cabo (indicador copia o médio); esquerda abre em guarda.
grip = dict(idle_basis)
for joint in ("01", "02", "03"):
    grip[f"index_{joint}_r"] = idle_basis[f"middle_{joint}_r"].copy()
for name in list(grip):
    if name.endswith("_l") and name.split("_")[0] in ("index", "middle", "ring", "pinky", "thumb"):
        grip[name] = open_basis[name].copy()
for pb in arm.pose.bones:
    pb.matrix_basis = grip[pb.name]
bpy.context.view_layer.update()

# Câmera da faca aprovada: VFOV e aspecto do knife-hires.glb.
cam_data = camera.data
cam_data.sensor_fit = "VERTICAL"
cam_data.angle_y = alvos["camera"]["yfov"]
cam_data.clip_start = 0.01
scene.render.resolution_x = 1440
scene.render.resolution_y = round(1440 / alvos["camera"]["aspect"])
camera.name = "VIEWMODEL_CAMERA"


def head(name: str) -> Vector:
    return arm.matrix_world @ arm.pose.bones[name].head


def palm_frame(side: str) -> Matrix:
    wrist, middle = head(f"hand_{side}"), head(f"middle_01_{side}")
    x = (middle - wrist).normalized()
    lateral = head(f"index_01_{side}") - head(f"pinky_01_{side}")
    y = (lateral - x * lateral.dot(x)).normalized()
    z = x.cross(y)
    frame = Matrix((x, y, z)).transposed().to_4x4()
    frame.translation = (wrist + middle) * 0.5
    return frame


palm_k = {side: palm_frame(side) for side in ("r", "l")}
hand_offset = {side: palm_k[side].inverted() @ (arm.matrix_world @ arm.pose.bones[f"hand_{side}"].matrix) for side in ("r", "l")}
palm_len_k = (head("middle_01_r") - head("hand_r")).length
# Tamanho de tela: palma K = palma L × MAO_TELA (o braço K é curto demais para os
# alvos da faca L na escala 1:1; a mão fica um pouco maior na tela que a da faca L).
MAO_TELA = float(next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--mao-tela=")), "1.35"))
scale_k = palm_len_k / alvos["palmLength"]["r"] / MAO_TELA
shoulder = {side: head(f"upperarm_{side}") for side in ("r", "l")}
# Comprimento do osso importado do FBX não é a distância entre juntas: mede pelas cabeças.
reach = {side: (head(f"lowerarm_{side}") - head(f"upperarm_{side}")).length + (head(f"hand_{side}") - head(f"lowerarm_{side}")).length
         for side in ("r", "l")}


def scaled(frame: Matrix) -> Matrix:
    out = frame.copy()
    out.translation = frame.translation * scale_k
    return out


def knife_scaled(matrix: Matrix) -> Matrix:
    return Matrix.Scale(scale_k, 4) @ matrix


# Inspect sintético a partir do Idle: gira faca + palma direita no eixo da lâmina.
idle0 = alvos["clips"]["Idle"]["frames"][0]
k0, r0 = m4x4(idle0["knife"]), m4x4(idle0["r"])
blade = k0.to_3x3() @ Vector((0, 0, 1))
blade.normalize()
inspect_frames = []
count = round(INSPECT_SECONDS * fps)
for frame in range(count + 1):
    t = frame / count
    ease = 0.5 - 0.5 * math.cos(2 * math.pi * t)
    turn = math.radians(115) * math.sin(math.pi * min(1.0, t / 0.55)) if t < 0.55 else math.radians(-70) * math.sin(math.pi * (t - 0.55) / 0.45)
    pivot = r0.translation
    motion = (Matrix.Translation(Vector((-0.12, 0.10, 0.06)) * ease)
              @ Matrix.Translation(pivot) @ Matrix.Rotation(turn, 4, blade)
              @ Matrix.Rotation(math.radians(-25) * ease, 4, Vector((0, 0, 1))) @ Matrix.Translation(-pivot))
    inspect_frames.append({"time": frame / fps, "knife": motion @ k0, "r": motion @ r0, "l": m4x4(idle0["l"])})
clip_frames = {name: [{"time": f["time"], "knife": m4x4(f["knife"]), "r": m4x4(f["r"]), "l": m4x4(f["l"])}
                      for f in alvos["clips"][name]["frames"]] for name in CLIPS}
clip_frames["Inspect"] = inspect_frames

# Câmera: recua/desloca no próprio referencial até todo alvo ficar ao alcance do braço.
cam_rest = camera.matrix_world.copy()


def worst_reach(cam: Matrix) -> float:
    worst = 0.0
    for frames in clip_frames.values():
        for f in frames:
            for side in ("r", "l"):
                wrist = (cam @ scaled(f[side]) @ hand_offset[side]).translation
                worst = max(worst, (wrist - shoulder[side]).length / reach[side])
    return worst


cam_inv = cam_rest.inverted()
# Ponto de partida: ombros ~22 cm abaixo e à frente do plano da câmera, centrados.
mid = cam_inv @ ((shoulder["r"] + shoulder["l"]) * 0.5)
base = mid - Vector((0.05, -0.22, 0.02))
half_v = math.tan(alvos["camera"]["yfov"] / 2)


def shoulder_hidden(cam: Matrix) -> bool:
    # Ombro abaixo do olho e não à frente dele: senão a boca da manga entra no quadro
    # quando o braço sobe (visto no HeavyStab com o ombro na altura da câmera).
    inv = cam.inverted()
    return all((inv @ shoulder[side]).y <= SHOULDER_DROP and (inv @ shoulder[side]).z >= -0.06 for side in ("r", "l"))


best = None
steps = [i * 0.04 for i in range(-5, 6)]
for dx in steps:
    for dy in steps:
        for dz in steps:
            shift = base + Vector((dx, dy, dz))
            cam = cam_rest @ Matrix.Translation(shift)
            if not shoulder_hidden(cam):
                continue
            score = worst_reach(cam)
            key = (max(0.0, score - REACH_MAX), abs(score - 0.82))
            if best is None or key < best[0]:
                best = (key, cam, score, tuple(shift))
# Fora do alcance o braço estica ao máximo e a faca acompanha a mão real (abaixo);
# o relatório conta quantos quadros ficaram assim.
camera.matrix_world = best[1]
cam_world = best[1].copy()
bpy.context.view_layer.update()

# Faca: malha da faca aprovada, sem skin.
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(faca_path))
imported = [obj for obj in bpy.data.objects if obj not in before]
knife = next(obj for obj in imported if obj.type == "MESH")
for obj in imported:
    if obj is not knife:
        bpy.data.objects.remove(obj, do_unlink=True)
knife.parent = None
knife.name = "MELEE_KNIFE"
knife.rotation_mode = "QUATERNION"
# Vértice importado v_b; a matriz amostrada no three espera v_g = G·v_b.
gltf_from_blender = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))

# IK analítico de dois ossos (o IK do Blender mira a CAUDA do antebraço, que no FBX
# do pack fica a 34 cm do punho). Mão = palma alvo · offset anatômico K; o cotovelo
# vai para o plano do polo, abaixo e para fora.
cam_right = cam_world.to_3x3() @ Vector((1, 0, 0))
cam_down = cam_world.to_3x3() @ Vector((0, -1, 0))
arm_inv = arm.matrix_world.inverted()
seg = {side: ((head(f"lowerarm_{side}") - head(f"upperarm_{side}")).length,
              (head(f"hand_{side}") - head(f"lowerarm_{side}")).length) for side in ("r", "l")}
rest_basis = {pb.name: pb.matrix_basis.copy() for pb in arm.pose.bones}


def world_of(name: str) -> Matrix:
    return arm.matrix_world @ arm.pose.bones[name].matrix


def set_world(name: str, matrix: Matrix) -> None:
    arm.pose.bones[name].matrix = arm_inv @ matrix
    bpy.context.view_layer.update()


def rotate_about(name: str, pivot: Vector, rotation: Quaternion) -> None:
    turn = Matrix.Translation(pivot) @ rotation.to_matrix().to_4x4() @ Matrix.Translation(-pivot)
    set_world(name, turn @ world_of(name))


def solve(side: str, hand_target: Matrix) -> float:
    for part in ("upperarm", "lowerarm", "hand", "lowerarm_twist_01"):
        arm.pose.bones[f"{part}_{side}"].matrix_basis = grip[f"{part}_{side}"]
    bpy.context.view_layer.update()
    s_pos = head(f"upperarm_{side}")
    a, b = seg[side]
    target = hand_target.translation
    to_target = target - s_pos
    d = min(max(to_target.length, abs(a - b) + 1e-4), a + b - 1e-4)
    direction = to_target.normalized()
    outward = cam_right * (1 if side == "r" else -1)
    pole = (s_pos + target) * 0.5 + cam_down * 0.35 + outward * 0.25
    bend = (pole - s_pos) - direction * (pole - s_pos).dot(direction)
    bend = bend.normalized() if bend.length > 1e-6 else cam_down
    alpha = math.acos(max(-1.0, min(1.0, (a * a + d * d - b * b) / (2 * a * d))))
    elbow = s_pos + (direction * math.cos(alpha) + bend * math.sin(alpha)) * a
    current_elbow = head(f"lowerarm_{side}")
    rotate_about(f"upperarm_{side}", s_pos, (current_elbow - s_pos).rotation_difference(elbow - s_pos))
    e_pos = head(f"lowerarm_{side}")
    rotate_about(f"lowerarm_{side}", e_pos, (head(f"hand_{side}") - e_pos).rotation_difference(target - e_pos))
    wrist = head(f"hand_{side}")
    aligned = hand_target.copy()
    aligned.translation = wrist
    set_world(f"hand_{side}", aligned)
    # Metade da torção do punho no osso de torção do antebraço (evita "papel de bala").
    lower = world_of(f"lowerarm_{side}").to_quaternion()
    relative = lower.inverted() @ world_of(f"hand_{side}").to_quaternion()
    axis = Vector((0, 1, 0))
    projected = Vector((relative.x, relative.y, relative.z)).project(axis)
    twist = Quaternion((relative.w, projected.x, projected.y, projected.z)).normalized()
    pb_twist = arm.pose.bones[f"lowerarm_twist_01_{side}"]
    pb_twist.matrix_basis = grip[pb_twist.name] @ Quaternion().slerp(twist, 0.5).to_matrix().to_4x4()
    bpy.context.view_layer.update()
    return (head(f"hand_{side}") - target).length


BAKED = [f"{part}_{side}" for side in ("r", "l") for part in ("upperarm", "lowerarm", "hand", "lowerarm_twist_01")]
samples = {}
misses = []
for name, frames in clip_frames.items():
    rows = []
    for f in frames:
        wanted = {side: cam_world @ scaled(f[side]) @ hand_offset[side] for side in ("r", "l")}
        for side in ("r", "l"):
            misses.append(solve(side, wanted[side]))
        row = {bone: arm.pose.bones[bone].matrix_basis.copy() for bone in BAKED}
        # A faca guarda a relação mão→faca da faca aprovada, aplicada à mão K real.
        knife_world = world_of("hand_r") @ wanted["r"].inverted() @ cam_world @ knife_scaled(f["knife"]) @ gltf_from_blender
        rows.append((f["time"], row, knife_world))
    samples[name] = rows


def push(owner, action, name):
    track = owner.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 0, action)
    if getattr(strip, "action_slot", True) is None:
        strip.action_slot = action.slots[0]
    strip.extrapolation = "NOTHING"
    owner.animation_data.action = None


for owner in (arm, knife):
    if not owner.animation_data:
        owner.animation_data_create()
for name, rows in samples.items():
    arm.animation_data.action = bpy.data.actions.new(f"{name}__RIG_FP_ARMS")
    knife.animation_data.action = bpy.data.actions.new(f"{name}__MELEE_KNIFE")
    for time, row, knife_world in rows:
        frame = time * fps
        for pb in arm.pose.bones:
            pb.rotation_mode = "QUATERNION"
            pb.matrix_basis = row.get(pb.name, grip[pb.name])
            pb.keyframe_insert("location", frame=frame, group=pb.name)
            pb.keyframe_insert("rotation_quaternion", frame=frame, group=pb.name)
            pb.keyframe_insert("scale", frame=frame, group=pb.name)
        knife.matrix_world = knife_world
        knife.keyframe_insert("location", frame=frame)
        knife.keyframe_insert("rotation_quaternion", frame=frame)
        knife.keyframe_insert("scale", frame=frame)
    push(arm, arm.animation_data.action, name)
    push(knife, knife.animation_data.action, name)

for pb in arm.pose.bones:
    pb.matrix_basis = grip[pb.name]
scene.frame_set(0)
bpy.context.view_layer.update()

# meleevm.js mostra o pacote ×0,0135 e deslocado (enquadramento aprovado da faca L).
# O GLB sai nessas mesmas unidades: o runtime desfaz exatamente esta raiz.
offset = Vector(alvos["packageOffset"])
units = bpy.data.objects.new("VM_KNIFE_UNITS", None)
scene.collection.objects.link(units)
units.matrix_world = cam_world @ Matrix.Scale(1 / alvos["packageScale"], 4) @ Matrix.Translation(-offset) @ cam_world.inverted()
for obj in (package, knife):
    world = obj.matrix_world.copy()
    obj.parent = units
    obj.matrix_parent_inverse = Matrix.Identity(4)
    if obj is package:
        obj.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()

blend = output_dir / "knife-k.blend"
glb = output_dir / "knife-k-raw.glb"
bpy.ops.wm.save_as_mainfile(filepath=str(blend), check_existing=False)
bpy.ops.export_scene.gltf(
    filepath=str(glb), export_format="GLB", export_cameras=True, export_lights=False,
    export_animations=True, export_animation_mode="NLA_TRACKS", export_merge_animation="NLA_TRACK",
    export_skins=True, export_materials="EXPORT", export_image_format="WEBP", export_image_quality=82,
    export_yup=True, export_force_sampling=True, export_optimize_animation_size=True,
    export_optimize_animation_keep_anim_armature=True, export_optimize_animation_keep_anim_object=True,
    export_frame_range=False,
)
report = {
    "schemaVersion": 1, "weapon": "knife",
    "sources": {"rigHands": M4_SHA, "motion": alvos["sourceSha256"]},
    "reachOver": round(sum(1 for m in misses if m > 0.01) / len(misses), 4),
    "scale": round(scale_k, 5), "cameraShift": [round(v, 3) for v in best[3]], "worstReach": round(best[2], 3),
    "ikMissMaxM": round(max(misses), 5), "ikMissMeanM": round(sum(misses) / len(misses), 5),
    "clips": {name: len(rows) for name, rows in samples.items()},
    "products": {"blend": {"bytes": blend.stat().st_size, "sha256": digest(blend)},
                 "glb": {"bytes": glb.stat().st_size, "sha256": digest(glb)}},
}
(output_dir / "build.json").write_text(json.dumps(report, indent=2) + "\n")
print("KNIFE_K_OK " + json.dumps(report, separators=(",", ":")))
