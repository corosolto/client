"""Print structural facts for supplied FPS GLB candidates.

Read-only inspection: each file is imported into a fresh Blender scene and
reported by mesh/armature/action counts so we can select an animation donor
from evidence instead of filenames or thumbnails.
"""
from pathlib import Path

import bpy


CANDIDATES = [
    "ak-12animated.glb",
    "fps_animated_carbine.glb",
    "m4a1_animated_low_poly.glb",
    "hk_416_a7_fps_animation.glb",
    "scar-h_first-person_fps_animated.glb",
    "fps_animated_smg.glb",
    "fps_pistol_animated.glb",
    "knife_animated.glb",
    "shotgun_animated.glb",
    "sniper_animated.glb",
]


def inspect(path: Path) -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    try:
        bpy.ops.import_scene.gltf(filepath=str(path))
    except Exception as exc:
        print(f"CANDIDATE {path.name} IMPORT_ERROR {exc}")
        return
    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    rigs = [obj for obj in bpy.data.objects if obj.type == "ARMATURE"]
    verts = sum(len(obj.data.vertices) for obj in meshes)
    print(
        f"CANDIDATE {path.name} meshes={len(meshes)} verts={verts} "
        f"rigs={len(rigs)} actions={len(bpy.data.actions)}"
    )
    for obj in meshes:
        materials = [slot.material.name if slot.material else "-" for slot in obj.material_slots]
        print(
            f"  MESH {obj.name!r} verts={len(obj.data.vertices)} "
            f"polys={len(obj.data.polygons)} materials={materials}"
        )
    for rig in rigs:
        bone_names = [bone.name for bone in rig.data.bones]
        handish = [name for name in bone_names if any(k in name.lower() for k in ("hand", "wrist", "finger", "thumb"))]
        print(f"  RIG {rig.name!r} bones={len(bone_names)} handish={handish[:16]}")
    for action in bpy.data.actions:
        print(f"  ACTION {action.name!r} frames={tuple(round(v, 1) for v in action.frame_range)}")


downloads = Path.home() / "Downloads"
for candidate in CANDIDATES:
    path = downloads / candidate
    if path.exists():
        inspect(path)
    else:
        print(f"CANDIDATE {candidate} MISSING")
