"""Measure project weapon meshes for first-person family registration.

Run with Blender in background mode.  The report is intentionally geometric:
it records transformed bounds and loose-shell envelopes so a viewmodel builder
can register the receiver, grip, magazine and stock instead of guessing from a
single rendered angle.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[3]
WEAPONS = ROOT / "public" / "models" / "weapons"


def import_glb(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def loose_shells(obj: bpy.types.Object) -> list[dict[str, object]]:
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    remaining = set(bm.verts)
    shells: list[dict[str, object]] = []
    while remaining:
        seed = remaining.pop()
        component = {seed}
        frontier = [seed]
        while frontier:
            vertex = frontier.pop()
            for edge in vertex.link_edges:
                other = edge.other_vert(vertex)
                if other in remaining:
                    remaining.remove(other)
                    component.add(other)
                    frontier.append(other)
        coords = [obj.matrix_world @ vertex.co for vertex in component]
        minimum = Vector((min(p.x for p in coords), min(p.y for p in coords), min(p.z for p in coords)))
        maximum = Vector((max(p.x for p in coords), max(p.y for p in coords), max(p.z for p in coords)))
        shells.append({
            "vertices": len(component),
            "min": [round(value, 6) for value in minimum],
            "max": [round(value, 6) for value in maximum],
            "center": [round(value, 6) for value in ((minimum + maximum) * 0.5)],
            "size": [round(value, 6) for value in (maximum - minimum)],
        })
    bm.free()
    return sorted(shells, key=lambda shell: int(shell["vertices"]), reverse=True)


def inspect(path: Path) -> dict[str, object]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    imported = import_glb(path)
    meshes = [obj for obj in imported if obj.type == "MESH"]
    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    minimum = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    maximum = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return {
        "id": path.stem,
        "meshes": len(meshes),
        "bounds": {
            "min": [round(value, 6) for value in minimum],
            "max": [round(value, 6) for value in maximum],
            "center": [round(value, 6) for value in ((minimum + maximum) * 0.5)],
            "size": [round(value, 6) for value in (maximum - minimum)],
        },
        "shells": sorted(
            [shell for obj in meshes for shell in loose_shells(obj)],
            key=lambda shell: int(shell["vertices"]),
            reverse=True,
        )[:40],
    }


def main() -> None:
    requested = {value for value in sys.argv[sys.argv.index("--") + 1:]} if "--" in sys.argv else set()
    paths = [path for path in sorted(WEAPONS.glob("*.glb")) if not requested or path.stem in requested]
    report = [inspect(path) for path in paths]
    print("CORO_WEAPON_FAMILY_REPORT=" + json.dumps(report, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
