# Split da roda_gigante.glb (Mint) em parte ROTATIVA e ESTATICA por componente
# conexo, para a roda girar no grupo 'roda-gigante' do parque_treta sem levar
# as pernas junto. Uso: Blender -b -P tools/blender-split-roda-gigante.py -- \
#   <roda_gigante.glb> <saida_roda.glb> <saida_base.glb>
# Regras (medidas por dump de componentes — cubo em (0, 0.065), aro raio ~0,44):
# perna = atravessa o aro E chega aos pés (miny<-0,47) | fragmento abaixo do
#   fundo do aro dentro do círculo sem alcançar o aro | laje achatada larga
#   (deck/plataforma) | haste fina em z no fundo | laje-fini vertical (dz>0,35).
# rotativa = resto com cy>=-0,42 (gôndolas de baixo pendem além do aro),
#   dist<=0,62 e (miolo |z|<=0,14 ou faixa do aro dist>=0,36 com |z|<=0,30).
# Verificação visual (lei 4): renders /tmp/r2-parque/v10_*.png — roda completa
# (aro duplo+raios+14 gôndolas), base limpa (pernas A, plataforma, cabine),
# composite idêntico ao modelo original.
import bpy, bmesh, math, sys
argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT_RODA, OUT_BASE = argv[0], argv[1], argv[2]
HX, HY = 0.0, 0.108

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
obj = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
mw = obj.matrix_world
bpy.context.view_layer.objects.active = obj
bpy.ops.object.mode_set(mode='EDIT')
bm = bmesh.from_edit_mesh(obj.data)
bm.faces.ensure_lookup_table()
comp = {}
def componente(seed):
    stack=[seed]; grupo=[]; comp[seed.index]=True
    while stack:
        f=stack.pop(); grupo.append(f)
        for e in f.edges:
            for lf in e.link_faces:
                if lf.index not in comp: comp[lf.index]=True; stack.append(lf)
    return grupo

nrot = nest = faces_rot = 0
for f in bm.faces:
    if f.index in comp: continue
    g = componente(f)
    xs=[]; ys=[]; zs=[]; ds=[]
    for face in g:
        for v in face.verts:
            c = mw @ v.co
            gx, gy, gz = c.x, c.z, -c.y
            xs.append(gx); ys.append(gy); zs.append(gz); ds.append(math.hypot(gx-HX, gy-HY))
    cx=sum(xs)/len(xs); cy=sum(ys)/len(ys); cz=sum(zs)/len(zs)
    dist=math.hypot(cx-HX, cy-HY)
    miny=min(ys); dmin=min(ds); dmax=max(ds)
    dx=max(xs)-min(xs); dy=max(ys)-min(ys); dz=max(zs)-min(zs)
    perna = ((dmin < 0.30 and dmax > 0.47 and miny < -0.47)
             or (miny < -0.355 and dist < 0.38 and abs(cz) < 0.25 and dmax < 0.47)
             or (dy < 0.15 and (dx > 0.25 or dz > 0.25))
             or (dy < 0.05 and dz > 0.30 and cy < -0.30)
             or (dz > 0.35 and dx < 0.1))
    rot = (not perna and cy >= -0.42 and dist <= 0.62
           and (abs(cz) <= 0.14 or (dist >= 0.36 and abs(cz) <= 0.30)))
    for face in g: face.select_set(rot)
    if rot: nrot += 1; faces_rot += len(g)
    else: nest += 1
print(f'COMPONENTES rot={nrot} est={nest} faces_rot={faces_rot}')
bmesh.update_edit_mesh(obj.data)
bpy.ops.mesh.separate(type='SELECTED')
bpy.ops.object.mode_set(mode='OBJECT')
roda = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.select_get() and o != obj]
assert len(roda) == 1, f'separacao inesperada: {len(roda)}'
roda = roda[0]; base = obj
roda.name = 'roda_gigante_roda'; base.name = 'roda_gigante_base'
for o, path in [(roda, OUT_RODA), (base, OUT_BASE)]:
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True)
    print('EXPORTED', path, len(o.data.polygons))
