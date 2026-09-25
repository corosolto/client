"""Reauthor MD97 over the validated AR hands/action foundation.

Only the rig/action grammar is inherited from M4. The body is the public MD97
mesh and the missing 20-round magazine is rebuilt from the game's measured
declarative specification. Products remain outside Git.
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

M4_SOURCE_SHA = "e4b3fdfcbc6ba4f259fe349d12c58759efdd2669d84056a4c643f6d66359a0fe"
MD97_SOURCE_SHA = "16dd73c34583cd96ec6bfe71771ad32fe98caadf3966bb70f15c6d43d67ec9d5"


def argument(name: str) -> Path:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    prefix = f"--{name}="
    value = next((item[len(prefix) :] for item in argv if item.startswith(prefix)), "")
    return Path(value).expanduser().resolve()


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(block)
    return hasher.hexdigest()


m4_source = argument("m4-source")
md97_source = argument("md97-source")
output_dir = argument("output-dir")
if digest(m4_source) != M4_SOURCE_SHA or digest(md97_source) != MD97_SOURCE_SHA:
    raise RuntimeError("fonte M4 ou MD97 ausente/divergente")
if not output_dir.is_absolute() or "worktrees/viewmodels-catalog-final" in str(output_dir):
    raise RuntimeError("output-dir precisa ficar fora da worktree pública")
output_dir.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(m4_source), load_ui=False)
scene = bpy.context.scene
gun = bpy.data.objects["MINT_WEAPON_M4"]
mag = bpy.data.objects["MINT_WEAPON_M4_MAG"]
package = bpy.data.objects["VM_PACKAGE_M4"]

# Importa só a malha pública própria; nenhuma animação/peça do M4 é confundida
# com identidade MD97.
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(md97_source))
imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
if len(imported) != 1:
    raise RuntimeError(f"MD97 deveria conter uma malha; encontrou {len(imported)}")
body = imported[0]
mesh = body.data.copy()
# Raw M4 aponta -X e raw MD97 +X (yaw 90 vs 270 no contrato do jogo).
mesh.transform(Matrix.Scale(-1.0, 4, Vector((1, 0, 0))))
# Os clipes herdados escrevem a escala constante 0,841643 do root M4. A razão
# abaixo vai para os vértices, portanto nenhum clipe pode reencolher a MD97.
mesh.transform(Matrix.Scale(0.915 / 0.8416434526443481, 4))
gun.data = mesh
for material in list(gun.data.materials):
    if material is None:
        raise RuntimeError("material MD97 ausente")
# len 1,05 e vm 0,87 resultam em ~0,9135 m no maior eixo visível.
gun.name = "MINT_WEAPON_MD97"
bpy.data.objects.remove(body, do_unlink=True)

# MAG.md97 transportado de public/js/weapons.js. Conversão Three gun-space
# (x lateral, y vertical, z cano) -> Blender raw local (Y, Z, -X).
bm = bmesh.new()
scale = gun.scale.x
for spec in [
    {"w": 0.040, "h": 0.150, "d": 0.074, "y": -0.050, "z": 0.040, "rake": -7},
    {"w": 0.046, "h": 0.014, "d": 0.082, "y": -0.121, "z": 0.049, "rake": -7},
]:
    geom = bmesh.ops.create_cube(bm, size=1.0)
    verts = geom["verts"]
    dims = Vector((spec["d"] / scale, spec["w"] / scale, spec["h"] / scale))
    center = Vector((-spec["z"] / scale, 0.009 / scale, spec["y"] / scale))
    transform = (Matrix.Translation(center)
                 @ Matrix.Rotation(math.radians(spec["rake"]), 4, "Y")
                 @ Matrix.Diagonal((*dims, 1.0)))
    bmesh.ops.transform(bm, matrix=transform, verts=verts)
mag_mesh = bpy.data.meshes.new("MINT_WEAPON_MD97_MAG_MESH")
bm.to_mesh(mag_mesh)
bm.free()
mag.data = mag_mesh
mag.name = "MINT_WEAPON_MD97_MAG"
mag.data.materials.clear()
material = bpy.data.materials.get("MD97 Magazine") or bpy.data.materials.new("MD97 Magazine")
material.diffuse_color = (0.023, 0.026, 0.031, 1.0)
material.metallic = 0.48
material.roughness = 0.58
mag.data.materials.append(material)

# Atualiza sockets pela caixa da arma própria. -X é boca; +X é traseira.
corners = [Vector(point) for point in gun.bound_box]
minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
muzzle = next((child for child in gun.children if child.name == "SOCKET_MINT_MUZZLE"), None)
sight = next((child for child in gun.children if child.name == "SOCKET_MINT_SIGHT"), None)
if not muzzle or not sight:
    raise RuntimeError("sockets herdados ausentes")
muzzle.location = (minimum.x, (minimum.y + maximum.y) * 0.5, (minimum.z + maximum.z) * 0.54)
sight.location = (maximum.x - (maximum.x - minimum.x) * 0.22,
                  (minimum.y + maximum.y) * 0.5, maximum.z - 0.06 / scale)
muzzle.name = "SOCKET_MINT_MUZZLE"
sight.name = "SOCKET_MINT_SIGHT"
package.name = "VM_PACKAGE_MD97"
scene.camera.name = "VIEWMODEL_CAMERA"

scene.frame_set(72)
package.matrix_world = Matrix.Identity(4)
bpy.context.view_layer.update()
blend = output_dir / "md97-final.blend"
glb = output_dir / "md97-baked-runtime.glb"
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
    "schemaVersion": 1, "weapon": "md97", "ready": False,
    "sources": {"arHandsActions": {"sha256": M4_SOURCE_SHA}, "body": {"sha256": MD97_SOURCE_SHA}},
    "products": {
        "blend": {"bytes": blend.stat().st_size, "sha256": digest(blend)},
        "glb": {"bytes": glb.stat().st_size, "sha256": digest(glb)},
    },
    "mechanism": "20-round front detachable magazine; empty inherits bolt-release gesture",
}
(output_dir / "build.json").write_text(json.dumps(report, indent=2) + "\n")
print("MD97_FINAL_OK " + json.dumps(report, separators=(",", ":")))
