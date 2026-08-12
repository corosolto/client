"""Renderiza crouch/death v4 de frente e lado com piso z=0 verificável."""
import json
import pathlib
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if len(args) != 3:
    raise SystemExit("uso: script -- posed.glb out-dir receipt.json")
source, out, receipt = pathlib.Path(args[0]).resolve(), pathlib.Path(args[1]).resolve(), pathlib.Path(args[2]).resolve()
out.mkdir(parents=True, exist_ok=True)

def point_at(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
scene = bpy.context.scene
arm = next(obj for obj in scene.objects if obj.type == "ARMATURE")
meshes = [obj for obj in scene.objects if obj.type == "MESH" and len(obj.material_slots)]
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 720
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.view_settings.look = "AgX - Medium High Contrast"
scene.world = bpy.data.worlds.new("LendaV4World")
scene.world.color = (0.018, 0.022, 0.035)

bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0))
floor = bpy.context.object
floor.name = "FLOOR_Z0"
floor_mat = bpy.data.materials.new("FLOOR_Z0_MAT")
floor_mat.diffuse_color = (0.13, 0.15, 0.19, 1)
floor.data.materials.append(floor_mat)

bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = "ORTHO"
scene.camera = camera
for loc, energy, size in [((-2.5, -3.0, 4.2), 1300, 4.0), ((2.8, -1.0, 2.3), 900, 3.0), ((0, 3, 3), 700, 2.5)]:
    bpy.ops.object.light_add(type="AREA", location=loc)
    light = bpy.context.object
    light.data.energy = energy
    light.data.size = size
    point_at(light, Vector((0, 0, 0.8)))

def bounds():
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points=[]
    for obj in meshes:
        evaluated=obj.evaluated_get(depsgraph); mesh=evaluated.to_mesh()
        try: points.extend(evaluated.matrix_world @ vertex.co for vertex in mesh.vertices)
        finally: evaluated.to_mesh_clear()
    low=Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    return low, high

rows=[]
arm.animation_data_create()
for action_name in ["crouch", "death"]:
    action=bpy.data.actions.get(action_name)
    if action is None: raise RuntimeError(f"acao ausente: {action_name}")
    arm.animation_data.action=action
    scene.frame_set(round(action.frame_range[1])); bpy.context.view_layer.update()
    low,high=bounds(); center=(low+high)*0.5
    target=Vector((center.x, center.y, max(0.42, center.z)))
    scale=max(high.x-low.x, high.y-low.y, high.z-low.z, 1.0)*1.28
    for view, direction in [("front", Vector((0,-1,0.24))), ("side", Vector((1,0,0.24)))]:
        camera.data.ortho_scale=scale
        camera.location=target+direction.normalized()*4
        point_at(camera,target)
        path=out/f"lenda-lanhouse-v4-{action_name}-{view}.png"
        scene.render.filepath=str(path)
        bpy.ops.render.render(write_still=True)
        rows.append({"action":action_name,"frame":scene.frame_current,"view":view,"path":str(path),"boundsMin":list(low),"boundsMax":list(high),"floorZ":0})
receipt.write_text(json.dumps({"source":str(source),"renders":rows},indent=2)+"\n")
print(f"LENDA_V4_FLOOR_EVIDENCE={out}")
