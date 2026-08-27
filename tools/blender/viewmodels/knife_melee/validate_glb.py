"""Re-import the shipped GLB and render export-truth checkpoints."""
from __future__ import annotations

import json
import math
import os
import struct
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[4]
GLB = Path(os.environ.get(
    "CORO_VM_GLB", ROOT / "public/models/viewmodels/coro/melee/knife-hires.glb"
)).resolve()
OUT = ROOT / "artifacts/viewmodels/knife-melee-pilot/validation"
EVIDENCE = ROOT / "tools/eval/asset-evidence/knife-melee/export-gate.json"


def glb_json(path: Path) -> dict:
    with path.open("rb") as stream:
        stream.seek(12)
        length, chunk_type = struct.unpack("<II", stream.read(8))
        if chunk_type != 0x4E4F534A:
            raise RuntimeError("First GLB chunk is not JSON")
        return json.loads(stream.read(length).decode("utf-8"))


def setup_render() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.look = "AgX - Medium High Contrast"
    world = bpy.data.worlds.new("ExportTruthWorld")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.018, 0.028, 0.045, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.72
    scene.world = world
    for name, location, energy, size, color in (
        ("ExportKey", (-0.65, 0.65, -0.20), 190.0, 0.65, (1.0, 0.78, 0.58)),
        ("ExportFill", (0.75, 0.20, -0.35), 125.0, 0.85, (0.32, 0.62, 1.0)),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.size, data.color = energy, size, color
        light = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(light)
        light.location = location
        light.rotation_euler = (Vector((0.0, -0.18, -1.08)) - light.location).to_track_quat("-Z", "Y").to_euler()


def main() -> None:
    document = glb_json(GLB)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(GLB))
    rig = next(obj for obj in bpy.data.objects if obj.type == "ARMATURE")
    camera = next(obj for obj in bpy.data.objects if obj.type == "CAMERA")
    meshes = [obj.name for obj in bpy.data.objects if obj.type == "MESH" and obj.parent == rig]
    actions = {action.name: list(action.frame_range) for action in bpy.data.actions}
    camera_json = document["cameras"][0]["perspective"]
    checks = {
        "animations_exact": set(actions) == {"Idle", "Draw", "Slash", "Stab"},
        "three_visible_mesh_nodes": len(meshes) == 3,
        "single_exported_camera": len(document.get("cameras", [])) == 1,
        "camera_aspect_3_2": math.isclose(camera_json.get("aspectRatio", 0), 1.5, abs_tol=1e-6),
        "camera_near_safe": camera_json.get("znear", 0) >= 0.029,
        "project_materials_only": not any("armmesh" in material.name.lower() for material in bpy.data.materials),
        "project_textures_packed": len(bpy.data.images) == 3,
        "web_size_under_5mb": GLB.stat().st_size < 5_000_000,
    }
    setup_render()
    bpy.context.scene.camera = camera
    rig.animation_data_create()
    checkpoints = (("Idle", 0.0), ("Slash", 7.2), ("Stab", 8.0))
    for action_name, frame in checkpoints:
        rig.animation_data.action = bpy.data.actions[action_name]
        bpy.context.scene.frame_set(int(frame), subframe=frame % 1)
        bpy.context.view_layer.update()
        bpy.context.scene.render.filepath = str(OUT / f"export_{action_name.lower()}.png")
        bpy.ops.render.render(write_still=True)
    report = {"pass": all(checks.values()), "checks": checks, "actions": actions,
              "meshes": meshes, "camera": camera_json, "size_bytes": GLB.stat().st_size}
    report_text = json.dumps(report, indent=2) + "\n"
    (OUT / "export_validation.json").write_text(report_text, encoding="utf-8")
    EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
    EVIDENCE.write_text(report_text, encoding="utf-8")
    print("KNIFE_GLB_VALIDATION=" + json.dumps(report, sort_keys=True))
    if not report["pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
