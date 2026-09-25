"""Reautora a M400 sobre o pacote KINEMATION, não sobre o golden da AK.

Por que existe: a M400 era assada sobre o pacote público da AK, e por isso
herdava o rig `*_metarig` e a malha de mãos `Requests_Studio_Hands` — ZERO ossos
em comum com os 55 que as outras dezenove armas compartilham. O gate
`eval:vm-rig` reprova isso como rig inteiramente diferente, e é a raiz de três
defeitos ao mesmo tempo: esqueleto divergente, par de mãos de outra linhagem e
escala fora do arsenal.

O padrão da indústria é um esqueleto de braços para o jogo inteiro, com toda
arma skinada apenas nos ossos que já existem nele. Aqui isso é literal: abre-se
`m4-final.blend`, que já traz rig, mãos e gramática de ações AR, e trocam-se as
malhas da arma.

A extração da arma é a mesma da receita anterior, verificada por contagem: solda
de vértices exatos e depois três ilhas topológicas — pente curvo completo, botão
de soltura à direita e bolt catch à esquerda. Nada de janela nova chutada.

Produtos ficam fora do Git.
"""
from __future__ import annotations

import bmesh
import hashlib
import json
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

M4_SHA = "e4b3fdfcbc6ba4f259fe349d12c58759efdd2669d84056a4c643f6d66359a0fe"
M400_SHA = "f5a0bb493381eba107dd23fb5e702c2719bdba2f4f8b01bec62c832467b91109"
# Comprimento visual declarado da M400 em `CFG` (public/js/weapons.js).
COMPRIMENTO_ALVO = 1.02


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
    out: list[list[int]] = []
    for start in range(len(mesh.vertices)):
        if start in seen:
            continue
        stack = [start]
        seen.add(start)
        group: list[int] = []
        while stack:
            index = stack.pop()
            group.append(index)
            for nxt in adjacency[index]:
                if nxt not in seen:
                    seen.add(nxt)
                    stack.append(nxt)
        out.append(group)
    return out


def subset_faces(source: bpy.types.Mesh, keep: set[int], name: str) -> bpy.types.Mesh:
    result = source.copy()
    result.name = name
    bm = bmesh.new()
    bm.from_mesh(result)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(result)
    bm.free()
    return result


def without_faces(source: bpy.types.Mesh, remove: set[int], name: str) -> bpy.types.Mesh:
    result = source.copy()
    result.name = name
    bm = bmesh.new()
    bm.from_mesh(result)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index in remove], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(result)
    bm.free()
    return result


m4_source = argument("m4-source")
m400_source = argument("m400-source")
output_dir = argument("output-dir")
if digest(m4_source) != M4_SHA or digest(m400_source) != M400_SHA:
    raise RuntimeError("fonte M4/M400 ausente ou divergente")
if not output_dir.is_absolute() or "worktrees/viewmodels-catalog-final" in str(output_dir):
    raise RuntimeError("saída deve ficar fora do Git")
output_dir.mkdir(parents=True, exist_ok=True)

# O pacote M4 traz rig, mãos e a gramática de ações AR já aprovadas pelas seis
# armas da família — é exatamente o que o contrato de rig congelou.
bpy.ops.wm.open_mainfile(filepath=str(m4_source), load_ui=False)
scene = bpy.context.scene
body = bpy.data.objects["MINT_WEAPON_M4"]
magazine = bpy.data.objects["MINT_WEAPON_M4_MAG"]
package = bpy.data.objects["VM_PACKAGE_M4"]

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(m400_source))
imported = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
if len(imported) != 1:
    raise RuntimeError(f"M400 deveria ter uma malha; encontrou {len(imported)}")

# Sem a solda a malha tem 1380 ilhas e nenhuma seleção topológica é possível.
welded = imported[0].data.copy()
bm = bmesh.new()
bm.from_mesh(welded)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-5)
bm.to_mesh(welded)
bm.free()

mag_vertices: set[int] = set()
release_vertices: set[int] = set()
bolt_catch_vertices: set[int] = set()
for group in components(welded):
    points = [welded.vertices[index].co for index in group]
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    # Pente curvo completo: ilha topológica sob o poço, incluindo lábio e base.
    if (len(group) == 144 and -0.111 < minimum.x < -0.109 and maximum.x < -0.004
            and minimum.z < -0.182 and maximum.z < 0.039):
        mag_vertices.update(group)
    # Botão circular real no lado direito, imediatamente acima do poço.
    if (len(group) == 20 and -0.121 < minimum.x < -0.119 and maximum.x < -0.106
            and minimum.y > 0.037 and maximum.z < 0.058):
        release_vertices.update(group)
    # Bolt catch real no lado esquerdo do receiver.
    if (len(group) == 12 and -0.117 < minimum.x < -0.115 and maximum.x < -0.104
            and minimum.y < -0.016 and maximum.y < -0.008 and maximum.z < 0.019):
        bolt_catch_vertices.update(group)
