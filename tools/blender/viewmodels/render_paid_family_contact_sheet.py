"""Render every clip of a paid viewmodel from its embedded FPS camera."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--samples", type=int, default=7)
    return parser.parse_args(values)


def aim_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_area(name, location, target, energy, size, color) -> None:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    aim_at(obj, Vector(target))


def activate_action(action: bpy.types.Action) -> None:
    slots = {slot.identifier: slot for slot in action.slots}
    for obj in bpy.context.scene.objects:
        animation = obj.animation_data
        if not animation:
            continue
        slot = slots.get(f"OB{obj.name}")
        if slot is None:
            animation.action = None
            continue
        animation.action = action
        animation.action_slot = slot


def sample_frames(action: bpy.types.Action, count: int) -> list[int]:
    start = int(math.floor(action.frame_range[0]))
    end = int(math.ceil(action.frame_range[1]))
    if end <= start:
        return [start]
    return sorted({round(start + (end - start) * index / max(1, count - 1)) for index in range(count)})


def main() -> None:
    args = parse_args()
    source = args.input.expanduser().resolve()
    output = args.output.expanduser().resolve()
    output.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    scene = bpy.context.scene
    camera = next((obj for obj in scene.objects if obj.type == "CAMERA" and "VIEWMODEL" in obj.name), None)
    if camera is None:
        raise RuntimeError(f"{source} has no embedded VIEWMODEL camera")
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 540
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.15

    world = bpy.data.worlds.new("Viewmodel_QA_World")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.006, 0.009, 0.014, 1.0)
    background.inputs["Strength"].default_value = 0.18
    scene.world = world
    target = (0.0, -0.12, 1.30)
    add_area("QA_Key", (0.75, 0.45, 1.85), target, 165, 0.75, (1.0, 0.88, 0.72))
    add_area("QA_Fill", (-0.75, 0.15, 1.55), target, 72, 1.10, (0.68, 0.82, 1.0))
    add_area("QA_Rim", (0.10, -0.95, 1.80), target, 110, 0.55, (0.55, 0.72, 1.0))

    records = []
    for action in sorted(bpy.data.actions, key=lambda value: value.name):
        activate_action(action)
        frames = sample_frames(action, args.samples)
        clip_dir = output / action.name
        clip_dir.mkdir(parents=True, exist_ok=True)
        for frame in frames:
            scene.frame_set(frame)
            scene.render.filepath = str(clip_dir / f"frame_{frame:04d}.png")
            bpy.ops.render.render(write_still=True)
        records.append({"clip": action.name, "frames": frames, "directory": str(clip_dir)})

    report = {"schemaVersion": 1, "source": str(source), "clips": records}
    (output / "render-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("CORO_PAID_VIEWMODEL_RENDER=" + json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
