#!/usr/bin/env python3
"""Compara dois labels do gauntlet (baseline vs round2) por personagem×arma."""
import json, sys

base = json.load(open('artifacts/gauntlet/baseline/manifest.json'))['resultados']
nova = json.load(open('artifacts/gauntlet/round2/manifest.json'))['resultados']
idx = {(r['id'], r['wid']): r['num'] for r in base if not r.get('erro')}
print(f"{'char×arma':28s} {'frenteZ':>16s} {'dMaoR':>12s} {'dMaoL':>12s}")
for r in nova:
    if r.get('erro'):
        continue
    k = (r['id'], r['wid'])
    if k not in idx:
        continue
    a, b = idx[k], r['num']
    fz = f"{a['frenteZ']:.3f} -> {b['frenteZ']:.3f}"
    dr = f"{a['dMaoR']} -> {b['dMaoR']}"
    dl = f"{a['dMaoL']} -> {b['dMaoL']}"
    print(f"{r['id']+'×'+r['wid']:28s} {fz:>16s} {dr:>12s} {dl:>12s}")
