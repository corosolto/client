"""Reautora a AK pública sobre o rig KINEMATION (K), mesma receita da M92/AKM.

A AK servida era o golden `ak-hires.glb` (esqueleto `*_metarig`, outro atlas de
mão). Esta receita abre o checkpoint final da M4, preserva rig, as três camadas de
mão e as seis ações, e troca apenas as malhas da arma pela `ak.glb` pública.

A AK é soldada antes do corte. Pente curvo (corpo, nervura lateral e base), trava
do pente e manivela de ferrolho são ilhas topológicas congeladas por assinatura.
O pente herda as recargas KINEMATION, a trava é pressionada nas duas recargas e a
manivela corre só na recarga vazia. Produtos continuam fora do Git.
"""
from __future__ import annotations

import bmesh
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

M4_SHA = "e4b3fdfcbc6ba4f259fe349d12c58759efdd2669d84056a4c643f6d66359a0fe"
AK_SHA = "aae400d6e93372ddd0e138b6ac24b2cd4b8efc7cd0169483ac0755703a456eca"
COMPRIMENTO_ALVO = 0.88


def argument(name: str) -> Path:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    value = next((item.split("=", 1)[1] for item in argv if item.startswith(f"--{name}=")), "")
    return Path(value).expanduser().resolve()


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def components(mesh: bpy.types.Mesh) -> list[list[int]]:
    adjacency = [set() for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        adjacency[a].add(b)
        adjacency[b].add(a)
    seen: set[int] = set()
    result: list[list[int]] = []
    for start in range(len(mesh.vertices)):
        if start in seen:
            continue
        stack = [start]
        seen.add(start)
        group: list[int] = []
        while stack:
            index = stack.pop()
            group.append(index)
            for neighbor in adjacency[index]:
                if neighbor not in seen:
                    seen.add(neighbor)
                    stack.append(neighbor)
        result.append(group)
    return result


def subset(source: bpy.types.Mesh, keep: set[int], name: str) -> bpy.types.Mesh:
    result = source.copy()
    result.name = name
    bm = bmesh.new()
    bm.from_mesh(result)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[vertex for vertex in bm.verts if vertex.index not in keep], context="VERTS")
    bm.to_mesh(result)
    bm.free()
    return result


def without(source: bpy.types.Mesh, remove: set[int], name: str) -> bpy.types.Mesh:
    result = source.copy()
    result.name = name
    bm = bmesh.new()
    bm.from_mesh(result)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[vertex for vertex in bm.verts if vertex.index in remove], context="VERTS")
    bm.to_mesh(result)
    bm.free()
    return result


def push_nla(owner: bpy.types.Object, name: str) -> None:
    action = owner.animation_data.action
    if action is None:
        raise RuntimeError(f"ação {name} não foi criada em {owner.name}")
    action.name = f"{name}__{owner.name}"
    track = owner.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 0, action)
    if getattr(strip, "action_slot", True) is None:
        strip.action_slot = action.slots[0]
    owner.animation_data.action = None


m4_source = argument("m4-source")
ak_source = argument("ak-source")
output_dir = argument("output-dir")
if digest(m4_source) != M4_SHA or digest(ak_source) != AK_SHA:
    raise RuntimeError("fonte M4/AK ausente ou divergente")
if not output_dir.is_absolute() or "worktrees/viewmodels-catalog-final" in str(output_dir):
    raise RuntimeError("output-dir deve ficar fora do Git")
output_dir.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(m4_source), load_ui=False)
scene = bpy.context.scene
body = bpy.data.objects["MINT_WEAPON_M4"]
magazine = bpy.data.objects["MINT_WEAPON_M4_MAG"]
package = bpy.data.objects["VM_PACKAGE_M4"]

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(ak_source))
imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
if len(imported) != 1:
    raise RuntimeError(f"AK deveria conter uma malha; encontrou {len(imported)}")
source_object = imported[0]
welded = source_object.data.copy()
bm = bmesh.new()
bm.from_mesh(welded)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-5)
bm.to_mesh(welded)
bm.free()

# Assinaturas medidas na fonte soldada (ilhas, contagem e caixa em metros, boca +X).
mag_ids: set[int] = set()
handle_ids: set[int] = set()
release_ids: set[int] = set()
for group in components(welded):
    points = [welded.vertices[index].co for index in group]
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    if (len(group) in (192, 137, 32) and minimum.x > -0.08 and maximum.x < 0.11
            and maximum.z < 0.065 and minimum.z < -0.09):
        mag_ids.update(group)
    if (len(group) == 39 and minimum.y < -0.03 and maximum.y < 0.0
            and 0.10 < minimum.z < 0.105 and maximum.z < 0.115):
        handle_ids.update(group)
    if (len(group) == 23 and -0.081 < minimum.x < -0.078 and maximum.x < -0.073
            and 0.0 < minimum.z < 0.006 and maximum.z < 0.036):
        release_ids.update(group)
