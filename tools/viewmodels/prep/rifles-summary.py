"""Tabelas e folhas derivadas dos diagnósticos da frente."""
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('inventory', Path(__file__).with_name('rifles-inventory.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
inv.guard()
inventory = json.loads((inv.OUT/'inventory.json').read_text())
blender = json.loads((inv.OUT/'blender.json').read_text())['assets']
gltf = json.loads((inv.OUT/'gltf-state.json').read_text())['assets']
summary = {}
for w in inv.WEAPONS:
    d = inventory['goldsrc-vm/'+w]
    part = next(m for m in d['meshes'] if m['name'].startswith('MINT_MAG'))
    part_name = 'MINT_WEAPON_MAG_'+w.upper()
    gs = gltf['goldsrc-vm/'+w]
    body = max((n for n in gs['idle'][0]['bounds'] if n != part_name),
               key=lambda n:max(gs['idle'][0]['bounds'][n]['size']))
    length = max(gs['idle'][0]['bounds'][body]['size'])
    def relative(sample):
        return np.array(sample['bounds'][part_name]['center'])-np.array(sample['bounds'][body]['center'])
    idle = relative(gs['idle'][0])
    reload = gs['reload_tactical']
    dist = [s['bone_origin_to_mag_vertex']['hand_l->'+part_name] for s in gltf['retarget-vm/'+w]['reload_tactical']]
    summary[w] = {'canonical_bounds':blender['mint/'+w]['canonical_bounds'],
                  'raw_vertices':inventory['mint/'+w]['meshes'][0]['primitives'][0]['vertices'],
                  'split_vertices':part['primitives'][0]['vertices'], 'split_local_bounds':part['primitives'][0]['bounds'],
                  'split_relative_center_travel_fraction_of_body_span':max(float(np.linalg.norm(relative(s)-idle)/length) for s in reload),
                  'split_reload_end_vs_idle_fraction_of_body_span':float(np.linalg.norm(relative(reload[-1])-idle)/length),
                  'retarget_hand_l_origin_to_split_vertex_range':[min(dist),max(dist)],
                  'hashes':{route:inventory[route+'/'+w]['sha256'] for route in ['mint','goldsrc-vm','retarget-vm']}}
for columns, name in [(['raw-','goldsrc-vm-'],'comparison'), (['goldsrc-vm-','goldsrc-vm-'],'details')]:
    sheet=Image.new('RGB',(1440,390*len(inv.WEAPONS)),(30,30,30))
    draw=ImageDraw.Draw(sheet)
    for row,w in enumerate(inv.WEAPONS):
        for col,prefix in enumerate(columns):
            suffix = '' if name=='comparison' else ('-part' if col==0 else '-reload-half')
            path=inv.OUT/f'{prefix}{w}{suffix}.png'
            if not path.exists():
                raise FileNotFoundError(path)
            im=Image.open(path)
            assert im.size==(720,360)
            sheet.paste(im,(col*720,row*390+30))
            label = (['Mint normalizada','GoldSrc: split em vermelho'] if name=='comparison'
                     else ['Fragmento chamado magazine','Recarga a 50%: corpo cinza / fragmento vermelho'])[col]
            draw.text((col*720+12,row*390+7),w+' / '+label,fill='white')
    sheet.save(inv.OUT/f'{name}.png')
(inv.OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
for w,d in summary.items():
    print(w,'size',[round(v,4) for v in d['canonical_bounds']['size']], 'split',d['split_vertices'],
          'travel/L',round(d['split_relative_center_travel_fraction_of_body_span'],4),
          'end/L',round(d['split_reload_end_vs_idle_fraction_of_body_span'],4),
          'wrist->vertex',[round(v,4) for v in d['retarget_hand_l_origin_to_split_vertex_range']])
