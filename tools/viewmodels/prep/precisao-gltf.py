"""Leitura independente das matrizes glTF para conferir a reimportação Blender."""
import json
from pathlib import Path
import struct
import subprocess
import numpy as np

RAIZ = Path(__file__).resolve().parents[3]

def ler(path):
    b=Path(path).read_bytes(); n=struct.unpack_from('<I',b,12)[0]
    j=json.loads(b[20:20+n]); return j,b[28+n:]

def accessor(j,b,i):
    a=j['accessors'][i]; v=j['bufferViews'][a['bufferView']]
    tipos={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1',5122:'<i2',5120:'i1'}
    tam={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
    dt=np.dtype(tipos[a['componentType']]); stride=v.get('byteStride',tam*dt.itemsize)
    x=np.ndarray((a['count'],tam),dtype=dt,buffer=b,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(stride,dt.itemsize)).copy()
    if a.get('normalized'): x=x.astype(float)/np.iinfo(dt).max
    return x

def trs(n):
    if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
    x,y,z,w=n.get('rotation',[0,0,0,1]); m=np.eye(4)
    m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]) @ np.diag(n.get('scale',[1,1,1]))
    m[:3,3]=n.get('translation',[0,0,0]);return m

def mundo(j,b,nome='idle',t=0):
    nodes=[dict(n) for n in j['nodes']]
    anim=next((a for a in j.get('animations',[]) if a['name']==nome),None)
    if anim:
        for c in anim['channels']:
            q=anim['samplers'][c['sampler']]; ts=accessor(j,b,q['input']).ravel(); val=accessor(j,b,q['output']); idx=int(np.searchsorted(ts,t,side='right')-1); idx=max(0,min(idx,len(ts)-1))
            if idx==len(ts)-1 or t<=ts[0] or q.get('interpolation')=='STEP': v=val[idx]
            else:
                f=(t-ts[idx])/(ts[idx+1]-ts[idx]); u=val[idx]; v=val[idx+1]
                if c['target']['path']=='rotation':
                    dot=np.dot(u,v)
                    if dot<0:v=-v;dot=-dot
                    if dot<.9995:
                        ang=np.arccos(np.clip(dot,-1,1));v=(np.sin((1-f)*ang)*u+np.sin(f*ang)*v)/np.sin(ang)
                    else:v=u*(1-f)+v*f
                    v=v/np.linalg.norm(v)
                else:v=u*(1-f)+v*f
            nodes[c['target']['node']][c['target']['path']]=v
    parents={c:i for i,n in enumerate(nodes) for c in n.get('children',[])}; cache={}
    def mat(i):
        if i not in cache:cache[i]=(mat(parents[i]) if i in parents else np.eye(4))@trs(nodes[i])
        return cache[i]
    return [mat(i) for i in range(len(nodes))]

def main():
    out=RAIZ/'artifacts/viewmodels/prep/precisao'
    assert RAIZ.name=='vm-prep-precisao' and out.resolve().is_relative_to(RAIZ)
    assert subprocess.check_output(['git','branch','--show-current'],cwd=RAIZ,text=True).strip()=='codex/vm-prep-precisao'
    inv=json.loads((out/'inventario.json').read_text()); report={}
    for w in ('mosin','svd','sks'):
        j,b=ler(inv['weapons'][w]['assets']['native']['path']); ms=mundo(j,b); d={}
        for i,n in enumerate(j['nodes']):
            if n.get('name') in ('ik_hand_gun','hand_l','hand_r') or n.get('name','').startswith(('RIG_WEAPON','SOCKET_WEAPON')): d[n['name']]=ms[i].tolist()
        report[w]=d
    (out/'gltf-matrizes.json').write_text(json.dumps(report,indent=2)+'\n')
    for w,d in report.items(): print(w,{k:np.array(v)[:3,3].round(5).tolist() for k,v in d.items()})

if __name__=='__main__':main()