if len(mag_ids) != 361 or len(handle_ids) != 39 or len(release_ids) != 23:
    raise RuntimeError(f"seleção AK divergente: mag={len(mag_ids)} handle={len(handle_ids)} release={len(release_ids)}")

body_mesh = without(welded, mag_ids | handle_ids | release_ids, "MINT_WEAPON_AK_BODY_MESH")
mag_mesh = subset(welded, mag_ids, "MINT_WEAPON_AK_MAG_MESH")
handle_mesh = subset(welded, handle_ids, "MINT_CHARGING_AK_MESH")
release_mesh = subset(welded, release_ids, "MINT_MAG_RELEASE_AK_MESH")

# A AK pública aponta a boca para +X; o pacote KINEMATION aponta para -X.
# A escala do objeto M4 (0,841643...) já faz parte dos tracks herdados.
raw_corners = [Vector(corner) for corner in source_object.bound_box]
raw_length = max(
    max(corner[axis] for corner in raw_corners) - min(corner[axis] for corner in raw_corners)
    for axis in range(3)
)
scale_factor = (COMPRIMENTO_ALVO / raw_length) / body.scale.x
fit = Matrix.Rotation(math.pi, 4, "Z") @ Matrix.Scale(scale_factor, 4)
for mesh in (body_mesh, mag_mesh, handle_mesh, release_mesh):
    mesh.transform(fit)

materials = list(welded.materials)
body.data = body_mesh
body.name = "MINT_WEAPON_AK"
magazine.data = mag_mesh
magazine.name = "MINT_WEAPON_AK_MAG"
for mesh in (body_mesh, mag_mesh, handle_mesh, release_mesh):
    mesh.materials.clear()
    for material in materials:
        mesh.materials.append(material)

handle = bpy.data.objects.new("MINT_CHARGING_AK", handle_mesh)
scene.collection.objects.link(handle)
handle.parent = body
handle.location = (0.0, 0.0, 0.0)
handle.rotation_mode = "QUATERNION"

# O curso ocorre depois de inserir o pente vazio. Frames inicial e final são
# idênticos para não causar pop no retorno ao idle.
for frame, offset in ((0, 0.0), (45, 0.0), (52, 0.045 / body.scale.x),
                      (60, 0.0), (72, 0.0)):
    scene.frame_set(frame)
    handle.location = (offset, 0.0, 0.0)
    handle.keyframe_insert("location", frame=frame, group=handle.name)
push_nla(handle, "reload_empty")

# Trava do pente: a pá vai para a frente (-X depois da rotação) quando a mão de
# apoio agarra o pente, no mesmo tempo da AKM.
release = bpy.data.objects.new("MINT_MAG_RELEASE_AK", release_mesh)
scene.collection.objects.link(release)
release.parent = body
release.location = (0.0, 0.0, 0.0)
release.rotation_mode = "QUATERNION"
for clip_name in ("reload_tactical", "reload_empty"):
    for frame, offset in ((0, 0.0), (10, 0.0), (15, -0.005 / body.scale.x),
                          (21, 0.0), (72, 0.0)):
        scene.frame_set(frame)
        release.location = (offset, 0.0, 0.0)
        release.keyframe_insert("location", frame=frame, group=release.name)
    push_nla(release, clip_name)

bpy.data.objects.remove(source_object, do_unlink=True)

# Sockets derivados do produto final. Após a rotação, -X é a boca e +X a
# culatra; o sight fica sobre a metade traseira do receiver.
bpy.context.view_layer.update()
corners = [Vector(corner) for corner in body.bound_box]
minimum = Vector(tuple(min(corner[axis] for corner in corners) for axis in range(3)))
maximum = Vector(tuple(max(corner[axis] for corner in corners) for axis in range(3)))
muzzle = next((child for child in body.children if child.name == "SOCKET_MINT_MUZZLE"), None)
sight = next((child for child in body.children if child.name == "SOCKET_MINT_SIGHT"), None)
if not muzzle or not sight:
    raise RuntimeError("sockets herdados do pacote M4 ausentes")
muzzle.location = (minimum.x, (minimum.y + maximum.y) / 2, (minimum.z + maximum.z) * 0.52)
sight.location = (maximum.x - (maximum.x - minimum.x) * 0.30,
                  (minimum.y + maximum.y) / 2,
                  maximum.z - 0.035 / body.scale.x)

package.name = "VM_PACKAGE_AK"
scene.camera.name = "VIEWMODEL_CAMERA"

