#!/usr/bin/env python3
# Recalibracao de tom da RODADA 3 — mesma maquinaria do tone_calib.py, mas invertendo os
# PNGs de /root/shots/r2 com os parametros que os geraram (tabela LOOKS da r2).
# PORQUE: so dois mapas saem do lugar nesta rodada — praca_poderes (L* medio 36,4 contra alvo
# 42-48; a laje de asfalto voltou a ser buraco preto) e loja_h (2,30 % do frame em L* < 3,
# limite 1,0 %). pool_day (45,2) e ferrovelho (39,9) ficam INTOCADOS de proposito.
import sys, os, glob, json
import numpy as np
from PIL import Image
sys.path.insert(0, '/root/csb/tools/eval')
import tone_calib as TC

SHOTS = '/root/shots/r2'
R2 = {
    'praca_poderes':       dict(exposure=1.63, floor=0.0048, expAces=1.70),
    'piscina_treta':   dict(exposure=1.92, floor=0.0039, expAces=1.91),
    'loja_h':      dict(exposure=1.24, floor=0.0057, expAces=1.28),
    'ferro_velho': dict(exposure=1.66, floor=0.0041, expAces=1.76),
}
SAT = 1.12
# alvos desta rodada. awp sobe (estava 36,4); havan sobe pouco e sobretudo destrava o preto.
TARGET_MEAN = {'praca_poderes': 45.0, 'loja_h': 44.0}
TARGET_BLK = 0.90     # % do frame em L* < 3 (regua: < 1,0 %)

# reaproveita o inversor do tone_calib, mas com a tabela da r2
TC.R1 = R2
TC.R1_SAT = SAT


def main():
    maps = sys.argv[1:] or list(TARGET_MEAN)
    res = {}
    for m in maps:
        files = sorted(glob.glob(os.path.join(SHOTS, f'game-{m}-*.png')))
        pack, M = TC.pack_map(m, files)
        r = R2[m]
        rt = TC.predict(pack, r['exposure'], r['floor'], SAT)
        print(f'== {m}  ({len(files)} frames, {pack[0].shape[0]} px)')
        print(f'   MEDIDO r2 : mean {M.mean():5.2f} med {np.median(M):5.1f} p1 {np.percentile(M,1):5.2f} '
              f'p95 {np.percentile(M,95):5.1f} blk {100*(M<3).mean():5.2f}% wht {100*(M>97).mean():.3f}%', flush=True)
        print(f'   ROUNDTRIP : mean {rt["mean"]:5.2f} med {rt["median"]:5.1f} p1 {rt["p1"]:5.2f} '
              f'p95 {rt["p95"]:5.1f} blk {rt["blk"]:5.2f}% wht {rt["wht"]:.3f}%   (erro do inversor)', flush=True)
        small = TC.thin(pack, 90000)
        tgt = TARGET_MEAN[m]
        f, E = r['floor'], r['exposure']
        for it in range(4):
            lo, hi = 0.3, 4.0
            for _ in range(20):
                E = 0.5 * (lo + hi)
                if TC.predict(small, E, f, SAT)['mean'] < tgt: lo = E
                else: hi = E
            flo, fhi = 0.0002, 0.040
            for _ in range(20):
                f = 0.5 * (flo + fhi)
                if TC.predict(small, E, f, SAT)['blk'] > TARGET_BLK: flo = f
                else: fhi = f
        E = round(E, 2); f = round(f, 4)
        st = TC.predict(pack, E, f, SAT)
        lo, hi = 0.2, 4.0
        for _ in range(22):
            Ea = 0.5 * (lo + hi)
            if TC.predict_aces(small, Ea, f)['mean'] < st['mean']: lo = Ea
            else: hi = Ea
        Ea = round(Ea, 2)
        res[m] = dict(exposure=E, floor=f, expAces=Ea, **{k: round(v, 3) for k, v in st.items()})
        print(f'++ {m}: exp {r["exposure"]:.2f}->{E:.2f}  floor {r["floor"]:.4f}->{f:.4f}  '
              f'=> mean {st["mean"]:5.2f} med {st["median"]:5.1f} p1 {st["p1"]:5.2f} p95 {st["p95"]:5.1f} '
              f'p99 {st["p99"]:5.1f} blk {st["blk"]:5.2f}% wht {st["wht"]:.3f}% std {st["std"]:5.1f}\n', flush=True)
    print(json.dumps(res, indent=1))


if __name__ == '__main__':
    main()
