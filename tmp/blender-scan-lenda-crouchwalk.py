"""Lista frames de crouchwalk por simetria em espaço de mundo."""
import json, pathlib, sys
import bpy

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
source, output = map(lambda p: pathlib.Path(p).resolve(), args)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source), import_shading="NORMALS")
scene = bpy.context.scene
arm = next(o for o in scene.objects if o.type == "ARMATURE")
action = bpy.data.actions.get("crouchwalk")
arm.animation_data_create(); arm.animation_data.action = action
def p(name): return arm.matrix_world @ arm.pose.bones[name].head
rows=[]
for frame in range(round(action.frame_range[0]), round(action.frame_range[1])+1):
    scene.frame_set(frame); bpy.context.view_layer.update()
    lh,rh,lk,rk,lf,rf=[p(n) for n in ["LeftHand","RightHand","LeftLeg","RightLeg","LeftFoot","RightFoot"]]
    rows.append({"frame":frame,"hand":(lh-rh).length,"kneeDepth":abs(lk.y-rk.y),"footDepth":abs(lf.y-rf.y),"kneeZ":(lk.z+rk.z)/2,"footZ":(lf.z+rf.z)/2,"score":abs(lk.y-rk.y)+abs(lf.y-rf.y)})
rows.sort(key=lambda x:x["score"])
output.write_text(json.dumps(rows[:20], indent=2)+"\n")
print(json.dumps(rows[:20], indent=2))