# Coice: o shoot herdado da M4 move o pacote 3° / 2 cm e a AK golden aprovada
# anda ~3,7× mais na tela (recsim no jogo: 153 px contra 41 px em 3:2). O delta de
# cada canal do pacote em relação ao primeiro key é multiplicado por KICK.
KICK = 3.5


def action_fcurves(action: bpy.types.Action):
    if hasattr(action, "layers") and action.layers:
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    yield from bag.fcurves
    else:
        yield from action.fcurves


shoot_actions = {strip.action for track in (package.animation_data.nla_tracks if package.animation_data else [])
                 for strip in track.strips if track.name == "shoot" or strip.name == "shoot"}
if len(shoot_actions) != 1:
    raise RuntimeError(f"ação shoot do pacote ausente ou ambígua: {len(shoot_actions)}")
amplified = 0
for fcurve in action_fcurves(next(iter(shoot_actions))):
    if fcurve.data_path not in ("location", "rotation_quaternion", "rotation_euler"):
        continue
    points = fcurve.keyframe_points
    if len(points) < 2:
        continue
    base = points[0].co[1]
    for point in points:
        delta = point.co[1] - base
        point.co[1] = base + delta * KICK
        point.handle_left[1] = base + (point.handle_left[1] - base) * KICK
        point.handle_right[1] = base + (point.handle_right[1] - base) * KICK
    fcurve.update()
    amplified += 1
if amplified == 0:
    raise RuntimeError("shoot do pacote sem canais de transform")

# O exporter escolhe o transform-base do node no frame inicial, quando vários
# strips do pacote se sobrepõem. Idle e recargas antes não tinham canal do
# package e, no glTF, herdavam a pose inicial do saque. Um canal constante por
# clip torna o estado neutro explícito e elimina essa dependência do exporter.
for clip_name, end_frame in (("idle", 1), ("reload_tactical", 72), ("reload_empty", 72)):
    if package.animation_data:
        package.animation_data.action = None
        for track in package.animation_data.nla_tracks:
            track.mute = True
    for frame in (0, end_frame):
        scene.frame_set(frame)
        package.location = (0.0, 0.0, 0.0)
        package.rotation_mode = "QUATERNION"
        package.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
        package.scale = (1.0, 1.0, 1.0)
        package.keyframe_insert("location", frame=frame, group=package.name)
        package.keyframe_insert("rotation_quaternion", frame=frame, group=package.name)
        package.keyframe_insert("scale", frame=frame, group=package.name)
    push_nla(package, clip_name)

scene.frame_set(72)
# O arquivo M4 guarda os strips de shoot/inspect/equip com extrapolação HOLD.
# Ao abrir o .blend em batch, o primeiro key do saque podia virar o transform
# base do node e fazer idle nascer fora do enquadramento. Neutralizamos o root
# com os strips mudos e depois usamos NOTHING fora de cada janela de ação.
if package.animation_data:
    package.animation_data.action = None
    for track in package.animation_data.nla_tracks:
        track.mute = True
package.matrix_world = Matrix.Identity(4)
package.rotation_mode = "QUATERNION"
bpy.context.view_layer.update()
if package.animation_data:
    for track in package.animation_data.nla_tracks:
        for strip in track.strips:
            strip.extrapolation = "NOTHING"
        track.mute = False
for part in (handle, release):
    part.location = (0.0, 0.0, 0.0)
    if part.animation_data:
        part.animation_data.action = None
        for track in part.animation_data.nla_tracks:
            for strip in track.strips:
                strip.extrapolation = "NOTHING"
            track.mute = False
bpy.context.view_layer.update()

blend = output_dir / "ak-final.blend"
glb = output_dir / "ak-baked-runtime.glb"
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
    "schemaVersion": 1,
    "weapon": "ak",
    "ready": False,
    "sources": {"arHandsActions": M4_SHA, "body": AK_SHA},
    "selection": {
        "weldedVertices": len(welded.vertices),
        "bodyVertices": len(body_mesh.vertices),
        "magVertices": len(mag_ids),
        "handleVertices": len(handle_ids),
        "releaseVertices": len(release_ids),
        "shootKick": KICK,
    },
    "scale": round(scale_factor, 6),
    "products": {
        "blend": {"bytes": blend.stat().st_size, "sha256": digest(blend)},
        "glb": {"bytes": glb.stat().st_size, "sha256": digest(glb)},
    },
    "mechanism": "complete curved rock-in magazine, real magazine-catch press and right-side charging handle on empty reload over KINEMATION rig",
}
(output_dir / "build.json").write_text(json.dumps(report, indent=2) + "\n")
print("AK_KINEMATION_OK " + json.dumps(report, separators=(",", ":")))
