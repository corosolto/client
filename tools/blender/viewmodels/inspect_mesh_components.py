"""Report connected mesh component bounds for a GLB asset.

Run through Blender so the report uses Blender's exact glTF importer and mesh
topology.  Components can be filtered with the optional environment variables
COMPONENT_X_MIN/MAX and COMPONENT_Z_MIN/MAX.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import bpy
import bmesh


def env_float(name: str, default: float) -> float:
    value = os.environ.get(name)
    return float(value) if value is not None else default


def main() -> None:
    if "--" not in sys.argv:
        raise SystemExit("usage: blender --background --python inspect_mesh_components.py -- ASSET.glb")
    asset = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(asset))

    x_min = env_float("COMPONENT_X_MIN", float("-inf"))
    x_max = env_float("COMPONENT_X_MAX", float("inf"))
    z_min = env_float("COMPONENT_Z_MIN", float("-inf"))
    z_max = env_float("COMPONENT_Z_MAX", float("inf"))
    report = []

    for obj in [candidate for candidate in bpy.context.scene.objects if candidate.type == "MESH"]:
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        remaining = set(bm.verts)
        while remaining:
            seed = remaining.pop()
            component = {seed}
            frontier = [seed]
            while frontier:
                vertex = frontier.pop()
                for edge in vertex.link_edges:
                    linked = edge.other_vert(vertex)
                    if linked in remaining:
                        remaining.remove(linked)
                        component.add(linked)
                        frontier.append(linked)
            xs = [vertex.co.x for vertex in component]
            ys = [vertex.co.y for vertex in component]
            zs = [vertex.co.z for vertex in component]
            bounds = {
                "x": [min(xs), max(xs)],
                "y": [min(ys), max(ys)],
                "z": [min(zs), max(zs)],
            }
            if bounds["x"][1] < x_min or bounds["x"][0] > x_max:
                continue
            if bounds["z"][1] < z_min or bounds["z"][0] > z_max:
                continue
            report.append(
                {
                    "object": obj.name,
                    "vertices": len(component),
                    "bounds": bounds,
                    "centroid": [
                        sum(xs) / len(xs),
                        sum(ys) / len(ys),
                        sum(zs) / len(zs),
                    ],
                }
            )
        bm.free()

    report.sort(key=lambda item: item["vertices"], reverse=True)
    print("COMPONENT_REPORT=" + json.dumps(report, separators=(",", ":")))


if __name__ == "__main__":
    main()
