"""Inspeção offline de GLBs, sem exportar ou modificar insumos."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
sys.dont_write_bytecode = True
import importlib.util
import numpy as np
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view

RAIZ = Path(__file__).resolve().parents[3]
SAIDA = RAIZ / 'artifacts/viewmodels/prep/precisao'
p = argparse.ArgumentParser()
p.add_argument('--arma', choices=['mosin', 'svd', 'sks'], required=True)
p.add_argument('--tipo', choices=['own', 'native'], required=True)
p.add_argument('--render', action='store_true')
p.add_argument('--timing', choices=['baseline', 'c1'])
a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
assert RAIZ.name == 'vm-prep-precisao' and SAIDA.resolve().is_relative_to(RAIZ)
assert subprocess.check_output(['git', 'branch', '--show-current'], cwd=RAIZ, text=True).strip() == 'codex/vm-prep-precisao'
inventario = json.loads((SAIDA / 'inventario.json').read_text())
insumo = inventario['weapons'][a.arma]['assets'][a.tipo]
if a.timing:
    assert a.tipo == 'native'
    if a.timing == 'c1':
        timing = json.loads((SAIDA / 'timing-c1/timing-report.json').read_text())['weapons'][a.arma]
        insumo = {**insumo, 'path': timing['output'], 'sha256': timing['output_sha256']}
        assert Path(insumo['path']).resolve().is_relative_to((SAIDA / 'timing-c1').resolve())
    SAIDA = SAIDA / ('timing-c1/evidence' if a.timing == 'c1' else 'timing-baseline/evidence')
    SAIDA.mkdir(parents=True, exist_ok=True)
assert hashlib.sha256(Path(insumo['path']).read_bytes()).hexdigest() == insumo['sha256']
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=insumo['path'], bone_heuristic='TEMPERANCE', disable_bone_shape=True)
spec = importlib.util.spec_from_file_location('precisao_gltf', Path(__file__).with_name('precisao-gltf.py'))
gltf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gltf)
gj, gb = gltf.ler(insumo['path'])
s = bpy.context.scene
fps_importado = s.render.fps / s.render.fps_base
malhas = [o for o in s.objects if o.type == 'MESH' and (a.tipo == 'own' or o.name.startswith('GEO_'))]
rigs = [o for o in s.objects if o.type == 'ARMATURE']
arma = [o for o in malhas if not o.name.startswith('GEO_FP_')]
maos = [o for o in malhas if any(x in o.name for x in ('Glove', 'Hand'))]
cam = next((o for o in s.objects if o.type == 'CAMERA'), None)

def vec(v):
    return [round(float(x), 7) for x in v]

def caixa(vs):
    return {'min': vec([min(v[i] for v in vs) for i in range(3)]), 'max': vec([max(v[i] for v in vs) for i in range(3)])}

def avaliar(o):
    e = o.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me = e.to_mesh()
    vs = [e.matrix_world @ v.co for v in me.vertices]
    faces = [tuple(f.vertices) for f in me.polygons]
    e.to_mesh_clear()
    return vs, faces

def ativar(nome, t):
    for o in rigs:
        if o.animation_data:
            o.animation_data.action = None
            for tr in o.animation_data.nla_tracks:
                tr.mute = True
        for b in o.pose.bones:
            b.matrix_basis.identity()
        ac = bpy.data.actions.get(nome)
        if ac:
            slot = next((sl for sl in ac.slots if sl.identifier == 'OB' + o.name), None)
            if slot:
                o.animation_data_create()
                o.animation_data.action = ac
                o.animation_data.action_slot = slot
    fr = t * fps_importado
    s.frame_set(math.floor(fr), subframe=fr % 1)
    bpy.context.view_layer.update()

rel = {'input': insumo['path'], 'sha256': insumo['sha256'], 'blender': bpy.app.version_string, 'units': {'system': s.unit_settings.system, 'scale_length': s.unit_settings.scale_length}, 'import_bone_heuristic': 'TEMPERANCE', 'coordinate_system': 'Blender Z-up; unidades de cena, sem inferir metros fisicos', 'objects': [], 'samples': []}
for o in malhas + rigs + ([cam] if cam else []):
    d = {'name': o.name, 'type': o.type, 'parent': o.parent.name if o.parent else None, 'matrix_world': [vec(row) for row in o.matrix_world], 'scale': vec(o.scale)}
    if o.type == 'MESH':
        vs, fs = avaliar(o)
        d.update(vertices=len(vs), faces=len(fs), bounds=caixa(vs), uv=[{'name': uv.name, 'loops': len(uv.data), 'bounds': {'min': [min(x.uv[i] for x in uv.data) for i in (0,1)], 'max': [max(x.uv[i] for x in uv.data) for i in (0,1)]}} for uv in o.data.uv_layers], materials=[m.name if m else None for m in o.data.materials])
        if a.tipo == 'own':
            adj = [[] for _ in o.data.vertices]
            for edge in o.data.edges:
                x, y = edge.vertices
                adj[x].append(y); adj[y].append(x)
            vistos, componentes = set(), []
            for i in range(len(adj)):
                if i in vistos:
                    continue
                fila, grupo = [i], []
                vistos.add(i)
                while fila:
                    k = fila.pop(); grupo.append(k)
                    for j in adj[k]:
                        if j not in vistos:
                            vistos.add(j); fila.append(j)
                componentes.append({'vertices': len(grupo), 'bounds': caixa([vs[j] for j in grupo])})
            d['connected_components'] = sorted(componentes, key=lambda c: -c['vertices'])
    if o.type == 'ARMATURE':
        d['bones'] = [{'name': b.name, 'parent': b.parent.name if b.parent else None, 'head': vec(o.matrix_world @ b.head_local), 'tail': vec(o.matrix_world @ b.tail_local)} for b in o.data.bones]
    if o.type == 'CAMERA':
        d.update(lens=o.data.lens, angle_y=o.data.angle_y, clip_start=o.data.clip_start, clip_end=o.data.clip_end)
    rel['objects'].append(d)

def amostrar(nome, t):
    ativar(nome, t)
    vs, fs, deslocamento = [], [], 0
    for o in arma:
        v, f = avaliar(o)
        vs.extend(v); fs.extend(tuple(i+deslocamento for i in pol) for pol in f); deslocamento += len(v)
    bvh = BVHTree.FromPolygons(vs, fs)
    matrizes_glb = gltf.mundo(gj, gb, nome, t)
    glb_por_nome = {n.get('name'): matrizes_glb[i] for i,n in enumerate(gj['nodes'])}
    nlerp = gltf.mundo(gj, gb, nome, t, rotation_interpolation='nlerp') if a.timing else None
    nlerp_por_nome = {n.get('name'): nlerp[i] for i,n in enumerate(gj['nodes'])} if nlerp else {}
    d = {'clip': nome, 'time_s': t, 'frame_60': t*60, 'weapon_bounds': caixa(vs), 'bone_surface_distance': {}, 'mechanism_world': {}, 'hand_surface_distance': {}, 'gltf_joint_position_errors': {}, 'piece_distances': {}}
    if a.timing:
        d['nlerp_diagnostic_errors'] = {}
    for rig in rigs:
        for b in rig.pose.bones:
            if b.name in glb_por_nome:
                alvo = glb_por_nome[b.name][:3,3]
                erro = (rig.matrix_world @ b.head - Vector((alvo[0],-alvo[2],alvo[1]))).length
                d['gltf_joint_position_errors'][b.name] = erro
                if a.timing:
                    alvo_nlerp = nlerp_por_nome[b.name][:3,3]
                    d['nlerp_diagnostic_errors'][b.name] = (rig.matrix_world @ b.head - Vector((alvo_nlerp[0], -alvo_nlerp[2], alvo_nlerp[1]))).length
            if b.name in ('hand_l','hand_r','index_03_l','index_03_r','thumb_03_l','thumb_03_r'):
                pos = rig.matrix_world @ b.head
                hit = bvh.find_nearest(pos)
                d['bone_surface_distance'][b.name] = {'point': vec(pos), 'distance': hit[3] if hit else None}
            if rig.name.startswith('RIG_WEAPON'):
                d['mechanism_world'][b.name] = {'head': vec(rig.matrix_world @ b.head), 'matrix': [vec(row) for row in (rig.matrix_world @ b.matrix)]}
    for o in maos:
        v, _ = avaliar(o)
        for lado in ('l', 'r'):
            grupos = {g.index for g in o.vertex_groups if g.name.endswith('_'+lado) and any(k in g.name for k in ('hand','thumb','index','middle','ring','pinky'))}
            ids = [vert.index for vert in o.data.vertices if sum(g.weight for g in vert.groups if g.group in grupos) >= .5]
            dist = sorted(bvh.find_nearest(v[i])[3] for i in ids)
            if dist:
                d['hand_surface_distance'][o.name+'_'+lado] = {'n': len(dist), 'min': dist[0], 'median': dist[len(dist)//2], 'p95': dist[int(.95*(len(dist)-1))]}
    for o in arma:
        vv, ff = avaliar(o)
        for group in o.vertex_groups:
            if group.name == 'neutral_bone':
                continue
            ids = {v.index for v in o.data.vertices if any(g.group == group.index and g.weight >= .5 for g in v.groups)}
            pol = [f for f in ff if all(i in ids for i in f)]
            if not pol:
                continue
            piece = BVHTree.FromPolygons(vv, pol)
            d['piece_distances'][group.name] = {'faces': len(pol), 'bone_distances': {name: piece.find_nearest(Vector(pt['point']))[3] for name,pt in d['bone_surface_distance'].items()}}
    if cam:
        d['projection_native'] = {}
        for width,height in ((720,480),(720,405)):
            s.render.resolution_x=width; s.render.resolution_y=height
            projection=cam.calc_matrix_camera(bpy.context.evaluated_depsgraph_get(), x=width, y=height)
            transform=np.array(projection @ cam.matrix_world.inverted())
            vv=np.column_stack((np.array(vs), np.ones(len(vs))))
            clip=vv @ transform.T
            front=clip[:,3]>0
            xy=clip[:,:2]/clip[:,3,None]*.5+.5
            visible=front & (xy[:,0]>=0) & (xy[:,0]<=1) & (xy[:,1]>=0) & (xy[:,1]<=1)
            d['projection_native'][f'{width}x{height}']={'weapon_xy_bounds': [float(xy[front,0].min()),float(xy[front,1].min()),float(xy[front,0].max()),float(xy[front,1].max())] if front.any() else None,'vertices_in_frame':int(visible.sum()),'vertices':len(vs)}
    rel['samples'].append(d)

clips = insumo.get('animations', [])
for cl in clips:
    for frac in (0, .18, .35, .5, .62, .86, 1):
        amostrar(cl['name'],cl['duration']*frac)

if a.render:
    if clips:
        ativar('idle', 0)
    s.render.engine='BLENDER_WORKBENCH'
    s.render.resolution_percentage=100
    s.render.image_settings.file_format='PNG'
    s.display.shading.light='STUDIO'
    s.display.shading.color_type='OBJECT'
    s.display.shading.show_shadows=True
    s.display.shading.show_cavity=True
    s.display.shading.background_type='WORLD'
    s.world = s.world or bpy.data.worlds.new('MundoDiagnostico')
    s.world.color=(.07,.07,.07)
    for o in s.objects:
        if o.type=='MESH' and o not in malhas:
            o.hide_render=True
    for o in malhas:
        o.color=(.65,.7,.73,1) if o in arma else (.15,.55,.8,1) if o in maos else (.25,.29,.35,1)
    def renderizar(nome):
        s.render.filepath=str(SAIDA / f'{a.arma}-{a.tipo}-{nome}.png')
        bpy.ops.render.render(write_still=True)
    if cam:
        s.camera=cam
        for width,height in ((720,480),(720,405)):
            s.render.resolution_x=width; s.render.resolution_y=height
            renderizar(f'idle-{width}x{height}')
        for nome,frac in ([('reload_empty',.62),('shoot',.5)] if a.arma=='mosin' else [('reload_empty',.62)]):
            cl=next((c for c in clips if c['name']==nome),None)
            if cl:
                ativar(nome,cl['duration']*frac)
                renderizar(f'{nome}-{frac}')
        ativar('idle',0)
    vs=[v for o in malhas for v in avaliar(o)[0]]
    bb=caixa(vs); centro=(Vector(bb['min'])+Vector(bb['max']))*.5
    dim=max(Vector(bb['max'])-Vector(bb['min']))
    cd=bpy.data.cameras.new('CAM_DIAGNOSTICO'); co=bpy.data.objects.new('CAM_DIAGNOSTICO',cd); s.collection.objects.link(co)
    cd.type='ORTHO'; cd.ortho_scale=dim*1.2
    s.camera=co; s.render.resolution_x=900; s.render.resolution_y=600
    if a.tipo=='own':
        direcoes={'lateral':Vector((0,-1,.1)), 'superior':Vector((0,0,1))}
    else:
        direcoes={'externa':Vector((1,-.2,.4))}
    for nome, eixo in direcoes.items():
        co.location=centro+eixo.normalized()*dim*3
        co.rotation_euler=(centro-co.location).to_track_quat('-Z','Y').to_euler()
        renderizar(nome)
(SAIDA / f'{a.arma}-{a.tipo}-blender.json').write_text(json.dumps(rel,indent=2)+'\n')
print('PRECISAO_RESULTADO',a.arma,a.tipo,len(rel['samples']))
