"""Lê FPS e faixas dos FBX de arma; não executa conversão nem exportação."""
import hashlib
import json
from pathlib import Path
import subprocess
import bpy

RAIZ=Path(__file__).resolve().parents[3]
OUT=RAIZ/'artifacts/viewmodels/prep/precisao'
assert RAIZ.name=='vm-prep-precisao' and OUT.resolve().is_relative_to(RAIZ)
assert subprocess.check_output(['git','branch','--show-current'],cwd=RAIZ,text=True).strip()=='codex/vm-prep-precisao'
inv=json.loads((OUT/'inventario.json').read_text())
nomes={'mosin':'A_W_Kar98K_Firing.FBX','svd':'A_W_SVD_Reload_Empty.FBX','sks':'A_W_MK14_Reload_Empty.FBX'}
r={}
for w,nome in nomes.items():
    src=next(s for s in inv['weapons'][w]['fbx'] if s['path'].endswith('/'+nome))
    assert hashlib.sha256(Path(src['path']).read_bytes()).hexdigest()==src['sha256']
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=src['path'],use_image_search=False)
    s=bpy.context.scene
    r[w]={'source':src,'fps':s.render.fps,'fps_base':s.render.fps_base,'actions':[{'name':a.name,'frames':list(a.frame_range)} for a in bpy.data.actions]}
(OUT/'fbx-fps.json').write_text(json.dumps(r,indent=2)+'\n')
print('PRECISAO_FBX',json.dumps({w:{k:v for k,v in d.items() if k!='source'} for w,d in r.items()}))
