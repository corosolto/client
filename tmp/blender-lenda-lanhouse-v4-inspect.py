"""Extrai fatos visuais/skin da Lenda; não decide aprovação."""
import json
import pathlib
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(args) != 2:
    raise SystemExit("uso: script -- source.glb receipt.json")
source = pathlib.Path(args[0]).resolve()
receipt = pathlib.Path(args[1]).resolve()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
scene = bpy.context.scene
arm = next(obj for obj in scene.objects if obj.type == "ARMATURE")
meshes = [obj for obj in scene.objects if obj.type == "MESH"]

prop_prefixes = (
    "CS_LAN_BEIGE_PLASTIC", "CS_LAN_MOUSE_TRACKBALL", "CS_LAN_TOKEN_",
    "CS_LAN_ETHERNET_BLUE",
)
tower_materials = {"CS_LAN_BEIGE_PLASTIC", "CS_LAN_DARK_PLASTIC", "CS_LAN_VENT_METAL"}
prop_weight = {}
socket_weight = {"lowProps": {}, "tower": {}}
for obj in meshes:
    group_names = {g.index: g.name for g in obj.vertex_groups}
    for poly in obj.data.polygons:
        if poly.material_index >= len(obj.material_slots):
            continue
        mat = obj.material_slots[poly.material_index].material
        if not mat or not mat.name.startswith(prop_prefixes):
            pass
        else:
            per = prop_weight.setdefault(mat.name, {})
            for vi in poly.vertices:
                for group in obj.data.vertices[vi].groups:
                    name = group_names.get(group.group)
                    if name:
                        per[name] = per.get(name, 0.0) + group.weight
        if not mat or not (mat.name.startswith(prop_prefixes) or mat.name in tower_materials):
            continue
        for vi in poly.vertices:
            # Os props baixos terminam abaixo de 0,90 m; a torre começa acima de 1,04 m.
            # O corte de 1 m separa as duas famílias mesmo quando compartilham material.
            region = "lowProps" if (obj.matrix_world @ obj.data.vertices[vi].co).z < 1.0 else "tower"
            per_region = socket_weight[region]
            for group in obj.data.vertices[vi].groups:
                name = group_names.get(group.group)
                if name:
                    per_region[name] = per_region.get(name, 0.0) + group.weight


def action(name):
    found = bpy.data.actions.get(name)
    if found is None:
        raise RuntimeError(f"acao ausente: {name}")
    arm.animation_data_create()
    arm.animation_data.action = found
    return found


def bone_point(name, attr="head"):
    bone = arm.pose.bones[name]
    return arm.matrix_world @ getattr(bone, attr)


def material_min_z(vertex_filter):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    result = None
    for obj in meshes:
        evaluated = obj.evaluated_get(depsgraph)
        eval_mesh = evaluated.to_mesh()
        try:
            matrix = evaluated.matrix_world
            for poly in eval_mesh.polygons:
                if poly.material_index >= len(obj.material_slots):
                    continue
                mat = obj.material_slots[poly.material_index].material
                if not mat:
                    continue
                for vi in poly.vertices:
                    source_vertex = obj.data.vertices[vi]
                    weights = {obj.vertex_groups[g.group].name: g.weight for g in source_vertex.groups}
                    if not vertex_filter(mat.name, weights):
                        continue
                    z = (matrix @ eval_mesh.vertices[vi].co).z
                    result = z if result is None else min(result, z)
        finally:
            evaluated.to_mesh_clear()
    return result


crouch = action("crouch")
scene.frame_set(round(crouch.frame_range[1]))
bpy.context.view_layer.update()
lh, rh = bone_point("LeftHand"), bone_point("RightHand")
lk, rk = bone_point("LeftLeg"), bone_point("RightLeg")
lf, rf = bone_point("LeftFoot"), bone_point("RightFoot")
crouch_metrics = {
    "frame": scene.frame_current,
    "handSeparationM": (lh - rh).length,
    "handXSeparationM": abs(lh.x - rh.x),
    "kneeDepthDeltaM": abs(lk.y - rk.y),
    "footDepthDeltaM": abs(lf.y - rf.y),
    "kneesOppositeSides": lk.x * rk.x < 0,
    "feetOppositeSides": lf.x * rf.x < 0,
    "minZ": material_min_z(lambda name, weights: True),
    "points": {n: list(bone_point(n)) for n in ["LeftHand", "RightHand", "LeftLeg", "RightLeg", "LeftFoot", "RightFoot"]},
}

shoot = action("shoot")
scene.frame_set(round(shoot.frame_range[1]))
bpy.context.view_layer.update()
sh_lh, sh_rh = bone_point("LeftHand"), bone_point("RightHand")
shoot_metrics = {
    "frame": scene.frame_current,
    "handSeparationM": (sh_lh - sh_rh).length,
    "handXSeparationM": abs(sh_lh.x - sh_rh.x),
    "points": {n: list(bone_point(n)) for n in ["LeftHand", "RightHand"]},
}

death = action("death")
scene.frame_set(round(death.frame_range[1]))
bpy.context.view_layer.update()
death_metrics = {
    "frame": scene.frame_current,
    "bodyMinZ": material_min_z(lambda name, weights: not (name in tower_materials and weights.get("Spine01") == 1.0)),
    "towerMinZ": material_min_z(lambda name, weights: name in tower_materials and weights.get("Spine01") == 1.0),
    "hips": list(bone_point("Hips")),
}

payload = {
    "source": str(source),
    "propWeights": prop_weight,
    "socketWeights": socket_weight,
    "crouch": crouch_metrics,
    "shoot": shoot_metrics,
    "death": death_metrics,
}
receipt.parent.mkdir(parents=True, exist_ok=True)
receipt.write_text(json.dumps(payload, indent=2) + "\n")
print(json.dumps(payload, indent=2))