if (len(mag_vertices), len(release_vertices), len(bolt_catch_vertices)) != (144, 20, 12):
    raise RuntimeError(
        f"seleção M400 divergente: mag={len(mag_vertices)} "
        f"release={len(release_vertices)} boltCatch={len(bolt_catch_vertices)}")

mag_faces = {p.index for p in welded.polygons if any(v in mag_vertices for v in p.vertices)}
release_faces = {p.index for p in welded.polygons if any(v in release_vertices for v in p.vertices)}
bolt_catch_faces = {p.index for p in welded.polygons if any(v in bolt_catch_vertices for v in p.vertices)}
partes = (mag_faces, release_faces, bolt_catch_faces)
if ([len(parte) for parte in partes] != [275, 36, 20]
        or any(partes[i] & partes[j] for i in range(len(partes)) for j in range(i + 1, len(partes)))):
    raise RuntimeError(
        f"corte M400 divergente: mag={len(mag_faces)} "
        f"release={len(release_faces)} boltCatch={len(bolt_catch_faces)}")

body_mesh = without_faces(welded, mag_faces | release_faces | bolt_catch_faces, "MINT_WEAPON_M400_BODY")
mag_mesh = subset_faces(welded, mag_faces, "MINT_WEAPON_M400_MAG_MESH")

# Escala: o pacote AR aplica uma constante própria nos tracks, então a malha
# entra corrigida por ela — mesma conta da SCAR, com o comprimento da M400.
corners = [Vector(v[:]) for v in imported[0].bound_box]
comprimento_cru = max(
    max(c[axis] for c in corners) - min(c[axis] for c in corners) for axis in range(3))
escala = (COMPRIMENTO_ALVO / comprimento_cru) / 0.8416434526443481
for mesh in (body_mesh, mag_mesh):
    mesh.transform(Matrix.Scale(escala, 4))

materiais = list(welded.materials)
body.data = body_mesh
body.name = "MINT_WEAPON_M400"
magazine.data = mag_mesh
magazine.name = "MINT_WEAPON_M400_MAG"
for mesh in (body_mesh, mag_mesh):
    mesh.materials.clear()
    for material in materiais:
        mesh.materials.append(material)
bpy.data.objects.remove(imported[0], do_unlink=True)

# Sockets derivados da caixa do corpo completo: -X é a boca, +X a culatra. É a
# mesma convenção que o reparo de socket mediu como correta no arsenal.
corners = [Vector(v[:]) for v in body.bound_box]
mn = Vector(tuple(min(c[axis] for c in corners) for axis in range(3)))
mx = Vector(tuple(max(c[axis] for c in corners) for axis in range(3)))
muzzle = next((c for c in body.children if c.name == "SOCKET_MINT_MUZZLE"), None)
sight = next((c for c in body.children if c.name == "SOCKET_MINT_SIGHT"), None)
if not muzzle or not sight:
    raise RuntimeError("sockets herdados do pacote M4 ausentes")
muzzle.location = (mn.x, (mn.y + mx.y) / 2, (mn.z + mx.z) * 0.52)
sight.location = (mx.x - (mx.x - mn.x) * 0.26, (mn.y + mx.y) / 2, mx.z - 0.045 / body.scale.x)

package.name = "VM_PACKAGE_M400"
scene.camera.name = "VIEWMODEL_CAMERA"
scene.frame_set(72)
package.matrix_world = Matrix.Identity(4)
bpy.context.view_layer.update()

blend = output_dir / "m400-final.blend"
glb = output_dir / "m400-baked-runtime.glb"
bpy.ops.wm.save_as_mainfile(filepath=str(blend), check_existing=False)
bpy.ops.export_scene.gltf(
    filepath=str(glb), export_format="GLB", export_cameras=True, export_lights=False,
    export_animations=True, export_animation_mode="NLA_TRACKS", export_merge_animation="NLA_TRACK",
    export_skins=True, export_materials="EXPORT", export_image_format="WEBP", export_image_quality=82,
    export_yup=True, export_force_sampling=True, export_optimize_animation_size=True,
    export_optimize_animation_keep_anim_armature=True, export_optimize_animation_keep_anim_object=True,
    export_frame_range=False)

report = {
    "schemaVersion": 1, "weapon": "m400", "ready": False,
    "sources": {"arHandsActions": M4_SHA, "body": M400_SHA},
    "selection": {"weldedVertices": len(welded.vertices), "magFaces": len(mag_faces),
                  "releaseFaces": len(release_faces), "boltCatchFaces": len(bolt_catch_faces)},
    "escala": round(escala, 6),
    "products": {"blend": {"bytes": blend.stat().st_size, "sha256": digest(blend)},
                 "glb": {"bytes": glb.stat().st_size, "sha256": digest(glb)}},
    "mechanism": "complete curved detachable magazine on the KINEMATION arm rig",
}
(output_dir / "build.json").write_text(json.dumps(report, indent=2) + "\n")
print("M400_KINEMATION_OK " + json.dumps(report, separators=(",", ":")))
